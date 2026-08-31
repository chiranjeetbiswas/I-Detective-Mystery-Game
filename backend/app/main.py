"""FastAPI application entrypoint for Identity Hunt."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import game_router, meta_router
from .core.config import get_settings
from .core.logging import get_logger

log = get_logger(__name__)


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Identity Hunt API",
        version="1.0.0",
        description="Backend for the Identity Hunt AI detective game.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(game_router, prefix="/api", tags=["game"])
    app.include_router(meta_router, prefix="/api", tags=["meta"])

    @app.get("/api/health")
    def health():
        return {"status": "ok", "provider": settings.resolved_provider}

    log.info("Identity Hunt API ready (provider=%s)", settings.resolved_provider)
    return app


app = create_app()
