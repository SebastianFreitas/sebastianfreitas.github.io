# Genesis cutscene: the eldritch pass

A many-phase plan. One owner prompt ("go") runs every `todo` phase in
order, each one finished, verified and committed on its own stacked
branch (`eldritch-NN-<name>` cut from the last), with no owner input until
the plan is done. **Scope: eldritch beings only**:
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
5. **Context (automatic, never ask the owner):** at `CONTEXT WATCH` start no new implementer call: commit, write `.claude/handoff.md`, then keep working; auto-compaction at 50% (100k) summarizes mid-turn and the hook prints the handoff back in. Run phase after phase until the plan is done; stop only for a real question (AskUserQuestion) or a blocker.
6. A phase that turns out too big: finish a coherent half, mark it
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
| 5 | Wardrobe casting sheet | design doc | done 2026-09-25 |
| 6 | Silhouettes: proportion pass on the roster | code | done (branch eldritch-06-silhouettes) |
| 7 | Attire kit (hats, coats, boots, trousers, items) | code | done 5693c1a (branch eldritch-07-attire) |
| 8 | The tailored one (full suit, high society) | code | done ea6475c (branch eldritch-08-tailored) |
| 9 | The second suit (found, nothing fits) | code | done 943380d (branch eldritch-09-found-suit) |
| 10 | Wardrobe batch: the east-goers A | code | done 3ba135d |
| 11 | Wardrobe batch: the east-goers B | code | done 01a5daf |
| 12 | Wardrobe batch: the west-goers (D14: they never dress) | code | dropped |
| 13 | Winter against the chaos: weather on the cloth | code | done d188b2e |
| 14 | Acting: manners, gait and the uncanny | code | done df93bb2 |
| 26 | The inspiration: bodies change and dress at the womb | code | done b13a0ba |
| 27 | The worlds inside: universes built in the flesh | code | done 8ea9982 |
| 28 | The remaking: souls pulled apart, remade, sent through lives | code | done f1e5139 |
| 29 | The leaving: off to their own civilizations | code | done c23a44d |
| 15 | Tier 3: concept and choreography doc | design doc | done 48cf3c3 |
| 16 | Tier 3: the sky layer and the shadows | code | done 606b25b |
| 17 | Tier 3: acting across the beats | code | done b7fb36c |
| 18 | Tier 3 → tier 2 → tier 1: the indirect chain | code | done 4ddc969 |
| 19 | Tier 2: life on the bridge (nests, cities) | code | done 0c481a3 |
| 20 | The emergence: climbing out of the mass | code | done a363003 |
| 21 | The elements split: the sea, the bridge, the air | code | done f29a655 |
| 22 | Captions (D6 said no) | copy | dropped |
| 23 | Performance pass | code | done 52858ea |
| 24 | Full review, reduced motion, rules final | review | done a19dbcc |

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
Notes: done 2026-09-25. Research (overcoats, hats, women's winter
dress, mufflers, accessories, tailoring, the second-hand trade,
Grandville and Gorey's dressed creatures, Dishonored's silhouettes) and
the casting in `research/05-wardrobe.md`: 17 east-goers (gentleman
tailored, slab found, three with two pieces, twelve with one, 27
garment kinds each used once), 7 bare west-goers, carers D26, batches
A/B for Phases 10–11, eye cull for Phase 6.

### 6 · Silhouettes: proportion pass
Research: Dishonored character exaggeration, shape language, how to read
at 0.05 H. Push the silhouettes of the roster (height, hunch, limb
length) so each reads at a glance and the clothes have something to hang
on; keep every kind recognisably itself. Code in `genesis-oldones.js` /
`genesis-oldkin.js` only.
Notes: done; digest and the list of pushes in `research/06-silhouettes.md`.

### 7 · Attire kit
A new painter file (e.g. `genesis-attire.js`, loaded after
`genesis-oldkin.js`): hat, coat, trousers, boots, glove, scarf, cane,
monocle, watch painters, each parameterised by size, squash and fit
(`tailored` vs `found`), lit from the left with flat shade, cached where
static. A `jscheck.py --shot` sheet of every piece at three sizes is
the verification. No roster changes yet. MAP row.
Notes: done 2026-09-26. `js/genesis/genesis-attire.js` (GenAttire), 25
kinds over 10 pieces: hat topper stovepipe bowler gibus deerstalker bonnet
veiled; coat chesterfield frock inverness capelet dolman; trousers
tailored found; boots tailored button spats; glove kid; cane knob crook;
monocle ring; watch albert; scarf muffler comforter ruff. Research digest:
1880s boots had a long, blunt square toe; cloth-top button boots were the
fashion; spats buttoned at the side with an under-foot strap (victorianweb
nunn23). Canes: knob, crook or L handle; gloves kid or chamois, buttoned
at the wrist, fur-lined for winter; the single Albert chain hangs in a U
from pocket to buttonhole (vintagedancer, victorianweb nunn12). Flat
drapery: cloth hangs from tension points under gravity, so draw only the
largest folds (clipstudio, gvaat). Paper-doll layering: draw the outer
layer over a trace of the inner one (collectorsweekly). Weak spots to
push when a phase casts them: the glove reads as a flat bar; the
deerstalker's peaks are thin.

