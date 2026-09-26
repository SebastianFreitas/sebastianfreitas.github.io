window.GenClash = (function () {
  "use strict";

  // the "clash" beat: a close view inside a flesh womb. Rex punches the red
  // dot (Obrokxus) into the womb wall; the wall bulges and tears open to
  // show tier-1 strata beyond. Flat fills, hard-edged shade, held steps only.

  const PAL = { deep: "#2a0a10", wall: "#4a141c", mid: "#6b2029", lit: "#8e3037", rose: "#b8525a" };
  const REX = { lit: "#c8b49a", shade: "#8a7560" };
  const DOT = { red: "#e04848", shade: "#a02a2e", core: "#f6c2b8" };
  const STRATA = ["#0d1114", "#16202a", "#1f2c38", "#27394a", "#1a2530"];
  const BLOWS = [0.8, 1.9, 3.0, 4.1];
  const TEAR = [4.1, 4.6, 5.1, 5.6];
  const TEAR_HW = [0.015, 0.035, 0.06, 0.09];
  const TEAR_HH = [0.10, 0.16, 0.22, 0.28];

  function hash(i) {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  function lerp(a, b, k) { return a + (b - a) * k; }

  function polyPath(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
  }

  function bulgeAt(y, W, H, nb) {
    return nb * 0.025 * W * Math.max(0, 1 - Math.abs(y - 0.48 * H) / (0.28 * H));
  }

  function edgeXAt(y, W, H, nb) {
    return 0.74 * W + bulgeAt(y, W, H, nb);
  }

  function wallEdgePts(W, H, nb) {
    const pts = [];
    for (let k = 0; k < 14; k++) {
      const y = lerp(-0.02 * H, 1.02 * H, k / 13);
      const jitter = (hash(k) - 0.5) * 0.02 * W;
      pts.push({ x: 0.74 * W + jitter + bulgeAt(y, W, H, nb), y });
    }
    return pts;
  }

  function drawWall(ctx, W, H, nb) {
    const edge = wallEdgePts(W, H, nb);
    const top = edge[0], bot = edge[edge.length - 1];

    // base fill: edge to the right screen edge
    ctx.fillStyle = PAL.mid;
    polyPath(ctx, edge.concat([{ x: W, y: bot.y }, { x: W, y: top.y }]));
    ctx.fill();

    // lit face: a thin strip along the edge, light from the left
    const litEdge = edge.map(p => ({ x: p.x + 0.035 * W, y: p.y }));
    ctx.fillStyle = PAL.lit;
    polyPath(ctx, edge.concat(litEdge.slice().reverse()));
    ctx.fill();

    // hard shade band across the far side of the wall
    const shadeStart = edge.map(p => ({ x: p.x + 0.35 * (W - p.x), y: p.y }));
    ctx.fillStyle = PAL.wall;
    polyPath(ctx, shadeStart.concat([{ x: W, y: bot.y }, { x: W, y: top.y }]));
    ctx.fill();
  }

  function buildTearPts(ts, cx, cy, W, hw, hh) {
    const pts = [];
    let k = 0;
    for (let i = 0; i < 9; i++) {
      const s = i / 8;
      const y = cy - hh + 2 * hh * s;
      const x = cx - hw * Math.sin(Math.PI * s) + (hash(ts * 31 + k) - 0.5) * 0.012 * W;
      pts.push({ x, y }); k++;
    }
    for (let i = 0; i < 9; i++) {
      const s = 1 - i / 8;
      const y = cy + hh - 2 * hh * (i / 8);
      const x = cx + hw * Math.sin(Math.PI * s) + (hash(ts * 31 + k) - 0.5) * 0.012 * W;
      pts.push({ x, y }); k++;
    }
    return pts;
  }

  function drawTear(ctx, W, H, ts, cx, cy) {
    const hw = TEAR_HW[ts - 1] * W, hh = TEAR_HH[ts - 1] * H;
    const tearPts = buildTearPts(ts, cx, cy, W, hw, hh);

    ctx.save();
    polyPath(ctx, tearPts);
    ctx.clip();

    const bandH = (2 * hh) / 5;
    const step = 0.006 * H;
    for (let i = 0; i < 5; i++) {
      const topL = cy - hh + i * bandH, botL = topL + bandH;
      const topR = topL + step, botR = botL + step;
      ctx.fillStyle = STRATA[i];
      ctx.fillRect(cx - hw * 1.2, topL, hw * 1.2, botL - topL);
      ctx.fillRect(cx, topR, hw * 1.2, botR - topR);
    }
    ctx.restore();
  }

  function drawArm(ctx, W, H, m, nb, ts, t) {
    const S = { x: -0.08 * W, y: 0.78 * H };
    const Fb = { x: 0.52 * W, y: 0.50 * H };
    const lunge = ts >= 1 ? false : BLOWS.some(b => t >= b && t < b + 0.35);
    const fx = Fb.x + (lunge ? 0.10 * W : 0) + Math.min(nb, 4) * 0.02 * W;
    const fy = 0.49 * H;

    const dx0 = fx - S.x, dy0 = fy - S.y;
    const len = Math.hypot(dx0, dy0) || 1;
    const dir = { x: dx0 / len, y: dy0 / len };
    const wrist = { x: fx - dir.x * 0.06 * m, y: fy - dir.y * 0.06 * m };
    const perpBottom = { x: -dir.y, y: dir.x };
    const perpTop = { x: dir.y, y: -dir.x };
    const Sh = 0.075 * m, Wh = 0.055 * m;

    const armPts = [
      { x: S.x + perpTop.x * Sh, y: S.y + perpTop.y * Sh },
      { x: wrist.x + perpTop.x * Wh, y: wrist.y + perpTop.y * Wh },
      { x: wrist.x + perpBottom.x * Wh, y: wrist.y + perpBottom.y * Wh },
      { x: S.x + perpBottom.x * Sh, y: S.y + perpBottom.y * Sh }
    ];
    ctx.fillStyle = REX.lit;
    polyPath(ctx, armPts);
    ctx.fill();

    const shadePts = [
      { x: S.x + perpTop.x * 0.35 * Sh, y: S.y + perpTop.y * 0.35 * Sh },
      { x: wrist.x + perpTop.x * 0.35 * Wh, y: wrist.y + perpTop.y * 0.35 * Wh },
      { x: wrist.x + perpBottom.x * Wh, y: wrist.y + perpBottom.y * Wh },
      { x: S.x + perpBottom.x * Sh, y: S.y + perpBottom.y * Sh }
    ];
    ctx.fillStyle = REX.shade;
    polyPath(ctx, shadePts);
    ctx.fill();

    // the fist
    const fw = 0.13 * m, fh = 0.11 * m, fr = 0.02 * m;
    const fx0 = fx - fw / 2, fy0 = fy - fh / 2;
    ctx.fillStyle = REX.lit;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(fx0, fy0, fw, fh, fr);
    else ctx.rect(fx0, fy0, fw, fh);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(fx0, fy0, fw, fh, fr);
    else ctx.rect(fx0, fy0, fw, fh);
    ctx.clip();
    ctx.fillStyle = REX.shade;
    ctx.fillRect(fx0 + fw * 0.35, fy0, fw * 0.65, fh);
    ctx.restore();

    ctx.fillStyle = PAL.deep;
    for (const off of [-0.035, 0, 0.035]) {
      const ny = fy + off * m;
      ctx.fillRect(fx + 0.065 * m - 0.012 * m, ny - 0.009 * m, 0.012 * m, 0.018 * m);
    }

    return { fx, fy };
  }

  function drawDot(ctx, W, H, m, nb, ts, cx, fx, fy) {
    const r = 0.034 * m;
    let dx = fx + 0.065 * m + r * 0.9;
    const dy = fy - 0.01 * m;
    const maxX = ts > 0 ? cx : edgeXAt(dy, W, H, nb);
    dx = Math.min(dx, maxX);

    ctx.fillStyle = DOT.red;
    ctx.beginPath();
    ctx.arc(dx, dy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(dx, dy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = DOT.shade;
    ctx.beginPath();
    ctx.arc(dx + 0.35 * r, dy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = DOT.core;
    ctx.beginPath();
    ctx.arc(dx - 0.25 * r, dy - 0.2 * r, 0.35 * r, 0, Math.PI * 2);
    ctx.fill();

    return dx;
  }

  function drawBlowRings(ctx, m, t, fx, fy, dx, dy) {
    for (const b of BLOWS) {
      if (t < b || t >= b + 0.45) continue;
      const step = Math.min(2, Math.floor((t - b) / 0.15));
      const cx = (fx + dx) / 2 + 0.02 * m, cy = dy;
      const outer = (0.05 + step * 0.04) * m, inner = outer - 0.012 * m;
      const rot = hash(b * 10) * Math.PI / 8;

      const outerPts = [], innerPts = [];
      for (let i = 0; i < 8; i++) {
        const a = rot + i * (Math.PI * 2 / 8);
        outerPts.push({ x: cx + Math.cos(a) * outer, y: cy + Math.sin(a) * outer });
        innerPts.push({ x: cx + Math.cos(a) * inner, y: cy + Math.sin(a) * inner });
      }

      ctx.fillStyle = PAL.rose;
      ctx.beginPath();
      ctx.moveTo(outerPts[0].x, outerPts[0].y);
      for (let i = 1; i < outerPts.length; i++) ctx.lineTo(outerPts[i].x, outerPts[i].y);
      ctx.closePath();
      ctx.moveTo(innerPts[0].x, innerPts[0].y);
      for (let i = 1; i < innerPts.length; i++) ctx.lineTo(innerPts[i].x, innerPts[i].y);
      ctx.closePath();
      ctx.fill("evenodd");
    }
  }

  function draw(ctx, W, H, t, reduced, noActors) {
    if (!W || !H) return;
    if (reduced) t = 99;
    if (t < 0) t = 0;

    const m = Math.min(W, H);
    const nb = BLOWS.filter(b => t >= b).length;
    const ts = TEAR.filter(b => t >= b).length;

    ctx.save();

    // field
    ctx.fillStyle = PAL.deep;
    ctx.fillRect(0, 0, W, H);

    drawWall(ctx, W, H, nb);

    const cy = 0.48 * H;
    const cx = edgeXAt(cy, W, H, nb) + 0.02 * W;
    if (ts > 0) drawTear(ctx, W, H, ts, cx, cy);

    if (!noActors) {
      const fist = drawArm(ctx, W, H, m, nb, ts, t);
      const dx = drawDot(ctx, W, H, m, nb, ts, cx, fist.fx, fist.fy);
      drawBlowRings(ctx, m, t, fist.fx, fist.fy, dx, fist.fy - 0.01 * m);
    }

    ctx.restore();
  }

  // the fist/dot/tear geometry at the final (t = 99) clash frame, for the
  // "death" beat to pick up where this one leaves off
  function geom(W, H) {
    const nb = BLOWS.length;
    const ts = TEAR.length;
    const cy = 0.48 * H;
    const cx = edgeXAt(cy, W, H, nb) + 0.02 * W;
    const hw = TEAR_HW[ts - 1] * W, hh = TEAR_HH[ts - 1] * H;
    const fx = 0.52 * W + Math.min(nb, 4) * 0.02 * W;
    const fy = 0.49 * H;
    const edgeX = edgeXAt(cy, W, H, nb);
    return { cx, cy, hw, hh, fx, fy, edgeX };
  }

  return { draw, geom };
})();
