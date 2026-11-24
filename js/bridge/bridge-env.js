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
       res,                                nose resonance 0..1: site weight x chaos, plus a small nomic flutter
       site, siteName, w,                dominant site id ("" if none), its name, its weight 0..1
       n1, n2, n3,                         smoothed noise channels in -1..1, shared by the tiles
       t,                                  env clock, seconds
       sig,                                up to 3 {id, cls, s 0..1, pat [Hz, ratio, rough], inst} nearest signatures, strongest first
       twin,                               a second contact on the sweep, our own echo, 0..1
     }
     chaos = incoherent deviation (noise), nomic = coherent deviation (constants displaced, in step).
     The readout never says "chaos" or "magic" for the second one; it says coherent / nomic. */

  const FIELDS = ["chaos", "future", "nomic", "wear", "jitter", "sway", "glare", "rad", "heat", "contained", "link", "frozen", "echo", "g", "rho", "twin"];

  B.env = {};
  for (const k of FIELDS) B.env[k] = 0;
  Object.assign(B.env, { gAnom: 0, tag: "", site: "", siteName: "", w: 0, res: 0.04, sig: [], n1: 0, n2: 0, n3: 0, t: 0 });
  let gRef = 0, resS = 0.04;
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

  /* Signatures: the nose rings in a fixed way at each place; the crew catalogue it.
     class = the site's strongest field (first listed wins a tie), and the white instrument it disturbs:
       chaos -> rift -> drift     nomic -> well -> g        jitter -> shear -> radar
       glare -> glint -> radar    rad -> flare -> rad       wear -> fault -> str
       heat -> furnace -> str     sway -> swell -> drift    none (quiet) -> hush -> g
     pat = [base Hz, harmonic ratio, roughness]; class sets the bulk, the id hash nudges it per site. */
  const SIG_CLS = {
    rift: ["drift", 3.1, 1.5, 0.8], well: ["g", 1.2, 2, 0.1], shear: ["radar", 5.4, 1.33, 0.6], glint: ["radar", 7.8, 3, 0.3],
    flare: ["rad", 4.2, 2.5, 0.45], fault: ["str", 2.2, 1.25, 0.7], furnace: ["str", 0.9, 1.75, 0.35], swell: ["drift", 1.7, 1.1, 0.2],
    hush: ["g", 0.5, 2, 0.05],
  };
  const SIG_FIELD = [["chaos", "rift"], ["nomic", "well"], ["jitter", "shear"], ["glare", "glint"], ["rad", "flare"], ["wear", "fault"], ["heat", "furnace"], ["sway", "swell"]];
  const sigP = [0, 1, 2].map(() => ({ id: "", cls: "", inst: "", s: 0, pat: [0, 0, 0] })), sigOut = [];   // pooled top-3 entries (no per-frame allocation)
  const sigCache = {};
  function sigOf(site) {
    let c = sigCache[site.id];
    if (c) return c;
    let h = 2166136261;
    for (let i = 0; i < site.id.length; i++) h = Math.imul(h ^ site.id.charCodeAt(i), 16777619) >>> 0;
    let cls = "hush", top = 0.05;
    for (const [fk, name] of SIG_FIELD) {
      const v = Math.abs(site.f[fk] || 0);
      if (v > top) { top = v; cls = name; }
    }
    const b = SIG_CLS[cls], u = (h % 1000) / 1000;
    const r2 = (v) => Math.round(v * 100) / 100;
    c = sigCache[site.id] = { id: "sg-" + String(h % 10000).padStart(4, "0"), cls, inst: b[0], pat: [r2(b[1] * (0.92 + 0.16 * u)), r2(b[2] * (0.97 + 0.06 * u)), r2(b[3] * (0.9 + 0.2 * u))] };
    return c;
  }

  B.stepEnv = function stepEnv(dt) {
    dt = Math.min(dt || 0, 0.1);
    const e = B.env;
    e.t += dt;
    const x = B.camX || 0;

    const tg = {};
    for (const k of FIELDS) tg[k] = 0;
    tg.chaos = B.chaosNow || 0;
    tg.future = B.futureNow || 0;
    tg.jitter = 0.3 * tg.chaos;
    const onLand = Math.abs(x - 69000) < 9600;
    const onRex = x >= 333000 && x <= 400800;
    tg.g = onLand ? 1 : onRex ? 1.3 : 0;
    tg.rho = onLand ? 1 : onRex ? 1.1 : 0;
    let gRefT = tg.g;

    if (window.BridgeSites) {
      const list = BridgeSites.SITES;
      let dom = null, domW = 0, best = null, bestW = 0;
      let sigN = 0;
      for (const site of list) {
        const w = gateOf(site) * weightOf(site, x);
        if (w <= 0.001) continue;
        for (const k in site.f) tg[k] = mix(tg[k], site.f[k], w);
        if (site.f.g !== undefined) gRefT = mix(gRefT, site.f.g, w);
        if (site.osc) for (const o of (Array.isArray(site.osc) ? site.osc : [site.osc])) tg[o.field] = mix(tg[o.field], shapeOf(o, e.t), w);
        const sw = w * (0.6 + 0.4 * e.chaos);
        if (sw > 0.02) { const sv = Math.min(1, sw);
          if (sigN < 3 || sv > sigP[2].s) {
            const sg = sigOf(site); let j = sigN < 3 ? sigN++ : 2; const q = sigP[j];
            while (j > 0 && sigP[j - 1].s < sv) { sigP[j] = sigP[j - 1]; j--; }
            sigP[j] = q; q.id = sg.id; q.cls = sg.cls; q.inst = sg.inst; q.s = sv; q.pat[0] = sg.pat[0]; q.pat[1] = sg.pat[1]; q.pat[2] = sg.pat[2]; } }
        if (w >= 0.5) { dom = site; domW = w; }
        if (w > bestW) { best = site; bestW = w; }
      }
      sigOut.length = sigN; for (let i = 0; i < sigN; i++) sigOut[i] = sigP[i];
      e.sig = sigOut;
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

    resS = approach(resS, Math.max(0.04, smooth(e.w) * (0.6 + 0.4 * e.chaos)), 4, dt);
    e.res = clamp(resS + 0.05 * (e.n1 + e.n2 + e.n3) / 3 * 1.7, 0.02, 1);
  };

  window.envReport = () => Object.assign({}, B.env);
})();
