# 🎙️ AURA — AI Voice Receptionist for Medical Practices

[![Next.js](https://img.shields.io/badge/Next.js-16.3.5-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.8-blue?style=flat&logo=react)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.0-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat&logo=python)](https://python.org/)
[![Gemini Live](https://img.shields.io/badge/Google%20Gemini-Live%20Audio%20%2B%203.5%20Flash--Lite-8E75B2?style=flat&logo=google)](https://ai.google.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%2B%20pgvector-3ECF8E?style=flat&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)

> **Aura** is a full-stack, real-time AI voice receptionist that modernizes the front desk of General Practitioner (GP) medical surgeries and healthcare clinics. Patients converse naturally with an empathetic, clinically guided AI agent powered by **Google Gemini Live Native Audio**. Aura captures structured clinical-administrative requests, executes server-side database actions against **Supabase**, and streams live updates to an **Admin Dashboard** and **Patient Portal** — eliminating phone queues and 08:00 morning hold times.

---

## 📑 Table of Contents

- [Overview & Problem Solved](#-overview--problem-solved)
- [System Architecture](#-system-architecture)
- [End-to-End Voice & Data Workflow](#-end-to-end-voice--data-workflow)
- [Tech Stack](#-tech-stack)
- [AI Intelligence Pipeline](#-ai-intelligence-pipeline)
- [Core Features](#-core-features)
  - [Patient Experience](#patient-experience)
  - [Admin & Practice Management](#admin--practice-management)
- [Database Schema & Security](#-database-schema--security)
- [API & WebSocket Reference](#-api--websocket-reference)
- [Project Directory Structure](#-project-directory-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation & Setup](#installation--setup)
  - [Running the Application](#running-the-application)
- [Clinical Safety Protocols](#-clinical-safety-protocols)

---

## 🏥 Overview & Problem Solved

### The Healthcare Reception Challenge
- **08:00 AM Phone Deluges**: Traditional GP surgeries experience massive call volume spikes when phone lines open, forcing patients to wait 30–60 minutes on hold.
- **Administrative Overload**: Over 75% of calls are repetitive inquiries: booking appointments, requesting repeat medication prescriptions, checking blood test results, or asking for practice opening hours.
- **Staff Burnout**: Front-desk teams are overwhelmed by administrative triaging instead of providing dedicated care to vulnerable patients.

### How Aura Solves It
1. **Zero Wait Times**: Bidirectional, sub-second real-time voice conversations powered by **Gemini 2.5 Flash Native Audio**.
2. **Server-Mediated Tool Execution**: Structured function calls directly record appointments, repeat prescriptions, and admin queries into the surgery database.
3. **Automated Clinical Scribe**: Post-call transcription and extraction powered by **Gemini 3.5 Flash-Lite** creates structured summaries, extracts entities, and flags urgencies.
4. **Clinical Safety by Design**: Immediate red-flag detection (chest pain, stroke signs, anaphylaxis) triggers emergency advice (999/A&E) and alerts duty clinicians.

---

## 🏛️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PATIENT WEB BROWSER                             │
│                                                                        │
│   ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐   │
│   │ Microphone       │  │ Audio Output     │  │ Your Request Panel │   │
│   │ (16kHz PCM Base64│  │ (24kHz WebAudio) │  │ (Live Cards & Ref) │   │
│   └────────┬─────────┘  └────────▲─────────┘  └────────▲───────────┘   │
│            │                     │                     │               │
│   ┌────────▼─────────────────────┴─────────────────────┴───────────┐   │
│   │          GeminiLiveProvider & useVoiceSession Hook             │   │
│   │  • Voice state machine (idle → listening → thinking → speaking) │   │
│   │  • WebSocket bidirectional streaming & audio chunk playback     │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
└───────────────────────────────────┼────────────────────────────────────┘
                                    │ WebSocket (/api/live/ws?token=xxx)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      FASTAPI BACKEND (Python 3.10+)                    │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                     WebSocket Relay Server                     │   │
│   │   Browser ◄──────────► FastAPI Relay ◄──────────► Gemini Live  │   │
│   │                             │                     (Google AI)  │   │
│   │                  Tool Call Interception                        │   │
│   └─────────────────────────────┬──────────────────────────────────┘   │
│                                 │                                      │
│   ┌─────────────────────────────┼──────────────────────────────────┐   │
│   │ Function Calling Dispatcher │ Post-Call Clinical Scribe        │   │
│   │ • book_appointment         │ • Gemini 3.5 Flash-Lite          │   │
│   │ • request_prescription     │ • Entity & intent extraction     │   │
│   │ • get_my_appointment       │ • Call duration calculation      │   │
│   │ • get_practice_info (RAG)   │ • Structured audit logging       │   │
│   │ • escalate_to_staff         │                                  │   │
│   └─────────────────────────────┴──────────────────────────────────┘   │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │
                   Postgres CRUD & pgvector Search
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    SUPABASE (PostgreSQL + RLS)                         │
│                                                                        │
│  ┌───────────────────────┐ ┌───────────────────────┐ ┌──────────────┐  │
│  │ calls & call_messages │ │ appointment_requests  │ │ escalations  │  │
│  ├───────────────────────┤ ├───────────────────────┤ ├──────────────┤  │
│  │ prescription_requests │ │ admin_requests        │ │ patients     │  │
│  ├───────────────────────┤ ├───────────────────────┤ ├──────────────┤  │
│  │ knowledge_documents   │ │ knowledge_chunks(RAG) │ │ practice_info│  │
│  └───────────────────────┘ └───────────────────────┘ └──────────────┘  │
└─────────────────────────────────▲──────────────────────────────────────┘
                                  │
                 REST API (Next.js Client Services)
                                  │
┌─────────────────────────────────┴──────────────────────────────────────┐
│                    ADMIN DASHBOARD & PATIENT PORTAL                    │
│                    Next.js 16 (App Router + Turbopack)                 │
│                                                                        │
│  ┌────────────────────┐ ┌────────────────────┐ ┌───────────────────┐   │
│  │ KPI & Trends Row   │ │ Interactive Calls  │ │ Notification Hub  │   │
│  │ (AI Rate, Volume)  │ │ Table (fullHeight) │ │ (Bookings, RXs)   │   │
│  ├────────────────────┤ ├────────────────────┤ ├───────────────────┤   │
│  │ Dedicated Queues   │ │ Knowledge Base     │ │ Live Scribe View  │   │
│  │ (Appts, Rx, Esc)   │ │ (RAG Document Hub) │ │ (Full Transcript) │   │
│  └────────────────────┘ └────────────────────┘ └───────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 End-to-End Voice & Data Workflow

1. **Session Handshake**:
   - The browser calls `POST /api/live/token` to retrieve an ephemeral, short-lived session token (10-minute TTL).
   - `GeminiLiveProvider` opens a WebSocket connection to `ws://localhost:8000/api/live/ws?token=xxx`.
   - FastAPI pre-creates a `calls` entry in Supabase (status: `Pending`) and timestamps the call start (`call_start_time = time.time()`).

2. **Upstream Gemini Live Connection**:
   - FastAPI establishes an upstream WebSocket connection with Google's Gemini Live endpoint (`gemini-2.5-flash-native-audio-latest`).
   - Setup configuration sends the Aura clinical persona, current system date, voice choice (`Aoede`), and tool declarations.

3. **Bidirectional Audio & Turn Detection**:
   - Patient speaks: Audio is sampled at 16kHz PCM, chunked into base64 payloads, and sent over the WebSocket.
   - Aura responds: Upstream Gemini Live streams 24kHz audio chunks. The browser Web Audio API handles gapless scheduling and playback while updating real-time conversational state (`listening` ⇄ `speaking`).

4. **In-Flight Tool Execution**:
   - When the patient requests an action (e.g., booking or prescription), Gemini Live issues a structured `toolCall`.
   - The FastAPI backend intercepts the call, executes validation and Supabase queries using service credentials, and injects the result back into the Gemini Live turn context and browser interface.
   - The on-screen **Your Request** panel displays the generated reference badge (e.g. `#APT-2559` or `#RX-9841`) with a one-click clipboard copy button.

5. **Disconnection & Clinical Scribe Processing**:
   - On disconnect, FastAPI calculates exact call duration (`duration_seconds` and `duration` display as `m:ss`) and marks the call status as `Completed`.
   - Call transcript entries are batch-saved into `call_messages`.
   - The transcript is processed by **Gemini 3.5 Flash-Lite** to extract chief complaints, urgency, clinical entities, and a formal clinical summary.
   - The admin dashboard updates immediately via live state re-fetching.

---

## 💻 Tech Stack

### Frontend
| Component | Technology | Role |
|---|---|---|
| **Framework** | **Next.js 16.3.5** | App Router, React Server Components, Turbopack, and Node-based proxy |
| **Core UI** | **React 19.2.8** | Component architecture and state management |
| **Type Safety** | **TypeScript 5** | Strict types across models, services, and voice events |
| **Styling** | **Tailwind CSS v4** | Modern theme styling, glassmorphism, and responsive design |
| **Visualization** | **Recharts 3.10.1** | Real-time call volume bar charts and request distribution donut charts |
| **Icons** | **Lucide React 1.46.0** | Illuminated category badges and iconography |

### Backend
| Component | Technology | Role |
|---|---|---|
| **Runtime** | **Python 3.10+** | Asynchronous service execution |
| **Web Framework** | **FastAPI 0.115.0** | REST API endpoints, WebSocket relay, and dependency injection |
| **Server** | **Uvicorn 0.30.0** | High-performance ASGI server |
| **Validation** | **Pydantic 2.13.5** | Data schemas, phone normalization, and payload sanitization |
| **Client** | **supabase-py 2.31.0** | PostgreSQL interface with backend-mediated service role client |
| **WebSockets** | **websockets 15.0.1** | Upstream bidirectional connection to Google Gemini Live API |

### AI Models
| Model | Role |
|---|---|
| **Gemini 2.5 Flash Native Audio** | Sub-second bidirectional voice dialogue, turn-taking, and tool calling |
| **Gemini 3.5 Flash-Lite** | Fast post-call clinical summarization, entity extraction, and triage categorization |
| **Gemini Embedding 001** | 768-dimensional text embeddings for RAG-based knowledge retrieval |

---

## 🧠 AI Intelligence Pipeline

### 1. Function Calling (Tools)
Aura provides Gemini Live with 6 structured tools:

| Tool Name | Purpose | Key Parameters |
|---|---|---|
| `book_appointment` | Submits GP consultation request for clinical triage | `patient_name`, `patient_phone`, `preferred_date`, `preferred_time`, `reason`, `urgency` |
| `get_my_appointment` | Securely looks up an existing request (requires phone verification) | `reference_id`, `patient_phone`, `patient_name` |
| `request_prescription` | Logs repeat medication requests for GP signature | `patient_name`, `patient_phone`, `medication`, `dosage`, `pharmacy_preference` |
| `submit_admin_enquiry` | Logs non-clinical administrative questions | `patient_name`, `patient_phone`, `category`, `query` |
| `get_practice_info` | Retrieves verified surgery hours, policies, turnaround times | `query` (utilizes pgvector semantic search) |
| `escalate_to_staff` | Flags acute red-flag cases for immediate human clinician review | `patient_name`, `patient_phone`, `reason`, `priority` |

### 2. Retrieval-Augmented Generation (RAG)
- Surgery reference documentation (opening hours, phlebotomy clinics, travel vaccine procedures, blood test turnaround) is chunked and embedded using **Gemini Embedding 001**.
- Chunks are stored in Supabase with `pgvector`.
- Semantic search executes cosine similarity queries (`match_knowledge_chunks` RPC) with similarity thresholding to ground the agent's responses.

---

## ✨ Core Features

### Patient Experience
- **Fluid Voice Dialogue**: Low-latency bidirectional conversational speech with natural interruption support.
- **Dynamic Request Card**: Live status card transforms across stages (`idle` → `collecting` → `submitted` → `lookup`).
- **One-Click Reference Copy**: Instant clipboard copying with visual confirmation for generated reference codes (`#APT-XXXX` or `#RX-XXXX`).
- **Prescription & Pharmacy Tracking**: Immediate feedback confirming that repeat prescriptions are sent for GP signature and will be routed to the patient's nominated pharmacy for collection.
- **Track Request Modal**: Dual-identifier lookup (reference ID + mobile number) ensuring privacy while providing live status updates.
- **Text Mode Fallback**: Full keyboard input support for accessibility and environments without microphone access.

### Admin & Practice Management
- **Interactive Notification Center**:
  - Top navigation bell with live unread badge counter.
  - Categorized drawer with tabs: `All`, `Bookings`, `Prescriptions`, and `Escalations`.
  - Direct one-click navigation into respective queue records.
- **Adaptive Full-Height Calls Table**:
  - Seamless full-viewport layout on `/admin/calls` with sticky headers and dedicated internal scrollbar.
  - Displays 13+ rows simultaneously with zero empty half-screen gaps.
- **Accurate Live Call Durations**:
  - Automatically calculates and stores duration (`m:ss`) from WebSocket connection to disconnect.
  - Computes practice-wide average call duration KPI in real time.
- **Luminous Vector Sidebar**:
  - High-contrast sidebar with category-specific illuminated badges (`bg-blue-500/10 text-blue-400`, `bg-emerald-500/10 text-emerald-400`, etc.).
  - Dedicated pages for Appointments, Prescriptions, Enquiries, Escalations, Knowledge Base, Analytics, and Settings.
- **Comprehensive Call Details Drawer**:
  - Complete conversational transcript playback with timestamps.
  - Clinical entities, triage reason, intent badges, urgency tags, and post-call summary.

---

## 🛡️ Database Schema & Security

### PostgreSQL Tables (Supabase)
1. `practice_information` — Clinic profiles, contact numbers, hours, and addresses.
2. `knowledge_documents` — High-level clinic documentation metadata.
3. `knowledge_chunks` — 768-dimensional vectorized chunks with pgvector cosine distance indexing.
4. `calls` — Call logs, caller identity, durations, intent, urgency, and clinical summary.
5. `call_messages` — Chronological turn-by-turn conversational transcript.
6. `appointment_requests` — Patient booking requests with preferred dates, slots, and status.
7. `prescription_requests` — Repeat prescription requests with medication, dosage, and nominated pharmacy.
8. `admin_requests` — Administrative inquiries (test results, certificates, registrations).
9. `escalations` — Clinical red-flag emergency records requiring clinician handover.

### Security Implementation
- **Row-Level Security (RLS)**: Enabled across all 9 tables (`rowsecurity = true`).
- **Backend-Mediated Architecture**: Clients never query tables directly; all write operations are validated and executed by FastAPI via service credentials.
- **Phone Masking**: Contact numbers are masked in transcripts and logs (`•••••••23`).
- **Dual-Factor Guest Lookup**: Lookup endpoints require both reference code and matching mobile number.
- **No Client API Keys**: Gemini API keys reside strictly on the server; clients operate via short-lived ephemeral session tokens.

### Security Documentation
The security architecture is documented in depth under [`docs/security/`](docs/security/). Each file covers one control — the problem it solves, how Aura implements it in code, failure modes to avoid, and how to preserve it:

| Document | Covers |
|---|---|
| [`doc-server-mediated-tool-execution.md`](docs/security/doc-server-mediated-tool-execution.md) | Gemini requests actions; only FastAPI executes them |
| [`doc-backend-held-credentials.md`](docs/security/doc-backend-held-credentials.md) | Secrets live server-side; service-role key never reaches the browser |
| [`doc-supabase-rls-security.md`](docs/security/doc-supabase-rls-security.md) | Row Level Security as the backstop behind the backend |
| [`doc-tool-authorization-and-allowlist.md`](docs/security/doc-tool-authorization-and-allowlist.md) | Registry vs. public allowlist; server-owned fields |
| [`doc-appointment-lookup-security.md`](docs/security/doc-appointment-lookup-security.md) | Dual-factor guest lookups; no enumeration by reference id |
| [`doc-phone-masking-and-pii.md`](docs/security/doc-phone-masking-and-pii.md) | Phone masking and synthetic PII handling |
| [`doc-ephemeral-browser-sessions.md`](docs/security/doc-ephemeral-browser-sessions.md) | Short-lived session tokens for the Live socket |
| [`doc-websocket-security.md`](docs/security/doc-websocket-security.md) | Pre-accept token gate and mediated tool calls |
| [`doc-environment-and-secrets.md`](docs/security/doc-environment-and-secrets.md) | `.env` layout, `.gitignore`, CORS, dependency posture, rotation |
| [`doc-rate-limiting-and-abuse.md`](docs/security/doc-rate-limiting-and-abuse.md) | Per-IP request limits, WebSocket concurrency cap, sliding-window algorithm |
| [`doc-clinical-safety-boundaries.md`](docs/security/doc-clinical-safety-boundaries.md) | Receptionist scope; no diagnosis/triage; human escalation |

### Rate Limits (per client IP)
In-memory, dependency-free limits protect Gemini quota and blunt brute-force (see [`doc-rate-limiting-and-abuse.md`](docs/security/doc-rate-limiting-and-abuse.md)):

| Surface | Limit | On exceed |
|---|---|---|
| `POST /api/live/token` | 5 / 60s | HTTP 429 + `Retry-After` |
| `POST /api/guest/lookup` | 10 / 60s | HTTP 429 + `Retry-After` |
| General REST (`/api/calls`, `/api/appointments`, `/api/prescriptions`, `/api/dashboard/*`) | 60 / 60s (shared) | HTTP 429 + `Retry-After` |
| `WS /api/live/ws` | 2 concurrent / IP | `close(1008)` before accept |

### Admin Authentication & Security
The `/admin` operations dashboard is protected with a server-side authentication gate. Any unauthenticated access to `/admin` or subpages automatically redirects to the clinical staff login portal (`/admin/login`).

| Setting | Value |
|---|---|
| **Staff Username** | `admin2869` |
| **Staff Password** | `Admin@2869` |
| **Session Persistence** | Secure `HttpOnly` HMAC session cookie (`aura_admin_session`, 24h TTL) |
| **Gating Mechanism** | Enforced at edge via Next.js `proxy.ts` middleware |

> **Note on Patient Authentication (Future Work):** While the **Admin Operations Dashboard** is fully protected by the credentials above, end-user patient authentication (Supabase Auth) for the patient portal remains an optional feature (the voice agent runs seamlessly in guest/public reception mode).

---

## 📡 API & WebSocket Reference

### Voice WebSocket Relay
`WS /api/live/ws?token={ephemeral_token}`
- Bidirectional streaming between patient browser and Gemini Live API.
- Handles audio chunk relay, transcript streaming, and server tool calls.

### Core REST Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/live/token` | Issues ephemeral 10-minute session token for WebSocket access |
| `GET` | `/api/calls` | Fetches call logs with optional intent/status filters |
| `GET` | `/api/calls/{id}` | Retrieves detailed call transcript and extracted data |
| `GET` | `/api/appointments` | Retrieves appointment triage queue |
| `PATCH` | `/api/appointments/{id}` | Updates appointment status (`pending_review`, `confirmed`, `cancelled`) |
| `GET` | `/api/prescriptions` | Retrieves repeat prescription requests |
| `GET` | `/api/escalations` | Retrieves urgent clinical escalations |
| `POST` | `/api/guest/lookup` | Validates reference ID and mobile number to return request status |
| `GET` | `/api/dashboard/kpis` | Aggregates practice KPIs (Total Calls, AI Resolution Rate, Escalations) |
| `GET` | `/api/dashboard/call-volume` | 7-day volume metrics for chart rendering |
| `GET` | `/api/dashboard/request-types`| Intent distribution breakdown |
| `GET` | `/api/dashboard/recent-activity` | Timeline feed of recent patient interactions |
| `GET` | `/api/dashboard/operation-status` | System component health checks |
| `GET` | `/api/practice-info` | Clinic operational information |
| `PATCH`| `/api/practice-info` | Updates practice information (whitelisted fields) |

---

## 📂 Project Directory Structure

```
Aura-Voice-Agent/
├── backend/
│   ├── .env                           # API keys & Supabase credentials
│   ├── config.py                      # Pydantic Settings & environment validation
│   ├── main.py                        # FastAPI server, REST API, WebSocket relay
│   ├── requirements.txt               # Python package dependencies
│   ├── seed_knowledge.py              # Knowledge base vector seeding script
│   ├── db/
│   │   └── supabase.py                # Supabase client singleton
│   ├── schemas/                       # Pydantic data schemas
│   │   ├── appointments.py
│   │   ├── calls.py
│   │   ├── escalation.py
│   │   ├── knowledge.py
│   │   ├── patient.py
│   │   └── prescriptions.py
│   ├── services/                      # Business logic & AI orchestrators
│   │   ├── embeddings.py              # Gemini Embedding 001 generation
│   │   ├── extraction.py              # Gemini 3.5 Flash-Lite triage extraction
│   │   ├── live_token.py              # Token generation & Aura system prompt
│   │   ├── rag.py                     # pgvector cosine similarity search
│   │   └── summary.py                 # Post-call transcript summarization
│   └── tools/                         # Function calling execution handlers
│       ├── appointments.py
│       ├── calls.py
│       ├── enquiries.py
│       ├── escalation.py
│       ├── practice.py
│       └── prescriptions.py
│
├── frontend/
│   ├── .env.local                     # NEXT_PUBLIC_FASTAPI_URL configuration
│   ├── package.json                   # Dependencies (Next 16, React 19, Lucide, Recharts)
│   ├── next.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── app/                       # Next.js App Router
│       │   ├── layout.tsx             # Root layout with typography and fonts
│       │   ├── page.tsx               # Patient Voice Receptionist portal
│       │   ├── globals.css            # Global CSS, glassmorphism, Tailwind v4
│       │   └── admin/                 # Admin operations dashboard
│       │       ├── layout.tsx         # Admin shell (Sidebar + TopBar)
│       │       ├── page.tsx           # Dashboard metrics, charts & call logs
│       │       ├── appointments/      # Appointment queue management
│       │       ├── calls/             # Full-height calls & triage stream
│       │       ├── prescriptions/     # Prescription review & EPS tracking
│       │       ├── escalations/       # Urgent clinician triage reviews
│       │       ├── enquiries/         # Patient admin inquiries
│       │       ├── knowledge/         # RAG knowledge base document viewer
│       │       ├── analytics/         # Practice analytics
│       │       └── settings/          # Surgery settings & opening hours
│       ├── components/
│       │   ├── admin/                 # Admin components (TopBar, NotificationDropdown, CallsTable)
│       │   ├── patient/               # Patient UI (PatientNav, YourRequestPanel, TrackRequestModal)
│       │   └── ui/                    # Primitives (StatusBadge, IntentPill, CallerTypePill)
│       ├── lib/                       # Constants, types, utilities & API services
│       └── voice/                     # Gemini Live WebSocket provider & audio hooks
│
├── supabase/
│   └── migrations/                    # SQL DDL & RLS security policies
│       ├── 20260918000001_create_core_schema.sql
│       ├── 20260918000002_create_request_tables.sql
│       ├── 20260918000003_seed_demo_data.sql
│       ├── 20260919000001_add_preferred_date.sql
│       └── 20260919000002_enable_rls_security.sql
│
├── package.json                       # Monorepo convenience scripts
├── detail.md                          # In-depth technical specification document
└── README.md                          # Project overview & guide
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.10+
- **Supabase Project** with `pgvector` extension enabled
- **Google Gemini API Key** with access to Gemini Live models

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/Aura-Voice-Agent.git
   cd Aura-Voice-Agent
   ```

2. **Setup Frontend:**
   ```bash
   cd frontend
   npm install
   ```
   Create `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000
   NEXT_PUBLIC_VOICE_PROVIDER=gemini
   ```

3. **Setup Backend:**
   ```bash
   cd ../backend
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # macOS/Linux:
   source venv/bin/activate
   pip install -r requirements.txt
   ```
   Create `backend/.env`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ENVIRONMENT=development
   PORT=8000
   CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
   ```

4. **Initialize Database:**
   Run the SQL migrations in order within the Supabase SQL Editor:
   - `supabase/migrations/20260918000001_create_core_schema.sql`
   - `supabase/migrations/20260918000002_create_request_tables.sql`
   - `supabase/migrations/20260918000003_seed_demo_data.sql`
   - `supabase/migrations/20260919000001_add_preferred_date.sql`
   - `supabase/migrations/20260919000002_enable_rls_security.sql`

5. **Seed Knowledge Base:**
   ```bash
   python -m backend.seed_knowledge
   ```

### Running the Application

Open two terminal windows:

- **Terminal 1 (Backend):**
  ```bash
  python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
  ```

- **Terminal 2 (Frontend):**
  ```bash
  cd frontend
  npm run dev
  ```

| Interface | URL |
|---|---|
| **Patient Voice Receptionist** | [http://localhost:3000](http://localhost:3000) |
| **Admin Operations Dashboard** | [http://localhost:3000/admin](http://localhost:3000/admin) |
| **Calls & Triage Stream** | [http://localhost:3000/admin/calls](http://localhost:3000/admin/calls) |
| **FastAPI Interactive Docs (Swagger)** | [http://localhost:8000/docs](http://localhost:8000/docs) |

---

## ⚕️ Clinical Safety Protocols

Aura enforces a strict 4-layer clinical safety framework:

1. **Deterministic Red-Flag Detection**: Prompt instructions mandate immediate intervention when acute symptoms are mentioned:
   - Severe, crushing, or radiating chest pain
   - Sudden unilateral weakness, facial droop, or slurred speech (FAST criteria)
   - Severe acute respiratory distress or anaphylaxis
   - Uncontrolled hemorrhage or collapse
2. **Mandatory 999 / A&E Directive**: Aura verbally advises the patient to seek emergency medical attention immediately and halts non-emergency administrative flows.
3. **Automated Clinician Escalation**: Executes `escalate_to_staff`, flagging the patient record as `Urgent`, notifying the duty doctor, and logging the event in the surgery audit trail.
4. **Safety Boundaries on Prescriptions**: Aura explicitly records requests for existing repeat medications only and **never prescribes, alters dosages, or offers unverified medical advice**.

---

<p align="center">
  <sub>Built with ❤️ for NHS general practices, GP surgeries, and modern healthcare providers.</sub>
</p>
