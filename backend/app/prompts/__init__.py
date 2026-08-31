"""Prompt modules — one per task, never a single giant prompt."""
from .case_generator import build_case_generator_messages
from .npc_conversation import build_npc_messages
from .narrator import build_narrator_messages
from .hint import build_hint_messages
from .ending import build_ending_messages

__all__ = [
    "build_case_generator_messages",
    "build_npc_messages",
    "build_narrator_messages",
    "build_hint_messages",
    "build_ending_messages",
]
