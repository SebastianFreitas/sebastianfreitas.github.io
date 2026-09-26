window.GenRoles = (function () {
  "use strict";

  const STEP = 0.25;
  let figs = null, figKey = "";

  const GROUPS = [[10, 14, 7, 16], [6, 13, 21, 0], [8, 20, 23, 12, 15], [9, 17, 18, 22]];
  const SNAP_T0 = 4.6, GROUP_GAP = 0.8, ONE_GAP = 0.15, BLINK = 0.2;

  function snapAt(idx) {
    for (let g = 0; g < GROUPS.length; g++) {
      const k = GROUPS[g].indexOf(idx);
      if (k !== -1) return SNAP_T0 + g * GROUP_GAP + k * ONE_GAP;
    }
    return Infinity;
  }

  function hash(i) {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  function lerp(a, b, u) { return a + (b - a) * u; }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function build(W, H) {
    const roster = (window.GenOld && GenOld.ROSTER) || [];
    const east = roster.filter((o) => o.side === 1);
    const n = east.length;
    if (!n) { figs = []; return; }
    let maxHf = 0;
    for (const o of east) if (o.hf > maxHf) maxHf = o.hf;
    figs = east.map((o, i) => {
      const sx = W * (0.10 + 0.80 * (i + 0.5) / n);
      const back = (i % 2 === 0);
      const footY = back ? 0.90 * H : 0.97 * H;
      const rowScale = back ? 0.85 : 1;
      const h = Math.max(H * 0.08, H * 0.20 * o.hf / maxHf) * rowScale * 1.35;
      const startX = sx < W / 2 ? -0.1 * W : 1.1 * W;
      const t0 = 0.15 * i;
      return {
        ob: Object.assign({}, o, { dressed: false }),
        obD: Object.assign({}, o, { dressed: true }),
        snap: snapAt(o.idx),
        i, sx, y: footY, h, startX, t0, back,
      };
    });
  }

  // block j of a stack: alternate widths for a stepped masonry silhouette
  function drawWalls(ctx, W, H, t, reduced) {
    const PAL = window.GenSoup ? GenSoup.PAL : null;
    if (!PAL) return;
    const bh = H * 0.075;
    const floorY = 0.92 * H;
    const stacks = [
      { x0: 0.02 * W, x1: 0.12 * W, t0: 3.6 },
      { x0: 0.88 * W, x1: 0.98 * W, t0: 3.85 },
    ];
    for (const st of stacks) {
      for (let j = 0; j < 6; j++) {
        const appear = st.t0 + j * 0.5;
        if (!reduced && t < appear) continue;
        const inset = (j % 2 === 1) ? 0.08 * (st.x1 - st.x0) : 0;
        const bx0 = st.x0 + inset, bx1 = st.x1 - inset;
        const bw = bx1 - bx0;
        const by = floorY - (j + 1) * bh;
        ctx.fillStyle = PAL.lit;
        ctx.fillRect(bx0, by, bw, bh);
        ctx.fillStyle = PAL.wall;
        ctx.fillRect(bx0 + bw * 0.35, by, bw * 0.65, bh);
      }
    }
  }

  function draw(ctx, W, H, t, reduced) {
    if (!W || !H || !window.GenEye || !window.GenOld) return;
    if (t < 0) t = 0;
    GenEye.draw(ctx, W, H, 99, reduced);

    const key = W + "x" + H;
    if (key !== figKey) { figKey = key; build(W, H); }
    drawWalls(ctx, W, H, t, reduced);
    if (!figs || !figs.length) return;

    const k = Math.floor((t - 2.8) / 1.2);
    const inWindow = t >= 2.8;
    const poolX = 0.30 * W;

    const back = figs.filter((f) => f.back);
    const front = figs.filter((f) => !f.back);

    function drawOne(f) {
      let x, y = f.y, h = f.h, phase = 0, gest = 0, look;
      if (reduced) {
        x = f.sx;
        look = poolX;
        const pose = { phase, look, sy: 1, kneel: 0, gest: 0, make: -1 };
        ctx.save();
        try {
          GenOld.drawKind(ctx, f.obD.kind, f.obD, x, y, h, pose);
        } catch (e) { /* skip a figure whose painter throws */ }
        ctx.restore();
        return;
      }

      if (t < f.t0) return;
      const u = clamp((t - f.t0) / 1.6, 0, 1);
      const uq = Math.floor(u * 8) / 8;
      x = lerp(f.startX, f.sx, uq);
      if (u > 0 && u < 1) {
        phase = Math.floor(t / STEP) * Math.PI / 2;
        look = f.sx;
      } else {
        phase = 0;
        look = poolX;
      }

      const dressed = t >= f.snap + BLINK;
      const blinking = t >= f.snap && t < f.snap + BLINK;
      if (blinking) return;

      if (!dressed && inWindow && (f.i + k) % 3 === 0) {
        const win = t - (2.8 + k * 1.2);
        gest = win < 0.4 ? 1 : 0;
      }

      const ob = dressed ? f.obD : f.ob;
      const pose = { phase, look, sy: 1, kneel: 0, gest, make: -1 };
      ctx.save();
      try {
        GenOld.drawKind(ctx, ob.kind, ob, x, y, h, pose);
      } catch (e) { /* skip a figure whose painter throws */ }
      ctx.restore();

      if (gest > 0) {
        const tw = h * 0.14, th = h * 0.18;
        const tx = x + h * 0.12, ty = y - h * 0.62;
        ctx.fillStyle = "#5c4a44";
        ctx.fillRect(tx, ty, tw, th);
        ctx.fillStyle = "#3e3234";
        ctx.fillRect(tx + tw * 0.4, ty, tw * 0.6, th);
      }
    }

    for (const f of back) drawOne(f);
    for (const f of front) drawOne(f);
  }

  return { draw };
})();
