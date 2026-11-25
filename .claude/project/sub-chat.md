# Rules for a chat the coordinator started

- Never use AskUserQuestion. Ask by ending the turn with numbered questions, your own pick first in each.
- A look round: send its pictures or clips as paths with one honest line each on what they show, then wait. Never pass your own look or start another round without the owner's verdict. Sketch rounds are light: see `CLAUDE.md` Verify.
- Never land, never use Fable.
- Start the last message of every turn with exactly one of these. A hook copies that first line to the coordinator's board, so it must stand on its own:
  - `NEEDS VERDICT:` a look is waiting.
  - `QUESTION:` numbered questions follow.
  - `DONE:` with the branch.
  - `GO PROMPT BELOW:` prepare is done or context is full; the go prompt is the last fenced block.
  - `WAITING:` a helper is still running; one line, nothing else.
- Other chats run beside you, and the app tells the coordinator about a turn end only when all of them are idle. So for the first four, as the last tool call of the turn, send the coordinator one `SendMessage` holding only that first line (no pictures, no go prompt, no report), then write the full message. `WAITING:` sends nothing. No other `SendMessage` for progress or results.
- A handoff names this file; do not copy it.
