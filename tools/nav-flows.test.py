"""Navigation and state flows, run in a real browser.

Checks what a visitor sees after the navigations that used to replay
the intro: Back, reload, the Work links on case pages, deep links, the
wordmark, dev URL params, the intro cutscene, two open tabs, the case
page header and every internal link.

Setup (once):
    py -3 -m pip install playwright
    py -3 -m playwright install chromium

Run all flows:        py -3 nav-flows.test.py
Run some flows:       py -3 nav-flows.test.py back reload
List the flows:       py -3 nav-flows.test.py --list

The script serves the repo itself on a free port (plain static headers,
like GitHub Pages) and stops it when done. It never needs serve.py.

Not covered: the back/forward cache. Playwright's Chromium runs with it
switched off, so check that path by hand in real Chrome:
DevTools > Application > Back/forward cache > "Test back/forward cache".
"""

from __future__ import annotations

import functools
import http.server
import json
import os
import sys
import threading
import urllib.parse

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("Playwright is not installed. Run:\n"
          "  py -3 -m pip install playwright\n"
          "  py -3 -m playwright install chromium")
    sys.exit(2)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESKTOP = {"width": 1440, "height": 900}
PHONE = {"width": 390, "height": 844}
PHONE_LANDSCAPE = {"width": 844, "height": 390}
CASES = ["sector-zero", "voidscape", "conclusus", "heavylight"]
NEXT = {"sector-zero": "voidscape", "voidscape": "conclusus",
        "conclusus": "heavylight", "heavylight": "sector-zero"}
TOL = 4          # px of slack when comparing scroll positions
GATE_CAP_MS = 8000   # the gate's own cap, WARM_CAP_MS in js/site/intro.js
GATE_MIN_MS = 1200   # the gate's minimum time, MIN_MS in js/site/intro.js
SETTLE = 2000   # ms: long enough for any smooth scroll to finish

# ------------------------------------------------------------------ server

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass


class QuietServer(http.server.ThreadingHTTPServer):
    # a page that navigates away mid-download drops the connection; that's fine
    def handle_error(self, request, client_address):
        pass


def start_server():
    handler = functools.partial(QuietHandler, directory=ROOT)
    httpd = QuietServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, f"http://127.0.0.1:{httpd.server_address[1]}"

# ------------------------------------------------------------------ checks

failures: list[str] = []


def check(name: str, ok: bool, detail=None):
    tag = "PASS" if ok else "FAIL"
    line = f"    {tag}  {name}"
    if not ok and detail is not None:
        line += f"   ({detail})"
    print(line)
    if not ok:
        failures.append(name)

# ------------------------------------------------------------------ page helpers

# Runs before any page script. Records whether the gate was already
# hidden when the parser inserted it: if it wasn't, the gate paints
# for at least a frame before a script hides it.
INIT = """
(() => {
  new MutationObserver((muts, obs) => {
    const g = document.getElementById('site-gate');
    if (!g) return;
    window.__gateHiddenAtParse = document.documentElement.classList.contains('gate-done');
    obs.disconnect();
  }).observe(document, { childList: true, subtree: true });
})();
"""

# Counts paints on the bridge canvas only. bridge.js grabs its 2d context
# once at parse time, so wrapping getContext here catches it; instrument
# canvases keep their own untouched context.
PAINT_PROBE = """
window.__paints = 0;
const getCtx = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (kind, ...rest) {
  const ctx = getCtx.call(this, kind, ...rest);
  if (this.id === 'bridge-canvas' && ctx && !ctx.__counted) {
    ctx.__counted = true;
    for (const name of ['save', 'beginPath', 'fillRect', 'drawImage']) {
      const orig = ctx[name];
      if (typeof orig !== 'function') continue;
      ctx[name] = function (...a) { window.__paints++; return orig.apply(this, a); };
    }
  }
  return ctx;
};
"""

STATE = """
() => {
  const gate = document.getElementById('site-gate');
  const hero = document.getElementById('bridge-hero');
  const top = id => { const el = document.getElementById(id);
    return el ? Math.round(el.getBoundingClientRect().top + scrollY) : null; };
  const maxScroll = document.documentElement.scrollHeight - innerHeight;
  let stored = null;
  try { stored = JSON.parse(localStorage.getItem('arcanis.profile.v1') || 'null'); } catch (e) {}
  return {
    url: location.pathname + location.search + location.hash,
    gateShown: !!gate && getComputedStyle(gate).display !== 'none',
    frozen: document.body.classList.contains('site-frozen'),
    scrollY: Math.round(scrollY),
    maxScroll: Math.round(maxScroll),
    workTop: top('work'),
    experienceTop: top('experience'),
    mode: (() => { if (window.Bridge && Bridge.saveView) Bridge.saveView();
      try { return (JSON.parse(sessionStorage.getItem('arcanis.view.v1') || 'null') || {}).mode || null; }
      catch (e) { return null; } })(),
    heroPosition: hero ? getComputedStyle(hero).position : null,
    genesisActive: window.Genesis ? Genesis.active : null,
    genesisFlag: window.XP ? XP.has('genesis') : null,
    xpLevel: window.XP ? XP.level : null,
    stored: stored ? { level: stored.level, seen: !!stored.seen,
                       claimed: Object.keys(stored.claimed || {}) } : null,
    gateHiddenAtParse: window.__gateHiddenAtParse,
  };
}
"""


def state(page) -> dict:
    return page.evaluate(STATE)


def new_page(browser, viewport=DESKTOP):
    ctx = browser.new_context(viewport=viewport)
    ctx.set_default_timeout(8000)
    ctx.add_init_script(INIT)
    return ctx, ctx.new_page()


def scroll_to(page, element_id):
    page.evaluate(f"window.scrollTo({{ top: document.getElementById('{element_id}')"
                  f".getBoundingClientRect().top + scrollY, behavior: 'instant' }})")
    page.wait_for_timeout(400)


def near(a, b):
    return a is not None and b is not None and abs(a - b) <= TOL


def wait_gate_done(page):
    """The gate opens by itself when its bar is full: wait for it to be gone.
    It may take at most its own cap (WARM_CAP_MS 8000, js/site/intro.js) plus a margin."""
    try:
        page.wait_for_function("document.getElementById('site-gate').classList.contains('done')",
                               timeout=GATE_CAP_MS + 1500)
    except Exception as e:
        check("the gate opens within its own cap", False, f"not done after {GATE_CAP_MS + 1500} ms: {e}")


def lands_on_work(page, s):
    """The designed landing: Work's top sits just under the top bar (or the page ends first)."""
    h = page.evaluate("document.querySelector('header').getBoundingClientRect().height")
    want = min(s["workTop"] - h, s["maxScroll"])
    return abs(s["scrollY"] - want) <= TOL, f"scrollY {s['scrollY']}, Work top {s['workTop']}, bar {h}, want {want:.0f}"


def enter_via_gate(page, base):
    """First visit: the gate fills its bar and opens by itself; let the +1 land."""
    page.goto(base + "/")
    page.wait_for_selector("#gate-bar", timeout=10000)
    wait_gate_done(page)
    page.wait_for_timeout(2500)


def pass_gate(page, wait=2500):
    """Any later visit: the gate shows its bar and opens by itself."""
    page.wait_for_selector("#gate-bar", timeout=10000)
    wait_gate_done(page)
    page.wait_for_timeout(wait)


def gate_state(page):
    return page.evaluate("""() => { const g = document.getElementById('site-gate');
      return { shown: !!g && getComputedStyle(g).display !== 'none',
               hiddenAtParse: window.__gateHiddenAtParse,
               text: (g.querySelector('.gate-eyebrow')||{}).textContent,
               bar: !!document.querySelector('.gate-bar[role=progressbar]') }; }""")


def goto_cc(page, base):
    """Load the Conclusus page and let its play layer start."""
    page.goto(base + "/projects/conclusus.html")
    page.wait_for_selector("figure.gp-stage", state="attached")
    page.wait_for_timeout(1500)


def goto_hl(page, base):
    """Load the HeavyLight page and let its stage start."""
    page.goto(base + "/projects/heavylight.html")
    page.wait_for_selector("figure.gp-stage", state="attached")
    page.wait_for_timeout(1500)

# ------------------------------------------------------------------ flows


def flow_first(browser, base):
    """First visit: the gate shows once; the gate opens by itself onto the void bridge."""
    ctx, page = new_page(browser)
    page.goto(base + "/")
    page.wait_for_timeout(300)
    s = state(page)
    check("first visit shows the gate", s["gateShown"], s)
    page.wait_for_selector("#gate-bar", timeout=10000)
    wait_gate_done(page)
    page.wait_for_timeout(2500)
    s = state(page)
    check("gate closes by itself", not s["gateShown"] and not s["frozen"], s)
    check("sector is the void", s["mode"] == "void", s["mode"])
    check("visitor is marked as seen", bool(s["stored"] and s["stored"]["seen"]), s["stored"])
    claimed = s["stored"]["claimed"] if s["stored"] else []
    check("The gate awards nothing (XP is bridge only)",
          "path-world" not in claimed and (s["stored"]["level"] == 0), s["stored"])
    check("Game Dev path NOT awarded by the gate", "path-projects" not in claimed, claimed)
    ctx.close()


def flow_gate_exits(browser, base):
    """The gate can be left early: Escape, or a top bar link. Each must close it well inside the gate's own minimum time."""
    def gone_early(page):
        try:        # the gate's own run takes at least GATE_MIN_MS from its first frame
            page.wait_for_function("document.getElementById('site-gate').classList.contains('done')",
                                   timeout=GATE_MIN_MS - 400)
            return True
        except Exception:
            return False

    ctx, page = new_page(browser)
    page.goto(base + "/")
    page.wait_for_selector("#gate-bar", timeout=10000)
    page.keyboard.press("Escape")
    early = gone_early(page)
    s = state(page)
    check("Escape closes the gate itself, inside the gate's minimum time", early and not s["gateShown"] and not s["frozen"], s)
    check("Escape enters the void", s["mode"] == "void", s["mode"])
    ctx.close()

    ctx, page = new_page(browser)
    page.goto(base + "/")
    page.wait_for_selector("#gate-bar", timeout=10000)
    page.click("header nav a[href='#work']")
    early = gone_early(page)
    page.wait_for_timeout(SETTLE)
    s = state(page)
    check("top bar 'Work' closes the gate itself, inside the gate's minimum time", early and not s["gateShown"] and not s["frozen"], s)
    ok, why = lands_on_work(page, s)
    check("... and lands on Work", ok, why)
    ctx.close()


