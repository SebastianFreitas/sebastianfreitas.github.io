/* ===========================================================
   SHAPES — torn paper, rough slabs, made from numbers.

   Shapes.polygon(opts) gives a CSS polygon(...) in percentages.
   Same inputs, same shape. Every input has a default:

     seed     number or string
     points   rough points per edge        [top, right, bottom, left]
     rough    how far each point strays    [t, r, b, l], % (0 = straight)
     notches  notches per edge             [t, r, b, l]
     notchDepth  [min, max] %    notchWidth  [min, max] % of the edge
     chamfer  cut per corner               [tl, tr, br, bl], %
     inset    most any jag may cut in, %

   Shapes.styles holds named presets (torn, slab). Shapes.apply(root)
   sets --shape on every [data-shape="<style>"] element; optional
   data-shape-seed and data-shape-<input> ("3,2,3,2" lists, "2-5"
   ranges). CSS: clip-path: var(--shape, <old polygon>).
   Made once per element, never per frame.
   =========================================================== */

(function () {
  function hash(s) {
    s = String(s);
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    let a = typeof seed === "number" ? (seed >>> 0) : hash(seed);
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const styles = {
    /* the top-bar tab paper */
    torn: {
      points: [4, 4, 4, 4], rough: [4, 4, 4, 4], notches: [1, 0, 1, 0],
      notchDepth: [2, 3], notchWidth: [6, 9], chamfer: [8, 0, 0, 0], inset: 9
    },
    /* the black slabs: rough top and bottom, straight sides */
    slab: {
      points: [5, 0, 5, 0], rough: [6, 0, 6, 0], notches: [0, 0, 0, 0],
      notchDepth: [2, 4], notchWidth: [4, 8], chamfer: [0, 0, 0, 0], inset: 8
    }
  };
  const BASE = {
    seed: 1, points: [3, 3, 3, 3], rough: [3, 3, 3, 3], notches: [0, 0, 0, 0],
    notchDepth: [2, 4], notchWidth: [4, 8], chamfer: [0, 0, 0, 0], inset: 6
  };

  function four(v) { return Array.isArray(v) ? [v[0], v[1], v[2], v[3]] : [v, v, v, v]; }
  function pair(v) { return Array.isArray(v) ? v : [v, v]; }
  function clamp(v) { return Math.max(0, Math.min(100, v)); }
  function num(n) { return +clamp(n).toFixed(1); }

  function polygon(opts) {
    const o = Object.assign({}, BASE, opts || {});
    const rand = rng(o.seed);
    const pts = four(o.points), rough = four(o.rough), notches = four(o.notches), ch = four(o.chamfer);
    /* chamfer along y per corner; defaults to the x amount (px-sized cuts on a wide box differ) */
    const chy = o.chamferY !== undefined ? four(o.chamferY) : ch;
    const along = function (e, c) { return e % 2 === 0 ? ch[c] : chy[c]; };
    const nd = pair(o.notchDepth), nw = pair(o.notchWidth), inset = o.inset;
    const corners = [[0, 0], [100, 0], [100, 100], [0, 100]];
    /* inward normal per edge: top, right, bottom, left */
    const normal = [[0, 1], [-1, 0], [0, -1], [1, 0]];
    const out = [];

    for (let e = 0; e < 4; e++) {
      const a = corners[e], b = corners[(e + 1) % 4];
      const dx = b[0] - a[0] > 0 ? 1 : b[0] - a[0] < 0 ? -1 : 0;
      const dy = b[1] - a[1] > 0 ? 1 : b[1] - a[1] < 0 ? -1 : 0;
      /* start and end along the edge, in %, after the corner chamfers */
      const s0 = along(e, e), s1 = 100 - along(e, (e + 1) % 4);
      const n = normal[e];
      const at = function (t, off) {
        return [a[0] + dx * t + n[0] * off, a[1] + dy * t + n[1] * off];
      };
      const items = [];

      /* notches first, evenly spread with a little jitter, so rough points can avoid them */
      const spans = [];
      const nc = Math.round(notches[e]);
      for (let k = 0; k < nc; k++) {
        const w = nw[0] + rand() * (nw[1] - nw[0]);
        const d = Math.min(inset, nd[0] + rand() * (nd[1] - nd[0]));
        const slot = (s1 - s0) / nc;
        const c = s0 + slot * (k + 0.2 + rand() * 0.6);
        const lo = Math.max(s0, c - w / 2), hi = Math.min(s1, c + w / 2);
        spans.push([lo, hi]);
        items.push([lo, 0], [(lo + hi) / 2 - w * 0.1 + rand() * w * 0.2, d], [hi, 0]);
      }
      const np = Math.round(pts[e]);
      for (let k = 0; k < np && rough[e] > 0; k++) {
        const t = s0 + (s1 - s0) * ((k + 0.25 + rand() * 0.5) / np);
        const off = Math.min(inset, rand() * rough[e]);
        if (spans.some(function (s) { return t > s[0] - 1 && t < s[1] + 1; })) continue;
        items.push([t, off]);
      }
      items.sort(function (p, q) { return p[0] - q[0]; });

      /* the corner at the start of this edge (two points when chamfered) */
      if (along(e, e) > 0 || (e % 2 === 0 ? chy[e] : ch[e]) > 0) {
        const pe = (e + 3) % 4, pa = corners[pe];
        const pdx = a[0] - pa[0] > 0 ? 1 : a[0] - pa[0] < 0 ? -1 : 0;
        const pdy = a[1] - pa[1] > 0 ? 1 : a[1] - pa[1] < 0 ? -1 : 0;
        out.push([a[0] - pdx * (pe % 2 === 0 ? ch[e] : chy[e]), a[1] - pdy * (pe % 2 === 0 ? ch[e] : chy[e])]);
      } else {
        out.push([a[0], a[1]]);
      }
      if (s0 > 0) out.push(at(s0, 0));
      items.forEach(function (p) { out.push(at(p[0], p[1])); });
    }
    return "polygon(" + out.map(function (p) { return num(p[0]) + "% " + num(p[1]) + "%"; }).join(", ") + ")";
  }

  function list(s) {
    const p = String(s).split(",").map(parseFloat);
    return p.length === 1 ? p[0] : p;
  }
  function range(s) {
    const p = String(s).split(/[-,]/).map(parseFloat);
    return p.length === 1 ? p[0] : p;
  }
  const kinds = { points: list, rough: list, notches: list, chamfer: list, inset: parseFloat,
                  notchDepth: range, notchWidth: range, chamferY: list };

  let ro = null;
  function one(el, i) {
      const d = el.dataset;
      const opts = Object.assign({}, styles[d.shape] || {});
      Object.keys(kinds).forEach(function (k) {
        const v = d["shape" + k.charAt(0).toUpperCase() + k.slice(1)];
        if (v !== undefined && v !== "") opts[k] = kinds[k](v);
      });
      /* data-shape-tear="px": size the cut in px from the element's box, so a wide row gets small bites */
      const tear = parseFloat(d.shapeTear), W = el.offsetWidth, H = el.offsetHeight;
      if (tear > 0 && W > 0 && H > 0) {
        /* the hover tab paper in px: a point every ~25 px, a few px deep, chipped corners, notches every ~140 px */
        const ph = tear / H * 100, pw = tear / W * 100;
        const px = function (n, len) { return n / len * 100; };
        const nh = Math.max(1, Math.round(W / 140));
        opts.rough = [ph, pw, ph, pw];
        opts.inset = Math.max(ph, pw);
        opts.points = [Math.max(3, Math.round(W / 25)), Math.max(2, Math.round(H / 25)), Math.max(3, Math.round(W / 25)), Math.max(2, Math.round(H / 25))];
        opts.notches = [nh, 0, nh, 0];
        opts.notchDepth = [ph * 0.7, ph * 1.2];
        opts.notchWidth = [px(10, W), px(26, W)];
        opts.chamfer = [px(14, W), px(9, W), px(12, W), px(16, W)];
        opts.chamferY = [px(10, H), px(12, H), px(9, H), px(11, H)];
      }
      opts.seed = d.shapeSeed !== undefined ? d.shapeSeed : (opts.seed !== undefined ? opts.seed : i);
      el.style.setProperty("--shape", polygon(opts));
      /* a sized cut follows its box (observed first, so it runs before redlines reads the edge) */
      if (tear > 0 && window.ResizeObserver && !el._shapeRo) {
        if (!ro) ro = new ResizeObserver(function (es) { es.forEach(function (e) { if (e.target._shapeW !== e.target.offsetWidth || e.target._shapeH !== e.target.offsetHeight) one(e.target, 0); }); });
        el._shapeRo = true; ro.observe(el);
      }
      el._shapeW = W; el._shapeH = H;
  }
  function apply(root) {
    const els = (root || document).querySelectorAll("[data-shape]");
    for (let i = 0; i < els.length; i++) one(els[i], i);
  }

  /* the Experience + contact shape: one black quad (the owner's drawing, corners as box fractions) whose top edge
     takes the tilt of the last Work row's bottom edge (read from its ::before matrix) so the two stay parallel;
     a red line runs down the left edge from ~6% above its top. Phone: the long point becomes a mild slant. */
  function xpShape(el) {
    const row = document.querySelector(".work .obj:last-of-type");
    const NS = "http://www.w3.org/2000/svg";
    let red = el.querySelector(":scope > .xp-red");
    if (!red) {
      red = document.createElementNS(NS, "svg"); red.setAttribute("class", "xp-red"); red.setAttribute("aria-hidden", "true");
      red.appendChild(document.createElementNS(NS, "line")); el.appendChild(red);
    }
    function draw() {
      const W = el.offsetWidth, H = el.offsetHeight;
      if (!W || !H) return;
      let ang = 0;
      const m = row && /^matrix\(([^)]*)\)$/.exec(getComputedStyle(row, "::before").transform || "");
      if (m) { const v = m[1].split(",").map(parseFloat); ang = Math.atan2(v[1], v[0]); }
      const phone = window.matchMedia("(max-width: 640px)").matches;
      const x0 = 0.028 * W;
      const dy = Math.max(0, -Math.tan(ang)) * (W - x0);       /* top-left drop so the top edge matches the row's tilt */
      const by = phone ? 0.95 * H : 0.735 * H;                 /* bottom-left corner */
      const pts = phone ? [[x0, dy], [W, 0], [W, H], [0, by]] : [[x0, dy], [W, 0], [0.297 * W, H], [0, by]];
      /* worn top edge: a few small irregular bites eaten inward from it (fixed seed, spaced along the edge length) */
      const ex = W - x0, ey = -dy, len = Math.hypot(ex, ey), ux = ex / len, uy = ey / len;
      const rnd = rng("xp-wear"), bites = [];
      const at = function (u, off) { return [x0 + ux * u - uy * off, dy + uy * u + ux * off]; };
      const f = Math.max(1, Math.min(2.5, 1 + 1.5 * (W - 420) / 800)), fn = 1 + (f - 1) * 0.4;   /* bite scale: 1 on a phone, 2.5 on desktop */
      /* five bites at uneven spots (bunched toward the corners, long clean runs between): a deep chip or two, the rest hairline nicks */
      [[0.06, 1], [0.11, 0], [0.46, 0], [0.9, 1], [0.95, 0]].forEach(function (s, n) {
        const t = (s[0] + (rnd() - 0.5) * 0.03) * len, chip = n === 0 || n === 3;
        const w = (chip ? 14 + rnd() * 16 : 3 + rnd() * 7) * (chip ? f : fn), d = (chip ? 3 + rnd() * 1.2 : 0.7 + rnd() * 0.8) * (chip ? f : fn);
        const m = 2 + Math.floor(rnd() * 3), us = [];
        for (let j = 0; j < m; j++) us.push(rnd());
        us.sort(function (a, b) { return a - b; });
        bites.push(at(t, 0));
        us.forEach(function (u) { bites.push(at(t + u * w, d * (0.25 + rnd() * 0.75))); });
        bites.push(at(t + w, 0));
      });
      pts.splice.apply(pts, [1, 0].concat(bites));
      el.style.setProperty("--xp-dy", dy.toFixed(1) + "px");
      el.style.setProperty("--xp-clip", "polygon(" + pts.map(function (p) { return p[0].toFixed(1) + "px " + p[1].toFixed(1) + "px"; }).join(", ") + ")");
      const l = red.firstChild, vx = 0 - x0, vy = by - dy;
      l.setAttribute("x1", (x0 - 0.06 * vx).toFixed(1)); l.setAttribute("y1", (dy - 0.06 * vy).toFixed(1));
      l.setAttribute("x2", (-0.06 * vx).toFixed(1)); l.setAttribute("y2", (by - 0.06 * vy).toFixed(1));   /* stops short of the corner by the top overshoot */
    }
    draw();
    if (window.ResizeObserver) new ResizeObserver(draw).observe(el);
    window.addEventListener("resize", draw);
  }

  function boot() { apply(); const x = document.querySelector(".xp-shape"); if (x) xpShape(x); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.Shapes = { polygon: polygon, styles: styles, apply: apply, rng: rng };
})();
