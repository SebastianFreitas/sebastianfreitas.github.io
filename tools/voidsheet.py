"""Sketch sheet of the void forms (js/genesis/genesis-voidforms.js).
usage: py -3 tools/voidsheet.py <out_dir> [--webm] [--joints <json>] [--ref <json>] [--table <json>]  (--table swaps void Rex's design table before drawing and prints whether it equals the baked one; --webm also records <out_dir>/obrok-change.webm: 1 s at chaos 0, 3 s change, 1 s form 1)
Also writes obrok-void-x8.png and a row 5 (the change at chaos 0..1); prints the red pixel count at chaos 0 and the chaos-1 channel diff.
Writes <out_dir>/voidforms.png on the genesis backdrop (#0d1114): row 1 womb Rex | void Rex mid-shed | void Rex clean | womb Obrokxus | void Obrokxus
(one shared scale, each Obrokxus also as a labelled 4x inset); row 2 void Rex in reach, crawl, lowCurl, dead; row 3 a 16:9 frame mock
(void Rex cropped by the bottom edge, void Obrokxus tiny, fleeing left), row 4 womb and void Obrokxus at 10x. Also <out_dir>/voidposes.png: void Rex clean in all 19 poses. Prints the void Rex polygon count and, per pose, the room the lifted Rex has in its sheet cell; --ref checks rexVoidPolys against a reference json (REF ok 19/19). Exit 1 on a console error.
"""
import sys, base64, importlib.util
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("nav", ROOT / "tools" / "nav-flows.test.py")
nav = importlib.util.module_from_spec(spec); spec.loader.exec_module(nav)
from playwright.sync_api import sync_playwright

if len(sys.argv) < 2: print(__doc__); sys.exit(1)
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
FILES = ["js/lib/util.js", "js/lib/paint.js", "js/genesis/genesis-titanfight.js", "js/genesis/genesis-state.js", "js/genesis/genesis-paint.js", "js/genesis/genesis-duo.js", "js/genesis/genesis-voidforms.js"]

