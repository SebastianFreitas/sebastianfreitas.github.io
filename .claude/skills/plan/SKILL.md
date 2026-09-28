---
name: plan
description: Start, continue or run a many-phase plan in .claude/plans/. Planning is a long interview through AskUserQuestion (dozens of questions, an initial idea walked through piece by piece, every phase reviewed); running does one phase per prompt, then hard-stops for `/clear`. Owner-invoked only.
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

Read `Interview` (which part is open, the question count) and `Open
items`, and continue the interview from exactly there.

## The interview: how planning feels

The owner's rule, in their words: *"it should ask 20 times the questions
to start a plan in most cases, go detail by detail, formulate an initial
idea, and then run with me step by step. Before finishing the planning we
review every step with more than one question, so we get as specific as
possible. Require a total of pages of text to actually make a plan, not
tiny surveys. And with the UI, never stop."*

So planning is a **long interview**, not a survey:

- **Every question goes through `AskUserQuestion`** (the UI), never as
  prose that ends the turn. Calls are consecutive in the **same turn**:
  ask, record, ask again. The turn ends only when the owner does not
  answer (the question stands, the handoff names it, the next "go" asks
  it again) or when the ready gate passes. A "you decide" answer is
  recorded as a D in Claude's words, marked `(owner: you decide)`.
- **Minimums, not maximums.** Part A asks at least 20 questions before
  the initial idea is written. A typical plan ends with 60 to 120
  questions asked; a small one never under 40. Running out of questions
  is a sign you have not gone into detail, not a sign you are done: go
  one level smaller (a single beat, a single colour, a single caption
  word, what happens in the first second, what happens when it fails)
  and ask again.
- **Detail by detail.** Planning decides specifics now: names, numbers,
  colours, counts, order, timing, what the owner sees in the first
  second and in the last. A phase's research while running only fills
  what planning explicitly left it, marked `→ phase decides`, and the
  owner agreed to leave.
- **Never stop.** Never end a planning turn to "let the owner think";
  never write "ready when you are"; never skip a question because the
  answer seems obvious, because an earlier answer probably covers it, or
  because the owner seems tired of questions. If the owner types "just
  build it" or "stop asking", record that verbatim as a D, ask one
  question ("Skip the rest of the interview and take Recommended
  everywhere from here?" with "No, keep going (Recommended)" first) and
  follow the answer.
- **Pages of text.** The plan file grows to pages: Decisions in the
  owner's words, the Initial idea in full prose, a Walk-through line per
  piece, a Reviewed line per phase. The ready gate measures it.

### Question rules (every call)

- 4 questions per call; consecutive calls until the part's question list
  is empty. Never carry a known question into a later turn or a later
  phase.
- 2 to 4 options each, the recommended one first with "(Recommended)".
  Options are concrete and different from each other, written as what
  the owner will see or get, never "Yes / No" unless the choice is truly
  binary. `multiSelect: true` when several can be true; `preview` when a
  caption, palette, layout or table decides it.
- The owner always has "Other" for free text. A free-text answer is
  recorded verbatim, and its consequences open new questions (usually
  3 to 5) in the same part.
- One question per decision. A question that needs research explained
  first puts the explanation in its own text: the owner has not read the
  research digest.
- Every question quotes or points at the Brief line, the D, or the piece
  of the Initial idea it is about, so the owner knows where they are.
- After each call: write every answer into the plan as `D<n>`, bump the
  count under `Interview`, commit the plan by path. Then the next call.

### Part A · Brief interview (at least 20 questions)

1. **Intake.** Explore the current state through `Explore` (grep
   `.claude/MAP.md` first; `file:line` anchors, no code bodies). Write
   it under Current state.
2. **Research wide.** Load `WebSearch`/`WebFetch`. Research every area
   the brief touches and then go past it (other games, films, painters,
   history, techniques). Digest into
   `.claude/plans/research/<name>-00-intake.md`: sources, what we take
   from each, in our own words. Never copy art or long text.
3. **Option map.** For every area the brief touches, list the directions
   the research found: 3 to 6 per area, each one line, each with one
   real precedent and what it would look like in *our* result. Areas the
   owner did not mention but the work will force (numbering, captions,
   performance, what stays as is, phones, reduced motion) go here too.
4. **Line by line.** Split the Brief into its sentences and clauses. For
   each one list the questions it raises: every noun (what exactly is
   it, how big, what colour, how many), every verb (how, how fast, in
   how many steps, triggered by what), every "like" or "kind of" (which
   precedent, which part of it), every "and then" (what is between).
   Add the option-map questions. This is the Part A question list; it is
   at least 20 long, or you have not read closely enough.
5. **Ask the list** by the question rules. Record each answer as a D.
   Contradictions with an earlier D are asked as their own question,
   never resolved silently.
6. Part A ends when its list is empty **and** the count is at least 20.
   Write `Interview: A done · <count> asked` and go to Part B in the
   same turn.

### Part B · Initial idea, walked through piece by piece

1. **Write the Initial idea** under its section: the whole result in
   prose, beginning to end, as the owner will experience it (what is on
   screen, what moves, what is read, what it feels like, in order). One
   to three pages. Every sentence rests on a D or the Brief; where it
   does not, it is a guess and is marked `[?]`. Split it into numbered
   **pieces** (a beat, a screen, a system, a rule), 6 to 15 of them,
   each a heading with 5 to 15 lines under it. Commit.
2. **Walk through every piece, in order**, with the owner:
   - First an `AskUserQuestion` whose text says *"We start with piece
     <n>, <name>: <the piece's lines, in full>. What do you think?"*
     with the options "That is it (Recommended) / Close, but change
     something (say what in Other) / Different direction / Explain the
     choices first". This check is asked for **every** piece, even when
     Claude has no open question about it: the owner asked for "we're
     going to start with this, what do you think?" each time.
   - Then that piece's detail questions: every `[?]`, plus at least two
     more that go smaller than the prose (the first second, the exact
     number, the caption text, what the failure case looks like, what
     stays exactly as is next to it). Never fewer than 3 questions per
     piece, counting the check.
   - "Different direction" or a long free-text answer: rewrite the
     piece, commit, and walk through it again from the check.
   - "Explain the choices first": answer in the next call's question
     text (which D or research line each choice came from), then ask
     the check again.
   - Record the check's answer under `Walk-through` (piece, answer, the
     D numbers it produced) and rewrite the piece's prose so no `[?]`
     remains.
