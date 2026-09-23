# Aura Voice Agent — Implementation Plan

**Feature:** Patient Portal, Supabase Authentication, Guest vs. Authenticated Mode & Admin Dashboard Updates

**Author target:** Executable by Gemini 3.8 Flash High (or any implementer). Every file path, column, and endpoint below was verified against the current codebase before writing this plan.

---

## 0. Ground Truth (verified current state — read before doing anything)

These facts were confirmed by reading the repo. They correct several assumptions baked into the original brief. **Do not skip this section** — some of the brief's instructions reference things that do not exist.

### Backend (`backend/`)
- FastAPI app with **no routers** — every endpoint is mounted directly on `app` in `backend/main.py`. There is **no auth of any kind** (no JWT, no `Depends()` security, no `Authorization` handling).
- The Supabase client is created **once** in `backend/db/supabase.py` using `settings.SUPABASE_SERVICE_ROLE_KEY` via `supabase-py` v2.31.0. **The service-role key bypasses RLS entirely.** `SUPABASE_ANON_KEY` is loaded in `backend/config.py` but used nowhere.
- The appointment status tool is named **`get_my_appointment`** (in `backend/tools/appointments.py`), **NOT `check_appointment_status`** as the brief says. The booking tool is **`create_appointment_request`** (alias `book_appointment`). Tool registry + dispatch is in `backend/tools/__init__.py`.
- `get_my_appointment` already enforces name **+** phone and filters phone in Python (because the service-role client bypasses RLS). This is the existing access-control seam.
- The Gemini Live relay is `WS /api/live/ws` in `backend/main.py`. It **pre-creates a `calls` row on connect with a hardcoded `caller_name="Sarah Wilson"`** (~L130), then builds `systemInstruction` inline (~L162-166) from `AURA_SYSTEM_INSTRUCTION` (defined in `backend/services/live_token.py`). The WS endpoint **accepts the socket even when the token is missing/invalid** — so "guest mode" is already the default behavior.
- Post-call flow (WS `finally` block ~L362-379): inserts `call_messages`, then `process_post_call_summary(call_id, transcript)` (`backend/services/summary.py`) updates the `calls` row.
- Config loads from **`backend/.env`** via `pydantic-settings`. `requirements.txt` has **no JWT library** (no `pyjwt`/`python-jose`). `supabase-py` bundles `gotrue`/`supabase-auth`, usable for `auth.get_user(jwt)`.

### Database (Supabase / Postgres)
- Schema lives in **`supabase/migrations/`** as dated files (`YYYYMMDDNNNNNN_name.sql`), idempotent `IF NOT EXISTS` style. **Migrations are applied manually in the Supabase Dashboard SQL Editor** — there is no CLI access, no DB password, and no `exec` RPC available in this environment. Every DDL in this plan must be handed to the user to run.
- **9 tables exist:** `practice_information`, `knowledge_documents`, `knowledge_chunks`, `calls`, `call_messages`, `appointment_requests`, `prescription_requests`, `admin_requests`, **`escalations`**. The brief omits `escalations` — it is a first-class request table and must be included everywhere the others are.
- **No `user_id`, no `profiles`, no `patients` table, no `auth.uid()` usage anywhere.** Patient identity today is free-text `patient_name` / `patient_phone` / `patient_dob` (TEXT).
- All request tables already have `call_id UUID REFERENCES calls(id)` — mirror that FK style for the new `user_id` columns.
- `admin_requests` has **no `patient_dob`** column (unlike appointments/prescriptions). `calls` uses `caller_name`/`caller_phone` (not `patient_*`).
- An RLS migration `20260919000002_enable_rls_security.sql` exists (service_role full access; anon/authenticated read-only on the 3 public tables; the 6 patient tables have no anon/authenticated policy). **Whether it has actually been applied to the live project is unverified** — confirm with the user (see §1).

