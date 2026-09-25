"""A git merge driver for the HTML pages: merges as if every ?v= number were
equal, then writes the highest number back. Installed by tools/try.py
(git config merge.cachebust.driver + .git/info/attributes); called by git as
`merge-cachebust.py %O %A %B %L`.
"""

import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

TAG = re.compile(rb"\?v=(\d+)")
BARE_TAG = re.compile(rb"\?v=(?!\d)")


def main() -> int:
    args = sys.argv[1:]
    base, ours, theirs = args[0], args[1], args[2]
    marker_size = int(args[3]) if len(args) > 3 else 7

    base_bytes = Path(base).read_bytes()
    ours_bytes = Path(ours).read_bytes()
    theirs_bytes = Path(theirs).read_bytes()

    top = 0
    for src in (base_bytes, ours_bytes, theirs_bytes):
        for m in TAG.finditer(src):
            top = max(top, int(m.group(1)))

    tmpdir = tempfile.mkdtemp()
    try:
        base_n = Path(tmpdir) / "base"
        ours_n = Path(tmpdir) / "ours"
        theirs_n = Path(tmpdir) / "theirs"
        base_n.write_bytes(TAG.sub(b"?v=", base_bytes))
        ours_n.write_bytes(TAG.sub(b"?v=", ours_bytes))
        theirs_n.write_bytes(TAG.sub(b"?v=", theirs_bytes))

        r = subprocess.run(
            [
                "git", "merge-file", "-p", f"--marker-size={marker_size}",
                "-L", "ours", "-L", "base", "-L", "theirs",
                str(ours_n), str(base_n), str(theirs_n),
            ],
            capture_output=True,
        )
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)

    if r.returncode < 0:
        sys.stderr.write(r.stderr.decode(errors="replace"))
        return 2

    result = r.stdout
    if top:
        result = BARE_TAG.sub(b"?v=" + str(top).encode(), result)

    Path(ours).write_bytes(result)

    return 0 if r.returncode == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
