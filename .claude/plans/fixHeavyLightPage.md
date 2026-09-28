# fixHeavyLightPage

Stage: done
Started: 2026-09-28
Procedure: `.claude/skills/plan/SKILL.md` (the interview, then "go").
Interview: A done · B done · 80 asked · C done
- missed: how deep the right wall/floor may run when the window is not a whole number of tiles (D67).
- missed: the gutter (≤ 80 px) leaves no room for a left-wall bulge; which edge carries the pillar instead (D68)?
- missed: can ceiling/floor bulges pass over the text column (D69)?
- missed: when the floor band right of the text is too narrow for both, do spikes or a mound win (D72)?
- missed: HSPR has no inner-corner sprite; how is D33's corner piece drawn (D70)?
- missed: a crate one tile lower sits in the upper piece's own row band, so where can lamp B stand (D73)?
- missed: how many tiles wide may a chunk be at 1440, where the gutter holds 5-6 (D74)?
- missed: what stops event 3's crate on the symbol tile while lamp 3 is still lit (D75)?
- missed: a standing lamp_up at the wall's foot blocks the slide; how is lamp 2 mounted (D76)?
- missed: how bright and how big is the symbol tile's goal glow (D77)?
- missed: does "the rAF sleeps" mean a full stop or Pacer's 10 fps park (D78)?
- missed: what counts as "scrolled off" for a chunk whose beam reaches far past it (D79)?
- missed: does a relayout from a late measure reset events like a resize (D81)?
- missed: which instant of each event is the reduced-motion still, in seconds (D82)?

## Brief (owner's words, verbatim)

fixConclususPage 

firs tof all the background kinda sucks theres artifacts on the corners, and they dont extend, it should cover the entirity of the borders, making it feels like insid ethe game. 

seocnd, you put literally 3 tiles that are exactly the same, on the screen, just with diferent lamps. lame af dude , we should build some actuasl tiles 

second, the light from the lamps does not look «like the light of the game, should be like w ehave on the game dev segment, where the hevy light beacon is

3rd, form the 3 litle events w ehave, only the first works, the rest dont make any sense

