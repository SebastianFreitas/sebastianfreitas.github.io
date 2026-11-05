"""Games rows cut check in the owner's INSTALLED Firefox (headless, classic scrollbars).

  py -3 tools/workcut.py [--sizes 1112x1090,2000x1009@0.8,1440x900~1.33,...]

Loads `/` at each size (`@z` = opened at Firefox page zoom z, stored per host like
Ctrl+wheel does; `~z` = opened at 100%, then zoomed to z while open) and checks every
`.work > a.obj[data-wornquad]` row: the row's ::before polygon must sit inside its nearest overflow-clipping ancestor and inside clientWidth,
every text line (.obj-id, h3, .obj-line, .props > div) must sit inside the polygon, the
red edge line (svg line) must exist, and the page must not scroll sideways. The cut it
guards: rows reach 94% of the window, so a window wider than 1920 css px (wide screen,
or page zoom under 100%) ran them past the 1600 stage box. One line per size, exits 1 on
any fail.
"""
import argparse
import importlib.util
import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
os.environ["MOZ_REMOTE_ALLOW_SYSTEM_ACCESS"] = "1"

spec = importlib.util.spec_from_file_location("ff", ROOT / "tools" / "ffshot.py")
ff = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ff)

from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service

SIZES = "1112x1090,1440x900,1988x1250,2000x1009,2560x1300,2000x1009@0.8,1988x1250@0.67,1440x900@0.8,2000x1009~0.8,1440x900~1.33"

JS = r"""
const de=document.documentElement, cw=de.clientWidth, fails=[];
if (de.scrollWidth > cw + 1) fails.push('page scrolls sideways: scrollWidth ' + de.scrollWidth + ' > ' + cw);
const inside=(P,x,y)=>{let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const [xi,yi]=P[i],[xj,yj]=P[j];
  if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c;}return c;};
const rows=[...document.querySelectorAll('.work > a.obj[data-wornquad]')];
if (!rows.length) fails.push('no Games rows');
let worst=-1e9;
for (const el of rows) {
  const id=el.id||'row', r=el.getBoundingClientRect(), k=r.width/el.offsetWidth;
  const P=[...getComputedStyle(el,'::before').clipPath.matchAll(/(-?[\d.]+)px\s+(-?[\d.]+)px/g)]
    .map(m=>[r.left+(+m[1])*k, r.top+(+m[2])*k]);
  if (P.length<3) { fails.push(id+': no ::before polygon'); continue; }
  const xs=P.map(p=>p[0]), pl=Math.min(...xs), pr=Math.max(...xs);
  worst=Math.max(worst, pr-cw);
  if (pr > cw + 1) fails.push(id+': polygon right '+Math.round(pr)+' past clientWidth '+cw);
  if (pl < -1) fails.push(id+': polygon left '+Math.round(pl)+' past 0');
  let p=el.parentElement;
  while (p && p!==de && getComputedStyle(p).overflowX==='visible') p=p.parentElement;
  if (p && p!==de) {
    const q=p.getBoundingClientRect(), nm=p.tagName.toLowerCase()+(p.className?'.'+String(p.className).split(' ')[0]:'');
    if (q.right < pr - 1) fails.push(id+': '+nm+' clips at '+Math.round(q.right)+', polygon reaches '+Math.round(pr));
    if (q.left > pl + 1) fails.push(id+': '+nm+' clips at left '+Math.round(q.left)+', polygon starts '+Math.round(pl));
  }
  for (const t of el.querySelectorAll('.obj-id, h3, .obj-line, .props > div')) {
    const g=document.createRange(); g.selectNodeContents(t);
    for (const b of g.getClientRects()) {
      if (b.width<1||b.height<1) continue;
      const ok=[[b.left,b.top],[b.right,b.top],[b.left,b.bottom],[b.right,b.bottom]].every(([x,y])=>inside(P,x,y));
      if (!ok) { fails.push(id+': text "'+t.textContent.trim().slice(0,24)+'" outside the slab'); break; }
    }
  }
  if (!el.querySelector('svg line')) fails.push(id+': red edge line missing');
}
return {cw, rows: rows.length, margin: Math.round(-worst), fails};
"""


def set_zoom(d, z):
    with d.context(d.CONTEXT_CHROME):
        # stored like Ctrl+wheel does, so the next load opens at this zoom (`@z`); `~z` sets it
        # after load to check the rows' window-resize redraw
        d.execute_script("ZoomManager.setZoomForBrowser(gBrowser.selectedBrowser, %s);"
                         "FullZoom._applyZoomToPref(gBrowser.selectedBrowser)" % z)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sizes", default=SIZES)
    a = ap.parse_args()
    if not os.path.exists(ff.FIREFOX):
        print("firefox.exe missing: " + ff.FIREFOX)
        return 1
    opts = Options()
    opts.binary_location = ff.FIREFOX
    opts.add_argument("-headless")
    opts.set_preference("ui.useOverlayScrollbars", 0)
    opts.set_preference("widget.non-native-theme.scrollbar.style", 4)
    opts.set_preference("browser.zoom.siteSpecific", True)
    httpd, base = ff.nav.start_server()
    d = webdriver.Firefox(options=opts, service=Service())
    bad = 0
    try:
        ff.load(d, base, "/")  # the first load of a session ignores a stored zoom
        for size in a.sizes.split(","):
            dims, _, zoom = size.partition("@")
            dims, _, live = dims.partition("~")
            w, h = ff.parse_size(dims)
            set_zoom(d, 1)  # zoom sticks per host; size the window at 100%
            ff.set_viewport(d, w, h)
            set_zoom(d, zoom or 1)
            ff.load(d, base, "/")  # loaded at the zoom, as the owner's sticky per-host zoom does
            for _ in range(3):  # the stored zoom lands async: reload until the page has it
                if abs(d.execute_script("return devicePixelRatio") - float(zoom or 1)) < 0.02:
                    break
                time.sleep(0.5)
                ff.load(d, base, "/")
            time.sleep(1.5)
            ff.scroll_to(d, "#heavylight")
            if live:
                set_zoom(d, live)
                time.sleep(1.5)
            time.sleep(1)
            res = d.execute_script(JS)
            errs = d.execute_script("return window.__errs || []")
            fails = res["fails"] + ["console error: " + e for e in errs]
            head = "%-16s cw=%d rows=%d right margin=%dpx" % (size, res["cw"], res["rows"], res["margin"])
            if fails:
                bad += 1
                print("FAIL " + head)
                for f in fails[:8]:
                    print("     " + f)
            else:
                print("ok   " + head)
    finally:
        d.quit()
        httpd.shutdown()
    print("workcut: %s" % ("FAIL" if bad else "pass"))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
