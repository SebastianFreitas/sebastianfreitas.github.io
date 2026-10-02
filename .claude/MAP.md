# Map

The reference half of CLAUDE.md, moved here on 2026-09-25 so that it is
grepped on demand instead of loaded into every session and every Explore
call. Rules live in CLAUDE.md; this file is facts: purposes, exports,
load order, storage keys, where things live, the roadmap. Keep it true: a
new file, a moved function or a new export gets its row fixed in the same
commit. Grep for a file name, a function or a concept; never read the whole
file. The map holds purpose and exports, not line counts (file-guard reports
sizes at read time).

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
| `entry.js` | Head-time gate decision: `restore` / `deeplink` / `returning` / `first` | `window.SiteEntry {kind, sector, view}` |
| `intro.js` | Entry gate UI: boot log, the two paths, exits. Must load last: dispatches `site:preload` synchronously | uses `SiteEntry`, `XP` |
| `surge.js` | Level burst at the chip (rings, seeded sparks, label, edge glow; grows with the pip count) on `xp:surge`; the rank card on `xp:rankup` (the only thing that sends `xp:freeze`, dismissed by click/key or after 3.8 s) | `window.Surge {play, rankUp}` |
| `embed.js` | Click-to-load itch.io iframes | `window.Embed {reset}` |
| `lazy-video.js` | Swaps in `media/**/sd/` encodes on slow connections | none |

- `xp.js`: level chip (badge + 10 pips toward the next rank), `RANKS` (shape + name, one per 10 levels, `rankOf`), claim ceremony (never freezes the world; claims queue), cross-tab sync, `?reset=1`
- `xp.js` publishes: `window.XP {award, has, total, rankOf, rankStep, ranks, mount, reset, …}`; fires `xp:surge` per level, `xp:rankup` once per rank crossed

### js/hud

| File | Purpose | Publishes / uses |
|---|---|---|
| `instruments.js` | HUD framework | `window.Instruments` |
| `tiles-nav.js` | The nav bank | registers `{paint, paintStatic}` |
| `tiles-sys.js` | The sys bank and its shared state | registers `{paintSys, tickSys, impact, setRepair, sys, repairState}` |

- `instruments.js`: banks/layout (`CELL_W`/`gridW`), `mount`/`mountSys`, `blitStatic`, `draw`, alarms `tickAlarms` (env rules: signal chaos/nomic, radar glare, hull wear, bus sway, rec gAnom, `contained` scales nomic/sway) → `arbitrate` (`lit` map: every error tile lights at once,
- `instruments.js`: one warning at a time, 22s quiet only when no error is lit) → `alarmOverlay` (blinks 1.1 Hz err / 0.5 Hz warn), `alert`; SYS bank honours `paintStatic`; the `F` kit gained `meter`/`lvCol`/`blink`; `registerTiles` (merges every registration into one `tiles` object)
- `instruments.js` publishes: `window.Instruments {mount, mountSys, draw, setScale, setCompact, focus, focusSys, impact, setRepair, alert, registerTiles, …}`
- `tiles-nav.js`: every tile has a static layer (`radarStatic`/`signalStatic`/`driveStatic`/`navStatic`); `radar` wash + blip smear from `glare`, a second contact (our echo) from `env.twin`, glow bitmaps cached per colour;
- `tiles-nav.js`: `signal` is the environment tile — site name + tag header, coherent comb lines, meters CHAOS (`max(r.chaos, env.chaos)`)/UNFORMED/NOMIC; `drive` (key `phase`) tank spans the tile height (`driveGeom`); `nav` (key `rec`) right column `X`/`G`/`ρ`;
- `tiles-nav.js`: `VOICES` gained `zero`/`voidscape`/`heavylight`/`conclusus`
- `tiles-sys.js`: `tickSys` couples `o2`/`co2`/`kpa`/`dose`/`mag`/`hullT`/`hx` to `env` (`wear jitter rad sway heat frozen`), keeps `sys.hullInt` (integrity, cosmetic) and `sys.wear`; `eclss` rows are bars with nominal bands;
- `tiles-sys.js`: `hull` has a STRESS/REGEN header, sector stress flicker, an INT bar and WEAR ×n; `bus` sags with `sway`, shows UPLINK on `link`; static layers `eclssStatic`/`radStatic`/`hullStatic`/`busStatic`

### js/bridge

Load order is the table order; nine bridge files share `B`. `bridge-sites.js`
does not — it is pure data, no dependency on `B`.

