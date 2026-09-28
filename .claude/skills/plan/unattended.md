# Running a plan phase unattended (`AUTOPLAN=1`)

`tools/autoplan.py` runs one fresh headless session per phase. Your
prompt starts with `[autoplan | plan <name> | session <k>]` and carries
the **phase brief**: PLAN_STATE.md, this phase's section of the plan,
the Decisions it cites, Carry forward, and any saved spec files. Read
this file once; do not open `SKILL.md`, the plan file or PLAN_STATE.md
for what the brief already holds. Open the plan only for a D or piece
the brief does not carry, by grep, never whole.

Everything in `SKILL.md` "one phase per session" still holds (one phase,
Handoff protocol, PLAN_STATE format, commit by path). The differences:

## Budget

The prompt names your context line (`CONTEXT WATCH` warns at it) and
the runner's kill line above it. The phase has to fit between the
~35k you start with and the line, so:

- **Code reading goes to `Explore`**, always, with a named file,
  function and question, asking for `file:line` anchors and a summary.
  Read yourself only the range a spec is written against (under about
  150 lines). A 1,000-line file read in main costs 30k and writes no
  code.
- **Implementers run in the foreground** (`run_in_background: false`).
  Never launch one in the background and wait: no sleeps, no "waiting"
  messages, no ending the turn while one runs. Its commit must land
  before you write PLAN_STATE.md.
- **Verify what you touched, once.** A change that only paints a toy
  canvas is invisible to `snap.py` (it does not paint the play canvas):
  check it with `py -3 tools/jscheck.py ... --shot` or the phase's
  flows, and skip the snap capture. Run `snap.py` only when the phase
  changes page DOM or CSS, and capture "before" once per run, not per
  phase, if an earlier phase's capture is named in the brief.
- Screenshots and scratch scripts go under `%TEMP%`, never the repo.

## Three ways a session ends

1. **Phase done.** Handoff protocol complete, `Status: phase-done`.
2. **Design saved** (`Status: partial`). When the design alone brings
   you near the line (past about two thirds of it) or the phase needs
   more than two implementer specs: write each finished spec to
   `.claude/plans/<name>.spec-<phase>-<k>.md` in the playbook's Spec
   format, complete enough to send as is. Commit them with PLAN_STATE.md,
   whose Next phase says "send spec-<phase>-<k> to the implementer".
3. **Blocked.** Finish what can be finished, commit, `Status: blocked`
   with the Blocker.

A session whose brief lists spec files starts by sending them to the
implementer, one call each, in order, unchanged unless the code has
moved. It does not re-explore what the spec already names. Delete a
spec file in the commit that lands its work.

Hitting the line mid-implementation: finish the atomic step, commit,
`Status: partial` with the rest as Next phase. The runner kills the
session at its kill line and commits leftovers as unverified work; that
is a fallback, not the plan.

## Nobody answers

`AskUserQuestion` is disabled. Every phase question is decided at once
as `D<n> (auto)` with one line of reason, plus a `missed: <question>`
line in the plan's Interview section. A blocker (the code contradicts
the plan, two decisions conflict, an irreversible step the plan does not
name) still stops.

Keep going until the session ends one of the three ways. Do not end with
a progress update. The report and hard-stop message are still written;
the runner logs them.
