/* ===========================================================
   LAND ART — flat silhouette buildings for the Mainland factions:
   the Shattered College, LiberTech, the Dawn Palace, the Sanctuary
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

  function poly(g, pts) {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath();
  }

  // Fill a shape with `lit`, then hard-clip a shade region to x >= xSplit.
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
  // a salvage launch gantry with a patchwork starcraft docked nose-up

  const LT = { lit: "#b8c1c3", shade: "#77848a", hole: "#1b2225", cu: "#c98a4b", cuShade: "#8a5a2c", glass: "#9fd4ff" };

  function paintLibertech(g, px) {
    // 1. Pad
    litShade(g, () => poly(g, [[-12, 0.6], [12, 0.6], [12, -1.5], [-12, -1.5]]), 0.3 * 12, LT.lit, LT.shade);
    band(g, 0, 12.4, -1.5, 0.6, LT);

    // 2. Gantry legs
    poly(g, [[6.5, -1.5], [7.4, -1.5], [7.4, -50], [6.5, -50]]);
    g.fillStyle = LT.lit;
    g.fill();
    poly(g, [[10.6, -1.5], [11.5, -1.5], [11.5, -50], [10.6, -50]]);
    g.fillStyle = LT.shade;
    g.fill();

    for (let k = 0; k < 8; k++) {
      let y0 = -1.5 - 6 * k;
      let y1 = y0 - 6;
      if (y0 < -50) break;
      if (y1 < -50) y1 = -50;
      poly(g, [[7.4, y0], [7.4, y0 - 0.5], [10.6, y1], [10.6, y1 + 0.5]]);
      g.fillStyle = LT.shade;
      g.fill();
      poly(g, [[10.6, y0], [10.6, y0 - 0.5], [7.4, y1], [7.4, y1 + 0.5]]);
      g.fillStyle = LT.shade;
      g.fill();
    }

    litShade(g, () => poly(g, [[5, -50], [12.5, -50], [12.5, -51.2], [5, -51.2]]), 8.75 + 0.3 * 3.75, LT.lit, LT.shade);

    poly(g, [[-1, -51.2], [12.5, -51.2], [12.5, -52], [-1, -52]]);
    g.fillStyle = LT.shade;
    g.fill();

    poly(g, [[1.8, -20], [6.5, -20], [6.5, -20.5], [1.8, -20.5]]);
    g.fillStyle = LT.shade;
    g.fill();
    poly(g, [[1.8, -35], [6.5, -35], [6.5, -35.5], [1.8, -35.5]]);
    g.fillStyle = LT.shade;
    g.fill();

    // 3. Ship hull
    const hx = -2, hhw = 3.2;
    const xSplitHull = hx + 0.3 * hhw;
    for (let k = 0; k < 8; k++) {
      const yb = -6 - 5 * k;
      const yt = yb - 5;
      const cuPlate = (k === 1 || k === 4 || k === 6);
      const lit = cuPlate ? LT.cu : LT.lit;
      const shade = cuPlate ? LT.cuShade : LT.shade;
      litShade(g, () => poly(g, [[hx - hhw, yb], [hx + hhw, yb], [hx + hhw, yt], [hx - hhw, yt]]), xSplitHull, lit, shade);

      if (k < 7) {
        poly(g, [[-5.2, yt], [1.2, yt], [1.2, yt + 0.25], [-5.2, yt + 0.25]]);
        g.fillStyle = LT.hole;
        g.fill();
      }
    }

    // 4. Nose
    litShade(g, () => poly(g, [[-5.2, -46], [1.2, -46], [-2, -56]]), -2, LT.lit, LT.shade);

    // 5. Fins
    poly(g, [[-5.2, -6], [-5.2, -16], [-8.5, -3]]);
    g.fillStyle = LT.lit;
    g.fill();
    poly(g, [[1.2, -6], [1.2, -16], [4.5, -3]]);
    g.fillStyle = LT.shade;
    g.fill();

    poly(g, [[-4.4, -6], [0.4, -6], [1, -3], [-5, -3]]);
    g.fillStyle = LT.hole;
    g.fill();

    // 6. Portholes
    for (const y of [-20, -28, -36]) {
      g.beginPath();
      g.arc(-2.6, y, 0.75, 0, Math.PI * 2);
      g.fillStyle = LT.glass;
      g.fill();
    }
  }

  function liveLibertech(g, px, t, a) {
    // (a) blinking beacon
    g.fillStyle = "#ff5a48";
    g.globalAlpha = a * (Math.sin(t * 3) > 0 ? 1 : 0.25);
    g.beginPath();
    g.arc(12, -52.6, 0.45, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = a;

    // (b) guiding star
    g.globalCompositeOperation = "lighter";
    const gr = g.createRadialGradient(-2, -60, 0, -2, -60, 3.5);
    gr.addColorStop(0, `rgba(200,230,255,${0.5 * a})`);
    gr.addColorStop(1, "rgba(200,230,255,0)");
    g.fillStyle = gr;
    g.fillRect(-5.5, -63.5, 7, 7);

    g.globalCompositeOperation = "source-over";
    const s = 0.85 + 0.15 * Math.sin(t * 1.3);
    g.save();
    g.translate(-2, -60);
    g.scale(s, s);
    poly(g, [[0, -1.6], [0.3, -0.3], [1.6, 0], [0.3, 0.3], [0, 1.6], [-0.3, 0.3], [-1.6, 0], [-0.3, -0.3]]);
    g.fillStyle = "#eaf6ff";
    g.globalAlpha = a;
    g.fill();
    g.restore();
    g.globalAlpha = a;
  }

  LandArt.libertech = { box: [-14, -62, 14, 2], top: 58, paint: paintLibertech, live: liveLibertech };

  /* ===================== DAWN ===================== */
  // the Dawn Palace of the nobility: ivory palace, domed central tower
  // crowned by a sun, gold minarets

  const FD = { lit: "#eadcc0", shade: "#b39d78", hole: "#2b2217", roof: "#d6a649", roofShade: "#9a7128", sun: "#f4c766", glow: "#f7d58a" };

  function paintDawn(g, px) {
    // 1. Sun disc behind the crown
    g.beginPath();
    g.arc(0, -47, 5, 0, Math.PI * 2);
    g.fillStyle = FD.sun;
    g.fill();

    for (let i = 0; i <= 8; i++) {
      const th = Math.PI + i * Math.PI / 8;
      const perp = th + Math.PI / 2;
      const bx1 = Math.cos(th) * 5.4 + Math.cos(perp) * 0.35;
      const by1 = -47 + Math.sin(th) * 5.4 + Math.sin(perp) * 0.35;
      const bx2 = Math.cos(th) * 5.4 - Math.cos(perp) * 0.35;
      const by2 = -47 + Math.sin(th) * 5.4 - Math.sin(perp) * 0.35;
      const tx = Math.cos(th) * 8.2;
      const ty = -47 + Math.sin(th) * 8.2;
      poly(g, [[bx1, by1], [bx2, by2], [tx, ty]]);
      g.fillStyle = FD.sun;
      g.fill();
    }

    // 2. Terrace
    litShade(g, () => poly(g, [[-15, 0.6], [15, 0.6], [15, -2], [-15, -2]]), 0.3 * 15, FD.lit, FD.shade);
    band(g, 0, 15, -2, 0.5, FD);
    litShade(g, () => poly(g, [[-13, -2], [13, -2], [13, -4], [-13, -4]]), 0.3 * 13, FD.lit, FD.shade);
    band(g, 0, 13, -4, 0.5, FD);

    // 3. Hall
    litShade(g, () => poly(g, [[-11, -4], [11, -4], [11, -14], [-11, -14]]), 3.3, FD.lit, FD.shade);
    for (const x of [-9, -6, -3, 3, 6, 9]) arch(g, x, -5.5, 1.1, 5, FD.glow);
    arch(g, 0, -4, 2.2, 6.5, FD.hole);
    band(g, 0, 11.6, -14, 0.9, FD);

    // 4. Minarets
    for (const cx of [-8.5, 8.5]) {
      litShade(g, () => poly(g, [[cx - 1.4, -14.9], [cx + 1.4, -14.9], [cx + 1.4, -34], [cx - 1.4, -34]]), cx + 0.42, FD.lit, FD.shade);
      band(g, cx, 2.0, -30, 0.7, FD);
      arch(g, cx, -22, 0.6, 2, FD.hole);
      litShade(g, () => poly(g, [[cx - 1.7, -34], [cx + 1.7, -34], [cx, -41]]), cx, FD.roof, FD.roofShade);
    }

    // 5. Central tower
    litShade(g, () => poly(g, [[-4.5, -14.9], [4.5, -14.9], [4.5, -38], [-4.5, -38]]), 1.35, FD.lit, FD.shade);
    band(g, 0, 5.1, -26, 0.8, FD);
    band(g, 0, 5.1, -38, 0.8, FD);
    for (const x of [-1.3, 1.3]) {
      arch(g, x, -17.5, 0.9, 3.6, FD.glow);
      arch(g, x, -29, 0.9, 3.6, FD.glow);
    }

    // 6. Dome
    litShade(g, () => {
      g.beginPath();
      g.ellipse(0, -38.8, 4.5, 5, 0, Math.PI, 0, false);
      g.closePath();
    }, 1.35, FD.roof, FD.roofShade);
    litShade(g, () => poly(g, [[-0.45, -43.6], [0.45, -43.6], [0, -56]]), 0, FD.roof, FD.roofShade);
  }

  function liveDawn(g, px, t, a) {
    g.globalCompositeOperation = "lighter";
    const gr = g.createRadialGradient(0, -47, 0, 0, -47, 10);
    gr.addColorStop(0, `rgba(247,213,138,${(0.16 + 0.06 * Math.sin(t * 0.9)) * a})`);
    gr.addColorStop(1, "rgba(247,213,138,0)");
    g.fillStyle = gr;
    g.fillRect(-10, -57, 20, 20);
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = a;
  }

  LandArt.dawn = { box: [-16, -60, 16, 2], top: 56, paint: paintDawn, live: liveDawn };

  /* ===================== ACCORD ===================== */
  // the Sanctuary of the Luminous Path: white colonnaded basilica,
  // slender bell tower with a gold halo, light falling from above

  const DA = { lit: "#eeebe2", shade: "#aeaa9c", hole: "#2d2c28", gold: "#e8c46a", goldShade: "#b08f3e", glow: "#fbe7b0" };

  function paintAccord(g, px) {
    // 1. Bell tower (behind the hall)
    litShade(g, () => poly(g, [[-2.6, -13], [2.6, -13], [2.6, -40], [-2.6, -40]]), 0.78, DA.lit, DA.shade);
    band(g, 0, 3.1, -30, 0.7, DA);
    band(g, 0, 3.1, -40, 0.7, DA);
    arch(g, 0, -34, 1.8, 4, DA.hole);
    litShade(g, () => poly(g, [[-2.2, -40.7], [2.2, -40.7], [0, -54]]), 0, DA.lit, DA.shade);

    // 2. Halo
    g.save();
    g.beginPath();
    g.ellipse(0, -47.5, 3.6, 1.0, 0, 0, Math.PI * 2, false);
    g.ellipse(0, -47.5, 2.9, 0.6, 0, 0, Math.PI * 2, true);
    g.closePath();
    g.fillStyle = DA.gold;
    g.fill("evenodd");
    g.save();
    g.beginPath();
    g.ellipse(0, -47.5, 3.6, 1.0, 0, 0, Math.PI * 2, false);
    g.ellipse(0, -47.5, 2.9, 0.6, 0, 0, Math.PI * 2, true);
    g.closePath();
    g.clip("evenodd");
    g.fillStyle = DA.goldShade;
    g.fillRect(0.3 * 3.6, -1000, 2000, 2000);
    g.restore();
    g.restore();

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