| File | Purpose | Publishes on `B` / `window` |
|---|---|---|
| `bridge.js` | Core | `window.Bridge` |
| `bridge-notes.js` | Notes: `hostBox`, `showNote`, `measureNote`, `placeNote`, `selectMark`, `clearMark`; hints `HINT_STEPS`/`hintDone` | `B.hostBox showNote measureNote placeNote selectMark clearMark hintDone noteEls` |
| `bridge-input.js` | Pointer/burn input | `B.markAt clientToCourse courseForMark stopSteering beginBurn endBurn retargetFromPointer rebuildTrack syncLabels` |
| `bridge-marks.js` | `drawCue`/`drawCueLine`/`drawMarks`, `marksSettled`; sector glue `stormEnv`/`drawStorm`, `forgeEnv`/`drawForge`, `zonesEnv`/`drawZones`; debug `beaconReport stormReport forgeReport zonesReport` | `B.drawMarks drawStorm drawForge drawZones marksSettled` |
| `bridge-panel.js` | Setting panel, Instruments scale, mode switch | `B.applySceneMode applyPendingMode applyPendingView saveView beginModeSwitch stepSwitch drawSwitchFX` |
| `bridge-depths.js` | `spawnDepth`, `revealDepths` (runs once at load, again on `pageshow`/`storage`); debug `depthsReport`, `depthsReveal`, `depthAlpha` (read by `js/world`) | `B.spawnDepth revealDepths`; `window.depthAlpha` |
| `bridge-env.js` | The environment model | `B.env stepEnv`; `window.envReport` |
| `bridge-readout.js` | `B.voice = BridgeVoice.create` (voice state carries `env`) | `B.takeDamage runRepair checkRegion reportFiled updateHUD drawInstruments` |
| `bridge-loop.js` | Movement `step`, `atRest`, `B.pacer = Pacer.create`, `render`, `paintOnce`, tail `syncPhone()` + topbar observer; debug `pacingReport shipReport` | `B.step atRest render paintOnce` |
| `bridge-sites.js` | The places that bend the instruments | `window.BridgeSites {SITES, GD_SITES, lines}` |
| `bridge-voice.js` | What the readout says per region (`ZONES`, merges in `BridgeSites.lines()` as `site:<id>`), warn/err/crit odds | `window.BridgeVoice {create(S)}` |
| `bridge-log.js` | The typed-out readout queue | `window.BridgeLog {create(el)}` → `{push, run, setMax, idle}` |
| `marks.js` | Landmark roster: `MARKS` (Void beacons), `PLANETS` (Game Dev), `GD_LAND`/`GD_BOUNDS`/`GD_SPAWN` | `window.Marks`; uses `World` |
| `lamp.js` | Canvas beacon draw + `HIT` radius (named lamp because adblockers drop "beacon") | `window.Beacon {draw, HIT}` |
| `planet.js` | Placeholder worlds for the Game Dev sector, `THEMES` per game | `window.Planet {draw}` |

- `bridge.js`: `host`/`cv`/`ctx`, map consts (`SLOT LAND BOUNDS CAM VOID_MIN VOID_MAX HIT`), canvas `resize`, phone/portrait queries + `syncPhone`, gate deferral `readyBridge`/`startLoop`/`repaintUnderGate` + `site:preload`/`site:enter`, state,
- `bridge.js`: scene-mode consts (`ZERO_MARK VS_MARK HL_MARK CONC_MARK XSTAGE`), `B.ship = Voidship.create`, `xp:freeze`, cursor, sheet, projection `viewUnitsNow`/`scale`/`wx`/`onScreen`/`flyK`/`markScreen`, `begin`
- `bridge.js` publishes: `window.Bridge`; `B.resize syncPhone startLoop activeMarks viewUnitsNow scale wx onScreen flyK markScreen begin`
- `bridge-input.js`: `markAt`, `clientToCourse`, `courseForMark`, `beginBurn`, `endBurn`, `retargetFromPointer`, listeners, IntersectionObserver, `onPortrait`; minimap `rebuildTrack`/`syncLabels`
- `bridge-panel.js`: `B.log = BridgeLog.create`, the Instruments scale block (`__bridgeRefit`): `deskDefault()` gives wide, tall desktops (≥1800 px wide, ≥800 tall) banks at 1.2×, ramping from 1 at 1200 px, stored `INST_SCALE` still wins;
- `bridge-panel.js`: setting panel: `applySceneMode`, `applyPendingMode`/`applyPendingView`, `saveView`, `beginModeSwitch`, mode/genesis/gear buttons, `site:genesis-start`/`-done`, `stepSwitch`, `drawIris`, `drawSwitchFX`
- `bridge-panel.js` publishes: `B.applySceneMode applyPendingMode applyPendingView saveView beginModeSwitch stepSwitch drawSwitchFX`; `window.__bridgeRefit`
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
| `zero.js` `voidscape.js` `heavylight.js` `conclusus.js` | One planet cluster each (10 nodes, `arc` layout), ids `bnote-sz-* bnote-vs-* bnote-hl-* bnote-cc-*`; registered with `Depths.add` in load order = cluster order |
| `lore.js` | The four lore-beacon clusters in order: `bnote-rex` (10), `bnote-watcher` (2), `bnote-void` (3, `bnote-bridge-*`), `bnote-land` (5); mostly pinned with `at:` |

### js/ship

| File | Purpose | Publishes |
|---|---|---|
| `voidship.js` | `BASE` tunables | `window.Voidship` |
| `voidship-art.js` | Hull, wings, engine, fumes and wake painters | `window.VoidshipArt` |
| `voidship-prow.js` | The shard | extends `window.VoidshipArt {drawProwBack, drawProw, drawProwFront, emberOf, PROW}` |