def flow_back(browser, base):
    """Clicking a Work row lands on its case page; Back returns to the homepage at Work as it was."""
    ctx, page = new_page(browser)
    enter_via_gate(page, base)
    scroll_to(page, "work")
    y0 = state(page)["scrollY"]
    page.click("a.obj[href='projects/sector-zero.html']")
    page.wait_for_url("**/projects/sector-zero.html")
    check("Back: the row led to its case page", page.url.endswith("/projects/sector-zero.html"), page.url)
    page.go_back()
    page.wait_for_timeout(300)
    page.wait_for_timeout(SETTLE)
    g = gate_state(page)
    check("Back: no gate, the tab already entered", not g["shown"], g)
    s = state(page)
    check("Back: on the homepage again", not page.url.endswith(".html"), page.url)
    check("Back: gate closed by itself", not s["gateShown"] and not s["frozen"], s)
    check("Back: sector is still the void", s["mode"] == "void", s["mode"])
    check("Back: scroll position kept", near(s["scrollY"], y0), f"was {y0}, now {s['scrollY']}")
    check("Back: no cutscene", not s["genesisActive"], s["genesisActive"])
    ctx.close()


def flow_reload(browser, base):
    """Reload keeps the sector and the scroll position."""
    ctx, page = new_page(browser)
    enter_via_gate(page, base)
    scroll_to(page, "experience")
    y0 = state(page)["scrollY"]
    page.reload()
    page.wait_for_timeout(300)
    page.wait_for_timeout(SETTLE)
    g = gate_state(page)
    check("reload: no gate, the tab already entered", not g["shown"], g)
    s = state(page)
    check("reload: the bridge is entered, gate closed", not s["gateShown"] and not s["frozen"], s)
    check("reload: sector is still the void", s["mode"] == "void", s["mode"])
    check("reload: scroll position kept", near(s["scrollY"], y0), f"was {y0}, now {s['scrollY']}")
    ctx.close()


def flow_worklink(browser, base):
    """'Work' in the top bar lands on Work, from a deep link that scrolled to a row."""
    ctx, page = new_page(browser)
    enter_via_gate(page, base)
    page.goto(base + "/projects/heavylight.html")     # a fresh load of the homepage, not a same-page hash jump
    page.wait_for_timeout(800)
    page.goto(base + "/#conclusus")
    page.wait_for_timeout(300)
    page.wait_for_timeout(SETTLE)
    g = gate_state(page)
    check("top bar Work: deep link shows no gate, the tab already entered", not g["shown"], g)
    page.click("header nav a[href='#work']")
    page.wait_for_timeout(SETTLE)
    s = state(page)
    check("top bar Work: no gate", not s["gateShown"] and not s["frozen"], s)
    ok, why = lands_on_work(page, s)
    check("top bar Work: lands on Work", ok, why)
    ctx.close()


def flow_deeplink(browser, base):
    """A visitor arriving on /#voidscape sees the gate without the boot log, then the page scrolled to that row, nothing opened."""
    ctx, page = new_page(browser)
    page.goto(base + "/#voidscape")
    page.wait_for_timeout(300)
    g = gate_state(page)
    check("deep link: the gate shows, the bar", g["shown"] and g["bar"], g)
    pass_gate(page, SETTLE)
    page.mouse.move(2, 2)                   # the pointer parked on the top bar, off every row
    page.wait_for_timeout(400)
    s = state(page)
    check("deep link: gate closed by itself", not s["gateShown"] and not s["frozen"], s)
    r = page.evaluate("""() => { const row = document.getElementById('voidscape'), v = row.querySelector('video');
      return { top: Math.round(row.getBoundingClientRect().top), vh: innerHeight, url: location.pathname,
               open: document.querySelectorAll('.open, .folder-body').length }; }""")
    check("deep link: scrolled to the VoidScape row", 0 <= r["top"] < r["vh"], r)
    check("deep link: still on the homepage, nothing opened", r["url"] in ("/", "/index.html") and r["open"] == 0, r)
    check("deep link: visitor not marked as seen", not (s["stored"] and s["stored"]["seen"]), s["stored"])
    ctx.close()


def flow_returning(browser, base):
    """A returning visitor opening the bare homepage sees the gate without the boot log, then the last sector."""
    ctx, page = new_page(browser)
    enter_via_gate(page, base)
    page.keyboard.press("Escape")       # skip the cutscene if it is playing
    page.wait_for_timeout(400)
    page.keyboard.press("Escape")
    page.wait_for_timeout(1500)
    page.goto(base + "/projects/heavylight.html")
    page.wait_for_timeout(800)
    page.close()
    page = ctx.new_page()                   # a returning visitor is a new tab: localStorage kept, sessionStorage fresh
    page.goto(base + "/")
    page.wait_for_timeout(300)
    g = gate_state(page)
    check("returning: the gate shows, the bar", g["shown"] and g["bar"], g)
    check("returning: gate painted at parse", g["hiddenAtParse"] is False, g)
    pass_gate(page, SETTLE)
    s = state(page)
    check("returning: gate closed by itself", not s["gateShown"] and not s["frozen"], s)
    check("returning: opens in the void", s["mode"] == "void", s["mode"])
    check("returning: starts at the top", s["scrollY"] <= TOL, s["scrollY"])
    check("returning: no cutscene", not s["genesisActive"], s["genesisActive"])
    ctx.close()


def flow_wordmark(browser, base):
    """The SF wordmark on the homepage scrolls to the top without reloading."""
    ctx, page = new_page(browser)
    enter_via_gate(page, base)
    scroll_to(page, "experience")
    page.evaluate("window.__sameDocument = true")
    page.click("header a.wordmark")
    page.wait_for_timeout(SETTLE)
    same = page.evaluate("window.__sameDocument === true")
    s = state(page)
    check("wordmark: no reload", same, same)
    check("wordmark: scrolled to the top", s["scrollY"] <= TOL, s["scrollY"])
    check("wordmark: no gate", not s["gateShown"], s)
    ctx.close()


def flow_reset(browser, base):
    """?reset=1 clears progress once and leaves the URL."""
    ctx, page = new_page(browser)
    page.goto(base + "/")
    page.evaluate("""() => {
        localStorage.setItem('arcanis.sector.v1', 'void');
        localStorage.setItem('arcanis.hints.v2', '["x"]');
        sessionStorage.setItem('arcanis.view.v1', '{"mode":"void"}');
        localStorage.setItem('other.key', 'keep');
    }""")
    page.goto(base + "/?reset=1")
    page.wait_for_timeout(300)
    check("reset: param removed from the URL", "reset" not in page.url, page.url)
    check("reset: sector cleared",
          page.evaluate("localStorage.getItem('arcanis.sector.v1')") is None,
          page.evaluate("localStorage.getItem('arcanis.sector.v1')"))
    check("reset: hints cleared",
          page.evaluate("localStorage.getItem('arcanis.hints.v2')") is None,
          page.evaluate("localStorage.getItem('arcanis.hints.v2')"))
    view = page.evaluate("sessionStorage.getItem('arcanis.view.v1')")
    view_mode = json.loads(view)["mode"] if view else None
    check("reset: view cleared", view is None or view_mode != "void", view)
    check("reset: foreign keys kept",
          page.evaluate("localStorage.getItem('other.key')") == "keep",
          page.evaluate("localStorage.getItem('other.key')"))
    page.evaluate("localStorage.removeItem('other.key')")
    page.wait_for_selector("#gate-bar", timeout=10000)
    wait_gate_done(page)
    page.wait_for_timeout(2500)
    page.evaluate("XP.award('beacon-bnote-bridge', 1, 'The Bridge')")   # a bridge beacon: the one grant left
    page.wait_for_timeout(500)
    page.click("a.obj[href='projects/sector-zero.html']")
    page.wait_for_load_state("load")
    page.wait_for_timeout(2500)
    page.go_back()
    page.wait_for_timeout(SETTLE)
    s = state(page)
    check("reset: Back does not reset again",
          bool(s["stored"] and s["stored"]["seen"] and s["stored"]["level"] >= 1), s["stored"])
    check("reset: Back shows no gate", not s["gateShown"], s)
    ctx.close()


def flow_genesis(browser, base):
    """The cutscene plays once, counted from its start, without moving the page."""
    ctx, page = new_page(browser)
    enter_via_gate(page, base)
    check("the gate does not autoplay the cutscene", state(page)["genesisActive"] is not True, None)
    page.evaluate("Genesis.play({ thenMode: 'void' })")     # what the Genesis mode button calls
    page.wait_for_timeout(300)
    s = state(page)
    check("Genesis starts the cutscene", s["genesisActive"] is True, s["genesisActive"])
    check("cutscene: hero stays in the page flow", s["heroPosition"] != "fixed", s["heroPosition"])
    check("cutscene: remembered as soon as it starts", s["genesisFlag"] is True, s["genesisFlag"])
    page.wait_for_timeout(2000)
    s = state(page)
    claimed = s["stored"]["claimed"] if s["stored"] else []
    check("cutscene: Game Dev path not awarded behind it", "path-projects" not in claimed, claimed)
    page.goto(base + "/projects/voidscape.html")     # leave mid-cutscene
    page.wait_for_timeout(800)
    page.goto(base + "/")
    page.wait_for_timeout(SETTLE)
    s = state(page)
    check("cutscene does not autoplay again", not s["genesisActive"], s["genesisActive"])
    check("... and the visitor is back in The Void", s["mode"] == "void", s["mode"])
    ctx.close()


def flow_genesis_segment(browser, base):
    """The Void beacon plays the birth segment once, then its note opens; later claims only show the note."""
    ctx, page = new_page(browser)
    enter_via_gate(page, base)
    claim = "(() => { const m = Bridge.MARKS.find(m => m.id === 'bnote-void'); Bridge.camX = m.cam; Bridge.selectMark(m); })()"
    note = "document.getElementById('bnote-void').classList.contains('show')"
    check("segment: not seen on a fresh profile", page.evaluate("Genesis.segmentSeen('birth')") is False, None)
    veil_op = "parseFloat(getComputedStyle(document.querySelector('.genesis-veil')).opacity)"
    page.evaluate(claim)
    page.wait_for_function("Genesis.active === true", timeout=12000)   # ceremony wait, beat, fade-in
    page.wait_for_timeout(1500)
    check("segment: Genesis is active after the first claim", page.evaluate("Genesis.active") is True, None)
    check("segment: the note waits behind it", page.evaluate(note) is False, None)
    box = page.evaluate("(() => { const r = document.getElementById('genesis-track').getBoundingClientRect(); return {x: r.left + r.width * 0.95, y: r.top + r.height / 2}; })()")
    page.mouse.click(box["x"], box["y"])                     # the bar covers only the segment
    page.wait_for_timeout(150)
    check("segment: clicking the bar at 95% stays inside the segment",
          page.evaluate("Genesis.active && Gen.sceneOf(Gen.beat) === 'birth' && Gen.beat <= Gen.idxOf('walk')") is True,
          page.evaluate("[Genesis.active, Gen.beat, Gen.idxOf('walk')]"))
    page.evaluate("Genesis.skip()")                          # a skip ends the segment through the fade
    page.wait_for_timeout(3500)                              # fade out, finish, fade back
    check("segment: Genesis finished", page.evaluate("Genesis.active") is False, None)
    check("segment: marked seen", page.evaluate("Genesis.segmentSeen('birth')") is True, None)
    check("segment: the note is open", page.evaluate(note) is True, None)
    check("segment: the veil ends at opacity 0", page.evaluate(veil_op) == 0, None)
    check("segment: replay control is shown",
          page.evaluate("!document.querySelector('#bnote-void a[href=\"#\"]').closest('p').hidden") is True, None)
    page.evaluate("Bridge.clearMark()")
    page.wait_for_timeout(500)
    page.evaluate(claim)
    page.wait_for_timeout(800)
    check("segment: second claim does not play", page.evaluate("Genesis.active") is False, None)
    check("segment: second claim shows the note", page.evaluate(note) is True, None)
    ctx.close()


