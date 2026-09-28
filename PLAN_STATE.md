# PLAN_STATE: mothering rework 2

Plan: C:/Users/Traff/.claude/plans/mothering-rework2-lets-do-gleaming-pizza.md (read only Phase 3 and Verification).

## Done
- Phase 1 soup: dd397e2 (four blues survive, GenSoup.finalBlues).
- Phase 2 eye: 27dc5d8 (energy sparks, power point, one centre dust mound; GenEye.drawPowerPoint/pile/pool).

## Next phase: Phase 3, circle as a living universe
`js/genesis/genesis-circle.js` (178 lines): ring arcs :63-76, dune :20-29/:78-93, 28 strands :31-52/:95-108, rose thread :54-58/:110-130, `drawUniverse` :132-149 (base `#5a4c4e`, band `#6e5e60` 0.64 R, red dot `#8e3037`). C=(0.56W,0.50H), R=0.15·min(W,H), P=(0.30W,0.24H).
- Remove strands and dune. Grey thread `#9a8f8c` from `GenEye.pile` top to ring bottom 0.2-2.0 s (8 held steps); ring builds in 8 arcs 2.0-3.2 s while the pile shrinks a row per arc.
- Rose thread `#b8525a` from P 3.4-4.4 s, same ringPt/mid curve; `GenEye.drawPowerPoint` at P.
- 4.4 s on: living interior (2-arm speck spiral turning one step per 0.4 s, rose sparks on the arms, 3-4 blue dots last) over the base disc + band. Export `drawUniverse(ctx,W,H,t)`.
- `js/genesis/genesis-chains.js` `drawP8Disc` :32-44 → call `GenCircle.drawUniverse(ctx,W,H,99)`.
- Verify: `py -3 tools/gframes.py mr2 circle chains`, then `snap.py capture mr2-after` + compare, genesis flow, MAP.md rows for new exports, bump, commit by path, delete this file, final report.
