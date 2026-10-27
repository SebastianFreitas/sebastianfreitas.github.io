/* genesis-elements.js — the first wave out of the broken point: dust, air, wind, sound, colour and light. Each changes form as it travels and dies into a permanent trace of the void. Pure functions of time. */
(function () {
  const G = window.Gen;
  const { hash1, clamp, mix, mulberry, smooth } = Util;
  const { flatGlow } = GenPaint;
  const TAU = Math.PI * 2;

  const KINDS = ["dust", "air", "wind", "colour", "light", "sound"];
  const HUES = ["230,70,60", "70,130,255", "120,214,96", "236,92,150", "245,208,107", "140,70,210", "60,200,200", "240,140,40"];
  const HUE_FILL = HUES.map(h => "rgb(" + h + ")");

  // the elements split: sink into the sea, settle on the bridge, or rise out of frame
  const SEA_H = 0.12;
  const GRAIN_FILL = HUES.map(h => {
    const [r, g, b] = h.split(",").map(Number);
    const m = (r + g + b) / 3;
    return "rgb(" + Math.round(mix(m, r, 0.35) * 0.45) + "," + Math.round(mix(m, g, 0.35) * 0.45) + "," + Math.round(mix(m, b, 0.35) * 0.45) + ")";
  });
  const POS = { x: 0, y: 0, angle: 0, rg: 0, a: 0, q: 0 };

  // rage events: the bottle being shaken, sparse bursts through wave 1
  const EVENTS = [];
  (function seedEvents() {
    const r = mulberry(9110);
    for (let i = 0; i < 8; i++) {
      EVENTS.push({
        t: 0.4 + i * 2.3 + r() * 1.4,
        x: 0.15 + r() * 0.7,
        y: 0.2 + r() * 0.6,
        amp: 0.6 + r() * 0.9,
        R: 0.18 + r() * 0.25,
      });
    }
  })();

  // the comb's entrance at the left, matter local 4.0s: fixed, no RNG
  (function seedCombRage() {
    const amps = EVENTS.map(e => e.amp).sort((a, b) => a - b);
    const Rs = EVENTS.map(e => e.R).sort((a, b) => a - b);
    const maxAmp = amps[amps.length - 1];
    const medR = Rs[(Rs.length - 1) >> 1];
    EVENTS.push({ t: 16.9, x: 0.05, y: 0.12, amp: maxAmp * 1.1, R: medR });
  })();

  function attackDecay(d) {
    if (d < 0) return 0;
    if (d < 0.15) return d / 0.15;
    return Math.exp(-(d - 0.15) / 1.1);
  }

  function rage(s) {
    let sum = 0;
    for (const e of EVENTS) sum += e.amp * attackDecay(s - e.t);
    return Math.min(sum, 1.5);
  }

  // local rage at a screen point; also leaves the weighted push direction in PUSH
  const PUSH = { x: 0, y: 0 };
  function rageAt(s, x, y) {
    const W = G.W, H = G.H;
    let sum = 0;
    PUSH.x = 0; PUSH.y = 0;
    for (const e of EVENTS) {
      const ad = attackDecay(s - e.t);
      if (ad <= 0) continue;
      const ex = e.x * W, ey = e.y * H;
      const dx = x - ex, dy = y - ey;
      const dist = Math.hypot(dx, dy);
      const w = e.amp * ad * Math.max(0, 1 - dist / (e.R * W));
      if (w <= 0) continue;
      sum += w;
      const inv = dist > 0.001 ? 1 / dist : 0;
      PUSH.x += w * dx * inv;
      PUSH.y += w * dy * inv;
    }
    return sum;
  }

  // the bottle being shaken inconsistently, one reusable point (no allocation)
  const SLOSH = { x: 0, y: 0 };
  function slosh(s) {
    const W = G.W, H = G.H, rg = rage(s);
    SLOSH.x = (Math.sin(s * 1.3) + 0.6 * Math.sin(s * 2.9 + 1.7) + 0.4 * Math.sin(s * 0.47 + 4.1)) * W * 0.03 * (1 + rg);
    SLOSH.y = (Math.cos(s * 1.1 + 0.3) + 0.7 * Math.sin(s * 2.3 + 2.2)) * H * 0.025 * (1 + rg);
    return SLOSH;
  }

  // 240 particles, one kind leading at a time: each kind has its own window of the elements beat
  // (s = secs("break") - 2.1; the beat spans s 3.9 to 11.9), building up to the split
  const WINDOW = {   // kind: [first birth, last birth, count]
    dust: [0.3, 5.0, 72], air: [3.9, 6.0, 30], wind: [4.8, 7.0, 36],
    sound: [5.8, 7.8, 24], colour: [6.4, 8.8, 44], light: [7.4, 9.4, 34],
  };
  const PARTS = [];
  (function seedParts() {
    const r = mulberry(9101);
    for (const kind of KINDS) {
      const w = WINDOW[kind];
      for (let n = 0; n < w[2]; n++) {
        const birth = w[0] + (w[1] - w[0]) * r();
        const life = 2.4 + r() * 2.2;
        const ang = r() * TAU;
        const spd = 0.55 + r() * 0.75;
        const size = 0.9 + r() * r() * 3.1;
        const ph = r() * TAU;
        const hueA = Math.floor(r() * 8);
        let hueB = Math.floor(r() * 8);
        if (hueB === hueA) hueB = (hueA + 3) % 8;
        const flip = 0.35 + r() * 1.4;
        const wgt = kind === "dust" ? 0.8 + r() * 0.2 : kind === "air" ? r() * 0.2 : r();
        const curl = (r() - 0.5) * 2.4;
        const settle = r() < 0.35;
        PARTS.push({ i: PARTS.length, kind, birth, life, ang, spd, size, ph, hueA, hueB, flip, wgt, curl, settle });
      }
    }
    // the stream goes on after the window: 60 more grains out of the dot, all sea-bound
    const rx = mulberry(9133);
    for (let n = 0; n < 60; n++) {
      const kind = "dust", birth = 9.4 + rx() * 3.4, life = 2.4 + rx() * 2.2, ang = rx() * TAU, spd = 0.55 + rx() * 0.75;
      const size = 0.9 + rx() * rx() * 3.1, ph = rx() * TAU, hueA = Math.floor(rx() * 8), hueB = (hueA + 3) % 8;
      PARTS.push({ i: PARTS.length, kind, birth, life, ang, spd, size, ph, hueA, hueB, flip: 0.35 + rx() * 1.4, wgt: 0.8 + rx() * 0.2, curl: (rx() - 0.5) * 2.4, settle: false, extra: true });
    }
    PARTS.sort((a, b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind));
    for (const pt of PARTS) {
      const h = pt.i * 7;
      pt.fate = Math.min(2, Math.floor(hash1(h + 11) * 3));
      pt.splitT = 8.6 + hash1(h + 12) * 1.0;
      pt.hold = 0.2 + hash1(h + 13) * 0.25;
      pt.steps = 3 + Math.min(2, Math.floor(hash1(h + 14) * 3));
      pt.stepDur = 0.12 + hash1(h + 15) * 0.1;
      pt.gy = hash1(h + 16);
      // about half go down to build the sea (they fall instead of fading), the rest rise and split as before
      pt.sea = !!pt.extra || hash1(h + 21) < 0.5;
      pt.splits = !pt.sea && pt.birth <= pt.splitT && pt.birth + pt.life > pt.splitT;
      pt.fall = 1.6 + hash1(h + 22) * 1.4;
      pt.jit = (hash1(h + 23) - 0.5) * 0.05;
      pt.mw = 0.012 + hash1(h + 24) * 0.02;
      pt.mh = 0.006 + hash1(h + 25) * 0.014;
      pt.lump = [hash1(h + 26), hash1(h + 27), hash1(h + 28), hash1(h + 29), hash1(h + 30), hash1(h + 31), hash1(h + 32)];
      pt.hc = ""; pt.dc = "";   // the heap and splash tones, set in seedBed once the palette is read
    }
  })();

  function drawDust(ctx, pt, x, y, a, q, alpha, sizeMul, angle) {
    ctx.globalAlpha = alpha;
    if (q < 0.4) {
      ctx.fillStyle = "#b9b2a3";
      for (let k = 0; k < 3; k++) {
        const ox = (hash1(pt.i * 11 + k * 3) - 0.5) * 5;
        const oy = (hash1(pt.i * 11 + k * 3 + 1) - 0.5) * 5;
        ctx.beginPath(); ctx.arc(x + ox, y + oy, 1.2 * sizeMul, 0, TAU); ctx.fill();
      }
    } else if (q < 0.8) {
      ctx.strokeStyle = "#a39a88"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * 5 * sizeMul, y + Math.sin(angle) * 5 * sizeMul);
      ctx.stroke();
    } else {
      ctx.save();
      ctx.translate(x, y); ctx.rotate(a * 5 + pt.ph);
      ctx.fillStyle = "#8a8272";
      ctx.fillRect(-1.75 * sizeMul, -0.8 * sizeMul, 3.5 * sizeMul, 1.6 * sizeMul);
      ctx.restore();
    }
  }

  function drawAir(ctx, pt, x, y, a, q, alpha, sizeMul, angle) {
    if (q < 0.4) {
      ctx.globalAlpha = alpha * 0.16;
      ctx.fillStyle = "#dfe6ea";
      ctx.beginPath(); ctx.arc(x, y, (3 + q * 20) * sizeMul, 0, TAU); ctx.fill();
    } else if (q < 0.8) {
      ctx.globalAlpha = alpha * 0.25;
      ctx.fillStyle = "#dfe6ea";
      ctx.save();
      ctx.translate(x, y); ctx.rotate(angle);
      ctx.beginPath(); ctx.ellipse(0, 0, 9 * sizeMul, 2.2 * sizeMul, 0, 0, TAU); ctx.fill();
      ctx.restore();
    } else {
      ctx.globalAlpha = alpha * 0.4;
      ctx.strokeStyle = "#dfe6ea"; ctx.lineWidth = 1;
      for (let k = 0; k < 3; k++) {
        const ox = (hash1(pt.i * 17 + k * 3) - 0.5) * 5;
        const oy = (hash1(pt.i * 17 + k * 3 + 1) - 0.5) * 5;
        ctx.beginPath(); ctx.arc(x + ox, y + oy, 1.5 * sizeMul, 0, TAU); ctx.stroke();
      }
    }
  }

  function drawWind(ctx, pt, x, y, a, q, alpha, sizeMul, angle) {
    ctx.globalAlpha = alpha;
    const dirx = Math.cos(angle), diry = Math.sin(angle);
    if (q < 0.4) {
      ctx.strokeStyle = "#cfd6d3"; ctx.lineWidth = 1.3;
      const start = a * 4 + pt.ph;
      ctx.beginPath(); ctx.arc(x, y, 7 * sizeMul, start, start + 1.4); ctx.stroke();
    } else if (q < 0.8) {
      ctx.strokeStyle = "#cfd6d3"; ctx.lineWidth = 1.1;
      const ex = x + dirx * 26 * sizeMul, ey = y + diry * 26 * sizeMul;
      const perpx = -diry, perpy = dirx;
      const side = 10 * Math.sin(a * 3 + pt.ph);
      const cx = (x + ex) / 2 + perpx * side, cy = (y + ey) / 2 + perpy * side;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
    } else {
      ctx.globalAlpha = alpha * 0.6;
      ctx.strokeStyle = "#cfd6d3"; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.lineTo(x + dirx * 34 * sizeMul, y + diry * 34 * sizeMul);
      ctx.stroke();
    }
  }

  function drawColour(ctx, pt, x, y, a, q, alpha, sizeMul, angle, rg) {
    let oil = Math.floor((a + pt.ph) / pt.flip) % 2 === 1;
    if (rg > 0.5) oil = !oil;
    const hueIdx = oil ? pt.hueB : pt.hueA;
    const otherIdx = oil ? pt.hueA : pt.hueB;
    const r = (4 + 5 * sizeMul * (0.6 + 0.4 * Math.sin(a * 2 + pt.ph)));
    if (q < 0.4) {
      if (!oil) {
        ctx.globalAlpha = alpha * 0.55;
        ctx.fillStyle = HUE_FILL[hueIdx];
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      } else {
        ctx.globalAlpha = alpha * 0.9;
        ctx.fillStyle = "#15161a";
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        ctx.globalAlpha = alpha * 0.8;
        ctx.fillStyle = HUE_FILL[hueIdx];
        ctx.beginPath(); ctx.arc(x - 1, y, r * 0.55, 0, TAU); ctx.fill();
      }
    } else if (q < 0.8) {
      const sep = 6 + 14 * Math.sin((q - 0.4) / 0.4 * Math.PI);
      const perpx = -Math.sin(angle), perpy = Math.cos(angle);
      ctx.globalAlpha = alpha * 0.75;
      ctx.fillStyle = HUE_FILL[hueIdx];
      ctx.beginPath(); ctx.arc(x - perpx * sep * 0.5, y - perpy * sep * 0.5, r * 0.6, 0, TAU); ctx.fill();
      ctx.fillStyle = HUE_FILL[otherIdx];
      ctx.beginPath(); ctx.arc(x + perpx * sep * 0.5, y + perpy * sep * 0.5, r * 0.6, 0, TAU); ctx.fill();
    } else {
      ctx.globalAlpha = alpha * 0.35;
      ctx.fillStyle = HUE_FILL[hueIdx];
      ctx.save();
      ctx.translate(x, y); ctx.rotate(angle);
      ctx.beginPath(); ctx.ellipse(0, 0, 14 * sizeMul, 4 * sizeMul, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  function drawLight(ctx, pt, x, y, a, q, alpha, sizeMul) {
    if (q < 0.4) {
      flatGlow(ctx, x, y, 9 * sizeMul, "255,236,190", alpha);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(x, y, 1.6 * sizeMul, 0, TAU); ctx.fill();
    } else if (q < 0.8) {
      // a soft glint: a swelling glow with one short, flat flare through it
      const sw = 0.6 + 0.4 * Math.sin(a * 5 + pt.ph);
      flatGlow(ctx, x, y, 11 * sizeMul * sw, "255,240,205", alpha * 0.8);
      ctx.globalAlpha = alpha * 0.55 * sw;
      ctx.fillStyle = "#fff3d6";
      ctx.beginPath(); ctx.ellipse(x, y, 8 * sizeMul * sw, 0.9 * sizeMul, pt.ph * 0.2, 0, TAU); ctx.fill();
    } else {
      if (Math.sin(a * 18 + pt.ph) > 0) {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x - 0.75 * sizeMul, y - 0.75 * sizeMul, 1.5 * sizeMul, 1.5 * sizeMul);
      }
    }
  }

  function drawSound(ctx, pt, x, y, a, q, alpha, sizeMul) {
    // one ripple that widens and thins out, then nothing
    if (q >= 0.8) return;
    const k = q / 0.8;
    ctx.globalAlpha = alpha * 0.5 * (1 - k);
    ctx.strokeStyle = "#9fb4c8"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(x, y, (4 + 20 * k) * sizeMul, (3 + 14 * k) * sizeMul, 0, 0, TAU); ctx.stroke();
  }

  // pure pose at time t: motion, wind wobble, slosh and rage push. Writes POS (no allocation)
  function posAt(pt, t, originX, W, H, sl) {
    const a = t - pt.birth;
    const q = a / pt.life;
    const originY = 0.46 * H;

    let angle = pt.ang + pt.curl * q;
    if (pt.kind === "wind") {
      let windTerm = 0.9 * Math.sin(a * 1.7 + pt.ph);
      const seg = Math.floor(a * 1.3);
      if (hash1(pt.i * 31 + seg) > 0.5) windTerm = -windTerm;
      angle += windTerm;
    }
    const d = Math.pow(q, 0.8) * pt.spd * 0.62 * Math.hypot(W, H) * 0.62;
    let x = originX + Math.cos(angle) * d;
    let y = originY + Math.sin(angle) * d;

    const sfac = (pt.wgt - 0.5) * 2 * Math.min(1, q * 3);
    const s0 = sl || slosh(t);
    x += s0.x * sfac;
    y += s0.y * sfac;

    const rg = rageAt(t, x, y);
    x += PUSH.x * 26;
    y += PUSH.y * 26;

    POS.x = x; POS.y = y; POS.angle = angle; POS.rg = rg; POS.a = a; POS.q = q;
    return POS;
  }

  function draw(ctx) {
    if (typeof G.secs !== "function") return;
    const W = G.W, H = G.H;
    if (!W || !H) return;
    const s = G.secs("break") - 2.1;
    if (s < 0) return;
    surfFrame(s, W, H);   // the sea plan reads the surface; drawSea may run after

    const originX = G.sx(0);
    const sl = slosh(s);
    // break only: no confetti inside the old-one figures or the caption band
    const gate = window.GenOld && GenOld.figCover && G.BEATS[G.beat].id === "break";
    const band = gate && GenOld.captionBand ? GenOld.captionBand() : null;

    for (const pt of PARTS) {
      if (pt.sea) { drawSeaPart(ctx, pt, s, originX, W, H, sl, gate, band); continue; }
      if (pt.splits && s >= pt.splitT) {
        drawSplit(ctx, pt, s, originX, W, H);
        continue;
      }

      const a = s - pt.birth;
      if (a < 0 || a > pt.life) continue;

      const P = posAt(pt, s, originX, W, H, sl);
      const x = P.x, y = P.y, angle = P.angle, rg = P.rg, q = P.q;

      if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue;
      if (gate && (GenOld.figCover(x, y) > 0 || (band && y > band.y0 && y < band.y1))) continue;

      let fadeOut;
      if (q < 0.8) fadeOut = 1;
      else fadeOut = pt.settle ? 1 : 1 - (q - 0.8) / 0.2;
      const alpha = Math.min(1, a / 0.25) * fadeOut * 0.9;
      if (alpha < 0.02) continue;

      let sizeMul = pt.size * (1 + 0.6 * rg);
      if (pt.settle && q >= 0.8) sizeMul *= (1 - (q - 0.8) / 0.2);

      drawKind(ctx, pt, x, y, a, q, alpha, sizeMul, angle, rg);
    }
    ctx.globalAlpha = 1; ctx.lineWidth = 1;
  }

  function drawKind(ctx, pt, x, y, a, q, alpha, sizeMul, angle, rg) {
    switch (pt.kind) {
      case "dust": drawDust(ctx, pt, x, y, a, q, alpha, sizeMul, angle); break;
      case "air": drawAir(ctx, pt, x, y, a, q, alpha, sizeMul, angle); break;
      case "wind": drawWind(ctx, pt, x, y, a, q, alpha, sizeMul, angle); break;
      case "colour": drawColour(ctx, pt, x, y, a, q, alpha, sizeMul, angle, rg); break;
      case "light": drawLight(ctx, pt, x, y, a, q, alpha, sizeMul); break;
      case "sound": drawSound(ctx, pt, x, y, a, q, alpha, sizeMul); break;
    }
  }

  // a sea-bound particle: it flies its own path to 0.55 of its life, then arcs down (gravity-like, from
  // its heading) to the liquid beside the nearest form. Pure in s. PLAN holds the fall start (x1, y1)
  // and velocity, the landing (lx, yl), the fall start tf, the landing time tl and the fall length T
  const PLAN = { px: 0, py: 0, p: 0, tf: 0, tl: 0, T: 0, x1: 0, y1: 0, vx: 0, vy: 0, lx: 0, yl: 0, fr: false };
  function seaPlan(pt, s, originX, W, H, camOff, spW) {
    const tf = pt.birth + pt.life * 0.2;
    let P = posAt(pt, tf, originX, W, H);
    const x1 = P.x, y1 = P.y;
    P = posAt(pt, tf - 0.1, originX, W, H);
    PLAN.vx = clamp((x1 - P.x) * 10, -0.3 * W, 0.3 * W); PLAN.vy = (y1 - P.y) * 10;
    // the nearest form (world x, wrapped) is the heap it falls to
    const uw = (x1 + camOff) / W;
    let bd = 0, bm = 1e9, bf = false;
    for (let n = 0; n < FORMU.length; n++) {
      let d = ((FORMU[n] - uw) % SEA_SPAN + SEA_SPAN) % SEA_SPAN;
      if (d > SEA_SPAN / 2) d -= SEA_SPAN;
      if (Math.abs(d) < bm) { bm = Math.abs(d); bd = d; bf = FORMF[n]; }
    }
    PLAN.fr = bf;
    let lx = ((uw + bd + pt.jit) * W - camOff) % spW;
    lx = (lx + spW) % spW;
    if (lx > spW - 0.2 * W) lx -= spW;
    const lvl = Math.min(shAt(lx, W) + (bf ? H * 0.036 : 0), H * 0.96);   // the drawn surface, or the pile floor while it is still low
    const drop = Math.max(lvl + H * (0.004 - 0.016 * pt.gy) - y1, 2);
    PLAN.x1 = x1; PLAN.y1 = y1; PLAN.lx = lx; PLAN.yl = y1 + drop;
    PLAN.T = pt.fall + drop / H * 0.6;
    PLAN.tf = tf; PLAN.tl = tf + PLAN.T;
  }

  // the falling part at s (tf < s < tl): a curve from the fall start with its heading, ending on the landing
  function seaFallAt(s) {
    const T = PLAN.T, tau = s - PLAN.tf, p = tau / T;
    const drop = PLAN.yl - PLAN.y1;
    const vy0 = Math.min(PLAN.vy, 0.8 * drop / T);
    const g = 2 * (drop - vy0 * T) / (T * T);
    PLAN.px = PLAN.x1 + PLAN.vx * tau + (PLAN.lx - PLAN.x1 - PLAN.vx * T) * p * p;
    PLAN.py = PLAN.y1 + vy0 * tau + 0.5 * g * tau * tau;
    PLAN.p = p;
  }

  // what a landed sea-bound particle leaves: a faint ripple and a dark blob that sinks and fades into the water within a second
  function drawLanded(ctx, pt, s, W, H, fade) {
    const k = s - PLAN.tl, lx = PLAN.lx;
    if (lx < -0.1 * W || lx > W * 1.1 || k > 0.6 || G.reduced) return;
    // a splash where it enters the water: a few short upward flecks and an expanding flat ring, about 0.6 s
    const z = (0.004 + pt.size * 0.0025) * H, q = k / 0.6, yl = shAt(clamp(lx, 0, W), W) + 1;
    ctx.globalAlpha = 0.6 * (1 - q) * fade;
    ctx.strokeStyle = "rgb(96,104,100)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(lx, yl, z * (1.5 + 5 * q), z * (0.3 + 0.9 * q), 0, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = "rgb(120,128,124)";
    const rise = z * 5 * Math.sin(Math.PI * Math.min(1, q * 1.3));
    for (let f = 0; f < 4; f++) {
      const dx = (f - 1.5) * z * (1.2 + 0.4 * ((pt.jit * 97 + f) % 1 + 1) % 1), fh = rise * (0.6 + 0.4 * (f & 1));
      ctx.fillRect(Math.round(lx + dx * (0.6 + q)), Math.round(yl - fh), 2, Math.max(2, Math.round(fh * 0.5)));
    }
    ctx.globalAlpha = 1;
  }

  // a sea-bound particle in the elements draw: flight and fall in its family look; before the liquid is
  // drawn (s < 10.2) its landed heap is drawn here too, so the sea rises out of them
  function drawSeaPart(ctx, pt, s, originX, W, H, sl, gate, band) {
    const a = s - pt.birth;
    if (a < 0) return;
    seaPlan(pt, s, originX, W, H, G.cam * W, SEA_SPAN * W);
    slosh(s);   // the plan posed other times
    if (s >= PLAN.tl) return;   // what landed is drawn by drawSea, on the liquid
    let x, y, tx = 0, ty = 0, rg = 0, angle = pt.ang, alpha = Math.min(1, a / 0.25) * 0.9;
    if (s < PLAN.tf) {
      const P = posAt(pt, s, originX, W, H, sl);
      x = P.x; y = P.y; angle = P.angle; rg = P.rg;
    } else {
      seaFallAt(Math.max(s - 0.15, PLAN.tf));
      tx = PLAN.px; ty = PLAN.py;
      seaFallAt(s);
      x = PLAN.px; y = PLAN.py;
      alpha *= 1 - smooth(clamp((PLAN.p - 0.8) / 0.2, 0, 1));
    }
    if (x < -40 || x > W + 40 || y < -40 || y > H + 40) return;
    if (gate && s < PLAN.tf && (GenOld.figCover(x, y) > 0 || (band && y > band.y0 && y < band.y1))) return;
    if (alpha < 0.02) return;
    drawKind(ctx, pt, x, y, a, Math.min(a / pt.life, 0.78), alpha, pt.size * (1 + 0.6 * rg), angle, rg);
    if (s >= PLAN.tf) {
      // the fall reads: a filled tapering tail back along the arc and a chunk in the family colour at the head
      const hs = 4 + pt.size * 1.5, c = pt.hc || "#a39a88";
      const dx = x - tx, dy = y - ty, dl = Math.sqrt(dx * dx + dy * dy);
      if (dl > 1) {
        const nx = -dy / dl * hs * 0.5, ny = dx / dl * hs * 0.5;
        ctx.globalAlpha = alpha * 0.75;
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.moveTo(x + nx, y + ny); ctx.lineTo(tx, ty); ctx.lineTo(x - nx, y - ny); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = alpha;
      ctx.fillStyle = c;
      ctx.fillRect(Math.round(x - hs / 2), Math.round(y - hs / 2), Math.round(hs), Math.round(hs));
      ctx.fillStyle = "#d6cfbf";
      ctx.fillRect(Math.round(x - hs / 4), Math.round(y - hs / 2), Math.round(hs / 2), Math.round(hs / 2));
    }
  }

  // frozen-then-snapping fate of a split particle: sink, settle or rise, in held steps
  function drawSplit(ctx, pt, s, originX, W, H) {
    const P0 = posAt(pt, pt.splitT, originX, W, H);
    const x0 = P0.x, y0 = P0.y, angle0 = P0.angle, rg0 = P0.rg, a0 = P0.a, q0 = P0.q;
    if (x0 < -40 || x0 > W + 40 || y0 < -40 || y0 > H + 40) return;

    let fadeOut0;
    if (q0 < 0.8) fadeOut0 = 1;
    else fadeOut0 = pt.settle ? 1 : 1 - (q0 - 0.8) / 0.2;
    const alpha0 = Math.min(1, a0 / 0.25) * fadeOut0 * 0.9;

    let sizeMul0 = pt.size * (1 + 0.6 * rg0);
    if (pt.settle && q0 >= 0.8) sizeMul0 *= (1 - (q0 - 0.8) / 0.2);

    let fate = pt.fate;
    if (fate === 1) {
      const ux = G.cam + (x0 - W / 2) / W;
      if (ux < G.SPAN_START_U + 0.02 || ux > G.ROOT_U + 0.2) fate = 0;
    }

    let tx, ty;
    if (fate === 1) {
      tx = x0;
      ty = G.DECK * H - 0.012 * H - 1 - pt.gy * 1.5;
    } else if (fate === 0) {
      tx = x0;
      ty = H * (1 - SEA_H * (0.2 + 0.7 * pt.gy));
    } else {
      tx = x0 + (hash1(pt.i * 7 + 17) - 0.5) * 0.04 * W;
      ty = -30 - pt.gy * 40;
    }

    const u = s - pt.splitT;
    const n = pt.steps;
    const k = G.reduced ? n : (u < pt.hold ? 0 : Math.min(n, Math.floor((u - pt.hold) / pt.stepDur) + 1));

    const f = k / n;
    const x = mix(x0, tx, f);
    const y = mix(y0, ty, f);

    if (k < n) {
      let alpha = alpha0, sizeMul = sizeMul0;
      if (fate === 2) alpha *= (1 - f);
      else sizeMul *= mix(1, 0.5, f);

      switch (pt.kind) {
        case "dust": drawDust(ctx, pt, x, y, a0, q0, alpha, sizeMul, angle0); break;
        case "air": drawAir(ctx, pt, x, y, a0, q0, alpha, sizeMul, angle0); break;
        case "wind": drawWind(ctx, pt, x, y, a0, q0, alpha, sizeMul, angle0); break;
        case "colour": drawColour(ctx, pt, x, y, a0, q0, alpha, sizeMul, angle0, rg0); break;
        case "light": drawLight(ctx, pt, x, y, a0, q0, alpha, sizeMul); break;
        case "sound": drawSound(ctx, pt, x, y, a0, q0, alpha, sizeMul); break;
      }
      return;
    }

    if (fate === 2) return;

    let alpha = 0.55 * Math.min(1, alpha0 / 0.9 + 0.3);
    if (fate === 0) {
      const tl = G.reduced ? pt.splitT : pt.splitT + pt.hold + (n - 1) * pt.stepDur;
      alpha *= clamp(1 - (s - tl) / 2.5, 0, 1);
      if (alpha <= 0) return;
    }
    const gs = pt.size > 2.2 ? 2 : 1;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = GRAIN_FILL[pt.hueA];
    ctx.fillRect(Math.round(x), Math.round(y), gs, gs);
  }

  // the sea at the frame bottom: a dark crooked waste (bent spires, hanging ledges, hollow loops,
  // thin warped lines) in washed-out families that drift with world x, writhing slowly
  // the liquid surface at x: SY2 interpolated, no allocation
  function seaY(x, W) {
    const nw = SY2.length - 1, u = clamp(x / W, 0, 1) * nw, k = Math.min(nw - 1, Math.floor(u));
    return SY2[k] + (SY2[k + 1] - SY2[k]) * (u - k);
  }

  // the surface at screen x from the 121 drawn points
  function shAt(x, W) {
    const u = clamp(x / W, 0, 1) * NS, k = Math.min(NS - 1, Math.floor(u));
    return SH[k] + (SH[k + 1] - SH[k]) * (u - k);
  }

  // the liquid's level follows the matter that has landed: a nominal landing time per sea-bound particle
  // (its fall start plus the fall), counted against s. Pure in s. SRISE is 0 with nothing landed, 1 at 60%
  const SEA_LT = [];
  let SRISE = 0, SBASE = 0;
  const SK = new Float64Array(5).fill(-1);
  function surfFrame(s, W, H) {
    const camOff = G.cam * W, t = G.reduced ? 0 : G.t;
    if (SK[0] === s && SK[1] === camOff && SK[2] === t && SK[3] === W && SK[4] === H) return;
    SK[0] = s; SK[1] = camOff; SK[2] = t; SK[3] = W; SK[4] = H;
    if (!SEA_LT.length) for (const pt of PARTS) if (pt.sea) SEA_LT.push(pt.birth + pt.life * 0.2 + pt.fall + 0.3);
    let n = 0;
    for (let i = 0; i < SEA_LT.length; i++) if (SEA_LT[i] <= s) n++;
    SRISE = smooth(Math.pow(clamp(n / (0.6 * SEA_LT.length), 0, 1), 0.75));
    SBASE = H * (0.785 + (1 - SRISE) * (0.095 + 0.04 * (1 - smooth(clamp((s - 2) / 1.5, 0, 1)))));   // a ~50 px strip from s 2, rising to ~15% of the frame above the letterbox
    const wp = camOff / W, nw = WV.length - 1;
    for (let k = 0; k <= nw; k++) SY2[k] = SBASE + H * 0.4 * (0.007 * Math.sin(k * 0.8 + t * 0.3 + wp * 2) + 0.004 * Math.sin(k * 1.9 - t * 0.2 + wp * 3.7) + 0.008 * WV[k]);
    seaSurf(W, H, camOff, t, nw);
  }

  // fills SH (the engraved surface: a seeded kind per world segment, swells against the piers) and the curl list
  function seaSurf(W, H, camOff, t, nw) {
    const segW = W * 0.22, i0 = Math.floor(camOff / segW), U = (window.GenVoid && GenVoid.SPAN_BAY_U) || 0.46;
    for (let j = 0; j < SGN_; j++) {
      const i = i0 + j;
      SGT[j] = Math.floor(hash1(i * 131 + 11) * 6);
      SGA[j] = 0.012 + 0.018 * hash1(i * 131 + 23);
      SGP[j] = hash1(i * 131 + 37) * TAU;
      SGD[j] = hash1(i * 131 + 53) < 0.5 ? -1 : 1;
      SGK[j] = 4 + Math.floor(hash1(i * 131 + 71) * 5);
    }
    PIN = 0;
    for (let b = Math.floor((G.cam - 0.5) / U) - 1, e = Math.ceil((G.cam + 0.5) / U) + 1; b <= e && PIN < 8; b++) {
      const xb = G.sx(b * U);
      if (xb < -W * 0.1 || xb > W * 1.1) continue;
      PIX[PIN] = xb; PIH[PIN] = SRISE * H * (0.022 + 0.011 * hash1(b * 131 + 97)); PID[PIN] = b % 2 ? 1 : -1; PIN++;
    }
    const R = W * 0.12;
    for (let k = 0; k <= NS; k++) {
      const x = k / NS * W, sf = (x + camOff) / segW, si = Math.floor(sf), u = sf - si, j = si - i0;
      const A = SGA[j], env = Math.sin(Math.PI * u), d = SGD[j];
      let lift = 0;
      switch (SGT[j]) {
        case 0: { const w = d > 0 ? u : 1 - u; lift = A * Math.pow(w, 1.6) * (1 - w) / 0.177; break; }
        case 1: lift = A * env * env; break;
        case 2: lift = A * 0.6 * Math.abs((u * SGK[j] + SGP[j]) % 1 - 0.5) * 2 * env; break;
        case 3: lift = A * 0.4 * env * (0.6 + 0.4 * Math.sin(u * TAU + SGP[j])); break;
        case 4: lift = A * 0.5 * env * env; break;
        default: lift = A * 0.25 * env;
      }
      lift += 0.0035 * env * Math.sin(t * 0.5 + sf * 5 + SGP[j]);
      lift *= SRISE * 0.15;   // a gentle swell of a few px; the piers carry the height
      const uu = k / NS * nw, kk = Math.min(nw - 1, Math.floor(uu));
      let y = SY2[kk] + (SY2[kk + 1] - SY2[kk]) * (uu - kk) - H * lift;
      for (let p = 0; p < PIN; p++) {
        const dx = Math.abs(x - PIX[p]) / R;
        if (dx < 1) y -= PIH[p] * 0.5 * (1 + Math.cos(Math.PI * dx));   // a smooth rounded bulge
      }
      SH[k] = y;
    }
  }


  function drawSea(ctx) {
    if (typeof G.secs !== "function") return;
    const W = G.W, H = G.H;
    if (!W || !H) return;
    const s = G.secs("break") - 2.1;
    if (s < 2) return;
    surfFrame(s, W, H);

    const camOff = G.cam * W;
    const t = G.reduced ? 0 : G.t;
    const spW = SEA_SPAN * W;
    ctx.globalAlpha = 1;
    const sy = SBASE;
    drawObjects(ctx, OBJ_BACK, s, W, H, camOff, t, false);
    // the liquid: one dark murky slate body to the canvas bottom, in three flat bands (clipped to the surface), a
    // thin lighter scum line along the top and a few slow ripple dashes
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let k = 0; k <= NS; k++) ctx.lineTo(k / NS * W, SH[k]);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fillStyle = "rgb(38,44,42)";
    ctx.globalAlpha = 1;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = "rgb(31,35,34)";
    const vb = H * 0.935;   // the letterbox bars hide the canvas below this
    ctx.fillRect(0, Math.round(sy + (vb - sy) * 0.45), W, H);
    ctx.fillStyle = "rgb(24,27,27)";
    ctx.fillRect(0, Math.round(sy + (vb - sy) * 0.8), W, H);
    ctx.restore();
    ctx.beginPath();
    for (let k = 0; k <= NS; k++) { if (k) ctx.lineTo(k / NS * W, SH[k] + 1); else ctx.moveTo(0, SH[0] + 1); }
    ctx.strokeStyle = "rgb(62,68,66)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = "rgb(50,56,54)";
    ctx.lineWidth = 1.5;
    for (let p = 0; p < PIN; p++) {   // curved ripple dashes on each swell's flanks
      if (PIH[p] < 6) continue;
      for (let f = 0; f < 4; f++) {
        const x = PIX[p] + (f < 2 ? -1 : 1) * W * (0.025 + 0.035 * (f & 1)), y = shAt(clamp(x, 0, W), W) + 6 + 5 * (f & 1);
        ctx.beginPath(); ctx.arc(x, y + 10, 10, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
      }
    }
    // a soft lighter band just under the surface line
    ctx.beginPath();
    for (let k = 0; k <= NS; k++) { if (k) ctx.lineTo(k / NS * W, SH[k] + H * 0.012); else ctx.moveTo(0, SH[0] + H * 0.012); }
    ctx.strokeStyle = "rgb(45,51,49)";
    ctx.lineWidth = H * 0.014;
    ctx.stroke();
    // swell sheen: streaks following each pier's curve (about +14 lightness)
    ctx.strokeStyle = "rgb(50,56,54)";
    ctx.lineWidth = 2;
    for (let p = 0; p < PIN; p++) {
      if (PIH[p] < 6) continue;
      for (let c = 0; c < 2; c++) {
        const k0 = Math.max(0, Math.floor((PIX[p] - W * (0.1 - c * 0.03)) / W * NS)), k1 = Math.min(NS, Math.ceil((PIX[p] + W * (0.1 - c * 0.03)) / W * NS));
        const off = H * (0.02 + 0.016 * c);
        ctx.beginPath();
        for (let k = k0; k <= k1; k++) { if (k > k0) ctx.lineTo(k / NS * W, SH[k] + off); else ctx.moveTo(k / NS * W, SH[k] + off); }
        ctx.stroke();
      }
      // a broken reflection under the pier: stacked dashes, darker than the water
      ctx.fillStyle = "rgb(26,30,30)";
      for (let j = 0; j < 4; j++) {
        const w = W * 0.05 * (1 - j * 0.18), wob = G.reduced ? 0 : Math.sin(t * 1.1 + j * 1.7 + p) * 4;
        ctx.fillRect(Math.round(PIX[p] - w / 2 + wob), Math.round(shAt(clamp(PIX[p], 0, W), W) + H * (0.03 + 0.03 * j)), Math.round(w), 3);
      }
    }
    // long thin sheen streaks drifting sideways, shorter with depth
    ctx.fillStyle = "rgb(50,56,54)";
    for (let k = 0; k < STREAK.length; k++) {
      const a = STREAK[k], sp = W * 1.3;
      for (let d = 0; d < 2; d++) {
        const x = ((a.u * sp + d * sp * 0.37 - t * a.sp * 0.5 - camOff * 0.6) % sp + sp) % sp - sp * 0.1;
        const w = a.w * W * (d ? 1.6 : 2.4) * (d ? 0.55 : 1);
        if (x < -w || x > W) continue;
        ctx.fillRect(Math.round(x), Math.round(shAt(clamp(x, 0, W), W) + H * (a.y * (1 + d * 3) + 0.01)), Math.round(w), 2);
      }
    }
    ctx.globalAlpha = 1;
    drawObjects(ctx, OBJ_BACK, s, W, H, camOff, t, true);
    drawObjects(ctx, OBJ_FRONT, s, W, H, camOff, t, false);
    drawObjects(ctx, OBJ_FRONT, s, W, H, camOff, t, true);
    const fade = s < DEB_END ? 1 - smooth(clamp((s - 15.5) / 3.6, 0, 1)) : 0, ox = G.sx(0);
    if (fade > 0) for (const pt of PARTS) {
      if (!pt.sea || pt.birth > s) continue;
      seaPlan(pt, s, ox, W, H, camOff, spW);
      if (s >= PLAN.tl && !PLAN.fr) drawLanded(ctx, pt, s, W, H, fade);
    }
    // the splashes and heaps that land near the front objects
    if (fade > 0) for (const pt of PARTS) {
      if (!pt.sea || pt.birth > s) continue;
      seaPlan(pt, s, ox, W, H, camOff, spW);
      if (s >= PLAN.tl && PLAN.fr) drawLanded(ctx, pt, s, W, H, fade);
    }
    if (s >= 10.2) drawAirDrift(ctx, W, H);   // the air rides with the bed, over the land
  }

  // the sea-bound particles' heaps fade as the formed shapes rise through them
  const DEB_END = 19.5, RISE = 3.5;
  const FORMU = [], FORMF = [];

  // washed-out tone of one of the five GenEldPal.SEA families (fi), dimmed by k
  const hexN = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  function seaTone(fi, tone, k) {
    k = (k || 1) * 0.82;
    const a = hexN(GenEldPal.SEA[fi][tone]);
    return "rgb(" + Math.round(a[0] * k) + "," + Math.round(a[1] * k) + "," + Math.round(a[2] * k) + ")";
  }
  // a flat tone one step darker (the near-shore forms)
  const dark = c => { const a = c.slice(4, -1).split(","); return "rgb(" + Math.round(a[0] * 0.8) + "," + Math.round(a[1] * 0.8) + "," + Math.round(a[2] * 0.8) + ")"; };
  // each form picks its own family, never its neighbour's; about a third follow a slow world-x bias
  let famPrev = 0;
  function pickFam(rf, u) {
    let i = rf() < 0.35 ? Math.floor(u / SEA_SPAN * 5) % 5 : Math.floor(rf() * 5);
    if (i === famPrev) i = (i + 1 + Math.floor(rf() * 4)) % 5;
    return famPrev = i;
  }

  // the air's specks keep a light tone of the old hues
  const bedTone = (h, k) => {
    const [r, g, b] = h.split(",").map(Number);
    const m = (r + g + b) / 3;
    return "rgb(" + Math.round(mix(m, r, 0.4) * k) + "," + Math.round(mix(m, g, 0.4) * k) + "," + Math.round(mix(m, b, 0.4) * k) + ")";
  };
  const AIR_LIGHT = HUES.map(h => bedTone(h, 2.6));
  const SEA_SPAN = 5;   // the waste repeats every 5 screen widths of camera pan; each palette family holds one
  const PX = new Float32Array(192), PY = new Float32Array(192), RE = new Int16Array(16);
  let PN = 0, RN = 0;
  const SX = new Float32Array(10), SY = new Float32Array(10), SA = new Float32Array(10);
  let bandW = 0, bandH = 0, bandPath = null;
  const SEA_F = [];
  // the engraved surface: 121 points, per-segment wave kinds, unit curl shapes precomputed once
  const NS = 120, SH = new Float32Array(NS + 1);
  const SGN_ = 8, SGT = new Uint8Array(SGN_), SGA = new Float32Array(SGN_), SGP = new Float32Array(SGN_), SGD = new Float32Array(SGN_), SGK = new Float32Array(SGN_);
  const CUR_N = 8, CUR_P = 14;
  const CURL = new Float32Array(CUR_N * CUR_P * 2);
  const CLN_MAX = 48, CLX = new Float32Array(CLN_MAX), CLY = new Float32Array(CLN_MAX), CLW = new Float32Array(CLN_MAX), CLH = new Float32Array(CLN_MAX), CLD = new Float32Array(CLN_MAX), CLV = new Uint8Array(CLN_MAX);
  const WAV = new Float32Array([0, 0, 0.35, 0.15, 0.72, 0.6, 0.98, 1, 1.14, 0.82, 0.97, 0.66, 1, 0]);   // one breaking crest: long rise, hook, sharp drop
  const PIX = new Float32Array(8), PIH = new Float32Array(8), PID = new Float32Array(8);
  let CLN = 0, PIN = 0;
  (function seedCurls() {
    const T = [-1, 0, -0.62, 0.2, -0.3, 0.55, 0, 0.92, 0.35, 1, 0.72, 0.88, 0.95, 0.6, 0.9, 0.32, 0.68, 0.24, 0.6, 0.4, 0.72, 0.55, 0.58, 0.68, 0.38, 0.56, 0.3, 0];
    const r = mulberry(6203);
    for (let v = 0; v < CUR_N; v++) {
      for (let i = 0; i < CUR_P; i++) {
        const base = T[i * 2 + 1] === 0;
        const jv = v < 4 ? 1 : 2.4;   // the later shapes wander further: leaner, hookier, blunter
        CURL[(v * CUR_P + i) * 2] = T[i * 2] + (r() - 0.5) * 0.12 * jv;
        CURL[(v * CUR_P + i) * 2 + 1] = base ? 0 : T[i * 2 + 1] + (r() - 0.5) * 0.1 * jv;
      }
    }
  })();
  const WV = new Float32Array(13), STREAK = new Array(5), SY2 = new Float32Array(13);
  const RFX = new Float32Array(48), RFH = new Float32Array(48), RFW = new Float32Array(48), RFP = new Float32Array(48);
  let RFN = 0;
  // the strange objects rising out of the water: 7 per screen width, spaced apart; each a seeded Path2D in local
  // units (base at 0,0, 62-120 high, y up is negative), built once, then moved, tilted and scaled per frame
  // washed-out bridge values (lit, shade): the bridge's greys pushed toward the murky water, a little lighter
  const FAM = [["#7e8886", "#565e5c"], ["#85877b", "#5b5d53"], ["#7a858c", "#525b61"]];
  const OBJ_N = 21, OBJ_SPAN = 3, OBJ = [], OBJ_BACK = [], OBJ_FRONT = [];
  let boxCv = null;
  (function seedObjects() {
    const r = mulberry(5521);
    for (let i = 0; i < OBJ_N; i++) {
      const fam = FAM[i % 3], kind = Math.floor(r() * 5), h = 62 + r() * 58, p = new Path2D();
      const o = { i, u: (i + 0.5 + (r() - 0.5) * 0.5) / OBJ_N * OBJ_SPAN, front: i % 5 === 2, p, rule: "nonzero", hw: 0.18 * h,
        tilt: (8 + r() * 32) * (i % 2 ? 1 : -1) * Math.PI / 180, ph: r() * TAU, rs: 6 + r() * 2, c: fam[0], cs: fam[1], split: 0 };
      // a polygon from flat points, left side up, jagged top, right side down (one winding for every piece)
      const poly = a => { p.moveTo(a[0], a[1]); for (let k = 2; k < a.length; k += 2) p.lineTo(a[k], a[k + 1]); p.closePath(); };
      // a broken edge from xa to xb near height y: n - 1 teeth of random depth
      const jag = (xa, xb, y, n, amp) => { const a = []; for (let k = 1; k < n; k++) a.push(xa + (xb - xa) * k / n + (r() - 0.5) * amp * 0.5, y - r() * amp); return a; };
      let xl = 0, xr = 0;
      if (kind === 0) {   // a curved slab chunk with a deck ledge
        const w0 = h * (0.1 + r() * 0.07), bend = (r() - 0.5) * h * 0.5, L = [], R = [];
        for (let k = 0; k <= 8; k++) { const t = k / 8, c = bend * t * t, w = w0 * (1 - t * 0.3); L.push(c - w, -h * t); R.push(c + w, -h * t); }
        const a = L.slice();
        a.push(...jag(L[16], R[16], -h, 4 + Math.floor(r() * 3), h * 0.1));
        for (let k = 8; k >= 0; k--) a.push(R[k * 2], R[k * 2 + 1]);
        poly(a);
        const ly = -h * (0.35 + r() * 0.25), lc = bend * 0.25, ll = h * (0.2 + r() * 0.15), lr = h * (0.12 + r() * 0.15);
        poly([lc - w0 - ll, ly, lc - w0 - ll * 0.8, ly - h * 0.07, ...jag(lc - w0 - ll * 0.8, lc + w0 + lr, ly - h * 0.07, 3, h * 0.03), lc + w0 + lr, ly - h * 0.05, lc + w0 + lr * 0.9, ly + h * 0.03]);
        xl = Math.min(bend - w0, -w0 - ll); xr = Math.max(bend + w0, w0 + lr);
      } else if (kind === 1) {   // a snapped pier with its knee
        const w = h * (0.08 + r() * 0.04), kn = h * (0.3 + r() * 0.15), kf = 1.5 + r() * 0.6, top = -h * (0.7 + r() * 0.3);
        poly([-w, 0, -w, -kn, -w * kf, -kn - h * 0.05, -w * kf, -kn - h * 0.13, -w * 0.8, -kn - h * 0.2, -w * 0.8, top * 0.8, ...jag(-w * 0.8, w * 0.7, top, 4, h * 0.12),
          w * 0.7, top * 0.85, w * 0.8, -kn - h * 0.15, w * kf * 0.9, -kn - h * 0.1, w * kf * 0.9, -kn + h * 0.02, w, -kn + h * 0.06, w, 0]);
        xl = -w * kf; xr = w * kf;
      } else if (kind === 2) {   // a leaning tower stub, stepped, with a cap block
        const w = h * (0.12 + r() * 0.05), sk = (r() - 0.5) * h * 0.2, ty = -h * (0.7 + r() * 0.3), sy = ty * (0.45 + r() * 0.1);
        poly([-w, 0, -w * 0.9 + sk * 0.4, sy, -w * 1.3 + sk * 0.4, sy, -w * 1.3 + sk * 0.4, sy - h * 0.05, -w * 0.7 + sk, ty * 0.9, ...jag(-w * 0.7 + sk, w * 0.6 + sk, ty, 3, h * 0.1),
          w * 0.6 + sk, ty * 0.92, w * 1.3 + sk * 0.4, sy - h * 0.05, w * 1.3 + sk * 0.4, sy, w * 0.9 + sk * 0.4, sy, w, 0]);
        const cx = sk + w * 0.1, cw = w * 0.5;
        poly([cx - cw, ty, cx - cw, ty - h * 0.12, cx + cw * 0.3, ty - h * 0.17, cx + cw, ty - h * 0.1, cx + cw, ty]);
        xl = -w * 1.3 + Math.min(0, sk); xr = w * 1.3 + Math.max(0, sk);
      } else if (kind === 3) {   // a nest fragment on a broken stem
        const sw = h * 0.07, sy = -h * 0.42, bw = h * (0.22 + r() * 0.1), bx = (r() - 0.5) * h * 0.12;
        poly([-sw * 1.3, 0, -sw, sy, ...jag(-sw, sw, sy, 2, h * 0.05), sw, sy, sw * 1.3, 0]);
        poly([bx - bw, sy - h * 0.22, bx - bw * 0.7, sy - h * 0.04, bx - bw * 0.2, sy + h * 0.04, bx + bw * 0.4, sy + h * 0.02, bx + bw * 0.85, sy - h * 0.08, bx + bw, sy - h * 0.2,
          ...jag(bx + bw, bx - bw, sy - h * 0.2, 5, h * 0.12)]);
        xl = bx - bw; xr = bx + bw;
      } else {   // a curved limb rib, tapering to a jagged tip, with a spur
        const w0 = h * (0.06 + r() * 0.03), bend = (r() < 0.5 ? -1 : 1) * h * (0.25 + r() * 0.25), L = [], R = [];
        for (let k = 0; k <= 8; k++) { const t = k / 8, c = bend * Math.sin(t * 1.5) * 0.7, w = w0 * (1 - t * 0.75) + 1.5; L.push(c - w, -h * t); R.push(c + w, -h * t); }
        const a = L.slice();
        a.push(...jag(L[16], R[16], -h, 3, h * 0.08));
        for (let k = 8; k >= 0; k--) a.push(R[k * 2], R[k * 2 + 1]);
        poly(a);
        const sp = bend > 0 ? -1 : 1, sx0 = L[12], sy0 = L[13];
        poly([sx0, sy0 + h * 0.06, sx0 + sp * h * 0.18, sy0 - h * 0.1, sx0 + sp * h * 0.1 + w0 * 2, sy0 - h * 0.12, sx0 + w0 * 2, sy0 - h * 0.02]);
        xl = Math.min(0, bend * 0.7) - w0 - h * 0.18; xr = Math.max(0, bend * 0.7) + w0 + h * 0.18;
      }
      o.hw = Math.max(Math.abs(xl), Math.abs(xr));
      o.split = xl + (xr - xl) * 0.3;
      o.h = h;
      objBox(o);
      OBJ.push(o);
      (o.front ? OBJ_FRONT : OBJ_BACK).push(o);
    }
  })();
  // the tilted object's box at scale 1 (xl..xr left and right of the base, bh high), by rasterising it once

  function objBox(o) {
    if (!boxCv) { boxCv = document.createElement("canvas"); boxCv.width = boxCv.height = 480; }
    const c = boxCv.getContext("2d", { willReadFrequently: true });
    c.clearRect(0, 0, 480, 480);
    c.save();
    c.translate(240, 300);
    c.rotate(o.tilt);
    c.fillStyle = "#000";
    c.fill(o.p, o.rule);
    c.restore();
    const d = c.getImageData(0, 0, 480, 300).data;
    let x0 = 480, x1 = 0, y0 = 300;
    for (let y = 0; y < 300; y++) for (let x = 0; x < 480; x++) if (d[(y * 480 + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; }
    o.xl = x0 - 240; o.xr = x1 + 1 - 240; o.bh = 300 - y0;
  }
  // the drawn scale of an object: H / 900, but its drawn height is held to 50-150 px
  const objK = (o, H) => clamp(H / 900, 50 / o.bh, 150 / o.bh);
  // world x of each object's base, laid end to end from the drawn extents (lean included) with an even gap, so
  // none overlap at any viewport; the wrap period is at least 3 screens
  const OBJ_X = new Float32Array(OBJ_N);
  let objW = 0, objH = 0, objSpan = 0;
  function objLayout(W, H) {
    if (objW === W && objH === H) return;
    objW = W; objH = H;
    let sum = 0;
    for (let i = 0; i < OBJ_N; i++) { const o = OBJ[i], k = objK(o, H); sum += (o.xr - o.xl) * k; }
    const span = Math.max(OBJ_SPAN * W, sum + OBJ_N * 24), gap = (span - sum) / OBJ_N;
    let cur = gap / 2;
    for (let i = 0; i < OBJ_N; i++) { const o = OBJ[i], k = objK(o, H); OBJ_X[i] = cur - o.xl * k; cur += (o.xr - o.xl) * k + gap; }
    objSpan = span;
  }
  // one list of objects; back ones go under the water body (it covers their base), front ones over it
  function drawObjects(ctx, list, s, W, H, camOff, t, post) {
    objLayout(W, H);
    const spW = objSpan;
    for (let q = 0; q < list.length; q++) {
      const o = list[q], k = objK(o, H);
      let sx = ((OBJ_X[o.i] - camOff) % spW + spW) % spW;
      if (sx + o.xl * k > W) sx -= spW;
      if (sx + o.xr * k < 0) continue;
      // a few stand half out of the first water; the rest rise from nothing, all at full size
      const g0 = o.i % 7 === 0 || o.i % 7 === 2 || o.i % 7 === 4 ? 0.55 : 0;
      const g = G.reduced ? 1 : g0 + (1 - g0) * smooth(clamp((s - (g0 ? 2 : o.rs)) / 10, 0, 1));
      if (g <= 0) continue;
      const yl = shAt(clamp(sx, 0, W), W) + (o.front ? H * 0.012 : 2);
      const sink = (1 - g) * o.bh * k * 0.9 + (G.reduced ? 0 : Math.sin(t * 0.6 + o.ph) * 2.5 * k);
      if (!post) {
        // clipped at the waterline: the part under it is not drawn
        ctx.save();
        ctx.beginPath();
        ctx.rect(sx + o.xl * k - 6, 0, (o.xr - o.xl) * k + 12, yl);
        ctx.clip();
        ctx.translate(sx, yl + sink);
        ctx.rotate(o.tilt);
        ctx.scale(k, k);
        ctx.fillStyle = o.c;
        ctx.fill(o.p, o.rule);
        ctx.clip(o.p, o.rule);   // the bridge's hard split: lit left, shade right
        ctx.fillStyle = o.cs;
        ctx.fillRect(o.split, -1000, 2000, 2000);
        ctx.restore();
        continue;
      }
      // a short broken reflection: 3-5 stacked dashes in the object's colour, darkened, wobbling a little
      ctx.fillStyle = "rgb(26,30,30)";
      const rw = Math.min(o.xr - o.xl, 2 * o.bh * 0.3) * k * 0.6;
      for (let j = 0, n = 3 + o.i % 3; j < n; j++) {
        const w = rw * (1 - j * 0.15), wob = G.reduced ? 0 : Math.sin(t * 1.3 + j * 1.9 + o.ph) * 3;
        ctx.fillRect(Math.round(sx - w / 2 + wob), Math.round(yl + 6 + j * 9 * k + j), Math.round(w), 3);
      }
      // a flat lighter-water dash at the waterline
      ctx.fillStyle = "rgb(50,56,54)";
      const dw = Math.min(o.xr - o.xl, 2 * o.bh * 0.3) * k * 0.5 + 6;
      ctx.fillRect(Math.round(sx - dw), Math.round(yl), Math.round(dw * 2), 2);
    }
  }
  const AIR = [];
  (function seedBed() {
    const r = mulberry(7717), ra = mulberry(9301), rd = mulberry(8807);
    // every kind recurs only after 1.5 screen widths (the wrap seam counted), the rare ones (loops, arches,
    // hourglasses, stairs) only after 2.5: each kind gets 3 (or 2) evenly spread copies, a seeded phase apart
    const LAYK = [0.72, 0.84, 0.94], LAYS = [0.6, 0.85, 1.15], rf = mulberry(3301), plan = [];
    const KC = [0, 1, 3, 5, 6, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25], KR = [2, 7, 8, 9, 12];
    for (let m = 0; m < KC.length + KR.length; m++) {
      const rare = m >= KC.length, kd0 = rare ? KR[m - KC.length] : KC[m], cnt = rare ? 3 : kd0 === 3 ? 3 : kd0 >= 16 ? 4 : 5;
      const b0 = (m * 0.6180339 % 1) * SEA_SPAN + (r() - 0.5) * 0.3;
      for (let j = 0; j < cnt; j++) plan.push({ kd: kd0, j, u: ((b0 + j * SEA_SPAN / cnt + (rare ? 0 : (r() - 0.5) * 0.1)) % SEA_SPAN + SEA_SPAN) % SEA_SPAN });
    }
    plan.sort((p, q) => p.u - q.u);
    // no two neighbours of one kind: swap the kind (and its copy index) with a later entry
    for (let i = 1; i < plan.length; i++) {
      if (plan[i].kd !== plan[i - 1].kd) continue;
      for (let k = i + 1; k < plan.length; k++) {
        if (plan[k].kd === plan[i].kd || plan[k].kd === plan[i - 1].kd || (k + 1 < plan.length && plan[k + 1].kd === plan[i].kd)) continue;
        const a = plan[i], b = plan[k], kd = a.kd, j = a.j;
        a.kd = b.kd; a.j = b.j; b.kd = kd; b.j = j;
        break;
      }
    }
    for (let i = 0; i < plan.length; i++) {
      const off = (r() - 0.5) * 0.4, u = plan[i].u, kd = plan[i].kd;
      const fi = pickFam(rf, u);
      const layer = kd === 3 ? 1 : Math.floor(r() * 3), lk = LAYK[layer], sm = Math.min(1.7, (0.8 + r() * r() * 1.0) * LAYS[layer]);   // mostly mid-size, a few big
      const f = { kind: kd, u, layer, wide: 0, arr: r(), rs: 0, ph: r() * 6.28, sp: 0.25 + r() * 0.3, eW: 0, eH: 0, size: 0, w: 0, lift: 0, lean: 0, turn: null, c: "", c2: "", c3: "", hc: "", lw: 1, kink: 0, mw: 0, mh: 0, lump: [r(), r(), ((i * 3 + 1) % 4 + 0.05 + r() * 0.9) / 4, r(), r(), r(), r(), r()],
        front: false, tilt: 0, tc: 1, ts: 0, mir: r() < 0.5 ? -1 : 1, sub: (plan[i].j + kd) % 3, n: 3 + Math.floor(r() * 4), g: null };   // the tilt, mirror, sub-variant and part count are seeded per form
      {
        const tr = r(), tv = r();
        const lineK = kd === 5 || kd === 9 || kd === 10 || kd === 14 || kd === 15;   // rods and wires tilt 10-55 deg, the rest 8-80: never upright, never flat
        f.tilt = kd === 3 ? 0 : (tv < 0.5 ? -1 : 1) * (lineK ? 0.175 + tr * tr * 0.785 : 0.14 + tr * tr * 1.26);
        f.tc = Math.cos(f.tilt); f.ts = Math.sin(f.tilt);
        f.g = [r(), r(), r(), r(), r(), r(), r(), r()];
      }
      if (kd === 0) {
        f.size = Math.min(0.5, (0.12 + r() * 0.2) * sm); f.w = (0.008 + r() * 0.012) * (0.6 + sm * 0.6); f.lean = -off * 2 + (r() - 0.5) * 0.3;
        f.turn = [0, 0, 0, 0, 0, 0, 0].map(() => (r() - 0.5) * 0.7);
        f.turn[2 + Math.floor(r() * 3)] += (r() < 0.5 ? -1 : 1) * (1.5 + r() * 0.7);   // the fold back
        const tn = r() < 0.6 ? 2 : 1;
        f.c = seaTone(fi, tn, lk); f.c2 = seaTone(fi, tn, lk * 0.5);
        f.mw = 0.04 + f.size * 0.25; f.mh = 0.03 + f.size * 0.1;
      } else if (kd === 1) {
        f.size = (0.04 + r() * 0.09) * sm; f.w = 0.012 + r() * 0.02; f.lift = 0;
        const tn = r() < 0.5 ? 2 : 1;
        f.c = seaTone(fi, tn, lk); f.c2 = seaTone(fi, tn, lk * 0.5);
        f.mw = 0.05 + f.size * 0.5; f.mh = 0.035 + f.size * 0.12;
      } else if (kd === 2) {
        f.size = (0.035 + r() * 0.05) * sm; f.w = 0.5 + r() * 1.1; f.lift = 0; f.lean = r() * 6.28;
        f.c = seaTone(fi, 2, lk); f.c2 = seaTone(fi, 2, lk * 0.5);
        f.mw = 0.05 + f.size * 0.6; f.mh = 0.035 + f.size * 0.15;
      } else if (kd >= 16) {
        const tn = r() < 0.6 ? 2 : 1;
        f.c = seaTone(fi, tn, lk); f.c2 = seaTone(fi, tn, lk * 0.5);
        f.size = [0.07, 0.04, 0.07, 0.07, 0.1, 0.09, 0.06, 0.08, 0.05, 0.1][kd - 16] * (1 + r()) * sm;
        f.w = [0.008, 0.007, 0.012, 0.03, 0.006, 0.007, 0.006, 0.01, 0, 0.004][kd - 16] * (0.7 + r() * 0.8);
        f.mw = 0.05 + f.size * 0.4; f.mh = 0.035 + f.size * 0.1;
      } else if (kd >= 5) {
        const tn = r() < 0.6 ? 2 : 1;
        f.c = seaTone(fi, tn, lk); f.c2 = seaTone(fi, tn, lk * 0.5);
        if (kd === 5) { f.size = (0.1 + r() * 0.12) * sm; f.w = 0.006 + r() * 0.005; f.wide = 3 + r() * 3; }
        else if (kd === 6) { f.size = (0.02 + r() * 0.035) * sm; f.lift = 0.01 + r() * 0.02; f.lean = r() - 0.5; }
        else if (kd === 7) { f.size = (0.04 + r() * 0.04) * sm; f.w = 0.04 + r() * 0.05; f.lift = 0; }
        else if (kd === 8) f.size = (0.1 + r() * 0.1) * sm;
        else if (kd === 9) { f.size = (0.09 + r() * 0.14) * sm; f.w = 0.008 + r() * 0.012; f.kink = 4 + Math.floor(r() * 5); f.lean = r() - 0.5; }
        else if (kd === 10) { f.size = (0.08 + r() * 0.1) * sm; f.w = 0.008 + r() * 0.006; }
        else if (kd === 11) { f.size = (0.04 + r() * 0.04) * sm; f.w = 0.006 + r() * 0.004; f.lean = r() - 0.5; f.c3 = seaTone(fi, tn, lk * 0.75); }
        else if (kd === 14) { f.size = (0.12 + r() * 0.16) * sm; f.w = 0.0025 + r() * 0.002; f.lean = r() - 0.5; f.kink = r() * 0.1; }
        else if (kd === 15) { f.size = (0.1 + r() * 0.14) * sm; f.w = 0.002 + r() * 0.002; f.lean = r() - 0.5; f.kink = 3 + Math.floor(r() * 3); }
        else if (kd === 12) { f.size = (0.05 + r() * 0.05) * sm; f.w = 0.008 + r() * 0.006; }
        else { f.size = (0.07 + r() * 0.08) * sm; f.w = 0.005 + r() * 0.004; f.c3 = seaTone(fi, tn, lk * 0.75); }
        f.mw = 0.05 + f.size * 0.4; f.mh = 0.035 + f.size * 0.1;
      } else {
        f.size = 0.35 + r() * 0.5; f.w = 0.006 + r() * 0.012; f.lift = 0.02 + r() * 0.06; f.kink = 2 + Math.floor(r() * 8);
        f.lw = r() < 0.5 ? 1.5 : 2.5; f.eW = f.size; f.c = seaTone(fi, 2);
      }
      if (kd !== 2 && kd !== 3 && kd < 16) { f.w *= [1, 1.5, 0.75][f.sub]; f.size *= [1, 0.9, 1.15][f.sub]; }   // the sub-variant: heavier, shorter or slimmer, taller
      f.hc = seaTone((fi + (i % 2)) % 5, i % 3, (0.5 + f.arr * 0.3) * lk + 0.08);
      if (kd !== 3 && rd() < 0.15) {   // the near shore: clearly bigger and darker than its back neighbours
        f.front = true;
        f.size *= 1.6; f.w *= 1.4; f.mw *= 1.4; f.mh *= 1.2;
        f.c = dark(f.c); f.c2 = dark(f.c2); f.c3 = f.c3 && dark(f.c3); f.hc = dark(f.hc);
      }
      f.rh = [f.size, f.lift + f.w * 2, f.lift + f.size * 2, 0, 0, f.size, f.size * 2, f.size + f.lift, f.size, f.size * 0.6, f.size, f.size, f.size * 2, f.size, f.size, f.size, f.size, f.size, f.size, f.size, f.size, f.size, f.size, f.size, f.size, f.size, f.size][kd];   // height for the reflection
      // each form's own reach (screen heights) for the cull: stairs and folded spires are the widest
      if (kd !== 3) {
        let sh = [f.size + f.w, f.size * 1.1, f.size * 1.45, 0, 0, f.w * f.wide, f.size * 0.6, f.size * 1.05, f.size * 0.3, f.size * 1.55, f.size * 0.2, f.size * 0.7, f.w * 2, f.size * 0.8, f.size * 0.5, f.size * 0.6, f.size * 1.4, f.size * 1.4, f.size * 1.4, f.size * 1.4, f.size * 1.4, f.size * 1.4, f.size * 1.4, f.size * 1.4, f.size * 1.4, f.size * 1.4][kd];
        const ex = sh * 900, lim = f.front ? [70, 200] : [40, 170];   // on-screen extent at 900 px high, clamped at seed time
        let kk = 1;
        if (sh > 0 && ex > lim[1]) kk = lim[1] / ex; else if (sh > 0 && ex < lim[0]) kk = lim[0] / ex;
        if (kk !== 1) { f.size *= kk; f.w *= kk; f.mw *= kk; f.mh *= kk; f.rh *= kk; sh *= kk; }
        f.eH = Math.max(sh, kd === 4 ? 0 : f.mw) + 0.01;
      }
      f.rs = kd === 3 ? 14.5 + f.arr * 1.2 : 12.2 + f.arr * 3.6;   // staggered; each rises over RISE s, lines last
      SEA_F.push(f);
    }
    SEA_F.sort((a, b) => a.layer - b.layer);
    for (let i = 0; i < SEA_F.length; i++) {
      const f = SEA_F[i];
      if (f.kind !== 3) { FORMU.push(f.u); FORMF.push(f.front); }
    }
    for (const pt of PARTS) {
      const fi = Math.floor(hash1(pt.i * 7 + 24) * 5), tn = hash1(pt.i * 7 + 25) < 0.5 ? 1 : 2;
      pt.hc = seaTone(fi, 1, 0.42); pt.dc = seaTone(fi, tn, 0.95);
    }
    const rw = mulberry(6203);
    for (let i = 0; i < WV.length; i++) WV[i] = rw() - 0.5;
    for (let i = 0; i < STREAK.length; i++) STREAK[i] = { u: rw(), y: 0.012 + rw() * 0.07, w: 0.02 + rw() * 0.05, sp: 2 + rw() * 4, a: 0.25 + rw() * 0.2 };
    for (let i = 0; i < 900 * 5; i++) ra();   // the air keeps the draws it had when the bed dots shared this stream
    for (let i = 0; i < 320; i++) {
      AIR.push({ i, u: ra(), y: 0.04 + ra() * 0.9, par: 0.1 + ra() * 0.15, hue: Math.floor(ra() * 8), arr: 10.2 + ra() * 4.5, sz: ra() < 0.5 ? 4 : 3 });
    }
  })();

  // the air: the risers, a thin sparse drift in the upper frame, stepping very slowly
  function drawAirDrift(ctx, W, H) {
    const s = G.secs("break") - 2.1;
    if (s < 10.2) return;
    const span = 1.6 * W;
    const camOff = G.cam * W;
    const stepX = G.reduced ? 0 : Math.floor(G.t / 4) * 3;
    ctx.globalAlpha = 0.5;   // a dark edge first, so the specks read over blue-grey
    ctx.fillStyle = "rgb(6,8,12)";
    for (let n = 0; n < AIR.length; n++) {
      const a = AIR[n];
      if (s < a.arr) continue;
      const x = Math.round(((a.u * span - camOff * a.par - stepX * (0.5 + a.par)) % span + span) % span - span * 0.1);
      if (x < -2 || x > W + 2) continue;
      if (a.y * H > shAt(clamp(x, 0, W), W) - 2) continue;   // the sky's specks stop at the surface
      ctx.fillRect(x - 1, Math.round(a.y * H) - 1, a.sz + 2, a.sz + 2);
    }
    ctx.globalAlpha = 0.95;
    for (let h = 0; h < 8; h++) {
      ctx.fillStyle = AIR_LIGHT[h];
      for (let n = 0; n < AIR.length; n++) {
        const a = AIR[n];
        if (a.hue !== h || s < a.arr) continue;
        const x = Math.round(((a.u * span - camOff * a.par - stepX * (0.5 + a.par)) % span + span) % span - span * 0.1);
        if (x < -2 || x > W + 2) continue;
        if (a.y * H > shAt(clamp(x, 0, W), W) - 2) continue;
        ctx.fillRect(x, Math.round(a.y * H), a.sz, a.sz);
      }
    }
    ctx.globalAlpha = 1;
  }

  // permanent residue: what the first wave left in the void background
  const RES = { dust: [], wind: [], stains: [], lights: [], sound: [] };
  (function seedResidue() {
    const r = mulberry(9120);
    for (let i = 0; i < 70; i++) {
      RES.dust.push({ u: r(), y: r(), par: 0.25 + r() * 0.35, drift: 3 + r() * 6, r: 0.7 + r() * 1.1, ph: r() * TAU });
    }
    for (let i = 0; i < 12; i++) {
      RES.wind.push({ u: r(), y: r(), par: 0.25 + r() * 0.35, drift: 14 + r() * 16, len: 180 + r() * 240, ph: r() * TAU });
    }
    for (let i = 0; i < 16; i++) {
      const rx = 40 + r() * 110;
      RES.stains.push({ u: r(), y: r(), par: 0.25 + r() * 0.35, drift: 3 + r() * 6, rx, ry: rx * (0.25 + r() * 0.2),
        hueA: Math.floor(r() * 8), hueB: Math.floor(r() * 8), ph: r() * TAU });
    }
    for (let i = 0; i < 34; i++) {
      RES.lights.push({ u: r(), y: r(), par: 0.25 + r() * 0.35, drift: 3 + r() * 6, size: 1 + r() * 0.6, freqR: r(), ph: r() * TAU });
    }
    for (let i = 0; i < 5; i++) {
      RES.sound.push({ u: r(), y: r(), par: 0.25 + r() * 0.35, drift: 3 + r() * 6, ph: r() * TAU });
    }
  })();

  function drawResidue(ctx) {
    if (typeof G.secs !== "function") return;
    const W = G.W, H = G.H;
    if (!W || !H) return;
    const grow = smooth(clamp((G.secs("break") - 3.5) / 16, 0, 1));
    const keep = 1 - G.since("land") * 0.6;
    const k = grow * keep;
    if (k < 0.02) return;

    const span = 3.2 * W;
    const camOff = G.cam * W;

    ctx.fillStyle = "#8a8272";
    for (const it of RES.dust) {
      const x = ((it.u * span - camOff * it.par - G.t * it.drift) % span + span) % span - span * 0.1;
      if (x < -200 || x > W + 200) continue;
      ctx.globalAlpha = 0.35 * k * (0.6 + 0.4 * Math.sin(G.t * 0.9 + it.ph));
      ctx.beginPath(); ctx.arc(x, it.y * H, it.r, 0, TAU); ctx.fill();
    }

    ctx.strokeStyle = "#cfd6d3"; ctx.lineWidth = 1; ctx.globalAlpha = 0.07 * k;
    for (const it of RES.wind) {
      const x = ((it.u * span - camOff * it.par - G.t * it.drift) % span + span) % span - span * 0.1;
      if (x < -200 || x > W + 200) continue;
      const y = it.y * H;
      const cy = y + 12 * Math.sin(G.t * 0.35 + it.ph);
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + it.len * 0.5, cy, x + it.len, y);
      ctx.stroke();
    }

    // the flat colour stains and the sound rings read as stray ellipses in the first segment: they are gone by the end of trade, stay out through walk and root, and are back at full after enter (covered, so the step is unseen)
    const quiet = G.beat > G.idxOf("enter") ? 1 : 1 - clamp((G.linear("trade") - 0.5) * 2, 0, 1);
    for (const it of (quiet < 0.01 ? [] : RES.stains)) {
      const x = ((it.u * span - camOff * it.par - G.t * it.drift) % span + span) % span - span * 0.1;
      if (x < -200 || x > W + 200) continue;
      const swap = Math.floor((G.t + it.ph * 3) / (5 + it.ph)) % 2;
      ctx.fillStyle = HUE_FILL[swap === 0 ? it.hueA : it.hueB];
      ctx.globalAlpha = 0.07 * k * quiet;
      ctx.save();
      ctx.translate(x, it.y * H);
      ctx.beginPath(); ctx.ellipse(0, 0, it.rx, it.ry, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = "#fff3d6";
    for (const it of RES.lights) {
      const x = ((it.u * span - camOff * it.par - G.t * it.drift) % span + span) % span - span * 0.1;
      if (x < -200 || x > W + 200) continue;
      if (Math.sin(G.t * (1.2 + it.freqR) * 2 + it.ph) <= 0.2) continue;
      ctx.globalAlpha = 0.8 * k;
      ctx.fillRect(x - it.size * 0.5, it.y * H - it.size * 0.5, it.size, it.size);
    }

    ctx.strokeStyle = "#9fb4c8"; ctx.lineWidth = 1;
    for (const it of RES.sound) {
      const x = ((it.u * span - camOff * it.par - G.t * it.drift) % span + span) % span - span * 0.1;
      if (x < -200 || x > W + 200) continue;
      const frac = ((G.t + it.ph * 4) % 5) / 5;
      ctx.globalAlpha = 0.10 * k * quiet * (1 - frac);
      ctx.beginPath(); ctx.arc(x, it.y * H, frac * 110, 0, TAU); ctx.stroke();
    }

    ctx.globalAlpha = 1; ctx.lineWidth = 1;
  }

  window.GenElem = { draw, drawResidue, drawSea, rage };
})();
