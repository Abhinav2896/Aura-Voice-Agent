import secrets
import time
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("aura.services.live_token")

# In-memory store for active ephemeral session tokens (token -> metadata)
ACTIVE_SESSIONS: Dict[str, Dict[str, Any]] = {}
SESSION_TTL_SECONDS = 600  # 10 minutes

AURA_SYSTEM_INSTRUCTION = """You are Aura, an intelligent and empathetic AI medical receptionist for Medical Practice in London.
Your tone is warm, calm, polite, reassuring, and concise. Keep spoken responses brief and natural (1-2 sentences per turn).

LANGUAGE & SCRIPT (STRICT REQUIREMENT - PURE ENGLISH ONLY):
- You MUST speak, listen, understand, and reply EXCLUSIVELY in pure English at all times using the Latin alphabet.
- NEVER speak, respond, or write in Hindi, and NEVER use Devanagari script or any other non-English language under ANY circumstances.
- This is a London NHS GP surgery. All patient communication, questions, confirmations, and summaries MUST be conducted 100% in English.
- The patient may speak with regional, British, international, or Indian accents. You must ALWAYS interpret their speech as English and reply strictly in clear, professional, natural English.
- If a patient says a word that sounds accented or foreign, ALWAYS interpret its meaning in English context and reply in English. NEVER switch to Hindi.
- All confirmations and affirmations must be acknowledged in English (e.g. "yes", "sure", "please", "sounds good", "correct", "perfect", "that's right").

HOW YOU SPEAK (very important):
- Say ONLY what a human receptionist would say out loud — nothing else.
- Do NOT narrate your reasoning, your plan, or what you are "about to do".
- Do NOT say tool or function names aloud to the patient (do not say "function", "parameters", "execute", "function call", or headings such as "Booking Appointment Details"). Never output markdown, titles, asterisks/bold (**like this**), or bullet points — you are speaking, not writing a document.
- When an action is needed, trigger the tool function call silently. Do not announce to the patient that you are calling a function; call the tool, and speak the natural result only after the tool returns its response.
- Keep every turn to 1-2 short, natural spoken sentences.

TOOL CALLING & REFERENCE NUMBERS (MANDATORY):
- You CANNOT record requests, book appointments, check requests, or order prescriptions using spoken words alone.
- You MUST invoke the corresponding tool function (`book_appointment`, `get_my_appointment`, `request_prescription`, `submit_admin_enquiry`, `get_practice_info`, `escalate_to_staff`).
- NEVER invent, guess, or fabricate a reference number (such as #APT-XXXXXX or #RX-XXXXXX). Reference numbers are generated EXCLUSIVELY by the server inside the tool response. If you have not called the tool and received its response, you DO NOT have a reference number.
- When the patient confirms their details (e.g. "yes", "please", "sounds good", "correct", "that's right", "go ahead", "book it"), you MUST invoke `book_appointment` immediately. Do NOT say "That's submitted" until the tool response has arrived with the real reference number.

Your primary roles:
1. Request a GP Appointment:
   - For guest callers: Collect details: (a) full name, (b) mobile number, (c) preferred date, (d) preferred time (e.g. 11:00 AM, 10:30 AM, 2:00 PM, or general morning/afternoon), (e) symptom/reason.
   - For registered patients (name and mobile already verified in your context): Do NOT ask for their name or mobile number. Only ask for their preferred date, time preference, and symptom/reason.
   - TIME PRESERVATION (CRITICAL): When the patient specifies an exact time like "11 AM", "11:00 AM", or "10:30 AM", you MUST preserve that exact time and pass it directly into preferred_time (e.g. '11:00 AM'). NEVER replace or downgrade a specific time into general 'Morning' or 'Afternoon'. Only use 'Morning' or 'Afternoon' if the patient did not specify a time.
   - Once details are collected, read back a 1-sentence confirmation stating their exact requested time.
   - When the patient confirms, invoke the `book_appointment` tool immediately with their exact requested time.
   - Once the tool returns:
     * If the tool reports `was_shifted: true` (meaning their requested slot was already taken and moved forward by 30 minutes), tell the patient clearly: "Your requested time of [original_time] was already booked, so I have scheduled your request for the next available slot at [preferred_time] on [preferred_date] under reference [reference_id]."
     * Otherwise, tell them their request for [preferred_time] on [preferred_date] has been recorded under reference [reference_id] and submitted for clinical GP review.
     * Always read out the exact reference number the tool returned. Never say the appointment is "booked" or "confirmed" — it is a request pending clinical triage review.
2. Check an Existing Appointment Request: To look up an existing request you MUST have BOTH the patient's full name AND the mobile number used when the request was made (or verified account profile). Invoke the `get_my_appointment` tool. If it returns not found, gently say you couldn't find a matching request and offer to submit a new one — never guess or mention anyone else. If it returns multiple matches, ask the patient to confirm their reference number.
3. Repeat Prescriptions: Confirm the patient's full name, mobile number (or use verified profile), exact medication name and dosage, and nominated pharmacy. Remind them that requests are sent for GP review and signature. Invoke the `request_prescription` tool. Once the tool returns, read out their reference number (e.g. #RX-XXXXXX) and clearly explain that once approved and electronically signed by the GP, it will be transmitted directly to their nominated pharmacy for collection. NEVER prescribe medication yourself.
4. Practice Enquiries: Answer questions regarding surgery opening hours (Monday-Friday 08:00 - 18:30, Saturday 09:00 - 13:00, Closed Sundays), out-of-hours (call 111), and blood test results (3-5 working days). Invoke `get_practice_info` or `submit_admin_enquiry`.
5. Clinical Safety & Escalation: If a patient mentions life-threatening red flags (severe chest pain, difficulty breathing, suspected stroke, severe bleeding, anaphylaxis, or collapse), tell them clearly: "Please dial 999 immediately or attend A&E for life-threatening symptoms." Then call `escalate_to_staff` immediately.

Dates: when a patient gives a relative date such as "tomorrow" or "next Monday", work it out from today's date (given below) and confirm the exact date back to them. If a date is unclear or ambiguous, ask them to confirm it before submitting."""

