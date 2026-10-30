# dp-2e report

Commit 5880381 on branch (index.html, css/style.css).

Changes
- index.html: `#ink-cluster` symbol redrawn: 2 lumpy filled blots, 3 drips, 1 flung tapered flick, 14 small ellipse flecks. Fill only, no line/stroke.
- css/style.css: `--wash` now `linear-gradient(170deg, #605c55, #44403a)`; `--slab-scrape`, `--slab-scrape-even` (mirror) have 3 uneven notches per end (tear, x0.5, x0.4 / x0.6), `--slab-scrape-tall` has 3 uneven notches top and bottom (min(tear,24px) deepest).
- Sheet (scratchpad, not committed): symbol and `.col` token copies updated; wash comes from linked style.css; shot.py writes dp-sheet-3.png.

Wash sample (ref 1 grey ground, median RGB): (89,93,90) upper-left, (79,81,80) left edge, (55,60,60) lower-left; target ~lum 75-80. New midpoint approx (82,78,71), lum ~78.

Checks
- snap compare dp-before dp-2e: 86/87 same, glimpse-card-phone 2.84% DIFF. It is a flake: a fresh capture dp-2f vs dp-before is 87/87 same (and dp-2e vs dp-2f differs on that scene only). Tokens are used by no scene.
- dp-sheet-3.png (C:/Users/Traff/AppData/Local/Temp/dp-pass/sheet/): B deepest notch measured 25 px on both ends.
- Picture: A (8 px) slabs nearly straight with small nicks; B (25 px) ragged 3-notch ends; C (45 px) deep jagged ends. Ink reads as splatter, though the blots with drips look slightly like mushrooms/trees; wash is clearly lighter and strokes show.

Not done / notes: none. Context fine.
