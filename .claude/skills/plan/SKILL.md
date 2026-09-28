---
name: plan
description: Start, continue or run a many-phase plan in .claude/plans/. Planning is an interview through AskUserQuestion that loops ask → write → review until the plan leaves zero choices to the LLM (no question quota); running does one phase per prompt, then hard-stops for `/clear`. Owner-invoked only.
disable-model-invocation: true
argument-hint: "new <name>: <brief>  |  (nothing: continue the active plan)"
---

# Plan: one procedure, two states

A plan is a file `.claude/plans/<name>.md` built from
`.claude/plans/TEMPLATE.md`. The plan's `Stage:` line is the state:
`planning` → `ready` → `running` → `done`. Every plan whose Stage is
planning, ready or running is active; any number can be active at once.

## Several plans at once

One plan per checkout. Concurrent plans run in separate checkouts: the
main checkout and worktrees (or cloud clones). `.claude/plans/HERE`
(one line, gitignored, so each checkout has its own) binds this
checkout's plan. A checkout with no HERE and exactly one active plan
runs that one.

The SessionStart hook prints `PLAN: <name> · <stage>` for the bound
plan and lists the other active plans; those belong to other checkouts:
never edit their plan files, research or code areas. With several active
plans and none bound it prints `PLANS: ...`: `go <name>` writes `<name>`
to HERE and continues it, a bare `go` asks which. No `PLAN:`/`PLANS:`
line means no plan is active: a bare "go" is then an ordinary prompt.

Each checkout keeps its own `.claude/handoff.md` (gitignored), so
handoffs never cross plans. Plan files only ever change on the branch
that runs them; they reach `main` with that branch's `try.py --commit`.
Two plans that would edit the same source files: say so at planning and
record which runs first as a D.

Do **not** use Claude Code's built-in plan mode (Shift+Tab) for this: it
blocks every file write, and planning here writes research digests and
the plan itself into the repo. `/plan` is the plan mode.

## `/plan new <name>: <brief>` → Stage planning

1. Create `.claude/plans/<name>.md` from TEMPLATE, write `<name>` to
   this checkout's HERE (another active plan is bound here already: stop
   and say the new plan needs its own worktree), paste the owner's brief
   **verbatim** under Brief (condense later, never now: their words are
   the source every question quotes).
2. Run the interview below until the ready gate passes.

## `/plan` or `go` while Stage is `planning`

Read `Interview` (which part is open) and `Open
items`, and continue the interview from exactly there.

## The interview: how planning feels

The goal, in the owner's rule (2026-09-28): **the finished plan leaves
zero choices to the LLM.** Questions are the tool, not the target. There
is no minimum count: a plan is done when a review finds nothing left to
choose, not when enough questions were asked. So planning is a loop:

> ask what is open → write it into the plan → review the plan → every
> uncertainty the review finds becomes a new question → repeat until a
> review finds none.

- **Every question goes through `AskUserQuestion`** (the UI), never as
  prose that ends the turn. Calls are consecutive in the **same turn**:
  ask, record, ask again. The turn ends only when the owner does not
  answer (the question stands, the handoff names it, the next "go" asks
  it again) or when the ready gate passes. A "you decide" answer is
  recorded as a D in Claude's words, marked `(owner: you decide)`.
- **What counts as an open choice.** Any spot where the implementer
  would have to pick: a name, number, colour, count, order, timing,
  caption text, what the owner sees in the first and last second, what
  happens when it fails, what stays exactly as is next to it. If two
  reasonable implementers could build it two different ways, it is open.
- **What is not asked.** A choice already fixed by the Brief, a D, the
  existing code, a domain rule (`.claude/rules/*.md`) or a memory is
  written into the plan as a D marked `(from <source>)`, not asked. Never
  ask to fill a count, never ask twice what a D settles, never ask a
  question whose every answer builds the same thing.
- **Detail by detail.** Planning decides specifics now. A phase's
  research while running only fills what planning explicitly left it,
  marked `→ phase decides`, and only when the owner agreed to leave it.
