# D48 smoke wash, cell A

Pure CSS, no JS/images. Paste as `--smoke`; use `background: var(--smoke), var(--wash);` (fallback = plain `var(--wash)`).

```css
--smoke:
  radial-gradient(ellipse 60% 55% at 18% 24%, rgb(214 206 188 / 0.13), transparent 70%),
  radial-gradient(ellipse 50% 60% at 78% 18%, rgb(0 0 0 / 0.16), transparent 72%),
  radial-gradient(ellipse 70% 50% at 62% 72%, rgb(206 198 180 / 0.10), transparent 70%),
  radial-gradient(ellipse 45% 55% at 10% 85%, rgb(0 0 0 / 0.14), transparent 70%),
  radial-gradient(ellipse 35% 40% at 45% 45%, rgb(0 0 0 / 0.08), transparent 70%);
```

Files (sheet: dp-pass/sheet/dp-sheet-5.html, script shot5.py):
- p4/wash-sheet.png: 1440x900, cell A (smoke) left, cell B (flat --wash) right, each with .slab title and body paragraph; smoke is soft and low-contrast, strokes and text read fine in both. Effect is subtle (large light/dark patches); raise alphas ~1.5x if it needs to read more.
- p4/wash-a-zoom.png: cell A at 2x device scale, 1:1 crop; smooth gradients, no grain or streaks (radial gradients only, no noise). Not opened by me beyond the main sheet.