### 8 · The tailored one
Research: bespoke Gilded Age evening and winter dress, Savile Row cut,
the Outsider's and Dishonored aristocrats' bearing, headless-figure
illustration. A new kind that replaces the colossus (D2): tall, thin,
super elegant, no skin showing, no head, a very tall hat where the head
would be; fur-collared greatcoat, gloves, cane, tailored boots. Walks
east. It should be the most striking figure of `trade`–`womb`.
Notes: done 2026-09-26. Research in `research/08-tailored.md` (hat 25–32% H,
a brim gap over the collar and no neck, square shoulders, hem mid-calf,
the four-notch glance test). The colossus painter is gone: `gentleman` in
slot 0 goes east and stands on the deck beside the flesh (the old cling
case). Bare (rough, headless, no skin) in every beat today; the dressed
asset (topper, astrakhan chesterfield narrowed to 0.74 in x, trousers,
tailored boots, kid glove, knob cane, albert watch) waits for `dress`.
Snap p7→p8: only fight, land, root, swarm, walk and womb change (slot 0).

### 9 · The second suit
A full suit that was never its own: sleeves too short, trousers
cinched, a hat that does not sit. Research: second-hand clothing trade,
mudlarks, pawnshops, dead men's clothes in Victorian London.
Notes: done 2026-09-26. Research in `research/09-found-suit.md` (wedge
10-20% of body width, sleeves long past the wrist, cord cinch, square
patch, three different blacks). The slab is `slab` → `slabBare` (unchanged)
or `slabDressed` (in genesis-oldkin.js): it stands on stub legs; a found frock
drawn as two clipped halves splayed into a V over the body; empty tweed
sleeves with dark cuffs hanging below the block; found trousers too big and
corded; a slate patch; a found gibus half-sprung, pierced by the middle
spike. Bare in every beat until `dress`: snap p8→p9 29/29 same.

