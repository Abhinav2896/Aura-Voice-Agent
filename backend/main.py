import sys
from pathlib import Path

# Ensure root directory containing 'backend' package is in sys.path regardless of execution cwd
_project_root = str(Path(__file__).resolve().parent.parent)
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

import asyncio
import json
import logging
import re
import time
import traceback
import websockets
from contextlib import asynccontextmanager
from datetime import date, datetime, timezone
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Query, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import settings
from backend.services.rate_limiter import (
    RateLimiter,
    get_client_ip,
    try_acquire_ws_slot,
    release_ws_slot,
    MAX_WS_PER_IP,
)
from backend.db.supabase import get_supabase
from backend.tools import execute_tool, TOOL_REGISTRY
from backend.services.auth import get_current_user, get_optional_user
from backend.services.admin_auth import require_admin
from backend.schemas.patient import (
    PatientProfile,
    PatientProfileUpdate,
    GuestLookupRequest,
    GuestLookupResponse
)
from backend.services.live_token import (
    create_ephemeral_token,
    validate_token,
    get_patient_context,
    AURA_SYSTEM_INSTRUCTION,
    AURA_TOOL_DECLARATIONS
)
from backend.services.summary import process_post_call_summary
from backend.services.rag import search_practice_knowledge
from backend.schemas.calls import CallCreate, CallMessageSchema
from backend.schemas.appointments import AppointmentRequestCreate, AppointmentUpdateRequest
from backend.schemas.prescriptions import PrescriptionRequestCreate
from backend.schemas.admin_requests import AdminRequestCreate
from backend.schemas.escalation import EscalationCreate
from backend.schemas.knowledge import KnowledgeQueryRequest

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aura.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Aura FastAPI backend starting up...")
    # Verify Supabase connectivity
    try:
        supabase = get_supabase()
        res = supabase.table("practice_information").select("name").limit(1).execute()
        practice_name = res.data[0]["name"] if res.data else "Unknown"
        logger.info(f"Supabase connected successfully! Practice: {practice_name}")
    except Exception as e:
        logger.error(f"Failed to connect to Supabase at startup: {e}")

    # Guard: the backend-mediated design requires the service_role key so that
    # server-side writes (calls, patients, requests) bypass RLS. If the anon key
    # is misconfigured here, every write silently fails with a 42501 RLS error
    # while public reads still succeed — so verify the role claim explicitly.
    try:
        import base64, json
        payload = settings.SUPABASE_SERVICE_ROLE_KEY.split(".")[1]
        payload += "=" * (-len(payload) % 4)
        key_role = json.loads(base64.urlsafe_b64decode(payload)).get("role")
        if key_role != "service_role":
            logger.error(
                "SUPABASE_SERVICE_ROLE_KEY has role=%r (expected 'service_role'). "
                "All server-side writes will fail RLS (42501). Set the real "
                "service_role secret from Supabase Dashboard > Settings > API in backend/.env.",
                key_role,
            )
        else:
            logger.info("Supabase service_role key verified.")
    except Exception as e:
        logger.warning(f"Could not verify Supabase key role claim: {e}")
    yield
    logger.info("Aura FastAPI backend shutting down...")

app = FastAPI(
    title="Aura AI Voice Receptionist API",
    version="1.0.0",
    description="Backend API powering Aura voice receptionist, clinical function calling, Supabase persistence, and Admin Dashboard",
    lifespan=lifespan
)

# Enable CORS for Next.js frontend.
# If "*" is in CORS_ORIGINS, use allow_origin_regex=".*" to allow any origin
# while preserving allow_credentials=True (browsers reject Access-Control-Allow-Origin: * with credentials).
cors_kwargs: Dict[str, Any] = {
    "allow_credentials": True,
    "allow_headers": ["*"],
    "allow_methods": ["*"],
}
if "*" in settings.cors_origins_list:
    cors_kwargs["allow_origin_regex"] = ".*"
else:
    cors_kwargs["allow_origins"] = settings.cors_origins_list

app.add_middleware(
    CORSMiddleware,
    **cors_kwargs
)

# ============================================================================
# Rate limiters (in-memory, per client IP). See services/rate_limiter.py and
# docs/security/doc-rate-limiting-and-abuse.md.
# ============================================================================
# Gemini Live token: strict 5 / 60s. This gates the billable upstream session,
# so it is the tightest limit. No burst — the 6th rapid request is rejected.
live_token_rate_limit = RateLimiter(max_requests=5, window_seconds=60, scope="live_token")
# Guest reference-code lookup: 10 / 60s to blunt brute-force enumeration.
guest_lookup_rate_limit = RateLimiter(max_requests=10, window_seconds=60, scope="guest_lookup")
# General read/admin REST surface: a generous, shared 60 / 60s budget per IP
# (all endpoints tagged with this scope draw from the same per-IP bucket).
general_rate_limit = RateLimiter(max_requests=60, window_seconds=60, scope="general_rest")

# ============================================================================
# 1. Health & Status
# ============================================================================

@app.get("/api/health")
async def health():
    try:
        supabase = get_supabase()
        res = supabase.table("practice_information").select("name").limit(1).execute()
        return {
            "status": "healthy",
            "environment": settings.ENVIRONMENT,
            "supabase": "connected",
            "practice": res.data[0]["name"] if res.data else None
        }
    except Exception as e:
        # Log the real error server-side; return a generic message so the client
        # never sees connection strings, stack traces, or credential fragments.
        logger.error(f"Health check failed: {e}")
        return JSONResponse(status_code=500, content={"status": "unhealthy", "error": "Service dependency unavailable"})

# ============================================================================
# 2. Ephemeral Gemini Live Token & Session Setup
# ============================================================================

@app.post("/api/live/token", dependencies=[Depends(live_token_rate_limit)])
async def get_live_token(authorization: Optional[str] = Header(None)):
    """
    Generate an ephemeral session token with TTL for the browser to open a Live session.
    If a valid user JWT is sent, binds verified patient context server-side.
    Never exposes permanent credentials or patient PII in the token response body.
    """
    patient_ctx = None
    user = await get_optional_user(authorization)
    if user:
        uid = user["user_id"]
        try:
            supabase = get_supabase()
            res = supabase.table("patients").select("*").eq("id", uid).limit(1).execute()
            if res.data:
                p = res.data[0]
                patient_ctx = {
                    "user_id": uid,
                    "full_name": p.get("full_name") or user.get("user_metadata", {}).get("full_name", ""),
                    "dob": p.get("dob") or user.get("user_metadata", {}).get("dob", ""),
                    "phone": p.get("phone") or user.get("user_metadata", {}).get("phone", "")
                }
            else:
                patient_ctx = {
                    "user_id": uid,
                    "full_name": user.get("user_metadata", {}).get("full_name", ""),
                    "dob": user.get("user_metadata", {}).get("dob", ""),
                    "phone": user.get("user_metadata", {}).get("phone", "")
                }
        except Exception as e:
            logger.warning(f"Could not load patient profile for live token: {e}")

    token_data = create_ephemeral_token(patient_context=patient_ctx)
    return token_data

