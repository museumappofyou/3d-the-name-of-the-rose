# Story Council Round 4 — The library as learned understanding

**Role:** Investigation & Spatial-Systems Designer. **Protagonist:** ADAPTED ADSO. **Recommendation:** A fixed, selectively clarified labyrinth in which institutional knowledge improves physical decisions.

All playable examples are original proposals using placeholder rooms, documents and classifications. No source inscription, protected room association, novel event or later library explanation is reproduced. The prototypes require no novel knowledge. This report authorizes no implementation or migration.

## Repository assessment and design boundary

The library can become a leading expression of progression if walking tests understanding. Its question should be: **What do I expect here, what supports that expectation, and where can I check it?** Remembering turns helps, but cannot be the principal achievement.

Review began with [README](../../README.md), [Project](../../docs/PROJECT.md), [Game design](../../docs/GAME_DESIGN.md) and [Platforms](../../docs/PLATFORMS.md), followed by relevant systems. Adapted Adso governs this report; the game document retains an earlier reader/collator recommendation. Round 3's [progression report](../round-3-adso/02-gpt-progression.md) supplies continuity. No other Round-4 report was read.

| Inspected foundation | What exists | Consequence for this design |
|---|---|---|
| Protected spatial, movement, hierarchy, access and visibility datasets in `book_details/output/` | Attributed claims and relationships with differing certainty | Containment is not adjacency; narrated journeys are not complete navigation graphs; missing visibility claims do not prove obstruction. |
| [Library geometry/data](../../web/src/core/library.js) and [library builder](../../web/src/world/aedLibrary.js) | A 56-room reconstruction with polygons, openings, windows, room metadata and furnishings | Reuse this architectural authority. Exact shapes and some connections are reconstruction decisions, not uniformly explicit textual facts. |
| [Browser map and room interface](../../web/src/ui/ui.js) | Complete room geometry, visited-room persistence, live position and automatic room information | Useful for study; investigation play should require the player to establish some of this knowledge. |
| [Browser notebook](../../web/src/systems/notes.js) and [discovery rules](../../web/src/data/discovery.js) | Discovery records, visited IDs, route progress and one catalogue/shelf example | A foothold, not general search: acquiring two records can trigger a connection without testing its interpretation. |
| Native domain and presentation | Knowledge, room classification, portal state, clock, access and versioned saves in a bounded public-area proof | Native has no migrated playable library. Its knowledge records do not yet implement uncertain spatial identities or player-supported classification. |
| Browser/native audio | Spatial emitters, room responses, filtering, continuous office transport and a church-specific path model | Strong foundations, but no validated general acoustic transport through the library's room network. |

Keep architecture, perception and interpretation distinct. Native has a validated Mac slice; real Windows trials, human audio/input review and a recurring cell-unload hitch remain open. Preserve the public-area investigation milestone; full-library migration is not the next task.

## 1. Four core verbs

Choose **ORIENT → COMPARE → TEST → RECORD**.

**Orient:** Establish a provisional situation from room form, openings, light, sounds and the last recognized place. Listening and inspection serve orientation.

**Compare:** Relate an encounter to another room, catalogue convention, learned script, work practice or resident's description. Classification changes which possibilities deserve attention.

**Test:** Select a discriminating action. Walk a predicted connection, inspect the next shelf's organization, return to a window or check a candidate volume. Prefer actions that could disconfirm the expectation; walking at random is possible, but rarely the efficient method.

**Record:** Keep observations and qualify, connect or revise interpretations. The notebook handles transcription and sketching; the player owns meaning. Recording stays quick enough that the abbey remains the working surface.

Search and retracing use the same verbs, available throughout.

## 2. Progression becomes different decisions

All verbs and comparison tools are available initially. Later competence changes questions, expectations and movement. No room quota permits correct reasoning.

