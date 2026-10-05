# Story Council Round 3 — Repository-Grounded Feasibility Designer

**Date:** 2026-10-03
**Seat:** Repository-Grounded Feasibility Designer. My job is not the best novel-shaped pitch but what choosing Adso actually changes in the implementation roadmap, and which progression ideas can already be tested with systems that exist today.
**Read:** `README.md`, `docs/PROJECT.md`, `docs/GAME_DESIGN.md`, `docs/PLATFORMS.md`; the Round 1 reports and Round 2 `literary-campaign-architect.md`; native domain/adapter/UI files (`game_session.gd`, `knowledge_state.gd`, `horarium.gd`, `game_clock.gd`, `routines.gd`, `conditions.gd`, `interaction_rules.gd`, `portal_states.gd`, `access_rules.gd`, `passage_tracker.gd`, `save_service.gd`, `character_presentation.gd`, `player_controller.gd`, `audio_director.gd`, `alinardo_presence.gd`, `hud.gd`, `main.gd`); `shared/data/`; `native/tests/run_tests.gd`.
**Spoiler status:** only the owner's six approved premises plus traits of William and Adso obvious from the novel's opening framing. No later event, death, culprit, solution, hidden identity, revelation, secret location or mechanism, fate, motive, outcome or chronology is named; pressure points use `[placeholders]`. The repository's novel-derived secret route is deliberately not described or used.
**Hygiene:** inspection only. No code, data, canonical documentation or Git state was changed; the only file created is this report. I have not read any other Round-3 report, including the one already in this folder.

---

## 0. Executive summary

**The systems answer:** nothing in the implementation depends on whether the player is Adso or an original person. There is no William, no dialogue, no scenario engine, and one incomplete NPC pattern (Alinardo). The next planned milestone — platform hardening plus the bounded case *The Leaf Before Vespers*, with three stable actors, attributed claims, an observation/account layer and an extended save — is **identity-independent**. Every hour spent making William real, making actors keep schedules, or separating testimony from observation serves all four models equally. Adso changes the **writing, review and certification pipeline**, not the engineering.

**The product answer:** the progression hypothesis (PLACE → TIME → PEOPLE → METHOD, independence as the arc) is real and can be produced from existing or already-planned systems, with two missing producers: multi-actor routines and a claim/observation record. The name Adso does not *require* it; what it buys is identity — the player fantasy, the canonical William bond, and "learning to see" as the novel's own subject. It costs a permanent canon-review process and an expectation the protected plot cannot satisfy.

**Verdict preview:** **ADAPTED ADSO** — Adso is the player; the game is an interactive account of the stay, not a reenactment; protected events stay fixed; agency lives in attention, interpretation, relationships and the record. The comparison table still favours the original companion on risk criteria; the abandon gates say what should overturn me.

---

## 1. Repository ground truth the Adso question depends on

The brief refers to "existing William/NPC/clock/knowledge/access/audio systems." Three exist; William does not. This distinction is the foundation of everything below.

| Area | What is there | Consequence for Adso |
|---|---|---|
| **William** | Nothing. `entities.json` holds Alinardo, one novel-derived pivot and one fixture; templates are `alinardo`, `monk_a`, `monk_b`, `novice_a`, `scribe_a`. No model, routine, lines or presence. | Every model keeping William beside the player (A, B, C) pays the same first cost: cast, schedule, conversation surface. Adso saves no William work. |
| **NPCs** | One pattern: Alinardo's phase availability, fixed seat, look-at-player. No path planning, dialogue or actor state beyond presence. | "Three stable actors" is the planned Leaf milestone, not a capability. Adso only changes what people say. |
| **Clock** | Day + decimal hour; 8 offices; 21 phases; curfew; daylight. `GameClock.rate` defaults to **0.0** — time does not pass in normal play. One chant serves every office; `bell.mp3` exists but is unwired. | Lived time and bell wiring are needed by every model; already implied by the design doc. |
| **Knowledge** | Allowlisted discovery IDs; idempotent notes with `by`, `day`, `hours`; rooms-visited array; unknown IDs rejected. Folio shows title, place, "seen", "reading", "told by". **`add_room()` is never called.** | The honesty spine exists; note classes, revision, a time strip and an account composer are missing — all identity-neutral. |
| **Access** | Portal states; curfew egress; allowlisted conditions (`known`, `phase_in`, `office_in`, `hour_between`, `portal_target`, `curfew`…). Most listed doors are sealed by phase-1 boundaries. | Access-as-evidence is ready inside the migrated cells. Trust can be earned knowledge IDs plus conditions — no reputation numbers. |
| **Audio** | One office transport; a real church acoustic-path model; wind, footsteps, one creak. Four more chants, bell, handbell and dozens of banks exist unconverted. | Earshot is the project's most distinctive perceptual mechanic; bell-based time cases are a small conversion task. |
| **Player and save** | First-person capsule with no body or voice. Versioned, checksummed save: transform, day, hours, portals, knowledge. No scenario ID, actor progress, custody or hypothesis. | No Adso avatar to build. Any campaign model needs save schema v2 + migration. |

