/* side.js — the two instruments beside the bridge log: FUEL on the left
   (#bridge-fuel), RES on the right (#bridge-res, blank until it is built).
   Instruments.draw hands us the readings on its own paint cadence, so the
   bridge pause stops us too. When the gap each side of the log is too
   narrow, the canvases hide and the NAV bank shows the same fuel painter
   as a tile (key "phase", so its alarm lamp keeps working) via tile(). */
window.HudSide = (function () {
  const W_MIN = 240, W_MAX = 300, GAP = 20, BANK_GAP = 6, MON_GAP = 14, NEED = W_MIN + GAP + BANK_GAP, H_MIN = 124;
  const { approach, clamp } = Util;
  const HALO = "rgba(4,7,8,0.85)";
  let LAMP, READ, COLD, DIM, BAD, WARN, GLINT, mono, palKey = "";
  /* colour strings per paint come from here: alpha in hundredths, so the sine-driven ones stay a small set */
  const colCache = new Map();
  const rgba = (c, a) => {
    let m = colCache.get(c);
    if (!m) colCache.set(c, m = new Map());
    const k = Math.round(a * 100);
    let s = m.get(k);
    if (s === undefined) m.set(k, s = `rgba(${c},${k / 100})`);
    return s;
  };
  const readPal = F => {
    ({ LAMP, READ, COLD, DIM, BAD, WARN, GLINT } = F);
    palKey = [LAMP, READ, COLD, DIM, BAD, WARN, GLINT].join("|");
    colCache.clear();
  };
  window.Instruments.registerTiles(function (F) {
    mono = F.mono;
    readPal(F);
    F.onPalette(() => readPal(F));
    return {};
  });
  let alarmCol = null, alarmBl = 0;

  let hero, logEl, termEl, termCv, sysCv, fuelCv, resCv, fctx, rctx;
  let showSide = false, fallback = null, cvW = 0, cvFW = 0, cvH = 0, cvDpr = 0, t = 0;
  let fuelNeedle = 1, thrustNeedle = 0, cruiseNeedle = 0, speedNeedle = 0, barT = 0, barB = 0;
  const NB = 7;
  const bx = new Float32Array(NB), by = new Float32Array(NB), bs = new Float32Array(NB);
  /* a fixed spread, not Math.random: the world's seeded stream must not shift because the HUD loaded */
  for (let i = 0; i < NB; i++) { bx[i] = (i * 0.618) % 1; by[i] = (i * 0.382 + 0.1) % 1; bs[i] = (i * 0.754 + 0.3) % 1; }
  const sideG = { top: 0, h: 0, col: null, grad: null, L: true };
  const tileG = { top: 0, h: 0, col: null, grad: null };

  /* the owner's curve in box fractions (fuel; resonance is its mirror): steep down the left, bending to nearly flat along the floor.
     Content sits left of and under it. curveY gives its y at an x, from a Catmull-Rom smoothing sampled once. */
  const CURVE = [[.09, .03], [.13, .27], [.20, .52], [.31, .71], [.53, .75], [.96, .77]];
  const curveLut = [];
  for (let i = 0; i < CURVE.length - 1; i++) {
    const p0 = CURVE[Math.max(0, i - 1)], p1 = CURVE[i], p2 = CURVE[i + 1], p3 = CURVE[Math.min(CURVE.length - 1, i + 2)];
    for (let k = 0; k < 8; k++) {
      const q = k / 8, q2 = q * q, q3 = q2 * q;
      const f = (a, b, c, d) => 0.5 * (2 * b + (c - a) * q + (2 * a - 5 * b + 4 * c - d) * q2 + (3 * b - a - 3 * c + d) * q3);
      curveLut.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  curveLut.push(CURVE[CURVE.length - 1]);
  function curveY(fx, mirror) {
    const x = mirror ? 1 - fx : fx;
    if (x <= curveLut[0][0]) return curveLut[0][1];
    for (let i = 1; i < curveLut.length; i++) {
      const a = curveLut[i - 1], b = curveLut[i];
      if (x <= b[0]) return a[1] + (b[1] - a[1]) * (x - a[0]) / Math.max(1e-6, b[0] - a[0]);
    }
    return curveLut[curveLut.length - 1][1];
  }

  function layout() {
    const hr = hero.getBoundingClientRect(), lr = logEl.getBoundingClientRect();
    const tr = termCv.getBoundingClientRect(), sr = sysCv.getBoundingClientRect();
    const rightEdge = sr.width > 0 ? sr.left : hr.right;
    const room = Math.min(lr.left - tr.right, rightEdge - lr.right);
    const fits = lr.height > 0 && room >= NEED;
    showSide = fits;
    if (fallback !== !fits) {
      fallback = !fits;
      window.Instruments.setDriveTile(fallback);
    }
    const disp = fits ? "block" : "none";
    fuelCv.style.display = resCv.style.display = disp;
    if (!fits) return;
    /* the log's height comes and goes, so the size follows the bank: both canvases are as tall as it, as wide as the gap allows */
    const br = termEl.getBoundingClientRect();
    const h = Math.max(H_MIN, Math.round(br.height)), dpr = Math.min(devicePixelRatio || 1, 2);
    const W = Math.round(clamp(room - GAP - BANK_GAP, W_MIN, W_MAX)), WF = FUEL_CW;
    const bottom = Math.round(hr.bottom - br.bottom);
    /* both sit against their monitor: fuel's left edge a small gap right of the left bank, the resonance axis (3 px in from the canvas's right edge) the same gap left of the right bank */
    fuelCv.style.left = Math.round(tr.right - hr.left + MON_GAP) + "px";
    resCv.style.left = Math.round(rightEdge - hr.left - MON_GAP - W + 3) + "px";
    fuelCv.style.bottom = resCv.style.bottom = bottom + "px";
    fuelCv.style.width = WF + "px"; resCv.style.width = W + "px";
    fuelCv.style.height = resCv.style.height = h + "px";
    /* the thrust column runs from the monitors' top to their baseline (the canvas's bottom edge sits on the bank's) */
    const fr = fuelCv.getBoundingClientRect();
    barT = Math.max(0, Math.round(tr.top - fr.top)); barB = Math.round(tr.bottom - fr.top) - 1;
    if (W !== cvW || WF !== cvFW || h !== cvH || dpr !== cvDpr) {
      cvW = W; cvFW = WF; cvH = h; cvDpr = dpr;
      for (const [cv, c, cw] of [[fuelCv, fctx, WF], [resCv, rctx, W]]) {
        cv.width = Math.round(cw * dpr); cv.height = Math.round(h * dpr);
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    }
  }

  function init() {
    logEl = document.getElementById("bridge-log");
    termCv = document.getElementById("binst");
    termEl = document.getElementById("bridge-term");
    sysCv = document.getElementById("binst-sys");
    if (!logEl || !termCv || !sysCv || !termEl) return;
    hero = logEl.parentNode;
    const mk = id => {
      const cv = document.createElement("canvas");
      cv.id = id; cv.className = "bridge-hud bridge-side";
      cv.setAttribute("aria-hidden", "true");
      hero.appendChild(cv);
      return cv;
    };
    fuelCv = mk("bridge-fuel"); resCv = mk("bridge-res");
    fctx = fuelCv.getContext("2d"); rctx = resCv.getContext("2d");
    layout();
    addEventListener("resize", layout);
    if ("ResizeObserver" in window) {
      const ro = new ResizeObserver(layout);
      ro.observe(logEl); ro.observe(termCv); ro.observe(sysCv);
    }
  }

  /* advance the readings and the bubbles; runs every paint, shown or not */
  function step(r, dt) {
    const s = r && r.ship;
    t += dt;
    fuelNeedle = approach(fuelNeedle, s ? s.fuelN : 1, 8, dt);
    thrustNeedle = approach(thrustNeedle, s ? s.thrust : 0, 10, dt);
    cruiseNeedle = approach(cruiseNeedle, s ? s.holdT : 0, 6, dt);
    speedNeedle = approach(speedNeedle, s ? s.speedN : 0, 8, dt);
    const burning = s && s.burning;
    for (let i = 0; i < NB; i++) {
      if (!burning) continue;
      by[i] += dt * (0.3 + 0.5 * bs[i]) * (0.5 + thrustNeedle);
      if (by[i] > fuelNeedle) { by[i] = 0; bx[i] = Math.random(); bs[i] = Math.random(); }
    }
  }



  /* the thin dark outline every HUD text gets so it reads over the world; callers set fillStyle first and reset strokeStyle / lineWidth after */
  function txt(c, s, x, y) {
    if (c.haloed) { c.fillText(s, x, y); return; }
    c.lineJoin = "round"; c.lineWidth = 2.5; c.strokeStyle = HALO;
    c.strokeText(s, x, y);
    c.fillText(s, x, y);
  }

  /* the part of a painter that never changes lives in an offscreen canvas, rebuilt when the size or the palette changes */
  function layer(g, c, w, h, key, build) {
    const sc = c.getTransform().a || 1;
    if (g.lw === w && g.lh === h && g.lsc === sc && g.lpal === palKey && g.lkey === key && g.key) return;
    g.lw = w; g.lh = h; g.lsc = sc; g.lpal = palKey; g.lkey = key; g.key = true;
    if (!g.off) g.off = document.createElement("canvas");
    g.off.width = Math.max(1, Math.round(w * sc)); g.off.height = Math.max(1, Math.round(h * sc));
    const o = g.off.getContext("2d");
    o.setTransform(sc, 0, 0, sc, 0, 0);
    build(o, g);
  }

  /* the fuel instrument in a w x h box: a line-drawn tank (a ladder of rows that light from the bottom, a live
     surface), thrust ring, burn / power numerals, cruise bar, state word. Nothing is filled. */
  const NR = 16;
  let fPct = -1, fPctS = "", tPct = -1, tPctS = "", cPct = -1, cPctS = "", cPctL = -1, cPctLS = "", bKey = "", bS = "", pKey = -1, pS = "";
  /* the same faint outline as the fuel bar's; the lit slits sit inside it */
  function thrustStatic(o, g) {
    const { bx0, bt, bb, lb, fx } = g;
    o.lineWidth = 1;
    o.strokeStyle = `rgba(${DIM},0.45)`;
    o.strokeRect(bx0 + 0.5, bt + 0.5, THR_W - 1, bb - bt - 1);
    /* one-glyph marks at the foot of the pair */
    o.font = mono(7);
    o.textAlign = "center"; o.textBaseline = "alphabetic";
    o.fillStyle = rgba(READ, 0.6);
    txt(o, "T", bx0 + THR_W / 2, lb - 1);
    txt(o, "F", fx + FUEL_W / 2, lb - 1);
  }

  /* lit from the bottom by thrust or speed in the fuel's gold: thin slits with 1 px gaps, so the column reads close to a solid fill.
     At max only the top few slits brighten toward GLINT and shimmer. Readouts stack at the foot, right of the fuel bar, under the curve:
     the thrust % only at max, the PWR "x" when it is not x1.0 or at max. */
  let tPow = -1, tPowS = "";
  function thrustLive(c, g, s) {
    const { bx0, bb, segH, t8, tx, nseg: NSEG } = g;
    const lvl = clamp(Math.max(thrustNeedle, speedNeedle), 0, 1);
    const max = speedNeedle > 0.97;
    const n = lvl * NSEG, full = Math.floor(n), frac = n - full;
    const hot = clamp((speedNeedle - 0.9) / 0.1, 0, 1);
    for (let i = 0; i < NSEG && i <= full; i++) {
      const a = i < full ? 1 : frac;
      if (a < 0.04) break;
      const y = bb - 1 - (i + 1) * segH, hh = Math.max(1.5, segH - 1);
      c.fillStyle = rgba(LAMP, 0.9 * a);
      c.fillRect(bx0 + 1, y, THR_W - 2, hh);
      const d = NSEG - 1 - i;
      if (hot > 0 && d < 4) {
        const k = hot * (1 - d / 4) * a * (0.8 + 0.2 * Math.sin(t * 17 + i * 1.7));
        c.fillStyle = rgba(GLINT, k);
        c.fillRect(bx0 + 1, y, THR_W - 2, hh);
      }
    }
    const ac = s && s.power ? s.power.accel : 1, pk = Math.round(ac * 10);
    if (pk !== tPow) { tPow = pk; tPowS = "×" + ac.toFixed(1); }
    c.font = mono(t8);
    c.textBaseline = "alphabetic"; c.textAlign = "left";
    const row = t8 + 1;
    if (pk !== 10 || max) { c.fillStyle = rgba(READ, 0.9); txt(c, tPowS, tx, bb - 1 - 2 * row); }
    if (max) { c.fillStyle = rgba(GLINT, 0.95); txt(c, Math.round(Math.max(thrustNeedle, speedNeedle) * 100) + "%", tx, bb - 1 - row); }
  }

  function fuelStatic(o, g) {
    const w = g.w, h = g.h, u = g.u, px = g.px, pad = g.pad;
    const { tx, tankTop, tankBot, tankW, tankH, rr, zcx, zcy, R, t8, yT, yL, lx, rx, barY } = g;
    g.vessel = new Path2D();
    const v = g.vessel;
    v.moveTo(tx, tankTop);
    v.lineTo(tx, tankBot - rr);
    v.arcTo(tx, tankBot, tx + rr, tankBot, rr);
    v.lineTo(tx + tankW - rr, tankBot);
    v.arcTo(tx + tankW, tankBot, tx + tankW, tankBot - rr, rr);
    v.lineTo(tx + tankW, tankTop);
    o.lineWidth = 1;
    o.strokeStyle = `rgba(${LAMP},0.45)`;
    o.stroke(v);
    // unlit ladder rows and the quarter ticks
    o.beginPath();
    for (let i = 0; i < NR; i++) {
      const y = tankBot - 3 - (tankH - 6) * (i + 0.5) / NR;
      o.moveTo(tx + 5, y); o.lineTo(tx + tankW - 5, y);
    }
    o.strokeStyle = `rgba(${DIM},0.12)`;
    o.stroke();
    o.beginPath();
    for (let i = 1; i < 4; i++) {
      const y = tankTop + tankH * i / 4;
      o.moveTo(tx + tankW - 6 * u, y); o.lineTo(tx + tankW, y);
    }
    o.strokeStyle = `rgba(${DIM},0.5)`;
    o.stroke();
    // thrust track
    o.lineCap = "round";
    o.lineWidth = Math.max(3, 5 * u);
    o.strokeStyle = `rgba(${DIM},0.3)`;
    o.beginPath(); o.arc(zcx, zcy, R, 0.75 * Math.PI, 2.25 * Math.PI); o.stroke();
    o.lineCap = "butt";
    o.textBaseline = "alphabetic";
    o.textAlign = "center";
    o.font = mono(t8);
    o.fillStyle = `rgba(${DIM},1)`;
    txt(o, "THRUST", zcx, yT);
    o.fillStyle = `rgba(${DIM},0.95)`;
    txt(o, "BURN", lx, yL);
    txt(o, "PWR", rx, yL);
    // cruise label and track
    o.font = mono(px(7));
    o.textAlign = "left";
    o.fillStyle = `rgba(${DIM},1)`;
    txt(o, "CRUISE BUILD", pad, barY - 6 * u - 2);
    o.lineWidth = 3;
    o.strokeStyle = `rgba(${DIM},0.3)`;
    o.beginPath(); o.moveTo(pad, barY); o.lineTo(w - pad, barY); o.stroke();
  }

  /* the thrust heat column: THR_W wide at the left end, from the monitors' top (barT) to their baseline (barB); the slot right of it is the fuel's */
  const LBL_H = 8, THR_W = 9, FUEL_W = Math.ceil(THR_W / 2), FUEL_GAP = 6, FUEL_CW = 58;
  function fuelGeomL(g, w, h) {
    const u = clamp(Math.min(h / 220, w / 230), 0.55, 1.25);
    const px = (n, min) => Math.max(min || 7, Math.round(n * u));
    const bx0 = 3, bt = barT, lb = barB > bt + 20 ? barB : h - 2;
    const bb = lb - LBL_H;   /* the bars end a label's height above the baseline; the T / F marks sit in that strip */
    const nseg = Math.max(8, Math.round((bb - bt - 2) / 3.5));   /* slits about 2.5 px tall with a 1 px gap */
    const segH = (bb - bt - 2) / nseg;
    const fx = bx0 + THR_W + FUEL_GAP;
    Object.assign(g, { w, h, u, px, bx0, bt, bb, lb, nseg, segH, fx, tx: fx + FUEL_W + 4, t8: px(8, 8), gb: barT + "/" + barB });
  }

  /* the calm fuel bar right of the thrust column: one smooth fill, WARN / BAD when low, a notch where the fuel will be in 10 s at this burn
     (only while burning); a small % only when low */
  let lPct = -1, lPctS = "";
  function fuelBar(c, g, s, low, col) {
    const { fx, bt, bb, t8, tx } = g;
    const infinite = s && s.infinite, hh = bb - bt;
    c.lineWidth = 1;
    c.strokeStyle = `rgba(${DIM},0.3)`;
    c.strokeRect(fx + 0.5, bt + 0.5, FUEL_W - 1, hh - 1);
    const lvl = infinite ? 1 : clamp(fuelNeedle, 0, 1);
    c.fillStyle = rgba(col, low ? 1 : 0.55);
    c.fillRect(fx + 1, bb - (hh - 2) * lvl, FUEL_W - 2, (hh - 2) * lvl);
    if (s && s.drain > 0 && !infinite && s.fuelMax > 0) {
      const rate = s.drain;   /* the ship's real drain per second (Voidship.stats) */
      const y = Math.round(bb - (hh - 2) * clamp(fuelNeedle - rate * 10 / s.fuelMax, 0, 1)) + 0.5;
      c.strokeStyle = rgba(LAMP, 0.7);
      c.beginPath(); c.moveTo(fx + 1, y); c.lineTo(fx + FUEL_W - 1, y); c.stroke();
    }
    if (low) {
      const pi = Math.round(fuelNeedle * 100);
      if (pi !== lPct) { lPct = pi; lPctS = pi + "%"; }
      c.font = mono(t8);
      c.textBaseline = "alphabetic"; c.textAlign = "left";
      c.fillStyle = rgba(col, 1);
      txt(c, lPctS, tx, bb - 1);
    }
  }

  function fuelGeom(g, w, h) {
    if (g.L) return fuelGeomL(g, w, h);
    const u = clamp(Math.min(h / 220, w / 230), 0.55, 1.25);
    const px = (n, min) => Math.max(min || 7, Math.round(n * u));
    const pad = Math.round(16 * u), padY = Math.round(10 * u);
    const bigF = px(24, 12);
    const y1 = padY + bigF;
    const barY = h - padY - 3;
    const cruiseTop = barY - Math.round(6 * u) - 2 - px(7);
    const midTop = y1 + Math.round(8 * u);
    const tankBot = cruiseTop - 4;
    const tankH = Math.max(12, Math.min(190, tankBot - midTop));
    const tankTop = tankBot - tankH;
    const tankW = Math.min(76, Math.round(w * 0.26));
    const tx = pad + 2;
    const zl = tx + tankW + Math.round(14 * u), zr = w - pad;
    const zw = zr - zl, zcx = zl + zw / 2;
    const t8 = px(8, 8), v14 = px(14, 9);
    const R = Math.max(6, Math.min(zw * 0.36, (tankBot - tankTop - 3 - (2 * t8 + v14 + 12)) / 1.707));
    const zcy = tankTop + R + 3;
    const yT = zcy + Math.round(R * 0.707) + t8 + 2;
    const yL = yT + t8 + 6;
    Object.assign(g, {
      w, h, u, px, pad, bigF, y1, barY, tankTop, tankBot, tankH, tankW, tx, tcx: tx + tankW / 2, rr: Math.round(8 * u),
      zcx, zcy, R, zw, t8, v14, yT, yL, yV: yL + v14 + 4, lx: zcx - zw * 0.25, rx: zcx + zw * 0.25
    });
  }

  function paintFuel(c, w, h, r, g) {
    const s = r && r.ship;
    const infinite = s && s.infinite;
    const burning = s && s.burning;
    const bank = s ? s.bank || 0 : 0;
    if (g.gw !== w || g.gh !== h || (g.L && g.gb !== barT + "/" + barB)) { g.gw = w; g.gh = h; g.key = null; fuelGeom(g, w, h); }
    layer(g, c, w, h, g.L ? "f" + barT + "/" + barB : "f", g.L ? thrustStatic : fuelStatic);
    c.drawImage(g.off, 0, 0, w, h);
    const { u, px, pad, bigF, y1, barY, tankTop, tankBot, tankH, tankW, tx, tcx, zcx, zcy, R, t8, v14, yT, yV, lx, rx } = g;
    const ins = 5;
    const low = !infinite && fuelNeedle < 0.22;
    const col = low ? (fuelNeedle < 0.09 ? BAD : WARN) : LAMP;
    if (g.L) { fuelBar(c, g, s, low, col); thrustLive(c, g, s); return; }

    // header: big percent (tinted by the alarm), label, state word
    c.textBaseline = "alphabetic";
    c.textAlign = "left";
    c.font = mono(bigF, "600");
    c.fillStyle = alarmCol ? rgba(alarmCol, 0.6 + 0.4 * alarmBl) : rgba(col === LAMP ? READ : col, 0.95);
    let pct;
    if (infinite) pct = "∞";
    else {
      const pi = Math.round(fuelNeedle * 100);
      if (pi !== fPct) { fPct = pi; fPctS = pi + "%"; }
      pct = fPctS;
    }
    const yH = y1, xH = pad, xE = w - pad;
    txt(c, pct, xH, yH);
    const pctW = c.measureText(pct).width;
    c.font = mono(px(9, 8));
    c.fillStyle = infinite ? rgba(LAMP, 0.9) : low ? rgba(col, 1) : rgba(DIM, 1);
    const fuelS = infinite ? "OPEN" : low ? "LOW" : "FUEL", xF = xH + pctW + Math.round(8 * u);
    txt(c, fuelS, xF, yH);
    const mode = burning ? "HARD BURN"
      : (s && s.courseMark ? "SEEK" : (cruiseNeedle > 0.05 ? "COAST" : "IDLE"));
    c.fillStyle = burning ? rgba(LAMP, 0.9) : rgba(DIM, 0.9);
    c.textAlign = "right"; txt(c, mode, xE, yH);

    // ladder rows lighting from the bottom; the top lit row breathes
    const lvl = infinite ? 0.85 + 0.15 * Math.sin(t * 2) : fuelNeedle;
    const lit = Math.min(NR, Math.round(lvl * NR));
    if (lit > 0) {
      c.lineWidth = 2;
      c.strokeStyle = rgba(col, 1);
      c.beginPath();
      for (let i = 0; i < lit - 1; i++) {
        const y = tankBot - 3 - (tankH - 6) * (i + 0.5) / NR;
        c.moveTo(tx + ins, y); c.lineTo(tx + tankW - ins, y);
      }
      c.stroke();
      const y = tankBot - 3 - (tankH - 6) * (lit - 0.5) / NR;
      c.strokeStyle = rgba(col, 0.6 + 0.4 * Math.sin(t * 5));
      c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(tx + ins, y); c.lineTo(tx + tankW - ins, y); c.stroke();
    }

    // live surface: tilts with the bank, sways with thrust; bubbles rise while burning
    const yS = tankBot - tankH * lvl;
    const slope = clamp(bank, -0.5, 0.5) * 0.7;
    const amp = (0.8 + 3.2 * thrustNeedle) * u;
    c.save();
    c.clip(g.vessel);
    c.beginPath();
    for (let i = 0; i <= 8; i++) {
      const x = tx + tankW * i / 8;
      const y = yS + slope * (x - tcx) + amp * Math.sin(i * 1.3 + t * 3.2);
      if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.strokeStyle = rgba(col, 0.95);
    c.lineWidth = 1.5;
    c.stroke();
    if (burning && !infinite) {
      c.strokeStyle = rgba(READ, 0.55);
      c.lineWidth = 1;
      c.beginPath();
      for (let i = 0; i < NB; i++) {
        const rad = (1 + 1.6 * bs[i]) * u;
        const x = tx + 4 + (tankW - 8) * bx[i] + Math.sin(by[i] * 9 + i) * 2 * u;
        const y = tankBot - 3 - (tankH - 6) * by[i];
        c.moveTo(x + rad, y);
        c.arc(x, y, rad, 0, 6.283);
      }
      c.stroke();
    }
    c.restore();

    // thrust arc and the percent inside
    c.lineCap = "round";
    c.lineWidth = Math.max(3, 5 * u);
    c.strokeStyle = rgba(LAMP, 0.9);
    c.beginPath(); c.arc(zcx, zcy, R, 0.75 * Math.PI, 0.75 * Math.PI + 1.5 * Math.PI * thrustNeedle); c.stroke();
    c.lineCap = "butt";
    c.lineWidth = 1;
    c.textAlign = "center";
    const pctF = Math.max(12, Math.min(px(18, 12), Math.round(R * 0.8)));
    c.font = mono(pctF, "600");
    c.fillStyle = rgba(READ, 0.95);
    const ti = Math.round(thrustNeedle * 100);
    if (ti !== tPct) { tPct = ti; tPctS = ti + "%"; }
    txt(c, tPctS, zcx, zcy + Math.round(pctF * 0.35));

    // burn and power numerals
    const burnRate = burning ? s.drain || 0 : 0;
    c.font = mono(v14);
    c.fillStyle = rgba(READ, 0.9);
    if (infinite) txt(c, "∞", lx, yV);
    else {
      const left = burning && burnRate > 0.1;
      const val = left ? Math.round(s.fuel / burnRate) : Math.round(s ? s.fuel : 100);
      const bk = (left ? "~" : "u") + val;
      if (bk !== bKey) { bKey = bk; bS = left ? "~" + val + "s" : val + "u"; }
      txt(c, bS, lx, yV);
    }
    c.fillStyle = rgba(COLD, 0.9);
    const ac = s && s.power ? s.power.accel : 1;
    const pk = Math.round(ac * 10);
    if (pk !== pKey) { pKey = pk; pS = "×" + ac.toFixed(1); }
    txt(c, pS, rx, yV);

    // cruise build fill and its percent
    c.font = mono(px(7));
    c.textAlign = "right";
    c.fillStyle = rgba(COLD, 0.9);
    const ci = Math.round(cruiseNeedle * 100);
    if (ci !== cPct) { cPct = ci; cPctS = ci + "%"; }
    txt(c, cPctS, w - pad, barY - 6 * u - 2);
    if (cruiseNeedle > 0.005) {
      c.lineWidth = 3;
      c.strokeStyle = rgba(LAMP, 0.9);
      c.beginPath(); c.moveTo(pad, barY); c.lineTo(pad + (w - 2 * pad) * clamp(cruiseNeedle, 0, 1), barY); c.stroke();
    }
    c.lineWidth = 1;
  }

  /* nose resonance: a rolling trace of r.env.res (a ring buffer), one scale on the right edge */
  const RN = 80;
  const resBuf = new Float32Array(RN);
  let resHead = 0, resN = 0, resClock = 0, rPct = -1, rPctS = "";
  const resG = { key: null, off: null };
  const resAt = i => resBuf[(resHead - resN + i + RN) % RN];
  /* the graph: log Y (1, .1, .01 and the floor at .001) up the tall right axis, time along the floor with the oldest at the left,
     all clipped under the owner's curve mirrored, so the line climbs toward the axis as the space opens */
  const RES_LO = 0.001;
  const resF = v => clamp((Math.log10(Math.max(v, RES_LO)) + 3) / 3, 0, 1);
  /* the axis takes the headroom of the rightmost column, so the head and the axis agree */
  const resY = v => resG.bot - resG.hrR * resF(v);
  const resHr = new Float32Array(RN);
  const resYi = i => resG.bot - resHr[RN - resN + i] * resF(resAt(i));
  let resTy = -1, rPctW = 0;
  function resGeom(c, w, h) {
    const g = resG;
    if (g.gw === w && g.gh === h) return g;
    const u = clamp(Math.min(h / 220, w / 230), 0.55, 1.25);
    const axisX = w - 3, bot = h - 1, yTop = Math.round(18 * u);
    const under = new Path2D(), n = curveLut.length;
    under.moveTo(0, curveLut[n - 1][1] * h);
    for (let i = n - 1; i >= 0; i--) under.lineTo(w * (1 - curveLut[i][0]), curveLut[i][1] * h);
    under.lineTo(w, 0); under.lineTo(w, h); under.lineTo(0, h);
    g.gw = w; g.gh = h; g.key = null; rPct = -1; resTy = -1;
    Object.assign(g, { u, axisX, bot, yTop, ph: bot - yTop, xL: 24, xR: axisX, under, bigF: Math.max(7, Math.min(15, Math.round(h * 0.075))) });
    /* per column, the room from the floor up to just under the curve: the same log scale spans it, so every column moves with its reading */
    const sx = (g.xR - g.xL) / (RN - 1);
    for (let i = 0; i < RN; i++) resHr[i] = clamp(bot - (curveY((g.xL + i * sx - 4) / w, true) * h + 3), 1, g.ph);
    g.hrR = resHr[RN - 1];
    return g;
  }
  /* each guide line starts where the red curve crosses its level and runs right to the axis */
  function resTicks() {
    const { xL, xR } = resG, w = resG.gw, h = resG.gh;
    return [1, 0.1, 0.01, 0.001].map(v => {
      const y = resY(v);
      let x = xL;
      while (x < xR && curveY(x / w, true) * h > y) x++;
      return [v, x];
    });
  }
  function resStatic(o, w, h) {
    const { axisX, bot, yTop, xL, xR, under } = resG;
    o.textBaseline = "alphabetic";
    o.lineWidth = 1;
    // faint ruled grid, only inside the clipped area
    o.beginPath();
    for (const [v, x0] of resTicks()) { const y = resY(v) + 0.5; o.moveTo(x0, y); o.lineTo(xR, y); }
    o.strokeStyle = rgba(DIM, 0.55);
    o.stroke();
    o.save();
    o.clip(under);
    o.beginPath();
    for (let i = 1; i <= 8; i++) { const x = xL + (xR - xL) * i / 8; o.moveTo(x, yTop); o.lineTo(x, bot); }
    o.strokeStyle = rgba(DIM, 0.26);
    o.stroke();
    // nomic: a thin level on the scale, its tiny label at the right end
    const yN = resY(0.6);
    o.beginPath(); o.moveTo(xL, yN); o.lineTo(xR, yN);
    o.strokeStyle = rgba(DIM, 0.45);
    o.stroke();
    o.restore();
    /* the label sits left of the value readout's column so the two never meet */
    o.font = mono(resG.bigF, "600");
    const valW = o.measureText("0.00").width;
    o.font = mono(8);
    o.textAlign = "right";
    o.fillStyle = rgba(READ, 0.9);
    txt(o, "NOMIC", xR - valW - 10, yN - 3);
    // the Y axis (the column) and the X axis along the floor, each with an arrowhead and its letter
    o.lineWidth = 1.5;
    o.strokeStyle = rgba(LAMP, 0.7);
    o.beginPath(); o.moveTo(axisX, bot); o.lineTo(axisX, 5); o.stroke();
    o.fillStyle = rgba(LAMP, 0.7);
    o.beginPath(); o.moveTo(axisX - 3, 8); o.lineTo(axisX, 1); o.lineTo(axisX + 3, 8); o.closePath(); o.fill();
    o.lineWidth = 1;
    o.strokeStyle = rgba(DIM, 0.6);
    o.beginPath(); o.moveTo(axisX, bot); o.lineTo(5, bot); o.stroke();
    o.fillStyle = rgba(DIM, 0.6);
    o.beginPath(); o.moveTo(8, bot - 3); o.lineTo(1, bot); o.lineTo(8, bot + 3); o.closePath(); o.fill();
    o.font = mono(8);
    o.textAlign = "left";
    o.fillStyle = rgba(READ, 0.9);
    txt(o, "-" + Math.round(RN * 0.05) + " s", xL + 6, bot - 4);
    o.textAlign = "right";
    txt(o, "NOW", axisX - 5, bot - 4);
    // the scale: each number at the left end of its guide line
    o.beginPath();
    o.fillStyle = rgba(DIM, 0.9);
    const lab = { 1: "1", 0.1: ".1", 0.01: ".01", 0.001: ".001" };
    for (const [v, x0] of resTicks()) txt(o, lab[v], x0 - 3, resY(v) + 3 - (v === 0.001 ? 4 : 0));
    o.font = mono(8);
    o.textAlign = "right";
    o.fillStyle = rgba(READ, 0.9);
    txt(o, "NOSE RESONANCE \u00b7 LOG", axisX - 7, 8);
  }
  function resTrace(c, xL, sx) {
    for (let i = 0; i < resN; i++) {
      const x = xL + (RN - resN + i) * sx, y = resYi(i);
      if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
  }
  function paintRes(c, w, h) {
    resGeom(c, w, h);
    layer(resG, c, w, h, "r", (o) => resStatic(o, w, h));
    c.drawImage(resG.off, 0, 0, w, h);
    const { axisX, bot, xL, xR, bigF, under } = resG;
    const cur = resN ? resAt(resN - 1) : 0;
    const sx = (xR - xL) / (RN - 1);
    // the current value, large, just above the head of the line, never over the trace
    const ri = Math.round(cur * 100);
    c.textBaseline = "alphabetic";
    c.textAlign = "right";
    c.font = mono(bigF, "600");
    if (ri !== rPct) { rPct = ri; rPctS = cur.toFixed(2); rPctW = c.measureText(rPctS).width; }
    let yMin = resN ? resYi(resN - 1) : resY(cur), yMax = yMin;
    const x0 = xR - rPctW - 10;
    for (let i = 0; i < resN; i++) {
      if (xL + (RN - resN + i) * sx < x0 - sx) continue;
      const y = resYi(i);
      if (y < yMin) yMin = y;
      if (y > yMax) yMax = y;
    }
    const above = yMin - 7;
    const target = Math.min(h - 3, above - bigF * 0.8 > 2 ? above : yMax + 7 + bigF * 0.8);
    resTy = resTy < 0 ? target : resTy + (target - resTy) * 0.3;
    c.fillStyle = rgba(cur > 0.6 ? BAD : READ, 0.95);
    txt(c, rPctS, xR - 4, Math.round(resTy));
    if (resN < 2) return;
    c.save();
    c.clip(under);
    c.lineWidth = 1;
    c.strokeStyle = rgba(LAMP, 0.3);
    c.beginPath();
    for (let i = 0; i < resN; i += 2) {
      const x = xL + (RN - resN + i) * sx;
      c.moveTo(x, bot); c.lineTo(x, resYi(i));
    }
    c.stroke();
    // trace in one path; the part above the nomic level is stroked again in alarm colour
    c.lineWidth = Math.max(2, 3 * resG.u);
    c.lineJoin = "round";
    c.strokeStyle = rgba(LAMP, 0.9);
    c.beginPath(); resTrace(c, xL, sx); c.stroke();
    c.save();
    c.beginPath(); c.rect(xL - 2, 0, xR - xL + 4, resY(0.6)); c.clip();
    c.strokeStyle = rgba(BAD, 0.9);
    c.beginPath(); resTrace(c, xL, sx); c.stroke();
    c.restore();
    c.restore();
    c.lineWidth = 1;
  }

  function draw(r, dt) {
    step(r, dt);
    resClock += dt;
    if (resClock >= 0.05) {
      resClock = Math.min(resClock - 0.05, 0.1);
      resBuf[resHead] = r && r.env && r.env.res || 0;
      resHead = (resHead + 1) % RN;
      if (resN < RN) resN++;
    }
    if (!showSide) return;
    const lv = window.Instruments.alarmLevel("phase");
    alarmCol = null;
    if (lv) {
      alarmCol = lv >= 2 ? BAD : WARN;
      alarmBl = lv >= 2 ? (Math.sin(t * 6.9) + 1) / 2 : (Math.sin(t * 3.1) + 1) / 2;
    }
    fctx.clearRect(0, 0, cvFW, cvH);
    paintFuel(fctx, cvFW, cvH, r, sideG);
    rctx.clearRect(0, 0, cvW, cvH);
    paintRes(rctx, cvW, cvH);
    if (alarmCol) {
      fctx.strokeStyle = rgba(alarmCol, 0.5 + 0.4 * alarmBl); fctx.lineWidth = 1.5;
      fctx.strokeRect(sideG.fx - 0.5, sideG.bt - 0.5, FUEL_W + 1, sideG.bb - sideG.bt + 1);
    }
  }

  /* the narrow-layout tile: the same painter in the bank's cell (its ctx) */
  function tile(c, p, r) {
    alarmCol = null;
    paintFuel(c, p.w, p.h - 5, r, tileG);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  return { draw, tile };
})();
