# dp-4 review (dp-4a e4bf359 + dp-4b fc41ded), diff 53aff44..HEAD -- css/ index.html

Verdict: no gaps that break a flow. One rule gap on 404 that phase 5 is planned to fix. Two placement points to look at.

## Checked against the plan's "### 4" (Spec 1 + Spec 2): matches
- `--smoke` matches wash-impl.md cell A byte for byte, with no raised alphas. `.work`, `.experience` and `footer` use `var(--smoke), var(--wash)`. `.work:has(.case-folder.open)` (folder.css:67, specificity 0,3,0) still beats the base rule, so the open Work section stays transparent.
- Titles: top rule and fill are off, they are `inline-block` with `0.2em 0.6em` padding, and they sit on a tilted `.slab`.
- Rows: box and fills are off and the stroke spans the full width. Stagger at `4n+2/3/4` is 0.6/0.2/0.9rem. Each row has `isolation: isolate` and no z-index, so later rows paint over earlier ones. The row clip is `inset(-3rem -1.25rem -2.5rem -1.25rem)`. The open row's stroke and artwork stay level (folder.css:93-94, which wins on specificity). `.obj-shot` uses the polygon, the even polygon, `rotate(-3deg)` and origin 19.4% 50%, and hover changes only opacity. Closed tabs are black strokes and turn cream on hover. The open strip is untouched.
- `--open-line: var(--type-red)` is set in both places. `.folder-close` has its rule off and a straight `::after` stroke. `.xp li` has its rule off, `max-width: 48rem`, `margin-bottom: 1rem` and insets of -1.2/-0.6/-0.9rem. The footer has one stroke (`.foot-text.slab`, max 48rem) and its rule is off.
- Ink: both symbols are used and the symbols exist (index.html:1008, 1028).
- `nth-of-type` parity is the same for the row stroke (`.slab:nth-of-type(even)`) and the artwork (`.obj:nth-of-type(even) .obj-shot`).
- No `?v=` edits and no JS changes.

## Gaps / points
1. css/style.css:649-660 (unscoped `footer`), seen on 404.html:44-49. The plan's Ground constraint says "No text directly on the wash, always on a stroke". The shared `footer` rules now give every `<footer>` the smoke and wash ground and drop its border-top. Only index.html got the `.foot-text.slab` wrapper. The 404 footer's three lines (email, links, rights) now sit straight on the grey wash with no stroke and no top rule. This is the `page-404` change in the compare (25.91% desktop, 33.41% phone). 404 and index are the only pages with a `<footer>`, and the case pages have none, so nothing else is hit. 404.html loads only style.css and beacon.css (not bridge.css), so its rights line is cream.
   - Not a flow regression: links still work, cream on the wash is about 5:1, and the direction matches phase 5 Spec 2 ("404 ... footer per phase 4", D18 puts the 404 shell on the wash).
   - It is an interim break of the no-bare-text rule, and phase 4's Verification did not list it. Smallest fix: either wrap the 404 footer text in `<div class="foot-text slab">` now, or record in the plan's phase 4 Notes that `page-404` changes and that phase 5 adds the wrapper. With the second option, phase 5's compare should expect it.
2. index.html:270 and 850, css/style.css:429 (ink placement). The plan says "Work and Experience titles top-left". The code puts the cluster to the right of the title, at `left: gutter + 9rem`. In index-experience-desktop the cluster touches the torn right end of the "Experience" stroke (not the text). D30 says "never cut by a panel edge or over a label". This is borderline rather than broken, so it is for the look-judge. dp-4b's own phone note says the footer cluster "slightly overlaps the stroke's bottom edge", which goes against D30's "never cut by a panel edge". Fix if the judge fails it: give `footer > .ink` a bottom or right offset that clears `.foot-text`.

## Hunks the spec did not ask for
- `.xp li:nth-of-type(n)::before { inset: 0 -0.2rem 0 -0.4rem }` at <=640px (style.css:666). This is dp-4b's fix for horizontal scroll on phone. It shrinks the spec's -1.2/-0.6/-0.9rem insets on phone only. It does no harm.
- `.foot-text` has `padding: 1.5rem 2rem`, and the closed tab and stroke have a `background-color` transition. Neither does harm.

## Could not check
- dp-4a's `elementFromPoint` check (open tab centre, frame corner + 3 px, end of each closed row's last text line). `.claude/specs/reports/dp-4a.md` does not exist, so its result is not recorded anywhere. Reasoning from the CSS: later rows' strokes rise at most about 17 px at the right end, which is inside the 36 px bottom padding, so a miss is unlikely. Re-running it needs a browser and server, which I may not start.
- pagecheck, flows and compare numbers: I took them from the dp-4b report without re-running them.
