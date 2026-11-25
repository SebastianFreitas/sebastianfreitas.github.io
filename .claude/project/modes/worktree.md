### Portfolio notes (worktree)

- Landing step: `tools/bump.py` (rewrites every `?v=`); never run it here.
- `snapshots/` is gitignored. Sketch rounds take no full capture; the
  landing round captures "before" from the main checkout with `snap.py
  capture before --root C:/Users/Traff/Desktop/sebas/Portfolio`.
- **Try:** `--path` is the URL path where the change is seen
  (`/projects/voidscape.html`, `/?genesis=1&gbeat=<beat>`, `/` for the
  bridge); try.py serves the branch with `serve.py` on its own port and
  opens the browser. The owner can also press Preview in the desktop
  app, which serves this worktree from `.claude/launch.json`.
- Main checkout: `C:/Users/Traff/Desktop/sebas/Portfolio`.