| Dimension | Early library play | Later library play | Observable progression |
|---|---|---|---|
| **PLACE** | Recognize a table, window or threshold in isolation; follow a short described route | Relate room families, approaches, views and previously walked connections; choose between plausible routes | Return from another starting point and explain why a connection is plausible |
| **TIME** | Treat light or an office sound as atmosphere; learn the visit's access conditions | Choose a useful visit window, distinguish temporary activity from permanent structure, anticipate safe departure | Revisit at another hour without mistaking changed illumination for changed geometry |
| **METHOD** | Collect impressions; check whichever shelf is nearest | Form competing explanations, select a discriminating observation and stop once sufficient evidence exists | Reject an attractive assumption through a deliberate test |
| **KNOWLEDGE** | Need an explanation of a local catalogue or handling convention | Apply knowledge learned elsewhere to predict a room's use or a document's likely placement, then verify scope | Reach a new destination more purposefully without already knowing its turns |
| **INDEPENDENCE** | Receive a bounded question and an example of how to investigate it | Form the question, plan the visit, choose evidence and report limits without a supplied itinerary | Produce a supported result and organize a return without William approving each step |

**PEOPLE remains essential.** KNOWLEDGE here exposes what social learning produces; it does not replace Round 3's PEOPLE dimension. A copyist can explain a notation, an attendant can clarify an appointment, and a reader can discuss a language. Their expertise and assertions remain bounded. A resident's guidance is testimony, not an omniscient map update.

Permissions follow care with a specific task, never a hidden competence score. Players may understand immediately, ask, observe an example or consult a reference. Each approach remains viable.

## 3. Map design: preserve reasoning, remove clerical labor

| Option | Strength | Cost | Decision |
|---|---|---|---|
| No map | Makes bodily attention consequential | Repeated mistakes and returning after a week become memory taxes | Optional challenge preference only |
| Entirely hand-drawn map | Gives ownership of the model | Drawing accuracy competes with investigation; invites external graph paper | Reject as the required interface |
| Automatically filling exact plan | Convenient and reassuring | Perfect placement resolves orientation and repeated-room identity automatically | Reject for default play |
| Player-annotated plan | Supports hypotheses and revision | A complete underlying plan can reveal the answers before annotation matters | Keep annotations on incomplete knowledge |
| Partial architectural plan | Gives understandable large-scale context | Precise internal partitions can reveal unvisited structure | Allow an approved outer footprint and genuinely supplied information |
| Memory-only navigation | Makes familiarity noticeable | Inaccessible as a baseline and fragile across sessions | Support players who prefer it; never require it |
| Hybrid | Separates observation, route history and interpretation | Needs very clear visual treatment of certainty | Recommended |

The hybrid begins with contextual architecture. Observing a room produces a schematic vignette of perceived form, visible thresholds and recorded features. Crossing thresholds creates an ordered **route ribbon** of encounters and travel direction. Neither supplies global coordinates or unexplored destinations.

Players name vignettes, attach evidence and tentatively position or join them. Dashed connections are proposed; solid walked segments record passage. Seeing an opening does not fill the room beyond it. Metric drawing is unnecessary.

A repeated-looking encounter can remain “possibly the earlier room.” Stable internal save IDs never resolve the player's provisional identity assignment. Incorrect global placement can coexist with accurate local observations and step sequences.

Opening the notebook pauses the shared simulation. Default play has no live GPS dot or persistent minimap. Optional memory support can surface recorded encounter descriptions and the last recognized place. The existing complete study map belongs to a separately declared study mode, with its own spoiler boundary and no earned-knowledge credit.

## 4. Landmarks should describe a building

Build orientation from **families of features and their relationships**. A spectacular prop per room merely substitutes collectible mascots for turns. Most rooms remain related and ordinary.

| Channel | Useful relationship | Necessary limit |
|---|---|---|
| Architecture | Room proportions, wall thickness, vault form and arrangement of openings | Differences must survive ordinary viewing, not require counting identical masonry blocks |
| Inscriptions | Recognizable script, placement or a recorded phrase | Provide legible transcription; preserve ambiguity of meaning; use approved original content in prototypes |
| Windows and views | Inward versus outward outlook, reveal depth, a visible roofline | Verify actual geometry and occlusion; never display a view through a solid wall |
| Floor/wall details | A repair seam, wear at a working threshold, a recurring surface family | Use maintenance and construction logic rather than a unique colored tile in every room |
| Shelves and books | Arrangement, format families, handling access, consultation versus storage | Decoration alone cannot imply a catalogue rule |
| Sound | A nearby opening, transient activity, differing room response | It describes an acoustic path and occasion, not necessarily the source's direct bearing |
| Temperature/light | A felt draft, sunlit work surface, sheltered darkness | Convey through perceptible effects; never require an invisible temperature reading |
| Human traces | A moved stool, temporary reading parcel, annotated working slip | These indicate use at an encounter and can change; they are weak permanent room identifiers |

