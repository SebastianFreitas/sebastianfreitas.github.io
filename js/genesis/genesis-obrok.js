/* genesis-obrok.js — Obrokxus's later forms, added to GenFig: the centipede horse (after Rex) and the floating worm (after the mainland), plus obrokEye, where each form's eye is, so beams can aim at it. y is the foot line, h the height in px; light from the left. */
window.GenFig = window.GenFig || {};
(function (F) {
  const G = window.Gen;
  const { clamp, mix } = Util;
  const { flatGlow } = GenPaint;
  const { litShade, circle } = Paint;
  const TAU = Math.PI * 2;

  // ---- private kit (copied from genesis-titans.js, see that file's note) ----
  function tracePoly(ctx, pts) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  }
  function fillPoly(ctx, pts, fill) { tracePoly(ctx, pts); ctx.fillStyle = fill; ctx.fill(); }
  function shadedPoly(ctx, pts, xSplit, lit, shade) { litShade(ctx, () => tracePoly(ctx, pts), xSplit, lit, shade); }
  function quad(ax, ay, bx, by, w) {
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len * w / 2, ny = dx / len * w / 2;
    return [[ax - nx, ay - ny], [ax + nx, ay + ny], [bx + nx, by + ny], [bx - nx, by - ny]];
  }
  function split(pts) {
    let minX = Infinity, maxX = -Infinity;
    for (const p of pts) { if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0]; }
    return minX + 0.3 * (maxX - minX);
  }

  const OBR = {
    shade: "rgba(16,3,5,0.97)", lit: "rgba(46,10,14,1)",
    iris: "rgba(150,18,24,0.92)", pupil: "rgba(8,1,2,1)", glow: "120,12,18",
  };
  const FAR = "rgba(9,2,3,0.97)";
  const TOOTH = "rgba(200,180,154,0.85)";

  function ball(ctx, cx, cy, r) {
    litShade(ctx, () => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); }, cx - 0.4 * r, OBR.lit, OBR.shade);
  }
  function blinkK(ph) { return clamp(1 - 6 * Math.max(0, Math.sin(G.t * 0.7 + ph) - 0.85), 0, 1); }
  function smallEye(ctx, x, y, r, ph) {
    const k = blinkK(ph);
    ctx.save(); ctx.translate(x, y); ctx.scale(1, k); ctx.translate(-x, -y);
    circle(ctx, x, y, r, OBR.iris);
    circle(ctx, x, y, r * 0.4, OBR.pupil);
    ctx.restore();
  }
  function mainEye(ctx, ex, ey, h, glowR, look) {
    flatGlow(ctx, ex, ey, glowR, OBR.glow, 0.9);
    circle(ctx, ex, ey, 0.055 * h, OBR.iris);
    const l = look || { x: ex + 1, y: ey };
    const dx = l.x - ex, dy = l.y - ey, len = Math.hypot(dx, dy) || 1;
    circle(ctx, ex + dx / len * 0.015 * h, ey + dy / len * 0.015 * h, 0.022 * h, OBR.pupil);
  }

  /* ---- the centipede horse ------------------------------------------ */
  F.drawCentihorse = function drawCentihorse(ctx, x, y, h, f, ph, pose, o) {
    o = o || {};
    const X = (lx) => x + f * lx * h, Y = (ly) => y - ly * h;
    const run = pose === "run", air = clamp(o.air || 0, 0, 1);
    const gw = run ? 11 : 1.6, st = run ? 0.11 : 0.03, la = run ? 0.09 : 0.02;
    const sp = run ? 0.145 : 0.13, bh = run ? 0.42 : 0.46;

    const N = 9;
    const lxs = [], lys = [], rs = [];
    for (let i = 0; i < N; i++) {
      lxs[i] = 0.42 - i * sp;
      lys[i] = bh + 0.03 * Math.sin(G.t * (run ? 9 : 2) - i * 0.8);
      rs[i] = h * (0.13 - i * 0.008);
    }

    function leg(i, far) {
      const phase = G.t * gw + i * 0.95 + (far ? Math.PI : 0) + ph;
      let fx = Math.cos(phase) * st;
      let lift = Math.max(0, Math.sin(phase)) * la;
      if (air > 0) {
        fx = mix(fx, -0.05 + 0.04 * Math.sin(G.t * 5 + i * 1.3), air);
        lift = mix(lift, 0.10 + 0.06 * Math.sin(G.t * 6 + i), air);
      }
      const dx = far ? -0.03 : 0;
      const lx = lxs[i], ly = lys[i];
      const col = far ? FAR : OBR.shade;

      if (!far && (i === 0 || i === 1) && pose === "lunge") {
        const hip = [X(lx + dx), Y(ly - 0.05)];
        const reach = o.reach || { x: X(1.4), y: Y(0.9) };
        const ddx = reach.x - hip[0], ddy = reach.y - hip[1], dlen = Math.hypot(ddx, ddy) || 1;
        const hoof = [hip[0] + ddx / dlen * 0.50 * h, hip[1] + ddy / dlen * 0.50 * h];
        const knee = [(hip[0] + hoof[0]) / 2, (hip[1] + hoof[1]) / 2 - 0.10 * h];
        fillPoly(ctx, quad(hip[0], hip[1], knee[0], knee[1], 0.045 * h), col);
        fillPoly(ctx, quad(knee[0], knee[1], hoof[0], hoof[1], 0.03 * h), col);
        return;
      }

      const hip = [lx + dx, ly - 0.05];
      const knee = [lx + dx + fx * 0.5 + 0.04, 0.22 + lift * 0.6];
      const hx = lx + dx + fx, hy = lift + 0.03;
      fillPoly(ctx, quad(X(hip[0]), Y(hip[1]), X(knee[0]), Y(knee[1]), 0.045 * h), col);
      fillPoly(ctx, quad(X(knee[0]), Y(knee[1]), X(hx), Y(hy), 0.03 * h), col);
      fillPoly(ctx, [
        [X(hx - 0.025), Y(lift + 0.035)], [X(hx + 0.025), Y(lift + 0.035)],
        [X(hx + 0.03), Y(lift)], [X(hx - 0.03), Y(lift)],
      ], col);
    }

    // far legs
    for (let i = N - 1; i >= 0; i--) leg(i, true);

    // tail spike
    fillPoly(ctx, [
      [X(lxs[8] - 0.02), Y(lys[8] + 0.05)],
      [X(lxs[8] - 0.02), Y(lys[8] - 0.04)],
      [X(lxs[8] - 0.34), Y(lys[8] + 0.16 + 0.03 * Math.sin(G.t * 3))],
    ], OBR.shade);

    // dorsal spines
    for (let i = N - 1; i >= 0; i--) {
      const lx = lxs[i], ly = lys[i], rh = rs[i] / h;
      fillPoly(ctx, [
        [X(lx - 0.03), Y(ly + rh - 0.02)],
        [X(lx + 0.03), Y(ly + rh - 0.02)],
        [X(lx - 0.05), Y(ly + rh + 0.16 - i * 0.008)],
      ], OBR.shade);
    }

    // body segments
    for (let i = N - 1; i >= 0; i--) ball(ctx, X(lxs[i]), Y(lys[i]), rs[i]);

    // neck
    const neckPts = [
      [X(0.36), Y(bh - 0.06)], [X(0.44), Y(bh + 0.18)],
      [X(0.66), Y(0.92)], [X(0.76), Y(0.76)],
    ];
    shadedPoly(ctx, neckPts, split(neckPts), OBR.lit, OBR.shade);

    // mane: 5 spikes along the neck's back edge, (0.46, bh+0.18) -> (0.64, 0.92)
    for (let m = 0; m < 5; m++) {
      const u = m / 4;
      const blx = mix(0.46, 0.64, u), bly = mix(bh + 0.18, 0.92, u);
      const tlx = blx - 0.07, tly = bly + 0.08;
      fillPoly(ctx, [
        [X(blx - 0.02), Y(bly)], [X(blx + 0.02), Y(bly)], [X(tlx), Y(tly)],
      ], OBR.shade);
    }

    // head
    const headPts = [
      [0.62, 0.95], [0.74, 0.99], [0.96, 0.86], [1.02, 0.78],
      [0.98, 0.72], [0.86, 0.72], [0.70, 0.76],
    ].map(([lx, ly]) => [X(lx), Y(ly)]);

    // horns (drawn before the head so the skull covers their bases)
    fillPoly(ctx, [[X(0.64), Y(0.96)], [X(0.68), Y(0.96)], [X(0.58), Y(1.12)]], OBR.shade);
    fillPoly(ctx, [[X(0.71), Y(0.985)], [X(0.75), Y(0.985)], [X(0.69), Y(1.14)]], OBR.shade);

    shadedPoly(ctx, headPts, split(headPts), OBR.lit, OBR.shade);

    if (pose === "lunge") {
      fillPoly(ctx, [[X(0.98), Y(0.72)], [X(0.86), Y(0.72)], [X(0.97), Y(0.60)]], OBR.pupil);
      for (let t = 0; t < 3; t++) {
        const tlx = mix(0.88, 0.97, t / 2);
        fillPoly(ctx, [
          [X(tlx - 0.015), Y(0.72)], [X(tlx + 0.015), Y(0.72)], [X(tlx), Y(0.69)],
        ], TOOTH);
      }
    }

    mainEye(ctx, X(0.80), Y(0.86), h, 0.22 * h, o.look);

    for (const i of [2, 4, 6]) smallEye(ctx, X(lxs[i] + 0.02), Y(lys[i] - 0.01), 0.022 * h, ph + i);

    // near legs
    for (let i = N - 1; i >= 0; i--) leg(i, false);
  };

  /* ---- the floating worm --------------------------------------------- */
  F.drawWorm = function drawWorm(ctx, x, y, h, f, ph, pose, o) {
    o = o || {};
    const X = (lx) => x + f * lx * h;
    const cy = y - 0.45 * h;
    const sp = o.speed || 1;
    const N = 34;
    const cxs = [], cys = [], rss = [];
    for (let k = 0; k < N; k++) {
      const s = k / 33;
      const lx = 0.90 - s * 2.0;
      const wave = Math.sin(G.t * 3.2 * sp - s * 7.5 + ph) * 0.11 * (0.25 + 0.75 * s);
      cxs[k] = X(lx);
      cys[k] = cy - wave * h;
      rss[k] = k === 0 ? 0.15 * h : h * 0.125 * (1 - 0.72 * Math.pow(s, 1.3));
    }

    for (let k = N - 1; k >= 0; k--) {
      const s = k / 33;
      if (k >= 3 && k <= 27 && k % 3 === 0) {
        const r = rss[k], cx = cxs[k], cyk = cys[k];
        const baseAy = cyk - r;
        fillPoly(ctx, [
          [cx - 0.35 * r, baseAy], [cx + 0.35 * r, baseAy],
          [cx - f * 0.06 * h, baseAy - 0.08 * h * (1 - s)],
        ], OBR.shade);
      }
      ball(ctx, cxs[k], cys[k], rss[k]);
    }

    // mouth
    circle(ctx, X(1.00), cys[0], 0.07 * h, OBR.pupil);
    for (let j = 0; j < 7; j++) {
      const a = j * TAU / 7 + G.t * 0.6;
      const bx1 = X(1.00) + Math.cos(a - 0.18) * 0.07 * h, by1 = cys[0] + Math.sin(a - 0.18) * 0.07 * h;
      const bx2 = X(1.00) + Math.cos(a + 0.18) * 0.07 * h, by2 = cys[0] + Math.sin(a + 0.18) * 0.07 * h;
      const tx = X(1.00) + Math.cos(a) * 0.035 * h, ty = cys[0] + Math.sin(a) * 0.035 * h;
      fillPoly(ctx, [[bx1, by1], [bx2, by2], [tx, ty]], TOOTH);
    }

    mainEye(ctx, X(0.84), cys[0] - 0.06 * h, h, 0.26 * h, o.look);

    for (const k of [8, 14, 20, 26]) smallEye(ctx, cxs[k], cys[k] - 0.3 * rss[k], 0.25 * rss[k], ph + k);
  };

  /* ---- eye lookup, for beams to aim at ------------------------------- */
  F.obrokEye = function obrokEye(kind, x, y, h, o) {
    o = o || {};
    const f = o.face || 1, pose = o.pose || "stand";
    if (kind === "centihorse") {
      let ex = x + f * 0.80 * h, ey = y - 0.86 * h;
      if (pose === "lunge") {
        const ang = -0.22 * f;
        const dx = ex - x, dy = ey - y;
        const cos = Math.cos(ang), sin = Math.sin(ang);
        return { x: x + dx * cos - dy * sin, y: y + dx * sin + dy * cos };
      }
      return { x: ex, y: ey };
    }
    if (kind === "worm") {
      const sp = o.speed || 1;
      const wave0 = Math.sin(G.t * 3.2 * sp + (o.ph || 0)) * 0.11 * 0.25;
      return { x: x + f * 0.84 * h, y: y - 0.45 * h - wave0 * h - 0.06 * h };
    }
    return { x: x + f * 0.10 * h, y: y - 0.50 * h };
  };
})(window.GenFig);
