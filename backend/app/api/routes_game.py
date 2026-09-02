"""FastAPI routes for the game."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..engine import GameEngine
from ..models.dto import (
    AccuseRequest,
    ActionRequest,
    DetectiveInterviewRequest,
    DetectiveMessageRequest,
    DetectiveSettleRequest,
    HintRequest,
    NewGameRequest,
    SelectCharacterRequest,
    TalkRequest,
)
from ..services import get_stats_service, get_store
from . import serializers as ser

router = APIRouter()
_engine: GameEngine | None = None


def engine() -> GameEngine:
    global _engine
    if _engine is None:
        _engine = GameEngine()
    return _engine


def _require_game(game_id: str):
    loaded = get_store().load_game(game_id)
    if loaded is None:
        raise HTTPException(404, f"Game '{game_id}' not found")
    return loaded


# ---- new / snapshot ---------------------------------------------------------
@router.post("/games")
def new_game(req: NewGameRequest):
    case, state = engine().new_game(req)
    get_store().save_game(case, state)
    return ser.full_snapshot(case, state)


@router.get("/games/{game_id}")
def get_game(game_id: str):
    case, state = _require_game(game_id)
    return ser.full_snapshot(case, state)


@router.get("/games/{game_id}/brief")
def get_brief(game_id: str):
    case, _ = _require_game(game_id)
    return ser.public_case_brief(case)


# ---- action -----------------------------------------------------------------
@router.post("/games/{game_id}/action")
def action(game_id: str, req: ActionRequest):
    case, state = _require_game(game_id)
    resp = engine().handle_action(case, state, req.text)
    get_store().save_game(case, state)
    return {
        "result": resp.model_dump(),
        "state": ser.public_state(case, state),
        "characters": ser.public_characters(case, state),
        "evidence": ser.public_evidence(case, state),
        "notebook": state.notebook.model_dump(),
        "transcript": ser.public_transcript(state),
    }


# ---- select active character -------------------------------------------------
@router.post("/games/{game_id}/select")
def select_character(game_id: str, req: SelectCharacterRequest):
    case, state = _require_game(game_id)
    resp = engine().select_character(case, state, req.character_id)
    get_store().save_game(case, state)
    return {
        "result": resp.model_dump(),
        "state": ser.public_state(case, state),
        "characters": ser.public_characters(case, state),
        "evidence": ser.public_evidence(case, state),
        "notebook": state.notebook.model_dump(),
        "transcript": ser.public_transcript(state),
    }


# ---- talk (directed at active / given character) ----------------------------
@router.post("/games/{game_id}/talk")
def talk(game_id: str, req: TalkRequest):
    case, state = _require_game(game_id)
    resp = engine().talk_to(case, state, req.text, req.character_id)
    get_store().save_game(case, state)
    return {
        "result": resp.model_dump(),
        "state": ser.public_state(case, state),
        "characters": ser.public_characters(case, state),
        "evidence": ser.public_evidence(case, state),
        "notebook": state.notebook.model_dump(),
        "transcript": ser.public_transcript(state),
    }


# ---- AI detective team ------------------------------------------------------
@router.post("/games/{game_id}/detectives/message")
def detective_message(game_id: str, req: DetectiveMessageRequest):
    """Send a natural-language message to the detective team. The LLM decides
    which detective responds and whether an interview should begin."""
    case, state = _require_game(game_id)
    result = engine().detective_message(case, state, req.text)
    get_store().save_game(case, state)
    return {
        "result": result,
        "state": ser.public_state(case, state),
        "detectives": ser.public_detectives(state),
        "characters": ser.public_characters(case, state),
        "transcript": ser.public_transcript(state),
    }


@router.post("/games/{game_id}/detectives/interview")
def detective_interview(game_id: str, req: DetectiveInterviewRequest):
    """Run one autonomous interview. Returns the full scripted turn sequence and
    the report so the client can stream it with typing delays."""
    case, state = _require_game(game_id)
    result = engine().detective_interview(
        case, state, req.detective_id, req.character_id
    )
    get_store().save_game(case, state)
    return {
        "result": result,
        "state": ser.public_state(case, state),
        "detectives": ser.public_detectives(state),
        "characters": ser.public_characters(case, state),
        "notebook": state.notebook.model_dump(),
        "transcript": ser.public_transcript(state),
    }


@router.post("/games/{game_id}/detectives/settle")
def detective_settle(game_id: str, req: DetectiveSettleRequest):
    """Mark a detective as back from an interview (client finished streaming)."""
    case, state = _require_game(game_id)
    engine().settle_detective(state, req.detective_id)
    get_store().save_game(case, state)
    return {"detectives": ser.public_detectives(state)}


# ---- hint -------------------------------------------------------------------
@router.post("/games/{game_id}/hint")
def hint(game_id: str, _req: HintRequest | None = None):
    case, state = _require_game(game_id)
    resp = engine().handle_action(case, state, "give me a hint")
    get_store().save_game(case, state)
    return {"result": resp.model_dump(), "state": ser.public_state(case, state)}


# ---- notebook ---------------------------------------------------------------
@router.get("/games/{game_id}/notebook")
def notebook(game_id: str):
    _, state = _require_game(game_id)
    return state.notebook.model_dump()


# ---- accuse (single, final) -------------------------------------------------
@router.post("/games/{game_id}/accuse")
def accuse(game_id: str, req: AccuseRequest):
    case, state = _require_game(game_id)
    result = engine().accuse(case, state, req.character_id)
    # record statistics on the terminal result
    get_stats_service().record_result(
        won=result.correct,
        solve_minutes=state.minutes_elapsed,
        difficulty=case.difficulty.value,
    )
    get_store().save_game(case, state)
    return {
        "result": result.model_dump(),
        "snapshot": ser.full_snapshot(case, state),
    }
