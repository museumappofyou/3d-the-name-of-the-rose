# Story Council, Round Four: What Should the Library Mean?

**Seat:** Literary & Dramatic Architect (01-claude-literary-labyrinth)
**Date:** 2026-10-05
**Direction assumed:** ADAPTED ADSO. Adso grows through PLACE, TIME, PEOPLE, METHOD and INDEPENDENCE, in an interactive adaptation rather than a reenactment.
**Read:** the four canonical docs and README, my Round-3 report, and selectively the library rows of `claims.jsonl`, the browser library modules' header comments and the sun model in `shared/data/horarium.json`. I did not open the two other Round-4 reports in this folder.
**Spoiler status:** I use only premise-level facts the house states on arrival: the library is forbidden, only its keepers walk in it, other monks know its books only through a catalogue and a request, and it sits above the scriptorium. Anything else the source does with the library appears as **[protected library mechanism]**, **[protected library event]** or **[protected library fact]**. Every resident named here is ORIGINAL FICTION, with a placeholder name to check against the cast.
**Owner hygiene:** the comments in `web/src/core/library.js` and `web/src/world/aedLibrary.js`, and the library rows of `claims.jsonl`, state protected material plainly. Don't open them until you have finished the book.

---

## 0. The short answer

Everywhere else in the abbey, Adso learns by living there: bells, meals, faces, routes. The library is the one place where that is impossible. It is forbidden, so he can't get to know it by daily presence. Nobody lives in it, so there are no people to learn. The hours barely reach it, so time slips. It is dark, so sight alone won't teach it. **The library is the only part of the abbey that can't be lived in. It can only be read.**

That makes it the place where the game's two educations must meet. Adso's education is lived: place, time, people. William's is learned: signs, books, method. Outside, they usefully diverge, since Adso comes to know the house while William comes to know the questions. Inside, neither is enough alone. William reads the walls and loses the way. Adso remembers the way and can't read the walls. **The library is where apprenticeship becomes partnership.**

So the library should be neither a maze to beat nor a code to break. It should be **a place learned by returning**: entered rarely, always for a reason brought from outside, and recognised a little more each time. Adso's growth shows less in reaching new rooms than in how familiar rooms *look* to him. In play time it is a **secondary pillar**. In meaning it is the keystone. Its arc must be complete before any [protected library event], so Adso's competence never depends on the source's secrets.

---

## 1. What Adso should feel on first entry

The first entry has seven beats over about twenty-five minutes. Fear is one of them, and it is brief.

1. **Trespass, felt in the body.** Adso is devout and obedient, and on the stair his loyalty to William pulls against his obedience to the house. It isn't fear of the dark. It is doing something wrong for someone he loves. The player should feel *complicit*: breath audible, footsteps too loud.
2. **Anticlimax.** The first room is just a room: cases, a table, dust, a painted band over an arch. The forbidden place is made of furniture. This tells the player the game won't sell the library as a haunted house.
3. **Appetite.** Then the quantity hits: more books than Adso has seen in his life, then another room like it. This isn't awe at size. It is a novice's hunger and a new smallness, one short life against everything ever written. His hand wants to touch everything. William's already is.
4. **Losing "behind".** At some threshold Adso turns and isn't sure which arch they came through. Nothing panics. Certainty just leaves: *I was sure, and now I'm not.* This is the labyrinth's real first lesson, and it concerns the mind, not the walls.
5. **The circle of the lamp.** Adso moves closer to the light and the world shrinks to what the flame shows. William, absorbed in a shelf, hasn't noticed that they are lost.
6. **A small reclaiming.** Adso notices something physical that William, reading, did not: a draft at one arch, his own sleeve-mark in the dust of a doorframe. It is the way back, and proof that *his* kind of noticing works here too.
7. **Reluctance at the exit.** Relief on the stair, with the wish to return underneath it. Next morning, crossing the cloister, Adso looks up at windows he has stood behind. The building now has an inside.

That is complicity, deflation, hunger, unmooring, contraction, reclaiming and longing. The player should *not* feel a monster's attention, puzzle anxiety or a timer's panic.

---

## 2. What the library means at each stage

