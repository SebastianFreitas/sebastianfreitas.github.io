# hud-c25

Stage: done
Started: 2026-11-04
Procedure: `.claude/skills/plan/interview.md` (the interview), then `run.md` (state in `.claude/plans/hud-c25.state.md` while running).
Path: full
Size: at most 23 KB (20 KB + 3 KB for the 7th phase), each phase at most 2.5 KB (interview.md "Plan size")
Interview: A done · B done · C done · ready gate passed (2 build rounds, design, art; D1-D25 folded; missed questions park for the owner) · missed: how small desktops fit 0.9 text on 0.72 art when labels collide · missed: what unit and frame drift reads in (map scale gives ~23 km/s) · missed: where rail/rose labels sit so pointers run full length · missed: how far apart rail labels sit and where drift's path meets its readout · missed: what hull/ring/joint stress reads (no source in code) · missed: how the bus split fits real loads · missed: how close two labels may sit at small sizes (D38)
Questions: auto

## Brief (owner's words, verbatim)

Build the bridge HUD from the approved C25 sketch. The owner approved the C22 wings sketch ("Approve C22"), then said:

> "we should prob take the opoortunity to updatethe navigation abr now no?"

> "looks cool but a bit confusing,. the naviagtion ab ri suposed to help the player know where to go, i wonder if it could put it up, instead of in the botto,,a nd giv emroe space to the tetx? and idkw hat ur doign but it needs to be very intuitive of where to go with it"

Answers to that: the nav goes at the top of the screen, and it points to the nearest unread beacon.

> "no should be closer to the originala  line thatr epresenst the full lenght of the map, with line sfor palces of inetrest we havent seen yet"

Then "Approve C25", then "Make it a plan".

The approved sketch: memory `hud-c25-approved.js` (script), `hud-c25-approved.png` (render), `hud-c25-build-notes.txt`, all in `C:/Users/Traff/.claude/projects/C--Users-Traff-Desktop-sebas-Portfolio/memory/`. Rules: memory `hud-nav-top-compass.md`, `hud-c22-sketch-approved.md`, `hud-wings-ship-right-outside-left.md`, `hud-tiles-are-ar-ui.md`, `hud-instruments-must-mean-something.md`. The sketch work folder (temporary) is `C:/Users/Traff/AppData/Local/Temp/claude/hud-sheet/` (c22/c24/c25 build notes, judge28-31).

## Pass test (what "done" means; judged by the `look-judge` or a named command)

Owner-approved in A5 (the Brief gives no judging words):

