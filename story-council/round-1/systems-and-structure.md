# Story Council Report — Systems & Structure Lens

**Project:** *The Abbey Project* (`/Users/memre/Desktop/gulun_adı`)
**Date:** 2026-10-02
**Role note:** my brief contains the placeholder `[INSERT ROLE FROM THE ASSIGNMENTS BELOW]` but no assignment list. I have therefore adopted the **Systems & Structure** lens: how stories map onto the simulated abbey, what product shape the existing systems can carry, and which narrative mechanics are genuinely earned by the reconstruction. I flag where another council role (literary, historical, art) should overrule me.

**Spoiler discipline:** this report contains no novel deaths, culprits, solutions, hidden motivations, late revelations, or endings. Novel-derived content is discussed only at a structural level and is marked **SPOILER-SENSITIVE**. All scenario fiction below is **ORIGINAL_GAME_FICTION** in the repository's taxonomy.

---

## 1. What the abbey already is

I inspected the canonical docs (`README`, `PROJECT`, `PLATFORMS`, `GAME_DESIGN`, `ASSETS`, `DEVELOPMENT`), the native domain (`horarium`, `game_clock`, `knowledge_state`, `portal_states`, `passage_tracker`, `room_classifier`, `routines`, `access_rules`, `interaction_rules`, `conditions`, `office_transport`, `save_service`), the adapters, HUD, shared data and schemas, the browser world systems, `book_details/output`, and provenance. The picture is unusually coherent for a prototype:

**Already real, native and tested**

- **Time**: a day/hour clock with offices, phases, curfew, daylight and sun position; the lighting rig computes actual solar altitude/azimuth from the clock (late November, Ligurian Apennines).
- **Space**: explicit room volumes in priority order, anchors, doors with thresholds and normals, portals with eased open/closed state shared by collision, navigation and acoustics, and a passage tracker that only credits a route actually walked on foot (teleports and loads invalidate it).
- **People**: stable entity IDs, availability by canonical phase, fitted presentations, one canonical presence (Alinardo) plus a synthetic crowd fixture explicitly not canonical.
- **Access**: an allowlisted condition vocabulary (`phase_in`, `office_in`, `hour_between`, `portal_target`, `curfew`, `known`, `known_derived`…) and interaction rules that turn conditions into notes, toasts, portal changes and sounds.
- **Knowledge**: an allowlisted, idempotent discovery store with time and "told by" attribution, plus derived knowledge rules.
- **Sound**: continuous office transport that survives doorways and cell loads, acoustic spaces per room type, a church path model.
- **Docs**: nine literary evidence files, claims with certainty and IDs, spatial/movement/visibility/access graphs, a scenario contract sketched in `GAME_DESIGN.md`, and a save format that validates IDs, geometry bounds and checksums.

**What is planned but not implemented**: attributed claims versus established truth, scenario-aware saves, per-case events/observations/contradictions, conclusion evaluation, readable documents and comparison surfaces, persistent actor routes beyond one person, canonical door/access across the whole slice, and a clock that actually advances by default (native starts at rate 0).

**The most underused systems**, and therefore the best places to look for genuinely new mechanics:

1. **The horarium and clock** — present, accurate, almost entirely decorative today. It is the single biggest unused narrative engine.
2. **Routines and access rules** — exist as data and evaluators but drive one character and one noncanonical fixture.
3. **Acoustic transport and room acoustics** — objectively tested, never used as *evidence*.
4. **Portal states** — a single altar today; conceptually a generic system for windows, shutters, gates, chests, barred doors.
5. **Physical-experience crediting** — the strongest anti-cheat idea in the repo: you know a route because you walked it, not because you unlocked it.
6. **Lighting tied to the clock** — real sun math, never used as an instrument of proof.

### What this abbey can do that an ordinary adventure game cannot

- **Make the timetable the antagonist**: access is a function of office, duty and egress, not of keys. The world closes itself at Compline and opens itself at Prime.
- **Make architecture a witness**: sightlines, thresholds, acoustic spaces and route lengths decide what a person *could* have known.
- **Make knowing itself the reward**: the game can distinguish "I saw this," "he says this," "the register says this," and "I believe this," and let the player be wrong at every level.
- **Make an institution the subject**: the mystery can be about a rule, a record, a boundary or a memory — not a body. Monastic life supplies stakes without violence: reputation, care, obligation, memory, obedience, embarrassment, forgiveness.
- **Make the place outlast the case**: the same corridor, at another hour, in another case, means something different.

---

## 2. The current formulation, evaluated

> "Historical environmental investigation through knowledge, access, architecture and time."

I accept this, with one correction: it describes the **verbs**, not the **game**. Knowledge is not content; it is the currency. The formulation risks becoming a genre label that hides the real question: *what is the player trying to do, and why do they care about the answer?*

Keep: first-person physicality, no combat, no XP, access as progress, source-attributed knowledge, canonical hours as constraints, uncertainty as an honest outcome, original cases in the reconstructed world.

Correct:
- **Documents are one evidence class among five** (place, time, sound, object, testimony), not the default. A case whose only interesting steps are reading is a field-school exercise, not the game.
- **The abbey must be inhabited enough to be legible.** Three credible people with duties beat forty-six decorative ones, but the world still needs ambient work, animals, weather and light, or "routines" become wallpaper.
- **Time must create meaning, not just locks.** If hours only gate doors, players will wait; if hours change who can see/hear/know, players will plan.
- **The reward is explanation, but the tension is social.** Understanding must sometimes cost: a reputation, a promise, a kindness, an admission.

---

## 3. Product and story structures

I evaluated four genuinely different shapes. Each is scored later in the matrix; the favored choice is stated after.

### Structure A — Authored Investigations on a Living Horarium (anthology)