| Stage | The library is… | What Adso knows | What he feels |
|---|---|---|---|
| **Before entry** | **Hearsay.** A house above the house: rules, catalogue lists, windows seen from below, lowered voices. | What he has been told. The library exists first as testimony. | Curiosity sharpened by the prohibition |
| **First entry** | **Sameness.** Every room is "a room of books". | Nothing distinguishes anything. | Hunger and unmooring |
| **Early returns** | **Difference.** The cold room, the room with the scarred table, the room whose books use letters he can't read | Landmarks made of particular details | The pleasure of telling things apart, and his first earned names for rooms |
| **Middle** | **Inhabited.** Full of absent people: hands in margins, repairs, wear, a stool pulled to a window | The library has a social life the house below never mentions. | Tenderness, and company in an empty place |
| **Later** | **Argued over.** William theorises about its order, and Adso's experience confirms some theories and complicates others. | Partial logics. Some are ordinary, like the keepers' working paths. Some are [protected library mechanism]. | Intellectual excitement, and for the first time being an equal party to a question |
| **Late** | **Carried.** He can walk parts of it in memory, in the dark. | The way to many things, and exactly what he still doesn't understand | Quiet competence, and its cost: knowing the way to knowledge he must not share, and to some he chose not to open |

The decisive turn is the last: **knowing the way is not the same as understanding.** Adso learns where things are long before he learns what they mean, and by the end he can say so. This is UNCERTAINTY, the last of Round 3's note classes, made spatial.

---

## 3. How William changes library exploration

**William leads first, by curiosity rather than orientation.** He goes to the interesting shelf, the strange inscription, the rare binding. Meaning is not the way out, which is exactly why they get lost: William's appetite is the labyrinth's accomplice. Adso follows, and because he isn't reading, he is free to notice the way. The division of labour comes from character, not assignment.

**The lamp is the library's walking order.** Round 3 measured the relationship by who walks ahead. In the library, the measure is who holds the light and where it points.

- **Early:** Adso holds the lamp for William's reading. "Higher. Closer. No, the label." The player's light serves William's eyes.
- **Middle:** Adso points the light where *he* wants to look, and William starts following it. They walk side by side. When William loses time inside a book, Adso hears the bell and pulls him away. The novice now keeps both the time and the way.
- **Late:** Adso walks ahead and William follows the light. At a fork William asks, without irony, "Which way?" Sometimes Adso goes alone on William's behalf.

**Their kinds of knowledge diverge, partly converge, and never merge.** William always reads better. Adso always remembers better, and knows the people whose hands appear in the books, people William barely meets. Late on, Adso can read a little and William trusts Adso's bodily memory without checking. A library is too large for one kind of knowledge, and that is the relationship's mature form.

**Separation** happens twice: once briefly by accident mid-campaign, resolved by Adso's reasoning rather than a scare, and once deliberately late (Moment 3). How these map onto the source is for the canon reviewer.

---

## 4. Set-piece, revisits, days or endgame?

| Option | Dramatic strength | Dramatic weakness |
|---|---|---|
| **Single set-piece** | Maximum weight; contained production | No return means no recognition: disorientation without mastery, the "scary maze level" exactly. All spoiler risk sits in one sequence. |
| **Revisited frequently** | Memory pays off and growth shows. | A forbidden library you visit every night isn't forbidden. Repetition tires. |
| **Partly explored over several days** | The known area grows with understanding, and each visit can have a purpose. | Each visit needs a reason and an opportunity, with a risk of crude gating ("rooms 9–14 open on day four"). |
| **Endgame intellectual environment** | Everything learned converges. | It collides with [protected library event]s. Mastery lands where agency is most limited, which was Round 3's biggest risk. The campaign becomes a wait for the final dungeon. |
| **Offstage presence** | Felt from outside: windows, catalogue, requests, the keepers' comings and goings | On its own, this starves the theme and wastes the reconstruction. |

**Recommendation: an offstage presence plus a few widening returns.** The library is felt daily from outside: its windows from the cloister, the catalogue in the scriptorium, books brought down and requests refused. It is entered about five to seven times in a twelve-hour campaign. Each entry has a purpose, lasts ten to thirty minutes, and ends naturally when the lamp runs low, a bell rings or William says "enough for tonight". The known area grows because Adso understands more, not because a gate opens.

