// The ship as one solid, data only (proof stage, not loaded by any page): for every pixel of the rest side-view sprite, how thick the ship is there.
// Thickness is the half-depth toward and away from the camera, in sprite pixels, from the tables the live turn already uses:
// the hull aft of the collar follows HEADON (voidship-hull.js, through sprite().rows) at the full beam, the collar is a round ring about the nose's axis,
// the nose is a lathe about that axis (ZB capped by the ring's hole) with thin plates for the slabs and stubs (FINS, as zOf in voidship-prow.js).
(function () {
  'use strict';
  const H = window.VoidshipHull; if (!H) return;
  // the tables of voidship-prow.js (private there, copied: keep in step with ZB, FINS, zOf, YM, RING_RI, NAVY_RO)
  const YM = -0.015, RING_RI = 0.17, NAVY_RO = 124 / 590;
  const ZB = [[0.30, 0.15], [0.43, 0.17], [0.50, 0.13], [0.86, 0.07], [1.04, 0.0513]];   // ends at the nose tip, TIP in voidship-prow.js
  const FINS = [[0.54, 0.72, 0.027], [0.755, 0.795, 0.005], [0.88, 1.02, 0.017], [1.16, 1.195, 0.004]];
  // the blade's spine without its chips (zOf's SYS is private; the chips are under 0.012)
  const SP0 = -0.0175 + (-0.12 + 0.0175) * 1.5, SP1 = -0.105, SPINE = (x) => SP0 + (x - 0.30) * (SP1 - SP0) / 1.0;
  const BEAM = 1.3 * 2 * 0.18;   // the hull's full beam in hull units, as voidship-art.js draws the head-on end face
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (v) => v * v * (3 - 2 * v);
  const lerpY = (pts, x) => { for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; if (x >= a[0] && x <= b[0]) return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); } return pts[pts.length - 1][1]; };
  const noseHalf = (x, y) => {
    const dy = y - YM, zb = Math.min(lerpY(ZB, clamp(x, 0.30, 1.04)), Math.sqrt(Math.max(0, (RING_RI + 0.003) * (RING_RI + 0.003) - dy * dy)));
    const f = FINS.find((q) => x >= q[0] && x <= q[1]);
    return f ? f[2] + (zb - f[2]) * ease(clamp((y - (SPINE(clamp(x, 0.30, 1.04)) - 0.004)) / 0.014, 0, 1)) : zb;
  };
  const cache = {};
  const now = () => (window.performance || Date).now();
  // the depth map in row steps: depthInit, then depthRows until it returns the map (cached) or null
  function depthInit(L, dpr) {
    const sp = H.sprite(L, dpr), cv = sp.canvas, w = cv.width, h = cv.height;
    return { sp, cv, w, h, s: L * dpr, ox: sp.ox, oy: sp.oy, ring: H.anchors.ring, a: cv.getContext('2d').getImageData(0, 0, w, h).data, half: new Float32Array(w * h), j: 0 };
  }
  function depthRows(S, until) {
    const { sp, w, h, s, ox, oy, ring, a, half } = S, floor = 0.004;
    do {
      const j = S.j++, y = (j + 0.5 - oy) / s, row = sp.rows[j], dy = y - YM;
      for (let i = 0; i < w; i++) {
        if (a[(j * w + i) * 4 + 3] === 0) continue;
        const x = (i + 0.5 - ox) / s;
        let z;
        if (x < ring.aft) z = (row ? row.w : 0.03) * BEAM / 2;
        else if (x <= ring.fore) z = Math.sqrt(Math.max(floor * floor, NAVY_RO * NAVY_RO - dy * dy));
        else z = noseHalf(x, y);
        half[j * w + i] = Math.max(floor, z) * s;
      }
    } while (S.j < h && now() < until);
    return S.j < h ? null : { w, h, half, sprite: S.cv, ax: ox, ay: oy, aft: ring.aft * s };
  }
  function depth(L, dpr) {
    const key = L + '|' + dpr;
    if (cache[key]) return cache[key];
    return (cache[key] = depthRows(depthInit(L, dpr), Infinity));
  }
  // The turn baked from the solid. The solid is the rest sprite extruded to +-half at every pixel; it is turned about the vertical axis through
  // (ax, ay) by theta toward the camera and every surface is splatted into one depth buffer at SS times the sprite resolution (nearest wins), then box-averaged down.
  // Surfaces: the near and far face (a line per pixel, joined to its neighbours' heights) and the fore wall where the right neighbour is empty (the solid's end face).
  // Aft-facing surfaces never face the camera between 0 and 90 degrees, so they are not drawn. Walls take the pixel's colour in one flat step darker (the light is from the left).
  const N = 61, SS = 2, WALL = 0.7, CAP = 0.75, IN = 0.125, bakes = {};   // IN: faces are splatted this far inside their pixel, so the rotation of a tiny angle does not push an edge sample into the next sub-pixel
  // render and smoothed are generators: they yield between row bands so prepare can check the clock; bake runs them to the end
  function* render(D, th) {
    const w = D.w, h = D.h, half = D.half, ax = D.ax, sternX = D.ax + D.aft, c = Math.cos(th), s = Math.sin(th), W = w * SS, Hh = h * SS;
    const src = D.sprite.getContext('2d').getImageData(0, 0, w, h).data;
    const zb = new Float32Array(W * Hh).fill(-1e9), col = new Uint8ClampedArray(W * Hh * 4);
    // where each row's fore wall stands, its colour and its alpha: the run's end and the end pixel (colour weighted by alpha) averaged 1-2-1 with the neighbouring rows' (when their ends are within 5 px),
    // so the stepped, antialiased ends of a fin read as one wall instead of a dark or faint row beside a solid one
    const wallX = new Float32Array(w * h), wallC = new Float32Array(w * h * 4), endOf = (p) => { let e = p; while ((e + 1) % w && src[(e + 1) * 4 + 3]) e++; return e; };
    for (let j = 0; j < h; j++) for (let i = 0, y0 = (j & 7) || (yield); i < w; i++) {
      const p = j * w + i; if (!src[p * 4 + 3] || (i < w - 1 && src[(p + 1) * 4 + 3])) continue;
      let t = 2 * (i + 1), n = 2, ca = 2 * src[p * 4 + 3], cr = ca * src[p * 4], cg = ca * src[p * 4 + 1], cb = ca * src[p * 4 + 2];
      for (const q of [p - w, p + w]) if (q >= 0 && q < w * h && src[q * 4 + 3]) {
        const e = endOf(q), ec = e % w; if (Math.abs(ec - i) > 5) continue;
        const ea = src[e * 4 + 3]; t += ec + 1; n++; ca += ea; cr += ea * src[e * 4]; cg += ea * src[e * 4 + 1]; cb += ea * src[e * 4 + 2];
      }
      wallX[p] = t / n; wallC[p * 4] = cr / ca; wallC[p * 4 + 1] = cg / ca; wallC[p * 4 + 2] = cb / ca; wallC[p * 4 + 3] = ca / n;
    }
    // a wall that stays faint (its end pixels are nearly clear, so its colour is junk and the row would be a gap or a dark stripe in the fin head-on) takes the wall of the nearest row above or below that is solid
    const wallS = wallC.slice();
    for (let j = 0; j < h; j++) for (let i = 0, y0 = (j & 7) || (yield); i < w; i++) {
      const p = j * w + i; if (!wallX[p] || wallS[p * 4 + 3] >= 32) continue;
      for (const q of [p - w, p + w]) if (q >= 0 && q < w * h && src[q * 4 + 3]) {
        const e = endOf(q); if (Math.abs(e % w - i) > 5 || wallS[e * 4 + 3] < 32) continue;
        for (let k = 0; k < 4; k++) wallC[p * 4 + k] = wallS[e * 4 + k];
        break;
      }
    }
    // and the colour of every solid wall is spread over the rows two above and below (1-2-3-2-1, ends within 5 px) so no row of a fin is a shade apart from its neighbours
    const wallT = wallC.slice();
    for (let j = 0; j < h; j++) for (let i = 0, y0 = (j & 7) || (yield); i < w; i++) {
      const p = j * w + i; if (!wallX[p] || wallT[p * 4 + 3] < 32) continue;
      let t = 3, cr = 3 * wallT[p * 4], cg = 3 * wallT[p * 4 + 1], cb = 3 * wallT[p * 4 + 2];
      for (let d = -2; d <= 2; d++) if (d && j + d >= 0 && j + d < h && src[(p + d * w) * 4 + 3]) {
        const e = endOf(p + d * w); if (Math.abs(e % w - i) > 5 || wallT[e * 4 + 3] < 32) continue;
        const k = 3 - Math.abs(d); t += k; cr += k * wallT[e * 4]; cg += k * wallT[e * 4 + 1]; cb += k * wallT[e * 4 + 2];
      }
      wallC[p * 4] = cr / t; wallC[p * 4 + 1] = cg / t; wallC[p * 4 + 2] = cb / t;
    }
    const zs = new Float32Array(W * Hh).fill(-1e9), sc = new Uint8ClampedArray(W * Hh * 4);   // samples that are not fully opaque (antialiased edges, faint walls): aft of the collar the nearest one per sub-pixel, laid over the solid after and only if nearer than it, so a soft edge pixel never replaces the solid behind it
    const put = (X, Z, j, r, g, b, a) => {
      const px = Math.floor((X * c - Z * s + ax) * SS); if (px < 0 || px >= W) return;
      const d = Z * c + X * s;
      for (let k = 0; k < SS; k++) {
        const o = (j * SS + k) * W + px; if (a < 255) { if (d > zs[o]) { zs[o] = d; sc[o * 4] = r; sc[o * 4 + 1] = g; sc[o * 4 + 2] = b; sc[o * 4 + 3] = a; } continue; }
        if (d <= zb[o]) continue;
        zb[o] = d; col[o * 4] = r; col[o * 4 + 1] = g; col[o * 4 + 2] = b; col[o * 4 + 3] = a;
      }
    };
    // a straight run in (X, Z) from (x0, z0) to (x1, z1), dense enough to touch every output pixel it crosses
    const seg = (x0, z0, x1, z1, j, r, g, b, a) => {
      const n = Math.max(2, Math.ceil(Math.abs((x1 - x0) * c - (z1 - z0) * s) * SS * 2) + 1);
      for (let t = 0; t < n; t++) { const u = t / (n - 1); put(x0 + (x1 - x0) * u, z0 + (z1 - z0) * u, j, r, g, b, a); }
    };
    for (let j = 0; j < h; j++) {
      if (!(j & 3)) yield;
      for (let i = 0; i < w; i++) {
        const p = j * w + i, a = src[p * 4 + 3]; if (!a) continue;
        const hi = half[p], hl = i > 0 && half[p - 1] > 0 ? (half[p - 1] + hi) / 2 : hi, rOpen = i === w - 1 || !src[(p + 1) * 4 + 3];
        const hr = rOpen ? hi : (half[p + 1] + hi) / 2, xl = i - ax + IN, xr = (rOpen ? wallX[p] : i + 1) - ax - IN, r = src[p * 4], g = src[p * 4 + 1], b = src[p * 4 + 2];
        seg(xl, hl, xr, hr, j, r, g, b, a);
        seg(xl, -hl, xr, -hr, j, r, g, b, a);
        if (rOpen) { const wk = i < sternX ? 1 : WALL; seg(xr, hr, xr, -hr, j, wallC[p * 4] * wk, wallC[p * 4 + 1] * wk, wallC[p * 4 + 2] * wk, wallC[p * 4 + 3] < 32 ? wallC[p * 4 + 3] : wallC[p * 4 + 3] + (255 - wallC[p * 4 + 3]) * s * s); }
      }
    }
    for (let o = 0; o < W * Hh; o++) {
      if (!(o & 8191)) yield;
      const a = sc[o * 4 + 3]; if (!a || zs[o] <= zb[o]) continue;
      const k = a / 255, ao = col[o * 4 + 3] * Math.min(1, 2 * s * s), an = a + ao * (1 - k);
      for (let m = 0; m < 3; m++) col[o * 4 + m] = (sc[o * 4 + m] * a + col[o * 4 + m] * ao * (1 - k)) / an;
      col[o * 4 + 3] = an;
    }
    const out = new Uint8ClampedArray(w * h * 4), q = SS * SS;
    for (let j = 0; j < h; j++) for (let i = 0, y0 = (j & 7) || (yield); i < w; i++) {
      let sa = 0, sr = 0, sg = 0, sb = 0;
      for (let k = 0; k < SS; k++) for (let m = 0; m < SS; m++) {
        const o = ((j * SS + k) * W + i * SS + m) * 4, a = col[o + 3];
        sa += a; sr += col[o] * a; sg += col[o + 1] * a; sb += col[o + 2] * a;
      }
      const o = (j * w + i) * 4; if (!sa) continue;
      out[o] = sr / sa; out[o + 1] = sg / sa; out[o + 2] = sb / sa; out[o + 3] = sa / q;
    }
    // every face is baked one sprite row at a time, so the rows of the nose and the lower hull differ in shade and in where they end: a 1-2-1 down each column on the baked frame
    // (colour and alpha, colour weighted by alpha), as strong as sin(yaw) so the rest pose is untouched
    const a1 = 0.25 * s, res = new Uint8ClampedArray(out);
    for (let j = 1; j < h - 1; j++) for (let i = 0, y0 = (j & 15) || (yield); i < w; i++) {
      const o = (j * w + i) * 4, u = o - w * 4, d = o + w * 4, au = out[u + 3], ac = out[o + 3], ad = out[d + 3];
      if (!ac || !(au || ad)) continue;
      const near = (q) => Math.abs(out[q] - out[o]) + Math.abs(out[q + 1] - out[o + 1]) + Math.abs(out[q + 2] - out[o + 2]) < 90;   // a neighbour of another colour is an edge, not a stripe: it stays out
      const eu = au && near(u) ? a1 : 0, ed = ad && near(d) ? a1 : 0, wu = eu * au / 255, wd = ed * ad / 255, wc = (1 - eu - ed) * ac / 255, t = wu + wd + wc;
      for (let m = 0; m < 3; m++) res[o + m] = (out[u + m] * wu + out[d + m] * wd + out[o + m] * wc) / t;
      res[o + 3] = ac * (1 - eu - ed) + au * eu + ad * ed;
    }
    return res;
  }
  // half-thickness for the bake: capped by CAP times the shorter of the horizontal and vertical opaque runs it sits in (a mast or fin stays thin instead of taking the hull's width),
  // then averaged 1-2-1 down each column over the opaque pixels, so neighbouring rows are extruded alike and the turned edge does not comb
  function* smoothed(D) {
    const w = D.w, h = D.h, out = new Float32Array(w * h), half = new Float32Array(D.half);
    const run = new Float32Array(w * h).fill(1e9);
    for (let j = 0; j < h; j++) for (let i = 0, y0 = (j & 15) || (yield); i < w;) {
      let e = i; while (e < w && D.half[j * w + e]) e++;
      if (e === i) { i++; continue; }
      for (let k = i; k < e; k++) run[j * w + k] = e - i;
      i = e;
    }
    for (let i = 0; i < w; i++) for (let j = 0, y0 = (i & 15) || (yield); j < h;) {
      let e = j; while (e < h && D.half[e * w + i]) e++;
      if (e === j) { j++; continue; }
      for (let k = j; k < e; k++) { const p = k * w + i; half[p] = Math.min(half[p], CAP * Math.min(run[p], e - j)); }
      j = e;
    }
    for (let j = 0; j < h; j++) for (let i = 0, y0 = (j & 15) || (yield); i < w; i++) {
      const p = j * w + i; if (!half[p]) continue;
      let t = 2 * half[p], n = 2;
      if (j > 0 && half[p - w]) { t += half[p - w]; n++; }
      if (j < h - 1 && half[p + w]) { t += half[p + w]; n++; }
      out[p] = t / n;
    }
    return out;
  }
  // One set at a time: a new key drops the old set, the old depth map and any half-done bake. prepare works in units (depth rows, the thickness smoothing, one frame) until the budget is spent.
  let cur = null;
  function prepare(L, dpr, budgetMs) {
    const key = L + '|' + dpr;
    if (!cur || cur.key !== key) {
      for (const k in cache) delete cache[k];
      for (const k in bakes) delete bakes[k];
      cur = { key, t0: now(), work: 0, S: null, D: null, frames: [] };
    }
    if (bakes[key]) return bakes[key];
    const t1 = now(), until = t1 + budgetMs;
    if (!cur.S) cur.S = depthInit(L, dpr);
    while (true) {
      if (!cur.D) {
        if (!cur.D0) cur.D0 = depthRows(cur.S, until);
        else {
          if (!cur.sg) cur.sg = smoothed(cur.D0);
          const r = cur.sg.next();
          if (r.done) { cur.D = Object.assign({}, cur.D0, { half: r.value }); cur.sg = null; }
        }
      } else {
        const D = cur.D, w = D.w, h = D.h, f = cur.frames.length;
        if (!cur.cv) { cur.cv = document.createElement('canvas'); cur.cv.width = w; cur.cv.height = h; if (f) cur.rg = render(D, f * 90 / (N - 1) * Math.PI / 180); }
        if (f === 0) cur.cv.getContext('2d').drawImage(D.sprite, 0, 0);
        else {
          const r = cur.rg.next();
          if (!r.done) { if (now() >= until) { cur.work += now() - t1; return null; } continue; }
          cur.cv.getContext('2d').putImageData(new ImageData(r.value, w, h), 0, 0); cur.rg = null;
        }
        cur.frames.push(cur.cv); cur.cv = null;
        if (cur.frames.length === N) {
          cur.work += now() - t1;
          return (bakes[key] = { frames: cur.frames, n: N, w, h, ax: D.ax, ay: D.ay, ms: Math.round(cur.work), bytes: N * w * h * 4 });
        }
      }
      if (now() >= until) { cur.work += now() - t1; return null; }
    }
  }
  function bake(L, dpr) {
    let r; while (!(r = prepare(L, dpr, Infinity))); return r;
  }
  // the frame for any yaw 0 to 180 (0 = nose right, 180 = nose left); beyond 90 it is the same ship seen from the other side, mirrored
  function frameAt(set, yawDeg) {
    const y = clamp(yawDeg, 0, 180), mirror = y > 90, th = mirror ? 180 - y : y;
    return { canvas: set.frames[Math.round(th / 90 * (set.n - 1))], mirror };
  }
  window.VoidshipTurnFrames = { depth, bake, prepare, frameAt };
})();
