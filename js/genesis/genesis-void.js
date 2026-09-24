/* genesis-void.js — the void half of the record: the point, the span,
   the old ones, Primordisentia, the two lights and their trails. */
(function () {
  const G = window.Gen;
  const { hash1, clamp, mix, mulberry } = Util;
  const { ROOT_U, DECK, BAY_U, SPAN_START_U, motes, idxOf, sx } = G;
  const { flatGlow } = GenPaint;

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

  // the far realms: three parallax layers of slow blobs, built once at load
  const CHAOS_LAYERS = [[], [], []];
  const FAR_LIGHTS = [];
  (function seedChaos() {
    const rnd = mulberry(9004);
    for (let L = 0; L < 3; L++) {
      for (let i = 0; i < 7; i++) {
        CHAOS_LAYERS[L].push({
          u0: -1.2 + rnd() * 6.8,
          yf: 0.05 + rnd() * 0.9,
          r: 0.22 + rnd() * 0.33,
          k1: 1 + Math.floor(rnd() * 3),
          k2: 1 + Math.floor(rnd() * 3),
          ph: rnd() * 6.283,
          drift: 2 + rnd() * 5,
        });
      }
    }
    for (let i = 0; i < 40; i++) {
      FAR_LIGHTS.push({ u: -1.2 + rnd() * 6.8, yf: rnd(), tint: Math.floor(rnd() * 3), ph: rnd() * 6.283 });
    }
  })();
  const CHAOS_COLOR = ["#10161b", "#14191f", "#1a1a22"];
  const CHAOS_PAR = [0.22, 0.38, 0.55];
  const LIGHT_TINT = ["200,120,110", "110,140,200", "190,170,120"];

  function drawChaos(ctx, amt) {
    if (amt < 0.02) return;
    const span = 6.8 * G.W;
    ctx.globalAlpha = amt * 0.95;
    for (let L = 0; L < 3; L++) {
      const par = CHAOS_PAR[L];
      ctx.fillStyle = CHAOS_COLOR[L];
      for (const b of CHAOS_LAYERS[L]) {
        let x = (b.u0 - G.cam * par) * G.W + G.W * 0.5 + b.drift * G.t;
        x = ((x % span) + span) % span - 0.9 * G.W;
        const margin = 1.6 * b.r * G.H * 1.6;
        if (x < -margin || x > G.W + margin) continue;
        const y = b.yf * G.H;
        ctx.beginPath();
        for (let i = 0; i < 20; i++) {
          const th = (i / 20) * 6.283;
          const rad = b.r * G.H * (1
            + 0.10 * Math.sin(b.k1 * th + G.t * 0.11 + b.ph)
            + 0.06 * Math.sin(b.k2 * th - G.t * 0.07));
          const vx = x + Math.cos(th) * rad * 1.6;
          const vy = y + Math.sin(th) * rad;
          i ? ctx.lineTo(vx, vy) : ctx.moveTo(vx, vy);
        }
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    for (const s of FAR_LIGHTS) {
      let x = (s.u - G.cam * 0.15) * G.W + G.W * 0.5;
      x = ((x % span) + span) % span - 0.9 * G.W;
      const y = s.yf * G.H;
      const a = amt * 0.35 * (0.6 + 0.4 * Math.sin(G.t * 1.7 + s.ph));
      ctx.fillStyle = `rgba(${LIGHT_TINT[s.tint]},${a})`;
      ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  // the minds: tiny specks orbiting the Point, built once at load
  const MINDS = [];
  (function seedMinds() {
    const rnd = mulberry(9005);
    for (let i = 0; i < 90; i++) {
      MINDS.push({
        r: 6 + rnd() * 26,
        speed: (2 + rnd() * 4) * (rnd() < 0.5 ? -1 : 1),
        ph: rnd() * 6.283,
        size: 0.6 + rnd() * 0.7,
        g: Math.round(170 + rnd() * 50),
      });
    }
  })();

  function drawPoint(ctx, amt, crack) {
    if (amt < 0.01 && crack < 0.02) return;
    const cx = sx(0), cy = G.H * 0.46;
    const m = Math.min(G.W, G.H);

    ctx.lineWidth = 1;
    for (let k = 0; k < 5; k++) {
      const base = (0.10 + 0.07 * k) * m;
      const f = G.t * 0.22 + k * 0.2;
      const r = base * (1 - 0.08 * (f - Math.floor(f)));
      ctx.strokeStyle = `rgba(120,128,124,${0.16 * amt * (1 - 0.12 * k)})`;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, 6.283);
      ctx.stroke();
    }

    const pulse = 0.85 + 0.15 * Math.sin(G.t * 1.7);
    flatGlow(ctx, cx, cy, (26 + 60 * amt) * pulse * 1.3, "245,208,107", 0.7 + 0.3 * amt);

    for (const s of MINDS) {
      const a = s.ph + G.t * s.speed;
      const x = cx + Math.cos(a) * s.r * (1 + 0.3 * amt);
      const y = cy + Math.sin(a) * s.r * 0.7 * (1 + 0.3 * amt);
      ctx.fillStyle = `rgba(${s.g},${s.g},${s.g},${0.55 * amt})`;
      ctx.fillRect(x - s.size * 0.75, y - s.size * 0.75, s.size * 1.5, s.size * 1.5);
    }

    ctx.fillStyle = "#fff3d0";
    ctx.beginPath(); ctx.arc(cx, cy, 4 + 3 * amt, 0, 6.283); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(cx, cy, 3 + 2 * amt, 0, 6.283); ctx.fill();

    if (crack > 0.02) {
      ctx.strokeStyle = `rgba(255,248,230,${0.85 * crack})`;
      ctx.lineWidth = 1.3;
      ctx.lineCap = "round";
      const lens = [12, 22, 34];
      for (let i = 0; i < 9; i++) {
        const base = i * (6.283 / 9) + G.t * 0.05;
        let px = cx, py = cy;
        ctx.beginPath();
        ctx.moveTo(px, py);
        for (let k = 0; k < 3; k++) {
          const ang = base + (k % 2 === 0 ? 0.35 : -0.35);
          px += Math.cos(ang) * lens[k] * crack;
          py += Math.sin(ang) * lens[k] * crack;
          ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.lineCap = "butt";
    }
    ctx.lineWidth = 1;
  }

  // the Span: dark, cold, straight, monumental
  function drawSpan(ctx, grow) {
    if (grow < 0.02) return;
    const deckY = G.H * DECK;
    const inf = G.beat >= idxOf("flee");
    const startU = inf ? G.cam - 2.65 : SPAN_START_U;
    const endU = inf ? G.cam + 2.45 : mix(-0.48, ROOT_U + 0.22, grow);
    const x0 = sx(startU);
    const x1 = sx(endU);
    if (x1 < -40 || x0 > G.W + 40) return;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x0 - 2, 0, Math.max(2, x1 - x0) + 4, G.H);
    ctx.clip();
    ctx.globalAlpha = clamp(grow * 3, 0, 1);

    const bay = Math.max(24, BAY_U * G.W);
    const slab = 0.055 * G.H;
    const first = Math.floor((G.cam - 0.5) / BAY_U) - 2;
    const last  = Math.ceil((G.cam + 0.5) / BAY_U) + 2;

    // piers: one batched lit fill, then a clipped shade rect per pier (right 65%)
    const piers = [];
    ctx.fillStyle = "#2a343c";
    ctx.beginPath();
    for (let b = first; b <= last; b++) {
      const xb = sx(b * BAY_U);
      const great = b % 4 === 0;
      const k = great ? 1.7 : 1;
      const wTop = 0.11 * bay * k, wBot = 0.15 * bay * k;
      ctx.moveTo(xb - wTop, deckY + slab);
      ctx.lineTo(xb + wTop, deckY + slab);
      ctx.lineTo(xb + wBot, G.H * 1.25);
      ctx.lineTo(xb - wBot, G.H * 1.25);
      ctx.closePath();
      if (great) {
        const wCap = 0.24 * bay;
        ctx.rect(xb - wCap, deckY + slab, wCap * 2, G.H * 0.03);
      }
      piers.push({ xb, wTop, wBot, great });
    }
    ctx.fill();
    ctx.fillStyle = "#1c2329";
    for (const p of piers) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(p.xb - p.wTop, deckY + slab);
      ctx.lineTo(p.xb + p.wTop, deckY + slab);
      ctx.lineTo(p.xb + p.wBot, G.H * 1.25);
      ctx.lineTo(p.xb - p.wBot, G.H * 1.25);
      ctx.closePath();
      if (p.great) {
        const wCap = 0.24 * bay;
        ctx.rect(p.xb - wCap, deckY + slab, wCap * 2, G.H * 0.03);
      }
      ctx.clip();
      ctx.fillRect(p.xb - 0.3 * p.wBot, -1e5, 2e5, 2e5);
      ctx.restore();
    }

    // arches: same batched-then-clipped approach, under the slab between piers;
    // clipped to y >= deckY+slab so the crown can never paint above the slab
    const R1 = bay * 0.5, R2 = bay * 0.5 - 0.022 * G.H;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, deckY + slab, x1 - x0, 1.3 * G.H - (deckY + slab));
    ctx.clip();
    const arches = [];
    ctx.fillStyle = "#2e3941";
    ctx.beginPath();
    for (let b = first; b <= last; b++) {
      const xb = sx(b * BAY_U);
      const acx = xb + R1, acy = deckY + slab + R1;
      ctx.moveTo(acx - R1, acy);
      ctx.arc(acx, acy, R1, Math.PI, 2 * Math.PI);
      ctx.arc(acx, acy, R2, 2 * Math.PI, Math.PI, true);
      ctx.closePath();
      arches.push({ acx, acy });
    }
    ctx.fill();
    ctx.fillStyle = "#232c33";
    for (const a of arches) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(a.acx - R1, a.acy);
      ctx.arc(a.acx, a.acy, R1, Math.PI, 2 * Math.PI);
      ctx.arc(a.acx, a.acy, R2, 2 * Math.PI, Math.PI, true);
      ctx.closePath();
      ctx.clip();
      ctx.fillRect(a.acx - R1 + 0.35 * bay, -1e5, 2e5, 2e5);
      ctx.restore();
    }
    ctx.restore();

    // under-deck dark band
    ctx.fillStyle = "rgba(9,12,15,0.9)";
    ctx.fillRect(x0, deckY + slab, x1 - x0, 0.018 * G.H);

    // slab, and its cold lit top face (light from above-left)
    ctx.fillStyle = "#1d252b";
    ctx.fillRect(x0, deckY, x1 - x0, slab);
    ctx.fillStyle = "#5a6c78";
    ctx.fillRect(x0, deckY - 0.012 * G.H, x1 - x0, 0.012 * G.H);

    // gold rail
    ctx.fillStyle = "rgba(245,208,107,0.55)";
    ctx.fillRect(x0, deckY - 0.012 * G.H - 1, x1 - x0, 2);

    ctx.restore();
  }

  window.GenVoid = Object.assign(window.GenVoid || {}, {
    fillBg, drawMotes, drawChaos, drawPoint, drawSpan,
  });
})();