### Frontend (`frontend/`, Next.js **16.3.5** + React **19.2.8**)
This is a modified Next.js with real breaking changes. **These are not optional style notes — copying a standard Supabase SSR guide verbatim will break.**
- **`middleware.ts` is renamed to `proxy.ts`.** Create `frontend/src/proxy.ts` exporting a `proxy(request)` function (not `middleware()`). `config.matcher` works the same. **Node.js runtime only — the `edge` runtime is unsupported and throws.**
- **`cookies()`, `headers()`, `draftMode()` are async-only** — `const store = await cookies()`. Sync access is removed.
- **`params` / `searchParams` are Promises** in pages/layouts/route handlers — must be awaited.
- The Next 16 auth guide (`node_modules/next/dist/docs/01-app/02-guides/authentication.md`) warns that **auth checks in layouts are unreliable** (partial rendering) — gate in a DAL / at the page level, not in `admin/layout.tsx` (which today literally comments "No auth gate for prototype").
- **`@supabase/supabase-js` and `@supabase/ssr` are NOT installed.** Must be added.
- Uses `src/` with alias `@/* → ./src/*`. No `login/`, `register/`, `patient/`, `auth/`, `proxy.ts`, or `route.ts` exist yet — all greenfield.
- REST layer: `frontend/src/lib/services/*` (barrel `index.ts`), all bare `fetch()` with `cache: 'no-store'`, **no auth header, no shared wrapper**, base URL `process.env.NEXT_PUBLIC_FASTAPI_URL ?? 'http://localhost:8000'`.
- Voice layer: `frontend/src/voice/GeminiLiveProvider.ts` does `POST /api/live/token` then opens the WS. **The WS URL derives host from `window.location.hostname` and hardcodes port `8000`**, ignoring the env var — relevant if identity must be passed.
- **No generic Modal/Dialog component and no `createPortal`.** The only modal pattern is the fixed-overlay slide-over in `frontend/src/components/admin/CallDetails.tsx` (null-render + parent state + backdrop dismiss). Reuse that pattern; no dialog dependency exists.
- Root `frontend/src/app/layout.tsx` is a Server Component with **no providers** — the auth provider gets added here.
- Nav data + color tokens centralized in `frontend/src/lib/constants.ts`; shared types in `frontend/src/lib/types.ts`.
- Stack: `lucide-react` (icons), `recharts` (charts), Tailwind v4 (no config file, PostCSS-based).

---

## 1. Confirmed Decisions (signed off 2026-09-20 — build to these, do not re-ask)

> All seven review items are resolved. The implementer should treat each as a fixed requirement.

1. **RLS is live.** `20260919000002_enable_rls_security.sql` is **applied and active** — `rowsecurity = true` confirmed on all 9 tables. The `user_id`-scoped policies in §2 are added on top of a working RLS foundation and act as genuine defense-in-depth.

2. **Data-access model: A — Backend-mediated.** The frontend never queries Supabase tables directly. It authenticates with Supabase Auth (GoTrue) for a JWT, sends it as `Authorization: Bearer` to FastAPI `/api/patient/*` endpoints; FastAPI verifies the JWT and performs service-role reads **filtered by `user_id` in code**. (Model B — direct browser reads — is explicitly not used.)

3. **Profile table name: `patients`.** All SQL, schemas, and endpoints use `public.patients`.

4. **Auth method: Email + Password** (baseline). The `auth/callback` route is still stubbed (§4.5) so Magic Link / OTP can be added later without rework, but no OTP/magic-link UI is built in this pass.

5. **`/admin` stays open / ungated.** No auth gate on the admin dashboard — this is a demo. Build **only** the caller-type UI (Registered vs. Guest badges + filters + KPI split). **Phase 7's optional admin-gating is dropped; the admin-nav Sign Out / current-user elements in §4.8 are also skipped.**

6. **Guest lookup: all reference prefixes.** `POST /api/guest/lookup` matches `reference_id` + phone across `#APT` (appointment_requests), `#RX` (prescription_requests), `#ADM` (admin_requests), and `#ESC` (escalations), routing by prefix to the right table. Status only — never medical detail.

7. **Personalized voice greeting: approved.** When authenticated, inject the verified patient **name, phone, and DOB** into Gemini Live's `systemInstruction` (§3.3). The name-only fallback is not required.

---

## 2. Database Migrations (exact SQL — user runs these in the Supabase SQL Editor)

