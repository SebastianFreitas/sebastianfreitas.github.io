"""Whole-body sketch sheet of the four rock titans (plan rock-titans, phase 1): old-one pieces around a grown rock core.
usage: py -3 tools/titansheet.py <out_dir> [--layout <path>]
Loads the genesis scripts of index.html from genesis-state.js to genesis-oldkin.js plus the layout
(default .claude/plans/research/rock-titans-sketch/layout.js), paints a 2000x1009 sheet on #0d1114 to <out_dir>/titans.png
(rows outside 0.28-0.58 H shaded, guides at 0.628 H rail and 0.64 H feet, labels kind.m), prints per titan
height / width / gap and per piece share and top shown, and the lit/shade pixel check (42, 28 +-2; else the copy's
greys are scaled by the ratio and `D (auto)` is printed). Exit 1 on a console error, a piece outside 0.06-0.52 H, a body share under 0.55, a tentacle under 0.012 H wide,
a share under 0.5, a hidden top (D34), a titan outside 0.40-0.52 H, a gap under 0.06 H, a shear piece over 0.28 H.
A piece may carry `cut`, a polygon [[u, v], ...] in fractions (0-1) of its own unrotated ink box as drawn alone (u across,
v down); it is drawn clipped to it in its local frame (so rot and scale carry it) and every measure (ink box, h, share,
top shown, D34 range, shear cap) uses the clipped piece. Pieces without `cut` behave as before.
Pieces are drawn by GenOld.drawKind; the core by GenMatter.drawRockAt (genesis-matter.js is loaded with those two
and ROCKS added to its export, in the page only; no site file changes).
"""
import sys, re, base64, importlib.util
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("nav", ROOT / "tools" / "nav-flows.test.py")
nav = importlib.util.module_from_spec(spec); spec.loader.exec_module(nav)
from playwright.sync_api import sync_playwright

args = sys.argv[1:]
def take(flag):
    if flag in args:
        i = args.index(flag); v = args[i + 1]; del args[i:i + 2]; return v
lay = take("--layout")
if not args: print(__doc__); sys.exit(1)
out = Path(args[0]); out.mkdir(parents=True, exist_ok=True)
layout = Path(lay) if lay else ROOT / ".claude" / "plans" / "research" / "rock-titans-sketch" / "layout.js"
tags = re.findall(r'<script src="(js/[^"?]+)', (ROOT / "index.html").read_text(encoding="utf-8"))
FILES = ["js/lib/util.js", "js/lib/paint.js"] + tags[tags.index("js/genesis/genesis-state.js"):tags.index("js/genesis/genesis-oldkin.js") + 1]