(Screenshot attached with the brief: `projects/heavylight.html` at ~2000 px wide, "PLAY HEAVYLIGHT" hero, corner L masses cut off at the top-left, top-right and bottom corners, one small shelf with a lamp and one crate right of the hero, the page column over the dark #1a1d1f page background.)

## Scope

- In: `js/pages/heavylight.js` (ring, ledges, light, events) and its MAP.md row; the new `js/shared/heavylight-sprites.js` (D35) with its MAP row; in `js/gamedev/zones.js` only the move of `HPAL`/`HSPR` out to the shared file (D35); one `<script>` line each in `index.html` and `projects/heavylight.html` (D35); CSS only if the header offset needs it.
- Out (stays exactly as is): the page text and media in `projects/heavylight.html`, `js/pages/play.js` behaviour for other pages, the Conclusus page and toy, everything the bridge draws (it must look identical after D35), and the `report()` keys that tests read (extended, never renamed). The one XP change is D47: `play-heavylight-tower` is no longer fired; `play-heavylight` stays.

## Current state (explored 2026-09-28; anchors drift, grep the names)

- **Toy** `js/pages/heavylight.js` is 611 lines (MAP.md row still says 326: fix in the first code phase). `window.PlayHeavyLight {play,on,report}`. Consts: S=3, T=48, ARM=6, DEEP=2, SHELF_TILES=5, SHELF_GAP=40, SHELF_LIFT=4, EDGE=24, CW=42; BEAM `rgba(0,43,255,.20)`, CORE `rgba(140,180,255,.12)`, SHADE `rgba(4,21,34,.6)`, HALF0=20, SPREAD=tan 6°, OVER=24.
- **Corner masses** (`lShape`, `mirror`, `buildMasses`, `drawMasses`) are viewport-fixed Ls, 6×2 tiles (288×96 px), so they stop 288 px in and never run along the edges. The arm ends get a full rim cap, which reads as "cut off". They draw last, over the beams and shelves.
- **The artifact bug:** `mirror` swaps the 16↔128 nub bits for fx but never 32↔64. On both right-hand masses the SE inner nub of cell (1,1) lands in the wrong corner (inside the solid, or NE), and the real inner corner gets none. Those are the stray bright pixels at the corners (D3).
- **Header:** the topbar is fixed/sticky, about 56 px tall and z 3, over the play canvas at z -1, so it hides about 56 of the top masses' 96 px. `V.top` (play.js) exists but the toy never uses it.
- **Tiles:** a local `tileCanvas`/`backCanvas`/`maskOf` copy has one back-wall variant and 3 speckle variants. `js/gdworld/gd-heavylight.js` has 4 backs, `ridge()` steps and pattern batching, but no pillars. The game's real tile sprites are the zones.js `HSPR` set (`h_floor1 h_floorL h_floorR h_wall h_wallL h_wallR h_wallDrip h_dripL h_doubleFloor h_symbol1 h_plat h_platL h_airFloor1 h_pillarTop h_pillarBody h_pillarDrip h_spike h_box h_lamp h_key5`), assembled in `HL_GROUPS`.
- **Shelves** (`layout`, `TARGETS`, `LAMPS`) are three identical 1-tile-high rows of up to 5 tiles, beside `.embed-shell`, the lamps video and the journal img. Only the speckle v and the lamps differ between them (the brief's "3 tiles exactly the same").
- **Beams** (`face`, `wedge`, `coreWedge`, `drawBeams`) are axis-aligned trapezoids 40 px wide at the lamp, spread 6° per side and run to the screen edge. They have a blue BEAM fill plus a paler core, crate shadows cut out as SHADE rectangles, and a `P.glow` r30. There is no shimmer, and the beams draw over the crates. Lamp alpha = remaining time, so short slots never reach full brightness.
- **Bridge beacon light** (zones.js `BEAM` {x:58,y:58,half:6,ang:42°,spread:6°,over:24}): a single band `rgba(110,160,240, .20+.03·sin(3.1T))` (shimmer) that starts as wide as the `h_lamp` head face, is angled diagonally and runs to screen bottom + 24. It has no core and no shadows, and the crates draw under it. The lamp glow is a cached radial r26 `170,215,240` at .28. Crates fall in and ride the beam at 300. Everything is drawn at 3 px per art pixel.
- **Events** (`EVENTS`):
  - Event 0 works: a right lamp slides crate 0 off the shelf end, and it falls.
  - Event 1 is nonsense: the crate rises and moves *left*, away from the up beam, then drifts home. Neither beam ever touches it.
  - Event 2 is nonsense: the up/right/down flashes do not line up with the moves. The first move is a no-op, the crates arc into a tower with no beam on them, then all three fly right through the lamp sprite.
  - All three events teleport the crates home, dropping them from above the viewport.
- **Triggers:** an event starts when the shelf top is in the middle third of the screen, and a click near a lamp replays it. XP `play-heavylight` fires on start, `play-heavylight-tower` at the end of event 2. `atRest` is true when no lamp is on. `report()` gives masses/shelves/wedges/events/W/H. Events keep running when scrolled away, and the up/down beams are not culled.
- **Play layer** (`js/pages/play.js`, css/play.css): a fixed canvas at z -1 with DPR ≤ 2 and smoothing off. It is hidden below 900 px and shows one still frame under reduced motion. `V` gives W/H/top/blocks/gutter. The column is `.case` max 72rem, left-aligned, with gutter `clamp(1.25rem,5vw,5rem)`: at 1440 there is 360 px free right of the text, at 2000 about 928 px.
- **Page** `projects/heavylight.html`: embed-shell, The brief, The rule, Lamps + lamps.mp4, One new thing per level, The journal + journal.webp, The clues, Under the hood, Built to be reused, What it taught me.

## Option map (planning only; struck lines are settled by a D)

The research digest is `research/fixHeavyLightPage-00-intake.md`.

- **Border ring:**
  - (a) a true 9-slice with drawn corners, whole-tile edges and one filler tile (NES/SNES frames)
  - (b) autotile the ring as terrain with a 47-tile blob, so the corners come out right (Tiled/Godot autotile)
  - (c) ~~an uneven cave mouth that steps in and out~~ (D2)
  - (d) a dimmer parallax back layer behind the ring
  - (e) pixel-snapped integer scaling, to kill the seams
- **Ledges:**
  - (a) random edge variants (Celeste, Terraria)
  - (b) ~~hand-made templates, each marking where its lamp and crate sit (Spelunky rooms)~~ (D4)
  - (c) a decoration layer: moss, drips, chains, cracks
  - (d) the game's own `HSPR` sprites and pillars
- **Light:**
  - (a) ~~copy the bridge beam recipe exactly~~ (D5)
  - (b) hard 2–3 band wedge with a dither end
  - (c) beams stopped by walls and crates (ncase Sight & Light)
  - (d) dust specks
  - (e) additive glow on lit faces
- **Events:**
  - (a) one new idea per event, escalating
  - (b) a wind-up before each push
  - (c) the target visible from the start
  - (d) one thing moving at a time (Fischli & Weiss)
  - (e) settle and hold at the end
  - (f) start as each ledge scrolls in
- **Forced areas:** the header overlap, performance (the rAF loop is the bill), reduced motion (one still frame), phones (<900 hidden), MAP row 326 → 611, what stays (XP ids, `report()` shape, the text column).

## Open items

- none

## Decisions (owner answers; `(auto)` = taken while running, review at the end)

- **D1 · Which page.** "HeavyLight page": the plan covers `projects/heavylight.html` and its toy `js/pages/heavylight.js` only; the brief's "Conclusus" was a slip; file renamed fixHeavyLightPage. The Conclusus page stays untouched.
- **D2 · Border.** "Full ring, uneven": tiles on all four edges, unbroken, the inner edge stepping in and out (ledges, notches, a pillar) so it reads as a cave, not a picture frame.
- **D3 · Artifacts seen.** "Seams or jaggies": stray pixels, mismatched rim nubs, lines between tiles (not cut-off ends, header overlap or text overlap).
- **D4 · Ledges.** "Built pieces, each unique": each ledge beside the text is its own authored structure (steps, a pillar, an overhang, broken edges, bits hanging), like a chunk of a real level.
- **D5 · Light look.** "Same recipe exactly": reuse the bridge beacon beam (zones.js `BEAM`): the colour `rgba(110,160,240,.20+.03·sin(3.1T))` with its shimmer, a start as wide as the lamp face, the 6° spread, the r26 lamp glow, and crates drawn under it. Only the position and direction change per lamp. The page's own BEAM/CORE/SHADE go.
- **D6 · Event 1.** "Keep it, restage on new ledge": same idea (a lamp slides a crate off the end and it falls), rebuilt on the new unique ledge under the new light.
- **D7 · Events 2 and 3.** Owner, verbatim: "We dont need to make it special, just more complex, thats all. the rpbolem si that they dotn make sense, they arent pushing boxes at all, its just slop". So every crate movement must be caused visibly by a beam touching that crate, in the beam's direction. Events 2 and 3 are harder pushes of the same kind, not new concepts.
- **D8 · Ledge pieces per event.** Owner, verbatim: "the frist even can have 1 piece, the second 3, and the 4rth 5". Confirmed (D9): 1 / 3 / 5 built pieces, three events.
- **D9 · Pieces confirmed.** "1 / 3 / 5, three events": event 1 on one built piece, event 2 across three, event 3 across five. Still three events.
- **D10 · Event 2.** "Chain across the gaps": lamp A slides the crate off piece 1. It lands on piece 2, lower down, inside lamp B's beam, which slides it onto piece 3, where it rests. Two lamps and two pushes, and the crate is always inside the beam that moves it.
- **D11 · Event 3.** "Full climb, up and over": 3 to 4 lamps in turn (right, up, right, down), like a tiny solved level. One crate travels through all five pieces and ends on a goal ledge. It is lit the whole time it moves.
- **D12 · Header.** "Ring starts below it": the top edge of the ring starts at the header's bottom (`V.top`), so the header is the cave's ceiling and no tile is hidden.
- **D13 · Ring depth.** "1 tile, bulging to 2-3": a 48 px band on every edge, with bumps, pillars and ledges that reach 2-3 tiles inward in places. It never covers the text column.
- **D14 · Ring scroll.** "Fixed to the screen": the ring frames the window like the game camera's border. The event ledges scroll with the text.
- **D15 · Crates.** "1 / 1 / 1": one crate per event, so there is one object and one push at a time.
- **D16 · Trigger.** "Scroll in, click lamp to replay": each event plays once when its ledge reaches the middle of the screen, and clicking any lamp on that ledge replays it. It pauses while scrolled off (a fix for the current runs-offscreen behaviour).
- **D17 · Tile art.** "The game's own HSPR sprites": the ring and ledges are built from the real HeavyLight sprites in zones.js `HSPR`: floor/wall edges, drips, pillar top/body/drip, platforms, spikes, the symbol tile, assembled like `HL_GROUPS`. The page's procedural `tileCanvas` copy retires.
- **D18 · Beam directions.** "Straight: right, up, down": beams are axis-aligned like the game's lamps. They use the bridge's colour, shimmer, 6° spread and face-width start (D5), but no 42° tilt.
- **D19 · Beam stop.** "At the first solid tile": a beam ends where it hits a wall or ledge tile, so its length follows the geometry.
- **D20 · Shadows.** "No shadows, bridge-exact": crates draw under the beam with no cut-out, and SHADE retires.
- **D21 · Placement.** "Right gutter, stacked tall": each event is a vertical chunk in the right gutter beside its block (embed, lamps video, journal). Event 3's five pieces climb upward instead of spreading wide, so it fits in the 7 tiles free at 1440.
- **D22 · End state.** "Stays at the goal": the crate settles and holds where the pushes left it. A replay fades it out there and back in at the start, with no drop from the sky.
- **D23 · XP.** "Keep both ids, same moments": `play-heavylight` on any event start, and `play-heavylight-tower` when event 3's crate reaches its goal ledge.
- **D24 · Perf.** "Pre-render, draw only on change": the ring is rendered once per resize and the ledges once per layout. The loop redraws only while a beam is lit or a crate moves on screen, and the rAF sleeps at rest.
- **D25 · Still frame.** "Ring + ledges, each event mid-push": under reduced motion, one frame shows the full ring and all three ledges, with every event's lamp lit and each crate halfway through a push inside its beam.
- **D26 · Phones.** "Stay hidden": below 900 px the play layer stays hidden, as now.
- **D27 · Idle lamps.** "Dark, with a faint glow": at rest the lamps are off with a dim head glow, so the loop can sleep. The beams light only for pushes.
- **D28 · Lamp art.** "The game's lamp_right / lamp_up, as now": directional HeavyLight lamps, with lamp_up flipped for down.
- **D29 · Bulge count.** "By length, 1 per ~600 px": the number of bulges on each edge is edge length ÷ 600, rounded and at least 1. Their positions come from a fixed seed.
- **D30 · Right wall.** "Stay 1 tile there": the right wall bulges only in the top and bottom 20% of the window, so it never covers a chunk that is scrolling past.
- **D32 · Leftover.** "Let the ring run off-screen": the grid anchors at the top-left. The bottom and right edges run past the window and are clipped, and the bottom-right corner tile anchors to the window's corner. Nothing is squashed or cropped mid-edge.
- **D33 · Corners.** "Solid block, rounded inside": each corner is a solid rock tile, with the game's inner-corner edge piece on the inside angle.
- **D34 · Seam proof.** "Screenshots at 3 window sizes": snaps at 1440x900, 1920x1080 and 2560x1440, with all four corners zoom-cropped and read.
- **D35 · Sprite source.** "Move them to a shared file": HSPR (and the palette it needs) moves out of zones.js into a new `js/shared/heavylight-sprites.js` publishing one global. zones.js and the page toy both read it. `index.html` and `projects/heavylight.html` load it before their users, and the bridge must look identical afterwards.
- **D36 · Spikes.** "A few on the ring floor": one short spike row on the ring floor, decorative only and never on an event ledge.
- **D37 · Palette.** "The game's own colours": the sprites draw in the bridge's HeavyLight palette, unchanged and undimmed.
- **D38 · Fades.** "0.15 s on, 0.25 s off": the beam alpha ramps linearly from 0 to 1 over 0.15 s, holds, then ramps to 0 over 0.25 s.
- **D39 · Idle glow.** "Head glow at 25% of lit": at rest the r26 head glow shows at .07 alpha with no beam. It is static, so it is baked into the ledge pre-render.
- **D40 · Hold.** "0.4 s, then fade": after its crate stops, a beam holds for 0.4 s and then fades over 0.25 s. The next lamp starts only after that fade.
- **D41 · Event 1 landing.** "On a lower step of the same piece": the piece is an L, a 4-tile high shelf with a low step one tile below at its right end. The crate falls one tile onto the step and rests there in view.
- **D42 · Event 1 slide.** "3 tiles at 2 tiles/s": the crate slides 3 tiles in about 1.5 s, eases off the edge and falls with gravity in about 0.3 s.
- **D43 · Push start.** "When the lamp is fully on": the crate starts moving the moment its beam reaches full strength, at the end of the 0.15 s fade-in.
- **D44 · Event 2 hops.** "Piece 3 is one tile lower, crate drops in": each piece is one tile lower than the one before. The crate slides off an edge, falls one tile onto the next piece, and piece 3's slide ends against its end wall tile.
- **D45 · Speed.** "2 tiles/s everywhere": every push in all three events runs at 2 tiles/s.
- **D46 · Lamp B.** "Left end of piece 2, beam already on": lamp B fades in while the crate falls, so the crate lands in a lit beam and slides at once. Lamps A and B overlap for about 0.3 s, which conflicts with D40's "next lamp after the fade" (asked in the piece 7 round).
- **D47 · Event 3 simplified (supersedes D11; D23's tower id dropped).** Owner, verbatim: "simplify it, the goal is to like push something to the side agaisnt a wall that has a up lamp bellow it, and above anover lamp to the right so that the box goes right onc eit gets enough height instead of falling bakc down, and dont play heavylight tower". A right lamp pushes the crate against a wall. An up lamp below that spot lifts it up the wall's face. At the top a second right lamp pushes it onto the ledge above, so it does not fall back. `play-heavylight-tower` is never fired.
- **D48 · Overlap.** "Overlap across a fall only": when a push ends in a fall or a hand-off mid-air, the next lamp lights during it so the crate is never unlit in the air. Otherwise D40 holds.
- **D49 · Lift.** "Rises steadily at 2 tiles/s": the up beam lifts the crate straight up the wall face at the slide speed.
- **D50 · Goal mark.** "HSPR symbol tile in the floor": the upper ledge's resting spot has the symbol tile set in its floor, glowing faintly once the crate is on it.
- **D51 · Wall.** "3 tiles": the crate is lifted 3 tiles up the wall face, about 1.5 s.
- **D52 · Event 3 pieces.** "2 pieces: floor+wall, ledge": the floor piece ends in the 3-tile wall; the ledge piece sits on the wall's top and runs right.
- **D53 · Lamp 3.** "On a small block left of the wall top": a 1-tile stub at ledge height over the floor, its right beam aimed across the wall top.
- **D54 · Replay fade.** "0.3 s out + 0.3 s in": the crate fades out at its end over 0.3 s, fades in at its start over 0.3 s, then the lamps run.
- **D55 · Mid-play clicks.** "Ignored until it settles": a click while anything in the chunk moves or glows does nothing.
- **D56 · Affordance.** "Pointer cursor + idle glow brightens on hover": over a lamp the cursor is a pointer and its head glow goes from .07 to .14.
- **D57 · RM event 3.** "The up lamp, crate halfway up the wall": the reduced-motion still shows event 3's lift.
- **D58 · RM clicks.** "No, the still is final": with reduced motion there is no pointer cursor, hover glow or replay.
- **D59 · Resize.** "Rebuild ring; events reset to their start": a resize re-renders the ring, puts crates back at their start and clears the played-once flags.
- **D60 · Phase 1 review.** "Right" / "Full compare, all same": every one of the 50 snapshot scenes must read `same` after the sprite move.
- **D61 · Phase 2 review.** "Right" / "Agreed": the events stay as they are; there are corner snaps at 3 sizes.
- **D62 · Phase 3 review.** "Right" / "Agreed, and send me the pair": the report's screenshots include the lit-lamp shot beside the bridge beacon crop.
- **D63 · Phase 4 review.** "Right" / "Agreed": 4 frames per event, which Claude reads.
- **D64 · Tower listings.** "Leave the listings, just never fire it": only the toy stops firing `play-heavylight-tower`; XP tables, tests and HUD lists that name it stay as they are.
- **D65 · Phase 6 review.** "Right" / "Agreed": the full flow suite and snapshot compare, plus reduced-motion and 899 px shots.
- **D66 · Sweep.** D8/D9/D11's "5 pieces" for event 3 and D23's tower id are superseded by D47/D52 (2 pieces, no tower fire). Where they disagree, the later D wins.
- **D31 · Cave air.** "Nothing, page shows through": only solid tiles are drawn, and the page's own dark background is the open cave.
- **D67 (auto) · Leftover, on the grid.** The right wall and floor take every grid column/row that reaches within one tile of the window edge, so they are 48-95 px deep and clip at the edge. No tile is overlapped or squashed; this replaces D32's "corner tile anchors to the window corner". Reason: an overlapped tile would bring back seams (D3).
- **D68 (auto) · No left-wall bulge.** The gutter is 80 px at most, so a second tile would cover text (D13 beats piece 1's "pillar on the left wall"). Reason: D13 says never cover the text column.
- **D69 (auto) · Top/floor bulges in the right band only.** Ceiling and floor bulges and the spike row sit only right of the text column. The D29 count is capped at what fits there. Reason: D13.
- **D70 (auto) · Inner corners.** Where HSPR has no inner-corner sprite, the corner is painted with the rim pixels of the two meeting edge sprites. Reason: D33 asks for the game's edge piece, and HSPR has no dedicated one.
- **D72 (auto) · Spikes before mounds.** The spike row takes the first 3 floor columns right of the text column; floor mounds avoid them (±1), so at 1440 there is no mound (D69's cap). The right wall's ledge zones are rows 1..max(3, 20%) and 80%..floor, so every size gets one. Reason: D36 names the spikes; D69 already caps the count.
- **D73 (auto) · Lamps B and C sit in the riser.** A crate on a piece one tile lower is in the upper piece's row band, so any right beam that reaches it starts in the upper piece's end face. Lamp B is a wall lamp set into piece 1's end tile (`lamp_right` rows 0-6, the head, drawn over the tile's right part, emitter flush with the face) and lamp C sits the same way in piece 2's end tile. It is still "at piece 2's left end" (D46). Reason: a standing lamp there would overlap the falling crate.
- **D74 (auto) · Chunk width 6 tiles.** SHELF_GAP drops from 40 to 12 and EDGE to 0, so 1440 fits 6 tiles (300 px free). A chunk that does not fit is skipped, as today. Reason: event 2 needs 6 columns.
- **D75 (auto) · Event 3 chunk.** 6 cols x 5 rows, cells `[c,r]`: floor (0..3,4); wall (3,1),(3,2),(3,3); ledge (4,1) = `h_symbol1`, (5,1); end wall (5,0); stub (1,1). Crate home (1,4). The crate stops on the symbol tile against the end wall at (5,0), like event 2's end wall. Reason: D40 holds the beam 0.4 s after the crate stops, so something solid must stop it.
- **D76 (auto) · Floor lamp.** Lamp 2 is kind `floor`: `lamp_up`'s head (rows 0-6, cols 10-15, 6x7 art) set into floor tile (2,4), emitter flush with the floor top, centred under the crate's spot against the wall. Reason: a standing lamp_up (48 px) would block the slide; mirrors D73's wall lamp.
- **D77 (auto) · Goal glow.** Once the crate rests on the symbol tile, a static `P.glow` r39 `LAMP_GLOW` at .14 at the tile's top centre; cleared by a restart or relayout. Reason: "faintly" (D50) = the D56 hover level.
- **D71 (auto) · Ring over shelves until phase 3.** The ring draws last, where the masses drew, and shelves stop one EDGE short of the right wall. Reason: beams stop at solid tiles only from phase 3.
- **D78 (auto) · Sleep = Pacer park.** "The rAF sleeps at rest" (D24) is Play's shared Pacer: at rest and untouched 5 s it drops the rAF chain for a 10 fps timer. The toy's part is an honest `atRest`. Reason: Pacer is shared with every toy and the bridge; a full stop is a play.js change outside this plan.
- **D79 (auto) · Off-screen pause.** A shelf is off-screen when its chunk rect (`y` .. `y + rows*T`) lies wholly outside the viewport; its event steps, replay fade and lamp fades freeze there, and `atRest` ignores it. Reason: the chunk is where the action is; the beam alone does not keep the loop awake.
- **D80 (auto) · Replay machine.** A settled chunk (state idle/done, no lamp `on` or `a` > 0) takes a lamp click: from done, `out` 0.3 s (crate alpha 1→0 at its end spot, goal cleared), crate home, `in` 0.3 s (alpha 0→1), then `run` from step 0; from idle it runs at once. `play(k)` takes the same path. Reason: D54/D55 literally; idle has nothing to fade.
- **D81 (auto) · Every relayout is a reset.** Resize and a layout-signature change (load/font measure) both reset every event to idle, crates home, lamps off, goal off; the middle-third trigger then plays it again. Reason: D59; the old "done at home" state left a played event unplayable by scroll.
- **D82 (auto) · Hover and still pose.** Pointer + .14 glow over any lamp, whether or not the chunk is settled, re-checked on scroll; the reduced-motion still fast-forwards each event (1/60 s ticks, no XP) to t = 0.9 s, 0.4 s and 2.05 s: mid first slide for events 1 and 2, mid-lift with only the up lamp lit for event 3. Reason: D56 literal; times from the step lists at 96 px/s.

## Initial idea (Part B; prose, beginning to end, as the owner experiences it)

You open `projects/heavylight.html` on a desktop at 1440 px or wider. Before you read a word, you are inside a HeavyLight level. A band of the game's own stone runs round the whole window: under the header, down both sides and along the bottom. It is uneven, the way a cave is. The text column sits in the open middle of that cave. On the right, beside the playable embed, the lamps clip and the journal image, three built chunks of level wait. Each one holds a dark lamp and a single crate. As you scroll, each chunk reaches the middle of the screen and its lamps come on one after another, in the bridge beacon's own blue light. Each beam pushes the crate along the path it lights. Event 1 is one push. Event 2 is a chain across three pieces. Event 3 is a climb: the crate is pushed against a wall, lifted up its face and pushed onto the ledge above. The crate stays where it ends. Click a lamp and the event plays again. When nothing moves, nothing redraws.

### 1. The cave ring
- It is fixed to the window (D14) and runs on all four edges without a break (D2).
- Its top edge starts at the header's bottom (`V.top`), so the header is the ceiling (D12).
- It is 1 tile (48 px) deep everywhere, bulging to 2–3 tiles in a few places (D13): a pillar on the left wall, a stepped ledge on the right, a notch and a hanging drip in the ceiling, and a mound on the floor.
- Each edge gets one bulge per ~600 px of its length, rounded and at least 1. They are placed by a fixed seed, so the same window size always looks the same (D29).
- The left wall's bulges never cross the gutter into the text column (D13). The right wall bulges only in its top and bottom 20%, never beside the scrolling chunks (D30).
- Only solid tiles are drawn. The page's dark background is the cave's air (D31).
- It is pre-rendered once per resize into its own canvas and blitted each frame (D24).

### 2. Seams and corners
- The stray-nub bug (`mirror` never swapping 32↔64) goes away with the old L masses. The ring is built as one tile grid, so each corner is a real corner tile, not a mirrored copy (D3).
- Every tile sits on whole screen pixels. Tiles are 48 px at 3 px per art pixel, and ring positions are floored to integers, so no line or half-pixel appears between tiles.
- The grid anchors at the top-left. Where an edge is not a whole number of tiles, the bottom and right edges run past the window and are clipped, and the bottom-right corner tile anchors to the window corner. Nothing is squashed (D32).
- Each corner is a solid rock tile, with the game's inner-corner edge piece on its inside angle (D33).
- Proof: snaps at 1440x900, 1920x1080 and 2560x1440, with the four corners cropped and read (D34).

### 3. The tile vocabulary
- All art comes from the game's `HSPR` sprites (D17): floor and edge pieces, walls with drips, pillar top/body/drip, platforms, the symbol tile, and one short decorative spike row on the ring floor, never on a ledge (D36). They draw in the bridge's palette, unchanged (D37).
- The procedural `tileCanvas`/`backCanvas` copy in the page toy retires.
- HSPR moves out of zones.js into a new shared file, `js/shared/heavylight-sprites.js`, which both the bridge and the page load. There is one copy, and the bridge looks identical afterwards (D35).

### 4. The light
- It uses the bridge beam recipe exactly (D5): `rgba(110,160,240,.20+.03·sin(3.1T))`, starting as wide as the lamp face, spreading 6° per side, with an r26 `170,215,240` .28 head glow.
- Beams go straight right, up or down (D18) and stop at the first solid tile (D19).
- There is no core band and no crate shadow. Crates draw under the beam (D20).
- A lamp brightens over 0.15 s when it comes on and is fully lit while it pushes (this fixes today's "alpha = time left"). After its crate stops it holds for 0.4 s, then fades over 0.25 s, and only then does the next lamp start (D38, D40).
- The idle head glow is .07 alpha (25% of lit) with no beam, baked into the ledge pre-render (D39).
- At rest the lamps are dark with a faint head glow (D27). Sprites are `lamp_right` / `lamp_up`, flipped for down (D28).

### 5. Event 1: one piece, one push
- The chunk is one built piece (D8/D9): an L on a pillar, a 4-tile high shelf with a low step one tile below at its right end. A right lamp sits at the shelf's left end with the crate beside it (D41).
- The lamp fades in, and at full strength the crate starts moving (D43). It slides 3 tiles right along the beam at 2 tiles/s, eases off the edge and falls one tile onto the step in about 0.3 s, where it rests in view (D6, D41, D42).
- One crate (D15).

### 6. Event 2: a chain across three pieces
- Three built pieces step downward, each one tile lower than the last (D10, D44).
- Lamp A, at piece 1's left end, slides the crate off the edge. Lamp B, at piece 2's left end, fades in while the crate falls, so the crate lands in a lit beam and slides at once (D46). It drops one tile onto piece 3 and slides until it hits piece 3's end wall tile.
- Every push is 2 tiles/s (D45), and the crate is always inside the beam that moves it (D7). Lamps overlap only across a fall or a mid-air hand-off; everywhere else the next lamp waits for the 0.4 s hold and 0.25 s fade (D40, D48).

### 7. Event 3: the climb
- Built pieces in the right gutter (D21): two pieces (D52): a low floor piece ending in a wall 3 tiles tall (D51), and a ledge piece on top of that wall running right (D47).
- Lamp 1, a right lamp at the floor's left end, slides the crate right at 2 tiles/s until it stops against the wall (D45, D47).
- Lamp 2, an up lamp set in the floor at the foot of the wall, lifts the crate straight up the 3-tile wall face at 2 tiles/s, about 1.5 s (D47, D49, D51).
- Lamp 3, a right lamp on a 1-tile stub at ledge height left of the wall top (D53), lights as the crate reaches ledge height (a mid-air hand-off, D48) and pushes it right onto the ledge, so it does not fall back.
- The crate rests on the symbol tile set in the ledge floor, which glows faintly once it is there (D50).
- No `play-heavylight-tower`; the event fires only `play-heavylight` like the others (D47).

### 8. Trigger, replay, end state
- An event plays once when its chunk reaches the middle third of the screen (D16), and `play-heavylight` fires.
- It pauses while scrolled off.
- The crate holds at its end (D22).
- Clicking any lamp in the chunk replays the event. The crate fades out where it is and fades in at its start, 0.3 s each way (D54), then the lamps run again.
- A click while the event is still playing is ignored until it settles (D55).
- Over a lamp the cursor is a pointer and its idle head glow brightens from .07 to .14 (D56).

### 9. Rest, reduced motion, phones
- The loop redraws only while a lamp is lit or a crate moves (D24) and otherwise sleeps.
- Reduced motion: one still frame with the ring, all three chunks, each event's lamp lit and the crate halfway through its push (D25); in event 3 that is the up lamp with the crate halfway up the wall (D57). The still is final: no pointer, hover or replay (D58).
- A resize rebuilds the ring and resets every event to its start (D59).
- Below 900 px nothing is drawn (D26).

## Walk-through (one line per piece; the check is asked for every piece)

- **Piece 1 · Cave ring:** "That is it". D29-D31.
- **Piece 2 · Seams and corners:** "That is it". D32-D34.
- **Piece 3 · Tile vocabulary:** "That is it". D35-D37.
- **Piece 4 · The light:** "That is it". D38-D40.
- **Piece 5 · Event 1:** "That is it". D41-D43.
- **Piece 6 · Event 2:** "That is it". D44-D46.
- **Piece 7 · Event 3:** first check: free text, simplified (D47); overlap, lift, goal (D48-D50); rewritten, re-checked: "That is it". D51-D53.
- **Piece 8 · Trigger, replay, end state:** "That is it". D54-D56.
- **Piece 9 · Rest, reduced motion, phones:** "That is it". D57-D59.

## Constraints (every phase)

- Worktree mode: commit on `claude/conclusion-page-polish-a03117` by path; never push, never run `tools/bump.py`, never change an existing MAP.md row's line count (descriptions and new rows only).
- The main session never writes source files: every code change is an implementer spec; code reading goes through Explore.
- Plain HTML/CSS/vanilla JS, IIFE publishing one `window.X` global; no node. A new file over ~250 lines is written as a skeleton plus Edits.
- Art rules: `.claude/rules/art-style.md` (read before any drawing spec). The game's palette, unchanged (D37).
- Snapshots: a "before" `py -3 tools/snap.py capture` exists before the first code phase; every code phase compares against it and every scene it did not mean to change reads `same`. A `page-*` scene fails on any console error.
- Performance: the loop sleeps at rest (D24); nothing redraws per frame that can be pre-rendered.
- Below 900 px the toy draws nothing (D26); reduced motion is one still frame (D25, D57, D58).

## Progress

| # | Phase | Kind | Rests on | Status |
|---|---|---|---|---|
| 1 | Shared HeavyLight sprites | code | D35, D37 | done 3bfcf87 |
| 2 | Cave ring and seams | code | D2, D3, D12-D14, D17, D24, D29-D34, D36 | done 13e23ed |
| 3 | The light | code | D5, D18-D20, D27, D28, D38-D40 | done a2106ef |
| 4 | Events 1 and 2 | code | D6-D10, D15, D41-D46, D48, D73, D74 | done 1bb4d29 (design a66ff0d) |
| 5 | Event 3 | code | D21, D47, D49-D53, D75-D77 | done 76716f5 |
| 6 | Trigger, replay, rest, reduced motion | code | D16, D22, D24-D26, D54-D59, D78-D82 | done d6f2f62 (6a: pause, replay, reset) + ab825ea (6b: hover, reduced still) |

## Phases

### Phase 1 · Shared HeavyLight sprites (code)
- Pieces: 3 (the tile vocabulary's source).
- Deliverables: new `js/shared/heavylight-sprites.js`, an IIFE publishing one global holding the game's `HPAL` palette and `HSPR` sprites moved verbatim out of `js/gamedev/zones.js`; zones.js reads them from that global; a `<script>` line for it before zones.js in `index.html` and before `js/pages/heavylight.js` in `projects/heavylight.html`; a MAP.md row for the new file, zones.js's row description updated, the load-order section updated.
- Out: every pixel the bridge draws; `heavylight.js` behaviour (it only gains the script tag this phase).
- Verification: snap "before" captured first; after, `py -3 tools/snap.py compare <before> <after>` reads `same` on every scene; `py -3 tools/nav-flows.test.py --list` then the flows that load the bridge.
- Rests on: D35, D37.
- Reviewed: "Right"; verification "Full compare, all same" (D60).

### Phase 2 · Cave ring and seams (code)
- Pieces: 1, 2, 3.
- Deliverables: in `js/pages/heavylight.js`, the four corner L masses and the local `tileCanvas`/`backCanvas`/`maskOf` copy retire; one viewport-fixed ring tile grid from `V.top` to the window's bottom, 1 tile (48 px) deep, seeded bulges (one per ~600 px, rules of D13/D29/D30), corner tiles with inner-corner pieces, the floor's one spike row, all drawn from HSPR at 3 px per art pixel on whole pixels, pre-rendered once per resize into its own canvas.
- Out: the three chunks' events and lamps (they keep working as today until phases 3-5).
- Verification: `page-heavylight` scene has no console error; snaps at 1440x900, 1920x1080 and 2560x1440 with the four corners cropped and read (D34).
- Rests on: D2, D3, D12-D14, D17, D24, D29-D34, D36.
- Reviewed: "Right"; out-list and verification "Agreed" (D61).

### Phase 3 · The light (code)
- Pieces: 4.
- Deliverables: the bridge beam recipe (D5) for every lamp: straight right/up/down, stopped at the first solid tile, no core band, no crate shadow, crates under the beam; 0.15 s fade in, full while pushing, 0.4 s hold, 0.25 s fade out; idle head glow .07 baked into the pre-render; `lamp_right`/`lamp_up` sprites, flipped for down.
- Out: the ring from phase 2; event layouts (phases 4-5).
- Verification: `jscheck.py ... --shot` of a lit lamp next to a crop of the bridge beacon beam, read side by side; `page-heavylight` scene clean.
- Rests on: D5, D18-D20, D27, D28, D38-D40.
- Reviewed: "Right"; verification "Agreed, and send me the pair" (D62).

### Phase 4 · Events 1 and 2 (code)
- Pieces: 5, 6.
- Deliverables: event 1's built L piece (4-tile shelf, 1-tile-lower step), crate sliding 3 tiles at 2 tiles/s, ~0.3 s fall onto the step; event 2's three pieces each one tile lower, lamps A/B/C with B lighting during the fall (D48), crate ending against piece 3's end wall.
- Out: event 3; the ring; the light recipe.
- Verification: `jscheck.py` shots at the start, mid-slide, mid-fall and end of each event; `page-heavylight` scene clean.
- Rests on: D6-D10, D15, D41-D46, D48.
- Reviewed: "Right"; out-list and verification "Agreed" (D63).

### Phase 5 · Event 3 (code)
- Pieces: 7.
- Deliverables: two pieces (floor ending in a 3-tile wall, ledge on the wall top running right); lamp 1 right, lamp 2 up at the wall's foot, lamp 3 right on a 1-tile stub at ledge height; slide, 1.5 s lift, hand-off push onto the symbol tile, faint glow once there; `play-heavylight-tower` no longer fired by the toy, its MAP row says so, and any other listing of the id stays as is (D64).
- Out: events 1 and 2; any other XP id.
- Verification: `jscheck.py` shots at slide, mid-lift, hand-off and rest; grep proves `js/pages/heavylight.js` no longer fires `play-heavylight-tower`; `page-heavylight` scene clean.
- Rests on: D21, D47, D49-D53.
- Reviewed: "Right"; tower id "Leave the listings, just never fire it" (D64).

### Phase 6 · Trigger, replay, rest, reduced motion (code)
- Pieces: 8, 9.
- Deliverables: play once on the middle third with `play-heavylight`; pause off-screen; crate holds at its end; click a lamp to replay (0.3 s out + 0.3 s in), clicks ignored mid-play, pointer cursor and .14 hover glow; loop sleeps at rest; reduced-motion still (event 3 mid-lift, no clicks); nothing below 900 px; resize rebuilds and resets.
- Out: everything the earlier phases settled.
- Verification: full `py -3 tools/nav-flows.test.py` (known failures `gate-exits`, `worklink` "lands on Work"); full snapshot compare against the phase 1 "before": only `page-heavylight` scenes changed; a reduced-motion shot and a 899 px shot.
- Rests on: D16, D22, D24-D26, D54-D59.
- Reviewed: "Right"; verification "Agreed" (D65).

## Carry forward

- (phase 1) The sprites are `HeavyLightSprites.HSPR` / `.HPAL`, loaded on `projects/heavylight.html` before the toy. `pages/heavylight.js` still has its own `HPAL` copy (line ~21): drop it when phase 2 switches the toy to the shared sprites.
- (phase 1) `tools/jscheck.py --eval` needs an explicit `return <expr>` to print a value.
- (phase 1) MAP.md's `heavylight.js` row still says 326 lines (worktree rule: line counts change only on `--commit`); descriptions may be rewritten.
- (phase 3) Lamp state is `l.on` (seconds still wanted lit, set by events/`on()`) plus `l.a` (beam strength, ramps with `FADE_IN`/`FADE_OUT`). D40's 0.4 s hold after a crate stops is not coded yet: phase 4 adds it to each event's lamp windows. `reach(l, V)` gives the beam length to the first solid (ring or shelf); `report().wedges[]` gained `a` and `d`.
- (phase 3) The idle .07 head glow is drawn every frame from `P.glow`'s cached sprite (`drawGlows`), not baked into a ledge canvas: there is no ledge pre-render yet (D24, phase 4 or 6).
- (phase 4) k 0/1 are `CHUNKS[k]` (`cells [c,r]`, `lamps {kind,c,r}`, `crate {c,r}`) with `EVENTS[k].steps` (ops light/wait/slide/release/drop, run by `runSteps`); k=2 still uses the flat shelf (`OLD_GAP`/`OLD_EDGE`) and the old time-table. Phase 5 moves k=2 onto a chunk + steps and can then drop `OLD_*`, `towerOrder` and the `lamps`/`moves` path. Chunk bottom = old shelf bottom (`b.y + b.h - SHELF_LIFT`).
- (phase 4) Wall lamps (`SPR.wall`, 27x21) are drawn over their tile in the same blue as the tiles: at 1:1 they read faintly; the idle glow marks them. Zoom crop to judge: `C:/Users/Traff/AppData/Local/Temp/hl-p4/zoomB.png` (not yet looked at). If they vanish, a lamp colour tweak is a phase 6 polish item.
- (phase 4) A done event keeps its crate at the end spot until a relayout, which puts it home again (phase 6 end state/replay).
- (phase 5) All three shelves are `CHUNKS[k]` + `EVENTS[k].steps`; ops now light/wait/slide/lift/drop/release/goal. `OLD_*`, `LAMPS`, `towerOrder`, `E` and the moves/time-table path are gone; `evs[k]` is always `{state, t, i}`. A chunk cell's optional 3rd element overrides its tile name.
- (phase 5) Lamp kind `floor` (`SPR.floor`, lamp_up's head 6x7 art) sits inside floor tile (2,4) of event 3; at 1:1 it is hard to see beside the crate (phase 6 polish candidate, with the wall lamps).
- (phase 5) Up and floor beams do not stop at the crate: `reach` ends at the first ring/shelf solid, so event 3's lift beam runs ~776 px up past the crate, like event 2's up lamp. Leave unless phase 6 decides otherwise.
- (phase 5) `shelf.goal` (set by the `goal` op, cleared by `startEvent` and by relayout) drives the .14 symbol-tile glow in `drawGlows`; phase 6's replay must clear it on the 0.3 s out.
- (phase 5) Event timings at 96 px/s: event 3 ends at ~3.3 s. Shot script: `C:/Users/Traff/AppData/Local/Temp/hl-p5/shots.py` (hl-p4's covers events 1/2).
- (phase 6) Hover is `hover` ('k:i') set by `move`/`lampAt`, re-checked in `step` on scroll; the reduced still is `poseStill` (once per layout sig, `STILL_T`). Event 3's lit lamp in the still is the `floor` lamp (kind floor, shines up). `snap.py`'s `page-heavylight-*` scenes never show the toy canvas (same since before-p1 across every phase): judge the toy with Playwright probes (`hl-p6/probeA.py`, `probeB.py`), not snapshots.
