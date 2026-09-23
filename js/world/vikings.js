/* js/world/vikings.js — the Vikings' constellation beside their beacon */
(function () {
  const { P, F, wx, onScreen, setA } = window.World;

  // The Void's peoples. x / oy is where each beacon was pinned in flight (NAV X / Y); `side` is how many radii left of the beacon the visual's centre sits so the beacon marks it rather than covering it.
  const VIKINGS = { x: 292000, oy: 0.30 };

  const VIKING_STARS = [[-10.2, -3.4], [-8.6, -2.6], [-7.9, -3.9], [-5.9, -1.2], [-4.8, -0.4], [-4.1, -1.6], [-3.3, 0.6], [-2.6, -0.9], [-1.9, 0.2], [-2.2, 1.4], [-3.9, 1.1], [-1.4, -1.8]];
  const VIKING_LINES = [[0, 1], [2, 1], [1, 3], [3, 5], [5, 4], [4, 10], [10, 6], [6, 9], [9, 8], [8, 7], [7, 5], [8, 11]];
  const VIKING_MAG = [0.7, 1.1, 0.55, 1.0, 0.8, 1.35, 0.9, 1.2, 0.75, 0.6, 1.0, 0.85];

  function drawVikings() {
    const { ctx, W, H, t } = F;
    const s = Math.min(W, H) * 0.045;
    const bx = wx(VIKINGS.x, 0.94);
    const by = H * VIKINGS.oy;
    if (!onScreen(bx - 5.7 * s, s * 7)) return;

    const ng = ctx.createRadialGradient(bx - 3.6 * s, by - 0.2 * s, 0, bx - 3.6 * s, by - 0.2 * s, 6 * s);
    ng.addColorStop(0, "rgba(90,150,255,0.07)");
    ng.addColorStop(1, "rgba(90,150,255,0)");
    ctx.fillStyle = ng;
    ctx.fillRect(bx - 3.6 * s - 6 * s, by - 0.2 * s - 6 * s, 12 * s, 12 * s);

    ctx.beginPath();
    VIKING_LINES.forEach(function (l) {
      const [ax, ay] = VIKING_STARS[l[0]], [zx, zy] = VIKING_STARS[l[1]];
      ctx.moveTo(bx + ax * s, by + ay * s);
      ctx.lineTo(bx + zx * s, by + zy * s);
    });
    ctx.strokeStyle = "rgba(127,184,255,0.35)"; ctx.lineWidth = 1;
    ctx.stroke();

    VIKING_STARS.forEach(function (p, i) {
      const x = bx + p[0] * s, y = by + p[1] * s;
      const k = 0.6 + 0.4 * Math.sin(t * 1.3 + i * 2.3 + VIKING_MAG[i] * 4.1);
      setA(0.25 * k); ctx.fillStyle = "#7fb8ff";
      ctx.beginPath(); ctx.arc(x, y, s * 0.32 * VIKING_MAG[i], 0, 6.283); ctx.fill();
      setA(k); ctx.fillStyle = "#cfe6ff";
      ctx.beginPath(); ctx.arc(x, y, s * (0.09 + 0.05 * k) * VIKING_MAG[i], 0, 6.283); ctx.fill();
    });

    setA(1); ctx.lineWidth = 1;
  }

  P.drawVikings = drawVikings;
})();
