/* ===========================================================
   REXART SURFACE — the illustrated landmarks of the Rex map's
   surface: the Kingdom of First Light, the Crimson Court and
   the Bone Spire.

   Every painter works in "art units": the origin is the anchor,
   the base centre where the building meets the ground, +x runs
   right and +y runs DOWN (so heights are negative y). `paint`
   draws the static sprite once into an offscreen canvas; `under`
   and `live` are called every frame, before and after that
   sprite is copied onto the main canvas, in the same unit space.
   =========================================================== */

(function () {
  const RexArt = window.RexArt = window.RexArt || {};

  /* ---------------- shared drawing helpers ---------------- */

  function lin(g, x0, y0, x1, y1, stops) {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    for (const [offset, color] of stops) gr.addColorStop(offset, color);
    return gr;
  }

  function rad(g, x, y, r0, r1, stops) {
    const gr = g.createRadialGradient(x, y, r0, x, y, r1);
    for (const [offset, color] of stops) gr.addColorStop(offset, color);
    return gr;
  }

  function rect(g, x0, y0, x1, y1, fill) {
    g.fillStyle = fill;
    g.fillRect(x0, y0, x1 - x0, y1 - y0);
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

  // fill lit, then clip to the shape and fill the hard shadow for x >= xSplit
  function litShade(g, trace, xSplit, lit, shade) {
    trace();
    g.fillStyle = lit;
    g.fill();
    g.save();
    trace();
    g.clip();
    g.fillStyle = shade;
    g.fillRect(xSplit, -1000, 2000, 2000);
    g.restore();
  }

  // each merlon is flat-filled lit, or shade if its centre is at/past xSplit
  // (xSplit omitted or shade omitted => every merlon uses lit)
  function merlons(g, x0, x1, yTop, mw, mh, gap, lit, shade, xSplit) {
    const n = Math.max(1, Math.floor((x1 - x0 + gap) / (mw + gap)));
    const span = n * mw + (n - 1) * gap;
    const start = x0 + (x1 - x0 - span) / 2;
    for (let i = 0; i < n; i++) {
      const mx = start + i * (mw + gap);
      const useShade = shade !== undefined && xSplit !== undefined && (mx + mw / 2) >= xSplit;
      g.fillStyle = useShade ? shade : lit;
      g.fillRect(mx, yTop - mh, mw, mh);
    }
  }

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

  function fadeFoot(g, x0, x1, yFrom, yTo) {
    g.save();
    g.globalCompositeOperation = "destination-out";
    g.fillStyle = lin(g, 0, yFrom, 0, yTo, [[0, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,1)"]]);
    g.fillRect(x0, yFrom, x1 - x0, yTo - yFrom + 50);
    g.restore();
  }

  /* ================= KINGDOM OF FIRST LIGHT ================= */

  const FL = { lit: "#e6e4df", shade: "#a3a6ab", roof: "#8a93a0", roofShade: "#5b6370", hole: "#2a2e35", glow: "#f3c969", flag: "#e8c24a" };

  function paintFirstLight(g, px) {
    const gatePath = () => {
      g.beginPath();
      g.moveTo(-1, 2);
      g.lineTo(-1, -2.8);
      g.arc(0, -2.8, 1, Math.PI, 2 * Math.PI);
      g.lineTo(1, 2);
      g.closePath();
    };

    // 1. Lantern tower
    litShade(g, () => { g.beginPath(); g.rect(-1.1, -25.2, 2.2, 27.2); }, 0.33, FL.lit, FL.shade);
    archWin(g, 0, -24.75, 1.1, 1.95);
    g.fillStyle = FL.glow;
    g.fill();
    litShade(g, () => { g.beginPath(); g.rect(-1.45, -25.6, 2.9, 0.4); }, 0.435, FL.lit, FL.shade);
    poly(g, [[-1.45, -25.6], [0, -30], [0, -25.6]]);
    g.fillStyle = FL.roof;
    g.fill();
    poly(g, [[0, -25.6], [0, -30], [1.45, -25.6]]);
    g.fillStyle = FL.roofShade;
    g.fill();
    g.beginPath();
    g.arc(0, -30.2, 0.22, 0, 2 * Math.PI);
    g.fillStyle = FL.glow;
    g.fill();

    // 2. Keep
    rect(g, -4, -19.5, 2.2, 2, FL.lit);
    rect(g, 2.2, -19.5, 4, 2, FL.shade);
    merlons(g, -4, 2.2, -19.5, 0.7, 0.8, 0.55, FL.lit);
    merlons(g, 2.2, 4, -19.5, 0.7, 0.8, 0.55, FL.shade);

    for (const cx of [-2.9, -1.35, 0.2]) {
      archWin(g, cx, -16.8, 0.45, 1.2);
      g.fillStyle = FL.glow;
      g.fill();
    }
    for (const cx of [-2.1, -0.6]) {
      archWin(g, cx, -15.0, 0.45, 1.0);
      g.fillStyle = FL.glow;
      g.fill();
    }

    archWin(g, 3.1, -16.8, 0.3, 1.2);
    g.fillStyle = FL.glow;
    g.fill();

    rect(g, -4.7, -17.5, 4.7, -17.25, FL.shade);

    litShade(g, () => { g.beginPath(); g.rect(-4.7, -21.5, 1.6, 4); }, -3.66, FL.lit, FL.shade);
    litShade(g, () => { g.beginPath(); g.rect(3.1, -21.5, 1.6, 4); }, 4.14, FL.lit, FL.shade);

    poly(g, [[-4.95, -21.5], [-3.9, -23.8], [-3.9, -21.5]]);
    g.fillStyle = FL.roof;
    g.fill();
    poly(g, [[-3.9, -21.5], [-3.9, -23.8], [-2.85, -21.5]]);
    g.fillStyle = FL.roofShade;
    g.fill();
    poly(g, [[2.85, -21.5], [3.9, -23.8], [3.9, -21.5]]);
    g.fillStyle = FL.roof;
    g.fill();
    poly(g, [[3.9, -21.5], [3.9, -23.8], [4.95, -21.5]]);
    g.fillStyle = FL.roofShade;
    g.fill();

    // 3. Inner wall
    litShade(g, () => { g.beginPath(); g.rect(-9.5, -13, 19, 15); }, 2.85, FL.lit, FL.shade);
    merlons(g, -9.5, 9.5, -13, 0.6, 0.7, 0.5, FL.lit, FL.shade, 2.85);

    litShade(g, () => { g.beginPath(); g.rect(-10.7, -15.6, 2.4, 17.6); }, -9.14, FL.lit, FL.shade);
    litShade(g, () => { g.beginPath(); g.rect(8.3, -15.6, 2.4, 17.6); }, 9.86, FL.lit, FL.shade);
    merlons(g, -10.7, -8.3, -15.6, 0.55, 0.7, 0.45, FL.lit, FL.shade, -9.14);
    merlons(g, 8.3, 10.7, -15.6, 0.55, 0.7, 0.45, FL.lit, FL.shade, 9.86);

    rect(g, -10.7, -10.5, 10.7, -6, FL.shade);

    // 4. Houses
    const houses = [
      [-11.3, 1.8, -9.0, -10.5],
      [-9.2, 2.2, -9.5, -11.2],
      [-4.8, 1.6, -8.8, -10.1],
      [4.9, 1.8, -9.2, -10.6],
      [9.0, 2.4, -9.8, -11.5],
      [11.4, 1.7, -8.9, -10.3]
    ];
    for (const [x, w, wallTop, apex] of houses) {
      rect(g, x - w / 2, wallTop, x - w / 2 + 0.65 * w, -6, FL.lit);
      rect(g, x - w / 2 + 0.65 * w, wallTop, x + w / 2, -6, FL.shade);
      poly(g, [[x - w / 2 - 0.15, wallTop], [x, apex], [x, wallTop]]);
      g.fillStyle = FL.roof;
      g.fill();
      poly(g, [[x, wallTop], [x, apex], [x + w / 2 + 0.15, wallTop]]);
      g.fillStyle = FL.roofShade;
      g.fill();
      rect(g, x - 0.175, wallTop + 0.35, x - 0.175 + 0.35, wallTop + 0.35 + 0.5, FL.glow);
    }

    // 5. Outer curtain wall
    litShade(g, () => { g.beginPath(); g.rect(-13, -8, 26, 10); }, 3.9, FL.lit, FL.shade);
    rect(g, -13, -8, 13, -7.8, FL.shade);
    merlons(g, -13, 13, -8, 0.6, 0.7, 0.5, FL.lit, FL.shade, 3.9);
    for (const cx of [-9.8, -4.6, 4.6, 9.8]) {
      rect(g, cx - 0.075, -5.6, cx + 0.075, -4.8, "#4a545b");
    }

    // 6. Intermediate towers
    for (const c of [-7, 7]) {
      rect(g, c - 1.2, -10.2, c + 0.48, 2, FL.lit);
      rect(g, c + 0.48, -10.2, c + 1.2, 2, FL.shade);
      merlons(g, c - 1.2, c + 1.2, -10.2, 0.55, 0.7, 0.45, FL.lit, FL.shade, c + 0.48);
      rect(g, c - 0.4, -8.4, c - 0.4 + 0.25, -8.4 + 0.8, FL.glow);
    }

    // 7. Corner towers
    for (const c of [-13, 13]) {
      litShade(g, () => { g.beginPath(); g.rect(c - 1.7, -10.8, 3.4, 12.8); }, c + 0.51, FL.lit, FL.shade);
      litShade(g, () => { g.beginPath(); g.rect(c - 1.95, -12, 3.9, 1.2); }, c + 0.585, FL.lit, FL.shade);
      rect(g, c - 1.95, -10.8, c + 1.95, -10.62, FL.shade);
      merlons(g, c - 1.95, c + 1.95, -12, 0.55, 0.7, 0.45, FL.lit, FL.shade, c + 0.585);
      rect(g, c - 0.15, -8.2, c - 0.15 + 0.3, -8.2 + 0.9, FL.glow);
    }

    // 8. Gate towers
    for (const c of [-2.1, 2.1]) {
      litShade(g, () => { g.beginPath(); g.rect(c - 1.1, -11.2, 2.2, 13.2); }, c + 0.33, FL.lit, FL.shade);
      merlons(g, c - 1.1, c + 1.1, -11.2, 0.5, 0.65, 0.4, FL.lit, FL.shade, c + 0.33);
    }

    gatePath();
    g.fillStyle = FL.hole;
    g.fill();
    g.save();
    gatePath();
    g.clip();
    g.beginPath();
    for (const x of [-0.5, 0, 0.5]) {
      g.moveTo(x, -3.8);
      g.lineTo(x, 2);
    }
    for (const y of [-1, -2]) {
      g.moveTo(-1, y);
      g.lineTo(1, y);
    }
    g.strokeStyle = FL.shade;
    g.lineWidth = px;
    g.stroke();
    g.restore();

    // 9. Foot fade
    fadeFoot(g, -16, 16, -0.6, 1.6);
  }

  function underFirstLight(g, px, t, a) {
    const k = 0.75 + 0.25 * Math.sin(t * 0.5);
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = a * k;
    poly(g, [[-0.6, -23.6], [0.6, -23.6], [2.6, -70], [-2.6, -70]]);
    g.fillStyle = lin(g, 0, -23.6, 0, -70, [[0, "rgba(255,244,214,0.06)"], [1, "rgba(255,244,214,0)"]]);
    g.fill();
    g.globalCompositeOperation = "source-over";

    const rr = 18 * (1 + 0.03 * Math.sin(t * 0.7));
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = a;
    g.fillStyle = rad(g, 0, -23.6, 0, rr, [[0, "rgba(255,244,214,0.22)"], [0.3, "rgba(255,236,190,0.07)"], [1, "rgba(255,236,190,0)"]]);
    g.fillRect(-rr, -23.6 - rr, 2 * rr, 2 * rr);
    g.globalCompositeOperation = "source-over";
  }

  function liveFirstLight(g, px, t, a) {
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = a * (0.85 + 0.15 * Math.sin(t * 2.3));
    g.fillStyle = rad(g, 0, -23.6, 0, 1.6, [[0, "rgba(255,246,220,0.55)"], [1, "rgba(255,246,220,0)"]]);
    g.fillRect(-1.6, -25.2, 3.2, 3.2);
    g.globalCompositeOperation = "source-over";

    g.globalAlpha = a;
    g.beginPath();
    g.arc(0, -23.7, 0.32, 0, 2 * Math.PI);
    g.fillStyle = "#fffaf0";
    g.fill();

    g.globalAlpha = a;
    line(g, [[0, -30.4], [0, -32.4]], "rgba(230,230,220,0.8)", px * 1.2);

    const s1 = Math.sin(t * 3 - 0.9);
    const s2 = Math.sin(t * 3 - 1.8);
    const s3 = Math.sin(t * 3 - 2.7);
    g.globalAlpha = a * 0.9;
    poly(g, [[0, -32.4], [0.8, -32.3 + 0.15 * s1], [1.6, -32.2 + 0.2 * s2], [2.4, -31.95 + 0.25 * s3], [1.6, -31.7 + 0.2 * s2], [0.8, -31.5 + 0.15 * s1], [0, -31.4]]);
    g.fillStyle = FL.flag;
    g.fill();
  }

  RexArt.firstlight = { box: [-16, -34, 16, 2], paint: paintFirstLight, under: underFirstLight, live: liveFirstLight };

  /* ==================== CRIMSON COURT ==================== */

  const CC = { lit: "#6e1a24", shade: "#3e0d15", spire: "#5a1520", spireShade: "#300a10", hole: "#16060a", glass: "#d8342f", tracery: "#16060a" };

  function paintCrimson(g, px) {
    // 1. Fleche
    litShade(g, () => { g.beginPath(); g.rect(-0.6, -23, 1.2, 25); }, 0.18, CC.lit, CC.shade);
    poly(g, [[-0.6, -23], [0, -33], [0.6, -23]]);
    g.fillStyle = CC.spire;
    g.fill();
    poly(g, [[0, -23], [0.6, -23], [0, -33]]);
    g.fillStyle = CC.spireShade;
    g.fill();
    for (let k = 1; k <= 5; k++) {
      const y = -23 - k * 1.7;
      const hw = 0.6 * (1 - k * 1.7 / 10);
      poly(g, [[-hw, y], [-hw - 0.3, y - 0.15], [-hw, y - 0.35]]);
      g.fillStyle = CC.spire;
      g.fill();
      poly(g, [[hw, y], [hw + 0.3, y - 0.15], [hw, y - 0.35]]);
      g.fillStyle = CC.spireShade;
      g.fill();
    }

    // 2. Wings
    for (const s of [-1, 1]) {
      const x0 = Math.min(s * 8.2, s * 14.5), x1 = Math.max(s * 8.2, s * 14.5);
      const wingSplit = (x0 + x1) / 2 + 0.3 * (x1 - x0) / 2;
      litShade(g, () => { g.beginPath(); g.rect(x0, -8.5, x1 - x0, 10.5); }, wingSplit, CC.lit, CC.shade);
      litShade(g, () => { poly(g, [[s * 14.5, -8.5], [s * 13.2, -11.5], [s * 8.2, -11.5], [s * 8.2, -8.5]]); }, wingSplit, CC.lit, CC.shade);

      for (const cx of [s * 9.5, s * 11.4, s * 13.2]) {
        lancet(g, cx, 0.9, -2.2, -6.2, -6.9);
        g.fillStyle = CC.glass;
        g.fill();
        line(g, [[cx, -6.6], [cx, -2.2]], CC.tracery, px * 1.2);
        line(g, [[cx - 0.45, -4.4], [cx + 0.45, -4.4]], CC.tracery, px);
      }

      const piers = [
        { c: s * 10.45, hw: 0.275, top: -9.6, apex: -11.6, finial: -12.2 },
        { c: s * 12.3, hw: 0.275, top: -9.6, apex: -11.6, finial: -12.2 },
        { c: s * 14.9, hw: 0.5, top: -9.4, apex: -12.0, finial: -12.7 }
      ];
      for (const { c, hw, top, apex, finial } of piers) {
        litShade(g, () => { g.beginPath(); g.rect(c - hw, top, 2 * hw, 2 - top); }, c + 0.3 * hw, CC.lit, CC.shade);
        poly(g, [[c - hw, top], [c, apex], [c + hw, top]]);
        g.fillStyle = CC.spire;
        g.fill();
        poly(g, [[c, top], [c + hw, top], [c, apex]]);
        g.fillStyle = CC.spireShade;
        g.fill();
        line(g, [[c, apex], [c, finial]], CC.spireShade, px);
      }

      g.beginPath();
      g.moveTo(s * 14.9, -9.2);
      g.quadraticCurveTo(s * 13.8, -15.4, s * 8.2, -15.8);
      g.strokeStyle = CC.shade;
      g.lineWidth = 0.55;
      g.stroke();

      g.beginPath();
      g.moveTo(s * 12.3, -9.6);
      g.quadraticCurveTo(s * 11.2, -13.6, s * 8.2, -13.2);
      g.strokeStyle = CC.shade;
      g.lineWidth = 0.4;
      g.stroke();
    }

    // 3. Towers
    for (const c of [-6.4, 6.4]) {
      const o = Math.sign(c);
      const towerSplit = c + 0.3 * 1.8;
      litShade(g, () => { g.beginPath(); g.rect(c - 1.8, -21, 3.6, 23); }, towerSplit, CC.lit, CC.shade);
      if (o > 0) rect(g, c + 1.3, -21, c + 1.8, 2, CC.shade);
      else rect(g, c - 1.8, -21, c - 1.3, 2, CC.shade);

      line(g, [[c - 1.8, -8.5], [c + 1.8, -8.5]], CC.tracery, px);
      line(g, [[c - 1.8, -15.5], [c + 1.8, -15.5]], CC.tracery, px);

      for (const cx of [c - 0.6, c + 0.6]) {
        lancet(g, cx, 0.6, -10.4, -14.0, -14.6);
        g.fillStyle = CC.glass;
        g.fill();
      }

      lancet(g, c, 1.2, -17.2, -19.6, -20.3);
      g.fillStyle = CC.hole;
      g.fill();
      g.save();
      lancet(g, c, 1.2, -17.2, -19.6, -20.3);
      g.clip();
      g.beginPath();
      for (const y of [-17.9, -18.5, -19.1]) {
        g.moveTo(c - 0.6, y);
        g.lineTo(c + 0.6, y);
      }
      g.strokeStyle = CC.tracery;
      g.lineWidth = px * 1.5;
      g.stroke();
      g.restore();

      poly(g, [[c + o * 1.8, -15.4], [c + o * 2.7, -15.1], [c + o * 2.5, -14.8], [c + o * 1.8, -14.9]]);
      g.fillStyle = o > 0 ? CC.spireShade : CC.spire;
      g.fill();

      {
        const px0 = c - 1.8, px1 = c - 1.3, mid = (px0 + px1) / 2;
        poly(g, [[px0, -21], [mid, -23.7], [px1, -21]]);
        g.fillStyle = CC.spire;
        g.fill();
      }
      {
        const px0 = c + 1.3, px1 = c + 1.8, mid = (px0 + px1) / 2;
        poly(g, [[px0, -21], [mid, -23.7], [px1, -21]]);
        g.fillStyle = CC.spireShade;
        g.fill();
        line(g, [[mid, -23.7], [mid, -24.3]], CC.spireShade, px);
      }

      poly(g, [[c - 1.4, -21], [c, -30.5], [c + 1.4, -21]]);
      g.fillStyle = CC.spire;
      g.fill();
      poly(g, [[c, -21], [c + 1.4, -21], [c, -30.5]]);
      g.fillStyle = CC.spireShade;
      g.fill();
      line(g, [[c, -30.5], [c, -32]], CC.spireShade, px * 1.2);

      for (let k = 1; k <= 6; k++) {
        const y = -21 - k * 1.35;
        const hw = 1.4 * (1 - k * 1.35 / 9.5);
        poly(g, [[c - hw, y], [c - hw - 0.3, y - 0.15], [c - hw + 0.02, y - 0.4]]);
        g.fillStyle = CC.spire;
        g.fill();
        poly(g, [[c + hw, y], [c + hw + 0.3, y - 0.15], [c + hw - 0.02, y - 0.4]]);
        g.fillStyle = CC.spireShade;
        g.fill();
      }

      rect(g, c - 0.25, -24.9, c + 0.25, -24.1, CC.glass);
      poly(g, [[c - 0.35, -24.9], [c, -25.4], [c + 0.35, -24.9]]);
      g.fillStyle = CC.spire;
      g.fill();
      poly(g, [[c, -24.9], [c + 0.35, -24.9], [c, -25.4]]);
      g.fillStyle = CC.spireShade;
      g.fill();
    }

    // 4. Facade
    litShade(g, () => {
      g.beginPath();
      g.rect(-4.6, -14.3, 9.2, 16.3);
      g.moveTo(-4.6, -14.3);
      g.lineTo(0, -20);
      g.lineTo(4.6, -14.3);
      g.closePath();
    }, 1.38, CC.lit, CC.shade);

    const gableApex = [0, -20];
    for (const [bi, base] of [[-4.6, -14.3], [4.6, -14.3]].entries()) {
      for (let k = 1; k <= 4; k++) {
        const qx = base[0] + (k / 5) * (gableApex[0] - base[0]);
        const qy = base[1] + (k / 5) * (gableApex[1] - base[1]);
        poly(g, [[qx - 0.12, qy], [qx, qy - 0.55], [qx + 0.12, qy]]);
        g.fillStyle = bi === 0 ? CC.spire : CC.spireShade;
        g.fill();
      }
    }

    poly(g, [[-0.2, -20], [0, -21.6], [0.2, -20]]);
    g.fillStyle = CC.spire;
    g.fill();
    poly(g, [[0, -20], [0.2, -20], [0, -21.6]]);
    g.fillStyle = CC.spireShade;
    g.fill();

    for (const y of [-7.8, -9.2, -14.3]) {
      line(g, [[-4.6, y], [4.6, y]], CC.tracery, px);
    }

    for (let i = 0; i <= 8; i++) {
      const cx = -3.9 + i * 0.975;
      lancet(g, cx, 0.5, -8.0, -8.6, -9.0);
      g.strokeStyle = CC.tracery;
      g.lineWidth = px;
      g.stroke();
    }

    g.beginPath();
    g.arc(0, -11.6, 2.0, 0, 2 * Math.PI);
    g.fillStyle = CC.glass;
    g.fill();

    g.strokeStyle = CC.tracery;
    g.beginPath();
    g.arc(0, -11.6, 2.0, 0, 2 * Math.PI);
    g.lineWidth = 0.2;
    g.stroke();
    g.beginPath();
    g.arc(0, -11.6, 0.65, 0, 2 * Math.PI);
    g.lineWidth = 0.14;
    g.stroke();

    g.beginPath();
    for (let k = 0; k < 12; k++) {
      const ang = k * Math.PI / 6;
      g.moveTo(0.65 * Math.cos(ang), -11.6 + 0.65 * Math.sin(ang));
      g.lineTo(2.0 * Math.cos(ang), -11.6 + 2.0 * Math.sin(ang));
    }
    g.lineWidth = 0.12;
    g.stroke();

    g.beginPath();
    for (let k = 0; k < 12; k++) {
      const ang = k * Math.PI / 6 + Math.PI / 12;
      const cx = 1.35 * Math.cos(ang), cy = -11.6 + 1.35 * Math.sin(ang);
      g.moveTo(cx + 0.33, cy);
      g.arc(cx, cy, 0.33, 0, 2 * Math.PI);
    }
    g.lineWidth = 0.09;
    g.stroke();

    g.beginPath();
    g.arc(0, -11.6, 2.3, 0, 2 * Math.PI);
    g.strokeStyle = CC.tracery;
    g.lineWidth = px;
    g.stroke();

    lancet(g, 0, 4.6, 2, -3.4, -7.4);
    g.strokeStyle = CC.tracery;
    g.lineWidth = px;
    g.stroke();
    lancet(g, 0, 4.0, 2, -3.4, -6.8);
    g.strokeStyle = CC.tracery;
    g.lineWidth = px;
    g.stroke();

    lancet(g, 0, 3.4, 2, -3.4, -6.2);
    g.fillStyle = CC.hole;
    g.fill();

    line(g, [[0, 2], [0, -5.4]], CC.tracery, px);

    // 5. Foot fade
    fadeFoot(g, -16.5, 16.5, -0.6, 1.6);
  }

  function liveCrimson(g, px, t, a) {
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = a * (0.7 + 0.3 * Math.sin(t * 1.1));
    g.fillStyle = rad(g, 0, -11.6, 0, 3.8, [[0, "rgba(255,80,60,0.22)"], [1, "rgba(255,80,60,0)"]]);
    g.fillRect(-3.8, -11.6 - 3.8, 7.6, 7.6);
    g.globalCompositeOperation = "source-over";
  }

  RexArt.crimson = { box: [-16.5, -34.5, 16.5, 2], paint: paintCrimson, live: liveCrimson };

  /* ===================== BONE SPIRE ===================== */
  // a flat, stylized silhouette tower — stacked arcaded tiers under cornice
  // bands, upright and tapering to a sharp pointed cone. Flat fills only.

  const BS = { lit: "#ece2c9", shade: "#a8977a", hole: "#3a3026" };
  // [height, half-width at bottom, half-width at top, arch count], bottom tier first
  const BS_TIERS = [[9.0, 4.6, 4.3, 5], [7.6, 4.0, 3.7, 4], [6.6, 3.4, 3.1, 4], [5.8, 2.8, 2.5, 3], [5.0, 2.2, 1.9, 3]];
  const BS_CORNICE = 0.8;   // cornice band height
  const BS_PLINTH = 0.9;    // plinth top is at y = -BS_PLINTH
  const BS_TIP = 54;        // cone apex at y = -BS_TIP

  function paintBoneSpire(g, px) {
    // 1. Plinth
    poly(g, [[-5.2, 0.6], [5.2, 0.6], [5.2, -BS_PLINTH], [-5.2, -BS_PLINTH]]);
    g.fillStyle = BS.lit;
    g.fill();

    poly(g, [[1.6, 0.6], [5.2, 0.6], [5.2, -BS_PLINTH], [1.6, -BS_PLINTH]]);
    g.fillStyle = BS.shade;
    g.fill();

    // 2. Tiers, bottom-first
    let yb = -BS_PLINTH;
    for (const [h, hwB, hwT, n] of BS_TIERS) {
      const yt = yb - h;

      poly(g, [[-hwB, yb], [hwB, yb], [hwT, yt], [-hwT, yt]]);
      g.fillStyle = BS.lit;
      g.fill();

      poly(g, [[0.3 * hwB, yb], [hwB, yb], [hwT, yt], [0.3 * hwT, yt]]);
      g.fillStyle = BS.shade;
      g.fill();

      // Arches
      g.save();
      poly(g, [[-hwB, yb], [hwB, yb], [hwT, yt], [-hwT, yt]]);
      g.clip();
      const hwM = (hwB + hwT) / 2;
      const span = 0.78 * hwM;
      const aw = 0.55 * span / n;
      const yBot = yb - 0.12 * h;
      const yApex = yt + 0.14 * h;
      const ySpring = yApex + aw;
      for (let j = 0; j < n; j++) {
        const cx = -span + (j + 0.5) * (2 * span / n);
        g.beginPath();
        g.moveTo(cx - aw, yBot);
        g.lineTo(cx - aw, ySpring);
        g.arc(cx, ySpring, aw, Math.PI, 0, false);
        g.lineTo(cx + aw, yBot);
        g.closePath();
        g.fillStyle = BS.hole;
        g.fill();
      }
      g.restore();

      // Cornice on top of the tier
      const cw = hwT + 0.5;
      const yc = yt - BS_CORNICE;

      poly(g, [[-cw, yt], [cw, yt], [cw, yc], [-cw, yc]]);
      g.fillStyle = BS.lit;
      g.fill();

      poly(g, [[-cw, yt], [cw, yt], [cw, yt - 0.35 * BS_CORNICE], [-cw, yt - 0.35 * BS_CORNICE]]);
      g.fillStyle = BS.shade;
      g.fill();

      poly(g, [[0.3 * hwT, yt], [cw, yt], [cw, yc], [0.3 * hwT, yc]]);
      g.fillStyle = BS.shade;
      g.fill();

      // Cornice thorns
      for (const s of [-1, 1]) {
        poly(g, [[s * (cw - 0.5), yc], [s * cw, yc], [s * (cw + 0.35), yc - 1.1]]);
        g.fillStyle = s === -1 ? BS.lit : BS.shade;
        g.fill();
      }

      yb = yc;
    }

    // 3. Cone
    const ybase = yb;
    poly(g, [[-2.0, ybase], [2.0, ybase], [0, -BS_TIP]]);
    g.fillStyle = BS.lit;
    g.fill();

    poly(g, [[0, ybase], [2.0, ybase], [0, -BS_TIP]]);
    g.fillStyle = BS.shade;
    g.fill();

    // 4. Collar at the cone base
    const cAw = 0.35, cYBot = ybase - 0.4, cYSpring = ybase - 1.6;
    g.beginPath();
    g.moveTo(-cAw, cYBot);
    g.lineTo(-cAw, cYSpring);
    g.arc(0, cYSpring, cAw, Math.PI, 0, false);
    g.lineTo(cAw, cYBot);
    g.closePath();
    g.fillStyle = BS.hole;
    g.fill();

    // 5. Foot fade
    fadeFoot(g, -6, 6, -0.8, 1.6);
  }

  function liveBoneSpire(g, px, t, a) {
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = a * (0.75 + 0.25 * Math.sin(t * 1.3));
    g.fillStyle = rad(g, 0, -BS_TIP, 0, 3.5, [[0, "rgba(255,240,200,0.30)"], [1, "rgba(255,240,200,0)"]]);
    g.fillRect(-3.5, -BS_TIP - 3.5, 7, 7);
    g.globalCompositeOperation = "source-over";
  }

  RexArt.bonespire = { box: [-6, -58, 6, 2], paint: paintBoneSpire, live: liveBoneSpire };
})();
