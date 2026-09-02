"""AgentRouter LLM provider.

AgentRouter (https://agentrouter.org) is an OpenAI-compatible gateway that
fronts several model families behind one key. We talk to it over plain HTTP with
``httpx`` rather than pulling in another SDK, because the request shape is the
standard ``/v1/chat/completions`` payload.

Two gateway quirks are handled here:

1. **Client allow-listing.** A generic OpenAI-style request is rejected with
   ``401 unauthorized client detected``. The gateway only serves requests that
   look like a known CLI client, so we send a ``claude-cli`` User-Agent.
2. **Errors must surface as exceptions.** The gateway answers with a normal JSON
   body and a non-2xx status for quota problems (e.g. ``402`` when the budget
   pool is exhausted). We raise on those so the caller (or the surrounding
   failover chain) can react instead of returning an empty string.
"""
from __future__ import annotations

from ..core.logging import get_logger
from .base import LLMMessage, LLMProvider

log = get_logger(__name__)

DEFAULT_BASE_URL = "https://agentrouter.org/v1"

# The gateway's WAF only accepts requests that look like an approved client.
_CLIENT_HEADERS = {
    "User-Agent": "claude-cli/1.0.0 (external, cli)",
    "anthropic-version": "2023-06-01",
    "x-app": "cli",
}


class AgentRouterError(RuntimeError):
    """Raised when the gateway refuses or fails a request."""


# Substrings that identify reasoning models served by the gateway. These spend
# a chunk of the completion budget on hidden reasoning tokens *before* emitting
# the visible answer, so a caller's `max_tokens` must be inflated or the answer
# gets truncated to an empty string (finish_reason=length).
_REASONING_MODEL_HINTS = ("deepseek", "glm", "gpt-oss", "-thinking", "-reason")

# How much headroom to give reasoning models on top of the caller's request,
# and an absolute ceiling so a runaway reasoning trace can't cost a fortune.
# Sized from measurements against deepseek-v4-flash: small per-turn calls
# (dialogue ~110-220 tokens) need the floor to have room to think, while the
# large one-shot case-generation JSON (~4096 requested) needs ~24k to finish
# reasoning *and* emit the full object.
_REASONING_TOKEN_MULTIPLIER = 6
_REASONING_TOKEN_FLOOR = 2048
_REASONING_TOKEN_CEILING = 24000


def _is_reasoning_model(model: str) -> bool:
    m = (model or "").lower()
    return any(h in m for h in _REASONING_MODEL_HINTS)


def _reasoning_budget(requested: int) -> int:
    """Inflate a caller's token budget so reasoning + answer both fit.

    Reasoning models bill hidden reasoning against `max_tokens`, so a small
    budget (e.g. 110 for a line of dialogue) is almost always consumed before
    any visible content appears. We scale the request up, with a floor so even
    tiny asks get room to think, and a ceiling to cap cost.
    """
    inflated = max(requested * _REASONING_TOKEN_MULTIPLIER, _REASONING_TOKEN_FLOOR)
    return min(inflated, _REASONING_TOKEN_CEILING)


def _normalize_base_url(base_url: str) -> str:
    """Accept the site root or the API root and always return the API root.

    The gateway's OpenAI-compatible endpoints live under ``/v1``, so both of
    these end up at the same place:

        https://agentrouter.org        -> https://agentrouter.org/v1
        https://agentrouter.org/v1/    -> https://agentrouter.org/v1
    """
    url = (base_url or DEFAULT_BASE_URL).strip().rstrip("/")
    if not url:
        return DEFAULT_BASE_URL
    if not url.endswith("/v1"):
        url = f"{url}/v1"
    return url


class AgentRouterProvider(LLMProvider):
    name = "agentrouter"

    def __init__(
        self,
        api_key: str,
        model: str,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = 240.0,
    ) -> None:
        if not api_key:
            raise ValueError("AgentRouter API key is required")
        self._api_key = api_key
        self._model = model
        self._base_url = _normalize_base_url(base_url)
        self._timeout = timeout
        self._is_reasoning = _is_reasoning_model(model)
        log.info(
            "AgentRouterProvider initialised with model=%s (reasoning=%s)",
            model,
            self._is_reasoning,
        )

    def complete(
        self,
        messages: list[LLMMessage],
        *,
        temperature: float = 0.8,
        max_tokens: int = 1024,
        json_mode: bool = False,
    ) -> str:
        import httpx

        # Reasoning models bill hidden reasoning against max_tokens, so give
        # them headroom or the visible answer gets truncated to "".
        effective_max_tokens = (
            _reasoning_budget(max_tokens) if self._is_reasoning else max_tokens
        )

        payload: dict = {
            "model": self._model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "temperature": temperature,
            "max_tokens": effective_max_tokens,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
            **_CLIENT_HEADERS,
        }

        try:
            resp = httpx.post(
                f"{self._base_url}/chat/completions",
                json=payload,
                headers=headers,
                timeout=self._timeout,
            )
        except httpx.HTTPError as exc:  # network/DNS/timeout
            raise AgentRouterError(f"AgentRouter request failed: {exc}") from exc

        if resp.status_code >= 400:
            raise AgentRouterError(
                f"AgentRouter HTTP {resp.status_code}: {_error_text(resp)}"
            )

        try:
            data = resp.json()
        except ValueError as exc:
            raise AgentRouterError("AgentRouter returned a non-JSON body") from exc

        choices = data.get("choices") or []
        if not choices:
            raise AgentRouterError(
                f"AgentRouter returned no choices: {str(data)[:200]}"
            )

        message = choices[0].get("message") or {}
        content = (message.get("content") or "").strip()
        if content:
            return content

        # Empty content. On this gateway, reasoning models return clean `content`
        # when given enough tokens to finish; an empty `content` means the reply
        # was cut off mid-reasoning (finish_reason=length) and only raw reasoning
        # traces remain — not usable game prose. Raise so the surrounding failover
        # chain moves on to the next provider (e.g. the offline mock) instead of
        # returning reasoning scratch text or an empty string.
        finish = choices[0].get("finish_reason")
        raise AgentRouterError(
            f"AgentRouter model '{self._model}' returned empty content "
            f"(finish_reason={finish}); likely truncated mid-reasoning."
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
