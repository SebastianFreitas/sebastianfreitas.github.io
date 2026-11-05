# hud-c25: models, lamp rules and layout math (C1, 2026-11-04)

Phases 4 and 5 build from this file; phase 1 from "Layout". Inputs name
their source; `ce = 1 - env.contained`; `sc = env.w >= 0.5 ? env.chaos : 0`
(instruments.js `tickAlarms`). Lamp states: 0 off, 1 lit, 2 burst, 3 red
(rad only). Burst = state 2 while the rule's error level holds, and for
1.1 s after a lamp turns on; blink 1.1 Hz at error, 0.5 Hz at warn
(instruments.js `alarmOverlay`).

## Layout (measured 2026-11-04, Playwright, `.topbar` bottom)
- Bar bottom `barB`: 58.7 px at 2000x1009 and 1440x900, 34.0 at 844x390.
- `s = min(1, W/2000, H/1009)`; 2000x1009 -> 1, 1440x900 -> 0.72.
- Left wing (sketch x < 785): x' = x*s, y' = H - (1009 - y)*s.
- Right wing (x > 1215): x' = W - (2000 - x)*s, same y'.
- Log (785..1215, y > 880): x' = W/2 + (x - 1000)*s, same y'.
- Span line: x' = W/2 + (x - 1000)*s, y' = barB + (y - 58.7)*s, so
  y 88.5 -> barB + 29.8*s (80.2 at 1440x900). Check: tallest tick top
  (y - 14) stays >= barB + 8; else move the line down by the shortfall.
- Phone landscape (`B.phone`): span + log only, `sp = 0.7` (today's phone
  log line is 9 px at 844x390; 9 / 13 newest size = 0.69). Span x 10%..90%
  of W, y = 34 + 29.8*0.7 = 54.9; log 428*0.7 = 300 px wide, centred,
  bottom at H - 4.
- Wider than 2000: s stays 1, wings stay at the corners, log centred
  (from D10: C25 is drawn at 2000).

## Left wing (outside)
- str: signal strength today (`tiles-nav.js` signal); floor = 5 (sketch).
- rose: one lobe at the radar contact's bearing `atan2` of the nearest
  blip, height = str * 1.9 px; 2nd = the second blip's bearing (or none).
- brg: that bearing, 0..360 north up; contacts = blip count.
- speed gauge: `ship.speedN`; polar trace = last 90 samples, 1 per 0.1 s.
- drift: m per world unit = 408000 / (CAM.max - CAM.min); lat = `B.vel`
  component across the nose line (`stats.angle`), vert = `stats.vy`;
  path at 1..5 s = slip * t, 46 px per m (sketch), cone = min..max of the
  last 5 s of slip.
- resonance: `env.res` (side.js today, log axis .001..1).
- rad = `sys.dose`; g = `env.g` (2 decimals), flip arc = fraction of the
  `gAnom` oscillation period gone; ext = `sys.hullT` (-100..+100 column).
- Lamps: nomic `env.nomic*ce` > .6 lit, > .85 burst; chaos `sc` > .78 lit,
  > .92 burst; unfrm `B.futureNow` > .45; span: camX within 5 % of the span
  (20 km) of either end; cntc: contacts > 0; bcn: an unread beacon inside
  the `bridge-poi.js` detect range; sig: str > floor 5; rad > .16 lit,
  > .50 red; dbr / rift: the dominant site (`env.w >= .5`) is one whose
  `SITES` name or tag says debris / rift (phase lists the ids); shear
  `env.sway*ce` > .6 lit, > .85 burst; flip `gAnom` > .35 lit, > .8 burst;
  curr `env.jitter` > .5; well `|env.g|` > .5.

## Right wing (ship)
- cells: 8 cells, cell_i = 3.55 + d_i - 0.12*thrust - 0.05*busKW/6,
  d = [+.02, +.01, 0, +.015, -.01, +.005, -.03, +.01] (cell 7 weakest);
  volts = sum (28.4 at rest, about 28.1 at thrust .34 as sketched).
- bus kW split: `tiles-sys.js` bus loads (life, drv, thm, gnc), rail 0..6.
- cabin: `sys.cabT`; 30 min trace, 60 samples 30 s apart, prefilled at
  load from the cabT formula at t - k*30 s (it is a sine of time plus
  chaos/future, so the past is computable); setpoint 21.0.
- fuel % = `fuelN`; time left = fuel / drain at the current burn, "full"
  when not burning. Thrust heat = 100*max(thrust needle, speed needle)
  (side.js `thrustLive`), hot mark 80.
- hull stress strip: `tiles-sys.js` hull sector stress; peak = blade joint.
- p = `sys.kpa`, rh = `sys.rh`, o2/co2 fan = `sys.o2`, `sys.co2`.
- Lamps: drv k (1..4) lit while burning and thrust >= (k-1)/4; ring: ring
  stress > .6; fin t / fin b: `stats.jet` firing up / down; bus kW > 5.0;
  cell: weakest < 3.40 V; cool: heat > 80; lsp: o2 < 19.6 or co2 > 1200
  lit, o2 < 19.0 or co2 > 1800 burst; seal: kpa < 95.6 lit, < 92 burst;
  nav: `stats.courseMark` set; jnt: joint stress > .6 lit, > .85 burst.
- Alarm lines (C1 review, from code): no new log lines. Today's
  warn/err/crit lines (`bridge-readout.js` `B.log.push(..., kind)`) already
  carry the alarms and print with "!"; `Instruments.alert(kind)` (crit ->
  hull) now bursts jnt and ring for its duration instead of flashing a
  tile. Every other lamp bursts by its own rule above.
