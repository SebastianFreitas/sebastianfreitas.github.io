/* genesis-tier3.js — tier 3, the sky shadows: four huge, flat, near-background
   shapes cut by the top edge of the screen, drawn right after the background
   fill of the genesis cutscene. Poses per beat with held-step motion (drift,
   lurch, enter, fade, pass, level); reduced motion holds every pose. */
window.GenTier3 = (function () {
  const G = window.Gen;
  const BG = "#0d1114";

  const CHORD = { x: 0.5, d: 0.24, rx: 1.3, s: 2 };
  const SLIVER_R = (s) => ({ x: 1.25, d: 0.13, rx: 0.6, s });
  const SLIVER_L = (s) => ({ x: -0.25, d: 0.13, rx: 0.6, s });
  const LINTEL = { y: 0.12, tilt: 0.015, s: 1 };
  const ARC = { cx: -0.2, cy: -0.55, r: 0.85, s: 1 };

  const GAPS = [0.035, 0.05, 0.03, 0.045, 0.06, 0.04, 0.035, 0.05];
  const LENS = [1, 0.82, 0.94, 0.7, 0.88, 0.76, 0.97, 0.8, 0.9];

  const POSE = {
    point: { brim: { ...CHORD, mv: { m: "drift", v: -1 } } },
    drawn: { brim: { ...CHORD, mv: { m: "drift", v: -1 } } },
    break: { brim: { ...CHORD, mv: { m: "lurch", at: 2.0, ox: 0.03 } } },
    elements: { brim: { ...SLIVER_R(1), mv: { m: "drift", v: -1 } } },
    matter: {
      brim: { ...SLIVER_R(1), mv: { m: "drift", v: -1 } },
      comb: { x: 0.02, dir: 1, n: 3, len: 0.18, s: 1, t0: 4, mv: { m: "enter", at: 4, gap: 0.5, ox: -0.12, oy: 0 } },
    },
    trade: { brim: { ...SLIVER_R(0), mv: { m: "fade", at: 1.0, gap: 2.0 } } },
    walk: { comb: { x: 0.35, dir: 1, n: 7, len: 0.22, s: 2, mv: { m: "pass", from: -0.2, to: 0.7 } } },
    land: { brim: { ...SLIVER_R(0), mv: { m: "drift", v: -1 } } },
    gods: { brim: { ...SLIVER_R(0), mv: { m: "drift", v: -1 } } },
    calm: { brim: { ...SLIVER_R(0), mv: { m: "drift", v: -1 } } },
    flee: {
      brim: { ...CHORD, mv: { m: "drift", v: -1 } },
      comb: { x: 0.6, dir: 1, n: 6, len: 0.2, s: 1, mv: { m: "pass", from: 0.45, to: -0.95 } },
    },
    war: { brim: SLIVER_R(0) },
    stalemate: { brim: SLIVER_L(0) },
    firstlock: { brim: SLIVER_R(1) },
    cadmus: { brim: SLIVER_L(0) },
    aelius: { brim: SLIVER_R(0) },
    velindra: { brim: SLIVER_L(1) },
    four: { brim: SLIVER_R(0) },
    fifth: { brim: SLIVER_L(0) },
    fall: { brim: { ...SLIVER_R(1), mv: { m: "lurch", at: 3.0, ox: -0.03 } } },
  };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function currentPose() {
    if (!G || !G.BEATS || G.beat == null) return null;
    const b = G.BEATS[G.beat];
    if (!b) return null;
    return POSE[b.id] || null;
  }

  function motion(p, W, H) {
    const out = { dx: 0, dy: 0, a: 1, level: false };
    if (!p.mv || G.reduced) return out;
    const t = Math.max(0, G.local || 0);
    const k = Math.floor(t / 0.5);
    const mv = p.mv;
    if (mv.m === "drift") {
      out.dx = mv.v * k * Math.max(1, W / 1280);
    } else if (mv.m === "lurch") {
      if (t >= mv.at) out.dx = mv.ox * W;
    } else if (mv.m === "enter") {
      const gap = Math.max(0.001, mv.gap);
      const i = t < mv.at ? 0 : Math.min(3, 1 + Math.floor((t - mv.at) / gap));
      const f = 1 - i / 3;
      out.dx = mv.ox * W * f;
      out.dy = mv.oy * H * f;
      if (i === 0) out.a = 0;
    } else if (mv.m === "fade") {
      const gap = Math.max(0.001, mv.gap);
      const i = t < mv.at ? 0 : Math.min(3, 1 + Math.floor((t - mv.at) / gap));
      out.a = 1 - i / 3;
    } else if (mv.m === "pass") {
      const dur = (G.BEATS[G.beat] && G.BEATS[G.beat].dur) || 1;
      const K = Math.max(1, Math.floor(dur / 0.5));
      out.dx = W * (mv.from + (mv.to - mv.from) * Math.min(1, k / K));
    } else if (mv.m === "level") {
      out.level = t >= mv.at;
    }
    return out;
  }

  function parX(W) {
    const cam = G.cam || 0;
    return clamp(0.03 * cam * W, -0.05 * W, 0.05 * W);
  }

  function brimBottom(p, X, W, H) {
    const cx = p.x * W, cy = -0.3 * H, rx = p.rx * W, ry = (p.d + 0.3) * H;
    const dx = X - cx;
    if (Math.abs(dx) >= rx) return null;
    return cy + ry * Math.sqrt(1 - (dx / rx) * (dx / rx));
  }

  function combTines(p, W, H) {
    const n = clamp(p.n, 1, 9);
    const tines = [];
    let sum = 0;
    for (let i = 0; i < n; i++) {
      if (i > 0) sum += GAPS[i - 1];
      const xi = W * (p.x + p.dir * sum);
      const len = p.len * LENS[i] * H;
      const w = 0.012 * W;
      const s = Math.min(3, p.s + (i % 2));
      tines.push({ xi, len, w, s });
    }
    return tines;
  }

  function combBottom(p, X, W, H) {
    const tines = combTines(p, W, H);
    for (const t of tines) {
      if (X >= t.xi - t.w / 2 && X <= t.xi + t.w / 2) return t.len;
    }
    return null;
  }

  function lintelEdge(p, X, W, H) {
    return p.y * H + (X - W / 2) * p.tilt;
  }

  function arcBottom(p, X, H) {
    const cx = p.cx * H, cy = p.cy * H, r = p.r * H;
    const dx = X - cx;
    if (Math.abs(dx) >= r) return null;
    return cy + Math.sqrt(r * r - dx * dx);
  }

  function buildBrimPath(p, W, H) {
    const path = new Path2D();
    path.ellipse(p.x * W, -0.3 * H, p.rx * W, (p.d + 0.3) * H, 0, 0, Math.PI * 2);
    return path;
  }

  function buildCombPaths(p, W, H) {
    return combTines(p, W, H).map((t) => {
      const path = new Path2D();
      path.rect(t.xi - t.w / 2, -10, t.w, t.len + 10);
      return { path, s: t.s };
    });
  }

  function buildLintelPath(p, W, H) {
    const e1 = lintelEdge(p, 1.2 * W, W, H);
    const e2 = lintelEdge(p, -0.2 * W, W, H);
    const path = new Path2D();
    path.moveTo(-0.2 * W, -10);
    path.lineTo(1.2 * W, -10);
    path.lineTo(1.2 * W, e1);
    path.lineTo(-0.2 * W, e2);
    path.closePath();
    return path;
  }

  function buildArcPath(p, H) {
    const path = new Path2D();
    path.arc(p.cx * H, p.cy * H, p.r * H, 0, Math.PI * 2);
    return path;
  }

  function visibleList(pose) {
    const order = ["brim", "comb", "lintel", "arc"];
    const list = [];
    for (const k of order) {
      const p = pose[k];
      if (!p) continue;
      if (p.t0 != null && (G.local == null || G.local < p.t0)) continue;
      list.push(k);
    }
    return list;
  }

  const cache = { key: null, paths: null, clip: null };

  // tier 3 is held back until well after the flash (secs("break") 4.1) because the owner disliked it there; it fades in over 1.5 s from there
  function seaFade() { return clamp((G.secs("break") - 4.1) / 1.5, 0, 1); }

  function draw(ctx, W, H, z, sx, sy) {
    if (W <= 0 || H <= 0) return;
    if (G.sceneOf(G.beat) === "birth") return;   // owner's call: no tier-3 old one in birth
    // owner's call: hidden in the opening beats, faded in over 1.5 s from the moment the sea arrives
    const seaIn = seaFade();
    if (seaIn <= 0) return;
    const pal = window.GenEldPal && window.GenEldPal.TIER3;
    if (!pal) return;
    const pose = currentPose();
    if (!pose) return;
    const beatId = G.BEATS[G.beat].id;
    const list = visibleList(pose);
    const key = beatId + "|" + W + "|" + H + "|" + list.join(",");
    if (cache.key !== key) {
      cache.key = key;
      cache.paths = {};
      for (const k of list) {
        const p = pose[k];
        if (k === "brim") cache.paths.brim = [{ path: buildBrimPath(p, W, H), s: p.s }];
        else if (k === "comb") cache.paths.comb = buildCombPaths(p, W, H);
        else if (k === "lintel") cache.paths.lintel = [{ path: buildLintelPath(p, W, H), s: p.s }];
        else if (k === "arc") cache.paths.arc = [{ path: buildArcPath(p, H), s: p.s }];
      }
      const c = new Path2D();
      c.rect(-W, -H, 3 * W, 3 * H);
      c.rect(0.06 * W, -H, 0.88 * W, H + 0.2 * H);
      cache.clip = c;
    }

    ctx.save();
    if (z && z !== 1) {
      ctx.translate(W / 2, H / 2);
      ctx.scale(1 / z, 1 / z);
      ctx.translate(-W / 2, -H / 2);
    }
    ctx.translate(-(sx || 0), -(sy || 0));
    const px = parX(W);
    ctx.translate(px, 0);

    const steps = pal.steps;
    const order = ["brim", "comb", "lintel", "arc"];
    for (const k of order) {
      const arr = cache.paths[k];
      if (!arr) continue;
      const m = motion(pose[k], W, H);
      if (m.a <= 0) continue;
      const levelled = k === "lintel" && m.level;
      const ang = levelled ? -Math.atan(pose.lintel.tilt) : 0;
      const pvx = W / 2, pvy = levelled ? pose.lintel.y * H : 0;
      ctx.save();
      ctx.translate(m.dx, m.dy);
      ctx.globalAlpha = m.a * seaIn;
      if (levelled) {
        ctx.translate(pvx, pvy);
        ctx.rotate(ang);
        ctx.translate(-pvx, -pvy);
      }
      for (const item of arr) {
        ctx.fillStyle = steps[0];
        ctx.fill(item.path);
        const s = clamp(item.s, 0, 3);
        if (s > 0) {
          ctx.save();
          if (levelled) {
            ctx.translate(pvx, pvy);
            ctx.rotate(-ang);
            ctx.translate(-pvx, -pvy);
          }
          ctx.translate(-m.dx, -m.dy);
          ctx.clip(cache.clip, "evenodd");
          ctx.translate(m.dx, m.dy);
          if (levelled) {
            ctx.translate(pvx, pvy);
            ctx.rotate(ang);
            ctx.translate(-pvx, -pvy);
          }
          ctx.fillStyle = steps[s];
          ctx.fill(item.path);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    ctx.globalAlpha = 0.45;
    ctx.fillStyle = BG;
    [0.05, 0.11, 0.17].forEach((y) => ctx.fillRect(-0.1 * W, y * H, 1.2 * W, 0.012 * H));
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  /* The break glimpse: a huge dark limb cut out of the flash, reaching in from
     the top right edge. Screen-fixed; poses step on time (t, seconds into the
     break) so it keeps moving through the held flash; the previous pose
     lingers as a clear faint copy. Curved tapered segments, hooked spurs. */
  const cut = { w: 0, h: 0, paths: null };
  const CUT_T0 = 1.2, CUT_STEP = 0.13;
  const CUT_POSE = [
    { jx: 1.00, jy: 0.10, tx: 0.95, ty: 0.28, b: 0.10 },
    { jx: 0.92, jy: 0.14, tx: 0.83, ty: 0.37, b: 0.16 },
    { jx: 0.84, jy: 0.16, tx: 0.69, ty: 0.45, b: 0.22 },
    { jx: 0.78, jy: 0.15, tx: 0.56, ty: 0.51, b: 0.28 },
    { jx: 0.74, jy: 0.14, tx: 0.45, ty: 0.54, b: 0.34 },
    { jx: 0.72, jy: 0.13, tx: 0.37, ty: 0.50, b: 0.42 },
  ];
  const CUT_AMT_POSE = [0, 2, 4, 5];

  // one tapered curved segment's outer (+n) edge, with a hooked spur at its middle
  function cutEdge(path, ax, ay, aw, bx, by, bw, bend, spur, first) {
    const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1;
    const tx = dx / l, ty = dy / l, nx = -ty, ny = tx;
    const cx = (ax + bx) / 2 + nx * bend * l, cy = (ay + by) / 2 + ny * bend * l;
    const cw = (aw + bw) / 2;
    const A = [ax + nx * aw, ay + ny * aw], B = [bx + nx * bw, by + ny * bw];
    const C = [cx + nx * cw, cy + ny * cw];
    if (first) path.moveTo(A[0], A[1]);
    if (!spur) { path.quadraticCurveTo(C[0], C[1], B[0], B[1]); return; }
    const M = [(A[0] + 2 * C[0] + B[0]) / 4, (A[1] + 2 * C[1] + B[1]) / 4];
    const s = spur;
    path.quadraticCurveTo((A[0] + C[0]) / 2, (A[1] + C[1]) / 2, M[0] - tx * s * 0.6, M[1] - ty * s * 0.6);
    path.lineTo(M[0] + nx * s * 1.2 + tx * s * 1.1, M[1] + ny * s * 1.2 + ty * s * 1.1);
    path.lineTo(M[0] + tx * s * 0.6, M[1] + ty * s * 0.6);
    path.quadraticCurveTo((C[0] + B[0]) / 2, (C[1] + B[1]) / 2, B[0], B[1]);
  }

  function cutBack(path, ax, ay, aw, bx, by, bw, bend) {
    const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l, ny = dx / l;
    const cx = (ax + bx) / 2 + nx * bend * l, cy = (ay + by) / 2 + ny * bend * l;
    const cw = (aw + bw) / 2;
    path.quadraticCurveTo(cx + nx * cw, cy + ny * cw, bx + nx * bw, by + ny * bw);
  }

  function buildCutPath(W, H, p) {
    const path = new Path2D();
    const rx = 1.2 * W, ry = -0.12 * H;
    const jx = p.jx * W, jy = p.jy * H, tx = p.tx * W, ty = p.ty * H;
    const w0 = 0.2 * H, w1 = 0.07 * H, w2 = 0.014 * H;
    const b1 = -0.06, b2 = p.b;
    cutEdge(path, rx, ry, w0, jx, jy, w1, b1, 0.032 * H, true);
    cutEdge(path, jx, jy, w1 * 0.9, tx, ty, w2, b2, 0.026 * H, false);
    // split, hooked tip: two prongs curling in toward the point
    const dx = tx - jx, dy = ty - jy, l = Math.hypot(dx, dy) || 1;
    const dux = dx / l, duy = dy / l, nx = -duy, ny = dux;
    const q = 0.05 * W;
    path.lineTo(tx + nx * w2 + dux * q * 0.9 - nx * 0.01 * H, ty + ny * w2 + duy * q * 0.9 - ny * 0.01 * H);
    path.lineTo(tx + dux * q * 0.3, ty + duy * q * 0.3);
    path.lineTo(tx - nx * w2 + dux * q * 1.1 - nx * 0.03 * H, ty - ny * w2 + duy * q * 1.1 - ny * 0.03 * H);
    path.lineTo(tx - nx * w2, ty - ny * w2);
    cutBack(path, tx, ty, w2, jx, jy, w1 * 0.9, -b2);
    cutBack(path, jx, jy, w1, rx, ry, w0, -b1);
    path.closePath();
    return path;
  }

  function drawCut(ctx, W, H, amt, t) {
    if (!(amt > 0) || W <= 0 || H <= 0) return;
    const pal = window.GenEldPal && window.GenEldPal.TIER3;
    if (cut.w !== W || cut.h !== H || !cut.paths) {
      cut.w = W; cut.h = H;
      cut.paths = CUT_POSE.map((p) => buildCutPath(W, H, p));
    }
    let i;
    if (G.reduced) i = 3;
    else if (typeof t === "number") i = clamp(Math.floor((t - CUT_T0) / CUT_STEP), 0, CUT_POSE.length - 1);
    else i = CUT_AMT_POSE[amt > 0.8 ? 0 : amt > 0.5 ? 1 : amt > 0.25 ? 2 : 3];
    const a = clamp(amt, 0, 1);
    ctx.save();
    ctx.fillStyle = pal ? pal.under : "#0a0d10";
    if (!G.reduced && i > 0) {
      ctx.globalAlpha = 0.45 * a;
      ctx.fill(cut.paths[typeof t === "number" ? i - 1 : CUT_AMT_POSE.indexOf(i) > 0 ? CUT_AMT_POSE[CUT_AMT_POSE.indexOf(i) - 1] : 0]);
    }
    ctx.globalAlpha = a;
    ctx.fill(cut.paths[i]);
    ctx.restore();
  }

  let frameKey = null, frameList = null;

  function pocket(x, y) {
    if (!G || !G.W || !G.H) return false;
    const pose = currentPose();
    if (!pose) return false;
    const fade = seaFade();
    if (fade <= 0) return false;
    const beatId = G.BEATS[G.beat].id;
    const list = visibleList(pose);
    const key = beatId + "|" + G.W + "|" + G.H + "|" + list.join(",");
    if (frameKey !== key) {
      frameKey = key;
      frameList = list.map((k) => ({ k, p: pose[k] }));
    }
    const px = parX(G.W);
    for (const { k, p } of frameList) {
      const m = motion(p, G.W, G.H);
      if (m.a <= 0) continue;
      const X = x - px - m.dx;
      const Y = y - m.dy;
      let b = null;
      if (k === "brim") b = brimBottom(p, X, G.W, G.H);
      else if (k === "comb") b = combBottom(p, X, G.W, G.H);
      else if (k === "lintel") b = m.level ? p.y * G.H : lintelEdge(p, X, G.W, G.H);
      else if (k === "arc") b = arcBottom(p, X, G.H);
      if (b !== null) {
        const margin = (k === "lintel" || k === "arc") ? 0.10 * G.H : 0.04 * G.H;
        if (Y < (b + margin) * fade) return true;
      }
    }
    return false;
  }

  function offset(k) {
    const pose = currentPose();
    if (!pose || !pose[k]) return null;
    if (!visibleList(pose).includes(k)) return null;
    const fade = seaFade();
    if (fade <= 0) return null;
    const m = motion(pose[k], G.W, G.H);
    m.dx *= fade; m.dy *= fade;
    return m;
  }

  function tines(k) {
    if (k !== "comb") return null;
    const m = offset("comb");
    if (!m || m.a <= 0) return null;
    const p = currentPose().comb;
    return combTines(p, G.W, G.H).map((t) => t.xi + parX(G.W) + m.dx);
  }

  return { draw, drawCut, pocket, offset, tines, POSE };
})();
