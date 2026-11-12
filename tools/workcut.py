"""Games rows cut check in the owner's INSTALLED Firefox (headless, classic scrollbars).

  py -3 tools/workcut.py [--sizes 1112x1090,2000x1009@0.8,1440x900~1.33,...]

Loads `/` at each size (`@z` = opened at Firefox page zoom z, stored per host like
Ctrl+wheel does; `~z` = opened at 100%, then zoomed to z while open) and checks every
`.work > a.obj[data-wornquad]` row: the row's ::before polygon must sit inside its nearest overflow-clipping ancestor and inside clientWidth,
every text line (.obj-id, h3, .obj-line, .props > div) must sit inside the polygon, the
page must not scroll sideways. The cut it
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
from selenium.webdriver import ActionChains
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service

SIZES = "1112x1090,1440x900,1988x1250,2000x1009,2560x1300,2000x1009@0.8,1988x1250@0.67,1440x900@0.8,2000x1009~0.8,1440x900~1.33,390x844"

HELP = r"""
const de=document.documentElement, cw=de.clientWidth, fails=[], out=[];
const inside=(P,x,y)=>{let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const [xi,yi]=P[i],[xj,yj]=P[j];
  if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c;}return c;};
const rows=[...document.querySelectorAll('.work > a.obj[data-wornquad]')];
const polyOf=el=>{const r=el.getBoundingClientRect(), k=r.width/el.offsetWidth;
  return [...getComputedStyle(el,'::before').clipPath.matchAll(/(-?[\d.]+)px\s+(-?[\d.]+)px/g)].map(m=>[r.left+(+m[1])*k, r.top+(+m[2])*k]);};
/* a text element's text (or, with box, its border box) as quads in window px, with its own transform applied: rotated lines are not their axis-aligned bounding boxes */
const quadsOf=(t,box)=>{
  const cs=getComputedStyle(t), M=cs.transform==='none'?new DOMMatrix():new DOMMatrix(cs.transform), og=cs.transformOrigin.split(' ').map(parseFloat);
  const keep=[t.style.transform,t.style.transition]; t.style.transition='none'; t.style.transform='none';
  const bb=t.getBoundingClientRect(), ox=bb.left+og[0], oy=bb.top+og[1];
  let rs=[]; if (box) rs=[bb]; else { const w=document.createTreeWalker(t,NodeFilter.SHOW_TEXT); for (let n; (n=w.nextNode());) { if (!n.textContent.trim()) continue; const g=document.createRange(); g.selectNodeContents(n); rs.push(...g.getClientRects()); } }
  rs=rs.filter(q=>q.width>=1&&q.height>=1);
  t.style.transform=keep[0]; t.getBoundingClientRect(); t.style.transition=keep[1];
  return rs.map(q=>[[q.left,q.top],[q.right,q.top],[q.right,q.bottom],[q.left,q.bottom]].map(([x,y])=>[ox+M.a*(x-ox)+M.c*(y-oy)+M.e, oy+M.b*(x-ox)+M.d*(y-oy)+M.f]));};
const rectsOf=t=>quadsOf(t,false);
const corners=q=>q;
const hit=(A,B)=>{for(const Q of [A,B])for(let i=0;i<4;i++){const p=Q[i],n=Q[(i+1)%4],ax=p[1]-n[1],ay=n[0]-p[0];
  const pr=R=>R.map(([x,y])=>x*ax+y*ay), a=pr(A), b=pr(B), l=Math.hypot(ax,ay);
  if (Math.min(...a)>=Math.max(...b)-0.5*l || Math.min(...b)>=Math.max(...a)-0.5*l) return false;} return true;};