### 10–12 · Wardrobe batches
(12 dropped by D14: the west-goers never meet the soul kind and never
dress. They keep only Phase 6's proportion pass.)
One phase per batch from the casting sheet (east A, east B). Each
starts by researching the specific garments in its batch. Per D28 every
east-goer's `<kind>Dressed` is a whole new asset: a transformed body
drawn from scratch, wearing one or two exaggerated pieces, sharing no
drawing with `<kind>Bare` (the bare body stays untouched so the pre-womb
snaps stay the same). Nobody wears anything before `dress`.
Notes 10: done 2026-09-26. Research in `research/10-batch-a.md`. Per D28
every Dressed painter is a new body drawn from scratch: the eye is an
upright almond with a heavy lid, a slit and three tendrils, wearing a
monocle chained to the middle one; the mass is a pear column with a round
head, in a muffler whose tails drag; the tower is a column on splayed feet
with a head knob, in a stovepipe (lift 0, rear tilt) and an astrakhan ruff;
the bundle is a round core on stubs with a three-lobe crown, holding a
sable muff; the comb is a bowed spine on six legs, in spats and a capelet
slid rearward; the chime is a bell with a ringed head, in earmuffs and a
striped comforter; the mound is a hunched hood under a dolman with a
sealskin hem and a train. Sheets: scratchpad batchA-ones/kin1/kin2/kin3.
Snap p10 = p9 (nobody dresses before `dress`). Open: the mound's eye hole
sits on the hood edge; the chime's GA const is unused.
Notes 11: done 2026-09-26. Research in `research/11-batch-b.md`. Per D28
each is a new body at `dress`: the swarmling a mast with a speck bell
under a navy gamp; the prism an obelisk in a veiled hat with a plum plume;
the bloom a short slug whose front bulb rises on a swan-neck stalk, in a
poke bonnet too big for it, oxblood ties short of the deck; the veil an
upright rippling sheet under a tipped tweed Inverness; the blinker a
stretched kite on a foot with a found bowler a beat late; the roller a
stopped star, one point a peg leg in a huge button boot, hopping in steps;
the needle pitched onto its rear barb, the beak through a deerstalker; the
knot a wheel stepping in slots under a halo, caged by crinolette hoops.
Sheets: scratchpad batchB-ones/kin1/kin2/kin3. Snap p11 = p10. Open: the
knot's cage hoops are faint thin strokes; the prism's veil is dark.
Notes 12:

### 13 · Winter against the chaos
Research: how cloth moves in wind, Dishonored's weather, Control's
floating papers. Coat tails, scarves and hat brims react to the chaos
and to `GenElem` wind/rage; frost or ash settling on shoulders and
brims (flat shapes). Keep it cheap.
Notes: done 2026-09-26. Research in `research/13-winter.md`. One wind per
frame: `GenOld.windAt(t)` at the top of `drawOldOnes` writes
`GenAttire.weather {w, g, t, frost}` (w about -0.35 to -1, blowing west
from the chaos, a gust every 7.3 s) and resets it after, so nothing else
that uses GenAttire feels it. `GenAttire.draw` shears each piece about its
anchor (scarf 0.34, coat 0.16, trousers 0.04, ruff 0.05) with a flutter
(scarf 1.6 Hz, coat 0.9 Hz), tips hats by w*0.07, outside the cache key;
`snow` defaults to `weather.frost >= 0.5` (the key carries the bit). The
hand-drawn tails (mass muffler, bloom ties, chime comforter, mound train)
read the same w. `frostNow()` is `G.since("dress")`, 0 until the `dress`
beat exists. Sheets: scratchpad wind-attire.png, wind-ones.png. Snap p13 =
p11 (nobody dresses yet).

### 14 · Acting
Research: Control's Hiss (floating, twitching, chanting), Dishonored's
aristocrats, uncanny mime. The intelligent ones behave: tip a hat,
straighten a coat, hold a cane, keep a gait "like a gentleman" that is
wrong in some way; kneeling at `womb` done with manners; stutter or
repeat frames for the uncanny. Beats `trade`–`fight`.
Notes: all in `place()` (genesis-oldones.js), east-goers only, seeded per
one (`hash1a`, `sd = idx+1`). The legs stutter: the phase holds for 0.18 s
every 3.2-5.6 s while x keeps gliding (`o._ph`). The gentleman's gait is
quantized to π/6 steps, a mime walk. The womb kneel comes in three held
poses with a bow (`p.rot` -0.12 sin), and a rare 0.08 s twitch (every
6-9 s). `p.gest` is a 0.4 s hat-tip pulse that fires only when dressed;
no painter reads it yet. Snap p14 vs p13: womb 0.68% as intended, the
rest within 0.5%. Research: research/14-acting.md.

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
Notes: research/15-tier3.md. Four beings: the Brim (a vast shallow arc,
the first born, plainest in `point`/`drawn` and the void beats), the Comb
(straight parallel tines that pass in `matter`/`walk`/`flee`, once still in
`worlds`), and the two carers, the Lintel (a straight, near-level edge) and
the Arc (a quarter of a huge circle), which come in during `leave`, hold still
through `birth`/`fight` with a far-light pocket, and fade at `land`. There is a
beat-by-beat pose table and seven causal chains for Phase 18. Painter API for 16:
`GenTier3`, a screen-fixed `POSE[beat]`, and `pocket(x, y)`. The owner's approval
was assumed under the standing "run the plan" order (flagged in the report).

### 16 · Tier 3: the sky layer
New file (e.g. `genesis-tier3.js`) drawn right after `fillBg`,
screen-fixed with slight parallax, oversized for the zoom. Huge dark
shapes a hair above the background value, cut by haze bands; alpha by
beat. Cached. Snap every beat before and after.
Notes: `js/genesis/genesis-tier3.js` (`window.GenTier3`: `draw`, `pocket`,
`POSE`), drawn right after `fillBg` in genesis.js; far lights and motes in
genesis-void.js skip `pocket(x, y)`. Screen-fixed: it undoes the zoom about the
centre and the shake, parallax 0.03*cam*W clamped to 5 % W. Fill is
`TIER3.steps[0]`, with the pose's step only outside the caption box (so t1
behind text), plus three BG haze bands at 45 %. Paths are cached per beat, W, H.
Poses are static per beat (the brim chord, the corner slivers, the comb, the
lintel and the arc); `t0` gates a late entry. Snap p29->p16: 26/34 within
0.5 %; point, leave, land and flee differ as meant. Beats whose foreground is
opaque over the top (deep, slip, gods) read `same`: 17 checks they show.

