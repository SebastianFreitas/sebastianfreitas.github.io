# Look judge: hud-c25 phase 6 "Sizes, last look check", round 2

Reference: memory `hud-c25-approved.png`. Statements judged: 1, 2, 3 at 2000x1009 and 1440x900; 1366x768 judged on the "Judged on" line only (evenly scaled, text >= 0.9, nothing cropped). Round 1 report: `hud-c25-p6-judge-1.md`.

## 2000x1009

First reactions:
- plain: Same HUD as the reference; span line under the top bar, gold wings in the bottom corners, log in the middle; fuel "100 %" now stands clear of the ship's tail.
- read1: Faint dot where the first tick was, bar runs on to a new raised tick, "331 km".
- x3000: Pin at the far left end of the line, "229 km".
- gore: Spires and red sun; span line all small dots, pin partway along; left wing shows peak 80, width ±7°.
- burn: Ship swung nose-down with a bubble trail; left wing now shows "3.1 m", "lat +0.35", "vert +0.50" with the reticle arrow off-centre; fuel 92 %, heat 61 %.

1. Same HUD as reference: **yes**. Span line, both wings, log, lamps rows, outside row, radar disc, fuel slope, ship side view all in the reference's places and shapes. Small differences that do not make it a different HUD: "brg" sits at the left end under its rail (reference: right end), the rose number sits left of / below the rose (reference: right), the cabin trace is now an almost flat line (reference: a gentle wave). "hot 80" is now on the "thrust heat" row, as in the reference.
2. Flying changes it: **yes**.
   - span: plain vs x3000, pin slides from ~260 to the left end, 214 -> 229 km; plain vs read1, old tick becomes a faint dot, the next tick lights with "331 km".
   - left wing: plain vs burn, drift "0.0 m" -> "3.1 m", lat +0.00 -> +0.35, vert +0.00 -> +0.50, reticle arrow moves; brg 090 -> 091. Gore vs plain: peak/str/width change, brg and drift unchanged (ship at rest).
   - right wing: plain vs burn, fuel "100 % full" -> "92 % 0:23 left", thrust heat 0 % -> 61 % with the floor bar filling, bus 4.2 -> 9.2 kW, lamps lit.
3. Way and distance from the span line alone: **yes**. "you" pin at the left, cream bar runs right to a raised tick, "214 km" under the bar: east, 214 km.

## 1440x900

First reactions:
- plain: Clean scaled copy of the 2000 shot; labels now have air between them.
- read1: Faint dot mid-line, bar runs on to the next tick, "331 km".
- x3000: Pin at the far left end, "229 km".
- gore: Spires; "field one source" and "peak 80" now separate.
- burn: Ship nose-down with trail; left wing "4.7 m", "lat +0.38", "vert -0.87", "brg 086"; right wing 93 %, heat 61 %. The heat floor bar runs through the "thrust heat" label.

1. Same HUD: **yes**. Same layout evenly scaled, nothing missing or cropped; at this size "thrust heat" sits one row above its value (reference: one row), a small layout difference only.
2. Flying changes it: **yes**. Span: pin to the left end with 214 -> 229 km; read1 faint dot plus next tick lit "331 km". Left wing: drift 0.0 -> 4.7 m, lat/vert move, reticle moves, brg 090 -> 086. Right wing: 100 % -> 93 % "0:23 left", heat 0 -> 61 %, bus 4.2 -> 8.6 kW.
3. Way and distance: **yes**. "you" at left, bar right to the tick, "214 km" under it.

## 1366x768 (Judged-on line only)

First reaction (plain): Whole HUD present and in proportion, small but legible, right wing ends inside the edge.
First reaction (burn): Straight east burn with a long trail over a spire field; fuel 78 % 0:10 left, heat 100 %; log line reads "! bearing nan".
- Evenly scaled: **yes**; same layout as 1440 at a slightly smaller size.
- Text at least 0.9 size: **yes** by eye; lamp labels smallest but readable.
- Nothing cropped: **yes**; "co2 499/625", cabin rail and "vert +0.00" all inside the frame.

## Round 1 items

- Drift never moves: **fixed** (2000 burn 3.1 m, 1440 burn 4.7 m, lat/vert and reticle move).
- Fuel "%" on the ship's tail: **fixed** at 2000 and 1440; at 1366 it is close but clear.
- "outside rad", "30m set", "gnc spare", "field one source/peak", "resonance" arrow, "28.1 V": **fixed**; all have a visible gap at 1440 and 1366.
- "hot 80" a row low: **fixed** at 2000 (same row as "thrust heat"); at 1440/1366 "thrust heat" moved up a row instead.
- Cabin trace a dense zigzag: **changed**; no longer a zigzag but now almost flat, not the reference's gentle wave.
- "brg" at the left end of its rail: **unchanged**.

## Watch items (do not fail the named statements)

1. At 1440 and 1366 during a burn the filled heat floor bar runs through the "thrust heat" label (it moved up onto the bar's row), making the label hard to read when it matters most.
2. Bearing barely moves while the nose is visibly swung ~60° down (090 -> 091 at 2000, -> 086 at 1440); it reads as travel heading, not where the ship points. A viewer may expect more.
3. Log and wing disagree in places: 1440 burn log "bearing 090 · drift 0.12 m/s" vs wing "brg 086 · 4.7 m off in 5 s"; 1366 burn log prints "bearing nan"; plain log says "open span · nothing charted here" while the span line shows a lit tick at 214 km.
4. At 1366/1440 the big fuel number's first digit sits right against the volts slope line.
5. Cabin trace now almost flat versus the reference's gentle wave.

## Verdict: PASS

Statements 1, 2 and 3 are yes at 2000x1009 and 1440x900; 1366x768 meets the Judged-on line.
