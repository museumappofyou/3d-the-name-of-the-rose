# Follow-up realism plan — 29 September 2026

This combines the system decisions and ranked replacement priorities from the post-realism review. It is the input to the completed follow-up pass; consult [NEXT_PASS_REPORT.md](NEXT_PASS_REPORT.md) for the resulting behavior and outstanding work. [RE_AUDIT.md](RE_AUDIT.md) supplies the evidence and [NEXT_PASS_RESEARCH.md](NEXT_PASS_RESEARCH.md) records candidate sources.

## System decisions

This updates the **current** build, not the pre-asset reconstruction. Detailed severity and reasons are in `docs/realism/RE_AUDIT.md`.

| System or asset | Decision | Scope for the next pass |
|---|---|---|
| Abbey plan, exterior walls, Aedificium mass, church/cloister/chapter/service range layout | **KEEP** | Protect book-driven scale, routes and plan. Touch only local visible seams/sightlines. |
| Portal narrative composition and skull chapel | **POLISH** | Deepen/weather portal relief; preserve iconography **and evidence-led painted colours**. Manual skull activation/descent works. |
| Main doors, tested stairs, gates, curfew and mirror/ossuary routes | **KEEP** with local **POLISH** | Fresh 37 doors pass both directions; fix/diagnose R9 choir approach locally. No route redesign. |
| Forge floor/basement access and worker grounding | **REBUILD** local floor; **POLISH** placement | Remove the duplicate slab covering the stair hole; validate cells descent/ascent. Workers visibly sink into floor; use correct work anchors. Existing debug routes omit this basement. |
| Hospice/Abbot/cemetery walking entries | **REBUILD** hospice alignment; **POLISH** facing | Hospice spawn remains below newly raised upper floor. Use correct floor anchor; reframe wall-facing entries. |
| Character pool role/identity assignment | **REBUILD** assignment only | Never substitute permanently dressed layperson rigs for monk slots. Stabilize focal/named people before adding responses. Keep pool budget. |
| Scanned-head/procedural-body cast | **POLISH**, selective **REPLACE** | Fix head–neck–cowl and tonal joins first; replace only focal figures if construction still fails. |
| Animation and NPC staging | **POLISH** | Reduce duplicated faces/poses, better seated/hand/eye/foot activity, time-appropriate placement. |
| Sheep near folds | **REPLACE** | Trial textured animated sheep, preserve flock variation and LOD. |
| Goat | **POLISH** | Improve gait/anatomy; replace only with clear rights and convincing close result. |
| Horses, oxen, pigs, hens, other animals | **KEEP** with **POLISH** where seen | Fix horse sightline/contact/animation, not blanket model replacement. |
| Foreground granary/mill sacks | **REPLACE** | Irregular PBR sacks, believable pile/load/contact; distant cheap variants remain. |
| Mill mechanism, nearest refectory/kitchen furniture, infirmary beds/herbs, graves | **POLISH**, selective **REPLACE** | Prioritise player-facing focal props and lighting; leave room volumes intact. |
| Treasury hero relief and credence cloth | **REBUILD** relief; **POLISH** cloth | Verify the builder's Entombment identity against existing provenance before elaborating; replace blank slab with readable period form and convincing silver/cloth. |
| Winter ground, garden, deciduous trees, wall-base snow, paving and stained glass | **POLISH** | Weathered transitions/winter silhouettes; keep extraordinary blue glass. No global retiling. |
| Texture loading lifecycle | **POLISH** | Trace six startup missing-image update warnings; visual impact unestablished. |
| Library rooms, `UI.visited` drawing, map, folios, E hotspots | **KEEP** + **ADD** | Preserve mechanics. Add minimal persistent discovery journal and a few observed map annotations. |
| Canonical-hour clock, lamps, office population and Aedificium bars | **KEEP** + **POLISH** consumer agreement | Fix Terce/Nones phase versus office mismatch; keep excused scribes at work. At most one new time-sensitive observation. |
| Full source folios and teleport Index | **KEEP** + **POLISH** disclosure | Present observation before deliberate plot/source reveal; identify study jumps and do not award physical discoveries for them. |
| Clock/help layout during close inspection | **POLISH** | Reduce lower-object occlusion, maintain readable hints and easy clock access. |
| Audio engine, reverb, emitters, recorded Foley | **KEEP** | Ear-led mix/spatial checks, especially chant leakage and transitions. |
| Chant office selection | **REBUILD** selection only | Remove the Holy Saturday reading from routine November Matins; reduce repetitive reuse, document recording obligations. Keep audio-player architecture. |
| Continuous non-diegetic background music | **Do not ADD now** | Diegetic chant, work and silence should carry the abbey; reassess after mix. |
| Combat, quests, score, full mystery plot | **Do not ADD now** | Outside this stage. |

