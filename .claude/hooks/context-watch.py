"""Context watch: keeps every context small, because quality drops as a
context grows, long before the window is full.

Main session (PreToolUse, UserPromptSubmit): warns from 90% of its line
and says to finish and hand off past it (rules in .claude/rules/
workflow.md "Context budget"; handoff format in .claude/skills/handoff).
The line depends on the window:
- a headless plan session: AUTOPLAN_LINE from tools/autoplan.py;
- the coordinator window (any owner prompt that starts `coordinator:`
  or is just `coordinator`, also after a <pasted_content> tag; remembered until
  /clear or a new chat; the warnings re-arm against the new line):
  COORD_LIMIT (120,000), because it runs on Sonnet and keeps its state on
  the board, so it can be cleared freely; the kind is stored, so the line
  follows it;
- a plan run's supervisor (a prompt that is the go prompt `go: run plan`
  or `carry on running plan`, or a Bash/PowerShell call that launches
  `py ... autoplan.py <name>`; remembered for the window):
  RUN_LIMIT (250,000), because it reports every phase of a plan in one window;
- any other app window (a prepare, a prepared run, a sub-chat, a quick
  fix, a plan interview): LIMIT (150,000) is lower because what grows there is the
  model's own output (specs, thinking); two prepare windows went from
  42k to 140k with one Explore call each (review of 2026-10-01, when
  LIMIT was 120,000).

Subagents (Explore, Plan, general-purpose, researcher, claude-code-guide, implementer,
implementer-wt, reviewer, reviewer-light, plan-reviewer, look-judge, plan-writer):
- PreToolUse: warns at SOFT x its line, says to stop reading past it.
  Advisory only; a model can ignore it.
- PreToolUse: past HARD x its line, every further tool call is DENIED with
  an instruction to write the report now. This is the enforcement: a
  subagent cannot drift past 1.25x its line. A Write or Edit under
  .claude/specs/reports/ stays allowed, so the report can still land.
- SubagentStop: logs the peak to a per-session ledger; the main session's
  next hook run reports it.

Warnings are printed once per threshold crossing (90% / 80%, then the
line), not on every tool call: past the line every call used to repeat
the warning (one session got it 25 times), each one costing tokens in
the window it was protecting. The crossing state is
`<session dir>/context-watch.state.json`; a new prompt (UserPromptSubmit)
does not repeat it, except past the line, where every owner prompt repeats
it (state "warned" = first crossing time, read by stop-guard.py). The
deny past HARD is not a warning and stays on every call.

transcript_path is always the parent session's transcript; a subagent's
own transcript is agent_transcript_path (SubagentStop) or derived from
agent_id. A subagent whose own transcript can't be found is skipped,
never measured from the parent's. Usage = input + cache read + cache
creation of the last turn after the last compact boundary (none yet
after a compaction: no reading).
Never fails the hook: any error exits 0 (and allows the tool).
"""
import json
import os
import re
import subprocess
import sys
import tempfile
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from guard_config import first_prompt  # noqa: E402
except ImportError as e:  # an older guard_config.py: no first-prompt check
    sys.stderr.write("context-watch.py: guard_config.py is older than this file (%s): first-prompt check off\n" % e)

    def first_prompt(transcript_path):
        return ""

