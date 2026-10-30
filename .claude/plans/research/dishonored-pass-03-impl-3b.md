# dp-3b report

File changed: css/bridge.css only. Not committed (caller commits).

- Tiles: `.tinst-wrap::before` rgb(4 4 5) opacity 0.45, tilt -1.5 -> -3deg, rotate 0 under reduced motion.
- Measured `.tinst` 380x281 (DOM). Lift = 380 x 0.026 = 9.9px at -3deg. Rotated bbox (+inset) x 19..425 / 1015..1421, y 585..894: only #bridge-canvas overlaps (no readings/neighbours). Tilted, not straight.
- Modes panel ::before rgb(4 4 5) opacity 0.92.
- Folder button: transparent, `::before` plate with --slab-scrape-even, cream text, no border; hover plate becomes --type-tag-bg. I also raised resting opacity 0.18 -> 0.6 (0.18 made the plate grey; not in spec, flag).
- `.tl.warn`: gold tint and bar removed; 1px --type-red inset hairline. `grep -c "rgba(229,166,60" css/bridge.css` = 0.
- Genesis skip/pause/step: `::before` slab-scrape-even plates, no border.
- Notices: `#bridge-hint` (the "HOLD ANYWHERE" text) plate opacity 0.85 slab-scrape-even, padding, cream; `.bridge-scroll` (THE WORK) plate slab-scrape-tall 0.85; `.rotate-inner` plate slab-scrape 0.85 + padding.

Checks
- compare dp-2g dp-3b: only bridge-*/genesis-* differ, plus glimpse-card-phone 2.84% (was 2.84 on first capture, not in the 375 compare: 0.00% same, so width/baseline mismatch) and rank-card-phone 0.87% (first capture 0.28%; flicker, I did not touch those pages). 
- dp-3b-375 vs dp-before-375: DIFF only bridge-phone-landscape (1.33%), -bnote (1.13%), bridge-phone-portrait (34.17%).
- dp-3b-rm captured (bridge-void-unclaimed), transform none by CSS rule; not inspected pixel-wise.
- Flows: `first` pass; `header` failed once (flaky, "top bar never covers start of an opened folder"), passed on rerun (0 failing).
- Pictures copied to C:/Users/Traff/AppData/Local/Temp/dp-pass/p3b/. Read bridge-void-unclaimed (final): hold-hint torn black plate clearly visible; folder plate visible but small; modes panel closed so not seen; tile strokes only faintly visible against the dark ground (0.45 near-black on a near-black wall) - judge may still call them weak.
- Context line not hit.
