"""Application configuration utilities."""
from __future__ import annotations

from functools import lru_cache
from pydantic import BaseModel, Field


class Settings(BaseModel):
    """Runtime configuration loaded from environment variables."""

    database_url: str = Field(default="postgresql+psycopg://postgres:postgres@db:5432/stocksense")
    api_key: str | None = Field(default=None)
    log_level: str = Field(default="INFO")
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])
    cache_ttl_seconds: int = Field(default=600)

    class Config:
        frozen = True


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached application settings instance."""

    from pydantic import SettingsConfigDict
    from pydantic_settings import BaseSettings

    class _EnvSettings(BaseSettings):
        model_config = SettingsConfigDict(env_prefix="STOCKSENSE_", env_file=".env", extra="ignore")

        database_url: str | None = None
        api_key: str | None = None
        log_level: str | None = None
        cors_origins: list[str] | None = None
        cache_ttl_seconds: int | None = None

    env_settings = _EnvSettings()
    base = Settings()

    kwargs: dict[str, object] = {}
    if env_settings.database_url:
        kwargs["database_url"] = env_settings.database_url
    if env_settings.api_key:
        kwargs["api_key"] = env_settings.api_key
    if env_settings.log_level:
        kwargs["log_level"] = env_settings.log_level
    if env_settings.cors_origins:
        kwargs["cors_origins"] = env_settings.cors_origins
    if env_settings.cache_ttl_seconds is not None:
        kwargs["cache_ttl_seconds"] = env_settings.cache_ttl_seconds

    return Settings(**kwargs) if kwargs else base


__all__ = ["Settings", "get_settings"]