JS = """
() => {
  const W = 2000, H = 1009, FOOT = 0.64, B0 = 0.28, B1 = 0.58, TH = 40, G = Gen, GO = GenOld, GM = GenMatter, L = window.TitanLayout;
  G.W = W; G.H = H;
  const FILT = "grayscale(1) brightness(0.5)", rgb = (v) => "rgb(" + v + "," + v + "," + v + ")";
  let LIT = 175, SHD = 117, auto = null;
  function mk() { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; }
  function rd(c) { return c.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, W, H).data; }
  function probe() {
    const c = document.createElement("canvas"); c.width = 40; c.height = 20;
    const g = c.getContext("2d", { willReadFrequently: true }); g.filter = FILT;
    g.fillStyle = rgb(LIT); g.fillRect(0, 0, 20, 20); g.fillStyle = rgb(SHD); g.fillRect(20, 0, 20, 20);
    return [g.getImageData(5, 5, 1, 1).data[0], g.getImageData(30, 5, 1, 1).data[0]];
  }
  let pr = probe(); const first = pr.slice();
  for (let n = 0; n < 4 && (Math.abs(pr[0] - 42) > 2 || Math.abs(pr[1] - 28) > 2); n++) {
    LIT = Math.round(LIT * 42 / Math.max(1, pr[0])); SHD = Math.round(SHD * 28 / Math.max(1, pr[1])); pr = probe(); auto = [LIT, SHD];
  }
  const tx = (t) => W / 2 + t.root * H;
  const order = (t) => t.pieces.map((p, i) => i).sort((a, b) => (t.pieces[a].z - t.pieces[b].z) || (a - b));
  const boxes0 = {};
  function inkBox(pc, base, oc, x, y, h, p) {   // the piece's unrotated ink box as drawn alone
    const key = pc.kind + "|" + pc.m + "|" + pc.dx + "|" + pc.dy;
    if (boxes0[key]) return boxes0[key];
    const c = mk(), g = c.getContext("2d"); g.filter = FILT; GO.drawKind(g, pc.kind, oc, x, y, h, p);
    const d = rd(c); let x0 = W, x1 = -1, y0 = H, y1 = -1;
    for (let k = 0; k < W * H; k++) if (d[k * 4 + 3] > TH) { const yy = (k / W) | 0, xx = k % W; if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
    return (boxes0[key] = [x0, y0, x1 - x0 + 1, y1 - y0 + 1]);
  }
  function drawPiece(g, t, pc) {
    const base = GO.ROSTER.find((o) => o.kind === pc.kind);
    const oc = Object.assign({}, base, { lit: rgb(LIT), shade: rgb(SHD), dressed: false });
    const x = tx(t) + pc.dx * H, y = (FOOT + pc.dy) * H, h = pc.m * base.hf * H;
    const p = { x: x, y: y, rimX: x, rimY: y, phase: 0, scale: 1, sy: 1, rot: 0, a: 1, e: 1, look: 0, gest: 0, kneel: 0, make: 0, clipY: null, pinU: -1, steps: 0, length: 0 };
    g.save(); g.filter = FILT;
    g.translate(x, y); g.rotate(pc.rot || 0); g.translate(-x, -y);
    if (pc.cut) {
      const bb = inkBox(pc, base, oc, x, y, h, p);
      g.beginPath(); pc.cut.forEach((q, i) => { const px = bb[0] + q[0] * bb[2], py = bb[1] + q[1] * bb[3]; i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath(); g.clip();
    }
    GO.drawKind(g, pc.kind, oc, x, y, h, p);
    g.restore();
    return { x: x, y: y, h: h, hf: base.hf };
  }
  function drawFiller(g, t, f) {
    const pts = f.poly.map((q) => [tx(t) + q[0] * H, (FOOT + q[1]) * H]);
    const cx = pts.reduce((s, q) => s + q[0], 0) / pts.length;
    Paint.litShade(g, () => { g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); }, cx, "#101010", "#0e0e0e");
  }
  function drawBodyRocks(g, t, front) {
    g.save(); g.filter = "brightness(0.5)";
    t.body.rocks.forEach((r) => { if (!!r.front === front) GM.drawRockAt(g, GM.ROCKS[r.rock], tx(t) + r.x * H, (FOOT + r.dy) * H, r.rot || 0, r.size * H, r.sx, r.sy); });
    g.restore();
  }
  function drawTentacle(g, t, q) {   // tapered limb hanging from (x, dy), S bend by curl, one lit edge (left), flat shade right
    const x0 = tx(t) + q.x * H, y0 = (FOOT + q.dy) * H, L = q.len * H, w = q.w * H, N = 14, lft = [], rgt = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, cx = x0 + Math.sin(u * Math.PI * 2) * q.curl * H * 0.5 * u, cy = y0 + u * L, hw = w * 0.5 * (1 - u) + 1;
      lft.push([cx - hw, cy]); rgt.push([cx + hw, cy]);
    }
    const poly = lft.concat(rgt.reverse());
    g.save(); g.filter = "brightness(0.5)";
    Paint.litShade(g, () => { g.beginPath(); poly.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); }, x0 - w * 0.2, "#2a2a2a", "#1c1c1c");
    g.restore();
  }
  function drawTitan(g, t, only) {
    t.filler.forEach((f) => drawFiller(g, t, f));
    if (t.body) {
      drawBodyRocks(g, t, false);
      if (t.body.mode === "floating") (t.body.tentacles || []).forEach((q) => drawTentacle(g, t, q));
    } else {
      g.save(); g.filter = "brightness(0.15)";
      GM.drawRockAt(g, GM.ROCKS[t.rock], tx(t), (FOOT + t.core.dy) * H, t.core.rot, t.core.size * H);
      g.restore();
    }
    order(t).forEach((i) => { if (only == null || only === i) {
      const pc = mk(); drawPiece(pc.getContext("2d"), t, t.pieces[i]);
      g.drawImage(pc, 0, 0);
    } });
    if (t.body && only == null) drawBodyRocks(g, t, true);
  }
  const res = { first: first, auto: auto, titans: [], png: null };
  const sheet = mk(), sg = sheet.getContext("2d");
  sg.fillStyle = "#0d1114"; sg.fillRect(0, 0, W, H);
  const boxes = [];
  L.titans.forEach((t, ti) => {
    const tc = mk(); drawTitan(tc.getContext("2d"), t);
    sg.drawImage(tc, 0, 0);
    const d = rd(tc); let x0 = W, x1 = -1, y0 = H;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > TH) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; }
    boxes.push([x0, x1]);
    let fmask = null;   // pixels of front body rocks: they cover every piece
    if (t.body && t.body.rocks.some((q) => q.front)) { const fc = mk(); drawBodyRocks(fc.getContext("2d"), t, true); const fd = rd(fc); fmask = new Uint8Array(W * H); for (let k = 0; k < W * H; k++) if (fd[k * 4 + 3] > TH) fmask[k] = 1; }
    const r = { mode: t.body ? t.body.mode : "core", bodyRocks: t.body ? t.body.rocks.length : 0, family: t.family, height: (FOOT * H - y0) / H, declared: t.height, width: (x1 - x0 + 1) / H, x0: x0 / H, x1: (x1 + 1) / H, pieces: [] };
    const ord = order(t), masks = [];
    t.pieces.forEach((pc, i) => { const c = mk(); const g = c.getContext("2d"); const m = drawPiece(g, t, pc); const dd = rd(c); const mask = new Uint8Array(W * H); let n = 0, top = H, bx0 = W, bx1 = -1, by1 = 0;
      for (let k = 0; k < W * H; k++) if (dd[k * 4 + 3] > TH) { mask[k] = 1; n++; const y = (k / W) | 0, x = k % W; if (y < top) top = y; if (y > by1) by1 = y; if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; }
      masks[i] = { mask: mask, n: n, top: top, m: m, cx: (bx0 + bx1) / 2, cy: (top + by1) / 2, bw: (bx1 - bx0 + 1) / H, bh: (by1 - top + 1) / H, bx0: bx0 }; });
    { let ink = 0, pv = 0; for (let k = 0; k < W * H; k++) if (d[k * 4 + 3] > TH) { ink++; if (!(fmask && fmask[k]) && masks.some((q) => q.mask[k])) pv++; }
      r.bodyShare = ink ? 1 - pv / ink : 0; r.tentW = t.body && t.body.tentacles ? Math.min.apply(null, t.body.tentacles.map((q) => q.w)) : 1; }
    t.pieces.forEach((pc, i) => {
      const me = masks[i], nearer = ord.slice(ord.indexOf(i) + 1).map((j) => masks[j].mask);
      const cov = (k) => { if (fmask && fmask[k]) return true; for (let q = 0; q < nearer.length; q++) if (nearer[q][k]) return true; return false; };
      let vis = 0, topShown = false, sx = 0, sy = 0;
      for (let y = Math.ceil(B0 * H); y < Math.floor(B1 * H); y++) for (let x = 0; x < W; x++) { const k = y * W + x; if (me.mask[k] && !cov(k)) { vis++; sx += x; sy += y; } }
      let ax = me.cx, ay = me.cy, bd = 1e18;   // leader end: the visible pixel nearest the visible mean
      if (vis) for (let y = Math.ceil(B0 * H); y < Math.floor(B1 * H); y++) for (let x = 0; x < W; x++) { const k = y * W + x; if (me.mask[k] && !cov(k)) { const d2 = (x - sx / vis) ** 2 + (y - sy / vis) ** 2; if (d2 < bd) { bd = d2; ax = x; ay = y; } } }
      for (let y = me.top; y < me.top + 4 && !topShown; y++) for (let x = 0; x < W; x++) { const k = y * W + x; if (me.mask[k] && !cov(k)) { topShown = true; break; } }
      r.pieces.push({ kind: pc.kind, m: pc.m, h: pc.cut ? me.bh : pc.m * me.m.hf, share: me.n ? vis / me.n : 0, top: me.top / H, topShown: topShown && me.top >= Math.floor(B0 * H) - 1, bw: me.bw, bh: me.bh, cx: me.cx, cy: me.cy, ax: ax, ay: ay, x: me.m.x, y: me.m.y });
    });
    res.titans.push(r);
  });
  // shaded rows, guides, labels
  sg.fillStyle = "rgba(0,0,0,0.5)"; sg.fillRect(0, 0, W, B0 * H); sg.fillRect(0, B1 * H, W, H - B1 * H);
  sg.font = "13px sans-serif"; sg.textAlign = "left";
  [[B0, "#2c3a44", "0.28 H ceiling", [2, 6]], [B1, "#2c3a44", "0.58 H slab", [2, 6]], [0.628, "#5d7b8c", "0.628 H rail", [8, 4]], [FOOT, "#9a7a4a", "0.64 H feet", [8, 4]]].forEach((q) => {
    sg.strokeStyle = q[1]; sg.setLineDash(q[3]); sg.lineWidth = 1; sg.beginPath(); sg.moveTo(0, q[0] * H + 0.5); sg.lineTo(W, q[0] * H + 0.5); sg.stroke();
    sg.setLineDash([]); sg.fillStyle = q[1]; sg.fillText(q[2], 6, q[0] * H - 4);
  });
  L.titans.forEach((t, ti) => {
    sg.strokeStyle = "#9a7a4a"; sg.beginPath(); sg.moveTo(tx(t) + 0.5, FOOT * H - 8); sg.lineTo(tx(t) + 0.5, FOOT * H + 8); sg.stroke();
    sg.fillStyle = "#c8d2d8"; sg.font = "15px sans-serif"; sg.textAlign = "center"; sg.fillText((ti + 1) + " " + t.family, tx(t), 0.03 * H);
    sg.font = "13px sans-serif"; sg.textAlign = "left";
    const ps = res.titans[ti].pieces.map((p, i) => i).sort((a, b) => res.titans[ti].pieces[a].ax - res.titans[ti].pieces[b].ax);
    ps.forEach((i, r) => {
      const p = res.titans[ti].pieces[i], lx = tx(t) - 0.17 * H + r * 0.07 * H, ly = 0.69 * H + (r % 2) * 18;
      sg.strokeStyle = "#3a454d"; sg.beginPath(); sg.moveTo(lx + 20, ly - 12); sg.lineTo(p.ax, p.ay); sg.stroke();
      sg.fillStyle = "#9aa6ad"; sg.fillText(p.kind + "\\u00b7" + p.m, lx, ly);
    });
  });
  res.shears = (L.shears || []).map((r) => [res.titans[r[0]].pieces[r[1]].h, res.titans[r[2]].pieces[r[3]].h]);
  res.png = sheet.toDataURL("image/png");
  return res;
}
"""

