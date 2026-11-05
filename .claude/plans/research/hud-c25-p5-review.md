# p5 review (p5a-p5d), diff addfd7c..HEAD -- js/

Verdict: 2 gaps (both come from the same wrong clock in `rightNow`).

## Gap 1: the crit burst on jnt and ring never fires (wrong clock)
- `js/hud/hud-c25.js:714` sets `now = performance.now() / 1000`. Line 732 passes that `now` to `HM.rightLamps(..., now)`.
- `js/hud/instruments.js:512` sets `HudModels.critUntil = t + dur`. Here `t` is the Instruments clock (`Instruments.now`, starts at 0 and only moves while it ticks), and `EVT_DUR.crit` is 5 s.
- `hud-models.js` rightLamps tests `crit = now < critUntil`, so it compares two different clocks. `performance.now()/1000` is ahead of `Instruments.now` by page-load time plus any time the instruments did not tick. Once that lead is over 5 s (that is, almost always), a crit log line never puts jnt or ring into state 2. This breaks the p5a rule and the models file (lines 66-69: crit bursts jnt and ring for its duration).
- The left wing already gets this right: line 686 uses `tn = Instruments.now`.
- Smallest fix: in `rightNow`, pass `tn = window.Instruments ? Instruments.now : now` to `rightLamps`. Also pass it to `busLoads` and `cabTrace` (Gap 2). Keep `performance.now` for the blink only.

## Gap 2: cabTrace steps on the wrong clock and drifts from the cabin readout
- p5a says cabTrace "pushes one sample each 30 s of `Instruments.now`". Line 721 instead calls `HM.cabTrace(now, ...)` with `performance.now()/1000`.
- Result: samples are taken from `cabTAt(perf time)`, but `sys.cabT` (the readout and the old tile) follows `cabTAt(F.now())`, which is Instruments time. The trace's last point and its phase do not match the cabin number shown next to it.
- The trace also keeps sampling while the instruments clock is stopped.
- Line 720's `busLoads(..., now, e)` uses the same clock, so the life share's phase differs from the old bus tile.
- Same fix as Gap 1.
- Minor, same line: chaos comes from `e.chaos` (B.env), while the tile uses `r.chaos` (B.chaosNow). Pass `B_().chaosNow` for consistency.

## Checked, no gap
- Old tiles are unchanged by the lift. `cabTAt` takes the same `fz`, chaos and future. `busLoads` gives the same life/drv/thm/gnc. The tile still adds its own `jitterN`.
- Crash paths are covered. drain 0 is guarded (`st.drain > 0`). cabTrace is prefilled with 60 samples, so `n` is never 0. `rp` is clamped. `RF.bus/6` is clamped. All sys fields read (hullInt, wear, kpa, rh, o2, co2, hx) have writers in tiles-sys.
- The lamp rules match the models file, lines 61-65: drv k, ring > .6, fin t/b by jet sign, bus > 5.0, cell < 3.40, cool > 80, lsp 19.6/1200 lit and 19.0/1800 burst, seal 95.6/92, nav, jnt .6/.85.
- Nothing paints without `?c25=1`. `HudC25.draw` is only called under `B.c25`. The instruments.js line only writes a number. tiles-sys already used HudModels at runtime.
- Accepted and not reported: omega 0 to busLoads and no impact to stress.

## Not checked
- I did not re-run hudshot or nav-flows. I did not look at the screenshots.
- Infinite fuel (`fuelN` 1 while burning shows a finite countdown). The spec does not cover it.