## Ranked visual priorities

Replace only where normal walking views expose an obvious style gap. Rank is for the **next** pass, not a blanket import plan. See `docs/realism/RE_AUDIT.md` for screenshots, locations and decisions; `docs/realism/NEXT_PASS_RESEARCH.md` for rights and candidates.

| Rank | Current object / view | Judgment | Why and replacement target |
|---|---|---|---|
| 1 | Scanned monk/worker heads on procedural necks and cowls; refectory, choir, garden | **Major polish; selective replacement** | The long rectangular neck and head/body material split are the largest immersion failure. Fix the shared construction first. If it cannot pass 2–5 m views, use a complete coherent rig for the nearest named/focal people, leaving corrected distant cast. A new face scan pasted onto the old body is not a solution. |
| 2 | White, faceted sheep and lambs in the folds | **Replace** | Strong silhouette but toy-like surface and wool. Trial the animated CC BY sheep below, tone and scale to this winter setting, and confirm browser rig/LOD. |
| 3 | Repeated low-poly wedge sacks in the mill/granary | **Replace foreground** | Obvious regular triangular props in a dark but important service route. Use one or two irregular scanned/PBR sacks with coarse distant variants; settle them on the floor in believable stacks. |
| 4 | Goat in the folds | **Major polish; replace if an appropriate rights-clear rig is found** | Angular anatomy and minimal four-leg gait still read as proxy. Do not use goat demos with contradictory personal-use terms. |
| 5 | Graves and crosses nearest cemetery path | **Replace a few / rebuild placement** | Thin repetitive crosses and smooth mounds need varied weathering and snow contact. Retain cheap distant markers; avoid importing an enormous scan without retopology. |
| 6 | Infirmary hanging herbs, foreground beds and bedside vessels | **Replace selected props** | Cone-like herbs and repeated hard beds make the ward look staged. A small number of better cloth/bundle props and asymmetry beats a full room rebuild. |
| 7 | Mill machinery and closest kitchen/refectory furniture | **Polish first; selective replacement** | Improve silhouettes, use, wear and placement. Source a low-cost table/barrel only if it clearly exceeds existing work in the same material language. |
| 8 | Portal relief figures/roundels | **Rebuild local relief, no full portal asset swap** | Existing composition is specific to the book. Real-world church asset would lose evidence; sculpt/deepen/weather current figures. |
| 9 | Garden edges, snowy paths and wall-base snow strips | **Material/geometry polish** | A tileable texture alone cannot fix straight boundaries. Blend dirt, packed snow, icy stone, footfall and accumulation using current ground system. |
| 10 | Winter orchard/gate approach deciduous trees | **Polish or selective replacement** | Some canopy looks leafy in late November. Bare silhouette and root contact matter more than high poly count. |
| 11 | Treasury's blank slab identified in the builder as silver Entombment; rigid white credence cloth | **Rebuild focal relief; polish cloth** | The intended hero object remains visibly a box. Verify its exact identity against existing provenance, then use period relief/material reference. The extraction checked supports the treasury/display structure but does not separately identify this relief; Cleveland's CC0 book reliquary is not an exact substitute. |

Before character replacement, fix the pool's role mismatch: only 20 monk rigs serve 36 full-office monk slots, and fallback does not redress. A whole-body trial using the CC0 MakeHuman base plus [Donitz robe variants](https://static.makehumancommunity.org/assets/assetpacks/suits02.html) is now a concrete free alternative. Keep distant corrected cast and imported motion if they pass; no full population replacement is justified yet.
