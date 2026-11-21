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
  // dive and curl (poses 5 and 6): here (x, y) is the body's CENTRE, not the foot line, because the callers fly it along a path.
  // Every part keeps its stand size: the axes are the stand segment lengths re-aimed (angles in degrees, 0 = forward, y down).
  const DEG = Math.PI / 180;
  const stand = (n) => PARTS.find(p => p.n === n).ax[0];
  const chain = (n, x, y, a1, a2) => {
    const a = stand(n), r1 = a1 * DEG, r2 = a2 * DEG, l1 = Math.hypot(a[2] - a[0], a[3] - a[1]), l2 = Math.hypot(a[4] - a[2], a[5] - a[3]);
    const x1 = x + l1 * Math.cos(r1), y1 = y + l1 * Math.sin(r1);
    return [x, y, x1, y1, x1 + l2 * Math.cos(r2), y1 + l2 * Math.sin(r2)];
  };
  const turn = (a, ox, oy, deg, nx, ny) => { // the stand axis a turned by deg about (ox, oy), moved so that point lands on (nx, ny)
    const c = Math.cos(deg * DEG), s = Math.sin(deg * DEG), r = [];
    for (let k = 0; k < 6; k += 2) { const vx = a[k] - ox, vy = a[k + 1] - oy; r.push(nx + vx * c - vy * s, ny + vx * s + vy * c); }
    return r;
  };
  const wristHF = (a, th) => [a[4], a[5], Math.atan2(-Math.cos(th * DEG), Math.sin(th * DEG))]; // hand pointing along th
  // dive: a mid-leap, chest leading up and to the right (torso long axis 30 degrees above level, down-back is 150), the near arm reaching out and a little down,
  // the far arm swept back along the torso, the far leg trailing, the near knee drawn up with the shin folded back under it
  const DV = { x: -0.08, y: 0.206 }, DVH = [0, 0, 0];
  {
    const T = 150, c = Math.cos(T * DEG), s = Math.sin(T * DEG), set = (n, a) => { PARTS.find(p => p.n === n).ax[5] = a.map((v, i) => v - (i % 2 ? DV.y : DV.x)); };
    const tp = (x, y) => [(0.905 + y) * c + x * s, (0.905 + y) * s - x * c]; // stand point onto the tilted torso (the front, +x, faces down-right)
    for (const n of ["chest", "collar", "waist", "capB", "capF"]) {
      const a = stand(n), r = [];
      for (let k = 0; k < 6; k += 2) r.push(...tp(a[k], a[k + 1]));
      set(n, r);
    }
    const legs = { B: [152, 162, 162], F: [40, 155, 155] };
    for (const k of ["B", "F"]) {
      const n = "leg" + k, a = stand(n), p = tp(a[0], a[1]), g = legs[k], ax = chain(n, p[0], p[1], g[0], g[1]); set(n, ax);
      const f = "foot" + k;
      set(f, chain(f, ax[4] - 0.02 * Math.cos(g[2] * DEG), ax[5] - 0.02 * Math.sin(g[2] * DEG), g[2], g[2]));
    }
    const hf = [], arms = { B: [150, 40], F: [40, 10] };
    for (const k of ["B", "F"]) {
      const a = stand("up" + k), p = tp(a[0], a[1]), g = arms[k], u = chain("up" + k, p[0], p[1], g[0], g[0]), f = chain("fore" + k, u[4], u[5], g[1], g[1]);
      set("up" + k, u); set("fore" + k, f);
      hf.push(wristHF(f, g[1])); hf[hf.length - 1][0] -= DV.x; hf[hf.length - 1][1] -= DV.y;
    }
    HF.push(hf);
    const co = PARTS.find(p => p.n === "collar").ax[5];
    DVH[0] = co[2] + 0.03; DVH[1] = co[3] - 0.017; DVH[2] = 60 * DEG;
  }
  // curl: a closed ball, back to the left, knees drawn up, both arms wrapped round the creature held in front of the chest
  const CL = { x: -0.0415, y: 0.031 }, CLH = [0, 0, 0], CAGE = [0, 0];
  {
    const set = (n, a) => { PARTS.find(p => p.n === n).ax[6] = a.map((v, i) => v - (i % 2 ? CL.y : CL.x)); return a; };
    // set from joint positions (h, x forward, y down, before the shift by CL): collar (0.106, -0.106), hip (-0.17, 0.17), knee (0.08, 0.15), shin end (-0.155, 0.235),
    // elbow (0.155, 0.175), wrist (-0.175, 0.235); the torso leans 45 degrees forward as the back and top of the ball
    const P0 = [0.106, -0.106], d1 = 135, ca = 0.025 * Math.SQRT1_2; // the collar's top; the torso runs down-back from it
    set("collar", chain("collar", P0[0], P0[1], d1, d1));
    const C0 = [P0[0] - ca, P0[1] + ca];
    const ch = set("chest", chain("chest", C0[0], C0[1], d1, d1)), w = set("waist", chain("waist", ch[4], ch[5], d1, d1));
    for (const n of ["capB", "capF"]) set(n, turn(stand(n), 0, -0.88, d1 - 90, C0[0], C0[1]));
    const hf = [];
    const legs = { B: [-4.6, 160.1, 10, 10], F: [-4.6, 160.1, 10, 10] }; // thigh forward and level, shin folded back under it, foot along the shin end
    const fo = { B: [-0.03, 0], F: [0, 0] }; // the far leg and arm sit a little back so their edge shows
    for (const k of ["B", "F"]) {
      const g = legs[k], o = fo[k];
      const lg = set("leg" + k, chain("leg" + k, w[4] + o[0], w[5] + o[1], g[0], g[1]));
      set("foot" + k, chain("foot" + k, lg[4], lg[5], g[2], g[3]));
    }
    const arms = { B: [80, 169.7], F: [80, 169.7] }; // upper arm straight down in front of the knees, forearm back under the legs
    for (const k of ["B", "F"]) {
      const g = arms[k], o = fo[k];
      const u = set("up" + k, chain("up" + k, P0[0] + o[0], P0[1] + o[1], g[0], g[0])), f = set("fore" + k, chain("fore" + k, u[4], u[5], g[1], g[1]));
      hf.push(wristHF(f, g[1]));
      hf[hf.length - 1][0] -= CL.x; hf[hf.length - 1][1] -= CL.y;
    }
    HF.push(hf);
    const co = PARTS.find(p => p.n === "collar").ax[6];
    CLH[0] = co[2]; CLH[1] = co[3]; CLH[2] = 60 * DEG;
    CAGE[0] = 0.06 - CL.x; CAGE[1] = 0.05 - CL.y; // the pocket between chest and thighs
  }
  // recoil (pose 7): staggered by pain, weight thrown back (away from the facing side), torso leaning back 20 degrees about the hip, the near arm flung out
  // forward and up with the hand open and the fingers fanned, the far arm thrown back, the back foot stepped out behind. Origin on the foot line like stand.
  const RCH = [0, 0, 0];
  {
    const set = (n, a) => { PARTS.find(p => p.n === n).ax[7] = a; return a; };
    const tr = (a) => turn(a, 0.006, -0.52, -20, -0.03, -0.5);
    for (const n of ["chest", "collar", "waist", "capB", "capF"]) set(n, tr(stand(n)));
    set("legB", [-0.04, -0.5, -0.155, -0.275, -0.27, -0.05]);
    set("footB", [-0.303, -0.026, -0.248, -0.026, -0.198, -0.025]);
    set("legF", [-0.01, -0.5, 0.07, -0.275, 0.15, -0.05]);
    set("footF", [0.095, -0.026, 0.14, -0.026, 0.22, -0.025]);
    const hf = [], arms = { B: [160, 190], F: [-50, -35] };
    for (const k of ["B", "F"]) {
      const a = stand("up" + k), p = tr([a[0], a[1], 0, 0, 0, 0]), g = arms[k], u = chain("up" + k, p[0], p[1], g[0], g[0]), f = chain("fore" + k, u[4], u[5], g[1], g[1]);
      set("up" + k, u); set("fore" + k, f);
      hf.push(wristHF(f, g[1]));
    }
    HF.push(hf);
    const co = PARTS.find(p => p.n === "collar").ax[7];
    RCH[0] = co[0] - 0.007; RCH[1] = co[1] - 0.019; RCH[2] = -0.35;
    for (const P of PARTS) { // the fanned near hand: each finger leans out from its base, the thumb out to its side
      if (P.n === "thumb1") P.fan = [-0.034, 0.012, -0.06, 0.03, -0.09, 0.05];
      else if (/^fin1\d$/.test(P.n)) { const L = P.loc; P.fan = [L[0], L[1], L[0] * 2.2, L[3], L[0] * 3.4, L[5]]; }
    }
  }
  // crawl (pose 8): lying face down, the torso near level (head end 12 degrees up) facing east, the far arm reaching ahead and pulling, the near fist closed under the chest
  // on the creature, the legs trailing and dragging. (x, y) is the body's CENTRE like dive and curl; the stand lengths are kept.
  const CW = { x: -0.43, y: 0.09 }, CWH = [0, 0, 0];
  {
    const T = 168, c = Math.cos(T * DEG), s = Math.sin(T * DEG), set = (n, a) => { PARTS.find(p => p.n === n).ax[8] = a.map((v, i) => v - (i % 2 ? CW.y : CW.x)); return a; };
    const tp = (x, y) => [(0.905 + y) * c + x * s, (0.905 + y) * s - x * c];
    for (const n of ["chest", "collar", "waist", "capB", "capF"]) {
      const a = stand(n), r = [];
      for (let k = 0; k < 6; k += 2) r.push(...tp(a[k], a[k + 1]));
      set(n, r);
    }
    const legs = { B: [155, 166, 172], F: [178, 181, 177] };   // trailing flat on the floor behind him: the far knee bent down to it, the near leg straight along it
    for (const k of ["B", "F"]) {
      const n = "leg" + k, a = stand(n), p = tp(a[0], a[1]), g = legs[k], ax = chain(n, p[0], p[1], g[0], g[1]); set(n, ax);
      const f = "foot" + k;
      set(f, chain(f, ax[4] - 0.02 * Math.cos(g[1] * DEG), ax[5] - 0.02 * Math.sin(g[1] * DEG), g[2], g[2]));
    }
    const hf = [], arms = { B: [28, 14], F: [190, 5] };   // far arm reaching ahead with the hand on the floor; near arm folded back along the belly, the fist under the chest
    for (const k of ["B", "F"]) {
      const a = stand("up" + k), p = tp(a[0], a[1]), g = arms[k], u = chain("up" + k, p[0], p[1], g[0], g[0]), f = chain("fore" + k, u[4], u[5], g[1], g[1]);
      set("up" + k, u); set("fore" + k, f);
      hf.push(wristHF(f, g[1])); hf[hf.length - 1][0] -= CW.x; hf[hf.length - 1][1] -= CW.y;
    }
    HF.push(hf);
    const co = PARTS.find(p => p.n === "collar").ax[8];
    CWH[0] = co[2] + 0.05; CWH[1] = co[3] - 0.03; CWH[2] = 35 * DEG;
  }
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
  ORD[5] = ORD[3]; // dive: the far arm and legs first, then the body, then the near arm
  // curl: the legs and body, then the far arm, then the near arm over it
  ORD[6] = ["legB", "footB", "upB", "foreB", "palm0", "fin00", "fin01", "fin02", "fin03", "thumb0", "waist", "chest", "collar", "capB",
    "legF", "footF", "capF", "upF", "foreF", "thumb1", "palm1", "fin10", "fin11", "fin12", "fin13"];
  ORD[7] = ORD[3]; // recoil: as grip
  ORD[8] = ORD[3]; // crawl: as grip (the far arm reaching first, then the body, then the near fist over it)
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
  let cC = null, cX = 0, cY = 0, cH = 1, cF = 1, cPose = 0, cPal = null, cFist = 0, cMelt = 0, cCut = 0, cRaise = 1, cVen = 0, cVenA = 1, vV = null, vF = 0;
  // venom path along the near arm: part -> [venom where the red enters it, where it has crossed it, 1 if it runs from the part's end (t = 1) back, 0 from its start]
  const VEN = { palm1: [0.0625, 0.1875, 1], thumb1: [0, 0.125, 1], foreF: [0.1875, 0.5, 1], upF: [0.5, 0.75, 1], capF: [0.75, 0.875, 0], collar: [0.75, 0.875, 0], chest: [0.875, 1.2, 0] };
  // the red is "232,84,78", Obrokxus's burn (OB.burn)
  for (let j = 0; j < 4; j++) VEN["fin1" + j] = [0, 0.125, 1];
  const redRow = (s, r) => { // the joints of this row run red
    if (!vV || cVenA <= 0) return false;
    const m = (s.rt0[r] + s.rt1[r]) / 2;
    return vV[2] ? m >= 1 - vF : m <= vF;
  };
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
  function axes(s) {
    if (s.hand >= 0) {
      const H = cMix > 0 ? BHF[s.hand] : hfOf(cPose, s.hand, cRaise);
      let L = s.loc;
      if (cMix > 0) { // between two poses: the finger layout blends between the plain hand and the fanned one
        const f1 = cPose === 7 && s.hand && s.fan ? s.fan : s.loc, f2 = cP2 === 7 && s.hand && s.fan ? s.fan : s.loc;
        for (let k = 0; k < 6; k++) LB[k] = f1[k] + (f2[k] - f1[k]) * cMix;
        L = LB;
      } else if (cPose === 7 && s.hand && s.fan) L = s.fan;
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
      const A = cMix > 0 ? BAX[s.n] : axOf(s, cPose, cRaise);
      for (let k = 0; k < 6; k++) AXW[k] = A[k];
    }
    let dx = AXW[2] - AXW[0], dy = AXW[3] - AXW[1], l = Math.hypot(dx, dy) || 1; T0X = dx / l; T0Y = dy / l;
    dx = AXW[4] - AXW[2]; dy = AXW[5] - AXW[3]; l = Math.hypot(dx, dy) || 1; T1X = dx / l; T1Y = dy / l;
    if (!(s.hand && cFist > 0 && s.fl)) { W0 = s.w[0]; WM = s.w[1]; W1 = s.w[2]; }
  }
  function drawPart(s) {
    axes(s);
    const brk = s.n === "chest"; // headless: the top two courses are broken (stones missing, tops uneven)
    vV = cVen > 0 ? VEN[s.n] || null : null; vF = 0;
    if (vV) vF = Math.max(0, Math.min(1, (cVen - vV[0]) / (vV[1] - vV[0])));
    const pal = vF > 0 ? palette(8) : cPal; // the stones the red has passed are cold
    backPart(s, brk, pal);
    const j = Math.max(0.0016, 1.2 / cH), nr = s.rt0.length;
    const ml = cMelt > 0;
    for (let r = 0; r < nr; r++) {
      const t0 = s.rt0[r], t1 = s.rt1[r], g0 = t0 < 0.5 ? 0 : 1, g1 = t1 <= 0.5 ? 0 : 1;
      if (ml) {
        const yh = rowYh(s, r);
        if (yh > cCut) continue; // dissolved
        if (yh > cCut - MELT_BAND) { meltRow(s, r, yh, r === nr - 1 || rowYh(s, r + 1) > cCut); continue; }
      }
      const jj = redRow(s, r) ? Math.max(j, 2.2 / cH) : j, jt = jj / s.len, ju = jj / WM; // the joints of a red row are wider
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
        let cl = pal.lit[gi], cs = pal.shade[gi];
        if (cWarm > 0) { // the stones nearest him take a warm tint from his burning
          const wd = Math.hypot((Q[0][0] + Q[2][0]) / 2 - cWX, (Q[0][1] + Q[2][1]) / 2 - cWY) / (0.1 * cH);
          if (wd < 1) { const wk = cWarm * (1 - wd) * 0.45; cl = mixHex(cl, "#ff6a50", wk); cs = mixHex(cs, "#b0302c", wk); }
        }
        litShade(cC, traceCur, lo + 0.3 * (hi - lo), cl, cs);
      }
    }
  }
  // o.melt: the whole body dissolves from the lowest point up. Rows below cCut (h units, y up is negative) are gone; the band above it
  // is one flat run-together shape per row in the land's first orange (drawRexLand), wider the nearer the cut, with short drips hanging from the last one.
  const WOMB = { lit: "#c9581f", shade: "#8a3512" }, MELT_BAND = 0.14;
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
      Q[2][0] = bx - d; Q[2][1] = Math.min(by + L, cClip ? cFlo : cY); Q[3][0] = ax + d; Q[3][1] = Math.min(ay + L, cClip ? cFlo : cY);
      litShade(cC, traceCur, ax + 0.3 * (bx - ax), WOMB.lit, WOMB.shade);
    }
  }
  // dark backing under a part's courses, so joints and missing blocks read as dark, not as holes
  function backPart(s, brk, pal) {
    const dark = pal.dark, red = vV && cVenA > 0 ? mixHex(dark, "#e8544e", cVenA) : dark;
    for (let r = brk && !cHead ? 1 : 0; r < s.rt0.length; r++) {
      if (cMelt > 0 && rowYh(s, r) > cCut - MELT_BAND) continue;
      cC.fillStyle = redRow(s, r) ? red : dark;
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
  const HEADP = [[0, -0.925, 0], [-0.012, -0.92, -0.18], [0.012, -0.912, 0.3], [0.05, -0.915, 0.25], [-0.22, -0.88, -0.6], DVH, CLH, RCH, CWH];
  const poseOf = (o) => o.pose === "reach" ? 1 : o.pose === "slap" ? 2 : o.pose === "grip" ? 3 : o.pose === "dead" ? 4 : o.pose === "dive" ? 5 : o.pose === "curl" ? 6 : o.pose === "recoil" ? 7 : o.pose === "crawl" ? 8 : 0;

  // ---- between two poses: o.pose2 and o.mix (0..1) draw the body part of the way from o.pose to o.pose2 ----
  // Each limb segment keeps its length (lengths and directions are blended, and the chain is rebuilt joint by joint from the parent's blended point),
  // so the stones never stretch or part; hands and head follow their limb. The scratch below is filled by mixCompute and read by drawPart, drawRex and rexAnchors.
  const BN = ["chest", "waist", "collar", "capB", "capF", "upB", "upF", "foreB", "foreF", "legB", "legF", "footB", "footF"];
  const BPAR = { chest: null, waist: ["chest", 4], collar: ["chest", 0], capB: ["chest", 0], capF: ["chest", 0], upB: ["capB", 0], upF: ["capF", 0],
    foreB: ["upB", 4], foreF: ["upF", 4], legB: ["waist", 4], legF: ["waist", 4], footB: ["legB", 4], footF: ["legF", 4] };
  const BAX = {}, BA1 = {}, BA2 = {}, BAXI = {};
  for (const n of BN) { BAX[n] = new Float64Array(6); BA1[n] = new Float64Array(6); BA2[n] = new Float64Array(6); }
  const BHF = [new Float64Array(4), new Float64Array(4)], BH = new Float64Array(3), LB = new Float64Array(6);
  let cMix = 0, cP2 = 0;
  const angLerp = (a, b, m) => { let d = b - a; d -= TAU * Math.round(d / TAU); return a + d * m; };
  function mixCompute(p1, p2, m, rz) {
    const w = 1 - m;
    for (const n of BN) {
      const s = PARTS[IDX[n]], a1 = BA1[n], a2 = BA2[n];
      let A = axOf(s, p1, rz); for (let k = 0; k < 6; k++) a1[k] = A[k];
      A = axOf(s, p2, rz); for (let k = 0; k < 6; k++) a2[k] = A[k];
    }
    const raw = (n, k) => BA1[n][k] * w + BA2[n][k] * m;
    for (const n of BN) {
      const a1 = BA1[n], a2 = BA2[n], o = BAX[n], pr = BPAR[n];
      if (pr) {
        o[0] = BAX[pr[0]][pr[1]] + raw(n, 0) - raw(pr[0], pr[1]);
        o[1] = BAX[pr[0]][pr[1] + 1] + raw(n, 1) - raw(pr[0], pr[1] + 1);
      } else { o[0] = raw(n, 0); o[1] = raw(n, 1); }
      for (let k = 0; k < 4; k += 2) {
        const l1 = Math.hypot(a1[k + 2] - a1[k], a1[k + 3] - a1[k + 1]), l2 = Math.hypot(a2[k + 2] - a2[k], a2[k + 3] - a2[k + 1]);
        const g = angLerp(Math.atan2(a1[k + 3] - a1[k + 1], a1[k + 2] - a1[k]), Math.atan2(a2[k + 3] - a2[k + 1], a2[k + 2] - a2[k]), m), l = l1 * w + l2 * m;
        o[k + 2] = o[k] + l * Math.cos(g); o[k + 3] = o[k + 1] + l * Math.sin(g);
      }
    }
    for (let a = 0; a < 2; a++) {
      const fn = a ? "foreF" : "foreB", f = BAX[fn];
      let H = hfOf(p1, a, rz);
      const x1 = H[0], y1 = H[1], g1 = Math.atan2(H[3], H[2]);
      H = hfOf(p2, a, rz);
      const g = angLerp(g1, Math.atan2(H[3], H[2]), m), B = BHF[a];
      B[0] = f[4] + x1 * w + H[0] * m - raw(fn, 4); B[1] = f[5] + y1 * w + H[1] * m - raw(fn, 5);
      B[2] = Math.cos(g); B[3] = Math.sin(g);
    }
    const hq = HEADP[p1], hr = HEADP[p2], c = BAX.collar;
    BH[0] = c[0] + hq[0] * w + hr[0] * m - raw("collar", 0); BH[1] = c[1] + hq[1] * w + hr[1] * m - raw("collar", 1);
    BH[2] = hq[2] * w + hr[2] * m;
  }

  function setup(ctx, x, y, h, o) {
    cC = ctx; cX = x; cY = y; cH = h; cF = o.face === -1 ? -1 : 1;
    cPose = poseOf(o);
    cMix = 0;
    if (o.pose2 !== undefined && o.mix > 0) {
      cMix = Math.min(1, o.mix); cP2 = poseOf({ pose: o.pose2 });
      mixCompute(cPose, cP2, cMix, o.raise === undefined ? 1 : Math.max(0, Math.min(1, o.raise)));
    }
    cWarm = o.warm > 0 ? Math.min(1, o.warm) : 0; cWX = o.warmX || 0; cWY = o.warmY || 0;
    cFist = o.fist === undefined ? (cPose >= 3 && cPose !== 7 ? 1 : 0) : Math.max(0, Math.min(1, o.fist));
    if (cMix > 0 && o.fist === undefined) cFist += ((cP2 >= 3 && cP2 !== 7 ? 1 : 0) - cFist) * cMix;
    // o.venom 0..1 (held in eighths): Obrokxus's red creeps up the near arm in the joints between the stones; the stones it has passed go cold. o.venomA 0..1 (quarters): its brightness
    cVen = Math.round(Math.max(0, Math.min(1, o.venom || 0)) * 8) / 8;
    cVenA = o.venomA === undefined ? 1 : Math.round(Math.max(0, Math.min(1, o.venomA)) * 4) / 4;
    cHead = !!o.head; cRaise = o.raise === undefined ? 1 : Math.max(0, Math.min(1, o.raise));
    cPal = palette(Math.round(Math.max(0, Math.min(1, o.cool || 0)) * 8));
    cMelt = Math.max(0, Math.min(1, o.melt || 0)); cClip = false;
    if (cMelt > 0) { // the melt line rises from the posed body's lowest point to its highest; o.meltSink drops the body by the height melted so the line stays level
      scanBody(false);
      cCut = mLo - cMelt * (mLo - mHi);
      if (o.meltSink) { cFlo = cY + mLo * cH; cY += cMelt * (mLo - mHi) * cH; cClip = true; }
    }
  }
  // scratch for the melt: the posed body's lowest and highest y (h units), and the x of the row corners near the cut
  let mLo = 0, mHi = 0, mXs = 0, mXn = 0, cClip = false, cFlo = 0;
  function scanBody(line) {
    mLo = -1e9; mHi = 1e9; mXs = 0; mXn = 0;
    const ord = ORD[cMix >= 0.5 ? cP2 : cPose];
    for (let i = 0; i < ord.length; i++) {
      if (!cHead && ord[i] === "collar") continue;
      const s = PARTS[IDX[ord[i]]], nr = s.rt0.length;
      axes(s);
      for (let r = 0; r < nr; r++) {
        for (let k = 0; k < 2; k++) {
          const t = k ? s.rt1[r] : s.rt0[r], g = (k ? t <= 0.5 : t < 0.5) ? 0 : 1;
          put(0, t, 0, g); put(1, t, 1, g);
          for (let c = 0; c < 2; c++) {
            const yh = (Q[c][1] - cY) / cH;
            if (line) { if (Math.abs(yh - cCut) < MELT_BAND) { mXs += Q[c][0]; mXn++; } }
            else { if (yh > mLo) mLo = yh; if (yh < mHi) mHi = yh; }
          }
        }
      }
    }
    if (cHead && !line) {
      const hy = cMix > 0 ? BH[1] : HEADP[cPose][1];
      if (hy + HEAD_R > mLo) mLo = hy + HEAD_R;
      if (hy - HEAD_R < mHi) mHi = hy - HEAD_R;
    }
    if (line && !mXn) { mXs = cX; mXn = 1; }
  }
  // o.head true paints the head, spikes and glow (default: headless); o.face 1 or -1, o.cool 0..1, o.pose "stand" (default), "reach", "slap" (near hand flat on his chest, head tipped down)
  // or "grip" (near arm thrust up and forward, body leaning in); o.fist 0..1 closes the near hand (grip: 1). With a closed
  // near hand drawRex leaves the four near fingers out: draw whatever sits in the fist, then call drawRexFingers with the same arguments.
  function drawRex(ctx, x, y, h, o) {
    o = o || {};
    setup(ctx, x, y, h, o);
    const ord = ORD[cMix >= 0.5 ? cP2 : cPose];
    if (cClip) meltClip();
    for (let i = 0; i < ord.length; i++) {
      if (!cHead && ord[i] === "collar") continue;
      if (cFist > 0 && ord[i].startsWith("fin1")) continue;
      drawPart(PARTS[IDX[ord[i]]]);
    }
    const hp = cMix > 0 ? BH : HEADP[cPose], hxh = hp[0], hyh = hp[1];
    if (!cHead || cMelt > 0 && hyh > cCut) { if (cClip) cC.restore(); return; } // the head sinks into the melt
    drawHead(ctx, cX + cF * (hxh - LEAN * hyh) * cH, cY + hyh * cH, cH, hp[2] * cF, cPal.glowA);
    if (cClip) ctx.restore();
  }
  // meltSink: nothing is drawn below the level melt line
  function meltClip() {
    cC.save(); cC.beginPath(); cC.rect(cX - 3 * cH, cFlo - 6 * cH, 6 * cH, 6 * cH); cC.clip();
  }

  // the four near fingers of a closed fist, curled across the palm; same arguments as drawRex, called after what sits in the fist
  function drawRexFingers(ctx, x, y, h, o) {
    o = o || {};
    setup(ctx, x, y, h, o);
    if (cFist <= 0) return;
    if (cClip) meltClip();
    for (let j = 0; j < 4; j++) drawPart(PARTS[IDX["fin1" + j]]);
    if (cClip) ctx.restore();
  }

  // canvas points on the painted body, same arguments as drawRex; out gets head, collar, chest, waist and per arm
  // (B far, F near) shoulderB, elbowB, wristB, handB (the middle of the palm) and the same with F; each is {x, y}
  function ap(out, k, x, y, h, f, px, py) {
    const q = out[k] || (out[k] = { x: 0, y: 0 });
    q.x = x + f * (px - LEAN * py) * h; q.y = y + py * h;
  }
  // the anchors of a blended pose: read off the blended body; where a pose has its own anchor (curl: the cage) its offset from the limb is blended too
  function mixAnchors(x, y, h, f, p1, p2, m, rz, out) {
    mixCompute(p1, p2, m, rz);
    ap(out, "head", x, y, h, f, BH[0], BH[1]);
    const w = 1 - m;
    const ch6 = PARTS[IDX.chest].ax[6], k1 = p1 === 6 ? w : 0, k2 = p2 === 6 ? m : 0, kk = k1 + k2;
    ap(out, "collar", x, y, h, f, BAX.collar[2], BAX.collar[3]);
    ap(out, "waist", x, y, h, f, BAX.waist[2], BAX.waist[3]);
    ap(out, "chest", x, y, h, f, BAX.chest[2] + (CAGE[0] - ch6[2]) * kk, BAX.chest[3] + (CAGE[1] - ch6[3]) * kk);
    for (let a = 0; a < 2; a++) {
      const nm = a ? "F" : "B", U = BAX[a ? "upF" : "upB"], E = BAX[a ? "foreF" : "foreB"], H = BHF[a];
      ap(out, "shoulder" + nm, x, y, h, f, U[0], U[1]);
      ap(out, "elbow" + nm, x, y, h, f, U[4], U[5]);
      ap(out, "wrist" + nm, x, y, h, f, H[0], H[1]);
      ap(out, "hand" + nm, x, y, h, f, H[0] - 0.0535 * H[3], H[1] + 0.0535 * H[2]);
    }
    const G = BHF[1];
    let gx = -0.0525 * G[3], gy = 0.0525 * G[2];
    if (p1 === 6 || p2 === 6) { // the two poses' own grip offsets from the wrist, blended
      const o1 = p1 === 6 ? CAGE : null, o2 = p2 === 6 ? CAGE : null;
      const H1 = HF[p1][1], H2 = HF[p2][1];
      const ax = o1 ? o1[0] - H1[0] : -0.0525 * H1[3], ay = o1 ? o1[1] - H1[1] : 0.0525 * H1[2];
      const bx = o2 ? o2[0] - H2[0] : -0.0525 * H2[3], by = o2 ? o2[1] - H2[1] : 0.0525 * H2[2];
      gx = ax * w + bx * m; gy = ay * w + by * m;
    }
    ap(out, "grip", x, y, h, f, G[0] + gx, G[1] + gy);
    return out;
  }
  // out.melt: the middle of the melt line on screen (the line is at the body's lowest point at melt 0), where the flow leaves him
  function meltAnchor(x, y, h, o, out) {
    setup(cC, x, y, h, o);
    if (cMelt <= 0) { scanBody(false); cCut = mLo; }
    scanBody(true);
    const q = out.melt || (out.melt = { x: 0, y: 0 });
    q.x = mXn > 0 ? mXs / mXn : cX; q.y = cY + cCut * cH;
  }
  function rexAnchors(x, y, h, o, out) {
    o = o || {};
    meltAnchor(x, y, h, o, out);
    const f =o.face === -1 ? -1 : 1, p = poseOf(o), hp = HEADP[p], rz = o.raise === undefined ? 1 : Math.max(0, Math.min(1, o.raise));
    if (o.pose2 !== undefined && o.mix > 0) return mixAnchors(x, y, h, f, p, poseOf({ pose: o.pose2 }), Math.min(1, o.mix), rz, out);
    ap(out, "head", x, y, h, f, hp[0], hp[1]);
    if (p >= 5) { // dive and curl: the middle of each torso part's own axis
      const mid = (n) => PARTS[IDX[n]].ax[p];
      ap(out, "collar", x, y, h, f, mid("collar")[2], mid("collar")[3]);
      ap(out, "chest", x, y, h, f, p === 6 ? CAGE[0] : mid("chest")[2], p === 6 ? CAGE[1] : mid("chest")[3]);
      ap(out, "waist", x, y, h, f, mid("waist")[2], mid("waist")[3]);
    } else {
      ap(out, "collar", x, y, h, f, 0.001, -0.89);
      ap(out, "chest", x, y, h, f, 0.002, -0.77);
      ap(out, "waist", x, y, h, f, 0.006, -0.59);
    }
    for (let a = 0; a < 2; a++) {
      const nm = a ? "F" : "B", U = PARTS[IDX[a ? "upF" : "upB"]], A = axOf(U, p, rz), H = hfOf(p, a, rz);
      ap(out, "shoulder" + nm, x, y, h, f, A[0], A[1]);
      ap(out, "elbow" + nm, x, y, h, f, A[4], A[5]);
      ap(out, "wrist" + nm, x, y, h, f, H[0], H[1]);
      ap(out, "hand" + nm, x, y, h, f, H[0] - 0.0535 * H[3], H[1] + 0.0535 * H[2]);
    }
    const G = hfOf(p, 1, rz);
    if (p === 6) ap(out, "grip", x, y, h, f, CAGE[0], CAGE[1]); // curl: the cage between the fists, where the creature is held
    else ap(out, "grip", x, y, h, f, G[0] - 0.0525 * G[3], G[1] + 0.0525 * G[2]); // the middle of the closed near hand
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
    const gc = o.gait === undefined ? undefined : Math.floor(o.gait * 12 + 1e-6) / 12; // o.gait the running clock in seconds, sampled in held 1/12 s steps
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
        if (gc === undefined) { ctx.quadraticCurveTo(bx + px * L, by + py * L, bx + px * L * 0.8 - tx * L * 0.9, by + py * L * 0.8 - ty * L * 0.9); continue; }
        const sa = Math.sin(gc * 6 * Math.PI + k * 2.4) * 0.436, cs = Math.cos(sa), sn = Math.sin(sa); // the leg swings about its root, both sides alike so they oppose fore and aft; 3 cycles/s, so the 1/12 s held clock shows 4 poses a cycle (6 cycles/s aliased to 2)
        const cx = px * L, cy = py * L, ex = px * L * 0.8 - tx * L * 0.9, ey = py * L * 0.8 - ty * L * 0.9;
        ctx.quadraticCurveTo(bx + cx * cs - cy * sn, by + cx * sn + cy * cs, bx + ex * cs - ey * sn, by + ex * sn + ey * cs);
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
