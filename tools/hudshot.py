"""Shoot the bridge HUD for review: py -3 tools/hudshot.py <run> [--size WxH]
[--at <mark> | --x <world x> | --site <SITES id>] [--claimed] [--read <n>] [--burn <s>] [--turn <s>] [--touch]

--x puts the camera at a world x; --site at that SITES entry's x (and implies
--claimed so its depth gate is open). Shots go to snapshots/<run>/. Enters through the gate and frames the camera
exactly as tools/snap.py does (it is imported for its helpers). HudC25.report() is printed as JSON (--c25 is a no-op, kept so older commands work). --touch is a phone
check only: prints Bridge.phone and the report, no shot. Exits 1 on any
console error."""
from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location("snap_mod", ROOT / "tools" / "snap.py")
snap = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(snap)
nav = snap.nav
from playwright.sync_api import sync_playwright

READ_NEAREST = """n => {
  const ids = [];
  for (let i = 0; i < n; i++) {
    const u = window.HudC25 && HudC25.nearestUnread();
    if (!u) break;
    XP.award('beacon-' + u.mark.id, 1, u.mark.id, 0, 0);
    ids.push(u.mark.id);
  }
  return ids;
}"""
CLAIM_ALL = """() => {
  let n = 0;
  for (let pass = 0; pass < 10; pass++) {
    const un = Bridge.activeMarks().filter(m => !XP.has('beacon-' + m.id));
    if (!un.length) break;
    un.forEach(m => XP.award('beacon-' + m.id, 1, m.id, 0, 0));
    n += un.length;
  }
  return n;
}"""
REPORT = "() => window.HudC25 ? HudC25.report() : null"


def enter(page, base):
    page.goto(base + "/")
    snap.settle(page, snap.GATE_BOOT)
    page.wait_for_selector("#gate-panel.on", timeout=10000)
    page.click("#gate-world")
    snap.settle(page, 2500)


def run(a):
    out_dir = snap.SHOTS / a.run
    out_dir.mkdir(parents=True, exist_ok=True)
    if a.site:
        a.claimed = True
    w, h = (int(v) for v in a.size.lower().split("x"))
    httpd, base = nav.start_server()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(args=snap.CHROME)
            opts = dict(is_mobile=True, has_touch=True, device_scale_factor=2) if a.touch else {}
            ctx, page = snap.new_ctx(browser, {"width": w, "height": h}, **opts)
            enter(page, base)
            m = snap.world_map(page)
            if a.claimed:
                page.evaluate("window.depthsReveal && depthsReveal()")
                snap.settle(page, 3000)
                for _ in range(10):
                    if not page.evaluate(CLAIM_ALL):
                        break
                    snap.settle(page, 1200)
            x = m["marks"][0]["x"] if not a.at else snap.mark_x(a.at)(m)
            if a.x is not None:
                x = a.x
            if a.site:
                x = page.evaluate("id => { const s = BridgeSites.SITES.find(s => s.id === id); return s ? s.x : null; }", a.site)
            if x is None:
                print(f"unknown mark or site {a.at or a.site!r}")
                return 2
            snap.set_view(page, "void", x)
            page.reload()
            page.wait_for_load_state("load")
            snap.press_gate(page)
            snap.settle(page, 2500)
            if a.claimed:
                page.evaluate("window.depthsReveal && depthsReveal()")
                snap.settle(page, 2000)
                for _ in range(10):
                    if not page.evaluate(CLAIM_ALL):
                        break
                    snap.settle(page, 1200)
                for _ in range(60):
                    if not page.evaluate("window.XP && XP.busy"):
                        break
                    page.keyboard.press("Escape")
                    snap.settle(page, 1000)
                snap.settle(page, 1500)
            if a.read:
                print("read:", page.evaluate(READ_NEAREST, a.read))
                snap.settle(page, 3000)
            if a.sweep:
                for b in (0, 90, 180, 270, 350):
                    page.evaluate("b => { HudC25._forceBrg = b; }", b)
                    snap.settle(page, 400)
                    print("sweep", b, json.dumps(page.evaluate("() => { const r = HudC25.report().left; return { str: r.str, boxes: r.boxes }; }")))
                page.evaluate("() => { HudC25._forceBrg = null; }")
            if a.touch:
                print("phone:", page.evaluate("Bridge.phone"))
                print("canvas:", page.evaluate("() => getComputedStyle(document.getElementById('bhud')).display === 'none' ? 'hidden' : 'shown'"))
                print("painted:", page.evaluate("() => HudC25.report().painted"))
                print("report:", json.dumps(page.evaluate(REPORT)))
            else:
                name = "hud" + f"-{w}x{h}" + (f"-{a.at}" if a.at else "") + (f"-x{int(a.x)}" if a.x is not None else "") + (f"-{a.site}" if a.site else "") + (f"-read{a.read}" if a.read else "") + ("-claimed" if a.claimed else "")
                if a.burn:
                    page.mouse.move(w * a.aim, h * 0.4)
                    page.mouse.down()
                    if a.turn:
                        snap.settle(page, int(a.turn * 1000))
                        page.mouse.move(w * 0.62, h * 0.9, steps=8)
                    snap.settle(page, int(max(a.burn - a.turn, 0.2) * 1000))
                    snap.shot(page, out_dir, name + "-burn")
                    print("ship:", page.evaluate("() => { const s = Bridge.ship; return { demand: s.demand, engine: s.engine, far: s.far, vel: s.vel }; }"))
                    held = json.dumps(page.evaluate(REPORT))   # read while still held, the aim is gone after release
                    page.mouse.up()
                else:
                    snap.shot(page, out_dir, name)
                print("shot:", out_dir / (name + ("-burn" if a.burn else "") + ".png"))
                print("report:", held if a.burn else json.dumps(page.evaluate(REPORT)))
                print("modes:", page.evaluate("""() => {
                    const m = document.getElementById('bridge-modes'), r = m && m.getBoundingClientRect(), sb = HudC25.report().span.box;
                    if (!r || !r.width) return 'none';
                    const meets = !!sb && r.left < sb.r && r.right > sb.l && r.top < sb.b && r.bottom > sb.t;
                    return [r.left, r.top, r.right, r.bottom].map(v => Math.round(v * 10) / 10).join(',') + '  meets span: ' + (meets ? 'yes' : 'no');
                }"""))
                print("env:", json.dumps(page.evaluate("() => ({ w: Bridge.env.w, chaos: Bridge.env.chaos, sc: HudModels.sc(Bridge.env) })")))
            ctx.close()
            browser.close()
    finally:
        httpd.shutdown()
    if snap.ERRORS:
        print("console errors:")
        for e in snap.ERRORS:
            print("  ", e)
        return 1
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("run")
    ap.add_argument("--c25", action="store_true")
    ap.add_argument("--size", default="1440x900")
    ap.add_argument("--at")
    ap.add_argument("--x", type=float)
    ap.add_argument("--site")
    ap.add_argument("--claimed", action="store_true")
    ap.add_argument("--read", type=int, default=0)
    ap.add_argument("--burn", type=float, default=0)
    ap.add_argument("--aim", type=float, default=0.8)   # with --burn: the held pointer x as a fraction of the width
    ap.add_argument("--turn", type=float, default=0)   # with --burn: after this many seconds swing the held aim down (about 90 degrees off) for real sideways slip
    ap.add_argument("--touch", action="store_true")
    ap.add_argument("--sweep", action="store_true")   # force the rose bearing to 0 90 180 270 350 and print the left wing's box check for each
    return run(ap.parse_args())


if __name__ == "__main__":
    sys.exit(main())
