/* ===========================================================
   RED LINES — seeded red line pieces riding a plate's rough edge (the approved sheet 26, D71/D72).
   One <svg class="redlines"> per plate with a single path of flat polygons, written once and redrawn
   only when the plate's size changes. The edge is read from the plate's own ::before clip-path, and
   the svg takes the ::before's box and tilt, so the pieces stay parallel to what is drawn.
   Plates carry data-redlines="<id>" (the seed) and data-redlines-kind="gate|obj" (default obj).
   =========================================================== */

window.RedLines = (function () {
  const NS = "http://www.w3.org/2000/svg";
  const DEBOUNCE = 150;

  // sheet values at 100%: ref = the sheet's plate width; left = [start y, length, thickness]; the right vertical hangs rover past the bottom
  const PRESETS = {
    gate: { ref: 560, gate: true, left: [[-17, 150, 6], [200, 93, 4]], rover: 41, rlen: 143, rt: 6 },
    item: { ref: 460, gate: false, left: [[-31, 44, 5]], rover: 46, rlen: 67, rt: 4, smin: 0.75 }, // cards and notes: the sheet's stack plate; smin keeps the thinnest stroke at 3 px
    obj: { ref: 860, gate: false, left: [[-14, 70, 6], [130, 50, 4]], rover: 22, rlen: 100, rt: 6 },
  };

  const drawn = new WeakMap(); // plate -> "WxH" it was last drawn at
  const skipped = new WeakSet(); // plates whose ::before had no box yet (open row)
  const due = new Set();
  let timer = 0;
  let ro = null;

  function rng(a) {
    return () => {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function hash(s) {
    let h = 7;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
    return h % 997 + 1;
  }

  // the plate's top and bottom edge from its computed polygon: t = [x fraction, y px from top], b = [x fraction, y px from bottom (<= 0)]
  function readEdge(el, W, self) {
    const flat = { t: [[0, 0], [1, 0]], b: [[0, 0], [1, 0]], ok: false };
    const m = /^polygon\((.*)\)$/.exec(getComputedStyle(el, self ? null : "::before").clipPath || "");
    if (!m) return flat;
    const parts = [];
    let depth = 0, cur = "";
    for (const ch of m[1]) {
      if (ch === "(") depth++;
      if (ch === ")") depth--;
      if (ch === "," && depth === 0) { parts.push(cur); cur = ""; } else cur += ch;
    }
    parts.push(cur);
    const t = [], b = [];
    for (const part of parts) {
      const xy = part.trim().match(/calc\([^)]*\)|\S+/g);
      if (!xy || xy.length !== 2) continue;
      const px = /^(-?[\d.]+)(px|%)?$/.exec(xy[0]);
      if (!px) continue;
      const x = px[2] === "%" ? +px[1] / 100 : +px[1] / W;
      let c;
      if ((c = /^calc\(\s*100%\s*-\s*([\d.]+)px\s*\)$/.exec(xy[1]))) b.push([x, -c[1]]);
      else if (xy[1] === "100%") b.push([x, 0]);
      else if ((c = /^(-?[\d.]+)px$/.exec(xy[1]))) t.push([x, +c[1]]);
    }
    if (t.length < 2 || b.length < 2) return flat;
    t.sort((p, q) => p[0] - q[0]);
    b.sort((p, q) => p[0] - q[0]);
    return { t, b, ok: true };
  }

  function edgeY(pts, W, x) {
    const u = x / W;
    if (u <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (u <= pts[i][0]) {
        const p = pts[i - 1], q = pts[i];
        return p[1] + (q[1] - p[1]) * (u - p[0]) / (q[0] - p[0]);
      }
    }
    return pts[pts.length - 1][1];
  }

  // a seeded choice of 2 of the 4 corners as perfect (square cut); an end near a corner takes that corner's cut, else a coin flip
  function cornerSq(W, H, seed) {
    const r = rng(seed * 17 + 3), k = [0, 1, 2, 3];
    for (let i = 3; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [k[i], k[j]] = [k[j], k[i]]; }
    const perf = [false, false, false, false];
    perf[k[0]] = perf[k[1]] = true; // 0 TL, 1 TR, 2 BL, 3 BR
    return (x, y, rr, vert) => {
      const nx = vert ? (x < W / 2 ? 0 : 1) : (x < 0.3 * W ? 0 : x > 0.7 * W ? 1 : -1), ny = y < H / 2 ? 0 : 1;
      if (!vert && nx < 0) return rr() < 0.5;
      return perf[ny * 2 + nx];
    };
  }

  // top row on the LEFT half, bottom row on the RIGHT half; the first piece overshoots its corner by 14-47 px (capped to the room left on screen).
  // Both rows end at or before 0.47 of the width; a closed row's bottom run is short and ends well clear of mid (gate keeps the long run).
  function genPieces(W, seed, s, gate, lim) {
    const r = rng(seed * 3 + 1);
    const row = (n, mir, cap) => {
      const a = [], Ls = [], F = [];
      let x = -Math.min((14 + r() * 33) * s, cap) / W;
      const short = mir && !gate, e = short ? 0.33 + r() * 0.09 : 0.43 + r() * 0.04;
      for (let i = 0; i < n; i++) Ls.push((0.06 + r() * 0.11 + (n === 2 ? 0.03 : 0)) * (short ? 0.7 : 1) * (n === 3 ? 0.8 : 1));
      for (let i = 0; i < n; i++) F.push(0.5 + r());
      const gap = (e - x - Ls.reduce((u, v) => u + v, 0)) / F.slice(0, n - 1).reduce((u, v) => u + v, 0);
      Ls.forEach((L, i) => {
        a.push(mir ? [W * (1 - x - L), W * (1 - x)] : [W * x, W * (x + L)]);
        x += L + gap * F[i];
      });
      return a;
    };
    return { top: row(2 + (r() < 0.5 ? 1 : 0), false, lim[0]), bot: row(2 + (r() < 0.5 ? 1 : 0), true, lim[1]) };
  }

  // one-sided stroke, as polygon points in plate coordinates; o 'h'/'v', out -1 = outside the box top/left, 1 = bottom/right;
  // sq = [start, end] square cut (else taper to 1.5 px); about 1/6 thin mid-way to 30-50% over 25-45% of the length, never break
  function taper(o, x, y, L, t, out, ang, sd, sq, fin, fd) {
    const k = 0.15, R = rng((sd || 1) * 7919 + 13);
    let dm = R() < 1 / 6, dw = 0.25 + R() * 0.20, dc = 0.15 + dw / 2 + R() * (0.7 - dw), dd = 0.3 + R() * 0.2;
    const iL = fin || R() < 0.5, iR = fin || R() < 0.5;
    if (fd) { dm = true; dc = fd[0]; dw = fd[1]; dd = fd[2]; }
    const ps = [0, k, 1 - k, 1];
    if (dm) ps.push(dc - dw / 2, dc - dw / 6, dc + dw / 6, dc + dw / 2);
    ps.sort((a, b) => a - b);
    // depth from the box edge: a tapered end loses width from the outer side (hi) or the inner side (lo), chosen per end
    const band = (u) => {
      let lo = 0, hi = t;
      if (u < k && !sq[0]) { const v = 1.5 + (t - 1.5) * u / k; if (iL) lo = Math.max(lo, t - v); else hi = Math.min(hi, v); }
      if (u > 1 - k && !sq[1]) { const v = 1.5 + (t - 1.5) * (1 - u) / k; if (iR) lo = Math.max(lo, t - v); else hi = Math.min(hi, v); }
      if (dm) { const q = Math.abs(u - dc), h = dw / 2; if (q < h) hi = Math.min(hi, t * (dd + (1 - dd) * Math.max(0, (q - dw / 6) / (h - dw / 6)))); }
      return [lo, hi];
    };
    const pos = (d) => (out < 0 ? t - d : d);
    const loc = ps.map((u) => [u * L, pos(band(u)[1])]).concat(ps.slice().reverse().map((u) => [u * L, pos(band(u)[0])]));
    if (o === "v") return loc.map((q) => [(out < 0 ? x - t : x) + q[1], y + q[0]]);
    const c = Math.cos(ang), s = Math.sin(ang), oy = out < 0 ? t : 0;
    return loc.map((q) => { const px = q[0], py = q[1] - oy; return [x + px * c - py * s, y + px * s + py * c]; });
  }

  // V arm: own damage (symmetric thinning over a stretch, no break), optional tapered tip (thins over the last 15%)
  function vstroke(x0, y0, x1, y1, t, dmg, tap) {
    const L = Math.hypot(x1 - x0, y1 - y0), a = Math.atan2(y1 - y0, x1 - x0), topHi = Math.cos(a) < 0, ps = [0, 1];
    if (tap) ps.push(0.85);
    if (dmg) ps.push(dmg[0] - dmg[1] / 2, dmg[0] - dmg[1] / 6, dmg[0] + dmg[1] / 6, dmg[0] + dmg[1] / 2);
    const P = [...new Set(ps.filter((u) => u >= 0 && u <= 1))].sort((p, q) => p - q);
    const band = (u) => {
      let lo = 0, hi = t;
      if (dmg) {
        const q = Math.abs(u - dmg[0]), h = dmg[1] / 2;
        if (q < h) { const f = dmg[2] + (1 - dmg[2]) * Math.max(0, (q - dmg[1] / 6) / (h - dmg[1] / 6)); lo = t / 2 - t * f / 2; hi = t / 2 + t * f / 2; }
      }
      if (tap && u > 0.85) { const v = 1.5 + (t - 1.5) * (1 - u) / 0.15; if (topHi) hi = Math.min(hi, v); else lo = Math.max(lo, t - v); }
      return [lo, hi];
    };
    const c = Math.cos(a), s = Math.sin(a);
    return P.map((u) => [u * L, band(u)[1]]).concat(P.slice().reverse().map((u) => [u * L, band(u)[0]]))
      .map((q) => { const px = q[0], py = q[1] - t / 2; return [x0 + px * c - py * s, y0 + px * s + py * c]; });
  }

  // every polygon wound the same way, so overlaps (the corner cross) fill instead of cutting
  function pathOf(polys) {
    return polys.map((p) => {
      let area = 0;
      for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; area += p[i][0] * q[1] - q[0] * p[i][1]; }
      const pts = area < 0 ? p.slice().reverse() : p;
      return "M" + pts.map((q) => Math.round(q[0] * 10) / 10 + " " + Math.round(q[1] * 10) / 10).join("L") + "Z";
    }).join("");
  }

  function build(W, H, E, c, seed, lim) {
    const s = Math.min(1, Math.max(c.smin || 0, W / (c.ref * 0.9)));
    const polys = [];
    const sq = cornerSq(W, H, seed), r = rng(seed + 7), g = genPieces(W, seed, s, c.gate, lim);
    const seg = (P, xm) => { const u = xm / W; let i = 1; while (i < P.length - 1 && u > P[i][0]) i++; return [P[i - 1][0] * W, P[i - 1][1], P[i][0] * W, P[i][1]]; };
    // angle = the edge segment under the piece's midpoint; the line passes through the edge at the midpoint
    const place = (p, P, base) => {
      const xm = (p[0] + p[1]) / 2, e = seg(P, xm), a = Math.atan2(e[3] - e[1], e[2] - e[0]);
      const ym = base + edgeY(P, W, xm), y0 = ym - Math.tan(a) * (xm - p[0]);
      return [y0, Math.hypot(p[1] - p[0], (p[1] - p[0]) * Math.tan(a)), a];
    };
    if (c.gate) {
      // GATE B: corner cross, shallow V, no long top piece, one short square piece at the bottom right corner
      const vx = 0.23 * W, vy = edgeY(E.t, W, vx), lx = 0.085 * W, ly = edgeY(E.t, W, lx), rx = 0.30 * W;
      const ry = vy + (rx - vx) * Math.tan(Math.atan2(edgeY(E.t, W, rx) - vy, rx - vx) - 13 * Math.PI / 180);
      polys.push(taper("h", -50 * s, edgeY(E.t, W, 0), 81 * s, 6 * s, -1, 0, seed * 100 + 30, [true, true], 0, [0.30, 0.34, 0.5]));
      polys.push(vstroke(vx, vy, lx, ly, 5 * s, [0.74, 0.4, 0.5], true));
      polys.push(vstroke(vx, vy, rx, ry, 5 * s, [0.48, 0.34, 0.5]));
      const p = g.bot[0].slice();
      p[0] = p[1] - 0.6 * (p[1] - p[0]);
      const q = place(p, E.b, H);
      polys.push(taper("h", p[0], q[0], q[1], (4 + Math.round(r())) * s, 1, q[2], seed * 100 + 20, [true, true]));
    } else {
      // the one stroke that carries the long thin run: the longest, so it reads at this width
      const fr = rng(seed * 13 + 9), fw = 0.25 + fr() * 0.2, fd = [0.15 + fw / 2 + fr() * (0.7 - fw), fw, 0.3 + fr() * 0.2];
      const kv = rng(seed * 31 + 5), cap = innerHeight * 0.9;
      const lL = Math.min(H * (0.6 + kv() * 0.3), cap), rL = Math.min(H * (0.6 + kv() * 0.3), cap), ly = -(10 + kv() * 20) * s;
      const ry = H + c.rover * s - rL, rOn = ry < innerHeight;
      const cand = [["l", 0, lL]];
      if (rOn) cand.push(["r", 0, rL]);
      g.top.forEach((p, i) => cand.push(["t", i, p[1] - p[0]]));
      g.bot.forEach((p, i) => cand.push(["b", i, p[1] - p[0]]));
      const pk = cand.reduce((m, q) => (q[2] > m[2] ? q : m));
      const thin = (k, i) => (pk[0] === k && pk[1] === i ? fd : undefined);
      g.top.forEach((p, i) => {
        const q = place(p, E.t, 0);
        polys.push(taper("h", p[0], q[0], q[1], (4 + Math.round(r() * 2)) * s, -1, q[2], seed * 100 + i, [sq(p[0], 0, r), sq(p[1], 0, r)], 0, thin("t", i)));
      });
      g.bot.forEach((p, i) => {
        const q = place(p, E.b, H);
        polys.push(taper("h", p[0], q[0], q[1], (4 + Math.round(r())) * s, 1, q[2], seed * 100 + 20 + i, [sq(p[0], H, r), sq(p[1], H, r)], 0, thin("b", i)));
      });
      // long verticals down both sides, 60-90% of the plate (one viewport at most); the right one hangs past the bottom corner
      const rr = rng(seed * 29 + 11), ve = (x, y) => (y < 70 || y > H - 70 ? sq(x, y, rr, true) : rr() < 0.5);
      const lt = c.left[0][2] * s, rt = c.rt * s;
      const lx = Math.max(0, lt + 1 - lim[0]), rx = W - Math.max(0, rt + 1 - lim[1]);
      polys.push(taper("v", lx, ly, lL, lt, -1, 0, seed * 100 + 50, [ve(0, ly), ve(0, ly + lL)], 0, thin("l", 0)));
      if (rOn) polys.push(taper("v", rx, ry, rL, rt, 1, 0, seed * 100 + 90, [ve(W, ry), ve(W, ry + rL)], 0, thin("r", 0)));
      return pathOf(polys);
    }
    // gate: long verticals; an end within 70 px of a corner takes that corner's cut, else a coin flip
    const rr = rng(seed * 29 + 11);
    const ve = (x, y) => (y < 70 || y > H - 70 ? sq(x, y, rr, true) : rr() < 0.5);
    c.left.forEach((v, i) => {
      const y = v[0] * s, L = v[1] * s;
      if (i > 0 && y + L > H - 8 * s) return;
      polys.push(taper("v", 0, y, L, v[2] * s, -1, 0, seed * 100 + 50 + i, [ve(0, y), ve(0, y + L)]));
    });
    const rlen = Math.min(c.rlen * s, H), ry = H + c.rover * s - rlen;
    if (ry < innerHeight) polys.push(taper("v", W, ry, rlen, c.rt * s, 1, 0, seed * 100 + 90, [ve(W, ry), ve(W, ry + rlen)], c.gate));
    return pathOf(polys);
  }

  // draw (or redraw) the plate's svg; a plate with no size, or an open row with no ::before, is skipped
  function draw(el, opts) {
    const W0 = el.offsetWidth, H0 = el.offsetHeight;
    if (!W0 || !H0) return false;
    const o = Object.assign({}, PRESETS[(opts && opts.kind) || el.dataset.redlinesKind || "obj"], opts);
    // self: the plate's own box and clip-path (a scrolling note); its svg sits beside it in o.host and is kept at el._red
    const self = !!o.self;
    const cs = getComputedStyle(el, self ? null : "::before");
    if (cs.display === "none") { skipped.add(el); return false; }
    skipped.delete(el);
    const W = self ? W0 : parseFloat(cs.width) || W0, H = self ? H0 : parseFloat(cs.height) || H0;
    const seed = o.seed || hash(el.dataset.redlines || el.id || "plate");
    let svg = self ? el._red : el.querySelector(":scope > svg.redlines");
    if (!svg) {
      svg = document.createElementNS(NS, "svg");
      svg.setAttribute("class", "redlines");
      svg.setAttribute("aria-hidden", "true");
      svg.appendChild(document.createElementNS(NS, "path"));
      if (self) { svg.classList.add("bnote-red"); el._red = svg; }
      (o.host || el).appendChild(svg);
    }
    // a note is redrawn on its own size changes (window resize, the sheet layout) with the options it opened with
    if (self) {
      el._redOpts = opts;
      if (ro && !el._redObs) { ro.observe(el); el._redObs = true; }
    }
    svg.style.left = (self ? el.offsetLeft : parseFloat(cs.left) || 0) + "px";
    svg.style.top = (self ? el.offsetTop : parseFloat(cs.top) || 0) + "px";
    svg.style.width = W + "px";
    svg.style.height = H + "px";
    svg.style.transform = self || cs.transform === "none" ? "" : cs.transform;
    svg.style.transformOrigin = self ? "" : cs.transformOrigin;
    // room left on screen either side of the plate (the first screen's worth: a plate off to the side is not clamped)
    const rc = el.getBoundingClientRect(), cw = document.documentElement.clientWidth, sx = rc.left + (self ? 0 : parseFloat(cs.left) || 0);
    const lim = rc.right > 0 && rc.left < cw ? [Math.max(0, sx), Math.max(0, cw - sx - W)] : [1e4, 1e4];
    svg.firstChild.setAttribute("d", build(W, H, readEdge(el, W, self), o, seed, lim));
    drawn.set(el, W0 + "x" + H0);
    return true;
  }

  function flush() {
    timer = 0;
    due.forEach((el) => {
      if (el._redOpts && !el.classList.contains("show")) return;
      draw(el, el._redOpts);
    });
    due.clear();
  }

  function later(el) {
    due.add(el);
    clearTimeout(timer);
    timer = setTimeout(flush, DEBOUNCE);
  }

  // while a row is open its frame stays plain: the pieces of any plate whose reach touches or crosses the frame are hidden
  function sync() {
    const open = document.querySelector(".obj[aria-expanded=true]"), fr = open && open.getBoundingClientRect();
    document.querySelectorAll("[data-redlines] > svg.redlines").forEach((svg) => {
      const el = svg.parentNode;
      if (el.matches("article.case")) return;
      let hide = false;
      if (open && el !== open) {
        const pr = el.getBoundingClientRect();
        hide = pr.bottom + 60 > fr.top - 20 && pr.top - 60 < fr.bottom + 20;
      }
      svg.style.visibility = hide ? "hidden" : "";
    });
  }

  function watch(el) {
    if (!draw(el)) drawn.delete(el);
    if (ro) ro.observe(el);
    new MutationObserver(() => { if (skipped.has(el)) later(el); sync(); setTimeout(sync, 700); }).observe(el, { attributes: true, attributeFilter: ["aria-expanded"] });
  }

  function init() {
    const plates = document.querySelectorAll("[data-redlines]");
    if (!plates.length) return;
    if (window.ResizeObserver) {
      ro = new ResizeObserver((entries) => {
        entries.forEach((e) => {
          const el = e.target;
          if (drawn.get(el) !== el.offsetWidth + "x" + el.offsetHeight) later(el);
        });
      });
    }
    plates.forEach(watch);
    sync();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  return { draw };
})();