**Finding 1.** The Adso choice is not an engineering fork. The first playable proofs are the same build under any identity; only words, framing and review obligations change.

**Finding 2.** The progression hypothesis maps onto a concrete, mostly planned layer — attributed notes with classes, vantage observations produced by physically standing/walking/waiting, multi-actor routines, and NPC reactions keyed to earned knowledge IDs. The Leaf case needs the same layer; build it well and Adso's growth and an original companion's growth both work.

**Finding 3.** The binding constraint is authoring/review, not systems: the owner is still reading, and an Adso adaptation needs a canon steward who has finished the book to certify that original content neither reproduces, parodies nor contradicts protected material.

---

## 2. The four models through a feasibility lens

**MODEL A — Strict canonical Adso.** Chronology and character track the novel; original content is minimal. **Reject.** It is currently *unauthorable*: every scene needs fidelity certification against a text the owner has not finished; the player is a passenger where stakes peak; originals look like apocrypha; replayability is near zero; IP exposure is maximal. It wins only fidelity, which the process cannot deliver.

**MODEL B — Adapted Adso.** Player is explicitly Adso; the game declares an interactive account of the stay, adding original conversations, small investigations, daily life, alternate approaches and player-owned interpretation without claiming missing chapters; protected events stay fixed and mostly outside the playable field. **Viable with a bounded process cost.** Systems equal C/D. Added costs: an adaptation policy, a canon-steward pass per unit, a light framing layer, stricter wording, expectation management. The risk is whether the game can be emotional and active while its famous material is guarded.

**MODEL C — Original companion.** The companion seat is an invented young clerk; no Adso in this telling. **The safest engineering answer and Round 2's choice.** Maximum mission and dialogue freedom; no canon inside the player's story; no voice to pastiche; lower IP exposure. It gives up the canonical bond, weakens the marketing hook, and replaces the novel's narrator with an invented person — often read as erasure.

**MODEL D — Original abbey assistant.** The player belongs to the house and meets William there. **Fallback only.** Strong for missions and access, but it contradicts the approved arrival premise and deletes the outsider learning curve: a local already knows place, times and people.

---

## 3. Central Question 1 — Does playing Adso make the game better?

Not emotionally; structurally. The honest ledger:

**What Adso gives that an original companion cannot:** (1) the player fantasy is the book's fantasy — "be Adso learning from William" needs no explanation; (2) the mentor relationship has priors, so scenes begin inside intimacy; (3) the learning curve and the character are the same thing — getting better at the game *is* getting better as Adso; (4) literary recognition is the moat, and a stranger to the world spends the game outside its emotional centre; (5) the departure — leaving an abbey you lived in, beside a teacher who now trusts you — is a real ending, where a temporary notary's exit is administrative.

**What Adso costs:** (1) protected outcomes cap causal agency, so attention, interpretation, relationships and the record must carry the weight; (2) the voice burden — thin Adso is a cipher, imitation risks pastiche (safe answer: near-silent in-scene, player-controlled, sparse framing); (3) permanent canon review; (4) expectation risk — some players want the novel retold and the base game deliberately will not.

**Would players rather be Adso or an original person?** For the audience this project exists to serve, Adso wins clearly; for non-readers it still wins on legibility — a named apprentice with a known teacher beats an unnamed invented assistant. The original companion wins one axis only: freedom to be genuinely responsible for outcomes. That axis is real — it is why Round 2 chose C — but attention-agency (Section 4) partially recovers it. Identity, relationship, progression, marketing and literary meaning cannot be recovered once Adso is removed.

**Judgment:** yes, playing Adso makes *this* game better, provided the design stops pretending to be a plot-heavy mystery and commits to an apprenticeship of perception inside a guarded canon. If player-authored outcomes must come first, choose C and drop the protagonist question entirely.

---

## 4. Central Question 2 — Can Adso have player agency?

Yes, if agency means **what Adso attends to, what he makes of it, whom he trusts, what he records, and how he behaves with people**, and if the game is honest that he cannot rewrite fixed facts.

**Safe decisions:** investigation order; what he notices (vantage observations only exist if physically performed — the passage tracker already enforces "earned by being there"); whom he spends time with; which small original matters he helps with; interpretations; confidence marks and revisions; what he writes; what he tells William or withholds; optional relationships; how he approaches a problem (ask/watch/walk/wait/read/compare); free exploration within access rules.

**Damaging decisions:** rewriting protected events or their outcomes; solving protected mysteries or exposing protected mechanisms in the base campaign; treating novel characters as interchangeable suspects; turning Adso into a conventional hero or free-floating personality; quoting the novel's prose as dialogue; presenting originals as "deleted scenes"; putting the player "wrong about the world" in ways that imply the novel is wrong.

