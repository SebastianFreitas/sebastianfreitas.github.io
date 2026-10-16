/* genesis-gods.js — the five gods as flat silhouettes, one painter each,
   registered in GenFig.GOD_PAINT and picked by GenFig.drawGod on o.kind.
   Same contract as drawGod: (ctx, x, y, h, style, o) with y the FOOT
   line and h the body height in px; o = {a, face, ph, tilt,
   reach:{x, y, amt}, mood}. Local frame: lx forward (toward the face),
   ly up, both in units of h: X(lx) = x + f*lx*h, Y(ly) = y - ly*h.
   Light from the left: every volume is a shadedPoly split 30% in from
   its left edge (vol). Glow only on what emits light. GenFig.godHand
   (kind, x, yFoot, h, o, tx, ty) is where each god's beam leaves it at
   full reach; every painter puts its reaching hand, snout or jaws on that
   same point when reach.amt is 1. */
window.GenFig = window.GenFig || {};
(function (F) {
  const G = window.Gen;
  const { clamp, mix } = Util;
  const { circle } = Paint;
  const { flatGlow, mixHex } = GenPaint;
  const { fillPoly, shadedPoly, quad, withTilt } = F;
  const TAU = Math.PI * 2;

  // ---- kit ----
  function split(pts) {
    let minX = Infinity, maxX = -Infinity;
    for (const p of pts) { if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0]; }
    return minX + 0.3 * (maxX - minX);
  }
  function vol(ctx, pts, lit, shade) { shadedPoly(ctx, pts, split(pts), lit, shade); }
  function unit(dx, dy) { const l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; }
  function rgba(rgb, a) { return `rgba(${rgb},${a})`; }

  // uniform Catmull-Rom through ctrl ([x, y] pairs), per samples per segment,
  // endpoints clamped to the first/last control point
  function catmull(ctrl, per) {
    const n = ctrl.length, pts = [];
    for (let i = 0; i < n - 1; i++) {
      const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(n - 1, i + 2)];
      for (let k = 0; k < per; k++) {
        const u = k / per, u2 = u * u, u3 = u2 * u;
        pts.push([
          0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2
            + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3),
          0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2
            + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3),
        ]);
      }
    }
    pts.push([ctrl[n - 1][0], ctrl[n - 1][1]]);
    return pts;
  }

  // a closed polygon following pts at half-width rAt(u), u = i/(n-1); tuft
  // roughens every other cross-section by that fraction (0 = smooth)
  function ribbon(pts, rAt, tuft) {
    const n = pts.length, left = [], right = [];
    for (let i = 0; i < n; i++) {
      const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      const [dx, dy] = unit(b[0] - a[0], b[1] - a[1]);
      let r = rAt(i / (n - 1));
      if (tuft && (i & 1)) r *= 1 + tuft;
      left.push([p[0] - dy * r, p[1] + dx * r]);
      right.push([p[0] + dy * r, p[1] - dx * r]);
    }
    return left.concat(right.reverse());
  }

  // the "up" (screen) normal of pts at i, for laying flat shapes along a spine
  function upNormal(pts, i) {
    const n = pts.length, a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const [dx, dy] = unit(b[0] - a[0], b[1] - a[1]);
    let nx = -dy, ny = dx;
    if (ny > 0) { nx = -nx; ny = -ny; }
    return [nx, ny];
  }

  function frame(ctx, x, y, o, fn) {
    const a = o.a ?? 1;
    if (a < 0.01) return;
    ctx.save();
    ctx.globalAlpha = a;
    withTilt(ctx, x, y, (o.tilt || 0) * (o.face || 1), fn);
    ctx.restore();
  }

  // ---- where each god's beam leaves it, at full reach (screen px) ----
  const handOf = {
    almur(x, yFoot, h, f, tx, ty, o) {
      // the jaws, as almur() paints them: carried by the lean, wind-up, overshoot and pull back (head shift), lifted by the breath, and swung about the neck top by the idle loll, search, wind-up tip and overshoot dip
      o = o || {};
      const amt = o.reach ? clamp(o.reach.amt || 0, 0, 1) : 0, mv = almurMove(o, amt), sk = strikeOf(o), sq = Math.min(sk.pb, 1), cast = sk.sk || amt > 0 ? Math.max(sk.w, amt) : 0;
      const dx = f * h * ((o.lean || 0) - 0.10 * sq - 0.25 * mv.wu + 0.07 * mv.ov), dy = 0.07 * h * mv.ov;
      const rs = 0.04 * h * breathOf(G.t, o.ph || 0, 0.9) * 1.5 - 0.06 * h * sq + 0.08 * h * mv.wu + 0.04 * h * cast;
      let tip = 0;
      if (cast > 0) tip = f * 5 * Math.PI / 180 * cast * (o.reach && o.reach.y < yFoot - 1.018 * h ? -1 : 1);
      const a = f * 8 * Math.PI / 180 * Math.sin(G.t * 0.9 + (o.ph || 0)) * 1.5 + f * 10 * Math.PI / 180 * Math.sin(G.t * 6) * sk.pb + tip + almurSweep(o) - f * 0.35 * mv.wu + f * 0.15 * mv.ov;
      const jx = x + f * -0.042 * h + dx, jy = yFoot - 1.018 * h + dy - rs;
      const kn = Math.pow(1 / 1.07, 4), px = x + f * (0.7 * (0.09 + 0.025 * Math.sin(1.08 * 5)) - 0.14) * h + dx * kn, py = yFoot - (0.22 + 1.08 * 0.7) * h + dy * kn - rs;
      const ex = jx - px, ey = jy - py, c = Math.cos(a), sn = Math.sin(a);
      return { x: px + ex * c - ey * sn, y: py + ex * sn + ey * c };
    },
    maelu(x, yFoot, h, f, tx, ty) {
      const sx = x + f * 0.26 * h, sy = yFoot - 0.90 * h;
      const [ux, uy] = unit(tx - sx, ty - sy);
      return { x: sx + ux * 0.20 * h, y: sy + uy * 0.20 * h };
    },
    ulden(x, yFoot, h, f, tx, ty) {
      const sx = x + 0.065 * h, sy = yFoot - 0.84 * h;
      const [ux, uy] = unit(tx - sx, ty - sy);
      return { x: sx + ux * 0.08 * h, y: sy + uy * 0.08 * h };
    },
    ixu(x, yFoot, h, f) {
      return { x: x - f * 0.36 * h, y: yFoot - 0.37 * h };
    },
    orochronus(x, yFoot, h, f, tx, ty) {
      const sx = x + f * 0.82 * h, sy = yFoot - 0.45 * h;
      const [ux, uy] = unit(tx - sx, ty - sy);
      return { x: sx + ux * 0.30 * h, y: sy + uy * 0.30 * h };
    },
  };
  F.godHand = function godHand(kind, x, yFoot, h, o, tx, ty) {
    const fn = handOf[kind] || handOf.almur;
    return fn(x, yFoot, h, (o && o.face) || 1, tx, ty, o);
  };

  // ---- the five gods, crude flat stand-ins (phase 2 proof; phases 3-5 replace them) ----
  // every body is a flat two-tone polygon via vol; only a bob on o.ph moves
  const HORN = "#2a1b20";
  function bobOf(t, ph, h, k) { return 0.012 * h * Math.sin(t * (k || 1.2) + ph); }
  // a breath, 0 at the rest pose and 1 at the top of the rise
  function breathOf(t, ph, rate) { return 0.5 - 0.5 * Math.cos(t * rate + ph); }
  // gaits (o.gait = held steps taken so far): a weight, 0 standing and 1 once a step is in (smooth in), and a pulse that is 0 at every whole step
  function gaitW(o) { const g = o.gait || 0; if (!(g > 0)) return 0; const q = Math.min(g, 1); return q * q * (3 - 2 * q); }
  function gaitPulse(o) { return Math.sin(Math.PI * ((o.gait || 0) % 1)); }
  // strikes (o.cyc = the caller's strike-pulse angle, pulse power 6; o.cw its envelope weight; o.bind = pull-back weight):
  // w is the wind-up weight, 0 at rest, rising over the quarter turn before the act, 1 through it, falling over the quarter turn after (all scaled by cw);
  // pb is the pull back. A painter fades w out by (1 - reach.amt), so the act pose is the plain reach pose. No cyc: w 0.
  const STRIKE_CA = (() => {
    // the angle where G.strikePulse reaches 0.05: invert its smoothstep once
    let lo = 0, hi = 1;
    for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (m * m * (3 - 2 * m) < 0.05) lo = m; else hi = m; }
    return Math.asin(G.STRIKE_S0 + 0.25 * (lo + hi) / 2);
  })();
  const sm01 = (u) => u * u * (3 - 2 * u);
  function strikeOf(o) {
    const pb = clamp(o.bind || 0, 0, 1);
    if (o.cyc == null || !isFinite(o.cyc)) return { w: 0, pb, sk: false, ov: 0 };
    const H = Math.PI / 2, c = ((o.cyc % TAU) + TAU) % TAU, mod = (a) => ((a % TAU) + TAU) % TAU;
    const up = mod(c - (STRIKE_CA - H)), dn = mod(c - (Math.PI - STRIKE_CA));
    const w = up < H ? sm01(up / H) : c >= STRIKE_CA && c < Math.PI - STRIKE_CA ? 1 : dn < H ? 1 - sm01(dn / H) : 0;
    // ov: a damped overshoot over the recovery and the rest gap (u = 0..1 from the act's end to the next wind-up's start): swings past rest once, 1 at its peak, settled to 0 before the next wind-up
    const u = dn / (H + 2 * STRIKE_CA), ov = u < 1 ?Math.exp(-3 * u) * Math.sin(2 * Math.PI * u) / 0.48 : 0;
    return { w: w * clamp(o.cw == null ? 1 : o.cw, 0, 1), pb, sk: true, ov: ov * clamp(o.cw == null ? 1 : o.cw, 0, 1) };
  }
  // Almur's saga motion (a cyc caller only; both fade out by the reach, gone by amt 0.15): wu the wind-up, ov the recovery overshoot
  function almurMove(o, amt) {
    const sk = strikeOf(o), fade = 1 - clamp(amt / 0.15, 0, 1);
    return { wu: sk.w * fade, ov: sk.ov * fade };
  }
  // the search sweep of Almur's head about his neck top (radians), for the painter, his beam and the saga
  function almurSweep(o) { return 0.60 * ((o && o.search) || 0) * Math.sin(2.0 * G.t); }
  F.almurSweep = almurSweep;

  // Almur's floating throne: "back" (short legs, seat, backrest with a three-spike crest, back cushion, far armrest) under the body, "arm" (near armrest) over it
  function almurThrone(ctx, P, part) {
    const WOOD = "#6b4428", WOODS = "#3e2616", VEL = "#8a3a6a", VELS = "#4e1e3e", EDGE = "#a8744a";
    const poly = (c, lit, shade) => vol(ctx, c.map(([a, b]) => P(a, b)), lit, shade);
    const box = (a0, a1, b0, b1, lit, shade) => poly([[a0, b0], [a1, b0], [a1, b1], [a0, b1]], lit, shade);
    if (part === "back") {
      // four short legs (the far pair a step in), then the seat slab and its plum cushion
      for (const a of [-0.17, 0.065, -0.12, 0.02]) box(a, a + 0.05, 0.02, 0.15, WOOD, WOODS);
      for (const a of [-0.17, 0.065, -0.12, 0.02]) box(a - 0.01, a + 0.06, 0, 0.03, WOODS, WOODS);
      box(-0.19, 0.12, 0.14, 0.19, WOOD, WOODS);
      box(-0.19, 0.12, 0.185, 0.19, EDGE, EDGE);
      poly([[-0.17, 0.19], [0.09, 0.19], [0.11, 0.205], [0.09, 0.22], [-0.16, 0.22], [-0.18, 0.205]], VEL, VELS);
      // the backrest: a thin slab flush with his back, a little above his horns, a crest of three spikes
      poly([[-0.18, 0.22], [-0.18, 1.30], [-0.18, 1.40], [-0.1717, 1.34], [-0.1533, 1.52], [-0.135, 1.34], [-0.125, 1.40], [-0.125, 1.30], [-0.125, 0.22]], WOOD, WOODS);
      fillPoly(ctx, [[-0.18, 1.40], [-0.1717, 1.34], [-0.168, 1.36], [-0.178, 1.41]].map(([a, b]) => P(a, b)), EDGE);
      fillPoly(ctx, [[-0.1717, 1.34], [-0.1533, 1.52], [-0.15, 1.50], [-0.168, 1.34]].map(([a, b]) => P(a, b)), EDGE);
      // far armrest: a long arm from the backrest to a front post, set a little up and back; behind the coils
      box(0.02, 0.065, 0.22, 0.45, WOOD, WOODS);
      box(-0.125, 0.07, 0.45, 0.48, WOOD, WOODS);
      box(-0.125, 0.07, 0.475, 0.48, EDGE, EDGE);
      poly([[-0.125, 0.48], [0.065, 0.48], [0.08, 0.495], [0.065, 0.51], [-0.125, 0.51]], VEL, VELS);
    } else {
      // near armrest, across the front of the column: a front post, a wooden bar, a plum pad
      box(0.06, 0.11, 0.22, 0.37, WOOD, WOODS);
      box(-0.125, 0.11, 0.37, 0.40, WOOD, WOODS);
      box(-0.125, 0.11, 0.395, 0.40, EDGE, EDGE);
      poly([[-0.125, 0.40], [0.105, 0.40], [0.12, 0.415], [0.105, 0.43], [-0.125, 0.43]], VEL, VELS);
    }
  }

  // ---- ALMUR: a cobra column on two coils, set on a throne sized to him; a strike only bends neck and head ----
  function almur(ctx, x, y, h, style, o) {
    o = o || {};
    const f = o.face || 1, ph = o.ph || 0, t = G.t;
    const X = (lx) => x + f * lx * h, Y = (ly) => y - ly * h, P = (lx, ly) => [X(lx), Y(ly)];
    // the body is the phase 3 cobra, scaled by K and lifted onto the seat cushion (Xb/Yb/Pb), hb its unit
    const K = 0.7, YO = 0.22, XO = -0.14, hb = h * K;
    const Xb = (lx) => X(lx * K + XO), Yb = (ly) => Y(YO + ly * K), Pb = (lx, ly) => [Xb(lx), Yb(ly)];
    const amt = o.reach ? clamp(o.reach.amt || 0, 0, 1) : 0;
    const AM = 1.5; // idle amplitude scale
    const sk = strikeOf(o);
    const gw = gaitW(o), gp = gw * gaitPulse(o); // gait: the throne tips 4 degrees forward once per step, his head bobs 0.02 h
    const L = "#d24030", S = "#8e1a1c", GOLD = "#ffce50", TONGUE = "#1a0608", BONE = "#e4d6b4", BONES = "#9a8a66";
    frame(ctx, x, y, o, () => {
      ctx.translate(0, -bobOf(t, ph, h, 1.3));
      if (gw > 0) { const fp = P(0.12, 0); ctx.translate(fp[0], fp[1]); ctx.rotate(f * 4 * Math.PI / 180 * gp); ctx.translate(-fp[0], -fp[1]); }
      almurThrone(ctx, P, "back");
      // column geometry (body units); a plum back cushion fills the wedge between the backrest and the column's back
      const y0 = 0.08, y1 = 1.15, N = 24;
      const cx = (ly) => 0.09 + 0.025 * Math.sin(ly * 5);
      const hw = (ly) => 0.075 - 0.035 * (ly - y0) / (y1 - y0);
      const pad = [];
      for (let i = 0; i <= 10; i++) { const ly = 0.10 + 0.88 * i / 10; pad.push(P((cx(ly) - hw(ly)) * K + XO, YO + ly * K)); }
      vol(ctx, pad.concat([P(-0.125, YO + 0.98 * K), P(-0.125, YO + 0.10 * K)]), "#8a3a6a", "#4e1e3e");
      // the strike: he never lunges; he casts seated, only the head lifts 0.04 h and tips its jaws a few degrees toward the target
      const cast = sk.sk || amt > 0 ? Math.max(sk.w, amt) : 0;
      // lean (h units): the head moves that far forward, the neck bending to carry it
      let dxr = f * (o.lean || 0) * h, dyr = 0;
      const cl = 0.04 * h * cast;
      let tip = 0;
      if (cast > 0) {
        const jw = Pb(0.14, 1.14);
        tip = f * 5 * Math.PI / 180 * cast * (o.reach && o.reach.y < jw[1] ? -1 : 1);
      }
      // pull back: sunk 0.06 h into the backrest, head drawn back 0.10 h
      const sq = Math.min(sk.pb, 1);
      dxr -= f * 0.10 * h * sq;
      // saga wind-up (a cyc caller only): the neck coils back 0.25 h toward the backrest and up 0.08 h, the head tips up 0.35 rad, the lower column staying on it; the reach snaps them forward
      // then the recovery overshoots: the neck swings 0.07 h forward and down past rest once and settles
      const { wu, ov } = almurMove(o, amt); // gone by amt 0.15, so the beam (from the full-reach jaws) never leaves a head more than 0.03 h away
      dxr += f * h * (0.07 * ov - 0.25 * wu); dyr += 0.07 * h * ov;
      // idle: the column above the coils rises 0.04 h and settles; the head rides the top and lolls 8 degrees about the neck top
      const rise = 0.04 * h * breathOf(t, ph, 0.9) * AM - 0.06 * h * sq + 0.08 * h * wu;
      const lift = (ly) => { const q = clamp((ly - y0) / 0.3, 0, 1); return rise * q * q * (3 - 2 * q); };
      const loll = f * 8 * Math.PI / 180 * Math.sin(t * 0.9 + ph) * AM + f * 10 * Math.PI / 180 * Math.sin(t * 6) * sk.pb + tip + almurSweep(o) - f * 0.35 * wu + f * 0.15 * ov, lc = Math.cos(loll), ls = Math.sin(loll);
      const kn = Math.pow((1.08 - y0) / (y1 - y0), 4), pv = [Xb(cx(1.08)) + dxr * kn, Yb(1.08) + dyr * kn - rise - 0.02 * h * gp - cl];
      const D = (lx, ly) => {
        const px = Xb(lx) + dxr - pv[0], py = Yb(ly) + dyr - rise - 0.02 * h * gp - cl - pv[1];
        return [pv[0] + px * lc - py * ls, pv[1] + px * ls + py * lc];
      };
      // coil: a back loop, then a front loop on top set off by a shade-coloured rim, and a tail tip
      const Pk = (a, b) => P(-0.10 + (a + 0.26) * 0.40, YO + b * K), tube = (ctrl) => catmull(ctrl.map(([a, b]) => Pk(a, b)), 6);
      const back = tube([[-0.26, 0.05], [-0.16, 0.12], [0.02, 0.15], [0.19, 0.12], [0.27, 0.05]]);
      vol(ctx, ribbon(back, () => 0.04 * hb), L, S);
      // the tail runs on over the seat's front edge and hangs down in front of it
      const sw = 0.03 * Math.sin(t * 1.3 + ph) * AM;
      const tail = catmull([Pk(0.28, 0.09), P(0.15, 0.285), P(0.178 + 0.5 * sw, 0.24), P(0.186 + sw, 0.15)], 6);
      vol(ctx, ribbon(tail, (u) => (0.04 * (1 - u) + 0.003) * hb), L, S);
      const front = tube([[-0.22, 0.07], [-0.10, 0.045], [0.08, 0.04], [0.22, 0.055], [0.28, 0.09]]);
      fillPoly(ctx, ribbon(front, () => 0.05 * hb), S);
      vol(ctx, ribbon(front, () => 0.04 * hb), L, S);
      // column: 0.15 wide at the base, 0.08 at the neck, a slow S, rising from the front loop
      const kk = (ly) => { const q = (ly - y0) / (y1 - y0); return q * q * q * q; };
      // the breath also swells the belly up to 10% of the column's width: the front bulges, the back barely, so it stays flush on the backrest
      const bell = breathOf(t, ph, 0.9), swell = (ly) => Math.sin(Math.PI * clamp((ly - y0) / (y1 - y0), 0, 1));
      const C = (ly, side) => { const k = kk(ly), w = 1 + (side > 0 ? 0.14 : 0.06) * bell * swell(ly); return [Xb(cx(ly) + side * hw(ly) * w) + dxr * k, Yb(ly) + dyr * k - lift(ly)]; };
      const left = [], right = [];
      for (let i = 0; i <= N; i++) { const ly = y0 + (y1 - y0) * i / N; left.push(C(ly, -1)); right.push(C(ly, 1)); }
      vol(ctx, left.concat(right.reverse()), L, S);
      // gold belly bands every 0.12, on the front (belly) 40% of the column only
      for (let b = 0; b < 8; b++) {
        const ly = 0.20 + 0.12 * b;
        fillPoly(ctx, [C(ly, 0.2), C(ly, 1), C(ly + 0.02, 1), C(ly + 0.02, 0.2)], GOLD);
      }
      almurThrone(ctx, P, "arm");
      // two long old horns: bone, rooted on the back of the skull, sweeping back then hooking up and forward, three shade notches each
      const horn = (ctrl, lit, shade, notch) => {
        const sp = catmull(ctrl.map(([a, b]) => D(a, b)), 8), rAt = (u) => 0.036 * hb * Math.pow(1 - u, 0.85) + 0.002 * hb;
        vol(ctx, ribbon(sp, rAt), lit, shade);
        for (const u of [0.25, 0.45, 0.65]) {
          const i = Math.round(u * (sp.length - 1)), a = sp[i - 1], b = sp[i + 1], p = sp[i];
          const [tx, ty] = unit(b[0] - a[0], b[1] - a[1]), r = rAt(u), w = 0.007 * hb;
          fillPoly(ctx, [[p[0] - ty * r - tx * w, p[1] + tx * r - ty * w], [p[0] + ty * r - tx * w, p[1] - tx * r - ty * w],
            [p[0] + ty * r + tx * w, p[1] - tx * r + ty * w], [p[0] - ty * r + tx * w, p[1] + tx * r + ty * w]], notch);
        }
      };
      horn([[-0.07, 1.31], [-0.14, 1.38], [-0.20, 1.46], [-0.20, 1.54], [-0.10, 1.60]], "#b0a07a", BONES, "#7a6c4c");
      // head 0.20 x 0.11, tipped 25 degrees down, snout (the jaws) at (0.14, 1.14)
      const ca = Math.cos(0.4363), sa = Math.sin(0.4363);
      const H = (u, v) => D(0.14 + u * ca + v * sa, 1.14 - u * sa + v * ca);
      // short neck flare where the column meets the head
      vol(ctx, [C(1.08, -1), H(-0.19, 0.0), H(-0.12, -0.055), C(1.08, 1)], L, S);
      // forked tongue from the mouth
      const m = H(0.0, -0.004), tg = [m[0] + f * 0.05 * h, m[1] + 0.018 * h];
      if ((((t + ph * 1.7) % 2.5) + 2.5) % 2.5 < 0.15) {
        fillPoly(ctx, [[m[0], m[1] - 0.004 * h], [m[0], m[1] + 0.004 * h], [tg[0] - f * 0.012 * h, tg[1]]], TONGUE);
        fillPoly(ctx, [[tg[0] - f * 0.015 * h, tg[1] - 0.001 * h], [tg[0] + f * 0.02 * h, tg[1] - 0.012 * h], [tg[0] + f * 0.006 * h, tg[1] + 0.002 * h]], TONGUE);
        fillPoly(ctx, [[tg[0] - f * 0.015 * h, tg[1] + 0.001 * h], [tg[0] + f * 0.02 * h, tg[1] + 0.014 * h], [tg[0] + f * 0.006 * h, tg[1] - 0.002 * h]], TONGUE);
      }
      vol(ctx, [[-0.20, 0.015], [-0.17, 0.055], [-0.10, 0.05], [-0.04, 0.03], [0, 0.012], [0, -0.012], [-0.05, -0.03], [-0.12, -0.055], [-0.18, -0.045]].map(([u, v]) => H(u, v)), L, S);
      // brow ridge over the eye
      fillPoly(ctx, [H(-0.14, 0.04), H(-0.10, 0.062), H(-0.04, 0.034), H(-0.09, 0.03)], S);
      const e = H(-0.09, 0.008);
      flatGlow(ctx, e[0], e[1], 0.05 * hb, "255,70,40", 0.7);
      circle(ctx, e[0], e[1], 0.012 * hb, "#ff4a30");
      if (cast > 0) {
        // the cast: a red-gold glow builds at the open jaws
        const jg = H(0, 0), gr = (0.03 + 0.06 * cast) * h * (sk.sk ? 1.7 : 1), ga = Math.min(1, (0.2 + 0.7 * cast) * (sk.sk ? 1.8 : 1));
        flatGlow(ctx, jg[0], jg[1], gr, "210,70,48", ga);
        flatGlow(ctx, jg[0], jg[1], gr * 0.5, "255,190,90", ga);
      }
      // a lid in the skin colour droops over 50-70% of the eye, slowly
      const lidv = 0.008 + 0.012 - 0.024 * (0.5 + 0.2 * (0.5 + 0.5 * Math.sin(t + ph)));
      fillPoly(ctx, [H(-0.108, lidv), H(-0.072, lidv), H(-0.072, 0.0235), H(-0.108, 0.0235)], L);
      horn([[0.07, 1.24], [-0.04, 1.25], [-0.16, 1.28], [-0.27, 1.34], [-0.30, 1.42], [-0.24, 1.47]], BONE, BONES, BONES);
    });
  }

  // ---- MAELU: a faceless crane-monster, a raised V of half-spread wings over a small white body, S neck, one bent bird leg ----
  function maelu(ctx, x, y, h, style, o) {
    o = o || {};
    const f = o.face || 1, ph = o.ph || 0, t = G.t;
    const X = (lx) => x + f * lx * h, Y = (ly) => y - ly * h, P = (lx, ly) => [X(lx), Y(ly)];
    const amt = o.reach ? clamp(o.reach.amt || 0, 0, 1) : 0;
    // strikes: the wind-up (faded out by the reach) and the pull back lift the wrists to ly 1.00; the pull back closes the wings to a 0.60 h span;
    // the act sweeps the far wing back and down. Each wing's scale, lift and rotation, and the wrist's screen shift from its plain pose
    // (the wind-up lift is doubled, and the body leans back 0.04 h with it)
    const sk = strikeOf(o), mu = sk.w * (1 - amt), lw = Math.min(2 * mu + sk.pb, 1 + mu), lean = -f * 0.04 * h * mu;
    const wingK = (k) => k + (0.29 - k) * sk.pb, wingLift = (k) => lw * (0.40 - 0.30 * wingK(k)), wingRot = (s) => (s < 0 && sk.sk ? 0.85 * amt : 0);
    const wristD = (s, k) => {
      if (!lw && !sk.pb && !wingRot(s)) return [0, 0];
      const ke = wingK(k), th = wingRot(s), dx = 0.21 * ke, dy = 0.30 * ke, c = Math.cos(th), sn = Math.sin(th);
      return [f * s * (0.05 + dx * c + dy * sn - 0.05 - 0.21 * k) * h, -(0.60 - dx * sn + dy * c - 0.60 - 0.30 * k) * h - wingLift(k) * h];
    };
    const W = "#f4f2f8", WS = "#c9c6d6", TIP = "#b4b0c4", LEG = "#a89c88", LEGS = "#7a705f", GOLD = "255,206,80";
    // idle: both wrists lift 0.05 h and settle (fingers spread 5 deg), the neck bobs 0.02 h, the far leg swings 10 deg from the hip
    const wb = breathOf(t, ph, 1.6), wl = -0.05 * h * wb, spread = 5 * Math.PI / 180 * wb;
    const nbob = -0.02 * h * Math.sin(t * 1.1 + ph), swing = 10 * Math.PI / 180 * Math.sin(t * 1.1 + ph);
    // gait: one slow stroke per two steps, wings down for 60% of it (+1 down, -1 up); the wings swing 10 degrees either side, the body rises on the downstroke
    const gw = gaitW(o), gc = ((o.gait || 0) / 2) % 1, gu = gc < 0.6 ? 0.5 * gc / 0.6 : 0.5 + 0.5 * (gc - 0.6) / 0.4;
    const gs = gw * Math.sin(2 * Math.PI * gu), gth = 10 * Math.PI / 180 * gs, gcs = Math.cos(gth), gsn = Math.sin(gth);
    const wrot = (a, b) => (gw > 0 ? [0.05 + (a - 0.05) * gcs + (b - 0.60) * gsn, 0.60 - (a - 0.05) * gsn + (b - 0.60) * gcs] : [a, b]);
    frame(ctx, x, y, o, () => {
      ctx.translate(0, -bobOf(t, ph, h, 1.1) - 0.015 * h * gs);
      let dxr = 0, dyr = 0;
      if (amt > 0) {
        const rest = P(0.26, 0.90);
        const [ux, uy] = unit(o.reach.x - rest[0], o.reach.y - rest[1]);
        dxr = ux * 0.20 * h * amt; dyr = uy * 0.20 * h * amt;
      }
      // a huge raised wing (s = +1 near, -1 far; k scales it about the shoulder): arched leading edge to a wrist at (0.26, 0.90),
      // a scalloped trailing hem, seven long separate primaries fanned off the outer edge
      const wing = (s, k, lit, shade, tipc) => {
        const Q = (a, b) => {
          const ke = wingK(k), th = wingRot(s);
          let rq = wrot(0.05 + (a - 0.05) * ke, 0.60 + (b - 0.60) * ke);
          if (th) { const dx = rq[0] - 0.05, dy = rq[1] - 0.60, c = Math.cos(th), sn = Math.sin(th); rq = [0.05 + dx * c + dy * sn, 0.60 - dx * sn + dy * c]; }
          const q = P(s * rq[0], rq[1]), wq = clamp((a - 0.05) / 0.21, 0, 1);
          return [q[0], q[1] + wl * wq - wingLift(k) * h * wq];
        };
        const lead = [[0.05, 0.62], [0.16, 0.78], [0.26, 0.90], [0.42, 1.00], [0.60, 1.04], [0.76, 1.00]];
        const base = [[0.74, 1.00], [0.68, 1.01], [0.58, 1.00], [0.48, 0.97], [0.38, 0.94], [0.30, 0.91], [0.26, 0.88]];
        const tips0 = [[0.90, 0.92], [0.88, 0.80], [0.82, 0.68], [0.74, 0.58], [0.64, 0.50], [0.52, 0.44], [0.40, 0.42]];
        // each primary fans out about its base: the top ones up, the low ones down
        const tips = tips0.map(([tx, ty], i) => {
          const a = spread * (3 - i) / 3, ca = Math.cos(a), sa = Math.sin(a), dx = tx - base[i][0], dy = ty - base[i][1];
          return [base[i][0] + dx * ca - dy * sa, base[i][1] + dx * sa + dy * ca];
        });
        const pts = lead.slice();
        for (let i = 0; i < tips.length; i++) {
          pts.push(tips[i]);
          if (i < tips.length - 1) {
            const m = [(tips[i][0] + tips[i + 1][0]) / 2, (tips[i][1] + tips[i + 1][1]) / 2];
            pts.push([m[0] + (0.10 - m[0]) * 0.18, m[1] + (0.62 - m[1]) * 0.18]);
          }
        }
        pts.push([0.20, 0.44], [0.08, 0.46]);
        vol(ctx, pts.map(([a, b]) => Q(a, b)), lit, shade);
        for (let i = 0; i < tips.length; i++) {
          const [bx, by] = base[i], [tx, ty] = tips[i], nl = Math.hypot(tx - bx, ty - by), nx = -(ty - by) / nl * 0.026, ny = (tx - bx) / nl * 0.026;
          vol(ctx, [Q(bx + nx, by + ny), Q(tx, ty), Q(bx - nx, by - ny)], tipc, shade);
        }
      };
      // three talons hung from the wrist; the near ones carry the beam
      const talons = (s, near, wk) => {
        // the wrist swings with its wing (gait)
        const wr = wrot(0.05 + 0.21 * wk, 0.60 + 0.30 * wk);
        let gx = f * s * (wr[0] - 0.05 - 0.21 * wk) * h, gy = -(wr[1] - 0.60 - 0.30 * wk) * h;
        const wd = wristD(s, wk);
        gx += wd[0]; gy += wd[1];
        const gl = near && amt > 0.05, ox = (near ? dxr : 0) + gx, oy = (near ? dyr : 0) + gy;
        if (near && amt > 0) {
          const w = P(s * 0.26, 0.92);
          vol(ctx, quad(w[0] + gx, w[1] + wl + gy, X(s * 0.26) + dxr + gx, Y(0.90) + dyr + wl + gy, 0.022 * h), TIP, WS);
        }
        const gm = Math.max(sk.w * 0.7, amt);
        if (gl && !(sk.w > 0)) flatGlow(ctx, X(s * 0.26) + dxr + gx, Y(0.90) + dyr + wl + gy, 0.10 * h, GOLD, 0.6 * amt);
        else if (near && sk.w > 0 && gm > 0.05) flatGlow(ctx, X(s * 0.26) + dxr + gx, Y(0.90) + dyr + wl + gy, (0.03 + 0.10 * gm) * h * 1.7, GOLD, Math.min(1, 0.6 * gm * 1.8));
        for (const k of [-1, 0, 1]) {
          const bx = X(s * (0.26 + k * 0.014)) + ox, by = Y(0.92) + oy + wl, tx = X(s * (0.26 + k * 0.02)) + ox, ty = Y(0.84) + oy + wl;
          fillPoly(ctx, [[bx - 0.007 * h, by], [bx + 0.007 * h, by], [tx, ty]], gl ? "#ffce50" : LEGS);
        }
      };
      wing(-1, 0.88, "#dcdae8", "#aeabc0", "#a29fb6");
      talons(-1, false, 0.88);
      // the far leg, behind the body and a shade darker: rooted a little back, bent well clear of the near one, its own small foot
      const FL = (a, b) => {
        const da = a + 0.04, db = b - 0.38, c = Math.cos(swing), s = Math.sin(swing);
        return P(-0.04 + da * c - db * s, 0.38 + da * s + db * c);
      };
      const farLeg = catmull([FL(-0.04, 0.38), FL(-0.13, 0.29), FL(-0.22, 0.20), FL(-0.18, 0.11), FL(-0.13, 0.03)], 6);
      vol(ctx, ribbon(farLeg, () => 0.011 * h), "#8f8472", "#615848");
      const fk = FL(-0.22, 0.20);
      circle(ctx, fk[0], fk[1], 0.0175 * h, "#615848");
      for (const [deg, len] of [[-25, 0.06], [0, 0.06], [25, 0.06], [180, 0.035]]) {
        const r = deg * Math.PI / 180, [bx, by] = FL(-0.13, 0.03), [tx, ty] = FL(-0.13 + Math.cos(r) * len, 0.03 + Math.sin(r) * len);
        fillPoly(ctx, [[bx, by - 0.008 * h], [tx, ty], [bx, by + 0.008 * h]], "#615848");
      }
      // the near bird leg: white thigh tuft, ankle bent backward with a knob, shank to a splayed foot (three forward toes, one hind)
      const leg = catmull([P(0.0, 0.38), P(-0.04, 0.29), P(-0.08, 0.20), P(-0.03, 0.11), P(0.02, 0.03)], 6);
      vol(ctx, ribbon(leg, () => 0.011 * h), LEG, LEGS);
      circle(ctx, X(-0.08), Y(0.20), 0.0175 * h, LEGS);
      const toe = (deg, len) => {
        const r = deg * Math.PI / 180, bx = X(0.02), by = Y(0.03), tx = bx + f * Math.cos(r) * len * h, ty = by - Math.sin(r) * len * h;
        fillPoly(ctx, [[bx, by - 0.008 * h], [tx, ty], [bx, by + 0.008 * h]], LEGS);
      };
      toe(-25, 0.07); toe(0, 0.07); toe(25, 0.07);
      toe(180, 0.04);
      vol(ctx, [[-0.04, 0.40], [0.0, 0.43], [0.04, 0.40], [0.04, 0.34], [0.0, 0.32], [-0.04, 0.34]].map(([a, b]) => P(a, b)), W, WS);
      // white teardrop body ly 0.36-0.66
      vol(ctx, [[0.0, 0.66], [0.07, 0.60], [0.10, 0.52], [0.08, 0.43], [0.0, 0.36], [-0.07, 0.42], [-0.10, 0.52], [-0.07, 0.60]].map(([a, b]) => { const q = P(a, b); return [q[0] + lean, q[1]]; }), W, WS);
      // bare S neck rising between the wings, then the faceless head and beak, clear of the near wing
      const PN = (a, b) => { const q = P(a, b), nw = clamp((b - 0.62) / 0.33, 0, 1); return [q[0] - f * 0.06 * h * sk.pb * nw + lean, q[1] + nbob * nw]; };
      const neck = catmull([PN(0.0, 0.62), PN(-0.04, 0.74), PN(0.0, 0.86), PN(0.01, 0.95)], 8);
      vol(ctx, ribbon(neck, () => 0.014 * h), LEG, LEGS);
      vol(ctx, [[-0.015, 0.96], [0.0, 1.0], [0.035, 1.01], [0.055, 0.99], [0.035, 0.95], [0.005, 0.94]].map(([a, b]) => PN(a, b)), W, WS);
      fillPoly(ctx, [PN(0.05, 0.995), PN(0.06, 0.97), PN(0.11, 0.955)], LEG);
      wing(1, 1, W, WS, TIP);
      talons(1, true, 1);
    });
  }

  // ---- SERUS (Orochronus): a horizontal airborne serpent dragon, 1.5 h of body in four half-waves ----
  function orochronus(ctx, x, y, h, style, o) {
    o = o || {};
    const f = o.face || 1, ph = o.ph || 0, t = G.t;
    const X = (lx) => x + f * lx * h, Y = (ly) => y - ly * h, P = (lx, ly) => [X(lx), Y(ly)];
    const amt = o.reach ? clamp(o.reach.amt || 0, 0, 1) : 0;
    const L = "#5e6178", S = "#3a3d4e";
    const gw = gaitW(o); // gait: one or two big crests (wavelength 1.4 h) slide tailward, one wave per step
    frame(ctx, x, y, o, () => {
      ctx.translate(0, -bobOf(t, ph, h, 0.9));
      let dxr = 0, dyr = 0;
      if (amt > 0) {
        const rest = P(0.82, 0.45);
        const [ux, uy] = unit(o.reach.x - rest[0], o.reach.y - rest[1]);
        dxr = ux * 0.30 * h * amt; dyr = uy * 0.30 * h * amt;
      }
      const D = (lx, ly) => [X(lx) + dxr, Y(ly) + dyr - hy];
      // body from the tail (lx -0.84) to the neck (0.66): centreline ly 0.45, wavelength 0.75, amplitude 0.15
      const x0 = -0.84, seg = 0.375, amp = 0.15;
      // idle: a ripple of 0.03 h runs tailward along the body (zero at t = 0), the head riding the front end
      const ripple = (lx) => 0.03 * (Math.sin(TAU * (lx - x0) / (2 * seg) + 1.4 * t + ph) - Math.sin(TAU * (lx - x0) / (2 * seg) + ph))
        + gw * 0.32 * clamp((0.66 - lx) / 1.5, 0, 1) * Math.sin(TAU * (lx / 1.4 + (o.gait || 0)));
      const spY = (lx) => 0.45 + amp * Math.sin(TAU * (lx - x0) / (2 * seg)) + ripple(lx);
      const hy = ripple(0.66) * h;
      const hwAt = (lx) => 0.01 + 0.04 * clamp((lx - x0) / (4 * seg), 0, 1);
      // fin ridge along the back, 0.03 h spikes
      for (let lx = -0.74; lx < 0.60; lx += 0.07) {
        const s = (spY(lx + 0.01) - spY(lx - 0.01)) / 0.02, nl = Math.hypot(s, 1);
        const nx = -s / nl, ny = 1 / nl, r = hwAt(lx) - 0.004;
        const bx = lx + nx * r, by = spY(lx) + ny * r;
        fillPoly(ctx, [P(bx - 0.016, by - 0.016 * s), P(bx + 0.016, by + 0.016 * s), P(bx + nx * 0.03 - 0.008, by + ny * 0.03)], S);
      }
      // four short legs under the belly, three claws each
      for (const lx of [-0.34, -0.18, 0.18, 0.34]) {
        const bx = lx, by = spY(lx) - hwAt(lx) + 0.01, fx = lx + 0.015, fy = by - 0.08;
        const a = P(bx, by), b = P(fx, fy);
        vol(ctx, quad(a[0], a[1], b[0], b[1], 0.026 * h), L, S);
        for (const d of [-0.022, 0, 0.022]) fillPoly(ctx, [P(fx - 0.01, fy), P(fx + 0.01, fy), P(fx + d, fy - 0.026)], S);
      }
      // the four half-wave segments, each its own volume
      for (let s = 0; s < 4; s++) {
        const pts = [];
        for (let i = 0; i <= 10; i++) {
          const lx = x0 + (s - 0.04 + 1.08 * i / 10) * seg;
          pts.push(P(lx, spY(lx)));
        }
        vol(ctx, ribbon(pts, (v) => hwAt(x0 + (s + v) * seg) * h, 0), L, S);
      }
      // neck bridging to the head, horns and barbels behind it
      const na = P(0.62, 0.45 + ripple(0.62)), nb = D(0.68, 0.46);
      vol(ctx, quad(na[0], na[1], nb[0], nb[1], 0.10 * h), L, S);
      fillPoly(ctx, [D(0.68, 0.51), D(0.72, 0.52), D(0.57, 0.61)], S);
      fillPoly(ctx, [D(0.65, 0.50), D(0.69, 0.51), D(0.54, 0.56)], S);
      fillPoly(ctx, [D(0.80, 0.44), D(0.81, 0.435), D(0.71, 0.375), D(0.70, 0.385)], S);
      fillPoly(ctx, [D(0.78, 0.43), D(0.79, 0.425), D(0.68, 0.35), D(0.67, 0.36)], S);
      // jaws: the upper head and a lower jaw hung open; the snout tip is the handOf point
      vol(ctx, [[0.65, 0.40], [0.70, 0.435], [0.79, 0.445], [0.82, 0.42], [0.72, 0.38]].map(([p, q]) => D(p, q)), L, S);
      vol(ctx, [[0.64, 0.51], [0.74, 0.52], [0.84, 0.46], [0.78, 0.455], [0.70, 0.44], [0.64, 0.42]].map(([p, q]) => D(p, q)), L, S);
      const e = D(0.73, 0.495);
      flatGlow(ctx, e[0], e[1], 0.06 * h, "196,206,226", 0.7);
      circle(ctx, e[0], e[1], 0.014 * h, "#e6ecf8");
    });
  }

  // ---- ULDEN: an empty dark hood on a thread, small blue owl eyes in the hole, a long white beard, no hands ----
  function ulden(ctx, x, y, h, style, o) {
    o = o || {};
    const f = o.face || 1, ph = o.ph || 0, t = G.t;
    const X = (lx) => x + f * lx * h, Y = (ly) => y - ly * h, P = (lx, ly) => [X(lx), Y(ly)];
    const amt = o.reach ? clamp(o.reach.amt || 0, 0, 1) : 0;
    const CLO = "#32303a", CLS = "#262429", RIM = "#8a90a0", BRIM = "#4a4650", THR = "#6a7080", HOLE = "#000000", M = "#b8b2a6", MS = "#85807a", BLUE = "#4682ff", BLUE_RGB = "70,130,255";
    const sk = strikeOf(o), uw = sk.w * (1 - amt); // strikes: the wind-up (faded out by the reach) lifts the hood 0.12 h, tips it back 16 degrees, brightens the eyes (and a blue glow builds on each); the pull back sinks it 0.04 h, narrows the eyes, trembles it
    const gw = gaitW(o), gp = gw * gaitPulse(o); // gait: the hood tips 5 degrees forward each step, the beard swings back 0.03 h, the tail's lower half lags 0.05 h
    frame(ctx, x, y, o, () => {
      ctx.translate(0, -0.02 * h * Math.sin(t * 1.2 + ph));
      // idle: breath lifts the hood, the beard tip stirs, the mantle edge ripples, the thread sways, the eyes glow and blink
      const rise = 0.04 * h * breathOf(t, ph, 1.2) + 0.12 * h * uw - 0.04 * h * sk.pb;
      // a reach leans the hood 0.08 h toward the target, full at the eyes (ly 0.84), none below ly 0.20
      let dxr = 0, dyr = 0;
      if (amt > 0) {
        const rest = P(0.065, 0.84);
        const [ux, uy] = unit(o.reach.x - rest[0], o.reach.y - rest[1]);
        dxr = ux * 0.08 * h * amt; dyr = uy * 0.08 * h * amt;
      }
      const L = (lx, ly) => {
        const w = clamp((ly - 0.2) / 0.64, 0, 1);
        return [X(lx) + dxr * w + f * Math.sin(5 * Math.PI / 180) * gp * Math.max(ly - 0.2, 0) * h - f * Math.sin(16 * Math.PI / 180) * uw * Math.max(ly - 0.2, 0) * h + 0.01 * h * Math.sin(t * 12) * sk.pb * w, Y(ly) + dyr * w - rise * w];
      };
      const Lm = (lx, ly) => {
        const q = L(lx, ly);
        q[0] += 0.025 * h * Math.sin(t * 2.0 + ph + ly * 9) * clamp((0.5 - ly) / 0.5, 0, 1) * clamp((ly + 0.73) / 0.5, 0, 1);
        return q;
      };
      const Lb = (lx, ly) => {
        const q = L(lx, ly);
        q[0] += 0.03 * h * Math.sin(t * 1.5 + ph) * clamp((0.6 - ly) / 0.55, 0, 1) - f * 0.03 * h * gp * clamp((0.6 - ly) / 0.55, 0, 1);
        return q;
      };
      // the tail: from the mantle point to 0.05 h below the canvas bottom, whatever the caller's transform
      // (no thread if the hood tip is already below the canvas)
      const s0 = P(0.0, -0.72);
      const m = ctx.getTransform(), sd = m.transformPoint({ x: s0[0], y: s0[1] });
      if (sd.y < ctx.canvas.height) {
        const e0 = m.inverse().transformPoint({ x: sd.x, y: ctx.canvas.height + 0.05 * h * Math.hypot(m.a, m.b) });
        const tdx = e0.x - s0[0], tdy = e0.y - s0[1], [tux, tuy] = unit(tdx, tdy);
        const bowMax = Math.min(0.03 * h, 0.12 * Math.hypot(tdx, tdy));
        const spine = [];
        for (let i = 0; i <= 24; i++) {
          const u = i / 24, bow = bowMax * Math.sin(u * TAU) + 0.02 * h * Math.sin(t * 0.9 + ph) * Math.sin(u * Math.PI);
          spine.push([s0[0] + tdx * u - tuy * bow - f * 0.05 * h * gp * clamp((u - 0.5) * 2, 0, 1), s0[1] + tdy * u + tux * bow]);
        }
        // the thread: at least 0.009 h and 2 device px wide all the way down
        const tr = Math.max(0.0045 * h, 1 / Math.hypot(m.a, m.b));
        fillPoly(ctx, ribbon(spine, () => tr), THR);
      }
      // hood and cloak, about 1.5x as long before the taper into the thread, then the shade fold along the hood's front rim
      vol(ctx, ([[-0.04, 1.04], [0.14, 0.93], [0.17, 0.78], [0.14, 0.66], [0.24, 0.56], [0.225, 0.20], [0.19, -0.20], [0.10, -0.52], [0.0, -0.73], [-0.09, -0.50], [-0.18, -0.18], [-0.22, 0.20], [-0.24, 0.52], [-0.18, 0.82], [-0.12, 0.98]]).map(([a, b]) => Lm(a, b)), CLO, CLS);
      fillPoly(ctx, ribbon(catmull([L(0.13, 0.925), L(0.155, 0.78), L(0.125, 0.67)], 6), () => 0.015 * h), CLS);
      // lit rim: a thin band pulled in from the outline, tapering out at both ends
      const rim = (pts) => {
        const c = L(0.0, 0.6), r = catmull(pts.map(([a, b]) => Lm(a, b)), 6);
        const q = r.map(([a, b]) => { const [ux, uy] = unit(c[0] - a, c[1] - b); return [a + ux * 0.007 * h, b + uy * 0.007 * h]; });
        fillPoly(ctx, ribbon(q, (u) => 0.010 * h * Math.sin(Math.PI * u)), RIM);
      };
      rim([[-0.18, 0.82], [-0.12, 0.98], [-0.04, 1.04], [0.14, 0.93]]);
      rim([[0.17, 0.74], [0.14, 0.66], [0.24, 0.56], [0.225, 0.20], [0.20, -0.12]]);
      rim([[-0.18, 0.78], [-0.24, 0.52], [-0.22, 0.20], [-0.20, -0.12]]);
      // the empty face, in a lighter brim band 0.015 h wide
      const hole = [], brim = [];
      for (let i = 0; i < 24; i++) {
        const a = i / 24 * TAU;
        hole.push(L(0.06 + 0.075 * Math.cos(a), 0.81 + 0.11 * Math.sin(a)));
        brim.push(L(0.06 + 0.090 * Math.cos(a), 0.81 + 0.125 * Math.sin(a)));
      }
      fillPoly(ctx, brim, BRIM);
      fillPoly(ctx, hole, HOLE);
      // small owl eyes: glow and solid blue discs, slanted brows
      const shut = (((t + ph * 1.7) % 3.1) + 3.1) % 3.1 < 0.12;
      for (const ex of shut ? [] : [0.03, 0.10]) {
        const c = L(ex, 0.84);
        flatGlow(ctx, c[0], c[1], 0.035 * h, BLUE_RGB, 0.6 + 0.1 * Math.sin(t * 1.2 + ph) + (1 - 0.6 - 0.1 * Math.sin(t * 1.2 + ph)) * uw);
        const eg = sk.sk ? Math.max(sk.w, amt) : 0;
        if (eg > 0) flatGlow(ctx, c[0], c[1], (0.03 + 0.03 * eg) * h * 1.7, BLUE_RGB, Math.min(1, 0.9 * eg * 1.8));
        if (sk.pb > 0) { ctx.fillStyle = BLUE; ctx.beginPath(); ctx.ellipse(c[0], c[1], 0.016 * h, 0.016 * h * (1 - 0.6 * sk.pb), 0, 0, TAU); ctx.fill(); }
        else circle(ctx, c[0], c[1], 0.016 * h, BLUE);
      }
      for (const [a, b, c, d] of [[0.0, 0.895, 0.055, 0.862], [0.075, 0.862, 0.13, 0.895]]) {
        const p = L(a, b), q = L(c, d);
        fillPoly(ctx, quad(p[0], p[1], q[0], q[1], 0.008 * h), HOLE);
      }
      // the beard grows from under the eyes: a soft bumpy top edge, spreading, then tapering; a few thin strands
      const top = [[-0.005, 0.70], [0.012, 0.748], [0.03, 0.728], [0.046, 0.762], [0.062, 0.736], [0.078, 0.766], [0.094, 0.732], [0.108, 0.752], [0.125, 0.70]];
      const side = [[0.138, 0.60], [0.128, 0.45], [0.105, 0.28], [0.078, 0.14], [0.062, 0.05], [0.04, 0.14], [0.015, 0.28], [-0.008, 0.45], [-0.016, 0.60]];
      vol(ctx, catmull(top.concat(side, [top[0]]).map(([a, b]) => Lb(a, b)), 6), M, MS);
      for (const sp of [[[0.02, 0.72], [0.008, 0.52], [0.03, 0.32], [0.045, 0.14]], [[0.062, 0.72], [0.07, 0.5], [0.055, 0.3], [0.058, 0.1]], [[0.10, 0.72], [0.115, 0.52], [0.09, 0.32], [0.075, 0.16]]]) {
        fillPoly(ctx, ribbon(catmull(sp.map(([a, b]) => Lb(a, b)), 6), (u) => 0.0035 * h * (1 - u)), "#8a857b");
      }
    });
  }

  // ---- IXU: a jelly-headed robed figure, clear bell and glowing core, frilled collar, veil-robe, clawed arms, trailing tentacles ----
  const MOOD = { ok: [255, 255, 255], happy: [255, 214, 72], angry: [255, 64, 48], sad: [80, 140, 255] };
  function ixu(ctx, x, y, h, style, o) {
    o = o || {};
    const f = o.face || 1, ph = o.ph || 0, t = G.t;
    const X = (lx) => x + f * lx * h, Y = (ly) => y - ly * h, P = (lx, ly) => [X(lx), Y(ly)];
    const AM = 1; // idle amplitude scale
    const gw = gaitW(o), gp = gw * gaitPulse(o); // gait: the pearl bobs 0.02 h and the gown pieces beat once per step
    const BELL = "#e9eef6", CL = "#fff6ea", CS = "#d8ccc0";
    frame(ctx, x, y, o, () => {
      ctx.translate(0, -bobOf(t, ph, h, 1.3));
      // colour drifts from the base mood toward a slow-cycling target mood
      const base = MOOD[o.mood] || MOOD.ok;
      const k = 0.5 + 0.5 * Math.sin(t * 0.55 + ph);
      const j = 0.5 + 0.5 * Math.sin(t * 0.23 + ph * 1.7);
      const target = j < 0.33 ? MOOD.happy : j < 0.66 ? MOOD.sad : MOOD.angry;
      const rgb = base.map((c, i) => Math.round(mix(c, target[i], 0.25 * k))).join(",");
      const alpha = (a, fn) => { ctx.save(); ctx.globalAlpha *= a; fn(); ctx.restore(); };

      // gown: three wing-pieces joined under the pearl, each flowing into tentacles that leave its tip down and back
      // idle: the roots rise 0.04 h and settle; each piece beats like a slow wing about its root (the lower ones a beat behind)
      const br = breathOf(t, ph, 1.3) * AM, rise = 0.04 * br;
      const roots = [[0.04, 0.70 + rise], [0.04, 0.69 + rise], [0.04, 0.68 + rise]];
      const tips = [[-0.40, 0.52], [-0.30, 0.26], [-0.12, 0.14]].map(([a, b], i) => {
        const g = 4 * Math.PI / 180 * Math.sin(1.3 * (t - 0.25 * i) + ph) * AM + 9 * Math.PI / 180 * gw * Math.sin(2 * Math.PI * (o.gait || 0)), c = Math.cos(g), s = Math.sin(g);
        const [rx, ry] = roots[i], ux = a - 0.04, uy = b - (0.70 - 0.01 * i);
        return [rx + ux * c - uy * s, ry + ux * s + uy * c];
      });
      const tn = [[0.45, 0.38], [0.32, 0.26], [0.15, 0.12]];
      const dx = -0.60, dy = -0.80;
      let tc = 0;
      for (let i = 0; i < 3; i++) {
        const [rx, ry] = roots[i], [tx, ty] = tips[i];
        // the piece's end direction; the tentacles leave the very end edge, as wide as the piece there, in one fill with the piece's colour
        const pl = Math.hypot(tx - rx, ty - ry), pdx = (tx - (rx + tx) / 2) / pl, pdy = (ty - ((ry + ty) / 2 + 0.03)) / pl;
        tn[i].forEach((L, k) => {
          // the tentacle ripples across its length, each one a beat behind the one before
          const rip = 0.03 * Math.sin(1.6 * (t - 0.25 * tc) + ph) * AM; tc++;
          const sg = k ? 1 : -1, off = (i === 2 ? 0.02 : 0.03) * sg;
          const sx = tx - pdx * 0.03, sy = ty - pdy * 0.03;
          const ex = tx + dx * L - dy * (off + rip), ey = ty + dy * L + dx * (off + rip);
          const wob = k % 2 ? -0.03 : 0.03;
          // root as wide as the piece's end and the piece's lit cream, narrowing smoothly to a fine point, cream fading to shade along the length
          const pts = ribbon(catmull([[sx, sy], [tx, ty], [(tx + ex) / 2 - dy * (wob + 0.5 * rip), (ty + ey) / 2 + dx * (wob + 0.5 * rip)], [ex, ey]].map(([a, b]) => P(a, b)), 6), (u) => (0.0155 * Math.pow(1 - u, 1.3) + 0.0015) * h);
          const gr = ctx.createLinearGradient(X(tx), Y(ty), X(ex), Y(ey));
          gr.addColorStop(0, CL); gr.addColorStop(0.15, CL); gr.addColorStop(1, CS);
          alpha(0.65, () => {
            ctx.fillStyle = gr; ctx.beginPath();
            pts.forEach(([a, b], n) => (n ? ctx.lineTo(a, b) : ctx.moveTo(a, b))); ctx.closePath();
            ctx.fill();
          });
        });
      }
      for (let i = 0; i < 3; i++) {
        const [rx, ry] = roots[i], [tx, ty] = tips[i];
        const spine = catmull([P(rx, ry), P((rx + tx) / 2, (ry + ty) / 2 + 0.03), P(tx, ty)], 8);
        // half-width: 0.06 h at the root, 0.10 h at 40% of the length, 0.03 h at the tip
        const wd = (u) => (u < 0.4 ? 0.06 + 0.04 * u / 0.4 : 0.10 - 0.07 * (u - 0.4) / 0.6) * h / 2;
        alpha(0.65, () => vol(ctx, ribbon(spine, wd), CL, CS));
      }

      // claws on a wrist (local lx, ly), fanned 20 degrees about the forearm direction, hooked 40 degrees over 0.11 h
      const curl = 10 * Math.PI / 180 * Math.sin(t + ph) * AM;
      const hand = (w, e) => {
        const base = Math.atan2(w[1] - e[1], w[0] - e[0]);
        for (let c = 0; c < 4; c++) {
          const a0 = base + (c - 1.5) * 20 * Math.PI / 180 + curl, sp = [[w[0], w[1]]];
          let cx = w[0], cy = w[1];
          for (let s = 0; s < 8; s++) {
            const a = a0 - (40 * Math.PI / 180) * (s + 0.5) / 8;
            cx += Math.cos(a) * 0.11 / 8; cy += Math.sin(a) * 0.11 / 8;
            sp.push([cx, cy]);
          }
          vol(ctx, ribbon(sp.map(([a, b]) => P(a, b)), (u) => 0.011 * h * (1 - u)), CL, CS);
        }
      };
      const arm = (s, e, w) => {
        const S = P(s[0], s[1]), E = P(e[0], e[1]), W = P(w[0], w[1]);
        vol(ctx, ribbon(catmull([S, E, W], 8), (u) => (0.030 - 0.010 * u) * h / 2), CL, CS);
        hand(w, e);
      };
      arm([-0.02, 0.70], [-0.06, 0.48], [-0.08, 0.26]);
      arm([0.02, 0.70], [-0.12, 0.54], [-0.32, 0.40]);

      // head: a floating pearl just above where the gown pieces meet, no neck, haloed in the mood colour
      const pr = 0.07 * h, px = X(0.04), py = Y(0.815 + rise) - 0.008 * h * Math.sin(t * 1.7 + ph) - 0.02 * h * gp;
      flatGlow(ctx, px, py, 0.12 * h * (1 + 0.15 * br), rgb, 0.18);
      const pg = ctx.createRadialGradient(px - 0.3 * pr, py - 0.3 * pr, 0.05 * pr, px, py, pr);
      pg.addColorStop(0, "#fbf8f2"); pg.addColorStop(0.55, "#e4dde6"); pg.addColorStop(1, "#b9b2c4");
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
      const ig = ctx.createRadialGradient(px, py, 0.7 * pr, px, py, pr);
      ig.addColorStop(0, "rgba(255,170,210,0)"); ig.addColorStop(0.6, "rgba(255,170,210,0.18)"); ig.addColorStop(1, "rgba(150,190,255,0.25)");
      ctx.fillStyle = ig;
      ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath(); ctx.ellipse(px - 0.35 * pr, py - 0.4 * pr, 0.2 * pr, 0.12 * pr, -0.6, 0, Math.PI * 2); ctx.fill();
    });
  }

  F.GOD_PAINT = { almur, maelu, ulden, ixu, orochronus };
})(window.GenFig);
