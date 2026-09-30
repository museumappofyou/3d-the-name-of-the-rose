# Next pass: a believable, lightly interactive abbey (30 September 2026)

This pass followed `docs/archive/IMPLEMENTATION_BRIEFS.md` after Agent B's audit. It repairs the confirmed technical faults, then reworks
the people, several props and surfaces, the office chant, and adds a small observation notebook. The extraction in
`book_details/output` was read, not re-run. Screenshots are in [`shots/next/`](shots/next) and were taken at player height in the
running app with headless Chrome (ANGLE/Metal, 1280×720). Provenance for new book-derived work is in
[`docs/provenance/next-pass.md`](../provenance/next-pass.md).

**Verification at the end of the pass:** `npm test` 9/9. `__audit.routes()` **34/34**: the 32 earlier routes (R9 now passes)
plus the new forge-cell routes R29a/R29b. `__audit.doors()` **37/37 tested doors pass in both directions**; the stable grille and
henhouse hatch are skipped on purpose. There were no console errors and no texture-update warnings during the final audit
session.

**Limit up front:** I could not listen to the audio. The sound work was checked by routing inspection and by measuring the
master output with an analyser node. No ear-led mix review has been done yet (see §4).

## 1. Technical repairs

| Problem (audit) | What was wrong | Result | Checked by |
|---|---|---|---|
| Hospice entry below the raised floor | `places.js` `walk.y` 4.2 against a floor top of 6.2 | Entry now lands in William's cell, facing the table and the east window (`hospice_entry_william_cell.jpg`). `spawnOf()` also settles any upper-floor spawn on the floor built beneath it, so a future floor change cannot strand the feet. **Same fault found and fixed at the Abbot's hall** (4.5 against 6.5; before, it fell to the ground floor). Upper-zone threshold raised to 5 m. | URL/Index/Walk here all use `spawnOf()`. Feet read 6.20 in zone `hospice-cell`. The outside-stair routes R2/R3 still pass. |
| Forge basement covered by a duplicate floor | `building()` laid a solid slab and `smithyBasement()` laid a second, holed one | One slab with a cut well. The flight runs between the two forges, straight in from the small north door: 5 m for 3.35 m (≈34°; it was 3 m, ≈48°). A timber rail guards the open sides, a lamp hangs at the foot, and the vault is split round the well. A leak was also fixed: snowy terrain had shown as a band along the foot of the cellar walls, because the sink's ramp began inside the walls (`forge_*`). | New routes R29a/R29b (down to the cells and back out) pass. Leak rays in the forge escape only through its open doorways. |
| Forge workers sunk in the floor, hammering air | Smiths were an outdoor scatter resolved against the terrain | Each smith stands at his anvil on the built floor. A procedural stroke is laid over a standing clip (the CC0 library has no hammering; `chop` is a sideways tree-felling swing): the arm rises to head height and strikes the anvil, and the tongs hold the work. The blow sound plays on the strike frame (`forge_smith_anvil.jpg`, `forge_hammer_stroke_sheet.jpg`). | Visual. Bone-layer bug found and fixed: three's PropertyMixer rewrites a bone only when its clip value changes, so on still tracks the additive rotations piled up frame after frame. The layer now restores its bones before each mixer update. |
| Stable worker facing a wall; kitchen hands | Random facing; cooks placed at the hearth/oven centres | One groom works at Brunellus's manger, another beds down a stall, both facing the horses. The cooks stand before the hearth, stirring a pot, and at the oven mouth. Before, one stood inside the fire and one inside the oven masonry (`kitchen_cooks_hearth_oven.jpg`, `stable_aisle_brunellus.jpg`). | Visual. |
| 20 monk rigs for 36 choir slots; fallback redressed nothing | `recycle()` took "any free rig" | Pools are per dress (monk 40, novice 6, servant 10, herd 4, peasant 4). A slot with no rig of its dress stays empty; a wrong habit is never used. Seats keep last cycle's person (stable identity). New assignments prefer hidden rigs and faces unlike the neighbours'. Named people have their own rig and face: the Abbot, Malachi, Ubertino, Alinardo, Severinus. Rigs are created lazily. | `ctx.people.stats` at Vespers: 44 wanted, 44 drawn, none short. |
| Terce/None: chant without choir | `phaseAt()` returned `work` inside those offices | Terce and None are office phases. At 9.05, 12.0, 14.55 and 16.6 the clock, the choir group (10 monks at the minor hours, 36 + 6 novices at Vespers) and the chant agree, while the scriptorium's 26 scribes keep working at the minor hours. Also fixed: Matins always chose "prostrate", because the pose was keyed to the phase start, not the time. | Schedule dump at the four hours; audio probe (§4). |
| R9 stopped in the choir | The last leg cut diagonally through the east end of the north stalls (collider x 41.62, z −7.1…−7.45) | Two waypoints round the stall end. Door and aisle unchanged. | 3/3 repeat runs and the full suite pass. |
| Six texture-update warnings | `Texture.copy()` in three r180 sets `needsUpdate` itself, so every `scaled()` copy of a texture still downloading was flagged with no image | Copies reset their version and are marked for upload from the loader's callback. | Reproduced with delayed texture downloads: 183–412 warnings before, **0 after**. The textures still appear once they arrive. |
| (found in passing) Novices' house door blocked | A bed stood in the slot just inside the door. Tiny terrain changes tipped the audit bot into it | The door slot is kept clear, as the lodgings already did. | Door audit. |