### 17 · Tier 3: acting across the beats
Motion from the Phase 15 script: slow, huge, rare. Timing is D4: the
first thing born, plainest in `point`/`drawn`, then a rare sighting
behind everything, mostly in the void beats, sometimes a corner; never
even half seen.
Notes: motion lives in `POSE[beat][being].mv`, read by `motion(p, W, H)` in
`genesis-tier3.js`; paths stay cached, each being is drawn translated (and the
lintel levelled) with the caption clip held screen-fixed. Every change snaps on
a 0.5 s held step or once at a set time: `drift` 1 px per step against the pan
(point, drawn, elements, matter, land, gods, flee), `lurch` 3 % W sideways once
(break at 2 s, fall at 3 s; sideways because down would break the 26 % H rule),
`enter` in three steps from off the edge (matter comb, the two carers in
`leave` at 0.6/2.7/4.8 s), `fade` in thirds (trade brim, land lintel and arc,
which leave the womb as the soul kind lands), `pass` across the frame (walk
comb west to east, flee comb east to west), `level` (the fight lintel squares
up at 4 s). Reduced motion ignores `mv`. `deep` and `slip` lost their poses:
they happen inside Rex, whose opaque interior covers the sky, so `flee` is the
void beat's plain sighting. `GenTier3.offset(k)` exposes the current offset
for Phase 18. Snap p16->p17: 32/34 within 0.5 %; deep (pose dropped) and leave (carers not yet in at the frozen clock) differ as meant.

### 18 · The indirect chain
Wire each tier-3 act into existing systems, never a beam or a touch:
chaos layers surge, `GenElem.rage`, `GenMatter` storms, old ones
stumbling or clutching their hats, the far lights going out. Tier-1
consequences only through shared systems (no mainland art changes).
Research: butterfly-effect storytelling, Control's Altered World Events.
Notes: four chains from `research/15-tier3.md`, each keyed to a Phase 17
act, each a change in a system that already exists (no new art, no line from
sky to ground). Break: when the brim lurches at 2 s (`GenTier3.offset("brim")`
has dx), chaos `amt` gets +0.14 for that one held step and the shards fly
15 % wider (`GenOld.drawShards(ctx, burst, kick)`). Walk: `GenTier3.tines("comb")`
returns each tine's screen x; an old one standing under a tine stumbles
(tilt plus a dip) for as long as the comb holds that step. Matter: one extra
`GenElem` rage event under the comb as it enters at the left (s 16.9 = matter
4 s) and one extra `GenMatter` storm under the right-hand sliver at 5 s,
both appended after seeding so the seeded ones stay the same. Flee: far lights
inside a third-of-screen band go dark, and the band moves east to west in held
2.5 s steps behind the comb. Reduced motion: no stumble, surge or kick; the
lights-out band holds still. Skipped: worlds slip (the works rings are fixed
shapes), the souls' course and the war front (no shared system to bend), and
fall debris (no debris system exists; the saga strike beams are god art).
Snap p17->p18: 34/34 same (effects fall off the frozen snapshot times).

### 19 · Tier 2: life on the bridge
Re-scoped in Phase 2: tier 2 *is* the bridge (`drawSpan` in
`genesis-void.js`). Research: megastructure scale (BLAME!, Kowloon Walled
City, Anor Londo, Dishonored's Void islands, cliff-nesting birds,
barnacles and coral on piers). Show the bridge's size (its thickness
spans galaxies) through what lives on it: nests on the piers, eldritch
cities grown round the span, tiny against it. `drawChaos` may lose its
blobs if they fight this.
Notes: all in `drawSpan`'s offscreen canvas (fog mask, end fades for free),
anchored to world bays, reasons in `research/19-bridge-life.md`. Deck cities:
clusters of 5-12 leaning towers (0.004-0.02 H, some with spires) on 55 % of
bays; hanging cities: 4-9 inverted pointed towers down to 0.036 H under the
slab on 45 %; both appear during `trade`, each bay whole at its own hashed
second (`G.secs(id) >= hash * beatDur * 0.8`). Nests during `walk` on 70 % of
piers: a twig bowl on the knee top and one or two swallow clumps under the
slab by the leg, each with its entrance hole cut through. The only light is
1 px dim gold windows. No time animation, so reduced motion is unchanged.
`drawChaos` blobs kept: they sit behind the span and do not fight it.

