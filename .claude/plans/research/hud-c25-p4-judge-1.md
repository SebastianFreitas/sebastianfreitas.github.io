# Look judge: hud-c25, phase 4 (Left wing live)

Named: Pass test 2, left-wing part only (wing readings move with the ship and the place). Caller checks: the readings, rose, lamps and outside row differ between A and B the way the numbers say; the left wing stays in the sketch's place and shapes; nothing overlaps; red only on the rad lamp.

Reference: hud-c25-approved.png. Shots at 2000x1009, ?c25=1.

## Reference (sketch)
First reaction: a neat, tight gold left wing. Each label sits clear of its rail, and the rose is a small circle with a short needle.

## A: void start (snapshots/p4v/hud-c25-2000x1009-bnote-void.png)
First reaction: a calm, quiet wing that looks like the sketch. Few lamps are lit and there is no red.

- Readings move with the place: **yes**. str 23, brg 312, rose needle points up-left, nose resonance 0.09, contact "w 843", lamps cntc/bcn/sig lit, outside row rad 0.046, g 0.00, ext -34°.
- Same place and shapes as the sketch: **yes**. The rails, rose, radar disc, slope, lamps and outside row are all where the sketch puts them.
- Nothing overlaps: **no**. The rose's "312" bearing label is printed on top of the word "field" ("field 312 one source"). The brg rail pointer sits on the "brg" label and strikes it out.
- Red only on rad lamp: **yes**. The left wing has no red at all, and the rad lamp is off.

## B: chaos site, admin (snapshots/p4c/hud-c25-2000x1009-admin-claimed.png)
First reaction: it is clearly in a different state, with more lamps lit, a red rad lamp and big numbers. But the wing has broken its frame. The str rail runs right across the top, a huge faint ring hangs off the top-left corner, and the rose needle shoots sideways.

- Readings move with the place: **yes**. str 100, brg 090, peak 100, nose resonance 0.97, contact "w 0", lamps nomic/chaos (burst)/shear/flip/curr/well/cntc/sig lit and rad red, outside row rad 0.87, g 2.21, ext 6°. Every one differs from A in the direction the numbers say.
- Same place and shapes as the sketch: **no**. The str rail fill no longer stops at its own rail. It runs as one long slanted line from the left edge to x~480, across the whole brg rail. A large faint circle arc, much bigger than anything in the sketch, sits behind the top-left of the wing. The rose needle is a long horizontal bar reaching past the peak gauge to the radar disc.
- Nothing overlaps: **no**. The str line crosses the brg rail and its ticks. The "0.97 nose resonance" readout has climbed up into the brg rail corner. The rose needle runs through the peak bar. The g arrow's line cuts through the "2.21" value ("2|21").
- Red only on rad lamp: **yes**. The rad lamp is the only red in the wing, and the chaos burst is cream.

## Verdict: FAIL

The readings clearly move with the place: A and B differ everywhere the numbers say they should. But B's wing spills out of its sketch shapes and overlaps itself, and A has two label collisions. "Nothing overlaps" and "same place and shapes" fail.

Top reasons, most important first:
1. Placement/size: in B the str rail grows past its own rail into one long line across the brg rail. The rail reads as broken, not full.
2. Overlap: in B the rose needle runs out through the peak bar, nose resonance rides up into the brg corner, and the g arrow cuts through "2.21". A huge faint ring off the top-left corner fills frame the sketch leaves empty.
3. Label collisions in both views: the rose's bearing number lands on "field" in A. The brg pointer sits on the "brg" label in A and B.
