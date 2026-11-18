"""Deterministic screenshots of the site, and a pixel compare between two runs.

It exists so a refactor can prove the pages still render the same: capture
once before the change, once after, then diff the two folders.

Setup (once):
    py -3 -m pip install playwright pillow numpy
    py -3 -m playwright install chromium

Capture:      py -3 tools/snap.py capture base-a
Some scenes:  py -3 tools/snap.py capture base-a --only bridge
Compare:      py -3 tools/snap.py compare base-a base-b
List scenes:  py -3 tools/snap.py list

PNGs land in snapshots/<name>/, diff images in snapshots/diff-<a>-<b>/.
The script serves the repo itself on a free port and stops it when done,
like nav-flows.test.py, whose server and page helpers it borrows.

What makes two runs match: Math.random is a fixed seed, every page's clock
is stopped at one instant before its first load and only ever moved by a
fixed budget of frames, fonts are waited on, the video clips are turned
away so every player keeps its poster, Chromium is told to raster the same
way twice, and CSS animations are off in the shot itself. A page that is
let run in real time for even a moment lands its frames elsewhere, so every
wait on the site's own animation is a budget of frames, not a wait on the
wall. The waits that are on the wall are for the things a stopped clock
doesn't reach: observers, smooth scrolling and CSS transitions.

The case-page toys get their own page-<name>-toy scenes: viewport shots at
three scroll stops, since a full-page shot resizes the viewport and play.js
clears the toy canvas on resize. tools/toyshot.py shoots one toy quickly.
"""

from __future__ import annotations

import importlib.util
import os
import re
import subprocess
import sys
import threading
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SHOTS = ROOT / "snapshots"

# nav-flows.test.py owns the static server and the page helpers; the dash in
# its name blocks a plain import, and its __main__ guard keeps the suite quiet.
_spec = importlib.util.spec_from_file_location("nav_flows_test", ROOT / "tools" / "nav-flows.test.py")
nav = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(nav)

from playwright.sync_api import sync_playwright

# ------------------------------------------------------------------ determinism

CLOCK_START = 1_700_000_000_000   # installed before the first navigation
CLOCK_PAUSE = 1_700_000_010_000   # the instant every page is frozen at
GATE_BOOT = 4000                  # ms of frames: the gate's warm-up runs in under this
FRAME = 16                        # ms: the faked clock's own frame interval
OPENING = 96                      # ms: the jump that opens a scene, past the site's dt clamp
OBSERVE = 400                     # ms of real time: long enough for observers to land
TOY_MS = 1200                     # ms of frames a toy runs at each scroll stop before its shot
TOY_STOPS = (("top", 0.0), ("mid", 0.4), ("low", 0.75))   # fractions of the open folder's extent

# Chromium doesn't raster the same picture into the same pixels twice on its
# own: subpixel text is rendered against whatever layer its element sits on,
# tiles are rastered on threads, and the compositor draws when it likes. These
# take the choice away from it — grey text edges, one raster thread, software
# raster, and every compositor stage finished before anything is drawn.
CHROME = ["--disable-lcd-text", "--force-color-profile=srgb",
          "--disable-gpu", "--disable-gpu-rasterization", "--disable-partial-raster",
          "--disable-accelerated-2d-canvas", "--num-raster-threads=1",
          "--disable-threaded-animation", "--disable-threaded-scrolling",
          "--disable-checker-imaging", "--run-all-compositor-stages-before-draw",
          "--disable-new-content-rendering-timeout"]

# mulberry32, seed 1 — the same generator world.js uses, standing in for the
# real Math.random so anything sprinkled at random lands in the same place.
SEED = """
(() => {
  const mulberry = a => () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let x = Math.imul(a ^ a >>> 15, 1 | a);
    x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x;
    return ((x ^ x >>> 14) >>> 0) / 4294967296;
  };
  Math.random = mulberry(1);
})();
"""


def settle(page, ms):
    """Run exactly ms of frames on the stopped clock, once the fonts are in:
    a face that arrives mid-budget costs the scene a frame.

    A document still takes on a stray millisecond of real time while it starts,
    the one leak a stopped clock doesn't seal. The opening jump lands the scene
    on the clock's own frame grid, so every frame after it is exactly one frame
    long, and it is longer than the site's own dt clamp, so the first frame is
    the same length whatever the leak was."""
    page.evaluate("document.fonts.ready")
    page.wait_for_timeout(OBSERVE)   # observers fire on real frames: let them land
    page.clock.fast_forward(OPENING - round(page.evaluate("performance.now()")) % FRAME)
    page.clock.run_for(ms)


