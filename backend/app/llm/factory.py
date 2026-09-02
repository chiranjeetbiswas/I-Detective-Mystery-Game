"""Factory that builds the configured LLM provider."""
from __future__ import annotations

from functools import lru_cache

from ..core.config import get_settings
from ..core.logging import get_logger
from .base import LLMProvider
from .mock_provider import MockProvider

log = get_logger(__name__)


def _try_agentrouter(settings) -> LLMProvider | None:
    if not settings.agentrouter_api_key.strip():
        return None
    try:
        from .agentrouter_provider import AgentRouterProvider

        return AgentRouterProvider(
            settings.agentrouter_api_key,
            settings.agentrouter_model,
            settings.agentrouter_base_url,
        )
    except Exception as exc:  # pragma: no cover - defensive
        log.warning("AgentRouter init failed (%s); skipping it.", exc)
        return None


@lru_cache
def get_provider() -> LLMProvider:
    """Build the provider.

    For the network-backed choice we return a failover chain: the configured
    provider first, then the offline mock. That way an exhausted quota or a
    rate limit degrades the *quality* of the reply instead of turning every
    request into a 500.
    """
    settings = get_settings()
    choice = settings.resolved_provider

    if choice == "mock":
        log.info("Using mock LLM provider (offline).")
        return MockProvider()

    chain: list[LLMProvider] = []
    if choice == "agentrouter":
        chain = [p for p in (_try_agentrouter(settings),) if p]

    if not chain:
        log.warning("No network provider available; using mock provider.")
        return MockProvider()

    chain.append(MockProvider())
    if len(chain) == 1:
        return chain[0]

    from .chain_provider import ChainProvider

    log.info(
        "LLM failover chain: %s", " -> ".join(p.name for p in chain)
    )
    return ChainProvider(chain)
