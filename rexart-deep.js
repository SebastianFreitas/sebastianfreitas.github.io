/* ===========================================================
   REXART-DEEP — three illustrated places sunk inside Rex's rock:
   the Kingdom of Titans, the Lost City of Valkhar and the City
   of Law. Each is a cavern hollow cut into dark rock, showing a
   different world within.

   Coordinates are art units, origin at the hollow's centre, +x
   right, +y down. paint(g, px) draws the static art once into an
   offscreen sprite; live(g, px, t, a) draws motion on top of it,
   every frame, in the same unit transform.
   =========================================================== */

(function () {
  const RexArt = window.RexArt = window.RexArt || {};

  /* ---- shared helpers ---- */

  function rng(seed) {
    let s = seed | 0;
    return () => {
      s = s + 0x6D2B79F5 | 0;
      let x = Math.imul(s ^ s >>> 15, 1 | s);
      x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x;
      return ((x ^ x >>> 14) >>> 0) / 4294967296;
    };
  }

  function lin(g, x0, y0, x1, y1, stops) {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    for (const [o, c] of stops) gr.addColorStop(o, c);
    return gr;
  }
  function rad(g, x, y, r0, r1, stops) {
    const gr = g.createRadialGradient(x, y, r0, x, y, r1);
    for (const [o, c] of stops) gr.addColorStop(o, c);
    return gr;
  }

  function poly(g, pts) {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath();
  }
  function line(g, pts, color, w) {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.strokeStyle = color;
    g.lineWidth = w;
    g.stroke();
  }
  function circle(g, x, y, r, fill) {
    g.beginPath();
    g.arc(x, y, r, 0, 2 * Math.PI);
    g.fillStyle = fill;
    g.fill();
  }

  function courses(g, x0, y0, x1, y1, rowH, brickW, color, px) {
    g.save();
    g.beginPath();
    g.rect(x0, y0, x1 - x0, y1 - y0);
    g.clip();
    g.beginPath();
    for (let r = 0; ; r++) {
      const y = y0 + (r + 1) * rowH;
      if (!(y < y1)) break;
      g.moveTo(x0, y);
      g.lineTo(x1, y);
      for (let k = 0; ; k++) {
        const x = x0 + (r % 2) * brickW / 2 + k * brickW;
        if (!(x < x1)) break;
        g.moveTo(x, y - rowH);
        g.lineTo(x, y);
      }
    }
    g.strokeStyle = color;
    g.lineWidth = px;
    g.stroke();
    g.restore();
  }

  function merlons(g, x0, x1, yTop, mw, mh, gap, fill) {
    const n = Math.max(1, Math.floor((x1 - x0 + gap) / (mw + gap)));
    const span = n * mw + (n - 1) * gap;
    const start = x0 + (x1 - x0 - span) / 2;
    g.fillStyle = fill;
    for (let i = 0; i < n; i++) {
      g.fillRect(start + i * (mw + gap), yTop - mh, mw, mh);
    }
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
    g.fillStyle = rad(g, 0, 0, 0.45, 1, [[0, `rgba(${rgb},${a0})`], [1, `rgba(${rgb},0)`]]);
    g.fillRect(-1, -1, 2, 2);
    g.restore();
  }

  function lip(g, pts, px, glow, seed) {
    trace(g, pts);
    g.strokeStyle = "#1b232a";
    g.lineWidth = 0.9;
    g.stroke();

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
        g.globalAlpha = 0.5;
        line(g, [[x + 0.45, y - 0.1], [x + j, y + len]], glow, px);
        g.globalAlpha = 1;
      }
    }
  }

  function innerShade(g, pts) {
    trace(g, pts);
    g.strokeStyle = "rgba(0,0,0,0.35)";
    g.lineWidth = 2.4;
    g.stroke();
    trace(g, pts);
    g.strokeStyle = "rgba(0,0,0,0.25)";
    g.lineWidth = 1.2;
    g.stroke();
  }

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
    g.fillStyle = rad(g, -3, -6, 0, 22, [[0, "#f1f0cf"], [0.18, "#cfe2b4"], [0.45, "#86b48f"], [0.75, "#3f6e5b"], [1, "#1d3a33"]]);
    g.fillRect(-20, -12, 40, 24);

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
    g.fillStyle = lin(g, 0, -6, 0, 4, [[0, "#a9c9ab"], [1, "#7fa98d"]]);
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
    g.fillStyle = lin(g, 0, -10, 0, 0.5, [[0, "rgba(236,250,246,0.9)"], [1, "rgba(200,236,230,0.75)"]]);
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
    g.fillStyle = lin(g, 0, -2, 0, 6, [[0, "#5f9470"], [1, "#3d6e50"]]);
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
      g.fillStyle = lin(g, 0, 1, 0, 10, [[0, "#e8f6ee"], [1, "#a9d8d0"]]);
      g.fill();
      line(g, L, "rgba(40,80,60,0.5)", px * 1.2);
      line(g, R, "rgba(40,80,60,0.5)", px * 1.2);
    }

    // Near hills
    poly(g, [[-20, 3.0], [-15, 3.8], [-10, 5.2], [-6, 7.6], [-3.5, 12], [-20, 12]]);
    g.fillStyle = lin(g, 0, 2, 0, 12, [[0, "#2d5a3e"], [1, "#16301f"]]);
    g.fill();
    poly(g, [[20, 1.8], [15, 2.4], [10.5, 4.2], [7.5, 7.0], [5.8, 12], [20, 12]]);
    g.fill();

    line(g, [[-20, 3.0], [-15, 3.8], [-10, 5.2], [-6, 7.6], [-3.5, 12]], "rgba(190,230,170,0.45)", px);
    line(g, [[20, 1.8], [15, 2.4], [10.5, 4.2], [7.5, 7.0], [5.8, 12]], "rgba(190,230,170,0.45)", px);

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

    // Vignette
    g.fillStyle = rad(g, 0, 0, 10, 20, [[0, "rgba(8,14,12,0)"], [1, "rgba(8,14,12,0.55)"]]);
    g.fillRect(-20, -12, 40, 24);

    innerShade(g, TT_POCKET);
    g.restore();
    lip(g, TT_POCKET, px, "rgba(190,235,180,0.45)", 7404);
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

  /* ================================================================
     VALKHAR — a ruined god-built city of mixed architectures under
     amber light, with monsters' eyes in the rubble.
     ================================================================ */

  const VK_POCKET = pocket(8101, 19, 12, 0.55);
  const VK_RIM = "rgba(255,206,150,0.5)";

  function paintValkhar(g, px) {
    spill(g, 19, 12, "220,160,90", 0.12);

    g.save();
    trace(g, VK_POCKET);
    g.clip();

    // Backdrop
    g.fillStyle = rad(g, 0, -1, 0, 21, [[0, "#e8c689"], [0.2, "#b98752"], [0.5, "#6a3b2a"], [0.8, "#2e1714"], [1, "#170b0b"]]);
    g.fillRect(-20, -13, 40, 26);

    // Dust bands
    g.fillStyle = "rgba(230,190,140,0.08)";
    for (const y of [-7, -3, 1]) {
      g.beginPath();
      g.ellipse(0, y, 16, 0.9, 0, 0, 2 * Math.PI);
      g.fill();
    }

    // Broken halo
    g.save();
    g.translate(0, -5.5);
    g.rotate(-0.08);

    g.beginPath();
    g.ellipse(0, 0, 11, 2.6, 0, 0.45, 5.5);
    g.strokeStyle = "rgba(245,208,140,0.45)";
    g.lineWidth = 0.35;
    g.stroke();

    g.beginPath();
    g.ellipse(0, 0, 11.6, 2.9, 0, 0.6, 5.3);
    g.strokeStyle = "rgba(245,208,140,0.25)";
    g.lineWidth = px;
    g.stroke();

    g.beginPath();
    g.ellipse(0, 0.6, 11.9, 2.7, 0, 5.7, 5.85);
    g.strokeStyle = "rgba(245,208,140,0.4)";
    g.lineWidth = 0.3;
    g.stroke();

    g.beginPath();
    g.ellipse(0, 1.2, 11.9, 2.7, 0, 6.0, 6.1);
    g.strokeStyle = "rgba(245,208,140,0.4)";
    g.lineWidth = 0.3;
    g.stroke();

    g.restore();

    // Far city
    {
      const r = rng(9203);
      for (let i = 0; i <= 17; i++) {
        const x = -15 + i * 1.75 + r() * 0.6;
        const w = 0.9 + r() * 1.3;
        const h = 1.6 + r() * 4.2;
        const type = Math.floor(r() * 4);
        const top = 3.2 - h;
        g.fillStyle = "#8c6b50";
        g.fillRect(x - w / 2, top, w, h + 3);

        if (type === 1) {
          g.beginPath();
          g.ellipse(x, top, w / 2, w * 0.45, 0, Math.PI, 2 * Math.PI);
          g.fill();
        } else if (type === 2) {
          poly(g, [[x - w / 2, top], [x, top - w * 1.4], [x + w / 2, top]]);
          g.fill();
        } else if (type === 3) {
          poly(g, [[x - w / 2, top], [x - w / 4, top - 0.5], [x, top - 0.1], [x + w / 4, top - 0.7], [x + w / 2, top]]);
          g.fill();
        }
      }
    }

    // a. Onion palace
    g.fillStyle = "#3e4034";
    g.fillRect(-13.4, -3, 2.4, 7.5);
    g.strokeStyle = VK_RIM;
    g.lineWidth = px;
    g.strokeRect(-13.4, -3, 2.4, 7.5);

    g.beginPath();
    g.moveTo(-13.4, -3);
    g.bezierCurveTo(-14.4, -4.0, -13.3, -5.8, -12.2, -7.2);
    g.bezierCurveTo(-11.1, -5.8, -10.0, -4.0, -11.0, -3);
    g.closePath();
    g.fillStyle = "#5f6b4d";
    g.fill();
    g.strokeStyle = VK_RIM;
    g.lineWidth = px;
    g.stroke();

    g.beginPath();
    g.moveTo(-13.4, -3);
    g.bezierCurveTo(-14.4, -4.0, -13.3, -5.8, -12.2, -7.2);
    g.strokeStyle = "rgba(220,230,180,0.35)";
    g.lineWidth = px * 1.5;
    g.stroke();

    line(g, [[-12.2, -7.2], [-12.2, -8.0]], VK_RIM, px * 1.2);

    g.fillStyle = "rgba(255,190,110,0.45)";
    g.fillRect(-12.81, -1.8, 0.22, 1.4);
    g.fillRect(-11.81, -1.8, 0.22, 1.4);

    g.fillStyle = "#3e4034";
    g.fillRect(-10.25, -6.0, 0.7, 10.5);
    poly(g, [[-10.25, -6.0], [-10.0, -6.9], [-9.8, -6.3], [-9.6, -6.6], [-9.55, -6.0]]);
    g.fill();
    g.strokeStyle = VK_RIM;
    g.lineWidth = px;
    g.strokeRect(-10.25, -6.0, 0.7, 10.5);
    poly(g, [[-10.25, -6.0], [-10.0, -6.9], [-9.8, -6.3], [-9.6, -6.6], [-9.55, -6.0]]);
    g.stroke();

    // b. Ziggurat
    for (const [w, yTop, yBottom] of [[6.0, 2.6, 4.5], [4.6, 0.9, 2.6], [3.2, -0.6, 0.9], [2.0, -1.9, -0.6]]) {
      g.fillStyle = "#553a2d";
      g.fillRect(-5.6 - w / 2, yTop, w, yBottom - yTop);
      line(g, [[-5.6 - w / 2, yTop], [-5.6 + w / 2, yTop]], VK_RIM, px);
    }

    g.fillStyle = "#553a2d";
    g.fillRect(-6.15, -3.0, 1.1, 1.1);
    g.fillRect(-6.35, -3.25, 1.5, 0.25);
    g.strokeStyle = VK_RIM;
    g.lineWidth = px;
    g.strokeRect(-6.15, -3.0, 1.1, 1.1);
    g.strokeRect(-6.35, -3.25, 1.5, 0.25);

    g.fillStyle = "#6e4c3a";
    g.fillRect(-5.95, -0.6, 0.7, 5.1);
    for (let j = 1; j <= 17; j++) {
      const y = -0.6 + j * 0.3;
      line(g, [[-5.95, y], [-5.25, y]], "rgba(40,24,18,0.5)", px);
    }

    g.fillStyle = "rgba(255,170,90,0.5)";
    g.fillRect(-5.85, -2.7, 0.5, 0.8);

    // c. Needle spire
    poly(g, [[-1.75, 4.5], [-1.2, -10.2], [-0.65, 4.5]]);
    g.fillStyle = "#77788a";
    g.fill();
    g.strokeStyle = VK_RIM;
    g.lineWidth = px;
    g.stroke();

    g.beginPath();
    g.arc(-1.2, -8.3, 0.8, 3.6, 5.8);
    g.strokeStyle = "rgba(200,210,235,0.7)";
    g.lineWidth = 0.16;
    g.stroke();

    // d. Round temple
    g.fillStyle = "rgba(255,200,130,0.12)";
    g.fillRect(1.5, 0.4, 3.6, 3.5);

    g.fillStyle = "#8a7c68";
    g.fillRect(1.3, 3.9, 4.6, 0.6);

    for (let i = 0; i <= 5; i++) {
      if (i === 4) continue;
      const cx = 1.62 + i * 0.82;
      g.fillStyle = "#8a7c68";
      if (i === 5) {
        poly(g, [[cx - 0.15, 3.9], [cx - 0.15, 2.1], [cx - 0.05, 1.9], [cx + 0.03, 2.15], [cx + 0.15, 1.95], [cx + 0.15, 3.9]]);
        g.fill();
      } else {
        g.fillRect(cx - 0.15, 0.4, 0.3, 3.5);
      }
    }

    g.fillStyle = "#8a7c68";
    g.fillRect(1.3, 0, 3.8, 0.4);

    g.beginPath();
    g.moveTo(1.5, 0);
    g.ellipse(3.6, 0, 2.1, 1.7, 0, Math.PI, 1.78 * Math.PI);
    g.lineTo(4.9, -0.7);
    g.lineTo(5.25, -0.45);
    g.lineTo(5.4, -0.62);
    g.lineTo(5.45, 0);
    g.closePath();
    g.fillStyle = "#8a7c68";
    g.fill();

    g.fillStyle = "#8a7c68";
    g.fillRect(3.35, -2.3, 0.5, 0.6);

    g.save();
    g.translate(6.5, 4.15);
    g.rotate(0.35);
    g.fillStyle = "#8a7c68";
    g.fillRect(-0.7, -0.175, 1.4, 0.35);
    g.restore();

    g.strokeStyle = VK_RIM;
    g.lineWidth = px;
    g.beginPath();
    g.moveTo(1.5, 0);
    g.ellipse(3.6, 0, 2.1, 1.7, 0, Math.PI, 1.78 * Math.PI);
    g.lineTo(4.9, -0.7);
    g.lineTo(5.25, -0.45);
    g.lineTo(5.4, -0.62);
    g.lineTo(5.45, 0);
    g.closePath();
    g.stroke();
    g.strokeRect(1.3, 0, 3.8, 0.4);
    g.strokeRect(3.35, -2.3, 0.5, 0.6);

    // e. Pagoda
    for (let k = 0; k <= 2; k++) {
      const bw = 2.6 - 0.5 * k;
      const yb = 4.5 - 1.7 * k;
      const yTop = yb - 1.2;
      const xl = 8.8 - bw / 2;
      const xr = 8.8 + bw / 2;

      if (k === 2) {
        g.save();
        g.translate(xl, yb);
        g.rotate(0.14);
        g.translate(-xl, -yb);
      }

      g.fillStyle = "#4f2a2a";
      g.fillRect(xl, yTop, bw, 1.2);

      g.beginPath();
      g.moveTo(xl - 0.9, yTop - 0.3);
      g.quadraticCurveTo(xl - 0.1, yTop + 0.15, xl + 0.3, yTop - 0.55);
      g.lineTo(xr - 0.3, yTop - 0.55);
      g.quadraticCurveTo(xr + 0.1, yTop + 0.15, xr + 0.9, yTop - 0.3);
      g.lineTo(xr + 0.5, yTop);
      g.lineTo(xl - 0.5, yTop);
      g.closePath();
      g.fillStyle = "#6a3030";
      g.fill();
      g.strokeStyle = VK_RIM;
      g.lineWidth = px;
      g.stroke();

      if (k === 2) {
        line(g, [[8.8, yTop - 0.55], [8.8, yTop - 2.05]], VK_RIM, px * 1.2);
        for (const y of [yTop - 0.9, yTop - 1.25, yTop - 1.6]) {
          line(g, [[8.55, y], [9.05, y]], VK_RIM, px);
        }
        g.restore();
      }
    }

    // f. Broken arch
    g.fillStyle = "#4d4843";
    g.fillRect(12.0, -2.6, 0.6, 7.1);

    poly(g, [[13.8, 4.5], [13.8, -0.8], [13.95, -1.05], [14.1, -0.75], [14.25, -0.95], [14.4, -0.7], [14.4, 4.5]]);
    g.fillStyle = "#4d4843";
    g.fill();

    g.beginPath();
    g.arc(13.2, -2.6, 0.9, Math.PI, 1.55 * Math.PI);
    g.strokeStyle = "#4d4843";
    g.lineWidth = 0.6;
    g.stroke();

    g.beginPath();
    g.arc(13.2, -2.6, 1.2, Math.PI, 1.55 * Math.PI);
    g.strokeStyle = VK_RIM;
    g.lineWidth = px;
    g.stroke();

    g.strokeStyle = VK_RIM;
    g.lineWidth = px;
    g.strokeRect(12.0, -2.6, 0.6, 7.1);
    poly(g, [[13.8, 4.5], [13.8, -0.8], [13.95, -1.05], [14.1, -0.75], [14.25, -0.95], [14.4, -0.7], [14.4, 4.5]]);
    g.stroke();

    // Rubble
    {
      const r = rng(9305);
      g.beginPath();
      g.moveTo(-20, 12);
      for (let i = 0; i <= 50; i++) {
        const x = -20 + i * 0.8;
        const y = 4.35 - 0.45 * r() - (i % 4 === 0 ? 0.35 : 0);
        g.lineTo(x, y);
      }
      g.lineTo(20, 12);
      g.closePath();
      g.fillStyle = lin(g, 0, 4, 0, 8, [[0, "#2a1814"], [1, "#120807"]]);
      g.fill();
    }

    {
      const r2 = rng(9311);
      for (let n = 0; n < 9; n++) {
        const cx = -16 + r2() * 32;
        const cy = 4.6 + r2() * 0.8;
        const bw = 0.35 + r2() * 0.8;
        const bh = 0.25 + r2() * 0.35;
        const rot = (r2() - 0.5) * 1.2;
        g.save();
        g.translate(cx, cy);
        g.rotate(rot);
        g.fillStyle = "#3a241c";
        g.fillRect(-bw / 2, -bh / 2, bw, bh);
        line(g, [[-bw / 2, -bh / 2], [bw / 2, -bh / 2]], "rgba(255,200,140,0.25)", px);
        g.restore();
      }
    }

    // Vignette
    g.fillStyle = rad(g, 0, 0, 11, 21, [[0, "rgba(10,5,5,0)"], [1, "rgba(10,5,5,0.6)"]]);
    g.fillRect(-20, -13, 40, 26);

    innerShade(g, VK_POCKET);
    g.restore();
    lip(g, VK_POCKET, px, "rgba(240,190,120,0.45)", 8404);
  }

  function liveValkhar(g, px, t, a) {
    // Monsters' eyes
    const eyePairs = [[-13.8, 3.3], [-7.9, 4.8], [6.9, 4.9], [12.6, 3.5]];
    for (let i = 0; i < eyePairs.length; i++) {
      const [x, y] = eyePairs[i];
      const vis = 0.5 + 0.5 * Math.sin(t * 0.37 + i * 1.9);
      if (((t * 0.8 + i * 0.37) % 1) < 0.06) continue;
      const al = a * 0.85 * Math.pow(vis, 1.5);

      g.globalCompositeOperation = "lighter";
      g.globalAlpha = al;
      g.fillStyle = rad(g, x, y, 0, 0.7, [[0, "rgba(255,60,40,0.25)"], [1, "rgba(255,60,40,0)"]]);
      g.fillRect(x - 0.7, y - 0.7, 1.4, 1.4);
      g.globalCompositeOperation = "source-over";

      g.globalAlpha = al;
      circle(g, x - 0.17, y, 0.09, "#ff3b2e");
      circle(g, x + 0.17, y, 0.09, "#ff3b2e");
    }

    // Dust
    for (let i = 0; i <= 9; i++) {
      const x = -15 + ((t * 0.3 + i * 3.1) % 30);
      const y = -6 + ((i * 1.37) % 9) + 0.4 * Math.sin(t * 0.5 + i);
      g.globalAlpha = a * 0.35 * (0.5 + 0.5 * Math.sin(t + i));
      circle(g, x, y, 0.07, "#f2d7a6");
    }

    // Needle spark
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = a * (0.6 + 0.4 * Math.sin(t * 1.7));
    g.fillStyle = rad(g, -1.2, -10.2, 0, 1.2, [[0, "rgba(220,230,255,0.35)"], [1, "rgba(220,230,255,0)"]]);
    g.fillRect(-1.2 - 1.2, -10.2 - 1.2, 2.4, 2.4);
    g.globalCompositeOperation = "source-over";
  }

  /* ================================================================
     LAW — cold-brick walls with red corners and flaming braziers
     around an obsidian archive tower, lit from below by hellfire.
     ================================================================ */

  const LW_POCKET = pocket(4101, 11, 16, 0.9);
  const LW_FIRES = [[-8.4, -1.95], [-3.4, -0.95], [3.4, -0.95], [8.4, -1.95], [-5.9, 1.25], [5.9, 1.25]];
  const LW_TOWERS = [[-8.4, -1.2], [-3.4, -0.2], [3.4, -0.2], [8.4, -1.2]];
  const LW_SPIKES = [1.4, 2.2, 3.6, 2.2, 1.4];

  function quoins(g, xEdge, dir, yTop, px) {
    for (let j = 0; yTop + j * 0.5 < 14.5; j++) {
      const y = yTop + j * 0.5;
      const wq = j % 2 === 0 ? 0.55 : 0.35;
      const x0 = dir > 0 ? xEdge : xEdge - wq;
      g.fillStyle = "#9a2b24";
      g.fillRect(x0, y + 0.03, wq, 0.44);
      line(g, [[x0, y + 0.03], [x0 + wq, y + 0.03]], "rgba(255,140,110,0.35)", px);
    }
  }

  function paintLaw(g, px) {
    spill(g, 11, 16, "255,110,50", 0.12);

    g.save();
    trace(g, LW_POCKET);
    g.clip();

    // Hellfire backdrop
    g.fillStyle = lin(g, 0, -16, 0, 16, [[0, "#1a0a0c"], [0.45, "#3a0f0e"], [0.78, "#8a2412"], [1, "#e0561c"]]);
    g.fillRect(-12, -17, 24, 34);
    g.fillStyle = rad(g, 0, 12, 0, 12, [[0, "rgba(255,140,60,0.35)"], [1, "rgba(255,140,60,0)"]]);
    g.fillRect(-12, 0, 24, 17);

    // Heat haze
    g.fillStyle = "rgba(255,120,60,0.06)";
    g.beginPath();
    g.ellipse(0, 6, 10, 1, 0, 0, 2 * Math.PI);
    g.fill();
    g.beginPath();
    g.ellipse(0, 9, 10, 1, 0, 0, 2 * Math.PI);
    g.fill();

    // The dark tower
    poly(g, [[-2.2, 6], [-1.6, -9.6], [1.6, -9.6], [2.2, 6]]);
    g.fillStyle = lin(g, -2.2, 0, 2.2, 0, [[0, "#07080b"], [0.36, "#14171d"], [1, "#050608"]]);
    g.fill();

    poly(g, [[-1.6, -9.6], [-2.3, -10.4], [2.3, -10.4], [1.6, -9.6]]);
    g.fillStyle = "#07080b";
    g.fill();

    const spikeX = [];
    for (let i = 0; i <= 4; i++) {
      const x = -1.9 + i * 0.95;
      const h = LW_SPIKES[i];
      spikeX.push([x, h]);
      poly(g, [[x - 0.25, -10.4], [x, -10.4 - h], [x + 0.25, -10.4]]);
      g.fillStyle = "#07080b";
      g.fill();
    }

    line(g, [[-2.2, 6], [-1.6, -9.6], [-2.3, -10.4]], "rgba(170,190,215,0.35)", px);
    for (const [x, h] of spikeX) {
      line(g, [[x - 0.25, -10.4], [x, -10.4 - h]], "rgba(170,190,215,0.35)", px);
    }

    line(g, [[2.2, 6], [1.6, -9.6], [2.3, -10.4]], "rgba(255,110,60,0.45)", px);
    for (const [x, h] of spikeX) {
      line(g, [[x + 0.25, -10.4], [x, -10.4 - h]], "rgba(255,110,60,0.45)", px);
    }

    for (const y of [-6, -2, 2]) {
      const hw = 1.6 + 0.6 * (y + 9.6) / 15.6;
      line(g, [[-hw, y], [hw, y]], "rgba(200,210,230,0.18)", px);
    }

    {
      const r = rng(4401);
      for (let j = 0; j <= 12; j++) {
        const y = -8.8 + j * 0.9;
        for (const x of [-0.9, -0.3, 0.3, 0.9]) {
          if (r() < 0.55) {
            g.fillStyle = "rgba(220,230,245,0.55)";
            g.fillRect(x - 0.07, y, 0.14, 0.42);
          }
        }
      }
    }

    // Walls
    g.fillStyle = lin(g, 0, 2, 0, 12, [[0, "#56636d"], [1, "#39434b"]]);
    g.fillRect(-9.2, 2.0, 18.4, 15.0);
    courses(g, -9.2, 2.0, 9.2, 17, 0.5, 1.1, "rgba(20,26,32,0.5)", px);
    merlons(g, -9.2, 9.2, 2.0, 0.55, 0.6, 0.45, "#56636d");
    g.fillStyle = lin(g, 0, 12, 0, 6, [[0, "rgba(255,110,50,0.35)"], [1, "rgba(255,110,50,0)"]]);
    g.fillRect(-9.2, 6, 18.4, 11.0);
    quoins(g, -9.2, 1, 2.0, px);
    quoins(g, 9.2, -1, 2.0, px);

    for (const [cx, top] of LW_TOWERS) {
      g.fillStyle = lin(g, 0, top, 0, 12, [[0, "#5f6d78"], [1, "#3d4850"]]);
      g.fillRect(cx - 1.1, top, 2.2, 17 - top);
      courses(g, cx - 1.1, top, cx + 1.1, 17, 0.5, 1.1, "rgba(20,26,32,0.5)", px);
      g.fillStyle = lin(g, 0, 12, 0, 6, [[0, "rgba(255,110,50,0.35)"], [1, "rgba(255,110,50,0)"]]);
      g.fillRect(cx - 1.1, 6, 2.2, 11.0);
      merlons(g, cx - 1.1, cx + 1.1, top, 0.5, 0.6, 0.4, "#5f6d78");
      quoins(g, cx - 1.1, 1, top, px);
      quoins(g, cx + 1.1, -1, top, px);
      g.fillStyle = "rgba(255,150,80,0.6)";
      g.fillRect(cx - 0.1, top + 1.2, 0.2, 0.9);
    }

    for (const [bx, by] of LW_FIRES) {
      poly(g, [[bx - 0.55, by], [bx + 0.55, by], [bx + 0.3, by + 0.55], [bx - 0.3, by + 0.55]]);
      g.fillStyle = "#1b1d20";
      g.fill();
      g.fillRect(bx - 0.06, by + 0.55, 0.12, 0.2);
    }

    g.beginPath();
    g.moveTo(-1.1, 17);
    g.lineTo(-1.1, 7.5);
    g.arc(0, 7.5, 1.1, Math.PI, 2 * Math.PI);
    g.lineTo(1.1, 17);
    g.closePath();
    g.fillStyle = "#16090a";
    g.fill();
    g.fillStyle = lin(g, 0, 14, 0, 6.5, [[0, "rgba(255,90,40,0.6)"], [1, "rgba(255,90,40,0)"]]);
    g.fill();

    g.save();
    g.beginPath();
    g.moveTo(-1.1, 17);
    g.lineTo(-1.1, 7.5);
    g.arc(0, 7.5, 1.1, Math.PI, 2 * Math.PI);
    g.lineTo(1.1, 17);
    g.closePath();
    g.clip();
    for (const x of [-0.55, 0, 0.55]) {
      line(g, [[x, 6.4], [x, 17]], "rgba(10,5,5,0.9)", 0.12);
    }
    for (const y of [8.5, 9.5, 10.5, 11.5]) {
      line(g, [[-1.1, y], [1.1, y]], "rgba(10,5,5,0.9)", 0.12);
    }
    g.restore();

    g.beginPath();
    g.arc(0, 7.5, 1.35, Math.PI, 2 * Math.PI);
    g.strokeStyle = "#9a2b24";
    g.lineWidth = 0.5;
    g.stroke();

    for (let k = 1; k <= 5; k++) {
      const an = Math.PI + k * Math.PI / 6;
      line(g, [[1.1 * Math.cos(an), 7.5 + 1.1 * Math.sin(an)], [1.6 * Math.cos(an), 7.5 + 1.6 * Math.sin(an)]], "#3a0f0c", px);
    }

    // Vignette
    g.fillStyle = rad(g, 0, 0, 9, 17, [[0, "rgba(10,4,4,0)"], [1, "rgba(10,4,4,0.55)"]]);
    g.fillRect(-12, -17, 24, 34);

    innerShade(g, LW_POCKET);
    g.restore();
    lip(g, LW_POCKET, px, "rgba(255,130,70,0.45)", 4404);
  }

  function liveLaw(g, px, t, a) {
    // Flames
    for (let i = 0; i < LW_FIRES.length; i++) {
      const [bx, by] = LW_FIRES[i];
      const f = 0.8 + 0.2 * Math.sin(t * 9 + i * 1.7) + 0.1 * Math.sin(t * 23 + i);

      g.globalCompositeOperation = "lighter";
      g.globalAlpha = a * f;
      g.fillStyle = rad(g, bx, by - 0.7, 0, 2.0, [[0, "rgba(255,140,60,0.35)"], [1, "rgba(255,140,60,0)"]]);
      g.fillRect(bx - 2, by - 2.7, 4, 4);
      g.globalCompositeOperation = "source-over";

      const hF = 1.3 * (0.85 + 0.15 * Math.sin(t * 11 + i * 2.3) + 0.08 * Math.sin(t * 27 + i));
      const s = 0.18 * Math.sin(t * 6 + i);

      g.globalAlpha = a;
      g.beginPath();
      g.moveTo(bx - 0.42, by);
      g.quadraticCurveTo(bx - 0.5, by - hF * 0.45, bx + s, by - hF);
      g.quadraticCurveTo(bx + 0.5, by - hF * 0.45, bx + 0.42, by);
      g.closePath();
      g.fillStyle = lin(g, 0, by, 0, by - hF, [[0, "rgba(255,236,160,0.95)"], [0.5, "rgba(255,140,40,0.85)"], [1, "rgba(200,40,20,0)"]]);
      g.fill();

      g.globalAlpha = a;
      g.beginPath();
      g.moveTo(bx - 0.21, by);
      g.quadraticCurveTo(bx - 0.25, by - hF * 0.6 * 0.45, bx + s * 0.6, by - hF * 0.6);
      g.quadraticCurveTo(bx + 0.25, by - hF * 0.6 * 0.45, bx + 0.21, by);
      g.closePath();
      g.fillStyle = "rgba(255,250,220,0.9)";
      g.fill();
    }

    // Pages rising off the archive
    for (let i = 0; i <= 8; i++) {
      const ph = (t * 0.07 + i / 9) % 1;
      const x = -2.8 + ((i * 0.71) % 5.6) + 0.6 * Math.sin(t * 0.6 + i * 2);
      const y = -9.8 - ph * 4.2;
      g.globalAlpha = a * 0.55 * Math.sin(ph * Math.PI);
      g.save();
      g.translate(x, y);
      g.rotate(t * (0.6 + 0.1 * i) + i);
      g.fillStyle = "#e9ecf2";
      g.fillRect(-0.16, -0.11, 0.32, 0.22);
      g.restore();
    }

    // Hellfire pulse
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = a * (0.7 + 0.3 * Math.sin(t * 0.9));
    g.fillStyle = rad(g, 0, 13, 0, 10, [[0, "rgba(255,120,50,0.15)"], [1, "rgba(255,120,50,0)"]]);
    g.fillRect(-10, 3, 20, 13);
    g.globalCompositeOperation = "source-over";
  }

  RexArt.titans  = { box: [-23, -15, 23, 15], paint: paintTitans,  live: liveTitans };
  RexArt.valkhar = { box: [-24, -17, 24, 17], paint: paintValkhar, live: liveValkhar };
  RexArt.law     = { box: [-16, -21, 16, 21], paint: paintLaw,     live: liveLaw };
})();