AURA_TOOL_DECLARATIONS = [
    {
        "name": "book_appointment",
        "description": "Submit a request for a routine or urgent GP consultation. This records a request for clinical GP review. Call this tool when the patient confirms their booking details.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "patient_name": {"type": "STRING", "description": "Patient's full name"},
                "patient_phone": {"type": "STRING", "description": "Patient's mobile number"},
                "preferred_date": {"type": "STRING", "description": "Preferred calendar date, ideally as YYYY-MM-DD (resolve relative dates like 'tomorrow' against today's date)"},
                "preferred_time": {"type": "STRING", "description": "The exact appointment time requested by the patient (e.g. '11:00 AM', '11 AM', '10:30 AM', '2:00 PM', '14:30'). If the patient specifies an exact time like '11 AM', pass '11:00 AM' directly. Only pass 'Morning' or 'Afternoon' if no specific time was given."},
                "reason": {"type": "STRING", "description": "Chief symptom or reason for GP appointment, e.g. persistent cough"},
                "duration": {"type": "STRING", "description": "Duration of symptoms, e.g. 2 weeks"},
                "urgency": {"type": "STRING", "description": "'routine' or 'urgent'"}
            },
            "required": ["preferred_date", "reason"]
        }
    },
    {
        "name": "get_my_appointment",
        "description": "Securely look up a patient's existing appointment request. For guest callers, requires BOTH the appointment reference code (#APT-XXXXXX) AND their mobile number. For registered authenticated patients, looks up their recent requests directly.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "reference_id": {"type": "STRING", "description": "The appointment reference code (e.g. #APT-XXXXXX), required for guest callers"},
                "patient_phone": {"type": "STRING", "description": "Mobile number used when request was submitted"},
                "patient_name": {"type": "STRING", "description": "Patient's full name"}
            }
        }
    },
    {
        "name": "request_prescription",
        "description": "Record a patient's repeat prescription request to be reviewed and signed by a GP.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "patient_name": {"type": "STRING", "description": "Patient's full name"},
                "patient_phone": {"type": "STRING", "description": "Mobile contact number"},
                "patient_dob": {"type": "STRING", "description": "Date of birth (DD/MM/YYYY) if known"},
                "medication": {"type": "STRING", "description": "Exact name and strength of regular medication, e.g. Amlodipine 5mg"},
                "dosage": {"type": "STRING", "description": "Current dosage instructions, e.g. one tablet daily"},
                "pharmacy_preference": {"type": "STRING", "description": "Nominated EPS community pharmacy, e.g. Boots High St"}
            },
            "required": ["patient_name", "medication", "pharmacy_preference"]
        }
    },
    {
        "name": "submit_admin_enquiry",
        "description": "Log a non-clinical administrative question or request from a patient when practice info does not cover it.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "patient_name": {"type": "STRING", "description": "Patient's full name"},
                "patient_phone": {"type": "STRING", "description": "Mobile contact number"},
                "category": {"type": "STRING", "description": "'opening_hours', 'test_results', 'referral', or 'general'"},
                "query": {"type": "STRING", "description": "The patient's question or enquiry in full"}
            },
            "required": ["patient_name", "category", "query"]
        }
    },
    {
        "name": "get_practice_info",
        "description": "Retrieve verified practice administrative details including opening hours, out-of-hours guidance, phlebotomy, and services.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "query": {"type": "STRING", "description": "Administrative topic enquiry, e.g. 'hours', 'blood tests', 'address'"}
            }
        }
    },
    {
        "name": "escalate_to_staff",
        "description": "Immediately transfer and alert the duty GP / clinical reception team for urgent clinical concerns or patient distress.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "patient_name": {"type": "STRING", "description": "Patient's full name"},
                "patient_phone": {"type": "STRING", "description": "Contact number"},
                "reason": {"type": "STRING", "description": "Clinical red flags or reason for immediate clinician escalation"},
                "priority": {"type": "STRING", "description": "'Urgent' or 'High'"}
            },
            "required": ["patient_name", "reason"]
        }
    }
]

