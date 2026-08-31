"""JSON-file persistence for cases, live game states, and named save slots.

Simple, dependency-free store suitable for a single-node game backend. Each
game is one file; the immutable case is stored alongside its mutable state.
"""
from __future__ import annotations

import json
import os
import threading
from pathlib import Path

from ..core.config import get_settings
from ..core.logging import get_logger
from ..models.case import Case
from ..models.game_state import GameState

log = get_logger(__name__)
_lock = threading.RLock()


class GameStore:
    def __init__(self, data_dir: str | None = None) -> None:
        settings = get_settings()
        self.root = Path(data_dir or settings.data_dir)
        self.games_dir = self.root / "games"
        self.saves_dir = self.root / "saves"
        self.games_dir.mkdir(parents=True, exist_ok=True)
        self.saves_dir.mkdir(parents=True, exist_ok=True)
        # in-memory cache for the active session (fast, avoids disk churn)
        self._cache: dict[str, tuple[Case, GameState]] = {}

    # ---- live games ---------------------------------------------------------
    def _game_path(self, game_id: str) -> Path:
        return self.games_dir / f"{game_id}.json"

    def save_game(self, case: Case, state: GameState) -> None:
        with _lock:
            self._cache[state.id] = (case, state)
            payload = {"case": case.model_dump(), "state": state.model_dump()}
            tmp = self._game_path(state.id).with_suffix(".tmp")
            tmp.write_text(json.dumps(payload, indent=2))
            os.replace(tmp, self._game_path(state.id))

    def load_game(self, game_id: str) -> tuple[Case, GameState] | None:
        with _lock:
            if game_id in self._cache:
                return self._cache[game_id]
            path = self._game_path(game_id)
            if not path.exists():
                return None
            payload = json.loads(path.read_text())
            case = Case.model_validate(payload["case"])
            state = GameState.model_validate(payload["state"])
            self._cache[game_id] = (case, state)
            return case, state

    def delete_game(self, game_id: str) -> None:
        with _lock:
            self._cache.pop(game_id, None)
            path = self._game_path(game_id)
            if path.exists():
                path.unlink()

    # ---- named save slots ---------------------------------------------------
    def save_slot(self, slot: str, case: Case, state: GameState) -> None:
        with _lock:
            payload = {
                "slot": slot,
                "case": case.model_dump(),
                "state": state.model_dump(),
            }
            (self.saves_dir / f"{slot}.json").write_text(json.dumps(payload, indent=2))

    def load_slot(self, slot: str) -> tuple[Case, GameState] | None:
        with _lock:
            path = self.saves_dir / f"{slot}.json"
            if not path.exists():
                return None
            payload = json.loads(path.read_text())
            case = Case.model_validate(payload["case"])
            state = GameState.model_validate(payload["state"])
            self._cache[state.id] = (case, state)
            return case, state

    def list_slots(self) -> list[dict]:
        out: list[dict] = []
        with _lock:
            for p in sorted(self.saves_dir.glob("*.json")):
                try:
                    payload = json.loads(p.read_text())
                    out.append({
                        "slot": payload.get("slot", p.stem),
                        "title": payload["case"].get("title"),
                        "status": payload["state"].get("status"),
                        "updated_at": payload["state"].get("updated_at"),
                        "game_id": payload["state"].get("id"),
                    })
                except Exception:  # pragma: no cover
                    continue
        return out


_store: GameStore | None = None


def get_store() -> GameStore:
    global _store
    if _store is None:
        _store = GameStore()
    return _store