# Mapping of common English words and phrases that speech-to-text models
# Comprehensive mapping of English words/phrases transliterated into Devanagari script by speech models.
PHONETIC_DEVANAGARI_MAP = [
    (r'आई एम हैविंग', 'I am having'),
    (r'आई एम', 'I am'),
    (r'आई', 'I'),
    (r'एम', 'am'),
    (r'हैविंग', 'having'),
    (r'कफ एंड फीवर', 'cough and fever'),
    (r'कफ', 'cough'),
    (r'एंड', 'and'),
    (r'फीवर', 'fever'),
    (r'यस प्लीज सबमिट', 'Yes please submit'),
    (r'यस प्लीज', 'Yes please'),
    (r'यस', 'Yes'),
    (r'प्लीज सबमिट', 'Please submit'),
    (r'प्लीज', 'please'),
    (r'प्लीज़', 'please'),
    (r'गुड मॉर्निंग', 'Good morning'),
    (r'मॉर्निंग', 'morning'),
    (r'अपॉइंटमेंट', 'appointment'),
    (r'बुक माय अपॉइंटमेंट', 'book my appointment'),
    (r'बुक', 'book'),
    (r'माय', 'my'),
    (r'डॉक्टर', 'doctor'),
    (r'नर्स', 'nurse'),
    (r'प्रिस्क्रिप्शन', 'prescription'),
    (r'मेडिकेशन', 'medication'),
    (r'थैंक यू', 'Thank you'),
    (r'ओके', 'OK'),
    (r'हेलो', 'Hello'),
    (r'हेल्लो', 'Hello'),
    (r'हाय', 'Hi'),
    (r'सबमिट', 'submit'),
    (r'कैंसिल', 'cancel'),
    (r'चेक', 'check'),
    (r'स्टेटस', 'status'),
    (r'एलेक्स जॉनसन्स', 'Alex Johnsons'),
    (r'एलेक्स जॉनसन', 'Alex Johnson'),
    (r'एलेक्स', 'Alex'),
    (r'जॉनसन्स', 'Johnsons'),
    (r'जॉनसन', 'Johnson'),
    (r'विलियमसन', 'Williamson'),
    (r'निखिल', 'Nikhil'),
    (r'नेम', 'name'),
    (r'इज', 'is'),
    (r'इज़', 'is'),
    (r'मोबाइल नंबर', 'mobile number'),
    (r'मोबाइल', 'mobile'),
    (r'नंबर', 'number'),
    (r'रीज़न', 'reason'),
    (r'रीजन', 'reason'),
    (r'फॉर द विजिट', 'for the visit'),
    (r'फॉर दी विजिट', 'for the visit'),
    (r'विजिट', 'visit'),
    (r'फॉर', 'for'),
    (r'दी', 'the'),
    (r'द', 'the'),
    (r'रेगुलर हेल्थ चेकअप', 'regular health checkup'),
    (r'रेगुलर चेकअप', 'regular checkup'),
    (r'हेल्थ चेकअप', 'health checkup'),
    (r'रेगुलर', 'regular'),
    (r'हेल्थ', 'health'),
    (r'चेकअप', 'checkup'),
    (r'वांट एन', 'want an'),
    (r'वांट ए', 'want an'),
    (r'वांट', 'want'),
    (r'वान्ट', 'want'),
    (r'जनरल हेल्थ चेकअप', 'general health checkup'),
    (r'जनरल हेल्थ', 'general health'),
    (r'जनरल चेकअप', 'general checkup'),
    (r'जनरल', 'general'),
    (r'रूटीन', 'routine'),
    (r'अर्जेंट', 'urgent'),
    (r'कंसल्टेशन', 'consultation'),
    (r'टुमारो', 'tomorrow'),
    (r'टुमॉरो', 'tomorrow'),
    (r'एएम', 'AM'),
    (r'पीएम', 'PM'),
    (r'हाँ', 'yes'),
    (r'जी हाँ', 'yes'),
    (r'कर दीजिए', 'please do'),
    (r'ठीक है', 'okay'),
    (r'नहीं', 'no'),
    (r'नो', 'no'),
]

_DEVANAGARI_VOWELS = {
    'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
    'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
    'अं': 'an', 'अः': 'ah', 'ऑ': 'o', 'ऍ': 'e', 'ऒ': 'o', 'ॆ': 'e'
}

_DEVANAGARI_MATRAS = {
    'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
    'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
    'ं': 'n', 'ँ': 'n', 'ः': 'h', 'ॉ': 'o', 'ॅ': 'e', 'ॊ': 'o', 'ॆ': 'e'
}

_DEVANAGARI_CONSONANTS = {
    'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
    'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
    'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
    'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
    'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
    'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v',
    'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
    'ड़': 'd', 'ढ़': 'dh', 'फ़': 'f', 'ज़': 'z', 'क़': 'q', 'ख़': 'kh', 'ग़': 'gh'
}

_VIRAMA = '्'

def devanagari_to_latin(text: str) -> str:
    """Phonetically transliterates any remaining Devanagari script to Latin English text."""
    out = []
    i = 0
    n = len(text)
    while i < n:
        c = text[i]
        if i + 1 < n and text[i+1] == '़':
            combined = c + '़'
            if combined in _DEVANAGARI_CONSONANTS:
                c = combined
                i += 1
        
        if c in _DEVANAGARI_VOWELS:
            out.append(_DEVANAGARI_VOWELS[c])
        elif c in _DEVANAGARI_CONSONANTS:
            base = _DEVANAGARI_CONSONANTS[c]
            if i + 1 < n:
                nxt = text[i+1]
                if nxt == _VIRAMA:
                    out.append(base)
                    i += 1
                elif nxt in _DEVANAGARI_MATRAS:
                    out.append(base + _DEVANAGARI_MATRAS[nxt])
                    i += 1
                elif nxt in _DEVANAGARI_CONSONANTS or nxt in _DEVANAGARI_VOWELS:
                    out.append(base + 'a')
                else:
                    out.append(base)
            else:
                out.append(base)
        elif c in _DEVANAGARI_MATRAS:
            out.append(_DEVANAGARI_MATRAS[c])
        elif c in ['\u093C', '\u200C', '\u200D', '\u0949', '\u0945']:
            pass
        else:
            out.append(c)
        i += 1
    return ''.join(out)

LATIN_PHONETIC_FIXES = [
    (r'\belaeks\b', 'Alex'),
    (r'\bj[oॉŏ\u0949\u0300-\u036f]?h?nasan\b', 'Johnson'),
    (r'\bjohnasan\b', 'Johnson'),
    (r'\bvant e\b', 'want an'),
    (r'\bvant an\b', 'want an'),
    (r'\bvant\b', 'want'),
    (r'\b(\d{1,2})\s*eam\b', r'\1 AM'),
    (r'\beam\b', 'AM'),
    (r'\bjanaral\b', 'general'),
]

def normalize_user_transcription(text: str) -> str:
    """
    Ensure the transcription is 100% pure Latin English.
    Normalizes known phonetic Devanagari words, transliterates any remaining Devanagari characters,
    and repairs common Latin phonetic transcription artifacts.
    """
    if not text:
        return text
    cleaned = text
    for pattern, replacement in sorted(PHONETIC_DEVANAGARI_MAP, key=lambda x: len(x[0]), reverse=True):
        cleaned = re.sub(pattern, replacement, cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'[\u093C\u200C\u200D]', '', cleaned)
    if re.search(r'[\u0900-\u097F]', cleaned):
        cleaned = devanagari_to_latin(cleaned)
    for pattern, replacement in LATIN_PHONETIC_FIXES:
        cleaned = re.sub(pattern, replacement, cleaned, flags=re.IGNORECASE)
    # Strip any dangling combining marks so no dotted circles can ever appear
    cleaned = re.sub(r'[\u0300-\u036F\u0900-\u097F]', '', cleaned)
    return cleaned.strip()



