# Review: HUD C25 phase 6 (51b6e21..4d8bc40) against p6a-p6e and plan phase 6

Verdict: 4 gaps.

## Gaps

### 1. Measurement runs on every frame in the bridge's rAF loop and allocates heavily (owner's CPU concern; p6a "Cheap")
`js/hud/hud-c25.js:93-94, 97-103`. p6a asks to record every drawn text per frame and to keep it cheap. Every `text()` call now:
- calls `c.measureText(str)` a second time (line 93). Line 76 already measured the same string with the same font and letter spacing,
- calls `scrBox`, which allocates a DOMMatrix (`getTransform()`), 4 point arrays, 1 mapped array, 4 more arrays from `pts.map` passed to `Math.min/max(...)` spreads, plus a result array,
- pushes a new object and a `str.slice` string.

All of this runs in the dynamic layer of every frame, on every page load with `?c25=1`, but only `report()` (hudshot) ever reads it. With roughly 100+ live texts that is thousands of short-lived allocations and 100+ extra text layouts per frame. `shape()` (line 98) adds an IIFE and an `Object.assign` per call, and the heat bar calls it twice per frame (line 470).
Failure: idle bridge at 60 fps does measure-only work and GC churn on every frame, forever.
Smallest fix: (a) reuse the first measurement: `const m = c.measureText(str), w = m.width;` and read `m.actualBoundingBoxAscent/Descent` from it; (b) gate the `txD` and `shD` pushes, and the `scrBox` call, on a probe flag (for example `api.probe`, set by hudshot or by `report()` before it forces one `draw` with the last env). Keep the static layer recording as it is, because it runs once. (c) In `scrBox`, compute min and max inline with no arrays.

The cabin trace smoothing (line 444) also allocates a new 60-entry array and does about 900 adds per frame. That is minor. It could be cached per `RF.cabTrace` identity.

### 2. textHits pad is looser than p6c asks; p6d forbids loosening
`js/hud/hud-c25.js:830, 837`. p6c: "pad pairs so labels closer than 4 px * ts count as a hit". The code uses `pad = 4 * s`. It also applies the pad only to pairs that overlap vertically (`oy > 0`). Other pairs keep 1 px.
Failure: at 1366x768 (s 0.683, ts 0.9) the code accepts gaps of 2.74 to 3.6 px between same-row labels that the spec counts as hits. At 1440 it accepts 2.88 to 3.6 px. It also accepts any vertically stacked pair 1 to 3.6 px apart. The textHits = 0 results in p6c, p6d and p6e were measured with this looser check.
Smallest fix: `pad = 4 * ts`, applied to both axes: `ox > -pad && oy > -pad`. Then re-run the p6d acceptance sizes.

### 3. The log can still print "bearing NaN" (p6e: "never nan/undefined")
`js/bridge/bridge-voice.js:28` guards with `L.brg != null`, which lets NaN through. `js/hud/hud-c25.js:708` writes `HM.live.brg = Math.round(o.brg) % 360` with no finite check. The NaN root cause is not visibly fixed. Line 703 only overwrites `o.brg` with `brgOf(o.blips[0])`, and that is NaN whenever `HM.blipAngle` or `x.dist` is NaN.
Failure: any NaN in the blip or aim inputs gives "bearing NaN · drift ..." in the log, the bug p6e was opened for.
Smallest fix: in hud-c25.js:708, write only `if (Number.isFinite(o.brg)) HM.live.brg = ...`, so the last good value stays. In the voice, use `L && Number.isFinite(L.brg) && Number.isFinite(L.slip)`.

### 4. Wing and log disagree in the last half degree, and the wing and report can show 360
`js/hud/hud-c25.js:206` (wing: `String(Math.round(b0))`), `:708` (log: `Math.round(o.brg) % 360`), `:713` (report: `Math.round(o.brg)`). `brgOf` returns values in [0,360).
Failure: for a bearing of 359.5 to 359.99 the wing prints "brg 360" and `report().left.brg` is 360, while the log prints "bearing 000". That breaks p6e "same bearing the wing shows" and p6b "brg is 0-359".
Smallest fix: one helper, `const brgInt = b => Math.round(b) % 360`, used at 206, 708 and 713.

## Hunks the specs did not ask for
None outside the specs. Every 2000x1009 change is allowed:
- "hot 80" moved (x1+4,997 to x1+16,984; p6c item 5, all sizes).
- Cabin trace smoothing (item 6).
- Fuel "%" 6 px left at ts == s. p6c item 1 allows this because judge-1 line 44 says "2000: touching".
- Bearing and drift value changes (p6b and p6e, values only).

Every other move is gated on `ts > s + 1e-6`.

## Checked, no gap
- No name was renamed or removed. `HudModels.live` exists (hud-models.js:22, 269), and the c25 writes only add `brg` and `slip`. The voice falls back to the old line when C25 is off (`B.c25` needs `?c25=1`).
- The voice line cannot throw: `slip` is always written together with `brg` as a `Math.hypot` result.
- `report()`: the existing fields are unchanged. Added: `span.box`, `textMin`, `textHits`, `paint` (`outside` and `wing`). `blk === 4` is the span block (paintAll order).
- `driftOf` now gets `Instruments.now` (line 699).
- hudshot prints the `modes:` line.

## Not checked
- `leftLamps(..., now)`, `o.sweep`, `speedT` and `gFlip` in `leftNow` still use `performance.now`. This code predates the diff and is not changed by it; `leftLamps` uses `now` only for lamp on-times.
- I re-ran no hudshot runs, because they need a browser or server, which this review must not start. So I did not confirm whether gap 2's corrected pad surfaces real hits at 1366 or 1440, or whether `#bridge-modes` meets the span box.
- I judged no screenshots.
