# Assets, evidence and provenance

This page explains ownership, licences, reconstruction limits and safe regeneration. Detailed inventories, attribution/crop records and reconstruction rows remain machine-readable. No blanket project licence has been assigned to the novel, plan or every asset merely because some components are CC0.

## Where the authoritative records live

| Record | Use |
|---|---|
| `book_details/output/` | Nine literary evidence files: original claims, facts, hierarchy, four graphs, constraints and summary |
| `book_details/data/entity_aliases.json`, `possible_entity_merges.json`, `unresolved_references.json` | Reviewed identity/uncertainty decisions; ambiguous references are not silently merged |
| `book_details/analysis/` | Contradiction and coverage results; full-text retrieval candidates stay local |
| `shared/provenance/reconstruction-decisions.json` | Legacy geometry/population/environment decisions with original claim/constraint notation and mixed classifications |
| `shared/provenance/character-design-notes.json` | Historical character notes, labelled unverified design input rather than self-declared canon |
| `shared/provenance/model-sources.json` | Model/component authors, source links, licence terms and conversion recipes, including legacy assets |
| `shared/assets/credits.json` | Curated in-app attribution; credit regeneration preserves current non-audio groups |
| `scripts/audio/sources.json`, `extra_sources.json`, `cuts.json` | Recording authors/licences/URLs, source crop windows and intake records |
| `shared/assets/audio/manifest.json` | Web sprite crop offsets/playback durations; not full source files |
| `shared/data/manifests/{people,world,audio}_derivatives.json`, `phase1_manifest.json` | Source/output hashes, transformations, native asset census and runtime provenance |
| `shared/data/manifests/toolchain.json` | Engine/download checksum pins and tool versions |
| `docs/evidence/asset_inventory_2026-10-01.json` | Frozen pre-migration inventory, including local master availability and duplicate bytes; paths describe the old tree |

To inspect current assets, run `python3 scripts/migration/inventory.py`; the result goes to ignored `shared/provenance/asset-inventory.local.json`. Do not repeatedly commit machine-local paths/tool installations as an authoritative inventory. The current build manifest verifies 339 outputs independently of private sources (the frozen proof had 154). Day-1A world/animal derivatives have separate manifests; thirteen native people now have fitted pose/normal checks. This verifies conversion, not final close-character art approval.

Content classes and in-world claim reliability are defined in `GAME_DESIGN.md`. Original investigations may reference architectural evidence but never insert their invented events into literary extraction. Public runtime content drops evidence fragments. Developers use claim IDs and the corpus hash to trace an assertion, not a long copy of the novel in documentation.

## Literary research qualifications

The source is the Turkish edition translated by Şadan Karadeniz (Can, 1999) and its printed plan. The extraction traversed 126 chunks; the existing report records 3114 raw claims (2994 primary +120 verification), 2799 facts, 234 entities and 208 unresolved references. Verification covered 2300/2885 non-paratext paragraphs with at least one claim (~79.7%); this is a retrieval/coverage measure, not proof that every statement is correctly extracted or every paragraph needed a spatial claim. The nine output files remain byte-identical to the Phase-1 checkpoint.

Generated `book_details/reports/ROUTES.md` and its ten companions are optional reading views, rebuilt by `python3 main.py report` from `book_details/`. They are ignored and unnecessary for a checkout/build. A reference to ROUTES.md denotes a generated reading view over movement evidence, not a separate authoritative source. Short evidence fragments and citations remain structured research; the runtime does not serve the corpus.

Absolute scale (0.42 m per plan pixel), detailed storey heights, unmentioned openings and exact routine timings are reconstruction decisions. The reference architecture also contains literary secrets and late-novel structures. Preserve the distinction between an explicit claim, inference, historical plausibility and original content when choosing a public/spoiler-safe export.

## Current people and retained masters

The browser cast has 30 stable designed identities: 15 brothers/novices (five named literary people) and 15 lay men. A presentation pool can display up to 46, but that is not 46 stable simulated people. Body proportions/dress/roles are in `scripts/people/cast.json`; generated geometry/metrics are in `shared/assets/models/people/cast.json`. Model front is +Z, units metres.

Bodies, system eyes/brows/skin/hair use MakeHuman/MPFB export assets (CC0). Donitz robe/hood, Rehman Polanski clothing and the listed packs/components retain their individual notices. Punkduck medieval boots and Elvaerwyn apron are **CC BY with version unspecified in the pack**; do not silently upgrade that to a known licence version. All applicable authors and modifications remain in model records and in-app credits. Animation sources include Mesh2Motion/Quaternius/CMU plus project-authored task curves; use the exact source notice rather than inferring rights from format conversion.

The cast uses one 53-joint skeleton per person, fitted clothing, nine brother/eight lay tasks where applicable (255 fitted clips in `tasks.glb`), 15 lowered hoods with named `bendDrape` targets and no runtime cloth solver. Shared-skin and hood tests check bounded pose/vertex/contact samples, not all furniture/self-collisions. The prior hood review sampled 225 poses/16,887 rays, retaining 255 other parts; those data survive in historical browser evidence.

**Known defect:** `cast.glb` normals on seven parts were lost during the shared-skin conversion’s normalized-integer normal transform. Native normalized derivatives restore the authored split normals; browser cast still requires a separate validated repair. Do not rerun the old shared-skin packing and expect repaired normals. Topology/indices, inverse binds, weights and fitted motions must be preserved or explicitly revalidated.