@app.websocket("/api/live/ws")
async def live_websocket_endpoint(websocket: WebSocket, token: Optional[str] = Query(None)):
    """
    WebSocket endpoint connecting browser audio/text to Gemini Live Bidi Streaming session.
    - Captures PCM audio from client mic.
    - Streams 24kHz audio from Gemini back to client speaker.
    - Intercepts and executes function calls (book_appointment, etc.) in FastAPI.
    - Saves transcript and call record to Supabase upon disconnection.
    """
    # Enforce a valid short-lived session token BEFORE accepting the socket.
    # The browser always fetches one from POST /api/live/token first (guest and
    # authenticated alike), so this rejects only direct / replayed / expired
    # connections — which would otherwise open a billable Gemini Live upstream
    # and create an orphan call row. Rejecting pre-accept spins up no session.
    if not validate_token(token):
        logger.warning("Rejected WebSocket: missing, invalid, or expired session token")
        await websocket.close(code=1008)  # 1008 = policy violation
        return

    # Cap concurrent Live sessions per IP. Each session holds a billable upstream
    # Gemini socket, so this is the main quota-exhaustion guard. Acquire the slot
    # BEFORE accept(); if the cap is reached, reject pre-accept (no session spun
    # up). The slot is released in the finally block below via `ws_slot_ip`.
    client_ip = get_client_ip(websocket)
    if not await try_acquire_ws_slot(client_ip):
        logger.warning(
            "Rejected WebSocket: IP %s at concurrency cap (%d active sessions)",
            client_ip, MAX_WS_PER_IP,
        )
        await websocket.close(code=1008)  # 1008 = policy violation
        return
    ws_slot_ip = client_ip  # marks that a slot is held; released in finally
    try:
        await websocket.accept()
        logger.info("Client connected to Live Voice WebSocket session")

        # Resolve optional patient context from ephemeral session token
        patient_ctx = get_patient_context(token) if token else None
        active_user_id = patient_ctx.get("user_id") if patient_ctx else None
        # Verified patients keep their account name; guests start as a neutral
        # placeholder and get their real name backfilled post-call by the scribe
        # (never a hardcoded demo name).
        caller_name = (
            patient_ctx.get("full_name")
            if patient_ctx and patient_ctx.get("full_name")
            else "Guest Caller"
        )
        caller_phone = patient_ctx.get("phone") if patient_ctx else None

        # Upstream Gemini Multimodal Live API URL
        upstream_url = (
            f"wss://generativelanguage.googleapis.com/ws/"
            f"google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent"
            f"?key={settings.GEMINI_API_KEY}"
        )

        call_messages: List[Dict[str, str]] = []
        active_call_id: Optional[str] = None
        call_start_time: float = time.time()
        input_tx_buf = ""
        output_tx_buf = ""

        # Pre-create a call record in Supabase
        supabase = get_supabase()
        call_insert_data = {
            "caller_name": caller_name,
            "intent": "Appointment",
            "status": "Pending",
            "duration_seconds": 0,
            "duration_display": "0:00",
            "summary": "Call in progress...",
            "requires_human_review": True
        }
        if caller_phone:
            call_insert_data["caller_phone"] = caller_phone
        if active_user_id:
            call_insert_data["user_id"] = active_user_id

        init_call = supabase.table("calls").insert(call_insert_data).execute()
        if init_call.data:
            active_call_id = init_call.data[0]["id"]
            await websocket.send_json({
                "type": "call_initialized",
                "call_id": active_call_id,
                "call_number": init_call.data[0].get("call_number")
            })

        async with websockets.connect(upstream_url, ping_interval=20, ping_timeout=20) as gemini_ws:
            # 1. Send initial setup configuration to Gemini Live
            instruction_text = (
                f"{AURA_SYSTEM_INSTRUCTION}\n\n"
                f"Today's date is {date.today():%A, %d %B %Y}.\n\n"
                f"CRITICAL SPEECH RECOGNITION INSTRUCTION: "
                f"You are operating strictly in English in London, UK. Transcribe all user speech audio in English with standard English spelling and vocabulary (Latin alphabet), such as 'Alex Johnson', 'I want an appointment', '11 AM', 'general health checkup'. "
                f"NEVER transcribe caller speech into Devanagari script or phonetically misspelled words under any circumstances."
            )
            if patient_ctx and patient_ctx.get("full_name"):
                p_name = patient_ctx["full_name"].strip()
                first_name = p_name.split()[0] if p_name else "there"
                p_dob = patient_ctx.get("dob") or "On file"
                p_phone = patient_ctx.get("phone") or "On file"
                instruction_text = (
                    f"You are speaking with verified registered patient {p_name} "
                    f"(DOB: {p_dob}, Mobile: {p_phone}). "
                    f"Greet them warmly by first name ('Hello {first_name}, welcome back to Medical Practice...') "
                    f"and assist them with their enquiry. Their name and mobile number are ALREADY VERIFIED on file — "
                    f"do NOT ask them to repeat their name or phone number. "
                    f"To book an appointment for them, only ask for reason/symptom, preferred date, and time slot. "
                    f"Once they give these and confirm, immediately invoke `book_appointment` using patient_name='{p_name}' "
                    f"and patient_phone='{p_phone}'.\n\n"
                    f"{instruction_text}"
                )
            else:
                instruction_text = (
                    f"You are speaking with a GUEST CALLER. "
                    f"You must collect: (1) their full name, (2) their mobile contact number, (3) preferred date and time, (4) reason for appointment. "
                    f"Once the guest caller provides these and gives ANY confirmation (such as 'yes', 'please', 'correct', 'that's right', 'book the opportunity', 'book it', 'go ahead'), "
                    f"you MUST IMMEDIATELY invoke the `book_appointment` tool function call with their patient_name, patient_phone, preferred_date, preferred_time, and reason. "
                    f"CRITICAL CLINICAL SAFETY MANDATE: You have NO authority or ability to record appointments or create reference codes via spoken words alone. "
                    f"You are strictly FORBIDDEN from speaking any reference code (such as #APT-XXXXXX) or claiming the request has been recorded or submitted until the `book_appointment` tool call has executed and returned its response in this turn!\n\n"
                    f"{instruction_text}"
                )

            setup_msg = {
                "setup": {
                    "model": settings.GEMINI_LIVE_MODEL,
                    "generationConfig": {
                        "responseModalities": ["AUDIO"],
                        "speechConfig": {
                            "voiceConfig": {
                                "prebuiltVoiceConfig": {
                                    "voiceName": "Aoede"  # Warm, natural British/international female voice
                                }
                            }
                        }
                    },
                    "systemInstruction": {
                        "parts": [{"text": instruction_text}]
                    },
                    "tools": [
                        {
                            "functionDeclarations": AURA_TOOL_DECLARATIONS
                        }
                    ],
                    # Strict English-only speech-to-text language codes.
                    # Excludes hi-IN so the Gemini STT engine strictly transcribes into English Latin text.
                    "inputAudioTranscription": {
                        "languageCodes": ["en-GB", "en-US", "en-IN"]
                    },
                    "outputAudioTranscription": {}
                }
            }
            await gemini_ws.send(json.dumps(setup_msg))
            logger.info("Sent Gemini Live setup handshake with Aura tools")

            # Shared transcript buffers across stream events
            input_tx_buf = ""
            output_tx_buf = ""

            async def flush_user_tx():
                nonlocal input_tx_buf
                user_text = normalize_user_transcription(input_tx_buf.strip())
                if user_text:
                    call_messages.append({"role": "user", "content": user_text})
                    await websocket.send_json({
                        "type": "transcript",
                        "role": "user",
                        "text": user_text
                    })
                input_tx_buf = ""

            async def flush_assistant_tx():
                nonlocal output_tx_buf
                assistant_text = normalize_user_transcription(output_tx_buf.strip())
                if assistant_text:
                    call_messages.append({"role": "assistant", "content": assistant_text})
                    await websocket.send_json({
                        "type": "transcript",
                        "role": "assistant",
                        "text": assistant_text
                    })
                output_tx_buf = ""

            # 2. Coroutine: Upstream (Gemini -> Client)
            async def receive_from_gemini():
                nonlocal input_tx_buf, output_tx_buf
                try:
                    async for raw_msg in gemini_ws:
                        data = json.loads(raw_msg)

                        # Check for server content (audio output / text transcript)
                        server_content = data.get("serverContent")
                        if server_content:
                            # Accumulate speech-to-text of the user's audio input
                            in_tx = server_content.get("inputTranscription")
                            if in_tx and in_tx.get("text"):
                                input_tx_buf += in_tx["text"]

                            # Accumulate text transcription of Aura's audio reply
                            out_tx = server_content.get("outputTranscription")
                            if out_tx and out_tx.get("text"):
                                output_tx_buf += out_tx["text"]

                            model_turn = server_content.get("modelTurn")
                            if model_turn:
                                # When model reply begins, user has finished speaking.
                                # Flush user transcription so the speech bubble appears immediately.
                                await flush_user_tx()
                                for part in model_turn.get("parts", []):
                                    # Audio part — relay the spoken audio to the browser.
                                    if "inlineData" in part:
                                        audio_b64 = part["inlineData"]["data"]
                                        mime = part["inlineData"].get("mimeType", "audio/pcm;rate=24000")
                                        await websocket.send_json({
                                            "type": "audio",
                                            "data": audio_b64,
                                            "mimeType": mime
                                        })

                            # Check for user barge-in / interruption
                            if server_content.get("interrupted"):
                                logger.info("Gemini turn interrupted by user speech")
                                await flush_user_tx()
                                await flush_assistant_tx()
                                await websocket.send_json({"type": "interrupted"})

                            # Turn finished: generationComplete or turnComplete
                            if server_content.get("turnComplete") or server_content.get("generationComplete"):
                                await flush_user_tx()
                                await flush_assistant_tx()

                        # Check for tool / function call from Gemini
                        tool_call = data.get("toolCall")
                        if tool_call:
                            # Flush user transcript before tool execution
                            await flush_user_tx()
                            function_calls = tool_call.get("functionCalls", [])
                            function_responses = []

                            for fc in function_calls:
                                call_id = fc.get("id")
                                tool_name = fc.get("name")
                                args = fc.get("args", {})
                                if active_call_id:
                                    args["call_id"] = active_call_id
                                if active_user_id:
                                    args["user_id"] = active_user_id
                                if patient_ctx:
                                    if not args.get("patient_name") and patient_ctx.get("full_name"):
                                        args["patient_name"] = patient_ctx["full_name"]
                                    if not args.get("patient_phone") and patient_ctx.get("phone"):
                                        args["patient_phone"] = patient_ctx["phone"]
                                    if not args.get("patient_dob") and patient_ctx.get("dob"):
                                        args["patient_dob"] = patient_ctx["dob"]

                                logger.info(f"Gemini invoked tool: {tool_name} with args: {args}")

                                # Notify client UI so request panel updates immediately
                                await websocket.send_json({
                                    "type": "tool_call",
                                    "id": call_id,
                                    "name": tool_name,
                                    "args": args
                                })

                                # Inject session context (call_id & user_id) into tool args if not present
                                if active_call_id and not args.get("call_id"):
                                    args["call_id"] = active_call_id
                                if active_user_id and not args.get("user_id"):
                                    args["user_id"] = active_user_id

                                # Execute tool in FastAPI backend
                                result = await execute_tool(tool_name, args)

                                # Send tool result to client UI
                                await websocket.send_json({
                                    "type": "tool_result",
                                    "id": call_id,
                                    "name": tool_name,
                                    "result": result
                                })

                                function_responses.append({
                                    "id": call_id,
                                    "name": tool_name,
                                    "response": result
                                })

                            # Return function response back to Gemini Live to continue conversation
                            if function_responses:
                                response_payload = {
                                    "toolResponse": {
                                        "functionResponses": function_responses
                                    }
                                }
                                await gemini_ws.send(json.dumps(response_payload))
                                logger.info("Returned function response back to Gemini Live")

                except Exception as e:
                    logger.error(f"Error in receive_from_gemini: {e}")

            # 3. Coroutine: Downstream (Client -> Gemini)
            async def receive_from_client():
                audio_frames = 0
                try:
                    while True:
                        client_msg = await websocket.receive_text()
                        parsed = json.loads(client_msg)
                        msg_type = parsed.get("type")

                        # Audio chunk from browser mic (PCM 16kHz)
                        if msg_type == "audio":
                            audio_b64 = parsed.get("data")
                            mime = parsed.get("mimeType", "audio/pcm;rate=16000")
                            # Diagnostic: confirm mic audio is actually reaching the
                            # backend (log first frame, then every 50th ~ every 4-5s).
                            audio_frames += 1
                            if audio_frames == 1 or audio_frames % 50 == 0:
                                logger.info(f"Received mic audio frame #{audio_frames} ({len(audio_b64 or '')} b64 chars, mime={mime})")
                            # Use the modern `audio` field. `mediaChunks` is deprecated
                            # and silently ignored by current Live models, which is why
                            # streamed mic audio never reached the model.
                            realtime_input = {
                                "realtimeInput": {
                                    "audio": {
                                        "mimeType": mime,
                                        "data": audio_b64
                                    }
                                }
                            }
                            await gemini_ws.send(json.dumps(realtime_input))

                        # Text message from client ("Use Text Instead" mode)
                        elif msg_type == "text":
                            user_text = parsed.get("text", "")
                            call_messages.append({"role": "user", "content": user_text})
                            client_content = {
                                "clientContent": {
                                    "turns": [
                                        {
                                            "role": "user",
                                            "parts": [{"text": user_text}]
                                        }
                                    ],
                                    "turnComplete": True
                                }
                            }
                            await gemini_ws.send(json.dumps(client_content))

                except WebSocketDisconnect:
                    logger.info("Client disconnected from WebSocket")
                except Exception as e:
                    logger.error(f"Error in receive_from_client: {e}")

            # Run both streaming directions concurrently with clean cancellation on either exit
            task_gemini = asyncio.create_task(receive_from_gemini())
            task_client = asyncio.create_task(receive_from_client())
            done, pending = await asyncio.wait([task_gemini, task_client], return_when=asyncio.FIRST_COMPLETED)
            for p in pending:
                p.cancel()

    except Exception as e:
        logger.error(f"Live WebSocket session error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": "Voice session ended"})
        except Exception:
            pass
    finally:
        # Always free the per-IP concurrency slot first, even if post-call
        # processing below raises, so a slot is never leaked on this IP.
        await release_ws_slot(ws_slot_ip)

        # Calculate real call duration from elapsed connection time
        duration_seconds = max(1, int(time.time() - call_start_time)) if call_start_time else 0
        minutes = duration_seconds // 60
        seconds = duration_seconds % 60
        duration_display = f"{minutes}:{seconds:02d}"

        # Post-call processing: update duration and run Gemini 3.5 Flash-Lite extraction
        if active_call_id:
            try:
                supabase = get_supabase()
                # Always update the duration and mark call as completed if it was still pending
                call_update = {
                    "duration_seconds": duration_seconds,
                    "duration_display": duration_display,
                }
                supabase.table("calls").update(call_update).eq("id", active_call_id).execute()
                logger.info(f"Updated call {active_call_id} duration: {duration_display} ({duration_seconds}s)")

                # Flush any uncommitted trailing transcripts before post-call save
                if input_tx_buf and input_tx_buf.strip():
                    u_text = normalize_user_transcription(input_tx_buf.strip())
                    if u_text:
                        call_messages.append({"role": "user", "content": u_text})
                    input_tx_buf = ""
                if output_tx_buf and output_tx_buf.strip():
                    a_text = output_tx_buf.strip()
                    if a_text:
                        call_messages.append({"role": "assistant", "content": a_text})
                    output_tx_buf = ""

                if call_messages:
                    logger.info(f"Processing post-call summary for call {active_call_id} ({len(call_messages)} messages)...")
                    # Save messages
                    msg_records = [
                        {
                            "call_id": active_call_id,
                            "role": m["role"],
                            "content": m["content"],
                            **({"user_id": active_user_id} if active_user_id else {})
                        }
                        for m in call_messages
                    ]
                    supabase.table("call_messages").insert(msg_records).execute()

                    # Build transcript string
                    transcript_str = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in call_messages])
                    await process_post_call_summary(
                        active_call_id,
                        transcript_str,
                        active_user_id,
                        duration_seconds=duration_seconds,
                        duration_display=duration_display,
                    )
            except Exception as post_err:
                logger.error(f"Failed post-call save: {post_err}")

