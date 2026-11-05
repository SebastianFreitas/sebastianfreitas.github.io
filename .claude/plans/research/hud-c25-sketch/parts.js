/* instrument painters shared by the four layouts */
window.P = (function () {
  const { line, poly, arc, dot, pip, lbl, val, hero, text, D, slitCol, rgba, GOLD, CREAM, GREY, RED, REDT, A } = K;
  const c = () => K.ctx();
  /* radar sector: rings by range, bearing ticks, sweep, contacts, nearest callout */
  function radar(cx, cy, R, a0, a1, o = {}) {
    [1 / 3, 2 / 3, 1].forEach((f, i) => arc(cx, cy, R * f, a0, a1, GOLD, i === 2 ? 0.45 : 0.22));
    for (let d = 0; d < 360; d += 5) {
      const a = d * Math.PI / 180; if (!inA(a, a0, a1)) continue;
      const L = d % 30 === 0 ? 8 : 3;
      line(cx + Math.cos(a) * R, cy + Math.sin(a) * R, cx + Math.cos(a) * (R + L), cy + Math.sin(a) * (R + L), GOLD, d % 30 ? 0.22 : 0.45);
    }
    const sw = o.sweep != null ? o.sweep : -0.35;
    for (let i = 1; i < 6; i++) { const a = sw - i * 0.05; if (inA(a, a0, a1)) line(cx, cy, cx + Math.cos(a) * R, cy + Math.sin(a) * R, GOLD, 0.3 * (1 - i / 6)); }
    line(cx, cy, cx + Math.cos(sw) * R, cy + Math.sin(sw) * R, GOLD, 0.85);
    D.blips.forEach((b, i) => {
      const x = cx + b[0] * R, y = cy + b[1] * R;
      dot(x, y, i ? 1.8 : 2.4, i ? GREY : CREAM, i ? 0.7 : 1);
      if (!i) arc(x, y, 6, 0, 6.2832, CREAM, 0.7);
    });
    cross(cx, cy, 5, 0.6); dot(cx, cy, 1.5, CREAM, 1);
  }
  const cross = K.cross;
  function inA(a, a0, a1) { const T = 6.2832; let x = ((a - a0) % T + T) % T; return x <= ((a1 - a0) % T + T) % T + 1e-6 || a1 - a0 >= T - 1e-6; }
  /* the pull: a ring, beacons in range as dots, the ball eased toward its pull, chevrons for the drift */
  function pull(cx, cy, R, o = {}) {
    if (!o.noRing) arc(cx, cy, R, 0, 6.2832, GOLD, 0.35);
    arc(cx, cy, R * 0.5, 0, 6.2832, GOLD, 0.12, 1, [2, 4]);
    [[-0.25, 0.05], [0.1, 0.05]].forEach(b => { arc(cx + b[0] * R, cy + b[1] * R, 2.2, 0, 6.2832, GREY, 0.7); });
    const bx = cx + D.ball[0] * R, by = cy + D.ball[1] * R;
    line(cx, cy, bx, by, GOLD, 0.3);
    arc(bx, by, o.ballR || 7, 0, 6.2832, CREAM, 0.95, 1.5);
    const hx = D.ball[0], hy = D.ball[1], l = Math.hypot(hx, hy), ux = hx / l, uy = hy / l;
    for (let k = 0; k < 2; k++) { const px = bx + ux * (12 + k * 6), py = by + uy * (12 + k * 6);
      poly([[px - uy * 4 - ux * 3, py + ux * 4 - uy * 3], [px, py], [px + uy * 4 - ux * 3, py - ux * 4 - uy * 3]], GOLD, 0.7 - k * 0.3); }
  }
  /* signal spectrum as thin tick columns rising from a baseline */
  function spectrum(x, yB, n, h, step = 4) {
    for (let i = 0; i < n; i++) { const v = D.spectrum[i % 32]; line(x + i * step + 0.5, yB, x + i * step + 0.5, yB - v * h, GOLD, 0.55 + 0.4 * v); }
  }
  /* resonance graph: log Y up the axis at xA, time along the floor; clipped to the allowed area */
  function resonance(x0, xA, yF, yT, o = {}) {
    const H = yF - yT, yv = v => yF - K.resF(v) * H;
    c().save(); K.clipAllowed();
    [0.01, 0.1, 1].forEach(v => line(x0, Math.round(yv(v)) + 0.5, xA, Math.round(yv(v)) + 0.5, GOLD, 0.1));
    line(x0, Math.round(yv(0.6)) + 0.5, xA, Math.round(yv(0.6)) + 0.5, GREY, 0.5, 1);
    const pts = [], N = 120;
    for (let i = 0; i <= N; i++) { const t = i / N; const n = Math.sin(i * 0.35) * 0.6 + Math.sin(i * 0.93) * 0.4;
      const v = 0.0013 + 0.00022 * n + 0.08 * Math.pow(t, 14);
      pts.push([x0 + t * (xA - x0 - 4), yv(v)]); }
    poly(pts, GOLD, 0.95, o.w || 1.5);
    c().restore();
    const hd = pts[pts.length - 1]; dot(hd[0], hd[1], 2.5, CREAM, 1);
    line(xA + 0.5, yF, xA + 0.5, yT, GOLD, 0.55); poly([[xA - 3, yT + 6], [xA + 0.5, yT], [xA + 4, yT + 6]], GOLD, 0.55);
    [[0.001, ""], [0.01, ".01"], [0.1, ".1"], [1, "1"]].forEach(([v, s]) => { line(xA, yv(v), xA + 5, yv(v), GOLD, 0.55); if (s) lbl(s, xA + 13, yv(v) + 3, { size: 9, a: 0.6 }); });
    lbl("nomic", xA + 13, yv(0.6) + 3, { size: 9, a: 0.6 });
    return { hd, yv };
  }
  /* fuel: thick calm bar (drains toward its far end), a 10 s notch, the thrust as a heat comb beside it */
  function fuelBar(x, y, len, o = {}) {
    const dir = o.dir || 1, lit = len * D.fuel, f10 = len * D.fuel10;
    line(x, y, x + dir * len, y, GOLD, 0.2, 1);
    c().fillStyle = rgba(GOLD, 0.75); c().fillRect(Math.min(x, x + dir * lit), y - 1.5, lit, 3);
    const nx = x + dir * f10; line(nx + 0.5, y - 6, nx + 0.5, y + 6, CREAM, 0.95);
  }
  /* fuel: a level axis standing at the bend (lit 1.5 px to the level, cream pointer, 100 at the top)
     and the burn record along the floor: a heat comb whose ticks rise with thrust (cream when hot),
     newest beside the axis, older toward x1, with its trace on top */
  function fuel(xA, yF, yT, x1, o = {}) {
    const H = yF - yT, yv = v => yF - v * H, dir = x1 > xA ? 1 : -1, side = -dir, hB = o.hB || 24, g0 = o.gap || 10;
    c().save(); K.clipAllowed();
    line(xA, yF + 0.5, x1, yF + 0.5, GOLD, 0.45);
    c().setLineDash([1, 3]); line(xA + dir * g0, yF - hB + 0.5, x1, yF - hB + 0.5, GOLD, 0.25); c().setLineDash([]);
    const L = Math.abs(x1 - xA) - g0, n = D.thr.length;
    const at = t => { const f = t * (n - 1), i = Math.floor(f), r = f - i; return D.thr[Math.min(n - 1, i)] * (1 - r) + D.thr[Math.min(n - 1, i + 1)] * r; };
    const pts = [];
    for (let s = 0; s <= L; s += 4) { const v = at(1 - s / L), x = Math.round(xA + dir * (g0 + s)) + 0.5;
      line(x, yF, x, yF - v * hB, v > 0.7 ? CREAM : GOLD, 0.18 + 0.6 * v); pts.push([x, yF - v * hB]); }
    poly(pts, GOLD, 0.9, 1);
    c().restore();
    line(xA + 0.5, yF, xA + 0.5, yT, GOLD, 0.45);
    [0, 0.25, 0.5, 0.75, 1].forEach(v => line(xA, Math.round(yv(v)) + 0.5, xA + side * (v % 0.5 ? 3 : 6), Math.round(yv(v)) + 0.5, GOLD, 0.55));
    line(xA + 0.5, yF, xA + 0.5, yv(D.fuel), GOLD, 0.95, 1.5);
    const yl = Math.round(yv(D.fuel)) + 0.5;
    poly([[xA + side * 11, yl - 4], [xA + side * 4, yl], [xA + side * 11, yl + 4]], CREAM, 0.95, 1.5);
    lbl("100", xA + side * 14, yv(1) + 3, { size: 9, a: 0.6, align: side < 0 ? "right" : "left" });
    dot(pts[0][0], pts[0][1], 2.5, CREAM, 1);
    return { yv, yl, head: pts[0] };
  }
  function ellipseHull(cx, cy, w, h, o = {}) {
    c().strokeStyle = rgba(GOLD, 0.6); c().lineWidth = 1;
    c().beginPath(); c().moveTo(cx - w / 2, cy); c().quadraticCurveTo(cx - w / 4, cy - h, cx + w / 2 - 6, cy - h * 0.35); c().lineTo(cx + w / 2, cy);
    c().lineTo(cx + w / 2 - 6, cy + h * 0.35); c().quadraticCurveTo(cx - w / 4, cy + h, cx - w / 2, cy); c().stroke();
    [-0.25, 0, 0.25].forEach(f => line(cx + f * w + 0.5, cy - h * 0.55, cx + f * w + 0.5, cy + h * 0.55, GOLD, 0.3));
    line(cx - w / 2 - 8, cy + 0.5, cx + w / 2 + 8, cy + 0.5, GOLD, 0.15);
  }
  function spark(x, y, w, h, arr, col = GOLD, a = 0.85, lo, hi) {
    lo = lo != null ? lo : Math.min(...arr); hi = hi != null ? hi : Math.max(...arr);
    poly(arr.map((v, i) => [x + i / (arr.length - 1) * w, y + h - (v - lo) / (hi - lo || 1) * h]), col, a, 1);
  }
  return { fuel, radar, pull, spectrum, resonance, fuelBar, ellipseHull, spark, inA };
})();
