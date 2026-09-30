# Documentation

The active application is documented here. Start with the [project README](../README.md) to run it and the [exploration guide](EXPLORATION.md) for controls, locations and story routes.

## Development and evidence

| Document | Purpose |
|---|---|
| [Development](DEVELOPMENT.md) | Tests, debug tools, asset maintenance and repository boundaries |
| [Reconstruction](RECONSTRUCTION.md) | Book evidence, interpretation, dimensions and layout |
| [Provenance](provenance/) | Architecture, environment, people, vegetation and animals; BOOK / RECON / AMBIENT decisions |
| [Extraction pipeline](research/PIPELINE.md) | Regenerating the structured research and Markdown reports |
| [Book reports](research/book/ABBEY_OVERVIEW.md) | Extracted claims, spaces, routes, uncertainty and coverage |
| [Recorded audio sources](assets/AUDIO_SOURCES.md) | Authors, licences, edits and crop times for shipped audio |
| [Imported model sources](assets/MODEL_SOURCES.md) | Authors, licences and model conversion steps |

The bundled fonts include their original SIL Open Font License notices in [`assets/fonts/`](../assets/fonts/).

## Design and implementation history

The latest recorded implementation is the [30 September follow-up report](realism/NEXT_PASS_REPORT.md), including verification and remaining limits. Earlier audits and plans describe earlier builds; their defects should be checked against that report before starting new work.

| Document | Purpose |
|---|---|
| [Discovery and audio direction](design/DIRECTION.md) | Quiet observation, spatial learning, liturgy and sound placement |
| [Character visual bible](design/VISUAL_BIBLE.md) | Character descriptions and continuity constraints |
| [Follow-up report](realism/NEXT_PASS_REPORT.md) | Repairs, notebook, people, environment, audio and recorded checks |
| [Post-realism audit and verification](realism/RE_AUDIT.md) | Combined 29 September reviews and reproduction details |
| [Follow-up plan](realism/NEXT_PASS_PLAN.md) | Combined system decisions and ranked visual priorities |
| [Follow-up research](realism/NEXT_PASS_RESEARCH.md) | Candidate assets and references from the 29 September review |
| [First realism report](realism/REPORT.md) | Initial recorded audio and imported model implementation |
| [Initial visual audit](realism/VISUAL_REALISM_AUDIT.md) / [audio audit](realism/AUDIO_REALISM_AUDIT.md) | Baseline findings before those changes |
| [Initial asset research](realism/ASSET_RESEARCH.md) / [reference board](realism/REFERENCE_BOARD.md) | Original candidate and historical references |
| [Initial plan and inventory](archive/INITIAL_REALISM_PLAN.md) | Combined baseline transformation plan and generator inventory |
| [Implementation briefs](archive/IMPLEMENTATION_BRIEFS.md) | Original and follow-up task briefs, kept as historical context |
| [Previous reconstruction](archive/LEGACY.md) | Guide and evidence notes from the earlier version |

Comparison images and recordings remain beside the realism reports in `realism/shots/` and `realism/audio/`. Candidate prices and licence observations in research documents are dated research, not fresh checks.

All project Markdown lives under `docs/`, except the root entry-point README and the extraction CLI's required agent definition at `book_details/.opencode/agent/abbey-extractor.md`. Generated book reports remain separate because they cover different spaces and preserve claim references.
