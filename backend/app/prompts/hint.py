"""Hint generator prompt — nudges without spoiling the target."""
from __future__ import annotations

from ..models.case import Case
from ..models.game_state import GameState
from .case_generator import SIMPLE_ENGLISH_RULE

HINT_SYSTEM = (
    "You are the HINT engine for Identity Hunt. Give ONE short, useful hint "
    "(1-2 sentences) that helps the player think, but never name the hidden "
    "person and never give away the answer. Point them at comparing stories and "
    "clues, or at a guest they have not talked to yet. Never spoil the answer. "
    f"{SIMPLE_ENGLISH_RULE}"
)


def build_hint_messages(case: Case, state: GameState):
    undiscovered = [
        e.name for e in case.evidence if e.id not in state.discovered_evidence
    ]
    lightly_questioned = [
        case.character_by_id(cid).name  # type: ignore[union-attr]
        for cid, npc in state.npc_states.items()
        if npc.times_questioned == 0
    ]
    ctx = f"""
Difficulty: {case.difficulty.value}
Clues not found yet (count only, do not reveal the hidden person): {len(undiscovered)}
Guests not questioned yet: {lightly_questioned}
Now give one hint in simple English.
"""
    return HINT_SYSTEM, ctx
