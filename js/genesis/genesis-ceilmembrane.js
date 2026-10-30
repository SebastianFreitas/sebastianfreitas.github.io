// Genesis ceiling: the navy lobe cloud's body as one eldritch membrane. Five seeded painters: bundle (strips drawn into a pinch below the band, then fanned down),
// B4 (nested sagging pleats: nested lobes with offset centres, one ring in front on the left and behind on the right), strand (long swelling strands on steep
// S-curves that cross), slab (heavy leaning columns of staggered length) and split (one tall body cracked down its lower half, the right half slid out).
// build(kind, x, y, w, h, seed) fits the body into the box (x, y, w, h) in the cloud's own px (unmirrored) and returns { p, ops, creases }: p = the one connected
// silhouette (hit tests, bounds, hang points), ops = fills and rims in paint order as Path2D, creases = fold lines that fade out inside the body.
// draw(ctx, m, rimEnd) paints it, clipped to p. Near-black fill, cold navy rims and ocean-blue fold lines.
(function () {
  const D0 = "#03050a", D1 = "#060a14", D2 = "#0a1222", D3 = "#0e1a33";
  const NAVY = "#1d3f80", OCEAN = "#3f86b5", PALE = "#8cc4dc";

  function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function poly(pts, close) {
    const p = new Path2D();
    for (let i = 0; i < pts.length; i++) p[i ? 'lineTo' : 'moveTo'](pts[i][0], pts[i][1]);
    if (close) p.closePath();
    return p;
  }
  function addLine(p, pts) { for (let i = 0; i < pts.length; i++) p[i ? 'lineTo' : 'moveTo'](pts[i][0], pts[i][1]); }
  const sm = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
  const bez = (a, b, c, d, t) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d;

  // a ribbon along centre line cl(t) -> [x, y] with half width hw(t), n steps; returns the closed outline in px
  function ribbon(M, cl, hw, n) {
    const L = [], R = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, c = cl(t), a = cl(Math.max(0, t - 0.01)), b = cl(Math.min(1, t + 0.01));
      let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const w = hw(t);
      L.push(M(c[0] - dy * w, c[1] + dx * w)); R.push(M(c[0] + dy * w, c[1] - dx * w));
    }
    return L.concat(R.reverse());
  }
  // adds a filled, rimmed shape (closed outline in px) to the painter's ops and silhouette
  function shape(c, pts, color) {
    const f = poly(pts, true);
    c.sil.addPath(f); c.ops.push({ fill: f, rim: f, color, clip: null });
  }
  function drape(c, M, x, yb, j, col) {
    const top = [], tn = 12;
    for (let i = 0; i <= tn; i++) top.push(M(x * (-1 + 2 * i / tn), -12));
    for (let i = tn; i >= 0; i--) top.push(M(x * (-1 + 2 * i / tn), yb + 14 * Math.sin(i * 1.7 + j)));
    shape(c, top, col);
  }

  // bundle: six strips drawn into a pinch at 62% of the body, then fanned downward from it; strips start nearly straight down and flare, hems end in steep points
  function bundle(r, M) {
    const N = 6, X = [], ops = [], creases = [], sil = new Path2D(), WY = 140, YE = 215;   // the pinch sits low in the body so the flared blades, not just their tips, hang below the band
    for (let i = 0; i <= N; i++) X.push(-140 + i * 280 / N);
    const ex = (i, y) => {
      if (y < WY) return 4 + (X[i] - 4) * (1 - 0.82 * sm((y + 10) / (WY + 10)));
      const v = (y - WY) / (YE - WY); return 4 + X[i] * (0.18 + 0.82 * Math.pow(v, 1.25)) + 5 * Math.sin(v * 4 + i);
    };
    for (let i = 0; i < N; i++) {
      const len = 176 + (i % 3) * 14 + 8 * Math.sin(i * 3.1 + r()), l = [], rr = [];
      for (let s = 0; s <= 34; s++) { const y = -10 + (len + 10) * s / 34; l.push(M(ex(i, y), y)); rr.push(M(ex(i + 1, y), y)); }
      const tip = M((ex(i, len) + ex(i + 1, len)) / 2 + (i % 2 ? 1.5 : -1.5), len + 30 + 8 * (i % 2));
      const body = poly(l.concat([tip], rr.slice().reverse()), true), rim = new Path2D();
      addLine(rim, l); addLine(rim, [tip]);
      sil.addPath(body); ops.push({ fill: body, rim, color: i % 3 === 1 ? D2 : (i % 2 ? D0 : D1), clip: null });
    }
    creases.push({ pts: [M(-70, 30), M(-45, 80), M(-30, 120)], col: PALE }, { pts: [M(40, 140), M(60, 175), M(75, 205)], col: OCEAN });
    return { p: sil, ops, creases };
  }

  // B4: four nested sagging lobes (offset centres, wobbly edges); lobe 2 in front of lobe 3 on the left and behind it on the right
  function B4(r, M) {
    const R = [150, 118, 88, 58], dy = [0, 14, 22, 40], dx = [0, 18, -14, 12], fills = [D1, D2, D0, D3], lobes = [], rims = [], full = [], ops = [], creases = [], sil = new Path2D();
    const ph = r() * 6;
    for (let k = 0; k < 4; k++) {
      const o = [];
      for (let i = 0; i <= 60; i++) { const a = Math.PI * i / 60, w = 1 + 0.09 * Math.sin(5 * a + k * 1.9 + ph) + 0.05 * Math.sin(9 * a + k);
        o.push([dx[k] + Math.cos(a) * R[k] * w, dy[k] - 6 + Math.sin(a) * (R[k] * 0.62) * w]); }
      const pts = o.map((q) => M(q[0], q[1]));
      pts.unshift(M(o[0][0], -12)); pts.push(M(o[o.length - 1][0], -12));
      lobes.push(pts);
      full.push(poly(pts, true));
      const rim = new Path2D(); addLine(rim, pts); rims.push(rim);   // the sides run up with the lobe
      sil.addPath(full[k]);
    }
    const at = (k, clip) => ops.push({ fill: full[k], rim: rims[k], color: fills[k], clip });
    const cx0 = M(0, 0)[0], big = 1e4;
    at(0, null); at(1, null); at(3, null); at(2, null);
    at(2, { x: cx0 - big, w: big, y: -big, h: 2 * big });
    at(2, { x: cx0, w: big, y: -big, h: 2 * big }); at(3, { x: cx0, w: big, y: -big, h: 2 * big });
    creases.push({ pts: [M(0, 30), M(5, 60), M(-2, 95)], col: PALE });
    for (let k = 1; k < 4; k++) creases.push({ pts: lobes[k].slice(12 + k * 4, 26 + k * 4), col: PALE });
    return { p: sil, ops, creases };
  }

  // strand: five long strands hang from a drape, each a swelling spindle on a steep S-curve; neighbours cross, a short wedge hangs between them, all end in sharp points
  function strand(r, M) {
    const c = { ops: [], sil: new Path2D() }, creases = [], j = r() * 6;
    drape(c, M, 120, 60, j, D1);
    const S = [
      { x: -105, dx: 22, y1: 214, w: 17, c: D2 }, { x: -50, dx: -30, y1: 196, w: 21, c: D0 }, { x: 8, dx: 34, y1: 226, w: 24, c: D3 },
      { x: 62, dx: -34, y1: 202, w: 20, c: D1 }, { x: 112, dx: -18, y1: 218, w: 16, c: D2 }];
    S.forEach((s) => {
      shape(c, ribbon(M, (t) => [bez(s.x, s.x + s.dx * 1.6, s.x - s.dx * 0.5, s.x + s.dx, t), 40 + (s.y1 - 40) * t], (t) => s.w * Math.pow(Math.sin(Math.PI * Math.min(1, 0.22 + 0.78 * t)), 0.8) * (1 - 0.15 * t) + 1, 34), s.c);
    });
    shape(c, ribbon(M, (t) => [-20 + 8 * t, 120 + 80 * t], (t) => 9 * (1 - t) ** 0.7 + 1, 18), D3);
    creases.push({ pts: [M(-100, 20), M(-92, 70), M(-84, 110)], col: PALE }, { pts: [M(70, 120), M(66, 150), M(58, 185)], col: OCEAN });
    return { p: c.sil, ops: c.ops, creases };
  }

  // slab: heavy columns of staggered length stand side by side and overlap; each leans steeply, ends in a bent point, and the middle one is split lengthwise by a wedge
  function slab(r, M) {
    const c = { ops: [], sil: new Path2D() }, creases = [], j = r() * 6;
    const cx = [-112, -56, 0, 56, 112], W = [74, 86, 92, 84, 70], L = [196, 224, 206, 230, 190], lean = [14, -16, 12, -14, 10], cols = [D1, D2, D0, D2, D1];
    [0, 4, 1, 3, 2].forEach((k) => {
      const x = cx[k], h = W[k] / 2, yb = L[k], ln = lean[k];
      const px = (u, y) => x + u * h + ln * (y / 220);
      let polys;
      if (k === 2) {
        const g = 0.06;
        polys = [[[[px(-1, -12), -12], [px(g, -12) - 5, -12], [px(g, 120) + 2, 120], [px(g, 160) + 8, yb - 24], [px(-0.4, yb - 14), yb]], cols[k]],
          [[[px(g, -12) + 9, -12], [px(1, -12), -12], [px(1, 110), 110], [px(0.7, yb - 40) + 4, yb - 40], [px(g, 90) + 16, yb + 6]], D2]];
      } else polys = [[[[px(-1, -12), -12], [px(1, -12), -12], [px(1, yb * 0.55), yb * 0.55], [px(0.8, yb - 30), yb - 30], [px(0.15, yb + 18), yb + 18], [px(-0.7, yb - 24), yb - 24], [px(-1, yb * 0.5), yb * 0.5]], cols[k]]];
      polys.forEach(([p, col]) => shape(c, p.map((q) => M(q[0], q[1])), col));
    });
    drape(c, M, 140, 80, j, D1);
    creases.push({ pts: [M(-120, 20), M(-114, 80), M(-106, 130)], col: PALE }, { pts: [M(60, 120), M(56, 160), M(50, 195)], col: OCEAN });
    return { p: c.sil, ops: c.ops, creases };
  }

  // split: one tall hanging body with a single silhouette (broad shoulder narrowing to a point); a steep crack splits its lower half, the right half slid down and out with a gap, and a thin shard hangs in the gap
  function split(r, M) {
    const c = { ops: [], sil: new Path2D() }, creases = [], j = r() * 6;
    const hw = (y) => y < 20 ? 96 : 96 * Math.pow(Math.max(0.0005, 1 - (y - 20) / 214), 0.62) + 3 * Math.sin(y * 0.09 + j);
    const crack = (y) => { const k = 22 - 32 * ((y - 70) / 160); return Math.max(-hw(y) + 4, Math.min(hw(y) - 4, k)); };
    const ys = []; for (let y = 70; y <= 232; y += 6) ys.push(y);
    const up = []; for (let y = -12; y <= 70; y += 6) up.push(y);
    shape(c, up.map((y) => M(-hw(y), y)).concat(up.slice().reverse().map((y) => M(hw(y), y))), D1);
    shape(c, ys.map((y) => M(-hw(y), y)).concat(ys.slice().reverse().map((y) => M(crack(y) - 3, y))), D2);
    shape(c, ys.map((y) => M(crack(y) + 11, y + 12)).concat(ys.slice().reverse().map((y) => M(hw(y) + 9, y + 12))), D0);
    shape(c, ribbon(M, (t) => [crack(100) + 4 - 20 * t, 100 + 110 * t], (t) => 5 * Math.sin(Math.PI * (0.05 + 0.9 * t)) + 1, 20), D3);
    creases.push({ pts: [M(-70, 30), M(-62, 80), M(-52, 125)], col: PALE }, { pts: [M(34, 100), M(40, 140), M(34, 180)], col: OCEAN });
    return { p: c.sil, ops: c.ops, creases };
  }

  const RUN = 1800;   // how far the bodies' top rows run up (px), well past the band's highest edge at any zoom
  const KINDS = { bundle, B4, strand, slab, split };
  // design-px box of each body; y1 is set past the drawn depth where needed so the lowest row stays within the old cloud's reach at the sea surge
  const DIMS = {
    bundle: { x0: -150, x1: 150, y0: -10, y1: 255 }, B4: { x0: -176, x1: 180, y0: -12, y1: 106 }, strand: { x0: -150, x1: 160, y0: -12, y1: 245 },
    slab: { x0: -150, x1: 160, y0: -12, y1: 267 }, split: { x0: -100, x1: 110, y0: -12, y1: 263 } };

  // fits the body into the box (x, y, w, h); the top rows narrow so the band's cut line crosses a soft shoulder, not a wide flat edge
  function build(kind, x, y, w, h, seed) {
    const r = rng(Math.floor(seed * 7919) + 11);
    const dims = DIMS[kind];
    const kx = w / (dims.x1 - dims.x0), ky = h / (dims.y1 - dims.y0), xc = (dims.x0 + dims.x1) * 0.5;
    const m = KINDS[kind](r, (px, py) => [x + w * 0.5 + (px - xc) * kx * (0.55 + 0.45 * sm((py - dims.y0) / (dims.y1 - dims.y0) / 0.5)), y + (py - dims.y0) * ky - (py <= dims.y0 ? RUN : 0)]);   // the top row runs RUN px up: the band alone cuts the body
    m.k = Math.max(0.7, Math.min(1.4, h / 140));
    m.g = null;
    for (let i = 0; i < m.creases.length; i++) {
      const c = m.creases[i], a = c.pts[0], b = c.pts[1], s = Math.max(1, b[1] - a[1]), q = [a[0] + (a[0] - b[0]) * 50 / s, a[1] - 50], e = [q[0], a[1] - RUN];   // the fold line carries on up past the band: a short run on its own slope, then straight up, so no long slanted ruled line
      c.path = poly([e, q].concat(c.pts), false);
    }
    return m;
  }

  function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")"; }

  // paint the body in the cloud's own px (the caller has translated / mirrored and clipped at the band); everything is clipped to the body's silhouette
  function draw(ctx, m, rimEnd) {
    const k = m.k;
    ctx.save(); ctx.clip(m.p); ctx.lineJoin = "round"; ctx.lineCap = "round";
    for (let i = 0; i < m.ops.length; i++) {
      const o = m.ops[i];
      ctx.save();
      if (o.clip) { ctx.beginPath(); ctx.rect(o.x === undefined ? -1e4 : o.x, o.y, o.w === undefined ? 2e4 : o.w, o.h); ctx.clip(); }
      ctx.fillStyle = o.color; ctx.fill(o.fill);
      ctx.strokeStyle = NAVY; ctx.globalAlpha = 0.75; ctx.lineWidth = 3.4 * k; ctx.stroke(o.rim);
      ctx.globalAlpha = 1; ctx.strokeStyle = OCEAN; ctx.lineWidth = 1.3 * k; ctx.stroke(o.rim);
      ctx.restore();
    }
    ctx.lineWidth = 1.2;
    for (let i = 0; i < m.creases.length; i++) {
      const c = m.creases[i];
      if (!c.g) { const a = c.pts[0], b = c.pts[c.pts.length - 1]; c.g = ctx.createLinearGradient(a[0], a[1], b[0], b[1]); c.g.addColorStop(0, c.col); c.g.addColorStop(1, hexA(rimEnd || "#061c48", 0)); }
      ctx.strokeStyle = c.g; ctx.stroke(c.path);
    }
    ctx.restore();
  }

  window.GenCeilMembrane = { build, draw };
})();
