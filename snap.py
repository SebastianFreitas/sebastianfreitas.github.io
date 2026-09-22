"""Deterministic screenshots of the site, and a pixel compare between two runs.

It exists so a refactor can prove the pages still render the same: capture
once before the change, once after, then diff the two folders.

Setup (once):
    py -3 -m pip install playwright pillow numpy
    py -3 -m playwright install chromium

Capture:      py -3 snap.py capture base-a
Some scenes:  py -3 snap.py capture base-a --only bridge
Compare:      py -3 snap.py compare base-a base-b
List scenes:  py -3 snap.py list

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
"""

from __future__ import annotations

import importlib.util
import re
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SHOTS = ROOT / "snapshots"

# nav-flows.test.py owns the static server and the page helpers; the dash in
# its name blocks a plain import, and its __main__ guard keeps the suite quiet.
_spec = importlib.util.spec_from_file_location("nav_flows_test", ROOT / "nav-flows.test.py")
nav = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(nav)

from playwright.sync_api import sync_playwright

# ------------------------------------------------------------------ determinism

CLOCK_START = 1_700_000_000_000   # installed before the first navigation
CLOCK_PAUSE = 1_700_000_010_000   # the instant every page is frozen at
GATE_BOOT = 4000                  # ms of frames: the gate types itself in under this
FRAME = 16                        # ms: the faked clock's own frame interval
OPENING = 96                      # ms: the jump that opens a scene, past the site's dt clamp
OBSERVE = 400                     # ms of real time: long enough for observers to land

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


def enter_via_gate(page, base, button="#gate-projects"):
    """nav-flows' enter_via_gate, waited out on the faked clock instead of on
    the wall: the gate types itself on timers, which only run when asked, and
    any real second that reaches a page moves its frames out of step."""
    page.goto(base + "/")
    settle(page, GATE_BOOT)
    page.wait_for_selector("#gate-panel.on", timeout=10000)
    page.click(button)
    settle(page, 2500)


def rest(page):
    """Wait for a smooth scroll to stop: it runs off the faked clock, so the
    shot has to wait for it in real time or it lands mid-flight."""
    last, steady = None, 0
    while steady < 3:
        y = page.evaluate("Math.round(scrollY)")
        steady = steady + 1 if y == last else 0
        last = y
        page.wait_for_timeout(100)


def new_ctx(browser, viewport=None, **opts):
    ctx = browser.new_context(viewport=viewport or nav.DESKTOP, **opts)
    ctx.set_default_timeout(15000)
    ctx.clock.install(time=CLOCK_START)
    ctx.clock.pause_at(CLOCK_PAUSE)    # stopped before the first page exists
    ctx.add_init_script(nav.INIT)
    ctx.add_init_script(SEED)
    ctx.route("**/*.mp4", lambda route: route.abort())   # posters only, see PARK_VIDEO
    return ctx, ctx.new_page()


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
    """Take the XP mote and its label out of the shot. A claim is set off by an
    observer, which fires on a real frame rather than on one of ours, so a mote
    caught in flight is at a different point every run."""
    page.wait_for_timeout(150)   # let a pending observer land first
    page.evaluate("document.querySelectorAll('.xp-mote, .xp-tag')"
                  ".forEach(el => el.remove())")


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

# ------------------------------------------------------------------ the map

# The beacon lists are plain consts inside bridge.js's IIFE, and each mark's
# world x is computed from the map in world.js, so the blocks are lifted out
# of the source and run in the page, where World is a global.


def js_block(source, opener, closer):
    i = source.find(opener)
    if i < 0:
        raise RuntimeError(f"snap.py: {opener!r} is no longer in the source")
    j = source.find(closer, i)
    if j < 0:
        raise RuntimeError(f"snap.py: no {closer!r} after {opener!r}")
    return source[i:j + len(closer)]


BRIDGE_SRC = (ROOT / "bridge.js").read_text(encoding="utf-8")
GENESIS_SRC = (ROOT / "genesis.js").read_text(encoding="utf-8")

