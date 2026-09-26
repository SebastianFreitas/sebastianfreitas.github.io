# Phase 29 research: the leaving (`leave`, XV)

Sources: plan D17 (:646), D20 (:652), D25 (:671); beats doc
`genesis-eldritch-beats.md` :33, :43, :121-139, :163-164; research/05-wardrobe.md
:81-83 (carers: mound, eye, chime; the gentleman leaves); research/25-inspired.md
:61-63.

## Beat
- `leave`, 6.5 s, tag "XV · The hands", after `lives`; later tags move up one
  (birth XVI ... eternity XXXIII), 34 beats. ZOOM `leave: [1.00, 1.00]`.
- Caption: "And the hands were gone. The worlds went on turning, and nothing
  watched them any more."

## Staging (built)
- The rim old ones go out one by one, left to right by screen x: each one
  snaps to half, then gone (held steps), and a pin of its `o.hue` is left in
  its place. The pin runs a short way back along the rim, then out into the
  void, fading in held steps.
- Carers: eye (idx 8), chime (20), mound (23) stay lit and are the whole
  55 % watch in `birth`/`fight`. The brothers are untouched.
- Everyone else stays gone from `leave` on (later beats never redraw them).

## Deferred
- The two tier-3 carer edges over the womb (D25): no tier-3 painter exists
  yet; they come with Phases 16-18 (carry forward).
- The beats doc's camera pull-back is a no-op: `lives` already sits at 1.00.

## Code anchors
- genesis-oldones.js: ROSTER_SPECS :21-29, `place` :163, alpha :249-250,
  `drawOldOnes` :1003-1026, exports :1069. No per-old-one lamp exists: the
  pin is new, coloured by `o.hue`.
