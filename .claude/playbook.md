# Playbook: read the section you need, once per window

Shared by every project. The project's own part (spec style and
verification details, tool commands) is `.claude/project/playbook.md`:
read its matching section too.

## Delegation

- Subagents run in the background (the desktop app's Agent tool has no
  other mode; `.claude/hooks/agent-guard.py` refuses only an explicit
  `run_in_background` other than false): the harness reports each
  exit, the main session waits for that notice (never poll: workflow "Git").
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
  report-writing helpers; Explore stays for read-only code lookups; a
  main window never calls `general-purpose` or `claude`, `agent-guard.py`
  refuses them: run the command yourself, or use implementer / researcher /
  Explore):
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
- **`look-judge` prompts** carry the context, never just paths and a
  sentence: what the thing is and what each shot shows, the owner's
  words on the look verbatim (earlier complaints too), what changed this
  round, and the before or reference shot when one exists. Optional in an
  app window (use it when you directed the fix and want eyes that owe it
  nothing), required at a plan's look phases, where nobody watches and a
  headless phase session cannot Read pictures.
- A prepared run saves each spec as `.claude/specs/<k>.md` and the run
  window sends only its path (`.claude/rules/workflow.md` "One prompt").
- A plan phase that stops after designing saves each finished spec as
  `.claude/plans/<name>.spec-<phase>-<k>.md` in the format below (plan
  skill).
- Over about 150 lines or three files (`.claude/` and `.md` files not
  counted): the `reviewer` gets the spec paths and the changed paths
  before you commit (`review-guard.py` enforces it, workflow.md Run); a sketch round has none (workflow.md Run step 5).

## Prepare

The detail behind `workflow.md` "Prepare".

This window's line is 150k. Two prepare windows reached 140k writing
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

## The go prompt

Format (owner, 2026-10-01: a bare `go` guessed its worktree and branch
wrong). A turn that hands its work to a fresh window (a prepared run, a
context-full handoff, a plan's ready gate, a paused interview, a plan
waiting for answers) ends, after the report, with the prompt in a plain
fenced block (not `bash`: no Run button) as the last thing in the turn:

    Ready. Please run `/clear`, then paste this:

    ```
    go: <what to do>. Checkout <path> on branch <branch>, <mode> mode. Read <file> first.
    ```

- `<what to do>`: one plain clause ("build the prepared specs",
  "continue the handoff", "run plan <name> one phase at a time",
  "answer plan <name>'s questions"). A stage file may give another first clause
  without `go:`; the rest of the line stays.
- `<path>`, `<branch>`: from `git rev-parse --show-toplevel` and `git
  branch --show-current` run now, forward slashes, never from memory
  (cloud: add `PR #<n>`).
- `<file>`: `.claude/handoff.md` for a run or a handoff,
  `.claude/plans/<name>.md` for an interview, the plan's state file for
  a run or its questions.
- The coordinator window's own prompt starts `coordinator:` instead of
  `go:`; `go-check.py` checks both.

**Receiving one** (bare `go` or not): `go-check.py` prints `GO CHECK:`
ok, or MISMATCH with what to do (no line: run the two git commands and
compare yourself). On a mismatch stop and say where each is. Never
switch checkout or branch to match, except as your mode file says
(cloud "continue PR #<n>"; worktree: a new chat merges the named branch
for a plain handoff); a prepared run never moves.

## Context full

(The coordinator window writes no handoff: `/clear` then `coordinator`; see `coordinator.md`.) Main session past its line: finish only the current atomic step, verify,
commit (keep `.claude/specs/`: pending specs and any report the handoff
names stay for the next window), write `.claude/handoff.md` (`handoff`
skill), end with the normal report plus your mode file's "Context full"
extras, then the go prompt (what: "continue the handoff"; a run's:
`handoff` skill). Plans stop their own way. A handoff at session start:
restate the plan in two lines, continue from Next, never redo Done,
delete the file once absorbed; a `Run: prepared` one stays until the
run's commit.

## MAP rows

A new file, moved function or new export gets its MAP.md row fixed in the
same commit (branches: see your mode file). Rows hold purpose and
exports, no line counts, no line over 300 characters (Grep prints
"[Omitted long matching line]" instead); detail goes on bullets under the
table, each starting with the file name. `review-guard.py` refuses a
commit once when either slips.

## Obvious questions

Anything two reasonable builders would do differently (the look, where it
goes, what happens on failure, what stays as it is) is asked in step 1. A
choice with one sensible answer is taken and named under Look at; a turn
ends early only when something went really wrong.

## Plans

