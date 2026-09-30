"""Containment hierarchy of abbey spaces."""

from __future__ import annotations

import json

from ..config import Paths
from ..extraction.prompts import HIERARCHY_PROMPT, render
from ..extraction.schema import parse_json_object
from ..llm import LLMClient, LLMError
from ..util import atomic_write_json, log
from .load import strongest_certainty

PARENT_OF = {"contains": ("subject", "object"), "part_of": ("object", "subject"),
             "inside": ("object", "subject")}

# characters (and other non-spatial actors) that appear as relation subjects but
# are not spaces of the abbey
NON_SPATIAL_ENTITIES = {
    "WILLIAM", "ADSO", "UBERTINO", "JORGE", "BENNO", "SEVERINUS", "MALACHI",
    "BERENGAR", "VENANTIUS", "ALINARDO", "SALVATORE", "NICOLA", "AYMARO",
    "PACIFICO", "REMIGIO", "ABBOT", "ABBOT_AND_WILLIAM", "UBERTINO_AND_ADSO",
    "ROGER_BACON", "CHARACTERS", "MONKS", "PILGRIMS", "PEOPLE", "SUN_AT_SUNRISE",
    "SUNLIGHT", "AIR_CURRENT", "SMELL", "SMOKE", "FIRE", "CELLARER", "ARCHERS",
    "BODY", "KILLER", "VISITOR", "STRANGER", "GROUP", "CROWD", "WITNESS",
}
SPATIAL_CATEGORIES = ("building_space", "architectural_element", "general_layout",
                      "site_landscape", "geometry", "material_appearance",
                      "spatial_relation", "function_activity")


def _programmatic_edges(claims: list[dict]) -> list[dict]:
    edges = []
    for claim in claims:
        rel = claim.get("normalized_relation")
        if not rel:
            continue
        mapping = PARENT_OF.get(rel["relation"])
        if not mapping:
            continue
        parent_role, child_role = mapping
        parent = rel[parent_role]
        child = rel[child_role]
        if parent == child:
            continue
        edges.append(
            {
                "parent": parent,
                "child": child,
                "relation": rel["relation"],
                "certainty": claim["certainty"],
                "claim_ids": [claim["claim_id"]],
                "evidence": claim.get("evidence_fragment"),
            }
        )
    return edges


def _merge_edge(edges: dict, parent: str, child: str, claim_ids, certainty, evidence):
    key = (parent, child)
    cur = edges.get(key)
    if cur is None:
        edges[key] = {
            "parent": parent,
            "child": child,
            "certainty": certainty,
            "claim_ids": list(claim_ids),
            "evidence": [evidence] if evidence else [],
        }
        return
    for cid in claim_ids:
        if cid not in cur["claim_ids"]:
            cur["claim_ids"].append(cid)
    cur["certainty"] = strongest_certainty([cur["certainty"], certainty])
    if evidence and len(cur["evidence"]) < 3:
        cur["evidence"].append(evidence)


def _spatial_entities(claims: list[dict]) -> tuple[set[str], dict[str, list[str]]]:
    """Entities that behave like spaces/objects, plus exclusion reasons."""
    counts: dict[str, dict[str, int]] = {}
    for c in claims:
        ent = c.get("canonical_entity") or c["entity"]
        counts.setdefault(ent, {})
        counts[ent][c["category"]] = counts[ent].get(c["category"], 0) + 1
        if c.get("canonical_sub_entity"):
            sub = c["canonical_sub_entity"]
            counts.setdefault(sub, {})
            counts[sub][c["category"]] = counts[sub].get(c["category"], 0) + 1

    spatial, excluded = set(), {}
    for ent, cats in counts.items():
        if ent in NON_SPATIAL_ENTITIES:
            excluded[ent] = ["known non-spatial actor/object"]
            continue
        spatial_hits = sum(cats.get(c, 0) for c in SPATIAL_CATEGORIES)
        if spatial_hits == 0:
            excluded[ent] = ["no spatial/architectural evidence"]
            continue
        spatial.add(ent)
    return spatial, excluded


