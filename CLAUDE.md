# Portfolio: rules for every session

Personal portfolio on GitHub Pages. It is a user site, so the pages and
site assets sit at the repo root and everything else lives in folders.
Plain HTML, CSS and vanilla JS: no framework, bundler, npm or `node`.
Every JS file is an IIFE that publishes one `window.X` global, loaded by
`<script>` tags in a fixed order. Tools are Python, run as `py -3`.

The workflow (modes, plans, the explore/spec/implement/verify/commit
loop, report, context budget, git rules) is in `.claude/rules/workflow.md`,
which loads with this file. It is shared with the owner's other
projects and synced from a master copy: read its "Shared files" section
before changing it. This file holds only what is specific to the
portfolio, and wins where the two disagree.

Facts live in `.claude/MAP.md` (file map, sizes, shared state, load
order, storage keys, roadmap). Grep it; it is too long to read whole.
`.claude/` also holds `modes/`, `rules/`, `skills/`, `hooks/`, `agents/`
and `playbook.md` (shared), and `project/` (the portfolio's half of the
modes, playbook and implementer brief; never synced).

## Screenshots for the report

`snap.py` scene, `jscheck.py ... --shot`, or `gframes.py` for the
cutscene (commands in `.claude/playbook.md`).

## Domain rules

Drawing anything (Rex kingdoms, Mainland factions, any new place):
`.claude/rules/art-style.md`. Instruments, sites, readings, HUD tiles:
`.claude/rules/instruments.md`. They load only when a matching file is
read: the window that designs a spec reads them and names what binds
under Read first; the implementer reads what the spec names; the
coordinator never does. Game pages (`projects/*.html`, `css/game-pages.css`):
`.claude/rules/game-pages.md`.

## Verify

Detail in `.claude/project/verify.md`: read it before verifying. A sketch round
shoots only the thing drawn (workflow.md Run step 5 is the one rule).

## Paths never to open

`cv.pdf`, `media/`, `Temporary VoidScape Media/` and `__pycache__/`:
list them for names only. In `snapshots/`, open only the PNGs you are
reviewing. `archive/eroded-banners/`: only when the owner names it.

## Scratch files

GitHub Pages publishes every committed file, so nothing temporary is
ever committed here.
