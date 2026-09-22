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

- **Never read a whole file over 300 lines.** Use the File map below to pick
  the function or section, then `Grep -n` for the name and `Read` with
  `offset`/`limit` around the hit. Line numbers in this file drift; the
  function names do not, so grep the name rather than trusting the number.
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

## File map

No framework, no bundler, no npm. Every JS file is an IIFE that publishes
one global on `window`. Sizes are line counts.

| File | Lines | Purpose | Publishes / uses |
|---|---|---|---|
| `bridge.js` | 2119 | Hero orchestrator: camera, pointer/burn input, beacons, notes, minimap, HUD wiring, sector switch, rAF loop | `window.beaconReport`, `depthsReport`, `depthsReveal`, `depthAlpha`, `__bridgeRefit`, `pacingReport`; uses everything below |
| `genesis.js` | 2733 | Autoplay origin cutscene: own canvas, beat timeline, drawing | `window.Genesis {active, pending, play, skip, seek, step, draw}`; uses `World`, `XP` |
| `instruments.js` | 1430 | Two 4-tile HUD banks (NAV + SYS), alarms, static-blit cache | `window.Instruments {mount, mountSys, draw, setScale, setCompact, focus, focusSys, impact, setRepair, alert, …}` |
| `world.js` | 1228 | Scenery only: Arcanis geography and painting. No input, no HUD | `window.World {SLOT, LAND, BOUNDS, DECK, VIEW_UNITS, chaosAt, futureAt, draw}`; uses `RexArt`, `LandArt`, `depthAlpha` |
| `depths.js` | 874 | Pure data: beacon-gated node clusters and layouts. No DOM | `window.Depths {nodes, clusters}` |
| `voidship.js` | 745 | The craft: thrust/brake, fuel, hull hit-test | `window.Voidship {create, resize, setPower, setCourse, setThrusting, step, draw, screenPos, touching, stats, canBurn, addFuel, …}` |
| `rexart-deep.js` | 708 | Painters for the three Rex caverns | `window.RexArt.titans / .valkhar / .law` |
| `rexart-surface.js` | 683 | Painters for Rex surface landmarks | `window.RexArt.firstlight / .crimson / .bonespire` |
| `landart.js` | 612 | Painters for the five Mainland factions. `+y` is UP here, opposite of rexart | `window.LandArt.shattered / .libertech / .dawn / .accord / .gore` |
| `xp.js` | 338 | Site-wide progression, level chip, cross-tab sync, `?reset=1` | `window.XP {award, has, total, mount, reset, …}`; fires `xp:surge` |
| `light.js` | 221 | HeavyLight demo on its project page (`#light-canvas`) | none |
| `intro.js` | 206 | Entry gate UI: boot log, the two paths, exits | uses `SiteEntry`, `XP` |
| `lamp.js` | 188 | Beacon draw + DOM attach (named lamp because adblockers drop "beacon") | `window.Beacon {draw, attach, create, scan, HIT}` |
| `planet.js` | 136 | Placeholder worlds for the Game Dev sector | `window.Planet {draw}` |
| `lazy-video.js` | 137 | Swaps in `media/**/sd/` encodes on slow connections | none |
| `surge.js` | 132 | Level-up light animation, listens for `xp:surge` | `window.Surge {play, reachFor}` |
| `entry.js` | 50 | Head-time gate decision: `restore` / `deeplink` / `returning` / `first` | `window.SiteEntry {kind, sector, view, VIEW_KEY, SECTOR_KEY}` |
| `embed.js` | 30 | Click-to-load itch.io iframes | `window.Embed {reset}` |
| `style.css` | 578 | Base site: topbar, gate, sections, project pages, small screens | |
| `bridge.css` | 813 | Everything hero/cockpit: HUD, notes, setting panel, boot terminal, genesis overlay | index only |
| `beacon.css` | 284 | Level chip, rank badge, claim ceremony | |
| `index.html` | 400 | Homepage. Inline head script is only the service-worker purge | |
| `projects/*.html` | ~100–160 | Four case-study pages, same shell | |
| `nav-flows.test.py` | 891 | Playwright flows; starts its own server on a free port | |
| `serve.py` / `serve.bat` | 67 | No-cache static server on 8765 (8000 avoided: stale SW) | |

### Load order

`index.html` head: `style.css`, `beacon.css`, `bridge.css`, then `xp.js`,
`entry.js` (blocking, on purpose), then the inline SW purge. Body tail:
`surge → lamp → planet → depths → instruments → rexart-surface → rexart-deep
→ landart → world → voidship → embed → bridge → genesis → intro`.
Nothing uses `defer`/`async`. Scripts carry `?v=N` cache-busters; bump the
number when you change a file.

Project pages load only `style.css`, `beacon.css`, then `xp → surge → lamp`
plus `embed.js` (conclusus, heavylight), `light.js` (heavylight) or
`lazy-video.js` (sector-zero, voidscape), and an inline `XP.award(...)`.

### Section anchors

Grep these names; the ranges are approximate.

