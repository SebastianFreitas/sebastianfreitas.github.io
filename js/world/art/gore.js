/* ===========================================================
   GORE — the Gore-Engine Legion: four twisted iron spires with
   riveted bands, spikes, struts, a turning gear and a red core.

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
  const { arch } = LandKit;

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