LIMIT = 150_000       # every app window but the coordinator and a supervisor
COORD_LIMIT = 120_000  # the coordinator window
RUN_LIMIT = 250_000   # a plan run's supervisor
# a prompt that starts `coordinator:` or is just `coordinator`: it skips leading reminder blocks, but not the
# "Background (...):" paragraph or "Task:" label of a chat another session
# opened, which is never the coordinator
COORDINATOR_PROMPT = re.compile(r"(?:\s*<system-reminder>(?:(?!</system-reminder>).)*</system-reminder>|\s*<pasted_content\b[^>]*>)*\s*coordinator[ \t]*(:|$)", re.I | re.S)
NOTES = []            # lines main_line wants printed with this event's output
SUPERVISOR_PROMPT = re.compile(r"go: run plan |carry on running plan ")
# py / py.exe / python / python3 / python3.12 (bare, as a path, quoted or
# not), an optional -3 / -3.12, then a path ending in autoplan.py (quoted
# paths may hold spaces) and a word. `grep autoplan.py`, `cat
# tools/autoplan.py` and `py tools/autoplan.py --dry-run x` do not match.
SUPERVISOR_CMD = re.compile(
    r"(?:^|[\s;&|(\"'/\\])py(?:thon[\d.]*)?(?:\.exe)?[\"']?\s+"
    r"(?:-3(?:\.\d+)?\s+)?"
    r"(?:\"[^\"\n]*autoplan\.py\"|'[^'\n]*autoplan\.py'|[^\s\"']*autoplan\.py)"
    r"\s+\w")
SOFT = 0.8            # subagents: warn from this fraction of a line
MAIN_SOFT = 0.9       # main session: warn from this fraction of its line
HARD = 1.25           # subagents: deny all tools from this multiple of the line

# Context line per subagent type. Explore and Plan carry a ~33k baseline
# (system prompt and tools) before reading anything, so their line is
# higher. Types not listed are measured on SubagentStop, never warned or
# denied.
SUB_LIMITS = {"Explore": 100_000, "Plan": 100_000,
              "general-purpose": 100_000, "researcher": 100_000,
              "claude-code-guide": 100_000,
              "implementer": 60_000, "implementer-wt": 60_000, "reviewer": 80_000,
              "reviewer-light": 80_000, "plan-reviewer": 80_000, "look-judge": 80_000, "plan-writer": 120_000}


def usage_total(u):
    return (u.get("input_tokens", 0)
            + u.get("cache_creation_input_tokens", 0)
            + u.get("cache_read_input_tokens", 0))


def context_tokens(path):
    size = os.path.getsize(path)
    with open(path, "rb") as f:
        f.seek(max(0, size - 600_000))
        tail = f.read().decode("utf-8", "ignore")
    for line in reversed(tail.splitlines()):
        if '"compact_boundary"' in line:
            try:
                o = json.loads(line)
            except ValueError:
                o = None
            if o and o.get("subtype") == "compact_boundary":
                # No turn since the last compaction: usage lines before the
                # boundary measure the old, pre-compaction context.
                return None
        if '"usage"' not in line:
            continue
        try:
            o = json.loads(line)
        except ValueError:
            continue
        u = (o.get("message") or {}).get("usage")
        if u:
            return usage_total(u)
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
            if u:
                peak = max(peak, usage_total(u))
    return peak


def session_dir(transcript_path):
    p = os.path.normpath(transcript_path)
    if os.path.basename(os.path.dirname(p)) == "subagents":
        return os.path.dirname(os.path.dirname(p))
    return os.path.splitext(p)[0]


def ledger_path(transcript_path):
    return os.path.join(session_dir(transcript_path), "context-watch.jsonl")


def state_path(transcript_path):
    return os.path.join(session_dir(transcript_path), "context-watch.state.json")


def read_state(transcript_path):
    try:
        with open(state_path(transcript_path), encoding="utf-8") as f:
            s = json.load(f)
    except (OSError, ValueError):
        s = {}
    if not isinstance(s, dict):
        s = {}
    s.setdefault("main", {})
    s.setdefault("agents", {})
    return s


def write_state(transcript_path, s):
    sp = state_path(transcript_path)
    try:
        os.makedirs(os.path.dirname(sp), exist_ok=True)
        tmp = sp + f".{os.getpid()}.tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(s, f)
        os.replace(tmp, sp)
    except OSError:
        pass


def own_transcript(d):
    atp = d.get("agent_transcript_path")
    if atp and os.path.exists(atp):
        return atp
    path, agent_id = d.get("transcript_path"), d.get("agent_id")
    if not (path and agent_id):
        return None
    cand = os.path.join(session_dir(path), "subagents", f"agent-{agent_id}.jsonl")
    return cand if os.path.exists(cand) else None


