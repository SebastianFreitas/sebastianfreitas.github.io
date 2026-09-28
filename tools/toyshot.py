"""One case-page toy, shot in seconds.
usage: py -3 tools/toyshot.py <page> [--out PATH.png] [--t MS] [--y PX|FRAC]
Loads projects/<page>.html at 1440x900 on snap.py's stopped clock, scrolls to
--y (pixels, or a fraction of the max scroll when it is between 0 and 1 and
has a decimal point; default 0), runs --t ms of frames (default snap.TOY_MS)
and writes a viewport shot, by default to snapshots/toys/<page>-<y>.png.
Exits 1 on a console error, a missing toy or a blank toy canvas.
Viewport only: a full-page shot resizes the viewport and play.js clears the
toy canvas on resize. snap.py's page-<name>-toy scenes are the regression set.
"""

import sys
import time
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("snap", ROOT / "tools" / "snap.py")
snap = importlib.util.module_from_spec(spec)
spec.loader.exec_module(snap)

from playwright.sync_api import sync_playwright


def main(argv):
    name = None
    out_arg = None
    t_arg = None
    ys = "0"

    i = 0
    while i < len(argv):
        arg = argv[i]
        if arg == "--out":
            i += 1
            out_arg = argv[i]
        elif arg == "--t":
            i += 1
            t_arg = argv[i]
        elif arg == "--y":
            i += 1
            ys = argv[i]
        elif name is None:
            name = arg
        i += 1

    if name is None:
        print("usage: py -3 tools/toyshot.py <page> [--out PATH.png] [--t MS] [--y PX|FRAC]")
        return 2

    page_name = name
    if page_name.startswith("projects/"):
        page_name = page_name[len("projects/"):]
    if page_name.endswith(".html"):
        page_name = page_name[:-len(".html")]

    html_path = ROOT / "projects" / f"{page_name}.html"
    if not html_path.exists():
        print(f"no such page: projects/{page_name}.html")
        return 2

    t = int(float(t_arg)) if t_arg is not None else snap.TOY_MS

    if out_arg is not None:
        out = Path(out_arg)
    else:
        out = ROOT / "snapshots" / "toys" / f"{page_name}-{ys}.png"
    if out.suffix != ".png":
        print("--out must end in .png")
        return 2
    out.parent.mkdir(parents=True, exist_ok=True)

    snap.ERRORS.clear()
    t0 = time.time()
    httpd, base = snap.nav.start_server()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(args=snap.CHROME)
            ctx, page = snap.new_ctx(browser, snap.nav.DESKTOP, reduced_motion="no-preference")
            page.goto(f"{base}/projects/{page_name}.html")
            page.wait_for_load_state("load")
            snap.settle(page, 1000)

            if "." in ys and 0 <= float(ys) <= 1:
                max_y = page.evaluate(
                    "Math.max(0, document.documentElement.scrollHeight - innerHeight)"
                )
                y = round(float(ys) * max_y)
            else:
                y = int(float(ys))

            snap.toy_frame(page, y, t)
            ink = snap.toy_ink(page)
            snap.shot(page, out.parent, out.stem)

            ctx.close()
            browser.close()
    finally:
        httpd.shutdown()

    status = "no toy canvas" if ink is None else f"canvas {ink['w']}x{ink['h']}, {ink['ink']} inked px"
    print(f"{out}  y={y}px  t={t}ms  {status}  {time.time() - t0:.1f}s")
    for err in snap.ERRORS:
        print("ERR " + str(err).splitlines()[0])

    if snap.ERRORS or ink is None or ink["ink"] == 0:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
