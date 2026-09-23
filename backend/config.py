import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    GEMINI_API_KEY: str
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_ANON_KEY: str = ""
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Shared HMAC secret used to verify the admin session token minted by the
    # Next.js frontend (frontend/src/lib/adminAuth.ts). MUST match the frontend's
    # ADMIN_SESSION_SECRET. Empty by default → the require_admin dependency fails
    # closed (rejects every admin request) until it is configured.
    ADMIN_SESSION_SECRET: str = ""

    # Native-audio Live model. gemini-3.8-live does NOT process microphone audio
    # input on this API (verified: streamed speech returns no transcription),
    # whereas the native-audio model handles real-time audio in + out and still
    # supports function calling and transcription.
    GEMINI_LIVE_MODEL: str = "models/gemini-2.5-flash-native-audio-latest"
    GEMINI_FLASH_LITE_MODEL: str = "models/gemini-3.5-flash-lite"
    GEMINI_EMBEDDING_MODEL: str = "models/gemini-embedding-001"
    EMBEDDING_DIMENSION: int = 768

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(__file__), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

settings = Settings()
