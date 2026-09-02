"""Mock LLM provider — fully offline, no API key required.

It inspects the *system* prompt to detect which task is being asked (case
generation, NPC dialogue, narration, hint, ending) and produces coherent,
randomized output. Case generation returns valid JSON matching the schema the
engine expects, so the entire game is playable with zero external calls.

The mock is deliberately rich and varied so playthroughs feel unique.
"""
from __future__ import annotations

import json
import random
import re

from .base import LLMMessage, LLMProvider

# ---------------------------------------------------------------------------
# Content banks used to assemble varied mysteries.
# ---------------------------------------------------------------------------
_LOCATIONS = [
    ("Hotel", "The Meridian Grand Hotel"),
    ("Mansion", "Blackwood Manor"),
    ("Cruise Ship", "The Aurora Voyager"),
    ("Airport Lounge", "The Skyline Executive Lounge"),
    ("Luxury Villa", "Villa Serena"),
    ("Train", "The Continental Express"),
    ("Safe House", "The Ashgrove Safe House"),
    ("Museum", "The Rothbury Museum of Antiquities"),
    ("Private Island", "Isla Verde Retreat"),
    ("Research Facility", "The Helix Research Institute"),
]

_CRIMES = [
    "the theft of a very costly diamond called the Midnight Star",
    "the killing of a rich giver named Alistair Crowe",
    "the loss of a secret new machine",
    "the poisoning of the main guest of the night",
    "the swap of a famous painting with a fake one",
    "the sale of government secrets to a buyer from another country",
    "the ruin of the big event of the evening",
]

_FIRST = [
    "Emma", "Lucas", "Sofia", "Marcus", "Isabella", "Daniel", "Olivia",
    "Nathan", "Victoria", "Julian", "Amara", "Theo", "Priya", "Rowan",
    "Camille", "Diego", "Freya", "Idris", "Nadia", "Ronan",
]
# gender lookup for the first-name bank (drives avatar art on the client)
_FEMALE_NAMES = {
    "Emma", "Sofia", "Isabella", "Olivia", "Victoria", "Amara", "Priya",
    "Camille", "Freya", "Nadia",
}
_MALE_NAMES = {
    "Lucas", "Marcus", "Daniel", "Nathan", "Julian", "Theo", "Diego",
    "Idris", "Ronan",
}


def _gender_for(first_name: str) -> str:
    if first_name in _FEMALE_NAMES:
        return "female"
    if first_name in _MALE_NAMES:
        return "male"
    return "nonbinary"


_SPEAKING_STYLES = [
    "calm and polite", "short, clipped answers", "formal and careful",
    "warm and chatty", "cold and precise", "nervous, rambling",
    "smooth and charming", "gruff and blunt",
]
_HABITS = [
    "touches their necklace when nervous", "avoids eye contact",
    "taps the table while thinking", "smiles too much when lying",
    "clears their throat before a lie", "fidgets with a ring",
    "glances at the door often", "folds their arms when pushed",
]
_FEARS = [
    "the police", "being caught in a lie", "losing their good name",
    "the dark", "being left alone", "an old enemy finding them",
    "prison", "their secret coming out",
]
_WEAKNESSES = [
    "Easily frightened", "Short temper", "Overconfident", "Greedy", "Jealous",
    "Gullible", "Impatient", "Stubborn", "Naive", "Prideful",
    "Trusts strangers too easily", "Hates being questioned", "Seeks attention",
    "Easily embarrassed", "Can't keep secrets",
]
_LIKES = [
    "quiet rooms", "old books", "strong coffee", "fine wine", "music",
    "money", "control", "being praised", "the garden", "the sea",
]
_DISLIKES = [
    "loud people", "questions", "surprises", "the cold", "waiting",
    "being touched", "being rushed", "cheap things", "gossip",
]
_LAST = [
    "Vance", "Holloway", "Marchetti", "Sterling", "Okafor", "Delacroix",
    "Reyes", "Sinclair", "Novak", "Alcott", "Bianchi", "Fenwick",
    "Castellano", "Ashford", "Petrov", "Nakamura",
]
_OCCUPATIONS = [
    "art expert", "money investor", "retired government worker", "ship captain",
    "art shop owner", "security adviser", "doctor", "news reporter",
    "old furniture seller", "software company owner", "piano player", "wine taster",
    "crime teacher", "rich family heir", "house manager", "lab scientist",
]
_PERSONALITIES = [
    "friendly but hard to pin down", "cold and very exact",
    "nervous and talks a lot", "proud and rude", "warm and easy to like",
    "quiet and watchful", "loud and showy", "closed off and quick to defend",
    "smiles a lot, but always planning",
]
_SECRETS = [
    "owes a lot of money from betting",
    "was in a secret relationship with the victim",
    "was taking money from another guest to keep a secret quiet",
    "faked part of their papers years ago",
    "saw something that night and has not told anyone",
    "is using a false name, but for a different reason",
    "took a small thing earlier that night",
    "is covering for a family member",
]
_GOALS = [
    "to leave before anyone finds out the truth",
    "to get back a letter that would shame them",
    "to keep their good name safe, no matter what",
    "to pay someone back for an old wrong, quietly",
    "to look helpful while hiding a secret",
    "to find out who is watching them",
]

