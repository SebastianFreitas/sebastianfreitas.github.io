---
paths:
  - "projects/*.html"
  - "css/game-pages.css"
  - "css/play.css"
---

# Game pages: shared art style

The four game pages (`projects/*.html`) look like the homepage Games rows,
"my game boxes": black plate, mono label line, condensed title, cream lead,
grey detail, mono facts strip, picture fading into the plate. "A tiny bit of
red, breathing room", "professional". No copy rewrite; the toy is untouched.
All styling is `css/game-pages.css` (linked after `play.css`, `?v=311`), body
classes `page-game page-case`. Every rule starts with
G = `.page-game.page-case:not(.page-404) main.case`, to beat style.css's
(0,4,1) rules (`.case > p:first-of-type`, the 18vh padding-top, `nth-of-type`
widths, the under-900 px `margin-block`). Tokens are set on G.

## Components (class names are fixed)

- Opener `header.gp-head`, direct child of main right after `a.back`: plate
  `::before`, sheared clip-path, 1 px catch-light `::after`.
  - `img.gp-art` (alt="", the row's picture), right side 58%, masked into the plate.
    The box is much taller than the picture is wide (715 x 620 at 1920 for a
    1600 x 676 picture), so `cover` shows only the middle half: frame the
    subject per page with `style="--gp-pos:<x%> <y%>"` on the img (Conclusus
    `85% 50%`; start from the row's `--wk-pos` in `css/style.css`). Aim the
    subject at the fully opaque part, the right 45% of the picture box.
  - `div.gp-det`: `<i></i><span>OBJ_0003</span><s></s><span>Shipped, playable</span>`
  - `h1`, `p.gp-lead` (the old first paragraph, moved in unchanged).
  - `dl.gp-meta`: `<div><dt>Genre</dt><dd>..</dd></div>` x4: Genre, Engine, Language, Role.
- Sections stay flat children of main: `h2` (auto counter `01`, `02`, with a
  hair rule above), `p` (one measure), `h2 + p` (lead),
  `p.caption`.
- Media: `.clip`, `.embed` (`.embed-shell`, `.embed-play`: plate rect, cream label).
- End `nav.case-nav`: left `a.gp-up` = `<span class="go go-back">` + "Back to
  Work" (same href and data attributes as the top `.back`); right
  `a.next.gp-next` (keeps `rel="next"`, `data-banner`, `data-wear`) =
  `<small>Next game</small><b>HeavyLight</b><span class="go">`.
- Slots (CSS only, markup in comment blocks in the css):
  - `figure.gp-figure` > `div.gp-figure-body` + `figcaption.gp-cap` (`<b>FIG. 01</b>`)
  - `figure.gp-stage` > `.gp-stage-head` (`.gp-stage-label` = `<i></i>` + one how-to line; `.gp-stage-status`), `.gp-stage-box` > `canvas`, then the caption. Copy the markup from the comment block above the stage rules in `css/game-pages.css`. Hidden under 900 px. `Play.stage(figureEl, name)` runs it (`js/pages/play.js`).
  - `dl.gp-facts` > `div` > `dt`, `dd`
  - `div.gp-nums` > `div` > `b`, `span`
- Section lead (`h2 + p`) and body share `--measure` (36rem, 576 px): one right edge.
  Only the opener's `p.gp-lead` is narrower (30rem), because it sits beside the picture.
- A `p` right after `header.gp-head` gets `--gp-4` above it from the sheet; no inline style.
- `p.caption` has `--gp-4` under it. Every `main > .clip` has a 1 px `--line` outline (inset).
- `.clip.gp-narrow`: 4:3 or taller media, capped at 50rem. No inline `max-width`.
- Under 900 px `dl.gp-meta` is a four-row table (label column 6.5rem, no dividers).
- Pages carry no `<style>` block. A rule only one page needs goes in the sheet's "per page" part,
  keyed `G[data-redlines="case-<page>"]`.

## Spacing scale

`--gp-1`..`--gp-6` = .5, 1, 1.5, 2.5, 4, 7rem. `--gp-pad` = `--gutter` under 1200 px, and 2.5rem (`--gp-4`) from 1200 px, where G's own `@media (min-width: 1200px)` pads the column the same 2.5rem. Measure `--measure:36rem`.
G padding-top = `calc(clamp(2rem,6vh,4rem) + 1.2rem)` at every width.

## Type roles

- label: `500 12px/1 var(--type-mono)`, .2em, uppercase, `--gp-label` (#8f8878)
- title: `--type-head` 700 uppercase cream; h1 `clamp(3.2rem,6vw,5.75rem)`/.9, h2 `clamp(2rem,3.2vw,2.75rem)`/1
- lead: `--type-read` 500 1.25rem/1.4 `--gp-lead` (#f1ecd8)
- body: 1.0625rem/1.65 `--gp-body` (#bdb59e)
- caption: mono 400 .72rem/1.6 `--gp-label`

## Red

Red in diagrams is only VoidScape FIG. 01's step numerals 0-4 (hub figure, `.gp-dia-hub`), `var(--type-red)` by the owner's choice (2026-11-23).

Only `.gp-det i`, `.embed-play::after`, `.gp-stage-label i` (the stage's 9 px
square, like `.embed-play::after`), the `.go` arrows (in the end nav and
as every diagram arrow), always
`var(--type-red)`. Nowhere else. Inside a stage canvas, red appears only
where the game's own sprites carry it.

## Do and don't

- Do not wrap sections; toys read `main.children`.
- Never add a second `.back` (tests use `.back`); the end link is `a.gp-up`.
- Never rename an `h2` text a toy looks up, nor `.embed-shell`.
- No brush, ink or splats; no always-on cream paper; nothing animated at idle.
- One measure for body text; no ragged widths.
- The column box is unchanged: `js/pages/play.js` reads it.

## Converting a page

1. Body gets `page-game` beside `page-case`; link `css/game-pages.css?v=311` after `play.css`.
2. Build the opener from the row facts in `index.html` (`.obj-det`, `.props`):
   OBJ id, status, genre, engine, language, role, the row's picture as `gp-art`
   with its `--gp-pos` (check the subject is in frame at 1920 and at 390).
3. Move the first paragraph into `p.gp-lead` unchanged (links and spans kept); delete `.case-sub`.
4. Replace the end links with `nav.case-nav` (`a.gp-up`, `a.next.gp-next`).
5. Then add slots where the page has content for them.

## Shoot and verify

In Git Bash prefix ffshot with `MSYS_NO_PATHCONV=1`.

- `py -3 tools/toyshot.py <page>` for each of the four (exit 0).
- `py -3 tools/ffshot.py --path /projects/conclusus.html --size 1920x1080 --out <png>`; `--scroll` for mid and end (see `--help`); a 390-wide Playwright shot.
- `py -3 tools/nav-flows.test.py --list`, then the case-page flows.
- `py -3 tools/snap.py capture <name>` then `compare gp-base <name>`: every scene that is not `page-*` must be `same`.
- `ffshot.py` (Firefox) cannot go under 500 px wide: the 390 shot is always Playwright.

## Added by s1-build-c (fold into the sections above when this file is copied into `.claude/rules/`)

- **Opener picture, bottom fade:** `.gp-art` has two mask layers (in from the left, out at the
  bottom 8% to 30%), so the facts strip always sits on clean plate. Keep the subject above the
  bottom 30% of the picture box.
- **Opener under 900 px:** the picture is never behind the text. It is a full-bleed band across
  the top of the plate (`position: static; order: -1`, height `clamp(140px, 42vw, 280px)`, same
  mask), then the label line, title, lead and facts. The band is close to the picture's own
  2.37:1 shape, so almost the whole picture shows and `--gp-pos` barely moves it: a subject in
  the left 30% of the picture fades out on phones. The opener has no min-height there.
- **Opener picture at its own size:** a picture whose subject sits in the fades can be drawn at
  its own size (`object-fit: none`) and anchored by its edges, from 900 px up, in the per-page
  part (HeavyLight). It must then mask out its own left edge when that edge falls inside the
  picture box: third mask layer `--gp-edge`.
- **Subject that cannot clear the lead:** hide it whole by narrowing `--gp-edge` for that width
  range (HeavyLight: the man in red, 900 to 1099 px).
- **After converting an opener:** run the toy check at y 0 (`toyshot.py <page> --y 0`).
- **Play plate:** `.embed-play` is a flex row; the red square is `::after` with `order: -1`, in
  flow, so square and label are centred as one group for any game name. Do not position the
  square absolutely again.
- **End nav:** `.gp-next b` takes `color: inherit` on hover and focus (the link turns ink on the
  cream hover paper; a fixed cream title vanished). Any new text inside `.gp-up` or `.gp-next`
  with its own colour needs the same hover rule. The nav has `--gp-5` of room under it.
- **Red:** unchanged list (`.gp-det i`, `.embed-play::after`, `.go`).

## Diagrams (`gp-dia`)

- VoidScape's FIG. 01 is a hub figure (`.gp-dia-hub`): the hub in the centre, a run each side, four lanes drawn as hairline connectors; it stacks below 1200 px. Its step numerals 0-4 are `var(--type-red)` (owner's choice, 2026-11-23), the only red in that figure.

- Only where the game has a loop worth drawing (a meta loop, a growing reach); a page whose loop is just "play the level, die, retry" gets none (HeavyLight and Conclusus were cut, owner 2026-11-21). One loop diagram per page at most, as `figure.gp-dia`, a flat child of `main`, right after the section lead it explains; a second `gp-dia` without rails may show a ladder or system (FIG. 02 on VoidScape and Sector Zero). Copy the markup from `projects/voidscape.html` (FIG. 01).
- A step may branch into a small outcome stack (owner's design, 2026-11-21; Sector Zero FIG. 01, Edit): `ul.gp-dia-stack` after the `ol`, in the last column, of 3 to 5 cards (small pictogram + 2 to 6 words, optional `<em>` second line). The back rail may start at the stack (`gp-dia-from-4`). Phones: the stack sits under the steps, arrow down, no fan.
- 3 to 5 steps (6 at most). `<b>` is one or two words; `<span>` is short, about 8 words (12 when the owner's wording needs it, as Sector Zero's Register). The sheet numbers the steps, never type them.
- Rails (`gp-dia-rail`, placed by `gp-dia-from-N` and `gp-dia-to-N`) run back, from a later step to an earlier one: Sector Zero uses one under rail (`gp-dia-under`, `gp-dia-from-4`, `gp-dia-to-1`). A label is 2 to 4 plain words; never cryptic fragments.
- Pictograms: inline SVG, 48 x 48 viewBox, line-work only, inherit the cream 1.5 stroke; `.gp-dia-dim` for secondary lines, `.gp-dia-solid` for one small filled mark; no red, no text. All other diagram text is HTML.
- Caption: `figcaption.gp-cap`, starts `<b>FIG. 0N</b>`. No page CSS, no inline style.
- Phones (under 900 px): the steps stack, pictogram left, arrows down; rails become left and right brackets with the label turned along them, the arrow lying along the bracket's top arm into the earlier step.
- Arrows: every arrow in a diagram is the site's one arrow, `.go` (22x13, same clip-path), drawn by one shared rule in the sheet and turned only by transforms; cream like `.go-here`. A rail's hairline meets the arrow's shaft centred, tip on the step. Never a new arrow shape, size or colour.
- Rail arrows are built on whole pixels, never as a rotated clip-path (that painted soft, two-toned heads): a 5x12 box shaft plus a 13x10 border-triangle head, coloured through `--gp-arrow`.

## Stage toys (`gp-stage`)

- A toy is a small thing to play with, built on the game's one mechanic, not a playable level (owner, 2026-11-15), on an inline stage, a flat child of `main`, placed right after the section lead whose text it shows (the owner: "make them part of the text not just on the right side").
- How to play reads in one glance: the label starts "Play:" and names the one action in about 8 words or fewer; the status slot shows the run's numbers when the toy has a run, else stays empty (Conclusus); a cream marker points at the first target until the player's first success.
- CPU: nothing animates at idle. Full frame rate only while something moves; discrete beats (a colour flip, a two-frame idle) ride the 250 ms at-rest tick. Judge a click against what the stage last painted, so the tick never makes a click unfair.
- The toy keeps its page's `window.Play<Page>.report()` test hook; `tools/toyshot.py`, `tools/nav-flows.test.py` and `tools/snap.py` change in the same commit as any change to its beats.
- A stage handler (`move`, `press`) that returns `false` changed nothing: `Play.stage` skips the wake and the paint, and any other return paints one frame. `conclusus.js` and `heavylight.js` return `false` on a no-change move.
- Game-page toys and reading give no XP; `Play.award` stays a no-op. Owner, 2026-11-16, asked "Should game-page toys and reading give XP again?": "Bridge only". `cc-read-xp` passes while expecting no XP on game pages.
- One stage per page at most; the page keeps no page-strip toy once it has a stage.
- VoidScape has two stages (bench, map), the owner's call, which wins over that rule. Owner, 2026-11-15 (TRACK EVENT 26): "voidscape is suposed to have a weapon crafting thingy a map generator thingy and be able to shoot to feels the bullets and the mechanics".

## Copy

- A section is a lead (`h2 + p`) plus at most one short paragraph.
- Lead with the design: the loop, the one rule, the player's decision. Numbers only where they are the design.
- A caption says what the clip shows, in one sentence.
- Target about half the pre-step-2 word count (Conclusus: 1285 to 642).
- Never rename an h2 a toy looks up.
