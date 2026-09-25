(() => {
  "use strict";
  const B = window.Bridge;
  if (!B) return;
  const { clamp, mix, smooth, approach, TAU } = Util;

  /* ── the environment model ────────────────────────────────
     One object, B.env, that every instrument and the readout
     read from, so the tiles and the log agree about where the
     ship is. Two curves from js/world (chaos, unformed) are the
     background; the places in BridgeSites override them where
     the ship is close and the place has been revealed.

     B.env = {
       chaos, future, nomic, wear, jitter, sway, glare, rad, heat,
       contained, link, frozen, echo,      0..1 (wear is -1..1: + corrodes, - restores)
       g, rho, gAnom,                      gravity multiple, medium density multiple, |g - expected| 0..1
       tag,                                "" or a short upper-case badge for the tile header
       site, siteName, w,                  dominant site id ("" if none), its name, its weight 0..1
       n1, n2, n3,                         smoothed noise channels in -1..1, shared by the tiles
       t,                                  env clock, seconds
       twin,                               a second contact on the sweep, our own echo, 0..1
     }
     chaos = incoherent deviation (noise), nomic = coherent deviation (constants displaced, in step).
     The readout never says "chaos" or "magic" for the second one; it says coherent / nomic. */

  const FIELDS = ["chaos", "future", "nomic", "wear", "jitter", "sway", "glare", "rad", "heat", "contained", "link", "frozen", "echo", "g", "rho", "twin"];

  B.env = {};
  for (const k of FIELDS) B.env[k] = 0;
  Object.assign(B.env, { gAnom: 0, tag: "", site: "", siteName: "", w: 0, n1: 0, n2: 0, n3: 0, t: 0 });
  let gRef = 0;
  const nT = [0, 0, 0];
  let nClock = 0;

  function weightOf(site, x) {
    if (site.ramp) return smooth((x - site.ramp[0]) / (site.ramp[1] - site.ramp[0]));
    return smooth((site.r - Math.abs(x - site.x)) / (site.r * 0.45));
  }

  function gateOf(site) {
    return site.gate ? (window.depthAlpha ? window.depthAlpha(site.gate) : 0) : 1;
  }

  function shapeOf(osc, t) {
    const u = (t / osc.period + (osc.phase || 0)) % 1;
    if (osc.shape === "sine") return mix(osc.lo, osc.hi, 0.5 + 0.5 * Math.sin(u * TAU));
    if (osc.shape === "square") return u < 0.5 ? osc.hi : osc.lo;
    return u < (osc.duty || 0.18) ? osc.hi : osc.lo; // burst / pulse: hi for the first `duty` of the period
  }

  B.stepEnv = function stepEnv(dt) {
    dt = Math.min(dt || 0, 0.1);
    const e = B.env;
    e.t += dt;
    const x = B.camX || 0;
    const gd = B.sceneMode !== "void";

    const tg = {};
    for (const k of FIELDS) tg[k] = 0;
    if (!gd) {
      tg.chaos = B.chaosNow || 0;
      tg.future = B.futureNow || 0;
      tg.jitter = 0.3 * tg.chaos;
      const onLand = Math.abs(x - 69000) < 9600;
      const onRex = x >= 333000 && x <= 400800;
      tg.g = onLand ? 1 : onRex ? 1.3 : 0;
      tg.rho = onLand ? 1 : onRex ? 1.1 : 0;
    }
    let gRefT = tg.g;

    if (window.BridgeSites) {
      const list = gd ? BridgeSites.GD_SITES : BridgeSites.SITES;
      let dom = null, domW = 0, best = null, bestW = 0;
      for (const site of list) {
        const w = gateOf(site) * weightOf(site, x);
        if (w <= 0.001) continue;
        for (const k in site.f) tg[k] = mix(tg[k], site.f[k], w);
        if (site.f.g !== undefined) gRefT = mix(gRefT, site.f.g, w);
        if (site.osc) for (const o of (Array.isArray(site.osc) ? site.osc : [site.osc])) tg[o.field] = mix(tg[o.field], shapeOf(o, e.t), w);
        if (w >= 0.5) { dom = site; domW = w; }
        if (w > bestW) { best = site; bestW = w; }
      }
      const pick = dom || best;
      e.site = pick ? pick.id : "";
      e.siteName = pick ? pick.name : "";
      e.w = dom ? domW : bestW;
      e.tag = dom ? (dom.tags ? dom.tags[Math.floor(e.t / dom.tagPeriod) % dom.tags.length] : dom.tag) : "";
    }

    for (const k of FIELDS) e[k] = approach(e[k], tg[k], 4, dt);
    gRef = approach(gRef, gRefT, 4, dt);
    e.gAnom = clamp(Math.abs(e.g - gRef) / 1.2, 0, 1);

    nClock -= dt;
    if (nClock <= 0) {
      nClock = 0.25;
      for (let i = 0; i < 3; i++) nT[i] = Math.random() * 2 - 1;
    }
    e.n1 = approach(e.n1, nT[0], 12, dt);
    e.n2 = approach(e.n2, nT[1], 12, dt);
    e.n3 = approach(e.n3, nT[2], 12, dt);
  };

  window.envReport = () => Object.assign({}, B.env);
})();
