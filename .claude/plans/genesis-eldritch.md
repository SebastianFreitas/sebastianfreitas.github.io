# Genesis cutscene: the eldritch pass

A many-phase plan. Each phase is one owner prompt ("go"), one session,
one finished and committed result. **Scope: eldritch beings only**:
the old ones, the far realms, and a new tier-3 layer. Souls, the gods,
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
| 3 | Eldritch lore bible (tiers 1–3) | doc | todo |
| 4 | Baseline frames and the eldritch palette | tooling, doc | todo |
| 5 | Wardrobe casting sheet | design doc | todo |
| 6 | Silhouettes: proportion pass on the roster | code | todo |
| 7 | Attire kit (hats, coats, boots, trousers, items) | code | todo |
| 8 | The tailored one (full suit, high society) | code | todo |
| 9 | The second suit (found, nothing fits) | code | todo |
| 10 | Wardrobe batch: the east-goers A | code | todo |
| 11 | Wardrobe batch: the east-goers B | code | todo |
| 12 | Wardrobe batch: the west-goers | code | todo |
| 13 | Winter against the chaos: weather on the cloth | code | todo |
| 14 | Acting: manners, gait and the uncanny | code | todo |
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
Notes:

### 4 · Baseline frames and the eldritch palette
Capture `snap.py` "before" for the whole cutscene and `gframes.py`
sheets for `break`–`fight`, `deep`, `slip` (kept outside the repo; name
the run in Carry forward). Research: Victorian winter fabric colours
(wool, tweed, astrakhan, sealskin, mourning black, bottle green,
oxblood), Dishonored's palette. Deliverable: named palette tokens for
cloth, leather, fur, metal and tier-3 shadow, in a small data module or
in `genesis-paint.js` (spec decides), each tested against the chaos
background for contrast.
Notes:

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

## Carry forward

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
