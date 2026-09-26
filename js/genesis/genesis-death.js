window.GenDeath = (function () {
  "use strict";

  // the "death" beat: Rex dies before he leaves the womb. His fist has
  // already closed on the red dot (Obrokxus) at the torn womb wall, and now
  // it drags into the tear towards tier-1 strata beyond. Held steps only:
  // the fist steps inward, the fingers curl shut over the dot in two stages,
  // and the flesh cools from living warmth to dead grey. Flat fills only.

  const DOT = { red: "#e04848", shade: "#a02a2e", core: "#f6c2b8" };
  const DEATH = {
    warm: { lit: "#c8b49a", shade: "#8a7560" },
    cool: { lit: "#a39a8c", shade: "#6f685e" },
    dead: { lit: "#7d7a74", shade: "#55524d" }
  };

  function lerp(a, b, k) { return a + (b - a) * k; }

  function polyPath(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, rr);
    else ctx.rect(x, y, w, h);
  }

  function drawArmAndFist(ctx, W, H, m, fx, fy, col) {
    const S = { x: -0.08 * W, y: 0.78 * H };
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
    ctx.fillStyle = col.lit;
    polyPath(ctx, armPts);
    ctx.fill();

    const shadePts = [
      { x: S.x + perpTop.x * 0.35 * Sh, y: S.y + perpTop.y * 0.35 * Sh },
      { x: wrist.x + perpTop.x * 0.35 * Wh, y: wrist.y + perpTop.y * 0.35 * Wh },
      { x: wrist.x + perpBottom.x * Wh, y: wrist.y + perpBottom.y * Wh },
      { x: S.x + perpBottom.x * Sh, y: S.y + perpBottom.y * Sh }
    ];
    ctx.fillStyle = col.shade;
    polyPath(ctx, shadePts);
    ctx.fill();

    // the fist
    const fw = 0.13 * m, fh = 0.11 * m, fr = 0.02 * m;
    const fx0 = fx - fw / 2, fy0 = fy - fh / 2;
    ctx.fillStyle = col.lit;
    roundRectPath(ctx, fx0, fy0, fw, fh, fr);
    ctx.fill();

    ctx.save();
    roundRectPath(ctx, fx0, fy0, fw, fh, fr);
    ctx.clip();
    ctx.fillStyle = col.shade;
    ctx.fillRect(fx0 + fw * 0.35, fy0, fw * 0.65, fh);
    ctx.restore();
  }

  function drawDot(ctx, dx, dy, r) {
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
  }

  // four fingers curl shut over the dot, in two held stages: halfway,
  // then wrapped fully with a downward hook tip; the gaps between the
  // bars stay open so the dot keeps showing through
  function drawFingers(ctx, m, fx, fy, wrapped, col) {
    const left = fx + 0.05 * m;
    const barH = 0.018 * m;
    const spacing = 0.024 * m;
    const width = wrapped ? 0.085 * m : 0.05 * m;
    const r = 0.012 * m;

    ctx.fillStyle = col.lit;
    for (let i = 0; i < 4; i++) {
      const top = fy - 0.045 * m + i * spacing;
      roundRectPath(ctx, left, top, width, barH, r);
      ctx.fill();
      if (wrapped) {
        const tipX = left + width - 0.018 * m;
        roundRectPath(ctx, tipX, top, 0.018 * m, 0.03 * m, r);
        ctx.fill();
      }
    }

    if (wrapped) {
      ctx.fillStyle = col.lit;
      ctx.fillRect(fx + 0.05 * m, fy + 0.045 * m, 0.07 * m, 0.02 * m);
    }
  }

  function draw(ctx, W, H, t, reduced) {
    if (!W || !H) return;
    if (reduced) t = 99;
    if (t < 0) t = 0;

    const m = Math.min(W, H);

    ctx.save();

    if (!window.GenClash) {
      ctx.fillStyle = "#2a0a10";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
      return;
    }

    // the wall and tear, held at the clash beat's final frame, with no
    // fist, dot or blow rings of its own
    GenClash.draw(ctx, W, H, 99, true, true);
    const g = GenClash.geom(W, H);

    // the fist reaches into the tear in three held steps
    const s1 = t >= 0.6, s2 = t >= 1.4, s3 = t >= 2.2, s4 = t >= 3.0;
    // s5: from here on nothing moves at all, held still
    const n = [s1, s2, s3].filter(Boolean).length;

    const fx = lerp(g.fx, g.cx - 0.04 * m, n / 3);
    const fy = g.fy;

    const col = t < 3.8 ? DEATH.warm : (t < 4.6 ? DEATH.cool : DEATH.dead);

    drawArmAndFist(ctx, W, H, m, fx, fy, col);

    const r = 0.034 * m;
    const dx = fx + 0.07 * m, dy = fy - 0.005 * m;
    drawDot(ctx, dx, dy, r);

    if (s3) drawFingers(ctx, m, fx, fy, s4, col);

    ctx.restore();
  }

  return { draw };
})();