errors = []
httpd, base = nav.start_server()
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); page = b.new_page(viewport={"width": 1440, "height": 900})
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type == "error" else None)
        page.goto(f"{base}/404.html"); page.wait_for_load_state("load"); errors.clear()
        for f in FILES:
            if f.endswith("genesis-matter.js"):
                src = (ROOT / f).read_text(encoding="utf-8")
                src = src.replace("window.GenMatter = { draw,", "window.GenMatter = { drawRockAt, ROCKS, draw,", 1)
                src = src.replace("function drawRockAt(ctx, k, x, y, rot, s) {", "function drawRockAt(ctx, k, x, y, rot, s, sx, sy) {", 1)
                src = src.replace("    ctx.rotate(rot);\n    ctx.beginPath();\n    for (let j = 0; j < v.length", "    ctx.rotate(rot);\n    ctx.scale(sx || 1, sy || 1);\n    ctx.beginPath();\n    for (let j = 0; j < v.length", 1)
                page.add_script_tag(content=src)
            else:
                page.add_script_tag(url=f"{base}/{f}")
            page.wait_for_timeout(50)
            if errors: print(f"FAIL loading {f}:"); [print("  ", e) for e in errors]; b.close(); sys.exit(1)
        page.add_script_tag(content=layout.read_text(encoding="utf-8"))
        page.wait_for_timeout(50)
        if errors: print("FAIL loading layout:"); [print("  ", e) for e in errors]; b.close(); sys.exit(1)
        r = page.evaluate(JS)
        page.wait_for_timeout(50)
        b.close()