# ============================================================================
# 4. Tools Direct Execution Endpoint
# ============================================================================

# Tools that may be invoked from the public HTTP endpoint (i.e. requested by the
# LLM during a call). Internal-only tools such as save_call / save_call_summary are
# deliberately excluded so a client cannot fabricate arbitrary call records or
# force a call status through this route. The server still owns all authoritative
# fields (status, reference_id, created_at) inside each tool implementation.
PUBLIC_TOOL_ALLOWLIST = {
    "book_appointment",
    "create_appointment_request",
    "request_prescription",
    "create_prescription_request",
    "submit_admin_enquiry",
    "create_admin_request",
    "get_practice_info",
    "get_practice_information",
    "get_my_appointment",
    "escalate_to_staff",
    "escalate_to_reception",
}

@app.post("/api/tools/{tool_name}")
async def execute_tool_endpoint(tool_name: str, payload: Dict[str, Any]):
    """
    Direct tool execution endpoint for function calling.

    The model can only *request* a tool; the server independently authorizes it.
    Unknown or internal-only tools are rejected here before any handler runs.
    """
    if tool_name not in PUBLIC_TOOL_ALLOWLIST:
        logger.warning(f"Rejected disallowed tool via public endpoint: {tool_name}")
        raise HTTPException(status_code=403, detail=f"Tool '{tool_name}' is not permitted.")
    result = await execute_tool(tool_name, payload)
    return result

