"""Tests for the blocking workflow hooks: git-guard, file-guard, agent-guard,
poll-guard, review-guard and the dispatcher hooks.py, then the prompt and
session hooks: go-check, context-watch, reply-cap, session-start.

    py -3 .claude/hooks/hooks_test.py            run every case
    py -3 .claude/hooks/hooks_test.py -k poll    only cases whose name contains "poll"

Each case feeds one guard the JSON the harness sends and checks that it
refuses (exit 2, or a `permissionDecision: deny|ask` reply) or allows (exit 0,
no such reply). Isolation: every case runs a temp copy of this folder against
a temp project (a fresh `git init` on branch `feature`), a fake session id and
a fake transcript, with AUTOPLAN and CLAUDE_CODE_REMOTE cleared; nothing reads
or writes the real session flags, handoff, specs or git state.

A case marked `xfail` is a guard not doing what its docs say: the reason is
printed, the run still passes, and the guard is left as it is. An xfail that
starts passing fails the run, so the mark gets removed.

Prints one line per case, a summary line; exits 0 only when all pass.
Stdlib only, no network.
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time

# The suite never reads its own stdin: an open pipe or a terminal must not stall it.
sys.stdin = open(os.devnull, "r")

HERE = os.path.dirname(os.path.abspath(__file__))
FIRST_PROMPT = {"type": "user", "message": {"role": "user", "content": "hello"}}


class Ctx:
    """One case's sandbox: hooks copy, project dir, session transcript."""

    def __init__(self, root):
        self.root = root
        self.hooks = os.path.join(root, "hooks")
        self.proj = os.path.join(root, "proj")
        self.transcript = os.path.join(root, "sess", "fake-session-id.jsonl")
        shutil.copytree(HERE, self.hooks, ignore=shutil.ignore_patterns("__pycache__", "hooks_test.py"))
        os.makedirs(self.proj)
        os.makedirs(os.path.dirname(self.transcript))
        self.sh("git", "init", "-q", "-b", "feature")
        self.write_transcript([FIRST_PROMPT])

    def sh(self, *args):
        subprocess.run(list(args), cwd=self.proj, capture_output=True, timeout=30, check=True,
                       stdin=subprocess.DEVNULL)

    def write_transcript(self, entries):
        with open(self.transcript, "w", encoding="utf-8") as f:
            for e in entries:
                f.write(json.dumps(e) + "\n")

    def session_dir(self):
        return os.path.splitext(self.transcript)[0]

    def file(self, rel, text):
        p = os.path.join(self.proj, rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w", encoding="utf-8", newline="\n") as f:
            f.write(text)
        return p

    def payload(self, tool, tool_input, event="PreToolUse", **extra):
        d = {"hook_event_name": event, "session_id": "fake-session-id",
             "transcript_path": self.transcript, "cwd": self.proj,
             "tool_name": tool, "tool_input": tool_input}
        d.update(extra)
        return d

    def run(self, script, payload, args=()):
        env = {k: v for k, v in os.environ.items()
               if k not in ("AUTOPLAN", "CLAUDE_CODE_REMOTE", "CLAUDE_PROJECT_DIR")}
        env["CLAUDE_PROJECT_DIR"] = self.proj
        p = subprocess.run([sys.executable, os.path.join(self.hooks, script), *args],
                           input=payload if isinstance(payload, str) else json.dumps(payload),
                           capture_output=True, text=True, encoding="utf-8",
                           cwd=self.proj, env=env, timeout=30)
        return p.returncode, p.stdout, p.stderr


def refused(res):
    code, out, _ = res
    if code == 2:
        return True
    try:
        j = json.loads(out)
    except ValueError:
        return False
    return (j.get("hookSpecificOutput") or {}).get("permissionDecision") in ("deny", "ask")


def allowed(res):
    return res[0] == 0 and not refused(res)


# ---- cases: (name, expectation, function(ctx) -> result, xfail reason) ----

CASES = []


def case(name, expect, xfail=None):
    def deco(fn):
        CASES.append((name, expect, fn, xfail))
        return fn
    return deco


def bash(guard, cmd, expect, name=None, setup=None, xfail=None, **extra):
    def fn(c):
        if setup:
            setup(c)
        return c.run(guard + ".py", c.payload("Bash", {"command": cmd}, **extra))
    CASES.append(("%s: %s" % (guard, name or cmd), expect, fn, xfail))


# git-guard
bash("git-guard", "git add -A", "refuse")
bash("git-guard", "git add .", "refuse")
bash("git-guard", "git commit -a -m x", "refuse")
bash("git-guard", "git stash", "refuse")
bash("git-guard", "git push --force origin feature", "refuse")
bash("git-guard", "git reset --hard", "refuse")
bash("git-guard", "git push origin feature", "refuse", name="push by a session")
bash("git-guard", "git add js/a.js", "allow", setup=lambda c: c.file("js/a.js", "x\n"))
bash("git-guard", "git commit -m 'git add -A in a message'", "allow", name="blanket text inside a commit message")
bash("git-guard", "git stash list", "allow")
bash("git-guard", "git status", "allow")
bash("git-guard", "py -3 tools/try.py feature --commit", "refuse", name="landing with no owner prompt")
bash("git-guard", "py -3 tools/try.py feature --commit", "refuse", name="landing by a subagent", agent_id="a1")


def _owner_says_merge(c):
    c.write_transcript([FIRST_PROMPT, {"type": "user", "message": {"role": "user", "content": "ok, merge it"}}])


bash("git-guard", "py -3 tools/try.py feature --commit", "allow", name="landing on the owner's merge", setup=_owner_says_merge)


def _owner_says(text, first="coordinator"):
    def setup(c):
        c.write_transcript([{"type": "user", "message": {"role": "user", "content": first}},
                            {"type": "user", "message": {"role": "user", "content": text}}])
    return setup


LAND_CMD = "py -3 C:/x/tools/try.py claude/rex-void-forms-ab12 --commit"
bash("git-guard", LAND_CMD, "allow", name="coordinator landing on 'land rex-void-forms'",
     setup=_owner_says("land rex-void-forms"))
bash("git-guard", LAND_CMD, "refuse", name="landing after 'don't land it yet'",
     setup=_owner_says("don't land it yet"))
bash("git-guard", LAND_CMD + " --dry-run", "allow", name="dry run needs no owner word")
bash("git-guard", "py -3 C:/x/tools/try.py claude/b --commit --dry-run", "allow", name="plain dry run")
for _c in ("py -3 C:/x/tools/try.py b --commit; py -3 C:/x/tools/try.py b --commit --dry-run",
           "py -3 C:/x/tools/try.py b --commit # --dry-run",
           "py -3 C:/x/tools/try.py b --commit --path \\ --dry-run",
           'bash -c "py -3 C:/x/tools/try.py b --commit"'):
    bash("git-guard", _c, "refuse", name="dry-run bypass: " + _c)
_L = "py -3 C:/x/tools/try.py b --commit"
for _sep in ("\n", "\x0b", "\r"):
    bash("git-guard", _L + _sep + _L + " --dry-run", "refuse", name="dry-run bypass: %r separator" % _sep)
bash("git-guard", 'bash -c "git add -A"', "refuse", name="blanket add inside bash -c is checked")
for _c in ('bash -c "try.py b --commit" --dry-run', "py -3 C:/x/tools/try.py b --commit > --dry-run",
           "bash <<EOF\npy -3 C:/x/tools/try.py b --commit\nEOF", "bash <<EOF\ngit reset --hard\nEOF"):
    bash("git-guard", _c, "refuse", name="bypass: " + _c.replace("\n", " / "))


# standing order: an earlier typed "land <name>" in this window
STAND_CMD = "py -3 tools/try.py claude/rex-x --commit"
GIT = ("git", "-c", "user.name=t", "-c", "user.email=t@t")


def _msg(text, ts="2099-01-01T00:00:00.000Z", **extra):
    e = {"type": "user", "timestamp": ts, "message": {"role": "user", "content": text}}
    e.update(extra)
    return e


def _origin(c, push=True):
    """A reachable local bare origin (the landing guards fetch it); it holds every
    branch, or only main when `push` is False (a branch that was never pushed)."""
    bare = os.path.join(c.root, "origin.git")
    c.sh("git", "init", "-q", "--bare", bare)
    c.sh("git", "remote", "add", "origin", bare)
    c.sh("git", "push", "-q", "origin", "--all" if push else "main")


def _branch_repo(c, push=True):
    c.sh(*GIT, "commit", "--allow-empty", "-q", "-m", "x")
    c.sh("git", "branch", "-m", "main")
    c.sh("git", "branch", "claude/rex-x")
    _origin(c, push)


def _stand(*entries):
    def setup(c):
        _branch_repo(c)
        c.write_transcript([_msg("coordinator")] + list(entries))
    return setup


bash("git-guard", STAND_CMD, "allow", name="order two owner messages back",
     setup=_stand(_msg("land rex-x"), _msg("how is it going"), _msg("and the other one")))
bash("git-guard", STAND_CMD, "allow", name="order by the full branch name",
     setup=_stand(_msg("land claude/rex-x"), _msg("thanks")))
bash("git-guard", STAND_CMD, "refuse", name="order naming another branch",
     setup=_stand(_msg("land other-branch"), _msg("thanks")))
bash("git-guard", STAND_CMD, "refuse", name="spent order (older than the branch's fork point)",
     setup=_stand(_msg("land rex-x", ts="2020-01-01T00:00:00.000Z"), _msg("thanks")))
bash("git-guard", STAND_CMD, "refuse", name="cross-session message saying land",
     setup=_stand(_msg("land rex-x", isMeta=True), _msg("thanks")))
bash("git-guard", STAND_CMD, "refuse", name="a later 'don't land' ends the standing order",
     setup=_stand(_msg("land rex-x"), _msg("don't land rex-x yet, hold")))
bash("git-guard", STAND_CMD, "allow", name="a later 'don't land' about another branch leaves the order",
     setup=lambda c: (_stand(_msg("land rex-x"), _msg("don't land other-branch yet"))(c),
                      c.sh("git", "branch", "other-branch")))
bash("git-guard", STAND_CMD, "refuse", name="cross-session message (plain user text) saying land",
     setup=_stand(_msg("<cross-session-message from=\"x\">Another Claude session sent a message: land rex-x</cross-session-message>"),
                  _msg("thanks")))
bash("git-guard", STAND_CMD, "refuse", name="task notification (plain user text) saying land",
     setup=_stand(_msg("<task-notification>\n<result>land rex-x</result>\n</task-notification>"), _msg("thanks")))
bash("git-guard", STAND_CMD, "refuse", name="pasted block saying land does not count",
     setup=_stand(_msg("see <pasted_content id=1>land rex-x</pasted_content>"), _msg("thanks")))
bash("git-guard", STAND_CMD, "allow", name="order with trailing period",
     setup=_stand(_msg("land rex-x."), _msg("thanks")))
bash("git-guard", "py -3 tools/try.py rex-x --commit", "allow", name="order for the short branch name",
     setup=_stand(_msg("land rex-x, please"), _msg("thanks")))
for _t in ("don't land until I've read it", "never land without asking me", "do not land till tomorrow"):
    bash("git-guard", STAND_CMD, "refuse", name="a general no with a word after land ends the order: " + _t,
         setup=_stand(_msg("land rex-x"), _msg(_t)))
bash("git-guard", STAND_CMD, "refuse", name="'hold off on rex-x' ends the standing order",
     setup=_stand(_msg("land rex-x"), _msg("hold off on rex-x")))
bash("git-guard", STAND_CMD, "refuse", name="'not rex-x' ends the standing order",
     setup=_stand(_msg("land rex-x"), _msg("not rex-x")))
bash("git-guard", STAND_CMD, "refuse", name="'cancel the landing' ends the standing order",
     setup=_stand(_msg("land rex-x"), _msg("cancel the landing")))
bash("git-guard", STAND_CMD, "refuse", name="a later message naming the branch another way ends the order",
     setup=_stand(_msg("land rex-x"), _msg("rex-x: also fix the title")))
bash("git-guard", STAND_CMD, "allow", name="a later message about another branch does not end the order",
     setup=_stand(_msg("land rex-x"), _msg("land other-branch"), _msg("how is rex-y")))
bash("git-guard", STAND_CMD, "refuse", name="an order for rex-x-2 is not an order for rex-x",
     setup=_stand(_msg("land rex-x-2"), _msg("thanks")))
bash("git-guard", STAND_CMD, "refuse", name="an order for claude/rex-x-old is not an order for rex-x",
     setup=_stand(_msg("land claude/rex-x-old"), _msg("thanks")))
bash("git-guard", STAND_CMD, "refuse", name="peer entry without isMeta or markers is not the owner",
     setup=_stand(_msg("land rex-x", origin={"kind": "peer", "from": "x"}), _msg("thanks")))
bash("git-guard", STAND_CMD, "refuse", name="task-notification entry without isMeta or markers is not the owner",
     setup=_stand(_msg("land rex-x", origin={"kind": "task-notification"}), _msg("thanks")))
bash("git-guard", STAND_CMD, "allow", name="human origin counts as the owner",
     setup=_stand(_msg("land rex-x", origin={"kind": "human"}), _msg("thanks")))


def _remote_ahead(c):
    _branch_repo(c)
    c.write_transcript([_msg("coordinator"), _msg("land rex-x"), _msg("thanks")])
    c.sh("git", "update-ref", "refs/remotes/origin/claude/rex-x", "HEAD")
    c.sh("git", "checkout", "-q", "claude/rex-x")
    c.file("js/r.js", "r\n")
    c.sh("git", "add", "js/r.js")
    c.sh(*GIT, "commit", "-q", "-m", "r")
    c.sh("git", "checkout", "-q", "main")


bash("git-guard", STAND_CMD, "allow", name="local branch ahead of origin: the order holds", setup=_remote_ahead)
bash("git-guard", STAND_CMD, "refuse", name="order with no timestamp",
     setup=_stand({"type": "user", "message": {"role": "user", "content": "land rex-x"}}, _msg("thanks")))


@case("git-guard: a fetch that fails refuses with the origin line, in under 10 s", "refuse")
def _(c):
    _stand(_msg("land rex-x"), _msg("thanks"))(c)
    c.sh("git", "remote", "set-url", "origin", os.path.join(c.root, "no-such-origin.git"))
    t0 = time.time()
    res = c.run("git-guard.py", c.payload("Bash", {"command": STAND_CMD}))
    if "origin could not be reached" not in res[2] or time.time() - t0 >= 10:
        return (0, "", "")
    return res


bash("git-guard", STAND_CMD, "allow", name="a branch only on this machine (origin reachable) lands under the order",
     setup=lambda c: (_branch_repo(c, push=False),
                      c.write_transcript([_msg("coordinator"), _msg("land rex-x"), _msg("thanks")])))
bash("git-guard", STAND_CMD, "refuse", name="a later 'don't land main' ends the standing order",
     setup=_stand(_msg("land rex-x"), _msg("don't land main yet")))


@case("git-guard: a local-only branch with an unreachable origin refuses with the origin line, in under 10 s", "refuse")
def _(c):
    _branch_repo(c, push=False)
    c.write_transcript([_msg("coordinator"), _msg("land rex-x"), _msg("thanks")])
    c.sh("git", "remote", "set-url", "origin", os.path.join(c.root, "no-such-origin.git"))
    t0 = time.time()
    res = c.run("git-guard.py", c.payload("Bash", {"command": STAND_CMD}))
    if "origin could not be reached" not in res[2] or time.time() - t0 >= 10:
        return (0, "", "")
    return res


@case("git-guard: landing refusal says what to do and echoes the command", "refuse")
def _(c):
    res = c.run("git-guard.py", c.payload("Bash", {"command": LAND_CMD}))
    if 'land <name>' not in res[2] or LAND_CMD not in res[2]:
        return (0, "", "")
    return res


@case("git-guard: add of a path that was dirty at session start", "refuse")
def _(c):
    c.file("js/other.js", "x\n")
    os.makedirs(c.session_dir())
    with open(os.path.join(c.session_dir(), "foreign-paths.json"), "w", encoding="utf-8") as f:
        json.dump(["js/other.js"], f)
    return c.run("git-guard.py", c.payload("Bash", {"command": "git add js/other.js"}))


# file-guard
BIG = "".join("line %d\n" % i for i in range(301))
SMALL = "".join("line %d\n" % i for i in range(300))


def _big(c):
    c.file("notes/big.txt", BIG)
    c.file("notes/small.txt", SMALL)


def read(name, rel, tool_input, expect, **extra):
    def fn(c):
        _big(c)
        ti = {"file_path": os.path.join(c.proj, rel)}
        ti.update(tool_input)
        return c.run("file-guard.py", c.payload("Read", ti, **extra))
    CASES.append(("file-guard: " + name, expect, fn, None))


read("whole read of a 301-line file", "notes/big.txt", {}, "refuse")
read("read of a 301-line file with limit 500", "notes/big.txt", {"limit": 500}, "refuse")
read("read of a zip", "media/a.zip", {}, "refuse")
read("read inside __pycache__", "js/__pycache__/a.pyc.txt", {}, "refuse")
read("ranged read of a 301-line file", "notes/big.txt", {"offset": 10, "limit": 300}, "allow")
read("whole read of a 300-line file", "notes/small.txt", {}, "allow")
read("read of a missing file", "notes/none.txt", {}, "allow")


@case("file-guard: Write of a source file by the main session", "refuse")
def _(c):
    return c.run("file-guard.py", c.payload("Write", {"file_path": os.path.join(c.proj, "js/a.js"), "content": "x\n"}))


@case("file-guard: 2-line Edit of a source file by the main session", "allow")
def _(c):
    p = c.file("js/a.js", "a\nb\n")
    return c.run("file-guard.py", c.payload("Edit", {"file_path": p, "old_string": "a\nb", "new_string": "c\nd"}))


@case("file-guard: 41-line Edit of a source file by the main session", "refuse")
def _(c):
    p = c.file("js/a.js", "a\n")
    return c.run("file-guard.py", c.payload("Edit", {"file_path": p, "old_string": "a", "new_string": "c\n" * 40 + "d"}))


@case("file-guard: 40-line Edit of a source file by the main session", "allow")
def _(c):
    p = c.file("js/a.js", "a\n")
    return c.run("file-guard.py", c.payload("Edit", {"file_path": p, "old_string": "a", "new_string": "c\n" * 39 + "d"}))


@case("file-guard: Write of a source file by a subagent", "allow")
def _(c):
    return c.run("file-guard.py", c.payload("Write", {"file_path": os.path.join(c.proj, "js/a.js"), "content": "x\n"},
                                            agent_id="a1", agent_type="implementer"))


@case("file-guard: single-line Edit by the main session", "allow")
def _(c):
    p = c.file("js/a.js", "a\nb\n")
    return c.run("file-guard.py", c.payload("Edit", {"file_path": p, "old_string": "a", "new_string": "c"}))


@case("file-guard: handoff Write over 120 lines", "refuse")
def _(c):
    return c.run("file-guard.py", c.payload("Write", {"file_path": os.path.join(c.proj, ".claude/handoff.md"),
                                                      "content": "x\n" * 121}))


@case("file-guard: handoff Write of 10 lines", "allow")
def _(c):
    return c.run("file-guard.py", c.payload("Write", {"file_path": os.path.join(c.proj, ".claude/handoff.md"),
                                                      "content": "x\n" * 10}))


@case("file-guard: reviewer Write outside the reports folder", "refuse")
def _(c):
    return c.run("file-guard.py", c.payload("Write", {"file_path": os.path.join(c.proj, "notes/x.txt"), "content": "x\n"},
                                            agent_id="a1", agent_type="reviewer"))


@case("file-guard: reviewer Write of its report", "allow")
def _(c):
    return c.run("file-guard.py", c.payload("Write", {"file_path": os.path.join(c.proj, ".claude/specs/reports/r.md"),
                                                      "content": "x\n"}, agent_id="a1", agent_type="reviewer"))


def stop_run(c, notified):
    """stop-guard in cloud mode with a dirty file and one background Agent."""
    c.file("js/dirty.js", "x\n")
    entries = [FIRST_PROMPT, {"type": "assistant", "message": {"content": [
        {"type": "tool_use", "id": "toolu_bg1", "name": "Agent",
         "input": {"run_in_background": True, "prompt": "p"}}]}}]
    if notified:
        entries.append({"type": "user", "message": {"content":
            "<task-notification><tool-use-id>toolu_bg1</tool-use-id></task-notification>"}})
    c.write_transcript(entries)
    env = dict(os.environ, CLAUDE_CODE_REMOTE="true", CLAUDE_PROJECT_DIR=c.proj)
    p = subprocess.run([sys.executable, os.path.join(c.hooks, "stop-guard.py")],
                       input=json.dumps(c.payload(None, None, event="Stop")), capture_output=True,
                       text=True, encoding="utf-8", cwd=c.proj, env=env, timeout=30)
    return (2 if '"decision": "block"' in p.stdout else p.returncode), p.stdout, p.stderr


@case("stop-guard: dirty tree while a background agent has not reported", "allow")
def _(c):
    return stop_run(c, False)


@case("stop-guard: dirty tree after the background agent reported", "refuse")
def _(c):
    return stop_run(c, True)


@case("file-guard: reviewer Write of a report under the temp folder", "allow")
def _(c):
    return c.run("file-guard.py", c.payload("Write", {"file_path": os.path.join(tempfile.gettempdir(), "w2-report.md"),
                                                      "content": "x\n"}, agent_id="a1", agent_type="reviewer"))


@case("file-guard: main session Bash redirect into a source file", "refuse")
def _(c):
    return c.run("file-guard.py", c.payload("Bash", {"command": "echo hi > js/a.js"}))


@case("file-guard: main session Bash read-only command", "allow")
def _(c):
    return c.run("file-guard.py", c.payload("Bash", {"command": "ls js"}))


# agent-guard
def agent(name, ti, expect, setup=None, **extra):
    def fn(c):
        if setup:
            setup(c)
        return c.run("agent-guard.py", c.payload("Agent", ti, **extra))
    CASES.append(("agent-guard: " + name, expect, fn, None))


agent("model set", {"subagent_type": "implementer", "prompt": "x", "model": "opus"}, "refuse")
agent("effort set", {"subagent_type": "implementer", "prompt": "x", "effort": "high"}, "refuse")
agent("run_in_background true", {"subagent_type": "implementer", "prompt": "x", "run_in_background": True}, "refuse")
agent("foreground, no model", {"subagent_type": "implementer", "prompt": "x", "run_in_background": False}, "allow")
agent("no run_in_background key", {"subagent_type": "implementer", "prompt": "x"}, "allow")
agent("general-purpose from a main window", {"subagent_type": "general-purpose", "prompt": "x"}, "refuse")
agent("claude from a main window", {"subagent_type": "claude", "prompt": "x"}, "refuse")
agent("general-purpose called by a subagent", {"subagent_type": "general-purpose", "prompt": "x"}, "allow", agent_id="a1")


# poll-guard
for cmd in ("sleep 10", "sleep 30; cat out", "until [ -s out ]; do sleep 1; done",
            "while true; do sleep 2; done", "Start-Sleep -Seconds 20", "sleep 1m"):
    bash("poll-guard", cmd, "refuse")
for cmd in ("sleep 2", "sleep 9.5", "Start-Sleep 3", "python -c 'import time; time.sleep(30)'",
            "for f in a b; do echo $f; done", "ls"):
    bash("poll-guard", cmd, "allow")
for cmd in ('echo "sleep 30"', 'grep -n "until" x'):
    bash("poll-guard", cmd, "allow", name="quoted text: " + cmd)
for cmd in ('bash -c "while true; do sleep 1; done"', 'powershell -Command "Start-Sleep 30"',
            "sh -c 'sleep 30'", 'eval "sleep 30"'):
    bash("poll-guard", cmd, "refuse", name="code argument: " + cmd)


# review-guard
def _stage(c, n_files, n_lines):
    for i in range(n_files):
        c.file("js/f%d.js" % i, "x\n" * n_lines)
    c.sh("git", "add", "-A")


def review(name, cmd, expect, files, lines, setup=None, **extra):
    def fn(c):
        _stage(c, files, lines)
        if setup:
            setup(c)
        return c.run("review-guard.py", c.payload("Bash", {"command": cmd}, **extra))
    CASES.append(("review-guard: " + name, expect, fn, None))


def _reviewer_ran(c):
    os.makedirs(c.session_dir())
    with open(os.path.join(c.session_dir(), "context-watch.jsonl"), "w", encoding="utf-8") as f:
        f.write(json.dumps({"agent_type": "reviewer"}) + "\n")


def _light_ran(c):
    os.makedirs(c.session_dir())
    with open(os.path.join(c.session_dir(), "context-watch.jsonl"), "w", encoding="utf-8") as f:
        f.write(json.dumps({"agent_type": "reviewer-light"}) + "\n")


review("200 lines with a reviewer-light in the ledger", "git commit -m x", "allow", 1, 200, setup=_light_ran)


def _past_line(c):
    os.makedirs(c.session_dir())
    with open(os.path.join(c.session_dir(), "context-watch.state.json"), "w", encoding="utf-8") as f:
        json.dump({"main": {"tier": 2}}, f)


review("200 staged lines, no reviewer", "git commit -m x", "refuse", 1, 200)
review("4 staged files, no reviewer", "git commit -m x", "refuse", 4, 3)
review("20 staged lines in 1 file", "git commit -m x", "allow", 1, 20)
review("200 lines with a reviewer in the ledger", "git commit -m x", "allow", 1, 200, setup=_reviewer_ran)
review("200 lines in a window past its context line", "git commit -m x", "allow", 1, 200, setup=_past_line)
review("200 lines committed by a subagent", "git commit -m x", "allow", 1, 200, agent_id="a1")
review("sketch commit, 400 lines, no reviewer", 'git commit -m "Sketch: hull v3"', "allow", 1, 400)
review("same diff, plain message", 'git commit -m "Hull v3"', "refuse", 1, 400)
review("lowercase sketch message", 'git commit -m "sketch: x"', "refuse", 1, 400)
review("sketch message in a heredoc", "git commit -m \"$(cat <<'EOF'\nSketch: hull v3\n\nbody\nEOF\n)\"", "allow", 1, 400)
review("sketch message with -F", "git commit -F msg.txt -m 'Sketch: x'", "refuse", 1, 400)


@case("review-guard: a landing is never a sketch", "refuse")
def _(c):
    c.file("a.txt", "x\n")
    c.sh("git", "add", "-A")
    c.sh("git", "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "Sketch: base")
    c.sh("git", "branch", "-m", "main")
    c.sh("git", "checkout", "-qb", "feat")
    _stage(c, 1, 400)
    c.sh("git", "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "Sketch: big")
    return c.run("review-guard.py", c.payload("Bash", {"command": "py -3 tools/try.py feat --commit"}))


# review-guard: a review recorded in another window
RLAND = "py -3 tools/try.py claude/b --commit"


def _big_branch(c, push=True):
    c.sh(*GIT, "commit", "--allow-empty", "-q", "-m", "x")
    c.sh("git", "branch", "-m", "main")
    c.sh("git", "checkout", "-q", "-b", "claude/b")
    c.file("js/big.js", "x\n" * 200)
    c.sh("git", "add", "js/big.js")
    c.sh(*GIT, "commit", "-q", "-m", "big")
    _origin(c, push)


def _mark_reviewed(c):
    tip = subprocess.run(["git", "rev-parse", "HEAD"], cwd=c.proj, capture_output=True, text=True,
                         stdin=subprocess.DEVNULL).stdout.strip()
    c.file(".claude/reviewed.json", json.dumps({"claude/b": [tip]}))


def _new_commit(c):
    _mark_reviewed(c)
    c.file("js/more.js", "y\n")
    c.sh("git", "add", "js/more.js")
    c.sh(*GIT, "commit", "-q", "-m", "more")


def _merge_main(c):
    _mark_reviewed(c)
    c.sh("git", "checkout", "-q", "main")
    c.file("js/m.js", "m\n")
    c.sh("git", "add", "js/m.js")
    c.sh(*GIT, "commit", "-q", "-m", "m")
    c.sh("git", "checkout", "-q", "claude/b")
    c.sh(*GIT, "merge", "-q", "--no-ff", "-m", "merge main", "main")


def _landing(name, expect, setup, push=True):
    def fn(c):
        _big_branch(c, push)
        if setup:
            setup(c)
        return c.run("review-guard.py", c.payload("Bash", {"command": RLAND}))
    CASES.append(("review-guard: " + name, expect, fn, None))


def _review_then_commit(extra, changed_during=False, overlap=False, stale=False):
    """The real order: the reviewer starts and stops with uncommitted work, then it is committed."""
    def setup(c):
        c.file(".git/info/exclude", ".claude/reviewed.json\n")
        c.file("js/new.js", "n\n" * 50)
        d = c.payload(None, None, event="SubagentStop", agent_id="rv1", agent_type="reviewer",
                      agent_transcript_path=c.transcript)
        c.write_transcript([{"type": "user", "message": {"role": "user", "content": "x"}}])
        if stale:  # a launch from three hours ago that never stopped
            os.makedirs(c.session_dir(), exist_ok=True)
            with open(os.path.join(c.session_dir(), "review-start.json"), "w", encoding="utf-8") as f:
                json.dump([[time.time() - 10800, "0" * 40]], f)
        c.run("context-watch.py", c.payload("Agent", {"subagent_type": "reviewer"}))
        if overlap:  # a second reviewer starts after the files changed
            c.file("js/between.js", "b\n")
            c.run("context-watch.py", c.payload("Agent", {"subagent_type": "reviewer"}))
        if changed_during:
            c.file("js/during.js", "d\n")
        c.run("context-watch.py", d)
        try:  # test the tree rule alone: not the same-window rule
            os.remove(os.path.join(c.session_dir(), "context-watch.jsonl"))
        except OSError:
            pass
        c.sh("git", "add", "js/new.js")
        if extra:
            c.file("js/extra.js", "e\n")
            c.sh("git", "add", "js/extra.js")
        c.sh(*GIT, "commit", "-q", "-m", "new")
    return setup


_landing("review before the commit counts at landing (tree recorded)", "allow", _review_then_commit(False))
_landing("a tip with content no reviewer saw is refused", "refuse", _review_then_commit(True))
_landing("a file changed while the reviewer ran: no tree recorded", "refuse", _review_then_commit(False, True))
_landing("two overlapping reviewers with a change between their starts: no tree recorded", "refuse",
         _review_then_commit(False, overlap=True))
_landing("a review start older than two hours is ignored", "allow", _review_then_commit(False, stale=True))
_landing("branch reviewed in another window", "allow", _mark_reviewed)
_landing("local-only branch (origin reachable) reviewed in another window", "allow", _mark_reviewed, push=False)
_landing("branch never reviewed", "refuse", None)
_landing("branch with new unreviewed commits", "refuse", _new_commit)
_landing("reviewed tip plus a merge of main", "allow", _merge_main)


review("200 lines, command is not a commit", "git status", "allow", 1, 200)


@case("review-guard: 200 lines under .claude/ and in .md do not count", "allow")
def _(c):
    c.file(".claude/x.txt", "x\n" * 200)
    c.file("docs/a.md", "x\n" * 200)
    c.sh("git", "add", "-A")
    return c.run("review-guard.py", c.payload("Bash", {"command": "git commit -m x"}))


@case("review-guard: new source file with no map row, once", "refuse")
def _(c):
    c.file(".claude/MAP.md", "| js/old.js | old |\n")
    c.file("js/new.js", "x\n")
    c.sh("git", "add", "-A")
    return c.run("review-guard.py", c.payload("Bash", {"command": "git commit -m x"}))


@case("review-guard: the same map problem on the second try", "allow")
def _(c):
    c.file(".claude/MAP.md", "| js/old.js | old |\n")
    c.file("js/new.js", "x\n")
    c.sh("git", "add", "-A")
    c.run("review-guard.py", c.payload("Bash", {"command": "git commit -m x"}))
    return c.run("review-guard.py", c.payload("Bash", {"command": "git commit -m x"}))


# hooks.py (dispatcher)
def hooks(name, tool, ti, expect, setup=None, xfail=None, **extra):
    def fn(c):
        if setup:
            setup(c)
        tin = dict(ti)
        if tin.get("file_path") == "@big":
            tin["file_path"] = os.path.join(c.proj, "notes/big.txt")
        elif tin.get("file_path") == "@doc":
            tin["file_path"] = c.file("docs/a.md", "a\n")
        return c.run("hooks.py", c.payload(tool, tin, **extra))
    CASES.append(("hooks.py: " + name, expect, fn, xfail))


hooks("Bash git add -A refused", "Bash", {"command": "git add -A"}, "refuse")
hooks("Bash sleep 30 refused", "Bash", {"command": "sleep 30"}, "refuse")
hooks("Agent with model refused", "Agent", {"subagent_type": "implementer", "prompt": "x", "model": "opus"}, "refuse")
hooks("Read of a 301-line file refused", "Read", {"file_path": "@big"}, "refuse", setup=_big)
hooks("Bash git status allowed", "Bash", {"command": "git status"}, "allow")
hooks("Agent foreground allowed", "Agent", {"subagent_type": "implementer", "prompt": "x", "run_in_background": False}, "allow")
hooks("Edit of a doc allowed", "Edit", {"file_path": "@doc", "old_string": "a", "new_string": "b"}, "allow")


def _old_config(c):
    """The mixed-version fault: a guard_config.py without the names the
    dispatcher and the guards import."""
    with open(os.path.join(c.hooks, "guard_config.py"), "w", encoding="utf-8") as f:
        f.write('CONFIG_PATH = ".claude/project/file-guard.json"\n')


def _broken_config(c):
    with open(os.path.join(c.hooks, "guard_config.py"), "w", encoding="utf-8") as f:
        f.write("def broken(:\n")


hooks("older guard_config.py: poll-guard still refuses", "Bash", {"command": "sleep 30"}, "refuse", setup=_old_config)
hooks("older guard_config.py: agent-guard still refuses", "Agent",
      {"subagent_type": "implementer", "prompt": "x", "model": "opus"}, "refuse", setup=_old_config)
hooks("older guard_config.py: a harmless call is allowed", "Bash", {"command": "ls"}, "allow", setup=_old_config)
hooks("syntax-broken guard_config.py: poll-guard still refuses", "Bash", {"command": "sleep 30"}, "refuse",
      setup=_broken_config)


@case("hooks.py: empty stdin exits 0 and stays silent", "allow")
def _(c):
    return c.run("hooks.py", "", args=("PreToolUse",))


@case("hooks.py: non-JSON stdin exits 0 and stays silent", "allow")
def _(c):
    return c.run("hooks.py", "not json", args=("PreToolUse",))


# ---- prompt and session hooks: the case checks the output itself and
# returns (0, out, err) when it holds, (1, ...) when not ----

def check(name, fn, xfail=None):
    def run(c):
        ok, out = fn(c)
        return (0 if ok else 1), out, ""
    CASES.append((name, "allow", run, xfail))


def prompt(c, script, text, **extra):
    return c.run(script, c.payload(None, None, event="UserPromptSubmit", prompt=text, **extra))


for _label, _path, _branch, _want in (
    ("matching checkout and branch", "@proj", "feature", "GO CHECK: ok"),
    ("wrong branch", "@proj", "other", "GO CHECK: MISMATCH on branch"),
    ("wrong path", "@elsewhere", "feature", "GO CHECK: MISMATCH on checkout"),
):
    def _go_case(c, _path=_path, _branch=_branch, _want=_want):
        p = c.proj if _path == "@proj" else os.path.join(c.root, "elsewhere")
        out = prompt(c, "go-check.py", "go: x. Checkout %s on branch %s, worktree mode." % (p.replace("\\", "/"), _branch))
        return _want in out[1], out[1]
    check("go-check: " + _label, _go_case)


# context-watch.py (the line is 150,000; 120,000 for the coordinator and 250,000 for a plan supervisor)
def usage_turn(tokens):
    return {"type": "assistant", "message": {"role": "assistant", "usage": {"input_tokens": 1, "cache_read_input_tokens": tokens}}}


def watch(c, tokens, event="PreToolUse", text=None, **extra):
    c.write_transcript([FIRST_PROMPT, usage_turn(tokens)])
    if event == "UserPromptSubmit":
        return prompt(c, "context-watch.py", text or "next", **extra)
    return c.run("context-watch.py", c.payload("Read", {"file_path": "x"}, **extra))


def _quiet_below(c):
    return "CONTEXT WATCH" not in watch(c, 130_000)[1], ""


def _once_at_90(c):
    first = watch(c, 136_000)[1]  # 90% of 150,000
    second = watch(c, 137_000)[1]
    return "90% of the line of 150,000" in first and "CONTEXT WATCH" not in second, first + second


def _once_past(c):
    watch(c, 136_000)
    first = watch(c, 151_000)[1]
    second = watch(c, 152_000)[1]
    return "100% of the line of 150,000" in first and "Start no new step" in first and "CONTEXT WATCH" not in second, first + second


check("context-watch: quiet below 90% of the line", _quiet_below)
check("context-watch: prints once at 90% of the line", _once_at_90)
check("context-watch: prints once past the line", _once_past)

def _researcher(c, tokens, tool, tool_input):
    sub = os.path.join(c.session_dir(), "subagents")
    os.makedirs(sub, exist_ok=True)
    with open(os.path.join(sub, "agent-r1.jsonl"), "w", encoding="utf-8") as f:
        f.write(json.dumps(usage_turn(tokens)) + "\n")
    return c.run("context-watch.py", c.payload(tool, tool_input, agent_id="r1", agent_type="researcher"))[1]


def _researcher_lines(c):
    warn = _researcher(c, 81_000, "Read", {"file_path": "x"})
    deny = _researcher(c, 126_000, "Read", {"file_path": "x"})
    report = _researcher(c, 126_000, "Write", {"file_path": ".claude/specs/reports/x.md", "content": "x\n"})
    ok = ("CONTEXT WATCH" in warn and "% of the subagent line" in warn
          and '"permissionDecision": "deny"' in deny and "125,000" in deny
          and '"permissionDecision": "deny"' not in report)
    return ok, warn + deny + report


check("context-watch: a researcher subagent is warned at 80% and refused past 125,000", _researcher_lines)

GO_PREPARED = "go: build the prepared specs. Checkout %s on branch feature, worktree mode. Read .claude/handoff.md first."
NOTE = "coordinator window, line 120k until /clear"


def _user(text):
    return {"type": "user", "message": {"role": "user", "content": [{"type": "text", "text": text}]}}


def _submit(c, text, tokens=228_000):
    """A prompt in a window whose last turn holds `tokens` (91% of 250,000; pass 110_000 for 91% of 120,000)."""
    return watch(c, tokens, event="UserPromptSubmit", text=text)[1]


def _coordinator_first(c, text):
    out = _submit(c, text, 110_000)
    return "91% of the line of 120,000" in out and out.count(NOTE) == 1, out


check("context-watch: coordinator: as the first prompt gets 120,000",
      lambda c: _coordinator_first(c, "coordinator: plan the day"))
check("context-watch: bare Coordinator gets 120,000",
      lambda c: _coordinator_first(c, "Coordinator"))
check("context-watch: coordinator: behind a reminder block gets 120,000",
      lambda c: _coordinator_first(c, "<system-reminder>\nx\n</system-reminder>\n\ncoordinator: go"))


def _coordinator_later(c):
    first = watch(c, 136_000, event="UserPromptSubmit", text="please start")[1]  # 90% of 150,000
    second = _submit(c, "coordinator: now", 108_000)  # 90% of 120,000
    third = c.run("context-watch.py", c.payload("Read", {"file_path": "x"}))[1]
    c.write_transcript([FIRST_PROMPT, usage_turn(121_000)])
    fourth = c.run("context-watch.py", c.payload("Read", {"file_path": "x"}))[1]
    return ("90% of the line of 150,000" in first and "90% of the line of 120,000" in second
            and NOTE in second and "CONTEXT WATCH" not in third
            and "Finish this round" in fourth and NOTE not in fourth), first + second + fourth


check("context-watch: coordinator: as a later prompt gets 120,000 and re-arms the warnings", _coordinator_later)


def _coordinator_silent_again(c):
    _submit(c, "coordinator: go", 110_000)
    out = _submit(c, "and then?", 110_000)
    return "CONTEXT WATCH" not in out, out


check("context-watch: the coordinator note prints once", _coordinator_silent_again)


def _queued_coordinator(c):
    c.write_transcript([_user("coordinator: go"), usage_turn(110_000)])
    return c.run("context-watch.py", c.payload("Read", {"file_path": "x"}))[1]


check("context-watch: coordinator: as a queued first message gets 120,000",
      lambda c: ("91% of the line of 120,000" in (o := _queued_coordinator(c)), o))


def _background_first(c):
    first = _user("Background (from the session that started this one):\nsome notes\n\nTask: coordinator: go")
    c.write_transcript([first, usage_turn(137_000)])
    return c.run("context-watch.py", c.payload("Read", {"file_path": "x"}))[1]


check("context-watch: Background/Task: coordinator: first prompt stays 150,000",
      lambda c: ("of the line of 150,000" in (o := _background_first(c)) and NOTE not in o, o))
def _pasted_later(c):
    first = watch(c, 100_000, event="UserPromptSubmit", text="Not now")[1]
    second = _submit(c, '<pasted_content id="1">\ncoordinator: go', 110_000)
    return "CONTEXT WATCH" not in first and "91% of the line of 120,000" in second and NOTE in second, first + second


check("context-watch: coordinator: after a pasted_content tag in a later prompt gets 120,000", _pasted_later)


def _warning_texts(c):
    coord = _submit(c, "coordinator: go", 110_000)
    c2 = _submit(c, "next", 110_000)
    return ("Finish this round, then end the turn telling the owner to type /clear and then coordinator. Write no handoff." in coord
            and "handoff.md" not in coord and c2 == "", coord + c2)


def _other_text(c):
    out = _submit(c, "fix the bug", 137_000)
    return ("Finish the current step, commit, write .claude/handoff.md (handoff skill) and end the turn with the go prompt. Start no new step." in out
            and "Write no handoff" not in out), out


check("context-watch: coordinator warning says /clear then coordinator, no handoff", _warning_texts)
check("context-watch: other windows are told to write the handoff and end with the go prompt", _other_text)


def _coordinator_repeats_past(c):
    _submit(c, "coordinator: go", 110_000)
    a = _submit(c, "more", 121_000)
    b = _submit(c, "more", 122_000)
    return a.count("Finish this round") == 1 and b.count("Finish this round") == 1, a + b


check("context-watch: past the line the warning repeats on every owner prompt", _coordinator_repeats_past)


def _stop_handoff(c, handoff, coordinator=False, warned=True, async_bg=False, run=None, extra_env=None, tail=b""):
    """stop-guard (worktree-less cloud mode) with a context state file."""
    c.file("js/dirty.js", "x\n")
    now = time.time()
    entries = [FIRST_PROMPT]
    if async_bg:
        entries += [{"type": "assistant", "message": {"content": [
            {"type": "tool_use", "id": "toolu_as1", "name": "Agent", "input": {"prompt": "p"}}]}},
            {"type": "user", "message": {"content": [{"type": "tool_result", "tool_use_id": "toolu_as1",
             "content": [{"type": "text", "text": "Async agent launched successfully."}]}]}}]
    c.write_transcript(entries)
    if tail:
        with open(c.transcript, "ab") as f:
            f.write(tail)
    state = {"main": {"warned": now - 100} if warned else {}, "agents": {}}
    if coordinator:
        state["main"]["run"] = "coordinator"
    if run:
        state["main"]["run"] = run
    os.makedirs(c.session_dir(), exist_ok=True)
    with open(os.path.join(c.session_dir(), "context-watch.state.json"), "w", encoding="utf-8") as f:
        json.dump(state, f)
    if handoff:
        c.file(".claude/handoff.md", "# Handoff\n")
        hp = os.path.join(c.proj, ".claude", "handoff.md")
        os.utime(hp, (now + (10 if handoff == "new" else -1000),) * 2)
    env = dict(os.environ, CLAUDE_CODE_REMOTE="true", CLAUDE_PROJECT_DIR=c.proj, **(extra_env or {}))
    p = subprocess.run([sys.executable, os.path.join(c.hooks, "stop-guard.py")],
                       input=json.dumps(c.payload(None, None, event="Stop")), capture_output=True,
                       text=True, encoding="utf-8", cwd=c.proj, env=env, timeout=30)
    return p.stdout


check("stop-guard: warned window with no handoff is blocked, naming the handoff and go prompt",
      lambda c: ("handoff.md" in (o := _stop_handoff(c, None)) and "go prompt" in o and '"block"' in o, o))
check("stop-guard: warned window with an older handoff is blocked",
      lambda c: ('"block"' in (o := _stop_handoff(c, "old")) and "handoff.md" in o, o))
check("stop-guard: warned window with a newer handoff gets the usual dirty-tree check only",
      lambda c: ("go prompt" not in (o := _stop_handoff(c, "new")), o))
check("stop-guard: the coordinator is not asked for a handoff",
      lambda c: ("go prompt" not in (o := _stop_handoff(c, None, coordinator=True)), o))
check("stop-guard: a plan supervisor is not asked for a handoff",
      lambda c: ("go prompt" not in (o := _stop_handoff(c, None, run="supervisor")), o))
check("stop-guard: a headless plan session is not asked for a handoff",
      lambda c: ("go prompt" not in (o := _stop_handoff(c, None, extra_env={"AUTOPLAN_LINE": "150000"})), o))
check("stop-guard: a window never warned is not asked for a handoff",
      lambda c: ("go prompt" not in (o := _stop_handoff(c, None, warned=False)), o))
check("stop-guard: dirty tree passes while an async-launched agent has not reported",
      lambda c: ((o := _stop_handoff(c, "new", warned=False, async_bg=True)) == "", o))
check("stop-guard: a transcript still being written (broken last line) still counts the running agent",
      lambda c: ((o := _stop_handoff(c, "new", warned=False, async_bg=True, tail=b'{"type": "user", "x": "\xc3')) == "", o))
check("stop-guard: dirty tree is blocked with no async agent running",
      lambda c: ('"block"' in (o := _stop_handoff(c, "new", warned=False)), o))
check("context-watch: coordinator: in a cross-session wrapper stays 150,000",
      lambda c: ("of the line of 150,000" in (o := _submit(c, '<cross-session-message from="x">coordinator: go</cross-session-message>', 137_000)) and NOTE not in o, o))
check("context-watch: coordinator in the middle of a prompt stays 150,000",
      lambda c: ("of the line of 150,000" in (o := _submit(c, "please ask the coordinator: go", 137_000)), o))


def _prepared(c, handoff="Run: prepared\n# Handoff\n", text=None):
    c.file(".claude/handoff.md", handoff)
    return _submit(c, text or GO_PREPARED % c.proj.replace("\\", "/"), 137_000)


check("context-watch: a go prompt with a Run: prepared handoff gets 150,000",
      lambda c: ("91% of the line of 150,000" in (o := _prepared(c)), o))


def _queued_prepared(c):
    c.file(".claude/handoff.md", "Run: prepared\n# Handoff\n")
    c.write_transcript([_user(GO_PREPARED % c.proj.replace("\\", "/")), usage_turn(137_000)])
    return c.run("context-watch.py", c.payload("Read", {"file_path": "x"}))[1]


check("context-watch: a queued go prompt with a Run: prepared handoff gets 150,000",
      lambda c: ("91% of the line of 150,000" in (o := _queued_prepared(c)), o))
check("context-watch: a plain first prompt gets 150,000",
      lambda c: ("91% of the line of 150,000" in (o := _submit(c, "fix the bug", 137_000)), o))
check("context-watch: the plan supervisor prompt gets 250,000",
      lambda c: ("91% of the line of 250,000" in (o := _submit(c, "go: run plan x")), o))


def _plain_quiet_prompts(c):
    watch(c, 136_000)
    outs = [prompt(c, "context-watch.py", t)[1] for t in ("again", "and again")]
    c.write_transcript([FIRST_PROMPT, usage_turn(151_000)])
    past = prompt(c, "context-watch.py", "now")[1]
    c.write_transcript([FIRST_PROMPT, usage_turn(152_000)])
    after = prompt(c, "context-watch.py", "more")[1]
    return ("CONTEXT WATCH" not in "".join(outs) and "Start no new step" in past
            and "Start no new step" in after), "".join(outs) + past + after


def _coordinator_160_162(c):
    quiet = _submit(c, "coordinator: go", 106_000)
    warn = _submit(c, "next", 108_000)
    return ("CONTEXT WATCH: coordinator window" in quiet and "% of the line" not in quiet
            and "90% of the line of 120,000" in warn), quiet + warn


check("context-watch: prompts after the 90% warning print nothing; past 150,000 every prompt repeats it", _plain_quiet_prompts)
check("context-watch: a coordinator window is quiet at 160,000 and warns at 162,000", _coordinator_160_162)


def _autoplan_line(c):
    os.environ["AUTOPLAN_LINE"] = "50000"
    try:
        return _submit(c, "coordinator: go", 46_000)
    finally:
        del os.environ["AUTOPLAN_LINE"]


check("context-watch: AUTOPLAN_LINE overrides the line",
      lambda c: ("92% of the line of 50,000" in (o := _autoplan_line(c)), o))


# reply-cap.py
def _cap(c, words, **extra):
    d = c.payload(None, None, event="SubagentStop", last_assistant_message=" ".join(["word"] * words), **extra)
    return c.run("reply-cap.py", d)


def _cap_twice(c):
    first = _cap(c, 300)
    second = _cap(c, 300, stop_hook_active=True)
    return '"decision": "block"' in first[1] and not second[1].strip() and second[0] == 0, first[1] + second[1]


check("reply-cap: sends back one over-long reply, lets the second through", _cap_twice)
check("reply-cap: a 250-word reply goes through", lambda c: (not _cap(c, 250)[1].strip(), ""))


# session-start.py
def _mode_line(c):
    out = c.run("session-start.py", c.payload(None, None, event="SessionStart", source="startup"))
    return any(l.startswith("MODE:") for l in out[1].splitlines()), out[1][:200]


check("session-start: prints a MODE: line", _mode_line)


def _mode_cap(c):
    c.file(".claude/modes/shared.md", "".join("rule line %d\n" % i for i in range(1000)))
    out = c.run("session-start.py", c.payload(None, None, event="SessionStart", source="startup"))[1]
    i = out.find("rule line 0")
    n = len(out[i:].split("(truncated:")[0].encode("utf-8"))
    return "(truncated: read .claude/modes/" in out and 0 < n <= 4096, out[:200]


check("session-start: an oversized mode text is cut under the cap with a truncation line", _mode_cap)


def _modes_fit(c):
    import importlib.util
    spec = importlib.util.spec_from_file_location("session_start", os.path.join(HERE, "session-start.py"))
    ss = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(ss)
    base = os.path.join(HERE, "..")
    over = []
    for mode in ("shared", "worktree", "cloud"):
        n = 0
        for rel in ("modes", os.path.join("project", "modes")):
            p = os.path.join(base, rel, mode + ".md")
            if os.path.exists(p):
                with open(p, encoding="utf-8", errors="ignore") as f:
                    n += len(f.read().strip().encode("utf-8")) + 2
        if n - 2 > ss.MODE_CAP:
            over.append("%s %d" % (mode, n - 2))
    return not over, "over the cap: " + ", ".join(over)


check("session-start: every mode file plus its project half fits under the cap", _modes_fit)


def run_case(name, expect, fn, xfail):
    root = tempfile.mkdtemp(prefix="hooks-test-")
    try:
        c = Ctx(root)
        res = fn(c)
        ok = refused(res) if expect == "refuse" else allowed(res)
    except Exception as e:  # a broken case is a failed case
        res, ok = (-1, "", "%s: %s" % (type(e).__name__, e)), False
    finally:
        shutil.rmtree(root, ignore_errors=True)
    return ok, res


# context-watch.py: the coordinator and sub-chat procedures (.claude/project/)
PROJECT_DIR = os.path.join(os.path.dirname(HERE), "project")


def _procedures(c):
    for n in ("coordinator.md", "sub-chat.md"):
        with open(os.path.join(PROJECT_DIR, n), encoding="utf-8") as f:
            c.file(".claude/project/" + n, f.read())


def _board_row(c, **row):
    common = os.path.join(c.proj, ".git")
    r = {"branch": "feature", "name": "feature", "session": "", "task": "", "state": "working",
         "line": "", "go": "", "at": time.time(), "seen": 0, "role": ""}
    r.update(row)
    c.file(".claude/board.json", json.dumps({"meta": {}, "rows": {"feature": r}}))
    return common


def _coordinator_proc(c):
    _procedures(c)
    first = _submit(c, "coordinator: go", 50_000)
    second = _submit(c, "and then?", 50_000)
    with open(os.path.join(PROJECT_DIR, "coordinator.md"), encoding="utf-8") as f:
        body = f.read().strip()
    return first.count(body) == 1 and "wins over workflow.md" in first and body not in second, first + second


check("context-watch: a coordinator prompt prints coordinator.md once", _coordinator_proc)


def _sub_chat_proc(c, **row):
    _procedures(c)
    _board_row(c, **row)
    first = _submit(c, "go: the task", 50_000)
    second = _submit(c, "next", 50_000)
    return first, second


def _added_row(c):
    first, second = _sub_chat_proc(c, added=1)
    with open(os.path.join(PROJECT_DIR, "sub-chat.md"), encoding="utf-8") as f:
        body = f.read().strip()
    return first.count(body) == 1 and "coordinator.md" not in first and body not in second, first + second


def _hook_row(c):
    first, second = _sub_chat_proc(c)
    return first == "" and second == "", first + second


def _ordinary(c):
    _procedures(c)
    return _submit(c, "fix the bug", 50_000) == "", ""


def _missing(c):
    _board_row(c, added=1)
    return _submit(c, "go: the task", 50_000) == "" and _submit(c, "coordinator: go", 50_000) != "", ""


def _small_enough(c):
    n = max(os.path.getsize(os.path.join(PROJECT_DIR, f)) for f in ("coordinator.md", "sub-chat.md"))
    return n + 300 < 9000, "largest file %d bytes" % n


check("context-watch: a coordinator-added row's chat gets sub-chat.md once", _added_row)
check("context-watch: a hook-made row's chat gets nothing", _hook_row)
check("context-watch: an ordinary window gets no procedure", _ordinary)
check("context-watch: a missing procedure file prints nothing, and the coordinator note still comes", _missing)
check("context-watch: each procedure file stays under 9,000 characters with its header", _small_enough)


def main():
    key = None
    if "-k" in sys.argv:
        i = sys.argv.index("-k")
        key = sys.argv[i + 1] if i + 1 < len(sys.argv) else ""
    failed = passed = xfailed = 0
    for name, expect, fn, xfail in CASES:
        if key is not None and key not in name:
            continue
        ok, res = run_case(name, expect, fn, xfail)
        if xfail:
            if ok:
                failed += 1
                print("FAIL  %s: expected to %s, but the xfail (%s) now passes" % (name, expect, xfail))
            else:
                xfailed += 1
                print("xfail %s: expected to %s (%s)" % (name, expect, xfail))
        elif ok:
            passed += 1
            print("ok    %s" % name)
        else:
            failed += 1
            tail = (res[2] or res[1]).strip().replace("\n", " ")[-160:]
            print("FAIL  %s: expected to %s; got exit %s, %s" % (name, expect, res[0], tail or "no output"))
    print("%d passed, %d failed, %d expected-fail, %d cases" % (passed, failed, xfailed, passed + failed + xfailed))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