At important decisions, offer two independent distinctions, such as a window relationship and room proportions. They corroborate a situation without becoming coded instructions.

Use alone is informative. A cleared surface with comparison volumes suggests consultation; dense, less accessible storage suggests a different practice. The player can ask whether the room normally serves that purpose or has been temporarily borrowed. Every room need not have a unique function, and a chair's presence does not certify the answer.

## 5. Books as navigation

Collection organization can express institutional work. Design local, learnable relationships; neither modern subject catalogues nor a universal medieval arrangement are appropriate assumptions.

**Catalogue structure** offers a path from a reference to a class of place. An original fixture might distinguish a volume's usual storage entry from a temporary consultation note. Learning that distinction outside the library changes where the player starts looking.

**Shelfmarks** connect entries to storage after a local convention is demonstrated. They need stable meanings and recognizable counterparts, without encoding entire routes. The current single example cannot establish a whole-library rule.

**Language groupings and subject matter** can narrow a candidate area. Script recognition is different from understanding a passage. Give readable transcription and translation support; the challenge is deciding which textual or material relationship matters, not having studied an undocumented language before playing.

**Regional classifications** might concern text origin, donor collections or local organization. Establish meaning within this continuity; regional names never automatically imply cardinal directions. No actual source grouping or sequence is supplied here.

**Inscriptions** can support recognition or an interpretation, but must not become colored runes issuing turns. A useful expectation is “the accompanying reference material may be kept beside the consultation space.” That is justified only if the player has evidence of this local practice. Classification never implies adjacency by itself.

Predict the **kind of next room**, then encounter corroboration or surprise. Contradictory placement creates a question; arbitrary disorder merely defeats learning.

## 6. Acceptable disorientation

Productive uncertainty has a bounded form: “This resembles either of two places; here is something I can check.” Unproductive uncertainty is “Everything is identical, and no action can improve my position.”

Initial targets are 30–120 seconds of uncertainty around a meaningful junction and recovery to a recognized place within three minutes after choosing to recover. These are playtest targets, not assurances. Thirty minutes of directionless wandering is a design failure, regardless of eventual completion.

Before entering an unfamiliar branch, the player should possess a return anchor: a recognizable prior room, a recorded threshold sequence or an available human arrangement. On the first visit, use a small connected subset and a mundane supervised entry. The size of the complete reconstruction is no reason to expose every choice immediately.

Recovery escalates transparently. First consult the last recognized vignette and route ribbon. Next compare two recorded encounters or return along an actually walked segment. At a known staffed threshold, ask a resident about the exit or the local area, with attributed guidance. If that fails, request an escorted return to the visit's agreed starting point.

The escort ends exploration and advances the world consistently, awarding no skipped evidence. Establish this human arrangement before the visit; independent visits need equivalent stated assistance or an optional recovery abstraction. Confusion never becomes a trap.

## 7. Sound as evidence about paths

Sound supports orientation near openings by revealing building relationships. It never selects the designer's preferred door.

Wave-based research describes sound arriving through gaps, portals and diffracted paths. This supports treating apparent openings as evidence, without assuming direct source bearing or audibility in this reconstruction. See Raghuvanshi and Snyder's [directional propagation research](https://www.microsoft.com/en-us/research/publication/spatial-audio-for-immersive-sound-propagation/).

| Source | Proposed navigational value | Physical/design qualification |
|---|---|---|
| Distant chant | Indicates an office and, locally, an acoustic connection to outside activity | Do not assume intelligibility through several rooms or storeys; establish a real opening/path and plausible level |
| Wind | Suggests exposure, an opening or a draft near it | Broad wind ambience cannot reliably supply compass direction; weather and aperture state matter |
| Bells | Supply a temporal event and sometimes a broad outside relationship | They are intermittent; reflections and transmission can obscure bearing |
| Footsteps | Reveal nearby activity, movement or a surface transition | Hearing footsteps does not identify the walker or prove their final destination |
| Doors | Let the player compare opening/closure with changed acoustic clarity | The same physical portal state must control collision and sound |
| Exterior leakage | Helps distinguish a locally exposed room from an enclosed one | Bind it to actual windows/openings, not distance to a quest target |
| Vertical sound | Suggests a nearby connected stair volume or activity above/below | Do not promise precise elevation through a thick floor; verify the relevant transmission path |

