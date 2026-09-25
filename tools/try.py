"""Try a session's branch locally, without touching the main checkout.

    py -3 tools/try.py claude/adoring-fermi-87uf0y --path "/?genesis=1"
    py -3 tools/try.py claude/adoring-fermi-87uf0y --commit

Checks the branch out into a reusable sibling worktree and serves it with
serve.py on a free port, opening it in the browser.

Commit squashes the branch into ONE commit on main in the main checkout (the
one GitHub Desktop shows), bumps ?v= in that same commit, merges main back
into the session's worktree branch so follow-up rounds stay clean, and never
pushes or deletes anything: the owner pushes with GitHub Desktop.
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


def commit(branch: str, ref: str, subject: str) -> None:
    wt = worktree_of(branch)
    if wt and git("status", "--porcelain", cwd=wt, check=False):
        print(f"Note: {wt} has uncommitted files; only its commits go in.")

    current = git("rev-parse", "--abbrev-ref", "HEAD", check=False)
    if current != "main":
        print(f"The main checkout ({ROOT}) is on {current}, not main. Switch to main in GitHub Desktop and run this again. Nothing changed.")
        sys.exit(1)

    dirty = git("status", "--porcelain", "--untracked-files=no")
    if dirty:
        print("The main checkout has uncommitted changes; commit or discard them in GitHub Desktop first. Nothing changed:")
        for line in dirty.splitlines():
            print(f"  {line}")
        sys.exit(1)

    subprocess.run(["git", "fetch", "origin", "main"], cwd=ROOT, capture_output=True, text=True)
    if git("rev-parse", "--verify", "--quiet", "refs/remotes/origin/main", check=False):
        behind = subprocess.run(
            ["git", "merge-base", "--is-ancestor", "origin/main", "main"], cwd=ROOT,
        ).returncode != 0
        if behind:
            print("origin/main has commits your main lacks. Pull (Fetch origin, then Pull) in GitHub Desktop first, then run this again. Nothing changed.")
            sys.exit(1)

    n = git("rev-list", "--count", "--no-merges", f"main..{ref}")
    if n == "0":
        print(f"{branch} has nothing that main lacks. Nothing to commit.")
        return

    titles = git("log", "--reverse", "--no-merges", "--format=- %s", f"main..{ref}")
    trailer_lines = git("log", "--format=%(trailers:key=Co-Authored-By,valueonly)", f"main..{ref}").splitlines()
    trailers = []
    for t in trailer_lines:
        if t and t not in trailers:
            trailers.append(t)

    r = subprocess.run(["git", "merge", "--squash", ref], cwd=ROOT, capture_output=True, text=True)
    if r.returncode != 0:
        files = git("diff", "--name-only", "--diff-filter=U", check=False)
        git("reset", "--merge", check=False)
        print("Conflicts with main, nothing changed:")
        if files:
            for f in files.splitlines():
                print(f"  {f}")
        else:
            print(r.stderr or r.stdout)
        print("In that session, ask Claude to merge main into its branch and resolve, then run this again.")
        sys.exit(1)

    bump = subprocess.run([sys.executable, str(ROOT / "tools" / "bump.py")], cwd=ROOT, capture_output=True, text=True)
    if bump.returncode != 0:
        print(bump.stderr)
        git("reset", "--hard", "HEAD", check=False)
        print("bump.py failed; nothing changed.")
        sys.exit(1)

    git("add", "-u")
    msg = subject + "\n\n" + f"Squashed from {branch}:\n" + titles
    if trailers:
        msg += "\n\n" + "\n".join("Co-Authored-By: " + t for t in trailers)
    c = subprocess.run(["git", "commit", "-q", "-F", "-"], input=msg, cwd=ROOT, text=True, capture_output=True)
    if c.returncode != 0:
        print(c.stderr)
        sys.exit(1)

    sha = git("rev-parse", "--short", "HEAD")

    if wt:
        if git("status", "--porcelain", cwd=wt, check=False) == "":
            m = subprocess.run(["git", "merge", "-q", "--no-edit", "main"], cwd=wt, capture_output=True, text=True)
            if m.returncode != 0:
                subprocess.run(["git", "merge", "--abort"], cwd=wt, capture_output=True, text=True)
                print(f"Could not merge main back into {branch} ({wt}); ask Claude in that session to merge main before its next round.")
            else:
                print(f"Merged main back into {branch}, so the next round there starts from this commit.")
        else:
            print(f"{branch} was not synced (uncommitted files there); ask Claude to merge main before its next round.")

    print(f"Committed {sha} on main: {subject}")
    print("Nothing was pushed. Review it in GitHub Desktop (History), then Push origin. To take it back before pushing: History, right-click it, Undo commit.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("branch")
    parser.add_argument("--port", type=int, default=8766)
    parser.add_argument("--path", default="/")
    parser.add_argument("--no-open", action="store_true")
    parser.add_argument("--commit", action="store_true")
    args = parser.parse_args()

    branch, ref = resolve(args.branch)
    sha = git("rev-parse", "--short", ref)
    subject = git("log", "-1", "--format=%s", ref)

    if args.commit:
        commit(branch, ref, subject)
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
        print("Enter = stop.  Type commit + Enter = squash it into main as one commit (nothing is pushed).")
        while True:
            try:
                ans = input("> ").strip().lower()
            except (EOFError, KeyboardInterrupt):
                ans = ""
            if ans == "commit":
                proc.terminate()
                proc.wait(timeout=5)
                commit(branch, ref, subject)
                return
            elif ans == "":
                proc.terminate()
                proc.wait(timeout=5)
                print("Stopped.")
                break
            else:
                print("Type commit or press Enter.")
    else:
        try:
            proc.wait()
        except KeyboardInterrupt:
            proc.terminate()
            proc.wait(timeout=5)
            print("Stopped.")


if __name__ == "__main__":
    main()
