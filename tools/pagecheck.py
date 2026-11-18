"""Page checker, the Lighthouse stand-in (no node on this machine).

    py -3 tools/pagecheck.py <page> [--phone] [--reduced-motion]

page is index.html, index.html#sector-zero (any Work row id) or a game page
such as projects/sector-zero.html. The #<row> form loads the homepage at that
row and counts under hidden if the row is not scrolled into view (Work rows do
not open any more). Prints one line each for weight, perf, scroll, hidden,
clipped, bare and tilted, and up to 8 offending elements under hidden, clipped
and bare. Exit 1 on scroll, hidden, clipped or bare above 0, and 1 if the gate
never opens. Real clock, no screenshots, nothing written.
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location("nav_flows_test", ROOT / "tools" / "nav-flows.test.py")
nav = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(nav)

from playwright.sync_api import sync_playwright

PERF_INIT = """
(() => {
  window.__pc = { lcp: 0, cls: 0, long: 0 };
  const watch = (type, fn) => { try {
    new PerformanceObserver(l => l.getEntries().forEach(fn)).observe({ type, buffered: true });
  } catch (e) {} };
  watch('largest-contentful-paint', e => { window.__pc.lcp = e.startTime; });
  watch('layout-shift', e => { if (!e.hadRecentInput) window.__pc.cls += e.value; });
  watch('longtask', e => { window.__pc.long += e.duration; });
})();
"""

CHECKS = """([isCase, frag]) => {
  const vw = innerWidth;
  const label = el => el.tagName.toLowerCase()
    + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).join('.') : '')
    + ' "' + (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 40) + '"';
  const shown = el => {
    const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
  };
  const out = { scroll: document.documentElement.scrollWidth > vw, hidden: [], clipped: [], bare: [], tilted: 0 };

  if (frag) {
    const row = document.getElementById(frag), rr = row && row.getBoundingClientRect();
    if (!rr || rr.bottom <= 0 || rr.top >= innerHeight) out.hidden.push('#' + frag + ' not scrolled into view');
  }
  let sel = '.obj h3, .obj-line, .obj-id, .xp-what strong, .xp-what a, footer a';
  if (isCase) sel += ', .case h1';
  document.querySelectorAll(sel).forEach(el => {
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    if (parseFloat(s.opacity) < 0.9 || s.visibility === 'hidden' || r.left >= vw || r.right <= 0 && r.width > 0)
      out.hidden.push(label(el));
  });

  document.querySelectorAll('h1, h2, h3, p, li, a, strong, .key, .obj-id').forEach(el => {
    if (!shown(el)) return;
    const r = el.getBoundingClientRect();
    if (el.closest('.skip')) return;   // the skip link waits above the page until focused
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const s = getComputedStyle(p);
      const clips = s.overflowX !== 'visible' || s.overflowY !== 'visible';
      if (!clips && s.clipPath === 'none') continue;
      const c = p.getBoundingClientRect();
      if (clips && (r.left < c.left - 1 || r.right > c.right + 1 || r.top < c.top - 1 || r.bottom > c.bottom + 1)) {
        out.clipped.push(label(el)); break;
      }
      if (clips) break;
    }
  });

  document.querySelectorAll('.work, .experience, footer, .page-case').forEach(root => {
    root.querySelectorAll('h1, h2, h3, p, li, a, strong, .key, .obj-id').forEach(el => {
      // backed: black slabs, the Experience box's black shape, the solid footer and top bar
      if (el.closest('.slab, .case, .folder-body, .xp-shape, footer, .topbar, .skip') || !shown(el)) return;
      if (!(el.textContent || '').trim()) return;
      out.bare.push(label(el));
    });
  });

  document.querySelectorAll('*').forEach(el => {
    const t = getComputedStyle(el, '::before').transform;
    if (t && t !== 'none') out.tilted++;
  });
  return out;
}"""

KINDS = {"document": "html", "stylesheet": "css", "script": "js", "font": "font",
         "image": "image", "media": "video"}


def main():
    args = sys.argv[1:]
    phone = "--phone" in args
    reduced = "--reduced-motion" in args
    pages = [a for a in args if not a.startswith("--")]
    if len(pages) != 1:
        print(__doc__)
        return 2
    name, _, frag = pages[0].partition("#")
    game = name.startswith("projects/") and name.endswith(".html")
    if name != "index.html" and not (game and not frag):
        print("page must be index.html, index.html#<row> or projects/<name>.html")
        return 2

    httpd, base = nav.start_server()
    sizes = {k: 0 for k in ("html", "css", "js", "font", "image", "video", "other")}
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch()
            opts = {"viewport": {"width": 375, "height": 667} if phone else nav.DESKTOP}
            if reduced:
                opts["reduced_motion"] = "reduce"
            ctx = browser.new_context(**opts)
            ctx.set_default_timeout(15000)
            ctx.add_init_script(nav.INIT)
            ctx.add_init_script(PERF_INIT)
            page = ctx.new_page()

            def on_response(r):
                try:
                    n = len(r.body())
                except Exception:
                    return
                sizes[KINDS.get(r.request.resource_type, "other")] += n
            page.on("response", on_response)

            page.goto(f"{base}/{name if game else ''}#{frag}" if frag else f"{base}/{name if game else ''}")
            page.wait_for_load_state("load")
            page.wait_for_timeout(1500)
            if page.query_selector("#site-gate"):
                # the gate fills its bar and opens by itself (real clock here)
                try:
                    page.wait_for_function("document.getElementById('site-gate').classList.contains('done')", timeout=20000)
                except Exception:
                    print("gate: never opened within 20 s")
                    browser.close()
                    return 1
                page.wait_for_timeout(2500)
            perf = page.evaluate("window.__pc")
            res = page.evaluate(CHECKS, [game or bool(frag), frag])
            browser.close()
    finally:
        httpd.shutdown()

    total = sum(sizes.values())
    print("weight: " + ", ".join(f"{k} {v}" for k, v in sizes.items() if k != "other" or v)
          + f", total {total} bytes")
    print(f"perf: LCP {perf['lcp']:.0f} ms, CLS {perf['cls']:.4f}, long tasks {perf['long']:.0f} ms")
    print(f"scroll: {1 if res['scroll'] else 0}")
    for key in ("hidden", "clipped", "bare"):
        print(f"{key}: {len(res[key])}")
        for item in res[key][:8]:
            print(f"  {item}")
    print(f"tilted: {res['tilted']}")
    return 1 if res["scroll"] or res["hidden"] or res["clipped"] or res["bare"] else 0


if __name__ == "__main__":
    sys.exit(main())
