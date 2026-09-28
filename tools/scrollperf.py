"""Scroll-jank measurement for a case page's toy.
usage: py -3 tools/scrollperf.py <page> [--bar] [--runs N]
Loads projects/<page>.html at 1440x900 in a real (headed) Chromium on REAL
time, not snap.py's stopped clock, waits for the toy to settle, then wheels the
page down to the bottom and back up in 120 px steps, one every ~16 ms, and
records: rAF probe intervals (frame pacing), toy vs other rAF callback cost,
layout reads made inside toy frames, long tasks, long animation frames, layout
shifts and CDP Performance deltas. --runs (default 3) fresh-context runs are
medianed, plus one extra attribution run (stack-captured read sites) that
never enters the median.
D37's bars (--bar prints PASS/FAIL per bar, exits 1 on any FAIL):
  p95 frame interval <= 18 ms (assumes a 60 Hz display), longest frame <= 50 ms,
  0 layout reads inside toy frames, toy frame script p95 < 4 ms.
Takes about a minute. Writes snapshots/perf/<page>-<stamp>.json.
"""

import sys
import json
import math
import time
import statistics
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("snap", ROOT / "tools" / "snap.py")
snap = importlib.util.module_from_spec(spec)
spec.loader.exec_module(snap)

from playwright.sync_api import sync_playwright

KEYS = ["LayoutCount", "RecalcStyleCount", "ScriptDuration", "LayoutDuration",
        "RecalcStyleDuration", "TaskDuration"]

PROBE = r"""
(function () {
  const P = window.__perf = { rec: false, probe: [], toy: [], other: [], readsInToy: 0,
    readNames: {}, sites: {}, wantSites: false, long: [], loaf: [], shifts: [] };
  const raf = window.requestAnimationFrame.bind(window);
  let prev = -1;
  function probe(t) {
    if (P.rec) { if (prev >= 0) P.probe.push(t - prev); prev = t; } else prev = -1;
    raf(probe);
  }
  raf(probe);
  let inToy = 0;
  const cache = new WeakMap();
  window.requestAnimationFrame = function (cb) {
    if (typeof cb !== 'function') return raf(cb);
    let toy = cache.get(cb);
    if (toy === undefined) {
      const s = new Error().stack || '';
      toy = s.includes('/js/lib/pacer.js') || s.includes('/js/pages/');
      cache.set(cb, toy);
    }
    return raf(function (t) {
      const t0 = performance.now();
      if (toy) inToy++;
      try { return cb(t); }
      finally {
        if (toy) inToy--;
        if (P.rec) (toy ? P.toy : P.other).push(performance.now() - t0);
      }
    });
  };
  function hit(name) {
    if (!(P.rec && inToy > 0)) return;
    P.readsInToy++;
    P.readNames[name] = (P.readNames[name] || 0) + 1;
    if (P.wantSites) {
      const lines = (new Error().stack || '').split('\n');
      let key = '?';
      for (let i = 1; i < lines.length; i++) {
        const l = lines[i];
        if (l.includes('http') && !l.includes('__perf_init')) {
          const m = l.match(/([^\/\s(]+:\d+):\d+\)?\s*$/);
          if (m) { key = m[1]; break; }
        }
      }
      const k = name + ' @ ' + key;
      P.sites[k] = (P.sites[k] || 0) + 1;
    }
  }
  function wrapMethod(proto, name) {
    const d = Object.getOwnPropertyDescriptor(proto, name);
    if (!d || typeof d.value !== 'function' || !d.configurable) return;
    const orig = d.value;
    d.value = function () { hit(name); return orig.apply(this, arguments); };
    Object.defineProperty(proto, name, d);
  }
  function wrapGetter(obj, name) {
    const d = Object.getOwnPropertyDescriptor(obj, name);
    if (!d || !d.get || !d.configurable) return false;
    const orig = d.get;
    d.get = function () { hit(name); return orig.call(this); };
    Object.defineProperty(obj, name, d);
    return true;
  }
  wrapMethod(Element.prototype, 'getBoundingClientRect');
  wrapMethod(Element.prototype, 'getClientRects');
  ['offsetTop', 'offsetLeft', 'offsetWidth', 'offsetHeight', 'offsetParent']
    .forEach(function (n) { wrapGetter(HTMLElement.prototype, n); });
  ['clientWidth', 'clientHeight', 'scrollTop', 'scrollHeight']
    .forEach(function (n) { wrapGetter(Element.prototype, n); });
  ['scrollY', 'pageYOffset', 'scrollX', 'pageXOffset', 'innerHeight', 'innerWidth']
    .forEach(function (n) {
      if (!wrapGetter(Window.prototype, n)) wrapGetter(window, n);
    });
  const gcs = window.getComputedStyle;
  window.getComputedStyle = function () { hit('getComputedStyle'); return gcs.apply(window, arguments); };
  function base(u) { return String(u || '').split('/').pop().split('?')[0]; }
  function obs(type, fn) {
    try { new PerformanceObserver(function (l) { l.getEntries().forEach(fn); })
      .observe({ type: type, buffered: false }); } catch (e) {}
  }
  obs('longtask', function (e) { if (P.rec) P.long.push({ start: e.startTime, dur: e.duration }); });
  obs('layout-shift', function (e) { if (P.rec) P.shifts.push({ value: e.value, recent: e.hadRecentInput }); });
  obs('long-animation-frame', function (e) {
    if (!P.rec) return;
    const sc = (e.scripts || []).slice().sort(function (a, b) { return b.duration - a.duration; })
      .slice(0, 3).map(function (s) {
        return { src: base(s.sourceURL) + ':' + (s.sourceFunctionName || '?'), dur: s.duration };
      });
    P.loaf.push({ dur: e.duration, block: e.blockingDuration, scripts: sc });
  });
})();
"""


