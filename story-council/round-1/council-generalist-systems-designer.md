# Story Council: Generalist / Systems-First Designer

**Date:** 2026-10-02
**Role note:** The brief's role placeholder (`[INSERT ROLE…]`) was not filled in, and no list of assignments was included. I therefore took the role of a **generalist, systems-first game designer**: someone who starts from what the simulated abbey can already do and asks what stories only it can tell.
**Spoiler status:** This report avoids novel plot. It uses the novel only for architecture, atmosphere, rhythm and social context. It names no novel event, culprit, death or revelation. Every scenario below is original fiction. One hygiene warning for the owner appears in §9.

---

## 1. What already exists, and what it is quietly good at

I read the five canonical docs, the native domain layer (`native/scripts/domain/`), the shared data (`horarium`, `routines`, `discoveries`, `interactions`, `sounds`, `locations`, `portals`, `anchors`) and the structure of `book_details/output` (hierarchy, access, movement and visibility graphs). I did not read or reproduce plot claims.

What is real today, not just planned:

| System | Current state | Narrative potential (underused?) |
|---|---|---|
| **Horarium** | Eight offices, 21 phases (night, waking, vigil, dawn, work, meal, supper, procession, retire), a curfew rule (a building barred from end of supper until Lauds), a daylight window, and a **sun model** (44.3° N, late-November declination) | **Very underused.** Late November gives about 9 hours of light. Darkness, low sun and short afternoons are dramatic resources, not just set dressing. |
| **Passage tracker** | A traversal counts only if the player physically and continuously approaches on foot. Teleport, study jumps and loads invalidate it. | **The single most distinctive mechanic in the repo.** It makes the player's own body a witness. A player can truthfully say "I walked it and it took this long," and nobody else's game can say that so cleanly. |
| **Knowledge state** | Allowlisted, idempotent notes stamped with day and hour, plus an optional `by` attribution and visited rooms | Correct foundation (attribution exists), but today it is a discovery log, not reasoning. |
| **Office transport + acoustic paths** | Continuous chant per office, 72 validated propagation-path comparisons and filtering through openings | **Underused.** "What could be heard from where" is testimony-grade evidence that almost no game simulates honestly. |
| **Routines / availability** | Condition-based presence (phase, office, time-after) at a slot | Seed of schedules. Presence is a social fact ("he is never here during work") the player can learn. |
| **Portals, access, safe egress, curfew** | Portal states, access rules, door fixture with curfew egress | Access can be *testimony* ("the door was barred, so how?"), not just a lock. |
| **Darkness + lantern** | Per-room darkness, indoor eye adaptation, a player lantern | Night evidence and witness reliability: who could see what by what light. |
| **Book-derived visibility graph** | Typed observer→observed sightline relations with certainty | A ready vocabulary of vantage points the reconstruction already respects. |
| **Provenance taxonomy** | Novel canon / textual inference / historical reconstruction / original fiction, plus an optional "basis" panel | A real differentiator. It can also be a source of in-world play (see §8). |
| **Versioned save** | Clock, knowledge, portal states, truncation recovery | Prerequisite for multi-day inquiries. |

**The answer to "what stories can only this abbey tell":** stories where the decisive fact is *perceptual and physical*. These are questions like "Could a person standing *there*, at *that* office, in *that* light, actually have seen or heard *that*?" Stories in which the player can **re-perform** a claim with their own body and get a measured, honest answer. Ordinary adventure games fake this with authored "aha" triggers. This project has the bones to actually compute it: sightlines, acoustic paths, sun position, darkness, traversal time and the passage tracker.

That is the game's moat. Most of what follows tries to put it at the center.

---

## 2. Evaluating the current thesis

> *"Historical environmental investigation through knowledge, access, architecture and time."*

**What's right:** it rejects combat, loot and RPG drift, and it names the right materials.

**What's missing:**

1. **People and stakes are absent from the sentence.** Knowledge, access, architecture and time are all *instruments*. Nothing says why the result matters to anyone. A thesis without a person who will be harmed or helped by the player's conclusion produces museum play.
2. **"Investigation" pulls toward crime.** The abbey's richest drama is institutional: memory, obligation, reputation, custody, commemoration. A crime frame pushes every case toward "who did it."
3. **It describes the player's activity, not their product.** The game becomes much clearer once you decide what the player *makes*. My answer: **a written account that enters the abbey's record and changes what happens to someone.**

**Proposed reformulation:**

> *You reconstruct what actually happened in a living abbey by testing people's claims against the building, the hours and the record, and you write the account that decides how the community remembers it.*

---

## 3. Four product structures

### A. The Casebook (current recommendation)
- **Fantasy:** a learned visitor solves a sequence of separate authored inquiries in one consistent abbey.
- **Session start:** a case card or arrival; one question.
- **Loop:** orient → observe → depose → experiment → draft account → submit.
- **Knowledge:** per case, plus a slowly growing "abbey literacy" that carries over.
- **Time:** each case spans 1–2 days and uses the horarium locally.
- **NPCs:** a small authored cast per case; recurring residents can reappear.
- **Architecture:** each case uses a different corner of the abbey.
- **Ending:** a submitted account, evaluated.
- **Replay:** low per case, high across cases.
- **Novel relation:** separate opt-in episodes.
- **Strength:** bounded, testable, shippable incrementally.
- **Weakness:** episodic resets weaken emotional continuity. Each case must re-establish stakes, and "another case" can feel like a job.

