"""Automatic detective-notebook recording. The player never takes manual notes."""
from __future__ import annotations

from ..models.case import Case, CharacterProfile, Evidence
from ..models.game_state import GameState, NotebookEntry


def _has(entries: list[NotebookEntry], title: str) -> bool:
    return any(e.title == title for e in entries)


def record_character_met(state: GameState, c: CharacterProfile, at_time: str) -> None:
    if not _has(state.notebook.characters, c.name):
        state.notebook.characters.append(
            NotebookEntry(
                kind="character",
                title=c.name,
                detail=f"{c.age}, {c.occupation}. {c.personality}.",
                at_time=at_time,
            )
        )


def record_evidence(state: GameState, e: Evidence, at_time: str) -> None:
    if not _has(state.notebook.evidence, e.name):
        state.notebook.evidence.append(
            NotebookEntry(
                kind="evidence",
                title=e.name,
                detail=f"{e.description} (found in {e.location}).",
                at_time=at_time,
            )
        )


def record_secret(state: GameState, title: str, detail: str, at_time: str) -> None:
    if not _has(state.notebook.secrets, title):
        state.notebook.secrets.append(
            NotebookEntry(kind="secret", title=title, detail=detail, at_time=at_time)
        )


def record_timeline(state: GameState, case: Case) -> None:
    if state.notebook.timeline:
        return
    for ev in case.timeline:
        state.notebook.timeline.append(
            NotebookEntry(kind="timeline", title=ev.time, detail=ev.description,
                          at_time=ev.time)
        )


def record_open_question(state: GameState, q: str, at_time: str) -> None:
    if not _has(state.notebook.open_questions, q):
        state.notebook.open_questions.append(
            NotebookEntry(kind="question", title=q, at_time=at_time)
        )


def record_contradiction(state: GameState, title: str, detail: str, at_time: str) -> None:
    if not _has(state.notebook.contradictions, title):
        state.notebook.contradictions.append(
            NotebookEntry(kind="contradiction", title=title, detail=detail, at_time=at_time)
        )
