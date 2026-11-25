"""Git guard (PreToolUse on Bash / PowerShell): other sessions edit this
tree at the same time, so blanket git commands are blocked (exit 2, the
reason goes back to the session). A plain `git commit` passes through (the
normal permission prompt still applies) and gets a note listing the
unstaged files that are staying out of it; paths matching the project's
`quiet_dirty` globs (.claude/project/file-guard.json) are counted in one
item instead of listed.

Also enforces the owner-only path to `main`/origin: the owner lands
branches with `py -3 tools/try.py <branch> --commit`, which pushes main
once it landed. Sessions never push (except a cloud session pushing its
own non-main branch), never merge into `main`, never delete a branch or
remove a worktree (tools/cleanup.py does both once a branch has landed),
and never run `gh pr merge`.

`tools/try.py <branch> --commit` (landing a branch on main) runs only on
the owner's OK: the owner's latest prompt in the transcript must say
merge or land (and not "don't merge"). Subagents and unattended
(`AUTOPLAN=1`) sessions are always refused; the owner lands those runs.
A `git commit` onto `main` itself (shared mode) follows the same rule: the
owner's latest prompt must say commit, merge or land.

In the main checkout (shared mode), `git checkout` / `git switch` are also
refused: the owner's GitHub Desktop and other sessions rely on it staying
on `main`.

`git add` naming a path listed in `<session dir>/foreign-paths.json`
(written by session-start.py in shared mode: paths already uncommitted
when the session started) is refused too, so a session can't sweep up
another session's edits by path even when it avoids the blanket patterns
below.

Every rule below matches against the command with the inside of quoted
strings masked, so a commit message or search string never trips a rule.

Never blocks on its own failure: any error exits 0.
"""
import datetime
import fnmatch
import json
import os
import re
import shlex
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from guard_config import load_config, matches_any, quiet_globs, quiet_line  # noqa: E402
except ImportError as e:  # an older guard_config.py: this guard cannot run, the others still do
    sys.stderr.write("git-guard.py: guard_config.py is older than this file (%s): guard off\n" % e)
    sys.exit(0)

QUOTED = re.compile(r'"[^"]*"|\'[^\']*\'')
# a quote that follows these is code for another shell, not text
CODE_ARG = re.compile(
    r"(?:\b(?:ba|z|da|k)?sh\s+(?:-\w+\s+)*-\w*c|\b(?:powershell|pwsh)(?:\.exe)?\s+(?:-\w+\s+)*-(?:command|c)"
    r"|\bcmd(?:\.exe)?\s+/[ck]|\beval)\s*$", re.I)


def mask_quotes(cmd: str) -> str:
    """The command with the inside of every quoted string replaced by x's of the
    same length, so rules never match message or search text and match
    positions still line up with the original command."""
    def mask(m):
        if CODE_ARG.search(cmd[:m.start()]):
            return m.group(0)  # code handed to another shell: check it as command text
        return m.group(0)[0] + "x" * (len(m.group(0)) - 2) + m.group(0)[-1]
    return QUOTED.sub(mask, cmd)


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
# merge, branch deletion, worktree removal) or because whether they block
# depends on the command's context (env var, mentioned branch, current
# branch), not the pattern alone.
GH_MERGE_RE = re.compile(r"\bgh\s+pr\s+merge\b")
BRANCH_DELETE_RE = re.compile(
    r"\bgit\b[^|;&\n]*\s(branch\s+(-d|-D|--delete)\b|push\s+\S+\s+--delete\b)")
WORKTREE_REMOVE_RE = re.compile(r"\bgit\s+worktree\s+remove\b")
PUSH_RE = re.compile(r"\bgit\b[^|;&\n]*\spush\b")
MERGE_RE = re.compile(r"\bgit\b[^|;&\n]*\smerge\b")
MERGE_BASE_RE = re.compile(r"\bmerge-base\b")
CHECKOUT_RE = re.compile(r"\bgit\b[^|;&\n]*\s(checkout|switch)\b")

