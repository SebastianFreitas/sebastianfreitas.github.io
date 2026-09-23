/* genesis-void.js — the void half of the record: the point, the span,
   the old ones, Primordisentia, the two lights and their trails. */
window.GenVoid = (function () {
  const G = window.Gen;
  const { hash1, smooth, clamp, mix } = Util;
  const { offsetShade } = Paint;
  const { ROOT_U, DECK, BAY_U, SPAN_START_U, BURY_U, YELLOW_KEYS, RED_KEYS, ORB_STYLE,
          NAME_DELAY, NAME_FADE, motes, oldones, souls, idxOf, since, linear, sx } = G;
  const { flatGlow, flatSphere, rexSurfY } = GenPaint;

  function fillBg(ctx) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#0d1114";
    ctx.fillRect(0, 0, G.W, G.H);
  }

  function drawMotes(ctx, amt, streak) {
    if (amt < 0.02) return;
    const span = G.W * 2.2;
    const off = G.t * 12 + G.cam * G.W * 0.35;
    ctx.fillStyle = "#c6ccc6";
    ctx.strokeStyle = "#c6ccc6";
    for (const m of motes) {
      const x = ((m.u * span - off * (0.3 + m.rr * 0.2)) % span + span) % span - span * 0.15;
      if (x < -40 || x > G.W + 40) continue;
      const y = m.y * G.H + Math.sin(G.t * 0.5 + m.ph) * 14;
      ctx.globalAlpha = m.a * amt * (0.55 + 0.45 * Math.sin(G.t * 1.6 + m.ph));
      if (streak > 3) {
        ctx.lineWidth = m.rr;
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.lineTo(x - streak * (0.4 + m.rr * 0.35), y); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(x, y, m.rr, 0, 6.283); ctx.fill();
      }
    }
    ctx.globalAlpha = 1; ctx.lineWidth = 1;
  }

  function drawChaos(ctx, amt) {
    if (amt < 0.02) return;
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const baseY = G.H * (0.10 + i * 0.155);
      const amp = (40 + i * 22) * amt;
      ctx.beginPath();
      for (let px = -60; px <= G.W + 60; px += 24) {
        const u = px * 0.0018 + G.cam * 2.4;
        const y = baseY
          + Math.sin(u + G.t * 0.18 + i * 1.3) * amp
          + Math.sin(u * 2.9 - G.t * 0.11 + i) * amp * 0.45;
        px === -60 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
      }
      const a = amt * (0.05 + 0.05 * Math.sin(G.t * 0.23 + i));
      ctx.strokeStyle = i % 2 ? `rgba(96,66,74,${a})` : `rgba(58,84,92,${a})`;
      ctx.stroke();
    }
    ctx.lineWidth = 1;
  }

  function drawPoint(ctx, amt, crack) {
    if (amt < 0.01 && crack < 0.02) return;
    const cx = sx(0), cy = G.H * 0.46;
    const pulse = 0.85 + 0.15 * Math.sin(G.t * 1.7);
    const glow = (10 + amt * 36) * pulse;
    flatGlow(ctx, cx, cy, glow, "245,208,107", 0.55 + 0.25 * amt);

    const n = 7;
    for (let i = 0; i < n; i++) {
      const ang = G.t * 0.4 + i * (6.283 / n);
      const j = 1.2 + Math.sin(G.t * 2.1 + i) * 0.8;
      ctx.fillStyle = i % 2
        ? `rgba(176,104,90,${0.35 * amt})`
        : `rgba(143,176,184,${0.3 * amt})`;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(ang) * j, cy + Math.sin(ang) * j, 1.4, 0, 6.283);
      ctx.fill();
    }
    ctx.fillStyle = `rgba(245,208,107,${0.95 * amt})`;
    ctx.beginPath(); ctx.arc(cx, cy, 1.8 + amt * 0.8, 0, 6.283); ctx.fill();

    if (crack > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(245,208,107,${0.78 * crack})`;
      ctx.lineWidth = 1.15;
      ctx.lineCap = "round";
      for (let i = 0; i < n; i++) {
        const ang = i * (6.283 / n) + G.t * 0.05;
        const len = (16 + (i % 3) * 16) * crack;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawBridgeLine(ctx, grow) {
    if (grow < 0.02) return;
    const deckY = G.H * DECK;
    const inf = G.beat >= idxOf("flee");
    const startU = inf ? G.cam - 2.65 : SPAN_START_U;
    const endU = inf ? G.cam + 2.45 : mix(-0.48, ROOT_U + 0.22, grow);
    const x0 = sx(startU);
    const x1 = sx(endU);
    if (x1 < -40 || x0 > G.W + 40) return;

    const bayPx = Math.max(24, BAY_U * G.W);
    const legW  = Math.min(3, Math.max(1.2, bayPx * 0.007));
    const deckH = Math.min(6, Math.max(2.5, bayPx * 0.013));
    const rise  = bayPx * 0.20;
    const legBot = G.H * 1.22;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x0 - 2, 0, Math.max(2, x1 - x0) + 4, G.H);
    ctx.clip();

    const first = Math.floor(startU / BAY_U) - 1;
    const last  = Math.ceil(endU / BAY_U) + 1;

    ctx.fillStyle = `rgba(112,130,140,${0.55 * grow})`;
    ctx.beginPath();
    for (let b = first; b <= last; b++) {
      const x = sx(b * BAY_U);
      if (x < x0 - 8 || x > x1 + 8) continue;
      ctx.rect(x - legW / 2, deckY + deckH, legW, legBot - deckY - deckH);
    }
    ctx.fill();
    const archT = Math.max(1, legW * 0.55);
    for (let b = first; b <= last; b++) {
      const xa = sx(b * BAY_U);
      if (xa < x0 - bayPx || xa > x1 + 8) continue;
      const cx = xa + bayPx / 2, cy = deckY + deckH + rise, rx = bayPx / 2 - legW;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, rise, 0, Math.PI, 0);
      ctx.ellipse(cx, cy, Math.max(0.5, rx - archT), Math.max(0.5, rise - archT), 0, 0, Math.PI, true);
      ctx.closePath();
      ctx.fillStyle = `rgba(112,130,140,${0.30 * grow})`;
      ctx.fill();
    }
    for (let b = first; b <= last; b++) {
      const x = sx(b * BAY_U);
      if (x < x0 - 8 || x > x1 + 8) continue;
      const r = hash1(b * 911 + 7);
      ctx.fillStyle = `rgba(120,138,147,${0.4 * grow})`;
      ctx.fillRect(x - legW * 0.4, deckY - deckH * 1.9, legW * 0.8, deckH * 1.9);
      if (r < 0.13) {
        const mh = deckH * (4.5 + r * 22);
        ctx.fillStyle = `rgba(120,138,147,${0.34 * grow})`;
        ctx.fillRect(x - legW * 0.3, deckY - mh, legW * 0.6, mh);
        ctx.fillStyle = `rgba(245,208,107,${0.75 * grow})`;
        ctx.fillRect(x - legW * 0.55, deckY - mh - legW * 0.7, legW * 1.1, legW * 1.1);
      }
    }
    ctx.fillStyle = `rgba(36,45,51,${0.92 * grow})`;
    ctx.fillRect(x0, deckY, x1 - x0, deckH);
    ctx.fillStyle = `rgba(245,208,107,${0.62 * grow})`;
    for (let b = first; b <= last; b++) {
      const x = sx(b * BAY_U);
      if (x < x0 - 4 || x > x1 + 4) continue;
      const xEnd = Math.min(x + bayPx + 1, x1);
      if (xEnd <= x) continue;
      ctx.fillRect(x, deckY - 1.6, xEnd - x, 2.4);
    }
    ctx.restore();
  }

  function fleshGeom(womb) {
    const vis = clamp(since("root") + 0.35, 0.35, 1);
    const cx = sx(ROOT_U), cy = G.H * 0.5;
    const rx = Math.min(G.W, G.H) * (0.26 + 0.14 * vis) * mix(1, 0.86, womb);
    const ry = Math.min(G.W, G.H) * (0.34 + 0.16 * vis) * mix(1, 0.94, womb);
    return { cx, cy, rx, ry };
  }

  function walkerPos(o, burst, walk, cling, still, watch, flesh) {
    const cy = G.H * 0.46;
    const deckY = G.H * DECK;
    const r = (0.06 + o.sp / 360) * burst;
    const xBurst = Math.cos(o.ang) * r * 0.45;
    const yBurst = cy + Math.sin(o.ang) * r * G.H * 0.16;
    const settle = smooth(clamp((burst - 0.18) / 0.42, 0, 1));
    const splitU = o.side * (0.05 + o.gait * 0.14) * settle;
    const along = o.side < 0
      ? splitU - o.gait * walk * 2.2
      : mix(splitU, ROOT_U - 0.06 + o.lane * 0.002, clamp(walk * (0.88 + o.gait * 0.18), 0, 1));
    const yDeck = deckY - 8 + o.lane + Math.sin(G.t * (2.1 + o.gait) + o.ph) * 2.4 * settle;
    const deckX = sx(mix(xBurst, along, settle));
    const deckYPos = mix(yBurst, yDeck, settle);

    let x = deckX, y = deckYPos;
    if (o.side > 0 && flesh && cling > 0.02) {
      const ang = o.clingAng + G.t * o.spin * (1 - still * 0.85);
      const bite = mix(1.08, 0.86, cling * (1 - still));
      const back = mix(1, 1.16, still);
      const watchR = mix(1, 1.22, watch);
      const rr = bite * back * watchR;
      const fx = flesh.cx + Math.cos(ang) * flesh.rx * rr;
      const fy = flesh.cy + Math.sin(ang) * flesh.ry * rr;
      const u = smooth(clamp((cling - 0.05) / 0.55, 0, 1));
      x = mix(deckX, fx, u);
      y = mix(deckYPos, fy, u);
    }

    let a = o.a * clamp(burst * 4.2, 0, 1);
    if (x < 12) a *= clamp(x / 12, 0, 1);
    a *= 1 - since("land") * 0.92;
    if (watch > 0.4) a *= mix(1, 0.55, watch);
    return { x, y, a, onDeck: settle > 0.55 && cling < 0.25 };
  }

  function drawAlien(ctx, o, x, y, a) {
    if (a < 0.03) return;
    const s = o.tall * 0.42;
    const wob = G.t * (0.7 + o.gait * 0.35) + o.ph;
    ctx.save();
    ctx.globalAlpha = a;

    flatGlow(ctx, x, y, s * 1.8, o.hue, 0.5);

    ctx.fillStyle = `rgba(${o.hue},0.92)`;
    ctx.strokeStyle = `rgba(${o.hue},0.72)`;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const kind = o.kind || "blob";
    if (kind === "spindle") {
      ctx.beginPath();
      ctx.ellipse(x, y, s * 0.28, s * 1.15, Math.sin(wob) * 0.12, 0, 6.283);
      ctx.fill();
      ctx.lineWidth = 1.05;
      const arms = 2 + (o.limbs % 3);
      for (let k = 0; k < arms; k++) {
        const ang = -0.55 + k * (1.1 / Math.max(1, arms - 1)) + Math.sin(wob + k) * 0.2;
        const len = s * (0.7 + 0.25 * Math.sin(wob * 1.2 + k));
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + Math.sin(ang) * len * 0.4, y + len * 0.35, x + Math.sin(ang) * len, y + len * 0.85);
        ctx.stroke();
      }
    } else if (kind === "cluster") {
      const n = 3 + o.holes + (o.limbs % 3);
      for (let i = 0; i < n; i++) {
        const ang = o.ang + i * (6.283 / n) + Math.sin(wob + i) * 0.18;
        const rad = s * (0.22 + (i % 3) * 0.12);
        const cx = x + Math.cos(ang) * s * 0.42;
        const cy = y + Math.sin(ang) * s * 0.34;
        ctx.beginPath(); ctx.arc(cx, cy, rad, 0, 6.283); ctx.fill();
      }
    } else if (kind === "crawler") {
      ctx.beginPath();
      ctx.ellipse(x, y - s * 0.12, s * 0.72, s * 0.38, Math.sin(wob) * 0.08, 0, 6.283);
      ctx.fill();
      ctx.lineWidth = 1.2;
      const legs = 5 + (o.limbs % 4);
      for (let k = 0; k < legs; k++) {
        const side = k < legs / 2 ? -1 : 1;
        const u = (k % Math.ceil(legs / 2)) / Math.max(1, Math.ceil(legs / 2) - 1);
        const bx = x + side * mix(s * 0.15, s * 0.55, u);
        const gait = Math.sin(wob * 1.6 + k * 0.9) * s * 0.18;
        ctx.beginPath();
        ctx.moveTo(bx, y);
        ctx.lineTo(bx + side * s * 0.22 + gait, y + s * 0.55);
        ctx.lineTo(bx + side * s * 0.08 + gait * 0.4, y + s * 0.95);
        ctx.stroke();
      }
    } else if (kind === "shard") {
      ctx.beginPath();
      const n = 5 + (o.limbs % 3);
      for (let i = 0; i <= n; i++) {
        const ang = o.ang + (i / n) * 6.283;
        const rad = s * (i % 2 ? 0.95 : 0.38) * (1 + 0.08 * Math.sin(wob + i));
        const px = x + Math.cos(ang) * rad;
        const py = y + Math.sin(ang) * rad * 0.9;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    } else if (kind === "ring") {
      ctx.lineWidth = Math.max(1.4, s * 0.16);
      ctx.beginPath();
      ctx.ellipse(x, y, s * 0.78, s * 0.52, o.ang * 0.2 + Math.sin(wob) * 0.15, 0, 6.283);
      ctx.stroke();
      ctx.lineWidth = Math.max(0.8, s * 0.08);
      ctx.beginPath();
      ctx.ellipse(x, y, s * 0.42, s * 0.28, -o.ang * 0.15, 0, 6.283);
      ctx.stroke();
      ctx.fillStyle = `rgba(${o.hue},0.85)`;
      ctx.beginPath(); ctx.arc(x + Math.cos(wob) * s * 0.38, y + Math.sin(wob) * s * 0.22, 1.6, 0, 6.283); ctx.fill();
    } else {
      ctx.beginPath();
      const n = 9 + o.limbs;
      for (let i = 0; i <= n; i++) {
        const ang = (i / n) * 6.283 + o.ang * 0.35;
        const rad = s * (0.52
          + 0.28 * Math.sin(ang * 3 + wob)
          + 0.18 * Math.sin(ang * 5 - wob * 1.2)
          + ((i * 13 + Math.floor(o.sp)) % 4 === 0 ? 0.28 * Math.sin(wob * 1.4) : 0));
        const px = x + Math.cos(ang) * rad;
        const py = y + Math.sin(ang) * rad * 0.82;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "rgba(13,17,20,0.82)";
      for (let h = 0; h < o.holes; h++) {
        const ha = o.ph + h * 2.15 + Math.sin(wob + h) * 0.45;
        ctx.beginPath();
        ctx.arc(
          x + Math.cos(ha) * s * 0.22,
          y + Math.sin(ha) * s * 0.18,
          s * (0.11 + h * 0.05),
          0, 6.283
        );
        ctx.fill();
      }

      ctx.strokeStyle = `rgba(${o.hue},0.72)`;
      ctx.lineWidth = 1.15;
      for (let k = 0; k < o.limbs; k++) {
        const ang = o.ang + k * (6.283 / o.limbs) + Math.sin(wob + k) * 0.55;
        const len = s * (0.85 + 0.55 * Math.sin(wob * 1.35 + k));
        const mx = x + Math.cos(ang) * len * 0.5;
        const my = y + Math.sin(ang) * len * 0.5;
        const twist = 0.45 * Math.sin(wob + k * 1.7);
        const ex = x + Math.cos(ang + twist) * len;
        const ey = y + Math.sin(ang + twist) * len;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(mx, my, ex, ey);
        ctx.stroke();
        ctx.fillStyle = `rgba(${o.hue},0.85)`;
        ctx.beginPath(); ctx.arc(ex, ey, 1.35, 0, 6.283); ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawOldOnes(ctx, burst, walk, cling, still, watch, flesh) {
    if (burst < 0.01 && walk < 0.02) return;
    for (const o of oldones) {
      const p = walkerPos(o, burst, walk, cling, still, watch, flesh);
      if (p.a < 0.03) continue;
      if (p.x < -40 || p.x > G.W + 40) continue;
      drawAlien(ctx, o, p.x, p.y, p.a);
    }
  }

  function drawStains(ctx, flesh, amt) {
    if (!flesh || amt < 0.04) return;
    for (const o of oldones) {
      if (o.side < 0) continue;
      const ang = o.clingAng + G.t * o.spin * 0.4;
      const x = flesh.cx + Math.cos(ang) * flesh.rx * 0.72;
      const y = flesh.cy + Math.sin(ang) * flesh.ry * 0.72;
      ctx.fillStyle = `rgba(${o.hue},${0.2 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, 14 + o.rr * 6, 0, 6.283); ctx.fill();
    }
  }

  function fleshPath(ctx, cx, cy, rx, ry, pain, seed) {
    ctx.beginPath();
    const n = 80;
    for (let i = 0; i <= n; i++) {
      const u = i / n, ang = u * 6.283;
      const wob = 1
        + Math.sin(ang * 3 + G.t * 0.5 + seed) * 0.08 * pain
        + Math.sin(ang * 7 - G.t * 0.35) * 0.05 * pain
        + Math.sin(ang * 2 + G.t * 0.22) * 0.05
        + Math.sin(ang * 11 + G.t * 1.1) * 0.03 * pain;
      const x = cx + Math.cos(ang) * rx * wob;
      const y = cy + Math.sin(ang) * ry * wob;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  }

  function drawFlesh(ctx, vis, pain, womb) {
    if (vis < 0.02) return null;
    const { cx, cy, rx, ry } = fleshGeom(womb);

    if (womb > 0.08) {
      flatGlow(ctx, cx, cy, rx * 1.15, "245,208,107", womb * vis);
    }

    const lit = womb > 0.4 ? "#6a2418" : "#5c1114";
    ctx.globalAlpha = vis;
    offsetShade(ctx, () => fleshPath(ctx, cx, cy, rx, ry, pain, 1), -rx * 0.28, -ry * 0.10, lit, "#2e080c");
    ctx.globalAlpha = 1;
    return { cx, cy, rx, ry };
  }

  function drawSouls(ctx, flesh, amt) {
    if (!flesh || amt < 0.02) return;
    const { cx, cy, rx, ry } = flesh;
    for (const s of souls) {
      const x = cx + (s.u - 0.5) * rx * 1.05;
      const y = cy + (s.v - 0.5) * ry * 1.05 + Math.sin(G.t * 0.8 + s.ph) * 4;
      ctx.fillStyle = `rgba(245,208,107,${s.a * amt})`;
      ctx.beginPath(); ctx.arc(x, y, s.rr * mix(1, 1.35, since("womb")), 0, 6.283); ctx.fill();
    }
  }

  function drawRip(ctx, flesh, amt) {
    if (!flesh || amt < 0.02) return;
    const { cx, cy, rx, ry } = flesh;
    const x0 = cx - rx * 0.92;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(255,230,190,${0.85 * amt})`;
    ctx.lineWidth = 1.4 + amt * 2.2;
    ctx.beginPath();
    const steps = 14;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const x = x0 + Math.sin(u * 18 + G.t * 9) * (2 + amt * 5) + u * rx * 0.08;
      const y = cy - ry * 0.72 + u * ry * 1.44;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function keyAt(keys, u) {
    if (u <= keys[0].t) return { x: keys[0].x, y: keys[0].y };
    for (let i = 1; i < keys.length; i++) {
      if (u <= keys[i].t) {
        const a = keys[i - 1], b = keys[i];
        const span = Math.max(0.0001, b.t - a.t);
        const k = (u - a.t) / span;
        const s = span < 0.055 ? Math.pow(k, 0.38) : smooth(k);
        return { x: mix(a.x, b.x, s), y: mix(a.y, b.y, s) };
      }
    }
    const last = keys[keys.length - 1];
    return { x: last.x, y: last.y };
  }

  function lightsAt(uBirth, uFight, uLand, flesh) {
    const exitX = flesh ? flesh.cx - flesh.rx * 0.92 : sx(ROOT_U) - Math.min(G.W, G.H) * 0.28;
    const exitY = flesh ? flesh.cy + flesh.ry * 0.04 : G.H * 0.5;
    const west = flesh ? flesh.cx - flesh.rx - 22 : exitX;
    const arenaX = west - Math.min(G.W, G.H) * 0.16;
    const arenaY = G.H * 0.40;
    const span = Math.min(G.W, G.H);
    const emerge = clamp(uBirth * 1.35, 0, 1);
    const yK = keyAt(YELLOW_KEYS, uFight);
    const rK = keyAt(RED_KEYS, uFight);
    let yx = mix(exitX, arenaX + yK.x * span * 0.28, emerge);
    let yy = mix(exitY, arenaY + yK.y * span * 0.30, emerge);
    let rx = mix(exitX, arenaX + rK.x * span * 0.28, emerge);
    let ry = mix(exitY, arenaY + rK.y * span * 0.30, emerge);
    yx = Math.min(yx, west);
    rx = Math.min(rx, west);

    /* Rex's last act: he closes his whole body around Obrokxus, and
       the two of them go down together into what becomes the ground */
    const wrap = smooth(clamp((uFight - 0.80) / 0.10, 0, 1));
    const landLin = linear("land");
    const dropP = clamp((uFight - 0.88) / 0.12, 0, 1) * 0.35 + clamp(landLin / 0.45, 0, 1) * 0.65;
    const bx = sx(BURY_U);
    const by = rexSurfY(BURY_U) + G.H * 0.10;
    rx = mix(rx, bx, smooth(dropP));
    ry = mix(ry, by, dropP * dropP);
    yx = mix(yx, rx, wrap);
    yy = mix(yy, ry, wrap);
    const bury = smooth(clamp((landLin - 0.30) / 0.30, 0, 1));

    return {
      yx, yy, rx, ry,
      yAmt: emerge * (1 - wrap * 0.35) * (1 - bury),
      rAmt: emerge * (1 - bury * 0.6),
      originX: rx,
      originY: ry,
      die: dropP, wrap, bury, recede: 0,
    };
  }

  function pushTrail(list, x, y) {
    if (!G.tick60) return;
    list.push({ x, y });
    if (list.length > 16) list.shift();
  }

  function drawTrail(ctx, list, rgb, amt, dark) {
    if (amt < 0.02 || list.length < 2) return;
    ctx.save();
    if (!dark) ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    for (let i = 1; i < list.length; i++) {
      const u = i / list.length;
      ctx.strokeStyle = `rgba(${rgb},${(dark ? 0.42 : 0.55) * u * amt})`;
      ctx.lineWidth = mix(1.2, dark ? 5.5 : 7, u);
      ctx.beginPath();
      ctx.moveTo(list[i - 1].x, list[i - 1].y);
      ctx.lineTo(list[i].x, list[i].y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawOrb(ctx, x, y, amt, kind, scale) {
    if (amt < 0.02) return;
    const s = scale == null ? 1 : scale;
    const big = kind === "obrokxus" || kind === "hound";
    const R = Math.min(G.W, G.H) * (kind === "hound" ? 0.055 : big ? 0.072 : 0.048) * s * (0.7 + amt * 0.5);
    ctx.save();
    if (kind === "rex") {
      ctx.globalCompositeOperation = "source-over";
      flatGlow(ctx, x, y, R * 2.2, ORB_STYLE.rex.glow, amt);
      flatSphere(ctx, x, y, R * 0.62, ORB_STYLE.rex.lit, ORB_STYLE.rex.shade, ORB_STYLE.rex.core, amt);
    } else if (kind === "ormius") {
      ctx.globalCompositeOperation = "source-over";
      flatGlow(ctx, x, y, R * 2.2, ORB_STYLE.ormius.glow, amt);
      flatSphere(ctx, x, y, R * 0.62, ORB_STYLE.ormius.lit, ORB_STYLE.ormius.shade, ORB_STYLE.ormius.core, amt);
    } else if (kind === "ava") {
      ctx.globalCompositeOperation = "source-over";
      flatGlow(ctx, x, y, R * 2.2, ORB_STYLE.ava.glow, amt);
      flatSphere(ctx, x, y, R * 0.62, ORB_STYLE.ava.lit, ORB_STYLE.ava.shade, ORB_STYLE.ava.core, amt);
    } else if (kind === "kaelum") {
      const a = amt;
      ctx.globalCompositeOperation = "source-over";
      flatGlow(ctx, x, y, R * 2.2, ORB_STYLE.kaelum.glow, a);
      flatSphere(ctx, x, y, R * 0.62, ORB_STYLE.kaelum.lit, ORB_STYLE.kaelum.shade, ORB_STYLE.kaelum.core, a);
    } else if (kind === "orochronus") {
      const a = amt;
      ctx.globalCompositeOperation = "source-over";
      flatGlow(ctx, x, y, R * 2.2, ORB_STYLE.orochronus.glow, a);
      flatSphere(ctx, x, y, R * 0.62, ORB_STYLE.orochronus.lit, ORB_STYLE.orochronus.shade, ORB_STYLE.orochronus.core, a);
      ctx.strokeStyle = `rgba(226,232,244,${0.55 * a})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(x, y, R * 1.15, 0, 6.283); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(G.t * 2.4) * R, y + Math.sin(G.t * 2.4) * R);
      ctx.stroke();
    } else if (kind === "kaeron") {
      const a = amt;
      ctx.globalCompositeOperation = "source-over";
      flatGlow(ctx, x, y, R * 2.2, ORB_STYLE.kaeron.glow, a);
      flatSphere(ctx, x, y, R * 0.62, ORB_STYLE.kaeron.lit, ORB_STYLE.kaeron.shade, ORB_STYLE.kaeron.core, a);
      ctx.fillStyle = `rgba(214,232,255,${0.8 * a})`;
      for (let k = 0; k < 3; k++) {
        const ang = G.t * 1.6 + k * 2.094;
        ctx.beginPath();
        ctx.arc(x + Math.cos(ang) * R * 1.3, y + Math.sin(ang) * R * 1.3, 1.6, 0, 6.283);
        ctx.fill();
      }
    } else if (kind === "mordrial") {
      flatGlow(ctx, x, y, R * 2.4, "190,30,36", amt);
      ctx.fillStyle = `rgba(18,8,12,${0.94 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.7, 0, 6.283); ctx.fill();
      ctx.save();
      ctx.beginPath(); ctx.arc(x, y, R * 0.7, 0, 6.283); ctx.clip();
      ctx.fillStyle = `rgba(200,32,40,${0.78 * amt})`;
      ctx.fillRect(x - R, y - R, R, R * 2);
      ctx.fillStyle = `rgba(240,238,232,${0.78 * amt})`;
      ctx.fillRect(x, y - R, R, R * 2);
      ctx.restore();
      ctx.fillStyle = `rgba(255,250,245,${0.8 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.16, 0, 6.283); ctx.fill();
    } else if (kind === "cadmus") {
      ctx.globalCompositeOperation = "source-over";
      flatGlow(ctx, x, y, R * 2.2, ORB_STYLE.cadmus.glow, amt);
      flatSphere(ctx, x, y, R * 0.62, ORB_STYLE.cadmus.lit, ORB_STYLE.cadmus.shade, ORB_STYLE.cadmus.core, amt);
    } else if (kind === "aelius") {
      ctx.globalCompositeOperation = "source-over";
      flatGlow(ctx, x, y, R * 2.2, ORB_STYLE.aelius.glow, amt);
      flatSphere(ctx, x, y, R * 0.62, ORB_STYLE.aelius.lit, ORB_STYLE.aelius.shade, ORB_STYLE.aelius.core, amt);
    } else if (kind === "velindra") {
      ctx.globalCompositeOperation = "source-over";
      flatGlow(ctx, x, y, R * 2.2, ORB_STYLE.velindra.glow, amt);
      flatSphere(ctx, x, y, R * 0.62, ORB_STYLE.velindra.lit, ORB_STYLE.velindra.shade, ORB_STYLE.velindra.core, amt);
    } else if (kind === "hound") {
      flatGlow(ctx, x, y, R * 1.9, "110,10,16", amt);
      ctx.fillStyle = `rgba(16,2,4,${0.96 * amt})`;
      ctx.beginPath();
      ctx.ellipse(x, y, R * 0.85, R * 0.62, Math.sin(G.t * 1.3) * 0.12, 0, 6.283);
      ctx.fill();
      ctx.strokeStyle = `rgba(220,30,36,${0.85 * amt})`;
      ctx.lineWidth = 1.4;
      ctx.lineCap = "round";
      for (let i = 0; i < 7; i++) {
        const ang = G.t * 0.4 + i * (6.283 / 7);
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(ang) * R * 0.35, y + Math.sin(ang) * R * 0.28);
        ctx.lineTo(x + Math.cos(ang) * R * 0.95, y + Math.sin(ang) * R * 0.72);
        ctx.stroke();
      }
      ctx.fillStyle = `rgba(235,40,44,${0.75 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.18, 0, 6.283); ctx.fill();
    } else {
      flatGlow(ctx, x, y, R * 1.7, "120,12,18", amt);
      ctx.fillStyle = `rgba(22,3,5,${0.96 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.72, 0, 6.283); ctx.fill();
      ctx.fillStyle = `rgba(150,18,24,${0.55 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.22, 0, 6.283); ctx.fill();
      ctx.fillStyle = `rgba(8,1,2,${0.9 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.08, 0, 6.283); ctx.fill();
    }
    ctx.restore();
  }

  function drawRings(ctx) {
    if (!G.rings.length) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const r of G.rings) {
      ctx.strokeStyle = `rgba(255,180,140,${0.7 * r.a})`;
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.283); ctx.stroke();
    }
    ctx.restore();
  }

  function drawBeam(ctx, ax, ay, bx, by, amt) {
    if (amt < 0.08) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(255,230,170,${0.55 * amt})`;
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = `rgba(140,20,28,${0.28 * amt})`;
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.restore();
  }

  function drawTintBeam(ctx, ax, ay, bx, by, rgb, amt) {
    if (amt < 0.06) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(${rgb},${0.58 * amt})`;
    ctx.lineWidth = 2.1;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = `rgba(${rgb},${0.16 * amt})`;
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.restore();
  }

  function yWob(ph, amp) {
    return G.H * 0.36 + Math.sin(G.t * 1.35 + ph) * G.H * (amp || 0.018);
  }

  /* who is who. The lines name them once; the labels keep naming
     them, quietly, for as long as they are on the deck. */
  function drawName(ctx, x, y, amt, text, drop) {
    if (amt < 0.12 || !text) return;
    if (amt >= 0.5 && G.nameSeen[text] == null) G.nameSeen[text] = G.t;
    if (G.nameSeen[text] == null) return;
    if (x < -80 || x > G.W + 80) return;
    const late = clamp((G.t - G.nameSeen[text] - NAME_DELAY) / NAME_FADE, 0, 1);
    if (late <= 0) return;
    const a = clamp((amt - 0.12) / 0.35, 0, 1) * 0.72 * late;
    const dy = y + (drop == null ? 26 : drop);
    ctx.save();
    ctx.font = '500 10px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const w = ctx.measureText(text).width;
    ctx.fillStyle = `rgba(8,11,13,${0.62 * a})`;
    ctx.fillRect(x - w * 0.5 - 5, dy - 3, w + 10, 15);
    ctx.fillStyle = `rgba(220,230,232,${a})`;
    ctx.fillText(text, x, dy);
    ctx.restore();
  }

  return {
    fillBg, drawMotes, drawChaos, drawPoint, drawBridgeLine, fleshGeom, walkerPos,
    drawAlien, drawOldOnes, drawStains, fleshPath, drawFlesh, drawSouls, drawRip, keyAt,
    lightsAt, pushTrail, drawTrail, drawOrb, drawRings, drawBeam, drawTintBeam, yWob,
    drawName,
  };
})();
