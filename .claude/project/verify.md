# Portfolio: how to verify (project-only, never synced)

- A sketch round (rule: workflow.md Run step 5) shoots only the thing drawn:
  one `snap.py capture <run> --only <scene>`, `toyshot.py`, `jscheck.py
  --shot` or `gframes.py`. Everything below is for the landing round.
- Test only the flows you touched: `py -3 tools/nav-flows.test.py <flow>`
  (`--list` names them). Run the full suite only before a commit that
  touches navigation, the gate or storage.
- Landing round, anything that paints or styles: `py -3 tools/snap.py
  capture <name>` once before, once after (3.5 min, 50 scenes), then
  `py -3 tools/snap.py compare <before> <after>`: `same` on every scene
  you did not mean to change. Merge `main` into the branch, then capture
  "before" from the main checkout: `py -3 tools/snap.py capture before
  --root C:/Users/Traff/Desktop/sebas/Portfolio`. Runs live in `snapshots/`
  (gitignored). A `page-*` scene fails on
  any console error, which is the case-page toys' error check.
- A change that only paints a toy canvas: `snap.py` does not paint it.
  Use `py -3 tools/toyshot.py <page> [--y 0.4] [--t ms]` (seconds; exits
  1 on a blank toy or a console error; read the PNG it names), `py -3
  tools/jscheck.py <files> --shot out.png`, or `snap.py
  capture <run> --only <page>-toy` for its three scroll stops, plus the
  flows. The full `snap.py` only when page DOM or CSS changes.
- Games/Work rows, the stage or `js/site/shapes.js` rows: `py -3 tools/workcut.py`
  must pass (installed Firefox, wide windows and page zoom).
- Anything that paints the homepage or case pages: also shoot it with
  `py -3 tools/ffshot.py` (the owner's installed Firefox); Playwright
  Firefox has missed bugs twice.

