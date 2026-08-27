/* ===========================================================
   LAMP — one definition, two surfaces. (was beacon.js)

   Renamed off beacon.js because uBlock/EasyList and friends
   silently drop any http://…/beacon.js request. file:// was
   fine; the local server looked like the span had no marks
   and entry claims never grew a flying +1.

   A lamp marks something unfiled. Claiming it raises a level.
   It exists in two forms and both come from here:

     Beacon.draw(ctx, x, y, opts)   painted into a canvas scene
     Beacon.attach(el, opts)        any element becomes one

   Anything on any page carrying data-beacon is wired up
   automatically, so dropping one into a project page is markup
   only:

     <span data-beacon data-beacon-id="thing" data-xp="2"
           data-label="Something">Look at this</span>

   Requires xp.js.
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

    // steady once you're reading it, a slow flare otherwise
    const blink = active ? 1
      : 0.42 + 0.58 * Math.pow(0.5 + 0.5 * Math.sin(t * 1.15 + phase), 2.2);

    // a wide soft halo, so it separates from the scene behind it
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 38 * k);
    glow.addColorStop(0, `rgba(${LAMP},${0.46 * blink * A})`);
    glow.addColorStop(0.45, `rgba(${LAMP},${0.16 * blink * A})`);
    glow.addColorStop(1, `rgba(${LAMP},0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(x - 42 * k, y - 42 * k, 84 * k, 84 * k);

    // a ring that never goes out, so it reads as a thing you can click
    ctx.strokeStyle = `rgba(${LAMP},${(0.22 + 0.28 * blink) * A})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, 11 * k, 0, 6.283); ctx.stroke();

    const arm = (7 + 12 * blink) * k;
    ctx.strokeStyle = `rgba(${CORE},${0.8 * blink * A})`;
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
    if (!active) {
      const ring = (t * 0.5 + phase * 0.2) % 1;
      ctx.strokeStyle = `rgba(${LAMP},${(1 - ring) * 0.28 * A})`;
      ctx.beginPath(); ctx.arc(x, y, 10 + ring * 30, 0, 6.283); ctx.stroke();
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
      ctx.lineWidth = 3 * o.pop;
      ctx.strokeStyle = `rgba(${LAMP},${o.pop * 0.85})`;
      ctx.beginPath(); ctx.arc(x, y, ring, 0, 6.283); ctx.stroke();

      ctx.lineWidth = 1.5 * o.pop;
      ctx.strokeStyle = `rgba(${CORE},${o.pop * 0.5})`;
      ctx.beginPath(); ctx.arc(x, y, ring * 0.55, 0, 6.283); ctx.stroke();

      // shards thrown out of it
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * 6.283 + 0.4;
        const d0 = 8 + p * 54 * k, d1 = d0 + 10 * o.pop;
        ctx.strokeStyle = `rgba(${CORE},${o.pop * 0.7})`;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * d0, y + Math.sin(a) * d0);
        ctx.lineTo(x + Math.cos(a) * d1, y + Math.sin(a) * d1);
        ctx.stroke();
      }

      const fg = ctx.createRadialGradient(x, y, 0, x, y, 34 * k * (0.5 + p));
      fg.addColorStop(0, `rgba(255,248,225,${o.pop * 0.55})`);
      fg.addColorStop(1, "rgba(255,248,225,0)");
      ctx.fillStyle = fg;
      ctx.fillRect(x - 40 * k, y - 40 * k, 80 * k, 80 * k);
      ctx.lineWidth = 1;
    }

    // what it's worth, until it's been taken
    if (!o.claimed && o.xp) {
      const bb = 0.5 + 0.5 * Math.sin(t * 2.1 + phase);
      ctx.font = `600 ${Math.round(13 * k)}px "IBM Plex Mono", monospace`;
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillStyle = `rgba(${LAMP},${(0.45 + 0.45 * bb) * A})`;
      ctx.fillText("+" + o.xp, x + 20 * k, y - 15 * k);
      ctx.textAlign = "start"; ctx.textBaseline = "alphabetic";
    }
  }

  /* ---------- DOM ---------- */
  const VISUAL =
    '<span class="bcn-mark" aria-hidden="true">' +
      '<i class="bcn-arm"></i><i class="bcn-arm"></i>' +
      '<i class="bcn-core"></i><i class="bcn-ring"></i>' +
    '</span>';

  function attach(el, opts) {
    if (!el || el.dataset.bcnReady) return el;
    el.dataset.bcnReady = "1";

    const id    = opts.id || el.dataset.beaconId || el.id || ("bcn-" + Math.random().toString(36).slice(2));
    const xp    = opts.xp != null ? opts.xp : parseInt(el.dataset.xp || "1", 10);
    const label = opts.label || el.dataset.label || "";
    const onClaim = opts.onClaim;

    el.classList.add("bcn");
    if (!el.querySelector(".bcn-mark")) el.insertAdjacentHTML("afterbegin", VISUAL);

    let badge = el.querySelector(".bcn-xp");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "bcn-xp";
      el.appendChild(badge);
    }
    badge.textContent = "+" + xp;

    const claimed = () => window.XP && XP.has(id);
    const paint = () => el.classList.toggle("claimed", claimed());
    paint();

    el.addEventListener("click", ev => {
      if (el.tagName !== "A") ev.preventDefault();
      if (window.XP) {
        const r = el.getBoundingClientRect();
        XP.award(id, xp, label, r.left + r.width / 2, r.top + r.height / 2);
      }
      el.classList.remove("claiming");
      void el.offsetWidth;
      el.classList.add("claiming");
      setTimeout(() => el.classList.remove("claiming"), 750);
      paint();
      if (onClaim) onClaim();
    });

    document.addEventListener("xp:award", e => { if (e.detail.id === id) paint(); });
    return el;
  }

  function create(opts) {
    const el = document.createElement("button");
    el.type = "button";
    if (opts.text) {
      const s = document.createElement("span");
      s.className = "bcn-lbl"; s.textContent = opts.text;
      el.appendChild(s);
    }
    attach(el, opts);
    return el;
  }

  /* wire anything declared in markup */
  function scan(root) {
    (root || document).querySelectorAll("[data-beacon]").forEach(el => attach(el, {}));
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", () => scan());
  else scan();

  return { draw, attach, create, scan, HIT };
})();
