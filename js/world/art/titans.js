/* ===========================================================
   TITANS — a hidden green valley with rivers, a waterfall and a
   colossal titan in the haze.

   Coordinates are art units, origin at the hollow's centre, +x
   right, +y down. paint(g, px) draws the static art once into an
   offscreen sprite; live(g, px, t, a) draws motion on top of it,
   every frame, in the same unit transform.
   =========================================================== */

(function () {
  const RexArt = window.RexArt = window.RexArt || {};

  const { poly, line, circle } = Paint;
  const { pocket, trace, spill, lip } = RexKit;
  const rng = Util.mulberry;

  /* ================================================================
     TITANS — a hidden green valley with rivers, a waterfall and a
     colossal titan in the haze.
     ================================================================ */

  const TT_POCKET = pocket(7101, 18, 10, 0.78);
  const ttFar = x => -2.0 - 2.4 * Math.pow(Math.sin(0.21 * x + 0.9), 2) - 0.9 * Math.sin(0.57 * x + 2.1);
  const ttMid = x => 1.6 - 1.4 * Math.sin(0.33 * x - 0.4) - 0.6 * Math.sin(0.9 * x + 1.1);

  function ttRiver(s) {
    const p0 = [-12.6, 0.9], c1 = [-6, 2.2], c2 = [-9, 6.5], p3 = [3.5, 10.5];
    const u = 1 - s;
    const x = u * u * u * p0[0] + 3 * u * u * s * c1[0] + 3 * u * s * s * c2[0] + s * s * s * p3[0];
    const y = u * u * u * p0[1] + 3 * u * u * s * c1[1] + 3 * u * s * s * c2[1] + s * s * s * p3[1];
    return [x, y];
  }
  function ttRiverD(s) {
    const p0 = [-12.6, 0.9], c1 = [-6, 2.2], c2 = [-9, 6.5], p3 = [3.5, 10.5];
    const u = 1 - s;
    const dx = 3 * u * u * (c1[0] - p0[0]) + 6 * u * s * (c2[0] - c1[0]) + 3 * s * s * (p3[0] - c2[0]);
    const dy = 3 * u * u * (c1[1] - p0[1]) + 6 * u * s * (c2[1] - c1[1]) + 3 * s * s * (p3[1] - c2[1]);
    return [dx, dy];
  }

  function paintTitans(g, px) {
    spill(g, 18, 10, "150,210,150", 0.13);

    g.save();
    trace(g, TT_POCKET);
    g.clip();

    // Backdrop
    g.fillStyle = "#1d3a33"; g.fillRect(-20, -12, 40, 24);
    circle(g, -3, -6, 19.8, "#3f6e5b");
    circle(g, -3, -6, 13.2, "#86b48f");
    circle(g, -3, -6, 6.6, "#cfe2b4");
    circle(g, -3, -6, 2.2, "#f1f0cf");

    // Light shafts
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = 1;
    g.fillStyle = "rgba(255,252,225,0.10)";
    for (const x0 of [-9, -3.5, 2]) {
      poly(g, [[x0 - 0.6, -12], [x0 + 0.6, -12], [x0 + 7.2, 6], [x0 + 2.8, 6]]);
      g.fill();
    }
    g.globalCompositeOperation = "source-over";

    // Far range
    g.beginPath();
    g.moveTo(-20, 12);
    for (let j = 0; j <= 80; j++) {
      const x = -20 + j * 0.5;
      g.lineTo(x, ttFar(x));
    }
    g.lineTo(20, 12);
    g.closePath();
    g.fillStyle = "#a9c9ab";
    g.fill();

    // The titan
    g.globalAlpha = 0.9;
    g.fillStyle = "#557f6a";
    g.beginPath();
    g.ellipse(7.0, -9.4, 0.75, 0.85, 0, 0, 2 * Math.PI);
    g.fill();
    poly(g, [[6.5, -8.7], [7.6, -8.6], [9.0, -7.9], [9.3, -6.6], [8.9, -3.4], [8.4, -1.8], [6.6, -1.8], [6.1, -3.5], [5.6, -6.6], [5.9, -7.9]]);
    g.fill();
    poly(g, [[5.8, -7.6], [5.2, -5.5], [4.8, -3.2], [4.3, -1.9], [4.9, -1.8], [5.5, -3.3], [6.2, -5.4], [6.5, -7.2]]);
    g.fill();
    poly(g, [[9.0, -7.6], [9.8, -5.4], [10.4, -3.6], [10.0, -3.4], [9.3, -5.2], [8.6, -7.0]]);
    g.fill();
    poly(g, [[6.7, -2.0], [6.2, -0.5], [5.6, 1.2], [6.4, 1.2], [7.1, -0.6], [7.6, -2.0]]);
    g.fill();
    poly(g, [[7.6, -2.0], [8.4, -0.6], [9.0, 1.2], [8.2, 1.2], [7.6, -0.4], [7.0, -1.8]]);
    g.fill();

    g.globalAlpha = 1;
    g.beginPath();
    g.ellipse(7.5, -5.2, 5, 0.7, 0, 0, 2 * Math.PI);
    g.fillStyle = "rgba(210,232,210,0.25)";
    g.fill();

    g.beginPath();
    g.ellipse(7.5, 1.0, 5.5, 1.8, 0, 0, 2 * Math.PI);
    g.fillStyle = "rgba(190,220,195,0.5)";
    g.fill();

    // Waterfall
    poly(g, [[-13.1, -10], [-12.1, -10], [-11.9, 0.5], [-13.5, 0.5]]);
    g.fillStyle = "rgba(226,246,240,0.85)";
    g.fill();
    g.beginPath();
    g.ellipse(-12.6, 0.8, 2.2, 0.8, 0, 0, 2 * Math.PI);
    g.fillStyle = "rgba(230,245,240,0.45)";
    g.fill();

    // Mid hills
    g.beginPath();
    g.moveTo(-20, 12);
    for (let j = 0; j <= 80; j++) {
      const x = -20 + j * 0.5;
      g.lineTo(x, ttMid(x));
    }
    g.lineTo(20, 12);
    g.closePath();
    g.fillStyle = "#5f9470";
    g.fill();

    {
      const r = rng(7202);
      for (let j = 0; j <= 27; j++) {
        const x = -18 + j * 1.3;
        const v = r();
        if (v < 0.55) {
          const yy = ttMid(x);
          circle(g, x, yy - 0.45, 0.55, "#355f43");
          circle(g, x + 0.4, yy - 0.3, 0.42, "#355f43");
          circle(g, x - 0.35, yy - 0.25, 0.4, "#355f43");
          circle(g, x - 0.15, yy - 0.65, 0.25, "rgba(170,210,150,0.35)");
        }
      }
    }

    // River
    {
      const L = [], R = [];
      for (let j = 0; j <= 24; j++) {
        const s = j / 24;
        const [bx, by] = ttRiver(s);
        const [dx, dy] = ttRiverD(s);
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;
        const w = 0.35 + 2.25 * Math.pow(s, 1.3);
        L[j] = [bx + nx * w / 2, by + ny * w / 2];
        R[j] = [bx - nx * w / 2, by - ny * w / 2];
      }
      const pts = L.concat(R.slice().reverse());
      poly(g, pts);
      g.fillStyle = "#d4ece4";
      g.fill();
    }

    // Near hills
    poly(g, [[-20, 3.0], [-15, 3.8], [-10, 5.2], [-6, 7.6], [-3.5, 12], [-20, 12]]);
    g.fillStyle = "#22472f";
    g.fill();
    poly(g, [[20, 1.8], [15, 2.4], [10.5, 4.2], [7.5, 7.0], [5.8, 12], [20, 12]]);
    g.fill();

    // Giant trees
    for (const [x, y, h] of [[-15.5, 3.8, 5.5], [-11.8, 4.6, 4.2], [13.8, 2.3, 6.0]]) {
      poly(g, [[x - 0.2, y], [x - 0.12, y - 0.6 * h], [x + 0.12, y - 0.6 * h], [x + 0.2, y]]);
      g.fillStyle = "#1c2b20";
      g.fill();

      circle(g, x, y - 0.72 * h, 0.24 * h, "#244a33");
      circle(g, x - 0.17 * h, y - 0.62 * h, 0.19 * h, "#244a33");
      circle(g, x + 0.18 * h, y - 0.64 * h, 0.2 * h, "#244a33");
      circle(g, x + 0.02, y - 0.9 * h, 0.17 * h, "#244a33");

      circle(g, x - 0.08 * h, y - 0.86 * h, 0.1 * h, "rgba(150,200,130,0.35)");
    }

    // Motes
    {
      const r = rng(7303);
      for (let i = 0; i < 14; i++) {
        const x = -14 + r() * 28;
        const y = -6 + r() * 9;
        const rr = 0.08 + r() * 0.07;
        circle(g, x, y, rr, "rgba(255,250,210,0.6)");
      }
    }

    g.restore();
    lip(g, TT_POCKET, 7404);
  }

  function liveTitans(g, px, t, a) {
    // Waterfall shimmer
    for (let i = 0; i <= 4; i++) {
      const ph = (t * 0.35 + i / 5) % 1;
      const y = -6.5 + ph * 6.8;
      const x = -12.6 + 0.2 * Math.sin(i * 2.1);
      g.globalAlpha = a * 0.35 * Math.sin(ph * Math.PI);
      g.fillStyle = "#ffffff";
      g.fillRect(x - 0.25, y, 0.5, 0.9);
    }

    // River glints
    for (let i = 0; i <= 6; i++) {
      const s = (t * 0.05 + i / 7) % 1;
      const [x, y] = ttRiver(s);
      g.globalAlpha = a * 0.6 * Math.sin(s * Math.PI);
      line(g, [[x - 0.25, y], [x + 0.25, y]], "#ffffff", px * 1.2);
    }

    // Drifting motes
    for (let i = 0; i <= 7; i++) {
      const x = -13 + ((i * 4.7 + t * 0.25 * (0.6 + 0.1 * i)) % 26);
      const y = -2.5 + 2.8 * Math.sin(t * 0.3 + i * 1.9);
      g.globalAlpha = a * 0.5 * (0.5 + 0.5 * Math.sin(t * 2 + i));
      circle(g, x, y, 0.1, "rgb(255,250,210)");
    }
  }

  RexArt.titans = { box: [-23, -15, 23, 15], paint: paintTitans, live: liveTitans };
})();
