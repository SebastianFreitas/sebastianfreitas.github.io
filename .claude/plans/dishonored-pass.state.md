Status: blocked
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
15 (rest, D79) · D79 fix landed on the branch, judge-d79 FAIL, stopped (D80). js/site/redlines.js: `sync()` skips `article.case`, `init` calls `sync()`.
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
15 · Stopped for the owner (Blocker). Only the answer to Q2 restarts it. Row 11 stays `blocked` (D65): never take it. The runner's brief named phase 11 on this session; that row is not runnable, so it was ignored.

## Requirements / gotchas
- Never edit `:root` `--slab-scrape*`/`--tear`/`--stroke`; scopes declare their own.
- Judges count the red primary button against S1 unless told it is plan-mandated.
- Copy shots out of snapshots/ before reading. `glimpse-card-phone` drifts about 3%.
- The git guard blocks `git worktree add/remove`. A leftover base extract is at `%TEMP%/dp-pass/base` (scratch; can be deleted).
- `page-*` snap scenes are full page, far too small to judge: use 1:1 viewport shots. `index.html#<game>` alone lands on the bridge in a script (judge-9b head shots): get past the gate and open the work list first, then verify the frame shows the case head before sending it (`fb/shots9d.py` needs this fix).
- pagecheck `tilted` counts transformed elements: it must be 0 only under reduced motion.

## Questions
Q2 · Phase 15, D79's re-judge. The case plate's bottom corner fails: no right vertical, bottom pieces cut flat. Options: (a, recommended) one more fix spec: find what clips the case svg at the plate's bottom and right, fix it, re-judge `case-bottom-*`; (b) accept as built like D77, Stage done; (c) stop the reds on case plates at the top and left by design and accept.
(The sheet question was answered: sheet 26 gate B, D72.)

## Blocker
Look check still FAIL after D79's one fix spec (D80): `case-bottom-1440`, `case-bottom-375`. The phase has no fallback and no fix spec left; Q2 is the owner's. Q1 was answered on 2026-10-30: (c), D79.

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
