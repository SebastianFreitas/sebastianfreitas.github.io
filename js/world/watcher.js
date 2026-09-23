/* js/world/watcher.js — the Watcher: the disc, its cracks, shards and the red star beside it */
(function () {
  const { P, F, wx, onScreen, setA, LAND } = window.World;

  // The red star beside the Watcher. x / oy match the beacon (NAV X / Y); the star sits `side` radii to the left so the beacon marks it rather than covering it.
  const RED_STAR = { x: 334257, oy: 0.40, side: -3.4 };

  // Hash in 0..1, used to build the Watcher's fixed reality-artifact geometry.
  function wh(n) {
    const h = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
    return h - Math.floor(h);
  }

  // Void's background flat colour, matched so torn-out chips read as reality missing rather than a patch of colour.
  const VOID_INK = "#0d1114";

  // Broken-off quad shards, floating near the disc. Fixed geometry, computed once at module load.
  const WATCHER_SHARDS = Array.from({ length: 9 }, (_, i) => ({
    a: i / 9 * 6.283 + (wh(i) - 0.5) * 0.5,
    d: 1.07 + 0.4 * wh(i + 20),
    s: 0.04 + 0.08 * wh(i + 40),
    rot: wh(i + 60) * 6.283,
    spin: (wh(i + 80) - 0.5) * 0.1,
    pts: [0, 1, 2, 3].map(k => [k / 4 * 6.283 + (wh(i * 4 + k + 100) - 0.5) * 1.1, 0.55 + 0.45 * wh(i * 4 + k + 200)]),
  }));

  // Jagged crack polylines running out from the disc's rim. Fixed geometry, computed once at module load.
  const WATCHER_CRACKS = Array.from({ length: 6 }, (_, i) => {
    const a0 = i / 6 * 6.283 + wh(i + 300) * 0.8;
    const n = 5;
    const len = 0.5 + 0.6 * wh(i + 310);
    return { pts: Array.from({ length: n + 1 }, (_, k) => [a0 + (k === 0 ? 0 : (wh(i * 10 + k + 320) - 0.5) * 0.35), 1.0 + len * k / n]) };
  });

  function drawWatcher() {
    const { ctx, W, H, t } = F;
    const x = wx(LAND.watcher, 0.24);
    const R = Math.min(W, H) * 0.26;
    if (!onScreen(x, R * 3.2)) return;
    const y = H * 0.21;
    const ph = P.serusPhase(); const dim = 1 - 0.5 * ph.closure * ph.season;
    const step = Util.reduced() ? 0 : Math.floor(t * 1.3);

    // Glow
    const g = ctx.createRadialGradient(x, y, R * 0.5, x, y, R * 3.1);
    g.addColorStop(0, "rgba(226,226,218,0.08)");
    g.addColorStop(0.35, "rgba(170,170,166,0.03)");
    g.addColorStop(1, "rgba(226,226,218,0)");
    ctx.fillStyle = g; setA(dim); ctx.fillRect(x - R * 3.2, y - R * 3.2, R * 6.4, R * 6.4); setA(1);

    // Cracks, behind the disc -- reality splitting at the rim
    for (let i = 0; i < WATCHER_CRACKS.length; i++) {
      const on = wh(i * 7 + step * 13) > 0.25;
      if (!on) continue;
      const c = WATCHER_CRACKS[i];
      ctx.lineWidth = Math.max(1, R * 0.006);
      ctx.strokeStyle = "rgba(232,232,224,0.28)"; setA(dim);
      ctx.beginPath();
      for (let k = 0; k < c.pts.length; k++) {
        const [a2, rf] = c.pts[k];
        const px = x + Math.cos(a2) * R * rf, py = y + Math.sin(a2) * R * rf;
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.strokeStyle = "rgba(200,60,70,0.18)"; setA(dim);
      ctx.beginPath();
      for (let k = 0; k < c.pts.length; k++) {
        const [a2, rf] = c.pts[k];
        const px = x + Math.cos(a2) * R * rf + R * 0.012, py = y + Math.sin(a2) * R * rf;
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.lineWidth = 1; setA(1);

    // Disc, no shading -- the Watcher is a light source
    ctx.beginPath(); ctx.arc(x, y, R, 0, 6.283);
    ctx.fillStyle = "#dcdbd4"; ctx.fill();

    // Iris band, flat
    ctx.beginPath();
    ctx.arc(x, y, R * 0.9, 0, 6.283);
    ctx.arc(x, y, R * 0.62, 6.283, 0, true);
    ctx.fillStyle = "#d2d0c7"; ctx.fill();
    ctx.beginPath();
    for (let j = 0; j < 28; j++) {
      const a2 = j / 28 * 6.283 + 0.08 * Math.sin(j * 3.1);
      const r0 = R * 0.64, r1 = R * (0.8 + 0.08 * Math.sin(j * 5.3));
      ctx.moveTo(x + Math.cos(a2) * r0, y + Math.sin(a2) * r0);
      ctx.lineTo(x + Math.cos(a2) * r1, y + Math.sin(a2) * r1);
    }
    ctx.strokeStyle = "rgba(170,168,158,0.35)"; ctx.lineWidth = Math.max(1, R * 0.006); ctx.stroke();
    ctx.lineWidth = 1;

    // Rim chips -- void-coloured notches bitten out of the rim
    for (let j = 0; j < 4; j++) {
      const a2 = wh(j + 400) * 6.283 + 0.4 * Math.sin(t * 0.02 + j);
      const s = R * (0.05 + 0.05 * wh(j + 410));
      const cx = x + Math.cos(a2) * R * 1.0, cy = y + Math.sin(a2) * R * 1.0;
      const pts = WATCHER_SHARDS[j].pts;
      ctx.beginPath();
      for (let k = 0; k < pts.length; k++) {
        const [pa, rf] = pts[k];
        const px = cx + Math.cos(pa) * rf * s, py = cy + Math.sin(pa) * rf * s;
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = VOID_INK; setA(1); ctx.fill();
    }

    // Floating shards -- broken-off pieces of the disc
    for (let i = 0; i < WATCHER_SHARDS.length; i++) {
      const sh = WATCHER_SHARDS[i];
      const jit = wh(i * 3 + step * 7) > 0.8 ? R * 0.03 * (wh(i + step) - 0.5) : 0;
      const a2 = sh.a + t * 0.004;
      const cx = x + Math.cos(a2) * R * sh.d + jit, cy = y + Math.sin(a2) * R * sh.d;
      const rot = sh.rot + t * sh.spin;
      ctx.beginPath();
      for (let k = 0; k < sh.pts.length; k++) {
        const [pa, rf] = sh.pts[k];
        const lx = Math.cos(pa) * rf * R * sh.s, ly = Math.sin(pa) * rf * R * sh.s;
        const px = cx + lx * Math.cos(rot) - ly * Math.sin(rot);
        const py = cy + lx * Math.sin(rot) + ly * Math.cos(rot);
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = "#dcdbd4"; setA(dim * (0.45 + 0.4 * wh(i + 500))); ctx.fill();
    }
    setA(1);

    // Broken ring fragments
    const radii = [1.3, 1.45, 1.62], starts = [0.4, 2.6, 4.4], speeds = [0.012, -0.008, 0.005];
    const spans = [1.9, 1.2, 2.6], widths = [0.012, 0.007, 0.005], alphas = [0.26, 0.18, 0.12];
    ctx.lineCap = "round";
    for (let m = 0; m < 3; m++) {
      const rad = R * radii[m];
      const s = starts[m] + t * speeds[m];
      const span = spans[m];
      ctx.lineWidth = Math.max(1, R * widths[m]);
      ctx.strokeStyle = `rgba(232,232,224,${alphas[m]})`; setA(dim);
      ctx.beginPath(); ctx.arc(x, y, rad, s, s + span); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, rad, s + span + 0.5, s + span + 0.5 + span * 0.3); ctx.stroke();
    }
    ctx.lineCap = "butt"; setA(1); ctx.lineWidth = 1;

    // Tear strips -- horizontal slices of the canvas copied back offset, like reality slipping
    for (let k = 0; k < 3; k++) {
      const on = !Util.reduced() && wh(k * 11 + step * 17) > 0.45;
      if (!on) continue;
      const sy = y + (wh(k * 5 + step * 3) - 0.5) * 2.2 * R;
      const sh = R * (0.025 + 0.05 * wh(k + step * 19));
      const off = (wh(k * 9 + step * 23) - 0.5) * 0.35 * R;
      const m = ctx.getTransform();
      let dx0 = (x - 1.6 * R) * m.a + m.e;
      let dy0 = sy * m.d + m.f;
      let dw = 3.2 * R * m.a;
      let dh = sh * m.d;
      if (dx0 < 0) { dw += dx0; dx0 = 0; }
      if (dx0 + dw > ctx.canvas.width) dw = ctx.canvas.width - dx0;
      if (dy0 < 0) { dh += dy0; dy0 = 0; }
      if (dy0 + dh > ctx.canvas.height) dh = ctx.canvas.height - dy0;
      if (dw <= 0 || dh <= 0) continue;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
      ctx.drawImage(ctx.canvas, dx0, dy0, dw, dh, dx0 + off * m.a, dy0, dw, dh);
      ctx.restore();
    }

    P.drawSerus(x, y, R, ph);
  }

  function drawRedStar() {
    const { ctx, W, H, t } = F;
    const r = Math.min(W, H) * 0.03;
    const x = wx(RED_STAR.x, 0.24) + r * RED_STAR.side;
    if (!onScreen(x, r * 6)) return;
    const y = H * RED_STAR.oy;
    const p = 1 + Math.sin(t * 0.8) * 0.08;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 5 * p);
    g.addColorStop(0, "rgba(255,110,90,0.55)");
    g.addColorStop(0.12, "rgba(255,70,60,0.3)");
    g.addColorStop(0.45, "rgba(190,30,50,0.07)");
    g.addColorStop(1, "rgba(190,30,50,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 5 * p, y - r * 5 * p, r * 10 * p, r * 10 * p);

    // Flat 4-point star
    ctx.fillStyle = "#ff6a5a"; setA(0.55);
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      const ang = k * 1.5708;
      const outR = (k % 2 === 0) ? r * 1.7 * p : r * 2.6 * p;
      const ox = x + Math.cos(ang) * outR, oy = y + Math.sin(ang) * outR;
      if (k === 0) ctx.moveTo(ox, oy); else ctx.lineTo(ox, oy);
      const inAng = ang + 0.7854;
      ctx.lineTo(x + Math.cos(inAng) * r * 0.32, y + Math.sin(inAng) * r * 0.32);
    }
    ctx.closePath(); ctx.fill();

    // Smaller star, rotated 45deg
    ctx.fillStyle = "#ff8a74"; setA(0.4);
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      const ang = k * 1.5708 + 0.7854;
      const ox = x + Math.cos(ang) * r * 1.0 * p, oy = y + Math.sin(ang) * r * 1.0 * p;
      if (k === 0) ctx.moveTo(ox, oy); else ctx.lineTo(ox, oy);
      const inAng = ang + 0.7854;
      ctx.lineTo(x + Math.cos(inAng) * r * 0.22, y + Math.sin(inAng) * r * 0.22);
    }
    ctx.closePath(); ctx.fill();

    setA(1); ctx.fillStyle = "#ff5a48";
    ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, 6.283); ctx.fill();
    ctx.fillStyle = "rgba(255,226,214,0.95)";
    ctx.beginPath(); ctx.arc(x, y, r * 0.28, 0, 6.283); ctx.fill();
    setA(1); ctx.lineWidth = 1;
  }

  P.drawWatcher = drawWatcher;
  P.drawRedStar = drawRedStar;
})();
