/* tiles-sys.js — the cabin, hull and power readings: tickSys, impact,
   setRepair. instruments.js owns the clock and the alarms; hud-c25.js reads
   the readings through HudModels.sys(). Register with the framework, which
   calls back with `F`, the shared kit it needs. */
(function () {
  const { approach, clamp, wrapPi } = Util;

  window.Instruments.registerTiles(function () {
    let lastImpact = null;
    const repairing = new Set();   // hull sectors the bridge log says are under patch
    let repairAge = 0;
    let impactCool = 2.4;
    let prevAng = 0;
    let sys = {
      o2: 20.95, co2: 420, kpa: 101.3, rh: 40,
      tL: 462, kpaL: 9200, rhL: 0, h2so4: 3.2, co2L: 96,   // the lower deck: temperature (c), pressure (kPa), humidity (%), h2so4 and co2 (% of the air)
      dose: 0.013,
      hullT: -48, cabT: 21.2, hx: 0.12, hullInt: 1, wear: 0,
      omega: 0, lastImpact: null,
    };
    HudModels.live.sys = sys;   // the left wing reads these without recomputing

    function tickSys(dt, r) {
      const e = r.env || {};
      const wp = Math.max(0, e.wear || 0), wn = Math.max(0, -(e.wear || 0));
      const jit = e.jitter || 0, fz = 1 - (e.frozen || 0);
      repairAge = repairing.size ? repairAge + dt : 0;
      const chaos = r.chaos || 0;
      const future = r.future || 0;
      const s = r.ship;
      const thrust = s ? s.thrust : 0;
      const speedN = s ? s.speedN : 0;
      const now = Instruments.now;

      const o2T  = 20.95 + Math.sin(now * 0.31) * 0.05 * fz - chaos * 0.12 - thrust * 0.05
        - 1.4 * wp + 0.25 * jit * (e.n1 || 0);
      const co2T = 412 + Math.sin(now * 0.17) * 24 * fz + chaos * 180 + thrust * 90
        + 1500 * wp + 120 * jit * (e.n2 || 0);
      const kpaT = 101.3 + Math.sin(now * 0.22) * 0.11 - future * 6.2 - chaos * 0.35
        - 3.5 * wp + 1.5 * jit * (e.n3 || 0);
      const rhT  = 39.4 + Math.sin(now * 0.41) * 2.2 * fz + chaos * 3 - future * 4;
      sys.o2  = approach(sys.o2,  o2T,  3, dt);
      sys.co2 = approach(sys.co2, co2T, 2.4, dt);
      sys.kpa = approach(sys.kpa, kpaT, 2.2, dt);
      sys.rh  = approach(sys.rh,  rhT,  2.6, dt);
      /* the lower deck (a crew that breathes h2so4 in a co2 carrier), disturbed by the same terms */
      const tLT   = 462 + Math.sin(now * 0.23) * 4 * fz + chaos * 38 + thrust * 14 + 120 * wp + 30 * (e.heat || 0) + 15 * jit * (e.n1 || 0);
      const kpaLT = 9200 + Math.sin(now * 0.19) * 20 * fz - future * 300 - chaos * 60 - 400 * wp + 80 * jit * (e.n3 || 0);
      const rhLT  = Math.max(0, chaos * 1.5 + 2 * wp);
      const h2T   = 3.2 + Math.sin(now * 0.29) * 0.08 * fz - chaos * 0.6 - thrust * 0.1 - 1.9 * wp + 0.3 * jit * (e.n1 || 0);
      const co2LT = 96 + Math.sin(now * 0.13) * 0.5 * fz + chaos * 2.2 + thrust * 0.6 + 3 * wp + 0.4 * jit * (e.n2 || 0);
      sys.tL    = approach(sys.tL,    tLT,   3, dt);
      sys.kpaL  = approach(sys.kpaL,  kpaLT, 2.2, dt);
      sys.rhL   = approach(sys.rhL,   rhLT,  2.6, dt);
      sys.h2so4 = approach(sys.h2so4, h2T,   3, dt);
      sys.co2L  = approach(sys.co2L,  co2LT, 2.4, dt);

      /* a flare is a spike, not a season: a narrow peak, and only where the
         field is genuinely torn */
      const flare = chaos > 0.82
        ? Math.pow(Math.max(0, Math.sin(now * 0.19)), 26) * chaos
        : 0;
      const doseT = 0.013 + chaos * 0.022 + flare * 1.65
        + (Math.sin(now * 2.4) * 0.5 + 0.5) * 0.002
        + 0.9 * (e.rad || 0) + 0.05 * jit * Math.abs(e.n1 || 0);
      sys.dose = approach(sys.dose, doseT, 5, dt);

      const hullT = -40 - future * 86 + thrust * 95 + Math.sin(now * 0.48) * 1.6
        + (lastImpact && lastImpact.age < 2 ? 8 : 0)
        + 120 * (e.heat || 0) + 25 * jit * (e.n1 || 0);
      const cabT = HudModels.cabTAt(now, { frozen: e.frozen, chaos, future });
      const hxT = clamp(0.09 + thrust * 0.68 + chaos * 0.08 + 0.2 * (e.heat || 0), 0, 1);
      sys.hullT = approach(sys.hullT, hullT, 2.5, dt);
      sys.cabT  = approach(sys.cabT,  cabT,  3, dt);
      sys.hx    = approach(sys.hx,   hxT,   4, dt);

      sys.hullInt = clamp(sys.hullInt + dt * (-0.05 * wp + 0.12 * wn + (wp < 0.05 ? 0.006 : 0)), 0.3, 1);
      sys.wear = e.wear || 0;

      if (lastImpact) lastImpact.age += dt;
      impactCool -= dt;
      const pHit = dt * (0.008 + speedN * 0.09) * (0.03 + chaos * 0.4) * (1 + 2 * wp);
      if (impactCool <= 0 && Math.random() < pHit) {
        lastImpact = {
          g: 0.06 + Math.random() * (0.12 + chaos * 0.85 + speedN * 0.25),
          sector: 1 + (Math.floor(Math.random() * 8)),
          age: 0,
        };
        impactCool = 4 + Math.random() * 7;
      }
      sys.lastImpact = lastImpact;

      const ang = s && s.angle != null ? s.angle : 0;
      sys.omega = dt > 0 ? wrapPi(ang - prevAng) / dt : 0;
      prevAng = ang;
    }

    function impact(sector, g) {
      const sec = Math.max(1, Math.min(8, Math.round(sector) || 1));
      lastImpact = { g: Math.max(0.02, g || 0.2), sector: sec, age: 0 };
      sys.lastImpact = lastImpact;
      impactCool = 4;
    }

    function setRepair(sector, on) {
      const sec = Math.max(1, Math.min(8, Math.round(sector) || 1));
      const wasEmpty = repairing.size === 0;
      if (on) repairing.add(sec); else repairing.delete(sec);
      if (on && wasEmpty) repairAge = 0;
    }

    return {
      tickSys, impact, setRepair,
      sys,
      repairState: () => ({ count: repairing.size, age: repairAge }),
    };
  });
})();
