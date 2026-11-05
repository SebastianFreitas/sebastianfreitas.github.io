# Look judge: hud-c25 phase 4 fix round (p4e)

Reference: memory `hud-c25-approved.png`.
What I judged: Pass test 2 (left wing only), D30 and D31.
Shots, all 2000x1009:
- A: `snapshots/p4ev/hud-c25-2000x1009-bnote-void.png`, void start
- B: `snapshots/p4ec/hud-c25-2000x1009-admin-claimed.png`, chaos site
- C: `snapshots/p4eb/hud-c25-2000x1009-bnote-void-burn.png`, A after a 3 s burn

Statements 1 and 3: not judged at this phase.
The right wing, span line and log parts of statement 2: not judged at this phase.

## A: void start
**First reaction:** the left wing looks tidy and close to the sketch. The rose needle points up-left, and its "312" sits low-right, outside the ring.

- **S2 (left wing): yes.**
  - The str pointer sits about a quarter of the way along its rail, matching "str 24 /100".
  - The brg pointer sits near the right end of its rail, matching "brg 312".
  - The rose needle points about NW, which also matches 312.
- **D30: yes.** Drift reads "0.0 m", "lat +0.00", "vert +0.00". These are short, single-digit readouts in the sketch's size.
- **D31: yes.**
  - "str 24 /100" sits under the right end of the str rail, and "brg 312" under the left end of the brg rail. Both pointers have the whole rail above the labels to themselves.
  - "312" sits outside the ring, opposite the needle.

## B: chaos site
**First reaction:** the str pointer is now pushed almost to the end of its rail. That fits 95 at last. The rose needle points right, and "090" sits on the far left outside the ring.

- **S2 (left wing): yes.**
  - The str pointer is at about 95% of its rail, next to the right-end tick, matching "str 95 /100". This fixes last round's FAIL point 1.
  - The brg pointer is about a quarter along its rail, matching "brg 090", and the rose needle points east, which also matches.
  - Note: the caller expected 45 here. The shot reads 090, and its pointer and needle agree with 090, not 45.
- **D30: yes.** Drift reads "0.0 m", lat and vert both "+0.00".
- **D31: yes.**
  - At 95 the str pointer runs above the "/100" label without touching it.
  - "090" is outside the ring, opposite the needle.

## C: after a 3 s burn
**First reaction:** the readings clearly moved from A. But drift still reads exactly what it read before, and the 000 needle tip reaches right up to the "field one source" header.

- **S2 (left wing): no.**
  - From A to C these moved:
    - str 24 to 26, with its pointer
    - brg 312 to 000, with the pointer moved to the left end and the rose needle straight up
    - nose resonance 0.09 to 0.05
    - contact "w 843" to "none"
    - rad, and ext temp -34° to 54°
  - Drift did not move: "0.0 m", "lat +0.00", "vert +0.00" in all three shots. The statement asks for drift to change with the ship, and no picture shows that. "It was a straight burn, so zero is correct" is a reason this shot set fails to show the clause, not a yes.
- **D30: yes.** Drift reads "0.0 m". It is short, with no raw map-scale number, so last round's FAIL point 3 ("115725.2 m") is gone.
- **D31: partly.**
  - "000" now sits below the ring, opposite the needle, so the number no longer crowds the header.
  - The needle's tip still runs up to the ring top, right under "one" in "field one source", and visibly touches it. So last round's FAIL point 2 is only half gone.
  - "str 26 /100 brg 000" also reads as one run of text in the gap between the rails.
  - Overall a **no**.

## Last round's FAIL points
1. str pointer at 60% for 95: **gone** (B pointer at about 95%).
2. Rose needle at 000 into the header, with "000" crowding: **half gone**. "000" moved clear, but the needle tip still meets "one".
3. Drift swelling to long raw metres: **gone** (0.0 m everywhere).

## Verdict: FAIL

S2 left wing: A yes, B yes, C no. D30: 3/3 yes. D31: A yes, B yes, C no.

Reasons, most important first:
1. Drift sits at "0.0 m / +0.00 / +0.00" in every shot, so no picture shows drift moving with the ship. A shot with real sideways slip is needed to show it.
2. C: at 000 the rose needle tip still touches the "field one source" header. The ring top and the header leave no room between them.
3. C: "str 26 /100" and "brg 000" run together into one line of text between the two rails. It is hard to tell which label belongs to which rail.