def flow_glimpse(browser, base):
    """The Void beacon's segment ends on the glimpse card; a wheel closes it and the page scrolls; the Root beacon shows none."""
    ctx, page = new_page(browser)
    enter_via_gate(page, base)
    claim = "(id) => { const m = Bridge.MARKS.find(m => m.id === id); Bridge.camX = m.cam; Bridge.selectMark(m); }"
    card = "!!document.querySelector('.glimpse-veil.open')"
    page.evaluate(claim, "bnote-void")
    page.wait_for_function("Genesis.active === true", timeout=12000)
    page.wait_for_timeout(1500)
    page.evaluate("Genesis.skip()")
    page.wait_for_function(card, timeout=12000)
    check("glimpse: card shows after the Void segment", page.evaluate(card) is True, None)
    check("glimpse: title text", page.evaluate("document.querySelector('.glimpse-title').textContent") == "A glimpse of my world", None)
    y0 = page.evaluate("scrollY")
    page.wait_for_timeout(600)
    page.mouse.move(700, 450)
    page.mouse.wheel(0, 400)
    page.wait_for_timeout(900)
    check("glimpse: a wheel closes it", page.evaluate("!document.querySelector('.glimpse-veil')") is True, None)
    check("glimpse: the page scrolled", page.evaluate("scrollY") > y0, [y0, page.evaluate("scrollY")])
    ctx.close()

    for how in ("line", "veil"):
        ctx, page = new_page(browser)
        enter_via_gate(page, base)
        page.evaluate(claim, "bnote-void")
        page.wait_for_function("Genesis.active === true", timeout=12000)
        page.wait_for_timeout(1500)
        page.evaluate("Genesis.skip()")
        page.wait_for_function(card, timeout=12000)
        page.wait_for_timeout(700)
        y0 = page.evaluate("scrollY")
        if how == "line":
            page.screenshot(path="C:/Users/Traff/AppData/Local/Temp/glimpse5-1440.png")
            page.click(".glimpse-game")
            page.wait_for_timeout(2500)
            top = page.evaluate("document.getElementById('work').getBoundingClientRect().top")
            check("glimpse: game line closes the card", page.evaluate("!document.querySelector('.glimpse-veil')") is True, None)
            check("glimpse: game line lands #work near the top", abs(top) <= 80, top)
        else:
            page.mouse.click(60, 60)
            page.wait_for_timeout(900)
            check("glimpse: veil click closes the card", page.evaluate("!document.querySelector('.glimpse-veil')") is True, None)
            check("glimpse: veil click stays put", abs(page.evaluate("scrollY") - y0) < 5, [y0, page.evaluate("scrollY")])
        ctx.close()

    ctx, page = new_page(browser, PHONE)
    enter_via_gate(page, base)
    page.evaluate(claim, "bnote-void")
    page.wait_for_function("Genesis.active === true", timeout=12000)
    page.wait_for_timeout(1500)
    page.evaluate("Genesis.skip()")
    page.wait_for_function(card, timeout=12000)
    page.wait_for_timeout(1000)
    page.screenshot(path="C:/Users/Traff/AppData/Local/Temp/glimpse5-phone.png")
    ctx.close()

    ctx, page = new_page(browser)
    enter_via_gate(page, base)
    page.evaluate(claim, "bnote-root")
    page.wait_for_function("Genesis.active === true", timeout=12000)
    page.wait_for_timeout(1500)
    page.evaluate("Genesis.skip()")
    page.wait_for_timeout(4500)
    check("glimpse: Root segment shows no card", page.evaluate("!document.querySelector('.glimpse-veil')") is True, None)
    ctx.close()

    ctx, page = new_page(browser)
    page.goto(base + "/?gscene=birth")
    page.wait_for_selector("#gate-bar", timeout=10000)
    wait_gate_done(page)
    page.wait_for_function("Genesis.active === true", timeout=12000)
    page.wait_for_timeout(1500)
    page.evaluate("Genesis.skip()")
    page.wait_for_timeout(4500)
    check("glimpse: ?gscene=birth shows no card", page.evaluate("!document.querySelector('.glimpse-veil')") is True, None)
    ctx.close()


def flow_genesis_scenes(browser, base):
    """Each of the four cutscene beacons plays its own whole scene; the full Genesis joins scenes with a fade."""
    veil_op = "parseFloat(getComputedStyle(document.querySelector('.genesis-veil')).opacity)"
    for note_id, scene in (("bnote-void", "birth"), ("bnote-root", "root"),
                           ("bnote-rex", "rex"), ("bnote-rex-valkhar", "valkhar")):
        ctx, page = new_page(browser)        # a fresh context: every beacon is a first claim
        enter_via_gate(page, base)
        if note_id == "bnote-rex-valkhar":   # a depth node: file the beacons it hangs off so it spawns
            page.evaluate("""(() => {
                const need = id => { const d = Depths.nodes().find(n => n.id === id); if (d) d.after.forEach(need);
                                     if (id !== 'bnote-rex-valkhar') XP.award('beacon-' + id, 1, id); };
                need('bnote-rex-valkhar'); Bridge.revealDepths(false);
            })()""")
        page.evaluate("(() => { const m = Bridge.MARKS.find(m => m.id === '%s'); Bridge.camX = m.cam; Bridge.selectMark(m); })()" % note_id)
        page.wait_for_function("Genesis.active === true", timeout=15000)
        page.wait_for_timeout(1200)
        first = page.evaluate("Gen.BEATS[Gen.beat].id || Gen.BEATS[Gen.beat]")
        want = page.evaluate("Gen.SCENES['%s'].from" % scene)
        check(f"scenes: {scene}: first beat is the scene's from", first == want, [first, want])
        box = page.evaluate("(() => { const r = document.getElementById('genesis-track').getBoundingClientRect(); return {x: r.left + r.width * 0.95, y: r.top + r.height / 2}; })()")
        page.mouse.click(box["x"], box["y"])
        page.wait_for_timeout(150)
        check(f"scenes: {scene}: 95% of the bar stays inside the scene",
              page.evaluate("Genesis.active && Gen.sceneOf(Gen.beat) === '%s'" % scene) is True,
              page.evaluate("[Genesis.active, Gen.beat, Gen.sceneOf(Gen.beat)]"))
        page.evaluate("Genesis.skip()")
        page.wait_for_timeout(3500)
        check(f"scenes: {scene}: skip ends it", page.evaluate("Genesis.active") is False, None)
        check(f"scenes: {scene}: the note opens",
              page.evaluate("document.getElementById('%s').classList.contains('show')" % note_id) is True, None)
        check(f"scenes: {scene}: veil at 0", page.evaluate(veil_op) == 0, None)
        check(f"scenes: {scene}: marked seen", page.evaluate("Genesis.segmentSeen('%s')" % scene) is True, None)
        ctx.close()
    ctx, page = new_page(browser)
    page.goto(base + "/?genesis=1&gbeat=corrupt")
    page.wait_for_selector("#gate-bar", timeout=10000)
    page.evaluate("window.__seam = false; setInterval(() => { if (Genesis.seaming) window.__seam = true; }, 25)")
    wait_gate_done(page)                # the gate opening by itself starts the forced Genesis
    page.wait_for_function("Gen.beat === Gen.idxOf('dot')", timeout=60000)
    page.wait_for_timeout(1500)
    check("full play: the seam into dot was a fade", page.evaluate("window.__seam") is True, None)
    check("full play: the veil ended at 0", page.evaluate(veil_op) == 0, None)
    ctx.close()


def flow_twotabs(browser, base):
    """A claim in one tab never erases progress made in another."""
    ctx = browser.new_context(viewport=DESKTOP)
    home = ctx.new_page()
    enter_via_gate(home, base)
    case = ctx.new_page()
    case.goto(base + "/projects/sector-zero.html")
    case.wait_for_timeout(2500)
    after_case = case.evaluate("JSON.parse(localStorage.getItem('arcanis.profile.v1')).level")
    check("two tabs: opening a case awards nothing",
          "proj-sector-zero" not in case.evaluate("JSON.parse(localStorage.getItem('arcanis.profile.v1')).claimed"), None)
    case.evaluate("XP.award('beacon-bnote-bridge', 1, 'The Bridge')")   # the other tab's claim: a bridge beacon
    case.wait_for_timeout(500)
    home.bring_to_front()
    home.evaluate("XP.award('beacon-twotabs-home', 1, 'The Bridge')")   # home's own write, after the other tab's
    home.wait_for_timeout(500)
    stored = home.evaluate("JSON.parse(localStorage.getItem('arcanis.profile.v1'))")
    check("two tabs: level adds up", stored["level"] == after_case + 2,
          f"expected {after_case + 2}, stored {stored['level']}")
    check("two tabs: the other tab's claim survives", "beacon-bnote-bridge" in stored["claimed"],
          list(stored["claimed"]))
    level_shown = home.evaluate("XP.level")
    check("two tabs: homepage picks up the new level", level_shown == stored["level"], level_shown)
    ctx.close()


def flow_header(browser, base):
    """The top bar never covers the Work row a deep link scrolls to."""
    for viewport, label in ((DESKTOP, "desktop"), (PHONE, "phone")):
        ctx, page = new_page(browser, viewport)
        for case in CASES:
            page.goto(f"{base}/#{case}")
            page.wait_for_timeout(1200)
            r = page.evaluate("""(c) => ({
              bar: Math.round(document.querySelector('.topbar').getBoundingClientRect().bottom),
              first: Math.round(document.querySelector('a.obj[href="projects/' + c + '.html"]').getBoundingClientRect().top) })""", case)
            check(f"header clear of content: {case} ({label})", r["bar"] - TOL <= r["first"], r)
        ctx.close()


