# Rate Limiting and Abuse Controls

## Problem

Three abuse vectors sit on Aura's public surface:

1. **Gemini quota exhaustion.** Every `POST /api/live/token` leads to a
   billable Gemini Live session. Flooding token requests — or opening many
   concurrent WebSockets — can run up charges and starve real callers.
2. **Reference-code enumeration.** `POST /api/guest/lookup` takes a
   human-readable reference id (`#APT-1234`) plus a phone. Unlimited attempts
   let an attacker brute-force the second factor.
3. **General API hammering.** The read/admin endpoints can be scraped or
   flooded.

## The invariant

> **Every public endpoint enforces a per-client-IP request budget, and the Live
> WebSocket enforces a per-IP concurrency cap. All limits are in-memory,
> dependency-free, and fail closed with HTTP 429 (REST) or close code 1008
> (WebSocket).**

## Limits enforced

| Surface | Limit | On exceed |
|---|---|---|
| `POST /api/live/token` | 5 requests / 60s per IP | HTTP 429 + `Retry-After` |
| `POST /api/guest/lookup` | 10 requests / 60s per IP | HTTP 429 + `Retry-After` |
| General REST (`/api/calls`, `/api/appointments`, `/api/prescriptions`, `/api/dashboard/*`, `/api/calls-volume`) | 60 requests / 60s per IP (shared budget) | HTTP 429 + `Retry-After` |
| `WS /api/live/ws` | 2 concurrent sessions per IP | `close(1008)` **before** accept |

The token limit is the tightest because it gates the billable session. It is a
**strict** 5/60s — the 6th rapid request from an IP is rejected. (The limiter
supports an optional `burst` ceiling, but the token endpoint intentionally does
not use it: billing safety wins over spike tolerance.)

## Algorithm: sliding-window log

Implemented in `backend/services/rate_limiter.py` with the standard library
only (`time`, `collections.deque`, `asyncio.Lock`) — no Redis, no Celery.

- For each `(scope, ip)` key, a `deque` holds the monotonic timestamps of recent
  requests.
- On each request: drop timestamps older than the window, then reject if the
  remaining count has reached the limit, otherwise append `now`.
- This gives an exact "N per W seconds" guarantee with no fixed-window boundary
  bursting (where 2N requests can slip through across a window edge).
- `time.monotonic()` is used, so the limiter is immune to wall-clock changes.

### HTTP 429 response

```python
raise HTTPException(
    status_code=429,
    detail="Rate limit exceeded. Please wait a moment before trying again.",
    headers={"Retry-After": str(retry_after_seconds)},
)
```

`Retry-After` is computed as *(oldest in-window timestamp + window) − now*,
i.e. the number of seconds until a slot next frees up (always ≥ 1).

## Client IP resolution

`get_client_ip()` reads the **first** hop of `X-Forwarded-For` (the real client
behind a reverse proxy), falling back to `request.client.host` for direct
connections, and `"unknown"` if neither is present. Works for both HTTP requests
and WebSocket connections (both expose `.headers` and `.client`).

> **Deployment note:** `X-Forwarded-For` is client-settable, so trust it only
> behind a proxy that overwrites it. For local development there is no proxy and
> the fallback (`127.0.0.1`) is used — which is correct.

## Memory hygiene

The store sweeps itself at most once per 60s (guarded by the same lock): it
drops timestamps older than 10 minutes and deletes any now-empty IP buckets, so
memory does not grow over long runtimes even under churn of many distinct IPs.

## WebSocket concurrency

`ACTIVE_WS_PER_IP` (a `defaultdict(int)` behind an `asyncio.Lock`) tracks live
sessions per IP. In `live_websocket_endpoint`:

1. Validate the session token (pre-existing gate).
2. `try_acquire_ws_slot(ip)` — if the IP already holds 2 sessions, `close(1008)`
   **before** `accept()`; no upstream Gemini socket is opened.
3. Immediately wrap the accepted connection and all downstream operations in a
   `try: ... finally:` block where `release_ws_slot(ip)` is guaranteed to run.
   This prevents slot leaks even if `accept()` fails, client disconnects prematurely,
   or post-call processing raises an exception.

## Scope and limits of this design

- **Single-instance only.** State is per-process. Two backend instances would
  each track their own counters. A multi-instance production deployment should
  move this to a shared store (e.g. Redis) — the interface is small enough to
  swap without touching endpoints.
- **Not a DDoS defense.** This protects quota and blunts brute-force; volumetric
  network attacks belong at the edge (CDN / reverse proxy / WAF).
- **IP-based.** Callers behind a shared NAT share a budget. The limits are set
  generously enough that normal use is unaffected.

## Common failure modes to avoid

- **Omitting `Request` type hint in `RateLimiter.__call__`:** FastAPI inspects
  parameter types. If `request` is untyped (`def __call__(self, request)`),
  FastAPI misinterprets it as a required query parameter (`?request=...`) and
  fails every request with `422 Unprocessable Entity`. It must be typed as
  `async def __call__(self, request: Request) -> None:`.
- **Seeding the token endpoint with a burst.** Keep it strict 5/60s.
- **Acquiring the WS slot after `accept()`.** Acquire before; otherwise the
  socket (and possibly the upstream) is already open.
- **Placing `try:` after `accept()`.** The `try: ... finally:` block must wrap
  around `await websocket.accept()`. If the socket disconnects during handshake,
  a slot would otherwise be leaked permanently.
- **Trusting `X-Forwarded-For` without a proxy that sets it** — an attacker
  could spoof it to dodge the limit. Fine locally; gate on a trusted proxy in
  production.

## How to preserve this control

1. New public endpoints get a `Depends(RateLimiter(...))` with a sensible scope.
2. Ensure `RateLimiter.__call__` keeps the `request: Request` type annotation.
3. Keep the token endpoint's strict cap and the WS acquire-before-accept order.
4. Keep the `try: ... finally: await release_ws_slot(ip)` wrapping around the WebSocket session.
5. If you deploy more than one backend instance, replace the in-memory store
   with a shared one rather than removing the limiter.
