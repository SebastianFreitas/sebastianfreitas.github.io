---
paths:
  - "js/world/**/*.js"
  - "js/genesis/**/*.js"
  - "js/gdworld/**/*.js"
  - "js/ship/**/*.js"
  - "js/lib/paint.js"
---

# Art style

Every drawn place (Rex kingdoms, Mainland factions, anything new) uses one
style. Reference: the Bone Spire in `js/world/art/bonespire.js` and the
Titans cave in `js/world/art/titans.js`.

- Stylised 2D silhouettes, flat palette fills.
- Light from the left. Shadows are hard-edged flat shapes (a `litShade`
  split, roughly the right 70% of each volume), never gradients.
- No rim lines, outlines or brick lines on buildings. Exception, owner's
  call (2026-09-25): HeavyLight's Game Dev tiles (`gd-heavylight.js`) keep
  the game's light rim on every exposed side; dark fill never touches empty
  space; the ceiling and floor masses run to the top and bottom screen
  edges (no black sky), and the tiles and the zone art round the HeavyLight
  planet share one pixel scale (`GdWorld.P.heavylight.px()`, 3 px per art
  pixel on desktop). Same call for Conclusus (`gd-conclusus.js`): the
  game's own slabs on its flat #2f2427 void, with the game's grass-top light;
  no masses, since the game has none.
  Same call for Sector Zero (`gd-zero.js`): the game's dark storeroom seen
  only in wide #C0FFBA-hued lantern pools drawn as stepped rings (not a glow).
- Soft glow only for things that emit light (lanterns, portals, flames).
- Places are proper buildings, not symbols or sigils.
- The primitives are in `js/lib/paint.js`; never add another `litShade`.
  Shared building helpers go in `rex-kit.js` / `land-kit.js`.

## Marks stay findable

Beacons, planets and depth nodes are what the visitor hunts for; the
backdrop never competes with them.

- The mark is the brightest, most saturated thing near it. Backdrops stay
  dark and low-contrast; colour is an accent, not a field.
- A mark's colour contrasts with its place's backdrop in value (light on
  dark), not only in hue: red nodes on a red place get a light core and
  rim (`planet.js` themes).
- No point lights, rings or discs in backdrop art that could be mistaken
  for a mark (no rotating lamps, no small glowing orbs at mark size).
- Busy or bright elements fade out round every visible mark: Game Dev
  painters multiply their alpha by `G.clearBox(x, y, hw, hh)` from
  `gdworld.js`. Props sit on the floor band (below `GROUND`), not in the
  band where marks float (0.16–0.66 H).
- Every Game Dev mark sits on a dark backing pool (`Planet.draw`); do not
  remove it.
- Check it on the `bridge-gamedev-*` snapshots: every mark must be found
  at a glance.

- The implementer never sees this file: copy the rules that apply into
  the spec's Style section.

## Eldritch (the genesis cutscene)

Owner's calls, 2026-09-25 (plan: `.claude/plans/genesis-eldritch.md`,
reasons in `.claude/plans/research/01-style.md`). The rules above still
hold except where a line here says otherwise.

**Scope.** The old ones, what lives on the bridge, the sky shadows.
Nothing born of the Primordisentia's womb is eldritch: souls, Rex,
Obrokxus and his brothers, the gods, the mainland and the city keep the
rules above only.

**Three tiers.** Tier 1, the mortal realm, lies under a sea at the
bottom of the frame. Tier 2 is the bridge and everything living on it:
the bridge is so big that its thickness alone spans galaxies. Tier 3 is
things bigger than the void, glimpsed in the sky. Tiers 1 and 2 never
know tier 3 exists. Late in the elements beat the particles split three
ways: each living particle freezes, holds, then snaps in held steps to
the sea, the rail top or the sky, roughly a third each; bridge-bound ones
off the span sink. The mainland and Rex stand above the sea: the soul kind
reaching up, with tier 3's potential in it.

### Figures and clothes

- **Outline first.** Filled flat in one colour, every figure still shows
  its kind and its garment.
- **Holes, not lines.** Interior detail (a monocle, lace, the gap between
  cape and body, buttonholes) is cut through the shape to the backdrop.
- **Who dresses, and when.** Only the east-goers, and only from `dress`
  (the beat after `womb`): reshaping the womb inspired them to change
  their bodies and make their own winter clothes. Before `dress` every
  old one is bare, the headless gentleman included, and the west-goers
  stay bare for good. Obrokxus's brothers borrow old-one bodies (tinted
  red) but never dress.
- **Two assets per east-goer.** The evolved (inspired, dressed) state is
  drawn as its own asset, not the bare one with clothes laid on; the
  change between them is a stepwise snap, never a morph. In `dress` each
  east-goer first makes its cloth in held steps (1.8 s), then snaps alone
  at its own moment; the gentleman goes last.
