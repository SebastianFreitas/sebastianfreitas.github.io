## Worktree mode

This session has its own checkout under `.claude/worktrees/<name>` on its
own branch; it shares only `.git` with the main checkout, so no other
session touches these files and there are no foreign edits.

- **Commit on this branch, by path. Never push, never open a PR, never
  merge into `main`** (merging `main` INTO this branch is fine and is how
  you resolve a conflict the owner reports). The branch stays local;
  `try.py` reads it from here.
- **Landing steps are not yours.** Never run a step the project's notes
  below reserve for landing (a cache-bust, a version bump) and never
  change the line count of an existing `.claude/MAP.md` row. Add rows for
  new files and update descriptions only. Those two are where merge
  conflicts between parallel branches came from; `--commit` runs the
  landing steps once on merge.
- Commit everything before the report: `--commit` merges commits only.
- Anything gitignored (snapshots, build output) is not shared with the
  main checkout: produce your own "before" here before any code changes.
- Commands use `py -3`, exactly as in `CLAUDE.md`.

### Report commands

Replace `<branch>` with `git branch --show-current` and `<main
checkout>` with the path in the `MODE:` line.

- **Try:** `py -3 <main checkout>/tools/try.py <branch> --path "<where>"`
  checks the branch out into a sibling `-try` worktree and launches it;
  typing `commit` at its prompt does the Commit step. The project's
  notes below say what `--path` means there.
- **Commit:** `py -3 <main checkout>/tools/try.py <branch> --commit`
  squashes the branch into one commit on `main` in the main checkout,
  runs the landing steps in it, merges `main` back into this branch, and
  pushes nothing; the owner reviews in GitHub Desktop and pushes there.
  On a conflict it changes nothing and says so; then run `git merge main`
  here, resolve, commit, and run it again.
  **You run it yourself** (owner's call, 2026-09-26) once the work is
  verified and committed, then keep going; the report names the commit
  now on `main` instead of handing over the command. Make the branch
  tip's message describe the work first: the squash takes its message.

After a Commit, the command already merged `main` back into this branch, so
a follow-up round just commits on the same branch and ends with the same
report. Archiving the session in the app removes the worktree.

### Context full

The rule is `workflow.md`'s "Context budget" (stop, handoff, owner
clears). Commit on the branch first; `.claude/handoff.md` stays in this
worktree (gitignored). After `/clear` it is the same worktree and branch:
never open a new one for the same work. If the owner opens a new chat
instead, that gets a fresh worktree from `main` with no handoff: it runs
`git merge <branch>` first, so name the branch and put the Next list in
the report's "Look at" too.
