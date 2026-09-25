# Genesis cutscene: the eldritch pass

A many-phase plan. Each phase is one owner prompt ("go"), one session,
one finished and committed result. **Scope: eldritch beings only**:
the old ones, the far realms, and a new tier-3 layer; since D16 also the
old ones' work inside the Primordisentia (phases 25–29). Souls, the gods,
angels, devils, vorgath, Rex, Obrokxus, the mainland and the city stay
exactly as they are.

## How to run a phase ("go")

1. Read this file's **Progress** table; take the first row that is `todo`.
   Read only that phase's section plus **Brief**, **Decisions** and
   **Constraints** below. Do not redo `done` phases.
2. **Research first, every phase.** Load `WebSearch`/`WebFetch` (deferred
   tools) and research that phase's listed topics widely, then go past the
   list: other games, painters, films, costume history. Write a short
   research digest (sources + what we take from each, in our own words;
   never copy art or long text) into the phase's `Notes` line below, or a
   `.claude/plans/research/<phase>.md` when longer than ~10 lines.
3. Design, then specs, implementer, verify, review, commit, report, as
   `CLAUDE.md` says. A phase with more than ~3 deliverables splits into
   several specs, not several phases.
4. Before the report: set the phase row to `done` (with the commit sha),
   add any owner-facing decision to **Decisions**, add anything you learned
   that later phases need to **Carry forward**.
5. A phase that turns out too big: finish a coherent half, mark it
   `partial`, write what is left under its section, commit.

Prefer a worktree session for phases that touch code (long work; see
`.claude/modes/worktree.md`). Discussion phases end with questions to the
owner and no code.

**Questions go through the `AskUserQuestion` UI, never as a list in the
report.** At most 4 questions
per call and 2–4 options each (the owner always gets "Other" for free
text), the recommended option first with "(Recommended)" in its label,
a `preview` when a caption or layout helps. Ask in the same turn the
phase runs, apply the answers, then commit and report. A phase whose
design raises questions asks them before building, not in the next
session.

## Brief (the owner's words, condensed; all of it applies)

- A giant pass on the genesis cutscene: keep the art style but make it
  *cool*. Inspiration: **Control** and **Control Resonance** (research
  what the second one is and shows), and above all the **art direction and
  vibes of Dishonored** (and Dishonored 2 / Death of the Outsider).
- **The intelligent eldritch beings dress as Late Victorian / Gilded Age
  high society**, but it is **extremely rare to see an old one that
  humanoid**. In the cutscene: **maybe 2 with full suits**, and **only one
  has the full thing** (see D1). The rest wear **one or two pieces**: mostly
  a hat, or trousers, an item, boots. Most do not have the body to wear
  clothes.
- **Winter clothes specifically**: dressed against the chaos, protected
  from it.
- **Exaggerate**: super tall hats, super wide hats, huge shoes.
- **99 % never owned their clothes**: taken, found or gifted, so nothing
  fits. **Only high society gets tailored** boots or anything of a
  specific size.
- **Three tiers of reality.** Tier 1: where mortals live. Tier 2: a
  fourth-dimension-like layer where most eldritch beings live. Tier 3:
  things bigger than the void itself.
- **Nothing Cthulhu-scale exists in the cutscene today.** Use the **top
  part of the screen** for **huge shadows** of tier-3 beings: always
  there, or not; watching, or doing something.
- What tier 3 does **hits tier 2, and through it tier 1, never
  directly**: "something else". **Tier 1 and 2 beings never understand,
  or even know, that tier 3 exists**, yet it is the source of much of the
  chaos.
- Keep `.claude/rules/art-style.md`, add Dishonored-style rules on top;
  any rule worth removing or changing gets a discussion phase first. The
  file changes as part of this work.

## Current state (explored 2026-09-25; anchors drift, grep the names)

- Beats: `G.BEATS` in `js/genesis/genesis-state.js`. Eldritch beats:
  `break` (chaos fades in, grey shards), `elements`, `matter` (the mass),
  `trade` "VI · The old ones" (they climb out of the mass one by one),
  `walk` (east-goers march; chaos strongest), `root` / `swarm` / `womb`
  (they find the Primordisentia, cling to it, kneel), `birth` / `fight`
  (watch at 55 % alpha), gone at `land`. `deep` / `slip`: Obrokxus's 70
  "brothers", old-one kinds tinted red at 0.32 size (`genesis-depths.js`).
