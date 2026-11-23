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
  const YAW_RAMP = 0.12, YAW_END = 0.55;   // the U-turn's ease in and out: seconds each, and the rate at the very start and end as a share of the cruise rate
  const BASE = {
    accelTau: 0.30,   // s, velocity time constant when speeding up (world x)
    brakeTau: 0.07,   // s, when slowing/reversing: full stop in ~0.3 s
    maxSpeed: 9000,   // world u/s base cruise
    holdBoost: 3.4,   // top speed multiplier: a held pointer at full demand flies maxSpeed * this
    brakeX: 14000,    // u/s², arrive profile v = sqrt(2*brakeX*d)
    brakeY: 700,      // px/s², arrive profile v = sqrt(2*brakeY*d)
    yMax: 420,        // px/s at rest
    yMaxFast: 0.5,    // fraction of yMax left at base cruise: fast sideways = shallow climbs
    yAccel: 520,      // px/s² the belly thrusters can add: the hull is heavy
    yBrake: 1200,     // px/s² when catching a vertical speed
    yTau: 0.06,       // s, shapes only the last approach to the wanted vertical speed
    yBand: 0.24,
    holdD0: 70,       // u, a held pointer closer than this (just off the hull) asks for no thrust
    holdD1: 585,      // u, full thrust at this distance (~585 px at 2000 wide); linear between
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
      thrusting: false,
      go: false, aimErr: null,   // motors on (nose within ~10° of the press aim, held to 30°); the nose's last error
      targetX: null, targetY: null, courseMark: null, arrived: true,
      fuel: BASE.fuelMax, fuelMax: BASE.fuelMax, infinite: false,
      thrustAmt: 0,
      fumes: [], fumeAcc: 0, ringAcc: 0, exA: 1, flameA: 0, flameP: [0, 0, 0, 0, 0, 0, 0],
      bob: 0, alpha: 1,
      power: { accel: 1, maxSpeed: 1, fuelMax: 1, burn: 1 },
      spool: 0, speedN: 0, phase: 0, sustain: 0, strain: 0, flare: 0, jet: 0,
      burnPrev: false, igniteCd: 0,
      sustAcc: 0, sparkAcc: 0, trailAcc: 0,
      // RCS: per-port-row fire level 0..1 (VoidshipArt.RCS order), each jet's envelope state and the per-axis push state
      rcs: [], rcsJ: [], rcsAx: null, rcsAny: false,
      yawW: 0, aF: 0, pRate: 0, aP: 0, aY: 0,   // yaw rate, and the applied yaw / drawn-pitch / vertical accelerations of the last step
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
      ship.spool = 0; ship.strain = 0; ship.sustain = 0; ship.jet = 0; ship.flare = 0; ship.flameA = 0; ship.rcs.length = 0; ship.rcsJ.length = 0; ship.rcsAx = null; ship.rcsAny = false; ship.sparks.length = 0; for (const tr of ship.trails) tr.length = 0;
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

    // a held pointer sets the thrust by its distance: d0 off the hull = 0, d1 = full
    const held = hasTarget(ship) && ship.thrusting && !ship.courseMark;
    // (measured to the raw pointer, as the gauge draws it, not the clamped tgtY)
    const dRaw = held ? Math.hypot(dx, (ship.targetY - ship.y) / pxPerUnit) : 0;
    const pull = held ? clamp((dRaw - BASE.holdD0) / (BASE.holdD1 - BASE.holdD0), 0, 1) : 0;
    ship.demand = pull;   // read by the tether art
    ship.far = held && pull >= 1;

    const topSpeed = BASE.maxSpeed * BASE.holdBoost * P.maxSpeed;
    let cruise = BASE.maxSpeed * P.maxSpeed * (1 + 2.4);
    if (!canBurn(ship)) cruise = BASE.maxSpeed * P.maxSpeed * BASE.limpSpeed;

    // vertical authority: full at rest, down to yMaxFast of it by base cruise speed
    const vFrac = clamp(Math.abs(ship.vel) / (BASE.maxSpeed * P.maxSpeed), 0, 1);
    const yCap = BASE.yMax * (1 - (1 - BASE.yMaxFast) * vFrac);

    let vWantX = 0, vWantY = 0, burning = false, demand = 0, closeHold = false, swinging = false;
    const active = hasTarget(ship) && (ship.thrusting || !ship.arrived);
    if (active) {
      const sx = Math.sign(dx), sy = Math.sign(dy);
      vWantX = held ? sx * cruise * pull * (dRaw > 0 ? Math.abs(dx) / dRaw : 0) : sx * Math.min(cruise, Math.sqrt(2 * BASE.brakeX * Math.abs(dx)));
      vWantY = sy * Math.min(yCap, Math.sqrt(2 * BASE.brakeY * Math.abs(dy)));
      if (Math.abs(dx) < BASE.arriveWorld) vWantX = 0;
      if (Math.abs(dy) < BASE.arriveY) vWantY = 0;
      // a seek flies a straight line to the mark: climb no faster than the path needs,
      // so height and distance run out together instead of an L-shaped hop
      if (!held && Math.abs(dx) >= BASE.arriveWorld && vWantX !== 0) {
        const vLine = Math.abs(vWantX) * Math.abs(dy) / Math.abs(dx);
        if (vLine < Math.abs(vWantY)) vWantY = sy * vLine;
      }
      demand = held ? pull : clamp(Math.abs(vWantX) / cruise, 0, 1);
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

    // the drawn yaw flips only on a sharp U-turn (below, with the aim); it eases in and out over YAW_RAMP s each, starting and ending at
    // YAW_END of the cruise rate (so every 165 Hz frame still moves by a baked frame), and the whole turn still lasts turnTime
    const yawC = Math.PI / (BASE.turnTime - YAW_RAMP * (1 - YAW_END)), yawR0 = yawC * YAW_END, yawA = (yawC - yawR0) / YAW_RAMP;
    const yawD = ship.yawTarget - ship.yaw, yawDir = Math.sign(yawD), yawWas = ship.yawW;
    if (yawD !== 0) {
      let w = Math.min(yawC, Math.max(yawR0, ship.yawW * yawDir) + yawA * dt);
      w = Math.min(w, Math.sqrt(yawR0 * yawR0 + 2 * yawA * Math.abs(yawD)));
      ship.yaw += yawDir * Math.min(w * dt, Math.abs(yawD));
      ship.yawW = yawDir * w;
    }
    if (Math.abs(ship.yawTarget - ship.yaw) < 1e-3) ship.yaw = ship.yawTarget;
    if (ship.yaw === ship.yawTarget) ship.yawW = 0;
    ship.aF = (ship.yawW - yawWas) / dt;   // the yaw's applied angular acceleration this step, for the RCS
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
    ship.engine = burning ? clamp(Math.abs(ship.vel) / topSpeed, 0, 1) : 0;   // live main-engine output for the gauge
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
      if ((!held && (ship.targetX - prevX) * (ship.targetX - camX) <= 0) ||
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
    // the tilt fades with |face| through a side turn, so it is level where the mirror flips (face = 0): no pop, no tumble
    const wantP = (ship.face >= 0 ? ship.elev : -ship.elev) * Math.abs(ship.face);
    const prevPitch = ship.pitch;
    ship.pitch = wantP; // snaps with the mirror (the two poses look the same there), no slewed half roll
    ship.pitch -= Math.PI * 2 * Math.round(ship.pitch / (Math.PI * 2));
    // the drawn nose's applied angular acceleration this step (nose-down positive), for the RCS
    const dPitch = ship.pitch - prevPitch, pRate = (dPitch - Math.PI * 2 * Math.round(dPitch / (Math.PI * 2))) / dt;
    ship.aP = (pRate - ship.pRate) / dt; ship.pRate = pRate;
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
    ship.aY = ay;   // the applied vertical acceleration (down positive), for the RCS
    const jw = clamp(ay / (1.5 * BASE.brakeY), -1, 1);
    ship.jet = approach(ship.jet, jw, Math.abs(jw) > Math.abs(ship.jet) ? 14 : 6, dt);
    if (ship.vy === 0 && Math.abs(ship.jet) < 0.02) ship.jet = 0;

    ship.bob += dt;

    const rs = L / 200, dir = ship.face >= 0 ? 1 : -1, EM = (window.VoidshipArt && VoidshipArt.EMIT) || [];
    const ART = window.VoidshipArt || {};
    const SUST = ART.SUST || [], TSEATS = ART.TRAIL_SEATS || [];
    const half = Util.reduced() ? 0.5 : 1;
    // seats turn with the hull (full sin/cos); tx/ty are a speed along the tail direction
    const seatX = (s) => env.W * 0.5 + s.x * L * ship.face * pc - s.y * L * ps, seatY = (s) => ship.y + s.x * L * ship.face * ps + s.y * L * pc;
    const tx = (sp) => -dir * sp * pc, ty = (sp) => -dir * sp * ps;

    // while the hull turns (flip, hop or pitch) the drive's bubbles and rings are not spawned and fade out
    const turning = ship.yaw !== ship.yawTarget || Math.abs(ship.pitchW) > 0.02;
    // ignition: one big flash from the main drive when a real burn starts
    ship.igniteCd = Math.max(0, ship.igniteCd - dt);
    if (burning && !ship.burnPrev && demand >= 0.4 && ship.igniteCd === 0 && EM.length) {
      ship.igniteCd = 0.6;
      ship.flare = 1;
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

    // the drive's flame: a tight plume at each bell, its length follows the thrust, gone in 0.2 s when the thrust stops or the hull turns
    const fT = (!turning && ship.thrustAmt > 0.06 && EM.length) ? ship.thrustAmt * exK : 0;
    ship.flameA = fT > ship.flameA ? Math.min(fT, ship.flameA + dt * 8) : Math.max(fT, ship.flameA - dt * 5);
    if (ship.flameA < 0.005) ship.flameA = 0;
    const flL = 0.15 * L * ship.flameA * Math.min(1, 0.25 + Math.abs(ship.face));   // flame length, px
    if (ship.flameA > 0 && EM.length) {   // pose for the art: bell mouths, tail angle, length
      const fp = ship.flameP;
      for (let i = 0; i < EM.length && i < 2; i++) { fp[i * 2] = seatX(EM[i]); fp[i * 2 + 1] = seatY(EM[i]); }
      fp[4] = Math.atan2(ty(1), tx(1)); fp[5] = flL; fp[6] = Math.min(1, ship.flameA * 1.6 + 0.5 * ship.flare);
    }

    if (ship.thrustAmt > 0.06 && EM.length) {
      // main drive: a few small puffs leave the flame tip and die within about a quarter hull length of the bell
      if (turning) ship.fumeAcc = 0; else ship.fumeAcc += (3 + 8 * ship.thrustAmt) * (1 - 0.55 * w2) * half * exE * dt;
      let n = Math.floor(ship.fumeAcc); ship.fumeAcc -= n;
      for (; n > 0; n--) {
        const e = EM[Math.floor(Math.random() * EM.length)];
        const sp = (20 + Math.random() * 20) * rs, bx = tx(sp), by = ty(sp);
        ship.fumes.push({
          x: seatX(e) + tx(flL), y: seatY(e) + ty(flL),
          bx, by, vx: bx, vy: by + (Math.random() - 0.5) * 8 * rs,
          age: 0, life: 0.3 + Math.random() * 0.2,
          r0: (1.5 + Math.random() * 1.5) * rs * exK, grow: (3 + Math.random() * 3) * rs * exK,
          kind: 0, seed: 0, main: 1, sa: ship.exA,
        });
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
      if (p.age >= p.life) { ship.fumes.splice(i, 1); continue; }
      if (turning && p.main && p.kind < 3 && !p.rcs) {   // drive bubbles and rings in the air fade out over 0.2 s
        p.fo = (p.fo || 0) + dt * 5;
        if (p.fo >= 1) { ship.fumes.splice(i, 1); continue; }
      }
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

    rcsStep(ship, dt);
    ship.camX = camX;
    return { camX, vel: ship.vel };
  }

  // RCS: each jet fires from the acceleration the drive applied this step (never a smoothed speed): pitch (drawn nose, down positive), vertical (down positive)
  // and yaw (+ = yaw rising, which swings the bow toward the camera: bowFar + sternNear start it, bowNear + sternFar stop it). A jet lights only when every
  // active axis it acts on agrees in sign; each axis has a dead band (on above, off below RCS_HYST of it), so nothing burns at a steady rate or while still.
  const RCS_RISE = 0.04, RCS_FALL = 0.07;   // attack and release of a jet's level, seconds
  const RCS_DEAD = { p: 6, y: 150, f: 6 }, RCS_HYST = 0.7;   // dead bands: pitch rad/s², vertical px/s², yaw rad/s²
  let RCS_IX = null;
  function rcsIndex(rows) {
    // per jet the sign it pushes each axis: p nose-down +, y down +, f yaw rising +
    const sg = { bowTop: [1, 1, 0], bowBelly: [-1, -1, 0], sternTop: [-1, 1, 0], sternBelly: [1, -1, 0], bowFar: [0, 0, 1], sternNear: [0, 0, 1], bowNear: [0, 0, -1], sternFar: [0, 0, -1] };
    RCS_IX = rows.map(row => sg[row.id] || [0, 0, 0]);
  }
  function rcsStep(ship, dt) {
    const A = window.VoidshipArt, rows = A && A.RCS;
    if (!rows || !(dt > 0)) return;
    if (!RCS_IX) rcsIndex(rows);
    while (ship.rcs.length < rows.length) { ship.rcs.push(0); ship.rcsJ.push({ v: 0 }); }
    const J = ship.rcsJ, X = ship.rcsAx || (ship.rcsAx = [0, 0, 0]), a = [ship.aP, ship.aY, ship.aF], dead = [RCS_DEAD.p, RCS_DEAD.y, RCS_DEAD.f];
    const s = [0, 0, 0];   // the sign of each active axis's acceleration
    for (let i = 0; i < 3; i++) {
      const lim = dead[i] * (X[i] ? RCS_HYST : 1);
      X[i] = Math.abs(a[i]) > lim ? 1 : 0;
      s[i] = X[i] ? Math.sign(a[i]) : 0;
    }
    let any = false;
    for (let r = 0; r < rows.length; r++) {
      const q = RCS_IX[r], j = J[r];
      let on = false, ok = true;
      for (let i = 0; i < 3; i++) if (q[i] && s[i]) { if (q[i] === s[i]) on = true; else ok = false; }
      const e = on && ok ? 1 : 0;
      j.v = e ? Math.min(1, j.v + dt / RCS_RISE) : Math.max(0, j.v - dt / RCS_FALL);
      ship.rcs[r] = j.v * j.v * (3 - 2 * j.v);
      if (j.v > 0) any = true;
    }
    ship.rcsAny = any;
  }

  function settled(ship) {
    return !ship.thrusting && ship.targetX == null && ship.vel === 0 && ship.vy === 0
      && ship.thrustAmt < 0.01 && ship.fumes.length === 0 && ship.flameA === 0
      && ship.yaw === ship.yawTarget
      && ship.spool === 0 && ship.flare === 0 && ship.jet === 0 && !ship.rcsAny && ship.sparks.length === 0 && ship.trails.every(tr => tr.length === 0);
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
      demand: ship.demand || 0,
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

    if (window.VoidshipArt) VoidshipArt.drawFumes(ctx, ship.fumes, { W: env.W, H: env.H, camX: env.camX, pxPerUnit, t });
    if (window.VoidshipArt && ship.flameA > 0) VoidshipArt.drawFlame(ctx, ship, { L, dpr: env.dpr || window.devicePixelRatio || 1, t });
    if (window.VoidshipArt && VoidshipArt.drawTether) VoidshipArt.drawTether(ctx, ship, { W: env.W, camX: env.camX, viewUnits: env.viewUnits || 2100, holdD0: BASE.holdD0, holdD1: BASE.holdD1, aimDead: BASE.aimDead });
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
