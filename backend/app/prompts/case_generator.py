"""Case generator prompt — produces the full immutable mystery as JSON.

Kept separate from every other prompt per the architecture rules.
"""
from __future__ import annotations

from ..models.enums import Difficulty

_DIFFICULTY_GUIDANCE = {
    Difficulty.BEGINNER: "Lots of clues. Most people tell the truth. Few fake clues.",
    Difficulty.NORMAL: "A fair number of clues. Some lies. A few fake clues.",
    Difficulty.EXPERT: "People are careful. More lies. Several fake clues.",
    Difficulty.MASTER: (
        "Many people are linked to each other. Almost no help. Many fake clues. "
        "The hidden person is very smart."
    ),
}

# Shared language rule. Every prompt module repeats it so the model always
# writes text the player can read easily.
SIMPLE_ENGLISH_RULE = (
    "LANGUAGE RULE (very important): use very simple English. Short sentences. "
    "Common, everyday words that a 12-year-old knows. No rare or fancy words. "
    "No long, winding sentences."
)

CASE_GENERATOR_SYSTEM = (
    "You are the CASE GENERATOR for a detective game called Identity Hunt. "
    "Make one complete mystery and return it as a SINGLE JSON object. "
    "Exactly ONE character must have is_target=true. That person is the hidden "
    "one who is using a fake name. Every other person must have a small secret "
    "of their own, so it is not easy to tell who the hidden one is. The clues "
    "must fit together: the key clues point to the hidden person and show that "
    "their story is not true. The fake clues point at someone else. "
    "Make every person feel alive and different: give each one a clear speaking "
    "style, a habit or tell, a fear, likes and dislikes, and set their "
    "intelligence and confidence. Pick a gender for each (female, male, or "
    "nonbinary). "
    f"{SIMPLE_ENGLISH_RULE} "
    "Do not add any comments — output ONLY valid JSON."
)


def build_case_generator_messages(num_characters: int, difficulty: Difficulty):
    schema = """
Return JSON with EXACTLY this shape:
{
  "title": str,
  "difficulty": "beginner|normal|expert|master",
  "location_type": one of ["Hotel","Mansion","Cruise Ship","Airport Lounge","Luxury Villa","Train","Safe House","Museum","Private Island","Research Facility"],
  "location_name": str,
  "introduction": str,
  "crime": str,
  "target_fake_identity": str,
  "escape_plan": str,
  "start_time": "8:00 PM",
  "rooms": [{"id": str, "name": str, "description": str}],
  "characters": [{
    "id": str, "name": str, "age": int,
    "gender": "female|male|nonbinary",
    "occupation": str, "personality": str,
    "background": str, "secret": str, "goal": str, "alibi": str,
    "speaking_style": str, "habits": str, "fear": str,
    "likes": [str], "dislikes": [str],
    "intelligence": int (0-100), "confidence": int (0-100),
    "relationships": [{"with_character": str, "kind": str, "detail": str}],
    "knowledge": [str], "lies": [str], "inventory": [str], "is_target": bool
  }],
  "timeline": [{"time": str, "description": str, "involved": [str]}],
  "evidence": [{"id": str, "name": str, "description": str, "location": str,
                "points_to": str, "is_red_herring": bool, "is_key_evidence": bool}],
  "hidden_clues": [str],
  "red_herrings": [str],
  "solution": {"target_character_id": str, "target_true_identity": str,
               "reasoning": str, "key_evidence_ids": [str]}
}
"""
    user = (
        f"Make a brand-new mystery. characters: {num_characters}. "
        f"difficulty: {difficulty.value}. Guidance: {_DIFFICULTY_GUIDANCE[difficulty]} "
        f"Make it exciting, but write every line in very simple English with short "
        f"sentences. Never repeat an old story.\n"
        f"Keep the 'introduction' SHORT: 3 to 4 short sentences. Say the place, "
        f"the crime, that one guest is using a fake name, and that the player must "
        f"find that person.\n{schema}"
    )
    return CASE_GENERATOR_SYSTEM, user
