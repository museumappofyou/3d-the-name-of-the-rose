# Story Council Round 4 — Contrarian Creative / Product Director: the Library Labyrinth

**Date:** 5 October 2026
**Seat:** Contrarian creative and product director (GLM-5.3 Flash). The brief for the labyrinth everyone expects arrives to this seat with a fixed job: find out whether the famous room is a game, a museum piece, or a budget bonfire.
**Spoiler policy:** The owner has not finished the novel. This report states only facts the project already treats as public: the Aedificium's stack (kitchen/refectory, scriptorium, library), the restricted-access law, the librarian's custody, room counts and window counts, letters-and-verses as the classification the web reference already displays to visitors, supervised access rules, alabaster glazing, wind in the slits, the east stair. Nothing here reveals protected library secrets, concealed mechanisms, routes, late novel events, deaths, motives or outcomes. Where an incident is invented it is marked **ORIGINAL FICTION** and depends only on public premises. If any sentence here implies a plot event you cannot show the owner, it is a defect in this report, not a feature. The sealed-room question is discussed only at the level of access philosophy, never as a place, a name or a mechanism.
**Sources:** `README.md`, `docs/PROJECT.md`, `docs/GAME_DESIGN.md`, `docs/PLATFORMS.md`, `web/src/core/library.js`, `web/src/core/plan.js`, `web/src/ui/ui.js` (`drawLibraryMap`), `web/src/systems/notes.js`, `web/src/world/aedLibrary.js`, `web/src/world/soundscape.js`, `web/src/systems/audio/reverb.js`, `tests/library.test.js`, `council-generalist-systems-designer.md`, `story-council/round-3-adso/03-grok-contrarian.md`. No Round-4 report was read; the directory was empty when this file was begun.
**Repository effect:** this file only. No code, no canonical docs, no commit.

---

## The uncomfortable question first

**"If the library were not famous from The Name of the Rose, would we still think this was fun?"**

Honest answer, given what exists in the repository today: **no.**

Strip the halo and the brief reads like this: a top floor of small vaulted rooms in four similar towers, connected by an arbitrary adjacency graph, reached by one long stair, filled with books the player will mostly not read, gated by rules that mostly say no, and remembered for being complicated to walk. That is a dungeon with a better adjective.

Our own code agrees. `web/src/ui/ui.js` already answers the maze with a self-drawing chart — rooms fill in gold as you cross them, letters appear once seen, doorways become gaps — and `web/src/systems/notes.js` persists the fifty-six visit flags between sessions. That auto-chart is the most honest design document in the repository: the team admitting, in code, that memory alone cannot carry the supposed main attraction.

Now flip the question. What survives without the fame? A building whose access is an institution — the strictest permission structure in the abbey — and whose contents are a classification the player can actually learn, in days that ring on bells. That is potentially fun, and it is not a maze. Our own serious plans agree: `GAME_DESIGN.md`, `systems-and-structure.md` and `council-generalist-systems-designer.md` each demote the labyrinth as "spoiler-adjacent, expensive and not required for meaningful play," and Round 3's five reports concluded: prove a corridor and a reading stand first. The current direction re-promoted the famous room; this report asks it to pay rent.

It should also admit what the fascination has cost: the web reference received a 56-room tessellation, letters, verses and per-room holdings while the native product — the thing that ships — still has six cells and no investigation. The most famous space is the least built, the most spoiler-loaded and the most expensive. **The library's fame is a marketing fact, not a design argument**, and everything below survives that question or is recommended for the cut.

---

## 1. Why mazes usually suck — applied to this project

Maze designers are in love with the moment of mastery and forget the forty minutes of revulsion before it. Enumerate the failure modes and watch them land specifically here:

