/* ===========================================================
   ACCORD — the Sanctuary of the Luminous Path: white colonnaded
   basilica, slender bell tower, light falling from above.

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

  /* ===================== ACCORD ===================== */
  // the Sanctuary of the Luminous Path: white colonnaded basilica,
  // slender bell tower, light falling from above

  const DA = { lit: "#eeebe2", shade: "#aeaa9c", hole: "#2d2c28", gold: "#e8c46a", goldShade: "#b08f3e", glow: "#fbe7b0" };

  function paintAccord(g, px) {
    // 1. Bell tower (behind the hall)
    litShade(g, () => poly(g, [[-2.6, -13], [2.6, -13], [2.6, -40], [-2.6, -40]]), 0.78, DA.lit, DA.shade);
    band(g, 0, 3.1, -30, 0.7, DA);
    band(g, 0, 3.1, -40, 0.7, DA);
    arch(g, 0, -34, 1.8, 4, DA.hole);
    litShade(g, () => poly(g, [[-2.2, -40.7], [2.2, -40.7], [0, -54]]), 0, DA.lit, DA.shade);

    // 3. Steps
    litShade(g, () => poly(g, [[-14, 0.6], [14, 0.6], [14, -1.5], [-14, -1.5]]), 0.3 * 14, DA.lit, DA.shade);
    litShade(g, () => poly(g, [[-12.5, -1.5], [12.5, -1.5], [12.5, -3], [-12.5, -3]]), 0.3 * 12.5, DA.lit, DA.shade);

    // 4. Back wall
    poly(g, [[-11.5, -3], [11.5, -3], [11.5, -11], [-11.5, -11]]);
    g.fillStyle = DA.shade;
    g.fill();
    arch(g, 0, -3, 2.4, 6, DA.hole);

    // 5. Columns
    for (const cx of [-10.5, -7, -3.5, 3.5, 7, 10.5]) {
      poly(g, [[cx - 0.55, -3], [cx, -3], [cx, -11], [cx - 0.55, -11]]);
      g.fillStyle = DA.lit;
      g.fill();
      poly(g, [[cx, -3], [cx + 0.55, -3], [cx + 0.55, -11], [cx, -11]]);
      g.fillStyle = DA.shade;
      g.fill();

      poly(g, [[cx - 0.8, -10.6], [cx + 0.8, -10.6], [cx + 0.8, -11], [cx - 0.8, -11]]);
      g.fillStyle = DA.lit;
      g.fill();
    }

    // 6. Entablature
    band(g, 0, 12.2, -11, 1.8, DA);

    // 7. Pediment
    litShade(g, () => poly(g, [[-12.2, -12.8], [12.2, -12.8], [0, -17]]), 0, DA.lit, DA.shade);
    poly(g, [[-10, -13.3], [10, -13.3], [0, -16.3]]);
    g.fillStyle = DA.shade;
    g.fill();
    g.beginPath();
    g.arc(0, -14.6, 0.8, 0, Math.PI * 2);
    g.fillStyle = DA.gold;
    g.fill();
  }

  function liveAccord(g, px, t, a) {
    g.globalCompositeOperation = "lighter";
    const gr = g.createLinearGradient(0, -90, 0, -3);
    gr.addColorStop(0, `rgba(251,231,176,${0.10 * a})`);
    gr.addColorStop(1, `rgba(251,231,176,${0.02 * a})`);
    poly(g, [[-1.2, -90], [1.2, -90], [8, -3], [-8, -3]]);
    g.fillStyle = gr;
    g.fill();
    g.globalCompositeOperation = "source-over";

    for (let i = 0; i < 6; i++) {
      const ph = (t * 0.15 + i / 6) % 1;
      const x = Math.sin(i * 2.3 + t * 0.5) * 4;
      const y = -3 - ph * 40;
      g.beginPath();
      g.arc(x, y, 0.22, 0, Math.PI * 2);
      g.fillStyle = DA.glow;
      g.globalAlpha = a * (1 - ph);
      g.fill();
    }
    g.globalAlpha = a;
  }

  LandArt.accord = { box: [-15, -58, 15, 2], top: 54, paint: paintAccord, live: liveAccord };
})();
