/* js/world/serus.js — Serus, coiled around the Watcher's rim */
(function () {
  const { P, F, setA, depthAlpha } = window.World;

  // Serus's closure (day/night) and season (summer/winter), both 0..1.
  // At load: winter day, matching today's look.
  function serusPhase() {
    const { t } = F;
    const dn = 0.5 + 0.5 * Math.sin(t * 6.283 / 60 - 1.5708);
    const k = Math.min(1, Math.max(0, (dn - 0.25) / 0.5));
    const closure = k * k * (3 - 2 * k);
    const sn = 0.5 + 0.5 * Math.sin(t * 6.283 / 240 + 1.5708);
    const season = sn * sn * (3 - 2 * sn);
    return { closure, season };
  }

  function drawSerus(x, y, R, ph) {
    const { ctx, t } = F;
    ctx.save(); ctx.translate(x, y); ctx.rotate(-t * 0.03);
    const N = 288, TURNS = 3;
    const Rout = R * (0.3 + 0.45 * ph.season);
    const pitch = Rout * 0.96 / TURNS;
    let hw0 = 0.5 * pitch * (0.42 + 0.68 * ph.closure);
    const u = Math.min(hw0 * 0.9, Rout * 0.1);
    hw0 *= 1 + 0.03 * Math.sin(t * 0.8);

    const ss = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };

    // Tail flick: a brief sinuous kick near the tail, most of the time at rest
    const TF_PERIOD = 47, TF_LEN = 3.2;
    const tl = (t + 5) % TF_PERIOD;
    const tk = tl < TF_LEN ? tl / TF_LEN : 0;
    const env = Math.pow(Math.sin(Math.PI * tk), 2);

    const pts = [];
    for (let i = 0; i <= N; i++) {
      const f = i / N;
      const a = f * TURNS * 6.283;
      let r = Rout * (0.07 + 0.93 * f) + R * 0.01 * Math.sin(t * 0.4 + f * 9);
      if (f > 0.6) r += hw0 * 0.9 * env * Math.sin((f - 0.6) * 14 - tk * 9) * ((f - 0.6) / 0.4);
      const hs = Math.min(1, f / 0.14);
      const neck = hw0 > 0 ? 0.62 * u / hw0 : 1;
      const head = neck + (1 - neck) * hs * hs * (3 - 2 * hs);
      const tail = f < 0.45 ? 1 : 1 - 0.93 * ss((f - 0.45) / 0.55);
      let hw = hw0 * head * tail;
      hw = Math.max(R * 0.004, hw);
      pts.push({ a, r, hw, f });
    }

    const cx = pts.map(p => Math.cos(p.a) * p.r);
    const cy = pts.map(p => Math.sin(p.a) * p.r);
    const cum = [0];
    for (let i = 1; i <= N; i++) cum[i] = cum[i - 1] + Math.hypot(cx[i] - cx[i - 1], cy[i] - cy[i - 1]);

    const outer = (p) => {
      const rr = p.r + p.hw;
      return [Math.cos(p.a) * rr, Math.sin(p.a) * rr];
    };
    ctx.beginPath();
    ctx.moveTo(...outer(pts[0]));
    for (let i = 1; i <= N; i++) ctx.lineTo(...outer(pts[i]));
    for (let i = N; i >= 0; i--) {
      const p = pts[i];
      const rr = Math.max(0, p.r - p.hw);
      ctx.lineTo(Math.cos(p.a) * rr, Math.sin(p.a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = "#140d12"; setA(1); ctx.fill("nonzero");

    // Night core: full closure reads as a solid eclipse
    if (ph.closure > 0.8) {
      const nr = Rout * 0.96 * Math.min(1, (ph.closure - 0.8) / 0.2);
      ctx.beginPath(); ctx.arc(0, 0, nr, 0, 6.283); ctx.fill();
    }

    // Crest: short low crest near the head only
    if (cum[N] > 0) {
      const gap = Math.max(3, hw0 * 1.1);
      let i = 0;
      for (let s = cum[N] * 0.05, k = 0; s < cum[N] * 0.28; s += gap, k++) {
        while (i < N - 1 && cum[i + 1] < s) i++;
        const m = (s - cum[i]) / (cum[i + 1] - cum[i]);
        const a = pts[i].a + (pts[i + 1].a - pts[i].a) * m;
        const r = pts[i].r + (pts[i + 1].r - pts[i].r) * m;
        const hw = pts[i].hw + (pts[i + 1].hw - pts[i].hw) * m;
        if (hw < R * 0.008) continue;
        const nrx = Math.cos(a), nry = Math.sin(a);
        const tgx = -Math.sin(a), tgy = Math.cos(a);
        const ex = (r + hw) * nrx, ey = (r + hw) * nry;
        const b = hw * 0.28, hgt = hw * 0.4;
        const p1x = ex - tgx * b - nrx * hw * 0.15, p1y = ey - tgy * b - nry * hw * 0.15;
        const p2x = ex + tgx * b - nrx * hw * 0.15, p2y = ey + tgy * b - nry * hw * 0.15;
        const tx = ex + nrx * hgt + tgx * (b * 1.2), ty = ey + nry * hgt + tgy * (b * 1.2);
        ctx.beginPath();
        ctx.moveTo(p1x, p1y);
        ctx.quadraticCurveTo(tx, ty, p2x, p2y);
        ctx.closePath();
        ctx.fillStyle = "#140d12"; setA(1); ctx.fill();
      }
    }

    // Stripe: one faint centre line
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= N; i++) {
      if (pts[i].f < 0.10 || pts[i].f > 0.95) continue;
      if (!started) { ctx.moveTo(cx[i], cy[i]); started = true; }
      else ctx.lineTo(cx[i], cy[i]);
    }
    ctx.strokeStyle = "rgba(125,112,118,1)";
    setA(0.16 + 0.08 * depthAlpha("bnote-watcher-serus"));
    ctx.lineWidth = Math.max(1, R * 0.0035);
    ctx.lineJoin = "round";
    ctx.stroke();
    setA(1);

    // Soft head, drawn in a frame aligned to the coil's inner tangent, plus sway
    const h0 = pts[0], h1 = pts[1];
    const hx = Math.cos(h0.a) * h0.r, hy = Math.sin(h0.a) * h0.r;
    const h1x = Math.cos(h1.a) * h1.r, h1y = Math.sin(h1.a) * h1.r;
    const hd = Math.atan2(hy - h1y, hx - h1x);
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(hd + 0.06 * Math.sin(t * 0.23));

    ctx.fillStyle = "#140d12"; setA(1);
    ctx.beginPath();
    ctx.moveTo(-0.5 * u, 0.62 * u);
    ctx.bezierCurveTo(0.3 * u, 0.95 * u, 1.4 * u, 0.8 * u, 2.3 * u, 0.5 * u);
    ctx.bezierCurveTo(2.7 * u, 0.35 * u, 2.7 * u, -0.1 * u, 2.35 * u, -0.3 * u);
    ctx.bezierCurveTo(1.7 * u, -0.65 * u, 0.7 * u, -0.9 * u, -0.1 * u, -0.95 * u);
    ctx.bezierCurveTo(-0.35 * u, -0.9 * u, -0.5 * u, -0.75 * u, -0.5 * u, -0.62 * u);
    ctx.closePath(); ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0.35 * u, 0.82 * u);
    ctx.lineTo(0.95 * u, 0.96 * u);
    ctx.quadraticCurveTo(-0.6 * u, 1.7 * u, -2.2 * u, 1.75 * u);
    ctx.quadraticCurveTo(-0.9 * u, 1.3 * u, 0.35 * u, 0.82 * u);
    ctx.closePath(); ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0.0 * u, 0.72 * u);
    ctx.lineTo(0.4 * u, 0.84 * u);
    ctx.quadraticCurveTo(-0.7 * u, 1.25 * u, -1.4 * u, 1.2 * u);
    ctx.quadraticCurveTo(-0.6 * u, 0.95 * u, 0.0 * u, 0.72 * u);
    ctx.closePath(); ctx.fill();

    ctx.restore();

    ctx.restore(); setA(1); ctx.lineWidth = 1; ctx.lineCap = "butt"; ctx.lineJoin = "miter";
  }

  P.serusPhase = serusPhase;
  P.drawSerus = drawSerus;
})();
