/* js/bridge/bridge-loop.js — the voidship's travel step and the paint loop */
(function () {
  const B = window.Bridge;
  if (!B) return;
  const {
    ctx, CAM, SLOT, noteEls,
    activeMarks, markScreen, onScreen, viewUnitsNow, syncPhone,
  } = B;
  const { approach } = Util;

  /* ---- movement: the voidship owns travel ---- */
  function step(dt) {
    if (B.frozen) { B.vel = 0; return; }

    // keep the craft alive under the boot veil (bob only)
    if (B.ship && !B.started) {
      B.ship.bob += dt;
      return;
    }
    if (!B.started) return;

    if (B.ship) {
      B.retargetFromPointer();
      const prev = B.camX;
      const out = Voidship.step(B.ship, dt, {
        camX: B.camX, W: B.W, H: B.H, frozen: B.frozen, viewUnits: viewUnitsNow(),
      });
      B.camX = out.camX;
      B.vel = out.vel;
      B.travelled += Math.abs(B.camX - prev);

      if (B.camX < CAM.min) { B.camX = CAM.min; B.ship.vel = 0; B.vel = 0; }
      if (B.camX > CAM.max) { B.camX = CAM.max; B.ship.vel = 0; B.vel = 0; }

      // beacon contact → file only when the hull actually reaches it
      if (B.ship.courseMark && performance.now() >= B.courseArmAt) {
        const m = B.ship.courseMark;
        const p = markScreen(m);
        if (Voidship.touchingMark(B.ship, B.camX, m, { W: B.W, x: p.x, y: p.y, hit: B.HIT + 10, pad: B.phone ? 420 : 220 })) {
          B.selectMark(m);
          B.courseArmAt = 0;
        }
      }

      if (B.activeMark && Math.abs(B.camX - B.activeMark.cam) > SLOT * 0.9) B.clearMark();
      if (B.ship.thrustAmt > 0.15) B.hintDone("fuel");
      if (!B.ship.infinite && B.ship.fuel <= 0.05) {
        if (!B.fuelWarned) {
          B.fuelWarned = true;
          B.log.push("tanks dry · release to regen", "loc");
        }
      } else {
        B.fuelWarned = false;
      }
      return;
    }

    B.vel *= Math.exp(-dt / CAM.glideTau);
    if (Math.abs(B.vel) < 8) B.vel = 0;
    const prev = B.camX;
    B.camX += B.vel * dt;
    B.travelled += Math.abs(B.camX - prev);
    if (B.camX < CAM.min) { B.camX = CAM.min; B.vel = 0; }
    if (B.camX > CAM.max) { B.camX = CAM.max; B.vel = 0; }
  }
  B.step = step;

  /* ---- loop ---- */
  function atRest() {
    if (B.frozen || B.xswitch || B.thrustId != null || B.vel !== 0) return false;
    if (window.Genesis && Genesis.active) return false;
    if (!B.marksSettled()) return false;
    if (B.sceneMode === "gamedev" && Storm.lively()) return false;
    if (B.sceneMode === "gamedev" && Forge.lively()) return false;
    if (!B.ship) return true;
    return Voidship.settled(B.ship);
  }
  B.atRest = atRest;

  B.pacer = Pacer.create({ paint: render, atRest, alive: () => B.visible && !B.portrait && !document.hidden });

  window.pacingReport = () => B.pacer.report();
  window.shipReport = () => B.ship ? Voidship.stats(B.ship) : null;

  function render(raw) {
    // a claim holds travel still while the level lands
    // but the world keeps animating (t advances)
    B.t += raw;
    const dt = raw;

    if (window.Genesis && Genesis.active) {
      const going = Genesis.step(dt);
      if (going) {
        Genesis.draw(ctx, { W: B.W, H: B.H, t: B.t });
        return;
      }
    }
    if (B.ship && B.ship.alpha < 1) B.ship.alpha = approach(B.ship.alpha, 1, 2.4, dt);

    const warping = B.stepSwitch(dt);
    if (!warping) step(dt);

    // render behind the gate while assets warm up
    B.chaosNow  = approach(B.chaosNow,  B.sceneMode === "void" ? World.chaosAt(B.camX)  : 0, 1.4, dt);
    B.futureNow = approach(B.futureNow, B.sceneMode === "void" ? World.futureAt(B.camX) : 0, 1.4, dt);

    // DOM first (HUD text, minimap marker, note position), canvas after
    if (B.bridgeReady) B.updateHUD(dt);
    if (B.bridgeReady && B.activeMark && noteEls[B.activeMark.id] && noteEls[B.activeMark.id].classList.contains("show"))
      B.placeNote(noteEls[B.activeMark.id], B.activeMark);

    World.draw(ctx, {
      W: B.W, H: B.H, camX: B.camX, t: B.t, vel: B.vel,
      maxFling: CAM.maxFling,
      chaos: B.chaosNow, future: B.futureNow,
      mode: B.sceneMode, dt,
    });
    // a claim holds travel still while the level lands — but beacon
    // fade-in must keep using real time. With dt=0 here, the first
    // entry claim left every mark at vis=0 for the whole ceremony,
    // so the span looked empty (and stayed empty if unfreeze glitched).
    try {
      if (B.sceneMode === "gamedev") B.drawZones(dt);
      B.drawMarks(raw);
      if (B.sceneMode === "gamedev" && B.ship) B.drawStorm(dt);
      if (B.sceneMode === "gamedev") B.drawForge(dt);
      if (B.ship) {
        Voidship.draw(B.ship, ctx, { W: B.W, H: B.H, t: B.t, camX: B.camX, viewUnits: viewUnitsNow() });
      }
      B.drawSwitchFX();
    } catch (err) {
      if (!render._warned) { render._warned = 1; console.warn("beacon layer:", err); }
    }

    if (B.bridgeReady) B.drawInstruments(dt);
  }
  B.render = render;

  /* one still picture under the gate. Fades that the running loop would
     have finished behind the gate are settled first, so nothing fades in
     when the gate lifts. */
  function paintOnce() {
    if (B.portrait) return;
    if (B.pacer.running) return;
    B.chaosNow  = B.sceneMode === "void" ? World.chaosAt(B.camX)  : 0;
    B.futureNow = B.sceneMode === "void" ? World.futureAt(B.camX) : 0;
    if (B.ship) B.ship.alpha = 1;
    for (const m of activeMarks()) m.vis = onScreen(markScreen(m).x, 60) ? 1 : 0;
    render(0);
  }
  B.paintOnce = paintOnce;

  /* the log (mid-file) and HIT (top) are phone-dependent, so settle those
     numbers here, once every declaration in the file has run. */
  syncPhone();

  // the top bar floats clear over the hero and turns solid once the hero
  // has scrolled up under it
  function watchTopbar() {
    const bar = document.querySelector('.topbar');
    const hero = document.getElementById('bridge-hero');
    if (!bar || !hero || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(([e]) => {
      bar.classList.toggle('is-solid', !e.isIntersecting);
    }, { rootMargin: `-${bar.offsetHeight || 64}px 0px 0px 0px` }).observe(hero);
  }
  watchTopbar();
})();
