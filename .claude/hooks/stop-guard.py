"""Stop guard (Stop, main session): in worktree and cloud mode, the turn
may not end with work that the owner's Commit command would miss.

- Worktree or cloud: uncommitted or untracked (not ignored) files -> block
  once, asking to commit them by path, or to say why they stay.
- Cloud: commits not pushed to the branch's remote -> block once.

A background helper this window launched that has not reported yet (an Agent
launch answered "Async agent launched", or with run_in_background, and no
task-notification naming its id) passes too: the dirty files are its
unfinished edits.

Any window but the coordinator that has had its 90% context warning (state
file of context-watch.py) is blocked once if .claude/handoff.md is missing
or older than the warning (not while a background helper runs).

Shared mode is never checked: foreign edits make "uncommitted" meaningless
there. A second stop in a row (stop_hook_active) always passes, so the
session can end a turn deliberately (a question for the owner, a blocker).
Never fails the hook: any error exits 0.
"""
import json
import os
import re
import subprocess
import sys


def git(*args, strip=True):
    try:
        out = subprocess.run(["git", *args], capture_output=True, text=True,
                             timeout=10)
        return out.stdout.strip() if strip else out.stdout
    except Exception:
        return ""


def same(a, b):
    return os.path.normcase(os.path.abspath(a)) == os.path.normcase(os.path.abspath(b))


def mode():
    if os.environ.get("CLAUDE_CODE_REMOTE") == "true":
        return "cloud"
    common = git("rev-parse", "--path-format=absolute", "--git-common-dir")
    top = git("rev-parse", "--show-toplevel")
    if common and top and not same(os.path.dirname(common), top):
        return "worktree"
    return "shared"


def background_outstanding(transcript_path):
    """True when an Agent launched in the background has no task-notification
    yet. The transcript may still be written to: bytes that do not decode are
    replaced and a last line that does not parse is skipped. A read problem
    gives False (the guard then runs), except after a launch was seen: then an
    agent counts as still running."""
    launched, done = set(), set()
    try:
        if not transcript_path:
            return False
        with open(transcript_path, encoding="utf-8", errors="replace") as f:
            for line in f:
                if "<task-notification>" in line:
                    done.update(re.findall(r"<tool-use-id>\s*([^<\s]+?)\s*<\\?/tool-use-id>", line))
                if "Async agent launched" in line:
                    # agents run in the background without the input flag:
                    # the tool_result is what says so
                    launched.update(re.findall(r'"tool_use_id":\s*"([^"]+)"', line))
                if '"tool_use"' not in line or "run_in_background" not in line:
                    continue
                try:
                    e = json.loads(line)
                except ValueError:
                    continue
                c = (e.get("message") or {}).get("content") if isinstance(e, dict) else None
                for b in c if isinstance(c, list) else []:
                    if (isinstance(b, dict) and b.get("type") == "tool_use"
                            and b.get("name") in ("Agent", "Task")
                            and (b.get("input") or {}).get("run_in_background")):
                        launched.add(b.get("id"))
        return bool(launched - done)
    except Exception:
        return bool(launched)


def handoff_missing(d):
    """The go prompt reason when this window had its context warning, is not
    the coordinator and has no .claude/handoff.md newer than that warning."""
    try:
        tp = d.get("transcript_path")
        if not tp or d.get("agent_id"):
            return ""
        with open(os.path.join(os.path.splitext(os.path.normpath(tp))[0],
                               "context-watch.state.json"), encoding="utf-8") as f:
            main_state = json.load(f).get("main") or {}
        warned = main_state.get("warned")
        if not warned or main_state.get("run") in ("coordinator", "supervisor"):
            return ""
        if os.environ.get("AUTOPLAN_LINE") or os.environ.get("AUTOPLAN") == "1":
            return ""  # a headless plan session has no go prompt
        h = os.path.join(d.get("cwd") or os.getcwd(), ".claude", "handoff.md")
        if os.path.exists(h) and os.path.getmtime(h) >= float(warned):
            return ""
        return ("Stop guard: this window passed its context warning and "
                ".claude/handoff.md is missing or older than it. Write it "
                "(handoff skill) and end the turn with the go prompt. If you "
                "are stopping on purpose, say so in one line and stop again.")
    except Exception:
        return ""


def main():
    d = json.load(sys.stdin)
    if d.get("stop_hook_active"):
        return
    bg = background_outstanding(d.get("transcript_path"))
    r = "" if bg else handoff_missing(d)
    if r:
        print(json.dumps({"decision": "block", "reason": r}))
        return
    if bg:
        return
    os.chdir(d.get("cwd") or os.getcwd())
    m = mode()
    if m == "shared":
        return
    problems = []
    dirty = git("status", "--porcelain", strip=False)
    paths = [l[3:] for l in dirty.splitlines()
             if l.strip() and not l[3:].strip('"').endswith(".claude/handoff.md")]
    if paths:
        more = f" (+{len(paths) - 12} more)" if len(paths) > 12 else ""
        problems.append("uncommitted files: " + ", ".join(paths[:12]) + more
                        + ". The Commit command merges commits only")
    if m == "cloud":
        branch = git("branch", "--show-current")
        remote = (git("rev-parse", "--abbrev-ref", "@{upstream}")
                  or (f"origin/{branch}" if branch and git(
                      "rev-parse", "--verify", "--quiet", f"origin/{branch}")
                      else ""))
        if remote:
            ahead = git("rev-list", "--count", f"{remote}..HEAD")
            if ahead and ahead != "0":
                problems.append(f"{ahead} commit(s) not pushed")
        else:
            base = git("rev-list", "--count", "origin/main..HEAD")
            if base and base != "0":
                problems.append("the branch has never been pushed")
    if not problems:
        return
    print(json.dumps({"decision": "block", "reason": (
        f"Stop guard ({m} mode): " + "; ".join(problems) + ". Commit by path"
        + (" and push" if m == "cloud" else "")
        + ", then end with the report. If you are stopping on purpose "
        "(a question for the owner, a blocker, work left for a handoff, a check "
        "you deliberately skipped), "
        "say so in one line and stop again.")}))


try:
    main()
except Exception:
    pass
