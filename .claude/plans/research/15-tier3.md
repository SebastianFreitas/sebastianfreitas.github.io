# Phase 15: tier 3, concept and choreography

Sources: plan brief (:64-73), D3 (:614), D4 (:617), D25 (:682-691),
D26 (:695), ### 16-18 (:402-422), Carry forward (:718, :723, :726, :738,
:741-744, Phase 29); art-style.md "### Tier 3 (the sky shadows)" (:127-151);
research/01-style.md rules 13-20 (:181-206); research/03-lore.md (:13-79);
research/04-palette.md (:53-68); genesis-eldpal.js `TIER3` (:30-34).

Status: written under the owner's standing "run the plan" order, so the
Phase 15 approval gate is **assumed** (flagged in the final report). If the
owner rejects a being, only Phases 16-18 change; nothing is built here.

## What colossal scale borrows (research)

- **Shadow of the Colossus:** scale is sold by a small figure against a
  surface that fills the frame, and by the camera never fitting the whole
  thing in. Here the frame is the camera: a tier-3 being is always cut by
  the top edge, so the eye supplies the rest, and the rest is too big.
- **Beksiński, Blame!:** architecture that does not end. Long straight
  edges and repeated verticals read as built, not grown, and as bigger
  than the view. Geometry against flesh (rule 17).
- **Moebius:** flat, calm, almost no value range; menace comes from the
  silhouette being wrong, not from texture. Matches `TIER3.steps` (four
  values, 1.02-1.15:1 off #0d1114).
- **Bloodborne's Amygdala on buildings:** the being is there before the
  player may see it; seeing it changes nothing it does. Tier 3 is drawn in
  every beat it sits in; only its value makes it hard to see.
- **Dishonored's Void, Control's Board/Astral Plane, Control Resonant:**
  the presence is a place's rules going wrong (dust falling sideways,
  objects turning at once, heads in the sky that act only through effects).
  Tier 3's acts land only through existing systems (rule 19, Phase 18).
- **Annihilation (the Shimmer):** refraction without malice. Tier 3 is
  "not cruel, just so" (03-lore): reflex, not intent.
- **Haze and slow motion:** 2-3 flat haze bands cutting a shape sell
  distance better than blur; motion slower than anything else on screen
  (or one held-step lurch) sells mass. Nothing bobs (rule 20).

## The four beings

Two that wander (the first born, always somewhere) and the two carers
(D25). None has an eye; no mark on any of them reads as one. All are
flat (`TIER3.steps`), unlit, ignore the light (shade, if any, is
`TIER3.under` falling straight down), never half in frame, and ignore
zoom and pan (screen-fixed, their small parallax runs against the camera).

| id | name (docs only) | shape | cut by | value | doing |
|----|------------------|-------|--------|-------|-------|
| `brim` | the Brim | one vast shallow arc, the underside of a rim far wider than the screen, with a thin mid band (a second arc 1 step up) along its lip | the top edge; only a chord of it dips in | t2-t3 at the sides, t1 under captions | working, then sleeping |
| `comb` | the Comb | a row of 5-9 long straight parallel tines, unequal gaps, hanging from beyond the top edge; square ends | the top edge and one side | t2-t4, each tine its own step | passing |
| `lintel` | the first carer | one straight near-horizontal edge, tilted a hair (1-2°), spanning half the width | the top edge and both sides | t1-t2 | caring (holding still) |
| `arc` | the second carer | a single tight curve, a quarter of a much larger circle, entering from a top corner | the top edge and its side | t2 | caring (holding still) |

Ceilings (rule 14, Carry forward :726): anything behind the caption box
(centre, top ~20 % of H, max(44rem, 88vw) wide) stays at t1. Corners may
use t2-t4. No being dips lower than 26 % of H; the Comb's tines are the
only shape allowed that low, and only at a side.

Absence (rule 15): each being carries a cut-out region of far lights and
motes around it (the `fillBg` far lights and void motes are skipped
inside it). For the carers this pocket is the whole point (D25).

## Choreography per beat

Held steps only; a "drift" is at most 1 px per 0.5 s held step, and it
runs against the wind or the march (rule 20). "Lurch" = one held step of
2-4 % of W, once. Reduced motion: every being holds its pose, visible.

