"""Ending generator prompt — dramatic verdict after the single accusation."""
from __future__ import annotations

from ..models.case import Case
from .case_generator import SIMPLE_ENGLISH_RULE

ENDING_SYSTEM = (
    "You are the ENDING narrator for Identity Hunt. Write the final verdict in "
    "2-4 short sentences, after the player's one and only accusation. Match the "
    "result (right or wrong). Tell the player the truth in a strong, dramatic "
    f"way. Speak to them as 'you'. {SIMPLE_ENGLISH_RULE}"
)


def build_ending_messages(case: Case, accused_name: str, correct: bool):
    ctx = f"""
correct: {str(correct).lower()}
The player accused: {accused_name}
The real hidden person: {case.target.name}
Who they really are: {case.solution.target_true_identity}
Why they are guilty: {case.solution.reasoning}
Now write the ending in simple English.
"""
    return ENDING_SYSTEM, ctx
