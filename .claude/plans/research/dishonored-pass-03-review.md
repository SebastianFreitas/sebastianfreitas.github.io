# Review dp-3 (commit 16db453)

Verdict: 3 gaps (1 spec number, 1 plan constraint, 1 goal leftover), plus 1 unrequested hunk and 1 missing deliverable.

## Gaps

1. css/bridge.css:45 `.tinst-wrap::before { transform: rotate(-1.5deg) }`
   - Spec constraint 2: lift = `.tinst` width x 0.026, "the far end lifts that many px". The plan uses the same rule with `rotate(-3deg)` (gate: 544 x 0.026 = 14 px = 272 x sin 3deg; rows: 1296 x 0.026 = 34 px). If the overlap check fails, the spec says straight, not a smaller angle.
   - Code: -1.5deg, so the far end lifts W x 0.013, half the spec's value. No measured width, lift or overlap result is recorded anywhere (see "Not checked").
   - Fix: `rotate(-3deg)`, or `transform: none` if the check in `bridge-void-unclaimed` finds an overlap. Record W and the lift.

2. css/bridge.css:42-46. No reduced-motion override for the tile tilt.
   - Plan Constraints, Tilt (D17/D29), which the spec says to read and build as written: "Under `prefers-reduced-motion: reduce` every tilt is 0deg".
   - Code: the modes panel got its override (line 313). `.tinst-wrap::before` did not, so with reduced motion on the tile strokes stay tilted.
   - Fix: add `.tinst-wrap::before` to the reduced-motion rule at line 313.

3. css/bridge.css:124-125. The `.tl.warn` gold is still there: `background: rgba(229,166,60,0.05); box-shadow: inset 2px 0 0 rgba(229,166,60,0.4)`.
   - Spec goal: chrome moves "from gold/greys to cream/quiet/red". Constraint 1 moves the `.warn` text off gold, and `.crit` got its red hairline.
   - Code: every warn line still shows a 2 px gold left bar and a gold tint. It passes the acceptance grep only because that grep doesn't list the 229,166,60 spelling.
   - Fix: drop the gold tint, and make the bar quiet or cream, or remove it.

## Hunks the spec did not ask for

- css/bridge.css:360-362. The `@media (max-width: 900px) { .modes-panel { padding: 0.55rem 0.85rem } }` override was removed, so phones get the 0.9rem/1.5rem padding. It is defensible (the 25 px end notches need about 24 px of side padding), and on phone portrait it stays inside `max-width: calc(100vw - 1.5rem)` (line 755). It is still unrequested.
- `isolation: isolate` on `.tinst-wrap`. This is needed for the z-index -1 stroke, so it's fine.

## The modes-list scroll move (caller's question)

`.modes-panel` lost `max-height: 60vh; overflow-y: auto`. `.modes-list` now has `max-height: calc(60vh - 3rem); overflow-y: auto`. It is a flex item with overflow set, so its min-height resolves to 0 and it scrolls. It is still reachable:

- **Phone landscape** (`max-height: 520px` and coarse pointer, line 738: `#bridge-modes` top 2.4rem): the panel's top is at about 82 px. At 390 px tall, the list caps at 234 - 48 = 186 px. The chrome adds about 54 px (padding 27 + head about 27), so the panel ends near 322 px, under 390. At 320 px tall (SE landscape) it ends near 280 px.
- **Between 900 and 520 px heights**: the same arithmetic holds.
- **How much scrolls**: the journal has at most 6 rows (about 34 px each), so only a short scroll is ever needed.
- **Size and scrollbar**: the 3rem allowance is about 6 px short of the real chrome, so the panel is about 60vh + 6 px, which is harmless. The scrollbar sits 24 px inside the panel edge, inside the 25 px right-hand notch of `--slab-scrape`, so it can show over bare canvas. That is cosmetic and doesn't break the flow.
- **Reading the list**: no JS reads `.modes-panel` scroll (`bridge-panel.js` only appends to `#modes-list`).
- **Verdict**: no flow gap.

## Checked, OK

- **Acceptance grep**: in the post-diff ranges of bridge.css there are 0 hits for `--lamp|#c2954e|#58635f|#3d4644|--cold|#7fa8b4|--display`.
- **Log**: cream, quiet and red prefixes match constraint 1, and `.crit` has weight 600 and a 1 px red hairline.
- **Small items**: the `.tinst-ctl` hover, transparent `.tinst` backgrounds (both banks), `.bridge-scroll`, and the rotate glyph and sub line are all as specified.
- **Genesis**: cream text, stroke buttons with no border, cream fill, quiet track, radii removed, and `.genesis-line` on `--type-serif` 400 cream.
- **lamp.js:96**: matches exactly.
- **Tokens**: `--type-red-text` and `--type-serif` exist in style.css.
- **Modes panel**: the border and red top are gone, and the `::before` uses `--stroke` and `--slab-scrape`. Button hover with a cream fill matches the topbar convention (style.css:327-328).

## Not checked

- The implementer's acceptance report `.claude/specs/reports/dp-3.md` does not exist. I found no record of the measured `.tinst` width, the lift, the tile overlap check, or whether the panel's top corner stays under the top bar (the -3deg vs -2deg choice). I also found no snap compare or flow results. I did not rerun snap or flows (they start a server).
- I did not view screenshots.
