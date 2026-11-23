# Playbook: read the section you need, once per window

Shared by every project. The project's own part (spec style and
verification details, tool commands) is `.claude/project/playbook.md`:
read its matching section too.

## Delegation

- Subagents run in the background (the desktop app's Agent tool has no
  other mode; `.claude/hooks/agent-guard.py` refuses only an explicit
  `run_in_background` other than false): the harness reports each
  exit, the main session waits for that notice and never polls.
  Parallel calls are several Agent calls in one message: they run
  together and return together.
- **Reports:** every agent writes its full report to a file and returns
  at most about 150 words: a status or verdict line, the files changed,
  each blocker or must-fix finding in one line (at most five), and the
  report's path; `reply-cap.py` sends a reply over 250 words back once.
  The default path is
  `.claude/specs/reports/<agent>-<slug>.md` in the agent's checkout
  (gitignored with `.claude/specs/`; only a run's final commit deletes it); name
  another in the prompt when needed (`implementer-wt`: an absolute path
  in your checkout). Open a report only for a line the summary leaves
  unclear, by grep.
- **Built-in agents** get the contract as the last line of the prompt.
  `Explore` cannot write files: "Answer in at most 150 words: one line
  per finding with its `file:line`." `researcher` (research and
  report-writing helpers; Explore stays for read-only code lookups) and
  `general-purpose` (only when a task needs a tool `researcher` lacks):
  "Write your findings to `<path>`; reply with at most 150 words and the
  path." Name a `<path>` under `.claude/specs/reports/`: a helper cut
  off at 1.25 times its line can still write only there.
- Parallel implementer calls only on completely separate files. Several
  tasks each adding one line to the same file (a `<script>` tag, a
  registry entry): each edits only its own line with one `Edit`,
  re-reading and retrying if the file changed.
- Parallel tasks on the same file (worktree and cloud mode only):
  `implementer-wt`, each in its own worktree cut from your `HEAD`, so
  commit first. Merge their branches one at a time with `git merge
  --no-ff`, resolve, re-run the checks.
- A new file over about 250 lines: the spec says to write a skeleton
  first and add function groups with Edits. One big Write dies on the
  output cap.
- Never resume an implementer with SendMessage, whether it finished,
  reported "blocked" or hit its context line: a resumed subagent always
  runs in the background (Claude Code docs, 2026-10-08), which is the
  hand-back the agent guard exists to stop, and it reloads its whole
  context. A reviewer gap or a blocked report is a narrower spec for a
  fresh call: the reviewer's `file:line` and smallest fix become its
  Where and Goal.
- A prepared run saves each spec as `.claude/specs/<k>.md` and the run
  window sends only its path (`.claude/rules/workflow.md` "One prompt").
- A plan phase that stops after designing saves each finished spec as
  `.claude/plans/<name>.spec-<phase>-<k>.md` in the format below (plan
  skill).
- Over about 150 lines or three files (`.claude/` and `.md` files not
  counted): the `reviewer` gets the spec paths and the changed paths
  before you commit (`review-guard.py` enforces it, workflow.md Run).

## Prepare

The detail behind `workflow.md` "Prepare".

This window's line is 200k. Two prepare windows reached 140k writing
specs and reading files themselves (2026-10-01, when the line was
120k), which is why this window still reads nothing itself.

1. **Explore** through `Explore` (the files, functions, `file:line`
   anchors and the rules files covering them), ask the obvious
   questions, and keep working in the same turn once answered. **Read
   nothing yourself:** a gap goes to a second, narrower Explore.
2. **Spec** one per implementer call (playbook "Spec format"): intent,
   under about 40 lines, at most about three deliverables (more: split).
   **Write each spec once**, one Write, never read back; an afterthought
   goes in the handoff's Next line for that spec. For a prepared run
   save each as `.claude/specs/<k>.md` (gitignored) and write
   `.claude/handoff.md` as the `handoff` skill's "Prepared run" says.
   End the turn with what will be built in two or three plain lines,
   then the go prompt (what: "build the prepared specs"; file:
   `.claude/handoff.md`), nothing after it.

## Receiving a go prompt

