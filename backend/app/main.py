"""FastAPI application entrypoint for Identity Hunt."""
from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

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
        allow_origin_regex=settings.cors_origin_regex or None,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Convert any unhandled error into a JSON 500. Returning a real response
    # (instead of letting the exception bubble to the raw server-error handler)
    # ensures the CORS middleware still attaches Access-Control-Allow-Origin,
    # so the browser reports the real error instead of a misleading CORS error.
    @app.exception_handler(Exception)
    async def _unhandled_exception(request: Request, exc: Exception):
        log.exception("Unhandled error on %s %s: %s", request.method, request.url.path, exc)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error", "error": str(exc)},
        )

    app.include_router(game_router, prefix="/api", tags=["game"])
    app.include_router(meta_router, prefix="/api", tags=["meta"])

    @app.get("/api/health")
    def health():
        return {"status": "ok", "provider": settings.resolved_provider}

    # Root + /healthz so platform health checks (Render, etc.) don't log 404s.
    @app.get("/")
    def root():
        return {
            "service": "Identity Hunt API",
            "status": "ok",
            "docs": "/docs",
            "health": "/api/health",
        }

    @app.get("/healthz")
    def healthz():
        return {"status": "ok"}

    log.info("Identity Hunt API ready (provider=%s)", settings.resolved_provider)
    return app


app = create_app()
