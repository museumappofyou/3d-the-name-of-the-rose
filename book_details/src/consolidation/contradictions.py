"""Contradiction detection and (optionally) LLM adjudication."""

from __future__ import annotations

import json
import re

from ..config import Paths
from ..extraction.prompts import CONTRADICTION_PROMPT, render
from ..extraction.schema import parse_json_object
from ..llm import LLMClient, LLMError
from ..util import atomic_write_json, log, norm_key

DIRECTIONAL = {"north_of", "south_of", "east_of", "west_of", "above", "below",
               "inside", "outside", "behind", "in_front_of", "near", "far_from",
               "opposite"}


def _short(claim: dict) -> str:
    relation = claim.get("normalized_relation")
    if relation:
        return f"{relation['subject']} {relation['relation']} {relation['object']}"
    return (f"{claim.get('canonical_entity') or claim['entity']}: "
            f"{claim.get('attribute')} = {claim.get('value')}")


def _source_brief(claim: dict) -> dict:
    src = claim["source"]
    return {
        "claim_id": claim["claim_id"],
        "chunk_id": src.get("chunk_id"),
        "chapter": src.get("chapter"),
        "paragraph": src.get("paragraph_start"),
        "evidence": claim.get("evidence_fragment"),
    }


# relations that (for a fixed subject) point at a single place
SINGLE_VALUED = {"north_of", "south_of", "east_of", "west_of", "above", "below",
                 "inside", "outside", "entered_through", "behind", "in_front_of"}
INVERSES = {("above", "below"), ("below", "above"), ("north_of", "south_of"),
            ("south_of", "north_of"), ("east_of", "west_of"), ("west_of", "east_of"),
            ("inside", "outside"), ("outside", "inside"), ("behind", "in_front_of"),
            ("in_front_of", "behind")}
# attributes where different values really are incompatible
SCALAR_ATTRIBUTES = {"shape", "material", "color", "orientation", "position",
                     "relative_position", "number_of_floors", "floor_count",
                     "number_of_sides", "number_of_towers", "height", "width",
                     "length", "depth", "diameter", "size", "area", "thickness"}


def find_candidates(claims: list[dict], *, max_candidates: int = 150) -> list[dict]:
    candidates = []
    seen = set()

    # 1. the same subject mapped through a single-valued relation to two places
    by_subject_rel: dict[tuple, dict[str, dict]] = {}
    for c in claims:
        rel = c.get("normalized_relation")
        if not rel or rel["relation"] not in SINGLE_VALUED:
            continue
        bucket = by_subject_rel.setdefault(
            (rel["subject"], rel["relation"]), {}
        )
        prev = bucket.get(rel["object"])
        if prev is not None:
            continue
        bucket[rel["object"]] = c
    for (subject, relation), bucket in by_subject_rel.items():
        if len(bucket) < 2:
            continue
        items = list(bucket.values())
        for i in range(len(items)):
            for j in range(i + 1, len(items)):
                candidates.append(_candidate("relation_target_conflict", items[i], items[j]))

    # 2. the same subject+object related by inverse relations
    by_pair: dict[tuple, list[dict]] = {}
    for c in claims:
        rel = c.get("normalized_relation")
        if not rel or rel["relation"] not in SINGLE_VALUED:
            continue
        by_pair.setdefault((rel["subject"], rel["object"]), []).append(c)
    for (subject, obj), group in by_pair.items():
        relations = {c["normalized_relation"]["relation"]: c for c in group}
        for rel_a, rel_b in INVERSES:
            if rel_a in relations and rel_b in relations:
                candidates.append(
                    _candidate("inverse_relation_conflict", relations[rel_a],
                               relations[rel_b])
                )

    # 3. scalar attribute conflicts + numeric (measurement) conflicts
    by_attr: dict[tuple, list[dict]] = {}
    for c in claims:
        if not c.get("attribute") or c.get("normalized_relation"):
            continue
        if c["category"] in ("movement", "spatial_relation", "visibility",
                             "access_security"):
            continue
        ent = c.get("canonical_entity") or c["entity"]
        by_attr.setdefault((ent, c["category"], c["attribute"]), []).append(c)
    for (ent, cat, attr), group in by_attr.items():
        if attr not in SCALAR_ATTRIBUTES:
            continue
        for i in range(len(group)):
            for j in range(i + 1, len(group)):
                a, b = group[i], group[j]
                if _numeric_conflict(a, b):
                    candidates.append(_candidate("measurement_conflict", a, b))
                    continue
                va = norm_key(a.get("value") or "")
                vb = norm_key(b.get("value") or "")
                if not va or not vb or va == vb:
                    continue
                if va in vb or vb in va:
                    continue
                candidates.append(_candidate("attribute_conflict", a, b))

    # dedupe candidates
    unique = []
    for cand in candidates:
        aid = cand["a"]["source"].get("claim_id")
        bid = cand["b"]["source"].get("claim_id")
        key = (aid, bid, cand["type"])
        rkey = (bid, aid, cand["type"])
        if key in seen or rkey in seen:
            continue
        seen.add(key)
        unique.append(cand)

    unique.sort(key=lambda c: (c["type"], str(c["a"]["source"].get("claim_id"))))
    return unique[:max_candidates]


