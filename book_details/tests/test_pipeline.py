"""Tests for the abbey extraction pipeline (stdlib unittest only)."""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from src.chunking import build_chunks, is_paratext  # noqa: E402
from src.config import Paths, Settings  # noqa: E402
from src.extraction.extractor import Extractor  # noqa: E402
from src.extraction.schema import (parse_json_object, salvage_claims,  # noqa: E402
                                   validate_payload)
from src.ingest import ingest  # noqa: E402
from src.util import (estimate_tokens, find_book_source, norm_key,  # noqa: E402
                      read_json, sha1, write_jsonl)


def make_paragraphs(n=40, sentence="Manastırın kilisesi avluya bakar."):
    return [
        {
            "source_file": "t.epub", "source_format": "epub", "doc_index": i // 10,
            "doc_href": "a.html", "chapter": "BİRİNCİ GÜN" if i < 20 else "İKİNCİ GÜN",
            "section": "SABAH", "paragraph_index": i, "index_in_doc": i,
            "anchor": None, "text": f"{sentence} Paragraf {i}. " * 8,
            "is_heading": False,
        }
        for i in range(n)
    ]


class IngestTests(unittest.TestCase):
    def test_epub_ingest_on_real_book(self):
        try:
            source = find_book_source(ROOT)
        except FileNotFoundError:
            self.skipTest("no book in repo")
        if source.suffix.lower() != ".epub":
            self.skipTest("repo source is not an epub")
        paragraphs, meta = ingest(source)
        self.assertGreater(len(paragraphs), 3000)
        self.assertEqual(meta["source_format"], "epub")
        self.assertTrue(any("GÜN" in (p["chapter"] or "").upper() for p in paragraphs))
        self.assertTrue(all(p["text"] for p in paragraphs))
        # global paragraph indices are dense and ordered
        self.assertEqual([p["paragraph_index"] for p in paragraphs],
                         list(range(len(paragraphs))))

    def test_txt_ingest(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "b.txt"
            path.write_text("Birinci paragraf.\n\nİkinci paragraf.\n", encoding="utf-8")
            paragraphs, meta = ingest(path)
            self.assertEqual(len(paragraphs), 2)
            self.assertEqual(paragraphs[1]["text"], "İkinci paragraf.")


class ChunkTests(unittest.TestCase):
    def test_coverage_and_overlap(self):
        paras = make_paragraphs(60)
        chunks = build_chunks(paras, chunk_size=300, overlap=60)
        self.assertGreater(len(chunks), 1)
        covered = set()
        for c in chunks:
            covered.update(c["paragraph_indices"])
            self.assertLessEqual(estimate_tokens(c["text"]), 300 * 3)
        self.assertEqual(covered, set(range(60)))
        # consecutive chunks overlap (in paragraphs)
        for a, b in zip(chunks, chunks[1:]):
            overlap = set(a["paragraph_indices"]) & set(b["paragraph_indices"])
            self.assertTrue(overlap, "chunks must overlap to preserve context")
            self.assertEqual(a["paragraph_end"] >= b["paragraph_start"], True)

    def test_no_split_inside_paragraph(self):
        paras = make_paragraphs(10, sentence="Uzun cümle burada duruyor.")
        for c in build_chunks(paras, chunk_size=80, overlap=20):
            self.assertTrue(c["text"].startswith("[P"))
        # every paragraph appears whole in at least one chunk
        texts = "\n".join(c["text"] for c in build_chunks(paras, chunk_size=80, overlap=20))
        for p in paras:
            self.assertIn(p["text"], texts)

    def test_paratext_detection(self):
        self.assertTrue(is_paratext({"chapter": "'GÜLÜN ADI' ÜZERİNE Umberto Eco"}))
        self.assertFalse(is_paratext({"chapter": "BİRİNCİ GÜN"}))


class SchemaTests(unittest.TestCase):
    def _chunk(self):
        return {"chunk_id": "chunk_0001", "paragraph_indices": [1, 2, 3],
                "paragraph_start": 1, "paragraph_end": 3}

    def test_valid_claim(self):
        payload = {"claims": [{
            "claim_local_id": "c1", "entity": "library", "sub_entity": None,
            "category": "spatial_relation", "attribute": "relative_position",
            "value": "above scriptorium",
            "normalized_relation": {"subject": "LIBRARY", "relation": "above",
                                    "object": "SCRIPTORIUM"},
            "certainty": "EXPLICIT", "paragraph_indices": [2],
            "evidence_fragment": "kütüphane yazı salonunun üstündedir",
        }]}
        out = validate_payload(payload, self._chunk())
        self.assertEqual(len(out["claims"]), 1)
        claim = out["claims"][0]
        self.assertEqual(claim["entity"], "LIBRARY")
        self.assertEqual(claim["normalized_relation"]["relation"], "above")
        self.assertEqual(claim["paragraph_indices"], [2])

    def test_invalid_relation_and_category_handled(self):
        payload = {"claims": [{
            "entity": "X", "category": "nonsense",
            "normalized_relation": {"subject": "A", "relation": "sideways", "object": "B"},
            "certainty": "MAYBE", "paragraph_indices": [99],
            "evidence_fragment": "",
        }]}
        out = validate_payload(payload, self._chunk())
        self.assertEqual(out["claims"][0]["category"], "other")
        self.assertEqual(out["claims"][0]["certainty"], "AMBIGUOUS")
        self.assertIsNone(out["claims"][0]["normalized_relation"])
        self.assertEqual(out["claims"][0]["paragraph_indices"], [])

    def test_missing_entity_rejected_not_dropped_from_record(self):
        payload = {"claims": [{"category": "geometry", "evidence_fragment": "duvar"}]}
        out = validate_payload(payload, self._chunk())
        self.assertEqual(len(out["claims"]), 0)
        self.assertEqual(len(out["rejected"]), 1)

    def test_parse_and_salvage_truncated_output(self):
        good = json.dumps({"claims": [{"a": 1}], "unresolved_references": []})
        self.assertEqual(parse_json_object(good)["claims"], [{"a": 1}])
        fenced = "```json\n" + good + "\n```"
        self.assertEqual(parse_json_object(fenced)["claims"], [{"a": 1}])
        truncated = '{"claims": [{"entity": "A", "category": "geometry"}, {"entity": "B"'
        salvaged = salvage_claims(truncated)
        self.assertIsNotNone(salvaged)
        self.assertEqual(len(salvaged["claims"]), 1)


class FakeClient:
    """Returns queued responses; raises nothing."""

    class _Backend:
        name = "fake"

    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = 0

    def complete(self, prompt, *, model, label="", temperature=None, system=None):
        from src.llm import CompletionResult

        self.calls += 1
        text = self.responses.pop(0) if self.responses else '{"claims": []}'
        return CompletionResult(text=text, model=model, backend="fake")

    def _log_usage(self, *a, **k):  # pragma: no cover
        pass


class ExtractorTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.paths = Paths(Path(self.tmp.name))
        self.settings = Settings()
        chunks = build_chunks(make_paragraphs(6, "Kule avlunun kuzeyindedir."),
                              chunk_size=200, overlap=40)
        write_jsonl(self.paths.chunk_manifest, [
            {"chunk_id": c["chunk_id"], "chapter": c["chapter"],
             "section": c["section"], "pages": [], "doc_indices": c["doc_indices"],
             "paragraph_start": c["paragraph_start"], "paragraph_end": c["paragraph_end"],
             "est_tokens": c["est_tokens"], "text_sha1": c["source_sha1"],
             "processed": False, "status": "pending", "attempts": 0, "claim_count": 0}
            for c in chunks
        ])
        for c in chunks:
            (self.paths.chunks / f"{c['chunk_id']}.json").write_text(
                json.dumps(c, ensure_ascii=False), encoding="utf-8")
        self.chunks = chunks

    def tearDown(self):
        self.tmp.cleanup()

    def _claim(self, para):
        return {
            "entity": "TOWER", "category": "spatial_relation",
            "normalized_relation": {"subject": "TOWER", "relation": "north_of",
                                    "object": "COURTYARD"},
            "certainty": "EXPLICIT", "paragraph_indices": [para],
            "evidence_fragment": "kule avlunun kuzeyinde",
        }

    def test_processing_and_cache_roundtrip(self):
        chunk = self.chunks[0]
        client = FakeClient([json.dumps({"claims": [self._claim(chunk["paragraph_indices"][0])],
                                         "unresolved_references": []})])
        ex = Extractor(self.paths, self.settings, client)
        res = ex.process_chunk(chunk)
        self.assertEqual(res["status"], "processed")
        self.assertTrue((self.paths.cache_extraction / f"{chunk['chunk_id']}.json").exists())
        # second run is served from cache (no new LLM call)
        calls_before = client.calls
        res2 = ex.process_chunk(chunk)
        self.assertEqual(res2["status"], "cached")
        self.assertEqual(client.calls, calls_before)

    def test_failed_chunk_recovery(self):
        chunk = self.chunks[0]
        bad_client = FakeClient(["not json", "still not json", "junk"])
        ex = Extractor(self.paths, self.settings, bad_client)
        res = ex.process_chunk(chunk)
        self.assertEqual(res["status"], "failed")
        failed_file = self.paths.cache_extraction / f"{chunk['chunk_id']}.FAILED.json"
        self.assertTrue(failed_file.exists())

        # after a successful retry the FAILED marker is removed and manifest updates
        good_client = FakeClient([json.dumps({"claims": [self._claim(chunk["paragraph_indices"][0])]})])
        ex2 = Extractor(self.paths, self.settings, good_client)
        res2 = ex2.process_chunk(chunk)
        self.assertEqual(res2["status"], "processed")
        self.assertFalse(failed_file.exists())
        ex2.update_manifest()
        manifest = json.loads((self.paths.chunk_manifest).read_text(encoding="utf-8")
                              .strip().splitlines()[0])
        self.assertEqual(manifest["status"], "processed")

    def test_processed_plus_failed_equals_total(self):
        # process one chunk badly, one well, leave the third pending
        bad = FakeClient(["x", "y", "z"])
        ex = Extractor(self.paths, self.settings, bad)
        ex.process_chunk(self.chunks[0])
        good = FakeClient([json.dumps({"claims": [self._claim(self.chunks[1]["paragraph_indices"][0])]})])
        ex2 = Extractor(self.paths, self.settings, good)
        ex2.process_chunk(self.chunks[1])
        ex2.update_manifest()
        from src.util import read_jsonl

        manifest = read_jsonl(self.paths.chunk_manifest)
        statuses = [m["status"] for m in manifest]
        self.assertEqual(len(manifest), len(self.chunks))
        self.assertEqual(statuses.count("processed") + statuses.count("failed")
                         + statuses.count("pending"), len(self.chunks))

    def test_salvage_truncated_claim_output(self):
        chunk = self.chunks[0]
        para = chunk["paragraph_indices"][0]
        second = dict(self._claim(para), entity="CHURCH")
        truncated = ('{"claims": [' + json.dumps(self._claim(para)) + ", "
                     + json.dumps(second)[:25])
        client = FakeClient([truncated, truncated, truncated])
        ex = Extractor(self.paths, self.settings, client)
        res = ex.process_chunk(chunk)
        # salvage succeeds on the first attempt
        self.assertEqual(res["status"], "processed")
        self.assertTrue(res["salvaged"])


class ConsolidationTests(unittest.TestCase):
    def test_dedupe_merges_identical_and_keeps_sources(self):
        from src.consolidation.dedupe import dedupe_claims
        from src.util import read_json

        with tempfile.TemporaryDirectory() as tmp:
            paths = Paths(Path(tmp))
            claims = []
            for i in (1, 2):
                claims.append({
                    "claim_id": f"claim_{i:06d}", "entity": "LIBRARY",
                    "canonical_entity": "LIBRARY", "canonical_sub_entity": None,
                    "category": "spatial_relation", "attribute": "relative_position",
                    "value": "above SCRIPTORIUM",
                    "normalized_relation": {"subject": "LIBRARY", "relation": "above",
                                            "object": "SCRIPTORIUM"},
                    "certainty": "EXPLICIT",
                    "evidence_fragment": "kütüphane üstte", "movement": None,
                    "visibility": None, "access_rule": None, "geometry": None,
                    "source": {"chunk_id": "chunk_0001", "chapter": "G1",
                               "paragraph_start": 1},
                })
            facts = dedupe_claims(paths, claims)
            self.assertEqual(len(facts), 1)
            self.assertEqual(facts[0]["support"], 2)
            self.assertEqual({s["claim_id"] for s in facts[0]["sources"]},
                             {"claim_000001", "claim_000002"})

    def test_alias_normalization(self):
        from src.consolidation.entities import normalize_entities

        with tempfile.TemporaryDirectory() as tmp:
            paths = Paths(Path(tmp))
            claims = [
                {"claim_id": "claim_000001", "entity": "EDIFICE",
                 "entity_original": "yapı", "category": "other", "source": {}},
                {"claim_id": "claim_000002", "entity": "AEDIFICIUM",
                 "entity_original": "Aedificium", "category": "other", "source": {}},
            ]
            client = FakeClient([json.dumps({
                "aliases": [{"canonical_entity": "AEDIFICIUM", "aliases": ["EDIFICE"],
                             "confidence": "high", "reason": "same building"}],
                "possible_merges": [],
            })])
            out, payload = normalize_entities(paths, claims, client, "fake", use_llm=True)
            self.assertEqual(out[0]["canonical_entity"], "AEDIFICIUM")
            self.assertEqual(payload["alias_map"], {"EDIFICE": "AEDIFICIUM"})

    def test_uncertain_merges_are_not_applied(self):
        from src.consolidation.entities import normalize_entities

        with tempfile.TemporaryDirectory() as tmp:
            paths = Paths(Path(tmp))
            claims = [
                {"claim_id": "claim_000001", "entity": "CHURCH",
                 "entity_original": "kilise", "category": "other", "source": {}},
                {"claim_id": "claim_000002", "entity": "CHAPEL",
                 "entity_original": "şapel", "category": "other", "source": {}},
            ]
            client = FakeClient([json.dumps({
                "aliases": [],
                "possible_merges": [{"entities": ["CHURCH", "CHAPEL"],
                                     "confidence": "low", "reason": "might be same"}],
            })])
            out, payload = normalize_entities(paths, claims, client, "fake", use_llm=True)
            self.assertEqual(out[0]["canonical_entity"], "CHURCH")
            self.assertEqual(out[1]["canonical_entity"], "CHAPEL")
            self.assertEqual(len(payload["possible_merges"]), 1)

    def test_graph_edges(self):
        from src.consolidation.graphs import build_graphs

        with tempfile.TemporaryDirectory() as tmp:
            paths = Paths(Path(tmp))
            claims = [{
                "claim_id": "claim_000001", "entity": "LIBRARY",
                "canonical_entity": "LIBRARY", "canonical_sub_entity": None,
                "category": "spatial_relation",
                "normalized_relation": {"subject": "LIBRARY", "relation": "above",
                                        "object": "SCRIPTORIUM"},
                "certainty": "EXPLICIT", "evidence_fragment": "üstünde",
                "movement": None, "visibility": None, "access_rule": None,
                "source": {"chunk_id": "chunk_0001"},
            }, {
                "claim_id": "claim_000002", "entity": "LIBRARY",
                "canonical_entity": "LIBRARY", "canonical_sub_entity": None,
                "category": "movement",
                "movement": {"from": "SCRIPTORIUM", "to": "LIBRARY", "via": [],
                             "direction": None, "level_change": "up", "route_text": None},
                "certainty": "EXPLICIT", "evidence_fragment": "çıktı",
                "normalized_relation": None, "visibility": None, "access_rule": None,
                "source": {"chunk_id": "chunk_0001"},
            }]
            stats = build_graphs(paths, claims)
            self.assertEqual(stats["spatial_edges"], 1)
            self.assertEqual(stats["movement_edges"], 1)
            graph = json.loads((paths.output / "spatial_graph.json").read_text(encoding="utf-8"))
            edge = graph["edges"][0]
            self.assertEqual((edge["subject"], edge["relation"], edge["object"]),
                             ("LIBRARY", "above", "SCRIPTORIUM"))


class VerificationTests(unittest.TestCase):
    def _paragraph(self, i, text, chapter):
        return {
            "source_file": "t.epub", "source_format": "epub", "doc_index": 0,
            "doc_href": "a.html", "chapter": chapter, "section": "SABAH",
            "paragraph_index": i, "index_in_doc": i, "anchor": None,
            "text": text, "is_heading": False,
        }

    def test_verification_excludes_paratext_by_default(self):
        from src.verification.verify import scan_missed

        with tempfile.TemporaryDirectory() as tmp:
            paths = Paths(Path(tmp))
            novel_text = ("Manastırın kilisesi avluya bakar; kule kapısının yanında "
                          "bir merdiven yukarı çıkar. ") * 3
            essay_text = ("Manastırın kütüphanesi ve kilisesi üstüne yazar şunları "
                          "söyler; avlu ve kule betimlenir. ") * 3
            paragraphs = [self._paragraph(i, novel_text, "BİRİNCİ GÜN")
                          for i in range(4)]
            paragraphs += [self._paragraph(4 + i, essay_text,
                                           "‘GÜLÜN ADI’ ÜZERİNE Umberto Eco")
                           for i in range(3)]
            write_jsonl(paths.normalized_jsonl, paragraphs)
            write_jsonl(paths.claims_jsonl, [])
            write_jsonl(paths.chunk_manifest, [])

            result = scan_missed(paths)
            indexes = {c["paragraph_index"] for c in result["candidates"]}
            self.assertTrue(indexes)
            self.assertTrue(all(i < 4 for i in indexes),
                            "paratext paragraphs must not become candidates")
            self.assertEqual(result["coverage"]["paratext_paragraphs"], 3)
            self.assertEqual(result["coverage"]["novel_paragraphs"], 4)

            result_all = scan_missed(paths, include_paratext=True)
            indexes_all = {c["paragraph_index"] for c in result_all["candidates"]}
            self.assertTrue(any(i >= 4 for i in indexes_all),
                            "--include-paratext must include the essay")
            self.assertEqual(result_all["coverage"]["paratext_paragraphs"], 3)


class ReportTests(unittest.TestCase):
    def test_reports_preserve_research_data_and_use_documentation_directory(self):
        from src.reporting.reports import generate_reports

        with tempfile.TemporaryDirectory() as tmp:
            paths = Paths(Path(tmp))
            write_jsonl(paths.claims_jsonl, [])
            paths.facts_json.write_text("[]\n", encoding="utf-8")
            before = {p.name: p.read_bytes() for p in paths.output.iterdir()}

            result = generate_reports(paths)

            self.assertEqual(len(result["reports"]), 11)
            for name in result["reports"]:
                self.assertTrue((paths.reports / name).is_file(), name)
            self.assertEqual(
                {p.name: p.read_bytes() for p in paths.output.iterdir()}, before
            )
            overview = (paths.reports / "ABBEY_OVERVIEW.md").read_text()
            self.assertIn("../output/claims.jsonl", overview)
            self.assertIn("../output/facts.json", overview)


class UtilTests(unittest.TestCase):
    def test_norm_key_turkish(self):
        self.assertEqual(norm_key("Kütüphane'nin"), "KUTUPHANE NIN")
        self.assertEqual(norm_key("AEDIFICIUM"), "AEDIFICIUM")

    def test_estimate_tokens_monotonic(self):
        self.assertLess(estimate_tokens("kısa metin"), estimate_tokens("uzun " * 100))


if __name__ == "__main__":
    unittest.main(verbosity=2)
