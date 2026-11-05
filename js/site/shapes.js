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

  /* the worn four-sided look shared by the Experience tile and the Work rows: pts = [TL, TR, BR, BL] in px, the top edge
     (TL to TR) eaten by a few seeded angular chips bunched toward the corners (scaled by width W), clean elsewhere; a red
     line runs down the left edge, overshooting the top-left corner by 0.06 of the edge and stopping short of the bottom-left
     by the same. Sets the clip as `prop` on el (its y moved down by `pad`, for a pseudo reaching `pad` px above the box) and draws the line in the svg `red`.
     k deepens the chips and nicks and jit spreads where they sit (both default to the Experience tile's look). */
  function wornQuad(el, red, pts, W, seed, prop, pad, k, jit, e) {
    pad = pad || 0; k = k || 1; jit = jit || 0.03; e = e || 1;
    const x0 = pts[0][0], dy = pts[0][1];
    /* the worn run is the chain pts[0..e] (one plain edge when e is 1); a bite never spans a corner of it and sits in the segment its start falls in */
    const segs = []; let len = 0;
    for (let j = 0; j < e; j++) { const ex = pts[j + 1][0] - pts[j][0], ey = pts[j + 1][1] - pts[j][1], l = Math.hypot(ex, ey); segs.push({ x: pts[j][0], y: pts[j][1], ux: ex / l, uy: ey / l, l: l, s: len }); len += l; }
    const rnd = rng(seed), bites = segs.map(function () { return []; });   /* bites per segment of the run */
    const at = function (u, off) { let g = segs[segs.length - 1]; for (let j = 0; j < segs.length; j++) if (u <= segs[j].s + segs[j].l) { g = segs[j]; break; } const q = u - g.s; return [g.x + g.ux * q - g.uy * off, g.y + g.uy * q + g.ux * off]; };
    const f = Math.max(1, Math.min(2.5, 1 + 1.5 * (W - 420) / 800)), fn = 1 + (f - 1) * 0.4;   /* bite scale: 1 on a phone, 2.5 on desktop */
    /* five bites at uneven spots (bunched toward the corners, long clean runs between): a deep chip or two, the rest hairline nicks */
    [[0.06, 1], [0.11, 0], [0.46, 0], [0.9, 1], [0.95, 0]].forEach(function (s, n) {
      let t = (s[0] + (rnd() - 0.5) * jit) * len;
      const chip = n === 0 || n === 3;
      const w = (chip ? 14 + rnd() * 16 : 3 + rnd() * 7) * (chip ? f : fn) * Math.sqrt(k);
      let d = (chip ? 3 + rnd() * 1.2 : 0.7 + rnd() * 0.8) * (chip ? f : fn) * k;
      if (chip && k > 1) d = Math.min(16, Math.max(6, d));   /* deepened chips (Work rows): 6 px at least on a phone, 16 at most on desktop */
      segs.forEach(function (g) { if (g.s > t && g.s < t + w) t = g.s + 1; });   /* a corner of the run inside the bite: start the bite after it */
      let sj = 0; segs.forEach(function (g, j) { if (t >= g.s) sj = j; });
      const bs = bites[sj], m = 2 + Math.floor(rnd() * 3), us = [];
      for (let j = 0; j < m; j++) us.push(rnd());
      us.sort(function (a, b) { return a - b; });
      bs.push(at(t, 0));
      us.forEach(function (u, q) { const r = rnd(); bs.push(at(t + u * w, d * (chip && k > 1 && q === 0 ? 1 : 0.25 + r * 0.75))); });
      bs.push(at(t + w, 0));
    });
    const all = [pts[0]];
    for (let j = 0; j < e; j++) all.push.apply(all, bites[j].concat([pts[j + 1]]));
    all.push.apply(all, pts.slice(e + 1));
    el.style.setProperty(prop, "polygon(" + all.map(function (p) { return p[0].toFixed(1) + "px " + (p[1] + pad).toFixed(1) + "px"; }).join(", ") + ")");
    if (!red) return all;
    const l = red.firstChild, bl = pts[pts.length - 1], vx = bl[0] - x0, vy = bl[1] - dy;
    l.setAttribute("x1", (x0 - 0.06 * vx).toFixed(1)); l.setAttribute("y1", (dy - 0.06 * vy).toFixed(1));
    l.setAttribute("x2", (bl[0] - 0.06 * vx).toFixed(1)); l.setAttribute("y2", (bl[1] - 0.06 * vy).toFixed(1));   /* stops short of the corner by the top overshoot */
    return all;
  }
  function redOf(el) {
    const NS = "http://www.w3.org/2000/svg";
    let red = el.querySelector(":scope > .xp-red");
    if (!red) {
      red = document.createElementNS(NS, "svg"); red.setAttribute("class", "xp-red"); red.setAttribute("aria-hidden", "true");
      red.appendChild(document.createElementNS(NS, "line")); el.appendChild(red);
    }
    return red;
  }

  /* the Work rows: each band is the worn polygon of its game (below). */
  const WK_BOT = [3.3, 2.5, 3.6, 3];   /* degrees: only the phone Experience tilt now */
  /* each game is cut as its own polygon (box fractions, clockwise from the top-left point of the top run; the last point closes the left edge).
     WK_TOP_END: index where the worn top run (leftmost to rightmost across the top) ends; WK_BASE: [bottom-left, bottom-right] point indexes
     of the lowest run, which the Experience shape hangs from. */
  /* the cracks between neighbouring rows: each is one polyline [x as a fraction of the row width, drop in widths]. The upper row's
     bottom run is the crack raised so its deepest point touches the box bottom; the lower row's top run is the same crack with its
     highest point on the box top, so the two edges are parallel and WK_GAP (rem) apart however tall the rows are (the lower row's margin does the rest) */
  const WK_CRACK = [
    [[0.10, 0.04], [0.93, 0.1]],
    [[0.04, 0.1], [0.55, 0], [0.86, 0.03]],
    [[0.10, 0], [0.94, 0.07]]
  ];
  const WK_GAP = 4;
  const WK_ANCH = [0, 0, 0, 0];
  const WK_DROP = function (c) { return Math.max.apply(null, c.map(function (p) { return p[1]; })); };
  /* row i's polygon in px (box W x H), clockwise from the top-left point of its top run; the last point closes the left edge.
     Returns {pts, end (index where the worn top run ends), bi ([bottom-left, bottom-right] indexes: the Experience shape hangs from that run)} */
  function wkPoly(i, W, H) {
    const top = i === 0 ? [[0, 0], [0.142 * W, 0.199 * H], [0.94 * W, 0.292 * H]] : WK_CRACK[i - 1].map(function (p) { return [p[0] * W, p[1] * W]; });
    const R = i === 0 ? [[W, 0.62 * H]] : [], L = i === 1 ? [[0, 0.5 * H]] : [];   /* side bulges: Sector Zero's right edge, VoidScape's left */
    let bot;
    if (i < WK_CRACK.length) { const A = WK_DROP(WK_CRACK[i]) * W; bot = WK_CRACK[i].map(function (p) { return [p[0] * W, H - A + p[1] * W]; }).reverse(); }
    else bot = [[W, 0.82 * H], [0, H]];   /* the last row's bottom is one straight run (the Experience shape's top edge follows it) */
    return { pts: top.concat(R, bot, L), end: top.length - 1, bi: [top.length + R.length + bot.length - 1, top.length + R.length] };
  }
  function workRows() {
    const rows = document.querySelectorAll(".work > a.obj[data-wornquad]");
    rows.forEach(function (el, i) {
      const red = redOf(el);
      /* the row's own height: its padding scaled by a seeded factor (a different one per row), so the layout really differs */
      const hf0 = [0.45, 1.55, 0.8, 1.3][i % 4] + (rng("wk-h-" + i)() - 0.5) * 0.2;
      el.style.setProperty("--wk-hf", hf0.toFixed(2));
      /* then grown: the row's height at that factor is B; the padding is raised so the row lands at 1.95x B (1.8x on a phone; B already holds the wrapped meta): 1.5x the earlier, already grown row, the text staying centred */
      { const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16, B = el.offsetHeight, txt = B - 4.25 * rem * hf0;
        if (B) {
          const hf = Math.max(hf0, (B * (window.matchMedia("(max-width: 1199px)").matches ? 1.8 : 1.95) * (i === 0 ? 1.25 : 1) - txt) / (4.25 * rem)), a = WK_ANCH[i % WK_ANCH.length];
          el.style.setProperty("--wk-hf", (a ? hf * (1 - a) / 0.53 : hf).toFixed(3));   /* a: share of the spare height put above the text (a deep notch up top); the rest stays below it */
          el._wkPt = a ? hf * 4.25 * rem * a : 0;
        } }
      const TXT = ".obj-id, h3, .obj-line, .props > div", MARGIN = 6;
      /* signed distance (px, inside positive) from a point to the polygon, and the nearest edge's direction */
      function inside(poly, x, y) {
        let c = false, m = 1e9, sx = 0, sy = 0;
        for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
          const ax = poly[a][0], ay = poly[a][1], bx = poly[b][0], by2 = poly[b][1];
          if ((ay > y) !== (by2 > y) && x < (bx - ax) * (y - ay) / (by2 - ay) + ax) c = !c;
          const ex = bx - ax, ey = by2 - ay, l2 = ex * ex + ey * ey || 1, t = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / l2));
          const d = Math.hypot(x - ax - t * ex, y - ay - t * ey);
          if (d < m) { m = d; sx = ex; sy = ey; }
        }
        return { d: c ? m : -m, sx: sx, sy: sy };
      }
      function draw(pass) {
        pass = pass || 0;
        /* desktop: the row grows to both sides (the text column keeps its size and moves left with the row): every row runs to 6% of the screen from the right edge and its left edge sits 6% in */
        const wide = !window.matchMedia("(max-width: 1199px)").matches;
        if (wide && pass === 0) {
          const k0 = window.Stage ? window.Stage.s() : 1, wk = el.parentNode, ws = getComputedStyle(wk), cw = document.documentElement.clientWidth;
          const natR = wk.getBoundingClientRect().right - parseFloat(ws.paddingRight) * k0, tgt = cw * 0.94;
          const natL = wk.getBoundingClientRect().left + parseFloat(ws.paddingLeft) * k0;
          el._wkExt = Math.max(0, (tgt - natR) / k0); el._wkExtL = Math.max(0, (natL - cw * 0.06) / k0);
          el.style.marginRight = (-el._wkExt).toFixed(1) + "px"; el.style.marginLeft = (-el._wkExtL).toFixed(1) + "px";
        } else if (!wide && (el._wkExt || el._wkExtL)) { el._wkExt = el._wkExtL = 0; el.style.marginRight = el.style.marginLeft = ""; }
        const W = el.offsetWidth, H = el.offsetHeight, flip = wide && el.classList.contains("is-flip");   /* flip: text right, picture left (css .is-flip) */
        if (!W || !H) return;
        /* padding state: extras the text-inside check adds (top, bottom, left, right), reset when the width changes; cpl/cpr are the left/right extras now applied */
        if (!el._wk || el._wk.W !== W) ["pt", "pb", "pl", "pr"].forEach(function (v) { el.style.removeProperty("--wk-" + v); });
        const S = el._wk && el._wk.W === W ? el._wk : (el._wk = { W: W, pt: 0, pb: 0, pl: 0, pr: 0, cpl: 0, cpr: 0 });
        if (el._wkPt && !S.pt) el.style.setProperty("--wk-pt", el._wkPt.toFixed(0) + "px");
        const cs = getComputedStyle(el);
        /* the row's own cut: its polygon (WK_POLY, box fractions) scaled to the row's box; nothing reaches past the box, so no padding above */
        const poly = wkPoly(i, W, H), pts = poly.pts, bi = poly.bi;
        if (i > 0) el.style.marginTop = (WK_GAP * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16) - WK_DROP(WK_CRACK[i - 1]) * W).toFixed(1) + "px";   /* the crack above this row: WK_GAP between the two edges */
        el.style.setProperty("--wk-pad", "0px");
        const all = wornQuad(el, red, pts, W, "wk-wear-" + i, "--wk-clip", 0, 2, 0.1, poly.end);
        const bl = pts[bi[0]], br = pts[bi[1]];
        if (flip) {   /* mirrored row: the red line runs down the right edge, from the end of the worn top run to the bottom-right point, same overshoot as the left one */
          const tr = pts[poly.end], l = red.firstChild, vx = br[0] - tr[0], vy = br[1] - tr[1];
          l.setAttribute("x1", (tr[0] - 0.06 * vx).toFixed(1)); l.setAttribute("y1", (tr[1] - 0.06 * vy).toFixed(1));
          l.setAttribute("x2", (br[0] - 0.06 * vx).toFixed(1)); l.setAttribute("y2", (br[1] - 0.06 * vy).toFixed(1));
        }
        el._wkGeo = { xtl: pts[0][0], ytl: pts[0][1], xbl: bl[0], ybl: bl[1], xbr: br[0], ybr: br[1], ba: Math.atan2(bl[1] - br[1], br[0] - bl[0]) * 180 / Math.PI };   /* the Experience shape hangs from this bottom edge (the lowest run, bottom-left to bottom-right) */
        /* every text box stays MARGIN px inside the quad: where it comes closer, the padding on that side grows by the shortfall and the row is drawn again */
        if (pass < 5) {
          const er = el.getBoundingClientRect(), need = { t: 0, b: 0, l: 0, r: 0 }, k = window.Stage ? window.Stage.s() : 1;   /* rects are screen px under the stage zoom, the quad is in design px */
          el.querySelectorAll(TXT).forEach(function (t) {
            const rr = t.getBoundingClientRect(), r = { width: rr.width / k, height: rr.height / k }, x0 = (rr.left - er.left) / k, y0 = (rr.top - er.top) / k;
            for (let k = 0; k <= 6; k++) for (let s = 0; s < 4; s++) {
              const x = x0 + (s < 2 ? k / 6 * r.width : (s - 2) * r.width), y = y0 + (s < 2 ? s * r.height : k / 6 * r.height);
              const q = inside(all, x, y), lack = MARGIN - q.d;
              if (lack <= 0) continue;
              const side = Math.abs(q.sx) > Math.abs(q.sy) ? (y < H / 2 ? "t" : "b") : (x < W / 2 ? "l" : "r");
              need[side] = Math.max(need[side], lack);
            }
          });
          if (need.t + need.b + need.l + need.r > 0.5) {
            if (need.t) { S.pt = parseFloat(cs.paddingTop) + Math.ceil(need.t); el.style.setProperty("--wk-pt", S.pt + "px"); }
            if (need.b) { S.pb = parseFloat(cs.paddingBottom) + Math.ceil(need.b); el.style.setProperty("--wk-pb", S.pb + "px"); }
            S.pl += Math.ceil(need.l); S.pr += Math.ceil(need.r);
            el.style.setProperty("--wk-pl", S.pl + "px"); el.style.setProperty("--wk-pr", S.pr + "px");
            return draw(pass + 1);
          }
        }
        /* the game picture sits inside the same quad: its clip is the quad moved into the picture's own box */
        const shot = el.querySelector(":scope > .obj-shot");
        if (shot) {
          /* the picture is fully dark under the whole text block (its widest line, measured by range), then fades in */
          const er2 = el.getBoundingClientRect(), rg = document.createRange(), k2 = window.Stage ? window.Stage.s() : 1; let tx = 0;
          if (flip) tx = W;   /* mirrored: tx is the text's reach from the row's right edge, measured from its leftmost line */
          el.querySelectorAll(TXT).forEach(function (t) { rg.selectNodeContents(t); const rc = rg.getBoundingClientRect(); tx = flip ? Math.min(tx, (rc.left - er2.left) / k2) : Math.max(tx, (rc.right - er2.left) / k2); });
          if (flip) tx = W - tx;
          el.querySelectorAll(":scope > :is(.obj-shot, .obj-clip)").forEach(function (m) { m.style.width = wide && (el._wkExt || el._wkExtL) ? (W - 0.2 * (W - el._wkExt - el._wkExtL)).toFixed(1) + "px" : ""; });   /* the picture keeps its place relative to the text: it grows with the row on both sides */
          el.querySelectorAll(":scope > :is(.obj-shot, .obj-clip)").forEach(function (m) { m.style.setProperty("--wk-tx", Math.max(0, flip ? tx + 16 - (W - m.offsetLeft - m.offsetWidth) : tx + 16 - m.offsetLeft).toFixed(0) + "px"); });   /* the playing clip fades in from the same place as the still */
        }
        if (shot) el.querySelectorAll(":scope > :is(.obj-shot, .obj-clip)").forEach(function (m) { m.style.setProperty("--wk-shot-clip", "polygon(" + all.map(function (p) { return (p[0] - m.offsetLeft).toFixed(1) + "px " + (p[1] - m.offsetTop).toFixed(1) + "px"; }).join(", ") + ")"); });   /* each (the still and the clip) in its own box: Conclusus draws them at different sizes */
      }
      draw();
      if (window.ResizeObserver) new ResizeObserver(function () { draw(); }).observe(el);
      window.addEventListener("resize", function () { const cw = document.documentElement.clientWidth; if (el._wkCw === cw) return; el._wkCw = cw; draw(); clearTimeout(el._wkRz); el._wkRz = setTimeout(function () { draw(); }, 200); });   /* page zoom while open: the capped stage keeps the row's box, so only the window says the width changed; the late pass settles the text padding once a resize or zoom crosses 1200 */
    });
  }

  /* the Experience + contact shape: one black quad (the owner's drawing, corners as box fractions) whose top edge
     takes the bottom-edge angle of the last Work row so the two stay parallel (the worn look is wornQuad's);
     a red line runs down the left edge from ~6% above its top. Phone: the long point becomes a mild slant. */
  function xpShape(el) {
    const red = redOf(el);
    const XW = 1660, XH = 780, XANG = -3 * Math.PI / 180;      /* desktop fallback: one fixed size and tilt, never rebuilt from the window */
    let mode = null;
    /* desktop: the top edge is the last Work row's bottom edge moved down its normal by the row-to-row gap (perpendicular distance between two rows' parallel edges), same length;
       everything is in design px (rects divided by the stage zoom), so the result is the same at every window size. Returns {W, dy, left, top} (left/top: where the box sits, page design px) or null */
    function hang() {
      const rows = document.querySelectorAll(".work > a.obj[data-wornquad]"), n = rows.length, last = n ? rows[n - 1] : null, g = last && last._wkGeo;
      if (!g) return null;
      const k = window.Stage ? window.Stage.s() : 1, r = last.getBoundingClientRect(), a = g.ba * Math.PI / 180, ta = Math.tan(a);
      const gap = WK_GAP * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16) * Math.cos(a);   /* the same vertical gap as between the rows */
      const sx = gap * Math.sin(a), sy = gap * Math.cos(a), lx = g.xbr - g.xbl, W = lx / 0.972;
      return { W: W, dy: ta * lx, left: Math.max(r.left / k + g.xbl + sx - 0.028 * W, 0.06 * document.documentElement.clientWidth / k), top: r.top / k + g.ybr + sy };
    }
    function draw() {
      const phone = window.matchMedia("(max-width: 1199px)").matches, hg = phone ? null : hang();
      const W = phone ? el.offsetWidth : hg ? hg.W : XW, H = phone ? el.offsetHeight : XH;
      if (!W || !H) return;
      mode = phone;
      let ang = XANG;
      if (phone) { const rows = document.querySelectorAll(".work > a.obj[data-wornquad]"); ang = rows.length ? -WK_BOT[(rows.length - 1) % WK_BOT.length] * Math.PI / 180 : -3 * Math.PI / 180; }
      if (hg) {
        el.style.width = hg.W.toFixed(1) + "px"; el.style.left = "0px"; el.style.marginLeft = "0px"; el.style.marginTop = "0px";
        const er = el.getBoundingClientRect(), k = window.Stage ? window.Stage.s() : 1;
        el.style.marginLeft = (hg.left - er.left / k).toFixed(1) + "px";
        el.style.marginTop = (hg.top - er.top / k).toFixed(1) + "px";
      } else { el.style.width = ""; el.style.left = ""; el.style.marginLeft = ""; el.style.marginTop = ""; }
      const x0 = 0.028 * W;
      const dy = hg ? hg.dy : Math.max(0, -Math.tan(ang)) * (W - x0);       /* top-left drop so the top edge matches the row's tilt */
      const by = phone ? 0.95 * H : 0.735 * H;                 /* bottom-left corner */
      const pts = phone ? [[x0, dy], [W, 0], [W, H], [0, by]] : [[x0, dy], [W, 0], [0.297 * W, H], [0, by]];
      wornQuad(el, red, pts, W, "xp-wear", "--xp-clip");
      el.style.setProperty("--xp-dy", dy.toFixed(1) + "px");
    }
    function live() { if (window.matchMedia("(max-width: 1199px)").matches || mode !== false) draw(); }
    draw();
    if (window.ResizeObserver) {
      new ResizeObserver(live).observe(el);
      const wk = document.querySelector(".work"), rows = document.querySelectorAll(".work > a.obj[data-wornquad]");
      const ro = new ResizeObserver(function () { if (!window.matchMedia("(max-width: 1199px)").matches) draw(); });
      if (wk) ro.observe(wk);
      if (rows.length) ro.observe(rows[rows.length - 1]);
    }
    window.addEventListener("resize", live);
  }

  /* a browser without CSS zoom (Firefox before 126) never scales the stage (it stays 1600 wide), so the scale every rect is divided by is 1 there */
  if (window.Stage && !(window.CSS && CSS.supports && CSS.supports("zoom", "1.2"))) window.Stage = { s: function () { return 1; } };
  function boot() { apply(); workRows(); const x = document.querySelector(".xp-shape"); if (x) xpShape(x); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.Shapes = { polygon: polygon, styles: styles, apply: apply, rng: rng };
})();