def flow_phone(browser, base):
    """Phone portrait asks for a rotate; landscape gets a hero that fits."""
    ctx = browser.new_context(viewport=PHONE, has_touch=True, is_mobile=True)
    ctx.set_default_timeout(8000)
    ctx.add_init_script(INIT)
    ctx.add_init_script(PAINT_PROBE)
    page = ctx.new_page()
    enter_via_gate(page, base)
    r = page.evaluate("""() => {
      const el = document.getElementById('bridge-rotate');
      if (!el) return null;
      const skip = el.querySelector('.rotate-skip');
      return {
        shown: getComputedStyle(el).display !== 'none',
        hidden: el.getAttribute('aria-hidden'),
        skip: skip ? skip.getAttribute('href') : null,
      };
    }""")
    check("portrait: rotate notice shows", bool(r and r["shown"]), r)
    check("portrait: notice is not hidden from a screen reader", bool(r and r["hidden"] == "false"), r)
    check("portrait: notice offers a way to the work", bool(r and r["skip"] == "#work"), r)
    parked = page.evaluate("""async () => {
      const a = window.__paints;
      await new Promise(r => setTimeout(r, 1200));
      return { before: a, after: window.__paints };
    }""")
    check("portrait: the render loop is parked behind the notice",
          parked["after"] == parked["before"], parked)
    page.click("#bridge-rotate .rotate-skip")
    page.wait_for_timeout(600)
    at_work = page.evaluate("""() => {
      const w = document.getElementById('work').getBoundingClientRect().top;
      return Math.abs(w) < 120;
    }""")
    check("portrait: skip link lands on Work", at_work)
    ctx.close()

    ctx = browser.new_context(viewport=PHONE_LANDSCAPE, has_touch=True, is_mobile=True)
    ctx.set_default_timeout(8000)
    ctx.add_init_script(INIT)
    ctx.add_init_script(PAINT_PROBE)
    page = ctx.new_page()
    enter_via_gate(page, base)
    r = page.evaluate("""() => {
      const el = document.getElementById('bridge-rotate');
      const hero = document.getElementById('bridge-hero').getBoundingClientRect();
      return {
        shown: el ? getComputedStyle(el).display !== 'none' : null,
        hero: Math.round(hero.height),
        vh: window.innerHeight,
      };
    }""")
    check("landscape: no rotate notice", r["shown"] is False, r)
    check("landscape: hero fits the viewport", r["hero"] <= r["vh"] + 1, r)
    running = page.evaluate("""async () => {
      const a = window.__paints;
      await new Promise(r => setTimeout(r, 1200));
      return { before: a, after: window.__paints };
    }""")
    check("landscape: the render loop runs",
          running["after"] > running["before"], running)
    ctx.close()

    ctx, page = new_page(browser)
    enter_via_gate(page, base)
    shown = page.evaluate(
        "() => { const el = document.getElementById('bridge-rotate');"
        " return el ? getComputedStyle(el).display !== 'none' : null; }")
    check("desktop: no rotate notice", shown is False, shown)
    ctx.close()

    ctx = browser.new_context(viewport=PHONE_LANDSCAPE, has_touch=True, is_mobile=True)
    ctx.set_default_timeout(8000)
    ctx.add_init_script(INIT)
    page = ctx.new_page()
    enter_via_gate(page, base)
    tab = page.evaluate("""() => { const r = document.querySelector('a.obj[href="projects/conclusus.html"]').getBoundingClientRect();
      return r.width > 0 && r.height > 0; }""")
    check("phone: the Conclusus row is visible", tab)
    ln = page.evaluate("""() => { const e = document.querySelector('a.obj[href="projects/conclusus.html"] > .obj-line'), cs = getComputedStyle(e);
      return { opacity: +cs.opacity, vis: cs.visibility, h: e.offsetHeight }; }""")
    check("phone: the detail line is shown without hover", ln["opacity"] > 0.95 and ln["vis"] != "hidden" and ln["h"] > 0, ln)
    page.wait_for_timeout(1000)
    canvases = page.evaluate("""() => Array.from(document.querySelectorAll('canvas.play'))
      .filter(c => { const r = c.getBoundingClientRect(); const cs = getComputedStyle(c);
        return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; }).length""")
    check("phone: no visible canvas.play on the homepage", canvases == 0, canvases)
    ctx.close()


def flow_shell(browser, base):
    """The homepage top bar carries the nav, and each project page links on to the next project."""
    ctx, page = new_page(browser)
    page.goto(base + "/")
    page.wait_for_timeout(300)
    for label, href in (("Bridge", "#bridge-hero"), ("Games", "#work")):
        has = page.locator(f"header.topbar nav a[href='{href}']").count() > 0
        check(f"top bar has {label}", has)
    for case in CASES:
        row = page.locator(f"a.obj[href='projects/{case}.html']")
        check(f"{case}: its Work row links to its page", row.count() == 1)
        page.goto(f"{base}/projects/{case}.html")
        href = page.evaluate("(document.querySelector('a[rel=next]') || {}).href")
        check(f"{case}: page rel=next points to {NEXT[case]}", (href or "").endswith(f"/projects/{NEXT[case]}.html"), href)
        page.goto(base + "/")
    ctx.close()


def flow_rex(browser, base):
    """Claiming Rex spawns its three layers, then the kingdoms, each at the spot measured in flight."""
    ctx, page = new_page(browser)
    page.goto(base + "/?reset=1")
    enter_via_gate(page, base)
    page.keyboard.press("Escape")       # skip the cutscene if it is playing
    page.wait_for_timeout(400)
    page.keyboard.press("Escape")
    page.wait_for_timeout(1500)

    KINGDOMS = ("firstlight", "crimson", "bonespire", "titans", "valkhar", "law")
    unseen = page.evaluate("names => names.map(n => window.depthAlpha('bnote-rex-' + n))", list(KINGDOMS))
    check("rex: no kingdom's art is drawn before its beacon is claimed",
          all(a == 0 for a in unseen), unseen)

    report = page.evaluate("""() => {
      XP.award('beacon-bnote-rex', 1, 'Rex');
      window.depthsReveal();
      return window.depthsReport().filter(n => n.id.startsWith('bnote-rex-'));
    }""")
    ids = {n["id"] for n in report}
    check("rex: the three layers spawn",
          ids == {"bnote-rex-surface", "bnote-rex-under", "bnote-rex-hell"}, ids)

    report = page.evaluate("""() => {
      ['bnote-rex-surface', 'bnote-rex-under', 'bnote-rex-hell'].forEach(
        id => XP.award('beacon-' + id, 1, id));
      window.depthsReveal();
      return window.depthsReport().filter(n => n.id.startsWith('bnote-rex-'));
    }""")
    check("rex: all 10 nodes spawn", len(report) == 10, len(report))

    by_id = {n["id"]: n for n in report}
    check("rex: the layers leave from Rex",
          all(by_id["bnote-rex-" + n]["from"] == "bnote-rex" for n in ("surface", "under", "hell")),
          tuple(by_id["bnote-rex-" + n]["from"] for n in ("surface", "under", "hell")))
    check("rex: the kingdoms leave from the Surface",
          all(by_id["bnote-rex-" + n]["from"] == "bnote-rex-surface" for n in ("firstlight", "crimson", "bonespire")),
          tuple(by_id["bnote-rex-" + n]["from"] for n in ("firstlight", "crimson", "bonespire")))
    check("rex: the titans leave from the Underground",
          by_id["bnote-rex-titans"]["from"] == "bnote-rex-under", by_id["bnote-rex-titans"]["from"])
    PINNED = {
        "firstlight": (358041, 0.48), "crimson": (364671, 0.38),
        "under": (377837, 0.30), "bonespire": (371857, 0.25),
        "titans": (379543, 0.18), "hell": (392889, 0.25),
        "valkhar": (387467, 0.44), "law": (393803, 0.30),
        "seal": (395393, 0.35),
    }
    for name, (x, oy) in PINNED.items():
        n = by_id["bnote-rex-" + name]
        check(f"rex: {name} sits where it was measured",
              abs(n["x"] - x) < 0.5 and abs(n["oy"] - oy) < 1e-9, (n["x"], n["oy"]))

    check("rex: the surface layer keeps its layout seat",
          abs(by_id["bnote-rex-surface"]["off"] - (-0.07)) < 1e-9 and
          abs(by_id["bnote-rex-surface"]["oy"] - 0.24) < 1e-9,
          (by_id["bnote-rex-surface"]["off"], by_id["bnote-rex-surface"]["oy"]))

    has_art = page.evaluate("""names => names.every(n => window.RexArt && RexArt[n]
      && typeof RexArt[n].paint === 'function' && Array.isArray(RexArt[n].box) && RexArt[n].box.length === 4)""",
      list(KINGDOMS))
    check("rex: every kingdom has art", has_art)

    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    for x in (358041, 364671, 371857, 379543, 387467, 393803):
        page.evaluate("""x => {
          const view = JSON.stringify({ mode: 'void', voidCamX: x, gdCamX: null });
          sessionStorage.setItem('arcanis.view.v1', view);
          addEventListener('pagehide', () => sessionStorage.setItem('arcanis.view.v1', view));
        }""", x)
        page.reload()
        page.wait_for_timeout(1500)
    check("rex: every kingdom paints without a page error", not errors, errors)
    restored = page.evaluate("names => names.map(n => window.depthAlpha('bnote-rex-' + n))", list(KINGDOMS))
    check("rex: a reload restores every kingdom's art", all(a == 1 for a in restored), restored)
    ctx.close()


def flow_watcher(browser, base):
    """Claiming the Watcher spawns the Red Star and Serus, each at the spot measured in flight."""
    ctx, page = new_page(browser)
    page.goto(base + "/?reset=1")
    enter_via_gate(page, base)
    page.keyboard.press("Escape")       # skip the cutscene if it is playing
    page.wait_for_timeout(400)
    page.keyboard.press("Escape")
    page.wait_for_timeout(1500)

    unseen = page.evaluate("""() => ({
      redstar: window.depthAlpha('bnote-watcher-redstar'),
      serus: window.depthAlpha('bnote-watcher-serus'),
    })""")
    check("watcher: red star art is not drawn before the beacon is claimed",
          unseen["redstar"] == 0, unseen["redstar"])
    check("watcher: serus art is not drawn before the beacon is claimed",
          unseen["serus"] == 0, unseen["serus"])

    report = page.evaluate("""() => {
      XP.award('beacon-bnote-watcher', 1, 'The Watcher');
      window.depthsReveal();
      return window.depthsReport().filter(n => n.id.startsWith('bnote-watcher-'));
    }""")
    ids = {n["id"] for n in report}
    check("watcher: the red star and serus spawn",
          ids == {"bnote-watcher-redstar", "bnote-watcher-serus"}, ids)

    by_id = {n["id"]: n for n in report}
    PINNED = {"redstar": (334257, 0.40), "serus": (335882, 0.52)}
    for name, (x, oy) in PINNED.items():
        n = by_id["bnote-watcher-" + name]
        check(f"watcher: {name} sits where it was measured",
              abs(n["x"] - x) < 0.5 and abs(n["oy"] - oy) < 1e-9, (n["x"], n["oy"]))
    ctx.close()


