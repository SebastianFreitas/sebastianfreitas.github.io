/* ===========================================================
   BONESPIRE — the Bone Spire: a flat, stylized silhouette tower —
   stacked arcaded tiers under cornice bands, upright and tapering
   to a sharp pointed cone. Flat fills only.
   =========================================================== */

(function () {
  const RexArt = window.RexArt = window.RexArt || {};

  const { rad, poly } = Paint;
  const { cutFoot } = RexKit;

  /* ===================== BONE SPIRE ===================== */

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

    // 5. Foot cut
    cutFoot(g, -6, 6, 0.4);
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