Reverberation and source spectrum can bias localization, as shown in Ihlefeld and Shinn-Cunningham's [experimental study](https://www.cmu.edu/dietrich/psychology/shinn/publications/pdfs/2011/2011jasa_ihlefeld.pdf). The design inference is to require corroboration, especially for distant or muffled sources, and never require fine bearing discrimination.

The [browser audio system](../../web/src/systems/audio.js), [room responses](../../web/src/systems/audio/reverb.js) and [native director](../../native/scripts/adapters/audio_director.gd) provide reusable transport and presentation work. Current library ambience and zone-based occlusion are not proof of room-by-room acoustic reachability. The native church path's objective checks do not validate human library orientation.

Prototype a few honest opening relationships first. Test with headphones, ordinary speakers, mono and the accessibility equivalent. No sound grows louder because a hypothesis is correct; no source follows the player to remain useful. Silence is a valid condition, never a reason to make the case unsolvable.

## 8. Light and canonical hour

Use time where it changes evidence or opportunity. Do not attach a clock puzzle to every excursion.

Daylight through an actual window can establish a broad exterior relationship or show why a work surface is used. A later visit can teach that the remembered bright room was bright **at that encounter**. Its window arrangement and view remain structural anchors when the sun moves.

Sunlit patches cannot supply exact canonical hours. Season, weather, window orientation and surrounding occlusion matter. The project's sun/light systems are presentation foundations, not a validated historical solar model for this fictional location. Author only comparisons the chosen geometry and lighting genuinely support.

Canonical hours contribute through office activity, access agreements and understandable changes in available people. A player may choose another hour to compare reading conditions or meet an attendant. An essential inference must also have a record, alternate observation or repeatable opportunity; avoid compulsory idle waiting for a narrow beam of light.

Later illumination should challenge overconfident recognition, not erase all readable features. Preserve sufficient local visibility for safe movement, scalable inspection and notebook comparison. Night can emphasize another way of knowing a familiar room; darkness cannot simply multiply the time needed to search it.

## 9. Search means narrowing and identifying

Adopt **bounded, evidence-led search**. A reference should help the player select a candidate area, recognize a plausible storage relation and establish which document answers the question.

An original search might begin with an incomplete entry lacking the modern title the player expects. A convention learned in the scriptorium distinguishes permanent storage from current consultation. That makes two destinations plausible. The player chooses one, checks whether the shelf organization fits, then compares a few candidate volumes by format, opening content or a relevant reader's annotation.

Wrong candidates teach distinctions: same topic, different copy; matching format, different beginning; correct usual shelf, recorded temporary removal. Start with two possible areas and roughly two-to-four final candidates. Decorative books require no exhaustive search.

Compare copies through selected readable passages or material details aligned side by side. Leave interpretation to the player; avoid collating entire manuscripts.

Reader traces can indicate recent use or support a custody question. Their presence does not identify an actor without corroboration. Document located, correct document identified and account established are separate achievements.

Every important search needs another route to its essential finding: a local practice observed directly, a resident with bounded expertise or an independent reference. This preserves progress if the player misses a live event or misunderstands the first convention. The correct object must not appear only after a knowledge flag; informed players can recognize it early.

No glowing shelf, mandatory scan of dozens of spines or single-pixel interaction target. A clear inspection affordance tells the player what is physically examinable, without marking which candidate is correct.

## 10. Wrong hypotheses should be usable

Allow an incorrect global connection, a mistaken identification of a repeated room, or a shelf category inferred from the wrong label. Preserve the supporting observations so the player can identify the faulty step.

For example, the player tentatively merges two consultation rooms. A later window observation distinguishes them. They split the map identity and reattach the recorded journeys. Nothing about the physical world changes, and the earlier local sketches remain valid.

