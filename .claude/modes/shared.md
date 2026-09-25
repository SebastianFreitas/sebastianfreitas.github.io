## Shared mode

This is the main checkout. Other sessions edit this tree at the same
time: another local chat may be mid-task with uncommitted edits, and
worktree or cloud branches land on `main` through the owner's `tools/try.py
--commit`. The owner will not say so every time. Prefer a worktree session
for any task longer than a quick fix; this mode is for small changes.

- The SessionStart hook lists every path that was already uncommitted
  when you started: those are foreign. Never stage, revert, stash or
  "clean up" them.
- Stage by path, only the files your specs named, and read `git status`
  before every commit: anything else modified is someone else's.
- A file you must change that already has foreign edits: say so in the
  spec. The implementer edits by exact string, touches only its own hunks
  and never cleans up. If a foreign edit breaks a flow, report it; do not
  fix it.
- Commit straight to `main`, no branches. Run `py -3 tools/bump.py` before
  a commit that changes any script or stylesheet (only this mode bumps).
- **Never push, never pull, never merge anything into `main`.** Commit
  straight to `main` by path; the commit stays local until the owner
  pushes it with GitHub Desktop (the owner can Undo commit there before
  pushing). If `git status -sb` shows `main` behind `origin`, say so in
  Look at; the owner pulls in GitHub Desktop.
- `implementer-wt` is not used in this mode (its merges would land in a
  tree with foreign edits); run parallel same-file work in a worktree
  session instead.
- `.claude/MAP.md` rows for a file another session is building belong to
  that session.

### Report commands

- **Try:** `Set-Location C:\Users\Traff\Desktop\sebas\Portfolio; py -3 serve.py`
  and the line under it gives `http://127.0.0.1:8765<url path>`. If 8765
  is busy, the owner already has it running: give only the URL.
- **Commit:** no command: say "Already committed as <sha> on `main`;
  review it in GitHub Desktop and push there."

### Merging by hand

Only when the owner asks you to merge branches. Merge the open branches
into `main` one at a time with `--no-ff`, oldest first. `?v=` numbers no
longer conflict (the `cachebust` merge driver that `try.py` installs
ignores them); if one still does, keep either side. Two branches adding `<script>` lines at the same spot:
keep both, in load order. `.claude/MAP.md` rows: keep both sides' rows,
then re-count the changed files. After the last merge run `py -3
tools/bump.py` once and the full `py -3 tools/nav-flows.test.py`, commit,
and end with the report (the owner pushes). Never delete branches; the
owner does.

### Context full

Finish the atomic step, commit, write `.claude/handoff.md` (format: the
`handoff` skill), then keep going with Next in the same turn. Auto-compaction (the
`handoff` skill's "Auto-continue") summarizes the conversation a
little past the line, mid-turn, and the SessionStart hook prints the
handoff back in, so the owner types nothing. Never clear this session
to continue: in the desktop app a clear stops its process and nothing
restarts it. A handoff that waits on the owner (a question, a blocker)
ends the turn with the normal report as usual.
