"""Chunking of the normalized paragraph stream.

Rules:
  * chunks never split a paragraph (except paragraphs that are themselves
    larger than 2x the chunk budget, split at sentence boundaries);
  * consecutive chunks overlap by whole trailing paragraphs up to the overlap
    budget, so that no sentence and no boundary context is lost;
  * every paragraph index is covered by at least one chunk.
"""

from __future__ import annotations

import re
from pathlib import Path

from .util import (atomic_write_json, estimate_tokens, log, read_json,
                   read_jsonl, sha1, write_jsonl)

SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?…])\s+")


def _split_oversized(text: str, budget: int) -> list[str]:
    """Split a huge paragraph into sentence-respecting pieces <= budget tokens."""
    sentences = SENTENCE_SPLIT_RE.split(text)
    pieces: list[str] = []
    cur: list[str] = []
    cur_tokens = 0
    for sent in sentences:
        st = estimate_tokens(sent)
        if cur and cur_tokens + st > budget:
            pieces.append(" ".join(cur))
            cur, cur_tokens = [], 0
        cur.append(sent)
        cur_tokens += st
    if cur:
        pieces.append(" ".join(cur))
    return pieces


def is_paratext(record: dict) -> bool:
    """Heuristic: front/back matter that is not part of the novel's narrative."""
    from .util import norm_key

    if record.get("paratext_doc"):
        return True
    chapter = norm_key(record.get("chapter") or "")
    if "UZERINE" in chapter and "GULUN" in chapter:
        return True
    if any(w in chapter for w in ("SONSOZ", "KAYNAKCA", "CEVIRMENIN", "BIBLIOGRAFYA")):
        return True
    return False


def build_chunks(paragraphs: list[dict], *, chunk_size: int = 3500,
                 overlap: int = 600, include_paratext: bool = False) -> list[dict]:
    paras = [p for p in paragraphs if p.get("text", "").strip()]
    if not include_paratext:
        paras = [p for p in paras if not is_paratext(p)]

    # expand oversized paragraphs into pseudo-paragraphs (marked)
    expanded: list[dict] = []
    for p in paras:
        toks = estimate_tokens(p["text"])
        if toks > chunk_size * 2:
            for j, piece in enumerate(_split_oversized(p["text"], chunk_size)):
                q = dict(p)
                q["text"] = piece
                q["part_of_paragraph"] = f"{j + 1}"
                q["paragraph_index"] = p["paragraph_index"]
                expanded.append(q)
        else:
            expanded.append(p)
    paras = expanded

    chunks: list[dict] = []
    i = 0
    while i < len(paras):
        j = i
        tokens = 0
        last = i
        while j < len(paras):
            t = estimate_tokens(paras[j]["text"])
            if tokens and tokens + t > chunk_size:
                break
            tokens += t
            last = j
            j += 1
        group = paras[i : last + 1]

        # compute overlap start: trailing paragraphs of this group within budget;
        # always carry at least one paragraph when the group has more than one,
        # so consecutive chunks really share boundary context.
        overlap_count = 0
        ov_tokens = 0
        for k in range(last, i, -1):
            t = estimate_tokens(paras[k]["text"])
            if ov_tokens + t > overlap:
                break
            ov_tokens += t
            overlap_count += 1
        if overlap and overlap_count == 0 and last > i:
            overlap_count = 1
        next_i = last + 1 - overlap_count
        if next_i <= i:
            next_i = i + 1
        i = next_i

        chapter = next((p.get("chapter") for p in group if p.get("chapter")), None)
        section = next((p.get("section") for p in group if p.get("section")), None)
        pages = sorted({p["page"] for p in group if p.get("page")})
        chunks.append(
            {
                "chunk_id": None,  # assigned by caller
                "chapter": chapter,
                "section": section,
                "doc_indices": sorted({p.get("doc_index") for p in group}),
                "paragraph_start": group[0]["paragraph_index"],
                "paragraph_end": group[-1]["paragraph_index"],
                "paragraph_indices": [p["paragraph_index"] for p in group],
                "pages": pages,
                "est_tokens": tokens,
                "text": "\n\n".join(
                    f"[P{p['paragraph_index']}] {p['text']}" for p in group
                ),
                "source_sha1": sha1("\n".join(p["text"] for p in group)),
                "is_paratext": all(is_paratext(p) for p in group),
            }
        )
    for n, c in enumerate(chunks, start=1):
        c["chunk_id"] = f"chunk_{n:04d}"
    return chunks


def write_chunks(paths, chunks: list[dict]) -> None:
    old = {c["chunk_id"]: c for c in read_jsonl(paths.chunk_manifest)}
    keep = {c["chunk_id"] for c in chunks}
    for stale in paths.chunks.glob("chunk_*.json"):
        if stale.stem not in keep:
            stale.unlink()
    manifest_rows = []
    for chunk in chunks:
        cid = chunk["chunk_id"]
        cache_file = paths.cache_extraction / f"{cid}.json"
        cached = read_json(cache_file)
        processed = bool(cached and cached.get("claims") is not None)
        status = "processed" if processed else "pending"
        failed_file = paths.cache_extraction / f"{cid}.FAILED.json"
        if failed_file.exists() and not processed:
            status = "failed"
        prev = old.get(cid, {})
        # preserve processed bookkeeping from previous runs
        attempts = prev.get("attempts", 0)
        claim_count = prev.get("claim_count", 0)
        if cached:
            claim_count = len(cached.get("claims", []))
        manifest_rows.append(
            {
                "chunk_id": cid,
                "chapter": chunk["chapter"],
                "section": chunk["section"],
                "pages": chunk["pages"],
                "doc_indices": chunk["doc_indices"],
                "paragraph_start": chunk["paragraph_start"],
                "paragraph_end": chunk["paragraph_end"],
                "est_tokens": chunk["est_tokens"],
                "text_sha1": chunk["source_sha1"],
                "processed": processed,
                "status": status,
                "attempts": attempts,
                "claim_count": claim_count,
            }
        )
        (paths.chunks / f"{cid}.json").parent.mkdir(parents=True, exist_ok=True)
        atomic_write_json(paths.chunks / f"{cid}.json", chunk)
    write_jsonl(paths.chunk_manifest, manifest_rows)
    log(f"[chunk] wrote {len(chunks)} chunks, manifest -> {paths.chunk_manifest}")


def load_chunks(paths) -> list[dict]:
    chunks = []
    for p in sorted(paths.chunks.glob("chunk_*.json")):
        data = read_json(p)
        if data:
            chunks.append(data)
    return chunks
