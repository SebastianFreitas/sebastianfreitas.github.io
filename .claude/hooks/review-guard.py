"""Review guard (PreToolUse on Bash / PowerShell, main session only): the
rule "over about 150 lines or three files, the reviewer checks the diff
before the commit" (.claude/rules/workflow.md Run step 5) was skipped in
most runs (5 reviewer runs against about 30 landings, several of them
200 to 950 lines; review of 2026-10-01). Now it is decided by this hook,
mechanically, at the commit:

- `tools/try.py <branch> --commit` (worktree landing): the branch's diff
  against local `main` (`main...HEAD`).
- `git commit` (shared and cloud mode, and the branch commits in
  worktree mode): the staged diff; when the same command also runs
  `git add`, the whole tree against HEAD plus untracked files.

Paths under `.claude/`, `*.md` files (docs, specs, MAP rows) and the
project's `generated` globs (.claude/project/file-guard.json: written by a
tool, not by hand) do not count. Over LINES changed lines or FILES files, the command is refused
unless this session has already run the `reviewer` subagent: the
context-watch ledger (`<session dir>/context-watch.jsonl`, written on
SubagentStop) has an entry whose agent_type is `reviewer`. For a commit
a review in an earlier window does not count: a fresh reviewer run is
cheap (medium effort, fresh context) and a stale one is worthless. A
landing also passes on a tip recorded in `.claude/reviewed.json`.

Map check, before the size check, on `git commit` only (a landing's
commits were checked when they were made): a source file the commit adds
or renames whose base name the project's map never mentions, or a map
line over MAP_WIDTH characters when the commit touches the map (the Grep
tool prints "[Omitted long matching line]" instead of such a line; seen
in all four Portfolio navigation trials of 2026-10-02). Refused once per
problem set: the same problems on the next try pass, so a session that
judges a row unneeded is never trapped. The map is .claude/MAP.md unless
file-guard.json's `map` says otherwise; `generated: true` skips the check
(the generator writes the rows).

A `git commit` whose first -m message starts with `Sketch:` (case-sensitive,
also the heredoc form) skips the reviewer demand only: never for a landing,
never with -F, and the map check still applies.

Exceptions: subagents (agent_id set: implementer-wt commits on its own
branch); a window past its context line (context-watch's state file says
so), which commits what it has and hands off, with the review listed
under Next. Never fails the hook: any error allows the command (exit 0).
"""
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from guard_config import (generated_globs, load_config, map_rule,  # noqa: E402
                              matches_any, source_rule)
except ImportError as e:  # an older guard_config.py: this guard cannot run, the others still do
    sys.stderr.write("review-guard.py: guard_config.py is older than this file (%s): guard off\n" % e)
    sys.exit(0)

LINES = 150
FILES = 3
SKIP_PREFIXES = (".claude/",)
SKIP_SUFFIXES = (".md",)
MAP_WIDTH = 300

LAND_RE = re.compile(r"\btry\.py\b[^|;&\n]*\s--commit\b")
COMMIT_RE = re.compile(r"\bgit\b[^|;&\n]*\scommit\b")
ADD_RE = re.compile(r"\bgit\s+add\b")
# first -m value: optional quote, optional `$(cat <<'EOF'` line, then "Sketch:"
MSG_RE = re.compile(r"""(?:^|\s)(?:-m|--message)(?:\s+|=)["']?(?:\$\(cat\s+<<-?\s*['"]?\w+['"]?[ \t]*\r?\n)?\s*(Sketch:)?""")
FILE_RE = re.compile(r"(?:^|\s)(?:-F|--file)\b")


def git(*args, cwd=None):
    try:
        return subprocess.run(["git", *args], capture_output=True, text=True,
                              timeout=15, cwd=cwd).stdout
    except Exception:
        return ""


def session_dir(transcript_path):
    p = os.path.normpath(transcript_path)
    if os.path.basename(os.path.dirname(p)) == "subagents":
        return os.path.dirname(os.path.dirname(p))
    return os.path.splitext(p)[0]