JS = """
() => {
  const D = GenDuo, V = GenVoidForms, CW = 330, W = CW * 6, R3 = 470, R4 = 720, R5 = 1440, W5 = 990;
  const H = 280, f = { face: -1, head: true }, h2 = 140, PAD = 45, LBL = 26, CLR = 70; // LBL: label text bottom below the row top; CLR: wanted clear below it (spec 40 at least)
  // cell layout from the real drawn bounds: draw each body on a scratch canvas, take its extent (x, and y relative to the foot line), cell = body + PAD each side (gap 2 PAD)
  const ext = (fn) => { const k = document.createElement("canvas"); k.width = 3600; k.height = 1500; const q = k.getContext("2d"); fn(q, 1800, 1200); const d = q.getImageData(0, 0, 3600, 1500).data; let a = 1e9, b = -1, t = 1e9, u = -1;
    for (let y = 0; y < 1500; y++) for (let x = 0; x < 3600; x++) if (d[(y * 3600 + x) * 4 + 3] > 0) { a = Math.min(a, x); b = Math.max(b, x); t = Math.min(t, y); u = Math.max(u, y); } return [a - 1800, b - 1800, t - 1200, u - 1200]; };
  const lay = (items, x0) => { let x = x0; return items.map((it) => { const e = ext(it.fn), L = x; x = L + e[1] - e[0] + 1 + 2 * PAD; return { L: L, R: x, dx: L + PAD - e[0], e: e, w: e[1] - e[0] + 1 }; }); };
  const row1 = lay([{ fn: (q, x, y) => D.drawRex(q, x, y, H, Object.assign({ pose: "stand" }, f)) }].concat([0, 0.5, 1].map((sh) => ({ fn: (q, x, y) => V.drawRexVoid(q, x, y, H, Object.assign({ pose: "stand" }, f), sh) }))), 0);
  const row2 = lay(["reach", "crawl", "lowCurl", "dead"].map((p) => ({ fn: (q, x, y) => V.drawRexVoid(q, x, y, h2, Object.assign({}, f, { pose: p }), 1) })), 0);
  // row heights from the bodies: top CLR px below the label text, foot line at least 40 px above the row bottom (row 1) / 50 (row 2)
  const top1 = Math.min.apply(null, row1.map((q) => q.e[2])), bot1 = Math.max.apply(null, row1.map((q) => q.e[3])), top2 = Math.min.apply(null, row2.map((q) => q.e[2])), bot2 = Math.max.apply(null, row2.map((q) => q.e[3]));
  const GY = LBL + CLR - top1, R1 = GY + Math.max(40, bot1 + 10), R2 = LBL + CLR - top2 + Math.max(50, bot2 + 10);
  const OX = row1[3].R - CW * 4; // the Obrokxus cells start where the void Rex cells end
  const c = document.createElement("canvas"); c.width = Math.max(W5 * 3, OX + CW * 6); c.height = R1 + R2 + R3 + R4 + R5;
  const g = c.getContext("2d"); g.fillStyle = "#0d1114"; g.fillRect(0, 0, c.width, c.height);
  g.font = "15px sans-serif"; g.fillStyle = "#c8d2d8";
  const label = (t, x, y) => { g.fillStyle = "#c8d2d8"; g.textAlign = "left"; g.fillText(t, x, y); };
  const gaps = (r) => r.slice(1).map((q, i) => q.L + PAD - (r[i].R - PAD));
  // row 1, one scale: womb Rex height H, void Rex 1.8 H, Obrokxus spine 0.24 H
  let slabs;
  D.drawRex(g, row1[0].dx, GY, H, Object.assign({ pose: "stand" }, f)); label("womb Rex", row1[0].L + 10, 22);
  [0, 0.5, 1].forEach((sh, i) => { slabs = V.drawRexVoid(g, row1[i + 1].dx, GY, H, Object.assign({ pose: "stand" }, f), sh); label("void Rex, shed " + sh, row1[i + 1].L + 10, 22); });
  const s = H * 0.24, CS = 1.9, WS = 1200; // CS: the void Obrokxus crops draw this much bigger, WS the webm size
  D.drawObrok1(g, CW * 4.5 + OX, GY, s, { face: -1 }); label("womb Obrokxus", CW * 4 + OX + 10, 22);
  V.drawObrokVoid(g, CW * 5.5 + OX, GY, s, { face: -1 }); label("void Obrokxus", CW * 5 + OX + 10, 22);
  [4, 5].forEach((i) => { // 4x insets, clipped to a box above the ground line
    const bx = CW * i + OX + 10, by = 60, bw = CW - 20, bh = 200;
    g.save(); g.strokeStyle = "#2c3a44"; g.strokeRect(bx + 0.5, by + 0.5, bw, bh); g.beginPath(); g.rect(bx, by, bw, bh); g.clip();
    const k = i === 4 ? 4 : 3.2, ox = bx + bw / 2 + 0, oy = by + bh - 30; // void Obrokxus: fitted to his bounds (head end left, long antennae up)
    (i === 4 ? D.drawObrok1 : V.drawObrokVoid)(g, ox, oy, s * k, { face: -1 });
    g.restore(); label(i === 4 ? "x4" : "x3.2", bx + 4, by + bh + 16);
  });
  // row 2: poses at one scale
  const y2 = R1 + R2 - Math.max(50, bot2 + 10);
  ["reach", "crawl", "lowCurl", "dead"].forEach((p, i) => {
    g.save(); g.beginPath(); g.rect(row2[i].L, R1, row2[i].R - row2[i].L, R2); g.clip();
    V.drawRexVoid(g, row2[i].dx, y2, h2, Object.assign({}, f, { pose: p }), 1);
    g.restore(); label("void Rex " + p, row2[i].L + 10, R1 + 22);
  });
  // row 3: 16:9 frame mock, 800 x 450
  const fx = 20, fy = R1 + R2 + 10, fw = 800, fh = 450;
  g.save(); g.beginPath(); g.rect(fx, fy, fw, fh); g.clip();
  g.fillStyle = "#0d1114"; g.fillRect(fx, fy, fw, fh);
  V.drawRexVoid(g, fx + fw * 0.64, fy + fh + 190, 300, Object.assign({ pose: "stand" }, f), 1);
  V.drawObrokVoid(g, fx + fw * 0.22, fy + fh - 40, 60, { face: -1 });
  g.restore(); g.strokeStyle = "#2c3a44"; g.strokeRect(fx + 0.5, fy + 0.5, fw, fh);
  label("16:9 frame mock: void Rex cropped by the bottom edge, void Obrokxus fleeing left", fx + fw + 20, fy + 24);
  // row 4: womb and void Obrokxus side by side at 10x his cutscene size (spine 0.24 H)
  const y4 = R1 + R2 + R3;
  [["womb Obrokxus x10", D.drawObrok1, 0.28, 10, 520], ["void Obrokxus x8", V.drawObrokVoid, 0.78, 8, R4]].forEach((q) => {
    g.save(); g.beginPath(); g.rect(W * (q[2] - 0.25), y4, W * 0.5, q[4]); g.clip(); q[1](g, W * q[2], y4 + q[4] - 60, s * q[3], { face: -1 }); g.restore(); label(q[0], W * (q[2] - 0.25) + 10, y4 + 22);
  });
  // row 5: the change at chaos 0, 0.25, 0.5, 0.75, 1 (cells 990 x 720, drawn at x8, three per line)
  const y5 = R1 + R2 + R3 + R4;
  [0, 0.25, 0.5, 0.75, 1].forEach((ch, i) => {
    const x5 = (i % 3) * W5, yy = y5 + Math.floor(i / 3) * 720;
    g.save(); g.beginPath(); g.rect(x5, yy, W5, 720); g.clip(); V.drawObrokVoid(g, x5 + W5 / 2, yy + 660, s * 8 * CS, { face: -1, chaos: ch }); g.restore();
    label("change, chaos " + ch, x5 + 10, yy + 22);
  });
  // the x8 crop, the pixel checks (red at chaos 0; chaos 1 against drawObrok1)
  const mk = (w, h) => { const k = document.createElement("canvas"); k.width = w; k.height = h; const q = k.getContext("2d"); q.fillStyle = "#0d1114"; q.fillRect(0, 0, w, h); return [k, q]; };
  const [c8, g8] = mk(1100, 720); V.drawObrokVoid(g8, 550, 660, s * 8 * CS, { face: -1 });
  const bh = (w, h, fn) => { const [, q] = mk(w, h); fn(q); const d = q.getImageData(0, 0, w, h).data; let a = h, b = -1; for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 13) + Math.abs(d[i + 1] - 17) + Math.abs(d[i + 2] - 20) > 12) { const yy = Math.floor(i / 4 / w); a = Math.min(a, yy); b = Math.max(b, yy); } return b - a + 1; };
  const bbox = { x8: bh(1100, 720, (q) => V.drawObrokVoid(q, 550, 660, s * 8 * CS, { face: -1 })), webm: bh(1280, 960, (q) => V.drawObrokVoid(q, 730, 900, WS, { face: -1, chaos: 0.5 })) };
  [0, 0.25, 0.5, 0.75, 1].forEach((ch) => { bbox["cell" + ch] = bh(990, 720, (q) => V.drawObrokVoid(q, 495, 660, s * 8 * CS, { face: -1, chaos: ch })); });
  const d8 = g8.getImageData(0, 0, 1100, 720).data; let red = 0;
  for (let i = 0; i < d8.length; i += 4) if (d8[i] > 150 && d8[i + 1] < 90 && d8[i + 2] < 90) red++;
  const [ca, ga] = mk(1100, 720), [cb, gb] = mk(1100, 720); V.drawObrokVoid(ga, 550, 660, s * 8, { face: -1, chaos: 1 }); D.drawObrok1(gb, 550, 660, s * 8, { face: -1 });
  const da = ga.getImageData(0, 0, 1100, 720).data, db = gb.getImageData(0, 0, 1100, 720).data; let diff = 0;
  for (let i = 0; i < da.length; i++) diff = Math.max(diff, Math.abs(da[i] - db[i]));
  // the second sheet: void Rex clean in every pose, one scale, ground line drawn
  const POSES = ["stand", "reach", "slap", "grip", "dead", "dive", "curl", "recoil", "crawl", "crouch", "pry", "clutch", "kneel", "leap", "prone", "crawlReach", "crawlPlant", "crawlPull", "lowCurl"];
  const PW = 780, PH = 640, COLS = 4, PS = 1.8, c2 = document.createElement("canvas"); c2.width = PW * COLS; c2.height = PH * 5;
  const g2 = c2.getContext("2d"); g2.fillStyle = "#0d1114"; g2.fillRect(0, 0, c2.width, c2.height); g2.font = "15px sans-serif";
  POSES.forEach((p, i) => {
    const cx = (i % COLS) * PW, cy = Math.floor(i / COLS) * PH, gy = cy + PH - 90;
    g2.save(); g2.beginPath(); g2.rect(cx, cy, PW, PH); g2.clip();
    V.drawRexVoid(g2, cx + PW / 2, gy, 80 * PS,Object.assign({}, f, { pose: p }), 1);
    g2.fillStyle = "#2c3a44"; g2.fillRect(cx, gy, PW, 1); g2.fillStyle = "#c8d2d8"; g2.textAlign = "left"; g2.fillText(p, cx + 10, cy + 22);
    g2.restore();
  });
  // the lifted poses against their sheet cells (cell PW x PH, foot line 90 above the bottom, drawn at h 80 * PS): px of room left, right, above and below
  const bb = (R) => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; R.polys.forEach((l) => l[1].forEach((q) => { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); })); return [x0, y0, x1, y1]; };
  const fit = {}, refs = {}, ps = 80 * PS * 1.8 / 1000;
  POSES.forEach((p) => { const R = V.rexVoidPolys(Object.assign({}, f, { pose: p })), b = bb(R), l = PW / 2 + b[0] * ps, r = PW / 2 - b[2] * ps, t = PH - 90 - b[3] * ps, u = 90 + b[1] * ps;
    fit[p] = { left: +l.toFixed(0), right: +r.toFixed(0), top: +t.toFixed(0), under: +u.toFixed(0), ok: l >= 0 && r >= 0 && t >= 0 && u >= 0 };
    refs[p] = { lift: R.lift, bbox: b, polys: R.polys.length, alit: R.alit }; });
  // the close-up: standing void Rex alone, framed from its polygon bounds plus an 8% margin, long side 1600 px (not upscaled)
  const sb = refs.stand.bbox, bw = sb[2] - sb[0], bhh = sb[3] - sb[1], mg = 0.08 * Math.max(bw, bhh), kc = 1600 / (Math.max(bw, bhh) + 2 * mg);
  const [c2x, g2x] = mk(Math.ceil((bw + 2 * mg) * kc), Math.ceil((bhh + 2 * mg) * kc));
  V.drawRexVoid(g2x, (mg - sb[0]) * kc, (mg + sb[3]) * kc, kc * 1000 / 1.8, { face: -1, head: true, pose: "stand" }, 1);
  const cd = g2x.getImageData(0, 0, c2x.width, c2x.height).data; let ix0 = 1e9, ix1 = -1, iy0 = 1e9, iy1 = -1;
  for (let y = 0; y < c2x.height; y++) for (let x = 0; x < c2x.width; x++) { const i = (y * c2x.width + x) * 4; if (Math.abs(cd[i] - 13) + Math.abs(cd[i + 1] - 17) + Math.abs(cd[i + 2] - 20) > 6) { ix0 = Math.min(ix0, x); ix1 = Math.max(ix1, x); iy0 = Math.min(iy0, y); iy1 = Math.max(iy1, y); } }
  const cfit = { bw: ix1 - ix0 + 1, bh: iy1 - iy0 + 1, cw: c2x.width, ch: c2x.height, l: ix0, t: iy0, r: c2x.width - 1 - ix1, b: c2x.height - 1 - iy1 };
  const pfail = POSES.filter((p) => !fit[p].ok);
  // the lying poses: dead, crawl, prone side by side, one scale, each framed from its polygon bounds + 8% margin (vertical room shared), ground line, width <= 2400
  const LY = ["dead", "crawl", "prone"], lb = LY.map((p) => { const b = refs[p].bbox, w = b[2] - b[0], h = b[3] - b[1]; return { p: p, b: b, w: w, h: h, mg: 0.08 * Math.max(w, h) }; });
  const lsum = lb.reduce((a, q) => a + q.w + 2 * q.mg, 0), lk = Math.min(2, 2400 / lsum), lmg = Math.max.apply(null, lb.map((q) => q.mg)), lh = Math.max.apply(null, lb.map((q) => q.h));
  const LW = Math.ceil(lsum * lk), LH = Math.ceil((lh + 2 * lmg) * lk), [c3, g3] = mk(LW, LH); g3.font = "15px sans-serif";
  let lx = 0;
  lb.forEach((q) => {
    const cw = (q.w + 2 * q.mg) * lk;
    g3.save(); g3.beginPath(); g3.rect(lx, 0, cw, LH); g3.clip();
    V.drawRexVoid(g3, lx + (q.mg - q.b[0]) * lk, LH - lmg * lk + q.b[1] * lk, lk * 1000 / 1.8, { face: -1, head: true, pose: q.p }, 1);
    g3.fillStyle = "#2c3a44"; g3.fillRect(lx, Math.round(LH - lmg * lk), cw, 1); g3.fillStyle = "#c8d2d8"; g3.textAlign = "left"; g3.fillText(q.p, lx + 10, 22);
    g3.restore(); lx += cw;
  });
  return { lying: c3.toDataURL("image/png"), lfit: { w: LW, h: LH, k: lk }, sfit: { g1: gaps(row1), g2: gaps(row2), w: c.width, h: c.height, t1: GY + top1 - LBL, t2: y2 + top2 - R1 - LBL }, cfit: cfit, pfail: pfail, fit: fit, refs: refs, x2: c2x.toDataURL('image/png'), png: c.toDataURL("image/png"), poses: c2.toDataURL("image/png"), slabs: slabs, x8: c8.toDataURL('image/png'), red: red, diff: diff, bbox: bbox };
}
"""

