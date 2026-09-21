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

ROOT = os.path.dirname(os.path.abspath(__file__))
DESKTOP = {"width": 1440, "height": 900}
PHONE = {"width": 390, "height": 844}
PHONE_LANDSCAPE = {"width": 844, "height": 390}
CASES = ["sector-zero", "voidscape", "heavylight", "conclusus"]
NEXT = {"sector-zero": "voidscape", "voidscape": "heavylight",
        "heavylight": "conclusus", "conclusus": "sector-zero"}
TOL = 4          # px of slack when comparing scroll positions
SETTLE = 2000    # ms: long enough for any smooth scroll to finish

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
  const active = document.querySelector('.mode-btn.active');
  return {
    url: location.pathname + location.search + location.hash,
    gateShown: !!gate && getComputedStyle(gate).display !== 'none',
    frozen: document.body.classList.contains('site-frozen'),
    scrollY: Math.round(scrollY),
    maxScroll: Math.round(maxScroll),
    workTop: top('work'),
    experienceTop: top('experience'),
    mode: active ? active.dataset.mode : null,
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


def enter_via_gate(page, base, button="#gate-projects"):
    """First visit: wait for the gate's buttons, pick one, let the +1 land."""
    page.goto(base + "/")
    page.wait_for_selector("#gate-panel.on", timeout=10000)
    page.click(button)
    page.wait_for_timeout(2500)

# ------------------------------------------------------------------ flows


def flow_first(browser, base):
    """First visit: the gate shows once; picking Game Dev enters Game Dev only."""
    ctx, page = new_page(browser)
    page.goto(base + "/")
    page.wait_for_timeout(300)
    s = state(page)
    check("first visit shows the gate", s["gateShown"], s)
    page.wait_for_selector("#gate-panel.on", timeout=10000)
    page.click("#gate-projects")
    page.wait_for_timeout(2500)
    s = state(page)
    check("gate closes after picking Game Dev", not s["gateShown"] and not s["frozen"], s)
    check("sector is Game Dev", s["mode"] == "gamedev", s["mode"])
    check("visitor is marked as seen", bool(s["stored"] and s["stored"]["seen"]), s["stored"])
    claimed = s["stored"]["claimed"] if s["stored"] else []
    check("Game Dev path awarded", "path-projects" in claimed, claimed)
    check("Setting path NOT awarded by picking Game Dev", "path-world" not in claimed, claimed)
    ctx.close()


def flow_gate_exits(browser, base):
    """The gate can be left without picking: Escape, or a top bar link."""
    ctx, page = new_page(browser)
    page.goto(base + "/")
    page.wait_for_selector("#gate-panel.on", timeout=10000)
    page.keyboard.press("Escape")
    page.wait_for_timeout(1500)
    s = state(page)
    check("Escape closes the gate", not s["gateShown"] and not s["frozen"], s)
    check("Escape enters Game Dev", s["mode"] == "gamedev", s["mode"])
    ctx.close()

    ctx, page = new_page(browser)
    page.goto(base + "/")
    page.wait_for_selector("#gate-panel.on", timeout=10000)
    page.click("header nav a[href='#work']")
    page.wait_for_timeout(SETTLE)
    s = state(page)
    check("top bar 'Work' works while the gate is up", not s["gateShown"] and not s["frozen"], s)
    check("... and lands on Work", near(s["scrollY"], min(s["workTop"], s["maxScroll"])), s)
    ctx.close()


def flow_back(browser, base):
    """Back from a case page restores the homepage as it was."""
    ctx, page = new_page(browser)
    enter_via_gate(page, base)
    scroll_to(page, "work")
    y0 = state(page)["scrollY"]
    page.click("a.obj[href='projects/sector-zero.html']")
    page.wait_for_load_state("load")
    page.wait_for_timeout(800)
    page.go_back()
    page.wait_for_timeout(SETTLE)
    s = state(page)
    check("Back: no gate", not s["gateShown"] and not s["frozen"], s)
    check("Back: sector is still Game Dev", s["mode"] == "gamedev", s["mode"])
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
    page.wait_for_timeout(SETTLE)
    s = state(page)
    check("reload: no gate", not s["gateShown"] and not s["frozen"], s)
    check("reload: sector is still Game Dev", s["mode"] == "gamedev", s["mode"])
    check("reload: scroll position kept", near(s["scrollY"], y0), f"was {y0}, now {s['scrollY']}")
    ctx.close()


def flow_worklink(browser, base):
    """'Work' in the top bar and '<- All work' on a case page land on Work."""
    for selector, label in (("header nav a[href='../index.html#work']", "top bar Work"),
                            ("main a.back", "All work")):
        ctx, page = new_page(browser)
        enter_via_gate(page, base)
        page.goto(base + "/projects/sector-zero.html")
        page.wait_for_timeout(800)
        page.click(selector)
        page.wait_for_load_state("load")
        page.wait_for_timeout(SETTLE)
        s = state(page)
        check(f"{label}: no gate", not s["gateShown"] and not s["frozen"], s)
        check(f"{label}: lands on Work", near(s["scrollY"], min(s["workTop"], s["maxScroll"])), s)
        ctx.close()


def flow_deeplink(browser, base):
    """A first-time visitor arriving on /#experience sees Experience."""
    ctx, page = new_page(browser)
    page.goto(base + "/#experience")
    page.wait_for_timeout(SETTLE)
    s = state(page)
    check("deep link: no gate", not s["gateShown"] and not s["frozen"], s)
    check("deep link: gate never painted", s["gateHiddenAtParse"] is True, s["gateHiddenAtParse"])
    check("deep link: lands on Experience",
          near(s["scrollY"], min(s["experienceTop"], s["maxScroll"])), s)
    check("deep link: visitor not marked as seen", not (s["stored"] and s["stored"]["seen"]), s["stored"])
    ctx.close()


def flow_returning(browser, base):
    """A returning visitor opening the bare homepage skips the gate, in the last sector."""
    for button, mode in (("#gate-projects", "gamedev"), ("#gate-world", "void")):
        ctx, page = new_page(browser)
        enter_via_gate(page, base, button)
        if mode == "void":
            page.keyboard.press("Escape")       # skip the cutscene if it is playing
            page.wait_for_timeout(400)
            page.keyboard.press("Escape")
            page.wait_for_timeout(1500)
        page.goto(base + "/projects/heavylight.html")
        page.wait_for_timeout(800)
        page.goto(base + "/")                   # a fresh navigation, not Back
        page.wait_for_timeout(SETTLE)
        s = state(page)
        check(f"returning ({mode}): no gate", not s["gateShown"] and not s["frozen"], s)
        check(f"returning ({mode}): gate never painted", s["gateHiddenAtParse"] is True,
              s["gateHiddenAtParse"])
        check(f"returning ({mode}): opens in the last sector", s["mode"] == mode, s["mode"])
        check(f"returning ({mode}): starts at the top", s["scrollY"] <= TOL, s["scrollY"])
        check(f"returning ({mode}): no cutscene", not s["genesisActive"], s["genesisActive"])
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
    page.goto(base + "/?reset=1")
    page.wait_for_timeout(300)
    check("reset: param removed from the URL", "reset" not in page.url, page.url)
    page.wait_for_selector("#gate-panel.on", timeout=10000)
    page.click("#gate-projects")
    page.wait_for_timeout(2500)
    page.click("a.obj[href='projects/sector-zero.html']")
    page.wait_for_load_state("load")
    page.wait_for_timeout(2500)
    page.go_back()
    page.wait_for_timeout(SETTLE)
    s = state(page)
    check("reset: Back does not reset again",
          bool(s["stored"] and s["stored"]["seen"] and s["stored"]["level"] >= 5), s["stored"])
    check("reset: Back shows no gate", not s["gateShown"], s)
    ctx.close()


def flow_genesis(browser, base):
    """The cutscene plays once, counted from its start, without moving the page."""
    ctx, page = new_page(browser)
    enter_via_gate(page, base, "#gate-world")
    s = state(page)
    check("Setting starts the cutscene", s["genesisActive"] is True, s["genesisActive"])
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


def flow_twotabs(browser, base):
    """A claim in one tab never erases progress made in another."""
    ctx = browser.new_context(viewport=DESKTOP)
    home = ctx.new_page()
    enter_via_gate(home, base)
    case = ctx.new_page()
    case.goto(base + "/projects/sector-zero.html")
    case.wait_for_timeout(2500)
    after_case = case.evaluate("JSON.parse(localStorage.getItem('arcanis.profile.v1')).level")
    home.bring_to_front()
    home.evaluate("XP.award('beacon-bnote-bridge', 1, 'The Bridge')")   # what a beacon contact calls
    home.wait_for_timeout(500)
    stored = home.evaluate("JSON.parse(localStorage.getItem('arcanis.profile.v1'))")
    check("two tabs: level adds up", stored["level"] == after_case + 1,
          f"expected {after_case + 1}, stored {stored['level']}")
    check("two tabs: the other tab's claim survives", "proj-sector-zero" in stored["claimed"],
          list(stored["claimed"]))
    level_shown = home.evaluate("XP.level")
    check("two tabs: homepage picks up the new level", level_shown == stored["level"], level_shown)
    ctx.close()


def flow_header(browser, base):
    """The top bar never covers the start of a case page."""
    for viewport, label in ((DESKTOP, "desktop"), (PHONE, "phone")):
        ctx, page = new_page(browser, viewport)
        for case in CASES:
            page.goto(f"{base}/projects/{case}.html")
            page.wait_for_timeout(300)
            r = page.evaluate("""() => ({
              bar: Math.round(document.querySelector('.topbar').getBoundingClientRect().bottom),
              first: Math.round(document.querySelector('main').firstElementChild.getBoundingClientRect().top) })""")
            check(f"header clear of content: {case} ({label})", r["bar"] <= r["first"], r)
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


def flow_shell(browser, base):
    """Case pages share the homepage's nav, and each links to the next project."""
    ctx, page = new_page(browser)
    for case in CASES:
        page.goto(f"{base}/projects/{case}.html")
        has_exp = page.locator("header nav a[href='../index.html#experience']").count() > 0
        check(f"{case}: top bar has Experience", has_exp)
        nxt = page.locator("main a[rel='next']")
        href = nxt.first.get_attribute("href") if nxt.count() else None
        check(f"{case}: rel=next points to {NEXT[case]}", href == f"{NEXT[case]}.html", href)
    ctx.close()


def flow_depths(browser, base):
    """Beacon claims spawn depths notes in waves, fly out live, and survive reload."""
    ctx, page = new_page(browser)
    console_errors: list[str] = []
    page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: console_errors.append(str(e)))
    page.goto(base + "/?reset=1")
    enter_via_gate(page, base)

    empty = page.evaluate("window.depthsReport().length")
    check("depths: nothing spawned before any claim", empty == 0, empty)

    report = page.evaluate("""() => {
      XP.award('beacon-bnote-planet-voidscape', 1, 'VoidScape');
      XP.award('beacon-bnote-planet-heavylight', 1, 'HeavyLight');
      XP.award('beacon-bnote-planet-conclusus', 1, 'Conclusus');
      window.depthsReveal();
      return window.depthsReport();
    }""")
    ids = {n["id"] for n in report}
    check("depths: first waves spawn",
          ids == {"bnote-vs-board", "bnote-hl-play", "bnote-cc-play", "bnote-cc-why"}, ids)
    check("depths: live reveal flies", all(n["flying"] for n in report), report)

    page.wait_for_timeout(2000)
    report = page.evaluate("window.depthsReport()")
    check("depths: flights land", all(not n["flying"] for n in report), report)

    by_id = {n["id"]: n for n in report}
    check("depths: play nodes are wide",
          by_id["bnote-hl-play"]["wide"] and by_id["bnote-cc-play"]["wide"]
          and not by_id["bnote-cc-why"]["wide"], report)

    shells = page.evaluate("""() =>
      !!document.querySelector('#bnote-hl-play .embed-shell[data-src] .embed-play') &&
      !!document.querySelector('#bnote-cc-play .embed-shell[data-src] .embed-play')""")
    check("depths: game shells injected", shells, shells)

    page.route("**itch.io/**", lambda r: r.abort())
    plays, resets = page.evaluate("""() => {
      document.querySelector('#bnote-hl-play .embed-play').click();
      const hasFrame = !!document.querySelector('#bnote-hl-play iframe');
      Embed.reset(document.getElementById('bnote-hl-play'));
      return [hasFrame, !document.querySelector('#bnote-hl-play iframe') &&
        !!document.querySelector('#bnote-hl-play .embed-shell[data-src] .embed-play')];
    }""")
    check("depths: embed plays on click", plays, plays)
    check("depths: embed resets", resets, resets)

    page.evaluate("XP.award('beacon-bnote-vs-board', 1, 'The Board');")
    page.reload()
    page.wait_for_timeout(SETTLE)
    report = page.evaluate("window.depthsReport()")
    ids = {n["id"] for n in report}
    check("depths: reload restores waves, no flight",
          "bnote-vs-colour" in ids and "bnote-vs-bench" in ids and "bnote-vs-loop" not in ids
          and all(not n["flying"] for n in report), report)

    report = page.evaluate("""() => {
      ['bnote-planet-zero','bnote-sz-shell','bnote-sz-chair','bnote-vs-colour','bnote-vs-bench',
       'bnote-hl-play','bnote-cc-play','bnote-cc-why'].forEach(id => XP.award('beacon-'+id, 1, id));
      window.depthsReveal();
      return window.depthsReport();
    }""")
    check("depths: all 18 nodes spawn", len(report) == 18, len(report))
    bounds_and_overlap_checks("depths", report)

    errors = [e for e in console_errors if "itch.io" not in e and "ERR_FAILED" not in e
              and "net::" not in e]
    check("depths: no console errors", not errors, errors)
    ctx.close()


