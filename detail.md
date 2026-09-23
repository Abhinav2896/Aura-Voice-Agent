# AURA — AI Voice Receptionist for Medical Practices

> **Aura** is a full-stack, real-time AI voice receptionist prototype that replaces the traditional phone-based front desk of a GP (General Practitioner) surgery. Patients speak naturally to an AI agent powered by Google Gemini Live; the agent collects clinical-administrative information, executes structured function calls against a FastAPI backend, persists every interaction in Supabase (PostgreSQL), and surfaces all activity on a rich admin dashboard — completely removing the need for a human to answer the phone for routine tasks.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Key Features](#2-key-features)
3. [Tech Stack](#3-tech-stack)
4. [System Architecture](#4-system-architecture)
5. [End-to-End Data Flow](#5-end-to-end-data-flow)
6. [Database Schema](#6-database-schema)
7. [API Reference](#7-api-reference)
8. [AI Models & Their Roles](#8-ai-models--their-roles)
9. [Voice Pipeline Deep-Dive](#9-voice-pipeline-deep-dive)
10. [Function Calling (Tools)](#10-function-calling-tools)
11. [RAG Knowledge Base](#11-rag-knowledge-base)
12. [Frontend Architecture](#12-frontend-architecture)
13. [Admin Dashboard](#13-admin-dashboard)
14. [Project File Structure](#14-project-file-structure)
15. [Environment Variables](#15-environment-variables)
16. [Getting Started](#16-getting-started)
17. [Clinical Safety & Escalation Protocol](#17-clinical-safety--escalation-protocol)
18. [Security Considerations](#18-security-considerations)

---

## 1. Product Overview

### What Is Aura?

Aura is an **AI-powered medical receptionist** designed for NHS-style GP surgeries. Instead of patients waiting on hold or navigating IVR menus, they open a web interface, tap a microphone button, and speak naturally — just as they would to a human receptionist.

### The Problem It Solves

- **Long hold times** — GP reception lines are notoriously overloaded, especially at 08:00 when phone lines open.
- **Repetitive administrative tasks** — 70-80% of incoming calls are routine (appointment requests, repeat prescriptions, opening hours enquiries) and follow predictable patterns.
- **Staff burnout** — Human receptionists handle hundreds of calls daily; Aura offloads routine work so staff focus on complex clinical-administrative tasks.
- **After-hours coverage** — Aura can operate 24/7 for non-emergency enquiries.

### What Aura Can Do

| Capability | Description |
|---|---|
| **Book GP Appointments** | Collects patient name, mobile, preferred date/time, reason, and urgency — then submits a structured request to the practice triage queue |
| **Check Existing Appointments** | Securely looks up a patient's prior request by name + mobile number (never by name alone) |
| **Repeat Prescriptions** | Records medication, dosage, and nominated pharmacy — routes to GP electronic signature queue |
| **Practice Enquiries** | Answers questions about opening hours, test result turnaround times, address, and services |
| **Clinical Escalation** | Detects red-flag symptoms (chest pain, stroke signs, anaphylaxis) and immediately escalates to the duty clinician |
| **Post-Call Intelligence** | After each call, Gemini 3.5 Flash-Lite extracts intent, urgency, clinical entities, and a professional summary |

---

## 2. Key Features

### Patient-Facing

- 🎙️ **Real-time voice conversation** — bidirectional audio streaming (16kHz input → 24kHz output)
- ⌨️ **Text fallback** — patients can type if microphone access is unavailable
- 🃏 **Quick Action cards** — one-tap shortcuts for common intents (Book Appointment, Repeat Prescription, Check Appointment, Practice Hours, Emergency)
- 📋 **Live "Your Request" panel** — dynamically shows the current request state (idle → collecting → submitted) with copyable reference numbers (`#APT-XXXX` and `#RX-XXXX`)
- 📋 **One-Click Reference Number Copy** — interactive clipboard button on request cards for both appointments and prescriptions with instant visual confirmation
- 🔍 **Real-Time Request & Prescription Tracking** — lookup status modal supporting both appointments (`#APT`) and prescriptions (`#RX`), showing GP signature status and preferred pharmacy collection advice
- 🧭 **Compact Floating Navigation** — modern centered glassmorphic pill (`PatientNav`) with live operational status and fast portal toggle
- 🎨 **Glassmorphic, premium UI** — dark-mode-compatible, fully responsive design

### Admin-Facing

- 📊 **Real-time KPI dashboard** — Total Calls, AI-Handled, Escalated, Appointments, Prescriptions, Admin Enquiries
- 🔔 **Interactive Notification Center** — top navigation bell with live unread badge, categorized tabs (All, Bookings, Prescriptions, Escalations), status badges, relative timestamps, and one-click navigation to queues
- ⏱️ **Live Call Duration Tracking** — automatic timing (`m:ss`) from WebSocket connect to disconnect, persisted in database and displayed in table and average duration KPIs
- 📐 **Adaptive Full-Height Calls Table** — dynamic `fullHeight` layout on `/admin/calls` expanding to fill 100% vertical viewport with sticky headers and dedicated internal scrollbar (13+ visible rows, zero leftover space)
- 💎 **Illuminated Vector Navigation** — elevated sidebar with category-tinted luminous badges and distraction-free medical administration interface
- 📈 **Call Volume chart** — 7-day bar chart of AI-handled vs. escalated calls (Recharts)
- 🍩 **Request Types distribution** — donut chart breakdown of appointment/prescription/admin/escalation proportions
- 🕘 **Recent Activity feed** — live-updating timeline of the latest 10 calls
- 🟢 **Operation Status panel** — health indicators for Voice Pipeline, Clinical Scribe, Database, and Knowledge Base
- 📞 **Calls table** — searchable, filterable, tab-navigable call log with drill-down to full transcript, duration, and extracted clinical triage data
- 📅 **Dedicated pages** — Appointments, Prescriptions, Enquiries, Escalations, Knowledge Base, and Settings sub-pages

---

## 3. Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 16.3.5 | React framework with App Router, server/client components |
| **React** | 19.2.8 | UI component library |
| **TypeScript** | ^5 | Type-safe development |
| **Tailwind CSS** | ^4 | Utility-first styling |
| **Recharts** | ^3.10.1 | Data visualization (bar charts, donut charts) |
| **Lucide React** | ^1.46.0 | SVG icon library |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| **Python** | 3.10+ | Runtime |
| **FastAPI** | 0.115.0 | Async REST API + WebSocket server |
| **Uvicorn** | 0.30.0 | ASGI server |
| **Pydantic** | 2.13.5 | Data validation & serialization |
| **pydantic-settings** | 2.14.0 | Environment configuration |
| **google-generativeai** | 0.7.2 | Gemini API SDK (embeddings, extraction) |
| **websockets** | 15.0.1 | WebSocket client for upstream Gemini Live relay |
| **supabase-py** | 2.31.0 | Supabase Python client |

### Database

| Technology | Purpose |
|---|---|
| **Supabase** (Hosted PostgreSQL) | Primary database, auth infrastructure, Row-Level Security |
| **pgvector** extension | 768-dimensional vector similarity search for RAG |
| **uuid-ossp** extension | UUID primary key generation |

### AI / ML

| Model | Role |
|---|---|
| **Gemini 2.5 Flash Native Audio** (`gemini-2.5-flash-native-audio-latest`) | Real-time bidirectional voice conversation with function calling |
| **Gemini 3.5 Flash-Lite** (`gemini-3.5-flash-lite`)<br/>*Fallback:* **Gemini 3.1 Flash-Lite** (`gemini-3.1-flash-lite`) | Post-call transcript extraction, structured summarization, and automatic rate-limit failover |
| **Gemini Embedding 001** (`gemini-embedding-001`) | 768-dim text embeddings for knowledge base RAG |

---

## 4. System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         PATIENT BROWSER                              │
│                                                                      │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │  Microphone      │  │  ChatWindow      │  │  YourRequestPanel  │  │
│  │  (16kHz PCM)     │  │  (transcript)    │  │  (live status)     │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬───────────┘  │
│           │                     │                     │              │
│  ┌────────▼─────────────────────▼─────────────────────▼──────────┐  │
│  │              GeminiLiveProvider (WebSocket Client)              │  │
│  │   • Captures mic audio → base64 PCM → ws://localhost:8000     │  │
│  │   • Receives audio/transcript/tool_call/tool_result from WS    │  │
│  │   • Plays 24kHz PCM audio via Web Audio API                    │  │
│  └────────────────────────────────┬───────────────────────────────┘  │
└───────────────────────────────────┼──────────────────────────────────┘
                                    │ WebSocket
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    FASTAPI BACKEND (Python)                           │
│                    Port 8000                                         │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │          WebSocket Relay  (/api/live/ws)                     │    │
│  │                                                             │    │
│  │  Browser ◄──►  FastAPI  ◄──►  Gemini Live API (wss://)      │    │
│  │                    │                                        │    │
│  │          ┌─────────▼──────────┐                             │    │
│  │          │  Function Calling   │                             │    │
│  │          │  ┌───────────────┐  │                             │    │
│  │          │  │book_appointment│  │                             │    │
│  │          │  │get_my_appt    │  │                             │    │
│  │          │  │request_rx     │  │                             │    │
│  │          │  │admin_enquiry  │  │                             │    │
│  │          │  │escalate       │  │                             │    │
│  │          │  │practice_info  │  │                             │    │
│  │          │  └───────┬───────┘  │                             │    │
│  │          └──────────┼──────────┘                             │    │
│  └─────────────────────┼───────────────────────────────────────┘    │
│                        │                                            │
│  ┌─────────────────────▼───────────────────────────────────────┐    │
│  │              REST API Layer                                  │    │
│  │  /api/health           │  /api/calls          │  /api/kpis  │    │
│  │  /api/appointments     │  /api/prescriptions  │  /api/rag   │    │
│  │  /api/enquiries        │  /api/escalations    │  /api/...   │    │
│  └─────────────────────────┬───────────────────────────────────┘    │
│                             │                                       │
│  ┌──────────────────────────▼──────────────────────────────────┐    │
│  │              Services Layer                                  │    │
│  │  • live_token.py    — Ephemeral session token management     │    │
│  │  • extraction.py    — Gemini Flash-Lite transcript analysis  │    │
│  │  • summary.py       — Post-call summary pipeline             │    │
│  │  • embeddings.py    — Gemini Embedding 001 generation        │    │
│  │  • rag.py           — pgvector cosine similarity search      │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
└─────────────────────────────┼──────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    SUPABASE (PostgreSQL + pgvector)                   │
│                                                                      │
│  ┌──────────────────┐  ┌───────────────────────┐                    │
│  │  practice_info   │  │  knowledge_documents  │                    │
│  │  calls           │  │  knowledge_chunks     │                    │
│  │  call_messages   │  │  (768-dim embeddings) │                    │
│  │  appointment_req │  └───────────────────────┘                    │
│  │  prescription_req│                                               │
│  │  admin_requests  │  RPC: match_knowledge_chunks()                │
│  │  escalations     │  (cosine similarity vector search)            │
│  └──────────────────┘                                               │
└──────────────────────────────────────────────────────────────────────┘
                              ▲
                              │ REST API (fetch)
┌─────────────────────────────┼──────────────────────────────────────┐
│                    ADMIN DASHBOARD                                  │
│                    /admin route (Next.js)                           │
│                                                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐            │
│  │ KPI Row  │ │ Charts   │ │ Activity │ │ Calls Tbl │            │
│  │ (6 cards)│ │ (volume, │ │ (feed)   │ │ (filter,  │            │
│  │          │ │  types)  │ │          │ │  drilldown)│            │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘            │
└────────────────────────────────────────────────────────────────────┘
```

---

## 5. End-to-End Data Flow

### A Complete Patient Call — Step by Step

```
1. Patient opens http://localhost:3000
2. Patient taps the microphone button (or types a message)
3. GeminiLiveProvider requests ephemeral token from POST /api/live/token
4. GeminiLiveProvider opens WebSocket to ws://localhost:8000/api/live/ws?token=xxx
5. FastAPI creates a new call record in Supabase (status: "Pending") and records `call_start_time = time.time()`
6. FastAPI opens an upstream WebSocket to Gemini Live API (wss://generativelanguage.googleapis.com)
7. FastAPI sends the setup handshake:
   - Model: gemini-2.5-flash-native-audio-latest
   - System instruction: Aura persona + today's date
   - Tool declarations: 6 function schemas
   - Audio config: 24kHz output, voice "Aoede"
   - Transcription: input + output enabled

8. Two concurrent coroutines run:
   a. receive_from_client: Browser mic audio (16kHz PCM) → JSON → Gemini Live
   b. receive_from_gemini: Gemini audio/transcripts/tool_calls → JSON → Browser

9. During conversation, Gemini may invoke tools:
   - Example: "book_appointment" with {patient_name, phone, date, time, reason}
   - FastAPI intercepts the toolCall, executes it against Supabase
   - Result (reference_id, status) is sent back to Gemini AND to the browser
   - Gemini uses the result to continue the conversation naturally

10. When the WebSocket closes (patient hangs up or navigates away):
    - FastAPI calculates exact duration: `duration_seconds = int(time.time() - call_start_time)` and formatted `duration = f"{m}:{s:02d}"`
    - Call row is updated immediately with the duration and status "Completed"
    - All call_messages are batch-inserted into Supabase
    - Transcript string is built and sent to Gemini 3.5 Flash-Lite for extraction
    - Extracted fields (intent, urgency, summary, requires_human_review) update the call record, safely preserving the recorded duration
    - Admin dashboard sees the completed call and updated average duration in real-time
```

### Post-Call Intelligence Pipeline

```
Raw Transcript
     │
     ▼
Gemini 3.5 Flash-Lite (extraction.py)
     │
     ▼
Structured JSON:
  {
    "intent": "appointment_request",
    "reason": "Persistent cough for 2 weeks",
    "patient_name": "Sarah Wilson",
    "urgency": "routine",
    "requires_human_review": false,
    "summary": "Patient requested routine GP appointment for persistent cough...",
    "action_taken": "Appointment request submitted under #APT-1234"
  }
     │
     ▼
Supabase calls table updated
     │
     ▼
Admin Dashboard reflects new data
```

---

## 6. Database Schema

### 9 Tables in Supabase

| Table | Purpose | Key Columns |
|---|---|---|
| `practice_information` | Single-row config for the practice | `name`, `phone`, `address`, `opening_hours` (JSONB), `services_offered` (TEXT[]) |
| `knowledge_documents` | RAG document metadata | `title`, `category`, `source` |
| `knowledge_chunks` | RAG text chunks with vector embeddings | `content`, `metadata` (JSONB), `embedding` (VECTOR(768)) |
| `calls` | Every voice/text session | `caller_name`, `intent`, `summary`, `status`, `urgency`, `extracted_data` (JSONB), `requires_human_review`, `call_number` (SERIAL) |
| `call_messages` | Transcript of each call | `call_id` (FK), `role` (user/assistant/system), `content` |
| `appointment_requests` | GP appointment requests | `reference_id` (#APT-XXXX), `patient_name`, `patient_phone`, `reason`, `preferred_date`, `preferred_time`, `urgency`, `status` |
| `prescription_requests` | Repeat prescription requests | `reference_id` (#RX-XXXX), `medication`, `dosage`, `pharmacy_preference`, `status` |
| `admin_requests` | Practice enquiries | `reference_id` (#ADM-XXXX), `category`, `query`, `response_summary`, `status` |
| `escalations` | Clinical escalations | `reference_id` (#ESC-XXX), `reason`, `priority`, `transferred_to`, `status` |

### pgvector RPC Function

```sql
match_knowledge_chunks(query_embedding VECTOR(768), match_threshold FLOAT, match_count INT)
```

Returns the top-N most similar knowledge chunks via cosine similarity, powering the RAG pipeline.

### Entity Relationships

```
calls ──< call_messages       (1:many — each call has N transcript lines)
calls ──< appointment_requests (1:many — a call may create an appointment)
calls ──< prescription_requests
calls ──< admin_requests
calls ──< escalations
knowledge_documents ──< knowledge_chunks (1:many — each document has N chunks)
```

---

## 7. API Reference

### Health & Status

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Backend health check with Supabase connectivity test |

### Voice Session

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/live/token` | Generate ephemeral session token (10-min TTL) |
| `WS` | `/api/live/ws?token=xxx` | Bidirectional WebSocket for real-time voice relay |

### Calls

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/calls` | List calls (filterable by `tab`, `status`, `limit`) |
| `GET` | `/api/calls/{id}` | Get call detail with transcript, linked requests, and extracted data |
| `POST` | `/api/calls` | Create a call record |
| `POST` | `/api/calls/{id}/summary` | Trigger post-call extraction |

### Dashboard Metrics

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/dashboard/kpis` | 6 KPI cards (total calls, AI handled, escalated, appointments, prescriptions, admin) |
| `GET` | `/api/dashboard/call-volume` | 7-day call volume data (AI handled vs escalated per day) |
| `GET` | `/api/dashboard/request-types` | Distribution of request types (appointments, prescriptions, admin, escalations) |
| `GET` | `/api/dashboard/recent-activity` | Latest 10 activities with relative timestamps |
| `GET` | `/api/dashboard/operation-status` | System health indicators (voice pipeline, scribe, database, knowledge base) |

### Resource Collections

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/appointments` | List all appointment requests |
| `POST` | `/api/appointments` | Create appointment request |
| `PATCH` | `/api/appointments/{id}` | Update appointment status (pending_review, confirmed, cancelled) |
| `GET` | `/api/prescriptions` | List all prescription requests |
| `POST` | `/api/prescriptions` | Create prescription request |
| `GET` | `/api/enquiries` | List all admin enquiries |
| `POST` | `/api/enquiries` | Create admin enquiry |
| `GET` | `/api/escalations` | List all escalations |
| `POST` | `/api/escalations` | Create escalation |

### Practice & Knowledge

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/practice-info` | Get practice details (name, phone, hours, services) |
| `PATCH` | `/api/practice-info` | Update editable practice fields |
| `GET` | `/api/knowledge` | List all knowledge documents with their chunks |
| `POST` | `/api/knowledge/query` | Semantic search over knowledge base (pgvector RAG) |

### Tool Execution

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/tools/{tool_name}` | Direct tool execution (public allowlist only) |

---

## 8. AI Models & Their Roles

### Model 1: Gemini 2.5 Flash Native Audio (`models/gemini-2.5-flash-native-audio-latest`)

- **Role**: Real-time voice conversation engine
- **Capabilities**: Bidirectional audio streaming, speech-to-text transcription, text-to-speech synthesis, structured function calling
- **Audio Config**: 24kHz PCM output, voice preset "Aoede" (warm, natural British/international female voice)
- **System Instruction**: Custom Aura persona — empathetic NHS medical receptionist with clinical safety protocols
- **Why This Model**: Native audio support means the model can directly process raw microphone audio and produce spoken responses, enabling natural real-time conversation with sub-second latency. It also supports function calling during audio sessions.

### Model 2: Gemini 3.5 Flash-Lite (`models/gemini-3.5-flash-lite`) & Gemini 3.1 Flash-Lite (`models/gemini-3.1-flash-lite`)

- **Role**: Post-call clinical scribe & structured entity extraction with automatic multi-model failover
- **Primary Model**: `models/gemini-3.5-flash-lite`
- **Failover Model**: `models/gemini-3.1-flash-lite` (automatically engaged if primary hits RPM limits or errors)
- **Capabilities**: Transcript analysis, structured JSON extraction, clinical entity recognition
- **Temperature**: 0.1 (high precision, low creativity)
- **Output Format**: `application/json` (guaranteed valid JSON response)
- **What It Extracts**: Intent classification, patient name, mobile number, symptom reason, duration, preferred date/time, urgency level, clinical safety flags, professional summary, action taken
- **Why Multi-Model**: By combining Gemini 3.5 Flash-Lite with an automatic failover to Gemini 3.1 Flash-Lite, the post-call scribe effectively doubles the available RPM quota (from 15 to 30 RPM) and prevents rate-limit drops during high-volume call surges.

### Model 3: Gemini Embedding 001 (`models/gemini-embedding-001`)

- **Role**: Knowledge base embedding generation
- **Capabilities**: 768-dimensional text embeddings for semantic similarity search
- **Used By**: `seed_knowledge.py` (offline) and `rag.py` (runtime query embedding)
- **Why This Model**: Purpose-built for retrieval-augmented generation; produces dense vectors that work well with pgvector's cosine similarity indexing.

---

## 9. Voice Pipeline Deep-Dive

### Audio Capture (Browser → Backend)

```
1. getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } })
2. AudioContext created at hardware-native sample rate (typically 48kHz)
3. ScriptProcessorNode (bufferSize: 4096) captures raw Float32 samples
4. GeminiLiveProvider.downsampleTo16kPCM() linearly resamples from native rate to 16kHz
5. Float32 → Int16 conversion (PCM)
6. Base64-encoded and sent over WebSocket as { type: "audio", data: "...", mimeType: "audio/pcm;rate=16000" }
```

### Audio Relay (Backend)

```
1. FastAPI WebSocket receives PCM audio frame from browser
2. Wraps in Gemini Live "realtimeInput" format: { realtimeInput: { audio: { mimeType, data } } }
3. Sends to upstream Gemini Live WebSocket (wss://generativelanguage.googleapis.com)
4. Gemini processes audio, returns:
   - serverContent.modelTurn.parts[].inlineData (24kHz PCM audio response)
   - serverContent.inputTranscription (what the patient said)
   - serverContent.outputTranscription (what Aura said)
   - toolCall.functionCalls[] (structured function invocations)
```

### Audio Playback (Backend → Browser)

```
1. 24kHz PCM audio (base64) received from Gemini via FastAPI relay
2. Sent to browser as { type: "audio", data: "...", mimeType: "audio/pcm;rate=24000" }
3. GeminiLiveProvider.playAudioChunk():
   - Base64 → Uint8Array → Int16Array → Float32Array
   - AudioBuffer created at 24000 Hz sample rate
   - Scheduled playback via AudioBufferSourceNode with gapless timing
   - State transitions: listening → speaking → listening (on audio end)
```

### Text Fallback

When microphone is unavailable (insecure context, permission denied, no hardware):
```
1. Patient types in TextInput component
2. GeminiLiveProvider.sendText() sends { type: "text", text: "..." } over WebSocket
3. FastAPI wraps as clientContent: { turns: [{ role: "user", parts: [{ text }] }], turnComplete: true }
4. Gemini responds with audio (spoken response) + text transcript
```

---

## 10. Function Calling (Tools)

Aura declares 6 tools to Gemini Live. When the AI decides to invoke a tool during conversation, it sends a structured `toolCall`. FastAPI intercepts this, executes the tool against Supabase, and returns the result back to Gemini (so the AI can continue the conversation with the outcome).

### Tool Registry

| Tool Name | Description | Key Parameters | Database Table |
|---|---|---|---|
| `book_appointment` | Submit GP appointment request | `patient_name`, `patient_phone`, `preferred_date`, `preferred_time`, `reason`, `urgency` | `appointment_requests` |
| `get_my_appointment` | Look up existing appointment (requires name + phone) | `patient_name`, `patient_phone` | `appointment_requests` |
| `request_prescription` | Record repeat prescription request | `medication`, `dosage`, `pharmacy_preference`, `patient_name` | `prescription_requests` |
| `submit_admin_enquiry` | Log administrative query | `query`, `category`, `patient_name`, `response_summary` | `admin_requests` |
| `get_practice_info` | Retrieve practice hours/address/services | `topic`, `query` | `practice_information` |
| `escalate_to_staff` | Clinical red-flag escalation | `reason`, `priority`, `patient_name` | `escalations` |

### Tool Execution Flow

```
Gemini Live sends: { toolCall: { functionCalls: [{ name: "book_appointment", args: {...} }] } }
     │
     ▼
FastAPI intercepts, injects active call_id into args
     │
     ▼
execute_tool("book_appointment", args)
     │
     ▼
tools/appointments.py → Pydantic validation → Supabase INSERT → returns { reference_id, status, message }
     │
     ▼
Result sent to: (1) Browser UI (for live panel update) AND (2) Gemini Live (so AI can read back the reference number)
```

### Security: Public Tool Allowlist

The `/api/tools/{tool_name}` endpoint enforces an allowlist. Internal tools like `save_call` and `save_call_summary` are excluded so clients cannot fabricate call records.

---

## 11. RAG Knowledge Base

### Architecture

```
Knowledge Documents (5 documents)
     │
     ▼
Knowledge Chunks (10 chunks) — each with a 768-dim vector embedding
     │
     ▼
pgvector ivfflat index (cosine similarity)
     │
     ▼
match_knowledge_chunks() PostgreSQL RPC function
     │
     ▼
POST /api/knowledge/query → semantic search results
```

### Knowledge Categories

| Category | Content |
|---|---|
| **Opening Hours** | Monday-Friday 08:00-18:30, Saturday 09:00-13:00, Closed Sundays, Out-of-hours: NHS 111 |
| **Contact Details** | Address (124 St Mary's Road, London, SE1 5TY), Phone (020 7946 0123), Email |
| **Appointment Policy** | 2-week advance booking, morning/afternoon clinics, same-day urgent slots, clinical triage process |
| **Prescription Policy** | 48-hour turnaround, EPS electronic transmission, annual medication review requirement |
| **Test Results** | Blood tests 3-5 days, imaging 7-10 days, phlebotomy Mon-Fri 08:30-11:30, fasting instructions |
| **Emergency Protocols** | Red flag symptoms (chest pain, stroke, anaphylaxis), call 121, A&E referral |

### Seeding Process

```bash
python -m backend.seed_knowledge
```

This script:
1. Clears existing `knowledge_chunks`
2. Iterates over 10 predefined chunks
3. Generates a 768-dim embedding for each via Gemini Embedding 001
4. Inserts the chunk + embedding into Supabase

---

## 12. Frontend Architecture

### Patient Interface (`/`)

A three-column layout:

| Column | Component | Purpose |
|---|---|---|
| **Left** | `QuickActionCard` × 5 + `EmergencyBanner` | One-tap intent shortcuts |
| **Center** | `ChatWindow` (containing `ChatHeader`, `ChatMessage`, `MicButton`, `TextInput`, `VoiceController`, `Waveform`) | Main voice/chat interaction |
| **Right** | `YourRequestPanel` | Live request state tracker (idle → collecting → submitted with reference ID) |

### Key Patient Components

| Component | Purpose |
|---|---|
| `PatientNav` | Top navigation bar with practice branding |
| `AuraOrb` | Animated AI identity orb |
| `MicButton` | Primary microphone toggle (connects/disconnects voice session) |
| `VoiceController` | Mute/unmute and end-call controls |
| `Waveform` | Animated audio waveform visualization |
| `ChatMessage` | Individual chat bubble (user or assistant) |
| `ChatWindow` | Scrolling chat container with auto-scroll |
| `TextInput` | Text fallback input field |
| `QuickActionCard` | Clickable intent card (sends text via voice session) |
| `YourRequestPanel` | Dynamic panel showing request lifecycle |
| `PracticeInfoCard` | Practice details card |
| `EmergencyBanner` | 121 emergency notice |

### Voice Session Hook (`useVoiceSession`)

Central React hook that manages:
- Voice state machine (idle → connecting → listening → speaking → idle)
- Transcript accumulation
- Mute/unmute controls
- Patient request state (idle → detecting → collecting → submitted / lookup)
- Provider lifecycle (GeminiLiveProvider or MockVoiceProvider)

---

## 13. Admin Dashboard

### Route Structure (`/admin/*`)

| Route | Page | Purpose |
|---|---|---|
| `/admin` | Dashboard | Main KPI + charts + activity + calls table |
| `/admin/calls` | Calls | Full call log with drill-down |
| `/admin/appointments` | Appointments | Appointment request management |
| `/admin/prescriptions` | Prescriptions | Prescription request tracking |
| `/admin/enquiries` | Enquiries | Admin enquiry log |
| `/admin/escalations` | Escalations | Clinical escalation review |
| `/admin/analytics` | Analytics | (Placeholder for expanded analytics) |
| `/admin/knowledge` | Knowledge Base | RAG document viewer |
| `/admin/settings` | Settings | Practice settings editor |

### Dashboard Layout

```
┌────────────────────────────────────────────────────────┐
│ Sidebar (260px)  │  TopBar                              │
│  • Dashboard     │  ┌──────────────────────────────────┐│
│  • Calls         │  │ GreetingBar + Live Clock          ││
│  • Appointments  │  ├──────────────────────────────────┤│
│  • Prescriptions │  │ KPI Row (6 cards)                 ││
│  • Enquiries     │  ├──────────────────────────────────┤│
│  • Escalations   │  │ Charts Row:                       ││
│  • Analytics     │  │  CallVolume | RequestTypes | Feed ││
│  • Knowledge     │  ├──────────────────────────────────┤│
│  • Settings      │  │ CallsTable (scrollable, filtered) ││
│                  │  └──────────────────────────────────┘│
└────────────────────────────────────────────────────────┘
```

### Admin Components

| Component | Purpose |
|---|---|
| `Sidebar` | High-contrast dark navigation with illuminated Lucide category icon badges |
| `SidebarNavItem` | Individual nav link with category-specific color glows and active indicator |
| `TopBar` | Portal identity, search, quick Patient App link, and interactive Notification Center |
| `NotificationDropdown` | Real-time notification drawer for appointments, repeat prescriptions, and escalations with unread count badge, category tabs, and direct navigation |
| `GreetingBar` | Dynamic time-of-day greeting + live clock |
| `KpiRow` / `KpiCard` | 6 metric cards with icons, values, trend labels |
| `CallVolumeChart` | 7-day stacked bar chart (Recharts) |
| `RequestTypesChart` | Donut chart with legend |
| `RecentActivity` | Feed of latest 10 call events |
| `OperationStatus` | 4 system health indicators |
| `CallsTable` / `CallsTableRow` | Tabbed, searchable call log with real duration display, intent tags, status pills, and adaptive `fullHeight` layout mode |
| `CallDetails` | Full transcript + extracted data + action taken + escalation state |

### Frontend Service Layer

All dashboard data comes from the FastAPI backend (no mock data). The service layer in `frontend/src/lib/services/` provides typed fetch functions:

| Service | Endpoints Used |
|---|---|
| `dashboardService.ts` | `/api/dashboard/kpis`, `/api/dashboard/call-volume`, `/api/dashboard/request-types`, `/api/dashboard/recent-activity`, `/api/dashboard/operation-status` |
| `callService.ts` | `/api/calls`, `/api/calls/{id}` |
| `appointmentService.ts` | `/api/appointments`, `PATCH /api/appointments/{id}` |
| `prescriptionService.ts` | `/api/prescriptions` |
| `enquiryService.ts` | `/api/enquiries` |
| `escalationService.ts` | `/api/escalations` |
| `practiceService.ts` | `/api/practice-info`, `PATCH /api/practice-info` |
| `knowledgeService.ts` | `/api/knowledge`, `/api/knowledge/query` |

---

## 14. Project File Structure

```
Aura-Voice-Agent/
├── backend/
│   ├── .env                          # Environment variables (API keys, Supabase credentials)
│   ├── config.py                     # Pydantic Settings with model names and CORS config
│   ├── main.py                       # FastAPI app: routes, WebSocket relay, dashboard metrics
│   ├── requirements.txt              # Python dependencies
│   ├── seed_knowledge.py             # Script to embed and seed RAG knowledge chunks
│   ├── test_rag.py                   # RAG search test script
│   ├── db/
│   │   └── supabase.py               # Singleton Supabase client
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── calls.py                  # CallCreate, CallMessageSchema, CallSummaryExtract (Pydantic)
│   │   ├── appointments.py           # AppointmentRequestCreate, AppointmentLookup
│   │   ├── prescriptions.py          # PrescriptionRequestCreate
│   │   ├── admin_requests.py         # AdminRequestCreate
│   │   ├── escalation.py             # EscalationCreate
│   │   └── knowledge.py              # KnowledgeQueryRequest
│   ├── services/
│   │   ├── __init__.py
│   │   ├── live_token.py             # Ephemeral token gen, Aura system prompt, tool declarations
│   │   ├── extraction.py             # Gemini Flash-Lite transcript extraction
│   │   ├── summary.py                # Post-call summary orchestrator
│   │   ├── embeddings.py             # Gemini Embedding 001 generation
│   │   └── rag.py                    # pgvector semantic search
│   └── tools/
│       ├── __init__.py               # TOOL_REGISTRY dispatcher + execute_tool()
│       ├── appointments.py           # create_appointment_request, get_my_appointment
│       ├── prescriptions.py          # create_prescription_request
│       ├── enquiries.py              # create_admin_request
│       ├── practice.py               # get_practice_information
│       ├── escalation.py             # escalate_to_reception
│       └── calls.py                  # save_call, save_call_summary (internal only)
│
├── frontend/
│   ├── .env.local                    # NEXT_PUBLIC_FASTAPI_URL, NEXT_PUBLIC_VOICE_PROVIDER
│   ├── package.json                  # Next.js 16, React 19, Recharts, Lucide, Tailwind
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx            # Root layout with Google Fonts (Inter)
│   │   │   ├── globals.css           # Global styles, glassmorphism, admin theme
│   │   │   ├── page.tsx              # Patient page (3-column voice interface)
│   │   │   └── admin/
│   │   │       ├── layout.tsx         # Admin shell (Sidebar + TopBar)
│   │   │       ├── page.tsx           # Dashboard (KPIs, charts, activity, calls table)
│   │   │       ├── calls/             # Calls sub-page
│   │   │       ├── appointments/      # Appointments sub-page
│   │   │       ├── prescriptions/     # Prescriptions sub-page
│   │   │       ├── enquiries/         # Enquiries sub-page
│   │   │       ├── escalations/       # Escalations sub-page
│   │   │       ├── analytics/         # Analytics sub-page
│   │   │       ├── knowledge/         # Knowledge base sub-page
│   │   │       └── settings/          # Settings sub-page
│   │   ├── components/
│   │   │   ├── patient/              # 21 patient components (including PatientNav floating pill, YourRequestPanel copy action)
│   │   │   ├── admin/                # 15 admin components (including NotificationDropdown, CallsTable fullHeight, illuminated Sidebar)
│   │   │   └── ui/                   # 4 shared UI primitives (IntentPill, StatusBadge, etc.)
│   │   ├── hooks/
│   │   │   └── useLiveClock.ts       # Real-time clock for admin dashboard
│   │   ├── lib/
│   │   │   ├── types.ts              # 246 lines of shared TypeScript interfaces
│   │   │   ├── constants.ts          # Sidebar nav items, UI configuration
│   │   │   ├── timeAgo.ts            # Relative time formatting + phone masking
│   │   │   └── services/             # 9 API service modules (fetch wrappers)
│   │   └── voice/
│   │       ├── types.ts              # VoiceProvider interface contract
│   │       ├── GeminiLiveProvider.ts  # Production Gemini Live voice provider (406 lines)
│   │       ├── MockVoiceProvider.ts   # Development mock voice provider
│   │       └── useVoiceSession.ts    # React hook managing voice state machine (329 lines)
│
├── supabase/
│   └── migrations/
│       ├── 20260918000001_create_core_schema.sql     # pgvector, practice_info, knowledge, calls, messages
│       ├── 20260918000002_create_request_tables.sql   # appointments, prescriptions, admin, escalations
│       ├── 20260918000003_seed_demo_data.sql          # Demo data for all 9 tables
│       └── 20260919000001_add_preferred_date.sql      # ALTER TABLE for preferred_date column
│
├── package.json                      # Root monorepo scripts (dev, frontend, backend)
├── detail.md                         # This file — comprehensive project documentation
└── README.md                         # Quick-start README
```

---

## 15. Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|---|---|---|
| `GEMINI_API_KEY` | Google AI API key for all Gemini models | `AQ.Ab8R...` |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role JWT (bypasses RLS) | `eyJhbG...` |
| `SUPABASE_ANON_KEY` | Supabase anon key | `eyJhbG...` |
| `ENVIRONMENT` | Runtime environment | `development` |
| `PORT` | Backend port | `8000` |
| `CORS_ORIGINS` | Allowed frontend origins | `http://localhost:3000,http://127.0.0.1:3000` |

### Frontend (`frontend/.env.local`)

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_FASTAPI_URL` | Backend URL | `http://localhost:8000` |
| `NEXT_PUBLIC_VOICE_PROVIDER` | Voice provider selection | `gemini` or `mock` |

---

## 16. Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.10+
- **Supabase** project with pgvector extension enabled
- **Google AI API Key** with access to Gemini models

### Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd Aura-Voice-Agent

# 2. Install frontend dependencies
cd frontend
npm install
cd ..

# 3. Install backend dependencies
pip install -r backend/requirements.txt
```

### Configuration

```bash
# 4. Configure backend environment
# Edit backend/.env with your credentials:
#   GEMINI_API_KEY=your_key
#   SUPABASE_URL=your_url
#   SUPABASE_SERVICE_ROLE_KEY=your_key
#   SUPABASE_ANON_KEY=your_key

# 5. Configure frontend environment
# Edit frontend/.env.local:
#   NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000
#   NEXT_PUBLIC_VOICE_PROVIDER=gemini
```

### Database Setup

```bash
# 6. Run Supabase migrations (via Supabase Dashboard SQL Editor or CLI)
# Execute in order:
#   supabase/migrations/20260918000001_create_core_schema.sql
#   supabase/migrations/20260918000002_create_request_tables.sql
#   supabase/migrations/20260918000003_seed_demo_data.sql
#   supabase/migrations/20260919000001_add_preferred_date.sql

# 7. Seed RAG knowledge base with embeddings
python -m backend.seed_knowledge
```

### Running the Application

**Open two terminals:**

```bash
# Terminal 1 — Backend (FastAPI on port 8000)
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — Frontend (Next.js on port 3000)
cd frontend
npm run dev
```

**Or use the root convenience scripts:**

```bash
# Terminal 1
npm run backend

# Terminal 2
npm run dev
```

### Access

| URL | View |
|---|---|
| `http://localhost:3000` | Patient Voice Interface |
| `http://localhost:3000/admin` | Admin Dashboard |
| `http://localhost:8000/api/health` | Backend Health Check |
| `http://localhost:8000/docs` | FastAPI Interactive API Docs (Swagger) |

---

## 17. Clinical Safety & Escalation Protocol

Aura implements a multi-layer safety system:

### Layer 1: System Instruction (Gemini Live)

The AI is instructed to immediately respond to red-flag symptoms:
- Severe chest pain
- Difficulty breathing / shortness of breath
- Sudden facial/arm weakness or slurred speech (FAST stroke signs)
- Severe bleeding
- Collapse / unconsciousness
- Anaphylaxis (throat tightness, swollen lips/tongue)

**Response**: *"Please dial 121 immediately or attend A&E for life-threatening symptoms."*

### Layer 2: Automatic Escalation Tool

After advising 121, the AI calls `escalate_to_staff` which:
1. Creates an escalation record with Urgent priority
2. Updates the associated call status to "Escalated"
3. Sets `requires_human_review = true`
4. Logs the reason for audit trail
5. Checks for life-threatening keywords and appends 121 guidance

### Layer 3: Post-Call Extraction

Gemini 3.5 Flash-Lite's extraction prompt includes:
> *"If the patient mentions chest pain, severe shortness of breath, sudden weakness/speech problems, or anaphylaxis, mark urgency as 'emergency' or 'urgent', and requires_human_review as true."*

### Layer 4: Admin Dashboard Visibility

- Escalated calls appear prominently with amber/red indicators
- KPI card tracks escalation count and percentage
- Recent Activity feed highlights escalations
- Calls Table filters for escalations tab

---

## 18. Security Considerations

| Area | Implementation |
|---|---|
| **API Key Protection** | Gemini API key is server-side only; an ephemeral session token (10-min TTL) is issued to the browser |
| **Patient Data Privacy** | Phone numbers are masked in logs (`•••••••23`); appointment lookups require both name + mobile |
| **Tool Execution** | Public tool allowlist prevents clients from calling internal tools (save_call, save_call_summary) |
| **CORS** | Explicit origin allowlist (not wildcard) with credentials support |
| **Input Validation** | All tool inputs pass through Pydantic models before database insertion |
| **Server-Owned Fields** | Reference IDs, statuses, timestamps are generated server-side — never client-provided |
| **Appointment Status Transitions** | PATCH endpoint validates against an allowlist of statuses (pending_review, confirmed, cancelled) |
| **Practice Info Updates** | Only whitelisted fields (name, tagline, phone, etc.) can be updated via PATCH |
| **RLS (Row Level Security)** | Enabled on all 9 Supabase tables (`rowsecurity = true`); `service_role` has explicit full CRUD access policies for the FastAPI backend; public read policies protect practice info and knowledge chunks while locking down patient records from direct anon access |
| **WebSocket Gate** | The Live relay validates the ephemeral session token *before* accepting the socket; missing/invalid/expired tokens are closed with code `1008` and never upgraded |
| **Rate Limiting & Anti-Abuse** | In-memory per-IP sliding-window log limiting protects Gemini Live quotas and sensitive endpoints with zero external dependencies |

### In-Memory Rate Limiting & Concurrency Architecture

To protect Google Gemini Live API quotas from billing exhaustion and guard patient lookup endpoints from brute-force enumeration, Aura enforces strict in-memory rate limiting and concurrency controls:

| Surface | Enforced Limit | Rejection Mechanism | Purpose |
|---|---|---|---|
| `POST /api/live/token` | 5 req / 60s per IP (strict) | HTTP 429 + `Retry-After` | Guards billable Gemini Live session generation |
| `POST /api/guest/lookup` | 10 req / 60s per IP | HTTP 429 + `Retry-After` | Prevents reference code / phone enumeration |
| General REST (`/api/calls`, `/api/appointments`, `/api/prescriptions`, `/api/dashboard/*`) | 60 req / 60s per IP (shared) | HTTP 429 + `Retry-After` | Prevents API hammering and dashboard scraping |
| `WS /api/live/ws` | Max 2 concurrent sessions / IP | WebSocket `close(1008)` before accept | Limits parallel streaming audio sessions |

- **Algorithm**: Implemented using a monotonic sliding-window log (`collections.deque` and `time.monotonic()`) inside `backend/services/rate_limiter.py`. Eliminates fixed-window boundary burst loopholes.
- **RFC Compliance**: When a rate limit is exceeded, FastAPI returns an HTTP 429 response with a calculated `Retry-After` header indicating exact seconds until the oldest request ages out.
- **Concurrency Lifecycle**: WebSocket concurrency slots are acquired *before* `websocket.accept()`, and the entire session lifecycle is guarded by a `try: ... finally:` block ensuring that `release_ws_slot(client_ip)` runs on disconnect, abort, or failure.
- **Memory Hygiene**: Background sweeps run every 60 seconds to prune timestamps older than 10 minutes and delete empty IP records, preventing unbounded memory growth.

### Detailed Security Documentation

Each control above is documented in depth under [`docs/security/`](docs/security/) — one file per control, covering the problem, the code that implements it, failure modes to avoid, and how to preserve it:
- [`doc-rate-limiting-and-abuse.md`](docs/security/doc-rate-limiting-and-abuse.md): Sliding-window rate limiter, WebSocket concurrency caps, and abuse mitigation.
- [`doc-websocket-security.md`](docs/security/doc-websocket-security.md): Pre-accept token validation, concurrency gates, and backend-mediated tool execution.
- [`doc-server-mediated-tool-execution.md`](docs/security/doc-server-mediated-tool-execution.md): Pydantic validation, server-owned fields, and tool dispatch.
- [`doc-environment-and-secrets.md`](docs/security/doc-environment-and-secrets.md): Secrets management, `.env.example` templates, CORS, and dependency posture.
- [`doc-backend-held-credentials.md`](docs/security/doc-backend-held-credentials.md): Gemini and Supabase service credentials protection.
- [`doc-clinical-safety-boundaries.md`](docs/security/doc-clinical-safety-boundaries.md): Clinical guardrails, red-flag detection, and 121 escalation.

- **End-user patient authentication (Supabase Auth)**: The public patient reception voice experience runs in guest mode without mandatory account creation.
- **Admin Dashboard Authentication**: Gated at the middleware layer (`proxy.ts`). Requires credentials `admin2869` / `Admin@2869`, with signed 24h HMAC session cookies (`aura_admin_session`) and sign-out controls.
- **Distributed Limiter for Multi-Instance Deployments**: The current rate limiter is process-local (ideal for single-node / local deployments). When scaling to a multi-instance container fleet, the storage backend should be moved to a shared Redis instance.

Treat `implementation_plan.md` as a historical design record, not a description of shipped behavior.

---

> **Aura** — Transforming medical reception with real-time AI voice, structured function calling, and intelligent clinical triage. Built with Gemini Live, FastAPI, Supabase, and Next.js.