1. Side by side with memory `hud-c25-approved.png` at 2000x1009, a viewer says it is the same HUD: the span line under the top bar, the two wings and the log in the same places and shapes, nothing added or missing.
2. Flying changes it: the "you" pin slides along the span line; after a beacon is read its tick turns into a faint dot and the next unseen tick lights with its distance; the wing readings move with the ship (fuel drains on a burn, thrust heat climbs, drift and bearing change).
3. A viewer who has never seen the bridge can say, from the span line alone, which way and how far the next unread place is.
- Judged on: 2000x1009 Firefox-sized shots (owner's frame), 1440x900 and 1366x768 (whole HUD evenly scaled, text at least 0.9 size, nothing cropped); no phone shots (D24); look-judge with `hud-c25-approved.png` as the reference.

## Initial idea (B1, 2026-11-04; approved in B2 as walked through, D13)

Drives for every reading and lamp: `.claude/plans/research/hud-c25-01-readings.md`.

### 1. One canvas HUD, painted with the bridge
The four HUD blocks and their tiles give way to one thin gold/cream line-art layer drawn as C25 shows it, at its 2000x1009 coordinates (D5). It shows and hides with the bridge as `#bridge-term` does today (from code), paints inside the bridge loop with its static linework cached per resize, and stops when the bridge pauses (D7).

### 2. The span line (top)
Under the site's top bar (D1, D8): one line from x 200 to 1800 at y 88.5, the whole map `CAM.min..CAM.max`, end ticks at both ends (from sketch build notes). Each unread visible beacon (`B.activeMarks()`, not `XP.has("beacon-"+id)`) is a 9 px gold tick; read ones are faint dots; a place hidden behind a note has no mark until it unlocks, as the minimap today (from code). The nearest unread beacon, either side, is the tallest cream tick, joined to the cream "you" pin by a lit cream segment with its distance centred under it ("9 km") (D2). The map is 408 km long (from sketch data), so the voice line "span ranged ... m" reads 408,000 m (from sketch log). The pin moves with the camera; ticks change on `xp:award` (from code). Read-only: no click, no jump (from code). When every visible place is read (`activeMarks()` all `XP.has`), the line shows only faint dots and the pin, no lit tick and no km, and the log types "all signals read · <n> of <n>" once, n = `activeMarks().length` (D16); a place that unlocks later brings its tick and the lit segment back (from code: `marks.js` `visible`).

### 3. Left wing: outside the ship (D6)
As C22: str and brg rails; the field rose by bearing with its spectrum and the "width / 2nd" pocket; the radar disc ringed by the speed gauge; the drift reticle (slip in m/s lat/vert, 1-5 s path, 5 s cone); nose resonance on the left slope; the outside row (rad trefoil, g arrow with its flip arc, ext temp); 14 lamps in two rows (nomic, chaos, span, unfrm, cntc, bcn, sig / rad, dbr, shear, flip, rift, curr, well).

### 4. Right wing: the ship (D6)
Volts rail with 8 cell boxes; bus kW rail with its split (life, drv, thm, gnc); cabin rail with a 30 min trace and 21.0 setpoint; fuel on the right slope (% and time left); thrust heat along the floor with its "hot 80" mark; the ship side view over its hull stress strip; p and rh; the o2/co2 fan; 14 lamps (drv 1-4, ring, fin t, fin b / bus, cell, cool, lsp, seal, nav, jnt).
Every number, trace and lamp moves with a live value (D4): the readings file names each source; the ones with none today (cells, cabin trace, drift, rose) get a small model.

### 5. The log (bottom centre)
The wings' floor runs straight across; up to four older lines fade upward above it (size 10 grey); the newest sits under it in cream, size 13, with ">" (or "!" for a warning), a caret and "now" at the right (from sketch). Typing stays 58 chars/s (from code). A line "next signal: <name> · <n> km <west|east>" is typed once on arrival (the bridge's `begin()` in `bridge.js`, once per page load) and once after each read (`xp:award` for a beacon); between them the span line carries the live km (D15). The three first-visit hints (`bridge-notes.js` `HINT_STEPS`: burn, beacon, fuel; done-state in localStorage `Util.KEYS.HINTS`, set by `B.hintDone`) are each typed once into the log as the newest line when that step becomes current, after the next-signal line on arrival; a hint already done is never typed again (D14, from code). An alarm that flashed a tile today now bursts its lamp and types a "!" line (from sketch).

### 6. What goes
The tiles, +/- size buttons, click-to-enlarge, the `h` palette swap (D12), the bottom-centre minimap `#bridge-map` (D1), the phone 1x2 tiles, and the hint box `#bridge-hint` with its CSS and the note plate's dodge around it (`bridge-notes.js`, the `hr` rect check) (D14).

### 7. Sizes
Desktops below 2000 px wide scale the whole HUD evenly (0.72x at 1440) (D10). Text never goes below 0.9 of its size on desktops (D18). Phones are out of this plan (D24): no phone layout; portrait phones keep the turn-sideways screen (from code); after phase 7 phones (`B.phone`) show the ship, beacons and notes but no HUD, until a later plan (D25).

## Walk-through (B2)

Pieces 1-7 shown once together; answer "That is it" (D13); the three open marks answered as D14 (hints into the log), D15 (next-line timing), D16 (all-read state). Review B3, one round: three wiring gaps fixed from code (which hints and when, what "arrival" is, what n counts); nothing left to ask.

## Current state (explored 2026-11-04; anchors drift, grep the names)