def _numeric_conflict(a: dict, b: dict) -> bool:
    ga, gb = a.get("geometry") or {}, b.get("geometry") or {}
    ma, mb = ga.get("measurement"), gb.get("measurement")
    if ma is None or mb is None:
        return False
    ua = (ga.get("unit") or "").lower()
    ub = (gb.get("unit") or "").lower()
    if _norm_unit(ua) != _norm_unit(ub):
        return False
    if ma == 0 or mb == 0:
        return False
    return abs(ma - mb) / max(abs(ma), abs(mb)) > 0.2


def _norm_unit(unit: str) -> str:
    unit = unit.replace("ı", "i")
    mapping = {"metre": "m", "meter": "m", "m": "m", "adım": "step", "adim": "step",
               "step": "step", "karış": "span", "kulaç": "fathom", "parmak": "finger",
               "santimetre": "cm", "cm": "cm"}
    return mapping.get(unit.strip(), unit.strip())


def _candidate(kind: str, a: dict, b: dict) -> dict:
    return {
        "id": None,
        "type": kind,
        "a": {"statement": _short(a), "source": _source_brief(a)},
        "b": {"statement": _short(b), "source": _source_brief(b)},
        "verdict": "unverified",
        "explanation": None,
        "topic": None,
    }


def adjudicate(paths: Paths, candidates: list[dict], client: LLMClient | None,
               model: str, *, batch_size: int = 12) -> list[dict]:
    if not candidates:
        return []
    if client is not None and batch_size:
        for start in range(0, len(candidates), batch_size):
            batch = candidates[start : start + batch_size]
            lines = []
            for i, cand in enumerate(batch):
                cand["id"] = f"cand_{start + i + 1}"
                lines.append(
                    json.dumps(
                        {
                            "id": cand["id"],
                            "type": cand["type"],
                            "a": cand["a"],
                            "b": cand["b"],
                        },
                        ensure_ascii=False,
                    )
                )
            try:
                result = client.complete(
                    render(CONTRADICTION_PROMPT, candidates="\n".join(lines)),
                    model=model,
                    label="consolidate:contradictions",
                    temperature=0.0,
                )
            except LLMError as exc:
                log(f"[contradictions] LLM unavailable: {exc}")
                break
            payload = parse_json_object(result.text)
            if not payload:
                continue
            verdicts = {v.get("id"): v for v in payload.get("verdicts") or []
                        if isinstance(v, dict)}
            for cand in batch:
                verdict = verdicts.get(cand["id"])
                if verdict:
                    cand["verdict"] = verdict.get("verdict", "uncertain")
                    cand["explanation"] = verdict.get("explanation")
                    cand["topic"] = verdict.get("topic")
    for i, cand in enumerate(candidates):
        cand["id"] = f"cand_{i + 1}"
    atomic_write_json(
        paths.analysis / "contradictions.json",
        {
            "note": "Candidate conflicts. verdict=contradiction means the model judged "
                    "the statements incompatible given the evidence; unverified means no "
                    "adjudication was possible.",
            "count": len(candidates),
            "candidates": candidates,
        },
    )
    real = [c for c in candidates if c["verdict"] == "contradiction"]
    log(f"[contradictions] {len(candidates)} candidates, {len(real)} judged contradictions")
    return candidates