def flow_bridge_depths(browser, base):
    """The Void beacon opens the Nephilim, the Administration and the Void Vikings, each pinned where it was placed; the Bridge beacon unlocks nothing."""
    ctx, page = new_page(browser)
    page.goto(base + "/?reset=1")
    enter_via_gate(page, base)
    page.keyboard.press("Escape")       # skip the cutscene if it is playing
    page.wait_for_timeout(400)
    page.keyboard.press("Escape")
    page.wait_for_timeout(1500)

    bridge_only = page.evaluate("""() => {
      XP.award('beacon-bnote-bridge', 1, 'The Bridge');
      window.depthsReveal();
      return {
        ids: window.depthsReport().filter(n => n.id.startsWith('bnote-bridge-')).map(n => n.id),
        alpha: window.depthAlpha('bnote-bridge-nephilim'),
      };
    }""")
    check("bridge: claiming the Bridge alone spawns no void-people nodes",
          bridge_only["ids"] == [], bridge_only["ids"])
    check("bridge: nephilim art is not shown before the Void is claimed",
          bridge_only["alpha"] == 0, bridge_only["alpha"])

    report = page.evaluate("""() => {
      XP.award('beacon-bnote-void', 1, 'The Void');
      window.depthsReveal();
      return window.depthsReport().filter(n => n.id.startsWith('bnote-bridge-'));
    }""")
    ids = {n["id"] for n in report}
    check("bridge: the nephilim, administration and void vikings spawn",
          ids == {"bnote-bridge-nephilim", "bnote-bridge-admin", "bnote-bridge-vikings"}, ids)

    by_id = {n["id"]: n for n in report}
    PINNED = {"nephilim": (45357, 0.40), "admin": (128000, 0.34), "vikings": (292000, 0.30)}
    for name, (x, oy) in PINNED.items():
        n = by_id["bnote-bridge-" + name]
        check(f"bridge: {name} sits where it was measured",
              abs(n["x"] - x) < 0.5 and abs(n["oy"] - oy) < 1e-9, (n["x"], n["oy"]))

    off_screen = page.evaluate("""() => ({
      nephilim: { cue: window.depthsReport().find(n => n.id === 'bnote-bridge-nephilim').cue,
                  alpha: window.depthAlpha('bnote-bridge-nephilim') },
      admin: { cue: window.depthsReport().find(n => n.id === 'bnote-bridge-admin').cue,
               alpha: window.depthAlpha('bnote-bridge-admin') },
      vikings: { cue: window.depthsReport().find(n => n.id === 'bnote-bridge-vikings').cue,
                 alpha: window.depthAlpha('bnote-bridge-vikings') },
    })""")
    check("bridge: off-screen void peoples show a cue and their art at once",
          all(v["cue"] and v["alpha"] == 1 for v in off_screen.values()), off_screen)

    page.reload()
    page.wait_for_timeout(SETTLE)
    restored = page.evaluate("""() => ({
      nephilim: { cue: window.depthsReport().find(n => n.id === 'bnote-bridge-nephilim').cue,
                  alpha: window.depthAlpha('bnote-bridge-nephilim') },
      admin: { cue: window.depthsReport().find(n => n.id === 'bnote-bridge-admin').cue,
               alpha: window.depthAlpha('bnote-bridge-admin') },
      vikings: { cue: window.depthsReport().find(n => n.id === 'bnote-bridge-vikings').cue,
                 alpha: window.depthAlpha('bnote-bridge-vikings') },
    })""")
    check("bridge: a reload restores their art fully",
          all(v["alpha"] == 1 and not v["cue"] for v in restored.values()), restored)
    ctx.close()


def flow_land_depths(browser, base):
    """Mainland beacon opens the Shattered, LiberTech, the Sigil of the First Dawn, the Divine Accord and the Gore-Engine Legion, each pinned where it was placed."""
    ctx, page = new_page(browser)
    page.goto(base + "/?reset=1")
    enter_via_gate(page, base)
    page.keyboard.press("Escape")       # skip the cutscene if it is playing
    page.wait_for_timeout(400)
    page.keyboard.press("Escape")
    page.wait_for_timeout(1500)

    report = page.evaluate("""() => {
      XP.award('beacon-bnote-land', 1, 'The Mainland');
      window.depthsReveal();
      return window.depthsReport().filter(n => n.id.startsWith('bnote-land-'));
    }""")
    ids = {n["id"] for n in report}
    check("landdepths: the shattered, libertech, dawn, accord and gore spawn",
          ids == {"bnote-land-shattered", "bnote-land-libertech", "bnote-land-dawn", "bnote-land-accord", "bnote-land-gore"}, ids)

    by_id = {n["id"]: n for n in report}
    PINNED = {"shattered": (58400, 0.30), "libertech": (62300, 0.26), "dawn": (65800, 0.20), "accord": (73400, 0.22), "gore": (77900, 0.30)}
    for name, (x, oy) in PINNED.items():
        n = by_id["bnote-land-" + name]
        check(f"landdepths: {name} sits where it was measured",
              abs(n["x"] - x) < 0.5 and abs(n["oy"] - oy) < 1e-9, (n["x"], n["oy"]))
    ctx.close()


def flow_links(browser, base):
    """Every internal link and asset on every page answers 200, and #anchors exist."""
    ctx, page = new_page(browser)
    pages = ["/"] + [f"/projects/{c}.html" for c in CASES]
    seen: dict[str, int] = {}
    ids_on: dict[str, list] = {}
    broken: list[str] = []
    missing: list[str] = []
    for path in pages:
        page.goto(base + path)
        page.wait_for_timeout(300)
        here = urllib.parse.urlsplit(page.url).path
        ids_on["/" if here in ("/", "/index.html") else here] = page.evaluate(
            "Array.from(document.querySelectorAll('[id]')).map(e => e.id)")
        refs = page.evaluate("""() => Array.from(document.querySelectorAll(
              'a[href], img[src], video[src], video[poster], link[href], script[src]'))
            .map(e => e.getAttribute('href') || e.getAttribute('src') || e.getAttribute('poster'))""")
        for ref in refs:
            if not ref or ref.startswith(("http:", "https:", "mailto:", "//", "data:")):
                continue
            url = urllib.parse.urljoin(page.url, ref)
            if urllib.parse.urlsplit(url).netloc != urllib.parse.urlsplit(base).netloc:
                continue
            bare = url.split("#")[0].split("?")[0]
            if bare not in seen:
                seen[bare] = page.request.fetch(bare, method="HEAD").status
            if seen[bare] != 200:
                broken.append(f"{path} -> {ref} ({seen[bare]})")
            frag = urllib.parse.urlsplit(url).fragment
            if frag:
                target = urllib.parse.urlsplit(bare).path
                target = "/" if target in ("/", "/index.html") else target
                if target in ids_on and frag not in ids_on[target]:
                    missing.append(f"{path} -> {ref}")
    check(f"internal links and assets answer 200 ({len(seen)} checked)", not broken, broken)
    check("every #anchor points at an element that exists", not missing, missing)
    check("the four folder ids exist", all(c in ids_on["/"] for c in CASES), CASES)
    ctx.close()


CC_OWNED = "() => !!(window.XP && XP.has('proj-conclusus'))"
CC_PLAY_IDS = ("play-conclusus",)
HL_REPORT = "() => { const P = window.PlayHeavyLight; return P && P.report ? P.report() : null; }"
CC_PLAY_OWNED = "ids => ids.filter(id => window.XP && XP.has(id))"
CC_REPORT = "() => { const P = window.PlayConclusus; return P && P.report ? P.report() : null; }"
CC_HEAD = "() => { const r = document.getElementById('cc-taught').getBoundingClientRect(); return { top: r.top, mid: innerHeight / 2, y: scrollY }; }"


def flow_cc_read_xp(browser, base):
    """Conclusus pays no XP (bridge-only): not on load, not at "What it taught me"."""
    for viewport, label in ((DESKTOP, "desktop"), (PHONE, "phone")):
        ctx, page = new_page(browser, viewport)
        goto_cc(page, base)
        page.wait_for_timeout(1500)
        check(f"cc-read-xp: not owned after load ({label})", not page.evaluate(CC_OWNED))
        page.mouse.move(viewport["width"] / 2, viewport["height"] / 2)
        early = False
        crossed = False
        bottom = False
        how = "none"
        h = None
        last_y = None
        still = 0
        for _ in range(200):
            page.mouse.wheel(0, 120)
            page.wait_for_timeout(80)
            h = page.evaluate(CC_HEAD)
            if h["top"] > h["mid"] + 10 and page.evaluate(CC_OWNED):
                early = True
            still = still + 1 if h["y"] == last_y else 0
            last_y = h["y"]
            if h["top"] < h["mid"]:
                crossed = True
                how = "mid"
                break
            if still >= 3:
                bottom = True
                how = "bottom"
                break
        print(f"    info  cc-read-xp ({label}): stopped at {how}, heading top {round(h['top'])}, mid {h['mid']}")
        check(f"cc-read-xp: heading reached mid-screen or the page bottom ({label})", crossed or bottom, h)
        check(f"cc-read-xp: not owned before the heading ({label})", not early)
        page.wait_for_timeout(500)
        check(f"cc-read-xp: not owned after the heading, XP is bridge-only ({label})", not page.evaluate(CC_OWNED), h)
        ctx.close()
    ctx, page = new_page(browser, DESKTOP)
    goto_cc(page, base)
    page.wait_for_timeout(1500)
    check("cc-read-xp: not owned after load (jump)", not page.evaluate(CC_OWNED))
    page.evaluate("window.scrollTo({ top: document.getElementById('cc-taught').getBoundingClientRect().top + scrollY - innerHeight / 4, behavior: 'instant' })")
    page.wait_for_timeout(600)
    check("cc-read-xp: not owned after jumping past the heading, XP is bridge-only", not page.evaluate(CC_OWNED))
    ctx.close()


def flow_cc_scroll_pays_nothing(browser, base):
    """Conclusus: scrolling the whole page and back owns no play-* XP and teleports nothing."""
    ctx, page = new_page(browser, DESKTOP)
    goto_cc(page, base)
    page.wait_for_timeout(1500)
    r = page.evaluate(CC_REPORT)
    check("cc-scroll-pays-nothing: report() present", r is not None)
    page.mouse.move(DESKTOP["width"] - 60, DESKTOP["height"] / 2)
    last_y = None
    still = 0
    for _ in range(200):
        page.mouse.wheel(0, 240)
        page.wait_for_timeout(120)
        y = page.evaluate("() => scrollY")
        still = still + 1 if y == last_y else 0
        last_y = y
        if still >= 3:
            break
    page.wait_for_timeout(800)
    last_y = None
    still = 0
    for _ in range(200):
        page.mouse.wheel(0, -240)
        page.wait_for_timeout(120)
        y = page.evaluate("() => scrollY")
        still = still + 1 if y == last_y else 0
        last_y = y
        if y == 0 or still >= 3:
            break
    page.wait_for_timeout(800)
    owned = page.evaluate(CC_PLAY_OWNED, list(CC_PLAY_IDS))
    check("cc-scroll-pays-nothing: no play-* XP owned", owned == [], owned)
    r = page.evaluate(CC_REPORT)
    check("cc-scroll-pays-nothing: no teleport, marker still shown", r is not None and r["teleports"] == 0 and r["marker"] is True, r)
    ctx.close()


