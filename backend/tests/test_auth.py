"""Accounts, guest play, and per-account statistics."""
from app.services.auth import hash_password, verify_password


# ---- password hashing -------------------------------------------------------
def test_password_hash_is_salted_and_verifies():
    a, b = hash_password("hunter2hunter2"), hash_password("hunter2hunter2")
    assert a != b and "hunter2" not in a
    assert verify_password("hunter2hunter2", a)
    assert not verify_password("wrong-password", a)
    assert not verify_password("x", "not-a-valid-hash")


# ---- register / login / me --------------------------------------------------
def test_register_returns_token_and_me_works(client, make_account):
    headers, user = make_account()
    r = client.get("/api/auth/me", headers=headers)
    assert r.status_code == 200
    assert r.json()["email"] == user["email"]
    assert r.json()["display_name"] == "Tester"
    assert "password" not in r.text


def test_duplicate_email_is_rejected_case_insensitively(client, make_account):
    _, user = make_account()
    r = client.post(
        "/api/auth/register",
        json={"email": user["email"].upper(), "password": "another-long-pass"},
    )
    assert r.status_code == 409


def test_register_validates_input(client):
    short = client.post(
        "/api/auth/register", json={"email": "a@gmail.com", "password": "short"}
    )
    bad_email = client.post(
        "/api/auth/register", json={"email": "not-an-email", "password": "long-enough-pass"}
    )
    assert short.status_code == 422
    assert bad_email.status_code == 422


def test_display_name_defaults_to_email_name(client):
    r = client.post(
        "/api/auth/register",
        json={"email": "Sherlock.H@gmail.com", "password": "long-enough-pass"},
    )
    assert r.status_code == 201
    assert r.json()["user"]["display_name"] == "sherlock.h"


def test_login_success_and_failures(client, make_account):
    _, user = make_account(password="my-secret-pass")
    ok = client.post(
        "/api/auth/login", json={"email": user["email"], "password": "my-secret-pass"}
    )
    wrong = client.post(
        "/api/auth/login", json={"email": user["email"], "password": "nope-nope-nope"}
    )
    unknown = client.post(
        "/api/auth/login", json={"email": "nobody@gmail.com", "password": "nope-nope-nope"}
    )
    assert ok.status_code == 200 and ok.json()["access_token"]
    assert wrong.status_code == 401
    assert unknown.status_code == 401
    # the two failures must look identical, so emails can't be probed
    assert wrong.json() == unknown.json()


def test_me_requires_a_valid_token(client):
    assert client.get("/api/auth/me").status_code == 401
    bad = {"Authorization": "Bearer not.a.token"}
    assert client.get("/api/auth/me", headers=bad).status_code == 401


# ---- guest play -------------------------------------------------------------
def _play_and_accuse(client, headers=None):
    snap = client.post(
        "/api/games", json={"num_characters": 4, "difficulty": "beginner"}, headers=headers
    ).json()
    game_id = snap["state"]["game_id"]
    suspect = snap["characters"][0]["id"]
    r = client.post(
        f"/api/games/{game_id}/accuse",
        json={"game_id": game_id, "character_id": suspect},
        headers=headers,
    )
    return game_id, r


def test_guest_can_play_a_full_game_without_an_account(client):
    _, r = _play_and_accuse(client)
    assert r.status_code == 200
    assert "correct" in r.json()["result"]


def test_expired_or_bad_token_still_lets_you_play_as_guest(client):
    _, r = _play_and_accuse(client, headers={"Authorization": "Bearer garbage"})
    assert r.status_code == 200


# ---- per-account statistics -------------------------------------------------
def test_signed_in_results_go_to_the_account_not_the_guest_record(client, make_account):
    headers, _ = make_account()
    guest_before = client.get("/api/stats").json()["total_games"]

    _play_and_accuse(client, headers)

    mine = client.get("/api/stats", headers=headers).json()
    assert mine["total_games"] == 1
    assert mine["cases_solved"] + mine["cases_failed"] == 1
    assert client.get("/api/stats").json()["total_games"] == guest_before


def test_accounts_have_separate_records(client, make_account):
    a_headers, _ = make_account()
    b_headers, _ = make_account()
    _play_and_accuse(client, a_headers)
    assert client.get("/api/stats", headers=a_headers).json()["total_games"] == 1
    assert client.get("/api/stats", headers=b_headers).json()["total_games"] == 0


def test_accusing_the_same_game_twice_counts_once(client, make_account):
    headers, _ = make_account()
    game_id, _ = _play_and_accuse(client, headers)
    snap = client.get(f"/api/games/{game_id}").json()
    suspect = snap["characters"][0]["id"]
    client.post(
        f"/api/games/{game_id}/accuse",
        json={"game_id": game_id, "character_id": suspect},
        headers=headers,
    )
    assert client.get("/api/stats", headers=headers).json()["total_games"] == 1