Two timing rules follow. **The first entry comes only after the player has lived a full day of hours**, so losing time inside feels like a loss. **Adso's library competence peaks before the late campaign**, so whatever the source does there later, he meets it knowing the place rather than as a passenger.

---

## 5. How it avoids becoming the scary maze level

A maze level has three properties: the goal is the exit, the walls are obstacles, and a threat makes you hurry. The library reverses each one.

- **The goal is never the exit.** Every entry carries a question from outside: a book a copyist awaits, a date an ownership note might settle, a phrase heard in choir, a recognised hand. Leaving is simply where the visit ends.
- **The walls are shelves.** Every wall is content, and what blocks you is what you came for. Books are opened, weighed, compared and put back.
- **Tension comes from consequences, not threats.** The pressures are lamp oil, the next bell, being seen from outside, what discovery would cost William as a guest, and the unease of reading the forbidden. Getting lost costs time and risk. It never means death or a restart.
- **The adapted layer never has a pursuer.** Anything of that kind in the source belongs to the canon reviewer's [protected library event] decisions and never sets the everyday register.
- **Growth shows inside the library itself** through room names, glosses and light (§9–10). The room proves the player changed.

---

## 6. Library as architecture, library as knowledge

The library claims its architecture *is* a classification: where a book stands says something about it. How the source develops that idea is [protected library mechanism]. The default game should not stage its decoding as a player puzzle, because that is William's territory and the source's.

The way around a puzzle is a distinction: **knowledge first tells Adso where he is, and only later where to go.**

- A code puzzle points forward: read a sign, look up the answer, go there.
- Recognition points back. From what is here, Adso knows where he is and whether he has been here. "This is the sermon collection the refectory reader asked for, so I've been in this room." "This is the hand of the copyist I sit beside, so his book came from here." "The last light sits in these windows, so this side faces the sunset."

Recognition builds into navigation without any code. Once Adso knows enough rooms, he simply knows the way. That is how people learn real buildings, and it lets books, scripts, people and hours help without anything becoming a cipher.

There is a historical precedent (HISTORICAL_RECONSTRUCTION). Medieval memory training attached knowledge to places in imagined buildings; Mary Carruthers' *The Book of Memory* is the standard study. Adso can learn the library the way monks learned texts, until it becomes his own memory palace. Choose a dated monastic example before claiming the practice for this house.

---

## 7. Kinds of library discovery

| Category | Generic examples | What it gives Adso |
|---|---|---|
| **Ways** | A connection, a dead end, a second route to a known room | Spatial memory, and the joy of a shortcut |
| **Bearings** | Light at a given hour, cold air, sounds from below, a cooking smell, a bell faint through one window | Orientation through knowing the world outside |
| **Holdings** | A particular book's size, binding, clasp, script, condition and opening words | Landmarks made of knowledge |
| **Labels** | Painted bands over arches, shelf labels, catalogue entries, ownership notes | The institution describing itself, accurately or not |
| **Hands** | Marginal notes, pen trials, a sewn tear, thumb-darkened pages, a forgotten trimming knife | People in an empty place |
| **Gaps** | An empty slot, an outline in the dust, an entry with no book, a book with no entry | Absence as evidence, with the discipline that missing proves nothing alone |
| **Strata** | Old shelving beside new, a label painted over, label handwriting changing across generations | The library as something made over time |
| **Echoes** | A phrase seen over an arch, later heard in a reading; a copyist's hand known from downstairs | Proof that the library and the house are one world |
| **Self-traces** | His own earlier mark, his sleeve-mark in the dust, his wrong sketch of a room | Memory made visible, with his past self as a guide |
| **Refusals** | A shelf William steers him from, a book Adso chooses not to open | Forbidden understanding as a decision rather than a lock |

Any category can hold an **unresolved** item with no completion badge (the "unresolved fragment" in `GAME_DESIGN.md`). **Every visit yields at least two kinds of discovery.** A visit yielding only Ways is a maze level, and one yielding only Labels is homework.

---

## 8. How much fear, and when

