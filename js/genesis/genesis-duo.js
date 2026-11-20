/* genesis-duo.js — Rex Immotus, a towering colossus of stone blocks. `x` is the centre, `y` the
   foot line and `h` the full height in px (the caller may put the feet far below the frame);
   light from the left. The body is a table of parts (legs, waist, chest, collar, caps, arms,
   hands); each part is cut into courses and blocks once at load, then drawn as flat lit/shade
   quads. Positions are in units of h from the foot line (y up is negative), x mirrored by o.face. */
window.GenDuo = (function () {
  const { flatGlow, mixHex } = GenPaint;
  const { litShade } = Paint;
  const TAU = Math.PI * 2;

  // copied from REX in genesis-titans.js (same colours as the old Rex)
  const REX = { lit: "#f58a34", shade: "#b4461e", glow: "245,138,52", core: "#ffe2be" };
  const SPIKES = [0.07, 0.11, 0.085, 0.13, 0.075, 0.105, 0.065]; // uneven, in h (scaled by SPIKE_K)
  const SPIKE_K = 0.4;
  const HEAD_R = 0.018;  // disc radius in h (0.036 h across)
  const LEAN = 0.02;     // top of the body sits this far (in h) to the facing side of the feet

  // ---- the parts -------------------------------------------------------------------------
  // ax: [stand, reach] axis points [x0,y0, x1,y1, x2,y2] from the part's top to its bottom;
  // w: width at the start, middle and end; rh / bw: course height and block width ranges (h);
  // gone: chance a block is missing. Hand parts use loc (a across, b along, from the wrist).
  const PARTS = [];
  let cHead = false;
  function part(n, w, rh, bw, gone, ax, loc, hand) { PARTS.push({ n, w, rh, bw, gone, ax, loc, hand: hand === undefined ? -1 : hand }); }
  part("legB", [0.108, 0.098, 0.1], [0.026, 0.038], [0.05, 0.078], 0.05, [[-0.083, -0.55, -0.088, -0.3, -0.092, -0.05]]);
  part("legF", [0.105, 0.1, 0.108], [0.025, 0.037], [0.05, 0.076], 0.05, [[0.08, -0.55, 0.09, -0.3, 0.1, -0.05]]);
  part("footB", [0.05, 0.05, 0.046], [0.025, 0.04], [0.04, 0.06], 0, [[-0.125, -0.026, -0.085, -0.026, -0.02, -0.025]]);
  part("footF", [0.05, 0.05, 0.046], [0.025, 0.04], [0.04, 0.06], 0, [[0.045, -0.026, 0.09, -0.026, 0.17, -0.025]]);
  part("waist", [0.17, 0.15, 0.22], [0.03, 0.045], [0.09, 0.15], 0.05, [[0.004, -0.66, 0.006, -0.59, 0.006, -0.52]]);
  part("chest", [0.25, 0.22, 0.17], [0.03, 0.05], [0.1, 0.17], 0.04, [[0, -0.88, 0.002, -0.77, 0.003, -0.66]]);
  part("collar", [0.05, 0.068, 0.085], [0.005, 0.008], [0.05, 0.09], 0, [[0.001, -0.905, 0.001, -0.89, 0.002, -0.875]]);
  part("capB", [0.085, 0.08, 0.07], [0.02, 0.03], [0.06, 0.1], 0.05, [[-0.125, -0.865, -0.13, -0.83, -0.135, -0.8]]);
  part("capF", [0.088, 0.082, 0.072], [0.02, 0.03], [0.06, 0.1], 0.05, [[0.125, -0.88, 0.13, -0.845, 0.135, -0.81]]);
  part("upB", [0.07, 0.069, 0.07], [0.022, 0.034], [0.045, 0.075], 0.05,
    [[-0.135, -0.855, -0.15, -0.71, -0.15, -0.57], [-0.135, -0.86, -0.24, -0.77, -0.33, -0.68]]);
  part("foreB", [0.075, 0.077, 0.074], [0.022, 0.034], [0.045, 0.075], 0.05,
    [[-0.15, -0.57, -0.153, -0.4, -0.155, -0.235], [-0.33, -0.68, -0.215, -0.71, -0.1, -0.74]]);
  part("upF", [0.07, 0.068, 0.072], [0.022, 0.034], [0.045, 0.075], 0.05,
    [[0.135, -0.875, 0.15, -0.73, 0.16, -0.585], [0.135, -0.875, 0.155, -0.73, 0.17, -0.585], [0.135, -0.875, 0.178, -0.82, 0.19, -0.76]]);
  part("foreF", [0.074, 0.078, 0.076], [0.022, 0.034], [0.045, 0.075], 0.05,
    [[0.16, -0.585, 0.165, -0.4, 0.17, -0.215], [0.17, -0.585, 0.025, -0.59, -0.12, -0.6], [0.19, -0.76, 0.133, -0.765, 0.075, -0.77]]);
  // hands: 0 = the arm on the far side (B), 1 = the near side (F); a palm block, four stacked-block fingers, a thumb
  const FL = [[0.05, 0.058, 0.055, 0.045], [0.048, 0.056, 0.058, 0.044]];
  for (let k = 0; k < 2; k++) {
    const ts = k ? -1 : 1; // thumb on the body side
    part("palm" + k, [0.07, 0.074, 0.08], [0.022, 0.03], [0.06, 0.09], 0, null, [0, 0, 0, 0.025, 0, 0.052], k);
    for (let j = 0; j < 4; j++) {
      const a = -0.0285 + j * 0.019, e = 0.05 + FL[k][j];
      part("fin" + k + j, [0.016, 0.016, 0.015], [0.014, 0.02], [0.04, 0.04], 0, null, [a, 0.05, a, (0.05 + e) / 2, a, e], k);
    }
    part("thumb" + k, [0.022, 0.02, 0.017], [0.016, 0.022], [0.06, 0.06], 0, null, [ts * 0.034, 0.012, ts * 0.047, 0.036, ts * 0.056, 0.066], k);
  }
  // the closed near hand (fl: axis points, fw: widths): a deep palm, thumb at its side, four fingers curled across it as bars
  const FIST = { palm1: [[0, 0, 0, 0.052, 0, 0.105], [0.088, 0.092, 0.088]], thumb1: [[-0.052, 0.03, -0.054, 0.06, -0.05, 0.09], [0.022, 0.02, 0.017]] };
  for (let j = 0; j < 4; j++) { const b = 0.014 + j * 0.026; FIST["fin1" + j] = [[-0.046, b, 0, b, 0.046, b], [0.0095, 0.0095, 0.0095]]; }
  for (const P of PARTS) if (FIST[P.n]) { P.fl = FIST[P.n][0]; P.fw = FIST[P.n][1]; }
  // grip pose: the body leans into the punch (x of the axis points moved forward), the near arm at full stretch up and forward, the far arm back
  const lean = (n, a) => { PARTS.find(p => p.n === n).ax[3] = a; };
  lean("chest", [0.04, -0.88, 0.032, -0.77, 0.012, -0.66]);
  lean("waist", [0.014, -0.66, 0.01, -0.59, 0.006, -0.52]);
  lean("collar", [0.041, -0.905, 0.041, -0.89, 0.042, -0.875]);
  lean("capB", [-0.09, -0.865, -0.095, -0.83, -0.1, -0.8]);
  lean("capF", [0.165, -0.88, 0.17, -0.845, 0.175, -0.81]);
  lean("upB", [-0.09, -0.86, -0.19, -0.8, -0.27, -0.72]);
  lean("foreB", [-0.27, -0.72, -0.31, -0.62, -0.32, -0.52]);
  lean("upF", [0.165, -0.88, 0.277, -0.973, 0.388, -1.066]);
  lean("foreF", [0.388, -1.066, 0.53, -1.183, 0.67, -1.3]);
  // dead pose: slack and sagging toward the wall on the far side (-x), shoulders dropped, the far arm hanging, the near fist against the chest
  for (const n of ["legB", "legF", "footB", "footF", "waist"]) PARTS.find(p => p.n === n).low = true; // the parts o.melt dissolves
  const dead = (n, a) => { PARTS.find(p => p.n === n).ax[4] = a; };
  dead("legB", [-0.12, -0.53, -0.1, -0.3, -0.092, -0.05]);
  dead("legF", [-0.03, -0.53, 0.04, -0.3, 0.1, -0.05]);
  dead("waist", [-0.09, -0.64, -0.075, -0.58, -0.06, -0.52]);
  dead("chest", [-0.2, -0.82, -0.15, -0.73, -0.115, -0.65]);
  dead("collar", [-0.2, -0.845, -0.2, -0.83, -0.2, -0.815]);
  dead("capB", [-0.3, -0.77, -0.31, -0.74, -0.32, -0.71]);
  dead("capF", [-0.1, -0.8, -0.1, -0.77, -0.1, -0.74]);
  dead("upB", [-0.3, -0.77, -0.33, -0.66, -0.34, -0.55]);
  dead("foreB", [-0.34, -0.55, -0.34, -0.42, -0.33, -0.3]);
  dead("upF", [-0.1, -0.8, -0.06, -0.68, -0.03, -0.56]);
  dead("foreF", [-0.03, -0.56, -0.045, -0.6, -0.06, -0.64]);
  // hand frames per pose: [wristX, wristY, rotation] (rotation 0 = hanging down)
  const HF = [
    [[-0.155, -0.235, 0.03], [0.17, -0.215, -0.04]],
    [[-0.1, -0.74, 0.12], [-0.12, -0.6, Math.atan2(0.29, -0.015)]],
    [[-0.155, -0.235, 0.03], [0.075, -0.77, Math.PI / 2]], // slap: the near hand flat on the chest, fingers toward the middle
    [[-0.32, -0.52, 0.1], [0.67, -1.3, Math.atan2(-0.277, -0.234)]], // grip: the near fist along the arm, up and forward
    [[-0.33, -0.3, 0.1], [-0.06, -0.64, Math.PI - 0.25]] // dead: the far hand hanging, the near fist upright on the chest
  ];
  for (const P of HF) for (const H of P) { const r = H[2]; H[2] = Math.cos(r); H[3] = Math.sin(r); }
  // grip with the arm down (o.raise 0): the near fist held out forward at shoulder to head height, the elbow bent; o.raise blends to the overhead reach
  const LOWAX = { upF: [0.165, -0.88, 0.1825, -0.74, 0.2, -0.6], foreF: [0.2, -0.6, 0.255, -0.63, 0.31, -0.64] };
  const LOWHF = [0.31, -0.64, Math.atan2(-0.11 / 0.117, -0.04 / 0.117)];
  const HFT = [0, 0, 1, 0], AXT = new Float64Array(6);
  function hfOf(p, a, rz) {
    const H = HF[p][a];
    if (p !== 3 || a !== 1 || rz >= 1) return H;
    const hi = Math.atan2(H[3], H[2]), r = LOWHF[2] + (hi - LOWHF[2]) * rz;
    HFT[0] = LOWHF[0] + (H[0] - LOWHF[0]) * rz; HFT[1] = LOWHF[1] + (H[1] - LOWHF[1]) * rz; HFT[2] = Math.cos(r); HFT[3] = Math.sin(r);
    return HFT;
  }
  function axOf(s, p, rz) {
    const A = s.ax[p] || s.ax[0];
    if (p !== 3 || rz >= 1 || !LOWAX[s.n]) return A;
    const L = LOWAX[s.n];
    for (let k = 0; k < 6; k++) AXT[k] = L[k] + (A[k] - L[k]) * rz;
    return AXT;
  }
  // draw order per pose (names); the head and collar are drawn with the torso
  const ORD = [
    ["legB", "footB", "legF", "footF", "waist", "chest", "collar", "capB", "upB", "foreB", "palm0", "fin00", "fin01", "fin02", "fin03", "thumb0",
      "capF", "upF", "foreF", "palm1", "fin10", "fin11", "fin12", "fin13", "thumb1"],
    ["legB", "footB", "legF", "footF", "waist", "chest", "collar", "capB", "capF", "upF", "foreF", "palm1", "fin10", "fin11", "fin12", "fin13", "thumb1",
      "upB", "foreB", "palm0", "fin00", "fin01", "fin02", "fin03", "thumb0"]
  ];
  // grip: the far arm back first, then the body, then the near arm with its thumb behind the palm
  ORD[3] = ["legB", "footB", "legF", "footF", "upB", "foreB", "palm0", "fin00", "fin01", "fin02", "fin03", "thumb0", "waist", "chest", "collar", "capB",
    "capF", "upF", "foreF", "thumb1", "palm1", "fin10", "fin11", "fin12", "fin13"];
  ORD[4] = ORD[3];
  // ---- courses and blocks, built once ------------------------------------------------------
  function rng(seed) { // mulberry32
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  let NB = 0;
  const IDX = {};
  PARTS.forEach((s, pi) => {
    IDX[s.n] = pi;
    const r = rng(1013 + pi * 7919), A = s.loc || s.ax[0];
    const len = Math.hypot(A[2] - A[0], A[3] - A[1]) + Math.hypot(A[4] - A[2], A[5] - A[3]), wm = s.w[1];
    s.len = len; s.base = NB;
    s.rt0 = []; s.rt1 = []; s.rb0 = []; s.rb1 = [];
    s.bu0 = []; s.bu1 = []; s.bk = []; s.bc = []; s.bck = []; s.bg = [];
    let t = 0, row = 0;
    while (t < 0.999) {
      let t1 = t + (s.rh[0] + r() * (s.rh[1] - s.rh[0])) / len;
      if (t1 > 1 - s.rh[0] * 0.6 / len) t1 = 1;
      s.rt0.push(t); s.rt1.push(t1); s.rb0.push(s.bu0.length);
      let u = 0, first = true;
      while (u < 0.999) {
        let bw = s.bw[0] + r() * (s.bw[1] - s.bw[0]);
        if (first && row % 2 && bw < wm) bw *= 0.4 + 0.5 * r(); // stagger the courses
        let u1 = u + bw / wm;
        if (u1 > 1 - s.bw[0] * 0.6 / wm) u1 = 1;
        s.bu0.push(u); s.bu1.push(u1); s.bk.push(r());
        s.bc.push(r() < 0.3 ? Math.floor(r() * 4) : -1); s.bck.push(0.25 + 0.25 * r());
        s.bg.push(r() < s.gone ? 1 : 0);
        u = u1; first = false; NB++;
      }
      s.rb1.push(s.bu0.length); t = t1; row++;
    }
  });

  // colours per cool step (0 to 8), built the first time a step is used
  const PAL = [];
  function palette(step) {
    if (PAL[step]) return PAL[step];
    const cool = step / 8, lit = [], shade = [];
    for (const s of PARTS) for (let i = 0; i < s.bk.length; i++) {
      const k = s.bk[i];
      lit.push(mixHex(mixHex(REX.lit, REX.shade, k * 0.26), "#39485a", cool));
      shade.push(mixHex(mixHex(REX.shade, "#000000", k * 0.3), "#26313d", cool));
    }
    const hl = mixHex(REX.lit, "#39485a", cool), core = mixHex(REX.core, "#7c8a98", cool);
    return (PAL[step] = { lit, shade, dark: mixHex("#2a120a", "#12161c", cool), hl, core, disc: mixHex(core, hl, 0.35), glowA: 1 - cool });
  }
  // ---- drawing (state in module variables: nothing is allocated per frame) -------------------
  const Q = [[0, 0], [0, 0], [0, 0], [0, 0]];
  const AXW = new Float64Array(6), LL = new Float64Array(6);
  let cWarm = 0, cWX = 0, cWY = 0;
  let cC = null, cX = 0, cY = 0, cH = 1, cF = 1, cPose = 0, cPal = null, cFist = 0, cMelt = 0, cCut = 0, cRaise = 1;
  let T0X = 0, T0Y = 0, T1X = 0, T1Y = 0, W0 = 0, WM = 0, W1 = 0;
  const traceCur = () => {
    cC.beginPath(); cC.moveTo(Q[0][0], Q[0][1]);
    for (let i = 1; i < 4; i++) cC.lineTo(Q[i][0], Q[i][1]);
    cC.closePath();
  };
  // corner i at course position t, across position u (0 to 1), on axis segment seg
  function put(i, t, u, seg) {
    const k = seg * 2, s = seg ? (t - 0.5) * 2 : t * 2;
    let x = AXW[k] + (AXW[k + 2] - AXW[k]) * s, y = AXW[k + 1] + (AXW[k + 3] - AXW[k + 1]) * s;
    const w = t < 0.5 ? W0 + (WM - W0) * t * 2 : WM + (W1 - WM) * (t - 0.5) * 2, d = w * (u - 0.5);
    x -= (seg ? T1Y : T0Y) * d; y += (seg ? T1X : T0X) * d;
    Q[i][0] = cX + cF * (x - LEAN * y) * cH; Q[i][1] = cY + y * cH;
  }
  function drawPart(s) {
    if (s.hand >= 0) {
      const H = hfOf(cPose, s.hand, cRaise);
      let L = s.loc;
      if (s.hand && cFist > 0 && s.fl) { // the near hand closing: axis points and widths blend toward the fist
        for (let k = 0; k < 6; k++) LL[k] = L[k] + (s.fl[k] - L[k]) * cFist;
        L = LL;
        W0 = s.w[0] + (s.fw[0] - s.w[0]) * cFist; WM = s.w[1] + (s.fw[1] - s.w[1]) * cFist; W1 = s.w[2] + (s.fw[2] - s.w[2]) * cFist;
      }
      for (let k = 0; k < 3; k++) {
        AXW[2 * k] = H[0] + L[2 * k] * H[2] - L[2 * k + 1] * H[3];
        AXW[2 * k + 1] = H[1] + L[2 * k] * H[3] + L[2 * k + 1] * H[2];
      }
    } else {
      const A = axOf(s, cPose, cRaise);
      for (let k = 0; k < 6; k++) AXW[k] = A[k];
    }
    let dx = AXW[2] - AXW[0], dy = AXW[3] - AXW[1], l = Math.hypot(dx, dy) || 1; T0X = dx / l; T0Y = dy / l;
    dx = AXW[4] - AXW[2]; dy = AXW[5] - AXW[3]; l = Math.hypot(dx, dy) || 1; T1X = dx / l; T1Y = dy / l;
    if (!(s.hand && cFist > 0 && s.fl)) { W0 = s.w[0]; WM = s.w[1]; W1 = s.w[2]; }
    const brk = s.n === "chest"; // headless: the top two courses are broken (stones missing, tops uneven)
    backPart(s, brk);
    const j = Math.max(0.0016, 1.2 / cH), jt = j / s.len, ju = j / WM, nr = s.rt0.length;
    const ml = cMelt > 0 && s.low;
    for (let r = 0; r < nr; r++) {
      const t0 = s.rt0[r], t1 = s.rt1[r], g0 = t0 < 0.5 ? 0 : 1, g1 = t1 <= 0.5 ? 0 : 1;
      if (ml) {
        const yh = rowYh(s, r);
        if (yh > cCut) continue; // dissolved
        if (yh > cCut - MELT_BAND) { meltRow(s, r, yh, r === nr - 1 || rowYh(s, r + 1) > cCut); continue; }
      }
      const ta = r ? t0 + jt : t0;
      const tb = r < nr - 1 ? t1 - jt : t1;
      for (let b = s.rb0[r]; b < s.rb1[r]; b++) {
        const gi = s.base + b;
        if (s.bg[b]) continue;
        let ta2 = ta;
        if (brk && !cHead && r < 2) {
          const kb = s.bk[b];
          if (kb < (r ? 0.12 : 0.32)) continue;
          if (!r) ta2 = ta + (t1 - t0) * 0.8 * (kb - 0.32) / 0.68;
        }
        const u0 = s.bu0[b], u1 = s.bu1[b], ua = u0 > 0 ? u0 + ju : u0, ub = u1 < 1 ? u1 - ju : u1;
        put(0, ta2, ua, g0); put(1, ta2, ub, g0); put(2, tb, ub, g1); put(3, tb, ua, g1);
        const c = s.bc[b];
        if (c >= 0) { // chipped corner: pulled toward the block's middle
          const mx = (Q[0][0] + Q[2][0]) / 2, my = (Q[0][1] + Q[2][1]) / 2, k = s.bck[b];
          Q[c][0] += (mx - Q[c][0]) * k; Q[c][1] += (my - Q[c][1]) * k;
        }
        const lo = Math.min(Q[0][0], Q[1][0], Q[2][0], Q[3][0]), hi = Math.max(Q[0][0], Q[1][0], Q[2][0], Q[3][0]);
        let cl = cPal.lit[gi], cs = cPal.shade[gi];
        if (cWarm > 0) { // the stones nearest him take a warm tint from his burning
          const wd = Math.hypot((Q[0][0] + Q[2][0]) / 2 - cWX, (Q[0][1] + Q[2][1]) / 2 - cWY) / (0.1 * cH);
          if (wd < 1) { const wk = cWarm * (1 - wd) * 0.45; cl = mixHex(cl, "#ff6a50", wk); cs = mixHex(cs, "#b0302c", wk); }
        }
        litShade(cC, traceCur, lo + 0.3 * (hi - lo), cl, cs);
      }
    }
  }
  // o.melt: the lower body dissolves from the feet up. Rows below cCut (h units, y up is negative) are gone; the band above it
  // is one flat run-together shape per row in the womb's red, wider the nearer the cut, with short drips hanging from the last one.
  const WOMB = { lit: "#5c1114", shade: "#2e080c" }, MELT_BAND = 0.14;
  function rowYh(s, r) {
    put(0, s.rt0[r], 0.5, s.rt0[r] < 0.5 ? 0 : 1); put(2, s.rt1[r], 0.5, s.rt1[r] <= 0.5 ? 0 : 1);
    return ((Q[0][1] + Q[2][1]) / 2 - cY) / cH;
  }
  function meltRow(s, r, yh, last) {
    const t0 = s.rt0[r], t1 = s.rt1[r], g0 = t0 < 0.5 ? 0 : 1, g1 = t1 <= 0.5 ? 0 : 1;
    const w = 0.3 * Math.max(0, Math.min(1, (yh - (cCut - MELT_BAND)) / MELT_BAND));
    put(0, t0, -w, g0); put(1, t0, 1 + w, g0); put(2, t1, 1 + w, g1); put(3, t1, -w, g1);
    const lo = Math.min(Q[0][0], Q[3][0]), hi = Math.max(Q[1][0], Q[2][0]);
    litShade(cC, traceCur, lo + 0.3 * (hi - lo), WOMB.lit, WOMB.shade);
    if (!last) return;
    const x3 = Q[3][0], y3 = Q[3][1], x2 = Q[2][0], y2 = Q[2][1];
    for (let k = 0; k < 3; k++) {
      const fa = 0.1 + 0.3 * k, fb = fa + 0.2, L = (0.025 + 0.07 * s.bk[s.rb0[r] + k]) * cH;
      const ax = x3 + (x2 - x3) * fa, ay = y3 + (y2 - y3) * fa, bx = x3 + (x2 - x3) * fb, by = y3 + (y2 - y3) * fb;
      const d = (bx - ax) * 0.25;
      Q[0][0] = ax; Q[0][1] = ay - 1; Q[1][0] = bx; Q[1][1] = by - 1;
      Q[2][0] = bx - d; Q[2][1] = Math.min(by + L, cY); Q[3][0] = ax + d; Q[3][1] = Math.min(ay + L, cY);
      litShade(cC, traceCur, ax + 0.3 * (bx - ax), WOMB.lit, WOMB.shade);
    }
  }
  // dark backing under a part's courses, so joints and missing blocks read as dark, not as holes
  function backPart(s, brk) {
    cC.fillStyle = cPal.dark;
    for (let r = brk && !cHead ? 1 : 0; r < s.rt0.length; r++) {
      if (cMelt > 0 && s.low && rowYh(s, r) > cCut - MELT_BAND) continue;
      put(0, s.rt0[r], 0, s.rt0[r] < 0.5 ? 0 : 1); put(1, s.rt0[r], 1, s.rt0[r] < 0.5 ? 0 : 1);
      put(2, s.rt1[r], 1, s.rt1[r] <= 0.5 ? 0 : 1); put(3, s.rt1[r], 0, s.rt1[r] <= 0.5 ? 0 : 1);
      traceCur(); cC.fill();
    }
  }

  // head: pale glowing disc and seven spikes of uneven length; rot turns the spike fan (tipped head)
  let dX = 0, dY = 0, dR = 0;
  const traceDisc = () => { cC.beginPath(); cC.arc(dX, dY, dR, 0, TAU); };
  function drawHead(ctx, hx, hy, h, rot, glowA) {
    const r = HEAD_R * h;
    if (glowA > 0) flatGlow(ctx, hx, hy, 0.15 * h, REX.glow, 0.9 * glowA);
    for (let k = 0; k < 7; k++) {
      const ang = -Math.PI / 2 - (200 * Math.PI / 180) / 2 + (200 * Math.PI / 180) * (k / 6) + rot;
      const ca = Math.cos(ang), sa = Math.sin(ang), len = SPIKES[k] * SPIKE_K * h, pw = 0.007 * h;
      ctx.beginPath();
      ctx.moveTo(hx + ca * r - sa * pw, hy + sa * r + ca * pw);
      ctx.lineTo(hx + ca * r + sa * pw, hy + sa * r - ca * pw);
      ctx.lineTo(hx + ca * (r + len), hy + sa * (r + len));
      ctx.closePath();
      ctx.fillStyle = k % 2 === 0 ? cPal.core : cPal.hl; ctx.fill();
    }
    dX = hx; dY = hy; dR = r;
    litShade(ctx, traceDisc, hx - 0.3 * r, cPal.core, cPal.disc);
  }

  ORD[2] = ORD[0];
  // head centre (h units) and spike-fan tip per pose
  const HEADP = [[0, -0.925, 0], [-0.012, -0.92, -0.18], [0.012, -0.912, 0.3], [0.05, -0.915, 0.25], [-0.22, -0.88, -0.6]];
  const poseOf = (o) => o.pose === "reach" ? 1 : o.pose === "slap" ? 2 : o.pose === "grip" ? 3 : o.pose === "dead" ? 4 : 0;

  function setup(ctx, x, y, h, o) {
    cC = ctx; cX = x; cY = y; cH = h; cF = o.face === -1 ? -1 : 1;
    cPose = poseOf(o);
    cWarm = o.warm > 0 ? Math.min(1, o.warm) : 0; cWX = o.warmX || 0; cWY = o.warmY || 0;
    cFist = o.fist === undefined ? (cPose >= 3 ? 1 : 0) : Math.max(0, Math.min(1, o.fist));
    cMelt = Math.max(0, Math.min(1, o.melt || 0)); cCut = -cMelt * 0.56;
    cHead = !!o.head; cRaise = o.raise === undefined ? 1 : Math.max(0, Math.min(1, o.raise));
    cPal = palette(Math.round(Math.max(0, Math.min(1, o.cool || 0)) * 8));
  }
  // o.head true paints the head, spikes and glow (default: headless); o.face 1 or -1, o.cool 0..1, o.pose "stand" (default), "reach", "slap" (near hand flat on his chest, head tipped down)
  // or "grip" (near arm thrust up and forward, body leaning in); o.fist 0..1 closes the near hand (grip: 1). With a closed
  // near hand drawRex leaves the four near fingers out: draw whatever sits in the fist, then call drawRexFingers with the same arguments.
  function drawRex(ctx, x, y, h, o) {
    o = o || {};
    setup(ctx, x, y, h, o);
    const ord = ORD[cPose];
    for (let i = 0; i < ord.length; i++) {
      if (!cHead && ord[i] === "collar") continue;
      if (cFist > 0 && ord[i].startsWith("fin1")) continue;
      drawPart(PARTS[IDX[ord[i]]]);
    }
    if (!cHead) return;
    const hp = HEADP[cPose], hxh = hp[0], hyh = hp[1];
    drawHead(ctx, cX + cF * (hxh - LEAN * hyh) * cH, cY + hyh * cH, cH, hp[2] * cF, cPal.glowA);
  }

  // the four near fingers of a closed fist, curled across the palm; same arguments as drawRex, called after what sits in the fist
  function drawRexFingers(ctx, x, y, h, o) {
    o = o || {};
    setup(ctx, x, y, h, o);
    if (cFist <= 0) return;
    for (let j = 0; j < 4; j++) drawPart(PARTS[IDX["fin1" + j]]);
  }

  // canvas points on the painted body, same arguments as drawRex; out gets head, collar, chest, waist and per arm
  // (B far, F near) shoulderB, elbowB, wristB, handB (the middle of the palm) and the same with F; each is {x, y}
  function ap(out, k, x, y, h, f, px, py) {
    const q = out[k] || (out[k] = { x: 0, y: 0 });
    q.x = x + f * (px - LEAN * py) * h; q.y = y + py * h;
  }
  function rexAnchors(x, y, h, o, out) {
    o = o || {};
    const f = o.face === -1 ? -1 : 1, p = poseOf(o), hp = HEADP[p], rz = o.raise === undefined ? 1 : Math.max(0, Math.min(1, o.raise));
    ap(out, "head", x, y, h, f, hp[0], hp[1]);
    ap(out, "collar", x, y, h, f, 0.001, -0.89);
    ap(out, "chest", x, y, h, f, 0.002, -0.77);
    ap(out, "waist", x, y, h, f, 0.006, -0.59);
    for (let a = 0; a < 2; a++) {
      const nm = a ? "F" : "B", U = PARTS[IDX[a ? "upF" : "upB"]], A = axOf(U, p, rz), H = hfOf(p, a, rz);
      ap(out, "shoulder" + nm, x, y, h, f, A[0], A[1]);
      ap(out, "elbow" + nm, x, y, h, f, A[4], A[5]);
      ap(out, "wrist" + nm, x, y, h, f, H[0], H[1]);
      ap(out, "hand" + nm, x, y, h, f, H[0] - 0.0535 * H[3], H[1] + 0.0535 * H[2]);
    }
    const G = hfOf(p, 1, rz);
    ap(out, "grip", x, y, h, f, G[0] - 0.0525 * G[3], G[1] + 0.0525 * G[2]); // the middle of the closed near hand
    return out;
  }
  // ---- Obrokxus form 1: the centipede creature ----
  // Everything is laid along a spine (tail tip first, neck last) cut into ONN nodes at fixed
  // fractions of its length: 30 tail plates, 7 torso bands, a neck, a head dome.
  const OB = { shell: "#2a080b", hi: "#a4272d", hi2: "#861f25", dim: "#8a2025", eye: "#ff4a3c", glow: "200,24,30", burn: "232,84,78" };
  const OTN = 30, OBB = 7, ONN = OTN + OBB + 3;
  const OU = new Float64Array(ONN), OW = new Float64Array(ONN);
  const PSMAX = 1024;
  const PS = new Float64Array(PSMAX * 2), CUM = new Float64Array(PSMAX);
  const ONX = new Float64Array(ONN), ONY = new Float64Array(ONN); // nodes
  const OTX = new Float64Array(ONN), OTY = new Float64Array(ONN); // tangents (tip to neck)
  const OLX = new Float64Array(ONN), OLY = new Float64Array(ONN); // normals, pointing to the lit (left) side
  const OS = new Float64Array(ONN);
  let DN = 0, DENSE = null;
  (function () {
    for (let k = 0; k < ONN; k++) {
      OU[k] = k <= OTN ? 0.6 * k / OTN : k < OTN + OBB + 1 ? 0.6 + 0.3 * (k - OTN) / OBB : k === OTN + OBB + 1 ? 0.95 : 1;
      const u = OU[k];
      OW[k] = u <= 0.6 ? 0.004 + 0.024 * Math.pow(u / 0.6, 0.8)
        : u <= 0.9 ? 0.028 + 0.009 * Math.sin((u - 0.6) / 0.3 * Math.PI) - 0.004 * (u - 0.6) / 0.3
        : 0.024 - 0.012 * (u - 0.9) / 0.1;
    }
    // the picture's rear: tail tip bottom right, an S with a loop low down, torso arched to the left (x right, y up)
    const C = [[0.50, 0.27], [0.66, 0.24], [0.72, 0.10], [0.58, 0.03], [0.38, 0.03], [0.14, 0.12], [0.05, 0.28], [0.14, 0.42], [0.36, 0.47],
      [0.58, 0.43], [0.69, 0.52], [0.65, 0.64], [0.56, 0.71], [0.42, 0.77], [0.30, 0.85], [0.30, 0.94], [0.42, 1.0]];
    const per = 30, n = (C.length - 1) * per + 1, d = new Float64Array(n * 2);
    for (let i = 0, w = 0; i < C.length - 1; i++) {
      const p0 = C[Math.max(i - 1, 0)], p1 = C[i], p2 = C[i + 1], p3 = C[Math.min(i + 2, C.length - 1)];
      for (let j = 0; j < per + (i === C.length - 2 ? 1 : 0); j++, w++) {
        const t = j / per, t2 = t * t, t3 = t2 * t;
        for (let c = 0; c < 2; c++) d[w * 2 + c] = 0.5 * (2 * p1[c] + (p2[c] - p0[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (3 * p1[c] - p0[c] - 3 * p2[c] + p3[c]) * t3);
      }
    }
    let len = 0, x0 = 1e9, x1 = -1e9, y0 = 1e9;
    for (let i = 0; i < n; i++) {
      if (i) len += Math.hypot(d[i * 2] - d[i * 2 - 2], d[i * 2 + 1] - d[i * 2 - 1]);
      x0 = Math.min(x0, d[i * 2]); x1 = Math.max(x1, d[i * 2]); y0 = Math.min(y0, d[i * 2 + 1]);
    }
    for (let i = 0; i < n; i++) { d[i * 2] = (d[i * 2] - (x0 + x1) / 2) / len; d[i * 2 + 1] = -(d[i * 2 + 1] - y0) / len; }
    DN = n; DENSE = d;
  })();

  function obNodes(n) { // resample PS[0..n) into the ONN nodes by arc length
    CUM[0] = 0;
    for (let i = 1; i < n; i++) CUM[i] = CUM[i - 1] + Math.hypot(PS[i * 2] - PS[i * 2 - 2], PS[i * 2 + 1] - PS[i * 2 - 1]);
    const tot = CUM[n - 1];
    for (let k = 0, j = 1; k < ONN; k++) {
      const t = OU[k] * tot;
      while (j < n - 1 && CUM[j] < t) j++;
      const f = CUM[j] > CUM[j - 1] ? Math.min(1, Math.max(0, (t - CUM[j - 1]) / (CUM[j] - CUM[j - 1]))) : 0;
      ONX[k] = PS[j * 2 - 2] + (PS[j * 2] - PS[j * 2 - 2]) * f;
      ONY[k] = PS[j * 2 - 1] + (PS[j * 2 + 1] - PS[j * 2 - 1]) * f;
    }
    for (let k = 0; k < ONN; k++) {
      const a = Math.max(k - 1, 0), b = Math.min(k + 1, ONN - 1);
      let tx = ONX[b] - ONX[a], ty = ONY[b] - ONY[a];
      const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      OTX[k] = tx; OTY[k] = ty;
      OLX[k] = ty; OLY[k] = -tx;
      OS[k] = OLX[k] > 0 ? -1 : 1; // 1 where the normal already points to the lit (left) side
    }
  }

  function claw(ctx, hx, hy, ang, f, n, s) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = ang + (i - (n - 1) / 2) * 0.7, e = a - (a - ang) * 1.5 + (n === 3 && i === 1 ? 0.9 * f : 0);
      const cx = hx + Math.cos(a) * 0.04 * s, cy = hy + Math.sin(a) * 0.04 * s;
      ctx.moveTo(hx, hy); ctx.quadraticCurveTo(cx, cy, cx + Math.cos(e) * 0.03 * s, cy + Math.sin(e) * 0.03 * s);
    }
    ctx.stroke();
  }

  function arm(ctx, sx, sy, ex, ey, hx, hy, f, n, s) {
    ctx.lineWidth = Math.max(1.3, 0.011 * s); ctx.strokeStyle = OB.dim;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.fillStyle = OB.shell;
    ctx.beginPath(); ctx.arc(ex, ey, Math.max(1.2, 0.009 * s), 0, TAU); ctx.fill();
    ctx.lineWidth = Math.max(1, 0.007 * s); ctx.strokeStyle = OB.hi; ctx.lineCap = "round";
    claw(ctx, hx, hy, Math.atan2(hy - ey, hx - ex), f, n, s);
  }

  function whip(ctx, hx, hy, ax, ay, bend, s) { // out from the head along (ax, ay), curving to one side
    const L = 0.3 * s, px = -ay * bend, py = ax * bend;
    ctx.beginPath(); ctx.moveTo(hx, hy);
    ctx.bezierCurveTo(hx + ax * L * 0.45 + px * L * 0.1, hy + ay * L * 0.45 + py * L * 0.1,
      hx + ax * L * 0.7 + px * L * 0.4, hy + ay * L * 0.7 + py * L * 0.4,
      hx + ax * L * 0.8 + px * L * 0.75, hy + ay * L * 0.8 + py * L * 0.75);
    ctx.stroke();
  }

  // o.face 1 or -1, o.pose "rear" (default), "coil" (curled up tight, s about 0.24 of Rex's h like every pose of him in the fight) or "held" (gripped at his middle: head end up and writhing, tail end down and whipping; o.t the clock), o.path [x0,y0,x1,y1,...] tail tip first, o.eye false drops the eye
  function drawObrok1(ctx, x, y, s, o) {
    o = o || {};
    const f = o.face === -1 ? -1 : 1, pa = o.path;
    let n;
    if (o.pose === "coil" && !pa) { // coiled tight: a spiral of about 1.5 turns, tail tip at the middle, centred on (x, y)
      n = 96;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1), a = t * 3 * Math.PI + 0.6, r = (0.06 + 0.09 * t) * s;
        PS[i * 2] = x + f * Math.cos(a) * r; PS[i * 2 + 1] = y + Math.sin(a) * r;
      }
    } else if (o.pose === "held" && !pa) { // gripped round his middle at (x, y): head end standing out above and writhing, tail end whipping below; the middle stays put (o.t the clock, s about 2.5 fist widths)
      n = 96;
      const T = o.t || 0;
      for (let i = 0; i < n && o.hang; i++) { // o.hang: slung over the dead fist, both ends hanging down and twitching a little, slowly
        const t = i / (n - 1), v = (t - 0.5) * 2, a = Math.abs(v);
        PS[i * 2] = x + f * s * (0.07 * v + 0.025 * a * a * Math.sin(1.3 * a + T * (v > 0 ? 1.1 : 1.7)));
        PS[i * 2 + 1] = y + s * (0.5 * a - 0.04 * (1 - a * a) + 0.012 * a * Math.sin(T * 2.3 + v * 3));
      }
      for (let i = 0; i < n && !o.hang; i++) {
        const t = i / (n - 1), v = (t - 0.5) * 2, a = Math.abs(v);
        PS[i * 2] = x + f * s * 0.1 * a * a * (Math.sin(3.4 * a + T * (v > 0 ? 4.2 : 7)) + 0.35 * Math.sin(7 * a - T * 9)); PS[i * 2 + 1] = y - v * 0.5 * s;
      }
    } else if (pa && pa.length >= 4) {
      n = Math.min(pa.length >> 1, PSMAX);
      for (let i = 0; i < n * 2; i++) PS[i] = pa[i];
    } else {
      n = DN;
      for (let i = 0; i < n; i++) { PS[i * 2] = x + f * DENSE[i * 2] * s; PS[i * 2 + 1] = y + DENSE[i * 2 + 1] * s; }
    }
    obNodes(n);
    const lw = Math.max(1, 0.004 * s);
    ctx.save();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    // tip spikes and the leg on each side of every tail segment
    ctx.strokeStyle = OB.dim; ctx.lineWidth = lw;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = Math.atan2(-OTY[0], -OTX[0]) + (i - 1) * 0.42, L = (i === 1 ? 0.11 : 0.08) * s;
      ctx.moveTo(ONX[0], ONY[0]);
      ctx.quadraticCurveTo(ONX[0] + Math.cos(a) * L * 0.6, ONY[0] + Math.sin(a) * L * 0.6, ONX[0] + Math.cos(a + 0.25 * (i - 1)) * L, ONY[0] + Math.sin(a + 0.25 * (i - 1)) * L);
    }
    for (let k = 0; k < OTN; k++) {
      const mx = (ONX[k] + ONX[k + 1]) / 2, my = (ONY[k] + ONY[k + 1]) / 2, tx = OTX[k], ty = OTY[k];
      const w = (OW[k] + OW[k + 1]) / 2 * s, cr = OTX[k] * OTY[k + 1] - OTY[k] * OTX[k + 1];
      for (let sg = -1; sg <= 1; sg += 2) {
        const out = (cr > 0 ? -sg : sg) > 0 ? 0 : 1; // 1: this side is the outside of the bend
        const L = w * (out ? 2.1 : 1.1), px = -ty * sg, py = tx * sg;
        const bx = mx + px * w, by = my + py * w;
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + px * L, by + py * L, bx + px * L * 0.8 - tx * L * 0.9, by + py * L * 0.8 - ty * L * 0.9);
      }
    }
    ctx.stroke();
    // shell silhouette to the neck
    const ne = ONN - 1;
    ctx.fillStyle = OB.shell;
    ctx.beginPath();
    for (let k = 0; k <= ne; k++) { const w = OW[k] * s; k ? ctx.lineTo(ONX[k] + OLX[k] * w, ONY[k] + OLY[k] * w) : ctx.moveTo(ONX[k] + OLX[k] * w, ONY[k] + OLY[k] * w); }
    for (let k = ne; k >= 0; k--) { const w = OW[k] * s; ctx.lineTo(ONX[k] - OLX[k] * w, ONY[k] - OLY[k] * w); }
    ctx.fill();
    // plate highlights on the lit side, one band per segment, two reds alternating
    for (let pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass ? OB.hi2 : OB.hi;
      ctx.beginPath();
      for (let k = pass; k < OTN + OBB; k += 2) {
        const sg = OS[k], tor = k >= OTN, a = tor ? 0.9 : 0.85, b = tor ? -0.55 : -0.1;
        const g0 = 0.14, g1 = 0.86, ax = ONX[k] + (ONX[k + 1] - ONX[k]) * g0, ay = ONY[k] + (ONY[k + 1] - ONY[k]) * g0;
        const bx = ONX[k] + (ONX[k + 1] - ONX[k]) * g1, by = ONY[k] + (ONY[k + 1] - ONY[k]) * g1;
        const w0 = OW[k] * s, w1 = OW[k + 1] * s;
        ctx.moveTo(ax + OLX[k] * sg * w0 * a, ay + OLY[k] * sg * w0 * a);
        ctx.lineTo(bx + OLX[k + 1] * sg * w1 * a, by + OLY[k + 1] * sg * w1 * a);
        ctx.lineTo(bx + OLX[k + 1] * sg * w1 * b, by + OLY[k + 1] * sg * w1 * b);
        ctx.lineTo(ax + OLX[k] * sg * w0 * b, ay + OLY[k] * sg * w0 * b);
        ctx.closePath();
      }
      ctx.fill();
    }
    // arms: the low one first, then the head, then the raised one
    const sk = OTN + OBB - 1, sw = OW[sk] * s * 0.6;
    const lx = ONX[sk] - OLX[sk] * OS[sk] * sw, ly = ONY[sk] - OLY[sk] * OS[sk] * sw;
    arm(ctx, lx, ly, lx + f * 0.045 * s, ly + 0.065 * s, lx + f * 0.0 * s, ly + 0.125 * s, f, 2, s);
    const hk = ONN - 1, hr = 0.034 * s, hx = ONX[hk] + OTX[hk] * hr * 0.3, hy = ONY[hk] + OTY[hk] * hr * 0.3, ha = Math.atan2(OTY[hk], OTX[hk]);
    ctx.fillStyle = OB.shell;
    ctx.beginPath(); ctx.ellipse(hx, hy, hr * 1.1, hr * 0.9, ha, 0, TAU); ctx.fill();
    ctx.strokeStyle = OB.hi; ctx.lineWidth = Math.max(1, 0.0045 * s);
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const t = -0.3 + i * 0.4, bx = hx + OTX[hk] * hr * t * 1.1, by = hy + OTY[hk] * hr * t * 1.1, e = hr * 0.8 * Math.sqrt(1 - t * t * 0.9);
      ctx.moveTo(bx + OLX[hk] * e, by + OLY[hk] * e); ctx.lineTo(bx - OLX[hk] * e, by - OLY[hk] * e);
    }
    ctx.stroke();
    ctx.strokeStyle = OB.dim; ctx.lineWidth = Math.max(1, 0.0035 * s);
    whip(ctx, hx + OTX[hk] * hr * 0.4, hy + OTY[hk] * hr * 0.4, OLX[hk] * 0.8 + OTX[hk] * 0.6, OLY[hk] * 0.8 + OTY[hk] * 0.6, 1, s);
    whip(ctx, hx + OTX[hk] * hr * 0.4, hy + OTY[hk] * hr * 0.4, -OLX[hk] * 0.8 + OTX[hk] * 0.6, -OLY[hk] * 0.8 + OTY[hk] * 0.6, -1, s);
    const rx = ONX[sk] + OLX[sk] * OS[sk] * sw, ry = ONY[sk] + OLY[sk] * OS[sk] * sw;
    arm(ctx, rx, ry, rx - f * 0.075 * s, ry + 0.01 * s, rx - f * 0.1 * s, ry - 0.065 * s, f, 3, s);
    if (o.glow > 0) { // he burns: his red lightened, added over the body and the stones round him, a soft falloff reaching about one body width (0.08 s) from the spine and no edge
      const g = Math.min(1, o.glow), br = 0.09 * s, cr = 0.03 * s;
      ctx.globalCompositeOperation = "lighter";
      for (let k = 2; k < ONN; k += 3) {
        const gr = ctx.createRadialGradient(ONX[k], ONY[k], 0, ONX[k], ONY[k], br);
        gr.addColorStop(0, `rgba(${OB.burn},${Math.max(g, 0.5) * 0.4})`); gr.addColorStop(1, `rgba(${OB.burn},0)`);
        ctx.fillStyle = gr;
        ctx.fillRect(ONX[k] - br, ONY[k] - br, br * 2, br * 2);
      }
      for (let k = 0; k < ONN; k++) { // the brighter core along the spine, kept in the close frames where the wide bloom is turned down
        const gr = ctx.createRadialGradient(ONX[k], ONY[k], 0, ONX[k], ONY[k], cr);
        gr.addColorStop(0, `rgba(255,120,96,${0.3 + 0.2 * g})`); gr.addColorStop(1, "rgba(255,120,96,0)");
        ctx.fillStyle = gr;
        ctx.fillRect(ONX[k] - cr, ONY[k] - cr, cr * 2, cr * 2);
      }
      ctx.globalCompositeOperation = "source-over";
    }
    if (o.eye !== false) {
      const ex = hx + OTX[hk] * hr * 0.3, ey = hy + OTY[hk] * hr * 0.3;
      flatGlow(ctx, ex, ey, 0.03 * s, OB.glow, 0.5);
      ctx.fillStyle = OB.eye;
      ctx.beginPath(); ctx.arc(ex, ey, Math.max(1.2, 0.007 * s), 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  return { drawRex, drawRexFingers, rexAnchors, drawObrok1 };
})();