def build_hierarchy(paths: Paths, claims: list[dict], client: LLMClient | None,
                    model: str, *, use_llm: bool = True) -> dict:
    spatial_entities, excluded_entities = _spatial_entities(claims)
    edges: dict = {}
    for e in _programmatic_edges(claims):
        if (e["parent"] not in spatial_entities
                or e["child"] not in spatial_entities):
            continue
        _merge_edge(edges, e["parent"], e["child"], e["claim_ids"], e["certainty"],
                    e["evidence"])

    # relations useful as soft hierarchy context
    entities: dict[str, int] = {}
    for c in claims:
        ent = c.get("canonical_entity") or c["entity"]
        if ent in excluded_entities:
            continue
        entities[ent] = entities.get(ent, 0) + 1

    relation_lines = []
    for e in sorted(edges.values(), key=lambda x: (-len(x["claim_ids"]), x["parent"])):
        relation_lines.append(
            f"{e['parent']} CONTAINS {e['child']} "
            f"({len(e['claim_ids'])} claims, {e['certainty']})"
        )
    for c in claims:
        rel = c.get("normalized_relation")
        if rel and rel["relation"] in ("above", "below", "adjacent_to", "entered_through",
                                        "opens_into", "connected_to", "overlooks"):
            relation_lines.append(
                f"{rel['subject']} {rel['relation'].upper()} {rel['object']} "
                f"({c['certainty']})"
            )
    relation_lines = relation_lines[:250]

    llm_nodes = None
    if use_llm and client is not None and entities:
        top_entities = sorted(entities.items(), key=lambda kv: -kv[1])[:120]
        entity_text = "\n".join(f"{ent} ({count} claims)" for ent, count in top_entities)
        try:
            result = client.complete(
                render(HIERARCHY_PROMPT, entities=entity_text,
                       relations="\n".join(relation_lines)),
                model=model,
                label="consolidate:hierarchy",
                temperature=0.0,
            )
            payload = parse_json_object(result.text)
            if isinstance(payload, dict) and isinstance(payload.get("nodes"), dict):
                llm_nodes = payload
            else:
                log("[hierarchy] LLM response unusable; keeping programmatic tree")
        except LLMError as exc:
            log(f"[hierarchy] LLM unavailable: {exc}")

    # choose a single best parent per child: strongest support first, then a
    # mild preference for whole-building parents over generic elements
    parent_priority = {"AEDIFICIUM": 0, "ABBEY": 1, "CHURCH": 1, "DORMITORY": 1}

    def edge_rank(e):
        return (-len(e["claim_ids"]),
                parent_priority.get(e["parent"], 5),
                e["parent"])

    chosen: dict[str, dict] = {}
    for e in sorted(edges.values(), key=edge_rank):
        child = e["child"]
        if child in chosen:
            continue
        # reject cycle: walk up from parent, must not reach child
        cur, seen = e["parent"], set()
        ok = True
        while cur and cur not in seen:
            if cur == child:
                ok = False
                break
            seen.add(cur)
            nxt = chosen.get(cur)
            cur = nxt["parent"] if nxt else None
        if not ok:
            continue
        chosen[child] = e

    merged_nodes: dict = {}
    for e in chosen.values():
        parent = merged_nodes.setdefault(e["parent"], {"children": [], "certainty": "AMBIGUOUS"})
        if e["child"] not in parent["children"]:
            parent["children"].append(e["child"])
        merged_nodes.setdefault(e["child"], {"children": [], "certainty": "AMBIGUOUS"})
        parent["certainty"] = strongest_certainty(
            [parent["certainty"], e["certainty"]]
        )

    if llm_nodes:
        for node, info in llm_nodes["nodes"].items():
            node = str(node)
            if not isinstance(info, dict):
                continue
            entry = merged_nodes.setdefault(node, {"children": [], "certainty": "WEAK_INFERENCE"})
            entry["llm_certainty"] = info.get("certainty")
            entry["note"] = info.get("note")
            if not entry["children"]:
                entry["children"] = [str(c) for c in info.get("children") or []]
                entry["source"] = "llm"

    children = {c for node in merged_nodes.values() for c in node["children"]}
    roots = [n for n in merged_nodes if n not in children]
    # prefer ABBEY as root
    root = "ABBEY" if "ABBEY" in merged_nodes else (roots[0] if roots else None)

    hierarchy = {
        "root": root,
        "method": "programmatic containment relations merged with an LLM layout pass",
        "nodes": merged_nodes,
        "orphan_roots": [r for r in roots if r != root],
        "excluded_non_spatial": excluded_entities,
        "unsupported": [],
        "entity_counts": entities,
    }
    atomic_write_json(paths.output / "abbey_hierarchy.json", hierarchy)
    log(f"[hierarchy] root={root} nodes={len(merged_nodes)} "
        f"programmatic_edges={len(edges)} llm={'yes' if llm_nodes else 'no'}")
    return hierarchy