- **Never stop early.** Never end a planning turn to "let the owner
  think"; never write "ready when you are"; never skip an open choice
  because the answer seems obvious or the owner seems tired of questions.
  If the owner types "just build it" or "stop asking", record that
  verbatim as a D, ask one question ("Take Recommended for every open
  choice left?" with "No, keep going (Recommended)" first) and follow the
  answer.

### Question rules (every call)

- Up to 4 questions per call; consecutive calls until the open list is
  empty. Never carry a known open choice into a later turn or a later
  phase.
- 2 to 4 options each, the recommended one first with "(Recommended)".
  Options are concrete and different from each other, written as what
  the owner will see or get, never "Yes / No" unless the choice is truly
  binary. `multiSelect: true` when several can be true; `preview` when a
  caption, palette, layout or table decides it.
- The owner always has "Other" for free text. A free-text answer is
  recorded verbatim; if it opens new choices, they join the open list.
- One question per decision. A question that needs research explained
  first puts the explanation in its own text: the owner has not read the
  research digest.
- Every question quotes or points at the Brief line, the D, or the piece
  of the Initial idea it is about, so the owner knows where they are.
- After each call: write every answer into the plan as `D<n>`, bump the
  count under `Interview`, commit the plan by path. Then the next call.

### The review pass (used after every part)

Read the plan section (or the whole plan) **as the implementer who must
build it from that text alone**, and list every open choice (above) you
would have to make, plus every place two lines could be read two ways or
contradict a D. Each item is either fixed from a source (write the D,
`(from <source>)`) or becomes a question. Ask them all, apply the
answers, then review again. The part is done when a review returns an
empty list.

### Part A · Brief and direction

1. **Intake.** Explore the current state through `Explore` (grep
   `.claude/MAP.md` first; `file:line` anchors, no code bodies). Write
   it under Current state.
2. **Research** the areas the brief touches, as wide as the choices
   need (other games, films, painters, techniques). Load
   `WebSearch`/`WebFetch`. Digest into
   `.claude/plans/research/<name>-00-intake.md`: sources, what we take
   from each, in our own words. Never copy art or long text.
3. **Option map.** For each area where the research found real
   alternatives, list them: one line each, with one precedent and what
   it would look like in *our* result. Include areas the brief did not
   mention but the work forces (captions, performance, phones, reduced
   motion, what stays as is) only where they are actually open.
4. **Open list.** Read the Brief clause by clause and list the choices it
   leaves open that shape the whole result (direction, scope, what it
   is), plus the option-map areas. Details that only matter inside one
   piece wait for Part B, where they have context.
5. **Ask the list** by the question rules. Contradictions with an earlier
   D are asked as their own question, never resolved silently. Write
   `Interview: A done · <count> asked` and go to Part B in the same turn.

### Part B · Initial idea, reviewed piece by piece

1. **Write the Initial idea** under its section: the whole result in
   prose, beginning to end, as the owner will experience it (what is on
   screen, what moves, what is read, what it feels like, in order).
   Every sentence rests on a D, the Brief or a `(from <source>)` fact;
   anything else is a guess and is marked `[?]`. Split it into numbered
   **pieces** (a beat, a screen, a system, a rule), as many as the work
   has, each a heading with its lines under it. Commit.
2. **Show every piece to the owner.** One question per piece, up to 4
   pieces per call: *"Piece <n>, <name>: <the piece's lines, in full>.
   Right?"* with "That is it (Recommended) / Close, but change something
   (say what in Other) / Different direction / Explain the choices
   first". A change or new direction rewrites the piece and it is shown
   again; "Explain" is answered in the next call's question text, then
   the piece is shown again. Record each under `Walk-through` (piece,
   answer, D numbers).
3. **Review pass** over the pieces: every `[?]` and every open choice the
   review finds becomes a question. Rewrite the prose with the answers
   and review again until the list is empty and no `[?]` remains. Write
   `Interview: B done · <count> asked`.

### Part C · Phases and their review

1. **Write the phases** from the Initial idea. Each phase: kind
   (research/doc/code/review), the pieces it implements, research
   topics, deliverables, verification, the D numbers it rests on. **No
   phase may be of kind "owner talk"**: every question is asked here,
   now. **Size:** a code phase is at most two implementer specs and at
   most two files it reads to design (name them); more than that is two
   phases. A phase's section is self-contained (it names its D numbers
   and pieces), because an unattended session sees only that section.
   Verification names the check that actually sees the change: a toy
   canvas needs `jscheck.py --shot` or a flow, since `snap.py` does not
   paint it. Fill Scope, Constraints, the Progress table. Commit.
