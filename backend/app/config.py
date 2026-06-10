"""Application configuration utilities."""
from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration loaded from STOCKSENSE_* environment variables."""

    model_config = SettingsConfigDict(env_prefix="STOCKSENSE_", env_file=".env", extra="ignore", frozen=True)

    database_url: str = Field(default="postgresql+psycopg://postgres:postgres@db:5432/stocksense")
    api_key: str | None = Field(default=None)
    log_level: str = Field(default="INFO")
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])
    cache_ttl_seconds: int = Field(default=600)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached application settings instance."""

    return Settings()


__all__ = ["Settings", "get_settings"]
