# conclususReview

Stage: running
Started: 2026-09-28
Procedure: `.claude/skills/plan/SKILL.md` (the interview, then "go").
Interview: A done · B done · 86 asked · C done (fresh reviews 1-7 answered as D43-D82; fresh review 8 found nothing open, D83 records its wording notes)
missed: (phase 6) how keys behave while landing no longer takes one and click pickup is not built yet → D85 (auto)
missed: (phase 8) the tray's bottom offset, since D79's 2rem overlapped the hint glyphs → D86 (auto)

## Brief (owner's words, verbatim)

conclususReview i wanna review conclusus page tgeres 2 issues that make the experience not every smooth
`first of all you might open the screena dnd you imedtially get some exp, this cant happen, you can also scrool down and get tons of exp at the same time, feels jack af, we need to build a proper flow here, maybe reduce the exp gainned if necessary, maybe extend the text so the page is longer, maybe in the top we shouldnt see much maybe just the dude,

the 2nd issue has also to do with jank, its just soemtimes it feels like things are janky, its not a smooth page. i cant put my finger on it why

## Scope

- In: `tools/snap.py` (`TOY_INK` only, D64), `tools/toyshot.py`, `projects/conclusus.html`, `css/style.css` (Conclusus rules only), `js/pages/conclusus.js`, `js/pages/play.js`, `js/lib/pacer.js`, `css/play.css`, `tools/scrollperf.py` (new), `tools/nav-flows.test.py` (new flows), MAP rows.
- Out (stays exactly as is): the copy and media (D4); the other three case pages and their on-load awards (D1); the other toys' look and behaviour; `js/site/xp.js`; the art files.

## Current state (explored 2026-09-28; anchors drift, grep the names)

- `projects/conclusus.html`: h1 + props + 1 intro paragraph + itch embed shell (hero), then 11 h2 sections (brief, controls, key and door, pins, shadow, silhouettes, thirty levels, polish, under the hood, built on HeavyLight, what it taught me), ~20 paragraphs, 5 lazy videos (no width/height), 1 lazy img, case-nav, footer. ~7-9k px tall at 1440 (estimate). Inline `XP.award("proj-conclusus",1)` on DOMContentLoaded (last script); the other three case pages do the same (`proj-heavylight` 1, `proj-sector-zero` 5, `proj-voidscape` 2).
- `js/pages/play.js`: one fixed viewport canvas (z -1), DPR ≤ 2, full clear + redraw every frame, `V.sy` read from scrollY in rAF, `topbar.getBoundingClientRect()` every scrolled frame, blocks measured at start / load / load+800 ms / resize only (no ResizeObserver), `award` once per id, glow cache cleared whole at 64 entries.
- `js/lib/pacer.js`: paints capped at 60 fps; after 5 s idle drops to 30 then a 10 fps timer; `wake` snaps back; dt clamped to 1/20 on unpark.
- `js/pages/conclusus.js` (814 lines; MAP says 499, stale): up to 40 platforms right of blocks (text: 1 at block bottom; media > 300 px: 2), each with a green twin; silhouettes every 4th platform from 3 (max 5); key k0 on platform 8 (2 if ≤ 8 platforms), others at ~45 % and ~78 % of the list; door on the last platform; 2 spike balls; 32 rain motes. Player spawns on platform 0 and teleports when his platform leaves the 30-62 % eye band, to the one nearest 46 % (timed first), 0.7 s cooldown, 30-particle burst at each end, twin planted, platform lit. `passThrough` lights every timed platform crossed (30 particles each). The band check runs on the first frame with cooldown 0.
- XP on this page: `proj-conclusus` (on open), `play-conclusus` (first click on a twin/silhouette), `play-cc-timed` (landing on a timed platform while scrolled: scroll only), `play-cc-key1..3` (arriving on the key's platform; a scroll teleport counts), `play-cc-win` (door click, or auto once the door is open and the viewport reaches the page bottom). A straight scroll to the bottom can earn up to 6.
- `js/site/xp.js`: `award` once per id; claims queue one at a time, each ~1.7 s (mote flight 780 ms, bar fill 820 ms, 120 ms gap), `xp:surge` per level (surge.js DOM rings/sparks), rank card on rank-up.
- `js/site/lazy-video.js`: IntersectionObserver (rootMargin 150 px) loads and plays/pauses videos as they scroll in.
- Tests: snap scenes `page-conclusus-desktop`, `page-conclusus-phone`, `page-conclusus-toy`; `py -3 tools/toyshot.py conclusus --y FRAC --t MS`; nav-flows `header`, `shell`, `links` touch the page; no test reads the toy's XP or teleports.
- Research digest: `.claude/plans/research/conclususReview-00-intake.md`.

## Option map (planning only; struck lines are settled by a D)

### Reading XP (`proj-conclusus`, now on open)
- Earn it at the end of the read · precedent: scrollytelling's "earned" final step · in ours: nothing moves on the chip until the reader reaches the last section.
- Earn it on the first deliberate action with the toy · precedent: tutorials that reward the first input · in ours: the first click.
- Drop it; the page's XP comes only from the toy.

### Toy XP from scrolling (timed, keys, win)
- Keys taken only by a click · precedent: the game's Symbol is touched on purpose · in ours: click the key, the dude teleports to it, it flies to the door.
- Keep scroll pickups but space them (one award per N seconds) · precedent: achievement-toast throttling.
- Fewer XP in total (e.g. toy + win) · in ours: less to earn, less noise.

### Top of the page
- Only the dude on load; platforms, rain, beacons and hint arrive as you scroll past the hero · precedent: a title screen holding one character before the level.
- The dude and his own platform only.

### Page length
- Extend the copy (new or longer sections) · the game's 30 levels give material.
- Keep the copy; spread the platforms differently.

### Jank
- Anchor the page-bound art (platforms, twins, keys, door) to the document so the browser scrolls it; the script canvas keeps only things that move · precedent: Firefox scroll-linked effects guidance.
- Keep one canvas; uncap fps, bucket glow radii, cap particles, drop per-frame layout reads · precedent: standard canvas hygiene.
- Measure first (scripted scroll + frame-time log), then fix what the numbers show.

## Open items

None. Ready gate passed 2026-09-28.

## Decisions (owner answers; `(auto)` = taken while running, review at the end)

- **D1 · Reading XP.** "End of the read": nothing is awarded on open; `proj-conclusus` fires when the reader reaches the last section ("What it taught me"). Only the Conclusus page changes; the other three case pages keep their on-load award. Settles: option map Reading XP.
- **D2 · Toy XP.** "Only by clicking": scrolling never pays. Keys float over their platforms and are collected by a click; the timed platform and the win also need a click. XP arrives one beat at a time. Settles: option map Toy XP.
- **D3 · Top of page.** "Just the dude": on open only the player stands beside the title on his one platform. Rain, other platforms, silhouettes, beacons and the hint arrive once the reader scrolls past the hero. Settles: option map Top of the page.
- **D4 · Page length.** Owner, verbatim: "dont change the text, i was more thinking on the space bewteen texts, maybe add iamges if necessary but not now, the space bewteen the images and tetx the space between the top of the screen and where the text starts, we can change those". So: no copy changes, no new images in this plan; the vertical spacing between blocks (text/media) and the gap from the top of the screen to where the text starts may change. Settles: option map Page length.
- **D5 · Jank approach.** "Measure, then fix all": a first phase records frame times during a scripted scroll and ranks the causes; then the page-bound art (platforms, twins, keys, door) is pinned to the page so the browser scrolls it with the text, and the other suspects (fps cap, idle park, glow rebuilds, particle bursts, per-frame layout reads, XP animations during scroll) are fixed; a final measure proves it. Settles: option map Jank.
- **D6 · Spacing.** "Top gap before the title" and "Between sections": more room between the top bar and the title so the dude has the opening screen to himself, and more air between sections so each toy beat has room. Media blocks keep their current margins. Settles: D4's where.
- **D7 · Dude on scroll.** "Still follows, pays nothing": he keeps teleporting to stay in view and leaves twins behind; landing gives nothing (no key, no lit timed platform, no XP).
- **D8 · Flow shape.** "One beat per stretch, in order": like a short level. First the play beat, then key 1, key 2, key 3 further down, then the door at the bottom. Each beat sits in its own stretch of the page, and the next lights up only once the one before is done.
- **D9 · XP amounts.** "Keep 7, click-paced", amended by D10/D11: same ids and amounts, each from its own deliberate beat.
- **D10 · Timed platforms.** "Remove the timed mechanic": no timed platforms, no `play-cc-timed` award; the door needs only the 3 keys. `passThrough` and the timed lighting retire.
- **D11 · XP total.** "Page holds 6": `proj-conclusus` 1 (D1), `play-conclusus` 1, `play-cc-key1..3` 1 each, `play-cc-win` 1.
- **D12 · Beat places.** "Spread by sections": play beside "The brief"/"The controls"; key 1 beside "Key and door"; key 2 beside "The shadow"; key 3 beside "Thirty levels"; the door beside "What it taught me".
- **D13 · Locked beat.** "Dim and unclickable": a not-yet-unlocked key is drawn faint grey, no glow, no beacon; clicking it does nothing; it lights (green, glow, beacon) when the previous beat is done.
- **D14 · Collected keys.** "Into a small key tray": a 3-slot tray in the bottom-right `.play-ui` panel; a clicked key spins into its slot; at the door the keys fly from the tray into the door.
- **D15 · After the win.** "Stays won": the door stays open with the keys in it and the dude stands in the arch; no reset (today's `restart()` after 1.5 s retires). A reload starts the toy fresh; XP is never given twice (XP ids are once-only).
- **D16 · Play beat.** "The green twin he left": when he follows the reader down from the title he leaves a green shadow on the platform he left; the hint reads "click a green shadow to step into it"; clicking it sends him back into it (the game's S key) and awards `play-conclusus`.
- **D17 · Reveal.** "Hero leaves, 0.6 s fade": when the bottom of the Play Conclusus embed shell scrolls above the middle of the viewport, rain, the other platforms, silhouettes, beacons and the hint fade in over 0.6 s and stay; scrolling back up never hides them.
- **D18 · Spacing.** "Title 18vh, sections 5rem": the gap above the title becomes 18vh; the margin above each `h2` becomes 5rem (both only on the Conclusus page).
- **D19 · Reading XP moment.** "Heading at mid-screen": `proj-conclusus` fires once, when the "What it taught me" heading's top scrolls above the viewport's middle.
- **D20 · Twins.** "Keep every platform's twin": every platform keeps its green twin (they arrive with the reveal, D17); clicking any twin, or the shadow he leaves (D16), sends him into it. The first such click awards `play-conclusus`.
- **D21 · Silhouettes and spike balls.** "Keep as scenery, beside 'The silhouettes'": the silhouettes (green/silver 1.2 s cycle, max 5) move to the platforms beside the "The silhouettes" section; the 2 spike balls stay decorative. Clicking a green silhouette still jumps him in; it pays nothing.
- **D22 · Key click.** "Teleports to it, then it flies to the tray": clicking a lit key bursts him out, he appears on the key's platform, the key spins into its tray slot (D14), and the XP claim starts.
- **D23 · Phones and reduced motion.** "Still frame, reading XP only": below 900 px and under reduced motion there is no playable toy and no toy XP (reduced motion keeps today's one still frame); the reading XP (D19) fires on every screen size and motion setting.
- **D24 · Tray look.** "3 dim key outlines, fill green": three small pixel-key outlines in grey inside the bottom-right `.play-ui` panel; each fills with the green key sprite when its key lands. The tray appears with the reveal (D17).
- **D25 · Door look.** "Locked B, open D": locked = `cc_door_new` (game file `Level/Door/New Folder/Door.png`) drawn dark, no glow, no beacon, unclickable; once all 3 keys are in the tray it switches to `cc_door_new2` (`New Folder/Door2.png`) with the pale glow pulse and its beacon, and becomes clickable. No new art.
- **D26 · Returning visitor.** "Same flow, no beacons for owned XP": beats still unlock in order on every visit and keys still go to the tray; a beacon shows only over a beat whose XP id is not owned; an owned beat plays its animation but starts no claim.
- **D27 · Beacons.** "Above the target", today's offsets: play = above the twin on the first platform beside "The brief" (-72 px); each key = 34 px above it; door = 52 px above it. A beacon shows only on an unlocked beat (D13) whose XP is not owned (D26).
- **D28 · Hints.** "Short, one action each": after the reveal "click a green shadow to step into it"; after the play beat "click the key to take it"; after key 1 and key 2 "another key waits further down"; after key 3 "three keys: open the door"; after the win the hint hides.
- **D29 · Key platform.** "First platform level with the heading": each key floats over the first platform whose top is at or below its section's `h2` top (D12 sections).
- **D30 · Door platform.** "First platform level with the heading": the door stands on the first platform at or below the "What it taught me" `h2` top; platforms below it stay as scenery.
- **D31 · Locked key look.** "Grey key at 40% opacity, still": the key sprite recoloured to greys, 40 % opacity, no spin, no bob, no glow; on unlock it fades to the green spinning key with glow over 0.4 s.
- **D32 · Locked door look.** "Arch B at 55% opacity, no glow": on key 3 it cross-fades to the lit arch D with glow over 0.6 s.
- **D33 · Reading mote.** "From the 'What it taught me' heading": the `proj-conclusus` mote starts at that heading's left edge and flies to the XP chip.
- **D34 · Flight times** (from memory `conclusus-what-the-code-actually-does`: the game's Symbol lerps to the door over 1 s): a clicked key flies to its tray slot in 1 s; on the win the three keys fly from the tray into the door together in 1 s. The walk into the arch keeps today's 120 px/s approach and the rain surge keeps today's `rainBoost` (from code).
- **D35 · Silhouette platforms** (from D21): the silhouettes take the platforms whose top lies between the "The silhouettes" `h2` top and the next `h2` top, at most 5, in order; none elsewhere.
- **D36 · Pinning.** "Page tiles": a layer inside the page holds canvases stacked down the page over the strip right of the text; the page-bound art, the dude and bursts draw there in page coordinates; only tiles on screen repaint; the browser scrolls them with the text. Rain alone stays on the fixed canvas.
- **D37 · Pass bar.** "Steady 60": scripted scroll top to bottom and back on the Conclusus page at 1440x900: p95 frame interval ≤ 18 ms, no frame > 50 ms, no layout read inside the toy's frame, the toy's own frame script < 4 ms at p95.
- **D38 · Order.** "Measure, pin, fix jank, then the flow": the flow phases are built on the pinned layer.
- **D39 · 60 fps cap stays** (from memories `lighter-means-cpu-not-visuals`, `bridge-cost-is-the-loop-not-the-art`: fans are the complaint): Pacer's 60 fps paint cap is kept; the fix is that scrolling wakes it and it never parks during a scroll (the tiles make scroll smoothness independent of the toy's paint rate).
- **D40 · Where the spacing lives** (from `css/style.css`): the 18vh replaces `.case`'s top padding (`clamp(2rem, 6vh, 4rem)`) and the 5rem replaces `.case h2`'s 2.5rem top margin, both under `.page-conclusus`.
- **D41 · Z-order** (from D36): rain on the fixed canvas (z -1), the tiles above it (z -1, later in the DOM), both behind the text; pointer input stays on window.
- **D42 · Tray panel.** "Only the 3 slots": a new bottom-right `.play-ui` panel created by `conclusus.js` holds just the three key outlines, no heading; the hint stays its own `.play-hint` line. Appears with the reveal (D17, D24).
- **D43 · Before the reveal.** "Waits, first jump at reveal": no band teleport before the reveal (D17); as the scene fades in he makes his first jump and leaves his green shadow on the title platform (D16). His idle ring draws with him from the start.
- **D44 · Key look.** "Symbol as today (pale)": keys stay the game's Symbol (`cc_symbol3`, SPR.sym) with today's pale glow; every "green key" in D13, D24, D31 reads "lit key". Tray slots are grey Symbol outlines that fill with the pale Symbol. Locked keys: the Symbol recoloured to greys at 40 % (D31).
- **D45 · After the win.** "Fades in, then follows again" (amends D15): he walks into the arch at 120 px/s and fades as today; 0.6 s later he reappears with a burst on the platform nearest 46 % of the viewport and follows the reader again, twins clickable. The door stays open with the three Symbols in it; no reset; XP once only.
- **D46 · Reduced motion.** "The full level, frozen": one still frame of every platform, twin, silhouette, grey locked keys and the closed door; no beacons, hint or tray; no toy XP (D23).
- **D47 · Phones and spacing.** "Desktop only": the 18vh and 5rem (D18, D40) apply only at `min-width: 900px`.
- **D48 · Technical picks** (owner: you decide), each binding on its phase:
  - Sections are found by the exact text of `main.case h2` (no HTML edits); every section, platform and reveal y is measured in `measure()`/`layout()` in page coordinates, never per frame.
  - Beat platform rule for all beats (play, keys, door): the first platform whose top is at or below the section h2 top and that no earlier beat holds; none qualifies → the next free platform below; the play beacon sits over the twin of that platform, or over the nearest twin when he stands on it.
  - Silhouette range (D35): top ≥ "The silhouettes" h2 top and < the next h2 top.
  - Silhouette clicks jump him in and never award or change the hint (D21); only twin/shadow clicks count for `play-conclusus`.
  - Particles: 16 per burst end; at 120 live, new particles are dropped; the win's three bursts are 16 each.
  - Tiles: x from min(`V.band.x0`, leftmost platform x) − 48 to the viewport right; `drawDoc` runs once per visible tile with that tile's clip and translation; each tile is cleared before it repaints; tiles entering the ±200 px range repaint before they show.
  - Fades: canvas art uses globalAlpha over 0.6 s; the hint and tray (DOM) use a 0.6 s CSS opacity transition, both started at the reveal.
  - Tray: a `.play-ui` panel with three 24×24 slot canvases (DPR ≤ 2), 6 px apart; a flying key draws on the fixed canvas in viewport coordinates, from its page position minus the live scroll to the slot's rect read once at click time.
  - Keys: click box 32×32 centred on the sprite; pointer cursor over a lit key; the dashed key-to-platform line draws only on lit keys.
  - Open door: the pale glow pulse (today's 0.35 ± 0.35 formula) runs only when open; the three Symbols sit in today's `doorSlot` positions.
  - Reading XP: `XP.award("proj-conclusus", 1, "Conclusus", x, y)` with x = heading left, y = heading vertical middle, viewport coordinates; besides the IntersectionObserver, a passive scroll check (heading top from a cached page y, compared to scrollY + innerHeight/2) awards it if a jump skipped the crossing.
  - Remeasure: the load remeasure stays; the ResizeObserver on `main` is debounced 150 ms.
  - scrollperf: an init script injected by the tool wraps `requestAnimationFrame` callbacks (per-callback ms) and counts `getBoundingClientRect`/`offset*`/`scrollY` layout reads made inside them; median per metric over 3 runs; `--bar` exits 1 on any FAIL; stamp `YYYYMMDD-HHMMSS`.
  - A D37 FAIL left after phase 5 whose cause is in `conclusus.js` is fixed in phase 10 as its own commit (a performance fix, not new behaviour).
  - Flows: `cc-read-xp` also runs at 390×844 (no toy, XP still awarded); `cc-win` = fresh storage, click a twin, keys 1 to 3 in order, then the door, from `PlayConclusus.report()` positions: all 5 `play-*` ids owned, door open.

- **D49 · Test hooks** (from review 2: `tools/jscheck.py` loads JS into a blank page and cannot click the case page; `tools/toyshot.py` loads the real page but cannot click):
  - `PlayConclusus.report()` returns `{ player: {x, y}, twins: [{x, y}], beats: {play, key1, key2, key3, door}, door: {open}, tray: <count> }`; each beat is `{x, y, locked, done}` in page coordinates (the point to click) or `null` until its phase builds it. `timed`, `bcTimed` and `lit` leave the report. Phase 6 sets the shape; phases 7 to 9 fill their beats.
  - `toyshot.py --click-beat KIND` (repeatable, run in order; KIND is `play`, `key1`, `key2`, `key3` or `door`): reads `report().beats[KIND]`, scrolls so that point sits at the viewport middle, runs 300 ms of frames, clicks it with the mouse, runs 1500 ms of frames; a null beat exits 1. Then `--y` and `--t` apply as today and the shot is taken.
  - Page-level "no console error" checks are the `page-conclusus-*` snap scenes and toyshot's own exit code; `jscheck.py` is not used on this page.

- **D50 · Glow bucketing.** "Conclusus only": the 4 px radius buckets and the 128-entry oldest-first cache apply only to toys with `doc: true`; every other toy's glow path is unchanged and stays `same` in snap.py.
- **D51 · Clicks during the reveal.** "After the fade": twins, silhouettes and keys ignore clicks until the 0.6 s reveal fade ends.
- **D52 · Empty tray slot.** "Flat grey Symbol": an empty slot is the Symbol sprite filled flat dim grey (#3a3f44); it is replaced by the pale Symbol when its key lands (amends D24's "outlines" and D44's "outlines").
- **D53 · Key/silhouette overlap.** "Silhouette moves": beats (D48 beat rule) are placed first; a silhouette whose platform a beat holds takes the next free platform in its D35 range, or is dropped if none is left.
- **D54 · Tile margin.** "Widen 80 px more": `docX0` = leftmost platform x − 128 (fallback `V.band.x0 - 128`); replaces the − 48 in D48 tiles and phase 3.

- **D55 · Technical picks, review 3** (owner: you decide, under D48), each binding on its phase:
  - scrollperf (P1): the toy's rAF callbacks are those registered from a stack containing `/js/lib/pacer.js` or `/js/pages/`; all others are reported as `other` and do not count toward D37's toy lines. Fresh storage; scrolling starts at `load` + 2500 ms; 500 ms pause at the bottom, not recorded; both directions pooled into one p95.
  - Reading XP (P2): the heading's cached page y is refreshed at load and by a ResizeObserver on `main` (150 ms debounce), so lazy videos cannot make it stale; the mote's start y is clamped to [40, innerHeight − 40]. `cc-read-xp` scrolls in 120 px wheel steps (IntersectionObserver path) at 1440×900 and 390×844, plus a case that jumps straight to the bottom with `scrollTo` (passive-check path).
  - Tiles (P3): the right edge is `document.documentElement.clientWidth`; a fixed pool of ceil((innerHeight + 400) / 1024) + 1 canvases is repositioned with `transform: translateY` inside rAF when their slot changes (no create/destroy during scroll); `.play-tiles` hides and shows with the fixed canvas (below 900 px, `stop()`). Under reduced motion with `doc: true`, play.js builds tiles for the whole document height once and paints them once (no loop), so D46's still frame covers the page.
  - toyshot (P1): its blank-toy ink check counts `canvas.play` plus every `.play-tiles canvas`. `--click-beat`: scroll the beat to mid-viewport, run 900 ms of frames (reveal fade + teleport settle), re-read the beat from `report()`, click, run 1500 ms.
  - Before-shots (P4): at the start of phase 4, before any change, `toyshot.py conclusus --y 0.3 --t 2000 --out <scratch>/before-03.png` and `--y 0.7` likewise; the after-shots are compared by eye.
  - Relayout (P4-P9): flow state (revealed, each beat's locked/done, tray count, door open, won) lives outside `layout()`; `layout()` re-places positions from that state; a key, door or win animation in flight snaps to its end on relayout.
  - `report()` (D49): a twin's x, y is its sprite centre (the click point).
  - Reveal DOM (P6): the hint and tray are created at setup with `opacity: 0; visibility: hidden` and a 0.6 s opacity transition; the reveal sets them visible; `[hidden]` is not used for them.
  - Play beacon (D48): "the nearest twin" = the existing twin closest in page distance to that platform's twin point.
- **D56 · Key done.** "When it lands": a key's beat is done when it lands in its tray slot (1 s after the click); the next key and its beacon light then, and the hint changes then.
- **D57 · Tray and hint.** "Tray above the hint": the hint stays at the bottom-right; the tray panel sits just above it, right-aligned (amends D42's placement).
- **D58 · Door lights.** "When key 3 lands": the 0.6 s cross-fade to the lit arch (D32) and its beacon start when key 3 lands in the tray.
- **D59 · Win path.** "Teleport, then walk": after the keys land in the door he bursts out, appears on the door platform beside the door, and walks into the arch at 120 px/s (D34).
- **D60 · Win order.** "Keys first, then he walks": click → the three keys fly 1 s from the tray into the door → he teleports and walks in (D59) → rain surge.
- **D61 · Win claim.** "When he enters the arch": `play-cc-win` is claimed (if unowned) as he reaches the arch and starts to fade, with the rain surge.
- **D62 · Tray after the win.** "Tray hides": when the keys leave for the door, the tray fades out over 0.6 s; the hint hides at the same moment (D28).
- **D63 · Silhouettes return.** "Return after 4 s": a silhouette he jumps into fades back in over 0.6 s, 4 s later.

- **D64 · Technical picks, review 4** (owner: you decide, under D48), each binding on its phase:
  - scrollperf (P1): frame intervals come from a separate probe rAF loop the tool injects (it runs every vsync, independent of Pacer's cap and park); the toy's own callbacks are timed for duration only. The tool prints the probe's median interval; D37's 18 ms bar assumes a 60 Hz display. Bottom = scrollY unchanged for 3 consecutive wheel steps. Chromium's default smooth wheel scrolling stays on (as the owner scrolls).
  - Ink check (P3): `tools/snap.py`'s `TOY_INK` counts ink on `canvas.play` plus every `.play-tiles canvas`; toyshot keeps calling `snap.toy_ink`. Phase 3 owns this edit, because tiles arrive there and phase 6 would otherwise fail the `page-conclusus-toy` top stop.
  - Phones (P3): the `@media (max-width: 899px)` rule in `css/play.css` that hides `.play, .play-ui, .play-hint` also hides `.play-tiles`.
  - Hygiene (P5): the topbar-on-resize read, the cached `V.sy` scroll listener and the ResizeObserver remeasure apply to every toy (no visual change; snap `same` proves it); only glow bucketing is `doc: true` only (D50).
  - Reduced motion (P6, P9): skips the reveal gate and shows the full level from the first frame (D23, D46); silhouettes at today's t=0 still-frame colour; all three keys grey locked; the door closed.
  - `report()` in phase 6: `key1..3` = `{locked: false, done: false}` (no lock state yet); `door` = `{locked: !open, done: won}`. `beats.play` (P7) = the beacon's live target (the twin it hangs over), so a re-read after settling always points at a clickable twin.
  - toyshot (P1): also `--show-beat KIND`: scroll that beat to mid-viewport and run frames without clicking (replaces `--y` for the shot); phase 7 checks the beacon with `toyshot.py conclusus --show-beat play`.
  - Reading XP fallback (P2): reaching the page bottom (scrollY + innerHeight ≥ scrollHeight − 2) also awards `proj-conclusus`, in case the heading cannot reach mid-screen.
  - Door clicks (P9, from D51): the door ignores clicks until its 0.6 s cross-fade ends.
- **D65 · Same-platform key.** "No teleport, key just flies": if he already stands on the key's platform, there is no burst; only the key flies. The burst plays only when he moves (amends D22).
- **D66 · Flight layer.** "On top of everything": a transparent fixed overlay canvas `canvas.cc-fly` (pointer-events none, above the text and the tray panel, DPR ≤ 2), created by `conclusus.js`, painted only while a key flies (click → slot, and tray → door on the win) and cleared after; flights are in viewport coordinates from the start point minus the live scroll to the end rect read at flight start (amends D48's "on the fixed canvas").
- **D67 · Tray panel.** "Snug around 3 slots": the same dark background and border as `.play-ui`, width fitted to the three 24 px slots (6 px gaps) plus the panel's padding, right-aligned just above the hint.
- **D69 · Snap run names** (from CLAUDE.md Verify; names only, fixed so each phase finds its baseline): phase 2 captures `cc-p2` and compares with `cc-before`; phase 3 captures `cc-p3` and compares with `cc-p2`; phase 5 captures `cc-p5` and compares with `cc-p3` (phase 4 touches only Conclusus, so non-conclusus scenes stay comparable). All live in this worktree's `snapshots/`.
- **D70 · Tray phase.** "Phase 8": phase 6 builds only the hint's hidden-then-reveal; phase 8 creates the tray hidden at setup the same way and hooks it to the reveal. D55's "hint and tray" reads as hint in phase 6, tray in phase 8.
- **D71 · Keys and door at the reveal.** "Fade in with the reveal": keys and door are hidden on open and fade in with the rest of the scene (D17) in today's look; phases 8 and 9 then give them their locked/unlocked looks.
- **D72 · Key XP start.** "At click, from the key": `play-cc-key<n>` is claimed on the click, the XP mote leaves from the key's position as today, flying alongside the key's 1 s arc; the key beat counts as done when the key lands (D56). Amends D22's "and the XP claim starts".
- **D73 · Win lock.** "Teleport and clicks": from the door click until he reappears (D45), the scroll teleport and every twin/shadow click are ignored; the sequence always plays uninterrupted.
- **D74 · Shadow he leaves.** "Twin moves to his spot": leaving a platform moves that platform's twin to where he stood (today's "twin planted"); one green figure per platform, never two. This is D16's shadow and D20's twin.
- **D75 · XP animations during scroll** (from Scope and D2, D11, D19): the D5 suspect is fixed by only clicks and the one reading XP paying; `js/site/xp.js` stays out of scope and untouched; phase 10's scrollperf run proves it.
- **D76 · Tile bounds.** "Clip to page height": phase 3 measures the page height with `.play-tiles` hidden, sizes the layer to exactly that height with `overflow: hidden`, and cuts the last canvas to what remains, so the layer never adds scroll and never feeds its own measure.
- **D77 · Hint after the reveal.** "D28's first line now": phase 6 sets the revealed hint to "click a green shadow to step into it"; phase 7 adds D28's later lines.
- **D78 · Win walk start.** "64 px left of the arch": in the win (D59) he appears 64 px left of the arch target (`door.x + 28 − 64`) and walks in at 120 px/s, about 0.5 s.
- **D79 · Tray gap.** "Fixed CSS offset": `.cc-tray` sits at `bottom: 2rem; right: 1rem`, clearing the one-line hint by about 0.4 rem; no JS measuring.
- **D80 · toyshot settle** (from D55, the later decision): `--click-beat` runs 900 ms of frames and re-reads the beat from `report()` before clicking; D55 amends D49's 300 ms.
- **D81 · Platform cap.** "Raise cap to 60 + check": with D18/D40's heading spacing every h2 gets its own platform, so 40 could run out before "What it taught me". Phase 6 raises `layout()`'s cap from 40 to 60 and verifies a platform exists at or below that h2 top.
- **D82 · toyshot ink check phase** (from D64, the later decision): D55's "toyshot (P1)" ink-check line lands in phase 3 as D64 says; phase 1 builds only `--click-beat`/`--show-beat`.
- **D83 · Wording notes, review 8** (each from the later decision): (a) hints: phase 6 sets D28's first line (D77), phase 7 adds the lines up to "click the key to take it", phase 8 the rest; (b) the phase-3 "only tiles overlapping the viewport ±200 px exist" is realised as D55's fixed repositioned pool; (c) silhouettes may share a key's platform between phases 8 and 9, phase 9 moves them (D53); (d) a door click after the win does nothing (D15, D45).
- **D84 · cc-read-xp stop (auto, phase 2).** At 1440x900 the page's max scroll leaves the "What it taught me" top 4 px below mid-screen, so on desktop the reading XP fires through the D64 bottom fallback, not the IntersectionObserver; the flow accepts "mid-screen or page bottom" and prints which path fired. Reason: D64 exists for exactly this; changing spacing or copy is out of this phase. Revisit if a later phase adds room below the last section.
- **D85 · Keys between phases 6 and 8 (auto, phase 6).** Landing no longer takes a key (D7) and click pickup is phase 8, so from phase 6 until phase 8 keys cannot be taken and the door cannot open; `grabKey` stays defined, unused. `hit()` no longer swaps the hint (the old "land on a key · light every dashed platform" line described retired mechanics); phase 7 adds D28's next line. `report()` also carries `revealed`, `rev` and `plats [{x, y}]` beside the D49 shape (the flow and the D81 check read them). Reason: the phase order in the plan; an interim key rule would be thrown away in phase 8.
- **D86 · Tray offset (auto, phase 8).** `.cc-tray` sits at `bottom: 2.6rem` (amends D79's 2rem): at 1440x900 the hint's glyph tops reach about 34 px, so 2rem overlapped them by a pixel; 2.6rem clears them by about 0.4rem, which was D79's intent. Reason: D79's gap target, measured.
- **D68 · Key flight.** "Eased arc, 2 turns": ease-in-out over 1 s (D34), rising then curving into the slot, two full turns, shrinking to slot size; the win's tray → door flight uses the same arc and easing, growing to door-slot size.

## Initial idea (Part B; prose, beginning to end, as the owner experiences it)

### 1 · Opening screen
The page opens with 18vh of empty dark above the title (D18). Beside the title, on one platform, stands the dude, idle (D3). Nothing else of the toy is drawn: no rain, no other platforms, no twins, no silhouettes, no beacons, no hint, no tray. No XP moves on the chip (D1). The copy is unchanged (D4).

### 2 · The reveal
The reader scrolls. When the bottom of the Play Conclusus embed shell passes above the middle of the viewport, rain, every other platform with its green twin (D20), the silhouettes and spike balls, the beacons, the key tray (D24) and the hint "click a green shadow to step into it" (D28) fade in over 0.6 s and stay, even if the reader scrolls back up (D17).

### 3 · He follows the reader
When his platform leaves the 30-62 % eye band he teleports to the platform nearest 46 % (0.7 s cooldown, burst at both ends, from code) and leaves a green shadow on the platform he left (D16). Landing never pays: no key, no XP, no lit platform (D7). Timed platforms and their lighting are gone (D10). The "h2" sections sit 5rem apart (D18), so each beat below gets its own stretch of page (D8).

### 4 · Play beat
Beside "The brief" / "The controls" a beacon hangs above the twin on the first platform there (D12, D27). Clicking any green twin or the shadow he left sends him into it, as the game's S key does, and the first such click awards `play-conclusus` (D16, D20). The hint becomes "click the key to take it" (D28), and key 1 lights.

### 5 · Three keys
Key 1 floats over a platform beside "Key and door", key 2 beside "The shadow", key 3 beside "Thirty levels" (D12) (D29). Locked keys are grey at 40 %, still (D31); the flight to the tray takes 1 s (D34). A key not yet unlocked is faint grey, no glow, no beacon, and ignores clicks (D13). Once lit (green, glow, beacon 34 px above), a click bursts him out and in on the key's platform, the key spins into its slot in the tray, and its XP claim starts (D22, D14, D11). After key 1 and 2 the hint reads "another key waits further down"; after key 3 "three keys: open the door" (D28). Scrolling past a key never takes it (D2).

### 6 · Silhouettes and spike balls
The silhouettes (green/silver 1.2 s cycle, max 5) stand on the platforms beside "The silhouettes" (D35); the 2 spike balls spin and bob as scenery. Clicking a green silhouette still jumps him in; it pays nothing (D21).

### 7 · The door and the win
The door stands beside "What it taught me" (D12) on the first platform level with its heading (D30); locked it is drawn at 55 % (D32); the keys' flight into it takes 1 s (D34). Locked it is the clean arch, dark, no glow, no beacon, unclickable; once the 3 keys are in the tray it becomes the weathered lit arch with a pale glow pulse and a beacon 52 px above (D25, D27). A click flies the three keys from the tray into the door, he walks into the arch and fades, the rain surges, and `play-cc-win` is claimed (D2, D14). It stays won: door open, keys in it; no reset (D15). 0.6 s after he fades he reappears with a burst on the platform nearest 46 % of the viewport and follows the reader again (D45). The hint hides (D28).

### 8 · Reading XP
When the "What it taught me" heading's top scrolls above the viewport's middle, `proj-conclusus` is claimed once, on every screen size, its mote rising from that heading's left edge (D1, D19, D23, D33). The other three case pages keep their on-load award (D1).

### 9 · Phones, reduced motion, returning visitors
Below 900 px there is no toy; under reduced motion there is one still frame; neither gives toy XP (D23). A returning visitor plays the same flow; beacons show only over XP not yet owned, and owned beats start no claim (D26). The XP total held by the page is 6 (D11).

### 10 · Smooth scrolling
A first phase scrolls the page by script and records frame times, then ranks the causes (D5). The page-bound art (platforms, twins, keys, door) is pinned to the page so the browser scrolls it with the text; the other suspects (fps cap and idle park, glow rebuilds, particle bursts, per-frame layout reads, XP animations during scroll) are fixed; a last measure proves it (D5).

## Walk-through (one line per piece; every piece is shown to the owner)

- 1 Opening screen: That is it (D3, D18).
- 2 The reveal: That is it (D17, D20, D24).
- 3 He follows the reader: That is it (D7, D10, D16).
- 4 Play beat: That is it (D16, D20, D27, D28).
- 5 Three keys: That is it; platform asked → D29; look → D31.
- 6 Silhouettes and spike balls: That is it (D21, D35).
- 7 The door and the win: That is it; platform asked → D30; look → D32.
- 8 Reading XP: That is it; mote → D33.
- 9 Phones, reduced motion, returning: That is it (D23, D26).
- 10 Smooth scrolling: That is it (D5); pass numbers and pinning go to Part C.

## Constraints (every phase)

- Copy and media unchanged (D4); only the Conclusus page changes, except `play.js`/`pacer.js`/`css/play.css`, where every other toy must stay `same` in snap.py.
- Plain HTML/CSS/vanilla JS, IIFE globals, no new libraries; tools in Python, `py -3`.
- The 60 fps paint cap stays (D39); no new per-frame layout reads.
- XP ids are once-only; the page holds 6 (D11).
- Phones (< 900 px) and reduced motion: no playable toy, reading XP only (D23).

## Progress

| # | Phase | Kind | Rests on | Status |
|---|---|---|---|---|
| 1 | Measure | code+research | D5, D37 | done 1e8c2bf |
| 2 | Spacing and reading XP | code | D1, D18, D19 | done 0eabc39 |
| 3 | Page-tiles layer | code | D36, D41 | done d3edc50 |
| 4 | Conclusus onto tiles | code | D36 | done a6fa965 |
| 5 | Other jank suspects | code | D37, D39 | done c8f3080 |
| 6 | Scroll pays nothing, opening, reveal | code | D2, D3, D7, D10, D17 | done bee5aaa |
| 7 | Play beat | code | D16, D20, D27, D28 | done ef32185 |
| 8 | Keys and tray | code | D12-D14, D22, D24, D29, D31, D34, D42 | done 9f1b34c |
| 9 | Door, win, silhouettes | code | D15, D21, D25, D30, D32, D35 | done 90a74aa |
| 10 | Final review | review | D11, D37 | todo |

## Phases

### 1 · Measure
Kind: code + research. Pieces: 10. Rests on: D5, D37, D38.
Research: frame-time capture in Chromium (rAF intervals, `PerformanceObserver` longtask and layout-shift, CDP `Performance.getMetrics`), then go past the list.
Design reads: `tools/toyshot.py`, `js/lib/pacer.js`.
Deliverable: spec 1, new `tools/scrollperf.py <page>` (Playwright, headed Chromium, 1440x900, DPR 1; wheel 120 px every 16 ms top to bottom and back; records rAF intervals, longtask and layout-shift entries, the toy's per-rAF-callback ms, CDP LayoutCount / RecalcStyleCount / ScriptDuration; median of 3 runs; JSON to `snapshots/perf/<page>-<stamp>.json`; `--bar` prints PASS/FAIL per D37 line). Spec 2, `tools/toyshot.py`: repeatable `--click-beat KIND` (D49), and it records console errors as today. Run scrollperf on `conclusus` and write `.claude/plans/research/conclususReview-01.md` ranking the causes with numbers. Capture `py -3 tools/snap.py capture cc-before`. MAP rows for `tools/scrollperf.py` and `tools/toyshot.py` (description only).
Verification: `py -3 tools/scrollperf.py conclusus --bar` runs to the end and prints a line per D37 bar (FAIL is expected now); the JSON exists; `cc-before` exists; `py -3 tools/toyshot.py conclusus --y 0.3` still writes its shot (no `--click-beat` yet: the beats arrive in phases 6 to 9).
Out: every page and script file (this phase writes only the two tools, the digest and the MAP rows).
Also: D48 (scrollperf line), D55 (scrollperf, toyshot), D64 (probe loop, bottom, --show-beat).
Reviewed: Right (Part C step 2).

### 2 · Spacing and reading XP
Kind: code. Pieces: 1, 8. Rests on: D1, D4, D6, D18, D19, D23, D33, D40.
Design reads: `projects/conclusus.html` (body, the last inline script, the "What it taught me" h2), `css/style.css` (`.case`, `.case h2`).
Deliverable: spec 1, `projects/conclusus.html` + `css/style.css`: body class `page-case page-conclusus`; remove the inline on-load `XP.award("proj-conclusus",1)`; add an inline IntersectionObserver (rootMargin `0px 0px -50% 0px`) on the "What it taught me" h2 that, once intersecting, awards `proj-conclusus` 1 with the mote starting at the heading's left edge, then disconnects; it runs on every width and motion setting (D23); plus the D48 passive scroll check (heading page y cached at load and refreshed by the D55 ResizeObserver; D64 bottom fallback; awards if scrollY + innerHeight/2 is past it, for jumps that skip the crossing); the mote's y is the heading's vertical middle in viewport coordinates. CSS, inside `@media (min-width: 900px)` only (D47): `.page-conclusus .case { padding-top: 18vh; }`, `.page-conclusus .case h2 { margin-top: 5rem; }`. Spec 2, `tools/nav-flows.test.py`: flow `cc-read-xp` (fresh storage: not owned after load; owned after scrolling the heading past mid-screen).
Verification: `py -3 tools/nav-flows.test.py cc-read-xp`, then `header`, `shell`, `links`; `snap.py capture cc-p2` + `compare cc-before cc-p2`: only `page-conclusus-*` differ (D69).
Out: copy, media, the other three case pages and their awards, everything under `js/`.
Also: D47, D48 (reading XP, flows), D55 (reading XP), D64 (bottom fallback).
Reviewed: Right (Part C step 2).

### 3 · Page-tiles layer
Kind: code. Pieces: 10. Rests on: D36, D38, D41.
Design reads: `js/pages/play.js` (V, measure, frame loop), `css/play.css`.
Deliverable: `play.js` opt-in layer when a toy's spec has `doc: true`: an absolute `div.play-tiles` appended to body after the fixed canvas (z-index -1, pointer-events none), spanning x from `spec.docX0` (a number the toy sets in its measure: leftmost platform x − 128, D54) or, when absent, `V.band.x0 - 128`, to the viewport right; canvases 1024 px tall stacked down the document height (clipped to the page height, D76), DPR ≤ 2; only tiles overlapping the viewport ±200 px exist and repaint, each on every painted frame through `spec.drawDoc(ctx, V)` with ctx clipped to the tile and translated to page coordinates; tiles rebuild on remeasure. `css/play.css`: `.play-tiles` and its canvases, and `.play-tiles` joins the phone hide rule (D64). `tools/snap.py`: `TOY_INK` counts tiles too (D64). The fixed canvas keeps drawing `spec.draw` (rain) behind the tiles (D41).
Verification: `snap.py capture cc-p3` + `compare cc-p2 cc-p3` (D69): every `page-*-toy` scene `same` (no toy opts in yet); the `page-conclusus-*` scenes pass (no console error).
Out: every toy file under `js/pages/` except `play.js`; `pacer.js`; the rest of `snap.py`.
Also: D48 (tiles), D54, D55 (tiles), D64 (ink check, phones).
Reviewed: Right (Part C step 2).

### 4 · Conclusus onto tiles
Kind: code. Pieces: 10. Rests on: D5, D36.
Design reads: `js/pages/conclusus.js` (draw functions, spec object), the `drawDoc` contract from phase 3.
Deliverable: `conclusus.js` sets `doc: true` and `docX0` (D48 tiles); platforms, twins, silhouettes, spikes, keys, door, player, bursts and beacons draw in `drawDoc` in page coordinates; rain stays in `draw`; behaviour unchanged; bursts drop to 16 particles per end with at most 120 live. MAP row description for `conclusus.js` (row length kept).
Verification: `py -3 tools/toyshot.py conclusus --y 0.3 --t 2000` and `--y 0.7` look as before (same art, same places); `py -3 tools/scrollperf.py conclusus` numbers go into Carry forward; `page-conclusus-*` scenes show no console error.
Out: flow and XP behaviour (phases 6 to 9), `play.js`.
Also: D55 (before-shots, relayout), D48 (particles, tiles); the idle ring and the door's key Symbols move to `drawDoc` too.
Reviewed: Right (Part C step 2).

### 5 · Other jank suspects
Kind: code. Pieces: 10. Rests on: D5, D37, D39.
Design reads: `js/lib/pacer.js`, `js/pages/play.js` (glow cache, topbar read, remeasure timers).
Deliverable: spec 1, `pacer.js`: option `scrollWake` (a scroll event wakes it; no park within 2 s of the last scroll; 60 fps cap kept). Spec 2, `play.js`: pass `scrollWake` for toys with `doc: true`; for toys with `doc: true` only (D50), glow radii bucketed to 4 px and the cache evicts oldest-first at 128 entries; the topbar rect is read only on resize; `V.sy` comes from a passive scroll listener that caches `scrollY` (never read inside rAF; D37 counts it as a layout read); a ResizeObserver on `main` replaces the load+800 ms remeasure.
Verification: `py -3 tools/scrollperf.py conclusus --bar` PASS on every D37 line (a FAIL whose cause is in these two files is fixed in this phase; any other FAIL goes to Carry forward with its number); `snap.py capture cc-p5` + `compare cc-p3 cc-p5` (D69): every non-conclusus scene `same`.
Out: `conclusus.js`, the flow.
Also: D50, D64 (hygiene for every toy), D48 (remeasure; a leftover conclusus.js FAIL goes to phase 10).
Reviewed: Right (Part C step 2).

### 6 · Scroll pays nothing, opening and reveal
Kind: code. Pieces: 1, 2, 3. Rests on: D2, D3, D7, D10, D17, D20, D77, D81.
Design reads: `js/pages/conclusus.js` (spawn, band teleport, `passThrough`, key pickup, timed, draw gating).
Deliverable: spec 1, `conclusus.js`: remove timed platforms, `passThrough`, `bcTimed`, `play-cc-timed`; a scroll teleport takes no key and awards nothing; `layout()`'s platform cap goes from 40 to 60 (D81); on open only the player and his platform draw; the reveal (bottom of `.embed-shell` above the viewport middle) sets the revealed hint to "click a green shadow to step into it" (D77) and fades in rain, other platforms, twins, silhouettes, spikes, beacons, keys, the door and the hint over 0.6 s (keys and door in today's look until phases 8 and 9, D71) and never hides again; clicks wait for the fade to end (D51); no band check before the reveal (D43); `report()` takes the D49 shape (keys under `beats.key1..3`, `beats.play` null until phase 7, `beats.door` from today's door). Reduced motion skips the reveal gate and keeps today's full still frame (D64; D46's locked keys and closed door land in phase 9). Spec 2, `tools/nav-flows.test.py`: flow `cc-scroll-pays-nothing` (fresh storage, scroll to the bottom and back: no `play-*` id owned; `report().beats.key1..3.done` all false).
Verification: that flow; a `PlayConclusus` dump at 1440×900 shows at least one platform at or below the "What it taught me" h2 top (D81); `toyshot.py conclusus --y 0 --t 1500` shows only the dude; `--y 0.3` shows the revealed scene; `page-conclusus-*` snap scenes pass.
Out: keys, tray, door (phases 8, 9); `play.js`.
Also: D43, D64 (reduced motion, report values), D55 (reveal DOM, relayout, report), D48 (sections, fades); the reveal y is cached in measure.
Reviewed: Right (Part C step 2).

### 7 · Play beat
Kind: code. Pieces: 3, 4. Rests on: D16, D20, D26, D27, D28.
Design reads: `conclusus.js` (twin click, beacons, `hintSet`).
Deliverable: `conclusus.js`: leaving a platform moves that platform's twin to where he stood (his green shadow, D74); clicking any twin or that shadow sends him into it; the first click awards `play-conclusus`; its beacon sits 72 px above the twin on the first platform beside "The brief", shown only while unowned; hints per D28 up to "click the key to take it"; key 1 unlocks on this beat; `report().beats.play` filled (D49).
Verification: `py -3 tools/nav-flows.test.py cc-scroll-pays-nothing`; `py -3 tools/toyshot.py conclusus --show-beat play` shows the play beacon; `py -3 tools/toyshot.py conclusus --click-beat play` exits 0 and its shot shows the hint "click the key to take it".
Out: the keys' look and the tray (phase 8).
Also: D64 (beats.play), D55 (play beacon, toyshot), D48 (beat platform rule, silhouette clicks); the shadow-on-leave already exists (keep it); phase 7 adds the lock state for key 1, phase 8 draws it.
Reviewed: Right (Part C step 2).

### 8 · Keys and tray
Kind: code. Pieces: 5. Rests on: D8, D12, D13, D14, D22, D24, D26, D27, D28, D29, D31, D34, D42.
Design reads: `conclusus.js` (keys, click), `css/play.css`.
Deliverable: spec 1, `conclusus.js`: keys over the first platform at or below the h2 tops of "Key and door", "The shadow", "Thirty levels"; locked = grey sprite at 40 %, still, unclickable, no beacon; unlock fades to the lit pale spinning Symbol with glow over 0.4 s (D44); a click bursts him onto the key's platform (no burst if he is already there, D65), the key flies 1 s into its tray slot on the `canvas.cc-fly` overlay (D66, D68), and `play-cc-key<n>` is claimed if unowned at the click, its mote leaving from the key (D72); hints per D28; the tray (D42) is created hidden at setup like the hint (D55) and appears with the reveal (D70). Spec 2, `css/play.css` + `tools/nav-flows.test.py`: tray styles (D57, D67; `.cc-tray` at `bottom: 2rem; right: 1rem`, D79) and `canvas.cc-fly` (fixed, inset 0, pointer-events none, z above `.play-ui`); flow `cc-keys` (play beat, then keys 1 to 3 clicked in order at `PlayConclusus.report()` positions; a locked key click does nothing).
`report().beats.key1..3` carry locked/done and `tray` the count (D49).
Verification: `cc-keys`, `cc-scroll-pays-nothing`; `toyshot.py conclusus --click-beat play --click-beat key1` (tray with 1 key) and `... --click-beat key2 --click-beat key3` (tray with 3) exit 0.
Out: door and win (phase 9).
Also: D44, D52, D53, D55, D56, D57, D65-D68, D48 (tray, keys, beat platform rule, fades).
Reviewed: Right (Part C step 2).

### 9 · Door, win, silhouettes
Kind: code. Pieces: 6, 7. Rests on: D15, D21, D25, D26, D27, D28, D30, D32, D34, D35.
Design reads: `conclusus.js` (door, win, `restart`, silhouette placement).
Deliverable: spec 1, `conclusus.js` (order per D58-D63): door on the first platform at or below the "What it taught me" h2 top; locked = `cc_door_new` at 55 %, no glow, unclickable; on key 3 it cross-fades over 0.6 s to `cc_door_new2` with the glow pulse and a beacon 52 px above; a click flies the 3 keys from the tray into the door in 1 s, he appears 64 px left of the arch target and walks in at 120 px/s (D78), `rainBoost`, `play-cc-win` claimed if unowned; it stays won; `restart()` and the bottom auto-win retire; from the door click until he reappears, the scroll teleport and every twin/shadow click are ignored (D73); the hint hides; silhouettes only on the platforms between the "The silhouettes" h2 top and the next h2 top, max 5; after the win he reappears and follows again (D45); reduced motion shows D46's frozen full level; `report().beats.door` and `door.open` final (D49). Spec 2, `tools/nav-flows.test.py`: flow `cc-win`.
Verification: `cc-win`, `cc-keys`; `toyshot.py conclusus --y 1.0` (locked door) and `--click-beat play --click-beat key1 --click-beat key2 --click-beat key3 --click-beat door --y 1.0` (open door) exit 0; `page-conclusus-*` snap scenes pass.
Out: `play.js`, `pacer.js`.
Also: D45, D46, D53, D55, D58-D63, D64 (door clicks, reduced motion), D66, D68, D48 (open door, silhouette range, cc-win steps).
Reviewed: Right (Part C step 2).

### 10 · Final review
Kind: review. Pieces: all. Rests on: D11, D37.
Deliverable: `py -3 tools/scrollperf.py conclusus --bar` PASS; `snap.py capture cc-after` + compare with `cc-before` (only `page-conclusus-*` differ); full `py -3 tools/nav-flows.test.py` (known failures only: `gate-exits`, `worklink`); MAP rows for `conclusus.js`, `play.js`, `pacer.js`, `tools/scrollperf.py`; a fresh subagent checks the whole branch diff against D1 to D49 and later Ds.
Verification: the commands above.
Out: any new behaviour; fixes found here land as their own small commits.
Also: D48 (leftover D37 FAILs in conclusus.js).
Reviewed: Right (Part C step 2).

## Carry forward

- Phase 1 (digest `research/conclususReview-01.md`): at 165 Hz the toy paints on every 2nd or 3rd refresh (gaps 12, 18, 24, 30 ms) and misses 63% of the moving refreshes. That is the visible jank, and pinning fixes it. The only D37 FAIL is layout reads: 404 per scroll, `play.js:99` `scrollY` and `play.js:101` topbar rect (phase 5). Phase 10: D37's frame bars pass trivially on this panel, so also report the toy's paint gaps.
- Phase 2: the "What it taught me" h2 has `id="cc-taught"`; the reading-XP IIFE is the last inline script in `projects/conclusus.html`. On desktop the heading cannot reach mid-screen (max scroll leaves it 4 px short), so `proj-conclusus` fires via the bottom fallback there (D84); phone fires via the IntersectionObserver. `cc-read-xp` prints which. `snapshots/cc-p2` is phase 3's baseline (D69).
- Phase 3: `drawDoc(g, V)` contract: g is already clipped to one tile and translated so page coordinates draw as-is (x = page x, y = page y, same as `V.blocks`); it runs once per shown tile per painted frame (2 to 3 tiles at 1440x900), after `spec.draw`, so drawDoc must be pure drawing (no state stepping; step in `spec.step`). `spec.docX0` is re-read every frame (a change relayouts the tiles, no layout read), so the toy may set it in its own layout at any time. Reduced motion paints every tile once at start (no load remeasure). `handle.tiles` is the `.play-tiles` div. The layout reads phase 5 fixes moved: `play.js:194` `scrollY` and `play.js:196` topbar rect (were 99 and 101). `snapshots/cc-p3` is phase 4's and phase 5's baseline; cc-p2 vs cc-p3: 67/67 within 0.5%.
- Phase 4: `conclusus.js` sets `doc: true` and `spec.docX0` (in `layout`: min of platform and spike x − 128, `undefined` with no platforms); `draw` holds rain only, `drawDoc` everything else in page coords. drawDoc culls with `offTile(y)` against the tile band read from `ctx.getTransform()` (±160 px), never against `V.sy`, because tiles do not repaint while the toy rests. `burst` = 16 particles, dropped at 120 live. scrollperf (1440x900, 165 Hz panel, median of 3): frame p95 6.2 ms, max 24.2, over 50 ms 0; toy callback p95 0.50 ms, max 2.30; layout reads 410 per scroll (`play.js:194` scrollY 274, `play.js:196` topbar rect 130, `xp.js:259` 1): still the only D37 FAIL, phase 5's. Longtasks 0, layout shift 0. JSON `snapshots/perf/conclusus-20260928-204508.json`. toyshot inked px rose (12574 → 32849 at 0.3) only because the ink count includes the off-screen parts of the 1024 px tiles; the shots match the before-shots. `compare cc-p3 cc-p4`: conclusus scenes 0.00-0.04%.
- Phase 5: `pacer.js` `scrollWake` option (window scroll → `wake()`, no idle park within 2 s of a scroll; 60 fps cap untouched); `play.js` passes it for `doc: true` toys and its own scroll listener wakes only non-doc toys. `V.sy` is `syCache` (set by the passive scroll listener and `measure()`), the topbar rect is read only when `topDirty` (start, resize), and a ResizeObserver on `main` (150 ms debounce) replaced the load+800 ms timer (the load `measure()` stays). Glow with a doc toy: `glowDoc` flag, R bucketed to 4 px, sprite drawn scaled to the exact r, 128-entry oldest-first eviction; other toys unchanged. `scrollperf --bar`: frame p95 6.2 ms, max 18.2, toy p95 0.20 ms, reads 410 → 1. Only FAIL left: one `getBoundingClientRect` at `js/site/xp.js:259` (the XP award ceremony reading the chip rect when `proj-conclusus` fires at the page bottom, D84). Not in `conclusus.js`/`play.js`/`pacer.js`: phase 10 reports it (and decides whether xp.js, outside this plan's In list, gets a cached chip rect or the bar treats a one-off award read as exempt). `snapshots/cc-p5` is the latest full run; cc-p3 vs cc-p5: 75/75 within 0.5%, only conclusus toy scenes and bridge noise (0.00%) not `same`.
- Phase 6: `conclusus.js` module state `revealed, revT, rev, revealY` (layout sets only `revealY` = bottom of the `.embed-shell` block; the rest survives relayout/restart). The reveal check and `rev` ramp run in `step` before the camera-follow block, so the first jump lands on the reveal frame. `drawDoc` draws the player's platform, idle ring, player and bursts always; everything else is wrapped in `globalAlpha = a` (`a = rev`), every `P.glow` alpha × a, `drawBeacon(..., a)` has a trailing alpha param. `showHint()` makes the hint visible (inline opacity/visibility, 0.6 s transition); `hintSet` still sets text + `hidden=false` and is now unused. `press` returns false while `rev < 1`; `move` clears hover. `grabKey` is unused until phase 8 (D85). `report().twins` = sprite centres (`p.x+32, p.y-26`), keys' beats = `k.x+16, k.y+16`, door beat = `door.x+28, door.y+32`. Flow `cc-scroll-pays-nothing` (fresh storage, wheel to bottom and back, no `play-*` owned, keys not done, still revealed, a platform at or below `#cc-taught`) passes. `snap.py capture cc-p6 --only conclusus`: vs cc-p5, toy-top 0.67 % and toy-mid 0.65 % (intended: the dude alone at the top; the timed dashes gone), toy-low 0.30 %, desktop 0.01 %, phone same; no console error.
- Phase 7: `conclusus.js` `playPlat` (layout, "The brief" h2 by exact text, before silhouettes, which skip it) and `playDone` (flow state); `playTarget()` (the brief's twin or the nearest twin) feeds the beacon and `report().beats.play`; `playBeat` replaces `hit`: first twin click awards `play-conclusus`, hint "click the key to take it", unlocks key 1; keys carry `locked` and key beacons draw only when unlocked; silhouette clicks never award. At 1440x900 toyshot's settle lands him on the brief's platform, so the beacon sits over the twin just above it. No snap run (toyshot exit 0 for show-beat and click-beat).
- Phase 8: `conclusus.js` keys carry `got` (clicked), `done` (landed), `lit` (0-1 unlock fade) and `fly {t, x0, y0 page, tx, ty viewport, ang0}`; `placeBeat(y, held)` is the D48 beat rule (use it for the door, with held = playPlat + key plats); `lockKeys()` runs after `restoreProgress` in `layout`; `takeKey` (press) → `landKey` (step, at fly.t 1) fills the slot, unlocks the next key, sets the hint. `doorOpen()` uses `done`; the door no longer draws landed-key dots (phase 9 draws the Symbols at `doorSlot`, still defined, unused). `paintFly` runs first in `draw` on `canvas.cc-fly` (`flyG`, `flyDpr`, `flyDirty` = one clear after the last flight); `sizeFly` in setup and layout. Tray `trayEl`/`slotEls` built in setup, `showUi()` (was `showHint`) reveals hint + tray. `SPR.symGrey`/`symEmpty` copy the def with `_s2: undefined` (P.sprite caches per def). `move` checks keys before twins; a locked key's box swallows the click and the twin hover under it. `restart()` resets keys/slots but not the hint text (phase 9: D28 hides the hint after the win). Flow `cc-keys` passes. No snap run: toyshot covers the console check.