MARKS_SRC = js_block(BRIDGE_SRC, "const MARKS = [", "\n  ];")
PLANETS_SRC = js_block(BRIDGE_SRC, "const PLANETS = [", "\n  ];")
BEATS_SRC = js_block(GENESIS_SRC, "const BEATS = [", "\n  ];")

MARK_IDS = re.findall(r'id:\s*"([^"]+)"', MARKS_SRC)
PLANET_IDS = re.findall(r'id:\s*"([^"]+)"', PLANETS_SRC)
BEAT_IDS = re.findall(r'id:\s*"([^"]+)"', BEATS_SRC)
if not (MARK_IDS and PLANET_IDS and BEAT_IDS):
    raise RuntimeError("snap.py: MARKS / PLANETS / BEATS no longer parse — "
                       "no scene names can be built")

MAP_JS = """() => {
  const SLOT = World.SLOT, LAND = World.LAND, BOUNDS = World.BOUNDS;
  %(cam)s
  %(gd_slot)s
  %(gd_at)s
  %(gd_land)s
  %(marks)s
  %(marks_each)s
  %(planets)s
  %(planets_each)s
  return {
    marks: MARKS.map(m => ({ id: m.id, x: m.x })),
    planets: PLANETS.map(m => ({ id: m.id, x: m.x })),
    land: Object.keys(LAND), landBridge: LAND.bridge,
  };
}""" % {
    "cam": js_block(BRIDGE_SRC, "const CAM = {", "\n  };"),
    "gd_slot": js_block(BRIDGE_SRC, "const GD_SLOT = SLOT;", ";"),
    "gd_at": js_block(BRIDGE_SRC, "const gdAt = i => i * GD_SLOT;", ";"),
    "gd_land": js_block(BRIDGE_SRC, "const GD_LAND = {", "\n  };"),
    "marks": MARKS_SRC,
    "marks_each": js_block(BRIDGE_SRC, "MARKS.forEach((m, i) => {", "\n  });"),
    "planets": PLANETS_SRC,
    "planets_each": js_block(BRIDGE_SRC, "PLANETS.forEach((m, i) => {", "\n  });"),
}

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
    gdCamX: mode === 'gamedev' ? x : null,
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

# ------------------------------------------------------------------ contexts

_shared = {}     # long-lived contexts: the claimed bridge, and genesis


def bridge_page(browser, base):
    """One entered page with every beacon claimed, so all depth nodes exist."""
    if "bridge" not in _shared:
        ctx, page = new_ctx(browser)
        enter_via_gate(page, base, "#gate-projects")
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
        enter_via_gate(page, base, "#gate-projects")
        _shared["genesis"] = (ctx, page)
    return _shared["genesis"][1]


def close_shared():
    for ctx, _page in _shared.values():
        ctx.close()
    _shared.clear()

# ------------------------------------------------------------------ scenes


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
        settle(page, 2500)
        shot(page, out_dir, f"bridge-{mode}-{label}")
    return fn


def mark_x(mid):
    return lambda m: next((e["x"] for e in m["marks"] if e["id"] == mid), None)


def planet_x(pid):
    return lambda m: next((e["x"] for e in m["planets"] if e["id"] == pid), None)


def land_x(key):
    return lambda m: m["landBridge"] if key in m["land"] else None


def scene_bridge_unclaimed(browser, base, out_dir):
    ctx, page = new_ctx(browser)
    enter_via_gate(page, base, "#gate-projects")
    set_view(page, "void", world_map(page)["marks"][0]["x"])
    page.reload()
    page.wait_for_load_state("load")
    settle(page, 2500)
    shot(page, out_dir, "bridge-void-unclaimed")
    ctx.close()


def scene_bridge_phone_landscape(browser, base, out_dir):
    ctx, page = new_ctx(browser, nav.PHONE_LANDSCAPE, is_mobile=True,
                        has_touch=True, device_scale_factor=2)
    enter_via_gate(page, base, "#gate-projects")
    set_view(page, "void", world_map(page)["marks"][0]["x"])
    page.reload()
    page.wait_for_load_state("load")
    settle(page, 2500)
    shot(page, out_dir, "bridge-phone-landscape")
    ctx.close()


