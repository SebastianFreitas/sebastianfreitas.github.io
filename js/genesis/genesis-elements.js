/* genesis-elements.js — the first wave out of the broken point: dust, air, wind, sound, colour and light. Each changes form as it travels and dies into a permanent trace of the void. Pure functions of time. */
(function () {
  const G = window.Gen;
  const { hash1, clamp, mix, mulberry, smooth } = Util;
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
    for (let n = 0; n < 700; n++) {
      const kind = "dust", birth = 0.3 + rx() * 12.5, life = 2.4 + rx() * 2.2, ang = rx() * TAU, spd = 0.55 + rx() * 0.75;
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
      // exactly a third go down to build the sea (60 stream grains + 40 of the 240 by hash): they fall instead of fading
      // and leave in pulses; the rest rise and split as before
      pt.sea = !!pt.extra || hash1(h + 21) < 1 / 6;
      if (pt.sea) {
        pt.birth = 0.3 + Math.min(3, Math.max(0, Math.round((pt.birth - 0.3) / 3.12))) * 1.8 + hash1(h + 34) * 2.0;   // the 4 pulses overlap (each spreads over 2.0 of the sped clock, 1.8 apart): one continuous eruption from 0.3 to 7.7, so the slowest faller lands well before the break cut at 14.56
        pt.shard = hash1(h + 33) < 0.4;
        pt.spd = 0.7 + hash1(h + 35) * 0.5;   // a band of speeds kept off the centre, so a pulse reads as a ring
        pt.ang = hash1(h + 36) * TAU;   // launch over the whole circle, with about 45% pushed into the upper half
        if (hash1(h + 37) < 0.45) pt.ang = Math.PI * (1 + hash1(h + 36));
      }
      pt.splits = !pt.sea && pt.birth <= pt.splitT && pt.birth + pt.life > pt.splitT;
      pt.fall = pt.sea ? 0.75 + hash1(h + 22) * 0.6 : 1.6 + hash1(h + 22) * 1.4;   // the sea third slams down: a short, hard fall
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
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(x, y, 1.6 * sizeMul, 0, TAU); ctx.fill();
    } else if (q < 0.8) {
      // a glint: one short, flat flare
      const sw = 0.6 + 0.4 * Math.sin(a * 5 + pt.ph);
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
    const d = Math.pow(q, 0.8) * pt.spd * 0.62 * Math.hypot(W, H) * 0.62 * (pt.sea ? 2.7 : 1);   // the sea third is blasted out about half a frame wide
    let x = originX + Math.cos(angle) * d;
    const reach = 0.34 * H;   // the path's height above the origin is squeezed into 0.12 H..origin, never off the top
    let y = originY + Math.sin(angle) * d;

    const sfac = (pt.wgt - 0.5) * 2 * Math.min(1, q * 3);
    const s0 = sl || slosh(t);
    x += s0.x * sfac;
    y += s0.y * sfac;

    const rg = rageAt(t, x, y);
    x += PUSH.x * 26;
    y += PUSH.y * 26;
    if (y < originY && !pt.sea) y = originY - reach * Math.tanh((originY - y) / reach);   // squeezed last, so slosh and push stay below 0.12 H too
    if (pt.sea && y < originY) y = originY - 0.38 * H * Math.tanh((originY - y) / (0.38 * H));   // an upward blast peaks below 0.08 H and turns in view, never leaving the top
    if (pt.sea && y > 0.7 * H) y = 0.7 * H + 0.06 * H * Math.tanh((y - 0.7 * H) / (0.3 * H));   // a downward blast never dives below the waterline: it tops out at 0.76 H and falls the rest

    POS.x = x; POS.y = y; POS.angle = angle; POS.rg = rg; POS.a = a; POS.q = q;
    return POS;
  }

  function draw(ctx) {
    if (typeof G.secs !== "function") return;
    const W = G.W, H = G.H;
    if (!W || !H) return;
    const s = eclock();
    if (s < 0) return;
    surfFrame(s, W, H);   // the sea plan reads the surface; drawSea may run after

    const originX = G.sx(0);
    const sl = slosh(s);
    // break only: no confetti inside the old-one figures or the caption band
    const gate = window.GenOld && GenOld.figCover && G.BEATS[G.beat].id === "break";
    const band = gate && GenOld.captionBand ? GenOld.captionBand() : null;

    // the wave's colours all go under the one deep shadow too; no layer on frames where nothing is alive
    let live = false;
    for (const pt of PARTS) if (s >= pt.birth && s <= pt.birth + pt.life) { live = true; break; }
    if (!live) return;
    const outer = ctx, dim = dimK();
    ctx = layerBegin(outer);
    for (const pt of PARTS) {
      if (pt.sea) { drawSeaPart(ctx, pt, s, originX, W, H); continue; }
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
    layerEnd(outer, ctx, dim);
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
  // its heading) to the liquid beside the nearest form. Pure in s. PLAN holds the landing x (lx),
  // the landing time tl and whether the heap it falls to is a form (fr)
  const PLAN = { tl: 0, lx: 0, fr: false };
  function seaPlan(pt, s, originX, W, H, camOff, spW) {
    const tf = pt.birth + pt.life * 0.2;
    let P = posAt(pt, tf, originX, W, H);
    const x1 = P.x, y1raw = P.y;
    // a fall starts inside the picture: at least 0.14 H, plus a small per-particle extra so streams do not bunch on one line
    const y1 = Math.max(y1raw, H * (0.05 + 0.04 * (((pt.jit * 97) % 1 + 1) % 1)));
    // the nearest form (world x, wrapped) is the heap it falls to
    const uw = (x1 + camOff) / W;
    let bd = 0, bm = 1e9, bf = false;
    for (let n = 0; n < FORMU.length; n++) {
      let d = ((FORMU[n] - uw) % SEA_SPAN + SEA_SPAN) % SEA_SPAN;
      if (d > SEA_SPAN / 2) d -= SEA_SPAN;
      if (Math.abs(d) < bm) { bm = Math.abs(d); bd = d; bf = FORMF[n]; }
    }
    PLAN.fr = bf;
    let lx = ((uw + bd + pt.jit) * W - camOff + (pt.lump[1] - 0.5) * 0.16 * W) % spW;
    lx = (lx + spW) % spW;
    if (lx > spW - 0.2 * W) lx -= spW;
    if (!G.reduced && SPR[3] > 1) {   // while the front runs out, the matter lands under it (a fixed reach per particle, from its nominal landing time)
      const tn = Math.max(2.1, pt.birth + pt.life * 0.2 + pt.fall + 0.3), al = Math.max(frontR(tn) - SPR[4], 0.03 * W);
      if (Math.abs(lx - SPR[2]) > al) lx = SPR[2] + Math.sign(lx - SPR[2]) * al;
    }
    const lvl = Math.min(shAt(lx, W) + (bf ? H * 0.036 : 0), H * 0.96);   // the drawn surface, or the pile floor while it is still low
    const yland = Math.max(lvl + H * (0.004 - 0.016 * pt.gy), y1raw + 2);   // the landing is unchanged by the lower start
    const drop = Math.max(yland - y1, 2);
    PLAN.lx = lx;
    let T = pt.fall + drop / H * 0.6;
    if (tf + T < 2.1) T = 2.1 - tf;   // nothing lands before the sea is drawn (s 2), so every splash shows
    PLAN.tl = tf + T;
  }

  // what a landed sea-bound particle leaves: a faint ripple and a dark blob that sinks and fades into the water within a second
  function drawLanded(ctx, pt, s, W, H, fade) {
    const k = s - PLAN.tl, lx = PLAN.lx;
    if (lx < 0 || lx > W || G.reduced || s < 2) return;   // only where the sea is drawn: no water, no ring
    const sy0 = shAt(lx, W);
    if (!(sy0 > 0 && sy0 < H - 2)) return;   // the surface line must be inside the frame
    if (pt.extra && k > 1.6) return;   // the burst's many pieces: a short life each
    const mg = 4;   // every mark stays this far under the drawn top line, clipped to a path that follows it
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let k = 0; k <= NS; k++) ctx.lineTo(k / NS * W, SH[k] + mg);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.clip();
    if (k > 0.6) {   // it merges: a low swell a shade off the sea's own fill stays under the surface where it landed
      const zz = (0.004 + pt.size * 0.0025) * H, sw = zz * 6, sy = shAt(lx, W) + mg;
      ctx.globalAlpha = 0.55 * fade * (pt.extra ? 1 - smooth(clamp((k - 0.6) / 1, 0, 1)) : 1);
      ctx.fillStyle = "rgb(33,38,37)";
      ctx.beginPath();
      ctx.ellipse(lx, sy + 1, sw, zz * (0.5 + 0.25 * Math.sin(s * 1.3 + pt.jit * 40)), 0, 0, Math.PI);   // the lower half: inside the sea
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
      return;
    }
    // a splash where it enters the water: a few short upward flecks and an expanding flat ring, about 0.6 s
    const z = (0.004 + pt.size * 0.0025) * H, q = k / 0.6, yl = shAt(lx, W) + mg;
    ctx.globalAlpha = 0.6 * (1 - q) * fade;
    ctx.fillStyle = "rgb(48,55,53)";
    ctx.beginPath();
    const ry = z * (0.3 + 0.9 * q);
    ctx.ellipse(lx, yl + ry, z * (1.5 + 5 * q), ry, 0, 0, TAU);   // its round top sits on the sea line, not above it
    ctx.fill();
    ctx.fillStyle = "rgb(52,59,57)";
    const rise = z * 5 * Math.sin(Math.PI * Math.min(1, q * 1.3));
    for (let f = 0; f < 4; f++) {
      const dx = (f - 1.5) * z * (1.2 + 0.4 * ((pt.jit * 97 + f) % 1 + 1) % 1), fh = rise * (0.6 + 0.4 * (f & 1));
      ctx.fillRect(Math.round(lx + dx * (0.6 + q)), Math.round(yl + 1), 2, Math.max(2, Math.round(fh * 0.5)));
    }
    ctx.restore();   // the flecks too stay below the surface clip
    ctx.globalAlpha = 1;
  }

  // a sea-bound particle in the elements draw: it only poses the plan (the landed heap is drawn by drawSea)
  function drawSeaPart(ctx, pt, s, originX, W, H) {
    if (s - pt.birth < 0) return;
    seaPlan(pt, s, originX, W, H, G.cam * W, SEA_SPAN * W);
    slosh(s);   // the plan posed other times
  }

  // frozen-then-snapping fate of a split particle: sink, settle or rise, in held steps
  function drawSplit(ctx, pt, s, originX, W, H) {
    if (pt.kind === "light") return;
    const P0 = posAt(pt, pt.splitT, originX, W, H);
    const x0 = P0.x, y0 = P0.y, angle0 = P0.angle, rg0 = P0.rg, a0 = P0.a, q0 = P0.q;
    if (x0 < -40 || x0 > W + 40 || y0 < -40 || y0 > H + 40) return;

    let fadeOut0;
    if (q0 < 0.8) fadeOut0 = 1;
    else fadeOut0 = pt.settle ? 1 : 1 - (q0 - 0.8) / 0.2;
    const alpha0 = Math.min(1, a0 / 0.25) * fadeOut0 * 0.9;

    let sizeMul0 = pt.size * (1 + 0.6 * rg0);
    if (pt.settle && q0 >= 0.8) sizeMul0 *= (1 - (q0 - 0.8) / 0.2);

    const fate = pt.fate === 1 ? (hash1(pt.i * 7 + 19) < 0.5 ? 0 : 2) : pt.fate;   // nothing stays on the deck: down into the sea or up into the sky

    let tx, ty;
    if (fate === 0) {
      tx = x0;
      ty = H * (1 - SEA_H * (0.2 + 0.7 * pt.gy));
    } else {
      tx = x0 + (hash1(pt.i * 7 + 17) - 0.5) * 0.04 * W;
      ty = H * (0.01 + 0.05 * pt.gy);   // ends inside the gas at the top, which the front rolls out over it
    }

    const u = s - pt.splitT;
    const n = pt.steps;
    let k = G.reduced ? n : (u < pt.hold ? 0 : Math.min(n, Math.floor((u - pt.hold) / pt.stepDur) + 1));
    if (fate === 2 && k === n && !G.reduced) {   // the last step waits, held, until the gas front has rolled out to it
      surfFrame(s, W, H);
      if (AIRP[x0 < AIRP[4] ? 1 : 2] < Math.abs(tx - AIRP[4])) k = n - 1;
    }

    const f = k / n;
    const fe = fate === 2 ? 1 - (1 - f) * (1 - f) : f;   // risers slow as they reach the sky
    const x = mix(x0, tx, fe);
    const y = mix(y0, ty, fe);

    if (k < n) {
      let alpha = alpha0, sizeMul = sizeMul0;
      if (fate !== 2) sizeMul *= mix(1, 0.5, f);   // a riser stays whole until the gas takes it

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
  // (its fall start plus the fall), counted against s. Pure in s. SRISE is 0 with nothing landed, 1 at 95%
  const SEA_LT = [];
  let SRISE = 0, SLVL = 0, SBASE = 0, SFALL = null;
  const SK = new Float64Array(5).fill(-1);
  function surfFrame(s, W, H) {
    const camOff = G.cam * W, t = G.reduced ? 0 : G.t;
    if (SK[0] === s && SK[1] === camOff && SK[2] === t && SK[3] === W && SK[4] === H) return;
    SK[0] = s; SK[1] = camOff; SK[2] = t; SK[3] = W; SK[4] = H;
    if (!SEA_LT.length) for (const pt of PARTS) if (pt.sea) SEA_LT.push(Math.max(2.1, pt.birth + pt.life * 0.2 + pt.fall + 0.3));
    let n = 0;
    for (let i = 0; i < SEA_LT.length; i++) if (SEA_LT[i] <= s) n++;
    SRISE = clamp(n / (0.95 * SEA_LT.length), 0, 1);
    // a ~50 px strip from s 2, rising to ~15% of the frame above the letterbox; the landings surge it ~0.17 H past that level, then it settles back
    let lvl = SRISE + 2.4 * SRISE * Math.sin(Math.PI * SRISE);
    if (!SFALL) {   // the peak of the surge, and the fall from it: ten times the pour's own, running on past the break into elements (the clock is secs("break"), which keeps counting)
      let pk = 0;
      for (let r = 0; r <= 1; r += 0.001) if (r + 2.4 * r * Math.sin(Math.PI * r) > pk + 1e-9) { pk = r + 2.4 * r * Math.sin(Math.PI * r); SFALL = [r, pk]; }
      const lt = SEA_LT.slice().sort((x, y) => x - y), N = lt.length, at = r => lt[Math.max(0, Math.min(N - 1, Math.ceil(r * 0.95 * N) - 1))];
      SFALL = [at(SFALL[0]), pk, at(SFALL[0]) + 10 * (at(1) - at(SFALL[0])), at(1)];
    }
    if (s >= SFALL[0]) lvl = 1 + (SFALL[1] - 1) * (1 - smooth(clamp((s - SFALL[0]) / (SFALL[2] - SFALL[0]), 0, 1)));   // after the peak: time-based, smooth to the final level
    SLVL = lvl;
    SBASE = H * (0.86 + (1 - lvl) * (0.14 + 0.04 * (1 - smooth(clamp((s - 2) / 1.5, 0, 1)))));
    const wp = camOff / W, nw = WV.length - 1;
    for (let k = 0; k <= nw; k++) SY2[k] = SBASE + H * 0.0015 * Math.sin(k * 1.9 - t * 0.2 + wp * 3.7) + H * 0.012 * swellS(k / nw + wp, t);   // between the feet: flat, only a ripple
    seaSurf(W, H, camOff, t, nw, SHA, 0, SRISE);   // the air's line (seaLine): today's level, unchanged
    // the drawn sea: the water first runs out from the hole as a wave front (the first third of the sea's timing), then
    // the whole surface rises on the rest of it and sloshes; from the fall on it is exactly today's line
    const T1 = SFALL[3], Tk = SFALL[0], t0 = SPR[0] = Math.min.apply(null, SEA_LT), tsp = SPR[1] = Math.min(t0 + (T1 - t0) / 3, Tk - 0.01);
    const hx = SPR[2] = G.sx(0), Lw = SPR[4] = 0.12 * W;
    SPR[3] = Math.max(hx, W - hx) + Lw;
    SPR[5] = Math.max(t0 + 1, (3.45 - 0.4) * TS);   // the edges at secs("break") 3.45
    if (G.reduced) {   // still and visible: today's line, no front, lip or slosh
      SCV.fill(0);
      seaSurf(W, H, camOff, t, nw, SH, 0, SRISE);
    } else {
    const se = s >= Tk ? s : s < tsp ? t0 : t0 + (s - tsp) * (Tk - t0) / (Tk - tsp);
    let nd = 0;
    for (let i = 0; i < SEA_LT.length; i++) if (SEA_LT[i] <= se) nd++;
    const srd = clamp(nd / (0.95 * SEA_LT.length), 0, 1);
    let lvlD = srd + 2.4 * srd * Math.sin(Math.PI * srd);
    if (s >= Tk) lvlD = lvl;
    const sbd = H * (0.86 + (1 - lvlD) * (0.14 + 0.04 * (1 - smooth(clamp((s - 2) / 1.5, 0, 1)))));
    seaSurf(W, H, camOff, t, nw, SH, sbd - SBASE, srd);
    const R = frontR(s), Cw = 0.08 * W, env = s < tsp || s >= T1 ? 0 : Math.sin(Math.PI * (s - tsp) / (T1 - tsp));
    const mnd = 1 - smooth(clamp((s - t0) / (Math.min(SPR[5], Tk - 0.01) - t0), 0, 1));   // gone by the time the front has run out
    for (let k = 0; k <= NS; k++) {
      const x = k / NS * W, d = Math.abs(x - hx), q = smooth(clamp((d - R) / Lw, 0, 1)), u = clamp((R - d) / Cw, 0, 1);
      SCV[k] = q;
      if (q > 0) SH[k] += (H * 1.03 - SH[k]) * q;   // ahead of the front: no water yet
      if (u > 0 && u < 1) SH[k] -= H * 0.05 * Math.sin(Math.PI * u) * (1 - 0.5 * clamp((s - t0) / (SPR[5] - t0), 0, 1));   // the wedge at the front, standing well above the water behind it
      if (q < 1 && mnd > 0) SH[k] -= H * 0.07 * mnd * Math.pow(clamp(1 - d / Math.max(R, 1), 0, 1), 0.7) * (1 - q);   // a mound under the hole, the water's start
      if (env > 0) SH[k] += H * 0.018 * env * Math.cos(Math.PI * x / W) * Math.sin(TAU * (s - tsp) / 1.7);   // the slosh between the edges
    }
    }
    // the air's own progress: the sea's line at rest (the level the mirrored band ends on), the gas front's reach each way, and how far the bulges have swelled
    seaSurf(W, H, camOff, t, nw, SHR, H * 0.86 - SBASE, 1);
    if (SAIR === null) {
      SAIR = 1e9;
      for (const pt of PARTS) if (pt.splits && pt.kind !== "light" && riseFate(pt)) SAIR = Math.min(SAIR, pt.splitT + pt.hold + (pt.steps - 1) * pt.stepDur);
    }
    AIRP[0] = G.reduced || s >= SAIR ? 1 : 0;
    AIRP[3] = 0.12 * W; AIRP[4] = hx;
    AIRP[1] = airReach(s, hx, AIR_DL);
    AIRP[2] = airReach(s, W - hx, AIR_DR);
    AIRP[5] = G.reduced ? 1 : smooth(clamp((s - SAIR - 0.5 * AIR_DR) / (SFALL[2] - SAIR - 0.5 * AIR_DR), 0, 1));
  }

  // the gas front out of the air above the hole: it starts when the first riser arrives and runs out each way (left quicker than right), reaching its edge at
  // different moments; the lip is AIRP[3] wide. AIRP: on, reach left, reach right, lip, hole x, bulge swell (0 to 1)
  const AIRP = [0, 0, 0, 1, 0, 1], SHR = new Float32Array(121), AIR_DL = 6, AIR_DR = 8.4;
  let SAIR = null;
  function riseFate(pt) { return (pt.fate === 1 ? (hash1(pt.i * 7 + 19) < 0.5 ? 0 : 2) : pt.fate) === 2; }
  // the grade's lift while matter forms: the shadow thins where the front is (its band and lip, hard-edged) and less behind it, then back to today's by SFALL[2].
  // Returns null or stops [screen x, lift] left to right (equal x = a hard edge); layerEnd and the ceiling's shadow turn them into one gradient fill
  const LIFT_SEA = 0.8, LIFT_AIR = 0.8, LIFT_BEHIND = 0.5;
  function liftStops(R, hx, lip, bw, lf, lb) {
    R = Math.min(R, 4 * G.W);
    const a = R - bw, b = R + lip;
    return [[hx - b, 0], [hx - b, lf], [hx - Math.max(a, 0), lf], [hx - Math.max(a, 0), lb], [hx + Math.max(a, 0), lb], [hx + Math.max(a, 0), lf], [hx + b, lf], [hx + b, 0]];
  }
  function seaLift(W, H) {
    if (G.reduced) return null;
    const s = eclock(); surfFrame(s, W, H);
    const e = smooth(clamp((s - SPR[0]) / 0.4, 0, 1)) * (1 - smooth(clamp((s - SFALL[0]) / (SFALL[2] - SFALL[0]), 0, 1)));
    if (!(e > 0)) return null;
    return liftStops(frontR(s), SPR[2], 0.4 * SPR[4], 0.16 * W, LIFT_SEA * e, LIFT_SEA * LIFT_BEHIND * e);
  }
  function airLift(W, H) {
    if (G.reduced) return null;
    const s = eclock(); surfFrame(s, W, H);
    const e = SAIR + 0.5 * AIR_DR, k = smooth(clamp((s - SAIR) / 0.6, 0, 1)) * (1 - smooth(clamp((s - e) / (SFALL[2] - e), 0, 1)));
    if (!(k > 0)) return null;
    const hx = AIRP[4], rl = Math.min(AIRP[1], 4 * W), rr = Math.min(AIRP[2], 4 * W), lip = 0.5 * AIRP[3], bw = 0.16 * W, lf = LIFT_AIR * k, lb = lf * LIFT_BEHIND;
    const al = Math.max(rl - bw, 0), ar = Math.max(rr - bw, 0);
    return [[hx - rl - lip, 0], [hx - rl - lip, lf], [hx - al, lf], [hx - al, lb], [hx + ar, lb], [hx + ar, lf], [hx + rr + lip, lf], [hx + rr + lip, 0]];
  }
  function airReach(s, dist, dur) {
    if (G.reduced || s - SAIR >= dur) return 1e9;
    return 1.15 * (dist + 0.12 * G.W) * (1 - Math.pow(1 - clamp((s - SAIR) / dur, 0, 1), 2.2));
  }

  // the wave front's reach from the hole at s (px): it overshoots the far edge, so both edges are covered by the spread's end
  const SPR = [0, 0, 0, 1, 1, 1], SCV = new Float32Array(121), SHA = new Float32Array(121);   // SPR[5]: s at which the front has reached both edges
  function frontR(s) {
    const p = clamp((s - SPR[0]) / ((SPR[5] - SPR[0]) / 0.61), 0, 1);   // 0.61: the share of the run at which the 1.15 overshoot reaches the far edge
    return 1.15 * SPR[3] * (1 - Math.pow(1 - p, 2.2));
  }

  // the slow swell: a long low wave travelling along the sea line (wx in screen widths of world x), -1..1
  function swellS(wx, t) { return Math.sin(TAU * wx / 1.1 - t * 0.9); }

  // fills SH (the engraved surface: a seeded kind per world segment, swells against the piers) and the curl list
  function seaSurf(W, H, camOff, t, nw, out, dy, rise) {
    const segW = W * 0.22, i0 = Math.floor(camOff / segW);
    for (let j = 0; j < SGN_; j++) {
      const i = i0 + j;
      SGT[j] = Math.floor(hash1(i * 131 + 11) * 6);
      SGA[j] = 0.012 + 0.018 * hash1(i * 131 + 23);
      SGP[j] = hash1(i * 131 + 37) * TAU;
      SGD[j] = hash1(i * 131 + 53) < 0.5 ? -1 : 1;
      SGK[j] = 4 + Math.floor(hash1(i * 131 + 71) * 5);
    }
    for (let k = 0; k <= NS; k++) {
      const x = k / NS * W;
      // a low line, gently uneven: three slow seeded waves over the world x (wide scales), no relation to the bridge feet
      const uu = k / NS * nw, kk = Math.min(nw - 1, Math.floor(uu)), wx = (x + camOff) / W;
      const und = 0.004 * Math.sin(wx * TAU / 1.7 + 1.3) + 0.003 * Math.sin(wx * TAU / 0.83 + 4.1) + 0.0018 * Math.sin(wx * TAU / 0.41 + 2.2);
      out[k] = SY2[kk] + (SY2[kk + 1] - SY2[kk]) * (uu - kk) + dy + H * (0.014 + und) * rise;
    }
  }


  function drawSea(ctx) {
    if (typeof G.secs !== "function") return;
    const W = G.W, H = G.H;
    if (!W || !H) return;
    const s = eclock();
    if (s < 2) return;
    surfFrame(s, W, H);
    const outer = ctx, dim = dimK();
    ctx = layerBegin(outer);   // the sea is always drawn on its own layer, then put under one deep shadow and laid down

    const camOff = G.cam * W;
    const t = G.reduced ? 0 : G.t;
    const spW = SEA_SPAN * W;
    ctx.globalAlpha = 1;
    drawObjects(ctx, OBJ_BACK, s, W, H, camOff, t, false);
    const o = { W, H, t, camOff, dir: 1, sh: SH, bottom: H, pieces: [] };
    o.mid = () => {
      OBN = 0;
      drawObjects(ctx, OBJ_BACK, s, W, H, camOff, t, 2);
      drawObjects(ctx, OBJ_FRONT, s, W, H, camOff, t, 2);
      drawSlicks(ctx, W, H, camOff, t);
      for (let i = 0; i < OBN; i++) o.pieces.push({ x: OBX[i], y: OBY[i], r: OBR[i] });
    };
    paintSea(ctx, o);
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
    layerEnd(outer, ctx, dim, seaLift(W, H)); ctx = outer;
  }

  // the sea body, surface line and floating-piece rings; o: W, H, t, camOff, sh (NS+1 surface ys), bottom (far edge y),
  // dir (1 water below the line, -1 mirrored about y = H/2: water above), pieces [{x, y, r}], mid(ctx) (drawn after the ripples, may fill pieces)
  function paintSea(ctx, o) {
    const W = o.W, H = o.H, t = o.t, camOff = o.camOff, SH = o.sh, vb = o.bottom;
    const shAt = (x, w) => { const u = clamp(x / w, 0, 1) * NS, k = Math.min(NS - 1, Math.floor(u)); return SH[k] + (SH[k + 1] - SH[k]) * (u - k); };
    if (o.dir < 0) { ctx.save(); ctx.translate(0, H); ctx.scale(1, -1); }
    // the liquid: one dark murky slate body to the canvas bottom, in three flat bands (clipped to the surface), a
    // thin lighter scum line along the top and a few slow ripple dashes
    ctx.beginPath();
    ctx.moveTo(0, vb);
    for (let k = 0; k <= NS; k++) ctx.lineTo(k / NS * W, SH[k]);
    ctx.lineTo(W, vb);
    ctx.closePath();
    ctx.fillStyle = "rgb(24,28,27)";
    ctx.globalAlpha = 1;
    ctx.fill();
    ctx.save();
    ctx.clip();
    for (let b = 0; b < 2; b++) {   // the bands follow the surface, so no straight edge
      const bf = b ? 0.8 : 0.45;
      ctx.fillStyle = b ? "rgb(16,18,18)" : "rgb(20,23,22)";
      ctx.beginPath();
      ctx.moveTo(0, vb);
      for (let k = 0; k <= NS; k++) ctx.lineTo(k / NS * W, SH[k] + (vb - SH[k]) * bf);
      ctx.lineTo(W, vb);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.beginPath();
    for (let k = 0; k <= NS; k++) { if (k) ctx.lineTo(k / NS * W, SH[k] + 1); else ctx.moveTo(0, SH[0] + 1); }
    ctx.strokeStyle = "rgb(37,42,41)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // a soft lighter band just under the surface line
    ctx.beginPath();
    for (let k = 0; k <= NS; k++) { const by = SH[k] + H * 0.012 + 1.6 * Math.sin(k * 0.45 + t * 0.5); if (k) ctx.lineTo(k / NS * W, by); else ctx.moveTo(0, by); }
    ctx.strokeStyle = "rgb(36,41,40)";
    ctx.lineWidth = H * 0.016;
    ctx.stroke();
    // sheen streaks drifting steadily left: each is a tapered run of segments that follows the surface wave (so it
    // curves and tilts), some broken into dashes; the shape holds while it drifts and fades only at the ends of its life
    ctx.fillStyle = "rgb(44,50,48)";
    const sp = W * 1.3, ef = W * 0.08;
    for (let d = 0; d < 2; d++) {   // one path and one fill per depth: each streak a smooth lens on the surface wave
      ctx.globalAlpha = d ? 0.6 : 0.85;
      ctx.beginPath();
      for (let k = 0; k < STREAK.length; k++) {
        const a = STREAK[k];
        const ph = ((t / (7 + a.sp * 1.5) + a.u * 7 + d * 0.5) % 1 + 1) % 1, env = clamp(Math.min(ph, 1 - ph) / 0.15, 0, 1);
        const x = ((a.u * sp + d * sp * 0.37 - t * W * (0.025 + a.sp * 0.008) - camOff * 0.6) % sp + sp) % sp - sp * 0.1;
        const w = a.w * W * (d ? 1.6 : 2.4) + 40;
        if (x < -w || x > W) continue;
        const hm = (d ? 1.6 : 2.8) * env * clamp(Math.min(x + w, W - x) / ef, 0, 1);
        if (hm < 0.25) continue;
        const oy = H * (a.y * (1 + d * 3) + 0.01);
        for (let i = 0; i <= 6; i++) {
          const xs = x + w * i / 6, h = hm * Math.sin(Math.PI * i / 6);
          LNX[i] = xs; LNY[i] = shAt(clamp(xs, 0, W), W) + oy; LNH[i] = h;
        }
        ctx.moveTo(LNX[0], LNY[0]);
        for (let i = 1; i <= 6; i++) ctx.lineTo(LNX[i], LNY[i] - LNH[i]);
        for (let i = 5; i >= 0; i--) ctx.lineTo(LNX[i], LNY[i] + LNH[i]);
        ctx.closePath();
      }
      ctx.fill();
    }
    // small curved ripple arcs at several depths: far ones smaller, slower and dimmer, near ones larger and faster
    ctx.fillStyle = "rgb(58,64,62)";
    const rsp = W * 1.2;
    for (let k = 0; k < RIP.length; k++) {
      const r = RIP[k], dp = r.d;
      const ph = ((t / (r.per + 3) + r.u * 5) % 1 + 1) % 1, env = clamp(Math.min(ph, 1 - ph) / 0.15, 0, 1);
      const x = ((r.u * rsp - t * W * (0.01 + dp * 0.035) - camOff * (0.3 + dp * 0.4)) % rsp + rsp) % rsp - rsp * 0.1;
      const sg = Math.round(2 + dp * 3), len = sg * 3;
      if (x < -len || x > W) continue;
      const al = env * (0.25 + dp * 0.55) * clamp(Math.min(x + len, W - x) / ef, 0, 1);
      if (al < 0.03) continue;
      ctx.globalAlpha = al;
      const rx = Math.round(x), ry = Math.round(shAt(clamp(x, 0, W), W) + H * (0.02 + dp * 0.08 + r.y));
      ctx.fillRect(rx, ry + 1, sg, 1);
      ctx.fillRect(rx + sg, ry, sg, 1);
      ctx.fillRect(rx + 2 * sg, ry + 1, sg, 1);
    }
    ctx.globalAlpha = 1;
    ctx.globalAlpha = 1;
    if (o.mid) o.mid(ctx);
    // a clear hole in the tar round each piece where it meets the surface (lower half only: the piece covers the rest)
    for (const pc of o.pieces) {
      const rx = pc.r + 5, ry = Math.min(rx * 0.28, H * 0.025);
      ctx.beginPath();
      ctx.ellipse(pc.x, pc.y, rx, ry, 0, 0, Math.PI);
      ctx.closePath();
      ctx.fillStyle = "rgb(27,31,30)";
      ctx.fill();
      ctx.strokeStyle = "rgb(37,42,41)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (!o.wet) continue;
      // the ceiling's pieces get the floor's full treatment: a wet lip on the near side, wavelets running out along the surface, and ripple arcs spreading from the piece
      ctx.beginPath();
      ctx.ellipse(pc.x, pc.y, rx + 3, ry + 2, 0, 0.15, Math.PI - 0.15);
      ctx.strokeStyle = "rgb(36,41,40)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "rgb(58,64,62)";
      for (let sd = -1; sd <= 1; sd += 2) {
        for (let n = 0; n < 3; n++) {
          const ph = ((t * 0.35 + n / 3 + pc.x * 0.013) % 1 + 1) % 1, d = rx + 4 + ph * rx * 0.9, sg = Math.round(3 + n), wx = pc.x + sd * d - (sd < 0 ? sg * 2 : 0);
          ctx.globalAlpha = 0.5 * Math.min(1, (1 - ph) * 2.5);
          const wy = Math.round(shAt(clamp(pc.x + sd * d, 0, W), W) + 2 + n * 3);
          ctx.fillRect(Math.round(wx), wy + 1, sg, 1);
          ctx.fillRect(Math.round(wx) + sg, wy, sg, 1);
        }
      }
      ctx.globalAlpha = 1;
    }
    if (o.dir < 0) ctx.restore();
  }


  // dark tar slicks on the surface: lobes drift apart and together; all rims first, then all tar, so overlaps read as one blob
  // floating pieces at the waterline (x, half width, y), collected each frame for the slick bend and the clear ring
  const LNX = new Float64Array(7), LNY = new Float64Array(7), LNH = new Float64Array(7);
  const OBX = new Float64Array(32), OBR = new Float64Array(32), OBY = new Float64Array(32);
  let OBN = 0;
  const ANX = new Float64Array(2), ANR = new Float64Array(2), ANV = new Uint8Array(2);   // the pieces the first two slicks ride on
  const SLK = [], SLP = 14, SLX = new Float64Array(SLP), SLY = new Float64Array(SLP);
  let SLRIM = "", SLTAR = "";
  function drawSlicks(ctx, W, H, camOff, t) {
    if (!SLK.length) {
      const r = mulberry(7731);
      SLRIM = seaTone(1, 0, 0.3); SLTAR = seaTone(1, 0, 0.19);
      for (let i = 0; i < 9; i++) {
        const sl = { u: (i + r() * 0.7) / 9, d: r(), sz: 0.035 + r() * 0.03, sp: 6 + r() * 7, lb: [] };
        let n = 3 + Math.floor(r() * 2);
        if (i < 2) { n = 4; sl.d = 0.45; }   // the first two ride a piece: two lobes each side of it
        for (let j = 0; j < n; j++) {
          const lb = { ax: (j / (n - 1) - 0.5) * 0.1 + (r() - 0.5) * 0.02, amp: 0.04 + r() * 0.04, w: 1.05 + r() * 0.45, ph: r() * TAU, k: 0.5 + r() * 0.5, sq: 0.34 + r() * 0.14, wp: [] };
          for (let k = 0; k < SLP; k++) lb.wp.push(r() * TAU);
          sl.lb.push(lb);
        }
        SLK.push(sl);
      }
    }
    const span = W * 1.5;   // wide wrap: a slick jumps only while fully off screen, so none pops
    // the first two slicks ride on a piece (the one nearest the middle, then the next), eased so a change of piece slides
    let near = -1;
    for (let m = 0; m < OBN; m++) if (OBX[m] > 0 && OBX[m] < W && (near < 0 || Math.abs(OBX[m] - W * 0.5) < Math.abs(OBX[near] - W * 0.5))) near = m;
    for (let i = 0; i < 2; i++) {
      if (near < 0) { ANV[i] = 0; continue; }
      const m = (near + i) % OBN;
      if (!ANV[i]) { ANX[i] = OBX[m]; ANR[i] = OBR[m]; ANV[i] = 1; }
      else { ANX[i] += (OBX[m] - ANX[i]) * 0.08; ANR[i] += (OBR[m] - ANR[i]) * 0.08; }
    }
    for (let tier = 0; tier < 2; tier++) {
      for (let pass = 0; pass < 2; pass++) {
        ctx.globalAlpha = tier ? 1 : 0.55;
        ctx.fillStyle = pass ? SLTAR : SLRIM;
        ctx.beginPath();
        for (let i = 0; i < SLK.length; i++) {
          const sl = SLK[i];
          if ((sl.d > 0.4 ? 1 : 0) !== tier) continue;
          const cx = ((sl.u * span + -t * sl.sp - camOff * 0.6) % span + span) % span - span * 0.17;
          const sc = 0.45 + 0.55 * sl.d, base = sl.sz * W * sc;
          for (let j = 0; j < sl.lb.length; j++) {
            const lb = sl.lb[j];
            let lx = cx + (lb.ax + lb.amp * Math.sin(t * lb.w + lb.ph)) * W * sc;
            if (i < 2 && ANV[i]) {
              const hn = sl.lb.length >> 1;
              lx = ANX[i] + (j < hn ? -1 : 1) * (ANR[i] + 5 + base * lb.k * (0.9 + 1.1 * (j % hn)) + base * 0.55 * Math.sin(t * lb.w + lb.ph));
            }
            if (lx < -base * 2 || lx > W + base * 2) continue;
            const sh0 = shAt(clamp(lx, 0, W), W);
            let rad = base * lb.k * (0.85 + 0.15 * Math.sin(t * 0.8 * lb.w + lb.ph * 2)) * (1 + 0.2 * swellS((lx + camOff) / W, t));
            // pinch: a lobe necks down smoothly as it nears a piece (nothing at the piece, whole again far from it)
            for (let m = 0; m < OBN; m++) {
              const u = clamp((Math.abs(lx - OBX[m]) - OBR[m] - 5) / (rad * 1.5), 0, 1);
              rad *= u * u * (3 - 2 * u);
            }
            rad += pass ? 0 : 1.5;
            // sit low enough that the round top stays under the sea line
            const ly = Math.max(sh0 + H * (0.01 + sl.d * 0.05) + Math.sin(t * lb.w * 0.7 + lb.ph) * H * 0.002 * sc, sh0 + rad * lb.sq * 1.45 + 3);
            for (let k = 0; k < SLP; k++) {
              const a = k / SLP * TAU, rr = rad * (1 + 0.26 * Math.sin(t * 0.5 * lb.w + lb.wp[k]) + 0.1 * Math.sin(a * 2 + lb.ph) + 0.1 * Math.sin(a * 3 + t * 0.3 * lb.w + lb.ph));
              SLX[k] = lx + Math.cos(a) * rr; SLY[k] = ly + Math.sin(a) * rr * lb.sq;
            }
            ctx.moveTo((SLX[0] + SLX[SLP - 1]) / 2, (SLY[0] + SLY[SLP - 1]) / 2);
            for (let k = 0; k < SLP; k++) {
              const k2 = (k + 1) % SLP;
              ctx.quadraticCurveTo(SLX[k], SLY[k], (SLX[k] + SLX[k2]) / 2, (SLY[k] + SLY[k2]) / 2);
            }
            ctx.closePath();
          }
        }
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  // the sea-bound particles' heaps fade as the formed shapes rise through them
  const DEB_END = 19.5, RISE = 3.5;
  const FORMU = [], FORMF = [];

  // washed-out tone of one of the five GenEldPal.SEA families (fi), dimmed by k
  const hexN = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  function seaTone(fi, tone, k) {
    k = (k || 1) * 0.3;
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
  let CLN = 0;
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
  const WV = new Float32Array(13), STREAK = new Array(11), RIP = new Array(36),SY2 = new Float32Array(13);
  const RFX = new Float32Array(48), RFH = new Float32Array(48), RFW = new Float32Array(48), RFP = new Float32Array(48);
  let RFN = 0;
  // the strange objects rising out of the water: 7 per screen width, spaced apart; each a seeded Path2D in local
  // units (base at 0,0, 62-120 high, y up is negative), built once, then moved, tilted and scaled per frame
  // washed-out bridge values (lit, shade): the bridge's greys pushed toward the murky water, a little lighter
  // each object takes its own pair, all pale and washed out: blue-greys light and dark, ash, bone, sand, rust, olive, mauve
  const FAM = [["#7e8886", "#565e5c"], ["#a9b4b8", "#737e83"], ["#5f6c72", "#3f4a4f"], ["#a39d88", "#6e6a5a"], ["#8f7466", "#5e4a42"], ["#9aa0a0", "#646a6a"],
    ["#b3a88f", "#7a705d"], ["#6f8a90", "#485c62"], ["#80866a", "#565a45"], ["#8a8090", "#5c5463"], ["#b8bfc0", "#818a8c"], ["#7a6a60", "#4d423c"]];
  const dimHex = (f, k) => f.map(c => "#" + [1, 3, 5].map(j => Math.round(parseInt(c.slice(j, j + 2), 16) * k).toString(16).padStart(2, "0")).join(""));
  const FAMB = FAM.map(p => dimHex(p, 0.28)), FAMS2 = FAM.map(p => dimHex(p, 0.55));   // big pieces sink under the deck (luminance about 54); small shards keep a little contrast
  const OBJ_N = 33, OBJ_SM = 170, OBJ_SPAN = 3, OBJ = [], OBJ_ALL = [], OBJ_BACK = [], OBJ_FRONT = [];
  // rare slots: all 11 kinds, one each, over RARE_SPAN screens (twice the common wrap, so 1-3 show per screen); the kind
  // order is a seeded shuffle of the creatures (0-4) and mundane kinds (5-11) in the pattern below
  const RARE_N = 11, RARE_SPAN = 6, RARE_PAT = "mcmcmcmcmcm", OBJ_RARE = [];
  const RFAM = [1, 3, 6, 10, 5, 9, 4];   // the lighter pairs, so the rare pieces stand off the dark water
  const RCX = new Float32Array(RARE_N), RCR2 = new Float32Array(RARE_N);
  let boxCv = null;
  (function seedObjects() {
    const r = mulberry(5521);
    // sites along the span with uneven gaps; the first few are clusters of 2-5, the rest loners
    const NSITE = 10, sites = [], sizes = [4, 3, 5, 3, 2, 1, 1, 1, 1];
    let tot = 0;
    for (let i = 0; i < NSITE; i++) { sites.push(0.15 + Math.pow(r(), 2.2) * 2.4); tot += sites[i]; }
    for (let i = 0, c = r(); i < NSITE; i++) { c += sites[i] / tot; sites[i] = c % 1; }
    sizes.push(1);
    for (let i = sizes.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)), x = sizes[i]; sizes[i] = sizes[j]; sizes[j] = x; }
    const slots = [];   // [site u, offset in object heights] per big object
    for (let i = 0; i < NSITE; i++) for (let k = 0; k < sizes[i]; k++) slots.push([sites[i], sizes[i] === 1 ? (r() - 0.5) * 0.6 : (k - (sizes[i] - 1) / 2) * (0.5 + r() * 0.5) + (r() - 0.5) * 0.4]);
    while (slots.length < OBJ_N) {   // the rest spread evenly along the span so no stretch stays bare
      if (slots.length % 2) slots.push([r(), 0]);
      else { const s0 = sites[Math.floor(r() * NSITE)]; slots.push([s0, (r() - 0.5) * 3]); }
    }
    // kinds by position along the span: sticks and blocks alternate, each cycling through its own shuffled list, so no
    // two neighbours share a kind and every screen holds several block kinds
    const order = slots.map((sl, i) => i).sort((a, b) => (slots[a][0] + slots[a][1] * 0.01) - (slots[b][0] + slots[b][1] * 0.01)), rank = [];
    order.forEach((i, k) => { rank[i] = k; });
    const shuf = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; } return a; };
    const KST = shuf([0, 1, 2, 3, 4]), KBL = shuf([5, 6, 7, 8, 9, 10, 11, 12, 13]), FSH = shuf(FAM.map((f, k) => k));
    for (let i = 0; i < OBJ_N; i++) {
      const fam = FAMB[FSH[(i * 5) % FAM.length]], h = r() < 0.18 ? 125 + r() * 45 : 50 + r() * 60, p0 = new Path2D(), p = p0;
      const flat = rank[i] % 3 === 1;   // some lie almost flat, the rest stand
      const o = { i, u: slots[i][0], dxr: slots[i][1], dpx: 0, dy: r() * 0.014, dep: r() < 0.3 ? 0.35 + r() * 0.1 : r() * 0.25, front: r() < 0.3, p, rule: "nonzero", hw: 0.18 * h,
        tilt: (flat ? 50 + r() * 30 : 4 + r() * 30) * (i % 2 ? 1 : -1) * Math.PI / 180, ph: r() * TAU, rs: 6 + r() * 2, c: fam[0], cs: fam[1], split: 0 };
      let xl = 0, xr = 0;
      const rg = (a, b) => a + r() * (b - a), sg = () => (r() < 0.5 ? -1 : 1);
      // every piece is a straight-edged polygon (left side up, top left to right, right side down); extents tracked for the hit box
      const poly = a => { p.moveTo(a[0], a[1]); for (let k = 0; k < a.length; k += 2) { if (k) p.lineTo(a[k], a[k + 1]); if (a[k] < xl) xl = a[k]; if (a[k] > xr) xr = a[k]; } p.closePath(); };
      // a broken edge from xa to xb near height y: n - 1 teeth of random depth
      const jag = (xa, xb, y, n, amp) => { const a = []; for (let k = 1; k < n; k++) a.push(xa + (xb - xa) * k / n + (r() - 0.5) * amp * 0.5, y - r() * amp); return a; };
      // a post: base centre x0, half-width w, height hh, top shifted by lean, top half-width w * wt, jagged top
      const post = (x0, w, hh, lean, wt, n, amp) => poly([x0 - w, 0, x0 - w * wt + lean, -hh, ...jag(x0 - w * wt + lean, x0 + w * wt + lean, -hh, n, amp), x0 + w * wt + lean, -hh * rg(0.82, 0.97), x0 + w, 0]);
      // a rectangle turned by rot about its bottom centre, cut from (cx, base y by)
      const rect = (cx, by, w, ht, rot) => { const c = Math.cos(rot), s = Math.sin(rot), q = [-w, 0, -w, -ht, w, -ht, w, 0], o2 = []; for (let k = 0; k < 8; k += 2) o2.push(cx + q[k] * c - q[k + 1] * s, by + q[k] * s + q[k + 1] * c); return o2; };
      const kind = rank[i] % 2 === 0 ? KST[(rank[i] >> 1) % 5] : KBL[(rank[i] >> 1) % 9];
      if (kind === 0) {   // a single broken post
        post(0, h * rg(0.05, 0.12), h * rg(0.7, 1), h * rg(-0.18, 0.18), rg(0.55, 1), 2 + Math.floor(r() * 6), h * rg(0.04, 0.2));
      } else if (kind === 1) {   // a double stick: two posts side by side, leaning differently
        const d = h * rg(0.09, 0.2), w1 = h * rg(0.04, 0.09), w2 = h * rg(0.04, 0.09), sd = sg();
        post(-d, w1, h * rg(0.6, 0.95), sd * h * rg(0.05, 0.25), rg(0.5, 1), 2 + Math.floor(r() * 4), h * 0.1);
        post(d, w2, h * rg(0.75, 1), -sd * h * rg(0.02, 0.2), rg(0.5, 1), 2 + Math.floor(r() * 4), h * 0.12);
      } else if (kind === 2) {   // a crossed pair, an X
        const s = h * rg(0.1, 0.2), kk = rg(0.8, 1.3), sd = sg();
        post(-s * sd, h * rg(0.04, 0.08), h * rg(0.75, 1), 2 * s * sd * kk, rg(0.5, 0.9), 3, h * 0.08);
        post(s * sd, h * rg(0.04, 0.08), h * rg(0.6, 0.95), -2 * s * sd * rg(0.8, 1.3), rg(0.5, 0.9), 3, h * 0.08);
      } else if (kind === 3) {   // a post with a short cross-bar, a broken T
        const w = h * rg(0.05, 0.1), hh = h * rg(0.75, 1), by = -hh * rg(0.55, 0.88), bt = h * rg(0.07, 0.14), bl = h * rg(0.15, 0.32), br = h * rg(0.1, 0.3), dl = h * rg(-0.06, 0.06);
        post(0, w, hh, h * rg(-0.05, 0.05), rg(0.6, 0.9), 3, h * 0.08);
        poly([-bl, by + dl, -bl - h * 0.04, by - bt * 0.5 + dl, -bl, by - bt + dl, ...jag(-bl, br, by - bt, 3, h * 0.06), br, by - bt - dl, br + h * 0.03, by - bt * 0.4 - dl, br, by - dl]);
      } else if (kind === 4) {   // a splintered post forking at its top
        const w = h * rg(0.06, 0.11), fy = h * rg(0.4, 0.62), fl = h * rg(0.08, 0.3), fr = h * rg(0.08, 0.3), hl = fy + h * rg(0.2, 0.42), hr = fy + h * rg(0.12, 0.45), pw = w * rg(0.5, 0.9), gap = h * rg(0.04, 0.12);
        poly([-w, 0, -w * 0.9, -fy, -fl - pw, -hl, -fl + pw * 0.3, -hl - h * 0.05, -fl * 0.2 + pw * 0.3, -fy - gap, fr * 0.2 - pw * 0.3, -fy - gap * 0.6, fr - pw * 0.3, -hr - h * 0.04, fr + pw, -hr, w * 0.9, -fy, w, 0]);
      } else if (kind === 5) {   // a tilted square crate, one corner chipped
        const w = h * rg(0.18, 0.34), ht = w * rg(1.2, 2.1), a = rect(0, 0, w, ht, rg(-0.3, 0.3)), ch = h * rg(0.04, 0.1);
        poly([a[0], a[1], a[2], a[3], a[4] - ch * 1.5, a[5], a[4], a[5] + ch, a[6], a[7]]);
      } else if (kind === 6) {   // a stepped block: 2 or 3 stacked rectangles, offset
        const n = 2 + Math.floor(r() * 2);
        let y = 0, wd = h * rg(0.2, 0.34), cx = 0;
        for (let k = 0; k < n; k++) { const bh = h * rg(0.18, 0.34); poly([cx - wd, y, cx - wd, y - bh, cx + wd, y - bh - rg(-0.03, 0.03) * h, cx + wd, y]); y -= bh * 0.9; wd *= rg(0.5, 0.82); cx += sg() * wd * rg(0.2, 0.7); }
      } else if (kind === 7) {   // an L-shaped beam
        const t = h * rg(0.08, 0.15), H = h * rg(0.65, 1), W = h * rg(0.25, 0.5), t2 = t * rg(0.8, 1.4), a = h * 0.1;
        poly([-a, 0, -a, -H, ...jag(-a, -a + t, -H, 3, h * 0.08), -a + t, -H + h * 0.04, -a + t, -t2, W, -t2 - h * 0.03, W, 0]);
      } else if (kind === 8) {   // a slab with a notch cut out of its top
        const w = h * rg(0.2, 0.38), ht = h * rg(0.35, 0.6), nx = w * rg(-0.4, 0.4), nw = w * rg(0.2, 0.4), nd = ht * rg(0.35, 0.65);
        poly([-w, 0, -w, -ht, nx - nw, -ht, nx - nw * 0.6, -ht + nd, nx + nw * 0.8, -ht + nd * 0.8, nx + nw, -ht, w, -ht * rg(0.8, 1), w, 0]);
      } else if (kind === 9) {   // a broken frame: a square with one side missing
        const W = h * rg(0.35, 0.6), H = h * rg(0.5, 0.85), t = h * rg(0.07, 0.12), m = sg(), x0 = -W * 0.5;
        if (r() < 0.5) {
          const sh = H * rg(0.25, 0.6);
          poly([x0, 0, x0, -H, x0 + W, -H, x0 + W, -H + t, x0 + t, -H + t, x0 + t, -t, x0 + W * rg(0.5, 0.9), -t - h * 0.02, x0 + W * rg(0.5, 0.9), 0]);
          if (m > 0) poly([x0 + W, -H + t, x0 + W - t * 0.6, -H + t + sh * 0.5, x0 + W, -H + t + sh]);
        } else {
          const sh = H * rg(0.3, 0.6);
          poly([x0, 0, x0, -H, x0 + t, -H, x0 + t, -t, x0 + W - t, -t, x0 + W - t, -sh, x0 + W, -sh - h * 0.05, x0 + W, 0]);
        }
      } else if (kind === 11) {   // a tall pillar, top chipped
        const w = h * rg(0.08, 0.14), ht = h * rg(0.85, 1.15), ch = w * rg(0.5, 1.2);
        poly([-w, 0, -w, -ht, w - ch, -ht, w, -ht + ch * 1.4, w, 0]);
      } else if (kind === 12) {   // a flat slab, wide and low, one end cut slanted
        const w = h * rg(0.4, 0.65), ht = h * rg(0.1, 0.18);
        poly([-w, 0, -w, -ht, w * 0.7, -ht * rg(1, 1.3), w, -ht * 0.3, w, 0]);
      } else if (kind === 13) {   // a plain cube
        const w = h * rg(0.2, 0.3);
        poly(rect(0, 0, w, w * 2 * rg(0.9, 1.05), rg(-0.06, 0.06)));
      } else {   // a wedge
        const w = h * rg(0.18, 0.36), hl = h * rg(0.5, 1), hr = h * rg(0.04, 0.25), a = [-w, 0, -w, -hl];
        const n = 2 + Math.floor(r() * 2);
        for (let k = 1; k < n; k++) { const f = k / n; a.push(-w + 2 * w * f + (r() - 0.5) * h * 0.06, -hl + (hl - hr) * f - r() * h * 0.08); }
        a.push(w, -hr, w, 0);
        poly(a);
      }
      // width-to-height varies widely (about 0.15 to 1.6): the unit shape is stretched across
      const ax = kind < 5 ? rg(0.6, 1.6) : kind >= 11 ? rg(0.9, 1.1) : rg(0.5, 2.3);
      o.p = new Path2D();
      o.p.addPath(p0, new DOMMatrix([ax, 0, 0, 1, 0, 0]));
      xl *= ax; xr *= ax;
      o.hw = Math.max(Math.abs(xl), Math.abs(xr));
      o.split = xl + (xr - xl) * 0.3;
      o.h = h;
      objBox(o);
      OBJ.push(o);
      OBJ_ALL.push(o);
      (o.front ? OBJ_FRONT : OBJ_BACK).push(o);
    }
    // many much smaller bits (6-30 px): a stick tip, a block corner or a splinter, one flat polygon each; about two
    // thirds gather round a big site, the rest lie alone
    const clumps = [];   // loose clumps of small bits away from the big sites
    for (let k = 0; k < 9; k++) clumps.push((k + r()) / 9);
    for (let i = OBJ_N; i < OBJ_N + OBJ_SM; i++) {
      const hs = 14 + r() * 30, c = r() < 0.8, fam = FAMS2[Math.floor(r() * FAM.length)], p = new Path2D();
      const mode = (i - OBJ_N) % 5, near = mode < 2, clump = mode === 2, kd = Math.floor(r() * 3), w = hs * (kd === 2 ? 0.1 + r() * 0.08 : 0.2 + r() * 0.3);
      if (kd === 0) { p.moveTo(-w, 0); p.lineTo(-w * 0.8, -hs); p.lineTo(-w * 0.1, -hs * (0.8 + r() * 0.15)); p.lineTo(w * 0.5, -hs * 0.95); p.lineTo(w, 0); }
      else if (kd === 1) { p.moveTo(-w, 0); p.lineTo(-w, -hs); p.lineTo(w * (0.4 + r() * 0.5), -hs * 0.85); p.lineTo(w * 0.9, -hs * 0.3); p.lineTo(w, 0); }
      else { p.moveTo(-w, 0); p.lineTo(w * 0.2, -hs); p.lineTo(w, 0); }
      p.closePath();
      const o = { i, u: near ? sites[Math.floor(r() * NSITE)] : clump ? clumps[Math.floor(r() * clumps.length)] : (Math.floor((i - OBJ_N) / 5) + r()) / (OBJ_SM / 5), dxr: 0, dpx: near ? (r() - 0.5) * 260 : clump ? (r() - 0.5) * 110 : 0, dy: r() * 0.014, dep: r() * 0.1, front: r() < 0.4, p, rule: "nonzero",
        tilt: (r() - 0.5) * 1.3, ph: r() * TAU, rs: 1 + r() * 1.5, c: c ? fam[0] : fam[1], cs: fam[1], split: 0, small: true, bh: hs, xl: -w - hs * 0.7, xr: w + hs * 0.7 };
      OBJ_ALL.push(o);
      (o.front ? OBJ_FRONT : OBJ_BACK).push(o);
    }
    // rare things peeking out of the water: about 2 per screen width, one stratified slot each so none touch; each has
    // a seeded list of randoms (rv) that its RK drawer reads; spec 24's mundane kinds can join RK the same way
    const rsh = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; } return a; };
    const RCR = rsh([0, 1, 2, 3, 4]), RMU = rsh([5, 6, 7, 8, 9, 10]);
    for (let j = 0, ci = 0, mi = 0; j < RARE_N; j++) {
      const rv = [], fam = FAMB[RFAM[Math.floor(r() * RFAM.length)]], h = (62 + r() * 34) * 1.9, p = new Path2D();
      for (let k = 0; k < 24; k++) rv.push(r());
      const o = { i: OBJ_N + OBJ_SM + j, u: (j + 0.2 + r() * 0.6) / RARE_N, dxr: 0, dpx: 0, dy: r() * 0.014, dep: 0.03 + r() * 0.05, front: r() < 0.3, p, rule: "nonzero",
        tilt: (r() - 0.5) * 0.2, ph: r() * TAU, rs: 6 + r() * 2, c: fam[0], cs: fam[1], split: 0, h, hw: h * 1.4, xl: -h * 1.4, xr: h * 1.4, bh: h * 1.1,
        rare: { kd: RARE_PAT[j] === "c" ? RCR[ci++] : RMU[mi++], rv, j } };
      OBJ_ALL.push(o);
      OBJ_RARE.push(o);
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
  // the drawn scale of an object: H / 900, but its drawn height is held to 50-150 px; small bits stay at 1:1
  const objK = (o, H) => o.small ? 1 : o.rare ? clamp(H * 0.75 / 900, 0.45, 1.1) : clamp(H * 0.75 / 900, 33 / o.bh, 130 / o.bh);
  // world x of each object: its site along the span plus a scatter (in object heights and px), so clusters overlap
  // and stretches between them stay empty; the wrap period is 3 screens
  let objW = 0, objH = 0, objSpan = 0;
  function objLayout(W, H) {
    if (objW === W && objH === H) return;
    objW = W; objH = H;
    objSpan = OBJ_SPAN * W;
    for (let i = 0; i < OBJ_ALL.length; i++) { const o = OBJ_ALL[i]; o.x = o.u * (o.rare ? objSpan * RARE_SPAN / OBJ_SPAN : objSpan) + o.dxr * o.bh * objK(o, H) + o.dpx; }
  }
  // rare creatures, drawn each frame in local units (base at 0,0, y up negative, h about 60-95): flat angular shapes,
  // o.c lit, o.cs shade; a tapering angular stalk from (x0, y0), turning da per segment plus a slow sway
  function stalk(ctx, x0, y0, a0, da, len, w0, n, sw) {
    const L = [], R = [];
    let x = x0, y = y0, a = a0;
    for (let j = 0; j < n; j++) {
      const w = w0 * (1 - j / (n + 0.6)), c = Math.cos(a), s = Math.sin(a);
      L.push(x - c * w, y - s * w); R.push(x + c * w, y + s * w);
      a += da + sw; x += Math.sin(a) * len / n; y -= Math.cos(a) * len / n;
    }
    ctx.beginPath();
    ctx.moveTo(L[0], L[1]);
    for (let k = 2; k < L.length; k += 2) ctx.lineTo(L[k], L[k + 1]);
    ctx.lineTo(x, y);
    for (let k = R.length - 2; k >= 0; k -= 2) ctx.lineTo(R[k], R[k + 1]);
    ctx.closePath();
    ctx.fill();
  }
  const poly = (ctx, c, a) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(a[0], a[1]); for (let i = 2; i < a.length; i += 2) ctx.lineTo(a[i], a[i + 1]); ctx.closePath(); ctx.fill(); };
  // a polygon in lit tone c with the right of x0 in shade cs (a hard split, clipped to the shape)
  const ps = (ctx, c, cs, a, x0, h) => { poly(ctx, c, a); ctx.save(); ctx.clip(); ctx.fillStyle = cs; ctx.fillRect(x0, -h * 2, h * 3, h * 3); ctx.restore(); };
  // a thick tentacle from (x0, 0): wide at the base, tapering, curling at the tip; the right half shaded, suckers on the inner side
  function tent(ctx, x0, len, w0, curl, lean, sw, c, cs) {
    const n = 12, L = [], R = [], X = [], Y = [];
    let x = x0, y = 0;
    for (let j = 0; j <= n; j++) {
      const u = j / n, a = lean + curl * u * u + sw * u, w = w0 * Math.pow(1 - u, 0.8) + 1, co = Math.cos(a), si = Math.sin(a);
      L.push(x - co * w, y - si * w); R.push(x + co * w, y + si * w); X.push(x); Y.push(y);
      x += Math.sin(a) * len / n; y -= Math.cos(a) * len / n;
    }
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.moveTo(L[0], L[1] + 10);
    for (let k = 0; k < L.length; k += 2) ctx.lineTo(L[k], L[k + 1]);
    for (let k = R.length - 2; k >= 0; k -= 2) ctx.lineTo(R[k], R[k + 1]);
    ctx.lineTo(R[0], R[1] + 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = cs;
    ctx.beginPath(); ctx.moveTo(X[0], Y[0] + 10);
    for (let j = 0; j <= n; j++) ctx.lineTo(X[j], Y[j]);
    for (let k = R.length - 2; k >= 0; k -= 2) ctx.lineTo(R[k], R[k + 1]);
    ctx.lineTo(R[0], R[1] + 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#a9bcc0";
    const E = curl > 0 ? R : L;
    for (let j = 2; j < n - 1; j++) { const d = Math.max(2, w0 * Math.pow(1 - j / n, 0.8) * 0.3); ctx.fillRect((X[j] + E[j * 2]) / 2 - d / 2, (Y[j] + E[j * 2 + 1]) / 2 - d / 2, d, d); }
  }
  // a clawed finger: two jointed segments, claw at the tip
  function finger(ctx, x, y, a, len, w, bend, c) {
    const s1 = Math.sin(a), c1 = Math.cos(a), kx = x + s1 * len * 0.55, ky = y - c1 * len * 0.55, a2 = a + bend, s2 = Math.sin(a2), c2 = Math.cos(a2), ex = kx + s2 * len * 0.45, ey = ky - c2 * len * 0.45;
    poly(ctx, c, [x - c1 * w, y - s1 * w, kx - c1 * w * 0.85, ky - s1 * w * 0.85, ex - c2 * w * 0.6, ey - s2 * w * 0.6, ex + c2 * w * 0.6, ey + s2 * w * 0.6, kx + c1 * w * 0.85, ky + s1 * w * 0.85, x + c1 * w, y + s1 * w]);
    poly(ctx, "#a9bcc0", [ex - c2 * w * 0.6, ey - s2 * w * 0.6, ex + s2 * w * 3 + c2 * w * 0.4, ey - c2 * w * 3 + s2 * w * 0.4, ex + c2 * w * 0.6, ey + s2 * w * 0.6]);
  }
  // flat, one tone pair per kind (never the shard palette): lit left, shade right
  const RK = [
    function tentacle(ctx, o, t, h, rv) {   // 1-3 thick curling arms, slow sway
      const cnt = 1 + Math.floor(rv[0] * 3);
      for (let c = cnt - 1; c >= 0; c--) {
        const sg = c % 2 ? -1 : 1;
        tent(ctx, (c - (cnt - 1) / 2) * h * 0.36, h * (0.8 + rv[11 + c] * 0.35) * (c ? 0.8 : 1), h * (0.11 + rv[14 + c] * 0.03), sg * (1.9 + rv[8 + c] * 0.9), (rv[5 + c] - 0.5) * 0.3, Math.sin(t * 1.5 + o.ph + c * 1.3) * 0.25,
          c % 2 ? "#202729" : "#252c2e", c % 2 ? "#141a1c" : "#181d1f");
      }
    },
    function crocEyes(ctx, o, t, h, rv) {   // two scaly bumps on the waterline, yellow eyes with slit pupils, a bob and a blink
      const gap = h * (0.42 + rv[0] * 0.1), bw = h * (0.26 + rv[1] * 0.05), bh = h * (0.4 + rv[2] * 0.1), per = 1800 + rv[3] * 1800;
      const bp = (t * 1000 + o.ph * 700) % per, blink = bp < 260 ? Math.sin(bp / 260 * Math.PI) : 0, look = Math.sin(t * 0.8 + o.ph) * bw * 0.2;
      ctx.translate(0, Math.sin(t * 1.1 + o.ph) * h * 0.025);
      // the snout ridge between the bumps, just breaking the waterline
      ps(ctx, "#161b19", "#0e1210", [-gap, 10, -gap, -bh * 0.3, -gap * 0.4, -bh * 0.42, gap * 0.4, -bh * 0.42, gap, -bh * 0.3, gap, 10], 0, h);
      poly(ctx, "#0e1210", [-gap * 0.12, -bh * 0.42, gap * 0.12, -bh * 0.42, gap * 0.08, -bh * 0.55, -gap * 0.08, -bh * 0.55]);
      for (let e = -1; e <= 1; e += 2) {
        const cx = e * gap, ey = -bh * 0.55, ew = bw * 0.72, eh = bh * 0.2;
        ps(ctx, "#161b19", "#0e1210", [cx - bw, 10, cx - bw, -bh * 0.45, cx - bw * 0.7, -bh * 0.85, cx - bw * 0.25, -bh, cx + bw * 0.25, -bh, cx + bw * 0.7, -bh * 0.85, cx + bw, -bh * 0.45, cx + bw, 10], cx + bw * 0.15, h);
        poly(ctx, "#33383a", [cx - ew, ey, cx - ew * 0.5, ey - eh, cx + ew * 0.5, ey - eh, cx + ew, ey, cx + ew * 0.5, ey + eh, cx - ew * 0.5, ey + eh]);
        ctx.fillStyle = "#040504"; ctx.fillRect(cx + look - 3, ey - eh, 6, eh * 2);
        poly(ctx, "#0e1210", [cx - ew * 1.25, ey - eh * 0.4, cx - ew * 0.6, ey - eh * 1.7, cx + ew * 0.6, ey - eh * 1.7, cx + ew * 1.25, ey - eh * 0.4, cx + ew * 0.6, ey - eh * 0.9, cx - ew * 0.6, ey - eh * 0.9]);
        if (blink > 0) { ctx.fillStyle = "#161b19"; ctx.fillRect(cx - ew * 1.05, ey - eh * 0.9, ew * 2.1, eh * 1.9 * blink + 1); }
      }
    },
    function hand(ctx, o, t, h, rv) {   // a palm with a thumb and fingers with claws breaking the surface, slow flex
      const pw = h * (0.2 + rv[1] * 0.05), n = 4, fw = h * 0.05;
      ps(ctx, "#21292b", "#161c1d", [-pw, 10, -pw, -h * 0.2, -pw * 0.5, -h * 0.28, pw * 0.5, -h * 0.28, pw, -h * 0.2, pw, 10], pw * 0.1, h);
      finger(ctx, -pw * 0.85, -h * 0.2, -1.0, h * 0.3, fw * 1.15, 0.35 + Math.sin(t * 1.4 + o.ph + 2) * 0.2, "#21292b");
      for (let f = 0; f < n; f++) {
        const u = f / (n - 1) * 2 - 1, len = h * (0.46 + rv[2 + f] * 0.14) * (1 - Math.abs(u) * 0.12);
        finger(ctx, u * pw * 0.78, -h * 0.26, u * 0.28, len, fw, 0.25 + Math.sin(t * 1.4 + o.ph + f * 0.8) * 0.22, f < 2 ? "#21292b" : "#161c1d");
      }
    },
    function batWing(ctx, o, t, h, rv) {   // an arm bone, four ribs and a scalloped membrane, flutter
      const lean = (rv[0] - 0.5) * 0.4, sd = rv[2] < 0.5 ? -1 : 1, wx = Math.sin(lean) * h * 0.85, wy = -Math.cos(lean) * h * 0.85, tx = [], ty = [], pts = [0, 10, wx, wy];
      ctx.rotate(Math.sin(t * 2 + o.ph) * 0.07);
      for (let k = 0; k < 4; k++) {
        const a = 0.45 + k * 0.35 + Math.sin(t * 2 + o.ph + k * 0.5) * 0.06, len = h * (0.95 - k * 0.1) * (0.92 + rv[3 + k] * 0.16);
        tx.push(wx + sd * Math.sin(a) * len); ty.push(wy + Math.cos(a) * len * 0.7);
        if (k) pts.push((tx[k] + tx[k - 1]) / 2 + (wx - (tx[k] + tx[k - 1]) / 2) * 0.3, (ty[k] + ty[k - 1]) / 2 + (wy - (ty[k] + ty[k - 1]) / 2) * 0.3);
        pts.push(tx[k], ty[k]);
      }
      ps(ctx, "#1f2426", "#14191b", pts, 0, h);
      ctx.strokeStyle = "#0d1113"; ctx.lineWidth = 3;
      ctx.beginPath(); for (let k = 0; k < 4; k++) { ctx.moveTo(wx, wy); ctx.lineTo(tx[k], ty[k]); } ctx.stroke();
      ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(wx, wy); ctx.stroke();
      poly(ctx, "#33383a", [wx - 5, wy, wx + 5, wy, wx - sd * 4, wy - 18]);
    },
    function oldPeek(ctx, o, t, h, rv) {   // a rough dome with one big eye (iris, slit pupil, lid) that looks about and blinks
      const w = h * (0.5 + rv[1] * 0.15), dh = h * (0.55 + rv[2] * 0.15), pts = [-w, 10];
      for (let i = 0; i <= 10; i++) { const a = Math.PI * i / 10, j = 1 + (rv[10 + i % 8] - 0.5) * 0.1; pts.push(-w * Math.cos(a) * j, -dh * Math.sin(a) * j); }
      pts.push(w, 10);
      ctx.translate(0, Math.sin(t * 0.9 + o.ph) * h * 0.02);
      ps(ctx, "#15191c", "#0d1013", pts, w * 0.15, h);
      const er = Math.min(h * 0.2, w * 0.35), ex = (rv[4] - 0.5) * w * 0.3, ey = -dh * 0.5, look = Math.sin(t * 0.9 + o.ph * 1.3) * er * 0.35, bp = (t * 1000 + o.ph * 900) % 3500, lid = bp < 400 ? Math.sin(bp / 400 * Math.PI) : 0;
      ctx.fillStyle = "#33383a"; ctx.beginPath(); ctx.arc(ex, ey, er, 0, TAU); ctx.fill();
      ctx.fillStyle = "#1c2526"; ctx.beginPath(); ctx.arc(ex + look, ey, er * 0.6, 0, TAU); ctx.fill();
      ctx.fillStyle = "#060807"; ctx.fillRect(ex + look - 2, ey - er * 0.6, 4, er * 1.2);
      if (lid > 0) { ctx.save(); ctx.beginPath(); ctx.arc(ex, ey, er + 1, 0, TAU); ctx.clip(); ctx.fillStyle = "#15191c"; ctx.fillRect(ex - er - 1, ey - er - 1, er * 2 + 2, (er * 2 + 2) * lid); ctx.restore(); }
      if (rv[6] < 0.7) { ctx.fillStyle = "#33383a"; ctx.beginPath(); ctx.arc(-w * 0.62, -dh * 0.28, er * 0.25, 0, TAU); ctx.arc(w * 0.6, -dh * 0.3, er * 0.2, 0, TAU); ctx.fill(); }
    },
    // mundane drowned-world kinds: flat polygons
    function shoe(ctx, o, t, h, rv) {   // an upright boot: cuff, shaft, instep, toe, sole
      const a = h * (0.17 + rv[1] * 0.04), hh = h * (0.7 + rv[2] * 0.2), toe = h * (0.36 + rv[3] * 0.1), ft = h * 0.2;
      ctx.scale(rv[4] < 0.5 ? -1 : 1, 1);
      ps(ctx, "#202526", "#151b1c", [-a, 10, -a, -hh, a, -hh, a, -hh * 0.35, a + toe * 0.6, -ft * 1.25, a + toe, -ft * 0.85, a + toe * 1.04, -ft * 0.3, a + toe, 10], a * 0.1, h);
      poly(ctx, "#292f30", [-a * 1.05, -hh, a * 1.05, -hh, a * 1.05, -hh + h * 0.09, -a * 1.05, -hh + h * 0.09]);
      poly(ctx, "#0c1011", [-a * 1.06, 10, -a * 1.06, -h * 0.07, a + toe * 1.08, -h * 0.07, a + toe * 1.08, 10]);
      poly(ctx, "#0c1011", [-a * 1.06, -h * 0.07, -a * 0.2, -h * 0.07, -a * 0.2, -h * 0.13, -a * 1.06, -h * 0.13]);
    },
    function hat(ctx, o, t, h, rv) {   // a top hat, a bent wizard hat or a bowler, each with a brim
      const kd = Math.floor(rv[0] * 3), bw = h * (0.5 + rv[1] * 0.12), cw = bw * 0.55, ch = h * (0.45 + rv[3] * 0.15), by = -h * 0.1;
      if (kd === 1) {
        const tx = (rv[4] - 0.5) * h * 0.2;
        ps(ctx, "#1c2324", "#13181a", [-cw * 1.1, by, -cw * 0.35, -h * 0.5, tx, -h * 0.85, tx + h * 0.16, -h * 0.8, tx + h * 0.06, -h * 0.66, cw * 0.35, -h * 0.5, cw * 1.1, by], 0, h);
        poly(ctx, "#292f30", [-cw * 1.08, by, cw * 1.08, by, cw * 1.0, by - h * 0.07, -cw * 1.0, by - h * 0.07]);
      } else if (kd === 0) {
        ps(ctx, "#1a2022", "#111618", [-cw, by, -cw * 0.95, by - ch, cw * 0.95, by - ch, cw, by], 0, h);
        poly(ctx, "#292f30", [-cw, by, -cw, by - h * 0.09, cw, by - h * 0.09, cw, by]);
      } else {
        const p = [-cw * 1.1, by];
        for (let i = 1; i < 8; i++) { const a = Math.PI * i / 8; p.push(-cw * 1.1 * Math.cos(a), by - ch * 0.9 * Math.sin(a)); }
        p.push(cw * 1.1, by);
        ps(ctx, "#212626", "#161b1c", p, 0, h);
        poly(ctx, "#0c1011", [-cw * 1.1, by, -cw * 1.08, by - h * 0.07, cw * 1.08, by - h * 0.07, cw * 1.1, by]);
      }
      ps(ctx, kd === 1 ? "#1c2324" : kd === 0 ? "#1a2022" : "#212626", kd === 1 ? "#13181a" : kd === 0 ? "#111618" : "#161b1c", [-bw, 10, -bw, 0, -bw * 0.9, by, bw * 0.9, by, bw, 0, bw, 10], 0, h);
    },
    function bottle(ctx, o, t, h, rv) {   // a corked bottle, leaning
      const w = h * (0.17 + rv[0] * 0.05), nk = w * (0.38 + rv[1] * 0.1), bh = h * (0.5 + rv[2] * 0.12), hh = h * (0.9 + rv[3] * 0.08);
      ctx.rotate((rv[4] - 0.5) * 0.5);
      ps(ctx, "#1c2626", "#121a1a", [-w, 10, -w, -bh, -w * 0.85, -bh - h * 0.1, -nk, -bh - h * 0.22, -nk, -hh, -nk * 1.3, -hh, nk * 1.3, -hh, nk, -hh, nk, -bh - h * 0.22, w * 0.85, -bh - h * 0.1, w, -bh, w, 10], w * 0.15, h);
      poly(ctx, "#2f3535", [-w, -bh * 0.2, w, -bh * 0.2, w, -bh * 0.62, -w, -bh * 0.62]);
      poly(ctx, "#292f30", [-nk * 0.95, -hh, nk * 0.95, -hh, nk * 0.8, -hh - h * 0.07, -nk * 0.8, -hh - h * 0.07]);
    },
    function chunk(ctx, o, t, h, rv) {   // a lumpy broken slab, small and half sunk: only its low top clears the water
      const w = h * (0.2 + rv[0] * 0.05), th = h * (0.2 + rv[1] * 0.03), by = -h * 0.02, wl = -h * 0.14;   // by: the base; wl: the water line, so only the top third clears it
      ctx.rotate((rv[2] - 0.5) * 0.2);
      // one uneven ridge: a single peak, a broken slope each side, no notch
      ps(ctx, "#23282a", "#171c1e", [-w, by, -w * 1.02, by - th * 0.34, -w * 0.72, by - th * 0.5, -w * 0.52, by - th * 0.6, -w * 0.3, by - th * 0.66, -w * 0.08, by - th, w * 0.16, by - th * 0.9, w * 0.4, by - th * 0.68, w * 0.58, by - th * 0.74, w * 0.92, by - th * 0.36, w * 0.88, by], 0, h * 0.6);
      // the water over its foot: a short ragged line that follows the ripple, a thin lighter wavelet edge on top
      const n = 9, x0 = -w * 1.45, dx = w * 2.9 / n, wy = [];
      for (let i = 0; i <= n; i++) wy.push(wl + (rv[3 + i % 6] - 0.5) * h * 0.035 + Math.sin(t * 0.8 + o.ph + i * 1.3) * h * 0.012);
      wy[0] = h * 0.03; wy[n] = h * 0.03; wy[1] = (wy[1] + wl) / 2 + h * 0.03; wy[n - 1] = (wy[n - 1] + wl) / 2 + h * 0.03;   // the ends ease down to the sea
      ctx.fillStyle = "rgb(7,8,8)";
      ctx.beginPath(); ctx.moveTo(x0, by + h * 0.3);
      for (let i = 0; i <= n; i++) ctx.lineTo(x0 + dx * i, wy[i]);
      ctx.lineTo(x0 + dx * n, by + h * 0.3); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgb(10,12,11)"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x0, wy[0]);
      for (let i = 1; i <= n; i++) if (i % 4) ctx.lineTo(x0 + dx * i, wy[i]); else ctx.moveTo(x0 + dx * i, wy[i]);
      ctx.stroke();
    },
    function mask(ctx, o, t, h, rv) {   // a blank flat mask, eye and mouth holes cut through
      const w = h * (0.28 + rv[0] * 0.08), fh = h * (0.75 + rv[1] * 0.15), ey = -fh * 0.62, ew = w * (0.22 + rv[2] * 0.1), sk = (rv[3] - 0.5) * w * 0.3;
      ctx.beginPath();
      ctx.moveTo(-w, -fh * 0.15); ctx.lineTo(-w * 0.9, -fh * 0.8); ctx.lineTo(-w * 0.3, -fh); ctx.lineTo(w * 0.5, -fh * 0.97); ctx.lineTo(w, -fh * 0.7); ctx.lineTo(w * 0.85, -fh * 0.2); ctx.lineTo(0, 0); ctx.closePath();
      ctx.moveTo(-w * 0.65, ey); ctx.lineTo(-w * 0.15, ey - ew * 0.3); ctx.lineTo(-w * 0.2, ey + ew * 0.5); ctx.closePath();
      ctx.moveTo(w * 0.15 + sk, ey - ew * 0.3); ctx.lineTo(w * 0.65 + sk, ey); ctx.lineTo(w * 0.2 + sk, ey + ew * 0.5); ctx.closePath();
      ctx.moveTo(-w * 0.2, -fh * 0.28); ctx.lineTo(w * 0.2, -fh * 0.28); ctx.lineTo(w * 0.1, -fh * 0.18); ctx.lineTo(-w * 0.1, -fh * 0.18); ctx.closePath();
      ctx.fillStyle = "#21292b"; ctx.fill("evenodd");
      ctx.save(); ctx.clip("evenodd"); ctx.fillStyle = "#161c1d"; ctx.fillRect(w * 0.1, -fh * 1.2, w, fh * 1.4); ctx.restore();
    },
    function lantern(ctx, o, t, h, rv) {   // an unlit cage lantern: cap, ring handle, panes cut through
      const w = h * (0.2 + rv[0] * 0.08), bh = h * (0.5 + rv[1] * 0.15), hr = w * 0.9;
      ctx.beginPath();
      ctx.moveTo(-w, 10); ctx.lineTo(-w, 0); ctx.lineTo(-w * 0.85, -bh); ctx.lineTo(-w * 0.35, -bh - h * 0.1); ctx.lineTo(w * 0.35, -bh - h * 0.1); ctx.lineTo(w * 0.85, -bh); ctx.lineTo(w, 0); ctx.lineTo(w, 10); ctx.closePath();
      ctx.moveTo(-w * 0.55, -bh * 0.15); ctx.lineTo(-w * 0.1, -bh * 0.15); ctx.lineTo(-w * 0.1, -bh * 0.8); ctx.lineTo(-w * 0.5, -bh * 0.8); ctx.closePath();
      ctx.moveTo(w * 0.1, -bh * 0.15); ctx.lineTo(w * 0.55, -bh * 0.15); ctx.lineTo(w * 0.5, -bh * 0.8); ctx.lineTo(w * 0.1, -bh * 0.8); ctx.closePath();
      ctx.fillStyle = "#33312e"; ctx.fill("evenodd");
      ctx.save(); ctx.clip("evenodd"); ctx.fillStyle = "#262523"; ctx.fillRect(0, -h * 2, w * 2, h * 2); ctx.restore();
      ctx.fillStyle = "#2f3536";   // the lit panes, a flat warm glow
      ctx.beginPath();
      ctx.moveTo(-w * 0.55, -bh * 0.15); ctx.lineTo(-w * 0.1, -bh * 0.15); ctx.lineTo(-w * 0.1, -bh * 0.8); ctx.lineTo(-w * 0.5, -bh * 0.8); ctx.closePath();
      ctx.moveTo(w * 0.1, -bh * 0.15); ctx.lineTo(w * 0.55, -bh * 0.15); ctx.lineTo(w * 0.5, -bh * 0.8); ctx.lineTo(w * 0.1, -bh * 0.8); ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#262523"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-hr, -bh - h * 0.09); ctx.lineTo(-hr * 0.5, -bh - h * 0.3); ctx.lineTo(hr * 0.5, -bh - h * 0.3); ctx.lineTo(hr, -bh - h * 0.09); ctx.stroke();
    }
  ];
  function drawRare(ctx, o, t) {
    RK[window.__seaKinds ? window.__seaKinds[o.rare.j] : o.rare.kd](ctx, o, t, o.h, o.rare.rv);   // __seaKinds: a proof hook, unset in play
  }
  // one list of objects; back ones go under the water body (it covers their base), front ones over it
  function drawObjects(ctx, list, s, W, H, camOff, t, post) {
    objLayout(W, H);
    // rare pieces: screen x and clear radius, so ordinary debris keeps off them (RARE_SPAN screens round)
    const rsp = objSpan * RARE_SPAN / OBJ_SPAN, rk = clamp(H * 0.75 / 900, 0.45, 1.1);
    for (let j = 0; j < OBJ_RARE.length; j++) {
      const ro = OBJ_RARE[j];
      let rx = ((ro.x - camOff) % rsp + rsp) % rsp;
      if (rx + ro.xl * rk > W) rx -= rsp;
      RCX[j] = rx; RCR2[j] = ro.h * rk * 0.8;
    }    for (let q = 0; q < list.length; q++) {
      const o = list[q], k = objK(o, H), spW = o.rare ? rsp : objSpan;
      let sx = ((o.x - camOff) % spW + spW) % spW;
      if (sx + o.xl * k > W) sx -= spW;
      if (sx + o.xr * k < 0) continue;
      if (!o.rare) {
        const hw = o.small ? o.xr : o.hw * k;
        let bad = false;
        for (let j = 0; j < OBJ_RARE.length; j++) if (Math.abs(sx - RCX[j]) < RCR2[j] + hw) { bad = true; break; }
        if (bad) continue;
      }
      // a few stand half out of the first water; the rest rise from nothing, all at full size
      const g0 = !o.rare && (o.i % 7 === 0 || o.i % 7 === 2 || o.i % 7 === 4) ? 0.55 : 0;
      const g = G.reduced ? 1 : g0 + (1 - g0) * smooth(clamp((s - (g0 ? 2 : o.rs)) / (o.small ? 4 : 10), 0, 1));
      if (g <= 0) continue;
      if (!G.reduced && SCV[Math.round(clamp(sx / W, 0, 1) * NS)] > 0.5) continue;   // the front has not reached it yet
      const yl = shAt(clamp(sx, 0, W), W) + (o.front ? H * 0.012 : 2) + o.dy * H;
      if (post === 2) {
        if (!o.small && OBN < 32) { OBX[OBN] = o.rare ? sx : sx + (o.xl + o.xr) * 0.5 * k; OBR[OBN] = (o.rare ? o.hw : (o.xr - o.xl) * 0.5) * k; OBY[OBN++] = yl; }
        continue;
      }
      if (!post) {
        const sink = (1 - g) * o.bh * k * (o.rare ? 1.15 : 0.9) + (G.reduced ? 0 : Math.sin(t * 0.6 + o.ph) * 2.5 * k) + o.dep * o.bh * k;
        // clipped at the waterline: the part under it is not drawn
        ctx.save();
        ctx.beginPath();
        if (o.rare) ctx.rect(sx - o.hw * k, 0, o.hw * 2 * k, Math.min(yl, H - 8));   // a wide box: only the waterline cuts
        else ctx.rect(sx + o.xl * k - 6, 0, (o.xr - o.xl) * k + 12, yl);
        ctx.clip();
        ctx.translate(sx, o.rare ? Math.min(yl, H - 80 * k) + sink : yl + sink);   // rare pieces stay above the bottom edge
        ctx.rotate(o.tilt);
        ctx.scale(k, k);
        ctx.fillStyle = o.c;
        if (o.rare) drawRare(ctx, o, G.reduced ? 0 : t);
        else ctx.fill(o.p, o.rule);
        if (!o.small && !o.rare) {
          ctx.clip(o.p, o.rule);   // the bridge's hard split: lit left, shade right
          ctx.fillStyle = o.cs;
          ctx.fillRect(o.split, -1000, 2000, 2000);
        }
        ctx.restore();
        continue;
      }
      if (o.small) continue;
      // a flat lighter-water dash at the waterline
      ctx.fillStyle = "rgb(50,56,54)";
      const dw = Math.min(o.xr - o.xl, 2 * o.bh * 0.3) * k * 0.5 + 6;
      ctx.fillRect(Math.round(sx - dw), Math.round(yl), Math.round(dw * 2), 2);
    }
  }
  // the air: three stars, fixed apart in the upper frame (fractions of the screen), clear of the centre and the sea
  const AIR = [{ u: 0.2, y: 0.16, par: 0.12, hue: 2, sz: 3 }, { u: 0.78, y: 0.27, par: 0.2, hue: 5, sz: 4 }, { u: 0.6, y: 0.1, par: 0.16, hue: 0, sz: 3 }];
  const BURST_T = 0, BURST_D = 5;   // the flash, and how long the air takes to reach its resting places
  // the sea and sky flow once ran about 26 s of its own clock; it now plays from the flash (secs("break") 0.4) to the end of elements
  const TS = 2.6;
  function eclock() { return (G.secs("break") - 0.4) * TS; }
  // in the birth scene, from matter on, the sea and sky stay as the background, dimmed to 0.6 so the old ones read clearly and the sea stays above the void
  function dimK() {
    if (G.sceneOf(G.beat) !== "birth") return 1;
    const im = G.idxOf("matter");
    const it = G.idxOf("trade");
    if (G.beat > it) return 0.6;   // down to 0.6 by the start of the old ones' walk
    if (G.beat === it) return 0.75 - 0.15 * smooth(clamp(G.linear("trade"), 0, 1));
    return G.beat === im ? 1 - 0.25 * smooth(clamp(G.linear("matter") / 0.5, 0, 1)) : 1;
  }
  let LAY = null;
  function layerBegin(outer) {
    const cv = outer.canvas;
    if (!LAY) LAY = document.createElement("canvas");
    if (LAY.width !== cv.width || LAY.height !== cv.height) { LAY.width = cv.width; LAY.height = cv.height; }
    const c = LAY.getContext("2d");
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, LAY.width, LAY.height);
    c.globalAlpha = 1;
    c.setTransform(outer.getTransform());
    return c;
  }
  function layerEnd(outer, c, dim, lift) {
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = "source-atop";
    const base = Math.max(1 - dim, 0.95);   // the deep shadow: every sea colour ends a few values off the void, whatever the dim
    c.globalAlpha = base;
    c.fillStyle = "rgb(11,13,13)";
    c.fillRect(0, 0, LAY.width, LAY.height);
    if (lift) {   // then a flat neutral grey over the sea's own shape, on the lift stops: hard-edged, strongest at the front and lip, gone with the lift
      const m = outer.getTransform(), g = c.createLinearGradient(0, 0, LAY.width, 0);
      for (let i = 0; i < lift.length; i++) {   // a hard stop (equal x) becomes a slope 0.07 of the width long, so no vertical line shows
        const sl = i && lift[i][0] === lift[i - 1][0] ? 0.07 * LAY.width : 0;
        g.addColorStop(clamp((m.a * lift[i][0] + m.e + sl) / LAY.width, 0, 1), "rgba(60,60,60," + (0.5 * lift[i][1]).toFixed(3) + ")");
      }
      c.globalAlpha = 1;
      c.fillStyle = g;
      c.fillRect(0, 0, LAY.width, LAY.height);
    }
    c.restore();
    outer.save();
    outer.setTransform(1, 0, 0, 1, 0, 0);
    outer.globalAlpha = 1;
    outer.drawImage(LAY, 0, 0);
    outer.restore();
  }
  function burstE(s) { if (G.reduced) return 1; const u = clamp((s - BURST_T) / BURST_D, 0, 1); return 1 - (1 - u) * (1 - u) * (1 - u); }
  (function seedBed() {
    const r = mulberry(7717), rd = mulberry(8807);
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
    for (let i = 0; i < STREAK.length; i++) STREAK[i] = { u: rw(), y: 0.012 + rw() * 0.07, w: 0.02 + rw() * 0.05, sp: 2 + rw() * 4, a: 0.25 + rw() * 0.2, br: rw() < 0.4 };
    for (let i = 0; i < RIP.length; i++) RIP[i] = { u: rw(), d: rw(), y: rw() * 0.01, per: 3 + rw() * 4 };
  })();

  // the air: the three stars ride the burst out of the explosion's point, then hang and drift very slowly
  function drawAirDrift(ctx) {
    if (typeof G.secs !== "function" || G.sceneOf(G.beat) !== "birth") return;
    const W = G.W, H = G.H;
    if (!W || !H) return;
    const s = eclock();
    if (s < BURST_T) return;
    const e = burstE(s), ox = G.sx(0), oy = 0.46 * H;
    const camOff = G.cam * W;
    const dr = G.reduced ? 0 : G.t;
    const dim = dimK(), outer = ctx;
    ctx = layerBegin(outer);
    for (let n = 0; n < AIR.length; n++) {
      const a = AIR[n];
      const rx = a.u * W - camOff * a.par + 3 * Math.sin(dr * 0.11 + n * 2);
      const ry = a.y * H + 2 * Math.sin(dr * 0.09 + n * 3);
      const x = Math.round(ox + (rx - ox) * e), y = Math.round(oy + (ry - oy) * e);
      if (x < -2 || x > W + 2) continue;
      ctx.globalAlpha = 0.5 * dim;
      ctx.fillStyle = "rgb(6,8,12)";
      ctx.fillRect(x - 1, y - 1, a.sz + 2, a.sz + 2);
      ctx.globalAlpha = 0.3 * dim;
      ctx.fillStyle = AIR_LIGHT[a.hue];
      ctx.fillRect(x - 2, y - 2, a.sz + 4, a.sz + 4);
      ctx.globalAlpha = dim;
      ctx.fillRect(x, y, a.sz, a.sz);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x + 1, y + 1, Math.max(1, a.sz - 2), Math.max(1, a.sz - 2));
    }
    ctx.globalAlpha = 1;
    window.GenesisSky && GenesisSky.draw(ctx, s, ox, oy, W, H, dim);   // hook for the next specs: the air's own art, over the stars; dim is the last arg
    layerEnd(outer, ctx, dim);
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
    const bs = eclock();
    const keep = 1 - G.since("land") * 0.6;
    const k = smooth(clamp((bs - BURST_T) / 0.3, 0, 1)) * keep * dimK();
    if (k < 0.02) return;
    const e = burstE(bs), bx = G.sx(0), by = 0.46 * H;   // every piece flies out of the explosion's point to its place
    const outer = ctx;
    ctx = layerBegin(outer);

    const span = 3.2 * W;
    const camOff = G.cam * W;

    ctx.fillStyle = "#8a8272";
    for (const it of RES.dust) {
      const x = ((it.u * span - camOff * it.par - G.t * it.drift) % span + span) % span - span * 0.1;
      if (x < -200 || x > W + 200) continue;
      ctx.globalAlpha = 0.35 * k * (0.6 + 0.4 * Math.sin(G.t * 0.9 + it.ph));
      ctx.beginPath(); ctx.arc(bx + (x - bx) * e, by + (it.y * H - by) * e, it.r, 0, TAU); ctx.fill();
    }

    ctx.strokeStyle = "#cfd6d3"; ctx.lineWidth = 1; ctx.globalAlpha = 0.07 * k;
    for (const it of RES.wind) {
      const x = ((it.u * span - camOff * it.par - G.t * it.drift) % span + span) % span - span * 0.1;
      if (x < -200 || x > W + 200) continue;
      const y = by + (it.y * H - by) * e, xb = bx + (x - bx) * e, ln = it.len * e;
      const cy = y + 12 * Math.sin(G.t * 0.35 + it.ph);
      ctx.beginPath(); ctx.moveTo(xb, y);
      ctx.quadraticCurveTo(xb + ln * 0.5, cy, xb + ln, y);
      ctx.stroke();
    }

    // the flat colour stains and the sound rings read as stray ellipses in the first segment: they are gone by the end of trade, stay out through walk and root, and are back at full after enter (covered, so the step is unseen)
    const quiet = G.beat > G.idxOf("enter") ? 1 : 1 - clamp((G.linear("trade") - 0.5) * 2, 0, 1);
    for (const it of (quiet < 0.01 || G.sceneOf(G.beat) === "birth" ? [] : RES.stains)) {
      const x = ((it.u * span - camOff * it.par - G.t * it.drift) % span + span) % span - span * 0.1;
      if (x < -200 || x > W + 200) continue;
      const swap = Math.floor((G.t + it.ph * 3) / (5 + it.ph)) % 2;
      ctx.fillStyle = HUE_FILL[swap === 0 ? it.hueA : it.hueB];
      ctx.globalAlpha = 0.07 * k * quiet;
      ctx.save();
      ctx.translate(bx + (x - bx) * e, by + (it.y * H - by) * e);
      ctx.beginPath(); ctx.ellipse(0, 0, it.rx * e, it.ry * e, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = "#fff3d6";
    for (const it of RES.lights) {
      const x = ((it.u * span - camOff * it.par - G.t * it.drift) % span + span) % span - span * 0.1;
      if (x < -200 || x > W + 200) continue;
      if (Math.sin(G.t * (1.2 + it.freqR) * 2 + it.ph) <= 0.2) continue;
      ctx.globalAlpha = 0.8 * k;
      const lx = bx + (x - bx) * e, ly = by + (it.y * H - by) * e;
      ctx.fillRect(lx - it.size * 0.5, ly - it.size * 0.5, it.size, it.size);
    }

    ctx.strokeStyle = "#9fb4c8"; ctx.lineWidth = 1;
    for (const it of RES.sound) {
      const x = ((it.u * span - camOff * it.par - G.t * it.drift) % span + span) % span - span * 0.1;
      if (x < -200 || x > W + 200) continue;
      const frac = ((G.t + it.ph * 4) % 5) / 5;
      ctx.globalAlpha = 0.10 * k * quiet * (1 - frac);
      ctx.beginPath(); ctx.arc(bx + (x - bx) * e, by + (it.y * H - by) * e, frac * 110, 0, TAU); ctx.stroke();
    }

    ctx.globalAlpha = 1; ctx.lineWidth = 1;
    layerEnd(outer, ctx, dimK());
  }

  // the floor's pieces for the ceiling to copy one for one: world x of the base centre, size, sink (fraction of height) and offset below the waterline
  function objSlots(W, H) {
    objLayout(W, H);
    const out = [];
    for (let i = 0; i < OBJ_ALL.length; i++) {
      const o = OBJ_ALL[i];
      const k = objK(o, H);
      out.push({ small: !!o.small, x: o.x + (o.xl + o.xr) * 0.5 * k, w: (o.xr - o.xl) * k, h: o.bh * k, dep: o.dep, off: (o.front ? H * 0.012 : 2) + o.dy * H, rare: !!o.rare });
    }
    return out;
  }
  window.GenElem = { objSlots, seaRise(W, H) { surfFrame(eclock(), W, H); return SRISE; },  seaLevel(W, H) { surfFrame(eclock(), W, H); return SLVL; },  seaLine(W, H) { surfFrame(eclock(), W, H); return SHA; }, seaLineRest(W, H) { surfFrame(eclock(), W, H); return SHR; }, airFront(W, H) { surfFrame(eclock(), W, H); return AIRP; }, airLift, airStart() { return SAIR / TS + 0.4; },seaRiseDone(W, H) { surfFrame(eclock(), W, H); return SFALL[3]; }, draw, drawResidue, drawSea, paintSea, drawAirDrift, rage, layerBegin, layerEnd, dimK };
})();
