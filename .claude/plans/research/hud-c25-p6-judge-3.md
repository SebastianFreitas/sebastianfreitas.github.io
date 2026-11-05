# Look judge: hud-c25 phase 6, round 3 (confirmation)

Reference: memory `hud-c25-approved.png`. Shots: `snapshots/p6g/`. Judged: Pass test 1 and the Judged-on line at 1440x900; the Judged-on line only at 1366x768 (evenly scaled, text >= 0.9, nothing cropped). Also checked: the heat label is clear of its bar, and nothing new touches. Statements 2 and 3: not judged at this phase (2000 not re-shot).

## 1440x900

First reactions:
- plain: Same as round 2. "thrust heat" now sits clearly above the floor bar, with air between them.
- burn: Ship nose-down with a bubble trail; heat 61 % with the bar filled under the label, and the label reads clean. The log reads "bearing 090 · drift 0.12 m/s" while the wing reads "brg 086".
- gore: Spires and red sun; "field one source" and "peak 80" are separate, and the peak bar under "peak" touches neither.

- Pass test 1 (same HUD): **yes**. Span line, both wings, log, lamps and outside row are in the same places and shapes, with nothing added or missing.
- Evenly scaled: **yes**. It is a clean scaled copy of the layout.
- Text >= 0.9: **yes**. The lamp labels are the smallest text but they are readable.
- Nothing cropped: **yes**. Every log line is whole ("no contact" ends well before the heat bar), and "co2 620" and "cabin" sit inside the edge.
- Heat label clear of its bar: **yes**. In the burn shot "thrust heat" sits a full row above the filled bar.
- Nothing new touching: **yes**.

## 1366x768 (Judged-on line)

First reactions:
- plain: The whole HUD is in proportion, small but legible. The heat label sits above its bar.
- burn: The ship is nose-down. The log's bottom line reads "filter reset · 7 samples discard…", cut off with an ellipsis, and the line above it still says "! bearing nan" while the wing says "brg 079".
- gore: Spires. The log line "! strain 2,536 µε · sector 8 · impulse · no contac" loses its last letter against the heat bar area.

- Evenly scaled: **yes**. The layout is the same as at 1440, a little smaller.
- Text >= 0.9: **yes**. Small but readable.
- Nothing cropped: **no**. In the gore shot the log's "no contact" is clipped to "no contac". In the burn shot the main log line is cut to "discard…". The wing edges are fine.
- Heat label clear of its bar: **yes**. In the burn shot the label sits above the filled bar (heat 61 %).
- Nothing new touching: **yes** in the wings. The log text runs into its right edge (the cropping above).

## Claimed fixes

- Heat label above its bar: **fixed** at 1440 and 1366.
- Peak bar at the chaos site: **clear** of "field one source" and "peak 80" at both sizes.
- Log and wing share one bearing: **not visible**. At 1440 the burn log says "bearing 090" while the wing says "brg 086". At 1366 the burn log still prints "bearing nan" while the wing says "brg 079".

## Watch items

1. Log and wing bearings still disagree, and "nan" still shows (see above).
2. At 1440 and 1366 the first digit of the big fuel "100" still sits against the volts slope line.
3. In the gore shots "width ±7°" and "2nd 301 faint" sit very tight on top of each other.

## Verdict: FAIL

1. At 1366 the log text is cropped: "no contac" in gore, and "discard…" cut off in burn.
2. Log and wing still show different bearings, and the log still shows "nan" at 1366 (this is not a named statement, but the claimed fix is not in the pictures).
3. Otherwise round 2 holds: 1440 passes everything, and the heat label is clear at both sizes.
