# Discovery, music and audio direction

Design intent from the 29 September review: quiet observation, book-led spatial discovery, and sound tied to the life of the abbey. Implementation-specific faults mentioned below describe that review snapshot. The [30 September report](../realism/NEXT_PASS_REPORT.md) explains the subsequent notebook, schedule and audio changes. Character continuity is in [VISUAL_BIBLE.md](VISUAL_BIBLE.md).

## Discovery

### 1. Core player fantasy

Walk as an attentive guest through a working abbey, learn how its spaces and routines fit together, and notice that some doors and explanations do not quite match what is visible. The pleasure is **understanding** the place: how to read a room, where a route goes, who controls it, and what a small detail implies. Quiet, intellectual and occasionally uneasy. No combat, XP or generic errands.

### 2. What the player discovers

| Category | Concrete abbey examples and evidence | Player value |
|---|---|---|
| Spatial relations | Church skull chapel → ossuary → kitchen; garden door → kitchen; east-tower ascent from scriptorium → library. See `docs/research/book/ROUTES.md`, `AEDIFICIUM.md` and `RECONSTRUCTION_NOTES.md`. | A previously opaque plan becomes traversable knowledge. |
| Access and authority | Aedificium barred after evening meal (`claim_000173`), walking in the library strictly forbidden (`claim_000181`), Abbot disapproves of cemetery visits (`claim_001005`), guarded cellar (`claim_002373`). | The player reads a closed door as part of abbey life, not arbitrary game gating. |
| Material evidence | Catalogue shelf marks, desks and loose Greek/Latin sheets, pig-blood jar, herb jars, a worn plaque, the skull altar; these already have hotspots in `src/main.js`. | An object rewards close looking and connects to another place. |
| Written systems | Catalogue numbers encode shelf/cabinet positions (`claim_000423`), shelf labels match the catalogue (`claim_001153`), and William maps rooms, walls, doors and windows (`fact_001781`). The initial-letter deduction (`fact_002002`) belongs later. | Players can interpret architecture as a document without receiving its solution in advance. |
| Human routine | Meals at the refectory, offices in choir, labour in scriptorium and service range, Severinus in infirmary/garden; `src/world/people/schedule.js` already drives phases. | Returning at another hour changes what can be observed. |
| Concealed construction | Fourth skull's eyes and pivoting altar (`claim_001047`); Alinardo's entrance hint (`claim_001026`); a second way toward the finis Africae known to Jorge (`claim_002693`). | A corridor can hold a question beyond its immediate end. Reveal clues at their proper place and time, not as up-front map labels. |

The evidence files distinguish **EXPLICIT** book claims from reconstruction inference and ambient embellishment. Each discovery's internal data should retain that provenance. Do not present a speculative placement or made-up quotation as a book fact.

### 3. Why explore one more corridor?

Each route should have a small perceptible promise: work sounds beyond a door, a change in paving, a barred passage at the wrong hour, a book rest visible past the stair, distant chant through a church wall, or a note in the journal whose spatial meaning is unresolved. The reward is a new relation between two observations. Resist sprinkling hotspots everywhere; a few memorable ones in distinct zones are better.

### 4. Interaction feel

Use the existing small **E** prompt and proximity/facing selection in `src/main.js` (`nearest()` / `act()`). An inspection should give a short sensory observation first, then a concise evidence-grounded implication. Existing place folios are good for deeper reading; a first-time note should appear as a restrained marginal mark, never a HUD banner that covers the abbey. Repeat interactions may reopen the text without replaying a reward animation. Do not let a broad place hotspot mask a nearby small object.

The current baths folio immediately reveals Berengar's later discovery. Keep that scholarly material behind a deliberate **source/story detail** reveal, while ordinary inspection describes the tubs and curtains visible now. The Index also names late secrets and teleports directly during walking. Identify it as **study navigation**, with deliberate disclosure of plot-bearing entries. A study jump is useful reference access, but must not record a traversed secret route. This can be handled in the existing UI; a new game-mode framework is unnecessary. Let the large clock recede when inspecting a low object such as the skull altar, while keeping hours easy to consult.

### 5. How novel evidence is used

