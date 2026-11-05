# look-judge: hud-c25 phase 4 (Left wing live), second judging

Reference: memory `hud-c25-approved.png`. Shots at 2000x1009, `?c25=1`.
Named: Pass test 2, left-wing part only (wing readings move with the ship and the place), plus the caller's checks: visibly differs A/B/C as place and motion say; stays in the sketch's place and shapes; nothing overlaps; red only on the rad lamp; every earlier FAIL point is gone.

## Reference (first look)
First reaction: a calm left wing. Short numbers in their slots (str 16/40, brg 083, 2.3 m, 0.08, e 1,440), with the rose needle short and inside its circle.

## A: void start, at rest (`snapshots/p4v/hud-c25-2000x1009-bnote-void.png`)
First reaction: a quiet wing that looks like the sketch. Everything is still, with zeros where the drift goes.
- Readings fit place and motion: **yes**. The drift reads 0.0 m and lat +0.00, so the ship is at rest. The str reads 24/100 and its pointer is about a quarter of the way along the rail. The brg reads 312, with the rose needle up-left and the brg pointer near "w". Contact reads w 843 and only a few lamps are lit.
- Sketch place and shapes: **yes**. Rails, rose, radar, resonance and the outside row are where the reference has them.
- Nothing overlaps: **yes**. "312" sits left of the rose, clear of "field". The brg pointer is clear of "brg 312".
- Red only on the rad lamp: **yes**. Nothing in the wing is red.

## B: chaos site (`snapshots/p4c/hud-c25-2000x1009-admin-claimed.png`)
First reaction: clearly a hotter place. Resonance is 0.97, rad 0.87, g 2.21, several lamps are lit and the rad lamp is red. It reads as "somewhere bad".
- Readings fit place and motion: **no**. The label reads "str 95 /100" but its pointer sits only about 60% of the way along the str rail, just left of the word "str". The rail does not agree with its own number. Everything else changes as it should: brg is 090 with the needle pointing right, and the lamps for nomic, chaos, flip, shear, curr and well are lit.
- Sketch place and shapes: **yes**. The resonance label stays in its slot, the rose needle stays inside the rose, and the g arrow sits above "2.21" without cutting it.
- Nothing overlaps: **yes**. The brg pointer sits below "brg 090", clear of it.
- Red only on the rad lamp: **yes**. The rad lamp is red and the other lit lamps are pale.

## C: void after a 3 s burn (`snapshots/p4b/hud-c25-2000x1009-bnote-void-burn.png`)
First reaction: the drift block looks broken. "115725.2 m" and "lat +23145.04" are long, raw numbers in a wing that is otherwise short and tidy. The rose needle sticks straight up into the "field one source" header.
- Readings fit place and motion: **yes**. Drift is now non-zero and the path line trails off the reticle. Contact reads "none", width reads "—", and brg reads 000.
- Sketch place and shapes: **no**. The sketch's drift readout is a short value ("2.3 m"). Here it swells to a six-digit metre count and an eight-character lat. Neither reads as a reticle reading, and the lat label stretches out to the edge of the radar.
- Nothing overlaps: **no**. The rose needle at 000 runs up out of the circle into the "one" of "field one source", and "000" crowds against the needle tip. This is the same kind of fault as last round's "312 on field".
- Red only on the rad lamp: **yes**. Nothing in the wing is red.

## Earlier FAIL points
- The str rail crossing the brg rail: gone.
- The huge faint ring at top-left: gone.
- The needle shooting sideways: gone in B.
- The resonance label in the brg corner: gone.
- The g arrow through its number: gone.
- "312" on "field": gone in A, but the same fault comes back in C as the needle and "000" against "field one source".
- The brg pointer over "brg": gone.

## Verdict: FAIL

Statement 2 (left wing): A yes, B no, C no.

Reasons, most important first:
1. B: the str pointer sits about 60% along its rail while the label reads 95/100. The rail contradicts its number at the one place where it should be nearly full.
2. C: the rose needle at 000 leaves its circle and runs into the "field one source" header, with "000" crowding it. The label-collision fault from last round is back in a new direction.
3. C: the drift readout swells to "115725.2 m" and "lat +23145.04". These long raw numbers break the sketch's short, small readout and push toward the radar edge.