> **All DDL below must be run by the user in the Supabase Dashboard → SQL Editor**, in order. There is no CLI/DB-password/`exec` path in this environment. Save each as a file under `supabase/migrations/` using the existing dated convention so the repo stays the source of truth, but the *application* is manual.

### Migration `20260920000001_create_patients_and_profile_trigger.sql`

```sql
-- Patient profile table, keyed 1:1 to Supabase auth.users
CREATE TABLE IF NOT EXISTS public.patients (
    id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name           TEXT NOT NULL DEFAULT '',
    phone               TEXT,
    dob                 TEXT,                     -- DD/MM/YYYY, matches existing free-text style
    address             TEXT,
    nominated_pharmacy  TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create a profile row when a new auth user registers.
-- Pulls optional fields from the signup metadata (raw_user_meta_data).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.patients (id, full_name, phone, dob)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
        NEW.raw_user_meta_data ->> 'phone',
        NEW.raw_user_meta_data ->> 'dob'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- keep updated_at fresh
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_patients_updated_at ON public.patients;
CREATE TRIGGER trg_patients_updated_at
    BEFORE UPDATE ON public.patients
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
```

### Migration `20260920000002_add_user_id_to_records.sql`

```sql
-- Nullable user_id (null = guest) on every record table. Mirrors the existing call_id FK style.
ALTER TABLE public.calls                 ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.call_messages         ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.appointment_requests  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.prescription_requests ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.admin_requests        ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.escalations           ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_calls_user_id                 ON public.calls(user_id);
CREATE INDEX IF NOT EXISTS idx_apt_req_user_id               ON public.appointment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_rx_req_user_id                ON public.prescription_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_req_user_id             ON public.admin_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_escalations_user_id           ON public.escalations(user_id);
CREATE INDEX IF NOT EXISTS idx_call_messages_user_id         ON public.call_messages(user_id);
```

### Migration `20260920000003_rls_patient_ownership.sql`

```sql
-- Assumes RLS is already enabled on these tables (via 20260919000002). If not, enable first:
--   ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- service_role keeps full access (backend uses it and bypasses RLS regardless; explicit for clarity)
DROP POLICY IF EXISTS patients_service_all ON public.patients;
CREATE POLICY patients_service_all ON public.patients
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- a patient can read and update ONLY their own profile
DROP POLICY IF EXISTS patients_select_own ON public.patients;
CREATE POLICY patients_select_own ON public.patients
    FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS patients_update_own ON public.patients;
CREATE POLICY patients_update_own ON public.patients
    FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Per-user read on record tables (defense-in-depth; backend still mediates in model A).
-- Repeat this block for: calls, call_messages, appointment_requests,
-- prescription_requests, admin_requests, escalations.
DROP POLICY IF EXISTS calls_select_own ON public.calls;
CREATE POLICY calls_select_own ON public.calls
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- ... (same pattern for the other 5 tables)
```

> **Rollback note:** dropping the columns is destructive (loses any linkage). Keep a `DROP POLICY` / `ALTER TABLE ... DROP COLUMN` companion documented but do not run it automatically.

---

## 3. Backend File Changes (`backend/`)

### 3.1 New — `backend/services/auth.py` (JWT verification)
- Add a FastAPI dependency `get_current_user` that reads `Authorization: Bearer <token>`, verifies it against Supabase, and returns `{user_id, email}`. Two viable verification paths:
  - **Preferred:** use the already-bundled `supabase-py` GoTrue client with the **anon** key: `supabase_anon.auth.get_user(jwt)` → returns the user or raises. This wires up the currently-unused `SUPABASE_ANON_KEY`.
  - Alternative: verify the JWT signature locally with the project JWT secret (requires adding `pyjwt` to `requirements.txt` and a `SUPABASE_JWT_SECRET` env var).
- Add `get_optional_user` variant (returns `None` if no/invalid token) for endpoints that work in both guest and authed mode.
- Add a second memoized client factory in `backend/db/supabase.py`: `get_supabase_anon()` using `SUPABASE_ANON_KEY` (leave the existing service-role `get_supabase()` untouched).

