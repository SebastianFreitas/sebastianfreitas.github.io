"""One case-page toy, shot in seconds.
usage: py -3 tools/toyshot.py <page> [--out PATH.png] [--t MS] [--y PX|FRAC] [--beat KIND]
Loads /#<page> (the open folder) at 1440x900 on snap.py's stopped clock, scrolls to
--y (pixels, or a fraction of the folder's extent when it is between 0 and 1 and
has a decimal point; default 0), runs --t ms of frames (default snap.TOY_MS)
and writes a viewport shot, by default to snapshots/toys/<page>-<y>.png.
Exits 1 on a console error, a missing toy or a blank toy canvas.
The beats (idle hover tp after) are the Conclusus stage level's states, read from
PlayConclusus.report() (viewport coordinates): the stage is scrolled to mid-viewport and
settled 900 ms, then idle = the stage at rest; hover = the mouse on targets.tl (ghost not
null); tp = a click on targets.tr, shot 150 ms later (bursts > 0); after = the same click
then 1500 ms (bursts 0, teleports >= 1). A missing report, target or expectation exits 1.
A beat shot is taken as the beat leaves it (no further frames). A page with figure.gp-stage
is judged on that stage canvas, scrolled to mid-viewport unless --y is given.
heavylight with no --y and no beat flag is shot mid-ride: the stage is scrolled to
mid-viewport, frames run until PlayHeavyLight.report() is ready and painted, lamp
'left' is clicked at its centre, about 1000 ms of frames run (--t overrides) and the
shot is written (default snapshots/toys/heavylight-ride.png). Exit 1 with a FAIL
line on: no report or no 'left' lamp, a blank stage canvas, a console error, or
man.moving false at the shot.
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

BEATS = ("idle", "hover", "tp", "after")
REPORT = """() => { const P = window.PlayConclusus; return (P && P.report && P.report()) || null; }"""


def beat_scroll(page, beat):
    ih, sh = page.evaluate("[innerHeight, document.documentElement.scrollHeight]")
    return max(0, min(round(beat["y"] - ih / 2), max(0, sh - ih)))


def run_beat(page, kind):
    """Drive one Conclusus beat on the settled stage; returns a failure string or None."""
    r = page.evaluate(REPORT)
    if not r or not r.get("targets"):
        return "no PlayConclusus.report() targets"
    if kind == "idle":
        return None
    if kind == "hover":
        pt = r["targets"].get("tl")
    else:
        pt = r["targets"].get("tr")
    if not pt:
        return f"beat {kind} has no target"
    page.mouse.move(pt["x"], pt["y"])
    if kind == "hover":
        page.wait_for_timeout(snap.OBSERVE)
        page.clock.run_for(150)
        r = page.evaluate(REPORT)
        return None if r and r.get("ghost") else "hover: report().ghost is null"
    page.mouse.down()
    page.mouse.up()
    page.wait_for_timeout(snap.OBSERVE)
    if kind == "tp":
        page.clock.run_for(150)
        r = page.evaluate(REPORT)
        return None if r and r.get("bursts", 0) > 0 else "tp: no bursts 150 ms after the click"
    page.clock.run_for(1500)
    r = page.evaluate(REPORT)
    if not r or r.get("bursts") != 0 or r.get("teleports", 0) < 1:
        return f"after: bursts={r and r.get('bursts')} teleports={r and r.get('teleports')}"
    return None


def main(argv):
    name = None
    out_arg = None
    t_arg = None
    ys = None
    beat = None

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
        elif arg == "--beat":
            i += 1
            beat = argv[i]
        elif name is None:
            name = arg
        i += 1

    if name is None:
        print("usage: py -3 tools/toyshot.py <page> [--out PATH.png] [--t MS] [--y PX|FRAC] [--beat KIND]")
        return 2

    if beat is not None and beat not in BEATS:
        print(f"unknown beat: {beat}")
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

    ride = page_name == "heavylight" and ys is None and beat is None
    t = int(float(t_arg)) if t_arg is not None else (1000 if ride else snap.TOY_MS)

    if out_arg is not None:
        out = Path(out_arg)
    else:
        label = f"beat-{beat}" if beat else ("ride" if ride else (ys or "0"))
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

            if ys is None and page.evaluate("!!document.querySelector('figure.gp-stage')"):
                y = beat_scroll(page, {"y": page.evaluate(
                    "(() => { const r = document.querySelector('figure.gp-stage').getBoundingClientRect(); return r.top + r.height / 2 + scrollY; })()")})
                if beat is not None:
                    snap.toy_frame(page, y, 900)
                    failure = run_beat(page, beat)
            elif beat is not None:
                failure = "--beat needs a page with figure.gp-stage and no --y"
            elif ys is None:
                y = 0
            elif "." in ys and 0 <= float(ys) <= 1:
                lo, hi = page.evaluate(
                    "[0, Math.max(0, document.documentElement.scrollHeight - innerHeight)]"
                )
                y = round(lo + float(ys) * (hi - lo))
            else:
                y = int(float(ys))

            if failure is None and ride:
                snap.toy_frame(page, y, 100)
                read = "(() => { const P = window.PlayHeavyLight; return (P && P.report && P.report()) || null; })()"
                rep = page.evaluate(read)
                for _ in range(40):
                    if rep and rep.get("ready") and rep.get("painted"):
                        break
                    page.clock.run_for(100)
                    rep = page.evaluate(read)
                lamp = None
                if rep and rep.get("ready") and rep.get("painted"):
                    lamp = next((l for l in rep.get("lamps") or [] if l.get("id") == "left"), None)
                if lamp is None:
                    failure = "no PlayHeavyLight report, stage not ready, or no 'left' lamp"
                else:
                    page.mouse.click(lamp["cx"], lamp["cy"])
                    page.wait_for_timeout(snap.OBSERVE)
                    page.clock.run_for(t)
                    rep = page.evaluate(read)
                    if not (rep and (rep.get("man") or {}).get("moving")):
                        failure = "man.moving is false at the shot"
                ink = snap.toy_ink(page)
                if failure is None and (ink is None or ink["ink"] == 0):
                    failure = "blank stage canvas"
                if failure is None:
                    snap.shot(page, out.parent, out.stem)
            elif failure is None and beat is None:
                snap.toy_frame(page, y, t)
            if failure is None and not ride:
                ink = snap.toy_ink(page)
                snap.shot(page, out.parent, out.stem)

            ctx.close()
            browser.close()
    finally:
        httpd.shutdown()

    if failure is None and snap.ERRORS and ride:
        failure = "console error"
    if failure is not None:
        print("FAIL " + failure)
        for err in snap.ERRORS:
            print("ERR " + str(err).splitlines()[0])
        return 1

    status = "no toy canvas" if ink is None else f"canvas {ink['w']}x{ink['h']}, {ink['ink']} inked px"
    extra = ""
    if beat:
        extra += f" beat: {beat}"
    print(f"{out}  y={y}px  t={t}ms  {status}  {time.time() - t0:.1f}s{extra}")
    for err in snap.ERRORS:
        print("ERR " + str(err).splitlines()[0])

    if snap.ERRORS or ink is None or ink["ink"] == 0:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
