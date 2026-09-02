"""Detective report prompt — findings after an autonomous interview.

When a detective finishes questioning a suspect, they report back to the Lead
Detective. The report is grounded in what was just said plus prior memory, and
must explain the reasoning behind every conclusion. It never invents clues.
"""
from __future__ import annotations

from ..models.case import Case, CharacterProfile
from ..models.game_state import DetectiveState, GameState
from .case_generator import SIMPLE_ENGLISH_RULE
from .detective_common import (
    detective_memory_block,
    public_case_facts,
    specialty_identity,
)

# "investigation report" is the mock-provider dispatch marker.
DETECTIVE_REPORT_SYSTEM = (
    "You are an AI detective teammate reporting back after interviewing a "
    "suspect. Speak to the Lead Detective as a colleague.\n"
    "\n"
    "Give a SHORT summary — 1 to 2 sentences, maximum 40 words. No lists, no "
    "headings. Just the single most important thing you learned and, if there "
    "is one, a brief reason or one next step.\n"
    "\n"
    "RULES:\n"
    "1. Use ONLY the interview you just ran and your own notes. Never invent "
    "clues or statements.\n"
    "2. Keep it tight — one key finding, briefly why. Do not list every point.\n"
    "3. Stay in your specialty voice (behaviour/emotion vs timeline/logic).\n"
    "4. If nothing useful came up, say so in one short line.\n"
    f"{SIMPLE_ENGLISH_RULE} Speech only, no stage directions."
)


def build_detective_report_messages(
    case: Case,
    state: GameState,
    det: DetectiveState,
    profile: CharacterProfile,
    interview_lines: list[tuple[str, str]],
):
    transcript = "\n".join(
        f"  You asked: \"{q}\"\n  {profile.name} said: \"{a}\"" for q, a in interview_lines
    ) or "  (the suspect said very little)"
    ctx = f"""{specialty_identity(det)}

{public_case_facts(case, state)}

{detective_memory_block(det)}

--- the interview you just finished with {profile.name} ---
{transcript}

Now give the lead detective your SHORT summary (1-2 sentences, max 40 words).
"""
    return DETECTIVE_REPORT_SYSTEM, ctx
