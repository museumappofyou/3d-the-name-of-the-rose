"""Load raw claims from caches, assign stable IDs, build the canonical dataset."""

from __future__ import annotations

import time
from collections import Counter

from ..config import MAX_EVIDENCE_CHARS, Paths
from ..util import log, read_json, read_jsonl, write_jsonl

CERTAINTY_ORDER = {"EXPLICIT": 3, "STRONG_INFERENCE": 2, "WEAK_INFERENCE": 1,
                   "AMBIGUOUS": 0}


def load_claims(paths: Paths, *, include_verify: bool = True) -> tuple[list[dict], dict]:
    """Return (claims, stats). Claim IDs are deterministic: claim_%06d by chunk order."""
    manifest = read_jsonl(paths.chunk_manifest)
    meta = read_json(paths.book_meta) or {}
    source_file = meta.get("used_source") or meta.get("source_file")
    chunk_by_id = {m["chunk_id"]: m for m in manifest}

    claims: list[dict] = []
    stats = {
        "chunks_processed": 0,
        "chunks_failed": 0,
        "chunks_missing": 0,
        "raw_claims": 0,
        "rejected_claims": 0,
        "unresolved_references": 0,
        "salvaged_chunks": 0,
    }

    def ingest_cache(cache_file, pass_name):
        data = read_json(cache_file)
        if not data:
            return
        cid = data.get("chunk_id")
        man = chunk_by_id.get(cid)
        if man is None:
            man = {
                "chunk_id": cid,
                "chapter": data.get("chapter"),
                "section": data.get("section"),
                "paragraph_start": data.get("paragraph_start"),
                "paragraph_end": data.get("paragraph_end"),
                "pages": data.get("pages") or [],
            }
        if data.get("salvaged"):
            stats["salvaged_chunks"] += 1
        for claim in data.get("claims", []):
            paras = claim.get("paragraph_indices") or []
            page_start = min(man.get("pages") or []) if man.get("pages") else None
            page_end = max(man.get("pages") or []) if man.get("pages") else None
            rec = dict(claim)
            rec.update(
                {
                    "claim_id": None,
                    "pass": pass_name,
                    "source": {
                        "source_file": source_file,
                        "chapter": man.get("chapter") or data.get("chapter"),
                        "section": man.get("section"),
                        "page_start": page_start,
                        "page_end": page_end,
                        "paragraph_start": min(paras) if paras else man.get("paragraph_start"),
                        "paragraph_end": max(paras) if paras else man.get("paragraph_end"),
                        "chunk_id": cid,
                    },
                }
            )
            claims.append(rec)
        stats["raw_claims"] += len(data.get("claims", []))
        stats["rejected_claims"] += len(data.get("rejected", []))
        stats["unresolved_references"] += len(data.get("unresolved_references", []))

    for man in manifest:
        cid = man["chunk_id"]
        cache_file = paths.cache_extraction / f"{cid}.json"
        if cache_file.exists():
            ingest_cache(cache_file, "primary")
            stats["chunks_processed"] += 1
        elif (paths.cache_extraction / f"{cid}.FAILED.json").exists():
            stats["chunks_failed"] += 1
        else:
            stats["chunks_missing"] += 1

    if include_verify:
        for f in sorted(paths.cache_verify.glob("chunk_*.json")):
            if f.name.endswith(".FAILED.json"):
                continue
            ingest_cache(f, "verification")

    # deterministic IDs
    for n, rec in enumerate(claims, start=1):
        rec["claim_id"] = f"claim_{n:06d}"

    write_jsonl(paths.claims_jsonl, claims)
    log(f"[consolidate] loaded {len(claims)} claims "
        f"({stats['chunks_processed']} chunks, {stats['chunks_failed']} failed, "
        f"{stats['chunks_missing']} missing)")
    return claims, stats


def entity_inventory(claims: list[dict]) -> dict:
    """Counts and original terms per canonical entity."""
    inv: dict[str, dict] = {}
    for c in claims:
        ent = c["entity"]
        entry = inv.setdefault(ent, {"count": 0, "originals": Counter(),
                                     "categories": Counter(),
                                     "sub_entities": Counter()})
        entry["count"] += 1
        if c.get("entity_original"):
            entry["originals"][c["entity_original"]] += 1
        entry["categories"][c["category"]] += 1
        if c.get("sub_entity"):
            entry["sub_entities"][c["sub_entity"]] += 1
    return {
        k: {
            "count": v["count"],
            "originals": v["originals"].most_common(8),
            "categories": v["categories"].most_common(6),
            "sub_entities": v["sub_entities"].most_common(12),
        }
        for k, v in sorted(inv.items(), key=lambda kv: -kv[1]["count"])
    }


def merge_unique_sources(existing: list[dict], new: list[dict]) -> list[dict]:
    seen = {(s.get("claim_id"), s.get("chunk_id")) for s in existing}
    for s in new:
        key = (s.get("claim_id"), s.get("chunk_id"))
        if key not in seen:
            existing.append(s)
            seen.add(key)
    return existing


def strongest_certainty(values) -> str:
    best = "AMBIGUOUS"
    for v in values:
        if CERTAINTY_ORDER.get(v, 0) > CERTAINTY_ORDER.get(best, 0):
            best = v
    return best
