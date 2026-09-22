/* ===========================================================
   LAMP — one definition, one surface. (was beacon.js)

   Renamed off beacon.js because uBlock/EasyList and friends
   silently drop any http://…/beacon.js request. file:// was
   fine; the local server looked like the span had no marks
   and entry claims never grew a flying +1.

   A lamp marks something unfiled. Claiming it raises a level.
   It is painted into a canvas scene:

     Beacon.draw(ctx, x, y, opts)   the mark itself
     Beacon.HIT                     px radius for a hit test
   =========================================================== */

window.Beacon = (function () {

  const LAMP = "245,208,107";
  const CORE = "255,245,220";
  const HIT  = 34;   // px radius for clicking one                 // px radius for a canvas hit test

  /* ---------- canvas ----------------------------------------
     opts: { t, k, alpha, active, hover, claimed, xp, phase }
       t       seconds, for the pulse
       k       size multiplier
       alpha   overall fade, for entering/leaving the frame
  --------------------------------------------------------- */
  function draw(ctx, x, y, o) {
    const t      = Number.isFinite(o.t) ? o.t : 0;
    const phase  = Number.isFinite(o.phase) ? o.phase : 0;
    // a non-finite alpha must make a beacon invisible, never reach
    // addColorStop as rgba(...,NaN) — that throws and takes the frame
    const A = Number.isFinite(o.alpha) ? o.alpha : (o.alpha == null ? 1 : 0);
    if (!(A >= 0.02)) return;

    const active = !!o.active, hover = !!o.hover;
    const k = (o.k || 1) * (hover ? 1.35 : 1) * (active ? 1.2 : 1);

    // steady once you're reading it, a slow breathe otherwise
    const blink = active ? 1
      : 0.74 + 0.26 * Math.pow(0.5 + 0.5 * Math.sin(t * 0.9 + phase), 1.6);

    // a wide soft halo, so it separates from the scene behind it
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 38 * k);
    glow.addColorStop(0, `rgba(${LAMP},${0.26 * blink * A})`);
    glow.addColorStop(0.45, `rgba(${LAMP},${0.08 * blink * A})`);
    glow.addColorStop(1, `rgba(${LAMP},0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(x - 42 * k, y - 42 * k, 84 * k, 84 * k);

    // a ring that never goes out, so it reads as a thing you can click
    ctx.strokeStyle = `rgba(${LAMP},${(0.26 + 0.14 * blink) * A})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, 11 * k, 0, 6.283); ctx.stroke();

    const arm = (9 + 4 * blink) * k;
    ctx.strokeStyle = `rgba(${CORE},${0.55 * blink * A})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x - arm, y); ctx.lineTo(x + arm, y);
    ctx.moveTo(x, y - arm); ctx.lineTo(x, y + arm);
    ctx.stroke();
    ctx.lineWidth = 1;

    ctx.fillStyle = `rgba(${CORE},${(0.75 + 0.25 * blink) * A})`;
    ctx.beginPath(); ctx.arc(x, y, 2.7 * k, 0, 6.283); ctx.fill();

    if (active || hover) {
      ctx.strokeStyle = `rgba(${LAMP},${(active ? 0.85 : 0.6) * A})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(x, y, 17 * k, 0, 6.283); ctx.stroke();
      ctx.lineWidth = 1;
    }
    // and its name, so it's obvious there's something to open
    if (o.label && (hover || !o.claimed)) {
      ctx.font = `500 ${Math.round(9.5 * k)}px "IBM Plex Mono", monospace`;
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillStyle = `rgba(198,204,198,${(hover ? 0.9 : 0.42) * A})`;
      ctx.fillText(o.label.toUpperCase(), x, y + 22 * k);
      ctx.textAlign = "start"; ctx.textBaseline = "alphabetic";
    }

    // the moment it's taken
    if (o.pop > 0.001) {
      const p = 1 - o.pop;                       // 0 at the instant of the click
      const ring = 10 + p * 90 * k;
      ctx.lineWidth = 2 * o.pop;
      ctx.strokeStyle = `rgba(${LAMP},${o.pop * 0.45})`;
      ctx.beginPath(); ctx.arc(x, y, ring, 0, 6.283); ctx.stroke();

      ctx.lineWidth = 1.5 * o.pop;
      ctx.strokeStyle = `rgba(${CORE},${o.pop * 0.28})`;
      ctx.beginPath(); ctx.arc(x, y, ring * 0.55, 0, 6.283); ctx.stroke();

      ctx.lineWidth = 1;
    }

    // what it's worth, until it's been taken
    if (!o.claimed && o.xp) {
      ctx.font = `600 ${Math.round(13 * k)}px "IBM Plex Mono", monospace`;
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillStyle = `rgba(${LAMP},${0.6 * A})`;
      ctx.fillText("+" + o.xp, x + 20 * k, y - 15 * k);
      ctx.textAlign = "start"; ctx.textBaseline = "alphabetic";
    }
  }

  return { draw, HIT };
})();
