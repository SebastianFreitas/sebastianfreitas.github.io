"""Load JS files into a headless page (in order) and report syntax/runtime errors.
usage: py -3 tools/jscheck.py <file.js> [more.js ...] [--eval "<js expression or statements>"] [--shot out.png]
Always loads js/lib/util.js, js/lib/paint.js, js/genesis/genesis-state.js, js/genesis/genesis-paint.js first.
--eval runs after all files are loaded; a 1440x900 canvas is available as `cv` with 2d context `ctx`
(and Gen.W/H/cam/t/beat/local preset). --shot saves the canvas as PNG. Exit code 1 on any error.
Runs from any cwd; file arguments are repo-relative, already resolved against the server root.
"""
import sys, importlib.util
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("nav", ROOT / "tools" / "nav-flows.test.py")
nav = importlib.util.module_from_spec(spec); spec.loader.exec_module(nav)
from playwright.sync_api import sync_playwright
args = sys.argv[1:]
def take(flag):
    if flag in args:
        i = args.index(flag); v = args[i + 1]; del args[i:i + 2]; return v
ev = take("--eval"); shot = take("--shot")
BASE = ["js/lib/util.js", "js/lib/paint.js", "js/genesis/genesis-state.js", "js/genesis/genesis-paint.js"]
files = BASE + [a.replace("\\", "/") for a in args]
errors = []
httpd, base = nav.start_server()
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); page = b.new_page(viewport={"width": 1440, "height": 900})
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type == "error" else None)
        page.goto(f"{base}/404.html"); page.wait_for_load_state("load"); errors.clear()
        page.evaluate("document.body.innerHTML = '<canvas id=cv width=1440 height=900></canvas>'")
        for f in files:
            page.add_script_tag(url=f"{base}/{f}")
            page.wait_for_timeout(50)
            if errors: print(f"FAIL loading {f}:"); [print("  ", e) for e in errors]; b.close(); sys.exit(1)
            print(f"ok  {f}")
        if ev:
            page.evaluate("() => { window.cv = document.getElementById('cv'); window.ctx = cv.getContext('2d'); if (window.Gen) { Gen.W = 1440; Gen.H = 900; Gen.cam = 0; Gen.t = 1.0; Gen.beat = 0; Gen.local = 0; } }")
            try:
                r = page.evaluate("() => { " + ev + " }")
                print("eval ->", r)
            except Exception as e:
                print("FAIL eval:", str(e).splitlines()[0]); b.close(); sys.exit(1)
            page.wait_for_timeout(50)
            if errors: print("FAIL eval errors:"); [print("  ", e) for e in errors]; b.close(); sys.exit(1)
            if shot:
                page.locator("#cv").screenshot(path=shot); print("shot ->", shot)
        b.close()
finally:
    httpd.shutdown()
print("ALL OK")