def report_write(d):
    """Past HARD the agent must still be able to write its report: a Write
    or Edit under .claude/specs/reports/ (agents return only its path)."""
    if d.get("tool_name") not in ("Write", "Edit"):
        return False
    p = ((d.get("tool_input") or {}).get("file_path") or "").replace("\\", "/")
    return "/.claude/specs/reports/" in p or p.startswith(".claude/specs/reports/")


def tier_of(used, limit, soft):
    if used >= limit:
        return 2
    if used >= limit * soft:
        return 1
    return 0


def procedure(name, d):
    """The text of .claude/project/<name> under one line saying it is this
    window's procedure; "" when the file is missing. The test checks the size
    (hook context cap 10,000 characters), not this."""
    for base in (os.environ.get("CLAUDE_PROJECT_DIR"), d.get("cwd"),
                 os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))):
        try:
            with open(os.path.join(base, ".claude", "project", name), encoding="utf-8") as f:
                body = f.read().strip()
            return (f"PROCEDURE: this is this window's procedure (.claude/project/{name}); "
                    f"it wins over workflow.md.\n{body}")
        except (OSError, TypeError):
            continue
    return ""


def coordinator_added(d):
    """True when the board row of this window's branch was made by
    `board.py add` (the coordinator started this chat), not by the board hook."""
    def git(*a):
        r = subprocess.run(["git", *a], cwd=d.get("cwd"), capture_output=True, text=True, timeout=10)
        return r.stdout.strip() if r.returncode == 0 else ""
    branch = git("symbolic-ref", "--short", "HEAD")
    common = git("rev-parse", "--path-format=absolute", "--git-common-dir")
    bf = os.environ.get("BOARD_FILE") or (common and os.path.join(os.path.dirname(common), ".claude", "board.json"))
    if not (branch and bf):
        return False
    with open(bf, encoding="utf-8") as f:
        row = json.load(f).get("rows", {}).get(branch)
    return bool(row and row.get("added"))


def main_line(d, state):
    """(limit, kind) for this app window; kind is "coordinator",
    "supervisor" or ""."""
    env = os.environ.get("AUTOPLAN_LINE")
    if env:
        try:
            return int(env), ""
        except ValueError:
            pass
    kind = state["main"].get("run")
    if kind == "coordinator":
        return COORD_LIMIT, kind
    if kind and d.get("hook_event_name") != "UserPromptSubmit":
        return RUN_LIMIT, kind
    text = d.get("prompt") or ""
    if not text and d.get("tool_name") in ("Bash", "PowerShell"):
        text = (d.get("tool_input") or {}).get("command") or ""
    # the app queues a sub-chat's first message, so no UserPromptSubmit
    # carries it: a tool call then reads it from the transcript, once:
    # "checked" stops later tool calls re-reading the transcript
    if d.get("hook_event_name") == "UserPromptSubmit":
        coord_text = text
        state["main"]["checked"] = True
    elif d.get("tool_name") and not state["main"].get("checked"):
        coord_text = first_prompt(d.get("transcript_path") or "")
        state["main"]["checked"] = True
    else:
        coord_text = ""
    if COORDINATOR_PROMPT.match(coord_text):
        # the line moved: tiers crossed under the old line no longer hold
        state["main"]["run"] = "coordinator"
        state["main"]["tier"] = 0
        state["main"].pop("warned", None)
        NOTES.append("CONTEXT WATCH: coordinator window, line "
                     f"{COORD_LIMIT // 1000}k until /clear.")
        if state["main"].get("proc") != "coordinator":
            state["main"]["proc"] = "coordinator"
            NOTES.append(procedure("coordinator.md", d))
        return COORD_LIMIT, "coordinator"
    if kind:
        return RUN_LIMIT, kind
    if SUPERVISOR_PROMPT.search(text) or SUPERVISOR_CMD.search(text):
        state["main"]["run"] = "supervisor"
        state["main"]["tier"] = 0
        return RUN_LIMIT, "supervisor"
    return LIMIT, ""