def counts(path, skip_globs):
    return not (path.startswith(SKIP_PREFIXES) or path.endswith(SKIP_SUFFIXES)
                or matches_any(path, skip_globs))


def numstat(skip_globs, *diff_args):
    files, lines = set(), 0
    for row in git("diff", "--numstat", *diff_args).splitlines():
        parts = row.split("\t")
        if len(parts) != 3:
            continue
        add, rem, path = parts
        if " => " in path:
            path = path.split(" => ", 1)[1].rstrip("}")
        if not counts(path, skip_globs):
            continue
        files.add(path)
        if add.isdigit() and rem.isdigit():
            lines += int(add) + int(rem)
    return files, lines


def untracked(skip_globs):
    files, lines = set(), 0
    for path in git("ls-files", "--others", "--exclude-standard").splitlines():
        path = path.strip()
        if not path or not counts(path, skip_globs):
            continue
        files.add(path)
        try:
            with open(path, "rb") as f:
                lines += sum(1 for _ in f)
        except OSError:
            pass
    return files, lines


def change_size(cmd):
    """(files, lines, what) of the change this command would land, or None."""
    top = git("rev-parse", "--show-toplevel").strip()
    skip = generated_globs(load_config(top)) if top else []
    if LAND_RE.search(cmd):
        if not git("rev-parse", "--verify", "--quiet", "main").strip():
            return None
        files, lines = numstat(skip, "main...HEAD")
        return files, lines, "the branch against main"
    if COMMIT_RE.search(cmd):
        if ADD_RE.search(cmd):
            files, lines = numstat(skip, "HEAD")
            uf, ul = untracked(skip)
            return files | uf, lines + ul, "the tree against HEAD"
        files, lines = numstat(skip, "--cached")
        return files, lines, "the staged diff"
    return None


def is_sketch(cmd):
    """True for a `git commit` whose first -m message starts with "Sketch:"
    (never for a landing, never with -F or a message that is not read)."""
    if LAND_RE.search(cmd) or not COMMIT_RE.search(cmd) or FILE_RE.search(cmd):
        return False
    m = MSG_RE.search(cmd)
    return bool(m and m.group(1))


def added_paths(cmd):
    """Paths the commit adds or renames to (git commit only)."""
    if not COMMIT_RE.search(cmd) or LAND_RE.search(cmd):
        return []
    args = ["HEAD"] if ADD_RE.search(cmd) else ["--cached"]
    out = []
    for row in git("diff", "--name-status", "--diff-filter=AR", *args).splitlines():
        parts = row.split("\t")
        if len(parts) >= 2:
            out.append(parts[-1].strip())
    if ADD_RE.search(cmd):
        out += [p.strip() for p in git("ls-files", "--others",
                                       "--exclude-standard").splitlines() if p.strip()]
    return out


def map_problems(cmd):
    top = git("rev-parse", "--show-toplevel").strip()
    if not top:
        return []
    cfg = load_config(top)
    rule = map_rule(top, cfg)
    if rule is None or rule[1]:
        return []
    map_path, _ = rule
    with open(os.path.join(top, map_path), encoding="utf-8", errors="replace") as f:
        text = f.read()
    suffixes, source_files = source_rule(cfg)
    gen = generated_globs(cfg)
    problems = []
    added = added_paths(cmd)
    for path in added:
        if path.startswith(SKIP_PREFIXES) or matches_any(path, gen):
            continue
        if os.path.splitext(path)[1].lower() not in suffixes and path not in source_files:
            continue
        if os.path.basename(path) not in text:
            problems.append(f"{path} has no row in {map_path}")
    staged = git("diff", "--name-only", *(["HEAD"] if ADD_RE.search(cmd) else ["--cached"]))
    if map_path in staged.splitlines() or map_path in added:
        long = [i for i, line in enumerate(text.splitlines(), 1) if len(line) > MAP_WIDTH]
        if long:
            shown = ", ".join(str(i) for i in long[:8])
            problems.append(f"{map_path} has {len(long)} lines over {MAP_WIDTH} "
                            f"characters (lines {shown}); split them: the Grep tool "
                            "hides long lines")
    return problems


