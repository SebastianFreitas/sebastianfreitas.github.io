/* ===========================================================
   INSTRUMENTS

   Two banks, four tiles each. Same chrome, one readings feed.

     NAV (left)
       RADAR   contacts — beacons by bearing/range, nearest callout
       SIGNAL  field    — local spectrum, chaos, unformed
       DRIVE   tanks    — fuel, thrust, cruise, burn budget
       NAV     course   — speed, bearing, span, lock status

     SYS (right)
       ECLSS   cabin    — O2, CO2, pressure, humidity
       RAD     dose     — mSv/h, magnetometer
       HULL    skin     — micro-impacts, hull/cabin temp, HX
       PWR     bus      — loads, chamber, IMU

   Feed a readings object each frame; it owns everything else.

   What each tile draws lives in tiles-nav.js (radar, signal, drive, nav)
   and tiles-sys.js (tickSys, eclss, rad, hull, bus); this file owns the
   banks, the layout, the alarms and the paint loop.
   =========================================================== */

window.Instruments = (function () {

  const LAMP = "245,208,107";
  const COLD = "143,176,184";
  const DIM  = "125,135,131";
  const BAD  = "196,74,68";
  const WARN = "229,166,60";
  const GOOD = "120,170,140";

  const CELL_W = 168, CELL_H = 122, GAP = 16, GAP_C = 8;
  const PANELS = [
    { key: "radar",  col: 0, row: 0, label: "RADAR"  },
    { key: "signal", col: 1, row: 0, label: "SIGNAL" },
    { key: "phase",  col: 0, row: 1, label: "DRIVE"  },
    { key: "rec",    col: 1, row: 1, label: "NAV"    },
  ];
  const SYS_PANELS = [
    { key: "eclss", col: 0, row: 0, label: "ECLSS" },
    { key: "rad",   col: 1, row: 0, label: "RAD"   },
    { key: "hull",  col: 0, row: 1, label: "HULL"  },
    { key: "bus",   col: 1, row: 1, label: "PWR"   },
  ];
  PANELS.forEach(p => { p.w = CELL_W; p.h = CELL_H; });
  SYS_PANELS.forEach(p => { p.w = CELL_W; p.h = CELL_H; });

  /* A phone has room for two tiles a side, stacked in one column. These are
     derived from the banks above by key, so a tile edited up there is the
     same tile down here — there is no second set of instruments to keep. */
  const COMPACT_KEYS     = ["radar", "phase"];
  const COMPACT_SYS_KEYS = ["eclss", "hull"];
  const oneColumn = (src, keys) => keys.map((k, i) => {
    const p = src.find(q => q.key === k);
    return { key: p.key, label: p.label, col: 0, row: i, w: CELL_W, h: CELL_H };
  });
  const COMPACT     = oneColumn(PANELS, COMPACT_KEYS);
  const COMPACT_SYS = oneColumn(SYS_PANELS, COMPACT_SYS_KEYS);
  let compact = false;
  const navPanels = () => compact ? COMPACT : PANELS;
  const sysPanels = () => compact ? COMPACT_SYS : SYS_PANELS;

  /* both banks always have the same shape (2x2 desktop, 1x2 compact), so the
     NAV set alone tells us the grid size */
  const cols = ps => ps.reduce((n, p) => Math.max(n, p.col + 1), 1);
  const rows = ps => ps.reduce((n, p) => Math.max(n, p.row + 1), 1);
  /* the phone stacks two panels in one column with no room to spare:
     halve the gutter there so the bank is shorter without either panel
     losing a pixel. `compact` is live by the time anything measures. */
  const gap = () => (compact ? GAP_C : GAP);
  const gridW = () => cols(navPanels()) * CELL_W + (cols(navPanels()) - 1) * gap();
  const gridH = () => rows(navPanels()) * CELL_H + (rows(navPanels()) - 1) * gap();

  let cv, ctx, dpr = 1, t = 0;
  let focusKey = null;
  let sysCv = null, sysCtx = null, sysFocus = null;
  let sysShown = true, lastR = null;   // SYS bank displayed? / last readings, for a repaint on show

  /* the banks are small and slow-moving: paint them about 20 times a second
     (every 3rd frame at 60 fps), handing each paint the time since the last */
  const PAINT_STEP = 0.045;
  let paintAcc = PAINT_STEP;   // first draw paints at once
  let uiScale = 1;
  let tiles = null;            // the eight tiles, merged from tiles-nav.js and tiles-sys.js
  let tilesWarned = false;

  /* Alarm — master caution. A reading must hold to be believed, only one
     tile may be lit at a time, and the panel stays quiet for a while after
     one clears. RADAR, SIGNAL, NAV and PWR have nothing that qualifies, so
     they never light. */
  const A_NONE = 0, A_WARN = 1, A_ERR = 2;
  const alarmRaw = new Map();   // key -> level the readings ask for right now
  const alarmVal = new Map();   // key -> level that has held long enough to count
  const alarmHold = new Map();  // key -> seconds the raw level has disagreed with it
  const alarmAge = new Map();   // key -> seconds the lit tile has held its level
  const alarmEvt = new Map();   // key -> { lv, t }  decaying pulse
  const EVT_LV   = { crit: A_ERR };        // warn / err lines are chatter, not alarms
  const EVT_DUR  = { crit: 5.0 };
  const EVT_KEYS = { crit: ["hull"] };
  /* a dip has to last this long before it is a fault and not weather */
  const DWELL_WARN = 2.2, DWELL_ERR = 0.9, RELEASE = 2.6;
  /* fuel drains monotonically and refills fast — there is no edge chatter to
     wait out, and a full burn crosses the floor in well under two seconds.
     It gets a glance instead of a dwell; RELEASE still keeps the lamp steady
     once it is lit. */
  const DWELL_FAST = { phase: 0.35 };
  /* who gets the lamp when two tiles both have something to say */
  const A_PRIO = ["hull", "phase", "eclss", "rad"];
  const QUIET = 22;             // seconds of hush after a lamp goes out
  let alarmLit = null;          // the one key allowed to show itself
  let alarmQuiet = 0;           // seconds of hush still owed

  function bindFocus(canvas, panelsFn, getter, setter) {
    canvas.addEventListener("pointerdown", e => {
      e.stopPropagation();
      const box = canvas.getBoundingClientRect();
      if (getter()) { setter(null); return; }
      const px = (e.clientX - box.left) / box.width  * gridW();
      const py = (e.clientY - box.top)  / box.height * gridH();
      for (const p of panelsFn()) {
        const x0 = p.col * (CELL_W + gap()), y0 = p.row * (CELL_H + gap());
        if (px >= x0 && px <= x0 + CELL_W && py >= y0 && py <= y0 + CELL_H) {
          setter(p.key); return;
        }
      }
    });
  }

  function fitCanvas(canvas, context) {
    if (!canvas || !context) return;
    /* the phone draws the bank at well under 1:1, so its 7px labels land on a
       handful of device pixels: let a 3x phone screen actually spend them.
       The desktop bank is large and animating, and keeps its cap of 2. */
    dpr = Math.min(devicePixelRatio || 1, compact ? 3 : 2);
    const fit = uiScale;
    const dispW = Math.round(gridW() * fit);
    const dispH = Math.round(gridH() * fit);
    canvas.style.width = dispW + "px";
    canvas.style.height = dispH + "px";
    canvas.width = Math.max(1, Math.round(gridW() * dpr * fit));
    canvas.height = Math.max(1, Math.round(gridH() * dpr * fit));
    context.setTransform(dpr * fit, 0, 0, dpr * fit, 0, 0);
    context.imageSmoothingEnabled = true;
    curFont = null;
  }

  function mount(canvas) {
    cv = canvas;
    if (!cv) return;
    ctx = cv.getContext("2d");
    curFont = null;
    fitCanvas(cv, ctx);
    bindFocus(cv, navPanels, () => focusKey, k => { focusKey = k; repaint(); });
    addEventListener("resize", resize);
    // the static layer has label text baked in: redraw it once web fonts arrive
    if (document.fonts) {
      const refont = () => { statics.clear(); repaint(); };
      document.fonts.addEventListener("loadingdone", refont);
      if (document.fonts.ready) document.fonts.ready.then(refont);
    }
  }

  function mountSys(canvas) {
    sysCv = canvas;
    if (!sysCv) return;
    sysCtx = sysCv.getContext("2d");
    fitCanvas(sysCv, sysCtx);
    bindFocus(sysCv, sysPanels, () => sysFocus, k => { sysFocus = k; repaint(); });
    // hidden below 1100px by bridge.css (display: none): a zero-size box
    if ("ResizeObserver" in window) {
      new ResizeObserver(es => {
        const box = es[es.length - 1].contentRect;
        const shown = box.width > 0 && box.height > 0;
        if (shown === sysShown) return;
        sysShown = shown;
        if (shown && lastR) {
          fitCanvas(sysCv, sysCtx);
          paintSysBank(0, lastR);
        }
      }).observe(sysCv);
    }
  }

  function setScale(v) {
    uiScale = Math.max(0.45, Math.min(2.0, v));
    resize();
    return uiScale;
  }
  const getScale = () => uiScale;

  /* the statics layer caches per canvas: a different grid is a different
     picture, so drop it outright rather than trusting the size in its key */
  function setCompact(v) {
    v = !!v;
    if (v === compact) return compact;
    compact = v;
    if (compact) { focusKey = null; sysFocus = null; }
    statics.clear();
    resize();
    return compact;
  }
  const focus = k => { focusKey = k; repaint(); };
  const focusSys = k => { sysFocus = k; repaint(); };

  function resize() {
    fitCanvas(cv, ctx);
    fitCanvas(sysCv, sysCtx);
    repaint();
  }

  /* cell → focused panel: scale drawing so labels/gauges grow with the tile */
  function ps(p) { return Math.min(p.w / CELL_W, p.h / CELL_H); }
  function cellPanel(p) {
    const s = ps(p);
    if (s === 1) return p;
    return { key: p.key, label: p.label, w: p.w / s, h: p.h / s, focused: p.focused };
  }

  function drawPanel(p, r, dt, paintFn) {
    const s = ps(p);
    ctx.save();
    if (s !== 1) ctx.scale(s, s);
    const q = cellPanel(p);
    // the chrome is in the static layer; leave the context as chrome() left it
    ctx.fillStyle = "rgba(9,13,15,0.86)";
    ctx.strokeStyle = `rgba(${LAMP},0.5)`; ctx.lineWidth = 1;
    paintFn(q, r, dt);
    alarmOverlay(q, p.key);
    ctx.restore();
    curFont = null;
  }

  function drawStaticPanel(p, staticFn) {
    const s = ps(p);
    ctx.save();
    if (s !== 1) ctx.scale(s, s);
    const q = cellPanel(p);
    chrome(q);
    if (staticFn) staticFn(q);
    ctx.restore();
    curFont = null;
  }

  /* chrome and fixed dials, drawn once per bank / focus / size into an
     offscreen canvas at the bank's own pixel size, then copied 1:1 */
  const statics = new Map();
  function blitStatic(panels, focus, staticFn) {
    const c = ctx.canvas;
    const fp = focus ? panels.find(q => q.key === focus) : null;
    const tf = ctx.getTransform();
    const key = (fp ? fp.key : "") + "|" + c.width + "x" + c.height + "|" + tf.a + "," + tf.d;
    let layer = statics.get(c);
    if (!layer || layer.key !== key) {
      const off = layer ? layer.canvas : document.createElement("canvas");
      off.width = c.width; off.height = c.height;
      const octx = off.getContext("2d");
      octx.setTransform(tf);
      octx.imageSmoothingEnabled = true;
      const saved = ctx;
      ctx = octx;
      curFont = null;
      if (fp) {
        drawStaticPanel({ key: fp.key, label: fp.label, w: gridW(), h: gridH(), focused: true }, staticFn);
      } else {
        for (const p of panels) {
          ctx.save();
          ctx.translate(p.col * (CELL_W + gap()), p.row * (CELL_H + gap()));
          drawStaticPanel(p, staticFn);
          ctx.restore();
          curFont = null;
        }
      }
      ctx = saved;
      curFont = null;
      layer = { key, canvas: off };
      statics.set(c, layer);
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(layer.canvas, 0, 0);
    ctx.restore();
    curFont = null;
  }

  function drawBank(panels, focus, paintFn, dt, r, staticFn) {
    ctx.clearRect(0, 0, gridW(), gridH());
    curFont = null;
    blitStatic(panels, focus, staticFn);
    if (focus) {
      const p = panels.find(q => q.key === focus);
      if (p) {
        drawPanel({ key: p.key, label: p.label, w: gridW(), h: gridH(), focused: true }, r, dt, paintFn);
        return;
      }
    }
    for (const p of panels) {
      ctx.save();
      ctx.translate(p.col * (CELL_W + gap()), p.row * (CELL_H + gap()));
      drawPanel(p, r, dt, paintFn);
      ctx.restore();
      curFont = null;
    }
  }

  function draw(dt, r) {
    if (!tiles) {
      if (!tilesWarned) {
        tilesWarned = true;
        console.error("tiles-nav.js / tiles-sys.js did not load — the HUD has no tiles");
      }
      return;
    }
    t += dt;
    decayAlarms(dt);
    if (tiles.tickSys) tiles.tickSys(dt, r);
    lastR = r;
    paintAcc += dt;
    if (paintAcc < PAINT_STEP) return;
    const pdt = paintAcc;
    paintAcc = 0;
    paintBanks(pdt, r);
  }

  /* value alarms. Thresholds sit where the reading stops being weather and
     starts being a problem: none of these trip on an ordinary burn, and a
     brief dip past one never reaches the lamp — see qualify(). */
  function tickAlarms(dt, r) {
    const s = r && r.ship;

    // fuel — the one gauge with a real floor. Regen is fast, so only a hold
    // on the burn keeps it down here long enough to count.
    const fuelN = s ? s.fuelN : 1;
    alarmRaw.set("phase", (s && s.infinite) ? A_NONE
      : fuelN < 0.09 ? A_ERR : fuelN < 0.22 ? A_WARN : A_NONE);

    if (tiles.sys) {
      const sys = tiles.sys;             // the readings the tiles integrate
      const rep = tiles.repairState();

      // cabin — only the deepest unformed space pulls the pressure down this far
      alarmRaw.set("eclss", (sys.o2 < 19.0 || sys.co2 > 1800 || sys.kpa < 92) ? A_ERR
        : (sys.o2 < 19.6 || sys.co2 > 1200 || sys.kpa < 95.6) ? A_WARN : A_NONE);

      // dose — only the peak of a flare, which is rare by construction
      alarmRaw.set("rad", sys.dose > 0.50 ? A_ERR : sys.dose > 0.16 ? A_WARN : A_NONE);

      // skin — an open breach, but only while it is fresh. The bridge log
      // narrates the rest of the repair; the tile does not need to nag.
      alarmRaw.set("hull", (rep.count > 0 && rep.age < 12) ? A_WARN : A_NONE);
    }

    // these have no abnormal state worth a lamp
    alarmRaw.set("radar",  A_NONE);
    alarmRaw.set("signal", A_NONE);
    alarmRaw.set("rec",    A_NONE);
    alarmRaw.set("bus",    A_NONE);

    qualify(dt);
    arbitrate(dt);
  }

  function evtLevel(key) {
    const e = alarmEvt.get(key);
    return e ? e.lv : A_NONE;
  }

  /* a raw level has to hold for a dwell before it becomes real, and has to
     stay gone for a release before it stops being real. An event pulse from
     the bridge log skips the dwell — it is already a confirmed fact. */
  function qualify(dt) {
    for (const key of alarmRaw.keys()) {
      const evt = evtLevel(key);
      const raw = Math.max(alarmRaw.get(key) || A_NONE, evt);
      const com = alarmVal.get(key) || A_NONE;
      if (raw === com) { alarmHold.set(key, 0); continue; }
      if (raw > com && evt >= raw) { alarmVal.set(key, raw); alarmHold.set(key, 0); continue; }
      const fast = DWELL_FAST[key];
      const rise = fast != null ? fast : (raw >= A_ERR ? DWELL_ERR : DWELL_WARN);
      const need = raw > com ? rise : RELEASE;
      const held = (alarmHold.get(key) || 0) + dt;
      if (held >= need) { alarmVal.set(key, raw); alarmHold.set(key, 0); }
      else alarmHold.set(key, held);
    }
  }

  /* one lamp at a time. Severity first, then the fixed order above, and a
     tile already lit keeps the lamp against an equal claim. A fresh warning
     waits out the hush; a real error does not. */
  function arbitrate(dt) {
    if (alarmQuiet > 0) alarmQuiet = Math.max(0, alarmQuiet - dt);

    let best = null, bestLv = A_NONE;
    for (const key of A_PRIO) {
      const lv = alarmVal.get(key) || A_NONE;
      if (lv > bestLv) { bestLv = lv; best = key; }
    }
    if (bestLv > A_NONE && best !== alarmLit && (alarmVal.get(alarmLit) || A_NONE) === bestLv) {
      best = alarmLit;
    }
    if (best && best !== alarmLit && bestLv < A_ERR && alarmQuiet > 0) { best = null; bestLv = A_NONE; }

    if (best !== alarmLit) {
      if (!best) alarmQuiet = QUIET;
      alarmLit = best;
      alarmAge.set(best || "", 0);
    }
    if (alarmLit) {
      const lv = alarmVal.get(alarmLit) || A_NONE;
      const prev = alarmAge.get("_lv");
      alarmAge.set("_lv", lv);
      alarmAge.set(alarmLit, prev === lv ? (alarmAge.get(alarmLit) || 0) + dt : 0);
    }
  }

  function decayAlarms(dt) {
    for (const [k, e] of alarmEvt) {
      e.t -= dt;
      if (e.t <= 0) alarmEvt.delete(k);
    }
  }

  function alarmLevel(key) {
    return key === alarmLit ? (alarmVal.get(key) || A_NONE) : A_NONE;
  }

  /* the bridge log calls this on every line it prints. Only a critical one
     means anything here, and only to the skin tile. */
  function alert(kind, keys) {
    const lv = EVT_LV[kind];
    if (!lv) return;
    const dur = EVT_DUR[kind];
    for (const k of (keys || EVT_KEYS[kind])) {
      const cur = alarmEvt.get(k);
      if (!cur || lv > cur.lv) alarmEvt.set(k, { lv, t: dur });
      else if (cur.t < dur) cur.t = dur;
    }
  }

  /* no flicker — it comes up and holds, with a slow breathe so it reads as
     live without becoming a light show */
  function alarmFlick(lv, age) {
    if (lv <= A_NONE) return 0;
    const rate = lv >= A_ERR ? 0.5 : 0.35;
    const depth = lv >= A_ERR ? 0.1 : 0.06;
    return (1 - depth) + depth * Math.sin(age * rate * 6.283);
  }

  /* drawn over the tile's own readout, on top of the static chrome */
  function alarmOverlay(p, key) {
    const lv = alarmLevel(key);
    if (!lv) return;
    const a = alarmFlick(lv, alarmAge.get(key) || 0);
    const col = lv === A_WARN ? WARN : BAD;
    ctx.save();
    ctx.fillStyle = `rgba(${col},${(lv === A_WARN ? 0.015 : 0.03) * a})`;
    ctx.fillRect(0, 0, p.w, p.h - 4);
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(${col},${(lv === A_WARN ? 0.3 : 0.48) * a})`;
    ctx.strokeRect(0.8, 0.8, p.w - 1.6, p.h - 5.6);
    // relight the chrome's corner ticks in the alarm colour
    ctx.strokeStyle = `rgba(${col},${0.4 * a})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0.8, 9); ctx.lineTo(0.8, 0.8); ctx.lineTo(9, 0.8);
    ctx.moveTo(p.w - 0.8, 9); ctx.lineTo(p.w - 0.8, 0.8); ctx.lineTo(p.w - 9, 0.8);
    ctx.stroke();
    ctx.restore();
    ctx.lineWidth = 1;
  }

  function paintBanks(dt, r) {
    if (!tiles) return;
    tickAlarms(dt, r);
    if (ctx) drawBank(navPanels(), focusKey, paint, dt, r, paintStatic);
    // readings keep ticking in draw(); only the painting stops while CSS hides the bank
    if (sysShown) paintSysBank(dt, r);
  }

  /* show a focus or size change now instead of on the next paint; dt 0
     moves nothing, and the time owed stays in paintAcc for the next paint */
  function repaint() {
    if (lastR) paintBanks(0, lastR);
  }

  function paintSysBank(dt, r) {
    if (!sysCtx) return;
    const saved = ctx;
    ctx = sysCtx;
    curFont = null;
    drawBank(sysPanels(), sysFocus, paintSys, dt, r, null);
    ctx = saved;
    curFont = null;
  }

  function paint(p, r, dt) {
    const fn = tiles.paint[p.key];
    if (fn) fn(ctx, p, r, dt);
  }

  function paintStatic(p) {
    const fn = tiles.paintStatic[p.key];
    if (fn) fn(ctx, p);
  }

  function paintSys(p, r, dt) {
    const fn = tiles.paintSys[p.key];
    if (fn) fn(ctx, p, r);
  }

  function chrome(p) {
    ctx.fillStyle = "rgba(9,13,15,0.86)";
    ctx.fillRect(0, 0, p.w, p.h - 4);
    ctx.strokeStyle = "rgba(198,204,198,0.18)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, p.w - 1, p.h - 5);
    // corner ticks
    ctx.strokeStyle = `rgba(${LAMP},0.35)`;
    ctx.beginPath();
    ctx.moveTo(0, 8); ctx.lineTo(0, 0); ctx.lineTo(8, 0);
    ctx.moveTo(p.w, 8); ctx.lineTo(p.w, 0); ctx.lineTo(p.w - 8, 0);
    ctx.stroke();

    const gx = p.w - 11, gy = 7;
    ctx.strokeStyle = `rgba(${LAMP},0.5)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (p.focused) {
      ctx.moveTo(gx, gy + 5); ctx.lineTo(gx + 5, gy + 5); ctx.lineTo(gx + 5, gy);
      ctx.moveTo(gx + 5, gy + 5); ctx.lineTo(gx - 1, gy - 1);
    } else {
      ctx.moveTo(gx, gy); ctx.lineTo(gx + 5, gy); ctx.lineTo(gx + 5, gy + 5);
      ctx.moveTo(gx + 5, gy); ctx.lineTo(gx - 1, gy + 6);
    }
    ctx.stroke();
  }

  function spark(xs, x0, yBot, w, h, col, a) {
    if (xs.length < 2) return;
    const step = w / Math.max(1, xs.length - 1);
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < xs.length; i++) {
      if (xs[i] < lo) lo = xs[i];
      if (xs[i] > hi) hi = xs[i];
    }
    const span = Math.max(1e-6, hi - lo);
    ctx.strokeStyle = `rgba(${col},${a})`;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    xs.forEach((v, i) => {
      const x = x0 + i * step;
      const y = yBot - ((v - lo) / span) * (h - 2);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
    ctx.lineWidth = 1;
  }
  function fmtK(n) {
    const a = Math.abs(n);
    if (a >= 100000) return (n / 1000).toFixed(0) + "k";
    if (a >= 10000) return (n / 1000).toFixed(1) + "k";
    return Math.round(n).toLocaleString("en-US");
  }

  /* canvas never clips, so a label that shares a line with another has to
     earn its width. fit() trims to what is actually free; call it with the
     font already set, since measureText reads the current one. */
  function fit(text, maxW) {
    if (maxW <= 0) return "";
    if (ctx.measureText(text).width <= maxW) return text;
    let s = text;
    while (s.length > 1 && ctx.measureText(s + "…").width > maxW) s = s.slice(0, -1);
    return s + "…";
  }
  const fontCache = new Map();
  function mono(px, weight = "500") {
    const k = weight + " " + px;
    let f = fontCache.get(k);
    if (!f) { f = `${weight} ${px}px "IBM Plex Mono", monospace`; fontCache.set(k, f); }
    return f;
  }

  /* ctx.font makes the browser bring page style up to date on every set,
     even an unchanged one, so skip sets that change nothing. restore(),
     a context swap and a canvas refit all change the real font behind
     our back, so each of those forgets curFont. */
  let curFont = null;
  function setFont(f) {
    if (f !== curFont) { ctx.font = f; curFont = f; }
  }

  /* what a tile is allowed to reach for. `t` is read through now() so the
     clock stays this file's. */
  const F = { LAMP, COLD, DIM, BAD, WARN, GOOD, setFont, mono, spark, fit, fmtK, now: () => t };

  function registerTiles(factory) {
    const part = factory(F);
    if (!tiles) tiles = { paint: {}, paintStatic: {}, paintSys: {} };
    for (const k of ["paint", "paintStatic", "paintSys"]) Object.assign(tiles[k], part[k] || {});
    for (const k of ["tickSys", "impact", "setRepair", "sys", "repairState"]) if (part[k] !== undefined) tiles[k] = part[k];
  }

  return {
    mount, mountSys, draw, setScale, getScale, setCompact, registerTiles,
    focus, focusSys, alert,
    impact: (s, g) => tiles && tiles.impact(s, g),
    setRepair: (s, on) => tiles && tiles.setRepair(s, on),
    get TOTAL_W() { return gridW(); },
    get TOTAL_H() { return gridH(); },
  };
})();
