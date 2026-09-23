# Supabase Row Level Security

## Problem

Supabase exposes a Postgres database directly to any client holding the anon
key. Without Row Level Security (RLS), anyone with the public anon key could
read or write every row. Aura stores call records, appointment/prescription
requests, and patient details — none of which should be world-readable.

## The invariant

> **RLS is enabled on every application table. Untrusted clients (anon key)
> get no implicit access; the trusted backend uses the service-role client,
> which bypasses RLS by design.**

## How Aura implements it

- RLS is enabled and active on the application tables (calls, appointment/
  prescription/admin requests, patients). Policies are applied via the Supabase
  SQL Editor — there is no CLI/DB-password path in this project, so DDL and
  policy changes are made in the dashboard.
- The **backend** uses the service-role client (`get_supabase()`), which
  bypasses RLS. This is correct: the backend has already validated the request
  before it writes. See `doc-backend-held-credentials.md`.
- The **anon** client (`get_supabase_anon()`) is used only to verify a user's
  JWT. Any direct browser access through the anon key remains RLS-constrained.

## Why bypass + RLS is the right combination here

Two independent layers:

1. **RLS** protects against anyone reaching Postgres directly with the anon
   key — they get nothing unless a policy allows it.
2. **The backend-mediated model** means the browser's *intended* path to data
   is through FastAPI, which validates every request before using the
   service-role client.

RLS is the backstop if the anon key leaks; the backend is the primary access
path. Neither alone is relied upon.

## Common failure modes to avoid

- **Creating a new table without enabling RLS.** A new table defaults to no
  RLS in some workflows; always enable it and add explicit policies.
- **Writing a permissive `USING (true)` policy for the anon role.** That
  re-opens the table to the public. Policies for anon/authenticated must be
  scoped to the row owner.
- **Reaching for the service-role key in the browser to "fix" an RLS block.**
  The fix is a backend endpoint, never a browser-side privileged key.

## How to preserve this control

1. New tables: enable RLS in the SQL Editor and add owner-scoped policies
   before the table is used.
2. Keep all privileged writes behind the backend service-role client.
3. Treat the anon key as public; assume it will leak and rely on RLS to
   contain the blast radius.
