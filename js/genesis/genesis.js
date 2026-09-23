/* ===========================================================
   GENESIS — how the span began.

   Autoplay cinematic. First Setting visit (or Intro Cutscene)
   plays the record from the point: the span comes out of the
   left of the frame, the old ones walk the deck, Primordisentia
   is found and warped then bound, two lights tear out and fight
   in the void. Obrokxus wins. Rex becomes Rex the Surface.
   Then the chase, the children's war, the warlocks, the Hound,
   Mordrial's fall, and the duel that has not ended. Skip /
   Escape jumps to the fade into the live bridge.

   Direction: u grows east, east is screen right, and the record
   runs west. Whoever is running away holds the smaller u of a pair.
   =========================================================== */

window.Genesis = (function () {
  const G = window.Gen;
  const { smooth, clamp, mix, approach } = Util;
  const { FORCE, JUMP, reduced, BEATS, ROOT_U, MAIN_U, EAST_U, CITY_U, NEST_U, DIVE_DEPTH,
          FLEE_CAM_RATE, ET_CAM_RATE, TICK_STEP, TICK_SLACK, pending, idxOf, since, linear,
          only } = G;
  const { fillBg, drawMotes, drawChaos, drawPoint, drawBridgeLine, drawOldOnes, drawStains,
          drawFlesh, drawSouls, drawRip, lightsAt, pushTrail, drawTrail, drawOrb, drawRings,
          drawBeam, drawName } = GenVoid;
  const { chaseAt, chaseCamLead, duelDrift, duelCamLead, drawRexLand, drawRexHole,
          drawRexGrip, drawBuried, drawGodsBirth, drawDepths } = GenRex;
  const { drawSaga, drawLiveWorld } = GenSaga;

  const overlay = document.getElementById("genesis");
  const tagEl   = document.getElementById("genesis-tag");
  const lineEl  = document.getElementById("genesis-line");
  const copyEl  = overlay && overlay.querySelector(".genesis-copy");
  const ticksEl = document.getElementById("genesis-ticks");
  const trackEl = document.getElementById("genesis-track");
  const prevEl  = document.getElementById("genesis-prev");
  const nextEl  = document.getElementById("genesis-next");
  const skipEl  = document.getElementById("genesis-skip");
  const host    = document.getElementById("bridge-hero");

  function paintCopy() {
    const b = BEATS[G.beat];
    if (!b || !copyEl) return;
    if (overlay) overlay.dataset.beat = b.id || "";
    if (!b.line) {
      copyEl.classList.remove("on");
      copyEl.classList.add("out");
      if (tagEl) tagEl.textContent = "";
      return;
    }
    copyEl.classList.remove("on", "out");
    if (tagEl) tagEl.textContent = b.tag;
    if (lineEl) lineEl.textContent = b.line;
    requestAnimationFrame(() => copyEl.classList.add("on"));
  }

  function paintTicks() {
    if (!trackEl) return;
    let bar = trackEl.querySelector(".genesis-prog");
    if (!bar) {
      trackEl.innerHTML = '<span class="genesis-prog"><i></i></span>';
      bar = trackEl.querySelector(".genesis-prog");
    }
    const fill = bar && bar.querySelector("i");
    const n = Math.max(1, BEATS.length - 1);
    const dur = Math.max(0.001, (BEATS[G.beat] && BEATS[G.beat].dur) || 1);
    const u = clamp((G.beat + clamp(G.local / dur, 0, 1)) / n, 0, 1);
    if (fill) fill.style.width = (u * 100).toFixed(2) + "%";
  }

  function go(i) {
    G.beat = clamp(i, 0, BEATS.length - 1);
    G.local = 0;
    if (BEATS[G.beat] && BEATS[G.beat].id === "flee") {
      G.trailY.length = 0;
      G.trailR.length = 0;
    }
    if (BEATS[G.beat] && BEATS[G.beat].id === "eternity") {
      G.trailR.length = 0;
      G.trailM.length = 0;
      G.trailA.length = 0;
      G.trailH.length = 0;
    }
    if (BEATS[G.beat] && BEATS[G.beat].id === "gods") {
      for (const tg of G.trailG) tg.length = 0;
    }
    paintCopy();
    paintTicks();
  }

  function remember() {
    if (window.XP && XP.flag) XP.flag("genesis");
  }

  function veilCanvas() {
    const cv = document.getElementById("bridge-canvas");
    if (!cv) return;
    const c = cv.getContext("2d");
    if (!c) return;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = "#0d1114";
    c.fillRect(0, 0, cv.width, cv.height);
    c.restore();
  }

  function resetFX() {
    G.trailY.length = 0;
    G.trailR.length = 0;
    G.trailM.length = 0;
    G.trailA.length = 0;
    G.trailH.length = 0;
    for (const tg of G.trailG) tg.length = 0;
    G.rings.length = 0;
    G.flash = 0;
    G.clashCool = 0;
    G.tickAcc = 0;
    G.tick60 = false;
    G.shakeRX = 0;
    G.shakeRY = 0;
    for (const k in G.nameSeen) delete G.nameSeen[k];
  }

  function finish() {
    if (!G.active) return;
    G.active = false;
    removeEventListener("wheel", holdPage, { passive: false });
    removeEventListener("touchmove", holdPage, { passive: false });
    remember();
    if (overlay) {
      // a focused Skip/Next button would keep focus inside a subtree we're
      // about to aria-hide; let it go first (it drops to the page, as before)
      if (overlay.contains(document.activeElement)) document.activeElement.blur();
      overlay.hidden = true;
      overlay.setAttribute("aria-hidden", "true");
    }
    if (tagEl) tagEl.textContent = "";
    if (lineEl) lineEl.textContent = "";
    document.documentElement.classList.remove("genesis-on");
    if (host) host.classList.remove("is-cinematic");
    document.dispatchEvent(new CustomEvent("site:genesis-done", {
      detail: { mode: G.thenMode, camX: G.thenCamX },
    }));
  }

  function play(opts) {
    if (G.active) return;
    if (reduced && !FORCE) return;
    G.thenMode = (opts && opts.thenMode) || "void";
    G.thenCamX = opts && opts.thenCamX;
    if (G.thenCamX == null && window.World && G.thenMode === "void")
      G.thenCamX = World.LAND.bridge;
    G.active = true;
    remember();     // counted from the start: leaving mid-way doesn't replay it
    addEventListener("wheel", holdPage, { passive: false });
    addEventListener("touchmove", holdPage, { passive: false });
    G.beat = 0;
    G.local = 0;
    G.shake = 0;
    G.t = 0;
    G.cam = 0;
    G.camTarget = 0;
    resetFX();
    veilCanvas();
    if (overlay) {
      overlay.hidden = false;
      overlay.setAttribute("aria-hidden", "false");
    }
    document.documentElement.classList.add("genesis-on");
    if (host) host.classList.add("is-cinematic");
    try { scrollTo({ top: 0, behavior: "instant" }); } catch (e) {}
    const jump = JUMP;
    if (jump) {
      const i = idxOf(jump[1]);
      if (i > 0) {
        go(i);
        if (i >= idxOf("war")) { G.cam = MAIN_U; G.camTarget = MAIN_U; }
        else if (i >= idxOf("flee")) { G.cam = ROOT_U - 0.30; G.camTarget = G.cam; }
        else if (i >= idxOf("land")) { G.cam = ROOT_U - 0.30; G.camTarget = G.cam; }
      }
    }
    paintCopy();
    paintTicks();
    document.dispatchEvent(new CustomEvent("site:genesis-start"));
  }

  function skip() {
    if (!G.active) return;
    const last = idxOf("now");
    if (G.beat >= last && G.local > 0.12) { finish(); return; }
    go(last);
  }

  function seek(i, frac) {
    if (!G.active) return;
    i = clamp(i, 0, BEATS.length - 1);
    frac = clamp(frac, 0, 1);
    if (i === BEATS.length - 1) frac = 0;
    if (i !== G.beat) go(i);
    const dur = BEATS[i].dur;
    G.local = frac >= 1 ? dur - 0.001 : frac * dur;
    resetFX();
    G.shake = 0;
    const aim = camAim();
    G.camTarget = aim.target;
    G.cam = aim.target;
    paintTicks();
  }

  function stepBeat(dir) {
    if (!G.active) return;
    if (dir > 0) {
      if (G.beat >= BEATS.length - 1) { finish(); return; }
      seek(G.beat + 1, 0);
    } else {
      seek(G.local > 1.5 ? G.beat : G.beat - 1, 0);
    }
  }

  function seekFromPointer(e) {
    if (!trackEl) return;
    const r = trackEl.getBoundingClientRect();
    const u = clamp((e.clientX - r.left) / Math.max(1, r.width), 0, 1);
    const pos = u * (BEATS.length - 1);
    const i = Math.floor(pos);
    seek(i, pos - i);
  }

  function camAim() {
    let target = 0;
    const uWalk  = since("walk");
    const uRoot  = since("root");
    const uFlee  = since("flee");
    const uWar   = since("war");
    const uStall = since("stalemate");
    const uLock  = since("firstlock");
    const uFour  = since("four");
    const uFifth = since("fifth");
    const uFall  = since("fall");
    const uRet   = since("return");
    const uEt    = since("eternity");
    let camRateOverride = null;
    if (uEt > 0) {
      /* ride the duel itself instead of a canned sweep, and lead it
         by exactly the smoothing lag, so the pair stays centred all
         the way out rather than trailing a third of a screen */
      const etP = linear("eternity");
      camRateOverride = mix(1.20, ET_CAM_RATE, smooth(clamp(etP / 0.22, 0, 1)));
      target = duelDrift(etP) + duelCamLead(etP, camRateOverride);
    }
    else if (uRet > 0.02)
      target = mix(MAIN_U - 0.04, CITY_U - 0.06, smooth(uRet));
    else if (uFall > 0.02) {
      /* hold on the air fight over the duel ground, then ease back to
         where the return beat starts */
      const onFight = mix(NEST_U + 0.04, MAIN_U + 0.28, smooth(clamp(uFall / 0.25, 0, 1)));
      target = mix(onFight, MAIN_U - 0.04, smooth(clamp((uFall - 0.80) / 0.20, 0, 1)));
    }
    else if (uFifth > 0.02)
      target = mix(MAIN_U + 0.16, NEST_U + 0.04, smooth(uFifth));
    else if (uFour > 0.02)
      target = mix(MAIN_U + 0.02, MAIN_U + 0.20, smooth(uFour));
    else if (uLock > 0.02)
      target = mix(MAIN_U - 0.10, MAIN_U + 0.04, smooth(uLock));
    else if (uStall > 0.02)
      target = mix(MAIN_U + 0.08, MAIN_U - 0.08, smooth(uStall));
    else if (uWar > 0.02)
      /* starts exactly where the chase left the camera, so the pull
         back onto the battlefield is a move and not a cut */
      target = mix(EAST_U + 0.16, MAIN_U + 0.10, smooth(uWar));
    else if (uFlee > 0) {
      /* framed on the three of them, not on a fixed sweep — the fixed
         sweep is what pushed the two chasers off the left edge */
      const fP = linear("flee");
      target = chaseAt(fP).cam + chaseCamLead(fP);
    }
    else if (uWalk < 0.001) target = 0;
    else if (uRoot > 0.02)
      /* root through rex the surface hold still with half the womb
         past the right edge; panning further east shows its ragged side.
         during the surface beat it eases onto where the chase camera
         starts, so the flee beat opens on a move and not a jerk */
      target = mix(ROOT_U - 0.50, chaseAt(0).cam + chaseCamLead(0), since("land"));
    else
      target = mix(0, ROOT_U - 0.50, clamp(uWalk, 0, 1));
    let camRate = 1.55;
    if (uWalk > 0.001 && uRoot < 0.02) camRate = 2.25;
    if (uFlee > 0 && uWar < 0.02) camRate = FLEE_CAM_RATE;
    if (camRateOverride != null) camRate = camRateOverride;
    return { target, rate: camRate };
  }

  function step(dt) {
    if (!G.active) return false;
    G.t += dt;
    G.local += dt;
    G.tickAcc += dt;
    G.tick60 = G.tickAcc >= TICK_STEP - TICK_SLACK;
    if (G.tick60) {
      G.tickAcc = Math.min(G.tickAcc - TICK_STEP, TICK_STEP);
      G.shakeRX = Math.random() - 0.5;
      G.shakeRY = Math.random() - 0.5;
    }
    G.shake = Math.max(0, G.shake - dt * 3.6);
    G.flash = Math.max(0, G.flash - dt * 3.2);
    G.clashCool = Math.max(0, G.clashCool - dt);
    for (let i = G.rings.length - 1; i >= 0; i--) {
      G.rings[i].r += dt * 220;
      G.rings[i].a -= dt * 1.35;
      if (G.rings[i].a <= 0) G.rings.splice(i, 1);
    }

    const aim = camAim();
    G.camTarget = aim.target;
    G.cam = approach(G.cam, G.camTarget, aim.rate, dt);
    paintTicks();

    const b = BEATS[G.beat];
    if (b && G.local >= b.dur) {
      if (G.beat >= BEATS.length - 1) { finish(); return false; }
      go(G.beat + 1);
    }
    return true;
  }

  function draw(ctx, env) {
    if (!G.active) return;
    G.W = env.W; G.H = env.H;
    if (env.t != null) G.t = env.t;

    const sxh = G.shakeRX * G.shake * 12;
    const syh = G.shakeRY * G.shake * 9;
    ctx.save();
    ctx.translate(sxh, syh);

    const uDrawn = since("drawn");
    const uBreak = since("break");
    const uWalk  = since("walk");
    const uRoot  = since("root");
    const uSwarm = since("swarm");
    const uWomb  = since("womb");
    const uBirth = since("birth");
    const uFight = linear("fight");
    const uLand  = since("land");
    const uFlee  = since("flee");
    const uNow   = only("now");

    fillBg(ctx);
    const streak = uWalk * (1 - uRoot) * 52
      + uFlee * (1 - since("war")) * 70
      + since("eternity") * 84;
    drawMotes(ctx, clamp(uBreak * 0.55 + uWalk * 0.45 + uLand * 0.15 + uFlee * 0.2, 0, 1), streak);
    drawChaos(ctx, clamp((uBreak * 0.4 + uWalk * 0.55) * (1 - uLand * 0.7), 0, 1));

    const iDeep = idxOf("deep"), iSlip = idxOf("slip");
    let dive = 0;
    if (G.beat === iDeep) dive = smooth(clamp(linear("deep") / 0.30, 0, 1));
    else if (G.beat === iSlip) dive = 1 - smooth(clamp((linear("slip") - 0.45) / 0.55, 0, 1));
    const diveY = dive * DIVE_DEPTH * G.H;
    ctx.save();
    ctx.translate(0, -diveY);

    const uBreakLin = linear("break");
    const leave = smooth(clamp(uBreakLin * 3.2, 0, 1));
    const burst = smooth(clamp((uBreakLin - 0.22) / 0.45, 0, 1));
    const crack = leave * (1 - leave) * 4 * (1 - clamp(linear("walk") * 8, 0, 1));
    const pointVis = (G.beat > idxOf("point") ? 1 : mix(0.75, 1, linear("point"))) * (1 - leave);
    drawPoint(ctx, pointVis, crack);
    drawBridgeLine(ctx, uDrawn);

    const pain = 0.4 + uRoot * 0.2 + uSwarm * 1.15 * (1 - uWomb) + uWomb * 0.12;
    const approaching = clamp((G.cam - (ROOT_U - 0.95)) / 0.55, 0, 1);
    const fleshVis = approaching * (1 - uLand * 0.28);
    const flesh = drawFlesh(ctx, fleshVis, pain, uWomb);
    drawStains(ctx, flesh, uSwarm * (1 - uWomb) * fleshVis);
    const soulAmt = clamp((uRoot - 0.2) / 0.5, 0, 1) * mix(0.45, 1, uWomb) * (1 - uBirth * 0.55);
    drawSouls(ctx, flesh, soulAmt);

    const cling = clamp(uRoot * 0.25 + uSwarm * 0.9, 0, 1);
    const still = uWomb;
    const watch = clamp(uBirth * 0.4 + uFight, 0, 1);
    drawOldOnes(ctx, burst, uWalk, cling, still, watch, flesh);
    drawRip(ctx, flesh, clamp(uBirth * 2.6, 0, 1) * (1 - clamp((uBirth - 0.42) / 0.45, 0, 1)) * (1 - uFight));

    const L = lightsAt(uBirth, uFight, uLand, flesh);
    if (uBirth > 0.04 && G.beat < idxOf("gods")) {
      pushTrail(G.trailY, L.yx, L.yy);
      pushTrail(G.trailR, L.rx, L.ry);
      drawTrail(ctx, G.trailY, "245,138,52", L.yAmt);
      drawTrail(ctx, G.trailR, "90,12,18", L.rAmt, true);

      const dx = L.yx - L.rx, dy = L.yy - L.ry;
      const dist = Math.hypot(dx, dy);
      if (uFight > 0.05 && uLand < 0.15 && dist < 38 && G.clashCool <= 0 && L.wrap < 0.3) {
        G.flash = 1;
        G.shake = Math.max(G.shake, 0.95);
        G.clashCool = 0.26;
        G.rings.push({ x: (L.yx + L.rx) * 0.5, y: (L.yy + L.ry) * 0.5, r: 10, a: 1 });
      }
      const beamU = (uFight > 0.66 && uFight < 0.78) ? 1 - Math.abs(uFight - 0.72) / 0.12 : 0;
      drawBeam(ctx, L.yx, L.yy, L.rx, L.ry, beamU * Math.max(L.yAmt, L.rAmt));
      drawOrb(ctx, L.rx, L.ry, L.rAmt, "obrokxus");
      drawRexGrip(ctx, L.rx, L.ry, L.wrap * (1 - L.bury), Math.min(G.W, G.H) * mix(0.26, 0.11, L.wrap));
      drawOrb(ctx, L.yx, L.yy, L.yAmt, "rex");
      drawName(ctx, L.rx, L.ry, L.rAmt, "OBROKXUS", 34);
      drawName(ctx, L.yx, L.yy, L.yAmt, "REX", 30);
      drawRings(ctx);
    }
    drawGodsBirth(ctx, flesh);

    if (uFight > 0.08 && uLand < 0.2) G.shake = Math.max(G.shake, 0.22 + uFight * 0.2);
    if (uFight > 0.82 && uLand < 0.2) G.shake = Math.max(G.shake, 0.55 + (1 - L.yAmt) * 0.45);
    if (uBirth > 0.35 && uBirth < 0.95) G.shake = Math.max(G.shake, 0.32);
    if (uSwarm > 0.1 && uWomb < 0.2) G.shake = Math.max(G.shake, 0.18);

    const landRise = smooth(clamp(uLand / 0.9, 0, 1));
    /* inside Rex the depths paint opaque rock over everything below
       1.69 screen heights, so the land fill can stop just under that */
    const depthsOn = (G.beat === iDeep || G.beat === iSlip) && dive >= 0.001;
    drawRexLand(ctx, landRise, L.originX, L.originY, depthsOn ? G.H * 1.72 : null);
    drawBuried(ctx);
    drawDepths(ctx, dive, diveY);
    drawRexHole(ctx);
    drawSaga(ctx);
    ctx.restore();

    if (L.die > 0.02 && L.die < 0.55) {
      const p = 1 - Math.abs(L.die - 0.22) / 0.22;
      if (p > 0) {
        ctx.fillStyle = `rgba(40,4,8,${0.22 * p})`;
        ctx.fillRect(-20, -20, G.W + 40, G.H + 40);
      }
    }
    if (G.flash > 0.02) {
      ctx.fillStyle = `rgba(255,244,220,${0.18 * G.flash})`;
      ctx.fillRect(-20, -20, G.W + 40, G.H + 40);
    }

    ctx.restore();

    if (uNow > 0.001) {
      const fade = smooth(uNow);
      if (fade < 0.5) {
        ctx.fillStyle = `rgba(13,17,20,${fade / 0.5})`;
        ctx.fillRect(0, 0, G.W, G.H);
      } else {
        drawLiveWorld(ctx, 1);
        ctx.fillStyle = `rgba(13,17,20,${1 - (fade - 0.5) / 0.5})`;
        ctx.fillRect(0, 0, G.W, G.H);
      }
    }
  }

  /* ---- input --------------------------------------------- */
  // attached in play(), removed in finish(): the page scrolls freely otherwise
  function holdPage(e) {
    if (!G.active) return;
    e.preventDefault();
  }

  if (overlay) {
    overlay.addEventListener("click", e => {
      if (e.target === skipEl) return;
      e.stopPropagation();
    });
    overlay.addEventListener("pointerdown", e => {
      if (e.target === skipEl) return;
      e.stopPropagation();
    });
  }
  if (skipEl) {
    skipEl.addEventListener("click", e => {
      e.stopPropagation();
      skip();
    });
  }
  if (trackEl) {
    trackEl.addEventListener("pointerdown", e => {
      if (!G.active) return;
      e.preventDefault();
      try { trackEl.setPointerCapture(e.pointerId); } catch (err) {}
      seekFromPointer(e);
    });
    trackEl.addEventListener("pointermove", e => {
      if (!G.active || !trackEl.hasPointerCapture(e.pointerId)) return;
      seekFromPointer(e);
    });
  }
  if (prevEl) prevEl.addEventListener("click", e => { e.stopPropagation(); stepBeat(-1); });
  if (nextEl) nextEl.addEventListener("click", e => { e.stopPropagation(); stepBeat(1); });
  addEventListener("keydown", e => {
    if (!G.active) return;
    if (e.key === "Escape") { e.preventDefault(); skip(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); stepBeat(-1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); stepBeat(1); }
  }, true);

  document.addEventListener("site:enter", e => {
    const d = e.detail || {};
    if (G.active) return;
    if (FORCE) {
      setTimeout(() => { if (!G.active) play({ thenMode: "void" }); }, 80);
      return;
    }
    // autoplay only when Setting is picked at the gate
    if (d.entry === "gate" && d.mode === "void" && pending())
      play({ thenMode: "void" });
  });

  return {
    get active() { return G.active; },
    get pending() { return pending(); },
    play, skip, seek, step, draw,
  };
})();