def main_message(used, limit, tier, kind):
    pct = used * 100 // limit
    if tier == 2:
        if kind == "supervisor":
            return (f"CONTEXT WATCH: {used:,} tokens in context, past the "
                    f"supervisor line of {limit:,}. Launch nothing new: "
                    "finish the phase report and end with the go prompt "
                    "('carry on running plan <name>'), as run.md says.")
        if os.environ.get("AUTOPLAN_LINE"):
            return (f"CONTEXT WATCH: {used:,} tokens in context, past the "
                    f"handoff line of {limit:,}. Finish only the current "
                    "atomic step (an implementer already running may "
                    "finish; start nothing new), verify, commit, then follow "
                    "your mode file's 'Context full' rule.")
    elif tier == 1 and (kind == "supervisor" or os.environ.get("AUTOPLAN_LINE")):
        return (f"CONTEXT WATCH: {used:,} tokens in context ({pct}% of "
                f"the line of {limit:,}). Prefer finishing over starting "
                "new work; read nothing more yourself (Explore brings "
                "anchors and excerpts).")
    if tier >= 1:
        if kind == "coordinator":
            return (f"CONTEXT WATCH: {used:,} tokens in context ({pct}% of "
                    f"the line of {limit:,}). Finish this round, then end the "
                    "turn telling the owner to type /clear and then "
                    "coordinator. Write no handoff.")
        return (f"CONTEXT WATCH: {used:,} tokens in context ({pct}% of the "
                f"line of {limit:,}). Finish the current step, commit, write "
                ".claude/handoff.md (handoff skill) and end the turn with the "
                "go prompt. Start no new step.")
    return None


def sub_message(used, limit, tier, who):
    pct = used * 100 // limit
    if tier == 2:
        return (f"CONTEXT WATCH: {used:,} tokens in your context, past the "
                f"subagent line of {limit:,}. Stop exploring: finish only "
                "from what you already have. At "
                f"{int(limit * HARD):,} every tool call will be refused, so "
                "write your report soon and say in it that you hit the "
                "context line.")
    if tier == 1:
        return (f"CONTEXT WATCH: {used:,} tokens in your context ({pct}% of "
                "the subagent line). Read no more whole files; grep and "
                "read small ranges only; pipe command output through tail.")
    return None


def emit(event, msg):
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": event, "additionalContext": msg}}))


def working_tree(cwd):
    """Tree hash of the working tree, taken with a temporary index (the real
    index and stash stay alone); "" when git fails."""
    try:
        with tempfile.TemporaryDirectory() as tmp:
            env = dict(os.environ, GIT_INDEX_FILE=os.path.join(tmp, "index"))
            kw = dict(cwd=cwd, env=env, capture_output=True, text=True, timeout=30)
            if subprocess.run(["git", "add", "-A"], **kw).returncode == 0:
                r = subprocess.run(["git", "write-tree"], **kw)
                return r.stdout.strip() if r.returncode == 0 else ""
    except (OSError, subprocess.SubprocessError):
        pass
    return ""


def review_start_path(transcript_path):
    return os.path.join(session_dir(transcript_path), "review-start.json")


def note_review_start(d):
    """PreToolUse on the Agent tool for reviewer / reviewer-light: remember the
    working tree the reviewer starts on (oldest launch first)."""
    if d.get("tool_name") not in ("Agent", "Task"):
        return
    if (d.get("tool_input") or {}).get("subagent_type") not in ("reviewer", "reviewer-light"):
        return
    path = d.get("transcript_path")
    tree = working_tree(d.get("cwd"))
    if not (path and tree):
        return
    sp = review_start_path(path)
    try:
        with open(sp, encoding="utf-8") as f:
            starts = json.load(f)
    except (OSError, ValueError):
        starts = []
    os.makedirs(os.path.dirname(sp), exist_ok=True)
    with open(sp, "w", encoding="utf-8") as f:
        json.dump(_fresh_starts(starts)[-9:] + [[time.time(), tree]], f)


