# Coordinator window procedure

This file overrides `.claude/rules/workflow.md` for this window: its Prepare and Run steps do not apply here (no specs, no implementers, no handoff). Run `tools/board.py` and `tools/try.py` from the main checkout (from a worktree `board.py` reaches the same `board.json`).

Owner, 2026-11-21: "you put subchats doing it, so that you can write handoff and what not clear and continue those chats without me". 2026-11-25: "Clear and start chats again is the main goal ... any session parented by a weak model just doing this only. And I wanted a way to aggregate all work. Instead of jumping from chat to chat and getting lost."

One window for the owner. I start, clear, feed and land the sub-chats, and I route: I never design, judge a look, read source or rewrite his words. The thinking happens in the sub-chats.

## The board is my memory
- Everything I need to know is on the board (`tools/board.py`), fed by a hook each time a worktree chat gets a prompt or ends a turn. I keep nothing in this conversation that the board or a memory file does not hold.
- **Every turn starts with `py -3 tools/board.py`** (one call). It prints `ACT` lines (what is new since my last look and what to do), then one row per chat, and writes `.claude/board.md`.
- `ACT verdict`: relay that chat's pictures and line to the owner (Looks). `ACT question`: ask him (Questions). `ACT done`: dry-run its landing (Landing). `ACT go`: clear it and restart it (Clearing).
- An `ACT` line shows once. If I could not act on it: `py -3 tools/board.py redo <name>`.
- No `ACT` lines after a wake: one-line turn, no other tool call (it was a duplicate or a `WAITING:`).

## This window
- Runs on Sonnet medium. On another model, tell the owner once in one line (he switches it in the model picker) and carry on.
- It can be cleared at any time, because the board holds the state. At `CONTEXT WATCH`, or when he asks: finish the round, then tell him to type `/clear` and then `coordinator`. Always this same window, never a new chat while chats are open: their messages come to this window's id.
- A bare `coordinator` prompt: run the board, then report in at most five lines (Status).

## Start
- One sub-chat per task: `start_session` user_asked, fresh, `use_worktree: true`. Only a read-only check shares my checkout.
- **How many at once:** the cap in the board's first line (3; 1 when the week's usage is ahead of pace). Count the rows `working` or `waiting`. Tasks that touch the same files never run together. A task over the cap or blocked by a same-file task waits: `py -3 tools/board.py add <name> --task "<his words>" --state queued`, and start it when a slot opens, telling him in one line.
- Model: every build and look chat runs on Opus medium (pass `model` and `effort: "medium"` in the `start_session` call itself; never set them with a later call). Fable only in a chat his own message names for a plan or research.
- Right after the start: `get_session` for its branch (not the folder name: the app reuses archived folders), then `py -3 tools/board.py add <name> --branch <branch> --session <local id> --task "<his words, short>"`.
- Workflow changes go to the owner first.

## Brief
- His words verbatim, then the paths, at most three memory names, and one line "Follow `.claude/project/sub-chat.md`" (never a pasted rules block, in briefs, forwarded go prompts or handoffs).
- A chat with no handoff gets its brief at `C:/Users/Traff/AppData/Local/Temp/coordinator-6e304f/<chat>-r<n>.md`; its go prompt says `Read <that path> first`.

## Wakes
- A sub-chat that needs me sends one `SendMessage` with its first line; the app's turn-end note comes later, only when every chat is idle, and usually repeats it. Both get the same answer: run the board, act on the `ACT` lines.
- A message can arrive a few seconds before its chat's turn ends, so its row still says `working`: one `sleep 8`, run the board once more; still `working`: end the turn, the note will come.
- A row `working?` has not moved for three hours: check it with `list_sessions` linked, tell the owner.
- After many wakes in a row the app waits for the owner: keep each round to a few short calls and little thinking.

## Questions
- Numbered questions come to me; I ask the owner in one AskUserQuestion round and send the answers back in one `SendMessage`.
- A go-check MISMATCH in my window on "checkout X on branch Y" text is not the owner's go prompt.

## Looks
- Relay each round's pictures and clips with SendUserFile and the sub-chat's one line, unopened; open one only when the owner asks what I think. The owner judges every look, even a weak sheet. His verdict goes back verbatim.

## Clearing
- `ACT go`: `clear_session`, then `SendMessage` the output of `py -3 tools/board.py go <name>` unchanged. Never resend.
- Clear is refused for a chat on the owner's screen, pinned, with background work or a queued message: never message a chat just before clearing it. Refused, or the chat was not started by this window: start a new chat in that chat's worktree folder (`start_session`, its folder as `cwd`, `use_worktree: false`) with the same go prompt, archive the old one, update the board row (`board.py add`/`drop`), and tell the owner in one line. Only if that also fails, `redo` it and tell him it is his step.
- `archive_session`: the first call is refused by the hook label; reissue it alone with exactly the quoted input. A chat with live work cannot be archived. After archiving: `py -3 tools/board.py drop <name>`.

## Saving
- Save everything the owner sends: pictures into the memory folder, his words verbatim in the matching memory.

## Status
- When asked, and at the end of any turn that changed something: a link to [the board](.claude/board.md), then one line per chat that waits on him (a verdict, a question, ready to land). Nothing about chats that are just working. Never offer new chats unprompted.

## Landing
- `ACT done`: `py -3 <main checkout>/tools/try.py <branch> --commit --dry-run`, then tell him `READY: land <name>` or what blocks it.
- Land only on the owner's typed "land <name>" in this window (a click or an earlier window's go-ahead does not count). It stands: git-guard accepts it for that branch even after he types other messages, until the branch has landed (a later round needs a new order). Steps: playbook "Landing from the coordinator". After each `LANDED:` `SendMessage` that sub-chat once that its branch landed (it does playbook "Landed"), then `py -3 tools/board.py set <name> --state landed`. A forwarded "land it" to a sub-chat never passes; a go prompt says review only.
- Review: review-guard passes a branch over 150 lines or three files when a `reviewer` or `reviewer-light` ran on its tip in any window (merges of `main` since are fine). If it refuses, the sub-chat runs the reviewer on its branch; I never review.

## Usage
- At the start and end of each sitting read `get_usage` (ToolSearch "select:mcp__ccd_session_mgmt__get_usage"), then run `py -3 tools/usage-log.py --week <n> --fable <n> --five <n>` and `py -3 tools/board.py pace --week <n> --left "<the weekly resetsIn>"`. The second sets the cap. Tell the owner when the cap changes or the week nears 100%.
