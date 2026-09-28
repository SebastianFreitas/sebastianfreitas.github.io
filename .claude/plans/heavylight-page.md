# heavylight-page

Stage: done
Started: 2026-09-26
Procedure: `.claude/skills/plan/SKILL.md` (planning loop, then "go").

## Brief (owner's words, verbatim)

workheayvlightgame page, right now it sucks, look at what we put by the beacon on heavylight on the playable segment, look at the conclusus agme page , my idea is to do soemthing like that, the corner of the scren should have the backgorund tiles, we add then the tile sin the center kinda liek conclusus, but isntead of the whole mechanic with the guy, the idea is to put scripted events with lamps and push cubes around, like 3 events on the page eahc a bit cooler, you have to be really carefull here look at the work we did for the signle light on the playable sgement of heavy lgiht, it must reach the corners it must not clip or else you need to do actual light physics. well dow ahetevr you think its best,

## Scope

- In: <what this plan may change, by file or area>
- Out (stays exactly as is): <files, systems, beats, rules>

## Current state (explored <date>; anchors drift, grep the names)

- `js/pages/heavylight.js` (326): viewport space; `geom(V)` puts four wall lamps in the screen corners (BL pushes right, BR lifts, TR carries left, TL drops), 56x56 click boxes; click = on 8 s; wedge (`inBeam`, HALF0 20 → HALF1 40) rides bodies along its axis; six 42x42 crates + red investigator (18x39, idle loop); gravity, floor friction, screen-edge bounce, pairwise AABB; page blocks ignored; sprites 3x from inline `HPAL` defs (lamp_right, lamp_up, lamp_streetlamp4, box_Box1, idle1-3); XP `play-heavylight` on first click; hint "lamps · click one".
- `js/pages/play.js` (233): `Play.start({name, seed, setup, step, draw, atRest, press, move, release, scroll, resize})`; V = W H dpr top sy docH t dt main gutter band blocks(document space, media flag) vis(viewport, per frame) rnd pointer free blockAt wake cursor; canvas fixed, z -1, pointer-events none; presses only on body/html/main.case; <900 px hidden; reduced motion = one still frame; `sprite(pal, def, scale)` cached per scale, `blit`, `glow`, `award` (once per id).
- `projects/heavylight.html`: 34 blocks + footer; hero = itch embed shell (media), sections brief / rule / Lamps (lamps.mp4) / one new thing / journal (journal.webp) / clues / under the hood / reused / taught; scripts util xp surge embed lazy-video pacer play heavylight, `?v=140`.
- `js/pages/conclusus.js` (499): document space, platforms beside page blocks (the layout the brief points at). Anchors: see research/heavylight-page-00-intake.md.
- `js/gdworld/gd-heavylight.js` (280) tiles + `js/gamedev/zones.js` (509) LANTERN/BEAM: see intake digest.

## Option map (planning only; struck lines are settled by a D)

### A · Light model (the wedge must reach the corners or do real physics)
- ~~Off-screen wedge · precedent: bridge BEAM (ends 24 units past the screen edge) · in ours: every lamp beam is a flat trapezoid that runs past the viewport edge on its own side, so no beam end is ever visible; crates lit by being drawn under it~~
- ~~Occluded wedge · precedent: ncase Sight and Light endpoint rays · in ours: the wedge is clipped by crates and tile slabs into a lit polygon (flat fill, hard edges), so the beam stops on things and casts hard shadows behind them~~
- Both · in ours: off-screen wedge plus a hard shadow only behind crates (one rect per crate)

### B · Corner tiles
- Four corner masses · precedent: gd-heavylight autotile blobs · in ours: L-shaped masses in each screen corner, fixed to the viewport, rims on exposed sides, dark fill runs to the edge
- ~~Floor and ceiling bands · precedent: gd-heavylight open band · in ours: full-width floor at the bottom and ceiling at the top, the page column floats over them~~
- ~~Corners plus side pillars · precedent: HL_GROUPS pillarR · in ours: corner masses plus one pillar per side that lamps hang from~~

### C · Centre tiles (beside the page blocks, like Conclusus)
- ~~Floating slabs per block · precedent: conclusus layout(V), document space · in ours: a rimmed slab to the right of every third block, crates rest on them, scroll with the page~~
- One shelf per event · in ours: three slabs only, one per scripted event, next to the hero, the Lamps section and the Journal
- ~~Viewport-fixed stage · in ours: slabs fixed on screen, events run regardless of scroll~~