- **Player fantasy**: an invited collator/auditor who slowly becomes the person who understands how the abbey actually runs.
- **Session begins**: a concrete anomaly and a bounded question, at a declared day, with the player's current access and knowledge.
- **Repeated action**: orient by hour; observe; compare claims with places, times and objects; design one physical test; submit a supported account.
- **Knowledge develops**: sourced observations and claims accumulate; access and trust widen; later cases reuse the same places differently.
- **Time**: the day's offices structure every case; some evidence exists only at an hour.
- **NPCs**: stable identities with duties that bound what they can know; no exposition dispensers.
- **Architecture**: routes, sightlines, thresholds, acoustics and travel times are evidence.
- **Ends**: an account is entered, judged for support, and has diegetic consequences; not a "correct suspect."
- **Replayability**: new cases, new roles, authored variants inside validated causal graphs; the world stays true.
- **Novel relationship**: original cases by default; optional, spoiler-labelled novel-derived episodes; free study as connective tissue.
- **Strength**: everything already built is on the critical path; scales by authoring.
- **Weakness**: brittle clue graphs and homework risk; demands excellent writers and playtesting.

### Structure B — One Long Year (single campaign, persistent institutional season)

- **Player fantasy**: a long-staying outsider who comes to belong to a place across a liturgical year.
- **Session begins**: you are mid-year; the state of the abbey (stores, weather, debts, griefs, building works, visitors) is where the last session left it.
- **Repeated action**: carry out obligations, notice slow anomalies, build relationships and records; several small questions resolve into one institutional story.
- **Knowledge develops**: socially, not just textually — people change, promises accrue, the player's earlier choices return as evidence.
- **Time**: seasons and feasts, not minutes; snow closes the pass; Lent changes food, light and temper.
- **NPCs**: the same community across months; arcs, not states.
- **Architecture**: the same rooms change with weather, use and repair; a wall you walked past in autumn matters in spring.
- **Ends**: a reckoning — a chronicle, an audit, an election, a departure — with the abbey changed because the player was there.
- **Replayability**: alternate seasons and roles; consequence variation.
- **Novel relationship**: the reconstructed world as stage; novel episodes remain separate opt-ins.
- **Strength**: emotional depth, memory, place-love; the strongest argument for the reconstruction.
- **Weakness**: enormous content and test cost; slow burns often die before the payoff; save/state complexity; conflicts with short-session players.

### Structure C — The Abbey as Instrument (free study, question catalogue)