JOINTS = """
() => {
  // drawRexVoid's own mapping (LEAN 0.08, SY 1.09, K 1.8, face -1 as the sheet draws), at h = 1, foot at the origin, y up, 1000 = K * h
  const D = GenDuo, LEAN = 0.08, SY = 1.09, K = 1.8, f = -1, hs = K, U = 1000 / hs, r = (v) => Math.round(v * 10) / 10;
  const POSES = ["stand", "reach", "slap", "grip", "dead", "dive", "curl", "recoil", "crawl", "crouch", "pry", "clutch", "kneel", "leap", "prone", "crawlReach", "crawlPlant", "crawlPull", "lowCurl"];
  const cv = (ax, ay) => [f * (ax - LEAN * ay) * hs, ay * hs * SY], out = (p) => [r(p[0] * U), r(-p[1] * U)];
  const at = (P, t) => { const s = t < 0.5 ? 0 : 2, u = (t < 0.5 ? t : t - 0.5) * 2; return [P[s] + (P[s + 2] - P[s]) * u, P[s + 1] + (P[s + 3] - P[s + 1]) * u]; };
  const nrm = (P, t) => { const a = at(P, t - 0.02), b = at(P, t + 0.02), d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; let nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d; if (-nx - 0.3 * ny < 0) { nx = -nx; ny = -ny; } return [nx, ny]; };
  const flat = (P) => { const q = []; for (let i = 0; i < P.length; i += 2) q.push(out([P[i], P[i + 1]])); return q; };
  const res = {};
  POSES.forEach((p) => {
    const o = { pose: p, face: -1 }, J = D.rexJoints(o), A = D.rexAnchors(0, 0, 1, Object.assign({}, o, { face: 1 }), {});
    const pts = (b) => { const a = J[b], q = []; for (let i = 0; i < 3; i++) q.push(...cv(a[i * 2], a[i * 2 + 1])); return q; };
    const joints = {}; Object.keys(J).forEach((b) => { joints[b] = flat(pts(b)); });
    const anchors = {}; ["shoulder", "elbow", "wrist", "hand"].forEach((n) => ["B", "F"].forEach((s) => { const a = A[n + s]; anchors[n + s] = out(cv(a.x, a.y)); }));
    const C = pts("chest"), Wp = pts("waist"), T = [C[0], C[1], C[4], C[5], Wp[4], Wp[5]];
    const arm = (n) => [].concat(cv(A["shoulder" + n].x, A["shoulder" + n].y), cv(A["elbow" + n].x, A["elbow" + n].y), cv(A["wrist" + n].x, A["wrist" + n].y));
    const AOFF = 0.105, AM = 0.08, pn0 = nrm(T, 0), ang = Math.atan2(pn0[1], -pn0[0]), ca = Math.max(-AM, Math.min(AM, ang));
    const pn = ca === ang ? pn0 : [-Math.cos(ca), Math.sin(ca)], up = [-pn[1], pn[0]], W = (v) => v * hs;
    const sq = (u, v) => [C[0] + pn[0] * W(u) + up[0] * W(v), C[1] + pn[1] * W(u) + up[1] * W(v)];
    const moveArm = (P, s) => { const q = sq(s * AOFF, -0.02), dx = q[0] - P[0], dy = q[1] - P[1]; return P.map((v, i) => v + (i % 2 ? dy : dx)); };
    const derived = { T: flat(T), C: flat(C), Wp: flat(Wp), armB: flat(moveArm(arm("B"), -1)), armF: flat(moveArm(arm("F"), 1)), shoulderClamped: ca !== ang,
      shoulderFrame: { origin: out(sq(0, 0)), pn: [r(pn[0] * 1000) / 1000, r(-pn[1] * 1000) / 1000], up: [r(up[0] * 1000) / 1000, r(-up[1] * 1000) / 1000] } };
    res[p] = { joints: joints, anchors: anchors, derived: derived };
  });
  return { unit: 1000, poses: res };
}"""