const overlapIn=g=>{const ks=Object.keys(g);for(let i=0;i<ks.length;i++)for(let j=i+1;j<ks.length;j++)if(g[ks[i]].some(a=>g[ks[j]].some(b=>hit(a,b))))return ks[i]+' and '+ks[j];return '';};
/* one row, rest (hover false) or hovered (true): the detail line, title, hook and facts (visible text) inside the plate and not touching each other, the hook 40 px off the picture seam, the facts one line, nothing cut off; the .obj-line detail line has a box but is invisible at rest, shown on hover, level, left-aligned with the hook, between hook and facts; the ghost is invisible and out of flow, the row at least --wk-mh; on a mouse the tag is hidden at rest and, hovered, straddles the bottom edge clear of the next row's text. Returns the title/hook/facts boxes (row px) for the no-move check */
const vis=e=>{const cs=getComputedStyle(e);return cs.display!=='none'&&cs.visibility!=='hidden'&&+cs.opacity>0;};
const checkRow=(el,hover,fails)=>{
  const id=el.id||'row', tag=id+(hover?' hover':' rest')+': ', r=el.getBoundingClientRect(), k=r.width/el.offsetWidth, P=polyOf(el);
  const det=el.querySelector(':scope > .obj-det');
  if (!(det && getComputedStyle(det).position==='absolute')) {   /* phone or touch layout: the tag is visible and inside the slab, the text is inside the slab, the facts are not clipped */
    if (hover) return null;
    const go=el.querySelector(':scope > .obj-go'), pr=el.querySelector(':scope > .props'); let n=0;
    if (go) { n+=2; const b=go.getBoundingClientRect();
      if (![[b.left,b.top],[b.right,b.top],[b.left,b.bottom],[b.right,b.bottom]].every(([x,y])=>inside(P,x,y))) fails.push(tag+'tag outside the slab');
      if (!vis(go)) fails.push(tag+'tag is not visible on a phone'); }
    const pl=el.querySelector(':scope > .obj-line'), phk=el.querySelector(':scope > .obj-hook');
    if (!pl) fails.push(tag+'no .obj-line detail line on a phone');
    else { n+=3; const lcs=getComputedStyle(pl);
      if (!vis(pl)) fails.push(tag+'detail line is not visible on a phone');
      if (lcs.whiteSpace==='nowrap' || (lcs.overflowY!=='visible' && pl.scrollHeight>pl.clientHeight+3) || (lcs.overflowX!=='visible' && pl.scrollWidth>pl.clientWidth+3)) fails.push(tag+'detail line is cut off or not wrapped on a phone ('+pl.scrollWidth+'x'+pl.scrollHeight+' in '+pl.clientWidth+'x'+pl.clientHeight+')');
      const lb=pl.getBoundingClientRect();
      for (const [nm,o] of [['hook',phk],['facts',pr]]) if (o) { const ob=o.getBoundingClientRect(); if (ob.width && lb.left<ob.right-0.5 && lb.right>ob.left+0.5 && lb.top<ob.bottom-0.5 && lb.bottom>ob.top+0.5) fails.push(tag+'detail line overlaps the '+nm+' on a phone'); } }
    for (const e of el.querySelectorAll(':scope > .obj-id, :scope > .obj-det, :scope > h3, :scope > .obj-hook, :scope > .obj-line, :scope > .props > div')) { if (!e.offsetWidth) continue; n++;
      const g=document.createRange(); g.selectNodeContents(e);
      for (const t of g.getClientRects()) if (t.width && ![[t.left,t.top],[t.right,t.top],[t.left,t.bottom],[t.right,t.bottom]].every(([x,y])=>inside(P,x,y))) { fails.push(tag+'text outside the slab: '+e.textContent.trim().slice(0,30)); break; } }
    if (pr) { n++; const cs=getComputedStyle(pr); if (cs.whiteSpace==='nowrap' || (cs.overflowX!=='visible' && pr.scrollWidth>pr.clientWidth+2)) fails.push(tag+'facts text is clipped on a phone ('+pr.scrollWidth+' in '+pr.clientWidth+')');
      for (const d of pr.children) { if (!d.offsetWidth) fails.push(tag+'a fact is hidden on a phone: '+d.textContent.trim()); } }
    window.__phoneChecks=(window.__phoneChecks||0)+n;
    return null;
  }
  const h3=el.querySelector(':scope > h3'), hk=el.querySelector(':scope > .obj-hook'), pr=el.querySelector(':scope > .props'), ln=el.querySelector(':scope > .obj-line'), go=el.querySelector(':scope > .obj-go');
  if (!ln) { fails.push(tag+'no .obj-line detail line'); return null; }
  const grp={details:quadsOf(det,true), title:quadsOf(h3,true), hook:rectsOf(hk), line:rectsOf(ln), facts:rectsOf(pr)};   /* boxes for the display-font lines (their glyph rects are taller than the line), the facts by their visible text */
  { const lcs=getComputedStyle(ln), hb=hk.getBoundingClientRect(), lb=ln.getBoundingClientRect();
    if (!lb.width || !lb.height) fails.push(tag+'detail line has no layout box (space not reserved)');
    if (hover) { if (!(lcs.display!=='none'&&lcs.visibility!=='hidden'&&+lcs.opacity>0.95)) fails.push(tag+'detail line is not shown on hover (opacity '+lcs.opacity+')'); }
    else if (lcs.visibility!=='hidden' && +lcs.opacity>0) fails.push(tag+'detail line is visible at rest (opacity '+lcs.opacity+')');
    if (lcs.transform!=='none') { const m=new DOMMatrix(lcs.transform); if (Math.abs(m.b)>0.001||Math.abs(m.c)>0.001) fails.push(tag+'detail line is rotated ('+lcs.transform+')'); }
    if (Math.abs(lb.left-hb.left)>1) fails.push(tag+'detail line left edge '+Math.round(lb.left)+' is not the hook\'s '+Math.round(hb.left));
    if (grp.line.length && grp.hook.length && grp.facts.length) {
      const top=q=>Math.min(...q.flat().map(p=>p[1])), bot=q=>Math.max(...q.flat().map(p=>p[1]));
      if (top(grp.line)<Math.max(...grp.hook.map(bot))-0.5) fails.push(tag+'detail line is not below the hook');
      if (bot(grp.line)>Math.min(...grp.facts.map(top))+0.5) fails.push(tag+'detail line is not above the facts');
    } }
  const gh=el.querySelector(':scope > .obj-ghost');
  if (!gh) fails.push(tag+'no .obj-ghost'); else { const gcs=getComputedStyle(gh); if (gcs.visibility!=='hidden' || gcs.position!=='absolute') fails.push(tag+'ghost is not invisible and out of flow'); }
  { const mh=parseFloat(el.style.getPropertyValue('--wk-mh')); if (!isNaN(mh) && el.offsetHeight<mh-0.5) fails.push(tag+'row height '+el.offsetHeight+' is under --wk-mh '+mh); }
  for (const nm in grp) {
    if (!grp[nm].length) fails.push(tag+nm+' has no visible text');
    if (grp[nm].some(b=>!b.every(([x,y])=>inside(P,x,y)))) fails.push(tag+nm+' outside the plate');
    if (rows.some(o=>o!==el && grp[nm].some(b=>b.some(([x,y])=>inside(polyOf(o),x,y))))) fails.push(tag+nm+' over a neighbour row');
  }
  const m=overlapIn(grp); if (m) fails.push(tag+m+' overlap');
  const ft=[...pr.children].filter(d=>d.offsetWidth).map(d=>d.offsetTop); if (ft.length && Math.max(...ft)-Math.min(...ft)>3) fails.push(tag+'facts are not one line');
  for (const [nm,e] of [['details',det],['title',h3],['hook',hk],['detail line',ln],['facts',pr]]) { const cs=getComputedStyle(e); if ((cs.overflowX!=='visible' && e.scrollWidth>e.clientWidth+3) || (cs.overflowY!=='visible' && e.scrollHeight>e.clientHeight+3)) fails.push(tag+nm+' is cut off ('+e.scrollWidth+'x'+e.scrollHeight+' in '+e.clientWidth+'x'+e.clientHeight+')'); }
  const seam=parseFloat(el.style.getPropertyValue('--wk-seam'));
  if (!isNaN(seam)) {
    const flip=el.classList.contains('is-flip');
    for (const nm of ['hook','line']) {
      const xs=grp[nm].flatMap(q=>q.map(p=>(p[0]-r.left)/k));
      const clear=flip ? Math.min(...xs)-seam : seam-Math.max(...xs);
      if (clear < 39.5) fails.push(tag+(nm==='line'?'detail line':nm)+' '+(flip?'left':'right')+' edge is only '+Math.round(clear)+'px clear of the picture seam '+Math.round(seam)+' (need 40)');
    }
  }
  const info=[];
  { const pb=pr.getBoundingClientRect(), kids=[...pr.children], shown=kids.filter(d=>d.offsetWidth);
    for (const d of shown) { const g=document.createRange(); g.selectNodeContents(d); for (const t of g.getClientRects()) if (t.width && (t.left<pb.left-0.5 || t.right>pb.right+0.5)) fails.push(tag+'facts text is clipped: '+d.textContent.trim()+' spans '+Math.round(t.left)+'..'+Math.round(t.right)+' in box '+Math.round(pb.left)+'..'+Math.round(pb.right)); }
    if (shown.length<kids.length) info.push(id+' dropped '+(kids.length-shown.length)+' fact(s): '+kids.filter(d=>!d.offsetWidth).map(d=>d.textContent.trim()).join(', ')); }
  if (go && getComputedStyle(go).position==='absolute') {
    if (!hover) { if (vis(go)) fails.push(tag+'tag is visible at rest on a mouse'); }
    else {
      if (!vis(go)) fails.push(tag+'tag is not visible');
      const b=go.getBoundingClientRect(), q=quadsOf(go,true)[0], cx=(b.left+b.right)/2;
      let ey=-1e9;
      for (let j=0;j<P.length;j++) { const a=P[j], c=P[(j+1)%P.length]; if ((a[0]-cx)*(c[0]-cx)<=0 && a[0]!==c[0]) ey=Math.max(ey, a[1]+(c[1]-a[1])*(cx-a[0])/(c[0]-a[0])); }
      if (!(b.top < ey-2*k && b.bottom > ey+2*k)) fails.push(tag+'tag does not straddle the bottom edge (tag '+Math.round(b.top)+'..'+Math.round(b.bottom)+', edge '+Math.round(ey)+')');
      if (b.left < 0 || b.right > cw) fails.push(tag+'tag outside the window');
      for (const nm in grp) if (grp[nm].some(a=>hit(a,q))) fails.push(tag+'tag touches the '+nm);
      const nx=rows[rows.indexOf(el)+1];
      if (nx) for (const t of nx.querySelectorAll(':scope > .obj-det, :scope > h3, :scope > .obj-hook, :scope > .props')) {
        const o=t.getBoundingClientRect();
        if (o.width && b.left<o.right && b.right>o.left && b.top<o.bottom && b.bottom>o.top) fails.push(tag+'tag touches the next row ('+t.tagName.toLowerCase()+')');
      }
      info.push(id+' row '+el.offsetHeight+'px, tag '+Math.round(b.top-ey)+'..'+Math.round(b.bottom-ey)+' vs edge');
    }
  } else if (go && !hover) {
    const b=go.getBoundingClientRect();
    if (![[b.left,b.top],[b.right,b.top],[b.left,b.bottom],[b.right,b.bottom]].every(([x,y])=>inside(P,x,y))) fails.push(tag+'tag outside the slab');
    if (!vis(go)) fails.push(tag+'tag is not visible on a phone');
  }
  const bx=e=>{const q=e.getBoundingClientRect();return [(q.left-r.left)/k,(q.top-r.top)/k,q.width/k,q.height/k];};
  const lh=parseFloat(getComputedStyle(ln).lineHeight)||1;
  return {boxes:{title:bx(h3),hook:bx(hk),line:[...bx(ln),Math.round(ln.clientHeight/lh)],facts:bx(pr),row:[0,0,el.offsetWidth,el.offsetHeight]}, info};
};
"""

JS = HELP + r"""
if (de.scrollWidth > cw + 1) fails.push('page scrolls sideways: scrollWidth ' + de.scrollWidth + ' > ' + cw);
if (!rows.length) fails.push('no Games rows');
let worst=-1e9; const boxes=[];
for (const el of rows) {
  const id=el.id||'row', r=el.getBoundingClientRect(), k=r.width/el.offsetWidth;
  const P=polyOf(el);
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
  const rr=checkRow(el,false,fails);
  boxes.push(rr?rr.boxes:null);
}
return {cw, rows: rows.length, margin: Math.round(-worst), boxes, fails, phone: window.__phoneChecks||0};
"""

# one row in its hover state (.is-peek added by the caller): the same checks as at rest plus the tag
# shown across the bottom edge; returns the boxes for the no-move comparison
JS_HOVER = HELP + r"""
const rr=checkRow(rows[arguments[0]],true,fails);
return {fails, boxes: rr&&rr.boxes, info: rr?rr.info:[]};
"""

# a viewport point that is on no Games row and no top bar tab (null if none found)
JS_PARK = r"""
const bad=e=>e.closest('a.obj, nav, header, [role=tab], .tabs');
for (let y=Math.round(innerHeight/2); y<innerHeight; y+=20)
  for (let x=innerWidth-4; x>0; x-=Math.max(20, Math.round(innerWidth/30)))
    if (!document.elementsFromPoint(x,y).some(bad)) return [x,y];
