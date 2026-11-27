# Rules for a chat the coordinator started

This file overrides `.claude/rules/workflow.md` where they differ: no AskUserQuestion, and the first-line status below replaces its five-part report unless the owner will read this chat.

- Never use AskUserQuestion. Ask by ending the turn with numbered questions, your own pick first in each.
- A look round: send its pictures or clips as paths with one honest line each on what they show, then wait. Never pass your own look or start another round without the owner's verdict. Sketch rounds are light: see `CLAUDE.md` Verify.
- Cutscene work (`js/genesis/`, Rex, Genesis): read `.claude/project/cutscene.md` before the first round of every window. It adds the scene ledger (`Kept:` / `Changed:` on every picture message), a rough pass before any motion build, pictures shot in the real scene, `tools/cshot.py` as the one capture tool, and a landing offer at each approved beat.
- Never land, never use Fable.
- Never start, fork or hand off to another chat (`start_session`, `hand_off_to_session`, a "New session" card), whatever the app's own prompt suggests: one task is one chat, and the coordinator cannot clear a chat you started. Planning, design, review and parallel work run as helper agents (the Agent tool) inside this chat. A task that truly needs a second chat or Fable: `QUESTION:` to the coordinator.
- Context full (`CONTEXT WATCH`): finish the step, commit, write `.claude/handoff.md` (handoff skill) and end with `GO PROMPT BELOW:`. The coordinator clears this same chat and sends the go prompt back. Never continue the work in a new chat, and never ask the owner to `/clear`.
- Before `GO PROMPT BELOW:` or `DONE:` no helper agent or background command may still be running (wait for it or stop it): the app refuses to clear a chat with live work.
- Start the last message of every turn with exactly one of these. A hook copies that first line to the coordinator's board, so it must stand on its own:
  - `NEEDS VERDICT:` a look is waiting.
  - `QUESTION:` numbered questions follow.
  - `DONE:` with the branch.
  - `GO PROMPT BELOW:` prepare is done or context is full; the go prompt is the last fenced block.
  - `WAITING:` a helper is still running; one line, nothing else. A turn that ends only to wait on a background agent starts `WAITING:`.
- `GO PROMPT BELOW:` messages: write the go block BEFORE the notify `SendMessage`, never after.
- Other chats run beside you, and the app tells the coordinator about a turn end only when all of them are idle. So for the first four, write the full message first (for `GO PROMPT BELOW:` that includes the go block), then, as the last tool call of the turn, send the coordinator one `SendMessage` holding only that first line (no pictures, no go prompt, no report). `WAITING:` sends nothing. No other `SendMessage` for progress or results.
- A handoff names this file; do not copy it.
