/* ===========================================================
   LAND ART — flat silhouette buildings for the Mainland factions:
   the Shattered College, LiberTech, Mordrial's Tower, the Sanctuary
   of the Luminous Path and the Gore-Engine Legion.

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

  /* ---------------- shared drawing helpers ---------------- */

  const { poly, litShade, rect } = Paint;

  // A ledge/cornice band from y (bottom) to y - h, spanning cx-hw..cx+hw.
  function band(g, cx, hw, y, h, pal) {
    const xSplit = cx + 0.3 * hw;
    litShade(g, () => poly(g, [[cx - hw, y], [cx + hw, y], [cx + hw, y - h], [cx - hw, y - h]]), xSplit, pal.lit, pal.shade);

    poly(g, [[cx - hw, y], [cx + hw, y], [cx + hw, y - 0.35 * h], [cx - hw, y - 0.35 * h]]);
    g.fillStyle = pal.shade;
    g.fill();
  }

  // A round-topped opening: rect plus semicircle cap.
  function arch(g, cx, yb, w, h, colour) {
    const r = w / 2;
    const yShoulder = yb - h + r;
    g.beginPath();
    g.moveTo(cx - r, yb);
    g.lineTo(cx - r, yShoulder);
    g.arc(cx, yShoulder, r, Math.PI, 0, false);
    g.lineTo(cx + r, yb);
    g.closePath();
    g.fillStyle = colour;
    g.fill();
  }

  function litRect(g, x0, y0, x1, y1, lit, shade) {
    litShade(g, () => poly(g, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]), x0 + 0.65 * (x1 - x0), lit, shade);
  }

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

  /* ===================== LIBERTECH ===================== */
  // a clean steel tower on a solid foundation, grown upward and sideways
  // with scrap annexes and held together in places by arcane work

  const LT = { lit: "#b8c1c3", shade: "#77848a", hole: "#1b2225", glass: "#9fd4ff", scrap: "#8a7d6b", scrapShade: "#574c3f", rust: "#a8552f", rustShade: "#6e3519", arcane: "#7fe0d0", arcaneShade: "#3f9c90" };
  const LT_SCRAP = { lit: LT.scrap, shade: LT.scrapShade };
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

  /* ===================== GORE ===================== */
  // the Gore-Engine Legion: four twisted iron spires with riveted
  // bands, spikes, struts, a turning gear and a red core

  const GL = { lit: "#5b5553", shade: "#2f2a2a", band: "#47403e", bandShade: "#231e1e", hole: "#120a0b", seam: "#ff4a2a" };
  // [baseX, height, baseHalfWidth, twistAmp, phase]
  const GL_SPIRES = [[-3, 58, 3.4, 1.4, 0.0], [-9, 44, 2.6, 1.0, 1.3], [4, 50, 3.0, -1.2, 2.6], [10, 36, 2.2, 0.8, 3.9]];

  function spireAt(sp, f) {
    const [baseX, height, baseHalfWidth, twistAmp, phase] = sp;
    return {
      x: baseX + Math.sin(f * 4 + phase) * twistAmp * f,
      y: -height * f,
      hw: baseHalfWidth * (1 - f) + 0.15
    };
  }

  function paintGore(g, px) {
    // 1. Spires, back to front
    for (const idx of [1, 3, 2, 0]) {
      const sp = GL_SPIRES[idx];

      for (let k = 0; k < 8; k++) {
        const f0 = k / 8, f1 = (k + 1) / 8;
        const p0 = spireAt(sp, f0), p1 = spireAt(sp, f1);
        const xSplit = p0.x + 0.3 * p0.hw;
        if (k === 7) {
          litShade(g, () => poly(g, [[p0.x - p0.hw, p0.y], [p0.x + p0.hw, p0.y], [p1.x, p1.y]]), xSplit, GL.lit, GL.shade);
        } else {
          litShade(g, () => poly(g, [[p0.x - p0.hw, p0.y], [p0.x + p0.hw, p0.y], [p1.x + p1.hw, p1.y], [p1.x - p1.hw, p1.y]]), xSplit, GL.lit, GL.shade);
        }
      }

      // Bands and spikes
      for (let k = 1; k <= 6; k++) {
        const p = spireAt(sp, k / 8);
        const xSplit = p.x + 0.3 * p.hw;
        litShade(g, () => poly(g, [[p.x - p.hw - 0.35, p.y], [p.x + p.hw + 0.35, p.y], [p.x + p.hw + 0.35, p.y - 0.6], [p.x - p.hw - 0.35, p.y - 0.6]]), xSplit, GL.band, GL.bandShade);

        if (k % 2 === 0) {
          poly(g, [[p.x - p.hw - 0.35, p.y - 0.6], [p.x - p.hw - 0.35, p.y], [p.x - p.hw - 1.5, p.y - 1.6]]);
          g.fillStyle = GL.band;
          g.fill();
          poly(g, [[p.x + p.hw + 0.35, p.y - 0.6], [p.x + p.hw + 0.35, p.y], [p.x + p.hw + 1.5, p.y - 1.6]]);
          g.fillStyle = GL.bandShade;
          g.fill();
        }
      }

      // Seams
      for (const k of [1, 3, 5]) {
        const f = (k + 0.5) / 8;
        const p = spireAt(sp, f);
        poly(g, [[p.x - 0.3 * p.hw - 0.15, p.y + 1], [p.x - 0.3 * p.hw + 0.15, p.y + 1], [p.x - 0.3 * p.hw + 0.15, p.y - 1], [p.x - 0.3 * p.hw - 0.15, p.y - 1]]);
        g.fillStyle = GL.seam;
        g.fill();
      }
    }

    // Struts between spires
    function strut(spA, fA, spB, fB) {
      const a = spireAt(spA, fA), b = spireAt(spB, fB);
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len * 0.35, ny = dx / len * 0.35;
      poly(g, [[a.x - nx, a.y - ny], [a.x + nx, a.y + ny], [b.x + nx, b.y + ny], [b.x - nx, b.y - ny]]);
      g.fillStyle = GL.bandShade;
      g.fill();
    }
    strut(GL_SPIRES[1], 0.25, GL_SPIRES[0], 0.35);
    strut(GL_SPIRES[2], 0.3, GL_SPIRES[3], 0.45);

    // 5. Foundation
    litShade(g, () => poly(g, [[-13, 0.6], [14, 0.6], [14, -2.2], [-13, -2.2]]), 0.5 + 0.3 * 13.5, GL.band, GL.bandShade);
    for (const x of [-8, 0, 8]) arch(g, x, 0, 1.6, 1.8, GL.hole);
  }

  const GL_SPARK_DX = [-1.2, -0.5, 0.3, 0.9, 1.5];

  function liveGore(g, px, t, a) {
    const sp0 = GL_SPIRES[0];

    // 1. Gear — teeth rotate, but the shade split stays fixed in world space
    const c = spireAt(sp0, 0.55);
    const gx = c.x - c.hw - 1.6, gy = c.y;
    g.save();
    g.translate(gx, gy);
    g.rotate(t * 0.6);
    g.beginPath();
    g.arc(0, 0, 1.8, 0, Math.PI * 2);
    for (let i = 0; i < 8; i++) {
      const th = i * Math.PI / 4;
      const th2 = th + 0.35;
      g.moveTo(Math.cos(th) * 1.6, Math.sin(th) * 1.6);
      g.lineTo(Math.cos(th) * 2.4, Math.sin(th) * 2.4);
      g.lineTo(Math.cos(th2) * 2.4, Math.sin(th2) * 2.4);
      g.lineTo(Math.cos(th2) * 1.6, Math.sin(th2) * 1.6);
    }
    g.closePath();
    g.fillStyle = GL.band;
    g.fill();
    g.clip();
    // undo the rotation/translation while keeping the clip, so the shade
    // fill happens in the un-rotated (world) coordinate frame
    g.rotate(-t * 0.6);
    g.translate(-gx, -gy);
    g.fillStyle = GL.bandShade;
    g.fillRect(gx + 0.54, -1000, 2000, 2000);
    g.restore();

    g.beginPath();
    g.arc(gx, gy, 0.55, 0, Math.PI * 2);
    g.fillStyle = GL.hole;
    g.fill();

    // 2. Core
    const p = spireAt(sp0, 1);
    const core = { x: p.x, y: p.y - 1.4 };
    const k = 1 + 0.15 * Math.sin(t * 3);

    g.globalCompositeOperation = "lighter";
    const gr = g.createRadialGradient(core.x, core.y, 0, core.x, core.y, 6 * k);
    gr.addColorStop(0, `rgba(255,70,40,${0.35 * a})`);
    gr.addColorStop(1, "rgba(255,70,40,0)");
    g.fillStyle = gr;
    g.fillRect(core.x - 6 * k, core.y - 6 * k, 12 * k, 12 * k);
    g.globalCompositeOperation = "source-over";

    g.beginPath();
    g.arc(core.x, core.y, 1.0 * k, 0, Math.PI * 2);
    g.fillStyle = GL.seam;
    g.globalAlpha = a;
    g.fill();

    // 3. Sparks
    for (let i = 0; i < 5; i++) {
      const ph = (t * 0.5 + i * 0.2) % 1;
      const x = core.x + GL_SPARK_DX[i] * 2 * ph;
      const y = core.y + ph * ph * 6;
      g.beginPath();
      g.arc(x, y, 0.14, 0, Math.PI * 2);
      g.fillStyle = "#ffb070";
      g.globalAlpha = a * (1 - ph);
      g.fill();
    }

    g.globalCompositeOperation = "source-over";
    g.globalAlpha = a;
  }

  LandArt.gore = { box: [-15, -62, 15, 2], top: 58, paint: paintGore, live: liveGore };
})();
