#!/usr/bin/env python3
"""The work board: one shared file with every worktree chat and what it waits for.

A hook calls record() on each prompt and turn end; the coordinator and the owner
run the CLI (py -3 tools/board.py ...). See .claude/project/coordinator.md.
"""
import contextlib
import io
import json
import os
import re
import subprocess
import sys
import tempfile
import time

CAP = 3
BRAKE = 10
ORDER = ["verdict", "question", "go", "done", "working", "waiting", "queued", "paused", "idle", "landed"]
PREFIXES = [("NEEDS VERDICT:", "verdict"), ("QUESTION:", "question"), ("DONE:", "done"),
            ("GO PROMPT BELOW:", "go"), ("WAITING:", "waiting")]
ACT = {
    "verdict": "relay its pictures and line to the owner",
    "question": "ask the owner its questions",
    "done": "dry-run its landing, tell the owner READY or what blocks",
    "go": "clear_session, then SendMessage the text of `board.py go {name}`",
}
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def git(args, cwd=None):
    try:
        r = subprocess.run(["git"] + args, cwd=cwd or root(), capture_output=True, text=True, timeout=15)
        return r.stdout.strip() if r.returncode == 0 else ""
    except Exception:
        return ""


def root():
    """This checkout (where board.md is written)."""
    return os.environ.get("BOARD_ROOT") or HERE


def board_path(common=None):
    p = os.environ.get("BOARD_FILE")
    if p:
        return p
    common = common or git(["rev-parse", "--path-format=absolute", "--git-common-dir"])
    main = os.path.dirname(common) if common else root()
    return os.path.join(main, ".claude", "board.json")


