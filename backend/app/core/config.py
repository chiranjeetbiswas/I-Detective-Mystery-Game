"""Application configuration loaded from environment / .env."""
from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # ---- AgentRouter (OpenAI-compatible gateway, e.g. claude-opus-5) ----
    agentrouter_api_key: str = ""
    agentrouter_model: str = "claude-opus-5"
    agentrouter_base_url: str = "https://agentrouter.org/v1"
    llm_provider: str = "auto"  # auto | agentrouter | mock
    data_dir: str = "./data"
    cors_origins: str = "http://localhost:3000"
    # Optional regex to allow origins by pattern (e.g. all Render preview URLs).
    # Defaults to allowing any https *.onrender.com subdomain so the deployed
    # frontend works out of the box; a "Disallowed CORS origin" 400 (which also
    # strips the Access-Control-Allow-Origin header) no longer happens just
    # because CORS_ORIGINS wasn't set on the backend service. Override or clear
    # this env var to restrict access.
    cors_origin_regex: str = r"https://.*\.onrender\.com"

    @property
    def cors_origin_list(self) -> list[str]:
        # Normalize: trim whitespace and strip any trailing slash so an origin
        # configured as "https://app.onrender.com/" still matches the browser's
        # "https://app.onrender.com" Origin header.
        return [
            o.strip().rstrip("/")
            for o in self.cors_origins.split(",")
            if o.strip()
        ]

    @property
    def resolved_provider(self) -> str:
        """Decide which LLM provider to use."""
        if self.llm_provider == "mock":
            return "mock"
        if self.llm_provider == "agentrouter":
            return "agentrouter"
        # auto: prefer AgentRouter, else offline mock
        if self.agentrouter_api_key.strip():
            return "agentrouter"
        return "mock"


@lru_cache
def get_settings() -> Settings:
    return Settings()
