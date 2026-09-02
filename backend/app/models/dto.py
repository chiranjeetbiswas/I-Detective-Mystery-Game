"""Request/response DTOs and statistics models."""
from __future__ import annotations

from pydantic import BaseModel, Field

from .enums import Difficulty


# ---- requests ---------------------------------------------------------------
class NewGameRequest(BaseModel):
    num_characters: int = Field(6, ge=4, le=12)
    difficulty: Difficulty = Difficulty.NORMAL


class ActionRequest(BaseModel):
    game_id: str
    text: str = Field(..., min_length=1, description="Free natural-language input")


class SelectCharacterRequest(BaseModel):
    game_id: str
    character_id: str = Field(..., description="Who to make the active conversation")


class TalkRequest(BaseModel):
    game_id: str
    text: str = Field(..., min_length=1, description="What the detective says")
    character_id: str = Field(
        "", description="Target NPC; if empty, uses the active character"
    )


class AccuseRequest(BaseModel):
    game_id: str
    character_id: str


class HintRequest(BaseModel):
    game_id: str


class DetectiveMessageRequest(BaseModel):
    game_id: str
    text: str = Field(..., min_length=1, description="What the lead detective says")


class DetectiveInterviewRequest(BaseModel):
    game_id: str
    detective_id: str = Field(..., description="Which AI detective runs the interview")
    character_id: str = Field(..., description="Suspect to be interviewed")


class DetectiveSettleRequest(BaseModel):
    game_id: str
    detective_id: str


# ---- responses --------------------------------------------------------------
class ActionResponse(BaseModel):
    game_id: str
    narration: str = ""
    speaker: str = ""
    speaker_character_id: str = ""
    dialogue: str = ""
    at_time: str
    minutes_elapsed: int
    new_evidence: list[str] = Field(default_factory=list)
    status: str
    # lightweight snapshots so the UI can refresh sidebars
    trust_changes: dict[str, int] = Field(default_factory=dict)
    active_character_id: str = ""
    mood: str = ""


class AccuseResponse(BaseModel):
    game_id: str
    correct: bool
    status: str
    verdict: str
    true_target_id: str
    true_target_name: str
    reasoning: str


# ---- statistics -------------------------------------------------------------
class Achievement(BaseModel):
    id: str
    name: str
    description: str
    unlocked_at: str


class Statistics(BaseModel):
    cases_solved: int = 0
    cases_failed: int = 0
    total_games: int = 0
    fastest_solve_minutes: int | None = None
    total_solve_minutes: int = 0
    achievements: list[Achievement] = Field(default_factory=list)

    @property
    def accuracy(self) -> float:
        if self.total_games == 0:
            return 0.0
        return round(self.cases_solved / self.total_games * 100, 1)

    @property
    def average_solve_minutes(self) -> float:
        if self.cases_solved == 0:
            return 0.0
        return round(self.total_solve_minutes / self.cases_solved, 1)

    @property
    def rank(self) -> str:
        solved, acc = self.cases_solved, self.accuracy
        if solved >= 25 and acc >= 80:
            return "Master Detective"
        if solved >= 12 and acc >= 65:
            return "Senior Detective"
        if solved >= 5:
            return "Detective"
        if solved >= 1:
            return "New Detective"
        return "Just Starting"
