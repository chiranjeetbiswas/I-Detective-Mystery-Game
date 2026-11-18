"""Groq LLM provider.

Groq (https://groq.com) serves an OpenAI-compatible ``/chat/completions`` API,
so we call it with plain ``httpx`` instead of the ``groq`` SDK. That keeps the
dependency list unchanged and avoids the SDK version mismatches that once broke
deployments.

Every failure is raised as ``GroqError`` (bad key, rate limit, network, empty
reply) so the surrounding failover chain can move on to the next provider.
"""
from __future__ import annotations

from ..core.logging import get_logger
from .base import LLMMessage, LLMProvider

log = get_logger(__name__)

DEFAULT_BASE_URL = "https://api.groq.com/openai/v1"


class GroqError(RuntimeError):
    """Raised when Groq refuses or fails a request."""


class GroqProvider(LLMProvider):
    name = "groq"

    def __init__(
        self,
        api_key: str,
        model: str,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = 120.0,
    ) -> None:
        if not api_key:
            raise ValueError("Groq API key is required")
        self._api_key = api_key
        self._model = model
        self._base_url = (base_url or DEFAULT_BASE_URL).strip().rstrip("/")
        self._timeout = timeout
        log.info("GroqProvider initialised with model=%s", model)

    def complete(
        self,
        messages: list[LLMMessage],
        *,
        temperature: float = 0.8,
        max_tokens: int = 1024,
        json_mode: bool = False,
    ) -> str:
        import httpx

        payload: dict = {
            "model": self._model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        # gpt-oss models are reasoning models: left alone they can spend the
        # whole token budget on hidden reasoning and return empty content.
        # Low effort keeps them answering.
        if "gpt-oss" in self._model:
            payload["reasoning_effort"] = "low"
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        try:
            resp = httpx.post(
                f"{self._base_url}/chat/completions",
                json=payload,
                headers={
                    "Authorization": f"Bearer {self._api_key}",
                    "Content-Type": "application/json",
                },
                timeout=self._timeout,
            )
        except httpx.HTTPError as exc:  # network / DNS / timeout
            raise GroqError(f"Groq request failed: {exc}") from exc

        if resp.status_code >= 400:
            raise GroqError(f"Groq HTTP {resp.status_code}: {_error_text(resp)}")

        try:
            data = resp.json()
        except ValueError as exc:
            raise GroqError("Groq returned a non-JSON body") from exc

        choices = data.get("choices") or []
        if not choices:
            raise GroqError(f"Groq returned no choices: {str(data)[:200]}")

        content = ((choices[0].get("message") or {}).get("content") or "").strip()
        if content:
            return content
        raise GroqError(
            f"Groq model '{self._model}' returned empty content "
            f"(finish_reason={choices[0].get('finish_reason')})."
        )


def _error_text(resp) -> str:
    """Pull the most useful message out of an error response."""
    try:
        body = resp.json()
    except ValueError:
        return resp.text[:200]
    err = body.get("error")
    if isinstance(err, dict) and err.get("message"):
        return str(err["message"])[:300]
    return str(body)[:300]