### D · The three events (each cooler than the last)
- 1 push: one lamp switches on and pushes a crate along a slab off its edge
- 2 handoff: two lamps, the first carries a crate up, the second catches it sideways and lands it on a shelf (chain-reaction beat)
- 3 stack: three lamps on a blink cycle stack crates into a tower, then one beam drops them all (Fischli and Weiss)
- ~~3 alt: a crate rides three beams around the page column and lands where it started~~

### E · Trigger and replay
- Scroll-reached: each event plays once when its section enters the eye band, replays on a click of its lamp
- ~~Timer: events loop on a cycle with a pause between, no input needed~~
- ~~Click only: nothing moves until a lamp is clicked (current behaviour)~~

### F · Investigator, XP, what stays
- Investigator idles on a slab and gets carried by event 3, or is removed
- XP: one award on the first event seen plus one on event 3
- Copy, media, hero embed, palette stay as they are

### G · Performance and reduced motion
- atRest between events (no rAF), cached tile canvases, occlusion only while a lamp is on
- Reduced motion: one still frame with tiles, lamps off, crates resting

## Open items

- none (round 1 asked and answered 2026-09-26; every answer was the recommended option, none opened a new area).

## Decisions (owner answers; `(auto)` = taken while running, review at the end)

- **D1 · Light model.** "Off-screen wedge + crate shadows": each lamp's flat wedge runs past the viewport edge like the bridge BEAM (no visible end), and every crate inside it casts one hard flat shadow rectangle away from the lamp. Settles: A.
- **D2 · Corner tiles.** "Four corner masses": an L-shaped autotile blob in each screen corner, fixed to the viewport, rims on exposed sides, dark fill off the edge; the middle of every edge stays open so beams leave the screen there. Settles: B.
- **D3 · Centre tiles.** "One shelf per event": three rimmed slabs in document space, one beside the hero, one beside the Lamps section, one beside the journal; they scroll with the page; the rest of the gutter stays clear. Settles: C.
- **D4 · Events.** "Push, handoff, stack and drop": 1 one lamp pushes a crate along its shelf off the edge; 2 a lamp lifts a crate and a second lamp catches it sideways and lands it on the shelf; 3 three lamps on a blink cycle stack crates into a tower, then one beam knocks it down. Settles: D.
- **D5 · Trigger.** "Scroll-reached, click replays": each event plays once when its section scrolls into the middle of the screen; its lamp can be clicked to replay. Settles: E.
- **D6 · Investigator and XP.** Remove the investigator; XP once the first time any event plays and once more when event 3 finishes. Settles: F lines 1 and 2.
- **D7 · Performance and reduced motion.** atRest between events, cached tile canvases, shadows computed only while a lamp is on; reduced motion = one still frame with tiles, lamps off, crates resting. Settles: G.
- **D8 · What stays.** Copy and sections, media and hero embed, the HPAL palette, blue beam fill and lamp sprite all stay. Settles: F line 3.
- **D9 · Corner size (phase 1).** "Long arms, thin": each corner L runs 6 tiles (288 px) along both edges, 2 tiles (96 px) deep; the middle of every edge stays open.
- **D10 · Shelf side (phase 1).** "Right of the block, in the gutter": shelf starts 40 px right of its block, bottom aligned to the block bottom, 5 tiles wide, shrinks to what fits on narrow windows.
- **D11 · Lamps (phase 1).** "On the shelves": each shelf carries its own lamps at its ends, pointing along it or up; the corner masses carry no lamps. Beams still leave the screen on their own side (D1): a right-facing shelf lamp exits the right edge, an up-facing one the top.
- **D12 · Crates (phase 1).** "1, 2, 3 by event": hero shelf one crate, Lamps shelf two, journal shelf three.
- **D13 · Beam shape (phase 2).** "Widening trapezoid": half-width 20 at the lamp face + d·tan 6°, axis-aligned, far edge 24 px past the viewport edge on the lamp's side; old BEAM fill + CORE at .35 of the widths.
- **D14 · Shadow (phase 2).** "Void quad, ~60%": flat `#041522` at .6 alpha from the crate's far side to the wedge's far edge, clipped to the wedge, hard edges.
- **D15 · Down lamp (phase 2).** "Yes, to the bottom edge": the journal shelf's hanging lamp beams past the screen bottom and scrolls with the page.
- **D16 · Test hook (phase 2).** "Yes": `PlayHeavyLight.on(k,i)` lights a lamp; `report()` gains `wedges` (screen-space corners of each lit wedge).
- **D17 · Motion (phase 3).** "Scripted paths": each crate follows an authored eased path while its lamp is on; always lands exactly, every replay.
- **D18 · Reset (phase 3).** "Fall away, drop back": crates fall off screen; when the event ends they drop in from above onto their shelf spots.
- **D19 · Click during an event (phase 3).** "Ignore until done": a click only replays a finished event.
- Event 2 reading (design, not asked): the up lamp lifts the crate and tosses it left in an arc; the right-facing lamp relights under it, "catches" it in its beam and sets it down on its home spot.

