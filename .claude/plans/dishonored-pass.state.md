Status: phase-done
# Plan state: dishonored-pass

## Plan
dishonored-pass, `.claude/plans/dishonored-pass.md`. Branch `claude/website-visuals-beacon-updates-bd988c`, worktree `C:/Users/Traff/Desktop/sebas/Portfolio/.claude/worktrees/website-visuals-beacon-updates-bd988c`.

## Architecture now
- tools/snap.py: 79 scenes, compare lists 87; flags `--phone-width <px>`, `--reduced-motion`, `--only <token>`. `bridge-void-bnote-*` and `bridge-phone-landscape-bnote` open a popup (`open_note()`). tools/pagecheck.py: weight, perf, scroll, hidden, clipped, bare, tilted.
- css/style.css `:root`: `--wash`, `--smoke`, `--stroke`, `--tear: 25px`, `--slab-scrape*` unchanged; `--lamp`/`--lamp-rgb` root gold now reaches only Scope-Out rules (`#bridge-map`, `#bridge-cursor`); `.bnote` sets its own cream `--lamp-rgb`.
- Case pages: `.folder-body > .case::before` painted wash, opaque under 900 px, translucent/masked clear on the toy band from 900 up (style.css); child `p`, `ul`, `h2` are torn strokes, `h2` opens a wash gap; `.work:has(.case-folder.open)::before/::after` wash the closed rows below/above the open folder, by `grid-row` per game; open row hairline `.obj[aria-expanded=true]::after` (folder.css). `.folder-kicker` letter-spacing .26em under 420 px fixed the 375 overflow.
- Case hold (phase 12, D69): js/site/entry.js adds `html.case-hold` for case hashes; css/gate.css hides the body while set (3 s fallback, `!important` so it survives reduced motion); js/site/folders.js lifts it after the open and landing, once the page loaded. `--smoke` no longer on the footer or `.work`; `.gate-panel` fade 0.2 s.
- Gate (css/gate.css): wall wash 0.9 veil (D57), tilted, off-centre `.slab` with its own polygon, Oranienbaum caps title. `.gate-stage::after` is gone (c3f036d); phone stage 78vw, translate(-1vw,4vh). SYSTEMS on a solid `--type-red` strip; CONTINUE has the 5 px frame.
- Veils `.rank-veil`, `.glimpse-veil` (css/beacon.css): wall wash 0.9. Cards `.slab` + ink (js/site/surge.js).
- `.bnote` (css/bridge.css): content-sized plate, 5+5 vertex polygon with depth up to 6 px, scrolls inside, no red hairline, stroke 1.0, cream `--lamp-rgb`; js/bridge/bridge-notes.js `placeNote` clamps against `--inst-w` (`rMax`) and keeps clear of the top bar and `#bridge-hint` (D62).
- css/bridge.css `.rotate-skip` cream with a quiet underline; `#bridge-map .you`, `#bridge-cursor::after` use `--type-cream` (fd54cb0).
- Dirt (phase 10, narrowed by phase 13): css/art/dirt-a.webp, dirt-b.webp; style.css `:root` `--dirt-a`, `--dirt-b`, `--dirt-size`, `--paint-streaks` (a full `background` layer: use the shorthand, never `background-image`). Wall only now: gate wall, `.rank-veil::before`, `.work` washes, 404 wall. No plate uses them.
- Plates after phase 13: no ink svg or `#ink-cluster` symbol anywhere; every plate polygon has one vertex per corner side (straight sides), rough top and bottom. Plates scope their own polygon or `--slab-scrape*` because style.css 105-322 is not edited, so `.slab::before` and the dead `.ink` rule (119) still sit there. `.case-nav a::before` has its own polygons; `--btn-scrape` is unchanged (top bar, buttons). `.bnote::before` holds only the phone red hairline. `.folder-body > .case::before` background is `var(--smoke), var(--wash)`.

- Red lines (phase 14): js/site/redlines.js, `window.RedLines`, one `svg.redlines` per `[data-redlines]` plate, edge read from the plate's `::before` clip-path, seeded per plate, `kind` presets (`item` for cards and notes), shared debounced ResizeObserver. Notes: the svg is a sibling of `.bnote`, kept in step by `placeNote`. 404 draws on `.void-note` and `.foot-text`; surge.js calls `RedLines.draw` on the cards. Open row: `.obj[aria-expanded=true]` plain frame on black, neighbours within 60 px of it hide their pieces at the toggle and 700 ms later.

