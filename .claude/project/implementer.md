# Portfolio: what every implementer needs

- No framework, no bundler, no npm, no `node`. Test: `py -3
  tools/nav-flows.test.py <flows>` (in the cloud: `python3`). A passing
  flow is the syntax check. Never run `serve.py` (it blocks).
- Landing step: `tools/bump.py`. Never run it (the caller or `try.py` does).
- Largest files (500 to 850 lines, never read top to bottom):
  `css/bridge.css`, `js/hud/instruments.js`, `js/pages/voidscape.js`,
  `js/gamedev/storm.js`, `js/ship/voidship.js`, `js/gamedev/forge.js`,
  `js/genesis/genesis.js`, `js/gamedev/zones.js`; `.claude/MAP.md`
  lists them all.
- Never open `cv.pdf`, `media/`, `Temporary VoidScape Media/` or
  `snapshots/`.
- The hero (`js/bridge/`) and the world (`js/world/`) are each split across
  files that share one state object (`window.Bridge` as `B`, `window.World`
  with `F` for per-frame values and `P` for painters). Cross-file state is
  read as `B.x` / `F.x` at call time; grep the field name across the folder
  to find every reader and writer.
- Every JS file is an IIFE publishing one `window.X` global. Cross-file
  references are by that global, so grep `X.` to find callers rather than
  reading callers' files.
