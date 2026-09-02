"""Detective interview prompt — an AI teammate plans an autonomous interview.

When the player asks a detective to question a suspect, the detective decides
what to ask ON THEIR OWN. There is NO predefined question list. The LLM writes
2 sharp questions based on what is missing, what contradicts, the evidence,
the emotional reads and the timeline gaps — filtered through this detective's
specialty. Every interview is unique.

The model returns strict JSON so the engine can pose each question to the real
suspect in turn.
"""
from __future__ import annotations

from ..models.case import Case, CharacterProfile
from ..models.game_state import DetectiveState, GameState, NPCState
from .detective_common import (
    detective_memory_block,
    public_case_facts,
    specialty_identity,
)

# "interview plan" is the mock-provider dispatch marker.
DETECTIVE_INTERVIEW_SYSTEM = (
    "You are an AI detective teammate about to run your OWN interview of a "
    "suspect. The Lead Detective asked you to question this person. You decide "
    "what to ask — nobody gives you the questions.\n"
    "\n"
    "Write an interview PLAN as strict JSON, no prose:\n"
    '  "opening": "<one short line you say as you approach the suspect>",\n'
    '  "questions": ["<q1>", "<q2>"],\n'
    '  "goal": "<one short sentence: what you are trying to find out>"\n'
    "\n"
    "RULES:\n"
    "- Exactly 2 questions. Each must be pointed and specific to THIS suspect "
    "and THIS case — never generic filler.\n"
    "- Base every question on real gaps: missing information, contradictions, a "
    "clue that was found, an emotional tell, or a hole in the timeline. Do NOT "
    "invent facts.\n"
    "- Follow your specialty. Psychology: probe feelings, relationships, reactions, "
    "pressure. Logic: probe times, order of events, alibis, physical evidence.\n"
    "- Build on earlier interviews if your notes mention them. Make it unique.\n"
    "- Keep language plain and natural. Output JSON only."
)


def build_detective_interview_messages(
    case: Case,
    state: GameState,
    det: DetectiveState,
    profile: CharacterProfile,
    npc: NPCState,
):
    prior = [e.question for e in npc.exchanges[-6:]]
    prior_block = (
        "\n".join(f"  - {q}" for q in prior if q)
        if any(prior)
        else "  (this suspect has not been questioned much yet)"
    )
    ctx = f"""{specialty_identity(det)}

{public_case_facts(case, state)}

{detective_memory_block(det)}

--- the suspect you will question ---
Name: {profile.name}
Job: {profile.occupation}
Personality (as observed): {profile.personality}
Speaking style: {profile.speaking_style or "plain"}
Questions they were already asked before:
{prior_block}

Plan your interview of {profile.name} now. Return JSON only.
"""
    return DETECTIVE_INTERVIEW_SYSTEM, ctx
