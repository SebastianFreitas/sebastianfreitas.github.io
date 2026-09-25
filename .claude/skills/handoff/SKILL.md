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
