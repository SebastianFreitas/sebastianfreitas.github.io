/* Genesis swarm: the places and paths of the approved round 8 insect sketch (air, bridge, water) laid on the cutscene's frame, plus the crowd's life:
   hatch from the hatch rocks, travel to the place, live there as sketched, leave by eased motion. Seeded only, pure in (t, o, Gen).
   window.GenSwarm:
     draw(ctx, t, o)   t = real seconds since the matter beat began; o.spots = [{x, y, t0}] hatch rocks in ctx px (t0 = real second the rock can first
                       hatch); o.leaveAt = real second the leaving starts (Infinity while unknown). Frame W, H and deck come from window.Gen.
   The sketch's 900x450 panel is a true-size crop of the 2000x1009 frame: panel deck y 376 sits on Gen.DECK * Gen.H, everything scales by k = H / 1009,
   and the panel is centred on the mean x of the spots (the crop's real left edge was never recorded), so it slides with the camera. Travelling paths
   are built over a box far outside the frame, so every wrap happens out of sight. Paths are built once per (W, H, rock layout) and cached. */
window.GenSwarm = (function () {
  "use strict";
  const GI = window.GenInsects, TAU = Math.PI * 2;
  const PW = 900, DECK = 376, UND = 386, BIG = 1e6, C0 = BIG / 2, DS = 3, REF = 1009;
  const S = (u) => (u < 0 ? 0 : u > 1 ? 1 : u * u * (3 - 2 * u));
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const ec = (u) => { u = clamp(u, 0, 1); return 1 - (1 - u) * (1 - u) * (1 - u); };
  const SK_ROCKS = [{ cx: 252, cy: 155, rx: 44, ry: 56 }, { cx: 658, cy: 236, rx: 88, ry: 46 }];
  const VM = { 1: 28, 2: 12, 3: 0, 4: 0, 5: 7, 6: 22, 7: 9, 8: 7 };
  const ZW = { 1: [0.5, 0.3, 0.2], 2: [0.6, 0.1, 0.3], 3: [0.4, 0.3, 0.3], 4: [0.4, 0.35, 0.25], 5: [0.4, 0.3, 0.3], 6: [0.6, 0.1, 0.3], 7: [0.7, 0.2, 0.1], 8: [0.5, 0.2, 0.3] };
  // build state: the box (panel units) every travelling path must leave, and the rocks (panel units)
  let BX0 = 0, BX1 = PW, BY0 = 0, BY1 = 450, ROCKS = SK_ROCKS;
  // the layout span (panel units): screen x -0.05 W .. 1.15 W at camera 0; AT = the air zone's top (frame y 0.20 H); ay maps a sketch panel y (0 = panel top) into the air zone
  let LX0 = 0, LX1 = PW, AT = 0;
  const ay = (y) => AT + y * (DECK - AT) / DECK;

  // ---- path object from points ----
  function make(pts, loop, pp) {
    const n = pts.length, cum = [0], ang = [];
    for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    for (let i = 0; i < n; i++) {
      let a = loop ? (i + n - 1 - 3) % (n - 1) : Math.max(0, i - 3), b = loop ? (i + 3) % (n - 1) : Math.min(n - 1, i + 3);
      let ang0 = Math.atan2(pts[b][1] - pts[a][1], pts[b][0] - pts[a][0]);
      if (n === 2) ang0 = Math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0]);
      if (i) { while (ang0 - ang[i - 1] > Math.PI) ang0 -= TAU; while (ang0 - ang[i - 1] < -Math.PI) ang0 += TAU; }
      ang.push(ang0);
    }
    return { pts: pts, cum: cum, ang: ang, L: cum[n - 1], loop: loop, pp: !!pp };
  }
  const look = { x: 0, y: 0, a: 0 };
  function lookup(Pa, s) {
    let L = Pa.L, rev = false;
    if (Pa.pp) { const u = ((s % (2 * L)) + 2 * L) % (2 * L); rev = u > L; s = rev ? 2 * L - u : u; } else s = ((s % L) + L) % L;
    const cum = Pa.cum; let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
    const f = (s - cum[lo]) / Math.max(1e-6, cum[hi] - cum[lo]), a = Pa.pts[lo], b = Pa.pts[hi];
    look.x = a[0] + (b[0] - a[0]) * f; look.y = a[1] + (b[1] - a[1]) * f; look.a = Pa.ang[lo] + (Pa.ang[hi] - Pa.ang[lo]) * f + (rev ? Math.PI : 0);
    return look;
  }
  function sAtX(Pa, x) { let bi = 0, bd = 1e9; for (let i = 0; i < Pa.pts.length; i++) { const d = Math.abs(Pa.pts[i][0] - x); if (d < bd) { bd = d; bi = i; } } return Pa.cum[bi]; }

  // ---- generators (the sketch's, with the exit box widened from the panel to the frame) ----
  function integ(x0, y0, afn, mg, clampY, foldT) {
    const fw = [], bw = []; let capped = false;
    const out = (x, y) => x < BX0 - mg || x > BX1 + mg || y < BY0 - mg || y > BY1 + mg;
    if (foldT !== undefined && y0 < foldT) y0 = 2 * foldT - y0;
    for (let dir = 1; dir >= -1; dir -= 2) {
      let x = x0, y = y0, s = 0, arr = dir > 0 ? fw : bw, n = 0, f = 1;   // f flips at the air zone's top: the motion bounces there, so the path only ends through a side
      for (;;) {
        const a = afn(s + dir * DS * 0.5); x += Math.cos(a) * DS * dir; y += Math.sin(a) * DS * dir * f; s += dir * DS;
        if (foldT !== undefined && y < foldT) { y = 2 * foldT - y; f = -f; }
        if (clampY !== undefined && y > clampY) y = clampY;
        arr.push([x, y]);
        if (out(x, y)) break;
        if (++n > 1600) { capped = true; break; }
      }
    }
    const pts = bw.reverse().concat([[x0, y0]], fw);
    const pa = make(pts, false, capped); pa.s0 = bw.length * DS; return pa;
  }
  function expl(fy, sx, mg) {
    const pts = [];
    for (let x = sx > 0 ? BX0 - mg : BX1 + mg; sx > 0 ? x <= BX1 + mg : x >= BX0 - mg; x += sx * DS) pts.push([x, fy(x)]);
    return make(pts, false, false);
  }
  function ellipse(cx, cy, rx, ry, dirn, wob, ph) {
    const n = Math.max(24, Math.round(Math.PI * (rx + ry) / DS)), pts = [];
    for (let i = 0; i <= n; i++) { const th = dirn * TAU * (i % n) / n, r = 1 + wob * Math.sin(3 * th + ph); pts.push([cx + rx * r * Math.cos(th), cy + ry * r * Math.sin(th)]); }
    return make(pts, true, false);
  }
  const sumTurns = (turns, L, w) => (s) => { let a = 0; for (let i = -45; i <= 45; i++) a += turns(i) * S((s - i * L) / w + 0.5); return a; };

  function airPath(it, R, x0, y0, clampY, dry) {
    const k = it.mk, s = it.s, mg = 1.6 * s + 14, rr = (a, b) => a + (b - a) * R(), a0 = R() * TAU, ph = R() * TAU, ph2 = R() * TAU;
    let afn;
    if (k === 1) { const lam = rr(600, 900); afn = (u) => a0 + 1.4 * Math.sin(TAU * u / lam + ph); }
    else if (k === 2) {
      const lam = rr(230, 280), per = rr(520, 640); R();
      const sg = R() < 0.5 ? 1 : -1;
      afn = (u) => { const w = (((u / per) + ph / TAU) % 1 + 1) % 1, up = S((w - 0.62) / 0.08) * (1 - S((w - 0.8) / 0.08)); return Math.PI / 2 + 1.1 * Math.sin(TAU * u / lam + ph2) - sg * Math.PI * up; };
    } else if (k === 6) {
      const L = rr(110, 190), ts = {}; R(); for (let i = -45; i <= 45; i++) ts[i] = (R() < 0.5 ? 1 : -1) * rr(0.9, 2.1);
      afn = (() => { const f = sumTurns((i) => ts[i], L, 26); return (u) => a0 + f(u); })();
    } else if (k === 8) {
      const L = rr(60, 85), sg = R() < 0.5 ? 1 : -1, f = sumTurns((i) => (i % 2 ? -1 : 1) * sg * Math.PI / 2, L, 16);
      afn = (u) => a0 + f(u);
    } else if (k === 7) {
      const lam = rr(90, 130), A = 0.9;
      afn = (u) => { const q = ((u / lam) % 1 + 1) % 1, h = q < 0.85 ? Math.cos(Math.PI * q / 0.85) : -1 + 2 * S((q - 0.85) / 0.15); return a0 - A * h + 0.6 * Math.sin(TAU * u / 700 + ph); };
    } else { const l1 = rr(260, 340), l2 = rr(110, 150); afn = (u) => a0 + 0.9 * Math.sin(TAU * u / l1 + ph) + 0.6 * Math.sin(TAU * u / l2 + ph2); }
    if (dry) return { fam: k === 1 ? "air arcs" : k === 2 ? "air leaf swoops" : k === 6 ? "air dart-hook" : k === 8 ? "air staircase" : k === 7 ? "air hop chain" : "air wander" };
    const pa = integ(x0, y0, afn, mg, clampY, AT); pa.fam = k === 1 ? "air arcs" : k === 2 ? "air leaf swoops" : k === 6 ? "air dart-hook" : k === 8 ? "air staircase" : k === 7 ? "air hop chain" : "air wander";
    return pa;
  }
  const pickRock = (R) => ROCKS[Math.floor(R() * ROCKS.length)];
  function rockPoint(R, gap, s) { const rk = pickRock(R), th = R() * TAU; return { rk: rk, th: th, x: rk.cx + (rk.rx + gap + 0.5 * s) * Math.cos(th), y: rk.cy + (rk.ry + gap + 0.5 * s) * Math.sin(th) }; }

  // the air zone's choices: rock shares (st still, k3 patch, ob orbit, tr travel start) and the span the places come from
  const OLD_AIR = { st: 0.5, k3: 0.5, ob: 0.4, tr: 0.35, lo: () => 0, hi: () => PW, ay: (y) => y };
  const NEW_AIR = { st: 0.12, k3: 0.12, ob: 0.1, tr: 0.08, lo: () => LX0, hi: () => LX1, ay: (y) => ay(y) };
  function airZ(it, R, P, dry, s, still, clampY) {
    const k = it.mk, rr = (a, b) => a + (b - a) * R(), x0a = P.lo(), x1a = P.hi();
    let pa;
    if (still) { const q = R() < P.st ? rockPoint(R, rr(2, 14), s) : { x: rr(x0a + 20, x1a - 20), y: P.ay(rr(30, 320)) }, a = R() * TAU; pa = make([[q.x, q.y], [q.x + Math.cos(a) * 3, q.y + Math.sin(a) * 3]], false, true); pa.fam = "air still"; pa.s0 = 0; return pa; }
    if (k === 3) {
      const q = R() < P.k3 ? rockPoint(R, rr(4, 30), s) : { x: rr(x0a + 60, x1a - 60), y: P.ay(rr(50, 300)) }, px = rr(20, 40), py = rr(14, 30);
      pa = ellipse(q.x, q.y, px, py, R() < 0.5 ? 1 : -1, 0.05, R() * TAU); pa.fam = "air patch"; pa.s0 = R() * pa.L; return pa;
    }
    if (R() < P.ob && !it.noOrbit) {
      const rk = pickRock(R), cling = R() < 0.4, gap = cling ? rr(0, 4) : rr(8, 38);
      pa = ellipse(rk.cx, rk.cy, rk.rx + gap + 0.5 * s, rk.ry + gap + 0.5 * s, R() < 0.5 ? 1 : -1, cling ? 0.03 : 0.07, R() * TAU);
      pa.fam = cling ? "rock cling" : "rock orbit"; pa.s0 = R() * pa.L; return pa;
    }
    let x0 = rr(x0a, x1a), y0 = P.ay(rr(25, 330));
    if (R() < P.tr) { const q = rockPoint(R, rr(20, 90), s); x0 = q.x; y0 = Math.min(q.y, 330); }
    return airPath(it, R, x0, y0, clampY, dry);
  }

  function pathFor(it, z, R, N) {
    const k = it.mk, s = it.s, mg = 1.6 * s + 14, rr = (a, b) => a + (b - a) * R(), still = it.num && k === 4, sx = R() < 0.5 ? 1 : -1;
    const yD = DECK - 0.45 * s - 2, yU = UND + 0.45 * s + 2, PH = 450;
    let pa;
    if (z === 0) {
      const clampY = DECK - 0.5 * s - 8;
      // the original draws on R (their results only give the original family, which later seeded steps still depend on), the new places and rock shares on N
      const po = airZ(it, R, OLD_AIR, true, s, still, clampY), pn = airZ(it, N, NEW_AIR, false, s, still, clampY);
      pn.oldFam = po.fam; return pn;
    }
    if (z === 1) {
      let fam = { 1: "walk", 2: "climb", 3: "hang", 4: "hang", 5: "walk", 6: "climb", 7: R() < 0.6 ? "walk" : "climb", 8: "walk" }[k];
      if (!it.num) fam = it.kind === "pair" ? "walk" : "climb";
      const xs = rr(LX0 + 60, LX1 - 60);
      if (fam === "hang" && still) { pa = make([[xs, yU], [xs, yU + 3]], false, true); pa.s0 = 0; pa.fam = "bridge hang still"; return pa; }
      if (fam === "hang") { pa = expl((x) => yU + 1.2 * Math.sin(x / 33), sx, mg); pa.fam = "bridge hang"; }
      else if (fam === "walk") { const A = rr(1.2, 2.6), lam = rr(36, 70); pa = expl((x) => yD - A * Math.abs(Math.sin(Math.PI * x / lam)), sx, mg); pa.fam = "bridge walk"; }
      else { const H = rr(36, 80), lam = rr(240, 380), ph = R(); pa = expl((x) => { const u = (((x / lam) + ph) % 1 + 1) % 1; return yD - (u < 0.72 ? H * Math.pow(Math.sin(Math.PI * u / 0.72), 1.5) : 0); }, sx, mg); pa.fam = "bridge climb"; }
      pa.s0 = sAtX(pa, xs); return pa;
    }
    const yc = Math.min(PH - 0.55 * s - 6, Math.max(UND + 12 + 0.55 * s, rr(405, 430))), xs = rr(LX0 + 30, LX1 - 30);
    if (still) { pa = make([[xs, yc], [xs + 3, yc]], false, true); pa.s0 = 0; pa.fam = "water still"; return pa; }
    if (k === 3) { pa = ellipse(xs, yc, rr(20, 36), rr(5, 9), R() < 0.5 ? 1 : -1, 0.04, R() * TAU); pa.fam = "water patch"; pa.s0 = R() * pa.L; return pa; }
    const A = rr(5, 12), lam = rr(160, 300), ph = R() * TAU, A2 = rr(2, 5), lam2 = rr(70, 110);
    pa = expl((x) => yc + A * Math.sin(TAU * x / lam + ph) + A2 * Math.sin(TAU * x / lam2 + 2 * ph), sx, mg);
    pa.fam = "water drift"; pa.s0 = sAtX(pa, xs); return pa;
  }
  function crossPath(it, R, kind) {
    const s = it.s, mg = 1.6 * s + 14, rr = (a, b) => a + (b - a) * R(), sx = R() < 0.5 ? 1 : -1, xc = rr(LX0 + 0.29 * (LX1 - LX0), LX0 + 0.71 * (LX1 - LX0)), PH = 450;
    const yD = DECK - 0.45 * s - 2, yW = Math.min(PH - 0.55 * s - 6, Math.max(UND + 12 + 0.55 * s, rr(408, 428))), lam = rr(240, 330), ph = R() * TAU;
    let pa;
    const u = (x, w) => S(((x - xc) * sx) / w + 0.5);
    if (kind === "drop") { pa = expl((x) => yD + (yW - yD) * u(x, 80) + 7 * u(x, 80) * Math.sin(TAU * x / 200 + ph), sx, mg); pa.fam = "cross drop"; }
    else if (kind === "rise") { pa = expl((x) => yW - (yW - yD) * u(x, 80) + 7 * (1 - u(x, 80)) * Math.sin(TAU * x / 200 + ph), sx, mg); pa.fam = "cross rise"; }
    else { const yA = rr(190, 270); pa = expl((x) => yD - (yD - yA) * u(x, 280) + 14 * u(x, 280) * Math.sin(TAU * x / lam + ph), sx, mg); pa.fam = "cross lift"; }
    const tc = rr(3, 9), vm = Math.max(VM[it.mk] || 10, 8) * it.ts;
    pa.s0 = sAtX(pa, xc - sx * vm * tc); return pa;
  }

  // zones and paths for the roster (the sketch's assign); list items are copies, GenInsects.LIST is never touched
  // the first 120 items and the appended ones are assigned apart, each with its own generators (sd), extra-path limits (lim) and crossing count (cx),
  // so the first 120 keep every value they had
  function assign(list, sd, lim, cx) {
    const R = GI.rng(sd[0]), N = GI.rng(sd[1]), R2 = GI.rng(sd[2]), X = { hop: 0, top: 0, climb: 0 }, n = list.length, quota = [Math.round(n * 0.5), Math.round(n * 0.25), 0];
    quota[2] = n - quota[0] - quota[1];
    const order = list.map((_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    for (const i of order) {
      const it = list[i]; it.num = typeof it.kind === "number"; const w = it.num ? ZW[it.mk] : [0.5, 0.25, 0.25];
      let bz = 0, bv = -1; for (let z = 0; z < 3; z++) { const v = quota[z] > 0 ? w[z] * (0.35 + R()) : -1; if (v > bv) { bv = v; bz = z; } }
      quota[bz]--; it.z = bz;
    }
    const pick = (z, kinds, cnt, tag) => { let c = 0; for (const it of list) { if (c >= cnt) break; if (it.num && it.z === z && kinds.indexOf(it.mk) >= 0 && !it.cross) { it.cross = tag; c++; } } };
    pick(1, [1, 2, 6, 7], cx, "drop"); pick(2, [1, 2, 6, 5], cx, "rise"); pick(1, [1, 2, 6, 7], cx, "lift");
    for (const it of list) {
      const rr = (a, b) => a + (b - a) * R();
      it.ts = it.z === 2 ? 0.5 : 1; it.gain = 1; it.bob = it.z === 2;
      if (it.num) {
        const k = it.mk; it.vk = k === 1 ? rr(24, 32) : k === 2 ? rr(14, 18) : k === 5 ? rr(12, 16) : k === 6 ? rr(28, 34) : it.v;
        it.lc = Object.assign({}, it, { dir: 0, x0: 0.5, y0: 0.5, v: it.vk, kind: it.kind, mk: k });
      } else it.vp = it.kind === "pair" ? rr(8, 16) : rr(6, 14);
      it.pth = it.cross ? crossPath(it, R, it.cross) : pathFor(it, it.z, R, N);
      const ofm = it.pth.oldFam || it.pth.fam;
      if (it.num && !it.cross && ofm !== "air still") {
        const fm = ofm; if (fm === "air hop chain") X.hop++; const s = it.s, rr2 = (u, v) => u + (v - u) * R2();
        if (it.z === 0 && it.mk === 7 && fm !== "air hop chain" && X.hop < lim[0]) { X.hop++; it.pth = airPath(it, R2, rr2(LX0, LX1), ay(rr2(25, 330)), DECK - 0.5 * s - 8); }
        else if (it.z === 0 && X.top < lim[1] && /wander|arcs|swoops|dart|staircase/.test(fm) && R2() < 0.3) { X.top++; it.pth = airPath(it, R2, rr2(LX0, LX1), ay(rr2(12, 120)), DECK - 0.5 * s - 8); }
        else if (it.z === 1 && fm === "bridge walk" && X.climb < lim[2] && R2() < 0.85) {
          X.climb++; const yD = DECK - 0.45 * s - 2, xs = rr2(LX0 + 60, LX1 - 60), sx = R2() < 0.5 ? 1 : -1, H = rr2(36, 80), lam = rr2(240, 380), ph = R2();
          const pa = expl((x) => { const u = (((x / lam) + ph) % 1 + 1) % 1; return yD - (u < 0.72 ? H * Math.pow(Math.sin(Math.PI * u / 0.72), 1.5) : 0); }, sx, 1.6 * s + 14); pa.fam = "bridge climb"; pa.s0 = sAtX(pa, xs); it.pth = pa;
        }
      }
      if (it.pth.s0 === undefined) it.pth.s0 = 0;
      it.s0 = it.pth.s0; it.fam = it.pth.fam;
    }
  }

  // ---- the roster with its places, birth and leaving numbers (cached per frame size and rock layout) ----
  let CK = "", OBJ = [], LEAVE = [];
  const NB = 120;   // the first roster block, kept bit for bit; the items after it are appended
  function build(W, H, k, dY, rel, mx0) {
    const key = W + "|" + H + "|" + dY + "|" + rel.join(",") + "|" + Math.round(mx0);
    if (key === CK) return;
    CK = key;
    LX0 = PW / 2 + (-0.05 * W - mx0) / k; LX1 = PW / 2 + (1.15 * W - mx0) / k; AT = DECK - (dY - 0.20 * H) / k;
    BX0 = PW / 2 - 0.75 * W / k; BX1 = PW / 2 + 0.75 * W / k; BY0 = DECK - dY / k; BY1 = DECK + (H - dY) / k;
    ROCKS = rel.length ? rel.map((r, i) => ({ cx: r[0], cy: r[1], rx: SK_ROCKS[i % 2].rx, ry: SK_ROCKS[i % 2].ry })) : SK_ROCKS;
    OBJ = GI.LIST.map((it, i) => Object.assign({ idx: i }, it));
    assign(OBJ.slice(0, NB), [6021, 2718, 7071], [6, 6, 3], 3);
    assign(OBJ.slice(NB), [3571, 6607, 8123], [4, 4, 2], 2);
    LEAVE = [];
    [[8821, 0, NB], [3947, NB, OBJ.length]].forEach((g) => {
      const r = GI.rng(g[0]), ord = []; for (let i = g[1]; i < g[2]; i++) ord.push(i);
      for (let i = ord.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [ord[i], ord[j]] = [ord[j], ord[i]]; }
      ord.forEach((oi, rank) => { LEAVE[oi] = rank / (ord.length - 1) * 2.1; });
    });
    OBJ.forEach((w, i) => { const q = GI.rng(48611 + i * 977); w.bs = q(); w.bd = q() * 1.8; w.bm = 3.2 + q() * 1; });
  }

  // pose in panel units at time t (the sketch's InsPath.place); shards come back in panel units too
  function place(w, t) {
    const te = t * w.ts; let sp, lat = 0, o = null;
    if (w.num) {
      o = GI.move(w.lc, te, BIG, BIG); let d = o.x - C0; lat = o.y - C0;
      if (w.mk === 6) { const u = te / w.lc.Tf, nn = Math.floor(u), f = u - nn; d = GI.move(w.lc, (nn + S(Math.min(f / 0.5, 1))) * w.lc.Tf, BIG, BIG).x - C0; }
      sp = w.s0 + d * w.gain;
    } else sp = w.s0 + w.vp * te;
    let q = lookup(w.pth, sp), qa = q.a, qx = q.x, qy = q.y;
    const bx = w.bob ? 2.5 * Math.sin(0.7 * t + w.wob) : 0, by = w.bob ? 3 * Math.sin(1.1 * t + w.wob * 1.7) : 0;
    const res = o || { mv: null, norot: true, shards: [], p: 0, t: t };
    res.x = qx - Math.sin(qa) * lat + bx; res.y = qy + Math.cos(qa) * lat + by;
    if (o) {
      res.th = qa + o.th;
      for (const h of o.shards) {
        const u = lookup(w.pth, w.s0 + (h.x - C0) * w.gain), dl = h.y - C0;
        h.x = u.x - Math.sin(u.a) * dl + bx; h.y = u.y + Math.cos(u.a) * dl + by; if (h.k) h.th += u.a;
      }
    } else res.th = qa + w.off + 0.25 * Math.sin(0.4 * t + w.wob);
    return res;
  }

  let rel = [];
  function draw(ctx, t, o) {
    const G = window.Gen, W = G.W, H = G.H, k = H / REF, dY = G.DECK * H, spots = o.spots || [], n = spots.length, leaveAt = o.leaveAt;
    if (!n || (isFinite(leaveAt) && t >= leaveAt + 2.8)) return;
    let mx = 0; for (let i = 0; i < n; i++) mx += spots[i].x; mx /= n;
    rel.length = n; for (let i = 0; i < n; i++) rel[i] = [Math.round(PW / 2 + (spots[i].x - mx) / k), Math.round(DECK + (spots[i].y - dY) / k)];
    build(W, H, k, dY, rel, mx + G.cam * W);   // mx at camera 0: the span is fixed in world terms
    const fcx = mx, fcy = dY + (225 - DECK) * k;
    for (let i = 0; i < OBJ.length; i++) {
      const w = OBJ[i], sp = spots[Math.floor(w.bs * n)], th = sp.t0 + w.bd, u = t - th;
      if (u < 0) continue;
      let lv = 0, ldl = LEAVE[i];
      if (isFinite(leaveAt)) { lv = (t - leaveAt - ldl) / 0.7; if (lv >= 1) continue; }
      const e = ec(u / w.bm), sc = ec(u / 0.3), pose = place(w, t);
      const pxx = mx + (pose.x - PW / 2) * k, pyy = dY + (pose.y - DECK) * k;
      let X = sp.x + (pxx - sp.x) * e, Y = sp.y + (pyy - sp.y) * e;
      if (lv > 0) {
        const t0 = leaveAt + ldl, b = place(w, t0), bx = mx + (b.x - PW / 2) * k, by = dY + (b.y - DECK) * k, c = lv * lv * lv;
        if (w.z === 0) { let dx = bx - fcx, dy = by - fcy; const l = Math.hypot(dx, dy) || 1; X += dx / l * (W + H) * c; Y += dy / l * (W + H) * c; }
        else if (w.z === 1) X += (bx < W / 2 ? -1 : 1) * (W / 2 + 80) * c;
        else Y += 0.45 * H * c;
      }
      const kf = k * sc, mg = 20 + 3 * w.s * kf;
      if (X < -mg || X > W + mg || Y < -mg || Y > H + mg) continue;
      const cols = GI.colors(w, t, w.z === 2);
      GI.drawBody(ctx, w, X, Y, pose, cols, kf);
      if (pose.shards.length) {
        for (const h of pose.shards) { h.x = mx + (h.x - PW / 2) * k + (X - pxx); h.y = dY + (h.y - DECK) * k + (Y - pyy); }
        GI.drawShards(ctx, pose, cols, 0, 0, kf);
      }
    }
  }
  return { draw: draw };
})();
