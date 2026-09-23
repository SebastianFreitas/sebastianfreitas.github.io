## Main session role

The main session directs exploration, designs the change, writes the spec,
reviews the diff the implementer returns, and writes the follow-up spec if
anything needs fixing.

- The main session must not call Write or Edit on source files.
- The main session must not use Bash to modify files: no `sed -i`, no
  heredocs, no `>` or `>>` redirects, no scripts that write files.
- Only exception: a single-line change where writing the spec would take
  longer than the edit itself. Cost and convenience are not exceptions.

### Delegate exploration too

- Before designing anything, send codebase searches and file reading to the
  `Explore` subagent and work from its summary. Do not read files into the
  main context yourself.
- Why: a file read in the main session costs Opus tokens once for the file
  and again on every later turn. Explore runs on Haiku.
- Only exception: the specific file you are about to write a spec against.
  Read that one directly, and only the range you need (see Token budget).
- Do not set `CLAUDE_CODE_SUBAGENT_MODEL`. It would move Explore from Haiku
  to Sonnet and cost more, not less.

## Token budget

This repo is small in file count but the hero code is big. Whole-file reads
are the main cost. These rules apply to the main session, Explore and the
implementer alike.

- **Never read a whole file over 300 lines.** The files over 500 lines are
  `bridge.js`, `world.js`, `depths.js`, `instruments-tiles.js`,
  `genesis-void.js`, `genesis-saga.js`, `rexart-deep.js`,
  `rexart-surface.js`, `instruments.js`, `landart.js` and `genesis.js`. Use
  the File map below to pick the function or section, then `Grep -n` for the
  name and `Read` with `offset`/`limit` around the hit. Line numbers in this
  file drift; the function names do not, so grep the name rather than
  trusting the number.
- **Never open** `cv.pdf`, anything under `media/`, `Temporary VoidScape
  Media/`, or `__pycache__/`. They are binaries and staging assets. `Glob`
  or `ls` them if you need names; never `cat`, `Read` or `wc` them.
- **Do not re-survey the repo.** The file map, load order, storage keys and
  test flows are already below. Only re-derive them if a grep proves the map
  wrong, and then fix the map here.
- **Explore prompts must be narrow:** name the file, the function or the
  concept, and ask for `file:line` anchors and a summary, not code bodies.
  "Read bridge.js and tell me how it works" is the failure mode.
- **Specs carry their own anchors.** The implementer has `omitClaudeMd: true`
  and never sees this file. Put the target function names (and a grep
  string) in the spec so it can jump straight there instead of reading the
  file top to bottom.
- **One file per implementer call** unless the change genuinely spans files.
  Do not send the implementer `world.js` and `bridge.js` for a one-file fix.
- **Test only the flows you touched.** `py -3 nav-flows.test.py <flow>`; the
  full suite is 20 flows and only needed before a commit that touches
  navigation, the gate or storage.
- **Screenshot regression is mandatory for any change that paints or
  styles.** `py -3 snap.py capture <name>` (about 3.5 min, 50 scenes) then
  `py -3 snap.py compare <before> <after>`. Capture once before touching
  code, once after; the compare must be `same` on every scene you did not
  intend to change. The last verified capture folders live under
  `snapshots/` (gitignored).
- Bump every `?v=` at once with `py -3 bump.py` before a commit that changes
  any script or stylesheet; never edit the numbers by hand.

## File map

No framework, no bundler, no npm. Every JS file is an IIFE that publishes
one global on `window`. Sizes are line counts.

