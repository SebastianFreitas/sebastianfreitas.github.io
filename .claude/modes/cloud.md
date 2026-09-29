## Cloud mode

A fresh Linux clone of GitHub, one container and one `claude/<name>`
branch per session, so parallel sessions never share files. Nothing you
push reaches `main` until the owner lands it.

- **Branch:** work, commit and push only on the branch this session was
  given (the GitHub proxy refuses pushes to any other). Never push to
  `main` and never merge into it.
- **In the same turn:** build, verify, commit, push, open a PR with `gh pr
  create` (title = the feature in plain words; body = what changed, what
  was verified, and `https://claude.ai/code/${CLAUDE_CODE_REMOTE_SESSION_ID/#cse_/session_}`),
  then the report. If `gh` is missing or refused, skip the PR and say so in
  "Look at"; the Commit command does not need it.
- **Landing steps are not yours.** Never run a step the project's notes
  below reserve for landing (a cache-bust, a version bump) and never
  change the line count of an existing `.claude/MAP.md` row. Add rows
  for new files and update descriptions only. `try.py --commit` runs the
  landing steps once on merge.
- **Commands:** there is no `py -3` here; run every tool with `python3`.
  Screenshots: send them with SendUserFile when the tool exists.

### Report commands

The project's notes below give the literal paths.

- **Try:** `py -3 <main checkout>/tools/try.py <branch> --path "<where>"`
  checks the branch out into a sibling `-try` worktree of the owner's
  main checkout and launches it; typing `commit` at its prompt does the
  Commit step.
- **Commit:** `py -3 <main checkout>/tools/try.py <branch> --commit`
  (the same command as Try's prompt): fetches the branch from origin and
  squashes it into local `main` in the main checkout, runs the landing
  steps in that commit, and pushes nothing. On a conflict it pushes
  nothing and says so.

After the owner pushes `main`, they close the PR by hand (GitHub shows it
closed, not merged). Never use GitHub's merge button: it skips the
landing steps.

### Context full

The rule is `workflow.md`'s "Context budget" (stop, handoff, owner
clears). Commit and push first, and put the handoff in the PR body under
`## Handoff` as well as in `.claude/handoff.md`.
