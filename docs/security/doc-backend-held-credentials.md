# Backend-Held Credentials

## Problem

Aura holds high-value secrets: the Gemini API key and the Supabase
**service-role** key (which bypasses Row Level Security). If any of these
reached the browser, an attacker could read/write the whole database or run up
Gemini charges. The browser must never see them.

## The invariant

> **Every secret lives in the backend process only. The browser talks to
> FastAPI; FastAPI talks to Gemini and Supabase.**

The frontend never calls Gemini or the Supabase service-role client directly.
It calls the FastAPI backend, which holds the credentials and mediates.

## How Aura implements it

- Secrets are read from `backend/.env` by `backend/config.py` (Pydantic
  settings). They are `GEMINI_API_KEY`, `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_ANON_KEY`. This file is
  gitignored (`.env*`).
- `backend/db/supabase.py` builds two clients:
  - `get_supabase()` — the **service-role** client. Bypasses RLS. Used by
    trusted server code for all reads/writes. **Backend-only.**
  - `get_supabase_anon()` — the **anon** client. Used only to verify an
    end-user JWT (`auth.get_user`) when present. RLS-constrained.
- The frontend only ever receives `NEXT_PUBLIC_*` values (backend URL, voice
  provider, Supabase URL, anon key). See `frontend/.env.local.example`.
- A startup guard in `backend/main.py` (`lifespan`) decodes the
  service-role JWT's `role` claim and logs whether it is really `service_role`.
  This catches the easy misconfiguration of pasting the anon key into the
  service-role slot (which silently breaks writes under RLS).

## The service-role key is intentional, not a vulnerability

The service-role key bypassing RLS is **by design**. The trusted backend is the
single component authorized to act on the database on behalf of callers, after
it has validated the request. This is the whole point of the backend-mediated
model (`doc-server-mediated-tool-execution.md`). The control that makes it safe
is: **the key never leaves the server, and the browser can only reach the
database through validated FastAPI endpoints.**

## Common failure modes to avoid

- **Putting any secret in a `NEXT_PUBLIC_*` variable.** These are inlined into
  the browser bundle. Only the anon key and public URLs belong there.
- **Returning raw secrets in an API response or error body.** Health/errors
  are sanitized (`doc-phone-masking-and-pii.md`, environment doc).
- **Committing `.env`.** It is gitignored; keep it that way. Only `*.example`
  templates are committed.
- **Logging secret values.** Log the *fact* of a misconfiguration (e.g. wrong
  role), never the key material.

## How to preserve this control

1. Add new secrets only to `backend/.env` and `backend/config.py`; document
   them in `backend/.env.example` with a placeholder.
2. Never introduce a browser-side call to Gemini or the service-role client.
3. Keep the startup role check; extend it if you add more privileged clients.
