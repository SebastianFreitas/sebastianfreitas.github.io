# Look judge: hud-c25 phase 4 fix round p4h-2

What I judged: Pass test 2 (left wing only), plus the three D33 checks (str label above its rail and brg label below its rail; rose lobe/needle clear of the "field one source" header; drift path clear of the "m / off in 5 s" readout). I also checked whether the rose still reads well with the north peak capped.
Shots, all 2000x1009, retaken:
- A: `snapshots/p4hv/hud-c25-2000x1009-bnote-void.png`, void start
- B: `snapshots/p4hc/hud-c25-2000x1009-admin-claimed.png`, chaos site
- C: `snapshots/p4hb/hud-c25-2000x1009-bnote-void-burn.png`, straight burn
- D: `snapshots/p4hs/hud-c25-2000x1009-bnote-void-burn.png`, burn with a 90° turn

Statements 1 and 3: not judged at this phase.
The right wing, span line and log parts of statement 2: not judged at this phase.

## A: void start
**First reaction:** the same tidy left wing as last round, with a slim NW lobe on the rose and "312" outside it at low right.
- **S2 (left wing): yes.** The str pointer is about a quarter along its rail (24). The brg pointer is near the right end (312). The rose lobe points NW.
- **Labels spread: yes.** "str 24 /100" is above the left rail and "brg 312" is under the right rail.
- **Rose clear of header: yes.** The lobe points NW, well away from "field one source".
- **Drift clear of readout: yes.** Drift is 0 and "0.0 m / off in 5 s" is clean.
- **Shot: PASS.**

## B: chaos site
**First reaction:** a busy field, with an east lobe on the rose and the str pointer near the end of its rail.
- **S2 (left wing): yes.** str 95, with the pointer under "/100". brg 090, with the pointer about a quarter along. The lobe points east, and the field chips nomic, chaos, rad, flip and jnt are lit.
- **Labels spread: yes.** "str 95 /100" is above its rail and "brg 090" is below its rail.
- **Rose clear of header: yes.** The lobe points east.
- **Drift clear of readout: yes.** Drift is 0.
- **Shot: PASS.**

## C: straight burn
**First reaction:** the north lobe now stops at the top of the rose's ring. There is a clear dark gap between its tip and "one" in the header, so the spike no longer touches the text.
- **S2 (left wing): yes.** These moved from A:
  - str 24 to 26
  - brg 312 to 000, with the pointer at the left end of its rail
  - resonance 0.09 to 0.05
  - contact "w 843" to "none"
  - ext -34° to 54°
- **Labels spread: yes.** "str 26 /100" is above its rail and "brg 000" is below its rail.
- **Rose clear of header: yes.** The cream lobe tip ends at the rose's outer ring. A thin band of background sits between the tip and the bottom of "one". The gap is narrow (a few pixels at full size) but it shows without zooming.
- **Drift clear of readout: yes.** Drift is 0 and there is no path.
- **Shot: PASS.**

## D: burn with a 90° turn
**First reaction:** drift shows a slip ("3.1 m", lat +0.35, vert +0.50), the path stops short of the readout, and the lobe points WNW.
- **S2 (left wing): yes.** These moved:
  - drift: 3.1 m, lat +0.35, vert +0.50, with a dotted path and cone from the reticle
  - str 21
  - brg 293 (pointer at about 80% of its rail, lobe WNW)
  - resonance 0.04
  - contact "w 8,391"
- **Labels spread: yes.** "str 21 /100" is above its rail and "brg 293" is below its rail.
- **Rose clear of header: yes.** The lobe points WNW.
- **Drift clear of readout: yes.** The path ends below "off in 5 s", and "3.1 m" is not struck through. The small dot at the left of "vert +0.50" sits close to the text but does not cover it.
- **Shot: PASS.**

## Does the rose still read with the capped north peak?
Yes. In C the north lobe is a slim cream teardrop pointing straight up, plainly "north". It is about as long as the east lobe in B and the NW/WNW lobes in A and D, so it does not look cut off or stubby. The cap does not show as a flat top. The tip looks a little blunter than the other bearings' tips, but only if you compare them side by side.

## Verdict: PASS

Pass test 2, left wing: 4/4 yes. Labels spread: 4/4. Rose clear of header: 4/4. Drift clear: 4/4.
By shot: A PASS, B PASS, C PASS, D PASS.

Remaining things to watch (none fail):
1. C: the gap between the north lobe tip and "one" is only a few pixels. It is clear at 2000 wide but should be checked again at 1440x900 and 1366x768.
2. D: the drift end dot sits close to the left of "vert +0.50".
