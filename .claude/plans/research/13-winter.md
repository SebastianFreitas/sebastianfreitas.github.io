# Phase 13 research: winter against the chaos

Cloth in wind, drawn flat and cheap (no gradients, outlines, glow).

## How cloth reads in wind (2D animation practice)

- **Follow-through, not physics.** Cloth is a chain that lags its anchor:
  the free end trails the anchor's motion by 0.06-0.12 s (2-4 frames at
  30 fps). Cheap form: evaluate the same sway function at `t - lag`, lag
  growing with distance from the anchor (0 at the root, full at the tip).
- **Amplitude grows toward the tip.** Displacement ~ (u^1.5) along the
  piece (u = 0 root, 1 tip). Tip sway in calm air: 4-8% of the piece's
  length; in a gust: 20-35%. Never past 45%, or it reads as a flag, not
  a coat.
- **Frequency falls with length.** Like a pendulum, f ~ 1/sqrt(length):
  short flaps (hat ribbons, deerstalker flaps, tie ends, < 0.1 h) flutter
  at 5-8 Hz; scarf tails (0.3-0.6 h) at 2-3 Hz; coat tails and capes
  (0.6 h+) at 0.8-1.5 Hz. Add a second harmonic at ~2.3x, 25% amplitude,
  so it never looks like a metronome.
- **Wind is a base plus gusts.** Base lean 5-10% of length toward
  downwind, constant sign; gusts every 3-7 s, attack 0.2-0.4 s, hold
  0.3-0.8 s, decay 1-1.5 s. During a gust, raise both amplitude (x3-4)
  and flutter frequency (x1.5). One global gust curve for the scene; each
  figure offsets it by its x position (gust front crossing the deck at
  ~0.8 W/s) so they react in a wave, not in unison.
- **Heavy vs light.** Wool coats and capes: low frequency, amplitude
  capped at 20%, hem lifts before it swings. Silk ribbons, ties, veils:
  full flutter. Umbrella and brims: they tilt, they do not flutter
  (brim rotation <= 0.08 rad, hat lift <= 0.03 h on a strong gust).

## References that translate

- **Dishonored (Dunwall):** weather is carried by the cloth and the
  particles, not the sky; coats are heavy and move as one slab with a
  late hem. Silhouettes stay readable: motion never breaks the outline
  shape.
- **Control (floating papers, the Hiss):** motion that is too smooth and
  too slow reads as wrong. For chaos, drop the physics: 1-2 s eased drift
  of a whole piece plus a rare 1-frame snap (every 4-8 s) back to rest.
  That snap is the "chaos" tell, cheaper than turbulence.

## Cheap canvas rules

- **One wind value per frame** (`dir`, `str` 0-1, `gust` 0-1), computed
  once before the roster loop, passed on `p`; every painter reads it, none
  recomputes it.
- **Rotate, do not repaint.** Cached garment canvases stay cached: sway
  a coat tail, scarf or brim by `ctx.rotate` about its anchor around the
  cached draw, not by feeding a changing value into the cache key. If a
  shape must bend, quantize the parameter to 4-6 steps.
- **Hand-drawn tails** (lines, 4-8 point polys): move only the last
  1-2 points; root points stay put.
- **Frost / ash as flat caps.** 1-3 flat shapes per shoulder or brim,
  each a thin lens or 3-5 point poly, 0.03-0.06 h wide, 0.008-0.015 h
  thick, in the snow tone (or ash grey). Grows in over 3-5 s after
  `dress`, never animates after that. Skip below 14 px figure height.
- **Loose flakes:** at most 2-3 per figure shed on a gust, 1-2 px squares,
  falling 0.6-1 s downwind, then gone. Deterministic from `t` and a seed,
  no arrays grown per frame.
- **Budget:** under 0.2 ms per frame for the whole roster; no new
  canvases per frame; no `save/restore` beyond one per swayed piece.