def pct(vals, q):
    s = sorted(vals)
    return s[max(0, math.ceil(q * len(s)) - 1)] if s else 0


def stats(vals, total=False):
    d = {"n": len(vals), "p50": pct(vals, 0.5), "p95": pct(vals, 0.95),
         "max": max(vals) if vals else 0}
    if total:
        d["sum"] = sum(vals)
    return d


def scroll_pass(page, dy):
    steps = 0
    last = None
    same = 0
    page.evaluate("window.__perf.rec = true")
    while same < 3 and steps < 3000:
        page.mouse.wheel(0, dy)
        page.wait_for_timeout(16)
        y = int(page.evaluate("window.scrollY"))
        same = same + 1 if y == last else 0
        last = y
        steps += 1
    page.evaluate("window.__perf.rec = false")
    return steps


def run_once(browser, base, page_name, want_sites):
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
    ctx.add_init_script(PROBE)
    page = ctx.new_page()
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    page.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    page.goto(f"{base}/projects/{page_name}.html")
    page.wait_for_load_state("load")
    page.wait_for_timeout(2500)
    toy = bool(page.evaluate(
        "(() => { const c = document.querySelector('canvas.play');"
        " return !!c && !c.hidden && getComputedStyle(c).display !== 'none'; })()"))

    cdp = None
    try:
        cdp = ctx.new_cdp_session(page)
        cdp.send("Performance.enable")
    except Exception:
        cdp = None

    def metrics():
        if cdp is None:
            return {}
        ms = cdp.send("Performance.getMetrics")["metrics"]
        return {m["name"]: m["value"] for m in ms if m["name"] in KEYS}

    page.mouse.move(720, 450)
    page.evaluate("window.__perf.wantSites = " + ("true" if want_sites else "false"))
    a = metrics()
    steps_down = scroll_pass(page, 120)
    b = metrics()
    page.wait_for_timeout(500)
    c = metrics()
    steps_up = scroll_pass(page, -120)
    d = metrics()
    perf = page.evaluate("window.__perf")
    ctx.close()

    cd = {}
    if a and b and c and d:
        for k in KEYS:
            v = (b[k] - a[k]) + (d[k] - c[k])
            cd[k] = round(v * 1000, 3) if k.endswith("Duration") else int(round(v))

    loaf_scripts = {}
    for e in perf["loaf"]:
        for s in e["scripts"]:
            loaf_scripts[s["src"]] = loaf_scripts.get(s["src"], 0) + s["dur"]
    top = sorted(loaf_scripts.items(), key=lambda kv: -kv[1])[:10]
    fr = stats(perf["probe"])
    fr["over50"] = sum(1 for v in perf["probe"] if v > 50)
    lt = [e["dur"] for e in perf["long"]]
    return {
        "frame": fr,
        "toy_cb": stats(perf["toy"], True),
        "other_cb": stats(perf["other"], True),
        "reads_in_toy": perf["readsInToy"],
        "read_names": perf["readNames"],
        "sites": perf["sites"] if want_sites else {},
        "longtask": {"n": len(lt), "total_ms": sum(lt), "max_ms": max(lt) if lt else 0},
        "loaf": {"n": len(perf["loaf"]), "total_ms": sum(e["dur"] for e in perf["loaf"]),
                 "block_ms": sum(e["block"] for e in perf["loaf"])},
        "loaf_scripts": dict(top),
        "layout_shift": {"n": len(perf["shifts"]),
                         "sum": sum(s["value"] for s in perf["shifts"] if not s["recent"])},
        "cdp": cd,
        "steps_down": steps_down,
        "steps_up": steps_up,
        "toy": toy,
        "errors": errs,
    }


def median_of(runs, get):
    vals = [get(r) for r in runs]
    return statistics.median(vals) if vals else 0


