/* js/bridge/bridge-readout.js — the log's voice, hull damage, and the canvas instrument bank */
(function () {
  const B = window.Bridge;
  if (!B) return;
  const { host, LAND, SLOT, CAM, activeMarks } = B;
  const { fmt } = Util;

  /* ── the readout ───────────────────────────────────────────
     Every line is an instrument talking: gravity, pressure, air,
     temperature, field, dose, strain, range. On a surface the
     numbers sit where they should. Out on the span they don't,
     and in the worst places they leave the dial entirely and
     take a piece of the hull with them. */
  B.voice = BridgeVoice.create({
    get camX() { return B.camX; }, get vel() { return B.vel; }, get chaosNow() { return B.chaosNow; },
    get futureNow() { return B.futureNow; }, get ship() { return B.ship; }, get sceneMode() { return B.sceneMode; },
    get env() { return B.env; },
    get breaches() { return breaches; }, activeMarks, LAND, SLOT, CAM,
  });
  const { pickOne, rnd, rint, fuelPool, ANY, ZONES, ERR_RESP, DC_RESP, REPAIR_STEP, DEGRADED, zoneAt, zoneHeat } = B.voice;

  /* ── hull damage ──────────────────────────────────────────
     A crit reading isn't just a red line: it opens a sector,
     and damage control closes it again over the next half
     minute, out loud. */
  let breaches = [], damageCool = 0, degradeAt = 0;
  const MAX_BREACH = 3;

  function takeDamage(label, sev) {
    const taken = breaches.map(b => b.sec);
    const free = [];
    for (let i = 1; i <= 8; i++) if (taken.indexOf(i) < 0) free.push(i);
    if (!free.length) return false;
    const sec = pickOne(free);
    const integrity = Math.max(0.18, Math.min(0.88, 1 - sev * rnd(0.5, 1.1)));
    const dur = 14 + sev * 22 + rnd(0, 8);

    B.log.push(`hull sector ${sec} · ${label} · integrity ${Math.round(integrity * 100)}%`, "err");
    B.log.push(pickOne(DC_RESP)(sec), "rep");

    if (window.Instruments && Instruments.impact) Instruments.impact(sec, 0.4 + sev * 3.2);
    if (window.Instruments && Instruments.setRepair) Instruments.setRepair(sec, true);

    breaches.push({ sec, label, integrity, t: 0, dur, next: dur * 0.34 });
    damageCool = 18 + Math.random() * 16;
    return true;
  }
  B.takeDamage = takeDamage;

  function runRepair(dt) {
    if (damageCool > 0) damageCool -= dt;
    if (!breaches.length) { degradeAt = 0; return; }

    for (let i = breaches.length - 1; i >= 0; i--) {
      const b = breaches[i];
      b.t += dt;
      const prog = Math.min(1, b.t / b.dur);
      if (prog >= 1) {
        breaches.splice(i, 1);
        if (window.Instruments && Instruments.setRepair) Instruments.setRepair(b.sec, false);
        B.log.push(`sector ${b.sec} sealed · integrity ${rint(94, 99)}% · nominal`, "good");
        continue;
      }
      if (b.t >= b.next) {
        b.next = b.t + b.dur * rnd(0.26, 0.4);
        const pct = Math.round((b.integrity + (1 - b.integrity) * prog) * 100);
        B.log.push(pickOne(REPAIR_STEP)(b.sec, pct), "rep");
      }
    }

    degradeAt += dt;
    if (degradeAt > 11 && breaches.length) {
      degradeAt = 0;
      B.log.push(pickOne(DEGRADED)(pickOne(breaches)), "warn");
    }
  }
  B.runRepair = runRepair;

  function idleLine() {
    const z = ZONES[zoneAt(B.camX)] || ZONES.void;
    const heat = zoneHeat(zoneAt(B.camX));
    const r = Math.random();

    if (z.crit.length && r < z.p.crit * heat && damageCool <= 0 && breaches.length < MAX_BREACH) {
      const c = pickOne(z.crit);
      B.log.push(c.t(), "crit");
      if (!takeDamage(c.label, c.sev)) B.log.push(pickOne(ERR_RESP)());
      return;
    }
    if (z.err.length && r < (z.p.crit + z.p.err) * heat) {
      B.log.push(pickOne(z.err)(), "err");
      if (Math.random() < 0.7) B.log.push(pickOne(ERR_RESP)());
      return;
    }
    if (z.warn.length && r < (z.p.crit + z.p.err + z.p.warn) * heat) {
      B.log.push(pickOne(z.warn)(), "warn");
      return;
    }
    B.log.push(pickOne(z.read.concat(ANY, fuelPool()))());
  }
  let readingAt = 0;
  let nextIdle = 3.5;

  /* which landmark's voice the signal instrument should show */
  const VOICE_OF = {
    "bnote-land": "mainland", "bnote-rex": "rex", "bnote-root": "root",
    "bnote-watcher": "watcher", "bnote-bridge": "bridge", "bnote-future": "future",
    "bnote-void": "void",
    "bnote-planet-zero": "zero", "bnote-planet-voidscape": "voidscape",
    "bnote-planet-heavylight": "heavylight", "bnote-planet-conclusus": "conclusus",
  };

  B.lastRegion = ""; B.nearest = null;
  function checkRegion() {
    let near = null, nd = Infinity;
    for (const m of activeMarks()) {
      const d = Math.abs(B.camX - m.cam);
      if (d < SLOT * 1.6 && d < nd) { near = m; nd = d; }
    }
    B.nearest = near;
    const name = near ? near.name : "open span";
    if (name === B.lastRegion) return;
    B.lastRegion = name;
    if (near) B.log.push(`${B.sceneMode === "gamedev" ? "approaching" : "entering"} ${near.name.toLowerCase()} — ${near.sub.toLowerCase()}`, "loc");
    else B.log.push("open span · nothing charted here", "loc");
  }
  B.checkRegion = checkRegion;

  /* the census only reports in, it doesn't sit on the panel — void only.
     It syncs its mark on arrival, so the first line is a delta and not
     the whole counter, and it speaks rarely enough to stay a texture. */
  const CENSUS = [
    n => `filed ${fmt(n)} more · remainder unknown`,
    n => `census +${fmt(n)} · ${fmt(B.catalogued)} on record`,
    n => `${fmt(n)} new entries · ${rint(2, 40)} unresolved`,
    n => `intake ${fmt(n)} · backlog ${fmt(rint(4000, 90000))}`,
  ];
  let filedMark = 0, filedAt = 0, filedIn = false, filedGap = 16;
  function reportFiled(dt) {
    const inCity = B.sceneMode === "void" && Math.abs(B.camX - LAND.mainland) < SLOT * 1.4;
    if (!inCity) { filedAt = 0; filedIn = false; return; }
    if (!filedIn) { filedIn = true; filedMark = B.catalogued; filedAt = 0; filedGap = 14 + Math.random() * 12; }
    filedAt += dt;
    if (filedAt > filedGap) {
      filedAt = 0;
      filedGap = 14 + Math.random() * 12;
      const since = Math.round(B.catalogued - filedMark);
      filedMark = B.catalogued;
      if (since > 0) B.log.push(pickOne(CENSUS)(since));
    }
  }
  B.reportFiled = reportFiled;

  let youEl, youPct = null;
  let movingNow = false;
  function updateHUD(dt) {
    if (youEl === undefined) youEl = document.getElementById("byou");
    if (youEl) {
      const pct = (B.camX - CAM.min) / (CAM.max - CAM.min) * 100;
      if (pct !== youPct) { youEl.style.left = pct + "%"; youPct = pct; }
    }

    if (B.sceneMode === "void" && Math.abs(B.camX - LAND.mainland) < SLOT * 1.4)
      B.catalogued += (160 + Math.abs(B.vel) * 0.02) * dt;

    checkRegion();
    reportFiled(dt);
    runRepair(dt);

    readingAt += dt;
    if (readingAt > nextIdle && B.log.idle) {
      readingAt = 0;
      nextIdle = 3.2 + Math.random() * 3.4;
      idleLine();
    }
    B.log.run(dt);

    const moving = Math.abs(B.vel) > 200;
    if (moving !== movingNow) { movingNow = moving; host.classList.toggle("moving", moving); }
  }
  B.updateHUD = updateHUD;

  /* canvas-only half of the HUD: runs after the frame's DOM writes, so the
     font sets inside don't force a second style recalculation */
  function drawInstruments(dt) {
    if (B.stepEnv) B.stepEnv(dt);
    if (window.Instruments) {
      const st = B.ship ? Voidship.stats(B.ship) : null;
      Instruments.draw(dt, {
        camX: B.camX, vel: B.vel,
        speedN: st ? st.speedN : Math.min(1, Math.abs(B.vel) / CAM.maxFling),
        chaos: B.chaosNow,
        future: B.futureNow,
        env: B.env,
        spanPct: (CAM.max - B.camX) / (CAM.max - CAM.min) * 100,
        travelled: B.travelled,
        region: B.lastRegion,
        voice: B.nearest ? (VOICE_OF[B.nearest.id] || "void")
                       : (B.futureNow > 0.45 ? "future" : "void"),
        marks: activeMarks().map(m => ({
          id: m.id, cam: m.cam, oy: m.oy, name: m.name,
          claimed: !!(window.XP && XP.has("beacon-" + m.id)),
        })),
        ship: st,
        shipOy: B.ship && B.H ? B.ship.y / B.H : null,
      });
    }
  }
  B.drawInstruments = drawInstruments;
})();
