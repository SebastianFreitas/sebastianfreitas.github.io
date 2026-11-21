/* GenTitanBodies: the four rock-titan bodies (statue, hollow, slime, changer), drawing only.
   Ported from the approved off-site sketch. Each body draws onto an EMPTY TRANSPARENT layer:
   atop and cut composite against what is already there, so the caller owns that layer and
   places it on the scene. Pure functions of o: no randomness, no state between calls.
   draw(name, ctx, o), o = { x, footY, H, t, pal? }; t in seconds; everything scales with H.
   BOX is in fractions of H around x (l, r: left and right of x) and footY (top: above the
   foot line, bottom: below it, negative) and holds all four bodies over their whole motion. */
(function () {
  const NAMES = ["statue", "hollow", "slime", "changer"];
  const PAL = { lit: "#26292c", shade: "#161a1d", hi: "#33373b" };
  const BOX = { l: -0.26, lw: -0.34, r: 0.31, top: 0.68, bottom: -0.5 };
  // the pieces each damage step breaks off, seven. Statue: [h up from the foot, height, depth] in H, off the right edge (x 0.085), biggest round the chest (h 0.35 to 0.45).
  const STATUE_BITES = [[0.40, 0.07, 0.042], [0.30, 0.06, 0.042], [0.47, 0.05, 0.035], [0.35, 0.07, 0.077], [0.20, 0.05, 0.042], [0.43, 0.06, 0.07], [0.12, 0.04, 0.042]];
  const WOUND = "#0b0d0f";   // the exposed inside of a wound: clearly darker than the shade
  // Slime: [x, y, radius] in thousandths of H, on the left edge (facing the Hollow), biggest round the chest.
  const SLIME_BITES = [[-196, 110, 56], [-172, 175, 48], [-145, 245, 45], [-196, 55, 39], [-125, 300, 36], [-185, 150, 64], [-168, 215, 53]];

  function poly(ctx, pts) {
    ctx.beginPath();
    pts.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
    ctx.closePath();
  }
  // fill clipped to what is already painted
  function atop(ctx, fill, pathFn) {
    ctx.save(); ctx.globalCompositeOperation = "source-atop"; ctx.fillStyle = fill; pathFn(ctx); ctx.fill(); ctx.restore();
  }
  // punch a real hole
  function cut(ctx, pathFn) {
    ctx.save(); ctx.globalCompositeOperation = "destination-out"; ctx.fillStyle = "#000"; pathFn(ctx); ctx.fill(); ctx.restore();
  }

  // scratch point lists for the fight's painters, filled by index every frame (nothing is made per frame)
  function mkPts(n) { const a = []; for (let i = 0; i < n; i++) a.push([0, 0]); return a; }
  function setPt(p, x, y) { p[0] = x; p[1] = y; }
  function mapInto(out, src, n, f) { for (let i = 0; i < n; i++) out[i] = f(src[i]); out.length = n; return out; }
  const SC_RING = mkPts(10), SC_STR = mkPts(6), SC_OUT = [];
  const SC_S6 = mkPts(6), SC_S8 = mkPts(8), SC_S4 = mkPts(4);   // the Statue's bite, its shade edge and its crack

  const bodies = {};

  // The Statue: one carved slab, straight edges only, two tones, leaning ~3 degrees right.
  bodies.statue = function (ctx, o) {
    const H = o.H, T = Math.tan(3 * Math.PI / 180);
    // dx and h are fractions of H: dx across from o.x, h up from the foot; the lean shears x with height
    function P(dx, h) { return [o.x + (dx + h * T) * H, o.footY - h * H]; }
    function pts(a) { return a.map(function (p) { return P(p[0], p[1]); }); }
    function path(a) { return function (c) { poly(c, pts(a)); }; }
    // shaft edge x at height h (0.08 wide half at h=0.10, 0.07 at h=0.36)
    function sr(h) { return 0.08 - 0.01 * (h - 0.10) / 0.26; }
    function sl(h) { return -sr(h); }

    const outline = [
      [-0.125, 0], [-0.125, 0.05], [-0.105, 0.05], [-0.105, 0.10],
      [sl(0.10), 0.10], [sl(0.36), 0.36],
      [-0.12, 0.36], [-0.12, 0.505], [0.085, 0.53],
      [0.085, 0.47], [0.075, 0.455], [0.085, 0.44],
      [0.085, 0.36], [sr(0.36), 0.36],
      [sr(0.31), 0.31], [sr(0.31) - 0.012, 0.295], [sr(0.28), 0.28],
      [sr(0.24), 0.24], [sr(0.24) - 0.04, 0.24], [sr(0.20) - 0.04, 0.20], [sr(0.20), 0.20],
      [sr(0.15), 0.15], [sr(0.15) - 0.012, 0.135], [sr(0.12), 0.12],
      [sr(0.10), 0.10], [0.105, 0.10], [0.105, 0.05], [0.125, 0.05], [0.125, 0]
    ];
    poly(ctx, pts(outline));
    ctx.fillStyle = o.pal.lit; ctx.fill();

    // shade over the right 70 percent, one straight crease following the lean
    atop(ctx, o.pal.shade, path([[-0.035, -0.05], [0.2, -0.05], [0.2, 0.6], [-0.035, 0.6]]));
    // underside of the overhang and the faces under each step
    atop(ctx, o.pal.shade, path([[-0.13, 0.33], [0, 0.33], [0, 0.36], [-0.13, 0.36]]));
    atop(ctx, o.pal.shade, path([[-0.13, 0.036], [0, 0.036], [0, 0.05], [-0.13, 0.05]]));
    atop(ctx, o.pal.shade, path([[-0.11, 0.086], [0, 0.086], [0, 0.10], [-0.11, 0.10]]));

    // holes: slit in the upper shaft, slot in the base
    cut(ctx, path([[-0.006, 0.23], [0.006, 0.23], [0.006, 0.34], [-0.006, 0.34]]));
    cut(ctx, path([[0.01, 0.012], [0.07, 0.012], [0.07, 0.034], [0.01, 0.034]]));

    // hurt 0..1 in seventh steps: each step shears a slab off the right edge (facing the Hollow) along straight breaks, leaving a stepped broken
    // face in the shade tone and a straight crack running on from it. The slab itself never moves.
    if (o.hurt > 0) {
      const n = Math.round(o.hurt * STATUE_BITES.length);
      for (let i = 0; i < n && i < STATUE_BITES.length; i++) {
        const b = STATUE_BITES[i], h = b[0], ht = b[1], d = b[2], m = 0.085 - 0.5 * d, e = 0.085 - d;
        setPt(SC_S6[0], 0.12, h - 0.5 * ht); setPt(SC_S6[1], m, h - 0.45 * ht); setPt(SC_S6[2], m, h - 0.05 * ht); setPt(SC_S6[3], e, h); setPt(SC_S6[4], e, h + 0.5 * ht); setPt(SC_S6[5], 0.12, h + 0.55 * ht);
        cut(ctx, path(SC_S6));
        // the wound face: the exposed inside, one flat dark tone, 0.02 deep along the cut
        setPt(SC_S8[0], m, h - 0.45 * ht); setPt(SC_S8[1], m, h - 0.05 * ht); setPt(SC_S8[2], e, h); setPt(SC_S8[3], e, h + 0.5 * ht); setPt(SC_S8[4], e - 0.02, h + 0.5 * ht); setPt(SC_S8[5], e - 0.02, h); setPt(SC_S8[6], m - 0.02, h - 0.05 * ht); setPt(SC_S8[7], m - 0.02, h - 0.45 * ht);
        atop(ctx, WOUND, path(SC_S8));
        // the lighter broken rim: three straight facets along the cut
        setPt(SC_S8[4], e - 0.004, h + 0.5 * ht); setPt(SC_S8[5], e - 0.009, h + 0.02 * ht); setPt(SC_S8[6], m - 0.003, h - 0.05 * ht); setPt(SC_S8[7], m - 0.008, h - 0.45 * ht);
        atop(ctx, o.pal.hi, path(SC_S8));
        // straight cracks run into the body from the second step on, lengthening with hurt
        if (n > 1) {
          const sl = (i % 2 ? -0.02 : 0.02), cl = (0.04 + 0.015 * (i % 3)) * (1 + 0.8 * o.hurt), cy = h + 0.25 * ht;
          setPt(SC_S4[0], e - 0.02, cy - 0.002); setPt(SC_S4[1], e - 0.02 - cl, cy + sl - 0.002); setPt(SC_S4[2], e - 0.02 - cl, cy + sl + 0.002); setPt(SC_S4[3], e - 0.02, cy + 0.002);
          cut(ctx, path(SC_S4));
          if (n > 2) {
            setPt(SC_S4[0], e - 0.02, cy - 0.12 * ht - 0.002); setPt(SC_S4[1], e - 0.02 - 0.7 * cl, cy - 0.12 * ht - sl * 1.5 - 0.002); setPt(SC_S4[2], e - 0.02 - 0.7 * cl, cy - 0.12 * ht - sl * 1.5 + 0.002); setPt(SC_S4[3], e - 0.02, cy - 0.12 * ht + 0.002);
            cut(ctx, path(SC_S4));
          }
        }
      }
    }
  };

  // The Hollow: one torn ribbon hanging in the air, four straight runs joined by hard folds, turning
  // slowly, drifting down and back; the torn ends and three threads trail. Pure function of o.t (sines only).
  // SH is the sketch's H (1009): its pixel amplitudes are written as px / SH, times o.H.
  const SH = 1009, TAU = Math.PI * 2;
  // centreline kinks (x across from slot centre, b up from the deck, in units of H) and band width at each
  const HV0 = [[0.060, 0.070], [0.082, 0.235], [-0.005, 0.380], [-0.092, 0.322], [-0.082, 0.225], [-0.066, 0.140]];
  const HW0 = [0.120, 0.006, 0.110, 0.030, 0.118, 0.090];
  // the cross: the top run (kinks 1 to 3) keeps its rest shape; the right arm (run 0) swings up about kink 1 and the left pair (runs 3, 4) about kink 3,
  // each lying level at its own joint's height, 1.1 times its rest length
  const HV1 = [[0.265, 0.235], HV0[1], HV0[2], HV0[3], [-0.199, 0.322], [-0.294, 0.322]];
  // the beard: three torn locks (base x, half width, length share) hanging from the top run's underside
  const BD = [[-0.026, 0.016, 0.86], [0.0, 0.022, 1.0], [0.027, 0.015, 0.9]], BD_PT = [mkPts(8), mkPts(8), mkPts(8)];
  // depth per kink (near runs shift more)
  const HZ = [0.9, 0.4, -0.3, -0.8, -0.2, 0.6];
  function hSwing(t) { return TAU * t / 9; }
  function hWk(t) { return 0.9 + 0.1 * Math.cos(hSwing(t)); }
  function hFloatY(t) { return 11 / SH * (1 - Math.cos(TAU * t / 5.5)); }
  function hFloatX(t) { return 5 / SH * Math.sin(TAU * t / 7.3); }
  function hLerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
  function hBez(p0, p1, p2, p3, t) {
    const u = 1 - t;
    return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
  }
  function hThread(p0, p1, p2, p3, w0) {
    const L = [], R = [], n = 24;
    for (let i = 0; i <= n; i++) {
      const t = i / n, a = hBez(p0, p1, p2, p3, Math.max(0, t - 0.02)), b = hBez(p0, p1, p2, p3, Math.min(1, t + 0.02)), p = hBez(p0, p1, p2, p3, t);
      let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      const w = w0 * Math.pow(1 - t, 0.9) / 2;
      L.push([p[0] - ty * w, p[1] + tx * w]); R.push([p[0] + ty * w, p[1] - tx * w]);
    }
    return L.concat(R.reverse());
  }
  // with arms out the Hollow is painted straight to the canvas: it goes through a canvas-sized layer so the slit cut only erases the Hollow itself
  let hLayer = null;
  bodies.hollow = function (ctx, o) {
    if (!(o.arms > 0) || o.inLayer) return hollowBody(ctx, o);
    const cv = ctx.canvas;
    if (!hLayer) hLayer = document.createElement("canvas");
    if (hLayer.width !== cv.width || hLayer.height !== cv.height) { hLayer.width = cv.width; hLayer.height = cv.height; }
    const lc = hLayer.getContext("2d");
    lc.setTransform(1, 0, 0, 1, 0, 0); lc.clearRect(0, 0, hLayer.width, hLayer.height);
    lc.setTransform(ctx.getTransform());
    hollowBody(lc, Object.assign({}, o, { inLayer: true }));
    lc.setTransform(1, 0, 0, 1, 0, 0);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(hLayer, 0, 0); ctx.restore();
  };
  function hollowBody(ctx, o) {
    const H = o.H, T = o.t, LG = 0.6;
    let X = o.x, Y = o.footY;
    const kk = hWk(T), sw = Math.sin(hSwing(T));
    const as = o.arms > 0 ? o.arms * o.arms * (3 - 2 * o.arms) : 0;   // the cross pose: the kinks blend from rest to HV1
    const V = HV0.map(function (q, i) { return [(q[0] + (HV1[i][0] - q[0]) * as) * kk + HZ[i] * 0.014 * sw, q[1] + (HV1[i][1] - q[1]) * as]; });
    const W = HW0.map(function (w) { return w * kk; });
    // the two torn ends lag the body: they keep where the body was 0.6 s ago, plus a slow trailing sway
    const kl = hWk(T - LG), swl = Math.sin(hSwing(T - LG));
    [0, 5].forEach(function (i) {
      const lx = (HV0[i][0] + (HV1[i][0] - HV0[i][0]) * as) * kl + HZ[i] * 0.014 * swl;
      V[i] = [lx + (hFloatX(T - LG) - hFloatX(T)) + 10 / SH * Math.sin(TAU * (T - LG) / (i ? 4.6 : 5.9)) * 0.7,
        HV0[i][1] + (HV1[i][1] - HV0[i][1]) * as - (hFloatY(T - LG) - hFloatY(T))];
    });
    // the drop (the swallow): each arm turns down to his side as one rigid piece about its shoulder, the right about kink 1, the left pair about kink 3
    let dA0 = 0, dB0 = 0;
    if (o.drop > 0) {
      const dd = o.drop * o.drop * (3 - 2 * o.drop);
      const turn = function (c, i, th) { const vx = V[i][0] - V[c][0], vy = V[i][1] - V[c][1], cs = Math.cos(th), sn = Math.sin(th); const y0 = V[i][1]; V[i] = [V[c][0] + vx * cs - vy * sn, V[c][1] + vx * sn + vy * cs]; return V[i][1] - y0; };
      dA0 = turn(1, 0, -dd * Math.PI / 2); turn(3, 4, dd * Math.PI / 2); dB0 = turn(3, 5, dd * Math.PI / 2);
    }
    X += hFloatX(T) * H; Y += hFloatY(T) * H;
    const thr = [6.7, 5.3, 8.1].map(function (pp, i) { const a = TAU * (T - 1 - i * 0.4) / pp; return [18 / SH * Math.sin(a), 6 / SH * Math.sin(a * 0.8 + 1)]; });

    function dir(i) { const a = V[i], b = V[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; }
    // point on run i at fraction t, offset s (-0.5 right .. 0.5 left of travel) of the width there
    function at(i, t, s) {
      const d = dir(i), p = hLerp(V[i], V[i + 1], t), w = W[i] + (W[i + 1] - W[i]) * t;
      return [p[0] - d[1] * w * s, p[1] + d[0] * w * s];
    }
    // ragged cap between a and b, bites pushed along d
    function cap(a, b, d, k) {
      const f = [[0.0, 0.004], [0.2, -0.014], [0.36, 0.008], [0.55, -0.024], [0.74, 0.004], [0.88, -0.012]], r = [];
      f.forEach(function (q) { const p = hLerp(a, b, q[0]); r.push([p[0] + d[0] * q[1] * k, p[1] + d[1] * q[1] * k]); });
      return r;
    }
    function run(i, t0, t1, s0, s1, tornStart, tornEnd) {
      const d = dir(i), pts = [];
      pts.push(at(i, t0, s1)); pts.push(at(i, t1, s1));
      if (tornEnd) cap(at(i, t1, s1), at(i, t1, s0), d, 1).forEach(function (q) { pts.push(q); });
      pts.push(at(i, t1, s0)); pts.push(at(i, t0, s0));
      if (tornStart) cap(at(i, t0, s0), at(i, t0, s1), d, -1).forEach(function (q) { pts.push(q); });
      return pts;
    }
    // fold at kink j: wedge joining run j-1 end to run j start, both sides
    function fold(j, side) { return [V[j], at(j - 1, 1, side), at(j, 0, side)]; }
    function P(q) { return [X + q[0] * H, Y - q[1] * H]; }
    function path(pts) { return function (c) { c.beginPath(); pts.forEach(function (q, i) { const p = P(q); if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); c.closePath(); }; }

    const lit = [], back = [], shade = [];
    for (let i = 0; i < 5; i++) lit.push(run(i, 0, 1, -0.5, 0.5, i === 0, i === 4));
    for (let j = 1; j < 5; j++) { lit.push(fold(j, 0.5)); lit.push(fold(j, -0.5)); back.push(fold(j, 0.5)); back.push(fold(j, -0.5)); }
    // the band shows its back just past each fold
    back.push(run(1, 0, 0.5, -0.5, 0.5), run(2, 0, 0.3, -0.5, 0.5), run(3, 0, 0.42, -0.5, 0.5));
    // right-hand side of the face-on stretches in shade
    shade.push(run(0, 0.0, 1, -0.5, -0.05, true, false), run(2, 0.3, 1, -0.5, -0.1), run(3, 0.42, 1, -0.5, -0.1), run(4, 0.3, 1, -0.5, -0.1, false, true));

    // threads
    const A = at(0, 0, 0), B = at(4, 1, 0);
    function swy(q, i, f) { return [q[0] + thr[i][0] * f, q[1] + thr[i][1] * f]; }
    const dA = (HV1[0][1] - HV0[0][1]) * as + dA0, dB = (HV1[5][1] - HV0[5][1]) * as + dB0;   // the threads keep their rest length, hanging from the lifted arm tips
    const th1 = hThread([A[0] + 0.004, A[1] - 0.004], swy([A[0] - 0.004, A[1] - 0.02], 0, 0.3), swy([A[0] + 0.012, 0.03 + dA], 0, 0.7), swy([A[0] + 0.05, 0.012 + dA], 0, 1), 0.016);
    const th2 = hThread([A[0] - 0.016, A[1] - 0.004], swy([A[0] - 0.026, A[1] - 0.015], 1, 0.3), swy([A[0] - 0.014, 0.05 + dA], 1, 0.7), swy([A[0] + 0.004, 0.04 + dA], 1, 1), 0.01);
    const th3 = hThread([B[0] + 0.004, B[1] - 0.006], swy([B[0] - 0.012, B[1] - 0.04], 2, 0.3), swy([B[0] + 0.008, 0.07 + dB], 2, 0.7), swy([B[0] + 0.04, 0.03 + dB], 2, 1), 0.013);

    // one long torn split down the right-hand run, a hair open at its upper end, edges slightly jagged
    const d0 = dir(0), n0 = [-d0[1], d0[0]], SL = [], SR = [];
    for (let i = 0; i <= 14; i++) {
      const u = i / 14, t = 0.08 + 0.70 * u, p = hLerp(V[0], V[1], t), c = 0.006 * Math.sin(u * 17) + 0.01 * (1 - u);
      const h = (0.0035 * Math.pow(1 - u, 0.8) + (i % 2 ? 0.0008 : 0)) * (1 + 3 * (1 - kk) / 0.2);
      SL.push([p[0] + n0[0] * (c - h), p[1] + n0[1] * (c - h)]); SR.push([p[0] + n0[0] * (c + h), p[1] + n0[1] * (c + h)]);
    }
    const slit = SL.concat(SR.reverse());

    ctx.fillStyle = o.pal.lit;
    lit.forEach(function (p) { const f = path(p); f(ctx); ctx.fill(); });
    shade.forEach(function (p) { atop(ctx, o.pal.shade, path(p)); });
    back.forEach(function (p) { atop(ctx, o.pal.shade, path(p)); });
    ctx.fillStyle = o.pal.shade;
    [th1, th2, th3].forEach(function (t) { path(t)(ctx); ctx.fill(); });
    // beard (fight): from the top run's underside three torn straight-faceted locks grow down, the cross's vertical; none until trade 1.4 s, full by 3.2 s
    const ts = o.arms > 0 && window.Gen ? window.Gen.secs("trade") : 0, bg = Math.min(1, Math.max(0, (ts - 1.4) / 1.8)), bl = bg * bg * (3 - 2 * bg);
    if (bl > 0) {
      const y0 = V[2][1] - 0.012, len = (y0 - 0.046) * bl;   // full reach ends at 0.046 H: about 87% of the way down to the foot line
      for (let k = 0; k < 3; k++) {
        const b = BD[k], p = BD_PT[k], bx = V[2][0] + b[0], hw = b[1], L = len * b[2], sx = thr[k][0] * 0.8 * bl;
        setPt(p[0], bx - hw, y0); setPt(p[1], bx - hw * 0.7 + sx * 0.2, y0 - L * 0.38); setPt(p[2], bx - hw * 0.35 + sx * 0.5, y0 - L * 0.72);
        setPt(p[3], bx + sx, y0 - L); setPt(p[4], bx + hw * 0.25 + sx * 0.55, y0 - L * 0.6); setPt(p[5], bx + hw * 0.8 + sx * 0.25, y0 - L * 0.42);
        setPt(p[6], bx + hw * 0.55, y0 - L * 0.2); setPt(p[7], bx + hw, y0);
        ctx.fillStyle = k === 1 ? o.pal.shade : o.pal.lit;
        path(p)(ctx); ctx.fill();
      }
    }
    cut(ctx, path(slit));
  }
  // The Slime: one slumped heap, high shoulder left sliding into a long apron over the deck edge.
  // Folds are drooping lips that creep; the heap sags on a 6 s sine; drips pinch off and fall.
  let slimeCover = function () { return 0; };
  bodies.slime = (function () {
    // points are in thousandths of H, x right of o.x, y UP from o.footY
    const HEAP = [[-172,2],[-196,40],[-200,100],[-176,170],[-150,240],[-128,305],[-90,336],[-50,338],[-18,318],[10,268],[45,218],[90,176],[135,140],[158,104],[176,72],[206,48],[226,28],[222,2],[190,-8],[150,-6],[108,-16],[64,-8],[20,-4],[-20,-14],[-62,-6],[-110,-12],[-150,-6]];
    const LIPS = [
      { p: [[90,262],[40,250],[0,243],[-40,247],[-70,262],[-45,276],[0,275],[60,292],[90,300]], dy: 12, hi: [22, 247, 16] },
      { p: [[-215,200],[-150,182],[-90,170],[-30,166],[30,172],[75,188],[90,200],[60,208],[0,200],[-80,204],[-215,240]], dy: 12, hi: [-115, 172, 34] },
      { p: [[240,140],[180,116],[120,102],[60,98],[20,108],[0,128],[40,130],[100,134],[170,150],[240,190]], dy: 10, hi: [140, 106, 22] },
      { p: [[-230,60],[-190,40],[-150,30],[-110,32],[-90,44],[-130,56],[-190,72],[-230,90]], dy: 6, hi: [-150, 34, 12] }
    ];
    function web(c, top, bot, w) {
      const mid = (top + bot) / 2, a = (top - bot) * 0.3;
      return [[c - w, top + 4], [c - 2, top - a], [c - 1.8, mid], [c - 2, bot + a], [c - w, bot - 4], [c, bot - 6],
        [c + w, bot - 4], [c + 2, bot + a], [c + 1.8, mid], [c + 2, top - a], [c + w, top + 4], [c, top + 6]];
    }
    function drip(c, len, w) {
      return [[c - w, 8], [c - w * 0.55, -len * 0.5], [c - w * 0.95, -len * 0.85], [c, -len - 4], [c + w * 0.95, -len * 0.85], [c + w * 0.55, -len * 0.5], [c + w, 8], [c, 12]];
    }
    const WEBS = [web(-72, 216, 186, 6), web(104, 92, 66, 5)];
    const DRIPS = [drip(-112, 58, 15), drip(-20, 85, 17), drip(72, 62, 16), drip(165, 34, 14)];
    // the sketch's pixel literals as fractions of its H (1009)
    function sm(v) { v = v < 0 ? 0 : v > 1 ? 1 : v; return v * v * (3 - 2 * v); }
    const SKH = 1009, SAG = 14 / SKH, SPREAD = 10 / SKH, GRAV = 1500 / SKH, FALL_END = 216 / SKH;
    // the lash's own 0..1: gather and heal 0-0.25, the front heaves up 0.25-0.45, the crest crashes over the Hollow 0.45-0.60 (spray at the hit), the base drains across and the mass settles over him to 1 (the covering mound, two surface ripples still by 0.92)
    const SW0 = 0.5, SW1 = 0.6;
    slimeCover = function (ls) { return sm((ls - SW0) / (SW1 - SW0)); };

    function lerpPts(a, b, w) { return a.map(function (p, i) { return [p[0] + (b[i][0] - p[0]) * w, p[1] + (b[i][1] - p[1]) * w]; }); }
    // the outline (27 points, after the body's own transform, thousandths of H, y up) at lash ls; R is the rest outline, C the Hollow's x, hd his height
    function slimeShape(ls, R, C, hd) {
      const cl = function (v) { return Math.max(0, Math.min(1, v)); };
      const GA = R.map(function (p) { return [(p[0] - 20) * 0.94 + 20, p[1] > 5 ? p[1] * 1.05 : p[1]]; });
      // the crest: the front column rooted at the foot, curling over to the left (the lip, points 6-9) with its underside hollow; the back stays low
      const lx = Math.max(-200, Math.min(0, (C + 400) * 0.5));
      const CR = [[-260,2],[-200,60],[-140,160],[-110,300],[-110,450],[-140,560],[-230 + lx,620],[-330 + lx,650],[-300 + lx,730],[-220 + lx * 0.5,775],[-120,760],[10,500],[70,320],[125,230],[170,170],[210,100],[230,40],[244,2]];
      // the crashed sheet: the lip landed beyond the Hollow (point 7, 0.25 H past him), the underside lies on the ground, the sheet over his box (his height + 50)
      const H1 = hd + 50;
      // already heap-like: wide foot, sloped sides (never vertical), a little taller and lumpier than the mound, a surge rolling out along the ground at each end
      const CS = [[-170,4],[-330,4],[-450,10],[-525,30],[-455,72],[-370,150],[-305,300],[-250,H1 * 0.7],[-190,H1 + 20],[-100,H1 + 68],[-25,H1 + 28],[50,H1 - 4],[125,H1 + 40],[205,H1 + 12],[285,H1 * 0.66],[370,H1 * 0.34],[470,100],[580,22]];
      // the mound: a heap of goo, wide low skirts both sides, shoulders sloping out, two clear bulges on top (his head 70 high, his shoulders 40) with the surface sagging between
      const MN = [[-170,4],[-470,4],[-525,8],[-450,50],[-355,H1 * 0.3],[-290,H1 * 0.5],[-250,H1 * 0.68],[-205,H1 * 0.86],[-145,H1 + 8],[-70,H1 + 58],[0,H1 + 22],[60,H1 - 12],[130,H1 + 28],[205,H1 + 5],[290,H1 * 0.62],[390,H1 * 0.3],[480,95],[570,8]];
      for (let i = 0; i < 18; i++) { CS[i][0] += C; MN[i][0] += C; }
      const LAG = [0.3, 0.3, 0.3, 0.3, 0.25, 0.12, 0.05, 0, 0.05, 0.12, 0.22, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3];
      for (let j = 0; j < 9; j++) {
        CR.push([R[18 + j][0], R[18 + j][1]]);
        CS.push([190 + C - 360 * j / 8, R[18 + j][1]]);
        MN.push([C + 190 - 360 * j / 8, R[18 + j][1]]);
      }
      let p = lerpPts(R, GA, sm(ls / 0.25));
      p = lerpPts(p, CR, sm((ls - 0.25) / 0.2));
      // 0.45-0.60: the lip throws forward first (x leads, y follows: an arc) and lands, then the sheet behind it falls onto him
      const q = cl((ls - 0.45) / 0.15);
      p = p.map(function (pt, i) {
        if (i >= 18) { const w = sm(q); return [pt[0] + (CS[i][0] - pt[0]) * w, pt[1] + (CS[i][1] - pt[1]) * w]; }
        const w = sm(cl((q - LAG[i]) / (0.6 + LAG[i] / 3))), wy = i >= 5 && i <= 9 ? w * w : w;
        return [pt[0] + (CS[i][0] - pt[0]) * w, pt[1] + (CS[i][1] - pt[1]) * wy];
      });
      p = lerpPts(p, MN, sm((ls - 0.6) / 0.2));
      const u = cl((ls - 0.6) / 0.32);
      if (u > 0 && u < 1) {
        const amp = 14 * (1 - u) * Math.min(1, u * 6);
        for (let i = 8; i < 18; i++) p[i][1] += amp * Math.sin(Math.PI * 4 * u - p[i][0] / 70);
      }
      return p;
    }
    // the spray thrown up at the hit (lash 0.50 to 0.75): drops and a few torn sheets from where the lip lands and where the sheet strikes his head, both ways, peak about 0.6, falling back onto the mound
    function spraySet(ls, C, hd) {
      const out = [];
      if (ls <= 0.5 || ls >= 0.75) return out;
      for (let i = 0; i < 26; i++) {
        const h1 = Math.sin(i * 12.9898 + 4.1) * 43758.5453, h2 = Math.sin(i * 78.233 + 1.7) * 43758.5453, h3 = Math.sin(i * 39.346 + 9.2) * 43758.5453, h4 = Math.sin(i * 26.651 + 2.9) * 43758.5453;
        const r1 = h1 - Math.floor(h1), r2 = h2 - Math.floor(h2), r3 = h3 - Math.floor(h3), r4 = h4 - Math.floor(h4);
        const lip = i < 13, sheet = i % 13 < 4;
        const ox = lip ? C - 250 : C - 10, oy = lip ? (hd + 50) * 0.7 : hd + 10;
        const tau = (ls - ((lip ? 0.54 : 0.56) + r4 * 0.06)) / 0.25;
        if (tau <= 0 || tau >= 0.6) continue;
        const vx = lip ? (r1 - 0.62) * 640 : (r1 - 0.5) * 700, rise = 110 + r2 * 200, vy = rise / 0.15, g = vy / 0.6, r0 = 6 + r3 * 8;
        const px = function (v) { return ox + vx * v; }, py = function (v) { return oy + vy * v - g * v * v; };
        const a = [px(tau), py(tau)], b = [px(Math.max(0, tau - 0.05)), py(Math.max(0, tau - 0.05))];
        const rad = r0 * sm(tau / 0.1) * (1 - sm((tau - 0.42) / 0.18)) * (sheet ? 0.7 : 1);
        if (rad < 1 || a[1] < 2) continue;
        const dx = a[0] - b[0], dy = a[1] - b[1], d = Math.sqrt(dx * dx + dy * dy) + 1e-6, ux = dx / d, uy = dy / d, nx = -uy, ny = ux;
        // a round head leading with one short tapering tail (a curved ribbon with round ends for a sheet piece, a plain round droplet for every fifth); sides uneven; every end rounded, no points
        const small = !sheet && i % 5 === 4, rr = rad * (small ? 0.6 : 1), T = rr * (sheet ? 4 : small ? 0.5 : 1.7), w2 = rr * (sheet ? 0.45 : 0.32), wm = (rr + w2) * 0.45;
        const ka = 0.8 + r3 * 0.4, kb = 0.8 + r2 * 0.4, bend = sheet ? (r1 - 0.5) * T * 0.7 : 0;
        const q = function (f, g) { const e = f < 0 ? f / T : 0; return [a[0] + ux * f + nx * (g + bend * e * e), a[1] + uy * f + ny * (g + bend * e * e)]; };
        out.push([q(rr, 0), q(rr * 0.7, rr * 0.72 * ka), q(0, rr * ka), q(-T * 0.5, wm * ka), q(-T, w2), q(-T - w2, 0), q(-T, -w2), q(-T * 0.5, -wm * kb), q(0, -rr * kb), q(rr * 0.7, -rr * 0.72 * kb)]);
      }
      return out;
    }

    return function (ctx, o) {
      const s = o.H / 1000, pal = o.pal;
      const Y = o.footY, X = o.x;
      // closed smooth curve through points (Catmull-Rom as beziers); dx,dy shift in units
      function blob(pts, dx, dy) {
        dx = dx || 0; dy = dy || 0;
        const n = pts.length;
        const P = function (i) { const p = pts[(i + n) % n]; return [X + (p[0] + dx) * s, Y - (p[1] + dy) * s]; };
        let p = P(0);
        ctx.moveTo(p[0], p[1]);
        for (let i = 0; i < n; i++) {
          const a = P(i - 1), b = P(i), c = P(i + 1), d = P(i + 2);
          ctx.bezierCurveTo(b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6, c[0] - (d[0] - b[0]) / 6, c[1] - (d[1] - b[1]) / 6, c[0], c[1]);
        }
        ctx.closePath();
      }
      function big() { ctx.rect(-4000, -4000, 8000, 8000); }

      const t = o.t, TAU = Math.PI * 2, beads = [];
      const clamp01 = function (v) { return Math.max(0, Math.min(1, v)); };
      // the fight's feelings melt one into the next: pain (pn) gives way to sadness (sd), that to anger (an); lash (ls) arcs the body over the Hollow
      const pn = (o.pain || 0) * (1 - (o.sad || 0)), sd = (o.sad || 0) * (1 - (o.anger || 0)), an = o.anger || 0, ls = o.lash || 0;
      const k = (0.5 - 0.5 * Math.cos(TAU * t / 6)) * (1 - an);
      const sk = SAG * 1000 * k, fx = SPREAD * 1000 * k / 226;
      const ys = (1 - 0.28 * sd) * (1 + 0.8 * an), xs = (1 + 0.25 * sd) * (1 - 0.12 * an);
      const jg = pn * (1 - sm((ls - 0.25) / 0.35)) * Math.pow(Math.max(0, Math.sin(t * 5.4)), 3), jx = 7 * jg * Math.sin(t * 53), jy = 4 * jg * Math.cos(t * 61);
      const LD = (o.hx === undefined ? -400 * s : o.hx - o.x) / s;   // where the Hollow stands, in thousandths of H from the Slime's foot
      // sag: top sinks, base spreads (weights vanish smoothly at the deck edge / the top)
      const Tf = function (p) {
        const wy = clamp01(p[1] / 338);
        let x = p[0] * (1 + fx * (1 - wy)), y = p[1] - sk * wy;
        if (y > 0) y *= ys;
        x = x * xs - Math.max(0, y) * 0.3 * an + jx * wy;
        y += jy * wy;
        return [x, y];
      };
      // the lash: the outline blends rest, gathered, crest, crashed, mound; every other point (lips, drips, wounds, the core) is carried by the same flow, a smooth field of the outline points' displacements, so nothing is a scaled image
      const R = HEAP.map(Tf), hl = 1 - sm(ls / 0.25), lf = (1 - sm((ls - 0.55) / 0.35)) * (1 - sm((ls - 0.25) / 0.15));
      let BL = null, DISP = null;
      if (ls > 0) {
        BL = slimeShape(ls, R, LD, o.hollowH === undefined ? 900 : o.hollowH / s);
        DISP = BL.map(function (b, i) { return [b[0] - R[i][0], b[1] - R[i][1]]; });
      }
      const T = function (p) {
        const q = Tf(p);
        if (!DISP) return q;
        let ax = 0, ay = 0, aw = 0;
        for (let i = 0; i < R.length; i++) {
          const dx = q[0] - R[i][0], dy = q[1] - R[i][1], w = 1 / Math.pow(dx * dx + dy * dy + 25, 1.5);
          ax += DISP[i][0] * w; ay += DISP[i][1] * w; aw += w;
        }
        return [q[0] + ax / aw, q[1] + ay / aw];
      };
      const TT =function (pts) { return pts.map(T); };
      // probe: where the body point o.probe = [x, y, outX, outY] (thousandths of H, y up) lands on the canvas after all of the body's motion; nothing is drawn
      if (o.probe) { const q = T(o.probe); o.probe[2] = X + q[0] * s; o.probe[3] = Y - q[1] * s; return; }
      const HEAP_ = BL || TT(HEAP);
      const SPRAY = ls > 0.5 && ls < 0.75 ? spraySet(ls, LD, o.hollowH === undefined ? 900 : o.hollowH / s) : [];
      const WEBS_ = hl < 0.01 ? [] : [web(-72, 216, 186, 6 * hl), web(104, 92, 66, 5 * hl)].map(TT);
      const LP = [8.1, 7.3, 8.9, 7.7], LF = [0.05, 0.31, 0.58, 0.82];
      const LIPS_ = LIPS.map(function (l, i) {
        const u = (t / LP[i] + LF[i]) % 1;
        const g = Math.sin(Math.PI * u) * (1 - 0.85 * an) * lf;
        const dyo = (0.5 - u) * 70 * (1 - an) * lf;
        let cy = 0;
        l.p.forEach(function (q) { cy += q[1]; });
        cy /= l.p.length;
        const hc = T([l.hi[0], cy + (l.hi[1] - cy) * g + dyo]);
        return {
          p: TT(l.p.map(function (q) { return [q[0], cy + (q[1] - cy) * g + dyo]; })),
          dy: l.dy * g, hi: [hc[0], hc[1], l.hi[2]], g: g
        };
      });
      const DP = [3.1, 2.6, 4.3, 3.7], DF = [0.0, 0.37, 0.61, 0.83], DC = [-112, -20, 72, 165], DL = [58, 85, 62, 34], DW = [15, 17, 16, 14];
      const PINCH = 0.7;
      const DRIPS_ = hl < 0.01 ? [] : DC.map(function (c, i) {
        const u = (t / DP[i] + DF[i]) % 1, a = Math.min(1, u / PINCH);
        const e = Math.sin(Math.PI / 2 * a);
        let f = 0.35 + 1.35 * e, m = 1 - 0.55 * e * e;
        if (u > PINCH) {
          const b = clamp01((u - PINCH) / 0.15), r = 0.5 - 0.5 * Math.cos(Math.PI * b);
          f = 1.7 - 1.35 * r; m = 0.45 + 0.55 * r;
        }
        const len = DL[i] * f * (1 + 1.2 * sd) * hl, w = DW[i] * (1 + 0.3 * sd) * hl;
        for (let j = 0; j < 2; j++) {
          const tau = (u + j - PINCH) * DP[i];
          if (tau < 0) continue;
          const dpx = 0.5 * GRAV * 1000 * tau * tau;
          const ty = -(DL[i] * 1.7 + 4) - dpx;
          if (-ty > FALL_END * 1000) continue;
          if (hl < 0.02) continue;
          const rad = w * 0.8, ry = rad * (1 + Math.min(1.2, GRAV * SKH * tau * 0.0006));
          beads.push([[c, ty + ry], [c + rad, ty], [c, ty - ry], [c - rad, ty]]);
        }
        const wm = w * m;
        return TT([[c - w, 8], [c - wm * 0.55, -len * 0.5], [c - wm * 0.95, -len * 0.85], [c, -len - 4], [c + wm * 0.95, -len * 0.85], [c + wm * 0.55, -len * 0.5], [c + w, 8], [c, 12]]);
      });

      // the whole body, painted once
      ctx.save();
      function paint() {
      // inside the body (fill nonzero = union)
      ctx.fillStyle = pal.lit;
      [HEAP_].concat(WEBS_, DRIPS_, beads, SPRAY).forEach(function (b) { ctx.beginPath(); blob(b); ctx.fill(); });

      // shade: the part of the heap not covered by itself moved up-left (right and under side)
      ctx.save();
      ctx.beginPath(); blob(HEAP_); ctx.clip();
      ctx.globalCompositeOperation = "source-atop"; ctx.fillStyle = pal.shade;
      ctx.beginPath(); big(); blob(HEAP_, -12, 3); ctx.fill("evenodd");
      ctx.restore();

      // lips: a thin shadow under a rounded body-tone bulge, with a short highlight, inside the heap only
      LIPS_.forEach(function (l) {
        if (lf < 0.02) return;
        ctx.save();
        ctx.beginPath(); blob(HEAP_); ctx.clip();
        ctx.fillStyle = pal.shade;
        ctx.beginPath(); blob(l.p, 0, -l.dy); ctx.fill();
        ctx.fillStyle = pal.lit;
        ctx.beginPath(); blob(l.p); ctx.fill();
        ctx.beginPath(); blob(l.p); ctx.clip();
        ctx.beginPath(); ctx.ellipse(X + l.hi[0] * s, Y - l.hi[1] * s, l.hi[2] * s, 7 * s * l.g, 0, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = pal.hi;
        ctx.beginPath(); big(); blob(l.p, 0, 8 * l.g); ctx.fill("evenodd");
        ctx.restore();
      });

      // thin webs between a lip and the mass below
      ctx.fillStyle = pal.lit;
      WEBS_.forEach(function (b) { ctx.beginPath(); blob(b); ctx.fill(); });

      // wet slivers: the upper-left rim of a shape, cut to a small patch
      function sliver(pts, dx, dy, cx, cy, rx, ry, rot) {
        ctx.save();
        ctx.beginPath(); blob(pts); ctx.clip();
        ctx.beginPath(); ctx.ellipse(X + cx * s, Y - cy * s, rx * s, ry * s, rot, 0, Math.PI * 2); ctx.clip();
        ctx.globalCompositeOperation = "source-atop"; ctx.fillStyle = pal.hi;
        ctx.beginPath(); big(); blob(pts, dx, -dy); ctx.fill("evenodd");
        ctx.restore();
      }
      // once the mass has crashed the patch grows to a band all along the upper-left edge of the outline, so it follows the slope
      const gb = sm((ls - 0.6) / 0.4);
      sliver(HEAP_, 8 + 6 * gb, 8 + 6 * gb, -118, 300, 60 + 3000 * gb, 40 + 3000 * gb, 0.8 * (1 - gb));
      if (DRIPS_.length) { sliver(DRIPS_[1], 5, 0, -32, -30, 9, 24, 0); sliver(DRIPS_[2], 5, 0, 62, -22, 9, 18, 0); }

      // inside the heap: sadness darkens it flat; pain flickers pale spots and veins up; anger sets one hard pale core
      if (pn > 0 || sd > 0 || an > 0) {
        ctx.save();
        ctx.beginPath(); blob(HEAP_); ctx.clip();
        if (sd > 0) { ctx.globalAlpha = sd; ctx.fillStyle = pal.shade; ctx.fillRect(X - 400 * s, Y - 700 * s, 800 * s, 800 * s); ctx.globalAlpha = 1; }
        if (pn > 0) {
          ctx.fillStyle = pal.hi; ctx.strokeStyle = pal.hi; ctx.lineWidth = 3 * s; ctx.lineJoin = "round";
          for (let i = 0; i < 7; i++) {
            const fl = Math.max(0, Math.sin(t * 9 + i * 1.9)), bx = -150 + i * 50 + 20 * Math.sin(i * 5.1), by = 40 + (i * 137) % 260;
            if (fl <= 0.05) continue;
            ctx.globalAlpha = fl * pn * lf;
            const c = T([bx, by]), v = T([bx + 40, by + 30]), v2 = T([bx + 15, by + 70]);
            ctx.beginPath(); ctx.ellipse(c[0] + X, Y - c[1], (10 + 6 * ((i * 3) % 4)) * s * fl, (9 + 5 * (i % 3)) * s * fl, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(X + c[0], Y - c[1]); ctx.lineTo(X + v[0], Y - v[1]); ctx.lineTo(X + v2[0], Y - v2[1]); ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
        // the core is drawn on the rest body only: once the lash starts the mass flows and the star would sit in the heap as a dark notch
        if (an > 0 && hl > 0.01) {
          for (let ring = 0; ring < 2; ring++) {
            ctx.fillStyle = ring ? pal.hi : pal.shade; ctx.beginPath();
            const q = (ring ? 1 : 1.3) * an * hl;
            for (let i = 0; i < 6; i++) {
              const a = i * Math.PI / 3 + 0.4, r = (i % 2 ? 62 : 84) * q, c = T([-40 + r * Math.cos(a), 190 + r * Math.sin(a) * 1.2]);
              if (i) ctx.lineTo(X + c[0] * 1, Y - c[1]); else ctx.moveTo(X + c[0], Y - c[1]);
            }
            ctx.closePath(); ctx.fill();
          }
        }
        ctx.restore();
      }

      // hurt 0..1 in seventh steps: each step tears a scoop off the left edge (facing the Hollow), ragged soft lips, and goo strands hang from the tear
      // and stretch and drip. Every point goes through the body's own transform (jolt, sag, lean, lash), so the tear moves with the body.
      if (o.hurt > 0 && hl > 0.001) {
        const n = Math.round(o.hurt * SLIME_BITES.length);
        for (let i = 0; i < n && i < SLIME_BITES.length; i++) {
          const b = SLIME_BITES[i], r = b[2];
          for (let j = 0; j < 10; j++) {
            const h = Math.sin((j + 1) * 12.9898 + i * 78.233) * 43758.5453, rr = (0.75 + 0.4 * (h - Math.floor(h))) * hl, a = j / 10 * TAU;
            SC_RING[j][0] = b[0] + Math.cos(a) * r * rr; SC_RING[j][1] = b[1] + Math.sin(a) * r * rr * 0.85;
          }
          // the darker inside: a wider ring of wound tone on what stays, then the scoop cut through it
          ctx.save(); ctx.globalCompositeOperation = "source-atop"; ctx.fillStyle = WOUND; ctx.globalAlpha = hl;
          for (let j = 0; j < 10; j++) { SC_RING[j][0] = b[0] + (SC_RING[j][0] - b[0]) * 1.3; SC_RING[j][1] = b[1] + (SC_RING[j][1] - b[1]) * 1.3; }
          ctx.beginPath(); blob(mapInto(SC_OUT, SC_RING, 10, T)); ctx.fill();
          ctx.restore();
          for (let j = 0; j < 10; j++) { SC_RING[j][0] = b[0] + (SC_RING[j][0] - b[0]) / 1.3; SC_RING[j][1] = b[1] + (SC_RING[j][1] - b[1]) / 1.3; }
          ctx.save(); ctx.globalCompositeOperation = "destination-out"; ctx.fillStyle = "#000";
          ctx.beginPath(); blob(mapInto(SC_OUT, SC_RING, 10, T)); ctx.fill();
          ctx.restore();
          ctx.fillStyle = pal.lit;
          for (let j = 0; j < 2; j++) {
            const sx = b[0] + r * (j ? 0.35 : -0.2), y0 = b[1] + r * 0.7, w = (r * (j ? 0.08 : 0.11) + 2) * hl, L = r * (1.3 + 0.7 * Math.sin(t * 1.7 + i * 2 + j * 1.3)) * (j ? 0.7 : 1) * hl;
            ctx.beginPath();
            setPt(SC_STR[0], sx - w, y0); setPt(SC_STR[1], sx - w * 0.5, y0 - L * 0.5); setPt(SC_STR[2], sx, y0 - L); setPt(SC_STR[3], sx + w * 0.5, y0 - L * 0.5); setPt(SC_STR[4], sx + w, y0); setPt(SC_STR[5], sx, y0 + 4);
            blob(mapInto(SC_OUT, SC_STR, 6, T));
            ctx.fill();
            // the drip: a bead let go below the tip
            const dy = y0 - L - w * 2.2 - r * 0.15 * (1 + Math.sin(t * 2.3 + i + j));
            ctx.beginPath();
            setPt(SC_STR[0], sx - w * 0.7, dy + w); setPt(SC_STR[1], sx - w * 0.9, dy); setPt(SC_STR[2], sx, dy - w * 1.6); setPt(SC_STR[3], sx + w * 0.9, dy); setPt(SC_STR[4], sx + w * 0.7, dy + w); setPt(SC_STR[5], sx, dy + w * 1.4);
            blob(mapInto(SC_OUT, SC_STR, 6, T));
            ctx.fill();
          }
        }
      }

      }
      paint();
      ctx.restore();
    };
  })();
  // The Changer: 12 forms of splinters, a new one every 0.4 s, around a fixed core and hole.
  // Stands DROP lower than the others (92 px at the sketch's H of 1009); its tips reach below the foot line.
  (function () {
    const D = Math.PI / 180;
    // per form: [angle in degrees (y down, -90 is up), length, heavy?]
    const FORMS = [
      [[-90, .36, 1], [-103, .27, 1], [-78, .25, 1], [90, .27, 1], [104, .21, 1], [-66, .18, 1],
       [-96, .30], [-84, .20], [-114, .15], [-70, .13], [97, .20], [80, .17], [122, .11], [-126, .09]],
      [[-162, .34, 1], [-138, .30, 1], [-112, .22, 1], [-18, .31, 1], [12, .24, 1], [76, .15, 1],
       [-150, .27], [-124, .17], [-34, .22], [-4, .17], [26, .12], [100, .13], [-100, .12]],
      [[52, .345, 1], [70, .29, 1], [22, .36, 1], [38, .35, 1], [-6, .27, 1],
       [86, .24], [10, .30], [60, .20], [118, .12], [145, .13], [-170, .20], [-150, .14]]
    ];
    const WID = [.090, .085, .080, .076, .072, .070], TWID = [.030, .026, .022, .018, .016, .014, .012, .012];
    const KINK = { 0: 20, 2: -22, 4: 18 };
    const DROP = 92 / 1009;

    function splinter(ctx, pal, cx, cy, H, ang, len, w, kink) {
      const L = len * H, W = w * H;
      const a1 = ang * D, a2 = (ang + kink) * D, am = (a1 + a2) / 2;
      const P = [[cx, cy]];
      P.push([cx + Math.cos(a1) * L * .28, cy + Math.sin(a1) * L * .28]);
      const k = [cx + Math.cos(a1) * L * .55, cy + Math.sin(a1) * L * .55];
      P.push(k);
      P.push([k[0] + Math.cos(a2) * L * .45, k[1] + Math.sin(a2) * L * .45]);
      const dirs = [a1, a1, am, a2], hw = [.45, .5, .35, 0];
      let nx = -Math.sin(am), ny = Math.cos(am);
      if (nx * -1 + ny * -1 < 0) { nx = -nx; ny = -ny; }
      const lit = [], shade = [];
      P.forEach(function (p, i) {
        const d = dirs[i], sx = -Math.sin(d), sy = Math.cos(d);
        const sg = (sx * nx + sy * ny) >= 0 ? 1 : -1, off = hw[i] * W;
        lit.push([p[0] + sg * sx * off, p[1] + sg * sy * off]);
        shade.push([p[0] - sg * sx * off, p[1] - sg * sy * off]);
      });
      poly(ctx, P.concat(lit.slice().reverse())); ctx.fillStyle = pal.lit; ctx.fill();
      poly(ctx, P.concat(shade.slice().reverse())); ctx.fillStyle = pal.shade; ctx.fill();
    }

    function grp(f, heavy) {
      return f.filter(function (s) { return !!s[2] === heavy; }).map(function (s) { return [s[0], s[1]]; }).sort(function (a, b) { return b[1] - a[1]; });
    }
    function base(i) { return { h: grp(FORMS[i], true), t: grp(FORMS[i], false) }; }
    function map2(f, fn) { return { h: f.h.map(fn), t: f.t.map(fn) }; }
    function turn(f, d) { return map2(f, function (s) { return [s[0] + d, s[1]]; }); }
    function mirror(f) { return map2(f, function (s) { return [180 - s[0], s[1]]; }); }
    function swapLens(f) {
      function sw(a) { return a.map(function (s, i) { return [s[0], a[(i + 2) % a.length][1]]; }); }
      return { h: sw(f.h), t: sw(f.t) };
    }
    const VAR = [base(0), base(1), base(2), mirror(base(1)), turn(base(0), 35), swapLens(base(2)),
      turn(base(1), 40), swapLens(base(0)), turn(base(2), -30), mirror(base(2)), swapLens(base(1)), turn(base(0), -40)];
    const SEQ = [0, 4, 1, 9, 2, 6, 3, 10, 5, 7, 11, 8];
    const HOLD = .28, SWING = .12, T = .4;
    function ease(p) { p = Math.max(0, Math.min(1, p)); return 1 - Math.pow(1 - p, 4); }

    function blend(A, B, i, u, delay) {
      const a = A[i], b = B[i];
      const p = ease((u - HOLD - delay) / (SWING - .03));
      const aa = a ? a[0] : b[0], ba = b ? b[0] : a[0];
      const d = ((ba - aa + 540) % 360 + 360) % 360 - 180;
      return [aa + d * p, (a ? a[1] : 0) + ((b ? b[1] : 0) - (a ? a[1] : 0)) * p];
    }
    function fit(ang, len, kink) {
      const a1 = ang * D, a2 = (ang + kink) * D;
      const ex = .55 * Math.cos(a1) + .45 * Math.cos(a2), ey = .55 * Math.sin(a1) + .45 * Math.sin(a2);
      let m = len;
      if (ex < -1e-3) m = Math.min(m, .185 / -ex); else if (ex > 1e-3) m = Math.min(m, .265 / ex);
      if (ey > 1e-3) m = Math.min(m, .27 / ey);
      return Math.min(m, .36);
    }
    function motionSet(t) {
      const k = Math.floor(t / T), u = t - k * T;
      const A = VAR[SEQ[((k % SEQ.length) + SEQ.length) % SEQ.length]], B = VAR[SEQ[(((k + 1) % SEQ.length) + SEQ.length) % SEQ.length]];
      const out = [];
      function run(ga, gb, heavy, widths) {
        const n = Math.max(ga.length, gb.length);
        for (let i = 0; i < n; i++) {
          const s = blend(ga, gb, i, u, heavy ? .03 : 0);
          const ang = s[0] + Math.sin(t * 5.2 + i * 1.7 + (heavy ? 0 : 2.1)) * 1.1;
          const kink = heavy ? 0 : (KINK[i] || 0);
          const w = widths[i] * Math.min(1, s[1] / .05);
          out.push([ang, Math.min(s[1], fit(ang, s[1], kink)), heavy, w, kink]);
        }
      }
      run(A.h, B.h, true, WID); run(A.t, B.t, false, TWID);
      return out.filter(function (s) { return s[1] > .004; }).sort(function (a, b) { return b[1] - a[1]; });
    }

    bodies.changer = function (ctx, o) {
      const H = o.H, cx = o.x, cy = o.footY - 0.27 * H + DROP * H;
      // long ones behind, short ones in front
      motionSet(o.t).forEach(function (s) { splinter(ctx, o.pal, cx, cy, H, s[0], s[1], s[3], s[4]); });
      // the core: shade, one lit facet on its left
      const R = 0.058 * H;
      const core = [[-1.0, -0.15], [-0.45, -0.95], [0.55, -0.9], [1.0, 0.1], [0.4, 0.95], [-0.6, 0.85]];
      const cp = core.map(function (p) { return [cx + p[0] * R, cy + p[1] * R]; });
      poly(ctx, cp); ctx.fillStyle = o.pal.shade; ctx.fill();
      poly(ctx, [cp[0], cp[1], [cx - 0.1 * R, cy - 0.3 * R], [cx - 0.15 * R, cy + 0.4 * R], cp[5]]);
      ctx.fillStyle = o.pal.lit; ctx.fill();
      // the hole: irregular pentagon, same in every form
      const r = 0.036 * H;
      const hole = [[-0.95, 0.05], [-0.2, -1.0], [0.85, -0.5], [0.7, 0.75], [-0.45, 0.9]];
      cut(ctx, function (c) {
        poly(c, hole.map(function (p) { return [cx + p[0] * r, cy + p[1] * r]; }));
      });
    };
  })();

  function draw(name, ctx, o) {
    const fn = bodies[name]; if (!fn) return;
    fn(ctx, { x: o.x, footY: o.footY, H: o.H, t: o.t || 0, pal: o.pal || PAL, arms: o.arms || 0, hurt: o.hurt || 0, pain: o.pain || 0, sad: o.sad || 0, anger: o.anger || 0, lash: o.lash || 0, drop: o.drop || 0, part: o.part, hx: o.hx, hollowH: o.hollowH, angular: o.angular });
  }

  // where the Slime's body point o.probe = [x, y, 0, 0] (thousandths of H) lands after its motion: the answer is written into o.probe[2], o.probe[3]
  function slimePoint(o) { bodies.slime(null, o); }
  function cover(ls) { return slimeCover(ls); }   // 0..1: how far the Hollow is inside the Slime (the swallow), from the lash's own 0..1 progress

  window.GenTitanBodies = { NAMES: NAMES, PAL: PAL, BOX: BOX, draw: draw, slimePoint: slimePoint, cover: cover, STATUE_BITES: STATUE_BITES, SLIME_BITES: SLIME_BITES };
})();
