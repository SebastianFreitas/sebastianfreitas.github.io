# Look judge: hud-c25 phase 6 "Sizes, last look check", round 1

Reference: memory `hud-c25-approved.png`. Statements judged: 1, 2, 3 at 2000x1009 and 1440x900; 1366x768 judged on the "Judged on" line (evenly scaled, text >= 0.9, nothing cropped).

## 2000x1009

First reactions:
- plain: Same HUD as the reference: span line under the top bar, two gold wings at the bottom corners, log in the middle. The span line is emptier (one tick, long cream bar).
- read1: Bar now runs further right to a new tick, a faint dot sits where the old tick was; "331 km".
- x3000: The pin has slid to the far left end of the line; "229 km".
- gore: Spires and a red sun; span line full of small ticks, all read; left wing shows brg 090, peak 80, a field arrow in the rose.
- burn: Top bar gone (only the span line at the top), exhaust trail behind the ship, fuel 78 %, thrust heat 100 %, many right lamps lit.

1. Same HUD as reference: **yes**. Span line, both wings and the log sit in the reference's places and shapes; every rail, the radar disc, fuel slope, ship side view, lamps rows and the outside row are there. Differences a viewer would notice but not call a different HUD: "brg" sits at the left end under its rail (reference: right end, above); the rose number sits below the rose (reference: to its right); the span line at start carries one tick only.
2. Flying changes it: **no**.
   - span (plain vs x3000, plain vs read1): yes. Pin moves 260 -> 200 px, distance 214 -> 229 km; after read the old tick is a faint dot and the next tick lights with "331 km".
   - right wing (plain vs burn): yes. Fuel 100 % full -> 78 % 0:10 left, thrust heat 0 % -> 100 % with the floor bar filled, bus 4.2 -> 12.3 kW.
   - left wing (plain vs gore, and burn): bearing yes (brg 000 -> 090); **drift no**: "0.0 m off in 5 s", "lat +0.00", "vert +0.00" are identical in all five shots, reticle unchanged, even during the burn.
3. Which way / how far from the span line alone: **yes**. Pin "you" at the left, cream bar runs right to a raised tick, "214 km" under the bar: east, 214 km.

## 1440x900

First reactions:
- plain: A clean scaled-down copy of the 2000 shot; wings smaller, the log text proportionally bigger.
- read1: Same change as at 2000: faint dot at the old tick, bar to the next tick, "331 km".
- x3000: Pin at the far left end, "229 km".
- gore: Spires; left wing top row crowded ("field one source" runs into the "peak 80" chevron).
- burn: Top bar gone, trail behind ship; log reads "bearing 27,333 · drift 5310 m/s" while the wing still shows brg 000 and drift 0.0.

1. Same HUD: **yes**. Same layout, evenly scaled, nothing missing or cropped.
2. Flying changes it: **no**. Span yes (pin slides, dot after read, next tick lit with distance); right wing yes (100 % -> 78 %, heat 0 -> 100 %, bus 4.2 -> 11.7 kW); bearing yes at gore (000 -> 090) but **drift no** in any shot, and during the burn the log itself says drift 5310 m/s and bearing 27,333 while the wing shows "0.0 m", "lat +0.00", "vert +0.00", "brg 000".
3. Way and distance: **yes**. "you" at left, bar right to the tick, "214 km" under it.

## 1366x768 (Judged-on line only)

First reaction: Whole HUD present and in proportion, right wing ends just inside the edge; small but legible.
- Evenly scaled: yes (wings ~0.95 of the 1440 widths, same layout).
- Text at least 0.9 size: yes by eye; lamp labels are the smallest but readable (measured 0.9).
- Nothing cropped: yes; "co2 499" and the cabin rail end inside the frame, "vert +0.00" inside the bottom.
- Touching labels: see list below.

## Phase 5 watch items

- Fuel "%" against the ship's tail point at 100 %: **still holds**. 2000: touching; 1440 and 1366: the "%" overlaps the tail point. Also near at 78 % (1440 burn).
- "gnc" butts "spare" at 1440: **still holds** (also at 1366; small gap only at 2000).
- "hot 80" a row lower than reference: **still holds** at all sizes (sits under the heat floor, below "thrust heat", reference has it on the same row).
- Cabin trace denser than reference's gentle wave: **still holds** at all sizes (tight zigzag, not a slow wave).

## Other labels touching or reading as one (D26 hand-placed spots)

- "outside" + "rad" (outside row): reads "outside rad" as one label at 1440 and 1366 (clear gap at 2000).
- "30m" + "set 21.0" (cabin rail foot): run together at 1440 and 1366.
- "field one source" + "peak NN" chevron: touch at 1440 in the gore shot (rose label row vs peak bar).
- "resonance" + its arrow glyph: arrow sits against the word's end at 1440 (read1, x3000).
- "28.1 V": the "V" touches the volts rail chevron/cell row at 1366.

## Verdict: FAIL

Statement 2 is no at both sizes; 1 and 3 are yes at both; 1366 meets the Judged-on line apart from the crowding above.

Reasons, most important first:
1. The drift readout never moves: "0.0 m", "lat +0.00", "vert +0.00" and the reticle are the same in every shot, including a burn where the log reports drift 5310 m/s; the wing's "brg" stays 000 there too.
2. At 1440/1366 the fuel "%" sits on the ship's tail point and several label pairs read as one ("outside rad", "30m set", "gnc spare", "field one source/peak").
3. Small differences from the reference remain: "hot 80" a row low, cabin trace a dense zigzag instead of a gentle wave, "brg" moved to the left end of its rail.