| beats | brim | comb | lintel + arc |
|-------|------|------|--------------|
| `point`, `drawn` | plainest sighting (D4): a long chord across the top, t3 at the corners; drifts left, against the bloom | off | off |
| `break` | lurches once at 2.0 s (the act below) then holds | off | off |
| `elements`, `matter` | sinks back to a thin sliver at the top-right corner, drifting | enters at the top-left corner at `matter` 4 s, three tines | off |
| `trade`, `walk` | off (gone by being too faint: fades out in 3 held steps) | passes left to right across the top at walk speed reversed, gone by `walk` end | off |
| `root`, `swarm` | off | off | off (the rare stretch: nothing but the lights) |
| `womb` | a corner sliver at the top-left, still (sleeping) | off | off |
| `dress`, `worlds`, `remake`, `lives` | sleeping: holds, no drift | one sighting in `worlds` only: two tines at the far right, still | off |
| `leave` | off | off | enter in 3 held steps from 0.6 s as the lamps go out; stop over the womb by 4.8 s; far-light pocket round both |
| `birth` | off | off | hold still, pocket kept |
| `fight` | off | off | hold still; lintel tilts back level (one step) once Rex burns |
| `land`, `gods` | a far corner sliver, drifting | off | fade in 3 held steps at `land` start |
| `deep`, `slip`, `flee` (void beats) | returns in full chord (the other plain sighting, D4), working | passes right to left in `flee` | off |
| `war` ... `fifth` | one corner sliver per beat, alternating sides, still | off | off |
| `fall` | lurches once (the act below) | off | off |
| `return`, `eternity`, `now` | off | off | off |

## What each act causes (the chain, built in Phase 18)

Every act lands through systems that already exist; no beam, touch or
light ever crosses from tier 3. Phase 18 maps each link to its hook.

1. **Brim lurch, `break` 2.0 s** → the chaos layers surge one step (the
   break itself gets a cause) → the first shards scatter a hair further;
   nobody below reacts to the sky, they react to the shards.
2. **Brim drift in `elements`/`matter`** → dust and motes fall sideways,
   all turning at once (the first link, Carry forward :741-744) →
   `GenElem.rage` rises for one held step; a matter storm starts on the
   side under the sliver.
3. **Comb pass in `walk`** → the march stumbles: the old ones under each
   tine clutch hats or break step for one held step (tier 2, never
   looking up) → the swarm below scatters and regroups.
4. **Comb in `worlds`** → one of the three worlds' discs slips a step on
   its path → a spark in `lives` takes the long way round (its loop runs
   one step late).
5. **Carers in `leave`/`birth`** → far lights round them stay dark (the
   pocket) → the womb reads as sheltered; Rex's and Obrokxus's birth is
   the only light in that quarter. The care is stillness, never contact.
6. **Brim full chord in the void beats** → far realms rearrange (far
   lights go out in a band and come back elsewhere) → the fleeing souls
   change course; the war's front shifts a step in `war`.
7. **Brim lurch in `fall`** → a matter storm sweeps the span → the fall's
   debris goes sideways, not down.

## Rules kept

- Tiers 1 and 2 never look up, never react to tier 3, only to effects.
- No caption names or hints at them; captions stay the tier-1 record.
- Tier 3 never dresses, never transforms (D28 line :707).
- Never lit: no halo, glow, rim light, or eye.
- Nothing repeats: the four shapes share no silhouette.

## For Phase 16 (the painter)

- New file `js/genesis/genesis-tier3.js`, `window.GenTier3`, drawn after
  `fillBg` under a reset transform (`setTransform(1,0,0,1,0,0)` scaled for
  DPR) so it ignores zoom; parallax = `-0.02 * cam` offset.
- Colour only `GenEldPal.TIER3.steps[i]` / `.under`; cache each being's
  path per canvas size (four shapes, rebuilt on resize).
- A per-beat table `POSE[beat] = { brim: [x, y, step, mode], ... }` mirrors
  the choreography table above; `mode` is `drift`, `hold`, `lurch@t`,
  `enter@t0-t1` or `fade`.
- Far-light pocket: export `GenTier3.pocket(x, y)` returning true inside a
  being's cut-out, for `fillBg`'s far lights and the motes to skip.
- Snap every `genesis-*` scene before and after; captions must stay
  legible (t1 behind text).
