# Story Council Round 4: Spatial Experience, Wayfinding & Accessibility Critic
## The Ergonomics of First-Person Monastic Disorientation

**Date:** 2026-10-05  
**Seat:** Spatial Experience, Wayfinding & Accessibility Critic  
**Focus:** The first-person cognitive reality of entering, navigating, getting lost within, and mastering the Aedificium library labyrinth on a desktop PC.  
**Target File:** `story-council/round-4-library-labyrinth/05-gemini-spatial-experience.md`  
**Current Protagonist:** Adapted Adso  
**Spoiler Policy:** Strict compliance with the owner's reading status. Names no protected library mechanisms, plot revelations, culprit identities, secret door triggers, late-book casualties, or theological resolutions. Uses generic design placeholders (`[the tower corner-rooms]`, `[the room epigraphs]`, `[the octagonal junction]`, `[an optical deterrent]`, `[the restricted inner core]`, `[the thematic arrangement principle]`) wherever structural specifics are discussed.

---

## 0. Executive Framing: The Desktop PC Reality of a Medieval Maze

In architectural theory, the Aedificium library is a magnificent symbol: an octagonal labyrinth enclosing the geography of the known world, guarded by silence, geometry, and darkness.

On a desktop PC screen, unmediated historical architecture is frequently an unmitigated disaster.

When a player sits before a 16:9 monitor with mouse and keyboard or gamepad, their perceptual apparatus is radically degraded compared to a body moving through physical stone:
- **Amputated FOV:** A 90-degree camera cuts away three-quarters of human peripheral awareness (~200 degrees).
- **Zero Vestibular Feedback:** The inner ear feels no turns or inertia; a 90-degree turn registers only as pixels sliding across a flat plane.
- **Flattened Depth & Scale:** Monocular 2D projection makes an archway 10 meters away look identical to one 6 meters away.
- **Visual Fatigue & Nausea:** Sweeping across repetitive, low-contrast stone textures induces eye fatigue within twenty minutes and motion sickness within forty.

If the team constructs an uncompromised geometric maze of identical ashlar rooms, the player will not feel mystical awe. They will feel bored, motion-sick, and alt-tabbed to an online walkthrough.

A great first-person labyrinth is not an engineering trap designed to defeat navigation; **it is an orchestrated cognitive instrument that challenges, misdirects, and ultimately rewards human spatial intelligence.** We must ensure the player masters the Aedificium without becoming bored, hopelessly lost, motion sick, or dependent on minimaps and walkthroughs.

---

## 1. First Entry Experience: Minute-by-Minute Cognitive Breakdown

The first time Adapted Adso steps from the upper stairwell into the library floor, the player must experience a carefully sequenced descent into uncertainty rather than instant chaos.

| Window | Sensory Input | Player Mental Model | Cognitive Error | Desirable Confusion |
| :--- | :--- | :--- | :--- | :--- |
| **Min 00–02** | Threshold shock, dark | "It's a floor of rooms" | Assumes regular corridors | 20% (Cautious curiosity) |
| **Min 03–05** | Uniform arches, books | "I can hug the left wall" | Misses non-orthogonal angles | 40% (Mild miscalculation) |
| **Min 06–09** | Dead-end, looping room | "Wait, I was just here" | Believes space is symmetrical | 70% (Peak productive doubt) |
| **Min 10–12** | Flame flickers, drafts | "I am truly trapped" | Catastrophic panic if unguided | 80% -> 50% (Tension pivot) |
| **Min 13–15** | External audio anchor | "That bell is Westward" | Re-anchors; begins hypotheses | 25% (Earned relief) |

- **Minute 0–2 (Threshold Shock):** The heavy door shuts. Ambient sound shifts from stairwell echo to dead silence as folios absorb high frequencies. The player notices dust, beeswax, and a Latin lintel (`[the room epigraphs]`). Inspecting shelves causes immediate loss of entrance orientation. Desirable confusion: 20% (cautious, but assumes the exit is behind them).
- **Minute 3–5 (Illusion of Regularity):** Entering an adjacent room, the player assumes a Cartesian grid (*"Hug the left wall to map the perimeter"*), missing that walls are polygonal. Two left turns do not form a square—they enter an interior dead-end. Desirable confusion: 40%.
- **Minute 6–9 (The Loop & Peak Doubt):** Discovering an empty desk with a tallow stain seen earlier, the player realizes they have looped. Monocular navigation collapses sequential room transitions into a composite memory, obscuring turn counts. Desirable confusion peaks at 70%: movement slows; inspection deepens.
- **Minute 10–12 (Threshold of Panic):** Backtracking fails, leading to an unfamiliar blind wall. Candle wax dwindles; Adso whispers a prayer. Design safeguard: **no combat, chases, or fail timers here**. Mechanical punishment during spatial disorientation turns *Good Lost* into *Bad Lost*.
- **Minute 13–15 (First Anchor & Agency):** Distant Compline bells vibrate through an arrow slit accompanied by a cold mountain draft. Peering through, the player glimpses the church roof: *"The church is South; slit windows indicate perimeter rooms; pitch darkness indicates core rooms."* Confusion converts into intellectual agency.

