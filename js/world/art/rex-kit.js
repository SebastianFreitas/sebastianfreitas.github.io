/* js/world/art/rex-kit.js — shared helpers for the Rex landmark painters */
(function () {
  const { poly } = Paint;
  const rng = Util.mulberry;

  function archWin(g, cx, yTop, w, h) {
    g.beginPath();
    g.moveTo(cx - w / 2, yTop + h);
    g.lineTo(cx - w / 2, yTop + w / 2);
    g.arc(cx, yTop + w / 2, w / 2, Math.PI, 2 * Math.PI);
    g.lineTo(cx + w / 2, yTop + h);
    g.closePath();
  }

  function lancet(g, cx, w, yBottom, ySpring, yApex) {
    const q = ySpring + (yApex - ySpring) * 0.75;
    g.beginPath();
    g.moveTo(cx - w / 2, yBottom);
    g.lineTo(cx - w / 2, ySpring);
    g.quadraticCurveTo(cx - w / 2, q, cx, yApex);
    g.quadraticCurveTo(cx + w / 2, q, cx + w / 2, ySpring);
    g.lineTo(cx + w / 2, yBottom);
    g.closePath();
  }

  function cutFoot(g, x0, x1, yCut) {
    g.save();
    g.globalCompositeOperation = "destination-out";
    g.fillStyle = "#000";
    g.fillRect(x0, yCut, x1 - x0, 50);
    g.restore();
  }

  function pocket(seed, rx, ry, floor) {
    const r = rng(seed);
    const pts = [];
    for (let i = 0; i < 56; i++) {
      const th = i / 56 * 2 * Math.PI;
      const k = 1 + 0.06 * Math.sin(3 * th + (seed % 7)) + 0.035 * (2 * r() - 1);
      const x = rx * Math.cos(th) * k;
      const y = ry * Math.sin(th) * k * (Math.sin(th) > 0 ? floor : 1);
      pts.push([x, y]);
    }
    return pts;
  }

  function trace(g, pts) {
    poly(g, pts);
  }

  function spill(g, rx, ry, rgb, a0) {
    g.save();
    g.scale(rx + 5, ry + 5);
    g.fillStyle = `rgba(${rgb},${a0 * 0.4})`;
    g.beginPath(); g.arc(0, 0, 1, 0, 2 * Math.PI); g.fill();
    g.beginPath(); g.arc(0, 0, 0.72, 0, 2 * Math.PI); g.fill();
    g.restore();
  }

  function lip(g, pts, seed) {
    const r = rng(seed);
    const minY = Math.min(...pts.map(p => p[1]));
    for (let i = 0; i < pts.length; i++) {
      if (i % 3 === 0 && pts[i][1] < 0.55 * minY) {
        const len = 1.0 + r() * 1.4;
        const j = (r() - 0.5) * 0.3;
        const [x, y] = pts[i];
        poly(g, [[x - 0.45, y - 0.1], [x + 0.45, y - 0.1], [x + j, y + len]]);
        g.fillStyle = "#1b232a";
        g.fill();
      }
    }
  }

  window.RexKit = { archWin, lancet, cutFoot, pocket, trace, spill, lip };
})();
