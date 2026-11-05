# Look judge: hud-c25 phase 4 fix round (p4h)

What I judged: Pass test 2 (left wing only), plus the three D33 checks (str label above its rail and brg label below its rail; rose needle clear of the "field one source" header; drift path clear of the "m / off in 5 s" readout).
Shots, all 2000x1009:
- A: `snapshots/p4hv/hud-c25-2000x1009-bnote-void.png`, void start
- B: `snapshots/p4hc/hud-c25-2000x1009-admin-claimed.png`, chaos site
- C: `snapshots/p4hb/hud-c25-2000x1009-bnote-void-burn.png`, straight 3 s burn
- D: `snapshots/p4hs/hud-c25-2000x1009-bnote-void-burn.png`, burn with a 90° turn at 1.5 s

Statements 1 and 3: not judged at this phase.
The right wing, span line and log parts of statement 2: not judged at this phase.

## A: void start
**First reaction:** a tidy left wing. "str 24 /100" now sits clearly above the left rail and "brg 312" sits under the right rail, so they no longer read as one line.

- **S2 (left wing): yes.** The str pointer is about a quarter along its rail. The brg pointer is near the right end. The needle points NW, with "312" outside the ring at low right.
- **Labels spread: yes.** "str 24 /100" is above its rail and "brg 312" is below its rail, with clear space between them.
- **Needle clear of header: yes.** The needle points NW and stays well away from the header.
- **Drift path clear of readout: yes.** Drift is 0 and no path crosses "0.0 m / off in 5 s".
- **Shot: PASS.**

## B: chaos site
**First reaction:** much the same as last round. The str pointer is near the end of its rail and the needle points east.

- **S2 (left wing): yes.** The str pointer is at about 95%, under "/100". The brg pointer is about a quarter along, matching "090", and the needle points east.
- **Labels spread: yes.** "str 95 /100" sits above its rail and "brg 090" below its rail. The pointer near "/100" is under the label and does not cut it.
- **Needle clear of header: yes.** The needle points east and the header is clear.
- **Drift path clear of readout: yes.** Drift is 0 and the readout is clean.
- **Shot: PASS.**

## C: straight 3 s burn
**First reaction:** the labels are fixed, but the north needle still runs right up to the header. Its tip ends at "one" in "field one source".

- **S2 (left wing): yes.** These moved from A:
  - str 24 to 26
  - brg 312 to 000, with the pointer at the left end of its rail
  - resonance 0.09 to 0.05
  - contact "w 843" to "none"
  - ext -34° to 54°
- **Labels spread: yes.** "str 26 /100" is above the left rail and "brg 000" is below the right rail. They read as two separate labels.
- **Needle clear of header: no.** The 000 needle is as long as in A and B and runs from the centre to the outer edge of the rose. Its tip ends just under the "n"/"e" of "one", so it touches the header text. It does not stop at the inner ring, and it is no shorter than the needles that point away from north.
- **Drift path clear of readout: yes.** Drift is 0 and there is no path.
- **Shot: FAIL.** The needle tip still reaches "one" in the header.

## D: burn with a 90° turn at 1.5 s
**First reaction:** drift shows a slip: "3.1 m", lat +0.35, vert +0.50. The path and cone now stop short of the readout, so the number is clean.

- **S2 (left wing): yes.** These moved from A/C:
  - drift: 3.1 m, lat +0.35, vert +0.50, with a path and cone from the reticle
  - str 21, brg 293 (pointer at about 80% of its rail, needle WNW)
  - resonance 0.04
  - contact "w 8,391"
- **Labels spread: yes.** "str 21 /100" is above its rail and "brg 293" is below its rail.
- **Needle clear of header: yes.** The needle points WNW, away from the header.
- **Drift path clear of readout: yes.** The dotted path and cone end below "off in 5 s", and "3.1 m" is not struck through. A small dot sits just left of "vert +0.50" but does not cover it.
- **Shot: PASS.**

## Last round's FAIL points
1. The drift path strikes through "3.5 m / off in 5 s": **gone** (D).
2. The 000 needle tip touches "field one source": **still there** (C).
3. "str" and "brg" run together between the rails: **gone** (all four shots).

## Verdict: FAIL

Pass test 2, left wing: 4/4 yes. Labels spread: 4/4. Needle clear: 3/4 (C no). Drift clear: 4/4.
By shot: A PASS, B PASS, C FAIL, D PASS.

Reasons, most important first:
1. C: at 000 the rose needle is still full length. Its tip reaches the bottom of "one" in "field one source", so the needle and the header touch.
2. The needle is no shorter near north than at other bearings, so there is no sign of the D33 cap.
3. No other problems are visible on the left wing.
