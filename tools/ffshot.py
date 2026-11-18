"""Screenshots in the owner's INSTALLED Firefox (Selenium 4, headless, fresh profile).

Playwright's bundled Firefox missed row-art bugs twice that the real install showed.

  py -3 tools/ffshot.py [--path /] [--size 2000x1009] [--scroll SEL] [--hover SEL]
                        [--wait MS] [--out PATH.png] [--gate]
  py -3 tools/ffshot.py --games      each homepage Games row at rest and hovered, plus 390x844

Serves the worktree itself (nav-flows' start_server), waits out the loading gate (it opens
by itself); --gate shoots the gate itself mid-fill. Prints the png path(s), the Firefox version, innerWidth x innerHeight and
console errors (window errors caught by a probe; Firefox gives Selenium no console log).
Firefox cannot go under 500 px wide; use Playwright for 390.
Full-viewport shots. Exits 1 on errors or a missing firefox.exe.
"""
import argparse
import importlib.util
import os
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FIREFOX = r"C:\Program Files\Mozilla Firefox\firefox.exe"
ROWS = ["sector-zero", "voidscape", "conclusus", "heavylight"]

spec = importlib.util.spec_from_file_location("nav", ROOT / "tools" / "nav-flows.test.py")
nav = importlib.util.module_from_spec(spec)
spec.loader.exec_module(nav)

from selenium import webdriver
from selenium.webdriver import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service

PROBE = """
window.__errs = [];
addEventListener('error', e => window.__errs.push(String(e.message || e.type)));
addEventListener('unhandledrejection', e => window.__errs.push('rejection: ' + e.reason));
"""


def parse_size(s):
    w, h = s.lower().split("x")
    return int(w), int(h)


def set_viewport(d, w, h):
    d.set_window_size(w, h)
    iw, ih = d.execute_script("return [innerWidth, innerHeight]")
    d.set_window_size(w + (w - iw), h + (h - ih))


GATE_SCALE = """
const f = document.getElementById('gate-bar-fill'), g = document.getElementById('site-gate');
if (!f || !g || g.classList.contains('done') || document.documentElement.classList.contains('gate-done')) return null;
const m = /matrix\\(([^,]+)/.exec(getComputedStyle(f).transform);
return m ? +m[1] : 0;
"""


def gate_scale(d):
    try:
        return d.execute_script(GATE_SCALE)
    except Exception:
        return None


def gate_shot(d, base, path, out):
    """Shoot the gate with its fill between 0.3 and 0.8; the page's errors (a list) when one was saved, else None. The page load
    strategy is "none", so polling starts at the gate's first frames. Each try is a fresh tab
    (the gate shows once per tab)."""
    for _ in range(3):
        d.switch_to.new_window("tab")
        d.get(base + path)
        s = None
        end = time.time() + 20
        while time.time() < end:
            s = gate_scale(d)
            if s is not None:   # the gate exists: the page is this tab's; hook errors once (from here on)
                d.execute_script("if (window.__errs) return;" + PROBE)
            if s is not None and 0.3 <= s <= 0.8:
                break
            if s is not None and s > 0.8:
                s = None
                break
            time.sleep(0.01)
        else:
            s = None
        if s is None:
            d.close()
            d.switch_to.window(d.window_handles[-1])
            continue
        d.save_screenshot(str(out))
        after = gate_scale(d)
        if after is None:   # the gate went during the capture: the shot may show the bridge
            out.unlink(missing_ok=True)
            continue
        print(out)
        print("gate scaleX %.3f at the poll, %.3f after the capture" % (s, after))
        return d.execute_script("return window.__errs || []")
    return None


def load(d, base, path):
    d.get(base + path)
    d.execute_script(PROBE)
    try:
        if d.find_elements(By.CSS_SELECTOR, "#gate-bar"):
            # the gate opens the site by itself when the bar fills
            for _ in range(300):
                if d.execute_script("return document.documentElement.classList.contains('gate-done')"):
                    break
                time.sleep(0.1)
            else:
                print("WARNING: the loading gate of " + path + " never opened in 30 s")
                return False
            time.sleep(1.0)
    except Exception:
        pass
    d.execute_script(PROBE)
    return True


def scroll_to(d, sel):
    el = d.find_element(By.CSS_SELECTOR, sel)
    d.execute_script("arguments[0].scrollIntoView({block:'center',behavior:'instant'})", el)
    time.sleep(0.8)
    return el


def shoot(d, out, wait):
    time.sleep(wait / 1000)
    out.parent.mkdir(parents=True, exist_ok=True)
    d.save_screenshot(str(out))
    print(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--path", default="/")
    ap.add_argument("--size", default="2000x1009")
    ap.add_argument("--scroll")
    ap.add_argument("--hover")
    ap.add_argument("--wait", type=int, default=500)
    ap.add_argument("--out")
    ap.add_argument("--games", action="store_true")
    ap.add_argument("--gate", action="store_true")   # shoot the loading gate at about 40-66% filled
    a = ap.parse_args()

    if not os.path.exists(FIREFOX):
        print("firefox.exe missing: " + FIREFOX)
        return 1

    opts = Options()
    opts.binary_location = FIREFOX
    opts.add_argument("-headless")
    opts.add_argument("-profile")
    prof = tempfile.mkdtemp(prefix="ffshot-profile-")
    opts.add_argument(prof)
    tmp = Path(tempfile.gettempdir())
    httpd, base = nav.start_server()
    if a.gate:
        opts.page_load_strategy = "none"
    d = webdriver.Firefox(options=opts, service=Service())
    errors = []
    try:
        print("Firefox " + d.capabilities.get("browserVersion", "?"))
        w, h = parse_size(a.size)
        set_viewport(d, w, h)
        if a.gate:
            errors = gate_shot(d, base, a.path, Path(a.out) if a.out else tmp / "ffshot.png")
            if errors is None:
                print("gate shot missed: 3 tries, the gate was never caught with its fill between 0.3 and 0.8")
                return 1
            print("inner " + "x".join(str(v) for v in d.execute_script("return [innerWidth, innerHeight]")))
            for e in errors:
                print("console error: " + e)
            return 1 if errors else 0
        if not load(d, base, a.path):
            return 1
        if a.games:
            for row in ROWS:
                sel = "#" + row
                el = scroll_to(d, sel)
                park = ActionChains(d)   # viewport (5, 5), off every row; an offset from the scrolled body could land on the first row
                park.w3c_actions.pointer_action.move_to_location(5, 5)
                park.perform()
                time.sleep(0.4)
                shoot(d, tmp / f"ffshot-{row}-rest.png", a.wait)
                ActionChains(d).move_to_element(el).perform()
                time.sleep(0.6)
                shoot(d, tmp / f"ffshot-{row}-hover.png", a.wait)
            set_viewport(d, 390, 844)
            if not load(d, base, a.path):
                return 1
            scroll_to(d, "#" + ROWS[0])
            shoot(d, tmp / "ffshot-sector-zero-390x844.png", a.wait)
        else:
            if a.scroll:
                scroll_to(d, a.scroll)
            if a.hover:
                el = d.find_element(By.CSS_SELECTOR, a.hover)
                ActionChains(d).move_to_element(el).perform()
                time.sleep(0.6)
            shoot(d, Path(a.out) if a.out else tmp / "ffshot.png", a.wait)
        print("inner " + "x".join(str(v) for v in d.execute_script("return [innerWidth, innerHeight]")))
        errors = d.execute_script("return window.__errs || []")
    finally:
        d.quit()
        httpd.shutdown()
    for e in errors:
        print("console error: " + e)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