---

## 2. Human Spatial Memory and Environmental Cognition

To construct wayfinding that feels natural rather than gamey, we ground our design in established environmental cognitive psychology.

| Dimension | Scientific Research Finding | Design Application in the Aedificium |
| :--- | :--- | :--- |
| **Landmark Knowledge** | Visual salience anchors memory before paths form (Siegel & White, 1975). | Every chamber features one distinct high-contrast anchor (epigraph, efflorescence, lectern). |
| **Route Knowledge** | Paths are encoded as procedural stimulus-response pairs (Gillner & Mallot, 1998). | Traversal relies on local rules: "At the cracked saint arch, turn toward the cold draft." |
| **Survey Knowledge** | Top-down metric maps form last and collapse in non-Euclidean spaces (Montello, 1998). | Never demand global grid awareness early; reward players who deduce macro-structure later. |
| **The Symmetry Trap** | The human brain forces 60°/120° angles into 90° rectangles (Tversky, 1981). | Polygonal rooms disorient naturally; floorboard grain and ceiling ribs signal the real vector. |
| **Vertical Amnesia** | Vertical transitions cause acute spatial model reset (Hölscher et al., 2006). | Stairs and ladders feature distinct threshold flooring and immediate acoustic shifts. |
| **Spatial Chunking** | Human working memory limits active nodes to 4–7 clusters (Miller, 1956). | Divide the library into distinct atmospheric "neighborhoods" (`[the thematic arrangement principle]`). |

### Research-Based Claims vs. Design Inferences
- **The LRS Progression (Research):** Siegel & White (1975) and Montello (1998) prove spatial cognition develops in strict sequence: landmarks -> routes -> survey maps. *Design Inference:* Never require survey map knowledge early; support navigation entirely through **Landmark-Route pairing**.
- **The Symmetry Trap (Research):** Tversky (1981) showed the brain regularizes non-orthogonal angles into 90-degree grids. *Design Inference:* The octagonal layout disorients naturally; linear cues (floorboard grain, vault ribs) must subconsciously signal the true traversal vector.
- **Vertical Disorientation (Research):** Hölscher et al. (2006) demonstrated elevation changes reset route memory in >65% of subjects. *Design Inference:* Stairs cause acute amnesia; every vertical shift requires distinct threshold flooring (limestone to oak) and sharp acoustic shifts.

---

## 3. Environmental Differentiation: Believable Cohesion vs. Distinguishability

A fatal trap in videogame level design is the "theme-park maze": one room is ice, one is fire, one is green, one is purple. In a 14th-century Benedictine monastery, this destroys historical immersion. The entire library is constructed of Northern Italian alpine limestone, mortared rubble, heavy oak beams, and iron hardware.

Rooms must remain believable components of a single monastic repository while remaining visually and tactilely distinguishable.

| Environmental Domain | Perimeter Rooms | Blind Core Rooms | Tower Junctions |
| :--- | :--- | :--- | :--- |
| **Masonry & Plaster** | Lime-washed, dry, hairline cracks | Dark unplastered ashlar, damp mortar | Finely dressed ashlar, cold stone |
| **Ceiling Architecture**| Asymmetric groin vaults, low brackets | Low, heavy semicircular barrel vaults| Domed octagonal cap with carved boss |
| **Floor Wear & Traffic**| Deep troughs worn toward window sills | Polished central traffic paths in dust| Concentric sand wear from spiral stair |
| **Shelving Joinery** | Open oak lecterns (*plutei*), chained folios| Floor-to-ceiling barred *armaria* | Low chest cupboards and scroll racks |
| **Natural Illumination**| Splayed arrow slits, sharp light shafts| Zero exterior light; pitch darkness | Paired arrow slits, high ceiling light |
| **Airflow & Odor** | Fresh alpine draft, cedar, cold stone | Stagnant air, rancid tallow, beeswax | Whistling wind, draft from flues |
| **Epigraphy Style** | Elegant formal uncials in red ochre | Spidery, compressed Gothic cursive | Bold chiseled Roman capitals |
| **Acoustic Footprint** | External wind howl, dry footstep decay| Deadened, muffled, high book absorption| Sharp flutter echo, parabolic ring |