- **bridge.js** — `MARKS` (~47, landmark list), `PLANETS` (~94), gate
  deferral `readyBridge`/`startLoop`/`parkIdle` (~146–246), state + `wx()`
  world→screen (~247–342), notes `showNote`/`placeNote`/`selectMark`
  (~358–467), input `clientToCourse`/`beginBurn`/`endBurn` + listeners
  (~496–679), minimap `rebuildTrack` (~680), markers `drawMarks` (~793),
  `__bridgeRefit` (~895), setting panel `applySceneMode`/`beginModeSwitch`
  (~915–1181), depths `spawnDepth`/`revealDepths` (~1182–1271), log
  `runLog` (~1305), fuel/zones/damage `fuelPool`/`zoneAt`/`takeDamage`
  (~1338–1808), `updateHUD`/`drawInstruments` (~1809), movement `step`
  (~1860), loop `frame`/`render`/`paintOnce` (~1988–2119).
- **genesis.js** — `BEATS` (~43), helpers `litShade`/`flatGlow`/`flatSphere`
  (~183–290), terrain `rexLandHeight`/`mainHeight` (~290–400), timeline
  `pending`/`since`/`beatDur` (~472–505), chases (~506–592), transport
  `play`/`skip`/`seek`/`finish` (~593–780), `camAim`/`step` (~781–877),
  drawing `drawRexLand`/`drawMainland`/`drawSaga`/`drawDepths`/`draw`
  (~878–2671), input `holdPage` (~2674).
- **instruments.js** — mount/layout (~154–252), panel paint + static blit
  (~253–360), alarms `tickAlarms`/`alert` (~361–499), bank plumbing
  (~500–567), tiles: `radar` (~632), `signal` (~761), `drive` (~829),
  `nav` (~959), SYS `tickSys`/`eclss`/`rad`/`hull`/`bus` (~1064–1430).
- **world.js** — consts (~42), mainland `band` (~87), Rex `rexHeight`
  (~116–172), `REX_PLACES` roster (~186), void data (~196–246), then one
  `drawX` per feature: `drawVoid`, `drawChaos`, `drawWatcher`, `drawSerus`,
  `drawNephilim`, `drawVikings`, `drawRex` (~868), `drawHell`,
  `drawRexPlaces` (~998), `drawLandPlace` (~1044), `drawRoot`, `drawBridge`,
  `draw` (~1188).
- **depths.js** — `CLUSTERS` data (~37–718; Bone Spire ~481, Titans ~491),
  `waveOf` (~719), `LAYOUTS` (~743), `nodes()` (~780).
- **CSS** — each file has `/* --- */` section comments; grep the section
  name rather than reading the file.

### Where things live

| Concept | Go to |
|---|---|
| Rex kingdoms | `world.js` `drawRexPlaces` + `REX_PLACES`; art in `rexart-surface.js` / `rexart-deep.js` |
| Mainland factions | `world.js` `drawLandPlace`; art in `landart.js` |
| Bone Spire (style reference) | `rexart-surface.js` `paintBoneSpire` / `liveBoneSpire`; placed in `REX_PLACES`; node in `depths.js` |
| Titans cave (style reference) | `rexart-deep.js` `paintTitans` / `liveTitans` |
| `litShade` | Four independent copies: `genesis.js`, `landart.js`, `rexart-surface.js`, `rexart-deep.js`. Not shared; edit the one in the file you are changing |
| Camera / pan / input | `bridge.js` `camX`, `wx()`, `clientToCourse`, listeners block |
| Landmarks / beacons | `bridge.js` `MARKS`, `PLANETS`; gated extras `depths.js` `CLUSTERS` |
| Main rAF loop | `bridge.js` `frame()`; other loops in `intro.js`, `light.js`, `surge.js`, `xp.js` |
| Entry gate | decision `entry.js`, UI `intro.js`, CSS `style.css` gate section + `bridge.css` boot terminal, bridge defers in `readyBridge` |
| Cutscene | `genesis.js` (`play`, `draw`, `BEATS`); overlay CSS in `bridge.css` |
| Reduced motion | `bridge.js` top (loop keeps running, travel softens), `genesis.js`, `intro.js`, `lazy-video.js`, `light.js`, plus media queries in all three CSS files |
| Dev URL params | `?reset=1` in `xp.js`; `?genesis=1` and `?gbeat=<name>` in `genesis.js` |

### Storage keys

- `arcanis.profile.v1` (localStorage) — XP profile, `xp.js`
- `arcanis.hints.v2` (localStorage) — bridge hints, `bridge.js`
- `arcanis.view.v1` (sessionStorage) and `arcanis.sector.v1` (localStorage)
  — camera/sector restore, `bridge.js` + `entry.js`
- `arcanis.swcleanup.v1` — one-shot service-worker purge, `index.html` head

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

## Commands

- **Build:** none. No framework, no bundler, no npm.
- **Run:** `python serve.py`, then open `http://127.0.0.1:8765/`
- **Test:** `py -3 nav-flows.test.py` (Playwright; pass flow names to run a
  subset, `--list` to see them). Flows: `first`, `gate-exits`, `back`,
  `reload`, `worklink`, `deeplink`, `returning`, `wordmark`, `reset`,
  `genesis`, `twotabs`, `header`, `shell`, `phone`, `depths`, `rex`,
  `watcher`, `bridge`, `landdepths`, `links`.
- **Git:** commit straight to `main`, no branches. `__pycache__/` is
  currently tracked and there is no `.gitignore`; do not stage `.pyc` files
  or `Temporary VoidScape Media/`.
