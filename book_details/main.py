#!/usr/bin/env python3
"""CLI for the abbey extraction pipeline.

Commands:
  scan        locate the book, ingest, normalize, chunk
  extract     run the LLM extraction over every chunk (resumable, cached)
  consolidate dedupe, alias-normalize, graphs, hierarchy, contradictions
  verify      lexical verification pass over the whole novel (+ optional re-extraction)
  report      write the Markdown reports
  all         scan -> extract -> consolidate -> verify -> consolidate -> report
  status      show pipeline state
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from src.config import Paths, resolve_settings  # noqa: E402
from src.util import read_json, read_jsonl  # noqa: E402


def _paths(args) -> Paths:
    return Paths(Path(getattr(args, "root", None) or Path(__file__).resolve().parent))


def cmd_scan(args, settings, paths):
    from src.scan import run_scan

    stats = run_scan(paths, settings, force=args.force)
    print(json.dumps(stats, ensure_ascii=False, indent=2))


def cmd_extract(args, settings, paths):
    from src.extraction.extractor import Extractor
    from src.llm import build_client

    client = build_client(settings, paths)
    extractor = Extractor(paths, settings, client)
    stats = extractor.run(force=args.force, limit=settings.limit,
                          max_concurrency=settings.max_concurrency)
    print(json.dumps(stats, ensure_ascii=False, indent=2))
    if stats["failed"]:
        print(f"WARNING: {stats['failed']} chunks failed - re-run `extract` "
              f"(resumable) or inspect cache/extraction/*.FAILED.json",
              file=sys.stderr)


def cmd_consolidate(args, settings, paths):
    from src.consolidation.run import run_consolidation
    from src.llm import build_client

    client = None if args.no_llm else build_client(settings, paths)
    summary = run_consolidation(
        paths, settings, client,
        use_llm=not args.no_llm,
        include_verify=not args.no_verify_claims,
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))


def cmd_verify(args, settings, paths):
    from src.llm import build_client
    from src.verification.verify import extract_candidates, scan_missed

    if not paths.claims_jsonl.exists():
        raise SystemExit("output/claims.jsonl not found - run `consolidate` first")
    result = scan_missed(paths, include_paratext=settings.include_paratext)
    stats = None
    if not args.no_candidate_extraction and not args.no_llm:
        client = build_client(settings, paths)
        stats = extract_candidates(paths, settings, client, limit=args.verify_limit)
    print(json.dumps({"coverage": result["coverage"], "extraction": stats},
                     ensure_ascii=False, indent=2))


def cmd_report(args, settings, paths):
    from src.reporting.reports import generate_reports

    stats = generate_reports(paths)
    print(json.dumps(stats, ensure_ascii=False, indent=2))


def cmd_status(args, settings, paths):
    manifest = read_jsonl(paths.chunk_manifest)
    summary = read_json(paths.output / "consolidation_summary.json")
    meta = read_json(paths.book_meta) or {}
    counts = {"processed": 0, "failed": 0, "pending": 0}
    for m in manifest:
        counts[m.get("status", "pending")] = counts.get(m.get("status", "pending"), 0) + 1
    state = {
        "source": meta.get("used_source"),
        "paragraphs": meta.get("paragraph_count"),
        "chunks": len(manifest),
        **counts,
        "claims": summary.get("claims") if summary else None,
        "facts": summary.get("facts") if summary else None,
        "entities": summary.get("entities") if summary else None,
    }
    print(json.dumps(state, ensure_ascii=False, indent=2))


def cmd_all(args, settings, paths):
    t0 = time.time()
    cmd_scan(args, settings, paths)
    cmd_extract(args, settings, paths)
    cmd_consolidate(args, settings, paths)
    cmd_verify(args, settings, paths)
    # second consolidation merges the verification-pass claims into the dataset
    print("[all] re-consolidating with verification claims ...", file=sys.stderr)
    cmd_consolidate(args, settings, paths)
    cmd_report(args, settings, paths)
    print(f"[all] finished in {time.time() - t0:.1f}s", file=sys.stderr)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("command",
                        choices=["scan", "extract", "consolidate", "verify", "report",
                                 "all", "status"])
    parser.add_argument("--source", help="path to the .epub/.pdf/.txt source")
    parser.add_argument("--model", help="extraction model (provider/model)")
    parser.add_argument("--consolidation-model", dest="consolidation_model",
                        help="consolidation/reasoning model")
    parser.add_argument("--backend", choices=["opencode-cli", "openai-compatible"],
                        help="LLM backend (default opencode-cli)")
    parser.add_argument("--agent", help="opencode agent name used by the CLI backend")
    parser.add_argument("--root", help="project root (default: this file's directory)")
    parser.add_argument("--force", action="store_true",
                        help="ignore caches and redo the step")
    parser.add_argument("--chunk-size", type=int, dest="chunk_size",
                        help="target tokens per chunk (default 3500)")
    parser.add_argument("--overlap", type=int, help="overlap tokens between chunks (default 600)")
    parser.add_argument("--max-concurrency", type=int, dest="max_concurrency",
                        help="parallel LLM calls (default 3)")
    parser.add_argument("--timeout", type=int, help="per-call timeout in seconds")
    parser.add_argument("--limit", type=int, help="process only the first N chunks (debug)")
    parser.add_argument("--include-paratext", action="store_true", dest="include_paratext",
                        help="also process front/back matter (e.g. Eco's essay)")
    parser.add_argument("--no-llm", action="store_true", dest="no_llm",
                        help="consolidate without LLM calls (aliases/hierarchy/contradictions skipped)")
    parser.add_argument("--no-verify-extraction", action="store_true",
                        dest="no_candidate_extraction",
                        help="verification: only report lexical candidates, do not re-extract")
    parser.add_argument("--no-verify-claims", action="store_true", dest="no_verify_claims",
                        help="consolidate: ignore claims produced by the verification pass")
    parser.add_argument("--verify-limit", type=int, default=0, dest="verify_limit",
                        help="max candidate paragraphs to re-extract (0 = all)")
    return parser


def main(argv=None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    paths = _paths(args)
    settings = resolve_settings(args)
    settings.source = args.source or settings.source
    handlers = {
        "scan": cmd_scan,
        "extract": cmd_extract,
        "consolidate": cmd_consolidate,
        "verify": cmd_verify,
        "report": cmd_report,
        "all": cmd_all,
        "status": cmd_status,
    }
    handlers[args.command](args, settings, paths)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