# The gate opens the site by itself, inside the warm-up budget, so the page's own
# site:enter would land earlier than the old Continue click did and move every
# scene's clock. It is held back here and let go at the old click's instant.
HOLD_ENTER = """(() => {
  let held = null, released = false;
  document.addEventListener('site:enter', e => {
    if (released || document.documentElement.classList.contains('gate-skip')) return;
    e.stopImmediatePropagation();
    held = e.detail;
  }, true);
  window.__snapRelease = () => {
    released = true;
    if (!held) return false;
    const d = held; held = null;
    document.dispatchEvent(new CustomEvent('site:enter', { detail: d }));
    return true;
  };
})();"""

# css/gate.css reserves a scrollbar gutter on html so the page doesn't jump sideways when the
# gate frees the scroll. This browser hides its scrollbars, so there the 15 px is an empty strip
# that narrows every page (text re-wraps on phones) against main. Captures cancel it; the two
# gate scenes keep it (new_ctx(gutter=True)).
NO_GUTTER = """(() => {
  const add = () => {
    const s = document.createElement('style');
    s.textContent = 'html { scrollbar-gutter: auto !important; }';
    document.documentElement.appendChild(s);
  };
  if (document.documentElement) add();
  else new MutationObserver((_, o) => { if (document.documentElement) { o.disconnect(); add(); } })
    .observe(document, { childList: true });
})();"""

# js/site/intro.js ends the bar on `animation.finished` (its last ease to full), and a Web
# Animation runs on real compositor time, which the stopped clock doesn't reach: the gate
# closed at a different faked instant each load (about 100 ms apart), so everything it
# lets go (the idle warm-up units and their Math.random draws, the fade clone) moved.
# Here a short animation's `finished` is a faked timer of its own duration instead.
# The same file reads the first-paint entry's real startTime against the faked
# performance.now() when the entry exists yet (a race), so those entries are hidden and
# the gate anchors on its own first painted frame.
WAAPI_FAKED = """(() => {
  const animate = Element.prototype.animate;
  Element.prototype.animate = function (kf, opts) {
    const a = animate.call(this, kf, opts);
    const d = typeof opts === 'number' ? opts : opts && opts.duration;
    if (d > 0 && d <= 1000) {
      const p = new Promise(res => setTimeout(res, d));
      Object.defineProperty(a, 'finished', { get: () => p });
    }
    return a;
  };
  const get = performance.getEntriesByName.bind(performance);
  performance.getEntriesByName = (n, t) => /^first(-contentful)?-paint$/.test(n) ? [] : get(n, t);
})();"""
# The faked clock's requestIdleCallback hands out an idle period with no time left. js/site/intro.js's
# idle runner then asks again at once (it waits for 8 ms of room while the bridge paints), and in
# phone portrait the bridge paints nothing and gives no room either: the same-instant timer
# re-queues itself and the first clock step never returns. A real browser gives such a period
# up to 50 ms, so in portrait on a touch device the callback gets that.
IDLE_PORTRAIT = """(() => {
  if (!matchMedia('(orientation: portrait) and (pointer: coarse)').matches) return;
  window.requestIdleCallback = (cb, o) => setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 50 }), 1);
})();"""
# An idle page (no animation loop, e.g. /#voidscape on a Work row) makes the faked clock's run_for
# slow: about 4.7 s real per faked second (23.4 s for run_for(5000)). One empty rAF loop keeps it
# fast (1.9 s for the same step). It reads and paints nothing. It is per scene (new_ctx(keepalive=True),
# only work-hover) because it changes the frames of animated scenes.
KEEPALIVE = "(function t(){requestAnimationFrame(t)})();"
PHONE_REST = (69.3, 802.0)       # where the old Continue click left the pointer on a phone


ENTER_AFTER = 60_000   # faked ms after this page load that site:enter is let go, later than either gate needs (the slowest scene's gate opened at about 48 s)
SCENE_DEADLINE = 150.0   # real seconds one scene may take before its browser is killed
SCENE = ""           # the scene being captured, for the missed-alignment warning


def press_old_gate(page):
    """remove once the gate rework is on main: main's gate has no .done state; its button
    is clicked once #gate-panel is on (site:enter stays held)."""
    page.wait_for_selector("#gate-panel.on", timeout=15000)
    for _ in range(150):
        if page.evaluate("!document.getElementById('gate-world').hasAttribute('aria-disabled')"):
            break
        page.clock.run_for(100)
    page.click("#gate-world")


