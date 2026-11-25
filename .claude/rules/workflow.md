# Workflow: rules for every session

Shared by the owner's projects, synced from the `claude-workflow`
master. The project's `CLAUDE.md` wins where they disagree. Detail only
some windows need is in `.claude/playbook.md`, the mode files and the
skills: read the named section when you need it.

## Coordinator

The main session plans, delegates, decides and talks to the owner; every
token in it is paid again each turn. It never reads source, rules files
or logs, may run one shot or verify command itself (the sketch tools in
`CLAUDE.md` Verify), never a full capture or the flow suite, and makes
at most two quick lookups before delegating; more goes to `Explore`.
Agent prompts name paths, never pasted content. Agents write the full
report to a file and return about 150 words plus its path (`reply-cap.py`
sends one over 250 words back once); `Explore` and `researcher` prompts
end with the playbook's report line (playbook Delegation).

## Shared files

The paths in `.claude/workflow.lock` come from the master. For a
workflow change or a `WORKFLOW SYNC:` line read playbook "Shared files".
A rule that only fits this project goes in `CLAUDE.md`, never here.

## Session mode

The SessionStart hook prints `MODE: <mode>` and that mode's rules
(`.claude/modes/<mode>.md` plus the project's notes), which override this
file on branches, pushing, shipping and the report's commands:
`worktree` (default), `shared`, `cloud` (its file). No `MODE:` line:
playbook "No MODE line". After `EnterWorktree`, read
`.claude/modes/worktree.md` before the next edit.

## The go prompt

A turn that hands its work to a fresh window (a prepared run, a
context-full handoff, a plan's ready gate or questions) never ends with
"say `go`": a bare `go` in a fresh window guessed its worktree and
branch wrong (owner, 2026-10-01). It ends with the exact prompt in a
plain fenced block as the last thing in the turn (playbook "The go
prompt"; the coordinator's starts `coordinator:`).

## Plans

Big work is a plan: `/plan new <name>: <brief>`; the hook prints `PLAN: <name> · <stage>`; read only the stage file `.claude/skills/plan/SKILL.md` names (playbook "Plans"; helpers `plan-writer`, `plan-reviewer`: their agent files).

## One prompt: prepare, clear, run

Owner, 2026-10-01: *"i send prompt -> it prepares whatever it needs -> i
clear and tell it to run that prompt ... and it starts managing
instances, with the goal of never reaching its own limit on the context
window set by me"*. One window prepares, a fresh one manages helpers
that do the work. Sort each new prompt from its words and at most one
`Explore` call:

- **Quick fix:** one or two files, one clear change: steps 1 to 7 in
  this window, no clear.
- **Anything else:** **prepare** (steps 1 to 2), end the turn; the owner
  runs `/clear` and pastes the go prompt; the fresh window **runs**
  (steps 3 to 7). Unsure: prepare.
- **Too big for one run** (over about 22 specs): a plan.

Obvious questions go in one `AskUserQuestion` round in step 1, never
plain text (playbook "Obvious questions").

### Prepare

1. **Explore** through `Explore`, ask the obvious questions, read nothing yourself.
2. **Spec** one per implementer call (playbook "Spec format"), each written once to `.claude/specs/<k>.md`, plus `.claude/handoff.md`; end with the go prompt (what: "build the prepared specs"). Detail: playbook "Prepare".

### Run

A go prompt whose handoff starts `Run: prepared`, checkout and branch checked first. This window only manages, never reads a spec or a diff. Detail: playbook "Run".

3. **Implement:** one `implementer` per spec, prompt only "Your spec is `.claude/specs/<k>.md`: read it and implement it".
4. **Verify:** the implementer runs its checks and reports pass or fail with key numbers.
5. **Review:** over about 150 lines or three files the reviewer runs (under 150: `reviewer-light`, Sonnet; else `reviewer`, Opus); `review-guard.py` refuses the commit without it. A sketch round (a picture or clip for the owner's verdict, not a landing) has no reviewer and commits as `Sketch: <what>`; the reviewer runs once on `git diff main...HEAD` at landing (owner, 2026-11-25).
6. **Commit** by path as your mode says; landing on `main` waits for the owner's OK.
7. **Report:** five parts: Name, How it looks, Try, Commit, Look at (playbook "Run").

Changes in the owner's reply are sorted the same way, on the same branch.

## Main session role

- Do not edit source files yourself (Write, Edit, or Bash that writes),
  except an edit of up to about 40 lines in one file (a sketch round
  included) where a spec would take longer than the edit (owner,
  2026-11-25). Cost and convenience are not exceptions. Docs, `.claude/MAP.md`
  rows, `.claude/handoff.md` and the markdown in `.claude/` are not
  source: edit those directly.
- Every other code change goes to `implementer` (`implementer-wt`: its
  agent file), one spec per call, one file per call unless the change
  spans files; it sees the spec and what it names, never these rules.
- `.claude/rules/` files load only for a session that reads a matching
  file. The coordinator never reads them; the window that designs a spec
  reads those `CLAUDE.md` maps to the area and puts what binds under the
  spec's Read first; the implementer reads what the spec names.
- Explore and Plan never load this file or `CLAUDE.md`: name the file or
  concept, tell them to grep `.claude/MAP.md` first, ask for `file:line`
  anchors, not code bodies.
- A plan, state file or handoff: grep the heading, never re-read it whole.
- Models and effort (Opus judges, Sonnet does, no Haiku; only the owner
  picks effort higher; never pass `model` or `effort` on an Agent call;
  no `general-purpose` helper): playbook "Models".

## Context budget

Auto-compact is off (`DISABLE_AUTO_COMPACT`, owner's rule 2026-09-29): a
session never runs past its line; it stops and the owner clears or
opens a new chat. Never compact or clear yourself. `context-watch.py`
prints `CONTEXT WATCH` at 90% of the line and again past it. Lines: the
coordinator 180k; a plan run's supervisor and headless plan sessions
250k (killed at 300k); every other app window 150k; Explore, Plan,
claude-code-guide and researcher 100k; plan-writer 120k; implementer
60k; reviewer, reviewer-light, plan-reviewer and look-judge 80k. A
subagent at 1.25 times its line is denied further tools: name file,
function and range, or split. Every subagent runs in the background.

A prompt the owner types that starts `coordinator:` (or is just
`coordinator`) makes its window the coordinator until `/clear` or a new
chat (`.claude/project/coordinator.md`; its sub-chats:
`.claude/project/sub-chat.md`). Past its line a main session finishes
the current step, commits, writes `.claude/handoff.md` and ends with the
report and the go prompt (playbook "Context full").

## Token rules (this window; helpers get the Hard rules in their agent file)

- Never read a whole file over 300 lines (file-guard refuses it): grep
  the name, then read around the hit.
- Search with the Grep and Glob tools, not `grep`/`find` in Bash: they
  skip gitignored paths such as `.claude/worktrees/`.
- Never open `__pycache__/` or the binary and media paths `CLAUDE.md`
  lists (names only). Keep command output short: `tail -n 30`.
- Numbers before pictures: a view a tool measures is judged by its
  number. A subagent reads a picture only for a look no tool measures,
  once, with one line on what it shows.
- **Looks are judged by someone who knows what was asked** (owner,
  2026-11-10: the judges *"dont understand whats being asked about the
  picutre htye have no context"*, so the owner kept resending pictures
  in chat). An app window's main session may Read a picture itself: it
  knows what the owner asked and what was wrong before, so it opens the
  shots that answer a look question (after a visual change, when the
  owner asks how something looks, before the report) and says what it
  sees, never from an implementer's description or a guess. Each picture
  once. The coordinator window relays a sub-chat's pictures and clips
  unopened with its one line, opening one only if the owner asks what it
  thinks; the sub-chat looks first (owner, 2026-11-25).
- `look-judge` (`.claude/agents/look-judge.md`) is an optional second
  opinion on a look (its prompt: playbook Delegation).
- A new file, moved function or new export gets its MAP.md row fixed in
  the same commit (playbook "MAP rows"). The map's "Owner's words"
  section maps the owner's nicknames to code names; add a line when the
  owner uses a word the code does not.

## Git and the owner's commands

- Stage by path. Never push (cloud: only your own `claude/` branch),
  never merge or commit onto `main` except a shared-mode commit the
  owner OK'd (their latest message says commit, merge or land), never
  delete branches by hand (`tools/cleanup.py` does), never `gh pr
  merge`. Only `try.py --commit` reaches local `main` from a branch (run
  by the owner, or by you when their latest message says merge or
  land), and it pushes `main` once landed: new worktrees are cut from
  `origin/main` (2026-10-01). Nothing else reaches origin except the
  owner's GitHub Desktop. A coordinator lands a sub-chat's branch itself
  on "land <name>" (playbook "Landing from the coordinator").
- `git-guard.py` blocks blanket git (`add -A`/`.`, `commit -a`,
  `stash`, `checkout --`, `restore`, `reset --hard`, `clean`, `rebase`,
  force push). Do not work around it; the owner runs those if wanted.
- Never poll: `poll-guard.py` refuses a `sleep` of 10 s or more and any
  shell loop that sleeps. A check runs in the foreground with the call's
  timeout; a background command's exit is reported by the harness.
- Commands shown to the owner go in fenced `bash` blocks (the app adds a
  Run button), one command per block, and must also work pasted into
  Windows PowerShell 5.1: forward-slash paths, no `&&`, `||`, `$(...)`
  or bash `if`.
- No scratch files in the repo: logs, notes and screenshots go in the
  session's scratchpad.
