# dishonored-pass: intake research (2026-10-29)

Web search found no written analysis of the Dishonored pause menu itself
(results were student blogs on the Dishonored 2 loading screen and generic
"immersive pause menu" essays), so this digest rests on the owner's two
reference screenshots as the memory describes them
(`memory/top-bar-remake-from-dishonored-pause-menu.md`), on the games
themselves, and on the one usable web note. Nothing is copied.

## What makes a screen read as Dishonored (pause menu, Dishonored 1)

1. **The frame behind is a painting.** On pause the live frame drops to a
   desaturated grey oil-wash (blurred, low contrast, slightly warm); the
   menu floats over it. A black veil with blur is not the same thing: the
   wash keeps the picture, only drained of colour.
2. **Every item is its own paint stroke.** Menu entries sit on separate
   near-black slabs, each a wide dry-brush stroke: tilted about 3 degrees
   rising to the right, staggered left edges, ends torn, scraped and
   splattered. Slabs are translucent over the wash, not solid.
3. **One cream strip for the selected thing.** The active item is a cream
   paper strip (faint sketched lines on it) with dark text; everything
   else is cream text on black. Only one thing on screen is cream-filled.
4. **Type is tall condensed serif caps, cream, tracked.** Titles and
   items are capitals; nothing is mixed-case display sans. Small text is
   the same family smaller, never a monospace. (The Dishonored 2 loading
   screen uses the same lettering over ink that bleeds; its student
   write-up notes the "messy, bleeding ink" stands for the grimy
   whale-punk city, journal.falmouth.ac.uk/sc247065/?p=930.)
5. **One dark red, as a line.** A vertical black "PAUSE" band carries a
   dark red hairline edge and rotated cream caps; red is a hairline or a
   wax-seal-sized mark, never body text.
6. **A few big marks, no fine noise.** Around the slabs: ink speckles,
   radiating scratch lines, a few shards and drips, each large enough to
   read as a mark. No texture tiles, no uniform grain, no bevels, no
   rounded corners, no 1 px grey boxes.
7. **Dirt is visible.** The owner's bar for Dishonored is "dirty": stains,
   dry-brush, uneven tone (memory `top-bar-dishonored-dirt-not-judge-pass`).
   But painted grime on the top bar read as "bad drawing" and was cut for
   a plain black bar (`top-bar-final-plain-black`): the dirt that survives
   is in the *shape* of things (torn edges, tilt, stagger, a few marks),
   not in a noisy fill.

In ours today: the site already has (2)-(5) in miniature on the top bar
tabs (torn `--tab-scrape` polygons, cream active strip tilted -3deg, the
`--type-red` hairline) and in the action buttons. The rest of the pages
are flat black boxes with 1 px grey rules, mixed-case serif titles, a
monospace kicker/readout layer, a blurred black veil on the gate, and a
dashed placeholder box: those are the "very basic" parts.

## Other precedents worth an option line

- **Thief (2014) menus:** parchment and soot; hand-drawn frames around
  each panel, cream page with charcoal edges. In ours: a cream paper
  panel for the open case file (the "selected" thing) with dark text, if
  one wanted the open folder to flip to paper rather than stay black.
- **Darkest Dungeon:** ink woodcut panels, black with a hard cream edge,
  red used as a thin hairline under headers. In ours: a cream hairline
  along one edge of a slab instead of a full cream strip; the red
  hairline under a section title.
- **Dishonored 2 journal/objectives:** paper notes with engraved
  illustrations, sepia. In ours: a cream paper "note" for the glimpse
  card only (a note handed to the visitor), the rest staying black.
- **Bloodborne / Dark Souls menus:** engraved grey frames, large tracked
  caps, a dim gradient veil. In ours: tracked caps titles (we keep the
  font; case and tracking are the knob) and a wash veil rather than black.
- **Pentiment:** a manuscript page where hand and ink change per
  character. In ours: nothing to take beyond "the page is a surface, not
  a layout" (the slabs should look placed on a wall, not aligned to a grid).

## Technique notes (plain CSS, no images, as `CLAUDE.md` wants)

- Torn/scraped edges: `clip-path: polygon(...)` with 8 to 12 points, two
  or three variants alternated per row (the site's `--tab-scrape` and
  `--tab-scrape-even` already do this); a slab tilt is `transform:
  rotate(-3deg)` on the plate's `::before`, never on the text.
- Painted wash veil: `backdrop-filter: grayscale(1) contrast(0.8)
  blur(2px)` plus a warm black at ~0.55 alpha; the frame behind stays
  visible as a grey painting (Dishonored's pause). Reduced motion and
  phones: the same, static.
- Big marks: one inline SVG per page with 3 to 6 shapes (a speckle
  cluster, two scratch lines, one drip), placed by the section, cream or
  black at 0.3 to 0.5 alpha; never a repeating background.
- Translucent slabs: `rgb(4 4 5 / 0.86)` over the wash so the painting
  shows through the stroke's thin end.
- Contrast numbers: `--type-red` #6e1a1a on #040405 is 1.8:1 (WCAG wants
  4.5:1 for small text); cream #e4ddc6 on the same black is about 15:1.
  So small red words cannot be made legible by size or weight: the red
  must become a hairline, a block behind cream text, or stay a mark.
