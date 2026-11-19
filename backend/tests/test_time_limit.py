"""The real-time limit: 30 minutes for 4-5 guests, an hour for 6 or more."""
import time

import pytest

from app.engine.time_system import (
    TICK_GAP_CAP_SECONDS,
    format_clock,
    limit_for,
    night_span,
    played_minutes,
    time_warning,
    tick,
)
from app.models.game_state import GameState
from app.services import get_store


@pytest.mark.parametrize("guests,minutes", [(4, 30), (5, 30), (6, 60), (8, 60)])
def test_limit_depends_on_guest_count(guests, minutes):
    assert limit_for(guests) == minutes


def test_time_only_counts_while_the_player_is_connected():
    s = GameState(id="g", case_id="c", time_limit_minutes=30)
    t = 1000.0
    tick(s, t)
    assert tick(s, t + 20) is False
    assert s.active_seconds == 20
    # a long gap (tab closed, game saved and quit) is not counted
    tick(s, t + 20 + TICK_GAP_CAP_SECONDS + 1)
    assert s.active_seconds == 20


def test_tick_reports_the_moment_time_runs_out():
    s = GameState(id="g", case_id="c", time_limit_minutes=30)
    s.active_seconds = 30 * 60 - 5
    s.last_tick_ts = 1000.0
    assert tick(s, 1010.0) is True


def test_new_games_get_a_limit_and_never_show_it(client):
    snap = client.post("/api/games", json={"num_characters": 5, "difficulty": "normal"}).json()
    assert "time_limit" not in str(snap["state"])
    _, state = get_store().load_game(snap["state"]["game_id"])
    assert state.time_limit_minutes == 30


def test_guests_leave_and_the_case_is_lost_when_time_is_up(client):
    snap = client.post("/api/games", json={"num_characters": 4, "difficulty": "normal"}).json()
    gid = snap["state"]["game_id"]
    case, state = get_store().load_game(gid)
    state.active_seconds = 30 * 60 - 1
    state.last_tick_ts = time.time() - 5
    get_store().save_game(case, state)

    r = client.post(f"/api/games/{gid}/tick").json()
    assert r["status"] == "lost" and r["time_up"] is True

    after = client.get(f"/api/games/{gid}").json()
    assert after["solution"]["target_name"]  # the truth is revealed
    assert any("Time is up" in t["text"] for t in after["transcript"])
    # the game is closed: no more actions
    res = client.post(f"/api/games/{gid}/action", json={"game_id": gid, "text": "look around"})
    assert res.json()["result"]["narration"].startswith("This case is closed")


def test_the_night_ends_at_six_in_the_morning():
    assert night_span("8:00 PM") == 10 * 60
    assert night_span("11:30 PM") == 6 * 60 + 30


@pytest.mark.parametrize("limit", [30, 60])
def test_the_whole_night_passes_inside_the_real_limit(limit):
    s = GameState(
        id="g", case_id="c", time_limit_minutes=limit, game_span_minutes=night_span("8:00 PM")
    )
    s.last_tick_ts = 1000.0
    s.active_seconds = limit * 60 / 2
    tick(s, 1000.0)
    # halfway through the real time it is about 1:00 AM
    assert format_clock("8:00 PM", s.minutes_elapsed) == "1:00 AM"
    s.active_seconds = limit * 60 - 1
    s.last_tick_ts = 2000.0
    assert tick(s, 2001.0) is True
    assert format_clock("8:00 PM", s.minutes_elapsed) == "6:00 AM"
    assert played_minutes(s) == limit


def test_the_guests_leave_at_six_am(client):
    snap = client.post("/api/games", json={"num_characters": 4, "difficulty": "normal"}).json()
    gid = snap["state"]["game_id"]
    case, state = get_store().load_game(gid)
    state.active_seconds = 30 * 60 - 1
    state.last_tick_ts = time.time() - 5
    get_store().save_game(case, state)
    done = client.post(f"/api/games/{gid}/tick").json()
    assert done["clock"] == format_clock(case.start_time, night_span(case.start_time))
    after = client.get(f"/api/games/{gid}").json()
    assert any("6:00 AM" in t["text"] for t in after["transcript"])


def test_clock_warns_only_in_the_last_five_real_minutes():
    s = GameState(id="g", case_id="c", time_limit_minutes=30)
    s.active_seconds = 25 * 60 - 1
    assert time_warning(s) is False
    s.active_seconds = 25 * 60
    assert time_warning(s) is True
    assert time_warning(GameState(id="g", case_id="c")) is False  # no limit


def test_state_shows_when_everyone_leaves_but_no_countdown(client):
    snap = client.post("/api/games", json={"num_characters": 4, "difficulty": "normal"}).json()
    st = snap["state"]
    assert st["leave_time"] == "6:00 AM" or st["leave_time"].endswith(("AM", "PM"))
    assert st["time_warning"] is False
    assert "remaining" not in str(st) and "time_limit" not in str(st)
