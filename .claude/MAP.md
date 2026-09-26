# Map

The reference half of CLAUDE.md, moved here on 2026-09-25 so that it is
grepped on demand instead of loaded into every session and every Explore
call. Rules live in CLAUDE.md; this file is facts: sizes, purposes, exports,
load order, storage keys, where things live, the roadmap. Keep it true: a
new file, a moved function or a new export gets its row fixed in the same
commit. Grep for a file name, a function or a concept; never read the whole
file.

Files still over 500 lines (never read one top to bottom):
`css/bridge.css` (726), `js/hud/instruments.js` (652),
`js/hud/tiles-nav.js` (641), `js/bridge/bridge-sites.js` (525),
`js/genesis/genesis.js` (642), `js/gamedev/storm.js` (585),
`js/genesis/genesis-matter.js` (620), `js/genesis/genesis-gods.js` (516),
`js/ship/voidship.js` (553), `js/gamedev/forge.js` (549),
`js/gamedev/zones.js` (509), `js/genesis/genesis-rex.js` (511),
`js/genesis/genesis-oldones.js` (555), `js/pages/voidscape.js` (849),
`js/pages/sector-zero.js` (575), `js/pages/conclusus.js` (499),
`tools/snap.py` (531), `tools/nav-flows.test.py` (890).

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
| `zones.js` | 509 | Backdrop art around Conclusus / HeavyLight / VoidScape: sprite pipeline `CPAL`/`CSPR`/`HPAL`/`HSPR` → `spriteCanvas` → `blitSprite`, `HL_GROUPS`, `LANTERN`, `BEAM`, `dropCrate`/`stepCrates`; HeavyLight drawn at `hlZoom()` (= backdrop `px()`/2) through one transform, layout compact enough to fit under the ceiling at 900 H; Conclusus likewise at `ccZoom()` (= `GdWorld.P.conclusus.px()`/2), `CPLATS` compacted, `CC_LIFT` lift threshold | `window.Zones {step, draw, report}`; fed by `bridge-marks.js` `zonesEnv` |

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
| `gdworld.js` | 140 | Core: `GAMES`, `R`, `GROUND` (0.64, the old deck line), `dens(i, x)`, the frame `F`, `sx(x, par)`, seeded `scatter(seed, i, n, par, fy0, fy1)`, `each(list, pad, fn)`, the sector dust, `draw` (sky blend of the games' `base` colours → dust → washes → every layer by `par` → grades), `clear`/`clearBox` (0..1 fade round every visible mark, from `F.marks`) | `window.GdWorld` |
| `gd-zero.js` | 423 | Sector Zero, "the room in the lantern's reach": the game's storeroom (drop-ceiling grid fading to black, open steel racks with a few boxes and binders, one black doorway every six slots, plank floor with scratches) baked by `buildStrip` into one repeating `repeat-x` pattern per pixel scale and height (`stripPattern`), at par 0.7; shown at `AMB` 0.10 everywhere and inside three drifting lantern `POOLS` as three stepped `RINGS` each, faded by `clearBox`; the game's two flickers (dip, rare hard off) from `F.t`, none with reduced motion; `px()` = min(3, round(3k)); no wash, no grade | `GdWorld.P.zero` |
| `gd-voidscape.js` | 365 | VoidScape, "the run, only up": dark, quiet corridor `module`s tilted and chained by stairs, dim mouths and strip lights, pipes with valve wheels, a few small portals high and low, dice/canisters/medkits on the floor band; all faded by `clearBox` round the marks; faint red clouds and ground heat; grade = red vignette | `GdWorld.P.voidscape` |
| `gd-heavylight.js` | 280 | HeavyLight, "the game's own tiles": one tile grid at par 0.7 over the full height: open band 0.18–0.79 H, ceiling mass from the top edge and floor mass to the bottom edge (`base` [0,0,0]); pixel scale `px()` = min(3, round(3k)), published on `GdWorld.P.heavylight.px` for zones.js; interior cells batched through `solidPattern(p)`; floor/ceiling stepped in whole tiles (`ridge`, × `dens`, 1-tile minimum within 520k px of the planet and round every mark via `clearBox`), sparse floating platforms; `tileCanvas(m, v)` autotiles a light crenellated rim on every exposed side plus inner-corner nubs (colours from the Unity sewer tiles); back wall via `backPattern(p)`; no wash, no grade | `GdWorld.P.heavylight` |
| `gd-conclusus.js` | 222 | Conclusus, "the game's own slabs": the game's 32 px platforms (`FL` floor1-4 × `GR` Grass1-5 letter strings → `slabCanvas(f, g)`, cached) floating on the flat #2f2427 void (`base`) in staircases, pairs and runs of ≤3 (`chunk(kk, NR)`, 7-column chunks) on a 32 px column / 8 px row grid, band 0.18–0.79 H, par 0.7; empty round the planet on screens ≥ 900 wide (zones.js draws the game's sprites there at the same scale; 0.45 dim on narrow screens) and faded by `clearBox`; `grade` = 40 slow #afc084 motes; `px()` = min(3, round(3k)), published for zones.js | `GdWorld.P.conclusus` |