def bounds_and_overlap_checks(label, report):
    """Shared with flow_depths: nodes stay in frame and don't overlap within a cluster."""
    check(f"{label}: nodes stay in frame",
          all(-0.44 <= n["off"] <= 0.44 and 0.16 <= n["oy"] <= 0.66 for n in report), report)

    overlaps = []
    for i, a in enumerate(report):
        for b in report[i + 1:]:
            if a["root"] != b["root"]:
                continue
            dist = ((a["off"] - b["off"]) ** 2 + ((a["oy"] - b["oy"]) * 0.56) ** 2) ** 0.5
            if dist < 0.06:
                overlaps.append((a["id"], b["id"], dist))
    check(f"{label}: no two nodes of a cluster overlap", not overlaps, overlaps)


def flow_rex(browser, base):
    """Claiming Rex spawns its three layers, then the kingdoms, each at the spot measured in flight."""
    ctx, page = new_page(browser)
    page.goto(base + "/?reset=1")
    enter_via_gate(page, base, "#gate-world")
    page.keyboard.press("Escape")       # skip the cutscene if it is playing
    page.wait_for_timeout(400)
    page.keyboard.press("Escape")
    page.wait_for_timeout(1500)

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
    PINNED = {
        "firstlight": (358041, 0.48), "crimson": (364671, 0.38),
        "under": (377837, 0.30), "bonespire": (375479, 0.46),
        "titans": (378762, 0.25), "hell": (392889, 0.25),
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
    ctx.close()


def flow_watcher(browser, base):
    """Claiming the Watcher spawns the Red Star and Serus, each at the spot measured in flight."""
    ctx, page = new_page(browser)
    page.goto(base + "/?reset=1")
    enter_via_gate(page, base, "#gate-world")
    page.keyboard.press("Escape")       # skip the cutscene if it is playing
    page.wait_for_timeout(400)
    page.keyboard.press("Escape")
    page.wait_for_timeout(1500)

    report = page.evaluate("""() => {
      XP.award('beacon-bnote-watcher', 1, 'The Watcher');
      window.depthsReveal();
      return window.depthsReport().filter(n => n.id.startsWith('bnote-watcher-'));
    }""")
    ids = {n["id"] for n in report}
    check("watcher: the red star and serus spawn",
          ids == {"bnote-watcher-redstar", "bnote-watcher-serus"}, ids)

    by_id = {n["id"]: n for n in report}
    PINNED = {"redstar": (334257, 0.24), "serus": (335882, 0.52)}
    for name, (x, oy) in PINNED.items():
        n = by_id["bnote-watcher-" + name]
        check(f"watcher: {name} sits where it was measured",
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
    ctx.close()


FLOWS = {
    "first": flow_first, "gate-exits": flow_gate_exits, "back": flow_back,
    "reload": flow_reload, "worklink": flow_worklink, "deeplink": flow_deeplink,
    "returning": flow_returning, "wordmark": flow_wordmark, "reset": flow_reset,
    "genesis": flow_genesis, "twotabs": flow_twotabs, "header": flow_header,
    "shell": flow_shell, "phone": flow_phone, "depths": flow_depths, "rex": flow_rex,
    "watcher": flow_watcher, "links": flow_links,
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
