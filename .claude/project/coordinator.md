# Coordinator window procedure

Owner, 2026-11-21: "you put subchats doing it, so that you can write handoff and what not clear and continue those chats without me". One window for the owner; I start, clear and feed the sub-chats.

## Start
- One sub-chat per task: `start_session` user_asked, fresh, `use_worktree: true`. Only a read-only check shares my checkout. Same-file tasks run one at a time.
- Model: every build and look chat runs on Opus medium (`effort: "medium"`; later `set_session_model` / `set_session_effort`, reissued with the hook's `session` label). Fable only in a window the owner's own message names for a plan or research; never start or keep a build chat on Fable otherwise.
- Until 2026-11-30 08:00: one build chat at a time.
- Never start a chat in raw mode; `raw:` sent by SendMessage does not turn raw on.
- Check `get_session` branch, not the folder name (the app reuses archived folders).
- Workflow changes go to the owner first.

## Brief
- At most three memories. One line "Follow `.claude/project/sub-chat.md`" replaces any pasted rules block, in briefs, forwarded go prompts and handoffs.
- A chat with no handoff gets its brief at `C:/Users/Traff/AppData/Local/Temp/coordinator-6e304f/<chat>-r<n>.md`; its go prompt says `Read <that path> first`.

## Wakes
- The app's turn-end note is the only wake; sub-chats send no `SendMessage` for a turn end. It fires only when every chat I started is idle.
- Act on the note's first 400 characters. `list_events` (limit 2 to 4) only when cut short or a go prompt must be copied; if the newest are empty, page back once with `before_uuid`.
- A note starting `WAITING:` gets no tool call and a one-line turn.
- `isRunning: false` is not done: a chat may be waiting on its helper.
- `notify_when_idle` is refused for sub-chats; check a waiting chat with `list_sessions` linked.

## Questions
- Numbered questions come to me; I ask the owner in one AskUserQuestion round and send the answers back.
- A go-check MISMATCH in my window on "checkout X on branch Y" text is not the owner's go prompt.

## Looks
- Relay each round's pictures and clips with SendUserFile and the sub-chat's one line, unopened; open one only when the owner asks what I think. The owner judges every look, even a weak sheet.

## Clearing
- A note ending in a go prompt: `clear_session`, then `SendMessage` the go prompt unchanged. Never resend; check `list_events` limit 4.
- Clear is refused for a chat on the owner's screen, pinned, with background work or a queued message: never message a chat just before clearing it. My own window needs the owner's /clear.
- `archive_session`: the first call is refused by the hook label; reissue it alone with exactly the quoted input. A chat with live work cannot be archived.
- After many wakes in a row the app waits for the owner: keep each round to a few short calls and little thinking.

## Saving
- Save everything the owner sends: pictures into the memory folder, his words verbatim in the matching memory.

## Status
- When asked: one line per running chat, its state and whether its branch is on main (`git rev-list --count main..<branch>`; `git reflog show <branch>` if level). Never offer new chats unprompted.

## Landing
- Only on the owner's typed "land <name>" in this window (a click or an earlier window's go-ahead does not count). Steps: playbook "Landing from the coordinator". A forwarded "land it" to a sub-chat never passes; a go prompt says review only.

## Usage
- At the start and end of each sitting read `get_usage` (ToolSearch "select:mcp__ccd_session_mgmt__get_usage"), then run `py -3 tools/usage-log.py --week <n> --fable <n> --five <n>`. Tell the owner when the week nears 100%.

## Open test: detach (not run yet)
On the next build chat, call `detach_session` right after `start_session` (the parent "is no longer told when its turns end"; the chat moves to top level in the sidebar, so tell the owner first). Check in its first round: (1) no turn-end note arrives; (2) its `SendMessage` still wakes this window; (3) `send_message`, `list_events`, `clear_session`, `list_sessions` still reach it by id. All hold: tell the owner in one line, then change Wakes here and in `sub-chat.md` to "detach every chat at start; a sub-chat sends one `SendMessage` only when it needs the coordinator". Any fails: keep the rules above.