3. Part B ends when every piece is checked, no `[?]` remains and every
   piece has its 3+ questions. Write `Interview: B done · <count> asked`.

### Part C · Phases and their review (at least 2 questions per phase)

1. **Write the phases** from the Initial idea. Each phase: kind
   (research/doc/code/review), the pieces it implements, research
   topics, deliverables, verification, the D numbers it rests on. **No
   phase may be of kind "owner talk"**: every question is asked here,
   now. Fill Scope, Constraints, the Progress table. Commit.
2. **Review every phase with the owner**, one phase per pass, in order,
   with at least **two** `AskUserQuestion` questions per phase:
   - *"Phase <n>, <name>, delivers: <deliverables>. Right?"* with the
     options "Right (Recommended) / Missing something (say what in
     Other) / Too big, split it / Merge with the previous phase".
   - *"Phase <n> must not touch: <its Out list>. It is verified by:
     <command / scenes>. Agreed?"* with concrete alternatives.
   - Plus any question the phase raised while being written (a number,
     a name, an order). Splits and merges rewrite the Progress table,
     and the review restarts at the changed phase.
   - Record under each phase: `Reviewed: <the answers, D numbers>`.
3. **Final sweep.** Read the whole plan top to bottom and list every
   place where two lines could be read two ways, or a number, name or
   order is still missing. Ask them all. A sweep that finds nothing is
   rare; say so in the report if it happens.
4. Write `Interview: C done · <count> asked`.

### Ready gate (all true, or keep interviewing)

- `Interview` shows A, B and C done and a total count of at least 40.
- Open items: none. No `[?]` anywhere in the file. No `→ phase decides`
  the owner did not agree to.
- Every piece of the Initial idea has a Walk-through line; every phase
  has a `Reviewed:` line with at least two answers.
- Every phase cites at least one D or Brief line it implements; the
  Progress table lists every phase as `todo`; Constraints and Scope are
  filled.
- The plan file is at least 2,500 words (`wc -w`; the Brief and the
  Initial idea count, the Option map does not). Under that, the plan is
  a survey: find where it is thin and go back to that part.

Then set `Stage: ready`, commit the plan and research by path, and ask
one last `AskUserQuestion`: "Start running the plan? (Recommended) /
Change something first / Hold". Start → `Stage: running` and run the
first phase in the same turn, ending with the Handoff protocol and the
hard stop below (one phase, never two). Change → record the change as a D, redo
the walk-through of the pieces it touches, and run the gate again.

Context: planning is long, by design. At `CONTEXT WATCH` commit the plan
file as it stands, write `.claude/handoff.md` with the part, the count
and the questions still to ask, and keep going. The plan file *is* the
handoff for everything settled; the interview continues after
compaction from the same part.

## `go` while Stage is `running`: one phase per prompt

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

Under 80 lines, no code, these headings in this order:

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
PLAN_STATE.md with "Completed phase" as `<n> (partial)` and "Next
phase" as the rest of it; then hard-stop. Next session, split the phase
in the Progress table before continuing.

## Last phase done → Stage done

Set `Stage: done`, delete this checkout's HERE and `PLAN_STATE.md`, list
every `D<n> (auto)` and every `missed:` line in the report under **Look
at**, commit. The plan file stays as the record. This last phase ends
with the hard-stop message too; the owner's next prompt is a fresh task.

## `/plan` with no plan bound here

List `.claude/plans/*.md` with their Stage lines and stop.
