/* hud-models.js — the left-wing readings as shared functions. The old tiles
   (instruments.js tickAlarms) and hud-c25.js call the
   same ones. Nothing here reaches into Bridge: callers pass values in.
   Source of truth: .claude/plans/research/hud-c25-02-models.md, "Left wing".

   Lamp states: 0 off, 1 lit, 2 burst, 3 red (rad only). Burst holds while the
   rule's error level holds and for 1.1 s after a lamp turns on.

   dbr / rift site ids: no SITES entry says debris or rift. dbr = the dominant
   site (env.w >= .5) is "shattered" (tag FRACTURE). rift: no name or tag is a
   tear / hole / void word, so RIFT_IDS is empty and rift never lights. */
window.HudModels = (function () {
  const RANGE = 22000;            // radar range, world units
  const RES_LO = 0.001;           // floor of the log resonance axis
  const M_SPAN = 408000;          // metres across the camera span
  const BURST_HOLD = 1.1;         // s
  const DBR_IDS = ["shattered"];
  const RIFT_IDS = [];

  /* what the tiles publish each frame, for readers that cannot recompute it:
     str = the signal tile's peak * 100 (rounded), sys = tiles-sys.js's sys */
  const live = { str: 0, sys: null };

  const resF = v => Math.max(0, Math.min(1, (Math.log10(Math.max(v, RES_LO)) + 3) / 3));

  /* the radar's angle for one mark, radians, east = 0, y down (the tile's screen angle) */
  function blipAngle(m, camX) {
    const d = m.cam - camX, ad = Math.abs(d);
    return (d >= 0 ? 0 : Math.PI) + Math.atan2((m.oy - 0.5) * 1.4, 0.001 + ad / RANGE) * (d >= 0 ? 1 : -1) * 0.5;
  }
  /* radar angle -> bearing 0..360, north up */
  function bearingOf(a) { return (((a * 180 / Math.PI + 90) % 360) + 360) % 360; }

  /* marks in range: {n, nearest:{bearing, dist, mark}|null, second:{bearing, dist, mark}|null} */
  function contacts(marks, camX) {
    let n = 0, a = null, b = null;
    for (const m of (marks || [])) {
      const dist = Math.abs(m.cam - camX);
      if (dist >= RANGE) continue;
      n++;
      const c = { bearing: bearingOf(blipAngle(m, camX)), dist: dist, mark: m };
      if (!a || dist < a.dist) { b = a; a = c; }
      else if (!b || dist < b.dist) b = c;
    }
    return { n: n, nearest: a, second: b };
  }

  const strength = () => live.str;

  /* the signal tile's spectrum, owned here so it runs whether or not the tile
     paints. r is the readout (voice, chaos, future, env), dt seconds, t a clock
     in seconds. A second call at the same clock t returns the first result; dt is taken from t. */
  const BANDS = 28;
  const VOICES = {
    mainland: { c: 0.42, w: 0.55, a: 0.80, rough: 0.55, name: "dense · many sources" },
    rex:      { c: 0.10, w: 0.22, a: 0.70, rough: 0.10, name: "sub · one source" },
    root:     { c: 0.20, w: 0.75, a: 0.85, rough: 0.95, name: "wet · irregular" },
    watcher:  { c: 0.62, w: 0.07, a: 0.66, rough: 0.04, name: "tone · sustained" },
    bridge:   { c: 0.35, w: 0.90, a: 0.22, rough: 0.30, name: "broadband · faint" },
    future:   { c: 0.88, w: 0.14, a: 0.10, rough: 0.12, name: "near silence" },
    void:     { c: 0.50, w: 1.00, a: 0.05, rough: 0.40, name: "silent · floor only" },
    zero:     { c: 0.50, w: 0.85, a: 0.50, rough: 0.80, name: "STORM" },
    voidscape: { c: 0.78, w: 0.10, a: 0.82, rough: 0.06, name: "FURNACE" },
    heavylight: { c: 0.64, w: 0.12, a: 0.62, rough: 0.08, name: "LAMPS" },
    conclusus: { c: 0.28, w: 0.13, a: 0.60, rough: 0.07, name: "ECHO" },
  };
  const sig = { bars: new Float32Array(BANDS), peaks: new Float32Array(BANDS), peak: 0, chaos: 0, future: 0, nomic: 0, str: 0 };
  let sigT = null;
  function signal(r, dt, t) {
    // one clock: whoever calls first in a frame steps it by the clock's own dt, the rest get the same result
    if (sigT != null && t <= sigT) return sig;
    dt = sigT == null ? 0 : Math.min(0.25, t - sigT);
    sigT = t;
    const e = r.env || {}, v = VOICES[r.voice] || VOICES.void, bars = sig.bars, peaks = sig.peaks;
    const nomic = e.nomic || 0, jitter = e.jitter || 0, frozen = e.frozen || 0, sway = e.sway || 0;
    // the world curve, or a site that bends chaos (the alarm rule in instruments.js reads the same)
    sig.chaos = Util.approach(sig.chaos, Math.max(r.chaos || 0, e.chaos || 0), 4, dt);
    sig.future = Util.approach(sig.future, r.future || 0, 4, dt);
    sig.nomic = Util.approach(sig.nomic, nomic, 4, dt);
    // sway drifts the voice centre before it shapes the spectrum
    const c = v.c + sway * 6 * Math.sin(t * 0.8) / (BANDS - 1);
    for (let i = 0; i < BANDS; i++) {
      const u = i / (BANDS - 1);
      const near = Math.exp(-Math.pow((u - c) / (v.w * 0.6 + 0.02), 2));
      const grain = (Math.sin(t * (3 + i * 1.7) + i * 2.1) * 0.5 + 0.5) * (1 - frozen);
      const churn = (Math.sin(t * 11 + i * 5.3) * 0.5 + 0.5) * v.rough;
      const target = Math.max(0.02, v.a * near * (0.55 + 0.45 * grain) * (1 - 0.35 * churn)
                    + 0.03 + sig.chaos * 0.12 * churn);
      bars[i] += (target - bars[i]) * Math.min(1, dt * 9);
    }
    // nomic — a coherent field combs out four narrow, tall lines
    if (nomic > 0.02) for (const i of [5, 11, 17, 23])
      bars[i] = Math.max(bars[i], nomic * 0.92 + 0.06 * Math.sin(t * 7 + i));
    // jitter dithers the whole spectrum
    if (jitter) for (let i = 0; i < BANDS; i++)
      bars[i] = Math.min(1, Math.max(0, bars[i] + jitter * 0.4 * (Math.random() - 0.5)));
    // echo mirrors the lower half into the upper, from a copy so it stays symmetric
    if ((e.echo || 0) > 0.5) {
      const copy = bars.slice();
      for (let i = 0; i < BANDS; i++) bars[i] = Math.max(bars[i], copy[27 - i] * 0.8);
    }
    let peak = 0;
    for (let i = 0; i < BANDS; i++) {
      peaks[i] = Math.max(peaks[i] - dt * 0.35, bars[i]);
      peak = Math.max(peak, bars[i]);
    }
    sig.peak = peak;
    sig.str = live.str = Math.round(peak * 100);
    return sig;
  }

  const ce = env => 1 - ((env && env.contained) || 0);
  /* the open void reads chaos 1 for most of the map; only a place (a dominant site) turns that into a lamp */
  const sc = env => ((env && env.w) || 0) >= 0.5 ? (env.chaos || 0) : 0;

  /* drift: metres per second slip across the nose (lat) and up (vert), and the
     last 5 s of slip for the min..max cone. vel and vy are world units per s,
     angle the nose angle in radians, span = CAM.max - CAM.min, now in seconds. */
  const slipBuf = [];
  const DRIFT_K = 1 / 600;        // map-scale m/s to the drift reading: the held peak of a 90 degree turn reads 2..5 (D32)
  function driftOf(vel, vy, angle, span, now, aim) {
    const mpu = M_SPAN / span * DRIFT_K;
    // heading: the burn direction toward the aim (dx world units, dy screen-down), else the facing (yaw 0 or PI)
    let hx = Math.cos(angle || 0) >= 0 ? 1 : -1, hy = 0;
    if (aim && Math.hypot(aim.dx, aim.dy) > 1e-6) { const hl = Math.hypot(aim.dx, aim.dy); hx = aim.dx / hl; hy = aim.dy / hl; }
    // slip: the velocity left once the part along the heading is taken out; vy is screen-down, so up is negative
    const vx = vel || 0, vyy = vy || 0, along = vx * hx + vyy * hy;
    const lat = (vx - along * hx) * mpu;
    const vert = -(vyy - along * hy) * mpu;
    const slip = Math.hypot(lat, vert);
    slipBuf.push({ t: now, s: slip });
    while (slipBuf.length > 1 && now - slipBuf[0].t > 5) slipBuf.shift();
    let lo = slip, hi = slip;
    for (const p of slipBuf) { if (p.s < lo) lo = p.s; if (p.s > hi) hi = p.s; }
    return { lat: lat, vert: vert, slip: slip, min: lo, max: hi };
  }

  /* 14 lamp states in sketch order: nomic, chaos, span, unfrm, cntc, bcn, sig /
     rad, dbr, shear, flip, rift, curr, well.
     inputs: {env, futureNow, camX, spanMin, spanMax, contacts (n), beaconNear,
     str, dose}; now = a clock in seconds. */
  const onAt = new Array(14).fill(-1e9), wasOn = new Array(14).fill(false);
  function leftLamps(inp, now) {
    const e = inp.env || {}, c = ce(e), k = sc(e);
    const nm = (e.nomic || 0) * c, sw = (e.sway || 0) * c, ga = e.gAnom || 0;
    const span = inp.spanMax - inp.spanMin, edge = span * 0.05;
    const dom = (e.w || 0) >= 0.5 ? e.site : "";
    // [lit, error, red] per lamp
    const r = [
      [nm > 0.6, nm > 0.85],
      [k > 0.78, k > 0.92],
      [inp.camX - inp.spanMin < edge || inp.spanMax - inp.camX < edge, false],
      [(inp.futureNow || 0) > 0.45, false],
      [inp.contacts > 0, false],
      [!!inp.beaconNear, false],
      [inp.str > 5, false],
      [inp.dose > 0.16, false, inp.dose > 0.5],
      [DBR_IDS.indexOf(dom) >= 0, false],
      [sw > 0.6, sw > 0.85],
      [ga > 0.35, ga > 0.8],
      [RIFT_IDS.indexOf(dom) >= 0, false],
      [(e.jitter || 0) > 0.5, false],
      [Math.abs(e.g || 0) > 0.5, false],
    ];
    return r.map(function (x, i) {
      const lit = !!x[0];
      if (lit && !wasOn[i]) onAt[i] = now;
      wasOn[i] = lit;
      if (!lit) return 0;
      if (x[2]) return 3;
      return (x[1] || now - onAt[i] < BURST_HOLD) ? 2 : 1;
    });
  }

  /* ---- right wing (ship). Source: hud-c25-02-models.md, "Right wing (ship)". ---- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const JOINT_U = 0.36;           // hull position of the blade joint, ship units (hud-c25.js paintShip; the stress sample's peak)
  const RING_U = 0.68;            // hull position of the ring (paintShip's ellipse)
  const U_LO = -0.52, U_HI = 1.30;
  const CELL_D = [0.02, 0.01, 0, 0.015, -0.01, 0.005, -0.03, 0.01];
  const CAB_SET = 21.0, CAB_N = 60, CAB_STEP = 30;

  /* the bus load shares, 0..1 each, and the sum in kW (n * 8.4, jitter included as the tile draws it) */
  function busLoads(thrust, hx, omega, now, env) {
    const e = env || {}, jitterN = 0.15 * (e.jitter || 0) * (e.n2 || 0);
    const life = 0.17 + 0.015 * Math.sin(now * 0.55), drv = 0.07 + thrust * 0.74,
      thm = 0.10 + hx * 0.35, gnc = 0.06 + Math.min(0.18, Math.abs(omega) * 0.04);
    let kW = 0;
    for (const n of [life, drv, thm, gnc]) kW += clamp(n + jitterN, 0, 1) * 8.4;
    return { life: life, drv: drv, thm: thm, gnc: gnc, kW: kW };
  }

  /* cabin temperature target at clock t; env = {frozen, chaos, future} */
  function cabTAt(t, env) {
    const e = env || {}, fz = 1 - (e.frozen || 0);
    return 21.15 + Math.sin(t * 0.29) * 0.22 * fz + (e.chaos || 0) * 0.7 - (e.future || 0) * 0.4;
  }

  function cells(thrust, busKW) {
    const c = CELL_D.map(d => 3.55 + d - 0.12 * thrust - 0.05 * busKW / 6);
    let volts = 0, weakest = c[0];
    for (const v of c) { volts += v; if (v < weakest) weakest = v; }
    return { cells: c, volts: volts, weakest: weakest };
  }

  /* 30 min of cabin temperature, 60 samples 30 s apart, newest last */
  const cabBuf = []; let cabNext = 0;
  function cabTrace(t, env) {
    if (!cabBuf.length) {
      for (let k = CAB_N - 1; k >= 0; k--) cabBuf.push(cabTAt(t - k * CAB_STEP, env));
      cabNext = t + CAB_STEP;
    } else if (t >= cabNext) {
      cabBuf.push(cabTAt(t, env)); cabBuf.shift();
      cabNext += CAB_STEP;
      if (t >= cabNext) cabNext = t + CAB_STEP;
    }
    return { set: CAB_SET, samples: cabBuf };
  }

  /* hull stress 0..1 at hull position u. inp {thrust, wear, impact: {g, sector, age}, now, sway, jitter}.
     At rest: the standing load 0.15, a rib ripple (~0.05 along u, drifting with now, growing with sway / jitter), a resting bump 0.3 at the joint; the burn bump rides on top (D37) */
  function stress(u, inp) {
    const i = inp || {};
    const v = clamp(0.15 + 0.55 * (i.thrust || 0) + 0.35 * (i.wear || 0), 0, 1), t = i.now || 0;
    const amp = 0.05 * (1 + 2 * clamp(i.sway || 0, 0, 1) + 2 * clamp(i.jitter || 0, 0, 1));
    const rip = amp * (0.7 * Math.sin(u * 13 - t * 0.35) + 0.3 * Math.sin(u * 29 + t * 0.5));
    let s = 0.15 + rip + (0.3 + (v - 0.15) * 0.45) * Math.exp(-Math.pow((u - JOINT_U) / 0.12, 2) / 2);
    const m = i.impact;
    if (m && m.age < 2) {
      const us = U_LO + (clamp(m.sector || 1, 1, 8) - 0.5) / 8 * (U_HI - U_LO);
      s += 0.6 * Math.min(1, m.g || 0) * (1 - m.age / 2) * Math.exp(-Math.pow((u - us) / 0.08, 2) / 2);
    }
    return clamp(s, 0, 1);
  }

  /* 14 right lamps in sketch order: drv1..4, ring, fin t, fin b / bus, cell, cool, lsp, seal, nav, jnt.
     inp {burning, thrust, wear, impact, jet, courseMark, o2, co2, kpa, busKW, thrustN, speedN} */
  const onAtR = new Array(14).fill(-1e9), wasOnR = new Array(14).fill(false);
  function rightLamps(inp, now) {
    const th = inp.thrust || 0, crit = now < (api.critUntil || 0);
    const js = stress(JOINT_U, inp), rs = stress(RING_U, inp);
    const heat = 100 * Math.max(inp.thrustN || 0, inp.speedN || 0);
    const o2 = inp.o2, co2 = inp.co2, kpa = inp.kpa, jet = inp.jet || 0;
    const drv = k => [!!inp.burning && th >= (k - 1) / 4, false];
    const r = [
      drv(1), drv(2), drv(3), drv(4),
      [rs > 0.6, crit],
      [jet > 0, false],
      [jet < 0, false],
      [inp.busKW > 5.0, false],
      [cells(th, inp.busKW || 0).weakest < 3.40, false],
      [heat > 80, false],
      [o2 < 19.6 || co2 > 1200, o2 < 19.0 || co2 > 1800],
      [kpa < 95.6, kpa < 92],
      [!!inp.courseMark, false],
      [js > 0.6 || crit, js > 0.85 || crit],
    ];
    if (crit) r[4][0] = true;
    return r.map(function (x, i) {
      const lit = !!x[0];
      if (lit && !wasOnR[i]) onAtR[i] = now;
      wasOnR[i] = lit;
      if (!lit) return 0;
      return (x[1] || now - onAtR[i] < BURST_HOLD) ? 2 : 1;
    });
  }

  const api = {
    RANGE: RANGE, RES_LO: RES_LO, live: live,
    resF: resF, blipAngle: blipAngle, bearingOf: bearingOf, contacts: contacts,
    strength: strength, signal: signal, VOICES: VOICES, BANDS: BANDS, ce: ce, sc: sc, driftOf: driftOf, leftLamps: leftLamps,
    busLoads: busLoads, cabTAt: cabTAt, cells: cells, cabTrace: cabTrace, stress: stress, rightLamps: rightLamps,
    JOINT_U: JOINT_U, RING_U: RING_U, critUntil: 0,
    sys: function () { return live.sys; },
  };
  return api;
})();