- Roster: 24 old ones, `ROSTER_SPECS` in `genesis-oldones.js` (10 kinds)
  plus 14 painters in `genesis-oldkin.js`. West (8): colossus 0.27 H (the
  only biped), strider, crawler, slider, floater, winged, pearl, husk.
  East (16): blinker, roller, eye, mass, tower 0.20 H, bundle, needle,
  slab, bloom, comb, veil, knot, chime, prism, swarmling, mound. Sizes
  0.05–0.27 H; greys 70–200 each with an accent hue; `litSplit` /
  `circSplit` / `eyeDot`; flat fills, no glow; feet on the deck (0.64 H).
  West-goers walk off-screen early; **the east-goers are the ones the
  camera follows** (costume budget goes mostly east, or move a few).
- Sky: nothing owns the top band. `fillBg` #0d1114 → `drawChaos` (the far
  realms: 3 parallax layers of dim blobs #10161b–#1a1a22 + 40 1-px far
  lights) → motes → `GenElem.drawResidue`, all full screen
  (`genesis.js` draw conductor). World painters use `G.sx(u)`; a global
  zoom 1.00–1.10 applies to every layer. A screen-fixed sky layer slots in
  right after `fillBg` (oversize it for the zoom).
- The only large thing: the Primordisentia (`genesis-flesh.js`), ~0.5–0.7
  of the short side. Nothing colossal otherwise.
- Prior art for huge dim silhouettes: `drawPresences` / `drawTendrils` in
  `js/world/void.js` (the bridge void, not the cutscene).
- Lore in code: `js/depths/lore.js` (the Administration mends holes left
  when an Old One descends; Void Vikings descend from the Old Ones). No
  tier lore anywhere yet.
- Review: `py -3 tools/gframes.py <run> [beat ...]`; snap scenes
  `genesis-<beat>`; URL `/?genesis=1&gbeat=<id>`.

## Constraints (every phase)

- Current art-style rules hold until Phase 2 changes them: flat fills,
  light from the left, hard flat `litShade` shadows (never another
  `litShade`), no outlines, soft glow only on emitters.
- Out of scope files: `genesis-gods.js`, `genesis-seraphin.js`,
  `genesis-malgrur.js`, `genesis-vorgath.js`, `genesis-hosts.js`,
  `genesis-rex.js`, `genesis-mainland.js`, `genesis-armies.js`,
  `genesis-saga*.js`, `genesis-ritual.js`, `genesis-titans.js`,
  `genesis-obrok.js`, soul drawing in `genesis-flesh.js`.
