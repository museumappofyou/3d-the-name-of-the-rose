"""Human-readable Markdown reports (claim-ID references, no long prose)."""

from __future__ import annotations

from collections import Counter, defaultdict
from os.path import relpath
from pathlib import Path

from ..config import Paths
from ..util import log, read_json, read_jsonl

CERT_ORDER = {"EXPLICIT": 3, "STRONG_INFERENCE": 2, "WEAK_INFERENCE": 1, "AMBIGUOUS": 0}


def _fact_line(fact: dict) -> str:
    cids = ", ".join(s.get("claim_id", "?") for s in fact.get("sources", [])[:4])
    extra = f" +{fact['support'] - 4} more" if fact["support"] > 4 else ""
    return (f"- **{fact['fact']}**  \n"
            f"  `{fact['fact_id']}` | {fact['category']} | {fact['certainty']} | "
            f"support {fact['support']} | claims: {cids}{extra}")


def _sort_facts(facts):
    return sorted(facts, key=lambda f: (-f["support"],
                                        -CERT_ORDER.get(f["certainty"], 0),
                                        f["fact"]))


def _entity_facts(facts: list[dict], entity: str, *, include_mentions=True):
    out = []
    for f in facts:
        if f["entity"] == entity:
            out.append(f)
            continue
        if include_mentions:
            rel = f.get("normalized_relation") or {}
            mv = f.get("movement") or {}
            if entity in (rel.get("subject"), rel.get("object")):
                out.append(f)
            elif entity in (mv.get("from"), mv.get("to")) or entity in (mv.get("via") or []):
                out.append(f)
            elif entity in ((f.get("visibility") or {}).get("observer_location"),
                            (f.get("visibility") or {}).get("observed")):
                out.append(f)
    return _sort_facts(out)


def _write(paths: Paths, name: str, text: str) -> None:
    path = paths.reports / name
    path.write_text(text.rstrip() + "\n", encoding="utf-8")
    log(f"[report] wrote {path}")


def _tree_lines(nodes: dict, root: str | None, max_depth=6) -> list[str]:
    lines = []
    visited = set()

    def walk(node, depth):
        if depth > max_depth or node in visited:
            return
        visited.add(node)
        info = nodes.get(node) or {}
        cert = info.get("certainty") or info.get("llm_certainty") or ""
        note = f" — {info.get('note')}" if info.get("note") else ""
        lines.append("  " * depth + f"- {node}" + (f" [{cert}]" if cert else "") + note)
        for child in info.get("children") or []:
            walk(child, depth + 1)

    if root:
        walk(root, 0)
    for node in nodes:
        if node not in visited:
            walk(node, 0)
    return lines