A shelf attribution might initially follow a parcel label. A catalogue comparison or an attendant's qualified account shows that the label concerns current handling rather than usual storage. The notebook can retain the original inference, crossed through with the new evidence attached.

Correction happens through a testable mismatch, not a “WRONG” popup. The interface may show that a submitted explanation lacks supporting evidence; it must not certify an untested room placement by consulting the hidden world graph. The player's dashed line can remain wrong until they investigate it.

Do not require a particular mistake for the learning arc. A careful first interpretation gets acknowledgment and a harder question. William can ask what supports the claim; he must not repeatedly supply the next room or silently fix the plan.

## 11. Four visits, four uses of familiarity

| Visit | Question changes | Familiarity becomes power |
|---|---|---|
| First | Where am I, and how can I return? | Recognize ordinary anchors and learn one small route |
| Second | Where should this kind of document or work be? | Apply a local convention and choose between plausible branches |
| Third | Does my earlier expectation still describe this occasion? | Notice an authored change in use, custody, light or permission |
| Fourth | What must I establish, by which route, and with what limits? | Plan an independent inquiry and distinguish efficient movement from adequate evidence |

This trajectory imposes no unlock thresholds. Competent players can perform later behavior earlier. New tasks reuse stable architecture differently; temporary changes need visible causes and traces. Random shelf rearrangement punishes learning.

Allow optional condensed transit between established safe anchors after a route has actually been walked. State the arrival hour, check current access, advance scheduled activity and award no observations from the skipped stretch. Disable condensation only for an explicit investigation requiring physical observation there, with a clear reason.

A familiar journey sometimes remains worth walking because the player has a new question. Routine return travel should not consume most of a later investigation. The reward is choosing where to spend attention.

## 12. Failure and consequence

Exploration should consume world time coherently, but initial disorientation must not trigger irreversible failure. Reading, map work and comparison pause the shared simulation. The first library exercise has no punitive deadline.

Later, knowingly taking another branch can mean meeting someone after an office rather than before it. A missed opportunity has a repeatable appointment or an alternate evidence path. Do not convert slow navigation into a permanently missing critical document.

Social consequences follow observable conduct: knowingly overstaying an agreed visit, mishandling material or ignoring a stated restriction. Confusion is not misconduct. Consequences are specific and reparable, such as supervision at the next appointment; wrong turns never deduct hidden reputation.

Risk can accompany a deliberate, clearly communicated breach of access, but it should remain exceptional. The default library is an investigation space, not a repeating stealth gauntlet. No particular danger or event from the novel is required by this proposal.

Recovery can end an excursion and cost an appointment. It must preserve discoveries, tentative maps and the possibility of another attempt. Navigation failure should produce a useful decision or bounded setback; repeated empty travel is simply wasted player time.

## Library knowledge model

Use three conceptual layers: **world state**, **encounter evidence**, and **player interpretation**. The world knows the actual room, portal and document state. Evidence records what was perceptible on an occasion. Interpretation records what the player associates with that evidence. One layer must never silently promote another into certainty.

| Concept | Meaning and boundary | Persistence |
|---|---|---|
| **ROOM KNOWN** | An encountered room has observable descriptors and a local sketch. Its identity relative to an earlier encounter can remain provisional. Entry alone does not establish every inscription, shelf or function. | Persist encounter descriptors and recognized identity links; preserve disputed identities separately. |
| **ROUTE WALKED** | A physically traversed sequence of thresholds, with direction and occasion. It establishes the passage occurred under those conditions, not that every endpoint was correctly identified. | Persist the sequence and relevant access/time context. Loading, escorting, study jumps and condensed transit add no walked evidence. |
| **ROUTE UNDERSTOOD** | A player-endorsed account of how encounters connect, why the route serves a purpose, and when it is usable. Support can be incomplete or later contradicted. | Persist the account and its supporting links. Never infer understanding from a visit count or map completion percentage. |
| **SIGN RECOGNIZED** | A recorded sign is matched to a previous encounter or a learned convention. Transcription, translation and interpretation remain distinct. | Persist the copied observation, attributed assistance and player interpretation, including unresolved readings. |
| **SHELF RELATION UNDERSTOOD** | The player links a catalogue convention to physical placement, supported by an example or comparison and qualified by local scope. | Persist the relation, evidence and exceptions. Knowing one cabinet does not establish a universal rule. |
| **DOCUMENT LOCATED** | A particular document/copy was observed at a place and occasion, with identifying features. It may subsequently move. | Persist the observation and identity claim; current custody/location belongs separately to world state. |
| **HYPOTHESIS** | A tentative room identity, connection, classification, use or search location, with evidence and a possible discriminating test. | Persist open, revised and withdrawn hypotheses. Keep prior versions compactly so correction remains intelligible. |
| **UNCERTAINTY** | The unresolved alternatives or limits attached to a particular claim: which room, which convention, which occasion. | Persist alternatives and missing support. Avoid one numerical confidence meter for the whole library. |

