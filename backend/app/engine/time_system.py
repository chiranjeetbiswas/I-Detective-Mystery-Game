"""In-world time system. Every action advances the clock."""
from __future__ import annotations

import time
from typing import TYPE_CHECKING

from ..models.enums import ActionType, GameStatus

if TYPE_CHECKING:
    from ..models.game_state import GameState

# minutes each action type advances the clock
ACTION_MINUTES: dict[ActionType, int] = {
    ActionType.TALK: 10,
    ActionType.SEARCH: 15,
    ActionType.OBSERVE: 5,
    ActionType.SHOW: 10,
    ActionType.MOVE: 5,
    ActionType.THINK: 5,
    ActionType.HINT: 0,
}


def _parse_start(start_time: str) -> int:
    """Return minutes-since-midnight for a clock string like '8:00 PM'."""
    txt = start_time.strip().upper()
    ampm = None
    if txt.endswith("AM") or txt.endswith("PM"):
        ampm = txt[-2:]
        txt = txt[:-2].strip()
    hh, _, mm = txt.partition(":")
    hour = int(hh)
    minute = int(mm or 0)
    if ampm == "PM" and hour != 12:
        hour += 12
    if ampm == "AM" and hour == 12:
        hour = 0
    return hour * 60 + minute


def format_clock(start_time: str, minutes_elapsed: int) -> str:
    """Format the current in-world clock as e.g. '8:35 PM'."""
    total = (_parse_start(start_time) + minutes_elapsed) % (24 * 60)
    hour24, minute = divmod(total, 60)
    ampm = "AM" if hour24 < 12 else "PM"
    hour12 = hour24 % 12 or 12
    return f"{hour12}:{minute:02d} {ampm}"


def advance_for(action: ActionType) -> int:
    return ACTION_MINUTES.get(action, 5)


# ---- real-time limit --------------------------------------------------------
# Small cases are shorter: 4-5 guests get 30 minutes, 6 or more get an hour.
def limit_for(num_guests: int) -> int:
    return 30 if num_guests <= 5 else 60


# The night always ends at this hour: the guests leave and the case is over.
NIGHT_ENDS_AT = "6:00 AM"
MIN_NIGHT_MINUTES = 4 * 60


def night_span(start_time: str) -> int:
    """Game minutes from the case start until the guests leave in the morning."""
    span = (_parse_start(NIGHT_ENDS_AT) - _parse_start(start_time)) % (24 * 60)
    return max(span, MIN_NIGHT_MINUTES)


# The clock starts to blink red when this much real time is left.
WARNING_SECONDS = 5 * 60


def time_warning(state: "GameState") -> bool:
    """True in the last five real minutes of a timed case that is still open."""
    if not state.time_limit_minutes or state.status != GameStatus.IN_PROGRESS:
        return False
    return state.time_limit_minutes * 60 - state.active_seconds <= WARNING_SECONDS


def played_minutes(state: "GameState") -> int:
    """Real minutes the player has spent on the case (what records are based on)."""
    if state.time_limit_minutes:
        return int(state.active_seconds // 60)
    return state.minutes_elapsed


# The browser pings every few seconds while a game is open. A longer gap means the
# player was away (tab closed, saved and quit), so that gap is not counted.
TICK_GAP_CAP_SECONDS = 90


def add_minutes(state: "GameState", minutes: int) -> None:
    """Spend in-world minutes on an action. Timed games follow real time instead."""
    if not state.time_limit_minutes:
        state.minutes_elapsed += minutes


def tick(state: "GameState", now: float | None = None) -> bool:
    """Count the time since the last request. True when the limit has just run out."""
    if (
        not state.time_limit_minutes
        or state.time_up
        or state.status != GameStatus.IN_PROGRESS
    ):
        return False
    now = time.time() if now is None else now
    gap = now - state.last_tick_ts if state.last_tick_ts else 0.0
    if 0 < gap <= TICK_GAP_CAP_SECONDS:
        state.active_seconds += gap
    state.last_tick_ts = now
    # the night passes faster than real time: the whole span fits in the limit
    speed = (state.game_span_minutes or state.time_limit_minutes) / state.time_limit_minutes
    state.minutes_elapsed = int(state.active_seconds / 60 * speed)
    return state.active_seconds >= state.time_limit_minutes * 60
