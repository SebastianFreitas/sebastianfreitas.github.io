---
paths:
  - "js/world/**/*.js"
  - "js/genesis/**/*.js"
  - "js/gdworld/**/*.js"
  - "js/ship/**/*.js"
  - "js/lib/paint.js"
---

# Art style

Every drawn place (Rex kingdoms, Mainland factions, anything new) uses one
style. Reference: the Bone Spire in `js/world/art/bonespire.js` and the
Titans cave in `js/world/art/titans.js`.

- Stylised 2D silhouettes, flat palette fills.
- Light from the left. Shadows are hard-edged flat shapes (a `litShade`
  split, roughly the right 70% of each volume), never gradients.
- No rim lines, outlines or brick lines on buildings. Exception, owner's
  call (2026-09-25): HeavyLight's Game Dev tiles (`gd-heavylight.js`) keep
  the game's light rim on every exposed side; dark fill never touches empty
  space; the ceiling and floor masses run to the top and bottom screen
  edges (no black sky), and the tiles and the zone art round the HeavyLight
  planet share one pixel scale (`GdWorld.P.heavylight.px()`, 3 px per art
  pixel on desktop).
- Soft glow only for things that emit light (lanterns, portals, flames).
- Places are proper buildings, not symbols or sigils.
- The primitives are in `js/lib/paint.js`; never add another `litShade`.
  Shared building helpers go in `rex-kit.js` / `land-kit.js`.

## Marks stay findable

Beacons, planets and depth nodes are what the visitor hunts for; the
backdrop never competes with them.

- The mark is the brightest, most saturated thing near it. Backdrops stay
  dark and low-contrast; colour is an accent, not a field.
- A mark's colour contrasts with its place's backdrop in value (light on
  dark), not only in hue: red nodes on a red place get a light core and
  rim (`planet.js` themes).
- No point lights, rings or discs in backdrop art that could be mistaken
  for a mark (no rotating lamps, no small glowing orbs at mark size).
- Busy or bright elements fade out round every visible mark: Game Dev
  painters multiply their alpha by `G.clearBox(x, y, hw, hh)` from
  `gdworld.js`. Props sit on the floor band (below `GROUND`), not in the
  band where marks float (0.16–0.66 H).
- Every Game Dev mark sits on a dark backing pool (`Planet.draw`); do not
  remove it.
- Check it on the `bridge-gamedev-*` snapshots: every mark must be found
  at a glance.

- The implementer never sees this file: copy the rules that apply into
  the spec's Style section.
