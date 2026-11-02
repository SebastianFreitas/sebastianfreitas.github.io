/* genesis-void.js — the void half of the record: the point, the span,
   the old ones, Primordisentia, the two lights and their trails. */
(function () {
  const G = window.Gen;
  const { hash1, clamp, mix, mulberry } = Util;
  const { ROOT_U, DECK, BAY_U, SPAN_START_U, motes, idxOf, sx } = G;

  function fillBg(ctx) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#0d1114";
    ctx.fillRect(0, 0, G.W, G.H);
  }

  function drawMotes(ctx, amt, streak) {
    if (amt < 0.02) return;
    const span = G.W * 2.2;
    const off = G.t * 12 + G.cam * G.W * 0.35;
    // in the birth scene the air's ticks go under the same deep shadow as the rest of the sky
    const outer = ctx, shade = G.sceneOf(G.beat) === "birth" && window.GenElem;
    if (shade) ctx = GenElem.layerBegin(outer);
    ctx.fillStyle = "#c6ccc6";
    ctx.strokeStyle = "#c6ccc6";
    for (const m of motes) {
      const x = ((m.u * span - off * (0.3 + m.rr * 0.2)) % span + span) % span - span * 0.15;
      if (x < -40 || x > G.W + 40) continue;
      const y = m.y * G.H + Math.sin(G.t * 0.5 + m.ph) * 14;
      if (window.GenTier3 && GenTier3.pocket(x, y)) continue;
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
    if (shade) GenElem.layerEnd(outer, ctx, GenElem.dimK());
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
      if (window.GenTier3 && GenTier3.pocket(x, y)) continue;
      if (G.BEATS[G.beat].id === "flee") {
        const bandW = G.W / 3;
        let left = -Infinity;
        if (G.local >= 1.0) {
          left = G.reduced ? G.W * 0.34 : G.W * (0.67 - 0.33 * Math.floor((G.local - 1.0) / 2.5));
        }
        if (left + bandW >= 0 && x >= left && x <= left + bandW) continue;
      }
      const a = amt * 0.35 * (0.6 + 0.4 * Math.sin(G.t * 1.7 + s.ph));
      ctx.fillStyle = `rgba(${LIGHT_TINT[s.tint]},${a})`;
      ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  let pulsePh = 0, pulseLast = 0;
  function drawPoint(ctx, amt, crack, tension, implode) {
    if (amt < 0.01 && crack < 0.02) return;
    const cx = sx(0), cy = G.H * 0.46;
    const m = Math.min(G.W, G.H);
    const tn = tension || 0, im = implode || 0;
    const still = G.reduced && tn > 0;
    const sc = 1 - Math.floor(im * 4) / 4;
    if (tn <= 0) pulsePh = G.t;
    else pulsePh += Math.min(0.1, Math.max(0, G.t - pulseLast)) * (1 + 2 * tn);
    pulseLast = G.t;
    const tt = still ? 0 : pulsePh;
    const pull = 1 - 0.55 * tn;

    ctx.lineWidth = 1;
    for (let k = 0; sc > 0 && k < 5; k++) {
      const base = (0.10 + 0.07 * k) * m * sc;
      const f = tt * 0.22 + k * 0.2;
      const r = base * (1 - 0.08 * (f - Math.floor(f)));
      ctx.strokeStyle = `rgba(120,128,124,${0.16 * amt * (1 - 0.12 * k)})`;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, 6.283);
      ctx.stroke();
    }

    // a tremor that grows with tension
    const live = G.reduced ? 0 : G.t;
    const trem = G.reduced ? 0 : tn * tn * 2.5;
    const tx = cx + Math.sin(G.t * 53) * trem, ty = cy + Math.cos(G.t * 61) * trem;
    const br = 1 + 0.25 * Math.sin(live * 3.4);
    ctx.fillStyle = "#8c8c8c";
    if (sc > 0) { ctx.beginPath(); ctx.arc(tx, ty, (4 + 3 * amt) * sc * br, 0, 6.283); ctx.fill(); }
    ctx.fillStyle = "#b4b4b4";
    ctx.beginPath(); ctx.arc(tx, ty, sc > 0 ? Math.max(1.5, (3 + 2 * amt) * sc * br) : 1.5, 0, 6.283); ctx.fill();

    if (crack > 0.02) {
      ctx.strokeStyle = `rgba(180,180,180,${0.85 * crack})`;
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

  // top of the thin red rail line on the deck
  const railY = (H) => H * DECK - 0.012 * H - 1.5;

  const SPAN_BAY_U = 0.46;
  const hh = (b, i, k) => { const v = Math.sin(b * 91.7 + i * 37.3 + k * 13.9 + 5.1) * 43758.5453; return v - Math.floor(v); };
  let spanCv = null, spanCtx = null;
  const spanKey = new Float64Array(13);
  // the rail erodes in the break: hard-edged gaps fixed by seed in span units; each opens at its own time over the blast, then holds; one flat colour, no fades
  const RAIL_GAPS = (() => {
    // about 30% of the line worn away, no period: patches, runs and sizes all drawn from wide skewed ranges; mediums are placed apart from the patches, in clumps (1 u = 1 view width)
    // rows: 0 both rows, 1 top row only, 2 bottom row only; mediums have a one-row step at each end
    const end = ROOT_U + 0.22, PX = 1 / 1440;
    const mkRnd = (seed) => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const effOf = (g) => g.sz * (g.rows ? 0.5 : 1) + (g.stl + g.str) * 0.5;
    const mk = (rnd, med, szPx, u0) => {
      const r = rnd();
      const rows = med || rnd() < 0.3 ? 0 : 1 + Math.floor(rnd() * 2);
      const stl = med ? (2 + 5 * rnd()) * PX : 0, str = med ? (2 + 5 * rnd()) * PX : 0;
      return { med, sz: szPx * PX, rows, stl, str, rl: 1 + Math.floor(rnd() * 2), rr: 1 + Math.floor(rnd() * 2),
        t: 0.6 + 0.8 * rnd(), vx: (rnd() - 0.5) * (med ? 30 : 50), vy: med ? -4 - 14 * r : -10 - 26 * r, life: 0.6 + 0.3 * rnd(),
        u0: u0, u1: u0 + szPx * PX };
    };
    // medium chunks: one clumped walk over the whole rail, independent of the patches
    const meds = [], mr = mkRnd(4417);
    for (let u = SPAN_START_U; u < end;) {
      u += (40 + 700 * Math.pow(mr(), 2)) * PX;
      const n = 1 + Math.floor(mr() * mr() * 3);
      for (let j = 0; j < n; j++) {
        const g = mk(mr, true, Math.round(25 + 20 * mr()), u);
        meds.push(g);
        u = g.u1 + g.str + (4 + 50 * Math.pow(mr(), 2)) * PX;
      }
    }
    // small chips: segments of random length, each with its own wear budget; inside, patches of their own length, density and size mix
    const chips = (a, b, k, seed) => {
      const rnd = mkRnd(seed), list = [];
      let u = a + rnd() * 80 * PX * k;
      while (u < b) {
        u += (10 + 340 * Math.pow(rnd(), 3)) * PX * k;
        const kind = rnd(), gapMax = 3 + 22 * rnd(), szMax = 2 + 16 * rnd();
        let n, plen;
        if (kind < 0.25) { n = 2 + Math.floor(rnd() * 2); plen = 20 + 50 * rnd(); }
        else if (kind < 0.45) { n = 1; plen = 0; }
        else { n = 99; plen = 30 + 230 * Math.pow(rnd(), 1.5); }
        const stop = u + plen * PX;
        for (let j = 0; j < n && (j === 0 || u < stop); j++) {
          const sz = Math.round(1 + (szMax - 1) * Math.pow(rnd(), 2));
          if (u + sz * PX > b) break;
          list.push(mk(rnd, false, sz, u));
          u += sz * PX + (kind < 0.25 ? (plen / 3) * rnd() * PX : Math.pow(rnd(), 3) * gapMax * PX);
        }
      }
      return list;
    };
    const all = meds.slice();
    const sr = mkRnd(991);
    for (let a = SPAN_START_U, si = 0; a < end; si++) {
      const b = Math.min(end, a + (260 + 160 * sr()) * PX), want = (0.30 + 0.04 * (sr() - 0.5)) * (b - a);
      let have = 0;
      for (const g of meds) if (g.u0 >= a && g.u0 < b) have += effOf(g);
      let lo = 0.1, hi = 8, best = [];
      for (let i = 0; i < 24; i++) {
        const k = (lo + hi) / 2, l = chips(a, b, k, 777 + si * 101);
        let e = have;
        for (const g of l) e += effOf(g);
        if (e > want) lo = k; else { hi = k; best = l; }
      }
      for (const g of best) all.push(g);
      a = b;
    }
    all.sort((x, y) => x.u0 - y.u0);
    // no merged run longer than 64 px: drop the item that would stretch it
    const out = [];
    let runA = -1, runB = -1;
    for (const g of all) {
      const a0 = g.u0 - g.stl, b0 = g.u1 + g.str;
      if (a0 <= runB + PX) { if (b0 - runA > 64 * PX) continue; runB = Math.max(runB, b0); }
      else { runA = a0; runB = b0; }
      out.push(g);
    }
    return out;
  })();
  // clear one gap from the rail canvas (device-independent CSS px)
  function clearGap(g, R, ry) {
    const a = Math.round(sx(R.u0)), b = Math.max(a + 1, Math.round(sx(R.u1)));
    if (R.rows === 0) g.clearRect(a, ry, b - a, 2); else g.clearRect(a, ry + R.rows - 1, b - a, 1);
    if (R.stl) { const t = Math.round(sx(R.u0 - R.stl)); g.clearRect(t, ry + R.rl - 1, a - t, 1); }
    if (R.str) { const t = Math.max(b + 1, Math.round(sx(R.u1 + R.str))); g.clearRect(b, ry + R.rr - 1, t - b, 1); }
  }
  function drawRailChips(ctx) {
    if (G.beat !== idxOf("break")) return;
    const H = G.H, W = G.W, s = G.secs("break");
    ctx.fillStyle = "#6e1a1a";
    for (let i = 0; i < RAIL_GAPS.length; i++) {
      const R = RAIL_GAPS[i], a = s - R.t;
      if (a < 0 || a >= (R.med ? 1.2 : 0.7)) continue;
      const cx = sx((R.u0 + R.u1) / 2);
      if (cx < -80 || cx > W + 80) continue;
      const w = Math.max(2, Math.round(R.sz * W * (R.med ? 0.8 : 0.6))), n = R.med ? 20 + Math.floor(hh(i, 0, 70) * 9) : Math.max(2, Math.round(w / 2)), ry = Math.round(railY(H)), bx = sx(0);
      // the piece breaks up in place: each speck is blown from the blast centre (bx), then snaps out at its own moment
      for (let j = 0; j < n; j++) {
        const L = R.med ? 0.25 * hh(i, j, 79) : 0, tb = L + (R.med ? 0.3 + 0.9 * hh(i, j, 71) : 0.25 + 0.45 * hh(i, j, 71)), x = cx + (hh(i, j, 72) - 0.5) * w * 1.8;
        if (a < L || a >= tb) continue;
        const dx = x - bx, v = (80 + 180 * hh(i, j, 73)) * (1 + 0.5 * Math.max(0, 1 - Math.abs(dx) / W)), vx = (dx < 0 ? -1 : 1) * v * (0.5 + 0.5 * hh(i, j, 77)), vy = -Math.max(60, v * (0.05 + 0.7 * hh(i, j, 75))), u = a - L;
        const up = 2 + 8 * hh(i, j, 78) - vy * u, f = (a - L) / (tb - L), sz = Math.min(f < 0.4 ? 2 + (hh(i, j, 74) < 0.5 ? 1 : 0) : f < 0.75 ? 2 : 1, up < 6 ? 2 : 3);
        ctx.fillRect(Math.round(x + vx * u), ry - Math.round(up), sz, sz);
      }
    }
  }
  function drawSpan(ctx, grow) {
    drawSpanBody(ctx, grow);
    if (grow >= 0.02) drawRailChips(ctx);
  }
  function railOpen(i) {
    const bi = idxOf("break");
    return G.beat > bi || (G.beat === bi && G.secs("break") >= RAIL_GAPS[i].t);
  }
  // The span: an old one, long dead. Few limbs bowed at the knee, a thin iron
  // deck, near the void's own colour; limbs and ends go into the fog.
  function drawSpanBody(ctx, grow) {
    if (grow < 0.02) return;
    const W = G.W, H = G.H, deckY = H * DECK;
    const inf = G.beat >= idxOf("flee");
    const lit = G.beat <= idxOf("drawn") ? 1 : 0;
    const startU = inf ? G.cam - 2.65 : SPAN_START_U;
    const endU = inf ? G.cam + 2.45 : mix(-0.48, ROOT_U + 0.22, grow);
    const x0 = sx(startU);
    const x1 = sx(endU);
    if (x1 - x0 < 2) return;

    const cw = ctx.canvas.width, ch = ctx.canvas.height;
    if (!spanCv) { spanCv = document.createElement("canvas"); spanCtx = spanCv.getContext("2d"); }
    if (spanCv.width !== cw || spanCv.height !== ch) { spanCv.width = cw; spanCv.height = ch; }
    const sxk = cw / W, syk = ch / H;
    const dx0 = Math.max(0, Math.floor((x0 - 3) * sxk));
    const dx1 = Math.min(cw, Math.ceil((x1 + 3) * sxk));
    const dy0 = Math.max(0, Math.floor((deckY - 0.06 * H) * syk));
    const dy1 = ch;
    if (dx1 <= dx0 || dy1 <= dy0) return;
    const bx0 = dx0 / sxk, bx1 = dx1 / sxk, by0 = dy0 / syk, by1 = dy1 / syk; // same box in CSS px
    const first = Math.floor((G.cam - 0.5) / SPAN_BAY_U) - 1;
    const last = Math.ceil((G.cam + 0.5) / SPAN_BAY_U) + 1;
    const arrived = (id, b, k) => G.secs(id) >= hh(b, 0, k) * G.beatDur(id) * 0.8;
    // everything in the offscreen depends on these only: blit it when none changed
    let sig = 0;
    for (let b = first; b <= last; b++) {
      sig = (sig * 31 + (arrived("trade", b, 2) ? 1 : 0) + (arrived("walk", b, 21) ? 2 : 0) + (arrived("trade", b, 41) ? 4 : 0)) | 0;
    }
    let gapSig = 0;
    for (let i = 0; i < RAIL_GAPS.length; i++) if (railOpen(i)) gapSig++; // gaps only ever open, so the count names the set
    const K = spanKey;
    const same = K[0] === cw && K[1] === ch && K[2] === W && K[3] === H && K[4] === x0 && K[5] === x1
      && K[6] === G.cam && K[7] === sig && K[8] === dx0 && K[9] === dx1 && K[10] === dy0 && K[11] === lit && K[12] === gapSig;
    if (same) {
      ctx.save();
      ctx.globalAlpha = clamp(grow * 3, 0, 1) * 0.9;
      ctx.drawImage(spanCv, dx0, dy0, dx1 - dx0, dy1 - dy0, bx0, by0, bx1 - bx0, by1 - by0);
      ctx.restore();
      return;
    }
    K[0] = cw; K[1] = ch; K[2] = W; K[3] = H; K[4] = x0; K[5] = x1;
    K[6] = G.cam; K[7] = sig; K[8] = dx0; K[9] = dx1; K[10] = dy0; K[11] = lit; K[12] = gapSig;
    const g = spanCtx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    g.clearRect(dx0, dy0, dx1 - dx0, dy1 - dy0);
    g.setTransform(cw / W, 0, 0, ch / H, 0, 0);

    const slab = 0.020 * H;
    const yt = deckY + slab; // slab underside
    const sh = 0.06 * H; // shoulder half-span
    const LIMB_LIT = "#151b20", LIMB_SHADE = "#0d1115";
    const CITY_LIT = "#1e262d", CITY_SHADE = "#12181d", UNDER_LIT = "#161c21", UNDER_SHADE = "#0e1216", NEST_LIT = "#1b1f22", NEST_SHADE = "#101316", WIN = "rgba(245,208,107,0.35)";
    // while it is drawn (point, drawn) the deck is lit: a held step well above the backdrop and a pale cold edge
    const SLAB = "#11161a", DECK_TOP = lit ? "#2e383f" : "#1e262c", DECK_HI = "#34414b";
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

    // hanging cities: clustered towers grown down from the slab's underside
    for (let b = first; b < last; b++) {
      if (!(hh(b, 0, 1) < 0.45 && arrived("trade", b, 2))) continue;
      const cu = (b + 0.3 + 0.4 * hh(b, 0, 3)) * SPAN_BAY_U;
      const cx = sx(cu);
      const cwid = (0.012 + 0.018 * hh(b, 0, 4)) * H;
      const n = 4 + Math.floor(hh(b, 0, 5) * 6);
      for (let i = 0; i < n; i++) {
        const x = cx + (hh(b, i, 6) * 2 - 1) * cwid;
        const w = Math.max(1, (0.0015 + 0.003 * hh(b, i, 7)) * H);
        const ht = (0.006 + 0.03 * hh(b, i, 8) * hh(b, i, 8)) * H;
        const lean = (hh(b, i, 9) - 0.5) * w * 1.2;
        const y0 = yt - 1;
        const y1 = y0 + ht;
        const trace = () => {
          g.beginPath();
          g.moveTo(x - w / 2, y0);
          g.lineTo(x + w / 2, y0);
          g.lineTo(x + w / 2 + lean, y1 - w);
          g.lineTo(x + lean, y1 + w * 1.2);
          g.lineTo(x - w / 2 + lean, y1 - w);
          g.closePath();
        };
        if (w >= 3) {
          Paint.litShade(g, trace, x - w * 0.2, UNDER_LIT, UNDER_SHADE);
        } else {
          trace();
          g.fillStyle = UNDER_LIT;
          g.fill();
        }
        if (ht > 0.012 * H) {
          const m = Math.floor(hh(b, i, 10) * 3);
          g.fillStyle = WIN;
          for (let j = 0; j < m; j++) {
            const f = 0.25 + 0.5 * hh(b, i, 11 + j);
            g.fillRect(Math.round(x + lean * f - 0.5), Math.round(y0 + ht * f), 1, 1);
          }
        }
      }
    }

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

      // nests: on the piers, tucked at the knee and under the eave
      if (hh(b, 0, 20) < 0.7 && arrived("walk", b, 21)) {
        if (hh(b, 0, 22) < 0.75) {
          const ax = xk + wk * 0.3 + (hh(b, 0, 23) - 0.5) * wk;
          const ay = yk - wk * 0.9;
          const nw = (0.008 + 0.008 * hh(b, 0, 24)) * H;
          const nh = nw * 0.55;
          const nestTrace = () => {
            g.beginPath();
            g.moveTo(ax - nw / 2, ay - nh);
            for (let j = 0; j <= 6; j++) {
              const x = ax - nw / 2 + nw * j / 6;
              const y = ay - nh - (j % 2 ? 0.25 : -0.1) * nh * (0.6 + 0.8 * hh(b, j, 25));
              g.lineTo(x, y);
            }
            g.quadraticCurveTo(ax, ay + nh * 0.4, ax - nw / 2, ay - nh);
            g.closePath();
          };
          Paint.litShade(g, nestTrace, ax - nw * 0.2, NEST_LIT, NEST_SHADE);

          const nt = 3 + Math.floor(hh(b, 0, 26) * 3);
          g.fillStyle = NEST_LIT;
          for (let t = 0; t < nt; t++) {
            const bx = ax - nw / 2 + nw * hh(b, t, 27);
            const by = ay - nh;
            const a = -Math.PI / 2 + (hh(b, t, 28) - 0.5) * 2.2;
            const len = nw * (0.35 + 0.4 * hh(b, t, 29));
            const tx = bx + Math.cos(a) * len;
            const ty = by + Math.sin(a) * len;
            const nx = -Math.sin(a), ny = Math.cos(a);
            g.beginPath();
            g.moveTo(bx - nx * 0.8, by - ny * 0.8);
            g.lineTo(bx + nx * 0.8, by + ny * 0.8);
            g.lineTo(tx, ty);
            g.closePath();
            g.fill();
          }
        }

        const ne = 1 + (hh(b, 0, 30) < 0.4 ? 1 : 0);
        for (let e = 0; e < ne; e++) {
          const s = e === 0 ? -1 : 1;
          const ex = xb + s * (wt * 1.6 + (0.004 + 0.01 * hh(b, e, 31)) * H);
          const ey = yt;
          const ew = (0.006 + 0.005 * hh(b, e, 32)) * H;
          const eh = ew * 1.3;
          const eaveTrace = () => {
            g.beginPath();
            g.moveTo(ex - ew / 2, ey - 1);
            g.lineTo(ex + ew / 2, ey - 1);
            g.quadraticCurveTo(ex + ew * 0.6, ey + eh * 0.7, ex, ey + eh);
            g.quadraticCurveTo(ex - ew * 0.6, ey + eh * 0.7, ex - ew / 2, ey - 1);
            g.closePath();
          };
          Paint.litShade(g, eaveTrace, ex - ew * 0.2, NEST_LIT, NEST_SHADE);

          g.globalCompositeOperation = "destination-out";
          g.fillStyle = "#000";
          g.beginPath();
          g.ellipse(ex + s * ew * 0.15, ey + eh * 0.55, ew * 0.2, ew * 0.16, 0, 0, Math.PI * 2);
          g.fill();
          g.globalCompositeOperation = "source-over";
        }
      }
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

    // deck: thin iron slab, lit top face, dark red rail
    g.fillStyle = SLAB;
    g.fillRect(x0, deckY, x1 - x0, slab);
    g.fillStyle = DECK_TOP;
    g.fillRect(x0, deckY - 0.012 * H, x1 - x0, 0.012 * H);
    g.fillStyle = DECK_HI;
    g.fillRect(x0, deckY - 0.012 * H, x1 - x0, 0.003 * H);
    g.fillStyle = "#6e1a1a";
    g.fillRect(x0, Math.round(railY(H)), x1 - x0, 2);
    if (gapSig) {
      const ry = Math.round(railY(H));
      for (let i = 0; i < RAIL_GAPS.length; i++) {
        if (!railOpen(i)) continue;
        const R = RAIL_GAPS[i];
        if (sx(R.u1 + R.str) < x0 - 2 || sx(R.u0 - R.stl) > x1 + 2) continue;
        clearGap(g, R, ry);
      }
    }

    // deck cities: little towers standing on the rail
    for (let b = first; b < last; b++) {
      if (!(hh(b, 0, 40) < 0.55 && arrived("trade", b, 41))) continue;
      const cu = (b + 0.15 + 0.7 * hh(b, 0, 42)) * SPAN_BAY_U;
      const cx = sx(cu);
      const cwid = (0.01 + 0.02 * hh(b, 0, 43)) * H;
      const n = 5 + Math.floor(hh(b, 0, 44) * 8);
      const yb = railY(H);
      for (let i = 0; i < n; i++) {
        const x = cx + (hh(b, i, 45) * 2 - 1) * cwid;
        const w = Math.max(1, (0.0015 + 0.003 * hh(b, i, 46)) * H);
        const ht = (0.004 + 0.016 * hh(b, i, 47) * hh(b, i, 47)) * H;
        const lean = (hh(b, i, 48) - 0.5) * w * 1.0;
        const trace = () => {
          g.beginPath();
          g.moveTo(x - w / 2, yb + 1);
          g.lineTo(x + w / 2, yb + 1);
          g.lineTo(x + w / 2 + lean, yb - ht);
          if (hh(b, i, 49) > 0.5) g.lineTo(x + lean, yb - ht - w * 1.6);
          g.lineTo(x - w / 2 + lean, yb - ht);
          g.closePath();
        };
        if (w >= 3) {
          Paint.litShade(g, trace, x - w * 0.2, CITY_LIT, CITY_SHADE);
        } else {
          trace();
          g.fillStyle = CITY_LIT;
          g.fill();
        }
        if (ht > 0.008 * H) {
          const m = Math.floor(hh(b, i, 50) * 3);
          g.fillStyle = WIN;
          for (let j = 0; j < m; j++) {
            const f = 0.2 + 0.6 * hh(b, i, 51 + j);
            g.fillRect(Math.round(x + lean * f - 0.5), Math.round(yb - ht * f), 1, 1);
          }
        }
      }
    }

    g.restore();

    // fog mask: legs and both ends dissolve into the void
    g.globalCompositeOperation = "destination-out";
    const vlen = H * 0.98 - yt;
    const vgrad = g.createLinearGradient(0, yt, 0, H * 0.98);
    vgrad.addColorStop(0, "rgba(0,0,0,0)");
    vgrad.addColorStop(clamp(0.14 * H / vlen, 0, 1), "rgba(0,0,0,0.30)");
    vgrad.addColorStop(clamp(0.30 * H / vlen, 0, 1), "rgba(0,0,0,0.80)");
    vgrad.addColorStop(1, "rgba(0,0,0,1)");
    g.fillStyle = vgrad;
    if (by1 - Math.max(yt, by0) > 0) g.fillRect(bx0, Math.max(yt, by0), bx1 - bx0, by1 - Math.max(yt, by0));

    const len = x1 - x0;
    const hgrad = g.createLinearGradient(x0, 0, x1, 0);
    const fa = Math.min(0.30 * W / len, 0.5);
    const fb = Math.min(0.22 * W / len, 0.5);
    if (fa >= 1 - fb) {
      hgrad.addColorStop(0, "rgba(0,0,0,1)");
      hgrad.addColorStop(0.5, "rgba(0,0,0,0)");
      hgrad.addColorStop(1, "rgba(0,0,0,1)");
      g.fillStyle = hgrad;
      g.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
    } else {
      hgrad.addColorStop(0, "rgba(0,0,0,1)");
      hgrad.addColorStop(fa, "rgba(0,0,0,0)");
      hgrad.addColorStop(1 - fb, "rgba(0,0,0,0)");
      hgrad.addColorStop(1, "rgba(0,0,0,1)");
      g.fillStyle = hgrad;
      const la = bx0, lb = Math.min(bx1, x0 + fa * len);
      if (lb > la) g.fillRect(la, by0, lb - la, by1 - by0);
      const ra = Math.max(bx0, x1 - fb * len), rb = bx1;
      if (rb > ra) g.fillRect(ra, by0, rb - ra, by1 - by0);
    }
    g.globalCompositeOperation = "source-over";

    // composite onto the real canvas
    ctx.save();
    ctx.globalAlpha = clamp(grow * 3, 0, 1) * 0.9;
    ctx.drawImage(spanCv, dx0, dy0, dx1 - dx0, dy1 - dy0, bx0, by0, bx1 - bx0, by1 - by0);
    ctx.restore();
  }

  window.GenVoid = Object.assign(window.GenVoid || {}, {
    fillBg, drawMotes, drawChaos, drawPoint, drawSpan, SPAN_BAY_U,
  });
})();
