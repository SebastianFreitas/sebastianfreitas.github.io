# Look judge: hud-c25 phase 4 fix round (p4g)

Reference: memory `hud-c25-approved.png`.
What I judged: Pass test 2 (left wing only), D30 and D31.
Shots, all 2000x1009:
- A: `snapshots/p4gv/hud-c25-2000x1009-bnote-void.png`, void start
- B: `snapshots/p4gc/hud-c25-2000x1009-admin-claimed.png`, chaos site
- C: `snapshots/p4gb/hud-c25-2000x1009-bnote-void-burn.png`, after a straight 3 s burn
- D: `snapshots/p4gs/hud-c25-2000x1009-bnote-void-burn.png`, burn with a 90° turn at 1.5 s

Statements 1 and 3: not judged at this phase.
The right wing, span line and log parts of statement 2: not judged at this phase.

## A: void start
**First reaction:** looks the same as last round's A. The left wing is tidy and close to the sketch, and "312" sits low-right outside the rose.

- **S2 (left wing): yes.** The str pointer is about a quarter along its rail ("str 24 /100"). The brg pointer is near the right end ("brg 312"), and the rose needle points NW.
- **D30: yes.** "0.0 m", "lat +0.00", "vert +0.00" are short and in the sketch's size.
- **D31: yes.** Both labels sit under the rail ends, so the pointers have the whole rail. "312" is outside the ring, opposite the needle.

## B: chaos site
**First reaction:** the str pointer is pushed almost to the end of its rail. The needle points east and "090" is outside the ring on the left.

- **S2 (left wing): yes.** The str pointer is at about 95%, matching "str 95 /100". The brg pointer is a quarter along, matching "090", and the needle points east.
- **D30: yes.** "0.0 m", "+0.00", "+0.00".
- **D31: yes.** At 95 the pointer runs above "/100" without touching it. "090" sits opposite the needle, outside the ring.

## C: after a straight 3 s burn
**First reaction:** the readings moved from A, but the rose needle at 000 still pokes up into "one" of the "field one source" header.

- **S2 (left wing): yes.** These moved from A:
  - str 24 to 26, with its pointer
  - brg 312 to 000, with the pointer at the left end and the needle straight up
  - resonance 0.09 to 0.05
  - contact "w 843" to "none"
  - rad, and ext -34° to 54°

  Drift stays at 0.0, which suits a straight burn. Shot D shows drift moving.
- **D30: yes.** "0.0 m", with no raw map-scale number.
- **D31: no.** "000" now sits below the ring, opposite the needle. But the needle tip still reaches the ring top and visibly crosses the "n" of "one" in the header. Also, "str 26 /100 brg 000" still reads as one run of text in the small gap between the two rails.

## D: burn with a 90° turn at 1.5 s
**First reaction:** drift finally moves: lat +0.35 and vert +0.60 show, and a path line rises from the reticle. That line runs straight up through the "3.5 m / off in 5 s" text, so the main drift number is struck through.

- **S2 (left wing): yes.** Drift changed from A/C ("lat +0.35", "vert +0.60", a path and cone drawn from the reticle). str is 21, brg 293 with the pointer at about 80% of the rail, the needle points WNW, resonance is 0.04, and contact is "w 8,391".
- **D30: no.** lat +0.35 and vert +0.60 are clean, single-digit m/s, in the sketch's size. But the headline drift number, which should read "3.5 m", has the drift path line drawn through it. It reads closer to "3.9" with a mark on it, and "off in 5 s" is crossed out the same way. You have to squint to read the number. In the sketch the path leans away to the right and leaves "2.3 m" clear.
- **D31: yes.** The needle points WNW and stays clear of the header. "293" sits low-right outside the ring, opposite the needle. The str and brg pointers are on their rails, away from the labels.

## Last round's FAIL points
1. Drift never moves in any shot: **gone**. D shows lat +0.35 and vert +0.60 with a path, but see the new problem in D30.
2. The 000 needle tip touches the "field one source" header: **still there** (C).
3. "str nn /100" and "brg nnn" run together between the rails: **still there** (A, B, C, D all show it; worst in C).

## Verdict: FAIL

S2 left wing: 4/4 yes. D30: 3/4 yes (D no). D31: 3/4 yes (C no).

Reasons, most important first:
1. D: the drift path line runs straight up through "3.5 m / off in 5 s", so the main drift number is crossed out just when it finally shows slip. In the sketch the path keeps away from the number.
2. C: at 000 the rose needle tip still touches "one" in the "field one source" header, because there is no room between the ring top and the header.
3. "str 26 /100" and "brg 000" still read as one line of text in the narrow gap between the two rails, so it is hard to tell which label belongs to which rail.