finally:
    httpd.shutdown()

png = out / "titans.png"
png.write_bytes(base64.b64decode(r["png"].split(",", 1)[1])); print("wrote", png)
fails = []
print(f"lit/shade pixels through the filter: {r['first'][0]}, {r['first'][1]} (want 42, 28 +-2)")
if r["auto"]: print(f"D (auto): copy greys scaled to lit {r['auto'][0]}, shade {r['auto'][1]}")
ts = r["titans"]
for i, t in enumerate(ts):
    gap = ts[i + 1]["x0"] - t["x1"] if i + 1 < len(ts) else None
    print(f"titan {i + 1} {t['family']}: height {t['height']:.3f} H (declared {t['declared']}), width {t['width']:.3f} H, gap east " + (f"{gap:.3f} H" if gap is not None else "-") + f", body {t['mode']} ({t['bodyRocks']} rocks), body share {t['bodyShare']:.2f}")
    if t["bodyShare"] < 0.55: fails.append(f"titan {i + 1} body share {t['bodyShare']:.2f} under 0.55")
    if t["tentW"] < 0.012: fails.append(f"titan {i + 1} tentacle root width {t['tentW']:.3f} under 0.012")
    if not 0.40 <= t["height"] <= 0.52: fails.append(f"titan {i + 1} height {t['height']:.3f} outside 0.40-0.52")
    if t["width"] > 0.32 + 1e-6: print(f"  note: rest width {t['width']:.3f} over 0.32 H"); fails.append(f"titan {i + 1} width {t['width']:.3f} over 0.32")
    if gap is not None and gap < 0.06: fails.append(f"titan {i + 1} gap {gap:.3f} under 0.06")
    for j, pc in enumerate(t["pieces"]):
        print(f"  {pc['kind']}.{pc['m']}: h {pc['h']:.3f} H, share {pc['share']:.2f}, top {pc['top']:.3f} H {'shown' if pc['topShown'] else 'HIDDEN'}, ink {pc['bw']:.3f} x {pc['bh']:.3f} H spanning {pc['top']:.3f}-{pc['top'] + pc['bh']:.3f} H, centre x {(pc['cx'] - 1000) / 1009:+.3f} H from the sheet centre")
        nm = f"titan {i + 1} {pc['kind']}"
        if not 0.06 - 1e-6 <= pc["h"] <= 0.52 + 1e-6: fails.append(f"{nm} height {pc['h']:.3f} outside 0.06-0.52")
        if pc["share"] < 0.5: fails.append(f"{nm} share {pc['share']:.2f} under 0.5")
        if not pc["topShown"]: fails.append(f"{nm} top hidden or above 0.28 H")
for c, hs in enumerate(r["shears"]):   # L.shears rows: [pusher titan, its piece, struck titan, its piece] per crash
    print(f"crash {c + 1} shear pieces: {hs[0]:.3f} H, {hs[1]:.3f} H")
    if max(hs) > 0.28 + 1e-6: fails.append(f"crash {c + 1} shear piece over 0.28 H")
if errors: print("FAIL console errors:"); [print("  ", e) for e in errors]; fails.append("console errors")
sys.exit(0 if not fails else (print("FAIL:"), [print("  ", f) for f in fails], 1)[-1])
