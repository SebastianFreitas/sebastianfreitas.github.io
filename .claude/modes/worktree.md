## Worktree mode

This session has its own checkout under `.claude/worktrees/<name>` on its
own branch; it shares only `.git` with the main checkout, so no other
session touches these files and there are no foreign edits.

- **Commit on this branch, by path. Never push, never open a PR, never
  merge into `main`** (merging `main` INTO this branch is fine and is how
  you resolve a conflict the owner reports). The branch stays local;
  `try.py` reads it from here.
- **Never run `tools/bump.py` and never change the line count of an
  existing `.claude/MAP.md` row.** Add rows for new files and update
  descriptions only. Those two are where merge conflicts between parallel
  branches came from; `--commit` bumps once on merge.
- Commit everything before the report: `--commit` merges commits only.
- `snapshots/` is gitignored, so capture the "before" run here before any
  code changes.
- Commands use `py -3`, exactly as in CLAUDE.md.

### Report commands

Replace `<branch>` with `git branch --show-current`.

- **Try:** `py -3 C:/Users/Traff/Desktop/sebas/Portfolio/tools/try.py <branch> --path "<url path>"`
  serves the branch on its own port and opens the browser; typing `commit`
  at its prompt does the Commit step. `--path` is where the change is seen
  (`/projects/voidscape.html`, `/?genesis=1&gbeat=<beat>`, `/` for the
  bridge). The owner can also press Preview in the desktop app, which
  serves this worktree from `.claude/launch.json`.
- **Commit:** `py -3 C:/Users/Traff/Desktop/sebas/Portfolio/tools/try.py <branch> --commit`
  squashes the branch into one commit on `main` in the main checkout,
  bumps `?v=` in it, merges `main` back into this branch, and pushes
  nothing; the owner reviews in GitHub Desktop and pushes there. On a
  conflict it changes nothing and says so; then run `git merge main`
  here, resolve, commit, and run it again.
  **You run it yourself** (owner's call, 2026-09-26) once the work is
  verified and committed, then keep going; the report names the commit
  now on `main` instead of handing over the command. Make the branch
  tip's message describe the work first: the squash takes its message.

After a Commit, the command already merged `main` back into this branch, so
a follow-up round just commits on the same branch and ends with the same
report. Archiving the session in the app removes the worktree.

### Context full

A running plan (a `PLAN:` line) is the exception to this whole section:
a phase ends with the plan skill's Handoff protocol and hard stop
(`PLAN_STATE.md`, then the owner's `/clear`), never with auto-continue,
and a phase that hits the line stops as `partial` (plan skill). The rule
below is for ordinary, non-plan work only.

Finish the atomic step, commit on the branch, write `.claude/handoff.md`
(format: the `handoff` skill) in this worktree (gitignored, it stays
here), then keep going with Next in the same turn. Auto-compaction (the
`handoff` skill's "Auto-continue") summarizes the conversation a
little past the line, mid-turn, and the SessionStart hook prints the
handoff back in, so the owner types nothing. Never clear this session
to continue: in the desktop app a clear stops its process and nothing
restarts it. A handoff that waits on the owner (a question, a blocker)
ends the turn with the normal report as usual.
It is the same session in the same worktree on the same branch: never
open a new worktree or branch for it. If the owner starts a new session
instead, it gets a fresh worktree from `main`: it runs `git merge
<branch>` first and has no handoff, so put the Next list in the report's
"Look at" too.
