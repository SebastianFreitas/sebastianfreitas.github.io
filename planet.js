/* ===========================================================
   PLANET — placeholder worlds for the Game Dev sector.

   Same shape as lamp.js (one draw call, canvas only): the ship
   discovers these by flying to them, same as a beacon, but they
   read as bodies in space rather than lamps on a span.

     Planet.draw(ctx, x, y, opts)

   opts: { t, phase, alpha, active, hover, visited, theme, size,
           pop, label }
   =========================================================== */

window.Planet = (function () {

  const THEMES = {
    zero:       { core: ["#173323", "#070d0a"], rim: "120,255,150", ring: "90,140,110", band: "40,70,50",  hasRing: false },
    voidscape:  { core: ["#2c1440", "#100819"], rim: "196,132,240", ring: "150,96,190", band: "70,42,96",  hasRing: false },
    heavylight: { core: ["#f7d97a", "#8a651f"], rim: "255,247,214", ring: "245,208,107", band: "205,168,90", hasRing: true  },
    conclusus:  { core: ["#a9cdd4", "#28454c"], rim: "224,240,240", ring: "143,176,184", band: "245,208,107", hasRing: true  },
  };

  function draw(ctx, x, y, o) {
    const t     = Number.isFinite(o.t) ? o.t : 0;
    const phase = Number.isFinite(o.phase) ? o.phase : 0;
    const A     = Number.isFinite(o.alpha) ? o.alpha : (o.alpha == null ? 1 : 0);
    if (!(A >= 0.02)) return;

    const th = THEMES[o.theme] || THEMES.zero;
    const active = !!o.active, hover = !!o.hover;
    const size = o.size || 1;
    const R = 16 * size * (hover ? 1.12 : 1) * (active ? 1.18 : 1);
    const yy = y + Math.sin(t * 0.5 + phase) * 3;

    // halo, so it separates from the starfield behind it
    const glow = ctx.createRadialGradient(x, yy, 0, x, yy, R * 3.4);
    glow.addColorStop(0, `rgba(${th.rim},${0.26 * A})`);
    glow.addColorStop(0.5, `rgba(${th.ring},${0.10 * A})`);
    glow.addColorStop(1, `rgba(${th.ring},0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(x - R * 3.4, yy - R * 3.4, R * 6.8, R * 6.8);

    if (th.hasRing) {
      ctx.save();
      ctx.translate(x, yy); ctx.rotate(-0.32); ctx.scale(1, 0.32);
      ctx.strokeStyle = `rgba(${th.ring},${0.4 * A})`;
      ctx.lineWidth = 2.6 * size;
      ctx.beginPath(); ctx.arc(0, 0, R * 1.9, 0, 6.283); ctx.stroke();
      ctx.restore();
    }

    // body
    const bodyG = ctx.createRadialGradient(x - R * 0.35, yy - R * 0.35, R * 0.1, x, yy, R);
    bodyG.addColorStop(0, th.core[0]); bodyG.addColorStop(1, th.core[1]);
    ctx.globalAlpha = A;
    ctx.fillStyle = bodyG;
    ctx.beginPath(); ctx.arc(x, yy, R, 0, 6.283); ctx.fill();

    // night side + bands, clipped to the disc
    ctx.save();
    ctx.beginPath(); ctx.arc(x, yy, R, 0, 6.283); ctx.clip();
    ctx.fillStyle = "rgba(4,6,8,0.4)";
    ctx.beginPath(); ctx.arc(x + R * 0.34, yy, R * 0.95, 0, 6.283); ctx.fill();
    ctx.strokeStyle = `rgba(${th.band},0.3)`;
    ctx.lineWidth = R * 0.18;
    ctx.beginPath(); ctx.ellipse(x, yy - R * 0.42, R * 1.15, R * 0.3, -0.22, 0, 6.283); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, yy + R * 0.5,  R * 1.15, R * 0.3, -0.22, 0, 6.283); ctx.stroke();
    ctx.restore();

    // rim light
    ctx.strokeStyle = `rgba(${th.rim},${0.55 * A})`;
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(x, yy, R, 0, 6.283); ctx.stroke();
    ctx.globalAlpha = 1;

    if (active || hover) {
      ctx.strokeStyle = `rgba(${th.rim},${(active ? 0.85 : 0.6) * A})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(x, yy, R * 1.7, 0, 6.283); ctx.stroke();
    }
    if (!active) {
      const pulse = (t * 0.4 + phase * 0.2) % 1;
      ctx.strokeStyle = `rgba(${th.rim},${(1 - pulse) * 0.22 * A})`;
      ctx.beginPath(); ctx.arc(x, yy, R + pulse * 34, 0, 6.283); ctx.stroke();
    }

    if (o.label && (hover || active || !o.visited)) {
      ctx.font = `500 ${Math.round(10 * size)}px "IBM Plex Mono", monospace`;
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillStyle = `rgba(198,204,198,${(hover ? 0.92 : 0.48) * A})`;
      ctx.fillText(o.label.toUpperCase(), x, yy + R * 1.85);
      ctx.textAlign = "start"; ctx.textBaseline = "alphabetic";
    }

    // the moment it's reached
    if (o.pop > 0.001) {
      const p = 1 - o.pop;
      const ring = R + p * 90 * size;
      ctx.lineWidth = 3 * o.pop;
      ctx.strokeStyle = `rgba(${th.rim},${o.pop * 0.85})`;
      ctx.beginPath(); ctx.arc(x, yy, ring, 0, 6.283); ctx.stroke();
      ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * 6.283 + 0.3;
        const d0 = R + p * 54 * size, d1 = d0 + 10 * o.pop;
        ctx.strokeStyle = `rgba(255,255,255,${o.pop * 0.6})`;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * d0, yy + Math.sin(a) * d0);
        ctx.lineTo(x + Math.cos(a) * d1, yy + Math.sin(a) * d1);
        ctx.stroke();
      }
    }
  }

  return { draw };
})();
