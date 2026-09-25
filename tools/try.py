"""Try a session's branch locally, without touching the main checkout.

    py -3 tools/try.py claude/adoring-fermi-87uf0y --path "/?genesis=1"
    py -3 tools/try.py claude/adoring-fermi-87uf0y --ship

Checks the branch out into a reusable sibling worktree and serves it with
serve.py on a free port, opening it in the browser.

Ship merges the branch into main inside the side worktree, bumps ?v=, pushes,
and deletes the branch unless a worktree still has it checked out; on a
conflict it pushes nothing. The branch may live only locally (a worktree
session) or on origin (a cloud session).
"""

from __future__ import annotations

import argparse
import socket
import subprocess
import sys
import time
import webbrowser
from pathlib import Path

def _main_root() -> Path:
    here = Path(__file__).resolve().parent.parent
    r = subprocess.run(["git", "rev-parse", "--git-common-dir"], cwd=here, capture_output=True, text=True)
    if r.returncode != 0:
        return here
    return (here / r.stdout.strip()).resolve().parent

ROOT = _main_root()
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


def resolve(name: str) -> tuple[str, str]:
    """Returns (branch, ref): ref is 'origin/<branch>' when the remote copy is
    the newest, else the local branch name. Exits with a listing if neither exists."""
    if name.startswith("origin/"):
        name = name[len("origin/"):]
    if name == "main":
        print("Give a session branch, not main.")
        sys.exit(1)

    candidates = [name]
    if "/" not in name:
        candidates.append("claude/" + name)

    for c in candidates:
        local = git("rev-parse", "--verify", "--quiet", f"refs/heads/{c}", check=False) != ""
        subprocess.run(["git", "fetch", "origin", c], cwd=ROOT, capture_output=True, text=True)
        remote = git("rev-parse", "--verify", "--quiet", f"refs/remotes/origin/{c}", check=False) != ""

        if not local and not remote:
            continue
        if local and not remote:
            return c, c
        if remote and not local:
            return c, f"origin/{c}"

        ahead = subprocess.run(
            ["git", "merge-base", "--is-ancestor", f"origin/{c}", c], cwd=ROOT,
        ).returncode == 0
        if ahead:
            return c, c
        return c, f"origin/{c}"

    print(f"No branch {name}, locally or on origin. Session branches:")
    subprocess.run(["git", "fetch", "origin", "--prune"], cwd=ROOT, capture_output=True, text=True)
    listing = git(
        "for-each-ref",
        "--sort=-committerdate",
        "refs/heads/claude", "refs/remotes/origin/claude",
        "--format=%(refname:short)  %(committerdate:relative)  %(subject)",
        check=False,
    )
    print(listing)
    sys.exit(1)


def ensure_tree(ref: str) -> None:
    if not TRY_DIR.exists():
        git("worktree", "prune", check=False)
        git("worktree", "add", "--detach", str(TRY_DIR), ref)
    elif (TRY_DIR / ".git").exists():
        git("checkout", "--detach", "--force", ref, cwd=TRY_DIR)
        git("clean", "-fd", cwd=TRY_DIR)
    else:
        print(f"{TRY_DIR} exists and is not a git worktree; move it away and re-run.")
        sys.exit(1)


def worktree_of(branch: str) -> Path | None:
    """Path of the worktree that has `branch` checked out, else None."""
    listing = git("worktree", "list", "--porcelain", check=False)
    path = None
    for entry in listing.split("\n\n"):
        path = None
        for line in entry.splitlines():
            if line.startswith("worktree "):
                path = line[len("worktree "):]
            elif line == f"branch refs/heads/{branch}":
                return Path(path)
    return None


def ship(branch: str, ref: str, subject: str) -> None:
    wt = worktree_of(branch)
    if wt and git("status", "--porcelain", cwd=wt, check=False):
        print(f"Note: {wt} has uncommitted files; only commits ship.")

    git("fetch", "origin", "main")
    ensure_tree("origin/main")

    r = subprocess.run(
        ["git", "merge", "--no-ff", "-m", f"Merge {branch}: {subject}", ref],
        cwd=TRY_DIR, capture_output=True, text=True,
    )
    if r.returncode != 0:
        files = git("diff", "--name-only", "--diff-filter=U", cwd=TRY_DIR, check=False)
        git("merge", "--abort", cwd=TRY_DIR, check=False)
        print("Conflicts with main, nothing was pushed:")
        if files:
            for f in files.splitlines():
                print(f"  {f}")
        else:
            print(r.stderr or r.stdout)
        print("Ask Claude to merge it.")
        sys.exit(1)

    bump = subprocess.run([sys.executable, str(TRY_DIR / "tools" / "bump.py")], cwd=TRY_DIR, capture_output=True, text=True)
    if bump.returncode != 0:
        print(bump.stderr)
        git("reset", "--hard", "origin/main", cwd=TRY_DIR)
        print("bump.py failed, nothing was pushed.")
        sys.exit(1)

    if git("status", "--porcelain", cwd=TRY_DIR):
        git("commit", "-q", "-am", f"Bump ?v= after merging {branch}", cwd=TRY_DIR)

    p = subprocess.run(["git", "push", "origin", "HEAD:main"], cwd=TRY_DIR, capture_output=True, text=True)
    if p.returncode != 0:
        print(p.stderr)
        print("main moved while shipping; nothing was pushed. Run the same command again.")
        sys.exit(1)

    if git("rev-parse", "--verify", "--quiet", f"refs/remotes/origin/{branch}", check=False):
        git("push", "origin", "--delete", branch, check=False)
    sha = git("rev-parse", "--short", "HEAD", cwd=TRY_DIR)

    if git("rev-parse", "--abbrev-ref", "HEAD", check=False) == "main" and git("status", "--porcelain", check=False) == "":
        git("pull", "-q", "--ff-only", "origin", "main", check=False)
        print("Your checkout is up to date.")
    else:
        print("Your checkout has local changes or is not on main; run  git pull  when ready.")

    if wt:
        print(f"Branch {branch} stays checked out in {wt}; archive its session to remove it, or ship again after more commits.")
    elif git("rev-parse", "--verify", "--quiet", f"refs/heads/{branch}", check=False):
        git("branch", "-d", branch, check=False)

    print(f"Shipped {branch} to main at {sha}. GitHub Pages goes live in a minute or two.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("branch")
    parser.add_argument("--port", type=int, default=8766)
    parser.add_argument("--path", default="/")
    parser.add_argument("--no-open", action="store_true")
    parser.add_argument("--ship", action="store_true")
    args = parser.parse_args()

    branch, ref = resolve(args.branch)
    sha = git("rev-parse", "--short", ref)
    subject = git("log", "-1", "--format=%s", ref)

    if args.ship:
        ship(branch, ref, subject)
        return

    ensure_tree(ref)

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

    if sys.stdin.isatty():
        print("Enter = stop.  Type ship + Enter = merge into main and push.")
        while True:
            try:
                ans = input("> ").strip().lower()
            except (EOFError, KeyboardInterrupt):
                ans = ""
            if ans == "ship":
                proc.terminate()
                proc.wait(timeout=5)
                ship(branch, ref, subject)
                return
            elif ans == "":
                proc.terminate()
                proc.wait(timeout=5)
                print("Stopped.")
                break
            else:
                print("Type ship or press Enter.")
    else:
        try:
            proc.wait()
        except KeyboardInterrupt:
            proc.terminate()
            proc.wait(timeout=5)
            print("Stopped.")


if __name__ == "__main__":
    main()
