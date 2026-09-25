"""Context watch: tells the session when its context has grown past the
handoff line, so it can finish the current step, write .claude/handoff.md
and stop instead of degrading into compaction.

Runs on UserPromptSubmit (plain text goes into the context) and after every
Agent call (PostToolUse, JSON additionalContext). Reads the last assistant
message's usage from the transcript; input + cache read + cache creation is
the context size at that turn. Never fails the hook: any error exits 0.
"""
import json
import os
import sys

LIMIT = 140_000     # tokens in context that trigger the handoff
SOFT = 0.8          # warn from this fraction of LIMIT


def context_tokens(path):
    size = os.path.getsize(path)
    with open(path, "rb") as f:
        f.seek(max(0, size - 600_000))
        tail = f.read().decode("utf-8", "ignore")
    for line in reversed(tail.splitlines()):
        if '"usage"' not in line:
            continue
        try:
            o = json.loads(line)
        except ValueError:
            continue
        u = (o.get("message") or {}).get("usage")
        if not u:
            continue
        return (u.get("input_tokens", 0)
                + u.get("cache_creation_input_tokens", 0)
                + u.get("cache_read_input_tokens", 0))
    return None


def main():
    d = json.load(sys.stdin)
    path = d.get("transcript_path")
    if not path or not os.path.exists(path):
        return
    used = context_tokens(path)
    if used is None:
        return
    pct = used * 100 // LIMIT
    if used >= LIMIT:
        msg = (f"CONTEXT WATCH: {used:,} tokens in context, past the handoff "
               f"line of {LIMIT:,}. Finish only the current atomic step "
               "(an implementer already running may finish; start nothing "
               "new), then follow 'Context handoff' in CLAUDE.md: commit what "
               "is verified, write .claude/handoff.md, tell the user to start "
               "a new chat, and stop.")
    elif used >= LIMIT * SOFT:
        msg = (f"CONTEXT WATCH: {used:,} tokens in context ({pct}% of the "
               f"handoff line). Prefer finishing over starting new work.")
    else:
        return
    if d.get("hook_event_name") == "PostToolUse":
        print(json.dumps({"hookSpecificOutput": {
            "hookEventName": "PostToolUse", "additionalContext": msg}}))
    else:
        print(msg)


try:
    main()
except Exception:
    pass