def wait_gate_open(page):
    """The gate fills its bar and opens by itself: run the faked clock until it is gone,
    then run on to ENTER_AFTER ms after this page load, reseed, and let the held site:enter go there."""
    rest = (720, 639.5) if page.viewport_size["width"] >= 1000 else PHONE_REST
    if page.evaluate("!!document.getElementById('gate-world') && !document.getElementById('gate-bar')"):
        press_old_gate(page)
    else:
        page.wait_for_selector("#gate-bar", state="attached", timeout=15000)
        for _ in range(300):
            if page.evaluate("document.getElementById('site-gate').classList.contains('done')"):
                break
            page.clock.run_for(100)
        else:
            raise RuntimeError("the loading gate never reached .done in 30 s of faked time")
    page.mouse.move(*rest)   # rest where the old gate button was: later scenes hover
    left = ENTER_AFTER - page.evaluate("Date.now() - window.__snapT0")
    if left > 0:
        page.clock.run_for(left)
    else:
        print(f"WARN {SCENE}: gate opened {-left} ms past ENTER_AFTER, enter not aligned", file=sys.stderr)
    page.evaluate(SEED)
    # the branch's bridge loop runs under the gate (main's starts at enter): pin its
    # clock, and every infinite CSS animation, to 0 at the release on both trees
    page.evaluate("""(() => {
      if (window.Bridge && typeof window.Bridge.t === 'number') window.Bridge.t = 0;
      document.getAnimations().forEach(a => {
        if (a instanceof CSSAnimation && a.effect && a.effect.getComputedTiming().iterations === Infinity) a.currentTime = 0;
      });
    })()""")
    page.evaluate("window.__snapRelease && window.__snapRelease()")


def enter_via_gate(page, base, button=None):
    """nav-flows' enter_via_gate, waited out on the faked clock instead of on
    the wall: the gate's bar moves on timers and frames, which only run when
    asked, and any real second that reaches a page moves its frames out of step."""
    page.goto(base + "/")
    settle(page, GATE_BOOT)
    wait_gate_open(page)
    settle(page, 2500)


def press_gate(page, after=2500):
    """A homepage load behind the entry gate (every load shows it): run the clock
    until the gate has opened by itself, then run `after` ms (the +1 landing;
    0 for a scene that times itself from the opening)."""
    settle(page, GATE_BOOT)
    wait_gate_open(page)
    if after:
        settle(page, after)


def rest(page):
    """Wait for a smooth scroll to stop: it runs off the faked clock, so the
    shot has to wait for it in real time or it lands mid-flight."""
    last, steady = None, 0
    while steady < 3:
        y = page.evaluate("Math.round(scrollY)")
        steady = steady + 1 if y == last else 0
        last = y
        page.wait_for_timeout(100)


# A page that throws still paints, so a broken scene can shoot a picture that
# looks right. Every page reports into one list, which capture() reads out and
# empties around each scene.
ERRORS = []


def watch_errors(page):
    page.on("pageerror", lambda e: ERRORS.append(str(e)))
    # the harness aborts every mp4 itself (posters only), and Chromium logs that abort as an error
    page.on("console", lambda msg: msg.type == "error"
            and not (msg.location or {}).get("url", "").endswith(".mp4")
            and ERRORS.append(msg.text))


REDUCED_MOTION = False   # --reduced-motion: every scene that doesn't set its own


def new_ctx(browser, viewport=None, gutter=False, keepalive=False, **opts):
    if REDUCED_MOTION:
        opts.setdefault("reduced_motion", "reduce")
    ctx = browser.new_context(viewport=viewport or nav.DESKTOP, **opts)
    ctx.set_default_timeout(15000)
    ctx.clock.install(time=CLOCK_START)
    ctx.clock.pause_at(CLOCK_PAUSE)    # stopped before the first page exists
    ctx.add_init_script(nav.INIT)
    ctx.add_init_script(SEED)
    ctx.add_init_script(HOLD_ENTER)
    ctx.add_init_script(WAAPI_FAKED)
    ctx.add_init_script(IDLE_PORTRAIT)
    if not gutter:
        ctx.add_init_script(NO_GUTTER)
    if keepalive:
        ctx.add_init_script(KEEPALIVE)
    ctx.route("**/*.mp4", lambda route: route.abort())   # posters only, see PARK_VIDEO
    page = ctx.new_page()
    watch_errors(page)
    # the faked clock carries across loads but a new document starts on a stale Date.now, so the
    # load's instant is read once the page is up, not in an init script (see ENTER_AFTER)
    page.on("domcontentloaded", lambda p: p.evaluate("window.__snapT0 = Date.now()"))
    return ctx, page


# Video plays on its own clock, not the faked one, and lazy-video.js fetches
# the clips one at a time as they come into view, so a shot catches each one
# on a frame of its own, or on its poster, depending on how the downloads
# went. The clips are turned away at the door instead (see new_ctx) and every
# element keeps its poster, which is a still and always the same. Chromium's
# own control chrome doesn't paint the same twice either, so it goes too.
PARK_VIDEO = """() => document.querySelectorAll('video')
  .forEach(v => { v.pause(); v.controls = false; })"""


