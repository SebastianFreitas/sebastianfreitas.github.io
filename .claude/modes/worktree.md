## Worktree mode

This session has its own checkout under `.claude/worktrees/<name>` on its
own `claude/<name>` branch, sharing only `.git` with the main checkout: no
foreign edits. The app may cut it from `origin/main`; session start prints
WORKTREE BEHIND MAIN when this branch lacks commits from local `main`.

- **Commit on this branch, by path. Never push, never open a PR, never
  merge into `main`.** Merging `main` INTO this branch is fine when the
  hook prints WORKTREE BEHIND MAIN or to resolve a conflict the owner
  reports, never mid-run on your own.
- **Landing steps are not yours.** Never run a step the project's notes
  below reserve for landing (a cache-bust, a version bump); never rewrite an existing `.claude/MAP.md` row beyond what your change needs;
  add rows for new files and update descriptions only. `--commit` runs the landing steps once.
- Commit everything before the report: `--commit` merges commits only;
  the Stop hook refuses a turn end with uncommitted files.
- Baselines (snapshots, fingerprints, dumps): re-record one only when the
  change is meant to alter it, and say so. Two branches that both
  re-record conflict at Commit: `git merge main`, re-run, re-record.
- Gitignored output is not shared with the main checkout: make your own
  "before" here before changing code. Commands use `py -3`.

### Report commands

`<branch>`: `git branch --show-current`; `<main checkout>`: the `MODE:`
line's path.

- **Try:** `py -3 <main checkout>/tools/try.py <branch>` plus the
  project's Try flags (notes below) opens the branch in a sibling `-try`
  worktree; `commit` at its prompt does Commit.
- **Commit:** `py -3 <main checkout>/tools/try.py <branch> --commit`
  builds one squash commit on local `main`, runs the landing steps and
  checks on the combined tree in the `-try` checkout, then fast-forwards `main`, moves this branch
  onto it and pushes `main` (only `main`, only after it landed). On a
  conflict, failed check, or the owner's uncommitted edits in a file the
  branch changes it lands nothing: `git merge main` here, resolve, verify,
  commit, run it again.
  **Only with the owner's OK:** the report hands over the command; the
  owner runs it, or replies "merge it" / "land it", and only then do you
  (`git-guard.py` refuses it otherwise). The squash takes the
  tip's message, so the tip describes everything this landing adds over
  `main`: the feature on a first landing, only the follow-up on a later
  one. Other commits: a few words on what changed, never a message already on
  the branch or `main`.

**Done state.** After Commit (run on the owner's OK) prints `LANDED:`, do
playbook "Landed" (mark this session done).

After a Commit the branch is on `main`: a follow-up round commits on it
and ends with the same report. If Commit could not move the branch, start
the next round with `git merge main`.

### Context full

Rule: `workflow.md` "Context budget". Commit first; `.claude/handoff.md`
stays in this worktree (gitignored). After `/clear` it is the same
worktree and branch: never open a new one for the same work; the go prompt
names both (`workflow.md` "The go prompt"). A new chat gets a fresh
worktree from `main` with no handoff: it runs `git merge <branch named in
the go prompt>` first, so put the Next list in the report's "Look at" too.