- `voidship.js`: `create`, `setThrusting` (release rule), `step` (hold boost → wanted velocities → yaw → `ease` → arrival → fuel → pitch → fumes), `settled`, `stats`, `draw`
- `voidship.js` publishes: `window.Voidship {BASE, create, resize, setPower, setCourse, setThrusting, clearCourse, step, draw, screenPos, touching, touchingMark, stats, canBurn, addFuel, settled}`
- `voidship-art.js`: `block` + polygon helpers `tracePts fillPoly vol seg box`, palette (`LIT MID SHADE DEEP EDGE ORANGE ORANGE_D LAMP COLD RED WHITE DRIVE_*`), geometry tables (`W_FAR ENGINE HULL BELLY OPANEL W_NEAR OWING POD BRIDGE T1 T2`, `FV_*` for head-on),
- `voidship-art.js`: `drawHull` (far wing, engine block, wedge fuselage with ember conduit, near wing, belly pod, bridge block + mast, deck turrets, then the shard, drive glow, sustainers, RCS, bow chevrons), `drawFront`, `drawFumes`, `drawWake`, `EMIT SUST JETS TRAIL_SEATS`;
- `voidship-art.js`: local frame +x nose, +y down, units of hull length L; the shard is delegated to `voidship-prow.js` (`drawProwBack` first, `drawProw` after the turrets, `drawProwFront` at the end of `drawFront`)
- `voidship-prow.js`: a broken-off chunk of the giant energy-giving metal Libertech built the ship around, doubling as ram and power core. Flat facets: slab faces `SLAB_TOP SLAB_SIDE SLAB_BOTTOM`, fracture facets `FR1 FR2 FR3` converging on the ram tip, notches, `CRACKS`,
- `voidship-prow.js`: ember cracks `EMBER_PTS EMBER_LOW EMBER_TAP` (alpha = `emberOf(ship, t)`: pulse + strain, fixed pulse under `Util.reduced()`), the hull's jaws `JAW_T JAW_B` painted over the slab; `drawProwBack` is the red glow behind it; head-on `FV_*`. Palette `RUST_* EMBER`

### js/gamedev

| File | Purpose | Publishes |
|---|---|---|
| `storm.js` | Sector Zero storm: `COMPS`/`HOLD`/`STORM`, `layout`, `ROSTER`, `PAINTERS`, cycle `startStorm`/`gust`/`snapHome`, `stepFlicker`, ghost `LINES`/`stepLines`, `step`, `draw`, `report` | `window.Storm {step, draw, lively, report}`; fed by `bridge-marks.js` `stormEnv` |
| `forge-guns.js` | The one seeded `rnd`/`rint`/`pick`, `MAX_MODS`/`MAX_PATH_MODS`/`MAX_EMPOWER`, weapon tables, `rollMod`, `makeGun`, `randomGun`, `stats` | `window.ForgeGuns` |
| `forge-missions.js` | `RUN_MODS`, `rollRunMod`, `regood`, `makeMission`, floor plan `genPlan` | `window.ForgeMissions`; uses `ForgeGuns` |
| `forge.js` | Bench and console state, `tile`, `drawBench`, `cellColor`/`drawPlanArea`, `drawConsole`, `step`, `draw`, `hit`, `over`, `lively`, `report`, `unlock` | `window.Forge`; fed by `bridge-marks.js` `forgeEnv`, hit-tested in `bridge-input.js` pointerdown |
| `zones.js` | Backdrop art around Conclusus / HeavyLight / VoidScape | `window.Zones {step, draw, report}`; fed by `bridge-marks.js` `zonesEnv` |

- `zones.js`: sprite pipeline `CPAL`/`CSPR` (local) and `HPAL`/`HSPR` (read from `HeavyLightSprites`, js/shared) → `spriteCanvas` → `blitSprite`, `HL_GROUPS`, `LANTERN`, `BEAM`, `dropCrate`/`stepCrates`;
- `zones.js`: HeavyLight drawn at `hlZoom()` (= backdrop `px()`/2) through one transform, layout compact enough to fit under the ceiling at 900 H; Conclusus likewise at `ccZoom()` (= `GdWorld.P.conclusus.px()`/2), `CPLATS` compacted, `CC_LIFT` lift threshold