**Facts fixed; local outcomes fluid; canon response chosen.** Fixed: what happened, original truths, canonical events, identities, fates, protected material — no randomised culprit. Fluid: what was perceived, how much is understood, whom the player believes, what is written and with what confidence, what is said or withheld, which residents trust Adso, whether a small matter ends kindly or harshly, which optional matters are taken. Where the novel fixes something, the player chooses only his *response and record* — what he does about what he sees, whom he tells, what he leaves unwritten. That is the design doc's own `NOVEL_CANON` / `ORIGINAL_GAME_FICTION` taxonomy, applied consistently.

---

## 5. Central Question 3 — Adso as progression, with no conventional stats

Growth is expressed as capability in the world, access, NPC behaviour and the notebook's own vocabulary. Five tracks, no numbers.

**PLACE.** Routes, entrances, sightlines and plausible paths become known because they were walked. Rooms entered are recorded (`add_room` needs its producer); vantages used become timed observations; the map shows only what was walked. The player feels it by no longer needing directions, by leading someone along a route, by judging which route a testimony implies. *Room volumes, visited-rooms storage and save/restore exist; producer and map surface are missing.*

**TIME.** Bells acquire meaning; routines become anticipated; unusual timing becomes visible. Offices and phases already drive lighting, curfew and availability; bells need wiring; the clock needs to run or offer a wait. The hours strip is the player's own day. *Strongest data foundation, weakest lived-time implementation.*

**PEOPLE.** Duties, habits and expertise become familiar through stable routines, names earned by meeting, and trust modelled as earned knowledge IDs — no friendship meters. The player feels it when residents greet them, ask for things, or when someone behaves unusually *because* the usual is known. *One actor pattern today; Leaf commits to three; scale is content, not technology.*

**METHOD.** Notes start coarse ("Brother X said the door was closed"), then gain sources (saw / was told / read / inferred), confidence and revision after an assumption misfires and William teaches the categories. Later, the sentence type that fooled the player is an object they handle; the reward is a better question. *Attribution and `seen`/`reading` already exist; missing are a typed field, append-only revision and the teaching scene — needed by Leaf anyway.*

**STANDING.** Access and independence grow: rules keyed to earned notes and hours; residents approach the player directly; William's availability declines. The player feels trusted with what they were watched doing at the start, and late belongs where important conversations just stopped.

| Moment | Feeling | Delivered by |
|---|---|---|
| Hour 1 | Small, disoriented, curious. | Arrival task; unreadable bell; getting lost; a kind correction. |
| Hour 3 | Beginning competence: found the way back once; one person knows your name. | Route recognition; a repeated face; first sourced note. |
| Midpoint | Trusted: a resident asks you directly; you challenge a claim on the spot. | Direct approach; live timing challenge; William acts on your observation. |
| Late | Weight and separation: William elsewhere, your notebook the only record. | William scarce; access churn; *[central pressure increases]*. |
| Ending | Ownership and loss: a place you lived, written down. | Departure walk; folio read back; people react to outcomes. |

**Growth is communicated** through world capability (doors open, routes used without checking), dialogue register, folio language (categories appear, old crude entries remain as a trace), William's behaviour (instruction → question → silence) and access. No numbers on screen; counters only in QA.

---

## 6. Central Question 4 — William and Adso as the emotional centre

William must not be quest-giver, marker, hint button, omniscient detective or narrator of the player's discoveries. With no navmesh or companion AI, the honest near-term implementation is **fixed conversational anchors by phase** plus short scripted walking exchanges on authored paths; a following companion with pathfinding is a later, expensive feature and should not be on the critical path.

| Phase | William | Player | State change |
|---|---|---|---|
| Arrival | Asks, never instructs; suggests the test. | Watches, reports. | First attributed note; "What did you see that I could not?" |
| Early | Asks the question; player chooses the test and order; challenges support, never names places. | Chooses method; is corrected in the right place. | Method categories appear after a misfire. |
| Middle | Hands over incomplete questions; admits uncertainty; runs several threads. | Brings observations only they could get; challenges a claim live. | Residents approach the player directly. |
| Delegation | Occupied; available rarely; asks for things he cannot get. | Acts alone; the record becomes the player's responsibility. | William's routine narrows; the audience shifts to residents and officials. |
| Late | Broader knowledge, narrower presence; wrong once for honest reasons (he lives at the high table; the player lived the routine). | Decides what to report, to whom, when; keeps or breaks a confidence. | A late scene where the player's evidence, not his reasoning, is decisive. |
| Departure | "Write what you saw, not what I said." | The folio is read back. | Nothing to unlock; the record stands. |

**What Adso becomes capable of:** noticing first, because he is there when William is in a session and knows the rhythm well enough to feel a deviation; correcting William with lived evidence; being trusted with a problem that begins with a resident; holding a question open; and choosing what the record says — the last authorized act.

**What changes in William:** the falling frequency of questions, not the tone. Early he asks and waits; mid-game he asks and leaves; late he states what he thinks and asks whether he is wrong. His *availability* is the emotional signal. When he is wrong, he is delighted, not offended — the payoff of the education.

---

## 7. Central Question 5 — Should older Adso frame the game?

