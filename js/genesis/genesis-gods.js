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
    ormius(x, yFoot, h, f, tx, ty) {
      const sx = x + f * 0.17 * h, sy = yFoot - 0.78 * h;
      const [ux, uy] = unit(tx - sx, ty - sy);
      return { x: sx + ux * 0.48 * h, y: sy + uy * 0.48 * h };
    },
    ava(x, yFoot, h, f, tx, ty) {
      const sx = x + f * 0.63 * h, sy = yFoot - 0.78 * h;
      const [ux, uy] = unit(tx - sx, ty - sy);
      return { x: sx + ux * 0.28 * h, y: sy + uy * 0.28 * h };
    },
    kaeron(x, yFoot, h, f, tx, ty) {
      const sx = x + f * 0.20 * h, sy = yFoot - 0.80 * h;
      const [ux, uy] = unit(tx - sx, ty - sy);
      return { x: sx + ux * 0.46 * h, y: sy + uy * 0.46 * h };
    },
    kaelum(x, yFoot, h) {
      return { x, y: yFoot - 0.55 * h };
    },
    orochronus(x, yFoot, h, f, tx, ty) {
      const sx = x + f * 0.78 * h, sy = yFoot - 0.64 * h;
      const [ux, uy] = unit(tx - sx, ty - sy);
      return { x: sx + ux * 0.26 * h, y: sy + uy * 0.26 * h };
    },
  };
  F.godHand = function godHand(kind, x, yFoot, h, o, tx, ty) {
    const fn = handOf[kind] || handOf.ormius;
    return fn(x, yFoot, h, (o && o.face) || 1, tx, ty);
  };

  // ---- ORMIUS: a winged devil, serpent from the waist down ----
  const OR = { horn: "#2a1b20", hornLit: "#5a3c44", wing: "#2c0a0e", wingLit: "#5c1a20", bone: "#160508", eye: "#ff4a30", eyeGlow: "255,70,40" };
  function ormius(ctx, x, y, h, style, o) {
    o = o || {};
    const f = o.face || 1, ph = o.ph || 0, t = G.t;
    const X = (lx) => x + f * lx * h, Y = (ly) => y - ly * h, P = (lx, ly) => [X(lx), Y(ly)];
    const amt = o.reach ? clamp(o.reach.amt || 0, 0, 1) : 0;
    frame(ctx, x, y, o, () => {
      const flap = Math.sin(t * 1.9 + ph), sway = 0.03 * Math.sin(t * 1.3 + ph);
      flatGlow(ctx, X(0), Y(0.55), 0.50 * h, style.glow, 0.16);

      // wings: two bat membranes, root-to-tip fingers, thumb claws
      for (const s of [-1, 1]) {
        const R = [s * 0.06, 0.74];
        const T = [[s * 0.24, 1.42], [s * 0.62, 1.34], [s * 0.96, 1.06], [s * 1.06, 0.66]]
          .map(([tx, ty]) => [R[0] + (tx - R[0]) * (1 - 0.05 * flap), R[1] + (ty - R[1]) * (1 + 0.10 * flap)]);
        const N = [0, 1, 2].map((k) => [
          R[0] + 0.72 * ((T[k][0] + T[k + 1][0]) / 2 - R[0]),
          R[1] + 0.72 * ((T[k][1] + T[k + 1][1]) / 2 - R[1]),
        ]);
        vol(ctx, [R, T[0], N[0], T[1], N[1], T[2], N[2], T[3], [s * 0.16, 0.50]].map(([lx, ly]) => P(lx, ly)), OR.wingLit, OR.wing);
        for (const tip of T) fillPoly(ctx, quad(X(R[0]), Y(R[1]), X(tip[0]), Y(tip[1]), 0.028 * h), OR.bone);
        fillPoly(ctx, [P(T[0][0], T[0][1]), P(T[0][0] + s * 0.02, T[0][1] + 0.08), P(T[0][0] + s * 0.06, T[0][1] + 0.02)], OR.bone);
      }

      // serpent lower body
      const tailC = [[0.00, 0.50], [-0.14, 0.34], [-0.36, 0.20], [-0.40, 0.06 + sway], [-0.16, 0.02],
        [0.14, 0.05], [0.36, 0.14 + 2 * sway], [0.48, 0.28 + 3 * sway]].map(([lx, ly]) => P(lx, ly));
      const tailS = catmull(tailC, 6);
      vol(ctx, ribbon(tailS, (u) => Math.max(0.02 * h, 0.14 * h * (1 - 0.82 * u)), 0), style.lit, style.shade);

      // back arm (behind the torso)
      const bSh = P(-0.17, 0.78), bHand = P(-0.25, 0.44);
      const bElbow = [(bSh[0] + bHand[0]) / 2 - f * 0.05 * h, (bSh[1] + bHand[1]) / 2 + 0.02 * h];
      vol(ctx, quad(bSh[0], bSh[1], bElbow[0], bElbow[1], 0.085 * h), style.lit, style.shade);
      vol(ctx, quad(bElbow[0], bElbow[1], bHand[0], bHand[1], 0.07 * h), style.lit, style.shade);
      circle(ctx, bHand[0], bHand[1], 0.035 * h, style.shade);

      // torso
      vol(ctx, [[-0.19, 0.82], [0.19, 0.82], [0.15, 0.62], [0.11, 0.48], [-0.11, 0.48], [-0.15, 0.62]]
        .map(([lx, ly]) => P(lx, ly)), style.lit, style.shade);

      // horns (before the head so the skull covers their bases)
      for (const s of [-1, 1]) {
        const hC = [[s * 0.07, 1.00], [s * 0.20, 1.14], [s * 0.27, 1.36], [s * 0.20, 1.60]].map(([lx, ly]) => P(lx, ly));
        const hS = catmull(hC, 6);
        vol(ctx, ribbon(hS, (u) => Math.max(0.008 * h, 0.06 * h * (1 - 0.8 * u)), 0), OR.hornLit, OR.horn);
      }

      // neck
      fillPoly(ctx, quad(X(0), Y(0.80), X(0), Y(0.90), 0.10 * h), style.shade);

      // head
      vol(ctx, [[-0.09, 0.86], [-0.10, 0.98], [-0.05, 1.04], [0.05, 1.04], [0.10, 0.98], [0.09, 0.86], [0.03, 0.80], [-0.03, 0.80]]
        .map(([lx, ly]) => P(lx, ly)), style.lit, style.shade);

      // goatee
      fillPoly(ctx, [P(-0.03, 0.82), P(0.03, 0.82), P(0.01, 0.70)], OR.horn);

      // eyes
      for (const ex of [-0.04, 0.04]) {
        flatGlow(ctx, X(ex), Y(0.95), 0.06 * h, OR.eyeGlow, 0.7);
        circle(ctx, X(ex), Y(0.95), 0.016 * h, OR.eye);
      }

      // front arm (over the torso), reaches toward o.reach
      const sh = P(0.17, 0.78), rest = P(0.25, 0.44);
      let hand;
      if (amt > 0) {
        const full = handOf.ormius(x, y, h, f, o.reach.x, o.reach.y);
        hand = [mix(rest[0], full.x, amt), mix(rest[1], full.y, amt)];
      } else {
        hand = rest;
      }
      const elbow = [(sh[0] + hand[0]) / 2 + f * 0.05 * h, (sh[1] + hand[1]) / 2 + 0.03 * h];
      vol(ctx, quad(sh[0], sh[1], elbow[0], elbow[1], 0.085 * h), style.lit, style.shade);
      vol(ctx, quad(elbow[0], elbow[1], hand[0], hand[1], 0.07 * h), style.lit, style.shade);
      circle(ctx, hand[0], hand[1], 0.035 * h, style.shade);
      if (amt > 0.05) {
        flatGlow(ctx, hand[0], hand[1], 0.12 * h, style.glow, 0.5 * amt);
        circle(ctx, hand[0], hand[1], 0.04 * h, style.core);
      }
    });
  }

  // ---- AVA: a white serpent of fur, feathered wings, gold ----
  const AV = { gold: "#e9b93a", goldDk: "#b9821c", haloGlow: "255,206,80" };
  function ava(ctx, x, y, h, style, o) {
    o = o || {};
    const f = o.face || 1, ph = o.ph || 0, t = G.t;
    const X = (lx) => x + f * lx * h, Y = (ly) => y - ly * h, P = (lx, ly) => [X(lx), Y(ly)];
    const amt = o.reach ? clamp(o.reach.amt || 0, 0, 1) : 0;
    frame(ctx, x, y, o, () => {
      const flap = Math.sin(t * 1.6 + ph), bob = 0.02 * Math.sin(t * 1.1 + ph);
      const und = (i) => 0.03 * Math.sin(t * 1.4 - i * 1.1 + ph);

      // reach displacement (screen px), applied to the head end
      let dxr = 0, dyr = 0;
      const snoutRest = P(0.63, 0.78 + bob);
      if (amt > 0) {
        const [ux, uy] = unit(o.reach.x - snoutRest[0], o.reach.y - snoutRest[1]);
        dxr = ux * 0.28 * h * amt;
        dyr = uy * 0.28 * h * amt;
      }
      const D = (lx, ly, k) => [X(lx) + dxr * k, Y(ly) + dyr * k];

      flatGlow(ctx, X(0.05), Y(0.50 + bob), 0.50 * h, style.glow, 0.14);

      // wings: seven feathered primaries fanned from the shoulder, gold
      // tips, with a smaller set of coverts layered over the root
      for (const s of [-1, 1]) {
        const W = P(0.10, 0.84 + bob);
        const angAt = (k) => mix(0.30, 1.55, k / 6);
        const lenAt = (k) => mix(0.98, 0.58, k / 6) * h * (1 + 0.06 * flap);
        const dirAt = (ang) => [f * s * Math.cos(ang), -Math.sin(ang)];
        const feather = (k, scale) => {
          const [dx, dy] = dirAt(angAt(k));
          const L = lenAt(k) * scale;
          return [W[0] + L * dx, W[1] + L * dy];
        };
        const notchAt = (k, scale) => {
          const [dx, dy] = dirAt(mix(0.30, 1.55, (k + 0.5) / 6));
          const L = 0.86 * (lenAt(k) * scale + lenAt(k + 1) * scale) / 2;
          return [W[0] + L * dx, W[1] + L * dy];
        };

        const tips = [];
        for (let k = 0; k <= 6; k++) tips.push(feather(k, 1));
        const pts = [W];
        for (let k = 0; k <= 6; k++) { pts.push(tips[k]); if (k < 6) pts.push(notchAt(k, 1)); }
        pts.push([W[0] + f * s * 0.08 * h, W[1] + 0.06 * h]);
        vol(ctx, pts, style.lit, style.shade);
        for (const tip of tips) { circle(ctx, tip[0], tip[1], 0.05 * h, style.lit); circle(ctx, tip[0], tip[1], 0.035 * h, AV.gold); }

        ctx.save();
        ctx.globalAlpha *= 0.75;
        const cpts = [W];
        for (let k = 1; k <= 5; k++) { cpts.push(feather(k, 0.55)); if (k < 5) cpts.push(notchAt(k, 0.55)); }
        cpts.push([W[0] + f * s * 0.05 * h, W[1] + 0.04 * h]);
        fillPoly(ctx, cpts, AV.gold);
        ctx.restore();
      }

      // halo (behind the head)
      const [cx, cy] = D(0.44, 0.92 + bob, 1);
      flatGlow(ctx, cx, cy, 0.22 * h, AV.haloGlow, 0.22);
      ctx.beginPath(); ctx.arc(cx, cy, 0.16 * h, 0, TAU);
      ctx.lineWidth = 0.022 * h; ctx.strokeStyle = AV.gold; ctx.stroke();

      // body: furred serpent, tufted ribbon
      const bodyC = [[0.42, 0.80], [0.20, 0.88], [-0.06, 0.74], [-0.28, 0.52], [-0.30, 0.28], [-0.08, 0.12], [0.20, 0.10], [0.46, 0.22]]
        .map(([lx, ly], i) => D(lx, ly + bob + und(i), i === 0 ? 1 : i === 1 ? 0.6 : 0));
      const bodyS = catmull(bodyC, 6);
      vol(ctx, ribbon(bodyS, (u) => Math.max(0.02 * h, 0.11 * h * (1 - 0.8 * u)), 0.22), style.lit, style.shade);

      // gold mane along the front half of the back
      for (let i = 2; i < Math.floor(bodyS.length * 0.45); i += 3) {
        const n = upNormal(bodyS, i);
        const tg = unit(bodyS[i + 1][0] - bodyS[i - 1][0], bodyS[i + 1][1] - bodyS[i - 1][1]);
        const r = 0.11 * h * (1 - 0.8 * i / (bodyS.length - 1));
        fillPoly(ctx, [
          [bodyS[i][0] - tg[0] * 0.02 * h, bodyS[i][1] - tg[1] * 0.02 * h],
          [bodyS[i][0] + tg[0] * 0.02 * h, bodyS[i][1] + tg[1] * 0.02 * h],
          [bodyS[i][0] + n[0] * (r + 0.07 * h), bodyS[i][1] + n[1] * (r + 0.07 * h)],
        ], AV.gold);
      }

      // head, ears, eye
      vol(ctx, [[0.36, 0.90], [0.50, 0.90], [0.64, 0.82], [0.62, 0.74], [0.46, 0.70], [0.36, 0.72]]
        .map(([lx, ly]) => D(lx, ly + bob, 1)), style.lit, style.shade);
      fillPoly(ctx, [D(0.40, 0.90 + bob, 1), D(0.46, 0.90 + bob, 1), D(0.42, 1.02 + bob, 1)], style.lit);
      fillPoly(ctx, [D(0.47, 0.90 + bob, 1), D(0.53, 0.90 + bob, 1), D(0.51, 1.00 + bob, 1)], style.lit);
      const [ex, ey] = D(0.54, 0.81 + bob, 1);
      circle(ctx, ex, ey, 0.02 * h, AV.goldDk);

      // snout light when reaching
      if (amt > 0.05) {
        const [sx, sy] = D(0.63, 0.78 + bob, 1);
        flatGlow(ctx, sx, sy, 0.12 * h, style.glow, 0.6 * amt);
        circle(ctx, sx, sy, 0.03 * h, style.core);
      }
    });
  }

  // ---- OROCHRONUS (Serus): a black serpent dragon, silver light ----
  const SR = { fin: "#22232e", tooth: "#d8dce8" };
  function orochronus(ctx, x, y, h, style, o) {
    o = o || {};
    const f = o.face || 1, ph = o.ph || 0, t = G.t;
    const X = (lx) => x + f * lx * h, Y = (ly) => y - ly * h, P = (lx, ly) => [X(lx), Y(ly)];
    const amt = o.reach ? clamp(o.reach.amt || 0, 0, 1) : 0;
    frame(ctx, x, y, o, () => {
      const bob = 0.015 * Math.sin(t * 0.9 + ph);
      const und = (i) => 0.035 * Math.sin(t * 1.0 - i * 1.0 + ph);

      // reach displacement (screen px), applied to the jaw end
      let dxr = 0, dyr = 0;
      const jawRest = P(0.78, 0.64 + bob);
      if (amt > 0) {
        const [ux, uy] = unit(o.reach.x - jawRest[0], o.reach.y - jawRest[1]);
        dxr = ux * 0.26 * h * amt;
        dyr = uy * 0.26 * h * amt;
      }
      const D = (lx, ly, k) => [X(lx) + dxr * k, Y(ly) + dyr * k];

      flatGlow(ctx, X(0.05), Y(0.48 + bob), 0.60 * h, style.glow, 0.26);

      // body samples
      const C = [[0.50, 0.68], [0.30, 0.84], [0.02, 0.82], [-0.22, 0.62], [-0.38, 0.38], [-0.28, 0.16], [0.00, 0.06], [0.30, 0.10], [0.56, 0.26]]
        .map(([lx, ly], i) => D(lx, ly + bob + und(i), i === 0 ? 1 : i === 1 ? 0.5 : 0));
      const S = catmull(C, 7);
      const rAt = (u) => Math.max(0.02 * h, 0.13 * h * (1 - 0.8 * u));

      // legs (behind the body)
      for (let j = 0; j < 2; j++) {
        const b = S[Math.floor(S.length * (j === 0 ? 0.22 : 0.62))];
        const pad = 0.03 * h * Math.sin(t * 2 + ph + j * 3);
        const k1 = [b[0] + f * 0.04 * h, b[1] + 0.14 * h];
        const k2 = [k1[0] + f * 0.08 * h + pad, k1[1] + 0.10 * h];
        fillPoly(ctx, quad(b[0], b[1], k1[0], k1[1], 0.05 * h), style.shade);
        fillPoly(ctx, quad(k1[0], k1[1], k2[0], k2[1], 0.035 * h), style.shade);
        for (const c of [-1, 0, 1]) {
          fillPoly(ctx, [[k2[0] - 0.012 * h, k2[1]], [k2[0] + 0.012 * h, k2[1]], [k2[0] + f * (0.03 + c * 0.025) * h, k2[1] + 0.05 * h]], style.shade);
        }
      }

      // tail fin
      const tl = S[S.length - 1];
      fillPoly(ctx, [[tl[0] - f * 0.04 * h, tl[1] - 0.04 * h], [tl[0] + f * 0.10 * h, tl[1] - 0.10 * h],
        [tl[0] + f * 0.14 * h, tl[1] + 0.04 * h], [tl[0] + f * 0.06 * h, tl[1] + 0.10 * h]], SR.fin);

      // body
      vol(ctx, ribbon(S, rAt, 0), style.lit, style.shade);

      // dorsal saw
      for (let i = 2; i < S.length - 2; i += 3) {
        const u = i / (S.length - 1), n = upNormal(S, i);
        const tg = unit(S[i + 1][0] - S[i - 1][0], S[i + 1][1] - S[i - 1][1]);
        const r = rAt(u), sp = r + 0.08 * h * (1 - 0.5 * u);
        fillPoly(ctx, [
          [S[i][0] - tg[0] * 0.025 * h, S[i][1] - tg[1] * 0.025 * h],
          [S[i][0] + tg[0] * 0.025 * h, S[i][1] + tg[1] * 0.025 * h],
          [S[i][0] + n[0] * sp, S[i][1] + n[1] * sp],
        ], SR.fin);
      }

      // mane, five spikes behind the head
      for (let m = 0; m <= 4; m++) {
        const u = m / 4;
        const b = D(mix(0.44, 0.30, u), mix(0.80, 0.86, u) + bob, 0.5);
        fillPoly(ctx, [[b[0] - f * 0.02 * h, b[1]], [b[0] + f * 0.02 * h, b[1]], [b[0] - f * 0.06 * h, b[1] - 0.10 * h]], SR.fin);
      }

      // horns (before the head)
      for (const hC of [[[0.52, 0.80], [0.38, 0.92], [0.22, 0.98]], [[0.46, 0.78], [0.30, 0.88], [0.14, 0.92]]]) {
        const hS = catmull(hC.map(([lx, ly]) => D(lx, ly + bob, 1)), 6);
        vol(ctx, ribbon(hS, (u) => Math.max(0.006 * h, 0.03 * h * (1 - 0.85 * u)), 0), style.lit, style.shade);
      }

      // upper jaw
      vol(ctx, [[0.44, 0.78], [0.62, 0.76], [0.78, 0.70], [0.80, 0.64], [0.62, 0.62], [0.46, 0.64]]
        .map(([lx, ly]) => D(lx, ly + bob, 1)), style.lit, style.shade);

      // lower jaw, rotated open by the reach
      const pv = D(0.46, 0.64 + bob, 1);
      const jaw = 0.55 * amt * f;
      const jawPts = [[0.46, 0.64], [0.64, 0.62], [0.76, 0.58], [0.72, 0.52], [0.50, 0.56]].map(([lx, ly]) => {
        const [px, py] = D(lx, ly + bob, 1);
        return [
          pv[0] + (px - pv[0]) * Math.cos(jaw) - (py - pv[1]) * Math.sin(jaw),
          pv[1] + (px - pv[0]) * Math.sin(jaw) + (py - pv[1]) * Math.cos(jaw),
        ];
      });
      vol(ctx, jawPts, style.lit, style.shade);

      // teeth
      for (const tl of [0.60, 0.68, 0.76]) {
        const b = D(tl, 0.63 + bob, 1);
        fillPoly(ctx, [[b[0] - 0.012 * h, b[1]], [b[0] + 0.012 * h, b[1]], [b[0], b[1] + 0.035 * h]], SR.tooth);
      }

      // whiskers
      const wv = 0.03 * Math.sin(t * 2.2 + ph);
      fillPoly(ctx, quad(...D(0.72, 0.68 + bob, 1), ...D(0.86, 0.80 + bob + wv, 1), 0.012 * h), SR.tooth);
      fillPoly(ctx, quad(...D(0.72, 0.66 + bob, 1), ...D(0.88, 0.62 + bob - wv, 1), 0.012 * h), SR.tooth);

      // eye
      const [ex, ey] = D(0.60, 0.72 + bob, 1);
      flatGlow(ctx, ex, ey, 0.07 * h, style.glow, 0.7);
      circle(ctx, ex, ey, 0.02 * h, style.core);
      circle(ctx, ex + f * 0.006 * h, ey, 0.008 * h, style.shade);

      // mouth light when reaching
      if (amt > 0.05) {
        const [mx, my] = D(0.78, 0.64 + bob, 1);
        flatGlow(ctx, mx, my, 0.10 * h, style.glow, 0.6 * amt);
      }
    });
  }

  // ---- KAERON: a cloaked figure, no face, a long beard, floating ----
  const KR = { cloakLit: "#3552c8", cloakShade: "#1a2a7a", hood: "#04060f", staff: "#0e1638" };
  function kaeron(ctx, x, y, h, style, o) {
    o = o || {};
    const f = o.face || 1, ph = o.ph || 0, t = G.t;
    const X = (lx) => x + f * lx * h, Y = (ly) => y - ly * h, P = (lx, ly) => [X(lx), Y(ly)];
    const amt = o.reach ? clamp(o.reach.amt || 0, 0, 1) : 0;
    frame(ctx, x, y, o, () => {
      const bob = 0.02 * Math.sin(t * 1.2 + ph);
      const rip = (k) => 0.025 * Math.sin(t * 2.0 + k * 1.4 + ph);
      const wag = 0.03 * Math.sin(t * 1.5 + ph);

      flatGlow(ctx, X(0), Y(0.55 + bob), 0.45 * h, style.glow, 0.16);

      // staff (behind, off side)
      fillPoly(ctx, quad(X(-0.27), Y(0.02 + bob), X(-0.27), Y(1.18 + bob), 0.028 * h), KR.staff);
      flatGlow(ctx, X(-0.27), Y(1.18 + bob), 0.10 * h, style.glow, 0.5);
      circle(ctx, X(-0.27), Y(1.18 + bob), 0.03 * h, style.core);

      // cloak
      vol(ctx, [[0.00, 1.06], [0.13, 0.96], [0.20, 0.84], [0.24, 0.60], [0.36, 0.06 + rip(0)], [0.24, 0.02 + rip(1)],
        [0.12, 0.08 + rip(2)], [0.00, 0.03 + rip(3)], [-0.12, 0.08 + rip(4)], [-0.24, 0.02 + rip(5)], [-0.36, 0.06 + rip(6)],
        [-0.24, 0.60], [-0.20, 0.84], [-0.13, 0.96]].map(([lx, ly]) => P(lx, ly + bob)), KR.cloakLit, KR.cloakShade);

      // hood opening, no face
      ctx.beginPath();
      ctx.ellipse(X(0), Y(0.90 + bob), 0.085 * h, 0.11 * h, 0, 0, TAU);
      ctx.fillStyle = KR.hood;
      ctx.fill();

      // beard
      vol(ctx, [[-0.07, 0.83], [0.07, 0.83], [0.09, 0.66], [0.05, 0.50], [0.02 + wag, 0.34], [-0.03 + wag, 0.48], [-0.08, 0.64]]
        .map(([lx, ly]) => P(lx, ly + bob)), style.core, mixHex(style.core, style.lit, 0.45));

      // reaching arm, only when amt > 0
      if (amt > 0) {
        const sh = P(0.20, 0.80 + bob);
        const rest = [sh[0] + f * 0.02 * h, sh[1] + 0.10 * h];
        const full = handOf.kaeron(x, y, h, f, o.reach.x, o.reach.y);
        const hand = [mix(rest[0], full.x, amt), mix(rest[1], full.y, amt)];
        vol(ctx, quad(sh[0], sh[1], hand[0], hand[1], 0.11 * h), KR.cloakLit, KR.cloakShade);
        circle(ctx, hand[0], hand[1], 0.035 * h, style.core);
        flatGlow(ctx, hand[0], hand[1], 0.12 * h, style.glow, 0.5 * amt);
      }
    });
  }

  // ---- KAELUM: not humanoid, a star whose colour follows her mood ----
  const MOOD = { ok: [255, 255, 255], happy: [255, 214, 72], angry: [255, 64, 48], sad: [80, 140, 255] };
  function kaelum(ctx, x, y, h, style, o) {
    o = o || {};
    const ph = o.ph || 0, t = G.t;
    const X = (lx) => x + lx * h, Y = (ly) => y - ly * h;
    frame(ctx, x, y, o, () => {
      const cx = X(0), cy = Y(0.55 + 0.02 * Math.sin(t * 1.3 + ph));

      // colour drifts from the base mood toward a slow-cycling target mood
      const base = MOOD[o.mood] || MOOD.ok;
      const k = 0.5 + 0.5 * Math.sin(t * 0.55 + ph);
      const j = 0.5 + 0.5 * Math.sin(t * 0.23 + ph * 1.7);
      const target = j < 0.33 ? MOOD.happy : j < 0.66 ? MOOD.sad : MOOD.angry;
      const col = base.map((c, i) => Math.round(mix(c, target[i], 0.25 * k)));
      const rgb = col.join(",");

      flatGlow(ctx, cx, cy, 0.60 * h, rgb, 0.30);

      // rays: two overlapping eight-point stars, offset and counter-pulsing
      const rot = t * 0.15 + ph;
      const ptsA = [];
      for (let k = 0; k < 8; k++) {
        const ang = rot + k * Math.PI / 4;
        const r = k % 2 === 0 ? 0.52 * h * (1 + 0.06 * Math.sin(t * 5 + k)) : 0.09 * h;
        ptsA.push([cx + Math.cos(ang) * r, cy + Math.sin(ang) * r]);
      }
      fillPoly(ctx, ptsA, rgba(rgb, 0.85));
      const ptsB = [];
      for (let k = 0; k < 8; k++) {
        const ang = rot + Math.PI / 4 + k * Math.PI / 4;
        const r = k % 2 === 0 ? 0.30 * h * (1 + 0.06 * Math.sin(t * 5 + k + 2)) : 0.07 * h;
        ptsB.push([cx + Math.cos(ang) * r, cy + Math.sin(ang) * r]);
      }
      fillPoly(ctx, ptsB, rgba(rgb, 0.6));

      circle(ctx, cx, cy, 0.14 * h, rgba(rgb, 0.7));
      circle(ctx, cx, cy, 0.10 * h, "#ffffff");

      // seeping motes drifting outward from the core
      for (let i = 0; i < 12; i++) {
        const u = (((t * 0.28 + i * 0.083 + ph * 0.05) % 1) + 1) % 1;
        const a = ph + i * TAU / 12 + t * 0.12;
        const r = 0.14 * h + u * 0.55 * h;
        const al = (1 - u) * 0.8;
        const sz = 0.022 * h * (1 - 0.5 * u);
        const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
        fillPoly(ctx, quad(cx + Math.cos(a) * (r - 0.06 * h), cy + Math.sin(a) * (r - 0.06 * h), px, py, 0.012 * h), rgba(rgb, al * 0.5));
        circle(ctx, px, py, sz, rgba(rgb, al));
      }
    });
  }

  F.GOD_PAINT = { ormius, ava, kaeron, kaelum, orochronus };
})(window.GenFig);
