"""Groq LLM provider implementation."""
from __future__ import annotations

from ..core.logging import get_logger
from .base import LLMMessage, LLMProvider

log = get_logger(__name__)


class GroqProvider(LLMProvider):
    name = "groq"

    def __init__(self, api_key: str, model: str) -> None:
        # Imported lazily so the app can run mock-only without the SDK installed.
        from groq import Groq

        self._client = Groq(api_key=api_key)
        self._model = model
        log.info("GroqProvider initialised with model=%s", model)

    def complete(
        self,
        messages: list[LLMMessage],
        *,
        temperature: float = 0.8,
        max_tokens: int = 1024,
        json_mode: bool = False,
    ) -> str:
        kwargs: dict = {
            "model": self._model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        resp = self._client.chat.completions.create(**kwargs)
        return resp.choices[0].message.content or ""
