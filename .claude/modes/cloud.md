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

A running plan (a `PLAN:` line) is the exception to this whole section:
a phase ends with the plan skill's Handoff protocol and hard stop
(`PLAN_STATE.md`, then the owner's `/clear`), never with auto-continue,
and a phase that hits the line stops as `partial` (plan skill). The rule
below is for ordinary, non-plan work only.

Finish the atomic step, commit, push, and put the handoff (the `handoff`
skill's headings) in the PR body under `## Handoff`. Also write it to
`.claude/handoff.md`, then keep going with Next in the same turn. Auto-compaction (the
`handoff` skill's "Auto-continue") summarizes the conversation a
little past the line, mid-turn, and the SessionStart hook prints the
handoff back in, so the owner types nothing. Never clear this session
to continue: in the desktop app a clear stops its process and nothing
restarts it. A handoff that waits on the owner (a question, a blocker)
ends the turn with the normal report as usual.
It is the same session in this container, on this branch and PR. If the
session ends anyway, the owner starts a new cloud session and says:
"continue PR #<n>". That session runs `gh pr view <n>` and stays on the
same branch: it runs `git fetch origin <old>`, then `git checkout <old>`,
continues from Next and pushes to `<old>`, so the PR is the same one.
Only if that push is refused does it merge `origin/<old>` into its own
branch and open a PR that replaces the old one (close the old PR with a
link).
