"""Case generation — call the LLM once, validate into an immutable Case.

Guarantees exactly one target and stable ids even if the model is imperfect.
"""
from __future__ import annotations

import uuid

from ..core.logging import get_logger
from ..llm import LLMMessage, get_provider
from ..llm.base import LLMProvider
from ..models.case import Case
from ..models.enums import Difficulty
from ..prompts import build_case_generator_messages

log = get_logger(__name__)


def generate_case(num_characters: int, difficulty: Difficulty) -> Case:
    """Generate an immutable Case.

    Tries the configured provider first. If it fails at runtime (bad API key,
    decommissioned model, rate limit, network error, malformed JSON, ...), fall
    back to the offline MockProvider so a game is always created. This prevents
    an unhandled 500 on POST /api/games (which would also strip CORS headers).
    """
    provider: LLMProvider = get_provider()
    try:
        return _build_case(provider, num_characters, difficulty)
    except Exception as exc:
        # Only worth retrying with mock if we weren't already using it.
        if getattr(provider, "name", "") == "mock":
            log.error("Case generation failed with mock provider: %s", exc)
            raise
        from ..llm.mock_provider import MockProvider

        log.warning(
            "Case generation failed with provider '%s' (%s); "
            "falling back to MockProvider.",
            getattr(provider, "name", "?"),
            exc,
        )
        return _build_case(MockProvider(), num_characters, difficulty)


def _build_case(
    provider: LLMProvider, num_characters: int, difficulty: Difficulty
) -> Case:
    system, user = build_case_generator_messages(num_characters, difficulty)
    raw = provider.complete(
        [LLMMessage("system", system), LLMMessage("user", user)],
        temperature=1.0,
        max_tokens=4096,
        json_mode=True,
    )
    data = provider.extract_json(raw)

    # assign a stable case id and normalise
    data["id"] = f"case_{uuid.uuid4().hex[:12]}"
    data.setdefault("difficulty", difficulty.value)
    _ensure_ids(data)
    _normalize(data, num_characters)
    _ensure_relationships_and_weakness(data)
    _ensure_single_target(data)
    case = Case.model_validate(data)
    log.info(
        "Generated case '%s' (%s chars, %s) target=%s",
        case.title,
        len(case.characters),
        case.difficulty.value,
        case.target.name,
    )
    return case


def _ensure_ids(data: dict) -> None:
    for i, c in enumerate(data.get("characters", [])):
        if not c.get("id"):
            c["id"] = f"char{i}"
    for i, e in enumerate(data.get("evidence", [])):
        if not e.get("id"):
            e["id"] = f"ev{i}"
    for i, r in enumerate(data.get("rooms", [])):
        if not r.get("id"):
            r["id"] = f"room{i}"


