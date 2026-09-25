/* Conclusus's field: the game's own slabs. Its 32 px platforms (floor1-4 under Grass1-5, colours from the Unity sprites) float in the game's flat #2f2427 void in staircases, pairs and runs of up to three, on a 32 px column / 8 px row grid inside the band 0.18-0.79 H at the planet's parallax; slow #afc084 motes drift over it (the game's rain). No pins, symbols, spike balls, doors or silhouettes. Dimmed near the planet and faded round every mark. Pixel scale capped at 3 (px(), read by zones.js). Registers GdWorld.P.conclusus. */
(function () {
  const G = window.GdWorld; if (!G) return;
  const { F, sx, dens, GAMES, clearBox } = G;
  const { smooth, hash1, mulberry } = Util;
  const I = 3, PAR = 0.7, SEED = 71, BAND0 = 0.18, BAND1 = 0.79, CH = 7, A0 = 0.62;
  const COL = { a: "#b4c788", b: "#62554c", c: "#463c3c" };
  const MOTE = "#afc084";

  const FL = [
    ".aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.aaaabbaabbbbaabaabbaababbbaaaaaaababbbbbabbbababbbbbabbbbabaabaacabbbbbbbbbabbbbbbbabbbbbbbabbbacbbcbbbbbbbbbbbbbbbbbbbbbbbbabbaccbcbbcbbbbbbbbbbbbbbbbbbbbbbbbaccbbcbbcbcbbbcbbbbbbbbbbbbbbbbbc.cccccbcccccbbcbbbbbbbbbbbbbbbc.c.ccccccccccccccbccccbcccbcbcc.c....c.c...cc...cc....cc..c.c.............c............c.........",
    ".aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.aaabaaababbbbbaabaaababbbaabbaaaaababbabbbabbaabbbbaabbbabbbbabacabbabbbbabbbbbbbbbabbbbbabbbbaacbbbbbbbbbbbbbbbabbbabbbabbbbbbaccbbbccbbbbbbbbbbbbbbbbbbbbbbbbaccbbccbbcbbbcbbbbbbbbbbbbbbbbbbc.cccccbcbbcccbbbbbbbbbbbbbbbbbc.c.ccccccccccccccbccccbbccbcbcc.c....ccc..ccc..ccc.cc.cc..c.c..........c..c........c.............",
    ".aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.aaaaaabbaaabbbaabbbaaaabaabaabaaabaaaabbbabbabbabbabbabaababbbaacbbbabbbbbabbabbabbbabbbbbbbabaaccbbbbbbbbabbbbbbbbbbbbbbbbbbbbaccbcbbbbcbbbbbbbbbbbbbbbbbbbbbbaccccbbbbcbccbbbbbbbcbcbbbbbbbbbc.cccccbbbcccccbbbbccbcbbbbbbbbc.c.ccccccccccccccbccccbcccbcbcc.c....c.cc..cc...cc....cc..ccc...........c..c.....................",
    ".aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.aababaaaabaabaaabbaaabbbbaabaaaaababbbbababbbaabbbaabbbbababbbbacbbbbbabbbbbbbbbbaabbbbbbbbbbbaacbbbbbbbbbbbbbabbbbbbbbbbbbbbbbaccbbcbbcbbbbbbbcbbbbbbbbbbbbbbbaccbccbbcccbbbbbbcccbbbbbbbbbbbbc.cccccbbcccbbbbbbccbbbbbbbbbbbc.c.cccccccccccccccccccbbccbcbcc.c.cccc.c..ccc...ccc..ccc..c.c.....c.c..c...c......c..c...........",
  ];
  const GR = [
    "...................a..................a.............a..a....a....aa..aa..a...aa..a..a.aaa.aa...a",
    "......................................a................a.............aa..a.......a....aaa......a",
    "...................a................................a.......a....aa......a...aa.....a.....aa....",
    "a....a....a.....a..a.........a..a...a...a.a.a..aa...a..a....aa...a.aa.aa..a.a.aaaaa.aa..a.a.aa.a",
    ".....a..............................a...a....a......a..a.....a..a..aa.a..a..a.....a.aa.aa.a.a...",
  ];

  const slabs = [];               // cache of 20 canvases, key f * 5 + g

  function px() { return Math.min(3, Math.max(2, Math.round(3 * F.k))); }

  function slabCanvas(f, g) {
    const key = f * 5 + g;
    if (slabs[key]) return slabs[key];
    const c = document.createElement("canvas");
    c.width = 32; c.height = 14;
    const cx = c.getContext("2d");
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 32; x++) {
        const ch = GR[g][y * 32 + x];
        if (ch === ".") continue;
        cx.fillStyle = COL[ch];
        cx.fillRect(x, y, 1, 1);
      }
    }
    for (let y = 0; y < 11; y++) {
      for (let x = 0; x < 32; x++) {
        const ch = FL[f][y * 32 + x];
        if (ch === ".") continue;
        cx.fillStyle = COL[ch];
        cx.fillRect(x, 3 + y, 1, 1);
      }
    }
    slabs[key] = c;
    return c;
  }

  function chunk(kk, NR) {
    const out = [];
    if (hash1(kk * 31 + SEED) >= 0.9) return out;
    let c = kk * CH + Math.floor(hash1(kk * 37 + SEED) * 2);
    let r = Math.floor(hash1(kk * 41 + SEED) * (NR - 1));
    const n = 3 + Math.floor(hash1(kk * 43 + SEED) * 4);
    let run = 0;
    let dir = hash1(kk * 47 + SEED) < 0.5 ? 1 : -1;
    for (let i = 0; i < n; i++) {
      if (c >= kk * CH + CH) break;
      out.push({ c, r, f: Math.floor(hash1(c * 13 + SEED) * 4), g: Math.floor(hash1(c * 17 + SEED) * 5) });
      const u = hash1(kk * 101 + i * 7 + SEED);
      if (u < 0.25 && run < 2) {
        c += 1; run += 1; continue;
      }
      run = 0;
      c += (u > 0.55 ? 2 : 1);
      if (hash1(kk * 109 + i * 17 + SEED) < 0.3) dir = -dir;
      let dr = dir * (3 + Math.floor(hash1(kk * 107 + i * 13 + SEED) * 3));
      if (r + dr < 0 || r + dr > NR - 1) { dir = -dir; dr = -dr; }
      r += dr;
    }
    return out;
  }

  function paint(w) {
    const { ctx, W, H, camX, sc, k } = F;
    const p = px();
    const CW = 32 * p, RH = 8 * p, SH = 14 * p;
    const NR = Math.floor((BAND1 - BAND0) * H / RH) - 1;
    if (NR < 6) return;
    const y0 = Math.round(BAND0 * H);
    const CU = CW / (PAR * sc);                            // world units per column
    const jA = Math.floor((camX - (W / 2 + CW) / (PAR * sc)) / CU);
    const jB = jA + Math.ceil(W / CW) + 3;
    const psx = sx(GAMES[I].x, PAR);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let kk = Math.floor(jA / CH) - 1; kk <= Math.floor(jB / CH); kk++) {
      for (const s of chunk(kk, NR)) {
        if (s.c < jA || s.c > jB) continue;
        const d = dens(I, (s.c + 0.5) * CU);
        if (d < 0.01) continue;
        const x = Math.round(sx(s.c * CU, PAR));
        const y = y0 + s.r * RH;
        // wide screens: zones.js draws the game's own sprites round the planet at this scale, so leave its area empty; narrow screens have no zone art
        const nearDx = Math.abs(x + CW / 2 - psx);
        const near = W >= 900 ? smooth((nearDx - 170 * p) / (60 * p)) : 0.45 + 0.55 * smooth((nearDx - 380 * k) / (200 * k));
        const a = A0 * Math.min(1, d / 0.3) * near * clearBox(x + CW / 2, y + SH / 2, CW / 2, SH / 2);
        if (a < 0.02) continue;
        ctx.globalAlpha = a;
        ctx.drawImage(slabCanvas(s.f, s.g), x, y, CW, SH);
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function grade(w) {
    const { ctx, W, H, camX, sc, k, t, red } = F;
    const tt = red ? 0 : t;
    const p = px();
    const WW = W + 40, HH = H + 40;
    ctx.save();
    ctx.fillStyle = MOTE;
    for (const m of MOTES) {
      let x = m.fx * WW - camX * 0.8 * sc + 14 * k * Math.sin(tt * 0.31 * m.sp + m.ph);
      x = ((x % WW) + WW) % WW - 20;
      let y = m.fy * HH + tt * 5 * k * m.sp + 10 * k * Math.sin(tt * 0.23 + m.ph * 1.7);
      y = ((y % HH) + HH) % HH - 20;
      x = Math.round(x / p) * p;
      y = Math.round(y / p) * p;
      const a = w * 0.45 * clearBox(x, y, 0, 0);
      if (a < 0.02) continue;
      ctx.globalAlpha = a;
      ctx.fillRect(x, y, m.sz * p, m.sz * p);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  const MOTES = (() => {
    const rng = mulberry(SEED);
    const out = [];
    for (let i = 0; i < 40; i++) {
      out.push({ fx: rng(), fy: rng(), sz: rng() < 0.6 ? 1 : 2, ph: rng() * 6.283, sp: 0.6 + 0.8 * rng() });
    }
    return out;
  })();

  G.P.conclusus = { base: [47, 36, 39], layers: [{ par: PAR, paint }], grade, px };
})();
