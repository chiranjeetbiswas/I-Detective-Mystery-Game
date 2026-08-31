"""Mutable game state — evolves during play. References the immutable Case.

This is the single source of truth sent (in *minimal relevant slices*) to the
LLM. We never replay the whole conversation.
"""
from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel, Field

from .enums import GameStatus, Mood, NPCStatus


class QAExchange(BaseModel):
    """One question/answer pair between the detective and this NPC."""

    at_time: str = ""
    question: str = ""
    answer: str = ""


class NPCState(BaseModel):
    """Per-character runtime state and memory."""

    character_id: str
    trust: int = Field(50, ge=0, le=100)
    stress: int = Field(20, ge=0, le=100)
    suspicion_of_player: int = Field(0, ge=0, le=100)
    times_questioned: int = 0

    # emotional + availability state
    mood: Mood = Mood.CALM
    status: NPCStatus = NPCStatus.AVAILABLE

    # structured memory (what this NPC remembers about the detective)
    evidence_shown: list[str] = Field(default_factory=list)
    revealed_knowledge: list[str] = Field(default_factory=list)
    lies_told: list[str] = Field(default_factory=list)
    asked_questions: list[str] = Field(default_factory=list)
    relationship_notes: list[str] = Field(
        default_factory=list, description="How the detective has treated this NPC"
    )
    # full per-character conversation history (question + answer pairs)
    exchanges: list[QAExchange] = Field(default_factory=list)
    # short rolling memory summary (compact context fed to the LLM)
    memory: list[str] = Field(default_factory=list)
    has_met: bool = False

    def remember(self, note: str, cap: int = 10) -> None:
        self.memory.append(note)
        if len(self.memory) > cap:
            self.memory = self.memory[-cap:]

    def record_exchange(self, at_time: str, question: str, answer: str) -> None:
        self.exchanges.append(
            QAExchange(at_time=at_time, question=question, answer=answer)
        )
        q = question.strip()
        if q and q not in self.asked_questions:
            self.asked_questions.append(q)


class NotebookEntry(BaseModel):
    kind: str  # character | evidence | contradiction | timeline | secret | question
    title: str
    detail: str = ""
    at_time: str = ""


class Notebook(BaseModel):
    characters: list[NotebookEntry] = Field(default_factory=list)
    evidence: list[NotebookEntry] = Field(default_factory=list)
    contradictions: list[NotebookEntry] = Field(default_factory=list)
    timeline: list[NotebookEntry] = Field(default_factory=list)
    secrets: list[NotebookEntry] = Field(default_factory=list)
    open_questions: list[NotebookEntry] = Field(default_factory=list)


class TranscriptLine(BaseModel):
    at_time: str
    speaker: str        # "You", narrator name, or NPC name
    text: str
    kind: str = "dialogue"  # dialogue | narration | system
    character_id: str = ""  # which NPC this line belongs to (for per-NPC threads)


class GameState(BaseModel):
    """All mutable state for a single game session."""

    id: str
    case_id: str
    status: GameStatus = GameStatus.IN_PROGRESS
    created_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    updated_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    # clock (minutes elapsed from case.start_time)
    minutes_elapsed: int = 0
    current_location: str = ""
    current_objective: str = "Find out which guest is not who they say they are."

    inventory: list[str] = Field(default_factory=list)
    discovered_evidence: list[str] = Field(default_factory=list)
    visited_rooms: list[str] = Field(default_factory=list)

    npc_states: dict[str, NPCState] = Field(default_factory=dict)
    notebook: Notebook = Field(default_factory=Notebook)
    transcript: list[TranscriptLine] = Field(default_factory=list)

    # the character the detective is currently talking to (persists across turns)
    active_character_id: str = ""

    hints_used: int = 0
    accusation_made: bool = False
    accused_character_id: str = ""

    def touch(self) -> None:
        self.updated_at = datetime.now(timezone.utc).isoformat()
