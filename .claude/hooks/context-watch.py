"""Context watch: tells the session when its context has grown past the
handoff line, so it can finish the current step, write .claude/handoff.md
and stop instead of degrading into compaction. Also watches subagents
(Explore, implementer): while they run, PostToolUse warns Explore, Plan and
the implementer directly if they read past their own line (SUB_LIMITS);
other subagent types are only measured. When one finishes, SubagentStop
measures its peak context and logs it to a per-session ledger, which the
main session's next UserPromptSubmit or PostToolUse call reads and reports.

Runs on UserPromptSubmit (plain text goes into the context), after every
tool call in the main session and in subagents (PostToolUse, JSON
additionalContext or systemMessage), and on SubagentStop. Reads usage from
the transcript; input + cache read + cache creation is the context size at
that turn. transcript_path is always the parent session's transcript, even
for subagent events; the subagent's own transcript is derived from
agent_id. Never fails the hook: any error exits 0.
"""
import json
import os
import sys

LIMIT = 140_000     # tokens in context that trigger the handoff
SOFT = 0.8          # warn from this fraction of LIMIT

# Context line per subagent type. Explore and Plan carry a ~33k baseline
# (system prompt and tools) before reading anything, so their line is
# higher. Types not listed (built-in agents such as the docs guide) are
# measured on SubagentStop but never warned or judged.
SUB_LIMITS = {"Explore": 100_000, "Plan": 100_000, "implementer": 60_000}


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


def peak_tokens(path):
    peak = 0
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            if '"usage"' not in line:
                continue
            try:
                o = json.loads(line)
            except ValueError:
                continue
            u = (o.get("message") or {}).get("usage")
            if not u:
                continue
            total = (u.get("input_tokens", 0)
                      + u.get("cache_creation_input_tokens", 0)
                      + u.get("cache_read_input_tokens", 0))
            if total > peak:
                peak = total
    return peak


def session_dir(transcript_path):
    p = os.path.normpath(transcript_path)
    if os.path.basename(os.path.dirname(p)) == "subagents":
        return os.path.dirname(os.path.dirname(p))
    return os.path.splitext(p)[0]


def ledger_path(transcript_path):
    return os.path.join(session_dir(transcript_path), "context-watch.jsonl")


def own_transcript(path, agent_id):
    if not agent_id:
        return None
    cand = os.path.join(session_dir(path), "subagents",
                         f"agent-{agent_id}.jsonl")
    return cand if os.path.exists(cand) else None


def report_line(used, limit, who):
    pct = used * 100 // limit
    if used >= limit:
        if not who:
            return (f"CONTEXT WATCH: {used:,} tokens in context, past the "
                     f"handoff line of {limit:,}. Finish only the current "
                     "atomic step (an implementer already running may "
                     "finish; start nothing new), then follow 'Context "
                     "handoff' in CLAUDE.md: commit what is verified, write "
                     ".claude/handoff.md, tell the user to start a new chat, "
                     "and stop.")
        return (f"CONTEXT WATCH: {used:,} tokens in your context, past the "
                f"subagent line of {limit:,}. You have read too much. Stop "
                "exploring: finish only from what you already have, keep "
                "your report short, and say in it that you hit the context "
                "line.")
    if used >= limit * SOFT:
        if not who:
            return (f"CONTEXT WATCH: {used:,} tokens in context ({pct}% of "
                     f"the handoff line). Prefer finishing over starting "
                     "new work.")
        return (f"CONTEXT WATCH: {used:,} tokens in your context ({pct}% of "
                f"the subagent line). Read no more whole files; grep and "
                "read small ranges only.")
    return None


def main():
    d = json.load(sys.stdin)
    ev = d.get("hook_event_name")
    path = d.get("transcript_path")
    agent_id = d.get("agent_id")
    agent_type = d.get("agent_type") or "subagent"

    if ev == "SubagentStop":
        if not path:
            return
        cand = own_transcript(path, agent_id)
        if cand:
            sub_path = cand
        elif os.path.exists(path):
            sub_path = path
        else:
            return
        peak = peak_tokens(sub_path)
        limit = SUB_LIMITS.get(agent_type)
        try:
            with open(ledger_path(path), "a", encoding="utf-8") as f:
                f.write(json.dumps({
                    "agent_id": agent_id,
                    "agent_type": agent_type,
                    "peak": peak,
                    "limit": limit,
                    "reported": False,
                }) + "\n")
        except OSError:
            pass
        if limit is None:
            systemMessage = (
                f"SUBAGENT CONTEXT: built-in {agent_id} peaked at "
                f"{peak:,} tokens")
        else:
            over = " - OVER THE LINE" if peak >= limit else ""
            systemMessage = (
                f"SUBAGENT CONTEXT: {agent_type} {agent_id} peaked at "
                f"{peak:,} tokens (line {limit:,})" + over)
        print(json.dumps({"systemMessage": systemMessage}))
        return

    if agent_id:
        if ev != "PostToolUse":
            return
        limit = SUB_LIMITS.get(agent_type)
        if limit is None:
            return
        own = own_transcript(path, agent_id)
        if own is None:
            return
        used = context_tokens(own)
        if used is None:
            return
        msg = report_line(used, limit, f"{agent_type} subagent")
        if msg:
            print(json.dumps({"hookSpecificOutput": {
                "hookEventName": "PostToolUse", "additionalContext": msg}}))
        return

    # main role
    if not path:
        return
    parts = []
    if os.path.exists(path):
        used = context_tokens(path)
        if used is not None:
            m = report_line(used, LIMIT, "")
            if m:
                parts.append(m)

    lp = ledger_path(path)
    if os.path.exists(lp):
        try:
            with open(lp, "r", encoding="utf-8") as f:
                lines = f.readlines()
            entries = []
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                try:
                    entries.append(json.loads(line))
                except ValueError:
                    continue
            changed = False
            for e in entries:
                if e.get("reported") is False:
                    peak = e.get("peak", 0)
                    limit = e.get("limit")
                    if limit is None:
                        msg = (f"SUBAGENT CONTEXT: built-in "
                               f"{e.get('agent_id')} peaked at {peak:,} "
                               "tokens")
                    else:
                        msg = (f"SUBAGENT CONTEXT: {e.get('agent_type')} "
                               f"{e.get('agent_id')} peaked at {peak:,} tokens")
                        if peak >= limit:
                            msg += (f" - over the {limit:,} line: its "
                                    "prompt let it read too much; make the "
                                    "next spec or Explore prompt narrower "
                                    "(name the file, function and line "
                                    "range).")
                    parts.append(msg)
                    e["reported"] = True
                    changed = True
            if changed:
                tmp = lp + ".tmp"
                try:
                    with open(tmp, "w", encoding="utf-8") as f:
                        for e in entries:
                            f.write(json.dumps(e) + "\n")
                    os.replace(tmp, lp)
                except OSError:
                    pass
        except OSError:
            pass

    if not parts:
        return
    msg = "\n".join(parts)
    if ev == "PostToolUse":
        print(json.dumps({"hookSpecificOutput": {
            "hookEventName": "PostToolUse", "additionalContext": msg}}))
    else:
        print(msg)


try:
    main()
except Exception:
    pass
