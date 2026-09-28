"""One case-page toy, shot in seconds.
usage: py -3 tools/toyshot.py <page> [--out PATH.png] [--t MS] [--y PX|FRAC] [--click-beat KIND]... [--show-beat KIND]
Loads projects/<page>.html at 1440x900 on snap.py's stopped clock, scrolls to
--y (pixels, or a fraction of the max scroll when it is between 0 and 1 and
has a decimal point; default 0), runs --t ms of frames (default snap.TOY_MS)
and writes a viewport shot, by default to snapshots/toys/<page>-<y>.png.
Exits 1 on a console error, a missing toy or a blank toy canvas.
The beats (play key1 key2 key3 door) are read from PlayConclusus.report().beats
(page coordinates). Each --click-beat scrolls its beat to mid-viewport, runs
900 ms of frames, re-reads it, clicks it and runs 1500 ms; --show-beat scrolls
that beat to mid-viewport instead of --y. A null beat (or no
PlayConclusus.report) exits 1.
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

BEATS = ("play", "key1", "key2", "key3", "door")
READ_BEAT = """k => { const P = window.PlayConclusus; const r = P && P.report && P.report(); return (r && r.beats && r.beats[k]) || null; }"""


def read_beat(page, kind):
    beat = page.evaluate(READ_BEAT, kind)
    if not beat:
        return None
    x, y = beat.get("x"), beat.get("y")
    if not isinstance(x, (int, float)) or isinstance(x, bool):
        return None
    if not isinstance(y, (int, float)) or isinstance(y, bool):
        return None
    return beat


def beat_scroll(page, beat):
    ih, sh = page.evaluate("[innerHeight, document.documentElement.scrollHeight]")
    return max(0, min(round(beat["y"] - ih / 2), max(0, sh - ih)))


def main(argv):
    name = None
    out_arg = None
    t_arg = None
    ys = "0"
    clicks = []
    show = None

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
        elif arg == "--click-beat":
            i += 1
            clicks.append(argv[i])
        elif arg == "--show-beat":
            i += 1
            show = argv[i]
        elif name is None:
            name = arg
        i += 1

    if name is None:
        print("usage: py -3 tools/toyshot.py <page> [--out PATH.png] [--t MS] [--y PX|FRAC] [--click-beat KIND]... [--show-beat KIND]")
        return 2

    for kind in clicks + ([show] if show else []):
        if kind not in BEATS:
            print(f"unknown beat: {kind}")
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
        label = f"beat-{show}" if show else ys
        if clicks:
            label += "-after-" + "-".join(clicks)
        out = ROOT / "snapshots" / "toys" / f"{page_name}-{label}.png"
    if out.suffix != ".png":
        print("--out must end in .png")
        return 2
    out.parent.mkdir(parents=True, exist_ok=True)

    snap.ERRORS.clear()
    t0 = time.time()
    failure = None
    httpd, base = snap.nav.start_server()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(args=snap.CHROME)
            ctx, page = snap.new_ctx(browser, snap.nav.DESKTOP, reduced_motion="no-preference")
            page.goto(f"{base}/projects/{page_name}.html")
            page.wait_for_load_state("load")
            snap.settle(page, 1000)

            for kind in clicks:
                beat = read_beat(page, kind)
                if beat is None:
                    failure = f"beat {kind} is null"
                    break
                snap.toy_frame(page, beat_scroll(page, beat), 900)
                beat = read_beat(page, kind)
                if beat is None:
                    failure = f"beat {kind} is null"
                    break
                sx, sy = page.evaluate("[scrollX, scrollY]")
                page.mouse.click(beat["x"] - sx, beat["y"] - sy)
                page.wait_for_timeout(snap.OBSERVE)
                page.clock.run_for(1500)

            if failure is None and show:
                beat = read_beat(page, show)
                if beat is None:
                    failure = f"beat {show} is null"
                else:
                    y = beat_scroll(page, beat)
            elif failure is None:
                if "." in ys and 0 <= float(ys) <= 1:
                    max_y = page.evaluate(
                        "Math.max(0, document.documentElement.scrollHeight - innerHeight)"
                    )
                    y = round(float(ys) * max_y)
                else:
                    y = int(float(ys))

            if failure is None:
                snap.toy_frame(page, y, t)
                ink = snap.toy_ink(page)
                snap.shot(page, out.parent, out.stem)

            ctx.close()
            browser.close()
    finally:
        httpd.shutdown()

    if failure is not None:
        print("FAIL " + failure)
        for err in snap.ERRORS:
            print("ERR " + str(err).splitlines()[0])
        return 1

    status = "no toy canvas" if ink is None else f"canvas {ink['w']}x{ink['h']}, {ink['ink']} inked px"
    extra = ""
    if clicks:
        extra += " beats: " + ",".join(clicks)
    if show:
        extra += f" show: {show}"
    print(f"{out}  y={y}px  t={t}ms  {status}  {time.time() - t0:.1f}s{extra}")
    for err in snap.ERRORS:
        print("ERR " + str(err).splitlines()[0])

    if snap.ERRORS or ink is None or ink["ink"] == 0:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