TARGET_RE = re.compile(r"^\+?(?:[^:\s]*:)?(?:refs/heads/)?(?:main|master)$")


def pushes_main(bare: str, m: re.Match) -> bool:
    """True when the push names main or master as a target (main, HEAD:main,
    +main, refs/heads/main), not merely a branch whose name contains main."""
    tail = re.split(r"[|;&\n]", bare[m.end():], maxsplit=1)[0]
    for tok in tail.split():
        if tok.startswith("-"):
            continue
        if TARGET_RE.match(tok):
            return True
    return False


LAND_RE = re.compile(r"\btry\.py\b[^|;&\n]*\s--commit\b")
# read-only dry run: the RAW command must be nothing but python, try.py and plain tokens
DRY_RE = re.compile(r"[ \t]*(py([ \t]+-3)?|python3?(\.exe)?)[ \t]+[\w./:\\-]*try\.py([ \t]+[\w./:@=-]+)*[ \t]*")
PLAIN_RE = re.compile(r"[ -~\t]*")  # printable ASCII, space, tab: no newline, CR or VT


def is_dry_run(cmd: str) -> bool:
    return (bool(PLAIN_RE.fullmatch(cmd)) and bool(DRY_RE.fullmatch(cmd))
            and {"--commit", "--dry-run"} <= set(re.split(r"[ \t]+", cmd)))


LAND_OK_RE = re.compile(r"\b(merge|land)\b|--commit", re.I)
LAND_NO_RE = re.compile(
    r"\b(don'?t|do not|not yet|never|no|wait|hold)\b[^.\n]{0,25}\b(merge|land)", re.I)
# a commit straight onto main (shared mode) also waits for the owner's word
COMMIT_RE = re.compile(r"\bgit\b[^|;&\n]*\scommit(?![-\w])")
COMMIT_OK_RE = re.compile(r"\b(commit|merge|land)\b", re.I)
COMMIT_NO_RE = re.compile(
    r"\b(don'?t|do not|not yet|never|no|wait|hold)\b[^.\n]{0,25}\b(commit|merge|land)", re.I)


NOT_OWNER = ("<task-notification>", "[SYSTEM NOTIFICATION", "Another Claude session sent a message",
             "<agent-message", "[Subagent hand-back]", "<side-sessions-event>", "<ci-monitor-event>")


def owner_prompts(transcript_path: str):
    """Yield (text, timestamp) of the human prompts in the transcript, newest
    first (not tool results, not injected meta entries); timestamp is "" when
    the entry has none."""
    try:
        with open(transcript_path, "rb") as f:
            f.seek(0, 2)
            size = f.tell()
            f.seek(max(0, size - 4_000_000))
            lines = f.read().decode("utf-8", "replace").splitlines()
    except OSError:
        return
    for line in reversed(lines):
        try:
            e = json.loads(line)
        except ValueError:
            continue
        if e.get("type") != "user" or e.get("isMeta"):
            continue
        content = (e.get("message") or {}).get("content")
        if isinstance(content, str):
            text = content
        elif isinstance(content, list):
            if any(isinstance(b, dict) and b.get("type") == "tool_result" for b in content):
                continue
            text = " ".join(b.get("text", "") for b in content
                            if isinstance(b, dict) and b.get("type") == "text")
        else:
            continue
        # not the owner's: relayed sessions, notifications, hand-backs
        if any(mk in text for mk in NOT_OWNER):
            continue
        origin = e.get("origin")
        if isinstance(origin, dict) and origin.get("kind") != "human":
            continue
        # drop injected reminders and pastes so only the owner's own words count
        text = re.sub(r"<system-reminder>.*?</system-reminder>|<pasted_content\b[^>]*>.*?</pasted_content>",
                      " ", text, flags=re.S)
        if text.strip():
            yield text, str(e.get("timestamp") or "")


