# conclususReview · 01 · Measure (phase 1)

Run on 2026-09-28 in the worktree, before any page or script change.
Machine: the owner's desktop, headed Chromium, 1440x900, DPR 1. The
panel refreshes every **6.1 ms (~165 Hz)**, measured by the probe loop.

## Tools

- `py -3 tools/scrollperf.py conclusus --bar` → `snapshots/perf/conclusus-20260928-201954.json`
  (3 measured runs, median, plus 1 attribution run with read-site stacks).
- Scratch cadence probe (in `%TEMP%`, not committed): the same scroll, and
  in each refresh it records `scrollY` and whether `canvas.play` was cleared
  (a paint). It also ran at 6x CDP CPU throttle to stand in for a weak laptop.

## D37 bars (median of 3)

| Bar | Value | Result |
|---|---|---|
| p95 frame interval ≤ 18 ms | 6.2 ms | PASS |
| no frame > 50 ms | max 12.1 ms | PASS |
| no layout read inside the toy's frame | 404 reads | **FAIL** |
| toy frame script p95 < 4 ms | 0.30 ms (max 1.1) | PASS |

Other numbers: longtask 0, long-animation-frame 0, layout-shift 0.
CDP deltas over both passes: LayoutCount 284, RecalcStyleCount 740,
Script 56 ms, Layout 27 ms, RecalcStyle 63 ms. The non-toy rAF callbacks
(xp.js and others) had p95 0.1 ms. Each pass took 64 wheel steps.

## Causes, ranked

1. **Paint cadence of the fixed canvas (the visible jank).** The page-bound
   art is drawn on a fixed canvas at `scrollY` from inside Pacer's frame.
   Pacer caps painting at 60 fps, so on this 165 Hz panel the toy paints on
   every 2nd or 3rd refresh. Its paint gaps were 12, 18, 24 and 30 ms, with
   p50 18.2 ms (≈55 fps, uneven). The text moves with the compositor on every
   refresh. **In 63% of the refreshes where the page moved, the toy did not
   repaint**, so for that refresh the platforms, twins and door sat one whole
   wheel step (120 px) away from the text they belong to. At 6x throttle the
   figure was 56%, gaps reached 55 ms and the p95 gap was 24 ms. On any panel
   the art also runs a frame behind the compositor's scroll, because it reads
   the main-thread `scrollY`. D5's pin fixes this cause at its root: when the
   art sits on page tiles, the browser scrolls it with the text, and the cap
   stops mattering during a scroll (phases 3 and 4).
2. **Layout reads inside the toy's frame (the D37 FAIL).** There were 404 per
   scroll. 287 are `window.scrollY` at `js/pages/play.js:99` (`V.sy`, every
   frame). 123 are `topbar.getBoundingClientRect()` at `play.js:101` (every
   frame that scrolled). There was also 1 `getBoundingClientRect` at
   `xp.js:259`, which comes from the award mote and is not a toy read. They are
   cheap here, because the layout is clean when the frame reads it (Layout
   27 ms over the whole scroll). They force a synchronous layout whenever
   something dirtied the styles first. Phase 5 fixes them: a cached `V.sy`
   from a passive scroll listener, and the topbar read on resize only (D64).
3. **CPU headroom on weaker machines.** At 6x throttle the toy callback p95
   rose to 1.0 ms (max 5.9 ms) and the probe's max frame to 30 ms. Both are
   still inside D37, but the 4 ms line has less than 2x margin at the max. The
   suspects in phase 5 (glow rebuilds, particle bursts) do not run in a
   scroll-only script: the glow cache and the burst cap are guards, and this
   run did not measure them.
4. **Not observed.** There were no long tasks, long animation frames or layout
   shifts, and no expensive non-toy rAF work. The idle park (10 fps timer) and
   the XP animations did not show up in a continuous scroll: Pacer is woken by
   input, and the award fires once.

## Caveats

- On a 165 Hz display the probe measures the refresh rate, not the toy.
  The "p95 ≤ 18 ms" and "no frame > 50 ms" bars pass even while the art
  visibly lags. Phase 10's final measure should also check the toy's paint
  gaps and the fraction of moving refreshes left unpainted. After phase 4
  both should stop mattering for page-bound art.
- Playwright's `mouse.wheel` lands as whole 120 px jumps (scrollY changed in
  122 of about 700 refreshes), not Chromium's animated smooth scroll. The
  owner's real scroll is spread over more refreshes, so cause 1 is felt
  as a trailing shimmer rather than whole-step jumps.
