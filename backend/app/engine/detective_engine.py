"""Detective team orchestration.

Everything here is driven by the LLM. The engine only:
  * feeds each player<->suspect exchange into both detectives' memory,
  * asks the LLM to route a natural-language message (chat vs interview + who),
  * asks the LLM to plan and run an autonomous interview,
  * asks the LLM to write the report,
  * and keeps detective status / progress / confidence in sync.

No conversational logic is hardcoded. The router decides intent; the prompts
decide what to say. The functions return plain dicts the API layer serializes.
"""
from __future__ import annotations

from ..core.logging import get_logger
from ..llm import LLMMessage
from ..llm.base import LLMProvider
from ..models.case import Case
from ..models.enums import DetectiveStatus, NPCStatus
from ..models.game_state import DetectiveState, GameState, TranscriptLine
from ..prompts import (
    build_detective_chat_messages,
    build_detective_interview_messages,
    build_detective_report_messages,
    build_detective_router_messages,
    build_npc_messages,
)
from . import notebook as nb
from . import trust_system as trust
from .time_system import format_clock

log = get_logger(__name__)


# ---------------------------------------------------------------------------
# Continuous listening — feed every interaction into BOTH detectives' memory.
# ---------------------------------------------------------------------------
def observe_exchange(
    state: GameState,
    speaker_name: str,
    question: str,
    answer: str,
    mood: str = "",
    at_time: str = "",
) -> None:
    """Both detectives silently record what they just watched, each in their
    own words / focus. Called after every player<->suspect turn."""
    for det in state.detectives.values():
        # a listening detective is momentarily "analyzing" what was said, unless
        # they are away on their own interview.
        if det.status in (DetectiveStatus.IDLE, DetectiveStatus.LISTENING):
            det.status = DetectiveStatus.ANALYZING
        note = f"[{at_time}] {speaker_name}: \"{answer[:160]}\""
        det.observe(note)
        det.note("suspect_statements", f"{speaker_name}: {answer[:120]}")
        if mood and mood not in ("calm", ""):
            det.note("emotional_reads", f"{speaker_name} seemed {mood}.")
        # gently grow confidence as more is observed
        det.confidence = min(95, det.confidence + 1)
    # settle back to listening (they are done reacting)
    for det in state.detectives.values():
        if det.status == DetectiveStatus.ANALYZING:
            det.status = DetectiveStatus.LISTENING


def sync_clue_memory(case: Case, state: GameState) -> None:
    """Mirror discovered evidence into each detective's clue notes."""
    for det in state.detectives.values():
        for eid in state.discovered_evidence:
            e = case.evidence_by_id(eid)
            if e:
                det.note("clues_noted", f"{e.name} (in {e.location})")


# ---------------------------------------------------------------------------
# Routing a natural-language message from the player to the detective team.
# ---------------------------------------------------------------------------
def route_message(
    provider: LLMProvider, case: Case, state: GameState, player_text: str
) -> dict:
    """Ask the LLM what the player wants. Returns a normalized decision dict:
    {detective_id, action ('chat'|'interview'), target_character_id, reason}."""
    system, ctx = build_detective_router_messages(case, state, player_text)
    raw = provider.complete(
        [LLMMessage("system", system), LLMMessage("user", ctx)],
        temperature=0.2, max_tokens=200, json_mode=True,
    )
    try:
        data = LLMProvider.extract_json(raw)
    except Exception:
        data = {}
    det_id = (data.get("detective_id") or "").strip().lower()
    if det_id not in state.detectives:
        det_id = next(iter(state.detectives), "ava")
    action = (data.get("action") or "chat").strip().lower()
    if action not in ("chat", "interview"):
        action = "chat"
    target = (data.get("target_character_id") or "").strip()
    if target and case.character_by_id(target) is None:
        # try resolving by name if the model returned a name instead of an id
        prof = case.character_by_name(target)
        target = prof.id if prof else ""
    if action == "interview" and not target:
        action = "chat"
    return {
        "detective_id": det_id,
        "action": action,
        "target_character_id": target,
        "reason": (data.get("reason") or "").strip(),
    }


# ---------------------------------------------------------------------------
# Chat — a detective discusses the case with the player.
# ---------------------------------------------------------------------------
def detective_chat(
    provider: LLMProvider,
    case: Case,
    state: GameState,
    det: DetectiveState,
    player_text: str,
) -> str:
    at_time = format_clock(case.start_time, state.minutes_elapsed)
    prev = det.status
    det.status = DetectiveStatus.ANALYZING
    det.record_chat("You", player_text, at_time)

    system, ctx = build_detective_chat_messages(case, state, det, player_text)
    reply = provider.complete(
        [LLMMessage("system", system), LLMMessage("user", ctx)],
        temperature=0.8, max_tokens=110,
    ).strip()
    if not reply:
        reply = "Give me a moment — I want to be sure before I say."

    det.record_chat(det.name, reply, at_time)
    # a chat is a hypothesis in the making
    det.note("hypotheses", reply[:140])
    # return to whatever passive state they were in (unless out investigating)
    det.status = (
        prev if prev == DetectiveStatus.INVESTIGATING else DetectiveStatus.LISTENING
    )
    return reply


