"""End-to-end smoke test for the Identity Hunt backend (mock provider)."""
import os
import sys

os.environ["LLM_PROVIDER"] = "mock"
os.environ["DATA_DIR"] = "./data_test"

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402

client = TestClient(app)


def check(name, cond):
    print(f"[{'PASS' if cond else 'FAIL'}] {name}")
    if not cond:
        sys.exit(1)


# health
r = client.get("/api/health")
check("health ok", r.status_code == 200 and r.json()["provider"] == "mock")

# new game
r = client.post("/api/games", json={"num_characters": 6, "difficulty": "normal"})
check("new game 200", r.status_code == 200)
snap = r.json()
gid = snap["state"]["game_id"]
check("6 characters", len(snap["characters"]) == 6)
check("no solution leaked mid-game", "solution" not in snap)
check("intro present", len(snap["brief"]["introduction"]) > 20)

# figure out the true target id from a fresh game via internal store (server-side)
from app.services import get_store  # noqa: E402
case, state = get_store().load_game(gid)
target_id = case.solution.target_character_id
start_minutes = state.minutes_elapsed

# talk action
r = client.post(f"/api/games/{gid}/action",
                json={"game_id": gid, "text": f"Talk to {case.characters[0].name}"})
check("talk 200", r.status_code == 200)
adata = r.json()
check("clock advanced", adata["state"]["minutes_elapsed"] > start_minutes)
check("has dialogue or narration",
      bool(adata["result"]["dialogue"] or adata["result"]["narration"]))

# search action reveals evidence somewhere
found_any = False
for room in [rm["name"] for rm in snap["rooms"]]:
    r = client.post(f"/api/games/{gid}/action",
                    json={"game_id": gid, "text": f"Search the {room}"})
    if r.json()["result"]["new_evidence"]:
        found_any = True
check("search reveals evidence in at least one room", found_any)

# hint
r = client.post(f"/api/games/{gid}/hint", json={"game_id": gid})
check("hint 200", r.status_code == 200 and len(r.json()["result"]["narration"]) > 5)

# notebook auto-recorded
r = client.get(f"/api/games/{gid}/notebook")
nbk = r.json()
check("notebook has characters", len(nbk["characters"]) == 6)
check("notebook has timeline", len(nbk["timeline"]) > 0)
check("notebook has evidence", len(nbk["evidence"]) > 0)

# save + list + resume
r = client.post("/api/saves", json={"game_id": gid, "slot": "slot1"})
check("save 200", r.status_code == 200)
r = client.get("/api/saves")
check("list saves", any(s["slot"] == "slot1" for s in r.json()["saves"]))
r = client.post("/api/saves/slot1/resume")
check("resume 200", r.status_code == 200)

# WRONG accusation path on a second game
r = client.post("/api/games", json={"num_characters": 5, "difficulty": "beginner"})
g2 = r.json()["state"]["game_id"]
c2, s2 = get_store().load_game(g2)
wrong_id = next(c.id for c in c2.characters if c.id != c2.solution.target_character_id)
r = client.post(f"/api/games/{g2}/accuse", json={"game_id": g2, "character_id": wrong_id})
res = r.json()["result"]
check("wrong accusation => lost", res["correct"] is False and res["status"] == "lost")
check("verdict text present", len(res["verdict"]) > 10)
check("solution revealed after game over", "solution" in r.json()["snapshot"])

# CORRECT accusation on a third game
r = client.post("/api/games", json={"num_characters": 4, "difficulty": "normal"})
g3 = r.json()["state"]["game_id"]
c3, s3 = get_store().load_game(g3)
r = client.post(f"/api/games/{g3}/accuse",
                json={"game_id": g3, "character_id": c3.solution.target_character_id})
res = r.json()["result"]
check("correct accusation => won", res["correct"] is True and res["status"] == "won")

# stats updated
r = client.get("/api/stats")
st = r.json()
check("stats total_games >= 2", st["total_games"] >= 2)
check("stats has rank", "rank" in st)
check("stats cases_solved >= 1", st["cases_solved"] >= 1)

# restart reuses same case, fresh state
r = client.post(f"/api/games/{g3}/restart")
rs = r.json()
check("restart new game id", rs["state"]["game_id"] != g3)
check("restart same case id", rs["state"]["case_id"] == c3.id)
check("restart status in_progress", rs["state"]["status"] == "in_progress")

# uniqueness: two generated cases differ
r1 = client.post("/api/games", json={"num_characters": 6, "difficulty": "expert"}).json()
r2 = client.post("/api/games", json={"num_characters": 6, "difficulty": "expert"}).json()
check("cases are unique",
      r1["brief"]["introduction"] != r2["brief"]["introduction"]
      or [x["name"] for x in r1["characters"]] != [x["name"] for x in r2["characters"]])

print("\nALL SMOKE TESTS PASSED")
