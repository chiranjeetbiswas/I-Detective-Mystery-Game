"""Game engine package."""
from .engine import GameEngine
from .time_system import format_clock, advance_for

__all__ = ["GameEngine", "format_clock", "advance_for"]
