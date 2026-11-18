"""Shared FastAPI dependencies: who is making this request?"""
from __future__ import annotations

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from ..db import User, get_db
from ..services.auth import decode_access_token

_bearer = HTTPBearer(auto_error=False)


def get_optional_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User | None:
    """The signed-in user, or None for a guest.

    A missing, bad or expired token counts as a guest rather than an error, so
    the game itself never breaks because a login ran out.
    """
    if creds is None:
        return None
    user_id = decode_access_token(creds.credentials)
    if user_id is None:
        return None
    return db.get(User, user_id)


def get_current_user(user: User | None = Depends(get_optional_user)) -> User:
    """For routes that only make sense for a signed-in player."""
    if user is None:
        raise HTTPException(401, "Please sign in", headers={"WWW-Authenticate": "Bearer"})
    return user