def refused_before(transcript_path, key):
    """True when this exact problem set was already refused once in this
    session; otherwise record it and return False."""
    try:
        sp = os.path.join(session_dir(transcript_path), "review-guard.map.json")
        try:
            with open(sp, encoding="utf-8") as f:
                seen = json.load(f).get("refused") or []
        except (OSError, ValueError):
            seen = []
        if key in seen:
            return True
        os.makedirs(os.path.dirname(sp), exist_ok=True)
        with open(sp, "w", encoding="utf-8") as f:
            json.dump({"refused": (seen + [key])[-20:]}, f)
    except OSError:
        return True
    return False


def reviewed(transcript_path):
    try:
        lp = os.path.join(session_dir(transcript_path), "context-watch.jsonl")
        with open(lp, encoding="utf-8") as f:
            for line in f:
                if '"reviewer' not in line:
                    continue
                try:
                    if json.loads(line).get("agent_type") in ("reviewer", "reviewer-light"):
                        return True
                except ValueError:
                    pass
    except OSError:
        pass
    return False


TRY_BRANCH_RE = re.compile(r"\btry\.py\s+(?:-\S+\s+)*([^\s-][^\s]*)")


class OriginDown(Exception):
    """origin could not be fetched in time."""


def _origin_git(*args):
    """Run git against origin: 8 s at most, no pipes, no prompt, the whole process
    tree killed on a timeout (on Windows a plain kill leaves the helpers
    running). Returns the exit code; raises OriginDown on a timeout."""
    env = dict(os.environ, GIT_TERMINAL_PROMPT="0", GCM_INTERACTIVE="never")
    p = subprocess.Popen(
        ["git", "-c", "credential.interactive=never", "-c", "http.lowSpeedLimit=1000",
         "-c", "http.lowSpeedTime=5", *args],
        env=env, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL)
    try:
        return p.wait(timeout=8)
    except subprocess.TimeoutExpired:
        if os.name == "nt":
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(p.pid)],
                           stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                           stderr=subprocess.DEVNULL, timeout=5)
        p.kill()
        p.wait(timeout=5)
        raise OriginDown()


def fetch_origin(branch):
    """One fetch of `branch`. A failed fetch is fine when origin answers that it
    has no such branch (a local-only branch, as try.py lands); anything else
    raises OriginDown."""
    if _origin_git("fetch", "origin", branch) != 0:
        if _origin_git("ls-remote", "--exit-code", "origin", "refs/heads/" + branch) != 2:
            raise OriginDown()


def reviewed_elsewhere(cmd):
    """True when the branch this landing names was reviewed at its current tip
    (or at a tip it differs from only by merges of main) by a reviewer run in
    any window of this repo (<main checkout>/.claude/reviewed.json)."""
    try:
        m = TRY_BRANCH_RE.search(cmd)
        if not m:
            return False
        branch = m.group(1).strip("\"'")
        common = git("rev-parse", "--path-format=absolute", "--git-common-dir").strip()
        tip = ""
        # as tools/try.py resolve() does: the local branch, or origin/<branch> when
        # only the remote has it or the remote is ahead; that ref is what lands
        if branch.startswith("origin/"):
            branch = branch[len("origin/"):]
        cands = [branch] + (["claude/" + branch, "worktree-" + branch] if "/" not in branch else [])
        for cand in cands:
            local = git("rev-parse", "--verify", "--quiet", "refs/heads/" + cand).strip()
            remote = git("rev-parse", "--verify", "--quiet", "refs/remotes/origin/" + cand).strip()
            if not local and not remote:
                continue
            fetch_origin(cand)
            remote = git("rev-parse", "--verify", "--quiet", "refs/remotes/origin/" + cand).strip()
            branch = cand
            behind = local and remote and subprocess.run(
                ["git", "merge-base", "--is-ancestor", remote, local],
                capture_output=True, timeout=15).returncode != 0
            tip = remote if (remote and (not local or behind)) else local
            break
        if not (common and tip):
            return False
        with open(os.path.join(os.path.dirname(common), ".claude", "reviewed.json"), encoding="utf-8") as f:
            data = json.load(f)
        seen = data.get(branch) or []
        trees = set(data.get(branch + "#trees") or [])
        if trees:
            # a review before the commit: some commit holds the tree it saw
            for line in git("log", "--format=%H %T", "main.." + tip).splitlines():
                c, _, t = line.partition(" ")
                if t in trees and not git("rev-list", "--no-merges", c + ".." + tip, "^main").strip():
                    return True
        for r in seen:
            if r == tip:
                return True
            ok = subprocess.run(["git", "merge-base", "--is-ancestor", r, tip], capture_output=True, timeout=15)
            if ok.returncode == 0 and not git("rev-list", "--no-merges", r + ".." + tip, "^main").strip():
                return True
    except OriginDown:
        raise
    except Exception:
        pass
    return False


