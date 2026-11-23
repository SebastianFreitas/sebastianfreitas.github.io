/* Genesis insects: the eldritch crowd of the approved round 8 sketch (bodies, movements, roster, tint drift). Flat fills only, seeded only, every
   result a pure function of time. Nothing runs at load but the roster build; nothing is drawn until someone calls it.
   window.GenInsects:
     LIST                      the 190 objects (201 bodies): { kind 1..8 | "pair" | "trio", mk (movement kind, differs on the odd ones), odd, s (true-size px body
                               length), band "speck"|"mid"|"large", sd, dir, off, ph, hz, x0, y0, v (px/s), wob, t (tone), Tc.. (timings) }
     move(it, t, W, H)         the sketch's InsMove.place: { x, y, th, p, mv, rollA, norot, shards, t } for a W x H panel (default 900 x 450, true-size px;
                               wraps through a margin outside it). t in seconds, pure. (pose.t echoes t; pairs and trios need it to turn.)
     colors(it, t, water)      { litC, shadeC } rgb strings, the tint drift (water: darker and colder), pure in t
     drawBody(ctx, it, x, y, pose, cols, k)   one object (body, pair or trio) at x, y in the ctx's current transform; pose from move, cols from colors;
                               k multiplies every size (frame scale times birth scale 0..1)
     drawShards(ctx, pose, cols, ox, oy, k)   the kind 3 puffs and kind 5 shed legs of pose.shards, at their panel position + (ox, oy), sizes times k
     rng(seed)                 mulberry32
   Lit/shade split is the sketch's own (whole body in the shade tone, then the lit tone clipped to the left of a curved hard edge whose slant and place
   differ per body), not paint.js litShade (straight edge, per shape): it would not give the same picture. */