### js/world

| File | Lines | Purpose |
|---|---|---|
| `world.js` | 283 | Core: `VIEW_UNITS`, `SLOT`, `LAND`, `BOUNDS`, `DECK`, `FLOOR`, `BAY`, `chaosAt`, `futureAt`, seeded `city` and particle arrays, Rex consts `REX_BANDS`/`REX_FROM`/`REX_END`/`HELL_AT`/`rexHeight`/`REX_PLACES`, `rexSprite` cache, `depthAlpha`/`setA`/`faded`, `MAIN_PAR` + faction anchors, `F`, `P`, `scale`/`wx`/`onScreen`, `draw` (paint order lives here; a gamedev frame is handed to `GdWorld.draw`) | `window.World {SLOT, LAND, BOUNDS, DECK, VIEW_UNITS, chaosAt, futureAt, draw, F, P, …}` |
| `vortex.js` | 113 | `drawVortex(x, y, R, opts)`: a flat layered cloud mass (`VORTEX_LAYERS`, deepest first, each a `layerPath` with a pinwheel hole) with hard radial shade and puffs pulled in; opts `seed outer layers alpha puffs`; first used by the Watcher |
| `void.js` | 193 | `drawVoid`, `drawChaos`, `drawTendrils`, `drawPresences`, `drawFragments` (`FRAGMENTS`), `drawFuture` |
| `watcher.js` | 220 | `WATCHER_SHARDS`/`WATCHER_CRACKS`, `drawWatcher` (calls `P.drawVortex`, `P.serusPhase`/`P.drawSerus`), `RED_STAR`, `drawRedStar` |
| `serus.js` | 154 | `serusPhase`, `drawSerus` (the alien coiled in the Watcher) |
| `nephilim.js` | 194 | `NEPHILIM` anchor, `nephRng`, `NEPH_*`, `nephWalk`, `nephRibbon`, `flatVolume`, `drawNephilim` |
| `admin-tear.js` | 75 | `ADMIN_TEAR`, `TEAR_JAG`, `TEAR_MOTES`/`SPECKS`/`STITCH`, `tearLine`/`tearHalf`/`tearPath`, `drawAdminTear` (a cut in reality: warped lattice sheared into the wound, lit lip, void with specks, infall motes, gold sutures at the tips) |
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
| `genesis-state.js` | 336 | `BEATS` (34 beats, Roman-numeral tags, biblical lines), world constants, state (`cam`, `zoom`, `zoomKick`, trails, rings, `sparks`), O(1) `idxOf`, `since/linear/only/sx/beatDur`, `G.BEAT_START` + `G.secs(id)` (seconds since a beat began, negative before it), dev params `?genesis=1` / `?gbeat=<name>`; `G.GOD_H` (0.11) is the gods' height as a fraction of the screen | `window.Gen` |
| `genesis-paint.js` | 136 | flat-art helpers `flatGlow flatSphere mixHex fillRidge gridXs rexLandHeight mainHeight mainDome eastJag mainSurfY standY` | `window.GenPaint` |
| `genesis-eldpal.js` | 174 | the eldritch palette (plan phase 4): 21 named tokens (cloth, leather, fur, metal, snow) as `{lit, mid, shade}`, tier-3 sky steps; `tone report contrast swatchSheet`; data only, read by the tier-3, old-one and kin painters | `window.GenEldPal` |
| `genesis-tier3.js` | 236 | tier 3, the sky shadows (plan phase 16): the Brim, Comb, Lintel and Arc as flat near-background shapes cut by the top edge, screen-fixed (undoes zoom and shake), `POSE` per beat with held-step motion `mv` (drift, lurch, enter, fade, pass, level; plan phase 17), `offset(k)` gives a being's current offset, `tines(k)` the comb's tine screen xs while it acts (plan phase 18), caption-box t1 clip, haze bands; `pocket(x, y)` makes far lights and motes skip round them; drawn right after `fillBg` | `window.GenTier3` |
| `genesis-void.js` | 287 | `fillBg`, `drawMotes`, `drawChaos` (the far realms: parallax dark blobs + far lights), `drawPoint` (pressure rings, mind specks, cracks), `drawSpan` (the monumental bridge: slab, piers, arches, gold rail; deck and hanging cities from `trade`, pier nests from `walk`, plan phase 19; clears, masks and blits only a device-pixel box around the span, plan phase 23) | `window.GenVoid` |
| `genesis-flesh.js` | 259 | the Primordisentia: `fleshGeom fleshPath drawFlesh` (lobes, veins, eyes, mouths), `drawPatches` (the old ones' colours), `drawSouls`, `drawCry`, `drawSeal` (the gold womb) | `window.GenFlesh` |
| `genesis-works.js` | 151 | the made worlds (`worlds` beat): a lens cut in the flesh opens and closes in held steps, a punched-card chain clicks down, ten flat orreries are built stage by stage, one holds the only star; draws only inside the beat, after the souls: `draw` | `window.GenWorks` |
| `genesis-remake.js` | 348 | the remaking (`remake`, `lives` beats): tongs pull the clotted souls apart and a kept piece is rebuilt on a counter; remade sparks loop through three flat worlds and a forgetting band until Rex and Obrokxus stop; `draw`, `soulMul` (dims the original souls in both beats, 1 elsewhere) | `window.GenRemake` |
| `genesis-elements.js` | 400 | wave one after the break: dust, air, wind, sound, colour (oil/water flips), light; 460 particles, three forms each, rage events and slosh; `drawResidue` = the permanent void traces (dust, wind streaks, colour stains, lights, sound rings) drawn every frame after the far realms; late in `elements` each particle freezes and snaps in held steps to the sea, the rail top or the sky (`posAt`, `drawSplit`), and `drawSea`/`seaK` draw the tier-1 sea strata at the frame bottom (plan phase 21) | `window.GenElem {draw, drawResidue, drawSea, rage}` |
| `genesis-matter.js` | 620 | wave two: 100 flesh/stone/meld chunks (float, fall, break, meld pairs) that fly briefly then gather into one mass (`MASS`, slot per chunk, `gatherK`) resting on the span; through trade it opens where an old one climbs out (`GenOld.activeVents`) and crumbles from the outside in (`massScale`); 150 insects hatching (deformed, most die; storm deaths), 7 lawless storms (air, rain, fire, lightning) | `window.GenMatter {draw, chunkAt, MASS, massScale}` |
| `genesis-trade.js` | 139 | only the travelling stream now: `drawStream` = 200 travellers flowing east/west around the camera from late trade through walk | `window.GenTrade {drawStream}` |
| `genesis-oldones.js` | 503 | 24 old ones, no two alike: one each of the ten old kinds (slot 0 the headless gentleman, east, bare until a `dress` beat, then a GenAttire suit: `dressNow gentlemanBare gentlemanDressed`; eye, mass, blinker and roller switch the same way; `windAt`/`frostNow` set `GenAttire.weather` per frame, each `<kind>Dressed` a new body per D28; `place()` acts for east-goers: stutter, mime gait, held-pose kneel and bow, twitch, `p.gest`; in the `dress` beat each east-goer flips `o.dressed` at its own `dressAt` time after `drawMaking` cloth steps; in the `leave` beat every rim old one but the carers (`CARERS`: eye, chime, mound) and the brothers goes out left to right by x, half then gone, leaving a `drawPin` of its `o.hue` that runs along the rim and out, `p.pinU`) plus fourteen painted in genesis-oldkin.js, six locomotions (walk, slide, fly, blink, roll); humanoid/animal-like kinds go west (side -1), the strange ones east; they climb one by one out of the matter mass during the trade beat in held steps clipped at the rim, the gentleman first and alone, flakes at each snap (`VENT_T0`, `ventOf`, `ventDur`, `ventSteps`, `GENT_IDX`, `emergeK`, `activeVents`, `drawFlakes`, plan phase 20), `drawOldOnes` takes `env.emerge` and `env.layer` ("inside" = still climbing, drawn behind the stones): `ROSTER_SPECS ROSTER ORDER place drawOldOnes drawShards drawKind makeOne` | `window.GenOld` (also `PAINT litSplit eyeDot`) |
| `genesis-oldkin.js` | 362 | painters for the fourteen new old ones (tower pearl bundle needle slab bloom comb veil knot husk chime prism swarmling mound; every east-goer (tower bundle slab comb chime mound swarmling prism bloom veil needle knot) switches `<kind>Bare`/`<kind>Dressed` on `O.dressNow`, each Dressed a new body with its clothes per D28), registered into `GenOld.PAINT` | extends `window.GenOld` |
| `genesis-attire.js` | 1058 | the attire kit (plan phase 7): flat garment painters registered by `reg(piece, kind, spec)` and drawn with `draw(ctx, piece, x, y, s, opt)` (unit coords, `fit` tailored/found, `sq`, `dir`, `seed`, `snow`; `weather {w,g,t,frost}` shears pieces about the anchor and defaults `snow`, set by `GenOld.windAt`), lit from the left in three flat bands, cached to offscreen canvases; `sheet(ctx, w, h, piece)` review sheet; worn by the dressed east-goers from `dress` on | `window.GenAttire` |
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
| `conclusus.js` | 499 | Document space: up to 40 grass platforms beside the page blocks, each with a planted green twin; when the player's platform leaves the eye band (30-62 % of the viewport) he teleports (30-particle burst) to the platform nearest the band's centre (46 %) and plants a twin where he stood; click a twin or a green silhouette (silver = the 1.2 s cycle's deadly half; silhouettes stand on the right end of every 4th platform); lit dashed line under the landed platform, spinning symbol, exit arch that blooms on the last platform, spike balls, 32 light motes born at the top-right corner drifting down-left on straight rays (`ray`, the game's RainEffect cone); sprites 2x (`CPAL`) | `window.PlayConclusus {report}` |
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
| `tools/merge-cachebust.py` | 66 | Git merge driver for `*.html`: merges with every `?v=` number treated as equal, then writes the highest back, so bumps never conflict; installed by `try.py` |
| `tools/gframes.py` | 63 | Tiles genesis beat frames for review into `snapshots/frames/<run>/<beat>.png`; imports `tools/snap.py` |
| `tools/jscheck.py` | 49 | Loads JS files into a headless page in order and reports syntax/runtime errors; `--eval` runs against a 1440×900 canvas; imports `start_server` from nav-flows |
| `tools/try.py` | 277 | Preview or commit a branch: `py -3 tools/try.py <branch> [--path /url] [--port N]` checks it out into the reusable worktree `../Portfolio-try`, serves it on 8766+ and opens the browser (typing `commit` at its prompt does the same as `--commit`); `--commit` squashes the branch into ONE commit on `main` in the main checkout, bumps `?v=` in that commit, merges `main` back into the branch, and pushes or deletes nothing — the owner pushes with GitHub Desktop; on a conflict it changes nothing and says so; every run installs the `cachebust` merge driver (git config + `.git/info/attributes`, shared by all worktrees) |
| `serve.py` / `serve.bat` | 67 | No-cache static server, port from `PORT` env or `sys.argv[1]`, default 8765; always serves its own folder (`os.path.dirname(__file__)`), not the caller's cwd, so it works run from a worktree (8000 avoided: stale SW) |

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
bridge-loop} → genesis/{genesis-state, genesis-paint, genesis-eldpal, genesis-tier3, genesis-void,
genesis-flesh, genesis-elements, genesis-matter, genesis-trade,
genesis-oldones, genesis-oldkin, genesis-attire, genesis-figures, genesis-titans, genesis-obrok, genesis-gods,
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
| Eldritch lore (tiers 1–3, old ones, why they dress, where clothes come from) | `.claude/lore/eldritch.md`; art rules `.claude/rules/art-style.md` "Eldritch"; plan `.claude/plans/genesis-eldritch.md`; new beats after `womb` `.claude/plans/genesis-eldritch-beats.md` |
| Cutscene review | `py -3 tools/gframes.py <run> [beats]` (frame sheets per beat); `py -3 tools/jscheck.py <files> --eval "<js>" --shot out.png` (headless load + draw check; there is no node) |
| Reduced motion | `Util.reduced()`; read in `bridge.js` top, `genesis-state.js`, `intro.js`, `lazy-video.js`; global collapse in `css/style.css` |
| Levels, ranks, rank card | `js/site/xp.js` `RANKS`/`rankOf`/`ceremony`; burst and card `js/site/surge.js`; styles `css/beacon.css`; freeze listener `bridge.js` (`xp:freeze`); future boons: Roadmap at the end of this file |
| Dev URL params | `?reset=1` in `xp.js`; `?genesis=1` and `?gbeat=<name>` in `genesis-state.js` |
| Case-page toys (lamps, shadow walker, records, the range) | `js/pages/<page>.js`; shared layer `js/pages/play.js`, styles `css/play.css`; desktop only (≥ 900 px); XP ids `play-*` |

### Storage keys

All keys are in `js/lib/util.js` `Util.KEYS`: PROFILE `arcanis.profile.v1`
(xp.js), HINTS `arcanis.hints.v2` (bridge-notes.js), VIEW `arcanis.view.v1`
session (bridge-panel/entry), SECTOR `arcanis.sector.v1` (bridge-panel/entry),
INST_SCALE, GEAR_SEEN (bridge-panel.js), SW_CLEANUP (index.html head).
`?reset=1` wipes every key with the PREFIX.

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