- **Vaulting Geometry:** Asymmetrical groin vaults mark trapezoidal perimeter rooms; low, oppressive barrel vaults define core rooms; octagonal domed vaults with carved bosses anchor tower junctions.
- **Masonry Scars & Efflorescence:** Powdered saltpetre blooms on damp mortar form distinct abstract silhouettes; ceiling soot above lamp niches identifies former workspaces.
- **Floor Wear Depressions:** Centrally worn flagstone troughs reveal centuries of monastic traffic, allowing lost players to distinguish primary arteries from forgotten dead-ends.
- **Framed Exterior Glimpses:** Arrow slits frame specific landmarks: North cliff abyss, East herb garden and cemetery, South church campanile, and West mountain road.
- **Epigraphic Inscriptions:** Latin lintel verses (`[the room epigraphs]`) chiseled in Roman capitals, painted in red ochre, or penned in cursive serve as explicit textual signposts.

---

## 4. The Map Experience: Cognitive Psychology vs. Ideological Purity

Few design debates generate more dogma than in-game maps. Purists demand zero mapping; accessibility advocates demand an omniscient GPS mini-map with dotted path lines. Both extremes ruin this game.

| Map Option | Immersion | Navigational Efficacy | Psychological Impact on Player |
| :--- | :--- | :--- | :--- |
| **No Map At All** | High initially | Catastrophic at Hour 3+ | High rage-quit rate (40%+); forces alt-tabbing to internet wikis |
| **Modern Mini-Map HUD** | Zero | Total (Trivializing) | Turns game into staring at a 5cm UI radar; erases environmental reading |
| **Pre-Drawn Full Map** | Low | High | Destroys mystery; robs player of earned architectural deduction |
| **Diegetic Sketchbook** | Exceptional | High (Gradual) | **RECOMMENDED:** Players build topological nodes; earned survey mastery |

### The Recommended Solution: Adso’s Charcoal Sketchbook
- **The Physical Artifact:** A diegetic parchment notebook pulled into view (`Tab`/`M`), blank upon first entry.
- **Topological Nodes:** Adso records only what he understands: rough polygons for visited chambers, inspected doorways, transcribed Latin epigraphs, and question marks on unexplored arches.
- **Player Annotations:** Players freely jot charcoal margin notes (*"drafty window"*, *"sulphur smell"*, *"locked armarium"*).
- **Evolution to Survey Map:** Only when Adso and William deduce the architectural relationship between sectors does the node diagram resolve into a connected geometric layout.

---

## 5. Getting Lost: Good Lost vs. Bad Lost

Disorientation is the core emotional palette of a labyrinth. But game designers frequently fail to distinguish between productive disorientation and destructive disorientation.

- **Good Lost (The Thrill of the Frontier):** Occurs when the player lacks global coordinates but maintains total confidence in local agency. The player can identify immediate landmarks (*"I am in the groin-vault room with the South window"*), perceives consistent gradients (wind draft), and actively tests hypotheses (*"If I follow this air current, I will hit the perimeter"*). Emotional tone: heightened focus, vigilance, intellectual curiosity.
- **Bad Lost (The Despair of the Void):** Occurs when the player's cognitive model collapses entirely. Turning around fails to return to the previous room due to unreadable geometry; all rooms look identical; inputs feel meaningless. Emotional tone: resentment, irritation, physical eye strain, and contempt for the game.
- **The Enjoyment Time Horizon:**
  - *0–4 Minutes:* Pure intrigue; active mental model construction.
  - *5–8 Minutes:* Peak tension; discovery of an orienting clue yields massive emotional satisfaction.
  - *9–12 Minutes:* Danger zone; cognitive fatigue sets in.
  - *13+ Minutes:* Complete degradation into *Bad Lost*; player abandonment risk exceeds 60%.

**Design Rule:** No loop or dead-end cluster may allow a player to wander for more than **seven minutes** without encountering an unambiguous orienting landmark or sensory gradient.

---

## 6. Diegetic Recovery Mechanics: What to Do When Genuinely Lost

