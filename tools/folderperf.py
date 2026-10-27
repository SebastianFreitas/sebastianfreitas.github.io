"""Frame meter for the first open of a game folder on the index.
usage: py -3 tools/folderperf.py [--folder sector-zero|voidscape|conclusus|heavylight]
                                 [--slow] [--phone] [--cpu N] [--json <path>]
Fresh context per folder (cold cache), 1440x900 (or --phone), real time. Gets
past the gate onto the bridge, wheels down to the Work row in about 1 s, clicks
the folder at once (--slow: after 2 s), then records rAF frame intervals and
longtasks from the click until 1.5 s after the open animation ends (4 s cap).
Phases: click (click until the loading screen shows: body._phase "load"),
loading ("load"), sweep ("fade": the content comes in), after (done).
One line per folder. Exit 0. --json writes the raw numbers.
"""

import sys
import json
import time
import statistics
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("snap", ROOT / "tools" / "snap.py")
snap = importlib.util.module_from_spec(spec)
spec.loader.exec_module(snap)

from playwright.sync_api import sync_playwright

KEYS = ["sector-zero", "voidscape", "conclusus", "heavylight"]
CAP_MS = 4000
TAIL_MS = 1500

PROBE = r"""
(function () {
  const P = window.__fp = { rec: false, t0: 0, frames: [], long: [], marks: [] };
  let prev = -1, phase = null;
  function tick(t) {
    if (P.rec) {
      if (prev >= 0) P.frames.push({ t: t - P.t0, dt: t - prev });
      prev = t;
      const b = document.querySelector('.folder-body[id$="-body"]:not([hidden])');
      const ph = b ? (b._phase || (b.classList.contains('is-opening') ? 'wipe' : (b.classList.contains('is-open') ? 'open' : null))) : null;
      if (ph !== phase) { phase = ph; P.marks.push({ t: t - P.t0, phase: ph }); }
    } else prev = -1;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  try { new PerformanceObserver(function (l) { l.getEntries().forEach(function (e) {
    if (P.rec) P.long.push({ t: e.startTime - P.t0, dur: e.duration });
  }); }).observe({ type: 'longtask', buffered: false }); } catch (e) {}
})();
"""


def pct(vals, q):
    s = sorted(vals)
    return s[min(len(s) - 1, int(len(s) * q))] if s else 0.0


def run_once(browser, base, key, slow, phone, cpu):
    vp = {"width": 390, "height": 844} if phone else {"width": 1440, "height": 900}
    ctx = browser.new_context(viewport=vp, device_scale_factor=1, has_touch=phone, is_mobile=phone)
    page = ctx.new_page()
    page.add_init_script(PROBE)
    if cpu > 1:
        ctx.new_cdp_session(page).send("Emulation.setCPUThrottlingRate", {"rate": cpu})
    page.goto(base + "/")
    page.wait_for_selector("#gate-panel.on", timeout=20000)
    page.click("#gate-world")
    page.wait_for_timeout(3500)
    row = page.locator(f'a.obj[href^="projects/{key}"]').first
    top = page.evaluate("(el) => el.getBoundingClientRect().top + scrollY", row.element_handle())
    goal = max(0, top - 300)
    page.mouse.move(vp["width"] / 2, vp["height"] / 2)
    steps = 60
    for _ in range(steps):                       # about 1 s of wheel, like a person
        page.mouse.wheel(0, goal / steps)
        page.wait_for_timeout(16)
    if slow:
        page.wait_for_timeout(2000)
    page.evaluate("() => { const P = window.__fp; P.frames = []; P.long = []; P.marks = []; P.t0 = performance.now(); P.rec = true; }")
    row.click()
    t_click = time.time()
    seen_end = None
    while True:
        page.wait_for_timeout(50)
        el = (time.time() - t_click) * 1000
        st = page.evaluate("() => { const P = window.__fp, m = P.marks; return m.length ? m[m.length - 1].phase : null; }")
        if st in (None, "open") and page.evaluate(
                "() => window.__fp.marks.some(function (m) { return m.phase === 'fade'; })"):
            if seen_end is None:
                seen_end = el
            if el - seen_end >= TAIL_MS:
                break
        if el >= CAP_MS:
            break
    d = page.evaluate("() => { const P = window.__fp; P.rec = false; return { frames: P.frames, long: P.long, marks: P.marks }; }")
    ctx.close()
    return d


def summarise(key, d):
    fr, marks = d["frames"], d["marks"]
    t_load = next((m["t"] for m in marks if m["phase"] == "load"), None)
    t_fade = next((m["t"] for m in marks if m["phase"] == "fade"), None)
    t_done = next((m["t"] for m in marks if m["phase"] == "open" and t_fade is not None and m["t"] >= t_fade), None)
    if t_done is None:
        t_done = next((m["t"] for m in marks if m["phase"] is None and t_fade is not None and m["t"] >= t_fade), None)

    def phase_of(t):
        if t_load is None or t < t_load:
            return "click"
        if t_fade is None or t < t_fade:
            return "loading"
        if t_done is None or t < t_done:
            return "sweep"
        return "after"

    dts = [f["dt"] for f in fr]
    worst = max(fr, key=lambda f: f["dt"]) if fr else {"t": 0, "dt": 0}
    per = {}
    for name in ("click", "loading", "sweep", "after"):
        v = [f["dt"] for f in fr if phase_of(f["t"]) == name]
        per[name] = {"n": len(v), "max": max(v) if v else 0, "over33": sum(1 for x in v if x > 33)}
    return {
        "folder": key, "frames": len(fr), "p50": pct(dts, 0.5), "p95": pct(dts, 0.95),
        "max": max(dts) if dts else 0, "over33": sum(1 for x in dts if x > 33),
        "longtask": max((l["dur"] for l in d["long"]), default=0),
        "worst_t": worst["t"], "worst_phase": phase_of(worst["t"]),
        "t_load": t_load, "t_fade": t_fade, "t_done": t_done, "phases": per,
        "raw": d,
    }


def main(argv):
    folders = KEYS
    out = None
    if "--folder" in argv:
        folders = [argv[argv.index("--folder") + 1]]
    if "--json" in argv:
        out = argv[argv.index("--json") + 1]
    slow, phone = "--slow" in argv, "--phone" in argv
    cpu = int(argv[argv.index("--cpu") + 1]) if "--cpu" in argv else 6
    print(f"cpu throttle {cpu}x")
    httpd, base = snap.nav.start_server()
    res = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=False, args=[
                "--disable-backgrounding-occluded-windows",
                "--disable-renderer-backgrounding",
                "--disable-background-timer-throttling"])
            for key in folders:
                try:
                    r = summarise(key, run_once(browser, base, key, slow, phone, cpu))
                except Exception as e:
                    print(f"{key}: failed: {type(e).__name__}: {str(e).splitlines()[0]}")
                    continue
                res.append(r)
                ph = r["phases"]
                print(f"{key}: {r['frames']} fr, p50 {r['p50']:.1f} p95 {r['p95']:.1f} max {r['max']:.0f} ms, "
                      f">33ms {r['over33']}, longtask {r['longtask']:.0f} ms, worst @{r['worst_t']:.0f} ms in {r['worst_phase']}")
                print("   " + ", ".join(f"{n} {ph[n]['max']:.0f}ms/{ph[n]['over33']}" for n in ph)
                      + f" (max/over33); loading shows @{r['t_load'] if r['t_load'] is None else round(r['t_load'])} ms")
            browser.close()
    finally:
        httpd.shutdown()
    if out:
        Path(out).write_text(json.dumps(res))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