_ROOMS = [
    ("lobby", "The Grand Lobby", "A huge hall with stone floors and a wide staircase."),
    ("lounge", "The Lounge", "Soft yellow light, leather chairs, and slow music playing."),
    ("dining", "The Dining Room", "A long table, still set for dinner."),
    ("study", "The Private Study", "Book shelves, a heavy desk, and one locked drawer."),
    ("garden", "The Terrace Garden", "Cool night air, tall bushes, and a view of the water."),
    ("cabins", "The Guest Rooms", "A hallway of numbered doors. Most are half open."),
]

_EVIDENCE_BANK = [
    ("a torn train ticket", "A ticket ripped in two. The time on it is earlier than someone said."),
    ("a cloth with blood on it", "A fine cloth with two letters sewn on it and a dark stain."),
    ("a cheap phone", "A cheap phone with only one number called."),
    ("a fake passport", "It looks real, but the year of birth is a little bit wrong."),
    ("a hidden key", "A small brass key taped under a drawer."),
    ("a scary note", "Big letters: 'THEY KNOW. LEAVE TONIGHT.'"),
    ("a wine glass", "A half-full glass. The drink smells bitter."),
    ("a photo", "A photo of two guests who say they have never met."),
    ("a page from an account book", "A page of numbers that do not add up."),
    ("muddy shoes", "Costly shoes covered in garden mud, but it has not rained inside."),
]

_RANK_DIFFICULTY = {
    "beginner": dict(honesty=0.85, lies=1, herrings=1),
    "normal": dict(honesty=0.65, lies=2, herrings=2),
    "expert": dict(honesty=0.45, lies=3, herrings=3),
    "master": dict(honesty=0.30, lies=4, herrings=4),
}


def _slug(name: str) -> str:
    return name.lower().split()[0]


