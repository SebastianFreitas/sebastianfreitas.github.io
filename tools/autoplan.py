"""Run a multi-phase plan (.claude/plans/<name>.md) unattended.

    py -3 tools/autoplan.py heavylight-page
    py -3 tools/autoplan.py --dry-run --shared

Each loop iteration launches a FRESH headless Claude Code process
(`claude -p ... --output-format stream-json`), which executes exactly one
plan phase and exits. The runner watches that process's context size
live, kills it if it overflows, commits anything left uncommitted, reads
the plan state, and starts the next session. A fresh process means a
cleared context, so nobody has to type /clear or "go" between phases.

Meant to run in a worktree, not the main checkout other sessions are
using (pass --shared to override that check).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PLANS = ROOT / ".claude" / "plans"
STATE = ROOT / "PLAN_STATE.md"
LOGS = ROOT / ".claude" / "autoplan"

_PLAN_NAME = "?"  # set by main() before the loop; safety_commit's message needs it


def find_claude(explicit: str | None) -> str:
    """Resolve the claude CLI path: explicit, PATH, or newest installed version."""
    if explicit:
        if explicit.lower().endswith((".cmd", ".bat")):
            print("Pass the claude.exe path, not a .cmd shim.")
            sys.exit(1)
        return explicit
    found = shutil.which("claude")
    if found and not found.lower().endswith((".cmd", ".bat")):
        return found
    bases = []
    appdata = os.environ.get("APPDATA")
    if appdata:
        bases.append(Path(appdata) / "Claude" / "claude-code")
    localappdata = os.environ.get("LOCALAPPDATA")
    if localappdata:
        packages = Path(localappdata) / "Packages"
        if packages.is_dir():
            for pkg in packages.iterdir():
                if pkg.is_dir() and pkg.name.startswith("Claude_"):
                    bases.append(pkg / "LocalCache" / "Roaming" / "Claude" / "claude-code")
    best_dir = None
    best_key = None
    for base in bases:
        if not base.is_dir():
            continue
        for d in base.iterdir():
            if not d.is_dir():
                continue
            parts = []
            for piece in d.name.split("."):
                if piece.isdigit():
                    parts.append(int(piece))
                else:
                    parts = None
                    break
            if parts is None:
                continue
            if not (d / "claude.exe").exists():
                continue
            key = tuple(parts)
            if best_key is None or key > best_key:
                best_key = key
                best_dir = d
    if best_dir is not None:
        exe = best_dir / "claude.exe"
        if exe.exists():
            return str(exe)
    print("Claude Code CLI not found. Install it (see https://code.claude.com/docs) or pass --claude PATH.")
    sys.exit(1)


def git(*args: str, check: bool = False) -> str:
    """Run git in ROOT, return stdout text (utf-8, replace errors)."""
    result = subprocess.run(
        ["git", *args], cwd=ROOT, capture_output=True, text=True,
        encoding="utf-8", errors="replace",
    )
    if check and result.returncode != 0:
        print(result.stderr, file=sys.stderr)
        sys.exit(1)
    return result.stdout.strip()


def mode() -> str:
    """"worktree" if this checkout's git-common-dir differs from its toplevel, else "shared"."""
    common_dir = git("rev-parse", "--path-format=absolute", "--git-common-dir")
    common_root = os.path.normcase(os.path.abspath(str(Path(common_dir).parent)))
    toplevel = git("rev-parse", "--show-toplevel")
    toplevel = os.path.normcase(os.path.abspath(toplevel))
    return "worktree" if common_root != toplevel else "shared"


