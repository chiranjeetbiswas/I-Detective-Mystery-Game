"""Test setup: an offline game (mock LLM) and a throwaway data folder + database.

The environment is set before the app is imported, because settings and the
database engine are created once at import time.
"""
import os
import tempfile
import uuid

_tmp = tempfile.mkdtemp(prefix="identity-hunt-tests-")
os.environ["LLM_PROVIDER"] = "mock"
os.environ["DATA_DIR"] = _tmp
os.environ["DATABASE_URL"] = ""
os.environ["JWT_SECRET"] = "test-secret-test-secret-test-secret"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture()
def make_account(client):
    """Create an account with a fresh email and return (headers, user)."""
    def _make(password: str = "correct horse battery"):
        email = f"player{uuid.uuid4().hex[:10]}@gmail.com"
        r = client.post(
            "/api/auth/register",
            json={"email": email, "password": password, "display_name": "Tester"},
        )
        assert r.status_code == 201, r.text
        body = r.json()
        return {"Authorization": f"Bearer {body['access_token']}"}, body["user"]

    return _make
