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
and `playbook.md`.

## Screenshots for the report

`snap.py` scene, `jscheck.py ... --shot`, or `gframes.py` for the
cutscene (commands in `.claude/playbook.md`).

## Domain rules

Drawing anything (Rex kingdoms, Mainland factions, any new place):
`.claude/rules/art-style.md`. Instruments, sites, readings, HUD tiles:
`.claude/rules/instruments.md`. They load only when a matching file is
read, and you delegate reading, so read them yourself before designing
in those areas.

## Verify

- Test only the flows you touched: `py -3 tools/nav-flows.test.py <flow>`
  (`--list` names them). Run the full suite only before a commit that
  touches navigation, the gate or storage. Known failures on `main`:
  `gate-exits`, and `worklink` "lands on Work" (72 px short).
- Anything that paints or styles: `py -3 tools/snap.py capture <name>`
  before and after (about 3.5 min, 50 scenes), then
  `py -3 tools/snap.py compare <before> <after>`: `same` on every scene
  you did not mean to change. Runs live in `snapshots/` (gitignored), so
  a fresh worktree captures its own "before". A `page-*` scene fails on
  any console error, which is the case-page toys' error check.

## Paths never to open

`cv.pdf`, `media/`, `Temporary VoidScape Media/` and `__pycache__/`:
list them for names only. In `snapshots/`, open only the PNGs you are
reviewing.

## Scratch files

GitHub Pages publishes every committed file, so nothing temporary is
ever committed here.
