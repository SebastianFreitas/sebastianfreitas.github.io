# Workflow: rules for every session

Shared by the owner's projects, synced from the `claude-workflow`
master; the project's `CLAUDE.md` wins where they disagree. Detail is in
`.claude/playbook.md` (owner's words and longer rules: "Workflow
detail"), the mode files and the skills: read the named section.

## Coordinator

The main session plans, delegates, decides and talks to the owner. It
never reads source, rules files or logs, may run one shot or verify
command itself (`CLAUDE.md` Verify), never a full capture or the flow
suite, and makes at most two quick lookups before delegating; more goes
to `Explore`. Agent prompts name paths, never pasted content; agents
return about 150 words plus a report path (playbook Delegation).

## Shared files, mode, plans

Paths in `.claude/workflow.lock` come from the master (workflow change
or `WORKFLOW SYNC:`: playbook "Shared files"); a project-only rule goes
in `CLAUDE.md`. The SessionStart hook prints `MODE: <mode>` (`worktree`,
`shared`, `cloud`) and its rules, which override this file on branches,
pushing, shipping and report commands (none: playbook "No MODE line";
after `EnterWorktree` read `.claude/modes/worktree.md`). Big work is a
plan: `/plan new <name>: <brief>` (playbook "Plans").

## The go prompt

A turn that hands its work to a fresh window (prepared run, context-full
handoff, a plan's ready gate or questions) never ends with "say `go`".
It ends with the exact prompt in a plain fenced block as the last thing
in the turn (playbook "The go prompt"; the coordinator's starts
`coordinator:`).

## One prompt: prepare, clear, run

Sort each new prompt from its words and at most one `Explore` call:
**quick fix** (one or two files, one clear change): steps 1 to 7 here;
**anything else**: prepare (1 to 2), end the turn, the owner `/clear`s
and pastes the go prompt, the fresh window runs (3 to 7); unsure:
prepare; **over about 22 specs**: a plan. Obvious questions: one
`AskUserQuestion` round in step 1 (playbook "Obvious questions").

### Prepare

1. **Explore** through `Explore`; read nothing yourself.
2. **Spec** one per implementer call in `.claude/specs/<k>.md`, plus `.claude/handoff.md`; end with the go prompt (playbook "Prepare", "Spec format").

### Run

Handoff starts `Run: prepared`; check checkout and branch first; only manage, never read a spec or diff (playbook "Run").

3. **Implement:** one `implementer` per spec, prompt only "Your spec is `.claude/specs/<k>.md`: read it and implement it".
4. **Verify:** the implementer runs its checks, reports pass or fail with numbers.
5. **Review:** over about 150 lines or three files (`reviewer-light` under 150, else `reviewer`); `review-guard.py` enforces it. A sketch round (a picture or clip for the owner's verdict) has no reviewer, commits as `Sketch: <what>`; the reviewer runs once on `git diff main...HEAD` at landing.
6. **Commit** by path as your mode says; landing on `main` waits for the owner's OK.
7. **Report:** Name, How it looks, Try, Commit, Look at.

Changes in the owner's reply are sorted the same way, on the same branch.

## Main session role

- No source edits yourself except up to about 40 lines in one file
  where a spec would take longer; markdown in `.claude/`, MAP rows and
  the handoff are not source. Other code changes go to `implementer`,
  one spec per call.
- Rules files, Explore/Plan prompts, models: playbook "Delegation",
  "Models" (never pass `model` or `effort`; no `general-purpose`).
- A plan, state file or handoff: grep the heading, never re-read it whole.

## Context budget

Auto-compact is off; never compact or clear yourself. `context-watch.py`
prints `CONTEXT WATCH` at 90% of the line and past it. Lines:
coordinator 120k; plan supervisor and headless plan sessions 250k
(killed at 300k); other app windows 150k; Explore, Plan,
claude-code-guide, researcher 100k; plan-writer 120k; implementer 60k;
reviewer, reviewer-light, plan-reviewer, look-judge 80k. A subagent at
1.25x its line is denied tools. Every subagent runs in the background.
Past its line a main session finishes the step, commits, writes the
handoff and ends with the report and go prompt (playbook "Context
full"). A `coordinator:` prompt makes its window the coordinator
(Sonnet medium, state on the board): `.claude/project/coordinator.md`.

## Token rules (this window; helpers get the Hard rules in their agent file)

- Never read a whole file over 300 lines: grep, then read around the hit.
- Search with Grep and Glob, not `grep`/`find` in Bash. Never open
  `__pycache__/` or the paths `CLAUDE.md` lists. Short output: `tail -n 30`.
- Numbers before pictures. Looks are judged by the window that knows
  what was asked; the coordinator relays a sub-chat's pictures unopened
  (playbook "Workflow detail").
- New file, moved function or new export: fix its MAP.md row in the
  same commit (playbook "MAP rows").

## Git and the owner's commands

- Stage by path. Never push (cloud: only your own `claude/` branch),
  never merge or commit onto `main` except a shared-mode commit the
  owner OK'd (their latest message says commit, merge or land), never
  delete branches by hand, never `gh pr merge`. Only `try.py --commit`
  reaches `main` from a branch (run by the owner, or by you when their
  latest message says merge or land); it pushes `main` once landed.
  Nothing else reaches origin except the owner's GitHub Desktop. A
  coordinator lands on "land <name>" (playbook "Landing from the
  coordinator").
- `git-guard.py` blocks blanket git and `poll-guard.py` blocks sleeps
  of 10 s or more and sleep loops: do not work around them.
- Commands for the owner: fenced `bash` blocks, one per block, valid in
  PowerShell 5.1 (forward slashes; no `&&`, `||`, `$(...)`, bash `if`).
- No scratch files in the repo: use the session's scratchpad.
