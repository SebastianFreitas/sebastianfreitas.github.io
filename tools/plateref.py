"""Reference shots of the live top bar: the .xp-name plate and a hovered nav tab, transparent background, device scale 3.
usage: py -3 tools/plateref.py <plate.png> <tab.png>
The plate carries the text UNFILED CENSUS HAND; the tab is the BRIDGE link while hovered.
Exits 1 on a console error. Never writes into the repo unless you point it there.
"""

import sys
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("snap", ROOT / "tools" / "snap.py")
snap = importlib.util.module_from_spec(spec)
spec.loader.exec_module(snap)

from playwright.sync_api import sync_playwright


def main(argv):
    if len(argv) != 2 or not all(a.endswith(".png") for a in argv):
        print(__doc__.split("\n")[1])
        return 2
    plate, tab = (Path(a) for a in argv)
    for o in (plate, tab):
        if ROOT in o.resolve().parents:
            print("out must be outside the repo")
            return 2
        o.parent.mkdir(parents=True, exist_ok=True)
    snap.ERRORS.clear()
    httpd, base = snap.nav.start_server()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(args=snap.CHROME)
            ctx, page = snap.new_ctx(browser, device_scale_factor=3)
            snap.enter_via_gate(page, base, "#gate-world")
            page.evaluate("document.querySelector('.topbar').classList.remove('is-solid')")
            name = page.locator(".topbar .xp-name").first
            name.evaluate("el => { el.textContent = 'UNFILED CENSUS HAND'; }")
            page.evaluate("""() => new Promise((res, rej) => {
                const t0 = Date.now();
                const tick = () => {
                    const el = document.querySelector('.topbar .xp-name');
                    if (el && el.style.getPropertyValue('--shape') === 'none' && el.style.getPropertyValue('--wear')) res(true);
                    else if (Date.now() - t0 > 10000) rej(new Error('plate wear never applied'));
                    else setTimeout(tick, 50);
                };
                tick();
            })""")
            snap.settle(page, 400)
            print("plate seed", name.evaluate("el => el.dataset.seed + ' ' + el.dataset.wear + ' ' + el.offsetWidth + 'x' + el.offsetHeight"))
            name.screenshot(path=str(plate), omit_background=True)
            link = page.locator(".topbar nav a", has_text="Bridge").first
            link.hover()
            snap.settle(page, 400)
            link.screenshot(path=str(tab), omit_background=True)
            print(plate, name.bounding_box())
            print(tab, link.bounding_box())
            ctx.close()
            browser.close()
    finally:
        httpd.shutdown()
    for err in snap.ERRORS:
        print("ERR " + str(err).splitlines()[0])
    return 1 if snap.ERRORS else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
