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

  const SPAN_BAY_U = 0.46;
  let spanCv = null, spanCtx = null;
  // The span: an old one, long dead. Few limbs bowed at the knee, a thin iron
  // deck, near the void's own colour; limbs and ends go into the fog.
  function drawSpan(ctx, grow) {
    if (grow < 0.02) return;
    const W = G.W, H = G.H, deckY = H * DECK;
    const inf = G.beat >= idxOf("flee");
    const startU = inf ? G.cam - 2.65 : SPAN_START_U;
    const endU = inf ? G.cam + 2.45 : mix(-0.48, ROOT_U + 0.22, grow);
    const x0 = sx(startU);
    const x1 = sx(endU);
    if (x1 - x0 < 2) return;

    const cw = ctx.canvas.width, ch = ctx.canvas.height;
    if (!spanCv) { spanCv = document.createElement("canvas"); spanCtx = spanCv.getContext("2d"); }
    if (spanCv.width !== cw || spanCv.height !== ch) { spanCv.width = cw; spanCv.height = ch; }
    const g = spanCtx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    g.clearRect(0, 0, cw, ch);
    g.setTransform(cw / W, 0, 0, ch / H, 0, 0);

    const slab = 0.020 * H;
    const yt = deckY + slab; // slab underside
    const sh = 0.06 * H; // shoulder half-span
    const LIMB_LIT = "#151b20", LIMB_SHADE = "#0d1115";
    const SLAB = "#11161a", DECK_TOP = "#1a2127", DECK_HI = "#34414b";
    const first = Math.floor((G.cam - 0.5) / SPAN_BAY_U) - 1;
    const last = Math.ceil((G.cam + 0.5) / SPAN_BAY_U) + 1;
    const fr = v => v - Math.floor(v);
    const rnd = b => fr(Math.sin(b * 127.1 + 11.3) * 43758.5453);

    g.save();
    g.beginPath();
    g.rect(x0 - 2, 0, (x1 - x0) + 4, H);
    g.clip();

    // belly: a shallow sag between each pair of legs, like a belly
    g.fillStyle = SLAB;
    g.beginPath();
    for (let b = first; b < last; b++) {
      const xa = sx(b * SPAN_BAY_U);
      const xn = sx((b + 1) * SPAN_BAY_U);
      g.moveTo(xa + sh, yt - 1);
      g.quadraticCurveTo((xa + xn) / 2, yt + 0.05 * H, xn - sh, yt - 1);
      g.closePath();
    }
    g.fill();

    // limbs: bowed at a swollen knee, fading toward the void below
    for (let b = first; b <= last; b++) {
      const xb = sx(b * SPAN_BAY_U);
      if (xb < x0 - sh || xb > x1 + sh) continue;
      const r = rnd(b);
      const side = (b % 2 ? 1 : -1);
      const lean = (r - 0.5) * 0.05 * H + side * 0.015 * H;
      const wt = 0.013 * H;
      const yk = deckY + 0.11 * H;
      const xk = xb + side * (0.035 + 0.025 * r) * H;
      const wk = 0.017 * H;
      const yf = H * 1.08;
      const xf = xb + lean;
      const wf = 0.003 * H;

      const trace = () => {
        g.beginPath();
        g.moveTo(xb - sh, yt - 1);
        g.quadraticCurveTo(xb - wt, yt, xb - wt * 1.1, yt + 0.07 * H);
        g.quadraticCurveTo(xk - wk * 1.25, (yt + 0.07 * H + yk) / 2, xk - wk, yk);
        g.quadraticCurveTo(xk - wk * 0.9 + lean * 0.2, (yk + yf) / 2, xf - wf, yf);
        g.lineTo(xf + wf, yf);
        g.quadraticCurveTo(xk + wk * 0.8 + lean * 0.2, (yk + yf) / 2, xk + wk, yk);
        g.quadraticCurveTo(xk + wk * 1.1, (yt + 0.07 * H + yk) / 2, xb + wt * 1.1, yt + 0.07 * H);
        g.quadraticCurveTo(xb + wt, yt, xb + sh, yt - 1);
        g.closePath();
      };
      Paint.litShade(g, trace, xk - wk * 0.4, LIMB_LIT, LIMB_SHADE);

      // knee: hard split, no gradient
      g.fillStyle = LIMB_LIT;
      g.beginPath();
      g.ellipse(xk + wk * 0.3, yk, wk * 1.15, wk * 0.95, 0, 0, Math.PI * 2);
      g.fill();
      g.save();
      g.beginPath();
      g.ellipse(xk + wk * 0.3, yk, wk * 1.15, wk * 0.95, 0, 0, Math.PI * 2);
      g.clip();
      g.fillStyle = LIMB_SHADE;
      g.fillRect(xk + wk * 0.1, yk - wk * 1.5, 1e5, wk * 3);
      g.restore();
    }

    // vertebra nubs, under the slab
    g.fillStyle = SLAB;
    g.beginPath();
    for (let u = Math.floor((G.cam - 0.5) / 0.04) * 0.04; u <= G.cam + 0.5; u += 0.04) {
      const x = sx(u);
      g.moveTo(x - 0.004 * H, yt - 1);
      g.lineTo(x + 0.004 * H, yt - 1);
      g.lineTo(x + 0.001 * H, yt + 0.006 * H);
      g.closePath();
    }
    g.fill();

    // deck: thin iron slab, lit top face, gold rail
    g.fillStyle = SLAB;
    g.fillRect(x0, deckY, x1 - x0, slab);
    g.fillStyle = DECK_TOP;
    g.fillRect(x0, deckY - 0.012 * H, x1 - x0, 0.012 * H);
    g.fillStyle = DECK_HI;
    g.fillRect(x0, deckY - 0.012 * H, x1 - x0, 0.003 * H);
    g.fillStyle = "rgba(245,208,107,0.30)";
    g.fillRect(x0, deckY - 0.012 * H - 1.5, x1 - x0, 1.5);

    g.restore();

    // fog mask: legs and both ends dissolve into the void
    g.globalCompositeOperation = "destination-in";
    const vlen = H * 0.98 - yt;
    const vgrad = g.createLinearGradient(0, yt, 0, H * 0.98);
    vgrad.addColorStop(0, "rgba(0,0,0,1)");
    vgrad.addColorStop(clamp(0.14 * H / vlen, 0, 1), "rgba(0,0,0,0.70)");
    vgrad.addColorStop(clamp(0.30 * H / vlen, 0, 1), "rgba(0,0,0,0.20)");
    vgrad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = vgrad;
    g.fillRect(0, 0, W, H);

    const len = x1 - x0;
    const hgrad = g.createLinearGradient(x0, 0, x1, 0);
    const fa = Math.min(0.30 * W / len, 0.5);
    const fb = Math.min(0.22 * W / len, 0.5);
    if (fa >= 1 - fb) {
      hgrad.addColorStop(0, "rgba(0,0,0,0)");
      hgrad.addColorStop(0.5, "rgba(0,0,0,1)");
      hgrad.addColorStop(1, "rgba(0,0,0,0)");
    } else {
      hgrad.addColorStop(0, "rgba(0,0,0,0)");
      hgrad.addColorStop(fa, "rgba(0,0,0,1)");
      hgrad.addColorStop(1 - fb, "rgba(0,0,0,1)");
      hgrad.addColorStop(1, "rgba(0,0,0,0)");
    }
    g.fillStyle = hgrad;
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = "source-over";

    // composite onto the real canvas
    ctx.save();
    ctx.globalAlpha = clamp(grow * 3, 0, 1) * 0.9;
    ctx.drawImage(spanCv, 0, 0, W, H);
    ctx.restore();
  }

  window.GenVoid = Object.assign(window.GenVoid || {}, {
    fillBg, drawMotes, drawChaos, drawPoint, drawSpan,
  });
})();
