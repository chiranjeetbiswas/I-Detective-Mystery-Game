"""Factory that builds the configured LLM provider."""
from __future__ import annotations

from functools import lru_cache

from ..core.config import get_settings
from ..core.logging import get_logger
from .base import LLMProvider
from .mock_provider import MockProvider

log = get_logger(__name__)


@lru_cache
def get_provider() -> LLMProvider:
    settings = get_settings()
    choice = settings.resolved_provider
    if choice == "groq":
        try:
            from .groq_provider import GroqProvider

            return GroqProvider(settings.groq_api_key, settings.groq_model)
        except Exception as exc:  # pragma: no cover - defensive fallback
            log.warning("Groq init failed (%s); falling back to mock provider", exc)
            return MockProvider()
    log.info("Using mock LLM provider (offline).")
    return MockProvider()
