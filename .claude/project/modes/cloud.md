### Portfolio notes (cloud)

- The live site deploys from `main`. Landing step: `tools/bump.py`
  (rewrites every `?v=`); never run it here.
- Run tools with `python3` (`python3 tools/nav-flows.test.py header`).
- **Playwright:** the environment's setup script installs
  `playwright==1.56.0`, which matches the pre-installed Chromium
  (`/opt/pw-browsers/chromium-1194`). Never run `playwright install` and
  never upgrade the package. If a flow prints "Looks like Playwright was
  just installed", the pin and Chromium disagree: say so and stop. If
  `python3 -c 'import playwright, PIL'` fails, run `pip install
  playwright==1.56.0 pillow`.
- **Try:** `py -3 C:/Users/Traff/Desktop/sebas/Portfolio/tools/try.py <branch> --path "<url path>"`
  serves the branch from `../Portfolio-try` on its own port and opens the browser.
- **Commit:** `py -3 C:/Users/Traff/Desktop/sebas/Portfolio/tools/try.py <branch> --commit`
  (bumps `?v=` in the squash commit).