def cc_stage_view(page):
    """Scroll the Conclusus stage to mid-viewport and let it paint."""
    page.evaluate("() => { const r = document.querySelector('figure.gp-stage').getBoundingClientRect(); window.scrollTo({ top: scrollY + r.top + r.height / 2 - innerHeight / 2, behavior: 'instant' }); }")
    page.wait_for_timeout(700)


def hl_stage_view(page):
    """Scroll the HeavyLight stage to mid-viewport and let it paint."""
    page.evaluate("() => { const r = document.querySelector('figure.gp-stage').getBoundingClientRect(); window.scrollTo({ top: scrollY + r.top + r.height / 2 - innerHeight / 2, behavior: 'instant' }); }")
    page.wait_for_timeout(700)


def hl_click(page, lamp_id):
    """Click a HeavyLight lamp at its fresh report() centre (viewport px); returns the report read just before the click."""
    r = page.evaluate(HL_REPORT)
    lamp = next(l for l in r["lamps"] if l["id"] == lamp_id)
    page.mouse.click(lamp["cx"], lamp["cy"])
    return r


def cc_click(page, kind):
    """Click a stage target (report().targets[kind], viewport coordinates), polling up to 4 s for it; None (a failed check) when there is none."""
    r = None
    for _ in range(80):
        r = page.evaluate(CC_REPORT)
        if r and r["targets"].get(kind):
            break
        page.wait_for_timeout(50)
    t = r and r["targets"].get(kind)
    if not t:
        check(f"cc: stage target {kind} available to click", False, r)
        return None
    page.mouse.click(t["x"], t["y"])
    return t


def flow_cc_teleport(browser, base):
    """Conclusus teleport toy: a click on a ledge puts the man there, facing the way he went; the award fires once; no XP."""
    ctx, page = new_page(browser, DESKTOP)
    goto_cc(page, base)
    cc_stage_view(page)

    r = page.evaluate(CC_REPORT)
    check("cc-teleport: stage built, 0 teleports, marker shown", r is not None and r["teleports"] == 0 and r["marker"] is True, r)
    page.evaluate("() => { window.__awards = []; const a = Play.award; Play.award = function (id) { window.__awards.push(id); return a.apply(this, arguments); }; }")

    t = cc_click(page, "tl")
    page.wait_for_timeout(150)
    r = page.evaluate(CC_REPORT)
    if t and r:
        m = r["man"]
        check("cc-teleport: click tl puts the man on it, facing left, 1 teleport, marker gone",
              abs(m["x"] - t["x"]) <= 4 and abs(m["y"] - t["y"]) <= 4 and m["face"] == -1 and r["teleports"] == 1 and r["marker"] is False, [m, t, r["teleports"]])
        check("cc-teleport: the teleport draws a burst", r["bursts"] > 0, r["bursts"])
    awards = page.evaluate("() => window.__awards")
    check("cc-teleport: Play.award called once with play-conclusus", awards == ["play-conclusus"], awards)

    t = cc_click(page, "tr")
    page.wait_for_timeout(150)
    r = page.evaluate(CC_REPORT)
    if t and r:
        m = r["man"]
        check("cc-teleport: click tr puts the man on it, facing right, 2 teleports",
              abs(m["x"] - t["x"]) <= 4 and abs(m["y"] - t["y"]) <= 4 and m["face"] == 1 and r["teleports"] == 2, [m, t, r["teleports"]])
    awards = page.evaluate("() => window.__awards")
    check("cc-teleport: still one award call after the second teleport", awards == ["play-conclusus"], awards)
    ctx.close()


def flow_cc_idle(browser, base):
    """Conclusus teleport toy: after a click and the mouse leaving, bursts end and nothing paints at rest."""
    ctx, page = new_page(browser, DESKTOP)
    goto_cc(page, base)
    cc_stage_view(page)
    cc_click(page, "tl")
    page.mouse.move(5, 5)
    r = None
    for _ in range(40):
        page.wait_for_timeout(50)
        r = page.evaluate(CC_REPORT)
        if r and r["bursts"] == 0:
            break
    check("cc-idle: bursts reach 0 within 2 s", r is not None and r["bursts"] == 0, r and r["bursts"])
    snap = "() => document.querySelector('figure.gp-stage canvas').toDataURL()"
    d0, img0 = r and r["draws"], page.evaluate(snap)
    page.wait_for_timeout(1000)
    r = page.evaluate(CC_REPORT)
    img1 = page.evaluate(snap)
    check("cc-idle: draws unchanged over 1 s", r is not None and r["draws"] == d0, [d0, r and r["draws"]])
    check("cc-idle: the canvas is unchanged over 1 s", img0 == img1)
    ctx.close()


def flow_hl_ride(browser, base):
    """HeavyLight stage: a click on the left or right lamp lights its beam and the man rides it, then stops dead when the beam ends; no XP."""
    ctx, page = new_page(browser, DESKTOP)
    goto_hl(page, base)
    hl_stage_view(page)
    r = page.evaluate(HL_REPORT)
    check("hl-ride: stage built (ready, painted)", r is not None and r["ready"] and r["painted"], r)
    check("hl-ride: marker shown and 0 clicks before any click", r and r["marker"] and r["clicks"] == 0, r)
    for n, lamp_id in ((1, "left"), (2, "right")):
        hl_click(page, lamp_id)
        page.wait_for_timeout(200)
        r1 = page.evaluate(HL_REPORT)
        page.wait_for_timeout(600)
        r2 = page.evaluate(HL_REPORT)
        lamp = next(l for l in r1["lamps"] if l["id"] == lamp_id)
        check(f"hl-ride: {lamp_id} beam is on after the click", lamp["on"], r1["lamps"])
        check(f"hl-ride: {lamp_id}: the man moves and x changes between 200 and 800 ms",
              r1["man"]["moving"] and r2["man"]["moving"] and r1["man"]["x"] != r2["man"]["x"], (r1["man"], r2["man"]))
        check(f"hl-ride: {lamp_id}: clicks reads {n}", r2["clicks"] == n, r2["clicks"])
        check(f"hl-ride: {lamp_id}: marker gone after the click", not r2["marker"], r2["marker"])
        stopped = None
        for _ in range(22):  # 200 + 600 ms already waited since the click: 3 s in all
            page.wait_for_timeout(100)
            stopped = page.evaluate(HL_REPORT)
            if not stopped["man"]["moving"]:
                break
        check(f"hl-ride: {lamp_id}: the man stops within 3 s of the click", not stopped["man"]["moving"], stopped["man"])
        page.wait_for_timeout(300)
        after = page.evaluate(HL_REPORT)
        check(f"hl-ride: {lamp_id}: x unchanged over the next 300 ms", after["man"]["x"] == stopped["man"]["x"], (stopped["man"], after["man"]))
        page.wait_for_timeout(300)
    owned = page.evaluate(CC_PLAY_OWNED, ["play-heavylight"])
    check("hl-ride: no play-* XP owned (bridge-only)", owned == [], owned)
    ctx.close()


def flow_hl_crate(browser, base):
    """HeavyLight stage: the floor beam lifts the crate toward the ceiling within 1 s, it falls back within 4 s of the click and rests at its start y by 6 s."""
    ctx, page = new_page(browser, DESKTOP)
    goto_hl(page, base)
    hl_stage_view(page)
    r0 = page.evaluate(HL_REPORT)
    y0 = r0["crate"]["y"]
    hl_click(page, "floor")
    up_at = down_at = None
    back_y = None
    for i in range(1, 61):
        page.wait_for_timeout(100)
        r = page.evaluate(HL_REPORT)
        c = r["crate"]
        t = i * 0.1
        if up_at is None and c["g"] == "up" and c["y"] < y0:
            up_at = t
        if up_at is not None and down_at is None and c["g"] == "down":
            down_at = t
        if abs(c["y"] - y0) <= 2 and down_at is not None:
            back_y = c["y"]
            break
    check("hl-crate: g reads 'up' and the crate is higher within 1 s", up_at is not None and up_at <= 1.0, {"up_at": up_at, "y0": y0})
    check("hl-crate: g reads 'down' again within 4 s of the click", down_at is not None and down_at <= 4.0, {"down_at": down_at})
    check("hl-crate: back at its start y (+-2 px) within 6 s", back_y is not None, {"y0": y0, "last": c["y"]})
    ctx.close()


def flow_hl_phone(browser, base):
    """HeavyLight on a phone: the stage figure has a zero-size rect, report() is null or not ready, and there is no canvas.play."""
    ctx, page = new_page(browser, PHONE)
    goto_hl(page, base)
    box = page.evaluate("() => { const f = document.querySelector('figure.gp-stage'); const r = f && f.getBoundingClientRect(); return r ? [r.width, r.height] : null; }")
    check("hl-phone: the stage figure has a zero-size rect", box is not None and box[0] == 0 and box[1] == 0, box)
    r = page.evaluate(HL_REPORT)
    check("hl-phone: report() is null or not ready", r is None or not r.get("ready"), r)
    check("hl-phone: no canvas.play", page.locator("canvas.play").count() == 0)
    ctx.close()