## 2. What changed visibly

### People (the main priority)

- **Neck, collar and hood.** The habit's neckline key had been placed *below* its shoulder key, so the tunic ended in a flat
  40 cm ring with a long bare neck standing out of it. The male_6 scan's neck joint also sits 9 cm above its shoulders. Now:
  - the collar closes round the base of the neck, the shoulders slope, and a rolled edge (or the cowl, hood down) hides the join;
  - the generated neck starts under the collar and darkens where the cloth shades it;
  - hoods are fitted to each scan's measured crown and chin: no hair through the peak, and no strip of neck in the face opening.
  - See `monks_hood_down_front_side_back.jpg` and `monks_hood_up_front_side_back.jpg` against `../monk_tonsure_*.jpg`.
- **Material.** Each person has their own skin tint and wool shade. A raised hood shades the face (×0.7). Skin is less glossy.
  The habit is a sheen cloth, so black wool shows its folds against snow or lamplight instead of reading as a flat hole.
- **Hands.** The brothers' long sleeves come down over the heel of the hand. That hides most of the thin scanned hands in the
  folded-arm and seated poses.
- **Poses and variety.** Diners at supper vary between sitting, bowing the head over the bowl (a head-only composite) and
  hands in the sleeves. The choir mixes folded arms with listening. Heads are dealt round each pool, and assignment avoids
  the same face within 3.4 m. The reader reads, and the smiths, grooms and cooks work with a tool in hand.
- **Whole-body character trial: not done.** MakeHuman body + Donitz robes need MakeHuman or Blender to fit, weight and export;
  neither is installed here. After the fixes above the existing construction passes at 2–5 m in the views I checked
  (`refectory_supper_17_3.jpg`, `choir_vespers.jpg`). Close up, the scanned faces are still low-resolution and some smile.

### Animals and service props

- **Sheep and goats:** a UV-free fleece shader (3D noise in object space: soft clumps under curled locks, darker crevices, a
  greasy dirtier underside). Sheep read as wool rather than white facets at fold distance (`folds_sheep_fleece.jpg`). The heads
  are still the low-poly Quaternius shapes. **The CC BY animated sheep was not trialled:** Sketchfab's download API returns 401
  without a logged-in token.
- **Horses:** the hayracks now sit above the horses' heads, so heads over the mangers show from the grille and the aisle. Two
  lanterns over the aisle give side light. The grille entry now faces the grille squarely (`stable_grille_entry.jpg`).
- **Sacks:** sculpted grain sacks (rounded body fuller at the base, slumped shoulders, tied or folded mouth, creases, lean) in
  brown sacking, slumped against each other with a couple laid across or flopped on the floor (`granary_sacks.jpg`). The
  Sketchfab scans were not used, for the same login reason.
- **Mill:** a lamp over the bin, meal dust on the stone case and floor, and chaff in uneven drifts instead of one square mat (`mill.jpg`).
- **Treasury:** the "silver Entombment" was checked against the novel's own text. The extracted claims do not contain it, but
  Sixth Day, *Tansökümü* describes it exactly, and that sentence is quoted in the provenance file. The blank slab is now the
  little temple: a silver half-relief Entombment carved procedurally (mourners over the sarcophagus, the body on its rim),
  two lapis-and-gold columns, a pediment, the porphyry panel with its cross of thirteen stones, and the agate-and-ruby scallop
  base. The credence cloths fall in irregular flutes (`treasury_little_temple.jpg` vs `treasury_before.jpg`).
