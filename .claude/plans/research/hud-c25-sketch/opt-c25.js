/* C25 · top span line (unseen beacons) + log centre, from C24B: C22 wings untouched; nav moved to the top, the centre is the log. */
/* C22: C21C + pocket readout under the rose, 083 and lat labels given room, floor ring and drift history brighter. */
/* C21C: C20 with the left wing's field and drift reworked (bearing rose + drift ahead). */
/* C20: C19 + left light bank shifted left and its pitch tightened (columns 168 218 268 322 372 422 468, about pitch 50) so the sig / well column clears .001, outside and the resonance slope foot. C19: C18 + left light bank moved to the bottom band as the mirror of the right bank (two rows 975/989, pitch 56, x 180-560; dust dropped), drift corner left empty for later visuals, smaller pulse bursts with tags at +16, jnt to the bank's outer corner, hull stress baseline 972 -> 963 and the .001 / 0 foot labels up 6 so row 1 has air, row 2 lifted off the bottom edge. C18: C17 + fin b off o2, lower bank lifted (14 lights, jnt to row 2), pulse rays on blinking lamps, hot 80 / flip clearances, hull 98 leader visible, outside on the key row, dark tags readable. C17: C16 + lamps as the main thing (bigger glyphs, small tags, ring + rays for blinking, red rad lamp), roomier right bank, two-line outside row, ship / hull 98 apart from the fuel stack. */
OPTS.c25 = function () {
  const { line, poly, arc, dot, text, D, rgba, GOLD, CREAM, GREY, RED, REDT } = K;
  const c = K.ctx();
  const RAIL = 796, TOP = 772, STRUCT = 0.42, DIM = 0.16, XL = 776, XR = 1224, FL = 959, PI = Math.PI;
  const glow = (col, f) => { c.save(); c.shadowColor = rgba(col, 0.45); c.shadowBlur = 5; const r = f(); c.restore(); return r; };
  const lab = (s, x, y, o = {}) => text(s, x, y, Object.assign({ size: 10, col: GREY, a: 0.75 }, o));
  const mic = (s, x, y, o = {}) => text(s, x, y, Object.assign({ size: 9, col: GREY, a: 0.85 }, o));
  const num = (s, x, y, o = {}) => glow(o.col || GOLD, () => text(s, x, y, Object.assign({ size: 12, col: GOLD, a: 0.95 }, o)));
  const big = (s, x, y, o = {}) => glow(o.col || CREAM, () => text(s, x, y, Object.assign({ size: 24, col: CREAM, a: 1 }, o)));
  const W = (s, size) => { c.font = `500 ${size}px "IBM Plex Mono", monospace`; c.letterSpacing = (size <= 11 ? 0.8 : 0.2) + "px"; const w = c.measureText(s).width; c.letterSpacing = "0px"; return w; };

  /* ---------- polyline helpers ---------- */
  const len = P => P.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - P[i][0], p[1] - P[i][1]), 0);
  function at(P, s) {
    for (let i = 1; i < P.length; i++) { const [x0, y0] = P[i - 1], [x1, y1] = P[i], L = Math.hypot(x1 - x0, y1 - y0);
      if (s <= L || i === P.length - 1) { const t = Math.max(0, Math.min(1, s / L)); return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, (x1 - x0) / L, (y1 - y0) / L]; } s -= L; }
  }
  const sub = (P, s0, s1) => { const pts = []; for (let s = s0; s < s1; s += 2) pts.push(at(P, s).slice(0, 2)); pts.push(at(P, s1).slice(0, 2)); return pts; };

  /* ---------- the outline: a slanted top edge that falls into each slope, then the floor to the centre strip ---------- */
  const LS = [[486, RAIL], [491, 820], [504, 890], [525, 937], [556, 950]];   // fuel slope, top -> foot
  const RS = LS.map(([x, y]) => [2000 - x, y]);                               // resonance slope, top -> foot
  const HB0 = 584;
  const KS = 24 / 462, ycL = x => TOP + (x - 24) * KS, ycR = x => TOP + (1976 - x) * KS;   // top contour: 772 at the outer ends, 796 at the slopes
  poly(LS.concat([[HB0, FL]]).map(([x, y]) => [x + 0.5, y + 0.5]), GOLD, STRUCT);
  poly([[2000 - HB0, FL]].concat(RS.slice().reverse()).map(([x, y]) => [x + 0.5, y + 0.5]), GOLD, STRUCT);
  line(2000 - HB0, FL + 0.5, XR, FL + 0.5, GOLD, STRUCT); line(XR + 0.5, FL, XR + 0.5, FL + 9, GOLD, STRUCT);

  /* ---------- C6 red: the top edge breaks into three stepped segments per wing; each segment is one reading ---------- */
  // o: n ticks (major every maj), off = step (negative = raised), join 'L'/'R' = that end runs into the slope (no turn-down),
  //    v = lit to (0..1) or win = [a, b] lit window, mark = chevron t, pip = grey second marker t
  function edge(x0, x1, yc, o) { const off = o.off || 0, y = x => yc(x) + off, X = t => x0 + (x1 - x0) * t;
    poly([[x0, y(x0) + (o.join === "L" ? 0 : 7)], [x0, y(x0)], [x1, y(x1)], [x1, y(x1) + (o.join === "R" ? 0 : 7)]], GOLD, STRUCT + 0.08);
    for (let i = 0; i <= o.n; i++) { const x = Math.round(X(i / o.n)) + 0.5, M = i % o.maj === 0, m2 = o.mid && i % o.mid === 0, yy = y(x);
      line(x, yy + 1.5, x, yy + (M ? 6 : m2 ? 4 : 2.5) + 0.5, GOLD, M ? 0.45 : m2 ? 0.28 : 0.16); }
    const [a, b] = o.win || [0, o.v];
    glow(GOLD, () => line(X(a), y(X(a)), X(b), y(X(b)), GOLD, 0.95, 2));
    if (o.pip != null) { const xp = X(o.pip), yp = y(xp); line(xp, yp - 1, xp, yp - 5, GREY, 0.7, 1.5); }
    const xm = X(o.mark), ym = y(xm);
    glow(CREAM, () => poly([[xm - 4, ym - 6], [xm, ym - 1.5], [xm + 4, ym - 6]], CREAM, 0.95, 1.5));
    return y; }
  // a reading riding on a segment: parts [text, "m" (micro) | "n" (value)], baseline 9 px above the edge
  function rd(parts, x, yc, off, align) { const ws = parts.map(([s, k]) => W(s, k === "n" ? 10 : 9)), tw = ws.reduce((p, q) => p + q, 0) + 4 * (parts.length - 1);
    let px = align === "right" ? x - tw : x; const yb = Math.round(yc(x) + off - 9);
    parts.forEach(([s, k], i) => { k === "n" ? text(s, px, yb, { size: 10, col: CREAM, a: 0.95 }) : mic(s, px, yb, { a: 0.8 }); px += ws[i] + 4; }); }
  // left: field = signal strength, radar (lead, raised) = contact bearing, fuel = time left (runs into the fuel slope)
  edge(24, 204, ycL, { n: 20, maj: 5, v: D.str / 40, mark: D.str / 40 });
  rd([["str", "m"], [String(D.str), "n"], ["/40", "m"]], 204, ycL, 0, "right");
  { const brg = b => ((Math.atan2(b[1], b[0]) * 180 / PI + 90) % 360 + 360) % 360, b0 = brg(D.blips[0]), b1 = brg(D.blips[1]);
    const yb = edge(214, 486, ycL, { off: -6, n: 32, maj: 8, mid: 4, win: [b0 / 360 - 0.04, b0 / 360 + 0.04], mark: b0 / 360, pip: b1 / 360 });   // C16: brg runs to the slope (fuel's "2:00 left" moved to the fuel readout on the right)
    ["n", "e", "s", "w", "n"].forEach((s, i) => { const x = 214 + 272 * i / 4; mic(s, x + (i === 4 ? -3 : 3), yb(x) + 12, { align: i === 4 ? "right" : "left", a: 0.6 }); });
    rd([["brg", "m"], [String(Math.round(b0)).padStart(3, "0"), "n"]], 486, ycL, -6, "right"); }
  // right: supply volts (runs into the resonance slope), bus kW (lead, raised), cabin temperature with its dotted comfort band
  edge(1514, 1594, ycR, { join: "L", n: 8, maj: 4, v: (28.1 - 24) / 8, mark: (28.1 - 24) / 8 });
  rd([[parseFloat(D.volt).toFixed(1), "n"], ["V", "m"]], 1516, ycR, 0, "left");
  edge(1604, 1870, ycR, { off: -6, n: 24, maj: 4, mid: 2, v: 4.5 / 6, mark: 4.5 / 6 });
  rd([["bus", "m"], ["4.5", "n"], ["kW", "m"]], 1606, ycR, -6, "left");
  { const t = v => (v - 10) / 20, yb = edge(1880, 1976, ycR, { n: 20, maj: 10, mid: 5, v: t(21.4), mark: t(21.4) }), xa = 1880 + 96 * t(18), xb = 1880 + 96 * t(24);
    c.save(); c.setLineDash([1, 2]); line(xa, yb(xa) + 9, xb, yb(xb) + 9, CREAM, 0.6); c.restore();
    rd([["cabin", "m"], ["21.4°", "n"]], 1976, ycR, 0, "right"); }

  /* ---------- C10: under-rail visuals (each shows more of the reading on the rail above it) ---------- */
  const dsh = (pat, f) => { c.save(); c.setLineDash(pat); f(); c.restore(); };
  // V: the pack's 8 cells, one hairline box each, the level line inside at that cell's volts (3.30 - 3.70 V); the weakest cell in cream
  { const cells = [3.52, 3.53, 3.51, 3.52, 3.47, 3.53, 3.52, 3.50], lo = Math.min(...cells), y = x => ycR(x) + 4;
    cells.forEach((v, i) => { const x0 = 1516 + i * 10, x1 = x0 + 7, H = 11, weak = v === lo, col = weak ? CREAM : GOLD;   // C11: 7 x 11 cells, 3 px apart
      poly([[x0 + 0.5, y(x0) + H], [x0 + 0.5, y(x0)], [x1 + 0.5, y(x1)], [x1 + 0.5, y(x1) + H], [x0 + 0.5, y(x0) + H]], col, weak ? 0.8 : 0.55);
      const f = (v - 3.3) / 0.4, ly = (x0 + x1) / 2, yy = y(ly) + H - 1 - f * (H - 3);
      c.fillStyle = rgba(col, weak ? 0.3 : 0.18); c.fillRect(x0 + 1.5, yy, x1 - x0 - 2, y(ly) + H - yy - 0.5);
      line(x0 + 1.5, yy, x1 - 0.5, yy, col, weak ? 0.95 : 0.8, 1.2); }); }
  // bus kW: the 4.5 kW split by consumer, compartments laid on the rail's own kW axis (0 - 6), the rest dotted as spare
  { const X = kw => 1604 + 266 * kw / 6, y = x => ycR(x) - 6 + 9, H = 10;
    const parts = [["drv", 0.8], ["thm", 1.5], ["lsp", 1.5], ["gnc", 0.7]]; let k = 0;
    const box = (xa, xb, a) => poly([[xa, y(xa)], [xb, y(xb)], [xb, y(xb) + H], [xa, y(xa) + H], [xa, y(xa)]], GOLD, a);
    parts.forEach(([s, v]) => { const xa = X(k) + 0.5, xb = X(k + v) - 1.5; box(xa, xb, 0.42);
      const xm = (xa + xb) / 2; mic(s, xm - W(s, 9) / 2, Math.round(y(xm) + 8), { a: 0.8 }); k += v; });
    dsh([1, 2], () => box(X(k) + 0.5, X(6), 0.22));
    { const xs = X(k) + 4; mic("spare", xs, Math.round(y(xs) + 8), { a: 0.55 }); text("1.5", xs + W("spare", 9) + 4, Math.round(y(xs) + 8), { size: 9, col: GOLD, a: 0.7 }); } }
  // cabin: last 30 min of cabin temperature (20 - 22 °C), the thermostat setpoint 21.0 dotted with a cream tick, 5 min ticks on the time base
  { const x0 = 1882, x1 = 1970, yT = 790, yB = 806, Y = v => yB - (v - 20) / 2 * (yB - yT), n = 30;
    const pts = []; for (let i = 0; i <= n; i++) pts.push(21 + 0.32 * Math.sin(i * 0.52 - 1.2));
    const fix = 21.4 - pts[n]; pts.forEach((v, i) => pts[i] = v + fix * i / n);
    line(x0, yB + 0.5, x1, yB + 0.5, GOLD, 0.3);
    for (let i = 0; i <= 6; i++) { const x = Math.round(x0 + (x1 - x0) * i / 6) + 0.5; line(x, yB + 1, x, yB + (i % 3 ? 2.5 : 4), GOLD, i % 3 ? 0.2 : 0.45); }
    dsh([1, 2], () => line(x0, Math.round(Y(21)) + 0.5, x1, Math.round(Y(21)) + 0.5, GOLD, 0.35));
    line(x1 + 1, Math.round(Y(21)) + 0.5, x1 + 5, Math.round(Y(21)) + 0.5, CREAM, 0.9);
    glow(GOLD, () => poly(pts.map((v, i) => [x0 + (x1 - x0) * i / n, Y(v)]), GOLD, 0.85, 1));
    dot(x1, Y(pts[n]), 1.6, CREAM, 1);
    mic("30m", x0, yB + 13, { a: 0.55 }); mic("set 21.0", x1, yB + 13, { align: "right", a: 0.7 }); }

  // ticks on the wing side of a slope; u = 0 at the foot, 1 at the top
  function tickAt(P, side, u, L, col = GOLD, a = 0.5) { const T = len(P), [x, y, tx, ty] = at(P, T * (1 - u)), nx = side * -ty, ny = side * tx;
    line(x + nx * 1, y + ny * 1, x + nx * (L + 1), y + ny * (L + 1), col, a); return [x, y, nx, ny]; }
  function scaleLab(P, side, u, s, dy = 4) { const T = len(P), [x, y, tx, ty] = at(P, T * (1 - u)), nx = side * -ty, ny = side * tx;
    mic(s, x + nx * 17, y + ny * 17 + dy, { align: side > 0 ? "right" : "left", col: GOLD, a: 0.75 }); }

  /* ---------- C16: nose resonance on the LEFT slope (reads the void through the blade = outside): log axis ---------- */
  const FT = len(LS), uR = K.resF(+D.resNow);
  [0.001, 0.01, 0.1, 1].forEach(d => { for (let m = 1; m <= (d === 1 ? 1 : 9); m++) tickAt(LS, 1, K.resF(d * m), m === 1 ? 7 : 3, GOLD, m === 1 ? 0.6 : 0.26); });
  scaleLab(LS, 1, 1, "1", 18); scaleLab(LS, 1, K.resF(0.1), ".1", -8); scaleLab(LS, 1, K.resF(0.01), ".01"); scaleLab(LS, 1, 0, ".001", 0);
  poly(sub(LS, FT * (1 - uR), FT).concat([[HB0, FL + 0.5]]), GOLD, 0.95, 2);
  { const [x, y, nx, ny] = tickAt(LS, 1, uR, 9, CREAM, 0.95), px = x + nx * 13, py = y + ny * 13;
    poly([[px + nx * 6 - ny * 4, py + ny * 6 + nx * 4], [px, py], [px + nx * 6 + ny * 4, py + ny * 6 - nx * 4]], CREAM, 0.95, 1.5); dot(x, y, 2.5, CREAM, 1);
    const lx = x + nx * 21, ly = Math.round(y + ny * 21) + 0.5; line(lx, ly, lx - 9, ly, CREAM, 0.9);
    const wv = W(D.resNow, 16); glow(CREAM, () => text(D.resNow, lx - 17, ly + 6, { size: 16, col: CREAM, a: 1, align: "right" }));
    mic("nose", lx - 17 - wv, ly + 21, { col: CREAM, a: 0.85 }); mic("resonance", lx - 17 - wv, ly + 33, { col: CREAM, a: 0.85 }); }

  // C16: left floor line (thrust heat moved right with the fuel); the outside row hangs from it
  line(HB0, FL + 0.5, XL, FL + 0.5, GOLD, STRUCT); line(XL + 0.5, FL, XL + 0.5, FL + 9, GOLD, STRUCT);

  /* ---------- C16: fuel on the RIGHT slope (ship): 0 at the foot, 100 at the wing top; C15 drawing mirrored ---------- */
  const RT = len(RS);
  for (let i = 0; i <= 10; i++) tickAt(RS, -1, i / 10, i % 5 === 0 ? 7 : 3, GOLD, i % 5 === 0 ? 0.6 : 0.3);
  scaleLab(RS, -1, 1, "100", 26); scaleLab(RS, -1, 0.5, "50"); scaleLab(RS, -1, 0, "0", 0);
  poly(sub(RS, RT * (1 - D.fuel), RT).concat([[2000 - HB0, FL + 0.5]]), GOLD, 0.95, 2);
  { const [x, y, nx, ny] = tickAt(RS, -1, D.fuel, 9, CREAM, 0.95), px = x + nx * 13, py = y + ny * 13;
    poly([[px + nx * 6 - ny * 4, py + ny * 6 + nx * 4], [px, py], [px + nx * 6 + ny * 4, py + ny * 6 - nx * 4]], CREAM, 0.95, 1.5); dot(x, y, 2.5, CREAM, 1);
    const lx = x + nx * 21, ly = Math.round(y + ny * 21) + 0.5; line(lx, ly, lx + 9, ly, CREAM, 0.9);
    big(Math.round(D.fuel * 100) + " %", 1536, ly + 8);
    const t0 = D.left.split(" ")[0]; lab("fuel", 1536, ly + 24); text(t0, 1536, ly + 37, { size: 10, col: CREAM, a: 0.95 }); mic("left", 1536 + W(t0, 10) + 4, ly + 37, { a: 0.8 }); }

  /* ---------- C16: thrust heat on the right floor, mirrored: fed by the fuel line at the slope foot ---------- */
  { const x0 = 2000 - HB0, x1 = XR, w = x0 - x1, xt = x0 - w * D.thrust, xh = x0 - w * 0.8, yT = FL, H = 6;
    line(x1, yT + H + 0.5, x0, yT + H + 0.5, GOLD, 0.3);
    for (let x = x0 - 2; x > x1 + 1; x -= 3) { const on = x > xt, hot = x <= xh;
      const f = () => line(x - 0.5, yT + H, x - 2.5, yT + 1, on ? GOLD : hot ? CREAM : GOLD, on ? (x - xt < 4 ? 1 : 0.8) : hot ? 0.3 : 0.12);
      on ? glow(GOLD, f) : f(); }
    c.save(); c.setLineDash([1, 2]); line(x1, yT + H + 5.5, xh, yT + H + 5.5, CREAM, 0.6); c.restore();
    glow(CREAM, () => line(Math.round(xt) + 0.5, yT - 1, Math.round(xt) + 0.5, yT + H + 2, CREAM, 1, 1.5));
    for (let i = 0; i <= 10; i++) { const x = Math.round(x0 - w * i / 10) + 0.5, maj = i % 5 === 0; line(x, yT + H + 1, x, yT + H + (maj ? 3 : 2), GOLD, maj ? 0.5 : 0.25); }
    line(Math.round(xh) + 0.5, yT - 1, Math.round(xh) + 0.5, yT + H + 3, CREAM, 0.9);
    const tv = Math.round(D.thrust * 100) + " %"; text(tv, x0 - 14, 984, { size: 12, col: CREAM, a: 1, align: "right" });
    lab("thrust heat", x0 - 14 - W(tv, 12) - 10, 984, { align: "right" });
    mic("hot 80", x1 + 16, 984, { col: CREAM, a: 0.95 }); }

  /* ---------- C4 kit: partial edges, fine scales, slit rows, echo lines; never closed boxes ---------- */
  const head = (s, x, y, o = {}) => lab(s, x, y, Object.assign({ col: CREAM, a: 0.7, size: 9 }, o));
  const segs = (P, gaps, a = 0.3) => { for (let i = 0; i < gaps.length; i += 2) { const [x0, y0] = P[0], [x1, y1] = P[1], t0 = gaps[i], t1 = gaps[i + 1];
    line(x0 + (x1 - x0) * t0, y0 + (y1 - y0) * t0, x0 + (x1 - x0) * t1, y0 + (y1 - y0) * t1, GOLD, a); } };
  const pol = (cx, cy, r, d) => [cx + Math.cos(d * PI / 180) * r, cy + Math.sin(d * PI / 180) * r];
  const rad = d => d * PI / 180;
  const dash = (pat, f) => { c.save(); c.setLineDash(pat); f(); c.restore(); };
  // a row of short slits along (dx,dy), each slit along (sx,sy); v of them lit
  function slitRow(x, y, n, step, v, o = {}) { const dx = o.dx != null ? o.dx : 1, dy = o.dy || 0, sx = o.sx || 0, sy = o.sy != null ? o.sy : -1, h = o.h || 5, lit = Math.round(v * n);
    for (let i = 0; i < n; i++) { const px = x + dx * i * step + 0.5, py = y + dy * i * step, on = i < lit;
      line(px, py, px + sx * h, py + sy * h, GOLD, on ? (i === lit - 1 ? (o.aHead || 0.95) : (o.aOn || 0.7)) : (o.aOff || 0.13), o.w || 1); } }
  // a fine ruler along a straight line with a riding cream marker at t
  function ruler(x0, y0, x1, y1, t, o = {}) { const n = o.n || 20, L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L, sd = o.side || 1, nx = -uy * sd, ny = ux * sd;
    line(x0, y0, x1, y1, GOLD, o.a || 0.3);
    for (let i = 0; i <= n; i++) { const f = i / n, px = x0 + (x1 - x0) * f, py = y0 + (y1 - y0) * f, maj = i % (o.maj || 5) === 0;
      line(px, py, px + nx * (maj ? 4 : 2), py + ny * (maj ? 4 : 2), GOLD, maj ? 0.4 : 0.18); }
    const mx = x0 + (x1 - x0) * t, my = y0 + (y1 - y0) * t;
    if (!o.noMark) poly([[mx - ux * 3 - nx * 6, my - uy * 3 - ny * 6], [mx, my], [mx + ux * 3 - nx * 6, my + uy * 3 - ny * 6]], CREAM, 0.95, 1.2);
    return [mx, my]; }
  // an arc scale: ticks every st degrees, major every maj, pointing inward from r
  function arcScale(cx, cy, r, a0, a1, st, maj, o = {}) { const n = Math.round((a1 - a0) / st);
    for (let k = 0; k <= n; k++) { const d = a0 + k * st, M = k % maj === 0, m2 = o.mid && k % o.mid === 0, L = M ? (o.LM || 6) : m2 ? 4 : 2;
      const [x0, y0] = pol(cx, cy, r, d), [x1, y1] = pol(cx, cy, r - L, d); line(x0, y0, x1, y1, GOLD, M ? (o.aM || 0.5) : m2 ? 0.3 : 0.16); } }

  /* ======================= LEFT WING: lead = radar disc + motion band ======================= */
  const RX = 330, RY = 896;
  const WB = [[24, 908], pol(RX, RY, 106, 225)];
  const wbY = x => WB[0][1] + (x - WB[0][0]) * (WB[1][1] - WB[0][1]) / (WB[1][0] - WB[0][0]);

  // C21C field = where the signal comes from, then what it sounds like. Left: a rose of signal strength by bearing (north up, the brg tape's bearings),
  // 1.9 px per str unit, dotted ring = the noise floor (str 5); one lobe stands above it at the contact's bearing. Right: that lobe's spectrum on the wedge base
  segs(WB, [0, 0.05, 0.1, 0.78, 0.84, 1], 0.24);
  head("field", 24, 806); mic("one source", 24 + W("field", 9) + 8, 806, { a: 0.8 });
  const rv = (nm, v, x, y, al) => { const wn = W(nm, 9), wv = W(v, 10), x0 = al === "right" ? x - wn - 4 - wv : x;
    mic(nm, x0, y, { a: 0.8 }); text(v, x0 + wn + 4, y, { size: 10, col: CREAM, a: 0.95 }); };
  const sg = v => (v >= 0 ? "+" : "\u2212") + Math.abs(v).toFixed(2);
  { const ox = 76, oy = 850, rr = v => 5 + v * 1.9, FLR = 5;
    const brg = b => ((Math.atan2(b[1], b[0]) * 180 / PI + 90) % 360 + 360) % 360, b0 = brg(D.blips[0]), b1 = brg(D.blips[1]);
    const dd = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
    const sv = b => Math.abs(dd(b, b0)) < 0.1 ? D.str : 2.2 + 2.2 * D.spectrum[Math.round(b / 10) % 32] + 11 * Math.exp(-Math.pow(dd(b, b0) / 13, 2)) + 2.2 * Math.exp(-Math.pow(dd(b, b1) / 12, 2));
    const pt = b => { const r = rr(sv(b)), a = rad(b - 90); return [ox + Math.cos(a) * r, oy + Math.sin(a) * r]; };
    arc(ox, oy, rr(FLR), 0, 2 * PI, GREY, 0.95, 1.2, [1, 2.5]);   // C22: floor ring brighter
    arc(ox, oy, rr(D.str), 0, 2 * PI, GOLD, 0.14);
    [0, 90, 180, 270].forEach(b => { const a = rad(b - 90), r = rr(D.str); line(ox + Math.cos(a) * (r - 3), oy + Math.sin(a) * (r - 3), ox + Math.cos(a) * r, oy + Math.sin(a) * r, GOLD, 0.45); });
    dot(ox, oy, 1.4, GOLD, 0.7);
    const L = []; for (let b = 0; b < 360; b += 4) L.push(pt(b)); L.push(L[0]);
    poly(L, GOLD, 0.55);
    const hot = []; for (let b = b0 - 22; b <= b0 + 22; b += 2) hot.push(pt(b));
    glow(CREAM, () => poly(hot, CREAM, 0.95, 1.5));
    const [tx, ty] = pt(b0); dash([1, 2], () => line(ox, oy, tx, ty, CREAM, 0.5));
    mic(String(Math.round(b0)).padStart(3, "0"), tx + 2, ty - 6, { col: CREAM, a: 0.85 });   // C22: above the tip, clear of the spectrum bars
    // the lobe's spectrum on the base (22 bins, 2.6 px per str), floor line, peak marked
    const x0 = 130, n = 21, st = 4.6, k = 2.6, TOPY = 814, PK = 4;
    const lv = i => i === PK ? D.str : 2.2 + 2.4 * D.spectrum[(i * 7) % 32] + 10 * Math.exp(-Math.pow((i - PK) / 1.1, 2)) + 2.6 * Math.exp(-Math.pow((i - 12) / 1.0, 2));
    let pk;
    for (let i = 0; i < n; i++) { const x = Math.round(x0 + i * st) + 0.5, yb = wbY(x) - 3, v = lv(i), h = Math.min(v * k, yb - TOPY), up = v > FLR;
      if (i === PK) { glow(CREAM, () => line(x, yb, x, yb - h, CREAM, 0.95, 1.6)); pk = [x, yb - h]; }
      else line(x, yb, x, yb - h, GOLD, up ? 0.75 : 0.3, up ? 1.2 : 1); }
    const xe = x0 + (n - 1) * st;
    dash([1, 3], () => line(x0 - 2, wbY(x0 - 2) - 3 - FLR * k, xe + 2, wbY(xe + 2) - 3 - FLR * k, GREY, 0.6));
    mic("floor", xe + 6, wbY(xe + 6) - FLR * k, { a: 0.8 });
    glow(CREAM, () => poly([[pk[0] - 4, pk[1] - 9], [pk[0], pk[1] - 4.5], [pk[0] + 4, pk[1] - 9]], CREAM, 0.95, 1.5));
    rv("peak", String(D.str), pk[0] + 8, pk[1] - 3, "left");
    // C22 pocket under the wedge base: how sure the rose is. width = the lobe's half width (bearing is good to +-13 deg);
    // 2nd = the small second bump on the rose, its bearing, still faint (at the floor). A short gold tick ties each row to the rose's column.
    line(24.5, 912, 24.5, 933, GOLD, 0.35);
    rv("width", "±13°", 30, 919, "left");
    { const s2 = String(Math.round(b1)).padStart(3, "0"); rv("2nd", s2, 30, 930, "left"); mic("faint", 30 + W("2nd", 9) + 4 + W(s2, 10) + 6, 930, { a: 0.6 }); } }
  /* ---------- C16: status lights. lamp + short tag; st 0 dark, 1 lit, 2 blinking (halo + ticks), 3 blinking + red core.
     Left = diamonds (detections outside), right = rings (ship systems). ---------- */
  function lamp(x, y, s, st, shape) { const gx = x + 5, gy = y, r = shape === "d" ? 5.2 : 4.4, on = st > 0, red = st === 3, ty = gy + 3;
    const pth = () => { c.beginPath(); if (shape === "d") { c.moveTo(gx, gy - r); c.lineTo(gx + r, gy); c.lineTo(gx, gy + r); c.lineTo(gx - r, gy); c.closePath(); } else c.arc(gx, gy, r, 0, 2 * PI); };
    const g = (col, a, w) => { pth(); c.strokeStyle = rgba(col, a); c.lineWidth = w; c.lineJoin = "round"; c.stroke(); };
    const tag = (o) => text(s, x + 16, ty, Object.assign({ size: 8, col: GREY, a: 0.5 }, o));
    if (!on) { g(GOLD, 0.34, 1); tag({ a: 0.55 }); return; }
    const col = red ? RED : CREAM, hi = red ? REDT : CREAM;
    c.save(); c.shadowColor = rgba(hi, 0.8); c.shadowBlur = 8; g(hi, 1, 1.5); c.restore();
    c.save(); c.shadowColor = rgba(hi, 0.7); c.shadowBlur = 6; pth(); c.fillStyle = rgba(col, red ? 1 : 0.55); c.fill(); c.restore();
    dot(gx, gy, red ? 1.6 : 1.8, hi, 1);
    if (st >= 2) { const R1 = r + 2;   // C19: tighter burst (ring r+2, rays R1+1 .. R1+3.5) so it clears its own tag and the lamp above
      c.save(); c.shadowColor = rgba(hi, 0.9); c.shadowBlur = 5;
      arc(gx, gy, R1, 0, 2 * PI, hi, 1, 1.3);
      [45, 135, 225, 315].forEach(d => { const t = rad(d); line(gx + Math.cos(t) * (R1 + 1), gy + Math.sin(t) * (R1 + 1), gx + Math.cos(t) * (R1 + 3.5), gy + Math.sin(t) * (R1 + 3.5), hi, 1, 1.6); });
      c.restore(); }
    tag({ col: CREAM, a: st >= 2 ? 0.85 : 0.7 }); }
  // C19 left bank (outside detections): bottom band, the mirror of the right bank (right block x 1440-1820 -> left 180-560), same rows and pitch; the drift corner stays empty
  { const LB = [["nomic", 0], ["chaos", 1], ["span", 1], ["unfrm", 0], ["cntc", 1], ["bcn", 0], ["sig", 0],
                ["rad", 3], ["dbr", 0], ["shear", 0], ["flip", 2], ["rift", 0], ["curr", 0], ["well", 0]];   // dust dropped (14 slots); blinking rad / flip sit under dark lamps
    const LX = [168, 218, 268, 322, 372, 422, 468];   // C20: pitch ~50 (flip column +4 so its burst clears "shear", curr -> well 46 as those tags are short); block ends at 468 so sig / well clear .001 and outside
    LB.forEach(([s, st], i) => lamp(LX[i % 7], i < 7 ? 975 : 989, s, st, "d")); }

  // motion band (lead): speed gauge round the radar; fine sweep scale, polar speed trace on its inner edge, needle at 0
  { const r0 = 74, r1 = 90, a0 = 135, a1 = 300;
    arc(RX, RY, r1, rad(a0), rad(a1), GOLD, 0.7); arc(RX, RY, r0, rad(a0), rad(a1), GOLD, 0.3);
    arc(RX, RY, (r0 + r1) / 2, rad(a0 + 4), rad(a1 - 4), GOLD, 0.14, 1, [1, 3]);
    arc(RX, RY, r1 + 7, rad(150), rad(285), GOLD, 0.14, 1, [2, 4]);
    [150, 285].forEach(d => { const [x0, y0] = pol(RX, RY, r1 + 4, d), [x1, y1] = pol(RX, RY, r1 + 10, d); line(x0, y0, x1, y1, GOLD, 0.3); });
    [a0, a1].forEach(d => { const [x0, y0] = pol(RX, RY, r0 - 3, d), [x1, y1] = pol(RX, RY, r1 + 3, d); line(x0, y0, x1, y1, GOLD, 0.55); });
    arcScale(RX, RY, r1, a0, a1, 2.5, 12, { mid: 3, LM: 7, aM: 0.55 });
    const tr = D.speed.map((v, i) => pol(RX, RY, r0 - 3 - v * 60, a0 + (a1 - a0) * i / (D.speed.length - 1)));
    poly(tr, GOLD, 0.45);
    { const d = a0 + (a1 - a0) * 0.75, [x, y] = pol(RX, RY, r1 + 4, d), [xi, yi] = pol(RX, RY, r1 + 9, d - 2), [xo, yo] = pol(RX, RY, r1 + 9, d + 2); poly([[xi, yi], [x, y], [xo, yo]], GOLD, 0.45); }
    const [x0, y0] = pol(RX, RY, r0 - 2, a0 + 1.2), [x1, y1] = pol(RX, RY, r1 + 8, a0 + 1.2); glow(CREAM, () => line(x0, y0, x1, y1, CREAM, 1, 2));
  }

  // radar disc (lead): brighter rim, dotted echo ring, contact range bracket, pip row for the contact count
  P.radar(RX, RY, 62, 0, 2 * PI, { sweep: -0.5 }); P.pull(RX, RY, 25, { ballR: 4 });
  arc(RX, RY, 62, 0, 2 * PI, GOLD, 0.35);
  arc(RX, RY, 66, rad(-40), rad(120), GOLD, 0.15, 1, [1, 3]);
  { const b = D.blips[0], bx = RX + b[0] * 62, by = RY + b[1] * 62, rr = Math.hypot(b[0], b[1]) * 62, ab = Math.atan2(b[1], b[0]);
    arc(RX, RY, rr, ab - 0.32, ab + 0.32, CREAM, 0.45, 1, [2, 2]);
    poly([[bx + 6, by + 4], [bx + 30, by + 30], [404, by + 30]], CREAM, 0.4);
    for (let i = 0; i < 6; i++) dot(408 + i * 7, by + 30.5, 1.6, i < D.contacts ? CREAM : GOLD, i < D.contacts ? 1 : 0.2);
    num(D.near, 404, by + 50, { size: 11 }); mic("contact", 404, by + 63, { a: 0.8 }); }

  // C21C drift = where the slip carries the ship. Reticle = the nose line (the ship now); arrow = slip now, m/s (lat + right, vert + up);
  // dotted path = how far off its line the ship ends up in 1..5 s if nothing corrects it (46 px per m), dotted cone = spread from the last 5 s of slip; dots behind = the last 2 s
  { const cx = 120, cy = 962, r = 11, xg = pol(RX, RY, 93, 135)[0] - 3, yr = wbY(cx) + 2, lat = 0.41, vert = 0.19, M = 46;
    arc(cx, cy, r, 0, 2 * PI, GOLD, 0.5); arc(cx, cy, r + 5, rad(200), rad(250), GOLD, 0.25);
    line(24, cy + 0.5, cx - r - 4, cy + 0.5, GOLD, 0.35); line(cx + r + 4, cy + 0.5, xg - 2, cy + 0.5, GOLD, 0.35);
    for (let i = -13; i <= 17; i++) { if (Math.abs(i) < 3) continue; const x = cx + i * 7 + 0.5; if (x < 24 || x > xg - 4) continue; line(x, cy, x, cy - (i % 3 ? 2 : 4), GOLD, i % 3 ? 0.2 : 0.45); }
    line(cx + 0.5, yr, cx + 0.5, cy - r - 4, GOLD, 0.35); line(cx + 0.5, cy + r + 4, cx + 0.5, 1000, GOLD, 0.35);
    dot(xg, cy, 1.6, GOLD, 0.7); dot(cx, yr, 1.6, GOLD, 0.7);
    const dx = lat * M, dy = -vert * M, ang = Math.atan2(dy, dx), D5 = Math.hypot(dx, dy) * 5;
    [-0.17, 0.17].forEach(e => dash([2, 3], () => line(cx + Math.cos(ang + e) * (r + 4), cy + Math.sin(ang + e) * (r + 4), cx + Math.cos(ang + e) * D5, cy + Math.sin(ang + e) * D5, GOLD, 0.4)));
    arc(cx, cy, D5, ang - 0.17, ang + 0.17, GOLD, 0.45);
    dash([1, 3], () => line(cx + dx, cy + dy, cx + dx * 5, cy + dy * 5, CREAM, 0.7));
    for (let t = 2; t <= 5; t++) { const x = cx + dx * t, y = cy + dy * t, nx = -Math.sin(ang), ny = Math.cos(ang); line(x - nx * 3, y - ny * 3, x + nx * 3, y + ny * 3, CREAM, t === 5 ? 0.95 : 0.6, t === 5 ? 1.4 : 1); }
    glow(CREAM, () => dot(cx + dx * 5, cy + dy * 5, 2.4, CREAM, 1));
    glow(CREAM, () => { const px = cx + dx, py = cy + dy; line(cx, cy, px, py, CREAM, 1, 1.6);
      poly([[px - 6 * Math.cos(ang - 0.45), py - 6 * Math.sin(ang - 0.45)], [px, py], [px - 6 * Math.cos(ang + 0.45), py - 6 * Math.sin(ang + 0.45)]], CREAM, 1, 1.5); });
    [1, 2].forEach(t => dot(cx - dx * t * 0.9, cy - dy * t * 0.9 + 2 * t, 2.8, GOLD, 1.05 - 0.2 * t));   // C22: brighter
    glow(CREAM, () => dot(cx, cy, 2.2, CREAM, 1));
    const off = (Math.hypot(lat, vert) * 5).toFixed(1);
    glow(CREAM, () => text(off + " m", 146, 884, { size: 12, col: CREAM, a: 1 })); mic("off in 5 s", 146, 897, { a: 0.8 });
    head("drift", 24, cy - 8, { a: 0.85 }); rv("lat", sg(lat), xg - 16, cy - 7, "right"); rv("vert", sg(vert), cx - 6, 997, "right"); }

  /* ======================= RIGHT WING (C6): ship schematic, metric tesseract, life corner ======================= */
  const CX = 1980, CY = 956;
  // C10A: ship / hull 98 labels kept where C10 put them
    // C17: dropped 24 px clear of the fuel stack and tied to the drive by a dotted leader
    head("ship", 1546, 926); mic("hull", 1546, 939, { a: 0.8 }); text("98", 1546 + W("hull", 9) + 5, 939, { size: 10, col: CREAM, a: 0.95 });
    poly([[1546 + W("ship", 10) + 6, 922.5], [1592, 922.5], [1606, 905]], CREAM, 0.75, 1.1); dot(1606, 905, 1.8, CREAM, 0.95);   // C18: solid cream leader + end dot

  // C10A: the circled group. Voidship side view (traced from js/ship/voidship-art.js HULL ENGINE BRIDGE W_FAR W_NEAR KEEL CANOPY T1 T2
  // and voidship-prow.js UPPER LOWER GRIND + the ring at RING_U 0.68), then the hull stress profile on the same x, then p / rh above the blade.
  { const ld = Object.fromEntries(D.loads), L = 142, X = 1608 + 0.52 * L, Y = 874;
    const P = ([u, v]) => [X + u * L, Y + v * L], S = pts => pts.map(P);
    const ol = (pts, a = 0.8, w = 1.1, close = false) => glow(GOLD, () => poly(S(pts), GOLD, a, w, close));
    // hull body and drive
    ol([[0.36, -0.13], [0.26, -0.13], [-0.04, -0.125], [-0.36, -0.125], [-0.36, 0.115], [-0.04, 0.115], [0.26, 0.10], [0.36, 0.10]], 0.8, 1.1, false);
    ol([[-0.36, -0.10], [-0.45, -0.10], [-0.52, -0.08], [-0.52, 0.07], [-0.45, 0.09], [-0.36, 0.09]], 0.8, 1.1);   // C11: slim drive, narrower than the hull
    poly(S([[-0.49, -0.085], [-0.49, 0.075]]), GOLD, 0.3);                                        // drive bell lip
    // top fin (far wing) above the hull, bottom fin (near wing) below it
    ol([[0.064, -0.125], [-0.16, -0.28], [-0.47, -0.31], [-0.42, -0.10]], 0.75, 1.1);
    ol([[0.121, 0.115], [-0.14, 0.35], [-0.30, 0.355], [-0.48, 0.37], [-0.42, 0.09]], 0.75, 1.1);
    // bridge, canopy slit, turrets, keel
    poly(S([[-0.02, -0.125], [-0.08, -0.205], [-0.28, -0.205], [-0.32, -0.125]]), GOLD, 0.6, 1);
    poly(S([[0.30, -0.13], [0.30, -0.104], [0.36, -0.095]]), GOLD, 0.45); poly(S([[0.10, -0.125], [0.10, -0.15], [0.16, -0.15], [0.16, -0.125]]), GOLD, 0.45);
    poly(S([[0.34, 0.10], [0.335, 0.17], [0.195, 0.17], [0.135, 0.125]]), GOLD, 0.55);
    // the blade: one clean outline from the hull joint to the tip, its grind line, the ring edge-on round it
    glow(GOLD, () => poly(S([[0.36, -0.12], [1.10, -0.12], [1.22, -0.105], [1.30, -0.085], [1.25, -0.04], [1.17, 0.01], [1.07, 0.05], [0.95, 0.075], [0.80, 0.085], [0.36, 0.085]]), GOLD, 0.95, 1.3));
    poly(S([[0.40, -0.01], [1.10, -0.01], [1.22, -0.05], [1.28, -0.08]]), GOLD, 0.25); poly(S([[1.10, -0.12], [1.10, -0.01]]), GOLD, 0.3);   // C11: 0.94 L blade, a fat hunting knife
    { const [rx, ry] = P([0.68, -0.015]); c.save(); c.translate(rx, ry); c.scale(0.03 / 0.13, 1); arc(0, 0, 0.13 * L, PI / 2 + 0.8, PI / 2 - 0.8 + 2 * PI, GOLD, 0.75, 1.3 / (0.03 / 0.13) > 3 ? 1.1 : 1.1); c.restore(); }   // C15: ring open +-0.8 rad at its bottom so the ring notch crosses a gap
    // fin 93: tied to the top fin's corner
    { const x0 = 1619, y = 826;   // C14: "fin 93" sits on the top fin's upper edge, starting at its tip (1615, 830), 4-8 px above the edge; no leader
      mic("fin", x0, y, { a: 0.8 }); text("93", x0 + W("fin", 9) + 4, y, { size: 10, col: CREAM, a: 0.95 }); }
    // p and rh: one row above the blade, each read right of its glyph
    { const y = 836, gc = 832; let x = 1700;   // C15: row pulled left into the gap fin 93 left (was 1688 + fin 93 width + 16)
      const R = 7, px = x + R, rp = R + (+D.p - 101.3) * 4; x += 2 * R + 4;
      arc(px, gc, R, 0, 2 * PI, GOLD, 0.35, 1, [1, 2]); glow(GOLD, () => arc(px, gc, rp, 0, 2 * PI, GOLD, 0.85, 1.2)); dot(px, gc, 1.2, GOLD, 0.6);
      mic("p", x, y); text(D.p, x + W("p", 9) + 4, y, { size: 10, col: GOLD, a: 0.95 }); x += W("p", 9) + 4 + W(D.p, 10) + 16;
      const r = 5, dx = x + r, dy = 836, tip = 823, bot = dy + r;
      poly([[dx - r * Math.cos(rad(30)), dy - r * Math.sin(rad(30))], [dx, tip], [dx + r * Math.cos(rad(30)), dy - r * Math.sin(rad(30))]], GOLD, 0.6);
      arc(dx, dy, r, rad(-30), rad(210), GOLD, 0.6);
      const lvl = bot - (bot - tip) * D.rhv; for (let yy = bot - 2; yy > tip + 2; yy -= 2) { const h = yy > dy - r * 0.5 ? Math.sqrt(Math.max(0, r * r - (yy - dy) * (yy - dy))) - 1.5 : (yy - tip) * 0.55 - 1;
        if (h > 0.5) line(dx - h, yy + 0.5, dx + h, yy + 0.5, GOLD, yy >= lvl ? 0.7 : 0.1); }
      x += 2 * r + 5; mic("rh", x, y); text("41", x + W("rh", 9) + 4, y, { size: 10, col: GOLD, a: 0.95 }); }
    // hull stress along the length, same x as the ship: 0 at y B0, the limit (1.0) at y B1
    { const B0 = 963, B1 = 938, u0 = -0.52, u1 = 1.30, g = (u, m, s, a) => a * Math.exp(-((u - m) * (u - m)) / (2 * s * s));
      const st = u => Math.max(0.04, 0.22 + g(u, -0.32, 0.06, 0.28) + g(u, -0.08, 0.11, 0.45) + g(u, 0.36, 0.05, 0.62) + g(u, 0.68, 0.035, 0.30) - 0.2 * Math.max(0, u - 0.8) / 0.34);
      const ys = u => B0 - (B0 - B1) * st(u), pts = []; for (let u = u0; u <= u1 + 1e-6; u += 0.01) pts.push([X + u * L, ys(u)]);
      line(X + u0 * L, B0 + 0.5, X + u1 * L, B0 + 0.5, GOLD, 0.25);
      dash([3, 3], () => line(X + u0 * L, B1 + 0.5, X + u1 * L, B1 + 0.5, CREAM, 0.5));
      mic("lim", X + u1 * L, B1 - 5, { a: 0.75, align: "right" });
      glow(GOLD, () => poly(pts, GOLD, 0.9, 1.2));
      let pk = u0; for (let u = u0; u <= u1; u += 0.005) if (st(u) > st(pk)) pk = u;
      const [kx, ky] = [X + pk * L, ys(pk)]; glow(CREAM, () => dot(kx, ky, 2, CREAM, 1));
      // C12: "84 %" beside the peak dot; the strip's own label at its left end; no kW tags (the bus rail shows them)
      num(Math.round(st(pk) * 100) + " %", kx + 6, B1 - 5, { size: 11 });   // C14: readout baseline on the lim line, same baseline as "lim" (B1 - 5)
      head("hull stress", X + u0 * L - 16, B0 - 4, { align: "right", a: 0.85 });
      // C12: the strip tied to the ship. Blade joint (the peak): cream accent on the outline + a dotted drop to the peak dot;
      // drive mount, wing root, ring clamp: faint ticks on the hull's lower outline, each above its own peak
      glow(CREAM, () => { poly(S([[0.30, -0.13], [0.36, -0.13], [0.36, -0.12], [0.44, -0.12]]), CREAM, 0.95, 1.7);
        poly(S([[0.30, 0.10], [0.36, 0.10], [0.36, 0.085], [0.44, 0.085]]), CREAM, 0.95, 1.7); });
      dash([1, 3], () => line(kx + 0.5, Y + 0.10 * L + 3, kx + 0.5, ky - 4, CREAM, 0.55));
      [[-0.32, 0.115], [-0.08, 0.115], [0.68, 0.085]].forEach(([u, v]) => { const x = Math.round(X + u * L) + 0.5, y = Y + v * L; glow(CREAM, () => line(x - 0.5, y - 3.5, x - 0.5, y + 4.5, CREAM, 0.95, 2)); });   // C16: one notch style: 3.5 px in, 4.5 px out, same width and alpha; x as C15; ring gap kept
    }
  }

  // life fan (points 1 + 4): o2 and co2 slit arcs separated (90 / 62); o2 read beside its foot, co2 inside the fan
  { const rows = [["o2", D.o2v, 90], ["co2", D.co2v, 62]];
    rows.forEach(([k, v, r]) => { const n = Math.max(6, Math.floor(r * PI / 2 / 4)), lit = Math.round(v * n);
      for (let j = 0; j < n; j++) { const d = 180 + (j + 0.5) / n * 90, on = j < lit, [xa, ya] = pol(CX, CY, r - 3, d), [xb, yb] = pol(CX, CY, r + 3, d);
        line(xa, ya, xb, yb, GOLD, on ? (j === lit - 1 ? 0.9 : 0.6) : 0.12); }
      const [ex, ey] = pol(CX, CY, r + 6, 180 + 90 * v), [ix, iy] = pol(CX, CY, r + 10, 180 + 90 * v); line(ex, ey, ix, iy, CREAM, 0.95);
      line(CX - r + 0.5, CY + 3, CX - r + 0.5, CY + 6, GOLD, 0.5); });
    // C7: o2 and co2 each read under its own arc foot, on one row below the fan's base, leaders straight down
    line(CX - 90 + 0.5, CY + 6, CX - 90 + 0.5, 980, GOLD, 0.35); line(CX - 62 + 0.5, CY + 6, CX - 62 + 0.5, 980, GOLD, 0.35);
    { const w = W((+D.o2).toFixed(1), 11); mic("o2", 1886 - w - 4, 994, { align: "right", col: CREAM, a: 0.9 }); num((+D.o2).toFixed(1), 1886, 994, { align: "right", size: 11 }); }
    mic("co2", 1906, 994, { col: CREAM, a: 0.9 }); num(D.co2, 1906 + W("co2", 9) + 4, 994, { size: 11 });
    arc(CX, CY, 97, rad(184), rad(266), GOLD, 0.12, 1, [1, 3]);
    line(CX - 96, CY + 0.5, CX - 2, CY + 0.5, GOLD, 0.18);
    head("life", 1976, 858, { align: "right", a: 0.85 });
  }

  // C9: the faint red tick left of the "gravity flips sign" log line is in the base screenshot; cover it with the terminal's void colour so the HUD is all gold
  // C16 right bank (ship systems): two rows under the hull stress strip
  { const S = [["drv 1", 1], ["drv 2", 1], ["drv 3", 0], ["drv 4", 0], ["ring", 0], ["fin t", 0], ["fin b", 0],
               ["bus", 0], ["cell", 1], ["cool", 0], ["lsp", 1], ["seal", 0], ["nav", 1], ["jnt", 2]];   // C19: jnt to the outer corner, under dark fin b   // C18: 7 + 7 (rcs dropped), jnt on row 2 so its rays clear the hull strip; rows lifted 981/996 -> 978/992
    S.forEach(([s, st], i) => lamp(1440 + (i % 7) * 56, i < 7 ? 975 : 989, s, st, "o")); }   // C19: rows 978/992 -> 975/989
  if (!new URLSearchParams(location.search).get('bare')) { c.save(); c.fillStyle = "rgb(13,15,17)"; c.fillRect(792, 933, 6, 18); c.restore(); }
  // C16: base log line 1 ("the uncertainty of reality itself") replaced by a real detection line
  if (!new URLSearchParams(location.search).get('bare')) { c.save(); c.fillStyle = "rgb(14,14,18)"; c.fillRect(796, 899, 366, 15); c.restore();
    text("> entering the void \u2014 chaos 1.00 \u00b7 incoherent field detected", 800, 911, { size: 10, col: GREY, a: 0.8, ls: 0.6 }); }

  /* outside row (C9: labels at y 980, 29 px to the frame bottom, glyphs shrunk again; C8: labels at y 987, 22 px of air above the frame bottom; glyphs shrunk to fit between the floor and the labels; rad trefoil outline-only) */
  { const yF = FL + 1, LY = 987, lv = (k, v, cx) => { mic(k, cx, LY, { align: "center" }); text(v, cx, LY + 13, { size: 10, col: CREAM, a: 0.95, align: "center" }); };   // C17: key over value
    lab("outside", 572, LY, { col: CREAM, a: 0.7, size: 9 });   // C18: on the key row, off the .001 line
    // rad: radiation trefoil, outline only (three 60 deg blades, stroked like the g dial's lit arc), dotted limit ring (1.0); no red tick
    { const cx = 642, cy = 965.5, ri = 2, ro = 6;
      [270 - 60, 270 + 60, 90].forEach(m => { c.beginPath(); c.arc(cx, cy, ro, rad(m - 30), rad(m + 30)); c.arc(cx, cy, ri, rad(m + 30), rad(m - 30), true); c.closePath();
        c.strokeStyle = rgba(GOLD, 0.85); c.lineWidth = 1.2; c.lineJoin = "round"; c.stroke(); });
      dot(cx, cy, 1.2, CREAM, 0.9); arc(cx, cy, 6.8, 0, 2 * PI, GOLD, 0.12, 1, [1, 2]);
      lv("rad", D.dose, cx); }
    // g: pull arrow up -0.40 g, its flipped twin dotted, outer arc filled 56 % toward the next flip (every 2.5 s)
    { const cx = 698, cy = 968.5, r = 5.5, a = 0.4 * 13;
      line(cx + 0.5, yF, cx + 0.5, cy - r - 2, GOLD, 0.3);
      arc(cx, cy, r, 0, 2 * PI, GOLD, 0.3); arc(cx, cy, r + 2, 0, 2 * PI, GOLD, 0.12, 1, [1, 2]);
      glow(GOLD, () => arc(cx, cy, r + 2, rad(-90), rad(-90 + 0.56 * 360), GOLD, 0.85, 1.5));
      glow(CREAM, () => { line(cx + 0.5, cy, cx + 0.5, cy - a, CREAM, 1, 1.5); poly([[cx - 3, cy - a + 3], [cx + 0.5, cy - a - 1], [cx + 4, cy - a + 3]], CREAM, 1, 1.2); });
      dash([1, 2], () => { line(cx + 0.5, cy, cx + 0.5, cy + a, GOLD, 0.5); poly([[cx - 3, cy + a - 3], [cx + 0.5, cy + a + 1], [cx + 4, cy + a - 3]], GOLD, 0.5); });
      dot(cx, cy, 1.6, CREAM, 0.9); lv("g", "-0.40", cx); }
    // skin temp: column -100..+100 C, zero tick, lit to -38
    { const cx = 752, y0 = 971, y1 = 959, n = 8, H = y0 - y1, f = (-38 + 100) / 200, lit = Math.round(f * n);
      line(cx + 0.5, yF, cx + 0.5, y1 - 1, GOLD, 0.3);
      for (let i = 0; i < n; i++) { const y = Math.round(y0 - i * H / (n - 1)) + 0.5; line(cx - 3, y, cx + 4, y, GOLD, i < lit ? (i === lit - 1 ? 0.95 : 0.65) : 0.12); }
      const yz = Math.round(y0 - H / 2) + 0.5; line(cx - 8, yz, cx - 4, yz, GOLD, 0.6); mic("0", cx - 10, yz + 3, { align: "right", a: 0.7 });
      const ym = y0 - f * H; poly([[cx + 11, ym - 3], [cx + 7, ym], [cx + 11, ym + 3]], CREAM, 0.95, 1.2);
      lv("ext", D.hullT, cx); }   // C16: skin -> ext (outside temperature), left floor
  }

  /* ---------- C24 centre: the log alone (C23 track dropped). Floor bridges the gap; 4 older lines stand on it, the newest sits on the deck under it. ---------- */
  { const bare = new URLSearchParams(location.search).get('bare');
    if (!bare) { c.save(); const g = c.createLinearGradient(0, 892, 0, 1006); g.addColorStop(0, "rgb(16,18,22)"); g.addColorStop(1, "rgb(13,17,20)");
      c.fillStyle = g; c.fillRect(786, 892, 428, 114); c.restore(); }   // sketch only: erase the base shot's DOM log + track
    line(777, FL + 0.5, 1224, FL + 0.5, GOLD, STRUCT);   // the wings' floor, now one line across
    const L = [["entering the void \u2014 chaos 1.00 \u00b7 incoherent field detected", ">"], ["span ranged 408,000 m \u00b7 both ends unlit", ">"],
      ["gravity flips sign every 2.5s", "!"], ["beacon read \u00b7 The Nephilim \u00b7 10 of 17", ">"]];
    L.forEach(([t, k], i) => { const y = 905 + i * 15, a = [0.38, 0.5, 0.64, 0.8][i];
      text(k, 792, y, { size: 10, col: k === "!" ? CREAM : GOLD, a }); text(t, 806, y, { size: 10, col: GREY, a, ls: 0.4 }); });
    glow(CREAM, () => { text(">", 792, 986, { size: 13, col: GOLD, a: 1 });
      const w = text("next signal: The Shattered \u00b7 9 km west", 808, 986, { size: 13, col: CREAM, a: 1, ls: 0.3 });
      line(810 + w, 988.5, 818 + w, 988.5, CREAM, 0.9, 1.5); });   // caret
    mic("now", 1208, 986, { a: 0.55, align: "right" }); }

  /* ---------- C25 top: one slim line = the whole span (408 km, CAM.min..CAM.max). Unseen beacons are ticks, seen ones faint dots, "you" under the line,
     the nearest unseen tick brighter with its distance. Data as C23 (pins + you read off the base shot: 10 read, 7 unread, you at 228 km). ---------- */
  { const SPAN = 408, P = x => (x - 789) / 428, X0 = 200, X1 = 1800, Y = 88, X = p => Math.round(X0 + p * (X1 - X0)) + 0.5;
    const READ = [807, 826, 839, 843, 847, 859, 909, 1152, 1170, 1216].map(P), UNREAD = [850, 854, 1019, 1075, 1118, 1161, 1177].map(P), YOU = P(1028.5);
    const near = UNREAD.reduce((b, p) => Math.abs(p - YOU) < Math.abs(b - YOU) ? p : b, UNREAD[0]);
    line(X0, Y + 0.5, X1, Y + 0.5, GOLD, 0.75, 1.5);                                 // the span
    [X0, X1].forEach(x => line(x + 0.5, Y - 5, x + 0.5, Y + 6, GOLD, 0.95, 2));     // its two ends
    READ.forEach(p => dot(X(p), Y + 0.5, 1.7, GOLD, 0.6));                            // seen: barely there
    UNREAD.forEach(p => { if (p !== near) line(X(p), Y - 9, X(p), Y, GOLD, 1, 2); });   // unseen: a tick each
    const xn = X(near), xy = X(YOU);
    glow(CREAM, () => { line(xn, Y + 1, xy, Y + 1, CREAM, 0.95, 2.5); });             // cue: the stretch from you to the next one, lit cream
    text(Math.round(Math.abs(near - YOU) * SPAN) + " km", (xn + xy) / 2, Y + 18, { size: 11, col: CREAM, a: 1, align: "center" });
    glow(CREAM, () => { line(xn, Y - 14, xn, Y + 2, CREAM, 1, 2.5); });               // the next one: tallest, brightest
    glow(CREAM, () => { line(xy, Y - 9, xy, Y + 10, CREAM, 1, 2.5); dot(xy, Y + 0.5, 4, CREAM, 1); });   // you: a cream pin through the line
    mic("you", xy + 8, Y - 5, { a: 0.9, col: CREAM }); }
};