errors = []
REC ="""() => { const k = document.createElement("canvas"); k.width = 1280; k.height = 960; k.style.cssText = "position:fixed;left:0;top:0"; document.body.style.cssText = "margin:0;background:#0d1114"; document.body.appendChild(k); document.querySelectorAll("body > *:not(canvas)").forEach((e) => { e.style.display = "none"; });
  const g = k.getContext("2d"), t0 = performance.now(), s = 1200;
  (function tick() { const t = (performance.now() - t0) / 1000, ch = Math.max(0, Math.min(1, (t - 1) / 3)); g.fillStyle = "#0d1114"; g.fillRect(0, 0, 1280, 960);
    GenVoidForms.drawObrokVoid(g, 730, 900, s, { face: -1, chaos: ch }); requestAnimationFrame(tick); })(); }"""
RECX = """() => { const k = document.createElement("canvas"); k.width = 1280; k.height = 960; k.style.cssText = "position:fixed;left:0;top:0"; document.body.style.cssText = "margin:0;background:#0d1114"; document.body.appendChild(k); document.querySelectorAll("body > *:not(canvas)").forEach((e) => { e.style.display = "none"; });
  const g = k.getContext("2d"), t0 = performance.now();
  (function tick() { const t = (performance.now() - t0) / 1000, c = Math.max(0, Math.min(1, (t - 1) / 3.5)); g.fillStyle = "#0d1114"; g.fillRect(0, 0, 1280, 960);
    const T = 4.5, at = (v) => [1100 - 900 * v, 400 - 100 * v], o = { face: -1, pose: "dive", chg: { at, ground: 900, dur: T } }, p = at(c), tt = Math.max(0, (t - 1) / T);
    GenVoidForms.drawRexChange(g, p[0], p[1], 160, o, c); GenVoidForms.drawRexRubble(g, p[0], p[1], 160, o, tt); requestAnimationFrame(tick); })(); }"""
