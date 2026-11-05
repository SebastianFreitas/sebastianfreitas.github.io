# Look judge: hud-c25 phase 5 (right wing live)

Scope: right wing only. Statement 2 (right-wing readings move) and statement 1 (right wing has the reference's shapes). Reference: hud-c25-approved.png.

## View A: rest (snapshots/p5r/hud-c25-2000x1009.png)

First reaction: the right wing is mostly there, but the top left corner is a mess. A big "100 %" is printed on top of the volts and cell boxes.

- PT1 (shapes, right wing): **no**. In the reference "72 %" sits below the cell boxes, with "fuel / 2:00 left" under it. Here "100 %" is drawn over the "28.2 v" label and the cell row, and the "100" scale tick collides with "fuel" so it reads "100el". Hull stress is one flat line, where the reference shows a wavy trace. Bus split, cabin trace, ship, p/rh, o2/co2 fan and lamps are in place.
- PT2 (moves): judged across the pair, see below.

## View B: after a 3 s burn (snapshots/p5b/hud-c25-2000x1009-burn.png)

First reaction: the readings clearly react to the burn, but the bus rail now runs off the right edge through the cabin block.

- PT1 (shapes, right wing): **no**. The bus kW rail runs past its end, under and beyond the cabin rail, to the frame edge. The split row has fallen apart: one long "drv" segment, "thm" pushed under the cabin label, and lsp, gnc and spare missing. The fuel block (78 %, fuel, 0:10 left) and the cell boxes now match the reference.
- PT2 (moves): **yes**. Fuel goes from 100 % "full" to 78 % "0:10 left". The thrust heat floor bar fills from 0 % to 100 %. The drv 1-4 lamps are lit, plus bus, cell, cool and jnt. Volts drop from 28.2 to 26.6. Bus goes from 3.9 to 12.3 kW, the cabin trace gets a ripple, and a bump appears in hull stress (70 %).

## Statements
- PT1 right wing: 0 of 2 views yes.
- PT2 right wing: yes (the change is clearly visible between the pair).
- PT2 rest (span pin, ticks, left-wing drift/bearing) and PT3: not judged at this phase.

## Verdict: FAIL

Shapes to fix, most important first:
1. Bus kW rail and split at high load. The rail overruns into the cabin block and off the frame, and the split row loses lsp, gnc and spare.
2. Fuel % at "100 %". The big number sits on top of the volts label and cell boxes, and the "100" tick collides with "fuel" ("100el").
3. Hull stress strip at rest. It is a flat line where the reference shows a wavy trace.