**Receiving one** (bare `go` or not): `go-check.py` prints `GO CHECK:`
ok, or MISMATCH with what to do (no line: run the two git commands and
compare yourself). On a mismatch stop and say where each is. Never
switch checkout or branch to match, except as your mode file says
(cloud "continue PR #<n>"; worktree: a new chat merges the named branch
for a plain handoff); a prepared run never moves.

## Plans

Big work is a plan (`/plan new <name>: <brief>`, `.claude/plans/`). The
hook prints `PLAN: <name> · <stage>`; read only the stage file
`.claude/skills/plan/SKILL.md` names (`AUTOPLAN=1`: `unattended.md`).
One `/clear` after the ready gate, then one app window supervises every
headless `autoplan.py` phase; nobody clears or says `go` between phases.

## Raw mode

For hard problems: a prompt that starts `raw:` (or is just `raw`) puts
this window in raw mode until `/clear` or a new chat (`raw-mode.py`;
owner, 2026-11-02: *"our context has all steps done to solve the asked
task"*). Every step of the task happens in this window's own context: it
reads, thinks, edits source and runs verify itself, with no specs and no
prepare-clear-run. "Coordinator" and "Main session role" do not apply,
and `agent-guard.py` refuses `Explore`, `Plan`, `implementer` and every
other helper that would do a step.

Checks on finished work do not change. `reviewer` still runs where Run
step 5 says and `review-guard.py` still refuses the commit without it:
it reads a spec, so save the owner's words and what done means as
`.claude/specs/raw.md`, name that and the changed paths, and fix a gap
here. Looks follow Token rules: this window opens the pictures itself,
and may call `look-judge` for a second opinion. All other hooks and
rules hold.
The window's line is 250k; past it, hand off with a go prompt that
starts `raw:` instead of `go:`, so the next window stays raw. The report
keeps its five parts.

## Run

The detail behind `workflow.md` "Run" steps 3 to 7.

A go prompt whose printed handoff starts `Run: prepared`, checkout and
branch checked first. This window only manages, never reads a spec or a
diff (about 3k tokens per spec; a fresh window starts near 60k, so
about 35 take it to 165k, under the 180k warning of its 200k line, with
room for review and report).

- A prepared run's specs are gitignored and exist only in the worktree
  the go prompt names, so a run never moves to another checkout.
- Verify: the reviewer may re-run the implementer's checks.
- Verify: homepage or case-page paint is also shot with `py -3 tools/ffshot.py` (installed Firefox; `--games` for the rows).
- Rex poses: `py -3 tools/rexsheet.py <run> [--mix a,b]` sheets every pose of Rex and prints limb length ratios (like `gframes.py`, for review without running the cutscene).

3. **Implement:** one `implementer` per spec, the prompt only
   "Your spec is `.claude/specs/<k>.md`: read it and implement it".
   Parallel specs (where the handoff says so) are several calls in one
   message. Blocked: one `Explore`, a narrower spec, a fresh
   implementer; still blocked, stop and tell the owner.
4. **Verify:** the implementer runs its checks and `CLAUDE.md` § Verify
   for the areas touched and reports pass or fail with the key numbers.
   This window runs one tailed command only when a report is ambiguous.
5. **Review:** over about 150 lines or three files (`.claude/` and `.md`
   not counted) the `reviewer` gets the spec and changed paths and
   reports only gaps that break the spec or a flow; a gap is a new spec,
   back to step 3. Review is not a judgement call:
   `.claude/hooks/review-guard.py` counts the real diff at `git commit`
   and at `try.py --commit` and refuses the command until a reviewer has
   run in this window; an earlier window's review does not count.
6. **Commit** by path as your mode says, the message describing the work
   (a squash takes the branch tip's message). Landing on `main` waits
   for the owner's OK (worktree: commit on the branch only, then `try.py
   --commit`, the mode file's Commit; shared: the commit itself). Only the run's final commit deletes `.claude/specs/` (this
   session's specs and reports, not another session's in shared mode)
   and `.claude/handoff.md`; a context-full commit keeps them.
7. **Report:** the five parts exactly as `workflow.md` "Run" step 7
   lists them; that list is the only copy.

## Models

Opus thinks and judges (main, plan runs, `plan-writer`, Plan,
`reviewer`, `plan-reviewer`, `look-judge`), Sonnet does (`Explore`, `implementer`).
The reviewers moved to Opus because Sonnet 5.5 misses more on hard
reviews and more of its comments are noise; it matches Opus on
spec-driven code at half the cost (owner, 2026-10-05). When the owner
picks Fable (`claude-fable-5-2`) for a session, only the main session
and the agents that inherit its model (`plan-writer`, Plan,
general-purpose, a built-in Explore) become Fable; the agent files that
name `opus` or `sonnet` keep that model. Fable manages, writes specs and
delegates every code change exactly as Opus does (owner, 2026-10-02).
Plan runs use Opus: `autoplan.py` defaults to `claude-opus-5-5` at
medium whatever the app shows, and a run never passes `--model` (owner,
2026-10-12: plan on Fable, clear, run on Opus medium). No Haiku: a
missed caller costs more than it saves (owner, 2026-10-01). Each project
keeps its own `.claude/agents/explore.md` with `model: sonnet`; without
one the built-in Explore runs on the main model. Effort: medium is the
base everywhere, and anything above it is the owner's pick for a hard
task or a long shot, never a default (owner, 2026-10-12). The main
session defaults to medium (`modelSettings` in `.claude/settings.json`)
until the owner picks another level in the app. `plan-writer` has no
`effort:`, so it follows the session's effort as well as its model: a
pick of Fable high reaches the research and math, where it pays, while
an Opus medium session plans at Opus medium. Every other agent file
fixes medium, which overrides the session's effort, so the agents that
build and review never go above it. Autoplan's headless phases pass
`--effort medium`. Model and effort come only from the agent files and
the owner's pick: `agent-guard.py` refuses an Agent call that passes
`model` or `effort`.

## Spec format

Intent, not a line-level design: the implementer reads the code and the
rules files the spec names, and settles the how. The spec fixes what the
owner or other code would notice (names others call, numbers, text,
look) and leaves the rest. Under about 40 lines, written once with one
Write and never read back; longer means two specs. Every spec has:

1. **Goal:** what changes and why, in plain words.
2. **Where:** the files to create, edit or delete, and the functions or
   names to grep there (from `.claude/MAP.md` or an Explore's anchors).
3. **Read first:** the `.claude/rules/` files for the area (the project
   playbook says which) and any doc the change must follow.
4. **Constraints:** decisions already made (names, values, text, look),
   project invariants it touches, and what stays unchanged, including
   foreign edits already in a target file (shared mode).
5. **Acceptance:** what is true when done, and the exact checks: the
   verify commands (never one that blocks: a dev server, an editor
   window; the project playbook names those that run and exit), the
   numbers to report, the screenshots to take and what each must show,
   and a `git grep` proving deleted names are gone.

## Commands every project has

- **Try and Commit:** `tools/try.py`, commands in your mode file. Try
  belongs to the owner: print it, never run it. Commit (`--commit`) runs
  only on the owner's OK: the owner runs it, or replies "merge it" /
  "land it" and you run it (`git-guard.py` checks their latest message).
- **Autoplan:** `py -3 tools/autoplan.py [<name>] [--dry-run]
  [--max-sessions N] [--budget USD] [--effort medium] [--line 250000]
  [--kill 300000] [--force]`. The window that launches it (or whose go
  prompt runs a plan) is a plan run's supervisor, with a 250k line.
  The headless 250k/300k assume a 1M window, unproven on 2026-11-23 (no
  Opus 5.5 or Fable 5.2 session had passed 190k): if a phase session
  dies near 200k, pass `--line 175000 --kill 200000`.
  Started by the app session in the
  background (`run_in_background`) with `--max-sessions 1`, one phase
  per launch, and relaunched by it after each phase (plan skill
  `run.md`); a terminal is only a fallback. Runs a plan's
  phases unattended, one headless session each, in
  `.claude/worktrees/plan-<name>`, on the subscription only (no API key;
  stops at the usage limit), and stops when questions wait, on a
  blocker, or at plan-done. Logs and the run lock in `.claude/autoplan/`.
- **Cleanup:** `py -3 tools/cleanup.py` deletes local session branches
  and their worktrees once they have landed on `main` and sat idle 24 h
  (it also runs at session start and after `try.py --commit`).
- **Sync:** `py -3 <master>/sync.py status|push|pull <project root>`
  ("Shared files" below). After committing a sync
  in a project, its `main` must be pushed: new app sessions start from
  `origin/main` and never see an unpushed sync.
- **Hook tests:** `py -3 .claude/hooks/hooks_test.py` (`-k <text>` runs
  the cases whose name has it; stdlib only, temp copies, never touches the
  real session). A hook change is not committed until it exits 0.

## Shared files

Every path in `.claude/workflow.lock` came from the master. Edit them in
the project like any file when the owner asks for a workflow change,
then, after the commit, send the change back so every project gets it:
`py -3 <master>/sync.py pull <project root>`, where `<project root>` is
this session's own checkout (`git rev-parse --show-toplevel`), never
the main checkout from a worktree. `pull` rewrites
`.claude/workflow.lock` last, so commit the lock by path right after it;
an uncommitted lock left in the main checkout blocks landings. At session start
`WORKFLOW SYNC:` names what differs: `project-changed`: pull (above);
`master-changed` or `new`: `py -3 <master>/sync.py push <project root>`,
then commit the updated files by path; `conflict`: merge by hand and
tell the owner.

The project's half lives in `.claude/project/`, which sync never
touches: `modes/<mode>.md` (printed by the hook after the shared mode
file: landing steps, literal Try/Commit paths), `playbook.md`,
`implementer.md` (the only project context implementers get),
`reviewer.md` (the invariants and runtime pitfalls the reviewer checks),
optional `autoplan.json` (`allowedTools` for unattended runs), optional
`file-guard.json` (extra binary suffixes and cache folders, source
suffixes, generated files and why), optional `settings.json`
(permissions and the project's own hooks: `sync.py push` merges it into
`.claude/settings.json`, so edit the fragment, never the merged file).
A project's own hook scripts sit in `.claude/hooks/` next to the shared
ones; sync leaves files it does not list alone. `tools/try.py` and
`tools/try_commit.py` call the project's optional `tools/try_project.py`
(`add_arguments` and `launch` for Try, `before_commit` for landing steps
and `verify` for checks, both on the combined tree in the `-try`
checkout). Every project gitignores `.claude/handoff.md`,
`.claude/specs/`, `.claude/worktrees/`, `.claude/plans/HERE` and
`.claude/autoplan/`.

## No MODE line

The SessionStart hook did not run. Then `CLAUDE_CODE_REMOTE=true` is
cloud, a `git rev-parse --git-common-dir` outside this checkout is
worktree, and anything else is shared: read that mode file and say in
the report that the hook did not run.

## Landed

Worktree mode, after you ran the Commit on the owner's OK and it printed
`LANDED:` (owner, 2026-10-02): rename the session with
`set_session_title` (`session_id` "self") to `Landed: ` plus its current
title, call `mark_completed` ("self"), and end the turn with one line:
"Landed as <sha> on `main` and pushed; this worktree is finished
(archive it, or reply here for a follow-up round)." When the owner runs
the command themselves, the `LANDED:` line is their signal.

## Landing from the coordinator

git-guard checks only the owner's latest typed message in the window
that runs the command, so the coordinator window can land any branch.
Before asking the owner, check each finished branch with
`py -3 <main checkout>/tools/try.py <branch> --commit --dry-run` (read
only, no owner word needed) and tell him `READY` or what blocks it.
When his latest message in the coordinator window says "land <name>"
(or "land all"), run `try.py <branch> --commit` for each named branch,
one at a time, and report each `LANDED:` sha; then tell that sub-chat
in one SendMessage that its branch landed (it does playbook "Landed").
Ask in plain text, never AskUserQuestion: a clicked answer is not a
typed message and the guard ignores it. Never relay "land it" to a
sub-chat. A conflict goes back to the sub-chat as "merge main into
your branch and resolve" (not a landing, so relaying it is fine).

## Merging by hand

Shared mode, only when the owner asks you to merge branches. Merge the
open branches into `main` one at a time with `--no-ff`, oldest first.
`.claude/MAP.md` rows: keep both sides' rows, then re-count the changed
files. The project's shared-mode notes say how its own conflicts
resolve. After the last
merge run the landing steps once and the project's full check (`CLAUDE.md`
§ Verify), commit, and end with the report (the owner pushes). Never
delete branches by hand; `tools/cleanup.py` removes merged ones once
idle 24 h.
