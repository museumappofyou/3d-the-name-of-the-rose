"""Deduplication of claims into consolidated facts, preserving all sources."""

from __future__ import annotations

from ..config import Paths
from ..util import atomic_write_json, log, norm_key
from .load import merge_unique_sources, strongest_certainty


def _fact_key(claim: dict) -> tuple:
    """Identity of a fact.

    Relation/movement/visibility/access claims are identified by their
    normalized triple (wording of `value` may differ between chunks); other
    claims fall back to entity+attribute+value.
    """
    ent = claim.get("canonical_entity") or claim["entity"]
    sub = claim.get("canonical_sub_entity") or ""
    relation = claim.get("normalized_relation") or {}
    movement = claim.get("movement") or {}
    visibility = claim.get("visibility") or {}
    access = claim.get("access_rule") or {}
    # Relations/movements/visibility/access are identified by the normalized
    # triple itself: the same statement extracted twice under different entity
    # attributions is one fact, not two (independent sources must accumulate).
    if relation:
        return ("relation", relation.get("subject"), relation.get("relation"),
                relation.get("object"))
    if movement:
        return ("movement", movement.get("from"), movement.get("to"),
                tuple(movement.get("via") or []), movement.get("level_change"))
    if visibility:
        return ("visibility", visibility.get("observer_location"),
                visibility.get("observed"))
    if access:
        return ("access", access.get("space") or ent, access.get("rule"),
                access.get("who"))
    geometry = claim.get("geometry") or {}
    return (
        "attribute",
        ent,
        sub,
        claim.get("category"),
        claim.get("attribute"),
        norm_key(claim.get("value") or ""),
        geometry.get("measurement"),
        norm_key(geometry.get("shape") or ""),
    )


def _render_fact(claim: dict, sources: list[dict]) -> str:
    ent = claim.get("canonical_entity") or claim["entity"]
    sub = claim.get("canonical_sub_entity")
    label = f"{ent}/{sub}" if sub else ent
    relation = claim.get("normalized_relation")
    movement = claim.get("movement")
    visibility = claim.get("visibility")
    access = claim.get("access_rule")
    if claim["category"] == "movement" and movement:
        parts = []
        if movement.get("from"):
            parts.append(f"from {movement['from']}")
        if movement.get("to"):
            parts.append(f"to {movement['to']}")
        if movement.get("via"):
            parts.append(f"via {'+'.join(movement['via'])}")
        if movement.get("direction"):
            parts.append(f"direction {movement['direction']}")
        if movement.get("level_change"):
            parts.append(f"level {movement['level_change']}")
        return f"{label}: movement {' '.join(parts)}"
    if claim["category"] == "visibility" and visibility:
        return (f"{visibility.get('observer_location')} can see "
                f"{visibility.get('observed')}")
    if claim["category"] == "access_security" and access:
        return f"{access.get('space') or label}: access {access.get('rule')}" + (
            f" (who: {access.get('who')})" if access.get("who") else ""
        )
    if relation:
        return f"{relation['subject']} {relation['relation']} {relation['object']}"
    value = claim.get("value") or claim.get("attribute") or ""
    attr = claim.get("attribute") or claim.get("category")
    return f"{label}: {attr} = {value}".strip()


def dedupe_claims(paths: Paths, claims: list[dict]) -> list[dict]:
    groups: dict[tuple, dict] = {}
    for claim in claims:
        key = _fact_key(claim)
        source = dict(claim["source"])
        source["claim_id"] = claim["claim_id"]
        source["certainty"] = claim["certainty"]
        source["evidence"] = claim.get("evidence_fragment")
        source["pass"] = claim.get("pass")
        group = groups.get(key)
        if group is None:
            groups[key] = {
                "fact": _render_fact(claim, [source]),
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
                "certainties": [claim["certainty"]],
                "sources": [source],
            }
        else:
            merge_unique_sources(group["sources"], [source])
            group["certainties"].append(claim["certainty"])

    facts = []
    for n, (key, group) in enumerate(sorted(
        groups.items(), key=lambda kv: (-len(kv[1]["sources"]), kv[1]["entity"])
    ), start=1):
        facts.append(
            {
                "fact_id": f"fact_{n:06d}",
                "fact": group["fact"],
                "category": group["category"],
                "entity": group["entity"],
                "sub_entity": group["sub_entity"],
                "attribute": group["attribute"],
                "value": group["value"],
                "normalized_relation": group["normalized_relation"],
                "movement": group["movement"],
                "visibility": group["visibility"],
                "access_rule": group["access_rule"],
                "geometry": group["geometry"],
                "certainty": strongest_certainty(group["certainties"]),
                "support": len(group["sources"]),
                "sources": group["sources"][:12],
            }
        )
    atomic_write_json(paths.facts_json, facts)
    log(f"[dedupe] {len(claims)} claims -> {len(facts)} unique facts")
    return facts
