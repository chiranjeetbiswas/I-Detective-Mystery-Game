"""Immutable case models — generated ONCE at game start, never changed.

These describe the *ground truth* of the mystery. Gameplay state lives in
``game_state.py`` and references these by id/name.
"""
from __future__ import annotations

from pydantic import BaseModel, Field

from .enums import Difficulty, Gender, LocationType


class Relationship(BaseModel):
    with_character: str = Field(..., description="Name of the related character")
    kind: str = Field(..., description="e.g. spouse, rival, business partner")
    detail: str = ""


class CharacterProfile(BaseModel):
    """The immutable, ground-truth definition of a character."""

    id: str
    name: str
    age: int
    gender: Gender = Field(
        Gender.NONBINARY, description="Drives avatar art and pronouns"
    )
    occupation: str
    personality: str
    background: str
    secret: str
    goal: str
    alibi: str
    # ---- rich personality (makes NPCs feel alive) ----
    speaking_style: str = Field(
        "", description="How they talk: calm, short answers, formal, rambling…"
    )
    habits: str = Field(
        "", description="Physical tells, e.g. touches necklace when nervous"
    )
    fear: str = Field("", description="What this person is afraid of")
    weakness: str = Field(
        "",
        description=(
            "A personality weakness the player can use as a lever to get clues, "
            "e.g. 'Short temper', 'Seeks attention', 'Trusts strangers too easily'."
        ),
    )
    likes: list[str] = Field(default_factory=list)
    dislikes: list[str] = Field(default_factory=list)
    intelligence: int = Field(
        60, ge=0, le=100, description="How clever/hard to trick they are"
    )
    confidence: int = Field(
        60, ge=0, le=100, description="How self-assured they act"
    )
    relationships: list[Relationship] = Field(default_factory=list)
    knowledge: list[str] = Field(
        default_factory=list, description="True facts this NPC knows"
    )
    lies: list[str] = Field(
        default_factory=list, description="Falsehoods this NPC may tell"
    )
    inventory: list[str] = Field(default_factory=list)
    is_target: bool = False


class TimelineEvent(BaseModel):
    time: str = Field(..., description="e.g. '7:45 PM'")
    description: str
    involved: list[str] = Field(default_factory=list)


class Evidence(BaseModel):
    id: str
    name: str
    description: str
    location: str = Field(..., description="Room where it can be found")
    points_to: str = Field(
        "", description="Character name this evidence implicates, if any"
    )
    is_red_herring: bool = False
    is_key_evidence: bool = Field(
        False, description="Critical to the true solution"
    )


class Room(BaseModel):
    id: str
    name: str
    description: str


class Solution(BaseModel):
    target_character_id: str
    target_true_identity: str
    reasoning: str = Field(..., description="Why the target is guilty")
    key_evidence_ids: list[str] = Field(default_factory=list)


class Case(BaseModel):
    """The complete, immutable mystery."""

    id: str
    title: str
    difficulty: Difficulty
    location_type: LocationType
    location_name: str
    introduction: str
    crime: str
    target_fake_identity: str = Field(
        ..., description="The false persona the target hides behind"
    )
    escape_plan: str
    start_time: str = Field("8:00 PM", description="In-world clock start")
    rooms: list[Room] = Field(default_factory=list)
    characters: list[CharacterProfile] = Field(default_factory=list)
    timeline: list[TimelineEvent] = Field(default_factory=list)
    evidence: list[Evidence] = Field(default_factory=list)
    hidden_clues: list[str] = Field(default_factory=list)
    red_herrings: list[str] = Field(default_factory=list)
    solution: Solution

    # ---- convenience lookups ------------------------------------------------
    def character_by_id(self, cid: str) -> CharacterProfile | None:
        return next((c for c in self.characters if c.id == cid), None)

    def character_by_name(self, name: str) -> CharacterProfile | None:
        low = name.strip().lower()
        # exact first, then partial (first name) match
        exact = next(
            (c for c in self.characters if c.name.lower() == low), None
        )
        if exact:
            return exact
        return next(
            (c for c in self.characters if low and low in c.name.lower()), None
        )

    def evidence_by_id(self, eid: str) -> Evidence | None:
        return next((e for e in self.evidence if e.id == eid), None)

    @property
    def target(self) -> CharacterProfile:
        return next(c for c in self.characters if c.is_target)