**Repetition.** `web/src/core/library.js` builds 56 rooms from roughly fifteen polygon archetypes rotated four ways; three of the four towers are the same room ring turned by 90°, on purpose, and `tests/library.test.js` blesses the counts. De-duplication must come from authored detail — exactly the cost the "full catalogue" dream refuses to pay. Many rooms, few kinds: players saying "wasn't I here?" is the maze's canonical failure.

**Backtracking.** One stair reaches the library (public institutional fact: the east tower is the only way up, over the scriptorium). Every return visit pays the full climb — 15.6 m of vertical across three storeys — to stand in a 15 m² room. Fine once; dead weight the fourth time. Backtracking earns its pain only when it carries new evidence, which is an authoring obligation, not a geometry bonus.

**Loss of orientation.** Eight blind rooms, sixteen inward rooms over a central well, and heptagonal halls whose seven faces are a symmetry engine for confusion. What this buys is cheap, and it is not mystery — it is *stress*, exactly the state our hour-gates (bells, offices, egress) manage carefully everywhere else in the game.

**False difficulty.** The killer. Our chart draws itself, and the internet draws it better: a fixed labyrinth is a week-one wiki article. Anyone who opens either converts the navigation challenge into a chore, and what remains is echo — repeating a solved route. A difficulty that dies on contact with a walkthrough is a fake, and fake difficulty in a game whose promise is *earned* understanding is self-betrayal.

**Memory burden.** The auto-chart exists because of this. Worse, the product's own design treats leaving and returning as a core verb (`PLATFORMS.md`'s save gates): a maze that decays between sittings is one you re-pay for every session.

**Walkthrough dependence.** The same point inverted: players who refuse the chart get lost enough to search; players who use it never face the challenge. Design cannot satisfy both halves. It can only stop selling navigation as the challenge.

**Motion sickness.** Pointer-lock first-person, narrow doors under a 4.9 m vault, windowless blind rooms, tight spirals — a vestibular risk profile we do not instrument, and `PLATFORMS.md` already records how dark the stair views are. Every identical-corridor minute compounds strain without adding an hour of distinct play.

**Visually identical corridors.** Repetition again, at rendering cost: the most expensive batched interior in the repo (`aed-library`) must be dressed per room to escape the hotel-corridor effect. Fifty-six distinct dressings is an unbudgeted art line item; undressed, it is a corridor of identical hotel rooms.

**Map-opening cadence.** `drawMappa` swaps the abbey plan for the labyrinth chart the instant you cross the threshold. Watch a real player: they press it like a minimap every thirty seconds. A promised loop that mostly lives in an overlay is not "architecture as evidence" — it is a pause-menu spreadsheet with stair lag.

**Novelty disappearance.** The first trip is awe, the second competence, the third a commute. Each visit must carry different *work*, or trips four and five never happen and the famous room becomes a hallway you bloat to reach.

**Player-class application.** Casual exploration players — a stated target for the web product — get nothing from a maze: no abbey visible, no people to meet, slow doors of text, the exit behind rather than ahead.

**Verdict of the section:** the *maze*, as a challenge, is the least defensible thing in this project's design surface. Every one of the failure modes above has a specific mechanism in our repo that either causes it or papers over it. We should not ship a challenge our own code preemptively solves, then tout it as our identity.

---

## 2. Is the labyrinth actually the game's moat?

The project's real mechanical assets, as the public design docs claim them:

1. **Spatially testing testimony** — a claim is checkable by walking.
2. **Canonical hours** — the day is social currency and constrains access.
3. **Acoustic evidence** — chant, bells, and transport-shaped listening.
4. **Recurring people** — the community's face is a schedule, not a cast-list.
5. **Mentorship (William/Adso)** — the famous pair, used as an investigative device.

