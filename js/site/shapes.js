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
  function wornQuad(el, red, pts, W, seed, prop, pad, k, jit) {
    pad = pad || 0; k = k || 1; jit = jit || 0.03;
    const x0 = pts[0][0], dy = pts[0][1];
    const ex = pts[1][0] - x0, ey = pts[1][1] - dy, len = Math.hypot(ex, ey), ux = ex / len, uy = ey / len;
    const rnd = rng(seed), bites = [];
    const at = function (u, off) { return [x0 + ux * u - uy * off, dy + uy * u + ux * off]; };
    const f = Math.max(1, Math.min(2.5, 1 + 1.5 * (W - 420) / 800)), fn = 1 + (f - 1) * 0.4;   /* bite scale: 1 on a phone, 2.5 on desktop */
    /* five bites at uneven spots (bunched toward the corners, long clean runs between): a deep chip or two, the rest hairline nicks */
    [[0.06, 1], [0.11, 0], [0.46, 0], [0.9, 1], [0.95, 0]].forEach(function (s, n) {
      const t = (s[0] + (rnd() - 0.5) * jit) * len, chip = n === 0 || n === 3;
      const w = (chip ? 14 + rnd() * 16 : 3 + rnd() * 7) * (chip ? f : fn) * Math.sqrt(k);
      let d = (chip ? 3 + rnd() * 1.2 : 0.7 + rnd() * 0.8) * (chip ? f : fn) * k;
      if (chip && k > 1) d = Math.min(16, Math.max(6, d));   /* deepened chips (Work rows): 6 px at least on a phone, 16 at most on desktop */
      const m = 2 + Math.floor(rnd() * 3), us = [];
      for (let j = 0; j < m; j++) us.push(rnd());
      us.sort(function (a, b) { return a - b; });
      bites.push(at(t, 0));
      us.forEach(function (u, q) { const r = rnd(); bites.push(at(t + u * w, d * (chip && k > 1 && q === 0 ? 1 : 0.25 + r * 0.75))); });
      bites.push(at(t + w, 0));
    });
    const all = pts.slice();
    all.splice.apply(all, [1, 0].concat(bites));
    el.style.setProperty(prop, "polygon(" + all.map(function (p) { return p[0].toFixed(1) + "px " + (p[1] + pad).toFixed(1) + "px"; }).join(", ") + ")");
    const l = red.firstChild, bl = pts[3], vx = bl[0] - x0, vy = bl[1] - dy;
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

  /* the Work rows: each band is a worn quad, its four corners pushed off by a seeded few %; a row's top edge takes the
     previous row's bottom angle (rows are read in order), so each runs parallel to the game above. Angles in degrees,
     rising to the right, within a few degrees of the old -3deg tilt. */
  const WK_TOP = 2.6, WK_BOT = [3.3, 2.5, 3.6, 3];
  function workRows() {
    const rows = document.querySelectorAll(".work > a.obj[data-wornquad]");
    rows.forEach(function (el, i) {
      const red = redOf(el);
      /* the row's own height: its padding scaled by a seeded factor (a different one per row), so the layout really differs */
      const hf0 = [0.45, 1.55, 0.8, 1.3][i % 4] + (rng("wk-h-" + i)() - 0.5) * 0.2;
      el.style.setProperty("--wk-hf", hf0.toFixed(2));
      /* then grown: the row's height at that factor is B; the padding is raised so the row lands at 1.3x B (1.2x on a phone; B already holds the wrapped meta, so about 1.5x the old row), the text staying centred */
      { const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16, B = el.offsetHeight, txt = B - 4.25 * rem * hf0;
        if (B) el.style.setProperty("--wk-hf", Math.max(hf0, (B * (window.matchMedia("(max-width: 899px)").matches ? 1.2 : 1.3) - txt) / (4.25 * rem)).toFixed(3)); }
      /* the row's width as a share of its box, seeded per row (82-100%) */
      const wfRow = Math.min(1, [0.86, 1, 0.82, 0.94][i % 4] + (rng("wk-w-" + i)() - 0.5) * 0.06);
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
        const W = el.offsetWidth, H = el.offsetHeight;
        if (!W || !H) return;
        const rnd = rng("wk-quad-" + i);
        /* padding state: extras the text-inside check adds (top, bottom, left, right), reset when the width changes; cpl/cpr are the left/right extras now applied */
        if (!el._wk || el._wk.W !== W) ["pt", "pb", "pl", "pr"].forEach(function (v) { el.style.removeProperty("--wk-" + v); });
        const S = el._wk && el._wk.W === W ? el._wk : (el._wk = { W: W, pt: 0, pb: 0, pl: 0, pr: 0, cpl: 0, cpr: 0 });
        const narrow = window.matchMedia("(max-width: 899px)").matches, cs = getComputedStyle(el);
        const gutL = parseFloat(cs.paddingLeft) - S.cpl, gutR = parseFloat(cs.paddingRight) - S.cpr;
        /* each edge sits its own px in from the box (never under 4, so none sits square). The left edge leans 10-20deg off vertical, alternating
           under/over 90 from row to row (the first row's side is seeded); its x range stays inside the gutter so the text is never cut, and on a phone
           (gutter 20px) the lean shrinks to fit. The right edge leans 1-4deg either way and sits in from the box by up to 13% of W (the gutter on a phone).
           The first row's top has no seam above, so its two top corners also move up or down on their own. Seam edges keep their angle, so the edge as a whole moves, never one corner alone */
        const px = function (lo, hi) { return lo + rnd() * (hi - lo); }, dyMax = Math.max(6, 0.04 * H);
        const ty = 4 + rnd() * dyMax, by = H - 4 - rnd() * dyMax, hq = by - ty;
        const ls = (i % 2 ? 1 : -1) * (rng("wk-side")() < 0.5 ? 1 : -1), rs = rnd() < 0.5 ? 1 : -1;
        /* the text side grows with the lean (left padding), and the right padding with the row's inset, so the leaning edge never cuts text */
        const angL = px(narrow ? 4 : 10, narrow ? 8 : 20), dL = Math.tan(angL * Math.PI / 180) * hq;
        const pl = Math.max(0, Math.ceil(dL + 12 - gutL)) + S.pl, lmax = Math.max(8, gutL + pl - 8);
        const dl = Math.min(dL, lmax - 4), atL = 4 + rnd() * Math.min(lmax - 4 - dl, narrow ? 12 : 1e9);
        const lx = ls > 0 ? [atL + dl, atL] : [atL, atL + dl];   /* [top x, bottom x] */
        const angR = px(1, 4), dR = Math.tan(angR * Math.PI / 180) * hq;
        const rm = Math.max(4 + dR / 2, (1 - (narrow ? wfRow - 0.07 : wfRow)) * W - (lx[0] + lx[1]) / 2);   /* right edge's mean inset: the row's width share minus the left inset */
        const pr = (narrow ? Math.max(0, Math.ceil(rm + dR / 2 + 8 - gutR)) : 0) + S.pr;
        if (pass < 5 && (Math.abs(pl - S.cpl) > 2 || Math.abs(pr - S.cpr) > 2)) {
          S.cpl = pl; S.cpr = pr; el.style.setProperty("--wk-pl", pl + "px"); el.style.setProperty("--wk-pr", pr + "px");
          return draw(pass + 1);
        }
        const rx = rs > 0 ? [rm + dR / 2, rm - dR / 2] : [rm - dR / 2, rm + dR / 2];
        const xtl = lx[0], xbl = lx[1], xtr = W - rx[0], xbr = W - rx[1];
        const free = function () { return (rnd() < 0.5 ? -1 : 1) * px(4, dyMax); };
        const ytl = i ? 0 : free(), ytr = i ? 0 : free();
        const ta = i ? WK_BOT[i - 1] : WK_TOP, ba = WK_BOT[i % WK_BOT.length];
        /* each edge pivots about the row's centre (as the old rotated band did), which folder.css's --tuck and overlap assume */
        const rt = Math.tan(ta * Math.PI / 180) * (xtr - xtl) / 2, rb = Math.tan(ba * Math.PI / 180) * (xbr - xbl) / 2;
        /* the tilted edges reach past the box top and bottom, so the pseudo is padded that far (--wk-pad) and nothing is cut flat */
        const pad = Math.ceil(Math.max(rt, rb)) + 12;
        el.style.setProperty("--wk-pad", pad + "px");
        const all = wornQuad(el, red, [[xtl, ty + rt + ytl], [xtr, ty - rt + ytr], [xbr, by - rb], [xbl, by + rb]], W, "wk-wear-" + i, "--wk-clip", pad, 2, 0.1);
        /* every text box stays MARGIN px inside the quad: where it comes closer, the padding on that side grows by the shortfall and the row is drawn again */
        if (pass < 5) {
          const er = el.getBoundingClientRect(), need = { t: 0, b: 0, l: 0, r: 0 };
          el.querySelectorAll(TXT).forEach(function (t) {
            const r = t.getBoundingClientRect(), x0 = r.left - er.left, y0 = r.top - er.top;
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
            return draw(pass + 1);
          }
        }
        /* the row below an open page: its top edge (parallel to this bottom edge) sits 10px above the page's real bottom line; the page pivots at the folder's left (centre on narrow) and drops by H(1-cos)/cos */
        const above = el.previousElementSibling;
        if (above && above.classList.contains("case-folder")) {
          const narrow = window.matchMedia("(max-width: 899px)").matches, tt = Math.tan(ta * Math.PI / 180), body = above.querySelector(".folder-body");
          const hp = body ? body.offsetHeight : 0, dv = hp * (1 - Math.cos(ta * Math.PI / 180)) / Math.cos(ta * Math.PI / 180);
          el.style.setProperty("--wk-seam", (dv + tt * ((narrow ? W / 2 : 0) - xtl) - (ty + rt + ytl) - 10).toFixed(1) + "px");
        }
        /* the open page below pivots on the row's real bottom edge: same angle, and --tuck from that line (at the page's pivot x) down to the page's top */
        const fold = el.nextElementSibling;
        if (fold && fold.classList.contains("case-folder")) {
          const narrow = window.matchMedia("(max-width: 899px)").matches, rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
          const tb = Math.tan(ba * Math.PI / 180), yline = by + rb - tb * ((narrow ? W / 2 : 0) - xbl);
          fold.style.setProperty("--wk-rot", ba);
          fold.style.setProperty("--tuck", ((yline - (H - 2.5 * rem)) * Math.cos(ba * Math.PI / 180) + 1).toFixed(1) + "px");
        }
        /* the game picture sits inside the same quad: its clip is the quad moved into the picture's own box */
        const shot = el.querySelector(":scope > .obj-shot");
        if (shot) {
          /* the picture is fully dark under the whole text block (its widest line, measured by range), then fades in */
          const er2 = el.getBoundingClientRect(), rg = document.createRange(); let tx = 0;
          el.querySelectorAll(TXT).forEach(function (t) { rg.selectNodeContents(t); tx = Math.max(tx, rg.getBoundingClientRect().right - er2.left); });
          shot.style.setProperty("--wk-tx", Math.max(0, tx + 16 - shot.offsetLeft).toFixed(0) + "px");
        }
        if (shot) shot.style.setProperty("--wk-shot-clip", "polygon(" + all.map(function (p) { return (p[0] - shot.offsetLeft).toFixed(1) + "px " + (p[1] - shot.offsetTop).toFixed(1) + "px"; }).join(", ") + ")");
      }
      draw();
      if (window.ResizeObserver) new ResizeObserver(function () { draw(); }).observe(el);
    });
  }

  /* the Experience + contact shape: one black quad (the owner's drawing, corners as box fractions) whose top edge
     takes the bottom-edge angle of the last Work row so the two stay parallel (the worn look is wornQuad's);
     a red line runs down the left edge from ~6% above its top. Phone: the long point becomes a mild slant. */
  function xpShape(el) {
    const red = redOf(el);
    const XW = 1660, XH = 780, XANG = -3 * Math.PI / 180;      /* desktop: one fixed size and tilt (the 2000x1009 look), never rebuilt from the window */
    let mode = null;
    function draw() {
      const phone = window.matchMedia("(max-width: 640px)").matches;
      const W = phone ? el.offsetWidth : XW, H = phone ? el.offsetHeight : XH;
      if (!W || !H) return;
      mode = phone;
      let ang = XANG;
      if (phone) { const rows = document.querySelectorAll(".work > a.obj[data-wornquad]"); ang = rows.length ? -WK_BOT[(rows.length - 1) % WK_BOT.length] * Math.PI / 180 : -3 * Math.PI / 180; }
      const x0 = 0.028 * W;
      const dy = Math.max(0, -Math.tan(ang)) * (W - x0);       /* top-left drop so the top edge matches the row's tilt */
      const by = phone ? 0.95 * H : 0.735 * H;                 /* bottom-left corner */
      const pts = phone ? [[x0, dy], [W, 0], [W, H], [0, by]] : [[x0, dy], [W, 0], [0.297 * W, H], [0, by]];
      wornQuad(el, red, pts, W, "xp-wear", "--xp-clip");
      el.style.setProperty("--xp-dy", dy.toFixed(1) + "px");
    }
    function live() { if (window.matchMedia("(max-width: 640px)").matches || mode !== false) draw(); }
    draw();
    if (window.ResizeObserver) new ResizeObserver(live).observe(el);
    window.addEventListener("resize", live);
  }

  function boot() { apply(); workRows(); const x = document.querySelector(".xp-shape"); if (x) xpShape(x); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.Shapes = { polygon: polygon, styles: styles, apply: apply, rng: rng };
})();
