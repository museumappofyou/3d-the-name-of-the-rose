"""Machine-readable graphs: spatial, movement, visibility, access."""

from __future__ import annotations

from ..config import Paths
from ..util import atomic_write_json, log
from .load import strongest_certainty


def _edge_key(*parts):
    return tuple(str(p or "").upper() for p in parts)


def _merge_edges(edges: dict, key, edge: dict, claim: dict) -> None:
    cur = edges.get(key)
    if cur is None:
        edges[key] = edge
        return
    if claim["claim_id"] not in cur["claim_ids"]:
        cur["claim_ids"].append(claim["claim_id"])
    cur["certainty"] = strongest_certainty([cur["certainty"], claim["certainty"]])
    if len(cur.get("evidence", [])) < 5 and claim.get("evidence_fragment"):
        cur["evidence"].append(claim["evidence_fragment"])
    cur["support"] = len(cur["claim_ids"])


def build_graphs(paths: Paths, claims: list[dict]) -> dict:
    spatial: dict = {}
    movement: dict = {}
    visibility: dict = {}
    access: dict = {}

    for claim in claims:
        rel = claim.get("normalized_relation")
        if rel:
            key = _edge_key(rel["subject"], rel["relation"], rel["object"])
            _merge_edges(
                spatial,
                key,
                {
                    "subject": rel["subject"],
                    "relation": rel["relation"],
                    "object": rel["object"],
                    "certainty": claim["certainty"],
                    "claim_ids": [claim["claim_id"]],
                    "evidence": [claim["evidence_fragment"]] if claim.get("evidence_fragment") else [],
                    "support": 1,
                },
                claim,
            )
        mv = claim.get("movement")
        if mv and (mv.get("from") or mv.get("to")):
            key = _edge_key(mv.get("from"), mv.get("to"),
                            "+".join(mv.get("via") or []))
            _merge_edges(
                movement,
                key,
                {
                    "from": mv.get("from"),
                    "to": mv.get("to"),
                    "via": mv.get("via") or [],
                    "direction": mv.get("direction"),
                    "level_change": mv.get("level_change"),
                    "route_text": mv.get("route_text"),
                    "certainty": claim["certainty"],
                    "claim_ids": [claim["claim_id"]],
                    "evidence": [claim["evidence_fragment"]] if claim.get("evidence_fragment") else [],
                    "support": 1,
                },
                claim,
            )
        vis = claim.get("visibility")
        if vis and (vis.get("observer_location") or vis.get("observed")):
            key = _edge_key(vis.get("observer_location"), vis.get("observed"))
            _merge_edges(
                visibility,
                key,
                {
                    "observer_location": vis.get("observer_location"),
                    "observed": vis.get("observed"),
                    "kind": vis.get("kind") or "visible_from",
                    "certainty": claim["certainty"],
                    "claim_ids": [claim["claim_id"]],
                    "evidence": [claim["evidence_fragment"]] if claim.get("evidence_fragment") else [],
                    "support": 1,
                },
                claim,
            )
        acc = claim.get("access_rule")
        if acc and acc.get("space"):
            key = _edge_key(acc.get("space"), acc.get("rule"))
            _merge_edges(
                access,
                key,
                {
                    "space": acc.get("space"),
                    "rule": acc.get("rule"),
                    "who": acc.get("who"),
                    "when": acc.get("when"),
                    "certainty": claim["certainty"],
                    "claim_ids": [claim["claim_id"]],
                    "evidence": [claim["evidence_fragment"]] if claim.get("evidence_fragment") else [],
                    "support": 1,
                },
                claim,
            )

    # movement sequences per chunk (ordered by paragraph)
    sequences = []
    by_chunk: dict[str, list[dict]] = {}
    for claim in claims:
        if claim.get("movement") and (claim["movement"].get("from") or claim["movement"].get("to")):
            by_chunk.setdefault(claim["source"]["chunk_id"], []).append(claim)
    for cid, group in sorted(by_chunk.items()):
        group.sort(key=lambda c: min(c.get("paragraph_indices") or [10**9]))
        seq_claims = [c for c in group]
        if len(seq_claims) >= 2:
            sequences.append(
                {
                    "chunk_id": cid,
                    "chapter": seq_claims[0]["source"].get("chapter"),
                    "route": [c["movement"].get("from") for c in seq_claims]
                    + [seq_claims[-1]["movement"].get("to")],
                    "claim_ids": [c["claim_id"] for c in seq_claims],
                }
            )

    spatial_list = sorted(spatial.values(), key=lambda e: (-e["support"], e["subject"]))
    movement_list = sorted(movement.values(), key=lambda e: (-e["support"], str(e["from"])))
    visibility_list = sorted(visibility.values(), key=lambda e: (-e["support"], str(e["observer_location"])))
    access_list = sorted(access.values(), key=lambda e: (-e["support"], str(e["space"])))

    atomic_write_json(paths.output / "spatial_graph.json",
                      {"node_count": len({e["subject"] for e in spatial_list} |
                                         {e["object"] for e in spatial_list}),
                       "edge_count": len(spatial_list), "edges": spatial_list})
    atomic_write_json(paths.output / "movement_graph.json",
                      {"edge_count": len(movement_list),
                       "edges": movement_list, "sequences": sequences})
    atomic_write_json(paths.output / "visibility_graph.json",
                      {"edge_count": len(visibility_list), "edges": visibility_list})
    atomic_write_json(paths.output / "access_graph.json",
                      {"edge_count": len(access_list), "edges": access_list})
    log(f"[graphs] spatial={len(spatial_list)} movement={len(movement_list)} "
        f"visibility={len(visibility_list)} access={len(access_list)}")
    return {
        "spatial_edges": len(spatial_list),
        "movement_edges": len(movement_list),
        "visibility_edges": len(visibility_list),
        "access_edges": len(access_list),
    }
