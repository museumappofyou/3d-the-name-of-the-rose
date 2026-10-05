# Day 1: Arrival to Nightfall

**Seat:** Lead Campaign Designer (Claude Opus 5.5)
**Date:** 2026-10-05
**Status:** Working design document. It is meant to become Agent A's implementation brief after owner review. It changes no code and no canonical documentation.
**Read:** `README.md`, `docs/PROJECT.md`, `docs/GAME_DESIGN.md`, `docs/PLATFORMS.md`, `docs/ASSETS.md`, `docs/DEVELOPMENT.md`; Round 3 (Adso) and Round 4 (library) council reports; native `shared/data` (horarium, locations, routines, portals, entities, slice cells); browser plan and builders for the gate, avenue, hospice, cloister and Aedificium (`web/src/core/plan.js`, `web/src/world/claustrum.js`, `web/src/data/places.js`); a few early arrival claims in `book_details/output/claims.jsonl`.
**Spoiler status:** Safe for a reader who has not finished the novel. It names no deaths, culprits, solutions, hidden motives, fates, library mechanisms or late events. Source characters other than William and Adso appear only by role, in their public functions. Protected material is marked `[PROTECTED SOURCE EVENT]`. No Eco prose is quoted. All dialogue below is new, illustrative and subject to the two-review rule (canon review and forward-spoiler review).

**Labels used**

| Label | Meaning |
|---|---|
| `[SOURCE]` | Grounded in extracted novel evidence (claim ID or reviewed browser place note given where available) |
| `[SOURCE-ADAPTED]` | Source fact presented with adaptation (compressed, re-timed or seen from a different position) |
| `[RECONSTRUCTION]` | Spatial/timing decision already made by the reconstruction (plan scale, hours, heights) |
| `[HISTORICAL — cite]` | Plausible practice for the period; needs a dated exemplar before it ships |
| `[ORIGINAL GAME FICTION]` | Authored for this game; never presented as missing canon |
| `[CANON CHECK]` | A finished-book canon reviewer must confirm that it neither contradicts nor copies the source |

---

## 1. Day-1 Thesis

**Day 1 is the day the abbey stops being a picture and becomes a place with rules, and Adso finds out that he can see some of them.**

Very little *happens* on Day 1. Two travellers arrive, are fed, are lodged and are told the house rules too quickly. Wind gets into a room. A bell empties the cloister. Night closes a great building. Underneath that sequence of small events, the player passes through the first rung of each long progression:

| Track | Where Day 1 starts the player | Where Day 1 leaves the player |
|---|---|---|
| **Place** | Following William up a road | Has walked gate → guest house alone; knows two doors into the cloister and where guests stand in church |
| **Time** | A bell is a sound from somewhere above | A bell emptied the cloister, a later one set a soft deadline, and a third was the house's last word of the day |
| **People** | Hooded strangers | Five faces with a name, a job and one habit each. Adso knows one of them better than William does |
| **Method** | Writes what he thinks happened | Has seen one of his own lines turn out to be two things he knew and one he added, and has started marking *seen* or *told* |
| **Independence** | William leads, Adso follows | Adso settled a small matter alone that William never saw, and William asks him for more of the same tomorrow |

The day's real question is not "who did it?". It is **"what is this house, and how does it behave?"** The one small problem (Section 7) exists to make the player *use* the house, not to supply a mystery.

**What the player should feel at the end:** *I know almost nothing. I know more than I did. Some faces and two routes are already mine. The bells mean something now. William is brilliant and sometimes wrong. This house runs on rules. I noticed something myself. I want to be here when it's light again.*

**Length:** about **85–90 minutes** median for a first play of the full design. Roughly 60 of those minutes are required spine; the rest is optional life. A brisk player finishes in about 75 minutes, and a lingering player can reach about 120 because the two free periods are open-ended. Section 15.7 has the budget. The prototype (Section 17) runs about 60–75 minutes because it cuts supper and Compline. If the day has to shrink, cut optional life before spine, and never cut the ordinary-life meal or the night scene.

---

## 2. Player State at Arrival

### What the player knows
Nothing about the house. They may know the novel's premise or nothing at all. Before the first frame they see one line, once: *"An interactive adaptation of* The Name of the Rose. *You play Adso."* There is no history cinematic, no map and no list of goals.

### What Adso knows (and therefore the player may act on)
- He is a young Benedictine novice travelling as William's pupil and helper `[SOURCE]` (the first pages establish this).
- He knows William's habits from the road: William walks fast, stops abruptly to look at things, carries his own books, likes light, and is cold more often than he admits `[ORIGINAL GAME FICTION, CANON CHECK on tone]`.
- He knows *in outline* why they have come (the premise the novel gives at the start). Day 1 never restates it.
- He knows what is in their baggage, because he packed it. That knowledge turns into evidence in the afternoon.
- He does **not** know the hours of this house, its people, its buildings or its rules.

### What the player can do from the first second
Walk, look and interact. Interactions are hold or handle, give, carry, place, talk (short topic choices), sit or wait, and write. Control glyphs appear beside the *first* object of each kind and then fade. They never form a tutorial sequence and never use a narrative voice. Full controls live in the pause menu. Accessibility caption options (sound captions, text size) are offered before the first frame.

### Adso's voice
In first person Adso is mostly silent: hands, sleeves and breath. His spoken lines are short choices. His interior life appears in only two places: the lines he writes, and the *order in which the player chooses to look at things*. No narrator, older Adso or memoir voice speaks during Day 1 (Round 3 consensus).

---

## 3. Day-1 Cast

Five recurring inhabitants, plus William, plus three source characters who appear only in public functions. All names marked original are placeholders, and a canon reviewer must confirm none collides with the novel's cast.

### William of Baskerville `[SOURCE character; Day-1 behaviour ORIGINAL GAME FICTION, CANON CHECK]`
See Section 8 for his full Day-1 profile.

### 3.1 Brother Tebaldo, keeper of the guest house `[ORIGINAL GAME FICTION]`
| | |
|---|---|
| **Role** | Choir monk assigned to the care of guests (the Benedictine office of guest-master `[HISTORICAL — cite]`: Rule of St Benedict ch. 53 assigns guests to a designated brother) |
| **Social position** | Middle rank: a professed choir monk, not an official of the house. Answers upward to the house's officials |
| **Visual identity** | Fifties, round and quick on his feet, chapped red hands always being rubbed, a ring of keys at his belt that he touches when anxious. Template: `monk_b` |
| **Routine** | Attends offices; between them hurries between the guest house, the cloister and the service buildings; counts blankets, candles and bread |
| **Personality** | Fussy, kind, overworked, mortified by any disorder a guest might see |
| **Non-investigative concern** | The guest house is falling apart and nobody gives him a carpenter: "since Michaelmas" he has asked for frames and a step to be mended, and the carpenters are always "wanted elsewhere". He also suffers from chilblains |
| **Relationship to William** | Deferential and slightly frightened of a famous, sharp guest. He over-explains |
| **Relationship to Adso** | Treats him at first as a servant who can be told things quickly, then as someone who can be relied on |
| **Knows** | Guest rules, which doors guests use, where guests stand in church, who enters guest cells (only he and Nuto), what supplies the house issues to guests, gossip about expected visitors |
| **Does not know** | Anything about the scriptorium or library beyond the rules; what the servants say among themselves; anything that happened in a guest cell while he was at an office |
| **Future use** | Later guests arrive and burden him; Adso becomes his informal helper (access to other guest rooms, knowledge of who lodges where). A natural ally in the delegation period |

