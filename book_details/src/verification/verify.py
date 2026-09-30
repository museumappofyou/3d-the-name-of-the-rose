"""Verification pass: lexical retrieval over the whole book to find missed evidence."""

from __future__ import annotations

import re
from collections import Counter

from ..chunking import is_paratext
from ..config import Paths, Settings
from ..extraction.extractor import Extractor
from ..extraction.prompts import EXTRACT_PROMPT
from ..llm import LLMClient
from ..util import (atomic_write_json, estimate_tokens, log, read_json,
                    read_jsonl, sha1, write_jsonl)

# Extra instruction for the verification re-read: paragraphs here were left
# uncovered by the first pass, so nudge the model towards recall without
# relaxing the no-invention rule.
VERIFY_NOTE = (
    "\nVERIFICATION NOTE\n"
    "These paragraphs come from a second, independent coverage pass over the novel; "
    "the automatic first pass left them uncovered. Re-read them with extra care for "
    "any spatial, architectural, movement, visibility, access or environmental detail "
    "that might have been missed, even when it is brief, indirect or incidental. If a "
    "fact is implied rather than stated, use STRONG_INFERENCE or WEAK_INFERENCE instead "
    "of dropping it. Absolute rule 1 still applies: never invent anything that is not "
    "supported by the text.\n"
)
VERIFY_PROMPT = EXTRACT_PROMPT.replace("\nCHUNK METADATA", VERIFY_NOTE + "\nCHUNK METADATA")

# place terms frequently used in the Turkish translation
BASE_PLACE_TERMS = [
    "manastır", "kilise", "kütüphane", "yazı salonu", "yazı odası", "yazıhane",
    "yemekhane", "mutfak", "revir", "ahır", "mezarlık", "bahçe", "bostan",
    "duvar", "kapı", "kule", "avlu", "merdiven", "mahzen", "bodrum", "hücre",
    "koğuş", "misafirhane", "hamam", "bina", "yapı", "aedificium", "edifice",
    "salon", "oda", "koridor", "geçit", "sundurma", "revak", "sütun", "kubbe",
    "çatı", "ocak", "şömine", "pencere", "sarnıç", "ambar", "kiler", "atölye",
    "demirci", "değirmen", "köprü", "yol", "patika", "uçurum", "tepe", "dağ",
    "geçit", "giriş", "çıkış", "mezbele", "şapel", "kripta", "sarnıç",
]

RELATION_TERMS = [
    "üstünde", "üstüne", "üstündeki", "üzerinde", "altında", "altındaki",
    "yukarı", "yukarıda", "aşağı", "aşağıda", "yanında", "yanındaki",
    "arkasında", "arkasındaki", "önünde", "önündeki", "arasında", "arasındaki",
    "sağında", "solunda", "kuzey", "güney", "doğu", "batı", "penceresinden",
    "penceresi", "pencereden", "merdiven", "merdivenler", "kapısından", "kapıdan",
    "geçitten", "girişten", "çıkışa", "döndü", "saptı", "geçti", "geçerek",
    "tırmandı", "çıktı", "indi", "girdi", "girerek", "ayrıldı", "dolaştı",
    "yürüdü", "vardı", "ulaştı", "yaklaştı", "uzaklaştı", "götürdü", "getirdi",
    "görünüyordu", "görülüyordu", "bakıyordu", "yükseliyordu", "uzanıyordu",
    "bitişik", "karşısında", "karşısındaki", "çevresinde", "etrafında",
    "uzakta", "yakınında", "içinde", "içindeki", "dışında", "dışındaki",
    "açılıyordu", "açılan", "çıkan", "inen", "üst kat", "alt kat", "kat",
]

MOVEMENT_VERBS = [
    "girdi", "çıktı", "geçti", "döndü", "saptı", "tırmandı", "indi", "yürüdü",
    "gitti", "geldi", "vardı", "ayrıldı", "dolaştı", "ilerledi", "koştu",
]


def _terms_for_entity(entity: str, aliases: dict) -> set[str]:
    terms = {entity.lower().replace("_", " ")}
    for group in aliases.get("alias_groups", []):
        if group.get("canonical_entity") == entity:
            terms.add(group["canonical_entity"].lower().replace("_", " "))
            for a in group.get("aliases", []):
                terms.add(a.lower().replace("_", " "))
    return terms


