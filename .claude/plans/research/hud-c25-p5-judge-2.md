# Look judge: hud-c25 phase 5 (right wing), round 2

Scope: right wing only. Pass test 1 (right wing shapes against hud-c25-approved.png) and Pass test 2 (right wing readings move with the ship). Left wing, span line, log and Pass test 3 are out of scope here.
Statement 3: not judged at this phase.

## Rest, 2000x1009 (p5dr)
First reaction: a calm ship panel. Full tank, cold drive, everything sits in its place.
- PT1 shapes: **yes.** It has the volts rail with 8 cells, the bus rail with its drv/thm/lsp/gnc split and spare, the cabin rail with its trace and "set 21.0", the fuel slope (100/50/0) with "100 %" and "fuel full", the ship side view over a wavy hull-stress line with "41 %" and lim, p/rh, the life fan, the two lamp rows, and o2/co2. All are where the reference has them.
- PT2 (static baseline): fuel 100 %, thrust heat 0 %, volts 28.2, bus 3.9 kW, all drv lamps dark.

## Burn, 2000x1009 (p5db)
First reaction: the drive is working hard. Big fuel drop, heat bar filled, lamps on.
- PT1 shapes: **yes.** The bus rail stops at its end marker near the cabin rail, and the split row is fully there (drv, thm, lsp, gnc, spare 0.0). The hull-stress line has visible bumps and a "73 %" marker.
- PT2 readings move: **yes.** Fuel goes from 100 % to 78 % and "full" becomes "0:10 left". Thrust heat goes from 0 % to 100 % and its hatched bar fills along the floor. Lamps drv 1-4 light, and so do bus, cell, cool and jnt. Volts sag from 28.2 to 26.6. Bus climbs from 3.9 to 12.3 kW, and cabin from 21.3 to 21.7.

## Rest / burn, 1440x900 (p5dr2, p5db2)
First reaction: the same panel shrunk. It reads, but it is tight.
- PT1: **yes**, the same layout. PT2: **yes**. In the burn shot fuel is 78 % / 0:10 left, heat is 100 %, drv 1-4 are lit and volts read 26.7.
- Crowding (phase 6, not a fail): "gnc" butts against "spare". At 100 % the "%" sign of the fuel number runs into the ship's tail. The p/rh row is small.

## The three old failures
1. Bus rail overflow and missing split: **gone.** The rail is held at its end and all split boxes show on the burn shot.
2. Fuel number over "28.2 v", the cells and "100": **gone.** "100 %" sits below the cells, clear of the 100 scale label.
3. Flat hull stress: **gone.** There is a low wave at rest and taller bumps on the burn.

## Watch items (not failing)
- At 2000 rest, the "%" of "100 %" ends right against the ship's tail point with almost no gap. At 78 % there is a gap, as in the reference.
- The cabin 30 min trace draws as a dense zigzag hatch. The reference shows a gentle wave.
- "hot 80" sits on a row below the floor. The reference has it on the thrust-heat label row.

## Verdict: PASS
Every named statement is yes on both 2000x1009 shots, and the 1440 shots also say yes.
