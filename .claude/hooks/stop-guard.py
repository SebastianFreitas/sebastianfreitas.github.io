"""Stop guard (Stop, main session): in worktree and cloud mode, the turn
may not end with work that the owner's Commit command would miss.

- Worktree or cloud: uncommitted or untracked (not ignored) files -> block
  once, asking to commit them by path, or to say why they stay.
- Cloud: commits not pushed to the branch's remote -> block once.

A background helper this window launched that has not reported yet (an Agent
tool_use with run_in_background and no task-notification naming its id)
passes too: the dirty files are its unfinished edits.

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
    yet. Any read or parse problem gives False (the guard then runs)."""
    try:
        if not transcript_path:
            return False
        launched, done = set(), set()
        with open(transcript_path, encoding="utf-8") as f:
            for line in f:
                if "<task-notification>" in line:
                    done.update(re.findall(r"<tool-use-id>\s*([^<\s]+?)\s*<\\?/tool-use-id>", line))
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
        return False


def main():
    d = json.load(sys.stdin)
    if d.get("stop_hook_active"):
        return
    if background_outstanding(d.get("transcript_path")):
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
