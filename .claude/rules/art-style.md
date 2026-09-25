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
- No rim lines, outlines or brick lines on buildings.
- Soft glow only for things that emit light (lanterns, portals, flames).
- Places are proper buildings, not symbols or sigils.
- The primitives are in `js/lib/paint.js`; never add another `litShade`.
  Shared building helpers go in `rex-kit.js` / `land-kit.js`.
- The implementer never sees this file: copy the rules that apply into
  the spec's Style section.
