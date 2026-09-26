# 19 · Life on the bridge (research)

How megastructures show their size through what lives on them, and what that
means for `drawSpan` (`js/genesis/genesis-void.js`).

- **BLAME!**: the scale is never stated; it is read from tiny human dwellings
  stuck to walls that run out of frame. Takeaway: tiny, dense, many, and never
  explained.
- **Kowloon Walled City**: growth with no plan. Towers of uneven height packed
  shoulder to shoulder, leaning, adding on top of each other. Takeaway: clusters,
  uneven heights, a slight lean, not a grid.
- **Anor Londo**: flying buttresses and spires make the far structure huge. Tall
  thin verticals against a long horizontal read as distance.
  Takeaway: spires on the deck.
- **Dishonored's Void islands**: rock hangs in nothing, with ruins hanging off
  the underside. Takeaway: a second city, hanging down from the slab's
  underside into the fog.
- **Cliff-nesting birds** (swallows, guillemots) and **barnacles/coral on
  piers**: life crowds on ledges and under eaves, never on the flat. Takeaway:
  nests on the knee tops (a bowl with twigs) and swallow clumps under the slab
  where each leg meets it, each with one entrance hole.

## Decisions

- Every piece is drawn inside `drawSpan`'s offscreen canvas, so it gets the fog
  mask, the end fades and the span's alpha for free. It is anchored to world
  bays, so it pans with the camera.
- Scale: towers are 0.004–0.02 H tall, and hanging towers go down to 0.036 H.
  A leg drops about 0.44 H, so everything is tiny against it.
- Life arrives stepwise. Cities appear bay by bay during `trade`, when the
  travellers come, and nests appear during `walk`. Each piece appears whole at
  its own hashed time, with no fade and no growth (stillness, then a snap).
  There is no time animation after that, so reduced motion needs nothing extra.
- The only light is 1 px dim gold windows (the rail's gold), as emitters. There
  is no glow and nothing mark-sized.
- Holes, not lines: each nest's entrance is cut through to the backdrop.
- The `drawChaos` blobs stay: they sit behind the span and do not fight it.
