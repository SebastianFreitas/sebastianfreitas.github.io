/* ===========================================================
   SHAPES — torn paper, rough slabs, made from numbers.

   Shapes.wear(el, preset, seed) erodes a box inward into a mask; Shapes.apply(root) runs the [data-wear] scan.
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

  /* ---- WEAR: one seeded raster mask for every chipped edge ----
     Spec 38: outside kinds mode every preset draws the one baseline (the name plate's recipe: end shards at the corners, a rare mid bite, crumbs above scale 1)
     scaled by the short side (name plate 26 px = 1, clamp 1-3) and masked by the flags (corners tl tr bl br, edges top right bottom left; opts.flags or data-wear-flags,
     else ROLE_FLAGS); the knobs below only drive kinds mode and sheet.py.
     Shapes.wear(el, preset, seed) paints a white box on a canvas, erases chunky shard bites at the corners and the two ends
     of each worn edge (the middle half of an edge stays clean bar one small bite) plus a 1.5 px grain near those ends,
     inward only (nothing past the box), and sets --wear (a PNG data URI) on el, and --shape: none too unless el has data-wear-keep.
     CSS: clip-path: var(--shape, <static polygon>); mask-image: var(--wear, none) (and -webkit-), so no JS keeps the old look.
     data-wear-keep marks a box whose CSS polygon is a real shape (at most 6 points): the clip stays, the mask wears it.
     Depth is a % of the short side, clamped to [4, max] css px (max 26 unless the preset says); shard length is 2-4x its depth.
     Knobs: depth %; max px clamp; ends per edge [t,r,b,l] (0 none, 1 one random end, 2 both ends); mid chance of one small
     middle bite; shard [min,max] length-to-depth ratio; grain px (0 = none); edges the worn sides (letters t r b l);
     tear {pct, n:[min,max], edges} deep stacked shards at each end of those edges (paper); spread n bites along the edge (row-top).
     kinds: optional list of effect kinds (step slant spike square tear, Shapes.wearKinds); when set, each cut site (a corner or an end
     of a worn edge) picks one by the seed and the shard knobs above are bypassed. opts.kinds overrides it, opts.kind forces one; el._wearKinds lists the picks. */
  const wearPresets = {
    tab:        { depth: 25, ends: [2, 0, 2, 0], mid: 0.3, shard: [2, 4], grain: 0, edges: "tb" },
    button:     { depth: 25, ends: [2, 0, 2, 0], mid: 0.3, shard: [2, 4], grain: 0, edges: "tb" },
    paper:      { depth: 14, ends: [1, 0, 1, 0], mid: 0,   shard: [2, 4], grain: 0, edges: "tb", tear: { pct: 40, n: [2, 3], edges: "lr" } },
    slab:       { depth: 25, ends: [2, 0, 2, 0], mid: 0.3, shard: [2, 4], grain: 0, edges: "tb" },
    "slab-tall": { depth: 22, ends: [2, 0, 2, 0], mid: 0.3, shard: [2, 4], grain: 0, edges: "tb" },
    "row-top":  { depth: 30, max: 44, spread: [3, 4], shard: [2, 4], grain: 0, edges: "t" },
    title:      { depth: 25, ends: [2, 0, 2, 0], mid: 0.3, shard: [2, 4], grain: 0, edges: "tb" },
    item:       { depth: 22, ends: [2, 1, 2, 1], mid: 0.3, shard: [2, 4], grain: 0, edges: "trbl" },
    image:      { depth: 20, ends: [1, 1, 1, 1], mid: 0.2, shard: [2, 4], grain: 0, edges: "trbl" },
    card:       { depth: 20, ends: [1, 1, 1, 1], mid: 0.2, shard: [2, 4], grain: 0, edges: "trbl" }
  };
  const EDGE_KEYS = ["t", "r", "b", "l"];
  const WEAR_KINDS = ["step", "slant", "spike", "square", "tear", "scallop", "shear", "round"];
  /* kinds mode: the corners a role's lead cut may take (name plate: bottom or top right; button: a bottom corner; paper title: a top corner); other roles take any */
  const WEAR_FLAGS = ["tl", "tr", "bl", "br", "top", "right", "bottom", "left"];
  const WEAR_EDGES = ["top", "right", "bottom", "left"];
  const WEAR_REF = 26;   /* the name plate's short side, css px: scale 1 */
  /* the flags each role wears; none is off yet (the owner's picks go in data-wear-flags or here) */
  const ROLE_FLAGS = { tab: WEAR_FLAGS, button: WEAR_FLAGS, paper: WEAR_FLAGS, slab: WEAR_FLAGS, "slab-tall": WEAR_FLAGS, "row-top": WEAR_FLAGS, title: WEAR_FLAGS, item: WEAR_FLAGS, image: WEAR_FLAGS, card: WEAR_FLAGS };
  const ROLE_CORNERS = { title: ["tr", "br"], button: ["bl", "br"], paper: ["tl", "tr"] };
  /* unit scallop profile (chord 1, depth 1) with its deepest point at pk: sine flanks, so the mouth is the widest span and both ends leave the edge at 67 degrees or less */
  const scallopPts = function (pk) {
    return [[0.3 * pk, 0.454], [0.7 * pk, 0.891], [pk, 1], [pk + 0.3 * (1 - pk), 0.891], [pk + 0.7 * (1 - pk), 0.454]];
  };
  /* step masks traced from the old hover corner PNGs (erased part, u along the edge, v inward, both 0..1 of the 184x140 and
     160x140 boxes, corner at 0,0): the first from the top-left one, the second from the bottom-right one */
  const STEP_SHAPES = [
    { r: 184 / 140, q: [[0, 0], [0, 1], [0.16, 1], [0.16, 0.87], [0.24, 0.87], [0.24, 0.68], [0.45, 0.68], [0.45, 0.44], [0.58, 0.44], [0.58, 0]] },
    { r: 160 / 140, q: [[0, 0], [0, 0.65], [0.13, 0.65], [0.13, 0.28], [0.38, 0.28], [0.38, 0]] }
  ];

  function wear(el, preset, seed, opts) {
    const P = wearPresets[preset];
    const cssW = el.offsetWidth, cssH = el.offsetHeight;
    if (!P || !cssW || !cssH) return null;
    let dpr = window.devicePixelRatio || 1;
    dpr = Math.min(dpr, 2048 / Math.max(cssW, cssH));
    const W = Math.max(1, Math.round(cssW * dpr)), H = Math.max(1, Math.round(cssH * dpr));
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const g = cv.getContext("2d");
    if (!g) return null;
    const rnd = rng(String(preset) + "|" + seed);
    const Scss = Math.min(cssW, cssH);
    g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = "destination-out";
    g.fillStyle = "#000";
    /* edge e, along u (0..1) and in by d px, to canvas px */
    const lens = [W, H, W, H];
    const pt = function (e, u, d) {
      return e === 0 ? [u * W, d] : e === 1 ? [W - d, u * H] : e === 2 ? [W - u * W, H - d] : [d, H - u * H];
    };
    const profile = [];
    let mute = false;
    /* baseline wear: flags (opts.flags, else data-wear-flags, else the role's) name the corners and edges that are worn; bk is the scale (short side / name plate, 1-6), bd the corner depth in canvas px */
    const flagAttr = el.getAttribute("data-wear-flags");
    const flagList = opts && opts.flags ? opts.flags : flagAttr != null ? flagAttr.split(",").map(function (f) { return f.trim(); }) : Scss > 60 ? [] : ROLE_FLAGS[preset] || WEAR_FLAGS;
    const on = function (f) { return flagList.indexOf(f) >= 0; };
    const bk = Math.max(1, Math.min(2, Scss / WEAR_REF)), bd = 0.25 * Math.max(16, Math.min(156, Scss)) * dpr;
    /* one chunky shard (5 points) on edge e from a0 to a0 + L px along it, d px deep; end shards run from the box end (a0
       before it) with the deep side at the corner, flip mirrors them to the far end; mid shards peak in the middle */
    const shard = function (e, a0, L, d, flip, end) {
      const q = end ? [[0, -2], [0, d * (0.85 + rnd() * 0.15)], [0.22, d * (0.65 + rnd() * 0.3)], [0.55, d * (0.3 + rnd() * 0.3)], [1, -2]]
        : [[0, -2], [0.3, d * (0.55 + rnd() * 0.3)], [0.5, d], [0.8, d * (0.3 + rnd() * 0.4)], [1, -2]];
      g.beginPath();
      q.forEach(function (p, j) {
        const a = a0 + (flip ? 1 - p[0] : p[0]) * L, c = pt(e, a / lens[e], p[1]);
        if (j) g.lineTo(c[0], c[1]); else g.moveTo(c[0], c[1]);
        if (e === 0 && p[1] > 0 && !mute) profile.push([Math.max(0, Math.min(1, a / W)), p[1] / H]);
      });
      g.closePath(); if (!mute) g.fill();
    };
    const clampD = function (pct, max) { return Math.max(4, Math.min(max, pct / 100 * Scss)) * dpr; };
    /* opts.edges: [[[x0, y0], [x1, y1]], ...] worn segments in box px; the shards sit on each segment and erode toward the box centre */
    const segs = opts && opts.edges;
    /* kinds mode is sparse: severity by seed (0 faint = one small bite, 1 one bold, 2 two corners); the rest of the box stays crisp */
    const kz = !!(opts && (opts.kinds || opts.kind));
    /* kinds mode draws its lead pick (corner, kind) first so a small seed change moves it */
    if (kz) { rnd(); rnd(); }
    /* kinds mode: the grain knob (opts.grain, css px, default 2.5) roughens bite rims only; the straight runs between bites stay clean */
    const rimAmp = kz ? (opts && opts.grain != null ? opts.grain : 4) * dpr : 0;
    /* kinds mode: a lip never hooks. Interior vertices of a bite whose ends sit at q[0] and q[n-1] (s in units of sc px) stay inside the 67 degree cone from each end, so both ends leave the edge at 67 degrees or less */
    const cone = function (q, sc, lead) {
      const n = q.length, a = q[0][0], z = q[n - 1][0], ta = q[0][1], tz = q[n - 1][1];
      for (let i = 1; i < n - 1; i++) q[i][0] = Math.min(lead ? q[i][0] : Math.max(q[i][0], a + 0.43 * (q[i][1] - ta) / sc), z - 0.43 * (q[i][1] - tz) / sc);
      lipChk(q, sc, lead);
      return q;
    };
    /* sheet check (kinds mode): the two lips of a bite leave the edge at 67 degrees or less; the max per role is kept on window.__wearLip */
    const lipChk = function (q, sc, lead) {
      const n = q.length, ang = function (p, r) { return Math.atan2(Math.abs(r[1] - p[1]), Math.abs(r[0] - p[0]) * sc) * 180 / Math.PI; };
      const m = lead ? ang(q[n - 1], q[n - 2]) : Math.max(ang(q[0], q[1]), ang(q[n - 1], q[n - 2])), lip = window.__wearLip = window.__wearLip || {};
      lip[preset] = Math.max(lip[preset] || 0, m);
      if (m > 67.01) console.error("wear lip " + preset + " " + m.toFixed(1));
      /* the lead's outer wall runs off the box: the cut must reach 0.9 of its depth where it crosses the box side (s = 0); the least ratio per role is kept on window.__wearBox */
      if (lead) {
        let r = 0;
        for (let i = 1; i < n - 1; i++) if (q[i][0] < 0 && q[i + 1][0] >= 0) { r = (q[i][1] + (q[i + 1][1] - q[i][1]) * (0 - q[i][0]) / (q[i + 1][0] - q[i][0])) / Math.max.apply(null, q.map(function (p) { return p[1]; })); break; }
        const bx = window.__wearBox = window.__wearBox || {};
        bx[preset] = Math.min(bx[preset] === undefined ? 9 : bx[preset], r);
        if (r < 0.9) console.error("wear box side " + preset + " " + r.toFixed(2));
      }
    };
    /* bite polygon q (local frame, s in units of sc px, t in px, first and last vertex on or outside the box): split each rim segment into pieces of 3-5 grain lengths (12-20 px at the default grain) and nudge the rim vertices along the normal by 0.5-1.25 grain, the sign alternating with an occasional repeat; points on or outside the edge stay put */
    const rough = function (q, cap, sc, half, chip, fix, uneven) {
      if (rimAmp <= 0) return q;
      sc = sc || 1;
      let sg = rnd() < 0.5 ? 1 : -1;
      /* a vertex moves along the normal of its segment only (one axis); a and b are the neighbours that give the direction */
      const jv = function (p, a, b) {
        if (p[0] * sc < 1 || p[1] < 0.5) return p;
        const dx = (b[0] - a[0]) * sc, dy = b[1] - a[1], ln = Math.hypot(dx, dy) || 1, dd = (sg = rnd() < 0.2 ? sg : -sg) * rimAmp * (0.5 + rnd() * 0.75) * (half ? 0.5 : 1);
        return [p[0] - dy / ln * dd / sc, Math.min(Math.max(p[1] + dx / ln * dd, 1), cap)];
      };
      const out = [q[0]], js = [0], bs = [null], put = function (j, p) { out.push(j); bs.push(j === p ? null : p); };
      /* uneven (the image tear): each segment but the last two guards is cut into pieces of 8-40 px, no two neighbours alike (length and amplitude each 30% apart), amplitude 2-8 px (at most 0.38 of the piece); one piece is a flat (under 1 px) and the longest is a sharp notch (7.6-8 px); a piece is one bump vertex pushed off its middle, the piece ends stay on the line */
      const bi = [];
      let pcs = null;
      if (uneven) {
        const sgl = [], un = q.length - 3;
        for (let i = 0; i < un; i++) sgl.push(Math.hypot((q[i + 1][0] - q[i][0]) * sc, q[i + 1][1] - q[i][1]) / dpr);
        const far = function (v, p) { return !p || Math.abs(v - p) / Math.max(v, p) >= 0.35; };
        let Ls, As, cn;
        for (let tr = 0; tr < 60; tr++) {
          Ls = []; As = []; cn = [];
          let prev = 0;
          sgl.forEach(function (s) {
            const k = Math.max(1, Math.round(s / 22)), w = [];
            for (let j = 0; j < k; j++) { let v, t = 0; do { v = 8 + rnd() * 32; t++; } while (t < 30 && !far(v, prev)); w.push(v); prev = v; }
            const sum = w.reduce(function (x, y) { return x + y; }, 0);
            w.forEach(function (v) { Ls.push(v * s / sum); });
            cn.push(k);
          });
          let ni = 0;
          Ls.forEach(function (l, i) { if (l > Ls[ni]) ni = i; });
          let fi = Math.floor(rnd() * Ls.length);
          if (fi === ni) fi = (fi + 1) % Ls.length;
          let pa = 0;
          As = Ls.map(function (l, i) {
            if (i === ni) return pa = 7.6 + rnd() * 0.4;
            if (i === fi) return pa = 0.3 + rnd() * 0.5;
            let v, t = 0; do { v = 2 + rnd() * (Math.min(8, 0.38 * l) - 2); t++; } while (t < 30 && !far(v, pa));
            return pa = v;
          });
          let ok = Ls.length > 2 && Ls[ni] >= 20;
          for (let i = 0; i < Ls.length; i++) {
            if (Ls[i] < 8 || Ls[i] > 40.01) ok = false;
            if (i && (!far(Ls[i], Ls[i - 1]) || !far(As[i], As[i - 1]))) ok = false;
          }
          if (ok) break;
        }
        pcs = [];
        let pi = 0;
        for (let i = 0; i < q.length - 1; i++) {
          const a = q[i], b = q[i + 1];
          if (i >= un) { put(b, b); js.push(out.length - 1); continue; }
          const dx = (b[0] - a[0]) * sc, dy = b[1] - a[1], ln = Math.hypot(dx, dy) || 1;
          const ps = pi, cum = sgl[i];
          pi += cn[i];
          let pos = 0;
          for (let j = ps; j < pi; j++) {
            const f0 = pos / cum, f1 = (pos + Ls[j]) / cum, fm = (f0 + f1) / 2;
            const m = [a[0] + (b[0] - a[0]) * fm, a[1] + (b[1] - a[1]) * fm];
            sg = rnd() < 0.2 ? sg : -sg;
            const dd = sg * As[j] * dpr, mv = m[0] * sc < 1 || m[1] < 0.5 ? m : [m[0] - dy / ln * dd / sc, Math.min(Math.max(m[1] + dx / ln * dd, 1), cap)];
            put(mv, m); bi.push([out.length - 1, Ls[j]]);
            pos += Ls[j];
            if (j < pi - 1) { const e = [a[0] + (b[0] - a[0]) * f1, a[1] + (b[1] - a[1]) * f1]; put(e, e); }
          }
          put(b, b);
          js.push(out.length - 1);
        }
      }
      /* the name plate and the row-top corner (not chips): a facet over 24 px is cut into at least 2 pieces of unequal length, neighbours 30% or more apart, each piece about 14 px at most on average */
      const rag = !chip && (preset === "title" || preset === "row-top");
      const raggedFr = function (n) {
        const w = [];
        for (let k = 0; k < n; k++) {
          let v = 0.55 + rnd() * 0.95;
          if (k && Math.abs(v - w[k - 1]) / Math.max(v, w[k - 1]) < 0.3) v = w[k - 1] * 0.65 >= 0.55 ? w[k - 1] * 0.65 : w[k - 1] * 1.45;
          w.push(v);
        }
        const t = w.reduce(function (x, y) { return x + y; }, 0); let c = 0;
        return w.map(function (v) { c += v; return c / t; });
      };
      for (let i = 0; i < q.length - 1 && !uneven; i++) {
        const a = q[i], b = q[i + 1], sl = Math.hypot((b[0] - a[0]) * sc, b[1] - a[1]);
        let n = a[1] < 0 && b[1] < 0 ? 1 : Math.max(Math.ceil(sl / (5 * rimAmp) - 0.01), Math.round(sl / (rimAmp * (3 + 2 * rnd()))));
        const fr = rag && n > 1 && sl / dpr > 24 ? raggedFr(n = Math.max(n, 2, Math.ceil(sl / dpr / 14))) : null;
        for (let k = 1; k < n; k++) { const f = fr ? fr[k - 1] : k / n, p = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; put(jv(p, a, b), p); }
        if (i + 1 < q.length - 1 && !fix) put(jv(b, a, q[i + 2]), b); else put(b, b);
        js.push(out.length - 1);
      }
      /* turn check: a jittered vertex whose interior angle falls under 100 degrees (or turns back) is damped by halves, then dropped back to its place */
      const bad = function (i) {
        const p = out[i], ux = (out[i - 1][0] - p[0]) * sc, uy = out[i - 1][1] - p[1], vx = (out[i + 1][0] - p[0]) * sc, vy = out[i + 1][1] - p[1], m = Math.hypot(ux, uy) * Math.hypot(vx, vy);
        return !m || (ux * vx + uy * vy) / m > -0.1736;
      };
      for (let pass = 0; pass < 3; pass++) for (let i = 1; i < out.length - 1; i++) {
        if (!bs[i]) continue;
        for (let k = 0; k < 3 && bad(i); k++) out[i] = [bs[i][0] + (out[i][0] - bs[i][0]) / 2, bs[i][1] + (out[i][1] - bs[i][1]) / 2];
        if (bad(i)) out[i] = bs[i];
      }
      /* sheet check: the mean jitter of the rim vertices (css px, 3 or more of them) holds a floor of 1.5 px */
      let ra = 0, rc = 0;
      for (let i = 1; i < out.length - 1; i++) if (bs[i]) { ra += Math.hypot((out[i][0] - bs[i][0]) * sc, out[i][1] - bs[i][1]) / dpr; rc++; }
      if (rc >= 3 && ra / rc < (half ? 0.75 : 1.5)) console.error("CHECK FAIL rim mean " + preset + " " + seed + " " + (ra / rc).toFixed(2));
      /* sheet check (kinds mode), measured from the final vertices in css px: the mean rim piece (kept on window.__wearRim as [sum, count]), a facet over 24 px, a flat chip floor (under 5 degrees) */
      const seg = [], dm = Math.max.apply(null, out.map(function (p) { return p[1]; }));
      for (let i = 0; i < out.length - 1; i++) {
        const a = out[i], b = out[i + 1];
        if ((a[1] < 0.5 && b[1] < 0.5) || (a[0] * sc < 1 && b[0] * sc < 1)) continue;
        seg.push((Math.hypot((b[0] - a[0]) * sc, b[1] - a[1])) / dpr);
      }
      if (chip) {
        const dj = js.map(function (k) { return out[k][1]; }).filter(function (t) { return t >= 1; }), dmj = Math.max.apply(null, dj);
        for (let i = 0; i < dj.length; i++) for (let k = i + 1; k < dj.length; k++) if (Math.abs(dj[i] - dj[k]) < 0.15 * dmj) { console.error("CHECK FAIL flat floor " + preset); i = k = dj.length; }
      }
      const rm = window.__wearRim = window.__wearRim || {};
      rm[preset] = rm[preset] || [0, 0];
      seg.forEach(function (l) { rm[preset][0] += l; rm[preset][1]++; if (l > 24.01) console.error("CHECK FAIL facet " + preset + " " + l.toFixed(1) + " px"); });
      if (uneven) out.pcs = bi.map(function (e) { const m = bs[e[0]] || out[e[0]]; return [e[1], Math.hypot((out[e[0]][0] - m[0]) * sc, out[e[0]][1] - m[1]) / dpr]; });
      out.js = js;
      return out;
    };
    /* kinds mode: the deepest point of a scallop is never the centre: 0.28-0.42 or 0.58-0.72 along */
    const pkPick = function () { return rnd() < 0.5 ? 0.28 + rnd() * 0.14 : 0.58 + rnd() * 0.14; };
    /* kinds mode: a mid or button bite is a chip, a broken polyline of 3-5 segments (3-4 on a small box) on a unit chord: 2-4 inner vertices (2-3), uneven x spacing, the deepest point at pk (depth 1, a single vertex), every other depth at least 0.16 apart (0.33-0.84, no flat floor), the two walls that meet the edge no steeper than 50 degrees (hr is the deepest depth over the chord) */
    const chipPts = function (pk, hr) {
      const m = 2 + Math.floor(rnd() * (small ? 2 : 3)), nl = rnd() < 0.5 ? Math.floor((m - 1) / 2) : Math.ceil((m - 1) / 2), nr = m - 1 - nl, wall = 0.84 * hr, gap = 0.04;
      const side = function (n) { const r = []; for (let i = 0; i < n; i++) r.push(0.2 + rnd()); const t = r.reduce(function (a, b) { return a + b; }, 0) + 0.2 + rnd(); let c = 0; return r.map(function (v) { c += v; return c / t; }); };
      /* levels step down from 0.75 (the deepest vertex clears its neighbours by 0.25 of the depth); the two neighbours of the deepest vertex differ by 0.1 or more; redrawn, then forced */
      let lv, ld, rd;
      for (let tr = 0; tr < 12; tr++) {
        lv = []; for (let i = 0; i < m; i++) lv.push(0.75 - 0.16 * i - rnd() * 0.01);
        for (let i = lv.length - 1; i > 0; i--) { const k = Math.floor(rnd() * (i + 1)), t = lv[i]; lv[i] = lv[k]; lv[k] = t; }
        ld = lv.slice(0, nl).sort(function (a, b) { return a - b; }); rd = lv.slice(nl).sort(function (a, b) { return b - a; });
        const na = nl ? ld[nl - 1] : -1, nb = nr ? rd[0] : -1;
        if ((!nl || na <= 0.75) && (!nr || nb <= 0.75) && (!nl || !nr || Math.abs(na - nb) >= 0.1)) break;
        if (tr === 11) { lv = lv.map(function (v, i) { return 0.75 - 0.16 * i; }); ld = lv.slice(0, nl).sort(function (a, b) { return a - b; }); rd = lv.slice(nl).sort(function (a, b) { return b - a; }); }
      }
      const lx = side(nl).map(function (x) { return x * pk; }), rx = side(nr).map(function (x) { return pk + x * (1 - pk); }), out = [];
      if (nl) lx[0] = Math.min(Math.max(lx[0], ld[0] * wall), pk - gap * nl);
      for (let i = 1; i < nl; i++) lx[i] = Math.min(Math.max(lx[i], lx[i - 1] + gap), pk - gap * (nl - i));
      if (nr) rx[nr - 1] = Math.max(Math.min(rx[nr - 1], 1 - rd[nr - 1] * wall), pk + gap * nr);
      for (let i = nr - 2; i >= 0; i--) rx[i] = Math.max(Math.min(rx[i], rx[i + 1] - gap), pk + gap * (i + 1));
      lx.forEach(function (x, i) { out.push([x, ld[i]]); });
      out.push([pk, 1]);
      rx.forEach(function (x, i) { out.push([x, rd[i]]); });
      return out;
    };
    /* kinds mode, row-top lead bite: a union of discs clipped to the edge. 3-4 concave arcs of chords 0.45/0.2/0.35(/0.15) of size, shuffled per seed, neighbouring discs meet at cusps of intact material 70-110 degrees wide (one pair overlaps so little that its cusp is a tongue reaching 0.4 into the bite), the deepest disc peaks 0.3 along from the corner. Points are [s px along the edge from the corner, t px into the plate]; the first polygon is the bite, the rest are two flecks 4-8 px and a 3 px hairline nick on the edge */
    const bays1 = function (sd, corner, size, spec, att, msg) {
      const rr = rng(String(preset) + "|" + sd + "|bays|" + corner + (att ? "|" + att : "")), ra = function (a, b) { return a + rr() * (b - a); }, dg = Math.PI / 180, u = (spec && spec.dpr) || 1;
      /* spec.ch fixes the chords in order (the card corner: 0.25/0.5/0.25), no shuffle */
      const ch = spec && spec.ch ? spec.ch.slice() : [0.45, 0.2, 0.35]; if (!(spec && spec.ch) && !(spec && spec.work) && rr() < 0.5) ch.push(0.15);
      for (let i = ch.length - 1; i > 0 && !(spec && spec.ch); i--) { const k = Math.floor(rr() * (i + 1)), t = ch[i]; ch[i] = ch[k]; ch[k] = t; }
      const n = ch.length, r = ch.map(function (c) { return c / 2; }), cs = [0], tg = Math.floor(rr() * (n - 1));
      for (let i = 1; i < n; i++) {
        const r1 = r[i - 1], r2 = r[i], dist = function (al) { return Math.sqrt(r1 * r1 + r2 * r2 - 2 * r1 * r2 * Math.cos(al)); };
        let al = ra(70, 110) * dg;
        if (i - 1 === tg) { let best = 9; for (let a = 90; a <= 176; a++) { const e = Math.abs(r1 * r2 * Math.sin(a * dg) / dist(a * dg) / Math.min(r1, r2) - 0.6); if (e < best) { best = e; al = a * dg; } } }
        cs.push(cs[i - 1] + dist(al));
      }
      const k = size / (cs[n - 1] + r[n - 1] + (spec && spec.ch ? 0 : r[0]));
      let dp = 0; for (let i = 1; i < n; i++) if (r[i] > r[dp]) dp = i;
      /* the shift never pushes the first disc more than 0.4 of its radius off the corner, so no shuffle loses an arc */
      const sh = spec && spec.ch ? 0 : Math.max(0.3 * size - cs[dp] * k, 0.6 * r[0] * k), c = cs.map(function (v) { return v * k + sh; }), R = r.map(function (v) { return v * k; });
      /* each disc is a lumpy curve: radius R * (1 + A sin(7 th + ph)), A 0.11-0.16 tapered by sin(th) so the rim stays a function of x near the edge (the visible swing is checked to sit in 0.15-0.4), sampled over th 0..pi */
      const prof = R.map(function (Ri, i) {
        const A = ra(0.11, 0.16), ph = ra(0, 6.283), q = [];
        for (let j = 0; j <= 360; j++) { const th = Math.PI * j / 360, rho = Ri * (1 + A * Math.sin(th) * Math.sin(7 * th + ph)); q.push([c[i] + rho * Math.cos(th), rho * Math.sin(th), rho]); }
        return q;
      });
      let wn = 0, wr = 0;
      const dep = function (x) {
        let m = 0; wn = -1; wr = 0;
        for (let i = 0; i < n; i++) { const q = prof[i]; for (let j = 0; j < 360; j++) {
          const x0 = q[j][0], x1 = q[j + 1][0];
          if ((x0 - x) * (x1 - x) <= 0 && x0 !== x1) { const y = q[j][1] + (q[j + 1][1] - q[j][1]) * (x - x0) / (x1 - x0); if (y > m) { m = y; wn = i; wr = q[j][2]; } }
        } }
        return m;
      };
      let xe = 0; for (let i = 0; i < n; i++) xe = Math.max(xe, prof[i][0][0]);
      const poly = [[-2, 0], [-2, dep(0)]], jA = ra(1, 3) * u, rmn = [], rmx = [], cnt = [];
      for (let i = 0; i < n; i++) { rmn.push(1e9); rmx.push(0); cnt.push(0); }
      let x = 0, py = dep(0); if (wn >= 0) cnt[wn]++;
      while (x < xe - 0.05 * u) {
        let nx = Math.min(x + 1.5 * u, xe), ny = dep(nx);
        while (Math.hypot(nx - x, ny - py) > 4.5 * u && nx - x > 0.02) { nx = x + (nx - x) / 2; ny = dep(nx); }
        x = nx; py = ny;
        if (wn >= 0) { rmn[wn] = Math.min(rmn[wn], wr); rmx[wn] = Math.max(rmx[wn], wr); cnt[wn]++; }
        /* the jitter is clamped so no segment passes 6 px after it (the step before it is at most 4.5 px) */
        const pl = poly[poly.length - 1];
        let yy = x < xe - 3 * u && ny > 0 ? Math.max(0.3 * u, ny + (rr() * 2 - 1) * jA) : ny;
        const dxx = x - pl[0], lim = Math.sqrt(Math.max(0, 36 * u * u - dxx * dxx));
        yy = Math.min(Math.max(yy, pl[1] - lim), pl[1] + lim);
        poly.push([x, yy]);
      }
      poly.push([xe, 0]);
      /* radius variation per disc over the points that actually reach the outline (its visible span), not the whole disc */
      let lost = 0, vmin = 9, vmax = 0, sgm = 0;
      for (let i = 3; i < poly.length; i++) sgm = Math.max(sgm, Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]) / u);
      for (let i = 0; i < n; i++) { if (cnt[i] < 1) lost++; else { vmin = Math.min(vmin, rmx[i] / rmn[i] - 1); vmax = Math.max(vmax, rmx[i] / rmn[i] - 1); } }
      if (sgm > 6.01) msg.push("CHECK FAIL bays segment " + preset + " " + sd + " " + corner + " " + sgm.toFixed(2));
      msg.push("bays vis " + preset + " " + sd + " " + corner + " try " + att + " min " + vmin.toFixed(2) + " max " + vmax.toFixed(2) + " seg " + sgm.toFixed(2));
      if (lost) msg.push("CHECK FAIL bays arcs lost " + preset + " " + sd + " " + corner + " " + (n - lost) + "/" + n + " " + cnt.join() + " ch " + ch.join());
      if (vmin < 0.15) msg.push("CHECK FAIL bays arc circular " + preset + " " + sd + " " + corner + " " + vmin.toFixed(2));
      if (vmax > 0.4) msg.push("CHECK FAIL bays swing " + preset + " " + sd + " " + corner + " " + vmax.toFixed(2));
      const wk = !!(spec && spec.work), out = [poly], x1 = xe + ra(6, 24) * u, x2 = x1 + ra(8, 20) * u, xn = Math.min(xe + 60 * u, x2 + ra(10, 20) * u);
      [x1, x2].forEach(function (x) {
        const rd = ra(2, 4) * u, ty = rd + ra(1, 5) * u, f = [];
        /* a Work fleck is a round blob: 8 points within 5% of the radius */
        if (wk) for (let j = 0; j < 8; j++) f.push([x + Math.cos(j * 0.7854) * rd * ra(0.95, 1.05), ty + Math.sin(j * 0.7854) * rd * ra(0.95, 1.05)]);
        else for (let j = 0; j < 5; j++) f.push([x + Math.cos(j * 1.2566 + 0.4) * rd * ra(0.8, 1.15), ty + Math.sin(j * 1.2566 + 0.4) * rd * ra(0.8, 1.15)]);
        out.push(f);
      });
      /* Work corners are paint, not spikes: no nick, and the tip angle of every piece (neighbours 6 px away, adjacent ones on a fleck) stays 40 degrees or more */
      if (!wk) out.push([[xn - 0.8 * u, 0], [xn + 0.8 * u, 0], [xn + ra(-0.3, 0.3) * u, 3 * u]]);
      else {
        const tp = tipAngle(out, u);
        if (tp < 40) msg.push("CHECK FAIL work corner spike " + preset + " " + sd + " " + corner + " " + tp.toFixed(0));
      }
      return out;
    };
    /* the smallest convex tip angle (degrees) over the pieces: the neighbours are the first vertices 6 px away along the outline (adjacent ones on a piece of 10 vertices or fewer) */
    const tipAngle = function (pieces, u) {
      let mn = 180;
      pieces.forEach(function (pl) {
        const n = pl.length; let ar = 0;
        for (let i = 0; i < n; i++) { const a = pl[i], b = pl[(i + 1) % n]; ar += a[0] * b[1] - b[0] * a[1]; }
        const walk = function (i, d) {
          let j = (i + d + n) % n;
          if (n > 10) for (let k = 0; k < n && Math.hypot(pl[j][0] - pl[i][0], pl[j][1] - pl[i][1]) < 6 * u; k++) j = (j + d + n) % n;
          return j;
        };
        for (let i = 0; i < n; i++) {
          const b = pl[i], a = pl[walk(i, -1)], c = pl[walk(i, 1)], p = [a[0] - b[0], a[1] - b[1]], q = [c[0] - b[0], c[1] - b[1]];
          if (((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])) * ar <= 0) continue;
          const l = Math.hypot(p[0], p[1]) * Math.hypot(q[0], q[1]);
          if (l > 0) mn = Math.min(mn, Math.acos(Math.max(-1, Math.min(1, (p[0] * q[0] + p[1] * q[1]) / l))) * 180 / Math.PI);
        }
      });
      return mn;
    };
    /* a shuffle or phase that buries an arc, leaves a visible span under 15% swing or a segment over 6 px is redrawn (up to 40 tries); the last try's CHECK FAIL lines are printed */
    let baysCap = false;
    const bays = function (sd, corner, size, spec) {
      let out = null, msg = null, t = 0;
      for (; t < 40; t++) {
        msg = [];
        out = bays1(sd, corner, size, spec, t, msg);
        if (!msg.some(function (m) { return m.indexOf("CHECK FAIL") === 0; })) break;
      }
      if (t === 40 && !baysCap) { baysCap = true; console.error("bays retries hit 40 " + preset + " " + sd + " " + corner); }
      msg.forEach(function (m) { console.error(m); });
      return out;
    };
    /* kinds mode, mid bite (Work and the other non-flake roles): a chip of lifted paint. A wide shallow gap, width 2.2-3.2x its depth, depth 0.18-0.3 of the row height h, a near-flat floor (within 1.5 px of a line, 1-2 px grain) over 60-80% of the width, two straight sides at 50-75 degrees to the edge, and a lip of 3-5 half-ellipse lumps (3-8 px wide, 1-3 px high, uneven, one neighbouring width ratio of 1.4 or more) either side of the mouth, eating inward, plus 0-2 round flecks of 2-4 px within 8 px of the chip. Points are [s along the edge, t into the plate]. Sheet CHECK FAIL for mid floor, size, depth, lumps, arc circular (5 consecutive samples on one circle within 1 px) and segment (over 6 px) */
    const chip1 = function (sd, h, dpr2, att, msg, LL) {
      const rr = rng(String(preset) + "|" + sd + "|chip" + (att ? "|" + att : "")), ra = function (a, b) { return a + rr() * (b - a); }, dg = Math.PI / 180, u = dpr2 || 1;
      const nl = 3 + Math.floor(rr() * 3), nL = Math.floor(rr() * (nl + 1)), lw = [], lh = [];
      let rmax = 1;
      for (let k = 0; k < 60 && rmax < 1.4; k++) {
        lw.length = 0; lh.length = 0; rmax = 1;
        for (let i = 0; i < nl; i++) { lw.push(ra(3, 8) * u); lh.push(ra(1, 3) * u); }
        for (let i = 1; i < nl; i++) rmax = Math.max(rmax, lw[i] / lw[i - 1], lw[i - 1] / lw[i]);
      }
      /* the whole chip (lip lumps, mouth and flecks) fits 0.85 of its slot LL: lumps shrink to at most a third of that, the mouth takes the rest and the depth follows it down (floor 0.12 h) */
      const slotCap = 0.85 * LL;
      let lsum = 0; lw.forEach(function (w) { lsum += w; });
      if (lsum > slotCap / 3) { const f = slotCap / 3 / lsum; for (let i = 0; i < nl; i++) lw[i] *= f; lsum = slotCap / 3; }
      const avail = slotCap - lsum;
      let D = 0, cw = 0, ang = 0, run = 0, fl = 0, scaled = false;
      for (let k = 0; k < 60; k++) {
        const D0 = ra(0.18, 0.3) * h, r0 = ra(2.2, 3.2);
        cw = r0 * D0; D = D0; scaled = false;
        if (cw > avail) { cw = avail; D = Math.max(0.12 * h, cw / r0); scaled = true; }
        run = (1 - ra(0.62, 0.78)) * cw / 2; ang = Math.atan(D / run); fl = cw - 2 * run; if (ang >= 50 * dg && ang <= 75 * dg) break;
      }
      const lump = function (poly, x0, w, hh) {
        const m = Math.max(3, Math.ceil(w / (2.5 * u)));
        for (let j = 1; j < m; j++) poly.push([x0 + w * j / m, Math.max(0.3 * u, hh * Math.sin(Math.PI * j / m))]);
        poly.push([x0 + w, 0]);
      };
      const poly = [[0, 0]];
      let x = 0, fx0 = 0, fx1 = 0;
      for (let i = 0; i < nL; i++) { lump(poly, x, lw[i], lh[i]); x += lw[i]; }
      const sx = x;
      /* left side, floor, right side: straight runs split under 5.5 px, 0.4 px jitter on the sides, 1-2 px grain on the floor */
      const gr = ra(1, 2) * u * 0.5, side = function (xa, ta, xb, tb, jit) {
        const m = Math.max(1, Math.ceil(Math.hypot(xb - xa, tb - ta) / (jit ? 5 * u : 3 * u)));
        for (let j = 1; j <= m; j++) poly.push(j === m ? [xb, tb] : [xa + (xb - xa) * j / m, Math.max(0.3 * u, tb + (ta - tb) * (m - j) / m + (rr() * 2 - 1) * (jit ? 0.4 * u : gr))]);
      };
      /* the corner vertices sit on the floor line; the grain only moves the points between */
      side(sx, 0, sx + run, D, true); fx0 = sx + run;
      side(sx + run, D, sx + run + fl, D, false); fx1 = sx + run + fl;
      side(fx1, D, fx1 + run, 0, true);
      x = fx1 + run;
      for (let i = nL; i < nl; i++) { lump(poly, x, lw[i], lh[i]); x += lw[i]; }
      let sgm = 0, flo = 0;
      for (let i = 1; i < poly.length; i++) sgm = Math.max(sgm, Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]) / u);
      poly.forEach(function (p) { if (p[0] > fx0 + 1e-6 && p[0] < fx1 - 1e-6) flo = Math.max(flo, Math.abs(p[1] - D)); });
      let circ = false;
      for (let i = 0; i + 4 < poly.length && !circ; i++) {
        const a = poly[i], b = poly[i + 2], c = poly[i + 4], dd = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
        if (Math.abs(dd) < 1e-9) continue;
        const a2 = a[0] * a[0] + a[1] * a[1], b2 = b[0] * b[0] + b[1] * b[1], c2 = c[0] * c[0] + c[1] * c[1];
        const ox = (a2 * (b[1] - c[1]) + b2 * (c[1] - a[1]) + c2 * (a[1] - b[1])) / dd, oy = (a2 * (c[0] - b[0]) + b2 * (a[0] - c[0]) + c2 * (b[0] - a[0])) / dd, R = Math.hypot(a[0] - ox, a[1] - oy);
        if (R > 12 * u) continue;
        let ok = true; for (let k = 0; k < 5; k++) if (Math.abs(Math.hypot(poly[i + k][0] - ox, poly[i + k][1] - oy) - R) > 1 * u) ok = false;
        if (ok) circ = true;
      }
      const total = x, ff = fl / cw;
      if (ff < 0.6 || ff > 0.8 || flo > 1.5 * u + 1e-6) msg.push("CHECK FAIL mid floor " + preset + " " + sd + " " + ff.toFixed(2) + " " + (flo / u).toFixed(2));
      if (cw / D < 2.2 - 1e-6 || cw / D > 3.2 + 1e-6) msg.push("CHECK FAIL mid slot ratio " + preset + " " + sd + " " + (cw / D).toFixed(2));
      if (ang < 50 * dg - 1e-6 || ang > 75 * dg + 1e-6) msg.push("CHECK FAIL mid size " + preset + " " + sd + " " + (cw / D).toFixed(2));
      if (total > 0.85 * LL + 1e-6 || poly.some(function (p) { return p[0] < -1e-6 || p[0] > LL + 1e-6; })) msg.push("CHECK FAIL mid slot " + preset + " " + sd + " " + (total / LL).toFixed(2));
      if (D / h < (scaled ? 0.12 : 0.18) - 1e-6 || D / h > 0.3 + 1e-6) msg.push("CHECK FAIL mid depth " + preset + " " + sd + " " + (D / h).toFixed(2));
      if (nl < 3 || nl > 5 || rmax < 1.4) msg.push("CHECK FAIL mid lumps " + preset + " " + sd + " " + nl + " " + rmax.toFixed(2));
      if (circ) msg.push("CHECK FAIL mid arc circular " + preset + " " + sd);
      if (sgm > 6.01) msg.push("CHECK FAIL mid segment " + preset + " " + sd + " " + sgm.toFixed(2));
      msg.push("mid chip " + preset + " " + sd + " w/d " + (cw / D).toFixed(2) + " floor " + ff.toFixed(2) + " lumps " + nl + " ratio " + rmax.toFixed(2) + " seg " + sgm.toFixed(2));
      const out = [poly];
      const nf = Math.floor(rr() * 3);
      for (let k = 0; k < nf; k++) {
        const r = ra(1, 2) * u, cx = ra(Math.max(r, sx - 8 * u), Math.min(total - r, total + 8 * u)), cy = D + r + ra(1.5, 6) * u, fp = [];
        for (let j = 0; j < 8; j++) fp.push([cx + r * Math.cos(j * Math.PI / 4), cy + r * Math.sin(j * Math.PI / 4)]);
        out.push(fp);
      }
      return out;
    };
    /* redrawn (up to 40 tries) while a check fails; the last try's lines are printed */
    const chip = function (sd, h, dpr2, LL) {
      let out = null, msg = null;
      for (let t = 0; t < 40; t++) {
        msg = [];
        out = chip1(sd, h, dpr2, t, msg, LL);
        if (!msg.some(function (m) { return m.indexOf("CHECK FAIL") === 0; })) break;
      }
      msg.forEach(function (m) { console.error(m); });
      return out;
    };
    /* kinds mode, Experience mid bite: an enamel flake. A polygon of 4-6 facets with straight-ish sides (2-4 px wobble), one or two sharp inward points (under 80 degrees), no arcs; the same size and depth bands as arcPair (width 0.6-0.8 of a 0.35H lead, depth 0.28-0.35 of the width). Sheet CHECK FAIL "exp flake arcs" for a facet count outside 4-6, a facet bowing over 4 px off its chord, or a missing sharp point */
    const flake = function (sd, h, u) {
      u = u || 1;
      const rr = rng(String(preset) + "|" + sd + "|flake"), ra = function (a, b) { return a + rr() * (b - a); }, dg = Math.PI / 180;
      const lead = 0.35 * h, cw = ra(0.6, 0.8) * lead, D = ra(0.28, 0.35) * cw, wb = ra(2, 4) * u;
      let vs = null, sharp = 0;
      for (let t = 0; t < 200; t++) {
        const nf = 4 + Math.floor(rr() * 3), ns = 1 + Math.floor(rr() * 2), v = [[0, 0]], wt = [];
        let tot = 0; for (let i = 0; i < nf; i++) { wt.push(ra(0.6, 1.4)); tot += wt[i]; }
        const pk = [], first = 1 + Math.floor(rr() * (nf - 1)); pk.push(first); if (ns > 1) pk.push(1 + (first - 1 + 1 + Math.floor(rr() * (nf - 2))) % (nf - 1));
        let x = 0;
        for (let i = 1; i < nf; i++) { x += wt[i - 1] / tot * cw; v.push([x, (pk.indexOf(i) >= 0 ? (i === pk[0] ? ra(0.9, 1) : ra(0.65, 0.8)) : ra(0.25, 0.55)) * D]); }
        v.push([cw, 0]);
        sharp = 0; let ok = pk.length === ns && (ns === 1 || pk[1] !== pk[0]);
        for (let i = 1; i < nf && ok; i++) {
          const a = v[i - 1], b = v[i], c2 = v[i + 1], p = [a[0] - b[0], a[1] - b[1]], q = [c2[0] - b[0], c2[1] - b[1]];
          const an = Math.acos((p[0] * q[0] + p[1] * q[1]) / Math.hypot(p[0], p[1]) / Math.hypot(q[0], q[1])) / dg;
          if (pk.indexOf(i) >= 0) { if (an > 80) ok = false; else sharp++; }
          if (Math.hypot(p[0], p[1]) < 0.08 * cw) ok = false;
        }
        if (ok && sharp === ns) { vs = v; break; }
        vs = v;
      }
      const nf = vs.length - 1, poly = [[0, 0]];
      let bow = 0, sgm = 0;
      for (let i = 0; i < nf; i++) {
        const a = vs[i], b = vs[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), m = Math.max(1, Math.ceil(L / (5 * u)));
        for (let j = 1; j <= m; j++) {
          let p = [a[0] + (b[0] - a[0]) * j / m, a[1] + (b[1] - a[1]) * j / m];
          if (j < m) { const off = (rr() * 2 - 1) * wb * 0.5; p = [p[0], Math.max(0.3 * u, Math.min(D, p[1] + off))]; bow = Math.max(bow, Math.abs(p[1] - (a[1] + (b[1] - a[1]) * j / m))); }
          else p = [b[0], b[1]];
          const pl = poly[poly.length - 1], lim = Math.sqrt(Math.max(0, 36 * u * u - (p[0] - pl[0]) * (p[0] - pl[0])));
          if (j < m) p[1] = Math.min(Math.max(p[1], pl[1] - lim), pl[1] + lim);
          poly.push(p);
        }
      }
      for (let i = 1; i < poly.length; i++) sgm = Math.max(sgm, Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]) / u);
      if (nf < 4 || nf > 6 || bow > 4.01 * u || sharp < 1 || sharp > 2) console.error("CHECK FAIL exp flake arcs " + preset + " " + sd + " facets " + nf + " bow " + (bow / u).toFixed(1) + " sharp " + sharp);
      if (sgm > 6.01) console.error("CHECK FAIL mid segment " + preset + " " + sd + " " + sgm.toFixed(2));
      console.error("exp flake " + preset + " " + sd + " facets " + nf + " sharp " + sharp + " bow " + (bow / u).toFixed(1) + " seg " + sgm.toFixed(2));
      return [poly];
    };
    /* kinds mode, Experience corner: a cluster of 2-3 enamel flakes, straight facets only. The biggest sits on the corner (0.5-0.8 of size wide, running from 2 px outside the plate), one more along the first edge and, half the time, one along the other edge (the corner frame is square, so its points swap s and t), all within 1.5x size, plus 0-2 square specks of 3-5 px. Each flake is 4-6 facets of 6-30 px with a sharp inner point (under 80 degrees) when one fits, no two adjacent facets both within 12 degrees of a box edge. Points are [s px along the edge, t px into the plate]; sheet CHECK FAIL "exp corner arcs" (curvature on 3+ consecutive samples) and "exp corner facets" (a facet outside 6-30 px) */
    const flakeCorner = function (sd, corner, size, u) {
      u = u || 1;
      const rr = rng(String(preset) + "|" + sd + "|fcorner|" + corner), ra = function (a, b) { return a + rr() * (b - a); }, dg = Math.PI / 180, out = [], facs = [];
      const near = function (a, b) { const an = Math.abs(Math.atan2(b[1] - a[1], b[0] - a[0])) / dg % 90; return Math.min(an, 90 - an) < 12; };
      /* one facet chain from its start to [w, 0]; anchored chains start at [-2 px, V0] on the corner side */
      const chain = function (w, D, anch) {
        let best = null;
        for (let t = 0; t < 400; t++) {
          const nf = 4 + Math.floor(rr() * 3), v = [anch ? [-2 * u, ra(0.7, 1) * D] : [0, 0]], wt = [], pk = 1 + Math.floor(rr() * (nf - 1));
          let tot = 0; for (let i = 0; i < nf; i++) { wt.push(ra(0.6, 1.4)); tot += wt[i]; }
          let x = v[0][0];
          for (let i = 1; i < nf; i++) { x += wt[i - 1] / tot * (w - v[0][0]); v.push([x, (i === pk ? ra(0.85, 1) : ra(0.25, 0.6)) * D]); }
          v.push([w, 0]);
          let ok = true, sharp = false;
          for (let i = 0; i < nf; i++) {
            const L = Math.hypot(v[i + 1][0] - v[i][0], v[i + 1][1] - v[i][1]) / u;
            if (L < 6 || L > 30) ok = false;
            if (i && near(v[i - 1], v[i]) && near(v[i], v[i + 1])) ok = false;
          }
          for (let i = 1; i < nf; i++) {
            const p = [v[i - 1][0] - v[i][0], v[i - 1][1] - v[i][1]], q = [v[i + 1][0] - v[i][0], v[i + 1][1] - v[i][1]];
            if (Math.acos((p[0] * q[0] + p[1] * q[1]) / Math.hypot(p[0], p[1]) / Math.hypot(q[0], q[1])) / dg < 80) sharp = true;
          }
          best = v;
          if (ok && (sharp || t > 200)) break;
        }
        for (let i = 0; i + 1 < best.length; i++) facs.push(Math.hypot(best[i + 1][0] - best[i][0], best[i + 1][1] - best[i][1]) / u);
        return anch ? [[-2 * u, 0]].concat(best) : best;
      };
      const w0 = ra(0.5, 0.8) * size + 2 * u, D0 = ra(0.35, 0.55) * (w0 - 2 * u);
      out.push(chain(w0, D0, true));
      const s1 = w0 + ra(0.08, 0.2) * size, w1 = ra(0.35, 0.55) * size, c1 = chain(w1, ra(0.3, 0.4) * w1, false);
      out.push(c1.map(function (p) { return [p[0] + s1, p[1]]; }));
      if (rr() < 0.5) {
        const t0 = D0 + ra(0.06, 0.15) * size, w2 = ra(0.35, 0.55) * size, c2 = chain(w2, ra(0.3, 0.4) * w2, false);
        out.push(c2.map(function (p) { return [p[1], p[0] + t0]; }));
      }
      for (let i = 0, ns = Math.floor(rr() * 3); i < ns; i++) {
        const h = ra(1.5, 2.5) * u, a = ra(-15, 15) * dg, cx = ra(0.3, 1.4) * size, cy = ra(3, 10) * u + h;
        out.push([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(function (p) { return [cx + (p[0] * Math.cos(a) - p[1] * Math.sin(a)) * h, cy + (p[0] * Math.sin(a) + p[1] * Math.cos(a)) * h]; }));
      }
      /* the curvature test: each piece resampled every 5 px, a gradual turn (3-25 degrees, sharper ones are facet vertices) on 3 or more consecutive samples is an arc */
      let arcs = 0;
      out.forEach(function (pl) {
        const sm = [];
        for (let i = 0; i < pl.length; i++) {
          const a = pl[i], b = pl[(i + 1) % pl.length], m = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (5 * u)));
          for (let j = 0; j < m; j++) sm.push([a[0] + (b[0] - a[0]) * j / m, a[1] + (b[1] - a[1]) * j / m]);
        }
        let run = 0;
        for (let i = 0; i < sm.length * 2; i++) {
          const a = sm[i % sm.length], b = sm[(i + 1) % sm.length], c = sm[(i + 2) % sm.length], tn = Math.abs(Math.atan2((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]), (b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1]))) / dg;
          run = tn > 3 && tn < 25 ? run + 1 : 0; if (run >= 3) arcs++;
        }
      });
      const fmn = Math.min.apply(null, facs), fmx = Math.max.apply(null, facs);
      if (arcs) console.error("CHECK FAIL exp corner arcs " + preset + " " + sd + " " + corner + " " + arcs);
      if (fmn < 6 || fmx > 30) console.error("CHECK FAIL exp corner facets " + preset + " " + sd + " " + corner + " " + fmn.toFixed(1) + "-" + fmx.toFixed(1));
      console.error("exp corner " + preset + " " + sd + " " + corner + " pieces " + out.length + " facets " + fmn.toFixed(1) + "-" + fmx.toFixed(1));
      return out;
    };
    /* kinds mode: corner, kind, severity and run length each read their own hash lane of the seed, so they vary independently */
    const lane = function (n, sd) { return rng(String(preset) + "|" + (sd === undefined ? seed : sd) + "|" + n)(); };
    const small = kz && Scss < 64;
    /* small boxes: severity and run bucket of the last seven seeds are walked in order and moved off any (severity, run bucket) pair an earlier seed took, so two seeds of one role never match */
    const smallSR = function () {
      const sn = Number(seed), used = {};
      for (let s = Number.isFinite(sn) ? (sn > 200 ? sn - 6 : 0) : sn; ; s++) {
        const sd = Number.isFinite(sn) ? s : seed, rf = lane("run", sd) * 3;
        let ix = Math.floor(lane("sev", sd) * 3) * 3 + Math.floor(rf);
        for (let t = 0; t < 9 && used[ix]; t++) ix = (ix + 1) % 9;
        used[ix] = 1;
        if (!Number.isFinite(sn) || s >= sn) return [Math.floor(ix / 3), (ix % 3 + rf % 1) / 3];
      }
    };
    const sr = small ? smallSR() : null;
    const sev = kz ? (sr ? sr[0] : Math.floor(lane("sev") * 3)) : 1, sevD = sev === 0 ? 0.5 : 1, run = kz ? (sr ? sr[1] : lane("run")) : 0;
    /* the card preset (kinds mode) keeps its wear small and calm: one corner, depth at most 20% of the short side, runs at most 0.2x the edge */
    const mid = kz && !small && P === wearPresets.card, runF = small ? 0.3 : mid ? 0.2 : 0.4;
    /* depth floor (px: 8 / 12 / 16 by severity under a 64 px short side, else 6 scaled by severity) and cap (50% of the shorter side on small boxes, else 35%) so small boxes show a clear cut, never one crossing the far edge */
    const floorD = (small ? [8, 12, 16][sev] : Math.max(4, 6 * sevD)) * dpr, capD = (small ? 0.5 : mid ? 0.2 : preset === "image" ? 0.6 : 0.35) * Math.min(W, H);
    const fl = function (x) { return kz ? Math.min(Math.max(x, floorD), capD) : x; };
    /* lead pick (corner of n, kind of K) from the seed's own lanes; if it repeats either of the previous two seeds' pairs, step the kind, then the corner; a (corner, kind, severity) triple already used twice is skipped too; on a small box a corner an earlier seed led with is skipped as well, the kind is picked evenly */
    const leadPick = function (n, K) {
      const sn = Number(seed), from = Number.isFinite(sn) ? (sn > 200 ? sn - 6 : 0) : sn;
      const hist = [], used = {};
      for (let s = from; ; s++) {
        const sd = Number.isFinite(sn) ? s : seed;
        let c = Math.floor(lane("corner", sd) * n), k = Math.floor(lane("kind", sd) * K);
        const sv = Math.floor(lane("sev", sd) * 3), bad = small ? function () { return used["c" + c] >= 1 || hist.some(function (h) { return h[0] === c && h[1] === k; }); } : function () { return hist.some(function (h) { return h[0] === c && h[1] === k; }) || used[c + "|" + k + "|" + sv] >= 2; };
        for (let t = 0; t < n * K && bad(); t++) {
          if (small) { c = (c + 1) % n; continue; }
          k = (k + 1) % K;
          if (k === 0 && n > 1) c = (c + 1) % n;
        }
        if (small) used["c" + c] = 1; else used[c + "|" + k + "|" + sv] = (used[c + "|" + k + "|" + sv] || 0) + 1;
        hist.push([c, k]); if (hist.length > 2) hist.shift();
        if (!Number.isFinite(sn) || s >= sn) return hist[hist.length - 1];
      }
    };
    /* spread rows (kinds mode): lead corner, lead size and the middle notch positions come from the seed's own lanes; a (corner, size) pair or a (count, first position) pair an earlier seed of this preset took is stepped on, so no two of the first seeds share an outline */
    const spreadPick = function () {
      const sn = Number(seed), usedH = {};
      for (let s = Number.isFinite(sn) ? (sn > 200 ? sn - 6 : 0) : sn; ; s++) {
        const sd = Number.isFinite(sn) ? s : seed;
        let cnt = Math.floor(lane("sev", sd) * 3), c = Math.floor(lane("corner", sd) * 2), hb = Math.floor(lane("hump", sd) * 3), b0 = Math.floor(lane("p0", sd) * 4);
        /* coarse key: (notch count, big or small hump); an earlier seed's key is stepped on, so position alone never makes two seeds differ */
        for (let t = 0; t < 6 && usedH[cnt + "|" + (hb ? 1 : 0)]; t++) { cnt = (cnt + 1) % 3; if (t % 3 === 2) hb = hb ? 0 : 2; }
        usedH[cnt + "|" + (hb ? 1 : 0)] = 1;
        if (!Number.isFinite(sn) || s >= sn) return { c: c, cnt: cnt, hf: [0.7, 0.85, 1][hb], pos: [(b0 + lane("p0f", sd)) / 4, (Math.floor(lane("p1", sd) * 4) + lane("p1f", sd)) / 4] };
      }
    };
    const wearSites = [];
    if (segs && segs.length && P.spread) {
      const dm = (kz ? Math.min(Math.max(10, Math.min(P.max || 44, P.depth / 100 * Scss)) * dpr * sevD, capD) : Math.max(10, Math.min(P.max || 44, P.depth / 100 * Scss)) * dpr);
      const lenOf = function (s) { return Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]); };
      const info = []; let tot = 0;
      segs.forEach(function (s) {
        const len = lenOf(s) * dpr;
        if (len < 1) return;
        const A = [s[0][0] * dpr, s[0][1] * dpr], ux = (s[1][0] - s[0][0]) * dpr / len, uy = (s[1][1] - s[0][1]) * dpr / len;
        let nx = -uy, ny = ux;
        if (nx * (W / 2 - A[0] - ux * len / 2) + ny * (H / 2 - A[1] - uy * len / 2) < 0) { nx = -nx; ny = -ny; }
        info.push({ A: A, ux: ux, uy: uy, nx: nx, ny: ny, s0: tot, len: len }); tot += len;
      });
      /* a point at arclength s along the whole polyline, pushed p px toward the box centre */
      const at = function (s, p) {
        let m = info[info.length - 1];
        for (let i = 0; i < info.length; i++) if (s <= info[i].s0 + info[i].len) { m = info[i]; break; }
        const a = Math.max(0, Math.min(m.len, s - m.s0)) + (s < 0 ? s : s > m.s0 + m.len ? s - m.s0 - m.len : 0);
        return [m.A[0] + m.ux * a + m.nx * p, m.A[1] + m.uy * a + m.ny * p];
      };
      /* stepped shard: deep side at arclength sc, running dir (+1/-1) for L px, 3-5 descending steps to the edge; the base starts 2 px outside */
      const bite = function (sc, dir, L, d, mid) {
        const n = 3 + Math.floor(rnd() * 3), o = kz ? 0 : -2;
        let q = [[-2 / L, o], [-2 / L, d], [0, d]];
        for (let k = 1; k <= n; k++) q.push([k / (n + 0.5) * (0.85 + rnd() * 0.15), d * (1 - k / (n + 0.5)) * (0.8 + rnd() * 0.3)]);
        q.push([1, o]);
        if (kz) {
          (mid ? (preset === "exp-spread" ? flake : chip)(seed + "|" + sc.toFixed(0), H, dpr, L) : preset === "exp-spread" ? flakeCorner(seed, dir > 0 ? 0 : 1, (0.35 + rnd() * 0.15) * H, dpr) : bays(seed, dir > 0 ? 0 : 1, (0.35 + rnd() * 0.15) * H, { dpr: dpr, work: true })).forEach(function (pl) {
            g.beginPath();
            pl.forEach(function (p, j) { const c = at(sc + dir * p[0], p[1]); if (j) g.lineTo(c[0], c[1]); else g.moveTo(c[0], c[1]); });
            g.closePath(); g.fill();
          });
          return;
        }
        g.beginPath();
        q.forEach(function (p, j) {
          const c = at(sc + dir * p[0] * L, p[1]);
          if (j) g.lineTo(c[0], c[1]); else g.moveTo(c[0], c[1]);
        });
        g.closePath(); g.fill();
      };
      if (info.length) {
        /* where the polyline is inside the visible box: the corner shards sit at its first and last visible points */
        const inBox = function (s) { const c = at(s, 0); return c[0] >= -1 && c[0] <= W + 1 && c[1] >= -1 && c[1] <= H + 1; };
        let sIn = 0, sOut = tot;
        while (sIn < tot && !inBox(sIn)) sIn += 1;
        while (sOut > sIn && !inBox(sOut)) sOut -= 1;
        const vis = Math.max(1, sOut - sIn);
        const sl = function (d) { return Math.min(d * (2 + (kz ? run : rnd()) * 2), vis * 0.3); };
        const sp = kz ? spreadPick() : null;
        let d = dm * (0.9 + rnd() * 0.1) * (sp ? sp.hf : 1), L = sl(d);
        if (!kz) {
          /* baseline: the plate's end shard at each end of the run (tl, tr), one small mid bite (top) and, above scale 1, crumbs along it */
          const sr = rng(String(preset) + "|" + seed + "|specks"), dS = bd * (0.6 + rnd() * 0.4);
          const put = function (sc, dir, LL, dd, end) {
            const q = end ? [[0, -2], [0, dd * (0.85 + rnd() * 0.15)], [0.22, dd * (0.65 + rnd() * 0.3)], [0.55, dd * (0.3 + rnd() * 0.3)], [1, -2]]
              : [[0, -2], [0.3, dd * (0.55 + rnd() * 0.3)], [0.5, dd], [0.8, dd * (0.3 + rnd() * 0.4)], [1, -2]];
            g.beginPath();
            q.forEach(function (p, j) { const c = at(sc + dir * p[0] * LL, p[1]); if (j) g.lineTo(c[0], c[1]); else g.moveTo(c[0], c[1]); });
            g.closePath(); if (!mute) g.fill();
          };
          if (P.spread) {
            /* row-top plates: four to seven chips on the top run (the Experience box one: three to five, on 0.12-0.88 of its top run), away from the corners: one big tear, one or two medium tears, the rest small nicks, each an angular flake; a row with a picture keeps them on its text side, clear of the picture and the corners */
            const kr = rng(String(preset) + "|" + seed + "|k"), cn = seed === "xp-wear" ? 9 : 4 + Math.floor(kr() * 4), nmed = 1 + (kr() < 0.5 ? 1 : 0);
            let sa = sIn + (seed === "xp-wear" ? 0.08 : 0.15) * vis, sb = sIn + (seed === "xp-wear" ? 0.92 : 0.85) * vis;
            if (opts && opts.free) {
              const fl = opts.free[0] * dpr, fh = opts.free[1] * dpr;
              let a = -1, b = -1;
              for (let s = sIn; s <= sOut; s += 1) { const x = at(s, 0)[0]; if (x >= fl && x <= fh) { if (a < 0) a = s; b = s; } }
              if (a >= 0) { sa = a; sb = b; }
            }
            sa = Math.max(sa, sIn + 0.1 * vis); sb = Math.min(sb, sOut - 0.1 * vis);   /* never nearer a run end than a tenth of the run: past it the edge is a corner or off the plate */
            /* each chip is a short stretch of the label wear's torn edge (banner.js TAB_CLIP: an uneven jagged floor, a steep wall and a long one, no symmetric V); the profile maths are ported here, seeded like the rest of this wear, since the banner's edge is a fixed clip polygon */
            const chipEdge = function (dd, big) {
              /* a tear: big ones have 4-7 floor vertices at uneven steps and depths (small reversals allowed) and a vertex off the line in each wall; nicks have 2-3 */
              const k = big ? 4 + Math.floor(rnd() * 4) : 2 + Math.floor(rnd() * 2), gp = [];
              let tot = 0;
              for (let j = 0; j <= k; j++) { const gq = 0.35 + rnd() * 1.1; gp.push(gq); tot += gq; }
              const fl = [];
              let x = 0.06 + rnd() * 0.06, last = 0.5;
              for (let j = 0; j < k; j++) {
                x += gp[j] / tot * 0.82;
                let h = j === 0 ? 0.55 + rnd() * 0.45 : j === k - 1 ? 0.2 + rnd() * 0.4 : 0.25 + rnd() * 0.75;
                if (Math.abs(h - last) < 0.12) h = h > 0.6 ? h - 0.2 : h + 0.2;
                fl.push([x, h]); last = h;
              }
              const xe = Math.max(x + 0.06, 0.92 + rnd() * 0.08), pr = [[0, 0]];
              if (big) pr.push([fl[0][0] * (0.35 + rnd() * 0.3), fl[0][1] * (rnd() < 0.5 ? 0.12 + rnd() * 0.2 : 0.6 + rnd() * 0.25)]);
              fl.forEach(function (p) { pr.push(p); });
              if (big) { const lf = fl[fl.length - 1]; pr.push([lf[0] + (xe - lf[0]) * (0.35 + rnd() * 0.3), lf[1] * (rnd() < 0.5 ? 0.1 + rnd() * 0.25 : 0.55 + rnd() * 0.25)]); }
              pr.push([xe, 0]);
              const mx = Math.max.apply(null, pr.map(function (p) { return p[1]; }));
              return pr.map(function (p) { return [p[0] / xe, p[1] / mx * dd]; });
            };
            const placed = [], span = sb - sa, xpw = seed === "xp-wear";
            /* the Experience box: 6-9 chips in three uneven clusters, one per third of the run; one big tear, two or three medium tears in different clusters, the rest nicks of 6 px or more */
            let xplan = null;
            if (xpw) {
              const nx = 6 + Math.floor(kr() * 4), cs = [1, 1, 1];
              for (let j = 3; j < nx; j++) { let q = Math.floor(kr() * 3); while (cs[q] >= 4) q = (q + 1) % 3; cs[q]++; }
              if (cs[0] === cs[1] && cs[1] === cs[2]) { cs[0]--; cs[1]++; }
              const bc = Math.floor(kr() * 3), m3 = kr() < 0.5, mx = cs.indexOf(Math.max.apply(null, cs)), th = span / 3;
              xplan = [];
              for (let k = 0; k < 3; k++) {
                const items = [];
                for (let j = 0; j < cs[k]; j++) {
                  const big = k === bc && j === 0, med = !big && ((j === 0) || (m3 && k === mx && j === 1));
                  const dd = big ? (13 + kr() * 7) * dpr : med ? (9 + kr() * 5) * dpr : (6 + kr() * 3) * dpr;
                  const LL = Math.min(big ? (40 + kr() * 50) * dpr : med ? (20 + kr() * 15) * dpr : dd * (2.5 + kr() * 2), vis * 0.07);
                  items.push({ L: LL, dd: dd, tear: big || med });
                }
                let tot = 0;
                items.forEach(function (it) { it.gap = it.L * (0.3 + kr() * 0.6); tot += it.L + it.gap; });
                tot -= items[items.length - 1].gap;
                let x = sa + k * th + kr() * Math.max(0, th - tot);
                /* a chip that would pass its own third or the run's limits is dropped (narrow edges get fewer chips) */
                const lim = Math.min(sb, sa + (k + 1) * th) + 1;
                items.forEach(function (it) { it.c = x + it.L / 2; x += it.L + it.gap; if (it.c - it.L / 2 >= sa - 1 && it.c + it.L / 2 <= lim) xplan.push(it); });
              }
            }
            for (let i = 0; i < cn; i++) {
              if (xplan && i >= xplan.length) break;
              /* one big tear per edge (the first), then one or two medium tears (20-35 px wide, 8-12 px deep), the rest small nicks */
              const big = i === 0, med = !big && i <= nmed, tear = xplan ? xplan[i].tear : big || med;
              const dd = xplan ? xplan[i].dd : big ? (13 + rnd() * 7) * dpr : med ? (8 + rnd() * 4) * dpr : (3 + rnd() * 5) * dpr;
              const LL = xplan ? xplan[i].L : Math.min(big ? (40 + rnd() * 50) * dpr : med ? (20 + rnd() * 15) * dpr : dd * (2.5 + rnd() * 2), vis * 0.07, span * (cn > 1 ? 0.5 : 0.9));
              let c0 = xplan ? xplan[i].c : -1;
              for (let t = 0; t < 30 && c0 < 0; t++) {
                let c = sa + LL / 2 + rnd() * Math.max(0, span - LL);
                if (placed.length && rnd() < 0.5) { const q = placed[placed.length - 1]; c = q.c + (rnd() < 0.5 ? -1 : 1) * ((q.L + LL) / 2 + LL * (0.25 + rnd() * 0.9)); }
                if (c - LL / 2 < sa - 1 || c + LL / 2 > sb + 1) continue;
                if (placed.every(function (q) { return Math.abs(c - q.c) > (q.L + LL) / 2 + LL * 0.2; })) c0 = c;
              }
              if (c0 < 0 || (xplan && !placed.every(function (q) { return Math.abs(c0 - q.c) > (q.L + LL) / 2; }))) continue;
              placed.push({ c: c0, L: LL });              const fl2 = rnd() < 0.5, pr = chipEdge(dd, tear);
              g.beginPath();
              [[0, -2]].concat(pr, [[1, -2]]).forEach(function (p, j) { const c = at(c0 - LL / 2 + (fl2 ? 1 - p[0] : p[0]) * LL, p[1]); if (j) g.lineTo(c[0], c[1]); else g.moveTo(c[0], c[1]); });
              g.closePath(); if (!mute) g.fill();
              /* now and then a tiny crumb (2-3 px) right beside a chip */
              if (!xpw && i === 0 && rnd() < 0.35) {
                const cs = (rnd() < 0.5 ? -1 : 1), cx = c0 + cs * (LL / 2 + (3 + rnd() * 3) * dpr), cl = 5 * dpr, ch = (2 + rnd()) * dpr;
                if (cx - cl / 2 > sa && cx + cl / 2 < sb && placed.every(function (q) { return Math.abs(cx - q.c) > q.L / 2 + cl / 2 + dpr; })) {
                  g.beginPath();
                  [[cx - cl / 2, -2], [cx - cl / 2, 0], [cx - cl * (0.1 + rnd() * 0.2), ch], [cx + cl / 2, 0], [cx + cl / 2, -2]].forEach(function (p, j) { const c = at(p[0], p[1]); if (j) g.lineTo(c[0], c[1]); else g.moveTo(c[0], c[1]); });
                  g.closePath(); if (!mute) g.fill();
                }
              }
            }
            el._wearChips = placed.length;
          } else {
          mute = !on("tl"); put(sIn, 1, Math.min(dS * (2 + rnd() * 2), vis * 0.35), dS, true);
          const d2 = bd * (0.6 + rnd() * 0.4);
          mute = !on("tr"); put(sOut, -1, Math.min(d2 * (2 + rnd() * 2), vis * 0.35), d2, true);
          mute = !on("top");
          if (rnd() < 0.3) {
            const dd = bd * (0.3 + rnd() * 0.25), LL = Math.min(dd * (2 + rnd()), 0.2 * vis);
            put(sIn + (0.3 + rnd() * 0.4) * vis - LL / 2, 1, LL, dd, false);
          }
          for (let i = 0, n = bk > 1 ? Math.round(vis / dpr / (60 * bk)) : 0; i < n; i++) {
            const dd = (1.5 + sr() * 1.5) * bk * dpr, LL = dd * (2 + sr() * 2);
            put(sIn + (0.08 + 0.84 * sr()) * vis - LL / 2, 1, LL, dd, false);
          }
          }
          mute = false;
        } else if (sp.c === 0) { bite(sIn, 1, L, d); wearSites.push("tl"); }
        else { bite(sOut, -1, L, d); wearSites.push("tr"); }
        /* one or two smaller shards between, never in the middle 30%, at least 2x depth wide */
        const nm = kz ? sp.cnt : 0;
        for (let i = 0; i < nm; i++) {
          const dd = dm * (0.4 + rnd() * 0.3), LL = kz ? dd * (2.5 + rnd() * 2) : Math.max(dd * (2 + rnd()), 2 * dd);
          const lo = i === 0 ? 0.12 : 0.65, hi = i === 0 ? 0.35 : 0.88;
          const ur = rnd();
          let c = sIn + (lo + (sp ? sp.pos[i] : ur) * Math.max(0, hi - lo - LL / vis)) * vis, Ls = LL;
          if (kz) {
            /* the slot stays inside its window and clear of the lead corner cluster (0.6 H from the corner) */
            let a0 = sIn + lo * vis, a1 = sIn + hi * vis;
            if (sp.c === 0 && i === 0) a0 = Math.max(a0, sIn + 0.6 * H);
            if (sp.c !== 0 && i === 1) a1 = Math.min(a1, sOut - 0.6 * H);
            Ls = Math.max(1, Math.min(LL, a1 - a0));
            c = Math.max(a0, Math.min(c, a1 - Ls));
          }
          bite(c, 1, Ls, dd, true);
          if (kz) wearSites.push("mid");
        }
      }
    }
    /* kinds: each cut site (a corner, or the end of a worn edge) picks one effect kind from the list by the seeded rng */
    const kindList = opts && opts.kind ? [opts.kind] : (opts && opts.kinds) || P.kinds;
    const spreadSegs = !!(segs && segs.length && P.spread);
    let kinds = (kz ? !spreadSegs : !P.spread) && kindList ? kindList.filter(function (n) { return WEAR_KINDS.indexOf(n) >= 0; }) : [];
    /* kinds mode always applies the budget: an empty or unknown list falls back to the preset's kinds, then to every kind */
    if (kz && !spreadSegs && !kinds.length) kinds = (P.kinds || WEAR_KINDS).filter(function (n) { return WEAR_KINDS.indexOf(n) >= 0; });
    /* a small box only reads a cut (step, slant or square): the listed ones, else step and square; a forced opts.kind is left alone */
    if (small && !spreadSegs && !(opts && opts.kind)) {
      const cuts = kinds.filter(function (n) { return n === "step" || n === "slant" || n === "square" || n === "scallop" || n === "shear"; });
      kinds = cuts.length ? cuts : ["shear", "scallop"];
    }
    /* the card only reads a step or a slant, never a tear, spike or shard: the listed ones, else both */
    if (mid && !spreadSegs && !(opts && opts.kind)) {
      kinds = kz ? ["bays"] : (function () { const calm = kinds.filter(function (n) { return n === "step" || n === "slant" || n === "round"; }); return calm.length ? calm : ["round", "slant"]; })();
    }
    /* a small square-only list (the button) is one notch that may sit mid-edge, never a corner cut */
    const notch = small && kinds.length === 1 && kinds[0] === "square" && !(opts && opts.kind);
    /* one worn corner only: the card, a small step-only list (the paper title) and the notch */
    const one = notch || mid || (kz && !spreadSegs && (preset === "title" || preset === "image")) || (small && kinds.length === 1 && (kinds[0] === "step" || kinds[0] === "shear" || kinds[0] === "scallop") && !(opts && opts.kind));
    const picked = [];
    if (kinds.length) {
      let sites = [];
      const seen = {};
      EDGE_KEYS.forEach(function (k, e) {
        const tear = P.tear && P.tear.edges.indexOf(k) >= 0;
        if (P.edges.indexOf(k) < 0 && !tear) return;
        const ne = tear ? 2 : P.ends ? (kz && ROLE_CORNERS[preset] ? 2 : P.ends[e]) : 1, first = kz ? 0 : rnd() < 0.5 ? 0 : 1;
        const dmax = tear ? clampD(P.tear.pct, 26) : clampD(P.depth, P.max || 26);
        for (let i = 0; i < ne; i++) {
          const end = ne === 2 || kz ? i : first, c = end ? (e + 1) % 4 : e;
          if (seen[c]) continue;
          seen[c] = 1; sites.push({ e: e, end: end, dmax: dmax * sevD, name: ["tl", "tr", "br", "bl"][c] });
        }
      });
      if (kz && ROLE_CORNERS[preset]) sites = sites.filter(function (x) { return ROLE_CORNERS[preset].indexOf(x.name) >= 0; });
      /* corner budget: one corner, or two different ones when severity is "two"; every other corner and edge stays crisp */
      const lead = kz ? leadPick(Math.max(1, sites.length), kinds.length) : null;
      const chosen = sites.length ? [sites.splice(kz ? lead[0] : Math.floor(rnd() * sites.length), 1)[0]] : [];
      /* small slant: the second cut sits on the opposite corner; a small notch is always a single cut */
      if (sev === 2 && sites.length && !one) {
        const opp = kinds.length === 1 && (small && kinds[0] === "slant" || kinds[0] === "scallop") ? sites.filter(function (x) { return x.name === ["br", "bl", "tl", "tr"][["tl", "tr", "br", "bl"].indexOf(chosen[0].name)]; }) : sites;
        if (opp.length) chosen.push(sites.splice(sites.indexOf(opp[Math.floor(rnd() * opp.length)]), 1)[0]);
      }
      chosen.forEach(function (S) {
        wearSites.push(S.name);
        const e = S.e, end = S.end, len = lens[e], tmax = kz ? Math.min(0.45 * lens[(e + 1) % 4], capD) : 0.45 * lens[(e + 1) % 4];
        const kind = kinds[kz && S === chosen[0] ? lead[1] : Math.floor(rnd() * kinds.length)];
        picked.push(kind);
        const d = fl(S.dmax * (0.6 + rnd() * 0.4));
        /* local frame: s along the edge from this end, t inward */
        const poly = function (q) {
          g.beginPath();
          q.forEach(function (p, j) {
            const c = pt(e, (end ? len - p[0] : p[0]) / len, p[1]);
            if (j) g.lineTo(c[0], c[1]); else g.moveTo(c[0], c[1]);
          });
          g.closePath(); g.fill();
        };
        if (kind === "bays") {
          /* kinds mode card corner: bays() with exactly 3 concave arcs (middle 2x the others, cusps between), 0.15-0.25 of the short side, plus a 2-3 px nick one arc-length past the bite on the same edge; sheet CHECK FAIL for under 3 arcs or a straight segment over 0.3 of the bite */
          const size = (0.15 + rnd() * 0.1) * Math.min(W, H), bp = bays(seed + "|" + S.name, end, size, { dpr: dpr, ch: [0.25, 0.5, 0.25] })[0], xe = bp[bp.length - 1][0];
          poly(bp);
          const ns = xe + 0.25 * size, nd = (2 + rnd()) * dpr;
          /* the nick sits on the longer of the two edges at this corner; on the adjacent edge it takes that edge's frame (the same corner, s from the corner) */
          const nk = [[ns - 1.2 * dpr, -2], [ns + rnd() * 0.4 * dpr, nd], [ns + 1.2 * dpr, -2]], e2 = end ? (e + 1) % 4 : (e + 3) % 4, e2end = end ? 0 : 1, nonE = lens[e2] > len;
          if (!nonE) poly(nk);
          else { g.beginPath(); nk.forEach(function (p, j) { const c = pt(e2, (e2end ? lens[e2] - p[0] : p[0]) / lens[e2], p[1]); if (j) g.lineTo(c[0], c[1]); else g.moveTo(c[0], c[1]); }); g.closePath(); g.fill(); }
          if (Math.max(lens[e], lens[e2]) !== lens[nonE ? e2 : e]) console.error("CHECK FAIL card nick short edge " + seed);
          let na = 0, lg = 0;
          for (let i = 3; i < bp.length - 2; i++) {
            if (bp[i][1] < bp[i - 1][1] && bp[i][1] <= bp[i + 1][1]) na++;
            lg = Math.max(lg, Math.hypot(bp[i + 1][0] - bp[i][0], bp[i + 1][1] - bp[i][1]));
          }
          na++;
          if (na < 3 || lg > 0.3 * xe) console.error("CHECK FAIL card corner " + seed + " arcs " + na + " seg " + (lg / xe).toFixed(2));
        } else if (kind === "step") {
          const sh = STEP_SHAPES[rnd() < 0.5 ? 0 : 1], maxV = Math.max.apply(null, sh.q.map(function (p) { return p[1]; })), maxU = Math.max.apply(null, sh.q.map(function (p) { return p[0]; })), Hc = Math.min(fl(d * 1.3) / (kz ? maxV : 1), tmax), Wc = Math.min(kz ? Hc * maxV * (small ? 2 + 2 * run : 1.5 * (1 + 0.5 * run)) / maxU : Hc * sh.r, runF * len / (kz ? maxU : 1));
          /* the card (kinds mode) is one plain right-angle step: no jitter, no extra vertices */
          if (mid) { const w = Math.min(Wc * maxU, runF * len), h = Math.min(Hc * maxV, tmax); poly([[-2, -2], [w, -2], [w, h / 2], [w / 2, h / 2], [w / 2, h], [-2, h]]); return; }
          /* kinds mode clamps the jittered vertices to the run and depth caps */
          poly(sh.q.map(function (p) {
            const x = p[0] === 0 ? -2 : (p[0] + (rnd() - 0.5) * 0.12) * Wc, y = p[1] === 0 ? -2 : (p[1] + (rnd() - 0.5) * 0.12) * Hc;
            return kz ? [Math.min(x, runF * len), Math.min(y, tmax)] : [x, y];
          }));
        } else if (kind === "slant") {
          const a = (20 + rnd() * 35) * Math.PI / 180, r = d * 2.2;
          /* the rim points after the mouth vertex stay inside the 67 degree cone from it */
          const sl = function (q) { for (let i = 2; i < q.length - 1; i++) q[i][0] = Math.min(q[i][0], q[1][0] - 0.43 * (q[i][1] - q[1][1])); lipChk(q.slice(1, 3), 1); return q; };
          if (small) { const rise = Math.min(fl(d), tmax); poly(sl(rough([[-2, -2], [Math.min(rise * (2 + 2 * run), 0.3 * len), -2], [-2, rise]], tmax))); }
          else poly(sl(rough([[-2, -2], [Math.min(r * Math.cos(a), runF * len), -2], [-2, Math.min(fl(r * Math.sin(a)), tmax)]], tmax)));
        } else if (kind === "spike") {
          const n = 3 + Math.floor(rnd() * 4), w = Math.min(d * (0.6 + rnd() * 0.3), runF * len / n);
          for (let i = 0; i < n; i++) poly([[i * w - 2, -2], [(i + 0.5) * w, Math.min(fl(d * (0.45 + rnd() * 0.55)), tmax)], [(i + 1) * w, -2]]);
        } else if (kind === "scallop") {
          /* shallow lopsided scallop: visible chord V is 2.5-4.5x the depth (never past a half circle), deepest point 0.3-0.7 along (per seed), the first part runs off the corner; rim roughened; kinds mode only */
          const ratio = 2.5 + rnd() * 2, sh = 0.1 + rnd() * 0.1, pk = sh + pkPick() * (1 - sh), h0 = Math.min(fl(d * (0.6 + rnd() * 0.4)), tmax);
          const dmn = Math.min(W, H);
          const hs = small ? Math.min(Math.max(h0, 0.3 * dmn), 0.4 * dmn, tmax) : h0, V = Math.min(hs * ratio, runF * len), h = Math.max((0.15 + rnd() * 0.05) * V, 1), C = V / (1 - sh), s0 = -sh * C;
          poly(cone(rough([[s0, -2]].concat(chipPts(pk, h / C).map(function (v) {
            return [s0 + v[0] * C, Math.min(Math.max(v[1] * h, 1), tmax)];
          }), [[s0 + C, -2]]), tmax, 1, false, true, true), 1));
          /* nicks: 1 (button) or 1-2 (slab) specks of 0.2-0.35 of the lead depth along the same edge, 0.5-1.5 chords past it */
          const nn = small ? 1 : 1 + (rnd() < 0.5 ? 1 : 0);
          for (let i = 0, at0 = V; i < nn && S === chosen[0]; i++) {
            const nd = h * (0.2 + rnd() * 0.15), nc = (nd + 2) * (1.1 + rnd() * 0.5), ns = Math.min(at0 + V * (0.5 + rnd()), len * 0.9 - nc);
            if (ns < at0 + 3) break;
            lipChk([[ns, -2], [ns + nc * 0.4, nd], [ns + nc, -2]], 1); poly([[ns, -2], [ns + nc * 0.4, nd], [ns + nc, -2]]); at0 = ns + nc;
          }
        } else if (kind === "shear") {
          /* a corner knocked off three times: segments steepen 12-30, 35-60, 65-85 degrees toward the corner; one speck 0-1 */
          /* the run R follows from the angles: each segment rises a share of the depth and runs rise / tan(angle); a run past the cap scales the whole shape down */
          /* the image takes a torn corner of its own (all three segments in 35-60, depth 1.5x the name plate's); the paper title takes the 12-30 band (a 65-85 band is a hairline sliver), never the image's; the rest keep the stair */
          /* the image bends at least 8 degrees at each joint: a1 35-38, a2 10-13 more, a3 8 or more beyond a2, all inside 35-60 */
          const imgAn = function () { const a1 = 35 + rnd() * 3, a2 = a1 + 10 + rnd() * 3; return [a1, a2, a2 + 8 + rnd() * (52 - a2)]; };
          const band = preset === "image" ? [35, 60] : preset === "paper" ? [12, 30] : null, bw = band ? band[1] - band[0] : 0;
          const an = preset === "image" ? imgAn() : band ? [band[0] + rnd() * 0.1 * bw, band[0] + (0.4 + rnd() * 0.2) * bw, band[0] + (0.8 + rnd() * 0.2) * bw] : [12 + rnd() * 18, 35 + rnd() * 25, 65 + rnd() * 20];
          /* image and paper title (kinds mode): one torn corner, 3-4 segments from the edge to the box side, the direction swinging 20-70 degrees between neighbours; the image bite is 0.5-0.6 of its short side, the title's depth stays in 12-30 px; the run scales down to its cap; rough() roughens it; the swing range per role is kept on window.__wearSwing */
          const torn = kz && preset === "paper", rim = kz && preset === "image";
          /* kinds mode image: a torn-paper rim along the edge instead of a corner wedge. 4 runs alternate short (0.08-0.1 of the side) and long (0.2-0.3), each 3-15 degrees off the edge (swing at most 0.27 of its length); one long hump of drift (the first runs go in, the rest come back, the end keeps 5 px or more); joints are V notches (6-14 px deep, opening 40-70 degrees, unequal walls) or 3-8 px depth steps; sheet CHECK FAIL for a run swing over 0.4 of its length or neighbouring runs within 2x */
          const rimPoly = function () {
            const dg = Math.PI / 180, cap = Math.min(tmax, 0.6 * Math.min(W, H));
            let q = null, runs = null, nts = null, accepted = false, bareF = 0;
            const stat = function (nl) {
              const cv = function (v) { const m = v.reduce(function (x, y) { return x + y; }, 0) / v.length; return Math.sqrt(v.reduce(function (x, y) { return x + (y - m) * (y - m); }, 0) / v.length) / m; };
              const dp = nl.map(function (o) { return o.d; }), sp = [], sgn = nl.map(function (o) { return o.sg; });
              for (let i = 1; i < nl.length; i++) sp.push(nl[i].x - nl[i - 1].x);
              let rep = false;
              for (let i = 3; i + 3 <= sgn.length; i++) rep = rep || (sgn[i] === sgn[i - 3] && sgn[i + 1] === sgn[i - 2] && sgn[i + 2] === sgn[i - 1]);
              return { n: nl.length, dcv: nl.length > 2 ? cv(dp) : 0, scv: nl.length > 2 ? cv(sp) : 0, ratio: nl.length ? Math.max.apply(null, dp) / Math.min.apply(null, dp) : 0, rep: rep };
            };
            for (let t = 0; t < 20000; t++) {
              const hp = 1 + Math.floor(rnd() * 3), rs = [], pts = [[0, 0]], nl = [], nn = [];
              let s = 0, tt = 0, pk = 0, pl = 0, pv = -9;
              for (let i = 0; i < 9; i++) {
                let l = 0;
                for (let g = 0; g < 30; g++) { l = (0.06 + 0.26 * Math.pow(rnd(), 2.2)) * len; if (!pl || Math.max(l, pl) / Math.min(l, pl) >= 1.15) break; }
                pl = l;
                const dt = l * Math.tan((3 + rnd() * 12) * dg) * (i <= hp ? 1 : -1);
                const r = { l: l, dt: dt, a: pts.length - 1 };
                rs.push(r);
                s -= l; tt += dt; pts.push([s, tt]); pk = Math.max(pk, tt); r.b = pts.length - 1;
                if (i >= 4 && (-s >= 0.68 * len || i === 8)) { nn.push(0); break; }
                const jr = rnd();
                if (jr < 0.45) {
                  /* notch: opens 73-100 degrees, the floor cut c drawn first (2-4 px floor), then the visible depth 3-11 px (never within 1.5 px of the last notch's), so n - c is the depth drawn */
                  const al = (73 + rnd() * 27) * dg, lf = rnd() < 0.5, f = lf ? 0.62 + rnd() * 0.12 : 0.26 + rnd() * 0.12, p0 = pts[pts.length - 1];
                  const c = (2 + rnd() * 2) * dpr / (Math.tan(al * f) + Math.tan(al * (1 - f)));
                  let v = 0;
                  for (let g = 0; g < 30; g++) { v = (3 + rnd() * 8) * dpr; if (Math.abs(v - pv) >= 1.5 * dpr) break; }
                  pv = v;
                  const n = c + v;
                  const bx = s - n * Math.tan(al * f), ex = bx - n * Math.tan(al * (1 - f)), ba = [bx + c * Math.tan(al * f), tt + n - c], bb = [bx - c * Math.tan(al * (1 - f)), tt + n - c], xp = [ex, tt];
                  const x0 = s;
                  s = ex;
                  pts.push(ba, bb, xp); pk = Math.max(pk, tt + n - c);
                  const u = [p0[0] - ba[0], p0[1] - ba[1]], w = [xp[0] - bb[0], xp[1] - bb[1]];
                  nl.push({ ang: Math.acos((u[0] * w[0] + u[1] * w[1]) / Math.hypot(u[0], u[1]) / Math.hypot(w[0], w[1])) / dg, d: n - c, w: p0[0] - xp[0], x: -x0, sg: lf ? 1 : -1 });
                  nn.push(1);
                } else if (jr < 0.8) {
                  s -= 0.6 * dpr; tt += (3 + rnd() * 5) * dpr * (rnd() < 0.5 ? 1 : -1);
                  pts.push([s, tt]); pk = Math.max(pk, tt); nn.push(0);
                } else nn.push(0);
              }
              /* runs touching no notch at either end: 25-40 percent of the runs */
              const bare = rs.filter(function (r, i) { return !nn[i] && !(i && nn[i - 1]); }).length / rs.length, st = stat(nl);
              const mn = Math.min.apply(null, pts.slice(1).map(function (p) { return p[1]; }));
              q = pts; runs = rs; nts = nl; bareF = bare;
              if (-s <= 0.8 * len && -s >= 0.6 * len && pk >= 14 * dpr && pk <= cap && mn >= 2 * dpr && tt >= 5 * dpr && bare >= 0.25 && bare <= 0.4 && st.n >= 3 && st.dcv >= 0.3 && st.scv >= 0.3 && st.ratio >= 2.5 && !st.rep) { accepted = true; break; }
            }
            if (!accepted) console.error("CHECK FAIL image rim retries " + seed + " bare " + bareF.toFixed(2));
            /* torn fibre: each run gets 1-2 px serration every 2-4 px (signs alternate, both appear) on top of a slow wander of 2-5 percent of the short side, ends pinned; nothing leaves the rectangle by more than 1 px */
            const fz = [], at = {};
            runs.forEach(function (r) { at[r.a] = r; });
            const qf = [];
            q.forEach(function (p, j) {
              qf.push(p);
              const r = at[j];
              if (!r) return;
              const x0 = q[r.a][0], y0 = q[r.a][1], x1 = q[r.b][0], y1 = q[r.b][1], k = Math.max(2, Math.round((Math.round(r.l / (3 * dpr)) - 1) * (0.7 + rnd() * 0.6))), A = Math.min((0.02 + rnd() * 0.03) * Math.min(W, H), 0.2 * r.l) * (rnd() < 0.5 ? 1 : -1), m = 1 + Math.floor(rnd() * 2);
              let sg = rnd() < 0.5 ? 1 : -1;
              for (let i = 1; i <= k; i++) {
                const u = (i + (rnd() - 0.5) * 0.4) / (k + 1);
                sg = -sg;
                const base = y0 + (y1 - y0) * u + A * Math.sin(Math.PI * u * m), off = sg * (1 + rnd()) * dpr, y = base + off;
                const yy = y < -0.5 * dpr || y > cap ? base - off : y;
                qf.push([x0 + (x1 - x0) * u, Math.min(yy < 0.5 * dpr ? dpr - yy : yy, cap)]);
              }
              fz.push({ a: qf.length - k - 1, k: k });
            });
            q = qf;
            const over = Math.max(0, -Math.min.apply(null, q.slice(1).map(function (p) { return p[1]; }))) / dpr;
            console.error("image rim overshoot " + seed + " " + over.toFixed(2));
            if (over > 1) console.error("CHECK FAIL image rim outside " + seed + " " + over.toFixed(2));
            const S0 = -q[q.length - 1][0], out = [[S0 + 2.5 * dpr, -2]].concat(q.map(function (p) { return [p[0] + S0, p[1]]; }), [[-2, q[q.length - 1][1]], [-2, -2]]);
            let longest = 0;
            fz.forEach(function (r) {
              if (r.k < 2) console.error("CHECK FAIL image fuzz missing " + seed);
              const e = r.a + r.k + 1;
              for (let i = r.a; i < e; i++) for (let j = i + 1; j <= e; j++) {
                const dx = q[i][0] - q[j][0], dy = q[j][1] - q[i][1];
                let ok = true;
                for (let m = i + 1; m < j && ok; m++) ok = Math.abs(q[i][1] + dy * (q[i][0] - q[m][0]) / dx - q[m][1]) <= dpr;
                if (ok) longest = Math.max(longest, dx);
              }
            });
            if (longest > 12 * dpr) console.error("CHECK FAIL image run ruled " + seed + " " + (longest / dpr).toFixed(1));
            nts.forEach(function (nt) { if (nt.ang < 69.9) console.error("CHECK FAIL image notch sharp " + seed + " " + nt.ang.toFixed(1)); });
            console.error("image rim " + seed + " runs " + runs.length + " straight " + (longest / dpr).toFixed(1) + " notch " + nts.map(function (nt) { return nt.ang.toFixed(0) + "/" + (nt.d / dpr).toFixed(1); }).join(",") + " fuzz " + fz.map(function (r) { return r.k; }).join(","));
            runs.forEach(function (r, i) {
              if (Math.abs(r.dt) > 0.4 * r.l) console.error("CHECK FAIL image run swing " + seed + " " + (Math.abs(r.dt) / r.l).toFixed(2));
              if (i && Math.max(r.l, runs[i - 1].l) / Math.min(r.l, runs[i - 1].l) < 1.149) console.error("CHECK FAIL image runs within 15% " + seed);
            });
            const sx = stat(nts), covF = -q[q.length - 1][0] / len;
            if (bareF < 0.25 - 1e-6 || bareF > 0.4 + 1e-6) console.error("CHECK FAIL image no-notch share " + seed + " " + bareF.toFixed(2));
            if (sx.ratio < 2.5) console.error("CHECK FAIL image depth range " + seed + " " + sx.ratio.toFixed(2));
            nts.forEach(function (nt, i) {
              if (nt.d < 3 * dpr - 1e-6 || nt.d > 11 * dpr + 1e-6 || (i && Math.abs(nt.d - nts[i - 1].d) < 1.5 * dpr - 1e-6)) console.error("CHECK FAIL image notch depth " + seed + " " + (nt.d / dpr).toFixed(2));
            });
            if (covF < 0.6 - 1e-6 || covF > 0.8 + 1e-6) console.error("CHECK FAIL image coverage " + seed + " " + covF.toFixed(2));
            if (sx.n < 3 || sx.dcv < 0.3 || sx.scv < 0.3 || sx.ratio < 2.5 || sx.rep) console.error("CHECK FAIL image rim even " + seed + " n " + sx.n + " dcv " + sx.dcv.toFixed(2) + " scv " + sx.scv.toFixed(2) + " ratio " + sx.ratio.toFixed(1) + " rep " + sx.rep);
            return out;
          };
          const tornCorner = function () {
            const n = 3 + (rnd() < 0.5 ? 1 : 0), img = preset === "image";
            let a, w, wt, tt, rn, r0;
            /* the joints stay put (only the pieces between them are jittered) so the swings hold; the image starts at 18-26 degrees (10-14 with four segments); the title starts at 6-14 and is redrawn until its run is 2-4 times its depth (a torn corner, not a dog-ear) */
            for (let t = 0; img && t < 200; t++) {
              a = [img ? (n === 4 ? 10 + rnd() * 4 : 18 + rnd() * 8) : 6 + rnd() * 8];
              let left = 88 - a[0];
              for (let i = 1; i < n; i++) { const lo = Math.min(26, left / (n - i)); const sw = lo + rnd() * Math.min(70 - lo, 36, left - lo * (n - i)); a.push(a[i - 1] + sw); left -= sw; }
              w = a.map(function (x, i) { return i + 1 + rnd() * 0.6; }); wt = w.reduce(function (x, y) { return x + y; }, 0); tt = a.map(function (x) { return Math.tan(x * Math.PI / 180); });
              rn = w.map(function (x, i) { return x / wt / tt[i]; }); r0 = rn.reduce(function (x, y) { return x + y; }, 0);
              break;
            }
            if (!img) r0 = n === 4 ? 1.8 + rnd() * 0.4 : 2 + rnd();
            const hT = img ? (0.5 + rnd() * 0.1) * Math.min(W, H) : (12 + 14 * (((Number(seed) || 0) * 0.25) % 1)) * dpr, hc = Math.min(hT, img ? hT : tmax, (img ? 0.85 : runF) * len / r0);
            let x = r0 * hc, y = 0, q;
            let chordDir = 0;
            if (img) {
              q = [[x + 2 / tt[0], -2], [x, 0]];
              for (let i = 0; i < n; i++) { x -= rn[i] * hc; y += w[i] / wt * hc; q.push([Math.max(x, 0), y]); }
              q.splice(1, 1); q[q.length - 1] = [0, hc]; q.push([-2, hc], [-2, -2]);
            } else {
              /* title: a zigzag from entry to exit, the segments alternating 20-70 degrees either side of the straight chord; every vertex stays inside the box */
              const R = x, ch = Math.hypot(R, hc), ca = Math.atan2(hc, -R);
              let ok = false;
              q = [[R, 0], [0, hc], [-2, hc], [-2, -2]];
              for (let t = 0; t < 500 && !ok; t++) {
                const s0 = rnd() < 0.5 ? 1 : -1, th = [], l = [];
                for (let i = 0; i < n; i++) th.push(s0 * (i % 2 ? -1 : 1) * (20 + rnd() * (n === 4 ? 20 : 40)) * Math.PI / 180);
                const sn = th.map(Math.sin), cs = th.map(Math.cos);
                l[0] = 0.7 + rnd() * 0.6; l[2] = 0.7 + rnd() * 0.6;
                if (n === 3) l[1] = -(l[0] * sn[0] + l[2] * sn[2]) / sn[1];
                else { const k = 0.6 + rnd() * 0.8; l[1] = -(l[0] * sn[0] + l[2] * sn[2]) / (sn[1] + k * sn[3]); l[3] = k * l[1]; }
                const f = ch / l.reduce(function (u, v, i) { return u + v * cs[i]; }, 0);
                let px = R, py = 0;
                const vs = [];
                ok = Math.sin(ca + th[0]) > 0.2;
                for (let i = 0; i < n - 1 && ok; i++) {
                  px += l[i] * f * Math.cos(ca + th[i]); py += l[i] * f * Math.sin(ca + th[i]);
                  if (px < 0 || px > R || py < 0.3 || py > hc) ok = false;
                  vs.push([px, py]);
                }
                if (ok) { const a0 = ca + th[0]; q = [[R - 2 * Math.cos(a0) / Math.sin(a0), -2]].concat(vs, [[0, hc], [-2, hc], [-2, -2]]); }
              }
              if (!ok) console.error("CHECK FAIL title zigzag " + seed);
              chordDir = Math.atan2(hc, R) * 180 / Math.PI;
            }
            const out = rough(q, img ? 0.6 * Math.min(W, H) : tmax, 1, false, false, true, img);
            if (!out.js) return out;
            /* sheet check: the title tear is 12-30 px deep, the image rim pieces differ from their neighbours */
            if (!img) { const dp = hc / dpr; console.error("title tear " + seed + " " + dp.toFixed(1)); if (dp < 11.99 || dp > 30.01) console.error("CHECK FAIL title tear " + seed + " " + dp.toFixed(1)); }
            else if (out.pcs) for (let k = 1; k < out.pcs.length; k++) { const u = out.pcs[k - 1], v = out.pcs[k]; if (Math.abs(u[0] - v[0]) / Math.max(u[0], v[0]) < 0.3 && Math.abs(u[1] - v[1]) / Math.max(u[1], v[1], 0.01) < 0.3) { console.error("CHECK FAIL image rim even " + seed); break; } }
            /* sheet check: the direction of each torn segment (joint to joint of the final polygon) swings 20-70 degrees from its neighbour; min and max per role kept on window.__wearSwing */
            const dir = [], sg = window.__wearSwing = window.__wearSwing || {};
            for (let k = 0; k < n; k++) { const p = out[out.js[k]], r = out[out.js[k + 1]]; dir.push(Math.atan2(r[1] - p[1], p[0] - r[0]) * 180 / Math.PI); }
            if (!img) for (let k = 0; k < n; k++) { const sw = Math.abs(dir[k] - chordDir); if (sw < 19.5 || sw > 70.5) console.error("CHECK FAIL zigzag " + sw.toFixed(1)); if (k && (dir[k] - chordDir) * (dir[k - 1] - chordDir) >= 0) console.error("CHECK FAIL zigzag sign " + seed); }
            for (let k = 1; k < n && img; k++) {
              const sw = dir[k] - dir[k - 1], c = sg[preset] = sg[preset] || [99, 0];
              c[0] = Math.min(c[0], sw); c[1] = Math.max(c[1], sw);
              if (sw < 20 || sw > 70) console.error("CHECK FAIL swing " + preset + " " + seed + " " + sw.toFixed(1));
            }
            return out;
          };
          const tn = an.map(function (a) { return Math.tan(a * Math.PI / 180); }), f1 = 0.28 + rnd() * 0.1, f2 = 0.32 + rnd() * 0.08;
          let h = Math.min(fl(d * (0.6 + rnd() * 0.4)), tmax);
          if (preset === "image") {
            /* the name plate's drawn depth at this severity (its 26 px short side: preset depth, floor and cap), as a share of its short side */
            const tp = Math.min(Math.max(Math.max(4, Math.min(26, wearPresets.title.depth / 100 * 26)) * sevD * 0.8, [8, 12, 16][sev]), 13) / 26;
            h = Math.min(1.5 * tp * Math.min(W, H), tmax);
          }
          else if (small) h = Math.min(Math.max(h, 0.3 * Math.min(W, H)), 0.4 * Math.min(W, H), tmax);
          const rs = [f1, f2, 1 - f1 - f2], runs = rs.map(function (f, i) { return f / tn[i]; }), R0 = (runs[0] + runs[1] + runs[2]) * h;
          if (R0 > runF * len) h *= runF * len / R0;
          const R = (runs[0] + runs[1] + runs[2]) * h, v1 = [R - runs[0] * h, rs[0] * h], v2 = [v1[0] - runs[1] * h, (rs[0] + rs[1]) * h];
          if (rim) poly(rimPoly());
          else if (torn) poly(tornCorner());
          else poly(rough([[R + 2 / tn[0], -2], v1, v2, [0, h], [-2, h]], tmax));
          if (S === chosen[0] && !rim && rnd() < 0.5) {
            const nd = h * (0.2 + rnd() * 0.15), nc = (nd + 2) * (1.1 + rnd() * 0.5), ns = Math.min(R * (1.5 + rnd()), len * 0.9 - nc);
            if (ns > R + 3) lipChk([[ns, -2], [ns + nc * 0.4, nd], [ns + nc, -2]], 1), poly([[ns, -2], [ns + nc * 0.4, nd], [ns + nc, -2]]);
          }
        } else if (kind === "round") {
          /* worn paper corner: quarter-ellipse arc radii 0.18-0.22 of the short side, roughened, both ends held inside the 67 degree cone */
          const Ra = Math.min((0.18 + rnd() * 0.04) * Scss * dpr, runF * len), Rb = Math.min((0.18 + rnd() * 0.04) * Scss * dpr, tmax);
          const arc = [22.5, 45, 67.5].map(function (t) { const ph = t * Math.PI / 180; return [Ra * (1 - Math.sin(ph)), Rb * (1 - Math.cos(ph))]; });
          const rq = rough([[-2, -2], [Ra, -2]].concat(arc, [[-2, Rb]]), Rb, 1, true);
          for (let i = 2; i < rq.length - 1; i++) { rq[i][0] = Math.max(Math.min(rq[i][0], Ra - 0.43 * (rq[i][1] + 2)), 1); rq[i][1] = Math.min(rq[i][1], Rb - 0.43 * (rq[i][0] + 2)); }
          lipChk(rq.slice(1, 3), 1); lipChk(rq.slice(-3).reverse().map(function (p) { return [p[1], p[0]]; }), 1);
          poly(rq);
        } else if (kind === "square") {
          const h = Math.min(fl(d * (0.6 + rnd() * 0.4)), tmax), w = Math.min(kz ? (small ? h * (2 + 2 * run) : h * 1.5 * (1 + 0.6 * run)) : d * (1 + rnd() * 0.8), runF * len), s0 = notch ? d + rnd() * Math.max(0, 0.5 * len - w - d) : rnd() < 0.5 ? -2 : d * 0.5 * rnd();
          poly([[s0, -2], [s0 + w, -2], [s0 + w, h], [s0, h]]);
        } else {
          const n = P.tear ? P.tear.n[0] + Math.floor(rnd() * (P.tear.n[1] - P.tear.n[0] + 1)) : 2 + Math.floor(rnd() * 2);
          const rat = P.shard || [2, 4];
          let a = 0;
          for (let i = 0; i < n; i++) {
            const dd = Math.min(fl(d * (0.6 + rnd() * 0.4)) / (kz ? 0.85 : 1), tmax), L = Math.min(dd * (rat[0] + rnd() * (rat[1] - rat[0])), (mid ? 0.2 / (1 + 0.8 * (n - 1)) : 0.22) * len);
            shard(e, end ? len - a - L : a, L, dd, !!end, true);
            a += L * (0.55 + rnd() * 0.25);
          }
        }
      });
    }
    el._wearKinds = picked;
    el._wearSites = wearSites;
    /* baseline wear (every preset, spec 38): the name plate's recipe at the box's scale. Corners: one end shard each along the top and bottom edges
       (tl tr from the top edge, br bl from the bottom); edges: at most one small mid bite on the top and bottom (0.3 chance) and, above scale 1,
       small crumbs on all four from a second rng so the corners and bites keep the plate's exact bytes. Flags off only mute the paint, the rng stream stays put. */
    if (!kz && !(segs && segs.length)) {
      const sr = rng(String(preset) + "|" + seed + "|specks"), CORNER_OF = [["tl", "tr"], null, ["br", "bl"], null];
      [0, 2, 1, 3].forEach(function (e) {
        const len = lens[e];
        if (e % 2 === 0) {
          rnd();
          for (let i = 0; i < 2; i++) {
            mute = !on(CORNER_OF[e][i]);
            const d = bd * (0.6 + rnd() * 0.4), L = Math.min(d * (2 + rnd() * 2), 0.35 * len);
            shard(e, i ? len - L : 0, L, d, i === 1, true);
          }
          mute = !on(WEAR_EDGES[e]);
          if (rnd() < 0.3) {
            const d = bd * (0.3 + rnd() * 0.25), L = Math.min(d * (2 + rnd()), 0.2 * len);
            shard(e, (0.3 + rnd() * 0.4) * len - L / 2, L, d, false, false);
          }
        }
        mute = !on(WEAR_EDGES[e]);
        const n = bk > 1 ? Math.round(len / dpr / (60 * bk)) : 0;
        for (let i = 0; i < n; i++) {
          const d = (1.5 + sr() * 1.5) * bk * dpr, L = d * (2 + sr() * 2);
          shard(e, (0.08 + 0.84 * sr()) * len - L / 2, L, d, false, false);
        }
        mute = false;
      });
    }
    el._wearProfile = profile.sort(function (a, b) { return a[0] - b[0]; });
    el.style.setProperty("--wear", 'url("' + cv.toDataURL("image/png") + '")');
    if (!el.hasAttribute("data-wear-keep")) el.style.setProperty("--shape", "none");
    el._wearW = cssW; el._wearH = cssH;
    return cv;
  }

  /* top-run offsets of the last wear() paint: [[u along the edge 0..1, depth / box height], ...] */
  function edgeProfile(el) { return el._wearProfile || []; }

  let wearRo = null, wearTimer = 0;
  const wearPending = [];
  let wearCount = 0;
  function wearApply(root) {
    const r = root || document, els = Array.prototype.slice.call(r.querySelectorAll("[data-wear]"));
    if (root && root.matches && root.matches("[data-wear]")) els.unshift(root);
    for (let i = 0; i < els.length; i++) {
      const el = els[i], p = el.dataset.wear;
      if (el.dataset.seed === undefined) el.dataset.seed = String(hash(p + ":" + (wearCount++)));
      el._wearPreset = p;
      el._wearSeed = el.dataset.seed;
      wear(el, p, el._wearSeed);
      if (window.ResizeObserver) {
        if (!wearRo) wearRo = new ResizeObserver(function (es) {
          es.forEach(function (e) { wearPending.push(e.target); });
          clearTimeout(wearTimer);
          wearTimer = setTimeout(function () {
            wearPending.splice(0).forEach(function (t) {
              if (t._wearW !== t.offsetWidth || t._wearH !== t.offsetHeight) wear(t, t._wearPreset, t._wearSeed);
            });
          }, 150);
        });
        if (!el._wearRo) { el._wearRo = true; wearRo.observe(el); }
      }
    }
  }

  /* the straight four-sided plate shared by the Experience tile and the Work rows: pts = [TL, TR, BR, BL] in px, set uncut as the clip `prop` on el
     (the chips come from Shapes.wear, in the mask of the plate's ::before); a red line runs down the left edge, overshooting the top-left corner by
     0.06 of the edge and stopping short of the bottom-left by the same, drawn in the svg `red` (a child of el, outside the masked pseudo) */
  function quad(el, red, pts, prop) {
    const x0 = pts[0][0], dy = pts[0][1];
    el.style.setProperty(prop, "polygon(" + pts.map(function (p) { return p[0].toFixed(1) + "px " + p[1].toFixed(1) + "px"; }).join(", ") + ")");
    if (red) {
      const l = red.firstChild, bl = pts[pts.length - 1], vx = bl[0] - x0, vy = bl[1] - dy;
      l.setAttribute("x1", (x0 - 0.06 * vx).toFixed(1)); l.setAttribute("y1", (dy - 0.06 * vy).toFixed(1));
      l.setAttribute("x2", (bl[0] - 0.06 * vx).toFixed(1)); l.setAttribute("y2", (bl[1] - 0.06 * vy).toFixed(1));
    }
    return pts;
  }
  /* wear the plate's top edge once per box size (draw runs on every resize) */
  function wearPlate(el, seed, edges, flags) {
    if (el._wearW !== el.offsetWidth || el._wearH !== el.offsetHeight) {
      /* the chips go on the text side of the top edge: the part not under the row picture, 24 px clear of it and of the corner */
      const shot = el.querySelector(":scope > .obj-shot"), W = el.offsetWidth, M = 24;
      let free = null;
      if (shot && shot.offsetWidth) free = shot.offsetLeft + shot.offsetWidth / 2 < W / 2 ? [shot.offsetLeft + shot.offsetWidth + M, W - M] : [M, shot.offsetLeft - M];
      if (seed === "xp-wear") free = [0.12 * W, 0.88 * W];   /* the Experience box's chips sit along its top edge, clear of the red line and the right point */
      wear(el, "row-top", seed, { edges: edges, flags: flags, free: free });
    }
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
    [[0, 0.035], [1, 0]],
    [[0, 0], [1, 0.035]],
    [[0, 0.035], [1, 0]]
  ];   /* straight 2 degree cuts, alternating, so the red-line side of every row is its tallest edge */
  const WK_EDGE = [0.06, 0.94];   /* desktop: the Games rows' left and right edges as fractions of the window width (the opener plate uses them too) */
  const WK_GAP = 3, XP_GAP = 4;   /* rem: between rows, and above the Experience shape */
  const WK_LEAN = 0.035;   /* the red-line edge leans: its top corner sits this share of the row width inward */
  const WK_LAST = Math.tan(4.02 * Math.PI / 180);   /* the last row's bottom slope, which the Experience shape's top edge follows */
  const WK_DROP = function (c) { return Math.max.apply(null, c.map(function (p) { return p[1]; })); };
  /* row i's polygon in px (box W x H), clockwise from the top-left point of its top run; the last point closes the left edge.
     Returns {pts, end (index where the worn top run ends), bi ([bottom-left, bottom-right] indexes: the Experience shape hangs from that run)} */
  function wkPoly(i, W, H, flip) {
    const top = i === 0 ? [[0, 0], [W, 0]] : WK_CRACK[i - 1].map(function (p) { return [p[0] * W, p[1] * W]; });
    let bot;
    if (i < WK_CRACK.length) { const A = WK_DROP(WK_CRACK[i]) * W; bot = WK_CRACK[i].map(function (p) { return [p[0] * W, H - A + p[1] * W]; }).reverse(); }
    else bot = [[W, H - WK_LAST * W], [0, H]];   /* the last row's bottom is one straight run (the Experience shape's top edge follows it) */
    const pts = top.concat(bot), end = top.length - 1;
    if (flip) pts[end][0] -= WK_LEAN * W; else pts[0][0] += WK_LEAN * W;   /* only the red-line edge leans */
    return { pts: pts, end: end, bi: [pts.length - 1, top.length] };
  }
  /* mouse, wide: where the title, hook and facts are drawn (css zones block: they stay in the grid, which only holds the row's height, and move by transform). One level layout, the same
     at rest and on hover: the title at the top-left corner of the text side, the hook under it in the same column (its width chosen once: inside the plate and SEAMGAP px clear of the
     picture), the facts as one line at the bottom edge (turned to it by --wk-ba), the last facts dropped from view when they do not fit on the line */
  function wkPlace(el, pts, end, bi, W, H, seam, flip) {   /* flip: the one the plate was drawn with (not the class: under 1200 px a flip row is drawn as a normal one) */
    const SEAMGAP = 40, M = 28, RG = 16, q = function (s) { return el.querySelector(":scope > " + s); }, h3 = q("h3"), hk = q(".obj-hook"), ln = q(".obj-line"), pr = q(".props");
    if (!h3 || !hk) return;
    ["--wk-hw", "--wk-hm", "--wk-ln", "--wk-lw", "--wk-lm"].forEach(function (v) { el.style.removeProperty(v); });   /* measured at the grid's own sizes */
    const f = function (v) { return v.toFixed(1); };
    const bl = pts[bi[0]], br = pts[bi[1]], tl = pts[0], tr = pts[end];
    const topY = function (x) { return tl[1] + (tr[1] - tl[1]) * (x - tl[0]) / (tr[0] - tl[0]); }, botY = function (x) { return bl[1] + (br[1] - bl[1]) * (x - bl[0]) / (br[0] - bl[0]); };
    const L = h3.offsetLeft, tw = h3.offsetWidth, th = h3.offsetHeight, hw = hk.offsetWidth, hh = hk.offsetHeight, lh = ln ? ln.offsetHeight : 0;
    const mv = function (e, x, y, t) { return "translate(" + f(x - e.offsetLeft) + "px, " + f(y - e.offsetTop) + "px)" + (t ? " " + t : ""); };
    const xr = Math.min(tr[0], br[0]) - 8, dt = q(".obj-det"), yt = Math.max(topY(L), topY(L + tw)) + M + (dt ? dt.offsetHeight + 12 : 0);   /* the title sits under the detail line */
    /* the hook: its natural width, cut back to the plate and to SEAMGAP px short of the picture; the margin keeps the grid's height */
    const lim = Math.min(xr, seam !== null ? seam - SEAMGAP : Infinity) - L, w = Math.max(120, Math.min(hw, Math.floor(lim)));
    let hh2 = hh;
    if (w < hw) { hk.style.width = w + "px"; hh2 = hk.offsetHeight; hk.style.width = ""; el.style.setProperty("--wk-hw", w + "px"); el.style.setProperty("--wk-hm", (hh - hh2) + "px"); }
    let lh2 = lh;   /* the detail line sits under the hook at the hook's width, level, and only fades in on hover */
    if (ln) {
      if (w < hw) { ln.style.width = w + "px"; lh2 = ln.offsetHeight; ln.style.width = ""; el.style.setProperty("--wk-lw", w + "px"); el.style.setProperty("--wk-lm", (lh - lh2) + "px"); }
      el.style.setProperty("--wk-ln", mv(ln, L, yt + th + RG + hh2 + (parseFloat(getComputedStyle(ln).marginTop) || 0), ""));
    }
    el.style.setProperty("--wk-h3", mv(h3, L, yt, ""));
    el.style.setProperty("--wk-hk", mv(hk, L, yt + th + RG, ""));
    if (pr) {
      const kids = Array.prototype.slice.call(pr.querySelectorAll(":scope > div")), tg = q(".obj-go"), tgw = tg ? tg.offsetWidth : 0, D = M - 4;
      pr.style.width = "max-content"; pr.style.maxWidth = "none"; pr.style.overflow = "visible";   /* the box is the facts' own width, so nothing is clipped */
      kids.forEach(function (d) { d.style.display = ""; });
      const tail = function () { let k = kids.length - 1; while (k > 0 && kids[k].style.display === "none") k--; return parseFloat(getComputedStyle(kids[k]).marginRight) || 0; };   /* the last shown fact's trailing margin is not ink */
      const ba = Math.atan((br[1] - bl[1]) / (br[0] - bl[0])), ph = pr.offsetHeight, Ra = function (x, y) { return [x * Math.cos(ba) - y * Math.sin(ba), x * Math.sin(ba) + y * Math.cos(ba)]; };
      /* the facts sit in the plate's outer bottom corner: D px above the bottom edge and D px in from the side edge (its real, leaning cut), turned to the bottom edge */
      const A = flip ? pts[end] : pts[0], B = flip ? br : bl, el2 = Math.hypot(B[0] - A[0], B[1] - A[1]);
      let nx = (B[1] - A[1]) / el2, ny = -(B[0] - A[0]) / el2; if (flip ? nx > 0 : nx < 0) { nx = -nx; ny = -ny; }   /* the side edge's normal, pointing into the plate */
      const solve = function () {
        const iw = pr.offsetWidth - tail(), oc = flip ? [Ra(iw, 0), Ra(iw, ph)] : [Ra(0, 0), Ra(0, ph)], pc = [Ra(0, ph), Ra(iw, ph)];
        let px = flip ? B[0] - D - iw : A[0] + D, py = 0;
        for (let n = 0; n < 4; n++) {
          py = Math.min.apply(null, pc.map(function (p) { return botY(px + p[0]) - D - p[1]; }));
          px += (D - Math.min.apply(null, oc.map(function (p) { return (px + p[0] - A[0]) * nx + (py + p[1] - A[1]) * ny; }))) / nx;
        }
        return { px: px, py: py, iw: iw };
      };
      const s = solve(), px = s.px, py = s.py, iw = s.iw;   /* the facts never take the tag into account: none is dropped */
      el.style.setProperty("--wk-ba", (ba * 180 / Math.PI).toFixed(2) + "deg");
      el.style.setProperty("--wk-fx", mv(pr, px, py, "rotate(var(--wk-ba))"));
      if (tg) {   /* the tag: on the facts' baseline, the same tilt, at the plate's inner end: its nearest ink D px from the plate's inner side edge (it may pass the text column) */
        const th2 = tg.offsetHeight, ys = [0, th2].map(function (y) { return flip ? -y * Math.sin(ba) : tgw * Math.cos(ba) - y * Math.sin(ba); }), ea = flip ? [tl, bl] : [tr, br], ex = ea[0][0] + (ea[1][0] - ea[0][0]) * (py - ea[0][1]) / (ea[1][1] - ea[0][1]), edge = flip ? ex + D : ex - D;   /* the inner side edge's x at the tag's y */
        const ox = (edge - px - (flip ? Math.min.apply(null, ys) : Math.max.apply(null, ys))) / Math.cos(ba), c = Ra(ox, 0);
        el.style.setProperty("--wk-gt", "translate(" + f(px + c[0]) + "px, " + f(py + c[1]) + "px) rotate(var(--wk-ba))");
      }
      return Math.max(0, yt + th + RG + hh2 + (ln ? (parseFloat(getComputedStyle(ln).marginTop) || 0) + lh2 : 0) + 10 - (py + Math.min(0, iw * Math.sin(ba))));   /* the facts' top must clear the detail line's last line (the hook's without one) by 10 px: the shortfall is how much taller the row must be */
    }
    return 0;
  }
  function workRows() {
    const rows = document.querySelectorAll(".work > a.obj[data-wornquad]");
    rows.forEach(function (el, i) {
      /* the row's own height: its padding scaled by a seeded factor (a different one per row), so the layout really differs */
      const hf0 = 0.35 + (rng("wk-h-" + i)() - 0.5) * 0.2;
      el.style.setProperty("--wk-hf", hf0.toFixed(2));
      const TXT = ".obj-id, .obj-det, h3, .obj-hook, .obj-line, .props > div, :scope > .obj-go",MARGIN = 6;
      /* zones (mouse, wider than a phone): the detail line and the title follow the row's top edge (the detail line outside the plate, the title placed from the geometry), so only the body is measured for padding */
      const TXTZ = ":scope > .obj-hook, :scope > .obj-line, .props > div", ZQ = "(hover: hover) and (min-width: 641px)";
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
      /* the ghost (main's old text layout, hidden, out of flow): main's polygon fit runs on it, and its final height is the row's minimum height (--wk-mh) */
      function ghostFit(wide, flip) {
        const gh = el.querySelector(":scope > .obj-ghost"), W = el.offsetWidth;
        if (!gh || !W) return;
        if (!gh.querySelector(".g-go")) { const go = document.createElement("span"); go.className = "g-go"; go.textContent = "Open the game page"; gh.appendChild(go); }   /* main's button sat in flow under the facts */
        ["pt", "pb", "pl", "pr"].forEach(function (v) { el.style.removeProperty("--wkg-" + v); gh.style.removeProperty("--wkg-" + v); });
        el.style.removeProperty("--wk-mh");
        const GT = ".g-id, .g-title, .g-line, .g-props > div, .g-go", gs = getComputedStyle(gh), k = window.Stage ? window.Stage.s() : 1;
        const hd = gh.querySelector(".g-head"), turn = wide && hd ? 14 * Math.PI / 180 : 0;
        let hx = 0, hy = 0;
        const S = { pt: 0, pb: 0, pl: 0, pr: 0 };
        for (let pass = 0; pass <= 5; pass++) {
          const H = gh.offsetHeight;
          if (pass === 5 || !H) break;
          const all = wkPoly(i, W, H, flip).pts, er = gh.getBoundingClientRect(), need = { t: 0, b: 0, l: 0, r: 0 };
          if (turn && pass === 0) { hd.style.left = "calc(min(var(--measure), 100%) + 2.4rem)"; hd.style.top = "2.3rem"; }   /* main's first fit ran before the row rule set the label to left 0, top 0 */
          if (hd) { hx = hd.offsetLeft + hd.offsetWidth / 2; hy = hd.offsetTop + hd.offsetHeight / 2; }
          if (turn) hd.style.transform = "none";   /* main measured the label straight (its row rule's translateY dropped too), then turned it here */
          gh.querySelectorAll(GT).forEach(function (t) {
            if (!t.getClientRects().length) return;   /* the button is display:none without a hover pointer */
            const tn = turn && hd.contains(t);
            const g = document.createRange(); g.selectNodeContents(t); const eb = t.getBoundingClientRect(), gb = g.getBoundingClientRect(), rr = gb.width && gb.height ? { left: Math.min(eb.left, gb.left), top: Math.min(eb.top, gb.top), width: Math.max(eb.right, gb.right) - Math.min(eb.left, gb.left), height: Math.max(eb.bottom, gb.bottom) - Math.min(eb.top, gb.top) } : eb, r = { width: rr.width / k, height: rr.height / k }, x0 = (rr.left - er.left) / k, y0 = (rr.top - er.top) / k;
            for (let n = 0; n <= 6; n++) for (let s = 0; s < 4; s++) {
              const x = x0 + (s < 2 ? n / 6 * r.width : (s - 2) * r.width), y = y0 + (s < 2 ? s * r.height : n / 6 * r.height);
              for (let u = 0; u < (tn ? 2 : 1); u++) {
                const px = u ? hx + (x - hx) * Math.cos(turn) - (y - hy) * Math.sin(turn) : x, py = u ? hy + (x - hx) * Math.sin(turn) + (y - hy) * Math.cos(turn) : y;
                const q = inside(all, px, py), lack = 6 - q.d;
                if (lack <= 0) continue;
                const side = Math.abs(q.sx) > Math.abs(q.sy) ? (py < H / 2 ? "t" : "b") : (px < W / 2 ? "l" : "r");
                need[side] = Math.max(need[side], lack);
              }
            }
          });
          if (turn) { hd.style.transform = ""; hd.style.left = hd.style.top = ""; }
          if (need.t + need.b + need.l + need.r <= 0.5) break;
          if (need.t) { S.pt = parseFloat(gs.paddingTop) + Math.ceil(need.t); gh.style.setProperty("--wkg-pt", S.pt + "px"); }
          if (need.b) { S.pb = parseFloat(gs.paddingBottom) + Math.ceil(need.b); gh.style.setProperty("--wkg-pb", S.pb + "px"); }
          S.pl += Math.ceil(need.l); S.pr += Math.ceil(need.r);
          gh.style.setProperty("--wkg-pl", S.pl + "px"); gh.style.setProperty("--wkg-pr", S.pr + "px");
        }
        if (gh.offsetHeight) el.style.setProperty("--wk-mh", gh.offsetHeight + "px");
      }
      function draw(pass, again) {
        pass = pass || 0;
        if (pass === 0) ["--wk-h3", "--wk-hk", "--wk-ln", "--wk-fx", "--wk-hw", "--wk-hm", "--wk-lw", "--wk-lm"].forEach(function (v) { el.style.removeProperty(v); });   /* the pieces are measured at their grid places (wkPlace moves them last) */
        /* desktop: the row grows to both sides (the text column keeps its size and moves left with the row): every row runs to 6% of the screen from the right edge and its left edge sits 6% in */
        const wide = !window.matchMedia("(max-width: 1199px)").matches;
        if (wide && pass === 0) {
          const k0 = window.Stage ? window.Stage.s() : 1, wk = el.parentNode, ws = getComputedStyle(wk), cw = document.documentElement.clientWidth;
          const natR = wk.getBoundingClientRect().right - parseFloat(ws.paddingRight) * k0, tgt = cw * WK_EDGE[1];
          const natL = wk.getBoundingClientRect().left + parseFloat(ws.paddingLeft) * k0;
          el._wkExt = Math.max(0, (tgt - natR) / k0); el._wkExtL = Math.max(0, (natL - cw * WK_EDGE[0]) / k0);
          el.style.marginRight = (-el._wkExt).toFixed(1) + "px"; el.style.marginLeft = (-el._wkExtL).toFixed(1) + "px";
        } else if (!wide && (el._wkExt || el._wkExtL)) { el._wkExt = el._wkExtL = 0; el.style.marginRight = el.style.marginLeft = ""; }
        if (pass === 0) ghostFit(wide, wide && el.classList.contains("is-flip"));
        const W = el.offsetWidth, H = el.offsetHeight, flip = wide && el.classList.contains("is-flip");   /* flip: text right, picture left (css .is-flip) */
        if (!W || !H) return;
        /* padding state: extras the text-inside check adds (top, bottom, left, right), reset when the width changes; cpl/cpr are the left/right extras now applied */
        if (!el._wk || el._wk.W !== W) ["pt", "pb", "pl", "pr"].forEach(function (v) { el.style.removeProperty("--wk-" + v); });
        const S = el._wk && el._wk.W === W ? el._wk : (el._wk = { W: W, pt: 0, pb: 0, pl: 0, pr: 0, cpl: 0, cpr: 0 });
        const cs = getComputedStyle(el);
        /* the row's own cut: its polygon (WK_POLY, box fractions) scaled to the row's box; nothing reaches past the box, so no padding above */
        const poly = wkPoly(i, W, H, flip), pts = poly.pts, bi = poly.bi;
        if (i > 0) el.style.marginTop = (WK_GAP * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16) - WK_DROP(WK_CRACK[i - 1]) * W).toFixed(1) + "px";   /* the crack above this row: WK_GAP between the two edges */
        el.style.setProperty("--wk-pad", "0px");
        const all = quad(el, null, pts, "--wk-clip");   /* no red line on the Games rows (main, 2026-11-06) */
        wearPlate(el, "wk-wear-" + i, pts.slice(0, poly.end).map(function (p, j) { return [p, pts[j + 1]]; }));
        /* the top edge's own angle and the title's place under it (css: .obj-det, h3, .obj-hook in the zones block) */
        const zone = window.matchMedia(ZQ).matches, zh = el.querySelector(":scope > h3");
        ["--wk-ea", "--wk-ex", "--wk-ey", "--wk-h3", "--wk-hk", "--wk-ln", "--wk-fx", "--wk-gt", "--wk-ba", "--wk-hw", "--wk-hm", "--wk-lw", "--wk-lm"].forEach(function (v) { if (!zone) el.style.removeProperty(v); });
        if (!zone) { const pp = el.querySelector(":scope > .props"); if (pp) { pp.style.width = ""; pp.style.maxWidth = ""; pp.style.overflow = ""; pp.querySelectorAll(":scope > div").forEach(function (d) { d.style.display = ""; }); } }   /* phones: the facts wrap and show whole */
        if (zone && zh) {
          const x0 = pts[0][0], y0 = pts[0][1], x1 = pts[poly.end][0], y1 = pts[poly.end][1], sl = (y1 - y0) / (x1 - x0), hx = zh.offsetLeft, ey = y0 + sl * (hx - x0);
          /* ey - 5: the detail block sits 5 px higher so it clears the title at 1440x900 */
          el.style.setProperty("--wk-ea", (Math.atan(sl) * 180 / Math.PI).toFixed(2) + "deg");
          el.style.setProperty("--wk-ex", hx.toFixed(1) + "px"); el.style.setProperty("--wk-ey", (ey - 5).toFixed(1) + "px");        }
        const bl = pts[bi[0]], br = pts[bi[1]];
        el._wkGeo = { xtl: pts[0][0], ytl: pts[0][1], xbl: bl[0], ybl: bl[1], xbr: br[0], ybr: br[1], ba: Math.atan2(bl[1] - br[1], br[0] - bl[0]) * 180 / Math.PI };   /* the Experience shape hangs from this bottom edge (the lowest run, bottom-left to bottom-right) */
        /* every text box stays MARGIN px inside the quad: where it comes closer, the padding on that side grows by the shortfall and the row is drawn again */
        function fitNeed(sel) {
          const er = el.getBoundingClientRect(), need = { t: 0, b: 0, l: 0, r: 0 }, k = window.Stage ? window.Stage.s() : 1;   /* rects are screen px under the stage zoom, the quad is in design px */
          el.querySelectorAll(sel).forEach(function (t) {
            if (!t.getClientRects().length) return;   /* display:none (the facts and detail lines on phones and touch) has no box: its zero rect would sit outside the quad and grow the padding for ever */
            const g =document.createRange(); g.selectNodeContents(t); const eb = t.getBoundingClientRect(), gb = g.getBoundingClientRect(), rr = gb.width && gb.height ? { left: Math.min(eb.left, gb.left), top: Math.min(eb.top, gb.top), width: Math.max(eb.right, gb.right) - Math.min(eb.left, gb.left), height: Math.max(eb.bottom, gb.bottom) - Math.min(eb.top, gb.top) } : eb, r ={ width: rr.width / k, height: rr.height / k }, x0 = (rr.left - er.left) / k, y0 = (rr.top - er.top) / k;
            for (let k = 0; k <= 6; k++) for (let s = 0; s < 4; s++) {
              const x = x0 + (s < 2 ? k / 6 * r.width : (s - 2) * r.width), y = y0 + (s < 2 ? s * r.height : k / 6 * r.height);
              const q = inside(all, x, y), lack = MARGIN - q.d;
              if (lack <= 0) continue;
              const side = Math.abs(q.sx) > Math.abs(q.sy) ? (y < H / 2 ? "t" : "b") : (x < W / 2 ? "l" : "r");
              need[side] = Math.max(need[side], lack);
            }
          });
          return need;
        }
        function growPad(need, sf) {   /* raises the padding by the shortfalls; true when it did */
          if (need.t + need.b + need.l + need.r + sf <= 0.5) return false;
          if (need.t) { S.pt = parseFloat(cs.paddingTop) + Math.ceil(need.t); el.style.setProperty("--wk-pt", S.pt + "px"); }
          if (need.b || sf > 0.5) { S.pb = parseFloat(cs.paddingBottom) + Math.ceil(Math.max(need.b, sf)); el.style.setProperty("--wk-pb", S.pb + "px"); }
          S.pl += Math.ceil(need.l); S.pr += Math.ceil(need.r);
          el.style.setProperty("--wk-pl", S.pl + "px"); el.style.setProperty("--wk-pr", S.pr + "px");
          return true;
        }
        if (pass < 5 && !zone) { if (growPad(fitNeed(TXT), 0)) return draw(pass + 1); }   /* zones: the text is drawn by transform, so it is checked after wkPlace places it */
        /* the game picture sits inside the same quad: its clip is the quad moved into the picture's own box */
        const shot = el.querySelector(":scope > .obj-shot");
        let seam = null;
        if (shot) {
          /* the picture is fully dark under the whole text block (its widest line, measured by range), then fades in */
          const er2 = el.getBoundingClientRect(), rg = document.createRange(), k2 = window.Stage ? window.Stage.s() : 1; let tx = 0;
          if (flip) tx = W;   /* mirrored: tx is the text's reach from the row's right edge, measured from its leftmost line */
          const pk = el.classList.contains("is-peek"), tk = [zh, el.querySelector(":scope > .obj-hook"), el.querySelector(":scope > .props")].filter(Boolean);   /* and at rest, without the slide back from a hover: a redraw while the row is hovered measures the same */
          tk.forEach(function (t) { t.style.transition = "none"; });
          if (pk) el.classList.remove("is-peek");
          el.querySelectorAll(zone ? TXTZ + ", :scope > h3" : TXT).forEach(function (t) { if (!t.getClientRects().length) return; rg.selectNodeContents(t); const rc = rg.getBoundingClientRect(); tx = flip ? Math.min(tx, (rc.left - er2.left) / k2) : Math.max(tx, (rc.right - er2.left) / k2); });
          if (pk) el.classList.add("is-peek");
          el.getBoundingClientRect(); tk.forEach(function (t) { t.style.transition = ""; });
          if (flip) tx = W - tx;
          if (zone && !flip && wide) { seam = tx + 16; el.style.setProperty("--wk-seam", seam.toFixed(1) + "px"); } else el.style.removeProperty("--wk-seam");   /* text on the left: where the text zone ends and the picture fades in (row px; the checker reads it). Flipped rows keep their hover text where it is */
          el.querySelectorAll(":scope > :is(.obj-shot, .obj-clip)").forEach(function (m) { m.style.width = wide && (el._wkExt || el._wkExtL) ? (W - 0.2 * (W - el._wkExt - el._wkExtL)).toFixed(1) + "px" : ""; });   /* the picture keeps its place relative to the text: it grows with the row on both sides */
          el.querySelectorAll(":scope > :is(.obj-shot, .obj-clip)").forEach(function (m) { m.style.setProperty("--wk-tx", Math.max(0, flip ? tx + 16 - (W - m.offsetLeft - m.offsetWidth) : tx + 16 - m.offsetLeft).toFixed(0) + "px"); });   /* the playing clip fades in from the same place as the still */
        }
        if (shot) el.querySelectorAll(":scope > :is(.obj-shot, .obj-clip)").forEach(function (m) { m.style.setProperty("--wk-shot-clip", "polygon(" + all.map(function (p) { return (p[0] - m.offsetLeft).toFixed(1) + "px " + (p[1] - m.offsetTop).toFixed(1) + "px"; }).join(", ") + ")"); });   /* each (the still and the clip) in its own box: Conclusus draws them at different sizes */
        const sf = zone && zh ? wkPlace(el, pts, poly.end, bi, W, H, seam, flip) : 0;   /* the facts sit at the bottom edge; a row too short for them to clear the hook grows by the shortfall and is measured once more */
        if (zone && zh && pass < 5 && growPad(fitNeed(":scope > h3, :scope > .obj-hook, :scope > .obj-line, .props > div"), sf)) return draw(pass + 1);   /* main's rule: the title, hook, detail line and facts sit MARGIN px inside the plate, else the padding grows and the row is drawn again */
        /* wkPlace runs last, so the padding check, the picture's fade and the tag all read the pieces at their grid places, as before */
      }
      draw();
      if (window.ResizeObserver) new ResizeObserver(function () { draw(); }).observe(el);
      el._wkDraw = draw;
      if (!window._wkLate) {   /* the page width settles after the first draw (scrollbar), and each draw measures the text at the previous draw's grid place (and the next row's): for the first ~3 s after load, when the width changes, two passes over all rows */
        window._wkLate = true;
        let cw0 = document.documentElement.clientWidth, n = 0;
        const pass = function () { for (let k = 0; k < 2; k++) document.querySelectorAll(".work > a.obj[data-wornquad]").forEach(function (r) { if (r._wkDraw) r._wkDraw(); }); };
        const poll = function () { const cw = document.documentElement.clientWidth; if (cw !== cw0) { cw0 = cw; pass(); } if (++n < 180) requestAnimationFrame(poll); };
        requestAnimationFrame(function () { pass(); poll(); });
      }
      if (document.fonts) document.fonts.ready.then(function () { draw(); });   /* and once the web fonts swap in: an id line can grow without the row's size changing */
      window.addEventListener("resize", function () { const cw = document.documentElement.clientWidth; if (el._wkCw === cw) return; el._wkCw = cw; draw(); clearTimeout(el._wkRz); el._wkRz = setTimeout(function () { draw(); }, 200); });   /* page zoom while open: the capped stage keeps the row's box, so only the window says the width changed; the late pass settles the text padding once a resize or zoom crosses 1200 */
    });
  }

  /* the Experience + contact shape: one black quad (the owner's drawing, corners as box fractions) whose top edge
     takes the bottom-edge angle of the last Work row so the two stay parallel (the chips are Shapes.wear's);
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
      const gap = XP_GAP * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16) * Math.cos(a);   /* a little more air than between the rows (XP_GAP 4rem vs WK_GAP 3rem): Experience is a new section */
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
      quad(el, red, pts, "--xp-clip");
      wearPlate(el, "xp-wear", [[pts[0], pts[1]]]);
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
  function boot() { wearApply(); workRows(); const x = document.querySelector(".xp-shape"); if (x) xpShape(x); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  window.addEventListener("load", function () { wearApply(); });

  window.Shapes = {
    rng: rng,
    apply: wearApply,
    wear: wear, edgeProfile: edgeProfile, wearPresets: wearPresets, wearKinds: WEAR_KINDS
  };
})();
