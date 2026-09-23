/* ===========================================================
   CRIMSON — the Crimson Court.

   Every painter works in "art units": the origin is the anchor,
   the base centre where the building meets the ground, +x runs
   right and +y runs DOWN (so heights are negative y). `paint`
   draws the static sprite once into an offscreen canvas; `under`
   and `live` are called every frame, before and after that
   sprite is copied onto the main canvas, in the same unit space.
   =========================================================== */

(function () {
  const RexArt = window.RexArt = window.RexArt || {};

  const { rad, rect, poly, line, litShade } = Paint;
  const { lancet, cutFoot } = RexKit;

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

    // 5. Foot cut
    cutFoot(g, -16.5, 16.5, 0.5);
  }

  function liveCrimson(g, px, t, a) {
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = a * (0.7 + 0.3 * Math.sin(t * 1.1));
    g.fillStyle = rad(g, 0, -11.6, 0, 3.8, [[0, "rgba(255,80,60,0.22)"], [1, "rgba(255,80,60,0)"]]);
    g.fillRect(-3.8, -11.6 - 3.8, 7.6, 7.6);
    g.globalCompositeOperation = "source-over";
  }

  RexArt.crimson = { box: [-16.5, -34.5, 16.5, 2], paint: paintCrimson, live: liveCrimson };
})();