| File | Lines | Purpose | Publishes / uses |
|---|---|---|---|
| `bridge.js` | 1513 | Hero orchestrator: camera, pointer/burn input, notes, marks drawing, depths reveal, sector switch, HUD wiring, render | `window.beaconReport`, `depthsReport`, `depthsReveal`, `depthAlpha`, `__bridgeRefit`, `pacingReport`; uses everything below |
| `pacer.js` | 163 | rAF scheduler: paints on refresh boundaries (every Nth refresh, 60 fps cap), parks to a 10 fps timer when the scene is at rest and untouched, wakes on input | `window.Pacer {create}`; one instance per animated canvas |
| `marks.js` | 77 | The landmark roster: `MARKS` (Void beacons), `PLANETS` (Game Dev), `GD_LAND`/`GD_BOUNDS` | `window.Marks`; uses `World` |
| `bridge-voice.js` | 367 | What the readout says per region, with warn/err/crit odds | `window.BridgeVoice {create(S)}`, a factory over a view `S` of bridge state |
| `bridge-log.js` | 68 | The typed-out readout queue | `window.BridgeLog {create(el)}` → `{push, run, setMax, idle}` |
| `genesis-state.js` | 333 | Cutscene shared state: BEATS, world constants, seeded scenery, transport state (beat/local/cam/…), timeline queries `since`/`linear`/`only`/`sx` | `window.Gen`; every genesis file reads/writes through `Gen` |
| `genesis-paint.js` | 136 | Cutscene helpers and terrain (`flatGlow`, `flatSphere`, `gridXs`, `fillRidge`, `mixHex`, `rexLandHeight`, `mainHeight`, …) | `window.GenPaint` |
| `genesis-void.js` | 678 | Cutscene painters: motes, chaos, the point, the span, the womb and old ones, orbs, rings, beams, names | `window.GenVoid` |
| `genesis-rex.js` | 442 | Cutscene painters: chases/duel, Rex land, the hole, the grip, the buried god, the gods' birth, the depths | `window.GenRex` |
| `genesis-saga.js` | 672 | Cutscene painters: `sagaAt` (all saga-beat state), mainland, city, armies, nest pit, `drawSaga`, `drawLiveWorld` | `window.GenSaga` |
| `genesis.js` | 515 | Cutscene core: DOM/overlay, transport `play`/`skip`/`seek`/`finish`, `camAim`/`step`, the `draw` conductor, input | `window.Genesis {active, pending, play, skip, seek, step, draw}` |
| `instruments.js` | 603 | HUD framework: banks/layout, alarms, static-blit cache, paint loop, `registerTiles` | `window.Instruments {mount, mountSys, draw, setScale, setCompact, focus, focusSys, impact, setRepair, alert, registerTiles, …}` |
| `instruments-tiles.js` | 857 | The eight HUD tiles (radar, signal, drive, nav, eclss, rad, hull, bus) and `tickSys` | registers itself with `Instruments.registerTiles` |
| `world.js` | 1195 | Scenery only: Arcanis geography and painting. No input, no HUD | `window.World {SLOT, LAND, BOUNDS, DECK, VIEW_UNITS, chaosAt, futureAt, draw}`; uses `RexArt`, `LandArt`, `depthAlpha` |
| `depths.js` | 977 | Pure data: beacon-gated node clusters and layouts. No DOM | `window.Depths {nodes, clusters}` |
| `voidship-art.js` | ~480 | The craft's painters: angular side-view city-ship hull (`drawHull`, corners only, every thin part floored at 1 px because L is only 96 px), solid front-on block shown mid-turn (`drawFront`), alien drive fumes (`drawFumes`), emitter seats `EMIT`, palette `COLORS`. Local frame: +x nose, +y down, units of hull length L; the caller mirrors with `scale(face,1)` and `block()` keeps the lit side on screen-left | `window.VoidshipArt`; uses `Paint`, `Util` |
| `voidship.js` | ~380 | The craft: hold-as-stick / tap-to-seek motion, release-stops rule, fuel, yaw flip + pitch, fume particles (screen frame, damped inertia), draw orchestration | `window.Voidship {BASE, create, resize, setPower, setCourse, setThrusting, clearCourse, step, draw, screenPos, touching, touchingMark, stats, canBurn, addFuel, settled}` |
| `storm.js` | 527 | The Sector Zero storm: two debris compositions beside the planet, a desk to the right (tower, floppy, CRT, speaker, heater, keyboard, can, mug, note) and a repair station below-left (open case, side panel, motherboard, GPU, open hard disk, PSU, RAM, CPU, fan, the game's screwdriver); the cycle home → storm → gather (objects kicked loose, drift on noise inside a tether, spring home, silent snap), ship shoving via three hull circles, object-object circles, deck-line and top-bar bounce, the terminal flicker on the CRT, faint ghost terminal lines that type and fade. Positions are px relative to the planet's screen centre (the station tracks a fraction of H); one seeded `mulberry` for every random choice | `window.Storm {step, draw, lively, report}`; uses `Util`, `Paint`; fed by `bridge.js` `stormEnv` |
| `forge.js` | 837 | VoidScape bench and run console beside the planet: crafting bench (gun with mod rows, add/remove/destroy), mission console (search three paths, select, empower, reload, open portal → generated floor plan); panels unlock when the bench / map depth nodes are reached | `window.Forge {step, draw, hit, over, lively, report, unlock}`; uses `Util`; fed by `bridge.js` `forgeEnv` |
| `rexart-deep.js` | 638 | Painters for the three Rex caverns | `window.RexArt.titans / .valkhar / .law` |
| `rexart-surface.js` | 625 | Painters for Rex surface landmarks | `window.RexArt.firstlight / .crimson / .bonespire` |
| `landart.js` | 587 | Painters for the five Mainland factions. `+y` is UP here, opposite of rexart | `window.LandArt.shattered / .libertech / .dawn / .accord / .gore` |
| `xp.js` | 338 | Site-wide progression, level chip, cross-tab sync, `?reset=1` | `window.XP {award, has, total, mount, reset, …}`; fires `xp:surge` |
| `intro.js` | 206 | Entry gate UI: boot log, the two paths, exits | uses `SiteEntry`, `XP` |
| `lamp.js` | 109 | Canvas beacon draw + HIT radius (named lamp because adblockers drop "beacon") | `window.Beacon {draw, HIT}` |
| `planet.js` | 136 | Placeholder worlds for the Game Dev sector | `window.Planet {draw}` |
| `lazy-video.js` | 137 | Swaps in `media/**/sd/` encodes on slow connections | none |
| `surge.js` | 132 | Level-up light animation, listens for `xp:surge` | `window.Surge {play, reachFor}` |
| `entry.js` | 48 | Head-time gate decision: `restore` / `deeplink` / `returning` / `first` | `window.SiteEntry {kind, sector, view}` |
| `embed.js` | 30 | Click-to-load itch.io iframes | `window.Embed {reset}` |
| `util.js` | 67 | Shared maths (`clamp mix smooth approach easeOut wrapPi mulberry hash1 vnoise ridge fmt`), `reduced()`/`coarse()` media queries, storage `KEYS` + `read`/`write`/`remove` | `window.Util`. Loaded first on every page |
| `paint.js` | 82 | Flat-art primitives (`poly line rect circle lin rad litShade offsetShade merlons fillRidge`) | `window.Paint`. Used by landart, rexart-*, world, genesis |
| `style.css` | 422 | Base site: topbar, sections, project pages, small screens. Tokens, breakpoints and the z-index ladder are documented at the top | |
| `gate.css` | 126 | The entry gate: boot log, then the two paths | index only |
| `bridge.css` | 726 | Everything hero/cockpit: HUD, notes, setting panel, boot terminal, genesis overlay | index only |
| `beacon.css` | 165 | Level chip, claim ceremony, surge | |
| `index.html` | 423 | Homepage. Inline head script is only the service-worker purge | |
| `projects/*.html` | ~87–253 | Four case-study pages, same shell | |
| `404.html` | 54 | Not-found page | |
| `nav-flows.test.py` | 891 | Playwright flows; starts its own server on a free port | |
| `snap.py` | 531 | Screenshot regression harness: `capture`, `compare`, `list` | |
| `bump.py` | 33 | Sets every `?v=` across the HTML pages | |
| `serve.py` / `serve.bat` | 67 | No-cache static server on 8765 (8000 avoided: stale SW) | |

### Load order

`index.html` head: `style.css`, `gate.css`, `beacon.css`, `bridge.css`, then
`util.js`, `xp.js`, `entry.js` (blocking, on purpose), then the inline SW
purge. Body tail: `surge → lamp → planet → depths → instruments →
instruments-tiles → paint → rexart-surface → rexart-deep → landart → world →
voidship-art → voidship → storm → forge → embed → pacer → marks → bridge-log → bridge-voice → bridge →
genesis-state → genesis-paint → genesis-void → genesis-rex → genesis-saga →
genesis → intro`.

Nothing uses `defer`/`async`. `intro.js` must stay last: it dispatches
`site:preload` synchronously at top level, so every file that registers a
listener has to be parsed before it. `bridge.js` reads `World` (and `Util`,
`Marks`) at parse time, so those must precede it. Scripts carry `?v=N`
cache-busters; bump them with `py -3 bump.py`.

Project pages load only `style.css`, `beacon.css`, then `util → xp → surge`
plus `embed.js` (conclusus, heavylight) or `lazy-video.js` (sector-zero,
voidscape), and an inline `XP.award(...)`.

### Section anchors

Grep these names; the ranges are approximate.

- **bridge.js** — gate deferral `readyBridge`/`startLoop` (~107–130), state +
  `wx()` world→screen (~158–229), notes `showNote`/`placeNote`/`selectMark`
  (~291–376), hints `HINT_STEPS`/`hintDone` (~377–401), input
  `clientToCourse`/`beginBurn`/`endBurn` + listeners (~426–590), minimap
  `rebuildTrack` (~593), marks `drawCue`/`drawCueLine`/`drawMarks`
  (~654–802) and `marksSettled` (~1429), `__bridgeRefit`/`applyScale`
  (~798–805), setting panel `applySceneMode`/`beginModeSwitch`/`drawIris`/
  `drawSwitchFX` (~838–1103), depths `spawnDepth`/`revealDepths`
  (~1104–1181), `voice = BridgeVoice.create` (~1182), hull
  `takeDamage`/`runRepair` (~1196–1243), voice glue
  `idleLine`/`checkRegion`/`reportFiled` (~1244–1315),
  `updateHUD`/`drawInstruments` (~1316–1367), movement `step` (~1368),
  `atRest` (~1436), `render`/`paintOnce` (~1447–1513), storm glue
  `stormEnv`/`drawStorm` (after `drawMarks`) and the `Storm.lively()` check
  in `atRest`, forge glue `forgeEnv`/`drawForge` and the `Forge.hit` test in
  pointerdown, `pacer =
  Pacer.create` (~116).
- **genesis-state.js** — `BEATS` (~22), world constants (~70–176), state
  block (~177–195), `seed` (~196), queries
  `since`/`linear`/`only`/`sx`/`beatDur` (~307–333).
- **genesis.js** — transport `play`/`skip`/`seek`/`finish` (~124–209),
  `camAim` (~229), `step` (~293), `draw` (~326).
- **genesis-void.js** — `fillBg` (~11) … `drawName` (~651).
- **genesis-rex.js** — `chaseAt` (~27) … `drawDepths` (~294).
- **genesis-saga.js** — `sagaAt` (~13) … `drawLiveWorld` (~652).
- **instruments.js** — layout `CELL_W`/`gridW` (~33–72), `mount`/`mountSys`
  (~148–219), `blitStatic` (~248), `draw` (~306), alarms `tickAlarms`
  (~328)/`alert` (~426), `F` kit (~591), `registerTiles` (~593).
- **instruments-tiles.js** — `radarStatic` (~62), `radar` (~91), `signal`
  (~188), `drive` (~256), `nav` (~386), `tickSys` (~491), `eclss` (~568),
  `rad` (~613), `hull` (~684), `bus` (~766).
- **world.js** — consts (~28), mainland `band` (~78), Rex `rexHeight`
  (~126), `REX_PLACES` roster (~159), then one `drawX` per feature:
  `drawVoid` (~221), `drawChaos` (~252), `drawWatcher` (~406), `drawSerus`
  (~431), `drawNephilim` (~592), `drawVikings` (~756), `drawRex` (~835),
  `drawHell` (~879), `drawRexPlaces` (~965), `drawLandPlace` (~1011),
  `drawRoot` (~1044), `drawBridge` (~1070), `draw` (~1155).
- **depths.js** — `CLUSTERS` data (~37–820; VoidScape `bnote-vs-*` ~166–380,
  Bone Spire ~581, Titans ~594), `waveOf` (~822), `LAYOUTS` (~846), `nodes()`
  (~883).
- **voidship.js** — `BASE` tunables (top), `create`, `setThrusting` (the
  release rule: keep the point only if the ship can still stop on it),
  `step` in order: hold boost → wanted velocities (`far` = cruise, else the
  `sqrt(2·brake·d)` arrive profile) → yaw target + turn gating → `ease`
  (asymmetric accel/brake time constants) → arrival snaps → anchor pulse →
  fuel → `thrustAmt` → pitch → fume spawn/update; then `settled`, `stats`,
  `draw` (cue → fumes → translate/rotate(pitch)/scale(face) → `drawHull` →
  `drawFront`).
- **voidship-art.js** — `block` (facing-aware `Paint.litShade` wrapper),
  `drawHull` (underside → hull → belly → panels → windows → superstructure
  → spires → booms → drive), `drawFront`, `drawFumes`.
- **storm.js** — constants `COMPS`/`HOLD`/`STORM` (top), `layout`, `ROSTER`
  (home layout), `PAINTERS` (one per object id), cycle
  `startStorm`/`gust`/`snapHome`, `stepFlicker`, ghost lines
  `LINES`/`stepLines`, then `step` (cycle → forces → ship circles → pairs
  → hot), `draw` (both compositions, then the ghost lines), `report`.
- **CSS** — each file has `/* --- */` section comments; grep the section
  name rather than reading the file.

### Where things live

| Concept | Go to |
|---|---|
| Rex kingdoms | `world.js` `drawRexPlaces` + `REX_PLACES`; art in `rexart-surface.js` / `rexart-deep.js` |
| Mainland factions | `world.js` `drawLandPlace`; art in `landart.js` |
| Bone Spire (style reference) | `rexart-surface.js` `paintBoneSpire` / `liveBoneSpire`; placed in `REX_PLACES`; node in `depths.js` |
| Titans cave (style reference) | `rexart-deep.js` `paintTitans` / `liveTitans` |
| `litShade` | One copy, `paint.js` |
| Camera / pan / input | `bridge.js` `camX`, `wx()`, `clientToCourse`, listeners block |
| Ship motion and feel | `voidship.js` `BASE` + `step` + `setThrusting`; bridge glue `retargetFromPointer` / `beginBurn` / `endBurn` / `atRest` (calls `Voidship.settled`) |
| Ship art and fumes | `voidship-art.js`; particle schema is defined where `voidship.js` spawns them (`fumeAcc +=`) |
| Sector Zero debris, storm cycle, CRT flicker, ghost terminal lines | `storm.js`; anchored to the planet by `bridge.js` `stormEnv`; spawn camera `marks.js` `GD_SPAWN` |
| VoidScape bench, run console, floor-plan generator | `forge.js`; anchored to the planet by `bridge.js` `forgeEnv`, hit-tested in the pointerdown listener |
| Landmarks / beacons | `marks.js` `MARKS`/`PLANETS`; gated extras `depths.js` |
| Main rAF loop | `pacer.js` (`frame`), created in `bridge.js` as `pacer`; other loops in `intro.js`, `surge.js`, `xp.js` |
| Storage keys | `util.js` `KEYS` (never type a key literal) |
| Readout text | `bridge-voice.js` `ZONES` |
| HUD tiles | `instruments-tiles.js` |
| Entry gate | decision `entry.js`, UI `intro.js`, CSS `gate.css` + `bridge.css` boot terminal, bridge defers in `readyBridge` |
| Entry gate CSS | `gate.css` |
| Cutscene | `genesis-state.js` (BEATS, state), painters in `genesis-void/rex/saga.js`, transport in `genesis.js` |
| Reduced motion | `Util.reduced()` (one query, `util.js`); read in `bridge.js` top (loop keeps running, travel softens), `genesis-state.js`, `intro.js`, `lazy-video.js`; the global collapse of transitions and animations is in `style.css`, with small per-file blocks in the other sheets |
| Dev URL params | `?reset=1` in `xp.js`; `?genesis=1` and `?gbeat=<name>` in `genesis-state.js` (`G.FORCE`, `G.JUMP`) |

### Storage keys

All keys are in `util.js` `Util.KEYS`: PROFILE `arcanis.profile.v1` (xp.js),
HINTS `arcanis.hints.v2` (bridge.js), VIEW `arcanis.view.v1` session
(bridge/entry), SECTOR `arcanis.sector.v1` (bridge/entry), INST_SCALE,
GEAR_SEEN (bridge.js), SW_CLEANUP (index.html head). `?reset=1` wipes every
key with the PREFIX.

## Delegation

- Delegate all code changes to the `implementer` subagent, one task per call.
- The spec must be complete enough that the implementer never has to choose a
  name, a file location or a design.
- Run implementer calls in parallel only when their tasks touch completely
  separate files.

## Spec format

Every delegation to the implementer must contain:

1. **Target files:** the exact path of every file to create or edit, and the
   function names to grep for so it reads only that region.
2. **Symbols:** exact names and full signatures for every function, method,
   class, variable or export to add or change.
3. **Logic steps:** the implementation as an ordered, numbered list of steps.
4. **Edge cases:** each edge case and exactly how it should be handled.
5. **Do not touch:** files, symbols or behaviour that must stay unchanged.
6. **Verification:** the exact command to run, or "none" if the change isn't
   covered by a test. Never `python serve.py` — it is a blocking server and
   will hang the implementer. Browser behaviour: `py -3 nav-flows.test.py
   <flows>`. It runs its own server and exits. Only the back/forward cache
   still needs a manual check.

## Art style

Every drawn place (Rex kingdoms, Mainland factions, anything new) uses one
style. Reference: the Bone Spire in `rexart-surface.js` and the Titans cave
in `rexart-deep.js`.

- Stylised 2D silhouettes, flat palette fills.
- Light from the left. Shadows are hard-edged flat shapes (a `litShade`
  split, roughly the right 70% of each volume), never gradients.
- No rim lines, outlines or brick lines on buildings.
- Soft glow only for things that emit light (lanterns, portals, flames).
- Places are proper buildings, not symbols or sigils.
- The primitives are in `paint.js`; do not add a new `litShade` anywhere.

## Commands

- **Build:** none. No framework, no bundler, no npm.
- **Run:** `python serve.py`, then open `http://127.0.0.1:8765/`
- **Test:** `py -3 nav-flows.test.py` (Playwright; pass flow names to run a
  subset, `--list` to see them). Flows: `first`, `gate-exits`, `back`,
  `reload`, `worklink`, `deeplink`, `returning`, `wordmark`, `reset`,
  `genesis`, `twotabs`, `header`, `shell`, `phone`, `depths`, `rex`,
  `watcher`, `bridge`, `landdepths`, `links`.
- **Screenshots:** `py -3 snap.py capture <name>` writes a run under
  `snapshots/`, `py -3 snap.py compare <a> <b>` diffs two runs, `py -3
  snap.py list` names the scenes.
- **Cache-bust:** `py -3 bump.py` rewrites every `?v=` in the HTML pages.
- **Git:** commit straight to `main`, no branches. A `.gitignore` covers
  `__pycache__/`, `*.pyc`, `snapshots/` and `Temporary VoidScape Media/`.
