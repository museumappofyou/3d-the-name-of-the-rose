"""Prompt templates for extraction and consolidation passes."""

from __future__ import annotations

EXTRACT_SYSTEM = (
    "You are a precise architectural/spatial information-extraction engine. "
    "You output only valid JSON, never markdown fences, never commentary."
)

CATEGORIES = [
    "site_landscape",
    "general_layout",
    "building_space",
    "architectural_element",
    "geometry",
    "material_appearance",
    "spatial_relation",
    "movement",
    "visibility",
    "access_security",
    "function_activity",
    "sensory_environment",
    "temporal_change",
    "other",
]

CERTAINTIES = ["EXPLICIT", "STRONG_INFERENCE", "WEAK_INFERENCE", "AMBIGUOUS"]

RELATIONS = [
    "north_of", "south_of", "east_of", "west_of", "above", "below", "inside",
    "outside", "adjacent_to", "opposite", "between", "behind", "in_front_of",
    "near", "far_from", "overlooks", "faces", "opens_into", "connected_to",
    "entered_through", "reached_via", "visible_from", "contains", "part_of",
]

EXTRACT_PROMPT = """TASK
You receive one sequential chunk of the Turkish novel "Gülün Adı" (Umberto Eco, "The Name of the Rose"). It is marked with paragraph numbers like [P123] at the start of each paragraph. Numbering is global for the book; keep the same numbers in your answer.

Read the ENTIRE chunk from beginning to end and extract EVERY statement that carries information about the physical abbey ("manastır") where the story happens: the site and landscape around it, its walls, gates, courtyards, buildings, rooms, architecture, geometry, materials, appearance, relative positions, access rules, functions, what is visible from where, and how characters move through the complex.

This is a HIGH-RECALL extraction, NOT a summary. Extract even incidental, repeated or trivial details: a character turns right after leaving a room, a window overlooks another building, a staircase reaches the floor above, a door is locked, one room is warmer, smoke comes from a direction, a wall is unusually thick, one structure dominates another visually. A single sentence can be decisive.

Do not extract plot, theology, dialogue content, emotions or character description UNLESS it reveals a physical place, its attributes, or movement/visibility/access.

ABSOLUTE RULES
1. Use ONLY the provided text. Never use outside knowledge about medieval monasteries, film/TV adaptations, Wikipedia, maps or reconstructions. If the text does not state it, it must not appear.
2. Never invent numbers. Never convert a qualitative description into a fake measurement ("large" stays qualitative; if the text says "iki yüz adım" you may record 200 adım).
3. One fact per claim. Split compound sentences into several atomic claims.
4. "entity" is a canonical English UPPERCASE identifier: ABBEY, CHURCH, CLOISTER, AEDIFICIUM, LIBRARY, SCRIPTORIUM, REFECTORY, KITCHEN, DORMITORY, INFIRMARY, STABLES, CEMETERY, GARDEN, WALL, GATE, TOWER, STAIRCASE, CELL, CRYPT, CELLAR, WORKSHOP, GUEST_HOUSE... Invent a new UPPERCASE identifier when none fits (e.g. SOUTH_TOWER, ABBOT_HOUSE). Put the exact Turkish term used in the text in "entity_original".
5. "sub_entity" names the specific room/space inside a building when the claim is about it (e.g. entity=AEDIFICIUM, sub_entity=SCRIPTORIUM; entity=ABBEY, sub_entity=REFECTORY). Otherwise null.
6. Write "attribute", "value", "notes" in English. Keep "entity_original" and "evidence_fragment" in the original Turkish. evidence_fragment must be a short verbatim fragment (max ~200 characters).
7. certainty must be exactly one of: EXPLICIT (text states it), STRONG_INFERENCE (follows strongly from movement/visibility/physical sequence), WEAK_INFERENCE (plausible but under-constrained), AMBIGUOUS (more than one reading is reasonable).
8. Reference resolution: "o oda", "yukarıdaki salon", "sağdaki kapı", "az önce çıktığımız yer" may be resolved ONLY when surrounding context makes it unambiguous. Otherwise do not guess: list it in "unresolved_references".
9. MOVEMENT: every time a character moves between two identifiable places, emit a separate claim with category "movement" and a movement object {from,to,via,direction,level_change,route_text}. Preserve turns, stairs, doors, level changes and intermediate spaces. Never invent a segment that is not stated.
10. TEMPORAL STATE: if a condition is temporary (night, fire, a door opened/closed, weather), record it in "temporal_state" so it is not mistaken for permanent architecture.
11. Output ONE JSON object, no markdown code fences, no text before or after it.

CATEGORIES (exactly one per claim):
site_landscape, general_layout, building_space, architectural_element, geometry, material_appearance, spatial_relation, movement, visibility, access_security, function_activity, sensory_environment, temporal_change, other

ALLOWED normalized_relation.relation values:
north_of, south_of, east_of, west_of, above, below, inside, outside, adjacent_to, opposite, between, behind, in_front_of, near, far_from, overlooks, faces, opens_into, connected_to, entered_through, reached_via, visible_from, contains, part_of

OUTPUT SCHEMA (every claim must contain all keys; use null when not applicable):
{
  "claims": [
    {
      "claim_local_id": "c1",
      "entity": "LIBRARY",
      "sub_entity": null,
      "entity_original": "kütüphane",
      "category": "spatial_relation",
      "attribute": "relative_position",
      "value": "above SCRIPTORIUM",
      "normalized_relation": {"subject": "LIBRARY", "relation": "above", "object": "SCRIPTORIUM"},
      "geometry": {"shape": null, "measurement": null, "unit": null, "relative_size": null},
      "movement": null,
      "visibility": null,
      "access_rule": null,
      "function": null,
      "sensory_detail": null,
      "temporal_state": null,
      "certainty": "EXPLICIT",
      "paragraph_indices": [123, 124],
      "evidence_fragment": "kütüphane yazı salonunun üstünde yer alıyordu",
      "notes": null
    }
  ],
  "unresolved_references": [
    {"reference": "the room we had left", "context": "short Turkish context", "reason": "no antecedent in this chunk"}
  ]
}
For "movement" claims use e.g.:
"movement": {"from": "CHURCH", "to": "CLOISTER", "via": ["CHURCH_PORCH"], "direction": "right", "level_change": "down", "route_text": "…"}
For "visibility" claims use e.g.:
"visibility": {"observer_location": "CELL", "observed": "CHURCH", "kind": "sees|overlooks|visible_from"}
For "access_security" claims use e.g.:
"access_rule": {"space": "LIBRARY", "rule": "forbidden|restricted|locked|key_required|guarded|allowed", "who": "monks", "when": null}
For "geometry" claims put numbers ONLY if the text states them:
"geometry": {"shape": "square", "measurement": 200, "unit": "adım", "relative_size": "large"}

If the chunk contains nothing relevant, return {"claims": [], "unresolved_references": []}.

CHUNK METADATA
chunk_id: $chunk_id
chapter: $chapter
section: $section
paragraph range: $para_start-$para_end

CHUNK TEXT
$chunk_text
"""

