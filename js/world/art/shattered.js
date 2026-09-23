/* ===========================================================
   SHATTERED — the Shattered College: a broken scholars' observatory
   with a ritual portal in the crack.

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

  const { poly, litShade } = Paint;
  const { band, arch } = LandKit;

  /* ===================== SHATTERED ===================== */
  // a broken scholars' observatory with a ritual portal in the crack

  const SH = { lit: "#9a94b4", shade: "#5d5776", hole: "#120e1c", rune: "#a98ce8" };
  const SH_SHARDS = [[-9, -30, 1.4, 0.5], [8.5, -38, 1.1, -0.4], [-8, -44, 0.9, 0.9], [9.5, -24, 0.8, 0.2], [-10.5, -20, 0.7, -0.7]];

  function towerHw(y) {
    return 6 - 1.5 * (-y / 24);
  }

  function paintShattered(g, px) {
    // 1. Plinth
    litShade(g, () => poly(g, [[-7, 0.6], [7, 0.6], [7, -1.2], [-7, -1.2]]), 0.3 * 7, SH.lit, SH.shade);

    // 2. Lower tower, jagged broken top
    litShade(g, () => poly(g, [[-6, 0], [6, 0], [4.5, -24], [1.5, -28], [0, -25.5], [-2, -29], [-4.5, -26]]), 0.3 * 6, SH.lit, SH.shade);

    // 3. Bands
    band(g, 0, towerHw(-8) + 0.6, -8, 0.8, SH);
    band(g, 0, towerHw(-17) + 0.6, -17, 0.8, SH);

    // 4. Windows
    const storeys = [[-1.5, 3.4], [-9.5, 3.4], [-18.5, 2.8]];
    for (const [yb, h] of storeys) {
      for (const x of [-2.4, 0, 2.4]) arch(g, x, yb, 0.8, h, SH.hole);
    }

    // 5. Portal
    g.beginPath();
    g.arc(0, -35, 5.6, 0, Math.PI * 2);
    g.fillStyle = SH.rune;
    g.fill();
    g.beginPath();
    g.arc(0, -35, 4.9, 0, Math.PI * 2);
    g.fillStyle = SH.hole;
    g.fill();

    // 6. Upper fragment
    g.save();
    g.translate(0, -47);
    g.rotate(-0.12);

    litShade(g, () => poly(g, [[-4.3, 7], [-2, 4.5], [0, 6.5], [2.2, 4], [4.3, 6], [3.2, -5], [-3.2, -5]]), 0.3 * 4.3, SH.lit, SH.shade);
    band(g, 0, 3.8, -5, 0.7, SH);

    litShade(g, () => {
      g.beginPath();
      g.ellipse(0, -5.7, 3.2, 3, 0, Math.PI, 0, false);
      g.closePath();
    }, 0.3 * 3.2, SH.lit, SH.shade);

    litShade(g, () => poly(g, [[-0.5, -8.4], [0.5, -8.4], [0, -13]]), 0, SH.lit, SH.shade);

    arch(g, 0, -0.5, 0.7, 2.4, SH.hole);

    g.restore();

    // 7. Floating shards
    for (const [cx, cy, size, angle] of SH_SHARDS) {
      g.save();
      g.translate(cx, cy);
      g.rotate(angle);
      litShade(g, () => poly(g, [[-size, 0], [0, -size * 1.3], [size * 0.8, 0], [0, size * 0.9]]), 0, SH.lit, SH.shade);
      g.restore();
    }
  }

  function liveShattered(g, px, t, a) {
    g.globalCompositeOperation = "lighter";
    const k = (0.75 + 0.25 * Math.sin(t * 1.7)) * a;
    const gr = g.createRadialGradient(0, -35, 0, 0, -35, 8);
    gr.addColorStop(0, `rgba(169,140,232,${0.35 * k})`);
    gr.addColorStop(1, "rgba(169,140,232,0)");
    g.fillStyle = gr;
    g.fillRect(-8, -43, 16, 16);
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = a;
  }

  LandArt.shattered = { box: [-14, -64, 14, 2], top: 60, paint: paintShattered, live: liveShattered };
})();
