"""Portfolio hooks for the shared tools/try.py: the ?v= merge driver, bump.py before a commit, and serve.py for Try."""

from __future__ import annotations

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


def before_commit(root: Path) -> bool:
    bump = subprocess.run([sys.executable, str(root / "tools" / "bump.py")], cwd=root, capture_output=True, text=True)
    if bump.returncode != 0:
        print(bump.stderr)
        return False
    return True


def launch(tree: Path, port: int, path: str):
    if not (tree / "serve.py").exists():
        print(f"{tree / 'serve.py'} is missing.")
        return None, None
    proc = subprocess.Popen([sys.executable, str(tree / "serve.py"), str(port)], cwd=tree)
    return proc, f"http://127.0.0.1:{port}{path}"
