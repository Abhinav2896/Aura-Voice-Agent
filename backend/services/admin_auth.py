"""
Backend verification of the admin session token.

The Next.js frontend mints an HMAC-SHA256 session token (see
frontend/src/lib/adminAuth.ts) and stores it in an httpOnly cookie. That cookie
is scoped to the Next.js origin and never reaches FastAPI, so the browser
obtains a copy of the token from a Next server route (/api/admin/token) and
sends it to the backend as the `X-Admin-Token` header (or `Authorization:
Bearer`). This module verifies that token with the SAME shared secret
(`ADMIN_SESSION_SECRET`), so the backend independently enforces admin access
instead of trusting the client-side proxy gate.

Token format (must match the frontend exactly):
    token       = "<payload_b64url>.<sig_hex>"
    payload_b64 = base64url( JSON({"user": <str>, "exp": <unix_seconds>}) )   # no padding
    sig_hex     = hex( HMAC_SHA256(secret, payload_b64) )
"""

import base64
import hashlib
import hmac
import json
import logging
import time
from typing import Optional

from fastapi import Header, HTTPException, status

from backend.config import settings

logger = logging.getLogger("aura.admin_auth")

_CLOCK_SKEW_SECONDS = 5


def _b64url_decode(data: str) -> bytes:
    # Restore padding stripped by base64url encoding.
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def verify_admin_token(token: Optional[str]) -> bool:
    """Return True iff `token` is a validly-signed, unexpired admin session token."""
    secret = settings.ADMIN_SESSION_SECRET
    if not secret:
        # Fail closed: without a configured shared secret the backend cannot
        # verify anything, so no request is treated as admin.
        logger.error("ADMIN_SESSION_SECRET is not set; rejecting all admin requests.")
        return False
    if not token:
        return False

    parts = token.split(".")
    if len(parts) != 2:
        return False
    payload_b64, sig_hex = parts
    if not payload_b64 or not sig_hex or len(sig_hex) != 64:
        return False

    try:
        expected_sig = hmac.new(
            secret.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256
        ).hexdigest()
        # Constant-time comparison.
        if not hmac.compare_digest(expected_sig, sig_hex.lower()):
            return False

        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
        exp = payload.get("exp")
        if not isinstance(exp, (int, float)):
            return False
        return exp > time.time() - _CLOCK_SKEW_SECONDS
    except Exception as e:
        logger.debug(f"Admin token verification failed: {e}")
        return False


async def require_admin(
    x_admin_token: Optional[str] = Header(None),
    authorization: Optional[str] = Header(None),
) -> None:
    """
    FastAPI dependency enforcing a valid admin session token.

    Accepts the token via `X-Admin-Token` or `Authorization: Bearer <token>`.
    Raises 403 if missing/invalid/expired. Applied to admin-only endpoints so a
    client cannot reach them by calling FastAPI directly, bypassing the Next.js
    proxy gate.
    """
    token = x_admin_token
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[1].strip()

    if not verify_admin_token(token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin authorization required.",
        )
