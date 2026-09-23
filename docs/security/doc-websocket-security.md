# WebSocket Security

## Problem

The Gemini Live relay at `/api/live/ws` is the most powerful surface in Aura:
it streams audio to Gemini on the backend's API key and relays tool calls. An
unguarded WebSocket is an open door to charges, abuse, and the tool surface.

## The invariant

> **No WebSocket is accepted without a valid, unexpired session token, and the
> relay never lets the model reach the database directly — every tool call is
> mediated by the backend.**

## How Aura implements it

- **Pre-accept token gate.** `live_websocket_endpoint` in `backend/main.py`
  validates the session token *before* `websocket.accept()`. Missing, unknown,
  or expired tokens are closed with code `1008` and never upgraded. Tokens are
  the ephemeral, short-TTL tokens described in
  `doc-ephemeral-browser-sessions.md`.
- **Pre-accept concurrency gate.** In addition to token validation,
  `try_acquire_ws_slot(client_ip)` limits each client IP to a maximum of 2
  simultaneous active WebSocket sessions (`doc-rate-limiting-and-abuse.md`).
  If exceeded, the socket is rejected with code `1008` *before* `accept()`,
  preventing billable upstream Gemini session flooding.
- **Guaranteed slot release.** The active connection and post-call processing
  are enclosed in a `try: ... finally:` structure where `release_ws_slot(client_ip)`
  is guaranteed to run, preventing connection quota exhaustion even on early
  aborts or server-side exceptions.
- **Mediated tool calls.** When Gemini emits a `toolCall`, the backend logs it
  and runs `execute_tool` with a Pydantic-validated handler and server-owned
  fields — the model never touches Supabase
  (`doc-server-mediated-tool-execution.md`).
- **Transport.** In deployment the socket is served over WSS (TLS); locally it
  is `ws://localhost`. Origin is constrained by the CORS allowlist for the HTTP
  surface that provisions the token (`doc-environment-and-secrets.md`).
- **Backend-held key.** Gemini is reached with the backend's key only; the
  browser never holds it (`doc-backend-held-credentials.md`).

## Common failure modes to avoid

- **Calling `websocket.accept()` before validating the token.** Once accepted,
  the socket is open; validate first and `close(1008)` on failure.
- **Relaying a model tool call straight to the database.** Always route through
  `execute_tool`.
- **Serving the relay over plain `ws://` in production.** Use WSS/TLS.
- **Logging audio payloads or tokens.** Log control events, not content.

## How to preserve this control

1. Keep token validation as the first step, before accept.
2. Keep all tool execution mediated by the backend.
3. Serve over WSS in any non-local deployment.