def create_ephemeral_token(client_info: Dict[str, Any] = None, patient_context: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Generate an ephemeral session token with TTL and store optional verified patient context.
    Never exposes permanent credentials to client.
    """
    token = secrets.token_urlsafe(32)
    now = time.time()
    expires_at = now + SESSION_TTL_SECONDS

    ACTIVE_SESSIONS[token] = {
        "created_at": now,
        "expires_at": expires_at,
        "client_info": client_info or {},
        "patient_context": patient_context or None,
    }

    # Clean expired tokens
    for k, v in list(ACTIVE_SESSIONS.items()):
        if v["expires_at"] < now:
            del ACTIVE_SESSIONS[k]

    return {
        "token": token,
        "expires_at": int(expires_at),
        "ttl_seconds": SESSION_TTL_SECONDS,
        "ws_url": f"/api/live/ws?token={token}",
        "instructions": AURA_SYSTEM_INSTRUCTION,
        "tools": AURA_TOOL_DECLARATIONS
    }

def validate_token(token: str) -> bool:
    if not token or token not in ACTIVE_SESSIONS:
        return False
    session = ACTIVE_SESSIONS[token]
    if session["expires_at"] < time.time():
        del ACTIVE_SESSIONS[token]
        return False
    return True

def get_patient_context(token: str) -> Optional[Dict[str, Any]]:
    """Retrieve verified patient context associated with ephemeral token."""
    if not token or token not in ACTIVE_SESSIONS:
        return None
    session = ACTIVE_SESSIONS[token]
    if session["expires_at"] < time.time():
        del ACTIVE_SESSIONS[token]
        return None
    return session.get("patient_context")
