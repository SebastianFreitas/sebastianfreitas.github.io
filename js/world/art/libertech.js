/* ===========================================================
   LIBERTECH — a clean steel tower on a solid foundation, grown
   upward and sideways with scrap annexes and held together in
   places by arcane work.

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
  const { band, litRect } = LandKit;

  /* ===================== LIBERTECH ===================== */
  // a clean steel tower on a solid foundation, grown upward and sideways
  // with scrap annexes and held together in places by arcane work

  const LT = { lit: "#b8c1c3", shade: "#77848a", hole: "#1b2225", glass: "#9fd4ff", scrap: "#8a7d6b", scrapShade: "#574c3f", rust: "#a8552f", rustShade: "#6e3519", arcane: "#7fe0d0", arcaneShade: "#3f9c90" };
  const LT_ARC = { lit: LT.arcane, shade: LT.arcaneShade };
  function coreHw(y) { return 5.5 - ((-y) - 2.6) / 31.4; }

  function paintLibertech(g, px) {
    // 1. Foundation
    litRect(g, -9, 0.6, 9, -2, LT.lit, LT.shade);
    band(g, 0, 9.4, -2, 0.6, LT);

    // 2. Core shaft
    litShade(g, () => poly(g, [[-5.5, -2.6], [5.5, -2.6], [4.5, -34], [-4.5, -34]]), 1.65, LT.lit, LT.shade);

    // 3. Core window strips
    for (let y = -5; y >= -32; y -= 3) {
      const hw = coreHw(y) - 0.8;
      rect(g, -hw, y, hw, y - 0.35, LT.hole);
    }

    // 4. Arcane glyph band on the core
    band(g, 0, coreHw(-20) + 0.3, -20, 0.7, LT_ARC);

    // 5. Upper core (asymmetric crown)
    litShade(g, () => poly(g, [[-4.5, -34], [4.5, -34], [4.5, -44], [1, -50], [-4.5, -50]]), 1.35, LT.lit, LT.shade);
    band(g, 0, 5, -34, 0.7, LT);
    rect(g, -3.5, -40, 3.5, -43, LT.glass);
    rect(g, 1.35, -40, 3.5, -43, "#6f9fc2");

    // 6. Landing pad cantilever (left)
    poly(g, [[-4.5, -40], [-4.5, -44], [-9, -44]]);
    g.fillStyle = LT.shade;
    g.fill();
    litRect(g, -11, -44, -4.5, -45, LT.lit, LT.shade);

    // 7. Scrap shack, lower left
    litRect(g, -11, -6, -5.3, -11, LT.scrap, LT.scrapShade);
    rect(g, -9.5, -7.5, -8, -9, LT.hole);
    litShade(g, () => poly(g, [[-11.5, -11], [-5.3, -11], [-5.3, -13]]), -7.2, LT.rust, LT.rustShade);
    rect(g, -10.8, -2.6, -10.2, -6, LT.scrapShade);

    // 8. Rust container, right middle
    poly(g, [[5.2, -8], [5.7, -8], [9.6, -12], [9.1, -12]]);
    g.fillStyle = LT.scrapShade;
    g.fill();
    poly(g, [[5.1, -10], [5.6, -10], [7, -12], [6.5, -12]]);
    g.fillStyle = LT.scrapShade;
    g.fill();
    litRect(g, 5, -12, 10.5, -18.5, LT.rust, LT.rustShade);
    for (const x of [6.2, 7.4, 8.6, 9.8]) rect(g, x, -12.6, x + 0.2, -17.9, LT.hole);

    // 9. Arcane pillar holding up the upper box
    rect(g, 4.6, -24.3, 9.5, -24.9, LT.shade);
    litRect(g, 7.7, -18.5, 8.3, -26.5, LT.arcane, LT.arcaneShade);
    poly(g, [[6.9, -21.5], [7.2, -22.1], [6.9, -22.7], [6.6, -22.1]]);
    g.fillStyle = LT.arcane;
    g.fill();
    poly(g, [[9.1, -23.5], [9.4, -24.1], [9.1, -24.7], [8.8, -24.1]]);
    g.fillStyle = LT.arcane;
    g.fill();

    // 10. Crooked scrap box, upper right
    g.save();
    g.translate(8, -26.5);
    g.rotate(0.08);
    litRect(g, -2.5, 0, 2.5, -5, LT.scrap, LT.scrapShade);
    rect(g, -1.6, -1.4, -0.4, -2.8, LT.hole);
    rect(g, 0.6, -1.4, 1.8, -2.8, LT.hole);
    g.restore();

    // 11. Scaffold stacked on the crown
    rect(g, 2, -47, 2.6, -60, LT.shade);
    rect(g, 1, -53, 3.6, -53.4, LT.shade);
    rect(g, 1, -56, 3.6, -56.4, LT.shade);
    litRect(g, -4, -50, -0.5, -53, LT.scrap, LT.scrapShade);
    g.save();
    g.translate(-2.2, -53);
    g.rotate(-0.4);
    litShade(g, () => {
      g.beginPath();
      g.ellipse(0, 0, 2, 1.2, 0, Math.PI, 0, false);
      g.closePath();
    }, 0.6, LT.lit, LT.shade);
    g.restore();
  }

  function liveLibertech(g, px, t, a) {
    // (a) blinking beacon on mast top
    g.globalAlpha = a * (Math.sin(t * 3) > 0 ? 1 : 0.25);
    g.fillStyle = "#ff5a48";
    g.beginPath();
    g.arc(2.3, -60.6, 0.45, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = a;

    // (b) floating arcane crystal left of the core, bobbing
    const bob = 0.5 * Math.sin(t * 1.4);
    litShade(g, () => poly(g, [[-7.5, -34 + bob], [-6, -30 + bob], [-7.5, -26 + bob], [-9, -30 + bob]]), -7.5, LT.arcane, LT.arcaneShade);

    // (c) glyph flicker
    g.globalAlpha = a * (0.25 + 0.2 * Math.sin(t * 2.3));
    rect(g, -coreHw(-20) - 0.3, -20, coreHw(-20) + 0.3, -20.7, "#e6fffa");
    g.globalAlpha = a;

    g.globalCompositeOperation = "source-over";
    g.globalAlpha = a;
  }

  LandArt.libertech = { box: [-13, -63, 13, 2], top: 60, paint: paintLibertech, live: liveLibertech };
})();