### 20 · The emergence
Research: birth/emergence scenes, clay and stone surfacing. The climb
out of the mass in `trade` gets drama: hats and coats come out of the
mass with them (found in there?), the tailored one emerges last or
first with ceremony.
Notes: reasons in `research/20-emergence.md`. D28 wins over "hats and coats
come out with them": everyone climbs out bare. The climb is stepped: 3-5 held
steps per being (hashed, the gentleman 6), full size and alpha from the first
step, the body clipped at the rim (`p.clipY`) so it rises through the lip
instead of growing. Each snap drops three stone flakes (`drawFlakes`, 0.5 s,
time-driven). Ceremony by order: the gentleman surfaces first and alone at
0.4 s over 2.4 s with a wider push in the mass; the rest follow from 2.6 s,
0.2 s apart, in the old shuffled order. Only `genesis-trade` changes in snap.

### 21 · The elements split: the sea, the bridge, the air
Replaces the brothers (D5: out, born of the womb). The owner's idea
(D10): the `elements` particles (`genesis-elements.js`) are the first,
smallest old ones. A third sink and pool at the bottom into a sea (not
water); under it is tier 1. A third settle on the bridge. A third rise
into the air. The mainland and Rex stand above the sea. Research: sea
of souls / sea of bodies imagery, particle settling, sediment. Check
`drawResidue` and the mainland beats: the sea must not touch
`genesis-mainland.js` art (a layer under it).
Notes: reasons in `research/21-elements-split.md`. Every particle alive at
its own hashed split time (local 9.5-12.5 s) freezes, holds 0.25-0.6 s, then
snaps in 3-5 held steps (no easing) to its fate, a third each by hash: sink
to the sea, settle on the rail top (only over the span, else it sinks), rise
out of the top. Frozen poses are recomputed from time (`posAt`), so it stays
a pure function of time and pans with the camera. Sinkers and settlers end as
1-2 px dim desaturated grains; sinker grains fade into the sea, settler grains
stay to the end. `drawSea` (drawn right after `drawSpan`, under the mainland)
is 4 flat strata of 4 px world-anchored hashed columns, level rising with
`seaK(s)` to 0.12 H (the bottom ~55 px sit under the cutscene bar), dim. Reduced motion jumps to the end state.

### 22 · Captions (D6)
Dropped: the owner keeps every caption as it is.
Notes:

### 23 · Performance
Measure the cutscene's frame time before and after the whole pass
(headless, per beat); cache anything static, merge paths, cut what does
not read. Target: no slower than the Phase 4 baseline by more than a
margin agreed in the report.
Notes: measured headless (software raster, 1440x900, `Genesis.draw` on an
offscreen canvas, best of 3 x 40 frames per beat) against a Phase 4 checkout
(83b1eb6). Before this pass the eldritch work cost 0-7% over Phase 4 (worst
`walk` +1.05 ms); the ~13 ms floor on every beat was `drawSpan`'s
full-screen offscreen composite (CDP profile: 85-96% of the time in its
`drawImage`/`restore`, all JS under 1%), which predates Phase 4. Fix, pixel
identical (snap compare 61/61, no drawn scene changed): `drawSpan` clears,
masks and blits only a device-pixel box around the span (x0-3..x1+3, from
0.06 H above the deck down); the fog mask is `destination-out` with inverted
alphas filled only in that box (`destination-in` clears everything outside
its rect, so it had to cover the whole canvas). Result: every beat
7.8-9.5 ms/frame faster, e.g. drawn 12.9 -> 4.0, walk 15.2 -> 6.2,
fifth 21.2 -> 12.2. Agreed margin: within 10% of Phase 4; now 40-70% under it.