| Local path | Why it must survive |
|---|---|
| `.local/mh/cast-round3.glb` | Index-aligned authored normal source for native normalization; hash recorded per restored part |
| `.local/mh/cast-before-hood-fit.glb`, `cast-hood-fit.glb`, `cast-shared.glb`, `prev/` | Reversible shared-bind/hood comparisons and earlier derivatives |
| `.local/mh/out/`, `rebuild-sixth/`, `.blend` files, source packs | Authored bodies/tasks, clothing fitting and rebuild inputs; availability does not imply redistribution approval |
| `.local/animals/src/`, `work/` | Original animals, texture work and Blender inputs |
| `.local/tools/` | Local Godot/Blender/MPFB installations and downloaded checksum-verified packages; reproducible tools, not asset masters |
| `.local/migration-checkpoint-2026-10-01/` | Git bundle, binary diff, dirty-file manifest and working-tree delta |
| `.local/migration-checkpoint-phase1-start/` | Dirty-file and book-evidence hashes used to separate phase provenance |
| `.local/agent-b-audit/` | This mission’s starting diff/hash/document snapshot and retired duplicate visual experiments |
| `VISUAL_BIBLE.txt` | Externally modified working reference; untouched, ignored, not promoted to canonical descriptions |

None of these directories was pruned. An ignore rule prevents accidental tracking; it does not create a durable backup. Routine native import/export now works from committed derivatives without them. **Full asset authoring remains dependent on retained masters and licensed source packs**; establish a backed-up, checksum-verified source store before replacing them or moving development machines.

## Animals, textures, fonts and plan

The current horse derivative uses Lyndon Daniels/ChadM’s CC0 rigged horse source, a new project rig and restrained planted-hoof animation. Pig by BojanBabic/bokadigimon and sheep by hendrikReyneke are CC BY 4.0, with source metadata retained; a dead source web page does not grant a different licence. Quaternius farm animals are CC0; Google Poly hen/rooster/goat assets are CC BY 3.0. Detailed source URLs, normalizations, simplification, texture/rig modifications and old derivatives remain in model records.

Retain older animation/head/low-detail animal files that conversion tools still use; “not loaded by today’s renderer” is not enough to delete a source. The retired procedural garment implementation was already tracked historically and is also retained locally. It is no longer active repository code.

Poly Haven PBR maps use CC0 source scans. Native captures semantic material keys, reconstructs shader-specific appearance and keeps independently importable textures/fields. Per-person texture files may duplicate image bytes but are referenced by imported resources; deduplicating them safely needs an import/material validation pass, not indiscriminate deletion.

Fonts retain their SIL OFL notices beside browser/native derivatives. Godot imports the committed WOFF2 files; an unnecessary TTF conversion was avoided. Vendored Three.js, exporter and three-mesh-bvh notices remain with their code. `plan.png`, the novel/title relationship and source research are not assigned a redistribution licence by this audit; public product packaging must make an explicit decision about approved plan/content derivatives.

## Audio and supplied music

Normal ambience/foley uses recordings with source notices, principally CC0 Freesound. Three chant excerpts use CC BY-SA 3.0; their trimmed/levelled adaptations retain that licence and attribution. Playback timing is distinct from authorship. The native proof uses one unchanged streamed *Deus in adjutorium* recording, streamed wind, individual cropped steps and a creak; all source/output windows and hashes are recorded.

The browser’s November office selection excludes the Holy Saturday lesson and Pentecost hymn from routine offices; those files are retained as source material, not newly justified by sounding suitable. Office playback rests between pieces/cycles and must not restart when the listener crosses a doorway. Recorded chant already contains a room; adding heavy algorithmic reverb requires listening, not assumption.

Private supplied originals remain in ignored `music/`. Full-length reduced-level listening derivatives stay local under `shared/assets/audio/music/`; no phrase edits, loops, placement or distribution approval is inferred. The public static build and native PCK exclude them. Dev-only `/assets/audio/music/audition.html` can audition them on this machine. Existing candidate measurement metadata is preserved under `docs/evidence/browser-baseline/`; it is not a substitute for listening.

`python3 scripts/audio/sources_manifest.py` produces an optional local attribution/crop view instead of regenerating another long Markdown page. `python3 scripts/credits.py` refreshes audio credits and retains curated people/animal/texture groups. Audio-bank reconstruction requires ffmpeg, NumPy and the original recordings; normal playback/builds do not.

## Intake and regeneration

Keep source and derivative separate, record checksum/author/URL/licence and transformations, and confirm metric scale/orientation/material semantics before integration. Do not overwrite a master. Do not clear a local candidate for shipment merely because it imports. Asset replacement should solve a demonstrated close-view or production problem and preserve provenance and performance budgets.

Use `pack_people.mjs --out DIR` for a private rebuild; a lowered-hood conversion must start from the preserved pre-conversion input, never an already fitted output. `check_shared_cast.mjs` and `check_hood_fit.mjs` compare against that input. Native normalization restores only defective, topology-aligned parts; it fails when the required master or correspondence is absent.

Raw browser export GLBs/images/height fields duplicate selected native assets and stay in ignored `shared/data/export/`. Keep section rules and census tracked. The normal build verifies committed output hashes; deliberate regeneration requires Chrome, pinned migration dependencies and the retained normal master. Engine-specific packages/caches belong in ignored build locations. Do not create a Markdown archive of every authoring experiment.