def dirty_paths() -> set[str]:
    """Paths reported dirty/untracked by porcelain v1 -z, renames add both old and new path."""
    result = subprocess.run(
        ["git", "status", "--porcelain=v1", "-z", "--untracked-files=all"],
        cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    out = result.stdout
    fields = out.split("\0")
    paths = set()
    i = 0
    while i < len(fields):
        entry = fields[i]
        i += 1
        if not entry:
            continue
        status = entry[:2]
        path = entry[3:]
        paths.add(path)
        if "R" in status or "C" in status:
            # the old path follows as its own NUL-separated field
            paths.add(fields[i])
            i += 1
    return paths


def head() -> str:
    """Current HEAD sha."""
    return git("rev-parse", "HEAD")


def read_plan(name: str) -> dict:
    """Parse .claude/plans/<name>.md: stage, and todo/done counts from the Progress table."""
    text = (PLANS / f"{name}.md").read_text(encoding="utf-8")
    stage = ""
    for line in text.splitlines():
        if line.strip().startswith("Stage:"):
            stage = line.split("Stage:", 1)[1].strip().lower()
            break
    todo = 0
    done = 0
    in_progress = False
    for line in text.splitlines():
        if line.startswith("## Progress"):
            in_progress = True
            continue
        if in_progress and line.startswith("## "):
            break
        if not in_progress:
            continue
        if not line.startswith("| "):
            continue
        rest = line[2:]
        if not rest[:1].isdigit():
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if not cells:
            continue
        last = cells[-1].lower()
        if last.startswith("todo"):
            todo += 1
        elif last.startswith("done"):
            done += 1
    return {"stage": stage, "todo": todo, "done": done}


def read_state() -> dict:
    """Parse PLAN_STATE.md: status, blocker text, next-phase text."""
    if not STATE.exists():
        return {"status": None}
    text = STATE.read_text(encoding="utf-8")
    status = None
    blocker = None
    next_phase = None
    for line in text.splitlines():
        stripped = line.strip()
        if status is None:
            m = re.match(r"status:\s*[`*]*([a-z-]+)", stripped, re.I)
            if m:
                status = m.group(1).lower()
        if blocker is None and (stripped.startswith("- **Blocker:**") or stripped.startswith("Blocker:")):
            blocker = stripped.replace("- **Blocker:**", "").replace("Blocker:", "").strip()
            blocker = blocker.strip("*").strip()
        if next_phase is None and (stripped.startswith("- **Next phase:**") or stripped.startswith("Next phase:")):
            next_phase = stripped.replace("- **Next phase:**", "").replace("Next phase:", "").strip()
            next_phase = next_phase.strip("*").strip()
    return {"status": status, "blocker": blocker, "next_phase": next_phase}


def resolve_plan(explicit: str | None) -> str:
    """Resolve the plan name: CLI arg, .claude/plans/HERE, or the single ready/running plan."""
    if explicit:
        return explicit
    here = PLANS / "HERE"
    if here.exists():
        name = here.read_text(encoding="utf-8").strip()
        if name:
            return name
    candidates = sorted(p for p in PLANS.glob("*.md") if p.name != "TEMPLATE.md")
    active = []
    for p in candidates:
        plan = read_plan(p.stem)
        if plan["stage"] in ("ready", "running"):
            active.append(p.stem)
    if len(active) == 1:
        return active[0]
    print("Plans:")
    for p in candidates:
        plan = read_plan(p.stem)
        print(f"  {p.stem}: {plan['stage']}")
    sys.exit(1)


def session_prompt(name: str, k: int, rescue: dict | None) -> str:
    """Build the -p prompt text for session k of plan name, with an optional rescue note."""
    prompt = f"""[autoplan Â· plan {name} Â· session {k}]
You are running unattended under tools/autoplan.py. Nobody is watching
and nobody will answer: AskUserQuestion is disabled. Follow
.claude/skills/plan/SKILL.md, section "Running unattended".

Read PLAN_STATE.md and execute the next phase.

Work until that phase's Handoff protocol is complete (verified,
committed, PLAN_STATE.md written with its Status line, committed), then
stop. Do not stop early with a progress update. If something blocks
you, write it as the Blocker in PLAN_STATE.md with Status: blocked."""
    if rescue:
        tokens = rescue.get("tokens", 0)
        sha = rescue.get("sha")
        if sha:
            work_note = (
                f"The runner committed its uncommitted files as {sha} (unverified "
                f"work in progress): run `git show --stat {sha}` and verify that "
                "work before building on it."
            )
        else:
            work_note = "It left nothing uncommitted."
        prompt += f"""

The previous session was stopped by the runner at {tokens // 1000}k
context tokens, mid-phase. {work_note}. PLAN_STATE.md may be one phase
stale: trust git log over it, and treat the phase as partial."""
    return prompt


def kill_tree(proc: subprocess.Popen) -> None:
    """Kill proc and its children (taskkill /T on Windows, proc.kill() elsewhere)."""
    if os.name == "nt":
        subprocess.run(["taskkill", "/PID", str(proc.pid), "/T", "/F"], capture_output=True)
    else:
        proc.kill()
    try:
        proc.wait(timeout=30)
    except subprocess.TimeoutExpired:
        pass


def run_session(cmd: list[str], env: dict, log_path: Path, kill_at: int, label: str, warn_line: int) -> dict:
    """Stream a claude -p session, print progress, kill it past kill_at, return a summary dict."""
    try:
        proc = subprocess.Popen(
            cmd, cwd=ROOT, env=env,
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL,
        )
    except FileNotFoundError:
        print(f"Claude CLI not found at: {cmd[0]}")
        sys.exit(1)

    log_file = None
    try:
        log_path.parent.mkdir(parents=True, exist_ok=True)
        log_file = open(log_path, "a", encoding="utf-8", errors="replace")
    except OSError as e:
        print(f"Warning: could not open log file {log_path}: {e}")
        log_file = None

    ctx = 0
    peak = 0
    killed = False
    result = None
    last_boundary = 0

    def stop_child():
        kill_tree(proc)

    try:
        for raw in proc.stdout:
            line = raw.decode("utf-8", errors="replace").lstrip("ï»¿")
            if log_file:
                log_file.write(line)
            stripped = line.strip()
            if not stripped:
                continue
            try:
                event = json.loads(stripped)
            except json.JSONDecodeError:
                print(f"  | {stripped[:200]}")
                continue
            if not isinstance(event, dict):
                print(f"  | {stripped[:200]}")
                continue

            etype = event.get("type")

            if etype == "assistant":
                message = event.get("message", {}) or {}
                is_sub = event.get("parent_tool_use_id") is not None
                usage = message.get("usage") or {}
                if not is_sub:
                    u = usage
                    ctx = (
                        (u.get("input_tokens") or 0)
                        + (u.get("cache_creation_input_tokens") or 0)
                        + (u.get("cache_read_input_tokens") or 0)
                    )
                    peak = max(peak, ctx)
                for block in message.get("content", []) or []:
                    btype = block.get("type")
                    if btype == "tool_use":
                        name = block.get("name", "?")
                        inp = block.get("input", {}) or {}
                        arg = (
                            inp.get("description") or inp.get("file_path")
                            or inp.get("command") or inp.get("pattern")
                            or inp.get("subagent_type") or ""
                        )
                        arg = str(arg).replace("\n", " ")[:90]
                        if is_sub:
                            print(f"    Â· {name} {arg}")
                        else:
                            print(f"{label} {ctx // 1000}k â†’ {name} {arg}")
                    elif btype == "text" and not is_sub:
                        text = block.get("text", "") or ""
                        first_line = text.splitlines()[0] if text.splitlines() else ""
                        print(f"{label} {ctx // 1000}k {first_line[:140]}")
                boundary = ctx // 10000
                if boundary > last_boundary:
                    last_boundary = boundary
                    print(f"context {ctx // 1000}k / line {warn_line // 1000}k")

            elif etype == "system":
                subtype = event.get("subtype")
                if subtype == "compact_boundary":
                    print("compaction happened")
                    killed = True
                elif subtype == "api_retry":
                    print(f"retry attempt {event.get('attempt')} / {event.get('error_status')}")

            elif etype == "result":
                result = {
                    "subtype": event.get("subtype"),
                    "is_error": event.get("is_error"),
                    "total_cost_usd": event.get("total_cost_usd"),
                    "num_turns": event.get("num_turns"),
                    "result": (event.get("result") or "")[:300],
                    "terminal_reason": event.get("terminal_reason"),
                }

            if not killed and ctx >= kill_at:
                killed = True

            if killed and proc.poll() is None:
                print(f"context {ctx // 1000}k â‰¥ kill line: stopping this session")
                stop_child()
                break
    except KeyboardInterrupt:
        stop_child()
        raise
    finally:
        if log_file:
            log_file.close()

    if proc.poll() is None:
        proc.wait()

    cost_known = result is not None
    cost = (result or {}).get("total_cost_usd") or 0.0 if cost_known else 0.0

    return {
        "ctx": ctx,
        "peak": peak,
        "killed": killed,
        "result": result,
        "exit": proc.returncode,
        "cost": float(cost),
        "cost_known": cost_known,
    }


def safety_commit(pre_dirty: set[str], label: str, reason: str) -> str | None:
    """Commit any paths dirtied since pre_dirty (never -a/-A); return the new sha or None."""
    new = dirty_paths() - pre_dirty
    if not new:
        return None
    paths = sorted(new)
    print("Committing uncommitted files:")
    for p in paths:
        print(f"  {p}")
    stdin_paths = "\0".join(paths)
    add_result = subprocess.run(
        ["git", "add", "--pathspec-from-file=-", "--pathspec-file-nul"],
        input=stdin_paths, cwd=ROOT, text=True, encoding="utf-8", capture_output=True,
    )
    if add_result.returncode != 0:
        print(add_result.stderr, file=sys.stderr)
        return None
    commit_result = subprocess.run(
        [
            "git", "commit",
            "-m", f"autoplan {_PLAN_NAME} {label}: uncommitted work at session end ({reason})",
            "-m", "Committed by tools/autoplan.py; unverified.",
            "-m", "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>",
            "--pathspec-from-file=-", "--pathspec-file-nul",
        ],
        input=stdin_paths, cwd=ROOT, text=True, encoding="utf-8", capture_output=True,
    )
    if commit_result.returncode != 0:
        print(commit_result.stderr, file=sys.stderr)
        return None
    sha = head()
    print(f"Committed as {sha}")
    return sha


def print_summary(sessions: list[dict], stop_reason: str) -> None:
    """Print the end-of-run table of sessions, total cost and the stop reason."""
    print()
    print("session Â· exit Â· peak Â· cost Â· status Â· done Â· head")
    total_cost = 0.0
    for s in sessions:
        total_cost += s.get("cost", 0.0)
        cost_str = f"${s['cost']:.2f}" if s.get("cost_known", True) else "?"
        print(
            f"{s['label']} Â· {s['exit']} Â· peak {s['peak'] // 1000}k Â· "
            f"{cost_str} Â· status {s['status']} Â· done {s['done_str']} Â· "
            f"head {s['head']}"
        )
    print(f"total cost: ${total_cost:.2f}")
    print(f"stop reason: {stop_reason}")


def main() -> None:
    """Parse args, run the mode/dirty/stage checks, then drive the main session loop."""
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    parser = argparse.ArgumentParser(description="Run a multi-phase plan unattended.")
    parser.add_argument("plan", nargs="?", default=None)
    parser.add_argument("--max-sessions", type=int, default=30)
    parser.add_argument("--budget", type=float, default=None)
    parser.add_argument("--model", default="claude-opus-5-5")
    parser.add_argument("--effort", default="high")
    parser.add_argument("--permission-mode", default="auto")
    parser.add_argument("--line", type=int, default=90000)
    parser.add_argument("--kill", type=int, default=110000)
    parser.add_argument("--claude", default=None)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--shared", action="store_true")
    args = parser.parse_args()

    if args.kill <= args.line:
        print("--kill must be greater than --line")
        sys.exit(1)

    name = resolve_plan(args.plan)
    claude = find_claude(args.claude)

    m = mode()
    if m == "shared" and not args.shared:
        print(
            "This is the main checkout (shared mode). Plans should run in a "
            "worktree: other sessions edit this tree. Re-run with --shared to "
            "run here anyway."
        )
        sys.exit(1)

    pre_dirty = dirty_paths()
    if m == "worktree" and pre_dirty:
        print("Uncommitted changes found; commit or stash them first:")
        for p in sorted(pre_dirty):
            print(f"  {p}")
        sys.exit(1)

    plan = read_plan(name)
    if plan["stage"] not in ("ready", "running"):
        print(f"Plan {name} stage is '{plan['stage']}', not ready/running.")
        sys.exit(1)

    global _PLAN_NAME
    _PLAN_NAME = name

    first_cmd = [
        claude, "-p", session_prompt(name, 1, None),
        "--output-format", "stream-json", "--verbose",
        "--model", args.model, "--effort", args.effort,
        "--permission-mode", args.permission_mode,
        "--permission-prompts", "none",
        "--disallowedTools", "AskUserQuestion",
        "--settings", json.dumps({"env": {"CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": "75"}}),
    ]
    if args.budget is not None:
        first_cmd += ["--max-budget-usd", f"{args.budget:.2f}"]

    if args.dry_run:
        print(f"plan: {name}")
        print(f"stage: {plan['stage']}")
        print(f"mode: {m}")
        print(f"claude: {claude}")
        print("command:")
        print(" ".join(json.dumps(c) if " " in c or c == "" else c for c in first_cmd))
        sys.exit(0)

    sessions = []
    spent = 0.0
    partial_streak = 0
    last_key = None
    rescue = None
    stop_reason = "max sessions reached"
    exit_code = 1
    error_streak = 0
    run_dir = LOGS / name / time.strftime("%Y%m%d-%H%M%S")

    try:
        k = 1
        while k <= args.max_sessions:
            plan = read_plan(name)
            if plan["stage"] == "done":
                stop_reason = "plan done"
                exit_code = 0
                break
            if args.budget is not None and spent >= args.budget:
                stop_reason = "budget reached"
                break

            label = f"s{k}"
            remaining = None if args.budget is None else max(args.budget - spent, 0.0)
            cmd = [
                claude, "-p", session_prompt(name, k, rescue),
                "--output-format", "stream-json", "--verbose",
                "--model", args.model, "--effort", args.effort,
                "--permission-mode", args.permission_mode,
                "--permission-prompts", "none",
                "--disallowedTools", "AskUserQuestion",
                "--settings", json.dumps({"env": {"CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": "75"}}),
            ]
            if remaining is not None:
                cmd += ["--max-budget-usd", f"{remaining:.2f}"]

            env = os.environ.copy()
            env["AUTOPLAN"] = "1"
            env["AUTOPLAN_SESSION"] = str(k)
            env["AUTOPLAN_PLAN"] = name

            log_path = run_dir / f"{label}.jsonl"

            start_head = head()
            res = run_session(cmd, env, log_path, args.kill, label, args.line)
            spent += res["cost"]
            if not res["cost_known"]:
                print("  cost unknown (session killed); --budget undercounts")

            if res["killed"]:
                reason = f"killed at {res['peak'] // 1000}k"
            else:
                reason = "session ended"
            sha = safety_commit(pre_dirty, label, reason)
            if sha is None and (dirty_paths() - pre_dirty):
                stop_reason = "safety commit failed"
                sessions.append({
                    "label": label, "exit": res["exit"], "peak": res["peak"],
                    "cost": res["cost"], "cost_known": res["cost_known"], "status": None,
                    "done_str": f"{plan['done']}/{plan['done'] + plan['todo']}",
                    "head": head()[:7],
                })
                break

            state = read_state()
            plan = read_plan(name)
            status = state.get("status")

            new_head = head()

            sessions.append({
                "label": label,
                "exit": res["exit"],
                "peak": res["peak"],
                "cost": res["cost"],
                "cost_known": res["cost_known"],
                "status": status,
                "done_str": f"{plan['done']}/{plan['done'] + plan['todo']}",
                "head": new_head[:7],
            })
            cost_str = f"${res['cost']:.2f}" if res["cost_known"] else "?"
            print(
                f"{label} Â· {res['exit']} Â· peak {res['peak'] // 1000}k Â· "
                f"{cost_str} Â· status {status} Â· "
                f"done {plan['done']}/{plan['done'] + plan['todo']} Â· head {new_head[:7]}"
            )

            if plan["stage"] == "done" or status == "plan-done":
                stop_reason = "plan done"
                exit_code = 0
                break

            no_result_error = (res["result"] is None and not res["killed"]) or (
                res["result"] is not None and res["result"].get("is_error") and not res["killed"]
            )
            if no_result_error:
                text = ""
                if res["result"]:
                    text = f"{res['result'].get('result', '')} {res['result'].get('terminal_reason', '')}"
                if "login" in text.lower() or "auth" in text.lower():
                    print("Not logged in: run the claude CLI once in a terminal and use /login, then re-run.")
                    stop_reason = "not logged in"
                    break
                error_streak += 1
                if error_streak >= 2:
                    stop_reason = "session errored twice in a row"
                    break
                print(f"Session errored; retrying in 60s.")
                time.sleep(60)
                continue
            error_streak = 0

            if status == "blocked":
                stop_reason = f"blocked: {state.get('blocker')}"
                break

            if res["killed"]:
                rescue = {"tokens": res["peak"], "sha": sha}
                k += 1
                continue

            if new_head == start_head and sha is None:
                text = res["result"].get("result", "") if res["result"] else ""
                print(f"No progress: the session made no commit. {text}")
                stop_reason = "no progress: the session made no commit"
                break

            if status == "partial":
                key = (plan["done"], "partial")
                partial_streak = partial_streak + 1 if key == last_key else 1
                last_key = key
                if partial_streak >= 3:
                    stop_reason = "same phase partial 3 times: split it in the plan"
                    break
                rescue = None
                k += 1
                continue

            partial_streak = 0
            rescue = None
            k += 1
    except KeyboardInterrupt:
        safety_commit(pre_dirty, f"s{k}", "interrupted")
        print_summary(sessions, "interrupted")
        sys.exit(130)

    print_summary(sessions, stop_reason)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()

