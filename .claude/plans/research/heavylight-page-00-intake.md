# heavylight-page · 00 intake

## Current code (from Explore, 2026-09-26)

- `js/pages/heavylight.js` (326): viewport-space toy, four corner lamps
  (BL pushes right, BR lifts, TR carries left, TL drops), 56 px click
  boxes, ON_FOR 8 s, wedge HALF0 20 to HALF1 40 with two flat fills
  `rgba(0,43,255,.20)` + core `rgba(140,180,255,.12)`, fade in the last
  second, timer bar. Six 42 px crates + a red investigator; page blocks
  ignored, screen-edge walls, pairwise AABB. No tiles, no occlusion.
  XP `play-heavylight` on first click. Exports `window.PlayHeavyLight.report`.
- `js/pages/play.js` (233): full-screen fixed canvas behind the page,
  V has W H dpr top sy main band blocks (document space, `media` flag)
  reduced free; presses only on body/html/main.case; under 900 px hidden;
  reduced motion = one still frame; `sprite/blit/glow/award`.
- `js/pages/conclusus.js` (698, MAP says 499): document space, seeded
  `layout(V)` puts platforms to the right of each page block (skip if
  under 100 px free), media blocks get two, 90 px vertical spacing; gutter
  and corners unused; no backdrop; silhouettes, keys, door, spikes;
  motes from top-right; scripted camera-follow teleport, timed platforms
  on fast scroll; XP play-conclusus, cc-timed, cc-key1..3, cc-win.
- Bridge beam, `js/gamedev/zones.js` (543): `BEAM {x58,y58,half6,ang42,
  spread6,over24}`; one flat trapezoid from the lamp face, upper edge
  ang-spread, lower edge ang+spread, ending 24 units *below the screen
  bottom* so no beam end is ever visible; fill
  `rgba(110,160,240, .20+.03*sin 3.1T)`; crates drawn before the beam so
  the light lies on them; head glow r26; crates in the beam lerp velocity
  to 300 px/s along the beam, max 4, life 10 s. This is "the single light"
  the brief means: no clipping because the wedge leaves the screen.
- Tiles, `js/gdworld/gd-heavylight.js` (256): `px()` 2..3, T=16*p, 4-bit
  edge mask + 4 inner-corner bits, rims 3 deep top/bottom (L,M,O) and 5
  deep on the sides with a notch, outer corner px transparent, cache per
  mask, `backPattern` for the void, open band 0.18 to 0.79 H, off-screen
  rows solid. Published `G.P.heavylight = {base, layers:[{par:.7, paint}], px}`.
- `HSPR` in zones.js: 16 px floor, wall, pillar, plat, drip tiles, h_box
  14x14, h_lamp 13x16 (one red px), h_lan1-3.
- Art rules: light rim on every exposed side, dark fill never touches
  empty space, masses run to the screen edge, 3 px per art px, hard flat
  shadows, no gradients, soft glow only for emitters.
- `projects/heavylight.html`: 34 blocks in main.case (hero embed, lamps
  video, journal image, nine text sections), scripts at `?v=140`.

## Web research (2026-09-26)

- **2D visibility and shadow casting** (ncase Sight and Light, Red Blob
  2D Visibility, Coding Train ray casting): cast rays only at segment
  endpoints (plus/minus epsilon), sort by angle, build the lit polygon,
  fill it. A wedge light is the same polygon clipped to the cone. Cost
  is tiny for a few rectangles. Fuzzy edge = several polygons from
  offset origins. Take: if we do occlusion, it is an endpoint-ray
  polygon clipped to the cone, one flat colour, no gradients, computed
  only while a lamp is on.
- **Playdead INSIDE and LIMBO**: rays as slashes through dark,
  silhouettes in front, a vignette darkening the edges; the light *is*
  the composition and every scene has one bright slash. Take: one lamp
  on at a time, the beam is the brightest thing on the page, crates read
  as silhouettes with the beam lying on them.
- **Chain reactions** (Fischli and Weiss "The Way Things Go", Rube
  Goldberg): each device triggers the next; the joy is anticipation and
  the small pause before the handoff. Take: events 2 and 3 as handoffs
  between lamps, with a visible beat between links.
- **Autotiling** (Tuts+ bitmasking, Red Blob autotile): our 4-bit plus
  inner-corner masks already cover every shape we need; the frame
  problem is solved by letting solid masses run to the screen edge and
  never leaving a dark fill against empty space. Take: corner masses are
  full autotile blobs anchored to the viewport edges; centre pieces are
  floating slabs with rims on all four sides.

Sources: ncase.me/sight-and-light; redblobgames.com/articles/visibility;
thecodingtrain.com/challenges/145-ray-casting-2d; gamedev.net "Walls and
Shadows in 2D"; pixelfondue.com INSIDE lighting; GDC Vault "Low
Complexity, High Fidelity - INSIDE Rendering"; Wikipedia Rube Goldberg
machine; code.tutsplus.com tile bitmasking; redblobgames.com/articles/autotile.