def _fresh_starts(starts):
    """The [time, tree] start entries from the last two hours."""
    now = time.time()
    return [s for s in (starts if isinstance(starts, list) else [])
            if isinstance(s, list) and len(s) == 2 and isinstance(s[0], (int, float))
            and now - s[0] < 7200]


def pop_review_start(transcript_path, tree):
    """True when every start entry from the last two hours holds `tree` (and at
    least one exists); one entry is removed, and older ones are dropped."""
    if not transcript_path:
        return False
    sp = review_start_path(transcript_path)
    try:
        with open(sp, encoding="utf-8") as f:
            starts = _fresh_starts(json.load(f))
        same = bool(starts) and all(s[1] == tree for s in starts)
        with open(sp, "w", encoding="utf-8") as f:
            json.dump(starts[1:], f)
        return same
    except (OSError, ValueError):
        return False


def record_review(d):
    """A reviewer run is recorded for the branch and tip it saw, in
    <main checkout>/.claude/reviewed.json (next to board.json), so review-guard
    in any worktree of the repo can read it."""
    def git(*a):
        r = subprocess.run(["git", *a], cwd=d.get("cwd"), capture_output=True, text=True, timeout=10)
        return r.stdout.strip() if r.returncode == 0 else ""
    branch = git("symbolic-ref", "--short", "HEAD")
    tip = git("rev-parse", "HEAD")
    common = git("rev-parse", "--path-format=absolute", "--git-common-dir")
    if not (branch and tip and common):
        return
    path = os.path.join(os.path.dirname(common), ".claude", "reviewed.json")
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, ValueError):
        data = {}
    data[branch] = (data.get(branch, []) + [tip])[-10:]
    # the reviewer runs before the commit: also keep the tree of the working
    # tree it saw, but only when it is the tree the reviewer started on (a
    # review that ran while files changed saw no single tree)
    tree = working_tree(d.get("cwd"))
    same = pop_review_start(d.get("transcript_path"), tree)
    if tree and same:
        data[branch + "#trees"] = (data.get(branch + "#trees", []) + [tree])[-10:]
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f)


def on_subagent_stop(d):
    path = d.get("transcript_path")
    # Never measure a subagent from the parent's transcript (the compaction
    # agent has no transcript of its own).
    sub = own_transcript(d)
    if not (path and sub):
        return
    agent_id = d.get("agent_id")
    agent_type = d.get("agent_type") or "subagent"
    peak = peak_tokens(sub)
    limit = SUB_LIMITS.get(agent_type)
    try:
        with open(ledger_path(path), "a", encoding="utf-8") as f:
            f.write(json.dumps({"agent_id": agent_id, "agent_type": agent_type,
                                "peak": peak, "limit": limit,
                                "reported": False}) + "\n")
    except OSError:
        pass
    if agent_type in ("reviewer", "reviewer-light"):
        try:
            record_review(d)
        except Exception:
            pass
    if limit is None:
        msg = f"SUBAGENT CONTEXT: {agent_type} {agent_id} peaked at {peak:,} tokens"
    else:
        over = " - OVER THE LINE" if peak >= limit else ""
        msg = (f"SUBAGENT CONTEXT: {agent_type} {agent_id} peaked at "
               f"{peak:,} tokens (line {limit:,})" + over)
    print(json.dumps({"systemMessage": msg}))