The extracted evidence under `book_details/output` is the source of truth. Write notes from `claims.jsonl`, `facts.json` and the compiled notes, and store claim/fact IDs near each interaction. In the user-facing journal, distinguish observed world facts from William's/Adso's interpretations. Do not put future plot knowledge in an early note. Especially, the player should only learn the skull eye mechanism by finding/using it; the mirror and its q/r action should not be pre-solved by a journal entry. Preserve the existing broad E activation of the altar for this pass; aiming at individual skull eyes is not required to establish the journal foundation.

### 6. Role of the map

Keep the printed abbey plan and position marker, because they are established navigation tools. Use modest annotations for *learned* access/routes (e.g., barred after supper; a passage observed below the chapel), not game-map fog over the already printed plan. The library mini-map already reveals `UI.visited` rooms and verse letters; persist physically visited rooms and annotate a detail only after the player saw it. William's mapping procedure (`fact_001781`) fits this exploration mechanic particularly well. Do not award a chapel→ossuary route annotation merely for pressing E or jumping to the ossuary through the Index: require the player to enter the exposed passage.

### 7. Role of canonical hours

The horarium already controls time labels, office sound, lamps, people and the Aedificium curfew; keep it as the backbone. First fix the source-confirmed Terce/Nones mismatch: the chant sees an office while the population consumer still sees work. A later pass can add a few **legible** time variations: refectory meal vs silent hall; scriptorium desk work vs night emptiness; church office and chant vs silence; kitchen-garden access tied to Remigio's key (`claim_001659`); fewer watchers near a restricted route. The next pass needs at most one small time-dependent observation, not a simulation of 210 inhabitants. State changes must have visual/audio cues, and no unique evidence should be permanently missable. A changed observation at the already barred evening door is the lowest-cost useful choice.

### 8. Role of NPCs

People first perform work and observe monastic routines. At most one or two **named** people need a short contextual response: Severinus can identify his prepared herb jars (`claim_000309`) or his bath/infirmary role (`claim_000303`); the librarian can state the established access restriction; a stable hand can identify Brunellus if supported by the relevant book notes. These are authored paraphrases, not invented novel quotations. The extraction checked in this review did not establish separated dangerous-herb beds, so do not present that proposed placement as explicit evidence. Fix role-compatible pooling and stable named identities before adding a response to a recycled figure. A character's schedule must make the response plausible; if absent, let the object carry the information. No generic dialogue trees.

### 9. Role of restricted spaces

Restrictions should be understandable from architecture, keys, people and hour. Current `setupCurfew()` already bars two Aedificium doors after 19.2 and indicates the ossuary way. Keep route logic intact. A closed door may reveal a journal observation, but should not become a quest marker. Entry by the chapel and the library's internal routes should remain discoveries; no arbitrary gates or out-of-world unlock tokens.

### 10. What should not be gamified

Prayer, liturgy, graves, sickness, the deaths, manuscripts as “loot,” and monks' vows. Do not count bodies, score doctrinal information, make every book collectible, or award points for entering sacred spaces. Silence and uncertainty are part of the experience.

### 11. Mechanics for later

A richer evidence web, optional interpretation/hypothesis links, fuller NPC conversations and schedules, multi-day variations, access based on observed routines, and deeper library-map deductions belong after the world is visually coherent and the first journal loop has proved useful. Do not reconstruct the whole murder plot or add a quest framework now.

### 12. Small mechanics to introduce now

1. **Persistent observations journal:** promote **four or five** existing or near-existing E interactions into first-time notes, saved locally in the current parchment/folio style. Strong first set: catalogue shelf marks (`claim_000423`, `claim_001153`); the Aedificium barred after supper (`claim_000173`); prepared herb jars (`claim_000309`); the pig-blood jar as service work (`claim_000375`, `claim_000664`); and the altar passage **after the player opens and enters it** (`claim_001047`, `ROUTES.md`). Each note has a place, evidence ID and brief observation, with no points or percentage. Do not turn the blood jar into a premature murder deduction.
2. **Discovered map annotation:** one understated marker for a route/access relation actually experienced (e.g., chapel → ossuary) plus persistence for physically visited library rooms. Keep printed labels visible, separate study jumps from observation triggers and avoid spoiling undiscovered mechanisms.
3. **One time-sensitive observation:** let an active-hour work scene or barred door give a different short note when revisited, using the existing horarium. No timed fail state.

