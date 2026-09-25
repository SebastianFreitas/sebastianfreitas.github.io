# Portfolio: rules for every session

Personal portfolio on GitHub Pages (a user site, so the pages and site
assets stay at the repo root; everything else lives in a folder). Plain
HTML, CSS and vanilla JS: no framework, no bundler, no npm, no `node`.
Every JS file is an IIFE that publishes one `window.X` global, loaded by
`<script>` tags in a fixed order. Facts (file map, sizes, shared state,
load order, storage keys, roadmap) live in `.claude/MAP.md`: grep it,
never read it whole. `.claude/` also holds `modes/`, `rules/`, `skills/`,
`hooks/` and `agents/`.

## Session mode

The SessionStart hook prints `MODE: <mode>` and the matching
`.claude/modes/<mode>.md`, which overrides this file on branches,
pushing, shipping and the report's commands.

- `worktree` (default): `.claude/worktrees/<name>`, own branch, never pushed.
- `cloud`: a fresh clone; its `claude/<name>` branch, pushed, with a PR.
- `shared`: the main checkout, other sessions editing too; quick fixes only.

No `MODE:` line in context means the hook did not run: `CLAUDE_CODE_REMOTE=true`
is cloud, a `git rev-parse --git-common-dir` outside this checkout is
worktree, anything else is shared. Read `.claude/modes/<mode>.md` and say
in the report that the hook did not run. After `EnterWorktree`, read
`.claude/modes/worktree.md` before the next edit.

## One prompt, one finished result

The owner sends one prompt and comes back to a finished, verified change
plus two commands: Try (look at it) and Commit (one commit on local
`main`; the owner pushes with GitHub Desktop). Never stop at "ready to
commit": a reply that only says "go" costs a whole extra turn.

1. **Explore** through the `Explore` subagent. Ask the owner only when the
   answer changes what you build.
2. **Spec:** one per implementer call (see Spec format). A step with more
   than about three deliverables becomes several specs.
3. **Implement** with the `implementer` subagent.
4. **Verify:** the spec's command, then the flows and snapshots you
   touched (see Verify).
5. **Review:** over about 150 lines or more than three files, a fresh
   subagent checks `git diff` against the spec and reports only gaps that
   break the spec or a flow, not style.
6. **Commit** by path, as your mode says.
7. **Report:** end the turn with exactly this and nothing after it:
   1. **Name:** the feature in plain words, then the branch (and PR in
      cloud).
   2. **How it looks:** one or two screenshots of what changed (a `snap.py`
      scene, `jscheck.py ... --shot`, or `gframes.py` for the cutscene),
      saved outside the repo and sent to the owner. Never commit them.
   3. **Try:** one `bash` block, one command, from your mode file, plus
      one line saying where to look and what to do there.
   4. **Commit:** one `bash` block, one command, from your mode file
      (shared mode: the one line it gives).
   5. **Look at:** at most three bullets, plus anything left open.

If the owner replies with changes, do another round on the same branch
and end with the same report.

## Main session role

You explore through `Explore`, design, write specs, review the diff the
implementer returns and write the follow-up spec.

- Never call Write or Edit on source files, and never modify them through
  Bash (`sed -i`, heredocs, `>`/`>>`, scripts that write). The only
  exception is a single-line change where the spec would take longer than
  the edit. Cost and convenience are not exceptions.
- Docs, `.claude/MAP.md` rows, `.claude/handoff.md` and the markdown in
  `.claude/` are not source files: edit those directly.
- Explore before designing: grep `.claude/MAP.md`, then send code reading
  to `Explore` and work from its summary. Read yourself only the range of
  the file you are writing a spec against: every file read here is paid
  again on every later turn.
- Explore and Plan never load this file. An Explore prompt names the file,
  function or concept, says to grep `.claude/MAP.md` first, and asks for
  `file:line` anchors and a summary, not code bodies.

## Delegation

- Every code change goes to `implementer`, one spec per call, one file per
  call unless the change genuinely spans files. It has `omitClaudeMd:
  true`: it never sees this file, the rules or the map, only the spec.
- Parallel implementer calls only on completely separate files. Several
  tasks each adding a `<script>` line to `index.html`: each edits only its
  own line with one `Edit`, re-reading and retrying if the file changed.
- Parallel tasks on the same file (worktree and cloud mode only):
  `implementer-wt`, each in its own worktree cut from your `HEAD`, so
  commit first. Merge their branches one at a time with `git merge
  --no-ff`, resolve, re-run the flows.
- A new file over about 250 lines: the spec writes a skeleton first and
  adds function groups with Edits. One big Write dies on the output cap.
- An implementer that reports "blocked" or "hit the context line": never
  resume it with SendMessage (that reloads its whole context); write a
  narrower spec for a fresh call.

## Spec format

Complete enough that the implementer never chooses a name, a location or
a design. Every spec has:

