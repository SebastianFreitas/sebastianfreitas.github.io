# heavylight-page · 02 light (phase 2 research, 2026-09-26)

## Bridge beam (js/gamedev/zones.js)

- `BEAM` line 325: `{x:58,y:58,half:6,ang:42°,spread:6°,over:24}`; colours
  line 254 `HL.cone '110,160,240'`, `HL.lamp '170,215,240'`.
- Draw lines 418-443: origin 2 px off the lamp face; far edge
  `endY = screen bottom in zone units + over` (line 427), so the beam
  always leaves the screen. Start points `origin ± n*half` with
  `n = (-sin, cos)`; edge angles `ang ∓ spread`; each edge extended with
  `t = (endY - startY) / sin(edgeAngle)`; one 4-vertex polygon; single
  fill `rgba(110,160,240, .20 + .03 sin(3.1 t))` (shimmer), drawn after the
  crates. 52 px radial glow at the origin (`HL.lamp` .28 → 0). No core fill,
  no fade: always on.
- Take: same construction, axis-aligned: right lamp exits x = V.W + 24,
  up lamp exits y = -24, down lamp exits y = V.H + 24; half-width
  `20 + d·tan 6°` along the beam, so the wedge is a trapezoid whose far
  edge is off screen at every size (that is D1 without light physics).

## Old toy (git show main:js/pages/heavylight.js)

- `wedge(ctx, L, h0, h1, color)` lines 241-252: trapezoid from
  `o ± n*h0` to `e ± n*h1`; outer fill `BEAM rgba(0,43,255,.20)` 20→40,
  then `CORE rgba(140,180,255,.12)` at .35 of the widths (D8 keeps these
  two fills). Fade: `globalAlpha = min(1, left/1)`, out over the last
  second, no fade-in. Glow `P.glow(ox, oy, 30, '110,160,240', .45)` while
  on. No crate shadow ever existed.

## Shadows

- conclusus.js shadows are sprites (`SPR.green/silver`, `globalAlpha =
  fade`), not polygons: no precedent to copy.
- Take: one flat quad per lit crate. Light is axis-aligned and parallel:
  the crate's far side (away from the lamp) spans the quad's near edge;
  the far edge is the same span pushed along the beam direction to the
  wedge's far edge (off screen). Fill with the void `#041522` at one flat
  alpha, clipped to the wedge, drawn after the fills. Hard, flat, no
  gradient (art rule). LIMBO's slashes are the same idea: one dark cut
  through the light, edges razor straight.

## Current file anchors (js/pages/heavylight.js, 276 lines)

- `LAMPS` line 176 `[kind, mount]` per shelf; stored entries `{kind,x,y}`
  in document space (line 216); screen y = `l.y - V.sy` (line 241).
- Right lamp light face: sprite box 36x45, face at `(l.x+36, l.y+12..18)`.
  Up lamp 48x48: face at the top middle. Down lamp (streetlamp4, 48x48
  under the shelf): face at the bottom middle.
- `layout(V)` 192, `drawShelves(ctx,V)` 232, `step(dt,V)` 250,
  `draw(ctx,V)` 254. No alpha fills yet.
