# Portfolio: rules for every session

Personal portfolio on GitHub Pages. It is a user site, so the pages and
site assets sit at the repo root and everything else lives in folders.
Plain HTML, CSS and vanilla JS: no framework, bundler, npm or `node`.
Every JS file is an IIFE that publishes one `window.X` global, loaded by
`<script>` tags in a fixed order. Tools are Python, run as `py -3`.

Facts live in `.claude/MAP.md` (file map, sizes, shared state, load
order, storage keys, roadmap). Grep it; it is too long to read whole.
`.claude/` also holds `modes/`, `rules/`, `skills/`, `hooks/`, `agents/`
and `playbook.md`.

## Session mode

The SessionStart hook prints `MODE: <mode>` and the matching
`.claude/modes/<mode>.md`. The mode file overrides this one on branches,
pushing, shipping and the report's commands.

- `worktree` (default): `.claude/worktrees/<name>`, own branch, never pushed.
- `cloud`: a fresh clone on a `claude/<name>` branch, pushed, with a PR.
- `shared`: the main checkout, with other sessions editing too; quick fixes.

No `MODE:` line means the hook did not run. Then `CLAUDE_CODE_REMOTE=true`
is cloud, a `git rev-parse --git-common-dir` outside this checkout is
worktree, and anything else is shared: read that mode file and say in
the report that the hook did not run. After `EnterWorktree`, read
`.claude/modes/worktree.md` before the next edit.

## Plans

Big work runs as a plan: `.claude/plans/<name>.md`, started from
`TEMPLATE.md` with `/plan new <name>: <brief>`, driven by
`.claude/skills/plan/SKILL.md`. A `PLAN: <name> · <stage>` line from the
hook means a plan is bound to this checkout (`.claude/plans/HERE`, or
the only active one); `PLANS:` means none is bound here yet. Several
plans can run at once, one per checkout.

- **Planning happens in the app**: the interview, one step per prompt.
- **Execution is one phase per fresh session** (owner's rule,
  2026-09-26), because each phase deserves a clean context. A phase
  ends by verifying, committing, and writing `PLAN_STATE.md` at the repo
  root; nothing ever rolls into the next phase.
- **Unattended:** `py -3 tools/autoplan.py <name>` runs the phases from
  a terminal, one headless session each. It watches context from
  outside, stops a session that overflows, commits leftovers, and
  starts the next one. Inside such a session `AUTOPLAN=1` is set: follow
  the skill's "Running unattended" section.
- **By hand:** each prompt runs one phase and ends with the skill's
  "Phase complete" message; the owner clears and says "Read
  PLAN_STATE.md and execute the next phase" (or "go").

The same split applies outside plans: a prompt with two separable pieces
of work gets the first finished, committed and reported, and the second
named under "Look at".

## One prompt, one finished result

The owner sends one prompt and comes back to a finished, verified,
committed change. Stopping at "ready to commit" costs them a whole turn.

1. **Explore** through the `Explore` subagent. Ask the owner only when
   the answer changes what you build.
2. **Spec** one per implementer call (format in `.claude/playbook.md`).
   A step with more than about three deliverables becomes several specs.
3. **Implement** with the `implementer` subagent.
4. **Verify**: the spec's command, then the flows and snapshots you
   touched (see Verify).
5. **Review**: over about 150 lines or three files, a fresh subagent
   checks `git diff` against the spec and reports only gaps that break
   the spec or a flow.
