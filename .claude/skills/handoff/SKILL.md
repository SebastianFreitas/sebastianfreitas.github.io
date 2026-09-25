---
name: handoff
description: Write .claude/handoff.md so a fresh context can continue this task. Use when CONTEXT WATCH says the main session is past its line, when a turn must end with work half done (an error you cannot get past, a question only the owner can answer), or when the owner asks for a handoff.
---

# Handoff

Write `.claude/handoff.md` (gitignored). In cloud mode it goes in the PR
body under `## Handoff` instead. Under 80 lines, no code, these headings
in this order:

- **Goal:** the owner's words.
- **Done:** commits with hashes.
- **In progress:** files, their state, the last spec sent.
- **Next:** numbered; the first step concrete enough to start cold.
- **Decisions:** each with its why.
- **Gotchas:** found this session and not in `.claude/MAP.md`.
- **Verified:** flows and snapshot runs that passed, and which are
  pending.
- **Foreign edits:** uncommitted paths that were not yours (shared mode).

Then end the turn as your mode file's "Context full" rule says. The
SessionStart hook prints the file into the next context (also after
`/clear`), cut at 6,000 characters (less if the mode rules and dirty
list are long: hook output over 10,000 characters is replaced by a
2,000-character preview), so keep it short.

## Auto-continue

For a context-full handoff the session clears itself and picks the work
back up with no owner input. Each mode's "Context full" rule says when to
run it. It is the same session afterwards, with the same folder, branch
and PR. A local session stays in its worktree (or the shared checkout)
and a cloud session stays in its container. So never open a new
worktree, branch or PR for the same work. A handoff that waits on the
owner (a question, a blocker) skips this. Once the file is written and
everything is committed:

1. Load the tools: `ToolSearch` with
   `select:mcp__ccd_session_mgmt__clear_session,CronCreate`.
2. Call `mcp__ccd_session_mgmt__clear_session` with `session_id:
   "self"`. It runs `/clear` when this turn ends. If the tool is missing
   (a terminal session) or refuses, skip step 3 and end with the mode
   file's manual line.
3. In Bash, run `date -d '+3 min' '+%-M %-H %-d %-m'`. If the first
   number is 0 or 30, run it with `+4 min` instead, because jobs set for
   those minutes can fire up to 90 s early. Call `CronCreate` with
   `cron: "<M> <H> <D> <Mo> *"`, `recurring: false` and the prompt below.
   The job survives `/clear` (checked in the Claude Code 2.1.281 source)
   and fires into the fresh context once it is idle. By then the
   SessionStart hook has printed the handoff there.
4. End the turn as the mode file's "Context full" rule says, with the
   `<H>:<M>` in its line. The report is long enough that the turn ends
   before the job's time.

Clear first, then schedule: a refused clear then leaves no job behind.
The prompt, verbatim:

"Auto-continue: continue from the handoff. If .claude/handoff.md is
gone, the work already continued: say so in one line and stop. If this
conversation still holds the turn that wrote the handoff, the clear did
not happen: say 'Auto-clear cancelled. Type /clear and say: continue
from the handoff.' and stop."