**Argument that the library IS the moat:** it is the only place where all five load simultaneously in one bound space. Access is permission-shaped (moat #4: people), light and sound condition it (moats #2, #3), the building's identity *is* dated, classified, custodial architecture (moat #1), and entry is social: escorted or not at all (moat #5). If the moats are real anywhere, they compound here at their strictest concentration. Marketing shorthand writes itself: the abbey's rulebook, in the tallest room, under the slowest light.

**Argument that it is NOT the moat:** every compound above already exists, tested, in the *community* spaces the native proof actually runs — six cells, cloister, church, skull stair. A testimony check by window, a claim killed by a bell window, an acoustic finding during an office, a recurring porter, William's supervision — all demonstrable in the shipped slice. The library adds no new mechanism; it adds *venue cost* and a *spoiler-review surface* the whole codebase treats as radioactive (the web build excludes novel-specific topologies from public scope; `GAME_DESIGN.md` explicitly refuses to make the labyrinth a prerequisite for meaningful play). The function it performs — concentrated custodial stakes — can be had at the scriptorium desk for a fraction of the geometry.

**Which is stronger?** The second, narrowly — with an important concession to the first. The library is not the moat. The moat is *the abbey as a rulebook you learn to read in space and time*. The library is the most vivid chapter of that rulebook — the chapter where rules have teeth. It is a showcase, not the machine.

---

## 3. The library must earn its cost

What can happen in this library that cannot happen in another medieval building, a standard dungeon, a museum, or a normal detective game?

- **Another medieval building:** any building can hold books, windows and stair gaps; cloister and church already prove the abbey-as-witness.
- **A standard dungeon:** dungeons earn exotic geometry with combat. We have none and want none; without it, a dungeon is a corridor.
- **A museum:** exhibits are inert. They cannot be checked out under a rule naming borrower, escort and hour; no museum window contradicts an old man's story, because the museum has no schedule.
- **A normal detective game:** its books are inventory entries in a list. Ours are governed objects with custody chains, addresses by shelf, gradus and cabinet, and access windows.

The only answer that survives is **institutional strictness.** The library is the single place the abbey's whole contract with knowledge compresses into one floor: permission, escort, hour, custody, region of thought, chain of reading, and the learner's status. That is the distinctive game event set. If "it is complicated to walk" is the only remaining claim, we reject the design — and in practice, that is the claim most 56-room pitches reduce to.

The clause to make explicit: **the library earns its cost only if the institution is the mechanic.** If the player is having fun there, it is because they are momentarily inside the abbey's most governed hour — not because it is hard to find their way.

---

## 4. Attack the obvious designs

- **Hand-drawn map.** Attack: `drawLibraryMap` currently auto-completes from visit flags, which converts the promised chart into an expanding minimap — a save file wearing a costume. Salvage: the chart as *object* and *labour* is period-true and beautiful. Recommendation: a paper artefact William drafts, letters appearing only where the player has lit the room to read the arch — not where the body crossed. Remove the silent automatic fill; it has been quietly eating our design margin.
- **Catalogue puzzles.** Real, cheap, historically defensible (`claim_000423`, `claim_001153` already encode shelf-position lines the web build demonstrates on a shelf) — the only obvious design worth keeping near-intact. But keep it as a *tool*, not a puzzle genre: good when the player is checking a physical location, bad when it is a lock to brute-force before content.
- **Latin inscriptions.** Refuse as a gate. `GAME_DESIGN.md`'s accessibility line is already the policy: text must remain readable and translated, difficulty is interpretation, not Latin depth. An inscription is fine as a texture; it must never be the friction.
- **Hidden doors.** The strongest no in the whole list. Mechanically identical to secret walls we already declined to build, spoiler-loaded by construction, and the internet trivialises them. If access behind a threshold exists in play, it is access by *rule* and *permission*, not mechanism. Nothing here should depend on a lever concealed from our own spoiler-safety regime.
- **Route memorization.** Refuse as a mechanic. What survives is *name-memorization* — knowing that the room you want is the one the carrier calls "the cold corner" — which makes the chart optional without making the maze mandatory.
- **Book-fetch missions.** Fetch-quest smell with a medieval costume. Viable only when the fetch *is* the case — the route the book takes is itself the evidence, and the outcome depends on who could have touched it between shelves.
- **Restricted sections.** Good only when access is granted socially and *earned through information*, never by collecting a mechanical key. If the only reward on offer is "get the same key for a different door," the design has fallen.
- **Glowing clues.** Never. The product thesis states that discovery must not have an aura — and the library is exactly where players will expect their reward glow. Do not build the temptation.
- **Repeated visits.** Defensible and period-true only if each visit has a different *question*, not merely a different path. Re-walking with new knowledge is the real progression; re-walking as filler is anti-play.

**Consensus of this seat:** only the catalogue-as-address system and the access-by-permission loop earn real implementation. Everything else is costume if it cannot state what a case event requires it to do.

---

## 5. What would normal players actually remember?

Picture the actual customer — not the scholar on the team — describing the library to a friend. Under current direction the honest sentence is: **"there's this huge library, it's a maze, you get lost."** Generic; players say it with a shrug and change the subject.

Better: **"You slowly realize you can read the building."** Closer — and still incomplete: it never says why reading the building is a privilege.

The target, reachable because none of our competitors have the institutional layer:

**"The library was the one place where the abbey's rules were stricter than any guard — you had to be escorted, and you learned the rules, not the walls."**

Or rawer: **"You can't get into the library without a chaperone. Everything you learn about it, you learn by permission."**

The memory that survives is *permission*, *custody* and *the hour* — not geometry. Geometry memory decays in a day; institutional memory becomes a story. If the library's identity lives in the *rulebook* rather than the *labyrinth*, it earns its shelf-space in actual recall.

---

## 6. Should the player ever be completely lost?

**Position: once, briefly — at the first supervised entry, as a social state, not a spatial one. From then on, never; but uncertainty should be allowed to persist.**

The first visit is spent following the librarian and deliberately not learning the way — the character is not supposed to learn it, and the player's ignorance is the institution's promise. That is comfortable only if the game immediately restores orientation on the player's own terms: a chart to consult, letters to read at leisure, bells through windows that say which face of the world you face. What we never allow is **stranded**: no door closing behind you without a route out, no darkness you cannot survive by going back, no exit that is a mechanic the player was never given. That is a design crime by any modern accessibility standard.

The point: distrust of place is a *tone*, not a *difficulty*. Keep the tone; remove the trap.

---

## 7. Should William be there?

Four hypotheses:

- **With William:** the first supervised entry is the natural mentor scene — he obtains the permission, the player is led, and first-person Adso supplies the eyes and ears. A good scene.
- **Without William:** most subsequent visits. Adso's authority is local — he carries the book back, charts a corridor, listens to what is below, counts the hours. Without the mentor, a guided tour becomes an independent domain, and the "knowledge-based progression" promise pays out.
- **First with him, later alone:** the recommended arc, and the shape `GAME_DESIGN.md` already sketches: the mentor opens the door no human may open alone, then fades.
- **Rarely with him:** deadline-shaped, not design-shaped. If mentor content cannot be authored, the library loop must not require it.

**Recommendation:** first entry escorted by William, later entries almost entirely alone, and one arranged absence — a colleague escorts instead, and the contrast in escort behavior is itself information. The honest surprise: the best library moment of the game is the hour the player finds William's chart *wrong about a room he was told about, not one he walked* — and corrects it.

---

## 8. Should the labyrinth change?

Geometry: **no.** Fixed tessellation is a production feature (built, tested, tiled), a faithfulness feature (counts are public), and — contrary to heroic expectation — the *cheapest* thing to keep honest. Magical shifting corridors are an admission that nothing else in the design generates novelty.

Legal levers for change, all historically real:

- **Light:** alabaster glazing (already modelled in `materials.js`) transforms with hour and weather: the room that is neutral at noon is a warm lantern at dusk, and windowless rooms become classifiable by warmth.
- **Access windows:** the day's allowed regions differ by duty: collation days close one corridor, reading days another. Rules are the state machine; walls stay put.
- **Activities:** one visit is a supervised collation, another a shelf-census, another a retrieval, another a correction to the accounts — same rooms, different verb.
- **Objectives:** each entry has one. Never "see what's there."
- **Sound conditions:** wind in the slits (`soundscape.js` already has the bed) versus still frost versus the day-noise of the scriptorium below change how much the building says.

This is the whole "shifting labyrinth" the pitch can honestly promise: the same walls, seen under five different contracts.

---

## 9. Library tension

Do we need danger? **No — and we must not buy it.** Library danger is either stealth against occupants (already proscribed by the generalist report) or the novel's own lethal content (a late-event surface we may not touch). Designing "danger" here buys apprehension without a mechanic and is a spoiler magnet.

Tension instead comes from three places, all already in the repo:

1. **Epistemic stakes.** What the player reads can implicate a colleague. The cost of knowing is on the page before the player.
2. **Contractual stakes.** Being somewhere you may be only while someone whose name you carry has promised to come back. The escort's absence is the game's clock.
3. **Temporal precision.** The abbey runs to bells, and the library's danger is that none penetrate — only the contract. A player who realizes they have lost track of the hour has a genuinely scary moment that costs nothing to build.

---

## 10. Books

Most players will not read dozens of medieval texts. But the books are the point. The reconciliation is a *reading contract between layers*:

- **Object layer (always).** Chains, clasps, collation quirks, ex libris, marginalia, stains — inspectable physical properties, and where the room earns its content.
- **Text layer (selective).** A controlled number of *readable*, translated folios: short, contextual. Not "the full corpus" — a corpus tool is a separate product decision.
- **Excerpt layer (by occasion).** When a case requires a page, it arrives as an excerpt card with its own basis panel (a policy `GAME_DESIGN.md` already mandates), not a scroll of Latin.
- **Diff layer.** Two manuscripts of the same work side by side, differing in one place — the only multi-text mode that plays as *investigation* rather than literature.

The book as object of custody, not as paragraph — which is also the historical truth: a medieval library governed objects, not prose consumption.

---

## 11. Commercial product question

**Trailer.** One shot: alabaster light at an hour, a corridor of doors, the escorted walk with the librarian ahead. The library is a *look* that says "this is not a generic monastery." Do not voice the word "labyrinth."

**Screenshots.** The library's interior *is* the best screenshot material in the project: alabaster lit from a low sun, letters on the arches, the chart-parchment on a desk. Two interior shots, one with the parchment visible, one without. The parchment is the pitch: "the library's memory lives in what you write, not in a minimap."

**Store description.** Two sentences maximum, promising the contract, not the construct: permission, custody, classification as gameplay. Do not promise "mazes" or "confusion" — if the store calls it a maze and the shipped mechanic is an access ritual, reviews will read it as bait. What the store promises defines what playtesters will demand.

**Demo.** A demo of the library is a demo of second-act content without hours of preparation; it teaches neither the contract nor the abbey. Demo the public-area first case, with one screenshot and one hinting sentence — the demo's completion must not be contingent on the famous room.

---

## 12. Accessibility

The library is the project's most exclusionary surface, and the exclusions are all in the same list:

- **Poor spatial-memory players.** The maze is a tax; the chart-as-labour (§4) mitigates but cannot solve it. The real mitigations are naming — letters and verses as *names*, not shapes — and bell-cue orientation: chant audible through a window tells you which face of the building you are on. The repo has already prototyped that audio signage (`churchPaths.js`, the library's quiet state).
- **Visually impaired players.** Dark rooms and text-heavy classification are hostile by default. We owe transcripts for acoustic clues, captions for chart labels, and a spoken "letter and verse" hook so rooms identify themselves in audio, not graffiti.
- **Motion sickness.** The tight stairs and windowless vaults are the project's highest vestibular risk. Mitigations: wider FOV, reduced head-bob, a view that keeps an exit within eight seconds of sight, and a global "light the room" option with Adso's lantern as the diegetic device — no stretch of *forced darkness*.
- **Casual exploration players.** The web-explorer audience most needs protecting here: for them the library must be opt-in content, not required navigation, and the study path should let them inspect architecture without learning the chart.

**Rule:** identity is earned by what the library *does* — contract, custody, hours — not by how hard its floor is to walk. If spatial-memory-limited players feel punished by the maze, the maze is the defect, not the players.

---

## THREE RADICALLY DIFFERENT MODELS

### A. MAZE AS MAZE

The strongest traditional version. The library is the game's second act: entered under supervision once, then worked on the player's own terms. Walls, dark rooms, one stair, the chart as labour — the maze *is* the content, and "I have no idea where I am" is the intended product. In fairness: **this is the only version where the 56 tessellation earns its keep as challenge**, and its drama is *place-bound* rather than person-bound: the player's own confusion, named and mastered, is the hero's arc.

**Why it fails here:** every §1 failure mode lands; the auto-chart is the team's own bet against it; fixed geometry is wiki-food within a week; the §12 exclusion list is exactly this model's list; and it turns the most expensive batch of geometry in the repo into a pure-punishment surface. **A maze is a challenge that dies when the solution is written down — and ours would be written down by the first reviewer.**

### B. MAZE AS KNOWLEDGE SYSTEM

Navigation is deliberately easy — the chart is given — and the *classification system* is the game. Regions (the map-of-the-world the web reference publicly displays), letters, verses, the shelfmark grammar (`claim_000423`'s "position, gradus, cabinet"): the player learns an ordering system large enough to be called a world map. Navigation is not the problem; *naming* is.

**Why it's attractive:** the closest this maze comes to being *actually original*, and cheap in geometry — the classification data already exists (`library.js`). It converts navigation into identification.

**Why it fails:** it becomes a museum quiz with walls if the workload is static naming. Worse, it is precisely the surface our spoiler regime treats as most sensitive — building act two on the map-of-the-world ties our hands. **Take its best element (the shelf-address grammar) and refuse the rest.**

### C. MAZE IS NOT THE MAIN MECHANIC

The library is a **high-impact location inside the broader investigation game**: entered rarely, under permission, for specific authored purposes; its geometry is a *stage* priced per case, not a challenge owed to the tessellation. What it exports to the rest of the game is the shelf-address grammar and the custody chain — small, reusable, cheap, already prototyped. Everything inside its own walls is *scene*, not system.

**Why it's right:** it prices the library by *case*, not by *square metre*. It keeps the identity (restricted, escorted, slow, famous) while refusing the maze tax, and keeps the classification as a *tool* — usable at the scriptorium below in ordinary cases — instead of a puzzle that eats the second act. It is the only model in which the library pays for itself every time the player goes there.

**Judgment: choose C.** Keep B's grammar — the shelf address and the regional name system are the project's unique learning mechanic, and they are cheap. Refuse A except as a *single scripted first-entry beat* inside C: the escorted "you are not supposed to learn this" sequence, brief, atmospheric, unidirectional, never puzzle-shaped.

---

## FIVE "I HAVE NEVER PLAYED THAT" MOMENTS

Spoiler-safe; each exploits exactly one specific asset class; none depends on stealth, novel late events, or any concealed mechanism.

1. **ORIGINAL FICTION — Sext falls silent below, one desk does not.** The day's copy work stops for the office. From a library room over the scriptorium, the player *hears* the pens stop at the bell, desk by desk — and one desk keeps working. No door, no optics: sound arriving through a vault is testimony about a person's discipline. Exploits: stacked architecture, canonical hours, acoustic transport (all already in the repo).

2. **ORIGINAL FICTION — the blind room cannot testify.** An old lay brother claims he "saw the north road from the library window all that morning." The player is escorted into the room he names and finds the wall has no window: one of the eight blind rooms the public counts acknowledge. No Latin, no mechanism: the witness simply *cannot have stood where he said*. Exploits: window counts, testimony-as-claim, architecture — and the room is *shown*, not asserted.

3. **ORIGINAL FICTION — the address that does not exist.** A shelfmark line names place, gradus and cabinet. The player *matches it physically* — walks to the named cabinet in the region it belongs to, counts to the named place on the named gradus — and the shelf is empty. Not theft: a custody problem, because the loan register tells a different story. Exploits: classification (B's kept element), real catalogue discipline.

4. **ORIGINAL FICTION — the escort's route is a schedule.** The librarian's supervised walk is itself a time instrument, heard from two rooms away by the sound of his keys on straw (an acoustic path the soundscape layer supports). Books move only with him; therefore the route is the clock; therefore the route's absence is evidence. No stealth, no eavesdropping on plot — pure social acoustics.

5. **ORIGINAL FICTION — William's half-chart is wrong by one room.** William drafts his route chart from written accounts, not from his own feet, and one room is mistakenly copied from the description of another. The player, having walked the corridor and heard the bell through the window, has the standing to correct him — not as a gotcha, but as the first moment the game rewards *the player's own memory of place* rather than compliance. Exploits: mentorship turned inside out.

---

## TELL US WHAT TO CUT

If the current dream inventory is checked against what a case actually uses and what a small team can actually author with a proper provenance pass:

- **56 fully-dressed navigable interiors: CUT to 12–16 for the first library products.** Topology and counts stay 56 in the data file — already built, tested, cheap — with fully dressed interiors only where an authored case walks them. Undressed towers are walls with doors; the dream inventory pretends they are content.
- **Full catalogue.** CUT to one shelf's grammar. A catalogue implemented across all rooms is a spreadsheet engine with an art bill.
- **All books.** CUT to roughly twenty authored objects that answer case questions; generic books as dressed objects, not as text.
- **Exact inscriptions.** CUT. The translation rule makes exactness a cost with no play value; length and legibility are the product.
- **Complex mapping.** CUT the auto-fill; KEEP the chart as a labour object with the shelf-address grammar. A fully automated chart is a save-file plus a minimap.
- **Multiple secret systems.** CUT to zero in the default campaign. Anything concealed needs a spoiler-architecture pass the public product regime does not yet have; such systems belong in labelled opt-in episodes, not the spine.
- **Full NPC occupation.** CUT. The librarian plus one recurring carrier, both schedule-stamped, is enough. The 46-fixture is a benchmark, not a population, and the library's social world is a ruleset before it is a crowd.

---

# FINAL

## VERDICT

**SPECIAL SET-PIECE.**

Not primary pillar: the pillars are the abbey's ordinary reasoning contract, and the library is a *concentration* of it, not a different game. Not "reduce it further": the contract layer — custody, permission, shelf addresses — is cheap, novel and re-usable in every case, and never mentioning the famous room has a real marketing cost. Special set-piece with a strict budget: entered rarely, priced per case, geometry-audited per room, with the shelf grammar exported to the ordinary game.

## WHY PLAYERS WILL CARE

They will not care about a maze; they will care that this is the one game where the famous labyrinth is not a puzzle to defeat but an *institution to be admitted into* — where hours and permission are the actual walls, and the reward is the authority to say "I have been there" and mean a specific room, at a specific hour, on a specific errand, with another person's trust as the toll. What they will tell a friend is not "it confused me" but "you can't get anywhere in there without permission, and one bell later you have to leave" — and that sentence is true of no other game.

## WHAT THE LIBRARY IS NOT

Not a memory test. Not a difficulty claim. Not the moat — the moat is the abbey's whole rulebook read in space and time, which happens in the cloister and the church too. Not a stealth space, not a puzzle-box of doors, not a museum of Latin. And above all not an act of plot: it is a *place*, and its role in the novel's late events is not our product's business in the default campaign, whichever way the owner's reading ends.

## BEST EXPERIENCE MODEL

**Model C, with B's kept grammar.** First entry escorted, brief, un-learnable (the player is not *supposed* to know); a handful of further entries, each with one different verb; the shelf-address grammar reusable from the scriptorium below without ever entering the labyrinth; geometry fixed and honestly 56-audited in the data file, dressed per room by case; chart as a parchment artefact the player assembles with ink, not a minimap that fills itself from save flags.

## ADSO'S ROLE

Adso is the one who *carries the contract*: object-handler, lantern, notekeeper, the memory of the route the senior man did not walk. Playing him is valuable because the player's knowledge is *ordinary* — a boy trained by the abbey's hours, not a wunderkind of dead languages and lost rooms. He cannot talk his way in; he is allowed in as an errand and earns quiet standing by being reliable with the bell. The player's competence is permission-and-memory, not scholarship.

## WILLIAM'S ROLE

He is the door and the chaperone on the first entry, and the contrast in a later escorted absence. After that he should *disappear* from the library: the player's chart is their own work, and William's own half-chart — drafted from written accounts rather than walking — is wrong in one room the player can correct. If he appears inside the library again later, it is because an authoring event needs his authority, never because the loop needs his deductions.

## FIVE MEMORABLE MOMENTS

1. Sext, and one desk that does not stop (through the vault).
2. The blind room that cannot testify.
3. The shelf address that exists, and the book that does not.
4. The librarian's key-ring as the clock you can hear.
5. Correcting William's half-chart in ink, in front of him.

## WHAT TO CUT

Be ruthless: the full 56-interior dressing; the free-running auto-chart; extra secret-mechanism families; full corpus reading; any Latin gate; any book-fetch that is not simultaneously a custody case. Keep: the shelf-address grammar, the access-by-permission loop, the alabaster-and-hours change of mood, the blind-room testimony beat, and the 56-room topology *as data*.

## FIRST PROTOTYPE

**"The Supervised Hour."** One bound slice: a reduced rendered corridor of eight-to-twelve rooms drawn from `library.js` topology, one scripted supervised entry, the shelf-address chain (address → region → physical shelf), one blind-room testimony beat, one bell-gated exit. Build on the existing native domain services — horarium, portal states, access rules, knowledge state, passage tracking, room classification (`native/scripts/domain/`). One hour of play per tester. Success test: at least two of three playtesters describe the experience using a *contract* word (permission, custody, escort, hour) rather than a *maze* word, unprompted. Failure test: anyone asks for a compass, a minimap, or "was I supposed to get lost?"

## KILL CRITERIA

If any of these happen in playtesting, the library's importance drops one step: from set-piece with a reusable mechanic, to scene:

- Tester cadence: chart consulted more than once per five minutes of library play.
- Motion reports: more than one of three testers reports discomfort, or any tester quits a corridor on vestibular grounds.
- Recall: the single most-salient recollection across testers is "confusing," "complicated" or "big."
- Walkthrough dependence: any tester consults an external source to navigate within the first library hour.
- Accessibility fallback: the "always-lit" option must be enabled by more than one tester to finish the library content.
- Or the simple lurch: a tester asks "can I skip this?" and the answer is yes.

If two or more trip, **REDUCE IT FURTHER**: the library becomes a single scripted scene reached once in the campaign, and the shelf grammar migrates entirely to the scriptorium.

## STORE-PAGE TEST

**"The abbey's books live on a floor nobody visits without permission — and the hour you are allowed is the hour that proves or breaks what someone told you."**

No "maze," no "labyrinth," no "Terrifying Library." The famous room sells as *contract and consequence*, which is the only promise we can keep at production cost.