- **Infirmary and kitchen herbs:** bunches hung head-down to dry, with ties, drooping stems and shrivelled leaves, replacing
  the green cones (`infirmary_herbs_after_before.jpg`).

### Environment and thresholds

- **Hedges:** the flower-garden and chapter-garden hedges are sculpted clipped box under snow with a leaf texture, instead of
  flat green boxes (`flower_garden_hedges_after_before.jpg`). The rubble walls' old-plaster patches lost their hard,
  camouflage-like edges.
- **Snow and ground:**
  - foot traffic thins snow on ground-level paving along paths; the chapter courtyard now has a worn strip from door to old portal;
  - wall-base drifts lie in banks with gaps and melt back on south faces;
  - garden beds get trodden earth at their ends and dead stems in their margins;
  - the nave's paving is polished along the line of use (`chapter_threshold_after_before.jpg`, `nave_floor_glass_after_before.jpg`).
  - Poly Haven Snow 03 and Brown Mud 03 were checked (CC0, downloadable) but not needed: the transitions were a masking
    problem, not a texture problem.
- **Winter crowns:** elm and oak crowns are thinner (fewer, smaller twig cards). The cemetery oak keeps a few dead leaves, as
  oaks do (`winter_crowns_before_after.jpg`).
- **Cemetery:** the entry now looks across four distinct graves to the Aedificium's tower and the oak at the edge:
  - an old stone cross, leaning and sunk;
  - a worn stela;
  - a fresh grave, its earth humped and beginning to sink under uneven snow;
  - a slab settled at one end, snow in its incised cross.
  - See `cemetery_entry.jpg` vs `cemetery_entry_before.jpg`.
- **Portal:** the tympanum materials now weather with the wall (streaks, soot lodged under ledges and figures, lichen). The
  paint is kept. The elders sit in darker hollows but keep their repeated poses (`portal_weathered_after_before.jpg`).
- **Glass:** seedy, streaked glass, finer leads, saddle bars and grime at the edges and foot. The blues are kept.
- **Entries:** the scriptorium entry now stands behind a scribe at a desk under a great window, the next desks along the wall
  (`scriptorium_entry.jpg`). The Abbot's hall and hospice entries are fixed as above.

## 3. The observation notebook

| Note | When it is written | Evidence |
|---|---|---|
| Numbers in the catalogue | <kbd>E</kbd> at the catalogue. Later, after 5 s actually in the library, the line about the shelf labels is added | claim_000423; claim_001153 |
| Barred after supper | reaching a barred Aedificium door at night. The line "open by day" is added at the same door by day (the one observation that changes with the hour) | claim_000173 |
| Herbs kept ready | <kbd>E</kbd> in the laboratory, **or** Severinus's single spoken answer in the herb garden, where the schedule puts him by day | claim_000309, claim_000303 (the answer is an authored paraphrase) |
| Blood in the great jar | <kbd>E</kbd> at the jar: service work only, no deduction | claim_000375, claim_000664 |
| The way under the altar | the altar turned, the player seen standing beside it, then walking down the steps with **no study jump in between**. From there, each point of the passage reached on foot extends the red dashed *per ossuarium* line on the plan and the small map | claim_001047; ROUTES.md |

- The page reuses the folio: place, what was seen, and a line of reading only where the book supports one. Evidence IDs are
  kept in the data (and as `data-evidence` on the elements), not shown. There are no points, counts or percentages.
- The first time a note is written, a vellum slip slides in at the left margin for 4 s, with a quill's quiet scratch if sound
  is on. A small gold dot stays on the notebook seal until it is opened.
- Notes, library rooms walked and the route line persist in `localStorage`. A second inspection does not cue again.
- **Tested:**
  - all five notes and both follow-on lines, each triggered in the running app;
  - persistence across reload, and no repeat cue;
  - opening the altar and then jumping by the Index into the ossuary awards nothing; walking down awards the note and the line.
- **Disclosure:**
  - the baths and blood-jar folios describe what is visible now; Berengar's death and the man in the jar wait behind a
    *Historia* line that must be opened;
  - the Index says it is study navigation;
  - Finis Africae, the mirror, the room of visions and the Burning are listed under *Loca arcana*, shown only on request;
  - a jump made while walking says it is a study jump.