| Register | What produces it | When |
|---|---|---|
| **Disorienting** | Sameness, darkness, losing "behind" | Strongest on first entry. It fades with knowledge and returns briefly in unknown parts. |
| **Oppressive** | Heavy shadow, stale air, the weight of quantity, the prohibition | Early, and on entering any unknown part |
| **Dangerous** | Social exposure: a lamp seen from outside, a bell announcing the house waking, a mark left behind | Every visit, low and steady. This is the honest stake. |
| **Exhilarating** | Recognition, a link between inside and outside, finding something together | The middle of the campaign |
| **Intimate** | Night talk among books, the only place William and Adso are truly alone for long | Middle to late |
| **Melancholy** | Books nobody reads, a copyist's work that never came back down, decay | Middle |
| **Sacred** | Silence, the first grey of dawn in rooms facing out, the sense of vast collective labour | Late, and at a few chosen early moments |
| **Peaceful** | Walking a known stretch with the lamp lowered | Late |

The curve inverts over the campaign. Early visits are disorienting and oppressive, with peaks of hunger. Middle visits are exhilarating and intimate under steady danger. Late visits are peaceful and sacred, and only exposure brings sharp danger. Horror is not a register. Fear appears only as a peak of disorientation or exposure and lasts minutes at most.

---

## 9. Memory, and making transformation visible

Recognising a room is a stronger feeling of growth than any marker. The game hands you a marker, but recognition comes from your own memory. In Round 3's terms, **a marker is testimony; recognition is observation.** The library rewards observation.

