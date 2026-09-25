/* js/world/admin-tear.js — Admin's Tear, a cut in reality: the Administration's grid pulled into a wound they keep stitching shut */
(function () {
  const { P, F, wx, onScreen, setA } = window.World;

  // The Void's peoples. x / oy is where each beacon was pinned in flight (NAV X / Y); `side` is how many radii left of the beacon the visual's centre sits so the beacon marks it rather than covering it.
  const ADMIN_TEAR = { x: 128000, oy: 0.34, side: -1.0 };

  const TEAR_JAG = [0.0, 0.6, -0.4, 0.9, -0.7, 0.3, -0.9, 0.7, -0.2, 0.5, -0.8, 0.4, 0.0];

  const TEAR_N = 25;

  const TEAR_MOTES = [];
  for (let i = 0; i < 18; i++) {
    TEAR_MOTES.push([i * 2.399963, (i * 0.618034) % 1, 0.07 + 0.05 * ((i * 7) % 5) / 4]);
  }

  const TEAR_SPECKS = [];
  for (let i = 0; i < 9; i++) {
    TEAR_SPECKS.push([-0.75 + i * 0.1875, ((i * 5) % 7) / 6 - 0.5, i * 1.7]);
  }

  const TEAR_STITCH = [-0.85, -0.75, 0.75, 0.85];

  function tearLine(cx, cy, h, f) {
    return cx + h * (0.09 * Math.sin(f * 3.4 + 0.5) + 0.16 * f);
  }

  function tearHalf(w, f, t) {
    return w * Math.pow(Math.max(0, 1 - f * f), 1.35) * (1 + 0.1 * Math.sin(f * 9 + t * 1.3));
  }

  function tearPath(ctx, pts, kL, kR, jk) {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const [x, y, hw, jit] = pts[i];
      const j = jit * (jk === undefined ? 1 : jk);
      const lx = x - hw * kL * (1 + j);
      if (i === 0) ctx.moveTo(lx, y); else ctx.lineTo(lx, y);
    }
    for (let i = pts.length - 1; i >= 0; i--) {
      const [x, y, hw, jit] = pts[i];
      const j = jit * (jk === undefined ? 1 : jk);
      ctx.lineTo(x + hw * kR * (1 - j * 0.6), y);
    }
    ctx.closePath();
  }

  function drawAdminTear() {
    const { ctx, W, H, t } = F;
    const h = Math.min(W, H) * 0.17;
    const bx = wx(ADMIN_TEAR.x, 0.94);
    const cx = bx + h * ADMIN_TEAR.side;
    const cy = H * ADMIN_TEAR.oy;
    if (!onScreen(cx, h * 2.4)) return;
    const w = h * 0.15 * (1 + 0.08 * Math.sin(t * 0.9));

    const pts = [];
    for (let i = 0; i < TEAR_N; i++) {
      const f = -1 + 2 * i / (TEAR_N - 1);
      const x = tearLine(cx, cy, h, f);
      const y = cy + f * h;
      const hw = tearHalf(w, f, t);
      const jit = 0.22 * TEAR_JAG[i % 13] * (0.8 + 0.2 * Math.sin(t * 2.1 + i));
      pts.push([x, y, hw, jit]);
    }

    // Halo — the tear emits light.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(0.55, 1);
    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, h * 2.3);
    halo.addColorStop(0, "rgba(196,180,255,0.20)");
    halo.addColorStop(0.35, "rgba(150,130,235,0.08)");
    halo.addColorStop(1, "rgba(150,130,235,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(-h * 2.3, -h * 2.3, h * 4.6, h * 4.6);
    ctx.restore();

    // Warp grid — the Administration's lattice, sucked into the cut.
    function warp(px, py) {
      const fc = Math.max(-1, Math.min(1, (py - cy) / h));
      const qx = tearLine(cx, cy, h, fc);
      const qy = cy + fc * h;
      const dx = px - qx, dy = py - qy;
      const d = Math.sqrt(dx * dx + dy * dy);
      const ripple = 1 + 0.18 * Math.sin(t * 1.4 + d / h * 7);
      let k = 0.72 * Math.exp(-(d * d) / (h * h * 0.28)) * ripple;
      if (k > 0.95) k = 0.95;
      const ks = 0.55 * Math.exp(-(d * d) / (h * h * 0.5)) * ripple;
      return [px - dx * k - dy * ks, py - dy * k + dx * ks];
    }
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(0.75, 1);
    const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, h * 1.9);
    gg.addColorStop(0, "rgba(190,175,255,0.40)");
    gg.addColorStop(0.45, "rgba(170,150,245,0.13)");
    gg.addColorStop(0.8, "rgba(170,150,245,0)");
    gg.addColorStop(1, "rgba(170,150,245,0)");
    ctx.beginPath();
    for (let j = -6; j <= 6; j++) {
      const y0 = cy + j * h * 0.2;
      for (let s = 0; s < 34; s++) {
        const x0 = cx - h * 1.9 + (h * 3.8) * s / 33;
        const [x, y] = warp(x0, y0);
        const xp = (x - cx) / 0.75, yp = y - cy;
        if (s === 0) ctx.moveTo(xp, yp); else ctx.lineTo(xp, yp);
      }
    }
    for (let j = -6; j <= 6; j++) {
      const x0 = cx + j * h * 0.3;
      for (let s = 0; s < 34; s++) {
        const y0 = cy - h * 1.9 + (h * 3.8) * s / 33;
        const [x, y] = warp(x0, y0);
        const xp = (x - cx) / 0.75, yp = y - cy;
        if (s === 0) ctx.moveTo(xp, yp); else ctx.lineTo(xp, yp);
      }
    }
    ctx.strokeStyle = gg;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // Infall motes — streaks spiralling into the cut, drawn before the rim so the rim covers their ends.
    ctx.beginPath();
    for (let i = 0; i < TEAR_MOTES.length; i++) {
      const [a0, seed, speed] = TEAR_MOTES[i];
      const p = (seed + t * speed) % 1;
      const p2 = Math.min(1, p + 0.05);
      const r1 = h * (1.15 * (1 - p) + 0.05);
      const a1 = a0 + p * 2.4;
      const r2 = h * (1.15 * (1 - p2) + 0.05);
      const a2 = a0 + p2 * 2.4;
      ctx.moveTo(cx + Math.cos(a1) * r1 * 0.6, cy + Math.sin(a1) * r1);
      ctx.lineTo(cx + Math.cos(a2) * r2 * 0.6, cy + Math.sin(a2) * r2);
    }
    ctx.strokeStyle = "rgba(226,214,255,0.38)";
    ctx.lineWidth = 1.2;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.lineCap = "butt";

    // Corona.
    tearPath(ctx, pts, 1.4, 1.4, 0.35);
    ctx.fillStyle = "rgba(214,200,255,0.22)"; ctx.fill();

    // Lip — the lit edge of reality.
    const flick = 0.86 + 0.14 * Math.sin(t * 7.3) * Math.sin(t * 3.1);
    tearPath(ctx, pts, 1, 1);
    ctx.fillStyle = `rgba(244,238,255,${flick.toFixed(3)})`; ctx.fill();

    // The void.
    tearPath(ctx, pts, 0.68, 0.84);
    ctx.fillStyle = "#030108"; ctx.fill();
    ctx.save();
    ctx.clip();

    // Seam down the centreline.
    ctx.beginPath();
    for (let i = 0; i < 18; i++) {
      const f = -0.9 + 1.8 * i / 17;
      const x = tearLine(cx, cy, h, f);
      const y = cy + f * h;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(120,90,200,0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Specks from the other side.
    ctx.beginPath();
    for (let i = 0; i < TEAR_SPECKS.length; i++) {
      const [f, side, ph] = TEAR_SPECKS[i];
      const ff = f + 0.04 * Math.sin(t * 0.5 + ph);
      const x = tearLine(cx, cy, h, ff) + side * tearHalf(w, ff, t) * 0.9 + Math.sin(t * 0.8 + ph) * w * 0.15;
      const y = cy + ff * h;
      ctx.rect(x - 1, y - 1, 2, 2);
    }
    ctx.fillStyle = "rgba(236,170,255,0.8)"; ctx.fill();
    ctx.restore();

    // Gold sutures — the Administration mending it from the tips.
    ctx.beginPath();
    TEAR_STITCH.forEach(function (f) {
      const x = tearLine(cx, cy, h, f);
      const y = cy + f * h;
      const s = Math.max(tearHalf(w, f, t) * 1.6, h * 0.03);
      ctx.moveTo(x - s, y - h * 0.018);
      ctx.lineTo(x + s, y + h * 0.018);
    });
    [-0.6, 0.62].forEach(function (f) {
      const x = tearLine(cx, cy, h, f);
      const y = cy + f * h;
      const s = tearHalf(w, f, t);
      ctx.moveTo(x - s * 2.3, y - h * 0.03);
      ctx.lineTo(x - s * 1.15, y + h * 0.012);
      ctx.moveTo(x + s * 1.15, y - h * 0.012);
      ctx.lineTo(x + s * 2.3, y + h * 0.03);
    });
    ctx.strokeStyle = "rgba(245,208,107,0.9)";
    ctx.lineWidth = 1.3;
    ctx.stroke();

    setA(1); ctx.lineWidth = 1;
  }

  P.drawAdminTear = drawAdminTear;
})();