- Today's HUD is four DOM blocks in `index.html` (grep `bridge-hud`): `#bridge-term` (canvas `#binst`, nav bank 2x2 tiles RADAR/PULL/SIGNAL/NAV, with the `#binst-out`/`#binst-in` size buttons), `#bridge-sys` (canvas `#binst-sys`, ECLSS/RAD/HULL/PWR), `#bridge-log` (`.tlog`, typed lines), `#bridge-map` (bottom-centre track `#btrack`, labels "West · the future / East · the past"), plus `#bridge-hint` ("Hold to burn — click a beacon to set course").
- `js/hud/instruments.js`: tile framework (`PANELS`, `SYS_PANELS`, `CELL_W` 168 x `CELL_H` 122), click-to-enlarge a tile (`bindFocus`), phone compact 1x2 banks (`COMPACT`), fuel-as-tile fallback (`PANELS_FUEL`), alarms (`tickAlarms`/`arbitrate`/`alert`, the log line flashes the tiles), palettes (`PALETTES` current/site/verdigris/violet, temporary key `h`, `?hud=`, sessionStorage `hudPalette`).
- `js/hud/tiles-nav.js`, `tiles-sys.js`: the eight tile painters (models for radar blips, signal, pull, eclss o2/co2/p/rh, rad dose, hull, bus loads). `js/hud/side.js`: fuel + thrust heat canvas `#bridge-fuel` left of the log, nose-resonance graph `#bridge-res` right of it (reads `env.res`).
- `js/bridge/bridge-env.js`: `B.env` fields chaos, future, nomic, wear, jitter, sway, glare, rad, heat, contained, link, frozen, echo, g, rho, gAnom, tag, res, site, siteName, w, n1-n3, t, twin. Places that bend them: `bridge-sites.js` `SITES` (rule: add a site, never a special case in a tile).
- `js/bridge/bridge-input.js` `rebuildTrack` (~line 300): the minimap is read-only (no jump, no scrub); one `.mk.poi` per `activeMarks()` at `(m.cam - CAM.min)/(CAM.max - CAM.min)`, `.read` when `XP.has("beacon-"+id)`; updates on `xp:award`. `bridge-readout.js` moves `#byou`. Gamedev setting archived: one world (void), `CAM.min..CAM.max`.
- `js/bridge/bridge-log.js` `BridgeLog.create(el)`: queue, 58 chars/s typing, `max` 6 lines, numbers wrapped in `.n`.
- `js/bridge/bridge-panel.js` `deskDefault()`: banks 1.2x on desktops >= 1800x800, ramping from 1 at 1200 px; stored `INST_SCALE` wins.
- Portrait phones see `#bridge-rotate` (turn sideways) instead of the bridge.
- No `tools/` script names the HUD ids; `snap.py` bridge scenes will change (expected) and `nav-flows` beacon flows must still pass.
- Sketch: memory `hud-c25-approved.js` (421 lines, `OPTS.c25`, 2000x1009 coordinates, sample data `K.D` in `%TEMP%/claude/hud-sheet/scripts/lib.js` ~line 41, allowed red-line area `LEFT`/`RIGHT` polygons there too). Copy what the phases need into the repo's plan research early: the temp folder may be wiped.

Research digest: `.claude/plans/research/hud-c25-00-intake.md`.

## Scope

In: the C25 HUD on the bridge (`index.html` hero), its readings and lamps, the log, desktop sizes, and removing the old HUD. Out, exactly as they are (D8): the site's top bar, the ship, the world art, the beacon scan beat (`bridge-poi.js`), the notes (only the hint dodge goes), the portrait turn-sideways screen, the cutscenes gear `#bridge-modes` (a `.bridge-hud` block that stays, from code), the case pages, any phone layout (D24). Deleted at the end, none kept (D1, D12, D14): tiles, the `side.js` fuel/resonance canvases (now in the wings), +/- size buttons, click-to-enlarge, the `h` palette swap and `?hud=`, the minimap `#bridge-map`, phone 1x2 tiles, the hint box `#bridge-hint`.

## Constraints (every phase)

- Build exactly what C25 shows. Sources: `.claude/plans/research/hud-c25-sketch/` (`opt-c25.js` = memory `hud-c25-approved.js`; `lib.js` kit with the `LEFT`/`RIGHT` red-line area; `page.html`; build notes). Reference picture: memory `hud-c25-approved.png`. The sketch's background fills (log erase, line-1 cover, `bare` checks) are sketch chrome, never ported.
- Line art only: thin gold/cream linework as drawn, no filled panels, bezels or brackets; paint stays inside the red-line area (D5).
- Every number, trace and lamp moves with a live value, never a fixed or random one (D4). Models, lamp rules and the layout math: `.claude/plans/research/hud-c25-02-models.md`.
- Left wing = outside detections, right wing = the ship; chaos/nomic/unformed lamps only when detected; words say incoherent/coherent/nomic, never magic (D6, `rules/instruments.md`). Red only on the rad lamp over its limit (memory one-red).
- Cost: paints inside the bridge loop (`bridge-readout.js` `drawInstruments`), static linework cached per resize, nothing while the bridge pauses; no own rAF, no `backdrop-filter` (D7).
- Until phase 7 the new HUD shows only with `?c25=1` (the old HUD hidden then: every `.bridge-hud` except `#bridge-modes`, which stays visible and unchanged); without it the site is unchanged, so `snap.py compare` is `same` on every scene in phases 1-6.
- Shots: `py -3 tools/hudshot.py <run> [--c25] [--size WxH] [--at <mark>] [--claimed] [--read <n>] [--burn <s>] [--touch]` (phase 1 builds it) into `snapshots/<run>/`; the look-judge gets them with `hud-c25-approved.png`. A check on change (Pass test 2) always gets a before/after pair.