- CPU matters (the owner's fans): cache static art to offscreen canvases,
  no per-frame allocation storms, measure before/after in any phase that
  adds a layer.
- `Util.reduced()`: reduced motion holds everything still but keeps it
  visible.
- `snap.py compare`: `same` on every scene outside the phase's beats.
- Research is for style and ideas: nothing copied from Arkane or Remedy
  art, no logos, no names from those games in the site.

## Progress

| # | Phase | Kind | Status |
|---|---|---|---|
| 1 | Style research and rules proposal | research, doc | done 2026-09-25 |
| 2 | Discussion: the rules and the open questions | owner talk | done 2026-09-25 |
| 3 | Eldritch lore bible (tiers 1–3) | doc | done 2026-09-25 |
| 25 | The inspired ones: story, new beats, owner talk | research, design, owner talk | done 2026-09-25 |
| 25a | The owner's answers to Q1–Q7 (beats doc) | owner talk, doc | done 2026-09-25 |
| 4 | Baseline frames and the eldritch palette | tooling, doc | done 2026-09-25 |
| 5 | Wardrobe casting sheet | design doc | todo |
| 6 | Silhouettes: proportion pass on the roster | code | todo |
| 7 | Attire kit (hats, coats, boots, trousers, items) | code | todo |
| 8 | The tailored one (full suit, high society) | code | todo |
| 9 | The second suit (found, nothing fits) | code | todo |
| 10 | Wardrobe batch: the east-goers A | code | todo |
| 11 | Wardrobe batch: the east-goers B | code | todo |
| 12 | Wardrobe batch: the west-goers (D14: they never dress) | code | dropped |
| 13 | Winter against the chaos: weather on the cloth | code | todo |
| 14 | Acting: manners, gait and the uncanny | code | todo |
| 26 | The inspiration: bodies change and dress at the womb | code | todo |
| 27 | The worlds inside: universes built in the flesh | code | todo |
| 28 | The remaking: souls pulled apart, remade, sent through lives | code | todo |
| 29 | The leaving: off to their own civilizations | code | todo |
| 15 | Tier 3: concept and choreography doc | design doc | todo |
| 16 | Tier 3: the sky layer and the shadows | code | todo |
| 17 | Tier 3: acting across the beats | code | todo |
| 18 | Tier 3 → tier 2 → tier 1: the indirect chain | code | todo |
| 19 | Tier 2: life on the bridge (nests, cities) | code | todo |
| 20 | The emergence: climbing out of the mass | code | todo |
| 21 | The elements split: the sea, the bridge, the air | code | todo |
| 22 | Captions (D6 said no) | copy | dropped |
| 23 | Performance pass | code | todo |
| 24 | Full review, reduced motion, rules final | review | todo |

## Phases

### 1 · Style research and rules proposal
Research: Dishonored 1/2/DOTO art direction (Viktor Antonov, Sébastien
Mitton: painterly exaggeration, big hands and heads, whale-oil
industrial, muted teal/ochre with warm accents, the Void's floating
debris islands, the Outsider); Control and Control Resonance (the Oldest
House, brutalism, the Board, the Hiss, red resonance, redaction, the
Astral Plane); Victorian/Gilded Age illustration (Punch cartoons, Gustave
Doré, Edward Gorey, Mervyn Peake); flat-silhouette games that pull off
painterly moods (Inside, Limbo, Gris, Darkest Dungeon, Hollow Knight).
Deliverable: `research/01-style.md` and a **proposed** "Eldritch" section
for `art-style.md` (not applied), each rule marked *add* or *change*
with the reason. Carry every tension with the current rules to Phase 2.
Notes: done 2026-09-25. Digest, garment ranking, 23 proposed rules (18 add,
5 change) and 6 tensions in `research/01-style.md`.

### 2 · Discussion: the rules and the open questions
No code. Present to the owner: the proposed rules (adds applied directly
after a yes; changes argued one by one), plus D1–D8 below. Apply the
agreed section to `.claude/rules/art-style.md`; record answers in
**Decisions**. Likely talking points: painterly texture vs flat fills
(e.g. stepped tone bands, flat fold shapes instead of gradients); a
second, cold rim light for the chaos (breaks "light from the left"
only for eldritch?); outlines on cloth; a palette shift toward
Dishonored's teal/ochre within "backdrops stay dark".
Notes: done 2026-09-25, no web research (a talk phase; the new tier ideas
get researched in Phases 3, 19 and 21). Applied to `art-style.md` as the
"Eldritch" section: figure and tier-3 adds, rule 8 as a mid band (no
patches), 18 yes, 22 only at break/walk, rule 11 replaced by "eyes are
rare, each unique" and "nothing repeats"; tier-2 accent rules 21 and 23
replaced by the owner's bridge idea. Answers in **Decisions**.

### 3 · Eldritch lore bible
Research: Lovecraft's Great Old Ones vs Outer Gods (Azathoth, the
blind idiot god, the court), Ligotti, Blackwood, Control's Board and
Former, Dishonored's Void and Outsider, Bloodborne's Great Ones and
insight, planes in Planescape/Warhammer's Warp. Deliverable:
`.claude/lore/eldritch.md`: tiers 1–3, what each can perceive (tier 1
and 2 never know tier 3), why old ones dress (warmth against chaos, the
taste for status, trophies of tier 1), where clothes come from (taken,
found, gifted; tailoring as the mark of high society), how tier 3 acts
("something else", never direct). Add a `.claude/MAP.md` pointer.
Must carry the owner's Phase 2 lore (see **Decisions** D9–D11): tier 2
is the bridge, tier 1 lies under the sea the elements make, tier 3 was
born first, the soul kind (Rex, the mainland) reaches up with tier 3's
potential in it, nothing born of the womb is eldritch.
Notes: done 2026-09-25. Digest (Lovecraft, Ligotti, Blackwood, Roadside
Picnic, Control, Dishonored, Bloodborne, Planescape, the Warp, Flatland,
Star Maker, Blindsight, antimemetics, Victorian rag trade, perquisites,
mourning, Veblen) in `research/03-lore.md`. Bible in
`.claude/lore/eldritch.md`: the record is tier 1 and blind; tier 3 born
first at the breaking; blindness by scale, forgetting and cost; the
indirect chain; every old one is the only one of its kind; three reasons
to dress; the road of a coat; the headless gentleman. Three open
questions at its end (who tailors, west-goers, the site's "Outsiders").

### 4 · Baseline frames and the eldritch palette
Capture `snap.py` "before" for the whole cutscene and `gframes.py`
sheets for `break`–`fight`, `deep`, `slip` (kept outside the repo; name
the run in Carry forward). Research: Victorian winter fabric colours
(wool, tweed, astrakhan, sealskin, mourning black, bottle green,
oxblood), Dishonored's palette. Deliverable: named palette tokens for
cloth, leather, fur, metal and tier-3 shadow, in a small data module or
in `genesis-paint.js` (spec decides), each tested against the chaos
background for contrast.
Notes: done 2026-09-25. Research (Victorian outerwear and winter colours,
furs, mourning dyes, jewellery metals, Dishonored and Control art
direction) in `research/04-palette.md`. `js/genesis/genesis-eldpal.js`
(`GenEldPal`): 21 tokens with derived mid/shade, four tier-3 steps and
`under`; `report()` gates contrast, `swatchSheet()` draws the review
sheet. Baselines: snap run `eldritch-base`, frames
`snapshots/frames/eldritch-base/`.

### 5 · Wardrobe casting sheet
Research: Late Victorian / Gilded Age men's and women's winter dress
(top hats, stovepipes, opera hats, bowlers, Inverness capes, Chesterfield
and Ulster overcoats, frock coats, spats, galoshes, muffs, mufflers,
monocles, canes, pocket watches, astrakhan collars, fur hats). For each
of the 24 old ones: what it wears (or nothing), where it came from
(taken / found / gifted / tailored), how it fits wrong, the
exaggeration (height, width, size). Target mix: 1 tailored full suit,
1 found full suit (D1), most one piece, several none. Intelligence
decides dress: the dumb ones wear nothing or wear it wrong. Deliverable:
a table in `research/05-wardrobe.md`, shown to the owner in the report.
Notes:

### 6 · Silhouettes: proportion pass
Research: Dishonored character exaggeration, shape language, how to read
at 0.05 H. Push the silhouettes of the roster (height, hunch, limb
length) so each reads at a glance and the clothes have something to hang
on; keep every kind recognisably itself. Code in `genesis-oldones.js` /
`genesis-oldkin.js` only.
Notes:

### 7 · Attire kit
A new painter file (e.g. `genesis-attire.js`, loaded after
`genesis-oldkin.js`): hat, coat, trousers, boots, glove, scarf, cane,
monocle, watch painters, each parameterised by size, squash and fit
(`tailored` vs `found`), lit from the left with flat shade, cached where
static. A `jscheck.py --shot` sheet of every piece at three sizes is
the verification. No roster changes yet. MAP row.
Notes:

### 8 · The tailored one
Research: bespoke Gilded Age evening and winter dress, Savile Row cut,
the Outsider's and Dishonored aristocrats' bearing, headless-figure
illustration. A new kind that replaces the colossus (D2): tall, thin,
super elegant, no skin showing, no head, a very tall hat where the head
would be; fur-collared greatcoat, gloves, cane, tailored boots. Walks
east. It should be the most striking figure of `trade`–`womb`.
Notes:

### 9 · The second suit
A full suit that was never its own: sleeves too short, trousers
cinched, a hat that does not sit. Research: second-hand clothing trade,
mudlarks, pawnshops, dead men's clothes in Victorian London.
Notes:

### 10–12 · Wardrobe batches
(12 dropped by D14: the west-goers never meet the soul kind and never
dress. They keep only Phase 6's proportion pass.)
One phase per batch from the casting sheet (east A, east B, west). Each
starts by researching the specific garments in its batch. One or two
pieces per being, exaggerated; several stay bare.
Notes 10:
Notes 11:
Notes 12:

### 13 · Winter against the chaos
Research: how cloth moves in wind, Dishonored's weather, Control's
floating papers. Coat tails, scarves and hat brims react to the chaos
and to `GenElem` wind/rage; frost or ash settling on shoulders and
brims (flat shapes). Keep it cheap.
Notes:

### 14 · Acting
Research: Control's Hiss (floating, twitching, chanting), Dishonored's
aristocrats, uncanny mime. The intelligent ones behave: tip a hat,
straighten a coat, hold a cane, keep a gait "like a gentleman" that is
wrong in some way; kneeling at `womb` done with manners; stutter or
repeat frames for the uncanny. Beats `trade`–`fight`.
Notes:

### 15 · Tier 3: concept and choreography
Research: colossal scale in art and games (Shadow of the Colossus,
Beksiński, Moebius, Bloodborne's Amygdala on buildings, Dishonored's
Void, Control's Board and the Astral Plane, Annihilation, Blame!), how
to sell scale with silhouettes, haze layers and slow motion.
Deliverable: a doc (`research/15-tier3.md`) with 2–4 tier-3 beings (a
shape each, never fully seen, never lit, no eyes that read as marks),
where in the top band they sit per beat, what each is "doing" (watching,
working, sleeping, passing), and the causal chain for each action
(tier-3 act → a tier-2 disturbance → a tier-1 consequence). The old ones
never look up at them; no caption names them. Owner approves in the
report before Phase 16.
Notes:

### 16 · Tier 3: the sky layer
New file (e.g. `genesis-tier3.js`) drawn right after `fillBg`,
screen-fixed with slight parallax, oversized for the zoom. Huge dark
shapes a hair above the background value, cut by haze bands; alpha by
beat. Cached. Snap every beat before and after.
Notes:

### 17 · Tier 3: acting across the beats
Motion from the Phase 15 script: slow, huge, rare. Timing is D4: the
first thing born, plainest in `point`/`drawn`, then a rare sighting
behind everything, mostly in the void beats, sometimes a corner; never
even half seen.
Notes:

### 18 · The indirect chain
Wire each tier-3 act into existing systems, never a beam or a touch:
chaos layers surge, `GenElem.rage`, `GenMatter` storms, old ones
stumbling or clutching their hats, the far lights going out. Tier-1
consequences only through shared systems (no mainland art changes).
Research: butterfly-effect storytelling, Control's Altered World Events.
Notes:

### 19 · Tier 2: life on the bridge
Re-scoped in Phase 2: tier 2 *is* the bridge (`drawSpan` in
`genesis-void.js`). Research: megastructure scale (BLAME!, Kowloon Walled
City, Anor Londo, Dishonored's Void islands, cliff-nesting birds,
barnacles and coral on piers). Show the bridge's size (its thickness
spans galaxies) through what lives on it: nests on the piers, eldritch
cities grown round the span, tiny against it. `drawChaos` may lose its
blobs if they fight this.
Notes:

### 20 · The emergence
Research: birth/emergence scenes, clay and stone surfacing. The climb
out of the mass in `trade` gets drama: hats and coats come out of the
mass with them (found in there?), the tailored one emerges last or
first with ceremony.
Notes:

### 21 · The elements split: the sea, the bridge, the air
Replaces the brothers (D5: out, born of the womb). The owner's idea
(D10): the `elements` particles (`genesis-elements.js`) are the first,
smallest old ones. A third sink and pool at the bottom into a sea (not
water); under it is tier 1. A third settle on the bridge. A third rise
into the air. The mainland and Rex stand above the sea. Research: sea
of souls / sea of bodies imagery, particle settling, sediment. Check
`drawResidue` and the mainland beats: the sea must not touch
`genesis-mainland.js` art (a layer under it).
Notes:

### 22 · Captions (D6)
Dropped: the owner keeps every caption as it is.
Notes:

### 23 · Performance
Measure the cutscene's frame time before and after the whole pass
(headless, per beat); cache anything static, merge paths, cut what does
not read. Target: no slower than the Phase 4 baseline by more than a
margin agreed in the report.
Notes:

### 24 · Full review
Full `gframes` sheets of every eldritch beat, reduced motion check, full
`snap.py compare` against Phase 4, `art-style.md` read-through (the
Eldritch section matches what shipped), MAP rows, list of loose ends.
Notes:

### 25 · The inspired ones: story, new beats, owner talk
Runs right after Phase 3: it decides *when* clothes exist, which every
wardrobe phase needs. Research: Lem's "Non Serviam" (beings raised
inside a simulation), Egan's Permutation City and Diaspora, the
simulation argument, Plato's myth of Er (souls choosing lives, Lethe),
samsara and rebirth, the Kabbalist shattering of vessels and gathering
of sparks, the gnostic demiurge, Borges; how films and games stage a
"world inside a thing" in flat 2D. Deliverables: a beat plan (where the
new beats sit, ids, durations, what each shows in flat art, what the old
ones do in each), the before/after of the east-goers' bodies at `womb`,
how the worlds inside look without magic, the leaving; draft captions
for the new beats in the record's voice; the lore bible updated. Ends
with questions to the owner (captions: D6 kept every line, new beats
need new ones; how many beats; whether the old ones stay at `birth` or
are already gone). Constraint change: phases 26–29 may touch
`genesis-flesh.js` (souls, the body) and `G.BEATS` for these beats only.
Notes: done 2026-09-25. Research (42 sources: Lem, Egan, Er and the
Fates, Luria, the demiurge, Borges, Stapledon, Chiang, Dark City,
orreries, Jacquard, ships in bottles, the Quays, Kentridge, Gris,
Journey) in `research/25-inspired.md`. Design in
`.claude/plans/genesis-eldritch-beats.md`: five beats after `womb`
(`dress`, `worlds`, `remake`, `lives`, `leave`, ~38 s), camera into the
body, the works drawn as crank-and-card machinery, Rex and Obrokxus as
the two souls who remember first, draft captions in a "we" voice,
questions Q1–Q7 for the owner.

### 25a · The owner's answers
No research, no code. Read `.claude/plans/genesis-eldritch-beats.md`
(the design; the owner has not read it, so each question's text must
stand alone). Ask through `AskUserQuestion` in two calls:

- Call 1 (4 questions): **Q1** story tie ("Rex and Obrokxus are the two
  souls who remembered first": Yes (Recommended) / No, other souls).
  **Q2** beat count (Five, ~38 s (Recommended) / Three, ~23 s: `dress`
  folded into `womb`, `worlds`, one `lives` with the leaving at its
  tail). **Q3** numbering (Renumber later tags XI→XVI… (Recommended) /
  Sub-numbers X·i…X·v). **Q4** after the leaving (Gone before `birth`
  (Recommended) / Leave after `fight`, watching at 55 % as today).
- Call 2 (3 questions): **Q5** headless gentleman (Walks in at `dress`
  already tailored (Recommended) / Bare among the east-goers from the
  emergence, tailored at `dress`). **Q6** first clothes (Copied from the
  lives in the first, cold world, arriving across `worlds` and `lives`
  (Recommended) / Arrive whole at `dress`). **Q7** captions: one
  question, `multiSelect: true`, options = "Keep all five as drafted"
  plus the beats whose caption should be rewritten (put the five
  drafts in `preview`s; at most 4 options, so group XIV and XV).

Then: record the answers as D17+ in **Decisions**; update the beats
doc (drop "proposal", apply every answer, rewrite any caption the
owner flagged and confirm the new wording in one more
`AskUserQuestion` if needed); update the lore bible's proposed lines
and open questions; adjust phases 26–29 and Phase 5's two-states note
(Q6 decides whether `dress` carries garments); commit, report.
Notes: done 2026-09-25. D17–D24. The owner took the recommendation on
Q1–Q3; changed Q4 (a few powerful carers stay and watch, D20), Q5 (the
gentleman is bare from the emergence, D21, and every east-goer gets a
second, evolved asset, D22) and Q6 (they make their own clothes at
`dress`, winter because the void is cold, D23); captions are
placeholders for the whole plan (D24). Beats doc and lore bible updated.

### 26 · The inspiration (`dress`, XI)
After time with the womb the east-goers change, one at a time: each bare
asset snaps to its evolved asset (D22: inspired body and its own
clothes, drawn separately), and the old ones are seen making their first
clothes themselves (D23). The headless gentleman is among them (D21).
Before `dress` every old one is bare. Needs Phases 5–11's evolved assets;
this phase builds the beat and the stepwise snap between the two assets
(per "stillness is the uncanny"). Design in the beats doc.
Notes:

### 27 · The worlds inside (`worlds`, XII)
The old ones build simulated universes inside the Primordisentia, with
no magic: made, not conjured. Design in the beats doc.
Notes:

### 28 · The remaking (`remake` XIII, `lives` XIV)
The souls, which devour each other, are forced apart; the old ones take
pieces and remake souls, and send them through life after life until
two (Rex and Obrokxus, D17) rediscover magic, the soul kind's power.
Design in the beats doc.
Notes:

### 29 · The leaving (`leave`, XV)
Once the cycle runs, most old ones leave to live their own lives and
rule their own alien civilizations all over the void. A very small,
powerful share stay to care for the soul kind forever (D20, D25:
three tier-2 old ones and two tier-3 beings). Only the three still
watch `birth` and `fight` at 55 %; the two tier-3 carers hold still
over the womb at the top of the frame. This phase stages the split
(which lamps go out, which three stay lit), thins the watch to the
three and adds the two tier-3 edges (built with Phases 16–18's tier-3
painter). Pairs with Phase 19's cities.
Notes:

## Decisions (owner answers, Phase 2, 2026-09-25)

- **D1 · Suits.** Yes: two full suits, one tailored (high society), one
  found (nothing fits).
- **D2 · The tailored one.** Not the colossus (the owner dislikes it): a
  new being replaces it. Tall, thin, super elegant, no skin shows, no
  head; a very tall hat sits where the head would be. East-goer
  (assumed, so the camera keeps it).
- **D3 · Rule changes.** 8: yes as a mid flat band, 9 (patches): no.
  18: yes. 22: only at `break` and `walk`. 11: replaced; eyes are rare
  on old ones, and each that has one has its own. All figure and tier-3
  adds: yes. Tier-2 adds 21 and 23: replaced by D11. Plus: no repeated
  assets anywhere in the roster.
- **D4 · Tier 3 timing.** The first born, the first to appear, in the
  opening beats; fast becoming a rare sight behind everything, mostly at
  the start and in the void beats, sometimes in a corner. Very hard to
  see; never even half of one.
- **D5 · Brothers.** Out: they are born of the womb.
- **D6 · Captions.** No: keep every line. Phase 22 dropped.
- **D7 · The Primordisentia.** Out, and so is everything born of it
  (Rex, Obrokxus, souls, the mainland).
- **D8 · Women's dress.** Yes, any garment on anyone.
- **D9 · Tier 1.** Lies under a sea at the bottom of the frame; the
  mainland and Rex stand above it: the soul kind reaching up, with the
  potential for tier 3 in it.
- **D10 · The sea.** The `elements` particles are the smallest old ones:
  a third sink into the sea, a third settle on the bridge, a third rise
  into the air (Phase 21).
- **D11 · Tier 2 is the bridge.** Its thickness alone spans galaxies;
  its scale shows through what lives on it: nests like birds', cities of
  eldritch beings round it (Phase 19).

Owner answers after Phase 3 (2026-09-25):

- **D12 · Names.** The site's "Outsiders" (`js/depths/lore.js`, the
  Fragmented Minds) became "Old Ones".
- **D13 · Tailors.** There are many tailors on the bridge.
- **D14 · West-goers.** They never dress. Phase 12 dropped.
- **D15 · Who dresses, and why.** Only the east-goers, the ones who met
  the soul kind. While they reshaped the womb they learned from it, were
  inspired, changed their own bodies and began wearing clothes. Before
  `womb`, every old one is bare.
- **D16 · New beats (amends D7).** The cutscene skips what the old ones
  did next. The Primordisentia is infinite souls devouring each other.
  The old ones help it: they build simulated universes inside it, with
  no magic, force the souls apart, take pieces and remake souls, and send
  them through enough lives to rediscover magic, the soul kind's power.
  Once that cycle runs they do not stand watching: they leave, live their
  own lives and rule their own alien civilizations all over the void.
  Phases 25–29. (Amended by D20: a few stay.)

## Decisions (owner answers, Phase 25a, 2026-09-25)

- **D17 · The story tie.** Rex and Obrokxus are the two souls who
  remembered first: the new beats end where `birth` begins.
- **D18 · Five beats.** `dress`, `worlds`, `remake`, `lives`, `leave`
  after `womb`, about 38 s (the cutscene goes from ~225 s to ~264 s).
- **D19 · Numbering.** The new beats are XI–XV; `birth` becomes XVI and
  every later tag shifts by five (to XXXIII).
- **D20 · Who stays (amends D16).** Most old ones are gone before
  `birth`. A very small share stay: the ones who decided to care for the
  soul kind forever, few but among the most powerful. They, and only
  they, still watch `birth` and `fight` (the 55 % watch stays for them).
  Which ones and how many: D25.
- **D21 · The headless gentleman.** Bare from the emergence, among the
  east-goers like the rest. Nobody has clothes until they have spent
  time with the womb; he is tailored at `dress` with everyone else.
- **D22 · Two assets per east-goer.** Each east-goer gets a separately
  drawn evolved asset (the inspired body plus its own clothes), not the
  bare one with clothes laid on: the east-goer roster doubles. The
  change between the two is a stepwise snap.
- **D23 · The first clothes.** Inspired, the old ones start making their
  own clothes, at `dress`. They are winter clothes because the void is
  cold. Not copied from the lives in the worlds.
- **D24 · Captions are placeholders for this whole plan.** The five
  drafts stand; no phase of this plan polishes caption copy. The owner
  will replace the caption text and how captions work after the plan,
  in separate work.
- **D25 · The carers (settles D20).** Five stay: three tier-2 old ones
  and two tier-3 beings of the sky. The three are old ones on the rim
  (Phase 5 picks which, east-goers assumed); they keep their lamps lit
  at `leave` and are the whole 55 % watch at `birth` and `fight`. The
  two tier-3 carers are the first sign that some of tier 3 knows the
  soul kind and cares. They obey every tier-3 rule: never half in
  frame, flat, wrong parallax, only effects reach below. On screen
  their care is a stillness that holds over the womb (two edges at the
  top of the frame that stop drifting while the lights are born, a
  region of far lights kept dark round them), never contact or light.

## Carry forward

- (Phase 4) Baselines: `py -3 tools/snap.py compare eldritch-base <run>`
  (29 `genesis-*` scenes, captured before any eldritch code) and frame
  sheets in `snapshots/frames/eldritch-base/` (break–fight, deep, slip).
  Main checkout only; a worktree session captures its own. After the
  beat insert (Phase 26) every scene after `womb` shifts: re-baseline.
- (Phase 4) Colour every garment, fur, metal and tier-3 shape through
  `GenEldPal.tone(name)` / `TIER3.steps`; a new token goes in `LIT` and
  must pass `GenEldPal.report()` (check command in
  `research/04-palette.md`). Dark cloth (coal, mourning, boot, seal) sits
  at the 1.5:1 floor: it reads by its lit side and outline.
- (Phase 1) The sequel is **Control Resonant** (launched 2026-09-24): an
  alien algorithm rewriting Manhattan, giant heads in the sky. Closest
  outside picture of tier 3 acting only through effects.
- (Phase 1) The beat captions live in the top band, the same band tier 3
  wants: keep tier-3 values within one step of #0d1114 behind text.
- (Phase 1) The `walk` frame ends with the Primordisentia's red field, and
  the brothers are red: the tier-2 corruption hue must be neither (Phase 4).
- (Phase 1) Garment readability ranking (top hat, wide brim, bustle,
  Inverness cape, huge shoes first) is in `research/01-style.md`; Phase 5
  casts from it.
- (Phase 2) The Phase 1 corruption-hue note (neither red nor the
  Primordisentia's field) is moot: rule 21 was not adopted. Phase 4's
  palette covers cloth, leather, fur, metal and the tier-3 steps only.
- (Phase 2) The colossus goes (D2); Phase 5 casts 24 with the headless
  gentleman in its slot, and Phase 6 does not reshape the colossus.
- (Phase 3) The captions are a tier-1 record, blind to tier 3: "first
  born" (`birth`) means first of the womb, "cannot name" (`break`) means
  the chaos. Any new copy speaks from the same blindness.
- (Phase 3) Lore hooks for later phases: a habit of looking up / holding
  still in the silences (Phase 14), relics where tier 3 shifted and an
  old-clothes dealer on the span (Phase 19), dust falling sideways and
  motes turning at once as the chain's first link (Phases 16–18), the
  headless gentleman's warmth is fit, not bulk (Phase 8).
- (after Phase 3) D15 moves every garment to `womb` and later: the
  emergence, the walk, root and swarm show bare bodies. Phase 5 casts
  two states per east-goer (bare, inspired), eight bare west-goers, and
  the headless gentleman as an east-goer whose body appears at `womb`
  (or earlier bare; Phase 25 decides). Phase 13's winter only touches
  the dressed.
- (Phase 25a) Settled: the gentleman is bare from the emergence (D21);
  each east-goer's evolved state is its own drawn asset, not an overlay
  (D22), and appears at `dress`; the clothes are self-made winter
  clothes (D23), so Phase 5's "where it came from" is "made" for every
  first garment (taken / found / gifted / tailored apply to later ones).
  Phase 5 also marks the three tier-2 carers who stay (D25).
- (Phase 25) Rex and Obrokxus are the two souls who remembered first
  (D17), so the new beats end where `birth` begins. Inserting
  beats shifts every later beat's snap scene in time: the first capture
  after the insert is the new baseline for every `genesis-*` scene after
  `womb`. Beat-insert touch list is in the beats doc.
