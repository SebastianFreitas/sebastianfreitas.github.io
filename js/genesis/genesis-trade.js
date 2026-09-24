/* genesis-trade.js — wave 3: minds trading pieces of each other. Blobs of
   flesh and stone break out of the mass, steal and gift scraps that don't
   belong to them, some die, some pair up and help — then the old ones rise
   from exactly these spots. Also runs the travelling stream: the constant
   trickle east (and west, out of the record) that carries this wreckage
   along with everything else, from here through the walk. Screen-space. */
window.GenTrade = (function () {
  const G = window.Gen;
  const { clamp, mix, smooth, hash1, mulberry } = Util;
  const { litShade, poly, circle, line } = Paint;
  const sx = G.sx;
  const TAU = Math.PI * 2;

  const PAL = [
    ["#b0525c", "#6e2a33"], // flesh
    ["#7a4a7e", "#44264a"], // bruise
    ["#d8ccb0", "#9a8c70"], // bone
    ["#8d918c", "#4b4f4c"], // stone
    ["#5a5d5a", "#2e302e"], // dark stone
    ["#8a9a6a", "#4f5a3a"], // sick
  ];
  const BODIES = ["wet", "pointy", "rect", "fat", "thin", "many", "one"];
  const PKINDS = ["bead", "spike", "chip", "hole", "eye", "frond"];
  const HL_WET = "rgba(255,255,255,0.55)";
  const HL_DOT = "rgba(255,255,255,0.8)";
  const BEAD_WET = "#d27a7f";
  const CHIP = "#8d918c";
  const HOLE = "#0d1114";
  const EYE_WHITE = "#e8e4d8";

  /* ---- roster: spots the old ones will rise from -------------------- */
  const rnd = mulberry(9301);
  const SPOTS = [];
  for (let i = 0; i < 24; i++) {
    const dx = -0.42 + 0.84 * (((i * 7) % 24) + 0.2 + rnd() * 0.6) / 24;
    const yf = 0.30 + rnd() * 0.32;
    SPOTS.push([dx, yf]);
  }

  /* ---- blobs: 24 survivors (home = SPOTS[i]) + 12 that die ----------- */
  const BLOBS = [];
  for (let i = 0; i < 36; i++) {
    if (i < 24) {
      BLOBS.push({ i, home: SPOTS[i], die: Infinity });
    } else {
      const dx = (rnd() - 0.5) * 0.84;
      const yf = 0.28 + rnd() * 0.36;
      const die = 3.5 + rnd() * 3.7;
      BLOBS.push({ i, home: [dx, yf], die });
    }
  }
  for (let i = 0; i < 36; i++) {
    const b = BLOBS[i];
    b.body = BODIES[i % 7];
    b.rr = 0.018 + rnd() * 0.03;             // fraction of H
    if (b.body === "fat") b.rr *= 1.4;
    if (b.body === "one") b.rr *= 0.35;
    b.pal = Math.floor(rnd() * 6);
    b.rot = rnd() * TAU;
    b.aspect = 0.25 + rnd() * 2.5;
    b.n = 5 + Math.floor(rnd() * 4);
    b.seed = Math.floor(rnd() * 1e6);
    b.massDx = (rnd() - 0.5) * 0.12;          // fraction of H, offset within the mass
    b.massDy = (rnd() - 0.5) * 0.12;
  }

  // nearest other blob by home position, for the eye piece's gaze
  const NEAREST = new Int8Array(36);
  for (let i = 0; i < 36; i++) {
    let best = i === 0 ? 1 : 0, bestD = Infinity;
    for (let j = 0; j < 36; j++) {
      if (j === i) continue;
      const d = Math.hypot(BLOBS[i].home[0] - BLOBS[j].home[0], BLOBS[i].home[1] - BLOBS[j].home[1]);
      if (d < bestD) { bestD = d; best = j; }
    }
    NEAREST[i] = best;
  }

  /* ---- pieces: 2-4 per blob, patchwork, no shape sense --------------- */
  const PIECES = [];
  BLOBS.forEach(b => {
    const count = 2 + Math.floor(rnd() * 3);
    for (let k = 0; k < count; k++) {
      const kind = PKINDS[Math.floor(rnd() * 6)];
      const ang = rnd() * TAU;
      const size = b.rr * (0.25 + rnd() * 0.3);
      PIECES.push({ owner: b.i, kind, ang, size, events: [] });
    }
  });

  /* ---- events: simulate ownership in time order ---------------------- */
  const erand = mulberry(9302);
  function isAlive(bi, t) { return bi < 24 || BLOBS[bi].die > t; }

  const slots = [];
  for (let k = 0; k < 44; k++) slots.push({ t: 2.6 + 4.0 * (k + erand() * 0.8) / 44, kind: "trade" });
  for (let k = 0; k < 10; k++) slots.push({ t: 2.4 + erand() * 4.6, kind: "attack" });
  slots.sort((a, c) => a.t - c.t);

  const pieceOwner = PIECES.map(p => p.owner);
  const EVENTS = [];
  slots.forEach(slot => {
    const t = slot.t;
    if (slot.kind === "trade") {
      const fromCands = [];
      for (let i = 0; i < 36; i++) if (isAlive(i, t) && pieceOwner.indexOf(i) !== -1) fromCands.push(i);
      if (!fromCands.length) return;
      const from = fromCands[Math.floor(erand() * fromCands.length)];
      const toCands = [];
      for (let i = 0; i < 36; i++) if (i !== from && isAlive(i, t + 0.6)) toCands.push(i);
      if (!toCands.length) return;
      const to = toCands[Math.floor(erand() * toCands.length)];
      const fromPieces = [];
      pieceOwner.forEach((o, idx) => { if (o === from) fromPieces.push(idx); });
      if (!fromPieces.length) return;
      const piece = fromPieces[Math.floor(erand() * fromPieces.length)];
      let type = erand() < 0.6 ? "steal" : "give";
      if (type === "give") {
        const toPieces = [];
        pieceOwner.forEach((o, idx) => { if (o === to) toPieces.push(idx); });
        if (toPieces.length) {
          const piece2 = toPieces[Math.floor(erand() * toPieces.length)];
          const angTo1 = erand() * TAU, angTo2 = erand() * TAU;
          EVENTS.push({ t, piece, from, to, type, angTo: angTo1 });
          EVENTS.push({ t, piece: piece2, from: to, to: from, type, angTo: angTo2 });
          pieceOwner[piece] = to; pieceOwner[piece2] = from;
          return;
        }
        type = "steal";
      }
      const angTo = erand() * TAU;
      EVENTS.push({ t, piece, from, to, type, angTo });
      pieceOwner[piece] = to;
    } else {
      const living = [];
      for (let i = 0; i < 36; i++) if (isAlive(i, t)) living.push(i);
      if (!living.length) return;
      const blob = living[Math.floor(erand() * living.length)];
      const owned = [];
      pieceOwner.forEach((o, idx) => { if (o === blob) owned.push(idx); });
      const piece = owned.length ? owned[Math.floor(erand() * owned.length)] : -1;
      if (piece >= 0) pieceOwner[piece] = -1;
      EVENTS.push({ t, blob, piece, type: "attack" });
    }
  });
  const ATTACKS = EVENTS.filter(e => e.type === "attack");
  PIECES.forEach((p, idx) => {
    p.events = EVENTS.filter(e => e.piece === idx).sort((a, b) => a.t - b.t);
  });

  /* ---- helping pairs: survivors, nearest unused where possible -------- */
  const HELP = [];
  (function () {
    const used = new Array(24).fill(false);
    for (let n = 0; n < 8; n++) {
      const avail = [];
      for (let i = 0; i < 24; i++) if (!used[i]) avail.push(i);
      if (avail.length < 2) break;
      const a = avail[Math.floor(erand() * avail.length)];
      used[a] = true;
      let best = -1, bestD = Infinity;
      for (let i = 0; i < 24; i++) {
        if (used[i]) continue;
        const d = Math.abs(SPOTS[i][0] - SPOTS[a][0]);
        if (d < bestD) { bestD = d; best = i; }
      }
      if (best === -1) break;
      let b = best;
      if (bestD > 0.25) {
        const remain = [];
        for (let i = 0; i < 24; i++) if (!used[i]) remain.push(i);
        b = remain[Math.floor(erand() * remain.length)];
      }
      used[b] = true;
      HELP.push([a, b]);
    }
  })();

  /* ---- flat-shading helpers, split at ~40% from the left ------------- */
  function circleSplit(ctx, x, y, r, lit, shade) {
    if (r * 2 < 8) { circle(ctx, x, y, r, lit); return; }
    litShade(ctx, () => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }, x - 0.2 * r, lit, shade);
  }
  function ellipseSplit(ctx, x, y, rx, ry, lit, shade) {
    litShade(ctx, () => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); }, x - 0.2 * Math.max(rx, ry), lit, shade);
  }
  function polySplit(ctx, pts, lit, shade) {
    let lo = Infinity, hi = -Infinity;
    for (const p of pts) { if (p[0] < lo) lo = p[0]; if (p[0] > hi) hi = p[0]; }
    if (hi - lo < 8) { poly(ctx, pts); ctx.fillStyle = lit; ctx.fill(); return; }
    litShade(ctx, () => poly(ctx, pts), lo + 0.4 * (hi - lo), lit, shade);
  }

  /* ---- per-frame scratch state, reused: no per-frame allocation ------ */
  const N = PIECES.length;
  const P_OWNER = new Int16Array(N);
  const P_ANG = new Float64Array(N);
  const P_STATE = new Uint8Array(N);   // 0 attached, 1 flight, 2 lost-attack, 3 lost-death
  const P_LOSTT = new Float64Array(N);
  const BUCKETS = [];
  for (let i = 0; i < 36; i++) BUCKETS.push([]);
  const BX = new Float64Array(36), BY = new Float64Array(36);
  const BSCALE = new Float64Array(36), BALPHA = new Float64Array(36);

  function computeStates(s) {
    for (const bucket of BUCKETS) bucket.length = 0;
    for (let idx = 0; idx < N; idx++) {
      const p = PIECES[idx];
      let owner = p.owner, ang = p.ang, lastEvent = null;
      for (const e of p.events) {
        if (e.t > s) break;
        lastEvent = e;
        if (e.type === "attack") owner = -1;
        else { owner = e.to; ang = e.angTo; }
      }
      let state = 0, lostT = 0;
      if (lastEvent && lastEvent.type !== "attack" && s < lastEvent.t + 0.6) {
        state = 1;
      } else if (owner === -1) {
        state = 2; lostT = lastEvent ? lastEvent.t : 0;
      } else if (BLOBS[owner].die <= s) {
        state = 3; lostT = BLOBS[owner].die;
      }
      P_OWNER[idx] = owner; P_ANG[idx] = ang; P_STATE[idx] = state; P_LOSTT[idx] = lostT;
      if (state === 0) BUCKETS[owner].push(idx);
    }
  }

  function computePositions(s, W, H) {
    for (let i = 0; i < 36; i++) {
      const b = BLOBS[i];
      const massX = sx(0) + b.massDx * H, massY = 0.47 * H + b.massDy * H;
      const homeX = sx(0) + b.home[0] * W, homeY = b.home[1] * H;
      let x, y, scale = 1, alpha = 1;
      if (s < 1.6) {
        scale = mix(0.3, 1, clamp((s - 0.9) / 0.7, 0, 1));
        x = massX; y = massY;
      } else if (s < 2.6) {
        const k = smooth(clamp((s - 1.6) / 1.0, 0, 1));
        const dx0 = homeX - massX, dy0 = homeY - massY;
        const dl = Math.hypot(dx0, dy0) || 1;
        const ov = Math.sin(k * Math.PI) * 0.04 * H;
        x = mix(massX, homeX, k) + (dx0 / dl) * ov;
        y = mix(massY, homeY, k) + (dy0 / dl) * ov;
      } else {
        x = homeX; y = homeY;
      }
      if (s >= 1.6) {
        const amp = s < 6.5 ? 5 : mix(5, 1, clamp((s - 6.5) / 1.5, 0, 1));
        const ph = G.t * (5 + i % 3) + i;
        x += amp * Math.sin(ph);
        y += amp * Math.sin(ph + 1.7) * 0.6;
      }
      for (const e of ATTACKS) {
        if (e.blob !== i) continue;
        const dt = s - e.t;
        if (dt >= 0 && dt < 0.12) x += (dt < 0.06 ? 1 : -1) * 6;
      }
      if (i < 24) {
        alpha = 1 - smooth(clamp((s - 7.0) / 1.6, 0, 1));
      } else if (s >= b.die) {
        const dt = (s - b.die) / 0.8;
        scale *= Math.max(0, 1 - dt);
        alpha = Math.max(0, 1 - dt);
      }
      BX[i] = x; BY[i] = y; BSCALE[i] = scale; BALPHA[i] = alpha;
    }
    if (s >= 6.6) {
      const k = smooth(clamp((s - 6.6) / 1.2, 0, 1)) * 0.2;
      for (const [a, b] of HELP) {
        const ax = BX[a], ay = BY[a], bx = BX[b], by = BY[b];
        BX[a] = mix(ax, bx, k); BY[a] = mix(ay, by, k);
        BX[b] = mix(bx, ax, k); BY[b] = mix(by, ay, k);
      }
    }
  }

  function pieceColor(pc) {
    switch (pc.kind) {
      case "bead": return BEAD_WET;
      case "chip": return CHIP;
      case "hole": return HOLE;
      case "eye": return EYE_WHITE;
      default: return PAL[BLOBS[pc.owner].pal][0];
    }
  }

  function drawPieceAt(ctx, idx, cx, cy, ang, R, alpha) {
    const pc = PIECES[idx];
    const px = cx + Math.cos(ang) * R, py = cy + Math.sin(ang) * R;
    ctx.globalAlpha = alpha;
    switch (pc.kind) {
      case "bead":
        circle(ctx, px, py, pc.size, BEAD_WET);
        circle(ctx, px - pc.size * 0.3, py - pc.size * 0.3, pc.size * 0.3, HL_DOT);
        break;
      case "spike": {
        const origLit = PAL[BLOBS[pc.owner].pal][0];
        const perp = ang + Math.PI / 2, w = pc.size * 0.35;
        const tipx = cx + Math.cos(ang) * (R + pc.size), tipy = cy + Math.sin(ang) * (R + pc.size);
        poly(ctx, [[px + Math.cos(perp) * w, py + Math.sin(perp) * w], [tipx, tipy], [px - Math.cos(perp) * w, py - Math.sin(perp) * w]]);
        ctx.fillStyle = origLit; ctx.fill();
        break;
      }
      case "chip": circle(ctx, px, py, pc.size, CHIP); break;
      case "hole": circle(ctx, px, py, pc.size * 0.7, HOLE); break;
      case "eye": {
        circle(ctx, px, py, pc.size, EYE_WHITE);
        const nb = NEAREST[pc.owner];
        const nx = sx(0) + BLOBS[nb].home[0] * G.W, ny = BLOBS[nb].home[1] * G.H;
        const dir = Math.atan2(ny - py, nx - px);
        circle(ctx, px + Math.cos(dir) * pc.size * 0.4, py + Math.sin(dir) * pc.size * 0.4, pc.size * 0.45, HOLE);
        break;
      }
      case "frond": {
        const origLit = PAL[BLOBS[pc.owner].pal][0];
        const bend = Math.sin(G.t * 1.2 + pc.ang) * pc.size * 0.5;
        const ex = px + Math.cos(ang) * pc.size * 1.4, ey = py + Math.sin(ang) * pc.size * 1.4 - bend;
        line(ctx, [[cx, cy], [px, py], [ex, ey]], origLit, 1.2);
        break;
      }
    }
    ctx.globalAlpha = alpha;
  }

  /* h = height fraction *H already applied by caller (rr in px) */
  function drawBlob(ctx, i, x, y, scale, alpha) {
    const b = BLOBS[i];
    const rr = b.rr * G.H * scale;
    if (rr < 0.3 && b.body !== "thin") return;
    const [lit, shade] = PAL[b.pal];
    ctx.globalAlpha = alpha;
    let R = rr;
    switch (b.body) {
      case "wet": {
        circleSplit(ctx, x, y, rr, lit, shade);
        ctx.fillStyle = HL_WET;
        ctx.beginPath(); ctx.ellipse(x - 0.35 * rr, y - 0.4 * rr, 0.25 * rr, 0.13 * rr, 0, 0, TAU); ctx.fill();
        const dy = 0.6 * rr + Math.sin(G.t * 1.5 + b.seed) * 0.2 * rr;
        circle(ctx, x, y + dy, 0.18 * rr, lit);
        break;
      }
      case "pointy": {
        const n2 = b.n * 2, pts = [];
        for (let k = 0; k < n2; k++) {
          const a = (k / n2) * TAU;
          const outer = k % 2 === 0;
          const rad = outer ? rr * (0.9 + hash1(b.seed + k) * 0.5) : rr * 0.45;
          pts.push([x + Math.cos(a) * rad, y + Math.sin(a) * rad]);
        }
        polySplit(ctx, pts, lit, shade);
        R = rr * 1.1;
        break;
      }
      case "rect": {
        const w = 1.6 * rr * Math.sqrt(b.aspect), h = 1.6 * rr / Math.sqrt(b.aspect);
        const rot = b.rot + Math.sin(G.t * 0.4 + b.seed) * 0.1;
        const hw = w / 2, hh = h / 2;
        const corners = [[-hw, -hh], [hw, -hh], [hw, hh * 0.4], [hw * 0.4, hh], [-hw, hh]];
        const cos = Math.cos(rot), sin = Math.sin(rot);
        const pts = corners.map(([cx, cy]) => [x + cx * cos - cy * sin, y + cx * sin + cy * cos]);
        polySplit(ctx, pts, lit, shade);
        R = Math.max(hw, hh) * 0.8;
        break;
      }
      case "fat": {
        const breathe = 1 + 0.05 * Math.sin(G.t * 2 + b.seed);
        ellipseSplit(ctx, x, y, 1.4 * rr * breathe, 1.0 * rr * breathe, lit, shade);
        R = 1.2 * rr;
        break;
      }
      case "thin": {
        const len = 2.6 * rr, thick = Math.max(1.5, 0.12 * rr);
        const bend = Math.sin(G.t * 0.8 + b.seed) * rr * 0.2;
        const cos = Math.cos(b.rot), sin = Math.sin(b.rot);
        const pts = [];
        for (let k = 0; k <= 2; k++) {
          const t = k / 2 - 0.5;
          const lx = t * len, ly = k === 1 ? bend : 0;
          pts.push([x + lx * cos - ly * sin, y + lx * sin + ly * cos]);
        }
        line(ctx, pts, lit, thick);
        R = len * 0.4;
        break;
      }
      case "many": {
        for (let k = 0; k < b.n; k++) {
          const ang = G.t * 0.6 + hash1(b.seed + k) * TAU;
          const dist = hash1(b.seed + k + 50) * rr;
          circleSplit(ctx, x + Math.cos(ang) * dist, y + Math.sin(ang) * dist, 0.32 * rr, lit, shade);
        }
        R = rr;
        break;
      }
      case "one": {
        circle(ctx, x, y, 0.35 * rr, lit);
        ctx.globalAlpha = alpha * 0.5;
        ctx.beginPath(); ctx.arc(x, y, 1.2 * rr, 0, TAU);
        ctx.strokeStyle = lit; ctx.lineWidth = 1; ctx.stroke();
        ctx.globalAlpha = alpha;
        R = rr;
        break;
      }
    }
    const bucket = BUCKETS[i];
    for (let k = 0; k < bucket.length; k++) drawPieceAt(ctx, bucket[k], x, y, P_ANG[bucket[k]], R, alpha);
    ctx.globalAlpha = 1;
  }

  function drawJag(ctx, x, yBottom, yTop, color, width) {
    const pts = [];
    for (let k = 0; k <= 5; k++) {
      const t = k / 5;
      const yy = mix(yTop, yBottom, t);
      const xx = x + (hash1(k * 97 + Math.floor(yy)) - 0.5) * 14;
      pts.push([xx, yy]);
    }
    line(ctx, pts, color, width);
  }

  function drawFight(ctx, s) {
    for (let idx = 0; idx < N; idx++) {
      const pc = PIECES[idx];
      const state = P_STATE[idx];
      if (state === 1) {
        let e = null;
        for (const ev of pc.events) if (ev.t <= s && s < ev.t + 0.6) { e = ev; break; }
        if (!e) continue;
        const p = smooth(clamp((s - e.t) / 0.6, 0, 1));
        const fx = BX[e.from], fy = BY[e.from], tx = BX[e.to], ty = BY[e.to];
        const ax = mix(fx, tx, p), ay = mix(fy, ty, p) - Math.sin(p * Math.PI) * 0.06 * G.H;
        if (e.type === "steal") {
          ctx.globalAlpha = 0.6 * (1 - p);
          line(ctx, [[fx, fy], [ax, ay]], "#c0303a", 1);
          for (let d = 0; d < 3; d++) {
            const dp = p - d * 0.15;
            if (dp <= 0 || dp >= 1) continue;
            const dy = dp * dp * 0.2 * G.H;
            ctx.globalAlpha = (1 - dp) * 0.8;
            circle(ctx, fx, fy + dy, 1.4, "#6e2a33");
          }
        } else {
          ctx.globalAlpha = 0.45 * Math.sin(p * Math.PI);
          line(ctx, [[fx, fy], [tx, ty]], "#f5d06b", 1);
        }
        ctx.globalAlpha = 1;
        circle(ctx, ax, ay, pc.size, pieceColor(pc));
      } else if (state === 2) {
        const dt = s - P_LOSTT[idx];
        if (dt < 0 || dt > 1.2) continue;
        const ownerB = BLOBS[pc.owner];
        const ox = sx(0) + ownerB.home[0] * G.W, oy = ownerB.home[1] * G.H;
        const px = ox + Math.cos(pc.ang) * ownerB.rr * G.H;
        const py = oy + Math.sin(pc.ang) * ownerB.rr * G.H + dt * dt * 0.25 * G.H;
        ctx.globalAlpha = 1 - dt / 1.2;
        ctx.save(); ctx.translate(px, py); ctx.rotate(dt * 8);
        circle(ctx, 0, 0, pc.size, pieceColor(pc));
        ctx.restore();
        ctx.globalAlpha = 1;
      } else if (state === 3) {
        const dt = s - P_LOSTT[idx];
        if (dt < 0 || dt > 1.0) continue;
        const ownerB = BLOBS[pc.owner];
        const ox = sx(0) + ownerB.home[0] * G.W, oy = ownerB.home[1] * G.H;
        const k = smooth(clamp(dt / 1.0, 0, 1));
        ctx.globalAlpha = 1 - k;
        circle(ctx, ox + Math.cos(pc.ang) * 40 * k, oy + Math.sin(pc.ang) * 40 * k, pc.size, pieceColor(pc));
        ctx.globalAlpha = 1;
      }
    }
    for (const e of ATTACKS) {
      const dt = s - e.t;
      if (dt < 0 || dt > 0.12) continue;
      const bx = BX[e.blob], by = BY[e.blob], topY = by - 0.25 * G.H;
      const a2 = 1 - dt / 0.12;
      ctx.globalAlpha = 0.5 * a2;
      drawJag(ctx, bx, by, topY, "#9b7cff", 3.5);
      ctx.globalAlpha = a2;
      drawJag(ctx, bx, by, topY, "#f4f0ff", 1.5);
    }
    ctx.globalAlpha = 1;
  }

  function drawHelpBeads(ctx, s) {
    if (s < 6.6) return;
    const fade = 1 - smooth(clamp((s - 7.0) / 1.6, 0, 1));
    if (fade < 0.02) return;
    for (const [a, b] of HELP) {
      const mx = (BX[a] + BX[b]) / 2, my = (BY[a] + BY[b]) / 2;
      const avgRR = (BLOBS[a].rr + BLOBS[b].rr) / 2 * G.H;
      ctx.globalAlpha = fade;
      line(ctx, [[BX[a], BY[a]], [mx, my]], PAL[BLOBS[a].pal][0], 1.2);
      line(ctx, [[BX[b], BY[b]], [mx, my]], PAL[BLOBS[b].pal][0], 1.2);
      circle(ctx, mx, my, 0.3 * avgRR, "#d8ccb0");
    }
    ctx.globalAlpha = 1;
  }

  function draw(ctx) {
    if (typeof G.secs !== "function") return;
    const s = G.secs("trade");
    if (s < 0.9 || s > 10.2) return;
    const W = G.W, H = G.H;
    if (W === 0) return;
    computeStates(s);
    computePositions(s, W, H);
    for (let i = 0; i < 36; i++) {
      if (BALPHA[i] < 0.02) continue;
      drawBlob(ctx, i, BX[i], BY[i], BSCALE[i], BALPHA[i]);
    }
    drawFight(ctx, s);
    drawHelpBeads(ctx, s);
    ctx.globalAlpha = 1; ctx.lineWidth = 1;
  }

  /* ---- the travelling stream: 120 shapes moving east or west --------- */
  const TRAV_TYPES = ["blob", "stone", "flesh", "insect", "colour", "dust"];
  const HUES = ["230,70,60", "70,130,255", "120,214,96", "236,92,150", "245,208,107", "140,70,210"];
  const trnd = mulberry(9303);
  const TRAV = [];
  for (let i = 0; i < 120; i++) {
    const type = TRAV_TYPES[Math.floor(trnd() * 6)];
    const east = trnd() < 0.62;
    const u0 = (trnd() - 0.5) * 0.7;
    const delay = trnd() * 3.2;
    const gait = 0.75 + trnd() * 0.5;
    const isAir = type === "insect" || type === "colour" || type === "dust";
    const air = isAir ? 0.05 + trnd() * 0.28 : trnd() * 0.02;
    const size = 2.5 + trnd() * 6;
    const ph = trnd() * TAU;
    const hueA = Math.floor(trnd() * 6), hueB = Math.floor(trnd() * 6);
    const pal = Math.floor(trnd() * 6);
    const endOff = trnd() * 0.35;
    TRAV.push({ type, east, u0, delay, gait, air, size, ph, hueA, hueB, pal, endOff });
  }

  function drawTraveller(ctx, tv, x, y, alpha) {
    ctx.globalAlpha = alpha;
    const bob = tv.air < 0.03 ? Math.abs(Math.sin(G.t * 6 * tv.gait + tv.ph)) * 2 : 0;
    const yy = y - bob;
    switch (tv.type) {
      case "blob": {
        const [lit, shade] = PAL[tv.pal];
        circleSplit(ctx, x, yy, tv.size, lit, shade);
        circle(ctx, x - tv.size * 0.3, yy - tv.size * 0.3, tv.size * 0.2, HL_DOT);
        break;
      }
      case "stone": {
        const [lit, shade] = PAL[3];
        const pts = [];
        for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; pts.push([x + Math.cos(a) * tv.size, yy + Math.sin(a) * tv.size]); }
        polySplit(ctx, pts, lit, shade);
        break;
      }
      case "flesh": {
        const [lit, shade] = PAL[0];
        const pts = [];
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * TAU;
          const r = tv.size * (0.8 + hash1(k * 13 + 1) * 0.4);
          pts.push([x + Math.cos(a) * r, yy + Math.sin(a) * r]);
        }
        polySplit(ctx, pts, lit, shade);
        break;
      }
      case "insect": {
        const flap = Math.abs(Math.sin(G.t * 38 + tv.ph));
        ctx.globalAlpha = alpha * 0.5; ctx.fillStyle = "#cfd6d3";
        ctx.beginPath(); ctx.ellipse(x - tv.size * 0.3, yy - tv.size * 0.3 * flap, tv.size * 0.5, tv.size * 0.2, 0.3, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x + tv.size * 0.3, yy - tv.size * 0.3 * flap, tv.size * 0.5, tv.size * 0.2, -0.3, 0, TAU); ctx.fill();
        ctx.globalAlpha = alpha; ctx.fillStyle = "#2a2622";
        ctx.beginPath(); ctx.ellipse(x, yy, tv.size * 0.4, tv.size * 0.2, 0, 0, TAU); ctx.fill();
        break;
      }
      case "colour": {
        const period = 0.6 + (tv.ph % 1);
        const hi = ((G.t + tv.ph) % (period * 2)) < period ? tv.hueA : tv.hueB;
        circle(ctx, x, yy, tv.size * 0.5, `rgb(${HUES[hi]})`);
        break;
      }
      case "dust": {
        for (let k = 0; k < 3; k++) {
          const a = tv.ph + k * 2.1;
          circle(ctx, x + Math.cos(a) * tv.size * 0.4, yy + Math.sin(a) * tv.size * 0.4, 1, "#b9b2a3");
        }
        break;
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawStream(ctx) {
    if (typeof G.secs !== "function") return;
    const base = G.secs("trade");
    if (base < 7.2) return;
    const swarmSince = G.since ? G.since("swarm") : 0;
    if (swarmSince >= 1) return;
    const landSince = G.since ? G.since("land") : 0;
    const W = G.W, H = G.H;
    if (W === 0) return;
    for (const tv of TRAV) {
      const tsince = base - 7.2 - tv.delay;
      if (tsince < 0) continue;
      const f = smooth(clamp(tsince / (10.0 - 7.2 + 7.0), 0, 1));
      const u = tv.east
        ? mix(tv.u0, G.ROOT_U - 0.12 - tv.endOff, clamp(f * (0.8 + 0.3 * tv.gait), 0, 1))
        : tv.u0 - f * (1.6 + 1.1 * tv.gait);
      const x = sx(u);
      if (x < -20 || x > W + 20) continue;
      const y = G.DECK * H - 3 - tv.air * H + Math.sin(G.t * 2 + tv.ph) * (tv.air > 0.03 ? 6 : 1.5);
      const alpha = Math.min(1, tsince / 0.6) * (1 - swarmSince) * (1 - landSince);
      if (alpha < 0.02) continue;
      drawTraveller(ctx, tv, x, y, alpha);
    }
    ctx.globalAlpha = 1; ctx.lineWidth = 1;
  }

  return { SPOTS, draw, drawStream };
})();
