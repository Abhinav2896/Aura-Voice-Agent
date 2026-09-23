from typing import Optional, Dict, Any
import logging
from fastapi import Header, HTTPException, status
from backend.db.supabase import get_supabase_anon

logger = logging.getLogger("aura.auth")

async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    FastAPI dependency that enforces a valid Supabase JWT Bearer token.
    Returns dict with user_id, email, and user_metadata.
    Raises 401 if token is missing, invalid, or expired.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header"
        )
    
    token = authorization.split("Bearer ", 1)[1].strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token"
        )
        
    try:
        supabase_anon = get_supabase_anon()
        user_response = supabase_anon.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired session token"
            )
            
        user = user_response.user
        return {
            "user_id": user.id,
            "email": user.email,
            "user_metadata": user.user_metadata or {}
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Failed to verify JWT with Supabase: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

async def get_optional_user(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    """
    FastAPI dependency that optionally validates a Supabase JWT Bearer token.
    Returns dict with user_id if valid, or None if missing or invalid.
    Never raises 401.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None
        
    token = authorization.split("Bearer ", 1)[1].strip()
    if not token:
        return None
        
    try:
        supabase_anon = get_supabase_anon()
        user_response = supabase_anon.auth.get_user(token)
        if user_response and user_response.user:
            user = user_response.user
            return {
                "user_id": user.id,
                "email": user.email,
                "user_metadata": user.user_metadata or {}
            }
    except Exception as e:
        logger.debug(f"Optional auth check returned no user: {e}")
        
    return None
