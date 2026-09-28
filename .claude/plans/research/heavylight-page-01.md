# heavylight-page · 01 frame (phase 1 research, 2026-09-26)

## Tile recipe to copy locally (from js/gdworld/gd-heavylight.js)

- Palette line 7: D `#04253c` fill, O `#143f5e`, M `#306082`, L `#5a86a5`;
  back wall BK `#041522`, specks BS `#0a2335`. Priority D<O<M<L: a pixel
  only takes a lighter colour; null (transparent) stays null.
- Mask bits (lines 223-230): 1 N, 2 E, 4 S, 8 W = that side is EMPTY.
  16 NE, 32 SE, 64 SW, 128 NW = inner corner (both sides solid, diagonal
  empty). Off-grid counts solid, so nothing rims at the screen edge.
- One 16x16 tile (lines 21-68): fill D; speckle O where
  hash1(v*4099+i)<.035; N rows d=0..2 FLAT[d]=L,M,O at (u,d); S the same
  at (u,15-d); E: SIDE[u%3][d] at (15-d,u) d=0..4 with SIDE =
  {0:L L M M O, 1:L M M M O, 2:null L M O O}; W mirrored at (d,u). Outer
  corner pixel null where two exposed sides meet. Inner corner NUB
  [dx,dy,c]: L (0,0)(1,0)(2,0)(0,1)(0,2); M (3,0)(0,3)(1,1); O
  (4,0)(0,4)(2,1)(1,2)(5,0)(0,5), mirrored by [16:fx1 fy0, 32:1 1, 64:0 1,
  128:0 0]. Cache key m*4+v, v 0..2. Back wall drawn behind rim tiles so
  notches show BK.
- Back pattern (lines 70-108): 16x16 BK with BS specks (h<.05, or h<.12
  when the left neighbour is a speck: 2 px dashes), 4x4 tiles per
  createPattern, aligned with setTransform. Not needed for the toy: the
  page background shows through notches instead (art rule: dark fill never
  meets empty, but a notch is the back wall, so paint BK behind each rim
  tile only).

## Placing shelves (conclusus.js layout, lines 88-112)

- Blocks carry `el` (play.js:90): target by `b.el.matches('.embed-shell')`,
  `video[src*="lamps"]`, `img[src*="journal"]`. Free width right of a
  block = V.W-24-(b.x+b.w); skip under 100. Re-layout on sigOf change
  (blocks.length/docH/main.w/W) because blocks re-measure at load and
  +800 ms. Screen y = docY - V.sy; cull outside sy-120 .. sy+H+120.
- Take: three shelves, one per target block, x = block right + 40,
  y = block bottom - 4 (bottom-aligned like conclusus), width in whole
  tiles; if the target is missing, the nearest media block; if the free
  width is under 100 the shelf hugs the right corner mass instead.

## play.js facts that shape the frame

- Reduced motion: setup then one draw with dt 0, no resize/scroll after.
- atRest true + 5 s no input parks the loop at ~10 fps; scroll wakes it.
- V.top is the topbar bottom: the top corner masses sit below it? No:
  masses are the frame, they start at y 0 and the topbar overlays them.

## Framing (INSIDE, from intake)

Dark masses own the corners, the centre stays open, one bright slash
crosses it. Take: corner L-masses 4 tiles along each edge, 2 tiles deep,
middle of every edge open; lamps mounted on the inner faces.