def flow_work_hover(browser, base):
    """Hovering a Work row plays its clip (its button is always shown); a row stays open until another row or leaving Work closes it; one row previews at a time."""
    ctx, page = new_page(browser)
    enter_via_gate(page, base)
    sel = lambda k: f"a.obj[href='projects/{k}.html']"
    read = lambda k: page.evaluate("""(k) => { const row = document.querySelector("a.obj[href='projects/" + k + ".html']"), v = row.querySelector('video'),
      shown = (e) => { const cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0; };
      return { paused: v.paused, t: v.currentTime, goShown: shown(row.querySelector('.obj-go')), goColor: getComputedStyle(row.querySelector('.obj-go')).color, arrowOp: +getComputedStyle(row.querySelector('.obj-go > .go')).opacity,
      detailsShown: shown(row.querySelector('.obj-line')), factsShown: shown(row.querySelector('.props')),
      lineBox: row.querySelector('.obj-line').offsetHeight > 0, squareOp: +getComputedStyle(row.querySelector('.obj-det i')).opacity,
      k: row.getBoundingClientRect().width / row.offsetWidth, sqW: row.querySelector('.obj-det i').offsetWidth, labelX: row.querySelector('.obj-det .obj-id').getBoundingClientRect().left,
      titleX: (() => { const g = document.createRange(); g.selectNodeContents(row.querySelector('h3')); return Math.min(...[...g.getClientRects()].filter(q => q.width).map(q => q.left)); })(),
      peeking: document.querySelectorAll('.obj.is-peek').length,
      detAng: (() => { const m = new DOMMatrix(getComputedStyle(row.querySelector('.obj-det')).transform); return Math.atan2(m.b, m.a) * 180 / Math.PI; })(), ea: parseFloat(row.style.getPropertyValue('--wk-ea')) }; }""", k)
    page.evaluate("""() => document.querySelector("a.obj[href='projects/voidscape.html']").scrollIntoView({ block: 'center', behavior: 'instant' })""")
    page.mouse.move(2, 2)                   # the pointer parked on the top bar, off every row
    page.wait_for_timeout(700)
    r = read("voidscape")
    check("work-hover: idle row: clip paused, tag shown in grey with its arrow hidden, red square hidden, facts and details shown", r["paused"] and r["goShown"] and r["goColor"] == "rgb(143, 136, 120)" and r["arrowOp"] == 0 and r["factsShown"] and r["detailsShown"] and r["lineBox"] and r["squareOp"] == 0, r)
    rest = r
    check("work-hover: idle row: the red square has zero width and the OBJ label runs parallel to the box's top edge (own block, not at the title's left edge)", rest["sqW"] == 0 and abs(rest["detAng"] - rest["ea"]) <= 0.5 and abs(rest["labelX"] - rest["titleX"]) > 1, r)
    page.hover(sel("voidscape"))
    r = None
    for _ in range(10):
        page.wait_for_timeout(200)
        r = read("voidscape")
        if not r["paused"] and r["t"] > 0:
            break
    page.wait_for_timeout(400)              # the tag's .2 s colour and arrow fade
    r = read("voidscape")
    check("work-hover: hover plays the clip within 2 s", not r["paused"] and r["t"] > 0, r)
    check("work-hover: tag, red square, facts and details shown on hover; the tag is cream with its arrow shown", r["goShown"] and r["goColor"] != rest["goColor"] and r["arrowOp"] == 1 and r["factsShown"] and r["detailsShown"] and r["squareOp"] > 0.95, r)
    tg = page.evaluate("""() => { const row = document.querySelector("a.obj[href='projects/voidscape.html']"), go = row.querySelector('.obj-go'), pr = row.querySelector('.props'),
      mg = new DOMMatrix(getComputedStyle(go).transform), mp = new DOMMatrix(getComputedStyle(pr).transform), flip = row.classList.contains('is-flip'), W = row.offsetWidth,
      a = Math.atan2(mg.b, mg.a), c = Math.cos(a), s = Math.sin(a), ap = Math.atan2(mp.b, mp.a), shown = [...pr.children].filter(d => d.offsetWidth), last = shown[shown.length - 1],
      iw = last.offsetLeft + last.offsetWidth, ox = go.offsetLeft + mg.e, oy = go.offsetTop + mg.f, dx = ox - (pr.offsetLeft + mp.e), dy = oy - (pr.offsetTop + mp.f),
      lx = dx * Math.cos(ap) + dy * Math.sin(ap), ly = -dx * Math.sin(ap) + dy * Math.cos(ap),
      xs = [[0, 0], [go.offsetWidth, 0], [0, go.offsetHeight], [go.offsetWidth, go.offsetHeight]].map(p => ox + p[0] * c - p[1] * s);
      return { inset: flip ? Math.min(...xs) : W - Math.max(...xs), ly: ly, tilt: Math.abs(a - ap), gap: flip ? shown[0].offsetLeft - (lx + go.offsetWidth) : lx - iw, flip: flip }; }""")
    check("work-hover: tag 24 px (+-2) from the plate's inner edge, on the facts' baseline and tilt, 16 px or more from the facts", abs(tg["inset"] - 24) <= 2 and abs(tg["ly"]) <= 2 and tg["tilt"] < 0.001 and tg["gap"] >= 15.5, tg)
    check("work-hover: on hover the mirrored row's OBJ label slides left (toward the centre) by the square's width + 12 px gap, the title does not move", r["sqW"] > 0 and abs((rest["labelX"] - r["labelX"]) - (r["sqW"] + 12) * r["k"]) <= 1 and abs(r["titleX"] - rest["titleX"]) <= 1, r)
    page.evaluate("""() => document.querySelector("a.obj[href='projects/conclusus.html']").scrollIntoView({ block: 'center', behavior: 'instant' })""")
    page.wait_for_timeout(700)
    page.hover(sel("conclusus"))
    page.wait_for_timeout(600)
    a, b = read("voidscape"), read("conclusus")
    check("work-hover: only one row previews", a["paused"] and not b["paused"] and b["peeking"] == 1, [a, b])
    box = page.evaluate("""() => { const r = document.querySelector("a.obj[href='projects/conclusus.html']").getBoundingClientRect();
      const n = document.querySelector("a.obj[href='projects/heavylight.html']").getBoundingClientRect();
      return { x: r.left + r.width / 2, bottom: r.bottom, nextTop: n.top }; }""")
    if box["nextTop"] - box["bottom"] > 4:
        page.mouse.move(box["x"], (box["bottom"] + box["nextTop"]) / 2)
        page.wait_for_timeout(500)
        r = read("conclusus")
        check("work-hover: leaving a row into a gap keeps it open", not r["paused"] and r["goShown"] and r["peeking"] == 1, r)
    page.evaluate("""() => document.querySelector("a.obj[href='projects/heavylight.html']").scrollIntoView({ block: 'center', behavior: 'instant' })""")
    page.wait_for_timeout(500)
    page.hover(sel("heavylight"))
    page.wait_for_timeout(600)
    a, b = read("conclusus"), read("heavylight")
    check("work-hover: entering the next row swaps", a["paused"] and b["peeking"] == 1 and b["goShown"], [a, b])
    page.mouse.move(2, 2)
    page.wait_for_timeout(500)
    r = read("heavylight")
    check("work-hover: leaving Work closes it", r["paused"] and r["peeking"] == 0, r)
    ctx.close()


def flow_game_page_loads(browser, base):
    """Each /projects/<game>.html loads as itself: no redirect, its own title, a Back to Work link."""
    ctx, page = new_page(browser)
    for c in CASES:
        page.goto(f"{base}/projects/{c}.html")
        page.wait_for_timeout(600)
        check(f"game-page: {c} stays on its page", page.url.endswith(f"/projects/{c}.html"), page.url)
        back = page.locator("a.back")
        if c in ("conclusus", "heavylight"):
            stage = page.evaluate("() => { const c = document.querySelector('figure.gp-stage canvas'); return !!c && c.getContext('2d') !== null; }")
            check(f"game-page: {c} has the stage canvas, not canvas.play",
                  stage and page.locator("canvas.play").count() == 0, stage)
        check(f"game-page: {c} has Back to Work to /#{c}", back.count() == 1 and back.first.get_attribute("href") == f"../#{c}",
              back.first.get_attribute("href") if back.count() else None)
    ctx.close()


def flow_game_page_roundtrip(browser, base):
    """Row, case page, Back to Work lands on that row, and the gate does not replay."""
    ctx, page = new_page(browser)
    enter_via_gate(page, base)
    scroll_to(page, "work")
    n0 = page.evaluate("history.length")
    page.click("a.obj[href='projects/voidscape.html']")
    page.wait_for_url("**/projects/voidscape.html")
    n0 += 1
    check("roundtrip: the row leads to the game page", page.url.endswith("/projects/voidscape.html"), page.url)
    page.click("a.back")
    page.wait_for_url(lambda u: "/projects/" not in u)
    page.wait_for_timeout(300)
    page.wait_for_timeout(SETTLE)
    g = gate_state(page)
    check("roundtrip: Back to Work shows no gate", not g["shown"], g)
    check("roundtrip: history did not grow", page.evaluate("history.length") == n0, page.evaluate("history.length"))
    top = page.evaluate("document.getElementById('voidscape').getBoundingClientRect().top")
    check("roundtrip: Work is scrolled to the VoidScape row, nothing opened", 0 <= top < 900, top)
    page.click("a.obj[href='projects/voidscape.html']")
    page.wait_for_url("**/projects/voidscape.html")
    page.click("a.gp-up")
    page.wait_for_url(lambda u: "/projects/" not in u)
    page.wait_for_timeout(300)
    page.wait_for_timeout(SETTLE)
    check("roundtrip: the end link shows no gate and history did not grow",
          not gate_state(page)["shown"] and page.evaluate("history.length") == n0, page.evaluate("history.length"))
    top = page.evaluate("document.getElementById('voidscape').getBoundingClientRect().top")
    check("roundtrip: the end link lands on the VoidScape row", 0 <= top < 900, top)
    ctx.close()


def flow_gate_once(browser, base):
    """The gate shows on a fresh tab; once passed, the homepage in the same tab shows none; a new tab shows it again."""
    ctx, page = new_page(browser)
    page.goto(base + "/")
    page.wait_for_selector("#gate-bar", timeout=10000)
    check("gate-once: a fresh context shows the gate", gate_state(page)["shown"], gate_state(page))
    wait_gate_done(page)
    page.wait_for_timeout(2500)
    page.goto(base + "/#work")
    page.wait_for_timeout(SETTLE)
    s = state(page)
    check("gate-once: index.html#work in the same tab shows no gate", not s["gateShown"] and not s["frozen"], s)
    ok, why = lands_on_work(page, s)
    check("gate-once: ... and lands on Work", ok, why)
    ctx.close()
    ctx2, page2 = new_page(browser)
    page2.goto(base + "/")
    page2.wait_for_selector("#gate-bar", timeout=10000)
    check("gate-once: a second fresh context shows the gate again", gate_state(page2)["shown"], gate_state(page2))
    ctx2.close()


def flow_back_direct(browser, base):
    """A game page opened directly, then Back to Work, lands on that game's row with the gate showing."""
    ctx, page = new_page(browser)
    page.goto(base + "/projects/voidscape.html")
    page.wait_for_timeout(600)
    page.click("a.back")
    page.wait_for_url("**/#voidscape")
    page.wait_for_timeout(300)
    g = gate_state(page)
    check("back-direct: the gate shows on the first homepage visit", g["shown"] and g["bar"], g)
    pass_gate(page, SETTLE)
    top = page.evaluate("document.getElementById('voidscape').getBoundingClientRect().top")
    check("back-direct: lands on the VoidScape row", 0 <= top < 900, top)
    ctx.close()


def flow_loop_pause(browser, base):
    """The hero loop stops once the hero is off screen and resumes, in place, when it returns."""
    ctx, page = new_page(browser)
    enter_via_gate(page, base)
    saved = page.evaluate("Bridge.camX")
    scroll_to(page, "work")
    page.wait_for_timeout(800)
    r = page.evaluate("({ visible: Bridge.visible, running: Bridge.pacer.running })")
    check("loop-pause: Bridge.visible is false at Work", r["visible"] is False, r)
    check("loop-pause: the pacer is not running at Work", r["running"] is False, r)
    page.evaluate("window.scrollTo({ top: 0, behavior: 'instant' })")
    page.wait_for_timeout(1000)
    r = page.evaluate("({ visible: Bridge.visible, running: Bridge.pacer.running, camX: Bridge.camX })")
    check("loop-pause: the pacer runs again at the top", r["running"] is True, r)
    check("loop-pause: camX is where it was", abs(r["camX"] - saved) <= 1, f"was {saved}, now {r['camX']}")
    ctx.close()