### 3.2 New — `backend/routers/patient.py` (or inline in `main.py` to match current no-router style)
> The codebase currently mounts everything on `app` with no routers. To minimize churn, **add these endpoints inline in `main.py`** unless the user prefers introducing an `APIRouter`. All read via the service-role client filtered by the authenticated `user_id`.

| Method | Path | Auth | Behavior |
|---|---|---|---|
| `GET` | `/api/patient/me` | required | Return the caller's `patients` row (join by `auth.uid()`). 404 → auto-create from trigger fallback. |
| `PATCH` | `/api/patient/me` | required | Update `phone`, `address`, `nominated_pharmacy`, `dob`, `full_name`. Whitelist fields (mirror `EDITABLE_PRACTICE_FIELDS` pattern). |
| `GET` | `/api/patient/appointments` | required | `appointment_requests` where `user_id = uid`, newest first. |
| `GET` | `/api/patient/prescriptions` | required | `prescription_requests` where `user_id = uid`. |
| `GET` | `/api/patient/calls` | required | `calls` where `user_id = uid`, with summary/intent/status/duration/created_at. |
| `GET` | `/api/patient/calls/{id}` | required | One call **only if** its `user_id = uid` (else 404, never 403-leak), plus its `call_messages` transcript and `extracted_data`. |
| `POST` | `/api/guest/lookup` | none | Body `{reference_id, phone}`. Match a record where `reference_id = X` **and** normalized phone matches. Returns curated status fields only — **never** medical history/reason for guests beyond what the record status needs. Supports `#APT/#RX/#ADM/#ESC` prefixes by routing to the right table. |

- New Pydantic schemas in `backend/schemas/patient.py`: `PatientProfile`, `PatientProfileUpdate`, `GuestLookupRequest`, `GuestLookupResponse`. Reuse existing response models for lists where possible.
- **Ownership enforcement is in code** (service-role bypasses RLS) — every `/api/patient/*` query must include `.eq("user_id", uid)`. Add a helper to avoid drift.

### 3.3 Modify — `backend/main.py` (Live relay identity injection)
- `POST /api/live/token`: accept optional `Authorization` bearer. If present and valid, verify via `get_optional_user`, look up the `patients` row, and **stash a short-lived server-side association** between the ephemeral token and `{user_id, full_name, dob, phone}` (extend the existing in-memory `ACTIVE_SESSIONS` store in `backend/services/live_token.py`). Do **not** send patient PII in the token response body to the client.
- `WS /api/live/ws`: on connect, resolve the token → optional patient context.
  - **Authed:** replace the hardcoded `caller_name="Sarah Wilson"` in the pre-created `calls` row (~L130) with the verified `full_name`; set the new `user_id` column. Build `systemInstruction` (~L162-166) as `AURA_SYSTEM_INSTRUCTION` **plus** a verified-patient preamble, e.g. *"You are speaking with registered patient {full_name} (DOB {dob}, phone {phone}). Greet them warmly by first name and do not ask them to re-enter their contact details unless they want to change them."*
  - **Guest:** unchanged behavior (`user_id = NULL`, standard intake). Keep the "Sarah Wilson" default only if the user wants the demo seed; otherwise default to `"Guest Caller"`.
- Tool-call injection (~L253-254 injects `call_id`): also inject `user_id` into `args` when present, so booking tools can persist it.

### 3.4 Modify — `backend/tools/appointments.py`, `prescriptions.py`, `enquiries.py`, `escalation.py`
- Each create tool: if `args` carries `user_id`, add it to the insert payload (nullable → guest). Non-breaking (column is nullable).
- `get_my_appointment`: **tighten** per the brief's privacy rule.
  - If called within an **authenticated** session (has `user_id`): allow listing that patient's own recent appointments directly by `user_id` (no name/phone needed).
  - If **guest**: require `reference_id` + phone (route this through the same logic as `/api/guest/lookup`). **Remove/deny name-only lookup.** Today it matches on `ilike(patient_name)` + phone; keep phone mandatory and prefer `reference_id` when provided.
- `backend/tools/calls.py` (`save_call`): accept and persist `user_id`.