RCH = """() => { const N = 12, CW = 330, CH = 480, c = document.createElement("canvas"); c.width = CW * N; c.height = CH * 2; const g = c.getContext("2d");
  g.fillStyle = "#0d1114"; g.fillRect(0, 0, c.width, c.height); g.font = "20px sans-serif";
  for (let i = 0; i < N; i++) { const v = i / (N - 1), cx = i * CW + CW / 2, o = { face: -1, pose: "dive", chg: { at: (u) => [i * CW + CW / 2 + (u - v) * 3 * CW, 200], ground: CH - 30, dur: 3 } };
    g.save(); g.beginPath(); g.rect(i * CW, 0, CW, CH); g.clip(); GenVoidForms.drawRexChange(g, cx, 200, 100, o, v); GenVoidForms.drawRexRubble(g, cx, 200, 100, o, v); g.restore(); g.fillStyle = "#cfd8cf"; g.fillText("dive c " + v.toFixed(2), i * CW + 12, 28);
    g.save(); g.beginPath(); g.rect(i * CW, CH, CW, CH); g.clip(); const so = { face: -1, pose: "stand" }; GenVoidForms.drawRexChange(g, cx, CH + CH - 50, 100, so, v); g.restore(); g.fillText("stand c " + v.toFixed(2), i * CW + 12, CH + 28); }
  return c.toDataURL("image/png"); }"""