All eight need persistence because resumed play must retain both learning and unfinished reasoning. Momentary audibility, current illumination and open fractions are recomputed from world state; a significant past observation of them is saved as evidence.

The [native knowledge state](../../native/scripts/domain/knowledge_state.gd), [session snapshot](../../native/scripts/domain/game_session.gd) and [save service](../../native/scripts/domain/save_service.gd) are foundations. Note presence, room IDs and route progress cannot alone express these concepts. No schemas or code are proposed here.

Persist source, occasion, world/scenario version and the player's links. Stable architectural knowledge can carry between compatible original scenarios; a temporary custody claim cannot become an eternal fact. Changed content must not silently reinterpret an old hypothesis. Unfinished comparisons and accessibility preferences also survive a return after several days.

Knowledge records assist presentation and continuity; they are not hidden XP. A successful experiment can be recognized through the player's supported result without demanding every intermediate notebook entry. Trust and permission require concrete in-world reasons, not a threshold number of “understood” flags.

## Three level-design approaches

| Approach | Integrity | Playability and cost |
|---|---|---|
| **A. Faithful fixed labyrinth** | Preserves the strongest relationship with the reconstructed layout, while still acknowledging inferred geometry | Valuable study reference; risks treating accidental unreadability and all current interface exposure as necessary fidelity |
| **B. Slightly adapted/readability-enhanced fixed labyrinth** | Preserves explicit structural constraints and reviewed connections; labels clarity additions and reconstruction choices honestly | Supports stable learning through legible thresholds, ordinary material distinctions and better evidence presentation |
| **C. Heavily game-designed labyrinth inspired by source topology** | Retains an architectural idea but weakens claims of reconstructive continuity | Easier pacing and bespoke puzzle chains; risks a level that chiefly rewards recognizing designer cues |

**Choose B.** Improve inscription readability, sight lines to local cues, interaction reach and room-use distinctions first. Missed doorways do not automatically justify relocation. Check any necessary geometric adjustment against connectivity, views, acoustics and established evidence.

Preserve what is explicitly constrained and review inferred choices rather than sanctifying every existing builder decision. Maintain one architectural authority and portable semantic records, as Project requires. Original scenario content belongs in declared overlays, not the literary extraction files.

If B remains unplayable, reconsider the full labyrinth's campaign role before choosing C. A smaller coherent exercise preserves more integrity than claiming a redesigned puzzle level is faithful.

## Anti-frustration rules without objective arrows

1. At a consequential ambiguous junction, provide at least two perceivable, logically relevant ways to distinguish the possibilities. They remain present for every player; success does not spawn a helpful lamp.
2. After approximately 90 seconds without new observations and repeated passage around the same circuit, optionally remind the player that their last recognized encounter is recorded. Do not name the correct branch. Intentional exploration alone does not trigger hints.
3. On request, surface the last route ribbon, selected observations and unresolved alternatives. Offer stronger recovery openly; never secretly steer movement, camera, sound or lighting.
4. Make transcripts, scalable text, high contrast, reduced motion, adjustable look controls and assisted note capture available immediately. No task may require color alone, pixel hunting or precise stereo bearing.
5. Caption only locally perceptible sounds, including their approximate apparent opening and uncertainty. Do not identify an unseen person or display an exact hidden source coordinate. Provide a visual/documentary alternative to essential audio reasoning.
6. Let players retain extra encounter descriptions and replay their own observations after an absence. Optional automatic local sketches remain observation-bound; assistance earns no less valid an outcome.
7. Establish a recoverable exit and safe egress before an access window changes. A closing entrance never imprisons a confused player. A return arrangement must remain available after they miss the intended timing.
8. Provide cues when they restore the ability to investigate. Withhold explanatory hints while the player has a workable hypothesis and a meaningful test. William never interrupts simply because a different viable route was chosen.