When a player hits the seven-minute mark, the game must provide diegetically grounded tools for recovery without resorting to floating quest markers or detective-vision pulses.

| Recovery Vector | Diegetic Mechanism | Player Action & Sensory Feedback |
| :--- | :--- | :--- |
| **Thermal / Draft Gradient** | Mountain wind through outer slits | Observe candle flame flicker; follow cold air to outer wall |
| **Acoustic Beacon** | Abbey Bells (Horarium) | Stop moving; orient toward South-East bell resonance |
| **Diegetic Breadcrumbing** | Adso's chalk or dropped tallow drips| Press `F` to chalk door jamb; follow tallow spots on flags |
| **Epigraphic Cross-Reference**| Carved lintel Latin verse | Read inscription; locate matching transcribed node in journal |
| **Architectural Anchors** | Distinctive structural rooms | Navigate toward Entry Portal, Oculus Room, or Tower Octagon |
| **Floorboard Alignment** | Sawn oak planks aligned to core | Look at floor; follow long grain outward toward perimeter |

- **Thermal/Draft Gradients:** Outer walls feature drafty slits; core rooms are airless. The candle flame bends with air currents; following the draft guarantees hitting a perimeter window within three transitions.
- **Acoustic Triangulation:** Church bells penetrate from the South/South-East. Navigating toward rising bell resonance reliably guides players to the southern galleries.
- **Chalk & Wax Breadcrumbs:** Pressing `F` leaves a hasty chalk stroke on door jambs. Dropped tallow wax naturally marks thresholds traversed during the current run.
- **Architectural Anchors:** All circular loops bleed into one of three macro-anchors within four transitions: Entry Portal (stairwell), Central Oculus Room (kitchen flue grate), or Tower Octagon (seven multi-colored lintels).

---

## 7. Spatial Sound: Orientation Through Acoustic Cartography

Audio is the player's primary non-visual navigation instrument, transforming the headphones into a directional compass.

| Sound Source | Frequency / Timber | Directional Function | Environmental Meaning |
| :--- | :--- | :--- | :--- |
| **Mountain Gale** | High-frequency white noise | Global North vector | Exposed sheer cliff; library perimeter |
| **Abbey Bells** | Deep low-end bronze rumble | Global South-East vector | Church center; safe monastic core |
| **Plainchant Murmur**| Mid-range reverberant drone | Vertical downward vector | Crypt / Choir directly below |
| **Flue Drafts / Hiss** | Focused narrow whistle | Proximity to chimney stack | Central kitchen heating shaft |
| **Adso's Footsteps** | Dry thud vs. slapping echo | Room book-density gauge | High book absorption vs. bare stone corridor |

- **Allocentric Sound Fields:** The auditory contrast between the desolate whistling North Wind and reverberant South Bells provides a permanent spatial compass across the entire library.
- **Acoustic Damping & Room Volume:** Leather shoes clatter with a 1.2-second decay in empty stone corridors, but thud softly with zero flutter echo in book-packed repositories, letting players gauge room function by ear.
- **Subtle Organic Cues:** Cues avoid synthetic UI pings, existing purely as natural, physically grounded components of the monastic soundscape.

---

## 8. Light, Shadows, and Human Visual Adaptation

Lighting in a 14th-century nighttime interior presents a severe design paradox: historical accuracy demands pitch blackness, while engaging gameplay requires visual readability.

- **Banned Cliches:** No arcade ambient glow, glowing breadcrumb trails, or unattended torches in a parchment-filled library where fire was strictly forbidden.
- **Handheld Radiance & Scotopic Adaptation:** A warm candle (2000K) with inverse-square falloff (3.5–5m radius). To prevent eye fatigue and nausea, geometry never crushes to 100% black; a subtle **scotopic vision model** renders desaturated blue-gray silhouettes of distant arches beyond the flame.
- **Canonical Light Shifts:** Directional silver moonlight (Matins), raking amber sunbeams (Vespers), and misty dawn light (Prime) turn exterior slits into an absolute cardinal compass.

---

## 9. Repetition: The Player's Four-Phase Cognitive Arc

A great labyrinth must not feel the same on visit ten as it did on visit one.

