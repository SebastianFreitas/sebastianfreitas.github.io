/* genesis-matter.js — the second wave: flesh, stone and both at once,
   floating, falling and breaking; insects hatch out of it and mostly die,
   deformed or struck by weather that obeys nothing. Pure functions of time. */
(function () {
  const G = window.Gen;
  const { hash1, clamp, mix, smooth, mulberry, TAU } = Util;
  const { litShade } = Paint;
  const { flatGlow } = GenPaint;

  /* ---- palette (built once) ------------------------------------------ */
  const FLESH_LIT = "#b0525c", FLESH_SHADE = "#6e2a33", FLESH_RAW = "#d27a7f";
  const STONE_LIT = "#8d918c", STONE_SHADE = "#4b4f4c", STONE_DARK = "#3a3d3b";
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
        birth: r() * 7.0,
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
        t: 1.2 + i * 1.25 + r() * 0.6,
        dur: 1.1 + r() * 0.9,
        xf: 0.12 + r() * 0.76,
        yf: 0.18 + r() * 0.6,
        Rf: 0.08 + r() * 0.08,
        tilt: (r() - 0.5) * 3.4,
      });
    }
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

  /* melding: pairs (2j, 2j+1), j < 16, materials differ, are pulled
     together between age 1.0-2.4 (of the later-born of the pair) */
  const MELD_OFFSET = { x: 0, y: 0 };
  function meldOffset(i, s) {
    MELD_OFFSET.x = 0; MELD_OFFSET.y = 0;
    if (i >= 32) return MELD_OFFSET;
    const j = i >> 1;
    const other = i % 2 === 0 ? i + 1 : i - 1;
    const c = CHUNKS[i], co = CHUNKS[other];
    if (c.mat === co.mat) return MELD_OFFSET;
    const laterBirth = Math.max(c.birth, co.birth);
    const a = s - laterBirth;
    if (a < 1.0 || a > 2.4) return MELD_OFFSET;
    const pull = a < 1.9 ? smooth((a - 1.0) / 0.7) : (1 - smooth((a - 1.9) / 0.5));
    const me = chunkAtRaw(i, s), them = chunkAtRaw(other, s);
    const mx = (me.x + them.x) * 0.5, my = (me.y + them.y) * 0.5;
    const fade = 1 - gatherK(c, s);
    MELD_OFFSET.x = (mx - me.x) * pull * fade;
    MELD_OFFSET.y = (my - me.y) * pull * fade;
    return MELD_OFFSET;
  }
  // raw position without meld/trade offsets, for meldOffset's own midpoint calc
  const rawScratch = { x: 0, y: 0 };
  function chunkAtRaw(i, s) {
    const c = CHUNKS[i];
    const Ox = G.sx(0), Oy = 0.46 * G.H, v = c.vf * G.H;
    let a = Math.max(0, s - c.birth);
    if (c.mode === "fall") {
      rawScratch.x = Ox + Math.cos(c.ang) * v * a * 0.6;
      rawScratch.y = Oy + Math.sin(c.ang) * v * a * 0.6 + 0.5 * 0.22 * G.H * a * a;
    } else {
      rawScratch.x = Ox + Math.cos(c.ang) * v * a * 0.55;
      rawScratch.y = Oy + Math.sin(c.ang) * v * a * 0.55 + Math.sin(a * 1.3 + c.seed) * 8;
    }
    return rawScratch;
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

  // "break" chunk fragments after tb: 3 triangles from consecutive thirds
  // of the vertex list plus the centre, flying apart and falling
  // module-level scratch for the current fragment's path, read by traceFragment
  // (avoids allocating a closure per fragment per frame)
  let fragC = null, fragCs = 0, fragSn = 0, fragThird = 0, fragK = 0, fragFx = 0, fragFy = 0, fragSize = 0;
  function traceFragment() {
    const n = fragC.verts.length;
    ctx0.beginPath();
    for (let m = 0; m <= 2; m++) {
      let vx, vy;
      if (m < 2) {
        const vi = (fragK * fragThird + m) % n;
        vx = fragC.verts[vi][0] * fragSize; vy = fragC.verts[vi][1] * fragSize;
      } else { vx = 0; vy = 0; }
      const px = fragFx + (vx * fragCs - vy * fragSn), py = fragFy + (vx * fragSn + vy * fragCs);
      if (m === 0) ctx0.moveTo(px, py); else ctx0.lineTo(px, py);
    }
    ctx0.closePath();
  }
  let ctx0 = null;
  function drawBreakFragments(ctx, c, i, s, alpha, scale) {
    if (alpha < 0.02) return;
    const Ox = G.sx(0), Oy = 0.46 * G.H, v = c.vf * G.H;
    const breakX = Ox + Math.cos(c.ang) * v * c.tb * 0.55;
    const breakY = Oy + Math.sin(c.ang) * v * c.tb * 0.55 + Math.sin(c.tb * 1.3 + c.seed) * 8;
    const fa = s - c.birth - c.tb; // seconds since the break
    const n = c.verts.length, third = Math.max(1, Math.floor(n / 3));
    const sizePx = c.size * scale;
    const fillLit = c.mat === "flesh" ? FLESH_LIT : STONE_LIT;
    const fillShade = c.mat === "flesh" ? FLESH_SHADE : STONE_SHADE;
    ctx0 = ctx;
    fragC = c; fragThird = third; fragSize = sizePx;
    ctx.globalAlpha = alpha;
    for (let k = 0; k < 3; k++) {
      const fang = c.ang + (k - 1) * 1.1;
      const fx = breakX + Math.cos(fang) * v * 0.5 * fa;
      const fy = breakY + Math.sin(fang) * v * 0.5 * fa + 0.5 * 0.22 * G.H * fa * fa;
      const frot = c.spin * (1.5 + k) * fa;
      fragCs = Math.cos(frot); fragSn = Math.sin(frot);
      fragK = k; fragFx = fx; fragFy = fy;
      litShade(ctx, traceFragment, fx, fillLit, fillShade);
    }
    ctx.globalAlpha = 1;
  }

  /* ---- draw a single chunk (with meld + trade + storm shudder) -------- */
  function drawOneChunk(ctx, i, s) {
    const c = CHUNKS[i];
    const p = chunkAt(i, s);
    if (!p.alive && !(c.mode === "break" && s - c.birth > c.tb)) return;
    let x = p.x, y = p.y, alpha = p.a;
    const off = meldOffset(i, s);
    x += off.x; y += off.y;

    // storm shudder: chunks inside an active air or fire storm jitter
    for (let k = 0; k < STORMS.length; k++) {
      const st = STORMS[k];
      if ((st.type === "air" || st.type === "fire") && inStorm(st, x, y, s)) {
        const e = stormEnv(st, s);
        x += e * 10 * Math.sin(G.t * 40);
      }
    }

    const trs = G.secs("trade");
    if (c.mode !== "break" && trs > 0) {
      // the mass opens where an old one is climbing out
      const vents = window.GenOld && GenOld.activeVents ? GenOld.activeVents(trs) : null;
      if (vents) {
        const R = 0.14 * G.H;
        for (let k = 0; k < vents.length; k++) {
          const v = vents[k], dx = x - v.x, dy = y - v.y, d = Math.hypot(dx, dy);
          if (d > 0.001 && d < R) { const push = (1 - d / R) * 0.06 * G.H * v.k; x += dx / d * push; y += dy / d * push; }
        }
      }
      // the mass crumbles from the outside in as they leave, then goes
      const m = massScale(trs);
      const keep = clamp((m - c.mr * 0.6) / 0.2, 0, 1);
      y += (1 - keep) * 0.05 * G.H;
      alpha *= keep * (1 - smooth(clamp((trs - 9.2) / 0.8, 0, 1)));
    }

    if (x < -c.size - 40 || x > G.W + c.size + 40 || y < -c.size - 40 || y > G.H + c.size + 40) return;
    if (alpha < 0.01) return;

    const rot = p.rot;
    if (c.mode === "break" && s - c.birth > c.tb) {
      drawBreakFragments(ctx, c, i, s, alpha, 1);
    } else {
      drawChunkAt(ctx, c, x, y, rot, alpha, 1);
    }
  }

  /* ---- insects ---------------------------------------------------------- */
  function drawInsects(ctx, s) {
    for (let i = 0; i < INSECTS.length; i++) {
      const ins = INSECTS[i];
      if (s < ins.hatch) continue;
      const parentAge = ins.hatch - CHUNKS[ins.parent].birth;
      const hatchPos = chunkAt(ins.parent, ins.hatch);
      if (!hatchPos.alive) continue; // parent dead at hatch time: never drawn
      const hx = hatchPos.x, hy = hatchPos.y;

      let b = s - ins.hatch;
      // storm death: check position at each storm's start time
      let deathT = ins.hatch + ins.die;
      for (let k = 0; k < STORMS.length; k++) {
        const st = STORMS[k];
        if (st.t <= ins.hatch || st.t >= deathT) continue;
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
      const e = stormEnv(st, s);
      if (e <= 0.02) continue;
      const cx = st.xf * G.W, cy = st.yf * G.H, R = st.Rf * G.W;
      if (st.type === "air") drawAirStorm(ctx, cx, cy, R, s, st, e);
      else if (st.type === "rain") drawRainStorm(ctx, cx, cy, R, st, e);
      else if (st.type === "fire") drawFireStorm(ctx, cx, cy, R, st.tilt, e);
      else drawLightningStorm(ctx, cx, cy, R, s, st, e);
    }
  }

  function drawAirStorm(ctx, cx, cy, R, s, st, e) {
    ctx.strokeStyle = AIR_COLOR;
    ctx.lineWidth = 2;
    let ring0 = 0;
    for (let k = 0; k < 3; k++) {
      const rad = R * (((s - st.t) * 1.6 + k * 0.33) % 1);
      if (k === 0) ring0 = rad;
      ctx.globalAlpha = 0.35 * e;
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, 6.283); ctx.stroke();
    }
    ctx.globalAlpha = 0.35 * e;
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * TAU;
      const x0 = cx + Math.cos(a) * ring0, y0 = cy + Math.sin(a) * ring0;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + Math.cos(a) * 14, y0 + Math.sin(a) * 14);
      ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.lineWidth = 1;
  }

  function drawRainStorm(ctx, cx, cy, R, st, e) {
    ctx.strokeStyle = RAIN_COLOR;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.55 * e;
    const dir = Math.PI / 2 + st.tilt;
    const dx = Math.cos(dir), dy = Math.sin(dir);
    for (let k = 0; k < 70; k++) {
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

  function drawLightningStorm(ctx, cx, cy, R, s, st, e) {
    const strikeTimes = [st.t, st.t + 0.18, st.t + 0.5];
    for (let si = 0; si < 3; si++) {
      const dt = s - strikeTimes[si];
      if (dt < 0 || dt > 0.09) continue;
      const a0 = hash1(si * 100 + 1) * TAU;
      const a1 = a0 + Math.PI;
      const x0 = cx + Math.cos(a0) * R, y0 = cy + Math.sin(a0) * R;
      const x1 = cx + Math.cos(a1) * R, y1 = cy + Math.sin(a1) * R;
      const pts = [];
      for (let k = 0; k <= 8; k++) {
        const u = k / 8;
        const bx = mix(x0, x1, u), by = mix(y0, y1, u);
        const off = (hash1(si * 100 + k) - 0.5) * 2 * R * 0.25;
        const nx = -(y1 - y0), ny = (x1 - x0);
        const nl = Math.hypot(nx, ny) || 1;
        pts.push([bx + (nx / nl) * off, by + (ny / nl) * off]);
      }
      ctx.globalAlpha = 0.5 * e;
      Paint.line(ctx, pts, LIGHT_OUTER, 4);
      ctx.globalAlpha = e;
      Paint.line(ctx, pts, LIGHT_CORE, 1.5);
      ctx.globalAlpha = 0.12 * e;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ---- public draw ------------------------------------------------------- */
  function draw(ctx) {
    if (typeof G.secs !== "function") return;
    if (G.W === 0) return;
    const s = G.secs("matter") + 0.8;
    if (s < 0 || s > 20.6) return;

    drawStormsLayer(ctx, s, false); // air, rain: behind
    for (let i = 0; i < CHUNKS.length; i++) drawOneChunk(ctx, i, s);
    drawInsects(ctx, s);
    drawStormsLayer(ctx, s, true); // fire, lightning: in front

    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
  }

  window.GenMatter = { draw, chunkAt, MASS, massScale };
})();
