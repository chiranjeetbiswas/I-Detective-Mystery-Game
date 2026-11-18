"""Password hashing (stdlib scrypt) and signed login tokens (JWT)."""
from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from functools import lru_cache

import jwt

from ..core.config import get_settings
from ..core.logging import get_logger

log = get_logger(__name__)

_N, _R, _P = 2**14, 8, 1


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=_N, r=_R, p=_P, dklen=32)
    return "$".join(
        ["scrypt", str(_N), str(_R), str(_P),
         base64.b64encode(salt).decode(), base64.b64encode(digest).decode()]
    )


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, n, r, p, salt_b64, digest_b64 = stored.split("$")
        if scheme != "scrypt":
            return False
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(digest_b64)
        actual = hashlib.scrypt(
            password.encode(), salt=salt, n=int(n), r=int(r), p=int(p), dklen=len(expected)
        )
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(actual, expected)


# A real hash to check against when the email is unknown, so "no such account"
# and "wrong password" take about the same time and look the same to a caller.
DUMMY_HASH = hash_password(secrets.token_urlsafe(16))


@lru_cache
def _secret() -> str:
    configured = get_settings().jwt_secret.strip()
    if configured:
        return configured
    log.warning(
        "JWT_SECRET is not set: using a random secret for this run. "
        "Logins will be reset on every restart."
    )
    return secrets.token_urlsafe(48)


def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=get_settings().jwt_expire_minutes)
    return jwt.encode({"sub": str(user_id), "iat": now, "exp": exp}, _secret(), algorithm="HS256")


def decode_access_token(token: str) -> int | None:
    """Return the user id inside a valid token, or None if it is bad or expired."""
    try:
        payload = jwt.decode(token, _secret(), algorithms=["HS256"])
        return int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None