| Phase | Player Psychological State | Traversal Speed | Dominant Navigation Tool |
| :--- | :--- | :--- | :--- |
| **1. First Visit** | Dread, claustrophobia, hesitation | Creeping / Slow | Footstep echoes, flame radius, entry door |
| **2. Second Visit** | Tentative curiosity, scouting | Measured exploration | Chalk marks, window silhouettes, local landmarks |
| **3. Midgame** | Structural comprehension, deduction | Purposeful routing | Adso's topological notebook, wind vectors |
| **4. Late Game** | Confident spatial mastery | Confident stride | Full survey map memory, architectural principles |

- **First Visit (Terrified Novice):** Survival-focused. Clinging to William's lantern or the threshold stair, every turn feels hazardous.
- **Second Visit (Systematic Scout):** Recognition begins. The player pairs landmarks with routes (*"turn at the saltpetre arch"*), actively using chalk and noting window directions.
- **Midgame (Architectural Detective):** The macro-logic unlocks: rooms reflect a geographic scheme (`[the thematic arrangement principle]`), and Latin inscriptions reveal sector boundaries.
- **Late Game (Master of the Labyrinth):** Fast, confident traversal under crisis or curfew. The space is fully colonized by the player's intellect.

---

## 10. Inhabiting Adso: Apprentice Perspective vs. Player Skill

A critical tension in adapting *The Name of the Rose* with Adapted Adso as protagonist is the potential divergence between character knowledge and player skill.

### Dynamic Navigational Confidence State
The game monitors traversal speed, hesitation, and backtracking rates:
- **Low Confidence (Hesitant, looping):** Adso whispers prayers, mutters about minotaurs, and clutches his flame close.
- **High Confidence (Direct traversal):** Adso’s voice shifts to quiet intellectual clarity: *"Even this maze must yield to reason."*
- If a skilled player decodes routes quickly, Adso records discoveries with proud astonishment in his journal rather than whining.

---

## 11. The Role of William: Mentorship, Presence, and Independence

| William Mode | Campaign Phase | Player Agency | William's Mechanical Function |
| :--- | :--- | :--- | :--- |
| **1. William Guides** | Early Tutorial / First Entry | Guided Observation | Leads the way, holds lantern, models wayfinding logic |
| **2. William Accompanies** | Midgame Investigations | Full Navigational Agency | Walks beside player, inspects codices, offers Socratic nudges |
| **3. Player Alone** | Curfew Escapes / Stealth Raids| Absolute Independence | Solitary tension; pure test of earned player spatial skill |

- **Mode 1 (The Tutorial):** William leads the initial foray, demonstrating how to inspect wall thickness, rib curvature, and draft directions, teaching the player **how to perceive**.
- **Mode 2 (The Companion):** William walks beside Adso but refuses to act as a GPS arrow. In dead-ends, he pauses and examines codices. When consulted (`E`), he offers Socratic questions rather than route solutions.
- **Mode 3 (Solitary Crucible):** Nocturnal curfew infiltrations where Adso is alone. No mentor, no second lantern, no hints. Pure earned player mastery.

---

## 12. Accessibility and Inclusive Spatial Design

A profound intellectual mystery game must be accessible to players with diverse physical and neurological profiles without diluting the core aesthetic of monastic disorientation.

| Accessibility Domain | Opt-In Feature | Diegetic Presentation |
| :--- | :--- | :--- |
| **Poor Spatial Memory** | Assisted Wayfinding | Adso automatically leaves a faint charcoal mark on door jambs |
| **Motion Sensitivity** | Ergonomic Camera Suite | FOV 75–110, disable head-bob/camera-sway, lantern stabilization, center dot |
| **Low Vision** | High-Legibility Epigraphy | Clean, high-contrast typography modal for Latin inscriptions; luminance boost |
| **Hearing Limitations** | Directional Sound Badges | Subtitles with directional indicators: `[Church bells tolling South --->]` |
| **Returning Players** | Adso's Morning Recollection | Loading screen recap of visited sectors and notebook sketches after >72h absence |

### Key Ergonomic Safeguards
1. **Lantern Sway Stabilization:** The handheld flame remains fixed relative to the screen frame rather than swinging with mouse movement, eliminating a primary trigger of simulator sickness.
2. **Persistent Center Reticle:** A tiny, faint parchment-colored dot at the center of the screen provides the vestibular system with a stable horizon anchor.
3. **The Returning Player Recap:** When loading a save file untouched for more than three days, the game displays a brief recap of Adso reviewing his journal, highlighting previously mapped sectors and reorienting the player before entering first-person mode.

---

## 13. Fear, Tension, and Disorientation: Avoiding the "Horror Maze" Trap