### 3.2 Nuto, lay servant of the guest house `[ORIGINAL GAME FICTION]`
| | |
|---|---|
| **Role** | Lay servant: carries water, wood, straw, lamps and slops for the guest house |
| **Social position** | Low. Lay, unlettered, from a valley village |
| **Visual identity** | Sixties, short, a limp from a bad left knee, straw always clinging to his tunic, a felt cap pulled down over his ears. Needs a lay template (small extension) |
| **Routine** | Water from the cloister well in the morning and afternoon; straw and wood from the store behind the guest house; lamp oil at dusk |
| **Personality** | Laconic, wry, proud of doing things properly; hates being hurried |
| **Non-investigative concern** | His knee "knows the snow before the sky does"; he worries about getting wood up the outside stair when it ices; he misses his daughter's family down the valley |
| **Relationship to William** | Barely registers him. Guests are weather to Nuto |
| **Relationship to Adso** | Starts wary (a guest's boy who might report him), ends warm if Adso clears his name |
| **Knows** | The physical house: which frames are rotten, which stair carries voices, where water freezes first, the servants' routes and their times |
| **Does not know** | Letters, hours by name (he lives by tasks and light, not offices), anything inside the cloister's choir life |
| **Future use** | Adso's best source on how the lower house physically works. His illiteracy later brings him to Adso to have something read or written (a classic Adso-position matter from Round 3) |

### 3.3 Fulco, a novice of the house `[ORIGINAL GAME FICTION]`
| | |
|---|---|
| **Role** | Novice, about Adso's age |
| **Social position** | Bottom of the choir community, under strict supervision; forbidden to talk to guests without permission `[HISTORICAL — cite]` (Rule ch. 53 forbids unauthorized conversation with guests) |
| **Visual identity** | Thin, big ears, red nose, ink on his fingers from copying psalms, always slightly late. Template: `novice_a` |
| **Routine** | Offices; memorizing psalms on the cloister parapet; errands from the novice house (beyond the guest house) to the church |
| **Personality** | Funny, impulsive, hungry, homesick, kind, a terrible keeper of his own secrets |
| **Non-investigative concern** | Tomorrow he must recite a psalm to his novice master and keeps losing the same verse; he is always hungry; he wants to know whether cities are really as loud as people say |
| **Relationship to William** | Awe mixed with gossip-fuelled fear (the famous guest "looks at everything") |
| **Relationship to Adso** | An equal, which nobody else here is. They compare novice masters. Mutual curiosity |
| **Knows** | Novices' world, gossip (often wrong), the quickest ways to be late |
| **Does not know** | Most of what he says he knows. His information is the game's first lesson in *hearsay* |
| **Future use** | Friendship; brings small matters to Adso; a clear test bed for testimony versus fact; a second pair of young eyes in places guests cannot go. **He carries no mystery.** He is there to be liked |

### 3.4 Brother Rainaldo, assistant to the cantor `[ORIGINAL GAME FICTION, CANON CHECK: no canonical choir official is displaced]`
| | |
|---|---|
| **Role** | Prepares the choir books and lamps for the offices; corrects worn choir leaves in the work-room upstairs |
| **Social position** | Senior choir monk, quiet authority in the church only |
| **Visual identity** | Tall, stooped, grey stubble, a leather apron over his habit in the afternoon, a pen tucked behind one ear. Template: `scribe_a` |
| **Routine** | Before each major office he enters the choir with books and lights the lamps; between offices he works upstairs |
| **Personality** | Dry, precise, patient, privately amused by novices |
| **Non-investigative concern** | The cold makes ink sluggish and his fingers worse. The choir candles are getting thin this winter |
| **Relationship to William** | Courteous and interested; they share a vocabulary. On Day 1 he is the brother who takes William upstairs to the work-room in the afternoon |
| **Relationship to Adso** | Kindly distant; lets him watch, not touch |
| **Knows** | Office order and timing, which doors the choir uses, the work-room's ordinary habits *as they concern choir books* |
| **Does not know** | And does not speak about: the library's affairs. He knows the rule and keeps it |
| **Future use** | Adso's link between the church's hours and the work-room upstairs; the person who makes "books come down" visible. Later the source of exact office timing for Adso's time-based reasoning |

### 3.5 Fazio, the gate porter `[ORIGINAL GAME FICTION, CANON CHECK against the source's reception party]`
| | |
|---|---|
| **Role** | Lay porter at the great gate; takes travellers' animals to the stables |
| **Social position** | Lay, low, but with a certain gatekeeper's dignity |
| **Visual identity** | Sixties, broad, a leather hood, an old scar across the back of one hand, moves slowly. He and Nuto are **both old lay men in brown**; that is deliberate |
| **Routine** | Opens and bars the gate; leads animals to the stables; seen at dusk closing up |
| **Personality** | Taciturn, unhurried, chews on something |
| **Non-investigative concern** | One of the travellers' mules has a loose shoe and he wants it seen to by the smith before it goes lame |
| **Knows** | Who came in and when; animals; the road |
| **Future use** | The gate is where outsiders arrive. Fazio's knowledge matters when the house fills with visitors later. On Day 1 his main job is to be **mistaken for Nuto by William** (Section 6, S15) |

### 3.6 Source characters in public function only
- **The cellarer** `[SOURCE]` meets them and leads them to the guest-house cells (claim_000142). He is brisk and leaves quickly. He has no invented traits, secrets or opinions.
- **The Abbot** `[SOURCE]`: a formal greeting and a private audience with William `[PROTECTED SOURCE EVENT]`. Adso's presence at the audience is a canon decision (Section 13, Open Canon Decision 1).
- **The brothers** as a body: anonymous choir monks at Nones and Vespers, presented from the existing crowd templates. They are never given individual identities, never saved, and never stand in for named source characters.

**Deliberately absent on Day 1.** No other named source monk is introduced. The existing native resident on the cloister porch and the skull-chapel altar proof stay inert or absent in Day-1 mode (spoiler policy, `GAME_DESIGN.md`). The skull chapel reads as an ordinary side chapel with no interaction.

**Who is simply pleasant, funny or irritating without a mystery?** Tebaldo (comic fuss), Fulco (funny and warm), Nuto (gruff warmth). None of them conceals anything bigger than lateness or a sore knee.

---

## 4. Spatial Footprint

The browser reference plan (0.42 m per pixel, +X east, +Z south) puts every Day-1 place within a compact western and central band of the enclosure:

| Place | Approx. world position (m) | Basis | Native status |
|---|---|---|---|
| Final bend of the road, outside the gate | x ≈ −125…−105 | `[SOURCE]` road place note | **SMALL EXTENSION** (bounded: one bend, ≈ 60–80 m) |
| Great west gate + gatehouse court | gate (−105, −8.6); gatehouse x −102…−87 | `[SOURCE]` gate is the only opening; avenue runs straight to church | **SMALL EXTENSION** |
| Avenue to the church front | z ≈ −8, x −105 → −17 (~88 m) | `[SOURCE]` tree-lined avenue | **SMALL EXTENSION** |
| Church west front (facade, low detail; tympanum relief optional) | x ≈ −17 | `[SOURCE]` | **SMALL EXTENSION** (relief currently excluded from the cell) |
| Flower garden | x −36…−20, z 3…24 | `[SOURCE]` claim_000115: guests pass a flower garden to reach the guest house | **SMALL EXTENSION** |
| Pilgrims' guest house, exterior | x −19…−13, z 4…24 | `[SOURCE]` claims 000114, 000142–000146 | **AVAILABLE NOW** as frozen context shell (no collision) |
| Guest house outside stair, landing, upper corridor, William's cell | stair on west face; cell at upper floor (+5.9 m) | `[SOURCE]` outside steps; niche with fresh straw (claim_000146); `[RECONSTRUCTION]` raised guest floor so the Aedificium shows above the church from the east window | **SMALL EXTENSION** (one furnished room; other cells are closed doors) |
| Cloister walks, garth, well | x −10.5…30, z 4…25 | `[SOURCE]` | **AVAILABLE NOW** |
| Cloister west doors toward the guest house | two round-arched doors in the outer west wall | `[RECONSTRUCTION]` in `claustrum.js` | **AVAILABLE NOW** geometry; **SMALL EXTENSION** portal records |
| Church nave, choir, cloister door, north door | church cells | `[SOURCE]` | **AVAILABLE NOW**; guests' place anchor is **SMALL EXTENSION** (data) |
| Abbot's house, chapter house, dormitory, east range | context shells across the garth | `[SOURCE]` | Exteriors **AVAILABLE NOW**; interiors **DESIGN-ONLY FOR LATER** |
| Aedificium exterior (distant mass, three rows of windows) | centre ≈ (42, −66), ~63 m across, towers ~31 m | `[SOURCE]` exterior; `[RECONSTRUCTION]` dimensions | **SMALL EXTENSION** (exterior context shell, low detail, two window-light states; no interior) |
| Aedificium ground floor (refectory) for supper | inside the Aedificium | `[SOURCE]` supper in the refectory | **SIGNIFICANT MIGRATION**; full design only |
| Cemetery path to the church north door (procession to Compline) | x 1…55, z −17…−21 | `[SOURCE]` claim_000592 | **SMALL EXTENSION once the Aedificium shell exists**; full design only |
| Scriptorium (William's afternoon) | Aedificium first floor | `[SOURCE]` | **DESIGN-ONLY FOR LATER** (offstage on Day 1) |
| Library | Aedificium top floor | `[SOURCE]` | **DESIGN-ONLY FOR LATER**; exterior windows only |
| Stables / farmyard (where the mules go) | x ≈ 83–102 | `[SOURCE]` | **DESIGN-ONLY FOR LATER** (mules led away up the avenue) |
| Novices' house (Fulco's origin) | far south-west | `[SOURCE]` plan | **DESIGN-ONLY FOR LATER** (offscreen) |

**The smallest coherent footprint.** One new outdoor strip runs from the road's last bend, through the gate and along the avenue to the flower garden. Add one furnished guest-house room with its stair, the already migrated cloister and church, and a low-detail Aedificium silhouette. Every Day-1 place is then within about 120 m of walking, so routes are short enough to learn and long enough to *be* routes.

**Why the Aedificium shell is not optional.** The first strong view, the night's last image and the library's whole Day-1 presence depend on seeing that mass above the church. Without it Day 1 has no library pillar and no crown. It is an exterior-only, low-detail context cell like `cloister_context`, not a migration of the building.

---

## 5. Canonical-Time Structure

Times use the existing native horarium for late November, a reconstruction convention (`horarium.json`). Sunrise is about 7:30 and sunset about 16:40.

| In-game time | Office / phase | What the player experiences | Kind of transition |
|---|---|---|---|
| ~11:30 | late work | Arrival on the road | n/a |
| **11:51** | **Sext** (minor office) | A bell from above, before anything inside is visible. At the gate, the court is empty because "they are at the office" | **Ambient bell.** It causes a wait the player experiences without understanding it |
| 12:15–13:00 | meal | Brothers go to their meal; the guests are fed in their cell `[SOURCE]` | Felt as quiet |
| 13:00–14:24 | work | Settling in, Tebaldo's rules, first notebook use, free hour begins | n/a |
| **14:24** | **Nones** (minor office) | A bell; brothers cross the cloister into the church for a short office; the cloister briefly empties; **the wind rises** | **Rehearsal transition.** The player sees a bell move people |
| 14:45–16:21 | work | William returns; the shutter; the investigation; light turns gold, then red | Light is the visible clock |
| **16:21** | **Vespers** (major office) | The bell stops work everywhere; the house flows into the church; lamps; chant; dusk falls during the office | **The significant physical transition of the day** |
| 16:57–17:51 | supper | Full design: refectory. Prototype: elided | Cut or played |
| 17:51–18:00 | procession | Full design: lantern file through the cemetery to the north door `[SOURCE]` claim_000592 | Night walk |
| 18:00–18:36 | **Compline** | Full design: attended. Prototype: heard faintly from the cell | The house's last word |
| after supper | curfew | The Aedificium is barred `[SOURCE]` claim_000173 | Seen as its lowest lit windows going dark |
| ~18:45 → sleep | retire / night | Final scene in the cell | Day ends at sleep, before the night offices |

### The clock model for Day 1: beat-gated, visibly honest
- **During set pieces** (arrival, reception, meal, Vespers, night) the clock is moved by events, as the native clock already allows (`rate = 0`, `set_time`).
- **During free periods** (the free hour, the investigation) the clock advances continuously at a compressed rate. Start at roughly 1 game hour per 6–8 real minutes and tune in playtest. The sun and light change visibly, so the timer is never hidden.
- **Two soft holds protect pacing without punishing anyone:**
  1. *William's return* fires once Nones has passed **and** either about 8 real minutes of free time have elapsed or the player walks up the guest-house stair. If the player is already in the cell, they discover the shutter themselves (Section 6, S9 alternate).
  2. *Vespers* will not ring until William's method question (S10) has happened **and** either the player has resolved the matter or about 12 real minutes have passed since that question. While held, the light sits at late gold, around 16:05 in-game. Sitting on a bench or at the guest-house table lets the player *wait* forward to the bell diegetically.
- Menus and the notebook pause the clock. There is no hidden countdown, and no failure state comes from time (`GAME_DESIGN.md` rule).

**Why Vespers, not Sext, is the day's significant transition.** Sext is too early: the player hasn't yet lived in the house long enough for the bell to *change* something they know. Vespers comes after an hour and a half of ordinary afternoon. It lands on a deadline the player cares about (Tebaldo will report Nuto "after Vespers") and coincides with sunset. **The bell, the light and the social consequence all turn at once.** That is the moment for "the bell changed the abbey."

---

## 6. Full Chronological Experience

Fifteen sequences. Play-time ranges assume a first-time player in the full design.

---

### S1. The Last Bend *(0:00–0:08)*

**TIME / CANONICAL CONTEXT:** ~11:30, late work period. Clear, very cold, old snow three fingers deep `[SOURCE]` (road and garden notes); light wind from the north. Low winter sun from the south-east. `[CANON CHECK: weather of the arrival]`

**LOCATION(S):** The last stretch of the mountain road below the west gate. Pines heavy with snow make a roof over the upper road `[SOURCE]`. From one bend, the sea shows far to the south `[SOURCE]`.

**WHO IS PRESENT:** William, two mules, Adso.

**WHAT THE PLAYER IS DOING:**
- Walking uphill **leading Adso's mule** by its halter (hold the lead; the mule follows at a lag, tugs if the player stops abruptly, and snorts steam).
- **Following William**, who walks 5–7 m ahead leading his own mule, with his book satchel on his own shoulder (he never lets anyone else carry books).
- Looking. Nothing needs pressing.

**How William moves.** He sets a pace slightly faster than Adso's comfortable walk. When the player falls more than ~12 m behind, William does **not** call back. He stops to look at something: a lichen on a boulder, the angle of the wall, the sea. He waits, apparently absorbed, until the player is within ~5 m, then walks on. **The player learns that William waits without ever being told.** If the player stops for a long time (say, at the sea view), William comes back two or three steps, looks where Adso is looking, and says something short about it. The leading/waiting parameters belong to the one system that matters most (Section 8).

**How the abbey reveals itself.** Sound first: the wind in the pines, the mules' hooves on packed snow, a dog somewhere above, a hammer on iron (the smithy, far off and unseen). At the bend before the gate, the trees open and the wall appears. Above it, set back and enormous, the **west tower of the great building faces the arriving traveller head-on** `[SOURCE]` (gate place note). It is not the church, and it is far bigger than the church. The player sees three rows of windows `[SOURCE]` without being told what they are.

**William at the reveal.** He stops for longer than at any lichen. He says nothing for a beat, then a single short line of appetite rather than information (illustrative):

> **William:** *"Well. They didn't build that to keep the rain off."*

(Final wording needs both reviews. The line must express interest, not knowledge of the library.)

**Then the bell.** At 11:51 a bell rings from inside the walls (Sext). It is close and strange, with the wind blowing it about. William glances at the sun, not the building:

> **William:** *"Midday office. We've timed it badly. No one will come to the gate while they sing."*

That is all the explanation he gives. The player has no frame for "office" yet.

**WHY THE PLAYER WANTS TO DO IT:** The road leads somewhere visibly enormous, and William, the one known thing, is walking toward it. The building pulls them forward.

**WHAT THEY LEARN WITHOUT BEING TOLD:** William leads and waits; William carries his own books; the abbey is vast and walled; bells come from inside and govern people; the great building is not the church.

**OPTIONAL BRANCHES:** Stop at the sea view (William returns and shares it). Look back down the road. Let the mule nose at a snowy bush (it pulls; Adso has to pull back; a tiny comic physical moment).

**SYSTEMS USED:** Player controller on snow; mule follow (new); William lead/wait pacing (new); wind and footstep audio (existing); Sext bell (bell recording needed); clock set to ~11:30 and advanced by event at the reveal.

**FUTURE PAYOFF:** The first view of the great west tower is the image the night scene answers (S15). The road becomes the place outsiders arrive later in the campaign.

**FAILURE / ALTERNATE:** There is no failure. If the player walks *ahead* of William, he lets them and walks behind, amused. At the bend he says "Gate's on the left," and it is visible; the player can't miss it. A player who rushes reaches the gate in about four minutes and simply waits through Sext (S2).

**SOURCE NOTE:** The source contains a well-known encounter on the arrival road. This design **neither reproduces nor contradicts it**: the playable road begins at the final bend. The canon reviewer decides whether that encounter is (a) referred to offstage, or (b) staged before this bend as a short scene the player witnesses. Either way it must **not** become an Adso deduction or a tutorial (Open Canon Decision 2).

---

### S2. The Gate During Sext *(0:08–0:14)*

**TIME:** 11:51–12:15, during Sext.

**LOCATION(S):** Outside the great west gate, then the gate court inside (gatehouse to one side, avenue opening straight ahead toward the church front).

**WHO IS PRESENT:** Fazio the porter; William; Adso; mules. Distant chant, faint, from the church at the far end of the avenue.

**WHAT THE PLAYER IS DOING:**
- Fazio opens the gate (heavy iron-bound bar lifted from its slots, a sound the player will hear again, transformed, at night).
- Fazio takes William's mule but leaves Adso's mule with Adso. He has noticed the loose shoe, kneels and lifts the hoof. Adso is asked, without words, to **hold the mule steady** (hold the halter; the mule shifts; keep it still).
- The court is empty and the gate open. The avenue runs ~90 m to the church front. The player may look about within the court and a short way up the avenue. Nobody comes: everyone is at the office.

**William during the wait.** He studies the gate itself: the bar, the worn slots, the thickness of the wall. Illustrative:

> **William:** *"This bar's been dropped twice a day for longer than anyone here has been alive. You can learn a house from its hinges."*

Then, practically, rubbing his hands:

> **William:** *"They'll feed us after. Monks always feed guests after. Pray it's hot."*

This is human texture: cold, hunger, and dry humour about his own hunger.

**WHY THE PLAYER WANTS TO DO IT:** It's a pause in a strange place. The player is free to look, and the great building is now much closer.

**WHAT THEY LEARN WITHOUT BEING TOLD:** The bell emptied the house of anyone who could receive guests. Servants (Fazio) don't attend this office and monks do. The gate has a bar that is *dropped* at some hour. William is hungry.

**OPTIONAL BRANCHES:**
- Ask Fazio about the mule. He grunts "Shoe," and later says "smith tomorrow." His one non-investigative concern.
- Walk a few metres up the avenue alone. William calls nothing; Fazio does ("Not yet, boy").
- Look up at the great building from the court. Its scale has changed: closer, higher, the top row of windows small.

**SYSTEMS USED:** Office transport (distant chant along the avenue; needs a Sext piece or reuse of the existing *Deus in adjutorium* opening); gate portal and bar (prop animation); hold-steady interaction (new, tiny); NPC idle for Fazio.

**FUTURE PAYOFF:** The bar and slots return at night as a *sound and image of closing*. Fazio's scar and hood set up William's confusion at night (S15).

**FAILURE / ALTERNATE:** If the player lets go of the mule, it takes three steps and stops to eat snow; Fazio retrieves it with a look. No penalty, but Fazio's first impression is "careless boy" (one alternate greeting tomorrow).

---

### S3. Reception, and the Walk to the Guest House *(0:14–0:22)*

**TIME:** ~12:15, Sext ends; brothers stream from the church toward their meal, seen at a distance across the avenue's end.

**LOCATION(S):** Gate court → avenue → (turning right before the church front) → flower garden → foot of the guest-house outside stair → up → William's cell.

**WHO IS PRESENT:** The cellarer `[SOURCE]` arrives briskly from the church end of the avenue. In the full design the Abbot greets William formally at the head of the avenue `[PROTECTED SOURCE EVENT: reception]`; Adso stands aside holding the mule. Fazio then leads both mules away up the avenue and round the church toward the stables (unseen). In the prototype the Abbot is offstage, and the cellarer says the Abbot will receive Brother William after the meal.

**WHAT THE PLAYER IS DOING:**
- Standing aside with the mule while the authorities greet William. **Adso's station is established without a word:** nobody addresses him.
- Fazio has unloaded two bundles: bedding and clothes, and Adso's travelling chest with William's writing things. Adso picks up the **bedding bundle** (carry: slower walk, view slightly lowered). The chest stays by the gatehouse "for the second trip". Nobody says so; Fazio sets it down and pats it.
- Following the cellarer and William to the guest house. The cellarer leads them across the flower garden to the cells `[SOURCE]` (claims 000115, 000142).
- **On the way, a light, comic beat:** William asks (illustrative) *"And the great house — where would a guest go in?"* The cellarer's answer is courteous and firm: guests are taken up when invited, the upper floor is not for visitors, and after supper the whole building is barred `[SOURCE]` (claim_000173 for the barring; the rest is `[SOURCE-ADAPTED, CANON CHECK]`). William's face falls slightly. The player sees the first sign that William can want something he cannot have.

**The cell.** Up the outside stair `[SOURCE]` to the landing and in. A plain room, a broad east window (glazed or oiled) through which the great building shows like a crown above the church `[SOURCE]` (hospice place note), a small **west window with a wooden shutter**, a table, a bed for William, a chest, and the **long wall niche filled with fresh straw** that is Adso's bed `[SOURCE]` (claim_000146). The cellarer says Brother Tebaldo keeps the guest house and will see to them, then leaves.

**WHY THE PLAYER WANTS TO DO IT:** Arrival has a destination at last. Warmth, food and a place to put things down.

**WHAT THEY LEARN WITHOUT BEING TOLD:** The first route (gate → avenue → right at the flower garden → outside stair). The great building is barred at night and guests need an invitation. Adso is a servant here in others' eyes. Adso's bed is straw in a wall.

**OPTIONAL BRANCHES:** Look out of the east window (first indoor view of the crown). Test the straw (it crackles; a small human laugh line from William if done while he watches: "A bed fit for a bishop's horse").

**SYSTEMS USED:** Carry state (new, small); NPC routes for the cellarer, Fazio and the mules (scripted splines); room classifier (new rooms: `flower-garden`, `hospice-stair`, `hospice-cell`); passage tracker **records the walked route** (existing).

**FUTURE PAYOFF:** The route is about to be walked alone (S4). The crown seen from the east window is the night image (S15).

**FAILURE / ALTERNATE:** If the player wanders off the route (e.g., toward the church front), William and the cellarer keep walking, and the cellarer stops at the flower-garden gap. If the player goes on wandering for more than ~45 s, William says from the stair, "Adso, the bedding before the sights." The player cannot get lost: the footprint is a strip with the church as a landmark.

---

### S4. The Second Bundle *(0:22–0:26)*

**TIME:** ~12:25.

**LOCATION(S):** Cell → down the stair → flower garden → avenue → gate court → back.

**WHO IS PRESENT:** Adso alone. In the gate court, the chest by the gatehouse wall. Fazio is gone with the mules; a lay servant sweeps snow far up the avenue.

**WHAT THE PLAYER IS DOING:** **Walking the route alone for the first time** to fetch the chest. There is no marker, no prompt beyond William's: *"There's a chest still at the gate, and I'd like to see my ink again before night."* Then back, carrying the chest.

**WHY THE PLAYER WANTS TO DO IT:** It is Adso's job, and William's ink is in it. It's also the first time the player is out of William's sight: a small freedom.

**WHAT THEY LEARN WITHOUT BEING TOLD:** **The route is already theirs.** On the way back they see the house differently: the flower garden's hedged beds under snow, the guest house stair from below. This is the first **PLACE** step.

**OPTIONAL BRANCHES:** Pause at the head of the avenue and look along it to the church front. Look up at the great building from the gate court again.

**SYSTEMS USED:** Passage tracker measures whether the player walked the route without hesitation (playtest metric, not a reward). Carry state.

**FAILURE / ALTERNATE:** A player who forgets which way to turn at the flower garden sees the guest-house stair from the avenue; it is visible. If they head toward the church instead, Nuto appears at the flower-garden gap with a bundle of wood. He is not yet named, but he is **seen** for the first time as he limps toward the guest house, and following him works. Nobody tells them where to go.

---

### S5. Bread, Olives, Wet Wool *(0:26–0:33)*: ordinary life with William

**TIME:** ~12:35–13:00, during the brothers' meal.

**LOCATION(S):** William's cell.

**WHO IS PRESENT:** William, Adso. Tebaldo arrives first, out of breath and late from the office, with a tray: **bread, cheese, olives, wine and fine raisins** `[SOURCE]` (hospice place note). He apologizes three times, explains two rules too quickly, and is gone.

**WHAT THE PLAYER IS DOING:**
- Eating with William at the table. **Interaction:** take bread, cheese, olives or raisins; pour wine for William (Adso serves his master, a small physical act of station and affection).
- William takes off his wet boots and puts his stockinged feet toward the brazier-less floor with a groan. Adso can **wring out William's wet hose** and lay them on the sill to dry. It is absurd and intimate.
- Conversation, three or four exchanges, about nothing investigative: the road, the cold, the food, whether the house seems rich (William: "Their olives are better than their welcome"). William asks one question (illustrative):

> **William:** *"Well. What have you seen so far?"*

The player answers from a short list built from what they actually did: *"The gate bar is worn deep." / "The great building has three rows of windows." / "The porter has a scar." / "The sea, from the road." / "Nothing much yet."* William responds to each with something specific and human, never with a correction. **This is not a test.** It sets up a ritual that returns at night with more at stake.

- Optional: **pocket some raisins** (they go into Adso's sleeve; used in S8).

**William leaves.** At 13:00 a lay servant at the door says the Abbot will see Brother William. William pulls his damp boots back on with distaste.

> **William:** *"Unpack. Find out where we may and may not go. Don't let anyone frighten you about either."*

**`[PROTECTED SOURCE EVENT: the Abbot's private audience with William]`**: whether Adso attends is Open Canon Decision 1. **The Day-1 design works either way:**
- **If Adso attends (canon reviewer's choice):** a short, canon-reviewed scene of no more than 5 minutes, inserted here, with Adso at the edge. Afterwards William sends Adso back to unpack, and S6 follows.
- **If Adso does not attend:** William goes alone. The player sees him walk off through the cloister toward the Abbot's house across the garth (exterior shell, available now).

**WHY THE PLAYER WANTS TO DO IT:** Food after cold; a quiet moment with the one person they know; William is funny and human.

**WHAT THEY LEARN WITHOUT BEING TOLD:** William is a person: wet, hungry, wry and fond. He wants to know what Adso sees. Guests eat apart from the brothers. The Abbot wants William.

**OPTIONAL BRANCHES:** Skip eating (William eats more and comments). Look at the crown through the east window while William eats.

**SYSTEMS USED:** Seated interaction; consumable props; short conversation UI with choices drawn from the player's actual observations (requires an observation log; Section 9); a dry-clothing prop state.

**FUTURE PAYOFF:** The "what have you seen?" ritual returns at night (S15) and becomes the Day-2 hook. Pocketed raisins are used in S8. The hose drying on the **west** sill sit directly beside the shutter that will blow open (S9), a small, human, non-clue reason for the player to have looked at that window.

**FAILURE / ALTERNATE:** None. If the player walks out mid-meal, William calls "Your bread's going cold," then lets them go. The scene can't be failed and is never repeated.

---

### S6. Settling the Cell *(0:33–0:38)*: an ordinary monastery task

**TIME:** ~13:05.

**LOCATION(S):** William's cell.

**WHO IS PRESENT:** Adso; then Nuto, with a bucket of water and a broom.

**WHAT THE PLAYER IS DOING:** **Unpacking.** Taking William's things out of the chest and placing them:
- William's **papers** (a few loose leaves in a cord-tied bundle) and his **writing things**: on the table by the west window, on the table by the east window, or back in the chest. The player chooses.
- Adso's spare habit and blanket onto the straw.
- William's spare cloak on the peg.

Placement is free within a few valid spots. **Adso knows the order he put things in,** because the player did it. That becomes the day's "only Adso" observation (S11).

**Nuto arrives** (first close look; Tebaldo calls him by name from below: "Nuto! The guests' cell, as I said!"). He grunts at Adso and limps in with water. He says, to himself as much as to Adso (illustrative):

> **Nuto:** *"Shut since autumn. Smells like a wet dog's prayers. I'll give it some air."*

He goes to the **west shutter**. Then Tebaldo calls up for Adso: *"Come down, boy, and I'll show you how things are done here — quickly, quickly, Nones is coming."* **Adso leaves while Nuto is still at the shutter.** The player does not see what Nuto does with it. That matters later, and nothing about the moment suggests it matters now.

**WHY THE PLAYER WANTS TO DO IT:** Making a place one's own is satisfying. Choosing where William's things go is a small act of care.

**WHAT THEY LEARN WITHOUT BEING TOLD:** Nuto's name, limp and job. The cell is now *theirs*.

**OPTIONAL BRANCHES:** Talk to Nuto before leaving (he complains about the knee and the stair; no clue). Put the papers in the chest out of habit. That lowers the afternoon's stakes but changes no logic (S9 alternate).

**SYSTEMS USED:** Place-object interaction (new, small, a handful of slots); persistent placement state in save; NPC entry, idle and shutter-open animation for Nuto (the actual opening happens out of sight).

**FUTURE PAYOFF:** Paper placement determines how wet William's papers get. The arrangement is Adso's private evidence. Nuto's presence at the shutter is the start of the day's problem.

**FAILURE / ALTERNATE:** If the player ignores unpacking and leaves at once, Tebaldo's call still comes. The papers stay in the chest by default.

---

### S7. Brother Tebaldo's Rules *(0:38–0:46)*, and the first notebook

**TIME:** ~13:15–13:50.

**LOCATION(S):** Foot of the guest-house stair → gap between guest house and cloister → **cloister west door** → west walk → **church by the cloister door** → the guests' place in the nave → back to the cloister.

**WHO IS PRESENT:** Tebaldo, Adso. In the church, Brother Rainaldo setting out a book in the choir, seen and nodded to.

**WHAT THE PLAYER IS DOING:** **Following Tebaldo on a walking tour that goes too fast.** Tebaldo walks briskly and talks continuously. The player is half-jogging. Content (all `[ORIGINAL GAME FICTION]` unless marked):
- Guests may use this door (cloister west door) and the church's cloister door, at any hour of daylight.
- **The guests' place** in church: in the nave, behind the brothers' choir, by a particular pillar. Tebaldo touches the pillar.
- Don't speak to the brothers unless they speak first. Don't speak to novices at all. `[HISTORICAL — cite]` (Rule ch. 53).
- The great house: the kitchens and refectory below, the work-room above where brothers write, and above that, "where the books are kept, which is not for you, nor for me, nor for anyone but those who keep it." He says it with a little pride and a little fear. `[SOURCE-ADAPTED, CANON CHECK]`
- After supper the great house is barred `[SOURCE]` (claim_000173), "and the guest house's stair is icy, so mind it".
- Tebaldo's own complaint, unprompted and **not a clue** (it becomes one later): *"And if your shutter sticks or your step rocks, don't blame me — I've asked for a carpenter since Michaelmas and they're all wanted elsewhere."*

Then Tebaldo is called away ("The cellarer wants me — forgive me!") and leaves Adso on the cloister west walk.

**The first notebook use.** The player is alone with a head full of half-remembered rules. Holding the notebook key, or interacting with Adso's own satchel, opens **Adso's leaves** for the first time: a few folded offcut leaves William gave him on the road. There is no tutorial text. The page shows a few **candidate lines in Adso's hand**, built from what he just heard and saw. The player picks which to keep (2–4):

> *Guests stand in church behind the brothers, by the second pillar on the right.*
> *We may go into the church by the cloister door.*
> *The great house is barred after supper. No one may go up but those who keep the books.*
> *Brother Tebaldo is kind and very worried.*
> *This house is very orderly.*
> *Nuto smells of straw.*

The lines are **naive by construction**. Testimony is written as fact ("No one may go up…"), judgment is mixed with sight ("very orderly"), and one is merely funny. The game doesn't mark any of them wrong. Each saved line gets an automatic, deliberately vague time and place in Adso's Day-1 style: *"after the meal, in the cloister."*

**Assumption beat (authored, part 1 of 2).** The first entries are Adso's starting state, an over-confident record. The player doesn't have to make a mistake; they inherit Adso's habits and will be able to see them later. Part 2 is in S10.

**WHY THE PLAYER WANTS TO DO IT:** Natural motive: "I won't remember all that." The notebook appears as the answer to a real need, not as a feature.

**WHAT THEY LEARN WITHOUT BEING TOLD:** Second and third routes (guest house ↔ cloister ↔ guests' place). The house has written and unwritten rules. The library exists, is above the work-room, and is forbidden. A testimony ("no one may go up") is stored as if it were a fact.

**OPTIONAL BRANCHES:** Ask Tebaldo to repeat himself. He does, faster. Ask about the great house. He answers about meals and work-room hours, and his voice drops at the top floor. Ask about Nuto: "a good man, slow, his knee".

**SYSTEMS USED:** Escort walk (Tebaldo leads but does not wait; the inverse of William, a deliberate contrast); church and cloister portals; first notebook UI (choose lines; automatic vague time and place stamp; people page entry created for Tebaldo and Nuto).

**FUTURE PAYOFF:** The guests' place becomes the player's own destination at the Vespers bell (S12), a route test. Tebaldo's carpenter complaint becomes evidence in S11. The "no one may go up" line is Adso's first library entry, and its *testimony* nature can be annotated much later.

**FAILURE / ALTERNATE:** If the player lags badly, Tebaldo looks back with exasperation and comes back, which makes him more anxious and more comic. Skipping the notebook is allowed. Then the first notebook use happens at S10 instead, and the naive Day-1 entries are generated more sparsely from what the player did.

---

### S8. The Free Hour *(0:46–1:00)*: optional exploration; Nones; the wind

**TIME:** ~13:50–14:50. Nones rings at 14:24.

**LOCATION(S):** Free movement in: cloister walks, garth and well, church nave and choir (not the sanctuary), the guest house and flower garden, the gate court and avenue. Doors to the dormitory, chapter house and Abbot's house are closed. Brothers don't stop you; they simply don't open them. A lay brother at the east range shakes his head pleasantly.

**WHO IS PRESENT:** Fulco on the cloister parapet; Nuto at the garth well; Rainaldo in the choir before Nones; anonymous brothers reading on the parapets and crossing.

**WHAT THE PLAYER IS DOING:** Whatever they like. **No task is given.** William is with the Abbot. This is the first period of real freedom. Some things that can happen:

**Optional life (human, no clue function):**
- **Fulco** is mouthing a psalm on the parapet, keeps losing the same verse, and breaks the rule to ask Adso if it's true he's from "beyond the mountains" and whether the cities really never go quiet. If Adso has **raisins**, he can give some. Fulco hides them in his sleeve, terrified and delighted. If the player knows the psalm (Adso is a Benedictine novice), they can **prompt the verse**. Fulco's joke (illustrative): *"Brother Tebaldo counts the guests' blankets twice a day. Lose one and he'll pray for you by name."* `[ORIGINAL GAME FICTION]`
- **Nuto at the well** has broken ice on the bucket. Adso can **help carry water** across the cloister and around to the guest house. On the way Nuto talks about his knee, the snow and his daughter's family down the valley. If Adso helps, Nuto's tone softens one step. *(This is the ordinary-life moment with someone other than William; Section 10.)*
- **Sit on a parapet** and let time pass. Brothers read; snow drips from the arcade roofs; the light moves.

**Optional observations (things to notice; none required):**
- **Rainaldo** carries a bound gathering into the choir through the church's north door: a book coming down from the great house for the office. If asked, he says courteously that he brings only what the choir needs, and "books don't go visiting". This is a light library touch.
- Looking up from the garth: the great building's upper rows over the church roof. The **middle row** of windows begins to glow faintly as the afternoon dims (lamps in the work-room). The **top row stays dark.** (Day 1 never puts light in the top row.)
- The cloister capitals, carved with animals among leaves `[SOURCE]` (cloister note), are just there to look at.

**Nones (14:24).** A bell. Brothers on the parapets close their books and rise; the cloister drains toward the church door; Fulco bolts. In the church a short office is sung. The player can follow and stand at the guests' place, or stay outside and hear it through the door. **Then the wind rises.** Gusts lift powder off the arcade roofs, the garth trees creak, and the wind's sound shifts from the north to the west. It is a weather change the player physically notices.

**The shutter, heard (optional, and the most important optional observation of the day).** From about Nones onward, from the cloister **west walk**, the flower garden or the gap by the guest house, a **wooden banging** can be heard in the gusts, irregular, toward the guest house. With captions on: *"[A shutter bangs somewhere to the west.]"* The game does nothing else with it. If the player stands still and listens for a few seconds in earshot, it enters Adso's observation log as *"Something banging in the wind, toward the guest house, after the bell."* It does **not** go into the notebook unless the player writes it.

**WHY THE PLAYER WANTS TO DO IT:** Curiosity, the first freedom, people who are fun to talk to, and the pleasure of seeing an ordinary house at work.

**WHAT THEY LEARN WITHOUT BEING TOLD:** Monks read in the cloister in the afternoon. Novices are watched and rule-bound. Lay servants do the heavy work and live by tasks, not bells. A bell empties the cloister. The weather has turned. The great building's middle floor is where lamps are lit. Books are carried *down* to the church; nobody goes up.

**FUTURE PAYOFF:** Fulco's friendship (raisins or verse) changes his greeting tomorrow and makes his later testimony freely given. Helping Nuto makes him readier to talk in S10. Hearing the shutter is first-hand evidence about *when* (S11).

**FAILURE / ALTERNATE:** A player who does nothing but stand in the cloister still sees the Nones transition and feels the wind. A player who goes straight back to the cell finds it before William returns (S9 alternate). Nothing here is required. Every person met here can also be met in S11, more briefly.

---

### S9. The Mantle *(1:00–1:04)*

**TIME:** ~14:55. The soft hold fires (Section 5).

**LOCATION(S):** Cloister west walk (William returns across the garth from the Abbot's house); then the guest-house cell.

**WHO IS PRESENT:** William (returning, cold, preoccupied, with Rainaldo waiting for him at the church door); Adso.

**WHAT THE PLAYER IS DOING:** William finds Adso, or Adso hears his step. He is quieter than at lunch: the audience has left him thoughtful, and he doesn't explain. `[Tone only; content PROTECTED]`

> **William:** *"Brother Rainaldo is taking me up to the work-room. It's cold enough up there to keep fish. Fetch my mantle, would you? I'll wait at the church door."*

The player walks to the cell: the third time on this route, and now an errand with a person waiting.

**In the cell:** **The west shutter is wide open and banging.** Snow powders the floor in a fan from the window. **Adso's straw bed is half blown across the room and wet**, and William's hose have blown off the sill into a corner. If the papers were on the table, the top leaves are wet and spotted. The room is very cold.

**The first reaction is the player's own:** look, close the shutter (it won't latch: the hook swings free), check the papers and things, pick up the hose, look at the ruined straw. There is no text box. Adso can pick up and look at things. If the player inspects the papers or the chest, they find **everything where Adso put it** (Section 7 explains why this matters).

**Tebaldo arrives** almost at once. He heard the banging from below on his way to the cellar, and he is horrified:

> **Tebaldo:** *"Mother of God, look at it! I told Nuto to air it, not to give it to the sky! A guest's cell — and that guest's! I'll speak to the cellarer after Vespers and have him sent back to the yard where he can't—"* (he picks up a wet leaf of William's and goes pale) *"—oh, no."*

Tebaldo has now made **his** assumption, aloud and as fact. He leaves to fetch dry straw from the store, muttering.

**WHY THE PLAYER WANTS TO DO IT:** Alarm. Adso is responsible for these things. William is waiting. A man is about to be punished. The house that seemed orderly has a crack in it.

**WHAT THEY LEARN WITHOUT BEING TOLD:** Tebaldo jumps to conclusions. A servant's place is precarious. There is a deadline: "after Vespers".

**FAILURE / ALTERNATE:**
- **Player discovered it before William's return** (went to the cell during S8): the scene plays the same, but William arrives at the cell door himself looking for Adso and his mantle. Tebaldo arrives after William leaves. S10's report then happens at the church door.
- **Papers were in the chest:** they're dry. William's stake is lower and the comedy is higher ("At least my ink has more sense than your bed").
- **Player leaves without the mantle:** William comes to the guest-house foot and calls up, unhurried.

---

### S10. Two True Things *(1:04–1:12)*: testimony, a report, and William's question

**TIME:** ~15:00–15:15.

**LOCATION(S):** The well or the woodstore behind the guest house (Nuto); the church door on the cloister walk (William and Rainaldo).

**WHO IS PRESENT:** Nuto; William; Rainaldo, standing politely apart.

**WHAT THE PLAYER IS DOING:** The player chooses the order. **Two paths, both valid:**

**Path A: Nuto first.** Nuto is at the woodstore (or the well, if the player helped earlier). Asked about the shutter, he is wary and then stubborn (illustrative):

> **Nuto:** *"I opened it a hand's width to let the stink out, and I put the hook in the second eye, like always. A hand's width. Then I swept and went for straw. It was a hand's width when I left it."*

Then Adso writes. The notebook opens with Adso's own impulsive draft already forming, in his hand, because he is angry on Nuto's behalf, on William's and on his own:

> *Nuto says he set the hook. He lied. The shutter was wide open.*

The player may **leave it**, **strike it and write something else** (a short choice of alternatives: *"Nuto says he set the hook. The shutter was wide open when I came."*), or close the notebook without writing.

**Path B: William first.** Adso brings the mantle and reports. The notebook line drafted for this path absorbs Tebaldo's testimony as fact:

> *Nuto left the shutter open to the snow.*

**The report and William's question.** William takes the mantle, listens (or reads, if Adso shows him the leaf), and asks a short question tuned to what Adso actually said or wrote. **He never names the wind, the hook, a place or a person to visit.** Illustrative versions:

*If Adso said "he lied" (Path A, line kept):*
> **William:** *"You saw it wide open."*
> **Adso:** *"Yes."*
> **William:** *"And you heard him say he left it a hand open."*
> **Adso:** *"Yes."*
> **William:** *"Then you've two things you know, and one you've added."* (He fastens the mantle.) *"When did it open?"*

*If Adso repeated Tebaldo (Path B):*
> **William:** *"Did you see Nuto leave it open?"*
> **Adso:** *"Brother Tebaldo says—"*
> **William:** *"Did Brother Tebaldo see it?"* (A pause that the player fills themselves.) *"Then so far you have a shutter and a temper. When did it open?"*

*If Adso was already careful (struck the line, or reported the observation and the claim separately):*
> **William:** *"Good. You've kept them apart. Most men wouldn't have."* (A beat.) *"So. When did it open?"*

Then William goes up with Rainaldo:

> **William:** *"Tell me at Vespers. And Adso — find a warmer bed than that one."*

**This is the method lesson.** It is three or four lines, and it never becomes a lecture. William's real gift is **the question "When did it open?"** It turns the problem from *who is lying* to *what happened between two true reports*: what someone says happened is not the same as what happened, and what Adso saw (an open shutter at three o'clock) is not the same as what it means. William has supplied a dimension to think in, not an answer.

**Notebook evolution (guaranteed moment).** The next time the player writes anything, Adso pauses at the margin: two small marks of his own invention appear as an optional choice, **an open eye ("I saw it")** and **a mouth ("I was told it")**. No unlock notice or tutorial accompanies them. They're simply there now, because Adso has been asked "did you see it?" and the habit has begun. They're optional, and unmarked lines are still allowed. Day 1 introduces only these two marks. "I think" arrives as a written phrase in S11. Documents and uncertainty come on later days.

**WHY THE PLAYER WANTS TO DO IT:** Nuto is about to be punished; William is waiting; it's their responsibility.

**WHAT THEY LEARN WITHOUT BEING TOLD:** A statement and an observation can both be true at different times. Repeating someone's claim is not seeing. William's correction is curious, not contemptuous; he is pleased when Adso is careful.

**OPTIONAL BRANCHES:** Defend Nuto to Tebaldo before having evidence (Tebaldo: "Then prove it, boy, before the bell"). Accuse Nuto to his face. He is hurt and goes silent, and later reconciliation is warmer if Adso clears him anyway. Ask Rainaldo (he knows nothing of shutters; he offers office timing: "Vespers when the sun touches the west ridge, near enough").

**SYSTEMS USED:** Conversation UI with the attributed-claims log (Nuto's claim stored as **Nuto says…**, never as fact; this is the planned `GAME_DESIGN.md` primitive); notebook draft-line mechanic; William's response selection from notebook state; the margin marks.

**FUTURE PAYOFF:** The eye and mouth marks are the seed of the five note classes. The "When?" question is the first rung of the TIME progression's reasoning use.

**FAILURE / ALTERNATE:** If the player avoids both Nuto and William and goes straight to looking around, they still hear William's question later. William comes looking at about 15:20, mantle or no mantle, cold and amused, and asks it then. **The question cannot be missed. The answer can.**

---

### S11. When Did It Open? *(1:12–1:25)*: the small investigation

Full design in Section 7. In outline:

**TIME:** ~15:15 → Vespers hold (~16:05, light turning gold to red).

**LOCATION(S):** The cell (inside); the flower garden **under the west window** (outside); cloister west walk and garth (Fulco, novices at study after Nones); the store behind the guest house (Tebaldo with the straw).

**WHO IS PRESENT:** Fulco, Nuto, Tebaldo. William is upstairs in the great house (seen only as a lit window in the middle row).

**WHAT THE PLAYER IS DOING:** Using the house to establish *when* and *how* the shutter opened. That means inspecting the hook and frame, finding what fell outside, asking who was near at Nones, remembering what they themselves heard, and checking William's things. They compose an "I think…" line and decide whom to tell, with what.

**Resolution:** Tell Tebaldo before Vespers (with the fallen staple in hand, or the frame, or Fulco's word) → Tebaldo, confronted with his own rotten frame and his own complaint, relents. Nuto is spared, and later helps Adso re-lay his straw (S15).

---

### S12. Vespers *(1:25–1:32)*: the bell changes the abbey

**TIME:** 16:21 → 16:57. Sunset at 16:40 falls during the office.

**LOCATION(S):** Wherever the player is → the church → the guests' place.

**WHO IS PRESENT:** The whole community in body: brothers filing from the east range and the cloister, novices, Rainaldo at the lectern, Tebaldo, William arriving from the north door, servants pausing at their work.

**WHAT THE PLAYER IS DOING:** The bell rings. **What happens around the player, wherever they are:**
- Work stops. Nuto sets down his bucket mid-stride and crosses himself; the novices on the parapet shut their books together.
- The cloister drains toward the church door in a slow file. Conversation stops mid-sentence: Fulco, mid-joke, closes his mouth and goes.
- Rainaldo is already in the choir lighting lamps. As the light outside goes red, the inside of the church becomes the brighter place for the first time that day.
- The guest-house store is left unattended; the cloister west door stands open and empty; even the wind seems to drop for a moment (a scripted lull, not physics).

**The player goes to the guests' place by themselves.** Nobody leads them. They know the way (S7). **This is the day's main route test, and it happens without UI.** If they hesitate for more than ~20 s, Fulco, late again, runs past and hisses "This way, guest!", which is a diegetic fallback.

**In church:** William arrives from the north door, still in the mantle, and stands beside Adso at the pillar. The office begins with the existing recorded opening versicle (*Deus in adjutorium*, which opens Vespers as well as Prime; reuse is legitimate), then psalmody. The player can stand, look and listen. Play time is about 3–4 minutes, condensed from the in-game office. Optional: watch Rainaldo turn the leaves and move the lamp; watch the brothers' faces in the lamplight; watch the windows go from red to blue.

**If the investigation is resolved**, William, under his breath during a pause in the psalms:

> **William:** *"Well?"*

Adso can whisper a single line from the notebook (the "I think…" line). William nods once. He does **not** restate it or improve it, and saves his questions for later. *(If unresolved, William whispers "Later" and that's all.)*

**WHY THE PLAYER WANTS TO DO IT:** Everyone is going. The bell is the strongest summons of the day, the deadline has arrived, and William will be there.

**WHAT THEY LEARN WITHOUT BEING TOLD:** **The bell changed the abbey.** Rooms emptied, work stopped, speech stopped and light moved inside. The player now knows what a "major office" *feels* like before ever being told the word.

**OPTIONAL BRANCHES:** Ignore the bell and stay in the cloister or cell. The office proceeds without them: the player hears it through doors and sees the house empty. Afterwards Tebaldo notes (not unkindly) that guests are not obliged, "but it is noticed". William at night asks where Adso was, without reproach, and then asks what the house was like with everyone gone (a different, still valid observation).

**SYSTEMS USED:** Office transport (existing continuous chant through doorways); bell; crowd presentations walking a scripted file into the choir (small extension of the existing crowd fixture: fixed routes, no AI); lamp lighting; lighting rig sunset; guests' place anchor.

**FUTURE PAYOFF:** After Day 1, every Vespers bell recalls this one, and later deviations from it (a late bell, an absent brother) become noticeable because the player has lived the normal version.

**FAILURE / ALTERNATE:** If the matter is unresolved at the bell, Tebaldo has gone in with everyone else. The player can still catch him at the church door **as the office ends** (a 60–90 s window as brothers file out toward supper). If they miss that too, Tebaldo makes his report and Nuto is sent to the yard for a few days. That is a local consequence (Section 7, outcome C), not a failure screen.

---

### S13. Supper and the Barred House *(1:32–1:38)*: full design only

**TIME:** 16:57–17:51.

**LOCATION(S):** The refectory on the great building's ground floor `[SOURCE]` (refectory place note: torches, rows of tables, the Abbot's table on a dais, a reader's pulpit). Guests' seating is `[CANON CHECK]`.

**WHO IS PRESENT:** The community; William; Adso; the Abbot at his table `[public function]`.

**WHAT THE PLAYER IS DOING:** Eating in silence while someone reads aloud. **A comic human beat:** Adso doesn't know the sign for "pass the bread" `[HISTORICAL — cite: monastic sign lists]`, makes the wrong one, and a brother passes him the salt with a perfectly straight face. Fulco, across the hall, nearly chokes. William does not help.

**The library's strongest Day-1 interior moment:** The first time inside the great building. In a corner the player can see the foot of a stair going *up*, and a closed door. Nobody uses it; nobody explains it. When supper ends and the community files out, the player hears the doors barred behind them `[SOURCE]` (claim_000173): the same kind of iron-on-wood sound the player heard at the gate at noon, now closing the great house.

**PROTOTYPE:** **Elided.** After Vespers, William says "Supper, then sleep." There is a short fade with continuous sound (footsteps, bowls, a reader's voice under the fade), and the day resumes at S15 at the guest-house stair by lantern light. This is a production cut, not an adaptation decision, and it is listed as such in Section 17.

---

### S14. Compline and the Way Back in the Dark *(1:38–1:43)*: full design only

**TIME:** 17:51–18:40.

**LOCATION(S):** Refectory door → **across the cemetery in a lantern-lit file** to the church's north door `[SOURCE]` (claim_000592) → Compline → through the church → cloister → west door → guest house.

**WHAT THE PLAYER IS DOING:** Walking in a silent procession by lantern among graves under a clearing sky. The house is strange again: routes known by day are different by night. After Compline the community goes silent to bed. William and Adso cross the dark cloister with one lantern, by a route the player now knows, though it looks different in the dark. **The night makes the monastery strange again.**

**PROTOTYPE:** Compline is **heard** from the cell: a bell, then faint chant along the existing church → cloister → guest-house acoustic path. It is folded into S15.

---

### S15. Straw and Lamplight *(final ~10 minutes)*

Full detail in Section 13. In brief: back in the cell; the straw re-laid (by Nuto, if Adso cleared him, or by Adso alone from Nuto's sack); the shutter tied shut with cord by the player's own hands; William at the east window looking at the dark crown; *"What did you see today that I could not?"*; William confuses Fazio with Nuto and Adso can correct him; William's one request for tomorrow; the lamp goes out; sleep.

---

## 7. First Small Investigation: "Snow in the Straw"

`[ORIGINAL GAME FICTION]` A small hospitality accident in a working guest house. No death, theft, conspiracy or book is involved, and it does not echo any source event.

### 7.1 Authored truth (the event table)

| In-game time | What actually happened | Who could know |
|---|---|---|
| ~13:10 | Nuto opens the west shutter **a hand's width**, setting its iron hook in the **second eye**, a ventilation position. He sweeps and leaves for straw. | Nuto only |
| ~13:20–14:20 | The shutter stays ajar on its hook. Light north wind. | Nobody checks |
| ~14:20–14:30 | The wind veers west and gusts. The shutter is levered against its hook; **the eye-staple tears out of the old, soft frame** and falls **outside** into the snow of the flower-garden bed under the window, with a pale splinter of wood. The shutter swings wide and begins to bang. Snow and loose straw blow in; William's hose blow off the sill. | Anyone in earshot (Fulco, the player); the physical traces |
| 14:24 | Nones bell. **Fulco**, late, runs from the novices' house past the guest house to the church and hears the banging. | Fulco |
| ~14:30–15:00 | The cell fills with a fan of powder; the straw is blown; papers on the table get wet. Nobody enters. | Physical traces; the undisturbed order of Adso's things |
| ~15:00 | Adso arrives for the mantle. | Adso |

**The truth Adso can establish:** *Nuto left the shutter ajar on its hook, as he said. Around Nones the wind tore the hook's eye out of the rotten frame and blew the shutter wide. Nobody came into the room or touched William's things.*

### 7.2 Who cares about the result

- **Nuto**: his place in the warm guest house against being sent back to the yard; his pride in "doing it properly".
- **Tebaldo**: the honour of his guest house before a famous guest, and his own temper, which he'll regret.
- **Adso**: he packed and placed William's things; his bed is soaked; he is protective of William.
- **William**: his papers (mildly), and much more his pupil's thinking.

### 7.3 Plausible explanations a player may hold

1. **Nuto was careless and left it open:** Tebaldo's version.
2. **Nuto is lying about setting the hook:** Adso's impulsive version on Path A.
3. **Someone came into the cell:** to look through the famous guest's papers. It is plausible given the rumour that "this guest looks at everything" and William's audience with the Abbot.
4. **Fulco came in:** he admits he was near the guest house at Nones. Curiosity about the guest is plausible.
5. **The wind:** the truth, though not yet the full account of *how* the wind could open a hooked shutter.

Each is understandable at the moment of discovery. The design makes the wrong ones *reasonable*, never stupid.

### 7.4 Evidence and where it physically is

| # | Evidence | Kind | Where / how obtained | What it does and does not establish |
|---|---|---|---|---|
| E1 | **The hook swings free on the shutter; a raw fresh hole and torn fibres in the frame where its eye was** | Environmental | Cell, inspecting the west window up close | Something tore the eye out by force. It doesn't say what or when |
| E2 | **The iron eye-staple with a pale splinter, lying in the snow under the window** | Environmental (physical object; can be picked up) | Flower garden bed, directly below the west window, seen from the garden or by looking down from the window when the player thinks to | The eye was set (pulled out *with* wood) and fell outward. That supports "hooked, then forced" and is evidence against "never set". It doesn't give the time |
| E3 | **Everything in the cell is exactly where Adso put it** | Environmental, **known only to Adso** | Inspecting the papers, chest and pegs | Nobody searched. That is evidence against explanations 3 and 4. William, Tebaldo and Nuto could not tell |
| E4 | **Nuto: "a hand's width, hook in the second eye"** | Testimony | Nuto | What Nuto says he did. Consistent with E2 |
| E5 | **Fulco: "It was banging like a mad thing when the bell went for Nones — I was late — don't tell Brother Tebaldo I was over there."** | Testimony | Fulco, in the cloister or garth (friendlier if met in S8) | When it was already open. Fulco was outside, below, running |
| E6 | **The player's own hearing: banging toward the guest house after the bell** | First-hand observation (optional) | Only if the player was in earshot after Nones (S8) | Same as E5, first-hand |
| E7 | **Tebaldo: "only Nuto and I go up to the guest cells" + his own complaint about rotten frames since Michaelmas** | Testimony | Tebaldo (the complaint may already be in the notebook from S7) | Limits who could enter; makes the rotten frame his own known grievance |
| E8 | **The wind rose at about Nones** | Shared environmental experience | Everyone felt it; Nuto says his knee told him | Gives the force a time |
| E9 | Snow fan and blown straw radiate **from the window** | Environmental | Cell floor | The wind did the blowing. It says nothing about how the shutter came to be open |

**No single item solves it.** E2 + E4 establishes "it was set". E5 or E6 + E8 establishes "it opened around Nones". E3 + E7 establishes "nobody came in". E1 links force to the frame.

### 7.5 What the player physically does
- Inspect the window up close (E1). If the player tries to *close* it, it won't latch, and that is how most players find E1.
- Go **outside and under the window** to the flower garden (E2). Motivation comes either from looking out of the window and down (the player sees a small dark thing in the white) or from reasoning "where did the eye go?"
- Walk to the cloister to find Fulco (E5), or remember what they heard (E6).
- Check William's things (E3).
- Talk to Tebaldo (E7) and Nuto (E4).

Every step uses a different part of the Day-1 footprint: the cell, garden, cloister and store.

### 7.6 William's role (and limit)
William asks **one question** ("When did it open?") and then leaves for the great house. **He doesn't come back until Vespers.** He doesn't know the house, Nuto, Fulco or the shutter's history, and he never saw the cell after noon. Everything the player establishes is something William *could not* have. At Vespers he listens. At night he asks how, never what.

### 7.7 The player's inference (bounded, player-owned)
Once the player has **at least two** relevant items, the notebook offers Adso the phrase **"I think…"** with a short completion built from what they've actually found. They pick one or two clauses:

- *…it opened **[around Nones / after Nuto left / while Nuto was here / I can't tell when]**,*
- *…because **[the wind tore the hook's eye out of the frame / Nuto never set the hook / someone opened it]**,*
- *…and **[nobody touched William's things / someone went through William's things / I can't tell whether anyone came in]**.*

Any combination can be written. The game judges **support**, not obedience: when Adso tells someone, they react to what the claim is resting on (7.8). A player can also write their own free note. Free text is never parsed for correctness.

### 7.8 Resolution and outcomes
Adso can **show** objects and **tell** inferences to Tebaldo (in the store, then at the church door before or after Vespers), and later to William.

| Outcome | What Adso brings Tebaldo | Result |
|---|---|---|
| **A. Full** | The staple (E2) + the hole (E1) or the "since Michaelmas" frame, **and** a time (E5/E6) | Tebaldo turns the staple over, goes quiet, then blames the carpenters, at length. Nuto keeps his place. Tebaldo, embarrassed, sends Nuto up with fresh straw. Nuto helps Adso re-lay the bed (S15) and warms toward him: *"You looked under the window. Nobody looks under windows."* |
| **B. Physical only** | The staple and the frame, no time | Same outcome for Nuto; Tebaldo grumbles "the wind, I suppose". William, at night, asks *"When?"*, and Adso has only half an answer. A mild, useful incompleteness |
| **B'. Fulco protected** | The player establishes the time from Fulco but **doesn't name him** to Tebaldo (Fulco begged) | Works if the staple is shown. Fulco is grateful tomorrow. If the time is *needed* (no staple), Adso must choose: name Fulco (Nuto saved; Fulco scolded and cool tomorrow) or not (Tebaldo less convinced). **A small loyalty decision within Adso's character** |
| **C. Unresolved / wrong** | Nothing, or "someone searched William's papers" with no support | Tebaldo makes his report after Vespers; Nuto is sent to the yard for a few days. Adso re-lays his own soggy straw. Nuto is cool when they meet tomorrow. Nothing else is lost. If Adso alleges a search, Tebaldo is alarmed, checks with him, finds nothing out of place by his own eye, and dismisses it. William at night asks what made Adso think so, interested rather than reproving |

**No outcome blocks Day 2.** All of them persist as greetings, Nuto's warmth or coolness, Fulco's trust, and Tebaldo's view of Adso.

### 7.9 What this teaches that *may* be useful later (without being secret foreshadowing)
- **Physical knowledge of the guest house:** which window faces the weather, that its frames are rotten, that a sound from it carries to the cloister west walk. Useful if guests lodge here later.
- **Social knowledge:** only Tebaldo and Nuto enter guest cells. Novices pass the guest house on their way from their house to the church. Fulco is late at Nones.
- **Method:** a statement and an observation can be about different moments. "When?" is a question one can investigate.
- **Relationships:** Nuto and Fulco now owe Adso something, or don't.

Nothing here hides a later revelation. If it's ever used again, it's as lived knowledge.

### 7.10 Requirements check

| Requirement | Met by |
|---|---|
| Someone cares | Nuto, Tebaldo, Adso, William (7.2) |
| More than one plausible explanation | Five (7.3) |
| Physical use of the abbey | Cell, garden under the window, cloister, store (7.5) |
| Environmental evidence | E1, E2, E3, E9 |
| Evidence from a person | E4, E5, E7 |
| William doesn't point to the solution | He asks "When?" and leaves (7.6) |
| Modest player-owned inference | "I think…" composition (7.7) |
| Understandable wrong assumption | "He lied" / "someone searched" (7.3) |
| Resolves within Day 1 | Before or just after Vespers (7.8) |
| May be useful later without being secret foreshadowing | 7.9 |

---

## 8. William/Adso Relationship

### 8.1 William on Day 1: who he is in this day
He is cold, hungry, curious, sociable in a dry way, keen on the great building, tired after the audience, and fond of Adso. He doesn't know the house any better than Adso does, and **he spends most of the afternoon in places Adso can't go.**

### 8.2 How it is shown (behaviour first, lines second)

| Behaviour | Where | What it shows |
|---|---|---|
| **Walks ahead, waits without calling** | S1, S3 | Leader; patient; absorbed |
| **Carries his own books, nothing else** | S1 | What he values; a small vanity |
| **Stops for a hinge, a bar, a building** | S1, S2 | His attention goes to *how things work* |
| **Hungry, cold, wet; makes jokes about it** | S2, S5 | A body, not an interface |
| **Asks "What have you seen?"** without correcting | S5 | Interest in Adso's eyes, the founding ritual |
| **Wants to go up; is told no; visibly minds** | S3 | Desire; he can be refused |
| **Comes back from the Abbot quieter** | S9 | He carries things he doesn't share yet |
| **Asks one question and leaves** | S10 | Teaches method, then trusts the pupil with it |
| **Listens at Vespers; doesn't restate** | S12 | Respect for the pupil's own conclusion |
| **Gets a local fact wrong and is glad to be corrected** | S15 | Fallible about the house; generous |

### 8.3 The walking order (the single most important system)
Day 1 sets the **EARLY** parameters, which later days re-tune into *beside* and then *behind* (Round 3):
- William leads at about 5–7 m and walks ~8% faster than Adso's default.
- If the gap exceeds ~12 m, he stops at the next authored *look point* (a stone, a hinge, a view) and waits there, absorbed, until the gap is under ~5 m.
- If Adso passes him, he lets Adso go ahead and follows at ~4 m, saying nothing. **On Day 1 this is the only place the inversion appears, and only if the player chooses it.** It's a free, wordless hint of the future.
- He never says "follow me", "this way" or "hurry".

### 8.4 The one small glimpse: Adso noticed something William did not
**At night, William conflates Fazio and Nuto** (S15): "the old fellow with the knee who took our mules". Adso has met both, knows their names, and has stood beside each. William saw both briefly, in passing, both old men in brown. If the player corrects him, William pauses, then:

> **William:** *"Two of them. I'd have thanked the wrong man in the morning."* (A beat.) *"You'll have to keep the names for both of us."*

It's tiny, it's about **people** (the lower house, where Adso lives and William doesn't), and it's the first time William receives local knowledge from Adso. If the player doesn't correct him, the moment passes, and William learns it on Day 2 from someone else.

The **day's "only Adso" observation** is the separate E3: Adso alone knows that nothing in the cell has been moved.

### 8.5 What William does not do on Day 1
He never gives a destination, never tells the player what they found, never summarizes the case, never says "well done" for an answer he supplied, and never lectures for more than two sentences. He never knows what he couldn't know: he wasn't in the cell, the garden or the cloister in the afternoon, so his knowledge model on Day 1 includes only what Adso told him.

### 8.6 William's Day-1 knowledge model (implementation note)
Track **told / not told / told late** for: the shutter, Nuto's claim, Fulco's lateness, the staple, the inference, Fazio vs Nuto. William's night lines select from this record. A William who "just knows" breaks the relationship (Round 3).

---

## 9. Notebook Introduction

### 9.1 Physical form
A few folded **offcut leaves** William gave Adso for the road, written in Adso's hand. (A wax tablet was considered and rejected for Day 1: wax invites erasure, while this notebook's rule is *annotate, never delete*.) `[HISTORICAL — cite for offcuts and writing implements a travelling novice might carry]`

### 9.2 When it is first used
In **S7**, after Tebaldo's rush of rules, from a real need to remember. If skipped, the first use is S10.

### 9.3 What enters automatically, and what the player chooses

| Enters automatically (no notebook entry, just memory) | Player chooses to write |
|---|---|
| A **people page**: every person met gets a *description* first ("old lay man, limps, straw on his tunic"), and a *name* once Adso hears it. Fazio's and Nuto's descriptions sit near each other | Every line on the main page is chosen from candidate lines in Adso's voice, or written freely |
| An **observation log** (not shown as a page) holds things perceived, with place and Adso-style vague time ("after the bell"). It feeds conversation choices (S5, S15) and the candidate lines | Margin marks *seen* or *told* (from S10 onward), optional |
| **Attributed claims** ("Nuto says…") stored with speaker, place and time; never promoted to fact | "I think…" lines (from S11) |
| Automatic **vague timestamps** on written lines ("after the meal", "after a bell", "near dark") | Annotations under earlier lines |

### 9.4 What the Day-1 notebook does **not** have
No quest list, objectives, checkboxes, map, category buttons, contradiction detector or "case solved" stamp. It runs to two pages: lines and people.

### 9.5 Can early entries be corrected?
**Yes, by annotation, never deletion.** Any line can receive a note beneath it in a visibly later, slightly different hand:

> *Nuto says he set the hook. He lied. The shutter was wide open.*
> ↳ *(that night) He set it. The wind tore it out after. I wrote "lied" before I knew when.*

On Day 1 the player is likely to make **one** annotation, prompted at night only by the physical situation: the leaves lying open on the straw at that page, with no instruction. The S7 lines ("No one may go up but those who keep the books") remain unannotated and naive, waiting for later days.

### 9.6 How William influences Adso's writing without becoming UI voice
- He asks questions **about what Adso said or wrote** (S10), never about the interface.
- The **margin marks** appear *after* his question, as Adso's own habit. No announcement or "new feature" text accompanies them.
- At Vespers or night, when Adso shows him a line, William reacts to its **support** ("And how do you know nobody came in?" "Because everything was where I put it." "Ah.").
- He never edits, grades or rewrites a line.

### 9.7 Budget
Notebook open for **under 10% of Day-1 play time.** Most Day-1 reasoning happens on the window sill, in the garden snow and in the cloister.

---

## 10. Ordinary-Life Moments

These scenes are not padding. They are the baseline that later deviations will be measured against.

| Moment | With | Required? | What it does |
|---|---|---|---|
| **The meal in the cell:** bread, olives, raisins, wine; wringing William's hose (S5) | **William** | **Required** (short) | Shows William as a body and a friend; starts the "what have you seen" ritual; makes the cell home |
| **Holding the mule while the porter checks a shoe** (S2) | Fazio | Required (brief) | Station; the gate's rhythm; Fazio's face |
| **Carrying bundles, walking the route alone** (S3–S4) | Alone / cellarer | Required | Place learning through work |
| **Unpacking and arranging William's things** (S6) | Alone (Nuto enters) | Required | An ordinary task that later becomes Adso's private evidence |
| **Carrying water from the well with Nuto** (S8) | **Nuto** | **Optional; the recommended "someone else" moment** | Lower-house life, a working body, the knee, the daughter, and the beginning of trust |
| **Raisins and a forgotten verse with Fulco** (S8) | Fulco | Optional | Friendship of equals; rule-breaking kindness; laughter |
| **Watching Rainaldo prepare the choir** (S8/S12) | Rainaldo | Optional | Observing preparation for an office; books come *down* |
| **Re-laying the straw bed** (S15) | Nuto (if cleared) or alone | Required (one form or the other) | Night closure; consequence made physical; warmth |
| **The wrong hand-sign at supper** (S13) | The community | Full design only | Embarrassment, laughter, the house's silent language |

---

## 11. Optional Exploration

### 11.1 The free hour (S8): where, what, what can be missed
**Open:** cloister (four walks, garth, well), church nave and choir (not the sanctuary or the skull chapel's interaction), guest house and flower garden, gate court and avenue.
**Closed:** dormitory, chapter house, Abbot's house, east range, the great building, the outer gate (closed again after their arrival; Fazio is not there to open it).

**What it offers (none required):**
- People: Fulco (verse, raisins, jokes), Nuto (water), Rainaldo (books and lamps).
- Observations: the shutter's banging (most valuable), the middle-row windows lighting, the capitals, the avenue's long view to the gate, novices at study.
- Routine: Nones as a rehearsal transition.

**What can be missed with no penalty:** everything. A player who explores nothing still meets Fulco and Nuto in S11, with slightly cooler greetings, and still sees Nones and feels the wind.

### 11.2 The investigation window (S11): freedom of order
The player can visit the cell, garden, cloister and store **in any order**. Fulco, Nuto and Tebaldo are each findable in one or two places with fixed simple beat positions. Evidence can be combined in several ways (7.4). Order changes dialogue, not solvability.

### 11.3 The pacing guardrails
- The footprint is small. Every place is within about 120 m, and the church tower is always a landmark.
- Closed doors are closed by *people and custom* (a head shake, a polite "not for guests"), never by invisible walls in the open.
- The soft holds (Section 5) keep the day moving without timers.

---

## 12. Library Presence

**Rule:** the library is felt, never entered. Two strong moments and one light touch. It is never mentioned more often than every 20–30 minutes.

| Moment | Strength | What happens | Basis |
|---|---|---|---|
| **The first view** (S1) | **Strong** | The great building's west tower faces the travellers head-on; three rows of windows; William's long, silent look and one line of appetite | `[SOURCE]` gate and Aedificium notes |
| **The refusal** (S3/S7) | Light | Guests go up only when invited; the top floor is for "those who keep it"; barred after supper. William visibly minds | `[SOURCE]` claim_000173; rest `[SOURCE-ADAPTED, CANON CHECK]` |
| **Books come down** (S8) | Light, optional | Rainaldo carries a gathering into the choir: "books don't go visiting" | `[ORIGINAL GAME FICTION]` |
| **William is up there** (S9–S12) | Medium | William spends the afternoon in the work-room; Adso sees the middle-row windows lit and the top row dark | `[SOURCE-ADAPTED]`: Adso's absence is Open Canon Decision 1 |
| **The barring** (S13, full design) | Strong | The stair going up in a refectory corner, unused; the doors barred behind the community | `[SOURCE]` claim_000173 |
| **The dark crown** (S15) | **Strong** | From the cell's east window: the great building above the church, its last lit lower windows going dark. William, who has been *inside* it today, looks for a long time. He says something about what he was allowed to see and what he wasn't: that one asks and another fetches, that he saw the work-room but not a single shelf | `[SOURCE]` east-window view; William's remark `[SOURCE-ADAPTED, CANON CHECK]` |

**Never on Day 1:** light in the top-floor windows, sounds from the library, a forbidden-book request, a hint at the library's internal order, any reference to protected library mechanisms, or the player entering the great building above the ground floor.

**Why the player wants to go in eventually:** William wants it and was refused; it's the one place the house says *no one* goes; the player has seen it from four positions and at three times of day; and the person they admire came back from its doorstep different.

---

## 13. Day-1 Ending: the Final 10 Minutes

**TIME:** about 18:45 (after Compline in the full design; after the elided supper in the prototype).
**LOCATION:** The guest-house stair by lantern → the cell.

### Beat 1: The stair in the dark (≈1 min)
William and Adso climb the outside stair with one lantern. The wind has dropped and the sky is clearing. It is very cold and very quiet. The route the player walked four times by day is strange by lantern. The flower garden is black and white, and the cloister wall is a shape. *(Prototype: the day resumes here.)*

### Beat 2: Making the bed (≈2 min)
- **If Nuto was cleared:** he is there with a sack of dry straw, knee and all. He and Adso re-lay the niche together (interaction: take an armful, spread it). Nuto talks about his daughter's children, not about the shutter, and leaves with one line of thanks that is about the *looking*, not the result.
- **Otherwise:** the sack is at the door. Adso re-lays it alone. Through the window, far off, a lantern bobs across toward the yard: Nuto going to his other work.
- **The shutter:** Adso ties it shut with a cord from the luggage (interaction). The problem is physically closed by the player's own hands. Tebaldo will have it mended "when a carpenter can be spared".

### Beat 3: William at the window (≈3–4 min)
William sits on the bed, then stands at the **east window**, looking at the great building above the church. Its lowest windows are lit, and one by one they go dark as the house is barred `[SOURCE]`. Then it is a black mass against the stars.

He asks, as at noon, but now it carries weight:

> **William:** *"What did you see today that I could not?"*

The player chooses **one or two** items from Adso's notebook and observation log. William answers each specifically. Authored responses cover the shutter account (he asks *how*, never *what*), Nuto, Fulco, the empty cloister at Vespers, the middle-row lamps and the people page. Anything else gets a short warm generic response.

Somewhere in this exchange comes **the glimpse** (8.4): William confuses Fazio and Nuto, and Adso can correct him.

Then William gives a little of his own day without content `[PROTECTED context]`. He is tired, he was shown a work-room and not a shelf, and the Abbot "has asked me to look at something, and I have not yet decided what I'm looking at." (Final wording is subject to canon review and must not disclose the matter.)

### Beat 4: The leaves (≈1–2 min)
William lies down. Adso's leaves are on the straw, open at the S10 page. The player may read, annotate (9.5) or close them. Nobody prompts. If they annotate, the new line appears in the later hand.

### Beat 5: The request, the lamp, the dark (≈1 min)
From the dark, William makes his request (this is the Day-2 hook; Section 14):

> **William:** *"Tomorrow I'll be about the Abbot's business more than I'd like. You'll be in the house. Bring me one thing tomorrow night that I could not have seen."*

The lamp goes out. Through the east window the crown is a darker shape against the dark. Wind is faint at the cord-tied shutter. Far off, a door closes. **Lying down in the straw ends the day.** No "Day 1 complete" appears, and there is no summary screen. The next time the leaves are opened, a new day heading is waiting.

**What the player carries out:** *curiosity* (what is up there, and what did the Abbot ask?), *intimacy* (the shared bed-making, the window, the request), *unease* (William's quiet, the barred black building, a house with rules they've only begun to learn) and *anticipation* (tomorrow William asked something of them).

**What must not happen:** a cliffhanger sting, an older narrator, music swelling over a title card, any foreshadowing of Day 2's events, or any night office bell before sleep (Day 2's opening belongs to the Day-2 designer and canon reviewer; this document assumes nothing about it).

---

## 14. Day-2 Hook

Each option grows out of Day 1.

**Option 1: "Bring me one thing."** *(Recommended)*
William's request at lights-out. It formalizes the "what have you seen" ritual from noon and night into a daily, player-owned agenda. It gives Day 2 a personal purpose that doesn't depend on the canonical plot, it is the first explicit sign of **independence** (William will be away, and Adso's eyes are wanted), and it binds the relationship's emotional line to the method line. It sets no destination, so the player decides what is worth seeing.

**Option 2: "Before the brothers are up."**
Fulco, grateful (raisins, verse or protection), whispers at Vespers that tomorrow, between the morning offices, he'll show Adso a place where "you can see the whole road down to the valley". That offers friendship, a new spatial vantage over the gate (a quiet later payoff when outsiders arrive) and the strangeness of the house at dawn. It's limited to players who befriended Fulco.

**Option 3: "The carpenters are wanted elsewhere."**
Tebaldo's grievance: every carpenter is busy preparing rooms "for the visitors who are coming". Tomorrow he wants Adso's help readying other guest rooms, which brings access to the rest of the guest house, a sense of the house bracing for important arrivals, and a working role. It's a good institutional seed, but colder as a final beat.

**Recommendation: Option 1.** It is the only hook that is *about the player's attention*, which is the game's core promise. It works for every player regardless of Day-1 choices, and it puts William's relationship, Adso's growing independence and the notebook into a single sentence spoken in the dark. Options 2 and 3 survive as ambient Day-2 threads offered by residents: Fulco's invitation if friendship was earned, and Tebaldo's request in the morning. That also demonstrates, on Day 2, that residents start bringing things to Adso.

---

## 15. Required vs Optional Content

### 15.1 Required spine (the day doesn't work without these)
1. Road → reveal → Sext bell → gate (S1–S2)
2. Reception → first route walked with others → cell (S3)
3. Second trip alone (S4)
4. Meal with William; William leaves for the Abbot (S5) + `[PROTECTED SOURCE EVENT slot]`
5. Unpacking; Nuto at the shutter (S6)
6. Tebaldo's rules; first notebook use (S7)
7. Nones transition and the wind (S8, the bell part only)
8. Discovery; Tebaldo's accusation (S9)
9. Nuto's claim and/or report to William; **"When did it open?"** (S10)
10. Vespers transition with the player finding the guests' place (S12)
11. Night: bed, window, "what did you see", request, sleep (S15)

### 15.2 Optional life
The sea view; holding the mule well; the hose; pocketing raisins; Fulco's verse and raisins; carrying water with Nuto; sitting through an hour; watching Rainaldo; following the Nones office in; the hand-sign at supper (full design); the night procession (full design).

### 15.3 Optional observations
The worn gate bar; Fazio's scar and the loose shoe; three rows of windows; the shutter banging after Nones; middle-row lamps; the top row always dark; the capitals; books brought down; the cloister empty during Nones; the house barred at night.

### 15.4 Optional *within the investigation* (any sufficient subset works)
E1, E2, E5 or E6, E3, E7. Outcome quality varies (7.8), and solvability never depends on optional life.

### 15.5 Source-grounded material (summary)
Mountain road with pine roof and sea glimpses; the west gate as the only opening; the avenue to the church; the great building's west tower facing the visitor; three rows of windows; the cellarer leading the guests to their cells (claim_000142); passing the flower garden (claim_000115); the guest house among the buildings round the cloister (claim_000114); the outside stair; the niche of fresh straw (claim_000146); the food brought on the first day; the crown seen above the church from the cell window; the barring of the great building after supper (claim_000173); supper in the torch-lit refectory; the procession through the cemetery to the north door for Compline (claim_000592). Every place-note item cited from `web/src/data/places.js` needs claim-ID verification before shipping. The browser notes are a reviewed reading view, not the authority.

### 15.6 Original game fiction (summary)
Tebaldo, Nuto, Fulco, Rainaldo and Fazio; the loose shoe; the shutter, hook, staple, rotten frame and wind; Nuto's airing; the carpenter grievance; the raisins and verse; William's specific lines; Fulco's dawn vantage; all dialogue.

### 15.7 Play-time budget (full design, first play)

| Sequence | Minutes |
|---|---|
| S1 Road | 6–8 |
| S2 Gate during Sext | 4–6 |
| S3 Reception & walk | 6–8 |
| S4 Second bundle | 3–4 |
| S5 Meal (+ protected slot if Adso attends, ≤5) | 6–7 (+0–5) |
| S6 Unpacking | 4–5 |
| S7 Rules & first notebook | 6–8 |
| S8 Free hour & Nones | 8–16 |
| S9 Discovery | 3–4 |
| S10 Testimony & question | 5–8 |
| S11 Investigation | 8–15 |
| S12 Vespers | 5–7 |
| S13 Supper (full) | 5–7 |
| S14 Compline & dark walk (full) | 4–6 |
| S15 Night | 8–11 |
| **Total** | **≈ 81–120 (+0–5 for the protected slot); median ≈ 85–90** |

The low end assumes a brisk player who skips most optional life (≈ 75 is reachable by skimming S8). The upper end is driven by S8 and S11, the two free periods, and is deliberately the lingerer's range. If playtests show the median above 95, cut S2's wait (the gate is open on arrival), compress S7's tour, and shorten S14. Never cut S5 or S15.

---

## 16. Production Footprint

### 16.1 Locations (from Section 4)

| Classification | Locations |
|---|---|
| **AVAILABLE NOW** | Cloister walks, garth, well; church nave, choir, cloister door, north door; guest-house exterior shell; Abbot's house / chapter house / dormitory exteriors |
| **SMALL EXTENSION** | Last road bend; gate, gatehouse, gate court; avenue; flower garden; church west facade (low detail); guest-house stair, landing, corridor and **one** furnished cell with a working shutter; Aedificium exterior context shell with two window-light states; portal records for the cloister west doors; guests'-place and look-point anchors |
| **SIGNIFICANT MIGRATION** | Aedificium ground floor (refectory) for supper; cemetery path for the procession (small once the shell and refectory exist) |
| **DESIGN-ONLY FOR LATER** | Scriptorium, library, stables and farmyard, novices' house, Abbot's house interior, dormitory interior |

The skull chapel and ossuary stay migrated but **inert in Day-1 mode.** The altar interaction is disabled and the stair closed. The existing canonical porch resident is suppressed.

### 16.2 People and animals

| Item | Status |
|---|---|
| **William**: hero character, face, walk with lead/wait pacing, talk gestures, eat/sit/stand-at-window | **SIGNIFICANT** (final). Prototype stand-in: refit an existing browser brother template with a Franciscan habit, a distinct head and correct proportions |
| Adso: first-person hands and sleeves, carry poses | SMALL |
| Tebaldo (`monk_b`), Fulco (`novice_a`), Rainaldo (`scribe_a`) | **AVAILABLE NOW** templates; new stable identities |
| Nuto, Fazio: lay men | **SMALL EXTENSION** (fit two of the browser's lay cast through the existing normalization pipeline; must be distinguishable *and* superficially similar) |
| The cellarer; the Abbot | SMALL EXTENSION (browser abbot template exists; the cellarer can use a generic brother). Abbot optional in prototype |
| Community at Nones and Vespers | AVAILABLE NOW as crowd presentations; SMALL EXTENSION for a scripted file walking into the choir (fixed routes, no AI) |
| Two mules | SMALL EXTENSION (browser mule asset; halter-follow and idle) |

### 16.3 Systems

| System | Status | Note |
|---|---|---|
| Clock, horarium, offices | Exists | Add beat-gated holds (Section 5) |
| Office transport, acoustic paths | Exists | Add Sext, Nones and Vespers pieces or reuse the opening versicle; guest-house leak path for Compline |
| Bells | **New audio** | One recorded bell, varied by office |
| Wind with an afternoon rise; shutter bang emitter | Wind exists; **new** event and emitter | Captions for the bang |
| Passage tracker | Exists | Used for route metrics, never for rewards |
| Portals (gate bar, cloister west doors, guest-house doors, shutter) | Exists (portal model) | New records and props |
| Lead/wait follow behaviour for William | **New (most important)** | Parameterized for later days |
| Escort-without-waiting for Tebaldo; scripted beat routes for 5 actors | **New, small** | Beat positions, not simulation |
| Carry, place, give, hold-steady, show-object | **New, small** | A handful of verbs |
| Conversation UI with topic choices drawn from the observation log | **New** | Shared with the Leaf case's planned primitives |
| Attributed claims vs observations | **Planned** in `GAME_DESIGN.md` | Required |
| Notebook: lines, people page, margin marks, "I think" composer, annotation | **New** (extends the existing minimal notebook) | |
| William knowledge model (told / not told) | **New, small** | |
| Scenario save (Day-1 v1) | Extends the existing versioned save | Section 17 |

---

## 17. Minimum Playable Prototype

**Goal:** the smallest build that can answer the Section 18 questions. It is not a polished Day 1.

### 17.1 Included sequences
S1 (shortened road: one bend, ~60 m), S2, S3 (no Abbot: the cellarer carries the message), S4, S5, S6, S7, S8 (Fulco and Nuto optional moments included; Rainaldo's book crossing included), S9, S10, S11, S12, S15.
**Cut:** S13 supper (elided with a sound bridge), S14 procession (Compline heard from the cell), the hand-sign joke and the protected-slot scene (William simply goes to the Abbot offstage).
Expected prototype length: **60–75 minutes.**

### 17.2 Locations required
Road bend + gate court + avenue + flower garden + guest-house stair and one cell (new); cloister + garth + church (existing); Aedificium exterior shell (new, low detail).

### 17.3 Characters required
William (stand-in), Tebaldo, Nuto, Fulco, Rainaldo, Fazio, the cellarer, 2 mules, 12–20 anonymous brothers for the offices.

### 17.4 Animations required
Walk / idle / talk for all; William: lead-walk, wait-and-look, sit and eat, stand at window, put on mantle; Nuto: limp-walk, carry bucket, carry straw, spread straw; Fulco: run, sit-and-mouth-psalm; Tebaldo: hurry-walk, hand-rub; Rainaldo: carry book, light lamp; Fazio: lift hoof, lead mules; brothers: file-walk, choir-stand; mules: walk on halter, idle, head-toss. Shutter: swing/bang (prop). Reuse the existing nine fitted task clips wherever they fit.

### 17.5 Dialogue required (text only, no voice)
Estimate **≈ 280–330 lines**: William ~110, Tebaldo ~50, Nuto ~40, Fulco ~45, Rainaldo ~15, Fazio ~8, the cellarer ~8, plus ~40 Adso choices and ~30 notebook candidate lines. Every William and Adso line passes canon review and forward-spoiler review.

### 17.6 Time transitions required
Set 11:30 → Sext at the gate → event-set to the meal → free-period compression → Nones → hold for William → hold for Vespers → Vespers with sunset during the office → elided supper → night at ~18:45 with Compline heard.

### 17.7 Interaction types
Walk; look; hold (mule lead, hold steady); carry; place (unpack); give/take (food, raisins, mantle, straw); open/close (doors, shutter); talk (topic choices); show (staple); sit/wait; write (choose line, mark, compose "I think", annotate); lie down (end).

### 17.8 Notebook minimum
Lines page with candidate-line selection and free note; automatic vague time/place stamp; people page (description → name); margin marks *seen*/*told* appearing after S10; "I think…" composer with 3 slots; annotation in a later hand; never-delete rule.

### 17.9 Sound requirements
Wind (existing) with an afternoon rise and night drop; shutter bang (new, spatialized, captioned); bell (new); Sext/Nones/Vespers chant (reuse the existing opening versicle plus one psalm piece; licences recorded); Compline faint through the guest-house path; footsteps on snow, stone and **wood** (wood bank new); mule hooves and breath; straw rustle; door creak (existing); gate bar lift and drop; crowd footsteps for the file; eating.

### 17.10 Save requirements
A scenario save `day1/v1` storing: clock and beat; actor beat positions; portal states (gate, doors, **shutter: ajar/torn/tied**); custody of the **staple** (in the snow / in Adso's hand / with Tebaldo); paper placement; observation log; attributed claims; notebook lines, marks and annotations; people-page entries; relationship flags (Nuto cleared/sent away/hurt; Fulco raisins/verse/protected/named; Fazio's first impression); William's told/not-told map; passage-tracker route records. **Autosave silently** at the cell (S3), after the meal, at the Vespers bell, and at night, plus F5/F9. Old proof saves are rejected clearly without being overwritten (existing policy).

### 17.11 Relationship to the planned Leaf case
`GAME_DESIGN.md` names *The Leaf Before Vespers* as the next milestone, with an original clerk protagonist. The Day-1 prototype needs **most of the same primitives**: attributed claims, a few persistent actors on fixed routes, an office transition with an access change, a conversation UI, a notebook that keeps attribution, and a scenario save. **Owner decision (not made here):** either replace the Leaf case with this prototype as the next Agent A target, or build the shared primitives once and use Day 1 as the content that validates them. The Windows/human-validation entry gate in `PLATFORMS.md` applies either way. This document does not change the canonical documentation.

---

## 18. Playtest Plan

### 18.1 Participants
At least **8 people unfamiliar with the code**: 3 who have not read the novel, 3 readers (of whom at least one has finished it, to act as canon sensor), and 2 who play investigation or adventure games regularly. First session silent and observed, with no think-aloud during the first 30 minutes, then a structured interview. Never count developer completion as player validation.

### 18.2 Instrumented metrics (logged, not shown)
Time per sequence; the gap to William during S1/S3; hesitation and route errors on S4 and at the Vespers bell; whether the shutter bang was in earshot and whether the player stopped; evidence items found and in what order; whether "lied" was kept, struck or never written; annotations made; notebook open time; ordinary-life scenes engaged, skipped or mashed through; outcome A/B/B'/C; William's night correction offered and taken.

### 18.3 Core questions (from the brief, with how to measure)

| # | Question | Measure | Target |
|---|---|---|---|
| 1 | Did players understand who Adso is without exposition? | Interview: "Who were you, and what was your relationship to the man you arrived with?" | ≥ 7/8 describe a young pupil/servant of William, unprompted |
| 2 | Did William feel like a person rather than a quest system? | "Describe William in three words." Count functional words (guide, hint, quest-giver) versus personal ones | ≤ 1/8 use functional words first |
| 3 | Did they learn at least one route naturally? | S4 and the Vespers bell: hesitation logs; post-session "describe how to get from the gate to your room" | ≥ 6/8 reach the guests' place at Vespers without Fulco's fallback |
| 4 | Did they recognize at least 3 recurring people? | Portrait test: 6 faces (5 cast + 1 decoy) → name or role | ≥ 6/8 identify 3 or more |
| 5 | Did a bell transition feel like part of the world? | "What happened when the evening bell rang?" | Most describe people/rooms/light changing, not "time advanced" |
| 6 | Did they form the first inference themselves? | Logs + "How did you decide what happened to the shutter?" | ≥ 5/8 reach outcome A or B with no developer help |
| 7 | Did William's correction feel stimulating rather than patronizing? | 1–5 rating plus quote | Median ≥ 4; ≤ 1/8 "patronizing" |
| 8 | Did the notebook help without solving the problem? | Open time; "What was the notebook for?" | Open < 10% of time; described as "my notes/memory", not "quest log" |
| 9 | Did ordinary life feel worthwhile? | Skip/mash logs for S5, S8 life, S15 bed; "best moment?" | Fewer than 1/4 mash S5; at least 2/8 name an ordinary-life moment as a favourite |
| 10 | Did players want to continue? | "Would you start Day 2 now?" (yes/later/no) + why | ≥ 6/8 yes or later, for a reason tied to place, people or William |

### 18.4 Additional questions
11. **"Why did the shutter open?"** asked a day later. Tests whether the inference stuck as the player's own.
12. **"What do you think is on the top floor of the big building?"** Tests curiosity without spoiling. The answer should express a wish to go there, not fear or indifference.
13. **"Who in the abbey would you trust tomorrow, and why?"** Tests relationships.
14. **"Did anything feel like a tutorial?"** Every "yes" must be traced to a cause.
15. **"Was there a moment you felt clever?"** and **"…felt stupid?"** If the "lied" draft produces "stupid" in more than 1/4 of players, it needs rewording.
16. **(Readers only)** "Did anything contradict what you remember of the book's opening?" This is a canon sensor, not a canon review.
17. **"When did you first feel you knew your way around?"**

---

## 19. Failure Criteria (kill or redesign)

**Redesign the specific element if:**
- **William reads as a hint system:** more than 2/8 describe him functionally first, or players wait for him to tell them what to do in S8/S11. Redesign the lead/wait behaviour and cut lines; William should say *less*.
- **The route didn't take:** fewer than half reach the guests' place unaided at Vespers. Add a second solo errand on the cloister route earlier, not UI.
- **Faces don't stick:** fewer than half recognize 3 people. Strengthen silhouettes and habits (limp, keys, ears), or cut one cast member.
- **The bell feels like a clock:** most describe Vespers as "time skipped". Make the transition slower and more visible: more people moving, work visibly stopping near the player.
- **The investigation is a fetch:** players describe it as "find the thing". Make the staple less findable on its own and the *time* more necessary to Tebaldo's acceptance.
- **The correction stings:** more than 1/8 call William patronizing, or more than 1/4 feel "stupid" at the "lied" draft. Make the draft optional or softer, and give William's question more warmth.
- **The notebook takes over:** open time above 15%, or players describe it as a quest log. Remove candidate lines and drop to free notes plus the two marks.
- **Ordinary life is mashed through:** more than half skip S5 or S15. Shorten them, but first test whether they are *funny* and *physical* enough. Do not delete them.
- **Too long:** median above 100 minutes. Apply the cuts in 15.7.

**Kill or rethink the Day-1 concept (escalate to the owner) if:**
- Fewer than half want to continue (Q10), **and** the reasons are about the premise ("nothing happens", "when does the real game start?") rather than execution.
- Non-readers cannot say who Adso is (Q1 below 5/8). The Adapted Adso premise is then not landing, which is a Round-3 abandonment signal.
- The finished-book reader flags a canon contradiction in the protected zone that cannot be fixed without restructuring the day.
- The prototype cannot hold the existing performance gates with 7 actors, 2 mules, a 20-person file, wind and the Aedificium shell. Reduce the footprint before adding anything.

---

## 20. What Day 1 Must Prove Before Day 2 Is Designed

1. **The walking relationship reads as character.** Lead and wait, without words, makes William a person. Every later inversion depends on this baseline.
2. **A bell can change the world for the player.** One major transition (Vespers) is felt as the house changing, not as a clock jump. Days 2–5 rely on deviations from rhythms the player has lived.
3. **Ordinary life is enjoyable on its own.** The meal, the water and the straw are played, not skipped. Later "nothing is normal any more" needs a normal the player valued.
4. **The player can reason from distributed physical and testimonial evidence without William.** At least one supported inference is formed with no help.
5. **The notebook's naive-then-annotated arc is understood without instruction.** Players annotate or want to, and describe the leaves as *their* memory.
6. **Four to six residents are learnable in one day.** If not, every later day's cast budget changes.
7. **The beat-gated clock doesn't feel like a hidden timer.** Players feel time through light and bells and don't feel rushed or stalled.
8. **The production footprint holds.** The new strip, one interior, the Aedificium shell and seven actors stay inside the proof's performance envelope on Mac and, once tested, on Windows.
9. **The canon policy works.** A finished-book reviewer accepts Day 1's compressions (Open Canon Decisions below) or supplies the minimal changes.

### Open canon decisions (for a reviewer who has finished the book)
1. **Adso and the Abbot's audience / the work-room visit on the first afternoon.** Does the source require Adso to be present for content the later campaign depends on? If so, use the protected slot in S5 (≤5 minutes) and/or move S9's trigger to after it. The Day-1 spine absorbs either choice.
2. **The arrival-road encounter.** Reference it offstage, or stage it as a short witnessed scene before the last bend? It must not become an Adso deduction.
3. **The reception party and guest seating at supper** (the cellarer, the Abbot, and where guests sit).
4. **The weather on the arrival day**, and whether a wind change in the afternoon conflicts with anything in the source.
5. **The original cast names**, checked against the source's cast. **Rainaldo's role**, checked against any canonical choir official.
6. **The tone of William's lines**, especially the evening remark about the work-room and the Abbot's request, for forward-spoiler safety.
7. **The church's west portal** is kept as background on Day 1 (the route turns off before it). Its first meaningful presentation is reserved for the canon reviewer, because the portal carries canonical weight that this document does not try to stage.

---

## Final Design Tests

### If we removed the investigation from Day 1, would spending time with William and learning this monastery still be enjoyable?

**Yes, with one honest qualification.** Without the shutter, Day 1 still has the climb and the reveal; the empty gate during a bell William can explain and Adso can't; the meal of olives and raisins with a wet, funny, hungry teacher; the first walk alone with a chest of ink; Tebaldo's comic, too-fast rules; Fulco's verse and raisins; carrying water with Nuto; Vespers draining the house into a lit church as the sun goes down; and the window, the straw and the request. Those are enjoyable *as company and place*.

**The qualification:** without the investigation, the afternoon (S9–S11) would be about 20 minutes of drifting, and the night question "What did you see that I could not?" would have little to answer. The investigation is not what makes Day 1 enjoyable. It is what gives the enjoyable things *consequence*. The design passes this test only because ordinary life sits on the required spine (S5, S7, S12, S15) rather than being optional.

### If we removed William from the small investigation, would the player still know how to attempt it?

**Yes.** The problem is physically legible: a banging, unlatchable shutter; a hook swinging free; a raw hole; snow fanned from the window; a wet straw bed; William's things undisturbed. Tebaldo supplies an accusation and therefore a reason to act; Nuto supplies a counter-claim; Fulco and the player's own ears supply time; and the staple lies where anything torn from that window would fall. A player who never hears William's question can still close the shutter, find it won't latch, look down from the window, go and ask Nuto, and reach outcome A or B.

What William adds is **not the route to the answer but the dimension of the question**: *when*, not *who*. Without him, players are more likely to stop at "Nuto didn't lie" (outcome B). With him, they're more likely to establish the time as well (outcome A) and to write "I think" instead of "he lied". That is the right division of labour: **the house supplies the evidence, Adso supplies the eyes, and William supplies the habit of asking one more question.**

**Both answers are yes. Day 1 is recommended for prototype implementation, subject to owner review and the open canon decisions above.**