- **No automap.** Adso keeps his own sketch, drawn only from rooms he has physically walked (the existing passage tracker already refuses teleported or loaded traversals). Early on it is wrong: a room drawn too small, a doorway on the wrong wall. Corrections come later in another hand, and the error stays visible (Round 3's revision rule).
- **Rooms are named the way people are.** First by description ("the cold room"), then by distinguishing feature ("second from the stair, with the scarred table"), then by meaning ("where Tebaldo's book is"). The names are the player's evidence of growth.
- **Recognition on re-entry happens in the world.** Adso's breathing steadies, he murmurs a name, William glances at him. Pop-up notices never appear.
- **The lamp changes.** Early he holds it high to see everything. In the middle he lowers it to read labels. Late he shields it in rooms that face the grounds, because he knows which those are and no longer needs light to know where he is.
- **The largest visible change** comes when he rereads his first-entry note and annotates it (Moment 3).

**Accessibility.** Weaker spatial memory must not shut players out. Asking William to lead is always available and never penalised. It hands the walking order back for that stretch, and the player sees themselves follow. The sketch can always be consulted. A clearer-landmark setting can make rooms more distinct through wear, light and contents. No aid ever reveals an unwalked room.

---

## 10. Inscriptions, languages and books

The library must not become a Latin homework simulator. Six principles prevent it.

1. **Recognition before reading.** Adso learns letter shapes, lengths, colours and how a script looks long before reading a word. "The room whose books use letters like hooks" is a landmark long before he knows the language.
2. **Progressive gloss.** The same text displays differently as Adso changes: bare letterforms, then his partial gloss with gaps, then a confident reading with one honest doubt. The player looks at the same wall and it reads differently because Adso has changed. This is the library's most powerful single device.
3. **A small recurring vocabulary** of perhaps ten to fifteen words, met first outside the library: in choir, in readings at table, on a scriptorium label, in Lapo's letter. Recognising one on a library wall is the reward, and translation can stay partial.
4. **William's translations are interpretations.** He renders a line briefly when asked, and sometimes offers two senses. Adso learns that reading means choosing.
5. **Books are handled, not read through:** weight, clasp, damage, opening words. Some medieval catalogues identified a copy by the first words of its second leaf (*secundo folio*; HISTORICAL_RECONSTRUCTION, best documented in later English catalogues, so it needs a date-and-place decision). Opening to the second leaf to confirm a copy is quick, physical and satisfying.
6. **Progress never waits on reading.** Significant text is translated as far as Adso understands it, at a scalable size, with transcripts.

What the painted bands are in the source is for the canon reviewer. Until then they serve as landmarks and as places where the recurring vocabulary appears.

---

## 11. Human stories in the library

The library is empty of people and full of them:

- **Margins as conversation:** two hands argue over a passage across decades, the later answering the earlier.
- **Work habits:** pen trials, a scribe's private symbol, a stool turned to the best light, a table edge hollowed by generations of forearms.
- **Repairs:** a tear sewn with coloured thread, a clasp replaced in mismatched metal, a new board on an old text.
- **Wear:** pages darkened by thumbs show which parts people actually read. Researchers have measured this on later devotional books (HISTORICAL_RECONSTRUCTION; needs a dated example).
- **Misplaced objects:** a trimming knife, a candle stub, a pebble holding a page flat, a dried sprig used as a bookmark.
- **Catalogue practice:** label hands changing over generations, and an entry whose place in the catalogue's acquisition order dates a gift.
- **Work that went upstairs:** the copyists below never see their books again.

**Example (ORIGINAL FICTION).** Brother Tebaldo, a copyist in the scriptorium (placeholder name), mentions a book he copied twenty years ago and never saw again: "it went up." Mid-campaign, Adso finds it. He knows the hand from the desk beside his own, and in one margin a tiny mule is drawn where the scribe got tired. Telling Tebaldo would reveal the trespass. The player chooses whether to tell, keep the secret, or tell obliquely ("I think your mule is well"). No plot has advanced. Adso now holds a secret about someone he likes.

Three rules apply. No trace implies any person's secret library activity, which touches [protected library fact]s. The keepers' institutional history is [protected library fact], so past keepers in traces stay generic or are vetted. No novel prose appears in any margin.

---

## 12. The library and the rest of the campaign

**Outside knowledge prepares the library; it doesn't gate it.**

- **Time.** The shared clock already carries a late-November sun model, and Adso knows the bells. He orients by which windows hold the light and hears a faint bell through one particular window.
- **Place.** Having seen the building from outside, he knows which rooms face which grounds, and who might see a lamp.
- **People.** He knows hands from the scriptorium, and books he saw requested and refused.
- **Method.** The catalogue taught him that an entry is a claim about a book, not the book.
- **Vertical order.** Kitchen below, scriptorium between, library above. The scriptorium is the library's waiting room, and the kitchen's sounds and smells rise.

**Library knowledge burdens Adso outside.** He can't say how he knows what he learned upstairs. That turns Round 3's note classes into drama: an observation he cannot publicly attribute. Before he can use it, he must find a source he *can* name, such as a record downstairs or someone's account. Library knowledge enters the wider game only through a door Adso finds himself.

**Original matters.** A few of Round 3's small matters may touch the library indirectly (a date only an ownership note settles, a waiting copyist), but none may become a hunt for a missing or forbidden book. That is "the book's thing, smaller", which Round 3 discarded.

Every visit begins outside with a question and ends outside with a consequence, so the library never feels like an isolated dungeon.

---

## Three library experience models

| | **A. Architectural labyrinth** | **B. Classificatory labyrinth** | **C. The Remembered Labyrinth** |
|---|---|---|---|
| **Player fantasy** | Escape and master a maze | Crack the library's hidden order | Make your own a place built to be unlearnable |
| **Emotional trajectory** | Disorientation, relief, mastery | Confusion, insight, command | Complicity and hunger, recognition, company with absent readers, quiet competence |
| **Repeatability** | Low once mapped | Almost none once solved | High: each visit brings a new question, and familiar rooms change meaning |
| **William's role** | Fellow lost traveller, mapping strategist | The decoder, with Adso assisting | Reader of walls, beside Adso the reader of ways |
| **Adso's progression** | Spatial only | Borrowed: the insight is William's | All five domains: place (names), time (lamp and bell), people (hands), method (claim versus object), independence (alone, late) |
| **Books** | Decoration | Tokens in a cipher | Landmarks, objects, people's traces, forbidden choices |
| **Architecture** | Everything | A lookup diagram | A memory palace built from particulars |
| **Danger of frustration** | Very high: identical rooms, backtracking | Puzzle walls, homework, the stuck player | Low to moderate: bounded visits, no failure, William on request. The real risk is being too gentle. |
| **Narrative potential** | Thin, and it pulls toward horror | Conceptually high, but it re-enacts [protected library mechanism] and William's arc | High, on adaptable material, with the protected layer optional |

**I choose Model C.** Model A is the maze level the brief fears. Model B is closest to the source intellectually, but staging it either spoils protected material or replays William's triumph with Adso watching. C keeps the source's vertigo in the first entry and the forbidden in every entry, and gives the growth to Adso. Its weaknesses are a cumulative satisfaction rather than one "aha", which is harder to put in a trailer, and a drift toward gentleness. The answers are a genuinely disorienting first entry and steady social danger throughout.

---

## Three spoiler-safe library moments

All three pass through one room near the stair. A cracked pane in an outward window lets in a thin cold draft, and the table's edge is hollowed where forearms have rested for generations. Adso will call it **the cold room**.

### Moment 1, first entry: "Every Room"

*Context:* night, after at least one full day of hours. How the two reach the stairhead is for the canon reviewer.

Adso holds the lamp. William says, "Higher." The first room disappoints, and William is already at a shelf. Adso touches a spine, and William says without turning: "Gently. Whatever you move, someone has to find exactly where it was." The stakes are set without a threat. Three rooms later Adso turns round and can't say which arch they came through. William, reading a painted band, doesn't know either. He is interested rather than worried, which is worse. Adso remembers the cold on his neck in the first room and follows it. On one doorframe he finds a streak in the dust where his sleeve brushed it coming in. On the stair William asks how. "It was colder there." "Remember that you knew that."

*The cold room means:* "where it was cold", otherwise indistinguishable from the rest.
*Notebook (undisciplined):* "All the rooms are the same. More books than I have seen in my life. We found the way back by the cold."
*Afterwards:* crossing the cloister at the morning office, the player can look up at a dark window and know they have stood behind it.

### Moment 2, mid-campaign return: "The Mule in the Margin"

*Context:* William wants to compare two copies of a text he heard quoted in chapter (ORIGINAL).

Adso walks into the cold room and *knows* it: the draft, the hollowed table. He murmurs its name, and he knows two ways out. He holds the lamp where he wants to look, and once, without comment, William follows the light. When William finds his text he sinks into it. Adso watches the oil, and through the cracked pane he hears, very faintly, the bell for the night office. On the shelf nearest the table he sees a hand he knows: Tebaldo's, with the mule in the margin, and above it an older hand's note of when the book arrived. Adso has to pull William away: "The bell." William is genuinely startled: "Already?" Adso leads on the way out, and they walk side by side for the first time. Over the cold room's arch, one word of the painted band now carries a gloss, because he heard it at Vespers.

*The cold room means:* a feature, a neighbour and a person.
*Notebook:* "The cold room, second from the stair. Brother Tebaldo's book is there. I did not tell him." Beside it is a small private sign Adso has begun using for *seen where I cannot say.*
*Afterwards:* the player chooses how to face Tebaldo at his desk.

### Moment 3, late competence: "The Lamp Lowered"

*Context:* William is held in the delegation's rooms. A lay family Lapo knows is disputing a customary right that turns on when a gift was made to the house (ORIGINAL). The only written witness to the date is a donor's note in a book upstairs. William can't leave and says only: "You know the way better than I do."

Adso goes alone. He shields the lamp in rooms whose windows face the guest house, because he has seen those windows from there. In the cold room he doesn't raise it at all; the draft tells him where he is. He finds the book by its binding and opens it to the second leaf to confirm the copy, a practice learned at the catalogue downstairs. He reads the note fluently: a year he can read, and a giver's abbreviated name he can't fully resolve. Beside it, where another volume stood last time, is a clean outline in the dust. Something ordinary has changed, since the library is used by day. He notes it and doesn't chase it. Leaving, he finds his old sleeve-mark on the doorframe and rubs it out. He hears the bell and knows exactly how long he has.

On a stair, William asks, "Well?" Adso reports precisely: what the note says, the abbreviation he can't resolve, the ink matching the entry above, and that he can't say who wrote it. He also has a way to make it usable. The catalogue downstairs is kept in order of arrival, so if the entry stands between two dated gifts, anyone can see it. Then he adds: "The book beside it is gone since last time. I don't know why." "You're sure it was there?" "Beside the one with the green-sewn tear." William nods and doesn't check.

*The cold room means:* a place he walks through in the dark, holding nothing left to discover except his own former self.
*Notebook:* he turns back to his first entry, "All the rooms are the same", and adds in his later hand: *"They are not. I did not yet know how to look."*

---

## Why the labyrinth may be a bad game idea

1. **It switches off the game's best systems.** The investigation design rests on people, testimony, hours, routes and sightlines. The library has no people, no testimony and almost no hours, so the most distinctive machinery sits idle inside it.
2. **Sameness and recognition are at war.** The source's labyrinth is meant to be indistinguishable, and recognition needs distinguishable rooms. Distinct rooms betray the place, and identical ones frustrate the player. Every compromise will show.
3. **It is the project's most spoiler-dense space.** The reconstruction already builds [protected library mechanism]s into its geometry. Players read space, so an odd wall or unexplained arrangement can spoil without a word of text. The owner can't review this area until they've finished the book.
4. **It puts the protected spine where players most want agency.** A labyrinth asks to be solved, but the source's solving and major library events are protected. If the library is central, the player's most important place is where they act least.
5. **Genre pulls it toward horror and stealth.** Dark, forbidden, labyrinth and lamp will read as horror to players and reviewers. Trespass invites detection meters, patrols and hiding. The game is neither genre.
6. **Repeated trespass dissolves the prohibition.** With too few visits there is no memory payoff. With too many, the forbidden library becomes just another room.
7. **It is costly in text and rendering.** Inscriptions and margins mean dense text translated in layers, with accessibility work on all of it. Many similar rooms of books lit only by a lamp mean heavy props in exactly the kind of dark interior the native proof already struggles to show readably. The library isn't migrated, and its browser build is costly.
8. **It can steal the arc from Adso.** Decoding is William's strength, so library play drifts toward William solving while Adso holds the lamp forever.
9. **Spatial memory is unequal.** Some players can't hold a layout in mind, and first-person darkness can cause motion discomfort. Aids that help them can flatten the experience for others.
10. **A labyrinth promises a centre.** Players expect one great secret at its heart. Withholding it disappoints, and delivering it creates canon and spoiler problems.

## What we lose if the library is not important

1. **The novel's central image.** Readers come for it. An abbey game without its library is a church without its choir, and reviews will ask where it went.
2. **The crucible of the partnership.** It is the only place needing both Adso's lived knowledge and William's learned knowledge.
3. **The summit of PLACE, and memory's best stage.** Elsewhere, daylight and people make the abbey legible. Only here is legibility earned against the building's design, and recognition as a reward needs a place that is hard to recognise.
4. **Forbidden understanding as experience.** Without the library, the theme stays in overheard debates instead of a shelf the player stood before and chose not to open.
5. **The meaning of the building.** The scriptorium's labour loses its destination, the catalogue becomes a prop, and the copyists' work goes nowhere.
6. **Solitude and intimacy.** Nowhere else are William and Adso alone together for long.

## Where a reader who has finished the book must decide

- How the adaptation brings Adso and William to the stairhead each time.
- What the painted bands are, and whether anything beyond their role as landmarks ever surfaces.
- How [protected library event]s map onto the five to seven entries, and in what register.
- Whether any original trace, gap or change between visits collides with canon.
- Which parts of the reconstruction stay inert or hidden in the default mode, so the default library never gives away [protected library mechanism]s.

---

## VERDICT

**SECONDARY PILLAR.**

Not primary: the game's engine is the living abbey of hours, people and testimony. The library switches those off and carries the greatest spoiler and protected-spine risk, so making it primary would turn the game into a maze game in costume. Not a special set-piece: its value lies in returning, and a single night gives disorientation without mastery. As a secondary pillar it is a thread felt daily from outside, with five to seven purposeful entries and roughly a tenth to a seventh of play time inside. It carries the highest meaning per minute in the game, and its arc is complete in itself.

## DRAMATIC PURPOSE

The library is where the story's two educations meet: Adso's lived knowledge of a house and William's learned knowledge of signs. It is the one part of the abbey that can't be lived in, only read, and it is too large and dark to be read by intellect alone. Its purpose is to let the player feel the passage from following to partnership by learning a place built to resist learning. They are lost by curiosity and found by memory. They meet the absent people in its margins, and they discover that knowing the way to a book is not understanding it.

## ADSO ARC INSIDE THE LIBRARY

**Beginning.** He holds William's lamp and is complicit, hungry and lost. He finds the way back with his body, not his learning. Every room is the same.
**Middle.** He names rooms by their particulars and recognises hands from downstairs. He keeps time while William reads and leads them out side by side. He carries a friend's secret and knowledge he cannot attribute.
**Late.** He walks known rooms with the lamp lowered and goes alone on William's behalf. He confirms a book by its second leaf and reports exactly what he knows and where that knowledge ends. He finds a sayable route for what he saw, erases his own trace, and annotates his first note.

## WILLIAM'S ROLE

William brings the library its meaning and its danger in one gesture: he can't pass an interesting shelf, so he leads them into it and loses them there. He stays the better reader throughout, translates when asked, offers two senses where one would be simpler, and keeps the protected intellectual questions the source gives him. His arc in the library is learning to trust a different kind of knowledge: from "Higher, closer" to following Adso's light, from rechecking to nodding, from leading to asking "Which way?" He never solves what Adso found or restates it more cleverly. Who holds the light is how the relationship becomes visible.

## LIBRARY EXPERIENCE MODEL

**The Remembered Labyrinth.** The library is a place made one's own by returning. Seven rules define it.

1. **Every entry has a purpose.** Five to seven visits, each bringing a question from outside and ending naturally with the lamp, a bell or William.
2. **Recognition replaces mapping.** No automap. Adso's fallible sketch, and rooms named the way people are: description, then distinguishing feature, then meaning.
3. **There are two maps.** One is the library's own labels, which belong to William and partly to [protected library mechanism]. The other is Adso's lived names. Late competence is partial translation between them.
4. **Outside knowledge provides bearings.** Light by hour, sound from below, people's hands and words heard in choir orient Adso through recognition, not lookup.
5. **People live in traces.** Margins, repairs, wear and misplaced tools populate an empty place.
6. **Tension comes from consequence.** Oil, bells, exposure and the cost to William drive it. There is no pursuer and no death.
7. **The arc is self-sufficient.** Adso's competence peaks before any [protected library event] and never depends on one.

## THREE KEY MOMENTS

1. **"Every Room" (first entry).** Lost through William's curiosity, found through the cold on Adso's neck. Every room is the same.
2. **"The Mule in the Margin" (mid-campaign).** Adso knows the cold room, keeps the time, finds a friend's hand and leads William out side by side.
3. **"The Lamp Lowered" (late).** Alone with the lamp shielded, Adso confirms a book by its second leaf, notes a gap without chasing it, rubs out his old trace and annotates his first note.

## WHAT MUST NEVER HAPPEN

- An automap, minimap, compass or plan showing library rooms Adso hasn't walked. The browser reference's library and plan stay behind the spoiler opt-in that `PROJECT.md` already requires.
- A study jump, teleport or load counted as library knowledge.
- A pursuer, monster, chase or jump scare in the adapted layer.
- Death, game over or forced restart for getting lost.
- Detection meters, patrol cones or hiding in cupboards.
- Decoding [protected library mechanism] as a default-mode player puzzle, or any default-mode environmental detail that gives it away.
- Library mastery gated behind protected knowledge.
- Required Latin, tiny unreadable text, or progress blocked on translation.
- A visit with no outside question ("explore the library"), or one yielding a single kind of discovery.
- Visits so frequent that the prohibition becomes a formality.
- Original traces implying anyone's secret library activity, or past keepers invented without canon review.
- A quest for a missing or forbidden book.
- William solving what Adso found, or restating it more cleverly.
- Rooms made distinct by colour-coding or signs the place would never have. Distinctness comes from wear, light, contents and traces.
- Novel prose in inscriptions, margins or dialogue.

## GAME THESIS FOR THE LIBRARY

A library is a building made of other people's memory, and this one was built so that nobody but its keepers could learn it. Played as Adso, it becomes the place where a boy who learned a house by living in it meets a place that can only be learned by reading, beside a teacher who can read it but can't find his way. The library's truth and the source's secrets stay fixed. What changes is how the same rooms look to the person walking through them: all the same, then different, then inhabited, then remembered. In the end the novice who once held the lamp for his master's eyes walks ahead with it lowered, knowing the way and knowing exactly how much he still doesn't understand.

## PLAYER PROMISE

"When you enter this library, you will hold the light for someone wiser than you and get lost because of what he loves. You will find your way back by something only you noticed. Each time you return, the same rooms will look different, because you have changed. You will come to know strangers by their handwriting, keep the time while your teacher forgets it, and decide which books you will not open. One night you will walk through it alone, without raising the lamp, and know where you are."