class MockProvider(LLMProvider):
    name = "mock"

    def complete(
        self,
        messages: list[LLMMessage],
        *,
        temperature: float = 0.8,
        max_tokens: int = 1024,
        json_mode: bool = False,
    ) -> str:
        system = next((m.content for m in messages if m.role == "system"), "")
        user = next((m.content for m in messages if m.role == "user"), "")
        tag = system.lower()

        if "case generator" in tag or "generate a complete" in tag:
            return self._gen_case(user)
        if "intent router" in tag or "router for an ai detective" in tag:
            return self._gen_detective_router(user)
        if "interview plan" in tag or "run your own interview" in tag:
            return self._gen_detective_interview(user)
        if "reporting back after interviewing" in tag or "investigation report" in tag:
            return self._gen_detective_report(user)
        if "detective teammate" in tag:
            return self._gen_detective_chat(user)
        if "npc" in tag or "in-character" in tag or "roleplay rules" in tag \
                or "one real person" in tag:
            return self._gen_dialogue(user)
        if "hint" in tag:
            return self._gen_hint(user)
        if "ending" in tag or "verdict" in tag:
            return self._gen_ending(user)
        # default → narrator
        return self._gen_narration(user)

    # ---- case generation ----------------------------------------------------
    def _gen_case(self, user: str) -> str:
        # parse requested count / difficulty out of the user prompt
        num = 6
        for token in ("4", "5", "6", "8", "10", "12"):
            if f"characters: {token}" in user or f"{token} characters" in user:
                num = int(token)
        difficulty = "normal"
        for d in _RANK_DIFFICULTY:
            if f"difficulty: {d}" in user.lower():
                difficulty = d
                break
        rng = random.Random()  # fresh randomness → unique each game

        loc_type, loc_name = rng.choice(_LOCATIONS)
        crime = rng.choice(_CRIMES)

        # build characters
        firsts = rng.sample(_FIRST, num)
        chars = []
        used_last: set[str] = set()
        for i, fn in enumerate(firsts):
            ln = rng.choice([l for l in _LAST if l not in used_last])
            used_last.add(ln)
            name = f"{fn} {ln}"
            job = rng.choice(_OCCUPATIONS)
            chars.append(
                {
                    "id": _slug(name) + str(i),
                    "name": name,
                    "age": rng.randint(28, 66),
                    "gender": _gender_for(fn),
                    "occupation": job,
                    "personality": rng.choice(_PERSONALITIES),
                    "background": f"A {job} with a messy past.",
                    "secret": f"{fn} {rng.choice(_SECRETS)}.",
                    "goal": f"{fn} wants {rng.choice(_GOALS)}.",
                    "alibi": f"Says they were in {rng.choice(_ROOMS)[1]} when it happened.",
                    "speaking_style": rng.choice(_SPEAKING_STYLES),
                    "habits": rng.choice(_HABITS),
                    "fear": rng.choice(_FEARS),
                    "weakness": _WEAKNESSES[i % len(_WEAKNESSES)],
                    "likes": rng.sample(_LIKES, 2),
                    "dislikes": rng.sample(_DISLIKES, 2),
                    "intelligence": rng.randint(40, 90),
                    "confidence": rng.randint(35, 90),
                    "relationships": [],
                    "knowledge": [],
                    "lies": [],
                    "inventory": [],
                    "is_target": False,
                }
            )

        # pick the hidden target
        target_idx = rng.randrange(num)
        chars[target_idx]["is_target"] = True
        target = chars[target_idx]
        fake_identity = f"{target['name']}, a {target['occupation']} people trust"

        # relationships (link neighbours)
        kinds = ["old rival", "old business partner", "brother or sister who no longer speaks to them",
                 "secret partner", "person they owe money to", "student"]
        for i, c in enumerate(chars):
            other = chars[(i + 1) % num]
            kind = rng.choice(kinds)
            c["relationships"].append(
                {
                    "with_character": other["name"],
                    "kind": kind,
                    "detail": f"{c['name']} knows {other['name']} as their {kind}.",
                }
            )
            # a true fact so the link is useful when questioned
            c["knowledge"].append(
                f"{other['name']} was near {rng.choice(_ROOMS)[1]} earlier tonight."
            )

        # rooms
        rooms = [{"id": r[0], "name": r[1], "description": r[2]} for r in _ROOMS]

        # evidence — some key (points to target), some herrings
        cfg = _RANK_DIFFICULTY[difficulty]
        ev_samples = rng.sample(_EVIDENCE_BANK, min(len(_EVIDENCE_BANK), num + 2))
        evidence = []
        key_ids = []
        for i, (en, ed) in enumerate(ev_samples):
            eid = f"ev{i}"
            is_key = i < 2  # first two implicate the target
            is_herring = (not is_key) and i <= (1 + cfg["herrings"])
            evidence.append(
                {
                    "id": eid,
                    "name": en,
                    "description": ed,
                    "location": rng.choice(rooms)["name"],
                    "points_to": target["name"] if is_key else (
                        rng.choice(chars)["name"] if is_herring else ""
                    ),
                    "is_red_herring": is_herring,
                    "is_key_evidence": is_key,
                }
            )
            if is_key:
                key_ids.append(eid)

        # give the target contradictory knowledge/lies keyed to evidence
        target["lies"] = [
            "Says they never went into the room where the main clue was found.",
            "Says all their papers are real.",
        ][: cfg["lies"]]
        target["knowledge"] = ["Knows exactly how the crime was done."]

        # non-targets: honest-ish knowledge, a few lies by difficulty
        for c in chars:
            if c["is_target"]:
                continue
            c["knowledge"] = [
                f"Saw {target['name']} acting strange near {rng.choice(rooms)['name']}.",
                "Heard an angry argument earlier that night.",
            ]
            c["lies"] = (
                [f"Hides one thing: {c['name'].split()[0]} {rng.choice(_SECRETS)}."]
                if rng.random() > cfg["honesty"]
                else []
            )

        timeline = [
            {"time": "7:30 PM", "description": "Guests arrive and start talking.", "involved": []},
            {"time": "8:00 PM", "description": f"The crime happens: {crime}.",
             "involved": [target["name"]]},
            {"time": "8:15 PM", "description": "The alarm goes off. No one may leave.",
             "involved": []},
            {"time": "8:30 PM", "description": f"{target['name']} is seen moving toward a side door.",
             "involved": [target["name"]]},
        ]

        case = {
            "title": f"The {loc_type} Mystery",
            "difficulty": difficulty,
            "location_type": loc_type,
            "location_name": loc_name,
            "introduction": (
                f"Tonight at {loc_name}, {crime} has turned the evening upside down. "
                f"No one is allowed to leave. {num} guests are still here, and each "
                f"one is hiding something. One of them is not who they say they are. "
                f"Find that person."
            ),
            "crime": crime.capitalize(),
            "target_fake_identity": fake_identity,
            "escape_plan": (
                f"{target['name']} plans to sneak out while everyone is confused, "
                f"and be gone before the police arrive."
            ),
            "start_time": "8:00 PM",
            "rooms": rooms,
            "characters": chars,
            "timeline": timeline,
            "evidence": evidence,
            "hidden_clues": [
                f"{target['name']}'s story about where they were does not match the {evidence[0]['name']}.",
                "Two guests say they have never met, but a photo shows they have.",
            ],
            "red_herrings": [
                e["name"] for e in evidence if e["is_red_herring"]
            ],
            "solution": {
                "target_character_id": target["id"],
                "target_true_identity": f"A wanted criminal pretending to be a {target['occupation']}",
                "reasoning": (
                    f"{target['name']} is the hidden person. The main clues "
                    f"({', '.join(e['name'] for e in evidence if e['is_key_evidence'])}) "
                    f"put them at the scene and show their story is not true. Their "
                    f"papers are fake too."
                ),
                "key_evidence_ids": key_ids,
            },
        }
        return json.dumps(case)

    # ---- dialogue -----------------------------------------------------------
    def _gen_dialogue(self, user: str) -> str:
        rng = random.Random(user[:64])
        # read the trust value out of the injected context ("Trust: 55")
        match = re.search(r"^trust[^:]*:\s*(\d+)", user, re.IGNORECASE | re.MULTILINE)
        low_trust = match is not None and int(match.group(1)) < 30

        # only judge the CURRENT detective line (the quoted line after
        # "the detective now says to you"), not the embedded memory/history
        line_match = re.search(
            r'detective now says to you\s*---?\s*"([^"]*)"', user, re.IGNORECASE
        )
        current_line = line_match.group(1).lower() if line_match else user.lower()
        aggressive = any(
            w in current_line for w in ("threaten", "accuse", "liar", "hate", "guilty")
        )
        is_target = "you_are_target: true" in user.lower()

        # mood-aware branching
        mood_match = re.search(r"current mood:\s*(\w+)", user, re.IGNORECASE)
        mood = mood_match.group(1).lower() if mood_match else "calm"

        # check if NPC has prior memory (not a stranger greeting)
        has_history = "detective asked:" in user.lower()

        if aggressive:
            if mood in ("angry", "scared"):
                return rng.choice([
                    "Get away from me! I am done talking to you.",
                    "You already pushed me too far. Leave me alone.",
                ])
            return rng.choice([
                "I do not like your tone. We are done talking.",
                "How dare you. I did nothing wrong. Go and ask someone else.",
                "You have no proof, detective. I owe you nothing.",
            ])
        if mood == "scared":
            return rng.choice([
                "Please, I am scared. Can we talk somewhere safer?",
                "I do not know what to do. Everything feels wrong.",
                "I heard a noise. Maybe someone is watching us.",
            ])
        if mood == "nervous":
            return rng.choice([
                "I... I am not sure I should say anything else.",
                "Can we make this quick? I do not feel safe here.",
                "Look, I already told you what I know. Why do you keep asking?",
            ])
        if mood == "angry":
            return rng.choice([
                "I already answered that. Do not waste my time.",
                "Ask someone else. I have nothing more to say.",
                "You are pointing fingers at everyone. Maybe that is the problem.",
            ])
        if mood == "suspicious":
            return rng.choice([
                "Why do you want to know that? What are you really after?",
                "That is a strange question, detective. Are you trying to trick me?",
                "I will answer, but I am watching you too.",
            ])
        if low_trust:
            return rng.choice([
                "I would rather not say. We do not know each other.",
                "Why should I tell you anything? Show me I can trust you first.",
                "That is my business, not yours.",
            ])
        if is_target:
            return rng.choice([
                "I was in the lounge all evening. Ask anyone.",
                "My papers are fine, I promise you.",
                "Whoever did this, it was not me. Look somewhere else.",
            ])
        if has_history:
            return rng.choice([
                "Like I said before, I saw something odd that night.",
                "I already told you my side. But yes, there is more I could share.",
                "You asked me about this before. I still say the same thing.",
                "Since you have been kind, I will tell you one more thing.",
            ])
        return rng.choice([
            "I did see something odd earlier. A guest was going where they should not go.",
            "Between us? Not everyone here is who they say they are. Watch the quiet one.",
            "I heard loud voices near the study just before it happened.",
            "I will tell you what I know, but keep my name out of it.",
        ])

    # ---- narration ----------------------------------------------------------
    def _gen_narration(self, user: str) -> str:
        rng = random.Random(user[:64])
        return rng.choice([
            "The room goes quiet while you look around. Every face here hides a story.",
            "You move slowly and notice the small things other people miss.",
            "The air feels tense. Somewhere in this room, the truth is waiting.",
            "You search with care. Something here does not belong.",
        ])

    # ---- hint ---------------------------------------------------------------
    def _gen_hint(self, user: str) -> str:
        return (
            "Compare what each guest says about where they were with the clues you "
            "have found. The one whose story does not match the main clue, and whose "
            "papers look wrong, is the one to watch."
        )

    # ---- detective team (AI teammates) --------------------------------------
    @staticmethod
    def _suspect_ids(user: str) -> list[tuple[str, str]]:
        """Parse the '- id: X | name: Y' suspect roster out of the context."""
        out = []
        for m in re.finditer(r"id:\s*([^\s|]+)\s*\|\s*name:\s*([^|]+)", user):
            out.append((m.group(1).strip(), m.group(2).strip()))
        return out

    @staticmethod
    def _detective_name(user: str) -> str:
        m = re.search(r"You are ([A-Z][a-z]+ [A-Z][a-z]+)", user)
        return m.group(1) if m else "Your teammate"

    def _gen_detective_router(self, user: str) -> str:
        low = user.lower()
        line = re.search(r'lead detective says ---\s*"([^"]*)"', user, re.IGNORECASE)
        text = (line.group(1) if line else user).lower()
        suspects = self._suspect_ids(user)

        # who: honour a named detective, else pick by specialty cue
        if "ryan" in text:
            det = "ryan"
        elif "ava" in text:
            det = "ava"
        elif any(w in text for w in ("time", "when", "timeline", "evidence", "alibi", "clue", "match", "logic")):
            det = "ryan"
        else:
            det = "ava"

        # interview intent: verbs that mean "go question someone"
        wants_interview = any(
            w in text for w in (
                "question", "interview", "follow up", "handle", "press",
                "talk to", "ask ", "investigate", "look into", "check on",
            )
        )
        target = ""
        if wants_interview and suspects:
            for sid, name in suspects:
                first = name.split()[0].lower()
                if first in text or name.lower() in text:
                    target = sid
                    break
        action = "interview" if (wants_interview and target) else "chat"
        reason = (
            f"Player wants an interview of the named suspect."
            if action == "interview" else "General discussion about the case."
        )
        return json.dumps({
            "detective_id": det,
            "action": action,
            "target_character_id": target,
            "reason": reason,
        })

    def _gen_detective_chat(self, user: str) -> str:
        name = self._detective_name(user)
        rng = random.Random(user[:80])
        psych = "reads people" in user.lower() or "body language" in user.lower()
        # ground the reply in whatever notes exist
        has_contra = "contradictions you spotted:" in user.lower() and \
            "none spotted" not in user.lower()
        if psych:
            base = [
                "From how they carried themselves, one guest kept looking away when "
                "money came up. That reaction is worth a second look.",
                "Watch the calm ones. The person with nothing to hide usually shows "
                "some worry — the too-smooth answers bother me.",
                "I'd press the guest who smiled at the wrong moment. Their feelings "
                "did not match their words.",
            ]
        else:
            base = [
                "Line up the times. If someone's story does not fit the clock we "
                "already built, that is our thread to pull.",
                "The evidence we found points one way, but one alibi does not line "
                "up with it. That gap is where I would dig next.",
                "Two statements we have cannot both be true. Sort that out and the "
                "case gets a lot smaller.",
            ]
        tail = " We should question them again to be sure." if has_contra else ""
        return rng.choice(base) + tail

    def _gen_detective_interview(self, user: str) -> str:
        rng = random.Random(user[:80])
        # target name from the '--- the suspect you will question ---' block
        m = re.search(r"suspect you will question ---\s*\nName:\s*([^\n]+)", user)
        who = m.group(1).strip() if m else "the suspect"
        psych = "reads people" in user.lower() or "psychology" in user.lower()
        if psych:
            qs = [
                "How did you feel when you heard what happened?",
                "You seem uneasy — is there something you have not told us?",
                "Who here do you trust the least, and why?",
                "When I mention the victim, your face changes — why is that?",
                "Was there anyone you argued with tonight?",
                "You paused just now. What were you about to say?",
                "Who do you think is lying to me, and what makes you sure?",
            ]
            opening = f"Mind if I sit with you a moment, {who}? Just want to understand you."
            goal = "Read their emotions and see what their reactions hide."
        else:
            qs = [
                "Walk me through exactly where you were, minute by minute.",
                "Who can confirm your story for that time?",
                "The clue we found does not fit your account — can you explain that?",
                "What time did you last see the victim?",
                "How did you get from one room to the other so fast?",
                "Someone placed you near the scene — is that wrong?",
                "Your story and another guest's do not line up. Which is true?",
            ]
            opening = f"{who}, I need to go over the timeline with you again."
            goal = "Nail down the timeline and test the alibi against the evidence."
        return json.dumps({
            "opening": opening,
            "questions": rng.sample(qs, k=2),
            "goal": goal,
        })

    def _gen_detective_report(self, user: str) -> str:
        name = self._detective_name(user)
        psych = "reads people" in user.lower() or "psychology" in user.lower()
        if psych:
            return (
                "They tensed up whenever the crime came up — they are hiding a "
                "feeling, not an alibi. Worth a second look."
            )
        return (
            "Their timing is off by about fifteen minutes from our log. That gap "
            "is new and suspicious — I'd confirm it with another guest."
        )

    # ---- ending -------------------------------------------------------------
    def _gen_ending(self, user: str) -> str:
        won = "correct: true" in user.lower()
        if won:
            return (
                "The mask comes off. The clues box them in and they lose their calm. "
                "The fake name, the story that never matched — all of it is now in "
                "the open. You were right. Case closed, detective."
            )
        return (
            "You say your case with a strong voice, but the pieces do not fit. The "
            "real guilty one walks out into the night. The truth was in front of you "
            "the whole time. This one got away."
        )