- **One trait, pushed.** A dressed old one wears one or two pieces, one
  exaggerated past sense: hats 3–6× head height, brims 2–3× body width,
  shoes 2–3× long. Any garment on anyone, women's dress included
  (bonnets, bustles, muffs, veiled hats): clothing is loot.
- **Nothing fits.** Found clothes show it: hat perched with a gap or
  tipped, hems dragging, a coat off one shoulder, scale that ignores the
  wearer, a piece on the wrong end. Only the tailored one is symmetric,
  snug and complete.
- **Two suits.** One tailored (high society), one found. The tailored one
  is tall, thin and immaculate, no skin showing, and has no head: a very
  tall hat sits where the head would be. He replaces the colossus.
- **Crisp cloth, rough body.** Cloth edges are clean polygons and gentle
  curves; the body under them stays jagged and lumpy.
- **Winter reads as mass.** Scalloped fur edges, collars turned up,
  capes and mufflers doubling the shoulder line, snow as flat pale caps
  on top edges. No fur texture, no hair strokes.
- **Wardrobe palette.** Cloth is darker and less saturated than its
  wearer: coal, slate, bottle green, oxblood, camel; spats or a collar as
  the one pale note. Metal is dull ochre and never glows. Take every
  cloth, leather, fur, metal, snow and tier-3 colour from
  `GenEldPal` (`js/genesis/genesis-eldpal.js`); a new token must pass
  its `report()` contrast gates.
- **Third tone band (change).** Cloth and tier-3 shapes may carry a mid
  band between lit and shade: one more flat shape, never a gradient, and
  still no second `litShade`. No painted patches or noise.
- **Spot-black nicks.** The shadow edge of a garment may carry 1–3 small
  notches, still following the light from the left.
- **Eyes are rare.** Most old ones have no eyes. The few that do each
  have their own eye, drawn for that being alone.
- **Nothing repeats.** No two of the 24 rim old ones share a body, a
  garment, an eye or any other asset; no stamped copies. (The brothers
  reuse old-one bodies, tinted red: they are not old ones.)
- **Stillness is the uncanny.** Hold still where a body should move, then
  snap to the next pose with no in-betweens.

### Tier 3 (the sky shadows)

- **First, then background.** They are the first thing born and plainest
  in the opening beats; after that a sliver sits in almost every beat
  (all but deep, slip, return, eternity and now), behind everything and
  never the subject.
- **Never whole.** Never even half in frame: an edge, a curve, a limb or
  a brim cut by the screen edge. Hard to see.
- **Farthest value step.** 1–2 flat steps off the backdrop (#0d1114), in
  3–4 stepped fog layers at most; behind a caption, within one step.
- **Absence as presence.** A tier-3 being may be a region where the far
  lights and motes are missing.
- **Wrong parallax.** It ignores the camera's pan and zoom, or moves
  against it.
- **Geometry against flesh.** Simple, large, near-perfect forms (arcs,
  straight edges, a brim, a lidless curve), our own shapes.
- **Ignores the light (change).** No left-lit split: one flat value, or
  its shade falls straight down or toward the light.
- **Only effects reach below.** What it does shows only as effects in
  tiers 2 and 1 (the chaos lurching, motes turning at once, blobs knocked
  aside); never a beam, a line or contact.
- **Slow and wrong.** Only held steps: very slow drift against the wind,
  a stepwise lurch, a stepped enter or fade, a stepped pass (the Comb in
  `walk` and `flee`), or a snap level; nothing bobs. Reduced motion:
  still and visible.
- **The two who care.** The Lintel and the Arc enter in held steps in
  `leave` and hold over the womb through `birth`, a pocket of far lights
  kept dark round them; the Lintel snaps level in `fight` and both fade
  in steps in `land`. Every rule above still holds; stillness is their
  care.

### Tier 2 (the bridge)

- **Scale through life.** The bridge's size shows through what lives on
  it: nests on the piers like birds' nests, eldritch cities grown round
  the span, all tiny against it.
- **Cold rift light (change; planned, not shipped).** Only at `break` and
  `walk`, a rift in the chaos may light the facing side of the nearest
  silhouette with one flat cool band: the only second light.

### Also shipped (plan phases 5-23)

Tier-3 haze bands; the tier-1 sea strata and the void residue; the Brim
lurch jolting the chaos in `break`; the Comb's tines tripping old ones in
`walk`; climb-out in held steps in `trade`; hanging and deck cities and
pier nests; garment weather (wind and frost); gestures after dressing;
`worlds`, `remake` and `lives`; in `leave` the east-goers exit with pins
while the carers (eye, chime, mound) and the brothers stay. `drawSpan`
draws only a device-pixel box round the span (see the plan, phase 23).
