# Provenance — the next pass (repairs, people, props, sound, notebook)

Legend as in the other provenance files: **BOOK** = stated in the novel; **RECON** = a reconstruction
choice needed to make the text physically coherent; **AMBIENT** = plausible period detail the novel does
not state. `claim_00NNNN` = `book_details/output/claims.jsonl` (read, not re-extracted).

## Repairs

| Object / decision | Evidence | Class | Note |
|---|---|---|---|
| Hospice walking entry in William's cell on the raised guest floor (feet 6.2) | claim_000140–000144 (the cell, the niche), F2 floor raise (docs/provenance/arch-grounds.md) | RECON | `places.js` hospice `walk.y` was 4.2 (below the 6.2 floor). `spawnOf()` now also settles any upper-floor spawn on the floor built under it. Same fault fixed for the Abbot's upper hall (4.5 → 6.5). |
| Forge: one floor slab with the stair well cut; the flight between the two forges, down from the small north door, 5 m for 3.35 m; timber rail round the well; lamp at the foot | F7 cells beneath the smithy (c2017–c2021, c2248 k0931 H) | BOOK (cells) / RECON (stair position, rail, lamp) | The duplicate uncut slab from `building()` is gone (`floorMat: null`). Routes R29a/R29b walk it both ways. |
| Smiths at their anvils, grooms at a manger and in a stall, cooks at the hearth front and the oven mouth | claim_000513 (forges at work until Vespers), claim_000508 (horses at the mangers), claim_000359 (kitchen) | BOOK (activity) / RECON (exact stations) | The smith's hammer stroke is procedural (no hammering clip exists in the CC0 library); hammer, tongs, fork and paddle are simple hand props. |
| Terce and None as office phases in the horarium | claim_000635 (the office), First Day after None (scriptorium excused) | BOOK | Scriptorium and workshops keep working at the minor hours (`isDay()`). |
| R9 final waypoint round the east end of the north stalls | c0592 k1623 M (monks enter the choir from the north door) | RECON | Route data only. |

## The treasury's little temple

| Object | Evidence | Class | Note |
|---|---|---|---|
| "An elegant little temple with two columns of lapis lazuli and gold, framing an Entombment of Christ in thin silver in half relief; above it, on veined variegated porphyry, a cross inlaid with thirteen diamonds; its little base worked in agate and rubies in the shape of a scallop shell" | Novel text, Sixth Day, *Tansökümü* ("Yeraltı hazinesinin ziyaret edilişi…"): «Yarı kabartmalı ince gümüşten bir İsa'nın Gömülüşü'nü çevreleyen, lapis lazuli ve altından iki sütunlu zarif bir küçük tapınak gösterdi; üstünde, damarlı alaca somaki üstüne, on üç elmas kakmalı bir haç vardı; küçük altlığıysa akik ve yakutlarla tarak kabuğu biçiminde işlenmişti.» | BOOK | Not in the extracted claims (the extraction captured the treasury's structure, claim_002370–002374, but not this object); verified in the novel's text. The relief composition (mourners behind a sarcophagus, the body on the rim) is **RECON** after the usual Entombment type; the silver plaque, lapis columns, porphyry cross and scallop base follow the sentence above. |
| Credence cloths falling in irregular flutes | — | AMBIENT | `cloth.js drape()`: two wavelengths, deeper with the fall. |

## The notebook (`src/systems/notes.js`)

| Note | Trigger | Evidence | Class |
|---|---|---|---|
| Numbers in the catalogue | E at the catalogue on Malachi's desk | claim_000423 | BOOK (Adso's reading of the numbers) |
| … and the shelf labels | 5 s physically in the library after the catalogue note | claim_001153 | BOOK |
| Barred after supper | reaching a barred Aedificium door at night | claim_000173 | BOOK |
| … open by day | the same door by day, once the night note exists | claim_000173; the kitchen/refectory day population of the schedule | BOOK + RECON |
| Herbs kept ready | E in the laboratory, or Severinus's answer in the herb garden | claim_000309, claim_000303 | BOOK; Severinus's line is an authored paraphrase, not a quotation |
| Blood in the great jar | E at the jar | claim_000375, claim_000664 | BOOK (no deduction about the later death) |
| The way under the altar | the altar turned, the player seen beside it, then walking down the steps with no study jump in between | claim_001047; ROUTES.md CHAPEL → CRYPT via ALTAR_OPENING + STAIRCASE | BOOK |
| The red line "per ossuarium" on the plan | each point of the ossuary passage reached on foot after that descent | as above | BOOK |

