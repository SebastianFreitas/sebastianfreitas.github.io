"""Git guard (PreToolUse on Bash / PowerShell): other sessions edit this
tree at the same time, so blanket git commands are blocked (exit 2, the
reason goes back to the session). A plain `git commit` is allowed and gets
a note listing the unstaged files that are staying out of it.

Never blocks on its own failure: any error exits 0.
"""
import json
import re
import subprocess
import sys

BLOCK = [
    (r"\bgit\s+add\b[^|;&\n]*(\s-A\b|\s--all\b|\s-u\b|\s--update\b|\s\.(\s|$)|\s\*)",
     "blanket 'git add' would stage another session's edits"),
    (r"\bgit\s+commit\b[^|;&\n]*(\s-a\b|\s-am\b|\s--all\b)",
     "'git commit -a' would commit another session's edits"),
    (r"\bgit\s+stash\b(?!\s+list)", "'git stash' would hide another session's edits"),
    (r"\bgit\s+checkout\s+(--|\.)", "'git checkout --' would discard another session's edits"),
    (r"\bgit\s+restore\b(?![^|;&\n]*--staged)", "'git restore' would discard another session's edits"),
    (r"\bgit\s+reset\s+--hard", "'git reset --hard' would discard another session's edits"),
    (r"\bgit\s+clean\b", "'git clean' would delete another session's files"),
    (r"\bgit\s+rebase\b", "rebasing on a shared dirty tree; merge instead"),
    (r"\bgit\s+push\b[^|;&\n]*(\s-f\b|\s--force\b)", "force push"),
]


def git(*args):
    try:
        return subprocess.run(["git", *args], capture_output=True, text=True,
                              timeout=10).stdout.strip()
    except Exception:
        return ""


def main():
    d = json.load(sys.stdin)
    cmd = (d.get("tool_input") or {}).get("command") or ""
    if "git" not in cmd:
        return
    for pat, why in BLOCK:
        if re.search(pat, cmd):
            sys.stderr.write(
                f"Blocked by .claude/hooks/git-guard.py: {why}. Another "
                "session may have uncommitted edits in this tree. Stage your "
                "own files by path (git add <file> ...) and commit those. If "
                "the user explicitly asked for this command, ask them to run "
                "it themselves.\n")
            sys.exit(2)
    # The note is computed before the command runs, so skip it when the
    # command stages files itself (the list would be stale).
    if re.search(r"\bgit\s+commit\b", cmd) and not re.search(r"\bgit\s+add\b", cmd):
        unstaged = git("diff", "--name-only")
        untracked = git("ls-files", "--others", "--exclude-standard")
        left = [l for l in (unstaged + "\n" + untracked).splitlines() if l]
        if left:
            note = ("Unstaged files staying out of this commit (foreign "
                    "edits unless you made them; if yours, stage them by "
                    "path first): " + ", ".join(left))
            print(json.dumps({"hookSpecificOutput": {
                "hookEventName": "PreToolUse", "permissionDecision": "allow",
                "additionalContext": note}}))


try:
    main()
except SystemExit:
    raise
except Exception:
    pass
