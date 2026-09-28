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

The rule is CLAUDE.md's "Context budget" (stop, handoff, owner clears).
Commit on the branch first; `.claude/handoff.md` stays in this worktree
(gitignored). After `/clear` it is the same worktree and branch: never
open a new one for the same work. If the owner opens a new chat instead,
that gets a fresh worktree from `main` with no handoff: it runs `git
merge <branch>` first, so name the branch and put the Next list in the
report's "Look at" too.