### js/gdworld

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
| `city.js` | `drawBand`, `drawCityNear`, `drawLandPlace` (reads `window.LandArt`), `drawRoot`, `drawBridge` |

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
| `genesis-state.js` | `BEATS` (34 beats, Roman-numeral tags, biblical lines) | `window.Gen` |
| `genesis-paint.js` | flat-art helpers `flatGlow flatSphere mixHex fillRidge gridXs rexLandHeight mainHeight mainDome eastJag mainSurfY standY` | `window.GenPaint` |
| `genesis-eldpal.js` | the eldritch palette (plan phase 4): 21 named tokens (cloth, leather, fur, metal, snow) as `{lit, mid, shade}`, tier-3 sky steps; `tone report contrast swatchSheet`; data only, read by the tier-3, old-one and kin painters | `window.GenEldPal` |
| `genesis-tier3.js` | tier 3, the sky shadows (plan phase 16) | `window.GenTier3` |
| `genesis-void.js` | Far realms, motes, the monumental span | `window.GenVoid` |
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
| `genesis-elements.js` | wave one after the break | `window.GenElem {draw, drawResidue, drawSea, rage}` |
| `genesis-matter.js` | wave two | `window.GenMatter {draw, chunkAt, MASS, massScale}` |
| `genesis-trade.js` | only the travelling stream now: `drawStream` = 200 travellers flowing east/west around the camera from late trade through walk | `window.GenTrade {drawStream}` |
| `genesis-oldones.js` | 24 old ones, no two alike | `window.GenOld` (also `PAINT litSplit eyeDot`) |
| `genesis-oldkin.js` | Painters for the fourteen new old ones | extends `window.GenOld` |
| `genesis-attire.js` | the attire kit (plan phase 7) | `window.GenAttire` |
| `genesis-figures.js` | flat silhouette cast | `window.GenFig` |
| `genesis-titans.js` | adds `drawTitan` (`"rex"`: stand/lunge/grapple/fall, `cool`; `"obrokxus"` = his first form, the blob: stand/lunge/climb/flee; `"centihorse"`/`"worm"` dispatch to genesis-obrok.js) and `drawHound` | extends `window.GenFig` |
| `genesis-obrok.js` | Obrokxus's later forms | extends `window.GenFig` |
| `genesis-gods.js` | the five gods, one painter each, registered in `GenFig.GOD_PAINT` and picked by `drawGod` on `o.kind` | extends `window.GenFig {GOD_PAINT, godHand}` |
| `genesis-hosts.js` | the war's figures, flat and lit from the left | `window.GenHosts {ABOM, ABOM_PAL}` |
| `genesis-seraphin.js` | the angels as winged beasts of light, no halos: `o.form` `"bird"` (crane) / `"hound"` (sighthound) / `"stag"` (gold antlers), big feathered `wing()`s (far wing a V behind), `o.fly` = flight pose (body around `y - 0.55s`), cast glow at `HAND` | sets `GenHosts.drawAngel` |
| `genesis-malgrur.js` | the devils: `o.form` `"gaunt"` (tall, thin, crooked, two horns; most of them) / `"bat"` (membrane wings, always flies) / `"fiend"` (delegates to the old `drawDevil`, captured at parse time); cast flame at `HAND` | replaces `GenHosts.drawDevil` |
| `genesis-vorgath.js` | more vorgath forms pushed onto `GenHosts.ABOM`: `bloat` (swollen sack, eye cluster, maw), `whelp` (segmented crawler after Obrokxus's centipede form), `maw` (walking skull-jaw) | extends `GenHosts.ABOM` |
| `genesis-mainland.js` | Mainland bands, spires, city and nest pit | `window.GenMain` |
| `genesis-armies.js` | the war simulation | `window.GenArmies` |
| `genesis-orb.js` | `drawRip lightsAt` (titan keyframe paths) `pushTrail drawTrail drawOrb drawRings drawBeam drawTintBeam yWob drawName` | extends `window.GenVoid` |
| `genesis-rex.js` | Rex chase, fight and the ending | `window.GenRex` |
| `genesis-depths.js` | `drawDepths`: rock, ribs, stalactites, the pocket, Obrokxus in Rex's grip, the five gods circling, 70 brothers (old-one kinds in red), the year counter | `window.GenDepths` |
| `genesis-saga-state.js` | `sagaAt` | extends `window.GenSaga` |
| `genesis-ritual.js` | the warlock births and the Hound's ritual | `window.GenRitual` |
| `genesis-saga.js` | The saga painter and live world | extends `window.GenSaga` |
| `genesis.js` | Cutscene conductor: DOM, transport, camera, draw | `window.Genesis` |

- `genesis-state.js`: world constants, state (`cam`, `zoom`, `zoomKick`, trails, rings, `sparks`), O(1) `idxOf`, `since/linear/only/sx/beatDur`, `G.BEAT_START` + `G.secs(id)` (seconds since a beat began, negative before it), dev params `?genesis=1` / `?gbeat=<name>`;
- `genesis-state.js`: `G.GOD_H` (0.11) is the gods' height as a fraction of the screen
- `genesis-tier3.js`: the Brim, Comb, Lintel and Arc as flat near-background shapes cut by the top edge, screen-fixed (undoes zoom and shake), `POSE` per beat with held-step motion `mv` (drift, lurch, enter, fade, pass, level; plan phase 17), `offset(k)` gives a being's current offset,
- `genesis-tier3.js`: `tines(k)` the comb's tine screen xs while it acts (plan phase 18), caption-box t1 clip, haze bands; `pocket(x, y)` makes far lights and motes skip round them; drawn right after `fillBg`
- `genesis-void.js`: `fillBg`, `drawMotes`, `drawChaos` (the far realms: parallax dark blobs + far lights), `drawPoint` (pressure rings, mind specks, cracks),
- `genesis-void.js`: `drawSpan` (the monumental bridge: slab, piers, arches, gold rail; deck and hanging cities from `trade`, pier nests from `walk`, plan phase 19; clears, masks and blits only a device-pixel box around the span, plan phase 23)
- `genesis-circle.js`: roles end state as backdrop; a grey thread rises from the pile and draws the ring in 8 held arcs from the bottom (pile shrinks a row per arc via `GenEye.setPileCut`), the rose thread + power point from P,
- `genesis-circle.js`: then a living universe (flat disc + band, turning 2-arm speck spiral, rose sparks, blue souls): `draw`, `drawUniverse(ctx,W,H,t,C?,R?)` (chains' opening disc)
- `genesis-rexin.js`: Rex tears the level-1 ring into two arcs, grows over held zoom-outs (field shrinks, roof band thins) until only part of him fits, then the chains settle round him as braided dark-red rivers;
- `genesis-rexin.js`: `draw(...,reach)` bends the right arm, `rexGeom(W,H,reach).hand`: `draw`, `rexGeom`
- `genesis-elements.js`: dust, air, wind, sound, colour (oil/water flips), light; 460 particles, three forms each, rage events and slosh; `drawResidue` = the permanent void traces (dust, wind streaks, colour stains, lights, sound rings) drawn every frame after the far realms;
- `genesis-elements.js`: late in `elements` each particle freezes and snaps in held steps to the sea, the rail top or the sky (`posAt`, `drawSplit`), and `drawSea`/`seaK` draw the tier-1 sea strata at the frame bottom (plan phase 21)
- `genesis-matter.js`: 100 flesh/stone/meld chunks (float, fall, break, meld pairs) that fly briefly then gather into one mass (`MASS`, slot per chunk, `gatherK`) resting on the span;
- `genesis-matter.js`: through trade it opens where an old one climbs out (`GenOld.activeVents`) and crumbles from the outside in (`massScale`); 150 insects hatching (deformed, most die; storm deaths), 7 lawless storms (air, rain, fire, lightning)
- `genesis-oldones.js`: one each of the ten old kinds (slot 0 the headless gentleman, east, bare until a `dress` beat, then a GenAttire suit: `dressNow gentlemanBare gentlemanDressed`; eye, mass, blinker and roller switch the same way;
- `genesis-oldones.js`: `windAt`/`frostNow` set `GenAttire.weather` per frame, each `<kind>Dressed` a new body per D28; `place()` acts for east-goers: stutter, mime gait, held-pose kneel and bow, twitch, `p.gest`;
- `genesis-oldones.js`: in the `dress` beat each east-goer flips `o.dressed` at its own `dressAt` time after `drawMaking` cloth steps; in the `leave` beat every rim old one but the carers (`CARERS`: eye, chime, mound) and the brothers goes out left to right by x, half then gone,
- `genesis-oldones.js`: leaving a `drawPin` of its `o.hue` that runs along the rim and out, `p.pinU`) plus fourteen painted in genesis-oldkin.js, six locomotions (walk, slide, fly, blink, roll); humanoid/animal-like kinds go west (side -1), the strange ones east;
- `genesis-oldones.js`: they climb one by one out of the matter mass during the trade beat in held steps clipped at the rim, the gentleman first and alone, flakes at each snap (`VENT_T0`, `ventOf`, `ventDur`, `ventSteps`, `GENT_IDX`, `emergeK`, `activeVents`, `drawFlakes`, plan phase 20),
- `genesis-oldones.js`: `drawOldOnes` takes `env.emerge` and `env.layer` ("inside" = still climbing, drawn behind the stones): `ROSTER_SPECS ROSTER ORDER place drawOldOnes drawShards drawKind makeOne`
- `genesis-oldkin.js`: painters for the fourteen new old ones (tower pearl bundle needle slab bloom comb veil knot husk chime prism swarmling mound;
- `genesis-oldkin.js`: every east-goer (tower bundle slab comb chime mound swarmling prism bloom veil needle knot) switches `<kind>Bare`/`<kind>Dressed` on `O.dressNow`, each Dressed a new body with its clothes per D28), registered into `GenOld.PAINT`
- `genesis-attire.js`: flat garment painters registered by `reg(piece, kind, spec)` and drawn with `draw(ctx, piece, x, y, s, opt)` (unit coords, `fit` tailored/found, `sq`, `dir`, `seed`, `snow`;
- `genesis-attire.js`: `weather {w,g,t,frost}` shears pieces about the anchor and defaults `snow`, set by `GenOld.windAt`), lit from the left in three flat bands, cached to offscreen canvases; `sheet(ctx, w, h, piece)` review sheet; worn by the dressed east-goers from `dress` on
- `genesis-figures.js`: `drawGod` (crowns: bars/rings/orbit/clock/petals/spikes), `drawWarlock` (returns the staff gem), `drawTroop`, `drawMortal` + shared `fillPoly shadedPoly quad withTilt`;
- `genesis-figures.js`: `drawGod` dispatches to `GenFig.GOD_PAINT[o.kind]` when set (genesis-gods.js), the robed figure is the fallback
- `genesis-obrok.js`: `drawCentihorse` (the centipede horse from flee through fall, flying: the 18 legs row through the air like oars (extended on the backward power stroke, folded on the recovery, wave head to tail), stand/run/lunge,
- `genesis-obrok.js`: `o.air` spreads the stroke wide) and `drawWorm` (the floating worm at the end of fall and in eternity, `o.speed`); `obrokEye(kind, x, y, h, o)` = where each form's eye is, which every beam aims at
- `genesis-gods.js`: `ormius` (winged devil, serpent from the waist down, long horns), `ava` (white furred serpent, feathered wings, gold), `orochronus` (Serus, a black serpent dragon), `kaeron` (cloaked, faceless, long beard, staff),
- `genesis-gods.js`: `kaelum` (a star whose colour is her mood: `o.mood` ok/happy/angry/sad, motes seeping out; she never strikes); `godHand(kind, x, yFoot, h, o, tx, ty)` = where each god's beam leaves it; kit `catmull`/`ribbon`/`vol`
- `genesis-hosts.js`: `drawDevil` (the humanoid devil: horns, tail, hooves, trident; kept as the rare `"fiend"` form),
- `genesis-hosts.js`: `drawAbom` (bone and flesh, dispatches by `variant` mod length into the `ABOM` registry: 0 `drawBrute` / 1 `drawCrawler` / 2 `drawStalker`, more pushed by genesis-vorgath.js);
- `genesis-hosts.js`: all `(ctx, x, y, s, o)` with y the foot line, `o = {a, face, walk, pose, down, lunge, cast, ph, variant, form, fly}`; `HAND` = casting-hand offset
- `genesis-mainland.js`: mainland bands, the surface cache `surfY(px)`/`surfYAt(wu, rise, scar)` every figure stands on, rooted red spires (`SPIRES`, `spireGeom(k, S)`; spires near the nest shrink to stumps as `S.drain` pulls them into the Hound), the city (roofs, walls, windows, lamps),
- `genesis-mainland.js`: the nest pit; `cityGeom` — after the war (`S.modern`) a share of each band rises into skyscrapers one by one (glassier walls, setback crown, antenna with a red light), the rampart sinks
- `genesis-armies.js`: angels (`seraphin`) and devils (`malgrur`) against abominations of bone and flesh (`vorgath`); `step(dt, S)`, `draw(ctx, S)`, `reset()` (march, front tide, melee lunges and sparks, casters loosing `BOLTS` that land as `BURSTS`, deaths, corpses, reinforcements);
- `genesis-armies.js`: each troop has a `form` and `alt` (flight height in sizes, 0 = grounded; set once in `host()` from `hash1`), `liftOf(T, s)` = bob, swoop in a fight, fall on death; fliers paint after the ground troops, their corpse waits out the fall (`hold`);
- `genesis-armies.js`: bolts leave from and aim at the lifted height (`dy0`, `dy1`); seeded `rnd` (mulberry 9011), no Math.random; painters from `GenHosts`
- `genesis-rex.js`: `chaseAt chaseFightAt ringFightAt`, the ending `escapeAt escapeDrift escapeCam escapeCamLead` (the worm gets away west, Ormius follows alone), `drawRexLand` (hot rock cooling to slate, fissures), `drawRexHole`, `drawRexGrip`, `drawBuried` (the eye in the ground),
- `genesis-rex.js`: `drawGodsBirth` (five gods walk west inside the land to the deck, each with a chip of Rex)
- `genesis-saga-state.js`: every saga quantity for the frame (feet via `GenMain.surfYAt`, the warlock births `cMortal teach pact aelChild bless vTaint vHelp vForge`, the Hound's ritual `ritual drain hBorn`, Mordrial's fall/dark, Obrokxus's lash and sinking,
- `genesis-saga-state.js`: his forms `oFrom oForm oMorph` (blob → centihorse in flee, centihorse → worm late in fall), `oHide` (buried on the mainland) and `oAir`, Eldrin, facing and walk flags, `fallBeat/etBeat`, `modern` (the city's rise to towers over return + early eternity))
- `genesis-ritual.js`: `target(S)`, `drawUnder` (Cadmus's pact rift with Ormius's gold seal, Aelius as a child in Ava's light, Velindra tainted, then the drain: Obrokxus's brood (abominations, `BROOD`), souls, corrupted magic and spire shards pulled into the Hound),
- `genesis-ritual.js`: `drawOver` (teaching/pact/blessing/help beams, Velindra's blades, the four ritual beams, latched flashes)
- `genesis-saga.js`: `drawSaga` (ground/city/nest via GenMain, armies via GenArmies, `GenRitual.drawUnder`/`drawOver`, the cast as figures, Obrokxus's two-form cross-fade clipped to the ground while `oHide`, beams from hands/gems, Mordrial's death, clashes), `drawLiveWorld`;
- `genesis-saga.js`: `O_SCALE` sizes Obrokxus's forms 1 / ½ / ¼ (`hOf`), each drawn on the same body centre
- `genesis.js`: DOM/overlay, caption crossfade, transport `play/skip/seek/finish`, `camAim` (+ per-beat `ZOOM` push/pull), `step` (zoom, sparks), the `draw` conductor (Act 1 wiring, the break flash, titans in the fight, the depths, the saga, the now-fade),
- `genesis.js`: the two waves (`GenElem`/`GenMatter`) and the stream, the old ones' two layers (inside the mass before `GenMatter.draw`, the rest after) and `march` timing, input

### js/pages

The case pages' play layer. Every file is an IIFE on one global; the toys
only ever read `V` from `Play` and never reach into the bridge.

| File | Purpose | Publishes |
|---|---|---|
| `play.js` | Shared play layer: canvas, view `V`, tiles, sprites, XP award | `window.Play` |
| `heavylight.js` | the case-page toy | `window.PlayHeavyLight {play, on, report}` |
| `conclusus.js` | Document-space case-page toy | `window.PlayConclusus {report}` |
| `sector-zero.js` | Viewport space | `window.PlayZero {report, thunder}` |
| `sector-zero-records.js` | The ten record files and mails (Brian, Amy, Laura, Jason, Obscura) | `window.ZeroRecords {RECORDS}` |
| `voidscape-boons.js` | 34 boons from the game's list `{id, w, name, desc, fx}`; `build(gun, boons)` → the effective build from a `ForgeGuns` gun, its mods and the boons; weighted `offer(pool, rnd)` | `window.RangeBoons` |
| `voidscape.js` | The range, viewport space | `window.PlayRange {report}` |

- `play.js`: `Play.start(spec)` mounts one fixed canvas behind the page (`.play`, z -1, pointer-events none; input is read on `window`, only presses on `body`/`html`/`main.case` count, panels are `.play-ui`),
- `play.js`: builds the view `V` (`W H top sy t dt pointer rnd blocks vis band main gutter free blockAt cursor wake`;
- `play.js`: `blocks` = document-space rects of every child of `main.case` plus the footer, `vis` the visible ones in viewport space, `band` the free strip right of the text column), runs a `Pacer` loop (`scrollWake` for `doc: true` toys),
- `play.js`: re-measures on load/resize and a 150 ms-debounced ResizeObserver on `main`; no layout read inside rAF (`V.sy` from a passive scroll listener cache, topbar rect on resize only);
- `play.js`: a toy with `doc: true` also gets `.play-tiles` (absolute, z -1 after the canvas, x from `spec.docX0` or `band.x0 - 128` to the viewport right, page-height tall): a fixed pool of 1024 px canvases repositioned by `translateY` over the viewport ±200 px,
- `play.js`: each cleared and painted per frame through `spec.drawDoc(ctx, V)` in page coordinates;
- `play.js`: `sprite(pal, def, scale)` pixel-sprite cache (2x default), `blit`, `glow` (with a `doc: true` toy: 4 px radius buckets drawn at the exact radius, 128-entry oldest-first cache), `award` (one XP point, once). Desktop only (`min-width: 900px`);
- `play.js`: a still frame under reduced motion
- `heavylight.js`: a viewport-fixed cave ring pre-rendered from HeavyLightSprites HSPR once per resize (ceiling notches, floor mounds, right-wall ledges in the top/bottom 20%, a 3-spike floor row, inner-corner rim nubs),
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
| `css/gate.css` | The entry gate: boot log, then the two paths. index only |
| `css/bridge.css` | Everything hero/cockpit: HUD, notes, setting panel, boot terminal, genesis overlay, letterbox bars. index only |
| `css/beacon.css` | Level chip and pips, claim ceremony, surge burst, rank card |
| `css/play.css` | The case-page play layer: `.play` canvas (z -1, under the ladder), `.play-tiles` page-coordinate canvases (same z, above it), `.play-ui` panels (z 2) and `.play-hint`; all hidden under 900 px. Case pages only |
| `index.html` | Homepage. Inline head script is only the service-worker purge |
| `projects/*.html` | Four case-study pages, same shell |
| `projects/conclusus.html` | Case page for Conclusus, a precision platformer on the HeavyLight base (thirty levels, a planted shadow you teleport back to, pins that launch you, safe/deadly silhouettes; Unity, WebGL); toy `js/pages/conclusus.js` |
| `projects/sector-zero.html` | Case page for Sector Zero, a horror prototype where a text file is the physics engine (Unreal 5); toy `js/pages/sector-zero.js` |
| `projects/voidscape.html` | Case page for VoidScape, a first-person roguelike where the player rolls their own difficulty (Unity, C#); toy `js/pages/voidscape.js` |
| `projects/heavylight.html` | Case page for HeavyLight, a 2D puzzle platformer where light carries momentum (Unity, WebGL); toy `js/pages/heavylight.js` |
| `404.html` | Not-found page (root-absolute `/css/…` and `/js/…` paths) |
| `tools/nav-flows.test.py` | Playwright flows; starts its own server on a free port; `ROOT` is the repo root; Conclusus flows `cc-read-xp`, `cc-scroll-pays-nothing`, `cc-keys`, `cc-win` |
| `tools/snap.py` | Screenshot regression |
| `tools/bump.py` | Sets every `?v=` across the HTML pages; works from any cwd |
| `tools/merge-cachebust.py` | Git merge driver for `*.html`: merges with every `?v=` number treated as equal, then writes the highest back, so bumps never conflict; installed by `try.py` |
| `tools/gframes.py` | Tiles genesis beat frames for review into `snapshots/frames/<run>/<beat>.png`; imports `tools/snap.py` |
| `tools/jscheck.py` | Loads JS files into a headless page in order and reports syntax/runtime errors; `--eval` runs against a 1440×900 canvas; imports `start_server` from nav-flows |
| `tools/toyshot.py` | One case-page toy in seconds |
| `tools/scrollperf.py` | Scroll-jank measure |
| `tools/cleanup.py` | Shared (synced). Deletes landed session branches and their worktrees |
| `tools/try.py` | Shared (synced). Try or land a session branch |
| `tools/try_project.py` | Portfolio hooks for the shared `try.py`/`try_commit.py` |
| `tools/try_commit.py` | Shared (synced). The owner's Commit |
| `tools/autoplan.py` | Shared (synced). Run a plan unattended |
| `serve.py` / `serve.bat` | No-cache static server, port from `PORT` env or `sys.argv[1]`, default 8765; always serves its own folder (`os.path.dirname(__file__)`), not the caller's cwd, so it works run from a worktree (8000 avoided: stale SW) |

- `tools/snap.py`: `capture`, `compare`, `list`; `page-<name>-toy` scenes shoot each case-page toy canvas in the viewport at three scroll stops (`TOY_STOPS`; `toy_frame`, `toy_ink`, whose `TOY_INK` counts `canvas.play` plus every shown `.play-tiles canvas`);
- `tools/snap.py`: imports `start_server` from nav-flows; reads scene ids from `js/bridge/marks.js` and `js/genesis/genesis-state.js`
- `tools/toyshot.py`: `py -3 tools/toyshot.py <page> [--out PATH.png] [--t MS] [--y PX\|FRAC] [--click-beat KIND]... [--show-beat KIND]` writes a viewport shot (default `snapshots/toys/<page>-<y>.png`, or `<page>-beat-<kind>[-after-<kinds>].png`), prints the inked px count;
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
`css/bridge.css`, then `js/lib/util.js`, `js/site/xp.js`, `js/site/entry.js`
(blocking, on purpose), then the inline SW purge. Body tail, in this order:

`site/surge → bridge/lamp → bridge/planet → depths/depths → depths/{zero,
voidscape, heavylight, conclusus, lore} → hud/instruments → hud/tiles-nav →
hud/tiles-sys → lib/paint → world/art/rex-kit → world/art/{firstlight,
crimson, bonespire, titans, valkhar, law} → world/art/land-kit →
world/art/{shattered, libertech, dawn, accord, gore} → world/world →
world/{void, watcher, serus, nephilim, admin-tear, vikings, rex, city} →
ship/voidship-art → ship/voidship-prow → ship/voidship → gamedev/storm →
gamedev/forge-guns → gamedev/forge-missions → gamedev/forge →
shared/heavylight-sprites → gamedev/zones →
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
`sector-zero.js`; heavylight: `js/shared/heavylight-sprites.js` before
`heavylight.js`), and the inline `XP.award(...)` last.

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
| Environment model / place readings | `js/bridge/bridge-env.js` (`B.env`, `B.stepEnv`) |
| Readout text | `js/bridge/bridge-voice.js` `ZONES`; site lines in `js/bridge/bridge-sites.js` `lines()`; glue and hull damage in `bridge-readout.js` |
| HUD tiles | `js/hud/tiles-nav.js`, `js/hud/tiles-sys.js`; framework `instruments.js` |
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
| Levels, ranks, rank card | `js/site/xp.js` `RANKS`/`rankOf`/`ceremony`; burst and card `js/site/surge.js`; styles `css/beacon.css`; freeze listener `bridge.js` (`xp:freeze`); future boons: Roadmap at the end of this file |
| Dev URL params | `?reset=1` in `xp.js`; `?genesis=1` and `?gbeat=<name>` in `genesis-state.js` |
| Case-page toys (lamps, shadow walker, records, the range) | `js/pages/<page>.js` |

- Environment model / place readings: one entry per place in `js/bridge/bridge-sites.js` (`SITES`, `GD_SITES`, gated by the depth node in `gate`); alarms in `js/hud/instruments.js` `tickAlarms`/`arbitrate`; the four Game Dev sites' physics and their `lines()` live in `bridge-sites.js` `GD_SITES`
- Cutscene: cast painters `genesis-figures.js` + `genesis-titans.js`, the five gods `genesis-gods.js`, Obrokxus's later forms `genesis-obrok.js`; the old ones `genesis-oldones.js`;
- Cutscene: the birth waves `genesis-elements.js` (wave one + permanent residue), `genesis-matter.js` (matter, insects, storms), `genesis-trade.js` (the travelling stream); the Primordisentia `genesis-flesh.js`; the mainland/spires/city `genesis-mainland.js`;
- Cutscene: the war `genesis-armies.js`, the war's figures `genesis-hosts.js`; the warlock births and the Hound's ritual `genesis-ritual.js`; the depths `genesis-depths.js`; captions `genesis-state.js` `BEATS`;
- Cutscene: zoom/captions/letterbox `genesis.js` + `css/bridge.css` genesis block
- Plan phase state (one phase per session): first line `Status: phase-done\|partial\|questions\|blocked\|plan-done` (read by `tools/autoplan.py` and `session-start.py`); `## Questions` holds deferred phase questions, answered with `go` in the app; format in `.claude/skills/plan/SKILL.md`;
- Plan phase state (one phase per session): headless sessions follow `.claude/skills/plan/unattended.md`
- Shared workflow (synced with the owner's other projects): synced paths and hashes in `.claude/workflow.lock`; the shared rules are `.claude/rules/workflow.md`; `session-start.py` `workflow_sync_lines` prints `WORKFLOW SYNC:` on drift;
- Shared workflow (synced with the owner's other projects): the project's half (never synced) is `.claude/project/`: `modes/<mode>.md` (printed after the shared mode file), `playbook.md`, `implementer.md`, `reviewer.md`,
- Shared workflow (synced with the owner's other projects): optional `settings.json` (merged into `.claude/settings.json` by `sync.py push`) and `file-guard.json`, plus `tools/try_project.py`; hooks: `git-guard.py`, `file-guard.py`, `context-watch.py`, `stop-guard.py`, `session-start.py`
- Case-page toys (lamps, shadow walker, records, the range): shared layer `js/pages/play.js`, styles `css/play.css`; desktop only (≥ 900 px);
- Case-page toys (lamps, shadow walker, records, the range): XP ids `play-*`. Conclusus: a document-space toy (`doc: true`, page-coordinate `.play-tiles`), beats unlock in order (twin → 3 keys by click into a tray → door → win), progress survives relayout, cached glow sprites in `play.js`

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
