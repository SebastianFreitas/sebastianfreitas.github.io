# dishonored-pass: Part C technique notes (2026-10-30, D23)

Read with `dishonored-pass-00-intake.md` "Technique notes" (clip-path
polygons, backdrop-filter wash veil, inline SVG marks, translucent slabs).
One web search (feTurbulence / feDisplacementMap) added only the two
lines below; no source gave a brush-stroke recipe, so the plan's slabs
stay clip-path polygons (the site's `--tab-scrape` pattern, 12 points).

- **Painted wash, not a flat gradient (phase 2, variants B and C).** A
  full-section `<svg>` under the strokes with
  `<feTurbulence type="fractalNoise" baseFrequency="0.004" numOctaves="2">`
  greyed by `<feColorMatrix type="saturate" values="0">`, drawn over the
  `--wash` gradient at 0.15 (B) or 0.3 (C). At 0.004 a blotch spans about
  250 px: big marks, never fine noise (D6). Above 0.02 it reads as grain:
  never go there. Static (no animation, no `seed` change on scroll).
- **Rough edges by displacement (fallback only).** `filter: url(#rough)`
  with `<feTurbulence baseFrequency="0.02">` + `<feDisplacementMap
  scale="12" in="SourceGraphic">` roughens a slab's whole outline. It
  blurs text inside the same element, so it goes on a `::before` only, and
  only if a look check fails on "edges read as cut, not torn"; the
  polygons come first.
- **Tilt stays a transform on the pseudo**, never on text; a tilted
  `clip-path` element also clips its own children, so plates that scroll
  (deep popups) clip the element and do not tilt (D17).

Sources: MDN feTurbulence / feDisplacementMap pages; Codrops "SVG Filter
Effects: Creating Texture with feTurbulence" (2019).