# ============================================================================
# 5. Calls & Call Details API
# ============================================================================

@app.get("/api/calls", dependencies=[Depends(general_rate_limit), Depends(require_admin)])
async def list_calls(
    tab: Optional[str] = None,
    status: Optional[str] = None,
    caller_type: Optional[str] = None,
    limit: int = 50
):
    supabase = get_supabase()
    query = supabase.table("calls").select("*").order("created_at", desc=True).limit(limit)

    if caller_type == "registered":
        query = query.not_.is_("user_id", "null")
    elif caller_type == "guest":
        query = query.is_("user_id", "null")

    if tab:
        tab_map = {
            "recent": None,
            "appointments": "Appointment",
            "prescriptions": "Prescription",
            "escalations": "Escalated",
        }
        mapped_intent = tab_map.get(tab)
        if mapped_intent:
            query = query.eq("intent", mapped_intent)

    try:
        res = query.execute()
        calls = res.data or []
    except Exception as e:
        logger.warning(f"Query with caller_type filter failed (user_id column may be pending migration): {e}")
        fallback_query = supabase.table("calls").select("*").order("created_at", desc=True).limit(limit)
        if tab and mapped_intent:
            fallback_query = fallback_query.eq("intent", mapped_intent)
        if status:
            fallback_query = fallback_query.eq("status", status)
        res = fallback_query.execute()
        calls = res.data or []

    # Map to frontend Call interface
    mapped_calls = []
    for c in calls:
        is_registered = bool(c.get("user_id"))
        mapped_calls.append({
            "id": c.get("call_number", 1000),
            "uuid": c["id"],
            "user_id": c.get("user_id"),
            "caller_type": "patient" if is_registered else "guest",
            "callerType": "patient" if is_registered else "guest",
            "time": c["created_at"][11:16] if len(c.get("created_at", "")) >= 16 else "10:00 AM",
            "caller": c.get("caller_name", "Anonymous"),
            "intent": c.get("intent", "Appointment"),
            "summary": c.get("summary", ""),
            "duration": c.get("duration_display", "1:30"),
            "status": c.get("status", "Pending"),
            "urgency": c.get("urgency", "routine"),
            "extracted_data": c.get("extracted_data") or {},
            "extractedData": c.get("extracted_data") or {},
            "requires_human_review": c.get("requires_human_review", True),
            "created_at": c.get("created_at")
        })
    return mapped_calls

@app.get("/api/calls/{call_id}", dependencies=[Depends(require_admin)])
async def get_call_by_id(call_id: str):
    supabase = get_supabase()
    # Support lookup by UUID or call_number
    if call_id.isdigit():
        res = supabase.table("calls").select("*").eq("call_number", int(call_id)).execute()
    else:
        res = supabase.table("calls").select("*").eq("id", call_id).execute()

    if not res.data:
        raise HTTPException(status_code=404, detail="Call not found")

    call = res.data[0]
    cid = call["id"]
    is_registered = bool(call.get("user_id"))
    call["caller_type"] = "patient" if is_registered else "guest"
    call["callerType"] = "patient" if is_registered else "guest"

    # Fetch messages
    msg_res = supabase.table("call_messages").select("*").eq("call_id", cid).order("created_at").execute()
    messages = msg_res.data or []
    call["messages"] = messages
    call["transcript"] = [
        {
            "speaker": "Aura" if m.get("role") == "assistant" else "Caller",
            "text": m.get("content", ""),
            "time": m.get("created_at", "")[11:16] if len(m.get("created_at", "")) >= 16 else ""
        }
        for m in messages
    ]

    # Check for linked records
    apt = supabase.table("appointment_requests").select("*").eq("call_id", cid).limit(1).execute()
    rx = supabase.table("prescription_requests").select("*").eq("call_id", cid).limit(1).execute()
    adm = supabase.table("admin_requests").select("*").eq("call_id", cid).limit(1).execute()
    esc = supabase.table("escalations").select("*").eq("call_id", cid).limit(1).execute()

    if call.get("user_id"):
        try:
            pat_res = supabase.table("patients").select("*").eq("id", call["user_id"]).limit(1).execute()
            if pat_res.data:
                call["patient_profile"] = pat_res.data[0]
                call["patientProfile"] = pat_res.data[0]
        except Exception as e:
            logger.warning(f"Could not load patient profile for call: {e}")

    if apt.data:
        call["actionTaken"] = f"Appointment request logged: {apt.data[0]['reason']} ({apt.data[0]['reference_id']})"
        call["action_taken"] = call["actionTaken"]
    elif rx.data:
        call["actionTaken"] = f"Repeat prescription logged: {rx.data[0]['medication']} ({rx.data[0]['reference_id']})"
        call["action_taken"] = call["actionTaken"]
    elif adm.data:
        call["actionTaken"] = f"Admin enquiry recorded: {adm.data[0]['query'][:50]} ({adm.data[0]['reference_id']})"
        call["action_taken"] = call["actionTaken"]
    elif esc.data:
        call["actionTaken"] = f"Transferred to {esc.data[0]['transferred_to']}"
        call["action_taken"] = call["actionTaken"]
        call["escalationState"] = f"{esc.data[0]['priority']} priority — {esc.data[0]['reason']}"
        call["escalation_state"] = call["escalationState"]
    else:
        call["actionTaken"] = "Request processed and recorded in triage queue"
        call["action_taken"] = call["actionTaken"]
        call["escalationState"] = "None"
        call["escalation_state"] = "None"

    if call.get("status") == "Escalated" and (not call.get("escalationState") or call.get("escalationState") == "None"):
        call["escalationState"] = "Clinical escalation — Review required"
        call["escalation_state"] = call["escalationState"]

    # Provide camelCase aliases for frontend
    call["caller"] = call.get("caller_name", "Anonymous")
    call["duration"] = call.get("duration_display", "1:30")
    call["time"] = call.get("created_at", "")[11:16] if len(call.get("created_at", "")) >= 16 else "10:00 AM"
    call["extractedData"] = call.get("extracted_data") or {}

    return call

@app.post("/api/calls")
async def create_call(call_in: CallCreate):
    result = await execute_tool("save_call", call_in.model_dump())
    return result

@app.post("/api/calls/{call_id}/summary")
async def generate_call_summary(call_id: str, payload: Dict[str, str]):
    transcript = payload.get("transcript", "")
    result = await process_post_call_summary(call_id, transcript)
    return result

