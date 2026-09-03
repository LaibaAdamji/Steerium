"""
Centralized configuration. Everything comes from environment variables
(loaded from a .env file in local dev). Never hardcode secrets or model
names here.
"""
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- App ---
    APP_NAME: str = "Steerium API"
    ENV: str = "development"
    DEBUG: bool = True

    # --- Database ---
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/steerium"

    # --- CORS ---
    CORS_ORIGINS: str = "http://localhost:5173"

    # --- Auth ---
    # Signs the session cookie. Set a real random value in production
    # (e.g. `python -c "import secrets; print(secrets.token_hex(32))"`).
    SESSION_SECRET: str = "dev-only-insecure-session-secret-change-me"

    # Demo account created by scripts/seed_db.py — non-secret, documented
    # for judges so the golden path can be demoed without signing up.
    DEMO_EMAIL: str = "demo@steerium.app"
    DEMO_PASSWORD: str = "steerium-demo-2026"

    # --- Alibaba Model Studio / AI provider ---
    MODEL_STUDIO_API_KEY: str = ""
    MODEL_STUDIO_BASE_URL: str = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
    MODEL_STUDIO_MODEL: str = "qwen-plus"
    MODEL_STUDIO_EMBEDDING_MODEL: str = "text-embedding-v4"
    # text-embedding-v4 output dimension. Confirm against Alibaba docs before
    # the RAG phase — this drives the pgvector column width and cannot be
    # changed later without a migration.
    EMBEDDING_DIM: int = 1024

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
