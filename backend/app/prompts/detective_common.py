"""Shared context helpers for detective prompts.

These assemble the *grounded* slice of what an AI detective actually knows:
their own independent memory plus the public, discovered facts of the case.
The hidden solution and undiscovered ground truth are NEVER included — a
detective can only reason from what has been observed, exactly like the player.
"""
from __future__ import annotations

from ..models.case import Case
from ..models.enums import DetectiveSpecialty
from ..models.game_state import DetectiveState, GameState


def specialty_identity(det: DetectiveState) -> str:
    if det.specialty == DetectiveSpecialty.PSYCHOLOGY:
        return (
            f"You are {det.name}, a detective who reads PEOPLE. You focus on body "
            "language, emotions, tone, hesitation, manipulation and behaviour that "
            "feels off. You care less about hard timelines and more about what a "
            "person's reactions reveal."
        )
    return (
        f"You are {det.name}, a detective who works the FACTS. You focus on "
        "timelines, evidence, alibis, contradictions and cold logic. You build "
        "deductions step by step and distrust anything that does not fit the "
        "sequence of events."
    )


def _bullets(items: list[str], empty: str, limit: int = 12) -> str:
    items = [i for i in items if i][-limit:]
    if not items:
        return f"  ({empty})"
    return "\n".join(f"  - {i}" for i in items)


def detective_memory_block(det: DetectiveState) -> str:
    """The detective's own independent understanding of the case so far."""
    return f"""--- YOUR OWN NOTES (independent memory — reason ONLY from these) ---
Observations:
{_bullets(det.observations, "nothing noted yet", limit=20)}
Suspect statements you heard:
{_bullets(det.suspect_statements, "none heard yet")}
Timeline notes:
{_bullets(det.timeline_notes, "no timeline notes")}
Contradictions you spotted:
{_bullets(det.contradictions, "none spotted yet")}
Emotional reads:
{_bullets(det.emotional_reads, "no emotional reads yet")}
Clues / evidence you noted:
{_bullets(det.clues_noted, "no clues noted")}
Your working hypotheses:
{_bullets(det.hypotheses, "no hypothesis yet")}
Investigation notes:
{_bullets(det.investigation_notes, "none yet")}
Interviews you have run: {det.interviews_done}
Your current confidence (0-100): {det.confidence}"""


def public_case_facts(case: Case, state: GameState) -> str:
    """Only what has actually been discovered — no spoilers, no hidden solution."""
    known_evidence = [
        f"{e.name}: {e.description} (found in {e.location})"
        for eid in state.discovered_evidence
        if (e := case.evidence_by_id(eid))
    ]
    suspects = [f"{c.name} ({c.occupation})" for c in case.characters]
    timeline = [f"{t.time}: {t.description}" for t in case.timeline]
    return f"""--- THE CASE (shared, known facts) ---
Crime: {case.crime}
Place: {case.location_name}
Suspects: {", ".join(suspects)}
Public timeline:
{_bullets(timeline, "no timeline yet")}
Clues the team has found so far:
{_bullets(known_evidence, "no clues found yet")}"""