### 3.5 Modify — `backend/services/summary.py` & `backend/services/live_token.py`
- `summary.py`: the post-call update already targets a `calls` row by id; no change needed unless denormalizing patient fields. Leave as is.
- `live_token.py`: extend `ACTIVE_SESSIONS` entries to hold optional patient context; add helper `attach_patient_context(token, ctx)` / `get_patient_context(token)`.

### 3.6 `backend/requirements.txt`
- If using the GoTrue-via-anon-key verification path: **no new dependency** (bundled in `supabase==2.31.0`).
- If using local JWT verification: add `pyjwt==2.9.0`. `python-multipart` only if any form-encoded endpoints are added (not needed for JSON APIs).

### 3.7 `backend/.env` additions
- `SUPABASE_ANON_KEY` already present — ensure it's the real anon key. Add `SUPABASE_JWT_SECRET` only if choosing local JWT verification. Add nothing else.

---

## 4. Frontend File Changes (`frontend/`, Next.js 16 conventions)

### 4.1 Dependencies & env
- `npm install @supabase/supabase-js @supabase/ssr` (in `frontend/`).
- `frontend/.env.local`: add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### 4.2 New Supabase client factories — `frontend/src/lib/supabase/`
- `client.ts` — browser client via `createBrowserClient` (`@supabase/ssr`), for `'use client'` components.
- `server.ts` — server client via `createServerClient`, using **`await cookies()`** (async — Next 16 removed sync access). `.set`/`.delete` only inside Server Actions / Route Handlers, not during Server Component render.