The memoir frame is public and available, but a voice-over that explains meaning would steal deductions, spoil late understanding and replace immediacy with summary.

| Variant | Verdict |
|---|---|
| No older-Adso framing | Pure immediacy, zero cost; loses literary texture and an adaptation shield. |
| Sparse chapter-opening/closing reflection | Sets tone and marks days cheaply; dangerous if it comments on events. |
| Reflection only after major investigations | Emotional punctuation; grows expository fast. |
| Player-written notebook becoming the memoir | Frame and progression become one object; no omniscient voice; needs the account composer. |

**Recommendation:** combine the two strongest halves — a light memoir frame at chapter boundaries, quoting or paraphrasing only the player's own notebook, plus the notebook becoming the closing document. Older Adso exists as a temperament (distance, mild irony, affection), two or three sentences per day, never about hidden meaning, never before the player has acted, with an option to reduce it. The frame says *this is one imperfect account* — which is exactly what an adaptation is. It must never state an inference the player did not make.

---

## 8. Central Question 6 — Adso's notebook

The folio should evolve like a person's notes: crude, then classified, then revised and doubtful, then a document someone else might read.

| Class | In-world form | Taught by |
|---|---|---|
| OBSERVATION | "I saw the door standing open before Vespers." | William: "Write that you saw it. It is yours." |
| TESTIMONY | "Brother X told me the door was closed." | The first misunderstanding; "told by" already supported. |
| DOCUMENT | "The register says the lamp was issued on the third day." | A custodian interaction; note gains a source object. |
| INFERENCE | "I think the two accounts describe different evenings." | The first account-construction scene; marked as the player's own. |
| UNCERTAINTY | "I cannot establish who closed it." | A deliberate "leave it open" option; never punished. |

**Rules:** early notes are undisciplined — categories appear only after the teaching scene, taught by interaction, never announced as unlocked; old notes stay as written with revisions attached, so the first pages remain visibly naive; the notebook is not the primary screen (consulted at benches/desks; schedules continue); no auto-contradiction detection, clue brute force or confidence meters; the final account composes from the player's own record, and feedback names only missing support. **Feasibility:** typed notes, append-only revision, relation links, folio UI and account composer — all implicit in the Leaf case. Risk is UI sprawl; cap notebook interactions per hour.

---

## 9. Central Question 7 — First 90 minutes as Adso

Spoiler-safe, original, no tutorial furniture. Goal: the player finishes the evening wanting this place and these people, already holding one page of their own that will matter.

1. **Arrival (0–15).** The gate with William; he is received; Adso takes the pack and writing box to the guest lodging. Sensory first impression: cold stone, snow, distant chant, ink and tallow, a house bigger than expected. One porter and one novice recur (original, existing templates).
2. **The lodging task (15–30).** Place William's writing table "where the morning light will fall"; find lamp oil from the cellarer before the next office. The cellarer is anxious about expected visitors *[social pressure rises]*; the novice helps unofficially and expects trust. Teaches movement and one working person's world.
3. **The bell mistake (30–45).** A bell rings; new to the horarium, Adso assumes the office summons and hurries to the wrong entrance; he arrives late and hears chant from where guests do not sit. An older resident redirects him quietly; a novice hides a laugh. Bells are a language, not a single word.
4. **Optional exploration and one human moment (45–60).** Free wandering in cloister and porch with no objective marker; helping the lamp-keeper; the wrong hand-sign at supper; a restrained laugh. Ordinary life, deliberately.
5. **The evening report (60–80).** William asks the founding question — "What did you see that I could not?" Adso repeats a claim as fact; William asks whether he closed the door or saw it closed. No lecture: the first margin rule is *say who told you*. Method progression begins.
6. **Night (80–90).** Curfew; the wrong way back; a door that opens one direction only; a kind correction under a lantern. One small ordinary anomaly the player may note, returning in an early original matter *[object returns]*. Last line, William: "Keep that page. I think it will matter."

**Why Adso:** the challenge is small, personal and tied to his station; the misunderstanding is what the method track fixes; no crime is required. The beats work for an original clerk mechanically, but the report scene loses its literary charge — "a novice being taught to note what he saw" is the book's own material.

---

## 10. Central Question 8 — Adso and original missions

Original investigations can exist under the Section 12 policy. The ordinary categories (route/access questions, manuscript questions, disputes, communication failures, practical problems, memory/record problems, hospitality, missing ordinary objects, work coordination, timing discrepancies) are all sound.

**Policy:** at most one substantial original matter and two minor life moments per in-game day; five or six substantial matters across the stay; two or three quietly feed a later matter, at least one is deliberately unconnected. Most life matters optional; two or three substantial matters unavoidable because the player was present when they began. William's relationship to them changes: he set the question early; the player may tell him or not in the middle; he does not know at all late — the independence arc made concrete. Residents approach Adso directly, triggered by an earned knowledge ID, not a meter. Every matter changes at least one relationship (filler test: *after this, who greets Adso differently?*). No matter reproduces, paraphrases or contradicts protected material; every matter passes a finished reader's review; originals are never marketed as lost chapters. **Cost:** each needs the Leaf case's small system set plus authored content — systems shared and additive.