1. **Target files:** the exact path of every file to create or edit, and
   the function names to grep so it reads only that region.
2. **Symbols:** exact names and full signatures to add or change.
3. **Logic steps:** an ordered, numbered list.
4. **Edge cases:** each one and exactly how to handle it.
5. **Do not touch:** files, symbols and behaviour that stay unchanged,
   including foreign edits already in a target file (shared mode).
6. **Style:** drawing work copies the rules that apply from
   `.claude/rules/art-style.md`; readings from `.claude/rules/instruments.md`.
7. **Verification:** the exact command, or "none". Never `serve.py` (it
   blocks). Browser behaviour: `py -3 tools/nav-flows.test.py <flows>`,
   which runs its own server and exits. There is no `node`: a passing
   flow is the syntax check.

## Domain rules

Drawing anything (Rex kingdoms, Mainland factions, any new place):
`.claude/rules/art-style.md`. Instruments, sites, readings, HUD tiles:
`.claude/rules/instruments.md`. They load only when a matching file is
read, and you delegate the reading, so read them yourself before
designing in those areas.

## Verify

- Test only the flows you touched: `py -3 tools/nav-flows.test.py <flow>`
  (`--list` names them). The full suite runs only before a commit that
  touches navigation, the gate or storage. Known failures on `main`, not
  a regression: `gate-exits` and `worklink` "lands on Work" (the scroll
  lands 72 px above the section).
- Anything that paints or styles: `py -3 tools/snap.py capture <name>`
  (about 3.5 min, 50 scenes) before touching code and again after, then
  `py -3 tools/snap.py compare <before> <after>`: `same` on every scene
  you did not mean to change. Runs live in `snapshots/` (gitignored), so
  a fresh worktree captures its own "before". A `page-*` scene fails on
  any console error, which is the case-page toys' error check.

## Context budget

Quality drops as a context grows, long before the window is full.
`.claude/hooks/context-watch.py` measures every context after every tool
call and prints `CONTEXT WATCH` at 80% of its line and past it. Lines:
main 140k, Explore and Plan 100k, implementer 60k; a subagent at 1.5
times its line has every further tool call denied.

- Main session past its line: finish only the current atomic step (an
  implementer already running may finish; start nothing new), verify,
  commit, then follow your mode file's "Context full" rule. The `handoff`
  skill has the handoff format; use it too whenever a turn must end with
  work half done.
- `SUBAGENT CONTEXT ... over the line` means the spec or Explore prompt
  was too wide: next time name the file, function and line range, or
  split the task.
- A handoff printed at session start: restate the plan in two lines,
  continue from Next, never redo Done, delete the file once absorbed.

## Token rules (every agent)

- Never read a whole file over 300 lines (MAP.md lists those over 500):
  grep the name, then `Read` around the hit. Names do not drift; line
  numbers do.
- Never open `cv.pdf`, `media/`, `Temporary VoidScape Media/` or
  `__pycache__/`; list them for names only. In `snapshots/`, open only
  the PNGs you are reviewing.
- Keep command output out of context: pipe through `tail -n 30` /
  `Select-Object -Last 30`, or grep it for errors.
- A new file, moved function or new export gets its MAP.md row fixed in
  the same commit (branches: see your mode file).

## Commands

Local tools run with `py -3`; the cloud container has only `python3`.

- **Run:** `py -3 serve.py`, then `http://127.0.0.1:8765/` (the desktop
  Preview uses `.claude/launch.json`). The test tools pick free ports.
- **Cutscene frames:** `py -3 tools/gframes.py <run> [beat ...]` writes
  `snapshots/frames/<run>/<beat>.png`.
- **JS check:** `py -3 tools/jscheck.py <files> --eval "<js>" [--shot
  out.png]` loads files in a headless page.
- **Cache-bust:** `py -3 tools/bump.py` rewrites every `?v=`. Who may run
  it depends on the mode.

## Git and the owner's commands

- Stage by path, always. Never push (cloud mode: only your own `claude/`
  branch), never merge or commit onto `main` except a shared-mode commit,
  never delete branches, never `gh pr merge`. Only the owner's `try.py
  --commit` and GitHub Desktop reach `main` and origin.
- `.claude/hooks/git-guard.py` enforces this and blocks blanket git
  (`add -A`/`.`, `commit -a`, `stash`, `checkout --`, `restore`, `reset
  --hard`, `clean`, `rebase`, force push). Do not work around it; if the
  owner wants one, they run it themselves.
- Commands shown to the owner go in fenced blocks tagged `bash` (the app
  gives them a Run button) and must also work pasted into Windows
  PowerShell 5.1: forward-slash paths (`C:/Users/...`), never `&&`, `||`,
  `$(...)` or bash `if`; one command per block. The Bash tool is fine for
  your own use.
- No scratch files in the repo: GitHub Pages publishes every committed
  file. Logs, notes and screenshots go in the session's scratchpad.
