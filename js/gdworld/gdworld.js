/* gdworld.js — the Game Dev sector's world: four painted backgrounds, one
   per game (Sector Zero, VoidScape, HeavyLight, Conclusus), that meld by
   distance. Each game owns a field of elements centred on its planet; the
   field is full at the planet and thins to nothing R units out, so flying
   away from one game empties the screen before the next game's outriders
   appear. The painters live in gd-zero.js, gd-voidscape.js,
   gd-heavylight.js and gd-conclusus.js; each registers
     GdWorld.P[id] = { base: [r, g, b], wash(w), layers: [{ par, paint(w) }], grade(w) }
   where `base` is the game's sky colour, `wash` paints screen-space
   backdrops under the layers, `layers` are world-space layers painted far
   to near (all four games interleaved by parallax) and `grade` paints
   screen-space effects over them. `w` is the game's weight at the camera,
   0..1 (for `wash` and `grade` it is ramped by `washW`, so both are skipped
   between planets). Only the ship is shared with the Void sector. Painters
   read the frame `F` at paint time (never at load: it is empty until the
   first draw) and use sx / each / scatter / clear / clearBox. Sizes are
   "px at a 1440-wide hero" times F.k, so the art scales with the viewport
   like the ship does. */
window.GdWorld = (function () {
  const { mix, smooth, mulberry, reduced } = Util;
  const PL = Marks.PLANETS;                 // west → east: zero, voidscape, heavylight, conclusus
  const GAMES = PL.map((m, i) => ({ id: m.theme, x: m.x, i, seed: 1000 + i * 977 }));
  const R = 38000;        // world units from a planet to the empty edge of its field
  const RAMP = 0.55;      // the outer 55% of R thins out; inside that the field is full
  const GROUND = 0.64;    // the floor line as a fraction of H (where the Void's deck used to run)
  const BASE0 = [7, 9, 16];   // the sector's own black between fields, #070910
  const CLEAR_IN = 70;    // px at a 1440 hero: inside this distance from a mark, nothing
  const CLEAR_FADE = 110; // then the art fades back in over this far

  /* how full game i's field is at world x: 1 within R*(1-RAMP), 0 at R */
  const dens = (i, x) => smooth((R - Math.abs(x - GAMES[i].x)) / (R * RAMP));

  /* the frame, set by draw() once per paint; painters read it and never write it */
  const F = { ctx: null, W: 0, H: 0, camX: 0, t: 0, dt: 1 / 60, vel: 0,
              sc: 1, k: 1, gy: 0, red: false, w: [0, 0, 0, 0], wsum: 0, marks: [] };
  const P = {};   // painter registry, one entry per game id

  /* world x → screen x at parallax par (1 = locked to the camera, smaller = further away) */
  const sx = (x, par) => (x - F.camX) * par * F.sc + F.W * 0.5;

  /* scatter(seed, i, n, par, fy0, fy1): n candidates spread evenly (jittered) across
     game i's field, each kept with probability dens(i, x) so the field thins with
     distance. Returns the kept ones sorted west → east, as
     { x, fy, par, r1, r2, r3, r4 } with fy in [fy0, fy1] and r1..r4 in [0, 1).
     Every candidate consumes the same number of rng calls, kept or not. */
  function scatter(seed, i, n, par, fy0, fy1) {
    const rng = mulberry(seed);
    const out = [];
    const x0 = GAMES[i].x - R, span = 2 * R;
    for (let j = 0; j < n; j++) {
      const x = x0 + span * ((j + rng()) / n);
      const keep = rng() < dens(i, x);
      const e = { x, fy: mix(fy0, fy1, rng()), par, r1: rng(), r2: rng(), r3: rng(), r4: rng() };
      if (keep) out.push(e);
    }
    return out;
  }

  /* each(list, pad, fn): fn(e, s) for every element whose screen x `s` lies within pad px of the viewport */
  function each(list, pad, fn) {
    for (const e of list) {
      const s = sx(e.x, e.par);
      if (s > -pad && s < F.W + pad) fn(e, s);
    }
  }

  /* the sector's own dust: a few faint specks so travel still reads between fields */
  const DUST = (() => {
    const rng = mulberry(4242), a = [];
    for (let i = 0; i < 160; i++) a.push({ x: rng(), y: rng(), a: 0.06 + rng() * 0.12, r: 0.6 + rng() * 0.9 });
    return a;
  })();
  function drawDust() {
    const { ctx, W, H, camX, sc } = F;
    const span = W * 2.2, off = camX * 0.12 * sc;
    ctx.fillStyle = "#b8c2c8";
    for (const d of DUST) {
      const x = ((d.x * span - off) % span + span) % span - W * 0.6;
      if (x < -2 || x > W + 2) continue;
      ctx.globalAlpha = d.a;
      ctx.beginPath(); ctx.arc(x, d.y * H, d.r, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* every registered layer, far to near; built on the first draw (painters register at load) */
  let order = null;
  function layerOrder() {
    if (order) return order;
    order = [];
    for (const g of GAMES) {
      const p = P[g.id];
      if (!p) continue;
      for (const L of (p.layers || [])) order.push({ i: g.i, par: L.par, paint: L.paint });
    }
    order.sort((a, b) => (a.par - b.par) || (a.i - b.i));
    return order;
  }

  // the weight the screen-space passes see: gone below w 0.10, full from w 0.35 (the midpoints between planets sit at 0.13–0.16)
  const washW = w => w * smooth((w - 0.10) / 0.25);

  /* clearBox(cx, cy, hw, hh): 0..1, how much of a box (centre, half sizes, screen px) may be
     drawn: 0 inside CLEAR_IN of a visible mark, back to 1 over CLEAR_FADE. Every painter fades
     its busy or bright elements by this so the marks stay findable. */
  function clearBox(cx, cy, hw, hh) {
    let f = 1;
    const r0 = CLEAR_IN * F.k, r1 = CLEAR_FADE * F.k;
    for (const mk of F.marks) {
      const dx = Math.max(0, Math.abs(mk.x - cx) - hw);
      const dy = Math.max(0, Math.abs(mk.y - cy) - hh);
      const d = Math.hypot(dx, dy);
      const g = 1 - mk.a * (1 - smooth((d - r0) / r1));
      if (g < f) f = g;
    }
    return f;
  }
  const clear = (x, y) => clearBox(x, y, 0, 0);

  function draw(context, v) {
    F.ctx = context; F.W = v.W; F.H = v.H; F.camX = v.camX; F.t = v.t || 0; F.vel = v.vel || 0;
    F.dt = Math.min(v.dt != null ? v.dt : 1 / 60, 0.1);
    F.sc = F.W / (v.viewUnits || 2100);
    F.k = F.sc / (1440 / 2100);
    F.gy = GROUND * F.H;
    F.red = reduced();
    F.marks.length = 0;
    for (const m of PL) {
      const a = m.vis || 0;
      if (a < 0.02) continue;
      const x = sx(m.x, m.par != null ? m.par : 0.7), y = (m.oy != null ? m.oy : 0.5) * F.H;
      if (x < -300 || x > F.W + 300) continue;
      F.marks.push({ x, y, a });
    }
    let wsum = 0;
    for (let i = 0; i < 4; i++) { F.w[i] = dens(i, F.camX); wsum += F.w[i]; }
    F.wsum = wsum;
    const { ctx, W, H } = F;
    ctx.globalAlpha = 1; ctx.lineWidth = 1; ctx.globalCompositeOperation = "source-over";

    // the sky: each game's base colour by weight, the sector black for the rest
    const n = Math.max(1, wsum);
    const c = BASE0.map(b => b * (1 - Math.min(1, wsum)));
    for (const g of GAMES) {
      const p = P[g.id];
      if (!p) continue;
      for (let ch = 0; ch < 3; ch++) c[ch] += p.base[ch] * F.w[g.i] / n;
    }
    ctx.fillStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
    ctx.fillRect(0, 0, W, H);

    drawDust();

    // washes: screen-space backdrops, by weight
    for (const g of GAMES) { const p = P[g.id]; const ww = washW(F.w[g.i]); if (p && p.wash && ww > 0.03) p.wash(ww); }

    // layers: every game's world-space layers, far to near (elements can still be
    // on screen while the game's weight at the camera is 0, so no weight test here)
    for (const L of layerOrder()) L.paint(F.w[L.i]);

    // grades: screen-space effects over the layers, by weight
    for (const g of GAMES) { const p = P[g.id]; const ww = washW(F.w[g.i]); if (p && p.grade && ww > 0.03) p.grade(ww); }

    ctx.globalAlpha = 1; ctx.lineWidth = 1; ctx.globalCompositeOperation = "source-over";
  }

  return { GAMES, R, GROUND, dens, F, P, sx, scatter, each, clear, clearBox, draw };
})();
