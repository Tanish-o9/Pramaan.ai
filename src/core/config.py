import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME: str = "Presence.ai"
    APP_VERSION: str = "2.0.0"
    ENVIRONMENT: str = "development"
    PORT: int = 8000

    # Supabase Credentials
    SUPABASE_URL: str
    SUPABASE_KEY: str

    # Security & JWT
    JWT_SECRET_KEY: str = "9f8c6b4e1a2d3c5e7b9a0f2e4d6c8b0a1f3e5d7c9b1a3f5e7d9c1b3a5f7e9d1c"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    COOKIE_SECURE: bool = False
    CORS_ORIGINS: str = "http://localhost:8000,http://127.0.0.1:8000,http://localhost:5173"

    # Biometric Model Thresholds
    FACE_MATCH_THRESHOLD: float = 0.60
    LIVENESS_EAR_THRESHOLD: float = 0.16
    LIVENESS_ENABLED: bool = True

    # Feature Flags & pgvector Settings
    ENABLE_PGVECTOR: bool = True
    PGVECTOR_FACE_THRESHOLD: float = 0.60
    PGVECTOR_VOICE_THRESHOLD: float = 0.30
    PGVECTOR_MIN_MARGIN: float = 0.05

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origin_list(self) -> List[str]:
        return [orig.strip() for orig in self.CORS_ORIGINS.split(",") if orig.strip()]

settings = Settings()

