/* genesis-trade.js — the travelling stream: the constant trickle of shapes
   east (and west, out of the record) that carries wreckage along the deck
   with everything else, flowing along with the old ones from late in the
   trade beat through the walk. Screen-space. */
window.GenTrade = (function () {
  const G = window.Gen;
  const { clamp, hash1, mulberry } = Util;
  const { litShade, poly, circle } = Paint;
  const sx = G.sx;
  const TAU = Math.PI * 2;

  const PAL = [
    ["#b0525c", "#6e2a33"], // flesh
    ["#7a4a7e", "#44264a"], // bruise
    ["#d8ccb0", "#9a8c70"], // bone
    ["#8d918c", "#4b4f4c"], // stone
    ["#5a5d5a", "#2e302e"], // dark stone
    ["#8a9a6a", "#4f5a3a"], // sick
  ];
  const HL_DOT = "rgba(255,255,255,0.8)";

  function circleSplit(ctx, x, y, r, lit, shade) {
    if (r * 2 < 8) { circle(ctx, x, y, r, lit); return; }
    litShade(ctx, () => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }, x - 0.2 * r, lit, shade);
  }
  function polySplit(ctx, pts, lit, shade) {
    let lo = Infinity, hi = -Infinity;
    for (const p of pts) { if (p[0] < lo) lo = p[0]; if (p[0] > hi) hi = p[0]; }
    if (hi - lo < 8) { poly(ctx, pts); ctx.fillStyle = lit; ctx.fill(); return; }
    litShade(ctx, () => poly(ctx, pts), lo + 0.4 * (hi - lo), lit, shade);
  }

  /* ---- the travelling stream: 200 shapes moving east or west --------- */
  const TRAV_TYPES = ["blob", "stone", "flesh", "insect", "colour", "dust"];
  const HUES = ["230,70,60", "70,130,255", "120,214,96", "236,92,150", "245,208,107", "140,70,210"];
  const trnd = mulberry(9303);
  const TRAV = [];
  for (let i = 0; i < 200; i++) {
    const type = TRAV_TYPES[Math.floor(trnd() * 6)];
    const east = trnd() < 0.62;
    const u0 = (trnd() - 0.5) * 0.7;
    const delay = trnd() * 3.2;
    const gait = 0.75 + trnd() * 0.5;
    const isAir = type === "insect" || type === "colour" || type === "dust";
    const air = isAir ? 0.05 + trnd() * 0.28 : trnd() * 0.02;
    const size = 2.5 + trnd() * 6;
    const ph = trnd() * TAU;
    const hueA = Math.floor(trnd() * 6), hueB = Math.floor(trnd() * 6);
    const pal = Math.floor(trnd() * 6);
    const endOff = trnd() * 0.35;
    const rate = 0.05 + trnd() * 0.10;
    TRAV.push({ type, east, u0, delay, gait, air, size, ph, hueA, hueB, pal, endOff, rate });
  }

  function drawTraveller(ctx, tv, x, y, alpha) {
    ctx.globalAlpha = alpha;
    const bob = tv.air < 0.03 ? Math.abs(Math.sin(G.t * 6 * tv.gait + tv.ph)) * 2 : 0;
    const yy = y - bob;
    switch (tv.type) {
      case "blob": {
        const [lit, shade] = PAL[tv.pal];
        circleSplit(ctx, x, yy, tv.size, lit, shade);
        circle(ctx, x - tv.size * 0.3, yy - tv.size * 0.3, tv.size * 0.2, HL_DOT);
        break;
      }
      case "stone": {
        const [lit, shade] = PAL[3];
        const pts = [];
        for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; pts.push([x + Math.cos(a) * tv.size, yy + Math.sin(a) * tv.size]); }
        polySplit(ctx, pts, lit, shade);
        break;
      }
      case "flesh": {
        const [lit, shade] = PAL[0];
        const pts = [];
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * TAU;
          const r = tv.size * (0.8 + hash1(k * 13 + 1) * 0.4);
          pts.push([x + Math.cos(a) * r, yy + Math.sin(a) * r]);
        }
        polySplit(ctx, pts, lit, shade);
        break;
      }
      case "insect": {
        const flap = Math.abs(Math.sin(G.t * 38 + tv.ph));
        ctx.globalAlpha = alpha * 0.5; ctx.fillStyle = "#cfd6d3";
        ctx.beginPath(); ctx.ellipse(x - tv.size * 0.3, yy - tv.size * 0.3 * flap, tv.size * 0.5, tv.size * 0.2, 0.3, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x + tv.size * 0.3, yy - tv.size * 0.3 * flap, tv.size * 0.5, tv.size * 0.2, -0.3, 0, TAU); ctx.fill();
        ctx.globalAlpha = alpha; ctx.fillStyle = "#2a2622";
        ctx.beginPath(); ctx.ellipse(x, yy, tv.size * 0.4, tv.size * 0.2, 0, 0, TAU); ctx.fill();
        break;
      }
      case "colour": {
        const period = 0.6 + (tv.ph % 1);
        const hi = ((G.t + tv.ph) % (period * 2)) < period ? tv.hueA : tv.hueB;
        circle(ctx, x, yy, tv.size * 0.5, `rgb(${HUES[hi]})`);
        break;
      }
      case "dust": {
        for (let k = 0; k < 3; k++) {
          const a = tv.ph + k * 2.1;
          circle(ctx, x + Math.cos(a) * tv.size * 0.4, yy + Math.sin(a) * tv.size * 0.4, 1, "#b9b2a3");
        }
        break;
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawStream(ctx) {
    if (typeof G.secs !== "function") return;
    const base = G.secs("trade");
    if (base < 7.2) return;
    const swarmSince = G.since ? G.since("swarm") : 0;
    if (swarmSince >= 1) return;
    const landSince = G.since ? G.since("land") : 0;
    const rootSince = G.since ? G.since("root") : 0;
    const W = G.W, H = G.H;
    if (W === 0) return;
    for (const tv of TRAV) {
      const tsince = base - 7.2 - tv.delay;
      if (tsince < 0) continue;
      const ft = Math.max(0, base - 7.2 - tv.delay);
      const u = tv.east
        ? G.cam - 0.75 + (((tv.u0 + 0.7 + ft * tv.rate) % 1.5 + 1.5) % 1.5)
        : G.cam + 0.75 - (((tv.u0 + 0.7 + ft * tv.rate * 1.4) % 1.5 + 1.5) % 1.5);
      const x = sx(u);
      if (x < -20 || x > W + 20) continue;
      const edge = clamp(Math.min(x + 40, W + 40 - x) / 120, 0, 1);
      const y = G.DECK * H - 3 - tv.air * H + Math.sin(G.t * 2 + tv.ph) * (tv.air > 0.03 ? 6 : 1.5);
      const alpha = Math.min(1, tsince / 0.6) * (1 - swarmSince) * (1 - landSince) * (1 - rootSince * 0.6) * edge;
      if (alpha < 0.02) continue;
      drawTraveller(ctx, tv, x, y, alpha);
    }
    ctx.globalAlpha = 1; ctx.lineWidth = 1;
  }

  return { drawStream };
})();