## Phases

### 1 · Look proof: C25 painted with sample data (code)
Pieces 1, 7. Deliver `js/hud/hud-c25.js` (`window.HudC25 {mount, draw, resize, report}`): `opt-c25.js` plus the `lib.js` kit it uses, every value read from one data object, filled from `K.D` sample data for now. One `<canvas id="bhud">` over `#bridge-canvas` in `#bridge-hero`, DPR-sized, shown like `.bridge-hud` (opacity on `.live`, hidden on `.is-cinematic`); static linework drawn once per resize to an offscreen canvas and blitted; drawn from `drawInstruments` after `Instruments.draw`. Layout from the models file: s = min(1, W/2000, H/1009), wings to the bottom corners, log bottom centre, span line at bar bottom + 29.8*s. Text floor (D18): lines and shapes use s, text sizes use ts = max(s, 0.9) on desktops (1 at 2000x1009, 0.9 at 1440x900 and 1366x768 where s = min(0.683, 0.761) = 0.683); text keeps its sketch anchor and alignment and grows from it. Only under `?c25=1`. Plus `tools/hudshot.py` (enters via the gate as `snap.py` does; flags above): `--read <n>` awards the n nearest unread beacons with `XP.award("beacon-"+id, ...)` as `bridge-notes.js` does; `--burn <s>` holds the mouse down s seconds and shoots while held (as `nav-flows` `page.mouse.down()`); `--touch` (test only, no look checks) opens a touch, mobile context (`has_touch`, `is_mobile`, as `snap.py` `bridge_phone`, snap.py:387) and prints `B.phone` and `report()`. Specs: 1 the port (split writes), 2 mount + tool. Reads: `opt-c25.js`, `bridge-readout.js`.
Verify: implementer: `hudshot.py p1 --c25` at 2000x1009 and 1440x900; `snap.py` fresh before/after all `same`; `nav-flows` beacon flows; no console error; `HudC25.report()` gives s 1 / 0.72 / 0.683, ts 1 / 0.9 / 0.9, span y 88.5 / 80.2 (also shot at 1366x768). Look-judge: Pass test 1 on both shots (sample data). FAIL: fix the named shapes once, then stop.
Reviewed: Right (D17).

### 2 · Span line live (code)
Piece 2. Needs 1. Marks: `B.activeMarks()`; read (`XP.has("beacon-"+id)`) = faint dot r 1.7 a .6; unread = gold tick 9 px w 2; the nearest unread either side (min |m.cam - camX|) = cream tick 14 px w 2.5 with glow, a lit cream segment w 2.5 to the pin, "<n> km" size 11 centred under it at y+18, n = round(|Δcam| / (CAM.max - CAM.min) * 408). Pin: cream stem y-9..y+10, dot r 4, "you" size 9 at +8,-5. x = X0 + (cam - CAM.min) / (CAM.max - CAM.min) * (X1 - X0), X0..X1 = sketch 200..1800 placed by the layout; west = smaller cam. A place behind a note has no mark until it unlocks (`marks.js` `visible`). Tick layer rebuilt on `xp:award` and resize; pin and segment per frame; read-only. All read: dots and pin only, no lit tick or km (D16).
The nearest-unread rule is one function, `nearestUnread()` in `hud-c25.js`, which phase 3's log line also uses.
Verify: implementer: `report().span` {you, next, km, dir, unread, read} before and after `XP.award` of the next one (next changes, unread - 1); `--claimed`: no next; `nav-flows` beacon flows. Look-judge, 2000x1009: Pass test 2 (span) on the pairs `--at <a>` vs `--at <b>` and plain vs `--read 1`; Pass test 3 on plain.
Reviewed: Right (D17).

