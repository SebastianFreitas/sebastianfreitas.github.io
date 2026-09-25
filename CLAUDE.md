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

The repo was split on 2026-09-23 so that no JS file is over 620 lines and
most are under 300. Whole-file reads are still the main cost. These rules
apply to the main session, Explore and the implementer alike.

- **Never read a whole file over 300 lines.** Files still over 500 lines:
  `css/bridge.css` (726), `js/hud/instruments.js` (652),
  `js/hud/tiles-nav.js` (641), `js/bridge/bridge-sites.js` (525),
  `js/genesis/genesis.js` (642),
  `js/gamedev/storm.js` (585),
  `js/genesis/genesis-matter.js` (620), `js/genesis/genesis-gods.js` (516),
  `js/ship/voidship.js` (553), `js/gamedev/forge.js` (549),
  `js/gamedev/zones.js` (509), `js/genesis/genesis-rex.js` (511),
  `js/genesis/genesis-oldones.js` (555), `js/pages/voidscape.js` (849),
  `js/pages/sector-zero.js` (575), `js/pages/conclusus.js` (539),
  `tools/snap.py` (531), `tools/nav-flows.test.py` (890). Use the File map
  below to pick the file and function, then `Grep -n` for the name and
  `Read` with `offset`/`limit` around the hit. Function names do not drift;
  line numbers do.
- **Never open** `cv.pdf`, anything under `media/`, `Temporary VoidScape
  Media/`, `snapshots/` or `__pycache__/`. They are binaries and staging
  assets. `Glob` or `ls` them if you need names; never `cat`, `Read` or `wc`
  them.
- **Do not re-survey the repo.** The file map, load order, storage keys and
  test flows are already below. Only re-derive them if a grep proves the map
  wrong, and then fix the map here.
- **Explore prompts must be narrow:** name the file, the function or the
  concept, and ask for `file:line` anchors and a summary, not code bodies.
- **Specs carry their own anchors.** The implementer has `omitClaudeMd: true`
  and never sees this file. Put the target file paths and function names in
  the spec so it can jump straight there.
