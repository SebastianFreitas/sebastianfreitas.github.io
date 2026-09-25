/* gd-conclusus.js — Conclusus's field: other selves. Giant faint
   silhouettes that switch green and silver in step every 1.2 s, arrays and
   rings of pins, spinning four-point pieces, dotted jump arcs from a planted
   shadow, star sparkles drawn twice (every return doubled), the symbol in
   three orbiting pieces, and rain through everything. Quiet so the marks
   read: sparkles fewer and dimmer, everything thins round the marks
   (G.clearBox). Registers GdWorld.P.conclusus. */
(function () {
  const G = window.GdWorld; if (!G) return;
  const { F, each, scatter } = G;
  const { TAU, mulberry } = Util;
  const I = 3;
  const px = n => n * F.k;
  const clearBox = (x, y, hw, hh) => G.clearBox ? G.clearBox(x, y, hw, hh) : 1;
  const C = { cream: "247,255,197", pale: "214,245,228", green: "143,191,106", silver: "150,150,146", figGreen: "70,92,60", dark: "30,18,22", rain: "200,210,190", warm: "70,40,46" };
  const FIGS = scatter(41, I, 30, 0.2, 0, 1);
  const PINS = scatter(42, I, 96, 0.42, 0.14, 0.58);
  const PIECES = scatter(43, I, 60, 0.42, 0.12, 0.60);
  const ARCS = scatter(44, I, 40, 0.42, 0.20, 0.60);
  const STARS = scatter(45, I, 105, 0.7, 0.10, 0.62);
  const SYMS = scatter(46, I, 22, 0.7, 0.14, 0.58);
  const RAIN = (() => { const rng = mulberry(47), a = []; for (let i = 0; i < 140; i++) a.push({ fx: rng(), fy: rng(), len: 10 + 8 * rng(), sp: 0.8 + 0.6 * rng() }); return a; })();

  function wash(w) {
    const { ctx, W, H } = F;
    const cx = W / 2, cy = 0.45 * H, m = Math.max(W, H);
    let g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 0.75 * m);
    g.addColorStop(0, `rgba(${C.warm},${0.35 * w})`);
    g.addColorStop(1, `rgba(${C.warm},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    g = ctx.createRadialGradient(cx, cy, 0.45 * m, cx, cy, 0.95 * m);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, `rgba(0,0,0,${0.35 * w})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
  }

  // one silhouette path, filled
  function figure(s, feet, hF, fill) {
    const { ctx } = F;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(s, feet - hF + hF * 0.07, hF * 0.07, 0, TAU);
    ctx.moveTo(s - hF * 0.11, feet - hF * 0.84);
    ctx.lineTo(s + hF * 0.11, feet - hF * 0.84);
    ctx.lineTo(s + hF * 0.08, feet - hF * 0.45);
    ctx.lineTo(s - hF * 0.08, feet - hF * 0.45);
    ctx.closePath();
    ctx.rect(s - hF * 0.075, feet - hF * 0.45, hF * 0.06, hF * 0.45);
    ctx.rect(s + hF * 0.015, feet - hF * 0.45, hF * 0.06, hF * 0.45);
    ctx.rect(s - hF * 0.14, feet - hF * 0.84, hF * 0.04, hF * 0.42);
    ctx.rect(s + hF * 0.10, feet - hF * 0.84, hF * 0.04, hF * 0.42);
    ctx.fill();
  }

  function far(w) {
    const { ctx, H, t, gy, red } = F;
    each(FIGS, px(160), (e, s) => {
      const hF = H * (0.26 + 0.2 * e.r1);
      const feet = gy + px(10);
      const beat = red ? (e.r3 < 0.5 ? 0 : 1) : Math.floor(t / 1.2) % 2;
      const f = clearBox(s, feet - hF / 2, hF * 0.2, hF / 2);
      const m = 0.5 + 0.5 * f;
      figure(s + px(4), feet + px(4), hF, `rgba(${C.dark},${0.40 * m})`);
      figure(s, feet, hF, beat === 0 ? `rgba(${C.figGreen},${0.20 * m})` : `rgba(${C.silver},${0.10 * m})`);
    });
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
  }

  // dot + stem pointing along ang
  function pin(x, y, ang) {
    const { ctx } = F;
    ctx.fillStyle = ctx.strokeStyle = `rgba(${C.cream},${0.7 * 0.7})`;
    ctx.beginPath();
    ctx.arc(x, y, px(2), 0, TAU);
    ctx.fill();
    ctx.lineWidth = px(1.5);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang) * px(6), y + Math.sin(ang) * px(6));
    ctx.stroke();
  }

  function mid(w) {
    const { ctx, H, t, red } = F;

    // pins: rows, columns, rings
    each(PINS, px(120), (e, s) => {
      const y = e.fy * H;
      if (e.r4 < 0.4) {
        const n = 5 + Math.floor(e.r1 * 5);
        const hw = px((n - 1) / 2 * 22 + 10), hh = px(10);
        const f = clearBox(s, y, hw, hh);
        if (f < 0.03) return;
        ctx.globalAlpha = f;
        for (let k = 0; k < n; k++) pin(s + (k - (n - 1) / 2) * px(22), y, -TAU / 4);
        ctx.globalAlpha = 1;
      } else if (e.r4 < 0.7) {
        const n = 4 + Math.floor(e.r1 * 4);
        const ang = e.r3 < 0.5 ? 0 : Math.PI;
        const hw = px(10), hh = px((n - 1) / 2 * 22 + 10);
        const f = clearBox(s, y, hw, hh);
        if (f < 0.03) return;
        ctx.globalAlpha = f;
        for (let k = 0; k < n; k++) pin(s, y + (k - (n - 1) / 2) * px(22), ang);
        ctx.globalAlpha = 1;
      } else {
        const rot = red ? e.r1 * TAU : t * 0.25 + e.r1 * TAU;
        const hs = px(36);
        const f = clearBox(s, y, hs, hs);
        if (f < 0.03) return;
        ctx.globalAlpha = f;
        for (let k = 0; k < 6; k++) {
          const a = rot + k * TAU / 6;
          pin(s + Math.cos(a) * px(30), y + Math.sin(a) * px(30), a);
        }
        ctx.globalAlpha = 1;
      }
    });

    // pieces: spinning four-point (eight vertex) pieces
    each(PIECES, px(30), (e, s) => {
      const cy = e.fy * H + (red ? 0 : Math.sin(t * 0.9 + e.r3 * TAU) * px(3));
      const pf = clearBox(s, cy, px(14), px(14));
      if (pf < 0.03) return;
      const g = ctx.createRadialGradient(s, cy, 0, s, cy, px(14));
      g.addColorStop(0, `rgba(${C.cream},${0.15 * 0.5 * pf})`);
      g.addColorStop(1, `rgba(${C.cream},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(s - px(14), cy - px(14), px(28), px(28));

      const rot = red ? e.r1 * TAU : t * 1.2 * (e.r2 < 0.5 ? 1 : -1) + e.r1 * TAU;
      ctx.fillStyle = `rgba(${C.cream},0.85)`;
      ctx.globalAlpha = pf;
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const a = rot + k * TAU / 8, r = k % 2 === 0 ? px(9) : px(3.5);
        const x = s + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // arcs: dotted jump arcs from a planted shadow
    each(ARCS, px(260), (e, s) => {
      const y = e.fy * H;
      const dx = px(120 + 100 * e.r1) * (e.r2 < 0.5 ? -1 : 1);
      const hA = px(60 + 60 * e.r3);
      const f = clearBox(s + dx / 2, y - hA / 2, Math.abs(dx) / 2 + px(10), hA / 2 + px(15));
      if (f < 0.03) return;
      ctx.globalAlpha = f;
      ctx.fillStyle = `rgba(${C.cream},0.4)`;
      for (let k = 0; k <= 8; k++) {
        const u = k / 8;
        ctx.beginPath();
        ctx.arc(s + dx * u, y - 4 * hA * u * (1 - u), px(1.6), 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = `rgba(${C.green},0.65)`;
      ctx.fillRect(s - px(2.5), y - px(9), px(5), px(9));
      ctx.beginPath();
      ctx.arc(s, y - px(11), px(2.5), 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
  }

  function star(x, y, a) {
    const { ctx } = F;
    const rgba = `rgba(${C.cream},${a})`;
    ctx.strokeStyle = rgba;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y - px(3.5)); ctx.lineTo(x, y + px(3.5));
    ctx.moveTo(x - px(2.45), y); ctx.lineTo(x + px(2.45), y);
    ctx.stroke();
    ctx.fillStyle = rgba;
    ctx.beginPath();
    ctx.arc(x, y, px(1.12), 0, TAU);
    ctx.fill();
  }

  function near(w) {
    const { ctx, H, t, red } = F;

    // stars: sparkles that come in echoed pairs
    each(STARS, px(30), (e, s) => {
      const y = e.fy * H;
      const f = clearBox(s, y, px(3.5), px(3.5));
      if (f < 0.03) return;
      const a = (red ? 0.7 : 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * TAU / (1.6 + 1.4 * e.r3) + e.r2 * TAU))) * 0.6 * f;
      star(s, y, a);
      star(s + px(14), y + px(9), a * 0.4);
    });

    // symbols: the split piece, three wedges orbiting exploded apart
    each(SYMS, px(40), (e, s) => {
      const cy = e.fy * H;
      const gf = clearBox(s, cy, px(18), px(18));
      const g = ctx.createRadialGradient(s, cy, 0, s, cy, px(18));
      g.addColorStop(0, `rgba(${C.pale},${0.14 * 0.5 * gf})`);
      g.addColorStop(1, `rgba(${C.pale},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(s - px(18), cy - px(18), px(36), px(36));

      const rot = red ? e.r1 * TAU : t * 0.5 + e.r1 * TAU;
      ctx.fillStyle = `rgba(${C.pale},0.8)`;
      for (let k = 0; k < 3; k++) {
        const a0 = rot + k * TAU / 3, am = a0 + TAU / 6;
        ctx.save();
        ctx.translate(s + Math.cos(am) * px(4), cy + Math.sin(am) * px(4));
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, px(10), a0 + 0.17, a0 + TAU / 3 - 0.17);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    });

    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
  }

  function grade(w) {
    if (w <= 0.05) return;
    const { ctx, W, H, t, red } = F;
    ctx.strokeStyle = `rgba(${C.rain},${0.12 * w})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const d of RAIN) {
      const x = ((d.fx * W - (red ? 0 : t * px(40) * d.sp)) % W + W) % W;
      const y = ((d.fy * H + (red ? 0 : t * px(260) * d.sp)) % (H + px(20))) - px(20);
      ctx.moveTo(x, y);
      ctx.lineTo(x - px(2), y + px(d.len));
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
  }

  G.P.conclusus = { base: [16, 9, 10], wash, layers: [{ par: 0.2, paint: far }, { par: 0.42, paint: mid }, { par: 0.7, paint: near }], grade };
})();
