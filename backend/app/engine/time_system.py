"""In-world time system. Every action advances the clock."""
from __future__ import annotations

from ..models.enums import ActionType

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