- **One file per implementer call** unless the change genuinely spans files.
- **Test only the flows you touched.** `py -3 tools/nav-flows.test.py
  <flow>`; the full suite is 20 flows and only needed before a commit that
  touches navigation, the gate or storage. Three checks fail on `main`
  before this refactor and still do (`gate-exits` / `worklink` "lands on
  Work": the scroll lands 72 px above the section); they are not a
  regression signal. The case pages' toys are covered by `links`, `header`,
  `shell`, `worklink` and `twotabs`; `py -3 tools/snap.py capture <name>`
  fails a `page-*` scene on any console error, which is the toys' error check
  (its clock is frozen, so only the first synchronous frame paints).
- **Screenshot regression is mandatory for any change that paints or
  styles.** `py -3 tools/snap.py capture <name>` (about 3.5 min, 50 scenes)
  then `py -3 tools/snap.py compare <before> <after>`. Capture once before
  touching code, once after; the compare must be `same` on every scene you
  did not intend to change. Capture folders live under `snapshots/`
  (gitignored).
- Bump every `?v=` at once with `py -3 tools/bump.py` before a commit that
  changes any script or stylesheet; never edit the numbers by hand.

## Layout

No framework, no bundler, no npm. GitHub Pages user site, so the pages and
site assets stay at the root; everything else lives in a folder.

```
index.html 404.html projects/ media/ cv.pdf robots.txt sitemap.xml .nojekyll
serve.py serve.bat            local no-cache server on 8765
css/                          style, gate, beacon, bridge, play
js/lib/                       util, paint, pacer
js/site/                      xp, entry, intro, surge, embed, lazy-video
js/hud/                       instruments, tiles-nav, tiles-sys
js/bridge/                    bridge core + 8 parts, bridge-sites, bridge-voice, bridge-log, marks, lamp, planet
js/depths/                    depths core + zero, voidscape, heavylight, conclusus, lore
js/ship/                      voidship, voidship-art, voidship-prow
js/gamedev/                   storm, forge, forge-guns, forge-missions, zones
js/gdworld/                   gdworld core + gd-zero, gd-voidscape, gd-heavylight, gd-conclusus (the Game Dev sector's world)
js/world/                     world core + 8 painters; art/ = one file per place + rex-kit, land-kit
js/genesis/                   genesis-state, -paint, -void, -flesh, -elements, -matter, -trade, -oldones, -oldkin, -figures, -titans, -obrok, -hosts, -mainland, -armies, -orb, -rex, -depths, -saga-state, -ritual, -saga, genesis
js/pages/                     play (the case-page canvas layer) + one toy per case page: heavylight, conclusus, sector-zero (+ -records), voidscape (+ -boons)
tools/                        nav-flows.test.py, snap.py, bump.py, gframes.py, jscheck.py, try.py
```

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

Sizes are line counts after the split.

### js/lib

| File | Lines | Purpose | Publishes |
|---|---|---|---|
| `util.js` | 67 | Shared maths (`clamp mix smooth approach easeOut wrapPi mulberry hash1 vnoise ridge fmt`), `reduced()`/`coarse()` media queries, storage `KEYS` + `read`/`write`/`remove` | `window.Util`. Loaded first on every page |
| `paint.js` | 82 | Flat-art primitives (`poly line rect circle lin rad litShade offsetShade merlons fillRidge`) | `window.Paint` |
| `pacer.js` | 163 | rAF scheduler: paints on refresh boundaries, parks to a 10 fps timer at rest, wakes on input | `window.Pacer {create}` |

### js/site

| File | Lines | Purpose | Publishes / uses |
|---|---|---|---|
| `xp.js` | 426 | Site-wide progression, level chip (badge + 10 pips toward the next rank), `RANKS` (shape + name, one per 10 levels, `rankOf`), claim ceremony (never freezes the world; claims queue), cross-tab sync, `?reset=1` | `window.XP {award, has, total, rankOf, rankStep, ranks, mount, reset, …}`; fires `xp:surge` per level, `xp:rankup` once per rank crossed |
| `entry.js` | 48 | Head-time gate decision: `restore` / `deeplink` / `returning` / `first` | `window.SiteEntry {kind, sector, view}` |
| `intro.js` | 206 | Entry gate UI: boot log, the two paths, exits. Must load last: dispatches `site:preload` synchronously | uses `SiteEntry`, `XP` |
| `surge.js` | 289 | Level burst at the chip (rings, seeded sparks, label, edge glow; grows with the pip count) on `xp:surge`; the rank card on `xp:rankup` (the only thing that sends `xp:freeze`, dismissed by click/key or after 3.8 s) | `window.Surge {play, rankUp}` |
| `embed.js` | 30 | Click-to-load itch.io iframes | `window.Embed {reset}` |
| `lazy-video.js` | 137 | Swaps in `media/**/sd/` encodes on slow connections | none |

### js/hud

| File | Lines | Purpose | Publishes / uses |
|---|---|---|---|
| `instruments.js` | 652 | HUD framework: banks/layout (`CELL_W`/`gridW`), `mount`/`mountSys`, `blitStatic`, `draw`, alarms `tickAlarms` (env rules: signal chaos/nomic, radar glare, hull wear, bus sway, rec gAnom, `contained` scales nomic/sway) → `arbitrate` (`lit` map: every error tile lights at once, one warning at a time, 22s quiet only when no error is lit) → `alarmOverlay` (blinks 1.1 Hz err / 0.5 Hz warn), `alert`; SYS bank honours `paintStatic`; the `F` kit gained `meter`/`lvCol`/`blink`; `registerTiles` (merges every registration into one `tiles` object) | `window.Instruments {mount, mountSys, draw, setScale, setCompact, focus, focusSys, impact, setRepair, alert, registerTiles, …}` |
| `tiles-nav.js` | 641 | The nav bank: every tile has a static layer (`radarStatic`/`signalStatic`/`driveStatic`/`navStatic`); `radar` wash + blip smear from `glare`, a second contact (our echo) from `env.twin`, glow bitmaps cached per colour; `signal` is the environment tile — site name + tag header, coherent comb lines, meters CHAOS (`max(r.chaos, env.chaos)`)/UNFORMED/NOMIC; `drive` (key `phase`) tank spans the tile height (`driveGeom`); `nav` (key `rec`) right column `X`/`G`/`ρ`; `VOICES` gained `zero`/`voidscape`/`heavylight`/`conclusus` | registers `{paint, paintStatic}` |
| `tiles-sys.js` | 495 | The sys bank and its shared state: `tickSys` couples `o2`/`co2`/`kpa`/`dose`/`mag`/`hullT`/`hx` to `env` (`wear jitter rad sway heat frozen`), keeps `sys.hullInt` (integrity, cosmetic) and `sys.wear`; `eclss` rows are bars with nominal bands; `hull` has a STRESS/REGEN header, sector stress flicker, an INT bar and WEAR ×n; `bus` sags with `sway`, shows UPLINK on `link`; static layers `eclssStatic`/`radStatic`/`hullStatic`/`busStatic` | registers `{paintSys, tickSys, impact, setRepair, sys, repairState}` |

### js/bridge

Load order is the table order; nine bridge files share `B`. `bridge-sites.js`
does not — it is pure data, no dependency on `B`.

| File | Lines | Purpose | Publishes on `B` / `window` |
|---|---|---|---|
| `bridge.js` | 305 | Core: `host`/`cv`/`ctx`, map consts (`SLOT LAND BOUNDS CAM VOID_MIN VOID_MAX HIT`), canvas `resize`, phone/portrait queries + `syncPhone`, gate deferral `readyBridge`/`startLoop`/`repaintUnderGate` + `site:preload`/`site:enter`, state, scene-mode consts (`ZERO_MARK VS_MARK HL_MARK CONC_MARK XSTAGE`), `B.ship = Voidship.create`, `xp:freeze`, cursor, sheet, projection `viewUnitsNow`/`scale`/`wx`/`onScreen`/`flyK`/`markScreen`, `begin` | `window.Bridge`; `B.resize syncPhone startLoop activeMarks viewUnitsNow scale wx onScreen flyK markScreen begin` |
| `bridge-notes.js` | 157 | Notes: `hostBox`, `showNote`, `measureNote`, `placeNote`, `selectMark`, `clearMark`; hints `HINT_STEPS`/`hintDone` | `B.hostBox showNote measureNote placeNote selectMark clearMark hintDone noteEls` |
| `bridge-input.js` | 244 | Pointer/burn input: `markAt`, `clientToCourse`, `courseForMark`, `beginBurn`, `endBurn`, `retargetFromPointer`, listeners, IntersectionObserver, `onPortrait`; minimap `rebuildTrack`/`syncLabels` | `B.markAt clientToCourse courseForMark stopSteering beginBurn endBurn retargetFromPointer rebuildTrack syncLabels` |
| `bridge-marks.js` | 176 | `drawCue`/`drawCueLine`/`drawMarks`, `marksSettled`; sector glue `stormEnv`/`drawStorm`, `forgeEnv`/`drawForge`, `zonesEnv`/`drawZones`; debug `beaconReport stormReport forgeReport zonesReport` | `B.drawMarks drawStorm drawForge drawZones marksSettled` |
| `bridge-panel.js` | 352 | `B.log = BridgeLog.create`, the Instruments scale block (`__bridgeRefit`): `deskDefault()` gives wide, tall desktops (≥1800 px wide, ≥800 tall) banks at 1.2×, ramping from 1 at 1200 px, stored `INST_SCALE` still wins; setting panel: `applySceneMode`, `applyPendingMode`/`applyPendingView`, `saveView`, `beginModeSwitch`, mode/genesis/gear buttons, `site:genesis-start`/`-done`, `stepSwitch`, `drawIris`, `drawSwitchFX` | `B.applySceneMode applyPendingMode applyPendingView saveView beginModeSwitch stepSwitch drawSwitchFX`; `window.__bridgeRefit` |
| `bridge-depths.js` | 99 | `spawnDepth`, `revealDepths` (runs once at load, again on `pageshow`/`storage`); debug `depthsReport`, `depthsReveal`, `depthAlpha` (read by `js/world`) | `B.spawnDepth revealDepths`; `window.depthAlpha` |
| `bridge-env.js` | 106 | The environment model: `B.env = {chaos, future, nomic, wear, jitter, sway, glare, rad, heat, contained, link, frozen, echo, g, rho, twin, gAnom, tag, site, siteName, w, n1, n2, n3, t}`; `B.stepEnv(dt)` blends the world curves (`chaosAt`/`futureAt`) with every site whose gate node is revealed (`window.depthAlpha`) by distance weight, then eases; a site's `osc` may be one object or an array, each `{field, period, lo, hi, shape: "sine" | "square" | "pulse", duty?, phase?}`; debug `window.envReport` | `B.env stepEnv`; `window.envReport` |
| `bridge-readout.js` | 211 | `B.voice = BridgeVoice.create` (voice state carries `env`), hull `takeDamage`/`runRepair`, `idleLine`, `checkRegion`, census `reportFiled`, `updateHUD`, `drawInstruments` (calls `B.stepEnv(dt)`, passes `env` to `Instruments.draw`); `VOICE_OF` maps the marks to voices; in gamedev the dominant site's id is the voice | `B.takeDamage runRepair checkRegion reportFiled updateHUD drawInstruments` |
| `bridge-loop.js` | 168 | Movement `step`, `atRest`, `B.pacer = Pacer.create`, `render`, `paintOnce`, tail `syncPhone()` + topbar observer; debug `pacingReport shipReport` | `B.step atRest render paintOnce` |
| `bridge-sites.js` | 525 | The places that bend the instruments: `SITES` (void setting, 18 entries, order matters — later entries override earlier ones) and `GD_SITES` (one per game, `r` 33000 so neighbours meet halfway, `tags` rotating and an `osc` list per game), each `{id, name, gate, x, r \| ramp, f:{fields}, tag, osc?, tags?}`; `lines(S, h)` returns one readout zone per site (same shape as `bridge-voice.js` `ZONES`) | `window.BridgeSites {SITES, GD_SITES, lines}` |
| `bridge-voice.js` | 382 | What the readout says per region (`ZONES`, merges in `BridgeSites.lines()` as `site:<id>`), warn/err/crit odds; `zoneAt` returns the dominant site (`env.w >= 0.5`) before the x-range checks; extra optics/coherent lines in the void, watcher, root and unnamed zones | `window.BridgeVoice {create(S)}` |
| `bridge-log.js` | 68 | The typed-out readout queue | `window.BridgeLog {create(el)}` → `{push, run, setMax, idle}` |
| `marks.js` | 78 | Landmark roster: `MARKS` (Void beacons), `PLANETS` (Game Dev), `GD_LAND`/`GD_BOUNDS`/`GD_SPAWN` | `window.Marks`; uses `World` |
| `lamp.js` | 109 | Canvas beacon draw + `HIT` radius (named lamp because adblockers drop "beacon") | `window.Beacon {draw, HIT}` |
| `planet.js` | 136 | Placeholder worlds for the Game Dev sector, `THEMES` per game | `window.Planet {draw}` |

### js/depths

| File | Lines | Purpose |
|---|---|---|
| `depths.js` | 201 | Core: `CLUSTERS` registry, `add`, `waveOf`, `LAYOUTS` (`rows arc chain branch`), `nodes()` | `window.Depths {nodes, clusters, add}` |
| `zero.js` `voidscape.js` `heavylight.js` `conclusus.js` | 199 / 216 / 164 / 166 | One planet cluster each (10 nodes, `arc` layout), ids `bnote-sz-* bnote-vs-* bnote-hl-* bnote-cc-*`; registered with `Depths.add` in load order = cluster order |
| `lore.js` | 318 | The four lore-beacon clusters in order: `bnote-rex` (10), `bnote-watcher` (2), `bnote-void` (3, `bnote-bridge-*`), `bnote-land` (5); mostly pinned with `at:` |

### js/ship

| File | Lines | Purpose | Publishes |
|---|---|---|---|
| `voidship.js` | 553 | `BASE` tunables, `create`, `setThrusting` (release rule), `step` (hold boost → wanted velocities → yaw → `ease` → arrival → fuel → pitch → fumes), `settled`, `stats`, `draw` | `window.Voidship {BASE, create, resize, setPower, setCourse, setThrusting, clearCourse, step, draw, screenPos, touching, touchingMark, stats, canBurn, addFuel, settled}` |
| `voidship-art.js` | 331 | `block` + polygon helpers `tracePts fillPoly vol seg box`, palette (`LIT MID SHADE DEEP EDGE ORANGE ORANGE_D LAMP COLD RED WHITE DRIVE_*`), geometry tables (`W_FAR ENGINE HULL BELLY OPANEL W_NEAR OWING POD BRIDGE T1 T2`, `FV_*` for head-on), `drawHull` (far wing, engine block, wedge fuselage with ember conduit, near wing, belly pod, bridge block + mast, deck turrets, then the shard, drive glow, sustainers, RCS, bow chevrons), `drawFront`, `drawFumes`, `drawWake`, `EMIT SUST JETS TRAIL_SEATS`; local frame +x nose, +y down, units of hull length L; the shard is delegated to `voidship-prow.js` (`drawProwBack` first, `drawProw` after the turrets, `drawProwFront` at the end of `drawFront`) | `window.VoidshipArt` |
| `voidship-prow.js` | 111 | The shard: a broken-off chunk of the giant energy-giving metal Libertech built the ship around, doubling as ram and power core. Flat facets: slab faces `SLAB_TOP SLAB_SIDE SLAB_BOTTOM`, fracture facets `FR1 FR2 FR3` converging on the ram tip, notches, `CRACKS`, ember cracks `EMBER_PTS EMBER_LOW EMBER_TAP` (alpha = `emberOf(ship, t)`: pulse + strain, fixed pulse under `Util.reduced()`), the hull's jaws `JAW_T JAW_B` painted over the slab; `drawProwBack` is the red glow behind it; head-on `FV_*`. Palette `RUST_* EMBER` | extends `window.VoidshipArt {drawProwBack, drawProw, drawProwFront, emberOf, PROW}` |

### js/gamedev

| File | Lines | Purpose | Publishes |
|---|---|---|---|
| `storm.js` | 585 | Sector Zero storm: `COMPS`/`HOLD`/`STORM`, `layout`, `ROSTER`, `PAINTERS`, cycle `startStorm`/`gust`/`snapHome`, `stepFlicker`, ghost `LINES`/`stepLines`, `step`, `draw`, `report` | `window.Storm {step, draw, lively, report}`; fed by `bridge-marks.js` `stormEnv` |
| `forge-guns.js` | 137 | The one seeded `rnd`/`rint`/`pick`, `MAX_MODS`/`MAX_PATH_MODS`/`MAX_EMPOWER`, weapon tables, `rollMod`, `makeGun`, `randomGun`, `stats` | `window.ForgeGuns` |
| `forge-missions.js` | 169 | `RUN_MODS`, `rollRunMod`, `regood`, `makeMission`, floor plan `genPlan` | `window.ForgeMissions`; uses `ForgeGuns` |
| `forge.js` | 549 | Bench and console state, `tile`, `drawBench`, `cellColor`/`drawPlanArea`, `drawConsole`, `step`, `draw`, `hit`, `over`, `lively`, `report`, `unlock` | `window.Forge`; fed by `bridge-marks.js` `forgeEnv`, hit-tested in `bridge-input.js` pointerdown |
| `zones.js` | 509 | Backdrop art around Conclusus / HeavyLight / VoidScape: sprite pipeline `CPAL`/`CSPR`/`HPAL`/`HSPR` → `spriteCanvas` → `blitSprite`, `HL_GROUPS`, `LANTERN`, `BEAM`, `dropCrate`/`stepCrates` | `window.Zones {step, draw, report}`; fed by `bridge-marks.js` `zonesEnv` |

### js/gdworld

The Game Dev sector's world: four backgrounds, one per game, that meld by
distance. Each game's field is centred on its planet (`Marks.PLANETS[i].x`),
full within 17 100 units, half at about 27 500 and empty at `R` = 38 000, so
the screen empties between planets before the next game's outriders appear.
Sizes are "px at a 1440-wide hero" × `F.k`; layers are painted far → near
across all four games at once; `wash`/`grade` are screen-space and weighted
by the game's weight at the camera. Nothing here reads `Bridge`.

| File | Lines | Purpose | Publishes |
|---|---|---|---|
| `gdworld.js` | 140 | Core: `GAMES`, `R`, `GROUND` (0.64, the old deck line), `dens(i, x)`, the frame `F`, `sx(x, par)`, seeded `scatter(seed, i, n, par, fy0, fy1)`, `each(list, pad, fn)`, the sector dust, `draw` (sky blend of the games' `base` colours → dust → washes → every layer by `par` → grades) | `window.GdWorld` |
| `gd-zero.js` | 423 | Sector Zero, "the room, unpicked": wall panels with door frames, blinds and baseboards, fluorescent tubes on wires (on / flicker / off), ceiling tiles and floorboards (`band`, fading with `dens`), filing cabinets, office chairs adrift, clocks running ahead, EXIT signs, security cameras; papers and cables nearest; grade = scanlines, grain, green tint | `GdWorld.P.zero` |
| `gd-voidscape.js` | 365 | VoidScape, "the run, only up": concrete corridor `module`s tilted and chained by stairs, mouths lit white (unvisited) or red (done), pipes with valve wheels, rotating beacons, triangle portals, dice, canisters, medkits; red cloud banks and the ground's heat; grade = red vignette | `GdWorld.P.voidscape` |
| `gd-heavylight.js` | 280 | HeavyLight, "stone stairs and hard light": stepped floor and ceiling masses at three depths (`mass`, quantised `ridge`, amplitude × `dens`, a clearing round the planet in the near layer), dot pattern that scrolls with each layer, rooms, timed lamps on a 7.2 s cycle with slabs of solid light, speckle, wisps (one in five red) | `GdWorld.P.heavylight` |
| `gd-conclusus.js` | 222 | Conclusus, "other selves": faint giant silhouettes switching green / silver every 1.2 s, pin rows, columns and rings, spinning pieces, dotted jump arcs from a planted shadow, star sparkles drawn twice (the echo), the symbol in three orbiting wedges; grade = rain | `GdWorld.P.conclusus` |

### js/world

| File | Lines | Purpose |
|---|---|---|
| `world.js` | 283 | Core: `VIEW_UNITS`, `SLOT`, `LAND`, `BOUNDS`, `DECK`, `FLOOR`, `BAY`, `chaosAt`, `futureAt`, seeded `city` and particle arrays, Rex consts `REX_BANDS`/`REX_FROM`/`REX_END`/`HELL_AT`/`rexHeight`/`REX_PLACES`, `rexSprite` cache, `depthAlpha`/`setA`/`faded`, `MAIN_PAR` + faction anchors, `F`, `P`, `scale`/`wx`/`onScreen`, `draw` (paint order lives here; a gamedev frame is handed to `GdWorld.draw`) | `window.World {SLOT, LAND, BOUNDS, DECK, VIEW_UNITS, chaosAt, futureAt, draw, F, P, …}` |
| `void.js` | 193 | `drawVoid`, `drawChaos`, `drawTendrils`, `drawPresences`, `drawFragments` (`FRAGMENTS`), `drawFuture` |
| `watcher.js` | 220 | `WATCHER_SHARDS`/`WATCHER_CRACKS`, `drawWatcher` (calls `P.serusPhase`/`P.drawSerus`), `RED_STAR`, `drawRedStar` |
| `serus.js` | 154 | `serusPhase`, `drawSerus` (the alien coiled in the Watcher) |
| `nephilim.js` | 194 | `NEPHILIM` anchor, `nephRng`, `NEPH_*`, `nephWalk`, `nephRibbon`, `flatVolume`, `drawNephilim` |
| `admin-tear.js` | 75 | `ADMIN_TEAR`, `TEAR_JAG`, `drawAdminTear` |
| `vikings.js` | 47 | `VIKINGS`, `VIKING_STARS`/`LINES`/`MAG`, `drawVikings` |
| `rex.js` | 166 | `fillRidge` wrapper, `drawRex`, `drawHell`, `rexInterior`, `drawRexPlaces` (reads `window.RexArt`) |
| `city.js` | 169 | `drawBand`, `drawCityNear`, `drawLandPlace` (reads `window.LandArt`), `drawRoot`, `drawBridge` |

### js/world/art

Each place file is `const RexArt = window.RexArt = window.RexArt || {}` (or
`LandArt`) plus one section and one `RexArt.<key> = {box, paint, live, …}`.
Shape: Rex entries `{box, paint, live}` (`firstlight` also `under`); Land
entries `{box, top, paint, live}`. `+y` is UP in the land painters.

| File | Lines | Key | Notes |
|---|---|---|---|
| `rex-kit.js` | 76 | `window.RexKit {archWin, lancet, cutFoot, pocket, trace, spill, lip}` | loads first |
| `firstlight.js` `crimson.js` `bonespire.js` | 218 / 275 / 128 | `RexArt.firstlight / .crimson / .bonespire` | surface; Bone Spire is the style reference |
| `titans.js` `valkhar.js` `law.js` | 226 / 198 / 206 | `RexArt.titans / .valkhar / .law` | caverns; Titans is the style reference; `*_POCKET` call `pocket()` at parse time |
| `land-kit.js` | 36 | `window.LandKit {band, arch, litRect}` | loads before the factions |
| `shattered.js` `libertech.js` `dawn.js` `accord.js` `gore.js` | 100 / 132 / 135 / 96 / 171 | `LandArt.shattered / .libertech / .dawn / .accord / .gore` | |

### js/genesis

All share `window.Gen` (`G`). Values that change per frame are read as
`G.x` at call time; constants, arrays and helpers are destructured once.

| File | Lines | Purpose | Publishes |
|---|---|---|---|
| `genesis-state.js` | 336 | `BEATS` (29 beats, Roman-numeral tags, biblical lines), world constants, state (`cam`, `zoom`, `zoomKick`, trails, rings, `sparks`), O(1) `idxOf`, `since/linear/only/sx/beatDur`, `G.BEAT_START` + `G.secs(id)` (seconds since a beat began, negative before it), dev params `?genesis=1` / `?gbeat=<name>`; `G.GOD_H` (0.11) is the gods' height as a fraction of the screen | `window.Gen` |
| `genesis-paint.js` | 136 | flat-art helpers `flatGlow flatSphere mixHex fillRidge gridXs rexLandHeight mainHeight mainDome eastJag mainSurfY standY` | `window.GenPaint` |
| `genesis-void.js` | 287 | `fillBg`, `drawMotes`, `drawChaos` (the far realms: parallax dark blobs + far lights), `drawPoint` (pressure rings, mind specks, cracks), `drawSpan` (the monumental bridge: slab, piers, arches, gold rail) | `window.GenVoid` |
| `genesis-flesh.js` | 259 | the Primordisentia: `fleshGeom fleshPath drawFlesh` (lobes, veins, eyes, mouths), `drawPatches` (the old ones' colours), `drawSouls`, `drawCry`, `drawSeal` (the gold womb) | `window.GenFlesh` |
| `genesis-elements.js` | 400 | wave one after the break: dust, air, wind, sound, colour (oil/water flips), light; 460 particles, three forms each, rage events and slosh; `drawResidue` = the permanent void traces (dust, wind streaks, colour stains, lights, sound rings) drawn every frame after the far realms | `window.GenElem {draw, drawResidue, rage}` |
| `genesis-matter.js` | 620 | wave two: 100 flesh/stone/meld chunks (float, fall, break, meld pairs) that fly briefly then gather into one mass (`MASS`, slot per chunk, `gatherK`) resting on the span; through trade it opens where an old one climbs out (`GenOld.activeVents`) and crumbles from the outside in (`massScale`); 150 insects hatching (deformed, most die; storm deaths), 7 lawless storms (air, rain, fire, lightning) | `window.GenMatter {draw, chunkAt, MASS, massScale}` |
| `genesis-trade.js` | 139 | only the travelling stream now: `drawStream` = 200 travellers flowing east/west around the camera from late trade through walk | `window.GenTrade {drawStream}` |
| `genesis-oldones.js` | 503 | 24 old ones, no two alike: one each of the ten old kinds plus fourteen painted in genesis-oldkin.js, six locomotions (walk, slide, fly, blink, roll); humanoid/animal-like kinds go west (side -1), the strange ones east; they climb one by one out of the matter mass during the trade beat (`VENT_T0`, `ventOf`, `emergeK`, `activeVents`), `drawOldOnes` takes `env.emerge` and `env.layer` ("inside" = still climbing, drawn behind the stones): `ROSTER_SPECS ROSTER ORDER place drawOldOnes drawShards drawKind makeOne` | `window.GenOld` (also `PAINT litSplit eyeDot`) |
| `genesis-oldkin.js` | 362 | painters for the fourteen new old ones (tower pearl bundle needle slab bloom comb veil knot husk chime prism swarmling mound), registered into `GenOld.PAINT` | extends `window.GenOld` |
| `genesis-figures.js` | 317 | flat silhouette cast: `drawGod` (crowns: bars/rings/orbit/clock/petals/spikes), `drawWarlock` (returns the staff gem), `drawTroop`, `drawMortal` + shared `fillPoly shadedPoly quad withTilt`; `drawGod` dispatches to `GenFig.GOD_PAINT[o.kind]` when set (genesis-gods.js), the robed figure is the fallback | `window.GenFig` |
| `genesis-titans.js` | 241 | adds `drawTitan` (`"rex"`: stand/lunge/grapple/fall, `cool`; `"obrokxus"` = his first form, the blob: stand/lunge/climb/flee; `"centihorse"`/`"worm"` dispatch to genesis-obrok.js) and `drawHound` | extends `window.GenFig` |
| `genesis-obrok.js` | 250 | Obrokxus's later forms: `drawCentihorse` (the centipede horse from flee through fall, flying: the 18 legs row through the air like oars (extended on the backward power stroke, folded on the recovery, wave head to tail), stand/run/lunge, `o.air` spreads the stroke wide) and `drawWorm` (the floating worm at the end of fall and in eternity, `o.speed`); `obrokEye(kind, x, y, h, o)` = where each form's eye is, which every beam aims at | extends `window.GenFig` |
| `genesis-gods.js` | 516 | the five gods, one painter each, registered in `GenFig.GOD_PAINT` and picked by `drawGod` on `o.kind`: `ormius` (winged devil, serpent from the waist down, long horns), `ava` (white furred serpent, feathered wings, gold), `orochronus` (Serus, a black serpent dragon), `kaeron` (cloaked, faceless, long beard, staff), `kaelum` (a star whose colour is her mood: `o.mood` ok/happy/angry/sad, motes seeping out; she never strikes); `godHand(kind, x, yFoot, h, o, tx, ty)` = where each god's beam leaves it; kit `catmull`/`ribbon`/`vol` | extends `window.GenFig {GOD_PAINT, godHand}` |
| `genesis-hosts.js` | 387 | the war's figures, flat and lit from the left: `drawDevil` (the humanoid devil: horns, tail, hooves, trident; kept as the rare `"fiend"` form), `drawAbom` (bone and flesh, dispatches by `variant` mod length into the `ABOM` registry: 0 `drawBrute` / 1 `drawCrawler` / 2 `drawStalker`, more pushed by genesis-vorgath.js); all `(ctx, x, y, s, o)` with y the foot line, `o = {a, face, walk, pose, down, lunge, cast, ph, variant, form, fly}`; `HAND` = casting-hand offset | `window.GenHosts {ABOM, ABOM_PAL}` |
| `genesis-seraphin.js` | 427 | the angels as winged beasts of light, no halos: `o.form` `"bird"` (crane) / `"hound"` (sighthound) / `"stag"` (gold antlers), big feathered `wing()`s (far wing a V behind), `o.fly` = flight pose (body around `y - 0.55s`), cast glow at `HAND` | sets `GenHosts.drawAngel` |
| `genesis-malgrur.js` | 339 | the devils: `o.form` `"gaunt"` (tall, thin, crooked, two horns; most of them) / `"bat"` (membrane wings, always flies) / `"fiend"` (delegates to the old `drawDevil`, captured at parse time); cast flame at `HAND` | replaces `GenHosts.drawDevil` |
| `genesis-vorgath.js` | 179 | more vorgath forms pushed onto `GenHosts.ABOM`: `bloat` (swollen sack, eye cluster, maw), `whelp` (segmented crawler after Obrokxus's centipede form), `maw` (walking skull-jaw) | extends `GenHosts.ABOM` |
| `genesis-mainland.js` | 436 | mainland bands, the surface cache `surfY(px)`/`surfYAt(wu, rise, scar)` every figure stands on, rooted red spires (`SPIRES`, `spireGeom(k, S)`; spires near the nest shrink to stumps as `S.drain` pulls them into the Hound), the city (roofs, walls, windows, lamps), the nest pit; `cityGeom` — after the war (`S.modern`) a share of each band rises into skyscrapers one by one (glassier walls, setback crown, antenna with a red light), the rampart sinks | `window.GenMain` |
| `genesis-armies.js` | 349 | the war simulation: angels (`seraphin`) and devils (`malgrur`) against abominations of bone and flesh (`vorgath`); `step(dt, S)`, `draw(ctx, S)`, `reset()` (march, front tide, melee lunges and sparks, casters loosing `BOLTS` that land as `BURSTS`, deaths, corpses, reinforcements); each troop has a `form` and `alt` (flight height in sizes, 0 = grounded; set once in `host()` from `hash1`), `liftOf(T, s)` = bob, swoop in a fight, fall on death; fliers paint after the ground troops, their corpse waits out the fall (`hold`); bolts leave from and aim at the lifted height (`dy0`, `dy1`); seeded `rnd` (mulberry 9011), no Math.random; painters from `GenHosts` | `window.GenArmies` |
| `genesis-orb.js` | 281 | `drawRip lightsAt` (titan keyframe paths) `pushTrail drawTrail drawOrb drawRings drawBeam drawTintBeam yWob drawName` | extends `window.GenVoid` |
| `genesis-rex.js` | 511 | `chaseAt chaseFightAt ringFightAt`, the ending `escapeAt escapeDrift escapeCam escapeCamLead` (the worm gets away west, Ormius follows alone), `drawRexLand` (hot rock cooling to slate, fissures), `drawRexHole`, `drawRexGrip`, `drawBuried` (the eye in the ground), `drawGodsBirth` (five gods as figures) | `window.GenRex` |
| `genesis-depths.js` | 281 | `drawDepths`: rock, ribs, stalactites, the pocket, Obrokxus in Rex's grip, the five gods circling, 70 brothers (old-one kinds in red), the year counter | `window.GenDepths` |
| `genesis-saga-state.js` | 401 | `sagaAt`: every saga quantity for the frame (feet via `GenMain.surfYAt`, the warlock births `cMortal teach pact aelChild bless vTaint vHelp vForge`, the Hound's ritual `ritual drain hBorn`, Mordrial's fall/dark, Obrokxus's lash and sinking, his forms `oFrom oForm oMorph` (blob → centihorse in flee, centihorse → worm late in fall), `oHide` (buried on the mainland) and `oAir`, Eldrin, facing and walk flags, `fallBeat/etBeat`, `modern` (the city's rise to towers over return + early eternity)) | extends `window.GenSaga` |
| `genesis-ritual.js` | 371 | the warlock births and the Hound's ritual: `target(S)`, `drawUnder` (Cadmus's pact rift with Ormius's gold seal, Aelius as a child in Ava's light, Velindra tainted, then the drain: Obrokxus's brood (abominations, `BROOD`), souls, corrupted magic and spire shards pulled into the Hound), `drawOver` (teaching/pact/blessing/help beams, Velindra's blades, the four ritual beams, latched flashes) | `window.GenRitual` |
| `genesis-saga.js` | 359 | `drawSaga` (ground/city/nest via GenMain, armies via GenArmies, `GenRitual.drawUnder`/`drawOver`, the cast as figures, Obrokxus's two-form cross-fade clipped to the ground while `oHide`, beams from hands/gems, Mordrial's death, clashes), `drawLiveWorld`; `O_SCALE` sizes Obrokxus's forms 1 / ½ / ¼ (`hOf`), each drawn on the same body centre | extends `window.GenSaga` |
| `genesis.js` | 643 | DOM/overlay, caption crossfade, transport `play/skip/seek/finish`, `camAim` (+ per-beat `ZOOM` push/pull), `step` (zoom, sparks), the `draw` conductor (Act 1 wiring, the break flash, titans in the fight, the depths, the saga, the now-fade), the two waves (`GenElem`/`GenMatter`) and the stream, the old ones' two layers (inside the mass before `GenMatter.draw`, the rest after) and `march` timing, input | `window.Genesis` |

### js/pages

The case pages' play layer. Every file is an IIFE on one global; the toys
only ever read `V` from `Play` and never reach into the bridge.

| File | Lines | Purpose | Publishes |
|---|---|---|---|
| `play.js` | 233 | `Play.start(spec)` mounts one fixed canvas behind the page (`.play`, z -1, pointer-events none; input is read on `window`, only presses on `body`/`html`/`main.case` count, panels are `.play-ui`), builds the view `V` (`W H top sy t dt pointer rnd blocks vis band main gutter free blockAt cursor wake`; `blocks` = document-space rects of every child of `main.case` plus the footer, `vis` the visible ones in viewport space, `band` the free strip right of the text column), runs a `Pacer` loop, re-measures on load/resize; `sprite(pal, def, scale)` pixel-sprite cache (2x default), `blit`, `glow`, `award` (one XP point, once). Desktop only (`min-width: 900px`); a still frame under reduced motion | `window.Play` |
| `heavylight.js` | 326 | Viewport space: four wall lamps in the screen corners; click = on for 8 s (click again = off); each lights a wedge along its edge and carries whatever is inside it (six crates and the red investigator) round the screen, floor → right edge → ceiling → left edge; gravity and friction otherwise; sprites at 3x from the game's PNGs (`HPAL`) | `window.PlayHeavyLight {report}` |
| `conclusus.js` | 539 | Document space: up to 40 grass platforms beside the page blocks, each with a planted green twin; when the player's platform scrolls out he teleports (30-particle burst) into the twin nearest the screen centre and plants one where he stood; click a twin, a green silhouette (silver = the 1.2 s cycle's deadly half) or a pin; lit dashed line under the landed platform, spinning symbol, exit arch that blooms on the last platform, spike balls, rain motes; sprites 2x (`CPAL`) | `window.PlayConclusus {report}` |
| `sector-zero.js` | 575 | Viewport space: the room's objects float in the strip right of the text (terminal, chair, bucket, screwdriver, lantern, four crates, light switch; flat lit/shade boxes, scale 1.3); click = the record types out in a `.play-ui.record` card at 0.03 s/char; the thunder loop (lower of two d100, losers drift, one turns red and creeps to the pointer, spring home, 0.5 s blackout; stronger comes back sooner); lantern flicker layers, screwdriver charge/throw/return, chair spin, the switch dims the room | `window.PlayZero {report, thunder}` |
| `sector-zero-records.js` | 145 | The ten record files and mails (Brian, Amy, Laura, Jason, Obscura) | `window.ZeroRecords {RECORDS}` |
| `voidscape-boons.js` | 104 | 34 boons from the game's list `{id, w, name, desc, fx}`; `build(gun, boons)` → the effective build from a `ForgeGuns` gun, its mods and the boons; weighted `offer(pool, rnd)` | `window.RangeBoons` |
| `voidscape.js` | 849 | The range, viewport space: a gun mount bottom-left aims at the pointer, hold on empty page to fire a `ForgeGuns.randomGun()`; bullets ricochet off the screen edges only (page blocks are not walls), fire explodes on every bounce, cold chills/freezes, poison and bleed tick, headshots crit, damage pops; skulls hop, cones hover and shoot back, triangles lunge and self-destruct; enemies are pushed out of page blocks; every 6 kills one boon is offered (take / reroll x2 / refuse for 10 health) in `.play-ui.offer`, the build card is `.play-ui.range`; 0 health = run lost, new gun, boons gone; the range goes quiet 40 s after the last shot | `window.PlayRange {report}` |

### css, pages, tools

| File | Lines | Purpose |
|---|---|---|
| `css/style.css` | 441 | Base site: topbar, sections, project pages, small screens. Tokens, breakpoints and the z-index ladder are documented at the top |
| `css/gate.css` | 126 | The entry gate: boot log, then the two paths. index only |
| `css/bridge.css` | 744 | Everything hero/cockpit: HUD, notes, setting panel, boot terminal, genesis overlay, letterbox bars. index only |
| `css/beacon.css` | 205 | Level chip and pips, claim ceremony, surge burst, rank card |
| `css/play.css` | 43 | The case-page play layer: `.play` canvas (z -1, under the ladder), `.play-ui` panels (z 2) and `.play-hint`; all hidden under 900 px. Case pages only |
| `index.html` | 485 | Homepage. Inline head script is only the service-worker purge |
| `projects/*.html` | 110–253 | Four case-study pages, same shell |
| `404.html` | 54 | Not-found page (root-absolute `/css/…` and `/js/…` paths) |
| `tools/nav-flows.test.py` | 890 | Playwright flows; starts its own server on a free port; `ROOT` is the repo root |
| `tools/snap.py` | 531 | Screenshot regression: `capture`, `compare`, `list`; imports `start_server` from nav-flows; reads scene ids from `js/bridge/marks.js` and `js/genesis/genesis-state.js` |
| `tools/bump.py` | 36 | Sets every `?v=` across the HTML pages; works from any cwd |
| `tools/gframes.py` | 63 | Tiles genesis beat frames for review into `snapshots/frames/<run>/<beat>.png`; imports `tools/snap.py` |
| `tools/jscheck.py` | 49 | Loads JS files into a headless page in order and reports syntax/runtime errors; `--eval` runs against a 1440×900 canvas; imports `start_server` from nav-flows |
| `tools/try.py` | 194 | Preview or ship a cloud branch in the reusable worktree `../Portfolio-try`: `py -3 tools/try.py <branch> [--path /url] [--port N]` serves it on 8766+ and opens the browser (typing `ship` at its prompt ships); `--ship` merges it into `main` there, runs `bump.py`, pushes, deletes the branch, fast-forwards a clean main checkout; on a conflict pushes nothing. Never touches the main checkout's tree |
| `serve.py` / `serve.bat` | 67 | No-cache static server on 8765 (8000 avoided: stale SW) |

### Load order

`index.html` head: `css/style.css`, `css/gate.css`, `css/beacon.css`,
`css/bridge.css`, then `js/lib/util.js`, `js/site/xp.js`, `js/site/entry.js`
(blocking, on purpose), then the inline SW purge. Body tail, in this order:

`site/surge → bridge/lamp → bridge/planet → depths/depths → depths/{zero,
voidscape, heavylight, conclusus, lore} → hud/instruments → hud/tiles-nav →
hud/tiles-sys → lib/paint → world/art/rex-kit → world/art/{firstlight,
crimson, bonespire, titans, valkhar, law} → world/art/land-kit →
world/art/{shattered, libertech, dawn, accord, gore} → world/world →
world/{void, watcher, serus, nephilim, admin-tear, vikings, rex, city} →
ship/voidship-art → ship/voidship-prow → ship/voidship → gamedev/storm →
gamedev/forge-guns → gamedev/forge-missions → gamedev/forge → gamedev/zones →
site/embed → lib/pacer → bridge/marks → gdworld/{gdworld, gd-zero, gd-voidscape,
gd-heavylight, gd-conclusus} → bridge/bridge-sites → bridge/bridge-log →
bridge/bridge-voice → bridge/{bridge, bridge-notes, bridge-input,
bridge-marks, bridge-panel, bridge-depths, bridge-env, bridge-readout,
bridge-loop} → genesis/{genesis-state, genesis-paint, genesis-void,
genesis-flesh, genesis-elements, genesis-matter, genesis-trade,
genesis-oldones, genesis-oldkin, genesis-figures, genesis-titans, genesis-obrok, genesis-gods,
genesis-hosts, genesis-seraphin, genesis-malgrur, genesis-vorgath, genesis-mainland, genesis-armies, genesis-orb, genesis-rex, genesis-depths,
genesis-saga-state, genesis-ritual, genesis-saga, genesis} → site/intro`.

Nothing uses `defer`/`async`. `intro.js` must stay last: it dispatches
`site:preload` synchronously at top level. Order constraints inside a
folder: core before parts (`world.js`, `depths.js`, `bridge.js`,
`instruments.js`, kits before places, `forge-guns` before `forge-missions`
before `forge`, `voidship-art` before `voidship-prow` before `voidship`
(the prow extends `VoidshipArt` at parse time)); `gdworld` after
`bridge/marks` (it reads `Marks.PLANETS` at parse time) and its four
painters after it; `bridge-sites` before
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
`genesis-oldkin` right after `genesis-oldones` (registers into
`GenOld.PAINT` at parse time). Never bake `G.W`/`G.H` into data at load:
they are 0 until the cutscene sizes its canvas; store fractions and
multiply at draw time. `Util.clamp` has no default bounds: always pass
`0, 1`. Scripts carry `?v=N` cache-busters; bump them with
`py -3 tools/bump.py`.

Project pages load `css/style.css`, `css/beacon.css`, `css/play.css`, then
`js/lib/util.js → js/site/xp.js → js/site/surge.js`, `js/site/embed.js`
(conclusus, heavylight) and `js/site/lazy-video.js` (all four), then the play
layer `js/lib/pacer.js → js/pages/play.js → js/pages/<page>.js` (voidscape:
`js/gamedev/forge-guns.js` before `play.js` and `voidscape-boons.js` before
`voidscape.js`; sector-zero: `sector-zero-records.js` before
`sector-zero.js`), and the inline `XP.award(...)` last.

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
| Sector Zero storm | `js/gamedev/storm.js`; anchored by `bridge-marks.js` `stormEnv`; spawn camera `marks.js` `GD_SPAWN` |
| VoidScape bench / console / floor plan | `js/gamedev/forge.js` (+ `forge-guns.js`, `forge-missions.js`); anchored by `bridge-marks.js` `forgeEnv`; hit-tested in `bridge-input.js` pointerdown |
| Game-themed backdrops | `js/gamedev/zones.js`; anchored by `bridge-marks.js` `zonesEnv`; planet colours in `bridge/planet.js` `THEMES` |
| Game Dev background (the four melding worlds) | `js/gdworld/gdworld.js` core (`dens`, `scatter`, paint order); one painter per game `js/gdworld/gd-{zero,voidscape,heavylight,conclusus}.js`; wired from `js/world/world.js` `draw` |
| Landmarks / beacons | `js/bridge/marks.js` `MARKS`/`PLANETS`; gated extras `js/depths/*` |
| Depth node spawn / reveal / fly-in | `js/bridge/bridge-depths.js`; timing consts `FLY_*` in `bridge.js` |
| Notes and hints | `js/bridge/bridge-notes.js` |
| Setting switch (void ↔ gamedev), iris FX, view persistence | `js/bridge/bridge-panel.js` |
| Environment model / place readings | `js/bridge/bridge-env.js` (`B.env`, `B.stepEnv`); one entry per place in `js/bridge/bridge-sites.js` (`SITES`, `GD_SITES`, gated by the depth node in `gate`); alarms in `js/hud/instruments.js` `tickAlarms`/`arbitrate`; the four Game Dev sites' physics and their `lines()` live in `bridge-sites.js` `GD_SITES` |
| Readout text | `js/bridge/bridge-voice.js` `ZONES`; site lines in `js/bridge/bridge-sites.js` `lines()`; glue and hull damage in `bridge-readout.js` |
| HUD tiles | `js/hud/tiles-nav.js`, `js/hud/tiles-sys.js`; framework `instruments.js` |
| Main rAF loop | `js/lib/pacer.js` (`frame`), created in `bridge-loop.js` as `B.pacer`; other loops in `intro.js`, `surge.js`, `xp.js` |
| Storage keys | `js/lib/util.js` `KEYS` (never type a key literal) |
| Entry gate | decision `js/site/entry.js`, UI `js/site/intro.js`, CSS `css/gate.css` + `css/bridge.css` boot terminal, bridge defers in `bridge.js` `readyBridge` |
| Cutscene | `js/genesis/` (see table); cast painters `genesis-figures.js` + `genesis-titans.js`, the five gods `genesis-gods.js`, Obrokxus's later forms `genesis-obrok.js`; the old ones `genesis-oldones.js`; the birth waves `genesis-elements.js` (wave one + permanent residue), `genesis-matter.js` (matter, insects, storms), `genesis-trade.js` (the travelling stream); the Primordisentia `genesis-flesh.js`; the mainland/spires/city `genesis-mainland.js`; the war `genesis-armies.js`, the war's figures `genesis-hosts.js`; the warlock births and the Hound's ritual `genesis-ritual.js`; the depths `genesis-depths.js`; captions `genesis-state.js` `BEATS`; zoom/captions/letterbox `genesis.js` + `css/bridge.css` genesis block |
| Cutscene review | `py -3 tools/gframes.py <run> [beats]` (frame sheets per beat); `py -3 tools/jscheck.py <files> --eval "<js>" --shot out.png` (headless load + draw check; there is no node) |
| Reduced motion | `Util.reduced()`; read in `bridge.js` top, `genesis-state.js`, `intro.js`, `lazy-video.js`; global collapse in `css/style.css` |
| Levels, ranks, rank card | `js/site/xp.js` `RANKS`/`rankOf`/`ceremony`; burst and card `js/site/surge.js`; styles `css/beacon.css`; freeze listener `bridge.js` (`xp:freeze`); future boons: Roadmap below |
| Dev URL params | `?reset=1` in `xp.js`; `?genesis=1` and `?gbeat=<name>` in `genesis-state.js` |
| Case-page toys (lamps, shadow walker, records, the range) | `js/pages/<page>.js`; shared layer `js/pages/play.js`, styles `css/play.css`; desktop only (≥ 900 px); XP ids `play-*` |

### Storage keys

All keys are in `js/lib/util.js` `Util.KEYS`: PROFILE `arcanis.profile.v1`
(xp.js), HINTS `arcanis.hints.v2` (bridge-notes.js), VIEW `arcanis.view.v1`
session (bridge-panel/entry), SECTOR `arcanis.sector.v1` (bridge-panel/entry),
INST_SCALE, GEAR_SEEN (bridge-panel.js), SW_CLEANUP (index.html head).
`?reset=1` wipes every key with the PREFIX.

## Delegation

- Delegate all code changes to the `implementer` subagent, one task per call.
- The spec must be complete enough that the implementer never has to choose a
  name, a file location or a design.
- Run implementer calls in parallel only when their tasks touch completely
  separate files. If several parallel tasks must each add `<script>` lines
  to `index.html`, tell each to edit only its own line with one `Edit` and
  to re-read and retry if the file changed underneath it; that worked for
  the split.

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
   will hang the implementer. Browser behaviour: `py -3
   tools/nav-flows.test.py <flows>`. It runs its own server and exits. Only
   the back/forward cache still needs a manual check. There is no `node`
   on this machine; a passing flow is the syntax check.

## Art style

Every drawn place (Rex kingdoms, Mainland factions, anything new) uses one
style. Reference: the Bone Spire in `js/world/art/bonespire.js` and the
Titans cave in `js/world/art/titans.js`.

- Stylised 2D silhouettes, flat palette fills.
- Light from the left. Shadows are hard-edged flat shapes (a `litShade`
  split, roughly the right 70% of each volume), never gradients.
- No rim lines, outlines or brick lines on buildings.
- Soft glow only for things that emit light (lanterns, portals, flames).
- Places are proper buildings, not symbols or sigils.
- The primitives are in `js/lib/paint.js`; do not add a new `litShade`
  anywhere. Shared building helpers go in `rex-kit.js` / `land-kit.js`.

## Instrument readings

- Readings are visual first: a bar climbing or a tile blinking red, then a
  number, then a line in the log. Never a mechanic; nothing here costs the
  visitor anything.
- Every place that bends the instruments is one entry in
  `js/bridge/bridge-sites.js`, gated on its depth node (`gate`). The beacon
  marks nothing; the art does. Add a site, not a special case in a tile.
- Two axes: `chaos` is the incoherent one (noise, the world's `chaosAt`);
  `nomic` is the coherent one (constants displaced, in step). On the HUD
  and in the log say `incoherent` / `coherent` / `nomic`; never `magic`.
  Keep the voice's style: `value · unit · impossible clause`, lowercase,
  dry.
- Tiles read `r.env` only; they never reach into `Bridge`. Anything that
  does not change per paint goes in the tile's `paintStatic`.

## Roadmap: rank boons (not built yet)

Ranks are every 10 levels (`xp.js` `RANK_STEP`, names in `RANKS`). The
site gives about 52 levels today (41 beacons at 1 each, 2 path awards, 9
from the project pages) against `TOTAL = 100`, so the highest reachable
rank is Starwright (level 50). Plan: each rank unlocks a ship or HUD
system, announced on the rank card.

- Lamplighter (10): radar range up; beacons show on the radar tile from
  further away.
- Wayfinder (20): minimap labels for unvisited beacons.
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

## Commands

- **Build:** none. No framework, no bundler, no npm.
- **Run:** `python serve.py`, then open `http://127.0.0.1:8765/`
- **Test:** `py -3 tools/nav-flows.test.py` (Playwright; pass flow names to
  run a subset, `--list` to see them). Flows: `first`, `gate-exits`, `back`,
  `reload`, `worklink`, `deeplink`, `returning`, `wordmark`, `reset`,
  `genesis`, `twotabs`, `header`, `shell`, `phone`, `depths`, `rex`,
  `watcher`, `bridge`, `landdepths`, `links`.
- **Cutscene frames:** `py -3 tools/gframes.py <run> [beat ...]` writes
  `snapshots/frames/<run>/<beat>.png` contact sheets. **JS check:** `py -3
  tools/jscheck.py js/genesis/genesis-figures.js --eval "return typeof
  GenFig"` loads files in a headless page (no node on this machine).
- **Screenshots:** `py -3 tools/snap.py capture <name>` writes a run under
  `snapshots/`, `py -3 tools/snap.py compare <a> <b>` diffs two runs, `py -3
  tools/snap.py list` names the scenes.
- **Cache-bust:** `py -3 tools/bump.py` rewrites every `?v=` in the HTML
  pages.
- **Git:** on the local machine, commit straight to `main`, no branches.
  In a cloud session, see Cloud sessions below. A `.gitignore` covers
  `__pycache__/`, `*.pyc`, `snapshots/` and `Temporary VoidScape Media/`.
- **Every task ends with a commit, unasked.** Once the work is verified, run
  `py -3 tools/bump.py` if any script or stylesheet changed, then commit. Do
  not stop at "ready to commit" and do not hand the user a commit command.
- **Commands shown to the user run in Windows PowerShell 5.1.** Never print
  `&&`, `||`, `$(...)` or bash `if` for them; chain with `;` or give one
  command per block. The Bash tool is fine for Claude's own use.

## Cloud sessions

A cloud session (claude.ai/code, the Claude app) is a fresh Linux clone of
GitHub, one container and one `claude/<name>` branch per session, so
parallel sessions never share files. The live site deploys from `main`, so
nothing a cloud session pushes goes live until the owner merges it.

- **Branch:** work, commit and push only on the branch the session was
  assigned. Never push to `main` and never merge into it; the owner merges.
  This overrides "commit straight to `main`" above.
- **One prompt, one finished feature.** The owner ships from a command, not
  from a second prompt: a reply that only says "good, go" would cost a
  whole extra turn. So in the same turn: build, verify, commit, push, open
  a PR (title = the feature in plain words; body = what changed and what
  was verified; skip if `gh` is missing), then end with this report and
  nothing else:
  1. **Name:** the feature in plain words (the branch name is random and
     means nothing to the owner), then the branch and PR.
  2. **How it looks:** one or two screenshots of exactly what changed,
     taken with Playwright (a `python3 tools/snap.py capture` scene,
     `python3 tools/jscheck.py ... --shot out.png`, or
     `python3 tools/gframes.py` for the cutscene), saved in the scratchpad
     and sent to the owner (SendUserFile when the tool exists). Never
     commit them.
  3. **Try:** one `powershell` block, one command:
     `py -3 C:\Users\Traff\Desktop\sebas\Portfolio\tools\try.py <branch> --path "<url path>"`.
     It checks the branch out into `../Portfolio-try`, serves it on its own
     port and opens the browser; typing `ship` at its prompt ships it. Set
     `--path` to where the change is seen (`/projects/voidscape.html`,
     `/?genesis=1&gbeat=<beat>`, `/` for the bridge) and say in one line
     what to do there to see it.
  4. **Ship:** one `powershell` block:
     `py -3 C:\Users\Traff\Desktop\sebas\Portfolio\tools\try.py <branch> --ship`.
     It merges the branch into `main` inside `../Portfolio-try`, runs
     `bump.py`, pushes, deletes the branch (the PR closes as merged) and
     fast-forwards the owner's checkout when it is clean. On a conflict it
     pushes nothing and says so.
  5. **Look at:** two or three bullets at most, plus anything left open.
  If the owner replies with changes instead, do another round on the same
  branch (the PR updates itself) and end with the same report. The session
  itself never merges into `main`.
- **Branches never touch `?v=` and never re-count File-map lines.** Do not
  run `tools/bump.py` and do not change the line count of an existing
  File-map row; add rows for new files and update descriptions only. These
  two are where every merge conflict between parallel branches came from;
  `--ship` bumps on merge. Previews are unaffected: `serve.py` sends
  no-cache headers.
- **Commands:** `py -3` does not exist in the container; run the same tools
  with `python3` (`python3 tools/nav-flows.test.py header`). Everything
  else in this file applies unchanged.
- **Playwright:** the environment's setup script installs
  `playwright==1.56.0`, the version that matches the pre-installed Chromium
  build (`/opt/pw-browsers/chromium-1194`). Never run `playwright install`
  and never upgrade the package. If a flow prints "Looks like Playwright was
  just installed", the pin and the Chromium build disagree: say so and stop.
- If `python3 -c 'import playwright, PIL'` fails, the setup script did not
  run: `pip install playwright==1.56.0 pillow` (never `playwright install`).
- **Merging by hand (a local session, only when `--ship` hit a conflict or
  the owner says "merge the PRs"):** merge the open PRs into `main` one at
  a time with `--no-ff`, oldest first. Conflicts in `?v=` numbers: keep either side. Two branches adding
  `<script>` lines at the same spot: keep both, in load order. File-map
  rows: keep both sides' rows, then re-count the changed files. After the
  last merge run `py -3 tools/bump.py` once, run the full
  `py -3 tools/nav-flows.test.py`, commit, push, and delete the merged
  `claude/*` branches on the remote.
- **No scratch files in the repo.** GitHub Pages publishes every committed
  file; logs and notes go in the session's scratchpad, not the root.