---

## 11. Central Question 9 — The papal delegation with Adso

The delegation is the approved pressure that changes social rules without the novel's plot. For Adso its function is structural: **it makes lived/local knowledge and written/formal knowledge both necessary.**

| William knows | Adso knows |
|---|---|
| Formal discussions, arguments, people of status. | Corridors, routines, servants, lower-status inhabitants, practical changes, what happened while William was elsewhere. |
| What was said in a session he attended. | What could be heard from the antechamber; who entered and left; how the session ran against the bells. |
| The shape of the political question. | Where the extra bedding went; which storeroom is short; who was moved and what they did about it. |
| The visitors' declared requirements. | The house's actual capacity to meet them, and who quietly pays for it. |

**Examples (all original):** the lodging order (precedence versus light, drafts and what can be overheard); the courier's pouch (a seal questioned; the porter's night habits decisive); two records of one sentence (Adso watched the door and knows what was audible — he adjudicates hearing, not theology); the distorted rumour; the delayed letter (message custody); a seat moved at table (precedence and courtesy, no crime). In each, the decisive knowledge is lived, not read: William's abstract and Adso's local understanding are both required, and the case cannot close from either chair. That makes Adso's station structurally necessary rather than sentimental.

---

## 12. Central Question 10 — Adaptation philosophy (Model B)

**FIXED:** Adso's identity as William's young novice/scribe; the mentorship and mutual trust; the broad setting and situation — arrival, several days, ordinary monastic life, rising disturbing matters, the papal delegation, theological and political pressure *[under description]*; recognisable foundations of major characters and world.

**ADAPTABLE:** daily-life scenes, conversations and small choices; exploration order and optional relationships; original matters with original people, subject to the collision test; interpretations, notes, confidence, revisions and account wording; local outcomes and social consequences.

