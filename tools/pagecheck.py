"""Page checker, the Lighthouse stand-in (no node on this machine).

    py -3 tools/pagecheck.py <page> [--phone] [--reduced-motion]

page is index.html or index.html#sector-zero (any case name). Prints one line
each for weight, perf, scroll, hidden, clipped, bare and tilted, and up to 8
offending elements under hidden, clipped and bare. Exit 1 on scroll, hidden,
clipped or bare above 0. Real clock, no screenshots, nothing written.
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

CHECKS = """(isCase) => {
  const vw = innerWidth;
  const label = el => el.tagName.toLowerCase()
    + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).join('.') : '')
    + ' "' + (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 40) + '"';
  const shown = el => {
    const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
  };
  const out = { scroll: document.documentElement.scrollWidth > vw, hidden: [], clipped: [], bare: [], tilted: 0 };

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
      if (el.closest('.slab, .case, .folder-body') || !shown(el)) return;
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
    if name != "index.html":
        print("page must be index.html or index.html#<case>")
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

            page.goto(f"{base}/#{frag}" if frag else f"{base}/")
            if frag:
                page.wait_for_selector(f"#{frag}.open")
            page.wait_for_load_state("load")
            page.wait_for_timeout(1500)
            if not frag and page.query_selector("#gate-world"):
                try:
                    page.wait_for_selector("#gate-panel.on", timeout=10000)
                    page.click("#gate-world")
                    page.wait_for_timeout(2500)
                except Exception:
                    pass
            perf = page.evaluate("window.__pc")
            res = page.evaluate(CHECKS, bool(frag))
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
