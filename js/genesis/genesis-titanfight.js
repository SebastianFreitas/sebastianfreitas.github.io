/* genesis-titanfight.js: the clock of the rock titans' fight in the trade beat. One table of phase times (trade seconds) and at(s), which fills one
   reused object with each phase's 0..1 progress (0 before it, 1 after it). Draws nothing. Loaded before genesis-state.js. */
window.GenTitanFight = (function () {
  const T = {
    close: [0.0, 1.0], raise: [1.0, 2.2], rays: [2.2, 8.6], hurt: [2.4, 8.6], pain: [3.4, 5.4],
    sad: [5.4, 7.0], anger: [7.0, 8.6], lash: [8.6, 11.6], stone: [11.6, 12.4], crack: [12.4, 13.2]
  };
  const BURST = 13.2, ADD = BURST - 1.6;   // ADD: seconds everything that used to follow the old 1.6 s burst now starts later
  const PULSES = 7;   // damage steps, evenly from hurt[0] to the lash
  const SPIN = 25 * Math.PI / 180, RAMP = 0.25, DIE = 0.3;   // the fan's turn (rad/s), its rise and its death (s)
  const out = { pulse: -1, age: 0, burst: 0, ray: 0, spin: 0, cov: 0 };
  Object.keys(T).forEach((k) => { out[k] = 0; });

  function at(s) {
    for (const k in T) { const a = T[k]; out[k] = s <= a[0] ? 0 : s >= a[1] ? 1 : (s - a[0]) / (a[1] - a[0]); }
    const r = T.hurt, len = (r[1] - r[0]) / PULSES;
    if (s < r[0] || s >= r[1]) { out.pulse = -1; out.age = 0; }
    else { out.pulse = Math.min(PULSES - 1, Math.floor((s - r[0]) / len)); out.age = (s - r[0] - out.pulse * len) / len; }
    out.burst = s >= BURST ? 1 : 0;
    // the rays' strength: up fast at the T, held with a slow uneven breathing, down over DIE from the lash
    const r0 = T.rays[0], on = Math.min(1, Math.max(0, (s - r0) / RAMP));
    out.cov = cover(s);
    out.ray = on * on * (3 - 2 * on) * (s >= BURST ? 0 : 1) * (0.82 + 0.18 * Math.sin(s * 1.7) * Math.sin(s * 0.63 + 1));
    out.spin = (s - r0) * SPIN;
    return out;
  }

  // The Hollow's rays: thin grey spikes from (cx, cy) tapering to a point at their far end, a fan that turns steadily and stays on. f is at()'s object. Separate shapes, no wash.
  const RAYS = 20;
  function drawRays(ctx, cx, cy, reach, f) {
    if (f.ray <= 0 || f.cov >= 1) return;   // no rays, or the maw has closed on him
    ctx.save();
    ctx.fillStyle = "#b9bcc0";
    const cov = f.cov;
    // pass 0: the rays still whole, one path; pass 1: the rays the swallow is taking in, each shorter and dimmer
    for (let pass = 0; pass < 2; pass++) {
      ctx.globalAlpha = 0.34 * f.ray;
      ctx.beginPath();
      for (let i = 0; i < RAYS; i++) {
        const h = Math.sin((i + 1) * 12.9898) * 43758.5453, r = h - Math.floor(h);
        const ang = (i + r * 0.5) / RAYS * Math.PI * 2 + f.spin;
        const ca = Math.cos(ang), sa = Math.sin(ang);
        // the swallow takes rays in by direction: the Slime's side (screen right) first at cover 0.1, the far side last at 0.9, each over 0.1 of cover (about 0.25 s)
        const k = (cov - (0.1 + 0.8 * Math.abs(Math.atan2(sa, ca)) / Math.PI)) / 0.1;
        const live = k <= 0 ? 1 : k >= 1 ? 0 : 1 - k * k * (3 - 2 * k);
        if (live <= 0 || (live === 1) !== (pass === 0)) continue;
        const len = reach * (0.6 + 0.4 * r) * live, w = reach * (0.0012 + 0.001 * r);
        if (pass) { ctx.globalAlpha = 0.34 * f.ray * live; ctx.beginPath(); }
        ctx.moveTo(cx - sa * w, cy + ca * w); ctx.lineTo(cx + ca * len, cy + sa * len); ctx.lineTo(cx + sa * w, cy - ca * w);
        ctx.closePath();
        if (pass) ctx.fill();
      }
      if (!pass) ctx.fill();
    }
    ctx.restore();
  }

  // How hurt the Statue and the Slime are, in held steps: one more seventh with each damage step (0 before, 1 once they end).
  function level(f) { return f.pulse >= 0 ? (f.pulse + 1) / PULSES : f.hurt >= 1 ? 1 : 0; }

  function rnd(i, k) { const h = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return h - Math.floor(h); }

  const LIFE = 0.8, TILT = Math.tan(3 * Math.PI / 180), LASH_SPAWNS = 4, SPAWNS = PULSES + LASH_SPAWNS;
  const PO = { x: 0, footY: 0, H: 0, t: 0, pain: 0, sad: 0, anger: 0, lash: 0, hx: 0, probe: [0, 0, 0, 0] };   // reused: the Slime's body probe
  function prog(r, s) { return s <= r[0] ? 0 : s >= r[1] ? 1 : (s - r[0]) / (r[1] - r[0]); }
  // When spawn j breaks (trade secs): the seven damage steps, then four flakes during the lash.
  function spawnAt(j) { return j < PULSES ? T.hurt[0] + j * (T.hurt[1] - T.hurt[0]) / PULSES : T.lash[0] + 0.15 + 0.15 * (j - PULSES); }
  // The pieces a hurt body loses, seen leaving: from each spawn the piece (and two crumbs) falls from the exact spot it broke off, in the body's own tone and the
  // missing piece's size, tumbling and shrunk to nothing in LIFE seconds. The Slime's spot is probed through its own motion at the moment of the break (t is its body
  // clock now, hx the Hollow's x). Pure function of s (trade secs); one path, one fill.
  function drawChips(ctx, s, name, x, footY, H, t, hx) {
    const statue = name === "statue", dir = statue ? -1 : 1, B = window.GenTitanBodies[statue ? "STATUE_BITES" : "SLIME_BITES"];
    let any = false;
    for (let j = 0; j < SPAWNS; j++) {
      const s0 = spawnAt(j), a = s - s0;
      if (a < 0 || a >= LIFE) continue;
      const bi = j < PULSES ? j : (j * 3) % PULSES, b = B[bi], u = a / LIFE, k = u < 0.3 ? 1 : (1 - u) / 0.7;
      let x0, y0, wx, wy;
      if (statue) { const dx = 0.085 - 0.5 * b[2]; x0 = x + (dx + b[0] * TILT) * H; y0 = footY - b[0] * H; wx = 0.5 * b[2] * H * 1.07; wy = 0.5 * b[1] * H * 1.5; }
      else {
        PO.x = x; PO.footY = footY; PO.H = H; PO.t = (t || 0) - a; PO.hx = hx;
        PO.pain = j < PULSES ? prog(T.pain, s0) : 1; PO.sad = j < PULSES ? prog(T.sad, s0) : 1; PO.anger = j < PULSES ? prog(T.anger, s0) : 1; PO.lash = prog(T.lash, s0);
        PO.probe[0] = b[0]; PO.probe[1] = b[1];
        window.GenTitanBodies.slimePoint(PO); x0 = PO.probe[2]; y0 = PO.probe[3]; wx = wy = 0.55 * 1.07 * b[2] * H / 1000;
      }
      if (!any) { ctx.beginPath(); any = true; }
      for (let c = 0; c < 3; c++) {
        const id = j * 8 + c + (statue ? 0 : 100), m = c ? 0.35 + 0.15 * rnd(id, 3) : 1, g = rnd(id, 5) * 6.283 + a * (rnd(id, 4) - 0.5) * (c ? 10 : 5);
        const px = x0 + dir * (c ? 0.25 + 0.4 * rnd(id, 1) : 0.08 + 0.12 * rnd(id, 1)) * H * a, py = y0 - (c ? 0.15 + 0.3 * rnd(id, 2) : 0.05) * H * a + 0.9 * 1.8 * H * a * a;
        const zx = wx * m * k, zy = wy * m * k, cg = Math.cos(g), sg = Math.sin(g);
        if (statue) {
          ctx.moveTo(px + cg * -zx + sg * zy * 0.8, py + sg * -zx - cg * zy * 0.8);
          ctx.lineTo(px + cg * zx + sg * zy, py + sg * zx - cg * zy);
          ctx.lineTo(px + cg * zx * 0.7 - sg * zy, py + sg * zx * 0.7 + cg * zy);
          ctx.lineTo(px + cg * -zx - sg * zy * 0.9, py + sg * -zx + cg * zy * 0.9);
          ctx.closePath();
        } else { ctx.moveTo(px + zx, py); ctx.arc(px, py, zx, 0, 6.283); }
      }
    }
    if (!any) return;
    ctx.fillStyle = statue ? "#2a2e32" : "#26292c";
    ctx.fill();
  }

  /* the warp: from the Slime's landing a few cut pieces of the painted scene round the hit point jump sideways and up and down, each on its own moments.
     Pinch (WARP[0] to BURST), then jumps until WARP[3], the last 0.4 s in quarter steps. 13 pieces of four kinds from a fixed table (PC), none in the bridge's box. */
  const WARP = [BURST - 0.15, BURST, BURST + 0.7, BURST + 1.1], HOLD = 0.5, THIN = 14;   // HOLD: the frozen bodies' life after the burst (s)
  // x, y of the centre from the hit point, w, h, slant (all in H); kind 0 sliver, 1 slab, 2 block, 3 slanted cut; max shift x, y per kind (H)
  const PC = [
    [-0.02, -0.03, 0.30, 0.006, 0, 0], [0.05, 0.06, 0.22, 0.010, 0, 0], [-0.10, -0.14, 0.38, 0.004, 0, 0], [0.12, 0.18, 0.16, 0.008, 0, 0],
    [0.08, -0.04, 0.05, 0.30, 0, 1], [-0.12, 0.07, 0.035, 0.22, 0, 1], [0.24, -0.10, 0.07, 0.18, 0, 1],
    [-0.04, 0.02, 0.06, 0.045, 0, 2], [0.17, 0.04, 0.10, 0.07, 0, 2], [-0.20, -0.06, 0.045, 0.05, 0, 2], [-0.27, 0.15, 0.12, 0.09, 0, 2],
    [0.0, 0.22, 0.20, 0.05, 0.08, 3], [-0.06, -0.24, 0.14, 0.11, -0.10, 3]];
  const MS = [[0.3, 0.01], [0.06, 0.12], [0.1, 0.08], [0.2, 0.04]], NP = PC.length, JN = 4;
  const jt = new Float32Array(NP * JN), jx = new Float32Array(NP * JN), jy = new Float32Array(NP * JN), jc = new Uint8Array(NP), pe = new Float32Array(NP);
  let built = false;
  function build() {   // own start, own jump moments (uneven), own end for each piece
    built = true;
    for (let i = 0; i < NP; i++) {
      const m = MS[PC[i][5]], n = 2 + Math.floor(rnd(i, 21) * 3);
      let t = 0.02 + 0.45 * rnd(i, 22);
      jc[i] = n;
      for (let j = 0; j < n; j++) {
        jt[i * JN + j] = t; t += 0.07 + 0.2 * rnd(i, 23 + j);
        jx[i * JN + j] = (rnd(i, 30 + j) - 0.5) * 2 * m[0]; jy[i * JN + j] = (rnd(i, 40 + j) - 0.5) * 2 * m[1];
      }
      pe[i] = Math.min(WARP[3] - BURST, Math.max(t, 0.55 + 0.5 * rnd(i, 27)));
    }
  }
  let wc = null, wg = null;
  function stepOf(t) {   // which held arrangement the clock is in (-1 before the chaos)
    let r = t - WARP[1], i = 0;
    if (r < 0) return -1;
    while (i < 40) { const d = 0.06 + 0.04 * rnd(i, 9); if (r < d) break; r -= d; i++; }
    return i;
  }
  function edge(d, hp) { const e = Math.max(0, Math.min(1, d / (0.25 * hp))); return e * e * (3 - 2 * e); }   // 0 at a frame edge, 1 a quarter H inside
  function warp(ctx, t, hx, hy, W, H) {
    if (t < WARP[0] || t >= WARP[3] || window.GEN_NOWARP) return;   // GEN_NOWARP: debug switch for the span-untouched check
    const cv = ctx.canvas, pr = cv.width / W, cw = cv.width, ch = cv.height;
    if (!wc) { wc = document.createElement("canvas"); wg = wc.getContext("2d"); }
    if (wc.width !== cw || wc.height !== ch) { wc.width = cw; wc.height = ch; }
    wg.setTransform(1, 0, 0, 1, 0, 0); wg.clearRect(0, 0, cw, ch); wg.drawImage(cv, 0, 0);
    if (!built) build();
    const pinch = t < WARP[1], k = pinch ? (t - WARP[0]) / (WARP[1] - WARP[0]) : 0, r = t - BURST;
    const s = pinch ? 0 : t < WARP[2] ? 1 : Math.floor((WARP[3] - t) / 0.4 * 4) / 4;
    const hxp = hx * pr, hyp = hy * pr, hp = H * pr, yb = Math.floor(0.575 * hp);   // yb: just above the span's box (it starts at 0.58 H): nothing is read from or drawn into it
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.beginPath(); ctx.rect(0, 0, cw, yb); ctx.clip();
    for (let i = 0; i < NP; i++) {
      const c = PC[i], n = jc[i], sk = Math.abs(c[4]) * hp;
      let j = n - 1;
      if (!pinch) { if (r < jt[i * JN] || r >= pe[i]) continue; while (jt[i * JN + j] > r) j--; }
      const bw = Math.max(1, Math.round(c[2] * hp + 2 * sk)), bk = Math.max(1, Math.round(c[3] * hp));
      const px = hxp + c[0] * hp, py = hyp + c[1] * hp;
      const w = edge(Math.min(px - bw / 2, cw - px - bw / 2, py - bk / 2, ch - py - bk / 2), hp);
      let dcx = pinch ? px - c[0] * hp * 0.06 * k * w : px + jx[i * JN + j] * hp * s * w;
      let dcy = pinch ? py : py + jy[i * JN + j] * hp * s * w;
      const lim = 0.4 * hp;   // reach: no piece's edge goes further than 0.4 H from the hit point
      if (lim > bw / 2) dcx = Math.max(hxp - lim + bw / 2, Math.min(hxp + lim - bw / 2, dcx));
      if (lim > bk / 2) dcy = Math.max(hyp - lim + bk / 2, Math.min(hyp + lim - bk / 2, dcy));
      const sx0 = Math.round(px - bw / 2), sy0 = Math.round(py - bk / 2);
      if (sx0 < 0 || sy0 < 0 || sx0 + bw > cw || sy0 + bk > yb) continue;
      const dx0 = Math.round(dcx - bw / 2), dy0 = Math.round(dcy - bk / 2);
      if (sk > 0) {   // the slanted cut: the parallelogram's own shape is the window
        const pw = c[2] * hp / 2, ph = bk / 2, sg = c[4] * hp;
        ctx.save(); ctx.beginPath();
        ctx.moveTo(dcx - pw + sg, dcy - ph); ctx.lineTo(dcx + pw + sg, dcy - ph); ctx.lineTo(dcx + pw - sg, dcy + ph); ctx.lineTo(dcx - pw - sg, dcy + ph);
        ctx.closePath(); ctx.clip();
        ctx.drawImage(wc, sx0, sy0, bw, bk, dx0, dy0, bw, bk);
        ctx.restore();
      } else ctx.drawImage(wc, sx0, sy0, bw, bk, dx0, dy0, bw, bk);
    }
    ctx.restore();
  }
  // the frozen bodies thin out after the burst: a clip of the horizontal bands that survive this jump (fewer each time); the caller saves and restores
  function thin(ctx, t, H) {
    const p = 1 - (t - BURST) / HOLD, st = Math.max(0, stepOf(t)), bh = H / THIN;
    ctx.beginPath();
    for (let b = 0; b < THIN; b++) if (rnd(st * 32 + b, 7) < p) ctx.rect(-5000, b * bh, 10000, bh + 1);
    ctx.clip();
  }

  // how far the Hollow is inside the Slime at trade second s (the swallow): 0 before the maw closes in, 1 once it has closed on him
  function cover(s) { return window.GenTitanBodies.cover(prog(T.lash, s)); }

  function stone(s) { return prog(T.stone, s); }   // 0..1: how far the hardening has travelled from the far arm tip back to the Slime's foot
  function crack(s) { return prog(T.crack, s); }   // 0..1: how far the cracks have spread from the chest point

  // The cracks: a fixed seeded table (same every run), in units of H from the chest point. Main cracks run out in jittered steps and throw short branches.
  // Each segment keeps its distance from the chest at both ends, so the front of the spread (crack 0..1 times CMAX) reveals it by length.
  const CMAIN = 11, CSEGS = 600;
  const CX0 = new Float64Array(CSEGS), CY0 = new Float64Array(CSEGS), CX1 = new Float64Array(CSEGS), CY1 = new Float64Array(CSEGS), CD0 = new Float64Array(CSEGS), CD1 = new Float64Array(CSEGS), CW = new Float64Array(CSEGS);
  let CN = 0, CMAX = 0;
  function crackWalk(x, y, ang, steps, len, w, d, k) {
    for (let i = 0; i < steps && CN < CSEGS; i++) {
      ang += (rnd(k + i, 3) - 0.5) * 0.9;
      const l = len * (0.7 + 0.6 * rnd(k + i, 5)), nx = x + Math.cos(ang) * l, ny = y + Math.sin(ang) * l, nd = d + l;
      CX0[CN] = x; CY0[CN] = y; CX1[CN] = nx; CY1[CN] = ny; CD0[CN] = d; CD1[CN] = nd; CW[CN] = w; CN++;
      if (nd > CMAX) CMAX = nd;
      if (w === 1 && i > 0 && i < steps - 1 && rnd(k + i, 7) < 0.7) crackWalk(nx, ny, ang + (rnd(k + i, 9) < 0.5 ? -1 : 1) * (0.45 + 0.5 * rnd(k + i, 11)), 3, len * 0.55, 0.55, nd, k * 7 + i * 13 + 1);
      x = nx; y = ny; d = nd;
    }
  }
  for (let m = 0; m < CMAIN; m++) crackWalk(0, 0, (m + rnd(m, 1) * 0.6) / CMAIN * Math.PI * 2, 6, 0.14, 1, 0, 100 + m * 20);

  // Draws the cracks onto a layer already holding the stone mass (source-atop: only on the mass). c is the 0..1 spread; the oldest cracks widen from 0.5 and show the
  // Hollow's ray grey inside, brightest at the chest. ctx's transform is in canvas units, H the body height.
  function drawCracks(ctx, cx, cy, H, c) {
    if (c <= 0) return;
    const front = c * CMAX, lit = Math.max(0, (c - 0.5) / 0.5);
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (let pass = 0; pass < 2; pass++) {
      if (pass && lit <= 0) break;
      ctx.strokeStyle = pass ? "#b9bcc0" : "#0b0d0f";
      for (let i = 0; i < CN; i++) {
        const f = Math.min(1, (front - CD0[i]) / (CD1[i] - CD0[i]));
        if (f <= 0) continue;
        const age = Math.max(0, 1 - CD0[i] / (CMAX * 0.7)), extra = lit * age * 0.012 * H * (CW[i] === 1 ? 1 : 0.5);
        const base = (CW[i] === 1 ? 0.005 : 0.003) * H;
        if (pass && extra < 0.0015 * H) continue;
        ctx.globalAlpha = pass ? (0.25 + 0.4 * lit) * (1 - 0.5 * CD0[i] / CMAX) : 1;
        ctx.lineWidth = pass ? extra * 0.6 : base + extra;
        ctx.beginPath();
        ctx.moveTo(cx + CX0[i] * H, cy + CY0[i] * H);
        ctx.lineTo(cx + (CX0[i] + (CX1[i] - CX0[i]) * f) * H, cy + (CY0[i] + (CY1[i] - CY0[i]) * f) * H);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // The pieces: the stone between two neighbouring main cracks (a wedge from the chest point out past both tips), built once from the table above.
  // From the burst each flies out along its own direction in held steps with a small turn; the lit crack value shows in the gaps, narrowing to nothing.
  const SH_STEP = 0.15, SHARD_LIFE = 0.9, SH_D = [0.05, 0.2, 0.45, 0.85, 1.4, 2.1], SH_K = [1, 0.4, 0.15, 0, 0, 0];
  const SHN = CMAIN, SHX = [], SHY = [], SHDX = new Float64Array(SHN), SHDY = new Float64Array(SHN), SHSP = new Float64Array(SHN), SHROT = new Float64Array(SHN);
  {
    const MX = [], MY = [];   // each main crack's end points, in order
    for (let m = 0; m < CMAIN; m++) { MX.push([0]); MY.push([0]); }
    let n = 0;
    for (let i = 0; i < CN; i++) if (CW[i] === 1) { const m = Math.floor(n / 6); if (m < CMAIN) { MX[m].push(CX1[i]); MY[m].push(CY1[i]); } n++; }
    const far = (m) => { const x = MX[m], y = MY[m], k = x.length - 1, dx = x[k] - x[k - 1], dy = y[k] - y[k - 1], l = Math.hypot(dx, dy) || 1; return [x[k] + dx / l * 3, y[k] + dy / l * 3]; };
    for (let m = 0; m < CMAIN; m++) {
      const q = (m + 1) % CMAIN, fa = far(m), fb = far(q), px = MX[m].slice(), py = MY[m].slice();
      px.push(fa[0], fb[0]); py.push(fa[1], fb[1]);
      for (let k = MX[q].length - 1; k >= 1; k--) { px.push(MX[q][k]); py.push(MY[q][k]); }
      SHX.push(Float64Array.from(px)); SHY.push(Float64Array.from(py));
      const ang = Math.atan2(fa[1] + fb[1], fa[0] + fb[0]);
      SHDX[m] = Math.cos(ang); SHDY[m] = Math.sin(ang); SHSP[m] = 0.7 + 0.6 * rnd(m, 41); SHROT[m] = (rnd(m, 43) - 0.5) * 0.5;
    }
  }
  // g's transform is the world transform (as for drawCracks); src is the cracked stone mass painted in device pixels; a is the time since the burst (< SHARD_LIFE).
  function shards(g, src, cx, cy, H, a) {
    const s = Math.min(5, Math.floor(a / SH_STEP + 1e-6)), m = g.getTransform(), sc = m.a, e = m.e, f = m.f, w = g.canvas.width, h = g.canvas.height;
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h);
    g.beginPath(); g.rect(0, 0, w, Math.floor(0.575 * H * w / window.Gen.W)); g.clip();   // never into the span's box (it starts at 0.58 H), as the warp
    const k = SH_K[s];
    if (k > 0) {   // the lit value, in the shape of the mass shrunk toward the chest point: it shows only where the pieces have left
      const ox = sc * cx + e, oy = sc * cy + f;
      g.setTransform(k, 0, 0, k, ox * (1 - k), oy * (1 - k)); g.drawImage(src, 0, 0);
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-atop"; g.fillStyle = "#b9bcc0"; g.fillRect(0, 0, w, h); g.globalCompositeOperation = "source-over";
    }
    for (let p = 0; p < SHN; p++) {
      const d = SH_D[s] * SHSP[p] * H, dx = SHDX[p] * d, dy = SHDY[p] * d, r = SHROT[p] * s / 5, qx = cx + SHDX[p] * 0.45 * H, qy = cy + SHDY[p] * 0.45 * H, X = SHX[p], Y = SHY[p];
      g.save();
      g.setTransform(sc, 0, 0, sc, e, f); g.translate(qx + dx, qy + dy); g.rotate(r); g.translate(-qx, -qy);
      g.beginPath(); g.moveTo(cx + X[0] * H, cy + Y[0] * H);
      for (let i = 1; i < X.length; i++) g.lineTo(cx + X[i] * H, cy + Y[i] * H);
      g.closePath(); g.clip();
      g.setTransform(1, 0, 0, 1, 0, 0); g.translate(sc * qx + e + sc * dx, sc * qy + f + sc * dy); g.rotate(r); g.translate(-(sc * qx + e), -(sc * qy + f));
      g.drawImage(src, 0, 0);
      g.restore();
    }
    g.restore();
  }

  return { T, BURST, ADD, PULSES, HOLD, SHARD_LIFE, at, drawRays, level, rnd, drawChips, warp, thin, cover, stone, crack, drawCracks, shards };
})();
