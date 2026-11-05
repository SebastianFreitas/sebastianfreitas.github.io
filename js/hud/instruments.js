/* ===========================================================
   INSTRUMENTS

   What is left of the tile HUD: the module clock, the value alarms
   (tickAlarms), the critical-line pulse and the readings tiles-sys.js
   integrates. The canvas HUD is hud-c25.js; this file draws nothing.
   =========================================================== */

window.Instruments = (function () {

  let t = 0;

  /* the alarms are slow: step them about 20 times a second
     (every 3rd frame at 60 fps), handing each step the time since the last */
  const PAINT_STEP = 0.045;
  let paintAcc = PAINT_STEP;   // first draw steps at once
  let tiles = null;            // registered by tiles-sys.js

  /* Alarm — master caution. A reading must hold to be believed. Every fault
     lights at once; among warnings only one may show at a time, and the
     panel stays quiet for a while after the one shown warning clears. */
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
  /* who gets the one warn lamp when more than one tile has a warning to
     show; an error lights regardless of this order */
  const A_PRIO = ["hull", "phase", "eclss", "rad", "signal", "radar", "bus", "rec"];
  const QUIET = 22;             // seconds of hush after the warn lamp goes out
  let lit = {};                 // key -> level (A_WARN/A_ERR) shown now; absent = off
  let alarmQuiet = 0;           // seconds of hush still owed

  function draw(dt, r) {
    t += dt;
    decayAlarms(dt);
    tiles.tickSys(dt, r);
    paintAcc += dt;
    if (paintAcc < PAINT_STEP) return;
    const pdt = paintAcc;
    paintAcc = 0;
    tickAlarms(pdt, r);
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

    // these have no abnormal state of their own worth a lamp — the
    // environment can still trip them, below
    alarmRaw.set("radar",  A_NONE);
    alarmRaw.set("signal", A_NONE);
    alarmRaw.set("rec",    A_NONE);
    alarmRaw.set("bus",    A_NONE);

    // environment — a hostile reading can light a lamp on its own, on top of
    // whatever the ship's own instruments already asked for. ce knocks down
    // the readings that are really about being outside the hull once the
    // ship is contained; phase, eclss and rad are untouched here since their
    // own inputs already move with the environment.
    const e = r.env || {};
    const ce = HudModels.ce(e);
    const lv = (err, warn) => err ? A_ERR : warn ? A_WARN : A_NONE;
    // the open void reads chaos 1 for most of the map; only a place (a dominant site) turns that into a lamp
    const sc = HudModels.sc(e);
    alarmRaw.set("signal", Math.max(alarmRaw.get("signal") || A_NONE,
      lv(sc > 0.92 || (e.nomic || 0) * ce > 0.85, sc > 0.78 || (e.nomic || 0) * ce > 0.6)));
    alarmRaw.set("radar", Math.max(alarmRaw.get("radar") || A_NONE,
      lv((e.glare || 0) > 0.8, (e.glare || 0) > 0.55)));
    alarmRaw.set("hull", Math.max(alarmRaw.get("hull") || A_NONE,
      lv((e.wear || 0) > 0.65, (e.wear || 0) > 0.3)));
    alarmRaw.set("bus", Math.max(alarmRaw.get("bus") || A_NONE,
      lv((e.sway || 0) * ce > 0.85, (e.sway || 0) * ce > 0.6)));
    alarmRaw.set("rec", Math.max(alarmRaw.get("rec") || A_NONE,
      lv((e.gAnom || 0) > 0.8, (e.gAnom || 0) > 0.35)));

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

  /* every error lights, all at once. Among warnings only one shows: the key
     already showing one keeps it while it is still a warning, otherwise the
     fixed order above picks the next. A fresh warning waits out the hush;
     an error never does. */
  function arbitrate(dt) {
    if (alarmQuiet > 0) alarmQuiet = Math.max(0, alarmQuiet - dt);

    /* the fuel gauge blinks on its own and takes no warn slot */
    const own = k => k === "phase";
    const anyErr = Object.entries(lit).some(([k, v]) => v === A_ERR && !own(k));
    const curWarn = Object.keys(lit).find(k => lit[k] === A_WARN && !own(k)) || null;
    let warn = (curWarn && (alarmVal.get(curWarn) || A_NONE) === A_WARN) ? curWarn : null;
    if (!warn) {
      for (const key of A_PRIO) {
        if (!own(key) && (alarmVal.get(key) || A_NONE) === A_WARN) { warn = key; break; }
      }
      if (!anyErr && warn && alarmQuiet > 0) warn = null;
    }
    if (!warn && curWarn) alarmQuiet = QUIET;

    const next = {};
    for (const [key, v] of alarmVal) if (v === A_ERR) next[key] = A_ERR;
    if (warn) next[warn] = A_WARN;
    if ((alarmVal.get("phase") || A_NONE) === A_WARN) next.phase = A_WARN;

    for (const key of new Set([...Object.keys(lit), ...Object.keys(next)])) {
      if (next[key]) alarmAge.set(key, lit[key] === next[key] ? (alarmAge.get(key) || 0) + dt : 0);
      else alarmAge.delete(key);
    }
    lit = next;
  }

  function decayAlarms(dt) {
    for (const [k, e] of alarmEvt) {
      e.t -= dt;
      if (e.t <= 0) alarmEvt.delete(k);
    }
  }

  function alarmLevel(key) {
    return lit[key] || A_NONE;
  }

  /* the bridge log calls this on every line it prints. Only a critical one
     means anything here, and only to the skin tile. */
  function alert(kind, keys) {
    const lv = EVT_LV[kind];
    if (!lv) return;
    const dur = EVT_DUR[kind];
    if (kind === "crit" && window.HudModels) HudModels.critUntil = t + dur;
    for (const k of (keys || EVT_KEYS[kind])) {
      const cur = alarmEvt.get(k);
      if (!cur || lv > cur.lv) alarmEvt.set(k, { lv, t: dur });
      else if (cur.t < dur) cur.t = dur;
    }
  }

  function registerTiles(factory) {
    tiles = factory();
  }

  return {
    draw, alarmLevel, registerTiles, alert,
    impact: (s, g) => tiles.impact(s, g),
    setRepair: (s, on) => tiles.setRepair(s, on),
    get now() { return t; },
  };
})();