- **Player fantasy**: a scholar-guide and annotator; the abbey is a cabinet of questions.
- **Session begins**: the player chooses a folio from a catalogue of open questions — architectural, calendrical, economic, botanical, textual.
- **Repeated action**: explore, inspect, measure, compare, annotate; some questions close, some stay unresolved.
- **Knowledge develops**: through the player's own marginalia and cross-references; there is no omniscient narrator.
- **Time**: mostly context; hours matter when a question concerns light, sound or access.
- **NPCs**: knowledgeable specialists encountered in their duties; conversations are topical, not quest-shaped.
- **Architecture**: the primary object of study.
- **Ends**: a reading is "published" (entered in the player's register); nothing is forced to conclude.
- **Replayability**: new questions; revisiting the same evidence with new context.
- **Novel relationship**: excellent fit for spoiler-safe study and a natural companion to the web explorer.
- **Strength**: humane, educational, low narrative risk; full reuse of reconstruction data.
- **Weakness**: museum-with-quizzes risk; weak dramatic spine; hard to market; can feel like a humanities assignment.

### Structure D — The Custodian's Year (office-holder sim with emerging anomalies)

- **Player fantasy**: a trusted insider with responsibility — keys, stores, guests, letters, repairs.
- **Session begins**: a daily round of obligations; you sign what you do.
- **Repeated action**: allocate access and resources, resolve small conflicts, keep the institution functioning; discrepancies accumulate between what you did, what you recorded and what others say.
- **Knowledge develops**: from consequences; you learn the system by being responsible for it.
- **Time**: the engine — duties are hours, and hours are duties.
- **NPCs**: interdependencies and friction; loyalty and resentment.
- **Architecture**: the player's own practiced route network.
- **Ends**: a term reviewed; the abbey visibly better or worse because of you.
- **Replayability**: systemic consequence variation.
- **Novel relationship**: original administrative fiction; novel characters would be awkward among it.
- **Strength**: the strongest "living institution" fantasy; investigations arise from duty, not from a quest list.
- **Weakness**: very high simulation/UI scope; busywork; risks losing the investigative identity; `GAME_DESIGN.md` is right to defer it.

### My recommendation among structures

**Structure A is the product.** But it needs one structural amendment from Structure B: a **persistent institutional season** between cases. Cases remain short, authored and self-contained; the abbey between them changes in small, versioned ways (a repair, a death-free personnel change, a seasonal light, a store level, a new obligation). This gives the anthology continuity and emotional accumulation without the cost of a full simulation campaign. Free study (C) is the hub and the web companion; D is postponed; B is the eventual campaign mode if A succeeds.

---

## 4. Twelve original investigations

All entries are **original fiction**; historical support is noted where it exists. They deliberately avoid murder.

**1. The Bell Before Lauds — SMALL**
*Premise:* The waker's bell fails on a cold night; offices begin disordered; by morning two accounts of the night disagree.
*Central question:* What actually happened in the hour the bells did not measure, and why does more than one person need the clock to have been wrong?
*Why this abbey:* Only a community whose day is timed by bells can have time as a crime scene. *Core evidence:* rope wear, ringer's rota, candle stubs, heard office starts, frost prints, an unbarred door. *Systems:* clock/offices, routines, sound events, rooms, curfew, testimony, save. *Canonical hours:* central. *Spatial:* dormitory–church path, bell tower, choir, cloister acoustics. *NPC role:* waker, sacristan, infirmarer, porter each know only what duty shows. *Reasoning:* correlate two clocks (signal vs light/candle) and who could hear what. *Originality:* timekeeping itself is the mystery. *Leverage:* clock, sun, bell asset, routines. *Risk:* obtuse if time is not perceptible; needs strong cues and transcripts.

**2. The Third Ledger — MEDIUM**
*Premise:* The granary count matches neither of the cellarer's books; a loan to a neighbouring house may never have left the gate.
*Central question:* Did the grain leave, and why do two honest records disagree? *Why:* storage, hospitality and the gate make the abbey's economy spatial. *Core evidence:* tally notches, cart ruts, locks, store volumes, guest portions, weather, gate witness. *Systems:* documents, portals, routines, hours. *Hours:* gate, meals, Vespers. *Spatial:* granary–gate route and its travel time. *NPC role:* cellarer, porter, hosteller, granary keeper. *Reasoning:* separate "recorded", "counted", "moved", "eaten". *Originality:* procedure, not forgery. *Leverage:* full browser buildings; new readable objects. *Risk:* bookkeeping boredom; needs physical counting and walking.

**3. The Chapel and the Wrong Sun — MEDIUM**
*Premise:* On its feast, light through a chapel window falls where the design says it should not; a building account claims a date the geometry contradicts.
*Central question:* Which is true — the masonry, the calendar, or the account? *Why:* reconstructed sun path plus window geometry make the abbey an astronomical instrument. *Core evidence:* shadow line, mullion profile, reused stone, foundation course, dedication record, old memory. *Systems:* lighting/sun, room geometry, inspection, documents, hours. *Hours:* the case is *about* the hour and the season. *Spatial:* altar–window sightline, church axis, processional door. *NPC role:* sacristan, oldest monk, mason/glazier, prior, each with partial memory and an institutional interest. *Reasoning:* distinguish rotated building from moved feast from miscopied date. *Originality:* sunlight is the witness. *Leverage:* existing solar math and anchors. *Risk:* physics-puzzle drift; needs human stakes.

**4. The Doors of the Procession — SMALL**
*Premise:* A guest claims to have seen something during the nightly procession that the line itself makes impossible — or too possible.
*Central question:* Could the claimant have seen it, and what does the procession's route make possible? *Why:* the ritual is a moving map of openings, lights and blind spots. *Core evidence:* line order by seniority, candle positions, door states, sightline from the guest window, chant timing, tracks. *Systems:* routines, access, portals, visibility, hours, testimony. *Hours:* supper–Compline sequence. *Spatial:* cloister–cemetery–church north door. *NPC role:* cantor (order), sacristan (doors/lights), hosteller (guest), infirmarer (exemptions). *Reasoning:* reconstruct the line, then test the claim against it. *Originality:* the collective movement is the puzzle. *Leverage:* browser schedule slots, doors, church path. *Risk:* thin with a single question; needs a second stake.

**5. The Name on the Obituary — SMALL/MEDIUM**
*Premise:* A benefactor's anniversary is sung under a name the family disputes; memorial list, burial record and rent obligation disagree.
*Central question:* Whose memory is the abbey keeping, and who does the error serve? *Why:* prayer, patronage and rent bind memory to property in one institution. *Core evidence:* obit calendar, grave mark, rent roll, donor letter, bell, gift. *Systems:* documents, rooms, hours, NPC, save. *Hours:* the anniversary office. *Spatial:* grave–altar–register. *NPC role:* cantor, cellarer, sacristan, family guest. *Reasoning:* separate legal, baptismal and commemorative identities. *Originality:* grief and obligation, no culprit required. *Leverage:* calendar and church. *Risk:* delicate; must avoid melodrama and any novel echo.

**6. The Boundary Walk — MEDIUM**
*Premise:* The annual walking of the abbey's bounds becomes a dispute over a hedge that moved and a memory that may have been coached.
*Central question:* Where does the boundary truly run, and whose memory is trustworthy? *Why:* a landowning house in a specific mountain landscape; memory is a legal instrument. *Core evidence:* boundary stones, tree marks, charter, elders' testimony, habitual paths, drifts. *Systems:* exploration, grounds, documents, testimony, weather. *Hours:* minor; season major. *Spatial:* the walk itself is the experiment. *NPC role:* cellarer, tenants, oldest lay brother. *Reasoning:* test each witness's route memory against terrain and sight. *Originality:* proof by walking, not by marker. *Leverage:* browser grounds; needs tenant cast. *Risk:* walkable-area cost; thin if only a hedge.

**7. The Water in the Wall — MEDIUM**
*Premise:* A damp patch appears after a cold snap; the spring that serves the lavatorium is failing; someone says the water was diverted.
*Central question:* Where does the water come from now, and what did it used to do? *Why:* monastic houses are water machines — leats, drains, latrines, infirmary, kitchen. *Core evidence:* channels, ice, mortar, floor slope, grate, work order, servant testimony. *Systems:* architecture, physical traces, rooms, work routines, hours. *Hours:* dawn frost and use times. *Spatial:* slopes and courtyards; no underground expansion needed. *NPC role:* mason, gardener, infirmarer, cook. *Reasoning:* read terrain and construction, not just paper. *Originality:* engineering failure, not villainy. *Leverage:* terrain, grounds. *Risk:* credible water without a fluid sim; use traces.

**8. The Hand That Stopped — SMALL**
*Premise:* A finished psalter is credited to an old scribe who could no longer write; the last quires are a younger hand.
*Central question:* Who made the book, and why does the community keep the attribution? *Why:* scriptorium craft, light, materials and reputation are institutional. *Core evidence:* hand, ink, corrections, desk assignment, obedience note. *Systems:* inspection, documents, rooms, hours, NPC. *Hours:* work light. *Spatial:* desks, windows, chest custody. *NPC role:* scribes, librarian, prior. *Reasoning:* infer practice from traces; understand kindness. *Originality:* authorship as mercy, not fraud. *Note:* thematically adjacent to the documented "Second Hand" case — keep one, not both. *Leverage:* scriptorium; readable-page UI. *Risk:* palaeography without Latin; make differences visible.

**9. The Letter Under the Snow — SMALL/MEDIUM**
*Premise:* A snowbound messenger brings a sealed letter; by the time the abbot opens it, the seal is broken — and the abbey's reply anticipates its contents.
*Central question:* Who read the letter before its addressee, and what did the abbey already know? *Why:* correspondence is the abbey's link to patrons and church politics; gate–hospice–scriptorium is the information path. *Core evidence:* wax, messenger's account, gate record, draft reply, timing, carrier. *Systems:* documents, NPC, rooms, hours, portals. *Hours:* gate closes at dusk; arrival window. *Spatial:* gate–hospice–abbot's house. *NPC role:* porter, hosteller, secretary, messenger. *Reasoning:* custody of information, not of objects. *Originality:* a leak that may be a duty. *Leverage:* doors, routines. *Risk:* abstraction; needs a personal promise at stake.

**10. The Colour of Silver — SMALL**
*Premise:* Pigment bought for an important commission is not what was paid for; the illuminator discovers it when the work is nearly done.
*Central question:* Where was the substitution made, and who bears the loss? *Why:* materials enter by the same gate as grain and letters; workshop, cellarer and merchant form a chain. *Core evidence:* paint behaviour, weight, receipt, seals, other goods, stains. *Systems:* inspection, objects, documents, NPC. *Hours:* delivery and work windows. *Spatial:* workshop–cellarer–gate. *NPC role:* illuminator, cellarer, merchant, servant. *Reasoning:* material property vs provenance; craft literacy. *Originality:* tactile art-supply fraud. *Leverage:* material/texture systems. *Risk:* needs convincing materials; avoid fetch-chain structure.

**11. The Garden of Two Names — SMALL**
*Premise:* A plant stored under one name matches another in a translated herbal; a treatment goes wrong and the label is blamed.
*Central question:* Translation error, storage error, or substitution? *Why:* garden, infirmary, pharmacy and translation meet here; the abbey's intellectual and material lives touch. *Core evidence:* seed list, plant remains, drying racks, label hand, herbal page, patient account. *Systems:* inspection, documents, rooms, NPC, hours. *Hours:* gathering and infirmary times. *Spatial:* garden–drying room–infirmary. *NPC role:* infirmarer, gardener, translator, patient. *Reasoning:* separate appearance, name and effect. *Originality:* medical humility, not poison melodrama. *Leverage:* browser gardens/infirmary. *Risk:* must not echo a notorious plant plot; keep stakes mild.

**12. The Clause That Was Not in the Exemplar — MEDIUM**
*Premise:* A newly copied book of customs contains a clause that changes who may be cared for where. The copyist says the exemplar had it; the exemplar says otherwise.
*Central question:* Error, correction, or interpolation — and who wanted it in the text? *Why:* the scriptorium is the abbey's legislative engine; a clause is architecture for behaviour. *Core evidence:* exemplar, erasure, marginal note, dictation schedule, reader's marks, commission. *Systems:* documents, inspection, NPC, rooms, hours. *Hours:* scriptorium vs chapter. *Spatial:* scriptorium–chapter–refectory/infirmary, where the clause bites. *NPC role:* prior, armarius, copyist, abbot. *Reasoning:* textual criticism translated into visible differences. *Originality:* the mystery is how an institution changes its own rules. *Note:* overlaps "Second Hand"; keep one. *Risk:* tedium unless someone is physically affected.

---

## 5. Deep dives on the three strongest

I selected **The Bell Before Lauds** (time), **The Doors of the Procession** (space/access), and **The Chapel and the Wrong Sun** (architecture/light). They test three different pillars, all already latent in the codebase. The documented *Leaf Before Vespers* covers documents and claims; these three add what Leaf does not.

### 5.1 The Bell Before Lauds

**Opening state.** The player is an invited collator lodged in the guest range, trusted in the church and cloister at most hours. They have begun to learn the offices by bell. On a cold, windy night the signal fails; Matins begins late; Lauds is disordered. By morning the prior asks the player, quietly, to write down what was heard and seen, because an accusation of negligence is forming against the aging waker — and the prior suspects negligence is not the whole truth. The player cares because they know the waker as a person, and because their own record will decide a small fate.

**Investigation topology.** Not a list: (a) the night's time anchors — three people recount when they woke and what they heard; (b) the tower — rope, stair frost, candle, rope wear; (c) the route — who walks to church at night, through which doors, and what the wind does to sound; (d) the routine — the waker's rota, the infirmarer's night round, the porter's gate; (e) the unmeasured interval — someone used the missing hour for a private, human errand. Each thread yields partial timestamps; the case is solved when the timestamps are made to agree with the physical world.

**Evidence classes.** Physical traces (rope, wax, frost, a dragged bench); timing (office starts, candle lengths, chant beginning); testimony (attributed, with scope); sightlines (who can see the tower stair); sound (who could hear the bell from which building, with wind and doors); documents (the rota, the sacristan's notes).

**Contradictions.** The waker says he rang on time and slept; two witnesses hear the bell at different times; the tower door was found barred from outside; the sacristan's candle says the office began late even in the church. None of these is a lie; they are different clocks.

**Architecture.** The dormitory–church passage, tower stair, choir acoustics, cloister walk and the state of doors participate directly. The bell is audible differently in infirmary, dormitory and cloister — an acoustic-space fact the player must exploit.

**Time.** This is the case *about* time. The player may need to stand in the infirmary during the next office to hear what the infirmarer could hear, or return at the same hour to test a claim. Waiting is diegetic and safe.

**NPC knowledge.** The waker knows his body and routine, not the sound world. The sacristan knows liturgy, not people. The infirmarer knows who was ill. The porter knows who passed. A young monk noticed the silence and feared to report it. One person conceals a private act, not a crime.

**Discovery.** Optional: a repair in the tower stair from an old accident; a name and obligation cast into the bell; the waker's failing eyesight; why he goes early.

**Deduction.** The player must conclude that the signal failed at a specific point, that the cause is not the suspected negligence, and that the missing hour was used by someone whose need was personal. The account names what cannot be established as clearly as what can.

**Failure/uncertainty.** Supported: the player can establish the timeline and still not identify the private act with certainty. The game should accept an account that separates established time from plausible explanation.

**Ending.** A short register entry; a duty reassigned; a repair ordered; a conversation the player's account made possible. No punishment cutscene.

**Replay potential.** Different start roles (guest, novice, sacristan's helper); weather variants; an alternate where the waker is the one who needs the missing hour.

### 5.2 The Doors of the Procession

**Opening state.** A guest in the hospice claims to have seen a brother cross the cemetery during the evening procession. The brother denies leaving the line. The hosteller, fearing scandal and unsure whom to believe, asks the collator to establish what the procession actually made possible. The player cares because the guest is under the abbey's protection and the accused is a person they have met.

**Investigation topology.** Reconstruct the line: who walks where by rank, who carries lights, which doors are held, who may legitimately fall out (the old, the infirm, the sacristan), and how the order changes with the officiant. Then test the claim: stand at the guest's window at the right hour; walk the route at the same hour on a day without the procession; ask to join the line to experience its blind spots; compare the cantor's order with the accusation. A second thread concerns what was actually done in the unobserved minute — small, human, not grand.

**Evidence classes.** Line order (document/authority), candle count and placement (object/sight), door states (portal), tracks (physical trace), chant timing (sound), testimony from inside and outside the line, window sightlines.

**Contradictions.** The guest's claim requires seeing a face where only a silhouette is possible; a lamp was on the wrong side; the accused's own account places him where the cantor did not see him; someone swapped places to cover another absence.

**Architecture.** Cemetery sightlines, the church north door, cloister arcade, guest-house window, and the difference between "inside the line" and "outside the ritual" are the case. The abbey's own ceremony is the machine.

**Time.** The procession sits between supper and Compline; the player must choose whether to follow the line or watch from the window, and can repeat the hour on another day. The choice *is* the experiment.

**NPC knowledge.** The cantor knows order; the sacristan knows lights and doors; the hosteller knows the guest; the infirmarer knows exemptions; the accused knows his own private reason. Nobody knows the whole line.

**Discovery.** Optional: a serving brother's shortcut for carrying food; a chronicle note about an older processional route; a blocked former opening that changes the line.

**Deduction.** The player must conclude what the procession could and could not permit, where the deviation actually happened, and that the visible crossing proves less than the accusation assumes.

**Failure/uncertainty.** Partial accounts should be accepted: possibility established, motive unknown.

**Ending.** A private report to the hosteller; a correction offered to the guest; a small change in door practice; no public accusation.

**Replay potential.** Follow different participants; rain or snow changes tracks and lamps; a variant in which the guest's vantage is questioned rather than the brother's absence.

### 5.3 The Chapel and the Wrong Sun

**Opening state.** The abbey prepares for a dedication feast; a visiting patron's gift is at stake. The sacristan notices that light through the chapel's window now falls where the design says it should not. The player is asked to help verify the record because the community cannot afford an error in front of the patron — and because the oldest monk's memory contradicts the account book.

**Investigation topology.** (a) Measure the light at a known hour and mark where it lands; (b) read the window — mullion, lead, patched panes, glass colour; (c) read the wall — courses, masons' marks, reused stones, sealed earlier foundation; (d) read the documents — dedication record, building account, calendar; (e) interrogate memory — what the chapel looked like before the rebuild; (f) check the processional door, which a rotated building would have changed. The case resolves when the player can explain *why* geometry and record diverge, not merely that they do.

**Evidence classes.** Light and shadow, measured by body and hour; architecture; inscription and mason's mark; account entry and calendar; memory; the physical reuse of older material.

**Contradictions.** The account's date versus the calendar; the window's geometry versus the altar axis; the old monk's memory versus the rebuilt wall; a mason's mark that matches the smithy's, suggesting who did the work and when.

**Architecture.** The chapel itself is the suspect: orientation, window, step, axis, processional threshold. The player must walk and measure, and the sun only appears at certain hours and seasons.

**Time.** The case necessarily spans hours and days; some evidence exists only when the low late-November sun reaches the window. The solar model is already physical; the case makes the player use it.

**NPC knowledge.** The sacristan knows ritual and light; the oldest monk knows before and after; the mason knows craft and repair; the prior knows what the record is *for*. Each has an interest in the record staying as it is.

**Discovery.** Optional: an earlier foundation beneath the floor; a donor's name in the glass; a repair that moved the altar; a mason's mark shared across buildings.

**Deduction.** The player must conclude that the chapel was not built "wrong"; the dedication moved while the building kept its geometry — or the account describes another building. The explanation must reconcile masonry, calendar and memory, not just name the discrepancy.

**Failure/uncertainty.** Yes. "The evidence supports X; the record cannot be fully reconciled" is a legitimate outcome; the patron receives an honest answer rather than a comfortable one.

**Ending.** A correction or annotation appended to the account; a small physical repair; a conversation with the oldest monk that restores some memory to the record.

**Replay potential.** Observe on another feast day; examine a second window; a variant in which glazing error, not dedication, is responsible.

---

## 6. A reusable scenario framework

The repository's `GAME_DESIGN.md` already sketches the right contract. My contribution is the system/content line — what should be reusable engine, what should be case data, and what should not be built yet.

| Primitive | Where it belongs | Status |
|---|---|---|
| Clock/hours/phases/curfew/daylight | **System** | Exists; needs rate, waiting, perception cues |
| Rooms, anchors, portals, doors, route distances | **System** | Exists |
| Actor identity, duty, route, availability, custody | **System** | Partially (one routine); needs multi-actor with continuous routes |
| Access/permissions (duty, role, purpose, egress) | **System** | Rule vocabulary exists; canonical application new |
| Observation (perceivable condition, place, time, modality) | **System record + case data** | New record type; case-authored content |
| Claim (speaker, wording, time scope, certainty, referenced event) | **System record + case data** | New; must never promote to truth |
| Physical-effort crediting ("you were there, on foot") | **System** | Exists as passage tracker; generalize |
| Sound perceptibility (could this be heard here, then?) | **System query + case data** | Acoustic model exists; expose as evidence |
| Contradiction links | **System structure + case data** | New, small |
| Hypothesis / provisional account | **System + case data** | New, bounded; structured phrases |
| Accepted-account evaluation | **System evaluator + case rules** | New; authored constraints only |
| Events (preconditions, participants, time, state) | **Case data** | New; no arbitrary expressions |
| Documents/exhibits | **Case data + shared readable-object format** | New |
| Variants (bounded, validated) | **Case data + system seed/version** | Later; after two fixed cases |
| Save (scenario id/version, clock, actor progress, custody, observations, hypothesis) | **System** | Versioned save exists; extend |

Principles: add a primitive only when a case needs it; keep the condition/action vocabulary closed; scenario data must not be able to lie about the world (no fake traversals, no fabricated observations); every accepted conclusion needs at least two independent support paths; the evaluator returns *what is missing*, never *where to go next*.

---

## 7. Notebook critique and alternative

**Current state (native `KnowledgeState` + HUD notebook):** an ordered list of canonical discovery IDs with title, place, "seen", optional "reading", and optional "told by". It is a **collection log**, and it is honest about that. But it has five structural problems for the intended game:

1. **It flattens evidence kinds.** An observation, a document statement and a person's claim all appear as the same kind of entry. The game's core pleasure — telling these apart — is invisible.
2. **"Reading" scribbles the conclusion for the player.** It hands over interpretation at the moment of discovery.
3. **No time axis.** Claims are about hours, routes and windows; the notebook has a timestamp but no way to *see* time.
4. **No player input, no uncertainty, no revision.** The player cannot mark "I doubt this," "he may be mistaken," or "this conflicts with what I saw."
5. **It grows as a list, not a structure.** The abbey is a graph; the notebook is a receipt.

**Recommended alternative — three surfaces, one folio, minimal UI:**

- **Register (default view).** Entries carry: what kind (I saw / I was told / the document says / I measured), who, when (day + office + approximate hour), where, and the player's own mark — *accept / doubt / unresolved*. Sorted by time or place. This is the one surface that must be excellent.
- **Hours strip.** A small day-band showing offices, meals, curfew and the player's known events; claims can be pinned to it; conflicts become visible without the game announcing them. This turns the horarium into a reasoning tool rather than a HUD ornament.
- **Account composer.** The conclusion: a short set of structured clauses ("the bell was rung at ___", "the person who used the hour was ___", "the record is unreliable because ___") plus an optional free note. Feedback names missing support. Never names the next room.

Rules: the world remains the primary interface; the folio opens over gameplay but the player adds entries from the world with one key; no auto-summary, no auto-solve, no completion counters, no quest markers; an entry can be revised later; unresolved entries are legitimate. Think *marginalia in a monastic register*, not a case board.

---

## 8. Canonical hours as a narrative mechanic

**Legitimate effects.** Who is where; who may speak and when; which doors are barred and when egress is safe; meals and fasting; work noise vs silence; chant and bell as time signals; darkness and lamp-lighting; witness reliability (what a person could see at that hour); travel opportunity (route length vs interval); evidence visibility (frost, light, crowd); appointment windows (the cellarer's round, the infirmarer's visit).

**Organic uses.** An office empties the cloister but fills the church: the best time to inspect something is often the worst time to ask someone. Work noise covers a conversation; night silence carries it. Light makes some pages readable and others not. The procession makes the whole community both visible and unavailable. A storm makes the bell inaudible and the tracks visible.

**How it becomes tedious.** Waiting with nothing to do; a hidden timer; discovering the one window has closed and reloading; running the same route to catch a person; hours used only as locks; acceleration that lets the player skip past content; a clock so fast that reading is punished.

**Mitigations.** Diegetic waiting at benches with ambient change; appointments instead of windows ("the cellarer will see you after Terce"); evidence redundancy and alternates for every missed window; no irreversible failures in case one; "attend the next office" as a legitimate strategy; a clear but atmospheric sense of the approaching hour (light, lamps, bell, distant chant, people moving); time advances coherently when menus open; a bounded fast-forward that cannot fabricate observations.

---

## 9. Secrets and optional discovery

Categories worth finding, and what each changes in the player's head:

- **Architectural layers** — blocked openings, repairs, reused stone, changes in floor level: these rewrite the building's history and sometimes routes.
- **Institutional memory** — odd measurements, names in glass, a chant text no longer sung, an anniversary nobody explains: these rewrite the community's history.
- **Manuscript history** — pressmarks, repairs, corrections, a leaf whose hand differs: these rewrite authorship and custody.
- **People** — a skill, a private devotion, a correspondence, a kindness: these rewrite motive and trust.
- **Symbols** — masons' marks, painted texts, apotropaic marks: these rewrite who built, feared and believed.
- **Land** — boundaries, mills, leases, old paths: these rewrite what the abbey owns and owes.
- **Restricted knowledge** — always spoiler-gated; never a default discovery.

Rules: no counters, no map icons, no "X/Y collected"; each discovery is unique, persistent, and cross-referable in later cases; a discovery should change at least one prior interpretation; some remain unresolved forever, and that is honest.

**Novel-derived discoveries — SPOILER-SENSITIVE.** Fixed novel secrets should exist only behind an explicit spoiler level and chapter range, clearly named at opt-in, and never as the default onboarding route. The current proof's novel-derived route is a technical achievement, not a model for first contact. Discussing which novel structures to make playable should happen in a separate, spoiler-labelled council session with someone who has finished the book.

---

## 10. Historical authenticity triage

Use the repository's own taxonomy rather than a single "accurate" label. For my scenarios:

- **Novel-supported:** the abbey, church, cloister, scriptorium, library-as-place-of-books, canonical hours, processional life, the material texture of monastic work. These are atmosphere and constraint, not plot.
- **Historically supported:** the Rule's rhythm of *opus Dei*, *lectio*, and *labor*; obedientiary offices (cellarer, sacristan, cantor/armarius, infirmarer, hosteller, porter); monastic timekeeping by bells, sundials and water clocks; Romano-canonical *inquisitio* (a judge investigates, examines witnesses and documents; reputation and oath matter as evidence); book production practices such as quire structure, catchwords, correction, and exemplar-based copying; cartularies and obedientiary accounts; the monastery as an economic and hydraulic organism. External sources I checked include the Rule of St Benedict summaries; scriptorium/book-production material (including the *pecia* system); canon-law procedure studies; obedientiary/accounting guides; and monastic timekeeping discussions of bells and early clocks.
- **Original fiction (my scenarios):** the specific events, people, documents, exhibits, and conclusions. The boundary walk in a Ligurian house, for example, should be marked as design fiction unless a source is chosen; perambulation is well attested in some regions but must not be assumed universal. Winged altarpieces, English-style manorial customs, or northern European bells must not be imported merely because they existed somewhere.

Rule: historical authenticity should constrain **means and texture** (what materials, roles, documents and procedures are plausible) and should never be an excuse for a lecture or for rejecting a story that fits the world. Provenance belongs in the optional "basis" panel, not on every prop.

---

## 11. Lessons from other games (mechanisms, not clones)

- **Outer Wilds** — knowledge-gated progression and one clock that organizes the world. Lesson: the player's own understanding, not an inventory, should open access; the game's log should record what you learned without solving it.
- **Return of the Obra Dinn** — confirmation economy: the game withholds confirmation until a group is right, which preserves uncertainty and prevents brute force. Lesson: confirm conclusions in supported clusters, not per fact; never add a magic vision that replays the past.
- **Her Story** — the player's synthesis is the ending; the game does not confirm every reading. Lesson: allow unresolved and partially wrong conclusions.
- **The Case of the Golden Idol** — structured sentence-building makes evidence actionable. Lesson: borrow the structured conclusion, not the frozen tableaux; this game's scenes are alive and timed.
- **Pentiment** — historically situated roles; time skips; incomplete knowledge. Lesson: the player's role should shape what they may ask and where they may go; community memory changes across time.
- **Heaven's Vault** — translation ambiguity as play. Lesson: textual uncertainty is allowed, but never make Latin competence the gate.
- **Shadows of Doubt** — schedules make alibis, but unchecked generation makes contradictions arbitrary. Lesson: authored causality first; procedural variation only inside validated graphs.
- **Papers, Please** — documents as rules create tension. Lesson: inspection can be gripping, but avoid rote verification loops.
- **The Forgotten City** — same people, same hour, repeated observation. Lesson: time repetition is a powerful observation tool, but it should be one case's structure, not a universal mechanic.

---

## 12. WHAT WE MAY BE GETTING WRONG

1. **Accuracy is crowding drama.** The reconstruction is meticulous (0.42 m/pixel, 56 rooms, claim IDs), but fidelity of *means* is not the same as compelling *stakes*. A historically perfect granary will bore if nobody in it wants anything.
2. **The abbey is still too static.** Three stable people plus one routine and a synthetic crowd do not make an inhabited community. Ambient work, animals, light, weather, and small changes between cases are not polish; they are the difference between a diorama and a world.
3. **Documents are over-served relative to place.** The manuscript competencies are excellent, but the unique evidence of this project is time, sightline, sound, route and threshold. If the first cases are page-comparison puzzles, the game will read as a field school with walking.
4. **Canonical hours can become a gimmick.** Used only as locks, they produce waiting and reloads. Used as meaning — who can know what, when, from where — they are the best idea in the project.
5. **Reverence for the novel may be limiting originality.** The safest original case is one that flinches from its own drama. The abbey can tell stories the novel did not, with their own emotional register, without pretending to be canon.
6. **The player role may be too passive.** "Invited collator with limited authority" is elegant, but agency needs stakes: a reputation, a promise, a person you are responsible for, a record you will have to sign. Curiosity alone does not carry four hours.
7. **Safety may be flattening tension.** "No irreversible failure" is right for access and evidence, but if nothing can be lost — trust, time, a kindness, a hope — deduction has no weight. Uncertainty is the tension; design it deliberately.
8. **Whole-world fidelity may be premature and spoiler-risky.** The library labyrinth is both expensive and the most spoiler-loaded space in the reconstruction. Prove a corridor and a reading stand first; do not migrate the whole Aedificium to earn credibility.
9. **Case continuity is undefined.** Multiple original cases over one shared world raise an immediate question: what persists, what resets, and what does the next case assume the player knows? Without an explicit continuity model, the fiction will fragment.

---

## 13. Things we should NOT build

- **Combat, weapons, stealth violence** — incompatible with the identity and the source; deletes the game's claim to be about understanding.
- **XP, levels, loot, crafting trees** — imports a reward grammar this game is explicitly replacing.
- **Quest markers and objective arrows** — converts spatial reasoning into following.
- **Detective vision / replay-the-event powers** — removes the entire epistemology of testimony and trace; the current proof's physical-effort rule is the opposite and should stay.
- **A universal clue-combination grid** — brute-force pairing destroys attribution and certainty; conclusions should use structured, authored relations.
- **Procedural case generation (now)** — arbitrary variation destroys authored causality; generator research follows two playtested fixed cases.
- **A full monastery-management sim** — busywork, enormous scope, and it competes with the investigation.
- **A complete NPC social simulator / 60 monks + 150 servants simulated** — cost without legibility; three to six credible actors per case.
- **Latin or palaeography gates** — evidence must be readable; difficulty is interpretation, not erudition.
- **Morality meters, alignment, "choose suspect A/B/C" endings** — false precision; support partial and uncertain accounts instead.
- **Collectible counters and completion percentages** — turns discoveries into Ubisoft chores.
- **A novel adaptation campaign as the default product** — spoiler hazard, passive following, and it would subordinate original play.
- **Voice-acted everything** — cost, localization, and it fights the manuscript aesthetic; text and ambient audio are the voice of this abbey.
- **Micro-simulations that don't feed evidence** — fluid physics, cloth, full weather; use traces and states.

---

## 14. Recommendation

### GAME THESIS

*The Abbey Project* is an anthology of authored historical investigations set inside one continuously simulated monastery whose hours, duties, thresholds, sightlines, sounds and documents are all real systems. The player is not a detective with powers but an invited outsider with a role, a notebook and limited access, who learns the institution well enough to explain small human and institutional anomalies — a failed bell, a doubtful sighting, a disputed record — by walking, waiting, listening, reading and comparing. The reward is not treasure or rank but the ability to give a supported account of what happened, to know the difference between what was seen, what was said and what was written, and to live with the parts that cannot be known.

### PLAYER PROMISE

> "When you play this game, you will learn an institution the way its own members know it — by keeping its hours, walking its routes, reading what it keeps and doubting what it says — until you can explain something no single witness could, and you will know exactly how much of your explanation is certain."

### BEST PRODUCT STRUCTURE

**Authored investigations on a living horarium** (Structure A), with a persistent institutional season between cases and free study as the hub. Case-based play is the product; the season is the connective tissue; novel-derived episodes are optional, spoiler-labelled and structurally separate.

### THREE SCENARIOS TO PROTOTYPE

1. **The Bell Before Lauds** — proves time, routine, sound and attributed testimony.
2. **The Doors of the Procession** — proves access, collective movement, sightlines and threshold reasoning.
3. **The Chapel and the Wrong Sun** — proves the abbey as a measuring instrument: architecture, light, calendar and document together.

The already-scheduled *Leaf Before Vespers* continues to cover document comparison and conclusion support; these three cover the pillars it does not. If Leaf were cancelled, substitute **The Third Ledger** for institutional/economy coverage.

### FIRST SCENARIO

**The Bell Before Lauds.** It tests the project's most distinctive claim — that time itself can be evidence — with the smallest new content surface: existing church, cloister, dormitory path and tower geometry; an existing bell asset; the existing clock, routines, acoustic spaces and save; a handful of original people. If it fails, it fails informatively: the question will be whether the player can perceive time, not whether the abbey is worth building.

### SYSTEMS IT PROVES

Only these: an advancing clock with diegetic waiting; office/phase signals; multi-actor routines with continuous routes and duty-based availability; access windows with safe egress; perceptible sound events with transcripts/visual alternatives; observation-versus-claim records with attribution, time, place and certainty; a structured conclusion evaluator that reports missing support; case-aware save versioning (clock, actor progress, custody, observations, provisional account). Explicitly not proven by this case: whole-world streaming, the library, procedural variants, large crowds, weather simulation.

### WHAT TO POSTPONE

The full library/Aedificium migration; the 46-presentation population as anything but a benchmark; procedural case variants; whole-abbey navigation AI; seasons and era overlays; weather as a simulation (use states and traces); multiple simultaneous cases; voice acting; the complete document corpus; the heavyweight browser reference's remaining systems; and any new character pipeline beyond the fitted templates already available.

---

## 15. Comparison matrix (top five)

Scoring 1–5. **For implementation risk, 5 = highest risk** (lower is better); all other columns, higher is better.

| Scenario | Distinctive | Hist. fit | Uses abbey | Reasoning | Emotion | Hours | Replay | Leverage | Risk |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Bell Before Lauds | 5 | 5 | 4 | 5 | 4 | 5 | 3 | 5 | 3 |
| Doors of the Procession | 4 | 4 | 5 | 5 | 3 | 4 | 3 | 4 | 3 |
| Chapel and the Wrong Sun | 5 | 4 | 5 | 4 | 3 | 3 | 4 | 3 | 4 |
| Third Ledger | 3 | 5 | 4 | 4 | 3 | 3 | 3 | 4 | 3 |
| Name on the Obituary | 4 | 4 | 4 | 4 | 5 | 4 | 3 | 3 | 3 |

**Judgment, not sums.** Bell and Procession are the two lowest-risk, highest-fit concepts; Bell edges ahead because canonical hours are the project's most underused and most distinctive asset, and because its evidence classes span sound, time, trace and testimony in a small footprint. Chapel has the highest ceiling — a mystery whose witness is sunlight — but carries real risk: light calibration, seasonal timing, and the temptation to become a physics puzzle; it should follow, not lead. Third Ledger is the safest and the most conventional; it is excellent as a later institution case and a substitute if documents are needed early. Name on the Obituary has the strongest emotional pull and deserves a later slot once the cemetery, calendar and family material can be authored carefully. Bell first; Procession second; Chapel third; then choose between Ledger and Obituary based on what the first three teach.

---

### Closing notes

- **Role placeholder:** the assignment field in my brief was empty; I adopted the Systems & Structure lens. If a different role (literary, historical, art, production) was intended, this report should be re-scored from that perspective.
- **Spoiler statement:** this report deliberately avoids all novel outcomes, deaths, culprits, solutions and late revelations; novel-derived playable structures are named only as a spoiler-gated category. It is written to remain safe for a reader who has not finished *The Name of the Rose*.
- **File:** saved as `.local/story-council/2026-10-02/systems-and-structure.md`. No repository code, data or canonical documentation was modified.
- **Fellow council files in this folder** (`council-generalist-systems-designer.md`, `unassigned-role.md`) were left untouched; my recommendations were formed independently and may converge or differ from theirs.