## VERDICT

Make the library a major recurring proof of Adso's development, distributed across purposeful visits. It should concentrate spatial, textual and institutional reasoning without monopolizing the campaign or becoming a prerequisite for the current first case. Earn full migration through the three bounded prototypes below.

## CORE LOOP

Orient from an encounter → compare it with learned practice → predict and test a route or candidate → record the result and revise the model.

## PLAYER PROGRESSION

The player learns what distinctions matter, where to seek clarification, which expectations are reliable and when to test them again. Questions become more precise; journeys become more purposeful; independence becomes visible in supported choices. No stats, visit thresholds or hidden XP authorize reasoning.

## MAP POLICY

Hybrid: partial contextual architecture, automatic local encounter sketches and walked route ribbons, with player-owned identities, placements and annotations. No default live position dot, unexplored interior plan or objective arrow.

## SEARCH POLICY

Bounded evidence-led search: interpret a reference, narrow the area, recognize a physical storage relationship, compare a few candidates and establish document identity. Finding something and explaining its relevance remain separate.

## SOUND POLICY

Use physically credible, local acoustic relationships as corroborating evidence. Validate opening-dependent perception before relying on it. Keep meaningful alternatives for silence, speakers, mono and hearing access; never turn ambience into a destination signal.

## ERROR / UNCERTAINTY POLICY

Allow wrong interpretations while preserving accurate observations. Support correction through discriminating encounters and visible revision. The physical labyrinth stays fixed; the notebook never secretly repairs an unsupported conclusion.

## REVISIT POLICY

Keep architecture stable and give each return a different reason to use it. Familiar routes save attention; authored changes challenge the scope of old knowledge. Condense routine established transit where it would otherwise become repetition without evidence.

## THREE PROTOTYPES

### Prototype 1 — Orientation

**Scenario:** An original supervised visit in a seven-room fixture assembled from ordinary library room forms. Adso checks a consultation stand and returns to the agreed entrance. Two rooms resemble each other, one branching choice is genuinely ambiguous, and a window relationship plus a material detail can distinguish them. The fixture exposes no source room sequence or protected content.

**Mechanics:** Orient at the entrance, record local encounters, choose a branch and recover from uncertainty using the route ribbon and a distinguishing observation. Listen at two real openings; one sound supports exposure rather than the destination. Repeat the return from another room and under a different light condition. A companion offers a methodological question only on request.

**Systems needed:** Readable room geometry and collision, threshold encounter history, small local sketches, tentative identity links, save/resume, two controlled acoustic paths, equivalent captions and an agreed recovery arrangement. Begin with plans and scripted encounters; any later native fixture remains conditional on existing platform gates.

**Expected behavior:** Players compare rooms, sometimes choose wrongly, and reorient through evidence. Repetition rewards recognized relationships. Brief notebook consultation leads back to environmental inspection.

**Success criteria:** In an initial ten-player test, at least eight return without live coaching; median chosen recovery is under three minutes; at least seven explain a useful distinguishing relationship. A changed start or lighting condition retains at least seven successful returns. Accessibility-equivalent players remain able to complete the task.

**Failure/abandon criteria:** Three or more experience over five consecutive minutes of no informative progress, need a complete plan, or cannot tell similar rooms apart after inspection. Revise cue visibility and notebook friction once. Abandon this orientation model if a fresh cohort repeats the same dependence on externally supplied directions.

### Prototype 2 — Knowledge affects navigation

**Scenario:** Adso must locate an original comparison volume from an incomplete reference. Before the visit, the scriptorium offers a concrete example separating usual storage from a consultation entry. Inside the fixture, those readings suggest different candidate areas. All books and conventions are original game fiction; no canonical classification is disclosed.

**Mechanics:** Use the earlier practice to predict a room's likely function, check a local shelf relationship, compare three candidate volumes and explain identification. A plausible mistaken interpretation remains recoverable through an independent local example or a resident's qualified explanation. The correct document is always physically available under the stated permission.

