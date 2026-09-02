"""Failover chain across several providers.

Tries each provider in order and returns the first successful completion. This
keeps the game playable when the preferred model is temporarily unusable — an
exhausted budget pool, a rate limit, a network blip — without every call site
having to know about fallbacks.

The chain reports the name of its primary provider so ``/api/health`` still
shows what the game is *configured* to use.
"""
from __future__ import annotations

from ..core.logging import get_logger
from .base import LLMMessage, LLMProvider

log = get_logger(__name__)


class ChainProvider(LLMProvider):
    def __init__(self, providers: list[LLMProvider]) -> None:
        if not providers:
            raise ValueError("ChainProvider needs at least one provider")
        self._providers = providers
        self.name = providers[0].name

    @property
    def providers(self) -> list[LLMProvider]:
        return list(self._providers)

    def complete(
        self,
        messages: list[LLMMessage],
        *,
        temperature: float = 0.8,
        max_tokens: int = 1024,
        json_mode: bool = False,
    ) -> str:
        last_exc: Exception | None = None
        for i, provider in enumerate(self._providers):
            try:
                text = provider.complete(
                    messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    json_mode=json_mode,
                )
                # An empty reply is not useful; treat it as a failure so the next
                # provider gets a chance (the last one's result is kept as-is).
                if text.strip() or i == len(self._providers) - 1:
                    return text
                last_exc = RuntimeError(f"{provider.name} returned empty content")
            except Exception as exc:
                last_exc = exc
                nxt = (
                    self._providers[i + 1].name
                    if i + 1 < len(self._providers)
                    else "(none left)"
                )
                log.warning(
                    "Provider '%s' failed (%s); falling back to '%s'.",
                    provider.name,
                    exc,
                    nxt,
                )
        raise last_exc if last_exc else RuntimeError("All providers failed")
