from supabase import create_client, Client
from backend.config import settings

_supabase_client: Client = None
_supabase_anon_client: Client = None

def get_supabase() -> Client:
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = create_client(
            supabase_url=settings.SUPABASE_URL,
            supabase_key=settings.SUPABASE_SERVICE_ROLE_KEY
        )
    return _supabase_client

def get_supabase_anon() -> Client:
    global _supabase_anon_client
    if _supabase_anon_client is None:
        _supabase_anon_client = create_client(
            supabase_url=settings.SUPABASE_URL,
            supabase_key=settings.SUPABASE_ANON_KEY
        )
    return _supabase_anon_client