def flow_bridge_return(browser, base):
    """Pressing the paused, half-shown bridge scrolls back up to it and the ship plays on the way."""
    ctx, page = new_page(browser)
    enter_via_gate(page, base)
    half = "window.scrollTo({ top: Math.round(innerHeight / 2), behavior: 'instant' })"
    page.evaluate(half)
    page.wait_for_timeout(500)
    r = page.evaluate("({ visible: Bridge.visible, running: Bridge.pacer.running })")
    check("bridge-return: paused while half shown", r["visible"] is False and r["running"] is False, r)
    vp = page.viewport_size
    page.evaluate("""() => { window.__rs = { run: false, y: scrollY, tr: Bridge.travelled };
      const f = () => { if (Bridge.pacer.running && scrollY > 0) window.__rs.run = true; window.__rs.f = requestAnimationFrame(f); }; f(); }""")
    page.mouse.move(vp["width"] * 0.8, 120)
    page.mouse.down()
    page.wait_for_timeout(120)
    mid = page.evaluate("({ y: scrollY, running: Bridge.pacer.running, visible: Bridge.visible })")
    check("bridge-return: loop runs mid-scroll", mid["running"] is True and mid["visible"] is True and mid["y"] > 0, mid)
    page.wait_for_timeout(600)
    page.mouse.up()
    r = page.evaluate("({ y: scrollY, run: __rs.run, moved: Bridge.travelled - __rs.tr, covers: Bridge.coversViewport() })")
    check("bridge-return: scroll reached the top", r["y"] <= 1 and r["covers"] is True, r)
    check("bridge-return: loop ran during the scroll", r["run"] is True, r)
    check("bridge-return: the ship moved", r["moved"] > 0, r)
    page.evaluate("cancelAnimationFrame(__rs.f)")
    page.evaluate(half)
    page.wait_for_timeout(500)
    page.mouse.move(vp["width"] * 0.8, 120)
    page.mouse.down()
    page.wait_for_timeout(60)
    page.mouse.wheel(0, 300)
    page.wait_for_timeout(300)
    r = page.evaluate("({ y: scrollY, running: Bridge.pacer.running, visible: Bridge.visible, thrust: Bridge.thrustId })")
    check("bridge-return: wheel mid-scroll cancels, loop stops, burn ended", r["visible"] is False and r["thrust"] is None and r["y"] > 1, r)
    page.mouse.up()
    ctx.close()


def goto_vs(page, base):
    """Load the VoidScape page and let its three stages start."""
    page.goto(base + "/projects/voidscape.html")
    page.wait_for_selector("figure.gp-stage", state="attached")
    page.wait_for_timeout(1500)


def vs_stage_view(page, stage_id):
    """Scroll a VoidScape stage to mid-viewport and let it paint."""
    page.evaluate("id => { const r = document.getElementById(id).getBoundingClientRect(); window.scrollTo({ top: scrollY + r.top + r.height / 2 - innerHeight / 2, behavior: 'instant' }); }", stage_id)
    page.wait_for_timeout(700)


def flow_vs_range(browser, base):
    """VoidScape range stage: holding the pointer on it fires bullets; after release they run out and the stage goes quiet."""
    ctx, page = new_page(browser, DESKTOP)
    goto_vs(page, base)
    vs_stage_view(page, "vs-range-stage")
    r = page.evaluate("() => PlayRange.report()")
    t = r["targets"]["field"]
    page.mouse.move(t["x"], t["y"])
    page.mouse.down()
    peak = 0
    for _ in range(10):
        page.wait_for_timeout(100)
        peak = max(peak, page.evaluate("() => PlayRange.report().bullets"))
    held = page.evaluate("() => PlayRange.report().bullets")
    check("vs-range: bullets > 0 while held (~1 s)", held > 0 and peak > 0, [held, peak])
    page.mouse.up()
    page.mouse.move(5, 5)
    n = None
    for _ in range(60):
        page.wait_for_timeout(100)
        n = page.evaluate("() => PlayRange.report().bullets")
        if n == 0:
            break
    check("vs-range: bullets run out within 6 s of release", n == 0, n)
    page.wait_for_timeout(1000)
    n2 = page.evaluate("() => PlayRange.report().bullets")
    check("vs-range: no new bullets over the next 1 s (the stage is quiet)", n2 == 0, n2)
    ctx.close()


def flow_vs_bench_arms_range(browser, base):
    """VoidScape bench stage: a click on add arms the range with the bench's gun."""
    ctx, page = new_page(browser, DESKTOP)
    goto_vs(page, base)
    vs_stage_view(page, "vs-bench-stage")
    a0 = page.evaluate("() => PlayRange.report().armed")
    t = page.evaluate("() => VoidBench.report().targets.add")
    page.mouse.move(t["x"], t["y"])
    page.wait_for_timeout(150)
    page.mouse.click(t["x"], t["y"])
    a1 = a0
    for _ in range(20):
        page.wait_for_timeout(100)
        a1 = page.evaluate("() => PlayRange.report().armed")
        if a1 > a0:
            break
    check("vs-bench-arms-range: armed grows after the add click", a1 > a0, [a0, a1])
    same = page.evaluate("() => PlayRange.gun() === VoidBench.gun()")
    check("vs-bench-arms-range: PlayRange.gun() === VoidBench.gun()", same is True, same)
    ctx.close()


def flow_vs_map_roll(browser, base):
    """VoidScape map stage: a click rolls a new plan; every step climbs above the one before and the last is the boss."""
    ctx, page = new_page(browser, DESKTOP)
    goto_vs(page, base)
    vs_stage_view(page, "vs-map-stage")
    r0 = page.evaluate("() => VoidMapgen.report()")
    t = r0["targets"]["roll"]
    page.mouse.move(t["x"], t["y"])
    page.wait_for_timeout(150)
    page.mouse.click(t["x"], t["y"])
    page.wait_for_timeout(1500)
    r1 = page.evaluate("() => VoidMapgen.report()")
    check("vs-map-roll: rolls grows after the click", r1["rolls"] > r0["rolls"], [r0["rolls"], r1["rolls"]])
    check("vs-map-roll: the plan differs", r1["plan"] != r0["plan"], [len(r0["plan"]), len(r1["plan"])])
    ys = [s["y"] for s in r1["plan"]]
    check("vs-map-roll: every step sits above the one before", len(ys) > 1 and all(b < a for a, b in zip(ys, ys[1:])), ys)
    check("vs-map-roll: the last step is the boss", r1["plan"][-1]["kind"] == "boss", r1["plan"][-1])
    ctx.close()


def flow_vs_idle(browser, base):
    """VoidScape stages: with no pointer they paint only on the at-rest tick; no console error; hidden at 390 wide."""
    ctx, page = new_page(browser, DESKTOP)
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    goto_vs(page, base)
    snap = "() => ['vs-bench-stage', 'vs-map-stage', 'vs-range-stage'].map(id => document.getElementById(id).querySelector('canvas').toDataURL())"
    for sid in ("vs-bench-stage", "vs-map-stage", "vs-range-stage"):
        vs_stage_view(page, sid)
        page.mouse.move(5, 5)
        page.wait_for_timeout(1500)
        d0 = page.evaluate("() => VoidMapgen.report().draws")
        img0 = page.evaluate(snap)
        page.wait_for_timeout(1000)
        d1 = page.evaluate("() => VoidMapgen.report().draws")
        img1 = page.evaluate(snap)
        check(f"vs-idle: {sid}: map draws unchanged over 1 s", d0 == d1, [d0, d1])
        check(f"vs-idle: {sid}: all three canvases unchanged over 1 s", img0 == img1)
    check("vs-idle: no console error", errors == [], errors)
    ctx.close()
    ctx, page = new_page(browser, PHONE)
    goto_vs(page, base)
    boxes = page.evaluate("() => [...document.querySelectorAll('figure.gp-stage')].map(f => { const r = f.getBoundingClientRect(); return [r.width, r.height]; })")
    check("vs-idle: at 390 wide all three figure.gp-stage are hidden", len(boxes) == 3 and all(w == 0 or h == 0 for w, h in boxes), boxes)
    ctx.close()


FLOWS = {
    "bridge-return": flow_bridge_return,
    "first": flow_first, "gate-exits": flow_gate_exits, "gate-once": flow_gate_once, "back-direct": flow_back_direct, "back": flow_back,
    "reload": flow_reload, "worklink": flow_worklink, "deeplink": flow_deeplink,
    "returning": flow_returning, "wordmark": flow_wordmark, "reset": flow_reset,
    "genesis": flow_genesis, "genesis-segment": flow_genesis_segment, "glimpse": flow_glimpse,"genesis-scenes": flow_genesis_scenes,"twotabs": flow_twotabs, "header": flow_header,
    "shell": flow_shell, "phone": flow_phone, "rex": flow_rex,
    "watcher": flow_watcher, "bridge": flow_bridge_depths, "landdepths": flow_land_depths, "links": flow_links, "cc-read-xp": flow_cc_read_xp, "cc-scroll-pays-nothing": flow_cc_scroll_pays_nothing,
    "hl-ride": flow_hl_ride, "hl-crate": flow_hl_crate, "hl-phone": flow_hl_phone,
    "cc-teleport": flow_cc_teleport,
    "cc-idle": flow_cc_idle,
    "work-hover": flow_work_hover, "game-page-loads": flow_game_page_loads, "game-page-roundtrip": flow_game_page_roundtrip,
    "loop-pause": flow_loop_pause,
    "vs-range": flow_vs_range, "vs-bench-arms-range": flow_vs_bench_arms_range, "vs-map-roll": flow_vs_map_roll, "vs-idle": flow_vs_idle,
}


def main():
    args = sys.argv[1:]
    if "--list" in args:
        for name, fn in FLOWS.items():
            print(f"  {name:11} {fn.__doc__.strip()}")
        return 0
    unknown = [a for a in args if a not in FLOWS]
    if unknown:
        print("unknown flow(s):", ", ".join(unknown), "- use --list")
        return 2
    chosen = args or list(FLOWS)
    httpd, base = start_server()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            for name in chosen:
                print(f"\n[{name}] {FLOWS[name].__doc__.strip()}")
                try:
                    FLOWS[name](browser, base)
                except Exception as e:           # a crash is a failure, not a stop
                    check(f"{name} ran to the end", False, f"{type(e).__name__}: {e}".splitlines()[0])
            browser.close()
    finally:
        httpd.shutdown()
    print(f"\n{'OK' if not failures else 'FAILED'}: {len(failures)} failing check(s)")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
