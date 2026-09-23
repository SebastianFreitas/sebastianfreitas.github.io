/* js/world/admin-tear.js — Admin's Tear, a wound in reality beside its beacon */
(function () {
  const { P, F, wx, onScreen, setA } = window.World;

  // The Void's peoples. x / oy is where each beacon was pinned in flight (NAV X / Y); `side` is how many radii left of the beacon the visual's centre sits so the beacon marks it rather than covering it.
  const ADMIN_TEAR = { x: 128000, oy: 0.34, side: -1.0 };

  const TEAR_JAG = [0.0, 0.35, -0.2, 0.5, -0.35, 0.25, -0.45, 0.4, -0.15, 0.3, -0.4, 0.2, 0.0];

  function drawAdminTear() {
    const { ctx, W, H, t } = F;
    const h = Math.min(W, H) * 0.17;
    const w = h * 0.28 * (1 + Math.sin(t * 0.7) * 0.05);
    const bx = wx(ADMIN_TEAR.x, 0.94);
    const cx = bx + h * ADMIN_TEAR.side;
    const cy = H * ADMIN_TEAR.oy;
    if (!onScreen(cx, h * 2.2)) return;

    const left = [], right = [];
    for (let i = 0; i < 13; i++) {
      const f = -1 + i / 6;
      const prof = 1 - Math.pow(Math.abs(f), 1.5);
      const drift = w * 0.25 * TEAR_JAG[(i + 4) % 13];
      const lx = cx + drift - w * prof * (1 + 0.35 * TEAR_JAG[i]);
      const rx = cx + drift + w * prof * (1 + 0.35 * TEAR_JAG[(i + 6) % 13]);
      const y = cy + f * h;
      left.push([lx, y, drift]); right.push([rx, y, drift]);
    }

    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, h * 2.2);
    g.addColorStop(0, "rgba(200,190,255,0.12)");
    g.addColorStop(0.4, "rgba(160,140,230,0.04)");
    g.addColorStop(1, "rgba(160,140,230,0)");
    ctx.fillStyle = g;
    ctx.fillRect(cx - h * 2.2, cy - h * 2.2, h * 4.4, h * 4.4);

    ctx.beginPath();
    ctx.moveTo(left[0][0], left[0][1]);
    for (let i = 1; i < 13; i++) ctx.lineTo(left[i][0], left[i][1]);
    for (let i = 12; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
    ctx.closePath();
    ctx.fillStyle = "rgba(236,226,255,0.9)"; ctx.fill();

    ctx.beginPath();
    let mid = left[0][2] + cx;
    let px = mid + (left[0][0] - mid) * 0.45;
    ctx.moveTo(px, left[0][1]);
    for (let i = 1; i < 13; i++) {
      mid = left[i][2] + cx;
      px = mid + (left[i][0] - mid) * 0.45;
      ctx.lineTo(px, left[i][1]);
    }
    for (let i = 12; i >= 0; i--) {
      mid = right[i][2] + cx;
      px = mid + (right[i][0] - mid) * 0.45;
      ctx.lineTo(px, right[i][1]);
    }
    ctx.closePath();
    ctx.fillStyle = "#020104"; ctx.fill();

    ctx.beginPath();
    [-0.6, -0.36, -0.12, 0.12, 0.36, 0.6].forEach(function (f) {
      const prof = 1 - Math.pow(Math.abs(f), 1.5);
      const L = w * 1.6 * prof;
      ctx.moveTo(cx - L, cy + f * h - h * 0.03);
      ctx.lineTo(cx + L, cy + f * h + h * 0.03);
    });
    ctx.strokeStyle = "rgba(245,208,107,0.75)"; ctx.lineWidth = 1.5;
    ctx.stroke();

    setA(1); ctx.lineWidth = 1;
  }

  P.drawAdminTear = drawAdminTear;
})();
