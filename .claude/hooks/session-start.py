"""Session start: prints what a new chat must know before its first move.

1. The branch and whether it is ahead/behind its remote.
2. Edits already in the tree: made by another session, never by this one.
3. The handoff left by the previous chat (.claude/handoff.md), if any.

Plain stdout on SessionStart is added to the session's context.
Never fails the hook: any error exits 0.
"""
import json
import os
import subprocess
import sys


def git(*args):
    try:
        out = subprocess.run(["git", *args], capture_output=True, text=True,
                             timeout=10)
        return out.stdout.strip()
    except Exception:
        return ""


def main():
    d = json.load(sys.stdin)
    root = d.get("cwd") or os.getcwd()
    os.chdir(root)
    lines = []
    head = git("status", "-sb").splitlines()
    if head:
        lines.append(f"SESSION START: {head[0]}")
    dirty = git("status", "--short")
    if dirty:
        lines.append("Edits already in the tree at session start. Another "
                     "session made them, not you: never stage, revert, stash "
                     "or 'clean up' these paths. Stage your own files by path.")
        lines.extend("  " + l for l in dirty.splitlines())
    else:
        lines.append("Tree clean at session start.")
    hand = os.path.join(root, ".claude", "handoff.md")
    if os.path.exists(hand):
        with open(hand, encoding="utf-8", errors="ignore") as f:
            body = f.read().strip()[:8000]
        lines.append("")
        lines.append("HANDOFF from the previous chat (.claude/handoff.md). "
                     "Read it, restate the plan in two lines, continue from "
                     "'Next', and delete the file once absorbed:")
        lines.append(body)
    print("\n".join(lines))


try:
    main()
except Exception:
    pass