window.GenInsects = (function () {
  "use strict";
  const TAU = Math.PI * 2;
  const rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0; let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const S = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };

  // uneven rounded mass: radius wobbles with 2nd/3rd/5th harmonics (never a clean circle)
  const UNIT = {}; // per vertex count: cos and sin of the angles
  function unit(n) {
    if (UNIT[n]) return UNIT[n];
    const co = [], si = [];
    for (let i = 0; i < n; i++) { co.push(Math.cos(TAU * i / n)); si.push(Math.sin(TAU * i / n)); }
    return (UNIT[n] = { co: co, si: si });
  }
  // the radius multipliers of a blob (they depend only on f, amp, n: cached by the caller)
  function blobR(amp, f, n) {
    const r = [];
    for (let i = 0; i < n; i++) { const th = TAU * i / n; r.push(1 + amp * (0.6 * Math.sin(2 * th + f[0]) + 0.8 * Math.sin(3 * th + f[1]) + 0.4 * Math.sin(5 * th + f[2]))); }
    return r;
  }
  // polygons live in one flat scratch buffer (x, y pairs): piece id i spans BUF[PS[i] .. PS[i] + PL[i]); a builder returns its piece id.
  // begin() starts a new body; the buffer is rewritten every call (no time-dependent state outlives it)
  const BUF = new Float64Array(16384), PS = new Int32Array(1024), PL = new Int32Array(1024), MN = new Float64Array(1024);
  let nV = 0, nP = 0;
  const begin = () => { nV = 0; nP = 0; };
  const piece = (len) => { PS[nP] = nV; PL[nP] = len; nV += len; return nP++; };
  // pose-independent pieces are built once per body (cached on its par) and copied in
  function got(P, slot) {
    const c = P.bc[slot];
    if (!c) return -1;
    BUF.set(c, nV); return piece(c.length);
  }
  function keep(P, slot, id) { P.bc[slot] = BUF.slice(PS[id], PS[id] + PL[id]); return id; }
  function blob(cx, cy, rx, ry, rot, rm, n) {
    const c = Math.cos(rot), s = Math.sin(rot), u = unit(n), j = nV;
    for (let i = 0; i < n; i++) {
      const x = rm[i] * rx * u.co[i], y = rm[i] * ry * u.si[i];
      BUF[j + 2 * i] = cx + x * c - y * s; BUF[j + 2 * i + 1] = cy + x * s + y * c;
    }
    return piece(2 * n);
  }
  // recentre and scale the pieces (in place) so the x extent is 1 and it is centred
  function norm(polys) {
    let a = 1e9, b = -1e9, c = 1e9, d = -1e9;
    for (let n = 0; n < polys.length; n++) { const id = polys[n], e = PS[id] + PL[id]; for (let j = PS[id]; j < e; j += 2) { const x = BUF[j], y = BUF[j + 1]; if (x < a) a = x; if (x > b) b = x; if (y < c) c = y; if (y > d) d = y; } }
    const k = 1 / Math.max(b - a, d - c), mx = (a + b) / 2, my = (c + d) / 2;
    for (let j = 0; j < nV; j += 2) { BUF[j] = (BUF[j] - mx) * k; BUF[j + 1] = (BUF[j + 1] - my) * k; }
    return polys;
  }
  // one sample of a band: the left point at its place, the right point mirrored from the end (n2 points in all)
  function bandPt(base, n2, i, px, py, ax, ay, bx, by, h) {
    const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1, j = base + 2 * i, m = base + 2 * (n2 - 1 - i);
    BUF[j] = px - dy / l * h; BUF[j + 1] = py + dx / l * h; BUF[m] = px + dy / l * h; BUF[m + 1] = py - dx / l * h;
  }
  // thick band round a centreline with per-sample half widths
  function band(cl, hw) {
    const n = cl.length, base = nV;
    for (let i = 0; i < n; i++) { const a = cl[i > 0 ? i - 1 : 0], b = cl[i < n - 1 ? i + 1 : n - 1]; bandPt(base, 2 * n, i, cl[i][0], cl[i][1], a[0], a[1], b[0], b[1], hw[i]); }
    return piece(4 * n);
  }
  // per-body parameters from the seed: five uneven numbers in 0..1 and three phases
  // (cached per seed with its blob radii and bead rolls: they never change with the pose; mv is set per call)
  const PCACHE = {};
  function par(sd) {
    if (PCACHE[sd]) return PCACHE[sd];
    const r = rng(sd), P = { a: r(), b: r(), c: r(), d: r(), e: r(), f: [r() * TAU, r() * TAU, r() * TAU], n: r(), v: vars(sd), mv: {}, rm: {}, hh: {}, bc: {} };
    return (PCACHE[sd] = P);
  }
  // four rolled variation numbers in 0..1
  function vars(sd) { const r = rng((sd * 2654435761 + 99) >>> 0); r(); return [r(), r(), r(), r()]; }
  // two-segment tapering leg as a filled polygon: base (x,y), first segment angle a1 length l1, second a2 length l2, base half width w
  function leg(x, y, a1, l1, a2, l2, w) {
    const kx = x + l1 * Math.cos(a1), ky = y + l1 * Math.sin(a1), ex = kx + l2 * Math.cos(a2), ey = ky + l2 * Math.sin(a2), j = nV;
    bandPt(j, 6, 0, x, y, x, y, kx, ky, w); bandPt(j, 6, 1, kx, ky, x, y, ex, ey, w * 0.7); bandPt(j, 6, 2, ex, ey, kx, ky, ex, ey, w * 0.2);
    return piece(12);
  }
  // mirrored legs: bases [x, |y|, thetaFirst, thetaSecond]; sw(i, side) gives the swing added to both
  function legs(bases, l1, l2, w, sw) {
    const out = [];
    bases.forEach((b, i) => { for (const s of [1, -1]) { const d = sw(i, s); out.push(leg(b[0], s * b[1], s * (b[2] + d), l1 * (b[4] || 1), s * (b[3] + d), l2 * (b[4] || 1), w)); } });
    return out;
  }
  const bl = (cx, cy, rx, ry, P, k, rot) => blob(cx, cy, rx, ry, rot || 0, P.rm[k % 3] || (P.rm[k % 3] = blobR(0.07, [P.f[k % 3], P.f[(k + 1) % 3], P.f[(k + 2) % 3]], 20)), 20);
  // the same for a blob whose arguments never change with the pose: built once per body under its slot (kind * 16 + n)
  const blc = (slot, cx, cy, rx, ry, P, k) => { const g = got(P, slot); return g >= 0 ? g : keep(P, slot, bl(cx, cy, rx, ry, P, k)); };
  // tip of a two-segment leg (same args as leg)
  const tipOf = (x, y, a1, l1, a2, l2) => [x + l1 * Math.cos(a1) + l2 * Math.cos(a2), y + l1 * Math.sin(a1) + l2 * Math.sin(a2)];
  // a pointed curling horn/wing: centreline turns by curl (radians, accumulating toward the tip), half width w tapering to a point
  function curl(x, y, ang, len, cur, w, n) {
    const cl = [[x, y]], hw = [w * 0.5]; n = n || 9;
    for (let i = 1; i < n; i++) { const u = i / (n - 1), a = ang + cur * u * u, q = cl[i - 1]; cl.push([q[0] + len / (n - 1) * Math.cos(a), q[1] + len / (n - 1) * Math.sin(a)]); hw.push(w * Math.pow(Math.sin(Math.PI * Math.min(0.5 + u * 0.5, 1)), 0.9) * (1 - 0.15 * u) * (i === n - 1 ? 0 : 1) + 0.002); }
    hw[n - 1] = 0; return band(cl, hw);  }

  const K = {};
  /* 1 caterpillar: one uneven ring of beads rolling round, a wave through them */
  K[1] = { rot: (p) => TAU * p, poly(p, P) {
    const V = P.v, n = 13 + Math.floor(V[0] * 3), gap = 0.42 + 0.16 * Math.sin(TAU * p * 2), polys = [], hh = (i, k) => { const key = i * 8 + k; return P.hh[key] !== undefined ? P.hh[key] : (P.hh[key] = rng((P.f[0] * 1e4 + i * 131 + k * 17) >>> 0)()); };
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1), a = gap / 2 + (TAU - gap) * u, R = 0.36 * (1 + 0.22 * Math.sin(2 * a + P.f[1]) + 0.12 * Math.sin(3 * a + P.f[2]) + 0.1 * Math.sin(TAU * p * 3 - i * 0.9));
      const x = R * Math.cos(a), y = R * Math.sin(a), head = i === n - 1, r = (head ? 0.12 : 0.05 + 0.055 * hh(i, 1)) * (i === 0 ? 0.65 + 0.4 * V[3] : 1);
      polys.push(bl(x, y, r, r * 0.92, P, i));
      const w = 0.7 * Math.sin(TAU * p * 3 - i * 0.8), hl = hh(i, 2), sk = (hh(i, 3) - 0.5) * 1.4, dr = hh(i, 4) < 0.25 ? Math.PI : 0;
      if (hl > 0.22 && !head) {
        const L = 0.03 + 0.22 * hl * hl;
        polys.push(leg(x + Math.cos(a + dr) * r * 0.6, y + Math.sin(a + dr) * r * 0.6, a + dr + sk + 0.4 * w, L, a + dr + sk + 0.6 * w + 0.6 * Math.sin(i), L * 0.7, 0.025));
      }
      if (head) for (const s of [1, -1]) polys.push(curl(x + Math.cos(a + Math.PI / 2) * r * 0.7 + s * Math.cos(a) * r * 0.5, y + Math.sin(a + Math.PI / 2) * r * 0.7 + s * Math.sin(a) * r * 0.5, a + Math.PI / 2 + s * 0.5, 0.2 * (s > 0 ? 0.8 + 0.5 * V[1] : 1.2 - 0.4 * V[1]), s * 1.2, 0.035, 6));
    }
    return norm(polys);
  } };
  /* 2 beetle: body under four curling wings, six legs ending in huge paws; flips and tumbles */
  K[2] = { rot: (p) => 1.1 * Math.sin(TAU * p) + 0.5 * Math.sin(TAU * p * 3 + 1), poly(p, P) {
    const V = P.v, fl = Math.sin(TAU * p * 3), fd = P.mv.fold || 0, polys = [blc(32, -0.06, 0, 0.27, 0.15 + 0.02 * P.a, P, 0), blc(33, 0.2, 0, 0.1, 0.11, P, 1), blc(34, 0.34, 0, 0.075, 0.08, P, 2)];
    if (V[3] > 0.4) polys.push(blc(35, -0.3, (V[3] - 0.7) * 0.25, 0.055, 0.045, P, 1));
    for (const s of [1, -1]) {
      polys.push(curl(0.38, s * 0.04, s * (0.5 - 0.1 * fl) * (1 - fd) + s * 0.05 * fd, 0.2, s * (-0.4 - 2.2 * V[2]) * (1 - fd), 0.03, 6));
      polys.push(curl(0.14, s * 0.07, s * ((2.1 + 0.35 * fl) * (1 - fd) + 3.0 * fd), 0.62 * (0.6 + 0.8 * V[0]) * (s > 0 ? 1 + 0.25 * (V[1] - 0.5) : 1 - 0.25 * (V[1] - 0.5)), s * -2.6 * (1 - fd), 0.12, 12));
      polys.push(curl(0.0, s * 0.07, s * ((2.7 - 0.3 * fl) * (1 - fd) + 3.05 * fd), 0.5, s * 2.4 * (1 - fd), 0.09, 10));
    }
    const bases = [[0.22, 0.09, 0.9, 1.5], [0.04, 0.14, 1.55, 2.0], [-0.14, 0.14, 2.1, 2.6]];
    bases.forEach((b, i) => { for (const s of [1, -1]) {
      const d = 0.4 * Math.sin(TAU * p * 3 + ((i + (s > 0 ? 0 : 1)) % 2) * Math.PI), a1 = s * (b[2] + d), a2 = s * (b[3] + d);
      polys.push(leg(b[0], s * b[1], a1, 0.15, a2, 0.12, 0.03));
      const t = tipOf(b[0], s * b[1], a1, 0.15, a2, 0.12); polys.push(bl(t[0], t[1], 0.07, 0.065, P, i));
      for (const k of [-1, 1]) polys.push(leg(t[0], t[1], a2 + k * 0.7, 0.07, a2 + k * 0.4, 0.05, 0.02));
    } });
    const fy = P.mv.flip === undefined ? 1 : P.mv.flip;
    norm(polys);
    if (fy !== 1) for (let j = 1; j < nV; j += 2) BUF[j] *= fy;
    return polys;
  } };
  /* 3 spider: a round ball with about twenty tiny feet and a nub for a face */
  K[3] = { poly(p, P) {
    const V = P.v, polys = [blc(48, 0, 0, 0.27 * (0.93 + 0.14 * V[3]), 0.26 + 0.015 * P.a, P, 0), blc(49, 0.3, (V[1] - 0.5) * 0.12, 0.06, 0.055, P, 1)], nF = 18 + Math.floor(V[0] * 5), lg = Math.floor(V[2] * nF);
    for (let i = 0; i < nF; i++) {
      const a = TAU * i / nF + 0.08 * Math.sin(i * 2.3), r = 0.25, sw = 0.55 * Math.sin(TAU * p * 6 - i * 0.8), L = (0.075 + 0.035 * ((i * 7) % 3) / 2) * (i === lg ? 1.9 : 1);
      polys.push(leg(r * Math.cos(a), r * Math.sin(a), a + sw, L, a + sw * 0.6 + 0.8 * (i % 2 ? 1 : -1), L * 0.85, 0.024));
    }
    return norm(polys);
  } };
  /* 4 stick bug: a long thin body of rigid links, tiny head, forked tail, legs only at the ends */
  K[4] = { poly(p, P) {
    const V = P.v, N = 5 + Math.floor(V[0] * 5), lk = 0.19 * 6 / (N - 1), bu = 1 + Math.floor(V[2] * (N - 2)), cl = [[-0.6, 0]], ang = [], hw = [0.03]; let a = 0;
    for (let i = 1; i < N; i++) { a = 0.3 * Math.sin(TAU * p - i * 1.2 + P.f[0] * 0.3); ang.push(a); const q = cl[i - 1]; cl.push([q[0] + lk * Math.cos(a), q[1] + lk * Math.sin(a)]); hw.push(0.045 + 0.012 * Math.sin(i * 1.3 + P.f[1]) + (i === bu ? 0.022 : 0)); }
    ang.push(a);
    const polys = [band(cl, hw)], h = cl[N - 1];
    polys.push(bl(h[0] + 0.05 * Math.cos(a), h[1] + 0.05 * Math.sin(a), 0.055 * (0.6 + 1.0 * V[3]), 0.05 * (0.6 + 1.0 * V[3]), P, 2));
    for (const s of [1, -1]) {
      const sw = 0.25 * Math.sin(TAU * p + (s > 0 ? 0 : Math.PI));
      polys.push(leg(h[0], h[1] + s * 0.02, a + s * (0.45 + sw), 0.32 * (s > 0 ? 0.75 + 0.5 * V[1] : 1.25 - 0.5 * V[1]), a + s * (0.1 + sw * 0.5), 0.3, 0.022));
      polys.push(leg(cl[1][0], cl[1][1] + s * 0.02, ang[0] + s * (2.3 + sw), 0.3, ang[0] + s * (2.8 + sw), 0.28, 0.022));
      polys.push(leg(cl[0][0], cl[0][1], ang[0] + s * (2.9 + 0.2 * sw), 0.24, ang[0] + s * (3.1), 0.22, 0.018));
    }
    return norm(polys);
  } };
  /* 5 crab: a tiny knot with every leg growing from it like a star, two pincer arms */
  K[5] = { rot: (p) => 0.6 * Math.sin(TAU * p), poly(p, P) {
    const V = P.v, nL = 6 + Math.floor(V[0] * 3), U = P.mv.u, polys = [blc(80, 0, 0, 0.065, 0.06, P, 0)], op = 0.15 + 0.5 * Math.pow(Math.max(0, Math.cos(TAU * p * 2)), 0.7), sv = 0.7 * Math.sin(TAU * p);
    if (V[3] > 0.5) polys.push(blc(81, -0.06, (V[3] - 0.75) * 0.3, 0.04, 0.035, P, 1));
    for (let j = 0; j < nL; j++) {
      let th = 1.0 + (TAU - 2.0) * (j + 0.5) / nL, dir = j % 2 ? 1 : -1, sw = sv * dir + 0.2 * Math.sin(TAU * p * 3 + j), L = 0.2 + 0.07 * ((j * 5) % 3), sc = 1;
      if (U !== undefined) { const q = (U + j / nL) % 1; th = (j % 2 ? 1 : -1) * (0.12 + 2.58 * S(q / 0.8)); sc = q < 0.8 ? S(q / 0.1) : 0; sw = 0.1 * Math.sin(TAU * p * 3 + j); if (sc < 0.02) continue; L *= 1 + 1.4 * S(q / 0.08) * (1 - S((q - 0.12) / 0.3)); }
      polys.push(leg(0, 0, th + sw, L * sc, th + sw + 0.7 * dir, L * 0.9 * sc, (0.05 - 0.004 * (j % 3)) * (0.4 + 0.6 * sc)));
    }
    for (const s of [1, -1]) {
      const a1 = s * (0.55 + 0.4 * sv), a2 = s * (0.1 + 0.3 * sv), lm = s > 0 ? 0.85 + 0.35 * V[1] : 1.2 - 0.35 * V[1], tp = tipOf(0, 0, a1, 0.3 * lm, a2, 0.26 * lm);
      polys.push(leg(0, 0, a1, 0.3 * lm, a2, 0.26 * lm, 0.055));
      polys.push(band([[tp[0], tp[1]], [tp[0] + 0.3 * Math.cos(a2 + s * op * (0.6 + 0.8 * V[2])), tp[1] + 0.3 * Math.sin(a2 + s * op * (0.6 + 0.8 * V[2]))]], [0.07, 0.01]));
      polys.push(band([[tp[0], tp[1]], [tp[0] + 0.26 * Math.cos(a2 - s * op * 0.3), tp[1] + 0.26 * Math.sin(a2 - s * op * 0.3)]], [0.05, 0.01]));
    }
    return norm(polys);
  } };
  /* 6 fly: plump thorax, two broad wings, no head, one very long whip tail */
  K[6] = { poly(p, P) {
    const V = P.v, fl = 0.75 + 0.4 * Math.sin(TAU * p * 4), polys = [blc(96, 0.1, 0, 0.17, 0.15, P, 0), blc(97, -0.1, 0, 0.15, 0.1, P, 1)];
    for (const s of [1, -1]) {
      const a = s * (1.1 + 0.55 * fl), c = Math.cos(a), sn = Math.sin(a), wl = (0.6 + 0.8 * V[1]) * (s > 0 ? 1 : 0.8 + 0.3 * V[2]);
      polys.push(band([[0.12, s * 0.1], [0.12 + 0.18 * c, s * 0.1 + 0.18 * sn], [0.12 + 0.52 * wl * c, s * 0.1 + 0.52 * wl * sn]], [0.015, 0.14 * wl, 0.01]));
    }
    const cl = [], hw = [], n = 14;
    for (let i = 0; i < n; i++) { const u = i / (n - 1); cl.push([-0.18 - 1.1 * (0.5 + 1.0 * V[0]) * u, 0.3 * (0.4 + 1.2 * V[3]) * Math.pow(u, 1.3) * Math.sin(TAU * p * 2 - u * 5 + P.f[0] * 0.2)]); hw.push(0.06 * Math.pow(1 - u, 0.8) + 0.004); }
    polys.push(band(cl, hw));
    polys.push(...legs([[0.18, 0.08, 0.8, 1.6], [0.1, 0.09, 1.5, 2.2], [0.02, 0.09, 2.1, 2.7]], 0.1, 0.1, 0.028, (i, s) => 0.3 * Math.sin(TAU * p * 3 + i)));
    return norm(polys);
  } };
  /* 7 ant staff: the ant sits on its rear stretched into a long knobbed pole; vaults along */
  K[7] = { poly(p, P) {
    const V = P.v, k1 = 2 + Math.floor(V[0] * 3), k2 = 6 + Math.floor(V[1] * 3), pl = 0.66 * (0.85 + 0.3 * V[2]), ph = P.mv.ph !== undefined ? P.mv.ph : 0.8 * Math.sin(TAU * p), c = Math.cos(ph), sn = Math.sin(ph), polys = [], px = 0.16 - pl, fold = 0.5 + 0.5 * Math.sin(TAU * p + 1);
    let bd = got(P, 112);
    if (bd < 0) {
      const cl = [], hw = [];
      for (let i = 0; i < 12; i++) { const u = i / 11; cl.push([0.16 - pl * u, 0]); hw.push(0.1 * Math.pow(1 - u, 0.6) + 0.002 + (i === k1 || i === k2 ? 0.035 : 0)); }
      hw[11] = 0; bd = keep(P, 112, band(cl, hw));
    }
    polys.push(bd);
    polys.push(blc(113, 0.36, 0, 0.08, 0.05, P, 1), blc(114, 0.23, 0, 0.035, 0.035, P, 2), blc(115, 0.46, 0, 0.085, 0.075, P, 0));
    polys.push(...legs([[0.36, 0.03, 0.6, 1.5], [0.32, 0.04, 1.5, 2.1], [0.28, 0.04, 2.2, 2.7]], 0.2, 0.2, 0.03, (i, s) => -0.5 * fold + 0.3 * Math.sin(TAU * p * 2 + i + (s > 0 ? 0 : 2))));
    for (const s of [1, -1]) { const w = 0.35 * Math.sin(TAU * p * 2 + (s > 0 ? 0 : 2)); polys.push(leg(0.5, s * 0.04, s * (0.5 + w), 0.15 * (s > 0 ? 0.8 + 0.5 * V[3] : 1.2 - 0.4 * V[3]), s * (-0.2 + w), 0.16, 0.022)); }
    for (let j = 0; j < nV; j += 2) { const dx = BUF[j] - px, y = dx * sn + BUF[j + 1] * c; BUF[j] = px + dx * c; BUF[j + 1] = y; }
    return polys;
  } };
  /* 8 grasshopper: slim body, long wing case, two whip feelers, big Z-jointed hind legs */
  K[8] = { poly(p, P) {
    const V = P.v, k = 0.5 + 0.5 * Math.sin(TAU * p), polys = [blc(128, -0.05, 0, 0.3, 0.045, P, 0), blc(129, 0.2, 0, 0.1, 0.05, P, 1), blc(130, 0.36, 0, 0.075, 0.045, P, 2)];
    if (V[3] > 0.4) polys.push(blc(131, 0.02 + 0.2 * (V[3] - 0.7), -0.06, 0.04, 0.035, P, 1));
    let fd = got(P, 132);
    if (fd < 0) fd = keep(P, 132, band([[-0.15, 0], [-0.4, 0.01], [-0.3 - 0.7 * V[2], 0]], [0.035, 0.03, 0.004]));
    polys.push(fd);
    for (const s of [1, -1]) {
      polys.push(leg(-0.02, s * 0.04, s * (2.3 - 0.9 * k), 0.34 * (s > 0 ? 0.6 + 0.8 * V[1] : 1.4 - 0.8 * V[1]), s * (0.6 + 0.5 * k), 0.36 * (s > 0 ? 0.6 + 0.8 * V[1] : 1.4 - 0.8 * V[1]), 0.04));
      polys.push(leg(0.38, s * 0.03, s * (0.5 + 0.3 * Math.sin(TAU * p * 0.5 + s)), 0.4 * (0.5 + 1.2 * V[0]), s * (0.9 + 0.5 * Math.sin(TAU * p * 0.5 + s)), 0.25, 0.012));
      polys.push(leg(0.22, s * 0.05, s * (1.2 + 0.3 * Math.sin(TAU * p * 2 + (s > 0 ? 0 : 1.5))), 0.12, s * (1.7 + 0.2 * Math.sin(TAU * p * 2)), 0.1, 0.022));
      polys.push(leg(0.12, s * 0.05, s * (1.6 - 0.3 * Math.sin(TAU * p * 2 + (s > 0 ? 0 : 1.5))), 0.12, s * (2.1), 0.1, 0.022));
    }
    return norm(polys);
  } };

  /* draw polygons under the ctx's current transform. o = { x, y, th, s, litC, shadeC, sp (split 0.45-0.62), tl (edge slant -0.3..0.3) } */
  function drawPolys(ctx, o) {
    const c = Math.cos(o.th), sn = Math.sin(o.th), s = o.s;
    let a = 1e9, b = -1e9, d = 1e9, e = -1e9;
    // moved to panel position in place (the buffer is built fresh each call); each piece keeps its own fill (one shared path would
    // change the antialiased seams), the shade pass draws them as they go and the lit pass re-walks them inside the clip
    ctx.fillStyle = o.shadeC;
    for (let n = 0; n < nP; n++) {
      let mn = 1e9;
      const j0 = PS[n], j1 = j0 + PL[n];
      ctx.beginPath();
      for (let j = j0; j < j1; j += 2) {
        const px = BUF[j], py = BUF[j + 1], x = o.x + s * (px * c - py * sn), y = o.y + s * (px * sn + py * c);
        BUF[j] = x; BUF[j + 1] = y;
        if (x < a) a = x; if (x > b) b = x; if (y < d) d = y; if (y > e) e = y;
        if (x < mn) mn = x;
        if (j > j0) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      MN[n] = mn;
      ctx.closePath(); ctx.fill();
    }
    const xs = a + o.sp * (b - a), h = e - d, m = 2, qx = xs + 0.18 * (b - a) * (o.tl > 0 ? 1 : -1) * 0.5;
    // pieces wholly right of the clip's right-most point (its end points and the curve's control point) get no lit fill
    const right = Math.max(xs + o.tl * h, xs - o.tl * h, qx) + 2;
    ctx.save(); ctx.beginPath();
    ctx.moveTo(a - m, d - m); ctx.lineTo(xs + o.tl * h, d - m);
    ctx.quadraticCurveTo(qx, (d + e) / 2, xs - o.tl * h, e + m);
    ctx.lineTo(a - m, e + m); ctx.closePath(); ctx.clip();
    ctx.fillStyle = o.litC;
    for (let n = 0; n < nP; n++) {
      if (MN[n] > right) continue;
      const j0 = PS[n], j1 = j0 + PL[n];
      ctx.beginPath(); ctx.moveTo(BUF[j0], BUF[j0 + 1]); for (let j = j0 + 2; j < j1; j += 2) ctx.lineTo(BUF[j], BUF[j + 1]);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  function drawKind(ctx, kind, p, o) {
    const R = K[kind].rot, P = par(o.sd); P.mv = o.mv || {};
    const ex = o.rollA !== undefined ? o.rollA : (R && !o.norot ? R(p) : 0);
    begin(); K[kind].poly(p, P);
    drawPolys(ctx, ex ? Object.assign({}, o, { th: o.th + ex }) : o);
  }
  // a lumpy single body (pair members, trio specks): no gait, just an uneven mass
  function lump(ctx, o, rx, ry) {
    const P = par(o.sd), slot = 200 + (ry > 0.39 ? 1 : 0); begin();
    if (got(P, slot) < 0) keep(P, slot, blob(0, 0, rx, ry, P.a * TAU, P.rm.l || (P.rm.l = blobR(0.2, P.f, 16)), 16));
    drawPolys(ctx, o);
  }

  // ---- movements (one per kind; about 1 body in 15 borrows another kind's) ----
  const hs = (a, b) => rng((Math.imul(a | 0, 7919) + Math.imul(b | 0, 104729) + 12345) >>> 0)();
  // per-body timing numbers for every move, from the seed
  function prep(it) {
    const r = rng((it.sd * 40503 + 77) >>> 0);
    it.mk = it.mk || it.kind; it.Tc = 3 + r() * 3; it.Tp = 2.5 + r() * 2.5; it.Tf = 2.2 + r() * 1.3; it.Th = 1.6 + r() * 1.4; it.Tr = 9 + r() * 7; it.tw = 9 + r() * 6; it.ph2 = r();
    return it;
  }
  function move(it, t, W, H) {
    W = W || 900; H = H || 450;
    const c = Math.cos(it.dir), sn = Math.sin(it.dir), m = it.s * 1.6 + 10, Lx = W + 2 * m, Ly = H + 2 * m, s = it.s, v = it.v, k = it.mk;
    const wp = (d, lat) => ({ x: ((it.x0 * Lx + d * c - lat * sn) % Lx + Lx) % Lx - m, y: ((it.y0 * Ly + d * sn + lat * c) % Ly + Ly) % Ly - m });
    let d = 0, lat = 0, th = it.dir + it.off + 0.25 * Math.sin(0.4 * t + it.wob), p = (it.ph + it.hz * t) % 1;
    const o = { mv: {}, norot: k !== 2, shards: [], t: t };
    if (k === 1) { d = v * t; o.rollA = d / (0.4 * s); o.norot = false; }
    else if (k === 2) {
      const u = t / it.Tc + it.ph2, n = Math.floor(u), f = u - n, adv = v * it.Tc;
      { const g = f < 0.3 ? 0 : f < 0.75 ? S((f - 0.3) / 0.45) : 1, fy = Math.cos(Math.PI * g) * (n % 2 ? -1 : 1); o.mv.flip = Math.abs(fy) < 0.07 ? 0.07 * (fy < 0 ? -1 : 1) : fy; }
      d = n * adv * 0.85 + adv * (0.3 * f + 0.55 * S((f - 0.55) / 0.25)); o.norot = false;
    } else if (k === 3) {
      const u = t / it.Tp + it.ph2, kk = Math.floor(u), jump = s * (2.2 + 1.6 * hs(it.sd, 5)), nt = Math.floor(t * it.tw);
      d = kk * jump; const jx = hs(it.sd, nt * 3 + 1), jy = hs(it.sd, nt * 3 + 2), on = hs(it.sd, nt * 3 + 3) < 0.45;
      if (on) { d += (jx - 0.5) * 0.36 * s; lat = (jy - 0.5) * 0.36 * s; }
      p = (it.ph + 0.1 * hs(it.sd, nt * 3 + 4)) % 1; th += on ? (jx - 0.5) * 0.5 : 0;
      for (let q = kk; q >= kk - 1; q--) {
        const age = t - (q - it.ph2) * it.Tp, L = 1.3;
        if (age <= 0 || age >= L) continue;
        const o0 = wp((q - 1) * jump, 0);
        const ns = 8 + Math.floor(2 * hs(it.sd + q, 99));
        for (let i = 0; i < ns; i++) {
          const a = TAU * hs(it.sd + q, i * 5 + 1), sp = (0.4 + 0.9 * hs(it.sd + q, i * 5 + 2)) * s, r = (0.12 + 0.11 * hs(it.sd + q, i * 5 + 3)) * s * (1 - age / L);
          o.shards.push({ k: "sp", x: o0.x + Math.cos(a) * sp * Math.sqrt(age), y: o0.y + Math.sin(a) * sp * Math.sqrt(age), s: Math.max(r, 0), th: a, sd: it.sd + 31 * i + q });
        }
      }
    } else if (k === 4) {
      th = it.dir + it.off; const ev = (t / it.Tr + it.ph2) % 1, env = ev < 0.05 ? Math.sin(ev / 0.05 * Math.PI) : 0;
      p = 0.3 + 0.025 * env * Math.sin(t * 70);
    } else if (k === 5) {
      d = 0.5 * v * t; const rt = 0.22 + 0.2 * it.hz; o.mv.u = ((it.ph2 + t * rt) % 1 + 1) % 1; p = (it.ph + 0.3 * t) % 1;
      const nL = 6 + Math.floor(vars(it.sd)[0] * 3);
      for (let j = 0; j < nL; j++) {
        const x = it.ph2 + t * rt + j / nL, fr = x - Math.floor(x), age = (fr >= 0.8 ? fr - 0.8 : fr + 0.2) / rt, LL = 1.4;
        if (age <= 0 || age >= LL) continue;
        const tb = t - age, L = 0.2 + 0.07 * ((j * 5) % 3), ab = it.dir + it.off + 0.25 * Math.sin(0.4 * tb + it.wob) + (j % 2 ? 1 : -1) * 2.7, ob = wp(0.5 * v * tb, 0);
        o.shards.push({ k: "leg", x: ob.x, y: ob.y, s: s * L * 0.9 * (1 - age / LL), th: ab, sd: it.sd + j, dj: j % 2 ? 1 : -1 });
      }
    } else if (k === 6) {
      const u = t / it.Tf, n = Math.floor(u), f = u - n, adv = v * it.Tf * 1.4;
      const h = f < 0.6 ? f / 0.6 : f < 0.66 ? 1 - 0.7 * Math.floor((f - 0.6) / 0.06 * 3 + 1) / 3 : 0.3;
      d = (n * 0.3 + h) * adv; p = (it.ph + d * 0.7 / s) % 1;
    } else if (k === 7) {
      const u = t * it.hz * 0.8 + it.ph2, n = Math.floor(u), f = u - n, stride = s * 1.15;
      d = (n + (f < 0.7 ? 0 : S((f - 0.7) / 0.3))) * stride;
      o.mv.ph = f < 0.7 ? -0.8 + 1.6 * S(f / 0.7) : 0.8 - 1.6 * S((f - 0.7) / 0.3);
    } else if (k === 8) {
      const Nt = 4, u = t / it.Th + it.ph2, n = Math.floor(u), a = (u - n) * Nt, fl = Math.floor(a), aq = (fl + S((a - fl) / 0.18)) / Nt, h = 0.45 * s;
      const X = n * 2 * h - h * Math.cos(Math.PI * aq), Y = -h * Math.sin(Math.PI * aq);
      d = X; lat = Y; th = it.dir + Math.PI + Math.PI * aq + (n % 2 ? Math.PI : 0);
      p = (it.ph + 0.15 * (n + aq)) % 1;
    }
    const q = wp(d, lat); o.x = q.x; o.y = q.y; o.th = th; o.p = p; return o;
  }

  // ---- roster and tint ----
  let R = rng(7311);
  const rr = (a, b) => a + (b - a) * R();
  // three depth tiers (far = small = darkest), each body drifts slowly between 2-3 dark cold low-saturation tones
  let RT = rng(5151);
  const rt = (a, b) => a + (b - a) * RT(), TONES = [[1, 1, 1], [0.84, 1, 0.9], [1, 0.84, 1.1]], TIER = [81, 106, 134];
  function tone(s) { const tier = s < 8 ? 0 : s < 20 ? 1 : 2, nt = RT() < 0.5 ? 2 : 3, a = RT() * 3 | 0; return { lit: Math.round(TIER[tier] * rt(0.92, 1.08)), shade: 0, sp: rt(0.46, 0.6), tl: rt(-0.28, 0.28), tier: tier, T: rt(4, 9), ph: RT(), seq: [0, 1, 2].slice(0, nt).map((i) => (a + i) % 3) }; }
  function colors(it, t, water) {
    const q = it.t, n = q.seq.length, u = (((t / q.T + q.ph) % 1) + 1) % 1 * n, i = Math.floor(u), f = u - i, w = f * f * (3 - 2 * f), A = TONES[q.seq[i % n]], B = TONES[q.seq[(i + 1) % n]];
    const k = water ? 0.8 : 1, cold = water ? [0.86, 0.98, 1.1] : [1, 1, 1], rgb = (mm) => "rgb(" + [0, 1, 2].map((c) => Math.round(Math.min(255, q.lit * mm * k * cold[c] * (A[c] + (B[c] - A[c]) * w)))).join(",") + ")";
    return { litC: rgb(1), shadeC: rgb(0.45) };
  }
  const LIST = [];
  function add(kind, s, band, extra) {
    const dir = Math.max(-1.15, Math.min(1.15, (R() + R() + R() - 1.5) * 1.2));
    LIST.push(Object.assign({ kind: kind, s: s, band: band, dir: dir, off: rr(-0.5, 0.5), sd: Math.floor(rr(1, 99999)), t: tone(s), ph: R(), hz: rr(0.25, 0.65), x0: R(), y0: R(), v: band === "large" ? rr(8, 20) : rr(20, 70), wob: R() * TAU }, extra));
  }
  // oddballs: about 1 body in 15 borrows another kind's movement (own seeded stream)
  const OR = rng(9157);
  for (let i = 0; i < 24; i++) add(1 + i % 8, rr(3.2, 5), "speck");
  for (let i = 0; i < 74; i++) add(1 + (i * 3 + 1) % 8, rr(12, 19) * 0.85, "mid");
  for (let i = 0; i < 8; i++) add(1 + i, rr(22, 32) * 0.85, "large");
  for (let i = 0; i < 8; i++) add("pair", rr(10, 18) * 0.85, "mid");
  for (let i = 0; i < 6; i++) add("trio", rr(10, 26), "speck");
  // the 70 added objects (same mix, 190 in all) draw from their own generators, so the first 120 keep every value
  R = rng(3359); RT = rng(6203);
  for (let i = 24; i < 38; i++) add(1 + i % 8, rr(3.2, 5), "speck");
  for (let i = 74; i < 118; i++) add(1 + (i * 3 + 1) % 8, rr(12, 19) * 0.85, "mid");
  for (let i = 4; i < 8; i++) add(1 + i, rr(22, 32) * 0.85, "large");
  for (let i = 0; i < 5; i++) add("pair", rr(10, 18) * 0.85, "mid");
  for (let i = 0; i < 3; i++) add("trio", rr(10, 26), "speck");
  for (const it of LIST) if (typeof it.kind === "number") { if (OR() < 1 / 15) { const o = Math.floor(OR() * 7) + 1; it.mk = o >= it.kind ? o + 1 : o; it.odd = true; } prep(it); }

  // ---- drawing ----
  function pairDraw(ctx, it, x, y, pose, cols, k) {
    const t = pose.t, r = rng(it.sd), sg = r() < 0.5 ? -1 : 1, a = sg * (0.5 + r() * 0.6) * t + r() * TAU, e = 0.75 + r() * 0.25, rad = it.s * k;
    const big = Math.max(5 * k, rad * 0.6), small = Math.max(4 * k, rad * 0.4), q = [[-Math.cos(a) * rad * 0.4, -Math.sin(a) * rad * 0.4 * e, big, 0], [Math.cos(a) * rad * 0.6, Math.sin(a) * rad * 0.6 * e, small, 1]];
    q.sort((u, v) => u[1] - v[1]);
    for (const b of q) lump(ctx, { x: x + b[0], y: y + b[1], s: b[2], sd: it.sd + b[3] * 17, th: pose.th + b[3], litC: cols.litC, shadeC: cols.shadeC, sp: it.t.sp, tl: it.t.tl }, 0.5, 0.38);
  }
  function trioDraw(ctx, it, x, y, pose, cols, k) {
    const t = pose.t, r = rng(it.sd);
    for (let j = 0; j < 3; j++) {
      const d = 3 + r() * 2, p1 = r() * TAU, p2 = r() * TAU, bx = (r() - 0.5) * 2, by = (r() - 0.5) * 2, f = 0.4 + 0.5 * r();
      lump(ctx, { x: x + it.s * k * (0.5 * bx + 0.25 * Math.sin(f * t + p1)), y: y + it.s * k * (0.5 * by + 0.25 * Math.sin(1.3 * f * t + p2)), s: d * k, sd: it.sd + j, th: p1, litC: cols.litC, shadeC: cols.shadeC, sp: it.t.sp, tl: it.t.tl }, 0.5, 0.4);
    }
  }
  function drawBody(ctx, it, x, y, pose, cols, k) {
    if (it.kind === "pair") return pairDraw(ctx, it, x, y, pose, cols, k);
    if (it.kind === "trio") return trioDraw(ctx, it, x, y, pose, cols, k);
    drawKind(ctx, it.kind, pose.p, { sd: it.sd, s: it.s * k, x: x, y: y, th: pose.th, mv: pose.mv, rollA: pose.rollA, norot: pose.norot, litC: cols.litC, shadeC: cols.shadeC, sp: it.t.sp, tl: it.t.tl });
  }
  // the puff shards (tiny solid lumps) and shed legs of one pose
  function drawShards(ctx, pose, cols, ox, oy, k) {
    for (const h of pose.shards) {
      const o = { x: h.x + ox, y: h.y + oy, s: h.s * k, th: h.th, litC: cols.litC, shadeC: cols.shadeC, sp: 0.5, tl: 0 };
      begin();
      if (h.k === "sp") { BUF.set([0.5, 0, -0.45, 0.17, -0.5, -0.1]); piece(6); }
      else { o.s = h.s * 2 * k; leg(0, 0, 0, 0.55, 0.7 * (h.dj || 1), 0.5, 0.07); }
      drawPolys(ctx, o);
    }
  }

  return { LIST: LIST, move: move, colors: colors, drawBody: drawBody, drawShards: drawShards, rng: rng };
})();