def last_owner_prompt(transcript_path: str) -> str:
    """Text of the newest human prompt in the transcript, or "" when none is found."""
    return next((t for t, _ in owner_prompts(transcript_path)), "")


NEG_RE = re.compile(r"\b(don'?t|do not|not|never|no|wait|hold|stop|cancel|abort|undo|revert|later)\b", re.I)
LANDWORD_RE = re.compile(r"\b(land\w*|merge\w*)\b", re.I)
TOKEN_RE = re.compile(r"[\w./-]+")
FILLER = {"yet", "it", "this", "that", "now", "anything", "please", "the", "a", "just", "again"}
ORDER_RE = re.compile(r"\bland\s+[\"'`]?([\w./-]+)", re.I)
TRY_BRANCH_RE = re.compile(r"\btry\.py\s+(?:-\S+\s+)*([^\s-][^\s]*)")


class OriginDown(Exception):
    """origin could not be fetched in time."""


def _origin_git(cwd, *args):
    """Run git against origin: 8 s at most, no pipes, no prompt and the whole
    process tree killed on a timeout (on Windows a plain kill leaves
    git-remote-https and the credential helper running). Returns the exit
    code; raises OriginDown on a timeout."""
    env = dict(os.environ, GIT_TERMINAL_PROMPT="0", GCM_INTERACTIVE="never")
    p = subprocess.Popen(
        ["git", "-c", "credential.interactive=never", "-c", "http.lowSpeedLimit=1000",
         "-c", "http.lowSpeedTime=5", *args],
        cwd=cwd, env=env, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
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


def fetch_origin(cwd, branch):
    """One fetch of `branch` from origin. A failed fetch is fine when origin
    answers that it has no such branch (a local-only branch, as try.py lands);
    anything else raises OriginDown."""
    if _origin_git(cwd, "fetch", "origin", branch) != 0:
        if _origin_git(cwd, "ls-remote", "--exit-code", "origin", "refs/heads/" + branch) != 2:
            raise OriginDown()


def resolve_landing(name: str, cwd, fetch=False):
    """(branch, ref) as tools/try.py resolve() picks them: ref is origin/<branch>
    when only the remote has it or the remote is not behind the local branch,
    else the local branch; ("", "") when neither exists. With `fetch`, the
    chosen candidate is fetched once first (raises OriginDown on failure)."""
    def ok(*a, t=10):
        return subprocess.run(["git", *a], cwd=cwd, capture_output=True, timeout=t).returncode == 0
    if name.startswith("origin/"):
        name = name[len("origin/"):]
    cands = [name] + (["claude/" + name, "worktree-" + name] if "/" not in name else [])
    for c in cands:
        local = ok("rev-parse", "--verify", "--quiet", "refs/heads/" + c)
        remote = ok("rev-parse", "--verify", "--quiet", "refs/remotes/origin/" + c)
        if not local and not remote:
            continue
        if fetch:
            fetch_origin(cwd, c)
            remote = ok("rev-parse", "--verify", "--quiet", "refs/remotes/origin/" + c)
        if local and (not remote or ok("merge-base", "--is-ancestor", "origin/" + c, c)):
            return c, c
        return c, "origin/" + c
    return "", ""


def standing_order(d: dict, cmd: str) -> bool:
    """True when an owner-typed message in this window (any age) says `land <name>`
    with a name matching the branch this command lands (the branch, its short
    name or its board row name), and the order is newer than the committer date
    of `git merge-base main <branch>` (a landed branch spends its order).
    Fails closed on anything unreadable."""
    try:
        m = TRY_BRANCH_RE.search(cmd)
        if not m:
            return False
        branch = m.group(1).strip("\"'")
        branch, ref = resolve_landing(branch, d.get("cwd") or None, fetch=True)
        if not ref:
            return False
        names = {branch.lower(), re.sub(r"^claude/", "", branch).lower(), branch.rsplit("/", 1)[-1].lower()}
        cwd = d.get("cwd") or None

        def git(*a):
            r = subprocess.run(["git", *a], cwd=cwd, capture_output=True, text=True, timeout=10)
            return r.stdout.strip() if r.returncode == 0 else ""
        common = git("rev-parse", "--path-format=absolute", "--git-common-dir")
        bf = os.environ.get("BOARD_FILE") or (common and os.path.join(os.path.dirname(common), ".claude", "board.json"))
        row_names = set()
        if bf and os.path.exists(bf):
            with open(bf, encoding="utf-8") as f:
                for r in (json.load(f).get("rows") or {}).values():
                    if r.get("name"):
                        row_names.add(str(r["name"]).lower())
                        if r.get("branch") == branch:
                            names.add(str(r["name"]).lower())
        base = git("merge-base", "main", ref)
        spent = int(git("log", "-1", "--format=%ct", base)) if base else None
        if spent is None:
            return False
        for text, ts in owner_prompts(d.get("transcript_path") or ""):
            said = [n.rstrip(".,;:!?").lower() for n in ORDER_RE.findall(text)]
            tokens = {t.rstrip(".,;:!?").lower() for t in TOKEN_RE.findall(text)}
            negative = bool(NEG_RE.search(text))
            if names & tokens:  # the newest message about this branch decides
                if negative or not any(n in names for n in said):
                    return False
                when = datetime.datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp()
                return when > spent
            if LANDWORD_RE.search(text) and negative and not [
                    n for n in said if n not in FILLER and n not in names
                    and n not in ("main", "origin/main") and resolve_landing(n, cwd)[0] != "main"
                    and (n in row_names or resolve_landing(n, cwd)[1])]:
                return False  # a general "cancel the landing" is a no
            # anything else (other branches, other topics): keep walking
    except OriginDown:
        raise
    except Exception:
        pass
    return False


def landing_refusal(d: dict, cmd: str = "") -> str:
    """Why this session may not run try.py --commit now, or "" when the owner OK'd it."""
    if os.environ.get("AUTOPLAN") == "1":
        return ("an unattended plan run never lands; the owner lands the "
                "finished branch after the Stage done report")
    tp = d.get("transcript_path") or ""
    if os.path.basename(os.path.dirname(os.path.normpath(tp))) == "subagents":
        return "a subagent never lands a branch"
    said = last_owner_prompt(tp)
    if LAND_OK_RE.search(said) and not LAND_NO_RE.search(said):
        return ""
    try:
        if standing_order(d, cmd):
            return ""
    except OriginDown:
        return ("origin could not be reached (fetch failed or took over 8 s); "
                "the landing needs origin to push main. Run the command "
                "again when the network is back: " + cmd.strip())
    return ("landing on main waits for the owner's OK: their latest message "
            "in THIS window must say merge or land, or a message he typed "
            "earlier in THIS window must say \"land <this branch's name>\" "
            "(newer than the branch's last landing). In a coordinator window, "
            "run the command yourself once the owner types \"land <name>\" "
            "here; never relay \"land it\" to a sub-chat (its guard does not "
            "see this window's messages). Otherwise give the owner this exact "
            "command line to run: " + cmd.strip())


def main_commit_refusal(d: dict) -> str:
    """Why this session may not commit straight onto main now, or "" when the
    owner's latest message says commit, merge or land (owner, 2026-10-02: a
    main-checkout chat committed onto main while a worktree run was mid-way)."""
    if os.environ.get("AUTOPLAN") == "1":
        return "an unattended plan run never commits onto main"
    tp = d.get("transcript_path") or ""
    if os.path.basename(os.path.dirname(os.path.normpath(tp))) == "subagents":
        return "a subagent never commits onto main"
    said = last_owner_prompt(tp)
    if COMMIT_OK_RE.search(said) and not COMMIT_NO_RE.search(said):
        return ""
    return ("a commit onto main waits for the owner's OK: their latest message "
            "must say commit, merge or land. Leave the change uncommitted, end "
            "with the report, and under Commit tell the owner to reply "
            "\"commit it\"")


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


def command_cwd(cmd: str, cwd: str, match: re.Match) -> str:
    # directory the matched `git ...` command in cmd actually runs in: its
    # own `-C <path>`, else the last `cd <path>` before it, else cwd
    seg = cmd[match.start():match.end()]
    c_match = re.search(r'-C\s+(?:' + PATH_RE + r')', seg)
    if c_match:
        path = c_match.group(1) or c_match.group(2) or c_match.group(3)
        return resolve_path(path, cwd)
    cd_matches = list(re.finditer(r'\bcd\s+(?:' + PATH_RE + r')', cmd[:match.start()]))
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
        f"Blocked by .claude/hooks/git-guard.py: {why}. The owner lands "
        "branches with tools/try.py --commit, which pushes main itself. "
        "If the user explicitly asked for this command, ask them to run "
        "it themselves.\n")
    sys.exit(2)


