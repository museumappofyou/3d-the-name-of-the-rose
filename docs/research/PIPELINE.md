# Abbey extraction pipeline — *Gülün Adı* (*The Name of the Rose*)

A standalone, resumable Python pipeline that reads the **entire** novel and
extracts every detail it gives about the abbey: buildings, rooms, architecture,
geometry, materials, relative positions, circulation, access rules, visibility,
function, sensory environment, and character movement.

The output is structured factual data (claims, facts, graphs, constraints) plus
human-readable reports — never a re-publication of the novel's prose. Evidence
fragments are capped at ~300 characters.

## How it works

1. **scan** — locate the `.epub`/`.pdf`/`.txt` in the repo root, ingest it with
   paragraph/page/anchor traceability, write `data/book_normalized.jsonl`, then
   chunk the *whole* book sequentially (default ~3500 tokens per chunk, ~600
   tokens overlap, paragraphs never split). Every paragraph is covered.
2. **extract** — for every chunk, call an LLM with a strict JSON schema and
   extract atomic claims (categories A–M of the task brief). Low temperature,
   structured JSON, schema validation, salvage of truncated JSON, retries,
   per-chunk cache (`cache/extraction/chunk_XXXX.json`). A failed chunk is
   recorded in `chunk_XXXX.FAILED.json` and never silently skipped.
3. **consolidate** — entity alias normalization (second LLM pass over the full
   entity inventory, conservative: uncertain merges go to a separate file),
   deduplication with all supporting sources preserved, contradiction
   detection + adjudication, and machine-readable graphs (spatial, movement,
   visibility, access), containment hierarchy and reconstruction constraints.
4. **verify** — lexical retrieval over the whole novel (all entity aliases +
   Turkish relation/movement vocabulary) to find paragraphs with spatial
   content that no claim cites; those candidates are fed back through the same
   extraction rules as a verification pass. Paratext (Eco's essay, postscript,
   endnotes) is excluded unless `--include-paratext` is given.
5. **report** — Markdown reports in `docs/research/book/` (from the repository root) referencing claim IDs.

## Requirements

- Python 3.10+ (stdlib only — no third-party packages required)
- Default LLM backend: the local [`opencode`](https://opencode.ai) CLI
  (`opencode-cli`). It authenticates with your opencode account; no secrets are
  stored in this repo.
- Optional: `pdftotext` (poppler) if you feed it a PDF instead of an EPUB.

## Usage

Run these commands from `book_details/` (`cd book_details` from the repository root). Supply your own local source book with `--source PATH`; source books are excluded from Git.

```bash
python3 main.py all                     # scan -> extract -> consolidate -> verify -> report
python3 main.py scan                    # ingest + chunk only
python3 main.py extract                 # resumable; skips cached chunks
python3 main.py extract --force         # re-extract everything
python3 main.py consolidate             # dedupe / aliases / graphs / hierarchy
python3 main.py verify                  # lexical coverage audit + candidate re-extraction
python3 main.py report                  # regenerate Markdown reports
python3 main.py status                  # current pipeline state
```

Useful flags:

```
--source PATH            explicit book file
--model PROVIDER/MODEL   extraction model       (default opencode-go/deepseek-v4.1-flash)
--consolidation-model M  consolidation model    (same default)
--backend opencode-cli | openai-compatible
--chunk-size 3500 --overlap 600
--max-concurrency 3
--force                  ignore caches
--limit N                only the first N chunks (debug)
--include-paratext       also process front/back matter (e.g. Eco's essay)
--no-llm                 consolidation without LLM calls
--no-verify-extraction   verification: audit only, no re-extraction
```

The OpenAI-compatible backend reads the endpoint from `OPENCODE_ZEN_BASE_URL`
(default `https://opencode.ai/zen/v1`) and the key from `OPENCODE_ZEN_API_KEY`
(or the local opencode auth store). Never commit keys.

## Layout

The structured `output/` data and reviewed alias/coverage records are tracked. Full normalized text, chunks, extraction caches, usage logs and verification candidates stay local. With a custom `--root`, Markdown is written to that root's `reports/` folder.

```
data/     book_normalized.jsonl, chunks/, chunk_manifest.jsonl, entity_aliases.json, ...
cache/    extraction/chunk_XXXX.json  (+ .FAILED.json), extraction_verify/, consolidation/
output/   claims.jsonl, facts.json, *_graph.json, abbey_hierarchy.json,
          reconstruction_constraints.json
../docs/research/book/  generated Markdown reports
analysis/ contradictions.json, verification_candidates.jsonl, verification_coverage.json
tests/    unittest suite (python3 -m unittest discover -s tests)
```

## Epistemic rules

- Only the novel is used. No outside knowledge about medieval monasteries,
  film/TV adaptations, Wikipedia, maps or fan reconstructions.
- Qualitative descriptions are never converted into fake measurements.
- Every claim carries a certainty level: `EXPLICIT`, `STRONG_INFERENCE`,
  `WEAK_INFERENCE`, `AMBIGUOUS`.
- Unresolvable references go to `data/unresolved_references.json` — never
  guessed.
- Temporary states (night, fire, weather, opened doors) are flagged as
  `temporal_state`, not treated as permanent architecture.
- Contradictions are reported, not resolved.

## Tests

```bash
python3 -m unittest discover -s tests -v
```

Covers EPUB/TXT ingestion, chunk coverage (every paragraph covered, overlap
present, processed + failed + pending == total), schema validation, truncated
JSON salvage, failed-chunk recovery, deduplication, alias normalization,
uncertain-merge handling and graph edge generation.