def park(page):
    page.evaluate(PARK_VIDEO)


def clear_ceremony(page):
    """Let a pending XP claim finish growing the bar. A claim is set off by an
    observer, which fires on a real frame rather than on one of ours, so a bar
    caught mid-fill is at a different point every run."""
    page.wait_for_timeout(150)   # let a pending observer land first
    page.wait_for_function("!window.XP || !XP.busy", timeout=5000)


def still(page, tries=20):
    """Wait for the CSS transitions to end. They run on real frames, so one
    caught halfway through is halfway through by a different amount each run,
    down to the subpixel rendering of the text under it."""
    for _ in range(tries):
        running = page.evaluate("""() => document.getAnimations().filter(a => {
          const t = a.effect && a.effect.getTiming();
          return a.playState === 'running' && (!t || t.iterations !== Infinity);
        }).length""")
        if not running:
            return
        page.wait_for_timeout(100)


def shot(page, out_dir, name, full_page=False):
    page.evaluate("document.fonts.ready")
    park(page)
    clear_ceremony(page)
    still(page)
    page.screenshot(path=str(out_dir / f"{name}.png"), animations="disabled",
                    caret="hide", full_page=full_page)


# Inked (non-transparent) pixels on the case-page toy canvas (the inline stage's, else the page strip's) plus its page tiles, or null with no toy.
TOY_INK = """() => { const c = document.querySelector('figure.gp-stage canvas') || document.querySelector('canvas.play');
  if (!c || c.hidden || !c.offsetWidth) return null;
  const count = k => { const d = k.getContext('2d').getImageData(0, 0, k.width, k.height).data;
    let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; };
  let n = count(c);
  const layer = document.querySelector('.play-tiles');
  if (layer && !layer.hidden) for (const t of layer.querySelectorAll('canvas'))
    if (t.style.display !== 'none' && t.width > 0 && t.height > 0) n += count(t);
  return { w: c.width, h: c.height, ink: n }; }"""


def toy_ink(page):
    """The toy canvas's size and inked pixel count (page tiles included), or None when the page has no toy."""
    return page.evaluate(TOY_INK)


def toy_frame(page, y, ms=TOY_MS):
    """Jump the page to scroll y (no smooth scroll), let the scroll and the
    toy's observers land in real time, then run ms of frames on the stopped
    clock so the toy repaints there. A viewport shot keeps what it painted; a
    full-page shot resizes the viewport and play.js clears the canvas."""
    page.evaluate(f"window.scrollTo({{top: {int(y)}, behavior: 'instant'}})")
    rest(page)
    page.wait_for_timeout(OBSERVE)
    page.clock.run_for(ms)

# ------------------------------------------------------------------ the map

# The scene names are the ids of the beacon lists in marks.js and of the beats
# in genesis-state.js, read out of the source so a new entry shows up as a new
# scene. The world x of each beacon is read off the live globals instead.


def js_block(source, opener, closer):
    i = source.find(opener)
    if i < 0:
        raise RuntimeError(f"snap.py: {opener!r} is no longer in the source")
    j = source.find(closer, i)
    if j < 0:
        raise RuntimeError(f"snap.py: no {closer!r} after {opener!r}")
    return source[i:j + len(closer)]


# the marks and beats come from the checkout that is served: --root's, else this one
SRC_ROOT = Path(sys.argv[sys.argv.index("--root") + 1]).resolve() if "--root" in sys.argv[:-1] else ROOT
MARKS_SRC_FILE = (SRC_ROOT / "js" / "bridge" / "marks.js").read_text(encoding="utf-8")
BEATS_SRC_FILE = (SRC_ROOT / "js" / "genesis" / "genesis-state.js").read_text(encoding="utf-8")

MARKS_SRC = js_block(MARKS_SRC_FILE, "const MARKS = [", "\n  ];")
BEATS_SRC = js_block(BEATS_SRC_FILE, "G.BEATS = [", "\n  ];")

MARK_IDS = re.findall(r'id:\s*"([^"]+)"', MARKS_SRC)
BEAT_IDS = re.findall(r'id:\s*"([^"]+)"', BEATS_SRC)
SCENES_SRC = js_block(BEATS_SRC_FILE, "G.SCENES = {", "\n  };")
SCENE_SPANS = {m[0]: (m[1], m[2]) for m in re.findall(
    r'(\w+):\s*\{\s*from:\s*"([^"]+)",\s*to:\s*"([^"]+)"', SCENES_SRC)}
SCENE_IDS = list(SCENE_SPANS)
if not (MARK_IDS and BEAT_IDS and SCENE_IDS):
    raise RuntimeError("snap.py: MARKS / BEATS / SCENES no longer parse — "
                       "no scene names can be built")