**Systems needed:** Two brief readable references, an inspectable storage convention, meaningful book identities, comparison presentation, attributed assistance, uncertain shelf links and document-location persistence. No general catalogue simulator, hundreds of readable books or vocabulary progression system is required.

**Expected behavior:** Players use the convention to choose a destination, test placement and distinguish copies. Misunderstanding prompts selective revision. Experienced players may finish without consulting every reference.

**Success criteria:** Compare equivalent tasks with and without the earlier example, counterbalancing task/fixture order. Across at least twelve participants, prior learning should reduce irrelevant room/shelf inspections by roughly 25%, and at least nine should explain the relation in a new example with different names. Completion must remain possible through the alternate learning path.

**Failure/abandon criteria:** Learning only helps recall a label, players find the answer primarily by scanning every candidate, or the notebook states the relation for them. Revise the convention and candidate distinctions once. Abandon classification-led navigation if a fresh test still shows no transferable improvement attributable to the prior practice.

### Prototype 3 — Late-game independent library reasoning

**Scenario:** In an original later-campaign continuity, a familiar comparison volume is absent from its previously observed location. A permitted consultation request, temporary reader traces and a current catalogue record support competing accounts of where it may now be. Adso must locate and identify it, establish the scope of the evidence and arrange a safe return. William supplies no route or preferred hypothesis.

**Mechanics:** Begin from previously learned architecture and a player-made plan containing one unresolved connection. Form a question, select between two viable evidence orders, test current placement against the old observation and revise a map or custody assumption where necessary. One hour transition changes an appointment; missing it retains another evidence route. Returning later tests whether familiarity survived an absence.

**Systems needed:** Stable room/portal identities, scenario-specific custody and temporary-use state, a small coherent schedule, safe access/egress, observation/hypothesis persistence, comparison tools, optional transit condensation and recovery. Use a bounded room subset; the test does not require production whole-abbey NPC simulation or full-library streaming.

**Expected behavior:** Players use familiar routes, test changed conditions and distinguish present location from proven custody. They complete independently while stating limits. No accusation or canonical outcome is required.

**Success criteria:** After the earlier exercises, at least eight of ten players finish a supported account without companion directions; at least seven choose and perform a discriminating test before exhaustive searching. At least eight resume after a week using only their saved record and available aids. Most report that familiarity changed their decisions, with routine transit under one third of active task time.

**Failure/abandon criteria:** Completion depends on William naming the next action, a correct unexplained map, an irreversible appointment or remembered developer instructions. Revise the evidence paths once. Abandon the independent-library thesis if a fresh cohort still performs mainly exhaustive search or cannot recover a usable model after the delayed return.

## BIGGEST DESIGN RISK

**The notebook becomes the real labyrinth, and the building becomes its input device.** If automatic sketches do too much, inference disappears; if manual linking demands too much, investigation becomes diagram maintenance. The decisive question is whether players close the notebook with a useful expectation and test it in the room. Interface fluency must not masquerade as becoming Adso.

## ABANDON THIS DESIGN IF...

After one targeted revision and fresh tests, prior institutional learning produces no transferable reduction in irrelevant search, more than 20% of players repeatedly need over five minutes to regain useful bearings, or later success still requires companion directions. Also abandon the proposed balance if players spend over one third of active task time maintaining diagrams and cannot explain a spatial or classification inference those diagrams enabled.

Small cohorts provide directional evidence. Record routes, recovery time, aid use, wandering, notebook activity and explanations; distinguish unreadable cues from reasoning failure. A smaller guided library investigation may survive a failed labyrinth thesis. Importing more rooms cannot rescue it.

## LIBRARY GAME THESIS

The library should make Adapted Adso's education tangible: a room becomes recognizable because he attends to it, a route becomes useful because he understands its relationships, and a book becomes findable because he has learned something about the people and practices that place it there. Stable architecture gives memory value; incomplete evidence makes interpretation necessary; revisable notes let mistakes become experience. Across returns, the player learns to predict, test and qualify with increasing independence. The achievement is a supported understanding they can use in a changed situation, while uncertainty remains meaningful and recovery remains fair.
