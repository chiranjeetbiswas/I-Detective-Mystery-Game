"""Persistence services."""
from .store import GameStore, get_store
from .stats import StatsService, get_stats_service

__all__ = ["GameStore", "get_store", "StatsService", "get_stats_service"]
