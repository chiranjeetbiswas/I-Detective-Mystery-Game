"""Save/resume/restart routes and statistics routes."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services import get_stats_service, get_store
from . import serializers as ser

router = APIRouter()


class SaveRequest(BaseModel):
    game_id: str
    slot: str


# ---- save system ------------------------------------------------------------
@router.post("/saves")
def save_game(req: SaveRequest):
    loaded = get_store().load_game(req.game_id)
    if loaded is None:
        raise HTTPException(404, "Game not found")
    case, state = loaded
    get_store().save_slot(req.slot, case, state)
    return {"ok": True, "slot": req.slot}


@router.get("/saves")
def list_saves():
    return {"saves": get_store().list_slots()}


@router.post("/saves/{slot}/resume")
def resume(slot: str):
    loaded = get_store().load_slot(slot)
    if loaded is None:
        raise HTTPException(404, "Save slot not found")
    case, state = loaded
    get_store().save_game(case, state)  # make it the active game
    return ser.full_snapshot(case, state)


@router.post("/games/{game_id}/restart")
def restart(game_id: str):
    """Restart the SAME case from the beginning (immutable case reused)."""
    loaded = get_store().load_game(game_id)
    if loaded is None:
        raise HTTPException(404, "Game not found")
    case, _ = loaded
    from ..models.game_state import GameState, NPCState, TranscriptLine

    base_trust = {"beginner": 60, "normal": 50, "expert": 42, "master": 35}
    bt = base_trust.get(case.difficulty.value, 50)
    import uuid as _uuid

    state = GameState(
        id=f"game_{_uuid.uuid4().hex[:12]}",
        case_id=case.id,
        current_location=case.rooms[0].name if case.rooms else case.location_name,
    )
    for c in case.characters:
        state.npc_states[c.id] = NPCState(character_id=c.id, trust=bt)
    from ..engine import notebook as nb  # type: ignore

    for c in case.characters:
        nb.record_character_met(state, c, case.start_time)
    nb.record_timeline(state, case)
    state.transcript.append(
        TranscriptLine(at_time=case.start_time, speaker="Narrator",
                       text=case.introduction, kind="narration")
    )
    get_store().save_game(case, state)
    return ser.full_snapshot(case, state)


# ---- statistics -------------------------------------------------------------
@router.get("/stats")
def stats():
    s = get_stats_service().load()
    data = s.model_dump()
    data["accuracy"] = s.accuracy
    data["average_solve_minutes"] = s.average_solve_minutes
    data["rank"] = s.rank
    return data