### B. The Visitation (single bounded campaign) — *my favorite*
- **Fantasy:** you are the notary accompanying a visitor sent to examine this house for one week. Your register becomes the official findings. The community knows you are writing things down.
- **Session start:** each day begins with a bell and a short list of matters raised: complaints, discrepancies, petitions from the gate.
- **Loop:** take depositions (attributed by nature), check them against the building and the hours, follow threads, and choose which matters to pursue with limited days.
- **Knowledge:** many small inquiries (10–40 min each) share people and places, so evidence from one matter becomes context in another. You learn the community, not just a case.
- **Time:** the week is finite. Hours determine who can be questioned (silence rules) and what can be observed. You cannot pursue everything.
- **NPCs:** the same 8–12 residents recur across matters. Their reputations, relationships and guardedness compound. Social reasoning finally has depth.
- **Architecture:** matters are distributed so the player learns the whole abbey over a week.
- **Ending:** the player writes the findings, a structured report with stated confidence. Epilogue cards show what the visitor did with it and whom it touched, including the effects of wrong or omitted findings.
- **Replay:** high. Choosing which matters to pursue, and coming to different findings, gives genuinely different reports.
- **Novel relation:** none required. It runs on a declared independent date. The novel supplies architecture and texture.
- **Strength:** coherent stakes (your pen has power), diegetic notebook (the register), natural reason for limited authority *and* access, and a frame for many small cases rather than a few huge ones. Visitations are a **HISTORICALLY SUPPORTED** institution; recorded findings (*comperta*) survive from late-medieval visitations. Whether *this* house in *this* decade would be visited, and by whom, must be decided and recorded as reconstruction.
- **Weakness:** needs 8–12 credible persistent people, which is expensive. A week of interlocking matters is a hard authoring and validation job. It also risks feeling like an audit.