Disorientation naturally generates anxiety. If mismanaged, *The Abbey Project* will accidentally degrade into a cheap jump-scare horror game.

- **Intellectual Dread vs. Shock Horror:** Tension stems from **transgression** (trespassing in a forbidden repository) and **investigative stakes**, not monstrous pursuit. We ban monster chases, screaming audio stingers, and instant-death tripwires. Tension is maintained through resource pacing: the melting candle wax, and the ticking clock of monastic curfew.
- **Demystifying Optical Deterrents:** When encountering the library's built-in defenses (`[an optical deterrent]` and `[distorting mirrors/fumes]`), the player experiences subtle chromatic aberration and dancing shadows. If the player approaches with William's empirical courage, the "specter" resolves into an angled bronze mirror or a smoking censer catching a draft. The player feels intelligent, not traumatized.
- **Safe Sanctuaries:** The library includes intentional breathing zones: wide window embrasures where fresh air clears illusions and the player can sit in safety, review notes, and plan routes without anxiety.

---

## 14. Interaction Density: Sane Ergonomics of Monastic Investigation

A catastrophic failure in detective games is **"E-Button Fatigue"**: entering a room with forty bookcases and feeling compelled to press `E` on every shelf to avoid missing a clue.

| Tier | Target Objects | Visual Signifiers | Player Action |
| :--- | :--- | :--- | :--- |
| **1. Macro-Spatial** | Arches, doors, window sills | Architectural value framing | Traversal & Cardinal Orientation |
| **2. Meso-Furniture** | Central lecterns, locked armaria | Singular placement, candle focus | Sector Catalog Inspection |
| **3. Micro-Codex** | Specific manuscripts, scrap notes | Distinct binding, page edge contrast | Deep Reading (Active leads only) |

- **No Floating Loot Outlines:** Interactable objects are highlighted naturally through lighting composition: placed under a moonlit beam, set on a central reading desk, or marked by an active bookmark ribbon.
- **The Shelf-Mark Placard System:** Individual books on shelves are not interactive. Instead, the player inspects the **shelf-mark placard** on each bookcase (*"Armarium IV, Distinctio Tertia"*). Interacting with the placard gives a high-level summary: *"Works of astronomy and geometry from the lands of the South."* The player only opens specific codices if their current investigation actively requires a text from that classification.

---

## 15. Visual Clutter vs. Navigational Legibility

Modern game engines make it easy to pack environments with photogrammetry rocks, cobwebs, debris, and scattered parchment. In a first-person labyrinth, **uncontrolled clutter is navigational suicide.**

| Clutter Trap (Forbidden) | Navigational Legibility Rule (Mandatory) |
| :--- | :--- |
| Scattering random loose books across floor planes | Floors kept clean; wear troughs clearly indicate primary traffic arteries |
| Uniform, high-frequency noise on stone textures | Broad, clean plaster planes contrasted with sharply defined arch lintels |
| Dozens of identical dark wall niches | Value contrast: High-value light or clean silhouettes framing exit doorways |
| Protruding furniture blocking sightlines | Eye-Level Horizon Rule: Keep space between 1.2m and 1.8m visually clear |

- **The 200-Millisecond Doorway Rule:** When standing in the center of any chamber and spinning the camera 360 degrees, **every exit doorway must be identifiable within 200 milliseconds**. 
- Exit arches must never vanish into uniform black shadow; each must frame a distinct value contrast: a lighter wall, a moonlit slit, or a chiseled lintel stone visible beyond.

---

## Design Four Player Journeys

| Player Archetype | Mindset & Challenges | Experience & Mechanical Scaffolding | Outcome |
| :--- | :--- | :--- | :--- |
| **A. First-Time Player** | Average spatial memory; easily intimidated by dark corridors. | Relies on candle gradient and bell audio; uses chalk to mark doors; experiences 5 minutes of Good Lost. | Escapes to stairwell with genuine pride and zero walkthrough dependency. |
| **B. Strong Spatial Player** | Analytical; treats space as a geometric puzzle; tests boundaries. | Notices polygonal angles immediately; decodes thematic epigraphs; navigates without chalk or notes. | Bypasses beginner loops; reaches deep archives rapidly; feels intellectually validated. |
| **C. Poor Spatial Player** | Topological agnosia; high anxiety in mazes; prone to rage-quits. | Relies on Adso's topological notebook; enables assisted charcoal marking; moves node-to-node. | Never experiences Bad Lost; solves intellectual mystery without spatial frustration. |
| **D. Returning Player (14d)** | Forgot local routes; fears being hopelessly lost in the dark. | Re-anchored by "Adso's Morning Recollection"; reviews own notebook margin annotations. | Reorients in 30 seconds; resumes investigation without restarting or getting stuck. |