# ---------------------------------------------------------------------------
# Autonomous interview — the detective questions a suspect on their own.
# ---------------------------------------------------------------------------
def run_interview(
    provider: LLMProvider,
    case: Case,
    state: GameState,
    det: DetectiveState,
    character_id: str,
) -> dict:
    """Run a full autonomous interview and produce a report.

    Returns a dict the API streams to the client:
      {detective_id, target_character_id, target_name, opening, goal,
       lines: [{speaker, text}], report}
    The detective writes their own questions; the REAL suspect model answers.
    """
    profile = case.character_by_id(character_id)
    if profile is None:
        return {"error": "unknown suspect"}
    npc = state.npc_states[character_id]
    at_time = format_clock(case.start_time, state.minutes_elapsed)

    det.status = DetectiveStatus.INVESTIGATING
    det.assignment = f"Investigating {profile.name}"
    det.progress = 5

    # 1) the detective plans the interview (LLM decides the questions)
    sys_i, ctx_i = build_detective_interview_messages(case, state, det, profile, npc)
    raw = provider.complete(
        [LLMMessage("system", sys_i), LLMMessage("user", ctx_i)],
        temperature=0.7, max_tokens=300, json_mode=True,
    )
    try:
        plan = LLMProvider.extract_json(raw)
    except Exception:
        plan = {}
    opening = (plan.get("opening") or f"{profile.name}, I have a few questions.").strip()
    questions = [q for q in (plan.get("questions") or []) if isinstance(q, str) and q.strip()]
    questions = questions[:2] or ["Can you tell me where you were tonight?"]
    goal = (plan.get("goal") or "Learn what this suspect is hiding.").strip()

    lines: list[dict] = [{"speaker": det.name, "text": opening}]
    interview_qa: list[tuple[str, str]] = []

    # 2) pose each question to the REAL suspect (reuse the NPC dialogue path)
    total = len(questions)
    for i, q in enumerate(questions, start=1):
        trust.apply_conversation(npc, q, profile)
        sys_n, ctx_n = build_npc_messages(case, profile, npc, state, q)
        answer = provider.complete(
            [LLMMessage("system", sys_n), LLMMessage("user", ctx_n)],
            temperature=0.9, max_tokens=200,
        ).strip() or "I have nothing to say about that."
        npc.record_exchange(at_time, q, answer)
        npc.has_met = True
        lines.append({"speaker": det.name, "text": q})
        lines.append({"speaker": profile.name, "text": answer})
        interview_qa.append((q, answer))
        det.progress = min(85, int(5 + (i / total) * 75))

    npc.times_questioned += 1
    npc.mood = trust.recompute_mood(npc, profile)

    # 3) the detective writes their report (LLM reasons over what was said)
    det.status = DetectiveStatus.WRITING_REPORT
    det.progress = 92
    sys_r, ctx_r = build_detective_report_messages(case, state, det, profile, interview_qa)
    report = provider.complete(
        [LLMMessage("system", sys_r), LLMMessage("user", ctx_r)],
        temperature=0.7, max_tokens=90,
    ).strip() or "I could not get much out of them this time."

    # 4) fold the interview into the detective's independent memory
    for q, a in interview_qa:
        det.observe(f"[interview {profile.name}] Q: {q[:80]} -> A: {a[:120]}")
        det.note("suspect_statements", f"{profile.name}: {a[:120]}")
    det.note("investigation_notes", f"Interviewed {profile.name}: {report[:160]}")
    det.interviews_done += 1
    det.last_report = report
    det.confidence = min(98, det.confidence + 6)

    # 5) record it in the shared transcript so the player has a record
    state.transcript.append(
        TranscriptLine(at_time=at_time, speaker=det.name,
                       text=f"(interviewed {profile.name}) {report}",
                       kind="system")
    )
    nb.record_character_met(state, profile, at_time)

    # 6) detective returns to the team and becomes available again
    det.status = DetectiveStatus.RETURNING
    det.progress = 100
    det.assignment = f"Reported on {profile.name}"

    return {
        "detective_id": det.detective_id,
        "detective_name": det.name,
        "target_character_id": character_id,
        "target_name": profile.name,
        "opening": opening,
        "goal": goal,
        "lines": lines,
        "report": report,
    }


def settle_after_interview(state: GameState, detective_id: str) -> None:
    """Called once the frontend has finished streaming — detective goes back to
    passively listening."""
    det = state.detectives.get(detective_id)
    if det:
        det.status = DetectiveStatus.LISTENING
        det.progress = 0
