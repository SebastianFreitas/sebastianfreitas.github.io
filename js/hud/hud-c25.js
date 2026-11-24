/* hud-c25.js — the C25 HUD: span line (top), left wing (outside), right wing (ship), log (bottom centre).
   Line art only on a transparent 2D canvas. Every drawn value is read from one data object D (sampleData() for now).
   Geometry is the 2000x1009 sketch; each block is drawn under its own anchor transform (scale s, wings at the
   bottom corners, log + span line centred). Text keeps its anchor and grows with ts = max(s, 0.9).
   Static linework (ph 's') is cached per resize; values (ph 'd') are painted every draw. */
window.HudC25 = (function () {
  const GOLD = "245,208,107", CREAM = "228,221,198", GREY = "160,168,160", RED = "110,26,26", REDT = "196,74,68";
  const C_HULL_BLUE = ["92,132,192", "128,164,216"], C_HULL_VIOLET = ["150,112,214", "186,160,236"];   // lower hull: a non-human crew. Pick one pair on the next line
  const [C_HULL, C_HULL_GLOW] = ["108,116,188", "140,148,214"];   // muted blue-purple, between the two pairs above (owner, 2026-11-21: the violet was too bright)
  const C_TOP = "205,214,224", C_MID = GOLD, C_NOSE = "158,52,48";   // HUD line colours that follow the hull's parts in js/ship/voidship-hull.js: cold white top (receptors), gold centre (engine), steel blue lower hull, oxblood nose
  const LABEL = 10, VALUE = 12, HERO = 24;   // the three text sizes (sketch px): label, value, hero
  const QUIET = 0.42, NORMAL = 0.75, BRIGHT = 0.95;   // the three alphas: quiet (structure), normal, bright (live values)
  const HAIR = 1, STRONG = 1.5;   // the two stroke widths
  const LBL = () => ts > s + 1e-6 ? 9 : LABEL;   // the small-label size: LABEL, or 9 where the text has grown past its anchor (a small screen) so the packed rows still clear
  const PI = Math.PI, STRUCT = QUIET, RAIL = 796, TOP = 772, XL = 776, XR = 1224, FL = 959, HB0 = 584;
  const BAR_B = 58.7;
  const HXL = 26, HYL = 826;   // SKETCH v16: the hero readout's left (cap A's text x) / baseline; the bay is open again (no outer edge, no scale)
  const WSTEPS = [1, 1.25, 1.5, 1.75];
  let wsv = WSTEPS.indexOf(+Util.read(localStorage, Util.KEYS.HUD_WING)) >= 0 ? +Util.read(localStorage, Util.KEYS.HUD_WING) : 1, wk = wsv, hov = -1;   // wing scale: the stored step, and the drawn one (the largest step <= it that fits this screen)
  let cv = null, c = null, W = 0, H = 0, dpr = 1, s = 1, sB = 1, ts = 1, barB = BAR_B;
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
    const r5 = rng(9), speed = Array.from({ length: 90 }, (_, i) => 0.012 + 0.063 * Math.pow(i / 89, 0.7) + 0.004 * (r5() - 0.5));   // SKETCH v18: a ramp ending at the speed (buffer holds speed * 0.1)
    const P = x => (x - 789) / 428;
    /* hull stress sampled along the length, u from -0.52 to 1.04 in steps of 0.01 */
    const g = (u, m, sg, a) => a * Math.exp(-((u - m) * (u - m)) / (2 * sg * sg));
    const stress = Array.from({ length: 157 }, (_, i) => { const u = -0.52 + i * 0.01;
      return Math.max(0.04, 0.22 + g(u, -0.32, 0.06, 0.28) + g(u, -0.08, 0.11, 0.45) + g(u, 0.36, 0.05, 0.62) + g(u, 0.43, 0.035, 0.30) - 0.2 * Math.max(0, u - 0.8) / 0.34); });
    const unread = [850, 854, 1019, 1075, 1118, 1161, 1177].map(P), you = P(1028.5);
    const next = unread.reduce((b, p, i) => Math.abs(p - you) < Math.abs(unread[b] - you) ? i : b, 0);
    return {
      /* left wing */
      contacts: 2, near: "e 1,440", blips: [[0.62, -0.08], [-0.35, 0.22]], bid: ["kth-04", "vael-11"], more: [{ b: [0.12, -0.5], id: "orr-02" }, { b: [-0.2, -0.3], id: "ns-14" }, { b: [0.3, -0.7], id: "ns-33" }, { b: [-0.6, -0.4], id: "ns-60" }], sites: [{ d: 0.55, met: true }, { d: 0.8, met: false }, { d: -0.7, met: false }], ball: [0.62, -0.45], sweep: -0.5, beacons: [[-0.25, 0.05], [0.1, 0.05]],
      spectrum, bars: spectrum.slice(0, 28), peaks: spectrum.slice(0, 28).map(v => Math.min(1, v * 1.25)), voice: "mainland", envName: "nomic", strH: Array.from({ length: 50 }, (_, i) => 12 + 30 * Math.pow(i / 49, 1.5) + 5 * Math.sin(i * 0.8)),
      str: 16, floor: 5, speed, speedAt: 0.75, resNow: 0.08, dose: "1.13", g: "-0.40", gFlip: 0.56, hullT: "-38°", hullTv: -38,
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
    c.strokeStyle = rgba(col || GOLD, a == null ? STRUCT : a); c.lineWidth = w || HAIR;
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  }
  function poly(pts, col, a, w, close) {
    c.strokeStyle = rgba(col || GOLD, a == null ? STRUCT : a); c.lineWidth = w || HAIR;
    c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]));
    if (close) c.closePath(); c.stroke();
  }
  function arc(cx, cy, r, a0, a1, col, a, w, dash) {
    c.strokeStyle = rgba(col || GOLD, a == null ? STRUCT : a); c.lineWidth = w || HAIR; if (dash) c.setLineDash(dash);
    c.beginPath(); c.arc(cx, cy, r, a0, a1); c.stroke(); c.setLineDash([]);
  }
  function dot(x, y, r, col, a) { c.fillStyle = rgba(col || GOLD, a == null ? 1 : a); c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill(); }
  /* text-path caches (same pixels): widths by font + spacing + string, the header boxes, the newest log line's cut; all cleared by clearTx() on rebuildStat and when fonts load */
  const twC = new Map(); let hdrC = null, hxC = null; const nwC = new Map(); const cutC = new Map();
  const clearTx = () => { twC.clear(); nwC.clear(); hdrC = null; hxC = null; cutC.clear(); };
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener("loadingdone", clearTx);
  const setF = (font, ls) => { if (c.font !== font) c.font = font; if (c.letterSpacing !== ls) c.letterSpacing = ls; };
  function tw(font, ls, str) {
    const key = font + "|" + ls + "|" + str, hit = twC.get(key); if (hit !== undefined) return hit;
    setF(font, ls); const w = c.measureText(str).width;
    if (twC.size > 2000) twC.clear(); twC.set(key, w); return w;
  }
  function text(str, x, y, o) {
    o = o || {}; const size = o.size || LABEL, k = ts / s;
    const fnt = `${o.weight || "500"} ${size * k}px "IBM Plex Mono", monospace`, lsp = ((o.ls != null ? o.ls : (size <= 11 ? 0.8 : 0.2)) * k) + "px";
    setF(fnt, lsp);
    c.textAlign = o.align || "left"; c.textBaseline = "alphabetic";
    c.fillStyle = rgba(o.col || GREY, o.a != null ? o.a : 0.78);
    const tm = (ph === "s" || probe) ? c.measureText(str) : null, w = tm ? tm.width : tw(fnt, lsp, str), x0 = x, y0 = y;
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
    c.fillText(str, x, y); return w;
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
    const k = ts / s;
    return tw(`500 ${size * k}px "IBM Plex Mono", monospace`, ((size <= 11 ? 0.8 : 0.2) * k) + "px", str);
  }
  const glow = (col, f) => { c.save(); c.shadowColor = rgba(col, 0.45); c.shadowBlur = 5 * s; const r = f(); c.restore(); return r; };
  const dash = (pat, f) => { c.save(); c.setLineDash(pat); f(); c.restore(); };
  const lab = (str, x, y, o) => text(str, x, y, Object.assign({ size: LABEL, col: GREY, a: NORMAL }, o));
  const mic = (str, x, y, o) => text(str, x, y, Object.assign({ size: LBL(), col: GREY, a: 0.85 }, o));
  const head = (str, x, y, o) => lab(str, x, y, Object.assign({ col: CREAM, a: 0.7, size: LBL() }, o));
  const num = (str, x, y, o) => glow((o && o.col) || GOLD, () => text(str, x, y, Object.assign({ size: VALUE, col: GOLD, a: BRIGHT }, o)));
  const big = (str, x, y, col) => glow(col || CREAM, () => text(str, x, y, { size: HERO, col: col || CREAM, a: 1 }));
  const rad = d => d * PI / 180;
  const pol = (cx, cy, r, d) => [cx + Math.cos(rad(d)) * r, cy + Math.sin(rad(d)) * r];
  const rv = (nm, v, x, y, al) => { const wn = W_(nm, LBL()), wv = W_(v, 10), x0 = al === "right" ? x - wn - 4 - wv : x;
    mic(nm, x0, y, { a: 0.8 }); text(v, x0 + wn + 4, y, { size: 10, col: CREAM, a: BRIGHT }); };
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
  function scaleLab(P, side, u, str, dy, col) {
    const T = len(P), q = at(P, T * (1 - u)), nx = side * -q[3], ny = side * q[2];
    mic(str, q[0] + nx * 17, q[1] + ny * 17 + (dy == null ? 4 : dy), { align: side > 0 ? "right" : "left", col: col || GOLD, a: NORMAL });
  }

  /* ---------- shared wing geometry ---------- */
  const LS = [[486, RAIL], [491, 820], [504, 890], [525, 937], [556, 950]];   // resonance slope (left), top -> foot
  const RS = LS.map(p => [2000 - p[0], p[1]]);                                  // fuel slope (right)
  const KS = 24 / 462, ycL = x => TOP + (x - 24) * KS, ycR = x => TOP + (1976 - x) * KS;
  const half = p => p.map(q => [q[0] + 0.5, q[1] + 0.5]);
  const resN = v => Math.min(resF(v), 1 - Math.hypot(LS[1][0] - LS[0][0], LS[1][1] - LS[0][1]) / len(LS));   // SKETCH v6: the nose starts at the slope's first vertex, so the corner and its grey drop stay visible above it

  /* a stepped rail segment: base (poly + ticks) static, lit window + marker dynamic. o.v / o.win / o.mark in 0..1 */
  function edge(x0, x1, yc, o) {
    const off = o.off || 0, y = x => yc(x) + off, X = t => x0 + (x1 - x0) * t, ec = o.col || GOLD;
    if (ph === "s") {
      poly([[x0, y(x0) + (o.join === "L" || o.noEnd ? 0 : o.cap ? 12 : 7)], [x0, y(x0)], [x1, y(x1)], [x1, y(x1) + (o.join === "R" || o.noEnd ? 0 : o.cap ? 12 : 7)]], ec, STRUCT + 0.08);   // SKETCH v7: o.cap = the end ticks drop 12 px
      for (let i = 0; i <= o.n; i++) { const x = Math.round(X(i / o.n)) + 0.5, M = i % o.maj === 0, m2 = o.mid && i % o.mid === 0, yy = y(x);
        line(x, yy + 1.5, x, yy + (M ? 6 : m2 ? 4 : 2.5) + 0.5, o.tick || ec, M ? 0.45 : m2 ? 0.28 : 0.16); }
    } else {
      if (o.loc) {   // SKETCH v19c: the locator tape: ± bracket round the nearest beacon, filled diamond on it, hollow diamond on the second
        const dm = (xc, fill) => { const yc2 = y(xc) - 5.5; c.beginPath(); c.moveTo(xc, yc2 - 3.5); c.lineTo(xc + 3.5, yc2); c.lineTo(xc, yc2 + 3.5); c.lineTo(xc - 3.5, yc2); c.closePath();
          if (fill) { c.fillStyle = rgba(o.loc[1], BRIGHT); c.fill(); } c.strokeStyle = rgba(o.loc[1], BRIGHT); c.lineWidth = HAIR; c.stroke(); };
        const xa = X(o.win[0]), xb = X(o.win[1]); 
        glow(o.loc[0], () => line(xa, y(xa), xb, y(xb), o.loc[0], BRIGHT, STRONG));
        dm(X(o.mark), true); if (o.pip != null) dm(X(o.pip), false); return y; }
      const ab = o.win || [0, o.v];
      glow(ec, () => line(X(ab[0]), y(X(ab[0])), X(ab[1]), y(X(ab[1])), ec, BRIGHT, STRONG));
      if (o.pip != null) { const xp = X(o.pip), yp = y(xp); line(xp, yp - 1, xp, yp - 5, GREY, 0.7, STRONG); }
      const xm = X(o.mark), ym = y(xm);
      glow(CREAM, () => poly([[xm - 4, ym - 6], [xm, ym - 1.5], [xm + 4, ym - 6]], CREAM, BRIGHT, STRONG));
    }
    return y;
  }
  /* a reading riding on a segment: parts [text, "m"|"n"], baseline 9 px above the edge */
  function rd(parts, x, yc, off, align) {
    const ws = parts.map(p => W_(p[0], LBL())), tw = ws.reduce((a, b) => a + b, 0) + 4 * (parts.length - 1);
    let px = align === "right" ? x - tw : x; const yb = Math.round(yc(x) + off - 9);
    parts.forEach((p, i) => { p[1] === "n" ? text(p[0], px, yb, { size: 10, col: CREAM, a: BRIGHT }) : mic(p[0], px, yb, { a: 0.8 }); px += ws[i] + 4; });
  }
  /* lamp: st 0 dark, 1 lit, 2 burst (ring + rays), 3 burst + red core */
  function lamp(x, y, str, st, shape, lc) {
    const gx = x + 5, gy = y, r = shape === "d" ? 5.2 : 4.4, on = st > 0, red = st === 3, ty = gy + 3;
    const pth = () => { c.beginPath(); if (shape === "d") { c.moveTo(gx, gy - r); c.lineTo(gx + r, gy); c.lineTo(gx, gy + r); c.lineTo(gx - r, gy); c.closePath(); } else c.arc(gx, gy, r, 0, 2 * PI); };
    const g = (col, a, w) => { pth(); c.strokeStyle = rgba(col, a); c.lineWidth = w; c.lineJoin = "round"; c.stroke(); };
    const grown = ts > s + 1e-6;   // grown text: tag starts just past the glyph and drops the letter spacing so it clears the next lamp
    const tag = o => text(str, x + (grown ? 14 : 16), ty, Object.assign({ size: grown ? 8 : LABEL, col: GREY, a: 0.5 }, grown ? { ls: 0 } : {}, o));
    if (!on) { g(lc === C_HULL ? C_HULL_GLOW : lc || GOLD, shape === "d" ? 0.17 : 0.34, 1); tag({ a: shape === "d" ? 0.28 : 0.55 }); return; }   // SKETCH v50: the diamond grid: unlit about half as bright
    const col = red ? RED : lc || CREAM, hi = red ? REDT : lc || CREAM;
    c.save(); c.shadowColor = rgba(hi, 0.8); c.shadowBlur = 8 * s; g(hi, 1, STRONG); c.restore();
    c.save(); c.shadowColor = rgba(hi, 0.7); c.shadowBlur = 6 * s; pth(); c.fillStyle = rgba(col, red ? 1 : shape === "d" ? 0.75 : 0.55); c.fill(); c.restore();
    dot(gx, gy, red ? 1.6 : 1.8, hi, 1);
    if (st >= 2) { const R1 = r + 2;
      c.save(); c.shadowColor = rgba(hi, 0.9); c.shadowBlur = 5 * s;
      arc(gx, gy, R1, 0, 2 * PI, hi, 1, STRONG);
      [45, 135, 225, 315].forEach(d => { const t = rad(d); line(gx + Math.cos(t) * (R1 + 1), gy + Math.sin(t) * (R1 + 1), gx + Math.cos(t) * (R1 + 3.5), gy + Math.sin(t) * (R1 + 3.5), hi, 1, STRONG); });
      c.restore(); }
    tag({ col: CREAM, a: st >= 2 || shape === "d" ? 1 : BRIGHT });
  }
  function arcScale(cx, cy, r, a0, a1, st, maj, o) {
    const n = Math.round((a1 - a0) / st);
    for (let k = 0; k <= n; k++) { const d = a0 + k * st, M = k % maj === 0, m2 = o.mid && k % o.mid === 0, L = M ? o.LM : m2 ? 4 : 2;
      const p0 = pol(cx, cy, r, d), p1 = pol(cx, cy, r - L, d); line(p0[0], p0[1], p1[0], p1[1], o.col || GOLD, M ? o.aM : m2 ? 0.3 : 0.16); }
  }

  /* ======================= LEFT WING ======================= */
  let nearTop = 500, nearDm = 0;   // SKETCH v22b: the fan's outer range and the nearest distance, for the near bar
  const TXR = 352, RX = 320, RY = 946, SR = 81, FA0 = -140, FA1 = -40, DF = SR / 62, WB = [[128, 870], [255, 821]];   // the dial group sits down-left at 0.6 scale (dialF)
  const SH = 34, CX = 312 + SH, CY = 950, HR = 76, BX = 20 + SH;   // SKETCH v29: the whole sonar column moved right by SH
  ;   // SKETCH v28: column B moved right (rows +20, half-disc centre +23, R stays 76: R 80 touched the near row);   // SKETCH v24a: the sound half-disc: centre = the ship on the foot line, radius HR
  const dialF = f => { c.save(); c.translate(RX, RY); c.scale(DF, DF); c.translate(-RX, -RY); f(); c.restore(); };
  const wbY = x => WB[0][1] + (x - WB[0][0]) * (WB[1][1] - WB[0][1]) / (WB[1][0] - WB[0][0]);
  const brgInt = b => Math.round(b) % 360;   // round first, then wrap: 359.5 and up reads 000
  const brgOf = b => ((Math.atan2(b[1], b[0]) * 180 / PI + 90) % 360 + 360) % 360;

  /* SKETCH v3 kit: top edge yT (H), one text rule `label value unit` (label/unit 10 GREY QUIET, value 12 CREAM NORMAL, one space apart) */
  const yT = x => ycL(x) - 6;
  const trip = (p, x, y, al, vs, cc, ls) => { vs = vs || VALUE; ls = ls || LABEL; const SP = W_(" ", ls), w = p.map((q, i) => W_(q, i % 2 === 1 ? vs : ls)), tw = w.reduce((a, b) => a + b, 0) + SP * (p.length - 1);
    let px = al === "right" ? x - tw : al === "center" ? x - tw / 2 : x; const l0 = px;
    p.forEach((q, i) => { text(q, px, y, i % 2 === 1 ? { size: vs, col: cc ? cc[1] : CREAM, a: cc && cc[2] != null ? cc[2] : NORMAL } : { size: ls, col: cc ? cc[0] : GREY, a: cc && cc[3] != null ? cc[3] : QUIET }); px += w[i] + SP; });
    return [l0, l0 + tw, y - 0.75 * vs, y + 0.22 * vs]; };   // SKETCH v12: vs = the value's size (default VALUE)   // the trip's box [l, r, t, b]
  /* nose text boxes [l, r, t, b]: the trip's box without drawing, and the boxes the 2nd readout and the bar label must keep clear of */
  let noseNB = []; const pkNB = [0, 0, 0, 0];
  const tripBox = (p, x, y, al) => { const SP = W_(" ", LABEL), tw = p.reduce((a, q, i) => a + W_(q, i === 1 ? VALUE : LABEL), 0) + SP * (p.length - 1), l0 = al === "right" ? x - tw : al === "center" ? x - tw / 2 : x;
    return [l0, l0 + tw, y - 0.75 * VALUE, y + 0.22 * VALUE]; };
  const nbHit = b => noseNB.some(o => Math.min(b[1], o[1]) - Math.max(b[0], o[0]) > -1 && Math.min(b[3], o[3]) - Math.max(b[2], o[2]) > -1)
    || (b[1] > 214 && b[0] < 486 && b[3] > ycL(Math.max(b[0], 214)) - 14 && b[2] < ycL(Math.min(b[1], 486)) + 2);   // the bearing tape's ticks run 14 px above to 2 px below its line
  function paintLeft() {
    const GOLD = C_TOP;   // the left wing senses the outside: its line-work is cold white (the nose resonance below names C_NOSE)
    const footR = (pts, tEnd) => { const n = pts.length, k = pts[n - 1], p = pts[n - 2], dx = k[0] - p[0], dy = k[1] - p[1], l = Math.hypot(dx, dy), A = [k[0] - dx / l * 10, k[1] - dy / l * 10], B = [k[0] + 10, k[1]], r = pts.slice(0, n - 1); r.push(A);
      for (let i = 1; i <= 8; i++) { const t = tEnd * i / 8, u = 1 - t; r.push([u * u * A[0] + 2 * u * t * k[0] + t * t * B[0], u * u * A[1] + 2 * u * t * k[1] + t * t * B[1]]); } return r; };   // SKETCH v8: the last vertex becomes a quadratic curve with 10 px legs, drawn to tEnd
    const FT = len(LS), uR = resN(LF.resNow), b0 = api._forceBrg != null ? api._forceBrg : LF.blips[0] ? brgOf(LF.blips[0]) : LF.brg, b1 = LF.blips[1] ? brgOf(LF.blips[1]) : null;
    let redEnd = null;
    dyn(() => {   // SKETCH v32: the slope edge is the resonance meter: white all the way, red over it from the top for res x its length
      const E = footR(half(LS.concat([[HB0, FL]])), 1); poly(E, "240,236,222", 0.6, STRONG);
      let rem = Math.min(1, Math.max(0, LF.resNow)) * len(E); const Er = E.slice().reverse(), R = [Er[0]];   // SKETCH v33: red rises from the foot
      const sT0 = at(LS, len(LS) * (1 - uR))[1] + 4, nR0 = Math.max(0, Math.floor((FL - sT0) / 15.5 + 1e-6)), PE0 = nR0 ? (FL - sT0) / nR0 : 13;   // SKETCH v48: one plate's height computed here (paintSig runs after this dyn, so LF.minPlate was unset)
      const yMin = LF.resNow > 0 ? FL - PE0 : 1e9;   // SKETCH v47: with a source the red is at least one plate tall (up to the lowest plate's top)
      for (let i = 1; i < Er.length && (rem > 0 || Er[i - 1][1] > yMin); i++) { const d = Math.hypot(Er[i][0] - Er[i - 1][0], Er[i][1] - Er[i - 1][1]), y0 = Er[i - 1][1], y1 = Er[i][1], uY = y0 <= yMin ? 0 : y1 <= yMin ? (y0 - yMin) / (y0 - y1) : 1, u = Math.min(1, Math.max(rem / d, uY)); R.push([Er[i - 1][0] + (Er[i][0] - Er[i - 1][0]) * u, Er[i - 1][1] + (Er[i][1] - Er[i - 1][1]) * u]); rem -= d; }
      if (R.length > 1) {   // SKETCH v40: the red reads at a glance: a soft glow, a 2.5 px brighter oxblood line, a white tick at the level
        poly(R, "200,48,47", 0.16, 6.5); poly(R, "200,48,47", 1, 2.5);
        const q = R[R.length - 1], o = R[R.length - 2], dl = Math.hypot(q[0] - o[0], q[1] - o[1]) || 1;
        redEnd = [q[0], q[1], (q[1] - o[1]) / dl, -(q[0] - o[0]) / dl]; } else redEnd = null;   // SKETCH r53: the one measurement: the nose marker sits where the red ends (x, y, normal toward the text side)
    });
    stat_(() => {
      line(HB0 + 10, FL + 0.5, XL, FL + 0.5, GOLD, STRUCT); line(XL + 0.5, FL, XL + 0.5, FL + 9, GOLD, STRUCT);
    });
    /* SKETCH v19: no mirror of the right wing: the rise, rail, scale, marker and speed trace are gone; the speed reading is a compact gold movement block (rows 788 / 800 / 812, under cap A; drift and lat rows in paintDrift) */
    dyn(() => {
      { const sp = Math.max(0, Math.min(1, LF.speedAt)), xs = 24 + (178 + SH) * sp, sT = Math.round(LF.speedAt * 100) + " %", nw = W_(sT, 14), nx = Math.max(26 + W_("speed", 9) + 4, Math.min(236 - nw, xs - nw / 2)), yy = ycL(xs) + 15;   // SKETCH v35: the speed number rides under the ruler's lit end
        lab("speed", nx - W_("speed", 9) - 4, yy, { size: 9, col: C_MID, a: 0.6 }); num(sT, nx, yy, { size: 14, col: C_MID }); }
    });
    stat_(() => poly([[376 + SH, yT(376 + SH)], [480, yT(480)], [486, yT(480) + 6], [486, RAIL]], "240,236,222", 0.6, STRONG));   // SKETCH v34: white like the slope edge, only the slope carries red   // SKETCH v9: red, same as the slope   // SKETCH v8: no left tick, a 6 px chamfer, the drop runs on into the slope   // SKETCH v7: cap C, the nose piece over the bar ids, ends in the v6 corner
    /* signal strength rail, bearing tape */
    /* the pointers run the full rail (95 = 95% along); the readings sit under the rail ends, clear of the pointer track */
    const dz = LF.dz, strD = dz ? dz.str * 8 : 0, strM = Math.max(0, Math.min(1, LF.str / 100)), strU = Math.max(0, Math.min(1, (LF.str + strD) / 100)), spM = Math.max(0, Math.min(1, LF.speedAt));   // the fill flickers, the pointer stays true
    const PURL = "108,116,188", PURV = "150,158,224";   // SKETCH v19c: the locator is blue-purple, the force bars' family (dim labels, bright values)
    const brgS = String(brgInt(b0)).padStart(3, "0"), brgM = b0 / 360, WD = parseFloat(String(LF.width).replace(/[^0-9.]/g, "")) || 0;
    edge(24, 202 + SH, ycL, { col: C_MID, off: -6, cap: 1, n: 20, maj: 5, v: spM, mark: spM });   // SKETCH v24c: cap A's ruler is the speed scale (lit to the speed, marker on it); the str tick is drawn below
    edge(214 + SH, 364 + SH, ycL, { noEnd: 1, col: GOLD, tick: PURL, loc: [PURL, PURV], off: -6, cap: 1, n: 24, maj: 6, mid: 3, win: [Math.max(0, brgM - WD / 360), Math.min(1, brgM + WD / 360)], mark: brgM, pip: b1 == null ? null : b1 / 360 });
    dyn(() => { { const xs = 24 + (178 + SH) * strM, ys = ycL(xs) - 6; line(xs, ys - 1, xs, ys - 5, CREAM, BRIGHT, STRONG); }
      ext.str = [24 + (178 + SH) * spM - 4, 24 + (178 + SH) * spM + 4, 24, 202 + SH]; ext.brg = [214 + SH + 150 * brgM - 4, 214 + SH + 150 * brgM + 4, 214 + SH, 364 + SH];
      const px = (x0, x1, m, off) => { const x = x0 + (x1 - x0) * m, y = ycL(x) + off; return { l: x - 4, r: x + 4, t: y - 6, b: y - 1.5 }; };
      if (blk === 1) { lbD.push(Object.assign({ s: "strptr" }, px(24, 202 + SH, spM, -6)), Object.assign({ s: "brgptr" }, px(214 + SH, 364 + SH, brgM, -6)));
        if (LF.rep) LF.rep.strFrac = strM; } });
    stat_(() => ["n", "e", "s", "w", "n"].forEach((str, i) => { const x = 214 + SH + 150 * i / 4; mic(str, x + (i === 4 ? -3 : 3), ycL(x) - 6 + 12, { align: i === 4 ? "right" : "left", a: 0.6, col: PURL }); }));
    dyn(() => { const pad = Math.max(0, (12 - (214 - 204)) / 2);   // the two rail labels keep 12 px between them, each slid toward its own rail end
      const n0 = lbD.length;   // str label above its rail, brg label below its rail
      noseNB = [0, 1, 2, 3, 4].map(i => { const x = 214 + SH + 150 * i / 4, w = W_(["n", "e", "s", "w", "n"][i], LBL()), l = x + (i === 4 ? -3 - w : 3), y = ycL(x) + 6; return [l, l + w, y - 0.75 * LBL(), y + 0.22 * LBL()]; });
      const n1 = lbD.length;
      const LB = 11, VL = 14;   // SKETCH v20b: locator rows: labels 11 px, values 14 px
      let yR = Math.round(yT(220) + 38 - 6), SP = W_(" ", LB), sd = String(brgInt(b0)).padStart(3, "0"), wd = LF.width === "—" ? "" : LF.width;   // SKETCH v19c: one row under the tape "045 ±13°  ·  2nd 238", the range "1,440 m e" after it
      let px = 216 + SH; const seg = (q, v) => { text(q, px, yR, v ? { size: VL, col: CREAM, a: BRIGHT } : { size: LB, col: PURL, a: 1 }); px += W_(q, v ? VL : LB) + SP; };
      seg(sd, 1); if (wd) seg(wd, 1); if (b1 != null) { seg("2nd", 0); seg(String(brgInt(b1)).padStart(3, "0"), 1); }
      noseNB.push([216 + SH, px - SP, yR - 0.75 * VL, yR + 0.22 * VL]);
      if (0) { const xp = 214 + 150 * b1 / 360, s2 = ["2nd", String(brgInt(b1)).padStart(3, "0")], y0 = Math.round(yT(xp) + 26);   // slid down to the first free y, or skipped
        for (let dy = 0; dy <= 30; dy++) { if (nbHit(tripBox(s2, xp, y0 + dy, "center"))) continue; noseNB.push(trip(s2, xp, y0 + dy, "center")); break; } }
      if (blk === 1 && LF.rep) LF.rep.lab = { str: lbD.slice(n0, n1), brg: lbD.slice(n1) }; });
    /* nose resonance on the slope: log axis */
    stat_(() => { [0.001, 0.01, 0.1, 1].forEach(d => { for (let m = 1; m <= (d === 1 ? 0 : 9); m++) tickAt(LS, 1, resF(d * m), m === 1 ? 7 : 3, C_NOSE, m === 1 ? 0.6 : 0.26); });
       });
    dyn(() => {
      const rn = String(LF.resNow.toFixed(2));
      /* SKETCH v9: the slope is drawn red in full by the static layer, so no second red stroke here */
      /* SKETCH v8 blade edge: a dim hairline 3 px inside the slope, a notch every 12 px of slope length between the two */
      { const LL = LS.concat([[HB0, FL]]), d0 = FT * (1 - uR), d1 = len(LL) - 10, ip = d => { const q = at(LL, d); return [q[0] + q[3] * 4, q[1] - q[2] * 4]; }, inn = [];
        for (let d = d0; d < d1; d += 2) inn.push(ip(d)); inn.push(ip(d1)); poly(inn, GREY, 0.3);
        for (let d = d0 + 12, n = 1; d < d1; d += 12, n++) { const q = at(LL, d), p = ip(d), e = n % 4 === 0 ? 1.5 : 0; line(q[0], q[1], p[0] + q[3] * e, p[1] - q[2] * e, GREY, 0.4); } }   // SKETCH v9: the notched scale is dim grey
      if (!redEnd) return;
      const t = redEnd, x = t[0], y = t[1]; if (t[3] < 0.5) line(x + t[2], y + t[3], x + t[2] * 10, y + t[3] * 10, CREAM, BRIGHT);   // SKETCH r53: same tick as tickAt drew, now at the red's end; on the flat foot it would run into the lowest plate, so it is left out there
      { const nx = -t[2], ny = -t[3]; c.fillStyle = rgba(GREY, 0.85); c.beginPath(); c.moveTo(x + nx * 8 + ny * 3.5, y + ny * 8 - nx * 3.5); c.lineTo(x + nx * 1.5, y + ny * 1.5); c.lineTo(x + nx * 8 - ny * 3.5, y + ny * 8 + nx * 3.5); c.closePath(); c.fill(); }   // SKETCH v9: a solid 7 px chevron on the void side, tip into the slope   // SKETCH v8: a 6 px chevron on the void side, tip into the slope
      dot(x, y, 2.5, CREAM, 1);   // SKETCH v3 item 6: the ">" chevron is gone, the dot stays
    });
    /* the lobe's spectrum on the wedge base */
    stat_(() => { [].forEach((t, i, a) => { if (i % 2) return; const x0 = WB[0][0], y0 = WB[0][1], x1 = WB[1][0], y1 = WB[1][1], t1 = a[i + 1];
        line(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, x0 + (x1 - x0) * t1, y0 + (y1 - y0) * t1, GOLD, 0.24); }); });
    const FLR = LF.floor;
    if (0) dyn(() => {   // SKETCH v3: the old wedge spectrum, peak, floor, width and 2nd are off
      const x0 = 130, n = 21, st = 4.6, k = 2.6, TOPY = ts > s + 1e-6 ? 822 : 814, PK = 4;
      const lv = i => i === PK ? LF.str : 2.2 + 2.4 * LF.spectrum[(i * 7) % 32] + 10 * Math.exp(-Math.pow((i - PK) / 1.1, 2)) + 2.6 * Math.exp(-Math.pow((i - 12) / 1.0, 2));
      let pk;
      for (let i = 0; i < n; i++) { const x = Math.round(x0 + i * st) + 0.5, yb = wbY(x) - 3, v = lv(i), h = Math.min(v * k, yb - TOPY), up = v > FLR;
        if (i === PK) { glow(CREAM, () => line(x, yb, x, yb - h, CREAM, BRIGHT, STRONG)); pk = [x, yb - h]; }
        else line(x, yb, x, yb - h, GOLD, up ? 0.75 : 0.3, up ? STRONG : HAIR); }
      const xe = x0 + (n - 1) * st;
      dash([1, 3], () => line(x0 - 2, wbY(x0 - 2) - 3 - FLR * k, xe + 2, wbY(xe + 2) - 3 - FLR * k, GREY, 0.6));
      line(xe + 2, wbY(xe + 2) - 3 - FLR * k, xe + 5, wbY(xe + 5) - 3 - FLR * k, GREY, 0.6);   // hair leader from the floor line to its label
      mic("floor", xe + 6, wbY(xe + 6) - FLR * k, { a: 0.8 });
      glow(CREAM, () => poly([[pk[0] - 4, pk[1] - 9], [pk[0], pk[1] - 4.5], [pk[0] + 4, pk[1] - 9]], CREAM, BRIGHT, STRONG)); shape("chev:peak", pk[0] - 4, pk[1] - 9, pk[0] + 4, pk[1] - 4.5);
      rv("peak", String(LF.str), pk[0] + 8, pk[1] - 3, "left");
      /* the dial's small readings: lobe width and the second source, beside its contact count */
      rv("width", LF.width, 152, 948, "left");
      if (b1 != null) { const s2 = String(Math.round(b1)).padStart(3, "0"); rv("2nd", s2, 152, 960, "left"); mic("faint", 152 + W_("2nd", LBL()) + 4 + W_(s2, 10) + 6, 960, { a: 0.6 }); }
    });
    /* lamp bank: two rows of 7 */
    const LX0 = [168, 218, 268, 322, 372, 422, 468];
    dyn(() => { const LX = [];   // each column starts 6 px past the widest word before it (tag 16 px right of the lamp, diamond 0.2 px left of it)
      const LL = LF.lampsL.filter(l => l[0] !== "rift");   // SKETCH v18b: "rift" can never light, so it is not drawn; the second row ends one lamp short
      LX0.forEach((x0, i) => { LX.push(i ? Math.max(x0, LX[i - 1] + 16 + Math.max(W_(LL[i - 1][0], LABEL), LL[i + 6] ? W_(LL[i + 6][0], LABEL) : 0) + 6.2) : x0); });
      LL.forEach((l, i) => lamp(LX[i % 7], i < 7 ? 975 : 989, l[0], l[1], "d", GOLD)); });
    /* SKETCH v21a: the sound instrument is a fan (sector), apex low at (RX,RY) = the ship, opening up toward the locator tape. Left side -100.5 deg runs parallel to the nose slope, the flat side +3 deg parallel to the top edge (span 103.5 deg); the outer arc is the listening range SR; the sweep goes back and forth inside it; the 32 spectrum spikes and "str N" moved out (LF.spectrum, LF.str stay for the sound monitor) */
    /* SKETCH v21b: the sound monitor, bottom-left corner. Open frame: chamfered top-left, top line, right edge parallel to the nose slope (dx/dy 0.186) landing on the fan's left-side end (280, 931). Inside: the 28 signal bins as white bars on a baseline, the slow peak-hold ticks, "str N" over the peak bar, the nearest mark's voice (purple when a contact is the source), the live envelope, and 5 s of str along the bottom */
    const SM = { x0: 26, x1: 222 + SH, base: 962, hmax: 56, hy0: 983, hy1: 992 };   // SKETCH v35: from the wing's left edge down to the diamond rows   // SKETCH v26: column A under the pad row: x 26-200, y 858-950
    stat_(() => { /* SKETCH v26: no frame, no dividers: columns are separated by spacing only */
     line(SM.x0, SM.base, SM.x1, SM.base, GOLD, 0.3, 1); line(SM.x0, SM.hy1 + 1, 158, SM.hy1 + 1, GOLD, 0.14, 1); });   // SKETCH v35: right of x 158 the lamps start, so the floor steps up to 962
    dyn(() => {
      const bars = LF.bars || [], pks = LF.peaks || [], n = bars.length || 1, pitch = (SM.x1 - SM.x0) / n, bw = Math.max(3, pitch - 3);
      let pk = 0; bars.forEach((v, i) => { if (v > bars[pk]) pk = i; });
      const vm = Math.max(0.02, ...bars, ...pks), hh = (v, i) => Math.min(1, v / vm) * SM.hmax;   // SKETCH v21c: the tallest bin or hold fills the monitor up to the 'str' label, the rest scale with it
      bars.forEach((v, i) => { const x = SM.x0 + i * pitch + (pitch - bw) / 2, h = Math.max(1, hh(v, i)); c.fillStyle = rgba(CREAM, 0.5); const bs = SM.base; c.fillRect(x, bs - h, bw, h);
        const ph_ = hh(Math.max(v, pks[i] || 0), i); line(x, bs - ph_ - 2, x + bw, bs - ph_ - 2, CREAM, 0.85, 1); });
      const px = SM.x0 + pk * pitch + pitch / 2, pt_ = hh(Math.max(bars[pk] || 0, pks[pk] || 0), pk), sv = "str " + LF.str, sw = W_(sv, 11);
      const sy = SM.base - Math.max(0, Math.min(1, LF.str / 100)) * SM.hmax; line(SM.x0, sy, SM.x1, sy, "255,255,255", 0.85, 1); text(sv, SM.x1 + 2 - sw, SM.base - SM.hmax - 7, { size: 11, col: CREAM, a: 0.85, align: "left" });   // SKETCH v45: str is the sound monitor's peak strength: a thin white level line at str/100 of hmax from the base, "str N" at its right end
      const nb = !!LF.blips[0], vc = LF.voice || "void";
      text("voice " + vc, SM.x0, 876, { size: 9, col: nb ? "150,158,224" : GREY, a: nb ? 0.95 : 0.75, align: "left" });
      if (LF.envName) text("env " + LF.envName, SM.x1, 876, { size: 9, col: GREY, a: 0.8, align: "right" });
      const hs = LF.strH || [], hn = hs.length; if (hn > 1) { c.strokeStyle = rgba(CREAM, 0.7); c.lineWidth = 1; c.beginPath();
        hs.forEach((v, i) => { const x = SM.x0 + i * (158 - SM.x0) / (hn - 1), y = SM.hy1 - Math.max(0, Math.min(1, v / 100)) * (SM.hy1 - SM.hy0); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); }
    });
    /* SKETCH v24a: the half-disc. Centre = the ship on the foot line, radius HR = the outer range ring. x = east-west offset (east right), height = the north offset (LF blips are [east, south], so height = -b[1]); contacts south of the ship sit on the base with a small tick down. Sweep covers 180 deg (-PI = west, 0 = east) */
    stat_(() => { arc(CX, CY, HR, -PI, 0, GOLD, 0.45); line(CX - HR, CY, CX + HR, CY, GOLD, 0.45, 1); dot(CX, CY, 1.6, GOLD, 0.6); });
    const cpos = b => { let ex = b[0] * HR, h = -b[1] * HR; const m = Math.hypot(ex, h); if (m > 0.94 * HR) { ex *= 0.94 * HR / m; h *= 0.94 * HR / m; } return { x: CX + ex, y: CY - Math.max(0, h), below: h < 0, ang: Math.atan2(-Math.max(0, h), ex) }; };
    dyn(() => {
      const sw = LF.sweep, TAU = 2 * PI, PUR = "150,158,224", b0 = LF.blips[0], f0 = -PI, f1 = 0;
      const sa = -PI / 2 + (PI / 2) * Math.sin(sw), dir = Math.cos(sw) >= 0 ? 1 : -1;   // the scan sweeps back and forth across the half-disc
      const pt = (r, a) => [CX + Math.cos(a) * r, CY + Math.sin(a) * r];
      for (let i = 0; i < 24; i++) { const a = Math.max(f0, Math.min(f1, sa - dir * i * (PI / 2) / 24)), q = pt(HR, a); line(CX, CY, q[0], q[1], GOLD, 0.22 * Math.pow(1 - i / 24, 1.6), 2.4); }   // the trail: 90 deg of fading wedge behind the sweep
      { const q = pt(HR, sa); line(CX, CY, q[0], q[1], GOLD, NORMAL); }
      if (b0) { const q = pt(HR, cpos(b0).ang); line(CX, CY, q[0], q[1], PUR, 0.22, 1); }   // faint purple spoke on the nearest source's bearing
      LF.blips.forEach((b, i) => { const p = cpos(b), x = p.x, y = p.y, r = Math.min(0.94, Math.hypot(b[0], b[1])), ag = Math.abs(sa - p.ang), fade = Math.exp(-ag * 0.9), near = 1 - 0.6 * r;
        if (ag < 0.5) arc(x, y, 3 + 20 * ag, 0, TAU, i ? GREY : PUR, 0.5 * (1 - ag / 0.5));   // the flare ring when the sweep passes
        if (p.below) line(x, y, x, y + 4, i ? GREY : PUR, 0.8, 1);
        if (i) { }   // the 2nd is drawn as a hollow diamond by the content block
        else { const k = 3.2 + 2.6 * near; c.beginPath(); c.moveTo(x, y - k); c.lineTo(x + k, y); c.lineTo(x, y + k); c.lineTo(x - k, y); c.closePath(); c.fillStyle = rgba(PUR, Math.min(1, 0.5 + 0.5 * fade)); c.fill(); } });
      if (LF.dz && LF.dz.radar) LF.dz.radar.forEach((r, j) => { const st = Math.floor(LF.sigT * r.pat[0] * 2), w = r.a * (0.15 + 0.85 * r.s), n = r.s > 0.5 ? 2 : 1;   // faint ghosts that hop at the pattern's rate
        for (let q = 0; q < n; q++) { const h = Math.sin(st * 12.9898 + q * 78.233 + j * 37.7) * 43758.5453, u = h - Math.floor(h), h2 = Math.sin(st * 4.1414 + q * 19.19 + j) * 24634.63, v = h2 - Math.floor(h2), rr = 8 + (HR - 14) * u, an = -PI + v * PI;
          dot(CX + Math.cos(an) * rr, CY + Math.sin(an) * rr, 1.6, CREAM, Math.min(0.6, 0.1 + 0.5 * w) * (0.6 + 0.4 * Math.sin(LF.sigT * r.pat[0] * 6))); } });
    });
    dyn(() => {   // range arcs (half circles) at nice distances, the outer one the smallest nice value that holds the nearest source; the 9 px labels sit on the base, right-aligned just inside each arc's east end
      const b0 = LF.blips[0], ru = b0 ? Math.hypot(b0[0], b0[1]) : 0, dm = parseFloat(String(String(LF.near).split(" ")[1] || "").replace(/,/g, "")), mpu = ru > 0.05 && dm > 0 ? dm / ru : 22000;
      let top = 500; [500, 1000, 2000, 5000, 10000, 20000].some(v => { top = v; return v >= (ru > 0.05 && dm > 0 ? dm : mpu * 0.5); }); nearTop = top; nearDm = dm > 0 ? dm : 0;
      [top / 4, top / 2, top].forEach((v, i) => { const f = Math.min(0.86, v / mpu), lab = (v >= 1000 ? v / 1000 + "k" : String(v)) + (i === 2 ? " m" : ""), lr = HR * f;
        arc(CX, CY, lr, -PI, 0, GOLD, i === 2 ? 0.2 : 0.14);
        const prev = i ? HR * Math.min(0.86, [top / 4, top / 2][i - 1] / mpu) : 8, w = W_(lab, 9);   // the label needs 4 px before the next arc inward (the centre for the first), else it is dropped
        if (CX + lr - 3 - w >= CX + prev + 4) text(lab, CX + lr - 3, CY - 3, { size: 9, col: GREY, a: 0.7, align: "right" }); });
      text("W", CX - HR + 4, CY - 3, { size: 9, col: GREY, a: 0.7, align: "left" }); text("E", CX + HR - 4, CY - 3, { size: 9, col: GREY, a: 0.7, align: "right" });   // SKETCH v25: inside the base ends so the larger disc stays in column B
    });
    dyn(() => {   // SKETCH v24a: the half-disc's content, all from LF: ticks every 30 deg, the spread wedge, the other contacts, the sites, the unread chevron
      const PUR = "150,158,224", TAU = 2 * PI, pt = (r, a) => [CX + Math.cos(a) * r, CY + Math.sin(a) * r];
      const placed = [];   // label boxes already used, so every id keeps 4 px from the next
      const b0 = LF.blips[0], wd = parseFloat(String(LF.width).replace(/[^0-9.]/g, "")) || 0;
      for (let a = -150; a <= -30; a += 30) { const p = pt(HR, rad(a)), q = pt(HR - 4, rad(a)); line(p[0], p[1], q[0], q[1], GOLD, 0.6, 1); }   // a tick every 30 deg on the outer arc
      if (b0 && wd > 0) { const t = cpos(b0).ang, a0 = Math.max(-PI, t - rad(wd)), a1 = Math.min(0, t + rad(wd)); if (a1 > a0) { c.beginPath(); c.moveTo(CX, CY); c.arc(CX, CY, HR, a0, a1); c.closePath(); c.fillStyle = rgba(PUR, 0.1); c.fill(); } }   // the nearest one's +- spread from the ship, the same number the tape prints
      const sw = LF.sweep, sa = -PI / 2 + (PI / 2) * Math.sin(sw);
      const all = LF.blips.map((b, i) => ({ b, id: (LF.bid || [])[i], i })).concat((LF.more || []).map((m, j) => ({ b: m.b, id: m.id, i: 2 + j })));
      all.forEach(m => { const p = cpos(m.b), x = p.x, y = p.y, r = Math.min(0.94, Math.hypot(m.b[0], m.b[1])), ag = Math.abs(sa - p.ang), fade = Math.exp(-ag * 0.9), near = 1 - 0.6 * r;
        if (m.i === 1) { const k = 3.2 + 2.6 * near; c.beginPath(); c.moveTo(x, y - k); c.lineTo(x + k, y); c.lineTo(x, y + k); c.lineTo(x - k, y); c.closePath(); c.strokeStyle = rgba(PUR, 0.5 + 0.5 * fade); c.lineWidth = 1; c.stroke(); if (p.below) line(x, y + k, x, y + k + 4, PUR, 0.8, 1); }   // the 2nd is a hollow diamond, as on the tape
        else if (m.i > 1) { if (ag < 0.5) arc(x, y, 2 + 14 * ag, 0, TAU, GREY, 0.4 * (1 - ag / 0.5)); dot(x, y, 1.2 + 2 * near, GREY, near * (0.25 + 0.65 * fade)); if (p.below) line(x, y, x, y + 4, GREY, 0.6, 1); }
        if (m.id && m.i < 5) { const lw = W_(m.id, 9), lx = Math.hypot(x + 6 + lw / 2 - CX, y - CY) + lw / 2 > HR - 4 ? x - 6 - lw : x + 6, bx = [lx, y - 4, lx + lw, y + 5];   // labels sit right of the mark, left when they would leave the disc
          if (!placed.some(q => bx[0] < q[2] + 4 && bx[2] > q[0] - 4 && bx[1] < q[3] + 4 && bx[3] > q[1] - 4)) { placed.push(bx); text(m.id, lx, y + 3, { size: 9, col: m.i < 2 ? PUR : GREY, a: m.i < 2 ? 0.95 : 0.8, align: "left" }); } } });
      (LF.sites || []).forEach(s => { const x = CX + Math.max(-0.94, Math.min(0.94, s.d)) * HR, y = CY - 4;   // a site is one-dimensional (east or west), so it sits on the base at its x; met = hollow, unvisited = filled
        if (s.met) { c.strokeStyle = rgba(GOLD, 0.9); c.lineWidth = 1; c.strokeRect(x - 2.5, y - 2.5, 5, 5); } else { c.fillStyle = rgba(GOLD, 0.9); c.fillRect(x - 2.5, y - 2.5, 5, 5); } });
      if (LF.ball) { const east = LF.ball[0] > 0, a = rad(east ? -20 : -160), q = pt(HR, a), d = east ? 1 : -1, tx = -Math.sin(a) * d, ty = Math.cos(a) * d, nx = Math.cos(a), ny = Math.sin(a);   // the unread pull: a purple chevron on the arc, pointing the way it pulls
        const tip = [q[0] + tx * 5, q[1] + ty * 5]; line(tip[0], tip[1], q[0] - nx * 4, q[1] - ny * 4, PUR, 0.95, 1.2); line(tip[0], tip[1], q[0] + nx * 4, q[1] + ny * 4, PUR, 0.95, 1.2); }
    });
    dyn(() => {   // SKETCH v26: the shoulders above the arc: contacts in range per side (west / east of the ship), purple, with a bar of n
      const PUR = "150,158,224", all = LF.blips.concat((LF.more || []).map(m => m.b)), nW = all.filter(b => b[0] < 0).length, nE = all.length - nW;
      [["W", nW, CX - HR, "left"], ["E", nE, CX + HR, "right"]].forEach(q => { const t = q[0] + " " + q[1], w = W_(t, 9), bw = Math.min(6, q[1]) * 3, bx = q[3] === "left" ? q[2] : q[2] - bw;
        text(t, q[2], 889, { size: 9, col: PUR, a: 0.95, align: q[3] });
        if (q[1]) { c.fillStyle = rgba("108,116,188", 0.9); c.fillRect(bx, 892, bw, 3); } });
    });
    paintDrift();
    paintOutside();
    paintSig();
  }

  function paintDrift() {
    const GOLD = C_TOP;
    const cx = 113, cy = 840, r = 11, xg = 202, yr = 812, yb = 868, M = 46, yH = x => cy + (x - cx) * 0.052, xV = y => cx + (y - cy) * 0.2;   // SKETCH v12: lat rail 24-202 (cap A's width), vert rail centred on it   // SKETCH v3: cross at (110,848), lat on H, vert on V
    dyn(() => {
      const lat = LF.lat, vert = LF.vert;
      const mv = Math.hypot(lat, vert) * 5, mt = mv >= 9.95 ? "9.9+" : mv.toFixed(1);   // over the slot clamps to its max text
      const E = [];
      { const dx = Math.max(-1, Math.min(1, lat)) * 14, dy = Math.max(-1, Math.min(1, vert)) * 14;   // SKETCH v23a: lat (x) and vert (y, up) as the ship's slip vector at the cone's apex
        const px0 = 58, py0 = 806, pw_ = 70, ph_ = 44, pcx = px0 + pw_ / 2, pcy = py0 + ph_ / 2;   // SKETCH v26: the lat/vert pad on its own row under the numbers, 40 x 24, +-1 = pad edge
        for (let gx = 0; gx <= pw_; gx += 6) for (let gy = 0; gy <= ph_; gy += 6) dot(px0 + gx, py0 + gy, 0.7, C_MID, 0.25);   // SKETCH v27: a faint dot grid, 6 px pitch
        [[px0, py0, 1, 1], [px0 + pw_, py0, -1, 1], [px0, py0 + ph_, 1, -1], [px0 + pw_, py0 + ph_, -1, -1]].forEach(k => { line(k[0], k[1], k[0] + 4 * k[2], k[1], C_MID, 0.3, 1); line(k[0], k[1], k[0], k[1] + 4 * k[3], C_MID, 0.3, 1); });   // L marks at the four corners only
        const sx_ = pcx + Math.max(-1, Math.min(1, lat)) * pw_ / 2, sy_ = pcy - Math.max(-1, Math.min(1, vert)) * ph_ / 2;
        line(pcx, pcy, sx_, sy_, C_MID, 0.25, 1); dot(sx_, sy_, 4, C_MID, 0.25); dot(sx_, sy_, 2.2, C_MID, 1); }   // the slip dot (lat = x, vert = y up, +-1 = field edge) with a faint trail and halo
      { const hs = paintDrift.h || (paintDrift.h = { a: [], t: 0 }), now_ = performance.now() / 1000;   // SKETCH v29: the slip magnitude over the last 5 s as a continuous gold polyline, older fainter, the newest point a dot; the sketch's fake data wanders
        const smp = t => Math.min(1, Math.hypot(lat, vert) * (0.75 + 0.35 * Math.sin(t * 1.7) + 0.2 * Math.sin(t * 4.3 + 1)) / 0.6);
        if (!hs.a.length) for (let k = 49; k >= 0; k--) hs.a.push(smp(now_ - k * 0.1));
        if (now_ - hs.t >= 0.1) { hs.t = now_; hs.a.push(smp(now_)); if (hs.a.length > 50) hs.a.shift(); }
        const gx0 = 138, gx1 = 222 + SH, gy0 = 806, gy1 = 850;
        for (let gx = gx0; gx <= gx1; gx += 6) for (let gy = gy0; gy <= gy1; gy += 6) dot(gx, gy, 0.7, C_MID, 0.25);
        const hn = hs.a.length, tx = i => gx1 - (hn - 1 - i) * (gx1 - gx0) / 49, ty = i => gy1 - hs.a[i] * (gy1 - gy0);
        for (let i = 1; i < hn; i++) line(tx(i - 1), ty(i - 1), tx(i), ty(i), C_MID, 0.2 + 0.7 * i / hn, 1.3);
        dot(tx(hn - 1), ty(hn - 1), 4, C_MID, 0.25); dot(tx(hn - 1), ty(hn - 1), 2.4, C_MID, 1); }
      const sgn = v => (v >= 0 ? "+" : "−") + (Math.abs(v) >= 9.995 ? "9.9+" : Math.abs(v).toFixed(2));
      mic("vert", 26, 806 + 8, { size: 10, col: C_MID, a: 0.6 }); mic(sgn(vert), 26, 806 + 20, { size: 10, col: C_MID, a: 0.9 });   // SKETCH v35: the field's axes carry the numbers
      mic("lat " + sgn(lat), 128, 862, { size: 10, col: C_MID, a: 0.9, align: "right" });
      mic("drift " + mt + " m / 5 s", 222 + SH, 862, { size: 10, col: C_MID, a: 0.9, align: "right" });   // the trace's label, at its newest end
      const sg = v => (v >= 0 ? "+" : "\u2212") + (Math.abs(v) >= 9.995 ? "9.9+" : Math.abs(v).toFixed(2));
      if (blk === 1 && LF.rep) LF.rep.drift = { raw: 0, hits: 0 };   // SKETCH v3: no readout hole, the clip cuts nothing (raw 0, hits 0)
      if (blk === 1 && LF.rep) LF.rep.driftTxt = { main: mt, lat: sg(lat), vert: sg(vert) };
    });
  }

  /* outside row: rad, g, ext */
  /* nose panel, inside the outline between the dial block and the resonance slope: an alert block, a vibration plot along the nose's ruler (a few hundred seeded entries, the env.sig contacts as marks), and a stream of tiny records with a climbing total of ids (LF.sig rows come from leftNow) */
  const NSN = 220, nsX = new Float32Array(NSN), nsY = new Float32Array(NSN), nsL = new Uint8Array(NSN), NSC = 6, nsRows = new Array(18).fill(""), nsBase = [-1, -1, -1];
  let nsK = -1, nsSd = -1, nsTot = -1, nsTotS = "", nsKk = -1, nsFnt = "", nsLsp = "", nsRw = 0, nsAlId = "", nsAlV = -1, nsAlS = "";
  const NS_ALR = [[222, 858], [272, 858], [272, 918], [222, 918]], NS_GFX = [0, 0, 0, 0], NS_AL = [222, 272, 858, 918], NS_ST = [0, 0, 0, 0], NS_DIAL = [CX - HR - 2, CX + HR + 2, CY - HR - 4, CY + 5];
  const nsH = (a, b, d) => { const h = Math.sin(a * 12.9898 + b * 78.233 + d * 37.719) * 43758.5453; return h - Math.floor(h); };
  const nsSeed = str => { let h = 7; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 9973; return h; };
  const BAR_AMB = "46,50,84", BAR_AMB_T = "70,76,120";   // the ambient bars' blue-purple (fill, outline): the two sails take it too
  function paintSig() {   /* SKETCH v1: force bars off the slope, dotted threshold curve, two sail gauges */
    dyn(() => {
      ext.dial = NS_DIAL;
      const P = C_TOP, SL = LS.concat([[HB0, FL]]), fs = LBL(), T = 0.6, N = 8, GAP = 4;
      const sx = y => { for (let i = 1; i < SL.length; i++) { const a = SL[i - 1], b = SL[i]; if (y <= b[1] || i === SL.length - 1) { const u = Math.max(0, Math.min(1, (y - a[1]) / (b[1] - a[1]))); return a[0] + (b[0] - a[0]) * u; } } return SL[0][0]; };
      const lr = (LF.sig || []).filter(r => r.slot >= 0).sort((a, b) => b.s - a.s).slice(0, 3), m = lr.length;
      const LOAD = lr.reduce((a, r) => a + (r.on ? r.s : 0), 0), CONT = lr.filter(r => r.on).length, IDS = LF.ids || 0, RES = LF.resNow;
      const kept = [{ s: "k:ruler+peak", l: 130, r: 255, t: 805, b: 872 }, { s: "k:drift", l: 25, r: 130, t: 795, b: 880 }, { s: "k:dialU", l: CX - HR - 8, r: CX + HR, t: CY - HR - 8, b: CY - 24 }, { s: "k:dial", l: CX - HR - 8, r: CX + HR, t: CY - 24, b: CY + 5 }, { s: "k:lamps", l: 162, r: 474, t: 970, b: 994 }];
      /* bars: one thickness (BH) at a fixed pitch PT from the floor line up to 4 px under the resonance dot; the row count follows the dot and the top row fades in and out;
         the strongest contacts take the top rows, every other row is ambient resonance (resNow x its own wandering noise); every length eases */
      const XB = 362 + BX, LB = 55, XG = 0.8, LT = LB * T, PT = 13, dotY = at(LS, len(LS) * (1 - resN(RES)))[1], sT = dotY + 4, sB = FL;   // SKETCH v10: the cap meter and pulse trace sit under cap C; the first bar row starts 8 px under them (pushed down only as far as that needs)
      const now = performance.now() / 1000, st = paintSig.st || (paintSig.st = { L: [], t: now }), ke = 1 - Math.exp(-8 * Math.max(0, Math.min(0.1, now - st.t))); st.t = now;
      const nR = Math.max(0, Math.floor((sB - sT) / 15.5 + 1e-6)), PE = nR ? (sB - sT) / nR : PT, BH = PE,   // SKETCH r42: bar height = pitch, so the bars touch in one stepped block
            // SKETCH r40: one even pitch of about 16 px (15.5 min) from just under cap C to the foot (fewer rows, none squeezed)
          MINL = 18, fr = nR ? 1 : 0, bars = [], lbl = [], cd = [], rowsL = [];
      const aid = k => (nsH(k, 3, 5) < 0.5 ? "rs-" : "ns-") + String(1 + Math.floor(nsH(k, 7, 1) * 99)).padStart(2, "0");   // a fixed pseudo-id per ambient row slot
      const nz = k => { const ph = k * 2.399, p1 = 0.5 + (k * 0.37) % 1.5, p2 = 0.5 + (k * 0.61 + 0.4) % 1.5; return 0.5 + 0.5 * (0.6 * Math.sin(now * 6.2832 / p1 + ph) + 0.4 * Math.sin(now * 6.2832 / p2 + ph * 1.7)); };
      st.L.length = nR;
      const edge = (y0, y1) => { const p = [[sx(y0), y0]]; SL.forEach(v => { if (v[1] > y0 && v[1] < y1) p.push(v); }); p.push([sx(y1), y1]); return p; };
      const FA = 0.12;
      LF.minPlate = PE;   // SKETCH v47: one plate's height, read by the slope's red in paintLeft
      const GP = 2.45, CUT = 5.5, band = (y0, y1, col, xl) => { if (y1 <= y0) return; const e = edge(y0, y1); c.fillStyle = col; c.beginPath(); e.forEach((p, k) => k ? c.lineTo(p[0] - XG - GP, p[1]) : c.moveTo(p[0] - XG - GP, p[1]));
        c.lineTo(xl + CUT, y1); c.lineTo(xl, y0); c.closePath(); c.fill(); };   // SKETCH v8: the growing end leans like the slope
      let cand = null;
      const redY = (() => { const pts = half(LS.concat([[HB0, FL]])), n = pts.length, kk = pts[n - 1], pp = pts[n - 2], dx = kk[0] - pp[0], dy = kk[1] - pp[1], l = Math.hypot(dx, dy), A = [kk[0] - dx / l * 10, kk[1] - dy / l * 10], B = [kk[0] + 10, kk[1]], E = pts.slice(0, n - 1); E.push(A);
        for (let q = 1; q <= 8; q++) { const t = q / 8, u = 1 - t; E.push([u * u * A[0] + 2 * u * t * kk[0] + t * t * B[0], u * u * A[1] + 2 * u * t * kk[1] + t * t * B[1]]); }
        let rem = Math.min(1, Math.max(0, RES)) * len(E), yy = E[E.length - 1][1]; const Er = E.slice().reverse();
        for (let q = 1; q < Er.length && rem > 0; q++) { const d = Math.hypot(Er[q][0] - Er[q - 1][0], Er[q][1] - Er[q - 1][1]), u = Math.min(1, rem / d); yy = Er[q - 1][1] + (Er[q][1] - Er[q - 1][1]) * u; rem -= d; } return RES > 0 ? Math.min(yy, sB - PE) : yy; })();   // SKETCH v46: the y where the slope edge's red stops (same walk as the red in paintLeft)
      const nShow = RES > 0 ? Math.min(nR, Math.max(1, Math.floor((sB - redY) / PE + 1e-6))) : 0;   // SKETCH v46: the plates stack up from the foot inside the red only, strongest at the foot
      for (let k = nShow - 1; k >= 0; k--) { const i = k, yb = sB - k * PE, yt = yb - BH, con = i < m, f = con ? Math.min(1, lr[i].s) : 0, z = nz(k),
          tg = con ? MINL + (LB - MINL) * f * (1 + 0.1 * (z - 0.5)) : MINL + (LB - MINL) * Math.min(1, RES) * (0.2 + 0.8 * z);
        const L = st.L[k] = st.L[k] == null ? tg : st.L[k] + (tg - st.L[k]) * ke, vis = i === 0 ? fr * fr * (3 - 2 * fr) : 1, lit = con && XG + L > LT,
          xr = sx(yb) - XG;
        let xl = Math.min(sx(yt + BH / 2) - XG - Math.max(L, MINL), sx(yt) - XG - 0.5, xr - 0.5);
        xl = Math.max(xl, XB + 10 + (con ? W_(lr[i].id, 9) : W_(aid(k), 9)));   // SKETCH v31: the id lane: the labels stay right of X_B + 6, so a bar never starts under its own label
        noseNB.concat([pkNB]).forEach(o => { if (o[2] < yb + 1 && o[3] > yt - 1 && o[0] < xr && o[1] + 3 > xl) xl = Math.max(xl, o[1] + 3); });   // stop 3 px short of any text box the bar would cross
        const hid = xl >= xr - 1, fc = lit ? "205,214,224" : con ? "108,116,188" : BAR_AMB, tc = lit ? "236,242,248" : con ? "150,158,224" : BAR_AMB_T;
        const KNM = { "vael-11": "k", "kth-04": "u", "orr-02": "n" }, kindOf = (id, cl, k) => KNM[id] || (cl ? (/^(well|swell|hush|glint)$/.test(cl) ? "n" : /^(rift|shear|fault|flare|furnace)$/.test(cl) ? "k" : "u") : (h => h < 0.3 ? "n" : h < 0.7 ? "k" : "u")(nsH(k, 13, 2)));   // SKETCH r38: nomic / known incoherent / unknown incoherent (col-b variant B)
        const RED = "110,26,26", BLU = "108,116,188", BLT = "150,158,224", CRM = "239,230,204", ROL = "184,56,58", RFL = "163,40,42", RCO = "208,72,74", kd = kindOf(con ? lr[i].id : "", con ? lr[i].cls : "", k);
        const drawBar = (kk, xs) => { kk = kk || kd; xs = xs == null ? xl : xs; const sr = sx(yt) - XG - GP, sb = sx(yb) - XG - GP;
          const KC = { n: [ROL, RFL, CRM, 0.2, 0.8], k: [ROL, RFL, BLU, 0.2, 0.85], u: [ROL, RFL, "240,138,132", 0.2, 0.9] }[kk], fr2 = Math.max(0, Math.min(1, (L - MINL) / (LB - MINL))), cl = Math.max(3, Math.min(sr - xs - 2, fr2 * (sr - xs)));   // SKETCH r43: glass plate: dark tint, bright core from the slope end (length = the value), 1 px outline (dashed for unknown) shared between touching bars
          band(yt, yb, rgba(KC[1], vis * KC[3]), xs); band(yt + 0.2 * BH, yb - 0.2 * BH, rgba(KC[2], vis * KC[4]), Math.max(xs + 1, sr - cl));
          c.save(); c.strokeStyle = rgba(KC[0], vis * 0.9); c.lineWidth = 1; if (kk === "u") c.setLineDash([3, 2]); c.beginPath(); c.moveTo(xs, yt); c.lineTo(sr, yt); c.lineTo(sb, yb); c.lineTo(xs + CUT, yb); c.closePath(); c.stroke(); c.restore(); };
        const bar = { kd, s: "bar" + k, xl, xr: sx(yb) - XG, yt, h: BH, l: xl, r: sx(yb) - XG, t: yt, b: yb, L, lit, con }; bars.push(bar);
        rowsL.push({ kd, k, id: con ? lr[i].id : aid(k), xl, yt, con, lit, f, vis, hid, drawBar, bar, sl: sx(yt) - XG });
        if (con && vis > 0.5 && !(cand && cand.lit && !lit)) cand = { id: lr[i].id, f, xl, yt, lit }; }
      /* sails: leech from a straight diagonal (g 0) to a full round (g 1) */
      const sail = (T0, M, B, g) => { const k = 0.5523 * g; c.beginPath(); c.moveTo(T0[0], T0[1]); c.lineTo(B[0], B[1]);
        c.bezierCurveTo(B[0] + k * (M[0] - T0[0]), B[1] + k * (M[1] - T0[1]), M[0] + k * (B[0] - T0[0]), M[1] + k * (B[1] - T0[1]), M[0], M[1]); c.closePath();
        c.fillStyle = rgba(BAR_AMB, 0.9); c.fill(); c.strokeStyle = rgba(BAR_AMB_T, 1); c.lineWidth = 0.7; c.stroke(); };
      const seg = (x, by, parts) => { let xx = x; parts.forEach(p => { text(p[0], xx, by, { size: fs, col: P, a: p[1] ? 1 : 0.6 }); xx += W_(p[0] + " ", fs); }); };
      /* SKETCH v3 items 8-9: v2's quarter-round sail, mast on V (40 tall), foot on H (56 long, toward the nose), leech convex toward the nose, fills as v2; texts right-aligned 6 px left of the mast (at the text's mid-height) */
      const SB = [], SPT = [];
      const idf = 9, LABW = Math.max(W_("rs-00", idf), W_("ns-00", idf), W_("rs-00 1.00", fs)) + 1, lblL = y => Math.min(sx(y - 9), sx(y + 9)) - XG - LB * 1.05 - 4 - LABW;   // the id column's widest reach over the rows beside a point: the longest bar's left end, a 4 px gap, the widest label (id with value)
      const sail2 = (mx, my, nm, g, tx2, hh) => { hh = hh || 40;
        const geo = x => { const T0 = [x + 8, my + hh], M = [x, my], B = [x + 64, my + hh + 56 * 0.052], k = 0.5523 * g,
            Q = [B, [B[0] + k * (M[0] - T0[0]), B[1] + k * (M[1] - T0[1])], [M[0] + k * (B[0] - T0[0]), M[1] + k * (B[1] - T0[1])], M], pts = [T0];
          for (let j = 0; j <= 32; j++) { const t = j / 32, u = 1 - t; pts.push([0, 1].map(q => u * u * u * Q[0][q] + 3 * u * u * t * Q[1][q] + 3 * u * t * t * Q[2][q] + t * t * t * Q[3][q])); }
          return { T0, M, B, pts }; };
        mx += Math.min(...geo(mx).pts.map(p => lblL(p[1]) - 8 - p[0]));   // slide the sail toward the nose until its nearest point is 8 px clear of the id column
        const { T0, M, B, pts } = geo(mx); sail(T0, M, B, g);
        SPT.push({ s: nm, pts: pts.map(p => [+p[0].toFixed(2), +p[1].toFixed(2)]) }); const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
        SB.push({ s: nm, l: Math.min(...xs) - 0.5, r: Math.max(...xs) + 0.5, t: Math.min(...ys) - 0.5, b: Math.max(...ys) + 0.5 });
        tx2.forEach(q => { const xm = mx + (q[1] - 4.5 - my) * 0.2, bx = trip(q[0], TXR, q[1], "right"); SB.push({ s: nm + "text:" + q[0][0], l: bx[0], r: bx[1], t: bx[2], b: bx[3] }); }); };
      /* SKETCH v15c: load / contacts / near under the hero stack (rows 874 / 896 / 918, x = the hero's); load and contacts each end in one small bar (40 px at full, 6 px tall), 8 px after the value */
      const plB = (nm, x0, y0, room, f) => { const len = Math.max(8, Math.min(40, room - x0)), cl = Math.max(2, len * f), h = 7, sl = 0.2 * h, yt = y0 - 0.5, yb = yt + h;   // SKETCH v45: column B's glass plate (as the nose's): 1 px outline, tint 0.2, bright core = the value, ends slanted the mirrored way (it grows rightwards)
        const pg = (a, b) => { c.beginPath(); c.moveTo(x0 + sl, yt); c.lineTo(x0 + a + sl, yt); c.lineTo(x0 + a, yb); c.lineTo(x0, yb); c.closePath(); };
        pg(len); c.fillStyle = rgba("108,116,188", 0.2); c.fill(); const ci = 1.4; c.beginPath(); c.moveTo(x0 + sl + 1, yt + 1.4); c.lineTo(x0 + cl + sl - ci, yt + 1.4); c.lineTo(x0 + cl - ci, yb - 1.4); c.lineTo(x0 + 1, yb - 1.4); c.closePath(); c.fillStyle = rgba("150,158,224", 0.85); c.fill();
        pg(len); c.strokeStyle = rgba("150,158,224", 0.9); c.lineWidth = 1; c.stroke();
        SB.push({ s: nm, l: x0 - 0.5, r: x0 + len + sl + 0.5, t: yt - 0.5, b: yb + 0.5 }); };
      const rowB = (nm, y, p, f) => { const bx = trip(p, 216 + BX, y, "left", 14, ["108,116,188", "150,158,224", 1, 0.75], 11); SB.push({ s: nm + "text", l: bx[0], r: bx[1], t: bx[2], b: bx[3] });
        plB(nm, bx[1] + 8, y - 6, XB - 4, f); };
      const RY = Math.round(yT(220) + 32) + 17.5 - 833.8;   // SKETCH v33: with unread gone the three rows close up under the bearing row (ring top 4 px under its box), same pitch
      rowB("sailA", 833.8 + RY, ["ring", LOAD.toFixed(2)], Math.min(1, LOAD / 4));   // SKETCH v17: the rows use the force bars' contact blue-purple
      rowB("sailB", 850.3 + RY, ["sites", String(CONT), "· met", String(IDS)], Math.min(1, CONT / 8));
      { const nq = String(LF.near).split(" "), bx = trip(nq[1] ? ["near", nq[1], "m", nq[0]] : ["near", "none"], 216 + BX, 866.8 + RY, "left", 14, ["108,116,188", "150,158,224", 1, 0.75], 11); SB.push({ s: "nearText", l: bx[0], r: bx[1], t: bx[2], b: bx[3] });
        if (nq[1] && nearDm > 0) { plB("nearBar", bx[1] + 8, 860.8 + RY, XB - 4, Math.min(1, nearDm / nearTop)); } }   // SKETCH v22b: near on the fan's 0..outer-ring scale (40 px = the outer ring)   // SKETCH v20b: the range joins the purple column
      /* one id label per bar row, right-aligned 4 px left of the bar's left end and centred on it: a contact shows its id (the lit, else the strongest, with its ".86" value, bright), an ambient row its fixed pseudo-id;
         never slid: the other things make room, and report() flags a label that meets other text or a sail */
      const ovl = (bx, o) => Math.min(bx[1], o.r) - Math.max(bx[0], o.l) > -1 && Math.min(bx[3], o.b) - Math.max(bx[2], o.t) > -1;
      const obsL = noseNB.map(o => ({ l: o[0], r: o[1], t: o[2], b: o[3] })).concat([{ l: pkNB[0], r: pkNB[1], t: pkNB[2], b: pkNB[3] }], SB, kept);
      const taken = new Set(); let nxt = 0;   // SKETCH v34b: a label pushed lower pushes every label after it down one row too (order kept); labels pushed past the last row are dropped
      rowsL.forEach(r => { r.bar.xl = r.bar.l = r.bar.xr; });   // every bar starts hidden; the placed ones are restored below
      const used = new Set();   // SKETCH v35b: a label that does not fit the row it would take lets the next label try that row first (one swap), so no row beside the disc's "E n" stays empty
      const place = (r0, j) => { const r = rowsL[j];
        const isC = cand && r0.con && r0.yt === cand.yt, bright = isC && r0.lit,
          v = isC ? { s: r0.id + " " + (r0.f >= 1 ? "1.00" : r0.f.toFixed(2).slice(1)), fs } : { s: r0.id, fs };
        const al = (r0.con ? BRIGHT : 0.85) , by = (f2 => r.yt + BH / 2 + 0.265 * f2);
        const w = W_(v.s, v.fs), yy = by(v.fs), eX = (yy + 0.22 * v.fs > 879 && yy - 0.75 * v.fs < 894) ? CX + HR + 5 : XB + 7, tx = r.hid ? r.sl - 3 : Math.max(r.xl - 4, eX + w), bx = [tx - w, tx, yy - 0.75 * v.fs, yy + 0.22 * v.fs];   // SKETCH v34: per-row clamp: on rows level with the disc's "E n" label the id stays 3 px right of it
        if (r.hid || r.vis < 1 || obsL.concat(lbl).some(o => ovl(bx, o)) || nbHit(bx) || tx > r.sl - 3 || (!r.hid && r.bar.r - Math.max(r.xl, tx + 4) < MINL) || bx[0] < 423) return false;   // a row whose bar the slope already hides takes its label alone
        const dr0 = () => { const kc = !r0.con ? "216,106,102" : r0.kd === "n" ? "239,230,204" : r0.kd === "k" ? "150,158,224" : "208,72,74"; if (isC) { const vs = v.s.slice(r0.id.length + 1); text(vs, tx, by(v.fs), { size: v.fs, col: C_TOP, a: BRIGHT, align: "right" }); text(r0.id, tx - W_(" " + vs, v.fs), by(v.fs), { size: v.fs, col: kc, a: al, align: "right" }); } else text(v.s, tx, by(v.fs), { size: v.fs, col: kc, a: al, align: "right" }); };   // SKETCH r43: real contacts bright, ambient one dim step, the value white
        taken.add(j); nxt = j + 1; if (!r.hid) r.bar.xl = r.bar.l = Math.min(Math.max(r.xl, tx + 4), r.bar.r);   // a clamped label shortens its bar to start 4 px right of it
        if (!r.hid) r.drawBar(r0.kd, r.bar.xl); if (bright) glow(P, dr0); else dr0();
        lbl.push({ s: "id:" + r0.id, l: bx[0], r: bx[1], t: bx[2], b: bx[3], ok: true }); return true; };
      rowsL.forEach((r0, ri) => { if (used.has(ri)) return;
        const j0 = Math.max(ri, nxt);
        for (let j = j0; j < rowsL.length; j++) { if (taken.has(j)) continue;   // SKETCH v34: a label that overlaps or is cut by the slope steps one row lower (with its bar) until it fits; past the last row it is dropped
          if (place(r0, j)) break;
          let q = ri + 1; while (used.has(q)) q++;
          if (q < rowsL.length && place(rowsL[q], j)) used.add(q); } });
      if (blk === 1 && LF.rep) LF.rep.bars = { dotY, sT, sB, rows: bars.map(b => ({ kd: b.kd, t: b.t, b: b.b, xl: b.xl, xr: b.xr, hid: b.xl >= b.xr - 1, L: b.L, con: b.con, lit: b.lit })), lab: lbl[0] || null, ids: lbl, sails: SB };
      /* SKETCH v10: cap info under cap C, following its slope: row 1 a 10-segment resonance meter (tiny label above its left end, the big value at its right end), row 2 the strongest contact's id and a live pulse trace from its pat; no boxes */
      { const g0 = lr[0], nr = [], yc = x => yT(x), X0 = 376 + SH, VS = 11, LS9 = 11, wv = W_(RES.toFixed(2), VS), X1 = 478 - wv - 5, n = 10, gp = 1, sw = (X1 - X0 - gp * (n - 1)) / n, fill = Math.min(1, Math.max(0, RES)) * n;
        const bx = (l, r, t, b) => nr.push({ l, r, t, b });
        c.save(); c.translate(X0, yc(X0) + 4 + 0.75 * LS9); c.rotate(Math.atan(KS)); { const k = ts / s; setF(`500 ${LS9 * k}px "IBM Plex Mono", monospace`, (0.8 * k) + "px"); c.textAlign = "left"; c.textBaseline = "alphabetic"; c.fillStyle = rgba("216,106,102", 0.85); c.fillText("res", 0, 0); } c.restore();   // the label tilts with the cap slope
        bx(X0, X0 + W_("res", LS9), yc(X0) + 4, yc(X0 + W_("res", LS9)) + 4 + 0.97 * LS9);
        { const tw = W_("unread", 10), x0 = X0, y0 = yc(X0) + 4 + 0.97 * LS9 + 3 + 0.75 * 10 + 6, d = LF.ball && LF.ball[0] > 0 ? 1 : -1;   // SKETCH v33: unread takes the res bar's space, under "res", left-aligned with it
          if (LF.ball) { const east = d > 0, xa = east ? x0 + tw + 4 + 8 : x0, xt = east ? x0 : x0 + 8 + 4, ay = y0 - 3.5;
            text("unread", xt, y0, { size: 10, align: "left", col: "216,106,102", a: 0.85 });
            c.beginPath(); c.moveTo(xa, ay); c.lineTo(xa - d * 8, ay - 3.5); c.lineTo(xa - d * 8, ay + 3.5); c.closePath(); c.fillStyle = rgba("216,106,102", 0.85); c.fill();
            bx(x0, x0 + tw + 12, y0 - 0.75 * 10, y0 + 0.22 * 10); } }
        const vy = yc(478) + 4 + 0.75 * VS; text(RES.toFixed(2), 478 - wv, vy, { size: VS, col: C_HULL_GLOW, a: BRIGHT }); bx(478 - wv, 478, vy - 0.75 * VS, vy + 0.22 * VS);
        const tb = bars[0], tr = rowsL[0], p = g0 ? g0.pat : null, per = p ? Math.max(0.2, p[0]) : 1;   // the pulse trace rides inside the top (strongest contact's) bar
        if (blk === 1 && LF.rep) LF.rep.nose = nr; }
    });
  }
  function paintOutside() {
    const GOLD = C_TOP;
    const yF = FL + 1, LY = 987, lv = (k, v, cx) => { mic(k, cx, LY, { align: "center" }); text(v, cx, LY + 13, { size: 10, col: CREAM, a: BRIGHT, align: "center" }); };
    stat_(() => lab("outside", 572 - (ts > s + 1e-6 ? 12 : 0), LY, { col: CREAM, a: 0.7, size: LBL() }));
    { const cx = 642, cy = 965.5, ri = 2, ro = 6;
      stat_(() => { [270 - 60, 270 + 60, 90].forEach(m => { c.beginPath(); c.arc(cx, cy, ro, rad(m - 30), rad(m + 30)); c.arc(cx, cy, ri, rad(m + 30), rad(m - 30), true); c.closePath();
          c.strokeStyle = rgba(GOLD, NORMAL); c.lineWidth = HAIR; c.lineJoin = "round"; c.stroke(); }); arc(cx, cy, 6.8, 0, 2 * PI, GOLD, 0.12, 1, [1, 2]); });
      dyn(() => { dot(cx, cy, 1.2, CREAM, 0.9); arc(cx, cy, 9, rad(-90), rad(-90 + Math.min(1, Math.max(0, +LF.dose) / 0.1) * 360), CREAM, 0.85, 1); lv("rad", LF.dz && LF.dz.rad ? LF.dose.slice(0, -1) + (((+LF.dose.slice(-1) + Math.round(LF.dz.rad * 6)) % 10) + 10) % 10 : LF.dose, cx); }); }
    { const cx = 698, cy = 968.5, r = 5.5, a = Math.max(-8, Math.min(8, Math.min(8, Math.abs(+LF.g) * 13) * (+LF.g < 0 ? 1 : -1) + (LF.dz ? LF.dz.g * 3.5 : 0)));
      stat_(() => { line(cx + 0.5, yF, cx + 0.5, cy - r - 2, GOLD, 0.3); arc(cx, cy, r, 0, 2 * PI, GOLD, 0.3); arc(cx, cy, r + 2, 0, 2 * PI, GOLD, 0.12, 1, [1, 2]); });
      dyn(() => {
        glow(GOLD, () => arc(cx, cy, r + 2, rad(-90), rad(-90 + LF.gFlip * 360), GOLD, NORMAL, STRONG));
        glow(CREAM, () => { line(cx + 0.5, cy, cx + 0.5, cy - a, CREAM, 1, STRONG); poly([[cx - 3, cy - a + 3], [cx + 0.5, cy - a - 1], [cx + 4, cy - a + 3]], CREAM, 1, HAIR); });
        dash([1, 2], () => { line(cx + 0.5, cy, cx + 0.5, cy + a, GOLD, QUIET); poly([[cx - 3, cy + a - 3], [cx + 0.5, cy + a + 1], [cx + 4, cy + a - 3]], GOLD, QUIET); });
        ext.g = [cx - 4, cx + 4, cy - a - 1, cy + a + 1];
        dot(cx, cy, 1.6, CREAM, 0.9); lv("g", LF.g, cx); }); }
    { const cx = 752, y0 = 971, y1 = 959, n = 8, Hh = y0 - y1, f = (LF.hullTv + 100) / 200, lit = Math.round(f * n);
      stat_(() => line(cx + 0.5, yF, cx + 0.5, y1 - 1, GOLD, 0.3));
      dyn(() => {
        for (let i = 0; i < n; i++) { const y = Math.round(y0 - i * Hh / (n - 1)) + 0.5; line(cx - 3, y, cx + 4, y, GOLD, i < lit ? (i === lit - 1 ? BRIGHT : 0.65) : 0.12); }
        const yz = Math.round(y0 - Hh / 2) + 0.5; line(cx - 8, yz, cx - 4, yz, GOLD, 0.6); mic("0", cx - 10, yz + 3, { align: "right", a: 0.7 });
        const ym = y0 - f * Hh; poly([[cx + 11, ym - 3], [cx + 7, ym], [cx + 11, ym + 3]], CREAM, BRIGHT, HAIR);
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
    edge(1880, 1976, ycR, { col: C_TOP, n: 20, maj: 10, mid: 5, v: tc(RF.cabin), mark: tc(RF.cabin) });
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
        line(xa + 1.5, yy, xb - 0.5, yy, col, weak ? BRIGHT : 0.8, HAIR); }); });
    /* bus split */
    /* the row always spans the rail 1604..1870 as a stacked bar on the rail's 0..6 kW scale: the filled part S (bus / 6, at most the rail) is split by kW (live: drv, thm, life as lsp, gnc),
       a load under its label width is pinned to the label and the rest share what is left in proportion to their kW (water-filling), so the widths sum to S;
       spare (no model: the rest of the 6 kW) gets what is left, at least its label and number wide */
    { const RX0 = 1604, RW = 266, y = x => ycR(x) - 6 + 9, Hh = 10;
      const box = (xa, xb, a) => poly([[xa, y(xa)], [xb, y(xb)], [xb, y(xb) + Hh], [xa, y(xa) + Hh], [xa, y(xa)]], GOLD, a);
      dyn(() => { const ls = RF.loads, mw = ls.map(l => W_(l[0], LBL()) + 5), spMin = W_("spare", LBL()) + W_("0.0", LBL()) + 14;
        const S = Math.max(mw.reduce((a, b) => a + b, 0), Math.min(RW - spMin, RW * Math.min(1, RF.bus / 6)));
        const pin = ls.map(() => false), ws = mw.slice();
        for (let p = 0; p < 5; p++) { let pf = 0, pk = 0, pn = 0, ch = false;
          ls.forEach((l, i) => { if (pin[i]) pf += mw[i]; else { pk += l[1]; pn++; } });
          ls.forEach((l, i) => { if (pin[i]) return; ws[i] = pk > 0 ? (S - pf) * l[1] / pk : (S - pf) / pn; if (ws[i] < mw[i] - 1e-9) { pin[i] = true; ws[i] = mw[i]; ch = true; } });
          if (!ch) break; }
        let xc = RX0;
        ls.forEach((l, i) => { const w = ws[i], xa = xc + 0.5, xb = xc + w - 1.5; box(xa, xb, 0.42);
          const xm = (xa + xb) / 2; mic(l[0], xm - W_(l[0], LBL()) / 2 - (i === ls.length - 1 && ts > s + 1e-6 ? 3 : 0), Math.round(y(xm) + 8), { a: 0.8 }); xc += w; });
        dash([1, 2], () => box(xc + 0.5, RX0 + RW, 0.22));
        const xs = xc + 4 + (ts > s + 1e-6 ? 4 : 0), sp = Math.max(0, 6 - RF.bus).toFixed(1); mic("spare", xs, Math.round(y(xs) + 8), { a: 0.55 }); text(sp, xs + W_("spare", LBL()) + 4, Math.round(y(xs) + 8), { size: LBL(), col: GOLD, a: NORMAL });
        busEnd = { rail: RX0 + RW, row: RX0 + RW, txtR: xs + W_("spare", LBL()) + 4 + W_(sp, LBL()) }; }); }
    /* cabin trace */
    { const xa = 1882, xb = 1970, yT = 790, yB = 806, Y = v => yB - (v - 20) / 2 * (yB - yT);
      stat_(() => { line(xa, yB + 0.5, xb, yB + 0.5, C_TOP, 0.3);
        for (let i = 0; i <= 6; i++) { const x = Math.round(xa + (xb - xa) * i / 6) + 0.5; line(x, yB + 1, x, yB + (i % 3 ? 2.5 : 4), C_TOP, i % 3 ? 0.2 : 0.45); }
        dash([1, 2], () => line(xa, Math.round(Y(21)) + 0.5, xb, Math.round(Y(21)) + 0.5, C_TOP, 0.35));
        line(xb + 1, Math.round(Y(21)) + 0.5, xb + 5, Math.round(Y(21)) + 0.5, CREAM, 0.9); mic("30m", xa - (ts > s + 1e-6 ? 6 : 0), yB + 13, { a: 0.7 }); });
      dyn(() => { const raw = RF.cabTrace, n = raw.length - 1, pts = raw.map((v, i) => { let a = 0, m = 0; for (let j = Math.max(0, i - 7); j <= Math.min(n, i + 7); j++) { a += raw[j]; m++; } return a / m; });   /* 15-sample mean: the 30 s samples read as a slow wave, not a zigzag */
        glow(C_TOP, () => poly(pts.map((v, i) => [xa + (xb - xa) * i / n, Y(v)]), C_TOP, NORMAL, 1));
        dot(xb, Y(pts[n]), 1.6, CREAM, 1); mic("set " + RF.cabSet.toFixed(1), xb + (ts > s + 1e-6 ? 6 : 0), yB + 13, { align: "right", a: 0.7 }); }); }
    /* fuel on the slope */
    dyn(() => {
      poly(sub(RS, RT * (1 - RF.fuel), RT).concat([[x0f, FL + 0.5]]), GOLD, BRIGHT, STRONG);
      const t = tickAt(RS, -1, RF.fuel, 9, CREAM, BRIGHT), x = t[0], y = t[1], nx = t[2], ny = t[3], px = x + nx * 13, py = y + ny * 13;
      poly([[px + nx * 6 - ny * 4, py + ny * 6 + nx * 4], [px, py], [px + nx * 6 + ny * 4, py + ny * 6 - nx * 4]], CREAM, BRIGHT, STRONG); dot(x, y, 2.5, CREAM, 1);
      const lx = x + nx * 21, ly0 = Math.round(y + ny * 21) + 0.5; line(lx, ly0, lx + 9, ly0, CREAM, 0.9);
      /* the number stack stays where the sketch puts it (the sample's 72 %), below the cells, whatever the fuel */
      const q72 = at(RS, RT * (1 - 0.72)), ly = Math.round(q72[1] - q72[2] * 21) + 0.5;
      const fx = 1536;
      big(Math.round(RF.fuel * 100) + " %", fx - (ts > s + 1e-6 ? 30 : 6), ly + 8);   // the number steps left off the ship's tail point (more where the text has grown); the rest of the stack stays
      const t0 = RF.left.split(" ")[0]; lab("fuel", fx, ly + 24); text(t0, fx, ly + 37, { size: 10, col: CREAM, a: BRIGHT }); if (RF.left.indexOf(" ") > 0) { const gr = ts > s + 1e-6; mic("left", gr ? fx : fx + W_(t0, 10) + 4, gr ? ly + 48 : ly + 37, { a: 0.8 }); }   // grown text: "left" drops to its own line so the countdown stays clear of the ship
    });
    /* thrust heat on the right floor */
    { const x0 = x0f, x1 = XR, w = x0 - x1, yT = FL, Hh = 6;
      stat_(() => { line(x1, yT + Hh + 0.5, x0, yT + Hh + 0.5, GOLD, 0.3);
        for (let i = 0; i <= 10; i++) { const x = Math.round(x0 - w * i / 10) + 0.5, maj = i % 5 === 0; line(x, yT + Hh + 1, x, yT + Hh + (maj ? 3 : 2), GOLD, maj ? 0.5 : 0.25); }
      });
      dyn(() => { mic("hot " + Math.round(RF.hot * 100), x1 + (ts > s + 1e-6 ? -9 : 16), 984, { col: CREAM, a: BRIGHT });
        const xt = x0 - w * RF.thrust, xh = x0 - w * RF.hot;
        for (let x = x0 - 2; x > x1 + 1; x -= 3) { const on = x > xt, hot = x <= xh;
          const f = () => line(x - 0.5, yT + Hh, x - 2.5, yT + 1, on ? GOLD : hot ? CREAM : GOLD, on ? (x - xt < 4 ? 1 : 0.8) : hot ? 0.3 : 0.12);
          on ? glow(GOLD, f) : f(); }
        dash([1, 2], () => line(x1, yT + Hh + 5.5, xh, yT + Hh + 5.5, CREAM, 0.6));
        shape("heat bar", xt, yT - 1, x0, yT + Hh + 6); shape("heat hot", x1, yT + Hh + 4.5, xh, yT + Hh + 6.5);   // the filled bar and the hot dash count against text in report().textHits
        glow(CREAM, () => line(Math.round(xt) + 0.5, yT - 1, Math.round(xt) + 0.5, yT + Hh + 2, CREAM, 1, STRONG));
        line(Math.round(xh) + 0.5, yT - 1, Math.round(xh) + 0.5, yT + Hh + 3, CREAM, 0.9);
        const tv = Math.round(RF.thrust * 100) + " %"; text(tv, x0 - (ts > s + 1e-6 ? 1 : 10), 984, { size: 12, col: CREAM, a: 1, align: "right" });
        if (ts > s + 1e-6) lab("thrust heat", x0 - 1, 946, { align: "right" });   // grown text: the label sits above the bar (the fill and the hot dash run under it), off the row the readings share
        else lab("thrust heat", x0 - 10 - W_(tv, 12) - 8, 984, { align: "right" }); }); }
    paintShip();
    paintLife();
    dyn(() => RF.lampsR.forEach((l, i) => lamp(1440 + (i % 7) * 56, i < 7 ? 975 : 989, l[0], l[1], "o", l[0] === "lsp" ? C_TOP : /^(ring|seal|fin t|fin b|jnt)$/.test(l[0]) ? C_HULL : C_MID)));
  }

  /* ship side view + hull stress strip (right wing, upper) */
  let shipC = null;   // the blueprint and everything derived from it, keyed on dpr * s: rebuilt only when the size changes
  function paintShip() {
    /* the real ship's line drawing (VoidshipHull.blueprint), true proportions, centred in the old box's column 1608..1867 and fitted between the bus strip and the stress row */
    const L = 105, YT = 804, fr = u => ((u >= 0.36 ? u : 0.36 + (u - 0.36) * 0.682) + 0.52) / 1.56;   // fr: the old marks' u (stern -0.52 .. nose tip 1.04) as a fraction of the ship's length
    if (!shipC || shipC.k !== dpr * s) {
      const bp = window.VoidshipHull.blueprint(L, dpr * s, { top: rgba(C_TOP, BRIGHT), hull: rgba(C_HULL, BRIGHT), mid: rgba(C_MID, BRIGHT), nose: rgba(C_NOSE, BRIGHT) }, HAIR);
      const xs0 = 1608 + (259 - (bp.tip - bp.stern)) / 2, xs1 = xs0 + bp.tip - bp.stern, X = xs0 - bp.stern, Yo = YT - bp.top, cx = X - bp.ox, cy = Yo - bp.oy, yb = Yo + bp.bottom;
      const edge = x => { const g = bp.canvas.getContext("2d"), px = Math.max(0, Math.min(bp.canvas.width - 1, Math.round((x - cx) * bp.canvas.width / bp.w))), d = g.getImageData(px, 0, 1, bp.canvas.height).data;
        for (let r = bp.canvas.height - 1; r >= 0; r--) if (d[r * 4 + 3] > 40) return cy + r * bp.h / bp.canvas.height; return yb; };   // the lowest line of the drawing at column x
      const lx = xs0 + 4;
      shipC = { k: dpr * s, bp, xs0, xs1, X, Yo, cx, cy, yb, lx, ly: edge(lx),
        ticks: [-0.64, -0.13, 0.43].map(u => { const x = Math.round(xs0 + fr(u) * (xs1 - xs0)) + 0.5; return [x, edge(x)]; }) };
    }
    const { bp, xs0, xs1, X, Yo, cx, cy, yb, lx, ly, ticks } = shipC;
    const FIN = [1824, 814];   // the fin label
    const rg = (x, y) => [X + (x - 640) * L / 590, Yo + (y - 330) * L / 590];   // the collar ring's corners (big ship, L 590 at 640,330)
    stat_(() => {
      head("ship", 1546, 926); mic("hull", 1546, 939, { a: 0.8 });
      poly([[1546 + W_("ship", 10) + 6, 922.5], [1592, 922.5], [lx - 2, ly - 1]], CREAM, 0.75, HAIR); dot(lx - 2, ly - 1, 1.8, CREAM, BRIGHT);
      c.drawImage(bp.canvas, cx, cy, bp.w, bp.h);
      mic("fin", FIN[0], FIN[1], { a: 0.8 });
      shape("ship", xs0, YT, xs1, yb);
    });
    dyn(() => {
      text(String(RF.hullInt),1546 + W_("hull", LBL()) + 5, 939, { size: 10, col: CREAM, a: BRIGHT });
      text(String(RF.fin), FIN[0] + W_("fin", LBL()) + 4, FIN[1], { size: 10, col: CREAM, a: BRIGHT });
    });
    /* hull stress along the length, same x as the ship: 0 at B0, the limit (1.0) at B1 */
    const B0 = 963, B1 = 938, ys = v => B0 - (B0 - B1) * v;
    stat_(() => {
      line(xs0, B0 + 0.5, xs1, B0 + 0.5, C_HULL, 0.25);
      dash([3, 3], () => line(xs0, B1 + 0.5, xs1, B1 + 0.5, CREAM, 0.5));
      line(xs1 + 0.5, B1 - 3, xs1 + 0.5, B1 + 4, CREAM, 0.5);   // end tick: the limit line's label hangs on it
      mic("lim", xs0 + 3, B1 - 5, { a: 0.75 });
      head("hull stress", xs0 - 16, B0 - 4, { align: "right", a: 0.85 });
      glow(CREAM, () => { poly([rg(868, 198), rg(920, 208)], CREAM, BRIGHT, STRONG);
        poly([rg(868, 446), rg(920, 436)], CREAM, BRIGHT, STRONG); });
      ticks.forEach(([x, yy]) => { glow(CREAM, () => line(x - 0.5, yy - 3.5, x - 0.5, yy + 4.5, CREAM, BRIGHT, STRONG)); });
    });
    dyn(() => {
      const pts = RF.stress.map((v, i) => [xs0 + (xs1 - xs0) * i / (RF.stress.length - 1), ys(v)]), pk = RF.stress.indexOf(Math.max.apply(null, RF.stress)), kx = pts[pk][0], ky = pts[pk][1];
      glow(C_HULL, () => poly(pts, C_HULL, NORMAL, HAIR));
      dash([1, 3], () => line(kx + 0.5, yb + 3, kx + 0.5, ky - 4, CREAM, 0.55));
      glow(CREAM, () => dot(kx, ky, 2, CREAM, 1)); num(Math.round(RF.stress[pk] * 100) + " %", kx + 6, B1 - 5, { size: 11, col: C_HULL }); });
  }

  /* life corner: one air-mix bar per crew (each = 100 % of that crew's air), then the paired temp / p / rh scales */
  function paintLife() {
    const BX0 = 1870, BX1 = 1976, BW = BX1 - BX0, BY = [880, 922], BH = 22, SX0 = 1858;   // 1976: 24 from the right edge, the margin the left wing keeps from the left
    const SY = [956, 976, 996], SL = [["temp", 500], ["p", 10000], ["rh", 100]];
    stat_(() => {
      head("life", SX0, 858, { a: 0.85 });
      SL.forEach((l, i) => { mic(l[0], SX0 - 4, SY[i], { align: "right" }); line(SX0, SY[i] + 4.5, BX1, SY[i] + 4.5, CREAM, 0.3);
        line(BX1 - 0.5, SY[i] + 2.5, BX1 - 0.5, SY[i] + 6.5, CREAM, 0.3); });
    });
    const tick = (i, v, col, txt, right) => { const u = Math.max(0, Math.min(1, v / SL[i][1])), x = Math.round(SX0 + (BX1 - SX0 - 1) * u) + 0.5, y = SY[i];
      glow(col, () => line(x, y + 2.5, x, y + 6.5, col, BRIGHT, STRONG));
      text(txt, right ? BX1 : SX0, y, { size: 11, col, a: BRIGHT, align: right ? "right" : "left" }); };
    const box = (x, y, w, col, a) => { c.fillStyle = rgba(col, a); c.fillRect(x, y, w, BH); };
    dyn(() => {
      /* the edges measure from each gas's calm value and ignore its calm swing, so the bars sit still until a site disturbs the air */
      const dz = (v, c0, w) => { const d = v - c0; return Math.abs(d) <= w ? 0 : d - Math.sign(d) * w; };
      const pc = v => BW * Math.max(0, Math.min(100, v)) / 100, NS = ts > s + 1e-6 ? 8 : 9, NV = ts > s + 1e-6 ? 10 : 11;   // one step down where a small screen grows the text
      /* human: n2 | o2 | trace */
      const o2 = 20.95 + dz(RF.o2n, 20.95, 0.05), n2 = 78, xo = BX0 + pc(n2), xt = BX0 + pc(n2 + o2), y0 = BY[0];
      box(BX0, y0, xo - BX0, C_TOP, 0.2); box(xo, y0, xt - xo, C_TOP, 0.55); box(xt, y0, BX1 - xt, C_TOP, 0.3);
      [xo, xt].forEach(x => line(Math.round(x) + 0.5, y0, Math.round(x) + 0.5, y0 + BH, C_TOP, 0.9));
      c.strokeStyle = rgba(C_TOP, 0.5); c.lineWidth = HAIR; c.strokeRect(BX0 + 0.5, y0 + 0.5, BW - 1, BH - 1);
      text("human", BX0 + 4, y0 + 9, { size: NS, col: C_TOP, a: 0.85, ls: 0 });
      text("n2 78", BX0 + 4, y0 + 19, { size: NV, col: C_TOP, a: BRIGHT, ls: 0 });
      text("co2 " + (RF.co2n / 1e4).toFixed(2), BX1, y0 - 6, { size: NS, col: C_TOP, a: BRIGHT, align: "right", ls: 0 });
      text("o2", (xo + xt) / 2, y0 + 9, { size: NS, col: CREAM, a: 1, align: "center", ls: 0 });
      text(Math.round(RF.o2n) + "", (xo + xt) / 2, y0 + 19, { size: NV, col: CREAM, a: 1, align: "center", ls: 0 });
      /* lower: co2 | h2so4 | trace */
      const co = 96 + dz(RF.co2L, 96, 0.5), hs = 3.2 + dz(RF.h2so4, 3.2, 0.08), xh = BX0 + pc(co), xe = BX0 + pc(co + hs), y1 = BY[1];
      box(BX0, y1, xh - BX0, C_HULL, 0.2); box(xh, y1, xe - xh, C_HULL, 0.8); box(xe, y1, BX1 - xe, C_HULL, 0.3);
      [xh, xe].forEach(x => line(Math.round(x) + 0.5, y1, Math.round(x) + 0.5, y1 + BH, C_HULL, 0.9));
      c.strokeStyle = rgba(C_HULL, 0.5); c.lineWidth = HAIR; c.strokeRect(BX0 + 0.5, y1 + 0.5, BW - 1, BH - 1);
      text("lower", BX0 + 4, y1 + 8, { size: NS, col: C_HULL, a: 0.85, ls: 0 });
      text("co2 " + Math.round(RF.co2L), BX0 + 4, y1 + 18, { size: NV, col: C_HULL, a: BRIGHT, ls: 0 });
      text("h2so4 " + RF.h2so4.toFixed(1), BX1, y1 - 6, { size: NS, col: C_HULL, a: BRIGHT, align: "right", ls: 0 });
      /* the safe band under the breathed segment: o2 19.5 to 23.5, h2so4 2.0 to 4.5 */
      [[y0, xo, 19.5, 23.5], [y1, xh, 2.0, 4.5]].forEach(b => [b[2], b[3]].forEach(v => { const x = Math.round(Math.min(BX1 - 1, b[1] + pc(v))) + 0.5; line(x, b[0] + BH + 1, x, b[0] + BH + 4, CREAM, 0.8); }));
      tick(0, RF.cabin, C_TOP, String(Math.round(RF.cabin))); tick(0, RF.tL, C_HULL, String(Math.round(RF.tL)), 1);
      tick(1, RF.kpaN, C_TOP, String(Math.round(RF.kpaN))); tick(1, RF.kpaL, C_HULL, String(Math.round(RF.kpaL)), 1);
      tick(2, RF.rhN, C_TOP, String(Math.round(RF.rhN))); tick(2, RF.rhL, C_HULL, String(Math.round(RF.rhL)), 1);
      rv("g", RF.g, BX1, 857, "right");
    });
  }

  /* ======================= LOG (bottom centre) ======================= */
  function paintLog() {
    stat_(() => line(777, FL + 0.5, 1224, FL + 0.5, GOLD, STRUCT));
    dyn(() => {
      const src = window.Bridge && Bridge.log && Bridge.log.lines ? Bridge.log.lines() : D.log.map(l => ({ text: l[0], kind: l[1] === "!" ? "warn" : "", shown: l[0].length, typing: false }));
      const all = src.slice(-5), nw = all[all.length - 1], prior = all.slice(0, -1), n = prior.length, k = ts / s;
      const mark = l => /^(warn|err|crit)/.test(l.kind || "") ? "!" : ">", shownOf = l => l.text.slice(0, l.shown == null ? l.text.length : l.shown);
      const pcut = [];
      prior.forEach((l, i) => { const y = 905 + (i - (n - 4)) * 15, a = [QUIET, 0.5, 0.64, 0.8][Math.max(0, Math.min(3, i - (n - 4)))];
        let pt = shownOf(l); const key = pt + "|" + k, hit = cutC.get(key);
        if (hit) { pt = hit.t; pcut[i] = hit.cut; }
        else { const room = 1206 - 806; c.font = `500 ${10 * k}px "IBM Plex Mono", monospace`; c.letterSpacing = (0.4 * k) + "px";
          let cu = false; if (c.measureText(pt).width > room) { cu = true; while (pt.length > 1 && c.measureText(pt + "…").width > room) pt = pt.slice(0, -1); pt += "…"; }
          c.letterSpacing = "0px"; pcut[i] = cu; if (l.typing !== true) { if (cutC.size > 200) cutC.clear(); cutC.set(key, { t: pt, cut: cu }); } }
        c.save(); c.beginPath(); c.rect(780, y - 14, 1214 - 780, 20); c.clip();
        text(mark(l), 792, y, { size: 10, col: mark(l) === "!" ? CREAM : GOLD, a }); text(pt, 806, y, { size: 10, col: GREY, a, ls: 0.4 }); c.restore(); });
      const nowLeft = 1208 - W_(D.now, LBL());
      let end = null, cut = false;
      if (nw) {
        let nt = shownOf(nw); const room = nowLeft - 8 - 818;
        const nk = nt + "|" + k + "|" + room, nh = nwC.get(nk);
        if (nh) { nt = nh.t; cut = nh.cut; }
        else {
          c.font = `500 ${13 * k}px "IBM Plex Mono", monospace`; c.letterSpacing = (0.3 * k) + "px";
          if (c.measureText(nt).width > room) { cut = true; while (nt.length > 1 && c.measureText(nt + "…").width > room) nt = nt.slice(0, -1); nt += "…"; }
          c.letterSpacing = "0px";
          if (nwC.size > 200) nwC.clear(); nwC.set(nk, { t: nt, cut });
        }
        glow(CREAM, () => { text(mark(nw), 792, 986, { size: 13, col: mark(nw) === "!" ? CREAM : GOLD, a: 1 });
          const w = text(nt, 808, 986, { size: 13, col: CREAM, a: 1, ls: 0.3 });
          if (nw.typing) line(810 + w, 988.5, 818 + w, 988.5, CREAM, 0.9, STRONG);
          end = 818 + w; });
      }
      const X = x => W / 2 - 1000 * s + x * s;
      if (ph === "d") lastLog = { lines: all.map((l, i) => ({ text: l.text, kind: l.kind || "", shown: l.shown == null ? l.text.length : l.shown, cut: i === all.length - 1 ? cut : !!pcut[i] })),
        end: end == null ? null : X(end), nowLeft: X(nowLeft) };
      mic(D.now, 1208, 986, { a: NORMAL, align: "right" });   // shares the typed line's baseline
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
  /* the span label's distance comes from HudModels.dist (shared with the bridge archive panel) */
  function spanDist(camX, mark) {
    const B = window.Bridge;
    return window.HudModels.dist(mark.id, mark.cam, camX, B.CAM.max - B.CAM.min, B.LAND, B.SLOT);
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
    const o = {}; ["contacts", "near", "blips", "ball", "sweep", "beacons", "spectrum", "str", "floor", "speed", "speedAt", "resNow", "dose", "g", "gFlip", "hullT", "hullTv", "lat", "vert", "width", "lampsL", "bid", "more", "sites"].forEach(k => { o[k] = D[k]; });
    o.brg = brgOf(D.blips[0]);
    o.rep = null;
    return o;
  }
  const dzO = {};   // per-instrument disturbance from the signatures, reused
  const sigRows = [], sigVis = [], sigMet = new Set(), dzRadar = [], DZK = ["drift", "drift2", "g", "rad", "str"];   // the signature monitor's fading rows (first-seen order), the visible three, the radar ghosts, the clamp keys
  const sigPool = [0, 1, 2, 3, 4, 5].map(() => ({ id: "", cls: "", inst: "", s: 0, a: 0, on: false, used: false, slot: -1, pat: [0, 0, 0] }));   // 3 live + fading
  const holdLat = { v: 0, t: -9 }, holdVert = { v: 0, t: -9 };
  const speedBuf = new Array(90).fill(0.03); let speedT = 0;
  const strBuf = new Array(50).fill(0); let strT = 0;   // SKETCH v21b: str history, one value per 0.1 s (5 s)
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
    o.bid = [ct.nearest, ct.second].filter(Boolean).map(x => String(x.mark.id));   // SKETCH v23b: the ids of the first two, every other mark in range, and the sites in range
    o.more = marks.filter(m => Math.abs(m.cam - B.camX) < HM.RANGE && (!ct.nearest || m !== ct.nearest.mark) && (!ct.second || m !== ct.second.mark)).sort((p, q) => Math.abs(p.cam - B.camX) - Math.abs(q.cam - B.camX)).map(m => { const a = HM.blipAngle(m, B.camX), r = Math.abs(m.cam - B.camX) / HM.RANGE; return { b: [Math.cos(a) * r, Math.sin(a) * r], id: String(m.id) }; });
    o.sites = (window.BridgeSites ? BridgeSites.SITES : []).filter(t => (!t.gate || (window.depthAlpha && depthAlpha(t.gate) > 0.5)) && Math.abs(t.x - B.camX) < HM.RANGE).map(t => { let h = 2166136261; for (let i = 0; i < t.id.length; i++) h = Math.imul(h ^ t.id.charCodeAt(i), 16777619) >>> 0; return { d: (t.x - B.camX) / HM.RANGE, met: sigMet.has("sg-" + String(h % 10000).padStart(4, "0")) }; });
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
    if (sg) { o.spectrum = Array.from({ length: 32 }, (_, i) => sg.bars[Math.min(HM.BANDS - 1, Math.floor(i * HM.BANDS / 32))]);
      o.bars = Array.from(sg.bars); o.peaks = Array.from(sg.peaks); }   // SKETCH v21b: every bin and its slow peak-hold for the sound monitor
    if (env.r) o.voice = env.r.voice || "void";
    { const ev = [["nomic", e.nomic], ["jitter", e.jitter], ["frozen", e.frozen], ["sway", e.sway], ["chaos", e.chaos], ["echo", e.echo]].reduce((b, x) => (x[1] || 0) > (b[1] || 0) ? x : b, ["", 0]); o.envName = ev[1] > 0.05 ? ev[0] : ""; }
    if (now - strT >= 0.1) { strT = now; strBuf.push(o.str); strBuf.shift(); }
    o.strH = strBuf;
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
    /* signature rows: each id fades in over ~0.3 s and out over ~0.4 s; rows keep their slot (first-seen order) while live, a fading row stays until it reaches 0, at most three are shown (the most faded drop out); pooled, no per-frame allocation */
    { const dtf = Math.min(env.dt || 0.016, 0.1), ss = e.sig || []; o.sigT = now; o.site = e.site || "";
      for (let i = 0; i < sigRows.length; i++) sigRows[i].on = false;
      for (let i = 0; i < ss.length; i++) { const g = ss[i]; let r = null;
        for (let j = 0; j < sigRows.length; j++) if (sigRows[j].id === g.id) { r = sigRows[j]; break; }
        if (!r) { for (let j = 0; j < sigPool.length; j++) if (!sigPool[j].used) { r = sigPool[j]; break; }
          if (!r) continue;
          r.used = true; r.id = g.id; r.a = 0; r.slot = -1; sigRows.push(r); }
        r.on = true; r.cls = g.cls; r.inst = g.inst; r.s = g.s; r.pat[0] = g.pat[0]; r.pat[1] = g.pat[1]; r.pat[2] = g.pat[2]; }
      for (let i = sigRows.length - 1; i >= 0; i--) { const r = sigRows[i]; if (r.slot < 0 && r.on) continue; r.a = r.on ? Math.min(1, r.a + dtf / 0.3) : Math.max(0, r.a - dtf / 0.4); if (!r.on && r.a <= 0) { r.used = false; r.slot = -1; sigRows.splice(i, 1); } }
      /* a row keeps its slot (0..2, the lowest free one) from when it first shows until its fade ends, so a live row never moves; a newcomer waits while all three are taken */
      for (let i = 0; i < sigRows.length; i++) { const r = sigRows[i]; if (r.slot >= 0) continue;
        for (let k = 0; k < 3; k++) { let free = true; for (let j = 0; j < sigRows.length; j++) if (sigRows[j].slot === k) { free = false; break; } if (free) { r.slot = k; break; } } }
      for (let i = 0; i < ss.length; i++) sigMet.add(ss[i].id); o.ids = sigMet.size;   // ids met: the HUD's own running set
      sigVis.length = 0; for (let i = 0; i < sigRows.length; i++) if (sigRows[i].slot >= 0) sigVis.push(sigRows[i]);
      o.sig = sigVis;
      /* the same contacts shake the white instruments (display only): each row's pattern, times strength and fade, summed per instrument and capped at 1; null when empty */
      if (!sigRows.length) o.dz = null;
      else { const z = dzO; z.drift = z.drift2 = z.g = z.rad = z.str = 0; dzRadar.length = 0;
        for (let i = 0; i < sigRows.length; i++) { const r = sigRows[i], w = r.a * (0.15 + 0.85 * r.s), p = r.pat, T = now;
          if (r.inst === "radar") { dzRadar.push(r); continue; }
          const v = 0.6 * Math.sin(T * p[0] * 5) + 0.4 * Math.sin(T * p[0] * p[1] * 5 + 1) + 0.2 * p[2] * Math.sin(T * 17 * p[2]);
          z[r.inst] += w * v;
          if (r.inst === "drift") z.drift2 += w * (0.6 * Math.cos(T * p[0] * 4.3) + 0.4 * Math.sin(T * p[0] * p[1] * 3.1)); }
        z.radar = dzRadar.length ? dzRadar : null;
        for (let i = 0; i < DZK.length; i++) z[DZK[i]] = Math.max(-1, Math.min(1, z[DZK[i]])); o.dz = z; } }
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
    o.kpaN = 101; o.rhN = 41; o.tL = 462; o.kpaL = 9200; o.rhL = 0; o.h2so4 = 3.2; o.co2L = 96; o.g = "0.00"; o.o2n = 20.88; o.co2n = 615;   // the life corner's raw numbers (the fallback)
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
    o.kpaN = sys.kpa; o.rhN = sys.rh; o.tL = sys.tL; o.kpaL = sys.kpaL; o.rhL = sys.rhL; o.h2so4 = sys.h2so4; o.co2L = sys.co2L; o.g = (e.g || 0).toFixed(2); o.o2n = sys.o2; o.co2n = sys.co2;
    const si = { thrust: th, wear: sys.wear || 0, impact: sys.lastImpact, now: now, sway: e.sway || 0, jitter: e.jitter || 0 };
    o.stress = Array.from({ length: 157 }, (_, i) => HM.stress(-0.52 + i * 0.01, si));
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
      line(X0, Y + 0.5, X1, Y + 0.5, GOLD, NORMAL, STRONG); [X0, X1].forEach(x => line(x + 0.5, Y - 5, x + 0.5, Y + 6, GOLD, BRIGHT, STRONG));
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
      spread(S.unread.map(p => X(p)), 10).forEach(x => { if (!bx.some(b => Math.abs(b - x) <= 9)) line(x, Y - 9, x, Y, GOLD, 1, STRONG); });
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
        glow(CREAM, () => { let a = lo; brk.forEach(x => { if (x - GAP > a) line(a, Y + 1, x - GAP, Y + 1, CREAM, BRIGHT, STRONG); a = Math.max(a, x + GAP); });
          if (hi > a) line(a, Y + 1, hi, Y + 1, CREAM, BRIGHT, STRONG); });
        rd.forEach(x => dot(x, Y + 0.5, 1.7, CREAM, 0.6));
        text(S.label, (xn + xy) / 2, Y + 18, { size: 11, col: CREAM, a: 1, align: "center" });
        text("+1 lv", xn, Y - 20, { size: 10, col: CREAM, a: 1, align: "center" });
        glow(CREAM, () => line(xn, Y - 14, xn, Y + 2, CREAM, 1, STRONG));
      }
      glow(CREAM, () => { line(xy, Y - 9, xy, Y + 10, CREAM, 1, STRONG); dot(xy, Y + 0.5, 4, CREAM, 1); });
      mic("you", xy + 8, Y - 5, { a: 0.9, col: CREAM });
    });
  }

  /* ======================= public API ======================= */
  /* each block draws in sketch coordinates under its own anchor: wings at the bottom corners, log + span centred */
  function paintAll() {
    const spanY = barB + 29.8 * s, s0 = s, ts0 = ts;
    blk = 0;
    const at_ = (ox, oyy, f) => { blk++; c.save(); c.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oyy); f(); c.restore(); };
    s = sB * wk; ts = Math.max(s, 0.9);   // the wings and the log draw at the HUD scale (uncapped base x step), anchored to their corners / bottom centre; the span line keeps the capped s
    at_(0, H - 1009 * s, paintLeft); at_(W - 2000 * s, H - 1009 * s, paintRight);
    at_(W / 2 - 1000 * s, H - 1009 * s - (wk > 1 ? 50 * s - 13 * sB : 0), paintLog);   // grown wings carry their floor line and readouts into the log's columns: the log rises above them
    s = s0; ts = ts0;
    at_(W / 2 - 1000 * s, spanY - 88.5 * s, paintSpan);
    if (ph === "d") paintMarks();
  }
  /* ---- wing size: one SIZE - + stepper above the left wing's top-left, in screen px ---- */
  const wingOk = v => { const q = Math.min(W / 2000, H / 1009); return XL * q * v + 12 <= W / 2; };   // the left wing's inner edge (its floor line and readouts end at XL) keeps 12 px of the centre; the right wing mirrors it
  const wingFit = () => { wk = WSTEPS.filter(v => v <= wsv && (v === 1 || wingOk(v))).pop(); };
  const marks = () => { const sw = Math.min(W / 2000, H / 1009) * wk, y = H - 237 * sw - 33, i = WSTEPS.indexOf(wk), up = WSTEPS[i + 1];
    return [{ d: -1, x: 14 + 47, y, on: i > 0 }, { d: 1, x: 14 + 69, y, on: up != null && wingOk(up) }]; };   // cells 22 px wide, centred on x
  function paintMarks() {
    c.save(); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const mk = marks(), Y = Math.round(mk[0].y) + 0.5, fx = 14.5, fy = Y - 10;
    /* SKETCH v3: a slanted tab about the old frame's centre, long sides on H (0.052), ends on V (0.2), fill alpha, no frame; two V hairlines split size / - / + */
    const tq = (x, v) => [x + 0.2 * (v - 10), Y + (x - 54.5) * 0.052 + v - 10];
    c.beginPath(); [[fx, 0], [fx + 80, 0], [fx + 80, 20], [fx, 20]].forEach((q, k) => { const p = tq(q[0], q[1]); if (k) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); c.closePath(); c.fillStyle = rgba(C_TOP, 0.12); c.fill();
    c.lineWidth = HAIR; c.strokeStyle = rgba(C_TOP, QUIET); c.beginPath(); [fx + 36, fx + 58].forEach(x => { const a = tq(x, 0), b = tq(x, 20); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); }); c.stroke();
    c.font = '500 10px "IBM Plex Mono", monospace'; c.letterSpacing = "1px"; c.textBaseline = "alphabetic"; c.textAlign = "left"; c.fillStyle = rgba(GOLD, NORMAL); c.fillText("size", fx + 5, Y + 3.5);
    c.letterSpacing = "0px";
    mk.forEach((m, n) => { const h = hov === n && m.on, a = !m.on ? QUIET : h ? BRIGHT : NORMAL, X = Math.round(m.x) + 0.5;
      c.lineWidth = STRONG; c.strokeStyle = rgba(CREAM, a); c.beginPath(); c.moveTo(X - 4, Y); c.lineTo(X + 4, Y);
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
    sB = Math.min(W / 2000, H / 1009); s = Math.min(1, sB); ts = Math.max(s, 0.9);
    document.documentElement.style.setProperty("--hud-k", +(Math.max(1, sB) * wk).toFixed(4));   // the DOM parts' size factor, written on resize / step only
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + "px"; cv.style.height = H + "px";
    rebuildStat();
  }
  function rebuildStat() {
    const live = c; clearTx();
    stat =document.createElement("canvas"); stat.width = cv.width; stat.height = cv.height;
    c = stat.getContext("2d"); bxS = []; lbS = []; rbS = []; txS = []; shS = []; ph = "s"; paintAll(); ph = "d"; c = live; dirty = false;
  }
  function draw(env) {
    if (phone()) return;
    if (env && env.data) D = env.data;
    LF = leftNow(env);
    if (api._fix) Object.assign(LF, api._fix);   // SKETCH v15b: the shot script's fixture (dropped since v5, so the live speedAt etc. overrode it)
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
    const sw = sB * wk, oy0 = H - 1009 * sw, wing = {};
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
    const lim = { str: [24, 204, 760, 1009], brg: [214, 486, 760, 1009], drift: [24, 205, 798, 893], nsGfx: [280, 466, 856, 930], nsAlert: [222, 272, 856, 920], nsStream: [222, 466, 928, 982], dial: [206, 426, 806, 955], g: [0, 800, 959, 985] };
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
    const nb = LF && LF.rep && LF.rep.bars;   // id labels: one per bar row, none on a bar, a sail or another label (text against text is in the pairs above)
    if (nb) { const vb = nb.rows.filter(r => !r.hid), ov = (a, b) => Math.min(a.r, b.r) - Math.max(a.l, b.l) > 0.5 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 0.5;
      if (nb.ids.length < nb.rows.length) { overlaps++; bad.push("ids:" + nb.ids.length + "<" + nb.rows.length); }
      nb.ids.forEach(a => { if (!a.ok) { overlaps++; bad.push("idfit:" + a.s); }
        if (vb.some(r => ov(a, { l: r.xl, r: r.xr, t: r.t, b: r.b }))) { overlaps++; bad.push("idbar:" + a.s); }
        if (nb.sails.some(o => ov(a, o))) { overlaps++; bad.push("idsail:" + a.s); }
        nb.ids.forEach(b => { if (b !== a && a.s < b.s && ov(a, b)) { overlaps++; bad.push("idid:" + a.s + "|" + b.s); } }); }); }
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
  const api = { mount, draw, resize, report, sampleData, nearestUnread, wing: () => wk, k: () => Math.max(1, sB) * wk };
  return api;
})();
