"""Tests for the blocking workflow hooks: git-guard, file-guard, agent-guard,
poll-guard, review-guard and the dispatcher hooks.py, then the prompt and
session hooks: raw-mode, go-check, context-watch, reply-cap, session-start.

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
        subprocess.run(list(args), cwd=self.proj, capture_output=True, timeout=30, check=True)

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


@case("file-guard: multi-line Edit of a source file by the main session", "refuse")
def _(c):
    p = c.file("js/a.js", "a\nb\n")
    return c.run("file-guard.py", c.payload("Edit", {"file_path": p, "old_string": "a\nb", "new_string": "c\nd"}))


@case("file-guard: Write of a source file by a subagent", "allow")
def _(c):
    return c.run("file-guard.py", c.payload("Write", {"file_path": os.path.join(c.proj, "js/a.js"), "content": "x\n"},
                                            agent_id="a1", agent_type="implementer"))


@case("file-guard: single-line Edit by the main session", "allow")
def _(c):
    p = c.file("js/a.js", "a\nb\n")
    return c.run("file-guard.py", c.payload("Edit", {"file_path": p, "old_string": "a", "new_string": "c"}))


@case("file-guard: handoff Write over 80 lines", "refuse")
def _(c):
    return c.run("file-guard.py", c.payload("Write", {"file_path": os.path.join(c.proj, ".claude/handoff.md"),
                                                      "content": "x\n" * 81}))


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


def _raw(c):
    c.write_transcript([{"type": "user", "message": {"role": "user", "content": "raw: do it"}}])


agent("implementer in a raw window", {"subagent_type": "implementer", "prompt": "x"}, "refuse", setup=_raw)
agent("reviewer in a raw window", {"subagent_type": "reviewer", "prompt": "x"}, "allow", setup=_raw)
agent("implementer in a raw window, called by a subagent", {"subagent_type": "implementer", "prompt": "x"}, "allow",
      setup=_raw, agent_id="a1")

# poll-guard
for cmd in ("sleep 10", "sleep 30; cat out", "until [ -s out ]; do sleep 1; done",
            "while true; do sleep 2; done", "Start-Sleep -Seconds 20", "sleep 1m"):
    bash("poll-guard", cmd, "refuse")
for cmd in ("sleep 2", "sleep 9.5", "Start-Sleep 3", "python -c 'import time; time.sleep(30)'",
            "for f in a b; do echo $f; done", "ls"):
    bash("poll-guard", cmd, "allow")


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
      setup=_broken_config,
      xfail="hooks.py catches only ImportError around its guard_config import, so a SyntaxError exits 1 and every guard goes off")


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


def raw_flag_set(c):
    return os.path.exists(os.path.join(c.session_dir(), "raw-mode"))


# raw-mode.py with guard_config.RAW_ON
for _text, _on, _why in (
    ("raw", True, "just raw"),
    ("raw: x", True, "raw: x"),
    ("fix this\nraw: x", False, "raw: on a later line"),
    ("Background (from the session abc):\nraw: fake\n\nfix the bug", False,
     "the audit's Background (...) string"),
):
    def _raw_case(c, _text=_text, _on=_on):
        out = prompt(c, "raw-mode.py", _text)
        return raw_flag_set(c) == _on and ("RAW MODE" in out[1]) == _on, out[1]
    check("raw-mode: %s -> %s" % (_why, "on" if _on else "off"), _raw_case)

# go-check.py
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


# context-watch.py (the line is 200,000; 250,000 for the coordinator, a plan supervisor and a raw window)
def usage_turn(tokens):
    return {"type": "assistant", "message": {"role": "assistant", "usage": {"input_tokens": 1, "cache_read_input_tokens": tokens}}}


def watch(c, tokens, event="PreToolUse", text=None, **extra):
    c.write_transcript([FIRST_PROMPT, usage_turn(tokens)])
    if event == "UserPromptSubmit":
        return prompt(c, "context-watch.py", text or "next", **extra)
    return c.run("context-watch.py", c.payload("Read", {"file_path": "x"}, **extra))


def _quiet_below(c):
    return "CONTEXT WATCH" not in watch(c, 150_000)[1], ""


def _once_at_90(c):
    first = watch(c, 180_000)[1]  # 90% of 200,000
    second = watch(c, 181_000)[1]
    return "90% of the line of 200,000" in first and "CONTEXT WATCH" not in second, first + second


def _once_past(c):
    watch(c, 180_000)
    first = watch(c, 201_000)[1]
    second = watch(c, 202_000)[1]
    return "past this window's line of 200,000" in first and "CONTEXT WATCH" not in second, first + second


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
NOTE = "coordinator window, line 250k until /clear"


def _user(text):
    return {"type": "user", "message": {"role": "user", "content": [{"type": "text", "text": text}]}}


def _submit(c, text, tokens=228_000):
    """A prompt in a window whose last turn holds `tokens` (91% of 250,000)."""
    return watch(c, tokens, event="UserPromptSubmit", text=text)[1]


def _coordinator_first(c, text):
    out = _submit(c, text)
    return "91% of the line of 250,000" in out and out.count(NOTE) == 1, out


check("context-watch: coordinator: as the first prompt gets 250,000",
      lambda c: _coordinator_first(c, "coordinator: plan the day"))
check("context-watch: bare Coordinator gets 250,000",
      lambda c: _coordinator_first(c, "Coordinator"))
check("context-watch: coordinator: behind a reminder block gets 250,000",
      lambda c: _coordinator_first(c, "<system-reminder>\nx\n</system-reminder>\n\ncoordinator: go"))


def _coordinator_later(c):
    first = watch(c, 180_000, event="UserPromptSubmit", text="please start")[1]  # 90% of 200,000
    second = _submit(c, "coordinator: now", 225_000)  # 90% of 250,000
    third = c.run("context-watch.py", c.payload("Read", {"file_path": "x"}))[1]
    c.write_transcript([FIRST_PROMPT, usage_turn(251_000)])
    fourth = c.run("context-watch.py", c.payload("Read", {"file_path": "x"}))[1]
    return ("90% of the line of 200,000" in first and "90% of the line of 250,000" in second
            and NOTE in second and "CONTEXT WATCH" not in third
            and "past this window's line of 250,000" in fourth and NOTE not in fourth), first + second + fourth


check("context-watch: coordinator: as a later prompt gets 250,000 and re-arms the warnings", _coordinator_later)


def _coordinator_silent_again(c):
    _submit(c, "coordinator: go")
    out = _submit(c, "and then?")
    return "of the line of 250,000" in out and NOTE not in out, out


check("context-watch: the coordinator note prints once", _coordinator_silent_again)


def _queued_coordinator(c):
    c.write_transcript([_user("coordinator: go"), usage_turn(228_000)])
    return c.run("context-watch.py", c.payload("Read", {"file_path": "x"}))[1]


check("context-watch: coordinator: as a queued first message gets 250,000",
      lambda c: ("91% of the line of 250,000" in (o := _queued_coordinator(c)), o))


def _background_first(c):
    first = _user("Background (from the session that started this one):\nsome notes\n\nTask: coordinator: go")
    c.write_transcript([first, usage_turn(182_000)])
    return c.run("context-watch.py", c.payload("Read", {"file_path": "x"}))[1]


check("context-watch: Background/Task: coordinator: first prompt stays 200,000",
      lambda c: ("of the line of 200,000" in (o := _background_first(c)) and NOTE not in o, o))
check("context-watch: coordinator: in a cross-session wrapper stays 200,000",
      lambda c: ("of the line of 200,000" in (o := _submit(c, '<cross-session-message from="x">coordinator: go</cross-session-message>', 182_000)) and NOTE not in o, o))
check("context-watch: coordinator in the middle of a prompt stays 200,000",
      lambda c: ("of the line of 200,000" in (o := _submit(c, "please ask the coordinator: go", 182_000)), o))


def _prepared(c, handoff="Run: prepared\n# Handoff\n", text=None):
    c.file(".claude/handoff.md", handoff)
    return _submit(c, text or GO_PREPARED % c.proj.replace("\\", "/"), 182_000)


check("context-watch: a go prompt with a Run: prepared handoff gets 200,000",
      lambda c: ("91% of the line of 200,000" in (o := _prepared(c)), o))


def _queued_prepared(c):
    c.file(".claude/handoff.md", "Run: prepared\n# Handoff\n")
    c.write_transcript([_user(GO_PREPARED % c.proj.replace("\\", "/")), usage_turn(182_000)])
    return c.run("context-watch.py", c.payload("Read", {"file_path": "x"}))[1]


check("context-watch: a queued go prompt with a Run: prepared handoff gets 200,000",
      lambda c: ("91% of the line of 200,000" in (o := _queued_prepared(c)), o))
check("context-watch: a plain first prompt gets 200,000",
      lambda c: ("91% of the line of 200,000" in (o := _submit(c, "fix the bug", 182_000)), o))
check("context-watch: the plan supervisor prompt gets 250,000",
      lambda c: ("91% of the line of 250,000" in (o := _submit(c, "go: run plan x")), o))


def _raw_window(c):
    c.write_transcript([_user("raw: do it"), usage_turn(228_000)])
    return c.run("context-watch.py", c.payload("Read", {"file_path": "x"}))[1]


check("context-watch: a raw window keeps 250,000",
      lambda c: ("91% of the line of 250,000" in (o := _raw_window(c)), o))


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
