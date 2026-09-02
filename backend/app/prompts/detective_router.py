"""Detective router prompt.

The player talks to their AI detective teammates in plain language — there are
NO commands, keywords or fixed phrases. This prompt asks the LLM to read the
player's message together with the current investigation context and decide:

  * which detective should respond (Ava = psychology, Ryan = logic, or either),
  * whether the player is asking a detective to go INTERVIEW a suspect,
  * which suspect that interview targets (by id),
  * and a short reason.

The model returns strict JSON. All intent understanding lives here, in the LLM
— the engine only reads the structured decision.
"""
from __future__ import annotations

from ..models.case import Case
from ..models.game_state import GameState

# The word "router" is the mock-provider dispatch marker; keep it in the system text.
DETECTIVE_ROUTER_SYSTEM = (
    "You are the intent router for an AI detective team in a mystery game. "
    "The player is the Lead Detective. They work with two AI detective "
    "teammates and speak to them in natural language — never with commands.\n"
    "\n"
    "THE TEAM:\n"
    "- Ava Carter (id: ava) — psychology, body language, emotions, manipulation, "
    "suspicious behaviour.\n"
    "- Ryan Brooks (id: ryan) — timelines, evidence, logic, inconsistencies, "
    "deductions.\n"
    "\n"
    "Read the player's message and the context. Decide the intent. Return ONLY a "
    "JSON object, no prose, with these fields:\n"
    '  "detective_id": "ava" | "ryan"  (who should respond / act)\n'
    '  "action": "chat" | "interview"  (chat = discuss/answer; interview = go '
    "question a suspect)\n"
    '  "target_character_id": "<suspect id>" | ""  (required when action is '
    "interview; else empty)\n"
    '  "reason": "<one short sentence>"\n'
    "\n"
    "RULES:\n"
    "- If the player asks a detective (or 'you two', 'someone', 'one of you') to "
    "question / interview / follow up with / handle / press / talk to a suspect, "
    "action = interview and you MUST resolve target_character_id from the suspect "
    "list by name.\n"
    "- If the player names a detective, respect it. If they name a suspect but not "
    "a detective, choose the detective whose specialty best fits (behaviour/lying "
    "-> ava; timeline/evidence/facts -> ryan).\n"
    "- If they ask a general question (who is suspicious, what are we missing, "
    "summarize, who should I question next, is X hiding something), action = chat.\n"
    "- Never invent a suspect id. If no suspect clearly matches an interview "
    "request, use action = chat and empty target.\n"
    "- Choose exactly one detective. Output JSON only."
)


def build_detective_router_messages(case: Case, state: GameState, player_text: str):
    roster = "\n".join(
        f"  - id: {c.id} | name: {c.name} | job: {c.occupation}"
        for c in case.characters
    )
    dets = ", ".join(
        f"{d.name} ({d.specialty.value}, status={d.status.value})"
        for d in state.detectives.values()
    )
    ctx = f"""
--- your detective team ---
{dets}
--- suspects in this case (use these ids) ---
{roster}
--- the lead detective says ---
"{player_text}"

Return the JSON decision now.
"""
    return DETECTIVE_ROUTER_SYSTEM, ctx