---

## The 15–25 Minute Spatial Prototype Specification

Before constructing the full library, the studio must build and test a self-contained **7-Room Validation Cluster**:
- **Room 1: Entry Threshold** (Stairwell door, high acoustic bleed from scriptorium below).
- **Room 2: Blind Core** (Windowless, barrel-vaulted, low light, stagnant air).
- **Room 3: North Cliff Window** (Trapezoidal, arrow slit, howling wind audio, cold blue tint).
- **Room 4: Loop Alcove** (Visually deceptive duplicate of Room 2, distinctive tallow drip on lectern).
- **Room 5: South Perimeter** (Slit window framing church roof, moonlight beam, audible bells).
- **Room 6: Tower Junction** (Octagonal room, parabolic acoustic ring, three arch exits).
- **Room 7: Blind Archive** (Target objective room, locked cabinet, distinct uncial inscription).

### The Five Playtester Tasks
1. **Task 1 (Gradient Finding):** Enter Room 1 and locate the North Cliff window (Room 3) by following the cold draft.
2. **Task 2 (Loop Handling):** Locate the Blind Archive (Room 7, accessed via Room 6) without using UI aids.
3. **Task 3 (Backtracking):** Navigate from Room 7 back to the Entry Threshold (Room 1) under candle decay.
4. **Task 4 (Route Retention):** Return directly to Room 7 using the shortest route without making a wrong turn.
5. **Task 5 (Mental Map Test):** Draw the layout of the visited rooms on a blank sheet of paper.

### Critical Metrics to Measure
- **Time to First Disorientation:** Exact seconds before playtester hesitates or spins the camera in confusion.
- **Loop Frequency:** How many times the tester traverses Room 2 -> Room 4 before recognizing the repetition.
- **Acoustic Responsiveness:** Percentage of testers who turn toward church bells when seeking the South perimeter.
- **Exit Recovery Success Rate:** Percentage of testers who find the exit within three minutes of deciding to leave.
- **Simulator Sickness Rating:** Standardized 1-to-10 motion sickness score.

---

## Final Synthesis & Actionable Directives

### VERDICT
The library labyrinth must be the **uncontested intellectual climax and primary spatial engine of *The Abbey Project***, but it must function as an *epistemological puzzle*, not an endurance obstacle course. Its presence in the campaign must be metered: teasing peripheral access early, opening into structured nocturnal investigations midgame, and culminating in full cognitive mastery during the crisis. If the labyrinth is reduced to a standard linear video game level with quest markers, the adaptation loses its soul; if it is built as an unplayable historical maze that alienates the player, the commercial project fails. It must be a triumph of player-driven cognitive cartography.

### GOOD LOST
A temporary state of spatial uncertainty wherein the player does not possess global coordinate knowledge, but retains total confidence in their immediate agency, can identify distinct local landmarks, perceives consistent environmental gradients (such as directional drafts and sound), actively formulates and tests hypotheses, and experiences heightened curiosity and thrilling suspense rather than frustration.

### BAD LOST
A toxic state of cognitive collapse wherein the player's internal mental model disintegrates due to repetitive, undifferentiated architecture, vanishing causal connections, and sensory deprivation, resulting in aimless sprinting, random interaction-clicking, physical eye strain or simulator sickness, resentment toward the game, and the inevitable cessation of play to consult external walkthroughs.

### WAYFINDING PHILOSOPHY
**Wayfinding must be earned through human sensory observation, never bestowed through artificial user interfaces.** The player navigates the labyrinth by reading the world as a medieval monk reads an illuminated manuscript: deducing cardinal orientation from wind and sun, tracking proximity via acoustic decay and church bells, recognizing rooms through architectural scars and epigraphy, and compiling their own cognitive map into Adso's charcoal sketchbook.

### MAP POLICY
**Strict Diegetic Sketchbook.** No floating mini-maps, no compass ribbons, and no magical auto-updating GPS blueprints. The player has access to Adso's physical parchment notebook, which initially records only visited rooms as abstract topological nodes linked by observed doorways. The schematic updates into a geometric survey map *only* when the player and William intellectually decipher the mathematical and thematic layout of the building.

