/* Sector Zero's field: the room in the lantern's reach. The game's storeroom (drop-ceiling grid, open steel racks with a few boxes and binders, one black doorway every few racks, plank floor with scratches) is baked once per pixel scale and height into a repeating strip at the planet's parallax; it shows at 0.10 everywhere and properly only inside three wide lantern pools, each three stepped rings, drifting slowly with the game's two flickers (a short dip, a rare hard off; none with reduced motion). Pools fade round every mark. No wash, no grade. Pixel scale capped at 3 (px()). Registers GdWorld.P.zero. */
(function () {
  const G = window.GdWorld; if (!G) return;
  const { F, sx, dens, clearBox } = G;
  const { hash1, TAU } = Util;
  const I = 0, PAR = 0.7, BAND0 = 0.18, BAND1 = 0.79;
  const SW = 1024;                                          // strip width, art px; the room repeats every SW
  const AMB = 0.10;                                         // how much of the room shows outside every pool
  const RINGS = [[1.0, 0.30], [0.72, 0.35], [0.45, 0.40]];  // [radius fraction, alpha], outer to inner: a pool's core reaches ~0.75
  const POOLS = [[0.20, 0.62, 0.33], [0.52, 0.74, 0.28], [0.84, 0.58, 0.31]]; // [x / W, y / H, r / H]
  const C = {
    ceil: "#050b04", grid: "#13250d", fix: "#0d1c0d", lip: "#192e14",
    wall: "#152610", post: "#384d2d", shelf: "#4c613a", shelfSh: "#0d1b0b",
    box: "#253c1c", boxSh: "#172610", seam: "#0d1b0b", door: "#13250d",
    base: "#13250d", pl0: "#5f7e41", pl1: "#546f36", pl2: "#58753a",
    plSeam: "#131f0b", scratch: "#7a9c54"
  };
  let stripKey = "", pat = null;

  function px() { return Math.min(3, Math.max(2, Math.round(3 * F.k))); }

  function stripPattern(p, H) {
    if (!(H > 0)) return null;
    const key = p + "x" + H;
    if (key === stripKey) return pat;
    const AH = Math.ceil(H / p);
    const b0 = Math.round(BAND0 * H / p);
    const b1 = Math.round(BAND1 * H / p);
    const cv = document.createElement("canvas");
    cv.width = SW * p; cv.height = AH * p;
    const g = cv.getContext("2d");
    if (!g) { stripKey = key; pat = null; return null; }
    g.imageSmoothingEnabled = false;
    buildStrip(g, p, AH, b0, b1);
    const made = F.ctx && F.ctx.createPattern(cv, "repeat-x");
    if (!made) { stripKey = key; pat = null; return null; }
    pat = made;
    stripKey = key;
    return pat;
  }

  function buildStrip(g, p, AH, b0, b1) {
    function R(x, y, w, h, c) { g.fillStyle = c; g.fillRect(x * p, y * p, w * p, h * p); }

    // a. Ceiling.
    R(0, 0, SW, b0, C.ceil);
    const ys = [];
    let y = b0 - 3, gap = 4;
    while (y > 0) { ys.push(y); R(0, y, SW, 1, C.grid); y -= gap; gap += 2; }
    for (let x = 0; x < SW; x += 32) R(x, 0, 1, b0, C.grid);
    for (let i = 0; i < SW / 32 - 1; i++) {
      if (hash1((i * 7 + 3) | 0) < 0.3) {
        const j = Math.floor(hash1((i * 11 + 3) | 0) * 3);
        if (ys[j + 1] !== undefined) R(i * 32 + 1, ys[j + 1] + 1, 31, ys[j] - ys[j + 1] - 1, C.fix);
      }
    }
    for (let j = 0; j < 6; j++) {
      g.globalAlpha = 1 - Math.pow((j + 0.5) / 6, 0.9);
      R(0, Math.floor(j * b0 / 6), SW, Math.floor((j + 1) * b0 / 6) - Math.floor(j * b0 / 6), "#000");
    }
    g.globalAlpha = 1;
    R(0, b0, SW, 2, C.lip);

    // b. Wall.
    R(0, b0 + 2, SW, b1 - b0 - 2, C.wall);

    // c. Racks and doorways.
    if (b1 - b0 >= 40) {
      let x = 4, k = 0;
      while (x < SW - 70) {
        if (k % 6 === 3) {
          const dw = 36, top = Math.max(b0 + 8, b1 - 110);
          R(x, top, dw, b1 - top, C.door);
          R(x + 2, top + 2, dw - 4, b1 - top - 2, "#000");
          x += dw + 14; k++; continue;
        }
        const rw = 40 + Math.floor(hash1((k * 5 + 1) | 0) * 24);
        const top = Math.max(b0 + 8, b1 - (100 + Math.floor(hash1((k * 9 + 1) | 0) * 40)));
        const sh = 22 + Math.floor(hash1((k * 3 + 1) | 0) * 4);
        let ry = top;
        while (ry < b1 - 6) {
          let bx = x + 3 + Math.floor(hash1((k * 7 + ry) | 0) * 10);
          while (bx < x + rw - 6) {
            const u = hash1((bx * 13 + ry * 7) | 0);
            if (u < 0.45) { bx += 6 + Math.floor(u * 30); continue; }
            let bw, bh;
            if (u < 0.75) {
              bw = 8 + Math.floor(hash1((bx * 23 + ry) | 0) * 9);
              bh = 6 + Math.floor(hash1((bx * 29 + ry) | 0) * 7);
            } else {
              bw = 2 * (3 + Math.floor(hash1((bx * 17 + ry) | 0) * 3));
              bh = 11 + Math.floor(hash1((bx * 19 + ry) | 0) * 4);
            }
            bw = Math.min(bw, x + rw - 3 - bx);
            if (bw < 3) break;
            bh = Math.min(bh, sh - 4);
            const ty = ry + sh - bh;
            const lw = Math.max(1, Math.floor(bw * 0.3));
            R(bx, ty, bw, bh, C.box);
            R(bx + lw, ty, bw - lw, bh, C.boxSh);
            if (u >= 0.75) {
              for (let q = bx + 2; q < bx + bw; q += 2) R(q, ty, 1, bh, C.seam);
            }
            bx += bw + 4 + Math.floor(hash1((bx * 37 + ry) | 0) * 14);
          }
          ry += sh;
          R(x, ry, rw, 2, C.shelf);
          R(x, ry + 2, rw, 1, C.shelfSh);
        }
        R(x, top, rw, 2, C.shelf);
        R(x, top, 2, b1 - top, C.post);
        R(x + rw - 2, top, 2, b1 - top, C.post);
        x += rw + 8 + Math.floor(hash1((k * 13 + 1) | 0) * 26); k++;
      }
    }

    // d. Baseboard.
    R(0, b1 - 4, SW, 4, C.base);

    // e. Floor.
    R(0, b1, SW, AH - b1, C.pl0);
    let fy = b1, gh = 3, row = 0;
    while (fy < AH) {
      R(0, fy, SW, 1, C.plSeam);
      const step = 60 + Math.floor(hash1((row * 7 + 5) | 0) * 50);
      const off = Math.floor(hash1((row * 3 + 5) | 0) * 80) % step;
      for (let s = off - step; s < SW; s += step) {
        const col = [C.pl0, C.pl1, C.pl2][Math.floor(hash1(((s + step) * 5 + row) | 0) * 3)];
        R(Math.max(0, s + 1), fy + 1, s + step - Math.max(0, s + 1), gh, col);
        if (s >= 0) R(s, fy + 1, 1, gh, C.plSeam);
      }
      fy += gh + 1; gh = Math.min(gh + 1, 12); row++;
    }

    // f. Scratches.
    for (let i = 0; i < 70; i++) {
      const sx0 = Math.floor(hash1((i * 41 + 9) | 0) * SW);
      const sy = b1 + 3 + Math.floor(hash1((i * 43 + 9) | 0) * Math.max(1, AH - b1 - 5));
      const ln = 4 + Math.floor(hash1((i * 47 + 9) | 0) * 10);
      for (let q = 0; q < ln; q++) {
        const yy = sy + Math.floor(q / 4);
        if (yy < AH) R((sx0 + q) % SW, yy, 1, 1, C.scratch);
      }
    }
  }

  function pool(i, t, red, W, H) {
    const [fx, fy, fr] = POOLS[i];
    const tt = red ? 0 : t;
    const cx = W * (fx + 0.07 * Math.sin(tt * 0.05 * (1 + i * 0.3) + i * 2.1));
    const cy = H * (fy + 0.05 * Math.sin(tt * 0.07 * (1 + i * 0.2) + i * 1.3));
    const r = H * fr * (1 + 0.04 * Math.sin(tt * 0.11 + i));
    let f = 1;
    if (!red) {
      const sl = Math.floor(t / 0.9 + i * 0.37);
      if (hash1((sl * 31 + i * 7) | 0) < 0.12) {
        const ph = t / 0.9 + i * 0.37 - sl;
        const dl = (0.1 + 0.4 * hash1((sl * 13 + i * 5) | 0)) / 0.9;
        if (ph < dl) f *= 0.6;
      }
      const s2 = Math.floor((t + i * 2.3) / 9);
      if (hash1((s2 * 23 + i) | 0) < 0.35) {
        const o = 1 + 6 * hash1((s2 * 19 + i * 3) | 0);
        const ph2 = (t + i * 2.3) - s2 * 9;
        if (ph2 >= o && ph2 < o + 0.14) f = 0;
      }
    }
    return { cx, cy, r, f };
  }

  function paint(w) {
    const { ctx, W, H, camX, t, red } = F;
    const d = dens(I, camX);
    if (d < 0.01) return;
    const fa = Math.min(1, d / 0.3);
    const p = px();
    const pt = stripPattern(p, H);
    if (!pt) return;
    const SWp = SW * p;
    const ox = ((Math.round(sx(0, PAR)) % SWp) + SWp) % SWp;
    pt.setTransform(new DOMMatrix([1, 0, 0, 1, ox, 0]));
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = pt;
    ctx.globalAlpha = AMB * fa;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 3; i++) {
      const P = pool(i, t, red, W, H);
      if (P.f <= 0) continue;
      for (const [rf, ra] of RINGS) {
        const rr = P.r * rf;
        const a = ra * P.f * fa * clearBox(P.cx, P.cy, 0.7 * rr, 0.7 * rr);
        if (a < 0.01) continue;
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(P.cx, P.cy, rr, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  G.P.zero = { base: [4, 8, 3], layers: [{ par: PAR, paint }], px };
})();
