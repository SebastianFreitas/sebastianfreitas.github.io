/* ===========================================================
   BEACON — one definition, two surfaces.

   A beacon marks something unfiled. Claiming it raises a level.
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
  const HIT  = 26;                 // px radius for a canvas hit test

  /* ---------- canvas ----------------------------------------
     opts: { t, k, alpha, active, hover, claimed, xp, phase }
       t       seconds, for the pulse
       k       size multiplier
       alpha   overall fade, for entering/leaving the frame
  --------------------------------------------------------- */
  function draw(ctx, x, y, o) {
    const t      = o.t || 0;
    const phase  = o.phase || 0;
    const A      = o.alpha == null ? 1 : o.alpha;
    if (A < 0.02) return;

    const active = !!o.active, hover = !!o.hover;
    const k = (o.k || 1) * (hover ? 1.35 : 1) * (active ? 1.2 : 1);

    // steady once you're reading it, a slow flare otherwise
    const blink = active ? 1
      : 0.42 + 0.58 * Math.pow(0.5 + 0.5 * Math.sin(t * 1.15 + phase), 2.2);

    const glow = ctx.createRadialGradient(x, y, 0, x, y, 26 * k);
    glow.addColorStop(0, `rgba(${LAMP},${0.30 * blink * A})`);
    glow.addColorStop(1, `rgba(${LAMP},0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(x - 30 * k, y - 30 * k, 60 * k, 60 * k);

    const arm = (5 + 9 * blink) * k;
    ctx.strokeStyle = `rgba(${CORE},${0.55 * blink * A})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - arm, y); ctx.lineTo(x + arm, y);
    ctx.moveTo(x, y - arm); ctx.lineTo(x, y + arm);
    ctx.stroke();

    ctx.fillStyle = `rgba(${CORE},${(0.6 + 0.4 * blink) * A})`;
    ctx.beginPath(); ctx.arc(x, y, 1.9 * k, 0, 6.283); ctx.fill();

    if (active || hover) {
      ctx.strokeStyle = `rgba(${LAMP},${(active ? 0.7 : 0.4) * A})`;
      ctx.beginPath(); ctx.arc(x, y, 13 * k, 0, 6.283); ctx.stroke();
    }
    if (!active) {
      const ring = (t * 0.5 + phase * 0.2) % 1;
      ctx.strokeStyle = `rgba(${LAMP},${(1 - ring) * 0.20 * A})`;
      ctx.beginPath(); ctx.arc(x, y, 8 + ring * 22, 0, 6.283); ctx.stroke();
    }

    // what it's worth, until it's been taken
    if (!o.claimed && o.xp) {
      const bb = 0.5 + 0.5 * Math.sin(t * 2.1 + phase);
      ctx.font = `600 ${Math.round(11 * k)}px "IBM Plex Mono", monospace`;
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillStyle = `rgba(${LAMP},${(0.45 + 0.45 * bb) * A})`;
      ctx.fillText("+" + o.xp, x + 15 * k, y - 11 * k);
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

    const badge = document.createElement("span");
    badge.className = "bcn-xp";
    badge.textContent = "+" + xp;
    el.appendChild(badge);

    const claimed = () => window.XP && XP.has(id);
    const paint = () => el.classList.toggle("claimed", claimed());
    paint();

    el.addEventListener("click", ev => {
      if (el.tagName !== "A") ev.preventDefault();
      if (window.XP) {
        const r = el.getBoundingClientRect();
        XP.award(id, xp, label, r.left + r.width / 2, r.top + r.height / 2);
      }
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
