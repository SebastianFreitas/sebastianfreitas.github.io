# Next session — three things left

Everything else from the last round is in. These three are big enough
to deserve their own pass, and two of them depend on decisions I'd
rather you make than guess at.

---

## 1. ~~The level-up light show~~ — done

Shipped. `XP.surge()` in `xp.js`, styling under `.xp-surge` in
`beacon.css`. Reach scales with `level / XP.total`; at full it closes
the loop and flashes.

---

## 2. Gating and unlock messages

**The idea.** Start the world smaller and open it as levels come in, so
a level is worth something concrete. You mentioned starting without the
main city.

**What I need from you before building it:** the actual table. Something
like —

| level | opens |
|-------|-------|
| 0 | the bridge, the void marker |
| 2 | Rex, the Watcher |
| 5 | the Mainland |
| 8 | the Root |
| 12 | west past the mainland — the Unwritten |

**How it'd work.** `MARKS` entries get a `needs: n` field. Below that
level the beacon doesn't draw, its minimap tick shows as a locked stub,
and `CAM.min`/`CAM.max` clamp to the unlocked range so you physically
can't travel there yet. On crossing a threshold the ceremony ends with a
second line — *"span extended · the mainland is now in reach"* — and the
minimap grows into the new territory with an eased width change.

The clamp change is the part that needs care: if someone is standing
somewhere that later locks (it can't happen with a monotonic table, but
still) they'd be trapped.

---

## 3. Weight

Not urgent, but worth knowing where it'll go first.

Currently drawn every frame: ~460 void motes, 620 city swarm particles,
1030 city towers across three bands, 15 elder presences with per-eye
gradients, 22 tendrils, the chaos ribbons, the fragments, the bridge,
and the four instruments.

The expensive ones, in order:

1. **Elder presences** — each builds two gradients per frame plus one
   per eye. 15 of them with up to 5 eyes each is the single biggest
   cost. Fix: pre-render each presence once to an offscreen canvas and
   blit, or cut the count to 8.
2. **City near band** — 190 towers, each with up to ~40 window rects.
   Fix: pre-render the lit band to an offscreen strip.
3. **Instruments** — four panels of vector work at 60fps. Fix: they only
   need ~20fps; run them on a separate accumulator.
4. **Gradients built inside loops** — several `createRadialGradient`
   calls happen per-object per-frame. Most could be built once on resize.

None of this matters on your machine. It'll matter on the phone, and
that's the moment to do it — not before, because every one of these
makes the code harder to change.

---

## 4. Rex still isn't reading as three layers

**What's wrong.** The three strata are drawn as a *journey east* — surface,
then underground, then hell — and the proportions are off. In this patch the
surface stays in frame from slot 63.5 to about 71.5, hell starts at 73.9, and
the Root is at 76.5. That's roughly 8 slots of surface, 2.4 of underground,
2.6 of hell. Better than before, but two problems remain and I don't think
either is solvable by tuning numbers.

**Problem one: you can only ever see one layer at a time.** Because the layers
are sequential along the axis, standing anywhere means one of them fills the
screen. You said it yourself — 99% of the time it's one layer. The single
frame where all three read was a coincidence of camera position.

**Problem two: hell dominates.** Once the surface has climbed out, everything
below is the same mass, and the red ramp covers most of it.

**Three ways out. I'd want your call before building any of them.**

**A — Vertical camera.** The camera gains a Y axis. Travelling east still moves
you along Rex, but dragging vertically moves you *through* the layers, and the
strata become horizontal bands again. Honest to the fiction, and it's how a
cutaway actually works. Cost: every parallax calculation gains a second term,
the minimap needs a vertical component, and beacons need a Y coordinate.

**B — Zoom out.** One fixed wide view of the whole of Rex where all three
layers are visible at once as horizontal bands, and travelling east moves you
along it without changing what's visible. Cheapest option, reads instantly,
but loses the sense of descending.

**C — Keep the run, cut the scale.** Surface for 3 slots, underground for 3,
hell for 3, and accept that you see one at a time — but make each one
unmistakable: the surface has a skyline, the underground has named locations
and lit chambers, hell has structure rather than a red wash. The layers stop
competing because each is doing something different.

**What I need from you:** which of the three. If it's A, I also need to know
whether the whole world gets a Y axis or only Rex.

**Separately, and easier:** you mentioned wanting named locations placed inside
the underground. That's ready now — the rock is a clean base with no holes in
it. Give me a list of names with rough positions (west/middle/east of Rex, and
shallow/deep) and I'll place them as labelled markers.
