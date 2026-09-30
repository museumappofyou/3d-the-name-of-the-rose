"""Reconstruction constraints classified HARD / MEDIUM / SOFT."""

from __future__ import annotations

from ..config import Paths
from ..util import atomic_write_json, log

HARD_RELATIONS = {"contains", "part_of", "above", "below", "inside", "outside",
                  "adjacent_to", "entered_through", "opens_into", "north_of",
                  "south_of", "east_of", "west_of", "between", "connected_to"}
MEDIUM_RELATIONS = {"near", "far_from", "overlooks", "visible_from", "faces",
                    "reached_via", "behind", "in_front_of", "opposite"}


def _classify(claim: dict) -> str:
    certainty = claim["certainty"]
    if certainty in ("WEAK_INFERENCE", "AMBIGUOUS"):
        return "SOFT"
    if claim.get("geometry") and claim["geometry"].get("measurement") is not None:
        return "HARD" if certainty == "EXPLICIT" else "MEDIUM"
    rel = claim.get("normalized_relation")
    if rel:
        if rel["relation"] in HARD_RELATIONS:
            return "HARD" if certainty == "EXPLICIT" else "MEDIUM"
        return "MEDIUM" if certainty == "EXPLICIT" else "SOFT"
    if claim["category"] in ("movement", "visibility", "access_security"):
        return "MEDIUM" if certainty in ("EXPLICIT", "STRONG_INFERENCE") else "SOFT"
    if claim["category"] in ("building_space", "architectural_element", "geometry",
                              "material_appearance"):
        return "HARD" if certainty == "EXPLICIT" else (
            "MEDIUM" if certainty == "STRONG_INFERENCE" else "SOFT")
    return "SOFT"


def _constraint_type(claim: dict) -> str:
    rel = claim.get("normalized_relation")
    if rel:
        r = rel["relation"]
        if r in ("north_of", "south_of", "east_of", "west_of"):
            return "orientation"
        if r in ("above", "below"):
            return "vertical_stacking"
        if r in ("adjacent_to", "near", "next_to", "opposite", "between"):
            return "adjacency"
        if r in ("contains", "part_of", "inside", "outside"):
            return "containment"
        if r in ("opens_into", "connected_to", "entered_through", "reached_via"):
            return "circulation"
        if r in ("overlooks", "visible_from", "faces"):
            return "line_of_sight"
        return "topology"
    if claim.get("geometry") and claim["geometry"].get("measurement") is not None:
        return "measurement"
    if claim.get("movement"):
        return "route_ordering"
    if claim.get("visibility"):
        return "line_of_sight"
    if claim.get("access_rule"):
        return "access"
    if claim["category"] == "architectural_element":
        return "opening_or_element"
    if claim["category"] == "geometry":
        return "measurement"
    return "attribute"


def build_constraints(paths: Paths, claims: list[dict]) -> list[dict]:
    constraints = []
    for claim in claims:
        if not (claim.get("normalized_relation") or claim.get("movement")
                or claim.get("visibility") or claim.get("access_rule")
                or claim.get("geometry")
                or claim["category"] in ("building_space", "architectural_element",
                                          "geometry", "material_appearance")):
            continue
        constraints.append(
            {
                "constraint_id": None,
                "class": _classify(claim),
                "type": _constraint_type(claim),
                "category": claim["category"],
                "entity": claim.get("canonical_entity") or claim["entity"],
                "sub_entity": claim.get("canonical_sub_entity"),
                "attribute": claim.get("attribute"),
                "value": claim.get("value"),
                "normalized_relation": claim.get("normalized_relation"),
                "movement": claim.get("movement"),
                "visibility": claim.get("visibility"),
                "access_rule": claim.get("access_rule"),
                "geometry": claim.get("geometry"),
                "certainty": claim["certainty"],
                "claim_id": claim["claim_id"],
                "chunk_id": claim["source"].get("chunk_id"),
                "chapter": claim["source"].get("chapter"),
                "evidence": claim.get("evidence_fragment"),
            }
        )
    constraints.sort(key=lambda c: ({"HARD": 0, "MEDIUM": 1, "SOFT": 2}[c["class"]],
                                    c["type"], c["entity"]))
    for i, c in enumerate(constraints, start=1):
        c["constraint_id"] = f"con_{i:06d}"
    counts = {k: sum(1 for c in constraints if c["class"] == k)
              for k in ("HARD", "MEDIUM", "SOFT")}
    atomic_write_json(
        paths.output / "reconstruction_constraints.json",
        {
            "note": "Constraints usable for spatial reconstruction. "
                    "Artificial coordinates are never invented.",
            "counts": counts,
            "total": len(constraints),
            "constraints": constraints,
        },
    )
    log(f"[constraints] HARD={counts['HARD']} MEDIUM={counts['MEDIUM']} SOFT={counts['SOFT']}")
    return constraints
