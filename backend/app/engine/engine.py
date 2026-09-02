"""Core game engine — orchestrates a turn end to end.

Responsibilities:
- create a new game (generate immutable case + fresh mutable state)
- route a natural-language action to the right handler + prompt
- apply time, trust, suspicion, notebook effects
- resolve the single final accusation

Only the minimal relevant state slice is ever sent to the LLM.
"""
from __future__ import annotations

import uuid

from ..core.logging import get_logger
from ..llm import LLMMessage, get_provider
from ..models.case import Case, CharacterProfile
from ..models.dto import ActionResponse, NewGameRequest
from ..models.enums import ActionType, GameStatus, NPCStatus
from ..models.game_state import GameState, NPCState, TranscriptLine, build_detective_roster
from ..prompts import (
    build_ending_messages,
    build_hint_messages,
    build_narrator_messages,
    build_npc_messages,
)
from . import notebook as nb
from . import trust_system as trust
from . import detective_engine as det_engine
from .action_parser import Intent, parse
from .case_generator import generate_case
from .time_system import advance_for, format_clock

log = get_logger(__name__)


class GameEngine:
    """Stateless orchestrator; all mutable data lives in GameState."""

    def __init__(self) -> None:
        self._provider = get_provider()

    # ---- lifecycle ----------------------------------------------------------
    def new_game(self, req: NewGameRequest) -> tuple[Case, GameState]:
        case = generate_case(req.num_characters, req.difficulty)
        state = GameState(
            id=f"game_{uuid.uuid4().hex[:12]}",
            case_id=case.id,
            current_location=case.rooms[0].name if case.rooms else case.location_name,
            current_objective=self._build_objective(case),
        )
        # init per-NPC runtime state
        base_trust = {"beginner": 60, "normal": 50, "expert": 42, "master": 35}
        bt = base_trust.get(case.difficulty.value, 50)
        for c in case.characters:
            npc = NPCState(character_id=c.id, trust=bt)
            npc.mood = trust.recompute_mood(npc, c)
            state.npc_states[c.id] = npc
        # AI detective teammates observe the whole case with independent memory
        state.detectives = build_detective_roster()
        # pre-seed notebook with characters + timeline
        for c in case.characters:
            nb.record_character_met(state, c, case.start_time)
        nb.record_timeline(state, case)
        state.transcript.append(
            TranscriptLine(
                at_time=case.start_time,
                speaker="Narrator",
                text=case.introduction,
                kind="narration",
            )
        )
        return case, state

    # ---- dynamic objective --------------------------------------------------
    @staticmethod
    def _build_objective(case: Case) -> str:
        """Build a short, case-specific job line for the sidebar.

        It changes with the crime, place, guest count and difficulty, so the
        objective is never the same generic sentence twice.
        """
        import random

        n = len(case.characters)
        place = case.location_name or case.location_type.value
        crime = (case.crime or "the crime").rstrip(".")
        # keep it short and simple; the crime text is already simple English
        crime_short = crime[0].lower() + crime[1:] if crime else "what happened"

        openers = [
            f"One of the {n} guests at {place} is using a fake name.",
            f"At {place} tonight, {n} guests are trapped — and one is lying about who they are.",
            f"Among the {n} people at {place}, one is not who they claim to be.",
            f"{n} guests. One fake identity. It happened at {place}.",
        ]
        tasks = [
            f"Search the rooms, talk to everyone, and find the person behind {crime_short}.",
            f"Look for clues, compare their stories, and unmask the one behind {crime_short}.",
            f"Find the clue that breaks their alibi and name the person behind {crime_short}.",
            f"Match the clues to the lies and point out the guilty one behind {crime_short}.",
        ]
        hint_by_diff = {
            "beginner": "There are many clues to help you.",
            "normal": "Some guests lie. Check their stories carefully.",
            "expert": "Guests are careful and some clues are fake. Be sharp.",
            "master": "No hints here. Trust only the clues that fit together.",
        }
        rng = random.Random(case.id)  # stable per case, varied across cases
        opener = rng.choice(openers)
        task = rng.choice(tasks)
        tip = hint_by_diff.get(case.difficulty.value, "")
        return f"{opener} {task} {tip}".strip()

    # ---- main turn ----------------------------------------------------------
    def handle_action(self, case: Case, state: GameState, text: str) -> ActionResponse:
        if state.status != GameStatus.IN_PROGRESS:
            return self._simple(state, "This case is closed. Start a new game.")

        intent = parse(case, text)

        # If a character is the active conversation and the player did not clearly
        # ask for a different action (search/move/hint), keep talking to them.
        if (
            state.active_character_id
            and intent.action in (ActionType.TALK, ActionType.THINK, ActionType.OBSERVE)
            and not intent.target_character_id
            and not intent.target_room
        ):
            intent.action = ActionType.TALK
            intent.target_character_id = state.active_character_id

        state.transcript.append(
            TranscriptLine(
                at_time=format_clock(case.start_time, state.minutes_elapsed),
                speaker="You",
                text=text,
                kind="dialogue",
                character_id=intent.target_character_id or state.active_character_id
                if intent.action in (ActionType.TALK, ActionType.SHOW) else "",
            )
        )

        handler = {
            ActionType.TALK: self._talk,
            ActionType.SHOW: self._show,
            ActionType.SEARCH: self._search,
            ActionType.OBSERVE: self._observe,
            ActionType.MOVE: self._move,
            ActionType.HINT: self._hint,
            ActionType.THINK: self._think,
        }[intent.action]

        resp = handler(case, state, intent)

        # advance clock
        state.minutes_elapsed += advance_for(intent.action)
        state.touch()
        resp.at_time = format_clock(case.start_time, state.minutes_elapsed)
        resp.minutes_elapsed = state.minutes_elapsed
        resp.status = state.status.value
        resp.active_character_id = state.active_character_id
        return resp

    # ---- persistent active conversation -------------------------------------
    def select_character(
        self, case: Case, state: GameState, character_id: str
    ) -> ActionResponse:
        """Make a character the active conversation target and keep it that way
        until the player selects someone else."""
        profile = case.character_by_id(character_id)
        if profile is None:
            return self._simple(state, "There is no one here by that name.")

        # clear the old active NPC's TALKING flag
        old = state.npc_states.get(state.active_character_id)
        if old and old.status == NPCStatus.TALKING:
            old.status = NPCStatus.AVAILABLE

        state.active_character_id = character_id
        npc = state.npc_states[character_id]
        npc.status = NPCStatus.TALKING

        greeting = "You turn to " if npc.has_met else "You walk over to "
        note = (
            f"{greeting}{profile.name}. "
            + ("You have spoken before." if npc.has_met else "You have not spoken yet.")
        )
        state.transcript.append(
            TranscriptLine(
                at_time=format_clock(case.start_time, state.minutes_elapsed),
                speaker="Narrator", text=note, kind="narration",
                character_id=character_id,
            )
        )
        state.touch()
        return ActionResponse(
            game_id=state.id, narration=note, speaker="Narrator",
            at_time=format_clock(case.start_time, state.minutes_elapsed),
            minutes_elapsed=state.minutes_elapsed, status=state.status.value,
            active_character_id=character_id, mood=npc.mood.value,
        )

    def talk_to(
        self, case: Case, state: GameState, text: str, character_id: str = ""
    ) -> ActionResponse:
        """Directed conversation. Uses the given character, or the active one.

        This is the primary conversation path: the player never has to re-name
        the character each message.
        """
        if state.status != GameStatus.IN_PROGRESS:
            return self._simple(state, "This case is closed. Start a new game.")

        cid = character_id or state.active_character_id
        profile = case.character_by_id(cid) if cid else None
        if profile is None:
            return self._simple(
                state, "Pick a guest to talk to first, then ask your question."
            )

        # selecting a new character switches the active conversation
        if cid != state.active_character_id:
            old = state.npc_states.get(state.active_character_id)
            if old and old.status == NPCStatus.TALKING:
                old.status = NPCStatus.AVAILABLE
            state.active_character_id = cid
            state.npc_states[cid].status = NPCStatus.TALKING

        # record the player's line against this character's thread
        state.transcript.append(
            TranscriptLine(
                at_time=format_clock(case.start_time, state.minutes_elapsed),
                speaker="You", text=text, kind="dialogue", character_id=cid,
            )
        )

        intent = Intent(ActionType.TALK, target_character_id=cid, raw=text)
        resp = self._talk(case, state, intent)

        state.minutes_elapsed += advance_for(ActionType.TALK)
        state.touch()
        resp.at_time = format_clock(case.start_time, state.minutes_elapsed)
        resp.minutes_elapsed = state.minutes_elapsed
        resp.status = state.status.value
        resp.active_character_id = state.active_character_id
        return resp


    # ---- AI detective team --------------------------------------------------
    def detective_message(self, case: Case, state: GameState, text: str) -> dict:
        """Route a natural-language message to the detective team. The LLM
        decides which detective responds and whether to start an interview.

        Returns a dict:
          - for a chat:     {mode:'chat', detective_id, detective_name, reply, reason}
          - for interview:  {mode:'interview', detective_id, detective_name,
                             target_character_id, target_name, reason}
            (the actual interview is run via detective_interview so the frontend
             can stream it)
        """
        if state.status != GameStatus.IN_PROGRESS:
            return {"mode": "chat", "reply": "The case is closed.",
                    "detective_id": "", "detective_name": ""}

        decision = det_engine.route_message(self._provider, case, state, text)
        det = state.detectives[decision["detective_id"]]

        if decision["action"] == "interview" and decision["target_character_id"]:
            target = case.character_by_id(decision["target_character_id"])
            det.assignment = f"About to question {target.name if target else 'a suspect'}"
            state.touch()
            return {
                "mode": "interview",
                "detective_id": det.detective_id,
                "detective_name": det.name,
                "target_character_id": decision["target_character_id"],
                "target_name": target.name if target else "",
                "reason": decision["reason"],
            }

        reply = det_engine.detective_chat(self._provider, case, state, det, text)
        state.touch()
        return {
            "mode": "chat",
            "detective_id": det.detective_id,
            "detective_name": det.name,
            "reply": reply,
            "reason": decision["reason"],
        }

    def detective_interview(
        self, case: Case, state: GameState, detective_id: str, character_id: str
    ) -> dict:
        """Run one autonomous interview end-to-end and return the full scripted
        turn sequence + report for the frontend to stream."""
        det = state.detectives.get(detective_id)
        if det is None:
            return {"error": "unknown detective"}
        result = det_engine.run_interview(
            self._provider, case, state, det, character_id
        )
        state.minutes_elapsed += 6  # an independent interview costs some time
        state.touch()
        return result

    def settle_detective(self, state: GameState, detective_id: str) -> None:
        det_engine.settle_after_interview(state, detective_id)
        state.touch()

    # ---- handlers -----------------------------------------------------------
    def _talk(self, case: Case, state: GameState, intent: Intent) -> ActionResponse:
        cid = intent.target_character_id or state.active_character_id
        profile = case.character_by_id(cid) if cid else None
        if profile is None:
            return self._narrate(case, state, intent,
                                  "You are not sure who you are talking to.")
        npc = state.npc_states[cid]

        # talking to someone makes them the active conversation target
        if cid != state.active_character_id:
            old = state.npc_states.get(state.active_character_id)
            if old and old.status == NPCStatus.TALKING:
                old.status = NPCStatus.AVAILABLE
        state.active_character_id = cid
        npc.status = NPCStatus.TALKING

        before = npc.trust
        trust.apply_conversation(npc, intent.raw, profile)

        system, ctx = build_npc_messages(case, profile, npc, state, intent.raw)
        dialogue = self._provider.complete(
            [LLMMessage("system", system), LLMMessage("user", ctx)],
            temperature=0.9,
            max_tokens=220,
        ).strip()
        if not dialogue:
            dialogue = "I have nothing to say about that."

        # structured per-character memory
        npc.record_exchange(
            format_clock(case.start_time, state.minutes_elapsed), intent.raw, dialogue
        )
        npc.remember(f"Detective asked: '{intent.raw[:80]}'")
        # if this NPC delivered one of their scripted lies, remember it to stay consistent
        for lie in profile.lies:
            if lie and lie[:24].lower() in dialogue.lower() and lie not in npc.lies_told:
                npc.lies_told.append(lie)

        # high trust unlocks a recorded secret
        if npc.trust >= 80 and profile.secret not in npc.revealed_knowledge:
            npc.revealed_knowledge.append(profile.secret)
            nb.record_secret(state, f"{profile.name}'s secret", profile.secret,
                             format_clock(case.start_time, state.minutes_elapsed))
        npc.has_met = True
        nb.record_character_met(state, profile,
                                format_clock(case.start_time, state.minutes_elapsed))

        state.transcript.append(
            TranscriptLine(
                at_time=format_clock(case.start_time, state.minutes_elapsed),
                speaker=profile.name, text=dialogue, kind="dialogue",
                character_id=cid,
            )
        )
        # AI detectives are always listening: feed this exchange into their memory
        det_engine.observe_exchange(
            state, profile.name, intent.raw, dialogue, npc.mood.value,
            format_clock(case.start_time, state.minutes_elapsed),
        )
        return ActionResponse(
            game_id=state.id, speaker=profile.name, speaker_character_id=cid,
            dialogue=dialogue, at_time="", minutes_elapsed=0, status="",
            trust_changes={cid: npc.trust - before},
            active_character_id=cid, mood=npc.mood.value,
        )

    def _show(self, case: Case, state: GameState, intent: Intent) -> ActionResponse:
        cid = intent.target_character_id or state.active_character_id
        profile = case.character_by_id(cid) if cid else None
        if profile is None:
            return self._narrate(case, state, intent,
                                  "There is no one here to show that to.")
        npc = state.npc_states[cid]
        state.active_character_id = cid
        npc.status = NPCStatus.TALKING
        # pick the most relevant discovered evidence
        ev = next(
            (case.evidence_by_id(e) for e in state.discovered_evidence
             if case.evidence_by_id(e)), None,
        )
        implicates = bool(ev and ev.points_to.lower() == profile.name.lower())
        if ev:
            trust.on_evidence_shown(npc, ev.id, implicates, profile)
            npc.remember(f"Detective showed me: {ev.name}")
        system, ctx = build_npc_messages(
            case, profile, npc, state,
            f"[shows evidence: {ev.name if ev else 'nothing in hand'}] {intent.raw}",
        )
        dialogue = self._provider.complete(
            [LLMMessage("system", system), LLMMessage("user", ctx)],
            temperature=0.9, max_tokens=220,
        ).strip()
        if not dialogue:
            dialogue = "I do not want to talk about that."
        npc.record_exchange(
            format_clock(case.start_time, state.minutes_elapsed),
            f"[showed {ev.name if ev else 'a clue'}] {intent.raw}", dialogue,
        )
        npc.has_met = True
        if implicates and ev:
            nb.record_contradiction(
                state, f"{profile.name} reacted to {ev.name}",
                "They looked worried when you showed them this clue.",
                format_clock(case.start_time, state.minutes_elapsed),
            )
        state.transcript.append(
            TranscriptLine(at_time=format_clock(case.start_time, state.minutes_elapsed),
                           speaker=profile.name, text=dialogue, kind="dialogue",
                           character_id=cid)
        )
        det_engine.observe_exchange(
            state, profile.name, f"[showed {ev.name if ev else 'a clue'}] {intent.raw}",
            dialogue, npc.mood.value,
            format_clock(case.start_time, state.minutes_elapsed),
        )
        return ActionResponse(game_id=state.id, speaker=profile.name,
                              speaker_character_id=cid, dialogue=dialogue, at_time="",
                              minutes_elapsed=0, status="", active_character_id=cid,
                              mood=npc.mood.value)

    def _search(self, case: Case, state: GameState, intent: Intent) -> ActionResponse:
        room = intent.target_room or state.current_location
        if room and room not in state.visited_rooms:
            state.visited_rooms.append(room)
        # reveal evidence located in this room
        newly: list[str] = []
        for e in case.evidence:
            if e.location.lower() == (room or "").lower() and e.id not in state.discovered_evidence:
                state.discovered_evidence.append(e.id)
                nb.record_evidence(state, e, format_clock(case.start_time, state.minutes_elapsed))
                newly.append(e.name)
        # owner of the room (by alibi mention) notices
        owner_pair = next(
            ((state.npc_states[c.id], c) for c in case.characters
             if room and room.lower() in c.alibi.lower()), None,
        )
        if owner_pair:
            trust.on_room_searched(owner_pair[0], owner_pair[1])

        resp = self._narrate(case, state, intent,
                             revealed=newly, location=room)
        resp.new_evidence = newly
        # detectives note any clues the team just found
        if newly:
            det_engine.sync_clue_memory(case, state)
        return resp

    def _observe(self, case: Case, state: GameState, intent: Intent) -> ActionResponse:
        return self._narrate(case, state, intent)

    def _move(self, case: Case, state: GameState, intent: Intent) -> ActionResponse:
        if intent.target_room:
            state.current_location = intent.target_room
            if intent.target_room not in state.visited_rooms:
                state.visited_rooms.append(intent.target_room)
        return self._narrate(case, state, intent, location=state.current_location)

    def _think(self, case: Case, state: GameState, intent: Intent) -> ActionResponse:
        return self._narrate(case, state, intent)

    def _hint(self, case: Case, state: GameState, intent: Intent) -> ActionResponse:
        if case.difficulty.value == "master":
            state.hints_used += 1
            return self._narrate(case, state, intent,
                                 override="Master Detective mode gives no hints. You must work it out yourself.")
        system, ctx = build_hint_messages(case, state)
        hint = self._provider.complete(
            [LLMMessage("system", system), LLMMessage("user", ctx)],
            temperature=0.7, max_tokens=160,
        ).strip()
        state.hints_used += 1
        state.transcript.append(
            TranscriptLine(at_time=format_clock(case.start_time, state.minutes_elapsed),
                           speaker="Hint", text=hint, kind="system")
        )
        return ActionResponse(game_id=state.id, narration=hint, speaker="Hint",
                              at_time="", minutes_elapsed=0, status="")

    # ---- accusation (single, final) ----------------------------------------
    def accuse(self, case: Case, state: GameState, character_id: str):
        from ..models.dto import AccuseResponse

        if state.accusation_made or state.status != GameStatus.IN_PROGRESS:
            return AccuseResponse(
                game_id=state.id, correct=(state.status == GameStatus.WON),
                status=state.status.value, verdict="You have already named your suspect.",
                true_target_id=case.target.id, true_target_name=case.target.name,
                reasoning=case.solution.reasoning,
            )
        state.accusation_made = True
        state.accused_character_id = character_id
        correct = character_id == case.solution.target_character_id
        state.status = GameStatus.WON if correct else GameStatus.LOST
        state.touch()

        accused = case.character_by_id(character_id)
        accused_name = accused.name if accused else "an unknown suspect"
        system, ctx = build_ending_messages(case, accused_name, correct)
        verdict = self._provider.complete(
            [LLMMessage("system", system), LLMMessage("user", ctx)],
            temperature=0.8, max_tokens=300,
        ).strip()
        state.transcript.append(
            TranscriptLine(at_time=format_clock(case.start_time, state.minutes_elapsed),
                           speaker="Verdict", text=verdict, kind="narration")
        )
        return AccuseResponse(
            game_id=state.id, correct=correct, status=state.status.value,
            verdict=verdict, true_target_id=case.target.id,
            true_target_name=case.target.name, reasoning=case.solution.reasoning,
        )

    # ---- helpers ------------------------------------------------------------
    def _narrate(self, case: Case, state: GameState, intent: Intent,
                 override: str | None = None, revealed: list[str] | None = None,
                 location: str = "") -> ActionResponse:
        if override is not None:
            narration = override
        else:
            system, ctx = build_narrator_messages(
                case, state, intent.raw, revealed_evidence_names=revealed,
                location=location,
            )
            narration = self._provider.complete(
                [LLMMessage("system", system), LLMMessage("user", ctx)],
                temperature=0.85, max_tokens=180,
            ).strip()
            # the model sometimes returns nothing; never show the player a blank line
            if not narration:
                if revealed:
                    narration = "You look around and find " + ", ".join(revealed) + "."
                else:
                    narration = "You look around, but nothing stands out."
        state.transcript.append(
            TranscriptLine(at_time=format_clock(case.start_time, state.minutes_elapsed),
                           speaker="Narrator", text=narration, kind="narration")
        )
        return ActionResponse(game_id=state.id, narration=narration, speaker="Narrator",
                              at_time="", minutes_elapsed=0, status="")

    def _simple(self, state: GameState, msg: str) -> ActionResponse:
        return ActionResponse(
            game_id=state.id, narration=msg, speaker="Narrator",
            at_time=format_clock("8:00 PM", state.minutes_elapsed),
            minutes_elapsed=state.minutes_elapsed, status=state.status.value,
        )