Big work is a plan (`/plan new <name>: <brief>`, `.claude/plans/`). The
hook prints `PLAN: <name> · <stage>`; read only the stage file
`.claude/skills/plan/SKILL.md` names (`AUTOPLAN=1`: `unattended.md`).
One `/clear` after the ready gate, then one app window supervises every
headless `autoplan.py` phase; nobody clears or says `go` between phases.

## Run

The detail behind `workflow.md` "Run" steps 3 to 7.

A go prompt whose printed handoff starts `Run: prepared`, checkout and
branch checked first. This window only manages, never reads a spec or a
diff (about 3k tokens per spec; a fresh window starts near 60k, so
about 22 take it to 126k, under the 135k warning of its 150k line, with
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
4. **Verify:** the implementer runs its checks and `CLAUDE.md` Verify
   for the areas touched and reports pass or fail with the key numbers.
   This window runs one tailed command only when a report is ambiguous.
5. **Review:** over about 150 lines or three files (`.claude/` and `.md`
   not counted) the `reviewer` gets the spec and changed paths and
   reports only gaps that break the spec or a flow; a gap is a new spec,
   back to step 3. Review is not a judgement call:
   `.claude/hooks/review-guard.py` counts the real diff at `git commit`
   and at `try.py --commit` and refuses the command until a reviewer has
   run in this window; an earlier window's review does not count.
   Sketch rounds: the rule is in workflow.md Run step 5 (one statement).
6. **Commit** by path as your mode says, the message describing the work
   (a squash takes the branch tip's message). Landing on `main` waits
   for the owner's OK (worktree: commit on the branch only, then `try.py
   --commit`, the mode file's Commit; shared: the commit itself). Only the run's final commit deletes `.claude/specs/` (this
   session's specs and reports, not another session's in shared mode)
   and `.claude/handoff.md`; a context-full commit keeps them.
7. **Report:** end the turn with exactly this:
   1. **Name:** the feature in plain words, then the branch (and PR in cloud).
   2. **How it looks:** one or two screenshots the implementer took
      (tools in `CLAUDE.md` Verify) outside the repo, sent with
      SendUserFile (else their paths), with one line on what this
      window saw in them (workflow Token rules).
   3. **Try:** one `bash` block, one command from your mode file, and
      one line on where to look and what to do.
   4. **Commit:** one `bash` block from your mode file, or which commit
      already landed on local `main`.
   5. **Look at:** at most three bullets, plus anything left open.

## Models

Opus thinks and judges (main, plan runs, `plan-writer`, Plan,
`reviewer`, `plan-reviewer`, `look-judge`), Sonnet does (`Explore`, `implementer`).
A landing diff under 150 lines is reviewed by `reviewer-light` (Sonnet, a copy
of `reviewer`), 150 lines or more by `reviewer` (Opus) (owner, 2026-11-25).
Everyday windows run on Opus medium. The coordinator window runs on Sonnet
medium because it only routes (owner, 2026-11-25: "any session parented by a
weak model just doing this only"); its sub-chats stay on Opus medium. Fable is for plans and research
(`session-start.py` prints a MODEL line when a Fable window starts on anything else).
The reviewers moved to Opus because Sonnet 5.5 misses more on hard
reviews and more of its comments are noise; it matches Opus on
spec-driven code at half the cost (owner, 2026-10-05). When the owner
picks Fable (`claude-fable-5-2`) for a session, only the main session
and the agents that inherit its model (`plan-writer`, Plan,
general-purpose, a built-in Explore) become Fable; the agent files that
name `opus` or `sonnet` keep that model. Fable manages, writes specs and
delegates every code change exactly as Opus does (owner, 2026-10-02).
Fable runs only in a window the owner's own message names for a plan or
research. Build and look chats (a coordinator's sub-chats, prepared
runs, headless) run on Opus medium unless his message names Fable
for that chat; a coordinator never starts or keeps a build chat on
Fable on its own (owner, 2026-11-25, after Fable build chats took about
a sixth of a week's spend).
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
Write and never read back; longer means two specs, except a sketch round's spec: one spec, several
files when they are one drawing (owner, 2026-11-25); the 40-line and
three-deliverable limits hold for everything else. Every spec has:

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

git-guard checks the owner's typed messages in the window that runs the
command, so the coordinator window can land any branch.
Before asking the owner, check each finished branch with
`py -3 <main checkout>/tools/try.py <branch> --commit --dry-run` (read
only, no owner word needed) and tell him `READY` or what blocks it.
When he has typed "land <name>" (or "land all") in the coordinator
window, an order that stands until that branch lands, run `try.py <branch> --commit` for each named branch,
one at a time, and report each `LANDED:` sha; what follows each
(`SendMessage`, board row) is in `coordinator.md` Landing. Ask in plain text, never AskUserQuestion: a clicked answer is not a
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

## Workflow detail

What `.claude/rules/workflow.md` keeps short: the owner's words, dates
and the longer form of a few rules.

- **One prompt** (owner, 2026-10-01): *"i send prompt -> it prepares
  whatever it needs -> i clear and tell it to run that prompt ... and it
  starts managing instances, with the goal of never reaching its own limit
  on the context window set by me"*.
- **The go prompt:** a bare `go` in a fresh window guessed its worktree
  and branch wrong (owner, 2026-10-01).
- **Sketch rounds** and the main window's 40-line edit exception: owner,
  2026-11-25. Cost and convenience are not exceptions to the edit rule.
- **Models and effort:** Opus judges, Sonnet does, no Haiku; only the
  owner picks effort higher (detail: "Models").
- **Context budget:** auto-compact is off (`DISABLE_AUTO_COMPACT`, owner's
  rule 2026-09-29). A prompt the owner types that starts `coordinator:`
  (or is just `coordinator`) makes its window the coordinator until
  `/clear` or a new chat. It runs on Sonnet medium and keeps its state on
  the board (`tools/board.py`), so the owner can `/clear` it at any time
  and restart it with `coordinator`.
- **Looks are judged by someone who knows what was asked** (owner,
  2026-11-10: the judges *"dont understand whats being asked about the
  picutre htye have no context"*, so the owner kept resending pictures in
  chat). An app window's main session may Read a picture itself: it knows
  what the owner asked and what was wrong before, so it opens the shots
  that answer a look question (after a visual change, when the owner asks
  how something looks, before the report) and says what it sees, never
  from an implementer's description or a guess. Each picture once. The
  coordinator window relays a sub-chat's pictures and clips unopened with
  its one line, opening one only if the owner asks what it thinks; the
  sub-chat looks first (owner, 2026-11-25).
- **Why landing pushes `main`:** new worktrees are cut from `origin/main`
  (2026-10-01).
- **Worktree mode history:** the settings ask for a cut from the main
  checkout's `HEAD` (`worktree.baseRef: "head"`), but the desktop app cuts
  from `origin/main` (seen 2026-10-01), hence WORKTREE BEHIND MAIN and
  Commit pushing `main`. Landing steps and MAP rows were where merge
  conflicts between parallel branches came from. Commit only with the
  owner's OK: owner's call 2026-10-01, replacing "run it yourself". Tip
  message rule: owner, 2026-10-05, after Van Gunner's main showed one
  message up to four times; the commit has one parent, so main gets one
  entry per landing. After a Commit the archive of the session in the app
  removes the worktree.
- **Why Grep and Glob, not Bash `grep`/`find`:** they skip gitignored
  paths such as `.claude/worktrees/`.
- **Owner commands:** the app adds a Run button to fenced `bash` blocks.
- **Coordinator cost:** every token in the main session is paid again
  each turn. `Explore` and `researcher` prompts end with the report line
  (Delegation).
- **Mode:** `worktree` is the default.
- **Quick fix** runs in the same window, with no clear.
- **Main session edits:** "yourself" includes Bash that writes. Code
  changes go one file per implementer call unless the change spans files
  (`implementer-wt`: its agent file); the implementer sees the spec and
  what it names, never these rules. `.claude/rules/` files load only for
  a session that reads a matching file: the coordinator never reads them;
  the window that designs a spec reads those `CLAUDE.md` maps to the area
  and lists what binds under the spec's Read first. Explore and Plan never
  load `workflow.md` or `CLAUDE.md`: name the file or concept, tell them
  to grep `.claude/MAP.md` first, ask for `file:line` anchors, not code
  bodies.
- **Context lines:** a session past its line stops; the owner clears or
  opens a new chat. A subagent denied tools at 1.25x: name file, function
  and range, or split. Sub-chats of the coordinator:
  `.claude/project/sub-chat.md`.
- **Token rules:** `file-guard.py` refuses a whole read over 300 lines.
  A view a tool measures is judged by its number; a subagent reads a
  picture only for a look no tool measures, once, with one line on what
  it shows. `look-judge` (`.claude/agents/look-judge.md`) is an optional
  second opinion on a look (its prompt: Delegation). Add a line to the
  map's "Owner's words" section when the owner uses a word the code does
  not.
- **Git:** `tools/cleanup.py` deletes branches. `git-guard.py` blocks
  `add -A`/`.`, `commit -a`, `stash`, `checkout --`, `restore`,
  `reset --hard`, `clean`, `rebase` and force push; the owner runs those
  if wanted. Never poll: a check runs in the foreground with the call's
  timeout; a background command's exit is reported by the harness.
  Scratch logs, notes and screenshots go in the session's scratchpad.
