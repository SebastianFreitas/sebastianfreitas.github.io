"""One cache-busting number for the whole site.

    py -3 bump.py        every ?v= becomes (highest found) + 1
    py -3 bump.py 80     every ?v= becomes 80

Reads and writes bytes, so CRLF line endings survive untouched.
"""

import glob
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

PAGES = [ROOT / "index.html", ROOT / "404.html"] + sorted(ROOT.glob("projects/*.html"))
TAG = re.compile(rb"\?v=(\d+)")

version = int(sys.argv[1]) if len(sys.argv) > 1 else None
sources = {p: open(p, "rb").read() for p in PAGES}

if version is None:
    found = [int(n) for src in sources.values() for n in TAG.findall(src)]
    version = (max(found) + 1) if found else 1

stamp = ("?v=%d" % version).encode()
touched = []
for path, src in sources.items():
    out = TAG.sub(stamp, src)
    if out != src:
        open(path, "wb").write(out)
        touched.append(path)

print("v=%d" % version)
for path in touched:
    print("  " + path.relative_to(ROOT).as_posix())
