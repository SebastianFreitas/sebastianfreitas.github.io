"""Screenshots in the owner's INSTALLED Firefox (Selenium 4, headless, fresh profile).

Playwright's bundled Firefox missed row-art bugs twice that the real install showed.

  py -3 tools/ffshot.py [--path /] [--size 2000x1009] [--scroll SEL] [--hover SEL]
                        [--wait MS] [--out PATH.png]
  py -3 tools/ffshot.py --games      each homepage Games row at rest and hovered, plus 390x844

Serves the worktree itself (nav-flows' start_server), picks the gate's world button when
the gate shows. Prints the png path(s), the Firefox version, innerWidth x innerHeight and
console errors (window errors caught by a probe; Firefox gives Selenium no console log).
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


def load(d, base, path):
    d.get(base + path)
    d.execute_script(PROBE)
    try:
        d.find_element(By.CSS_SELECTOR, "#gate-world")
        for _ in range(100):
            if d.execute_script("var p=document.getElementById('gate-panel');return !!p&&p.classList.contains('on')"):
                break
            time.sleep(0.1)
        d.find_element(By.CSS_SELECTOR, "#gate-world").click()
        time.sleep(2.5)
    except Exception:
        pass
    d.execute_script(PROBE)


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
    d = webdriver.Firefox(options=opts, service=Service())
    errors = []
    try:
        print("Firefox " + d.capabilities.get("browserVersion", "?"))
        w, h = parse_size(a.size)
        set_viewport(d, w, h)
        load(d, base, a.path)
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
            load(d, base, a.path)
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
