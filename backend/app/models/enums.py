"""Shared enums for the domain."""
from __future__ import annotations

from enum import Enum


class Difficulty(str, Enum):
    BEGINNER = "beginner"
    NORMAL = "normal"
    EXPERT = "expert"
    MASTER = "master"


class LocationType(str, Enum):
    HOTEL = "Hotel"
    MANSION = "Mansion"
    CRUISE_SHIP = "Cruise Ship"
    AIRPORT_LOUNGE = "Airport Lounge"
    LUXURY_VILLA = "Luxury Villa"
    TRAIN = "Train"
    SAFE_HOUSE = "Safe House"
    MUSEUM = "Museum"
    PRIVATE_ISLAND = "Private Island"
    RESEARCH_FACILITY = "Research Facility"


class GameStatus(str, Enum):
    IN_PROGRESS = "in_progress"
    WON = "won"
    LOST = "lost"


class ActionType(str, Enum):
    TALK = "talk"          # converse with an NPC
    SEARCH = "search"      # search a room / object
    OBSERVE = "observe"    # observe an NPC or environment
    SHOW = "show"          # show evidence to an NPC
    MOVE = "move"          # move to a location
    THINK = "think"        # narrator / general look-around
    HINT = "hint"          # request a hint


class Gender(str, Enum):
    """Used to pick a matching avatar and pronouns."""

    FEMALE = "female"
    MALE = "male"
    NONBINARY = "nonbinary"


class Mood(str, Enum):
    """Changing emotional state of an NPC toward the detective/situation."""

    CALM = "calm"
    HAPPY = "happy"
    CONFIDENT = "confident"
    SUSPICIOUS = "suspicious"
    NERVOUS = "nervous"
    SCARED = "scared"
    ANGRY = "angry"


class NPCStatus(str, Enum):
    """Availability of an NPC in the scene."""

    AVAILABLE = "available"   # can be approached
    TALKING = "talking"       # currently the active conversation target
    BUSY = "busy"             # occupied elsewhere
    SLEEPING = "sleeping"     # not reachable right now
    MISSING = "missing"       # cannot be found


class DetectiveSpecialty(str, Enum):
    """What an AI detective teammate is best at."""

    PSYCHOLOGY = "psychology"   # body language, emotion, manipulation, behaviour
    LOGIC = "logic"             # timelines, evidence, inconsistencies, deduction


class DetectiveStatus(str, Enum):
    """Live activity state of an AI detective teammate (drives the sidebar card)."""

    IDLE = "idle"                 # nothing to do
    LISTENING = "listening"       # passively observing an interaction
    ANALYZING = "analyzing"       # thinking about what was just said
    INVESTIGATING = "investigating"  # running an independent interview
    RETURNING = "returning"       # interview done, walking back
    WRITING_REPORT = "writing_report"  # composing findings