def _as_int(value, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _as_list(value) -> list:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


_LIKELY_FEMALE = {
    "emma", "sofia", "isabella", "olivia", "victoria", "amara", "priya",
    "camille", "freya", "nadia", "elena", "anna", "maria", "sarah", "laura",
    "mia", "lily", "grace", "clara", "rosa", "alice", "helen", "diana",
    "julia", "jessica", "mary", "elizabeth", "lucy",
}
_LIKELY_MALE = {
    "lucas", "marcus", "daniel", "nathan", "julian", "theo", "diego",
    "idris", "ronan", "james", "john", "robert", "david", "michael", "thomas",
    "william", "henry", "george", "samuel", "edward", "charles", "jack",
    "richard", "joseph", "alexander",
}


def _guess_gender(name: str) -> str:
    first = name.strip().split()[0].lower() if name else ""
    if first in _LIKELY_FEMALE:
        return "female"
    if first in _LIKELY_MALE:
        return "male"
    # heuristic: names ending in 'a' lean female in many Western datasets
    if first.endswith("a") or first.endswith("ia"):
        return "female"
    return "nonbinary"


def _normalize(data: dict, num_characters: int) -> None:
    """Fill defaults for any fields a real LLM may omit, so validation never
    fails on partial output. LLM responses are untrusted and imperfect."""
    # top-level
    data.setdefault("title", "The Case With No Answer")
    data.setdefault("location_type", "Mansion")
    data.setdefault("location_name", "a place that has not been named")
    data.setdefault("introduction", "A crime has happened. One guest is not who they say they are.")
    data.setdefault("crime", "A serious crime has happened here.")
    data.setdefault("target_fake_identity", "just another guest")
    data.setdefault("escape_plan", "The guilty person plans to slip away while everyone is confused.")
    data.setdefault("start_time", "8:00 PM")
    data.setdefault("hidden_clues", [])
    data.setdefault("red_herrings", [])

    # rooms
    rooms = data.get("rooms") or []
    if not rooms:
        rooms = [{"id": "room0", "name": "The Main Hall", "description": "A big room in the middle of the building."}]
    for i, r in enumerate(rooms):
        r.setdefault("id", f"room{i}")
        r.setdefault("name", f"Room {i + 1}")
        r.setdefault("description", "")
    data["rooms"] = rooms
    default_room = rooms[0]["name"]

    # characters
    chars = data.get("characters") or []
    for i, c in enumerate(chars):
        c.setdefault("id", f"char{i}")
        c.setdefault("name", f"Guest {i + 1}")
        c["age"] = _as_int(c.get("age"), 40)
        c.setdefault("occupation", "guest")
        c.setdefault("personality", "quiet")
        c.setdefault("background", "Nobody knows much about their past.")
        c.setdefault("secret", "They are hiding something small.")
        c.setdefault("goal", "to get through the night without being noticed")
        c.setdefault("alibi", f"Says they were in {default_room}.")
        # gender: normalise to one of the allowed values, else guess from name
        g = str(c.get("gender", "")).strip().lower()
        if g not in ("female", "male", "nonbinary"):
            g = _guess_gender(c.get("name", ""))
        c["gender"] = g
        # rich personality fields
        c.setdefault("speaking_style", "plain and natural")
        c.setdefault("habits", "")
        c.setdefault("fear", "")
        c["weakness"] = str(c.get("weakness") or "").strip()
        c["likes"] = [str(x) for x in _as_list(c.get("likes"))]
        c["dislikes"] = [str(x) for x in _as_list(c.get("dislikes"))]
        c["intelligence"] = max(0, min(100, _as_int(c.get("intelligence"), 60)))
        c["confidence"] = max(0, min(100, _as_int(c.get("confidence"), 60)))
        c["relationships"] = _as_list(c.get("relationships"))
        for rel in c["relationships"]:
            if isinstance(rel, dict):
                rel.setdefault("with_character", "")
                rel.setdefault("kind", "acquaintance")
                rel.setdefault("detail", "")
        # drop malformed relationship entries
        c["relationships"] = [r for r in c["relationships"] if isinstance(r, dict) and r.get("with_character")]
        c["knowledge"] = [str(k) for k in _as_list(c.get("knowledge"))]
        c["lies"] = [str(k) for k in _as_list(c.get("lies"))]
        c["inventory"] = [str(k) for k in _as_list(c.get("inventory"))]
        c["is_target"] = bool(c.get("is_target", False))
    data["characters"] = chars

    # evidence
    evidence = data.get("evidence") or []
    for i, e in enumerate(evidence):
        e.setdefault("id", f"ev{i}")
        e.setdefault("name", f"Clue {i + 1}")
        e.setdefault("description", "")
        e.setdefault("location", default_room)
        e.setdefault("points_to", "")
        e["is_red_herring"] = bool(e.get("is_red_herring", False))
        e["is_key_evidence"] = bool(e.get("is_key_evidence", False))
    data["evidence"] = evidence

    # timeline
    timeline = data.get("timeline") or []
    for ev in timeline:
        if isinstance(ev, dict):
            ev.setdefault("time", data["start_time"])
            ev.setdefault("description", "")
            ev["involved"] = [str(x) for x in _as_list(ev.get("involved"))]
    data["timeline"] = [ev for ev in timeline if isinstance(ev, dict)]

    # solution shell (fully synced later in _ensure_single_target)
    sol = data.setdefault("solution", {})
    sol.setdefault("reasoning", "The clues do not match their story or their name.")
    sol.setdefault("key_evidence_ids", [])


WEAKNESS_POOL = [
    "Easily frightened", "Short temper", "Overconfident", "Greedy", "Jealous",
    "Gullible", "Impatient", "Stubborn", "Naive", "Prideful",
    "Trusts strangers too easily", "Hates being questioned", "Seeks attention",
    "Easily embarrassed", "Can't keep secrets",
]


def _ensure_relationships_and_weakness(data: dict) -> None:
    """Guarantee every character has a weakness and knows at least one other
    guest. LLM/mock output may miss these; this makes the rules hold every game
    so the investigation stays learnable.
    """
    chars = data.get("characters", [])
    names = [c.get("name", "") for c in chars]
    for i, c in enumerate(chars):
        # weakness: assign a deterministic one from the pool if missing
        if not str(c.get("weakness") or "").strip():
            c["weakness"] = WEAKNESS_POOL[i % len(WEAKNESS_POOL)]

        # relationships: ensure at least one link to ANOTHER guest
        rels = [
            r for r in _as_list(c.get("relationships"))
            if isinstance(r, dict) and r.get("with_character")
            and r.get("with_character") != c.get("name")
            and r.get("with_character") in names
        ]
        if not rels and len(chars) > 1:
            other = chars[(i + 1) % len(chars)]
            rels = [{
                "with_character": other.get("name", ""),
                "kind": "acquaintance",
                "detail": f"{c.get('name')} has met {other.get('name')} before tonight.",
            }]
            # give them a true fact to share so the link is useful in play
            know = _as_list(c.get("knowledge"))
            know.append(f"{other.get('name')} was also here tonight.")
            c["knowledge"] = [str(k) for k in know]
        c["relationships"] = rels


def _ensure_single_target(data: dict) -> None:
    chars = data.get("characters", [])
    targets = [c for c in chars if c.get("is_target")]
    if len(targets) == 1:
        _sync_solution(data, targets[0])
        return
    # fix: keep the first, or fall back to solution.target_character_id
    sol_id = data.get("solution", {}).get("target_character_id")
    chosen = None
    for c in chars:
        c["is_target"] = False
    if sol_id:
        chosen = next((c for c in chars if c["id"] == sol_id), None)
    if chosen is None and targets:
        chosen = targets[0]
    if chosen is None and chars:
        chosen = chars[0]
    if chosen:
        chosen["is_target"] = True
        _sync_solution(data, chosen)


def _sync_solution(data: dict, target: dict) -> None:
    sol = data.setdefault("solution", {})
    sol["target_character_id"] = target["id"]
    sol.setdefault(
        "target_true_identity", f"The hidden person who was pretending to be {target.get('name')}"
    )
    sol.setdefault("reasoning", "The clues do not match their story or their name.")
    sol.setdefault(
        "key_evidence_ids",
        [e["id"] for e in data.get("evidence", []) if e.get("is_key_evidence")],
    )