- **HUD:** the clock sinks and fades while something low and near is being inspected (hover brings it back). The key help keeps
  a soft dark band behind it and fades only to 62%. A one-time "It is dark here. F lights the lantern." appears on entering the
  library, ossuary, crypt, secret stair or cells (and night interiors) with no light. It is timed after the library's own night
  warning and not repeated for 4 minutes. The lantern light is held lower, a little ahead and more central, with a longer,
  softer falloff.

## 4. Sound

- **Offices:** *Deus in adjutorium* opens every office; Sant'Antimo psalmody at Matins, Lauds, Vespers and Compline; the
  *Magnificat* only at Vespers.
  - Not sung: the Holy Saturday Lamentation (wrong season: Matins lessons are silent) and *Veni Creator* (a Pentecost hymn).
    Both remain source material only.
  - Once an hour's pieces have been sung, 45–95 s of silence pass before any voice rises again. Each phrase fades in and out,
    the office swells in, and when it ends the last phrase dies away.
  - Records updated: `docs/assets/AUDIO_SOURCES.md` (new section, generated by `scripts/audio/sources_md.py`) and the Credits folio
    (`scripts/credits.py`). BY-SA credits and share-alike treatment are unchanged.
- **Where it is heard:** directly in church, choir and skull chapel; through the doors from the porch (clearest); muffled from
  the cloister walk, cemetery and old narthex; scarcely at all from inside any other building. Two routing faults were found
  and fixed:
  - the scriptorium counted as "outdoors", because the audio's indoor value was the eye-adaptation factor (0.45 there);
  - the choir's steep falloff made the west end of the nave no louder than the cemetery.
- **Measured** (master RMS; chant path gain and low-pass at the listener; 3 s windows after 4.5 s):

| Where, hour | Chant | Path gain / LPF | Master RMS |
|---|---|---|---|
| Choir, Terce 9.05 / Sext 12.0 / None 14.55 / Vespers 16.6 | singing | 0.90 / open | −29 / −26 / −23 / −27 dBFS |
| Cemetery, Vespers | singing, muffled | 0.41 / 980 Hz | −31.6 dBFS |
| West porch, Vespers | singing, through the door | 0.62 / 2.2 kHz | −33.5 dBFS |
| Kitchen, Vespers | effectively silent | 0.02 / 420 Hz | −48.4 dBFS |
| Scriptorium, Terce | effectively silent | 0.02 / 420 Hz | −35.9 dBFS (its own quills and pages) |
| Ossuary / library, Matins 2.9 | effectively silent | 0.02 / 420 Hz | −47.3 / −55.9 dBFS |

- The sound toggle fades the master and suspends the context. No permanent soundtrack, fanfare or cue music was added.
  Vrymaa's optional lamento was not trialled; the diegetic chant and silence were judged enough for this step.
- **Not done:** an ear-led listening walk. The numbers above show that routing and levels do what was intended. They do not
  judge tone, room tails or how transitions feel. Someone should listen in the church, cloister, cemetery, kitchen →
  ossuary, stable, scriptorium and library at office and non-office hours before the mix is called finished.

## 5. Performance

Same method as the earlier report: 40 update+render frames per view, GPU-synced with `gl.finish()`; calls and triangles over
all passes, shadows included. The untouched build (a copy of `src/` taken before this pass) and the final build were
measured back to back, twice each, with no other page rendering. The "before" calls and triangles reproduce the earlier
report's "now" column exactly.

| View | Calls before → now | Triangles before → now | Frame ms before (2 runs) → now (2 runs) |
|---|---|---|---|
| Stables 14h | 1678 → 1824 | 4.58 M → 5.65 M | 16.6 / 13.7 → 17.2 / 16.1 |
| Nave 10:30 | 1331 → 1493 | 7.44 M → 8.59 M | 13.2 / 11.0 → 14.1 / 14.2 |
| Scriptorium 15:12 | 1909 → 2055 | 7.52 M → 8.18 M | 17.2 / 14.0 → 18.9 / 16.4 |
| Cemetery 14h | 2076 → 2153 | 8.70 M → 9.69 M | 19.0 / 17.1 → 19.7 / 19.3 |
| Ossuary 21h | 1567 → 1583 | 7.23 M → 7.30 M | 12.4 / 10.8 → 11.9 / 10.0 |
| Infirmary 14h | 668 → 792 | 4.22 M → 4.95 M | 9.8 / 8.8 → 9.6 / 8.0 |
| Road 12h | 472 → 516 | 3.27 M → 3.33 M | 10.1 / 7.8 → 9.4 / 7.4 |
| Cloister 12h | 1086 → 1234 | 6.21 M → 7.36 M | 11.1 / 11.0 → 13.3 / 10.0 |
| Library 23h | 1391 → 1405 | 4.97 M → 4.78 M | 12.4 / 10.5 → 11.3 / 11.1 |
| Refectory 18:12 | 1532 → 1536 | 5.69 M → 5.86 M | 13.7 / 15.8 → 15.3 / 14.6 |