### 24 · Full review
Full `gframes` sheets of every eldritch beat, reduced motion check, full
`snap.py compare` against Phase 4, `art-style.md` read-through (the
Eldritch section matches what shipped), MAP rows, list of loose ends.
Notes: `gframes p24` wrote all 34 beat sheets. Reduced motion
(`prefers-reduced-motion: reduce`, `Gen.reduced` true): every beat opened at
70% of its length, 0 console or page errors, poses hold still. `snap.py
compare p4base p24` (Phase 4 checkout 83b1eb6): every bridge and page scene
same; the genesis diffs are the intended eldritch work (birth, break, drawn,
eternity, fight, flee, land, matter, point, root, swarm, trade, walk, womb);
dress, leave, lives, remake and worlds are new beats with no Phase 4 scene.
`art-style.md` Eldritch section brought in line with what shipped: the
element split (freeze, hold, stepped snap; off-span sinks), brothers never
dress and reuse old-one bodies (no-repeat covers the 24 rim old ones),
per-east-goer making then snap with the gentleman last, tier 3 as a sliver
in 29 of 34 beats, motion only in held steps, the Lintel/Arc timeline,
the cold rift light marked planned, not shipped, plus an "Also shipped"
list. MAP: `genesis-eldpal` and `genesis-attire` descriptions no longer say
unused. Loose ends: the comment above `dressNow` in genesis-oldones.js
still says there is no dress beat; genesis-attire.js keeps a hardcoded grey
`FALL` fallback outside `GenEldPal`; the cold rift light (break, walk) was
never built.

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
asset snaps to its evolved asset (D22, D28: a complete new body and its
own clothes, a transformation; tier 3 never changes), and the old ones are seen making their first
clothes themselves (D23). The headless gentleman is among them (D21).
Before `dress` every old one is bare. Needs Phases 5–11's evolved assets;
this phase builds the beat and the stepwise snap between the two assets
(per "stillness is the uncanny"). Design in the beats doc.
Notes: new beat `dress` (7.0 s, "XI · Borrowed shape") after `womb`; birth..eternity
renumbered XII..XXIX (they shift again as 27-29 add beats). `place()` sets
`o.dressed` each frame from `dressT(o)` = `G.secs("dress") - dressAt(o)`: east
non-brothers only, spaced evenly 0.4-6.2 s, the gentleman last, so the 22 painter
call sites needed no edit. Before its snap each one makes cloth in three held
steps (`p.make`: pull taut, cut, wrap; `drawMaking` holds a flat tweed strip
above the bare body, never on it, D28). ±0.35 s hold at the snap (no twitch,
stutter phase frozen, no gest). No flash. The gentleman tips his topper on
`p.gest`. Snap p26 vs p14: birth/fight/land 1.2% (dressed + frost, intended),
new scene `genesis-dress`, the rest within 0.5%. Research: research/26-dress.md.