def build_search_terms(paths: Paths) -> dict:
    aliases = read_json(paths.entity_aliases) or {}
    entity_terms: dict[str, set[str]] = {}
    for entity in (read_json(paths.output / "consolidation_summary.json") or {}).get(
        "entity_counts", {}
    ):
        entity_terms[entity] = _terms_for_entity(entity, aliases)
    payload = {
        "entity_terms": {k: sorted(v) for k, v in entity_terms.items()},
        "base_place_terms": BASE_PLACE_TERMS,
        "relation_terms": RELATION_TERMS,
        "movement_verbs": MOVEMENT_VERBS,
    }
    atomic_write_json(paths.analysis / "verification_search_terms.json", payload)
    return payload


def scan_missed(paths: Paths, *, min_terms: int = 2,
                include_paratext: bool = False) -> dict:
    """Find paragraphs with lexical spatial content that no claim cites.

    Paratext (Eco's essay, postscript, endnotes, translator notes) is excluded
    unless ``include_paratext`` is set: the pipeline reconstructs the novel,
    not its editorial apparatus.
    """
    paragraphs = read_jsonl(paths.normalized_jsonl)
    claims = read_jsonl(paths.claims_jsonl)
    terms = build_search_terms(paths)
    if not paragraphs:
        raise SystemExit("no normalized book - run `scan` first")

    novel = [p for p in paragraphs if not is_paratext(p)]
    pool = paragraphs if include_paratext else novel
    paratext_count = len(paragraphs) - len(novel)

    covered: Counter = Counter()
    # A claim credits the paragraphs it cites plus a small neighbourhood: the
    # extraction model often cites one representative paragraph for a fact that
    # spans several adjacent ones. The neighbourhood only reduces redundant
    # re-extraction; the candidate extraction below is the real safety net.
    WINDOW = 2
    for claim in claims:
        paras = claim.get("paragraph_indices") or []
        if paras:
            for p in range(min(paras) - WINDOW, max(paras) + WINDOW + 1):
                covered[p] += 1
    # claims without explicit indices cover their chunk's paragraph range
    for claim in claims:
        src = claim.get("source") or {}
        if not claim.get("paragraph_indices") and src.get("paragraph_start"):
            for p in range(src["paragraph_start"], (src.get("paragraph_end") or
                                                     src["paragraph_start"]) + 1):
                covered[p] += 1

    place_terms = set(BASE_PLACE_TERMS)
    for term_list in terms["entity_terms"].values():
        place_terms.update(t.lower() for t in term_list)
    relation_terms = set(RELATION_TERMS)

    candidates = []
    for para in pool:
        text_l = para["text"].lower()
        if len(text_l) < 40:
            continue
        matched_places = sorted({t for t in place_terms if t in text_l})
        matched_rel = sorted({t for t in relation_terms if t in text_l})
        matched_moves = sorted({t for t in MOVEMENT_VERBS if t in text_l})
        score = len(matched_places) + len(matched_rel) + len(matched_moves)
        relevant = (
            (matched_places and (matched_rel or matched_moves) and score >= min_terms)
            or len(matched_places) >= 2
        )
        if not relevant:
            continue
        if covered.get(para["paragraph_index"], 0) > 0:
            continue
        candidates.append(
            {
                "paragraph_index": para["paragraph_index"],
                "doc_index": para.get("doc_index"),
                "chapter": para.get("chapter"),
                "section": para.get("section"),
                "matched_places": matched_places[:12],
                "matched_relations": matched_rel[:12],
                "matched_movements": matched_moves[:6],
                "score": score,
                "text": para["text"][:600],
                "claim_count_covering": covered.get(para["paragraph_index"], 0),
            }
        )
    candidates.sort(key=lambda c: (-c["score"], c["paragraph_index"]))

    # chunks with zero claims (whole-section misses); track whether later
    # verification passes have recovered part of them
    manifest = read_jsonl(paths.chunk_manifest)
    zero_chunks = [m["chunk_id"] for m in manifest if m.get("claim_count", 0) == 0]
    zero_chunk_coverage = {}
    for m in manifest:
        if m.get("claim_count", 0) != 0:
            continue
        ps, pe = m.get("paragraph_start"), m.get("paragraph_end")
        if ps is None or pe is None:
            continue
        total = pe - ps + 1
        cov = sum(1 for p in range(ps, pe + 1) if covered.get(p, 0) > 0)
        zero_chunk_coverage[m["chunk_id"]] = {"paragraphs": total, "covered": cov}
    novel_covered = sum(1 for p in novel if covered.get(p["paragraph_index"], 0))
    pool_covered = sum(1 for p in pool if covered.get(p["paragraph_index"], 0))
    coverage = {
        "total_paragraphs": len(paragraphs),
        "novel_paragraphs": len(novel),
        "paratext_paragraphs": paratext_count,
        "paratext_included": include_paratext,
        "paragraphs_covered": pool_covered,
        "novel_paragraphs_covered": novel_covered,
        "coverage_ratio": round(pool_covered / len(pool), 4) if pool else 0.0,
        "paragraphs_with_candidates": len(candidates),
        "zero_claim_chunks": zero_chunks,
        "zero_claim_chunk_coverage": zero_chunk_coverage,
    }
    write_jsonl(paths.analysis / "verification_candidates.jsonl", candidates)
    atomic_write_json(paths.analysis / "verification_coverage.json", coverage)
    log(f"[verify] novel {novel_covered}/{len(novel)} paragraphs covered "
        f"(+{paratext_count} paratext excluded); {len(candidates)} candidate "
        f"misses; {len(zero_chunks)} zero-claim chunks")
    return {"coverage": coverage, "candidates": candidates}


