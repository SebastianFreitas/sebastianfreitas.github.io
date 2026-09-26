window.GenCircle = (function () {
  "use strict";

  let geo = null, geoKey = "";

  function hash(i) {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  function lerp(a, b, u) { return a + (b - a) * u; }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function build(W, H) {
    const m = Math.min(W, H);
    const C = { x: 0.56 * W, y: 0.50 * H };
    const R = 0.15 * m;
    const P = { x: 0.30 * W, y: 0.24 * H };

    const dust = [];
    for (let i = 0; i < 44; i++) {
      const sx = W * (0.15 + 0.70 * hash(i * 5 + 1));
      const sy = H * (0.86 + 0.05 * hash(i * 5 + 2));
      const r = m * (0.004 + 0.005 * hash(i * 5 + 5));
      const a = Math.PI * (0.15 + 0.70 * hash(i * 5 + 3));
      const tx = C.x + Math.cos(a) * R * (0.55 + 0.4 * hash(i * 5 + 4));
      const ty = C.y + Math.sin(a) * R * (0.55 + 0.4 * hash(i * 5 + 4));
      dust.push({ sx, sy, tx, ty, r, t0: 1.2 + 0.03 * i });
    }

    const strands = [];
    for (let s = 0; s < 28; s++) {
      const edge = hash(s * 9 + 1);
      let sx, sy;
      if (edge < 0.25) { sx = W * hash(s * 9 + 2); sy = 0; }
      else if (edge < 0.5) { sx = W; sy = H * hash(s * 9 + 2); }
      else if (edge < 0.75) { sx = W * hash(s * 9 + 2); sy = H; }
      else { sx = 0; sy = H * hash(s * 9 + 2); }
      const dx = sx - C.x, dy = sy - C.y;
      const dist0 = Math.sqrt(dx * dx + dy * dy);
      const a0 = Math.atan2(dy, dx);
      const turns = 1.25 * (0.85 + 0.3 * hash(s * 9 + 3));
      const pts = [];
      const N = 40;
      for (let k = 0; k < N; k++) {
        const u = k / (N - 1);
        const rad = lerp(dist0, R, u);
        const ang = a0 + turns * 2 * Math.PI * u;
        pts.push({ x: C.x + Math.cos(ang) * rad, y: C.y + Math.sin(ang) * rad });
      }
      strands.push({ pts, t0: 2.0 + 0.06 * s });
    }

    // colour thread: nearest ring point to P
    const dPx = P.x - C.x, dPy = P.y - C.y;
    const angP = Math.atan2(dPy, dPx);
    const ringPt = { x: C.x + Math.cos(angP) * R, y: C.y + Math.sin(angP) * R };
    const mid = { x: (P.x + ringPt.x) / 2, y: (P.y + ringPt.y) / 2 - 0.12 * H };

    geo = { m, C, R, P, dust, strands, ringPt, mid };
  }

  function drawRing(ctx, geo, t, m) {
    const steps = Math.min(8, Math.max(0, Math.floor(t / 0.15)));
    if (steps <= 0) return;
    ctx.strokeStyle = "#9a8f8c";
    ctx.lineWidth = Math.max(2, 0.012 * m);
    const seg = Math.PI * 2 / 8;
    for (let i = 0; i < steps; i++) {
      const a0 = -Math.PI / 2 + i * seg;
      const a1 = a0 + seg;
      ctx.beginPath();
      ctx.arc(geo.C.x, geo.C.y, geo.R, a0, a1);
      ctx.stroke();
    }
  }

  function drawDust(ctx, geo, t, m) {
    for (const d of geo.dust) {
      const u = clamp((t - d.t0) / 1.2, 0, 1);
      const uq = Math.floor(u * 6) / 6;
      const x = lerp(d.sx, d.tx, uq);
      const y = lerp(d.sy, d.ty, uq);
      if (window.GenSoup && GenSoup.shaded) {
        GenSoup.shaded(ctx, x, y, d.r, "#6f6664", "#4f4746", m);
      } else {
        ctx.fillStyle = "#6f6664";
        ctx.beginPath();
        ctx.arc(x, y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawStrands(ctx, geo, t, m) {
    ctx.strokeStyle = "#7a6e6c";
    ctx.lineWidth = Math.max(1, 0.0025 * m);
    for (const s of geo.strands) {
      const u = clamp((t - s.t0) / 1.6, 0, 1);
      const uq = Math.floor(u * 8) / 8;
      if (uq <= 0) continue;
      const n = Math.max(2, Math.floor(s.pts.length * uq));
      ctx.beginPath();
      ctx.moveTo(s.pts[0].x, s.pts[0].y);
      for (let k = 1; k < n; k++) ctx.lineTo(s.pts[k].x, s.pts[k].y);
      ctx.stroke();
    }
  }

  function drawThread(ctx, geo, t, m) {
    if (t < 4.2) return;
    const u = clamp((t - 4.2) / 1.0, 0, 1);
    const uq = Math.floor(u * 6) / 6;
    if (uq > 0) {
      ctx.strokeStyle = "#b8525a";
      ctx.lineWidth = Math.max(2, 0.005 * m);
      ctx.beginPath();
      ctx.moveTo(geo.P.x, geo.P.y);
      const cx = lerp(geo.P.x, geo.mid.x, uq);
      const cy = lerp(geo.P.y, geo.mid.y, uq);
      const ex = lerp(geo.P.x, geo.ringPt.x, uq);
      const ey = lerp(geo.P.y, geo.ringPt.y, uq);
      ctx.quadraticCurveTo(cx, cy, ex, ey);
      ctx.stroke();
    }
    ctx.fillStyle = "#b8525a";
    ctx.beginPath();
    ctx.arc(geo.P.x, geo.P.y, 0.012 * m, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawUniverse(ctx, geo) {
    const C = geo.C, R = geo.R;
    ctx.fillStyle = "#5a4c4e";
    ctx.beginPath();
    ctx.arc(C.x, C.y, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(C.x, C.y, R, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#6e5e60";
    ctx.fillRect(C.x - R, C.y - R, 0.64 * R, 2 * R);
    ctx.restore();
    ctx.fillStyle = "#8e3037";
    ctx.beginPath();
    ctx.arc(C.x - 0.2 * R, C.y - 0.1 * R, 0.05 * R, 0, Math.PI * 2);
    ctx.fill();
  }

  function draw(ctx, W, H, t, reduced) {
    if (!W || !H) return;
    if (reduced) t = 99;
    if (t < 0) t = 0;

    if (window.GenRoles) {
      try { GenRoles.draw(ctx, W, H, 99, reduced); } catch (e) { /* skip backdrop */ }
    }

    const key = W + "x" + H;
    if (key !== geoKey) { geoKey = key; build(W, H); }
    if (!geo) return;

    const snapped = t >= 5.6;

    if (!snapped) {
      drawRing(ctx, geo, t, geo.m);
      if (t >= 1.2 && t < 4.0 + 1.2) drawDust(ctx, geo, t, geo.m);
      if (t >= 2.0) drawStrands(ctx, geo, t, geo.m);
    } else {
      drawUniverse(ctx, geo);
    }

    if (t >= 4.2) drawThread(ctx, geo, t, geo.m);
  }

  return { draw };
})();
