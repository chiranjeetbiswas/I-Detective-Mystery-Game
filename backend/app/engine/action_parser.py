"""Parse free-form player input into a structured intent.

Lightweight, deterministic heuristics — keeps the common cases off the LLM and
routes to the correct prompt. Ambiguous input defaults to narration/think.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from ..models.case import Case
from ..models.enums import ActionType


@dataclass
class Intent:
    action: ActionType
    target_character_id: str = ""
    target_room: str = ""
    evidence_hint: str = ""
    raw: str = ""
    matched: list[str] = field(default_factory=list)


_TALK = ("talk", "ask", "question", "speak", "tell", "say", "interrogate",
         "confront", "chat", "greet")
_SEARCH = ("search", "inspect", "examine", "look in", "look inside", "check",
           "open", "rummage", "investigate the", "search the")
_OBSERVE = ("observe", "watch", "study", "look at", "notice", "read")
_SHOW = ("show", "present", "reveal the", "produce")
_MOVE = ("go to", "move to", "walk to", "enter", "head to", "visit")
_THINK = ("look around", "think", "consider", "review", "recap", "wait")
_HINT = ("hint", "help me", "clue", "stuck", "i'm stuck", "give me a hint")


def _find_character(case: Case, text: str) -> str:
    low = text.lower()
    for c in case.characters:
        first = c.name.split()[0].lower()
        if c.name.lower() in low or first in low.split():
            return c.id
    return ""


def _find_room(case: Case, text: str) -> str:
    low = text.lower()
    for r in case.rooms:
        if r.name.lower() in low or r.id in low:
            return r.name
    return ""


def parse(case: Case, text: str) -> Intent:
    low = text.lower().strip()
    matched: list[str] = []

    def has(words) -> bool:
        for w in words:
            if w in low:
                matched.append(w)
                return True
        return False

    cid = _find_character(case, text)
    room = _find_room(case, text)

    # order matters: most specific intents first
    if has(_HINT):
        return Intent(ActionType.HINT, raw=text, matched=matched)
    if has(_SHOW):
        return Intent(ActionType.SHOW, target_character_id=cid, raw=text, matched=matched)
    if has(_SEARCH):
        return Intent(ActionType.SEARCH, target_room=room, raw=text, matched=matched)
    if has(_MOVE) and room:
        return Intent(ActionType.MOVE, target_room=room, raw=text, matched=matched)
    if has(_TALK) or (cid and not room):
        return Intent(ActionType.TALK, target_character_id=cid, raw=text, matched=matched)
    if has(_OBSERVE):
        return Intent(ActionType.OBSERVE, target_character_id=cid, target_room=room,
                      raw=text, matched=matched)
    if has(_THINK):
        return Intent(ActionType.THINK, raw=text, matched=matched)

    # fallback: if a character is named, treat as talk; else think
    if cid:
        return Intent(ActionType.TALK, target_character_id=cid, raw=text, matched=matched)
    return Intent(ActionType.THINK, target_room=room, raw=text, matched=matched)
