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

  const LAMP = [245, 208, 107];
  const COLD = [143, 176, 184];
  const HULL = [28, 38, 42];
  const HULL_HI = [58, 72, 76];
  const BRICK = [176, 104, 90];

  /* Tunables that later unlocks multiply. Keep them named. */
  const BASE = {
    accel: 3800,           // world u/s² — heavy; max speed still comes from a long hold
    maxSpeed: 9000,        // base cruise; hold ramps this up
    holdBoost: 3.4,        // max cruise multiplier while held
    holdBuild: 1.35,       // seconds toward full boost
    holdDecay: 1.6,        // seconds to shed boost after release
    yAccel: 180,           // screen px/s²
    yMax: 220,             // screen px/s
    yBand: 0.24,           // ± of H — must cover every beacon oy (0.20–0.46)
    fuelMax: 100,
    burnFull: 7.5,         // fuel/s at hard burn — enough to cross, not infinite
    burnIdle: 0,           // no drip while coasting
    size: 72,              // nose-to-tail drawing length
    arriveWorld: 18,       // snap-stop distance
    arriveY: 2.5,
  };

  function rgba(c, a) { return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }

  function create() {
    return {
      // pose — world X is the camera; screen Y floats in a band
      y: 0,                 // set on first resize
      vy: 0,
      vel: 0,               // world X velocity (same units as bridge vel)
      angle: 0,
      bank: 0,

      // drive
      thrusting: false,
      holdT: 0,             // 0..1 boost charge from holding
      targetX: null,
      targetY: null,
      courseMark: null,     // beacon id we're flying to, or null
      arrived: true,

      // tanks
      fuel: BASE.fuelMax,
      fuelMax: BASE.fuelMax,
      infinite: false,

      // feel
      thrustAmt: 0,         // 0..1 visual/engine load
      trail: [],
      sparks: [],
      bob: 0,
      alpha: 1,             // seated under the boot veil — no pop-in later

      // power multipliers (unlocks later)
      power: { accel: 1, maxSpeed: 1, fuelMax: 1, burn: 1 },
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
    ship.thrusting = !!on;
    if (!on) ship.courseMark = ship.courseMark; // keep course; just stop feeding boost
  }

  function clearCourse(ship) {
    ship.targetX = null;
    ship.targetY = null;
    ship.courseMark = null;
    ship.arrived = true;
  }

  /* ---- integration ------------------------------------------------ */

  function step(ship, dt, env) {
    const { W, H, frozen } = env;
    let camX = env.camX;
    if (frozen || dt <= 0) {
      ship.vel = 0;
      ship.vy = 0;
      ship.thrustAmt = approach(ship.thrustAmt, 0, 8, dt || 0.016);
      return { camX, vel: 0 };
    }

    resize(ship, W, H);

    const accel = BASE.accel * ship.power.accel;
    const yAccel = BASE.yAccel * ship.power.accel;
    const maxBase = BASE.maxSpeed * ship.power.maxSpeed;

    // hold builds a cruise multiplier so a long press can cross the span
    if (ship.thrusting && canBurn(ship) && hasTarget(ship)) {
      ship.holdT = Math.min(1, ship.holdT + dt / BASE.holdBuild);
    } else {
      ship.holdT = Math.max(0, ship.holdT - dt / BASE.holdDecay);
    }
    const cruise = maxBase * (1 + (BASE.holdBoost - 1) * ship.holdT * ship.holdT);

    let burning = false;
    let demand = 0;

    /* Two drive modes:
         STEER  — throttle open, no beacon lock: pointer offset is a
                  thrust stick. Speed can climb with hold-boost.
         SEEK   — beacon lock, or throttle closed: brake onto the
                  waypoint so we never overshoot. */
    const steering = ship.thrusting && canBurn(ship) && hasTarget(ship) && !ship.courseMark;

    if (steering) {
      const dx = ship.targetX - camX;
      const dy = ship.targetY - ship.y;
      // soft stick: short offsets stay gentle; edge holds still reach full cruise
      const rawX = clamp(dx / (env.viewUnits * 0.42), -1, 1);
      const rawY = clamp(dy / (H * BASE.yBand + 1), -1, 1);
      const stickX = rawX * Math.abs(rawX);
      const stickY = rawY * Math.abs(rawY);
      const vWant = stickX * cruise;
      const vyWant = stickY * BASE.yMax;

      const dv = vWant - ship.vel;
      ship.vel += clamp(dv, -accel * dt, accel * dt);
      const dvy = vyWant - ship.vy;
      ship.vy += clamp(dvy, -yAccel * dt, yAccel * dt);

      burning = Math.abs(stickX) > 0.04 || Math.abs(stickY) > 0.08;
      demand = Math.min(1, Math.hypot(stickX, stickY * 0.5));
      ship.arrived = false;
    } else if (hasTarget(ship)) {
      const dx = ship.targetX - camX;
      const dy = ship.targetY - ship.y;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);

      // desired speeds taper with remaining distance → no overshoot
      const vWant = Math.sign(dx || ship.vel) * Math.min(cruise, Math.sqrt(Math.max(0, 2 * accel * adx)));
      const vyWant = Math.sign(dy || ship.vy) * Math.min(BASE.yMax, Math.sqrt(Math.max(0, 2 * yAccel * ady)));

      const seeking = ship.thrusting || !ship.arrived;
      if (seeking) {
        // if we're going too fast to stop in the remaining distance, cut now
        if (adx > 0.5 && Math.sign(ship.vel) === Math.sign(dx) &&
            ship.vel * ship.vel > 2 * accel * adx) {
          ship.vel = Math.sign(dx) * Math.sqrt(2 * accel * adx);
        }
        if (ady > 0.5 && Math.sign(ship.vy) === Math.sign(dy) &&
            ship.vy * ship.vy > 2 * yAccel * ady) {
          ship.vy = Math.sign(dy) * Math.sqrt(2 * yAccel * ady);
        }

        const dv = vWant - ship.vel;
        const stepV = clamp(dv, -accel * dt, accel * dt);
        if (ship.thrusting && canBurn(ship) && Math.abs(vWant) > 30 && Math.sign(stepV) === Math.sign(vWant || 1)) {
          ship.vel += stepV;
          burning = true;
          demand = Math.min(1, Math.abs(vWant) / Math.max(1, cruise));
        } else if (!canBurn(ship) && ship.thrusting) {
          ship.vel *= Math.exp(-dt * 1.4);
          ship.vel += stepV * 0.35;
        } else {
          ship.vel += stepV;
        }

        const dvy = vyWant - ship.vy;
        ship.vy += clamp(dvy, -yAccel * dt, yAccel * dt);
      }

      // crossed the mark — stop on it
      if (Math.sign(dx) !== Math.sign(ship.targetX - (camX + ship.vel * dt)) && adx < cruise) {
        camX = ship.targetX;
        ship.vel = 0;
      }

      // arrive
      if (adx < BASE.arriveWorld && Math.abs(ship.vel) < 40) {
        camX = ship.targetX;
        ship.vel = 0;
      }
      if (ady < BASE.arriveY && Math.abs(ship.vy) < 8) {
        ship.y = ship.targetY;
        ship.vy = 0;
      }
      if (adx < BASE.arriveWorld && ady < BASE.arriveY &&
          Math.abs(ship.vel) < 40 && Math.abs(ship.vy) < 8) {
        ship.arrived = true;
        if (!ship.thrusting) {
          ship.targetX = null;
          ship.targetY = null;
        }
      }
    } else {
      // no course: gentle damp
      ship.vel *= Math.exp(-dt * 2.2);
      ship.vy *= Math.exp(-dt * 3.0);
      if (Math.abs(ship.vel) < 6) ship.vel = 0;
      if (Math.abs(ship.vy) < 2) ship.vy = 0;
    }

    // integrate
    camX += ship.vel * dt;
    ship.y += ship.vy * dt;

    const mid = deckY(H);
    const band = H * BASE.yBand;
    if (ship.y < mid - band) { ship.y = mid - band; ship.vy = Math.max(0, ship.vy); }
    if (ship.y > mid + band) { ship.y = mid + band; ship.vy = Math.min(0, ship.vy); }

    // fuel
    if (burning && !ship.infinite) {
      const rate = BASE.burnFull * ship.power.burn * (0.35 + 0.65 * demand);
      ship.fuel = Math.max(0, ship.fuel - rate * dt);
    }

    ship.thrustAmt = approach(ship.thrustAmt, burning ? (0.45 + 0.55 * demand) : 0, burning ? 10 : 5, dt);

    // heading from velocity; fall back to course bearing when nearly still
    let aimX = ship.vel;
    let aimY = ship.vy;
    if (Math.hypot(aimX, aimY) < 80 && hasTarget(ship)) {
      aimX = (ship.targetX - camX);
      aimY = (ship.targetY - ship.y) * 40;
    }
    const wantAng = Math.atan2(aimY, aimX || 1);
    ship.angle = turn(ship.angle, wantAng, dt * 5.5);

    const turnRate = wrap(wantAng - ship.angle);
    ship.bank = approach(ship.bank, clamp(turnRate * 0.55, -0.45, 0.45), 6, dt);
    ship.bob += dt;

    // motion trail
    if (Math.abs(ship.vel) > 400 || ship.thrustAmt > 0.1) {
      ship.trail.push({ x: W * 0.5, y: ship.y, a: ship.angle, life: 1 });
      if (ship.trail.length > 18) ship.trail.shift();
    }
    for (let i = ship.trail.length - 1; i >= 0; i--) {
      ship.trail[i].life -= dt * 2.4;
      if (ship.trail[i].life <= 0) ship.trail.splice(i, 1);
    }

    // exhaust sparks
    if (ship.thrustAmt > 0.2) {
      for (let i = 0; i < 2; i++) {
        const back = -BASE.size * 0.48;
        ship.sparks.push({
          x: back - Math.random() * 10 * ship.thrustAmt,
          y: (Math.random() - 0.5) * 10,
          vx: -40 - Math.random() * 120 * ship.thrustAmt,
          vy: (Math.random() - 0.5) * 40,
          life: 0.25 + Math.random() * 0.35,
        });
      }
    }
    for (let i = ship.sparks.length - 1; i >= 0; i--) {
      const s = ship.sparks[i];
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.life <= 0) ship.sparks.splice(i, 1);
    }
    if (ship.sparks.length > 40) ship.sparks.splice(0, ship.sparks.length - 40);

    return { camX, vel: ship.vel };
  }

  function canBurn(ship) { return ship.infinite || ship.fuel > 0.05; }
  function hasTarget(ship) { return ship.targetX != null && ship.targetY != null; }

  function screenPos(ship, W) {
    return { x: W * 0.5, y: ship.y };
  }

  /* true when the hull is on a screen point */
  function touching(ship, W, px, py, radius) {
    const p = screenPos(ship, W);
    return Math.hypot(px - p.x, py - p.y) < (radius || 28);
  }

  /* beacon claim: world X is what matters. Screen Y used to miss
     high/low marks (Void at oy 0.20 sat outside the old flight band). */
  function touchingMark(ship, camX, mark, pad) {
    const reach = pad != null ? pad : 720;
    return Math.abs(camX - mark.x) < reach;
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
      angle: ship.angle,
      power: ship.power,
    };
  }

  /* ---- drawing ---------------------------------------------------- */

  function draw(ship, ctx, env) {
    const { W, H, t } = env;
    if (!ship._seated) resize(ship, W, H);
    if (!ship._seated) return;

    const p = screenPos(ship, W);
    const S = BASE.size;
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

    // soft motion smear behind the craft
    for (let i = 0; i < ship.trail.length; i++) {
      const tr = ship.trail[i];
      ctx.save();
      ctx.translate(tr.x, tr.y);
      ctx.rotate(tr.a);
      ctx.globalAlpha = a * tr.life * 0.18;
      ctx.fillStyle = rgba(COLD, 0.5);
      ctx.beginPath();
      ctx.moveTo(S * 0.15, 0);
      ctx.lineTo(-S * 0.25, S * 0.12);
      ctx.lineTo(-S * 0.25, -S * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    const bobY = Math.sin(ship.bob * 1.7) * 1.2 * (1 - ship.thrustAmt * 0.7);

    ctx.save();
    ctx.translate(p.x, p.y + bobY);
    ctx.rotate(ship.angle);
    // perspective bank — squash Y slightly and skew
    ctx.transform(1, 0, ship.bank * 0.35, 1 - Math.abs(ship.bank) * 0.12, 0, 0);

    drawGlow(ctx, S, ship, t);
    drawExhaust(ctx, S, ship, t);
    drawHull(ctx, S, ship, t);
    drawSparks(ctx, ship);

    ctx.restore(); // hull
    ctx.restore(); // alpha
    void H;
  }

  function drawGlow(ctx, S, ship, t) {
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, S * 0.9);
    g.addColorStop(0, rgba(LAMP, 0.10 + ship.thrustAmt * 0.08));
    g.addColorStop(0.45, rgba(COLD, 0.05));
    g.addColorStop(1, rgba(COLD, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, S * 0.9, 0, Math.PI * 2); ctx.fill();

    // under-light on the void
    const ug = ctx.createRadialGradient(0, S * 0.35, 0, 0, S * 0.5, S * 0.7);
    ug.addColorStop(0, rgba(LAMP, 0.07 + 0.06 * Math.sin(t * 3)));
    ug.addColorStop(1, rgba(LAMP, 0));
    ctx.fillStyle = ug;
    ctx.beginPath(); ctx.ellipse(0, S * 0.4, S * 0.55, S * 0.18, 0, 0, Math.PI * 2); ctx.fill();
  }

  function drawExhaust(ctx, S, ship, t) {
    const a = ship.thrustAmt;
    if (a < 0.02) {
      // idle pilot lights in the bells
      ctx.fillStyle = rgba(LAMP, 0.25 + 0.15 * Math.sin(t * 5));
      ctx.beginPath(); ctx.arc(-S * 0.42, -S * 0.11, 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-S * 0.42,  S * 0.11, 1.4, 0, Math.PI * 2); ctx.fill();
      return;
    }

    const flick = 0.85 + 0.15 * Math.sin(t * 47 + a * 9);
    const len = S * (0.55 + a * 1.15) * flick;

    for (const side of [-1, 1]) {
      const oy = side * S * 0.11;
      // outer wash
      const wash = ctx.createLinearGradient(-S * 0.4, 0, -S * 0.4 - len, 0);
      wash.addColorStop(0, rgba(BRICK, 0.55 * a));
      wash.addColorStop(0.35, rgba(LAMP, 0.45 * a));
      wash.addColorStop(1, rgba(LAMP, 0));
      ctx.fillStyle = wash;
      const wob = Math.sin(t * 60 + side * 2.1) * 1.6 * a;
      ctx.beginPath();
      ctx.moveTo(-S * 0.38, oy - 5.5);
      ctx.quadraticCurveTo(-S * 0.38 - len * 0.55, oy + wob,
                           -S * 0.38 - len, oy);
      ctx.quadraticCurveTo(-S * 0.38 - len * 0.55, oy - wob * 0.4,
                           -S * 0.38, oy + 5.5);
      ctx.closePath();
      ctx.fill();

      // hot core
      ctx.fillStyle = rgba([255, 244, 210], 0.75 * a);
      ctx.beginPath();
      ctx.moveTo(-S * 0.38, oy - 2.2);
      ctx.lineTo(-S * 0.38 - len * 0.62 * flick, oy);
      ctx.lineTo(-S * 0.38, oy + 2.2);
      ctx.closePath();
      ctx.fill();
    }

    // centre plume at high thrust
    if (a > 0.55) {
      const cl = len * 0.75;
      const cg = ctx.createLinearGradient(-S * 0.3, 0, -S * 0.3 - cl, 0);
      cg.addColorStop(0, rgba(LAMP, 0.35));
      cg.addColorStop(1, rgba(LAMP, 0));
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.moveTo(-S * 0.3, -3);
      ctx.lineTo(-S * 0.3 - cl, 0);
      ctx.lineTo(-S * 0.3, 3);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawSparks(ctx, ship) {
    for (const s of ship.sparks) {
      ctx.fillStyle = rgba(LAMP, Math.max(0, s.life * 2.2));
      ctx.beginPath();
      ctx.arc(s.x, s.y, 0.8 + s.life * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawHull(ctx, S, ship, t) {
    // ---- twin thruster bells
    for (const side of [-1, 1]) {
      const oy = side * S * 0.105;
      ctx.fillStyle = rgba([14, 18, 20], 1);
      ctx.beginPath();
      ctx.moveTo(-S * 0.26, oy - 6);
      ctx.lineTo(-S * 0.48, oy - 5);
      ctx.quadraticCurveTo(-S * 0.56, oy, -S * 0.48, oy + 5);
      ctx.lineTo(-S * 0.26, oy + 6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgba(HULL_HI, 0.85);
      ctx.lineWidth = 1.1;
      ctx.stroke();
      // lit rim
      ctx.strokeStyle = rgba(LAMP, 0.4 + ship.thrustAmt * 0.5);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(-S * 0.48, oy, 2.6, 4.6, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // ---- swept ventral planes (read as wings at a glance)
    ctx.fillStyle = rgba([12, 16, 18], 0.98);
    ctx.beginPath();
    ctx.moveTo(S * 0.12, 0);
    ctx.lineTo(-S * 0.12, S * 0.42);
    ctx.lineTo(-S * 0.36, S * 0.36);
    ctx.lineTo(-S * 0.14, S * 0.04);
    ctx.lineTo(-S * 0.14, -S * 0.04);
    ctx.lineTo(-S * 0.36, -S * 0.36);
    ctx.lineTo(-S * 0.12, -S * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(COLD, 0.45);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(S * 0.08, -2);
    ctx.lineTo(-S * 0.14, -S * 0.40);
    ctx.lineTo(-S * 0.34, -S * 0.34);
    ctx.moveTo(S * 0.08, 2);
    ctx.lineTo(-S * 0.14, S * 0.40);
    ctx.lineTo(-S * 0.34, S * 0.34);
    ctx.stroke();
    // wingtip lamps
    ctx.fillStyle = rgba(LAMP, 0.7);
    ctx.beginPath(); ctx.arc(-S * 0.14, -S * 0.40, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rgba(BRICK, 0.75);
    ctx.beginPath(); ctx.arc(-S * 0.14,  S * 0.40, 1.6, 0, Math.PI * 2); ctx.fill();

    // ---- main fuselage
    ctx.fillStyle = rgba(HULL, 1);
    ctx.beginPath();
    ctx.moveTo(S * 0.52, 0);
    ctx.bezierCurveTo(S * 0.36, -S * 0.075, S * 0.08, -S * 0.145, -S * 0.1, -S * 0.15);
    ctx.lineTo(-S * 0.36, -S * 0.12);
    ctx.quadraticCurveTo(-S * 0.44, 0, -S * 0.36, S * 0.12);
    ctx.lineTo(-S * 0.1, S * 0.15);
    ctx.bezierCurveTo(S * 0.08, S * 0.145, S * 0.36, S * 0.075, S * 0.52, 0);
    ctx.closePath();
    ctx.fill();

    // dorsal armour ridge
    const ridge = ctx.createLinearGradient(S * 0.48, 0, -S * 0.32, 0);
    ridge.addColorStop(0, rgba([120, 132, 128], 1));
    ridge.addColorStop(0.25, rgba([78, 92, 96], 1));
    ridge.addColorStop(1, rgba(HULL, 1));
    ctx.fillStyle = ridge;
    ctx.beginPath();
    ctx.moveTo(S * 0.48, 0);
    ctx.bezierCurveTo(S * 0.28, -S * 0.06, S * 0.02, -S * 0.1, -S * 0.22, -S * 0.09);
    ctx.lineTo(-S * 0.34, -S * 0.035);
    ctx.lineTo(-S * 0.34, S * 0.035);
    ctx.lineTo(-S * 0.22, S * 0.09);
    ctx.bezierCurveTo(S * 0.02, S * 0.1, S * 0.28, S * 0.06, S * 0.48, 0);
    ctx.closePath();
    ctx.fill();

    // bright hull stroke so it doesn't dissolve into the void
    ctx.strokeStyle = rgba([210, 220, 214], 0.42);
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.moveTo(S * 0.52, 0);
    ctx.bezierCurveTo(S * 0.36, -S * 0.075, S * 0.08, -S * 0.145, -S * 0.1, -S * 0.15);
    ctx.lineTo(-S * 0.36, -S * 0.12);
    ctx.quadraticCurveTo(-S * 0.44, 0, -S * 0.36, S * 0.12);
    ctx.lineTo(-S * 0.1, S * 0.15);
    ctx.bezierCurveTo(S * 0.08, S * 0.145, S * 0.36, S * 0.075, S * 0.52, 0);
    ctx.stroke();

    // panel seams
    ctx.strokeStyle = rgba(COLD, 0.28);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(S * 0.24, -S * 0.065); ctx.lineTo(S * 0.24, S * 0.065);
    ctx.moveTo(S * 0.02, -S * 0.1);  ctx.lineTo(S * 0.02, S * 0.1);
    ctx.moveTo(-S * 0.18, -S * 0.1); ctx.lineTo(-S * 0.18, S * 0.1);
    ctx.stroke();

    // ---- canopy glass
    const canopy = ctx.createLinearGradient(S * 0.32, -S * 0.09, S * 0.06, S * 0.07);
    canopy.addColorStop(0, rgba([230, 245, 248], 0.7));
    canopy.addColorStop(0.35, rgba(COLD, 0.65));
    canopy.addColorStop(1, rgba([30, 55, 62], 0.85));
    ctx.fillStyle = canopy;
    ctx.beginPath();
    ctx.moveTo(S * 0.36, 0);
    ctx.bezierCurveTo(S * 0.3, -S * 0.095, S * 0.12, -S * 0.1, S * 0.02, -S * 0.055);
    ctx.lineTo(S * 0.02, S * 0.055);
    ctx.bezierCurveTo(S * 0.12, S * 0.1, S * 0.3, S * 0.095, S * 0.36, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(LAMP, 0.55);
    ctx.lineWidth = 1.1;
    ctx.stroke();
    // specular
    ctx.strokeStyle = rgba([255, 255, 255], 0.55);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(S * 0.32, -S * 0.025);
    ctx.quadraticCurveTo(S * 0.22, -S * 0.08, S * 0.1, -S * 0.06);
    ctx.stroke();

    // ---- side rail guns / sensors
    for (const side of [-1, 1]) {
      ctx.fillStyle = rgba(HULL_HI, 0.95);
      ctx.fillRect(-S * 0.2, side * S * 0.155 - 1.3, S * 0.3, 2.6);
      ctx.fillStyle = rgba(LAMP, 0.7);
      ctx.fillRect(S * 0.06, side * S * 0.155 - 0.8, S * 0.05, 1.6);
      // forward tip of rail
      ctx.fillStyle = rgba([230, 236, 232], 0.7);
      ctx.fillRect(S * 0.1, side * S * 0.155 - 0.5, S * 0.08, 1);
    }

    // ---- nose needle + lamp tip
    ctx.strokeStyle = rgba([220, 228, 224], 0.85);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(S * 0.42, 0);
    ctx.lineTo(S * 0.62, 0);
    ctx.stroke();
    const tipPulse = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(t * 6));
    ctx.fillStyle = rgba(LAMP, 0.95 * tipPulse);
    ctx.shadowColor = rgba(LAMP, 1);
    ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(S * 0.62, 0, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // chin intake scoop
    ctx.fillStyle = rgba([8, 10, 12], 0.95);
    ctx.beginPath();
    ctx.moveTo(S * 0.2, S * 0.055);
    ctx.lineTo(S * 0.02, S * 0.12);
    ctx.lineTo(-S * 0.08, S * 0.105);
    ctx.lineTo(S * 0.1, S * 0.045);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(BRICK, 0.35);
    ctx.stroke();
  }

  /* ---- maths ------------------------------------------------------ */

  function approach(cur, tgt, rate, dt) {
    return cur + (tgt - cur) * Math.min(1, (dt || 0) * rate);
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function wrap(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }
  function turn(cur, want, maxStep) {
    const d = clamp(wrap(want - cur), -maxStep, maxStep);
    return cur + d;
  }

  /* ---- fuel caches scattered along the span -------------------- */

  function seedFuel(minX, maxX, count, nearX) {
    const cans = [];
    const n = count || 18;
    let s = 0xFEEDCA5E | 0;
    const rnd = () => {
      s = s + 0x6D2B79F5 | 0;
      let x = Math.imul(s ^ s >>> 15, 1 | s);
      x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x;
      return ((x ^ x >>> 14) >>> 0) / 4294967296;
    };
    const span = maxX - minX;
    const mid = nearX != null ? nearX : (minX + maxX) * 0.5;
    cans.push(
      { id: "fuel-near-0", x: mid - 2800, oy: 0.36, amt: 48, taken: false, phase: 1.1, pop: 0 },
      { id: "fuel-near-1", x: mid + 4200, oy: 0.44, amt: 52, taken: false, phase: 2.7, pop: 0 }
    );
    for (let i = 0; i < n; i++) {
      const u = rnd();
      const x = minX + span * (0.08 + u * 0.84);
      if (Math.abs(x - mid) < 5500) continue;
      // keep cans inside the ship's vertical band so none are stranded
      const oy = 0.32 + rnd() * 0.20;
      cans.push({
        id: "fuel-" + i,
        x,
        oy,
        amt: 40 + Math.floor(rnd() * 35),
        taken: false,
        phase: rnd() * 6.283,
        pop: 0,
      });
    }
    return cans;
  }

  function drawFuel(ctx, cans, env) {
    const { W, H, camX, t, viewUnits } = env;
    const sc = W / viewUnits;
    for (const c of cans) {
      if (c.taken && c.pop <= 0) continue;
      const sx = (c.x - camX) * 0.94 * sc + W * 0.5;
      const sy = c.oy * H;
      if (sx < -40 || sx > W + 40) continue;

      const pulse = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 3.2 + c.phase));
      ctx.save();
      ctx.translate(sx, sy);

      if (c.taken) {
        // claim burst
        const u = 1 - c.pop;
        ctx.globalAlpha = c.pop;
        ctx.strokeStyle = rgba(LAMP, 0.8);
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(0, 0, 6 + u * 18, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
        continue;
      }

      // soft halo
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 16);
      g.addColorStop(0, rgba(LAMP, 0.35 * pulse));
      g.addColorStop(1, rgba(LAMP, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();

      // canister body
      ctx.fillStyle = rgba([22, 28, 30], 0.95);
      ctx.strokeStyle = rgba(LAMP, 0.7 * pulse);
      ctx.lineWidth = 1.2;
      roundRect(ctx, -5, -8, 10, 14, 2);
      ctx.fill(); ctx.stroke();

      // fuel fill
      ctx.fillStyle = rgba(LAMP, 0.75);
      ctx.fillRect(-3.2, 1, 6.4, 3.5);

      // droplet mark on the can
      ctx.fillStyle = rgba(LAMP, 0.95);
      ctx.beginPath();
      ctx.moveTo(0, -5.5);
      ctx.bezierCurveTo(2.4, -3.2, 2.4, -0.6, 0, 0.8);
      ctx.bezierCurveTo(-2.4, -0.6, -2.4, -3.2, 0, -5.5);
      ctx.fill();

      // cap
      ctx.fillStyle = rgba(HULL_HI, 1);
      ctx.fillRect(-3, -10, 6, 2.5);

      ctx.restore();
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* collect any cache the hull is on; returns total fuel gained */
  function collectFuel(ship, cans, env, dt) {
    const { W, H, camX, viewUnits } = env;
    const sc = W / viewUnits;
    const sp = screenPos(ship, W);
    let gained = 0;
    for (const c of cans) {
      if (c.pop > 0) c.pop = Math.max(0, c.pop - dt * 2.2);
      if (c.taken) continue;
      const sx = (c.x - camX) * 0.94 * sc + W * 0.5;
      const sy = c.oy * H;
      if (Math.hypot(sx - sp.x, sy - sp.y) < 28) {
        c.taken = true;
        c.pop = 1;
        gained += addFuel(ship, c.amt);
      }
    }
    return gained;
  }

  function fuelForRadar(cans) {
    return cans.filter(c => !c.taken).map(c => ({
      id: c.id, cam: c.x, oy: c.oy, fuel: true,
    }));
  }

  return {
    BASE, create, resize, setPower, setCourse, setThrusting,
    clearCourse, step, draw, screenPos, touching, touchingMark, stats, canBurn,
    addFuel, seedFuel, drawFuel, collectFuel, fuelForRadar,
  };
})();