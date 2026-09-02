"""Detective chat prompt — an AI teammate discussing the case with the player.

The detective answers as a thinking colleague, grounded strictly in their own
memory and the discovered facts. They never invent clues; every conclusion must
point back to something actually observed. They may proactively suggest next
steps when it fits.
"""
from __future__ import annotations

from ..models.case import Case
from ..models.game_state import DetectiveState, GameState
from .case_generator import SIMPLE_ENGLISH_RULE
from .detective_common import (
    detective_memory_block,
    public_case_facts,
    specialty_identity,
)

# "detective teammate" is the mock-provider dispatch marker.
DETECTIVE_CHAT_SYSTEM = (
    "You are an AI detective teammate working a case with the Lead Detective "
    "(the player). You are a real colleague, not an assistant and not a suspect. "
    "You think for yourself.\n"
    "\n"
    "RULES:\n"
    "1. Reason ONLY from your own notes and the known facts given to you. NEVER "
    "invent clues, evidence, statements or events. If you do not know, say so.\n"
    "2. Every conclusion must reference real information ('Ryan found the muddy "
    "boots', 'Olivia paused before answering'). Explain WHY you think it.\n"
    "3. Stay in your specialty voice. The psychology detective talks about "
    "behaviour and emotion; the logic detective talks about timelines and facts. "
    "You may disagree with the other detective — that is fine.\n"
    "4. Be proactive when it helps: point out what is still missing, who to "
    "question next, or two statements that cannot both be true. Do not force it.\n"
    "5. Be short and natural, like a partner thinking out loud: 1-3 sentences, "
    "no lists. Get to the point.\n"
    f"{SIMPLE_ENGLISH_RULE} Speak plainly, no stage directions, speech only."
)


def build_detective_chat_messages(
    case: Case, state: GameState, det: DetectiveState, player_text: str
):
    recent_chat = det.chat[-6:]
    history = (
        "\n".join(f"  {c.speaker}: {c.text}" for c in recent_chat)
        if recent_chat
        else "  (you two have not talked yet this case)"
    )
    ctx = f"""{specialty_identity(det)}

{public_case_facts(case, state)}

{detective_memory_block(det)}

--- your recent talk with the lead detective ---
{history}

--- the lead detective now says to you ---
"{player_text}"

Answer as {det.name}, in your own voice, grounded only in what you know.
"""
    return DETECTIVE_CHAT_SYSTEM, ctx
