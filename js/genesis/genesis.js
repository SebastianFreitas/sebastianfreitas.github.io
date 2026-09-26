/* ===========================================================
   GENESIS — how the span began.

   Autoplay cinematic. First Setting visit (or Intro Cutscene)
   plays the record from the point: the span comes out of the
   left of the frame, the old ones walk the deck, Primordisentia
   is found and warped then bound, two lights tear out and fight
   in the void. Obrokxus escapes into the void; Ormius follows. Rex becomes Rex the Surface.
   Then the chase, the children's war, the warlocks born one by one
   (Cadmus, Aelius, Velindra) and bound fifth in a ritual of all four,
   the Hound, Mordrial's fall, and the duel that has not ended. Skip /
   Escape jumps to the fade into the live bridge.

   Direction: u grows east, east is screen right, and the record
   runs west. Whoever is running away holds the smaller u of a pair.
   =========================================================== */

window.Genesis = (function () {
  const G = window.Gen;
  const { smooth, clamp, mix, approach } = Util;
  const { FORCE, JUMP, reduced, BEATS, ROOT_U, MAIN_U, EAST_U, CITY_U, NEST_U, DIVE_DEPTH,
          FLEE_CAM_RATE, ET_CAM_RATE, TICK_STEP, TICK_SLACK, pending, idxOf, since, linear,
          only, sx } = G;
  const { fillBg, drawMotes, drawChaos, drawPoint, drawRip, lightsAt, pushTrail, drawTrail,
          drawOrb, drawRings, drawBeam, drawName } = GenVoid;
  const { chaseAt, chaseCamLead, escapeCam, escapeCamLead, drawRexLand, drawRexHole,
          drawBuried, drawGodsBirth } = GenRex;
  const { drawSaga, drawLiveWorld } = GenSaga;

  const OLD_TITANS = G.BEATS.some(b => b.id === "birth");

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

  let copyTimer = 0;
  let broke = false;
  function paintCopy(immediate) {
    const b = BEATS[G.beat];
    if (!b || !copyEl) return;
    if (overlay) overlay.dataset.beat = b.id || "";
    clearTimeout(copyTimer);
    if (!b.line) {
      copyEl.classList.remove("on");
      copyEl.classList.add("out");
      if (tagEl) tagEl.textContent = "";
      return;
    }
    const show = () => {
      copyEl.classList.remove("on", "out");
      if (tagEl) tagEl.textContent = b.tag;
      if (lineEl) lineEl.textContent = b.line;
      requestAnimationFrame(() => copyEl.classList.add("on"));
    };
    if (immediate || !copyEl.classList.contains("on")) { show(); return; }
    copyEl.classList.remove("on");
    copyEl.classList.add("out");
    copyTimer = setTimeout(show, 420);
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
    broke = i > idxOf("break");
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
        seek(i, 0);
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
    broke = i > idxOf("break");
    frac = clamp(frac, 0, 1);
    if (i === BEATS.length - 1) frac = 0;
    if (i !== G.beat) go(i);
    paintCopy(true);
    const dur = BEATS[i].dur;
    G.local = frac >= 1 ? dur - 0.001 : frac * dur;
    resetFX();
    G.shake = 0;
    const aim = camAim();
    G.cam = aim.target;
    G.camTarget = aim.target;
    G.zoom = aim.zoom;
    G.zoomTarget = aim.zoom;
    G.zoomKick = 0;
    if (window.GenArmies) GenArmies.reset();
    if (G.sparks) G.sparks.length = 0;
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

  /* slow push-in / pull-out per beat: [from, to] applied over the beat */
  const ZOOM = {
    point: [1.00, 1.08], drawn: [1.08, 1.00], break: [1.00, 1.05],
    elements: [1.05, 0.97], matter: [0.97, 1.00], trade: [1.00, 1.05], walk: [1.05, 1.02],
    root: [1.02, 1.06], enter: [1.06, 1.09],
    soup: [1.09, 1.09], eye: [1.09, 1.09], roles: [1.09, 1.09], circle: [1.09, 1.09], chains: [1.09, 1.09], corrupt: [1.09, 1.09], rex: [1.09, 1.09], dot: [1.09, 1.09], clash: [1.09, 1.09], death: [1.09, 1.09],
    gods: [1.00, 1.05], calm: [1.05, 1.05], deep: [1.05, 1.00],
    slip: [1.00, 1.05], flee: [1.05, 1.00], war: [1.00, 1.06], stalemate: [1.06, 1.02],
    firstlock: [1.02, 1.08], cadmus: [1.08, 1.10], aelius: [1.10, 1.06], velindra: [1.06, 1.10],
    four: [1.10, 1.02], fifth: [1.02, 1.10], fall: [1.10, 1.00],
    return: [1.00, 1.05], eternity: [1.05, 1.00], now: [1.00, 1.00],
  };

  /* enter: held-step push into the flesh ball, ending in a hard cut */
  const ENTER_ZOOM = [1.06, 1.22, 1.45, 1.8];
  function enterStep() { return Math.min(3, Math.floor(G.linear("enter") * 5)); }

  function camAim() {
    let target = 0;
    const uWalk  = since("walk");
    const uRoot  = since("root");
    const uFlee  = since("flee");
    const uWar   = since("war");
    const uStall = since("stalemate");
    const uLock  = since("firstlock");
    const uCad   = since("cadmus");
    const uAel   = since("aelius");
    const uVel   = since("velindra");
    const uFour  = since("four");
    const uFifth = since("fifth");
    const uFall  = since("fall");
    const uRet   = since("return");
    const uEt    = since("eternity");
    let camRateOverride = null;
    if (uEt > 0) {
      /* ride Ormius west, a little ahead of him, and lead by exactly
         the smoothing lag so he holds his place in frame all the way
         out */
      const etP = linear("eternity");
      camRateOverride = mix(1.20, ET_CAM_RATE, smooth(clamp(etP / 0.22, 0, 1)));
      target = escapeCam(etP) + escapeCamLead(etP, camRateOverride);
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
      target = mix(MAIN_U + 0.10, NEST_U + 0.02, smooth(uFifth));
    else if (uFour > 0.02)
      target = mix(MAIN_U - 0.18, MAIN_U + 0.10, smooth(uFour));
    else if (uVel > 0.02)
      target = mix(MAIN_U - 0.26, MAIN_U - 0.18, smooth(uVel));
    else if (uAel > 0.02)
      target = mix(MAIN_U - 0.14, MAIN_U - 0.26, smooth(uAel));
    else if (uCad > 0.02)
      target = mix(MAIN_U + 0.04, MAIN_U - 0.14, smooth(uCad));
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
    else if (G.beat === G.idxOf("enter"))
      target = ROOT_U - 0.50 + 0.50 * (enterStep() / 3);
    else if (G.beat > G.idxOf("enter") && G.beat <= G.idxOf("death"))
      target = ROOT_U;
    else if (uRoot > 0.02)
      /* root through rex the surface hold still with half the womb
         past the right edge; panning further east shows its ragged side.
         during the surface beat it eases onto where the chase camera
         starts, so the flee beat opens on a move and not a jerk */
      target = mix(ROOT_U - 0.50, chaseAt(0).cam + chaseCamLead(0), since("gods"));
    else
      target = mix(0, ROOT_U - 0.50, clamp(uWalk, 0, 1));
    let camRate = 1.55;
    if (uWalk > 0.001 && uRoot < 0.02) camRate = 2.25;
    if (uFlee > 0 && uWar < 0.02) camRate = FLEE_CAM_RATE;
    if (camRateOverride != null) camRate = camRateOverride;
    const cur = BEATS[G.beat];
    const zk = (cur && ZOOM[cur.id]) || [1, 1];
    const zoom = G.reduced ? 1
      : G.beat === G.idxOf("enter") ? ENTER_ZOOM[enterStep()]
      : mix(zk[0], zk[1], smooth(G.local / Math.max(0.001, cur ? cur.dur : 1)));
    return { target, rate: camRate, zoom };
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
    if (G.sparks) {
      for (let i = G.sparks.length - 1; i >= 0; i--) {
        const s = G.sparks[i];
        s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 900 * dt; s.t += dt;
        if (s.t > 0.45) G.sparks.splice(i, 1);
      }
    }

    const aim = camAim();
    G.camTarget = aim.target;
    G.zoomTarget = aim.zoom;
    G.zoomKick = Math.max(0, G.zoomKick - dt * 0.16);
    if (G.beat === G.idxOf("enter") && !G.reduced) {
      /* held steps: snap, never morph */
      G.cam = G.camTarget;
      G.zoom = G.zoomTarget + G.zoomKick;
    } else {
      G.cam = approach(G.cam, G.camTarget, aim.rate, dt);
      G.zoom = approach(G.zoom, G.zoomTarget + G.zoomKick, 3.0, dt);
    }
    paintTicks();

    const b = BEATS[G.beat];
    if (b && G.local >= b.dur) {
      if (G.beat >= BEATS.length - 1) { finish(); return false; }
      go(G.beat + 1);
    }
    return true;
  }

  const DASH = [[0.10, 0.14], [0.23, 0.27], [0.42, 0.46], [0.84, 0.88]];   // Rex's lunges
  const LASH = [[0.30, 0.36], [0.56, 0.62], [0.74, 0.80]];                 // Obrokxus's lunges
  function bump(windows, u) {   // 0..1 bump that rises over a window and settles 0.10 after it
    let v = 0;
    for (const [a, b] of windows) {
      const k = (u - (a - 0.02)) / ((b - a) + 0.12);
      if (k > 0 && k < 1) v = Math.max(v, Math.sin(Math.PI * k));
    }
    return v;
  }

  function draw(ctx, env) {
    if (!G.active) return;
    G.sparks = G.sparks || [];
    G.W = env.W; G.H = env.H;
    if (env.t != null) G.t = env.t;

    const sxh = G.shakeRX * G.shake * 12;
    const syh = G.shakeRY * G.shake * 9;
    ctx.save();
    ctx.translate(sxh, syh);
    const z = G.zoom || 1;
    if (z !== 1) {
      ctx.translate(G.W * 0.5, G.H * 0.5);
      ctx.scale(z, z);
      ctx.translate(-G.W * 0.5, -G.H * 0.5);
    }

    const uDrawn = since("drawn");
    const uBreak = since("break");
    const uWalk  = since("walk");
    const uRoot  = since("root");
    const uSwarm = since("enter");
    const uWomb  = since("soup");
    const pastBirth = G.beat >= G.idxOf("gods") ? 1 : 0;
    const uBirth = pastBirth;
    const uFight = pastBirth;
    const uLand  = since("gods");
    const uFlee  = since("flee");
    const uNow   = only("now");

    fillBg(ctx);
    if (window.GenTier3) GenTier3.draw(ctx, G.W, G.H, z, sxh, syh);
    const bl = G.BEATS[G.beat].id === "break" && window.GenTier3 ? GenTier3.offset("brim") : null;
    const lurched = !!(bl && bl.dx !== 0);
    const amt = clamp((uBreak * 0.4 + uWalk * 0.55) * (1 - uLand * 0.7), 0, 1);
    drawChaos(ctx, lurched && G.local < 2.5 ? Math.min(1, amt + 0.14) : amt);
    const streak = uWalk * (1 - uRoot) * 52
      + uFlee * (1 - since("war")) * 70
      + since("eternity") * 84;
    drawMotes(ctx, clamp(uBreak * 0.55 + uWalk * 0.45 + uLand * 0.15 + uFlee * 0.2, 0, 1), streak);
    GenElem.drawResidue(ctx);   // what the first waves left in the void, for good

    const iDeep = idxOf("deep"), iSlip = idxOf("slip");
    let dive = 0;
    if (G.beat === iDeep) dive = smooth(clamp(linear("deep") / 0.30, 0, 1));
    else if (G.beat === iSlip) dive = 1 - smooth(clamp((linear("slip") - 0.45) / 0.55, 0, 1));
    const diveY = dive * DIVE_DEPTH * G.H;
    ctx.save();
    ctx.translate(0, -diveY);

    const uBreakLin = linear("break");
    const leave = smooth(clamp(uBreakLin * 3.2, 0, 1));
    const crack = leave * (1 - leave) * 4 * (1 - clamp(linear("walk") * 8, 0, 1));
    const pointVis = (G.beat > idxOf("point") ? 1 : mix(0.75, 1, linear("point"))) * (1 - leave);
    drawPoint(ctx, pointVis, crack);

    /* the instant the point breaks: one flash, one shock ring, a hard shake */
    const breakLin = linear("break");
    if (breakLin > 0.20 && !broke) {
      broke = true;
      G.flash = 1;
      G.shake = Math.max(G.shake, 1.3);
      G.zoomKick = Math.max(G.zoomKick, 0.05);
      G.rings.push({ x: sx(0), y: 0.46 * G.H, r: 6, a: 1 });
    }
    GenVoid.drawSpan(ctx, uDrawn);
    GenElem.drawSea(ctx);
    GenOld.drawShards(ctx, clamp((breakLin - 0.22) / 0.70, 0, 1), lurched ? 0.15 : 0);
    GenElem.draw(ctx);        // wave one: dust, air, wind, sound, colour, light
    const tTrade = G.secs("trade");
    const march = mix(0.05 * smooth(clamp((tTrade - 8.4) / 1.6, 0, 1)), 1, uWalk);   // step off early, then keep pace with the camera
    // the old ones still climbing out of the mass sit behind its stones
    GenOld.drawOldOnes(ctx, { emerge: tTrade, walk: march, cling: 0, still: 0, watch: 0, flesh: null, look: sx(0), layer: "inside" });
    GenMatter.draw(ctx);      // wave two: flesh, stone, insects, storms; the stone gathers into the mass the old ones climb out of

    const pain = 0.4 + uRoot * 0.2 + uSwarm * 1.15 * (1 - uWomb) + uWomb * 0.12;
    const approaching = clamp((G.cam - (ROOT_U - 0.95)) / 0.55, 0, 1);
    const fleshVis = approaching * (1 - uLand * 0.28);
    const geom = GenFlesh.fleshGeom(uWomb);
    const sealAmt = clamp(uWomb * 1.2, 0, 1) * (1 - since("gods"));
    if (fleshVis > 0.02) GenFlesh.drawSeal(ctx, geom, sealAmt * fleshVis);   // behind the body on purpose
    const flesh = GenFlesh.drawFlesh(ctx, fleshVis, pain, uWomb);
    const cryAmt = fleshVis * clamp(0.5 * uRoot + 1.0 * uSwarm * (1 - uWomb) + 0.15 * uWomb, 0, 1);
    GenFlesh.drawCry(ctx, flesh, cryAmt);
    GenFlesh.drawPatches(ctx, flesh, uSwarm * (1 - 0.85 * uWomb) * fleshVis, GenOld.ROSTER);
    const soulAmt = clamp((uRoot - 0.2) / 0.5, 0, 1) * mix(0.45, 1, uWomb) * (1 - uBirth * 0.55);
    GenFlesh.drawSouls(ctx, flesh, soulAmt, uWomb);

    const cling = clamp(uRoot * 0.25 + uSwarm * 0.9, 0, 1);
    const still = uWomb;
    const watch = clamp(uBirth * 0.4 + uFight, 0, 1);
    /* the old ones climb out of the mass one by one through the trade beat, and start
       down the span before it ends, so the procession never stops */
    GenTrade.drawStream(ctx);   // everything that travels with them
    GenOld.drawOldOnes(ctx, { emerge: tTrade, walk: march, cling, still, watch, flesh, look: flesh ? flesh.cx - flesh.rx : sx(0) });
    if (OLD_TITANS) drawRip(ctx, flesh, clamp(uBirth * 2.6, 0, 1) * (1 - clamp((uBirth - 0.42) / 0.45, 0, 1)) * (1 - uFight));

    const L = lightsAt(uBirth, uFight, uLand, flesh);
    if (OLD_TITANS && uBirth > 0.04 && G.beat < idxOf("gods")) {
      pushTrail(G.trailY, L.yx, L.yy);
      pushTrail(G.trailR, L.rx, L.ry);
      drawTrail(ctx, G.trailY, "245,138,52", L.yAmt);
      drawTrail(ctx, G.trailR, "90,12,18", L.rAmt, true);

      const m = Math.min(G.W, G.H);
      const uF = linear("fight");
      const rexLunge = bump(DASH, uF), obLash = bump(LASH, uF);
      const emerge = clamp(uBirth * 1.35, 0, 1);
      // Rex a head taller than Obrokxus: the stone titan, not an equal
      const hR = 0.30 * m * (0.4 + 0.6 * emerge), hO = 0.26 * m * (0.4 + 0.6 * emerge);
      const fR = L.rx >= L.yx ? 1 : -1, fO = -fR;
      const yFootR = L.yy + 0.45 * hR, yFootO = L.ry + 0.45 * hO;
      const obEye = { x: L.rx + fO * 0.10 * hO, y: yFootO - 0.50 * hO };
      const rexHead = { x: L.yx, y: yFootR - 0.86 * hR };
      const landLin = linear("gods");
      const cool = smooth(clamp((landLin - 0.2) / 0.6, 0, 1));
      let rexPose = "stand", rexTilt = 0;
      if (L.wrap > 0.02) rexPose = "grapple";
      else if (rexLunge > 0.05) rexPose = "lunge";
      if (L.die > 0.02) { rexPose = "fall"; rexTilt = (Math.PI / 2) * smooth(L.die); }
      const obPose = obLash > 0.05 && L.wrap < 0.02 ? "lunge" : "stand";

      const near = Math.hypot(L.yx - L.rx, L.yy - L.ry) < 0.30 * m;
      if (near && (rexLunge > 0.55 || obLash > 0.55) && G.clashCool <= 0) {
        G.flash = 0.7;
        G.shake = Math.max(G.shake, 0.95);
        G.clashCool = 0.26;
        G.zoomKick = Math.max(G.zoomKick, 0.035);
        G.rings.push({ x: (L.yx + L.rx) * 0.5, y: (L.yy + L.ry) * 0.5, r: 10, a: 1 });
        for (let i = 0; i < 10; i++) {
          G.sparks.push({ x: obEye.x, y: obEye.y, vx: (Math.random() - 0.5) * 520, vy: -Math.random() * 420 - 80, t: 0 });
        }
      }
      const beamU = (uFight > 0.66 && uFight < 0.78) ? 1 - Math.abs(uFight - 0.72) / 0.12 : 0;

      const F = window.GenFig;
      if (F) {
        F.drawTitan(ctx, L.rx, yFootO, hO, "obrokxus", { a: L.rAmt, face: fO, pose: obPose, reach: rexHead, look: rexHead, ph: 0.4, tilt: -0.3 * smooth(L.die) });
        F.drawTitan(ctx, L.yx, yFootR, hR, "rex", { a: L.yAmt, face: fR, pose: rexPose, reach: rexPose === "grapple" ? { x: L.rx, y: L.ry } : obEye, reachAmt: rexLunge, cool, tilt: rexTilt });
      }

      const shX = L.yx + fR * 0.26 * hR, shY = yFootR - 0.62 * hR;
      const hdx = obEye.x - shX, hdy = obEye.y - shY;
      const hdLen = Math.hypot(hdx, hdy) || 1;
      const handX = shX + (hdx / hdLen) * 0.46 * hR, handY = shY + (hdy / hdLen) * 0.46 * hR;
      drawBeam(ctx, handX, handY, obEye.x, obEye.y, beamU * Math.max(L.yAmt, L.rAmt));

      for (const s of G.sparks) {
        const a = 1 - s.t / 0.45;
        if (a <= 0) continue;
        ctx.fillStyle = `rgba(255,226,190,${a})`;
        ctx.fillRect(s.x - 1.5, s.y - 1.5, 3, 3);
      }

      drawName(ctx, L.rx, yFootO + 14, L.rAmt, "OBROKXUS", 0);
      drawName(ctx, L.yx, yFootR + 14, L.yAmt, "REX", 0);
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
    if (window.GenDepths) GenDepths.drawDepths(ctx, dive, diveY);
    drawRexHole(ctx);
    drawSaga(ctx);
    ctx.restore();

    drawInsidePlaceholder(ctx);
    if (G.beat === G.idxOf("soup") && window.GenSoup) GenSoup.draw(ctx, G.W, G.H, G.local, G.reduced);
    if (G.beat === G.idxOf("eye") && window.GenEye) GenEye.draw(ctx, G.W, G.H, G.local, G.reduced);
    if (G.beat === G.idxOf("roles") && window.GenRoles) GenRoles.draw(ctx, G.W, G.H, G.local, G.reduced);
    if (G.beat === G.idxOf("circle") && window.GenCircle) GenCircle.draw(ctx, G.W, G.H, G.local, G.reduced);
    if (G.beat === G.idxOf("chains") && window.GenChains) GenChains.draw(ctx, G.W, G.H, G.local, G.reduced);
    if (G.beat === G.idxOf("corrupt") && window.GenCorrupt) GenCorrupt.draw(ctx, G.W, G.H, G.local, G.reduced);
    if (G.beat === G.idxOf("rex") && window.GenRexIn) GenRexIn.draw(ctx, G.W, G.H, G.local, G.reduced);
    if (G.beat === G.idxOf("dot") && window.GenDot) GenDot.draw(ctx, G.W, G.H, G.local, G.reduced);

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

  function drawInsidePlaceholder(ctx) {
    const a = idxOf("enter"), b = idxOf("death");
    if (!(a < BEATS.length && G.beat >= a && G.beat <= b)) return;
    const cover = G.beat === a ? (linear("enter") >= 0.8 ? 1 : 0) : 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = cover;
    ctx.fillStyle = "#2a0a10";
    ctx.fillRect(0, 0, G.W, G.H);
    ctx.fillStyle = "#4a141c";
    ctx.beginPath();
    ctx.ellipse(G.W * 0.5, G.H * 0.5, G.W * 0.46, G.H * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6b2029";
    ctx.beginPath();
    ctx.ellipse(G.W * 0.5 - G.W * 0.04, G.H * 0.5, G.W * 0.30, G.H * 0.27, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
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