def scene_gate(browser, base, out_dir):
    ctx, page = new_ctx(browser)
    page.goto(base + "/")
    settle(page, GATE_BOOT)
    page.wait_for_selector("#gate-panel.on", timeout=15000)
    settle(page, 500)
    shot(page, out_dir, "gate-first-visit")
    ctx.close()


def genesis_beat(bid):
    def fn(browser, base, out_dir):
        page = genesis_page(browser, base)
        page.goto(f"{base}/?genesis=1&gbeat={bid}")
        page.wait_for_load_state("load")
        settle(page, 1500)
        shot(page, out_dir, f"genesis-{bid}")
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


def index_section(section, label, viewport):
    def fn(browser, base, out_dir):
        ctx, page = new_ctx(browser, viewport)
        enter_via_gate(page, base, "#gate-projects")
        page.evaluate(f"location.hash='#{section}'")
        rest(page)
        settle(page, 800)
        shot(page, out_dir, f"index-{section}-{label}")
        ctx.close()
    return fn


PROJECTS = ["sector-zero", "voidscape", "heavylight", "conclusus"]


def scenes():
    out = []
    for mid in MARK_IDS:
        out.append((f"bridge-void-{mid}", bridge_camera("void", mid, mark_x(mid))))
    out.append(("bridge-void-bridge-span",
                bridge_camera("void", "bridge-span", land_x("bridge"))))
    for pid in PLANET_IDS:
        out.append((f"bridge-gamedev-{pid}", bridge_camera("gamedev", pid, planet_x(pid))))
    out.append(("bridge-void-unclaimed", scene_bridge_unclaimed))
    out.append(("bridge-phone-landscape", scene_bridge_phone_landscape))
    out.append(("gate-first-visit", scene_gate))
    for bid in BEAT_IDS:
        out.append((f"genesis-{bid}", genesis_beat(bid)))
    for name in PROJECTS:
        out.append((f"page-{name}-desktop", project_page(name, "desktop", nav.DESKTOP)))
        out.append((f"page-{name}-phone", project_page(name, "phone", nav.PHONE)))
    for section in ("work", "experience"):
        out.append((f"index-{section}-desktop", index_section(section, "desktop", nav.DESKTOP)))
        out.append((f"index-{section}-phone", index_section(section, "phone", nav.PHONE)))
    return out

# ------------------------------------------------------------------ capture


def capture(name, only=None):
    out_dir = SHOTS / name
    out_dir.mkdir(parents=True, exist_ok=True)
    chosen = [(n, fn) for n, fn in scenes() if not only or only in n]
    if not chosen:
        print(f"no scene matches {only!r} - use: py -3 snap.py list")
        return 2
    failed = []
    httpd, base = nav.start_server()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(args=CHROME)
            for n, fn in chosen:
                t0 = time.time()
                try:
                    fn(browser, base, out_dir)
                    print(f"  {n:34} {time.time() - t0:6.1f}s")
                except Exception as e:
                    failed.append(n)
                    print(f"FAIL {n}: {type(e).__name__}: {e}".splitlines()[0])
            close_shared()
            browser.close()
    finally:
        httpd.shutdown()
    print(f"\n{len(chosen) - len(failed)}/{len(chosen)} scene(s) into {out_dir}")
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
  py -3 snap.py capture <name> [--only <substring>]
  py -3 snap.py compare <a> <b> [--threshold 0.5]
  py -3 snap.py list"""


def main():
    args = sys.argv[1:]
    cmd = args[0] if args else ""
    rest = args[1:]
    if cmd == "list":
        for n, _fn in scenes():
            print(n)
        return 0
    if cmd == "capture" and rest:
        only = None
        if "--only" in rest:
            i = rest.index("--only")
            only = rest[i + 1] if len(rest) > i + 1 else None
            rest = rest[:i]
        return capture(rest[0], only)
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
