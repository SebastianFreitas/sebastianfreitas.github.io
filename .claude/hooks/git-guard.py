"""Git guard (PreToolUse on Bash / PowerShell): other sessions edit this
tree at the same time, so blanket git commands are blocked (exit 2, the
reason goes back to the session). A plain `git commit` passes through (the
normal permission prompt still applies) and gets a note listing the
unstaged files that are staying out of it.

Also enforces the owner-only path to `main`/origin: no session pushes
(except a cloud session pushing its own non-main branch), merges into
`main`, deletes a branch or runs `gh pr merge`. Only the owner's
`tools/try.py --commit` and GitHub Desktop land work on `main`/origin.

Never blocks on its own failure: any error exits 0.
"""
import json
import os
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

# Owner-only path to main/origin: checked separately from BLOCK, either
# because the reason doesn't fit BLOCK's "foreign edits" message (gh pr
# merge, branch deletion) or because whether they block depends on the
# command's context (env var, mentioned branch, current branch), not the
# pattern alone.
GH_MERGE_RE = re.compile(r"\bgh\s+pr\s+merge\b")
BRANCH_DELETE_RE = re.compile(
    r"\bgit\b[^|;&\n]*\s(branch\s+(-d|-D|--delete)\b|push\s+\S+\s+--delete\b)")
PUSH_RE = re.compile(r"\bgit\b[^|;&\n]*\spush\b")
MAIN_RE = re.compile(r"\b(main|master)\b", re.IGNORECASE)
MERGE_RE = re.compile(r"\bgit\b[^|;&\n]*\smerge\b")
MERGE_BASE_RE = re.compile(r"\bmerge-base\b")


PATH_RE = r'"([^"]+)"|\'([^\']+)\'|([^\s;&|]+)'


def resolve_path(path, cwd):
    # normalize a path pulled out of a command: expand ~, convert git-bash
    # style /c/Users/... to C:/Users/... on Windows, resolve relative to cwd
    path = os.path.expanduser(path)
    if os.name == "nt":
        m = re.match(r'^/([A-Za-z])(/.*)?$', path)
        if m:
            path = m.group(1).upper() + ":" + (m.group(2) or "/")
    if not os.path.isabs(path):
        path = os.path.join(cwd, path)
    return path


def merge_cwd(cmd, cwd):
    # directory a `git ... merge ...` in cmd actually runs in: its own
    # `-C <path>`, else the last `cd <path>` before it, else cwd
    m = MERGE_RE.search(cmd)
    if not m:
        return cwd
    seg = cmd[m.start():m.end()]
    c_match = re.search(r'-C\s+(?:' + PATH_RE + r')', seg)
    if c_match:
        path = c_match.group(1) or c_match.group(2) or c_match.group(3)
        return resolve_path(path, cwd)
    cd_matches = list(re.finditer(r'\bcd\s+(?:' + PATH_RE + r')', cmd[:m.start()]))
    if cd_matches:
        cm = cd_matches[-1]
        path = cm.group(1) or cm.group(2) or cm.group(3)
        return resolve_path(path, cwd)
    return cwd


def git(*args, cwd=None):
    try:
        return subprocess.run(["git", *args], capture_output=True, text=True,
                              timeout=10, cwd=cwd).stdout.strip()
    except Exception:
        return ""


def deny(why):
    sys.stderr.write(
        f"Blocked by .claude/hooks/git-guard.py: {why}. Only the owner's "
        "try.py --commit and GitHub Desktop land work on main/origin. If "
        "the user explicitly asked for this command, ask them to run it "
        "themselves.\n")
    sys.exit(2)


def main():
    d = json.load(sys.stdin)
    cmd = (d.get("tool_input") or {}).get("command") or ""
    if "git" not in cmd and "gh" not in cmd:
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

    if GH_MERGE_RE.search(cmd):
        deny("only the owner merges")

    if BRANCH_DELETE_RE.search(cmd):
        deny("the owner deletes branches")

    if PUSH_RE.search(cmd):
        remote_ok = (os.environ.get("CLAUDE_CODE_REMOTE") == "true"
                     and not MAIN_RE.search(cmd))
        if not remote_ok:
            deny("only the owner pushes (GitHub Desktop)")

    if (MERGE_RE.search(cmd) and not MERGE_BASE_RE.search(cmd)
            and "--abort" not in cmd):
        cwd = d.get("cwd") or os.getcwd()
        mcwd = merge_cwd(cmd, cwd)
        if not os.path.isdir(mcwd):
            mcwd = cwd
        if git("branch", "--show-current", cwd=mcwd) == "main":
            deny("never merge into main; the owner's try.py --commit does that")

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
                "hookEventName": "PreToolUse",
                "additionalContext": note}}))


try:
    main()
except SystemExit:
    raise
except Exception:
    pass
