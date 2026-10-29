/* genesis-ceilshapes.js: the ceiling's metal and glass objects, built as Path2D in the cloud's own px (top edge y = 0 tucks into the band).
   metal: pitted meteorite iron, mostly a lumpy rock (rarely the -///- symbol of rough chunks) with pits, cracks and dull sheen patches; seeded so no two match. */
window.GenCeilShapes = (function () {
  function rect(p, x, y, w, h) { p.moveTo(x, y); p.lineTo(x + w, y); p.lineTo(x + w, y + h); p.lineTo(x, y + h); p.closePath(); }
  function quad(p, a, b, c, d) { p.moveTo(a[0], a[1]); p.lineTo(b[0], b[1]); p.lineTo(c[0], c[1]); p.lineTo(d[0], d[1]); p.closePath(); }

  // a closed polygon whose edges are broken into rough, fractured stretches (each edge split in 3 with seeded sideways jitter, amp px)
  function rough(p, pts, amp, hs, k) {
    const n = pts.length; let first = true;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      for (let j = 0; j < 3; j++) {
        const f = j / 3, o = j ? amp * (hs(k + i * 3 + j) - 0.5) * 2 : 0, x = a[0] + dx * f - dy / l * o, y = Math.max(0, a[1] + dy * f + dx / l * o);
        if (first) { p.moveTo(x, y); first = false; } else p.lineTo(x, y);
      }
    }
    p.closePath();
  }
  // a pit: a dark hole (pits) with a pale filled lip crescent on its lower-right side (lips); light comes from the upper left
  function pit(pits, lips, x, y, r, flip) {
    pits.moveTo(x + r, y); pits.ellipse(x, y, r, r * 0.85, 0, 0, 6.283);
    const a0 = flip ? 4.52 : 3.2, a1 = flip ? 6.22 : 4.9;   // flip: the rock is drawn mirrored, so build the arc on the upper right to read upper-left on screen
    lips.moveTo(x + r * 1.15 * Math.cos(a0), y + r * 1.0 * Math.sin(a0)); lips.ellipse(x, y, r * 1.15, r * 1.0, 0, a0, a1);   // a thin arc on the lit upper-left rim (stroked)
  }
  // meteorite iron: most are a lumpy, fractured, pitted rock (p = body, pits/lips/cr = pits, their pale lips and cracks, pt = dull sheen patches on the lit upper left);
  // rarely the -///- symbol with every bar a rough pitted chunk. Returns the rock's eye sites ({x, y, a: crack angle}) for later; none on the symbol
  function metal(w, h, hs, p, pt, pits, lips, cr, flip) {
    const eyes = [];
    if (hs(3) < 0.85) {   // rock: a ring of seeded radii, some points pulled in flat (fractured facets), top flattened into the band
      const n = 13 + Math.floor(hs(4) * 5), cx = w / 2, cy = h * 0.5, P = [];
      for (let i = 0; i < n; i++) {
        const a = i / n * 6.283, r = 0.78 + 0.22 * hs(i + 20) - (hs(i + 60) < 0.2 ? 0.16 : 0);
        P.push([cx + Math.cos(a) * w * 0.5 * r, Math.max(0, cy + Math.sin(a) * h * 0.5 * r * (Math.sin(a) < 0 ? 1.1 : 1))]);
      }
      for (let i = 0; i < n; i++) {
        const q = P[i], m = P[(i + 1) % n];
        if (i === 0) p.moveTo(q[0], q[1]); else p.lineTo(q[0], q[1]);
        if (hs(i + 100) < 0.5) p.lineTo((q[0] + m[0]) / 2 + (hs(i + 120) - 0.5) * h * 0.1, (q[1] + m[1]) / 2 + (hs(i + 140) - 0.3) * h * 0.1);   // a bulge or a dent mid-facet
      }
      p.closePath();
      const inside = (x, y, k) => { const u = (x - cx) / (w * 0.5), v = (y - cy) / (h * 0.5); return u * u + v * v < k; };
      for (let i = 0, c = 9 + Math.floor(hs(5) * 7); i < c; i++) {
        const x = w * (0.1 + 0.8 * hs(i + 200)), y = h * (0.1 + 0.8 * hs(i + 230));
        if (inside(x, y, 0.6)) pit(pits, lips, x, y, Math.max(1.5, h * (0.025 + 0.07 * hs(i + 260) * hs(i + 290))), flip);
      }
      for (let i = 0, c = 2 + Math.floor(hs(6) * 2); i < c; i++) {   // cracks: short jagged runs
        let x = w * (0.2 + 0.6 * hs(i + 320)), y = h * (0.25 + 0.5 * hs(i + 340)); const a = 6.283 * hs(i + 360);
        cr.moveTo(x, y);
        for (let s = 0; s < 4; s++) { x += Math.cos(a + (hs(i * 7 + s + 380) - 0.5) * 1.2) * h * 0.1; y += Math.sin(a + (hs(i * 7 + s + 400) - 0.5) * 1.2) * h * 0.1; cr.lineTo(x, y); }
      }
      for (let i = 0, k = 0; i < n && k < 3; i++) {   // sheen: thin strokes hugging the lit silhouette edge (upper left on screen: upper right here when flipped), inset a little
        const q = P[i], m = P[(i + 1) % n], mx = (q[0] + m[0]) / 2, my = (q[1] + m[1]) / 2;
        if ((flip ? mx < cx : mx > cx) || my > cy - h * 0.05 || my < 2 || (k && hs(i + 420) < 0.4)) continue;
        const dx = cx - mx, dy = cy - my, dl = Math.hypot(dx, dy) || 1, ox = dx / dl * 2.5, oy = dy / dl * 2.5;
        pt.moveTo(q[0] + ox + (m[0] - q[0]) * 0.12, q[1] + oy + (m[1] - q[1]) * 0.12); pt.lineTo(m[0] + ox - (m[0] - q[0]) * 0.12, m[1] + oy - (m[1] - q[1]) * 0.12); k++;
      }
      for (let i = 0, c = Math.max(2, 1 + Math.floor(hs(8) * 3)); i < c; i++) {   // eye sites (2 or 3): on the face, well in from the edge
        for (let g = 0; g < (i === 1 && eyes.length < 2 ? 24 : 12); g++) {
          const x = w * (0.25 + 0.5 * hs(i * 31 + g + 500)), y = h * (0.3 + 0.4 * hs(i * 31 + g + 530));
          if (inside(x, y, 0.35) && eyes.every((e) => Math.hypot(e.x - x, e.y - y) > h * 0.25)) { eyes.push({ x: x, y: y, a: (hs(i + 560) - 0.5) * 1.2 }); break; }
        }
      }
      eyes.rock = true;
      return eyes;
    }
    // the -///- symbol: a bar at each end, three slashes between, the centre one clearly the biggest; every piece a rough pitted chunk
    const cx = w / 2, sp = Math.max(h * 0.5, w * 0.18) * (0.9 + 0.2 * hs(9)), tc = h * (0.17 + 0.07 * hs(10)), ts = h * (0.07 + 0.04 * hs(11)), kc = h * (0.3 + 0.16 * hs(12)), ks = h * (0.1 + 0.1 * hs(13)), by = h * (0.4 + 0.12 * hs(14)), bt = h * (0.08 + 0.05 * hs(15));
    let ko = 600;
    const chunk = (pts, amp, a, b, t) => {   // a to b = the piece's centre line, t = its thickness
      rough(p, pts, amp, hs, ko);
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]), c = Math.max(1, Math.round(len / (h * 0.14)));
      for (let i = 0; i < c; i++) {
        const f = (i + 0.3 + 0.4 * hs(ko + 70 + i)) / c, o = (hs(ko + 80 + i) - 0.5) * t * 0.3;
        pit(pits, lips, a[0] + (b[0] - a[0]) * f + o, a[1] + (b[1] - a[1]) * f, Math.max(1.2, t * (0.1 + 0.1 * hs(ko + 90 + i))), flip);
      }
      ko += 150;
    };
    const sl = (x, t, k, y0, y1) => chunk([[x - k / 2, y1], [x - k / 2 + t, y1], [x + k / 2 + t, y0], [x + k / 2, y0]], Math.min(t, (y1 - y0) * 0.3) * 0.4, [x + t / 2 - k / 2, y1], [x + t / 2 + k / 2, y0], t);
    sl(cx, tc, kc, 0, h * 0.96); sl(cx - sp, ts, ks, h * 0.28, h * 0.68); sl(cx + sp, ts, ks, h * 0.28, h * 0.68);
    const lx = cx - sp - ks / 2 - ts * 0.5, rx = cx + sp + ks / 2 + ts * 1.5;
    if (lx > 2) chunk([[0, by], [lx, by], [lx, by + bt], [0, by + bt]], bt * 0.3, [0, by + bt / 2], [lx, by + bt / 2], bt);
    if (w - rx > 2) chunk([[rx, by], [w, by], [w, by + bt], [rx, by + bt]], bt * 0.3, [rx, by + bt / 2], [w, by + bt / 2], bt);
    return eyes;
  }
  // glass: a smooth, slightly irregular rounded slab/bubble (seeded bulges and pinches); p = body, pl = the rim's lit (upper-left) stretches, pt = faint inner streaks
  function glass(w, h, hs, p, pl, pt) {
    const n = 12 + Math.floor(hs(1) * 4), cx = w / 2, cy = h * 0.5, rx = w * 0.49, ry = h * 0.46, sq = 0.75 + 0.25 * hs(2), P = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * 6.283, r = 1 + 0.2 * (hs(i + 20) - 0.5) * 2 - (hs(i + 60) < 0.18 ? 0.16 : 0);   // a few pinches
      P.push([cx + Math.cos(a) * rx * r, Math.max(0, cy + Math.sin(a) * ry * r * (Math.sin(a) < 0 ? sq : 1))]);
    }
    const mid = (i) => { const a = P[i % n], b = P[(i + 1) % n]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
    const m0 = mid(n - 1);
    p.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) { const m = mid(i); p.quadraticCurveTo(P[i][0], P[i][1], m[0], m[1]); }
    p.closePath();
    const lit = 0.25 + 0.5 * hs(3);   // how far round the lit rim reaches
    for (let i = 0; i < n; i++) {
      const a = i / n * 6.283;
      if (Math.cos(a) * 0.8 + Math.sin(a) * 0.6 < -lit) { const s = mid((i + n - 1) % n), m = mid(i); pl.moveTo(s[0], s[1]); pl.quadraticCurveTo(P[i][0], P[i][1], m[0], m[1]); }
    }
    for (let k = 0, c = 1 + Math.floor(hs(4) * 2); k < c; k++) {
      const x = w * (0.2 + 0.4 * hs(5 + k)), y = h * (0.28 + 0.2 * hs(8 + k)), l = Math.min(w * 0.14, h * 0.5) * (0.7 + 0.6 * hs(11 + k));
      pt.moveTo(x, y + l * 0.5); pt.quadraticCurveTo(x - l * 0.15, y, x + l * 0.35, y - l * 0.3);
    }
  }
  return { metal: metal, glass: glass };
})();
