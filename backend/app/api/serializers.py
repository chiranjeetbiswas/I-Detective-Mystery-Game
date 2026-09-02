"""Serializers that shape backend models into safe client payloads.

Crucially, the *solution* and each character's ground-truth secret/target flag
are never sent to the client while the game is in progress.
"""
from __future__ import annotations

from ..engine import format_clock
from ..models.case import Case
from ..models.enums import GameStatus
from ..models.game_state import GameState


def public_case_brief(case: Case) -> dict:
    """What the player sees on the Case Brief screen (no spoilers)."""
    return {
        "id": case.id,
        "title": case.title,
        "difficulty": case.difficulty.value,
        "location_type": case.location_type.value,
        "location_name": case.location_name,
        "introduction": case.introduction,
        "crime": case.crime,
        "start_time": case.start_time,
        "num_characters": len(case.characters),
        "rooms": [r.model_dump() for r in case.rooms],
    }


def public_characters(case: Case, state: GameState) -> list[dict]:
    out = []
    for c in case.characters:
        npc = state.npc_states.get(c.id)
        is_active = state.active_character_id == c.id
        out.append({
            "id": c.id,
            "name": c.name,
            "age": c.age,
            "gender": c.gender.value,
            "occupation": c.occupation,
            "personality": c.personality,
            "speaking_style": c.speaking_style,
            "habits": c.habits,
            # avatar_seed lets the client render a stable gender-based avatar
            "avatar_seed": c.id,
            "trust": npc.trust if npc else 50,
            "stress": npc.stress if npc else 0,
            "suspicion_of_player": npc.suspicion_of_player if npc else 0,
            "times_questioned": npc.times_questioned if npc else 0,
            "mood": npc.mood.value if npc else "calm",
            "status": npc.status.value if npc else "available",
            "has_met": npc.has_met if npc else False,
            "is_active": is_active,
        })
    return out


def public_evidence(case: Case, state: GameState) -> list[dict]:
    out = []
    for eid in state.discovered_evidence:
        e = case.evidence_by_id(eid)
        if not e:
            continue
        out.append({
            "id": e.id,
            "name": e.name,
            "description": e.description,
            "location": e.location,
        })
    return out


def public_detectives(state: GameState) -> list[dict]:
    """AI detective teammate cards for the sidebar (no hidden data)."""
    out = []
    for det in state.detectives.values():
        out.append({
            "detective_id": det.detective_id,
            "name": det.name,
            "specialty": det.specialty.value,
            "tagline": det.tagline,
            "avatar_seed": det.avatar_seed,
            "gender": det.gender,
            "status": det.status.value,
            "assignment": det.assignment,
            "progress": det.progress,
            "confidence": det.confidence,
            "interviews_done": det.interviews_done,
            "last_report": det.last_report,
        })
    return out


def public_state(case: Case, state: GameState) -> dict:
    return {
        "game_id": state.id,
        "case_id": state.case_id,
        "status": state.status.value,
        "clock": format_clock(case.start_time, state.minutes_elapsed),
        "minutes_elapsed": state.minutes_elapsed,
        "current_location": state.current_location,
        "current_objective": state.current_objective,
        "inventory": state.inventory,
        "hints_used": state.hints_used,
        "accusation_made": state.accusation_made,
        "discovered_evidence_count": len(state.discovered_evidence),
        "active_character_id": state.active_character_id,
    }


def public_transcript(state: GameState, limit: int = 50) -> list[dict]:
    return [t.model_dump() for t in state.transcript[-limit:]]


def full_snapshot(case: Case, state: GameState) -> dict:
    """A complete client payload combining everything above."""
    payload = {
        "brief": public_case_brief(case),
        "state": public_state(case, state),
        "characters": public_characters(case, state),
        "evidence": public_evidence(case, state),
        "notebook": state.notebook.model_dump(),
        "transcript": public_transcript(state),
        "rooms": [r.model_dump() for r in case.rooms],
        "detectives": public_detectives(state),
    }
    # reveal the solution only once the game is over
    if state.status != GameStatus.IN_PROGRESS:
        payload["solution"] = {
            "target_id": case.solution.target_character_id,
            "target_name": case.target.name,
            "true_identity": case.solution.target_true_identity,
            "reasoning": case.solution.reasoning,
        }
    return payload
