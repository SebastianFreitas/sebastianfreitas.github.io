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

  const rng = Util.mulberry;
  const { lin, rad, poly, line, circle, merlons, litShade } = Paint;

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

  /* ================================================================
     VALKHAR — a ruined god-built city of golden stepped temples under
     amber light.
     ================================================================ */

  const VK_POCKET = pocket(8101, 19, 12, 0.55);
  const VK = { lit: "#e7b54a", shade: "#a8742a", stair: "#f0cf7a", hole: "#3a220e", far: "#6b4a30", rubble: "#3b2616", rubbleShade: "#24170d" };
  // [cx, tiers, base width, tier height, shrine width, shrine height, fill, fillShade, roof comb]
  const VK_TEMPLES = [
    [-15.5, 3, 3.0, 0.9, 0.9, 0.8, "#b3852f", "#7d5d21", false],
    [-10.5, 5, 6.0, 1.1, 1.5, 1.1, "#c99638", "#8d6927", true],
    [14.2, 3, 3.4, 0.9, 1.0, 0.8, "#b3852f", "#7d5d21", false],
    [8.5, 6, 6.6, 1.15, 1.6, 1.2, "#c99638", "#8d6927", true],
    [-1.5, 7, 9.0, 1.35, 2.0, 1.4, "#e0ae4a", "#9d7a34", true]
  ];

  function mayaTemple(g, px, cx, tiers, w0, th, sw, sh, fill, shade, comb) {
    const step = (w0 - sw * 1.3) / tiers;
    for (let i = 0; i < tiers; i++) {
      const w = w0 - i * step;
      const yb = 4.5 - i * th;
      const yt = yb - th;
      const pts = [[cx - w / 2, yb], [cx - w / 2 + 0.1, yt], [cx + w / 2 - 0.1, yt], [cx + w / 2, yb]];
      litShade(g, () => poly(g, pts), cx + 0.3 * (w / 2), fill, shade);
    }

    const yTop = 4.5 - tiers * th;
    const sw2 = sw * 0.55;
    litShade(g, () => { g.beginPath(); g.rect(cx - sw2 / 2, yTop, sw2, 4.5 - yTop); }, cx + 0.3 * (sw2 / 2), VK.stair, VK.shade);

    litShade(g, () => { g.beginPath(); g.rect(cx - sw / 2, yTop - sh, sw, sh); }, cx + 0.3 * (sw / 2), fill, shade);
    g.fillStyle = VK.hole;
    g.fillRect(cx - sw * 0.15, yTop - sh * 0.55, sw * 0.3, sh * 0.55);

    if (comb) {
      const cw = sw * 0.7;
      const ch = sh * 0.8;
      litShade(g, () => { g.beginPath(); g.rect(cx - cw / 2, yTop - sh - ch, cw, ch); }, cx + 0.3 * (cw / 2), fill, shade);
      g.fillStyle = VK.hole;
      for (const ox of [-cw * 0.2, cw * 0.2]) {
        g.fillRect(cx + ox - cw * 0.08, yTop - sh - ch * 0.7, cw * 0.16, ch * 0.35);
      }
    } else {
      const pts = [[cx - sw / 2, yTop - sh], [cx - sw * 0.2, yTop - sh - 0.3], [cx + sw * 0.05, yTop - sh - 0.1], [cx + sw / 2, yTop - sh]];
      litShade(g, () => poly(g, pts), cx + 0.3 * (sw / 2), fill, shade);
    }
  }

  function paintValkhar(g, px) {
    spill(g, 19, 12, "220,160,90", 0.12);

    g.save();
    trace(g, VK_POCKET);
    g.clip();

    // Backdrop
    g.fillStyle = "#170b0b"; g.fillRect(-20, -13, 40, 26);
    circle(g, 0, -1, 18.9, "#2e1714");
    circle(g, 0, -1, 13.7, "#6a3b2a");
    circle(g, 0, -1, 7.35, "#b98752");
    circle(g, 0, -1, 2.5, "#e8c689");

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
        const w = 1.6 + r() * 1.6;
        const h = 1.6 + r() * 3.2;
        g.fillStyle = VK.far;
        for (let k = 0; k <= 2; k++) {
          const sw = w * (1 - 0.28 * k);
          const sh = h / 3.4;
          if (k === 0) {
            g.fillRect(x - w / 2, 3.2 - sh, w, sh + 3);
          } else {
            g.fillRect(x - sw / 2, 3.2 - (k + 1) * sh, sw, sh);
          }
        }
        const sh = h / 3.4;
        g.fillRect(x - w * 0.12, 3.2 - 3 * sh - sh * 0.4, w * 0.24, sh * 0.4);
      }
    }

    // Temples
    for (const [cx, tiers, w0, th, sw, sh, fill, shade, comb] of VK_TEMPLES) mayaTemple(g, px, cx, tiers, w0, th, sw, sh, fill, shade, comb);

    // Rubble
    {
      const r = rng(9305);
      const pts = [[-20, 12]];
      for (let i = 0; i <= 50; i++) {
        const x = -20 + i * 0.8;
        const y = 4.35 - 0.45 * r() - (i % 4 === 0 ? 0.35 : 0);
        pts.push([x, y]);
      }
      pts.push([20, 12]);
      litShade(g, () => poly(g, pts), 6, VK.rubble, VK.rubbleShade);
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
        g.fillStyle = VK.rubble;
        g.fillRect(-bw / 2, -bh / 2, bw / 2, bh);
        g.fillStyle = VK.rubbleShade;
        g.fillRect(0, -bh / 2, bw / 2, bh);
        g.restore();
      }
    }

    g.restore();
    lip(g, VK_POCKET, 8404);
  }

  function liveValkhar(g, px, t, a) {
    // Dust
    for (let i = 0; i <= 9; i++) {
      const x = -15 + ((t * 0.3 + i * 3.1) % 30);
      const y = -6 + ((i * 1.37) % 9) + 0.4 * Math.sin(t * 0.5 + i);
      g.globalAlpha = a * 0.35 * (0.5 + 0.5 * Math.sin(t + i));
      circle(g, x, y, 0.07, "#f2d7a6");
    }

    // Glint on the great temple
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = a * (0.6 + 0.4 * Math.sin(t * 1.7));
    g.fillStyle = rad(g, -1.5, -7.5, 0, 1.4, [[0, "rgba(255,215,130,0.35)"], [1, "rgba(255,215,130,0)"]]);
    g.fillRect(-1.5 - 1.4, -7.5 - 1.4, 2.8, 2.8);
    g.globalCompositeOperation = "source-over";
  }

  /* ================================================================
     LAW — black walls with red corners and flaming braziers
     around an obsidian archive tower, lit from below by hellfire.
     ================================================================ */

  const LW_POCKET = pocket(4101, 11, 16, 0.9);
  const LW = { lit: "#3a3438", shade: "#1f1b1e", wall: "#332d31", wallShade: "#1c181a", hole: "#0b0809", quoin: "#9e2a22", quoinShade: "#6a1712", glow: "#ff8a3c", grille: "#5a4f52" };
  const LW_FIRES = [[-8.4, -1.95], [-3.4, -0.95], [3.4, -0.95], [8.4, -1.95], [-5.9, 1.25], [5.9, 1.25]];
  const LW_TOWERS = [[-8.4, -1.2], [-3.4, -0.2], [3.4, -0.2], [8.4, -1.2]];
  const LW_SPIKES = [1.4, 2.2, 3.6, 2.2, 1.4];

  function quoins(g, xEdge, dir, yTop, xSplit) {
    for (let j = 0; yTop + j * 0.5 < 14.5; j++) {
      const y = yTop + j * 0.5;
      const wq = j % 2 === 0 ? 0.55 : 0.35;
      const x0 = dir > 0 ? xEdge : xEdge - wq;
      g.fillStyle = x0 + wq / 2 >= xSplit ? LW.quoinShade : LW.quoin;
      g.fillRect(x0, y + 0.03, wq, 0.44);
    }
  }

  function paintLaw(g, px) {
    spill(g, 11, 16, "255,110,50", 0.12);

    g.save();
    trace(g, LW_POCKET);
    g.clip();

    // Hellfire backdrop
    g.fillStyle = "#1a0a0c"; g.fillRect(-12, -17, 24, 11);
    g.fillStyle = "#3a0f0e"; g.fillRect(-12, -6, 24, 9);
    g.fillStyle = "#8a2412"; g.fillRect(-12, 3, 24, 7);
    g.fillStyle = "#e0561c"; g.fillRect(-12, 10, 24, 7);
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
    litShade(g, () => poly(g, [[-2.2, 6], [-1.6, -9.6], [1.6, -9.6], [2.2, 6]]), 0.66, LW.lit, LW.shade);

    litShade(g, () => poly(g, [[-1.6, -9.6], [-2.3, -10.4], [2.3, -10.4], [1.6, -9.6]]), 0.69, LW.lit, LW.shade);

    for (let i = 0; i <= 4; i++) {
      const x = -1.9 + i * 0.95;
      const h = LW_SPIKES[i];
      litShade(g, () => poly(g, [[x - 0.25, -10.4], [x, -10.4 - h], [x + 0.25, -10.4]]), x, LW.lit, LW.shade);
    }

    {
      const r = rng(4401);
      for (let j = 0; j <= 12; j++) {
        const y = -8.8 + j * 0.9;
        for (const x of [-0.9, -0.3, 0.3, 0.9]) {
          g.fillStyle = r() < 0.55 ? LW.glow : LW.hole;
          g.fillRect(x - 0.07, y, 0.14, 0.42);
        }
      }
    }

    // Walls
    const wallSplit = 0 + 0.3 * 9.2;
    litShade(g, () => { g.beginPath(); g.rect(-9.2, 2.0, 18.4, 15.0); }, wallSplit, LW.wall, LW.wallShade);
    merlons(g, -9.2, 9.2, 2.0, 0.55, 0.6, 0.45, LW.wall, LW.wallShade, wallSplit, true);
    quoins(g, -9.2, 1, 2.0, wallSplit);
    quoins(g, 9.2, -1, 2.0, wallSplit);

    for (const [cx, top] of LW_TOWERS) {
      const towerSplit = cx + 0.3 * 1.1;
      litShade(g, () => { g.beginPath(); g.rect(cx - 1.1, top, 2.2, 17 - top); }, towerSplit, LW.wall, LW.wallShade);
      merlons(g, cx - 1.1, cx + 1.1, top, 0.5, 0.6, 0.4, LW.wall, LW.wallShade, towerSplit, true);
      quoins(g, cx - 1.1, 1, top, towerSplit);
      quoins(g, cx + 1.1, -1, top, towerSplit);
      g.fillStyle = LW.glow;
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
    g.fillStyle = LW.hole;
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
      line(g, [[x, 6.4], [x, 17]], LW.grille, 0.12);
    }
    for (const y of [8.5, 9.5, 10.5, 11.5]) {
      line(g, [[-1.1, y], [1.1, y]], LW.grille, 0.12);
    }
    g.restore();

    g.beginPath();
    g.arc(0, 7.5, 1.35, Math.PI, 2 * Math.PI);
    g.strokeStyle = LW.quoin;
    g.lineWidth = 0.5;
    g.stroke();

    for (let k = 1; k <= 5; k++) {
      const an = Math.PI + k * Math.PI / 6;
      line(g, [[1.1 * Math.cos(an), 7.5 + 1.1 * Math.sin(an)], [1.6 * Math.cos(an), 7.5 + 1.6 * Math.sin(an)]], LW.quoinShade, px);
    }

    g.restore();
    lip(g, LW_POCKET, 4404);
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
