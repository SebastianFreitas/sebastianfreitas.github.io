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

## Plans

A `PLAN: <name> · <stage>` line from the hook means a many-phase plan is
bound to this checkout (`.claude/plans/HERE`, or the only active plan):
follow `.claude/skills/plan/SKILL.md`, where a bare "go" continues it.
Several plans can run at once, one per checkout; `PLANS:` means none is
bound here yet. New plans start from
`.claude/plans/TEMPLATE.md` via `/plan new <name>: <brief>`.

**One phase per prompt, then clear (owner's rule, 2026-09-26).** A
running plan never does two phases in one turn and never rolls into the
next phase after compaction. Each prompt executes the one active phase,
verifies it, commits, writes `PLAN_STATE.md` at the repo root (the
skill's format: architecture now, completed phase, next phase's exact
start), and hard-stops with the skill's exact "Phase complete" message.
The owner runs `/clear` and prompts "Read PLAN_STATE.md and execute the
next phase." The same split applies outside plans: a prompt that
contains two separable pieces of work gets the first one finished,
committed and reported; the second waits for its own prompt, named
under "Look at".

## One prompt, one finished result

The owner sends one prompt and comes back to a finished, verified change
plus two commands: Try (look at it) and Commit (one commit on local
`main`; the owner pushes with GitHub Desktop). Never stop at "ready to
commit": a reply that only says "go" costs a whole extra turn.

1. **Explore** through the `Explore` subagent. Ask the owner only when the
   answer changes what you build.
2. **Spec:** one per implementer call (`.claude/playbook.md`). A step with more
   than about three deliverables becomes several specs.
3. **Implement** with the `implementer` subagent.
4. **Verify:** the spec's command, then the flows and snapshots you
   touched (see Verify).
5. **Review:** over about 150 lines or more than three files, a fresh
   subagent checks `git diff` against the spec and reports only gaps that
   break the spec or a flow, not style.
6. **Commit** by path, as your mode says. In worktree mode, once the work
   is verified, run the mode's Commit command (`try.py --commit`)
   yourself and keep going; the owner only pushes. Give the branch tip a
   commit message that describes the work: the squash takes its message.
7. **Report:** end the turn with exactly this and nothing after it:
   1. **Name:** the feature in plain words, then the branch (and PR in
      cloud).
   2. **How it looks:** one or two screenshots of what changed (a `snap.py`
      scene, `jscheck.py ... --shot`, or `gframes.py` for the cutscene),
      saved outside the repo and sent to the owner. Never commit them.
   3. **Try:** one `bash` block, one command, from your mode file, plus
      one line saying where to look and what to do there.
   4. **Commit:** one `bash` block, one command, from your mode file
      (shared mode: the one line it gives). Worktree mode: say which
      commit already landed on local `main` instead.
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
- Before the first spec of a turn, read `.claude/playbook.md`: parallel
  calls, big new files, blocked implementers, the Spec format and the
  tool commands.

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

`.claude/hooks/context-watch.py` prints `CONTEXT WATCH` near each
line: main 90k (auto-compact at 100k), Explore and Plan 100k,
implementer 60k; a subagent at 1.5 times its line is denied further
tools. Never ask the owner to `/compact`, never stop for it.

- Main session past its line: finish only the current atomic step (start
  nothing new), verify, commit, then follow your mode file's "Context
  full" rule and the `handoff` skill. Never clear the session to
  continue.
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

## Git and the owner's commands

- Stage by path, always. Never push (cloud mode: only your own `claude/`
  branch), never merge or commit onto `main` except a shared-mode commit,
  never delete branches, never `gh pr merge`. Only `try.py --commit`
  (run by you in worktree mode, owner's call 2026-09-26) reaches local
  `main`; only the owner's GitHub Desktop reaches origin.
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