6. **Commit** by path, as your mode says, with a message that describes
   the work (a squash takes the branch tip's message). In worktree mode
   run the mode's `try.py --commit` yourself once verified.
7. **Report**: end the turn with exactly this:
   1. **Name:** the feature in plain words, then the branch (and PR in cloud).
   2. **How it looks:** one or two screenshots of what changed (`snap.py`
      scene, `jscheck.py ... --shot`, or `gframes.py` for the cutscene),
      saved outside the repo and sent to the owner.
   3. **Try:** one `bash` block with one command from your mode file, and
      one line on where to look and what to do.
   4. **Commit:** one `bash` block from your mode file, or which commit
      already landed on local `main`.
   5. **Look at:** at most three bullets, plus anything left open.

If the owner replies with changes, do another round on the same branch
and end with the same report.

## Main session role

You explore, design, write specs, review what the implementer returns
and write the follow-up spec. Source files are written by `implementer`,
because the main context is paid again on every turn.

- Do not edit source files yourself (Write, Edit, or Bash that writes).
  The one exception is a single-line change where a spec would take
  longer than the edit.
- Docs, `.claude/MAP.md` rows, `.claude/handoff.md` and the markdown in
  `.claude/` are not source: edit those directly.
- Before designing, grep `.claude/MAP.md`, then send code reading to
  `Explore`. Read yourself only the range you are writing a spec against.
- Explore and Plan never load this file: name the file, function or
  concept, tell them to grep `.claude/MAP.md` first, and ask for
  `file:line` anchors and a summary, not code bodies.

## Delegation

Every code change goes to `implementer`, one spec per call, one file per
call unless the change genuinely spans files. It runs with
`omitClaudeMd: true` and sees only the spec, so the spec carries
everything it needs. Read `.claude/playbook.md` before the first spec of
a turn: parallel calls, big new files, blocked implementers, the Spec
format and the tool commands.

## Domain rules

Drawing anything (Rex kingdoms, Mainland factions, any new place):
`.claude/rules/art-style.md`. Instruments, sites, readings, HUD tiles:
`.claude/rules/instruments.md`. They load only when a matching file is
read, and you delegate reading, so read them yourself before designing
in those areas.

## Verify

- Test only the flows you touched: `py -3 tools/nav-flows.test.py <flow>`
  (`--list` names them). Run the full suite only before a commit that
  touches navigation, the gate or storage. Known failures on `main`:
  `gate-exits`, and `worklink` "lands on Work" (72 px short).
- Anything that paints or styles: `py -3 tools/snap.py capture <name>`
  before and after (about 3.5 min, 50 scenes), then
  `py -3 tools/snap.py compare <before> <after>`: `same` on every scene
  you did not mean to change. Runs live in `snapshots/` (gitignored), so
  a fresh worktree captures its own "before". A `page-*` scene fails on
  any console error, which is the case-page toys' error check.

## Context budget

`.claude/hooks/context-watch.py` prints `CONTEXT WATCH` near each line:
main 90k (auto-compact at 100k), Explore and Plan 100k, implementer 60k.
A subagent at 1.5 times its line is denied further tools, which means
the prompt was too wide: next time name the file, function and range, or
split the task. Never ask the owner to `/compact`.

- Main session past its line: finish the current atomic step, verify,
  commit, then follow your mode file's "Context full" rule and the
  `handoff` skill. A running plan instead stops as `partial` (plan skill).
- A handoff printed at session start: restate the plan in two lines,
  continue from Next, never redo Done, delete the file once absorbed.

## Token rules (every agent)

- Never read a whole file over 300 lines (MAP.md lists those over 500):
  grep the name, then read around the hit. Names do not drift; line
  numbers do.
- Never open `cv.pdf`, `media/`, `Temporary VoidScape Media/` or
  `__pycache__/`; list them for names only. In `snapshots/`, open only
  the PNGs you are reviewing.
- Keep command output short: `tail -n 30`, `Select-Object -Last 30`, or
  grep for errors.
- A new file, moved function or new export gets its MAP.md row fixed in
  the same commit (branches: see your mode file).

## Git and the owner's commands

- Stage by path. Never push (cloud: only your own `claude/` branch),
  never merge or commit onto `main` except a shared-mode commit, never
  delete branches, never `gh pr merge`. Only `try.py --commit` (run by
  you in worktree mode) reaches local `main` from a branch; only the owner's GitHub Desktop reaches origin.
- `.claude/hooks/git-guard.py` blocks blanket git (`add -A`/`.`,
  `commit -a`, `stash`, `checkout --`, `restore`, `reset --hard`,
  `clean`, `rebase`, force push). Do not work around it; the owner runs
  those themselves if wanted.
- Commands shown to the owner go in fenced `bash` blocks (the app adds a
  Run button), one command per block, and must also work pasted into
  Windows PowerShell 5.1: forward-slash paths, no `&&`, `||`, `$(...)`
  or bash `if`.
- No scratch files in the repo: GitHub Pages publishes every committed
  file. Logs, notes and screenshots go in the session's scratchpad.
