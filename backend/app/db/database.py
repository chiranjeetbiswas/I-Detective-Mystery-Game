"""SQLAlchemy engine/session setup (SQLite by default, Postgres via DATABASE_URL)."""
from __future__ import annotations

from collections.abc import Iterator
from functools import lru_cache
from pathlib import Path

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from ..core.config import get_settings
from ..core.logging import get_logger

log = get_logger(__name__)


class Base(DeclarativeBase):
    pass


@lru_cache
def get_engine() -> Engine:
    url = get_settings().resolved_database_url
    kwargs: dict = {"pool_pre_ping": True}
    if url.startswith("sqlite"):
        # FastAPI runs sync routes in a thread pool, so SQLite must allow
        # connections to be used from threads other than the one that made them.
        kwargs["connect_args"] = {"check_same_thread": False}
        # make sure the folder for the database file exists
        db_path = url.removeprefix("sqlite:///")
        if db_path and db_path != ":memory:":
            Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    return create_engine(url, **kwargs)


@lru_cache
def _session_factory() -> sessionmaker[Session]:
    return sessionmaker(bind=get_engine(), expire_on_commit=False)


def init_db() -> None:
    """Create any missing tables. Safe to call on every startup."""
    from . import models  # noqa: F401  (registers the tables on Base)

    Base.metadata.create_all(get_engine())


def get_db() -> Iterator[Session]:
    """FastAPI dependency: one session per request."""
    db = _session_factory()()
    try:
        yield db
    finally:
        db.close()