### 3 · The log (code)
Piece 5. Needs 1, 2. `bridge-log.js` also keeps its lines in memory (`lines()`: text, kind, chars shown); queue, typing and `lines()` run when `el` is null, only the DOM writes no-op (today `push` returns early on null, and phase 7 deletes `#bridge-log`). `hud-c25.js` paints them: up to 4 older lines size 10 grey, i 0 = oldest at the top, y 905 + 15i, alpha .38/.5/.64/.8 by i (`opt-c25.js` ~399: faintest at the top); the newest at y 986 size 13 cream with ">" gold, or "!" cream for warn/err/crit, a caret while typing, "now" right-aligned at 1208; floor line 777..1224 at y 959.5. Typing stays 58 chars/s. "next signal: <name> · <n> km <west|east>" (name, km, dir from `nearestUnread()`) typed once on `begin()` and after each beacon `xp:award` (D15). The three hints (`HINT_STEPS` ids burn, beacon, fuel) are typed as the newest line when current (the first not done; `bridge-notes.js` exposes it as `B.hintNow()` and the log types the new current one when `B.hintDone` marks a step), after the next-signal line; a done one never again (D14). The log's own words per hint id live with the log in `hud-c25.js`; `HINT_STEPS` text stays as it is until phase 7 (the old box must stay `same`). Words, lowercase in the log's voice: burn "hold anywhere · burn toward it", beacon "click a beacon · set course · contact files it", fuel "fuel refills when the burn stops" (D21). A hint still current and not done is typed once more when it is no longer among the 5 lines shown (5 newer lines came after it) or 20 s after it was typed with no `pointerdown`/`keydown` on the window; at most once more per hint per page load (D20). All read: "all signals read · <n> of <n>" once (D16).
Long lines (D22): the newest line (text from x 808, caret 2..10 px after it) is cut with "…" so its end and caret stay 8 px (sketch caret gap) left of "now"'s left edge (`measureText`, mic size 9 at 1208 right); older lines are clipped at the log column's right edge x 1214 (sketch log area 786..1214). Check: a 120-char test line in `report().log` shows `cut: true` and its painted end < "now" left - 8.
Verify: implementer: `report().log` (last 5 lines) after load and after one award; each hint typed once, then once more after 5 pushed lines or 20 s idle (fake clock or `push` x5), never a third time; the long-line check. Look-judge (mid-way check): Pass test 1 (log) at 2000x1009.
Reviewed: Right (D17).

### 4 · Left wing live (code)
Piece 3. Needs 1. Every left reading and its 14 lamps from the models file "Left wing"; lamp states drawn as the sketch `lamp()` (0 off, 1 lit, 2 burst, 3 red). The models are lifted into shared functions, not copied: the old tiles call the same ones until phase 7. Reads: `tiles-nav.js`, `side.js`.
Verify: implementer: `report().left` at the void start and at a chaos site differ as the rules say; `snap.py compare` `same`. Look-judge: Pass test 2 (left wing) on the pair `--at` void start vs `--at` a chaos site.
Reviewed: Right (D17).

### 5 · Right wing live (code)
Piece 4. Needs 1. Every right reading and its 14 lamps from the models file "Right wing"; alarm lines and the crit burst as the models file says (no new log lines). Reads: `tiles-sys.js`, `side.js`.
Verify: implementer: `report().right` at rest and after a 3 s burn hold (fuel down, heat up, drv 1+ lit); `snap.py compare` `same`. Look-judge: Pass test 2 (right wing) on the pair plain vs `--burn 3`.
Reviewed: Right (D17).

### 6 · Sizes, last look check (code)
Piece 7. Needs 2-5. Desktops only (D24): 1440x900 and 1366x768 evenly scaled with text at ts (phase 1) (D10, D18); portrait phones unchanged.
Verify: implementer: `hudshot.py p6 --c25` at 2000x1009, 1440x900 and 1366x768; HUD paint inside the viewport at each; text-size check: `report().textMin` >= 0.9 x its sketch size, and no two text boxes overlap each other at 1366x768 (`report().textHits` = 0; else list them and stop the phase for the owner, `Questions: ask`); the span line's painted box does not meet `#bridge-modes`' rect (else start the line 12 px right of the rect). Look-judge: 2000x1009 and 1440x900 Pass test 1, 2 (pairs as phases 2, 4, 5), 3.
Reviewed: Right (D17).

