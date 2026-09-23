/* ===========================================================
   VALKHAR — a ruined god-built city of golden stepped temples under
   amber light.

   Coordinates are art units, origin at the hollow's centre, +x
   right, +y down. paint(g, px) draws the static art once into an
   offscreen sprite; live(g, px, t, a) draws motion on top of it,
   every frame, in the same unit transform.
   =========================================================== */

(function () {
  const RexArt = window.RexArt = window.RexArt || {};

  const { rad, poly, circle, litShade } = Paint;
  const { pocket, trace, spill, lip } = RexKit;
  const rng = Util.mulberry;

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

  RexArt.valkhar = { box: [-24, -17, 24, 17], paint: paintValkhar, live: liveValkhar };
})();
