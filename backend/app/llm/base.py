"""LLM provider interface — adapter pattern.

Implement ``LLMProvider`` for any backend (AgentRouter, OpenAI, local, ...). The rest
of the app depends only on this interface, never on a concrete SDK.
"""
from __future__ import annotations

import abc
import json
import re
from dataclasses import dataclass


@dataclass
class LLMMessage:
    role: str  # system | user | assistant
    content: str


class LLMProvider(abc.ABC):
    """Abstract chat-completion provider."""

    name: str = "base"

    @abc.abstractmethod
    def complete(
        self,
        messages: list[LLMMessage],
        *,
        temperature: float = 0.8,
        max_tokens: int = 1024,
        json_mode: bool = False,
    ) -> str:
        """Return the assistant text for the given messages."""
        raise NotImplementedError

    # -- shared helpers -------------------------------------------------------
    @staticmethod
    def extract_json(text: str) -> dict:
        """Best-effort extraction of a JSON object from a model response."""
        text = text.strip()
        # strip code fences
        text = re.sub(r"^```(?:json)?", "", text).strip()
        text = re.sub(r"```$", "", text).strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
        # fallback: grab the outermost {...}
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            return json.loads(text[start : end + 1])
        raise ValueError("No JSON object found in LLM response")