def session_dir(transcript_path: str) -> str:
    p = os.path.normpath(transcript_path)
    if os.path.basename(os.path.dirname(p)) == "subagents":
        return os.path.dirname(os.path.dirname(p))
    return os.path.splitext(p)[0]


def foreign_paths(d: dict) -> list[str]:
    try:
        fp = os.path.join(session_dir(d["transcript_path"]), "foreign-paths.json")
        with open(fp, encoding="utf-8") as f:
            return json.load(f)
    except (KeyError, OSError, ValueError):
        return []


def add_targets(cmd: str) -> list[str]:
    targets = []
    for m in re.finditer(r"\bgit\s+add\b([^|;&\n]*)", cmd):
        try:
            tokens = shlex.split(m.group(1), posix=True)
        except ValueError:
            tokens = m.group(1).split()
        targets += [t for t in tokens if not t.startswith("-")]
    return targets


def normalize_target(target: str, cwd: str) -> str:
    path = resolve_path(target, cwd)
    if os.path.isabs(path):
        top = git("rev-parse", "--show-toplevel", cwd=cwd)
        if top:
            try:
                path = os.path.relpath(path, top)
            except ValueError:
                pass
    path = path.replace("\\", "/")
    if path.startswith("./"):
        path = path[2:]
    return path


