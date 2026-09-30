"""Consolidation orchestration: claims -> facts, graphs, hierarchy, constraints."""

from __future__ import annotations

from ..config import Paths, Settings
from ..llm import LLMClient
from ..util import atomic_write_json, log, read_json, read_jsonl, write_jsonl
from .constraints import build_constraints
from .contradictions import adjudicate, find_candidates
from .dedupe import dedupe_claims
from .entities import normalize_entities
from .graphs import build_graphs
from .hierarchy import build_hierarchy
from .load import load_claims


def _collect_unresolved(paths: Paths) -> dict:
    refs = []
    seen = set()
    for cache_dir, pass_name in ((paths.cache_extraction, "primary"),
                                 (paths.cache_verify, "verification")):
        for f in sorted(cache_dir.glob("chunk_*.json")):
            if f.name.endswith(".FAILED.json"):
                continue
            data = read_json(f)
            if not data:
                continue
            for ref in data.get("unresolved_references", []):
                key = (ref.get("reference"), ref.get("context"))
                if key in seen:
                    continue
                seen.add(key)
                refs.append(
                    {
                        "reference": ref.get("reference"),
                        "context": ref.get("context"),
                        "reason": ref.get("reason"),
                        "chunk_id": data.get("chunk_id"),
                        "pass": pass_name,
                    }
                )
    payload = {"count": len(refs), "references": refs}
    atomic_write_json(paths.unresolved_references, payload)
    return payload


def run_consolidation(paths: Paths, settings: Settings, client: LLMClient | None,
                      *, use_llm: bool = True, include_verify: bool = True) -> dict:
    claims, load_stats = load_claims(paths, include_verify=include_verify)
    if not claims:
        raise SystemExit("no claims found - run `extract` first")

    claims, aliases = normalize_entities(
        paths, claims, client, model=settings.consolidation_model, use_llm=use_llm
    )
    write_jsonl(paths.claims_jsonl, claims)

    facts = dedupe_claims(paths, claims)

    candidates = find_candidates(claims)
    candidates = adjudicate(
        paths, candidates, client if use_llm else None,
        model=settings.consolidation_model,
    )

    graphs = build_graphs(paths, claims)
    hierarchy = build_hierarchy(
        paths, claims, client if use_llm else None,
        model=settings.consolidation_model, use_llm=use_llm,
    )
    constraints = build_constraints(paths, claims)
    unresolved = _collect_unresolved(paths)

    entities = {}
    for c in claims:
        ent = c.get("canonical_entity") or c["entity"]
        entities.setdefault(ent, 0)
        entities[ent] += 1

    summary = {
        "generated_at": None,
        "load": load_stats,
        "claims": len(claims),
        "facts": len(facts),
        "entities": len(entities),
        "alias_mappings": len(aliases.get("alias_map", {})),
        "possible_merges": len(aliases.get("possible_merges", [])),
        "spatial_relations": graphs["spatial_edges"],
        "movement_relations": graphs["movement_edges"],
        "visibility_relations": graphs["visibility_edges"],
        "access_relations": graphs["access_edges"],
        "contradiction_candidates": len(candidates),
        "contradictions": sum(1 for c in candidates if c["verdict"] == "contradiction"),
        "unresolved_references": unresolved["count"],
        "constraints": {
            "total": len(constraints),
            "HARD": sum(1 for c in constraints if c["class"] == "HARD"),
            "MEDIUM": sum(1 for c in constraints if c["class"] == "MEDIUM"),
            "SOFT": sum(1 for c in constraints if c["class"] == "SOFT"),
        },
        "hierarchy_root": hierarchy.get("root"),
        "hierarchy_nodes": len(hierarchy.get("nodes", {})),
        "entity_counts": dict(sorted(entities.items(), key=lambda kv: -kv[1])),
    }
    atomic_write_json(paths.cache_consolidation / "summary.json", summary)
    atomic_write_json(paths.output / "consolidation_summary.json", summary)
    log(f"[consolidate] {len(claims)} claims -> {len(facts)} facts, "
        f"{len(entities)} entities, {summary['contradictions']} contradictions")
    return summary
