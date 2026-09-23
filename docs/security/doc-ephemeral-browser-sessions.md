# Ephemeral Browser Sessions

## Problem

The Gemini Live relay (`/api/live/ws`) is a WebSocket that streams audio to and
from Gemini. If any client could open that socket freely, an attacker could
drive Gemini on Aura's API key, run up charges, and exercise the tool surface
without ever loading the app. The socket needs a short-lived proof that the
client legitimately started a session through the app.

## The invariant

> **A browser must obtain a short-lived, single-purpose session token from the
> backend before it can open the Live WebSocket. The token expires quickly and
> is validated server-side before the socket is accepted.**

## How Aura implements it

- `backend/services/live_token.py` issues tokens with
  `secrets.token_urlsafe(32)` — cryptographically random, not guessable.
- Tokens are stored in an in-memory `ACTIVE_SESSIONS` map with a short TTL
  (600 seconds). `create_ephemeral_token` mints them; `validate_token` checks
  existence and expiry.
- `backend/main.py` (`live_websocket_endpoint`) calls `validate_token(token)`
  **before** accepting the WebSocket. A missing, unknown, or expired token is
  rejected with close code `1008` and the socket is never upgraded:

  ```python
  if not validate_token(token):
      logger.warning("Rejected WebSocket: missing, invalid, or expired session token")
      await websocket.close(code=1008)
      return
  ```

## Design notes and limits

- **In-memory store:** tokens live in the process. A backend restart clears
  them (active sessions must re-provision), and this does not share state across
  multiple backend instances. For a single-instance local/dev deployment this
  is intentional and simple. A multi-instance production deployment would move
  this to a shared store (e.g. Redis) — noted as a future requirement, not
  built here.
- **TTL:** short by design. The token authorizes *starting* a session, limiting
  the window in which a leaked token is useful.

## Common failure modes to avoid

- **Accepting the WebSocket before validating the token.** Validation must be
  pre-accept, as above — otherwise the socket is already open.
- **Using a predictable or long-lived token.** Keep `token_urlsafe` and the
  short TTL.
- **Logging the token value.** Log the rejection reason, not the token.

## How to preserve this control

1. Keep token validation as the first action in the WS handler, before accept.
2. Keep tokens random and short-lived.
3. If deploying multiple backend instances, replace the in-memory map with a
   shared store rather than removing the check.
