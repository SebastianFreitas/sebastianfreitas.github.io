/* ===========================================================
   DAWN — Mordrial's Tower: the oldest building on the Mainland, a
   weathered red-brick keep bearing the sign of Mordrial, the first
   man, arms spread in sacrifice.

   Every painter works in "art units": the origin is the anchor,
   the base centre where the building meets the ground, +x runs
   right and +y runs UP (so heights are negative y). `paint` draws
   the static sprite once into an offscreen canvas; `live` is
   called every frame, in the same unit space, translated to the
   base and scaled to art units.
   =========================================================== */

(function () {
  "use strict";
  const LandArt = window.LandArt = window.LandArt || {};

  const { poly, litShade, rect } = Paint;
  const { band, arch, litRect } = LandKit;

  /* ===================== DAWN ===================== */
  // Mordrial's Tower: the oldest building on the Mainland, a weathered red-brick
  // keep bearing the sign of Mordrial, the first man, arms spread in sacrifice

  const FD = { lit: "#a8452f", shade: "#6b2a1c", mortar: "#4a1d14", hole: "#1e0f0b", stone: "#b8a58a", stoneShade: "#7a6a54", roof: "#4d2a26", roofShade: "#2e1916", sigil: "#f0d9a0", sigilShade: "#b89c62" };
  const FD_STONE = { lit: FD.stone, shade: FD.stoneShade };

  function paintDawn(g, px) {
    // 1. Stone plinth
    litRect(g, -10, 0.6, 10, -2.5, FD.stone, FD.stoneShade);
    band(g, 0, 10.3, -2.5, 0.5, FD_STONE);
    litRect(g, -11.5, 0.6, -10, -0.8, FD.stone, FD.stoneShade);
    litRect(g, 10.2, 0.6, 11.2, -0.5, FD.stone, FD.stoneShade);

    // 2. Talus and shaft
    const talus = () => poly(g, [[-9, -3], [9, -3], [6, -10], [-6, -10]]);
    const shaft = () => poly(g, [[-6, -10], [6, -10], [6, -42], [-6, -42]]);
    litShade(g, talus, 2.7, FD.lit, FD.shade);
    litShade(g, shaft, 1.8, FD.lit, FD.shade);

    // 3. Brickwork, clipped
    g.save();
    g.beginPath();
    g.moveTo(-9, -3);
    g.lineTo(9, -3);
    g.lineTo(6, -10);
    g.lineTo(6, -42);
    g.lineTo(-6, -42);
    g.lineTo(-6, -10);
    g.closePath();
    g.clip();
    for (let r = 0; r < 26; r++) {
      const y = -3 - 1.5 * r;
      rect(g, -10, y, 10, y - 0.15, FD.mortar);
      for (let x = -10 + (r % 2 ? 1.5 : 0); x < 10; x += 3) {
        rect(g, x, y - 0.15, x + 0.15, y - 1.5, FD.mortar);
      }
    }
    g.restore();

    // 4. Weathering
    rect(g, -4.35, -15.15, -1.5, -16.5, FD.shade);
    rect(g, -2.85, -28.65, 0, -30, FD.hole);
    rect(g, -5.85, -37.65, -4.5, -39, FD.shade);
    poly(g, [[3.2, -10.5], [3.8, -10.5], [2.9, -13], [3.6, -15.5], [2.6, -18], [2.2, -18], [3.0, -15.5], [2.3, -13]]);
    g.fillStyle = FD.hole;
    g.fill();

    // 5. Stone string courses
    band(g, 0, 6.5, -10, 0.8, FD_STONE);
    band(g, 0, 6.5, -24, 0.7, FD_STONE);

    // 6. Arrow slits
    for (const [x, yb] of [[-3, -12], [3, -12], [-3.5, -22], [3.5, -22]]) arch(g, x, yb, 0.6, 2.6, FD.hole);

    // 7. Mordrial roundel
    g.beginPath();
    g.arc(0, -32.5, 5.4, 0, Math.PI * 2);
    g.fillStyle = FD.stone;
    g.fill();
    g.save();
    g.beginPath();
    g.arc(0, -32.5, 5.4, 0, Math.PI * 2);
    g.clip();
    rect(g, 1.6, -26, 7, -39, FD.stoneShade);
    g.restore();
    g.beginPath();
    g.arc(0, -32.5, 4.8, 0, Math.PI * 2);
    g.fillStyle = FD.hole;
    g.fill();

    // 8. Mordrial figure
    litShade(g, () => {
      g.beginPath();
      g.arc(0, -36.4, 0.9, 0, Math.PI * 2);
    }, 0.3, FD.sigil, FD.sigilShade);
    litShade(g, () => poly(g, [[-4.1, -34.9], [-0.8, -35.3], [0.8, -35.3], [4.1, -34.9], [4.1, -34.3], [0.8, -34.2], [-0.8, -34.2], [-4.1, -34.3]]), 0.3, FD.sigil, FD.sigilShade);
    litShade(g, () => poly(g, [[-0.8, -35.3], [0.8, -35.3], [1.0, -31.5], [1.6, -28.3], [-1.6, -28.3], [-1.0, -31.5]]), 0.3, FD.sigil, FD.sigilShade);

    // 9. Crown
    litRect(g, -7.2, -42, 7.2, -44, FD.stone, FD.stoneShade);
    for (let x = -6; x <= 6; x += 2) rect(g, x - 0.25, -42.2, x + 0.25, -43.3, FD.hole);
    litRect(g, -7.2, -44, 7.2, -45, FD.lit, FD.shade);
    const merlons = [-6.5, -4.1, -1.7, 0.7, 3.1, 5.5];
    merlons.forEach((x0, i) => {
      const top = i === 4 ? -45.9 : -46.6;
      litRect(g, x0, -45, x0 + 1.4, top, FD.lit, FD.shade);
    });

    // 10. Top turret
    litRect(g, -2.8, -45, 2.8, -51, FD.lit, FD.shade);
    band(g, 0, 3.2, -51, 0.5, FD_STONE);
    arch(g, 0, -46.5, 0.5, 2.2, FD.hole);
    litShade(g, () => poly(g, [[-3.6, -51.5], [3.6, -51.5], [0, -58]]), 0, FD.roof, FD.roofShade);
    rect(g, -0.1, -58, 0.1, -61.5, FD.roofShade);
  }

  function liveDawn(g, px, t, a) {
    // (a) flat pennant waving from the pole top
    const w = Math.sin(t * 2.2);
    g.fillStyle = FD.lit;
    poly(g, [[0.1, -61.5], [2.2, -61.1 + 0.3 * w], [4.2, -60.9 + 0.5 * w], [2.2, -60.2 + 0.3 * w], [0.1, -60]]);
    g.fill();

    // (b) firelit arrow slits
    g.globalAlpha = a * (0.55 + 0.25 * Math.sin(t * 1.9));
    for (const [x, yb] of [[-3, -12], [3, -12], [-3.5, -22], [3.5, -22]]) arch(g, x, yb - 0.3, 0.35, 1.8, "#e8a54a");
    g.globalAlpha = a;

    g.globalCompositeOperation = "source-over";
    g.globalAlpha = a;
  }

  LandArt.dawn = { box: [-12, -63, 12, 2], top: 60, paint: paintDawn, live: liveDawn };
})();