Later-story text moved behind the folio's *Historia* disclosure: the baths (Berengar found drowned, Third
Day) and the blood jar (the man head-down in it, Second Day). The Index lists Finis Africae, the mirror, the
room of visions and the Burning under *Loca arcana*, shown on request.

## Sound

| Decision | Evidence | Class | Note |
|---|---|---|---|
| No Holy Saturday Lamentation at routine Matins; no *Veni Creator* at the ordinary hours | The novel's time is late November (editor's note; horarium.js) | RECON (liturgical judgement) | Both kept as source material only (docs/assets/AUDIO_SOURCES.md). |
| Chant direct in church/choir/skull chapel, through doors from porch, cloister, cemetery and narthex, scarcely from inside other buildings | claim_000635 etc. (the office is sung in choir) | RECON | `chant.occ` in emitters.js. |
| A quill's scratch as the notebook cue | — | AMBIENT | CC0 Quill and Parchment (Nickh69), already in the bank. |

## Surfaces, props and light

| Object / decision | Evidence | Class | Note |
|---|---|---|---|
| Flower-garden and chapter-garden hedges as clipped box under snow | Flower garden with hedged beds on the plan (claim of the plan key; places.js flower-garden) | BOOK (hedges) / RECON (form) | Sculpted runs (`sculpt.js hedgeRun`) with a procedural leaf texture. |
| Four focal graves by the cemetery entry (old leaning cross, worn stela, fresh grave sinking, settled slab) | "newly erected gravestones and old stones bearing the marks of time" (OTHER_BUILDINGS: CEMETERY) | BOOK (kinds) / RECON (these four) | Entry reframed toward the Aedificium tower and the oak at the edge (Second Day, Lauds: Benno behind the oak). |
| Stable hayracks raised above the horses' heads; two lanterns over the aisle | claim_002603, claim_002606 (horses behind the grille) | RECON / AMBIENT | So a head over the manger is seen from the grille and aisle. |
| Grain sacks slumped in piles; meal dust and a lamp at the mill; chaff in uneven drifts | claim_001714 (peasants with wheat and millet at the mill) | BOOK (sacks, grain) / AMBIENT (dust, lamp) | `sculpt.js sack()`. |
| Herb bunches hung to dry in the infirmary and kitchen | — | AMBIENT | Replaces the cone shapes. |
| Fleece shader on the sheep, coarse hair on the goats | claim_000373, claim_001706 | BOOK (animals) / AMBIENT (coat) | No UVs on the sheep: 3D noise in object space. |
| Winter crowns thinned; the cemetery oak keeps a few dead leaves | late November (horarium.js); the oak (Second Day, Lauds) | RECON / AMBIENT | Oaks are marcescent. |
| Trodden snow thinned on ground-level paving along paths; worn polish down the nave | — | AMBIENT | `weathering.js` (trodden mask); paths added through the old narthex and down the nave. |
| Wall-base drifts in banks with gaps, less on south faces | — | AMBIENT | |
| Portal carving weathered with the wall (soot under ledges, streaks, lichen), paint kept | "the cheerful softness of the colours" (places.js portal) | BOOK (paint) / AMBIENT (weathering) | |
| Stained glass: seedy/streaked glass, finer leads, saddle bars, grime at edges | extraordinary blue choir glass (places.js, CHURCH.md) | BOOK (colour kept) / AMBIENT (wear) | |
