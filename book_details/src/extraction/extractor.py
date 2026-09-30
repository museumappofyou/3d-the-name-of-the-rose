"""Resumable, retrying, cached extraction of claims from chunks."""

from __future__ import annotations

import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from ..chunking import load_chunks, write_chunks
from ..config import Paths, Settings
from ..llm import LLMClient, LLMError
from ..util import (atomic_write_json, log, read_json, read_jsonl, sha1,
                    write_jsonl)
from .prompts import EXTRACT_PROMPT, render
from .schema import parse_json_object, salvage_claims, validate_payload

JSON_RETRY_SUFFIX = (
    "\n\nREMINDER: your previous answer was not parseable as JSON. "
    "Answer with ONE valid JSON object only. No markdown fences, no commentary.\n"
)


class Extractor:
    def __init__(self, paths: Paths, settings: Settings, client: LLMClient,
                 *, prompt_template: str = EXTRACT_PROMPT,
                 cache_dir: Path | None = None, pass_name: str = "primary",
                 model: str | None = None):
        self.paths = paths
        self.settings = settings
        self.client = client
        self.prompt_template = prompt_template
        self.cache_dir = Path(cache_dir) if cache_dir else paths.cache_extraction
        self.pass_name = pass_name
        self.model = model or settings.extraction_model
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    def cache_path(self, chunk_id: str) -> Path:
        return self.cache_dir / f"{chunk_id}.json"

    def failed_path(self, chunk_id: str) -> Path:
        return self.cache_dir / f"{chunk_id}.FAILED.json"

    def load_cached(self, chunk: dict) -> dict | None:
        data = read_json(self.cache_path(chunk["chunk_id"]))
        if not data:
            return None
        if data.get("chunk_sha1") != chunk["source_sha1"]:
            return None  # chunk text changed -> stale cache
        return data

    # ------------------------------------------------------------------
    def build_prompt(self, chunk: dict) -> str:
        return render(
            self.prompt_template,
            chunk_id=chunk["chunk_id"],
            chapter=chunk.get("chapter") or "?",
            section=chunk.get("section") or "?",
            para_start=chunk.get("paragraph_start"),
            para_end=chunk.get("paragraph_end"),
            chunk_text=chunk["text"],
        )

    def process_chunk(self, chunk: dict, *, force: bool = False) -> dict:
        cid = chunk["chunk_id"]
        if not force:
            cached = self.load_cached(chunk)
            if cached is not None and cached.get("claims") is not None:
                return {"chunk_id": cid, "status": "cached",
                        "claim_count": len(cached.get("claims", []))}

        prompt = self.build_prompt(chunk)
        attempts = 0
        raw_outputs: list[str] = []
        last_error = None

        for json_attempt in range(3):  # 1 initial + 2 JSON-repair retries
            attempts += 1
            try:
                result = self.client.complete(
                    prompt + (JSON_RETRY_SUFFIX if json_attempt else ""),
                    model=self.model,
                    label=f"{self.pass_name}:{cid}",
                    temperature=0.1,
                )
            except LLMError as exc:
                last_error = f"LLM error: {exc}"
                break
            raw_outputs.append(result.text)
            payload = parse_json_object(result.text)
            if payload is not None and "claims" not in payload:
                payload = None  # a nested fragment, not the whole payload
            salvaged = False
            if payload is None:
                payload = salvage_claims(result.text)
                salvaged = bool(payload)
            if payload is None:
                last_error = "unparseable JSON"
                continue

            validated = validate_payload(payload, chunk)
            payload_out = {
                "chunk_id": cid,
                "pass": self.pass_name,
                "model": result.model,
                "chunk_sha1": chunk["source_sha1"],
                "chapter": chunk.get("chapter"),
                "section": chunk.get("section"),
                "paragraph_start": chunk.get("paragraph_start"),
                "paragraph_end": chunk.get("paragraph_end"),
                "pages": chunk.get("pages") or [],
                "processed_at": time.time(),
                "attempts": attempts,
                "usage": result.usage,
                "salvaged": salvaged,
                "claims": validated["claims"],
                "rejected": validated["rejected"],
                "unresolved_references": validated["unresolved_references"],
                "warnings": validated["warnings"],
            }
            atomic_write_json(self.cache_path(cid), payload_out)
            failed = self.failed_path(cid)
            if failed.exists():
                failed.unlink()
            return {
                "chunk_id": cid,
                "status": "processed",
                "claim_count": len(validated["claims"]),
                "salvaged": salvaged,
            }

        # all attempts failed -> record, never discard
        atomic_write_json(
            self.failed_path(cid),
            {
                "chunk_id": cid,
                "pass": self.pass_name,
                "model": self.model,
                "chunk_sha1": chunk["source_sha1"],
                "failed_at": time.time(),
                "attempts": attempts,
                "error": last_error,
                "raw_outputs": [r[:20000] for r in raw_outputs],
            },
        )
        return {"chunk_id": cid, "status": "failed", "error": last_error,
                "claim_count": 0}

    # ------------------------------------------------------------------
    def run(self, *, force: bool = False, limit: int = 0,
            max_concurrency: int | None = None) -> dict:
        chunks = load_chunks(self.paths)
        if not chunks:
            raise SystemExit("no chunks found - run `scan` first")
        if limit:
            chunks = chunks[:limit]
        concurrency = max(1, max_concurrency or self.settings.max_concurrency)

        todo = []
        stats = {"processed": 0, "cached": 0, "failed": 0, "claim_count": 0}
        for chunk in chunks:
            if not force and self.load_cached(chunk) is not None:
                stats["cached"] += 1
                stats["claim_count"] += len(self.load_cached(chunk).get("claims", []))
            else:
                todo.append(chunk)
        log(f"[extract:{self.pass_name}] {len(chunks)} chunks, "
            f"{stats['cached']} cached, {len(todo)} to process "
            f"(concurrency={concurrency})")

        done = 0
        with ThreadPoolExecutor(max_workers=concurrency) as pool:
            futures = {pool.submit(self.process_chunk, c, force=force): c for c in todo}
            for fut in as_completed(futures):
                res = fut.result()
                done += 1
                if res["status"] == "processed":
                    stats["processed"] += 1
                    stats["claim_count"] += res.get("claim_count", 0)
                    log(f"[extract:{self.pass_name}] {done}/{len(todo)} "
                        f"{res['chunk_id']} -> {res.get('claim_count')} claims "
                        f"(salvaged={res.get('salvaged')})")
                else:
                    stats["failed"] += 1
                    log(f"[extract:{self.pass_name}] {done}/{len(todo)} "
                        f"{res['chunk_id']} FAILED: {res.get('error')}")

        self.update_manifest()
        stats["total_chunks"] = len(chunks)
        stats["ok"] = stats["processed"] + stats["cached"]
        return stats

    def update_manifest(self) -> None:
        """Refresh data/chunk_manifest.jsonl from chunks + cache state."""
        chunks = load_chunks(self.paths)
        rows = []
        for chunk in chunks:
            cid = chunk["chunk_id"]
            cached = self.load_cached(chunk)
            failed_file = self.failed_path(cid)
            attempts = 0
            claim_count = 0
            if cached:
                attempts = cached.get("attempts", 0)
                claim_count = len(cached.get("claims", []))
            status = "processed" if cached else ("failed" if failed_file.exists() else "pending")
            rows.append(
                {
                    "chunk_id": cid,
                    "chapter": chunk.get("chapter"),
                    "section": chunk.get("section"),
                    "pages": chunk.get("pages") or [],
                    "doc_indices": chunk.get("doc_indices") or [],
                    "paragraph_start": chunk.get("paragraph_start"),
                    "paragraph_end": chunk.get("paragraph_end"),
                    "est_tokens": chunk.get("est_tokens"),
                    "text_sha1": chunk.get("source_sha1"),
                    "processed": bool(cached),
                    "status": status,
                    "attempts": attempts,
                    "claim_count": claim_count,
                }
            )
        write_jsonl(self.paths.chunk_manifest, rows)
