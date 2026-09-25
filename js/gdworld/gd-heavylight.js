/* gd-heavylight.js — HeavyLight's field: stone stairs and hard light.
   Stepped cave masses (floor and ceiling) at three depths, their amplitude
   rising with the field so the cave closes in around the planet; rooms cut
   into the rock; timed lamps on a 7.2 s cycle and slabs of solid light that
   exist only while their lamp is on; speckle drifting down; the wisps that
   carry the clues, one in five red. Registers GdWorld.P.heavylight.
   Quiet so the marks read: edges and lamps dimmed, lights thin round the
   marks (G.clearBox). */
(function () {
  const G = window.GdWorld; if (!G) return;
  const { F, sx, each, scatter, dens, GAMES } = G;
  const { mix, smooth, ridge, TAU } = Util;
  const I = 2;
  const px = n => n * F.k;
  const clearBox = (x, y, hw, hh) => G.clearBox ? G.clearBox(x, y, hw, hh) : 1;
  const C = {
    rockFar: "#0f2a3d", rockMid: "#0b2233", rockNear: "#08192a", edgeFar: "#4d7f9f", edgeMid: "#7fb0d0", edgeNear: "#8cc0dc", dot: "#143f5e",
    room: "#04101a", roomGlow: "110,160,240", lamp: "#dff3ff", lampGlow: "170,215,240", slab: "120,170,245", slabEdge: "200,230,255",
    speck: "170,215,240", wisp: "223,243,255", wispRed: "255,106,90", fog: "60,110,150",
  };
  const LAYERS = {
    far:  { par: 0.2,  seed: 31, chunk: 48, ampMin: 40, ampMax: 300, rock: C.rockFar,  edge: C.edgeFar,  ceiling: true,  clear: false },
    mid:  { par: 0.42, seed: 32, chunk: 40, ampMin: 30, ampMax: 210, rock: C.rockMid,  edge: C.edgeMid,  ceiling: true,  clear: false },
    near: { par: 0.7,  seed: 34, chunk: 34, ampMin: 20, ampMax: 120, rock: C.rockNear, edge: C.edgeNear, ceiling: false, clear: true, slab: true },
  };
  const ROOMS_FAR = scatter(41, I, 70, 0.2, 0, 1);
  const ROOMS_MID = scatter(42, I, 90, 0.42, 0, 1);
  const LAMPS = scatter(33, I, 80, 0.42, 0, 1);
  const SPECKS = scatter(35, I, 420, 0.7, 0.10, 0.64);
  const WISPS = scatter(36, I, 22, 0.7, 0.14, 0.60);
  const patterns = new Map();   // dot pattern canvases by pixel size

  // world units per chunk at this layer's parallax
  function chunkUnits(L) {
    const cw = px(L.chunk);
    return { cw, CU: cw / (L.par * F.sc) };
  }

  // the floor's step height (px) at chunk j, before dens/clear
  function floorH(L, j) {
    const q = Math.round(ridge(j * 0.37, L.seed) * 6) / 6;
    return px(mix(L.ampMin, L.ampMax, q));
  }
  // the ceiling's step height (px) at chunk j, before dens/clear
  function ceilH(L, j) {
    const q = Math.round(ridge(j * 0.31 + 50, L.seed + 7) * 6) / 6;
    return px(mix(L.ampMin, L.ampMax, q) * 0.8);
  }

  // dens × clearing at chunk j, 0..1
  function fieldAt(L, j) {
    const { CU } = chunkUnits(L);
    const xw = (j + 0.5) * CU;
    let d = dens(I, xw);
    if (L.clear) {
      const pd = Math.abs(sx(GAMES[I].x, 0.7) - sx(xw, L.par));
      d *= smooth((pd - px(520)) / px(260));
    }
    return d;
  }

  function dotPattern(size) {
    if (patterns.has(size)) return patterns.get(size);
    const c = document.createElement("canvas");
    c.width = size; c.height = size;
    const pc = c.getContext("2d");
    pc.fillStyle = C.dot;
    pc.fillRect(0, 0, 1.5, 1.5);
    pc.fillRect(size / 2, size / 2, 1.5, 1.5);
    const pat = F.ctx.createPattern(c, "repeat");
    patterns.set(size, pat);
    return pat;
  }

  // paints the layer's floor (and ceiling) steps with lit edges and dots
  function mass(L) {
    const { ctx, W, H, camX, gy, sc } = F;
    const { cw, CU } = chunkUnits(L);
    const j0 = Math.floor((camX - (W / 2 + cw) / (L.par * sc)) / CU);
    const count = Math.ceil(W / cw) + 3;

    // chunk profile, built once and shared by every pass below
    const ch = [];
    let maxF = 0, maxD = 0;
    for (let n = 0; n < count; n++) {
      const j = j0 + n, f = fieldAt(L, j), d = dens(I, (j + 0.5) * CU);
      const s = sx(j * CU, L.par), top = gy - floorH(L, j) * f;
      const bot = L.ceiling ? 0.09 * H + ceilH(L, j) * f : 0;
      ch.push({ s, top, bot, f, d });
      if (f > maxF) maxF = f;
      if (d > maxD) maxD = d;
    }

    ctx.fillStyle = L.rock;
    ctx.beginPath();
    for (let n = 0; n < count; n++) {
      const c = ch[n];
      if (L.slab) {
        if (c.d >= 0.01) ctx.rect(c.s, c.top, cw + 1, H - c.top);
      } else if (c.f >= 0.01) {
        ctx.rect(c.s, c.top, cw + 1, gy + px(40) - c.top);
      }
      if (L.ceiling && c.f >= 0.01) ctx.rect(c.s, 0, cw + 1, c.bot);
    }
    ctx.fill();
    if (maxF < 0.03 && !(L.slab && maxD >= 0.01)) return;

    // dot texture, scrolled with the layer; only a band along the lit edges
    const size = Math.max(6, Math.round(px(12)));
    const pat = dotPattern(size);
    const off = ((-camX * L.par * sc) % size + size) % size;
    ctx.save();
    ctx.translate(off, 0);
    ctx.beginPath();
    for (let n = 0; n < count; n++) {
      const c = ch[n];
      if (c.f < 0.01) continue;
      const s = c.s - off;
      const bandH = L.slab ? Math.min(px(110), H - c.top) : Math.min(px(110), gy + px(40) - c.top);
      if (bandH > 0) ctx.rect(s, c.top, cw + 1, bandH);
      if (L.ceiling) ctx.rect(s, Math.max(0, c.bot - px(110)), cw + 1, Math.min(px(110), c.bot));
    }
    ctx.globalAlpha = 0.6 * 0.5;
    ctx.fillStyle = pat;
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;

    // lit edges: the step surfaces and the risers between them
    ctx.fillStyle = L.edge;
    ctx.globalAlpha = 0.5;
    for (let n = 0; n < count; n++) {
      const c = ch[n];
      if (c.f < 0.01) continue;
      ctx.fillRect(c.s, c.top, cw + 1, px(3));
      const prevTop = n > 0 ? ch[n - 1].top : c.top;
      if (prevTop > c.top) ctx.fillRect(c.s, c.top, px(2), prevTop - c.top);
      if (L.ceiling) ctx.fillRect(c.s, c.bot - px(3), cw + 1, px(3));
    }

    ctx.globalAlpha = 1; ctx.lineWidth = 1;
  }

  function rooms(L, list) {
    const { ctx, gy, H } = F;
    const { CU } = chunkUnits(L);
    // the shared chamber: a dark cutout, an optional glow, a lamp dot at its top centre
    const paintRoom = (s, e, topY) => {
      const x0 = s - px(23);
      const cb = L.par >= 0.4 ? clearBox(s, topY + px(19), px(23), px(19)) : 1;
      if (cb < 0.03) return;
      ctx.fillStyle = C.room;
      ctx.fillRect(x0, topY, px(46), px(38));
      if (e.r3 < 0.6) {
        ctx.save();
        ctx.beginPath(); ctx.rect(x0, topY, px(46), px(38)); ctx.clip();
        const cx = s, cy = topY + px(19);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, px(40));
        g.addColorStop(0, `rgba(${C.roomGlow},0.22)`);
        g.addColorStop(1, `rgba(${C.roomGlow},0)`);
        ctx.fillStyle = g;
        ctx.globalAlpha = cb;
        ctx.fillRect(x0, topY, px(46), px(38));
        ctx.globalAlpha = 1;
        ctx.restore();
      }
      ctx.fillStyle = C.lamp;
      ctx.fillRect(s - px(1.5), topY - px(1.5), px(3), px(3));
    };
    each(list, px(60), (e, s) => {
      const j = Math.floor(e.x / CU);
      const hf = floorH(L, j) * fieldAt(L, j);
      if (hf > px(70)) {
        const top = gy - hf;
        paintRoom(s, e, top + px(20));
      }
      if (L.ceiling && e.r4 < 0.5) {
        const hc = ceilH(L, j) * fieldAt(L, j);
        if (hc > px(60)) {
          const bottom = 0.09 * H + hc - px(16);
          paintRoom(s, e, bottom - px(38));
        }
      }
    });
    ctx.globalAlpha = 1; ctx.lineWidth = 1;
  }

  function wash(w) {
    const { ctx, W, H } = F;
    const cx = W / 2, cy = 0.45 * H;
    const g1 = ctx.createRadialGradient(cx, cy, 0.3 * H, cx, cy, 0.8 * Math.max(W, H));
    g1.addColorStop(0, "rgba(2,8,14,0)");
    g1.addColorStop(1, `rgba(2,8,14,${0.5 * w})`);
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, H);

    const g2 = ctx.createLinearGradient(0, 0.5 * H, 0, H);
    g2.addColorStop(0, `rgba(${C.fog},0)`);
    g2.addColorStop(0.32, `rgba(${C.fog},${0.10 * w})`);
    g2.addColorStop(1, `rgba(${C.fog},${0.04 * w})`);
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0.5 * H, W, 0.5 * H);

    ctx.globalAlpha = 1; ctx.lineWidth = 1;
  }

  function far(w) { mass(LAYERS.far); rooms(LAYERS.far, ROOMS_FAR); }
  function mid(w) { mass(LAYERS.mid); rooms(LAYERS.mid, ROOMS_MID); lamps(); }

  function lamps() {
    const { ctx, gy, t, red } = F;
    const L = LAYERS.mid;
    const { CU } = chunkUnits(L);
    each(LAMPS, px(260), (e, s) => {
      const j = Math.floor(e.x / CU);
      const f = fieldAt(L, j);
      if (f < 0.05) return;
      const top = gy - floorH(L, j) * f;

      ctx.fillStyle = L.edge;
      ctx.fillRect(s - px(1), top - px(12), px(2), px(12));
      ctx.fillStyle = C.lamp;
      ctx.fillRect(s - px(3.5), (top - px(15)) - px(3), px(7), px(6));

      const on = red ? e.r3 < 0.5 : ((t + e.r2 * 7.2) % 7.2) < 3.6;
      if (on) {
        const cx = s, cy = top - px(15);
        const glowCb = clearBox(cx, cy, px(26), px(26));
        if (glowCb >= 0.03) {
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, px(26));
          g.addColorStop(0, `rgba(${C.lampGlow},0.35)`);
          g.addColorStop(1, `rgba(${C.lampGlow},0)`);
          ctx.fillStyle = g;
          ctx.globalAlpha = 0.5 * glowCb;
          ctx.fillRect(cx - px(26), cy - px(26), px(52), px(52));
          ctx.globalAlpha = 1;
        }

        if (e.r4 < 0.45 && f >= 0.03) {
          const sx0 = s + px(10), sy0 = top - px(46);
          const sw = px(120 + 100 * e.r1), sh = px(10);
          const slabCb = clearBox(sx0 + sw / 2, sy0 + sh / 2, sw / 2, sh / 2);
          if (slabCb >= 0.03) {
            ctx.globalAlpha = 0.6 * slabCb;
            ctx.fillStyle = `rgba(${C.slab},0.22)`;
            ctx.fillRect(sx0, sy0, sw, sh);
            ctx.fillStyle = `rgba(${C.slabEdge},0.45)`;
            ctx.fillRect(sx0, sy0, sw, 1);
            ctx.fillRect(sx0, sy0 + sh - 1, sw, 1);
            ctx.globalAlpha = 1;
          }
        }
      }
    });
    ctx.globalAlpha = 1; ctx.lineWidth = 1;
  }

  function near(w) { mass(LAYERS.near); specks(); wisps(); }

  function specks() {
    const { ctx, H, t, red } = F;
    each(SPECKS, px(4), (e, s) => {
      const y = 0.10 * H + ((e.fy * H - 0.10 * H + (red ? 0 : t * px(6) * (0.5 + e.r3))) % (0.54 * H));
      const hw = px(1 + e.r1) / 2;
      const cb = clearBox(s + hw, y + hw, hw, hw);
      if (cb < 0.03) return;
      ctx.fillStyle = `rgba(${C.speck},${0.15 + 0.3 * e.r2})`;
      ctx.globalAlpha = cb;
      ctx.fillRect(s, y, px(1 + e.r1), px(1 + e.r1));
    });
    ctx.globalAlpha = 1; ctx.lineWidth = 1;
  }

  function wisps() {
    const { ctx, H, t, red } = F;
    each(WISPS, px(20), (e, s) => {
      const y = e.fy * H + (red ? 0 : Math.sin(t * 0.8 + e.r4 * TAU) * px(4));
      const a = red ? 0.8 * 0.6 : 0.5 + 0.5 * Math.sin(t * 1.3 + e.r1 * TAU);
      const col = e.r2 < 0.2 ? C.wispRed : C.wisp;
      const cb = clearBox(s, y, px(14), px(14));
      if (cb < 0.03) return;
      ctx.globalAlpha = cb;

      const g = ctx.createRadialGradient(s, y, 0, s, y, px(14));
      g.addColorStop(0, `rgba(${col},${0.5 * a})`);
      g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(s - px(14), y - px(14), px(28), px(28));

      ctx.fillStyle = `rgba(${col},${0.9 * a})`;
      ctx.beginPath();
      ctx.arc(s, y, px(2.2), 0, TAU);
      ctx.fill();
    });
    ctx.globalAlpha = 1; ctx.lineWidth = 1;
  }

  function grade(w) {
    const { ctx, W, H } = F;
    ctx.fillStyle = `rgba(60,120,180,${0.05 * w})`;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1; ctx.lineWidth = 1;
  }

  G.P.heavylight = { base: [5, 14, 19], wash, layers: [{ par: 0.2, paint: far }, { par: 0.42, paint: mid }, { par: 0.7, paint: near }], grade };
})();
