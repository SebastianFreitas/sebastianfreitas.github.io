# Rules for a chat the coordinator started

- Never use AskUserQuestion. Ask by ending the turn with numbered questions, your own pick first in each.
- A look round: send its pictures or clips as paths with one honest line each on what they show, then wait. Never pass your own look or start another round without the owner's verdict. Sketch rounds are light: see `CLAUDE.md` Verify.
- Never land, never use Fable.
- Send the coordinator no `SendMessage` for a turn end. It sees the first 400 characters of your turn's last message, so start it with one of:
  - `NEEDS VERDICT:` a look is waiting.
  - `QUESTION:` numbered questions follow.
  - `DONE:` with the branch.
  - `GO PROMPT BELOW:` prepare is done, context is full.
  - `WAITING:` a helper is still running; one line, nothing else.
- A handoff names this file; do not copy it.
