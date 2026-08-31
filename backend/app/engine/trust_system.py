"""Trust and suspicion adjustments driven by player behaviour.

Also derives a changing emotional *mood* from trust/stress/suspicion so NPCs
feel alive and react to how the detective treats them.
"""
from __future__ import annotations

from ..models.case import CharacterProfile
from ..models.enums import Mood
from ..models.game_state import NPCState

AGGRESSIVE_WORDS = (
    "threaten", "liar", "lying", "accuse", "guilty", "shut up", "confess",
    "idiot", "stupid", "arrest", "hate", "kill", "criminal", "fraud",
)
FRIENDLY_WORDS = (
    "help", "please", "thank", "trust", "understand", "safe", "protect",
    "sorry", "appreciate", "friend", "calm",
)


def _clamp(v: int) -> int:
    return max(0, min(100, v))


def _note(npc: NPCState, text: str, cap: int = 12) -> None:
    npc.relationship_notes.append(text)
    if len(npc.relationship_notes) > cap:
        npc.relationship_notes = npc.relationship_notes[-cap:]


def recompute_mood(npc: NPCState, profile: CharacterProfile | None = None) -> Mood:
    """Derive the current mood from trust/stress/suspicion (+ personality).

    A confident, guilty person stays calmer under pressure; a low-confidence
    person cracks into nervous/scared sooner.
    """
    confidence = profile.confidence if profile else 60
    stress = npc.stress
    # confident people resist stress; the effective pressure is lower for them
    effective_stress = stress - (confidence - 50) // 3

    if effective_stress >= 70:
        return Mood.SCARED
    if npc.suspicion_of_player >= 55 and effective_stress >= 45:
        return Mood.ANGRY
    if effective_stress >= 45:
        return Mood.NERVOUS
    if npc.suspicion_of_player >= 40:
        return Mood.SUSPICIOUS
    if npc.trust >= 75 and stress <= 30:
        return Mood.HAPPY
    if confidence >= 70 and stress <= 35:
        return Mood.CONFIDENT
    return Mood.CALM


def _refresh_mood(npc: NPCState, profile: CharacterProfile | None) -> None:
    npc.mood = recompute_mood(npc, profile)


def apply_conversation(
    npc: NPCState, player_text: str, profile: CharacterProfile | None = None
) -> None:
    """Adjust an NPC's trust/stress/suspicion based on how they were spoken to."""
    text = player_text.lower()
    npc.times_questioned += 1

    trust_delta = 0
    stress_delta = 0

    if any(w in text for w in AGGRESSIVE_WORDS):
        trust_delta -= 12
        stress_delta += 15
        npc.suspicion_of_player = _clamp(npc.suspicion_of_player + 10)
        _note(npc, "The detective spoke to me harshly.")
    if any(w in text for w in FRIENDLY_WORDS):
        trust_delta += 8
        stress_delta -= 5
        _note(npc, "The detective was kind to me.")

    # repeatedly hounding one suspect makes them cautious
    if npc.times_questioned >= 4:
        trust_delta -= 3
        npc.suspicion_of_player = _clamp(npc.suspicion_of_player + 5)

    npc.trust = _clamp(npc.trust + trust_delta)
    npc.stress = _clamp(npc.stress + stress_delta)
    _refresh_mood(npc, profile)


def on_room_searched(
    owner_npc: NPCState | None, profile: CharacterProfile | None = None
) -> None:
    """The owner of a searched room notices and grows wary."""
    if owner_npc is None:
        return
    owner_npc.suspicion_of_player = _clamp(owner_npc.suspicion_of_player + 15)
    owner_npc.trust = _clamp(owner_npc.trust - 8)
    owner_npc.stress = _clamp(owner_npc.stress + 8)
    _note(owner_npc, "The detective searched a room close to me.")
    _refresh_mood(owner_npc, profile)


def on_evidence_shown(
    npc: NPCState,
    evidence_id: str,
    implicates_them: bool,
    profile: CharacterProfile | None = None,
) -> None:
    if evidence_id not in npc.evidence_shown:
        npc.evidence_shown.append(evidence_id)
    if implicates_them:
        npc.stress = _clamp(npc.stress + 20)
        npc.suspicion_of_player = _clamp(npc.suspicion_of_player + 10)
        npc.trust = _clamp(npc.trust - 5)
        _note(npc, "The detective showed me a clue that points at me.")
    else:
        # cooperative sharing builds a little rapport
        npc.trust = _clamp(npc.trust + 4)
    _refresh_mood(npc, profile)


def on_false_accusation_broadcast(npcs: list[NPCState]) -> None:
    """Accusing innocents makes everyone defensive."""
    for npc in npcs:
        npc.trust = _clamp(npc.trust - 6)
        npc.suspicion_of_player = _clamp(npc.suspicion_of_player + 8)
        _refresh_mood(npc, None)