### 4.3 New — `frontend/src/proxy.ts` (NOT `middleware.ts`)
- Export a `proxy(request: NextRequest)` function (Next 16 renamed middleware→proxy; **Node runtime only, never edge**).
- Refresh the Supabase session cookie on each request (the standard `@supabase/ssr` cookie-sync body, but placed in `proxy.ts` with the proxy signature).
- `config.matcher` to exclude static assets. Use it only for **optimistic** redirects; real gating happens in the DAL/page (per the Next 16 auth doc's layout warning).

### 4.4 New — Auth DAL & context
- `frontend/src/lib/auth/dal.ts` — server-side `verifySession()` / `getUser()` using the server client; used by protected pages (portal, optionally admin). This is the reliable gate (not layouts).
- `frontend/src/context/AuthProvider.tsx` — `'use client'` context exposing `{ user, profile, isLoading, signOut }`. Subscribes to `supabase.auth.onAuthStateChange`, fetches `/api/patient/me` for the profile.
- Wrap `{children}` with `<AuthProvider>` in `frontend/src/app/layout.tsx` (currently a provider-less Server Component — the provider is a Client Component child, which is the documented pattern).

### 4.5 New auth pages
- `frontend/src/app/login/page.tsx` — glassmorphic Sign In / Sign Up toggle (Email + Password). Client-side `supabase.auth.signInWithPassword` / `signUp` (app is already heavily client-rendered), or React 19 `useActionState` + Server Actions. Reads `?redirect=` (remember: `searchParams` is a Promise if read in a server component).
- `frontend/src/app/register/page.tsx` — Name, Email, Password, Phone, DOB. Pass Name/Phone/DOB in `signUp` `options.data` so the DB trigger (§2) populates `patients`.
- `frontend/src/app/auth/callback/route.ts` — async Route Handler for email-confirm / magic-link exchange (`exchangeCodeForSession`). Stub even if password-only, so Magic Link can drop in later.

### 4.6 Patient Portal — `frontend/src/app/portal/`
- `layout.tsx` (optional shell) + `page.tsx` (protected via DAL; redirect to `/login?redirect=/portal` if unauthenticated).
- Tabs (client components under `frontend/src/components/portal/`):
  - **Overview** — welcome banner ("Welcome back, {first name}"), latest request status card, "Start New Voice Call" → `/`.
  - **Appointments & Prescriptions** — cards with `#APT-…`/`#RX-…`, status pills, reasons, notes. Data from `/api/patient/appointments` + `/api/patient/prescriptions`.
  - **Saved Chat & Call History** — timeline from `/api/patient/calls`; expandable transcript (reuse `ChatMessage` bubble styling) from `/api/patient/calls/{id}`; post-call clinical summary card (intent, urgency, review flag); "Continue Discussion" → opens voice/text session pre-loaded with prior context.
  - **Profile Settings** — edit phone, address, nominated pharmacy via `PATCH /api/patient/me`.

### 4.7 Authenticated API + voice wiring
- `frontend/src/lib/services/` — add a **shared fetch wrapper** (new `apiClient.ts`) that attaches `Authorization: Bearer <supabase access token>` when a session exists, and refactor the new `/api/patient/*` calls through it. Leave existing admin service calls unchanged unless admin gating is added.
- `frontend/src/voice/GeminiLiveProvider.ts` — send the bearer token on the `POST /api/live/token` request so the backend can personalize the session. (WS URL host/port derivation is unchanged; identity travels via the token association server-side.)
- `frontend/src/voice/useVoiceSession.ts` — pull the session token from the auth context when present.

### 4.8 Navigation
- `frontend/src/components/patient/PatientNav.tsx` — auth-aware: guests see "Guest Mode" + "Sign In / Register" + "Track Request"; authed users see name/avatar badge, "My Health Portal" link, "Sign Out". Nav link data stays in `frontend/src/lib/constants.ts`.
- Admin `TopBar.tsx` / `Sidebar.tsx` — **no change** (`/admin` stays ungated per §1.5; no Sign Out / current-user element).

### 4.9 Guest "Track Request" modal
- `frontend/src/components/patient/TrackRequestModal.tsx` — **reuse the `CallDetails.tsx` fixed-overlay + null-render + parent-state pattern** (no dialog dependency exists). Add Escape/focus-trap handling for accessibility (the existing drawer lacks it). Inputs: `#APT-XXXX` reference + phone → `POST /api/guest/lookup` → show status only.
- Add the "Create a free patient account to save transcripts…" banner on `/` for guests.

### 4.10 Types
- `frontend/src/lib/types.ts` — add `callerType?: 'guest' | 'patient'` to `Call`/request types; add `PatientProfile`, guest-lookup types.

---

## 5. Admin Dashboard Updates (`frontend/src/app/admin/`)

- **Caller Type badge:** add `callerType` to the `Call` type and a `CallerTypePill` in `frontend/src/components/ui/` (color tokens in `constants.ts`, matching `IntentPill`/`StatusBadge`). Render in `CallsTableRow.tsx` ("Caller" column): `🟢 Registered` (tooltip: patient email/account) vs `⚪ Guest` (with reference id). The backend derives caller type from `calls.user_id` (non-null → registered).
- **Filter by caller type:** add "All / Registered / Guests" alongside the existing tab bar in `CallsTable.tsx` and the filter-pill pattern already in `admin/appointments/page.tsx`.
- **KPIs:** add a Registered-vs-Guest breakdown metric/visual to `admin/page.tsx` (KpiRow / a small recharts split). Backend: extend `/api/dashboard/kpis` to count `calls` grouped by `user_id IS NULL`.
- **Call detail drawer (`CallDetails.tsx`):** if registered, show a Patient Profile card (verified name, phone, DOB, account id — fetched via a new admin endpoint or joined server-side); if guest, show the Guest Intake card.
- Apply the caller-type column/badge to `prescriptions`, `enquiries`, `escalations` admin pages for consistency.

---

## 6. Security & Non-Functional Requirements

- **RLS is defense-in-depth, not the primary gate** (model A): the backend service-role client bypasses RLS, so **every `/api/patient/*` query MUST filter by the authenticated `user_id` in code**. Add a single helper and use it everywhere to prevent drift. Confirm RLS policies (§2) are applied so a leaked anon key still can't read cross-patient data.
- **No cross-patient leakage:** `GET /api/patient/calls/{id}` for a non-owned id returns **404**, never 403 with data. Never return another patient's `reason`/`extracted_data`.
- **Guest privacy rule (NHS/HIPAA-aligned):** guest lookups reveal **status only**, never medical reason/history. Guest lookup requires reference **and** phone; consider rate-limiting `/api/guest/lookup` to deter enumeration.
- **Token handling:** Supabase access tokens live in httpOnly cookies via `@supabase/ssr` (do not hand-roll localStorage). The backend verifies every bearer token; ephemeral Live tokens keep their 600s TTL and never carry PII in the response body.
- **PII to Gemini:** injecting patient name/DOB/phone into the Live `systemInstruction` sends it to Google. This is **approved (§1.7)** — inject all three. Keep the injection server-side (never in the token response body) and only for verified authenticated sessions.
- **CORS:** unchanged (`CORS_ORIGINS` already allows the frontend origin). `allow_credentials=True` is already set.
- **Secrets:** never log tokens/keys; keep service-role key server-only; anon key is the only key exposed to the browser.
- **Do not "fix" the Gemini model IDs** (`gemini-3.8-live`, `gemini-3.5-flash-lite`) — they are valid for this project and resolve correctly.

---

## 7. Verification Plan

### Migrations (manual, in Supabase SQL Editor)
1. Run migrations `…0001` → `…0003` in order. Confirm `patients` exists, the `on_auth_user_created` trigger fires (register a test user → row appears), and `user_id` columns exist on all 6 record tables.
2. In the SQL editor, test an RLS policy with `SET request.jwt.claim.sub = '<uuid>'; SET role authenticated;` then `SELECT` to confirm a patient sees only their own rows.

### Backend
- `cd backend && python -m uvicorn backend.main:app --reload` — confirm boot with no import errors.
- Auth: obtain a real Supabase JWT (sign in via frontend or Supabase REST), call `GET /api/patient/me` with/without the bearer → 200 vs 401.
- Ownership: seed two users' records; confirm each `/api/patient/*` endpoint returns only the caller's rows; confirm `GET /api/patient/calls/{other_users_id}` → 404.
- Guest: `POST /api/guest/lookup` with correct vs wrong phone → status vs not-found; confirm no `reason` leaks.
- Live: `POST /api/live/token` with a bearer → connect WS → confirm the `calls` row gets the real name + `user_id`, and the greeting uses the first name. Guest path unchanged.
- Add/extend tests near `backend/test_rag.py` (e.g. `backend/test_patient_api.py`) covering ownership filtering and guest-lookup privacy. If no framework is present, set up `pytest` (standard for this stack).

### Frontend
- `cd frontend && npm run build` — must pass (Turbopack). Watch for the async `cookies()` / Promise `params` pitfalls.
- Manual walkthrough: register → auto-profile created → login → portal loads own data → profile edit persists → start voice call → greeted by name → transcript saved and visible in history → sign out → guest home → Track Request modal returns status by reference+phone → admin shows Registered vs Guest badges and filter.
- Confirm `proxy.ts` (not `middleware.ts`) is picked up (session refresh works across navigations).
- Accessibility: Track Request modal traps focus and closes on Escape.

### Cleanup
- Remove any temporary test users/records created during verification. Delete scratch scripts.

---

## 8. Suggested Phase Order (each phase independently verifiable)

1. **DB** — migrations §2 (user runs them); verify trigger + columns + RLS.
2. **Backend auth core** — `auth.py`, anon client, `/api/patient/me` (+ PATCH); verify JWT gating.
3. **Backend patient reads** — appointments/prescriptions/calls endpoints + guest lookup; verify ownership & privacy.
4. **Backend Live personalization** — token/WS identity injection + tool `user_id` persistence.
5. **Frontend auth** — deps, clients, `proxy.ts`, DAL, `AuthProvider`, login/register, callback.
6. **Frontend portal** — 4 tabs + authed fetch wrapper + voice token wiring + nav + Track Request modal + guest banner.
7. **Admin caller-type UI** — badges, filters, KPI split, detail drawer. (`/admin` stays ungated per §1.5 — UI only, no auth gate.)
8. **Hardening & tests** — rate-limit guest lookup, ownership tests, build/lint, manual walkthrough, cleanup.

---

*Plan reflects the repository as read on 2026-09-20. Corrects the brief where it diverged from reality: the status tool is `get_my_appointment` (not `check_appointment_status`); `escalations` is a required 9th table; the frontend has no Supabase SDK and uses Next 16's `proxy.ts` (not `middleware.ts`) with async `cookies()`; all DDL is applied manually in the Supabase SQL Editor.*