## Completed phase
15 (rest, D85) · Desktop cut on the branch as 83a017c, judge-d85 FAIL on the phone set only, stopped (D86). The brief named phase 11 again; row 11 stays blocked (D65), so it was ignored.
- Shots for the owner: `%TEMP%/dp-pass/p15/d85/` (`<case>-bottom-1440`, `-375`, `-crop-bottom-1440`, `-crop-bottom-375`, for sector-zero, heavylight, conclusus). Reports `p15/judge-d85.md`, `p15/d85/verify.md`.
- js/site/redlines.js: `textLimit` deleted, from 900 up `o.textR` is `W * 0.81`, which also turns the right vertical off, so no corner or stub. 0.81, not the mask's 85% stop: 85% ended 43 px past the visible fade at 1440. Reds end at the fade at x 778, 1007, 1015 at 1000, 1440, 1920. Top pieces uncapped: they never reach the fade. CSS not edited.
- Phone: path `d` identical before and after at 375 on all three cases. Red pixels on body text at 1440: 0.
- Checks: capture `dp-d85` 79/79. `snap.py compare dp-d83 dp-d85`: 82 same, 5 ok (`page-*-desktop` 0.02-0.04%, `bridge-void-bnote-land` 0.00%), no console errors. `page-voidscape-desktop` 0.02% is on the list although voidscape is not one of the three cases shot; not looked into, the size is noise level. Flows `deeplink`, `back`, `reload`, `work-open` pass; `worklink` only the known failure. Toyshot all three exit 0. Pagecheck `index.html#sector-zero` exit 0 at desktop and phone.
- Open: the implementer saw failed resource loads as console noise; the URLs were not named and snap.py does not log them, so they are unidentified. Not compared against d8101d4.
- Judge: 1440 passes all three statements on all three cases (no vertical or stub, ends at the fade, off the toy, mixed ends). 375: no tiny ticks 3 of 3; mixed ends visible 0 of 3 (pieces too thin to show end shapes, even at 3x); corner 0 of 3 (small even crosshair, a plain plus although both edges overshoot). No change from d83 at 375, as expected: D85 kept the phone set.

Earlier in phase 15: 15 (rest, D83) · Tuning on the branch as d8101d4, judge-d83 FAIL, stopped (D84).
- Shots for the owner: `%TEMP%/dp-pass/p15/d83/` (`<case>-bottom-1440`, `-375`, `-crop-corner-1440`, `-crop-vert-1440`, `-crop-bottom-375`, for sector-zero, heavylight, conclusus). Report `p15/judge-d83.md`. No verify or implementer report file: those notes went in the replies, numbers below.
- js/site/redlines.js, case plates only: right vertical half the left (3 and 6 px at 1440, 1.5 and 2.6 at 375), 40 px floor on pieces, seeded square and tapered ends, damage stops at 60% of the stroke, from 900 up the reds lay out to the widest text child's right edge plus 20 px (1100 of 1152). The first build stopped at the mask's 30% stop and cut through body text, so a second spec moved the limit before judging.
- Checks: `snap.py compare dp-d81 dp-d83`: 74 same, 13 ok (12 `page-*` 0.03-0.08%, `bridge-void-bnote-land` 0.00%), no console errors. Flows `deeplink`, `back`, `reload`, `work-open` pass; `worklink` only the known failure. Toyshot both exit 0. Pagecheck exit 0 at desktop and 375, no overflow.
- Judge: rod gone (S1 3 of 3), ticks gone (S3 3 of 3). Fails: 375 no visible taper, 1440 HeavyLight's vertical runs through the left end of the blue toy, every 1440 case the vertical and corner stand about 160 px past where the plate visibly fades, corner reads as a T at 1440 and a plain plus at 375.
- Disagreement: the implementer's red-on against red-off toy measure gave 0 hits on HeavyLight, the judge sees contact in the 1:1 shot at the top of the viewport. The measure was not re-run; the judge's reading stands.
- Not exercised: no damage landed on a horizontal piece for the seeds shot.