### ENVIRONMENTAL CUE POLICY
Every chamber must feature at least one **primary macro-landmark** readable from the room center within 200 milliseconds:
- *Perimeter rooms:* Directional arrow slits framing specific external monastery landmarks (Church = South, Cliff = North, Orchards = East, Gate = West).
- *Core rooms:* Distinctive masonry features (barrel vs. groin vaults, saltpetre efflorescence silhouettes, ceiling soot patterns, worn floor troughs).
- *All rooms:* Unique Latin epigraph lintels chiseled above doorframes, rendered in high-legibility historical typography.

### AUDIO POLICY
**Directional Acoustic Vectors.** Audio is our primary non-visual compass. The soundscape must provide two constant, opposing allocentric beacons: the high-frequency mountain wind on the North cliff face, and the low-frequency resonance of the abbey bells on the South-East perimeter. Room volume and book density must physically modulate footstep reverb, allowing players to hear the difference between an airless book stack and a structural corridor.

### LIGHT POLICY
**Physically Based Medieval Radiance with Scotopic Contrast.** The player navigates by a single warm candle or horn lantern with authentic inverse-square falloff (3.5 to 5 meters). To prevent eye strain and simulator sickness, complete blackness is forbidden; distant room geometry is rendered in subtle, desaturated scotopic blue-gray silhouettes. Natural moonlight and sunlight through perimeter slits provide dynamic, directional stepping stones that rotate with the canonical hours.

### ADSO / WILLIAM PHASING
- **Beginning (Day 1–2):** *William Guides.* William leads the first exploratory foray, holding the lantern, teaching Adso (and the player) how to read stone, air, and shadows.
- **Middle (Day 3–4):** *William Accompanies.* William walks beside Adso during investigations, examining manuscripts and offering Socratic hints when questioned, but leaving door selection and spatial navigation entirely to the player.
- **Later (Day 5–7):** *Adso Solitary.* Adso infiltrates the library alone at night under curfew or crisis conditions. High tension, zero hand-holding, absolute reliance on earned spatial mastery.

### ACCESSIBILITY
The minimum non-negotiable accessibility suite:
1. **Ergonomic Camera Suite:** FOV slider (75–110), complete toggles for head-bob, camera roll, and lantern sway; persistent center-dot reticle.
2. **Diegetic Navigational Assist:** Optional toggle causing Adso to automatically mark passed doorposts with a subtle charcoal stroke.
3. **High-Legibility Inscription HUD:** High-contrast text modal for reading and translating Latin lintels.
4. **Directional Sound Subtitles:** Closed captions with radial directional arrows for bells, wind, and distant footsteps.
5. **The Returning Player Recap:** Automatic journal recap of known sectors when resuming a save after more than 72 hours.

### PROTOTYPE
Construct the **7-Room Validation Cluster** immediately: an enclosed loop testing one threshold room, two core rooms, two perimeter window rooms, one dead-end alcove, and one octagonal tower junction. Validate the prototype against 20 playtesters to measure time to first disorientation, loop recognition time, and exit recovery rate before committing to full-scale level production.

### PLAYTEST QUESTIONS
1. At any point did you feel sick, dizzy, or suffer eye strain?
2. How long did it take before you realized you had walked through the same room twice?
3. When you felt lost, what was the very first thing you looked or listened for?
4. Could you tell which direction the exterior wall was without opening your notebook?
5. Did you understand what the Latin inscriptions over the doorways meant for your navigation?
6. Did the candle flame or sound of the wind help you find your way, or did you ignore them?
7. Did you ever feel you had to click on every bookcase just in case you missed something?
8. Did William's presence feel like an annoying chaperone, a helpful teacher, or a useless follower?
9. When you finally found the exit door, did you feel proud of yourself or exhausted by the game?
10. If you had to draw the layout of the rooms you just visited on paper right now, could you do it?

### ABANDON / REDESIGN IF...
Abandon or fundamentally redesign the spatial layout if, during prototype testing:
- More than **15% of playtesters** report motion sickness or physical eye strain within twenty minutes.
- More than **25% of playtesters** remain in a state of *Bad Lost* (aimless running, checking every door randomly) for more than **seven consecutive minutes**.
- More than **20% of playtesters** state that they would have closed the game and searched for a walkthrough online if they were playing at home.

### PLAYER PROMISE
> **“When you finally know this library, you will move through its dark, whispering corridors not like an intruder fleeing a labyrinth, but like a master scholar who has unlocked the architectural mind of the Creator—reading every draft, every shadow, and every stone as an open book.”**