## Constraints (every phase)

- Art: `.claude/rules/art-style.md` (light rim on every exposed side, dark fill never meets empty space, masses run off the screen edge, 3 px per art px, flat hard shadows, no gradients, soft glow only on lamps).
- The beam never shows an end on screen: every wedge ends past the viewport edge on its own side (D1), as bridge BEAM does. A wedge that must end on screen is a blocker, not a fudge.
- Page column, copy, media, embeds untouched (D8); `projects/heavylight.html` changes only if a script line must; no `tools/bump.py` in worktree mode; MAP.md line counts unchanged.
- `js/pages/play.js` API unchanged; the toy stays `Play.start` based, hidden under 900 px as today.
- Snapshots: `py -3 tools/snap.py capture before` in this worktree before the first code edit; after each code phase `compare`, `same` on every scene except `page-heavylight*`; `page-*` scenes show no console error.
- Flows: the heavylight page flow of `py -3 tools/nav-flows.test.py` after each code phase; the full suite only if navigation, gate or storage is touched (not planned).
- Main session writes no source: every code change is an implementer spec. Research is for ideas, never copying art or text.

## Out of scope

- Any change to the bridge beam, `js/gamedev/zones.js`, `js/gdworld/gd-heavylight.js` or `js/pages/play.js`.
- The Conclusus page and any other case page.
- Mobile (under 900 px the toy is hidden by play.js).

## Progress

| # | Phase | Kind | Rests on | Status |
|---|---|---|---|---|
| 1 | Frame: corner masses and the three shelves | research, code | D2, D3, D6, D7, D8 | done d098ff5 |
| 2 | Light: off-screen wedges and crate shadows | research, code | D1, D7, D8 | done d867be9 |
| 3 | Events: push, handoff, stack and drop; triggers; XP | research, code | D4, D5, D6, D7 | done 5109f87 |
| 4 | Review, snapshots, MAP rows, commit to main | review | all | done a113b8f |

## Phases

### 1 · Frame: corner masses and the three shelves
Research: the tileCanvas mask logic in `js/gdworld/gd-heavylight.js` (the case page loads only `js/pages/`, so the toy needs its own small copy); which mask bits an L-shaped corner blob and a free-floating slab need; Conclusus `layout(V)` for placing a slab beside a named block; then go past: how INSIDE frames a screen with dark masses.
Deliverable: `js/pages/heavylight.js` rewritten in steps (skeleton first): a viewport-fixed frame of four corner masses drawn from a local tile set (rims, notch, transparent outer corner, 3 px per art px, HPAL colours), three document-space shelves found from V.blocks (hero, the Lamps section, the journal; fall back to the nearest block if a lookup fails), crates resting on them, no investigator (D6), old wedges gone for now, the four lamp sprites kept and mounted on the corner masses, off; atRest true when nothing moves (D7); reduced motion still frame (D7). MAP.md description for heavylight.js updated (not its count).
Verification: `py -3 tools/snap.py capture p1` then `compare before p1`: only `page-heavylight*` differ, no console error; `py -3 tools/jscheck.py ... --shot` frames at 1440x900 and 1920x1080 showing every mass reaching its two edges.
Notes: lamps sit on the shelves per D11, not on the corner masses; the shelves shrink to 2 tiles at 1280 px and overflow crates stack in a pile; verified with a Playwright script on the real page (report() at 1440x900, 1920x1080, 1280x720), snap compare before/p1 (only page-heavylight-desktop differs), shell flow.