# bridge.js pushes a depth node into these lists as each beacon is claimed, so
# the map holds more than the source does: every scene looks its id up here
# rather than walking the map.
MAP_JS = """() => ({
  marks: Marks.MARKS.map(m => ({ id: m.id, x: m.x })),
  land: Object.keys(World.LAND), landBridge: World.LAND.bridge,
})"""

_map = {}


def world_map(page):
    """Ids and world x of every beacon, read once from a live page."""
    if not _map:
        _map.update(page.evaluate(MAP_JS))
    return _map

# ------------------------------------------------------------------ camera

# bridge.js saves its own view on pagehide, which would overwrite ours as the
# reload leaves; the extra listener puts ours back last, as flow_rex does.
# Both keys are written, exactly as saveView writes them: the faked clock has
# no navigation timing entry, so entry.js reads the reload as a plain return
# visit and takes the sector from localStorage rather than from the view.
SET_VIEW = """({ mode, x }) => {
  const view = JSON.stringify({
    mode,
    voidCamX: mode === 'void' ? x : null,
  });
  const save = () => {
    sessionStorage.setItem('arcanis.view.v1', view);
    localStorage.setItem('arcanis.sector.v1', mode);
  };
  save();
  addEventListener('pagehide', save);
}"""


def set_view(page, mode, x):
    page.evaluate(SET_VIEW, {"mode": mode, "x": x})
    page.evaluate("sessionStorage.removeItem('arcanis.entered.v1')")   # the reload after it shows the gate, as every scene's baseline did

# ------------------------------------------------------------------ contexts

_shared = {}     # long-lived contexts: the claimed bridge, and genesis


def bridge_page(browser, base):
    """One entered page with every beacon claimed, so all depth nodes exist."""
    if "bridge" not in _shared:
        ctx, page = new_ctx(browser)
        enter_via_gate(page, base, "#gate-world")
        for mid in MARK_IDS:
            page.evaluate("id => XP.award('beacon-' + id, 1, id)", mid)
        page.evaluate("window.depthsReveal && depthsReveal()")
        settle(page, 3000)               # let the claim ceremonies finish
        _shared["bridge"] = (ctx, page)
    return _shared["bridge"][1]


def genesis_page(browser, base):
    """One entered page; a known visitor skips the gate on every later load."""
    if "genesis" not in _shared:
        ctx, page = new_ctx(browser)
        enter_via_gate(page, base, "#gate-world")
        _shared["genesis"] = (ctx, page)
    page = _shared["genesis"][1]
    page.evaluate("sessionStorage.removeItem('arcanis.entered.v1')")   # the next load shows the gate, as the baselines did
    return page


def close_shared():
    for ctx, _page in _shared.values():
        ctx.close()
    _shared.clear()

# ------------------------------------------------------------------ scenes


def open_note(page, mid):
    """Open the beacon popup `mid` the way a claim does (Bridge.showNote), once it has settled."""
    page.evaluate("id => { const B = window.Bridge; const m = B.MARKS.concat(B.PLANETS).find(e => e.id === id); B.activeMark = m; B.camX = m.cam; B.showNote(m); }", mid)
    settle(page, 1500)


def bridge_camera(mode, label, pick):
    def fn(browser, base, out_dir):
        page = bridge_page(browser, base)
        x = pick(world_map(page))
        if x is None:
            print(f"  skip bridge-{mode}-{label}: not on the map")
            return
        set_view(page, mode, x)
        page.reload()
        page.wait_for_load_state("load")
        press_gate(page)
        settle(page, 2500)
        if label.startswith("bnote-"):
            open_note(page, label)
        shot(page, out_dir, f"bridge-{mode}-{label}")
    return fn


def mark_x(mid):
    return lambda m: next((e["x"] for e in m["marks"] if e["id"] == mid), None)


def land_x(key):
    return lambda m: m["landBridge"] if key in m["land"] else None


def scene_bridge_unclaimed(browser, base, out_dir):
    ctx, page = new_ctx(browser)
    enter_via_gate(page, base, "#gate-world")
    set_view(page, "void", world_map(page)["marks"][0]["x"])
    page.reload()
    page.wait_for_load_state("load")
    press_gate(page)
    settle(page, 2500)
    shot(page, out_dir, "bridge-void-unclaimed")
    ctx.close()


def bridge_phone(name, viewport, mark=None):
    """The bridge on a phone: the first mark's void view, or the mark `mark`'s.
    Portrait shows #bridge-rotate; landscape shows the bridge."""
    def fn(browser, base, out_dir):
        ctx, page = new_ctx(browser, viewport, is_mobile=True,
                            has_touch=True, device_scale_factor=2)
        enter_via_gate(page, base, "#gate-world")
        m = world_map(page)
        x = m["marks"][0]["x"] if mark is None else mark_x(mark)(m)
        set_view(page, "void", x)
        page.reload()
        page.wait_for_load_state("load")
        press_gate(page)
        settle(page, 2500)
        if mark:
            open_note(page, mark)
        shot(page, out_dir, name)
        ctx.close()
    return fn


