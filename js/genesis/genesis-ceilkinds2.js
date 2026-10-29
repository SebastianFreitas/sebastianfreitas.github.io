/* Extra abstract hangers for the Genesis ceiling's cloud clusters: a string of uneven lumps, a stepped bar, a row of square teeth
   and a pendulum with a weight. Same draw signature as genesis-ceilkinds.js (ctx, o, x, y, H, p, t, sc, pal); o carries the seeded
   look (len, n, w, ph, dir, tk thickness, ci colour index, sp spread). Not registered in GenCeilKinds (that list sizes the ceiling's deck);
   genesis-ceiling.js reads GenCeilHang.kinds[name] = { name, len, n, draw }. Flat fills in washed palette tones, nothing bright. */
(function () {
  "use strict";
  function rgba(h, a) { return "rgba(" + parseInt(h.slice(1, 3), 16) + "," + parseInt(h.slice(3, 5), 16) + "," + parseInt(h.slice(5, 7), 16) + "," + a + ")"; }
  function col(o, pal) { return window.GenCeilKinds.hues[(o.ci + 2) % 7](pal); }

  // a hanging string of lumps: sizes, gaps and sideways offsets all uneven, some round, some square, some pinched diamonds, so it names no object
  function bead(ctx, o, x, y, H, p, t, sc, pal) {
    const r0 = (2.5 + 3.5 * o.w) * (0.7 + 0.5 * o.tk) * sc, L = o.len * H * p;
    let cy = y;
    const cord = [[x, y - 3]];   // a pale cord links the lumps to the root
    ctx.fillStyle = rgba(col(o, pal), 0.9);
    for (let i = 0; i < o.n && cy - y < L; i++) {   // the string ends at its length (len * H * p), like the other kinds
      const s = i / o.n, r = r0 * (0.45 + 1.3 * o.rnd(70 + i)), sh = Math.floor(o.rnd(90 + i) * 3);
      const bx = x + (o.rnd(80 + i) - 0.5) * r0 * 2.2 + Math.sin(o.ph + s * 2.2 + t * 0.4) * 4 * sc * s * o.amp;
      cy += r * (0.6 + 0.9 * o.rnd(100 + i));
      if (sh === 0) { ctx.beginPath(); ctx.ellipse(bx, cy, r * 0.7, r * 1.2, 0, 0, Math.PI * 2); ctx.fill(); }
      else if (sh === 1) ctx.fillRect(bx - r * 0.9, cy - r * 0.6, r * 1.8, r * 1.2);
      else { ctx.beginPath(); ctx.moveTo(bx, cy - r * 1.3); ctx.lineTo(bx + r * 0.8, cy); ctx.lineTo(bx + r * 0.2, cy + r * 1.3); ctx.lineTo(bx - r * 0.8, cy); ctx.closePath(); ctx.fill(); }
      cord.push([bx, cy]);
      cy += r * (0.5 + 1.2 * o.rnd(110 + i));
    }
    ctx.strokeStyle = "rgba(201,211,220,0.8)"; ctx.lineWidth = Math.max(1.5, 1.2 * sc); ctx.beginPath();
    for (let i = 0; i < cord.length; i++) ctx[i ? 'lineTo' : 'moveTo'](cord[i][0], cord[i][1]);
    ctx.stroke();
  }

  // a hanging stepped bar: stacked blocks, each a step narrower (or wider), shifting to one side
  function stepbar(ctx, o, x, y, H, p, t, sc, pal) {
    const n = o.n, h = (o.len * H * p / n) * 0.9 + 1, w0 = (9 + 12 * o.w) * (0.6 + 0.5 * o.tk) * sc, c = col(o, pal);
    for (let i = 0; i < n; i++) {
      const w = w0 * (1 - i * (0.55 / n) * (o.sp > 1 ? -0.6 : 1)), cx = x + o.dir * i * w0 * 0.12;
      ctx.fillStyle = rgba(c, i & 1 ? 0.8 : 0.95);
      ctx.fillRect(cx - w / 2, y - 2 + i * h, w, h + 0.5);
    }
  }

  // a row of square teeth under a bar, each a different length
  function teeth(ctx, o, x, y, H, p, t, sc, pal) {
    const n = o.n, s = (4 + 4 * o.w) * (0.7 + 0.4 * o.tk) * sc, gap = s * (0.5 + 0.5 * o.sp), c = col(o, pal), tw = n * s + (n - 1) * gap, L = o.len * H * p;
    ctx.fillStyle = rgba(c, 0.95);
    ctx.fillRect(x - tw / 2 - s * 0.3, y - 3, tw + s * 0.6, s * 0.8);
    ctx.fillStyle = rgba(c, 0.82);
    for (let i = 0; i < n; i++) {
      const l = L * (0.35 + 0.65 * o.rnd(60 + i)), tx = x - tw / 2 + i * (s + gap);
      const h = Math.max(s, l), w = Math.min(s, h * 0.55), x0 = tx + (s - w) / 2, y0 = y - 3 + s * 0.8;   // a tooth tapers to a point, its width in proportion to its length
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + w, y0); ctx.lineTo(x0 + w * 0.5, y0 + h); ctx.closePath(); ctx.fill();
    }
  }

  // a thin rod ending in a weight (disc, square or diamond), swaying a little
  function pendulum(ctx, o, x, y, H, p, t, sc, pal) {
    const L = o.len * H * p, a = Math.sin(t * 0.5 + o.ph) * 0.1 * o.dir, ex = x + Math.sin(a) * L, ey = y + Math.cos(a) * L, c = col(o, pal), r = (4 + 5 * o.w) * (0.7 + 0.5 * o.tk) * sc;
    ctx.strokeStyle = "rgba(201,211,220,0.95)"; ctx.lineWidth = Math.max(2, (1.2 + 0.7 * o.tk) * sc); ctx.lineCap = "butt";
    ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.fillStyle = rgba(c, 0.95);
    const m = o.n % 3;
    if (m === 0) { ctx.beginPath(); ctx.arc(ex, ey + r, r, 0, Math.PI * 2); ctx.fill(); }
    else if (m === 1) ctx.fillRect(ex - r, ey, r * 2, r * 2);
    else { ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + r, ey + r); ctx.lineTo(ex, ey + r * 2); ctx.lineTo(ex - r, ey + r); ctx.closePath(); ctx.fill(); }
  }

  window.GenCeilHang = {
    kinds: {
      bead: { name: "bead", len: [0.05, 0.1], n: [4, 9], draw: bead },
      stepbar: { name: "stepbar", len: [0.06, 0.12], n: [3, 6], draw: stepbar },
      teeth: { name: "teeth", len: [0.04, 0.09], n: [3, 6], draw: teeth },
      pendulum: { name: "pendulum", len: [0.06, 0.13], n: [0, 5], draw: pendulum }
    }
  };
})();
