/* hud-c25.js — the C25 HUD: span line (top), left wing (outside), right wing (ship), log (bottom centre).
   Line art only on a transparent 2D canvas. Every drawn value is read from one data object D (sampleData() for now).
   Geometry is the 2000x1009 sketch; each block is drawn under its own anchor transform (scale s, wings at the
   bottom corners, log + span line centred). Text keeps its anchor and grows with ts = max(s, 0.9).
   Static linework (ph 's') is cached per resize; values (ph 'd') are painted every draw. */
window.HudC25 = (function () {
  const GOLD = "245,208,107", CREAM = "238,230,208", GREY = "160,168,160", RED = "110,26,26", REDT = "196,74,68";
  const PI = Math.PI, STRUCT = 0.42, RAIL = 796, TOP = 772, XL = 776, XR = 1224, FL = 959, HB0 = 584;
  const BAR_B = 58.7;
  const WSTEPS = [1, 1.25, 1.5, 1.75];
  let wsv = WSTEPS.indexOf(+Util.read(localStorage, Util.KEYS.HUD_WING)) >= 0 ? +Util.read(localStorage, Util.KEYS.HUD_WING) : 1, wk = wsv, hov = -1;   // wing scale: the stored step, and the drawn one (the largest step <= it that fits this screen)
  let cv = null, c = null, W = 0, H = 0, dpr = 1, s = 1, ts = 1, barB = BAR_B;
  let stat = null, ph = "d", D = null, LF = null, RF = null, dirty = false, lastSpan = null, lastLog = null, beadSig = "";
  let painted = false;   // true once a frame has painted since mount
  let probe = false;   // true only while report() repaints the live layer to record text boxes
  let txS = [], txD = [], shS = [], shD = [], spanLine = null;   // every drawn text with its screen box (static kept, live per frame), and the span line's screen extent, for report().textMin / textHits / paint
  let rbS = [], rbD = [], busEnd = null;   // right-wing text boxes (static, live) and the bus rail / split row end x, for report().right.boxes
  let lbS = [], lbD = [], ext = {};   // left-wing text boxes (static kept, live per frame) and drawn extents, for report().left.boxes
  let blk = 0, bxS = [], bxD = [];   // label boxes per block (static layer kept, live layer cleared each frame) for the collision pass

  /* ---------- the one data object ---------- */
  function rng(seed) { let q = seed >>> 0; return () => { q = (q * 1664525 + 1013904223) >>> 0; return q / 4294967296; }; }
  function sampleData() {
    const r = rng(7), spectrum = Array.from({ length: 32 }, (_, i) => 0.18 + 0.5 * r() * (0.6 + 0.4 * Math.sin(i * 0.7)));
    const r5 = rng(9), speed = Array.from({ length: 90 }, () => 0.03 + 0.02 * r5());
    const P = x => (x - 789) / 428;
    /* hull stress sampled along the length, u from -0.52 to 1.30 in steps of 0.01 */
    const g = (u, m, sg, a) => a * Math.exp(-((u - m) * (u - m)) / (2 * sg * sg));
    const stress = Array.from({ length: 183 }, (_, i) => { const u = -0.52 + i * 0.01;
      return Math.max(0.04, 0.22 + g(u, -0.32, 0.06, 0.28) + g(u, -0.08, 0.11, 0.45) + g(u, 0.36, 0.05, 0.62) + g(u, 0.43, 0.035, 0.30) - 0.2 * Math.max(0, u - 0.8) / 0.34); });
    const unread = [850, 854, 1019, 1075, 1118, 1161, 1177].map(P), you = P(1028.5);
    const next = unread.reduce((b, p, i) => Math.abs(p - you) < Math.abs(unread[b] - you) ? i : b, 0);
    return {
      /* left wing */
      contacts: 2, near: "e 1,440", blips: [[0.62, -0.08], [-0.35, 0.22]], ball: [0.62, -0.45], sweep: -0.5, beacons: [[-0.25, 0.05], [0.1, 0.05]],
      spectrum, str: 16, floor: 5, speed, speedAt: 0.75, resNow: 0.08, dose: "1.13", g: "-0.40", gFlip: 0.56, hullT: "-38°", hullTv: -38,
      lat: 0.41, vert: 0.19, width: "±13°",
      lampsL: [["nomic", 0], ["chaos", 1], ["span", 1], ["unfrm", 0], ["cntc", 1], ["bcn", 0], ["sig", 0],
               ["rad", 3], ["dbr", 0], ["shear", 0], ["flip", 2], ["rift", 0], ["curr", 0], ["well", 0]],
      /* right wing */
      volt: 28.1, cells: [3.52, 3.53, 3.51, 3.52, 3.47, 3.53, 3.52, 3.50], bus: 4.5,
      loads: [["drv", 0.8], ["thm", 1.5], ["lsp", 1.5], ["gnc", 0.7]], cabin: 21.4, cabSet: 21.0,
      fuel: 0.72, left: "2:00 left", thrust: 0.34, hot: 0.8, hullInt: 98, fin: 93, p: "101.0", rh: "41", rhv: 0.41,
      o2: "20.88", co2: "615", o2v: 0.65, co2v: 0.38, stress,
      lampsR: [["drv 1", 1], ["drv 2", 1], ["drv 3", 0], ["drv 4", 0], ["ring", 0], ["fin t", 0], ["fin b", 0],
               ["bus", 0], ["cell", 1], ["cool", 0], ["lsp", 1], ["seal", 0], ["nav", 1], ["jnt", 2]],
      /* log [text, mark], oldest first, the newest is the last (the live line) */
      log: [["entering the void — chaos 1.00 · incoherent field detected", ">"], ["span ranged 120 AU · both ends unlit", ">"],
            ["gravity flips sign every 2.5s", "!"], ["beacon read · The Nephilim · 10 of 17", ">"],
            ["next signal: The Shattered · 9.0 AU west", ">"]], now: "now",
      /* span line: marks as 0..1 of the span */
      spanDist: 38,
      read: [807, 826, 839, 843, 847, 859, 909, 1152, 1170, 1216].map(P),
      unread, you, span: { next }
    };
  }

  /* ---------- drawing kit (sketch coordinates; the anchor transform scales them) ---------- */
  const rgba = (col, a) => `rgba(${col},${a})`;
  function line(x1, y1, x2, y2, col, a, w) {
    c.strokeStyle = rgba(col || GOLD, a == null ? STRUCT : a); c.lineWidth = w || 1;
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  }
  function poly(pts, col, a, w, close) {
    c.strokeStyle = rgba(col || GOLD, a == null ? STRUCT : a); c.lineWidth = w || 1;
    c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]));
    if (close) c.closePath(); c.stroke();
  }
  function arc(cx, cy, r, a0, a1, col, a, w, dash) {
    c.strokeStyle = rgba(col || GOLD, a == null ? STRUCT : a); c.lineWidth = w || 1; if (dash) c.setLineDash(dash);
    c.beginPath(); c.arc(cx, cy, r, a0, a1); c.stroke(); c.setLineDash([]);
  }
  function dot(x, y, r, col, a) { c.fillStyle = rgba(col || GOLD, a == null ? 1 : a); c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill(); }
  function text(str, x, y, o) {
    o = o || {}; const size = o.size || 10, k = ts / s;
    c.font = `${o.weight || "500"} ${size * k}px "IBM Plex Mono", monospace`;
    c.letterSpacing = ((o.ls != null ? o.ls : (size <= 11 ? 0.8 : 0.2)) * k) + "px";
    c.textAlign = o.align || "left"; c.textBaseline = "alphabetic";
    c.fillStyle = rgba(o.col || GREY, o.a != null ? o.a : 0.78);
    const tm = c.measureText(str), w = tm.width, x0 = x, y0 = y;
    if (ts > s + 1e-6) {   /* text grew past its anchor: clear earlier labels in the same block (gap 3) */
      const fs = size * k, al = c.textAlign, ls = bxS[blk] || (bxS[blk] = []), ld = bxD[blk] || (bxD[blk] = []), all = ls.concat(ld);
      for (let pass = 0; pass < 4; pass++) { let moved = false;
        for (const b of all) {
          const l = al === "right" ? x - w : al === "center" ? x - w / 2 : x, r = l + w, t = y - 0.75 * fs, bt = y + 0.22 * fs;
          const ov = Math.min(bt, b.bt) - Math.max(t, b.t); if (ov <= 1.5 || l > b.r + 3 || r < b.l - 3) continue;
          if (Math.abs(y - b.y) < 2) { x += (l + r) / 2 >= (b.l + b.r) / 2 ? b.r + 3 - l : b.l - 3 - r; }
          else if (l < b.r && r > b.l) y += y > b.y ? ov : -ov;
          else continue;
          moved = true; }
        if (!moved) break; }
      const l = al === "right" ? x - w : al === "center" ? x - w / 2 : x;
      (ph === "s" ? ls : ld).push({ l, r: l + w, t: y - 0.75 * fs, bt: y + 0.22 * fs, y });
    }
    if (blk === 1) { const l = c.textAlign === "right" ? x - w : c.textAlign === "center" ? x - w / 2 : x; (ph === "s" ? lbS : lbD).push({ s: str, l, r: l + w, t: y - 0.75 * size, b: y + 0.22 * size }); }
    if (blk === 2) { const l = c.textAlign === "right" ? x - w : c.textAlign === "center" ? x - w / 2 : x; (ph === "s" ? rbS : rbD).push({ s: str, l, r: l + w, t: y - 0.75 * size, b: y + 0.22 * size }); }
    if (ph === "s" || probe) {   /* screen box (and the same box at the 2000 x 1009 layout, unshifted) for report(); static once per resize, live only while report() probes */
      const al = c.textAlign, tl = al === "right" ? x - w : al === "center" ? x - w / 2 : x, ka = tm.actualBoundingBoxAscent, kd = tm.actualBoundingBoxDescent,
        tb = scrBox(tl, y - ka, tl + w, y + kd), sl = (al === "right" ? x0 - w / k : al === "center" ? x0 - w / k / 2 : x0);
      (ph === "s" ? txS : txD).push({ s: str.slice(0, 24), sk: size, px: size * ts, blk, l: tb[0], t: tb[1], r: tb[2], b: tb[3], sl, sr: sl + w / k, st: y0 - ka / k, sb: y0 + kd / k });
    }
    c.fillText(str, x, y); c.letterSpacing = "0px"; return w;
  }
  /* a drawn shape's box (ship silhouette, chevrons) for report().textHits: text meeting it counts as a hit */
  const shape = (nm, l, t, r, b) => { if (ph === "s" || probe) { const q = scrBox(l, t, r, b); (ph === "s" ? shS : shD).push({ s: nm, l: q[0], t: q[1], r: q[2], b: q[3] }); } };
  /* a sketch-coordinate box to screen CSS px under the canvas's current transform */
  function scrBox(l, t, r, b) {
    const m = c.getTransform(), x1 = m.a * l + m.c * t + m.e, x2 = m.a * r + m.c * t + m.e, x3 = m.a * l + m.c * b + m.e, x4 = m.a * r + m.c * b + m.e,
      y1 = m.b * l + m.d * t + m.f, y2 = m.b * r + m.d * t + m.f, y3 = m.b * l + m.d * b + m.f, y4 = m.b * r + m.d * b + m.f;
    return [Math.min(x1, x2, x3, x4) / dpr, Math.min(y1, y2, y3, y4) / dpr, Math.max(x1, x2, x3, x4) / dpr, Math.max(y1, y2, y3, y4) / dpr];
  }
  function W_(str, size) {
    const k = ts / s; c.font = `500 ${size * k}px "IBM Plex Mono", monospace`; c.letterSpacing = ((size <= 11 ? 0.8 : 0.2) * k) + "px";
    const w = c.measureText(str).width; c.letterSpacing = "0px"; return w;
  }
  const glow = (col, f) => { c.save(); c.shadowColor = rgba(col, 0.45); c.shadowBlur = 5 * s; const r = f(); c.restore(); return r; };
  const dash = (pat, f) => { c.save(); c.setLineDash(pat); f(); c.restore(); };
  const lab = (str, x, y, o) => text(str, x, y, Object.assign({ size: 10, col: GREY, a: 0.75 }, o));
  const mic = (str, x, y, o) => text(str, x, y, Object.assign({ size: 9, col: GREY, a: 0.85 }, o));
  const head = (str, x, y, o) => lab(str, x, y, Object.assign({ col: CREAM, a: 0.7, size: 9 }, o));
  const num = (str, x, y, o) => glow(GOLD, () => text(str, x, y, Object.assign({ size: 12, col: GOLD, a: 0.95 }, o)));
  const big = (str, x, y) => glow(CREAM, () => text(str, x, y, { size: 24, col: CREAM, a: 1 }));
  const rad = d => d * PI / 180;
  const pol = (cx, cy, r, d) => [cx + Math.cos(rad(d)) * r, cy + Math.sin(rad(d)) * r];
  const rv = (nm, v, x, y, al) => { const wn = W_(nm, 9), wv = W_(v, 10), x0 = al === "right" ? x - wn - 4 - wv : x;
    mic(nm, x0, y, { a: 0.8 }); text(v, x0 + wn + 4, y, { size: 10, col: CREAM, a: 0.95 }); };
  const stat_ = f => { if (ph === "s") f(); };   // static linework only
  const dyn = f => { if (ph === "d") f(); };     // values, every frame
  const resF = v => Math.max(0, Math.min(1, (Math.log10(Math.max(v, 0.001)) + 3) / 3));

  /* polyline helpers */
  const len = P => P.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - P[i][0], p[1] - P[i][1]), 0);
  function at(P, d) {
    for (let i = 1; i < P.length; i++) { const x0 = P[i - 1][0], y0 = P[i - 1][1], x1 = P[i][0], y1 = P[i][1], L = Math.hypot(x1 - x0, y1 - y0);
      if (d <= L || i === P.length - 1) { const t = Math.max(0, Math.min(1, d / L)); return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, (x1 - x0) / L, (y1 - y0) / L]; } d -= L; }
  }
  const sub = (P, s0, s1) => { const pts = []; for (let d = s0; d < s1; d += 2) pts.push(at(P, d).slice(0, 2)); pts.push(at(P, s1).slice(0, 2)); return pts; };
  function tickAt(P, side, u, L, col, a) {
    const T = len(P), q = at(P, T * (1 - u)), x = q[0], y = q[1], nx = side * -q[3], ny = side * q[2];
    line(x + nx, y + ny, x + nx * (L + 1), y + ny * (L + 1), col || GOLD, a == null ? 0.5 : a); return [x, y, nx, ny];
  }
  function scaleLab(P, side, u, str, dy) {
    const T = len(P), q = at(P, T * (1 - u)), nx = side * -q[3], ny = side * q[2];
    mic(str, q[0] + nx * 17, q[1] + ny * 17 + (dy == null ? 4 : dy), { align: side > 0 ? "right" : "left", col: GOLD, a: 0.75 });
  }

  /* ---------- shared wing geometry ---------- */
  const LS = [[486, RAIL], [491, 820], [504, 890], [525, 937], [556, 950]];   // resonance slope (left), top -> foot
  const RS = LS.map(p => [2000 - p[0], p[1]]);                                  // fuel slope (right)
  const KS = 24 / 462, ycL = x => TOP + (x - 24) * KS, ycR = x => TOP + (1976 - x) * KS;
  const half = p => p.map(q => [q[0] + 0.5, q[1] + 0.5]);

  /* a stepped rail segment: base (poly + ticks) static, lit window + marker dynamic. o.v / o.win / o.mark in 0..1 */
  function edge(x0, x1, yc, o) {
    const off = o.off || 0, y = x => yc(x) + off, X = t => x0 + (x1 - x0) * t;
    if (ph === "s") {
      poly([[x0, y(x0) + (o.join === "L" ? 0 : 7)], [x0, y(x0)], [x1, y(x1)], [x1, y(x1) + (o.join === "R" ? 0 : 7)]], GOLD, STRUCT + 0.08);
      for (let i = 0; i <= o.n; i++) { const x = Math.round(X(i / o.n)) + 0.5, M = i % o.maj === 0, m2 = o.mid && i % o.mid === 0, yy = y(x);
        line(x, yy + 1.5, x, yy + (M ? 6 : m2 ? 4 : 2.5) + 0.5, GOLD, M ? 0.45 : m2 ? 0.28 : 0.16); }
    } else {
      const ab = o.win || [0, o.v];
      glow(GOLD, () => line(X(ab[0]), y(X(ab[0])), X(ab[1]), y(X(ab[1])), GOLD, 0.95, 2));
      if (o.pip != null) { const xp = X(o.pip), yp = y(xp); line(xp, yp - 1, xp, yp - 5, GREY, 0.7, 1.5); }
      const xm = X(o.mark), ym = y(xm);
      glow(CREAM, () => poly([[xm - 4, ym - 6], [xm, ym - 1.5], [xm + 4, ym - 6]], CREAM, 0.95, 1.5));
    }
    return y;
  }
  /* a reading riding on a segment: parts [text, "m"|"n"], baseline 9 px above the edge */
  function rd(parts, x, yc, off, align) {
    const ws = parts.map(p => W_(p[0], p[1] === "n" ? 10 : 9)), tw = ws.reduce((a, b) => a + b, 0) + 4 * (parts.length - 1);
    let px = align === "right" ? x - tw : x; const yb = Math.round(yc(x) + off - 9);
    parts.forEach((p, i) => { p[1] === "n" ? text(p[0], px, yb, { size: 10, col: CREAM, a: 0.95 }) : mic(p[0], px, yb, { a: 0.8 }); px += ws[i] + 4; });
  }
  /* lamp: st 0 dark, 1 lit, 2 burst (ring + rays), 3 burst + red core */
  function lamp(x, y, str, st, shape) {
    const gx = x + 5, gy = y, r = shape === "d" ? 5.2 : 4.4, on = st > 0, red = st === 3, ty = gy + 3;
    const pth = () => { c.beginPath(); if (shape === "d") { c.moveTo(gx, gy - r); c.lineTo(gx + r, gy); c.lineTo(gx, gy + r); c.lineTo(gx - r, gy); c.closePath(); } else c.arc(gx, gy, r, 0, 2 * PI); };
    const g = (col, a, w) => { pth(); c.strokeStyle = rgba(col, a); c.lineWidth = w; c.lineJoin = "round"; c.stroke(); };
    const grown = ts > s + 1e-6;   // grown text: tag starts just past the glyph and drops the letter spacing so it clears the next lamp
    const tag = o => text(str, x + (grown ? 14 : 16), ty, Object.assign({ size: 8, col: GREY, a: 0.5 }, grown ? { ls: 0 } : {}, o));
    if (!on) { g(GOLD, 0.34, 1); tag({ a: 0.55 }); return; }
    const col = red ? RED : CREAM, hi = red ? REDT : CREAM;
    c.save(); c.shadowColor = rgba(hi, 0.8); c.shadowBlur = 8 * s; g(hi, 1, 1.5); c.restore();
    c.save(); c.shadowColor = rgba(hi, 0.7); c.shadowBlur = 6 * s; pth(); c.fillStyle = rgba(col, red ? 1 : 0.55); c.fill(); c.restore();
    dot(gx, gy, red ? 1.6 : 1.8, hi, 1);
    if (st >= 2) { const R1 = r + 2;
      c.save(); c.shadowColor = rgba(hi, 0.9); c.shadowBlur = 5 * s;
      arc(gx, gy, R1, 0, 2 * PI, hi, 1, 1.3);
      [45, 135, 225, 315].forEach(d => { const t = rad(d); line(gx + Math.cos(t) * (R1 + 1), gy + Math.sin(t) * (R1 + 1), gx + Math.cos(t) * (R1 + 3.5), gy + Math.sin(t) * (R1 + 3.5), hi, 1, 1.6); });
      c.restore(); }
    tag({ col: CREAM, a: st >= 2 ? 0.85 : 0.7 });
  }
  function arcScale(cx, cy, r, a0, a1, st, maj, o) {
    const n = Math.round((a1 - a0) / st);
    for (let k = 0; k <= n; k++) { const d = a0 + k * st, M = k % maj === 0, m2 = o.mid && k % o.mid === 0, L = M ? o.LM : m2 ? 4 : 2;
      const p0 = pol(cx, cy, r, d), p1 = pol(cx, cy, r - L, d); line(p0[0], p0[1], p1[0], p1[1], GOLD, M ? o.aM : m2 ? 0.3 : 0.16); }
  }

  /* ======================= LEFT WING ======================= */
  const RX = 330, RY = 896, WB = [[24, 908], pol(RX, RY, 106, 225)];
  const wbY = x => WB[0][1] + (x - WB[0][0]) * (WB[1][1] - WB[0][1]) / (WB[1][0] - WB[0][0]);
  const brgInt = b => Math.round(b) % 360;   // round first, then wrap: 359.5 and up reads 000
  const brgOf = b => ((Math.atan2(b[1], b[0]) * 180 / PI + 90) % 360 + 360) % 360;

  function paintLeft() {
    const FT = len(LS), uR = resF(LF.resNow), b0 = api._forceBrg != null ? api._forceBrg : LF.blips[0] ? brgOf(LF.blips[0]) : LF.brg, b1 = LF.blips[1] ? brgOf(LF.blips[1]) : null;
    stat_(() => {
      poly(half(LS.concat([[HB0, FL]])), GOLD, STRUCT);
      line(HB0, FL + 0.5, XL, FL + 0.5, GOLD, STRUCT); line(XL + 0.5, FL, XL + 0.5, FL + 9, GOLD, STRUCT);
    });
    /* signal strength rail, bearing tape */
    /* the pointers run the full rail (95 = 95% along); the readings sit under the rail ends, clear of the pointer track */
    const strM = Math.max(0, Math.min(1, LF.str / 100)), strU = strM;
    const brgS = String(brgInt(b0)).padStart(3, "0"), brgM = b0 / 360;
    edge(24, 204, ycL, { n: 20, maj: 5, v: strU, mark: strM });
    edge(214, 486, ycL, { off: -6, n: 32, maj: 8, mid: 4, win: [Math.max(0, brgM - 0.04), Math.min(1, brgM + 0.04)], mark: brgM, pip: b1 == null ? null : b1 / 360 });
    dyn(() => { ext.str = [24 + 180 * strM - 4, 24 + 180 * strM + 4, 24, 204]; ext.brg = [214 + 272 * brgM - 4, 214 + 272 * brgM + 4, 214, 486];
      const px = (x0, x1, m, off) => { const x = x0 + (x1 - x0) * m, y = ycL(x) + off; return { l: x - 4, r: x + 4, t: y - 6, b: y - 1.5 }; };
      if (blk === 1) { lbD.push(Object.assign({ s: "strptr" }, px(24, 204, strM, 0)), Object.assign({ s: "brgptr" }, px(214, 486, brgM, -6)));
        if (LF.rep) LF.rep.strFrac = strM; } });
    stat_(() => ["n", "e", "s", "w", "n"].forEach((str, i) => { const x = 214 + 272 * i / 4; mic(str, x + (i === 4 ? -3 : 3), ycL(x) - 6 + 12, { align: i === 4 ? "right" : "left", a: 0.6 }); }));
    dyn(() => { const pad = Math.max(0, (12 - (214 - 204)) / 2);   // the two rail labels keep 12 px between them, each slid toward its own rail end
      const n0 = lbD.length;   // str label above its rail, brg label below its rail
      rd([["str", "m"], [String(LF.str), "n"], ["/100", "m"]], 204 - pad, ycL, -2, "right");
      const n1 = lbD.length;
      rd([["brg", "m"], [brgS, "n"]], 214 + pad, ycL, 26, "left");
      if (blk === 1 && LF.rep) LF.rep.lab = { str: lbD.slice(n0, n1), brg: lbD.slice(n1) }; });
    /* nose resonance on the slope: log axis */
    stat_(() => { [0.001, 0.01, 0.1, 1].forEach(d => { for (let m = 1; m <= (d === 1 ? 1 : 9); m++) tickAt(LS, 1, resF(d * m), m === 1 ? 7 : 3, GOLD, m === 1 ? 0.6 : 0.26); });
      scaleLab(LS, 1, 1, "1", 18); scaleLab(LS, 1, resF(0.1), ".1", -8); scaleLab(LS, 1, resF(0.01), ".01"); scaleLab(LS, 1, 0, ".001", 0); });
    dyn(() => {
      const rn = String(LF.resNow.toFixed(2));
      poly(sub(LS, FT * (1 - uR), FT).concat([[HB0, FL + 0.5]]), GOLD, 0.95, 2);
      const t = tickAt(LS, 1, uR, 9, CREAM, 0.95), x = t[0], y = t[1], nx = t[2], ny = t[3], px = x + nx * 13, py = y + ny * 13;
      poly([[px + nx * 6 - ny * 4, py + ny * 6 + nx * 4], [px, py], [px + nx * 6 + ny * 4, py + ny * 6 - nx * 4]], CREAM, 0.95, 1.5); dot(x, y, 2.5, CREAM, 1);
      const q = at(LS, FT * (1 - resF(D.resNow))), lx = q[0] - q[3] * 21, ly = Math.round(q[1] + q[2] * 21) + 0.5; line(lx, ly, lx - 9, ly, CREAM, 0.9);   // label stays in the sketch slot, the marker rides the slope
      const wv = W_(rn, 16); glow(CREAM, () => text(rn, lx - 17, ly + 6, { size: 16, col: CREAM, a: 1, align: "right" }));
      const dn = ts > s + 1e-6 ? 6 : 0; mic("nose", lx - 17 - wv - dn, ly + 21, { col: CREAM, a: 0.85 }); mic("resonance", lx - 17 - wv - dn, ly + 33, { col: CREAM, a: 0.85 });
    });
    /* field: rose of signal strength by bearing + the lobe's spectrum on the wedge base */
    stat_(() => { [0, 0.05, 0.1, 0.78, 0.84, 1].forEach((t, i, a) => { if (i % 2) return; const x0 = WB[0][0], y0 = WB[0][1], x1 = WB[1][0], y1 = WB[1][1], t1 = a[i + 1];
        line(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, x0 + (x1 - x0) * t1, y0 + (y1 - y0) * t1, GOLD, 0.24); });
      head("field", 24, 806); mic("one source", 24 + W_("field", 9) + 8, 806, { a: 0.8 }); });
    const ox = 76, oy = 850, rr = v => v <= 16 ? 5 + v * 1.9 : Math.min(40, 35.4 * Math.sqrt(v / 16)), FLR = LF.floor;   // past the sketch's str 16 the lobe grows with sqrt, capped at the ring
    const dd = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
    const sv = b => Math.abs(dd(b, b0)) < 0.1 ? LF.str : 2.2 + 2.2 * LF.spectrum[(Math.round(b / 10) % 32 + 32) % 32] + 11 * Math.exp(-Math.pow(dd(b, b0) / 13, 2)) + (b1 == null ? 0 : 2.2 * Math.exp(-Math.pow(dd(b, b1) / 12, 2)));
    const hdrB = () => lbS.filter(r => r.t > 795 && r.t < 812 && r.l < 24 + W_("field", 9) + 8 + W_("one source", 9) + 3);   // header boxes the lobe must clear
    const pt = b => { let r = rr(sv(b)); const a = rad(b - 90), sa = Math.sin(a), x = ox + Math.cos(a) * r;
      hdrB().forEach(h => { if (sa < -0.01 && x > h.l - 6 && x < h.r + 6) r = Math.min(r, (oy - (h.b + 3 + 6)) / -sa); });   // peak plus its glow (6) stays 3 px under the header
      return [ox + Math.cos(a) * r, oy + sa * r]; };
    stat_(() => { arc(ox, oy, rr(FLR), 0, 2 * PI, GREY, 0.95, 1.2, [1, 2.5]); dot(ox, oy, 1.4, GOLD, 0.7);
      line(24.5, 912, 24.5, 933, GOLD, 0.35); });
    dyn(() => {
      arc(ox, oy, rr(LF.str), 0, 2 * PI, GOLD, 0.14);
      [0, 90, 180, 270].forEach(b => { const a = rad(b - 90), r = rr(LF.str); line(ox + Math.cos(a) * (r - 3), oy + Math.sin(a) * (r - 3), ox + Math.cos(a) * r, oy + Math.sin(a) * r, GOLD, 0.45); });
      const L = []; for (let b = 0; b < 360; b += 4) L.push(pt(b)); L.push(L[0]); poly(L, GOLD, 0.55);
      ext.rose = [Math.min(...L.map(p => p[0])), Math.max(...L.map(p => p[0])), Math.min(...L.map(p => p[1])), Math.max(...L.map(p => p[1]))];
      const hot = []; for (let b = b0 - 22; b <= b0 + 22; b += 2) hot.push(pt(b)); glow(CREAM, () => poly(hot, CREAM, 0.95, 1.5));
      if (LF.rep) { const top = Math.min(Math.min(...L.map(p => p[1])) - 0.75, Math.min(...hot.map(p => p[1])) - 6);   // highest painted y of the lobe incl. glow
        LF.rep.lobe = { top: +top.toFixed(1), peak: +Math.max(...hot.map(p => Math.hypot(p[0] - ox, p[1] - oy))).toFixed(1) }; }
      /* the needle stays inside the ring; the bearing number sits outside it, opposite the needle, slid round the ring off the header and the rails' labels */
      const na = rad(b0 - 90), hx = 24 + W_("field", 9) + 8 + W_("one source", 9), hdr = lbS.filter(r => r.t > 795 && r.t < 812 && r.l < hx + 3), tipAt = n => [ox + Math.cos(na) * n, oy + Math.sin(na) * n];
      const inner = Math.min(rr(FLR), rr(LF.str)), north = dd(b0, 0) <= 45;   // near north the needle stops at the inner ring
      let nl = Math.max(2, rr(LF.str) - 4); if (north) nl = Math.min(nl, inner); while (nl > 2 && hdr.some(r => { const q = tipAt(nl); return q[0] > r.l - 3 && q[0] < r.r + 3 && q[1] > r.t - 3 && q[1] < r.b + 3; })) nl -= 0.5;   // tip stays 3 px off the header text
      const tp = tipAt(nl);
      dash([1, 2], () => line(ox, oy, tp[0], tp[1], CREAM, 0.5));
      if (LF.rep) LF.rep.needle = { len: +nl.toFixed(1), ring: +rr(LF.str).toFixed(1), inner: +inner.toFixed(1), north, tip: tp, hdr };
      { const w = W_(brgS, 9), RR = rr(LF.str) + 3, bad = r => (r.t < 810 && r.l < hx + 3) || r.b > 906 || r.r > 124 || r.l < 24;
        const tryAt = d => { const a = rad(b0 + 180 + d - 90), ux = Math.cos(a), uy = Math.sin(a); let R = RR, cx, cy, q;
          for (; R < 90; R += 0.5) { cx = ox + ux * R; cy = oy + uy * R; q = { l: cx - w / 2, r: cx + w / 2, t: cy + 3.5 - 6.75, b: cy + 3.5 + 2 };
            if (Math.hypot(Math.max(q.l - ox, 0, ox - q.r), Math.max(q.t - oy, 0, oy - q.b)) >= RR) break; }
          return { x: cx, y: cy + 3.5, r: q }; };
        let pick = tryAt(0); for (const d of [15, -15, 30, -30, 45, -45, 60, -60, 75, -75, 90, -90, 120, -120, 150, -150, 180]) { if (!bad(pick.r)) break; pick = tryAt(d); }
        if (LF.rep) LF.rep.num = pick.r;
        mic(brgS, pick.x, pick.y, { col: CREAM, a: 0.85, align: "center" }); }
      const x0 = 130, n = 21, st = 4.6, k = 2.6, TOPY = ts > s + 1e-6 ? 822 : 814, PK = 4;
      const lv = i => i === PK ? LF.str : 2.2 + 2.4 * LF.spectrum[(i * 7) % 32] + 10 * Math.exp(-Math.pow((i - PK) / 1.1, 2)) + 2.6 * Math.exp(-Math.pow((i - 12) / 1.0, 2));
      let pk;
      for (let i = 0; i < n; i++) { const x = Math.round(x0 + i * st) + 0.5, yb = wbY(x) - 3, v = lv(i), h = Math.min(v * k, yb - TOPY), up = v > FLR;
        if (i === PK) { glow(CREAM, () => line(x, yb, x, yb - h, CREAM, 0.95, 1.6)); pk = [x, yb - h]; }
        else line(x, yb, x, yb - h, GOLD, up ? 0.75 : 0.3, up ? 1.2 : 1); }
      const xe = x0 + (n - 1) * st;
      dash([1, 3], () => line(x0 - 2, wbY(x0 - 2) - 3 - FLR * k, xe + 2, wbY(xe + 2) - 3 - FLR * k, GREY, 0.6));
      mic("floor", xe + 6, wbY(xe + 6) - FLR * k, { a: 0.8 });
      glow(CREAM, () => poly([[pk[0] - 4, pk[1] - 9], [pk[0], pk[1] - 4.5], [pk[0] + 4, pk[1] - 9]], CREAM, 0.95, 1.5)); shape("chev:peak", pk[0] - 4, pk[1] - 9, pk[0] + 4, pk[1] - 4.5);
      rv("peak", String(LF.str), pk[0] + 8, pk[1] - 3, "left");
      rv("width", LF.width, 30, 919, "left");
      if (b1 != null) { const s2 = String(Math.round(b1)).padStart(3, "0"); rv("2nd", s2, 30, 930, "left"); mic("faint", 30 + W_("2nd", 9) + 4 + W_(s2, 10) + 6, 930, { a: 0.6 }); }
    });
    /* lamp bank: two rows of 7 */
    const LX = [168, 218, 268, 322, 372, 422, 468];
    dyn(() => LF.lampsL.forEach((l, i) => lamp(LX[i % 7], i < 7 ? 975 : 989, l[0], l[1], "d")));
    /* motion band: speed gauge round the radar */
    const r0 = 74, r1 = 90, a0 = 135, a1 = 300;
    stat_(() => {
      arc(RX, RY, r1, rad(a0), rad(a1), GOLD, 0.7); arc(RX, RY, r0, rad(a0), rad(a1), GOLD, 0.3);
      arc(RX, RY, (r0 + r1) / 2, rad(a0 + 4), rad(a1 - 4), GOLD, 0.14, 1, [1, 3]);
      arc(RX, RY, r1 + 7, rad(150), rad(285), GOLD, 0.14, 1, [2, 4]);
      [150, 285].forEach(d => { const p0 = pol(RX, RY, r1 + 4, d), p1 = pol(RX, RY, r1 + 10, d); line(p0[0], p0[1], p1[0], p1[1], GOLD, 0.3); });
      [a0, a1].forEach(d => { const p0 = pol(RX, RY, r0 - 3, d), p1 = pol(RX, RY, r1 + 3, d); line(p0[0], p0[1], p1[0], p1[1], GOLD, 0.55); });
      arcScale(RX, RY, r1, a0, a1, 2.5, 12, { mid: 3, LM: 7, aM: 0.55 });
    });
    dyn(() => {
      const d = a0 + (a1 - a0) * LF.speedAt, p = pol(RX, RY, r1 + 4, d), pi = pol(RX, RY, r1 + 9, d - 2), po = pol(RX, RY, r1 + 9, d + 2); poly([pi, p, po], GOLD, 0.45);
      poly(LF.speed.map((v, i) => pol(RX, RY, r0 - 3 - v * 60, a0 + (a1 - a0) * i / (LF.speed.length - 1))), GOLD, 0.45);
      const p0 = pol(RX, RY, r0 - 2, a0 + 1.2), p1 = pol(RX, RY, r1 + 8, a0 + 1.2); glow(CREAM, () => line(p0[0], p0[1], p1[0], p1[1], CREAM, 1, 2));
    });
    /* radar disc (own painter: rings, cross, sweep, blips) + pull ball + contact bracket */
    stat_(() => {
      [1 / 3, 2 / 3, 1].forEach((f, i) => arc(RX, RY, 62 * f, 0, 2 * PI, GOLD, i === 2 ? 0.45 : 0.22));
      for (let d = 0; d < 360; d += 5) { const L = d % 30 === 0 ? 8 : 3, p0 = pol(RX, RY, 62, d), p1 = pol(RX, RY, 62 + L, d);
        line(p0[0], p0[1], p1[0], p1[1], GOLD, d % 30 ? 0.22 : 0.45); }
      arc(RX, RY, 62, 0, 2 * PI, GOLD, 0.35);
      arc(RX, RY, 25, 0, 2 * PI, GOLD, 0.35); arc(RX, RY, 12.5, 0, 2 * PI, GOLD, 0.12, 1, [2, 4]);
      arc(RX, RY, 66, rad(-40), rad(120), GOLD, 0.15, 1, [1, 3]); });
    dyn(() => {
      const sw = LF.sweep;
      for (let i = 1; i < 6; i++) { const a = sw - i * 0.05; line(RX, RY, RX + Math.cos(a) * 62, RY + Math.sin(a) * 62, GOLD, 0.3 * (1 - i / 6)); }
      line(RX, RY, RX + Math.cos(sw) * 62, RY + Math.sin(sw) * 62, GOLD, 0.85);
      LF.blips.forEach((b, i) => { const x = RX + b[0] * 62, y = RY + b[1] * 62;
        dot(x, y, i ? 1.8 : 2.4, i ? GREY : CREAM, i ? 0.7 : 1); if (!i) arc(x, y, 6, 0, 6.2832, CREAM, 0.7); });
      line(RX - 5, RY + 0.5, RX + 5, RY + 0.5, GOLD, 0.6); line(RX + 0.5, RY - 5, RX + 0.5, RY + 5, GOLD, 0.6); dot(RX, RY, 1.5, CREAM, 1);
      LF.beacons.forEach(b => arc(RX + b[0] * 25, RY + b[1] * 25, 2.2, 0, 6.2832, GREY, 0.7));
      if (LF.ball) { const bx = RX + LF.ball[0] * 25, by = RY + LF.ball[1] * 25, l = Math.hypot(LF.ball[0], LF.ball[1]), ux = LF.ball[0] / l, uy = LF.ball[1] / l;
        line(RX, RY, bx, by, GOLD, 0.3); arc(bx, by, 4, 0, 6.2832, CREAM, 0.95, 1.5);
        for (let k = 0; k < 2; k++) { const px = bx + ux * (12 + k * 6), py = by + uy * (12 + k * 6);
          poly([[px - uy * 4 - ux * 3, py + ux * 4 - uy * 3], [px, py], [px + uy * 4 - ux * 3, py - ux * 4 - uy * 3]], GOLD, 0.7 - k * 0.3); } }
      const b = LF.blips[0] || [0, -0.5], bx = RX + b[0] * 62, by = RY + b[1] * 62, rr2 = Math.hypot(b[0], b[1]) * 62, ab = Math.atan2(b[1], b[0]);
      arc(RX, RY, rr2, ab - 0.32, ab + 0.32, CREAM, 0.45, 1, [2, 2]);
      poly([[bx + 6, by + 4], [bx + 30, by + 30], [404, by + 30]], CREAM, 0.4);
      for (let i = 0; i < 6; i++) dot(408 + i * 7, by + 30.5, 1.6, i < LF.contacts ? CREAM : GOLD, i < LF.contacts ? 1 : 0.2);
      num(LF.near, 404, by + 50, { size: 11 }); mic("contact", 404, by + 63, { a: 0.8 });
    });
    paintDrift();
    paintOutside();
  }

  function paintDrift() {
    const cx = 120, cy = 962, r = 11, xg = pol(RX, RY, 93, 135)[0] - 3, yr = wbY(cx) + 2, M = 46;
    stat_(() => {
      arc(cx, cy, r, 0, 2 * PI, GOLD, 0.5); arc(cx, cy, r + 5, rad(200), rad(250), GOLD, 0.25);
      line(24, cy + 0.5, cx - r - 4, cy + 0.5, GOLD, 0.35); line(cx + r + 4, cy + 0.5, xg - 2, cy + 0.5, GOLD, 0.35);
      for (let i = -13; i <= 17; i++) { if (Math.abs(i) < 3) continue; const x = cx + i * 7 + 0.5; if (x < 24 || x > xg - 4) continue; line(x, cy, x, cy - (i % 3 ? 2 : 4), GOLD, i % 3 ? 0.2 : 0.45); }
      line(cx + 0.5, yr, cx + 0.5, cy - r - 4, GOLD, 0.35); line(cx + 0.5, cy + r + 4, cx + 0.5, 1000, GOLD, 0.35);
      dot(xg, cy, 1.6, GOLD, 0.7); dot(cx, yr, 1.6, GOLD, 0.7); head("drift", 24, cy - 8, { a: 0.85 });
    });
    dyn(() => {
      const lat = LF.lat, vert = LF.vert, ang = Math.atan2(-vert, lat);
      /* 46 px per m/s as the sketch, the 5 s point held inside the reticle's ring (104 px, and the rails' own ends); an arrowhead at the ring when clipped */
      let dx = lat * M, dy = -vert * M, k = Math.min(1, 104 / Math.max(1e-6, Math.hypot(dx, dy) * 5));
      if (dx > 0) k = Math.min(k, (xg - 6 - cx) / (dx * 5)); else if (dx < 0) k = Math.min(k, (cx - 28) / (-dx * 5));
      if (dy < 0) k = Math.min(k, (cy - yr - 4) / (-dy * 5)); else if (dy > 0) k = Math.min(k, 30 / (dy * 5));
      const clip = k < 1; dx *= k; dy *= k;
      const D5 = Math.hypot(dx, dy) * 5;
      ext.drift = [cx + Math.min(0, dx * 5) - 3, cx + Math.max(0, dx * 5) + 3, cy + Math.min(0, dy * 5) - 3, cy + Math.max(0, dy * 5) + 3];
      const mv = Math.hypot(lat, vert) * 5, mt = mv >= 9.95 ? "9.9+" : mv.toFixed(1);   // over the slot clamps to its max text
      const rbx = { l: 146 - 3, r: 146 + Math.max(W_(mt + " m", 12), W_("off in 5 s", 9)) + 3, t: 884 - 0.75 * 12 - 3, b: 897 + 0.22 * 9 + 3 };   // readout box: the path never strikes it
      c.save(); c.beginPath(); c.rect(0, 700, 800, 400); c.rect(rbx.l, rbx.t, rbx.r - rbx.l, rbx.b - rbx.t); c.clip("evenodd");
      [-0.17, 0.17].forEach(e => dash([2, 3], () => line(cx + Math.cos(ang + e) * (r + 4), cy + Math.sin(ang + e) * (r + 4), cx + Math.cos(ang + e) * D5, cy + Math.sin(ang + e) * D5, GOLD, 0.4)));
      arc(cx, cy, D5, ang - 0.17, ang + 0.17, GOLD, 0.45);
      dash([1, 3], () => line(cx + dx, cy + dy, cx + dx * 5, cy + dy * 5, CREAM, 0.7));
      for (let t = 2; t <= 5; t++) { const x = cx + dx * t, y = cy + dy * t, nx = -Math.sin(ang), ny = Math.cos(ang); line(x - nx * 3, y - ny * 3, x + nx * 3, y + ny * 3, CREAM, t === 5 ? 0.95 : 0.6, t === 5 ? 1.4 : 1); }
      glow(CREAM, () => dot(cx + dx * 5, cy + dy * 5, 2.4, CREAM, 1));
      if (clip) { const ex = cx + dx * 5, ey = cy + dy * 5; glow(CREAM, () => poly([[ex - 6 * Math.cos(ang - 0.45), ey - 6 * Math.sin(ang - 0.45)], [ex, ey], [ex - 6 * Math.cos(ang + 0.45), ey - 6 * Math.sin(ang + 0.45)]], CREAM, 1, 1.5)); }
      glow(CREAM, () => { const px = cx + dx, py = cy + dy; line(cx, cy, px, py, CREAM, 1, 1.6);
        poly([[px - 6 * Math.cos(ang - 0.45), py - 6 * Math.sin(ang - 0.45)], [px, py], [px - 6 * Math.cos(ang + 0.45), py - 6 * Math.sin(ang + 0.45)]], CREAM, 1, 1.5); });
      [1, 2].forEach(t => dot(cx - Math.max(-30, Math.min(30, dx * t * 0.9)), cy - Math.max(-24, Math.min(24, dy * t * 0.9)) + 2 * t, 2.8, GOLD, 1.05 - 0.2 * t));
      c.restore();
      glow(CREAM, () => dot(cx, cy, 2.2, CREAM, 1));
      glow(CREAM, () => text(mt + " m", 146, 884, { size: 12, col: CREAM, a: 1 })); mic("off in 5 s", 146, 897, { a: 0.8 });
      const sg = v => (v >= 0 ? "+" : "\u2212") + (Math.abs(v) >= 9.995 ? "9.9+" : Math.abs(v).toFixed(2));
      if (blk === 1 && LF.rep) { const ex = cx + dx * 5, ey = cy + dy * 5, n = Math.max(1, Math.ceil(Math.hypot(ex - cx, ey - cy) / 2)); let raw = 0;
        for (let i = 0; i <= n; i++) { const px = cx + (ex - cx) * i / n, py = cy + (ey - cy) * i / n; if (px >= rbx.l && px <= rbx.r && py >= rbx.t && py <= rbx.b) raw++; }
        LF.rep.drift = { raw, hits: 0 }; }   // raw = samples inside the box that the clip removes; hits = samples left visible
      if (blk === 1 && LF.rep) LF.rep.driftTxt = { main: mt, lat: sg(lat), vert: sg(vert) };
      rv("lat", sg(lat), xg - 16, cy - 7, "right"); rv("vert", sg(vert), cx - 6, 997, "right");
    });
  }

  /* outside row: rad, g, ext */
  function paintOutside() {
    const yF = FL + 1, LY = 987, lv = (k, v, cx) => { mic(k, cx, LY, { align: "center" }); text(v, cx, LY + 13, { size: 10, col: CREAM, a: 0.95, align: "center" }); };
    stat_(() => lab("outside", 572 - (ts > s + 1e-6 ? 12 : 0), LY, { col: CREAM, a: 0.7, size: 9 }));
    { const cx = 642, cy = 965.5, ri = 2, ro = 6;
      stat_(() => { [270 - 60, 270 + 60, 90].forEach(m => { c.beginPath(); c.arc(cx, cy, ro, rad(m - 30), rad(m + 30)); c.arc(cx, cy, ri, rad(m + 30), rad(m - 30), true); c.closePath();
          c.strokeStyle = rgba(GOLD, 0.85); c.lineWidth = 1.2; c.lineJoin = "round"; c.stroke(); }); arc(cx, cy, 6.8, 0, 2 * PI, GOLD, 0.12, 1, [1, 2]); });
      dyn(() => { dot(cx, cy, 1.2, CREAM, 0.9); lv("rad", LF.dose, cx); }); }
    { const cx = 698, cy = 968.5, r = 5.5, a = Math.min(8, Math.abs(+LF.g) * 13) * (+LF.g < 0 ? 1 : -1);
      stat_(() => { line(cx + 0.5, yF, cx + 0.5, cy - r - 2, GOLD, 0.3); arc(cx, cy, r, 0, 2 * PI, GOLD, 0.3); arc(cx, cy, r + 2, 0, 2 * PI, GOLD, 0.12, 1, [1, 2]); });
      dyn(() => {
        glow(GOLD, () => arc(cx, cy, r + 2, rad(-90), rad(-90 + LF.gFlip * 360), GOLD, 0.85, 1.5));
        glow(CREAM, () => { line(cx + 0.5, cy, cx + 0.5, cy - a, CREAM, 1, 1.5); poly([[cx - 3, cy - a + 3], [cx + 0.5, cy - a - 1], [cx + 4, cy - a + 3]], CREAM, 1, 1.2); });
        dash([1, 2], () => { line(cx + 0.5, cy, cx + 0.5, cy + a, GOLD, 0.5); poly([[cx - 3, cy + a - 3], [cx + 0.5, cy + a + 1], [cx + 4, cy + a - 3]], GOLD, 0.5); });
        ext.g = [cx - 4, cx + 4, cy - a - 1, cy + a + 1];
        dot(cx, cy, 1.6, CREAM, 0.9); lv("g", LF.g, cx); }); }
    { const cx = 752, y0 = 971, y1 = 959, n = 8, Hh = y0 - y1, f = (LF.hullTv + 100) / 200, lit = Math.round(f * n);
      stat_(() => line(cx + 0.5, yF, cx + 0.5, y1 - 1, GOLD, 0.3));
      dyn(() => {
        for (let i = 0; i < n; i++) { const y = Math.round(y0 - i * Hh / (n - 1)) + 0.5; line(cx - 3, y, cx + 4, y, GOLD, i < lit ? (i === lit - 1 ? 0.95 : 0.65) : 0.12); }
        const yz = Math.round(y0 - Hh / 2) + 0.5; line(cx - 8, yz, cx - 4, yz, GOLD, 0.6); mic("0", cx - 10, yz + 3, { align: "right", a: 0.7 });
        const ym = y0 - f * Hh; poly([[cx + 11, ym - 3], [cx + 7, ym], [cx + 11, ym + 3]], CREAM, 0.95, 1.2);
        lv("ext", LF.hullT, cx); });
    }
  }

  /* ======================= RIGHT WING ======================= */
  function paintRight() {
    const RT = len(RS), x0f = 2000 - HB0;
    stat_(() => {
      poly(half([[x0f, FL]].concat(RS.slice().reverse())), GOLD, STRUCT);
      line(x0f, FL + 0.5, XR, FL + 0.5, GOLD, STRUCT); line(XR + 0.5, FL, XR + 0.5, FL + 9, GOLD, STRUCT);
      for (let i = 0; i <= 10; i++) tickAt(RS, -1, i / 10, i % 5 === 0 ? 7 : 3, GOLD, i % 5 === 0 ? 0.6 : 0.3);
      scaleLab(RS, -1, 1, "100", 26); scaleLab(RS, -1, 0.5, "50"); scaleLab(RS, -1, 0, "0", 0);
    });
    /* rails: volts, bus, cabin */
    edge(1514, 1594, ycR, { join: "L", n: 8, maj: 4, v: (RF.volt - 24) / 8, mark: (RF.volt - 24) / 8 });
    edge(1604, 1870, ycR, { off: -6, n: 24, maj: 4, mid: 2, v: Math.min(1, RF.bus / 6), mark: Math.min(1, RF.bus / 6) });
    const tc = v => (v - 10) / 20;
    edge(1880, 1976, ycR, { n: 20, maj: 10, mid: 5, v: tc(RF.cabin), mark: tc(RF.cabin) });
    stat_(() => { const xa = 1880 + 96 * tc(18), xb = 1880 + 96 * tc(24); dash([1, 2], () => line(xa, ycR(xa) + 9, xb, ycR(xb) + 9, CREAM, 0.6)); });
    dyn(() => {
      rd([[RF.volt.toFixed(1), "n"], ["V", "m"]], 1516, ycR, ts > s + 1e-6 ? -2 : 0, "left");
      rd([["bus", "m"], [RF.bus.toFixed(1), "n"], ["kW", "m"]], 1606, ycR, -6, "left");
      rd([["cabin", "m"], [RF.cabin.toFixed(1) + "\u00b0", "n"]], 1976, ycR, 0, "right");
    });
    /* cells */
    dyn(() => { const lo = Math.min.apply(null, RF.cells), y = x => ycR(x) + 4;
      RF.cells.forEach((v, i) => { const xa = 1516 + i * 10, xb = xa + 7, Hh = 11, weak = v === lo, col = weak ? CREAM : GOLD;
        poly([[xa + 0.5, y(xa) + Hh], [xa + 0.5, y(xa)], [xb + 0.5, y(xb)], [xb + 0.5, y(xb) + Hh], [xa + 0.5, y(xa) + Hh]], col, weak ? 0.8 : 0.55);
        const f = (v - 3.3) / 0.4, ly = (xa + xb) / 2, yy = y(ly) + Hh - 1 - f * (Hh - 3);
        c.fillStyle = rgba(col, weak ? 0.3 : 0.18); c.fillRect(xa + 1.5, yy, xb - xa - 2, y(ly) + Hh - yy - 0.5);
        line(xa + 1.5, yy, xb - 0.5, yy, col, weak ? 0.95 : 0.8, 1.2); }); });
    /* bus split */
    /* the row always spans the rail 1604..1870 as a stacked bar on the rail's 0..6 kW scale: the filled part S (bus / 6, at most the rail) is split by kW (live: drv, thm, life as lsp, gnc),
       a load under its label width is pinned to the label and the rest share what is left in proportion to their kW (water-filling), so the widths sum to S;
       spare (no model: the rest of the 6 kW) gets what is left, at least its label and number wide */
    { const RX0 = 1604, RW = 266, y = x => ycR(x) - 6 + 9, Hh = 10;
      const box = (xa, xb, a) => poly([[xa, y(xa)], [xb, y(xb)], [xb, y(xb) + Hh], [xa, y(xa) + Hh], [xa, y(xa)]], GOLD, a);
      dyn(() => { const ls = RF.loads, mw = ls.map(l => W_(l[0], 9) + 5), spMin = W_("spare", 9) + W_("0.0", 9) + 14;
        const S = Math.max(mw.reduce((a, b) => a + b, 0), Math.min(RW - spMin, RW * Math.min(1, RF.bus / 6)));
        const pin = ls.map(() => false), ws = mw.slice();
        for (let p = 0; p < 5; p++) { let pf = 0, pk = 0, pn = 0, ch = false;
          ls.forEach((l, i) => { if (pin[i]) pf += mw[i]; else { pk += l[1]; pn++; } });
          ls.forEach((l, i) => { if (pin[i]) return; ws[i] = pk > 0 ? (S - pf) * l[1] / pk : (S - pf) / pn; if (ws[i] < mw[i] - 1e-9) { pin[i] = true; ws[i] = mw[i]; ch = true; } });
          if (!ch) break; }
        let xc = RX0;
        ls.forEach((l, i) => { const w = ws[i], xa = xc + 0.5, xb = xc + w - 1.5; box(xa, xb, 0.42);
          const xm = (xa + xb) / 2; mic(l[0], xm - W_(l[0], 9) / 2 - (i === ls.length - 1 && ts > s + 1e-6 ? 3 : 0), Math.round(y(xm) + 8), { a: 0.8 }); xc += w; });
        dash([1, 2], () => box(xc + 0.5, RX0 + RW, 0.22));
        const xs = xc + 4 + (ts > s + 1e-6 ? 4 : 0), sp = Math.max(0, 6 - RF.bus).toFixed(1); mic("spare", xs, Math.round(y(xs) + 8), { a: 0.55 }); text(sp, xs + W_("spare", 9) + 4, Math.round(y(xs) + 8), { size: 9, col: GOLD, a: 0.7 });
        busEnd = { rail: RX0 + RW, row: RX0 + RW, txtR: xs + W_("spare", 9) + 4 + W_(sp, 9) }; }); }
    /* cabin trace */
    { const xa = 1882, xb = 1970, yT = 790, yB = 806, Y = v => yB - (v - 20) / 2 * (yB - yT);
      stat_(() => { line(xa, yB + 0.5, xb, yB + 0.5, GOLD, 0.3);
        for (let i = 0; i <= 6; i++) { const x = Math.round(xa + (xb - xa) * i / 6) + 0.5; line(x, yB + 1, x, yB + (i % 3 ? 2.5 : 4), GOLD, i % 3 ? 0.2 : 0.45); }
        dash([1, 2], () => line(xa, Math.round(Y(21)) + 0.5, xb, Math.round(Y(21)) + 0.5, GOLD, 0.35));
        line(xb + 1, Math.round(Y(21)) + 0.5, xb + 5, Math.round(Y(21)) + 0.5, CREAM, 0.9); mic("30m", xa - (ts > s + 1e-6 ? 6 : 0), yB + 13, { a: 0.55 }); });
      dyn(() => { const raw = RF.cabTrace, n = raw.length - 1, pts = raw.map((v, i) => { let a = 0, m = 0; for (let j = Math.max(0, i - 7); j <= Math.min(n, i + 7); j++) { a += raw[j]; m++; } return a / m; });   /* 15-sample mean: the 30 s samples read as a slow wave, not a zigzag */
        glow(GOLD, () => poly(pts.map((v, i) => [xa + (xb - xa) * i / n, Y(v)]), GOLD, 0.85, 1));
        dot(xb, Y(pts[n]), 1.6, CREAM, 1); mic("set " + RF.cabSet.toFixed(1), xb + (ts > s + 1e-6 ? 6 : 0), yB + 13, { align: "right", a: 0.7 }); }); }
    /* fuel on the slope */
    dyn(() => {
      poly(sub(RS, RT * (1 - RF.fuel), RT).concat([[x0f, FL + 0.5]]), GOLD, 0.95, 2);
      const t = tickAt(RS, -1, RF.fuel, 9, CREAM, 0.95), x = t[0], y = t[1], nx = t[2], ny = t[3], px = x + nx * 13, py = y + ny * 13;
      poly([[px + nx * 6 - ny * 4, py + ny * 6 + nx * 4], [px, py], [px + nx * 6 + ny * 4, py + ny * 6 - nx * 4]], CREAM, 0.95, 1.5); dot(x, y, 2.5, CREAM, 1);
      const lx = x + nx * 21, ly0 = Math.round(y + ny * 21) + 0.5; line(lx, ly0, lx + 9, ly0, CREAM, 0.9);
      /* the number stack stays where the sketch puts it (the sample's 72 %), below the cells, whatever the fuel */
      const q72 = at(RS, RT * (1 - 0.72)), ly = Math.round(q72[1] - q72[2] * 21) + 0.5;
      const fx = 1536;
      big(Math.round(RF.fuel * 100) + " %", fx - (ts > s + 1e-6 ? 30 : 6), ly + 8);   // the number steps left off the ship's tail point (more where the text has grown); the rest of the stack stays
      const t0 = RF.left.split(" ")[0]; lab("fuel", fx, ly + 24); text(t0, fx, ly + 37, { size: 10, col: CREAM, a: 0.95 }); if (RF.left.indexOf(" ") > 0) { const gr = ts > s + 1e-6; mic("left", gr ? fx : fx + W_(t0, 10) + 4, gr ? ly + 48 : ly + 37, { a: 0.8 }); }   // grown text: "left" drops to its own line so the countdown stays clear of the ship
    });
    /* thrust heat on the right floor */
    { const x0 = x0f, x1 = XR, w = x0 - x1, yT = FL, Hh = 6;
      stat_(() => { line(x1, yT + Hh + 0.5, x0, yT + Hh + 0.5, GOLD, 0.3);
        for (let i = 0; i <= 10; i++) { const x = Math.round(x0 - w * i / 10) + 0.5, maj = i % 5 === 0; line(x, yT + Hh + 1, x, yT + Hh + (maj ? 3 : 2), GOLD, maj ? 0.5 : 0.25); }
      });
      dyn(() => { mic("hot " + Math.round(RF.hot * 100), x1 + (ts > s + 1e-6 ? -9 : 16), 984, { col: CREAM, a: 0.95 });
        const xt = x0 - w * RF.thrust, xh = x0 - w * RF.hot;
        for (let x = x0 - 2; x > x1 + 1; x -= 3) { const on = x > xt, hot = x <= xh;
          const f = () => line(x - 0.5, yT + Hh, x - 2.5, yT + 1, on ? GOLD : hot ? CREAM : GOLD, on ? (x - xt < 4 ? 1 : 0.8) : hot ? 0.3 : 0.12);
          on ? glow(GOLD, f) : f(); }
        dash([1, 2], () => line(x1, yT + Hh + 5.5, xh, yT + Hh + 5.5, CREAM, 0.6));
        shape("heat bar", xt, yT - 1, x0, yT + Hh + 6); shape("heat hot", x1, yT + Hh + 4.5, xh, yT + Hh + 6.5);   // the filled bar and the hot dash count against text in report().textHits
        glow(CREAM, () => line(Math.round(xt) + 0.5, yT - 1, Math.round(xt) + 0.5, yT + Hh + 2, CREAM, 1, 1.5));
        line(Math.round(xh) + 0.5, yT - 1, Math.round(xh) + 0.5, yT + Hh + 3, CREAM, 0.9);
        const tv = Math.round(RF.thrust * 100) + " %"; text(tv, x0 - (ts > s + 1e-6 ? 1 : 10), 984, { size: 12, col: CREAM, a: 1, align: "right" });
        if (ts > s + 1e-6) lab("thrust heat", x0 - 1, 946, { align: "right" });   // grown text: the label sits above the bar (the fill and the hot dash run under it), off the row the readings share
        else lab("thrust heat", x0 - 10 - W_(tv, 12) - 8, 984, { align: "right" }); }); }
    paintShip();
    paintLife();
    dyn(() => RF.lampsR.forEach((l, i) => lamp(1440 + (i % 7) * 56, i < 7 ? 975 : 989, l[0], l[1], "o")));
  }

  /* ship side view + hull stress strip + p / rh (right wing, upper) */
  function paintShip() {
    const L = 142, X = 1608 + 0.52 * L, Y = 874, P = ([u, v]) => [X + u * L, Y + v * L], S = pts => pts.map(P);
    const ol = (pts, a, w, close) => glow(GOLD, () => poly(S(pts), GOLD, a, w, close));
    stat_(() => {
      head("ship", 1546, 926); mic("hull", 1546, 939, { a: 0.8 });
      poly([[1546 + W_("ship", 10) + 6, 922.5], [1592, 922.5], [1606, 905]], CREAM, 0.75, 1.1); dot(1606, 905, 1.8, CREAM, 0.95);
      ol([[0.36, -0.13], [0.26, -0.13], [-0.04, -0.125], [-0.36, -0.125], [-0.36, 0.115], [-0.04, 0.115], [0.26, 0.10], [0.36, 0.10]], 0.8, 1.1, false);
      ol([[-0.36, -0.10], [-0.45, -0.10], [-0.52, -0.08], [-0.52, 0.07], [-0.45, 0.09], [-0.36, 0.09]], 0.8, 1.1);
      poly(S([[-0.49, -0.085], [-0.49, 0.075]]), GOLD, 0.3);
      ol([[0.064, -0.125], [-0.16, -0.28], [-0.47, -0.31], [-0.42, -0.10]], 0.75, 1.1);
      ol([[0.121, 0.115], [-0.14, 0.35], [-0.30, 0.355], [-0.48, 0.37], [-0.42, 0.09]], 0.75, 1.1);
      poly(S([[-0.02, -0.125], [-0.08, -0.205], [-0.28, -0.205], [-0.32, -0.125]]), GOLD, 0.6, 1);
      poly(S([[0.30, -0.13], [0.30, -0.104], [0.36, -0.095]]), GOLD, 0.45); poly(S([[0.10, -0.125], [0.10, -0.15], [0.16, -0.15], [0.16, -0.125]]), GOLD, 0.45);
      poly(S([[0.34, 0.10], [0.335, 0.17], [0.195, 0.17], [0.135, 0.125]]), GOLD, 0.55);
      glow(GOLD, () => poly(S([[0.36, -0.12], [0.44, -0.12], [0.50, -0.155], [0.572, -0.153], [0.59, -0.283], [0.66, -0.283], [0.678, -0.147], [0.9055, -0.134], [0.932, -0.189], [0.967, -0.186], [0.9745, -0.132], [1.30, -0.105], [1.292, -0.015], [1.05, 0.03], [0.90, 0.075], [0.66, 0.13], [0.50, 0.14], [0.44, 0.085], [0.36, 0.085]]), GOLD, 0.95, 1.3));
      { const rp = P([0.43, -0.015]); c.save(); c.translate(rp[0], rp[1]); c.scale(0.03 / 0.13, 1); arc(0, 0, 0.13 * L, PI / 2 + 0.8, PI / 2 - 0.8 + 2 * PI, GOLD, 0.75, 1.1); c.restore(); }
      mic("fin", 1619, 826, { a: 0.8 });
      shape("ship", X - 0.52 * L, Y - 0.125 * L, X + 1.30 * L, Y + 0.115 * L);
    });
    dyn(() => {
      text(String(RF.hullInt),1546 + W_("hull", 9) + 5, 939, { size: 10, col: CREAM, a: 0.95 });
      text(String(RF.fin),1619 + W_("fin", 9) + 4, 826, { size: 10, col: CREAM, a: 0.95 });
      /* p and rh */
      const y = 836, gc = 832; let x = 1700;
      const R = 7, px = x + R, rp = Math.max(0.5, R + (+RF.p - 101.3) * 4); x += 2 * R + 4;
      arc(px, gc, R, 0, 2 * PI, GOLD, 0.35, 1, [1, 2]); glow(GOLD, () => arc(px, gc, rp, 0, 2 * PI, GOLD, 0.85, 1.2)); dot(px, gc, 1.2, GOLD, 0.6);
      mic("p", x, y); text(RF.p, x + W_("p", 9) + 4, y, { size: 10, col: GOLD, a: 0.95 }); x += W_("p", 9) + 4 + W_(RF.p, 10) + 16;
      const r = 5, dx = x + r, dy = 836, tip = 823, bot = dy + r;
      poly([[dx - r * Math.cos(rad(30)), dy - r * Math.sin(rad(30))], [dx, tip], [dx + r * Math.cos(rad(30)), dy - r * Math.sin(rad(30))]], GOLD, 0.6);
      arc(dx, dy, r, rad(-30), rad(210), GOLD, 0.6);
      const lvl = bot - (bot - tip) * RF.rhv; for (let yy = bot - 2; yy > tip + 2; yy -= 2) { const h = yy > dy - r * 0.5 ? Math.sqrt(Math.max(0, r * r - (yy - dy) * (yy - dy))) - 1.5 : (yy - tip) * 0.55 - 1;
        if (h > 0.5) line(dx - h, yy + 0.5, dx + h, yy + 0.5, GOLD, yy >= lvl ? 0.7 : 0.1); }
      x += 2 * r + 5; mic("rh", x, y); text(RF.rh, x + W_("rh", 9) + 4, y, { size: 10, col: GOLD, a: 0.95 });
    });
    /* hull stress along the length, same x as the ship: 0 at B0, the limit (1.0) at B1 */
    const B0 = 963, B1 = 938, u0 = -0.52, u1 = 1.30, ys = v => B0 - (B0 - B1) * v;
    stat_(() => {
      line(X + u0 * L, B0 + 0.5, X + u1 * L, B0 + 0.5, GOLD, 0.25);
      dash([3, 3], () => line(X + u0 * L, B1 + 0.5, X + u1 * L, B1 + 0.5, CREAM, 0.5));
      mic("lim", X + u1 * L, B1 - 5, { a: 0.75, align: "right" });
      head("hull stress", X + u0 * L - 16, B0 - 4, { align: "right", a: 0.85 });
      glow(CREAM, () => { poly(S([[0.30, -0.13], [0.36, -0.13], [0.36, -0.12], [0.44, -0.12]]), CREAM, 0.95, 1.7);
        poly(S([[0.30, 0.10], [0.36, 0.10], [0.36, 0.085], [0.44, 0.085]]), CREAM, 0.95, 1.7); });
      [[-0.32, 0.115], [-0.08, 0.115], [0.43, 0.085]].forEach(([u, v]) => { const x = Math.round(X + u * L) + 0.5, yy = Y + v * L; glow(CREAM, () => line(x - 0.5, yy - 3.5, x - 0.5, yy + 4.5, CREAM, 0.95, 2)); });
    });
    dyn(() => {
      const pts = RF.stress.map((v, i) => [X + (u0 + i * 0.01) * L, ys(v)]), pk = RF.stress.indexOf(Math.max.apply(null, RF.stress)), kx = pts[pk][0], ky = pts[pk][1];
      glow(GOLD, () => poly(pts, GOLD, 0.9, 1.2));
      dash([1, 3], () => line(kx + 0.5, Y + 0.10 * L + 3, kx + 0.5, ky - 4, CREAM, 0.55));
      glow(CREAM, () => dot(kx, ky, 2, CREAM, 1)); num(Math.round(RF.stress[pk] * 100) + " %", kx + 6, B1 - 5, { size: 11 }); });
  }

  /* life fan: o2 and co2 slit arcs */
  function paintLife() {
    const CX = 1980, CY = 956;
    stat_(() => {
      [90, 62].forEach(r => { line(CX - r + 0.5, CY + 3, CX - r + 0.5, CY + 6, GOLD, 0.5); line(CX - r + 0.5, CY + 6, CX - r + 0.5, 980, GOLD, 0.35); });
      arc(CX, CY, 97, rad(184), rad(266), GOLD, 0.12, 1, [1, 3]);
      line(CX - 96, CY + 0.5, CX - 2, CY + 0.5, GOLD, 0.18);
      head("life", 1976, 858, { align: "right", a: 0.85 });
    });
    dyn(() => {
      [[RF.o2v, 90], [RF.co2v, 62]].forEach(([v, r]) => { const n = Math.max(6, Math.floor(r * PI / 2 / 4)), lit = Math.round(v * n);
        for (let j = 0; j < n; j++) { const d = 180 + (j + 0.5) / n * 90, on = j < lit, a = pol(CX, CY, r - 3, d), b = pol(CX, CY, r + 3, d);
          line(a[0], a[1], b[0], b[1], GOLD, on ? (j === lit - 1 ? 0.9 : 0.6) : 0.12); }
        const e = pol(CX, CY, r + 6, 180 + 90 * v), i = pol(CX, CY, r + 10, 180 + 90 * v); line(e[0], e[1], i[0], i[1], CREAM, 0.95); });
      const w = W_((+RF.o2).toFixed(1), 11); mic("o2", 1886 - w - 4, 994, { align: "right", col: CREAM, a: 0.9 }); num((+RF.o2).toFixed(1), 1886, 994, { align: "right", size: 11 });
      mic("co2", 1906, 994, { col: CREAM, a: 0.9 }); num(RF.co2, 1906 + W_("co2", 9) + 4, 994, { size: 11 });
    });
  }

  /* ======================= LOG (bottom centre) ======================= */
  const cutC = {};
  function paintLog() {
    stat_(() => line(777, FL + 0.5, 1224, FL + 0.5, GOLD, STRUCT));
    dyn(() => {
      const src = window.Bridge && Bridge.log && Bridge.log.lines ? Bridge.log.lines() : D.log.map(l => ({ text: l[0], kind: l[1] === "!" ? "warn" : "", shown: l[0].length, typing: false }));
      const all = src.slice(-5), nw = all[all.length - 1], prior = all.slice(0, -1), n = prior.length, k = ts / s;
      const mark = l => /^(warn|err|crit)/.test(l.kind || "") ? "!" : ">", shownOf = l => l.text.slice(0, l.shown == null ? l.text.length : l.shown);
      const pcut = [];
      prior.forEach((l, i) => { const y = 905 + (i - (n - 4)) * 15, a = [0.38, 0.5, 0.64, 0.8][Math.max(0, Math.min(3, i - (n - 4)))];
        let pt = shownOf(l); const key = pt + "|" + k, hit = cutC[key];
        if (hit) { pt = hit.t; pcut[i] = hit.cut; }
        else { const room = 1206 - 806; c.font = `500 ${10 * k}px "IBM Plex Mono", monospace`; c.letterSpacing = (0.4 * k) + "px";
          let cu = false; if (c.measureText(pt).width > room) { cu = true; while (pt.length > 1 && c.measureText(pt + "…").width > room) pt = pt.slice(0, -1); pt += "…"; }
          c.letterSpacing = "0px"; pcut[i] = cu; if (l.typing !== true) cutC[key] = { t: pt, cut: cu }; }
        c.save(); c.beginPath(); c.rect(780, y - 14, 1214 - 780, 20); c.clip();
        text(mark(l), 792, y, { size: 10, col: mark(l) === "!" ? CREAM : GOLD, a }); text(pt, 806, y, { size: 10, col: GREY, a, ls: 0.4 }); c.restore(); });
      const nowLeft = 1208 - W_(D.now, 9);
      let end = null, cut = false;
      if (nw) {
        let nt = shownOf(nw); const room = nowLeft - 8 - 818;
        c.font = `500 ${13 * k}px "IBM Plex Mono", monospace`; c.letterSpacing = (0.3 * k) + "px";
        if (c.measureText(nt).width > room) { cut = true; while (nt.length > 1 && c.measureText(nt + "…").width > room) nt = nt.slice(0, -1); nt += "…"; }
        c.letterSpacing = "0px";
        glow(CREAM, () => { text(mark(nw), 792, 986, { size: 13, col: mark(nw) === "!" ? CREAM : GOLD, a: 1 });
          const w = text(nt, 808, 986, { size: 13, col: CREAM, a: 1, ls: 0.3 });
          if (nw.typing) line(810 + w, 988.5, 818 + w, 988.5, CREAM, 0.9, 1.5);
          end = 818 + w; });
      }
      const X = x => W / 2 - 1000 * s + x * s;
      if (ph === "d") lastLog = { lines: all.map((l, i) => ({ text: l.text, kind: l.kind || "", shown: l.shown == null ? l.text.length : l.shown, cut: i === all.length - 1 ? cut : !!pcut[i] })),
        end: end == null ? null : X(end), nowLeft: X(nowLeft) };
      mic(D.now, 1208, 986, { a: 0.55, align: "right" });
    });
  }

  /* ======================= LOG CONTROLLER ======================= */
  const HINTS = { burn: "hold anywhere · burn toward it", beacon: "click a beacon · set course · contact files it", fuel: "fuel refills when the burn stops" };
  let arrived = false, readSaid = false, inputT = -1e9;
  const hs = {};   /* hint id -> { count, text, n, t } */
  const clock = () => (api._clock ? api._clock() : performance.now());
  function nextLine() {
    const u = nearestUnread();
    return u ? "next signal: " + u.mark.name.toLowerCase() + " · " + u.label + " " + u.dir : null;
  }
  function pushHint(id) {
    const h = hs[id] || (hs[id] = { count: 0 });
    h.count++; h.text = HINTS[id]; h.n = null; h.t = null; Bridge.log.push(h.text, "loc");
  }
  function ctl() {
    if (!arrived || !window.Bridge || !Bridge.log || !Bridge.log.lines || !Bridge.hintNow) return;
    const id = Bridge.hintNow(), L = Bridge.log.lines(), now = clock();
    for (const k in hs) { const h = hs[k]; if (h.t == null) { for (let i = L.length - 1; i >= 0; i--) if (L[i].text === h.text) { h.n = L[i].n; h.t = now; break; } } }
    if (!id || !HINTS[id]) return;
    const h = hs[id];
    if (!h) { pushHint(id); return; }
    if (h.count >= 2 || h.t == null) return;
    const newer = L.filter(l => l.n > h.n).length;
    if (newer >= 5 || (inputT < h.t && now - h.t >= 20000)) pushHint(id);
  }
  function wire() {
    window.addEventListener("pointerdown", e => {   // first in line: a press on a mark steps the wing size and never reaches the steering
      const n = markAt(e); if (n < 0) return;
      e.stopImmediatePropagation(); e.preventDefault(); const m = marks()[n]; if (m.on) stepWing(m.d);
    }, true);
    window.addEventListener("pointermove", e => { hov = markAt(e); });
    ["pointerdown", "keydown"].forEach(t => window.addEventListener(t, () => { inputT = clock(); }, true));
    document.addEventListener("bridge:arrive", () => {
      if (!window.Bridge || !Bridge.log) return;
      arrived = true;
      const l = nextLine(); if (l) Bridge.log.push(l, "loc");
      const id = Bridge.hintNow && Bridge.hintNow(); if (id && HINTS[id]) pushHint(id);
    });
    document.addEventListener("xp:award", e => {
      if (!/^beacon-/.test(e.detail.id)) return;
      setTimeout(() => {
        if (!window.Bridge || !Bridge.log) return;
        const l = nextLine();
        if (l) Bridge.log.push(l, "loc");
        else if (!readSaid && live_()) { readSaid = true; const t = Bridge.activeMarks().length; Bridge.log.push("all signals read · " + t + " of " + t, "loc"); }
      }, 0);
    });
  }

  /* ======================= SPAN LINE (top centre) ======================= */
  const live_ = () => !!(window.Bridge && window.XP && Bridge.activeMarks && Bridge.CAM);
  function nearestUnread() {
    const B = window.Bridge;
    if (!live_()) return null;
    let best = null, bd = Infinity;
    for (const m of B.activeMarks()) {
      if (XP.has("beacon-" + m.id)) continue;
      const d = Math.abs(m.cam - B.camX); if (d < bd) { bd = d; best = m; }
    }
    if (!best) return null;
    return Object.assign({ mark: best, dir: best.cam < B.camX ? "west" : "east" }, spanDist(B.camX, best));
  }
  /* the span label's distance: AU inside one landmass, Gly in open space, unknown across Rex/Mainland or to the ends */
  const AU_SPAN = 120, GLY_SPAN = 90, EDGE_SLOTS = 0.7, UNKNOWN_IDS = ["bnote-future", "bnote-root"];
  const fmtDist = v => v < 10 ? v.toFixed(1) : String(Math.round(v));
  function landOf(B, cam) {
    const L = B.LAND, e = EDGE_SLOTS * B.SLOT;
    if (Math.abs(cam - L.mainland) <= e) return { id: "main", w: 2 * e };
    if (cam >= L.rex - e && cam <= L.unnamed + e) return { id: "rex", w: L.unnamed - L.rex + 2 * e };
    return null;
  }
  function spanDist(camX, mark) {
    const B = window.Bridge, a = landOf(B, camX), b = landOf(B, mark.cam), d = Math.abs(mark.cam - camX);
    if (UNKNOWN_IDS.indexOf(mark.id) >= 0 || (a && b && a.id !== b.id)) return { dist: null, unit: null, label: "unknown" };
    if (a && b) { const v = d / a.w * AU_SPAN; return { dist: v, unit: "AU", label: fmtDist(v) + " AU" }; }
    const v = d / (B.CAM.max - B.CAM.min) * GLY_SPAN;
    return { dist: v, unit: "Gly", label: fmtDist(v) + " Gly" };
  }
  /* the span line's marks and pin as 0..1 of the span: live from the bridge, else the sample */
  function spanNow() {
    if (!live_()) {
      const near = D.unread[D.span.next];
      return { read: D.read, unread: D.unread, near, you: D.you, dist: D.spanDist, unit: "AU", label: D.spanDist + " AU", nextId: null };
    }
    const B = window.Bridge, span = B.CAM.max - B.CAM.min, P = cam => (cam - B.CAM.min) / span, n = nearestUnread(), r = { read: [], unread: [], near: null, nextId: null, dist: null, unit: null, label: "" };
    for (const m of B.activeMarks()) {
      if (XP.has("beacon-" + m.id)) r.read.push(P(m.cam)); else r.unread.push(P(m.cam));
    }
    r.you = P(B.camX);
    if (n) { r.near = P(n.mark.cam); r.dist = n.dist; r.unit = n.unit; r.label = n.label; r.nextId = n.mark.id; }
    return r;
  }
  /* ======================= LEFT WING DATA ======================= */
  const LAMP_L = ["nomic", "chaos", "span", "unfrm", "cntc", "bcn", "sig", "rad", "dbr", "shear", "flip", "rift", "curr", "well"];
  /* the sample left wing in the shape the painters read (the fallback without Bridge / HudModels) */
  function leftSample() {
    const o = {}; ["contacts", "near", "blips", "ball", "sweep", "beacons", "spectrum", "str", "floor", "speed", "speedAt", "resNow", "dose", "g", "gFlip", "hullT", "hullTv", "lat", "vert", "width", "lampsL"].forEach(k => { o[k] = D[k]; });
    o.brg = brgOf(D.blips[0]);
    o.rep = null;
    return o;
  }
  const holdLat = { v: 0, t: -9 }, holdVert = { v: 0, t: -9 };
  const speedBuf = new Array(90).fill(0.03); let speedT = 0;
  /* the left wing each frame, live from HudModels; spectrum and width come from the signal model */
  function leftNow(env) {
    const B = window.Bridge, HM = window.HudModels;
    if (!live_() || !HM || !env || !env.env || !env.st) return leftSample();
    const e = env.env, st = env.st, sys = HM.sys(), now = performance.now() / 1000, span = B.CAM.max - B.CAM.min, mpu = 408000 / span;
    const marks = B.activeMarks(), ct = HM.contacts(marks, B.camX), o = leftSample();
    const sg = env.r ? HM.signal(env.r, env.dt || 0, window.Instruments ? Instruments.now : now) : null;
    if (now - speedT >= 0.1) { speedT = now; speedBuf.push(st.speedN * 0.1); speedBuf.shift(); }
    o.speed = speedBuf; o.speedAt = st.speedN;
    o.contacts = ct.n;
    o.blips = [ct.nearest, ct.second].filter(Boolean).map(x => { const a = HM.blipAngle(x.mark, B.camX), r = x.dist / HM.RANGE; return [Math.cos(a) * r, Math.sin(a) * r]; });
    o.brg = ct.nearest ? ct.nearest.bearing : 0;
    o.near = ct.nearest ? (ct.nearest.mark.cam > B.camX ? "e " : "w ") + Math.round(ct.nearest.dist * mpu).toLocaleString("en-US") : "none";
    o.sweep = (now * 1.3) % (2 * PI);
    const un = marks.filter(m => !XP.has("beacon-" + m.id) && m.vis >= 0.5 && !m.fly), range = Math.min(B.W * 0.42, 560);
    const sc = un.map(m => B.markScreen(m)), cl = v => Math.max(-1, Math.min(1, v));
    o.beacons = sc.map(p => [cl((p.x - B.W / 2) / (B.W / 2)) * 0.9, cl((p.y - B.H / 2) / (B.H / 2)) * 0.9]);
    const nr = sc.filter(p => Math.abs(p.x - B.W / 2) < range && p.y > 0 && p.y < B.H).length;
    const nu = nearestUnread();
    o.ball = nu ? [nu.dir === "east" ? 0.8 : -0.8, 0.1] : null;
    o.str = HM.strength();
    if (sg) { o.spectrum = Array.from({ length: 32 }, (_, i) => sg.bars[Math.min(HM.BANDS - 1, Math.floor(i * HM.BANDS / 32))]); }
    /* direction-finding spread from strength (D28); no contact, no spread */
    o.width = ct.nearest ? "±" + Math.round(Math.max(2, Math.min(45, 60 / Math.sqrt(Math.max(o.str, 1))))) + "°" : "—";
    o.resNow = e.res || 0;
    o.dose = sys ? (sys.dose < 0.1 ? sys.dose.toFixed(3) : sys.dose.toFixed(2)) : o.dose;
    o.g = (e.g || 0).toFixed(2);
    o.gFlip = (e.gAnom || 0) > 0.05 ? (now % 2.5) / 2.5 : 0;
    if (sys) { o.hullTv = Math.max(-100, Math.min(100, Math.round(sys.hullT))); o.hullT = o.hullTv + "°"; }
    /* aim Y clamped to the ship's y band as its steering does (voidship.js yLimits) */
    const vu = B.W / B.CAM.viewUnits, sh = B.ship, VB = window.Voidship && Voidship.BASE, bandMid = B.H * 0.42, bandHalf = VB ? B.H * VB.yBand - VB.size * 0.5 * Math.abs(Math.sin(sh && sh.pitch || 0)) : 0;
    const aim = sh && VB && sh.targetX != null && sh.targetY != null ? { dx: sh.targetX - sh.camX, dy: (Math.min(bandMid + bandHalf, Math.max(bandMid - bandHalf, sh.targetY)) - sh.y) / vu } : null;
    const tn = window.Instruments ? Instruments.now : now;
    const dr = HM.driftOf(B.vel, (st.vy || 0) / vu, st.angle, span, tn, aim);
    /* no contact: the rose shows the ship's own heading (toward the aim, else its facing), 0 north, 90 east */
    if (!ct.nearest) o.brg = brgOf(aim && Math.hypot(aim.dx, aim.dy) > 1e-6 ? [aim.dx, aim.dy] : [Math.cos(st.angle || 0) >= 0 ? 1 : -1, 0]);
    o.brg = ((o.brg % 360) + 360) % 360;
    if (o.blips[0]) o.brg = brgOf(o.blips[0]);   // the wing prints the first blip's bearing; the log and the report read the same value
    /* peak-hold (D32): the ship snaps to its aim so slip is a short spike; hold the largest |slip| per axis and let it fall linearly to the live value over 1.5 s */
    const hold = (h, v) => { const f = () => Math.max(0, 1 - (tn - h.t) / 1.5), shown = () => v + (h.v - v) * f();
      if (tn < h.t || Math.abs(v) >= Math.abs(shown())) { h.v = v; h.t = tn; } return shown(); };
    o.lat = hold(holdLat, dr.lat); o.vert = hold(holdVert, dr.vert);
    const hm = Math.hypot(o.lat, o.vert); if (Number.isFinite(o.brg) && Number.isFinite(hm)) { HM.live.brg = brgInt(o.brg); HM.live.slip = hm; } dr.min = Math.min(dr.min, hm); dr.max = Math.max(dr.max, hm);
    const ls = HM.leftLamps({ env: e, futureNow: B.futureNow, camX: B.camX, spanMin: B.CAM.min, spanMax: B.CAM.max, contacts: ct.n, beaconNear: nr > 0, str: o.str, dose: sys ? sys.dose : 0 }, now);
    /* error level (burst, and rad red) blinks at 1.1 Hz between its state and lit; lit does not blink */
    const on = Math.floor(now * 1.1 * 2) % 2 === 0;
    o.lampsL = ls.map((x, i) => [LAMP_L[i], x >= 2 && !on ? 1 : x]);
    o.rep = { str: o.str, brg: brgInt(o.brg), contacts: ct.n, second: ct.second ? Math.round(ct.second.bearing) : null, speed: st.speedN, resNow: o.resNow, dose: sys ? sys.dose : null,
      g: e.g || 0, gFlip: o.gFlip, ext: sys ? o.hullTv : null, lat: dr.lat, vert: dr.vert, cone: [dr.min, dr.max], lamps: ls };
    return o;
  }
  /* ======================= RIGHT WING DATA ======================= */
  const LAMP_R = ["drv 1", "drv 2", "drv 3", "drv 4", "ring", "fin t", "fin b", "bus", "cell", "cool", "lsp", "seal", "nav", "jnt"];
  /* the sample right wing in the shape the painters read (the fallback without Bridge / HudModels) */
  function rightSample() {
    const o = {}; ["volt", "cells", "bus", "loads", "cabin", "cabSet", "fuel", "left", "hullInt", "fin", "thrust", "hot", "p", "rh", "rhv", "o2", "co2", "o2v", "co2v", "stress", "lampsR"].forEach(k => { o[k] = D[k]; });
    o.cabTrace = (() => { const a = []; for (let i = 0; i <= 30; i++) a.push(21 + 0.32 * Math.sin(i * 0.52 - 1.2));
      const fix = D.cabin - a[30]; return a.map((v, i) => v + fix * i / 30); })();
    o.rep = null;
    return o;
  }
  /* the right wing each frame, live from HudModels, the ship stats and tiles-sys */
  function rightNow(env) {
    const HM = window.HudModels;
    if (!live_() || !HM || !env || !env.env || !env.st) return rightSample();
    const sys = HM.sys(); if (!sys) return rightSample();
    const e = env.env, st = env.st, o = rightSample(), pnow = performance.now() / 1000, th = st.thrust || 0;
    const now = window.Instruments ? Instruments.now : pnow, r = env.r || {};   // one clock with critUntil and the cabin tile
    const bl = HM.busLoads(th, sys.hx, sys.omega, now, e), cl = HM.cells(th, bl.kW);
    o.volt = cl.volts; o.cells = cl.cells; o.bus = bl.kW;
    o.loads = [["drv", bl.drv], ["thm", bl.thm], ["lsp", bl.life], ["gnc", bl.gnc]].map(l => [l[0], l[1] * 8.4]);
    o.cabin = sys.cabT; o.cabSet = 21.0;
    o.cabTrace = HM.cabTrace(now, { frozen: e.frozen, chaos: r.chaos || 0, future: r.future || 0 }).samples;
    o.fuel = st.fuelN;
    if (st.burning && st.drain > 0) { const sec = Math.max(0, Math.round(st.fuel / st.drain)); o.left = Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0") + " left"; }
    else o.left = "full";
    o.hullInt = Math.round(sys.hullInt * 100);
    o.fin = Math.round(100 - 15 * Math.min(1, Math.abs(st.jet || 0)));   // fin load: dips with the vertical RCS jet
    const heat = Math.max(0, Math.min(1, Math.max(th, st.speedN || 0)));
    o.thrust = heat; o.hot = 0.8;
    o.p = sys.kpa.toFixed(1); o.rh = String(Math.round(sys.rh)); o.rhv = sys.rh / 100;
    o.o2 = sys.o2.toFixed(2); o.co2 = String(Math.round(sys.co2));
    o.o2v = Math.max(0, Math.min(1, (sys.o2 - 19) / 2.9)); o.co2v = Math.max(0, Math.min(1, sys.co2 / 1600));
    const si = { thrust: th, wear: sys.wear || 0, impact: sys.lastImpact, now: now, sway: e.sway || 0, jitter: e.jitter || 0 };
    o.stress = Array.from({ length: 183 }, (_, i) => HM.stress(-0.52 + i * 0.01, si));
    const ls = HM.rightLamps({ burning: st.burning, thrust: th, wear: sys.wear || 0, jet: st.jet, courseMark: st.courseMark, o2: sys.o2, co2: sys.co2, kpa: sys.kpa,
      busKW: bl.kW, thrustN: th, speedN: st.speedN || 0 }, now);
    const on = Math.floor(pnow * 1.1 * 2) % 2 === 0;
    o.lampsR = ls.map((x, i) => [LAMP_R[i], x >= 2 && !on ? 1 : x]);
    o.rep = { volts: o.volt, cells: o.cells.slice(), weakest: cl.weakest, bus: { life: bl.life, drv: bl.drv, thm: bl.thm, gnc: bl.gnc, kW: bl.kW }, cabT: sys.cabT, cabN: o.cabTrace.length,
      fuel: o.fuel, left: o.left, hullInt: o.hullInt, fin: o.fin, heat: heat * 100, p: sys.kpa, rh: sys.rh, o2: sys.o2, co2: sys.co2, joint: HM.stress(HM.JOINT_U, si), ring: HM.stress(HM.RING_U, si), stressMin: Math.min.apply(null, o.stress), stressMax: Math.max.apply(null, o.stress), lamps: ls };
    return o;
  }
  const B_ = () => window.Bridge;
  function paintSpan() {
    const X0 = 200, X1 = 1800, Y = 88, X = p => Math.round(X0 + p * (X1 - X0)) + 0.5;
    const S = spanNow();
    if (ph === "d") lastSpan = { you: X(S.you), next: S.nextId, dist: S.near == null ? null : S.dist, unit: S.near == null ? null : S.unit, label: S.near == null ? null : S.label, dir: S.near == null ? null : (S.near < S.you ? "west" : "east"),
      unread: S.unread.length, read: S.read.length };
    if (ph === "d" && probe) spanLine = scrBox(X0 - 1, Y - (S.near != null ? 14 : 9), X1 + 1, Y + 10);
    stat_(() => {
      line(X0, Y + 0.5, X1, Y + 0.5, GOLD, 0.75, 1.5); [X0, X1].forEach(x => line(x + 0.5, Y - 5, x + 0.5, Y + 6, GOLD, 0.95, 2));
      /* each read beacon is a level earned: a lit gold bead */
      /* every bead stays full size; ones under 12 px apart spread symmetric around their true x (a cluster stays centred) */
      const spread = (xs, D) => {
        let cl = xs.slice().sort((a, b) => a - b).map(x => ({ n: [x], m: x }));
        const ext = k => [k.m - (k.n.length - 1) * D / 2, k.m + (k.n.length - 1) * D / 2];
        for (let again = true; again;) {
          again = false;
          for (let i = 1; i < cl.length; i++) if (ext(cl[i])[0] - ext(cl[i - 1])[1] < D) {
            const n = cl[i - 1].n.concat(cl[i].n); cl.splice(i - 1, 2, { n: n, m: n.reduce((a, b) => a + b, 0) / n.length }); again = true; break;
          }
        }
        const out = []; cl.forEach(k => k.n.forEach((_, j) => out.push(k.m + (j - (k.n.length - 1) / 2) * D)));
        return out;
      };
      const bx = spread(S.read.map(p => X(p)), 12);
      c.save(); c.shadowColor = rgba(GOLD, 0.6); c.shadowBlur = 6 * s;
      bx.forEach(x => dot(x, Y + 0.5, 3.2, GOLD, 1));
      c.restore();
      spread(S.unread.map(p => X(p)), 10).forEach(x => { if (!bx.some(b => Math.abs(b - x) <= 9)) line(x, Y - 9, x, Y, GOLD, 1, 2); });
      const xl = live_() ? XP.level : S.read.length, nx = live_() ? XP.rankOf(xl).next : null;
      const bc = live_() ? Bridge.beaconCount() : { read: S.read.length, total: S.read.length + S.unread.length };
      text(bc.read + " / " + bc.total, X1, Y + 24, { size: 13, col: GOLD, a: 1, align: "right" });
      mic("read · lv " + xl + " · " + (nx == null ? "top rank" : "rank in " + (nx - xl)), X1, Y + 38, { align: "right" });
    });
    dyn(() => {
      const xy = X(S.you);
      if (S.near != null) {
        const xn = X(S.near);
        /* marks under the lit segment break it with a 5 px gap each side; a read one shows its dot in the gap */
        const lo = Math.min(xn, xy), hi = Math.max(xn, xy), GAP = 5;
        const rd = S.read.map(p => X(p)).filter(x => x > lo && x < hi), ur = S.unread.map(p => X(p)).filter(x => x > lo && x < hi);
        const brk = rd.concat(ur).sort((a, b) => a - b);
        glow(CREAM, () => { let a = lo; brk.forEach(x => { if (x - GAP > a) line(a, Y + 1, x - GAP, Y + 1, CREAM, 0.95, 2.5); a = Math.max(a, x + GAP); });
          if (hi > a) line(a, Y + 1, hi, Y + 1, CREAM, 0.95, 2.5); });
        rd.forEach(x => dot(x, Y + 0.5, 1.7, CREAM, 0.6));
        text(S.label, (xn + xy) / 2, Y + 18, { size: 11, col: CREAM, a: 1, align: "center" });
        text("+1 lv", xn, Y - 20, { size: 10, col: CREAM, a: 1, align: "center" });
        glow(CREAM, () => line(xn, Y - 14, xn, Y + 2, CREAM, 1, 2.5));
      }
      glow(CREAM, () => { line(xy, Y - 9, xy, Y + 10, CREAM, 1, 2.5); dot(xy, Y + 0.5, 4, CREAM, 1); });
      mic("you", xy + 8, Y - 5, { a: 0.9, col: CREAM });
    });
  }

  /* ======================= public API ======================= */
  /* each block draws in sketch coordinates under its own anchor: wings at the bottom corners, log + span centred */
  function paintAll() {
    const spanY = barB + 29.8 * s, s0 = s, ts0 = ts;
    blk = 0;
    const at_ = (ox, oyy, f) => { blk++; c.save(); c.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oyy); f(); c.restore(); };
    s = s0 * wk; ts = Math.max(s, 0.9);   // the wings draw at the wing scale, anchored to their corners; the log and span line keep s
    at_(0, H - 1009 * s, paintLeft); at_(W - 2000 * s, H - 1009 * s, paintRight);
    s = s0; ts = ts0;
    at_(W / 2 - 1000 * s, H - 1009 * s - (wk > 1 ? (50 * wk - 13) * s : 0), paintLog);   // grown wings carry their floor line and readouts into the log's columns: the log rises above them
    at_(W / 2 - 1000 * s, spanY - 88.5 * s, paintSpan);
    if (ph === "d") paintMarks();
  }
  /* ---- wing size: one SIZE - + stepper above the left wing's top-left, in screen px ---- */
  const wingOk = v => { const q = Math.min(1, W / 2000, H / 1009); return XL * q * v + 12 <= W / 2; };   // the left wing's inner edge (its floor line and readouts end at XL) keeps 12 px of the centre; the right wing mirrors it
  const wingFit = () => { wk = WSTEPS.filter(v => v <= wsv && (v === 1 || wingOk(v))).pop(); };
  const marks = () => { const sw = Math.min(1, W / 2000, H / 1009) * wk, y = H - 237 * sw - 33, i = WSTEPS.indexOf(wk), up = WSTEPS[i + 1];
    return [{ d: -1, x: 14 + 47, y, on: i > 0 }, { d: 1, x: 14 + 69, y, on: up != null && wingOk(up) }]; };   // cells 22 px wide, centred on x
  function paintMarks() {
    c.save(); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const mk = marks(), Y = Math.round(mk[0].y) + 0.5, fx = 14.5, fy = Y - 10;
    c.lineWidth = 1; c.strokeStyle = rgba(GOLD, STRUCT); c.strokeRect(fx, fy, 80, 20);   // quiet frame at the wing lines' weight
    c.beginPath(); c.moveTo(fx + 36, fy); c.lineTo(fx + 36, fy + 20); c.moveTo(fx + 58, fy); c.lineTo(fx + 58, fy + 20); c.stroke();
    c.font = '500 10px "IBM Plex Mono", monospace'; c.letterSpacing = "1px"; c.textBaseline = "alphabetic"; c.textAlign = "left"; c.fillStyle = rgba(GREY, 0.85); c.fillText("SIZE", fx + 5, Y + 3.5);
    c.letterSpacing = "0px";
    mk.forEach((m, n) => { const h = hov === n && m.on, a = !m.on ? 0.35 : h ? 0.95 : 0.6, X = Math.round(m.x) + 0.5;
      c.lineWidth = 1; c.strokeStyle = rgba(CREAM, a); c.beginPath(); c.moveTo(X - 4, Y); c.lineTo(X + 4, Y);
      if (m.d > 0) { c.moveTo(X, Y - 4); c.lineTo(X, Y + 4); }
      c.stroke(); });
    c.restore();
  }
  const markAt = e => { if (phone() || !painted || !cv || +getComputedStyle(cv).opacity < 0.5) return -1;
    if (e.target && e.target.closest && e.target.closest("a, button, .bnote, .genesis")) return -1;
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    return marks().findIndex(m => Math.abs(x - m.x) <= 11 && Math.abs(y - m.y) <= 12); };
  function stepWing(d) { const v = WSTEPS[WSTEPS.indexOf(wk) + d]; if (v == null || (d > 0 && !wingOk(v))) return; wsv = wk = v; Util.write(localStorage, Util.KEYS.HUD_WING, String(v)); dirty = true; }
  function mount(canvas) {
    cv = canvas; c = cv.getContext("2d"); if (!D) D = sampleData();
    if (!LF) LF = leftSample();
    if (!RF) RF = rightSample();
    document.addEventListener("xp:award", () => { dirty = true; });
    document.addEventListener("site:genesis-done", () => { dirty = true; });
    wire();
  }
  const phone = () => !!(window.Bridge && Bridge.phone);   /* D25: a phone gets no HUD */
  function resize(w, h, d, bb) {
    if (phone()) return;
    W = w; H = h; dpr = d || 1; barB = bb == null ? BAR_B : bb; wingFit();
    s = Math.min(1, W / 2000, H / 1009); ts = Math.max(s, 0.9);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + "px"; cv.style.height = H + "px";
    rebuildStat();
  }
  function rebuildStat() {
    const live = c;
    stat = document.createElement("canvas"); stat.width = cv.width; stat.height = cv.height;
    c = stat.getContext("2d"); bxS = []; lbS = []; rbS = []; txS = []; shS = []; ph = "s"; paintAll(); ph = "d"; c = live; dirty = false;
  }
  function draw(env) {
    if (phone()) return;
    if (env && env.data) D = env.data;
    LF = leftNow(env);
    RF = rightNow(env);
    ctl();
    if (live_()) { const bc = Bridge.beaconCount(), sig = bc.read + "/" + bc.total; if (sig !== beadSig) { beadSig = sig; dirty = true; } }   // the static span line follows the shared count
    if (dirty && stat) rebuildStat();
    paintLive(); painted = true;
  }
  function paintLive() {
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
    if (stat) c.drawImage(stat, 0, 0);
    ph = "d"; bxD = []; lbD = []; rbD = []; txD = []; shD = []; ext = {}; paintAll();
  }
  /* size checks in screen CSS px: smallest drawn/sketch font ratio, overlapping text pairs (other pairs closer than 4 * s, designed units only on overlap), text meeting the ship or a chevron, boxes and extents outside the canvas, the span line's box */
  function sizeChecks() {
    const tx = txS.concat(txD), sh = shS.concat(shD), hits = [], out = [], pad = 4 * s;   // same-row pairs, and stacked pairs overlapping horizontally, under 12 px apart at 2000 x 1009 are one unit (hit only if overlapping); every other pair counts when closer than 4 * s
    let textMin = null;
    tx.forEach((a, i) => {
      const q = a.px / a.sk; if (textMin == null || q < textMin) textMin = q;
      if (a.l < 0 || a.t < 0 || a.r > W || a.b > H) out.push(a.s);
      for (let j = i + 1; j < tx.length; j++) { const b = tx[j];
        if (a.s === b.s && Math.abs(a.l - b.l) < 0.5 && Math.abs(a.t - b.t) < 0.5) continue;
        const ox = Math.min(a.r, b.r) - Math.max(a.l, b.l), oy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
        const g2 = Math.max(Math.max(a.sl, b.sl) - Math.min(a.sr, b.sr), Math.max(a.st, b.st) - Math.min(a.sb, b.sb));   // the pair's gap in the 2000 x 1009 layout
        if (Math.max(-ox, -oy) < (g2 < 12 && (Math.min(a.sb, b.sb) - Math.max(a.st, b.st) > 0 || Math.min(a.sr, b.sr) - Math.max(a.sl, b.sl) > 0) ? 1 : pad)) hits.push('"' + a.s + '" x "' + b.s + '" @' + Math.round((Math.max(a.l, b.l) + Math.min(a.r, b.r)) / 2) + "," + Math.round((Math.max(a.t, b.t) + Math.min(a.b, b.b)) / 2)); }
      sh.forEach(b => { if (Math.min(a.r, b.r) - Math.max(a.l, b.l) > -1 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > -1) hits.push('"' + a.s + '" x ' + b.s + " @" + Math.round(a.l) + "," + Math.round(a.t)); }); });
    const sw = s * wk, oy0 = H - 1009 * sw, wing = {};
    Object.keys(ext).forEach(k => { const e = ext[k]; wing["L." + k] = [e[0] * sw, oy0 + e[2] * sw, e[1] * sw, oy0 + e[3] * sw].map(v => +v.toFixed(1));
      if (k === "str" || k === "brg") return;   // bearing ticks: not screen boxes (see leftBoxes)
      if (e[0] * sw < 0 || e[1] * sw > W || oy0 + e[2] * sw < 0 || oy0 + e[3] * sw > H) out.push("ext:" + k); });
    if (busEnd) { wing.busRail = +(W - 2000 * sw + busEnd.rail * sw).toFixed(1); wing.busTxtR = +(W - 2000 * sw + busEnd.txtR * sw).toFixed(1); }
    let sb = spanLine ? spanLine.slice() : null;
    if (sb) tx.forEach(a => { if (a.blk === 4) { sb[0] = Math.min(sb[0], a.l); sb[1] = Math.min(sb[1], a.t); sb[2] = Math.max(sb[2], a.r); sb[3] = Math.max(sb[3], a.b); } });
    return { textMin: textMin == null ? null : +textMin.toFixed(3), textHits: hits, paint: { outside: out, wing }, spanBox: sb && { l: +sb[0].toFixed(1), t: +sb[1].toFixed(1), r: +sb[2].toFixed(1), b: +sb[3].toFixed(1) } };
  }
  /* the left wing's label boxes and drawn extents against the sketch bounds: overlaps between text boxes, extents outside */
  function leftBoxes() {
    const B_ = { x0: 0, x1: 800, y0: 760, y1: 1009 }, bx = lbS.concat(lbD), bad = [];
    let overlaps = 0, outside = 0;
    for (let i = 0; i < bx.length; i++) {
      const a = bx[i]; if (a.l < B_.x0 || a.r > B_.x1 || a.t < B_.y0 || a.b > B_.y1) { outside++; bad.push("out:" + a.s); }
      for (let j = i + 1; j < bx.length; j++) { const b = bx[j]; if (Math.min(a.r, b.r) - Math.max(a.l, b.l) > 0.5 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 0.5) { overlaps++; bad.push(a.s + "|" + b.s); } }
    }
    const lim = { str: [24, 204, 760, 1009], brg: [214, 486, 760, 1009], rose: [24, 128, 806, 904], drift: [24, 261, 874, 1000], g: [0, 800, 959, 985] };
    Object.keys(ext).forEach(k => { const e = ext[k], l = lim[k]; if (!l) return;
      const out = k === "str" || k === "brg" ? e[0] < e[2] - 4.5 || e[1] > e[3] + 4.5 : e[0] < l[0] - 0.5 || e[1] > l[1] + 0.5 || e[2] < l[2] - 0.5 || e[3] > l[3] + 0.5;
      if (out) { outside++; bad.push("ext:" + k + ":" + e.map(v => Math.round(v)).join(",")); } });
    const nd = LF && LF.rep && LF.rep.needle; if (nd && nd.len > nd.ring - 0.5) { outside++; bad.push("needle:" + nd.len + ">" + nd.ring); }
    const nm = LF && LF.rep && LF.rep.num;   // bearing number against the ring (+3), the spectrum box and the floor line
    if (nm && nd) { const dist = Math.hypot(Math.max(nm.l - 76, 0, 76 - nm.r), Math.max(nm.t - 850, 0, 850 - nm.b)); if (dist < nd.ring + 3 - 0.01) { overlaps++; bad.push("num:ring"); }
      if (nm.r > 127 && nm.b > 810) { overlaps++; bad.push("num:spectrum"); } }
    if (nd && nd.hdr) nd.hdr.forEach(r => { if (nd.tip[0] > r.l - 3 && nd.tip[0] < r.r + 3 && nd.tip[1] > r.t - 3 && nd.tip[1] < r.b + 3) { overlaps++; bad.push("needle:hdr"); } });
    const lab = LF && LF.rep && LF.rep.lab, ydr = LF && LF.rep && LF.rep.drift;
    const strAbove = !!lab && lab.str.length > 0 && lab.str.every(b => b.b <= ycL(b.l) - 1 + 0.01);
    const brgBelow = !!lab && lab.brg.length > 0 && lab.brg.every(b => b.t >= ycL(b.r) + 1 - 0.01);
    if (lab && !strAbove) { overlaps++; bad.push("strAbove"); }
    if (lab && !brgBelow) { overlaps++; bad.push("brgBelow"); }
    if (nd && nd.north && nd.len > nd.inner + 0.01) { outside++; bad.push("needle:inner"); }
    const lobe = LF && LF.rep && LF.rep.lobe;
    if (lobe && nd && nd.hdr && nd.hdr.some(r => lobe.top < r.b + 3 - 0.01)) { overlaps++; bad.push("lobe:hdr"); }
    if (ydr && ydr.hits > 0) { overlaps++; bad.push("drift:hits"); }
    const sl = lbD.find(b => b.s === "/100"), bl = lbD.find(b => b.s === "brg");
    const railGap = sl && bl ? +(bl.l - sl.r).toFixed(1) : null;
    return { overlaps, outside, strAbove, brgBelow, needle: nd ? { inner: nd.inner, len: nd.len } : null, drift: ydr || null, lobe: lobe || null, railGap, labels: bx.length, bad: bad.slice(0, 8) };
  }
  /* the right wing's text boxes: pairs touching (1 px pad); boxes past the 2000 x 1009 frame, or the bus split row's labels past the rail end */
  function rightBoxes() {
    const bx = rbS.concat(rbD), bad = [], re = busEnd ? busEnd.rail : 1870;
    let overlaps = 0, outside = 0;
    for (let i = 0; i < bx.length; i++) {
      const a = bx[i]; if (a.l < 1000 || a.r > 2000 || a.t < 0 || a.b > 1009) { outside++; bad.push("out:" + a.s); }
      for (let j = i + 1; j < bx.length; j++) { const b = bx[j]; if (Math.min(a.r, b.r) - Math.max(a.l, b.l) > -1 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > -1) { overlaps++; bad.push(a.s + "|" + b.s); } }
    }
    if (busEnd && (busEnd.txtR > re || busEnd.row > re + 0.01)) { outside++; bad.push("bus:row"); }
    return { overlaps, outside, railEnd: re, rowEnd: busEnd ? busEnd.row : null, rowTextEnd: busEnd ? busEnd.txtR : null, labels: bx.length, bad: bad.slice(0, 8) };
  }
  function report() {
    if (c && LF && RF) { probe = true; try { paintLive(); } finally { probe = false; } }   // text boxes are recorded only here, never in a normal frame
    if (RF && RF.rep) RF.rep.boxes = rightBoxes();
    if (LF && LF.rep) LF.rep.boxes = leftBoxes();
    const x0 = W / 2 - 1000 * s + 200.5 * s;
    const sc = sizeChecks();
    return { phone: phone(), painted, W, H, dpr, s, ts, barBottom: barB, span: Object.assign({ y: barB + 29.8 * s, x0, x1: x0 + 1600 * s }, lastSpan, { box: sc.spanBox }), log: lastLog, left: LF && LF.rep, right: RF && RF.rep, textMin: sc.textMin, textHits: sc.textHits, paint: sc.paint };
  }
  const api = { mount, draw, resize, report, sampleData, nearestUnread, wing: () => wk };
  return api;
})();
