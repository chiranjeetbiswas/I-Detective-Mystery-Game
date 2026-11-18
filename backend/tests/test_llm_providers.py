"""Groq provider and the LLM failover chain. No real network calls are made."""
import httpx
import pytest

from app.core.config import get_settings
from app.llm import factory
from app.llm.base import LLMMessage
from app.llm.chain_provider import ChainProvider
from app.llm.groq_provider import GroqError, GroqProvider
from app.llm.mock_provider import MockProvider

MSGS = [LLMMessage("system", "You are a detective."), LLMMessage("user", "Hello")]


def _reply(status=200, body=None):
    body = {"choices": [{"message": {"content": "Elementary."}}]} if body is None else body
    return httpx.Response(status, json=body, request=httpx.Request("POST", "http://x"))


@pytest.fixture()
def sent(monkeypatch):
    """Capture what the provider posts, and let each test choose the reply."""
    box = {"reply": _reply()}

    def fake_post(url, **kwargs):
        box["url"], box["json"], box["headers"] = url, kwargs["json"], kwargs["headers"]
        return box["reply"]

    monkeypatch.setattr(httpx, "post", fake_post)
    return box


# ---- GroqProvider -----------------------------------------------------------
def test_groq_sends_an_openai_style_request(sent):
    out = GroqProvider("gsk_test", "llama-3.3-70b-versatile").complete(
        MSGS, temperature=0.3, max_tokens=50, json_mode=True
    )
    assert out == "Elementary."
    assert sent["url"] == "https://api.groq.com/openai/v1/chat/completions"
    assert sent["headers"]["Authorization"] == "Bearer gsk_test"
    assert sent["json"]["model"] == "llama-3.3-70b-versatile"
    assert sent["json"]["max_tokens"] == 50
    assert sent["json"]["response_format"] == {"type": "json_object"}
    assert sent["json"]["messages"][1] == {"role": "user", "content": "Hello"}
    assert "reasoning_effort" not in sent["json"]


def test_groq_uses_low_reasoning_for_gpt_oss_only(sent):
    GroqProvider("k", "openai/gpt-oss-20b").complete(MSGS)
    assert sent["json"]["reasoning_effort"] == "low"
    assert "response_format" not in sent["json"]


def test_groq_errors_are_raised_not_returned_as_text(sent):
    sent["reply"] = _reply(429, {"error": {"message": "Rate limit reached"}})
    with pytest.raises(GroqError, match="429.*Rate limit reached"):
        GroqProvider("k", "m").complete(MSGS)


def test_groq_empty_reply_is_an_error_so_the_chain_can_fall_through(sent):
    sent["reply"] = _reply(body={"choices": [{"message": {"content": "  "}}]})
    with pytest.raises(GroqError, match="empty content"):
        GroqProvider("k", "m").complete(MSGS)


def test_groq_network_failure_is_wrapped(monkeypatch):
    def boom(*a, **k):
        raise httpx.ConnectError("no route")

    monkeypatch.setattr(httpx, "post", boom)
    with pytest.raises(GroqError, match="request failed"):
        GroqProvider("k", "m").complete(MSGS)


def test_groq_needs_a_key():
    with pytest.raises(ValueError):
        GroqProvider("", "m")


# ---- failover chain ---------------------------------------------------------
class _Boom:
    name = "boom"

    def complete(self, *a, **k):
        raise GroqError("quota used up")


def test_chain_falls_back_to_the_next_provider():
    chain = ChainProvider([_Boom(), MockProvider()])
    assert chain.name == "boom"  # reports its configured primary
    assert chain.complete(MSGS)  # the mock answered


# ---- which providers get picked --------------------------------------------
@pytest.fixture()
def configure(monkeypatch):
    """Set LLM env vars, rebuild settings + provider, and clean up afterwards."""

    def _apply(**env):
        for key in ("AGENTROUTER_API_KEY", "GROQ_API_KEY", "LLM_PROVIDER"):
            monkeypatch.delenv(key, raising=False)
        for key, value in env.items():
            monkeypatch.setenv(key, value)
        get_settings.cache_clear()
        factory.get_provider.cache_clear()
        return factory.get_provider()

    yield _apply
    monkeypatch.undo()
    get_settings.cache_clear()
    factory.get_provider.cache_clear()


def _names(provider):
    return [p.name for p in provider.providers] if isinstance(provider, ChainProvider) else [provider.name]


def test_no_keys_means_mock(configure):
    assert _names(configure()) == ["mock"]


def test_groq_key_alone_gives_groq_then_mock(configure):
    assert _names(configure(GROQ_API_KEY="gsk_x")) == ["groq", "mock"]


def test_auto_chains_agentrouter_then_groq_then_mock(configure):
    p = configure(AGENTROUTER_API_KEY="ar_x", GROQ_API_KEY="gsk_x")
    assert _names(p) == ["agentrouter", "groq", "mock"]


def test_explicit_groq_ignores_agentrouter(configure):
    p = configure(LLM_PROVIDER="groq", AGENTROUTER_API_KEY="ar_x", GROQ_API_KEY="gsk_x")
    assert _names(p) == ["groq", "mock"]


def test_explicit_groq_without_a_key_falls_back_to_mock(configure):
    assert _names(configure(LLM_PROVIDER="groq")) == ["mock"]


def test_explicit_mock_wins_even_with_keys(configure):
    p = configure(LLM_PROVIDER="mock", GROQ_API_KEY="gsk_x", AGENTROUTER_API_KEY="ar_x")
    assert _names(p) == ["mock"]