2. **Show every phase to the owner.** One question per phase, up to 4
   per call: *"Phase <n>, <name>, delivers <deliverables>, must not touch
   <Out list>, verified by <command / scenes>. Right?"* with "Right
   (Recommended) / Missing something (say what in Other) / Too big,
   split it / Merge with the previous phase". Splits and merges rewrite
   the Progress table and the changed phases are shown again. Record
   under each phase: `Reviewed: <answer, D numbers>`.
3. **Review pass** over each phase as the session that will run it,
   seeing only that section: every choice it would still have to make
   becomes a question. Repeat until empty. Write
   `Interview: C done · <count> asked`.

### Ready gate (all true, or keep going)

- **Fresh-eyes review.** A `Plan` subagent that has not seen the
  interview reads the plan file (give it the path; it does not load
  CLAUDE.md) and lists, per phase, every choice it would have to make
  to build it and every line it could read two ways, with the line
  quoted. Each item is fixed from a source or asked; then a new fresh
  review runs. The gate needs one review that returns nothing.
- `Interview` shows A, B and C done. Open items: none. No `[?]` anywhere.
  No `→ phase decides` the owner did not agree to.
- Every piece has a Walk-through line; every phase has a `Reviewed:`
  line, cites at least one D or Brief line, and is `todo` in the
  Progress table. Constraints and Scope are filled.

Then set `Stage: ready`, commit the plan and research by path, and ask
one last `AskUserQuestion`: "Start running the plan? (Recommended) /
Change something first / Hold". Start → `Stage: running` and run the
first phase in the same turn, ending with the Handoff protocol and the
hard stop below (one phase, never two). Change → record the change as a
D, show the pieces and phases it touches again, and run the gate again.

Context: at `CONTEXT WATCH` commit the plan file as it stands, write
`.claude/handoff.md` with the part and the open list still to ask, and
keep going. The plan file *is* the handoff for everything settled; the
interview continues after compaction from the same part.

## `go` while Stage is `running`: one phase per session

Two ways to run it: the owner prompts each phase in the app (below), or
`py -3 tools/autoplan.py <name>` runs every phase in a terminal, one
fresh session each (see "Running unattended"). Planning always happens
in the app.

The owner's rule (2026-09-26): *"we never do 2 continues work, we must
always separate stuff."* A running plan is a chain of short, isolated
sessions. Each prompt executes **exactly one phase**, then the session
halts and the owner clears the context. Never run two phases in one
turn, never "keep going with Next", never let auto-compaction carry a
plan across phases.

1. **Enter.** If `PLAN_STATE.md` exists at the repo root, read it first:
   its "Next phase" section is the starting point and overrides
   guessing from the Progress table. Otherwise read Progress and take
   the first `todo` row. Read only that phase, its pieces of the Initial
   idea, Brief, Decisions, Constraints, Carry forward. Nothing from any
   other phase.
2. **Phase questions** come before the first spec (rules below).
3. **Execute that phase only:** research its topics (digest to
   `research/<name>-<NN>.md`), design, specs, implementer, verify,
   review, as `CLAUDE.md` says. Anything the phase reveals about a
   later phase goes into Carry forward or PLAN_STATE.md, never into
   this session's work.
4. **Handoff protocol** (every step, in this order, before anything
   else):
   1. Verify: the phase's Verification line (flows, snapshots,
      `jscheck.py`) passes; a `page-*` scene shows no console error. A
      phase that does not verify is not complete: fix it, or stop with
      the blocker named in PLAN_STATE.md.
   2. Commit by path with a message that describes the phase, as the
      mode file says (cloud: also push and open or update the PR).
   3. Write `PLAN_STATE.md` at the repo root (format below), set the
      Progress row `done <sha>`, add Carry forward, and commit those
      too (same path rules). PLAN_STATE.md is committed: in cloud mode
      the next session is a fresh clone and reads it from the branch.
5. **Hard stop.** End the turn with the normal report, and its last
   line is this exact message, nothing after it:

   > Phase complete. Please run `/clear` to flush the context window,
   > then prompt me with: 'Read PLAN_STATE.md and execute the next phase.'

   Do not start the next phase. Do not ask whether to continue. The
   mode files' "Context full" rule (auto-continue, never clear) does
   not apply at a phase boundary: the clear is the owner's, on purpose.
