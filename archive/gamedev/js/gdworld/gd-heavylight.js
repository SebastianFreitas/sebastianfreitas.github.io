/* HeavyLight's field: the game's own tiles. A band of tile grid (0.18–0.79 H) at the planet's parallax; floor and ceiling masses stepped in whole tiles, sparse floating platforms; the ceiling mass runs up to the top screen edge and the floor mass down to the bottom screen edge, the open band between them unchanged; every exposed side of a solid tile carries the light rim; empty cells show the dark back wall; interior solid cells are batched through a pattern fill, not drawn tile by tile. Lower near the planet and near every mark so the zone art and marks stay clear. Pixel scale is capped at 3 to match the zone art (px(), read by zones.js). Registers GdWorld.P.heavylight. */
(function () {
  const G = window.GdWorld; if (!G) return;
  const { F, sx, dens, GAMES, clearBox } = G;
  const { smooth, ridge, hash1 } = Util;
  const I = 2, PAR = 0.7, SEED = 34, BAND0 = 0.18, BAND1 = 0.79;
  const C = { D: "#04253c", O: "#143f5e", M: "#306082", L: "#5a86a5", BK: "#041522", BS: "#0a2335" };
  const PRI = { D: 0, O: 1, M: 2, L: 3 };
  const FLAT = ["L", "M", "O"];                       // top/bottom rim, depth 0..2 from the edge
  const SIDE = [["L","L","M","M","O"], ["L","M","M","M","O"], [null,"L","M","O","O"]]; // left/right rim by u%3, depth 0..4; null = transparent notch
  const NUB = [[0,0,"L"],[1,0,"L"],[2,0,"L"],[0,1,"L"],[0,2,"L"],[3,0,"M"],[0,3,"M"],[1,1,"M"],[4,0,"O"],[0,4,"O"],[2,1,"O"],[1,2,"O"],[5,0,"O"],[0,5,"O"]]; // [dx, dy, colour] measured from the corner
  const tiles = new Map();      // key m*4+v → 16×16 canvas
  const backs = [];             // 4 back-wall 16×16 canvases
  const pats = new Map();       // p → back-wall CanvasPattern
  const spats = new Map();      // p → interior CanvasPattern
  let cells = new Uint8Array(0);
  let alpha = new Float32Array(0);

  function px() { return Math.min(3, Math.max(2, Math.round(3 * F.k))); }

  function tileCanvas(m, v) {
    const key = m * 4 + v;
    if (tiles.has(key)) return tiles.get(key);
    const px = new Array(256).fill("D");
    for (let i = 0; i < 256; i++) {
      if (hash1(v * 4099 + i) < 0.035) px[i] = "O";
    }
    function put(x, y, c) {
      if (x < 0 || x > 15 || y < 0 || y > 15) return;
      const i = y * 16 + x;
      if (px[i] === null) return;
      if (c === null) { px[i] = null; return; }
      if (PRI[c] > PRI[px[i]]) px[i] = c;
    }
    for (let u = 0; u < 16; u++) {
      for (let d = 0; d < 3; d++) {
        if (m & 1) put(u, d, FLAT[d]);
        if (m & 4) put(u, 15 - d, FLAT[d]);
      }
      for (let d = 0; d < 5; d++) {
        const c = SIDE[u % 3][d];
        if (m & 2) put(15 - d, u, c);
        if (m & 8) put(d, u, c);
      }
    }
    if ((m & 1) && (m & 2)) put(15, 0, null);
    if ((m & 2) && (m & 4)) put(15, 15, null);
    if ((m & 4) && (m & 8)) put(0, 15, null);
    if ((m & 8) && (m & 1)) put(0, 0, null);
    for (const [bit, fx, fy] of [[16,1,0],[32,1,1],[64,0,1],[128,0,0]]) {
      if (m & bit) {
        for (const [dx, dy, c] of NUB) {
          put(fx ? 15 - dx : dx, fy ? 15 - dy : dy, c);
        }
      }
    }
    const cv = document.createElement("canvas");
    cv.width = 16; cv.height = 16;
    const cx = cv.getContext("2d");
    for (let i = 0; i < 256; i++) {
      const c = px[i];
      if (c === null) continue;
      cx.fillStyle = C[c];
      cx.fillRect(i % 16, (i / 16) | 0, 1, 1);
    }
    tiles.set(key, cv);
    return cv;
  }

  function backCanvas(v) {
    if (backs[v]) return backs[v];
    const cv = document.createElement("canvas");
    cv.width = 16; cv.height = 16;
    const cx = cv.getContext("2d");
    cx.fillStyle = C.BK;
    cx.fillRect(0, 0, 16, 16);
    for (let i = 0; i < 256; i++) {
      const x = i % 16;
      const h = hash1(v * 7919 + i + 555);
      let mark = h < 0.05;
      if (!mark && h < 0.12 && x > 0) {
        mark = hash1(v * 7919 + i - 1 + 555) < 0.05;
      }
      if (mark) {
        cx.fillStyle = C.BS;
        cx.fillRect(x, (i / 16) | 0, 1, 1);
      }
    }
    backs[v] = cv;
    return cv;
  }

  function backPattern(p) {
    if (pats.has(p)) return pats.get(p);
    const cv = document.createElement("canvas");
    cv.width = 64 * p; cv.height = 64 * p;
    const cx = cv.getContext("2d");
    cx.imageSmoothingEnabled = false;
    for (let a = 0; a < 4; a++) {
      for (let b = 0; b < 4; b++) {
        const v = Math.floor(hash1(a * 13 + b * 7 + 3) * 4);
        cx.drawImage(backCanvas(v), a * 16 * p, b * 16 * p, 16 * p, 16 * p);
      }
    }
    const pat = F.ctx.createPattern(cv, "repeat");
    pats.set(p, pat);
    return pat;
  }

  function solidPattern(p) {
    if (spats.has(p)) return spats.get(p);
    const cv = document.createElement("canvas");
    cv.width = 64 * p; cv.height = 64 * p;
    const cx = cv.getContext("2d");
    cx.imageSmoothingEnabled = false;
    for (let a = 0; a < 4; a++) {
      for (let b = 0; b < 4; b++) {
        const v = Math.floor(hash1(a * 17 + b * 5 + 11) * 3);
        cx.drawImage(tileCanvas(0, v), a * 16 * p, b * 16 * p, 16 * p, 16 * p);
      }
    }
    const pat = F.ctx.createPattern(cv, "repeat");
    spats.set(p, pat);
    return pat;
  }

  function paint(w) {
    const { ctx, W, H, camX, sc, k } = F;
    const p = px();
    const T = 16 * p;
    const N = Math.floor((BAND1 - BAND0) * H / T);
    if (N < 6) return;
    const y0 = Math.round((BAND0 + BAND1) / 2 * H - N * T / 2);

    const A = Math.ceil(y0 / T);                          // rows above the open band, up to the top edge
    const B = Math.max(0, Math.ceil((H - (y0 + N * T)) / T)); // rows below, down to the bottom edge
    const R = A + N + B;                                   // total grid rows
    const top = y0 - A * T;                                // y of grid row 0

    const CU = T / (PAR * sc);
    const j0 = Math.floor((camX - (W / 2 + T) / (PAR * sc)) / CU);
    const cols = Math.ceil(W / T) + 3;
    if (cells.length < cols * R) cells = new Uint8Array(cols * R);
    else cells.fill(0, 0, cols * R);
    if (alpha.length < cols) alpha = new Float32Array(cols);

    const psx = sx(GAMES[I].x, PAR);
    for (let n = 0; n < cols; n++) {
      const j = j0 + n;
      const xw = (j + 0.5) * CU;
      const d = dens(I, xw);
      alpha[n] = d < 0.01 ? 0 : Math.min(1, d / 0.3);
      if (alpha[n] === 0) continue;
      const cx2 = sx(xw, PAR);
      const f = d * smooth((Math.abs(cx2 - psx) - 520 * k) / (260 * k));

      const qF = Math.round(ridge(j * 0.19, SEED) * 6) / 6;
      let fh = Math.round(1 + qF * 4 * f);
      const qC = Math.round(ridge(j * 0.17 + 50, SEED + 7) * 6) / 6;
      let ch = Math.round(1 + qC * 3 * f);
      ch = Math.min(ch, N - fh - 4);
      ch = Math.max(1, ch);

      while (fh > 1 && clearBox(cx2, y0 + (N - fh) * T + T / 2, T / 2, T / 2) < 0.6) fh--;
      while (ch > 1 && clearBox(cx2, y0 + (ch - 1) * T + T / 2, T / 2, T / 2) < 0.6) ch--;

      for (let r = 0; r < A + ch; r++) cells[n * R + r] = 1;
      for (let r = A + N - fh; r < R; r++) cells[n * R + r] = 1;

      const kk = Math.floor(j / 9);
      if (hash1(kk * 31 + SEED) < 0.6 && f > 0.9) {
        const s = kk * 9 + Math.floor(hash1(kk * 37 + SEED) * 4);
        const wd = 2 + Math.floor(hash1(kk * 41 + SEED) * 3);
        const row = 3 + Math.floor(hash1(kk * 43 + SEED) * (N - 7));
        if (j >= s && j < s + wd && row >= ch + 2 && row < N - fh - 2 &&
            clearBox(cx2, y0 + row * T + T / 2, T / 2, T / 2) > 0.95) {
          cells[n * R + (A + row)] = 1;
        }
      }
    }

    function sol(n, r) {
      if (n < 0) n = 0;
      if (n >= cols) n = cols - 1;
      if (r < 0 || r >= R) return alpha[n] > 0;   // mass continues past the screen edge; no rim there
      return cells[n * R + r] === 1 && alpha[n] > 0;
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const x0 = Math.round(sx(j0 * CU, PAR));

    const pat = backPattern(p);
    pat.setTransform(new DOMMatrix([1, 0, 0, 1, x0 - (((j0 % 4) + 4) % 4) * T, y0]));
    for (let n = 0; n < cols; n++) {
      if (alpha[n] <= 0) continue;
      const x = x0 + n * T;
      ctx.globalAlpha = alpha[n];
      ctx.fillStyle = pat;
      let r = 0;
      while (r < R) {
        if (sol(n, r)) { r++; continue; }
        let r2 = r;
        while (r2 < R && !sol(n, r2)) r2++;
        ctx.beginPath();
        ctx.rect(x, top + r * T, T, (r2 - r) * T);
        ctx.fill();
        r = r2;
      }
    }

    const spat = solidPattern(p);
    spat.setTransform(new DOMMatrix([1, 0, 0, 1, x0 - (((j0 % 4) + 4) % 4) * T, y0]));
    for (let n = 0; n < cols; n++) {
      if (alpha[n] <= 0) continue;
      const x = x0 + n * T;
      ctx.globalAlpha = alpha[n];
      let r0 = -1;                          // start of the current interior run, or -1
      for (let r = 0; r <= R; r++) {
        const s = r < R && sol(n, r);
        let m = 0;
        if (s) {
          if (!sol(n, r - 1)) m |= 1;
          if (!sol(n + 1, r)) m |= 2;
          if (!sol(n, r + 1)) m |= 4;
          if (!sol(n - 1, r)) m |= 8;
          if (!(m & 3) && !sol(n + 1, r - 1)) m |= 16;
          if (!(m & 6) && !sol(n + 1, r + 1)) m |= 32;
          if (!(m & 12) && !sol(n - 1, r + 1)) m |= 64;
          if (!(m & 9) && !sol(n - 1, r - 1)) m |= 128;
        }
        if (s && m === 0) {
          if (r0 < 0) r0 = r;
          continue;
        }
        if (r0 >= 0) {
          ctx.fillStyle = spat;
          ctx.beginPath();
          ctx.rect(x, top + r0 * T, T, (r - r0) * T);
          ctx.fill();
          r0 = -1;
        }
        if (!s) continue;
        const v = Math.floor(hash1((j0 + n) * 131 + (r - A) * 7 + 9) * 3);
        const y = top + r * T;
        ctx.drawImage(backCanvas(0), x, y, T, T);
        ctx.drawImage(tileCanvas(m, v), x, y, T, T);
      }
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  G.P.heavylight = { base: [0, 0, 0], layers: [{ par: PAR, paint }], px };
})();
