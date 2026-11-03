/* voidship-prow.js — paints the shard: a broken-off chunk of the giant
   metal Libertech built the ship around. Flat facets, light from the
   top-left. +x = nose, +y = down, every coordinate a fraction of L.
   Ember cracks running through the rust pulse and brighten with strain. */
(function () {
  const A = window.VoidshipArt; if (!A) return;
  const { clamp } = window.Util;
  const Paint = window.Paint;
  const { rgba, fillPoly, vol, seg, tracePts } = A;
  const C = A.COLORS;
  const RUST_HEAD = [128, 38, 36], RUST_TOP = [176, 138, 128], RUST_LIT = [142, 43, 39], RUST_MID = [192, 138, 114], RUST_FRONT = [104, 30, 30], RUST_SHADE = [87, 26, 30], RUST_DARK = [70, 18, 18], RUST_DEEP = [50, 12, 14], RUST_PALE = [230, 216, 200], EMBER = [255, 190, 110];


  // the blade: a heavy slab, nearly full depth to a hard-clipped tanto point; straight spine, hooked belly
  const UPPER = [[0.30, -0.12], [0.96, -0.12], [1.14, -0.01], [0.30, -0.01]];
  const LOWER = [[0.30, -0.01], [1.14, -0.01], [1.02, 0.085], [0.90, 0.085], [0.86, 0.06], [0.82, 0.085], [0.72, 0.085], [0.68, 0.065], [0.64, 0.085], [0.30, 0.085]];
  const CLIP = [[0.96, -0.12], [1.14, -0.01], [0.99, -0.01]];
  const GRIND = [[0.34, -0.01], [1.14, -0.01]];
  const EMBER_PTS = [[0.70, 0.035], [0.86, 0.03], [1.0, 0.02]];
  // mid-turn the blade is one solid: the side profile given a lens thickness TM across the ship
  const KY0 = -0.12, KY1 = 0.085, KX0 = 0.30, TM = 0.067;
  const PLANES = [0, 0.125, 0.5366, 1];   // spine, flat of the blade, bevel: u from the spine to the edge

  const ease = (v) => v * v * (3 - 2 * v);   // smoothstep: the rest-art detail and the tip change blend over several frames

  function emberOf(ship, t) {
    const pulse = window.Util.reduced() ? 0.5 : 0.5 + 0.5 * Math.sin(t * 1.7);
    return clamp(0.30 + 0.35 * pulse + 0.30 * clamp(ship.strain || 0, 0, 1), 0, 1);
  }

  function drawProwBack(g, ship, L, t) {
    const ember = emberOf(ship, t);
    g.fillStyle = Paint.rad(g, 0.86 * L, -0.01 * L, 0, 0.30 * L, [[0, rgba(C.RED, 0.20 * ember)], [1, rgba(C.RED, 0)]]);
    g.fillRect(0.38 * L, -0.33 * L, 0.90 * L, 0.62 * L);
  }

  function drawProw(g, ship, L, t) {
    const dir = (ship.face || 1) >= 0 ? 1 : -1;
    const px = Math.max(1, 0.012 * L);
    const ember = emberOf(ship, t);
    // the far half of the ring, then the blade running back into the hull (lit upper facet, darker lower facet) and the ember, then the ring's near half
    ring(g, L, 1, 0, () => {
      fillPoly(g, UPPER, L, rgba(RUST_LIT, 1));
      fillPoly(g, LOWER, L, rgba(RUST_SHADE, 1));
      fillPoly(g, CLIP, L, rgba(RUST_TOP, 1));
      seg(g, [[0.96, -0.12], [1.14, -0.01]], L, rgba(RUST_PALE, 0.9), px);
      seg(g, [[0.30, -0.12], [0.96, -0.12]], L, rgba(RUST_MID, 1), px);
      seg(g, GRIND, L, rgba(RUST_PALE, 0.9), px);
      seg(g, EMBER_PTS, L, rgba(C.RED, 0.35 * ember), Math.max(1.5, 0.016 * L));
      seg(g, EMBER_PTS, L, rgba(EMBER, 0.7 * ember), px);
    });
  }

  // the ring: one 3D hoop round the blade, between the tip and the hull. u along the blade axis, r/phi round it;
  // screen x = u*c + r*cos(phi)*s, y = YM + r*sin(phi): yaw leaves y alone. Far half (cos phi > 0) paints, then the blade passes through, then the near half.
  const YM = -0.015;
  const RING_U = 0.68, RING_W = 0.06, RING_RO = 0.13, RING_RI = 0.12, RING_N = 32;
  function ring(g, L, c, s, blade, hole) {
    const px = Math.max(1, 0.012 * L), PI2 = Math.PI * 2, N = RING_N, cy = Math.sqrt(Math.max(0, 1 - s * s)), u0 = RING_U - RING_W * cy / 2, u1 = RING_U + RING_W * cy / 2, ro = RING_RO, ri = RING_RI;
    const P = (u, r, p) => [u * c + r * Math.cos(p) * s, YM + r * Math.sin(p)];
    const poly = (pts, col) => { g.beginPath(); pts.forEach((q, k) => k ? g.lineTo(q[0] * L, q[1] * L) : g.moveTo(q[0] * L, q[1] * L)); g.closePath(); g.fillStyle = rgba(col, 1); g.fill(); };
    const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
    const ramp = (l) => { const v = clamp((l + 0.8) / 1.6, 0, 1); return v < 0.5 ? mix(C.SHADE, C.MID, 2 * v) : mix(C.MID, C.LIT, 2 * v - 1); };
    const far = [], near = [];
    for (let k = 0; k < N; k++) {
      const pa = PI2 * k / N, pb = PI2 * (k + 1) / N, pm = (pa + pb) / 2, cs = Math.cos(pm), l = -Math.sin(pm) * 0.8 - cs * s * 0.5;
      const side = () => poly([P(u1, ri, pa), P(u1, ro, pa), P(u1, ro, pb), P(u1, ri, pb)], mix(ramp(0.1 - Math.sin(pm) * 0.7 * s * s), C.SHADE, 0.2));
      if (cs > 0) {
        far.push({ d: cs * c, fn: () => poly([P(u0, ri, pa), P(u1, ri, pa), P(u1, ri, pb), P(u0, ri, pb)], mix(ramp(-l), C.DEEP, 0.35)) });
        far.push({ d: cs * c - 10, fn: side });
      } else {
        near.push({ d: cs * c, fn: side });
        near.push({ d: cs * c, fn: () => poly([P(u0, ro, pa), P(u1, ro, pa), P(u1, ro, pb), P(u0, ro, pb)], ramp(l)) });
        if (k % 4 === 2) near.push({ d: cs * c - 10, fn: () => { const q = P(RING_U, ro + 0.003, pm); g.beginPath(); g.arc(q[0] * L, q[1] * L, px * 0.8, 0, PI2); g.fillStyle = rgba(C.EDGE, 1); g.fill(); } });
      }
    }
    const byDepth = (x, y) => y.d - x.d;
    far.sort(byDepth); near.sort(byDepth);
    if (hole > 0) { g.beginPath(); g.ellipse(RING_U * c * L, YM * L, ri * s * L, ri * L, 0, 0, PI2); g.fillStyle = rgba(C.SHADE, hole); g.fill(); }   // late in the turn the hole backs onto hull metal, never the sky
    for (const it of far) it.fn();
    if (blade) blade();
    for (const it of near) it.fn();
  }

  // mid-turn: the whole blade as ONE outline, the side profile with a knife-section thickness across the ship,
  // projected with the turn (screen x = x*c + z*s). At the smallest angle it is the rest art (stepped belly,
  // tip, light lines, ember); those shrink or get covered as the angle grows. Every row stays at its rest height: only x changes.
  function drawProwTurn(g, ship, L, t, turn) {
    const dir = (ship.face || 1) >= 0 ? 1 : -1;
    const px = Math.max(1, 0.012 * L);
    const ember = emberOf(ship, t);
    const s = turn.s;
    // the blade foreshortens truly with the hull's own cos: blade, ring and hull turn as one rigid body
    const yw = Math.atan2(s, turn.c), c = turn.c;
    const sk = s * s;                             // half thickness grows with s^2, so the width falls monotonically
    const w = 1 - ease(clamp(s / 0.6, 0, 1));            // rest-art detail, shrinks continuously with the angle
    const kt = ease(clamp(Math.atan2(s, c) / (Math.PI / 2), 0, 1));   // the tip draws out into a long point, spread evenly over the whole turn (the rest outline at 0)
    const xmax = (y) => (y < -0.01 ? 0.96 + (y - KY0) / 0.11 * 0.18 : 1.14 - (y + 0.01) / 0.095 * 0.12) - kt * kt * kt * (y < -0.01 ? 0.26 * (-0.01 - y) / 0.11 : 0.21 * (y + 0.01) / 0.095);
    // knife section: a slim lens with a rounded spine, fullest a third of the way down, curving to the edge
    const prof = (v) => 0.8 * Math.max(0.06, Math.sqrt(Math.max(0, 1 - Math.pow(v < 0.3 ? (0.3 - v) / 0.3 * 0.85 : (v - 0.3) / 0.7, 2))));
    // near head-on the depth grows (girth lives in depth) and the section rounds to an oval, so the front is a fat rounded knife
    const gt = clamp((s - 0.3) / 0.6, 0, 1), gs = gt * gt * (3 - 2 * gt), GIRTH = 1 + 0.6 * gs;
    const oval = (v) => 0.8 * Math.sqrt(Math.max(0, 1 - Math.pow((v - 0.45) / 0.55, 2)));
    const thick = (y, x) => { const v = clamp((y - KY0) / (KY1 - KY0), 0, 1); return TM * GIRTH * (prof(v) + (Math.max(0.03, oval(v)) - prof(v)) * gs) * (x < 0.62 ? 1 : Math.max(0.0, 1 - (x - 0.62) / 0.52)); };
    const NX = 9;
    const KB = KX0;   // the root stays seated at the joint with the hull
    // a row of the profile at height y on one face (sg = -1 near, +1 far); x runs from the base to the tip
    const row = (y, sg) => {
      const o = [], xm = xmax(y);
      for (let i = 0; i <= NX; i++) { const x = KB + (xm - KB) * i / NX; o.push([x * c + sg * thick(y, x) * sk, y]); }
      return o;
    };
    // 3. the solid: the outline (the stepped side profile swept across the ship) clips the planes, tip to base; a slice is the blade between axial x0 and x1
    const NS = 160;
    const slice = (x0, x1, last) => {
    g.save();
    g.beginPath();
    for (let i = 0; i < NS; i++) {
      const ya = KY0 + (KY1 - KY0) * i / NS, yb = KY0 + (KY1 - KY0) * (i + 1) / NS, y = (ya + yb) / 2, xm = xmax(y);
      const xs = [KB];
      if (y > 0.065) xs.push(0.68 - (y - 0.065) / 0.02 * 0.04, 0.68 + (y - 0.065) / 0.02 * 0.04);
      if (y > 0.06) xs.push(0.86 - (y - 0.06) / 0.025 * 0.04, 0.86 + (y - 0.06) / 0.025 * 0.04);
      xs.push(xm);
      for (let j = 0; j + 1 < xs.length; j += 2) {
        const xa = Math.max(xs[j], x0), xb = Math.min(xs[j + 1], x1);
        if (xb <= xa) continue;
        const ta = thick(y, xa) * sk, tb = thick(y, xb) * sk;
        const lo = Math.min(xa * c - ta, xb * c - tb), hi = Math.max(xa * c + ta, xb * c + tb);
        g.rect(lo * L, ya * L, (hi - lo) * L, (yb - ya) * L + 0.5);
      }
    }
    g.clip();
    g.fillStyle = rgba(RUST_SHADE, 1);
    g.fillRect(-1.5 * L, KY0 * L - L, 3 * L, (KY1 - KY0) * L + 2 * L);
    // spine plane eases from the rest art's lit red to a touch lighter, kept to the knife's own reds
    const sp = clamp(s * 3, 0, 1), SPINE = [166, 72, 62];
    const spine = [0, 1, 2].map(i => Math.round(RUST_LIT[i] + (SPINE[i] - RUST_LIT[i]) * sp));
    const near = [[spine, RUST_LIT, RUST_SHADE], [RUST_SHADE, RUST_DARK, RUST_DEEP]];
    const bl = clamp((s - 0.55) / 0.3, 0, 1);
    // the far face lifts toward the near face's reds, so no hard seam runs down the middle
    const farc = near[1].map((cl, q) => cl.map((v, i) => Math.round(v + (near[0][q][i] - v) * 0.75 * bl)));
    for (const [sg, cols] of [[1, farc], [-1, near[0]]]) {
      const mid = [0, 1, 2].map(q => (PLANES[q] + PLANES[q + 1]) / 2);
      for (let q = 0; q < 3; q++) {
        if (bl <= 0) {
          const ya = KY0 + PLANES[q] * (KY1 - KY0), yb = KY0 + PLANES[q + 1] * (KY1 - KY0);
          fillPoly(g, row(ya, sg).concat(row(yb, sg).reverse()), L, rgba(cols[q], 1));
          continue;
        }
        // near head-on the three planes melt into one soft shade from the spine to the rim
        const NQ = 8;
        for (let j = 0; j < NQ; j++) {
          const u0 = PLANES[q] + (PLANES[q + 1] - PLANES[q]) * j / NQ, u1 = PLANES[q] + (PLANES[q + 1] - PLANES[q]) * (j + 1) / NQ, um = (u0 + u1) / 2;
          const p = um < mid[0] ? 0 : um > mid[2] ? 1.999 : um < mid[1] ? (um - mid[0]) / (mid[1] - mid[0]) : 1 + (um - mid[1]) / (mid[2] - mid[1]), pi = Math.floor(p), f = p - pi;
          const col = [0, 1, 2].map(i => { const smooth = cols[pi][i] + (cols[Math.min(2, pi + 1)][i] - cols[pi][i]) * f; return Math.round(cols[q][i] + (smooth - cols[q][i]) * bl); });
          // each strip runs on to the plane's end, the next one paints over it: no seam hairlines between strips
          fillPoly(g, row(KY0 + u0 * (KY1 - KY0), sg).concat(row(KY0 + PLANES[3] * (KY1 - KY0), sg).reverse()), L, rgba(col, 1));
        }
      }
    }
    g.restore();
    // 4. rest-art light lines and cream tip edge, kept on the near face of the blade (projected with it) the whole turn
    {
      const P = (x, y) => [x * c - thick(y, x) * sk, y];
      const along = (xa, xb, y) => { const o = []; for (let i = 0; i <= 6; i++) o.push(P(xa + (xb - xa) * i / 6, y)); return o; };
      const xt = xmax(-0.12), xg = xmax(-0.01), pw = px * (1 + 1.2 * Math.pow(s, 8));   // the lines widen head-on, where their length folds away
      const edge = []; for (let i = 0; i <= 6; i++) { const y = -0.12 + 0.11 * i / 6; edge.push(P(xmax(y), y)); }
      // head-on the pale tip facet and light lines melt into the blade's own red (same shapes), so the end view is a plain red point
      const hf = clamp((yw - 1.3) / 0.25, 0, 1), toRed = (cl, a) => rgba(cl.map((v, i) => Math.round(v + (RUST_HEAD[i] - v) * hf)), a);
      if (last) {   // the tip edge lies past every ring
        fillPoly(g, edge.concat([P(Math.min(xg, xt + 0.03), -0.01)]), L, toRed(RUST_TOP, 1));
        seg(g, edge, L, toRed(RUST_PALE, 0.9), pw);
      }
      const part = (xa, xb, y, col) => { const lo = Math.max(xa, x0), hi = Math.min(xb, x1); if (hi > lo) seg(g, along(lo, hi, y), L, col, pw); };
      part(0.30, xt, -0.12, toRed(RUST_MID, 1));
      part(0.34, xg, -0.01, toRed(RUST_PALE, 0.9));
    }
    if (last && w > 0.02) {   // the ember lies past every ring
      const P = (x, y) => [x * c, y];
      const ep = EMBER_PTS.map(([x, y]) => P(x, y));
      seg(g, ep, L, rgba(C.RED, 0.35 * ember), Math.max(1.5, 0.016 * L) * w);
      seg(g, ep, L, rgba(EMBER, 0.7 * ember), px * w);
    }
    };
    const sm = (v) => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
    // late in the turn the hull draws in from the blade's base: a solid seat of hull metal fills what would be a black slot, then narrows away with the hull
    { const wd = 0.055 * sm((yw - 1.32) / 0.1) * (1 - sm((yw - 1.44) / 0.08)); if (wd > 0.001) { g.fillStyle = rgba(C.SHADE, 1); g.fillRect((KB * c - wd) * L, KY0 * L, (wd + 0.02) * L, (KY1 - KY0) * L); } }
    ring(g, L, c, s, () => slice(KB, 9, true), sm((yw - 1.38) / 0.08));
  }

  A.drawProwBack = drawProwBack; A.drawProw = drawProw; A.drawProwTurn = drawProwTurn; A.emberOf = emberOf; A.PROW = { UPPER, LOWER, CLIP };
})();