def generate_reports(paths: Paths) -> dict:
    facts = read_json(paths.facts_json) or []
    claims = read_jsonl(paths.claims_jsonl)
    hierarchy = read_json(paths.output / "abbey_hierarchy.json") or {}
    constraints = read_json(paths.output / "reconstruction_constraints.json") or {}
    contradictions = read_json(paths.analysis / "contradictions.json") or {}
    unresolved = read_json(paths.unresolved_references) or {}
    aliases = read_json(paths.entity_aliases) or {}
    possible_merges = read_json(paths.possible_merges) or {}
    summary = read_json(paths.output / "consolidation_summary.json") or {}
    coverage = read_json(paths.analysis / "verification_coverage.json") or {}

    entities = Counter()
    for f in facts:
        entities[f["entity"]] += 1

    # ---------------------------------------------------------------- overview
    lines = ["# Abbey overview (from *Gülün Adı* / The Name of the Rose)",
             "",
             "All statements below are extracted from the novel only. Claim IDs point to "
             f"`{relpath(paths.claims_jsonl, paths.reports)}`; "
             f"fact IDs point to `{relpath(paths.facts_json, paths.reports)}`.",
             "",
             "## Totals",
             f"- claims: {len(claims)}",
             f"- consolidated facts: {len(facts)}",
             f"- entities/spaces: {len(entities)}",
             f"- spatial relations: {summary.get('spatial_relations')}",
             f"- movement relations: {summary.get('movement_relations')}",
             f"- visibility relations: {summary.get('visibility_relations')}",
             f"- access relations: {summary.get('access_relations')}",
             f"- reconstruction constraints: "
             f"HARD {constraints.get('counts', {}).get('HARD')} / "
             f"MEDIUM {constraints.get('counts', {}).get('MEDIUM')} / "
             f"SOFT {constraints.get('counts', {}).get('SOFT')}",
             "",
             "## Most evidenced entities",
             ""]
    for ent, n in entities.most_common(30):
        lines.append(f"- {ent}: {n} facts")
    lines += ["", "## Containment hierarchy (best supported)", ""]
    lines += _tree_lines(hierarchy.get("nodes") or {}, hierarchy.get("root"))
    lines += ["", "## Site and landscape", ""]
    lines += [_fact_line(f) for f in _sort_facts(
        [f for f in facts if f["category"] == "site_landscape"])[:40]]
    lines += ["", "## General layout", ""]
    lines += [_fact_line(f) for f in _sort_facts(
        [f for f in facts if f["category"] == "general_layout"])[:60]]
    _write(paths, "ABBEY_OVERVIEW.md", "\n".join(lines) + "\n")

    # ------------------------------------------------------------------ spaces
    lines = ["# Spaces", "",
             "Every identified building, room, area and architectural subspace with "
             "evidence counts. Facts are ordered by independent support.", ""]
    for ent, n in entities.most_common():
        eff = _entity_facts(facts, ent)
        lines += [f"## {ent}  ({n} facts)", ""]
        subs = Counter()
        for f in facts:
            if f["entity"] == ent and f.get("sub_entity"):
                subs[f["sub_entity"]] += 1
        if subs:
            lines.append("Sub-spaces: " + ", ".join(f"{s} ({c})" for s, c in subs.most_common()))
            lines.append("")
        for f in eff[:150]:
            lines.append(_fact_line(f))
        if len(eff) > 150:
            lines.append(f"- … and {len(eff) - 150} more facts (see `facts.json`)")
        lines.append("")
    _write(paths, "SPACES.md", "\n".join(lines) + "\n")

    # -------------------------------------------------- dedicated key reports
    def entity_report(entity: str, title: str) -> None:
        eff = _entity_facts(facts, entity)
        lines = [f"# {title}", "",
                 f"{len(eff)} facts reference `{entity}`. "
                 "Only facts supported by the novel are included.", ""]
        by_cat = defaultdict(list)
        for f in eff:
            by_cat[f["category"]].append(f)
        for cat in sorted(by_cat, key=lambda c: -len(by_cat[c])):
            lines.append(f"## {cat} ({len(by_cat[cat])})")
            lines.append("")
            for f in by_cat[cat][:120]:
                lines.append(_fact_line(f))
            lines.append("")
        _write(paths, f"{entity}.md", "\n".join(lines) + "\n")

    for entity, filename, title in [
        ("AEDIFICIUM", "AEDIFICIUM.md", "The Aedificium"),
        ("LIBRARY", "LIBRARY.md", "The Library"),
        ("SCRIPTORIUM", "SCRIPTORIUM.md", "The Scriptorium"),
        ("CHURCH", "CHURCH.md", "The Church"),
    ]:
        entity_report(entity, title)

    # --------------------------------------------------------- other buildings
    others = [e for e, _ in entities.most_common()
              if e not in ("AEDIFICIUM", "LIBRARY", "SCRIPTORIUM", "CHURCH")]
    lines = ["# Other buildings and spaces", ""]
    for ent in others:
        eff = _entity_facts(facts, ent)
        lines += [f"## {ent} ({len(eff)} facts)", ""]
        for f in eff[:80]:
            lines.append(_fact_line(f))
        lines.append("")
    _write(paths, "OTHER_BUILDINGS.md", "\n".join(lines) + "\n")

    # ------------------------------------------------------------------ routes
    movement_facts = [f for f in facts if f["category"] == "movement"
                      or f.get("movement")]
    movement_graph = read_json(paths.output / "movement_graph.json") or {}
    lines = ["# Routes and circulation", "",
             f"{len(movement_facts)} movement facts.", "",
             "## Movement facts", ""]
    for f in _sort_facts(movement_facts)[:250]:
        lines.append(_fact_line(f))
    lines += ["", "## Route sequences (per chunk, in reading order)", ""]
    for seq in (movement_graph.get("sequences") or [])[:100]:
        route = " → ".join(x or "?" for x in seq["route"])
        lines.append(f"- {seq['chunk_id']} ({seq.get('chapter')}): {route} "
                     f"[{', '.join(seq['claim_ids'][:6])}]")
    _write(paths, "ROUTES.md", "\n".join(lines) + "\n")

    # ----------------------------------------------------------- uncertainties
    weak = [f for f in facts if f["certainty"] in ("WEAK_INFERENCE", "AMBIGUOUS")]
    rejected_total = sum(len((read_json(paths.cache_extraction / f"{m['chunk_id']}.json") or {})
                             .get("rejected", []))
                         for m in read_jsonl(paths.chunk_manifest))
    lines = ["# Uncertainties", "",
             f"- weak/ambiguous facts: {len(weak)}",
             f"- unresolved references: {unresolved.get('count')}",
             f"- possible entity merges (not applied): {len(possible_merges.get('possible_merges', []))}",
             f"- contradiction candidates: {contradictions.get('count', 0)}",
             f"- rejected (schema-invalid) claim records: {rejected_total}",
             "",
             "## Weak / ambiguous facts", ""]
    for f in _sort_facts(weak)[:200]:
        lines.append(_fact_line(f))
    lines += ["", "## Unresolved references", ""]
    for ref in (unresolved.get("references") or [])[:200]:
        lines.append(f"- “{ref.get('reference')}” — {ref.get('reason') or 'unresolved'} "
                     f"({ref.get('chunk_id')})")
    lines += ["", "## Possible entity merges (uncertain, kept separate)", ""]
    for pm in possible_merges.get("possible_merges", [])[:100]:
        lines.append(f"- {' + '.join(pm.get('entities', []))}: {pm.get('reason')}")
    lines += ["", "## Contradictions", "",
              "Candidate conflicts, adjudicated by the consolidation model. "
              "`contradiction` = judged incompatible; `uncertain` = needs a human; "
              "`compatible` = judged consistent.", ""]
    order = {"contradiction": 0, "uncertain": 1, "compatible": 2, "unverified": 1}
    for cand in sorted(contradictions.get("candidates", []),
                       key=lambda c: order.get(c.get("verdict", ""), 3)):
        lines.append(f"- **[{cand.get('verdict')}] {cand.get('topic') or cand['type']}**: "
                     f"“{cand['a']['statement']}” ({cand['a']['source'].get('claim_id')}) vs "
                     f"“{cand['b']['statement']}” ({cand['b']['source'].get('claim_id')}) — "
                     f"{cand.get('explanation')}")
    _write(paths, "UNCERTAINTIES.md", "\n".join(lines) + "\n")

    # --------------------------------------------------- reconstruction notes
    cons = constraints.get("constraints", [])
    lines = ["# Reconstruction notes", "",
             "What can and cannot be reconstructed from the novel alone.", "",
             "## Constraint classes",
             f"- HARD: {constraints.get('counts', {}).get('HARD')}",
             f"- MEDIUM: {constraints.get('counts', {}).get('MEDIUM')}",
             f"- SOFT: {constraints.get('counts', {}).get('SOFT')}",
             "",
             "No coordinates are invented anywhere in this project. Qualitative wording "
             "is preserved as qualitative.", ""]
    for cls in ("HARD", "MEDIUM", "SOFT"):
        subset = [c for c in cons if c["class"] == cls]
        lines += [f"## {cls} constraints ({len(subset)})", ""]
        for c in subset[:200]:
            rel = c.get("normalized_relation")
            mv = c.get("movement")
            if rel:
                desc = f"{rel['subject']} {rel['relation']} {rel['object']}"
            elif mv:
                desc = f"movement {mv.get('from')} -> {mv.get('to')} via {mv.get('via')}"
            else:
                desc = f"{c['entity']}: {c.get('attribute')} = {c.get('value')}"
            lines.append(f"- [{c['type']}] {desc} ({c['certainty']}, `{c['claim_id']}`)")
        lines.append("")
    lines += ["## Known limits",
              "- Only facts stated or strongly implied in the novel are present.",
              "- Where the novel is silent, the output is silent (UNKNOWN is a result).",
              "- Temporary states (night, fire, weather) are flagged, not treated as architecture.",
              "- Contradictions are reported, not resolved.",
              "- Measurement units are the novel's own (e.g. adım/pace), never converted to "
              "modern units unless the novel does so."]
    _write(paths, "RECONSTRUCTION_NOTES.md", "\n".join(lines) + "\n")

    # --------------------------------------------------------------- coverage
    manifest = read_jsonl(paths.chunk_manifest)
    meta = read_json(paths.book_meta) or {}
    failed = [m["chunk_id"] for m in manifest if m.get("status") == "failed"]
    pending = [m["chunk_id"] for m in manifest if m.get("status") == "pending"]
    processed = [m for m in manifest if m.get("status") == "processed"]
    usage = read_jsonl(paths.llm_usage)
    total_cost = sum((u.get("usage") or {}).get("cost") or 0 for u in usage)
    lines = ["# Coverage report", "",
             "## Source",
             f"- source file: `{Path(meta.get('used_source') or meta.get('source_file') or 'not available').name}` (local, excluded from Git)",
             f"- format: {meta.get('source_format')}",
             f"- paragraphs: {meta.get('paragraph_count')}",
             f"- paratext paragraphs: {meta.get('paratext_paragraphs', 0)}",
             f"- chapters: {len(meta.get('chapters') or [])}",
             "",
             "## Chunks",
             f"- total chunks: {len(manifest)}",
             f"- processed: {len(processed)}",
             f"- failed: {len(failed)}",
             f"- pending: {len(pending)}",
             f"- processed + failed == total: "
             f"{len(processed) + len(failed) == len(manifest)}",
             ""]
    if failed:
        lines += ["### Failed chunks (need re-run)", ""]
        lines += [f"- {c}" for c in failed]
        lines.append("")
    if pending:
        lines += ["### Pending chunks", ""]
        lines += [f"- {c}" for c in pending]
        lines.append("")
    verify_claims = sum(1 for c in claims if c.get("pass") == "verification")
    lines += ["## Claims",
              f"- total raw claims: {len(claims)} "
              f"(primary {len(claims) - verify_claims}, verification {verify_claims})",
              f"- consolidated facts: {summary.get('facts')}",
              f"- entities: {summary.get('entities')}",
              f"- unresolved references: {summary.get('unresolved_references')}",
              f"- contradiction candidates: {summary.get('contradiction_candidates')} "
              f"({summary.get('contradictions')} judged contradictions)",
              f"- aliases applied: {summary.get('alias_mappings')}",
              "",
              "## Verification (novel only)",
              f"- paragraphs total: {coverage.get('total_paragraphs')}",
              f"- paratext paragraphs excluded: {coverage.get('paratext_paragraphs')}",
              f"- novel paragraphs: {coverage.get('novel_paragraphs')}",
              f"- novel paragraphs covered by at least one claim: "
              f"{coverage.get('novel_paragraphs_covered')} "
              f"({100 * (coverage.get('coverage_ratio') or 0):.1f}% of analysed paragraphs)",
              f"- candidate missed paragraphs detected lexically and re-examined: "
              f"{coverage.get('paragraphs_with_candidates')}",
              f"- zero-claim chunks (re-read in the verification pass): "
              f"{', '.join(coverage.get('zero_claim_chunks', [])) or 'none'}",
              "",
              "## LLM usage",
              f"- calls logged: {len(usage)}",
              f"- reported cost (USD): {total_cost:.4f}",
              ]
    _write(paths, "COVERAGE_REPORT.md", "\n".join(lines) + "\n")

    return {
        "reports": [
            "ABBEY_OVERVIEW.md", "SPACES.md", "AEDIFICIUM.md", "LIBRARY.md",
            "SCRIPTORIUM.md", "CHURCH.md", "OTHER_BUILDINGS.md", "ROUTES.md",
            "UNCERTAINTIES.md", "RECONSTRUCTION_NOTES.md", "COVERAGE_REPORT.md",
        ],
        "facts": len(facts),
        "claims": len(claims),
    }