**PROTECTED:** major novel events and outcomes; the central mystery and solution; hidden identities; late revelations; fates and revealed motives; secret locations and mechanisms (the proof's novel-derived route stays out of the default campaign until explicitly approved for a labelled episode); the novel's chronology in the sense that no invented scene is claimed as a canonical recorded event.

**Rules:** declare the frame on the title card (a different account of the same stay, not a retelling, not lost chapters); never dress an original as canon; never borrow a protected element and disguise it; fix facts but allow interpretation and local outcomes; a canon steward who has finished the novel reviews every unit before final authoring (the owner need not read ahead to supervise early prototypes); novel-derived episodes remain separate, labelled later; one world version per campaign.

---

## 13. Central Question 11 — Commercial / audience clarity

| Pitch | Clarity | Reader appeal | Non-reader appeal | Expectation risk |
|---|---|---|---|---|
| "Play as Adso and learn to investigate beside William." | Highest — one image, one relationship. | Very high: the existing fantasy. | High: legible mentor/apprentice mystery. | High: "replay the novel?" Must be contradicted at first touchpoint: *a new account inside the same stay*. |
| "Play an original assistant travelling with William." | Medium; needs a second sentence. | Medium: "why not Adso?" | Medium: the period is the hook. | Readers may feel the protagonist was erased. |
| "Play a monastery clerk who meets William." | Medium-high premise, low hook. | Lower. | High: self-contained historical role. | "Fan project" perception. |

**Best promise:** Adso — recognition, relationship and a built-in growth arc no invented protagonist can. **Greatest risk:** also Adso — if marketed as an adaptation of the plot. Mitigation is honesty: *the abbey you remember, a stay you haven't read — as Adso.* Readers get the character and world without the solution; non-readers get a classic apprenticeship; investigation players are promised perception, not case-breaking power. Shipped line: **"An abbey you think you know. A stay you haven't read. You are Adso."**

---

## 14. Central Question 12 — Production consequences of choosing Adso

Compared with Model C, Adso is neither cheaper nor more expensive in engineering. The true marginal ledger:

| Area | Adso vs original companion | Notes |
|---|---|---|
| Writing | Higher constraint, similar volume; light-touch in-scene Adso; framing. | The dialogue/claims layer is new in both models. |
| Character design | No player avatar. William required in both. | `player_controller.gd` has no body; William needs fitting regardless. |
| Animation | Identical: template clips; conversations on authored paths. | Five templates exist; William is a normal new actor. |
| William interactions | Identical systems; stricter wording; fixed anchors, no companion pathfinding. | Fits the existing routine pattern. |
| Continuity | Adds a canon ledger and frame; campaign needs scenario ID, actor progress, observations. | Save schema v2 needed for any model. |
| Localisation | Similar volume; higher register sensitivity. | Text-heavy either way. |
| Adaptation review | **Largest marginal cost** — recurring collision, spoiler and tone checks by a finished reader. | Process, not code; staff before final authoring. |
| Spoiler review | Higher frequency, same machinery. | The project already needs a spoiler-safe boundary. |
| Scenario authoring | Collision test and the "not a missing chapter" rule. | Additive to the existing scenario contract. |
| IP / clearance | Character use raises the derivative-work surface beyond architecture. | `PLATFORMS.md` lists public novel clearance as open. |

**Simplifies:** onboarding, the mentor relationship, the progression story, marketing, the ending's meaning. **Increases:** narrative QA, review latency, expectation management, clearance review.

**Roadmap delta:** the next milestone (hardening + one original case) is unchanged — the three-actor claims/observation slice is identity-agnostic. Add an identity A/B at the presentation layer (same systems, two scripts). Campaign authoring starts once a canon steward exists; the delegation extends the same actors/access systems; engine/Windows gates are unaffected.

---

## 15. Comparison of the four models

Scores 1–5 (5 strongest / easiest). Higher total is better only if every criterion deserves equal weight — it does not; judgment follows.

| Criterion | A: Strict | B: Adapted | C: Companion | D: Assistant |
|---|---:|---:|---:|---:|
| Emotional strength | 5 | 5 | 4 | 3 |
| Player agency | 1 | 3 | 5 | 5 |
| William relationship | 5 | 5 | 4 | 3 |
| Progression potential | 3 | 5 | 4 | 5 |
| Originality | 1 | 3 | 4 | 5 |
| Literary connection | 5 | 5 | 4 | 3 |
| Spoiler safety | 1 | 3 | 5 | 5 |
| Original-mission flexibility | 1 | 3 | 5 | 5 |
| Replayability | 1 | 3 | 5 | 4 |
| Production feasibility | 1 | 2 | 4 | 4 |
| Marketing clarity | 5 | 4 | 3 | 3 |
| Long-term expansion | 1 | 3 | 5 | 5 |
| **Total** | **30** | **44** | **54** | **50** |

**Judgment.** C wins because the table rewards freedom, originality and safety — exactly what B trades away. A cannot be built honestly under the current process. D is a fallback that loses the approved arrival premise and the outsider learning curve. I choose B anyway because three project-defining criteria — emotional strength, literary connection, progression — decide the product, and B ties or wins all three. C's advantage is risk reduction, which policy and prototypes can reduce; identity cannot be engineered back into C once lost. If the owner concludes the project does not need the novel's protagonist, C is correct and the systems plan is unchanged — that is the real decision this round; the table only prices it.

---

## 16. Three Adso prototypes

Each is built twice — as Adso and as an original clerk — one systems build, two scripts.

**1. "The First Evening, Twice" (mentorship and voice).** *Situation:* the 90-minute first day, evening report as climax. *Systems:* existing slice; William with phase presence and anchored conversation; attributed notes; one hour transition; optional exploration; two residents. *Why Adso matters:* whether borrowed familiarity produces stronger attachment — or canon paralysis and hint dependence. *Validates if:* Adso players show higher William engagement, equal or greater initiative, more "I want to know these people." *Abandon signal:* more asking-William, less acting, or "passive watching."

**2. "The Claim at the Door" (method progression).** *Situation:* a claim is recorded as fact; walking/waiting shows sight and statement differ; William teaches source categories; a second same-type claim must be tested unprompted. *Systems:* typed claim record with append-only revision; vantage observations from physical traversal (generalise the passage tracker); one access/hour rule; timing comparison. *Why Adso matters:* whether "separating what I saw from what I was told" reads as *his* growth — the most copyable quality an invented companion has. *Validates if:* the method transfers and players describe the shift in the first person. *Abandon signal:* tutorial-feeling categories, insulting mistakes, or no transfer.

**3. "William Is With the Legation" (independence and lived knowledge).** *Situation:* William unavailable for one block in delegation preparation; a resident brings a practical problem directly to the player (lodging overlap; a message that must not be overheard; a supply missing before an office); the solution needs lived temporal/spatial/social knowledge and ends with a choice of what to report, to whom, when. *Systems:* two or three actors with routines; knowledge-gated trust; one access/hour rule; conversation/report surface; light delegation texture. *Why Adso matters:* the brief's end-state — William has broader knowledge, Adso knows what William cannot because he lived it. *Validates if:* players feel trusted, choose deliberately, and articulate why local knowledge mattered. *Abandon signal:* indistinguishable from control, punitive absence, or only protected canon content satisfying.

---

## 17. WHY PLAYING ADSO MAY BE A MISTAKE

1. **The fixed plot makes the player a passenger at peak pressure.** The novel's biggest moments must be watched or responded to, never caused; attention may be too thin a substitute for causal agency.
2. **The canon steward is a permanent cost and dependency.** One reviewer bottleneck can stall content, and the owner cannot be the reviewer yet.
3. **The voice trap.** Write Adso thin and he is a cipher; imitate the narrator and risk pastiche; the safe middle weakens the identity being sold.
4. **Original missions look like apocrypha.** The moment a matter is engaging, a reader remembers it is not in the book.
5. **Spoiler management poisons marketing.** The most faithful scenes are the least marketable, weakening the recognition asset.
6. **Interpretation-only agency may not satisfy mystery players.** If outcomes cannot change, the genre's contract is altered and some will bounce.
7. **Canon paralysis is likely in playtests.** Fans hesitate to choose when they "know" what happened; non-fans may not care about the name.
8. **The novel's cast is sacred.** Reuse more names and review/spoiler risk rises; reuse fewer and it feels like a different abbey.
9. **IP exposure rises.** The narrator as player character is a different derivative-work posture than reconstructing an abbey; it needs a deliberate recorded decision.
10. **Failure is public and comparative.** A weak Adso adaptation is judged against a beloved book; a weak original companion is judged only as a game.

## WHY NOT PLAYING ADSO MAY BE A MISTAKE

1. **It discards the strongest player fantasy on the table.** Nobody dreams of being an invented assistant; the desire to walk beside William is a product feature that cannot be bought back later.
2. **It swaps the novel's protagonist for fan fiction**, asking the audience to accept a stranger in the story's central relationship — often read as erasure.
3. **The apprenticeship thesis becomes a simulation of itself** — Adso's arc with the name filed off; if the core is canon-shaped, the protagonist should be too.
4. **The natural tutorial disappears.** Adso's ignorance is the exact shape of the player's ignorance; an original companion must manufacture a reason to be new here.
5. **The late-game knowledge asymmetry loses meaning.** "Adso knows what William cannot" is dramatic; "the invented clerk knows" is a compliment to a stranger.
6. **It concedes the project's differentiator.** Many games offer original investigators in historical settings; few offer a serious adaptation of this world.
7. **Readers forgive invention in the margins; they do not forgive the empty chair.** Audiences accept new stories around beloved characters; they rarely accept a replacement protagonist presented as the better vehicle.

---

## VERDICT

**ADAPTED ADSO.**

## WHY

The systems are identity-neutral, so the choice is product identity, and this project's identity is the novel. Adapted Adso gives the player the fantasy no invented character can: to be the boy who learns to see, beside William, in this abbey. The progression hypothesis is only fully itself when the player's learning curve and the character's arc are one thing. The costs — permanent canon review and a protected plot capping causal agency — are payable through the declared policy, attention-agency design and a canon steward. Model C is the safer game; Model B is the right game here, cheap to prototype and honest to falsify.

## PLAYER FANTASY

You are Adso: young, book-learned, completely new to the abbey. You arrive with William carrying a writing box you do not yet know how to use well. Everything the house does — bells, doors, meals, silences — is a language you cannot read, and the game never hands you the dictionary. Over several days you learn the place with your feet, the hours with your body, the people by eating with them, embarrassing yourself and helping them with small things. Your folio starts foolish and slowly becomes precise. You are not the famous detective and you are not solving the novel; you are becoming the person whose record of this place will matter. The fantasy is not power — it is competence earned by presence, and when it pays, you are standing where the truth was visible.

## PROGRESSION

No stats. Five tracks felt through capability, access and behaviour: **PLACE** — routes, doors and sightlines become known because you walked them; the map shows only what you walked. **TIME** — bells and phases acquire meaning; you anticipate routines and notice deviations. **PEOPLE** — duties, habits and expertise become familiar; names are earned, trust is modelled as knowledge you actually acquired, and residents begin bringing you problems directly. **METHOD** — notes begin as flat statements, then gain sources (saw / was told / read / inferred), confidence and revision; early pages remain visibly naive. **STANDING** — doors open because someone knows you; William's availability declines as your independence rises. The player never sees a number; they see themselves acting differently.

## WILLIAM RELATIONSHIP

**Beginning:** he asks the questions and suggests the tests; you observe and report; he challenges the support for claims, never names where to look; the first evening he asks, "What did you see that I could not?" **Middle:** he asks, you choose the test; he hands you incomplete questions and admits uncertainty; you correct him once about a person or route because you were there and he was not. **End:** he is occupied with *[central pressure increases]*; you act alone with knowledge he lacks; he tells you what he believes and asks whether you are convinced; the relationship closes with "write what you saw, not what I said" — he stops doing your thinking, and you keep the record.

## FIRST 90 MINUTES

Arrival at the gate with William; sent round with the writing box to the guest lodging; one ordinary task (the desk by the morning light, lamp oil from the cellarer); a bell misread as a summons, arriving late and hearing the office from the guests' place; optional exploration of cloister and porch; one human moment — helping the lamp-keeper, a laugh at a wrong sign at supper; the evening report where Adso repeats a claim as fact and William teaches the first source rule; night, curfew, a barred door, one small ordinary anomaly the player may note and keep. No crime required. Ends with William: "Keep that page. I think it will matter."

## PLAYER AGENCY RULE

The player owns **attention, interpretation, relationships, method and the record** — what Adso notices by standing where he stands, whom he trusts, what he writes, how sure he is, what he says to William and when, which optional matters he takes, and how he treats people. The player does **not** own facts or protected outcomes: what happened stays fixed, canonical events stay protected, original matters have authored truths, and guilt is never randomised. Canon responses belong to the player; canon causes do not.

## ADAPTATION RULE

FIXED: Adso's identity, the William relationship, the arrival, the broad setting and situation, the delegation and rising pressure. ADAPTABLE: daily life, conversations, exploration order, optional relationships, original matters, interpretations and notebook wording, local social outcomes. PROTECTED: major novel events, the central mystery and its solution, hidden identities, late revelations, fates, motives, secret locations and mechanisms, and the novel's chronology. The title card declares a different account of the same stay; originals are never marketed as lost chapters; a canon steward who has finished the novel reviews every unit; protected elements are never borrowed and disguised. Fix facts; allow interpretation and local consequences.

## ORIGINAL-MISSION POLICY

Original matters are ordinary-institution stories: route and access questions, manuscript questions, hospitality, supply and timing discrepancies, memory and record problems, communication failures, small disputes, missing ordinary objects. One substantial matter per in-game day plus two minor life moments; five or six substantial matters across the stay; at least one deliberately unconnected and two or three that quietly feed a later matter. They may be raised by residents directly, often begin without William's knowledge, always change at least one relationship, and never reproduce, paraphrase or contradict protected material. Filler test: after this matter, who greets Adso differently? If nobody, cut it.

## PAPAL-DELEGATION FUNCTION

It makes the familiar strange (rooms, routes and hierarchy reorganise), makes information valuable (what was said, who heard it, who wrote it down) and takes William away. Adso then holds the lived/local knowledge — corridors, servants, timing, practical changes, what happened while William was elsewhere — while William holds the formal/political knowledge. Cases close only when both chairs contribute: lodging and precedence, a courier's pouch, two records of one sentence, a distorted rumour, a delayed letter, a seat moved at table. No novel scene is reenacted; the delegation is the approved pressure that turns familiarity into evidence.

## CAMPAIGN LENGTH

One declared stay of six playable days plus a departure morning: 9–12 hours for a first careful play, 4–6 on replay, with the first 90 minutes a standalone prologue. Five or six substantial matters; fifteen to twenty small life moments; one unassigned window per day. Compress days rather than extend them if the middle drags; the adaptation declares its own continuity and does not claim the novel's calendar.

## THREE PROTOTYPES

1. **"The First Evening, Twice"** — the 90-minute first day built as Adso and as an original clerk on one systems build; tests attachment, initiative, hint dependence and canon paralysis.
2. **"The Claim at the Door"** — testimony versus observation, notebook classes and revision, and transfer of method to a second claim; tests whether learning-to-see reads as Adso's growth or as a tutorial.
3. **"William Is With the Legation"** — William unavailable, a resident approaches the player directly, and only lived familiarity solves the problem; tests independence, lived knowledge and the weight of separation.

## BIGGEST RISK

**The name promises a plot the game must not tell.** Players who know the novel will arrive expecting its events; the base campaign protects and excludes them. If ordinary life, the people and the original matters do not carry 9–12 hours by themselves, "Adso" becomes a costume on a game about someone else, and the audience that came for the book feels it first. The design rests on lived familiarity being interesting before anything criminal happens; if that fails, the name cannot save it.

## ABANDON ADSO IF...

Any two of these, from paired-build playtests of at least eight to twelve people:

1. The Adso build produces **more** hint-seeking and **less** independent action than the original-clerk build.
2. Fewer than half of Adso-build players describe the character's growth in their own words by the end of the second prototype, or the builds are indistinguishable on attachment and memory.
3. Players who know the novel systematically reject original matters as fake — a majority call them "not what happened" rather than engaging with the fiction.
4. The method does not transfer: after the second same-type claim, most players still treat testimony as fact unprompted.
5. No spoiler-safe late decision lands: testers rate the independence scene and ending passive, and the only strong version they imagine needs protected content.
6. The canon-review process is unsustainable: a finished reader cannot approve original matters without major rewrites, or review latency exceeds authored-content time.
7. Non-readers score the Adso framing no better than neutral and call the role a generic apprentice.

If abandoned, fall back to **ORIGINAL COMPANION** with the same identity-neutral progression systems.

## GAME THESIS

An interactive account of a stay at a great abbey: you are Adso — young, literate, ignorant of everything that matters. You learn the house the way a person learns a home: from below, on foot, in the hours, through the people who work while authority talks. The game gives you no stat; it gives you memory, access and a notebook that starts foolish and becomes precise. You separate what you saw from what you were told, report to William and sometimes withhold, and as the house comes under *[central pressure increases]*, your lived knowledge becomes evidence in rooms your teacher cannot enter. The novel's events remain protected; your stay is the part of the account history did not record. You carry out a record of people you came to know, and the confidence that what you saw was worth writing down.

## PLAYER PROMISE

**"When you play this game, you will arrive at the abbey as Adso with William and nothing but a notebook, learn its bells, doors and people until the house reads like a page you can follow, and on the day it matters, you will notice something your teacher cannot — and decide what to do with it."**
