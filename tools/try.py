"""Try a cloud session's branch locally, without touching the main checkout.

    py -3 tools/try.py claude/adoring-fermi-87uf0y --path "/?genesis=1"

Checks the branch out into a reusable sibling worktree and serves it with
serve.py on a free port, opening it in the browser.
"""

from __future__ import annotations

import argparse
import socket
import subprocess
import sys
import time
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TRY_DIR = ROOT.parent / (ROOT.name + "-try")


def git(*args: str, cwd: Path = ROOT, check: bool = True) -> str:
    result = subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True)
    if check and result.returncode != 0:
        print(result.stderr, file=sys.stderr)
        sys.exit(1)
    return result.stdout.strip()


def free_port(start: int) -> int:
    for p in range(start, start + 50):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", p))
                return p
            except OSError:
                continue
    return start


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("branch")
    parser.add_argument("--port", type=int, default=8766)
    parser.add_argument("--path", default="/")
    parser.add_argument("--no-open", action="store_true")
    args = parser.parse_args()

    branch = args.branch
    if branch.startswith("origin/"):
        branch = branch[len("origin/"):]
    if "/" not in branch:
        branch = "claude/" + branch

    fetch = subprocess.run(["git", "fetch", "origin", branch], cwd=ROOT, capture_output=True, text=True)
    if fetch.returncode != 0:
        print(f"No branch origin/{branch}. Open cloud branches:")
        subprocess.run(["git", "fetch", "origin", "--prune"], cwd=ROOT, capture_output=True, text=True)
        listing = git(
            "for-each-ref",
            "--sort=-committerdate",
            "refs/remotes/origin/claude",
            "--format=%(refname:short)  %(committerdate:relative)  %(subject)",
        )
        print(listing)
        sys.exit(1)

    sha = git("rev-parse", "--short", f"origin/{branch}")
    subject = git("log", "-1", "--format=%s", f"origin/{branch}")

    if not TRY_DIR.exists():
        git("worktree", "prune", check=False)
        git("worktree", "add", "--detach", str(TRY_DIR), f"origin/{branch}")
    elif (TRY_DIR / ".git").exists():
        git("checkout", "--detach", "--force", f"origin/{branch}", cwd=TRY_DIR)
        git("clean", "-fd", cwd=TRY_DIR)
    else:
        print(f"{TRY_DIR} exists and is not a git worktree; move it away and re-run.")
        sys.exit(1)

    if not (TRY_DIR / "serve.py").exists():
        print(f"{TRY_DIR / 'serve.py'} is missing.")
        sys.exit(1)

    port = free_port(args.port)

    proc = subprocess.Popen([sys.executable, str(TRY_DIR / "serve.py"), str(port)], cwd=TRY_DIR)

    path = args.path if args.path.startswith("/") else "/" + args.path
    url = f"http://127.0.0.1:{port}{path}"
    print(f"Trying {branch} @ {sha}  {subject}")
    print(f"Tree:  {TRY_DIR}")
    print(f"Open:  {url}")
    print("Ctrl+C stops the server.")

    time.sleep(0.8)
    if not args.no_open:
        webbrowser.open(url)

    try:
        proc.wait()
    except KeyboardInterrupt:
        proc.terminate()
        proc.wait(timeout=5)
        print("Stopped.")


if __name__ == "__main__":
    main()
