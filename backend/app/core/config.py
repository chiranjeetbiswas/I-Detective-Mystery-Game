"""Application configuration loaded from environment / .env."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # ---- AgentRouter (OpenAI-compatible gateway, e.g. claude-opus-5) ----
    agentrouter_api_key: str = ""
    agentrouter_model: str = "claude-opus-5"
    agentrouter_base_url: str = "https://agentrouter.org/v1"
    # ---- Groq (OpenAI-compatible API, has a free tier) ----
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-20b"
    groq_base_url: str = "https://api.groq.com/openai/v1"
    llm_provider: str = "auto"  # auto | agentrouter | groq | mock
    data_dir: str = "./data"
    # SQLAlchemy URL. Empty = a SQLite file inside data_dir (so the Docker
    # volume keeps accounts across restarts). Set to a postgresql+psycopg://
    # URL to use Postgres instead.
    database_url: str = ""
    # Secret used to sign login tokens. If left empty a random one is made at
    # startup, which is safe but logs everyone out whenever the server restarts.
    jwt_secret: str = ""
    jwt_expire_minutes: int = 60 * 24 * 7
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
    def resolved_database_url(self) -> str:
        if self.database_url.strip():
            return self.database_url.strip()
        return f"sqlite:///{Path(self.data_dir) / 'identity_hunt.db'}"

    @property
    def resolved_provider(self) -> str:
        """Decide which LLM provider to use."""
        if self.llm_provider == "mock":
            return "mock"
        if self.llm_provider == "agentrouter":
            return "agentrouter"
        if self.llm_provider == "groq":
            return "groq"
        # auto: AgentRouter if it has a key, then Groq, else offline mock
        if self.agentrouter_api_key.strip():
            return "agentrouter"
        if self.groq_api_key.strip():
            return "groq"
        return "mock"


@lru_cache
def get_settings() -> Settings:
    return Settings()
