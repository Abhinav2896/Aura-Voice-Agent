# Environment and Secrets

## Problem

Aura's secrets (Gemini key, Supabase service-role key, anon key) must be
available to the backend at runtime but never committed to git and never sent
to the browser. Getting this wrong leaks the highest-value credentials in the
system.

## The invariant

> **Secrets live only in gitignored `.env` files read by the backend. Only
> committed `*.example` templates with placeholders are in the repo. Only
> `NEXT_PUBLIC_*` values reach the browser.**

## How Aura implements it

### File layout

- `backend/.env` — real backend secrets (`GEMINI_API_KEY`, `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `ENVIRONMENT`, `PORT`,
  `CORS_ORIGINS`). **Gitignored.**
- `backend/.env.example` — committed template, placeholders only, with security
  comments (service-role is backend-only, highest-value).
- `frontend/.env.local` — real frontend config. **Gitignored.**
- `frontend/.env.local.example` — committed template; documents that only
  `NEXT_PUBLIC_*` reaches the browser and the service-role key must never appear.

### .gitignore

The root `.gitignore` ignores all `.env*` files, then re-includes
`!.env*.example` and `!.env.template` so onboarding templates stay tracked while
real secrets never are. It also ignores Python artifacts (`__pycache__/`,
`.venv/`, caches) and logs.

### Startup verification

`backend/main.py` (`lifespan`) decodes the service-role JWT's `role` claim at
startup and logs whether it is genuinely `service_role`. This catches the
common mistake of pasting the anon key into the service-role slot (which
silently breaks writes under RLS) without ever printing the key.

### CORS

`CORS_ORIGINS` is an explicit allowlist (default
`http://localhost:3000,http://127.0.0.1:3000`) — not `*`. Only listed origins
may call the API from a browser.

## Rate limiting and abuse controls

In-memory, per-IP rate limits protect quota and blunt brute-force. Enforced in
`backend/services/rate_limiter.py` (no external dependencies):

| Surface | Limit |
|---|---|
| `POST /api/live/token` | 5 / 60s per IP (strict — gates the billable Gemini session) |
| `POST /api/guest/lookup` | 10 / 60s per IP (anti-enumeration) |
| General REST (`/api/calls`, `/api/appointments`, `/api/prescriptions`, `/api/dashboard/*`) | 60 / 60s per IP (shared) |
| `WS /api/live/ws` | 2 concurrent sessions per IP (`close(1008)` before accept) |

REST rejections return HTTP 429 with a `Retry-After` header. State is
per-process (single-instance); a multi-instance deployment should move it to a
shared store. Full detail in `doc-rate-limiting-and-abuse.md`.

## Dependency posture

Reviewed with `pip-audit` / `npm audit` on 2026-09-21:

- **Frontend:** 0 vulnerabilities.
- **`pydantic-settings`:** bumped `2.14.0 → 2.14.2` to fix CVE-2026-58203
  (patch, verified compatible).
- **`protobuf` 4.25.9 (PYSEC-2026-1805):** fix is `>=5.29.6`, but
  `google-ai-generativelanguage 0.6.6` requires `protobuf<5.0.0`. Cannot upgrade
  without replacing the Gemini SDK — **deferred, documented** in
  `backend/requirements.txt`.
- **`starlette` (advisories fixed in `>=0.40.0`):** `fastapi 0.115.0` pins
  `starlette<0.39.0`. Fixing requires a coordinated FastAPI upgrade —
  **deferred, documented**.

## Secret rotation

Any secret that has ever been shared outside the `.env` file (chat, screenshot,
paste) should be rotated:

- **`GEMINI_API_KEY`** — rotate in Google AI Studio, update `backend/.env`.
- **`SUPABASE_SERVICE_ROLE_KEY`** — rotate in Supabase Dashboard → Settings →
  API, update `backend/.env`.

## Common failure modes to avoid

- **Committing a real `.env`.** It is gitignored; verify before any commit.
- **Putting a secret in `NEXT_PUBLIC_*`.** Those are inlined into the browser
  bundle.
- **Printing a key to logs/errors.** Log facts, not key material.
- **Setting CORS to `*`.** Keep the explicit allowlist.

## How to preserve this control

1. Add new secrets to `backend/.env` + `config.py` + `.env.example`
   (placeholder) only.
2. Keep the `.env*` ignore + `*.example` re-include intact.
3. Rotate any secret that leaks; keep the startup role check.
