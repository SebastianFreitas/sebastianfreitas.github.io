# Map

The reference half of CLAUDE.md, moved here on 2026-09-25 so that it is
grepped on demand instead of loaded into every session and every Explore
call. Rules live in CLAUDE.md; this file is facts: purposes, exports,
load order, storage keys, where things live, the roadmap. Keep it true: a
new file, a moved function or a new export gets its row fixed in the same
commit. Grep for a file name, a function or a concept; never read the whole
file. The map holds purpose and exports, not line counts (file-guard reports
sizes at read time).

## Owner's words

Owner's words → code names. Add a line when the owner uses a word the code does not.

- the ship's rolls/rotations: pitch = nose tilts in the screen plane (`ship.pitch`; capped +-90 deg so the belly never faces up; every press turns the ship to the aim first, the motors only engage once the nose is within ~10deg)
- the ship's turn = yaw swing through head-on to face the other way (`yaw`/`yawTarget`, js/ship/voidship.js); barrel roll: dropped 2026-11-05
- the lost city (in hell), Valkhar: Rex place `bnote-rex-valkhar` (world.js REX_PLACES, art js/world/art/valkhar.js, note in depths/lore.js)
- the navigation bar (beacon positions): the span line at the top of the HUD (js/hud/hud-c25.js)
- the sys bank, systems monitor: the HUD's right wing (js/hud/hud-c25.js); sys model js/hud/tiles-sys.js `tickSys`, alarm clock js/hud/instruments.js
- the cockpit, the HUD: js/hud/ (tiles and framework), css/bridge.css; HUD tiles row in "Where things live"
- the bridge, the hero: js/bridge/ (the index.html canvas world, ship, marks, notes), css/bridge.css
- beacon (the code says lamp): js/bridge/lamp.js (adblockers drop "beacon"); beacon claims in bridge-marks.js; roster js/bridge/marks.js
- the gate (shows every visit, boot log first visit only): js/site/entry.js (load kind), js/site/intro.js (UI), css/gate.css
- the level chip, rank card, level burst: js/site/xp.js (chip, ranks), js/site/surge.js (burst, card), css/beacon.css
- the cutscene journal (gear/folder button and its panel): js/bridge/bridge-panel.js
- the readout, the log, the voice: js/bridge/bridge-log.js (typed queue), bridge-voice.js (what it says), bridge-readout.js (HUD glue)
- the places that bend the instruments: js/bridge/bridge-sites.js (SITES, GD_SITES), bridge-env.js
- depth nodes, lore beacons: js/depths/ (depths.js core, one file per cluster), js/depths/lore.js (Rex, Watcher, Void, Mainland notes)
- Game Dev sector (cut from the site): archive/gamedev/ (planet.js, gdworld/, zones.js, storm.js); see archive/gamedev/README.md
- Eroded banners (rejected worn box ends): archive/eroded-banners/ (tools/worn.py, its caps, CSS diff, README.md); open only when the owner names it
- Red side lines (owner's tuned red line pieces on rank card, glimpse card, gate, Work rows): archive/red-side-lines/ (js/redlines.js, css/redlines.css, README.md); never delete; open only when the owner names it
- the bench, the run console (VoidScape): js/forge/forge.js, forge-guns.js, forge-missions.js
- Work row preview: `a.obj` rows in section#work on index.html show a clip and a game-page button on hover (js/site/work-preview.js, css/style.css)
- Sector Zero storm (archived): archive/gamedev/js/gamedev/storm.js
- the case pages, a page's toy: standalone pages `projects/<key>.html`; toy js/pages/<page>.js registers on js/pages/play.js, css/play.css- the cutscene, the Genesis: js/genesis/ (BEATS in genesis-state.js, overlay css in css/bridge.css)
- the span, the live span: js/genesis/genesis-void.js (monumental span, far realms)
- the sea, the river (the banded strip at the genesis frame bottom): js/genesis/genesis-elements.js (seaK, drawSea; drawn every frame from genesis.js)
- the ceiling mass (drifting clouds along the top, grow with the sea): js/genesis/genesis-ceiling.js (GenCeiling.draw: the floor sea mirrored overhead via GenElem.paintSea dir -1 and the floor's own water line (seaLine); objects sit in it as pieces, arrival = GenElem.seaLevel; drift + wobble)
- genesis-ceiling.js resolveHangers (end of prep): hangers that cross a rock are shortened to the nearest hit or dropped (never across a rock's own eye), roots spaced in layout order, tips capped at 0.28 H
- genesis-ceiling.js resolveHangers (cont.): hangers hidden under another cloud body re-rooted onto it (farthest free anchor) or dropped; bare big front clouds keep their own hanger; tiny-cloud tails mirrored or cut when they cross a rock; the left rock slides to close a band sliver.
- genesis-ceiling.js drawSprites paints rocks, hangers and eyes before the cloud bodies (extras sit behind the clouds)
- the womb, the flesh ball, Primordisentia: js/genesis/genesis-flesh.js (fleshGeom, drawFlesh, drawSeal)
- the old ones: js/genesis/genesis-oldones.js (24 beings), painters in genesis-oldkin.js
- the east-goers (dressed old ones): js/genesis/genesis-oldkin.js (Bare/Dressed painters), clothes in genesis-attire.js
- the carers: CARERS (eye, chime, mound) in js/genesis/genesis-oldones.js
- the red dot (Obrokxus inside the womb): js/genesis/genesis-dot.js; his forms in genesis-obrok.js, genesis-titans.js
- the Hound: drawHound in js/genesis/genesis-titans.js; its ritual in genesis-ritual.js
- the war, angels and devils: js/genesis/genesis-armies.js (sim), genesis-hosts.js, genesis-seraphin.js (angels), genesis-malgrur.js (devils)
- the sky shadows, tier 3: js/genesis/genesis-tier3.js, break giants genesis-giants.js; palette genesis-eldpal.js
- the Rex kingdoms: js/world/rex.js; art in js/world/art/ (firstlight, crimson, bonespire, titans, valkhar, law)
- the Mainland factions: js/world/city.js drawLandPlace; art in js/world/art/ (shattered, libertech, dawn, accord, gore)
- the tear: js/world/admin-tear.js (the Administration's cut in reality)
- the Watcher's alien: js/world/serus.js (Serus), inside js/world/watcher.js
- the ship, the wedge hull, the shard: js/ship/voidship*.js (art, prow = the shard)
- v bump, cache bust: tools/bump.py
- the top bar, topbar: css/style.css (topbar rules); pinned on scroll; its centre XP (level square, rank ring, name plate, pips, ref) is hidden on `.topbar.is-solid` and `.page-case .topbar`, so it shows only over the bridge
- "quiet auditor" (or any rank title): the rank name plate in the top bar, the span `js/site/xp.js` builds (`data-wear="tab"`); the words change with rank.

## Shared state conventions

Every JS file is an IIFE that publishes or extends one global on `window`.
Two folders share one state object across files, the way the cutscene
shares `Gen`:

- **`js/bridge/`**: `bridge.js` declares `const B = window.Bridge = {}`. Every
  other bridge file starts `const B = window.Bridge; if (!B) return;`,
  destructures constants and containers once (`CAM`, `MARKS`, `host`,
  `scale`, `wx`, `markScreen`, …) and reads mutable state at call time
  (`B.camX`, `B.vel`, `B.sceneMode`, `B.ship`, `B.W`, `B.H`, `B.t`,
  `B.activeMark`, `B.xswitch`, `B.log`, `B.voice`, `B.pacer`, …). Functions
  used across files are published as `B.fn` and called as `B.fn(...)`. To
  find every reader and writer of a field, grep `B.name` across the folder.
- **`js/world/`**: `world.js` publishes `World` with `F` (per-frame:
  `ctx, W, H, camX, t, vel, chaosNow, futureNow, dtNow, V`) and `P` (painter
  registry). Each painter file destructures what it needs from `World`,
  starts every painter with `const { ctx, W, H, t } = F;` (only the fields
  it reads), and ends with `P.drawX = drawX`. `draw` in the core sets `F`
  and calls `P.*` in a fixed order.
- **`js/gdworld/`**: `gdworld.js` publishes `GdWorld` with the frame `F`
  (`ctx, W, H, camX, t, dt, vel, sc, k, gy, red, w[4], wsum`), the registry
  `P`, `GAMES`, `dens`, `sx`, `scatter`, `each` and `draw`. Each painter
  file starts `const G = window.GdWorld; if (!G) return;`, builds its
  element lists at load with `scatter`, reads `F` only inside its paint
  functions (it is empty until the first draw) and registers `G.P.<id> =
  { base, wash, layers: [{ par, paint }], grade }`. `World.draw` hands the
  whole gamedev frame to `GdWorld.draw`; only the ship is shared with the
  Void.

## File map

### js/lib

| File | Purpose | Publishes |
|---|---|---|
| `util.js` | Shared maths (`clamp mix smooth approach easeOut wrapPi mulberry hash1 vnoise ridge fmt`), `reduced()`/`coarse()` media queries, storage `KEYS` + `read`/`write`/`remove` | `window.Util`. Loaded first on every page |
| `paint.js` | Flat-art primitives (`poly line rect circle lin rad litShade offsetShade merlons fillRidge`) | `window.Paint` |
| `pacer.js` | rAF scheduler: paints on refresh boundaries, parks to a 10 fps timer at rest, wakes on input; opt `scrollWake`: a page scroll wakes it and it never parks within 2 s of one | `window.Pacer {create}` |

### js/site

| File | Purpose | Publishes / uses |
|---|---|---|
| `xp.js` | Site-wide progression | `window.XP` |
| `entry.js` | Head-time load kind (the gate shows for every kind; only `first` gets the boot log): `restore` / `deeplink` / `returning` / `first` | `window.SiteEntry {kind, sector, view}` |
| `intro.js` | Entry gate UI, every visit: boot log (first visit only), loading bar, the one button (`#gate-world`), exits. Must load last: dispatches `site:preload` synchronously. `warmUp` also runs `Genesis.warm` | uses `SiteEntry`, `XP` |
| `surge.js` | Level burst at the chip on `xp:surge` (no label while `html.bar-peek`); the rank card on `xp:rankup` (the only thing that sends `xp:freeze`, dismissed by click/key or after 3.8 s); `glimpse` card after the Void segment | `window.Surge {play, rankUp, glimpse}` |
| `embed.js` | Click-to-load itch.io iframes | `window.Embed {reset}` |
| `stage.js` | Work + Experience scale: sets `--stage-s` = min(window / 1600, 1.2) on `<html>` from 1200px up (css `.stage` zooms by it, laid out 1600px wide), 1 below; rects read under it are screen px, divide by `Stage.s()` | `window.Stage {s}` |
| `banner.js` | Seeded cream text banner: plate = main's `.xp-name` recipe, tab = nav tab; `apply` masks `[data-banner]` labels (bullet below) | `window.Banner {schema, params, ready, draw, dataURL, apply}` |
| `shapes.js` | Seeded raster wear masks: every `[data-wear]` box gets `--wear` (PNG mask) and `--shape: none`, redrawn on resize; `wearPlate`/`quad` clip the Work rows and Experience plate; kinds mode wears 1-2 corners | `window.Shapes {rng, apply, wear, edgeProfile, wearPresets, wearKinds}` |
| `art/wear/` | The tab hover paper mask: `tab-tl.png` (184x140, top-left corner) and `tab-br.png` (160x140, bottom-right), used by `.topbar nav a::before` in `css/style.css` (18px / 16px corners, solid middle strip) | none |
| `redlines.js` | Seeded red line pieces on plates (gate, Work rows, cards, notes, 404, case bodies): one `svg.redlines` per `[data-redlines]` plate, edge read from its `::before` clip-path, lazy and size-debounced redraw | `RedLines.draw(el, opts)` |
| `work-preview.js` | `window.WorkPreview`: hover or focus on a Work row marks it (`.is-peek`), plays its `video.obj-clip`, shows `.obj-go`; see bullet below | none |
| `devpanel.js` | TEMPORARY dev panel (FPS button, slow-frame log, debug switches, Copy report). Inert unless `?dev`, localhost or 127.0.0.1. Delete file and its tag in index.html to remove | none |
| `lazy-video.js` | Swaps in `media/**/sd/` encodes on slow connections | none |
- `banner.js`: plate = tab PNGs as 37x28/32x28 end caps + `.xp-name` clip-path, no `Shapes.wear`; tab = art/wear tab PNGs + nav polygon.
- `banner.js` apply: `Banner.apply(root)` paints `--banner: url(png)` (alpha mask, no text) on `[data-banner="plate|tab"]`, opt. `data-banner-on="before"` and `data-banner-seed`; ResizeObserver repaint; self-boots.
- `shapes.js`: kinds mode (opt-in `opts.kinds`) sets `el._wearSites` and `el._wearKinds`; no preset uses it yet.
- `shapes.js`: nav links carry no `data-wear`; the tab hover paper is masked by the two old grainy PNG corners in `art/wear/` (css `.topbar nav a::before`).
- `shapes.js` wear: `Shapes.wear(el, preset, seed)` paints a seeded PNG mask into `--wear` and sets `--shape: none`; 10 presets in `wearPresets` (depth as % of the short side, bites per edge, corner chips).
- `shapes.js` wear seed: from `data-seed` or preset+index, so a box keeps its wear across reloads; `Shapes.apply(root)` wears boxes added later (gate, surge veils, bridge notes). CSS keeps a literal polygon as the no-JS fallback: `clip-path: var(--shape, <polygon>)`, `mask-image: var(--wear, none)`.

- `work-preview.js`: hover or focus marks the row (`.is-peek`, no turn), plays its `video.obj-clip` where the picture is (`.is-live`) and shows `.obj-go` in the spot kept for it under the facts; leave stops it; keeps `.work.is-scrolling`; lands an old `#<key>` link on its row. No preview on touch
- `xp.js`: level chip (badge + 10 pips toward the next rank), `RANKS` (shape + name, one per 10 levels, `rankOf`), bar growth on a claim (no flying box or tag, never freezes the world); only the bridge awards XP, cross-tab sync, `?reset=1`
- `xp.js` growth: `award` adds at once, `ceremony` walks the bar up one level per 600 ms (`B.barPeek` first, fill starts 400 ms later), extra awards just raise the target; `busy` while it walks; `xp:ceremony-done` at the end; `onRankUp` is the hook for ship upgrades.
- `xp.js` publishes: `window.XP {award, has, total, rankOf, rankStep, ranks, mount, reset, …}`; fires `xp:surge` once per level filled and `xp:rankup` once per rank crossed

### js/hud

| File | Purpose | Publishes / uses |
|---|---|---|
| `instruments.js` | The HUD's clock, alarms and sys-model host (tiles gone) | `window.Instruments {draw, alarmLevel, registerTiles, alert, impact, setRepair, now}` |
| `tiles-sys.js` | The ship-systems model (no painters) | registers `{tickSys, impact, setRepair, sys, repairState}` |
| `hud-models.js` | Wing readings as shared functions (old tiles and hud-c25 call the same); exports listed below | `window.HudModels` |
| `hud-c25.js` | C25 HUD line art on one canvas, values from one data object | `window.HudC25` `{mount, draw, resize, report, nearestUnread}` |

- `instruments.js`: `draw` ticks `t` (`now`), the sys model and `tickAlarms` (env rules) → `arbitrate` (one warning at a time); `alert` crit sets `HudModels.critUntil`; `registerTiles` holds the sys model's factory
- `hud-models.js` left: `contacts, blipAngle, bearingOf, strength, signal, resF, RES_LO, ce, sc, driftOf, leftLamps, live, sys`.
- `hud-models.js` right: `busLoads, cabTAt, cells, cabTrace, stress, rightLamps, JOINT_U, RING_U, critUntil` (crit burst set by `Instruments.alert`).
- `hud-c25.js`: span line (live: marks, `nearestUnread()`, you pin), left/right wings, log (`sampleData()` for now); static linework cached per resize; mounted by bridge-panel.js, painted from `drawInstruments`
  - wing size steps: one `SIZE - +` stepper (no % shown) above the left wing's top-left (screen px, `marks`/`paintMarks`/`markAt`) steps both wings (1, 1.25, 1.5, 1.75; `Util.KEYS.HUD_WING`), scaled from their corners; span line does not scale.
  - wing fit: `wingFit` draws the largest stored-or-lower step with `XL*q*v + 12 <= W/2` (1.25 at 2000x1009); above step 1 the log rises above the wings' floor line; `HudC25.wing()` feeds `B.fitHud`.
- `tiles-sys.js`: `tickSys` couples `o2`/`co2`/`kpa`/`dose`/`mag`/`hullT`/`hx` to `env` (`wear jitter rad sway heat frozen`), keeps `sys.hullInt`, `sys.wear`, `sys.omega` (turn rate) and `sys.lastImpact`, which the C25 right wing reads

### js/bridge

Load order is the table order; nine bridge files share `B`. `bridge-sites.js`
does not — it is pure data, no dependency on `B`.

| File | Purpose | Publishes on `B` / `window` |
|---|---|---|
| `bridge.js` | Core | `window.Bridge` |
| `bridge-notes.js` | Notes: `hostBox`, `showNote`, `measureNote`, `placeNote`, `selectMark`, `fileMark`, `clearMark`; hints `HINT_STEPS`/`hintDone` | `B.hostBox showNote measureNote placeNote selectMark clearMark hintDone noteEls` |
| `bridge-input.js` | Pointer/burn input | `B.markAt clientToCourse courseForMark stopSteering beginBurn endBurn retargetFromPointer coversViewport` |
| `bridge-motifs.js` | The four motif drawers lifted from `archive/gamedev` | `window.BridgeMotifs {draw}` |
| `bridge-marks.js` | `drawCue`/`drawCueLine`/`drawMarks`, `marksSettled`; debug `beaconReport` | `B.drawMarks marksSettled` |
| `bridge-poi.js` | Beacon detect-then-scan beat: brackets + POINT OF INTEREST label at range, 1 s SCANNING plate (name, percent, fill) above the ship on contact, then `fileMark` awards; cancels if the ship leaves; colour from `--hud-lamp-rgb` | `B.poiScan poiStep drawPoi` |
| `bridge-panel.js` | Cutscene journal panel, Data Archive spine under the folder (`#arch`, `buildArchive`), Instruments scale, view persistence | `B.applyPendingView saveView`; `window.__bridgeRefit` |
| `bridge-depths.js` | `spawnDepth`, `revealDepths` (runs once at load, again on `pageshow`/`storage`); debug `depthsReport`, `depthsReveal`, `depthAlpha` (read by `js/world`) | `B.spawnDepth revealDepths`; `window.depthAlpha` |
| `bridge-env.js` | The environment model | `B.env stepEnv`; `window.envReport` |
| `bridge-readout.js` | `B.voice = BridgeVoice.create` (voice state carries `env`) | `B.takeDamage runRepair checkRegion reportFiled updateHUD drawInstruments` |
| `bridge-loop.js` | Movement `step`, `atRest`, `B.pacer = Pacer.create`, `render`, `paintOnce`, tail `syncPhone()` + topbar observer; debug `pacingReport shipReport` | `B.step atRest render paintOnce B.hold(on) B.held` (hold rests the pacer) |
| `bridge-sites.js` | The places that bend the instruments | `window.BridgeSites {SITES, GD_SITES, lines}` |
| `bridge-voice.js` | What the readout says per region (`ZONES`, merges in `BridgeSites.lines()` as `site:<id>`), warn/err/crit odds | `window.BridgeVoice {create(S)}` |
| `bridge-log.js` | The typed-out readout queue | `window.BridgeLog {create(el)}` → `{push, run, setMax, idle, lines}`; types with a null `el` too |
| `marks.js` | Landmark roster: `MARKS` (Void beacons); `PLANETS` is an empty shim | `window.Marks {MARKS, PLANETS: [], visible, camUnder}`; uses `World` |
| `lamp.js` | Canvas beacon draw + `HIT` radius (named lamp because adblockers drop "beacon") | `window.Beacon {draw, HIT}` |

- `bridge-notes.js`: `BEACON_SEGMENT` maps four beacons (void→birth, root, rex, rex-valkhar→valkhar) to Genesis scenes; its first claim plays it (`Genesis.playScene`) and after `xp:ceremony-done` (xp.js, 4.5 s fallback) plus a 500 ms beat.
- `bridge-notes.js`: the note opens on `site:genesis-done`; once seen it carries a "Watch again" link.
- `bridge-notes.js`: beacon XP keys stay `genesis-seg-<id>` so saved progress survives the scene split.
- `bridge-notes.js`: `selectMark` hints, stops the ship and starts the scan (`B.poiScan`); `fileMark` awards, logs, reveals and shows the note. `showNote` adds a `.nhead` strip (beacon name + READING COMPLETE) and no longer draws the site's red line pieces.
- `genesis.js`: segment plays fade a black `.genesis-veil` (css/bridge.css) in and out via `veilTo`; full plays cut.

- `bridge.js`: `host`/`cv`/`ctx`, map consts (`SLOT LAND BOUNDS CAM VOID_MIN VOID_MAX HIT`), canvas `resize`, phone/portrait queries + `syncPhone`, gate deferral `readyBridge`/`startLoop`/`repaintUnderGate` + `site:preload`/`site:enter`, state,
- `bridge.js`: scene-mode consts (`ZERO_MARK VS_MARK HL_MARK CONC_MARK XSTAGE`), `B.ship = Voidship.create`, `xp:freeze`, cursor, sheet, projection `viewUnitsNow`/`scale`/`wx`/`onScreen`/`flyK`/`markScreen`, `begin`
- `bridge.js` publishes: `window.Bridge`; `B.resize syncPhone startLoop activeMarks viewUnitsNow scale wx onScreen flyK markScreen begin`
- `bridge-input.js`: `coversViewport` sets `B.visible` only while `#bridge-hero` covers the viewport (passive scroll + resize), so the loop pauses the moment anything else shows
- `bridge-input.js`: `markAt`, `clientToCourse`, `courseForMark`, `beginBurn`, `endBurn`, `retargetFromPointer`, listeners, `coversViewport`/`syncCover`, `onPortrait`
- `bridge-panel.js`: `B.log = BridgeLog.create(null)`, mounts `HudC25` and `B.fitHud` (no flag; phones get no HUD, D25)
- `bridge-panel.js`: cutscene journal (Full intro + seen scenes, rebuilt on open and `site:genesis-done`): `applyPendingView`, `saveView`, journal/folder button, `site:genesis-start`/`-done`, `drawIris`
- `bridge-panel.js` publishes: `B.applyPendingView saveView fitHud`
- `bridge-env.js`: `B.env = {chaos, future, nomic, wear, jitter, sway, glare, rad, heat, contained, link, frozen, echo, g, rho, twin, gAnom, tag, site, siteName, w, n1, n2, n3, t}`;
- `bridge-env.js`: `B.stepEnv(dt)` blends the world curves (`chaosAt`/`futureAt`) with every site whose gate node is revealed (`window.depthAlpha`) by distance weight, then eases;
- `bridge-env.js`: a site's `osc` may be one object or an array, each `{field, period, lo, hi, shape: "sine" | "square" | "pulse", duty?, phase?}`; debug `window.envReport`
- `bridge-readout.js`: hull `takeDamage`/`runRepair`, `idleLine`, `checkRegion`, census `reportFiled`, `updateHUD`, `drawInstruments` (calls `B.stepEnv(dt)`, passes `env` to `Instruments.draw`); `VOICE_OF` maps the marks to voices; in gamedev the dominant site's id is the voice
- `bridge-sites.js`: `SITES` (void setting, 18 entries, order matters — later entries override earlier ones) and `GD_SITES` (one per game, `r` 33000 so neighbours meet halfway, `tags` rotating and an `osc` list per game),
- `bridge-sites.js`: each `{id, name, gate, x, r \| ramp, f:{fields}, tag, osc?, tags?}`; `lines(S, h)` returns one readout zone per site (same shape as `bridge-voice.js` `ZONES`)
- `bridge-voice.js`: `zoneAt` returns the dominant site (`env.w >= 0.5`) before the x-range checks; extra optics/coherent lines in the void, watcher, root and unnamed zones

### js/depths

| File | Purpose |
|---|---|
| `depths.js` | Core: `CLUSTERS` registry, `add`, `waveOf`, `LAYOUTS` (`rows arc chain branch`), `nodes()` | `window.Depths {nodes, clusters, add}` |
| `lore.js` | The four lore-beacon clusters in order: `bnote-rex` (10), `bnote-watcher` (2), `bnote-void` (3, `bnote-bridge-*`), `bnote-land` (5); mostly pinned with `at:` |

### js/ship

| File | Purpose | Publishes |
|---|---|---|
| `voidship.js` | `BASE` tunables | `window.Voidship` |
| `voidship-art.js` | Hull, wings, engine, fumes and wake painters | `window.VoidshipArt` |
| `voidship-prow.js` | The shard | extends `window.VoidshipArt {drawProwBack, drawProw, drawProwTurn, emberOf, PROW}` |

- `voidship.js`: `create`, `setThrusting` (release rule), `step` (a held pointer sets `ship.demand` by its distance, d0..d1 → 0..100% of top speed, and `ship.engine`, the live output; wanted velocities → yaw → `ease` → arrival → fuel → pitch → fumes), `settled`, `stats`, `draw`
- `voidship.js` publishes: `window.Voidship {BASE, create, resize, setPower, setCourse, setThrusting, setAim, clearCourse, step, draw, screenPos, touching, touchingMark, stats, canBurn, addFuel, settled}`
- `voidship-art.js`: `block` + polygon helpers `tracePts fillPoly vol seg box`, palette (`LIT MID SHADE DEEP EDGE ORANGE ORANGE_D LAMP COLD RED WHITE DRIVE_*`), geometry tables (`W_FAR ENGINE HULL BELLY OPANEL W_NEAR OWING POD BRIDGE T1 T2`, `FV_*` for the turn's cross-section ends),
- `voidship-art.js`: `drawHull(g, ship, L, t, turn)` (side view at rest, built part by part in depth mid-turn), `drawTether(g, ship, env)` (the held-pointer thrust gauge: track d0..d1, fill = live speed, tick = demand), `drawFumes`, `drawWake`, `EMIT SUST JETS TRAIL_SEATS`;
- `voidship-art.js`: local frame +x nose, +y down, units of hull length L; the shard is delegated to `voidship-prow.js` (`drawProwBack` first, `drawProw` after the turrets at rest, `drawProwTurn` in its place mid-turn: the blade as one projected solid)
- `voidship-prow.js`: a broken-off chunk of the giant energy-giving metal Libertech built the ship around, doubling as ram and power core. Blade shapes: faces `UPPER LOWER`, tip facet `CLIP`, grind line `GRIND`,
- `voidship-prow.js`: ember crack `EMBER_PTS` (alpha = `emberOf(ship, t)`: pulse + strain, fixed pulse under `Util.reduced()`), the hull's jaws `JAW_T JAW_B` painted over the slab; `drawProwBack` is the red glow behind it; head-on `FV_*`. Palette `RUST_* EMBER`

### js/forge

The VoidScape bench/console/floor plan; only `projects/voidscape.html` loads it (forge-guns, forge-missions, forge, voidscape-bench, voidscape-mapgen); `index.html` does not.

| File | Purpose | Publishes |
|---|---|---|
| `forge-guns.js` | The one `rnd`/`rint`/`pick`, `MAX_MODS`/`MAX_PATH_MODS`/`MAX_EMPOWER`, weapon tables, `rollMod`, `makeGun`, `randomGun`, `stats` | `window.ForgeGuns` |
| `forge-missions.js` | `RUN_MODS`, `rollRunMod`, `regood`, `makeMission`, floor plan `genPlan` | `window.ForgeMissions`; uses `ForgeGuns` |
| `forge.js` | Bench and console state, `tile`, `drawBench`, `cellColor`/`drawPlanArea`, `drawConsole`, `step`, `draw`, `hit`, `over`, `lively`, `report`, `unlock`; `bench` and `map` (the inline mission console) seams | `window.Forge`; driven by `voidscape-bench.js` and `voidscape-mapgen.js` |

### Archived (archive/gamedev/, loaded by no page)

The Game Dev sector, cut from the site; see `archive/gamedev/README.md`. Paths below are under `archive/gamedev/`. The five motif drawers from here now live in `js/bridge/bridge-motifs.js`.

| File | Purpose | Publishes |
|---|---|---|
| `js/gamedev/storm.js` | Sector Zero storm: `COMPS`/`HOLD`/`STORM`, `layout`, `ROSTER`, `PAINTERS`, cycle `startStorm`/`gust`/`snapHome`, `stepFlicker`, ghost `LINES`/`stepLines`, `step`, `draw`, `report` | `window.Storm {step, draw, lively, report}`; fed by `bridge-marks.js` `stormEnv` |
| `js/gamedev/zones.js` | Backdrop art around Conclusus / HeavyLight / VoidScape | `window.Zones {step, draw, report}`; fed by `bridge-marks.js` `zonesEnv` |
| `js/bridge/planet.js` | Placeholder worlds for the Game Dev sector, `THEMES` per game | `window.Planet {draw}` |
| `js/depths/{zero,voidscape,heavylight,conclusus}.js` | One planet cluster each | `Depths.add` |
| `index-beacon-notes.html` | The four planet note asides cut from index.html (fragment) | none |

`js/gdworld/` is described next.

- `zones.js`: sprite pipeline `CPAL`/`CSPR` (local) and `HPAL`/`HSPR` (read from `HeavyLightSprites`, js/shared) → `spriteCanvas` → `blitSprite`, `HL_GROUPS`, `LANTERN`, `BEAM`, `dropCrate`/`stepCrates`;
- `zones.js`: HeavyLight drawn at `hlZoom()` (= backdrop `px()`/2) through one transform, layout compact enough to fit under the ceiling at 900 H; Conclusus likewise at `ccZoom()` (= `GdWorld.P.conclusus.px()`/2), `CPLATS` compacted, `CC_LIFT` lift threshold

#### js/gdworld

The Game Dev sector's world: four backgrounds, one per game, that meld by
distance. Each game's field is centred on its planet (`Marks.PLANETS[i].x`),
full within 17 100 units, half at about 27 500 and empty at `R` = 38 000, so
the screen empties between planets before the next game's outriders appear.
Sizes are "px at a 1440-wide hero" × `F.k`; layers are painted far → near
across all four games at once; `wash`/`grade` are screen-space and weighted
by the game's weight at the camera. Nothing here reads `Bridge`.

| File | Purpose | Publishes |
|---|---|---|
| `gdworld.js` | Core | `window.GdWorld` |
| `gd-zero.js` | Sector Zero, "the room in the lantern's reach" | `GdWorld.P.zero` |
| `gd-voidscape.js` | VoidScape, "the run, only up" | `GdWorld.P.voidscape` |
| `gd-heavylight.js` | HeavyLight, "the game's own tiles" | `GdWorld.P.heavylight` |
| `gd-conclusus.js` | Conclusus, "the game's own slabs" | `GdWorld.P.conclusus` |

- `gdworld.js`: `GAMES`, `R`, `GROUND` (0.64, the old deck line), `dens(i, x)`, the frame `F`, `sx(x, par)`, seeded `scatter(seed, i, n, par, fy0, fy1)`, `each(list, pad, fn)`, the sector dust,
- `gdworld.js`: `draw` (sky blend of the games' `base` colours → dust → washes → every layer by `par` → grades), `clear`/`clearBox` (0..1 fade round every visible mark, from `F.marks`)
- `gd-zero.js`: the game's storeroom (drop-ceiling grid fading to black, open steel racks with a few boxes and binders, one black doorway every six slots,
- `gd-zero.js`: plank floor with scratches) baked by `buildStrip` into one repeating `repeat-x` pattern per pixel scale and height (`stripPattern`), at par 0.7;
- `gd-zero.js`: shown at `AMB` 0.10 everywhere and inside three drifting lantern `POOLS` as three stepped `RINGS` each, faded by `clearBox`; the game's two flickers (dip, rare hard off) from `F.t`, none with reduced motion; `px()` = min(3, round(3k)); no wash, no grade
- `gd-voidscape.js`: dark, quiet corridor `module`s tilted and chained by stairs, dim mouths and strip lights, pipes with valve wheels, a few small portals high and low, dice/canisters/medkits on the floor band; all faded by `clearBox` round the marks; faint red clouds and ground heat;
- `gd-voidscape.js`: grade = red vignette
- `gd-heavylight.js`: one tile grid at par 0.7 over the full height: open band 0.18–0.79 H, ceiling mass from the top edge and floor mass to the bottom edge (`base` [0,0,0]); pixel scale `px()` = min(3, max(2, round(3k))), published on `GdWorld.P.heavylight.px` for zones.js;
- `gd-heavylight.js`: interior cells batched through `solidPattern(p)`; floor/ceiling stepped in whole tiles (`ridge`, × `dens`, 1-tile minimum within 520k px of the planet and round every mark via `clearBox`), sparse floating platforms;
- `gd-heavylight.js`: `tileCanvas(m, v)` autotiles a light crenellated rim on every exposed side plus inner-corner nubs (colours from the Unity sewer tiles); back wall via `backPattern(p)`; no wash, no grade
- `gd-conclusus.js`: the game's 32 px platforms (`FL` floor1-4 × `GR` Grass1-5 letter strings → `slabCanvas(f, g)`, cached) floating on the flat #2f2427 void (`base`) in staircases, pairs and runs of ≤3 (`chunk(kk, NR)`, 7-column chunks) on a 32 px column / 8 px row grid,
- `gd-conclusus.js`: band 0.18–0.79 H, par 0.7; empty round the planet on screens ≥ 900 wide (zones.js draws the game's sprites there at the same scale; 0.45 dim on narrow screens) and faded by `clearBox`; `grade` = 40 slow #afc084 motes;
- `gd-conclusus.js`: `px()` = min(3, round(3k)), published for zones.js

### js/world

| File | Purpose |
|---|---|
| `world.js` | Core | `window.World {SLOT, LAND, BOUNDS, DECK, VIEW_UNITS, chaosAt, futureAt, draw, F, P, …}` |
| `vortex.js` | `drawVortex(x, y, R, opts)`: a flat layered cloud mass (`VORTEX_LAYERS`, deepest first, each a `layerPath` with a pinwheel hole) with hard radial shade and puffs pulled in; opts `seed outer layers alpha puffs`; first used by the Watcher |
| `void.js` | `drawVoid`, `drawChaos`, `drawTendrils`, `drawPresences`, `drawFragments` (`FRAGMENTS`), `drawFuture` |
| `watcher.js` | `WATCHER_SHARDS`/`WATCHER_CRACKS`, `drawWatcher` (calls `P.drawVortex`, `P.serusPhase`/`P.drawSerus`), `RED_STAR`, `drawRedStar` |
| `serus.js` | `serusPhase`, `drawSerus` (the alien coiled in the Watcher) |
| `nephilim.js` | `NEPHILIM` anchor, `nephRng`, `NEPH_*`, `nephWalk`, `nephRibbon`, `flatVolume`, `drawNephilim` |
| `admin-tear.js` | `ADMIN_TEAR`, `TEAR_JAG`, `TEAR_MOTES`/`SPECKS`/`STITCH`, `tearLine`/`tearHalf`/`tearPath`, `drawAdminTear` (a cut in reality: warped lattice sheared into the wound, lit lip, void with specks, infall motes, gold sutures at the tips) |
| `vikings.js` | `VIKINGS`, `VIKING_STARS`/`LINES`/`MAG`, `drawVikings` |
| `rex.js` | `fillRidge` wrapper, `drawRex`, `drawHell`, `rexInterior`, `drawRexPlaces` (reads `window.RexArt`) |
| `city.js` | `drawBand`, `drawCityNear`, `drawLandPlace` (reads `window.LandArt`), `drawRoot`, `drawBridge` (`GenVoid.paintSpan` into a stage; the hero blits the top, `#bridge-legs` the bottom) |

- `world.js`: `VIEW_UNITS`, `SLOT`, `LAND`, `BOUNDS`, `DECK`, `FLOOR`, `BAY`, `chaosAt`, `futureAt`, seeded `city` and particle arrays, Rex consts `REX_BANDS`/`REX_FROM`/`REX_END`/`HELL_AT`/`rexHeight`/`REX_PLACES`, `rexSprite` cache, `depthAlpha`/`setA`/`faded`,
- `world.js`: `MAIN_PAR` + faction anchors, `F`, `P`, `scale`/`wx`/`onScreen`, `draw` (paint order lives here; a gamedev frame is handed to `GdWorld.draw`)

### js/world/art

Each place file is `const RexArt = window.RexArt = window.RexArt || {}` (or
`LandArt`) plus one section and one `RexArt.<key> = {box, paint, live, …}`.
Shape: Rex entries `{box, paint, live}` (`firstlight` also `under`); Land
entries `{box, top, paint, live}`. `+y` is UP in the land painters.

| File | Key | Notes |
|---|---|---|
| `rex-kit.js` | `window.RexKit {archWin, lancet, cutFoot, pocket, trace, spill, lip}` | loads first |
| `firstlight.js` `crimson.js` `bonespire.js` | `RexArt.firstlight / .crimson / .bonespire` | surface; Bone Spire is the style reference |
| `titans.js` `valkhar.js` `law.js` | `RexArt.titans / .valkhar / .law` | caverns; Titans is the style reference; `*_POCKET` call `pocket()` at parse time |
| `land-kit.js` | `window.LandKit {band, arch, litRect}` | loads before the factions |
| `shattered.js` `libertech.js` `dawn.js` `accord.js` `gore.js` | `LandArt.shattered / .libertech / .dawn / .accord / .gore` |  |

### js/genesis

All share `window.Gen` (`G`). Values that change per frame are read as
`G.x` at call time; constants, arrays and helpers are destructured once.

| File | Purpose | Publishes |
|---|---|---|
| `genesis-state.js` | `BEATS` (34 beats; `rex` birth beat archived as a comment), `SCENES` + `SCENE_ORDER` (birth point–walk, root root–corrupt, rex dot–land, valkhar gods–stalemate, mainland firstlock–now), `sceneSpan/sceneOf/sceneT`, `?gscene=<id>` (`?gseg` alias) | `window.Gen` |
| `genesis-paint.js` | flat-art helpers `flatGlow flatSphere mixHex fillRidge gridXs rexLandHeight mainHeight mainDome eastJag mainSurfY standY` | `window.GenPaint` |
| `genesis-eldpal.js` | the eldritch palette: 21 named tokens as `{lit, mid, shade}`, tier-3 sky steps, `SEA` (five sea families, read by genesis-elements.js); `tone report contrast swatchSheet` | `window.GenEldPal` |
| `genesis-ceilkinds.js` | registry of ceiling hanging objects; draws sprout, tuft, fin | `window.GenCeilKinds` (`add list pick deck palette hues`) |
| `genesis-ceilclouds.js` | one opaque ceiling cloud design from the owner sketch: three flat stacked layers (CEILCLOUD tones), each swaying on its own, cached geometry, layer-tagged underside anchors for hanging objects | `window.GenCeilClouds` (`add list deck`) |
| `genesis-ceilmembrane.js` | `GenCeilMembrane.build(kind, x, y, w, h, seed)` / `draw`: navy ceiling cloud body as one membrane, five painters (bundle, B4, strand, slab, split; `shape` in genesis-ceiling.js picks by seed); loads before genesis-ceiling.js | `window.GenCeilMembrane` |
| `genesis-ceilkinds-plant.js` / `-metal.js` / `-cloud.js` / `-odd.js` | family files, load after the registry and before genesis-ceiling.js; each calls `GenCeilKinds.add` (stubs until specs 9-12) | none |
| `genesis-ceilshapes.js` | the ceiling's flat metal stones as Path2D: stepped slab and the -///- symbol, chipped edges, one sheen band; `glass` still exported but no longer drawn on the ceiling | `window.GenCeilShapes` (`metal`, `glass`) |
| `genesis-ceilkinds3.js` | ceiling hanger worm (pale ringed, tapered, on metal rocks) and the eye drawer for metal rocks' eye sites (crack that opens into one of four looks, one open at a time via a module scheduler; no slit hanger) | `window.GenCeilHang3` (`kinds`, `eye`, `eyeSite`) |
| `genesis-ceilkinds2.js` | extra ceiling hangers (bead chain, stepped bar, pointed teeth, pendulum), seeded; not in the GenCeilKinds deck | `window.GenCeilHang` (`kinds`) |
| `genesis-tier3.js` | tier 3, the sky shadows (plan phase 16) | `window.GenTier3` |
| `genesis-giants.js` | the three break-beat giants A, B, C (specs 8, 9) | `window.GenGiants` (`draw(ctx,W,H,tb)`) |
| `genesis-void.js` | Far realms, motes, the monumental span (`paintSpan`, `paintLimb`, `hh` shared with the homepage bridge) | `window.GenVoid` |
| `genesis-flesh.js` | the Primordisentia: `fleshGeom fleshPath drawFlesh` (lobes, veins, eyes, mouths; `calm` arg = smooth still ball, eyes and mouths shut, dark top band), `drawPatches` (the old ones' colours), `drawSouls`, `drawCry`, `drawSeal` (the gold womb) | `window.GenFlesh` |
| `genesis-soup.js` | `soup` beat inside the womb: red dots eat the blue in held steps; `drawBackdrop`, `finalReds` (post-eat layout), `shaded`, `PAL` shared with later inside beats | `window.GenSoup` |
| `genesis-eye.js` | `eye` beat: tier-3 lidless arc cut by the frame; colour leaves as sparks into a power point, grey dust lands in one centre mound: `draw`, `drawPowerPoint`, `pile`, `pool`, `setPileCut(k)` (hide the top k pile rows) | `window.GenEye` |
| `genesis-roles.js` | `roles` beat inside: eye end state as backdrop; bare east-goers (GenOld.drawKind, dressed:false) walk in held steps, watch the pool, take notes (tablets), flesh wall stacks snap up | `window.GenRoles` |
| `genesis-circle.js` | `circle` beat inside | `window.GenCircle` |
| `genesis-chains.js` | `chains` beat inside: the P8 disc snaps to a ring, linked rings snap out along a chain with the rose thread, then 3 held zoom-outs to hex chain-mail fields (levels 2-3 stamped from offscreen tiles), magic rings carry a pale chip: `draw` | `window.GenChains` |
| `genesis-corrupt.js` | `corrupt` beat inside: a level-1 ring field, 3 rings turn red in held arc steps, a dark blade cuts each loose, a dark crescent (mothers) folds it to grey dust, one red dot per ring rises in steps into a lumpy red layer at the roof: `draw` | `window.GenCorrupt` |
| `genesis-rexin.js` | `rex` beat inside | `window.GenRexIn` |
| `genesis-dot.js` | `dot` beat inside: over GenRexIn at t=99, a ring turns red, the red dot (Obrokxus) steps out towards the right wall while Rex's right arm reaches in held steps: `draw` | `window.GenDot` |
| `genesis-clash.js` | `clash` beat inside: close view, Rex's fist drives the red dot into the womb wall in 4 blows (stepped octagon rings), the wall bulges and tears in held steps onto tier-1 strata: `draw` | `window.GenClash` (`draw(...,noActors)`, `geom`) |
| `genesis-death.js` | `death` beat: clash backdrop without actors, Rex's fist steps into the tear and curls over the red dot, the arm steps to dead grey. `window.GenDeath` |
| `genesis-gods-beat.js` | `gods` beat opening: the death frame cut by a stepped octagon onto the live land. `window.GenGodsBeat` |
| `genesis-elements.js` | wave one after the break | `window.GenElem {seaRise, seaLevel, seaLine, seaLineRest, airFront, airStart, airLift, seaRiseDone, draw, drawResidue, drawSea, paintSea, drawAirDrift, rage, layerBegin, layerEnd, dimK}` |
| `genesis-sky.js` | ARCHIVED, OFF (GLASS_ON = false): the cracked-glass sky: fractures and shards burst from the split point over the air half | `window.GenesisSky {draw}` (glass shatter from the flash to the end of birth) |
| `genesis-matter.js` | wave two | `window.GenMatter {draw, drawRocks, drawRockAt, rockPose, ROCKS, chunkAt, MASS, massScale}` |
| `genesis-rocktitans.js` | Four rock titans: grow from the blast rocks in matter, meet at one point in trade and burst into debris the old ones grow from; see bullet | `window.GenRockTitans {on, draw, LAYOUT, buildDebris, drawDebris, partRest}` |
| `genesis-trade.js` | only the travelling stream now: `drawStream` = 200 travellers flowing east/west around the camera from late trade through walk | `window.GenTrade {drawStream}` |
| `genesis-oldones.js` | 24 old ones, no two alike | `window.GenOld` (also `PAINT deckSpot litSplit eyeDot figCover captionBand OLD_DIM birthT`) |
| `genesis-oldkin.js` | Painters for the fourteen new old ones | extends `window.GenOld` |
| `genesis-attire.js` | the attire kit (plan phase 7) | `window.GenAttire` |
| `genesis-figures.js` | flat silhouette cast | `window.GenFig` |
| `genesis-titans.js` | adds `drawTitan` (`"rex"`: stand/lunge/grapple/fall, `cool`; `"obrokxus"` = his first form, the blob: stand/lunge/climb/flee; `"centihorse"`/`"worm"` dispatch to genesis-obrok.js) and `drawHound` | extends `window.GenFig` |
| `genesis-obrok.js` | Obrokxus's later forms | extends `window.GenFig` |
| `genesis-gods.js` | the five gods, one painter each, registered in `GenFig.GOD_PAINT` and picked by `drawGod` on `o.kind` | extends `window.GenFig {GOD_PAINT, godHand, almurSweep}` |
| `genesis-hosts.js` | the war's figures, flat and lit from the left | `window.GenHosts {ABOM, ABOM_PAL}` |
| `genesis-seraphin.js` | the angels as winged beasts of light, no halos: `o.form` `"bird"` (crane) / `"hound"` (sighthound) / `"stag"` (gold antlers), big feathered `wing()`s (far wing a V behind), `o.fly` = flight pose (body around `y - 0.55s`), cast glow at `HAND` | sets `GenHosts.drawAngel` |
| `genesis-malgrur.js` | the devils: `o.form` `"gaunt"` (tall, thin, crooked, two horns; most of them) / `"bat"` (membrane wings, always flies) / `"fiend"` (delegates to the old `drawDevil`, captured at parse time); cast flame at `HAND` | replaces `GenHosts.drawDevil` |
| `genesis-vorgath.js` | more vorgath forms pushed onto `GenHosts.ABOM`: `bloat` (swollen sack, eye cluster, maw), `whelp` (segmented crawler after Obrokxus's centipede form), `maw` (walking skull-jaw) | extends `GenHosts.ABOM` |
| `genesis-mainland.js` | Mainland bands, spires, city and nest pit | `window.GenMain` |
| `genesis-armies.js` | the war simulation | `window.GenArmies` |
| `genesis-orb.js` | `drawRip lightsAt` (titan keyframe paths) `pushTrail drawTrail drawOrb drawRings drawBeam drawTintBeam yWob drawName` | extends `window.GenVoid` |
| `genesis-rex.js` | Rex chase, fight and the ending | `window.GenRex` |
| `genesis-depths.js` | `drawDepths`: rock, ribs, stalactites, the pocket, Obrokxus in Rex's grip, three gods (almur, maelu, ulden) striking him (deep and slip; no army, D38), the year counter | `window.GenDepths` |
| `genesis-saga-state.js` | `sagaAt` | extends `window.GenSaga` |
| `genesis-ritual.js` | the warlock births and the Hound's ritual | `window.GenRitual` |
| `genesis-saga.js` | The saga painter and live world | extends `window.GenSaga` |
| `genesis.js` | Cutscene conductor: DOM, transport (`play`, `playScene` = `playSegment`, `segmentSeen`, `skip`, `seek`, `seaming`); full play veil-fades at each scene seam, camera, draw; `warm` pre-paints beat starts offscreen | `window.Genesis` |

- `genesis-state.js`: world constants, state (`cam`, `zoom`, `zoomKick`, trails, rings, `sparks`), O(1) `idxOf`, `since/linear/only/sx/beatDur`, `G.BEAT_START` + `G.secs(id)` (seconds since a beat began, negative before it), dev params `?genesis=1` / `?gbeat=<name>`;
- `genesis-state.js`: `G.GOD_H` (0.16) is the gods' height as a fraction of the screen; `G.SERUS_SCALE` (2.0) is Serus's size multiple in the birth walk
- `genesis-state.js`: `G.STRIKE_S0` (0.29) and `G.strikePulse(c)` are the gods' shared strike shape in deep and slip (act about 1.5 s of the 3.70 s cycle); `genesis-gods.js` `strikeOf` inverts `STRIKE_CA` from it
- `genesis-tier3.js`: the Brim, Comb, Lintel and Arc as flat near-background shapes cut by the top edge, screen-fixed (undoes zoom and shake), `POSE` per beat with held-step motion `mv` (drift, lurch, enter, fade, pass, level; plan phase 17), `offset(k)` gives a being's current offset,
- `genesis-giants.js`: A topples in held steps, B and C stand still; the whole owner sketch sheet mapped to the screen, passing behind the bridge; screen-fixed (undoes zoom and shake); dark TIER3 tones; drawn only during the explosion (tb 0.5 to 1.6 s).
- `genesis-tier3.js`: `tines(k)` the comb's tine screen xs while it acts (plan phase 18), caption-box t1 clip, haze bands; `pocket(x, y)` makes far lights and motes skip round them; drawn right after `fillBg`
- `genesis-void.js`: `fillBg`, `drawMotes`, `drawChaos` (the far realms: parallax dark blobs + far lights), `drawPoint` (pressure rings, mind specks, cracks),
- `genesis-void.js`: `paintSpan(ctx, {W,H,camX,deckY,ky,fogEnd})` (the same span body with explicit inputs and a settled beat; the homepage bridge) and `drawSpan` (the monumental bridge: slab, piers, arches, dark red rail)
- `genesis-void.js` `drawSpan`: deck and hanging cities from `trade`, pier nests from `walk`, plan phase 19; clears, masks and blits only a device-pixel box around the span, plan phase 23
- `genesis-circle.js`: roles end state as backdrop; a grey thread rises from the pile and draws the ring in 8 held arcs from the bottom (pile shrinks a row per arc via `GenEye.setPileCut`), the rose thread + power point from P,
- `genesis-circle.js`: then a living universe (flat disc + band, turning 2-arm speck spiral, rose sparks, blue souls): `draw`, `drawUniverse(ctx,W,H,t,C?,R?)` (chains' opening disc)
- `genesis-rexin.js`: Rex tears the level-1 ring into two arcs, grows over held zoom-outs (field shrinks, roof band thins) until only part of him fits, then the chains settle round him as braided dark-red rivers;
- `genesis-rexin.js`: `draw(...,reach)` bends the right arm, `rexGeom(W,H,reach).hand`: `draw`, `rexGeom`
- `genesis-elements.js`: dust, air, wind, sound, colour, light; 460 particles, rage events; `drawResidue` = the permanent void traces (dust, wind, colour stains, lights, sound rings) drawn every frame after the far realms; stains and rings are out from `walk` through `root`, back over `land`;
- `genesis-elements.js`: late in `elements` each particle freezes and snaps in held steps to the sea, the rail top or the sky (`posAt`, `drawSplit`) (plan phase 21).
- `genesis-elements.js`: `drawSea` draws the crooked waste at the frame bottom: debris falls and heaps, then forms (spires, ledges, loops, stairs, self-contradicting kinds) rise out of the heaps; colours are `GenEldPal.SEA` families keyed to world x.
- `genesis-matter.js`: 100 flesh/stone/meld chunks (float, fall, break, meld pairs) that fly briefly then gather into one mass (`MASS`, slot per chunk, `gatherK`) resting on the span;
- `genesis-matter.js`: through trade its four rocks are skipped while `GenRockTitans.on` (the titans take the mass to the clash); 150 insects hatching (deformed, most die; storm deaths), 7 lawless storms (air, rain, fire, lightning)
- `genesis-oldones.js`: one each of the ten old kinds (slot 0 the headless gentleman, east, bare until a `dress` beat, then a GenAttire suit: `dressNow gentlemanBare gentlemanDressed`; eye, mass, blinker and roller switch the same way;
- `genesis-oldones.js`: `windAt`/`frostNow` set `GenAttire.weather` per frame, each `<kind>Dressed` a new body per D28; `place()` acts for east-goers: stutter, mime gait, held-pose kneel and bow, twitch, `p.gest`;
- `genesis-oldones.js`: in the `dress` beat each east-goer flips `o.dressed` at its own `dressAt` time after `drawMaking` cloth steps; in the `leave` beat every rim old one but the carers (`CARERS`: eye, chime, mound) and the brothers goes out left to right by x, half then gone,
- `genesis-oldones.js`: leaving a `drawPin` of its `o.hue` that runs along the rim and out, `p.pinU`) plus fourteen painted in genesis-oldkin.js, six locomotions (walk, slide, fly, blink, roll); humanoid/animal-like kinds go west (side -1), the strange ones east;
- `genesis-oldones.js`: grows from its debris part at `birthT(idx)` (trade 3.0 + rank x 0.12), posed by `GenRockTitans.partRest(idx)` (`p.rot`, `p.mirror`, `p.clipBox`); walk from 8.4; reduced motion: upright and awake at `deckSpot` from trade 0,
- `genesis-oldones.js`: break confetti gates: `figCover(x,y)` and `captionBand()` gate the break confetti.
- `genesis-oldones.js`: `drawOldOnes` takes `env.emerge` and `env.layer` ("inside" layer kept for the draw order, draws nothing since the births replaced the climb): `ROSTER_SPECS ROSTER ORDER place drawOldOnes drawShards drawKind makeOne`
- `genesis-oldkin.js`: painters for the fourteen new old ones (tower pearl bundle needle slab bloom comb veil knot husk chime prism swarmling mound;
- `genesis-oldkin.js`: every east-goer (tower bundle slab comb chime mound swarmling prism bloom veil needle knot) switches `<kind>Bare`/`<kind>Dressed` on `O.dressNow`, each Dressed a new body with its clothes per D28), registered into `GenOld.PAINT`
- `genesis-attire.js`: flat garment painters registered by `reg(piece, kind, spec)` and drawn with `draw(ctx, piece, x, y, s, opt)` (unit coords, `fit` tailored/found, `sq`, `dir`, `seed`, `snow`;
- `genesis-attire.js`: `weather {w,g,t,frost}` shears pieces about the anchor and defaults `snow`, set by `GenOld.windAt`), lit from the left in three flat bands, cached to offscreen canvases; `sheet(ctx, w, h, piece)` review sheet; worn by the dressed east-goers from `dress` on
- `genesis-figures.js`: `drawGod` (crowns: bars/rings/orbit/clock/petals/spikes), `drawWarlock` (returns the staff gem), `drawTroop`, `drawMortal` + shared `fillPoly shadedPoly quad withTilt`;
- `genesis-figures.js`: `drawGod` dispatches to `GenFig.GOD_PAINT[o.kind]` when set (genesis-gods.js), the robed figure is the fallback
- `genesis-obrok.js`: `drawCentihorse` (the centipede horse from flee through fall, flying: the 18 legs row through the air like oars (extended on the backward power stroke, folded on the recovery, wave head to tail), stand/run/lunge,
- `genesis-obrok.js`: `o.air` spreads the stroke wide) and `drawWorm` (the floating worm at the end of fall and in eternity, `o.speed`); `obrokEye(kind, x, y, h, o)` = where each form's eye is, which every beam aims at
- `genesis-gods.js`: `almur` (cobra on a throne), `maelu` (crane with huge white wings), `ulden` (empty dark hood, owl eyes, beard on a thread), `orochronus` (Serus, a black serpent dragon);
- `genesis-gods.js`: painter `o` fields `gait` (steps taken), `cyc`/`cw` (strike pulse angle/weight), `bind` (pull back), `lean`, `reach`; idle `breathOf`/`bobOf`, strikes `strikeOf`;
- `genesis-gods.js`: `ixu` (pearl-headed figure, three-piece tentacled gown, two clawed arms; leaves in gods, never strikes); `godHand(kind, x, yFoot, h, o, tx, ty)` = where each god's beam leaves it; kit `catmull`/`ribbon`/`vol`
- `genesis-hosts.js`: `drawDevil` (the humanoid devil: horns, tail, hooves, trident; kept as the rare `"fiend"` form),
- `genesis-hosts.js`: `drawAbom` (bone and flesh, dispatches by `variant` mod length into the `ABOM` registry: 0 `drawBrute` / 1 `drawCrawler` / 2 `drawStalker`, more pushed by genesis-vorgath.js);
- `genesis-hosts.js`: all `(ctx, x, y, s, o)` with y the foot line, `o = {a, face, walk, pose, down, lunge, cast, ph, variant, form, fly}`; `HAND` = casting-hand offset
- `genesis-mainland.js`: mainland bands, the surface cache `surfY(px)`/`surfYAt(wu, rise, scar)` every figure stands on, rooted red spires (`SPIRES`, `spireGeom(k, S)`; spires near the nest shrink to stumps as `S.drain` pulls them into the Hound), the city (roofs, walls, windows, lamps),
- `genesis-mainland.js`: the nest pit; `cityGeom` — after the war (`S.modern`) a share of each band rises into skyscrapers one by one (glassier walls, setback crown, antenna with a red light), the rampart sinks
- `genesis-armies.js`: angels (`seraphin`) and devils (`malgrur`) against abominations of bone and flesh (`vorgath`); `step(dt, S)`, `draw(ctx, S)`, `reset()` (march, front tide, melee lunges and sparks, casters loosing `BOLTS` that land as `BURSTS`, deaths, corpses, reinforcements);
- `genesis-armies.js`: each troop has a `form` and `alt` (flight height in sizes, 0 = grounded; set once in `host()` from `hash1`), `liftOf(T, s)` = bob, swoop in a fight, fall on death; fliers paint after the ground troops, their corpse waits out the fall (`hold`);
- `genesis-armies.js`: bolts leave from and aim at the lifted height (`dy0`, `dy1`); seeded `rnd` (mulberry 9011), no Math.random; painters from `GenHosts`
- `genesis-rex.js`: `chaseAt chaseFightAt ringFightAt`, the ending `escapeAt escapeDrift escapeCam escapeCamLead` (the worm gets away west, Almur follows alone), `drawRexLand` (hot rock cooling to slate, fissures), `drawRexHole`, `drawRexGrip`, `drawBuried` (the eye in the ground),
- `genesis-rex.js`: `drawGodsBirth` (five gods walk west inside the land to the deck, each with a chip of Rex)
- `genesis-saga-state.js`: every saga quantity for the frame (feet via `GenMain.surfYAt`, the warlock births `cMortal teach pact aelChild bless vTaint vHelp vForge`, the Hound's ritual `ritual drain hBorn`, Mordrial's fall/dark, Obrokxus's lash and sinking,
- `genesis-saga-state.js`: his forms `oFrom oForm oMorph` (blob → centihorse in flee, centihorse → worm late in fall), `oHide` (buried on the mainland) and `oAir`, Eldrin, facing and walk flags, `fallBeat/etBeat`, `modern` (the city's rise to towers over return + early eternity))
- `genesis-ritual.js`: `target(S)`, `drawUnder` (Cadmus's pact rift with Almur's gold seal, Aelius as a child in Maelu's light, Velindra tainted, then the drain: Obrokxus's brood (abominations, `BROOD`), souls, corrupted magic and spire shards pulled into the Hound),
- `genesis-ritual.js`: `drawOver` (teaching/pact/blessing/help beams, Velindra's blades, the four ritual beams, latched flashes)
- `genesis-saga.js`: `drawSaga` (ground/city/nest via GenMain, armies via GenArmies, `GenRitual.drawUnder`/`drawOver`, the cast as figures, Obrokxus's two-form cross-fade clipped to the ground while `oHide`, beams from hands/gems, Mordrial's death, clashes), `drawLiveWorld`;
- `genesis-saga.js`: `O_SCALE` sizes Obrokxus's forms 1 / ½ / ¼ (`hOf`), each drawn on the same body centre
- `genesis-rocktitans.js`: drawn from `genesis.js` at `break` secs >= 10 in the blast rocks' slot (before `drawSpan`); pieces cached as cropped sprites; one per-titan cache per snap k, drawn under a rock-to-titan group transform.
- `genesis.js`: DOM/overlay, caption crossfade, transport `play/skip/seek/finish`, `camAim` (+ per-beat `ZOOM` push/pull), `step` (zoom, sparks), the `draw` conductor (Act 1 wiring, the break flash (titans or `drawRocks`), titans in the fight, the depths, the saga, the now-fade),
- `genesis.js`: the two waves (`GenElem`/`GenMatter`) and the stream, the old ones' two layers (inside the mass before `GenMatter.draw`, the rest after) and `march` timing, input

### js/pages

The case pages' play layer. Every file is an IIFE on one global; the toys
only ever read `V` from `Play` and never reach into the bridge.

| File | Purpose | Publishes |
|---|---|---|
| `play.js` | Shared play layer, now a registry: canvas, view `V`, tiles, sprites, a no-op `award` | `window.Play {register (start alias), open, close, mount, handle, current, painted(toy), sprite, blit, glow, award, MIN_W}` |
| `heavylight.js` | The case-page toy; registers `heavylight` instead of starting | `window.PlayHeavyLight {play, on, report}` |
| `conclusus.js` | Document-space case-page toy; registers `conclusus` | `window.PlayConclusus {report}` |
| `sector-zero.js` | Viewport space; registers `zero` | `window.PlayZero {report, thunder}` |
| `sector-zero-records.js` | The ten record files and mails (Brian, Amy, Laura, Jason, Obscura) | `window.ZeroRecords {RECORDS}` |
| `voidscape-boons.js` | 34 boons from the game's list `{id, w, name, desc, fx}`; `build(gun, boons)` → the effective build from a `ForgeGuns` gun, its mods and the boons; weighted `offer(pool, rnd)` | `window.RangeBoons` |
| `voidscape-mapgen.js` | The mission console inline on the VoidScape page: sizes `#void-mapgen`, paints `Forge.map` (random first missions, SEARCH and EMPOWER, no room plan), no rAF when idle | `window.VoidMapgen` |
| `voidscape-bench.js` | The crafting bench inline on the VoidScape page: sizes `#void-bench`, paints `Forge.bench` while visible, input; `gun()`; fires `voidbench:gun` | `window.VoidBench` |
| `voidscape.js` | The range, viewport space | `window.PlayRange {report}` |

- `play.js`: `Play.start(spec)` mounts one fixed canvas behind the page (`.play`, z -1, pointer-events none; input is read on `window`, only presses on `body`/`html`/`main.case` count, panels are `.play-ui`),
- `play.js`: builds the view `V` (`W H top sy t dt pointer rnd blocks vis band main gutter free blockAt cursor wake`;
- `play.js`: `blocks` = document-space rects of every child of `main.case` plus the footer, `vis` the visible ones in viewport space, `band` the free strip right of the text column), runs a `Pacer` loop (`scrollWake` for `doc: true` toys),
- `play.js`: re-measures on load/resize and a 150 ms-debounced ResizeObserver on `main`; no layout read inside rAF (`V.sy` from a passive scroll listener cache, topbar rect on resize only);
- `play.js`: a toy with `doc: true` also gets `.play-tiles` (absolute, z -1 after the canvas, x from `spec.docX0` or `band.x0 - 128` to the viewport right, page-height tall): a fixed pool of 1024 px canvases repositioned by `translateY` over the viewport ±200 px,
- `play.js`: each cleared and painted per frame through `spec.drawDoc(ctx, V)` in page coordinates;
- `play.js`: `sprite(pal, def, scale)` pixel-sprite cache (2x default), `blit`, `glow` (with a `doc: true` toy: 4 px radius buckets drawn at the exact radius, 128-entry oldest-first cache), `award` (a no-op now: only the bridge gives XP). Desktop only (`min-width: 900px`);
- `play.js`: a still frame under reduced motion
- `heavylight.js`: no border; the beam runs to the viewport edge or the first shelf tile,
- `heavylight.js`: three built gutter chunks (`CHUNKS[k]`: cells, lamps right/up/wall/floor, a crate) each with a step list (`EVENTS[k].steps`: light/wait/slide/lift/drop/release/goal, run by `runSteps`);
- `heavylight.js`: event 3 slides the crate, lifts it on a floor lamp and hands it off onto the symbol tile, which then glows faintly; an event plays once when its chunk enters the middle third, pauses off-screen, and a click on a lamp replays a settled chunk (0.3 s fade out/in);
- `heavylight.js`: hover over a lamp gives a pointer and a .14 head glow; reduced motion is one still frame posed by `poseStill` (events frozen at 0.9/0.4/2.05 s); the toy fires only `play-heavylight`, never `play-heavylight-tower` (that id stays listed elsewhere, D64);
- `heavylight.js`: `window.PlayHeavyLight {report, on, play}`
- `conclusus.js`: Document space (`doc: true`: platforms, twins, silhouettes, spikes, keys, door, player, bursts and beacons paint in page coords in `drawDoc` on the play tiles, `docX0` = leftmost platform/spike x − 128; rain alone in `draw`):
- `conclusus.js`: up to 60 grass platforms beside the page blocks, each with a planted green twin; on open only the player and his platform draw;
- `conclusus.js`: the reveal (`revealY` = bottom of the `.embed-shell` block, set in `layout`, passes mid-viewport) fades everything else and the hint in over 0.6 s (`rev`), never hides, and clicks wait for it (reduced motion starts revealed);
- `conclusus.js`: after it, when the player's platform leaves the eye band (30-62 % of the viewport) he teleports (16-particle bursts, ≤120 live) to the platform nearest the band's centre (46 %) and plants a twin where he stood, paying nothing (no key, no XP);
- `conclusus.js`: click a twin or the shadow he left: the first such click is the play beat (`playBeat`: awards `play-conclusus`, hint "click the key to take it", unlocks key 1;
- `conclusus.js`: its beacon hangs 72 px over `playTarget()`, the twin on `playPlat` = first platform at or below the "The brief" h2, or the nearest twin while he stands there; keys carry `locked`); a green silhouette (never awards; silver = the 1.2 s cycle's deadly half;
- `conclusus.js`: up to 5 on the platforms between the "The silhouettes" h2 and the next h2, beat platforms skipped; one he jumps into returns after 4 s once he has left its platform, fading in 0.6 s and clearing the twin there);
- `conclusus.js`: door on `placeBeat("What it taught me" h2)`: locked = dim arch at 55 %, lit over 0.6 s when key 3 lands (`door.lit`), then `doorReady()`;
- `conclusus.js`: its click (`startWin`, `won`/`winSeq` fly→walk→fade→gone) flies the 3 keys tray→`doorSlot` in 1 s, hides tray and hint, `walkIn` 64 px left of the arch at 120 px/s, `enterArch` awards `play-cc-win` + rain surge, his twin stays in the arch, `reappear` near 46 %;
- `conclusus.js`: clicks and teleports locked meanwhile; stays won (no restart); a relayout mid-win `finishWin`s; reduced motion: frozen full level, no beacons/hint/tray/clicks;
- `conclusus.js`: `report()` = `{player, twins, beats{play (live twin target),key1..3 (locked),door}, door{open, won}, win, tray, revealed, rev, plats, sils}`;
- `conclusus.js`: spinning symbol, spike balls, 32 light motes born at the top-right corner drifting down-left on straight rays (`ray`, the game's RainEffect cone); sprites 2x (`CPAL`)
- `sector-zero.js`: the room's objects float in the strip right of the text (terminal, chair, bucket, screwdriver, lantern, four crates, light switch; flat lit/shade boxes, scale 1.3); click = the record types out in a `.play-ui.record` card at 0.03 s/char;
- `sector-zero.js`: the thunder loop (lower of two d100, losers drift, one turns red and creeps to the pointer, spring home, 0.5 s blackout; stronger comes back sooner); lantern flicker layers, screwdriver charge/throw/return, chair spin, the switch dims the room
- `voidscape.js`: a gun mount bottom-left aims at the pointer, hold on empty page to fire a `ForgeGuns.randomGun()`;
- `voidscape.js`: bullets ricochet off the screen edges only (page blocks are not walls), fire explodes on every bounce, cold chills/freezes, poison and bleed tick, headshots crit, damage pops; skulls hop, cones hover and shoot back, triangles lunge and self-destruct;
- `voidscape.js`: enemies are pushed out of page blocks; every 6 kills one boon is offered (take / reroll x2 / refuse for 10 health) in `.play-ui.offer`, the build card is `.play-ui.range`; 0 health = run lost, new gun, boons gone; the range goes quiet 40 s after the last shot

### js/shared

Data read by both the bridge and a case page. No drawing, no state.

| File | Purpose | Publishes |
|---|---|---|
| `heavylight-sprites.js` | The HeavyLight game's palette `HPAL` (11 colours, letter `a` = | `window.HeavyLightSprites {HPAL, HSPR}` |

- `heavylight-sprites.js`: index 0) and its 16 px sprites `HSPR` (floor/wall/drip/pillar/plat tiles, spike, symbol, box, lamp, key, lantern), `{w, h, ox, oy, px}` letter strings; moved verbatim out of zones.js (plan fixHeavyLightPage D35);
- `heavylight-sprites.js`: loaded before `gamedev/zones.js` in `index.html` and before `pages/heavylight.js` in `projects/heavylight.html`

### css, pages, tools

| File | Purpose |
|---|---|
| `css/style.css` | Base site: topbar, sections, project pages, small screens. Tokens, breakpoints and the z-index ladder are documented at the top |
| `css/gate.css` | The entry gate, every visit: boot log (first visit only), bar, the button. index only |
| `css/bridge.css` | Everything hero/cockpit: HUD, notes (reading-window override block after `.bnote .clipbox.todo`: bezel, `.nhead`, HUD palette), setting panel, boot terminal, genesis overlay (slim top controls, no bars). index only |
| `css/beacon.css` | Level chip and pips, surge burst, rank card |
| `css/play.css` | The case-page play layer: `.play` canvas (z -1, under the ladder), `.play-tiles` page-coordinate canvases (same z, above it), `.play-ui` panels (z 2) and `.play-hint`; all hidden under 900 px. Game pages only |
| `css/art/dirt-a.webp`, `dirt-b.webp` | Static transparent dirt tiles (1440x1280, repeat-y): dry-brush, scratches, big ink marks; tokens `--dirt-a`, `--dirt-b`, `--dirt-size` in style.css `:root`; used by the wall only (gate, veils), never a plate |
| `css/art/wash.webp`, `folder-glow.webp` | Baked wash and a nine-sliced inner glow, both no longer used; images so the sweep does not repaint gradients each frame |
| `index.html` | Homepage; section#intro (placeholder barrier hanging from the bridge, CSS clip + svg red cut), then the four Work rows; see bullet below |
| `projects/conclusus.html` | Case page for Conclusus, a precision platformer on the HeavyLight base (thirty levels, a planted shadow you teleport back to, pins that launch you, safe/deadly silhouettes; Unity, WebGL); toy `js/pages/conclusus.js` |
| `projects/sector-zero.html` | Case page for Sector Zero, a horror prototype where a text file is the physics engine (Unreal 5); toy `js/pages/sector-zero.js` |
| `projects/voidscape.html` | Case page for VoidScape, a first-person roguelike where the player rolls their own difficulty (Unity, C#); toy `js/pages/voidscape.js` |
| `projects/heavylight.html` | Case page for HeavyLight, a 2D puzzle platformer where light carries momentum (Unity, WebGL); toy `js/pages/heavylight.js` |
| `404.html` | Not-found page (root-absolute `/css/…` and `/js/…` paths) |
| `tools/nav-flows.test.py` | Playwright flows (Work-row hover, case-page click and beacon-nav flows: see `--list`; `work-hover` checks the hover preview); starts its own server on a free port; `ROOT` is the repo root; Conclusus flows `cc-read-xp`, `cc-scroll-pays-nothing`, `cc-keys`, `cc-win` |
| `tools/snap.py` | Screenshot regression; case-page scenes load `/#<name>`; `work-hover` scene (VoidScape row hovered 1.5 s); also 404, glimpse/rank cards, footer, phone scenes; `capture` flags `--only`, `--phone-width <px>`, `--reduced-motion` |
| `tools/bump.py` | Sets every `?v=` across the HTML pages; works from any cwd |
| `tools/merge-cachebust.py` | Git merge driver for `*.html`: merges with every `?v=` number treated as equal, then writes the highest back, so bumps never conflict; installed by `try.py` |
| `tools/pagecheck.py` | Lighthouse stand-in: `py -3 tools/pagecheck.py <index.html[#case]> [--phone] [--reduced-motion]` prints bytes by type, LCP/CLS/long tasks, sideways scroll, hidden, clipped, bare text, tilted `::before`; exit 1 on scroll/hidden/clipped/bare |
| `tools/hudshot.py` | Bridge HUD shots into `snapshots/<run>/`, prints `HudC25.report()`: `--c25` (no-op), `--size WxH`, `--at <mark>`, `--x`, `--site`, `--claimed`, `--read`, `--burn`, `--touch` (prints `phone:`, `canvas:`, `painted:`); exits 1 on a console error |
| `tools/gframes.py` | Tiles genesis beat frames for review into `snapshots/frames/<run>/<beat>.png`; imports `tools/snap.py` |
| `tools/banner-lab.html` | Banner lab page (`py -3 serve.py`, `/tools/banner-lab.html`): loads `js/site/shapes.js`, `js/site/banner.js` and `banner-lab.js`; dark tool page; `?sheet=N&seed=S[&set=k:v,..]` renders only the sheet onto `#cv` |
| `tools/banner-lab.js` | `window.BannerLab`: a control and lock per `Banner.schema` key, seed, Plate/Tab presets, sheet of seeded variants, PNG export at 2x/4x, state in URL hash |
| `tools/jscheck.py` | Loads JS files into a headless page in order and reports syntax/runtime errors; `--eval` runs against a 1440×900 canvas; imports `start_server` from nav-flows |
| `tools/toyshot.py` | One case-page toy in seconds (loads `/projects/<name>.html`) |
| `tools/bannersheet.py` | Headless banner-lab sheet PNG: `py -3 tools/bannersheet.py <out.png> [--n 24] [--seed 1] [--set key=val ...] [--preset plate\|tab] [--scale 2] [--compare ref.png]`; compare = ref left, generated right; exits 1 on a blank canvas or console error |
| `tools/plateref.py` | Shoots the live name plate and nav tab as ref PNGs: `py -3 tools/plateref.py <plate.png> <tab.png>`; refs for `bannersheet.py --compare` |
| `tools/titansheet.py` | `py -3 tools/titansheet.py <out_dir> [--layout path]`: 2000x1009 sketch sheet of the four rock titans (plan rock-titans phase 1) with per-titan and per-piece numbers; exit 1 on a console error or a failed size, gap, share or top check |
| `.claude/plans/research/rock-titans-sketch/layout.js` | `window.TitanLayout`: the titans' sketch layout (roots, cores, pieces, filler, shears); read by titansheet.py, copied by phase 2 |
| `tools/ceilsheet.py` | `py -3 tools/ceilsheet.py <out_dir> [--family f] [--seed n]`: labelled sheet of every GenCeilKinds kind fully grown on the ceiling wash, one PNG per family plus all-silhouettes.png; exit 1 on console error or blank cell |
| `tools/ffshot.py` | Shots in the installed Firefox (Selenium, headless): `--path`, `--size WxH`, `--scroll SEL`, `--hover SEL`, `--wait ms`, `--out png`; `--games` shoots each Work row at rest and hovered, plus 390x844; exit 1 on errors |
| `tools/workcut.py` | Games rows cut check in the installed Firefox: every Work row's slab inside its clipping box and the window, text inside the slab, no side scroll; sizes `WxH`, `@z` opened at zoom, `~z` zoomed while open; exit 1 on a fail |
| `tools/scrollperf.py` | Scroll-jank measure |
| `tools/cleanup.py` | Shared (synced). Deletes landed session branches and their worktrees |
| `tools/try.py` | Shared (synced). Try or land a session branch |
| `tools/try_project.py` | Portfolio hooks for the shared `try.py`/`try_commit.py` |
| `tools/try_commit.py` | Shared (synced). The owner's Commit |
| `tools/autoplan.py` | Shared (synced). Run a plan unattended |
| `serve.py` / `serve.bat` | No-cache static server, port from `PORT` env or `sys.argv[1]`, default 8765; always serves its own folder (`os.path.dirname(__file__)`), not the caller's cwd, so it works run from a worktree (8000 avoided: stale SW) |
- `index.html`: section#intro sits before div.stage (own zoom by --stage-s, full window width); each Work row has its hover clip (`video.obj-clip`) and button (`span.obj-go`). Inline head script is only the service-worker purge
- `hudshot.py`: `--x <world x>`, `--site <SITES id>` (implies `--claimed`), `--read <n>`, `--burn <s>`, `--touch` (phone check, no shot); imports `tools/snap.py`

- `tools/snap.py`: `capture`, `compare`, `list`; `page-<name>-toy` scenes shoot each case-page toy canvas in the viewport at three scroll stops (`TOY_STOPS`; `toy_frame`, `toy_ink`, whose `TOY_INK` counts `canvas.play` plus every shown `.play-tiles canvas`);
- `tools/snap.py`: imports `start_server` from nav-flows; reads scene ids from `js/bridge/marks.js` and `js/genesis/genesis-state.js`
- `tools/toyshot.py`: `py -3 tools/toyshot.py <page> [--out PATH.png] [--t MS] [--y PX\|FRAC] [--click-beat KIND]... [--show-beat KIND]` writes a viewport shot (default `snapshots/toys/<page>-<y>.png`, or `<page>-beat-<kind>[-after-<kinds>].png`), prints the inked px count;
- `media/genesis-ceiling/`: owner-approved off-site ceiling cloud pictures (2026-10-28), not wired into the site yet: `back-cloud.png` (whole cloud, ocean #262c2a + bluish #425464), `back-cloud-gold.png` (navy/gold), `layers.png` (1440x900 layered try), `sprites/` (obj1-3, tiny1-4).
  - `media/genesis-ceiling/`: since 2026-10-28 genesis-ceiling.js draws every cloud in code; `ceil72-tip1..6`, `ceil72-obj1..5`, `ceil72-tiny1..6` and back1..6 are no longer loaded.
  - `ceil72.json` = {back,tip,obj,tiny} of {file,w,h,ax,ay,hang}; its boxes may still place the code-drawn clouds.
  - `ceil72-*.webp` + `ceil72.json`: the chosen "layers72" ceiling exported as trimmed alpha sprites (back band, obj1-5, tiny1-6); json gives each sprite's size and x,y in the 1440x900 frame, plus hang anchors (u,v) on object clouds.
- `tools/toyshot.py`: beats come from `PlayConclusus.report().beats` (`play key1 key2 key3 door`): each click scrolls it to mid-viewport, runs 900 ms, re-reads, clicks, runs 1500 ms; a null beat exits 1; exits 1 on a blank/missing toy or a console error; imports `tools/snap.py`
- `tools/scrollperf.py`: `py -3 tools/scrollperf.py <page> [--bar] [--runs N]`, headed Chromium 1440x900 DPR 1 in real time, wheel 120 px / 16 ms to the bottom and back; injected probe rAF loop (frame intervals), per-callback ms of the toy's rAF (stack in `pacer.js`/`js/pages/`),
- `tools/scrollperf.py`: layout reads inside toy frames (+ sites in an extra attribution run), longtask / long-animation-frame / layout-shift, CDP Layout/RecalcStyle/Script deltas; median of runs to `snapshots/perf/<page>-<stamp>.json`; `--bar` prints D37 PASS/FAIL, exits 1 on a FAIL
- `tools/cleanup.py`: `py -3 tools/cleanup.py [--dry-run] [--idle-hours 24] [--keep B] [--quiet]`; candidates are local `claude/*`, `worktree-*`, `plan-*` branches or any branch whose worktree is under `.claude/worktrees/`;
- `tools/cleanup.py`: one goes only when its work is on `main` (ancestor, `merge-tree` result equals main's tree, or a `Squashed from <b>:` commit newer than all its own commits), its worktree has no uncommitted or untracked files, `origin/<b>` has nothing extra,
- `tools/cleanup.py`: and nothing touched it for 24 h (tip time, worktree `index`/`HEAD` mtime); `git worktree remove` without `--force`, then `branch -D`; also removes empty unregistered folders in `.claude/worktrees/`; never touches origin;
- `tools/cleanup.py`: run by `session-start.py` (startup only) and at the end of `try.py --commit`
- `tools/try.py`: `py -3 tools/try.py` lists session branches; `py -3 tools/try.py <branch> [--path /url] [--port N]` checks it out detached into `../Portfolio-try` and launches it through `try_project.launch` (Enter stops, `commit` lands);
- `tools/try.py`: `py -3 tools/try.py main` serves this checkout; `--commit` calls `try_commit.land`
- `tools/try_project.py`: `setup` installs the `cachebust` merge driver (git config + `.git/info/attributes`, shared by all worktrees), `add_arguments` adds `--port`/`--path`, `launch` runs `serve.py` on a free port from 8766,
- `tools/try_project.py`: `before_commit` runs `bump.py` on the combined tree in `../Portfolio-try`
- `tools/try_commit.py`: squash via `git merge-tree`/`commit-tree` without touching the main checkout's files, refuses when the owner's uncommitted edits touch files the branch changes,
- `tools/try_commit.py`: runs `try_project.before_commit` (folded into the commit) and `verify` on the combined tree in `../Portfolio-try`, then `git merge --ff-only`, merges main back into the session branch, runs `cleanup.py`; never pushes
- `tools/autoplan.py`: `py -3 tools/autoplan.py [plan] [--budget USD] [--max-sessions N] [--line 160000] [--kill 185000] [--dry-run] [--here] [--force]`. From the main checkout it makes/reuses worktree `.claude/worktrees/plan-<name>` (branch `claude/plan-<name>`,
- `tools/autoplan.py`: writes its HERE) and re-runs itself there. One headless `claude -p` session per phase, prompt = header + `phase_brief()` (the plan's `.state.md`, the next runnable phase by Progress `Needs`, cited D's, Carry forward, saved specs);
- `tools/autoplan.py`: strips API billing env vars and stops on a usage limit (exit 3); never starts while questions wait or a blocker stands (exit 4, prints the answer route); stops on plan done, 3 partials, no progress, auth error or budget; logs and lock in `.claude/autoplan/`

### Load order

`index.html` head: `css/style.css`, `css/gate.css`, `css/beacon.css`,
`css/bridge.css`, then `js/lib/util.js`,
`js/site/xp.js`, `js/site/entry.js` (blocking, on purpose), then the inline
SW purge. Body tail, in this order:

`site/surge → bridge/lamp → depths/depths → depths/lore →
hud/instruments → hud/hud-models → hud/tiles-sys → hud/hud-c25 → lib/paint → world/art/* →
world/world → world/* → ship/voidship-art → ship/voidship-prow →
ship/voidship → lib/pacer → bridge/marks → bridge/bridge-sites →
bridge/bridge-log → bridge/bridge-voice → bridge/{bridge, bridge-notes,
bridge-input, bridge-motifs, bridge-marks, bridge-poi, bridge-panel, bridge-depths,
bridge-env, bridge-readout, bridge-loop} → genesis/* → site/lazy-video →
site/embed → shared/heavylight-sprites → site/redlines →
site/intro`.

Index loads no toys and no `play.js`: the Work rows preview on hover (`work-preview.js`). `work-preview.js` loads
after `embed` and `shared/heavylight-sprites`, then `redlines`, then `intro.js`. `genesis/*` and `world/*` keep the order in `index.html` (grep
`<script`); the constraints below still hold.

Nothing uses `defer`/`async`. `intro.js` must stay last: it dispatches
`site:preload` synchronously at top level. Order constraints inside a
folder: core before parts (`world.js`, `depths.js`, `bridge.js`,
`instruments.js`, kits before places, `voidship-art` before `voidship-prow` before `voidship`
(the prow extends `VoidshipArt` at parse time)); `bridge-sites` before
`bridge-voice`; `bridge-env` after `bridge-depths` and before
`bridge-readout`; `genesis-flesh` before
`genesis-rex` (it destructures `fleshPath` at parse time);
`genesis-figures`/`genesis-titans` before `genesis-rex`, `genesis-depths`
and `genesis-saga` (used at call time, kept before for clarity);
`genesis-hosts` after `genesis-figures` (destructures `fillPoly quad
withTilt` at parse time) and before `genesis-armies`/`genesis-ritual`;
`genesis-seraphin` and `genesis-malgrur` right after `genesis-hosts`
(they read `GenHosts` at parse time; malgrur captures the old
`drawDevil` before replacing it); `genesis-vorgath` after `genesis-hosts`
(it pushes onto `GenHosts.ABOM` at parse time);
`genesis-mainland` and `genesis-armies` before `genesis-saga-state`/
`genesis-saga`; `genesis-saga-state` before `genesis-saga`;
`genesis-trade` before `genesis-oldones` (SPOTS, read at call time);
`genesis-gods` after `genesis-figures` (destructures `fillPoly shadedPoly
quad withTilt` at parse time);
`genesis-rocktitans` right after `genesis-oldkin` (needs `GenOld`, `GenMatter`);
`genesis-oldkin` right after `genesis-oldones` (registers into
`GenOld.PAINT` at parse time). Never bake `G.W`/`G.H` into data at load:
they are 0 until the cutscene sizes its canvas; store fractions and
multiply at draw time. `Util.clamp` has no default bounds: always pass
`0, 1`. Scripts carry `?v=N` cache-busters; bump them with
`py -3 tools/bump.py`.

Game pages (`projects/*.html`) load: `lib/util, site/xp, site/surge, lib/pacer, site/lazy-video, pages/play`, the page's toy files, then `site/redlines`; grep `<script` for exact order.

- Game page toy files, voidscape: `forge/{forge-guns, forge-missions, forge}` then `pages/{voidscape-bench, voidscape-mapgen, voidscape-boons, voidscape}`. Sector-zero: `sector-zero-records` then `sector-zero`.
- Game page extras: Conclusus and HeavyLight add `site/embed`, then `bridge/lamp` (Conclusus) or `shared/heavylight-sprites` (HeavyLight) before their toy.

### Where things live

| Concept | Go to |
|---|---|
| Rex kingdoms | `js/world/rex.js` `drawRexPlaces` + `world.js` `REX_PLACES`; art in `js/world/art/{firstlight,crimson,bonespire,titans,valkhar,law}.js` |
| Mainland factions | `js/world/city.js` `drawLandPlace`; art in `js/world/art/{shattered,libertech,dawn,accord,gore}.js` |
| Style references | Bone Spire `js/world/art/bonespire.js`, Titans cave `js/world/art/titans.js` |
| `litShade` | One copy, `js/lib/paint.js` |
| Camera / pan / projection | `js/bridge/bridge.js` `B.camX`, `wx()`, `markScreen`; input in `js/bridge/bridge-input.js` |
| Ship motion and feel | `js/ship/voidship.js` `BASE` + `step` + `setThrusting`; glue `bridge-input.js` `beginBurn`/`endBurn`/`retargetFromPointer`, `bridge-loop.js` `step`/`atRest` |
| Ship art and fumes | `js/ship/voidship-art.js` (the dark wedge hull, wings, engine) and `js/ship/voidship-prow.js` (the red shard and the jaws that grip it); particle schema where `voidship.js` spawns them (`fumeAcc +=`) |
| Sector Zero storm (archived) | `archive/gamedev/js/gamedev/storm.js` |
| VoidScape bench / console / floor plan | `js/forge/forge.js` (+ `forge-guns.js`, `forge-missions.js`); driven by `js/pages/voidscape-bench.js` and `voidscape-mapgen.js` |
| Game-themed backdrops (archived) | `archive/gamedev/js/gamedev/zones.js`, `archive/gamedev/js/bridge/planet.js` |
| Game Dev background (archived) | `archive/gamedev/js/gdworld/` |
| Landmarks / beacons | `js/bridge/marks.js` `MARKS`; gated extras `js/depths/*` |
| Depth node spawn / reveal / fly-in | `js/bridge/bridge-depths.js`; timing consts `FLY_*` in `bridge.js` |
| Notes and hints | `js/bridge/bridge-notes.js` |
| View persistence, iris FX, cutscene journal | `js/bridge/bridge-panel.js` |
| Environment model / place readings | `js/bridge/bridge-env.js` (`B.env`, `B.stepEnv`) |
| Readout text | `js/bridge/bridge-voice.js` `ZONES`; site lines in `js/bridge/bridge-sites.js` `lines()`; glue and hull damage in `bridge-readout.js` |
| HUD | `js/hud/hud-c25.js`, models `hud-models.js`, sys model `tiles-sys.js`; clock and alarms `instruments.js` |
| Main rAF loop | `js/lib/pacer.js` (`frame`), created in `bridge-loop.js` as `B.pacer`; other loops in `intro.js`, `surge.js`, `xp.js` |
| Storage keys | `js/lib/util.js` `KEYS` (never type a key literal) |
| Entry gate | decision `js/site/entry.js`, UI `js/site/intro.js`, CSS `css/gate.css` + `css/bridge.css` boot terminal, bridge defers in `bridge.js` `readyBridge` |
| Cutscene | `js/genesis/` (see table) |
| Plan phase state (one phase per session) | `.claude/plans/<name>.state.md`, committed, exists only while that plan runs |
| Saved phase specs | `.claude/plans/<name>.spec-<phase>-<k>.md`: a design-only session's finished implementer specs, listed in the next session's phase brief, deleted in the commit that lands them |
| Shared workflow (synced with the owner's other projects) | master repo `C:/Users/Traff/Desktop/sebas/claude-workflow` (`files/` mirrors the project root, `sync.py status\|push\|pull <project>`) |
| Plan runner logs | `.claude/autoplan/<plan>/<timestamp>/` (gitignored): one stream-json `.jsonl` per headless session |
| Eldritch lore (tiers 1–3, old ones, why they dress, where clothes come from) | `.claude/lore/eldritch.md`; art rules `.claude/rules/art-style.md` "Eldritch"; plan `.claude/plans/genesis-eldritch.md`; new beats after `womb` `.claude/plans/genesis-eldritch-beats.md` |
| Cutscene review | `py -3 tools/gframes.py <run> [beats]` (frame sheets per beat); `py -3 tools/jscheck.py <files> --eval "<js>" --shot out.png` (headless load + draw check; there is no node) |
| Reduced motion | `Util.reduced()`; read in `bridge.js` top, `genesis-state.js`, `intro.js`, `lazy-video.js`; global collapse in `css/style.css` |
| Levels, ranks, rank card | `js/site/xp.js` `RANKS`/`rankOf`/`ceremony`/`onRankUp`; burst and card `js/site/surge.js`; styles `css/beacon.css`; freeze listener `bridge.js` (`xp:freeze`); future boons: Roadmap at the end of this file |
| Dev URL params | `?reset=1` in `xp.js`; `?genesis=1`, `?gbeat=<name>` and `?gscene=<id>` in `genesis-state.js` |
| Case-page toys (lamps, shadow walker, records, the range) | `js/pages/<page>.js` |

- Environment model / place readings: one entry per place in `js/bridge/bridge-sites.js` (`SITES`, `GD_SITES`, gated by the depth node in `gate`); alarms in `js/hud/instruments.js` `tickAlarms`/`arbitrate`; the four Game Dev sites' physics and their `lines()` live in `bridge-sites.js` `GD_SITES`
- Cutscene: cast painters `genesis-figures.js` + `genesis-titans.js`, the five gods `genesis-gods.js`, Obrokxus's later forms `genesis-obrok.js`; the old ones `genesis-oldones.js`;
- Cutscene: the birth waves `genesis-elements.js` (wave one + permanent residue), `genesis-matter.js` (matter, insects, storms), `genesis-trade.js` (the travelling stream); the Primordisentia `genesis-flesh.js`; the mainland/spires/city `genesis-mainland.js`;
- Cutscene: the war `genesis-armies.js`, the war's figures `genesis-hosts.js`; the warlock births and the Hound's ritual `genesis-ritual.js`; the depths `genesis-depths.js`; captions `genesis-state.js` `BEATS`;
- Cutscene: zoom/captions `genesis.js` + `css/bridge.css` genesis block
- Plan phase state (one phase per session): first line `Status: phase-done\|partial\|questions\|blocked\|plan-done` (read by `tools/autoplan.py` and `session-start.py`); `## Questions` holds deferred phase questions, answered with `go` in the app; format in `.claude/skills/plan/SKILL.md`;
- Plan phase state (one phase per session): headless sessions follow `.claude/skills/plan/unattended.md`
- Shared workflow (synced with the owner's other projects): synced paths and hashes in `.claude/workflow.lock`; the shared rules are `.claude/rules/workflow.md`; `session-start.py` `workflow_sync_lines` prints `WORKFLOW SYNC:` on drift;
- Shared workflow (synced with the owner's other projects): the project's half (never synced) is `.claude/project/`: `modes/<mode>.md` (printed after the shared mode file), `playbook.md`, `implementer.md`, `reviewer.md`,
- Shared workflow (synced with the owner's other projects): optional `settings.json` (merged into `.claude/settings.json` by `sync.py push`) and `file-guard.json`, plus `tools/try_project.py`; hooks: `git-guard.py`, `file-guard.py`, `context-watch.py`, `stop-guard.py`, `session-start.py`
- Case-page toys (lamps, shadow walker, records, the range): shared layer `js/pages/play.js`, styles `css/play.css`; desktop only (≥ 900 px);
- Case-page toys (lamps, shadow walker, records, the range): give no XP (`Play.award` is a no-op). Conclusus: a document-space toy (`doc: true`, page-coordinate `.play-tiles`), beats unlock in order (twin → 3 keys by click into a tray → door → win)
- Conclusus toy: progress survives relayout, cached glow sprites in `play.js`

### Storage keys

All keys are in `js/lib/util.js` `Util.KEYS`: PROFILE `arcanis.profile.v1`
(xp.js; `{name, ref, level, claimed, seen, readOrder}`, `readOrder` = beacon ids in read order, absent on old profiles), HINTS `arcanis.hints.v2` (bridge-notes.js), VIEW `arcanis.view.v1`
session (bridge-panel/entry), SECTOR `arcanis.sector.v1` (bridge-panel/entry),
GEAR_SEEN (bridge-panel.js), SW_CLEANUP (index.html head), HUD_WING `arcanis.hudwing.v1` (hud-c25.js; wing scale 1 / 1.25 / 1.5 / 1.75).
`?reset=1` wipes every key with the PREFIX.

## Future work briefs

Ready-to-paste starting prompts for work not begun yet, in `.claude/briefs/`.

- `lite-mode.md`: automatic lite mode for visitors whose browser draws on the CPU.

## Roadmap: rank boons (not built yet)

Ranks are every 10 levels (`xp.js` `RANK_STEP`, names in `RANKS`). The
site gives about 52 levels today (41 beacons at 1 each, 2 path awards, 9
from the project pages) against `TOTAL = 100`, so the highest reachable
rank is Starwright (level 50). Plan: each rank unlocks a ship or HUD
system, announced on the rank card.

- Lamplighter (10): radar range up; beacons show on the radar tile from
  further away.
- Wayfinder (20): labels for unvisited beacons (the minimap is gone; the C25 span line ticks them).
- Voidrunner (30): ship cruise speed up (`voidship.js` `BASE`).
- Beaconwarden (40): signal tile resolves one more site line; hull
  regenerates faster.
- Starwright (50): fuel tank larger, burn boost stronger.
- Higher ranks, once the site has the levels: Farseer sees gated depth
  nodes before they are revealed; Arcanist (max rank) can teleport to any
  claimed beacon.

Rules when building it: a boon reads `XP.rankOf(XP.level).index` at call
time (never cache it at load), lives with the system it changes, and the
rank card gains one line naming the boon. Readings stay visual first (see
Instrument readings). Raise `TOTAL` when new levels are added.
