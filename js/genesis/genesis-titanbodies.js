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
  const BOX = { l: -0.26, r: 0.31, top: 0.68, bottom: -0.5 };

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
  };

  // The Hollow: one torn ribbon hanging in the air, four straight runs joined by hard folds, turning
  // slowly, drifting down and back; the torn ends and three threads trail. Pure function of o.t (sines only).
  // SH is the sketch's H (1009): its pixel amplitudes are written as px / SH, times o.H.
  const SH = 1009, TAU = Math.PI * 2;
  // centreline kinks (x across from slot centre, b up from the deck, in units of H) and band width at each
  const HV0 = [[0.060, 0.070], [0.082, 0.235], [-0.005, 0.380], [-0.092, 0.322], [-0.082, 0.225], [-0.066, 0.140]];
  const HW0 = [0.120, 0.006, 0.110, 0.030, 0.118, 0.090];
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
  bodies.hollow = function (ctx, o) {
    const H = o.H, T = o.t, LG = 0.6;
    let X = o.x, Y = o.footY;
    const kk = hWk(T), sw = Math.sin(hSwing(T));
    const V = HV0.map(function (q, i) { return [q[0] * kk + HZ[i] * 0.014 * sw, q[1]]; });
    const W = HW0.map(function (w) { return w * kk; });
    // the two torn ends lag the body: they keep where the body was 0.6 s ago, plus a slow trailing sway
    const kl = hWk(T - LG), swl = Math.sin(hSwing(T - LG));
    [0, 5].forEach(function (i) {
      const lx = HV0[i][0] * kl + HZ[i] * 0.014 * swl;
      V[i] = [lx + (hFloatX(T - LG) - hFloatX(T)) + 10 / SH * Math.sin(TAU * (T - LG) / (i ? 4.6 : 5.9)) * 0.7,
        HV0[i][1] - (hFloatY(T - LG) - hFloatY(T))];
    });
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
    const th1 = hThread([A[0] + 0.004, A[1] - 0.004], swy([A[0] - 0.004, A[1] - 0.02], 0, 0.3), swy([A[0] + 0.012, 0.03], 0, 0.7), swy([A[0] + 0.05, 0.012], 0, 1), 0.016);
    const th2 = hThread([A[0] - 0.016, A[1] - 0.004], swy([A[0] - 0.026, A[1] - 0.015], 1, 0.3), swy([A[0] - 0.014, 0.05], 1, 0.7), swy([A[0] + 0.004, 0.04], 1, 1), 0.01);
    const th3 = hThread([B[0] + 0.004, B[1] - 0.006], swy([B[0] - 0.012, B[1] - 0.04], 2, 0.3), swy([B[0] + 0.008, 0.07], 2, 0.7), swy([B[0] + 0.04, 0.03], 2, 1), 0.013);

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
    cut(ctx, path(slit));
  };
  // The Slime: one slumped heap, high shoulder left sliding into a long apron over the deck edge.
  // Folds are drooping lips that creep; the heap sags on a 6 s sine; drips pinch off and fall.
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
    const DROP = [[-20, -92], [-14, -101], [-20, -110], [-26, -101]];
    // the sketch's pixel literals as fractions of its H (1009)
    const SKH = 1009, SAG = 14 / SKH, SPREAD = 10 / SKH, GRAV = 1500 / SKH, FALL_END = 216 / SKH;

    return function (ctx, o) {
      const s = o.H / 1000, X = o.x, Y = o.footY, pal = o.pal;
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
      const k = 0.5 - 0.5 * Math.cos(TAU * t / 6);
      const sk = SAG * 1000 * k, fx = SPREAD * 1000 * k / 226;
      const clamp01 = function (v) { return Math.max(0, Math.min(1, v)); };
      // sag: top sinks, base spreads (weights vanish smoothly at the deck edge / the top)
      const T = function (p) {
        const wy = clamp01(p[1] / 338);
        return [p[0] * (1 + fx * (1 - wy)), p[1] - sk * wy];
      };
      const TT = function (pts) { return pts.map(T); };
      const HEAP_ = TT(HEAP);
      const WEBS_ = WEBS.map(TT);
      const LP = [8.1, 7.3, 8.9, 7.7], LF = [0.05, 0.31, 0.58, 0.82];
      const LIPS_ = LIPS.map(function (l, i) {
        const u = (t / LP[i] + LF[i]) % 1;
        const g = Math.sin(Math.PI * u);
        const dyo = (0.5 - u) * 70;
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
      const DRIPS_ = DC.map(function (c, i) {
        const u = (t / DP[i] + DF[i]) % 1, a = Math.min(1, u / PINCH);
        const e = Math.sin(Math.PI / 2 * a);
        let f = 0.35 + 1.35 * e, m = 1 - 0.55 * e * e;
        if (u > PINCH) {
          const b = clamp01((u - PINCH) / 0.15), r = 0.5 - 0.5 * Math.cos(Math.PI * b);
          f = 1.7 - 1.35 * r; m = 0.45 + 0.55 * r;
        }
        const len = DL[i] * f, w = DW[i];
        for (let j = 0; j < 2; j++) {
          const tau = (u + j - PINCH) * DP[i];
          if (tau < 0) continue;
          const dpx = 0.5 * GRAV * 1000 * tau * tau;
          const ty = -(DL[i] * 1.7 + 4) - dpx;
          if (-ty > FALL_END * 1000) continue;
          const rad = w * 0.8, ry = rad * (1 + Math.min(1.2, GRAV * SKH * tau * 0.0006));
          beads.push([[c, ty + ry], [c + rad, ty], [c, ty - ry], [c - rad, ty]]);
        }
        const wm = w * m;
        return TT([[c - w, 8], [c - wm * 0.55, -len * 0.5], [c - wm * 0.95, -len * 0.85], [c, -len - 4], [c + wm * 0.95, -len * 0.85], [c + wm * 0.55, -len * 0.5], [c + w, 8], [c, 12]]);
      });

      // inside the body (fill nonzero = union)
      ctx.fillStyle = pal.lit;
      [HEAP_].concat(WEBS_, DRIPS_, [DROP], beads).forEach(function (b) { ctx.beginPath(); blob(b); ctx.fill(); });

      // shade: the part of the heap not covered by itself moved up-left (right and under side)
      ctx.save();
      ctx.beginPath(); blob(HEAP_); ctx.clip();
      ctx.globalCompositeOperation = "source-atop"; ctx.fillStyle = pal.shade;
      ctx.beginPath(); big(); blob(HEAP_, -12, 3); ctx.fill("evenodd");
      ctx.restore();

      // lips: a thin shadow under a rounded body-tone bulge, with a short highlight, inside the heap only
      LIPS_.forEach(function (l) {
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
      sliver(HEAP_, 8, 8, -118, 300, 60, 40, 0.8);
      sliver(DRIPS_[1], 5, 0, -32, -30, 9, 24, 0);
      sliver(DRIPS_[2], 5, 0, 62, -22, 9, 18, 0);
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
    fn(ctx, { x: o.x, footY: o.footY, H: o.H, t: o.t || 0, pal: o.pal || PAL });
  }

  window.GenTitanBodies = { NAMES: NAMES, PAL: PAL, BOX: BOX, draw: draw };
})();
