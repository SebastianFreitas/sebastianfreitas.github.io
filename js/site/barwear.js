/* barwear.js: glass breaks and a catch-light on the top bar's bottom edge (wide screens, 1200 px and up, fine pointer).
   The plate (.topbar::before) keeps its drawn wave; a few small breaks bite up into it in the two empty stretches
   (red tick to rank slot, rank slot to the first nav button), 24 px clear of each. The outline goes to the CSS variable
   --bar-cut (the stylesheet's polygon is the fallback), and a 1 px cream hairline runs just inside it. */
(function () {
  "use strict";
  const WIDE = "(min-width: 1200px) and (pointer: fine)";
  const NS = "http://www.w3.org/2000/svg";
  const CLEAR = 24, GAP = 12, RANK_HALF = 230, LIT_GAP = 20, LIT_ALPHA = 0.16, LIT_FADE = 40;
  /* the wave of the .topbar::before polygon: x fraction, rise above the bottom edge in px */
  const WAVE = [[0, 1], [0.12, 4], [0.22, 1], [0.37, 4], [0.49, 0], [0.60, 2], [0.73, 3], [0.88, 0], [1, 3]];
  /* the damage history, set by hand: [dx, depth] from the wave. Left stretch: one compound hit (three bites in one hollow,
     one steep wall, one wall in two facets) with a tiny related nick beside it. Right stretch: one worn stretch (edge 2 to
     3 px low, sloping in, ending on a sharp step, one knock in its floor) and a far hairline nick. */
  const HIT = { kind: "compound hit", w: 54, p: [[0, 0], [1, 4.5], [6, 5.5], [10, 3.2], [14, 4.6], [19, 7], [23, 4.8], [27, 5.6], [33, 4.2], [40, 2.8], [54, 0]] };
  const BITE = { kind: "single bite", w: 24, p: [[0, 0], [1, 4], [5, 5], [9, 7], [14, 4], [24, 0]] };
  const NICK = { kind: "tiny nick", w: 6, p: [[0, 0], [1, 2.5], [6, 0]] };
  const WORN = { kind: "worn stretch", w: 68, p: [[0, 0], [14, 2], [26, 2.5], [31, 2.2], [34, 3.4], [37, 5], [40, 3], [44, 2.6], [56, 3], [67.4, 2.5], [68, 0]] };
  const WORN_S = { kind: "worn stretch", w: 36, p: [[0, 0], [8, 2], [14, 2.4], [17, 3.6], [20, 5], [23, 3], [30, 2.6], [35.4, 2.5], [36, 0]] };
  const HAIR = { kind: "hairline nick", w: 4, p: [[0, 0], [1, 2], [4, 0]] };
  const LEFT_F = 0.33, RIGHT_F = 0.2, NICK_AT = 18, HAIR_FROM = 100;
  let raf = 0, info = null;

  function waveY(H, W, x) {
    for (let i = 1; i < WAVE.length; i++) {
      if (x <= WAVE[i][0] * W || i === WAVE.length - 1) {
        const a = WAVE[i - 1], b = WAVE[i], t = (x - a[0] * W) / ((b[0] - a[0]) * W || 1);
        return H - (a[1] + (b[1] - a[1]) * t);
      }
    }
    return H;
  }
  function lineY(pts, x) {
    for (let i = 1; i < pts.length; i++) {
      if (x <= pts[i][0]) { const a = pts[i - 1], b = pts[i], t = (x - a[0]) / ((b[0] - a[0]) || 1); return a[1] + (b[1] - a[1]) * t; }
    }
    return pts[pts.length - 1][1];
  }
  function clear(bar) {
    bar.style.removeProperty("--bar-cut");
    const sv = bar.querySelector(":scope > .bar-lit");
    if (sv) sv.remove();
    info = null;
  }
  function draw() {
    raf = 0;
    const bar = document.querySelector("header.topbar");
    if (!bar) return;
    if (!window.matchMedia(WIDE).matches) { clear(bar); return; }
    const wm = bar.querySelector(".wordmark"), slot = bar.querySelector(".xp-slot"), nav = bar.querySelector("nav");
    if (!wm || !slot || !nav) { clear(bar); return; }
    const br = bar.getBoundingClientRect(), W = bar.offsetWidth, H = bar.offsetHeight;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const tickW = parseFloat(getComputedStyle(wm, "::after").width) || 6;
    const wr = wm.getBoundingClientRect(), sr = slot.getBoundingClientRect(), nr = nav.getBoundingClientRect();
    const tickR = wr.right - br.left + 0.9 * rem + tickW, mid = sr.left - br.left + sr.width / 2;
    /* the rank box: a stable floor of RANK_HALF each side of the slot's centre, widened to the measured chip edges
       (its own left shift included) only if the chip is wider, so the breaks stay put while the rank text changes */
    const chip = slot.firstElementChild, cr = (chip || slot).getBoundingClientRect();
    const rankL = Math.min(mid - RANK_HALF, sr.left - br.left, cr.left - br.left), rankR = Math.max(mid + RANK_HALF, sr.right - br.left, cr.right - br.left);
    const navL = nr.left - br.left;
    const free = [[tickR + CLEAR, rankL - CLEAR], [rankR + CLEAR, navL - CLEAR]];
    /* the outline left to right: the wave vertices, with each break's points in place of the vertices it covers.
       Two breaks in a stretch keep GAP of straight edge between them; a stretch too short for both gets one, or none */
    const cuts = [], at = [];
    const put = function (b, x0, s) {
      cuts.push({ x0: x0, w: b.w, p: b.p });
      const d = Math.max.apply(null, b.p.map(function (q) { return q[1]; }));
      at.push({ kind: b.kind, x: Math.round(x0), w: b.w, depth: d, toTick: Math.round(x0 - tickR), toRank: Math.round(s === 0 ? rankL - (x0 + b.w) : x0 - rankR), toNav: Math.round(navL - (x0 + b.w)) });
    };
    /* left: hit + nick, else the hit, else its deepest bite, else nothing */
    let a = free[0][0], z = free[0][1], len = z - a, x0;
    if (len >= HIT.w + NICK_AT + NICK.w) { x0 = a + LEFT_F * (len - HIT.w - NICK_AT - NICK.w); put(HIT, x0, 0); put(NICK, x0 + HIT.w + NICK_AT, 0); }
    else if (len >= HIT.w) put(HIT, a + LEFT_F * (len - HIT.w), 0);
    else if (len >= BITE.w) put(BITE, a + LEFT_F * (len - BITE.w), 0);
    /* right: worn stretch near the rank, a far hairline only in a long run, shorter worn stretch, else nothing */
    a = free[1][0]; z = free[1][1]; len = z - a;
    if (len >= WORN.w) {
      put(WORN, a + RIGHT_F * (len - WORN.w), 1);
      if (len >= WORN.w + HAIR_FROM) put(HAIR, z - 30 - HAIR.w, 1);
    } else if (len >= WORN_S.w) put(WORN_S, a + RIGHT_F * (len - WORN_S.w), 1);
    const out = [];
    WAVE.forEach(function (v) {
      const x = v[0] * W;
      if (!cuts.some(function (c) { return x > c.x0 && x < c.x0 + c.w; })) out.push([x, H - v[1]]);
    });
    cuts.forEach(function (c) {
      c.p.forEach(function (q) { const x = c.x0 + q[0]; out.push([x, waveY(H, W, x) - q[1]]); });
    });
    out.sort(function (a, b) { return a[0] - b[0]; });
    const poly = [[0, 0], [W, 0]].concat(out.slice().reverse());
    bar.style.setProperty("--bar-cut", "polygon(" + poly.map(function (p) { return p[0].toFixed(1) + "px " + p[1].toFixed(1) + "px"; }).join(", ") + ")");
    /* the catch-light: from 20 px right of the tick to the right end, fading over 40 px at each end */
    const xs = tickR + LIT_GAP;
    const lit = [[xs, lineY(out, xs)]].concat(out.filter(function (p) { return p[0] > xs; })).map(function (p) { return [p[0], p[1] - 0.5]; });
    let sv = bar.querySelector(":scope > .bar-lit");
    if (!sv) {
      sv = document.createElementNS(NS, "svg"); sv.setAttribute("class", "bar-lit"); sv.setAttribute("aria-hidden", "true");
      sv.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:0";
      sv.innerHTML = '<defs><linearGradient id="bar-lit-g" gradientUnits="userSpaceOnUse" y1="0" y2="0"><stop offset="0" stop-opacity="0"/><stop stop-opacity="1"/><stop stop-opacity="1"/><stop offset="1" stop-opacity="0"/></linearGradient></defs><polyline fill="none" stroke-linejoin="round" stroke="url(#bar-lit-g)" stroke-width="1"/>';
      bar.appendChild(sv);
    }
    const gr = sv.querySelector("linearGradient"), st = gr.querySelectorAll("stop"), f = Math.min(0.5, LIT_FADE / ((W - xs) || 1));
    gr.setAttribute("x1", xs); gr.setAttribute("x2", W);
    st[1].setAttribute("offset", f); st[2].setAttribute("offset", 1 - f);
    for (let j = 0; j < st.length; j++) st[j].style.stopColor = "var(--type-cream)";
    const pl = sv.querySelector("polyline");
    pl.setAttribute("points", lit.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "));
    pl.setAttribute("stroke-opacity", LIT_ALPHA);
    info = { breaks: at, free: free.map(function (r) { return r.map(Math.round); }), tickR: Math.round(tickR), rankL: Math.round(rankL), rankR: Math.round(rankR), navL: Math.round(navL), litFrom: Math.round(xs) };
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(draw); }

  window.addEventListener("resize", schedule);
  window.addEventListener("load", schedule);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  schedule();
  /* a rank text change re-places the breaks only if the chip now needs more than the floor (draw is otherwise idempotent) */
  const sl = document.querySelector("header.topbar .xp-slot");
  if (sl && window.MutationObserver) new MutationObserver(schedule).observe(sl, { childList: true, characterData: true, subtree: true });
  window.BarWear = { apply: schedule, info: function () { return info; } };
})();