### C. The Seasons of the House (returning resident)
- **Fantasy:** you are a junior officer of the house (the guest-master's deputy, say) and return to the abbey across four seasons over a year.
- **Session start:** a season chapter. The abbey has changed: repairs, new arrivals, snow, harvest, Lent.
- **Loop:** live the role lightly, notice changes, follow one seasonal question per chapter.
- **Knowledge:** accumulates over the year. Seasonal comparison is itself evidence: the sun reaches somewhere in June that it never reaches in November.
- **Time:** both canonical hours *and* liturgical/agricultural seasons matter.
- **NPCs:** you belong to the community and relationships have a year to grow.
- **Architecture:** the abbey visibly changes, so its layers become legible.
- **Ending:** a year's closing chapter. Each season closes its own question.
- **Replay:** moderate.
- **Strength:** emotional continuity and an abbey that isn't static. It uses the sun model brilliantly.
- **Weakness:** four lighting and seasonal states of the whole abbey is a huge art cost. The "role" risks chores and management sim.

### D. The Inquest of a Single Day
- **Fantasy:** one day in this abbey is disputed. The whole game examines that one day from many testimonies and physical traces until you can narrate it hour by hour.
- **Session start:** the morning after. The day's traces are fresh; people are scattered.
- **Loop:** collect accounts, place them on a canonical-hour timeline, re-walk routes, stand at vantages, and resolve overlaps and gaps.
- **Knowledge:** one ever-denser chronology.
- **Time:** the *past* day is fixed. The present day's hours govern who you can reach and what light you have to re-test vantages.
- **NPCs:** dozens of partial witnesses, each with a narrow, honest slice.
- **Architecture:** central, because every claim is a place plus an hour.
- **Ending:** a complete hour-by-hour account, checked in sections.
- **Replay:** low after solving. Its value is the single deep experience.
- **Strength:** the purest use of the moat (sightlines, sound, traversal). Very distinctive.
- **Weakness:** one huge interlocking truth is brittle. Many witnesses means many authored people. It is all-or-nothing.

### Which I favor
**B, the Visitation, as the product, built out of A-style matters.** It solves the stakes problem (your report has consequences), the notebook problem (a register is diegetic), the "why won't the other forty monks talk to me" problem (only those called to deposition, or those whose office permits, speak to the visitor's notary), and the "many hours" problem (many small, interlocking matters over a finite week). Critically, it can be **prototyped as a Casebook**. Each matter is a self-contained inquiry, so the first one ships and tests on its own. D's "one day under a microscope" belongs *inside* a single matter, not as the whole product. C is a later expansion idea (a second visit in another season) once art cost is known.

---

## 4. Ten original scenario concepts

All are **ORIGINAL FICTION** set in the reconstructed abbey on a declared independent date. None uses a novel event, culprit, secret route or death. Historical practices are marked where used.

### 4.1 The Novice's Word
- **Premise:** A novice reports that during the Night Office he saw a named brother walking in the cloister with a light, when everyone should have been in choir. The brother says he never left his stall. The novice's future in the house now depends on whether he is believed.
- **Central question:** Could anyone actually have seen what the novice describes from where the novice says he stood?
- **Why this abbey:** The church, choir and cloister are already migrated, with night darkness, chant transport, lantern light and real sightlines through real openings.
- **Core evidence:** sightline, darkness, lantern light, sound of the office, choir seating, a guttered lamp, testimony.
- **Key systems:** visibility, darkness/lantern, office transport and acoustic paths, passage tracker, attributed claims.
- **Canonical-hour role:** essential. Only the night office reproduces the light and sound conditions, and the player must re-test at the matching hour.
- **Spatial role:** the player discovers that the reported view is impossible from the novice's assigned stall but possible from somewhere else.
- **NPC role:** separating honesty from accuracy. A truthful witness can misidentify, and a witness's account can incriminate the witness.
- **Player reasoning:** infer the *witness's* real position from what he saw; infer who could plausibly carry a light at that hour by permission.
- **Scope:** SMALL.
- **Originality:** the case is about the credibility of perception itself, not about who did something.
- **Leverage:** the existing slice footprint, chant, darkness, lantern and passage tracker.
- **Risk:** night play must stay readable. Too much dark-wandering becomes frustrating, and a single correct vantage risks pixel-hunting.

### 4.2 The Hour Rung Early
- **Premise:** The community was woken for the Night Office far too early. In the gap, a gate was opened and a cart left. The brother whose duty is waking the house is blamed for drunkenness or worse.
- **Central question:** How did the abbey lose an hour of the night, and did anyone profit from it?
- **Why this abbey:** The horarium, sun model and night sky give real temporal physics. Bell sound and the gate exist in the reconstruction.
- **Core evidence:** a graduated hour-candle stub, a new batch of candles from the cellar, a stargazing vantage, cloud on that night (testimony from those outside), the bell heard from various places, gate-keeper's account.
- **Key systems:** horarium, sky/sun, acoustic paths, routines, testimony, documents (cellar receipt).
- **Canonical-hour role:** the core of the case. The player learns how the waker reads the night.
- **Spatial role:** the specific vantage from which the waker reads the rising stars over a roofline; the bell's audibility at the gate.
- **NPC role:** pride, embarrassment, and an unrelated brother who noticed and kept silent because the early hour quietly suited him.
- **Player reasoning:** separate material cause (candle), environmental cause (cloud) and human opportunism.
- **Scope:** MEDIUM.
- **Originality:** the "crime scene" is time itself.
- **Leverage:** high. The horarium, sky, bells and chant transport exist.
- **Risk:** star-reckoning is esoteric. It must be taught through observation, not a lecture. Needs a convincing star layer in native.
- **Historical:** night-office timing by star risings is **HISTORICALLY SUPPORTED** (Gregory of Tours' *De cursu stellarum*, 6th-century Gaul). Graduated candles as time measures are historically attested in general. Their use in a 14th-century Italian house is a **reconstruction choice** to record.

### 4.3 The Silent Order
- **Premise:** During a silent meal, someone gave an instruction by hand-sign, and a cask was moved or a door left unbarred as a result. Every party agrees a sign was made; nobody agrees what it meant.
- **Central question:** What was actually asked, by whom, and who could have seen it?
- **Why this abbey:** The refectory has a reading at table, fixed seating and lines of sight across tables, and silence is enforced by hour.
- **Core evidence:** a sign vocabulary the player learns by watching, seating order, sightlines across the refectory, the passage being read aloud at that moment (a sign may have been a gloss on it), the physical result.
- **Key systems:** routines (meal), visibility, a small gesture-animation library, testimony, chronology.
- **Canonical-hour role:** meals and the Great Silence after Compline define when signs replace speech.
- **Spatial role:** who sits where and what each can see.
- **NPC role:** communication without words. The player watches residents sign to each other during silent hours and learns to read them.
- **Player reasoning:** decode an ambiguous sign in context; identify which pair of diners had a sightline.
- **Scope:** MEDIUM.
- **Originality:** a learnable silent language as a diegetic observation layer is, as far as I know, unused in investigation games.
- **Leverage:** routines and seating; needs new gesture animations (the existing nine task clips per template are a start).
- **Risk:** animation cost and readability. A tiny sign vocabulary (8–12 signs) is mandatory.
- **Historical:** monastic sign lexicons are **HISTORICALLY SUPPORTED** (Cluniac lists of about 118 signs; a Hirsau list of about 359). Their specific use in this house is a **reconstruction choice**.

### 4.4 The Unserved Pittance
- **Premise:** A village woman comes to the gate. Her late husband endowed an annual extra dish for the brethren in exchange for their prayers on his anniversary. This year the dish was not served and his name was not read.
- **Central question:** Why has the abbey forgotten this man, and was the forgetting an accident?
- **Why this abbey:** The kitchen, refectory, chapter house and cellar are all reconstructed, and a reading at table is part of the routine.
- **Core evidence:** the old and new commemoration calendars, the endowment charter, the cellarer's account, kitchen practice, the reading at chapter.
- **Key systems:** documents and comparison, routines, testimony, chronology.
- **Canonical-hour role:** medium. Chapter, meal and reading times show where names are read and food served.
- **Spatial role:** modest. Kitchen-to-refectory service, and where calendars are kept.
- **NPC role:** the widow's dignity; a copyist's embarrassment; a cellarer under pressure.
- **Player reasoning:** see that a feast-relative date was converted to a fixed date during recopying, and that the land funding the dish changed hands.
- **Scope:** SMALL–MEDIUM.
- **Originality:** the stakes are remembrance and prayer for the dead, a deeply medieval concern that is almost never the subject of a game.
- **Leverage:** existing spaces; mainly authored documents.
- **Risk:** document homework. It needs physical/place evidence alongside the calendars.
- **Historical:** pittances funded by benefactors and anniversary commemoration are **HISTORICALLY SUPPORTED** in general.

### 4.5 The Roll of the Dead
- **Premise:** A hired bearer arrives with a mortuary roll from a distant house, asking the abbey to add its entry and pray for the deceased named on it. The roll's previous entries, its seal and the bearer's account of his route disagree.
- **Central question:** Where has this roll really been, and who is the man carrying it?
- **Why this abbey:** The gate, guest house, stables and scriptorium play distinct roles in receiving a traveler and composing an entry.
- **Core evidence:** handwriting and ink of each entry, the order of houses, weather and road knowledge from servants, the bearer's boots and horse, the porter's log.
- **Key systems:** documents, testimony, routines (guest house), access (where guests may go).
- **Canonical-hour role:** light. The bearer leaves after a fixed office, which sets a deadline.
- **Spatial role:** what a guest can reach and see.
- **NPC role:** hospitality obligations constrain how hard anyone may question a guest.
- **Player reasoning:** detect an entry written by the same hand as another "house," and distinguish an honest bearer who took shortcuts from a fraud.
- **Scope:** MEDIUM.
- **Originality:** the evidence object is a moving, accreting document.
- **Leverage:** guest areas are not yet migrated, which is a real cost.
- **Risk:** palaeography as a skill check. Hand differences must be visually obvious and diegetically taught.
- **Historical:** mortuary rolls carried by hired bearers who collected *tituli* at each house are **HISTORICALLY SUPPORTED**.

### 4.6 Footprints Before Lauds
- **Premise:** On a snowy night, a guest who was never entered in the guest register is said by a servant to have slept in the abbey. The porter denies opening the gate. Fresh snow records movement for a few hours, then hides it.
- **Central question:** Did a stranger spend the night inside the walls, and how did they enter?
- **Why this abbey:** The enclosure, gate, stables, guest house and gardens are reconstructed, and the book-derived site already includes snow and late-November weather.
- **Core evidence:** footprints (number, depth, direction, sole shape), melt and new snowfall by hour, the stable straw, the register.
- **Key systems:** a new snow-trace layer, the horarium, darkness, testimony.
- **Canonical-hour role:** strong. Snowfall and melt change evidence on a clock, so a player at dawn sees what one at Terce cannot.
- **Spatial role:** reading tracks across the enclosure and noticing that they avoid certain sightlines.
- **NPC role:** servants versus monks, and who speaks to whom.
- **Player reasoning:** reconstruct a route from traces and infer which windows it avoided.
- **Scope:** MEDIUM.
- **Originality:** a perishable physical record that rewards early action without hard failure. A deposition remains available as a fallback.
- **Leverage:** needs a new trace/decal system; otherwise strong reuse.
- **Risk:** this is a hard timer in disguise, so it must never be the only route to the answer.

### 4.7 The Light After Compline
- **Premise:** The lamp-oil account for the novices' house is running far over its allowance, and a light has been seen there after the Great Silence. The novice master suspects disobedience.
- **Central question:** What work is so necessary to someone that they would break the night silence for it?
- **Why this abbey:** It uses the curfew, the darkness model and sightlines from the dormitory and cemetery.
- **Core evidence:** oil measures, soot, wax drips, wax-tablet scratchings, a sightline at night, the round of the senior who walks the house.
- **Key systems:** curfew/access, darkness/lantern, visibility, routines (the night round), documents.
- **Canonical-hour role:** essential. It only happens between Compline and the Night Office.
- **Spatial role:** the light is visible from exactly one route.
- **NPC role:** a humane truth (for example, a novice secretly writing letters home for lay brothers who cannot write) that the player can choose how to report.
- **Player reasoning:** infer the nature of the work from its traces, not from a confession.
- **Scope:** SMALL–MEDIUM.
- **Originality:** the "culprit" is doing good; the moral choice is in the report.
- **Leverage:** high (curfew, darkness, lantern).
- **Risk:** night stealth temptation. Do not build guard-avoidance (see §11).
- **Historical:** the Rule's provision for seniors who go round the house during reading is **HISTORICALLY SUPPORTED** (RB 48). The novice's motive is **ORIGINAL FICTION**.

### 4.8 What Came Back in the Reliquary
- **Premise:** A reliquary was lent to a neighboring parish for its patronal procession and has been returned. The sacristan swears that what lies inside is not what left, though the seals are intact.
- **Central question:** What exactly came back, and when did it change?
- **Why this abbey:** The church, sacristy custody, keys and the office of the sacristan are all spatially real.
- **Core evidence:** the authenticating label, the seal impressions, an inventory, wrappings, the parish priest's letter, the cleaning done before the loan.
- **Key systems:** custody/object state, documents, access (keys), testimony.
- **Canonical-hour role:** low to medium (when the sacristy is open).
- **Spatial role:** who could reach the reliquary between the inventory and the sealing.
- **NPC role:** faith and fear. The village's devotion and the abbey's reputation are both at stake.
- **Player reasoning:** the change happened *before* the loan, during cleaning, when two labels were swapped. The village is innocent.
- **Scope:** MEDIUM.
- **Originality:** it inverts the expected accusation against outsiders.
- **Leverage:** church areas already migrated.
- **Risk:** must avoid cynical "relics are fake" framing; it is about custody, not debunking.

### 4.9 The Measure of the Tenants
- **Premise:** The abbey's tenants delivered their grain dues in full by their own reckoning. The granary says they are short. Tempers rise toward refusing next year's dues.
- **Central question:** Is the abbey being cheated, or is it cheating?
- **Why this abbey:** The granary, mill, gate, outbuildings and the cellarer's routes give the economy a body.
- **Core evidence:** two measuring vessels, damp versus dry grain, the miller's toll, the cellarer's book, rain on the delivery day.
- **Key systems:** objects with measurable state, documents, testimony, weather.
- **Canonical-hour role:** low.
- **Spatial role:** where the grain was stored and how damp got in.
- **NPC role:** class: lay brothers, servants and tenants versus monks.
- **Player reasoning:** resolve that two "correct" measures disagree for physical reasons, and find who exploited the confusion.
- **Scope:** LARGE (it needs outdoor service areas migrated).
- **Originality:** economic justice told through physical measure, not ledgers alone.
- **Leverage:** low today; the service buildings exist only in the browser reference.
- **Risk:** accounting fatigue.

### 4.10 The Founder's Charter
- **Premise:** A neighboring lord disputes the abbey's right to a mill. The abbey produces an ancient founding charter. The visitor must certify whether the abbey's claim to antiquity holds.
- **Central question:** How old is this part of the abbey, really, and why does it matter that it seem older?
- **Why this abbey:** Its architecture can testify: building phases, reused stone, mason's marks and a blocked doorway.
- **Core evidence:** script and formulae of the charter, building joints, mason's marks, a reused carved stone, the necrology.
- **Key systems:** architecture inspection, documents, provenance "basis" panel used in-world.
- **Canonical-hour role:** minimal; low sun reveals tooling marks on one wall at one hour.
- **Spatial role:** reading the building as a document.
- **NPC role:** institutional loyalty; the elderly memory of the house.
- **Player reasoning:** the charter is a later "restoration" of a real but lost grant. It is both forged and true. Which matters more?
- **Scope:** LARGE.
- **Originality:** forgery of antiquity in good faith is a subtle, historically resonant moral problem.
- **Leverage:** it overlaps with the existing "Wall That Remembers"; merge them.
- **Risk:** too scholarly without the mill dispute's human face.
- **Historical:** monastic forgery or "restoration" of charters to secure rights is **HISTORICALLY SUPPORTED** in general. The specifics are **ORIGINAL FICTION**.

---

## 5. Deep dives

### 5.1 The Novice's Word

**Opening state:** At chapter, a frightened novice repeats his claim before the community. The accused brother is respected. The novice master asks the visitor's notary (the player) to establish what can be established before the house judges either of them. The player cares because a young person is about to be disbelieved or punished, and because the claim is testable.

**Investigation topology:**
- **Node: the claim.** What the novice says he saw, when (between psalms of the night office) and from where (his stall).
- **Node: the choir.** Stall assignments, the openings, what the choir can see of the cloister and in what light.
- **Node: the light.** Lamps lit at that office, lantern-carrying permissions, oil.
- **Node: the accused.** His stall, neighbors' testimony, his routine.
- **Node: the infirmary.** An old brother was sick that night; hot water and a light were fetched by permission.
- **Node: the novice's neighbors.** One noticed the novice's stall empty for a time.
- **Node: the re-test.** The player stands at the novice's stall at the night office and cannot see the cloister path. They walk until they can.

Every node is reachable from at least two others. The re-test and the infirmary's routine are independently sufficient to dislodge the first reading.

**Evidence classes:** testimony (with presence: who else heard it), vantage observation (performed), light (lamp count, lantern), routine (permitted night movement), physical trace (a scuffed threshold or wet stone from spilled water), chronology (the order of psalms).

**Contradictions:**
- The novice's description is vivid *and* his stall cannot see the cloister.
- The accused's neighbors confirm he stayed, yet someone with a light was in the cloister.
- The novice's neighbor says the novice left briefly, but the novice denies it.

**Architecture:** The choir screens, the transept openings and the cloister arcade define exactly one band of positions from which the path is visible. The book-derived sightline vocabulary and the native visibility check must agree.

**Time:** At the night office the lamps are lit and the chant masks footsteps. At Prime, daylight shows the same path is visible from many places. A player who re-tests in daylight will wrongly conclude the novice could see it, so the hour matters to the truth.

**NPC knowledge:**
- The infirmarian knows who fetched water, but not that anyone saw him.
- The novice knows what he saw, but not who it was.
- The neighbor knows the novice moved but is reluctant to inform.

No one knows the whole account.

**Discovery (optional):** why the novice left his stall (fear, illness, or slipping out to relieve himself), which deepens sympathy but isn't needed for the finding.

**Deduction:** The novice really saw a light-bearer, misidentified him in the dark by build and cloak, and could only have seen it because he himself left his place. The accused is cleared. The novice's honesty is real but his perception was wrong.

**Failure/uncertainty:** Yes. A player may clear the accused without establishing who the light-bearer was ("someone with a permitted errand, identity unknown"). That is a defensible partial finding. A player who reports "the novice lied" is wrong, and the epilogue should show the cost.

**Ending:** A short structured finding, three statements with confidence:
- what was seen
- by whom it could have been seen
- whom the evidence identifies

Then a separate *recommendation*: how the house should treat the novice. Two players with the same facts can recommend differently.

**Replay:** modest. A replay can follow a different route (infirmary first versus vantage first) and a different recommendation.

### 5.2 The Hour Rung Early

**Opening state:** The player is woken by the bell like everyone else. During the night office some brothers murmur that it is too early. By dawn the porter reports a cart left before light, and the waker is confined. The player has *lived through* the event. This is the hook: their own experience is evidence (passage tracker, day and hour-stamped knowledge).

**Investigation topology:**
- **Waker's method:** the vantage where he watches a named star rise over a roofline, and the graduated candle he uses when the sky is clouded.
- **The candle:** a stub in the waker's niche, and a new batch from the cellar that burns faster (thinner wick, different wax).
- **The sky:** gardeners and the porter say it was cloudy. Did the waker trust the candle?
- **The bell:** who heard it where. One witness swears it rang twice.
- **The gate:** the porter's account; who requested opening; the cart's owner.
- **The opportunist:** one brother noticed the early hour and said nothing because it let him finish a task before an expected inspection. This explains the "second bell."
- **The economy thread:** who bought cheaper candles, and why.

**Evidence classes:** the player's own lived chronology, physical object (candle), documentary (cellar receipt), environmental (cloud testimony, sky), acoustic (where the bell carries), testimony.

**Contradictions:** the waker is diligent and sober, yet wrong. The porter opened the gate "at the usual signal," yet it was early. Someone heard two bells.

**Architecture:** the waker's vantage, the bell's reach to the gate and the cloud-covered roofline.

**Time:** the case is about time. The player can test the candle's burn rate against the night (diegetic waiting) and can stand at the waker's vantage on a clear night to watch the star rise.

**NPC knowledge:** the waker is proud and hides that he relied on the candle. The cellarer bought cheaper candles to save money, and only knows the wax was cheaper. The opportunist's motive is ordinary and human.

**Discovery:** the old star calendar the waker uses, an institutional memory of the house's way of keeping time. That is a discovery that changes how the player reads every night afterward.

**Deduction:** A material cause (faster candle) plus an environmental cause (cloud) produced the error. The cart's departure was opportunistic, not planned. The waker is guilty of a pride-driven concealment, not negligence.

**Failure/uncertainty:** Players can land on "the waker erred" without finding the candle cause; that is a partial finding. Accusing the cart's owner of conspiracy is the wrong attractive reading, and the epilogue should show that cost.

**Ending:** a finding plus a practical recommendation (how the house should keep time). The player's recommendation can visibly change routine in a later matter, for example a second watcher at night. That is a lovely persistence payoff in a Visitation structure.

**Replay:** the opportunist thread is optional and a second playthrough can uncover it.

### 5.3 The Unserved Pittance

**Opening state:** A widow at the gate. She is not angry; she is ashamed to ask. That should hit harder than a body.

**Investigation topology:** calendar (the old and new necrology), endowment charter, the land, the kitchen, the reader at chapter, the copyist, the cellarer, the widow's own memory of the agreed day.

**Evidence classes:** comparative documents (old and new calendars side by side in place), testimony (widow, copyist, cellarer), routine (what's read at chapter), physical (the rent stored in the granary or not).

**Contradictions:** the widow remembers a day tied to a feast. The new calendar shows a fixed date, which this year fell on another day. The rent was paid, but the cellarer's account assigns it elsewhere.

**Architecture:** modest. Where the calendar is kept and read, and who passes between the kitchen and the refectory.

**Time:** chapter and meal times show where names are read and the dish is served. The player can witness this year's reading and hear the gap.

**NPC knowledge:** the copyist knows he converted a date and thinks he did it correctly. The cellarer knows the land changed hands. The widow knows the feast.

**Discovery:** other names silently lost in the same recopying. This is the strongest "secret" kind: it changes how the player understands the house's memory.

**Deduction:** a recopying error plus an administrative reassignment, neither malicious alone, together erased a man's commemoration.

**Failure/uncertainty:** blaming the cellarer alone is plausible and partly true.

**Ending:** a finding *and* a restorative act. The player can recommend restoring the name and see it read at the next chapter. That is a quiet, emotional resolution with no accusation needed.

**Replay:** low, but the discovered other lost names can seed future matters.

---

## 6. Reusable scenario framework

The existing contract in `GAME_DESIGN.md` is sound. Below are my additions and a split of what is reusable versus case-specific.

### Reusable systems (build once)

| Primitive | Why it is reusable |
|---|---|
| **Person** (stable ID, office/duty, routine, permissions, presence rules) | Residents recur across matters. |
| **Place / portal / route** (room IDs, travel lower bounds) | Already partly exists. |
| **Vantage** (a position with what it can see under which light and hour conditions) | **New.** It generalizes visibility into a re-testable record. Computed, not authored. |
| **Audibility** (what is heard where, per office and per opening) | **New** as a gameplay record. The data already exists in acoustic paths. |
| **Practice** (institutional rule: who carries keys, how the waker works, when silence holds) | **New and important.** Practices are learned once and reused across matters, forming the player's "abbey literacy." |
| **Deposition** (claim with speaker, question asked, place, hour, *who else was present*) | Extends `by`. Presence matters: people speak differently with a superior present or during silence. |
| **Experiment** (a player-performed test: walk, wait, stand, listen) producing a stamped observation | Builds on the passage tracker. The player's body as instrument. |
| **Object custody / state** | Exists in part through portals. |
| **Chronology** keyed to canonical hours | A shared timeline surface. |
| **Finding** (structured statement + confidence) and **Report** | The ending format. |
| **Consequence** (epilogue effects, persistent changes to routine) | Payoff across matters. |

### Case-specific content (author per matter)

- authored past events and their truth
- the specific documents and their text
- the specific claims and lies
- which findings are acceptable, partial or wrong
- the epilogue text

**Rule of thumb:** if a primitive would appear in three matters, make it a system. If it is a single case's twist, make it data.

---

## 7. The notebook as a register, not a quest log

### Critique of what exists

The current knowledge state is an allowlisted, idempotent set of discovery IDs with optional attribution and stamps. It is excellent infrastructure and a weak *experience*: notes are earned, not reasoned with. The doc's planned three surfaces (sources, comparisons, provisional account) are right. The risk is a clue-board UI that becomes the real game.

### My proposal: three pages of one book

1. **Depositions:** what people said, automatically attributed (who, where, when, who else was present). The player cannot edit the words, only annotate them.
2. **What I witnessed:** observations stamped automatically by the player's own body (passage tracker, vantage, hour). These carry a small mark meaning "you did this yourself," which is the game's strongest trust signal.
3. **Findings:** a draft report in structured sentences with confidence words: *"I saw / [person] says / it appears / I could not establish."* The player can be wrong and can revise until submission.

### Minimal comparison tools

- **Hour strip:** a horizontal day divided by bells, not clock hours. Place depositions and observations on it. Overlap and gap become visible without any "contradiction detector."
- **Map pins:** pin a vantage or route on the plan with the time it took.
- **Two-up compare:** place two documents side by side.

### What not to do

- no string board
- no auto-detected contradictions
- no "combine A+B" brute force
- no confidence meters

Check findings in **batches** (as *Return of the Obra Dinn* checks three fates at once) so guessing is unrewarding.

### Time spent in menus

The register should be quick to open and close. Make the abbey the place where reasoning happens: re-walk, re-stand, re-listen. The register only records.

---

## 8. Canonical hours as a mechanic

### What the hours can legitimately control

| Hours affect | Example |
|---|---|
| Who is where | Office, work, meal and night routines |
| Who may speak | Silence after Compline; reading at meals; only office-holders speak to visitors |
| Doors | The book-derived curfew rule already exists |
| Light | Late-November short days; lamps at night offices; low sun revealing surfaces |
| Sound | Chant masks footsteps; bells reach some places, not others |
| Witness reliability | Night perception versus day perception |
| Evidence perishability | Snow, soot, wet stone, a guttering candle |
| Opportunity | The gate opens at set times; the infirmary is busiest after meals |

### Tedium risks and mitigations

1. **Waiting simulator.** Allow diegetic waiting (bench, "wait until the next bell"). Keep the day short, with roughly 45–60 real minutes as a target to playtest.
2. **Missed-window frustration.** Every hour-dependent fact needs a second route: another witness, a record, or the next day.
3. **Too many phases.** 21 phases is right for simulation. For play, present the day as about 6 meaningful windows: night office, dawn, morning work, midday meal, afternoon work, evening.
4. **Clock management.** Never require the player to track decimal hours. Bells and light are the interface.
5. **Gimmick drift.** Not every matter needs time-critical evidence. *The Unserved Pittance* uses hours lightly, which is good contrast.

---

## 9. Secrets and optional discovery

Discoveries that change understanding, not collectibles:

- **Older layers:** a blocked opening, a reused carved stone, a change in masonry that dates a wing.
- **Institutional memory:** names lost from the necrology, an old timekeeping method, a forgotten endowment.
- **Practices:** the sign vocabulary, the waker's stars, key custody, the night round.
- **People:** a hidden skill (a lay brother who reads), a promise, a past posting elsewhere.
- **Sensory secrets:** a spot where the choir is heard perfectly from outside the church; a sunbeam that reaches an altar only in the last week of November (the sun model can compute this).
- **Local history:** a village's grievance about land, a road that once passed elsewhere.
- **Provenance itself:** the "basis" panel can become in-world. An old brother's memory of "how it was built" can be marked as an in-world claim that may be wrong, distinct from the developers' provenance labels.

Each discovery should either feed a later matter or reframe a past one. None should be counted or badged.

**Spoiler hygiene warning for the owner:** `docs/GAME_DESIGN.md` contains at least one sentence (the last paragraph of "Strong original cases") that alludes to a later element of the novel. I recommend you skip that paragraph until you finish the book, and that a future doc pass rephrase it. The browser reference and current altar proof also expose a novel-derived secret route, as the docs already acknowledge.

---

## 10. Historical authenticity

### Labels

| Element | Label |
|---|---|
| Abbey layout, building functions, enclosure, late-November weather, curfew on the main building, waking bell | **NOVEL-SUPPORTED** (book evidence files; exact geometry is reconstruction) |
| Eight canonical offices, chapter, reading at meals, silence | **HISTORICALLY SUPPORTED** (Rule of Benedict and customaries); exact times are reconstruction |
| Senior monks going round the house during reading | **HISTORICALLY SUPPORTED** (RB 48) |
| Star risings for night-office timing | **HISTORICALLY SUPPORTED** (6th-century Gaul); use in this house is reconstruction |
| Monastic sign lexicons | **HISTORICALLY SUPPORTED** (Cluniac tradition, widely spread); house-specific use is reconstruction |
| Mortuary rolls and hired bearers | **HISTORICALLY SUPPORTED** |
| Library loans against a pledge, loan registers | **HISTORICALLY SUPPORTED** (Carthusian/Cistercian practice; later English loan lists) |
| Visitations and recorded findings | **HISTORICALLY SUPPORTED** in general. Who visits *this* house in *this* decade is an open reconstruction decision. |
| All scenario events, people and truths | **ORIGINAL FICTION** |

### Cautionary example

Split tally sticks are a vivid economic object, but they are strongly associated with English practice. Italian houses of this period leaned on notarial instruments. Importing tallies because they're fun would be exactly the "existed somewhere in medieval Europe" mistake. Every practice should get a dated, regional source in `historical-sources.json` before it becomes evidence.

### Sources consulted

- Gregory of Tours, *De cursu stellarum*: [Internet Archive](https://archive.org/details/haasedecursu); [McCluskey, *Medieval Astronomy in Europe*](https://web.astronomicalheritage.org/images/astronomicalheritage.org/thematic-study/ch11main.pdf)
- Mortuary rolls: [Wikipedia overview](https://en.wikipedia.org/wiki/Mortuary_roll); [ANR project on mortuary rolls](https://anr.fr/Project-ANR-24-CE27-7004); [Catholic Encyclopedia, "Rotuli"](https://en.wikisource.org/wiki/Catholic_Encyclopedia_(1913)/Rotuli)
- Monastic sign language: [Bruce, *Silence and Sign Language in Medieval Monasticism*](https://www.cambridge.org/core/books/abs/silence-and-sign-language-in-medieval-monasticism/appendix-a-the-cluniac-sign-lexicon/19DC7E522BBCEB6FE14EF73EB5F08271); [Monastic sign languages](https://en.wikipedia.org/wiki/Monastic_sign_languages)
- Rule of Benedict ch. 48: [Saint John's Abbey](https://saintjohnsabbey.org/rule)
- Visitation findings (*comperta*): [Journal of Ecclesiastical History](https://www.cambridge.org/core/journals/journal-of-ecclesiastical-history/article/lost-breviarium-compertorum-and-henry-viiis-first-act-for-the-dissolution-of-the-monasteries-1536/5D781DD2EC2BCCF006EB20929373B77A). Note that these are late and English; the general practice is older.
- Book loans and pledges: [Biblonia](https://www.biblonia.com/p/avoiding-fraud-in-medieval-book-borrowing); [Cambridge History of Libraries](https://www.cambridge.org/core/books/abs/cambridge-history-of-libraries-in-britain-and-ireland/borrowing-and-reference-access-to-libraries-in-the-late-middle-ages/72B1C43DE269EBD3233A6C1C0987E33C)

---

## 11. Lessons from other games (mechanisms, not clones)

From design knowledge, not fresh research:

- **Return of the Obra Dinn:** a fixed truth, verified in batches so guessing doesn't pay. **Belongs here** as how findings are checked.
- **Outer Wilds:** knowledge is the only progression, and a rumor map shows open questions without answers. **Belongs** (as "open questions" in the register); its time loop does **not**.
- **Pentiment:** a monastic setting where you cannot investigate everything in the time available, and accusations have lasting consequences without confirmation. **Belongs** strongly for the Visitation's finite week. The lesson: limited time forces judgement, but players must understand the limits up front.
- **Paradise Killer:** non-linear exploration ending in a trial where *your* case is what's evaluated, and you can be wrong. **Belongs** as the report-and-consequence ending.
- **Majora's Mask (Bombers' Notebook):** people's schedules as knowledge. **Belongs** for routines, but keep it diegetic.
- **The Case of the Golden Idol:** fill-in-the-blank sentences as deduction. **Belongs** for structured findings.
- **Heaven's Vault:** tentative interpretations confirmed over time. **Belongs** for signs and documents.
- **Her Story:** fragmentary testimony assembled by the player. Partly relevant to depositions.
- **Shadows of Doubt:** simulated schedules generate evidence. A warning: systemic but generic. Authored truths first.
- **Disco Elysium:** rich internal dialogue. A warning about dialogue volume.

---

## 12. WHAT WE MAY BE GETTING WRONG

1. **The player has no stakes.** "An invited reader with limited authority" is safe and passive. Who is harmed if the player is wrong? Give their pen power: a notary's findings, a recommendation that changes someone's fate.
2. **"Investigation" defaults to crime.** The six existing case ideas are good, but most are framed as wrongdoing. The abbey's most original stories may be about remembrance, perception and institutional memory, where the answer is "nobody is guilty, but something was lost."
3. **Documents will be over-relied upon.** Four of the six existing cases center on texts. The engine's unique strength is perception (sight, sound, light, traversal). Documents should be physical objects checked *in place*, short, and always paired with a spatial test.
4. **Canonical hours risk becoming a waiting simulator.** 21 phases and decimal hours are simulation truth. The player needs about six legible windows and bells as the interface.
5. **The abbey is too static.** It is always late November, and it never changes in response to the player. Persistent consequences (a new night watcher, a restored name, a repaired door) would make it feel alive across matters.
6. **Three credible NPCs among forty decorative ones creates an emptiness problem.** "Why can't I talk to *him*?" The rule of silence is the diegetic answer. Use it explicitly: most monks don't speak to visitors; office-holders and those called to deposition do.
7. **Engine work is ahead of design validation.** Windows gates and benchmark rigor are valuable, but the first case's fun hasn't been tested at all. A **paper playtest** (printed plan, timetable, deposition cards, a human game-master) could validate *The Novice's Word* in an afternoon before any engine code.
8. **Reverence can become a ceiling.** Historical and textual provenance is a floor that prevents absurdity. It shouldn't veto drama. A plausible original invention, clearly labelled, is fine.

---

## 13. Things we should NOT build

- **Night stealth / guard avoidance.** The curfew and darkness are tempting, but sneaking past monks makes the abbey an obstacle course and the people into guards.
- **Dialogue trees with topic menus.** Depositions should be short, attributed statements triggered by specific questions about specific conflicts.
- **Reputation or morality meters.** Consequences should be specific and narrated, not numeric.
- **Detective vision / highlighted clues.** It destroys the perceptual premise.
- **Waypoints or minimaps that answer spatial questions.** The plan is fine; route answers are not.
- **The full 56-room library labyrinth before cases need it.** It's spoiler-adjacent, expensive and not required for meaningful play.
- **A mystery generator.** Already ruled out. I agree; two fixed matters must succeed first.
- **Ink-making, copying or bell-ringing minigames.** Process sims become chores.
- **Monastery management.** It adds UI and busywork without investigation.
- **Time loops.** They contradict the passage-tracker principle that what you did, you did.
- **A crime per case, especially a death.** It would flatten the setting into repetition of the novel's atmosphere.
- **Latin as a difficulty gate.** Translate everything; interpretation is the difficulty.
- **Voice acting before the case is validated.**

---

## 14. Standard comparison matrix (top five)

| Scenario | Distinct | Hist. fit | Abbey use | Reasoning | Emotion | Hours | Replay | Leverage | Risk (5 = low) |
|---|---|---|---|---|---|---|---|---|---|
| The Novice's Word | 4 | 4 | 5 | 5 | 4 | 5 | 2 | 5 | 4 |
| The Hour Rung Early | 5 | 4 | 4 | 4 | 3 | 5 | 3 | 4 | 3 |
| The Unserved Pittance | 4 | 5 | 2 | 3 | 5 | 2 | 2 | 4 | 4 |
| The Silent Order | 5 | 4 | 4 | 4 | 3 | 4 | 3 | 2 | 2 |
| Footprints Before Lauds | 4 | 4 | 5 | 4 | 3 | 4 | 3 | 2 | 3 |

**Judgement beyond the sums:**
- *The Novice's Word* wins first on leverage and on testing the core claim: it is entirely about perception in already-migrated spaces.
- *The Hour Rung Early* is the most distinctive and tests time, but the star layer adds risk.
- *The Unserved Pittance* scores lowest on "abbey use," but I keep it **because** it tests the opposite pole: emotion, documents and institutional memory with low reliance on time and space. If a game built on this abbey can't make a quiet case like that land, the product thesis is too narrow.
- *The Silent Order* is the most original mechanic but too animation-heavy to go first.
- *Footprints* needs a new trace system.

---

## 15. Recommendation

### GAME THESIS
A first-person inquiry game set in one rigorously reconstructed medieval abbey. As notary to a week-long visitation, you test what people say against what the building, the hours and the record allow. The abbey's walls, light, bells and silence are honest instruments that you operate with your own body. What you produce is a written account with stated confidence, and that account decides how the community treats its people and remembers its past. The reward is understanding and the weight of having written it down.

### PLAYER PROMISE
> "When you play this game, you will **stand where a witness stood, at the hour they stood there, and find out for yourself what they could really have seen, then write down what you believe, knowing someone will live with it.**"

### BEST PRODUCT STRUCTURE
**The Visitation:** a finite one-week campaign made of interlocking, self-contained matters, with a free-study mode and opt-in, spoiler-labelled novel episodes alongside. It can be prototyped as individual Casebook matters.

### THREE SCENARIOS TO PROTOTYPE
1. **The Novice's Word:** tests perception (sightline, light, sound), the passage tracker and witness credibility.
2. **The Hour Rung Early:** tests time as the subject, the player's lived chronology and the bell and sky systems.
3. **The Unserved Pittance:** tests documents, institutional memory and emotional stakes, with light use of space and time.

Together they span perception → time → memory. If all three work, the Visitation can be built from matters like them. If only the first works, the game is narrower (a perception mystery) and the product should shrink accordingly.

### FIRST SCENARIO
**The Novice's Word.**

It fits the already-migrated church and cloister. It needs no new building, no documents-heavy UI and no star layer. It answers the central question directly: *can the simulated abbey itself be the evidence?*

I would build it before *The Leaf Before Vespers*. That case's decisive reasoning (catchwords, leaf identity) is documentary and could be told in any setting. *The Novice's Word* could only be told here. The Leaf's custody and sighting ideas can be folded into later matters.

**Before engine work,** run it as a paper playtest with three people.

### SYSTEMS IT PROVES
- Night horarium phase with lamp lighting, and the darkness/lantern model
- Vantage tests: native visibility from a stall versus from the path, under night light
- Office transport (chant masking, presence in choir)
- Passage tracker extended to "stood here at this hour" observations
- Three persistent people with routines (novice, accused, infirmary servant) plus a novice master who frames the matter
- Depositions with attribution and presence
- A register with depositions, witnessed observations and findings
- Batch-checked findings with partial outcomes
- An epilogue consequence
- A save mid-night

### WHAT TO POSTPONE
- The 56-room library and any secret route
- The Visitation's week structure (until two matters work)
- Sign language and gesture animation
- Snow traces and weather systems
- Star sky and star-reckoning
- Guest house and service-building migration
- Economy cases
- Mystery generation
- Voiced dialogue
- Seasons
- Crowd simulation beyond what a matter needs
- The web viewer's investigation features (there should be none)
