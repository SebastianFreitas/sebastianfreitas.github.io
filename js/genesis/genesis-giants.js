/* genesis-giants.js — the break beat's tier-3 giants, "the big bois": whole-designed
   flat shapes, screen-fixed, drawn where the old traces were. Giant A, the Leaning
   Mass: a slab that sags on one side, held steps of tilt toward the bridge, never
   touching it. Geometry from the approved sketch (frame 1600x900, pivot (1000,800),
   tilt -30 deg, slid 420 px left, right supports dropped). */
window.GenGiants = (function () {
  const G = window.Gen;
  const TR_ON = 0.5, STEP_T0 = 0.5, STEP = 0.09, NSTEP = 12, ASTEP = 0.1;   // inside the blast (0.5 to 1.6 s): 12 tilt steps, the last at 1.49 s
  const TR_ALPHA = [0.15, 0.35, 0.6, 0.8, 1];   // held fade-in steps, full from 0.9 s
  const TR_GHOST = 0.2, GHOST_T = 0.5;
  const T0 = -30, T1 = -42;   // tilt in degrees: top swings down toward the bridge
  const OX = -420, OY = -20, PV = [1000 + OX, 800 + OY];
  const A0 = T0 * Math.PI / 180;

  function catmull(P, closed, n) {
    const out = [], N = P.length, cnt = closed ? N : N - 1;
    for (let i = 0; i < cnt; i++) {
      const p0 = P[closed ? (i - 1 + N) % N : Math.max(i - 1, 0)], p1 = P[i], p2 = P[(i + 1) % N];
      const p3 = closed ? P[(i + 2) % N] : P[Math.min(i + 2, N - 1)];
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t, pt = [0, 0];
        for (let j = 0; j < 2; j++) {
          pt[j] = 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 +
            (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
        }
        out.push(pt);
      }
    }
    if (!closed) out.push(P[P.length - 1]);
    return out;
  }
  function rot(pts, a, pv) {
    const c = Math.cos(a), s = Math.sin(a);
    return pts.map(p => [pv[0] + (p[0] - pv[0]) * c - (p[1] - pv[1]) * s, pv[1] + (p[0] - pv[0]) * s + (p[1] - pv[1]) * c]);
  }
  // a closed shape given relative to the pivot, tilted to the base tilt, then slid
  function R(rel, closed, n) {
    const pts = rel.map(p => [1000 + p[0], 800 + p[1]]);
    return rot(catmull(pts, closed, n), A0, [1000, 800]).map(p => [p[0] + OX, p[1] + OY]);
  }
  function band(c, w0, w1, bulge) {
    const L = c.length, left = [], right = [];
    for (let i = 0; i < L; i++) {
      const a = c[Math.max(i - 1, 0)], b = c[Math.min(i + 1, L - 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
      const t = i / (L - 1), w = w0 + (w1 - w0) * t + bulge * Math.sin(Math.PI * t);
      left.push([c[i][0] + nx * w, c[i][1] + ny * w]);
      right.push([c[i][0] - nx * w, c[i][1] - ny * w]);
    }
    return left.concat(right.reverse());
  }
  function under(x, polys) {
    let best = null;
    for (const p of polys) {
      for (let i = 0; i < p.length; i++) {
        const a = p[i], b = p[(i + 1) % p.length];
        if ((a[0] - x) * (b[0] - x) <= 0 && a[0] !== b[0]) {
          const y = a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
          if (best === null || y > best) best = y;
        }
      }
    }
    return best;
  }
  // a hard straight spar: a kinked chain of blunt quads with a round joint cap
  function stem(x, kinks, w0, w1, bodies) {
    const y = under(x, bodies) - 80, pts = [[x, y]], polys = [];
    for (const k of kinks) pts.push([x + k[0], y + k[1]]);
    const n = pts.length - 1;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[i + 1], wa = w0 + (w1 - w0) * i / n, wb = w0 + (w1 - w0) * (i + 1) / n;
      const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy), nx = -dy / d, ny = dx / d;
      polys.push([[a[0] + nx * wa, a[1] + ny * wa], [b[0] + nx * wb, b[1] + ny * wb], [b[0] - nx * wb, b[1] - ny * wb], [a[0] - nx * wa, a[1] - ny * wa]]);
      if (i + 1 < n) {
        const cap = [];
        for (let k = 0; k < 12; k++) cap.push([b[0] + Math.cos(k * Math.PI / 6) * wb, b[1] + Math.sin(k * Math.PI / 6) * wb]);
        polys.push(cap);
      }
    }
    return polys;
  }

  let SH = null;   // the shapes at the base tilt, in sketch pixels
  function build() {
    const mass = R([[-1000, -30], [-560, 70], [-80, 40], [420, 90], [900, 10], [1000, -450], [960, -1100], [640, -1700], [60, -2000], [-560, -1850], [-980, -1300], [-1100, -600]], true, 12);
    const lip = R([[300, 20], [700, 120], [1020, 60], [1060, -300], [800, -420], [420, -300]], true, 12);
    const shoulder = R([[-1150, -250], [-860, -80], [-700, -450], [-760, -900], [-1060, -820]], true, 12);
    // fold bands follow the contours: long, diagonal, never round holes
    const f = (rel, w, tone) => ({ p: band(R(rel, false, 14), w[0], w[1], w[2]), tone });
    const folds = [
      f([[-900, -60], [-400, -330], [200, -380], [860, -250]], [46, 6, 60], 2),
      f([[-1000, -600], [-500, -820], [100, -900], [800, -820]], [70, 4, 80], 3),
      f([[-800, -1250], [-300, -1400], [300, -1450], [820, -1300]], [60, 4, 70], 2),
      f([[300, 60], [620, -150], [900, -600], [930, -1100]], [20, 4, 90], 3),
    ];
    const bodies = [mass, lip, shoulder];
    // the two left supports (the right ones are dropped), carried by the mass
    const sup = stem(-340 + OX, [[-90, 260], [-10, 520], [-170, 800], [-150, 1100]], 64, 38, bodies)
      .concat(stem(-60 + OX, [[-110, 200], [-60, 400], [-200, 700]], 44, 26, bodies));
    // B: a hanging sheet folded into tall strips with torn bottoms, one strip sheared aside
    const xs = [1180, 1420, 1560, 1860, 2020, 2400, 2800], bot = [560, 330, 640, 470, 720, 380, 560], lean = [0, 40, -60, 90, -30, 60, 0];
    const bStrips = [], bDark = [];
    for (let i = 0; i < xs.length - 1; i++) {
      const q = [[xs[i], -3200], [xs[i + 1], -3200], [xs[i + 1] + lean[i + 1], bot[i + 1]], [xs[i] + lean[i], bot[i]]];
      if (i === 3) { bStrips.push([[1860, -3200], [2020, -3200], [2020, 60], [1860, 60]]); bDark.push(bStrips.length - 1); } else {
        bStrips.push(q);
        if (i % 2 === 0) bDark.push(bStrips.length - 1);
      }
    }
    bStrips.push([[1960, 60], [2160, 60], [2170, 720], [1990, 790]]);
    const bFold = band(catmull([[1200, -700], [1900, -200], [2600, 150]], false, 14), 80, 26, 60);
    // C: a dark hull, curved belly, a bite out of one edge, a slab slipped aside (all lifted 400)
    const dy = p => p.map(q => [q[0], q[1] - 400]);
    const belly = catmull([[2100, 60], [1900, 420], [1500, 640], [1000, 800], [300, 860], [-400, 780], [-800, 500]], false, 14);
    const bite = catmull([[1500, -120], [1250, 150], [1380, 330], [1700, 360]], false, 10);
    const hull = dy([[-700, -150], [700, -330], [1500, -120]].concat(bite, [[1900, 420]], belly.slice(Math.floor(belly.length / 3)), [[-800, 500]]));
    const slab = dy([[1560, -110], [2300, 20], [2620, 300], [2450, 360], [1980, 250], [1700, 120]]);
    const cFold = dy(band(catmull([[-500, 150], [400, 300], [1200, 440]], false, 14), 60, 18, 40));
    SH = { bodies, folds, sup, bStrips, bDark, bFold, hull, slab, cFold };
  }

  function fillAll(ctx, polys, col, M) {
    ctx.fillStyle = col;
    path(ctx, polys, M);
    ctx.fill();
  }
  function drawB(ctx, M, alpha, T) {
    const dark = SH.bDark.map(i => SH.bStrips[i]);
    ctx.save();
    ctx.globalAlpha = alpha;
    fillAll(ctx, SH.bStrips, T[1], M);
    fillAll(ctx, dark, T[0], M);
    ctx.save();
    path(ctx, dark, M);
    ctx.clip();
    fillAll(ctx, [SH.bFold], T[2], M);
    ctx.restore();
    ctx.restore();
  }
  function drawC(ctx, M, alpha, T) {
    ctx.save();
    ctx.globalAlpha = alpha;
    fillAll(ctx, [SH.hull], T[0], M);
    fillAll(ctx, [SH.slab], T[1], M);
    ctx.save();
    path(ctx, [SH.hull], M);
    ctx.clip();
    fillAll(ctx, [SH.cFold], T[2], M);
    ctx.restore();
    ctx.restore();
  }

  function path(ctx, polys, M) {
    ctx.beginPath();
    for (const p of polys) {
      for (let i = 0; i < p.length; i++) {
        const q = M(p[i]);
        i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]);
      }
      ctx.closePath();
    }
  }

  function draw(ctx, W, H, tb) {
    if (tb < TR_ON) return;
    if (!SH) build();
    const pal = window.GenEldPal ? GenEldPal.TIER3 : null;
    if (!pal) return;
    const red = G.reduced;
    /* the whole approved sheet (two 1000x1009 panels, 4 sketch px per sheet px) is the screen, fitted by the tighter side and centred */
    const s = Math.min(W / 2000, H / 1009), ox = (W - 2000 * s) / 2, oy = (H - 1009 * s) / 2;
    const MA = p => [ox + s * (p[0] + 1000) / 4, oy + s * (p[1] + 2900) / 4];
    const MC = p => [ox + s * (1000 + (p[0] + 1100) / 4), oy + s * (p[1] + 1100) / 4];
    const k = red ? NSTEP : tb < STEP_T0 ? 0 : Math.min(NSTEP, Math.floor((tb - STEP_T0) / STEP) + 1);
    const a = (T0 + (T1 - T0) * k / NSTEP) * Math.PI / 180 - A0;
    const tr = ps => rot(ps, a, PV);
    const bodies = SH.bodies.map(tr), sup = SH.sup.map(tr);
    const folds = SH.folds.map(f => ({ p: tr(f.p), tone: f.tone }));
    const T = GenEldPal.TIER3.steps;   // the dark tier-3 steps: shapes against the blast light
    const n = tb < STEP_T0 ? 0 : Math.min(4, Math.floor((tb - STEP_T0) / ASTEP) + 1);
    const pale = red ? 1 : TR_GHOST + (1 - TR_GHOST) * Math.min(1, Math.max(0, (tb - GHOST_T) / 1.0));
    const alpha = TR_ALPHA[red ? 4 : n] * pale;
    drawB(ctx, MA, alpha, T);
    drawC(ctx, MC, alpha, T);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = T[0];
    path(ctx, bodies.concat(sup), MA);
    ctx.fill();
    ctx.fillStyle = T[1];
    path(ctx, [bodies[2]], MA);
    ctx.fill();
    ctx.fillStyle = T[0];
    path(ctx, [bodies[1]], MA);
    ctx.fill();
    ctx.save();
    path(ctx, bodies, MA);
    ctx.clip();
    for (const f of folds) { ctx.fillStyle = T[f.tone]; path(ctx, [f.p], MA); ctx.fill(); }
    ctx.restore();
    ctx.restore();
  }

  return { draw };
})();