def scene_bridge_phone_landscape(browser, base, out_dir):
    bridge_phone("bridge-phone-landscape", nav.PHONE_LANDSCAPE)(browser, base, out_dir)


def gate_scene(name, viewport):
    def fn(browser, base, out_dir):
        ctx, page = new_ctx(browser, viewport, gutter=True)
        page.goto(base + "/")
        page.wait_for_selector("#gate-bar", state="attached", timeout=15000)
        settle(page, 300)
        shot(page, out_dir, name)
        ctx.close()
    return fn


def scene_gate(browser, base, out_dir):
    gate_scene("gate-first-visit", nav.DESKTOP)(browser, base, out_dir)


def genesis_beat(bid):
    def fn(browser, base, out_dir):
        page = genesis_page(browser, base)
        page.goto(f"{base}/?genesis=1&gbeat={bid}")
        page.wait_for_load_state("load")
        press_gate(page, 0)
        settle(page, 1500)
        shot(page, out_dir, f"genesis-{bid}")
    return fn


def wait_scene(page, bid=None):
    """Run the clock until a ?gscene load is on screen: Genesis active, on the
    expected beat (the scene's first when bid is None), not seaming, veil gone."""
    want = f"'{bid}'" if bid else "Gen.SCENES[Gen.SCENE].from"
    cond = (f"Genesis.active && !Genesis.seaming && Gen.BEATS[Gen.beat].id === {want}"
            " && (!document.querySelector('.genesis-veil') || document.querySelector('.genesis-veil').hidden)")
    for _ in range(60):
        if page.evaluate(cond):
            return
        page.clock.run_for(100)


def genesis_scene(sid):
    def fn(browser, base, out_dir):
        page = genesis_page(browser, base)
        page.goto(f"{base}/?genesis=1&gscene={sid}")
        page.wait_for_load_state("load")
        press_gate(page, 0)
        settle(page, 120)
        wait_scene(page)
        shot(page, out_dir, f"genesis-scene-{sid}")
    return fn


def project_page(name, label, viewport):
    def fn(browser, base, out_dir):
        ctx, page = new_ctx(browser, viewport)
        page.goto(f"{base}/projects/{name}.html")
        page.wait_for_load_state("load")
        settle(page, 1000)
        shot(page, out_dir, f"page-{name}-{label}", full_page=True)
        ctx.close()
    return fn


def work_hover_scene(browser, base, out_dir):
    """The VoidScape Work row hovered about 1.5 s: level text unmoved, title banner, clip playing in the picture spot, page button shown."""
    ctx, page = new_ctx(browser, nav.DESKTOP, keepalive=True)
    page.goto(f"{base}/#voidscape")
    page.wait_for_load_state("load")
    press_gate(page)
    settle(page, 600)
    page.hover("a.obj[href='projects/voidscape.html']")
    settle(page, 1500)
    shot(page, out_dir, "work-hover")
    ctx.close()


def page_404(label, viewport):
    def fn(browser, base, out_dir):
        ctx, page = new_ctx(browser, viewport)
        page.goto(f"{base}/404.html")
        page.wait_for_load_state("load")
        settle(page, 1000)
        shot(page, out_dir, f"page-404-{label}", full_page=True)
        ctx.close()
    return fn


def card_scene(name, label, viewport, call, selector):
    """Enter, fire a Surge card, shoot the viewport with the card up."""
    def fn(browser, base, out_dir):
        ctx, page = new_ctx(browser, viewport)
        enter_via_gate(page, base, "#gate-world")
        page.evaluate(call)
        page.wait_for_selector(selector)
        settle(page, 800)
        shot(page, out_dir, f"{name}-{label}")
        ctx.close()
    return fn


def toy_page(name):
    """The case-page toy, desktop only (play.js skips anything under 900 px):
    viewport shots at each of TOY_STOPS. Fails when the toy is missing or blank."""
    def fn(browser, base, out_dir):
        ctx, page = new_ctx(browser, nav.DESKTOP, reduced_motion="no-preference")
        page.goto(f"{base}/projects/{name}.html")
        page.wait_for_load_state("load")
        settle(page, 1000)
        lo, hi = 0, page.evaluate("Math.max(0, document.documentElement.scrollHeight - innerHeight)")
        # an inline stage only builds and paints on screen: each stop scrolls it into view, higher or lower in the viewport
        box = page.evaluate("(() => { const f = document.querySelector('figure.gp-stage'); if (!f) return null; const r = f.getBoundingClientRect(); return { top: r.top + scrollY, h: r.height, ih: innerHeight }; })()")
        for label, frac in TOY_STOPS:
            if box:
                toy_frame(page, max(0, round(box["top"] - 40 - frac * (box["ih"] - box["h"] - 80))))
            else:
                toy_frame(page, round(lo + frac * (hi - lo)))
            ink = toy_ink(page)
            if ink is None:
                raise RuntimeError(f"no toy canvas on {name}")
            if not ink["ink"]:
                raise RuntimeError(f"toy canvas blank on {name} at {label}")
            shot(page, out_dir, f"page-{name}-toy-{label}")
        ctx.close()
    return fn