@contextlib.contextmanager
def locked(path):
    lp = path + ".lock"
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    start, fd = time.time(), None
    try:
        if time.time() - os.path.getmtime(lp) > 5:
            os.remove(lp)  # left by a killed holder
    except OSError:
        pass
    while time.time() - start < 1:
        try:
            fd = os.open(lp, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            break
        except OSError:
            time.sleep(0.02)
    try:
        yield
    finally:
        if fd is not None:
            os.close(fd)
            try:
                os.remove(lp)
            except OSError:
                pass


def load(path):
    try:
        with open(path, encoding="utf-8") as f:
            d = json.load(f)
        d.setdefault("meta", {})
        d.setdefault("rows", {})
        return d
    except Exception:
        return {"meta": {}, "rows": {}}


def save(path, d):
    tmp = path + ".tmp%d" % os.getpid()
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(d, f, indent=1)
    os.replace(tmp, path)


def mutate(fn, common=None):
    path = board_path(common)
    with locked(path):
        d = load(path)
        out = fn(d)
        save(path, d)
    return out


def new_row(branch, name=None):
    return {"branch": branch, "name": name or re.sub(r"^claude/", "", branch), "session": "", "task": "",
            "state": "working", "line": "", "go": "", "at": time.time(), "seen": 0, "role": ""}


def find(rows, q):
    """Key of the row matching name, branch or key, else a unique prefix of either."""
    for k, r in rows.items():
        if q in (k, r.get("name"), r.get("branch")):
            return k
    hits = [k for k, r in rows.items() if any(str(v).startswith(q) for v in (k, r.get("name"), r.get("branch")) if v)]
    return hits[0] if len(hits) == 1 else None


# ---- record (hook entry) ----

def strip_reminders(p):
    return re.sub(r"^\s*(<system-reminder>.*?</system-reminder>\s*)+", "", p, flags=re.S)


def tail_text(path):
    """Last assistant text block in the last 200 KB of a transcript."""
    with open(path, "rb") as f:
        f.seek(0, 2)
        size = f.tell()
        f.seek(max(0, size - 200000))
        data = f.read().decode("utf-8", "replace")
    last = ""
    for ln in data.splitlines():
        try:
            e = json.loads(ln)
        except Exception:
            continue
        m = e.get("message") if isinstance(e, dict) else None
        if not isinstance(m, dict) or (e.get("type") or m.get("role")) != "assistant":
            continue
        c = m.get("content")
        if isinstance(c, str) and c.strip():
            last = c
        elif isinstance(c, list):
            for b in c:
                if isinstance(b, dict) and b.get("type") == "text" and b.get("text", "").strip():
                    last = b["text"]
    return last


def classify(text):
    first = next((ln.strip() for ln in text.splitlines() if ln.strip()), "")
    head = first.lstrip("*# ").upper()
    state = "idle"
    for pre, st in PREFIXES:
        if head.startswith(pre):
            state = st
            break
    return state, first[:200]


def record(event):
    try:
        out = git(["rev-parse", "--show-toplevel", "--abbrev-ref", "HEAD", "--path-format=absolute", "--git-common-dir"],
                  cwd=event.get("cwd")).splitlines()
        if len(out) < 3:
            return
        top, branch, common = out[0], out[1], out[2]
        if "/.claude/worktrees/" not in top.replace("\\", "/") + "/":
            return
        if not branch or branch == "HEAD":
            return
        ev = event.get("hook_event_name")
        if ev == "UserPromptSubmit":
            p = strip_reminders(event.get("prompt") or "").strip().lower()
            coord = p == "coordinator" or p.startswith("coordinator:")
            upd = {"state": "working"}
            if coord:
                upd["role"] = "coordinator"
        elif ev == "Stop":
            text = event.get("last_assistant_message") or ""
            if not text and event.get("transcript_path"):
                text = tail_text(event["transcript_path"])
            state, line = classify(text)
            upd = {"state": state, "line": line}
            if state == "go":
                blocks = re.findall(r"```[^\n]*\n(.*?)```", text, flags=re.S)
                upd["go"] = blocks[-1].strip() if blocks else ""
        else:
            return

        def fn(d):
            r = d["rows"].setdefault(branch, new_row(branch))
            r.update(upd)
            r["at"] = time.time()
        mutate(fn, common)
    except Exception:
        pass


# ---- CLI ----
def age(t):
    s = max(0, time.time() - t)
    return "%dm" % (s / 60) if s < 3600 else "%dh" % (s / 3600) if s < 86400 else "%dd" % (s / 86400)


def show(peek=False):
    """Print the board (ACT lines, table), write board.md. Returns the lines."""
    # git work first, outside the lock, so a hook's Stop is never held up or lost
    snap = load(board_path())["rows"].values()
    refs = git(["for-each-ref", "--format=%(refname:short)", "refs/heads"]).split()
    ahead_of = {b: git(["rev-list", "--count", "main..%s" % b]) for b in {r["branch"] for r in snap if r["branch"]}}

    def fn(d):
        rows, now = d["rows"], time.time()
        if refs:  # a failed git call never deletes a row
            for k in [k for k, r in rows.items() if not k.startswith("queued:") and r["branch"] not in refs]:
                del rows[k]
        vis = [r for r in rows.values() if r.get("role") != "coordinator"]
        vis.sort(key=lambda r: (ORDER.index(r["state"]) if r["state"] in ORDER else 99, -r["at"]))
        meta = d["meta"]
        n = sum(1 for r in vis if r["state"] == "working")
        head = "BOARD %s · %d working · cap %s" % (time.strftime("%H:%M"), n, meta.get("cap", CAP))
        if meta.get("pace"):
            head += " " + meta["pace"]
        out = [head]
        for r in vis:
            if r["session"] and r["state"] in ACT and r["at"] > r.get("seen", 0):
                out.append("ACT %s %s %s: %s" % (r["state"], r["name"], r["session"], ACT[r["state"]].format(name=r["name"])))
                if not peek:
                    r["seen"] = now

        def table(rs):
            t = ["name | state | age | ahead | session | task/line", "--- | --- | --- | --- | --- | ---"]
            for r in rs:
                st = r["state"] + ("?" if r["state"] == "working" and now - r["at"] > 3 * 3600 else "")
                text = (r["line"] if r["state"] != "working" and r["line"] else r["task"]) or ""
                ahead = ahead_of.get(r["branch"], "")
                t.append("%s | %s | %s | %s | %s | %s" % (r["name"], st, age(r["at"]), ahead or "-", r["session"] or "-", text[:70]))
            return t
        main = [r for r in vis if r["session"]]
        other = [r for r in vis if not r["session"]]
        out += table(main)
        if other:
            out += ["other chats"] + table(other)
        return out
    lines = mutate(fn)
    try:
        md = os.path.join(root(), ".claude", "board.md")
        os.makedirs(os.path.dirname(md), exist_ok=True)
        with open(md, "w", encoding="utf-8", newline="\n") as f:
            f.write("\n".join(lines) + "\n")
    except Exception:
        pass
    return lines


def add(name, branch=None, session=None, task=None, state=None):
    def fn(d):
        rows = d["rows"]
        k = next((k for k, r in rows.items() if r["name"] == name), None)
        if branch and branch in rows:  # the hook already made this row: merge into it
            old = rows.pop(k) if k and k != branch else None
            k = branch
            if old and old.get("task") and task is None:
                rows[branch]["task"] = old["task"]
        key = branch or k or "queued:" + name
        r = rows.pop(k) if k else new_row(branch or "", name)
        r["name"] = name
        if branch:
            r["branch"] = branch
        if session:
            r["session"] = session
        if task is not None:
            r["task"] = task
        if state:
            r["state"] = state
        elif not k or r["state"] == "queued":
            r["state"] = "working"
        r["at"] = time.time()
        rows[key] = r
    mutate(fn)


def with_row(q, fn):
    def inner(d):
        k = find(d["rows"], q)
        if k is None:
            return False
        fn(d, k)
        return True
    return mutate(inner)


def parse_dur(s):
    """'5h', '2d', '4d 20h' (also '90m') to hours."""
    tot = 0.0
    for num, unit in re.findall(r"(\d+(?:\.\d+)?)\s*([dhm]?)", s.lower()):
        tot += float(num) * {"d": 24, "h": 1, "m": 1 / 60, "": 1}[unit]
    return tot


def pace(week, left):
    wk = float(str(week).replace("%", "").strip())
    gone = (168 - parse_dur(left)) / 168 * 100
    ahead = wk - gone
    cap = 1 if ahead > BRAKE or wk >= 90 else CAP
    msg = "PACE: %d%% used, %d%% of the week gone (ahead by %d): cap %d" % (round(wk), round(gone), round(ahead), cap)

    def fn(d):
        d["meta"]["cap"] = cap
        d["meta"]["pace"] = msg
    mutate(fn)
    return msg


def flags(args):
    """Split ['name', '--x', 'v', ...] into (positional, {x: v})."""
    pos, opt, i = [], {}, 0
    while i < len(args):
        if args[i].startswith("--") and i + 1 < len(args):
            opt[args[i][2:]] = args[i + 1]
            i += 2
        else:
            pos.append(args[i])
            i += 1
    return pos, opt


def main(argv):
    try:
        sys.stdout.reconfigure(errors="replace")
    except Exception:
        pass
    if not argv or argv == ["--peek"]:
        print("\n".join(show(peek=bool(argv))))
        return 0
    cmd, (pos, o) = argv[0], flags(argv[1:])
    if cmd == "selftest":
        return selftest()
    if cmd == "pace":
        print(pace(o["week"], o["left"]))
        return 0
    if not pos:
        print("usage: board.py [--peek] | add|set|redo|drop|go <name> | pace | selftest", file=sys.stderr)
        return 2
    name = pos[0]
    if cmd == "add":
        add(name, o.get("branch"), o.get("session"), o.get("task"), o.get("state"))
        return 0
    if cmd == "go":
        got = []
        with_row(name, lambda d, k: got.append(d["rows"][k].get("go", "")))
        if not got or not got[0]:
            print("no go prompt stored for " + name, file=sys.stderr)
            return 1
        print(got[0])
        return 0

    def act(d, k):
        r = d["rows"][k]
        if cmd == "drop":
            del d["rows"][k]
        elif cmd == "redo":
            r["seen"] = 0
        elif cmd == "set":
            if "state" in o:
                r["state"] = o["state"]
            if "note" in o:
                r["line"] = o["note"][:200]
            r["at"] = time.time()
    if cmd not in ("set", "redo", "drop"):
        print("unknown command " + cmd, file=sys.stderr)
        return 2
    if not with_row(name, act):
        print("no row matches " + name, file=sys.stderr)
        return 1
    return 0


def selftest():
    res = {"ok": 0, "bad": 0}

    def check(label, cond):
        res["ok" if cond else "bad"] += 1
        if not cond:
            print("FAIL: " + label)

    tmp = tempfile.mkdtemp(prefix="board-selftest-")
    repo = os.path.join(tmp, "repo")
    os.makedirs(repo)
    ident = ["-c", "user.name=t", "-c", "user.email=t@t"]
    subprocess.run(["git", "init", "-q", "-b", "main", repo], check=True)
    subprocess.run(["git", "-C", repo] + ident + ["commit", "-q", "--allow-empty", "-m", "i"], check=True)
    wts = {}
    for n in ("x", "y"):
        wts[n] = os.path.join(repo, ".claude", "worktrees", n)
        subprocess.run(["git", "-C", repo, "worktree", "add", "-q", wts[n], "-b", "claude/" + n], check=True)
    old = {k: os.environ.get(k) for k in ("BOARD_FILE", "BOARD_ROOT")}
    os.environ["BOARD_FILE"] = os.path.join(tmp, "board.json")
    os.environ["BOARD_ROOT"] = repo
    try:
        def rows():
            return load(os.environ["BOARD_FILE"])["rows"]

        def stop(wt, text, **kw):
            time.sleep(0.05)
            record(dict({"hook_event_name": "Stop", "cwd": wts[wt], "last_assistant_message": text}, **kw))

        def acts():
            return [ln for ln in show() if ln.startswith("ACT ")]

        for text, want in [("NEEDS VERDICT: pics", "verdict"), ("QUESTION: 1. a?", "question"), ("DONE: claude/x", "done"),
                           ("GO PROMPT BELOW:", "go"), ("WAITING: helper", "waiting"), ("**DONE:** claude/x", "done"),
                           ("# QUESTION: q", "question"), ("\nHello there", "idle")]:
            stop("x", text)
            check("prefix " + text, rows()["claude/x"]["state"] == want)
        stop("x", "GO PROMPT BELOW:\n```\nold\n```\ntext\n```md\nRead it\nnow\n```\n")
        check("go block", rows()["claude/x"]["go"] == "Read it\nnow" and rows()["claude/x"]["line"] == "GO PROMPT BELOW:")
        tp = os.path.join(tmp, "t.jsonl")
        with open(tp, "w", encoding="utf-8") as f:
            f.write(json.dumps({"type": "assistant", "message": {"role": "assistant", "content": [{"type": "text", "text": "QUESTION: first"}]}}) + "\n")
            f.write(json.dumps({"type": "assistant", "message": {"role": "assistant", "content": [{"type": "text", "text": "DONE: from transcript"}]}}) + "\n")
            f.write(json.dumps({"type": "user", "message": {"role": "user", "content": "hi"}}) + "\n")
        time.sleep(0.05)
        record({"hook_event_name": "Stop", "cwd": wts["x"], "transcript_path": tp})
        check("transcript fallback", rows()["claude/x"]["state"] == "done" and "transcript" in rows()["claude/x"]["line"])
        n = len(rows())
        record({"hook_event_name": "Stop", "cwd": repo, "last_assistant_message": "DONE: no"})
        check("non-worktree ignored", len(rows()) == n and "main" not in rows())
        record({"hook_event_name": "UserPromptSubmit", "cwd": wts["y"], "prompt": "<system-reminder>a</system-reminder>\nCoordinator"})
        check("coordinator role", rows()["claude/y"]["role"] == "coordinator" and rows()["claude/y"]["state"] == "working")
        stop("y", "DONE: y")
        check("coordinator hidden", "\ny | " not in "\n" + "\n".join(show(peek=True)) and rows()["claude/y"]["role"] == "coordinator")
        add("x", session="local_1")
        stop("x", "DONE: claude/x")
        check("ACT shown", len(acts()) == 1 and not acts())
        subprocess.run(["git", "-C", repo, "branch", "-q", "claude/z"], check=True)
        main(["redo", "x"])
        check("ACT after redo", len(acts()) == 1)
        stop("x", "QUESTION: again")
        check("ACT after newer Stop", len(acts()) == 1 and not acts())
        check("peek keeps ACT", (stop("x", "DONE: p"), len([ln for ln in show(True) if ln.startswith("ACT ")]) == 1 and len(acts()) == 1)[1])
        check("pace 49 / 4d 20h", "cap 1" in pace("49%", "4d 20h") and load(os.environ["BOARD_FILE"])["meta"]["cap"] == 1)
        check("pace 20 / 4d", "cap 3" in pace("20", "4d") and load(os.environ["BOARD_FILE"])["meta"]["cap"] == 3)
        add("q", task="later", state="queued")
        check("queued row", "queued:q" in rows() and rows()["queued:q"]["state"] == "queued")
        add("q", branch="claude/z", session="local_2")
        check("queued moves", "queued:q" not in rows() and rows()["claude/z"]["name"] == "q")
        stop("x", "QUESTION: keep me")
        add("x", branch="claude/x", task="t2")
        r = rows()["claude/x"]
        check("add merges hook row", r["state"] == "question" and r["line"] == "QUESTION: keep me" and r["task"] == "t2")
        lp = os.environ["BOARD_FILE"] + ".lock"
        with open(lp, "w") as f:
            f.write("")
        os.utime(lp, (time.time() - 60, time.time() - 60))
        t0 = time.time()
        stop("x", "DONE: after stale lock")
        check("stale lock cleared", time.time() - t0 < 0.8 and not os.path.exists(lp) and rows()["claude/x"]["state"] == "done")
        n = len(rows())
        os.environ["BOARD_ROOT"] = os.path.join(tmp, "missing")
        show()
        os.environ["BOARD_ROOT"] = repo
        check("git failure keeps rows", len(rows()) == n)
        check("go cli", main(["go", "x"]) == 0 and main(["go", "q"]) == 1)
        check("board under 40 lines", len(show()) < 40)
    finally:
        for k, v in old.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v
    print("board selftest: %d passed, %d failed" % (res["ok"], res["bad"]))
    return 1 if res["bad"] else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
