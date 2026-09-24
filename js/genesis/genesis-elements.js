/* genesis-elements.js — the first wave out of the broken point: dust, air, wind, sound, colour and light. Each changes form as it travels and dies into a permanent trace of the void. Pure functions of time. */
(function () {
  const G = window.Gen;
  const { hash1, clamp, mix, mulberry, smooth } = Util;
  const { flatGlow } = GenPaint;
  const TAU = Math.PI * 2;

  const KINDS = ["dust", "air", "wind", "colour", "light", "sound"];
  const HUES = ["230,70,60", "70,130,255", "120,214,96", "236,92,150", "245,208,107", "140,70,210", "60,200,200", "240,140,40"];
  const HUE_FILL = HUES.map(h => "rgb(" + h + ")");

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

  // 460 particles, born dense and early, dying by the end of the elements/matter beats
  const PARTS = [];
  (function seedParts() {
    const r = mulberry(9101);
    for (let i = 0; i < 460; i++) {
      const kind = KINDS[Math.floor(r() * 6)];
      const birth = 17.5 * r() * r();
      let life = 3.2 + r() * 3.6;
      if (birth + life > 20.5) life = 20.5 - birth;
      const ang = r() * TAU;
      const spd = 0.55 + r() * 0.75;
      const size = 1 + r() * 1;
      const ph = r() * TAU;
      const hueA = Math.floor(r() * 8);
      let hueB = Math.floor(r() * 8);
      if (hueB === hueA) hueB = (hueA + 3) % 8;
      const flip = 0.35 + r() * 1.4;
      const wgt = kind === "dust" ? 0.8 + r() * 0.2 : kind === "air" ? r() * 0.2 : r();
      const curl = (r() - 0.5) * 2.4;
      const settle = r() < 0.35;
      PARTS.push({ i, kind, birth, life, ang, spd, size, ph, hueA, hueB, flip, wgt, curl, settle });
    }
    PARTS.sort((a, b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind));
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
      ctx.globalAlpha = alpha * 0.45;
      ctx.strokeStyle = "#dfe6ea"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, (3 + q * 20) * sizeMul, 0, TAU); ctx.stroke();
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
      ctx.globalAlpha = alpha * 0.55;
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
      flatGlow(ctx, x, y, 7 * sizeMul, "255,236,190", alpha);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(x, y, 1.6 * sizeMul, 0, TAU); ctx.fill();
    } else if (q < 0.8) {
      if (hash1(pt.i * 7 + Math.floor(a * 6)) > 0.3) {
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = "#fff3d6"; ctx.lineWidth = 1;
        for (let k = 0; k < 4; k++) {
          const ang = pt.ph + k * Math.PI / 2;
          ctx.beginPath(); ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(ang) * 9 * sizeMul, y + Math.sin(ang) * 9 * sizeMul);
          ctx.stroke();
        }
      }
    } else {
      if (Math.sin(a * 18 + pt.ph) > 0) {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x - 0.75 * sizeMul, y - 0.75 * sizeMul, 1.5 * sizeMul, 1.5 * sizeMul);
      }
    }
  }

  function drawSound(ctx, pt, x, y, a, q, alpha, sizeMul) {
    ctx.strokeStyle = "#9fb4c8"; ctx.lineWidth = 1;
    if (q < 0.4) {
      ctx.globalAlpha = alpha * 0.6;
      const r1 = (4 + (a * 18) % 12) * sizeMul;
      ctx.beginPath(); ctx.arc(x, y, r1, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, r1 + 5 * sizeMul, 0, TAU); ctx.stroke();
    } else if (q < 0.8) {
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      for (let k = 0; k < 9; k++) {
        const ang = k / 9 * TAU;
        const rr = 9 * sizeMul * (0.7 + 0.6 * hash1(pt.i * 13 + k + Math.floor(a * 8) * 17));
        const px = x + Math.cos(ang) * rr, py = y + Math.sin(ang) * rr;
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.stroke();
    } else {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#9fb4c8";
      for (let k = 0; k < 5; k++) {
        const h = (2 + 7 * Math.abs(Math.sin(a * 9 + k * 1.3 + pt.ph))) * sizeMul;
        const bx = x + (k - 2) * (1.5 + 2) * sizeMul;
        ctx.fillRect(bx - 0.75 * sizeMul, y - h / 2, 1.5 * sizeMul, h);
      }
    }
  }

  function draw(ctx) {
    if (typeof G.secs !== "function") return;
    const W = G.W, H = G.H;
    if (!W || !H) return;
    const s = G.secs("break") - 2.1;
    if (s < 0 || s > 21) return;

    const originX = G.sx(0), originY = 0.46 * H;
    const sl = slosh(s);

    for (const pt of PARTS) {
      const a = s - pt.birth;
      if (a < 0 || a > pt.life) continue;
      const q = a / pt.life;

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
      x += sl.x * sfac;
      y += sl.y * sfac;

      const rg = rageAt(s, x, y);
      x += PUSH.x * 26;
      y += PUSH.y * 26;

      if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue;

      let fadeOut;
      if (q < 0.8) fadeOut = 1;
      else fadeOut = pt.settle ? 1 : 1 - (q - 0.8) / 0.2;
      const alpha = Math.min(1, a / 0.25) * fadeOut * 0.9;
      if (alpha < 0.02) continue;

      let sizeMul = pt.size * (1 + 0.6 * rg);
      if (pt.settle && q >= 0.8) sizeMul *= (1 - (q - 0.8) / 0.2);

      switch (pt.kind) {
        case "dust": drawDust(ctx, pt, x, y, a, q, alpha, sizeMul, angle); break;
        case "air": drawAir(ctx, pt, x, y, a, q, alpha, sizeMul, angle); break;
        case "wind": drawWind(ctx, pt, x, y, a, q, alpha, sizeMul, angle); break;
        case "colour": drawColour(ctx, pt, x, y, a, q, alpha, sizeMul, angle, rg); break;
        case "light": drawLight(ctx, pt, x, y, a, q, alpha, sizeMul); break;
        case "sound": drawSound(ctx, pt, x, y, a, q, alpha, sizeMul); break;
      }
    }
    ctx.globalAlpha = 1; ctx.lineWidth = 1;
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

    for (const it of RES.stains) {
      const x = ((it.u * span - camOff * it.par - G.t * it.drift) % span + span) % span - span * 0.1;
      if (x < -200 || x > W + 200) continue;
      const swap = Math.floor((G.t + it.ph * 3) / (5 + it.ph)) % 2;
      ctx.fillStyle = HUE_FILL[swap === 0 ? it.hueA : it.hueB];
      ctx.globalAlpha = 0.07 * k;
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
      ctx.globalAlpha = 0.10 * k * (1 - frac);
      ctx.beginPath(); ctx.arc(x, it.y * H, frac * 110, 0, TAU); ctx.stroke();
    }

    ctx.globalAlpha = 1; ctx.lineWidth = 1;
  }

  window.GenElem = { draw, drawResidue, rage };
})();