The minimal loop is **walk → notice → press E → learn a fact → see it remembered → wonder where it connects**. Reuse `UI.openFolio`, `UI.visited`, `drawMappa`, current hotspot IDs and `src/data/places.js` rather than adding a separate game framework.

The immediate reward is recognition: a cabinet number means something, an evening door changes the available route, and an architectural relation becomes part of the player's own map. [Inkle's account of object interpretation leading to new sites](https://medium.com/@inklestudios/why-does-translation-unlock-sites-in-heavens-vault-e05c4ccadf62) informed this design inference; the abbey does not need its translation system. [Pentiment's official gallery](https://pentiment.obsidian.net/) is a reference for restrained manuscript framing, not a source of reusable art or period authority for 1327.

## Music and audio

### Identity

The abbey should sound inhabited, cold and reverberant. Its musical identity is Latin plainchant, mostly **actually sung in the church during an office**. Distant voice across stone is more powerful here than an always-on “medieval soundtrack.” Occasional nearly inaudible modal instrumental colour can be explored later, but the next pass should spend its budget on correct placement, timing, silence and source choice.

Avoid epic choir, orchestral swells, fantasy percussion, trailer crescendos and jump scares. Keep game UI chimes rare and quieter than the room.

### Diegetic strategy

1. **Inside choir/nave at office:** direct human chant, intelligible but not loud, with church-tail reverb and congregation/cloth movement beneath it. The existing `src/systems/audio/chant.js` and `src/systems/audio.js` already route recorded chants through the church sound emitter and convolution rooms.
2. **Near the church:** attenuated, low-passed chant through doors/walls into cloister, cemetery and nearby walk, preferably more audible at the actual church thresholds. Do not beam a clean stereo track across the whole abbey.
3. **Other work zones:** smith hammer/fire, kitchen hearth, stable breath/hoof, scriptorium quill, fountain and wind; music generally absent. Bells can join spaces at canonical changes.
4. **Night/lower spaces/library:** air, footfall, occasional distant bell or slit wind. Silence should disclose scale and danger. Avoid generic suspense drones looping in the library.

The sound is off until browser gesture; the interface already has a sound toggle. Its fresh sound-on startup passed the inspected console check. I reviewed routing, source lists and the earlier 106-second bus recording report; the browser tool does not let me hear the output, so a fresh ear-led mix review is still required. Source-page descriptions are not listening assessments.

### Canonical-hour changes

`src/systems/horarium.js` has Matins through Compline; `CHANT_FOR` currently assigns an opening/psalm/hymn combination to each. Treat recordings as **specific performances**, not interchangeable loop tiles. Preserve short office windows; let the voice cease as the monks disperse. Use transitions and room muffling, not abrupt starts. The full refrain every hour makes the day predictable, so favour variation and more silence at minor hours. At meal time, the refectory can be quiet except a reader and dishes; it should not inherit church choir as background score.

The population consumer currently misses Terce and Nones because it tests the work/office phase separately from `officeAt()`. Make sound, clock and intended choir activity agree at 9.05, 12.0, 14.55 and 16.6, while retaining book-supported exceptions such as working scribes. This is a small schedule repair, not a new liturgical simulation.

**Season correction:** the shipped [`Lamentation III, Holy Saturday`](https://commons.wikimedia.org/wiki/File:Lamentation.III.Karsamstag.ogg) is CC0 but explicitly a Holy Saturday lesson. The project depicts late November. Remove it from generic Matins now. If no suitably licensed and season-neutral replacement has been auditioned, leave that slot silent. The [*Deus in adjutorium* performance](https://commons.wikimedia.org/wiki/File:Schola_Gregoriana-Deus_in_adjutorium_meum_intende.ogg) was recorded at Vespers; that alone does not make its opening inappropriate at other offices. Judge the exact text/cut. [*Veni Creator*](https://commons.wikimedia.org/wiki/File:Veni.creator.spiritus.ogg) likewise needs a suitable liturgical context rather than becoming a repeating background hymn.

### Researched usable recordings

| Track / source | Licence and use | Loop/attribution notes |
|---|---|---|
| [Sant'Antimo monks singing Gregorian chant](https://commons.wikimedia.org/wiki/File:Sanantimo_gregorian.ogg) | CC BY-SA 3.0; current `chant:psalm`. Actual recorded monastic voices suit the church. | ~1m40; short enough to become recognizable if recycled at every office. Credit recorder Zyance and source monks, preserve BY-SA derivative obligations for cut audio. |
| [*Deus in adjutorium meum intende*](https://commons.wikimedia.org/wiki/File:Schola_Gregoriana-Deus_in_adjutorium_meum_intende.ogg) | CC BY-SA 3.0; current `chant:deus`. | Current ~56s cut; useful opening in appropriate offices, not a seamless ambience loop. Credit Schola Gregoriana/Ołtarzew and licence. |
| [*Antiphona et Magnificat*](https://commons.wikimedia.org/wiki/File:Schola_Gregoriana-Antiphona_et_Magnificat.ogg) | CC BY-SA 3.0; current `chant:magnificat`. | Vespers punctuation, long excerpt. Keep phrase boundaries. Credit group and same-licence derivative. |
| [*Veni Creator Spiritus* by Membeth](https://commons.wikimedia.org/wiki/File:Veni.creator.spiritus.ogg) | Author-released public domain; current `chant:hymn`. | ~30s excerpt, solo voice; sparing use. No legal attribution condition, but keep provenance credit. |
| [*Lamentation III, Holy Saturday*](https://commons.wikimedia.org/wiki/File:Lamentation.III.Karsamstag.ogg) | CC0; current `chant:lesson`. | **Not suitable for routine late-November Matins**. Keep in source archive only, or remove from the playable bank. |
| [Vrymaa: A cappella – Gregorian lamento](https://freesound.org/people/Vrymaa/sounds/738774/) | CC BY 4.0; optional trial. Full technical metadata in `docs/realism/NEXT_PASS_RESEARCH.md`. | Audition dry phrases; historical text unverified. Credit source/licence/edits. Not a Matins replacement. |

Three shipped choir excerpts are CC BY-SA 3.0, while the earlier pass preferred CC0/CC BY. The current instruction permits legally reusable sources. Retain reusable material with correct attribution, licence links and the applicable ShareAlike treatment for adapted audio; record source and cut details in `docs/assets/AUDIO_SOURCES.md` and in-app credits. If an established distribution requirement excludes BY-SA, substitute rights-clear material or silence within that requirement. This does not require a fresh permission request merely because a recording is BY-SA. [Creative Commons' licence summary](https://creativecommons.org/licenses/by-sa/3.0/) links to the full terms.

Non-diegetic music, if tried at all, should be a brief, low-level texture separated from the church emitter and its liturgy. Test whether it adds anything after the place sounds work. No discovery fanfare, automatic ominous cue at every clue, or permanent chant loop. End it cleanly and return to room silence. The optional vocal candidate above needs audition and does not prove an emotional or historical fit merely by its title.

### Environmental audio

Existing legally sourced banks cover most needs. [Chartres Angelus bell](https://freesound.org/s/796547/) (CC0), [quill and parchment](https://freesound.org/s/507864/) (CC0), [winter wind at a window](https://freesound.org/s/69512/) (CC0), [monastery fountain](https://freesound.org/s/442539/) (CC0) and gate latch/fire/animal banks in [`docs/assets/AUDIO_SOURCES.md`](../assets/AUDIO_SOURCES.md) are appropriate if mixed to a local emitter. The actual site should retain its exterior wind and snow footsteps, while enclosed spaces have filtered wind and their own reflection/reverb. The gate latch source includes distant modern traffic in the full recording; keep only clean cuts if used.

### Priority for next pass

1. Correct the Holy Saturday Matins cue, document existing recording obligations, and align Terce/Nones choir activity with office sound.
2. Audition the existing church, cloister, cemetery and kitchen→ossuary route with sound enabled; tune attenuation, occlusion, low-pass and reverb so chant seems to come through stone/doors.
3. Make office transitions smooth and less repetitive; preserve room silence and work sounds.
4. Trial the optional licensed vocal texture only if a clear emotional gap remains after the diegetic mix. Keep it sparse and separate from identifiable liturgical singing. No continuous score yet.
