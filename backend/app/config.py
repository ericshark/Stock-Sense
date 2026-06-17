"""Application configuration utilities."""
from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def normalize_database_url(url: str) -> str:
    """Use the installed psycopg v3 driver for plain PostgreSQL URLs."""
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


class Settings(BaseSettings):
    """Runtime configuration loaded from STOCKSENSE_* environment variables."""

    model_config = SettingsConfigDict(env_prefix="STOCKSENSE_", env_file=".env", extra="ignore", frozen=True)

    database_url: str = Field(default="postgresql+psycopg://postgres:postgres@db:5432/stocksense")
    api_key: str | None = Field(default=None)
    log_level: str = Field(default="INFO")
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])
    cache_ttl_seconds: int = Field(default=600)

    @field_validator("database_url")
    @classmethod
    def use_installed_postgres_driver(cls, value: str) -> str:
        return normalize_database_url(value)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached application settings instance."""

    return Settings()


__all__ = ["Settings", "get_settings"]