def foreign_matches(cmd: str, cwd: str, d: dict) -> list[str]:
    foreign = foreign_paths(d)
    if not foreign:
        return []
    targets = [normalize_target(t, cwd) for t in add_targets(cmd)]
    matches = []
    for f in foreign:
        for t in targets:
            if f == t or f.startswith(t.rstrip("/") + "/") or fnmatch.fnmatch(f, t) or (f.endswith("/") and t.startswith(f)):
                matches.append(f)
                break
    return matches


def main():
    d = json.load(sys.stdin)
    cmd = (d.get("tool_input") or {}).get("command") or ""
    if "git" not in cmd and "gh" not in cmd and "try.py" not in cmd:
        return
    bare = mask_quotes(cmd)
    if LAND_RE.search(bare) and not is_dry_run(cmd):
        why = landing_refusal(d, cmd)
        if why:
            sys.stderr.write(f"Blocked by .claude/hooks/git-guard.py: {why}.\n")
            sys.exit(2)
    for pat, why in BLOCK:
        if re.search(pat, bare):
            sys.stderr.write(
                f"Blocked by .claude/hooks/git-guard.py: {why}. Another "
                "session may have uncommitted edits in this tree. Stage your "
                "own files by path (git add <file> ...) and commit those. If "
                "the user explicitly asked for this command, ask them to run "
                "it themselves.\n")
            sys.exit(2)

    matches = foreign_matches(cmd, d.get("cwd") or os.getcwd(), d)
    if matches:
        sys.stderr.write(
            f"Blocked by .claude/hooks/git-guard.py: {', '.join(matches)} "
            "already had uncommitted edits when this session started (the "
            "owner's or another session's). Stage only the files your specs "
            "changed, by path. If the user explicitly asked to commit them, "
            "ask them to run it themselves.\n")
        sys.exit(2)

    if GH_MERGE_RE.search(bare):
        deny("only the owner merges")

    if BRANCH_DELETE_RE.search(bare):
        deny("branches are deleted only by tools/cleanup.py (landed on main and idle); run that instead")

    if WORKTREE_REMOVE_RE.search(bare):
        deny("worktrees are removed only by tools/cleanup.py (landed on main and idle) or by archiving the session in the app")

    m = PUSH_RE.search(bare)
    if m:
        remote_ok = (os.environ.get("CLAUDE_CODE_REMOTE") == "true"
                     and not pushes_main(bare, m))
        if not remote_ok:
            deny("only the owner pushes (GitHub Desktop)")

    if (MERGE_RE.search(bare) and not MERGE_BASE_RE.search(bare)
            and "--abort" not in bare):
        cwd = d.get("cwd") or os.getcwd()
        m = MERGE_RE.search(bare)
        mcwd = command_cwd(cmd, cwd, m)
        if not os.path.isdir(mcwd):
            mcwd = cwd
        if git("branch", "--show-current", cwd=mcwd) == "main":
            deny("never merge into main; tools/try.py --commit lands branches")

    m = COMMIT_RE.search(bare)
    if m:
        cwd = d.get("cwd") or os.getcwd()
        ccwd = command_cwd(cmd, cwd, m)
        if not os.path.isdir(ccwd):
            ccwd = cwd
        if git("branch", "--show-current", cwd=ccwd) in ("main", "master"):
            why = main_commit_refusal(d)
            if why:
                sys.stderr.write(f"Blocked by .claude/hooks/git-guard.py: {why}.\n")
                sys.exit(2)

    m = CHECKOUT_RE.search(bare)
    if m:
        cwd = d.get("cwd") or os.getcwd()
        wd = command_cwd(cmd, cwd, m)
        if not os.path.isdir(wd):
            wd = cwd
        common = git("rev-parse", "--path-format=absolute", "--git-common-dir", cwd=wd)
        top = git("rev-parse", "--show-toplevel", cwd=wd)
        main_checkout = (common and top
                          and os.path.normcase(os.path.abspath(os.path.dirname(common)))
                          == os.path.normcase(os.path.abspath(top)))
        if main_checkout and os.environ.get("CLAUDE_CODE_REMOTE") != "true":
            deny("the main checkout stays on main (GitHub Desktop and other "
                 "sessions use it); branch work belongs in a worktree session")

    # The note is computed before the command runs, so skip it when the
    # command stages files itself (the list would be stale).
    if re.search(r"\bgit\s+commit\b", bare) and not re.search(r"\bgit\s+add\b", bare):
        unstaged = git("diff", "--name-only")
        untracked = git("ls-files", "--others", "--exclude-standard")
        left = [l for l in (unstaged + "\n" + untracked).splitlines() if l]
        # Paths matching quiet_dirty are counted, not listed.
        top = git("rev-parse", "--show-toplevel")
        quiet = quiet_globs(load_config(top)) if top else []
        shown = [l for l in left if not (quiet and matches_any(l, quiet))]
        if len(shown) < len(left):
            shown.append(quiet_line(len(left) - len(shown), quiet))
        if left:
            note = ("Unstaged files staying out of this commit (foreign "
                    "edits unless you made them; if yours, stage them by "
                    "path first): " + ", ".join(shown))
            print(json.dumps({"hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "additionalContext": note}}))


try:
    main()
except SystemExit:
    raise
except Exception:
    pass
