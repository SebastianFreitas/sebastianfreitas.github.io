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

  const GOLD = "245,208,107";   // game pages pass gold: true
  const LAMP = "228,221,198";   // bridge: cream (--lamp)
  const CORE = "255,245,220";
  const HIT  = 34;   // px radius for clicking one                 // px radius for a canvas hit test

  /* ---------- the bridge's mark: the HUD's gold line-work ----
     1 px hairlines, end ticks, a small white core; no glow blobs.
     Weights, alphas and the mono font follow js/hud/hud-c25.js. */
  const CREAM = "238,230,208";
  const DASH = [3, 5], NODASH = [];
  const TAU = Math.PI * 2;

  function tick(ctx, x, y, a, r0, r1) {
    const c = Math.cos(a), s = Math.sin(a);
    ctx.moveTo(x + c * r0, y + s * r0); ctx.lineTo(x + c * r1, y + s * r1);
  }

  function drawHud(ctx, x, y, o, A, t, blink) {
    const active = !!o.active, hover = !!o.hover, claimed = !!o.claimed;
    const k = (o.k || 1) * (hover ? 1.35 : 1) * (active ? 1.2 : 1);
    // one size for every beacon; a scene beacon is told apart by its turning pips
    const R = 16 * k, g = 0.5;   // g: half-gap angle from vertical
    const hot = hover || active;
    const ring = claimed ? CREAM : GOLD;
    const aRing = claimed ? (hot ? 1 : 0.85) : 1;
    const tickCol = claimed ? CREAM : (hover ? CORE : GOLD);
    const aTick = aRing;
    ctx.lineWidth = 1;
    ctx.lineCap = "butt";
    ctx.fillStyle = `rgba(4,6,10,${0.5 * A})`;   // a dark plate behind the whole beacon
    ctx.beginPath(); ctx.arc(x, y, R + 6, 0, TAU); ctx.fill();

    // the frame: two arcs ( ), gaps top and bottom, each end closed by a tick;
    // active closes to a full circle; plus the N / E / S / W ticks outside the ring
    const frame = () => {
      ctx.beginPath();
      if (active) {
        ctx.arc(x, y, R, 0, TAU);
      } else {
        ctx.arc(x, y, R, -Math.PI / 2 + g, Math.PI / 2 - g);
        ctx.moveTo(x + Math.cos(Math.PI / 2 + g) * R, y + Math.sin(Math.PI / 2 + g) * R);
        ctx.arc(x, y, R, Math.PI / 2 + g, 1.5 * Math.PI - g);
        for (let i = 0; i < 4; i++)   // the four arc ends: -90°+g, 90°-g, 90°+g, 270°-g
          tick(ctx, x, y, -Math.PI / 2 + Math.PI * ((i + 1) >> 1) + (i % 2 ? -g : g), R - 3, R + 3);
      }
      for (let i = 0; i < 4; i++) tick(ctx, x, y, i * Math.PI / 2, R + 4, R + 10);
    };
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = `rgba(${ring},${(claimed ? 0.08 : 0.14) * A})`;   // cheap halo
    ctx.lineWidth = 9; frame(); ctx.stroke();
    ctx.strokeStyle = `rgba(4,6,10,${0.8 * A})`;   // dark under-stroke for contrast
    ctx.lineWidth = 6; frame(); ctx.stroke();
    ctx.strokeStyle = `rgba(${ring},${aRing * A})`;
    ctx.lineWidth = 2.75; frame(); ctx.stroke();
    ctx.strokeStyle = `rgba(${tickCol},${aTick * A})`;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) tick(ctx, x, y, i * Math.PI / 2, R + 4, R + 10);
    ctx.stroke();
    ctx.strokeStyle = `rgba(${ring},${(claimed ? 0.4 : 0.55) * A})`;   // inner ring
    ctx.lineWidth = 1.25;
    ctx.beginPath(); ctx.arc(x, y, R - 5, 0, TAU); ctx.stroke();

    // a scene beacon: four gold diamonds turning round it
    if (o.cutscene) {
      const spin = window.Bridge && Bridge.reduced ? 0 : t * 0.6, d = 4.5, pr = R + 15;
      ctx.fillStyle = `rgba(${GOLD},${(claimed ? 0.8 : 1) * A})`;
      ctx.strokeStyle = `rgba(4,6,10,${0.8 * A})`; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = spin + Math.PI / 4 + i * Math.PI / 2;
        const px = x + Math.cos(a) * pr, py = y + Math.sin(a) * pr;
        ctx.moveTo(px + d, py); ctx.lineTo(px, py + d); ctx.lineTo(px - d, py); ctx.lineTo(px, py - d); ctx.closePath();
      }
      ctx.stroke(); ctx.fill();
    }
    ctx.lineWidth = 1.5;

    // active: a thin outer ring of dashes, turning slowly (still under reduced motion)
    if (active) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = `rgba(${GOLD},${0.85 * A})`;
      ctx.setLineDash(DASH);
      ctx.lineDashOffset = window.Bridge && Bridge.reduced ? 0 : -t * 5;
      ctx.beginPath(); ctx.arc(x, y, R + 22, 0, TAU); ctx.stroke();
      ctx.setLineDash(NODASH); ctx.lineDashOffset = 0;
    }

    // the core: only it pulses
    if (claimed) {
      ctx.strokeStyle = `rgba(${CORE},${0.85 * A})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.stroke();
    } else {
      const ca = active ? 1 : 0.75 + 0.25 * blink;
      ctx.fillStyle = `rgba(${CORE},${0.35 * ca * A})`;
      ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgba(${CORE},${ca * A})`;
      ctx.beginPath(); ctx.arc(x, y, 3.5, 0, TAU); ctx.fill();
    }

    // its name, on a short gold lead from the frame
    if (o.label && (hover || !claimed)) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = `rgba(${GOLD},${0.9 * A})`;
      ctx.beginPath(); ctx.moveTo(x, y + R + 12); ctx.lineTo(x, y + R + 18); ctx.stroke();
      const txt = o.label.toUpperCase();
      ctx.font = `700 12px "IBM Plex Mono", monospace`;
      ctx.letterSpacing = "1px";
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      const pw = ctx.measureText(txt).width + 20, px0 = x - pw / 2, py0 = y + R + 18;
      ctx.fillStyle = `rgba(4,6,10,${0.72 * A})`;
      ctx.fillRect(px0, py0, pw, 17);
      ctx.fillStyle = `rgba(${GOLD},${A})`;
      ctx.fillRect(px0, py0, 2, 17);
      ctx.fillStyle = `rgba(${CREAM},${(hover ? 1 : 0.95) * A})`;
      ctx.fillText(txt, x, py0 + 2.5);
      ctx.lineJoin = "miter"; ctx.lineCap = "butt";
      ctx.letterSpacing = "0px";
      ctx.textAlign = "start"; ctx.textBaseline = "alphabetic";
    }

    // the moment it's taken: eight gold ticks leaving, fading
    if (o.pop > 0.001) {
      const p = 1 - o.pop, r0 = R + 4 + p * 46 * k;
      ctx.strokeStyle = `rgba(${GOLD},${o.pop * 0.9})`;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) tick(ctx, x, y, i * Math.PI / 4 + Math.PI / 8, r0, r0 + 6);
      ctx.stroke();
    }
    ctx.lineCap = "butt"; ctx.lineJoin = "miter"; ctx.lineWidth = 1;
  }

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

    const LAMP_ = o.gold ? GOLD : LAMP;
    const active = !!o.active, hover = !!o.hover;
    const k = (o.k || 1) * (hover ? 1.35 : 1) * (active ? 1.2 : 1);

    // steady once you're reading it, a slow breathe otherwise
    const blink = active ? 1
      : 0.74 + 0.26 * Math.pow(0.5 + 0.5 * Math.sin(t * 0.9 + phase), 1.6);

    if (!o.gold) { drawHud(ctx, x, y, o, A, t, blink); return; }

    // a wide soft halo, so it separates from the scene behind it
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 38 * k);
    glow.addColorStop(0, `rgba(${LAMP_},${0.26 * blink * A})`);
    glow.addColorStop(0.45, `rgba(${LAMP_},${0.08 * blink * A})`);
    glow.addColorStop(1, `rgba(${LAMP_},0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(x - 42 * k, y - 42 * k, 84 * k, 84 * k);

    // a ring that never goes out, so it reads as a thing you can click
    ctx.strokeStyle = `rgba(${LAMP_},${(0.26 + 0.14 * blink) * A})`;
    ctx.lineWidth = 1;
    if (o.cutscene) {
      // a cutscene beacon: two thin arcs, ( ), gaps top and bottom,
      // standing clear outside the body (past the hover ring at 17)
      const R = 21 * k, g = 0.5;   // g: half-gap angle from vertical
      ctx.strokeStyle = `rgba(${LAMP_},${(0.6 + 0.2 * blink) * A})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(x, y, R, -Math.PI / 2 + g, Math.PI / 2 - g);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, R, Math.PI / 2 + g, 1.5 * Math.PI - g);
      ctx.stroke();
      ctx.lineWidth = 1;
    } else {
      ctx.beginPath(); ctx.arc(x, y, 11 * k, 0, 6.283); ctx.stroke();
    }

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
      ctx.strokeStyle = `rgba(${LAMP_},${(active ? 0.85 : 0.6) * A})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(x, y, 17 * k, 0, 6.283); ctx.stroke();
      ctx.lineWidth = 1;
    }
    // and its name, so it's obvious there's something to open
    if (o.label && (hover || !o.claimed)) {
      ctx.font = o.gold ? `500 ${Math.round(9.5 * k)}px "IBM Plex Mono", monospace`
        : `500 ${Math.round(11 * k)}px Oranienbaum, "IBM Plex Mono", serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillStyle = `rgba(228,221,198,${(hover ? 0.9 : 0.42) * A})`;
      ctx.fillText(o.label.toUpperCase(), x, y + 22 * k);
      ctx.textAlign = "start"; ctx.textBaseline = "alphabetic";
    }

    // the moment it's taken
    if (o.pop > 0.001) {
      const p = 1 - o.pop;                       // 0 at the instant of the click
      const ring = 10 + p * 90 * k;
      ctx.lineWidth = 2 * o.pop;
      ctx.strokeStyle = `rgba(${LAMP_},${o.pop * 0.45})`;
      ctx.beginPath(); ctx.arc(x, y, ring, 0, 6.283); ctx.stroke();

      ctx.lineWidth = 1.5 * o.pop;
      ctx.strokeStyle = `rgba(${CORE},${o.pop * 0.28})`;
      ctx.beginPath(); ctx.arc(x, y, ring * 0.55, 0, 6.283); ctx.stroke();

      ctx.lineWidth = 1;
    }
  }

  return { draw, HIT };
})();