@app.get("/api/calls-volume", dependencies=[Depends(general_rate_limit), Depends(require_admin)])
@app.get("/api/dashboard/call-volume", dependencies=[Depends(general_rate_limit), Depends(require_admin)])
async def get_call_volume(range_param: str = Query("last7days", alias="range")):
    """
    Return daily call volume data calculated from calls in Supabase.
    """
    supabase = get_supabase()
    from datetime import datetime, timedelta, timezone
    now = datetime.now(timezone.utc)
    
    # Generate 7 days ending today
    days = [(now - timedelta(days=i)) for i in range(6, -1, -1)]
    days_map = {d.strftime("%a"): {"date": d.strftime("%a"), "aiHandled": 0, "escalated": 0} for d in days}
    
    try:
        res = supabase.table("calls").select("status, intent, created_at").order("created_at", desc=False).execute()
        calls = res.data or []
        for c in calls:
            created_str = c.get("created_at")
            if not created_str:
                continue
            try:
                dt = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
                day_key = dt.strftime("%a")
                is_escalated = c.get("status") == "Escalated" or c.get("intent") == "Escalated"
                if day_key in days_map:
                    if is_escalated:
                        days_map[day_key]["escalated"] += 1
                    else:
                        days_map[day_key]["aiHandled"] += 1
                else:
                    today_key = now.strftime("%a")
                    if today_key in days_map:
                        if is_escalated:
                            days_map[today_key]["escalated"] += 1
                        else:
                            days_map[today_key]["aiHandled"] += 1
            except Exception:
                pass
    except Exception as e:
        logger.error(f"Error computing call volume from Supabase: {e}")
        
    return list(days_map.values())

# ============================================================================
# 6. Admin Dashboard Metrics API
# ============================================================================

@app.get("/api/dashboard/kpis", dependencies=[Depends(general_rate_limit), Depends(require_admin)])
async def get_dashboard_kpis():
    supabase = get_supabase()
    total_calls_res = supabase.table("calls").select("id", count="exact").execute()
    ai_handled_res = supabase.table("calls").select("id", count="exact").neq("status", "Escalated").neq("intent", "Escalated").execute()
    escalations_res = supabase.table("escalations").select("id", count="exact").execute()
    apts_res = supabase.table("appointment_requests").select("id", count="exact").execute()
    rx_res = supabase.table("prescription_requests").select("id", count="exact").execute()
    admin_res = supabase.table("admin_requests").select("id", count="exact").execute()

    reg_calls = 0
    guest_calls = 0
    try:
        registered_res = supabase.table("calls").select("id", count="exact").not_.is_("user_id", "null").execute()
        guest_res = supabase.table("calls").select("id", count="exact").is_("user_id", "null").execute()
        reg_calls = registered_res.count if registered_res.count is not None else 0
        guest_calls = guest_res.count if guest_res.count is not None else 0
    except Exception as e:
        logger.warning(f"Could not count calls by user_id (migration may be pending): {e}")

    total_calls = total_calls_res.count if total_calls_res.count is not None else 0
    ai_handled = ai_handled_res.count if ai_handled_res.count is not None else 0
    escalations = escalations_res.count if escalations_res.count is not None else 0
    apts = apts_res.count if apts_res.count is not None else 0
    rx = rx_res.count if rx_res.count is not None else 0
    admin_count = admin_res.count if admin_res.count is not None else 0

    pct_automated = int((ai_handled / max(total_calls, 1)) * 100) if total_calls > 0 else 0
    pct_escalated = int((escalations / max(total_calls, 1)) * 100) if total_calls > 0 else 0

    return [
        {
            "id": "total-calls",
            "title": "Total Calls",
            "value": total_calls,
            "trend": f"{total_calls} calls",
            "trendLabel": "total logged",
            "icon": "calls",
            "color": "blue"
        },
        {
            "id": "handled-by-ai",
            "title": "Handled by AI",
            "value": ai_handled,
            "trend": f"{pct_automated}%",
            "trendLabel": "automated",
            "icon": "check",
            "color": "green"
        },
        {
            "id": "escalated-to-staff",
            "title": "Escalated to Staff",
            "value": escalations,
            "trend": f"{pct_escalated}%",
            "trendLabel": "needs review",
            "icon": "escalation",
            "color": "amber"
        },
        {
            "id": "registered-patients",
            "title": "Registered Callers",
            "value": reg_calls,
            "trend": f"{int((reg_calls / max(total_calls, 1)) * 100)}%" if total_calls > 0 else "0%",
            "trendLabel": f"{guest_calls} guests",
            "icon": "patients",
            "color": "green"
        },
        {
            "id": "appointment-requests",
            "title": "Appointment Requests",
            "value": apts,
            "trend": f"{apts} requests",
            "trendLabel": "triage queue",
            "icon": "appointment",
            "color": "purple"
        },
        {
            "id": "prescription-requests",
            "title": "Prescription Requests",
            "value": rx,
            "trend": f"{rx} pending",
            "trendLabel": "GP review",
            "icon": "prescription",
            "color": "amber"
        },
        {
            "id": "admin-enquiries",
            "title": "Admin Enquiries",
            "value": admin_count,
            "trend": f"{admin_count} total",
            "trendLabel": "answered/logged",
            "icon": "clinic",
            "color": "blue"
        }
    ]

@app.get("/api/dashboard/request-types", dependencies=[Depends(general_rate_limit), Depends(require_admin)])
async def get_dashboard_request_types():
    supabase = get_supabase()
    apts = supabase.table("appointment_requests").select("id", count="exact").execute().count or 0
    rx = supabase.table("prescription_requests").select("id", count="exact").execute().count or 0
    admin_count = supabase.table("admin_requests").select("id", count="exact").execute().count or 0
    esc = supabase.table("escalations").select("id", count="exact").execute().count or 0
    total = apts + rx + admin_count + esc

    return [
        {"label": "Appointments", "name": "Appointments", "value": apts, "pct": f"{int((apts / max(total, 1)) * 100)}%", "color": "#2563eb"},
        {"label": "Prescriptions", "name": "Prescriptions", "value": rx, "pct": f"{int((rx / max(total, 1)) * 100)}%", "color": "#16a34a"},
        {"label": "Admin Enquiries", "name": "Admin Enquiries", "value": admin_count, "pct": f"{int((admin_count / max(total, 1)) * 100)}%", "color": "#9333ea"},
        {"label": "Escalations", "name": "Escalations", "value": esc, "pct": f"{int((esc / max(total, 1)) * 100)}%", "color": "#dc2626"},
    ]

@app.get("/api/dashboard/recent-activity", dependencies=[Depends(general_rate_limit), Depends(require_admin)])
async def get_dashboard_recent_activity():
    supabase = get_supabase()
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)

    def format_time_ago(ts_str: Optional[str]) -> str:
        if not ts_str:
            return "Just now"
        try:
            dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            diff = int((now - dt).total_seconds())
            if diff < 60:
                return "Just now"
            if diff < 3600:
                return f"{diff // 60}m ago"
            if diff < 86400:
                return f"{diff // 3600}h ago"
            return f"{diff // 86400}d ago"
        except Exception:
            return "Recently"

    res = supabase.table("calls").select("*").order("created_at", desc=True).limit(10).execute()
    calls = res.data or []

    icon_map = {
        "Appointment": "appointment",
        "Prescription": "prescription",
        "Escalated": "escalation",
        "Admin": "clinic",
    }

    activities = []
    for c in calls:
        intent = c.get("intent", "Appointment")
        title = f"{intent} request" if intent != "Escalated" else "Call escalated to duty clinician"
        activities.append({
            "id": f"act-{c['id']}",
            "title": title,
            "callId": f"Call #{c.get('call_number', 1000)}",
            "timeAgo": format_time_ago(c.get("created_at")),
            "icon": icon_map.get(intent, "phone")
        })
    return activities

