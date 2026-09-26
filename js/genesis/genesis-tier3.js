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

  function draw(ctx, W, H, z, sx, sy) {
    if (W <= 0 || H <= 0) return;
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
      ctx.globalAlpha = m.a;
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

  let frameKey = null, frameList = null;

  function pocket(x, y) {
    if (!G || !G.W || !G.H) return false;
    const pose = currentPose();
    if (!pose) return false;
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
        if (Y < b + margin) return true;
      }
    }
    return false;
  }

  function offset(k) {
    const pose = currentPose();
    if (!pose || !pose[k]) return null;
    if (!visibleList(pose).includes(k)) return null;
    return motion(pose[k], G.W, G.H);
  }

  function tines(k) {
    if (k !== "comb") return null;
    const m = offset("comb");
    if (!m || m.a <= 0) return null;
    const p = currentPose().comb;
    return combTines(p, G.W, G.H).map((t) => t.xi + parX(G.W) + m.dx);
  }

  return { draw, pocket, offset, tines, POSE };
})();
