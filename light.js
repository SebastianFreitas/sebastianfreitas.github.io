/* =========================================================
   HeavyLight — homepage demo
   The cursor is a light source. Light carries momentum, so it
   pushes the crates. No engine, no library.
   ========================================================= */

(function () {
  const canvas = document.getElementById("light-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // ---- tuning ------------------------------------------------
  const GRAVITY      = 1400;   // px/s²
  const LIGHT_POWER  = 3.2e7;  // force constant, falls off with 1/d²
  const LIGHT_REACH  = 340;    // px — beyond this the light does nothing
  const MAX_ACCEL    = 9000;   // clamp so crates don't get launched off-screen
  const BOUNCE       = 0.25;
  const FRICTION     = 0.86;   // applied on ground contact, per second-ish
  const CRATE_COUNT  = 9;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let W = 0, H = 0, dpr = 1;
  let crates = [];
  let light = { x: -9999, y: -9999, on: false };
  let last = 0;

  // ---- setup -------------------------------------------------
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width  = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!crates.length) spawn();
  }

  function spawn() {
    crates = [];
    const floor = H - 40;
    for (let i = 0; i < CRATE_COUNT; i++) {
      const size = 26 + Math.random() * 30;
      crates.push({
        x: W * 0.08 + Math.random() * W * 0.84,
        y: floor - size,
        w: size,
        h: size,
        vx: 0,
        vy: 0,
        mass: size * size * 0.012,   // bigger crate, harder to move
      });
    }
  }

  // ---- physics -----------------------------------------------
  function step(dt) {
    const floor = H - 40;

    for (const c of crates) {
      // light pressure: radial, inverse-square, clamped
      if (light.on) {
        const cx = c.x + c.w / 2;
        const cy = c.y + c.h / 2;
        const dx = cx - light.x;
        const dy = cy - light.y;
        const d2 = dx * dx + dy * dy;
        const d  = Math.sqrt(d2) || 1;
        if (d < LIGHT_REACH) {
          let a = LIGHT_POWER / (d2 * c.mass);
          a = Math.min(a, MAX_ACCEL);
          c.vx += (dx / d) * a * dt;
          c.vy += (dy / d) * a * dt;
        }
      }

      c.vy += GRAVITY * dt;
      c.x  += c.vx * dt;
      c.y  += c.vy * dt;

      // floor
      if (c.y + c.h > floor) {
        c.y = floor - c.h;
        c.vy = -c.vy * BOUNCE;
        if (Math.abs(c.vy) < 30) c.vy = 0;
        c.vx *= Math.pow(FRICTION, dt * 60 / 60 + 0.4);
      }
      // ceiling
      if (c.y < 0) { c.y = 0; c.vy = Math.abs(c.vy) * BOUNCE; }
      // walls
      if (c.x < 0) { c.x = 0; c.vx = Math.abs(c.vx) * BOUNCE; }
      if (c.x + c.w > W) { c.x = W - c.w; c.vx = -Math.abs(c.vx) * BOUNCE; }
    }

    // cheap crate-vs-crate separation so they stack instead of overlapping
    for (let i = 0; i < crates.length; i++) {
      for (let j = i + 1; j < crates.length; j++) {
        const a = crates[i], b = crates[j];
        const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        if (ox > 0 && oy > 0) {
          const total = a.mass + b.mass;
          if (ox < oy) {                       // push apart horizontally
            const s = a.x < b.x ? -1 : 1;
            a.x += s * ox * (b.mass / total);
            b.x -= s * ox * (a.mass / total);
            a.vx *= 0.6; b.vx *= 0.6;
          } else {                             // vertically
            const s = a.y < b.y ? -1 : 1;
            a.y += s * oy * (b.mass / total);
            b.y -= s * oy * (a.mass / total);
            a.vy *= 0.4; b.vy *= 0.4;
          }
        }
      }
    }
  }

  // ---- rendering ---------------------------------------------
  function draw() {
    ctx.clearRect(0, 0, W, H);
    const floor = H - 40;

    // the light itself
    if (light.on) {
      const g = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, LIGHT_REACH);
      g.addColorStop(0,    "rgba(245, 208, 107, 0.30)");
      g.addColorStop(0.35, "rgba(245, 208, 107, 0.10)");
      g.addColorStop(1,    "rgba(245, 208, 107, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    // floor line
    ctx.strokeStyle = "#2b3438";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, floor + 0.5);
    ctx.lineTo(W, floor + 0.5);
    ctx.stroke();

    // crates, brighter the closer they are to the light
    for (const c of crates) {
      let lit = 0;
      if (light.on) {
        const dx = c.x + c.w / 2 - light.x;
        const dy = c.y + c.h / 2 - light.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        lit = Math.max(0, 1 - d / LIGHT_REACH);
      }
      const base = 34 + lit * 90;
      ctx.fillStyle = `rgb(${Math.round(base + lit * 90)}, ${Math.round(base + lit * 60)}, ${Math.round(base + lit * 20)})`;
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeStyle = `rgba(245, 208, 107, ${0.15 + lit * 0.6})`;
      ctx.strokeRect(c.x + 0.5, c.y + 0.5, c.w - 1, c.h - 1);
    }
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    step(dt);
    draw();
    requestAnimationFrame(frame);
  }

  // ---- input -------------------------------------------------
  const hint = document.getElementById("hint");
  function setLight(x, y) {
    const r = canvas.getBoundingClientRect();
    light.x = x - r.left;
    light.y = y - r.top;
    light.on = true;
    if (hint) hint.classList.add("gone");
  }

  window.addEventListener("pointermove", (e) => setLight(e.clientX, e.clientY));
  window.addEventListener("pointerdown", (e) => setLight(e.clientX, e.clientY));
  window.addEventListener("pointerleave", () => { light.on = false; });
  window.addEventListener("resize", resize);

  // ---- go ----------------------------------------------------
  resize();
  if (reduced) {
    draw();                       // static scene, no motion
  } else {
    requestAnimationFrame((t) => { last = t; frame(t); });
  }
})();