@app.get("/api/dashboard/operation-status", dependencies=[Depends(general_rate_limit), Depends(require_admin)])
async def get_dashboard_operation_status():
    supabase = get_supabase()
    try:
        chunks_res = supabase.table("knowledge_chunks").select("id", count="exact").execute()
        chunk_count = chunks_res.count if chunks_res.count is not None else 0
        db_status = "Connected"
    except Exception:
        chunk_count = 0
        db_status = "Degraded"

    return [
        {"id": "voice-pipeline", "label": "Voice Pipeline", "status": "operational", "value": "Gemini 3.8 Live (PCM)"},
        {"id": "clinical-scribe", "label": "Clinical Scribe", "status": "operational", "value": "Gemini 3.5 Flash-Lite"},
        {"id": "database", "label": "Supabase Database", "status": "operational", "value": db_status},
        {"id": "rag-knowledge", "label": "Knowledge Base", "status": "operational", "value": f"{chunk_count} Chunks (pgvector)"},
    ]

# ============================================================================
# 7. Practice Information & RAG Endpoints
# ============================================================================

@app.get("/api/practice-info")
async def get_practice_info():
    supabase = get_supabase()
    res = supabase.table("practice_information").select("*").limit(1).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Practice information not found")
    return res.data[0]

# Editable practice settings. Only a fixed set of fields is accepted so a client
# cannot write arbitrary columns; updates the single practice_information row.
EDITABLE_PRACTICE_FIELDS = {"name", "tagline", "phone", "address", "opening_hours", "emergency_info", "services_offered"}

@app.patch("/api/practice-info", dependencies=[Depends(require_admin)])
async def update_practice_info(payload: Dict[str, Any]):
    updates = {k: v for k, v in payload.items() if k in EDITABLE_PRACTICE_FIELDS}
    if not updates:
        raise HTTPException(status_code=400, detail=f"No editable fields provided. Allowed: {sorted(EDITABLE_PRACTICE_FIELDS)}")
    supabase = get_supabase()
    existing = supabase.table("practice_information").select("id").limit(1).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Practice information not found")
    row_id = existing.data[0]["id"]
    res = supabase.table("practice_information").update(updates).eq("id", row_id).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to update practice information")
    logger.info(f"Practice information updated: fields={sorted(updates.keys())}")
    return res.data[0]

@app.get("/api/knowledge", dependencies=[Depends(require_admin)])
async def list_knowledge():
    """
    Return the practice knowledge documents, each with the text of its chunks,
    for the admin Knowledge Base view. Read-only.
    """
    supabase = get_supabase()
    docs_res = (
        supabase.table("knowledge_documents")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )
    docs = docs_res.data or []
    if not docs:
        return []
    chunks_res = (
        supabase.table("knowledge_chunks")
        .select("document_id, content, created_at")
        .execute()
    )
    chunks_by_doc: Dict[str, List[str]] = {}
    for c in (chunks_res.data or []):
        chunks_by_doc.setdefault(c["document_id"], []).append(c.get("content", ""))
    for d in docs:
        d["chunks"] = chunks_by_doc.get(d["id"], [])
    return docs

@app.post("/api/knowledge/query")
async def query_knowledge(query_req: KnowledgeQueryRequest):
    results = await search_practice_knowledge(
        query_req.query,
        match_threshold=query_req.match_threshold,
        match_count=query_req.match_count
    )
    return results

# ============================================================================
# 8. Request Collections Endpoints
# ============================================================================

@app.get("/api/appointments", dependencies=[Depends(general_rate_limit), Depends(require_admin)])
async def list_appointments():
    supabase = get_supabase()
    res = supabase.table("appointment_requests").select("*").order("created_at", desc=True).execute()
    return res.data or []

@app.post("/api/appointments")
async def create_appointment(req: AppointmentRequestCreate):
    return await execute_tool("create_appointment_request", req.model_dump())

# Staff-only status transitions and edits for an appointment request.
ALLOWED_APPOINTMENT_STATUSES = {"pending_review", "confirmed", "cancelled", "completed"}

@app.patch("/api/appointments/{appointment_id}", dependencies=[Depends(require_admin)])
async def update_appointment(appointment_id: str, payload: Dict[str, Any]):
    """
    Staff-managed update for an appointment request.
    Allows updating status, preferred_date, preferred_time (any custom hour/minute), notes, reason, and urgency.
    Can be identified by UUID id or display reference_id (#APT-XXXX).
    """
    supabase = get_supabase()
    update_data: Dict[str, Any] = {}

    if "status" in payload and payload["status"]:
        new_status = str(payload["status"]).strip()
        if new_status == "pending":
            new_status = "pending_review"
        if new_status not in ALLOWED_APPOINTMENT_STATUSES:
            raise HTTPException(
                status_code=400,
                detail=f"status must be one of {sorted(ALLOWED_APPOINTMENT_STATUSES)}",
            )
        update_data["status"] = new_status

    if "preferred_date" in payload and payload["preferred_date"] is not None:
        update_data["preferred_date"] = str(payload["preferred_date"]).strip()

    if "preferred_time" in payload and payload["preferred_time"] is not None:
        # Accepts any custom hour / minute format (e.g. "10:15 AM", "14:20", "11:45 AM")
        update_data["preferred_time"] = str(payload["preferred_time"]).strip()

    if "notes" in payload and payload["notes"] is not None:
        update_data["notes"] = str(payload["notes"]).strip()

    if "reason" in payload and payload["reason"] is not None:
        update_data["reason"] = str(payload["reason"]).strip()

    if "urgency" in payload and payload["urgency"] is not None:
        update_data["urgency"] = str(payload["urgency"]).strip()

    if "patient_name" in payload and payload["patient_name"] is not None:
        update_data["patient_name"] = str(payload["patient_name"]).strip()

    if "patient_phone" in payload and payload["patient_phone"] is not None:
        update_data["patient_phone"] = str(payload["patient_phone"]).strip()

    if not update_data:
        raise HTTPException(status_code=400, detail="No valid update fields provided")

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    # Attempt update by id (UUID) or reference_id (#APT-XXXX)
    cleaned_id = appointment_id.strip()
    if cleaned_id.startswith("#"):
        res = supabase.table("appointment_requests").update(update_data).eq("reference_id", cleaned_id).execute()
    else:
        res = supabase.table("appointment_requests").update(update_data).eq("id", cleaned_id).execute()
        if not res.data:
            res = supabase.table("appointment_requests").update(update_data).eq("reference_id", cleaned_id).execute()

    if not res.data:
        raise HTTPException(status_code=404, detail="Appointment request not found")

    logger.info(f"Appointment {cleaned_id} updated: {list(update_data.keys())}")
    return res.data[0]


@app.get("/api/prescriptions", dependencies=[Depends(general_rate_limit), Depends(require_admin)])
async def list_prescriptions():
    supabase = get_supabase()
    res = supabase.table("prescription_requests").select("*").order("created_at", desc=True).execute()
    return res.data or []

@app.post("/api/prescriptions")
async def create_prescription(req: PrescriptionRequestCreate):
    return await execute_tool("create_prescription_request", req.model_dump())

@app.get("/api/enquiries", dependencies=[Depends(require_admin)])
async def list_enquiries():
    supabase = get_supabase()
    res = supabase.table("admin_requests").select("*").order("created_at", desc=True).execute()
    return res.data or []

@app.post("/api/enquiries")
async def create_enquiry(req: AdminRequestCreate):
    return await execute_tool("create_admin_request", req.model_dump())

@app.get("/api/escalations", dependencies=[Depends(require_admin)])
async def list_escalations():
    supabase = get_supabase()
    res = supabase.table("escalations").select("*").order("created_at", desc=True).execute()
    return res.data or []

@app.post("/api/escalations")
async def create_escalation(req: EscalationCreate):
    return await execute_tool("escalate_to_reception", req.model_dump())

# ============================================================================
# 8. Patient Portal & Identity API
# ============================================================================

