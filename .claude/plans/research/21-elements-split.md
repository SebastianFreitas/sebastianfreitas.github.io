# 21 · The elements split (research)

How art shows one first matter dividing into places, and what that means for
the `elements` particles (`js/genesis/genesis-elements.js`).

- **Genesis 1:6–7, the firmament**: the first act of order divides the
  waters "above" from the waters "below". Takeaway: the split is one gesture
  into three bands (below, on the bridge, above). It is not a drift.
- **Marine snow and sediment**: dead matter settles slowly in the ocean, and
  the bed builds up in flat strata sorted by weight. Takeaway: the sinking
  third lands and stays as flat stacked bands at the frame bottom, each grain
  adding to a ledge. It is packed, not liquid.
- **Dante's Styx, Bosch and Beksiński's seas of bodies**: at a distance a sea
  of souls reads as a flat level surface; up close it is heaped small forms.
  Takeaway: the sea's top edge is lumpy at grain size and level at frame
  size, with no waves, no gloss and no reflections. It is "not water".
- **Dust on ledges, soot on eaves**: the settling third collects only on the
  top edges of the bridge, never on its flat face. This matches the snow caps
  of the wardrobe rule.
- **Rising sparks and ash over a fire**: the rising third thins as it goes up
  and leaves the top of the frame. Nothing comes back.

## Decisions

- **The split happens late in `elements`.** Each particle keeps its current
  motion until its own hashed split time. It then holds still for a moment
  and snaps to one of three fates (a third each, by hash). The snaps are
  stepwise, with no easing ("stillness is the uncanny").
  - **Sink**: it drops to the sea at the frame bottom and becomes a grain in
    it.
  - **Settle**: it drops to the span's slab top and stays there as a grain.
  - **Rise**: it goes up in held steps and out of the top of the frame.
- **The sea is made of the particles.** It is flat, lumpy stacked strata in
  dark, desaturated versions of the particles' colours. It stays from
  `elements` to the end, drawn under the mainland so the mainland art is
  never touched. Tier 1 is only implied: nothing is drawn under the sea.
- **No glow, no marks.** Grains are 1–3 px, dim, and below the band where
  marks float.
- **Reduced motion:** the same held positions, jumping straight to each
  particle's end state at its split time.