6. **The next prompt** ("Read PLAN_STATE.md and execute the next
   phase", or a bare "go") starts at step 1 in a fresh context.

### PLAN_STATE.md (root; exists only while a plan is running)

Under 80 lines, no code. The first line is `Status: <s>`, where `<s>`
is `phase-done`, `partial`, `blocked` or `plan-done`
(`tools/autoplan.py` reads it to decide what happens next). Then these
headings in this order:

- **Plan:** `<name>` and the plan file path; branch (cloud: PR link).
- **Architecture now:** the files, globals and load order this plan
  has touched so far, one line each, as they are after this phase.
- **Completed phase:** number, name, commit hash, what was verified
  (exact commands and scenes).
- **Next phase:** number, name, its deliverables and Verification line
  copied from the plan, the D numbers it rests on, and the exact first
  action (the file and function to open, the research topic, or the
  phase question to ask).
- **Requirements / gotchas:** anything the next phase needs that is
  not in the plan file or `.claude/MAP.md`.
- **Blocker:** `none`, or the question only the owner can answer.

It replaces `.claude/handoff.md` for plans: never write both. When the
last phase is done, delete PLAN_STATE.md in the Stage-done commit.

### Phase questions: ask first, decide alone only when the owner is away

A phase's research or design will sometimes force a decision the plan
does not cover (something the interview missed, or a `→ phase decides`).
That is a phase question. Handle it in this order:
   - Look for it on purpose: before the first spec of a phase, list every
     decision the phase forces that no `D`, piece or Brief line settles.
     Ask them all in one `AskUserQuestion` round (same question rules as
     planning), at the **start** of the phase, never after the
     implementer has run.
   - Wait for the answer. The tool's `askUserQuestionTimeout` setting
     (settings.json: 60s, 5m or 10m; set 5m) decides how long.
   - If the question times out **and** the previous phase question in this
     run also went unanswered, the owner is away: from then on take the
     option you would have marked "(Recommended)", record it as
     `D<n> (auto)` with one line of reason, and keep going without asking
     again in this run. One unanswered question alone does not switch
     this on: it just becomes an `(auto)` and the next question is asked.
   - A **blocker** always waits, no matter how many timeouts: the code
     contradicts the plan; two decisions conflict; a step would be
     irreversible and is not in the plan (deleting files, rewriting a
     rules file beyond what a D says). Finish what can be finished, name
     the blocker in PLAN_STATE.md, and end the turn with the hard stop.
   The owner reviews every `(auto)` at the end; each one also names a
   question the interview should have asked: add it to the `Interview`
   section as `missed: <question>` so the next plan's Part A list grows.

Context inside one phase: a phase too big for one context was split
wrong. At `CONTEXT WATCH` finish the atomic step, commit, and write
PLAN_STATE.md with `Status: partial`, "Completed phase" as `<n>
(partial)` and "Next phase" as the rest of it; then hard-stop. Next
session, split the phase in the Progress table before continuing.
A session that stops after designing saves each finished spec as
`.claude/plans/<name>.spec-<phase>-<k>.md` (playbook Spec format,
ready to send) and names them in Next phase; the next session sends
them to the implementer instead of exploring again, and deletes each in
the commit that lands its work.

### Running unattended (`AUTOPLAN=1`)

`py -3 tools/autoplan.py <name>` runs the phases from a terminal, one
fresh headless session per phase. Started from the main checkout, it
makes (or reuses) the worktree `.claude/worktrees/plan-<name>` on
branch `claude/plan-<name>` and runs there; the owner lands it with
`py -3 tools/try.py claude/plan-<name> --commit`. A session it starts
has `AUTOPLAN=1` and a prompt that begins `[autoplan | ...]` and carries
the phase brief: read `.claude/skills/plan/unattended.md` (short) and
not the rest of this file.

## Last phase done → Stage done

Set `Stage: done`, delete this checkout's HERE and `PLAN_STATE.md`, list
every `D<n> (auto)` and every `missed:` line in the report under **Look
at**, commit. The plan file stays as the record. This last phase ends
with the hard-stop message too; the owner's next prompt is a fresh task.

## `/plan` with no plan bound here

List `.claude/plans/*.md` with their Stage lines and stop.