Earlier in phase 15: 15 (rest, D81) · D81 fix on the branch as 71b97fd, judge-d81 FAIL, stopped (D82). Main 84ad4c3 merged at c5a79a5 at the start hook's order.
- Shots for the owner: `%TEMP%/dp-pass/p15/d81/` (`case-bottom-*`, `corner-*-x3`, `bottom-*-x3` at 1440 and 375). Reports `p15/d81/measure.md`, `p15/judge-d81.md`.
- Cause measured: no clip. Every ancestor is overflow visible once open, nothing paints above the reds, and toggling each suspect left the red pixel count below the plate unchanged (1440: 682, 375: 57). The bottom pieces were whole (bbox bottom 8675 against H 8670.5). `build` skipped the right vertical because `ry` (about 8500 at 1440, 11000 at 375) is past `innerHeight`. Fix: `draw` sets `o.far` for `article.case`, `build` uses `rOn = c.far || ry < innerHeight`.
- Checks: `snap.py compare dp-d81-before dp-d81`: 79 same, 8 `page-*` 0.02-0.06%, no console errors. Flows `deeplink`, `back`, `reload`, `work-open` pass; `worklink` only the known failure. Toyshot both exit 0. Pagecheck exit 0, no overflow at 375.
- Judge: right vertical and corner crossing show (2 of 2). Fails: 375 first two bottom pieces tiny ticks, the notched one reads broken in two; 1440 right vertical a heavy solid rod, the strongest mark in frame, every end square, a plain plus sign, reds float past the faded wash and touch the monitor toy. d79's shots were Conclusus, d81's Sector Zero, so "lozenges" is neither cleared nor confirmed.

Earlier in phase 15: 15 (rest, D79) · D79 fix landed on the branch, judge-d79 FAIL, stopped (D80). js/site/redlines.js: `sync()` skips `article.case`, `init` calls `sync()`.
- Shots for the owner: `%TEMP%/dp-pass/p15/d79/` (`case-head-*`, `case-bottom-*`, `deeplink-*` at 1440 and 375, `sheet.png`, `corners.png`). Report `p15/judge-d79.md`.
- Case plate 1 s after the open: visible, one path, at 1440 and 375, by click and by deep link. Close rows hidden 1 of 1 on click; 0 near on a deep link, so the hide was not exercised there.
- Flows `deeplink`, `back`, `reload`, `work-open` pass; `worklink` only the known failure. Toyshot sector-zero `--y 0.4`, heavylight `--y 0.2` exit 0. Pagecheck `index.html#sector-zero` exit 0.
- Judge: top pieces and left vertical show, deep link matches a click-open (S3 2 of 2). Fails `case-bottom-1440` and `-375`: no right vertical or corner crossing; bottom pieces cut flat on their underside, lozenges at 1440, tiny ticks at 375. Note: reds against the frame's bottom stroke clean at 1440, tangled at the 375 corner.
- Cause not measured. `build` draws a right vertical that hangs past the bottom corner (redlines.js:214), so a clip on the case or `.folder-body` is the likely reason; unconfirmed.