from string import Template


def render(template: str, **kwargs) -> str:
    """Safe substitute: prompts contain JSON braces, so no str.format."""
    return Template(template).substitute(**kwargs)


ENTITY_ALIAS_PROMPT = """You are normalizing entity names extracted from the Turkish novel "Gülün Adı".
Below is an inventory of entity identifiers with the original Turkish terms that produced them and how many claims use each.

Group identifiers that refer to the SAME physical thing. Be conservative:
- Merge only when the identity is certain from the identifiers/originals themselves (spelling variants, Turkish/English pairs, singular/plural, definite/indefinite forms, obvious synonyms used for the same object).
- NEVER merge a building with a part of it, or two different rooms.
- If uncertain, put the pair in "possible_merges" instead of "aliases".

Return JSON only:
{
  "aliases": [
    {"canonical_entity": "AEDIFICIUM", "aliases": ["EDIFICE", "GREAT_BUILDING"], "confidence": "high",
     "reason": "..."}
  ],
  "possible_merges": [
    {"entities": ["A", "B"], "confidence": "low", "reason": "..."}
  ]
}
Prefer the most specific / most frequently used identifier as canonical.

INVENTORY (entity | original term | claim count):
$inventory
"""


CONTRADICTION_PROMPT = """You are auditing candidate contradictions extracted from the novel "Gülün Adı".
For each candidate pair below, decide whether the two statements really contradict each other
(given they may describe different moments, different rooms, or different viewpoints), or whether
they are compatible / duplicates / unresolved.

Return JSON only:
{
  "verdicts": [
    {"id": "cand_1", "verdict": "contradiction|compatible|uncertain",
     "explanation": "one or two sentences", "topic": "short label"}
  ]
}
Do not invent text. Judge only from the given fragments.

CANDIDATES:
$candidates
"""


HIERARCHY_PROMPT = """You are organizing the spaces of the abbey from the novel "Gülün Adı" into a containment/adjacency hierarchy.
You are given (a) discovered entities with claim counts and (b) the strongest spatial relations between them.
Build the best-supported hierarchy. Only use the relations given; never add outside knowledge about monasteries.
Mark an edge "certainty" as EXPLICIT / STRONG_INFERENCE / WEAK_INFERENCE / AMBIGUOUS following the evidence given.
If the root (ABBEY) is not supported, use the best-supported top-level entity.

Return JSON only:
{
  "root": "ABBEY",
  "nodes": {
    "ABBEY": {"children": ["CHURCH", "CLOISTER", "AEDIFICIUM"], "certainty": "EXPLICIT", "note": null},
    "AEDIFICIUM": {"children": ["SCRIPTORIUM", "LIBRARY", "KITCHEN"], "certainty": "EXPLICIT", "note": null}
  }
}
Every entity listed in the input must appear exactly once as a node key (children lists reference node keys).
Put entities whose parent is unknown as children of "UNKNOWN" with a note.

ENTITIES:
$entities

RELATIONS:
$relations
"""