def index_section(section, label, viewport, bottom=False):
    def fn(browser, base, out_dir):
        ctx, page = new_ctx(browser, viewport)
        enter_via_gate(page, base, "#gate-world")
        page.evaluate(f"location.hash='#{section}'")
        rest(page)
        settle(page, 800)
        if bottom:
            page.evaluate("scrollTo(0, document.body.scrollHeight)")
            rest(page)
            settle(page, 800)
        shot(page, out_dir, f"index-{section}-{label}")
        ctx.close()
    return fn


PROJECTS = ["sector-zero", "voidscape", "conclusus", "heavylight"]


def scenes():
    out = []
    for mid in MARK_IDS:
        out.append((f"bridge-void-{mid}", bridge_camera("void", mid, mark_x(mid))))
    out.append(("bridge-void-bridge-span",
                bridge_camera("void", "bridge-span", land_x("bridge"))))
    out.append(("bridge-void-unclaimed", scene_bridge_unclaimed))
    out.append(("bridge-phone-landscape", scene_bridge_phone_landscape))
    out.append(("gate-first-visit", scene_gate))
    for bid in BEAT_IDS:
        out.append((f"genesis-{bid}", genesis_beat(bid)))
    for sid in SCENE_IDS:
        out.append((f"genesis-scene-{sid}", genesis_scene(sid)))
    for name in PROJECTS:
        out.append((f"page-{name}-desktop", project_page(name, "desktop", nav.DESKTOP)))
        out.append((f"page-{name}-phone", project_page(name, "phone", nav.PHONE)))
        out.append((f"page-{name}-toy", toy_page(name)))
    out.append(("work-hover", work_hover_scene))
    for section in ("work", "experience"):
        out.append((f"index-{section}-desktop", index_section(section, "desktop", nav.DESKTOP)))
        out.append((f"index-{section}-phone", index_section(section, "phone", nav.PHONE)))
    for label, vp in (("desktop", nav.DESKTOP), ("phone", nav.PHONE)):
        out.append((f"page-404-{label}", page_404(label, vp)))
        out.append((f"glimpse-card-{label}", card_scene(
            "glimpse-card", label, vp, "Surge.glimpse()", ".glimpse-card")))
        out.append((f"rank-card-{label}", card_scene(
            "rank-card", label, vp,
            "Surge.rankUp({from: XP.rankOf(0), to: XP.rankOf(10)})", ".rank-card")))
        out.append((f"index-footer-{label}", index_section("footer", label, vp, bottom=True)))
    out.append(("gate-phone", gate_scene("gate-phone", nav.PHONE)))
    out.append(("bridge-phone-portrait", bridge_phone("bridge-phone-portrait", nav.PHONE)))
    out.append(("bridge-phone-landscape-bnote",
                bridge_phone("bridge-phone-landscape-bnote", nav.PHONE_LANDSCAPE, "bnote-void")))
    return out

# ------------------------------------------------------------------ capture


