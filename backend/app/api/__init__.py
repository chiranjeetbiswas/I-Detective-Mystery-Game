"""API package."""
from .routes_game import router as game_router
from .routes_meta import router as meta_router

__all__ = ["game_router", "meta_router"]