EDITABLE_PATIENT_FIELDS = {"full_name", "phone", "dob", "address", "nominated_pharmacy"}

@app.get("/api/patient/me")
async def get_patient_profile(user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieve verified patient profile. Auto-creates row if trigger did not run."""
    uid = user["user_id"]
    supabase = get_supabase()
    try:
        res = supabase.table("patients").select("*").eq("id", uid).limit(1).execute()
        if res.data:
            return res.data[0]
    except Exception as e:
        logger.warning(f"Error querying patients table: {e}")
    
    # Auto-create fallback
    meta = user.get("user_metadata", {})
    new_profile = {
        "id": uid,
        "full_name": meta.get("full_name") or user.get("email", "").split("@")[0].capitalize(),
        "phone": meta.get("phone"),
        "dob": meta.get("dob")
    }
    try:
        create_res = supabase.table("patients").insert(new_profile).execute()
        if create_res.data:
            return create_res.data[0]
    except Exception as e:
        logger.warning(f"Could not auto-insert patient profile: {e}")
    return new_profile

@app.patch("/api/patient/me")
async def update_patient_profile(
    body: PatientProfileUpdate,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Update editable patient profile fields."""
    uid = user["user_id"]
    update_data = {k: v for k, v in body.model_dump().items() if v is not None and k in EDITABLE_PATIENT_FIELDS}
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields provided to update")

    supabase = get_supabase()
    res = supabase.table("patients").update(update_data).eq("id", uid).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    return res.data[0]

@app.get("/api/patient/appointments")
async def get_patient_appointments(user: Dict[str, Any] = Depends(get_current_user)):
    """List appointment requests belonging to the authenticated patient."""
    uid = user["user_id"]
    supabase = get_supabase()
    res = supabase.table("appointment_requests").select("*").eq("user_id", uid).order("created_at", desc=True).execute()
    return res.data or []

@app.get("/api/patient/prescriptions")
async def get_patient_prescriptions(user: Dict[str, Any] = Depends(get_current_user)):
    """List repeat prescription requests belonging to the authenticated patient."""
    uid = user["user_id"]
    supabase = get_supabase()
    res = supabase.table("prescription_requests").select("*").eq("user_id", uid).order("created_at", desc=True).execute()
    return res.data or []

@app.get("/api/patient/calls")
async def get_patient_calls(user: Dict[str, Any] = Depends(get_current_user)):
    """List prior calls belonging to the authenticated patient."""
    uid = user["user_id"]
    supabase = get_supabase()
    res = (
        supabase.table("calls")
        .select("id, call_number, caller_name, intent, summary, duration_seconds, duration_display, status, urgency, created_at")
        .eq("user_id", uid)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data or []

@app.get("/api/patient/calls/{call_id}")
async def get_patient_call_detail(call_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """
    Retrieve full call transcript and extraction for a single call.
    Enforces strict user ownership: returns 404 on mismatch (never leaks existence with 403).
    """
    uid = user["user_id"]
    supabase = get_supabase()
    call_res = supabase.table("calls").select("*").eq("id", call_id).eq("user_id", uid).limit(1).execute()
    if not call_res.data:
        raise HTTPException(status_code=404, detail="Call record not found")

    call_data = call_res.data[0]
    msgs_res = supabase.table("call_messages").select("id, role, content, created_at").eq("call_id", call_id).order("created_at", desc=False).execute()
    call_data["messages"] = msgs_res.data or []
    return call_data

@app.post("/api/guest/lookup", dependencies=[Depends(guest_lookup_rate_limit)])
async def guest_request_lookup(body: GuestLookupRequest):
    """
    Secure lookup of a request by reference code (#APT-XXXX, #RX-XXXX, etc.) and phone verification.
    Returns curated status only — never discloses sensitive clinical notes to guests.
    """
    import re
    ref_id = body.reference_id.strip()
    if not ref_id.startswith("#"):
        ref_id = f"#{ref_id}"

    input_phone_digits = re.sub(r"[^\d]", "", body.phone)
    if len(input_phone_digits) < 4:
        raise HTTPException(status_code=400, detail="Please provide a valid phone number (at least 4 digits)")

    supabase = get_supabase()
    table_mapping = {
        "#APT": ("appointment_requests", "Appointment"),
        "#RX-": ("prescription_requests", "Prescription"),
        "#ADM": ("admin_requests", "Admin Enquiry"),
        "#ESC": ("escalations", "Clinical Escalation"),
    }

    target = None
    req_type = "Request"
    for p, (tbl, tname) in table_mapping.items():
        if ref_id.upper().startswith(p):
            target = tbl
            req_type = tname
            break

    candidates = [target] if target else ["appointment_requests", "prescription_requests", "admin_requests", "escalations"]

    for tbl in candidates:
        try:
            res = supabase.table(tbl).select("*").eq("reference_id", ref_id).limit(1).execute()
            if res.data:
                row = res.data[0]
                stored_phone = re.sub(r"[^\d]", "", row.get("patient_phone") or "")
                # Compare phone digits (match last 4 digits)
                if input_phone_digits[-4:] == stored_phone[-4:]:
                    status_display = row.get("status", "pending")
                    if tbl == "prescription_requests":
                        pharmacy = row.get("pharmacy_preference") or "your nominated pharmacy"
                        med = row.get("medication") or "medication"
                        if status_display in ["confirmed", "approved"]:
                            msg = f"Your Prescription ({ref_id}) for {med} has been approved and digitally signed by the GP. It has been sent via EPS to {pharmacy} where you can now collect it."
                        elif status_display in ["pending_review", "pending_signature"]:
                            msg = f"Your Prescription ({ref_id}) for {med} is awaiting GP digital signature. Once approved, it will be automatically sent to {pharmacy} for collection."
                        elif status_display == "dispensed":
                            msg = f"Your Prescription ({ref_id}) for {med} has been dispensed at {pharmacy} and is ready for collection."
                        else:
                            msg = f"Your Prescription ({ref_id}) for {med} is currently {status_display.replace('_', ' ')}."
                    else:
                        if tbl == "appointment_requests":
                            slot_details = []
                            if row.get("preferred_date"):
                                slot_details.append(f"Date: {row.get('preferred_date')}")
                            if row.get("preferred_time"):
                                slot_details.append(f"Time: {row.get('preferred_time')}")
                            slot_str = f" scheduled for {', '.join(slot_details)}" if slot_details else ""

                            if status_display in ["confirmed", "approved"]:
                                msg = f"Your Appointment ({ref_id}) has been confirmed{slot_str}. The clinical practice has scheduled your consultation."
                            elif status_display == "cancelled":
                                msg = f"Your Appointment ({ref_id}) was cancelled by the practice. Please contact reception or speak to Aura if you wish to reschedule."
                            else:
                                msg = f"Your Appointment ({ref_id}) is currently {status_display.replace('_', ' ')}{slot_str}. It is awaiting staff review."

                            if row.get("notes"):
                                msg += f" Note from practice: {row.get('notes')}"
                        else:
                            msg = f"Your {req_type} ({ref_id}) is currently {status_display.replace('_', ' ')}."
                            if status_display in ["confirmed", "approved"]:
                                msg += " The practice has confirmed this request."
                            elif status_display in ["pending_review", "pending_signature"]:
                                msg += " It is currently awaiting review by the clinical team."

                    return {
                        "found": True,
                        "reference_id": ref_id,
                        "request_type": req_type,
                        "status": status_display,
                        "preferred_date": row.get("preferred_date"),
                        "preferred_time": row.get("preferred_time") or row.get("preferred_date"),
                        "notes": row.get("notes"),
                        "created_at": row.get("created_at"),
                        "message": msg
                    }
        except Exception as e:
            logger.warning(f"Error looking up reference {ref_id} in {tbl}: {e}")

    raise HTTPException(status_code=404, detail="No matching request found for this reference code and phone number.")
