"""Portfolio hooks for the shared tools/try.py: the ?v= merge driver, --port/--path for Try, serve.py as the launcher, and bump.py on the combined tree before a commit."""

from __future__ import annotations

import socket
import subprocess
import sys
from pathlib import Path


def _git(*args: str, cwd: Path) -> str:
    result = subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True)
    return result.stdout.strip()


def setup(root: Path) -> None:
    script = root / "tools" / "merge-cachebust.py"
    if not script.exists():
        return
    cmd = f'"{Path(sys.executable).as_posix()}" "{script.as_posix()}" %O %A %B %L'
    if _git("config", "--get", "merge.cachebust.driver", cwd=root) != cmd:
        _git("config", "merge.cachebust.name", "HTML pages, ignoring ?v= cache-bust numbers", cwd=root)
        _git("config", "merge.cachebust.driver", cmd, cwd=root)

    common_dir = _git("rev-parse", "--git-common-dir", cwd=root)
    attrs = (root / common_dir).resolve() / "info" / "attributes"
    attrs.parent.mkdir(parents=True, exist_ok=True)
    line = "*.html merge=cachebust"
    if attrs.exists():
        existing = attrs.read_text(encoding="utf-8")
        lines = existing.splitlines()
    else:
        existing = ""
        lines = []
    if line not in lines:
        prefix = existing if (not existing or existing.endswith("\n")) else existing + "\n"
        attrs.write_text(prefix + line + "\n", encoding="utf-8", newline="\n")


def add_arguments(parser) -> None:
    parser.add_argument("--port", type=int, default=8766, help="first port to try for serve.py")
    parser.add_argument("--path", default="/", help="URL path to open, e.g. /projects/voidscape.html")


def _free_port(start: int) -> int:
    for port in range(start, start + 51):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            try:
                sock.bind(("127.0.0.1", port))
            except OSError:
                continue
            return port
    return start


def before_commit(tree: Path) -> bool:
    bump = subprocess.run([sys.executable, str(tree / "tools" / "bump.py")], cwd=tree, capture_output=True, text=True)
    if bump.returncode != 0:
        print(bump.stderr)
        return False
    return True


def launch(tree: Path, args, is_main: bool):
    port = _free_port(args.port)
    path = args.path if args.path.startswith("/") else "/" + args.path
    if not (tree / "serve.py").exists():
        print(f"{tree / 'serve.py'} is missing.")
        return None, None
    proc = subprocess.Popen([sys.executable, str(tree / "serve.py"), str(port)], cwd=tree)
    return proc, f"http://127.0.0.1:{port}{path}"