### 27 · The worlds inside (`worlds`, XII)
The old ones build simulated universes inside the Primordisentia, with
no magic: made, not conjured. Design in the beats doc.
Notes: new beat `worlds` (8.5 s per the beats doc, "XII · The made worlds",
line from the beats doc :155) after `dress`; birth..eternity now XIII..XXX.
New js/genesis/genesis-works.js, drawn after the souls under the flesh clip:
a lens cut on the flesh's left face opens in three held steps, flaps folded
back; a punched-card chain clicks down; ten flat grey orreries are built one
by one (outline, core, ring turning in π/8 clicks, satellite); world 6 holds
the only star (flat halo, it is a light source). The lens closes in three
steps over the last 1.2 s, so birth onward is untouched. No camera move (the
beats doc's 0.72 W / 1.25 zoom is left for phase 23). Snap p27 vs p26: all
same, new scene `genesis-worlds`. Research: research/27-worlds.md.

### 28 · The remaking (`remake` XIII, `lives` XIV)
The souls, which devour each other, are forced apart; the old ones take
pieces and remake souls, and send them through life after life until
two (Rex and Obrokxus, D17) rediscover magic, the soul kind's power.
Design in the beats doc.
Notes: two beats after `worlds`: `remake` XIII (7.5 s) and `lives` XIV
(9.0 s); later tags shift by two (33 beats). New painter
js/genesis/genesis-remake.js (`GenRemake.draw`, hooked after `GenWorks`;
`soulMul()` dims the original souls to 0.35 in both beats and is exactly
1 elsewhere). `remake`: clotted souls pulled apart by tongs, threads snap
and stay as waste, a kept piece rebuilt on a counter in held stages.
`lives`: a loop from the counter through three flat world discs; six
sparks snap round in 12 held steps, the loop time falls from 2.4 to 0.8 s,
a dark forgetting band (#12040a) on the return leg pales them and adds
one-px rings; spin, rod and shears act on world 0's leg. From 6.5 s two
stop: Rex (flat rex orb with a small glow, it gives light) and Obrokxus
(dark disc, red core, no glow). Snap p28 vs p27: all same, new scenes
`genesis-remake` and `genesis-lives`. Research: research/28-remake.md.

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
Notes: one new beat after `lives`: `leave` XV (6.5 s, "The hands");
later tags shift by one (34 beats), ZOOM 1.00. In genesis-oldones.js
every rim old one except the carers (`CARERS`: eye, chime, mound) and the
brothers goes out left to right by screen x between 0.6 and 4.8 s: half,
then gone 0.25 s later, and gone in every later beat. Each leaves a pin
of its `o.hue` (`drawPin`, `p.pinU` in 8 held steps over 1.4 s) that runs
0.08 W along the rim, then 0.6 H out into the void. The two tier-3 carer
edges are not built (no tier-3 painter yet): carried forward to Phases
16-18. Snap p29 vs p28: same through `lives`, new scene `genesis-leave`,
`birth`, `fight` and `land` differ (0.6-0.8 %) only where the departed
old ones stood.
Research: research/29-leave.md.

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

Owner answers in Phase 5 (2026-09-25):

- **D26 · The carers.** The three tier-2 carers are the mound, the eye
  and the chime. The headless gentleman leaves at `leave` to rule.
- **D27 · The found suit.** The slab wears it (wide and short, the
  opposite of the gentleman).

Owner, 2026-09-26:

- **D28 · Clothes are a transformation (sharpens D21–D23).** Nobody has
  clothes before the womb. The moment a being gets clothes is the moment
  it turns into something else: every dressed old one is a complete new
  asset, a new body drawn from scratch with its clothes (new silhouette,
  stance and proportions), never the bare body with garments laid on
  or a `<kind>Bare` call underneath. Only tier 3 (Phases 15–18, the
  sky beings, the two tier-3 carers included) never transforms and
  never dresses. West-goers never dress either (D14).

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
- (Phase 5) The roster is 17 east-goers (the gentleman takes the
  colossus's slot and goes east) and 7 west-goers; the colossus's cling
  branch in `genesis-oldones.js` is dead code (side -1). 15 of 24 carry
  an `eyeDot` against the "eyes are rare" rule: Phase 6 keeps six (list
  in `research/05-wardrobe.md`). Phases 8–11 and 26 draw from the
  casting table there; no garment kind repeats.
- (Phase 6) Obrokxus's brothers reuse eight roster painters through
  `makeOne`; it sets `o.bro` and `pu(o, old, now)` in `genesis-oldones.js`
  keeps their pre-pass proportions and eyes. Any later change to crawler,
  winged, blinker, roller, mass, slider, strider or floater goes through
  `pu` too, or the `deep` / `slip` scenes change. Six eyes remain, each its
  own shape (eye, mound, tower slit, strider slit, bundle ring, husk dot).
- (Phase 7) `GenAttire.draw(ctx, piece, x, y, s, opt)`: (x,y) is the
  piece's anchor (hat: brim centre; coat, scarf: neck centre; trousers:
  waist; boots: heel on the sole line, toe toward +x; glove: wrist, fingers
  +x; cane: tip on the ground; monocle: lens centre; watch: the fob, chain
  running +x), s = px per unit,
  opt {kind, fit "tailored"|"found", tone, sq, dir ±1, seed, rot, lift,
  snow, cache, len/lean/sag/hem/fur...}. Found hats perch tipped and lifted
  by seed. The cache key is stored on `opt._ak`, so treat an opt object as
  immutable (make a new one to change it) or pass `cache:false`. Sheets:
  `py -3 tools/jscheck.py js/lib/util.js js/genesis/genesis-paint.js
  js/genesis/genesis-eldpal.js js/genesis/genesis-attire.js --eval
  "GenAttire.sheet(ctx,1440,900[,'<piece>'])" --shot out.png`. New kinds
  are one `reg(piece, kind, {tone, box, perch, paint})` each.
- (Phase 8) `GenOld.PAINT.gentleman(ctx,o,x,y,h,p)` picks `gentlemanDressed`
  when `o.dressed ?? dressNow()`; `dressNow()` is true only once a beat
  `dress` exists and `G.since("dress") > 0` (phase 26 adds it). Garment
  opts are made once on `o._att`; the trousers' `sq` is re-merged per frame
  (a new object, so it misses the attire cache: fix it if it shows in the
  profile). The chesterfield has no waist option, so there is no waist
  pinch; the coat is narrowed with a ctx x-scale (`COAT_NARROW`). Review:
  jscheck util, paint, genesis-state, -paint, -eldpal, -flesh, -oldones,
  -attire with `GenOld.PAINT.gentleman(ctx, Object.assign({}, GenOld.ROSTER
  .find(r=>r.kind==='gentleman'), {dressed:true,_att:null}), x, 860, 640,
  {x, y:860, phase, kneel:0, a:1})`. Snap run `p8`.
- (Phase 9) `GenOld.dressNow` is exported; every dressed painter follows the
  slab's pattern: `kind(ctx,o,x,y,h,p)` switches on `o.dressed ?? O.dressNow()`
  between `<kind>Bare` (the old body, untouched, so snaps stay same) and
  `<kind>Dressed` (opts made once on `o._att`). Review a sheet by forcing
  `dressed:true,_att:null` on a copy of the ROSTER entry (the jscheck file
  list of Phase 8 plus genesis-oldkin.js after genesis-oldones.js). Snap run `p9`.
- (Phase 10) D28: `<kind>Dressed` never calls `<kind>Bare`; spec the new
  body first (silhouette, stance, where the eye goes), then the garments.
  jscheck list: eldpal, attire, oldones, oldkin; `P = window.GenOld.PAINT`,
  pass `p` as {x,y,phase,kneel,a,look}. Snap run `p10`.
- (Phase 11) Every east-goer now switches on `dressNow`; the jscheck eval
  that spaces kinds at x=250/600/900/1200 is in Notes-era sheets. Snap run `p11`.
- (Phase 13) Phase 26 adds the `dress` beat: frost then grows over it by
  itself (`frostNow`). To test weather in jscheck, set
  `GenAttire.weather.w/t/frost` before painting and reset w to 0. Snap `p13`.
- (Phase 14) Phase 26 wires `p.gest` into the dressed painters: the
  gentleman tips the topper, straightens the coat and holds the cane on the
  pulse. West-goers get no acting. Snap `p14`.
- (Phase 26) Only the gentleman reads `p.gest` so far (hat tip); the coat
  straighten and cane hold are open for any later polish pass. Dressing order
  is roster order; most east-goers are off-screen at the womb framing, so a
  camera/placement pass (phase 20/23) may want them visible. Snap `p26`.
- (Phase 29) From `leave` on only the carers eye, chime and mound (and the
  brothers) stay on the rim; the two tier-3 carers over the womb (D25) are
  owed by the Phase 16-18 tier-3 painter, held still at the top of the
  frame in `birth` and `fight`. The carers may sit off-screen at the womb
  framing (camera pass, phase 20/23). Snap `p29`.
- (Phase 15) Tier 3 cast and choreography: research/15-tier3.md. Phases 16-18
  build from its tables; the approval gate was assumed, so if the owner rejects a
  being, redo only 16-18. Only t1 goes behind a caption; nothing dips below 26 % H.
- (Phase 16) GenTier3 paints static poses; 17 adds motion by reading the
  held-step modes into `POSE` (drift, lurch@t, enter, fade) without moving the
  hook. Check the void beats actually show the chord (snap said `same`).
- (Phase 17) Tier-3 acts have times now (break lurch 2 s, matter comb 4 s,
  fall lurch 3 s, fight level 4 s, trade/land fades): Phase 18 keys its
  effects (chaos surge, rage, storms, lights out) to those times or reads
  `GenTier3.offset(k)`; deep/slip have no tier 3.
- (Phase 18) `GenTier3.tines(k)` gives the comb's tine screen xs;
  `drawShards` takes an optional `kick`; `GenElem` EVENTS has a 9th fixed event
  and `GenMatter` STORMS an 8th; far lights have a flee dark band in
  `genesis-void.js`. Phase 19 nests and cities can read `tines`/`offset` the same way.
- (Phase 19) `drawSpan` has module `hh(b, i, k)` (bay hash) and local
  `arrived(id, b, k)`; cities arrive in `trade`, nests in `walk`. Later
  tier-2 work adds pieces the same way, inside the offscreen span canvas.
- (Phase 20) emergence is stepped: `ventDur(idx)`, `ventSteps(idx)`,
  `GENT_IDX`; `p.clipY` clips at the lip; `drawFlakes` sheds at each snap.
- (Phase 21) `GenElem.drawSea` + `seaK(s)` own the tier-1 sea (0.12 H at the
  frame bottom); `drawSplit` sends split particles to sea / rail / sky.
- (Phase 23) `drawSpan` works in a device-pixel box: anything new drawn into
  the span canvas must stay within x0-3..x1+3 and below deckY - 0.06 H, or
  widen that box. Frame-time margin: within 10% of the Phase 4 baseline.
- (Phase 24) The plan is done. Open for a later pass: the stale `dressNow`
  comment, the grey `FALL` fallback in genesis-attire.js, the unbuilt cold
  rift light. `art-style.md` Eldritch now describes what shipped.