- Frame time changed by −1.5 to +2.5 ms per view, inside a run-to-run spread of 2–3 ms.
- JS heap is ≈ 560 → ≈ 565 MB. GPU textures 511 → 564 (relief, leaf, stone and per-head maps). Load to interactive 7.1 → 7.3 s.
- The extra triangles are mostly the new sacks, hedges and garden margins, drawn in several passes. Visible people's
  triangles are unchanged (356 k → 360 k). After a first measurement, sack and hedge tessellation were reduced, interior sack
  piles no longer cast shadows, and rigs are now created on first need instead of 73 at startup.

## 6. What I checked by sight

Player-height views, before and after where useful:

- hospice cell and Abbot's hall entries;
- forge hall, stair well, the cells and the view back up;
- smiths, grooms, cooks;
- the refectory at 17.3; the choir at Vespers and Matins;
- the garden, flower garden, folds, stable grille and aisle, mill and granary;
- the cemetery, portal, treasury, infirmary, chapter threshold, nave and glass, scriptorium;
- the library and ossuary at night with F off and on, and the lantern cue;
- the notebook cue, the notebook page, the plan's route line, the Index's *Loca arcana* and the baths folio;
- front, side and back studio views of hood-down and hood-up monks in daylight.

By numbers only: sound routing (§4), frame time and memory (§5).

## 7. Remaining limits

- **People:** the scanned faces are low-resolution. Some scans smile, and close to hands or the face they still show as scans.
  Hood peaks read tall. The whole-body MakeHuman/Donitz trial needs MakeHuman or Blender. Seated eating was tried (a
  right-arm composite from the drinking clip) and rejected: the arm hangs outside the body.
- **Assets not fetched:** the CC BY Sketchfab sheep and sack scans need a Sketchfab login token. With one, they can replace the
  current ones through `scripts/models/build_animals.mjs` and the `sack()` call sites.
- **Goat gait:** unchanged; only its coat improved. **Portal elders:** weathered, but their repeated poses remain.
- **Ossuary:** the entry stands very close to one wall, so even the rebalanced lantern lights that wall more than the passage.
  Niche contents are still repetitive.
- **Minor polish left:** kitchen and refectory table variety.
- **Audio:** no ear-led review yet (§4).
- **Notebook scope:** five notes only, deliberately. No evidence web, no dialogue beyond Severinus's one line, no multi-day state.

## Files

- **Repairs and people:** `src/main.js`, `src/data/places.js`, `src/data/routes_aed.js`, `src/data/routes_grounds.js`,
  `src/systems/horarium.js`, `src/systems/zones.js`, `src/world/people.js`, `src/world/people/figure.js`,
  `src/world/people/habit.js`, `src/world/people/schedule.js`, `src/world/outbuildings.js`, `src/core/materials.js`.
- **Props and surfaces:** `src/world/props/sculpt.js` (hedges, sacks, herb bunches), `src/world/props/cloth.js`,
  `src/world/furniture.js`, `src/core/propMaterials.js`, `src/core/relief.js` (the Entombment), `src/world/church.js`,
  `src/world/claustrum.js`, `src/world/nature.js`, `src/world/gardens.js`, `src/world/trees.js`, `src/world/animals.js`,
  `src/world/terrain.js`, `src/core/weathering.js`.
- **Sound:** `src/systems/audio.js`, `src/systems/audio/chant.js`, `src/systems/audio/emitters.js`,
  `scripts/audio/sources_md.py`, `docs/assets/AUDIO_SOURCES.md`, `scripts/credits.py`, `assets/credits.json`.
- **Notebook and UI:** `src/systems/notes.js` (new), `src/ui/ui.js`, `src/ui/style.css`, `index.html`.
- **Documents:** this report, `docs/provenance/next-pass.md`, `README.md`, `docs/DEVELOPMENT.md`.
