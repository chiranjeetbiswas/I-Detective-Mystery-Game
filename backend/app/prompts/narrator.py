"""Narrator prompt — describes searches, observations, movement, environment."""
from __future__ import annotations

from ..models.case import Case
from ..models.game_state import GameState
from .case_generator import SIMPLE_ENGLISH_RULE

NARRATOR_SYSTEM = (
    "You are the NARRATOR of the detective game Identity Hunt. Write 1-3 short "
    "sentences that speak to the player as 'You...'. Keep the mood dark and "
    "tense, but keep the words plain. Describe only what the detective can see, "
    "hear or smell, using the facts you are given. Never invent a new guilty "
    "person and never break the story you are given. No speech from other "
    f"people. {SIMPLE_ENGLISH_RULE}"
)


def build_narrator_messages(
    case: Case,
    state: GameState,
    player_text: str,
    revealed_evidence_names: list[str] | None = None,
    location: str = "",
):
    revealed = revealed_evidence_names or []
    ctx = f"""
Place: {location or state.current_location or case.location_name}
Setting: {case.location_type.value} — {case.location_name}
What the detective does: "{player_text}"
New clues just spotted (mention them plainly if there are any): {revealed}
Stay inside this scene. Now write it in simple English.
"""
    return NARRATOR_SYSTEM, ctx
