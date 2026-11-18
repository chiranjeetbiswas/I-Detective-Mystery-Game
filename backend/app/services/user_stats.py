"""Per-account statistics, built from the player's finished games in the database."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db.models import GameResult
from ..models.dto import Achievement, Statistics
from .stats import _ACHIEVEMENTS


def record_result(
    db: Session, *, user_id: int, game_id: str, won: bool, solve_minutes: int, difficulty: str
) -> None:
    """Store a finished game once. Repeat calls for the same game are ignored."""
    if db.scalar(select(GameResult.id).where(GameResult.game_id == game_id)) is not None:
        return
    db.add(
        GameResult(
            user_id=user_id,
            game_id=game_id,
            won=won,
            solve_minutes=solve_minutes,
            difficulty=difficulty,
        )
    )
    db.commit()


def load_statistics(db: Session, user_id: int) -> Statistics:
    rows = db.scalars(
        select(GameResult).where(GameResult.user_id == user_id).order_by(GameResult.id)
    ).all()

    stats = Statistics()
    unlocked: dict[str, str] = {}

    def unlock(key: str, when: str) -> None:
        unlocked.setdefault(key, when)

    # replay the history in order, so each award gets the date it was really earned
    for row in rows:
        when = row.created_at.isoformat()
        stats.total_games += 1
        if row.won:
            stats.cases_solved += 1
            stats.total_solve_minutes += row.solve_minutes
            if (
                stats.fastest_solve_minutes is None
                or row.solve_minutes < stats.fastest_solve_minutes
            ):
                stats.fastest_solve_minutes = row.solve_minutes
            unlock("first_case", when)
            if row.solve_minutes < 60:
                unlock("sharp_eye", when)
            if stats.cases_solved >= 5:
                unlock("veteran", when)
            if row.difficulty == "master":
                unlock("master_mind", when)
            if stats.total_games >= 10 and stats.accuracy >= 80:
                unlock("flawless", when)
        else:
            stats.cases_failed += 1

    stats.achievements = [
        Achievement(id=key, name=_ACHIEVEMENTS[key][0],
                    description=_ACHIEVEMENTS[key][1], unlocked_at=when)
        for key, when in unlocked.items()
    ]
    return stats
