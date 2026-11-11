/* genesis-trade.js — the travelling stream: the constant trickle of shapes
   east (and west, out of the record) that carries wreckage along the deck
   with everything else, flowing along with the old ones from late in the
   trade beat through the walk. Screen-space. */
window.GenTrade = (function () {
  const G = window.Gen;
  const { clamp, hash1, mulberry } = Util;
  const { poly, circle } = Paint;
  const sx = G.sx;
  const TAU = Math.PI * 2;

  const BODY = "rgb(96,96,96)", FLESH = "rgb(116,116,116)", TOP = "rgb(132,132,132)";   // flat greys, drawn outside the wash: the old ones stay the brightest

  /* ---- the travelling stream: 200 shapes moving east or west --------- */
  const TRAV_TYPES = ["blob", "stone", "flesh", "insect", "colour", "dust"];
  const SPECK = "rgb(72,72,72)", MOTE = "rgb(64,64,64)";   // colourless air specks, dimmer than the deck travellers
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
    trnd(); trnd();   // two draws kept so every later value (and every traveller's path) stays as it was
    const pal = Math.floor(trnd() * 6);
    const endOff = trnd() * 0.35;
    const rate = 0.05 + trnd() * 0.10;
    TRAV.push({ type, east, u0, delay, gait, air, size, ph, pal, endOff, rate });
  }

  function drawTraveller(ctx, tv, x, y, alpha) {
    ctx.globalAlpha = alpha;
    const bob = tv.air < 0.03 ? Math.abs(Math.sin(G.t * 6 * tv.gait + tv.ph)) * 2 : 0;
    const yy = y - bob;
    switch (tv.type) {
      case "blob": {
        circle(ctx, x, yy, tv.size, BODY);
        circle(ctx, x - tv.size * 0.3, yy - tv.size * 0.3, tv.size * 0.2, TOP);
        break;
      }
      case "stone": {
        const pts = [];
        for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; pts.push([x + Math.cos(a) * tv.size, yy + Math.sin(a) * tv.size]); }
        poly(ctx, pts); ctx.fillStyle = BODY; ctx.fill();
        break;
      }
      case "flesh": {
        const pts = [];
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * TAU;
          const r = tv.size * (0.8 + hash1(k * 13 + 1) * 0.4);
          pts.push([x + Math.cos(a) * r, yy + Math.sin(a) * r]);
        }
        poly(ctx, pts); ctx.fillStyle = FLESH; ctx.fill();
        break;
      }
      case "insect": {
        const flap = Math.abs(Math.sin(G.t * 38 + tv.ph));
        ctx.globalAlpha = alpha * 0.5; ctx.fillStyle = "#cfd6d3";
        ctx.beginPath(); ctx.ellipse(x - tv.size * 0.3, yy - tv.size * 0.3 * flap, tv.size * 0.5, tv.size * 0.2, 0.3, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x + tv.size * 0.3, yy - tv.size * 0.3 * flap, tv.size * 0.5, tv.size * 0.2, -0.3, 0, TAU); ctx.fill();
        ctx.globalAlpha = alpha; ctx.fillStyle = window.GenMatter ? GenMatter.INSECT_BODY : "rgb(96,96,96)";
        ctx.beginPath(); ctx.ellipse(x, yy, tv.size * 0.4, tv.size * 0.2, 0, 0, TAU); ctx.fill();
        break;
      }
      case "colour": {
        circle(ctx, x, yy, tv.size * 0.5, SPECK);
        break;
      }
      case "dust": {
        for (let k = 0; k < 3; k++) {
          const a = tv.ph + k * 2.1;
          circle(ctx, x + Math.cos(a) * tv.size * 0.4, yy + Math.sin(a) * tv.size * 0.4, 1, MOTE);
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
    const swarmSince = G.since ? G.since("enter") : 0;
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
