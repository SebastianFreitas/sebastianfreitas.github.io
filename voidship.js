/* ===========================================================
   VOIDSHIP — travel by burn, not by drag.

   The ship sits near the centre of the hero. Holding the pointer
   builds thrust toward it; release and the drive brakes so you
   stop on the mark instead of sailing through. Fuel is finite
   until a later unlock makes it infinite. Beacons are claimed
   when the hull reaches them, not when you click them.

   Bridge owns the camera number; this module owns the craft.
   =========================================================== */

window.Voidship = (function () {
  const { approach, clamp } = Util;

  const LAMP = [245, 208, 107];

  /* Tunables that later unlocks multiply. Keep them named. */
  const BASE = {
    accelTau: 0.30,   // s, velocity time constant when speeding up (world x)
    brakeTau: 0.07,   // s, when slowing/reversing: full stop in ~0.3 s
    yAccelTau: 0.18,
    yBrakeTau: 0.06,
    maxSpeed: 9000,   // world u/s at holdT 0
    holdBoost: 3.4,   // cruise multiplier at holdT 1 (stats only)
    holdBuild: 1.35,  // s of held far pointer to reach holdT 1
    holdDecay: 1.6,   // s to bleed holdT back to 0
    brakeX: 14000,    // u/s², arrive profile v = sqrt(2*brakeX*d)
    brakeY: 2400,     // px/s²
    yMax: 900,        // px/s
    yBand: 0.24,
    farUnits: 600,    // a held pointer further than this = cruise, nearer = arrive
    limpSpeed: 0.25,  // cruise fraction with dry tanks
    turnTime: 0.6,    // s for a full 180° yaw
    pitchMax: 0.08,   // rad of nose lift at full climb
    fuelMax: 100,
    burnFull: 7.5,
    fuelRegen: 14,
    size: 96,         // nose-to-tail px (bridge divides by 1.5 on phones)
    arriveWorld: 18,
    arriveY: 2.5,
    fumeCap: 140,
    accelMax: 9000,   // u/s², cap on speed gain per second: the hull is heavy
    spoolUp: 0.55,    // s for the drive to reach full push from cold
    spoolDown: 0.20,  // s for it to relax when not pushing
    phase2At: 0.28,   // speedN where the sustainers take over (base cruise)
    phase3At: 0.70,   // speedN where the full burn begins
    sparkCap: 48,
    trailPts: 12,     // points kept per streamer
    trailLife: 0.34,  // s a streamer point lives
    trailRate: 45,    // streamer samples per second
  };

  function rgba(c, a) { return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }

  function create() {
    return {
      y: 0, vy: 0, vel: 0,
      camX: 0,            // cache of the last camX seen by step (setThrusting needs it)
      yaw: 0,              // 0 = nose right, Math.PI = nose left
      yawTarget: 0,
      face: 1,             // cos(yaw): the sprite's x-scale, sign = facing
      pitch: 0,             // canvas rotation, nose rises on a climb
      thrusting: false, holdT: 0,
      targetX: null, targetY: null, courseMark: null, arrived: true,
      fuel: BASE.fuelMax, fuelMax: BASE.fuelMax, infinite: false,
      thrustAmt: 0,
      fumes: [], fumeAcc: 0, ringAcc: 0,
      bob: 0, alpha: 1,
      power: { accel: 1, maxSpeed: 1, fuelMax: 1, burn: 1 },
      spool: 0, speedN: 0, phase: 0, sustain: 0, strain: 0, flare: 0, jet: 0,
      burnPrev: false, igniteCd: 0,
      sustAcc: 0, jetAcc: 0, sparkAcc: 0, trailAcc: 0,
      sparks: [], trails: [[], [], [], []], heads: [[0, 0], [0, 0], [0, 0], [0, 0]],
    };
  }

  function deckY(H) { return H * 0.42; }

  function resize(ship, W, H) {
    if (!W || !H) return;
    if (!ship._seated) {
      ship.y = deckY(H);
      ship._seated = true;
    }
    const mid = deckY(H);
    const band = H * BASE.yBand;
    ship.y = Math.min(mid + band, Math.max(mid - band, ship.y));
  }

  function addFuel(ship, n) {
    if (!ship || ship.infinite || !(n > 0)) return 0;
    const before = ship.fuel;
    ship.fuel = Math.min(ship.fuelMax, ship.fuel + n);
    return ship.fuel - before;
  }

  function setPower(ship, p) {
    Object.assign(ship.power, p || {});
    ship.fuelMax = BASE.fuelMax * ship.power.fuelMax;
    ship.fuel = Math.min(ship.fuel, ship.fuelMax);
  }

  /* click / hold: set a course. mark = beacon object or null. */
  function setCourse(ship, worldX, screenY, mark) {
    ship.targetX = worldX;
    ship.targetY = screenY;
    ship.courseMark = mark || null;
    ship.arrived = false;
  }

  function setThrusting(ship, on) {
    on = !!on;
    if (ship.thrusting === on) return;
    ship.thrusting = on;
    if (on || !hasTarget(ship) || ship.courseMark) return;
    // released a free hold: keep the point only if the ship can still stop on it
    const dx = ship.targetX - ship.camX;
    const stopV = Math.sqrt(2 * BASE.brakeX * Math.abs(dx)) * 1.1 + 40;
    const towards = dx * ship.vel >= 0 || Math.abs(ship.vel) < 400;
    if (!(Math.abs(ship.vel) <= stopV && towards)) clearCourse(ship);
  }

  function clearCourse(ship) {
    ship.targetX = null;
    ship.targetY = null;
    ship.courseMark = null;
    ship.arrived = true;
  }

  /* ---- integration ------------------------------------------------ */

  function ease(v, want, dt, tauUp, tauDown) {
    const speeding = Math.abs(want) > Math.abs(v) && (Math.sign(want) === Math.sign(v) || v === 0);
    return v + (want - v) * (1 - Math.exp(-dt / (speeding ? tauUp : tauDown)));
  }

  function canBurn(ship) { return ship.infinite || ship.fuel > 0.05; }
  function hasTarget(ship) { return ship.targetX != null && ship.targetY != null; }

  function step(ship, dt, env) {
    let camX = env.camX;
    if (env.frozen) {
      ship.vel = ship.vy = 0;
      ship.thrustAmt = approach(ship.thrustAmt, 0, 8, dt || 0.016);
      ship.bob += dt || 0.016;
      ship.camX = camX;
      ship.spool = 0; ship.strain = 0; ship.sustain = 0; ship.jet = 0; ship.flare = 0; ship.sparks.length = 0; for (const tr of ship.trails) tr.length = 0;
      return { camX, vel: 0 };
    }
    if (!(dt > 0)) return { camX, vel: ship.vel };
    dt = Math.min(dt, 0.05);

    resize(ship, env.W, env.H);

    const P = ship.power;
    const pxPerUnit = env.W / (env.viewUnits || 2100);
    const L = BASE.size;

    let dx = 0, dy = 0;
    if (hasTarget(ship)) {
      dx = ship.targetX - camX;
      dy = ship.targetY - ship.y;
    }

    const far = hasTarget(ship) && ship.thrusting && !ship.courseMark && Math.abs(dx) > BASE.farUnits;
    const charging = far && canBurn(ship);
    ship.holdT = clamp(ship.holdT + (charging ? dt / BASE.holdBuild : -dt / BASE.holdDecay), 0, 1);

    let cruise = BASE.maxSpeed * P.maxSpeed * (1 + 2.4 * ship.holdT * ship.holdT);
    if (!canBurn(ship)) cruise = BASE.maxSpeed * P.maxSpeed * BASE.limpSpeed;

    let vWantX = 0, vWantY = 0, burning = false, demand = 0;
    const active = hasTarget(ship) && (ship.thrusting || !ship.arrived);
    if (active) {
      const sx = Math.sign(dx), sy = Math.sign(dy);
      vWantX = far ? sx * cruise : sx * Math.min(cruise, Math.sqrt(2 * BASE.brakeX * Math.abs(dx)));
      vWantY = sy * Math.min(BASE.yMax, Math.sqrt(2 * BASE.brakeY * Math.abs(dy)));
      if (Math.abs(dx) < BASE.arriveWorld) vWantX = 0;
      if (Math.abs(dy) < BASE.arriveY) vWantY = 0;
      demand = far ? 1 : clamp(Math.abs(vWantX) / cruise, 0, 1);
      burning = canBurn(ship) && (Math.abs(vWantX) > 30 || Math.abs(vWantY) > 10);
    }

    if (Math.abs(vWantX) > 150) ship.yawTarget = vWantX > 0 ? 0 : Math.PI;
    if (vWantX !== 0) vWantX *= clamp((Math.sign(vWantX) * ship.face + 1) / 2, 0.12, 1);
    const stepA = Math.PI / BASE.turnTime * dt;
    ship.yaw += clamp(ship.yawTarget - ship.yaw, -stepA, stepA);
    if (Math.abs(ship.yawTarget - ship.yaw) < 1e-3) ship.yaw = ship.yawTarget;
    ship.face = Math.cos(ship.yaw);
    if (ship.yaw === 0) ship.face = 1;
    if (ship.yaw === Math.PI) ship.face = -1;

    const prevVel = ship.vel;
    const prevVy = ship.vy;
    const speedingX = Math.abs(vWantX) > Math.abs(ship.vel) && (Math.sign(vWantX) === Math.sign(ship.vel) || ship.vel === 0);
    ship.spool = clamp(ship.spool + ((speedingX && burning) ? dt / BASE.spoolUp : -dt / BASE.spoolDown), 0, 1);
    if (speedingX) {
      // heavy hull: speed may only grow at aMax, and the drive spools up from cold;
      // the exponential term only shapes the last approach to the wanted speed
      const aMax = BASE.accelMax * P.accel * (0.10 + 0.90 * ship.spool * ship.spool);
      const dv = (vWantX - ship.vel) * (1 - Math.exp(-dt / BASE.accelTau));
      ship.vel += clamp(dv, -aMax * dt, aMax * dt);
    } else {
      ship.vel = ease(ship.vel, vWantX, dt, BASE.accelTau, BASE.brakeTau);
    }
    ship.vy = ease(ship.vy, vWantY, dt, BASE.yAccelTau, BASE.yBrakeTau);
    if (vWantX === 0 && Math.abs(ship.vel) < 6) ship.vel = 0;
    if (vWantY === 0 && Math.abs(ship.vy) < 2) ship.vy = 0;
    const topSpeed = BASE.maxSpeed * BASE.holdBoost * P.maxSpeed;
    ship.speedN = Math.min(1, Math.abs(ship.vel) / topSpeed);
    const w2 = clamp((ship.speedN - BASE.phase2At) / 0.10, 0, 1);   // sustainers, 0.28→0.38
    const w3 = clamp((ship.speedN - BASE.phase3At) / 0.12, 0, 1);   // full burn, 0.70→0.82
    ship.sustain = w2;
    ship.strain = w3;
    ship.phase = Math.abs(ship.vel) < 6 ? 0 : (w3 > 0 ? 3 : (w2 > 0 ? 2 : 1));

    const prevX = camX, prevY = ship.y;
    camX += ship.vel * dt;
    ship.y += ship.vy * dt;
    const mid = deckY(env.H);
    const band = env.H * BASE.yBand;
    const top = mid - band, bot = mid + band;
    if (ship.y < top) { ship.y = top; if (ship.vy < 0) ship.vy = 0; }
    if (ship.y > bot) { ship.y = bot; if (ship.vy > 0) ship.vy = 0; }

    if (hasTarget(ship)) {
      let atX = false, atY = false;
      if ((!far && (ship.targetX - prevX) * (ship.targetX - camX) <= 0) ||
        (Math.abs(ship.targetX - camX) < BASE.arriveWorld && Math.abs(ship.vel) < 40)) {
        camX = ship.targetX; ship.vel = 0; atX = true;
      }
      if ((ship.targetY - prevY) * (ship.targetY - ship.y) <= 0 ||
        (Math.abs(ship.targetY - ship.y) < BASE.arriveY && Math.abs(ship.vy) < 8)) {
        ship.y = ship.targetY; ship.vy = 0; atY = true;
      }
      if (atX && atY) {
        ship.arrived = true;
        if (!ship.thrusting) clearCourse(ship);
      }
    }

    if (Math.abs(prevVel) >= 1500 && ship.vel === 0) {
      ship.fumes.push({ x: env.W * 0.5, y: ship.y, bx: 0, vx: 0, vy: 0, age: 0, life: 0.55, r0: 0.08 * L, grow: 0.9 * L, kind: 2, seed: 0 });
    }

    if (burning && !ship.infinite) {
      ship.fuel = Math.max(0, ship.fuel - BASE.burnFull * P.burn * (0.35 + 0.65 * demand) * dt);
    } else {
      ship.fuel = Math.min(ship.fuelMax, ship.fuel + BASE.fuelRegen * P.fuelMax * dt);
    }

    ship.thrustAmt = approach(ship.thrustAmt, burning ? 0.45 + 0.55 * demand : 0, burning ? 10 : 5, dt);

    const want = BASE.pitchMax * clamp(ship.vy / BASE.yMax, -1, 1) * (ship.face >= 0 ? 1 : -1);
    ship.pitch = approach(ship.pitch, want, 4, dt);
    if (ship.vy === 0 && Math.abs(ship.pitch) < 0.002) ship.pitch = 0;

    // RCS jets fire against the vertical push: belly nozzles when the hull is shoved up
    // (launching a climb, braking a descent), deck nozzles when it is shoved down.
    // They catch fast and let go slowly so a short hop still shows both bursts.
    const ay = (ship.vy - prevVy) / dt;
    const jw = clamp(ay / (1.5 * BASE.brakeY), -1, 1);
    ship.jet = approach(ship.jet, jw, Math.abs(jw) > Math.abs(ship.jet) ? 14 : 6, dt);
    if (ship.vy === 0 && Math.abs(ship.jet) < 0.02) ship.jet = 0;

    ship.bob += dt;

    const rs = L / 200, dir = ship.face >= 0 ? 1 : -1, EM = (window.VoidshipArt && VoidshipArt.EMIT) || [];
    const ART = window.VoidshipArt || {};
    const SUST = ART.SUST || [], JETS = ART.JETS || { belly: [], top: [] }, TSEATS = ART.TRAIL_SEATS || [];
    const half = Util.reduced() ? 0.5 : 1;
    const seatX = (s) => env.W * 0.5 + s.x * L * ship.face, seatY = (s) => ship.y + s.y * L;

    // ignition: one big flash from the main drive when a real burn starts
    ship.igniteCd = Math.max(0, ship.igniteCd - dt);
    if (burning && !ship.burnPrev && demand >= 0.4 && ship.igniteCd === 0 && EM.length) {
      ship.igniteCd = 0.6;
      ship.flare = 1;
      const e = EM[1] || EM[0];
      ship.fumes.push({ x: seatX(e), y: seatY(e), bx: -dir * 60 * rs, vx: -dir * 60 * rs, vy: 0, age: 0, life: 0.5, r0: 0.03 * L, grow: 1.4 * L, kind: 2, seed: 0 });
      for (let n = Math.round(14 * half); n > 0; n--) {
        const bx = -dir * (320 + Math.random() * 320) * rs;
        ship.fumes.push({ x: seatX(e), y: seatY(e), bx, vx: bx, vy: (Math.random() - 0.5) * 90 * rs,
          age: 0, life: 0.7 + Math.random() * 0.5, r0: (4 + Math.random() * 5) * rs, grow: (34 + Math.random() * 30) * rs,
          kind: 0, seed: Math.random() });
      }
    }
    ship.burnPrev = burning;
    ship.flare = approach(ship.flare, 0, 5, dt);
    if (ship.flare < 0.01) ship.flare = 0;

    if (ship.thrustAmt > 0.06 && EM.length) {
      // main drive: existing puffs; the sustainers take over part of the load past phase 1
      ship.fumeAcc += (10 + 70 * ship.thrustAmt) * (1 - 0.55 * w2) * half * dt;
      let n = Math.floor(ship.fumeAcc); ship.fumeAcc -= n;
      for (; n > 0; n--) {
        const e = EM[Math.floor(Math.random() * EM.length)];
        const bx = -dir * (120 + Math.random() * 280) * rs;
        ship.fumes.push({
          x: env.W * 0.5 + e.x * L * ship.face, y: ship.y + e.y * L,
          bx, vx: bx, vy: (Math.random() - 0.5) * 40 * rs,
          age: 0, life: 1.0 + Math.random() * 1.1,
          r0: (3 + Math.random() * 5) * rs, grow: (16 + Math.random() * 26) * rs,
          kind: Math.random() < 0.18 ? 1 : 0, seed: Math.random(),
        });
      }
      if (ship.thrustAmt > 0.3) {
        ship.ringAcc += dt * half;
        if (ship.ringAcc >= 0.16) {
          ship.ringAcc = 0;
          const e = EM[1] || EM[0];
          ship.fumes.push({ x: env.W * 0.5 + e.x * L * ship.face, y: ship.y + e.y * L,
            bx: -dir * 90 * rs, vx: -dir * 90 * rs, vy: 0, age: 0, life: 0.7,
            r0: 2 * rs, grow: 70 * rs, kind: 1, seed: Math.random() });
        }
      }
      // sustainers (phase 2+): thin streaks from the aft spar tips
      if (ship.thrustAmt > 0.3 && w2 > 0 && SUST.length) {
        ship.sustAcc += (8 + 30 * w2) * half * dt;
        let n = Math.floor(ship.sustAcc); ship.sustAcc -= n;
        for (; n > 0; n--) {
          const s = SUST[Math.random() < 0.5 ? 0 : 1] || SUST[0];
          const bx = -dir * (420 + Math.random() * 320) * rs;
          ship.fumes.push({ x: seatX(s), y: seatY(s), bx, vx: bx, vy: (Math.random() - 0.5) * 16 * rs,
            age: 0, life: 0.30 + Math.random() * 0.30, r0: (7 + Math.random() * 12) * rs, grow: 0, kind: 3, seed: Math.random() });
        }
      }
    }
    // vertical jets: small quick puffs leaving the firing nozzles
    {
      const ja = Math.abs(ship.jet);
      if (ja > 0.05) {
        const seats = ship.jet < 0 ? JETS.belly : JETS.top, sgn = ship.jet < 0 ? 1 : -1;
        if (seats.length) {
          ship.jetAcc += 9 * ja * half * dt;
          let n = Math.floor(ship.jetAcc); ship.jetAcc -= n;
          for (; n > 0; n--) {
            const s = seats[Math.random() < 0.5 ? 0 : 1] || seats[0];
            ship.fumes.push({ x: seatX(s), y: seatY(s), bx: 0, vx: 0, vy: sgn * (110 + Math.random() * 70) * rs,
              age: 0, life: 0.30 + Math.random() * 0.15, r0: (1.5 + Math.random() * 1.5) * rs, grow: 10 * rs, kind: 0, seed: Math.random() });
          }
        }
      } else ship.jetAcc = 0;
    }
    // full burn (phase 3): void friction sparks whipping past the hull
    if (w3 > 0) {
      ship.sparkAcc += (30 + 60 * w3) * half * dt;
      let n = Math.floor(ship.sparkAcc); ship.sparkAcc -= n;
      for (; n > 0; n--) {
        ship.sparks.push({ x: env.W * 0.5 + ship.face * (0.10 + Math.random() * 0.9) * L, y: ship.y + (Math.random() - 0.5) * 0.8 * L,
          vx: -dir * (2600 + Math.random() * 1400) * rs, vy: (Math.random() - 0.5) * 40 * rs,
          age: 0, life: 0.22 + Math.random() * 0.2, seed: Math.random() });
      }
      while (ship.sparks.length > BASE.sparkCap) ship.sparks.shift();
    } else ship.sparkAcc = 0;
    // streamers (phase 3): a short ribbon off three hull tips, sampled on a fixed clock
    {
      const bobY = Math.sin(ship.bob * 0.6) * 1.5, c = Math.cos(ship.pitch), sn = Math.sin(ship.pitch);
      for (let i = 0; i < ship.trails.length && i < TSEATS.length; i++) {
        const fx = TSEATS[i].x * L * ship.face, fy = TSEATS[i].y * L;
        ship.heads[i][0] = env.W * 0.5 + fx * c - fy * sn;
        ship.heads[i][1] = ship.y + bobY + fx * sn + fy * c;
      }
      ship.trailAcc += dt;
      if (w3 > 0.02 && TSEATS.length) {
        if (ship.trailAcc >= 1 / BASE.trailRate) {
          ship.trailAcc = 0;
          const vx = -dir * (600 + 1400 * ship.speedN) * rs;
          for (let i = 0; i < ship.trails.length && i < TSEATS.length; i++) {
            const tr = ship.trails[i];
            tr.push({ x: ship.heads[i][0], y: ship.heads[i][1], vx: vx * (0.9 + 0.2 * Math.random()), vy: (Math.random() - 0.5) * 70 * rs, age: 0, a: w3, seed: Math.random() });
            while (tr.length > BASE.trailPts) tr.shift();
          }
        }
      } else ship.trailAcc = Math.min(ship.trailAcc, 1 / BASE.trailRate);
    }
    while (ship.fumes.length > BASE.fumeCap) ship.fumes.shift();
    const dvx = (ship.vel - prevVel) * pxPerUnit;   // the hull's speed change this frame, px/s
    const dvy = ship.vy - prevVy;
    const relax = 1 - Math.exp(-2 * dt), ky = Math.exp(-1.8 * dt), lim = 1400 * rs;
    for (let i = ship.fumes.length - 1; i >= 0; i--) {
      const p = ship.fumes[i];
      p.age += dt;
      if (p.age >= p.life) { ship.fumes.splice(i, 1); continue; }
      // partial inertia: when the hull brakes the plume surges ahead of it,
      // when it accelerates the plume is left behind; then it settles back
      // onto its own drift
      p.vx = clamp(p.vx - dvx * 0.2, p.bx - lim, p.bx + lim);
      p.vy -= dvy * 0.5;
      p.vx += (p.bx - p.vx) * relax;
      p.vy *= ky;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    for (let i = ship.sparks.length - 1; i >= 0; i--) {
      const p = ship.sparks[i];
      p.age += dt;
      if (p.age >= p.life) { ship.sparks.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    for (const tr of ship.trails) {
      for (let i = tr.length - 1; i >= 0; i--) {
        const q = tr[i];
        q.age += dt;
        if (q.age >= BASE.trailLife) { tr.splice(i, 1); continue; }
        q.x += q.vx * dt;
        q.y += q.vy * dt;
      }
    }

    ship.camX = camX;
    return { camX, vel: ship.vel };
  }

  function settled(ship) {
    return !ship.thrusting && ship.targetX == null && ship.vel === 0 && ship.vy === 0
      && ship.holdT === 0 && ship.thrustAmt < 0.01 && ship.fumes.length === 0
      && ship.yaw === ship.yawTarget && ship.pitch === 0
      && ship.spool === 0 && ship.flare === 0 && ship.jet === 0 && ship.sparks.length === 0 && ship.trails.every(tr => tr.length === 0);
  }

  function screenPos(ship, W) {
    return { x: W * 0.5, y: ship.y };
  }

  /* true when the hull is on a screen point */
  function touching(ship, W, px, py, radius) {
    const p = screenPos(ship, W);
    return Math.hypot(px - p.x, py - p.y) < (radius || 28);
  }

  /* beacon claim: must actually reach the mark — screen overlap plus
     a tight world seat. A wide world-only pad claimed on-screen clicks. */
  function touchingMark(ship, camX, mark, screen, pad) {
    const worldPad = pad != null ? pad : 220;
    if (Math.abs(camX - mark.x) > worldPad) return false;
    if (!screen) return false;
    const p = screenPos(ship, screen.W);
    const hit = screen.hit != null ? screen.hit : 34;
    return Math.hypot(screen.x - p.x, screen.y - p.y) < hit;
  }

  function stats(ship) {
    return {
      fuel: ship.fuel,
      fuelMax: ship.fuelMax,
      fuelN: ship.infinite ? 1 : ship.fuel / ship.fuelMax,
      infinite: ship.infinite,
      vel: ship.vel,
      speedN: Math.min(1, Math.abs(ship.vel) / (BASE.maxSpeed * BASE.holdBoost * ship.power.maxSpeed)),
      holdT: ship.holdT,
      thrust: ship.thrustAmt,
      burning: ship.thrustAmt > 0.08,
      arrived: ship.arrived,
      courseMark: ship.courseMark && ship.courseMark.id,
      courseName: ship.courseMark && ship.courseMark.name,
      angle: ship.yaw,
      bank: ship.pitch,
      vy: ship.vy,
      power: ship.power,
      face: ship.face,
      phase: ship.phase, spool: ship.spool, strain: ship.strain, sustain: ship.sustain, jet: ship.jet,
    };
  }

  /* ---- drawing ---------------------------------------------------- */

  function draw(ship, ctx, env) {
    const { W, H } = env;
    if (!ship._seated) resize(ship, W, H);
    if (!ship._seated) return;

    const L = BASE.size, t = env.t || 0, pxPerUnit = env.W / (env.viewUnits || 2100), p = screenPos(ship, env.W);
    const a = ship.alpha == null ? 1 : ship.alpha;
    if (a < 0.01) return;

    ctx.save();
    ctx.globalAlpha = a;

    // destination ghost — only for a locked beacon or a released stop.
    // free-hold steering retargets every frame, so a lead line thrashes.
    const showCue = hasTarget(ship) && !ship.arrived &&
      (ship.courseMark || !ship.thrusting);
    if (showCue) {
      const tx = W * 0.5 + (ship.targetX - env.camX) * (W / env.viewUnits);
      const ty = ship.targetY;
      const pulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 4));
      ctx.save();
      ctx.strokeStyle = rgba(LAMP, 0.22 * pulse);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(tx, ty, 10 + pulse * 4, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = rgba(LAMP, 0.55 * pulse);
      ctx.beginPath(); ctx.arc(tx, ty, 2.2, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    if (window.VoidshipArt) VoidshipArt.drawFumes(ctx, ship.fumes, { W: env.W, H: env.H, camX: env.camX, pxPerUnit, t });
    if (window.VoidshipArt && VoidshipArt.drawWake) VoidshipArt.drawWake(ctx, ship, { W: env.W, H: env.H, t, trailLife: BASE.trailLife, rs: L / 200 });

    const bobY = Math.sin(ship.bob * 0.6) * 1.5;
    ctx.save();
    const sh = Util.reduced() ? 0 : ship.strain;
    ctx.translate(p.x + sh * 1.1 * Math.sin(t * 73.0), p.y + bobY + sh * 0.8 * Math.sin(t * 59.0));
    ctx.rotate(ship.pitch);
    const d = Math.abs(ship.face);                        // 1 side-on … 0 front-on
    const fk = clamp((0.35 - d) / 0.12, 0, 1);            // front view weight
    const sign = ship.face !== 0 ? (ship.face > 0 ? 1 : -1) : (ship.yaw <= Math.PI / 2 ? 1 : -1);
    if (fk < 1 && window.VoidshipArt) {
      ctx.save();
      ctx.globalAlpha *= 1 - fk;
      ctx.scale(Math.max(d, 0.30) * sign, 1);
      VoidshipArt.drawHull(ctx, ship, L, t);
      ctx.restore();
    }
    if (fk > 0.01 && window.VoidshipArt) VoidshipArt.drawFront(ctx, ship, L, t, fk);
    ctx.restore();

    ctx.restore();
  }

  return {
    BASE, create, resize, setPower, setCourse, setThrusting, clearCourse,
    step, draw, screenPos, touching, touchingMark, stats, canBurn, addFuel, settled,
  };
})();