def record_webm(js=REC, name="obrok-change.webm", ms=5500):
    import shutil
    vd = out / "_vid"; shutil.rmtree(vd, ignore_errors=True)
    with sync_playwright() as p2:
        b2 = p2.chromium.launch(); cx = b2.new_context(viewport={"width": 1280, "height": 960}, record_video_dir=str(vd), record_video_size={"width": 1280, "height": 960})
        pg = cx.new_page(); pg.goto(f"{base2}/404.html"); pg.wait_for_load_state("load")
        for f in FILES: pg.add_script_tag(url=f"{base2}/{f}")
        pg.evaluate(js); pg.wait_for_timeout(ms); v = pg.video.path(); cx.close(); b2.close()
    shutil.copyfile(v, out / name); shutil.rmtree(vd, ignore_errors=True); print("wrote", out / name)
httpd, base = nav.start_server()
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); page = b.new_page(viewport={"width": 1440, "height": 900})
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type == "error" else None)
        page.goto(f"{base}/404.html"); page.wait_for_load_state("load"); errors.clear()
        for f in FILES:
            page.add_script_tag(url=f"{base}/{f}")
            page.wait_for_timeout(50)
            if errors: print(f"FAIL loading {f}:"); [print("  ", e) for e in errors]; b.close(); sys.exit(1)
        if "--table" in sys.argv:
            import json
            tj = json.loads(Path(sys.argv[sys.argv.index("--table") + 1]).read_text())
            bad = page.evaluate("""(t) => { const b = GenVoidForms.rexVoidTable(), bad = [], eq = (x, y) => typeof x == "number" && typeof y == "number" ? Math.abs(x - y) <= 1e-9 : Array.isArray(x) && Array.isArray(y) ? x.length == y.length && x.every((v, i) => eq(v, y[i])) : x === y;
                ["SF", "SB", "DXF", "DXB", "TUCK", "PAL", "ORDER"].forEach((k) => { if (!eq(b[k], t[k])) bad.push(k); });
                new Set(Object.keys(b.P).concat(Object.keys(t.P))).forEach((n) => { if (!eq(b.P[n], t.P[n])) bad.push(n); });
                GenVoidForms.rexVoidTable(t); return bad; }""", tj)
            print("TABLE same as baked" if not bad else "TABLE differs from baked: " + ", ".join(bad))
        r = page.evaluate(JS)
        rch = page.evaluate(RCH)
        if "--joints" in sys.argv:
            import json
            jp = Path(sys.argv[sys.argv.index("--joints") + 1]); jp.parent.mkdir(parents=True, exist_ok=True)
            jp.write_text(json.dumps(page.evaluate(JOINTS), indent=1)); print("wrote", jp)
        page.wait_for_timeout(50)
        b.close()
    base2 = base
    globals()["_srv"] = httpd
