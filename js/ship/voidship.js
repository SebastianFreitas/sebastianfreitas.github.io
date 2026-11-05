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
    maxSpeed: 9000,   // world u/s at holdT 0
    holdBoost: 3.4,   // cruise multiplier at holdT 1 (stats only)
    holdBuild: 1.35,  // s of held far pointer to reach holdT 1
    holdDecay: 1.6,   // s to bleed holdT back to 0
    brakeX: 14000,    // u/s², arrive profile v = sqrt(2*brakeX*d)
    brakeY: 700,      // px/s², arrive profile v = sqrt(2*brakeY*d)
    yMax: 420,        // px/s at rest
    yMaxFast: 0.5,    // fraction of yMax left at base cruise: fast sideways = shallow climbs
    yAccel: 520,      // px/s² the belly thrusters can add: the hull is heavy
    yBrake: 1200,     // px/s² when catching a vertical speed
    yTau: 0.06,       // s, shapes only the last approach to the wanted vertical speed
    yBand: 0.24,
    farUnits: 600,    // a held pointer further than this = cruise, nearer = arrive
    limpSpeed: 0.25,  // cruise fraction with dry tanks
    turnTime: 0.72,   // s for a full 180° yaw
    pitchMax: 0.08,   // rad, cap on the bank the HUD reads (the drawn nose goes to 90°)
    pitchRef: 4000,   // px/s of virtual headway: sets how much the bank reading lifts at rest
    pitchLead: 0.03,  // rad the bank reading leads a climb
    pitchRate: 0.14,  // rad/s cap on how fast the bank reading swings
    pitchTurnMax: Math.PI * 5 / 9,  // rad/s, top turn rate of the drawn nose (100°/s); the turn flames scale to it
    pitchAccel: Math.PI * 5 / 3, // rad/s², how fast the nose's turn rate can change (300°/s²)
    pitchEase: 3.5,  // 1/s, bank reading settles toward its target at this rate
    aimDead: 28,     // px round the ship where the aim holds its last angle
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
      sideSet: false,     // the facing has been decided for this press
      face: 1,             // cos(yaw): the sprite's x-scale, sign = facing
      pitch: 0,             // canvas rotation, full circle (-PI..PI], down is positive; turns by distance travelled, hangs after release
      pitchW: 0,            // rad/s, angular velocity of elev (the nose's spin in the hull's own frame)
      elev: 0,              // the nose's elevation as if facing right: pitch = elev facing right, -elev facing left; the 3D turn keeps it
      bankQ: 0,             // old flight-path nose; only stats().bank reads it
      thrusting: false, holdT: 0,
      go: false, aimErr: null,   // motors on (nose within ~10° of the press aim, held to 30°); the nose's last error
      targetX: null, targetY: null, courseMark: null, arrived: true,
      fuel: BASE.fuelMax, fuelMax: BASE.fuelMax, infinite: false,
      thrustAmt: 0,
      fumes: [], fumeAcc: 0, ringAcc: 0, exA: 1, rcsAcc: 0,
      bob: 0, alpha: 1,
      power: { accel: 1, maxSpeed: 1, fuelMax: 1, burn: 1 },
      spool: 0, speedN: 0, phase: 0, sustain: 0, strain: 0, flare: 0, jet: 0, turnFire: 0,
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
    const lim = yLimits(ship, H);
    ship.y = Math.min(lim.bot, Math.max(lim.top, ship.y));
  }

  /* the y band for the hull's centre; a steep nose or tail may poke past it, so tilting toward
     an edge never pushes the ship away from it (owner, 2026-11-05) */
  function yLimits(ship, H) {
    const mid = deckY(H), band = H * BASE.yBand;
    return { top: mid - band, bot: mid + band };
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
    if (mark) ship.aimPx = null;
  }

  /* the raw pointer, host pixels, unclamped: the nose aims at it while the course stays in the band */
  function setAim(ship, px, py) {
    ship.aimPx = px;
    ship.aimPy = py;
  }

  function setThrusting(ship, on) {
    on = !!on;
    if (ship.thrusting === on) return;
    ship.thrusting = on;
    if (on) ship.sideSet = false;   // a new press re-decides the facing
    if (on || !hasTarget(ship) || ship.courseMark) return;
    // released before the motors lit (a tap): the course stays, the ship finishes turning, then flies there
    if (ship.aimPx != null && !ship.go) return;
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
    ship.aimPx = null;
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
      ship.spool = 0; ship.strain = 0; ship.sustain = 0; ship.jet = 0; ship.turnFire = 0; ship.flare = 0; ship.sparks.length = 0; for (const tr of ship.trails) tr.length = 0;
      return { camX, vel: 0 };
    }
    if (!(dt > 0)) return { camX, vel: ship.vel };
    dt = Math.min(dt, 0.05);

    resize(ship, env.W, env.H);
    ship.envW = env.W;

    const P = ship.power;
    const pxPerUnit = env.W / (env.viewUnits || 2100);
    const L = BASE.size;

    const yLim = yLimits(ship, env.H);
    const tgtY = hasTarget(ship) ? Math.min(yLim.bot, Math.max(yLim.top, ship.targetY)) : 0;
    let dx = 0, dy = 0;
    if (hasTarget(ship)) {
      dx = ship.targetX - camX;
      dy = tgtY - ship.y;
    }

    const far = hasTarget(ship) && ship.thrusting && !ship.courseMark && Math.abs(dx) > BASE.farUnits;
    const charging = far && canBurn(ship) && ship.go;   // the boost is earned in flight, never while the nose swings round
    ship.holdT = clamp(ship.holdT + (charging ? dt / BASE.holdBuild : -dt / BASE.holdDecay), 0, 1);

    let cruise = BASE.maxSpeed * P.maxSpeed * (1 + 2.4 * ship.holdT * ship.holdT);
    if (!canBurn(ship)) cruise = BASE.maxSpeed * P.maxSpeed * BASE.limpSpeed;

    // vertical authority: full at rest, down to yMaxFast of it by base cruise speed
    const vFrac = clamp(Math.abs(ship.vel) / (BASE.maxSpeed * P.maxSpeed), 0, 1);
    const yCap = BASE.yMax * (1 - (1 - BASE.yMaxFast) * vFrac);

    let vWantX = 0, vWantY = 0, burning = false, demand = 0, closeHold = false, swinging = false;
    const active = hasTarget(ship) && (ship.thrusting || !ship.arrived);
    if (active) {
      const sx = Math.sign(dx), sy = Math.sign(dy);
      vWantX = far ? sx * cruise : sx * Math.min(cruise, Math.sqrt(2 * BASE.brakeX * Math.abs(dx)));
      vWantY = sy * Math.min(yCap, Math.sqrt(2 * BASE.brakeY * Math.abs(dy)));
      if (Math.abs(dx) < BASE.arriveWorld) vWantX = 0;
      if (Math.abs(dy) < BASE.arriveY) vWantY = 0;
      // a seek flies a straight line to the mark: climb no faster than the path needs,
      // so height and distance run out together instead of an L-shaped hop
      if (!far && Math.abs(dx) >= BASE.arriveWorld && vWantX !== 0) {
        const vLine = Math.abs(vWantX) * Math.abs(dy) / Math.abs(dx);
        if (vLine < Math.abs(vWantY)) vWantY = sy * vLine;
      }
      demand = far ? 1 : clamp(Math.abs(vWantX) / cruise, 0, 1);
      // any flight (a press, a tap's course, a seek) turns the ship first: the motors wait until
      // the nose is on the aim (10°), then keep pushing through small aim changes (30°);
      // once under way they stay lit and push by how much the nose points along the aim, so a
      // steered curve slows into the turn instead of stopping dead (90° off = no push, it brakes)
      const e = ship.aimErr == null ? Math.PI : ship.aimErr;
      const underWay = Math.abs(ship.vel) > 400 || Math.abs(ship.vy) > 40;
      ship.go = e < 0.175 || (ship.go && (e < 0.52 || underWay));
      swinging = e >= 0.175 && canBurn(ship);   // the nose is still coming round to the aim
      if (!ship.go) {
        closeHold = true;
        vWantX = 0; vWantY = 0; demand = 0;
      } else if (e >= 0.52) {
        const k = Math.max(0, Math.cos(e));
        vWantX *= k; vWantY *= k; demand *= k;
      }
      burning = canBurn(ship) && (Math.abs(vWantX) > 30 || Math.abs(vWantY) > 10);
    }

    const stepA = Math.PI / BASE.turnTime * dt;
    // the drawn yaw flips only on a sharp U-turn (below, with the aim)
    ship.yaw += clamp(ship.yawTarget - ship.yaw, -stepA, stepA);
    if (Math.abs(ship.yawTarget - ship.yaw) < 1e-3) ship.yaw = ship.yawTarget;
    ship.face = Math.cos(ship.yaw);
    // flip progress 0..1 and which way the screen swings (-1 yaw rising 0 to 180, +1 falling), for the sideways thrusters
    ship.flip = ship.yaw === ship.yawTarget ? null : { p: ship.yawTarget > ship.yaw ? ship.yaw / Math.PI : 1 - ship.yaw / Math.PI, dx: ship.yawTarget > ship.yaw ? -1 : 1 };
    if (ship.yaw === 0) ship.face = 1;
    if (ship.yaw === Math.PI) ship.face = -1;

    const prevVel = ship.vel;
    const prevVy = ship.vy;
    const speedingX = Math.abs(vWantX) > Math.abs(ship.vel) && (Math.sign(vWantX) === Math.sign(ship.vel) || ship.vel === 0);
    // the drive keeps its heat while the nose swings round (the turn flames are firing), so take-off
    // after a U-turn is quick; a start from rest is still cold and heavy
    if (speedingX && burning) ship.spool = Math.min(1, ship.spool + dt / BASE.spoolUp);
    else if (!swinging) ship.spool = Math.max(0, ship.spool - dt / BASE.spoolDown);
    if (speedingX) {
      // heavy hull: speed may only grow at aMax, and the drive spools up from cold;
      // the exponential term only shapes the last approach to the wanted speed
      const aMax = BASE.accelMax * P.accel * (0.10 + 0.90 * ship.spool * ship.spool);
      const dv = (vWantX - ship.vel) * (1 - Math.exp(-dt / BASE.accelTau));
      ship.vel += clamp(dv, -aMax * dt, aMax * dt);
    } else {
      ship.vel = ease(ship.vel, vWantX, dt, BASE.accelTau, BASE.brakeTau);
    }
    // heavy hull: vertical speed may only change at thruster rate; the exponential
    // term only rounds off the last approach to the wanted speed
    const growingY = Math.abs(vWantY) > Math.abs(ship.vy) && (Math.sign(vWantY) === Math.sign(ship.vy) || ship.vy === 0);
    const ayMax = growingY ? BASE.yAccel : BASE.yBrake;
    const vyGain = (vWantY - ship.vy) * (1 - Math.exp(-dt / BASE.yTau));
    ship.vy += clamp(vyGain, -ayMax * dt, ayMax * dt);
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
    const top = yLim.top, bot = yLim.bot;
    if (ship.y < top) { ship.y = top; if (ship.vy < 0) ship.vy = 0; }
    if (ship.y > bot) { ship.y = bot; if (ship.vy > 0) ship.vy = 0; }

    if (hasTarget(ship) && !closeHold) {
      let atX = false, atY = false;
      if ((!far && (ship.targetX - prevX) * (ship.targetX - camX) <= 0) ||
        (Math.abs(ship.targetX - camX) < BASE.arriveWorld && Math.abs(ship.vel) < 40)) {
        camX = ship.targetX; ship.vel = 0; atX = true;
      }
      if ((tgtY - prevY) * (tgtY - ship.y) <= 0 ||
        (Math.abs(tgtY - ship.y) < BASE.arriveY && Math.abs(ship.vy) < 8)) {
        ship.y = tgtY; ship.vy = 0; atY = true;
      }
      if (atX && atY) {
        ship.arrived = true;
        if (!ship.thrusting) clearCourse(ship);
      }
    }

    if (Math.abs(prevVel) >= 1500 && ship.vel === 0) {
      ship.fumes.push({ x: env.W * 0.5, y: ship.y, bx: 0, vx: 0, vy: 0, age: 0, life: 0.55, r0: 0.08 * L, grow: 0.9 * L, kind: 2, seed: 0 });
    }

    ship.drain = 0;
    if (burning && !ship.infinite) {
      ship.drain = BASE.burnFull * P.burn * (0.35 + 0.65 * demand);
      ship.fuel = Math.max(0, ship.fuel - ship.drain * dt);
    } else {
      ship.fuel = Math.min(ship.fuelMax, ship.fuel + BASE.fuelRegen * P.fuelMax * dt);
    }

    ship.thrustAmt = approach(ship.thrustAmt, burning ? 0.45 + 0.55 * demand : 0, burning ? 10 : 5, dt);

    // the nose aims at the pointer (a hold) or the mark (a seek), up to straight up or down,
    // swings heavily with a capped turn rate, and hangs at that angle until the next aim
    if (active) {
      const raw = ship.aimPx != null && !ship.courseMark;
      const ex = raw ? ship.aimPx - env.W * 0.5 : dx * pxPerUnit;
      const ey = raw ? ship.aimPy - ship.y : dy;
      if (Math.hypot(ex, ey) > BASE.aimDead) {
        const wrap = (a) => a - Math.PI * 2 * Math.round(a / (Math.PI * 2));
        const aimA = Math.atan2(ey, ex);
        const side = Math.cos(ship.yawTarget) >= 0 ? 1 : -1;
        // an aim behind the ship's side (more than ~8° past vertical) flips the yaw, keeping the nose's height;
        // mid-flip, an aim swung back behind the side it is turning to reverses the flip from where it is
        // the side is decided once per press; during the hold only the live pointer swinging well
        // past the ship (60px) flips it, so arrival or releasing never does
        const cone = ex * side < -Math.hypot(ex, ey) * 0.14;
        if (!ship.sideSet) {
          ship.sideSet = true;
          if (cone) ship.yawTarget = side > 0 ? Math.PI : 0;
        } else if (raw && ship.thrusting && cone && (ship.aimPx - env.W * 0.5) * side < -60) {
          ship.yawTarget = side > 0 ? Math.PI : 0;
        }
        const sideT = Math.cos(ship.yawTarget) >= 0 ? 1 : -1;
        // the nose never pitches past 90° from level, so the belly never faces up
        const wantE = ship.yaw !== ship.yawTarget ? 0 : clamp(wrap(sideT > 0 ? aimA : Math.PI - aimA), -Math.PI / 2, Math.PI / 2); // a side flip levels the nose; it aims once the flip is done
        const err = wrap(wantE - ship.elev);
        // angular velocity with limited acceleration: top rate, and a braking curve so it never overshoots
        // a press turns the nose at turn speed even when the ship is still (the motors wait for it)
        ship.aimErr = ship.yaw !== ship.yawTarget ? Math.PI : Math.abs(err);
        const accel = BASE.pitchAccel * 6;
        const wMax = Math.min(BASE.pitchTurnMax, Math.sqrt(2 * accel / 3 * Math.abs(err))); // the tilt is slower than the side flip, gentler start
        ship.pitchW += clamp(Math.sign(err) * wMax - ship.pitchW, -accel * dt, accel * dt);
        let stepP = ship.pitchW * dt;
        if (Math.abs(stepP) > Math.abs(err) && stepP * err > 0) { stepP = err; ship.pitchW = 0; }
        ship.elev = wrap(ship.elev + stepP);
      } else { ship.pitchW = 0; ship.aimErr = 0; }
    } else { ship.pitchW = 0; ship.aimErr = null; ship.go = false; }
    // the drawn pitch: the 3D turn spins the hull about the screen's vertical, so the nose keeps its height
    // (up-right turns to up-left, never down-left) and the hull's up axis stays exact all the way through
    const wantP = ship.face >= 0 ? ship.elev : -ship.elev; // the tilt holds through the turn; flips with the mirror at face = 0
    ship.pitch = wantP; // snaps with the mirror (the two poses look the same there), no slewed half roll
    ship.pitch -= Math.PI * 2 * Math.round(ship.pitch / (Math.PI * 2));
    // the old flight-path nose, kept quiet: it only feeds stats().bank
    const vxPx = Math.abs(ship.vel) * pxPerUnit;
    const pathAng = Math.atan2(ship.vy, vxPx + BASE.pitchRef);
    const lead = BASE.pitchLead * clamp((vWantY - ship.vy) / BASE.yMax, -1, 1);
    const wantB = clamp(pathAng + lead, -BASE.pitchMax, BASE.pitchMax) * (ship.face >= 0 ? 1 : -1); // the ship only flies forward, so the drawn facing is the way of travel
    const easedB = approach(ship.bankQ, wantB, BASE.pitchEase, dt);
    const bankStep = BASE.pitchRate * dt;
    ship.bankQ += clamp(easedB - ship.bankQ, -bankStep, bankStep);
    if (ship.vy === 0 && vWantY === 0 && Math.abs(ship.bankQ) < 0.003) ship.bankQ = 0;
    const pc = Math.cos(ship.pitch), ps = Math.sin(ship.pitch);

    // RCS jets fire against the vertical push: belly nozzles when the hull is shoved up
    // (launching a climb, braking a descent), deck nozzles when it is shoved down.
    // They catch fast and let go slowly so a short hop still shows both bursts.
    const ay = (ship.vy - prevVy) / dt;
    const jw = clamp(ay / (1.5 * BASE.brakeY), -1, 1);
    ship.jet = approach(ship.jet, jw, Math.abs(jw) > Math.abs(ship.jet) ? 14 : 6, dt);
    if (ship.vy === 0 && Math.abs(ship.jet) < 0.02) ship.jet = 0;
    // turn flames: signed share of the top turn rate in the hull's own frame (nose-down positive whatever the facing),
    // caught fast and let go slowly so they never pop; the 3D turn's own spin is not a clock spin and fires none
    const tfW = clamp(ship.pitchW / BASE.pitchTurnMax, -1, 1);
    ship.turnFire = approach(ship.turnFire, tfW, Math.abs(tfW) > Math.abs(ship.turnFire) ? 14 : 7, dt);
    if (tfW === 0 && Math.abs(ship.turnFire) < 0.02) ship.turnFire = 0;

    ship.bob += dt;

    const rs = L / 200, dir = ship.face >= 0 ? 1 : -1, EM = (window.VoidshipArt && VoidshipArt.EMIT) || [];
    const ART = window.VoidshipArt || {};
    const SUST = ART.SUST || [], JETS = ART.JETS || { belly: [], top: [] }, TSEATS = ART.TRAIL_SEATS || [];
    const half = Util.reduced() ? 0.5 : 1;
    // seats turn with the hull (full sin/cos); tx/ty are a speed along the tail direction
    const seatX = (s) => env.W * 0.5 + s.x * L * ship.face * pc - s.y * L * ps, seatY = (s) => ship.y + s.x * L * ship.face * ps + s.y * L * pc;
    const tx = (sp) => -dir * sp * pc, ty = (sp) => -dir * sp * ps;

    // ignition: one big flash from the main drive when a real burn starts
    ship.igniteCd = Math.max(0, ship.igniteCd - dt);
    if (burning && !ship.burnPrev && demand >= 0.4 && ship.igniteCd === 0 && EM.length) {
      ship.igniteCd = 0.6;
      ship.flare = 1;
      const e = EM[1] || EM[0];
      ship.fumes.push({ x: seatX(e), y: seatY(e), bx: tx(60 * rs), by: ty(60 * rs), vx: tx(60 * rs), vy: ty(60 * rs), age: 0, life: 0.5, r0: 0.03 * L, grow: 1.4 * L, kind: 2, seed: 0 });
      for (let n = Math.round(14 * half); n > 0; n--) {
        const sp = (320 + Math.random() * 320) * rs, bx = tx(sp), by = ty(sp);
        ship.fumes.push({ x: seatX(e), y: seatY(e), bx, by, vx: bx, vy: by + (Math.random() - 0.5) * 90 * rs,
          age: 0, life: 0.7 + Math.random() * 0.5, r0: (4 + Math.random() * 5) * rs, grow: (34 + Math.random() * 30) * rs,
          kind: 0, seed: Math.random(), main: 1, sa: ship.exA });
      }
    }
    ship.burnPrev = burning;
    ship.flare = approach(ship.flare, 0, 5, dt);
    if (ship.flare < 0.01) ship.flare = 0;

    // the main plume follows how much of the travel runs along the nose: full nose-first,
    // an idle floor when sideways or tail-first; the rest of the push shows as RCS puffs
    const tvx = ship.vel * pxPerUnit, tvy = ship.vy, tsp = Math.hypot(tvx, tvy);
    const noseDot = tsp < 30 ? 1 : (tvx * ship.face * pc + tvy * ship.face * ps) / tsp;
    const exT = Math.max(0, noseDot);
    ship.exA = approach(ship.exA, exT, exT > ship.exA ? 6.7 : 16.7, dt);   // slow up (0.15 s), fast down (0.06 s)
    const exK = 0.1 + 0.9 * ship.exA * ship.exA;
    const exE = noseDot < 0.3 ? 0.1 : exK;   // emission rate: idle floor only while the push is off the nose line

    if (ship.thrustAmt > 0.06 && EM.length) {
      // main drive: existing puffs; the sustainers take over part of the load past phase 1
      ship.fumeAcc += (10 + 70 * ship.thrustAmt) * (1 - 0.55 * w2) * half * exE * dt;
      let n = Math.floor(ship.fumeAcc); ship.fumeAcc -= n;
      for (; n > 0; n--) {
        const e = EM[Math.floor(Math.random() * EM.length)];
        const sp = (120 + Math.random() * 280) * rs, bx = tx(sp), by = ty(sp);
        ship.fumes.push({
          x: seatX(e), y: seatY(e),
          bx, by, vx: bx, vy: by + (Math.random() - 0.5) * 40 * rs,
          age: 0, life: 1.0 + Math.random() * 1.1,
          r0: (3 + Math.random() * 5) * rs * exK, grow: (16 + Math.random() * 26) * rs * exK,
          kind: Math.random() < 0.18 ? 1 : 0, seed: Math.random(), main: 1, sa: ship.exA,
        });
      }
      if (ship.thrustAmt > 0.3 && ship.exA > 0.3) {
        ship.ringAcc += dt * half;
        if (ship.ringAcc >= 0.16) {
          ship.ringAcc = 0;
          const e = EM[1] || EM[0];
          ship.fumes.push({ x: seatX(e), y: seatY(e),
            bx: tx(90 * rs), by: ty(90 * rs), vx: tx(90 * rs), vy: ty(90 * rs), age: 0, life: 0.7,
            r0: 2 * rs * exK, grow: 70 * rs * exK, kind: 1, seed: Math.random(), main: 1, sa: ship.exA });
        }
      }
      // sustainers (phase 2+): thin streaks from the aft spar tips
      if (ship.thrustAmt > 0.3 && w2 > 0 && SUST.length) {
        ship.sustAcc += (8 + 30 * w2) * half * exE * dt;
        let n = Math.floor(ship.sustAcc); ship.sustAcc -= n;
        for (; n > 0; n--) {
          const s = SUST[Math.random() < 0.5 ? 0 : 1] || SUST[0];
          const sp = (420 + Math.random() * 320) * rs, bx = tx(sp), by = ty(sp);
          ship.fumes.push({ x: seatX(s), y: seatY(s), bx, by, vx: bx, vy: by + (Math.random() - 0.5) * 16 * rs,
            age: 0, life: 0.30 + Math.random() * 0.30, r0: (7 + Math.random() * 12) * rs, grow: 0, kind: 3, seed: Math.random(), main: 1, sa: ship.exA });
        }
      }
    }
    // RCS: when the push is off the nose line, cold puffs leave the side opposite the push
    // (the nose end when flying tail-first, the far flank when sideways)
    if (ship.thrustAmt > 0.06 && tsp > 30) {
      const rcs = (1 - ship.exA) * ship.thrustAmt;
      if (rcs > 0.05) {
        ship.rcsAcc += 3.5 * rcs * half * dt;   // bursts of 2 or 3 tiny puffs
        let n = Math.floor(ship.rcsAcc); ship.rcsAcc -= n;
        const ux = -tvx / tsp, uy = -tvy / tsp, reach = (0.12 + 0.33 * Math.abs(noseDot)) * L;
        for (; n > 0; n--) {
          for (let k = 2 + (Math.random() < 0.5 ? 1 : 0); k > 0; k--) {
            const sp = (90 + Math.random() * 60) * rs;
            ship.fumes.push({ x: env.W * 0.5 + ux * reach + (Math.random() - 0.5) * 6 * rs, y: ship.y + uy * reach + (Math.random() - 0.5) * 6 * rs, bx: ux * sp, by: uy * sp, vx: ux * sp, vy: uy * sp,
              age: 0, life: 0.16 + Math.random() * 0.08, r0: (0.8 + Math.random() * 0.8) * rs, grow: 5 * rs, kind: 0, seed: Math.random(), rcs: 1 });
          }
        }
      }
    } else ship.rcsAcc = 0;
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
            const sp = sgn * (110 + Math.random() * 70) * rs;   // along the hull's own down, turned with it
            ship.fumes.push({ x: seatX(s), y: seatY(s), bx: 0, vx: -sp * ps, vy: sp * pc,
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
        const sx0 = ship.face * (0.10 + Math.random() * 0.9) * L, sy0 = (Math.random() - 0.5) * 0.8 * L, sp = (2600 + Math.random() * 1400) * rs;
        ship.sparks.push({ x: env.W * 0.5 + sx0 * pc - sy0 * ps, y: ship.y + sx0 * ps + sy0 * pc,
          vx: tx(sp), vy: ty(sp) + (Math.random() - 0.5) * 40 * rs,
          age: 0, life: 0.22 + Math.random() * 0.2, seed: Math.random() });
      }
      while (ship.sparks.length > BASE.sparkCap) ship.sparks.shift();
    } else ship.sparkAcc = 0;
    // streamers (phase 3): a short ribbon off three hull tips, sampled on a fixed clock
    {
      const bobY = Math.sin(ship.bob * 0.6) * 1.5, c = Math.cos(ship.pitch), sn = Math.sin(ship.pitch);
      // the wing tip sits at depth z: screen x = x*c - z*s, as drawn
      const fsign = ship.face !== 0 ? (ship.face > 0 ? 1 : -1) : (ship.yaw <= Math.PI / 2 ? 1 : -1);
      const fs = Math.sqrt(Math.max(0, 1 - ship.face * ship.face));
      for (let i = 0; i < ship.trails.length && i < TSEATS.length; i++) {
        // the near wing tip (the seat with a depth) rises to y 0.05 head-on (art WY0 + WDR) as the wing swings round
        const fx = (TSEATS[i].x * ship.face - fsign * (TSEATS[i].z || 0) * fs) * L,
          fy = (TSEATS[i].z ? TSEATS[i].y + fs * (0.05 - TSEATS[i].y) : TSEATS[i].y) * L;
        ship.heads[i][0] = env.W * 0.5 + fx * c - fy * sn;
        ship.heads[i][1] = ship.y + bobY + fx * sn + fy * c;
      }
      ship.trailAcc += dt;
      if (w3 > 0.02 && TSEATS.length) {
        if (ship.trailAcc >= 1 / BASE.trailRate) {
          ship.trailAcc = 0;
          const sp = (600 + 1400 * ship.speedN) * rs;
          for (let i = 0; i < ship.trails.length && i < TSEATS.length; i++) {
            const tr = ship.trails[i], k = 0.9 + 0.2 * Math.random();
            tr.push({ x: ship.heads[i][0], y: ship.heads[i][1], vx: tx(sp) * k, vy: ty(sp) * k + (Math.random() - 0.5) * 70 * rs, age: 0, a: w3, seed: Math.random() });
            while (tr.length > BASE.trailPts) tr.shift();
          }
        }
      } else ship.trailAcc = Math.min(ship.trailAcc, 1 / BASE.trailRate);
    }
    while (ship.fumes.length > BASE.fumeCap) ship.fumes.shift();
    const dvx = (ship.vel - prevVel) * pxPerUnit;   // the hull's speed change this frame, px/s
    const dvy = ship.vy - prevVy;
    const scrollPx = (camX - prevX) * pxPerUnit;   // how far the world slid under the hull this frame
    const relax = 1 - Math.exp(-2 * dt), ky = Math.exp(-1.8 * dt), lim = 1400 * rs + Math.abs(tvx);
    for (let i = ship.fumes.length - 1; i >= 0; i--) {
      const p = ship.fumes[i];
      if (p.age === 0) { p.w = 1 - ship.exA; p.vx += p.w * tvx; }   // nose-first puffs ride the hull frame (the old plume); off-nose ones start with the hull's speed and drift in the world
      p.age += dt;
      // a main puff lying ahead of the hull along travel (tail-first flight) fades out fast
      if (p.main && !p.cut && noseDot < 0.3 && tsp > 30 && (p.x - env.W * 0.5) * tvx + (p.y - ship.y) * tvy > 0) { p.cut = 1; p.life = Math.min(p.life, p.age + 0.15); }
      if (p.age >= p.life) { ship.fumes.splice(i, 1); continue; }
      // partial inertia: when the hull brakes the plume surges ahead of it,
      // when it accelerates the plume is left behind; then it settles back
      // onto its own drift
      const bt = p.bx + (p.w || 0) * tvx;
      p.vx = clamp(p.vx - dvx * 0.2, bt - lim, bt + lim);
      p.vy -= dvy * 0.5;
      p.vx += (bt - p.vx) * relax;
      p.vy = (p.by || 0) + (p.vy - (p.by || 0)) * ky;
      p.x += p.vx * dt - (p.w || 0) * scrollPx; p.y += p.vy * dt;
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
      && ship.yaw === ship.yawTarget
      && ship.spool === 0 && ship.flare === 0 && ship.jet === 0 && ship.turnFire === 0 && ship.sparks.length === 0 && ship.trails.every(tr => tr.length === 0);
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
      drain: ship.drain || 0,   // fuel units per second actually being burned (0 while refilling)
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
      bank: clamp(ship.bankQ,-BASE.pitchMax, BASE.pitchMax),
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

    if (window.VoidshipArt && !ship.flip) VoidshipArt.drawFumes(ctx, ship.fumes, { W: env.W, H: env.H, camX: env.camX, pxPerUnit, t });
    if (window.VoidshipArt && VoidshipArt.drawWake) VoidshipArt.drawWake(ctx, ship, { W: env.W, H: env.H, t, trailLife: BASE.trailLife, rs: L / 200 });

    const bobY = Math.sin(ship.bob * 0.6) * 1.5;
    ctx.save();
    const sh = Util.reduced() ? 0 : ship.strain;
    ctx.translate(p.x + sh * 1.1 * Math.sin(t * 73.0), p.y + bobY + sh * 0.8 * Math.sin(t * 59.0));
    ctx.rotate(ship.pitch);
    const d = Math.abs(ship.face);                        // 1 side-on … 0 front-on
    const sign = ship.face !== 0 ? (ship.face > 0 ? 1 : -1) : (ship.yaw <= Math.PI / 2 ? 1 : -1);
    if (window.VoidshipArt) {
      // mid-turn the hull is built part by part at this yaw; at rest it is the plain side view
      ctx.scale(sign, 1);
      VoidshipArt.drawHull(ctx, ship, L, t, d < 1 ? { c: d, s: Math.sqrt(1 - d * d) } : null);
    }
    ctx.restore();

    ctx.restore();
  }

  return {
    BASE, create, resize, setPower, setCourse, setAim, setThrusting, clearCourse,
    step, draw, screenPos, touching, touchingMark, stats, canBurn, addFuel, settled,
  };
})();