Earlier in phase 15: 15 · Final check four: checks run, look check FAIL, no fallback, stopped. No code changed in this phase; audit ticks only. Main f376cb1 merged at 1e8e82b at the start hook's order (genesis ceiling only).
- Shots for the owner: `%TEMP%/dp-pass/p15/judge/` (`<name>-1440.png`, `<name>-375.png` for gate, rows, row-open, rank-card, glimpse-card, note, 404, case-head; `note-phone.png`, `gate-375-x3.png`, `row-open-1440-x3.png`, `bridge-1440.png`, `sheet.png`, `corners.png`). Reports in `p15/`: `judge-15.md`, `review-15.md`, `verify-v1.md`, `verify-v2.md`.
- Captures `dp-final4` 79/79, `dp-final4-375` 14/14, no ERR or console errors. `compare dp-14b dp-final4`: every non-genesis scene `same`. Against dp-before: 0 of 87 same, toy scenes 12.29-35.95 (case chrome), genesis 1.02-24.44.
- Flows, full suite: 11 failing: the 10 known (D66) plus `header` sector-zero desktop, read as not broken (D78). Toyshot exit 0 at `--y 0.4` (heavylight 0.2) on all four, no console errors; exit 1 at the default y 0, base too (D78).
- pagecheck exit 0 on all four. Same-sitting 5x tree / c1253bf: long 368 / 396, LCP 2932 / 3028, CLS 0.0146 / 0.0229, all under the ceiling. Phone CLS 0.097-0.099 (D70 0.11-0.118). Largest texture 38 KB; contrast passes (stroke cream 14.1+, quiet 8.0+).
- Not clean: `--lamp` hits in style.css, folder.css, beacon.css (cream there); `#sector-zero` tilted 1 under reduced motion (static `.obj-id::before`, level with dp-12). `dp-rm-final4` vs `dp-final4`: index-work 11.67 / 12.19, no console error; those diffs were not read as pictures, so "only on levelled strokes" is unconfirmed.
- Judge-15 FAIL: 13 of 18 crops pass (7 of them with D77's known gaps); fails row-open and case-head at both widths, note-375. Reviewer: 3 gaps (Blocker).

## Next phase
None runnable: phase 15 closed by D87, nothing left but row 11. Row 11 stays `blocked` (D65): never take it.

## Requirements / gotchas
- Never edit `:root` `--slab-scrape*`/`--tear`/`--stroke`; scopes declare their own.
- Judges count the red primary button against S1 unless told it is plan-mandated.
- Copy shots out of snapshots/ before reading. `glimpse-card-phone` drifts about 3%.
- The git guard blocks `git worktree add/remove`. A leftover base extract is at `%TEMP%/dp-pass/base` (scratch; can be deleted).
- `page-*` snap scenes are full page, far too small to judge: use 1:1 viewport shots. `index.html#<game>` alone lands on the bridge in a script (judge-9b head shots): get past the gate and open the work list first, then verify the frame shows the case head before sending it (`fb/shots9d.py` needs this fix).
- pagecheck `tilted` counts transformed elements: it must be 0 only under reduced motion.

## Questions
none

## Blocker
none

## Carry forward
- The next judge needs crops made for it: it has no crop tool, so enlarge thin runs and row frames into their own PNGs. Prompt implementers with one half of a spec at a time: p14-1 ran 74k against a 60k line, p14-2b 62k; the reviewer ran 93k against 80k.
- Open point for the owner's report (from the handoff): the cross/V motif is on the gate only; the stack and work-row plates keep sheet 17's pieces.
- Tick the phase 13 elements in the audit checklist with phase 14's. A `page-404-phone` SIZE line means the compare gives no percentage: judge that scene from a shot.
- Implementer capture specs overflow 60k when they also edit: keep edits and full verify in separate specs. Reviewer prompt: name line ranges, it passed 80k here.
- Phase 11 must still confirm from a real head shot: closed rows on the wash at 1:1, and the cream active strip; D36 read yes in judge-10b. Open S1 list is D61, S3 is D63.
- Runs: `dp-9z` (page, gate, veil scenes clean; its `index-*` may hold p10-1 CSS, use `dp-9` for those), `dp-10c` (last full), `dp-10c-375`, `dp-10d` (`page-` only), `dp-final`, `dp-rm-final`. Scene totals: full 79 (compare 87), `--only phone --phone-width 375` 14.
- Pagecheck single runs jitter by 100 ms or more on long tasks: alternate three times against an extracted base (`git archive <sha> | tar -x -C <dir>`, `%TEMP%/dp-pass/p10/base` is 9523559), and judge the medians.
- Phase 12: `.gate-stage::after` is the index phone CLS (D70): when phase 13 repaints it, make it an out-of-flow layer or reserve its height if the look allows. Keep each spec's budget small: an implementer ran out at the snap capture, so capture in its own spec. Pagecheck numbers: within 10% of dp-12 means the Completed phase's medians.
- Open questions for the owner at the end: D69 (blank up to 3 s on a slow link), D70. Phase 12 Progress rows were added by hand: the plan had none for 12-14.
- Implementers: say "commit" in the spec's Acceptance or they leave it to the caller.