### 7 · Swap: C25 is the HUD, the old one goes (code)
Piece 6. Needs 6 passed. Drop the flag; delete the old blocks in `index.html` (`#bridge-term`, `#bridge-log`, `#bridge-map`, `#bridge-hint`, `#bridge-sys`; `#bridge-modes` stays), the `side.js` canvases `#bridge-fuel`/`#bridge-res` (its models stay as the shared functions), the tile painters and framework parts no model uses, palettes, `rebuildTrack`/`syncLabels`, the hint CSS and the `hr` dodge in `bridge-notes.js`, the size buttons and the `INST_SCALE` block; `MAP.md` rows; `bump.py`. Phones (`B.phone`, landscape) get no HUD: the C25 canvas is hidden and not painted there (D25). `.claude/rules/instruments.md` (owner OK'd, D23): the line "a bar climbing or a tile blinking red" becomes "a bar climbing or a lamp bursting", and "Tiles read `r.env` only; they never reach into `Bridge`" becomes "HUD readings read `env` and the shared models only; they never reach into `Bridge`"; no other line changes.
Verify: implementer: `snap.py` before/after (bridge scenes change, the rest `same`), full `nav-flows` (known failures only), no console error, `report().log` non-empty after load with the flag gone; phone check: `snap.py capture <run> --only bridge-phone-landscape` passes (no console error), and `hudshot.py p7 --touch --size 844x390` (nav-flows `PHONE_LANDSCAPE`) prints `phone: true`, canvas hidden, `painted: false`. Reviewer on the diff.
Reviewed: Right (D17).

## Progress

| # | Phase | Kind | Needs | Status |
|---|---|---|---|---|
| 1 | Look proof | code | - | done 62e2088 (2000 PASS; 1440/1366 label fit moved to phase 6 by D26) |
| 2 | Span line live | code | 1 | done d48b93a (2000 PASS after one fix round: read dots in gaps of the lit segment) |
| 3 | The log | code | 1, 2 | done a9e7cf0 (2000 PASS first round; caret not caught mid-typing in the shots) |
| 4 | Left wing live | code | 1 | done 14cea04 (look-judge 6 PASS) |
| 5 | Right wing live | code | 1 | done 5bb1e4f |
| 6 | Sizes, last look | code | 2-5 | done dd45cff (judge 2 PASS 2000/1440 + 1366 fit; judge 3 log clip fixed) |
| 7 | Swap and delete | code | 6 | done bdf93ed (8903e20 + bdf93ed; reviewer 4 leftovers fixed; genesis diff judged PASS, seeded-random shift) |

## Open items

- Part C done (C3: D17 folded, one review round, 3 fixes from code); Option map removed.
- Ready gate round 1: 6 fixes from code; D18-D23 answered and folded. D24 (no phones) folded: phone layout, phone fuel mark, phone label floor, `--phone` shots and phone judging removed; D11 and D19 void.
- D25 (phones hide the HUD after the swap) folded into phase 7 and piece 7.
- Ready gate round 2 (changed lines): 2 fixes from code (hudshot `--touch` for the phase 7 phone check; hint words live with the log, `HINT_STEPS` untouched until phase 7). No third round.

## Decisions (while asking; `(auto)` = taken while running)

- D1-D25 are folded into the phases, Scope, Constraints and Pass test; D3 (full path) is the header.
- D26 (2026-11-04, after phase 1 blocked): small desktops move on; phases 2-5 build and judge at 2000x1009; phase 6 gives each crowded label at 1440x900 / 1366x768 a hand-placed small-size spot (per-label offsets; the log's next-signal line wraps or shortens to "next: <name> · 9 km W"). D18 (text at least 0.9) stays.
- D27 (auto, phase 3): the next-signal line lowercases the mark name ("the shattered"), though the sketch shows "The Shattered"; reason: `.claude/rules/instruments.md` says the log voice is lowercase. missed: keep mark names in their own case in the log?
- D28 (auto, phase 4): rose width = direction-finding spread from strength, `±round(clamp(60/sqrt(max(str,1)),2,45))°`, `—` with no contact; dbr lights at site `shattered`, rift never (no SITES name/tag says rift); reason: the models file gives no source. missed: what width and rift should read.
- D29 (auto, phase 4): live values drawn clamped to the sketch's ranges (str rail 0..100, rose lobe sqrt-grown capped 40 px, drift clamped to the 104 px ring with an arrowhead, g arrow capped), numbers exact; reason: real values ran off the wing.
- D30 (2026-11-05, owner, after phase 4 blocked): drift shows only the unwanted sideways/vertical slip against the ship's own commanded heading, in m/s, scaled so normal flight reads single digits like the sketch ("2.3 m"); never raw map-scale metres.
- D31 (2026-11-05, owner, after phase 4 blocked): rail and rose labels move clear of the pointer track: "str" and "brg" sit beside the rail ends so the pointer runs the full 0..100 length; the rose's bearing number sits outside the ring, opposite the needle.
- D32 (auto, 2026-11-05): the ship snaps to its aim, so slip is a short transient; the drift readout, path and cone hold the peak |slip| per axis and fall linearly to live over 1.5 s; DRIFT_K = 1/600 (a 90 deg turn reads ~3.5). The 12 px rail-label gap applies only to the str/brg pair.
- D33 (2026-11-05, owner, after phase 4 blocked again): spread and clip: the "str" label sits above its rail and "brg" below its rail; the rose needle stops at the rose's inner ring near north bearings (never reaches the "field one source" header); the drift path line is clipped at the readout's box (never strikes "3.5 m / off in 5 s"). Also set `Questions: auto` for the overnight run.
- D34 (auto, owner-delegated, 2026-11-05): the cream spike touching "field one source" at north was the rose's lobe peak, not the needle; the lobe radius is capped where it falls under the header (peak ~33 px at north, 40 elsewhere) so lobe plus glow stays 3 px under it; `sv()` spectrum index wrapped to 0..31 (was NaN below 22 deg).
- D35 (auto, 2026-11-05): hull stress has no source in code; `HudModels.stress(u)` models it: base 0.15, joint bump (JOINT_U 0.36, RING_U 0.68) grown by thrust and wear, a 2 s kick from an impact; jnt/ring lamps read it. omega and impact are tiles-sys.js locals, passed as 0 until phase 7 moves the models. reason: models file names a strip with no source.
- D36 (auto, 2026-11-05): bus split row shows the sketch's drv/thm/lsp/gnc/spare at full rail width, each at least label-wide; lsp = models' `life`, spare = 6 kW minus the total; needle clamps 0..6; the big fuel number stays at the sketch's place below the cells for every value. reason: live values broke the sketch's shapes (judge 1 FAIL).
- D37 (auto, 2026-11-05): resting hull stress = standing load (rib ripple ±0.05 drifting with `Instruments.now`, grows with sway/jitter, resting joint bump 0.3); burn bump scaled so the joint peaks 0.70 at full thrust (jnt lights from ~0.6 thrust). reason: a flat line at rest failed the look.
- D38 (auto, 2026-11-05): `report().textHits` = text boxes, ship, chevron and heat bar; designed units (same-row or stacked pairs under 12 px apart at 2000) hit only on overlap, other pairs under 4*s. reason: 4*ts flagged every label/value pair the look-judge passed.
- D39 (auto, 2026-11-05): log lines keep the values of the moment they were written (a bearing line may differ from the wing later); the deliberate glitch lines ("bearing nan") in `bridge-voice.js` stay. reason: the log is a record, glitches are the chaos voice.
- D40 (auto, 2026-11-05, phase 7): `bump.py` not run on the branch; worktree mode makes it a landing step (`try.py --commit` runs it). reason: the mode file forbids it on a branch.
- D41 (auto, 2026-11-05, phase 7): genesis scenes moved 0.3-2.2% after the swap because the deleted old-HUD code drew from the seeded `Math.random` stream each frame (camera shake now lands a few px differently); look-judge PASS, same objects and composition; accepted, no baseline re-recorded. reason: no code path couples the HUD to the cutscene.
- Phase 7 notes: snap `p6-after` vs `p7-after` 70/88 same, bridge scenes changed as meant; nav-flows full: 9 failing = known `worklink` lands-on-Work + `cc-read-xp`/`cc-keys`/`cc-win` (8), which fail identically on the pre-phase commit 61e568e (not this plan); phone 844x390: `phone: True`, `canvas: hidden`, `painted: False`; `report().log` 3 lines at 2000/1440/1366, textHits []. A detached temp worktree `%TEMP%/p7base` (pre-phase check) is left for `tools/cleanup.py` (git-guard blocks removing it here).