def capture(name, only=None, root=None):
    global SCENE
    out_dir = SHOTS / name
    out_dir.mkdir(parents=True, exist_ok=True)
    if root:
        nav.ROOT = str(Path(root).resolve())   # serve that checkout's files, read-only
    chosen = [(n, fn) for n, fn in scenes() if not only or only in n]
    if not chosen:
        print(f"no scene matches {only!r} - use: py -3 tools/snap.py list")
        return 2
    failed = []
    httpd, base = nav.start_server()
    mark = f"--snap-run-{os.getpid()}"   # tags this run's browser processes so a timer can find them

    def launch(p):
        return p.chromium.launch(args=CHROME + [mark])

    def kill_browser():
        # the sync API is not thread-safe: the timer only kills the processes; the stuck call then raises
        if sys.platform == "win32":
            subprocess.run(["powershell", "-NoProfile", "-Command",
                            f"Get-CimInstance Win32_Process | Where-Object {{ $_.ProcessId -ne $PID -and $_.CommandLine -match '(^|\\s)\\-\\-snap-run-{os.getpid()}(\\s|$)' }}"
                            " | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"],
                           capture_output=True)
        else:
            subprocess.run(["pkill", "-9", "-f", "--", f"(^| ){mark}( |$)"], capture_output=True)

    try:
        with sync_playwright() as p:
            browser = launch(p)
            for n, fn in chosen:
                t0 = time.time()
                SCENE = n
                ERRORS.clear()
                timer = threading.Timer(SCENE_DEADLINE, kill_browser)
                timer.start()
                try:
                    fn(browser, base, out_dir)
                    print(f"  {n:34} {time.time() - t0:6.1f}s")
                except Exception as e:
                    failed.append(n)
                    why = (f"no result within {SCENE_DEADLINE:.0f} s" if time.time() - t0 >= SCENE_DEADLINE
                           else f"{type(e).__name__}: {e}")
                    print(f"FAILED {n}: {why}".splitlines()[0])
                    kill_browser()
                    _shared.clear()
                    try:
                        browser.close()
                    except Exception:
                        pass
                    browser = launch(p)
                finally:
                    timer.cancel()
                if ERRORS:
                    if n not in failed:
                        failed.append(n)
                    print(f"ERR {n} ({len(ERRORS)}): {ERRORS[0]}".splitlines()[0])
            close_shared()
            browser.close()
    finally:
        httpd.shutdown()
    print(f"\n{len(chosen) - len(failed)}/{len(chosen)} scene(s) into {out_dir}")
    if failed:
        print("FAILED scenes: " + ", ".join(failed))
    return 1 if failed else 0

# ------------------------------------------------------------------ compare


def compare(a, b, threshold):
    from PIL import Image
    import numpy as np

    da, db = SHOTS / a, SHOTS / b
    names = sorted({p.stem for p in da.glob("*.png")} | {p.stem for p in db.glob("*.png")})
    if not names:
        print(f"nothing to compare in {da} and {db}")
        return 2
    diff_dir = SHOTS / f"diff-{a}-{b}"
    bad = []
    print(f"{'scene':40} {'pct':>8}  status")
    for n in names:
        fa, fb = da / f"{n}.png", db / f"{n}.png"
        if not fa.exists() or not fb.exists():
            print(f"{n:40} {'-':>8}  missing")
            bad.append(n)
            continue
        ia = np.asarray(Image.open(fa).convert("RGB"), dtype=np.int16)
        ib = np.asarray(Image.open(fb).convert("RGB"), dtype=np.int16)
        if ia.shape != ib.shape:
            print(f"{n:40} {'-':>8}  SIZE")
            bad.append(n)
            continue
        mask = (np.abs(ia - ib) > 8).any(axis=2)
        pct = mask.mean() * 100
        status = "same" if pct == 0 else ("ok" if pct <= threshold else "DIFF")
        print(f"{n:40} {pct:7.2f}%  {status}")
        if status == "DIFF":
            bad.append(n)
        if pct > 0:
            diff_dir.mkdir(parents=True, exist_ok=True)
            out = (ib // 2).astype(np.uint8)
            out[mask] = (255, 0, 0)
            Image.fromarray(out).save(diff_dir / f"{n}.png")
    print(f"\n{len(names) - len(bad)}/{len(names)} scene(s) within {threshold}%")
    return 1 if bad else 0

# ------------------------------------------------------------------ cli

USAGE = """usage:
  py -3 tools/snap.py capture <name> [--only <substring>] [--phone-width <px>] [--reduced-motion] [--root <dir>]
  py -3 tools/snap.py compare <a> <b> [--threshold 0.5]
  py -3 tools/snap.py list"""


def main():
    args = sys.argv[1:]
    cmd = args[0] if args else ""
    rest = args[1:]
    if cmd == "list":
        for n, _fn in scenes():
            print(n)
        return 0
    if cmd == "capture" and rest:
        global REDUCED_MOTION
        only = None
        if "--reduced-motion" in rest:
            REDUCED_MOTION = True
            rest.remove("--reduced-motion")
        if "--phone-width" in rest:
            i = rest.index("--phone-width")
            nav.PHONE = {"width": int(rest[i + 1]), "height": 667}
            del rest[i:i + 2]
        root = None
        if "--root" in rest:
            i = rest.index("--root")
            root = rest[i + 1]
            del rest[i:i + 2]
        if "--only" in rest:
            i = rest.index("--only")
            only = rest[i + 1] if len(rest) > i + 1 else None
            rest = rest[:i]
        return capture(rest[0], only, root)
    if cmd == "compare" and len(rest) >= 2:
        threshold = 0.5
        if "--threshold" in rest:
            i = rest.index("--threshold")
            threshold = float(rest[i + 1])
            rest = rest[:i]
        return compare(rest[0], rest[1], threshold)
    print(USAGE)
    return 2


if __name__ == "__main__":
    sys.exit(main())
