"""
In-memory rate limiting and WebSocket concurrency control for Aura.

Zero external dependencies — uses only the Python standard library
(`time`, `collections.deque`, `asyncio.Lock`). Designed for a single-instance
FastAPI/uvicorn deployment (local or one server). It is intentionally NOT a
distributed limiter: state lives in this process only. A multi-instance
production deployment would move this to a shared store (e.g. Redis) — see
docs/security/doc-rate-limiting-and-abuse.md.

Algorithm: sliding-window log. For each (scope, ip) key we keep a deque of
request timestamps; on each request we drop timestamps older than the window
and reject once the count reaches the limit. This gives an exact "N requests
per W seconds" guarantee with no boundary bursting (unlike fixed windows).

Timestamps use time.monotonic() so the limiter is immune to wall-clock changes.
"""

import asyncio
import time
from collections import defaultdict, deque
from typing import Deque, Dict, Tuple

from fastapi import HTTPException, Request

# How often (seconds) to sweep the whole store for stale buckets.
_CLEANUP_INTERVAL_SECONDS = 60
# Buckets whose newest timestamp is older than this are discarded entirely so
# memory never grows unbounded over long runtimes.
_STALE_SECONDS = 600  # 10 minutes


def get_client_ip(conn) -> str:
    """
    Extract the client IP from a Starlette Request *or* WebSocket.

    Both expose `.headers` (with `.get`) and `.client`. Behind a reverse proxy
    the real client is the first entry of `X-Forwarded-For`; direct connections
    fall back to `request.client.host`. Returns "unknown" only if neither is
    available (which collapses all such callers into one shared bucket — safe,
    just conservative).
    """
    try:
        xff = conn.headers.get("x-forwarded-for")
    except Exception:
        xff = None
    if xff:
        first = xff.split(",")[0].strip()
        if first:
            return first
    client = getattr(conn, "client", None)
    if client and getattr(client, "host", None):
        return client.host
    return "unknown"


class _SlidingWindowStore:
    """Shared, process-wide sliding-window counters guarded by an asyncio.Lock."""

    def __init__(self) -> None:
        self._hits: Dict[str, Deque[float]] = defaultdict(deque)
        self._lock = asyncio.Lock()
        self._last_cleanup = time.monotonic()

    async def hit(self, key: str, max_requests: int, window_seconds: int) -> Tuple[bool, int]:
        """
        Record an attempt for `key`. Returns (allowed, retry_after_seconds).

        When rejected, retry_after is how long until the oldest in-window
        request ages out — i.e. when a slot next frees up.
        """
        now = time.monotonic()
        async with self._lock:
            dq = self._hits[key]
            cutoff = now - window_seconds
            while dq and dq[0] <= cutoff:
                dq.popleft()

            if len(dq) >= max_requests:
                # Oldest timestamp + window = when the next slot opens.
                retry_after = int(dq[0] + window_seconds - now) + 1
                self._maybe_cleanup(now)
                return False, max(retry_after, 1)

            dq.append(now)
            self._maybe_cleanup(now)
            return True, 0

    def _maybe_cleanup(self, now: float) -> None:
        """Periodically drop stale timestamps and empty buckets. Caller holds the lock."""
        if now - self._last_cleanup < _CLEANUP_INTERVAL_SECONDS:
            return
        self._last_cleanup = now
        stale_cutoff = now - _STALE_SECONDS
        empty_keys = []
        for key, dq in self._hits.items():
            while dq and dq[0] <= stale_cutoff:
                dq.popleft()
            if not dq:
                empty_keys.append(key)
        for key in empty_keys:
            del self._hits[key]


# Single process-wide store shared by every RateLimiter instance.
_store = _SlidingWindowStore()


class RateLimiter:
    """
    FastAPI dependency that enforces `max_requests` per `window_seconds` per IP.

    Usage:
        @app.post("/api/live/token", dependencies=[Depends(RateLimiter(5, 60))])

    Parameters
    ----------
    max_requests : int
        Sustained allowance within the window. This is the enforced hard cap
        unless `burst` is provided.
    window_seconds : int
        Rolling window length in seconds.
    scope : str | None
        Logical bucket name. Endpoints sharing a scope share one budget per IP.
        Defaults to the request path (each path limited independently).
    burst : int | None
        Optional higher ceiling for short spikes. When set, the enforced cap is
        `burst`; `max_requests` is then the advertised sustained rate. Left unset
        for the Gemini token endpoint so the strict sustained cap applies (the
        billing-sensitive default).
    """

    def __init__(
        self,
        max_requests: int,
        window_seconds: int,
        *,
        scope: str | None = None,
        burst: int | None = None,
    ) -> None:
        self.limit = burst if burst is not None else max_requests
        self.window_seconds = window_seconds
        self.scope = scope

    async def __call__(self, request: Request) -> None:
        ip = get_client_ip(request)
        scope = self.scope or request.url.path
        key = f"{scope}:{ip}"
        allowed, retry_after = await _store.hit(key, self.limit, self.window_seconds)
        if not allowed:
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded. Please wait a moment before trying again.",
                headers={"Retry-After": str(retry_after)},
            )


# ---------------------------------------------------------------------------
# WebSocket concurrency control
# ---------------------------------------------------------------------------
# Cap simultaneous Live audio sessions per IP. Each session holds an open
# upstream Gemini Live socket (billable), so unbounded concurrency is the main
# quota-exhaustion risk. Slots are acquired BEFORE websocket.accept() and always
# released in the endpoint's finally block.

MAX_WS_PER_IP = 5
ACTIVE_WS_PER_IP: Dict[str, int] = defaultdict(int)
_ws_lock = asyncio.Lock()


async def try_acquire_ws_slot(ip: str) -> bool:
    """Reserve a WebSocket slot for `ip`. Returns False if the per-IP cap is reached."""
    async with _ws_lock:
        if ACTIVE_WS_PER_IP[ip] >= MAX_WS_PER_IP:
            return False
        ACTIVE_WS_PER_IP[ip] += 1
        return True


async def release_ws_slot(ip: str) -> None:
    """Release a previously acquired WebSocket slot. Safe to call once per acquire."""
    if not ip:
        return
    async with _ws_lock:
        if ACTIVE_WS_PER_IP.get(ip, 0) > 0:
            ACTIVE_WS_PER_IP[ip] -= 1
        if ACTIVE_WS_PER_IP.get(ip, 0) <= 0:
            ACTIVE_WS_PER_IP.pop(ip, None)