def build_median(runs):
    m = {}
    for grp in ("frame", "toy_cb", "other_cb", "longtask", "layout_shift"):
        m[grp] = {k: median_of(runs, lambda r, g=grp, k=k: r[g][k]) for k in runs[0][grp]}
    m["reads_in_toy"] = median_of(runs, lambda r: r["reads_in_toy"])
    m["loaf"] = {k: median_of(runs, lambda r, k=k: r["loaf"][k]) for k in ("n", "total_ms", "block_ms")}
    keys = set(runs[0]["cdp"])
    for r in runs:
        keys &= set(r["cdp"])
    m["cdp"] = {k: median_of(runs, lambda r, k=k: r["cdp"][k]) for k in sorted(keys)}
    m["steps_down"] = median_of(runs, lambda r: r["steps_down"])
    m["steps_up"] = median_of(runs, lambda r: r["steps_up"])
    return m


def top_items(d, n=5):
    return sorted(d.items(), key=lambda kv: -kv[1])[:n]


def main(argv):
    name = None
    bar = False
    runs_n = 3

    i = 0
    while i < len(argv):
        arg = argv[i]
        if arg == "--bar":
            bar = True
        elif arg == "--runs":
            i += 1
            runs_n = int(argv[i])
        elif name is None:
            name = arg
        i += 1

    if name is None:
        print("usage: py -3 tools/scrollperf.py <page> [--bar] [--runs N]")
        return 2

    page_name = name
    if page_name.startswith("projects/"):
        page_name = page_name[len("projects/"):]
    if page_name.endswith(".html"):
        page_name = page_name[:-len(".html")]

    if not (ROOT / "projects" / f"{page_name}.html").exists():
        print(f"no such page: projects/{page_name}.html")
        return 2

    httpd, base = snap.nav.start_server()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=False, args=[
                "--disable-backgrounding-occluded-windows",
                "--disable-renderer-backgrounding",
                "--disable-background-timer-throttling"])
            runs = []
            for n in range(runs_n):
                r = run_once(browser, base, page_name, False)
                runs.append(r)
                print(f"run {n + 1}/{runs_n}: frame p95 {r['frame']['p95']:.1f} ms, "
                      f"toy p95 {r['toy_cb']['p95']:.2f} ms, reads {r['reads_in_toy']}")
            attr = run_once(browser, base, page_name, True)
            browser.close()
    finally:
        httpd.shutdown()

    med = build_median(runs)
    bars = [
        {"name": "p95 frame interval", "value": med["frame"]["p95"], "bar": "<= 18", "pass": med["frame"]["p95"] <= 18},
        {"name": "longest frame", "value": med["frame"]["max"], "bar": "<= 50", "pass": med["frame"]["max"] <= 50},
        {"name": "layout reads inside toy frames", "value": med["reads_in_toy"], "bar": "== 0", "pass": med["reads_in_toy"] == 0},
        {"name": "toy frame script p95", "value": med["toy_cb"]["p95"], "bar": "< 4", "pass": med["toy_cb"]["p95"] < 4},
    ]
    stamp = time.strftime("%Y%m%d-%H%M%S")
    out = ROOT / "snapshots" / "perf" / f"{page_name}-{stamp}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({"page": page_name, "stamp": stamp, "viewport": [1440, 900], "dpr": 1,
                               "runs": runs, "median": med, "attribution": attr, "bars": bars}, indent=1))

    f, t, o, lt, lo = med["frame"], med["toy_cb"], med["other_cb"], med["longtask"], med["loaf"]
    cd = med["cdp"]
    print(f"median probe interval {f['p50']:.1f} ms (the 18 ms bar assumes a 60 Hz display)")
    print(f"frame p95 {f['p95']:.1f} max {f['max']:.1f} over50 {f['over50']}")
    print(f"toy_cb p95 {t['p95']:.2f} max {t['max']:.2f} n {t['n']}; other_cb p95 {o['p95']:.2f}")
    print(f"reads_in_toy {med['reads_in_toy']} names {runs[0]['read_names']}")
    print(f"longtask n {lt['n']} total {lt['total_ms']:.0f} ms; loaf n {lo['n']} block {lo['block_ms']:.0f} ms")
    print(f"layout_shift sum {med['layout_shift']['sum']:.4f}")
    if cd:
        print(f"cdp LayoutCount {cd['LayoutCount']} RecalcStyleCount {cd['RecalcStyleCount']} "
              f"Script {cd['ScriptDuration']:.0f} ms Layout {cd['LayoutDuration']:.0f} ms")
    for k, v in top_items(attr["sites"]):
        print(f"site {v:>5}  {k}")
    for k, v in top_items(attr["loaf_scripts"]):
        print(f"loaf {v:7.1f} ms  {k}")
    if not runs[0]["toy"]:
        print("WARN no visible toy canvas")
    seen = []
    for r in runs + [attr]:
        for e in r["errors"]:
            line = e.splitlines()[0] if e else ""
            if line not in seen:
                seen.append(line)
                print(f"ERR {line}")
    print(out)

    if bar:
        for b in bars:
            print(f"{'PASS' if b['pass'] else 'FAIL'}  {b['name']}  {b['value']:.2f} (bar {b['bar']})")
        return 0 if all(b["pass"] for b in bars) else 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
