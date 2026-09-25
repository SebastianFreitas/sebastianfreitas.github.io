## Cloud mode

A fresh Linux clone of GitHub, one container and one `claude/<name>`
branch per session, so parallel sessions never share files. The live site
deploys from `main`; nothing you push goes live until the owner ships it.

- **Branch:** work, commit and push only on the branch this session was
  given (the GitHub proxy refuses pushes to any other). Never push to
  `main` and never merge into it.
- **In the same turn:** build, verify, commit, push, open a PR with `gh pr
  create` (title = the feature in plain words; body = what changed, what
  was verified, and `https://claude.ai/code/${CLAUDE_CODE_REMOTE_SESSION_ID/#cse_/session_}`),
  then the report. If `gh` is missing or refused, skip the PR and say so in
  "Look at"; the Commit command does not need it.
- **Never run `tools/bump.py` and never change the line count of an
  existing `.claude/MAP.md` row.** Add rows for new files and update
  descriptions only. `--commit` bumps once on merge.
- **Commands:** there is no `py -3` here; run every tool with `python3`
  (`python3 tools/nav-flows.test.py header`). Screenshots: send them with
  SendUserFile when the tool exists.
- **Playwright:** the environment's setup script installs
  `playwright==1.56.0`, which matches the pre-installed Chromium
  (`/opt/pw-browsers/chromium-1194`). Never run `playwright install` and
  never upgrade the package. If a flow prints "Looks like Playwright was
  just installed", the pin and Chromium disagree: say so and stop. If
  `python3 -c 'import playwright, PIL'` fails, run `pip install
  playwright==1.56.0 pillow`.

### Report commands

- **Try:** `py -3 C:/Users/Traff/Desktop/sebas/Portfolio/tools/try.py <branch> --path "<url path>"`
  checks the branch out into `../Portfolio-try`, serves it on its own port
  and opens the browser; typing `commit` at its prompt does the Commit
  step.
- **Commit:** `py -3 C:/Users/Traff/Desktop/sebas/Portfolio/tools/try.py <branch> --commit`
  (the same command as Try's prompt): fetches the branch from origin and
  squashes it into local `main` in the main checkout, bumps `?v=` in that
  commit, and pushes nothing. On a conflict it pushes nothing and says so.

After the owner pushes `main`, they close the PR by hand (GitHub shows it
closed, not merged). Never use GitHub's merge button: it skips the `?v=`
bump.

### Context full

Finish the atomic step, commit, push, and put the handoff (the `handoff`
skill's headings) in the PR body under `## Handoff`. Also write it to
`.claude/handoff.md` and run the skill's "Auto-continue" steps. If the
clear works here, this same session goes on in this container, on this
branch and PR. Then end with the normal report followed by:
"Context is full: this session clears itself and continues from the
handoff at <H>:<M>."
If the tool is missing or refuses, end instead with:
"Context is full. Start a new cloud session and say: continue PR #<n>."
That session runs `gh pr view <n>` and stays on the same branch: it runs
`git fetch origin <old>`, then `git checkout <old>`, continues from Next
and pushes to `<old>`, so the PR is the same one. Only if that push is
refused does it merge `origin/<old>` into its own branch and open a PR
that replaces the old one (close the old PR with a link).
