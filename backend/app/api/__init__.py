"""API package."""
from .routes_auth import router as auth_router
from .routes_game import router as game_router
from .routes_meta import router as meta_router

__all__ = ["auth_router", "game_router", "meta_router"]
