"""Scan step: locate the book, ingest it, normalize, chunk."""

from __future__ import annotations

from .chunking import build_chunks, is_paratext, write_chunks
from .config import Paths, Settings
from .ingest import ingest
from .util import (atomic_write_json, find_book_source, log, read_json,
                   write_jsonl)


def run_scan(paths: Paths, settings: Settings, *, force: bool = False) -> dict:
    source = find_book_source(paths.root, settings.source)
    log(f"[scan] source: {source.name}")
    paragraphs, meta = ingest(source)
    meta["used_source"] = str(source)
    meta["settings"] = settings.as_dict()

    paratext_count = sum(1 for p in paragraphs if is_paratext(p))
    meta["paratext_paragraphs"] = paratext_count
    meta["chapters"] = sorted({p["chapter"] for p in paragraphs if p.get("chapter")})
    meta["sections"] = sorted(
        {f"{p['chapter']} / {p['section']}" for p in paragraphs if p.get("section")}
    )
    write_jsonl(paths.normalized_jsonl, paragraphs)
    atomic_write_json(paths.book_meta, meta)
    log(f"[scan] normalized {len(paragraphs)} paragraphs "
        f"({paratext_count} paratext) -> {paths.normalized_jsonl}")

    chunks = build_chunks(
        paragraphs,
        chunk_size=settings.chunk_size,
        overlap=settings.overlap,
        include_paratext=settings.include_paratext,
    )
    write_chunks(paths, chunks)
    log(f"[scan] chunks: {len(chunks)} "
        f"(chunk_size={settings.chunk_size}, overlap={settings.overlap})")
    return {
        "source": str(source),
        "paragraphs": len(paragraphs),
        "chunks": len(chunks),
        "chapters": len(meta["chapters"]),
    }
