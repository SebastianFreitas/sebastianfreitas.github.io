# Phase 27 · `worlds` (XII): research and anchors

Sources: plan `### 27` (genesis-eldritch.md:548); beats doc :30 (row
`worlds`, **8.5 s**, "XII · The made worlds"), :38-45 camera, :76-92 the
beat, :155-156 caption, :168-183 touch list (proposed `genesis-works.js`);
D19 renumber, D24 captions used as written. art-style.md:16-30, :59-160.

## Caption (beats doc :155, exact)
tag "XII · The made worlds", line "Inside the womb they made places for us,
by hand, one law at a time. Nothing in them answered to belief."
Duration: doc says 8.5 s, the brief 7 s: main picks (8.5 fits D18).

## Beat checklist (as phase 26)
- genesis-state.js:22-82 `G.BEATS`: insert after `dress` (:43-44); `birth`
  (:45 "XII") .. `eternity` (:79 "XXIX") +1 → XIII..XXX. `since` :307,
  `secs` :333, `idxOf` :303 (unknown id → 0: guard like oldones:357).
- genesis.js:244-253 ZOOM `worlds: [1.00, 1.00]`. MAP.md:187 "30 beats" →
  31; a new works file needs a `<script>` after index.html:463 and a MAP row.
  snap.py/gframes pick up `genesis-worlds` alone; later scenes shift in time.

## The flesh
- `fleshGeom` genesis-flesh.js:23-31, screen space: cx = `sx(ROOT_U)`, cy =
  0.5 H, m = min(W,H); at womb=1 rx ≈ 0.52 m, ry ≈ 0.68 m. Camera
  genesis.js:313-318 holds cam = ROOT_U - 0.50 root..land, so cx = W:
  centre on the right edge, left half on screen. Zoom = global scale about
  screen centre, genesis.js:395-399.
- `fleshPath` :34-52 (81-pt wobble on G.t) is the clip used by drawFlesh
  :78, drawPatches :157, drawSouls :177. Body :66-67 (lit #5c1114→#6a2418,
  shade #2e080c). Eyes/mouths :51-52, :75-147 at 120-260° (the left face).
- Order genesis.js:454-473: drawSeal :459 (gold rings, flatGlow :212/:246,
  an emitter) → drawFlesh :460 → drawCry :462 → drawPatches :463 →
  drawSouls :465 → drawStream :472 → old ones :473. At womb end: pain ≈
  0.72, seal 1, souls orbit 0.5 rx round cx (:180-185), still 1, watch 0;
  all read womb/birth only, so they hold through the new beat unedited.
- Hook: `GenWorks.draw(ctx, flesh, amt)` right after drawSouls (:465) in its
  own `save; fleshPath; clip`, before the old ones (kneelers overlap rim).

## Old ones
- `place()` oldones:163-280: east-goers at `clingAng` (15 % speed, :228),
  radius ≈ 1.0 rx (just outside), knelt (:254-261); gentleman on the deck at
  cx - 1.05 rx (:232-234); all dressed after `dress` (:355-378). `p.gest`
  :270-274 = 0.4 s pulse every 9-13 s (free crank hook). `layer:"inside"`
  (genesis.js:451, oldones:1005-1012) is only the mass emergence: no inside
  layer for the flesh. `place` is exported (:1069).

## Recommended minimal design
1. `js/genesis/genesis-works.js` (`window.GenWorks.draw(ctx, flesh, amt)`).
2. Cutaway lens at (cx - 0.62 rx, cy), half-size 0.24 rx × 0.55 ry, on the
   left face; opens in 3 held steps over 0-1.5 s, two flaps folded back in
   #2e080c, interior flat #1a0608. Until phase 29, closes in 3 steps over
   the last 1.2 s so `birth` is unchanged (phase 29 moves it to `leave`).
3. 12-15 worlds on a grid in the lens: flat grey orreries (disc, 1-2 ruled
   rings, ticks) and spindles (3 whorls), GenEldPal steps/pewter, one muted
   tone each, one hard flat shade from the left. Built one by one in ~0.35 s
   held steps (rod, disc, ring, lock), never tweened. Each sprite cached to
   an offscreen canvas keyed by m; rings step-rotate (a click ~0.6 s).
4. Every change has a cause: a card chain on the lens's left rim (one
   cached strip, integer scroll); each passing card locks the nearest world.
   2-3 knelt east-goers nearest the lens hold dull-ochre cranks (line +
   knob at their `p`) that turn in steps on `p.gest`.
5. Glow: at most one star inside one world via `flatGlow` (it emits).
6. Camera (doc: cx ~0.72 W, zoom ~1.25 for worlds→lives): skip for
   minimal; else an eased offset in camAim's root branch (genesis.js:317).

## Budget and risks
- Per frame: one extra 81-pt clip, ~15 drawImage, ~20 fills, no shadowBlur,
  no gradients, no per-frame allocation (the bridge bill is the rAF loop).
- Souls (≤0.5 rx) overlap the lens (0.38-0.86 rx left) slightly: draw after.
- Reduced motion: lens open, worlds complete, no steps.
- Snaps: new `genesis-worlds`; birth onward same if no camera move.
