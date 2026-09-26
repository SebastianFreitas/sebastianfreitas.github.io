# Phase 28 · `remake` (XIII), `lives` (XIV): research and anchors

Sources: plan `### 28` (genesis-eldritch.md:562); beats doc :31-32 (rows),
:38-45 camera, :94-119 the beats, :157-162 captions, :187 D17; D24 captions
used as written. Pattern: research/27-worlds.md, js/genesis/genesis-works.js.

## Captions (beats doc :157-162, exact)
- `remake`, **7.5 s**: tag "XIII · Taken apart", line "We had been eating
  one another since before there was a before. They pulled us apart, kept
  what would hold, and made us again."
- `lives`, **9.0 s**: tag "XIV · Again", line "We lived, and forgot, and
  were sent to live again, more times than anyone counted. Then two of us
  remembered what no one had taught."
- Staging :94-119: remake = clots (gold mass, dots vanishing in), two old
  ones pull one apart with long tongs, pale threads, some snap and fall
  (waste stays visible), kept piece on a flat counter: core, lattice (clip
  reveal of a cached sprite), thin cloth. lives = three old ones in a line
  (spin, rod, shears), cut end falls into a world as a spark, comes back
  paler with a ring; line speeds up; a dark band (the forgetting) blanks
  them, rings stay; two come back with many rings, Rex warm, Obrokxus
  wrong; every crank stops, every old one turns to them; hold.
- Camera :41-45: centre to ~0.72 W, zoom ~1.25 for worlds→lives. Phase 27
  skipped it; skip again (keeps birth onward unchanged).

## Anchors
- Souls: genesis-flesh.js:15-21 (90 souls, mulberry(9003), ox/oy ±0.52,
  a 0.2-0.7, r 0.5-1.7, ph); drawSouls :172-188 clips to fleshPath, at
  womb=1 each sits on 0.5 rx/0.5 ry round (cx,cy), angle atan2(oy,ox) +
  0.15 G.t, radius r·1.35, fill rgba(245,208,107,a·amt). Driven by
  `soulAmt` genesis.js:464 = f(uRoot) · mix(.45,1,uWomb) · (1-.55 uBirth)
  = 1 through dress..lives; `uWomb` passed as womb. No devouring, no
  Rex/Obrokxus-as-soul anywhere yet (only this ring).
- Hook: genesis.js:466 `if (window.GenWorks) GenWorks.draw(ctx, G.W, G.H);`
  → add `if (window.GenRemake) GenRemake.draw(ctx, G.W, G.H);` at :467,
  before drawStream/drawOldOnes (:473-474), so tools sit under the hands.
- Rex/Obrokxus looks at birth: genesis-orb.js drawOrb :108; Rex =
  `G.ORB_STYLE.rex` genesis-state.js:178 (lit #f58a34, shade #b4461e,
  glow "245,138,52", core #ffe2be; flatGlow + flatSphere); Obrokxus = else
  branch orb.js:198-205 (flatGlow "120,12,18", body rgba(22,3,5), core
  rgba(150,18,24), pupil rgba(8,1,2)). Trails genesis.js:481-482.
  flatGlow genesis-paint.js:47 (three flat discs, no gradient).
- Note: GenWorks calls `fleshGeom()` (womb 0), 10 % wider than the souls'
  geometry (womb 1, flesh.js:28-29). GenRemake should use `fleshGeom(1)`.

## Beat checklist
- genesis-state.js G.BEATS: insert `remake`, `lives` after `worlds` (:45-46);
  `birth` (:47 "XIII") .. `eternity` (:81 "XXX") +2 → XV..XXXII.
- genesis.js:247 ZOOM: `remake: [1.00, 1.00], lives: [1.00, 1.00]`.
- index.html: `<script src="js/genesis/genesis-remake.js?v=131">` after
  :464 (genesis-works.js). MAP.md:187 "31 beats" → 33, plus a new row.
- Guard beats with the hasBeat pattern (works.js:14-18); `G.secs(id)`.

## Recommended design: js/genesis/genesis-remake.js
`window.GenRemake = { draw(ctx, W, H), soulMul() }`; returns at once when
`t = G.secs("remake")` is < 0 or ≥ 7.5 + 9.0. Geometry `fleshGeom(1)`.
1. soulMul(): 1 outside the two beats; 0.35 inside (stepped in 3 holds
   over 0.6 s), so the ring dims to a backdrop. One-line guard at
   genesis.js:464: `soulAmt * (window.GenRemake ? GenRemake.soulMul() : 1)`.
2. remake: 3 clots on the left of the ring (angles 160°, 185°, 210° at
   0.5 rx): each a lumpy gold blob (5 overlapping arcs #c9a24a/#f5d06b),
   dots stepping into it every 0.4 s. From 1.5 s two tong lines (dull
   pewter, 2 px) run from rim anchors at 1.0 rx (±15° of the middle clot)
   to it; it stretches in 4 held steps into 6-8 pale threads
   rgba(235,225,200,.7); 3 snap at 3.5 s and fall in steps to the flesh
   floor (stay, dim). Kept piece moves in 3 hops to a counter (flat bar
   at cx-0.32 rx, cy+0.30 ry): core (gold disc), lattice (cached 8×8
   grid sprite revealed by a stepped rect clip), cloth (one pale ellipse
   at .35 alpha). Build steps 0.5 s, never tweened.
3. lives: loop path counter → down to the lens (cx-0.62 rx) → back up;
   6 sparks on it, positions quantised to 12 steps per loop, loop time
   2.4 s → 0.8 s by 6 s (the line speeds up). Three short tool strokes at
   rim anchors (spin line, rod, shear V) that change pose on each step.
   A dark band (#12040a, 0.06 ry tall) across the return leg; sparks
   leaving it are paler; each carries k rings (1 px circles, k = its loop
   count, cap 4). At 6.5 s two sparks stop on the counter: Rex a
   flatSphere in ORB_STYLE.rex with a small flatGlow (he emits: "burning
   like a new star"); Obrokxus a dark disc rgba(22,3,5) with a
   rgba(150,18,24) core and no glow (wrong, not a light). Everything else
   freezes (hold) to 9.0 s. Crank stop / turn-toward: optional via
   oldones `p.gest`; skip for minimal.
4. Lens: works closes it at worlds' end (works.js:36-37). Keep it open
   through lives: extend GenWorks' window to worlds+remake+lives (close in
   lives' last 1.2 s), a separate small spec; else draw 3 flat world
   discs under the lens spot in GenRemake.
5. Reduced motion: final state of each beat, no steps.

## Budget and risks
- Per frame: one fleshPath clip, ≤ 40 arcs/lines, 1 drawImage, one
  flatGlow; no shadowBlur, no gradients, no per-frame allocation.
- Draws nothing outside its beats and soulMul() is exactly 1 there, so
  every other scene stays pixel-identical except for the time shift.
- Snaps: new `genesis-remake`, `genesis-lives`; birth onward shifts in time.
