"""Statistics + achievements persistence (single JSON file)."""
from __future__ import annotations

import json
import threading
from datetime import datetime, timezone
from pathlib import Path

from ..core.config import get_settings
from ..models.dto import Achievement, Statistics

_lock = threading.RLock()

_ACHIEVEMENTS = {
    "first_case": ("First Case", "Solve your very first mystery."),
    "sharp_eye": ("Sharp Eyes", "Solve a case in less than 60 game minutes."),
    "veteran": ("Old Hand", "Solve 5 cases."),
    "master_mind": ("Big Brain", "Solve a Master Detective case."),
    "flawless": ("Almost Never Wrong", "Get 80% right over 10 or more games."),
}


class StatsService:
    def __init__(self, data_dir: str | None = None) -> None:
        settings = get_settings()
        self.path = Path(data_dir or settings.data_dir) / "statistics.json"
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def load(self) -> Statistics:
        with _lock:
            if not self.path.exists():
                return Statistics()
            return Statistics.model_validate(json.loads(self.path.read_text()))

    def _save(self, stats: Statistics) -> None:
        self.path.write_text(json.dumps(stats.model_dump(), indent=2))

    def record_result(
        self, *, won: bool, solve_minutes: int, difficulty: str
    ) -> Statistics:
        with _lock:
            stats = self.load()
            stats.total_games += 1
            if won:
                stats.cases_solved += 1
                stats.total_solve_minutes += solve_minutes
                if (
                    stats.fastest_solve_minutes is None
                    or solve_minutes < stats.fastest_solve_minutes
                ):
                    stats.fastest_solve_minutes = solve_minutes
                self._maybe_unlock(stats, won, solve_minutes, difficulty)
            else:
                stats.cases_failed += 1
            self._save(stats)
            return stats

    def _maybe_unlock(
        self, stats: Statistics, won: bool, solve_minutes: int, difficulty: str
    ) -> None:
        have = {a.id for a in stats.achievements}
        now = datetime.now(timezone.utc).isoformat()

        def unlock(key: str) -> None:
            if key in have:
                return
            name, desc = _ACHIEVEMENTS[key]
            stats.achievements.append(
                Achievement(id=key, name=name, description=desc, unlocked_at=now)
            )

        if stats.cases_solved >= 1:
            unlock("first_case")
        if won and solve_minutes < 60:
            unlock("sharp_eye")
        if stats.cases_solved >= 5:
            unlock("veteran")
        if won and difficulty == "master":
            unlock("master_mind")
        if stats.total_games >= 10 and stats.accuracy >= 80:
            unlock("flawless")


_stats: StatsService | None = None


def get_stats_service() -> StatsService:
    global _stats
    if _stats is None:
        _stats = StatsService()
    return _stats