def extract_candidates(paths: Paths, settings: Settings, client: LLMClient,
                       *, max_tokens_per_chunk: int = 2500, limit: int = 0) -> dict:
    """Process candidate paragraphs through the SAME extraction rules."""
    candidates = read_jsonl(paths.analysis / "verification_candidates.jsonl")
    if limit:
        candidates = candidates[:limit]
    if not candidates:
        return {"processed": 0, "failed": 0, "claims": 0}

    paragraphs = {p["paragraph_index"]: p for p in read_jsonl(paths.normalized_jsonl)}
    # group candidates into token-bounded pseudo-chunks; keep paragraph order
    groups: list[list[int]] = []
    cur: list[int] = []
    cur_tokens = 0
    for cand in sorted(candidates, key=lambda c: c["paragraph_index"]):
        pi = cand["paragraph_index"]
        para = paragraphs.get(pi)
        if not para:
            continue
        toks = estimate_tokens(para["text"])
        if cur and cur_tokens + toks > max_tokens_per_chunk:
            groups.append(cur)
            cur, cur_tokens = [], 0
        cur.append(pi)
        cur_tokens += toks
    if cur:
        groups.append(cur)

    # content-addressed IDs: a later verification pass never overwrites the
    # cached output of an earlier one (overwrites used to silently drop
    # already-consolidated claims), and an interrupted pass resumes from cache.
    pseudo_chunks = []
    for group in groups:
        ps = [paragraphs[pi] for pi in group]
        text = "\n\n".join(f"[P{p['paragraph_index']}] {p['text']}" for p in ps)
        pseudo_chunks.append(
            {
                "chunk_id": f"chunk_v{sha1(text)[:10]}",
                "chapter": next((p.get("chapter") for p in ps if p.get("chapter")), None),
                "section": next((p.get("section") for p in ps if p.get("section")), None),
                "paragraph_start": ps[0]["paragraph_index"],
                "paragraph_end": ps[-1]["paragraph_index"],
                "paragraph_indices": [p["paragraph_index"] for p in ps],
                "pages": [],
                "est_tokens": estimate_tokens(text),
                "text": text,
                "source_sha1": sha1(text),
            }
        )

    extractor = Extractor(paths, settings, client, pass_name="verification",
                          cache_dir=paths.cache_verify,
                          prompt_template=VERIFY_PROMPT)
    stats = {"processed": 0, "cached": 0, "failed": 0, "claims": 0}
    for chunk in pseudo_chunks:
        res = extractor.process_chunk(chunk)
        stats[res["status"]] = stats.get(res["status"], 0) + 1
        stats["claims"] += res.get("claim_count", 0)
    log(f"[verify] candidate extraction: {len(pseudo_chunks)} chunks, "
        f"{stats['claims']} new claims")
    return stats