return null;
"""

# each row's tag x in row px (--wk-gx), to compare a first load with after a hover cycle
JS_TAGX = r"""
return Array.from(document.querySelectorAll('.work > a.obj[data-wornquad]')).map(e=>parseFloat(e.style.getPropertyValue('--wk-gx')));
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
            # the zoom can slide a row under the headless pointer (is-peek); park the pointer off every row and tab first
            pt = d.execute_script(JS_PARK)
            if pt:
                ac = ActionChains(d)
                ac.w3c_actions.pointer_action.move_to_location(pt[0], pt[1])
                ac.w3c_actions.perform()
            for _ in range(10):
                if not d.execute_script("return document.querySelectorAll('.work > a.obj.is-peek').length"):
                    break
                time.sleep(0.2)
            time.sleep(0.5)
            peek = d.execute_script("return document.querySelectorAll('.work > a.obj.is-peek').length")
            res = d.execute_script(JS)
            if peek:
                res["fails"] = ["rest check: %d row(s) still carry is-peek (pointer at %s), so the rest measurement is of a hovered row and its text checks are skipped" % (peek, pt)]
            errs = d.execute_script("return window.__errs || []")
            hov = []
            tags = []
            tag0 = d.execute_script(JS_TAGX)
            for i in range(res["rows"]):  # each row in turn takes the class the hover handler sets
                d.execute_script("document.querySelectorAll('.work > a.obj[data-wornquad]')[arguments[0]].classList.add('is-peek')", i)
                time.sleep(0.5)
                hr = d.execute_script(JS_HOVER, i)
                hov += hr["fails"]
                tags += hr["info"]
                b0 = res["boxes"][i]
                if b0 and hr["boxes"]:  # no move: rest and hover boxes agree to 0.5 px
                    for nm in b0:
                        if max(abs(x - y) for x, y in zip(b0[nm], hr["boxes"][nm])) > 0.5:
                            hov.append("row %d: %s box moved or resized on hover: %s -> %s" % (i, nm, [round(x, 1) for x in b0[nm]], [round(x, 1) for x in hr["boxes"][nm]]))
                d.execute_script("document.querySelectorAll('.work > a.obj[data-wornquad]')[arguments[0]].classList.remove('is-peek')", i)
            time.sleep(0.5)
            for i, (t0, t1) in enumerate(zip(tag0, d.execute_script(JS_TAGX))):
                if t0 is not None and t1 is not None and abs(t0 - t1) > 1:  # NaN (no tag x on this row) compares false
                    hov.append("row %d: tag x moved %.1f -> %.1f after a hover cycle" % (i, t0, t1))
            fails = res["fails"] + hov +["console error: " + e for e in errs]
            head = "%-16s cw=%d rows=%d right margin=%dpx phone checks=%d" % (size, res["cw"], res["rows"], res["margin"], res["phone"])
            if fails:
                bad += 1
                print("FAIL " + head)
                for f in fails[:30]:
                    print("     " + f)
            else:
                print("ok   " + head)
            if size == "2000x1009":
                for t in tags:
                    print("     " + t)
    finally:
        d.quit()
        httpd.shutdown()
    print("workcut: %s" % ("FAIL" if bad else "pass"))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