### 2 · Light: off-screen wedges and crate shadows
Research: bridge `BEAM` geometry in `js/gamedev/zones.js` (over 24, spread, lamp-face origin) and how its far edge is put past the screen; one-rect hard shadow per crate (project the crate's far corners along the beam direction past the screen edge, fill with the void colour, clip to the wedge); then go past: LIMBO shadow slashes.
Deliverable: in `js/pages/heavylight.js`: `wedge(lamp)` returning a polygon whose far edge lies at least 24 px past the viewport edge on that lamp's side at every viewport size; the beam drawn with the current blue fills (D8) over the crates, then one flat shadow quad per lit crate; beam on and off with the existing fade; shadows computed only while a lamp is on (D7).
Verification: a jscheck eval that prints `ok` when every far-edge vertex of every wedge is off screen at 1280x720, 1440x900, 1920x1080 and 2560x1440; `snap.py capture p2`, compare with p1: only `page-heavylight*` differ; a shot of one lamp on with two crates in the beam.
Notes:

### 3 · Events: push, handoff, stack and drop; triggers; XP
Research: scripted timelines in `js/pages/conclusus.js` (the teleport and timed-platform scripts) for the step and state pattern; lerp-to-beam-velocity from the bridge crates; then go past: Fischli and Weiss pacing (the pause before each handoff).
Deliverable: in `js/pages/heavylight.js`: an `EVENTS` table of three scripts keyed to their shelf; a scroll trigger that fires an event once when its shelf's block centre enters the middle third of the viewport (D5) and a click on its lamp that replays it; event 1 push, event 2 lift and catch, event 3 blink-cycle stack then knock-down (D4); crates that leave the screen return to their shelf when the event ends; XP `play-heavylight` on the first event and a second id when event 3 ends (D6, xp: 1 each, in the XP table where the other page awards live); atRest between events (D7).
Verification: the heavylight flow of `py -3 tools/nav-flows.test.py`; a jscheck eval that scrolls to each shelf, waits and reads `PlayHeavyLight.report()`, one shot per event; `snap.py capture p3`, compare with p2.
Notes:

### 4 · Review, snapshots, MAP rows, commit to main
Research: none.
Deliverable: a fresh subagent reviews `git diff main` against D1 to D8; gaps fixed by spec; MAP.md description fixes from the intake (conclusus.js row, zones.js path, gd-heavylight px floor); `py -3 tools/try.py <branch> --commit`; the report with Try and the commit on main.
Verification: `snap.py compare before p3` read once more; the heavylight flow passes.
Notes:

## Carry forward

- Phase 1 built: `js/pages/heavylight.js` consts S=3, T=48 (tile), ARM=6, DEEP=2, EDGE=24, CW=42 (crate); `layout()` re-runs on `sigOf` change and fills `shelves[{k,x,y,w,tiles,lamps,crates}]` (document y; screen y = y - V.sy); lamps per shelf: k=0 right-facing at the left end; k=1 right at left + up at right; k=2 right at left + up at right + down hanging under the left end; crates k+1 resting on the shelf top (wrap into rows when the shelf is 2 tiles). `window.PlayHeavyLight.report()` returns `{masses:[{fx,fy,cells}], shelves:[...]}`.
- Verifying on the real page: jscheck has no HTML page (no V.blocks), so use a Playwright script that imports `tools/nav-flows.test.py` (`start_server()`, `INIT`), aborts mp4, evaluates `PlayHeavyLight.report()` and screenshots; jscheck `--eval` needs `return`.
- Phase 3: events fire when the shelf's y (not the block centre) enters the middle third; a relayout ends running events as done. There is no `heavylight` nav flow (`shell`, `links` cover the page shell). Shelf 2 wraps crates two per row at 1440, so the tower uses `towerOrder(s)` (base = bottom-row crate with the largest hx). `PlayHeavyLight.play(k)` starts event k for tests; `report()` gives `events` and per-shelf `boxes`. XP keys were not confirmed in localStorage under the INIT stub; check in phase 4.
- Old toy facts: S=3, ON_FOR 8 s, fills `rgba(0,43,255,.20)` + `rgba(140,180,255,.12)`, HPAL 11 colours, crates 42 px, 56 px lamp click boxes (keep the lamp look, D8).
- Bridge BEAM: `{x:58,y:58,half:6,ang:42,spread:6,over:24}`, far edge 24 units past the screen bottom.
- Phase 2 built: lamps carry `on` (seconds left, kept across relayout by `k:i`); `face(l,oy)`, `wedge(l,V)` (4 screen points, [1] and [2] are the far edge), `coreWedge`, `drawBeams` (BEAM, CORE, then SHADE quads clipped to the wedge, then glow; alpha = min(1,on)). draw order: shelves, beams, masses. `atRest` false while any lamp is on. `PlayHeavyLight.on(k,i)` lights for ON_FOR=8 and wakes via the stored `VV`; `report()` adds `wedges[{k,i,kind,pts}]`, `W`, `H`. Scratchpad check `hl2.py` (lost on /clear; rebuild from the bullet above: all lamps on, far points off screen by kind).