except BaseException:
    httpd.shutdown(); raise

png = out / "voidforms.png"
png.write_bytes(base64.b64decode(r["png"].split(",", 1)[1])); print("wrote", png)
pp = out / "voidposes.png"
pp.write_bytes(base64.b64decode(r["poses"].split(",", 1)[1])); print("wrote", pp)
(out / "obrok-void-x8.png").write_bytes(base64.b64decode(r["x8"].split(",", 1)[1])); print("wrote", out / "obrok-void-x8.png")
(out / "rex-void-closeup.png").write_bytes(base64.b64decode(r["x2"].split(",", 1)[1])); print("wrote", out / "rex-void-closeup.png")
(out / "rex-change.png").write_bytes(base64.b64decode(rch.split(",", 1)[1])); print("wrote", out / "rex-change.png")
for k, v in r["fit"].items(): print("fit", k, v)
sf = r["sfit"]; print("SHEET fit: row1 gaps " + "/".join(str(round(v)) for v in sf["g1"]) + " px, row2 gaps " + "/".join(str(round(v)) for v in sf["g2"]) + f" px, canvas {sf['w']}x{sf['h']}, row1 top clear {sf['t1']} px, row2 top clear {sf['t2']} px")
if min(sf["t1"], sf["t2"]) < 40: print(f"SHEET fit FAIL: row1 top clear {sf['t1']} px, row2 top clear {sf['t2']} px")
(out / "rex-void-lying.png").write_bytes(base64.b64decode(r["lying"].split(",", 1)[1])); print("wrote", out / "rex-void-lying.png")
lf = r["lfit"]; print(f"LYING fit: {lf['w']}x{lf['h']}, scale {lf['k']:.3f}")
cf = r["cfit"]; print(f"CLOSEUP fit: body {cf['bw']}x{cf['bh']} px in canvas {cf['cw']}x{cf['ch']}, margin {cf['l']}/{cf['t']}/{cf['r']}/{cf['b']} px")
print(f"POSES fit: {19 - len(r['pfail'])}/19 inside cell" + (" (outside: " + ", ".join(r["pfail"]) + ")" if r["pfail"] else ""))
print("void Rex polygons (stand, row 1):", r["slabs"]); print("red pixels at chaos 0 (r>150, g<90, b<90):", r["red"]); print("max channel diff chaos 1 vs drawObrok1:", r["diff"]); print("creature bbox heights (cell 720, webm 960):", r["bbox"])
if "--ref" in sys.argv:
    import json
    ref = json.loads(Path(sys.argv[sys.argv.index("--ref") + 1]).read_text()); bad = 0
    for k, e in ref.items():
        g = r["refs"][k]; m = []
        if abs(g["lift"] - e["lift"]) > 2: m.append(f"lift {g['lift']:.1f} vs {e['lift']}")
        for n, a, c in zip(["minx", "miny", "maxx", "maxy"], g["bbox"], e["bbox"]):
            if abs(a - c) > 2: m.append(f"bbox {n} {a:.1f} vs {c}")
        if g["polys"] != e["polys"]: m.append(f"polys {g['polys']} vs {e['polys']}")
        for q, v in e["alit"].items():
            if g["alit"].get(q) != v: m.append(f"alit {q} {g['alit'].get(q)} vs {v}")
        if m: bad += 1; print("REF mismatch", k, "; ".join(m))
    print(f"REF ok {len(ref) - bad}/{len(ref)}")
if "--webm" in sys.argv: record_webm(); record_webm(RECX, "rex-change.webm", 6500)
httpd.shutdown()
if errors: print("FAIL console errors:"); [print("  ", e) for e in errors]; sys.exit(1)
