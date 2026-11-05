# hud-c25: what drives each C25 reading (B1, 2026-11-04)

Source of the list: memory `hud-c25-approved.js` (labels, sample data
`K.D` in the temp `lib.js` ~line 41). "today" = a model already in
`js/hud/*.js`; "model" = new small model from `B.env`, the ship, marks
or XP (D4: never a fixed or random number). Thresholds and model maths
are Part C's job (phases), written with their working.

## Left wing (outside)
- str rail, field rose + spectrum, pocket (width, 2nd): today `tiles-nav.js` signal (spectrum); rose by bearing = model from the signal's bearing (radar blips' angle).
- brg rail, radar disc, contact count: today `tiles-nav.js` radar (blips).
- motion band (speed gauge + polar speed trace): today `nav` speed (`ship.vel`, `ship.vy`).
- drift reticle (slip m/s lat/vert, 1..5 s path, 5 s cone): model from `ship.vel`/`ship.vy` against the nose line (`ship.pitch`).
- nose resonance on the left slope: today `side.js` (`env.res`).
- outside row: rad trefoil = today `tiles-sys.js` rad (dose); g arrow + flip arc = today `pull` (`env.g`, `gAnom`); ext temp = today hull skin temp.

## Right wing (ship)
- volts rail + 8 cell boxes: model (pack sags with bus load and thrust; weakest cell cream).
- bus kW rail + consumer split (life, drv, thm, gnc): today `tiles-sys.js` bus loads.
- cabin rail + 30 min trace + setpoint 21.0: model from today's eclss cabin values.
- fuel slope (% and time left), thrust heat floor (hot 80 mark): today `side.js` fuel/thrust.
- ship side view + hull stress strip: today `tiles-sys.js` hull stress.
- p, rh, life fan o2/co2: today `tiles-sys.js` eclss.

## Lamps (states: off, lit, burst = just turned on or alarm, red = over limit; red only on rad)
Left (outside): nomic `env.nomic`, chaos `env.chaos` (incoherent), span (both span ends in range of the scan), unfrm (unformed curve), cntc (a radar contact), bcn (a beacon inside detect range), sig (signal above the floor), rad (dose; red over the limit), dbr (debris sites), shear (`env.sway`), flip (`gAnom` flipping), rift (rift sites), curr (`env.jitter` drift current), well (`env.g` above a pull floor).
Right (ship): drv 1-4 (drive power steps while burning: 1 at any burn, 2..4 by thrust), ring (blade ring under stress), fin t / fin b (the 3D turn jets firing up/down), bus (bus load over its rail), cell (weakest cell low), cool (thrust heat past hot 80), lsp (life support working: o2 or co2 off band), seal (cabin pressure off band), nav (a course is set), jnt (blade joint stress peak).