def on_subagent_tool(d, ev):
    agent_type = d.get("agent_type") or ""
    limit = SUB_LIMITS.get(agent_type)
    if limit is None:
        return
    own = own_transcript(d)
    if own is None:
        return
    used = context_tokens(own)
    if used is None:
        return
    if ev == "PreToolUse" and used >= limit * HARD and not report_write(d):
        print(json.dumps({"hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": (
                f"CONTEXT WATCH: {used:,} tokens, past your hard line of "
                f"{int(limit * HARD):,}. No more tool calls. Write your "
                "report now from what you have (Write to .claude/specs/reports/ "
                "is still allowed; for the implementer: "
                "files changed, verification so far, what is left), and "
                "say you hit the context line so the task must be "
                "narrowed or split.")}}))
        return
    tier = tier_of(used, limit, SOFT)
    path, agent_id = d.get("transcript_path"), str(d.get("agent_id"))
    if not path:
        return
    state = read_state(path)
    if tier <= int(state["agents"].get(agent_id, 0)):
        return
    state["agents"][agent_id] = tier
    write_state(path, state)
    msg = sub_message(used, limit, tier, f"{agent_type} subagent")
    if msg:
        emit(ev, msg)


def ledger_messages(path):
    lp = ledger_path(path)
    if not os.path.exists(lp):
        return []
    parts, entries, changed = [], [], False
    with open(lp, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    entries.append(json.loads(line))
                except ValueError:
                    pass
    for e in entries:
        if e.get("reported") is not False:
            continue
        peak, limit = e.get("peak", 0), e.get("limit")
        msg = (f"SUBAGENT CONTEXT: {e.get('agent_type')} {e.get('agent_id')} "
               f"peaked at {peak:,} tokens")
        if limit is not None and peak >= limit:
            msg += (f" - over the {limit:,} line: its prompt let it read too "
                    "much; make the next spec or Explore prompt narrower "
                    "(file, function, line range) or split the task.")
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
    return parts


def on_main(d, ev, path):
    parts = []
    state = read_state(path)
    if ev == "UserPromptSubmit" and not state["main"].get("run"):
        # a fresh window's go prompt can arrive before the transcript has
        # any usage: file the line now, no later prompt retries it
        used = context_tokens(path) if os.path.exists(path) else None
        if used is None:
            main_line(d, state)
            if state["main"].get("run"):
                write_state(path, state)
    if os.path.exists(path):
        used = context_tokens(path)
        if used is not None:
            limit, kind = main_line(d, state)
            tier = tier_of(used, limit, MAIN_SOFT)
            last = int(state["main"].get("tier", 0))
            # speaks only when a threshold is crossed, on a prompt or a call
            # past the line it repeats on every owner prompt
            if tier > last or (tier == 2 and ev == "UserPromptSubmit"):
                m = main_message(used, limit, tier, kind)
                if m:
                    parts.append(m)
                if tier and not state["main"].get("warned"):
                    state["main"]["warned"] = time.time()
            state["main"]["tier"] = max(tier, last)
            write_state(path, state)
    # a sub-chat the coordinator started: its procedure, once per window
    if not state["main"].get("proc") and not state["main"].get("run"):
        state["main"]["proc"] = "checked"
        try:
            if coordinator_added(d):
                NOTES.append(procedure("sub-chat.md", d))
        except Exception:
            pass
        write_state(path, state)
    parts = [n for n in NOTES if n] + parts
    try:
        parts += ledger_messages(path)
    except OSError:
        pass
    if not parts:
        return
    msg = "\n".join(parts)
    if ev in ("PreToolUse", "PostToolUse"):
        emit(ev, msg)
    else:
        print(msg)


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    d = json.load(sys.stdin)
    ev = d.get("hook_event_name")
    path = d.get("transcript_path")

    if ev == "SubagentStop":
        on_subagent_stop(d)
        return
    if ev == "PreToolUse" and not d.get("agent_id"):
        try:
            note_review_start(d)
        except Exception:
            pass
    if d.get("agent_id"):
        if ev in ("PreToolUse", "PostToolUse"):
            on_subagent_tool(d, ev)
        return
    if not path:
        return
    on_main(d, ev, path)


try:
    main()
except Exception:
    pass
