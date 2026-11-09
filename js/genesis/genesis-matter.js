/* genesis-matter.js — the second wave: flesh, stone and both at once,
   floating, falling and breaking; insects hatch out of it and mostly die,
   deformed or struck by weather that obeys nothing. Pure functions of time. */
(function () {
  const G = window.Gen;
  const { hash1, clamp, mix, smooth, mulberry, TAU } = Util;
  const { litShade } = Paint;
  const { flatGlow } = GenPaint;

  /* ---- palette (built once) ------------------------------------------ */
  // the rocks are neutral dark greys (flesh too), painted straight on the scene, lighter than the shadowed air and sea
  const FLESH_LIT = "#484848", FLESH_SHADE = "#2e2e2e", FLESH_RAW = "#565656";
  const STONE_LIT = "#464646", STONE_SHADE = "#2c2c2c", STONE_DARK = "#202020";
  const INSECT_BODY = "#2a2622", INSECT_WING = "rgba(207,214,211,0.5)", INSECT_DEFORM = "#b0525c";
  const AIR_COLOR = "#e8eef0", RAIN_COLOR = "#8fb6d8";
  const FIRE_LIT = "#f08a2a", FIRE_CORE = "#ffd36a", FIRE_DARK = "#b8321e";
  const LIGHT_OUTER = "#9b7cff", LIGHT_CORE = "#f4f0ff";

  /* ---- chunks ---------------------------------------------------------
     100 pieces of matter: flesh, stone, or both at once (meld), launched
     from the Point, flying briefly, then gathering into one mass that the
     old ones climb out of. */
  const CHUNKS_N = 100;
  const CHUNKS = [];
  const MASS = { yf: 0.52, rxH: 0.30, ryH: 0.12 };
  // 1 while chunks are still flying, shrinks the mass as old ones climb out
  function massScale(trs) {
    return 1 - 0.7 * smooth(clamp((trs - 2.0) / 7.5, 0, 1));
  }
  // 0..1: how much of the way a chunk has been pulled into the mass
  function gatherK(c, s) {
    if (c.mode === "break") return 0;
    return smooth(clamp((s - c.birth - 0.8) / 2.2, 0, 1));
  }
  (function seedChunks() {
    const r = mulberry(9201);
    for (let i = 0; i < CHUNKS_N; i++) {
      const mr = r();
      const mat = mr < 0.25 ? "flesh" : mr < 0.75 ? "stone" : "meld";
      const modeR = r();
      const c = {
        mat,
        birth: r() * 3.5,
        ang: r() * TAU,
        // launch speed as a fraction of H: G.H is 0 at load time (before the
        // conductor sizes the canvas), so the actual px/s speed is resolved
        // against the current G.H wherever it's used, not baked in here.
        vf: 0.06 + r() * 0.16,
        mode: modeR < 0.45 ? "float" : modeR < 0.85 ? "fall" : "break",
        size: 7 + r() * r() * 46,
        spin: (r() - 0.5) * 2.2,
        tb: 1.2 + r() * 2.6,
        sides: 5 + Math.floor(r() * 4),
        seed: Math.floor(r() * 1e6),
        life: 5.5 + r() * 4,
      };
      // unit vertex list, built once
      const n = mat === "flesh" ? c.sides * 2 : c.sides;
      const jitLo = mat === "flesh" ? 0.85 : 0.6, jitHi = mat === "flesh" ? 1.15 : 1.0;
      const verts = [];
      for (let k = 0; k < n; k++) {
        const a = (k / n) * TAU;
        const jit = mat === "flesh" ? mix(jitLo, jitHi, hash1(c.seed + k))
                                     : (0.6 + 0.4 * hash1(c.seed + k));
        verts.push([Math.cos(a) * jit, Math.sin(a) * jit]);
      }
      c.verts = verts;
      // where this chunk settles in the mass (unit disc, no r() calls so
      // the seed sequence above stays untouched)
      const sa = hash1(i * 3 + 101) * TAU, sr = Math.sqrt(hash1(i * 5 + 211));
      c.mx = Math.cos(sa) * sr; c.my = Math.min(0.8, Math.sin(sa) * sr); c.mr = sr;
      CHUNKS.push(c);
    }
  })();

  /* ---- the four rocks ---------------------------------------------------
     what is left of the point: four big hard chunks of different shapes, thrown at the
     blast (break clock 0.5) and settling into the mass the old ones climb out of.
     f: where each rests (x, y as fractions of H from the mass centre), R: size as a fraction of H. */
  const BLAST_TB = 0.5;
  const ROCKS = [
    { mat: "stone", n: 11, lo: 0.55, st: [1.25, 0.8], R: 0.076, fx: -0.60, fy: -0.04, ang: -2.6, dl: 0.00, dur: 1.9, spin: 0.9, r0: 0.4, seed: 4417, cut: 0 },
    { mat: "flesh", n: 7, lo: 0.5, st: [0.85, 1.15], R: 0.060, fx: -0.20, fy: -0.11, ang: -1.3, dl: 0.08, dur: 2.3, spin: -1.4, r0: 1.1, seed: 4423, cut: 1 },
    { mat: "meld", n: 9, lo: 0.6, st: [1.35, 0.7], R: 0.070, fx: 0.20, fy: -0.02, ang: 0.6, dl: 0.04, dur: 2.6, spin: 0.6, r0: -0.7, seed: 4441, cut: 2 },
    { mat: "stone", n: 6, lo: 0.7, st: [1, 1], R: 0.045, fx: 0.60, fy: -0.06, ang: -0.3, dl: 0.12, dur: 1.6, spin: -2.2, r0: 1.3, seed: 4447, cut: 3 },
  ];
  const INSECT_FX = [-0.20, -0.04, 0.10, 0.27];   // where the insects hatch, frozen at the rocks' old resting spots
  ROCKS.forEach(function (k) {
    // a rough outline, then every edge split twice and each new point pushed off the line, so no long straight edge is left
    const base = [];
    for (let j = 0; j < k.n; j++) {
      const a = (j / k.n) * TAU + (hash1(k.seed + j * 7) - 0.5) * 0.5 * TAU / k.n, jit = k.lo + (1 - k.lo) * hash1(k.seed + j);
      base.push([Math.cos(a) * jit * k.st[0], Math.sin(a) * jit * k.st[1]]);
    }
    k.verts = [];
    for (let j = 0; j < k.n; j++) {
      const p = base[j], q = base[(j + 1) % k.n], ex = q[0] - p[0], ey = q[1] - p[1];
      k.verts.push(p);
      for (let m = 1; m <= 2; m++) {
        const u = m / 3 + (hash1(k.seed + j * 13 + m * 5) - 0.5) * 0.12, d = (hash1(k.seed + j * 17 + m * 3 + 50) - 0.5) * 0.3;
        k.verts.push([p[0] + ex * u - ey * d, p[1] + ey * u + ex * d]);
      }
    }
    k.size = 1;   // verts are unit; drawChunkAt scales by the size passed in (the ones that still use it)
    k.ext = 0;
    for (let j = 0; j < k.verts.length; j++) k.ext = Math.max(k.ext, Math.hypot(k.verts[j][0], k.verts[j][1]));
    k.mr = Math.min(1, Math.hypot(k.fx / MASS.rxH, k.fy / MASS.ryH));
  });
  // one pose for drawRocks and rockPose: rock k, a seconds after its own start, trs = trade seconds; null once worn away
  function rockPoseAt(k, a, trs) {
    const H = G.H, Ox = G.sx(0), Oy = 0.46 * H, Mx = G.sx(0), My = MASS.yf * H;
    const u = clamp(a / k.dur, 0, 1), e = 1 - Math.pow(1 - u, 3), arc = Math.sin(Math.PI * u) * 0.05 * H;
    let x = mix(Ox, Mx + k.fx * H, e) + Math.cos(k.ang) * arc, y = mix(Oy, My + k.fy * H, e) + Math.sin(k.ang) * arc;
    let sk = 1;
    if (trs > 0) {
      const vents = window.GenOld && GenOld.activeVents ? GenOld.activeVents(trs) : null;
      if (vents) {
        const R = 0.14 * H;
        for (let q = 0; q < vents.length; q++) {
          const v = vents[q], dx = x - v.x, dy = y - v.y, d = Math.hypot(dx, dy);
          if (d > 0.001 && d < R) { const push = (1 - d / R) * 0.06 * H * v.k; x += dx / d * push; y += dy / d * push; }
        }
      }
      // the rocks wear away from the outside in, slower than the old ones climb out: they shrink in held steps, always opaque, then go
      const keep = clamp((massScale(trs * 0.75) - k.mr * 0.6) / 0.2, 0, 1);
      sk = trs >= 8.6 ? 0 : trs >= 8.2 ? 0.25 : keep > 0.75 ? 1 : keep > 0.5 ? 0.8 : keep > 0.25 ? 0.6 : 0.4;
    }
    if (sk === 0) return null;
    const size = k.R * H * sk * (0.9 + 0.1 * smooth(clamp(a / 0.2, 0, 1)));
    // never over the bridge: the rock's lowest reach stays above the span's top
    y = Math.min(y, G.H * G.DECK - 0.06 * H - k.ext * size);
    return { x: x, y: y, rot: k.r0 + k.spin * 1.2 * (1 - Math.exp(-a / 1.2)), size: size };
  }
  function drawRocks(ctx, tb) {
    const a0 = tb - BLAST_TB;
    if (a0 < 0) return;
    const trs = G.secs("trade");
    for (let i = 0; i < ROCKS.length; i++) {
      const k = ROCKS[i], a = a0 - k.dl;
      if (a < 0) continue;
      const p = rockPoseAt(k, a, trs);
      if (p) drawRockAt(ctx, k, p.x, p.y, p.rot, p.size);
    }
  }
  // the rock where drawRocks leaves it at the first frame of matter (tb 10, a0 9.5); reads G.H like drawRocks
  function rockPose(i) { return rockPoseAt(ROCKS[i], 3.45 - BLAST_TB - ROCKS[i].dl, 0); }
  // each rock has its own break (or none), cut in its own turning frame, all darker than the bridge
  const RK_LIT = "#2a2a2a", RK_MID = "#232323", RK_SHADE = "#1c1c1c", RK_DARK = "#141414";
  function drawRockAt(ctx, k, x, y, rot, s) {
    const v = k.verts, E = 1.8 * s;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    for (let j = 0; j < v.length; j++) { if (j === 0) ctx.moveTo(v[j][0] * s, v[j][1] * s); else ctx.lineTo(v[j][0] * s, v[j][1] * s); }
    ctx.closePath();
    ctx.fillStyle = RK_LIT; ctx.fill();
    ctx.clip();
    if (k.cut === 0) {   // a slanted break across
      ctx.fillStyle = RK_SHADE;
      ctx.beginPath(); ctx.moveTo(-E, 0.35 * s); ctx.lineTo(E, -0.8 * s); ctx.lineTo(E, E); ctx.lineTo(-E, E); ctx.closePath(); ctx.fill();
    } else if (k.cut === 1) {   // no break: one soft-toned patch
      ctx.fillStyle = RK_MID;
      ctx.beginPath(); ctx.ellipse(-0.25 * s, -0.2 * s, 0.35 * s, 0.2 * s, 0.4, 0, 6.283); ctx.fill();
    } else if (k.cut === 2) {   // a low band and two dark shards
      ctx.fillStyle = RK_SHADE; ctx.fillRect(-E, 0.3 * s, 2 * E, E);
      ctx.fillStyle = RK_DARK;
      for (let q = 0; q < 2; q++) {
        const px = s * (0.35 + q * 0.3), py = q === 0 ? -0.2 * s : 0.15 * s, r = 0.25 * s;
        ctx.beginPath(); ctx.moveTo(px, py - r); ctx.lineTo(px + r, py + r); ctx.lineTo(px - r, py + r); ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
  }

  /* ---- insects ---------------------------------------------------------
     150 hatch out of chunks; most die almost at once, deformed or caught
     by the storms. */
  const DEFORMS = ["none", "noLegs", "twoHeads", "bentWing", "swollen", "extraLegs"];
  const INSECTS = [];
  (function seedInsects() {
    const r = mulberry(9202);
    for (let i = 0; i < 150; i++) {
      const parent = Math.floor(r() * CHUNKS_N);
      const hatch = CHUNKS[parent].birth + 0.8 + r() * 2.5;
      const dieR = r();
      INSECTS.push({
        parent,
        hatch,
        die: dieR < 0.78 ? 0.3 + r() * 1.4 : 99,
        ang: r() * TAU,
        spd: 20 + r() * 70,
        wob: r() * TAU,
        deform: DEFORMS[Math.floor(r() * 6)],
        size: 3.5 + r() * 4,
      });
    }
  })();

  /* ---- storms ------------------------------------------------------- */
  const STORMS = [];
  (function seedStorms() {
    const r = mulberry(9203);
    const types = ["air", "rain", "fire", "lightning", "rain", "fire", "lightning"];
    // seeded shuffle: swap with a seeded index
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const tmp = types[i]; types[i] = types[j]; types[j] = tmp;
    }
    for (let i = 0; i < 7; i++) {
      STORMS.push({
        type: types[i],
        t: 1.0 + i * 0.8 + r() * 0.3,
        dur: 0.8 + r() * 0.5,
        xf: 0.12 + r() * 0.76,
        yf: 0.18 + r() * 0.6,
        Rf: 0.08 + r() * 0.08,
        tilt: (r() - 0.5) * 3.4,
      });
    }
  })();

  // the comb's entrance, right after it enters at matter local 4.2s: fixed, no RNG
  (function seedCombStorm() {
    const durs = STORMS.map(s => s.dur).sort((a, b) => a - b);
    const Rfs = STORMS.map(s => s.Rf).sort((a, b) => a - b);
    const medDur = durs[(durs.length - 1) >> 1];
    const medRf = Rfs[(Rfs.length - 1) >> 1];
    STORMS.push({ type: STORMS[0].type, t: 5.0, dur: medDur, xf: .82, yf: .22, Rf: medRf, tilt: 0 });
  })();

  /* ---- scratch ---------------------------------------------------------
     preallocated, written by chunkAt and reused by the trade wave. */
  const scratch = { x: 0, y: 0, rot: 0, a: 0, alive: false };

  // chunk position/rotation/alpha at time s, before any melding or trade offset
  function chunkAt(i, s) {
    const c = CHUNKS[i];
    const Ox = G.sx(0), Oy = 0.46 * G.H, v = c.vf * G.H;
    let a = s - c.birth;
    scratch.alive = c.mode === "break" ? (a >= 0 && a <= c.life) : (a >= 0);
    if (a < 0) a = 0;
    let x, y;
    if (c.mode === "fall") {
      x = Ox + Math.cos(c.ang) * v * a * 0.6;
      y = Oy + Math.sin(c.ang) * v * a * 0.6 + 0.5 * 0.22 * G.H * a * a;
    } else {
      // float and break (break flies like float until tb, fragments after)
      x = Ox + Math.cos(c.ang) * v * a * 0.55;
      y = Oy + Math.sin(c.ang) * v * a * 0.55 + Math.sin(a * 1.3 + c.seed) * 8;
    }
    if (c.mode !== "break") {
      const g = gatherK(c, s);
      const br = 1 + 0.025 * Math.sin(G.t * 1.4 + c.seed);
      const mxp = G.sx(0) + c.mx * MASS.rxH * G.H * br, myp = MASS.yf * G.H + c.my * MASS.ryH * G.H * br;
      x = mix(x, mxp, g); y = mix(y, myp, g);
    }
    scratch.x = x; scratch.y = y;
    scratch.rot = c.mode === "break" ? c.spin * a : c.spin * Math.min(a, 2.0);
    scratch.a = c.mode === "break"
      ? Math.min(1, a / 0.3) * (a > c.life - 1 ? Math.max(0, c.life - a) : 1)
      : Math.min(1, a / 0.3);
    return scratch;
  }

  // storm envelope 0..1 at time s
  function stormEnv(st, s) {
    return smooth(clamp((s - st.t) / 0.15, 0, 1)) *
      (1 - smooth(clamp((s - st.t - st.dur + 0.4) / 0.4, 0, 1)));
  }
  // is (x,y) inside storm st's disc at time s? (air/fire shudder + hit test)
  function inStorm(st, x, y, s) {
    if (stormEnv(st, s) <= 0.02) return false;
    const cx = st.xf * G.W, cy = st.yf * G.H, R = st.Rf * G.W;
    const dx = x - cx, dy = y - cy;
    return dx * dx + dy * dy <= R * R;
  }

  /* ---- chunk path / draw ------------------------------------------------
     traceChunk reads module-level scratch vars set by drawChunkAt, so
     litShade's trace() callback is a bound function, not a per-frame closure. */
  let tcCtx = null, tcChunk = null, tcX = 0, tcY = 0, tcRot = 0, tcScale = 1;
  function traceChunk() {
    const cs = Math.cos(tcRot), sn = Math.sin(tcRot);
    const verts = tcChunk.verts, size = tcChunk.size * tcScale;
    tcCtx.beginPath();
    for (let k = 0; k < verts.length; k++) {
      const vx = verts[k][0] * size, vy = verts[k][1] * size;
      const px = tcX + (vx * cs - vy * sn), py = tcY + (vx * sn + vy * cs);
      if (k === 0) tcCtx.moveTo(px, py); else tcCtx.lineTo(px, py);
    }
    tcCtx.closePath();
  }

  function drawChunkAt(ctx, c, x, y, rot, alpha, scale) {
    if (alpha < 0.02) return;
    ctx.globalAlpha = alpha;
    const sizePx = c.size * scale;
    tcCtx = ctx; tcChunk = c; tcX = x; tcY = y; tcRot = rot; tcScale = scale;
    if (sizePx < 3) {
      traceChunk();
      ctx.fillStyle = c.mat === "flesh" ? FLESH_LIT : c.mat === "stone" ? STONE_LIT : STONE_LIT;
      ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }
    if (c.mat === "flesh") {
      litShade(ctx, traceChunk, x - sizePx * 0.2, FLESH_LIT, FLESH_SHADE);
      if (sizePx >= 8) {
        ctx.save();
        ctx.translate(x - sizePx * 0.22, y - sizePx * 0.18);
        ctx.rotate(rot);
        ctx.scale(sizePx * 0.18, sizePx * 0.10);
        ctx.beginPath(); ctx.arc(0, 0, 1, 0, 6.283);
        ctx.restore();
        ctx.fillStyle = FLESH_RAW;
        ctx.fill();
      }
    } else if (c.mat === "stone") {
      litShade(ctx, traceChunk, x - sizePx * 0.2, STONE_LIT, STONE_SHADE);
    } else {
      // meld: stone base, flesh over the right half, flesh-shade far right,
      // two stone-dark shards poking out of the flesh half
      traceChunk();
      ctx.fillStyle = STONE_LIT; ctx.fill();
      ctx.save();
      traceChunk();
      ctx.clip();
      ctx.fillStyle = FLESH_LIT;
      ctx.fillRect(x, y - sizePx * 1.2, sizePx * 1.2, sizePx * 2.4);
      ctx.fillStyle = FLESH_SHADE;
      ctx.fillRect(x + sizePx * 0.7, y - sizePx * 1.2, sizePx * 1.2, sizePx * 2.4);
      ctx.restore();
      const shardR = sizePx * 0.25;
      for (let k = 0; k < 2; k++) {
        const sxk = x + sizePx * (0.35 + k * 0.3), syk = y + (k === 0 ? -sizePx * 0.2 : sizePx * 0.15);
        ctx.beginPath();
        ctx.moveTo(sxk, syk - shardR);
        ctx.lineTo(sxk + shardR, syk + shardR);
        ctx.lineTo(sxk - shardR, syk + shardR);
        ctx.closePath();
        ctx.fillStyle = STONE_DARK;
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ---- insects ---------------------------------------------------------- */
  function drawInsects(ctx, s) {
    for (let i = 0; i < INSECTS.length; i++) {
      const ins = INSECTS[i];
      if (s < ins.hatch) continue;
      const parentAge = ins.hatch - CHUNKS[ins.parent].birth;
      const hatchPos = chunkAt(ins.parent, ins.hatch);
      if (!hatchPos.alive) continue; // parent dead at hatch time: never drawn
      // they hatch from the rocks now, on the rock's near edge (the chunks they were born of are no longer drawn)
      const rk = ROCKS[ins.parent % ROCKS.length], rr = rk.R * G.H * 0.8;
      const hx = G.sx(0) + INSECT_FX[ins.parent % ROCKS.length] * G.H + Math.cos(ins.ang) * rr, hy = MASS.yf * G.H + rk.fy * G.H + Math.sin(ins.ang) * rr * 0.7;

      let b = s - ins.hatch;
      // storm death: check position at each storm's start time
      let deathT = ins.hatch + ins.die;
      for (let k = 0; k < STORMS.length; k++) {
        const st = STORMS[k];
        if (st.type === "lightning" || st.t <= ins.hatch || st.t >= deathT) continue; // lightning storms are not drawn
        const bt = st.t - ins.hatch;
        const px = hx + Math.cos(ins.ang) * ins.spd * bt + Math.sin(bt * 9 + ins.wob) * 6;
        const py = hy + Math.sin(ins.ang) * ins.spd * bt + Math.cos(bt * 7 + ins.wob) * 5;
        if (inStorm(st, px, py, st.t)) { deathT = st.t; break; }
      }
      const dead = s >= deathT;
      const bd = dead ? deathT - ins.hatch : b;
      let x = hx + Math.cos(ins.ang) * ins.spd * bd + Math.sin(bd * 9 + ins.wob) * 6;
      let y = hy + Math.sin(ins.ang) * ins.spd * bd + Math.cos(bd * 7 + ins.wob) * 5;
      let alpha = 1, rot = 0;
      if (dead) {
        const fa = s - deathT;
        if (fa > 1.2) continue;
        y += 0.5 * 0.25 * G.H * fa * fa;
        rot = Math.PI;
        alpha = 1 - fa / 1.2;
      }
      if (x < -20 || x > G.W + 20 || y < -20 || y > G.H + 20) continue;
      drawInsect(ctx, ins, x, y, rot, alpha, dead ? 0 : b);
    }
  }

  // rot is 0 (alive) or PI (dead, flipped): apply by hand instead of
  // ctx.save/translate/rotate/restore around every one of 150 insects
  function drawInsect(ctx, ins, x, y, rot, alpha, b) {
    if (alpha < 0.02) return;
    ctx.globalAlpha = alpha;
    const size = ins.size;
    const cs = Math.cos(rot), sn = Math.sin(rot);
    // wings
    if (size >= 2.0) {
      const flap = Math.abs(Math.sin(b * 40));
      ctx.fillStyle = INSECT_WING;
      for (let s2 = -1; s2 <= 1; s2 += 2) {
        let wr = s2 * (0.3 + flap * 0.5);
        if (ins.deform === "bentWing" && s2 === 1) wr += 1.3;
        const ly = s2 * size * 0.2;
        ctx.beginPath();
        ctx.ellipse(x - ly * sn, y + ly * cs, size * 0.9, size * 0.32, wr + rot, 0, 6.283);
        ctx.fill();
      }
    }
    // legs
    if (ins.deform !== "noLegs" && size >= 2.0) {
      const nLegs = ins.deform === "extraLegs" ? 6 : 3;
      ctx.strokeStyle = INSECT_BODY;
      ctx.lineWidth = 0.8;
      for (let s2 = -1; s2 <= 1; s2 += 2) {
        for (let li = 0; li < nLegs; li++) {
          const lx = -size * 0.3 + li * (size * 0.6 / Math.max(1, nLegs - 1));
          const twitch = Math.sin(b * 30 + li) * size * 0.25;
          const ly0 = s2 * size * 0.25, ly1 = s2 * (size * 0.25 + size * 0.5);
          const lx1 = lx + twitch * 0.3;
          ctx.beginPath();
          ctx.moveTo(x + lx * cs - ly0 * sn, y + lx * sn + ly0 * cs);
          ctx.lineTo(x + lx1 * cs - ly1 * sn, y + lx1 * sn + ly1 * cs);
          ctx.stroke();
        }
      }
    }
    // body
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * 0.6, rot, 0, 6.283);
    ctx.fillStyle = INSECT_BODY;
    ctx.fill();
    // head(s)
    if (ins.deform === "twoHeads") {
      for (let s2 = -1; s2 <= 1; s2 += 2) {
        const lx = size * 0.45, ly = s2 * size * 0.4;
        ctx.beginPath();
        ctx.arc(x + lx * cs - ly * sn, y + lx * sn + ly * cs, size * 0.45, 0, 6.283);
        ctx.fillStyle = INSECT_BODY;
        ctx.fill();
      }
    } else {
      const lx = size * 0.45;
      ctx.beginPath();
      ctx.arc(x + lx * cs, y + lx * sn, size * 0.45, 0, 6.283);
      ctx.fillStyle = INSECT_BODY;
      ctx.fill();
    }
    // swollen deformity
    if (ins.deform === "swollen") {
      const lx = -size * 0.15;
      ctx.beginPath();
      ctx.arc(x + lx * cs, y + lx * sn, size * 0.9, 0, 6.283);
      ctx.fillStyle = INSECT_DEFORM;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
  }

  /* ---- storms ------------------------------------------------------------ */
  function drawStormsLayer(ctx, s, front) {
    for (let i = 0; i < STORMS.length; i++) {
      const st = STORMS[i];
      const isFront = st.type === "fire" || st.type === "lightning";
      if (isFront !== front) continue;
      // calm build before the event, calm settle after: storms run at half strength
      const e = stormEnv(st, s) * 0.5;
      if (e <= 0.02) continue;
      const cx = st.xf * G.W, cy = st.yf * G.H, R = st.Rf * G.W;
      if (st.type === "air") drawAirStorm(ctx, cx, cy, R, s, st, e);
      else if (st.type === "rain") drawRainStorm(ctx, cx, cy, R, st, e);
      else if (st.type === "fire") drawFireStorm(ctx, cx, cy, R, st.tilt, e);
      else drawLightningStorm(ctx, cx, cy, R, s, st, e);
    }
  }

  // air: a soft flat gust, no rings or ticks (the chunks still shudder in it)
  function drawAirStorm(ctx, cx, cy, R, s, st, e) {
    flatGlow(ctx, cx, cy, R * 0.7, "200,210,220", 0.12 * e);
  }

  function drawRainStorm(ctx, cx, cy, R, st, e) {
    ctx.strokeStyle = RAIN_COLOR;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3 * e;
    const dir = Math.PI / 2 + st.tilt;
    const dx = Math.cos(dir), dy = Math.sin(dir);
    for (let k = 0; k < 28; k++) {
      const px0 = hash1(k * 7 + 1) * 2 * R - R, py0 = hash1(k * 7 + 2) * 2 * R - R;
      const scroll = (G.t * 420 + hash1(k * 7 + 3) * 400) % (2 * R);
      const px = ((px0 + dx * scroll + R) % (2 * R)) - R;
      const py = ((py0 + dy * scroll + R) % (2 * R)) - R;
      if (px * px + py * py > R * R) continue;
      ctx.beginPath();
      ctx.moveTo(cx + px, cy + py);
      ctx.lineTo(cx + px - dx * 9, cy + py - dy * 9);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawFireStorm(ctx, cx, cy, R, tilt, e) {
    const fang = -Math.PI / 2 + tilt;
    const cs = Math.cos(fang), sn = Math.sin(fang);
    for (let k = 0; k < 16; k++) {
      const dark = k >= 14;
      const a = hash1(k * 11 + 1) * TAU;
      const rr = hash1(k * 11 + 2) * R * 0.85;
      const fx = cx + Math.cos(a) * rr, fy = cy + Math.sin(a) * rr;
      const base = 8 + hash1(k * 11 + 3) * 6;
      const flick = 0.7 + 0.3 * Math.sin(G.t * 14 + k);
      const height = (18 + hash1(k * 11 + 4) * 16) * flick;
      const tipx = fx + cs * height, tipy = fy + sn * height;
      const perpx = -sn * base * 0.5, perpy = cs * base * 0.5;
      ctx.beginPath();
      ctx.moveTo(fx - perpx, fy - perpy);
      ctx.lineTo(fx + perpx, fy + perpy);
      ctx.lineTo(tipx, tipy);
      ctx.closePath();
      ctx.globalAlpha = e;
      ctx.fillStyle = dark ? FIRE_DARK : FIRE_LIT;
      ctx.fill();
      if (!dark) {
        const ih = height * 0.55, ib = base * 0.5;
        const itipx = fx + cs * ih, itipy = fy + sn * ih;
        const iperpx = -sn * ib * 0.5, iperpy = cs * ib * 0.5;
        ctx.beginPath();
        ctx.moveTo(fx - iperpx, fy - iperpy);
        ctx.lineTo(fx + iperpx, fy + iperpy);
        ctx.lineTo(itipx, itipy);
        ctx.closePath();
        ctx.fillStyle = FIRE_CORE;
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    flatGlow(ctx, cx, cy, R * 0.6, "240,138,42", 0.6 * e);
  }

  // the one event: a single bolt into the gathered mass, flesh and stone set,
  // about the middle of the 8 s beat (s = local + 0.8). Replaces the strike storms.
  const EV_T = 4.8;
  const EV_PTS = [];
  for (let k = 0; k <= 8; k++) EV_PTS.push([0, 0]);
  function drawMatterEvent(ctx, s) {
    const dt = s - EV_T;
    if (dt < 0 || dt > 0.7) return;
    const mx = G.sx(0), my = MASS.yf * G.H;
    if (dt < 0.2) {
      const x0 = mx + G.W * 0.03, y0 = 0, x1 = mx, y1 = my;
      const nl = Math.hypot(y1 - y0, x1 - x0) || 1;
      const nx = -(y1 - y0) / nl, ny = (x1 - x0) / nl;
      for (let k = 0; k <= 8; k++) {
        const u = k / 8;
        const off = k === 8 ? 0 : (hash1(900 + k) - 0.5) * G.H * 0.1;
        EV_PTS[k][0] = mix(x0, x1, u) + nx * off;
        EV_PTS[k][1] = mix(y0, y1, u) + ny * off;
      }
      ctx.globalAlpha = 0.5;
      Paint.line(ctx, EV_PTS, LIGHT_OUTER, 5);
      ctx.globalAlpha = 1;
      Paint.line(ctx, EV_PTS, LIGHT_CORE, 2);
    }
    // the flash holds, then settles in steps
    const f = dt < 0.2 ? 0.18 : dt < 0.4 ? 0.1 : dt < 0.55 ? 0.05 : 0.02;
    flatGlow(ctx, mx, my, MASS.rxH * G.H * 1.1, "244,240,255", f * 2);
    ctx.globalAlpha = 1;
  }

  // lightning storms no longer strike: the single event above replaces them
  function drawLightningStorm() {}

  /* ---- public draw ------------------------------------------------------- */
  function draw(ctx) {
    if (typeof G.secs !== "function") return;
    if (G.W === 0) return;
    // the 2.5 s beat plays the old 8 s timeline (x3.2), so the mass is whole by its end; trade runs on at 1:1
    const ms = G.secs("matter");
    const s = (ms < 2.5 ? ms * 3.2 : 8 + (ms - 2.5)) + 0.8;
    if (s > 20.6) return;
    // the four rocks are drawn by genesis.js, just under the bridge (drawRocks)
    if (s < 0) return;

    const outer = ctx;
    ctx = GenElem.layerBegin(outer);   // all the rest goes under the same deep shadow as the sea
    drawStormsLayer(ctx, s, false); // air, rain: behind
    drawInsects(ctx, s);
    drawStormsLayer(ctx, s, true); // fire: in front
    drawMatterEvent(ctx, s);

    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
    GenElem.layerEnd(outer, ctx, GenElem.dimK());
  }

  window.GenMatter = { draw, drawRocks, drawRockAt, rockPose, ROCKS, chunkAt, MASS, massScale };
})();