def past_line(transcript_path):
    try:
        sp = os.path.join(session_dir(transcript_path), "context-watch.state.json")
        with open(sp, encoding="utf-8") as f:
            return (json.load(f).get("main") or {}).get("tier", 0) >= 2
    except (OSError, ValueError, AttributeError):
        return False


def main():
    d = json.load(sys.stdin)
    if d.get("agent_id"):
        return
    cmd = (d.get("tool_input") or {}).get("command") or ""
    if "commit" not in cmd:
        return
    os.chdir(d.get("cwd") or os.getcwd())
    tp = d.get("transcript_path") or ""
    try:
        problems = map_problems(cmd)
    except Exception:
        problems = []
    if problems and tp and not past_line(tp) and not refused_before(tp, " | ".join(problems)):
        sys.stderr.write(
            "Blocked by .claude/hooks/review-guard.py (map check, once): "
            + "; ".join(problems) + ". A new file, moved function or new export "
            "gets its map row in the same commit, and no map line passes "
            f"{MAP_WIDTH} characters (.claude/rules/workflow.md Token rules). Fix "
            "and stage the map, or run the same command again if no row is "
            "needed.\n")
        sys.exit(2)
    size = change_size(cmd)
    if size is None:
        return
    files, lines, what = size
    if lines <= LINES and len(files) <= FILES:
        return
    if tp and reviewed(tp):
        return
    try:
        if LAND_RE.search(cmd) and reviewed_elsewhere(cmd):
            return
    except OriginDown:
        sys.stderr.write(
            "Blocked by .claude/hooks/review-guard.py: origin could not be "
            "reached (fetch failed or took over 8 s); the landing needs origin "
            "to push main. Run the command again when the network is back.\n")
        sys.exit(2)
    if is_sketch(cmd):
        return
    if tp and past_line(tp):
        print(json.dumps({"hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "additionalContext": (
                f"Review guard: {len(files)} files, {lines} lines in {what} "
                "and no reviewer run in this window; allowed because this "
                "window is past its context line. Put 'review due' first in "
                "the handoff's Next.")}}))
        return
    if LAND_RE.search(cmd):
        sys.stderr.write(
            f"Blocked by .claude/hooks/review-guard.py: {len(files)} files and "
            f"{lines} changed lines in {what} and no reviewer is recorded for "
            "this branch's current tip. A coordinator does not run a reviewer: "
            "the chat that built the branch runs it. Send that chat a message "
            "asking for the review, and land after it has run.\n")
        sys.exit(2)
    sys.stderr.write(
        f"Blocked by .claude/hooks/review-guard.py: {len(files)} files and "
        f"{lines} changed lines in {what} (the rule: over {LINES} lines or "
        f"{FILES} files gets a review) and no reviewer has run in this "
        "window, and none is recorded for this branch's current tip (a landing "
        "also passes when a reviewer in any window saw this tip, or a tip "
        "it differs from only by merges of main). Call the reviewer "
        "subagent (foreground) with the spec "
        "paths and the changed paths; a gap becomes a new spec for an "
        "implementer; then run this command again. For a commit, a "
        "review from an earlier window does not count: run it again, "
        "it is cheap.\n")
    sys.exit(2)


try:
    main()
except SystemExit:
    raise
except Exception:
    pass
