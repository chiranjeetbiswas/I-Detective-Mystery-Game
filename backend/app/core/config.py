"""Application configuration loaded from environment / .env."""
from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    llm_provider: str = "auto"  # auto | groq | mock
    data_dir: str = "./data"
    cors_origins: str = "http://localhost:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def resolved_provider(self) -> str:
        """Decide which LLM provider to use."""
        if self.llm_provider == "mock":
            return "mock"
        if self.llm_provider == "groq":
            return "groq"
        # auto: use groq if a key exists, otherwise mock
        return "groq" if self.groq_api_key.strip() else "mock"


@lru_cache
def get_settings() -> Settings:
    return Settings()
