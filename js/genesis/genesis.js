/* ===========================================================
   GENESIS — how the span began.

   Autoplay cinematic. First Setting visit (or Intro Cutscene)
   plays the record from the point: the span comes out of the
   left of the frame, the old ones walk the deck, Primordisentia
   is found and warped then bound, two lights tear out and fight
   in the void. Obrokxus escapes into the void; Almur follows. Rex becomes Rex the Surface.
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

  const overlay = document.getElementById("genesis");
  const tagEl   = document.getElementById("genesis-tag");
  const lineEl  = document.getElementById("genesis-line");
  const copyEl  = overlay && overlay.querySelector(".genesis-copy");
  const ticksEl = document.getElementById("genesis-ticks");
  const trackEl = document.getElementById("genesis-track");
  const prevEl  = document.getElementById("genesis-prev");
  const nextEl  = document.getElementById("genesis-next");
  const skipEl  = document.getElementById("genesis-skip");
  const pauseEl = document.getElementById("genesis-pause");
  const host    = document.getElementById("bridge-hero");

  let copyTimer = 0;
  let copyInk = false;
  let hitG = null, hitW = 0, hitH = 0, hitCx = 0, hitCy = 0;
  /* the hit's flash: opaque near-white core round the point, falling to about half alpha at the corners; cached per size */
  function hitGrad(ctx, cx, cy) {
    const ix = cx | 0, iy = cy | 0;
    if (!hitG || hitW !== G.W || hitH !== G.H || hitCx !== ix || hitCy !== iy) {
      hitW = G.W; hitH = G.H; hitCx = ix; hitCy = iy;
      const far = Math.hypot(Math.max(cx, G.W - cx), Math.max(cy, G.H - cy)) + 160;
      const core = Math.min(0.9, 0.25 * Math.hypot(G.W, G.H) / far);
      hitG = ctx.createRadialGradient(cx, cy, 0, cx, cy, far);
      hitG.addColorStop(0, "rgba(255,250,232,1)");
      hitG.addColorStop(core, "rgba(255,238,196,1)");
      hitG.addColorStop(1, "rgba(226,184,128,1)");
    }
    return hitG;
  }
  let broke = false;
  let warming = false;   // warm() draws on a throwaway canvas: no caption, no bar
  function paintCopy(immediate) {
    const b = BEATS[G.beat];
    if (warming || !b || !copyEl) return;
    if (overlay) overlay.dataset.beat = b.id || "";
    clearTimeout(copyTimer);
    if (!b.line) {
      copyEl.classList.remove("on");
      copyEl.classList.add("out");
      if (tagEl) tagEl.textContent = "";
      return;
    }
    if (!immediate && copyEl.classList.contains("on") && tagEl && lineEl
      && tagEl.textContent === b.tag && lineEl.textContent === b.line) return;   // same words: no swap
    const show = () => {
      copyEl.classList.remove("on", "out");
      copyEl.style.alignSelf = b.id === "trade" ? "flex-start" : "";   // trade: off the gentleman, who climbs out right of centre
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
    if (warming || !trackEl) return;
    let bar = trackEl.querySelector(".genesis-prog");
    if (!bar) {
      trackEl.innerHTML = '<span class="genesis-prog"><i></i></span>';
      bar = trackEl.querySelector(".genesis-prog");
    }
    const fill = bar && bar.querySelector("i");
    const n = Math.max(1, BEATS.length - 1);
    const dur = Math.max(0.001, (BEATS[G.beat] && BEATS[G.beat].dur) || 1);
    let u = clamp((G.beat + clamp(G.local / dur, 0, 1)) / n, 0, 1);
    const sp = segSpan();
    if (sp) u = clamp((G.BEAT_START[G.beat] + G.local - sp.t0) / (sp.t1 - sp.t0), 0, 1);
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

  let seg = null;   // id of the segment being played, else null

  /* the playing segment's span: first beat a, last beat b, global seconds t0..t1 */
  function segSpan() {
    if (!seg || !G.SCENES[seg]) return null;
    return G.sceneSpan(seg);
  }

  function remember() {
    if (window.XP && XP.flag) XP.flag(seg ? "genesis-seg-" + seg : "genesis");
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

  /* black veil over the page: segments fade in and out through it (full plays cut) */
  let veilTimer = 0, veil = null, segBusy = false, ending = false, seaming = false, hop = 0;
  function veilTo(o, ms, then) {
    if (!veil) {
      veil = document.createElement("div");
      veil.className = "genesis-veil";
      veil.setAttribute("aria-hidden", "true");
      veil.hidden = true;
      document.body.appendChild(veil);
    }
    if (veil.hidden) {
      veil.style.transition = "none";
      veil.style.opacity = "0";
      veil.hidden = false;
    }
    void veil.offsetWidth;
    veil.style.transition = "opacity " + ms + "ms ease-in-out";
    veil.style.opacity = String(o);
    clearTimeout(veilTimer);
    veilTimer = setTimeout(() => { if (o === 0) veil.hidden = true; if (then) then(); }, ms);
  }

  /* full play: cross into the next scene through the veil (cut when reduced) */
  function seam(next) {
    if (reduced) { seek(next, 0); return; }
    seaming = true;
    const mine = hop;   // a skip or seek during the fade-in bumps hop and wins
    veilTo(1, 350, () => {
      if (G.active && hop === mine) seek(next, 0);
      veilTo(0, 450, () => { seaming = false; });
    });
  }

  function finish() {
    if (!G.active || ending) return;
    if (seg && !reduced) {
      ending = true;
      veilTo(1, 800, () => { ending = false; finishNow(); veilTo(0, 1000); });
      return;
    }
    finishNow();
  }

  function finishNow() {
    if (!G.active) return;
    G.active = false;
    setPause(false);
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
    const doneSeg = seg;
    seg = null;
    document.dispatchEvent(new CustomEvent("site:genesis-done", {
      detail: { mode: G.thenMode, camX: G.thenCamX, segment: doneSeg, url: segUrl },
    }));
  }

  function play(opts) {
    if (G.active) return;
    if (reduced && !FORCE) return;
    G.thenMode = (opts && opts.thenMode) || "void";
    G.thenCamX = opts && opts.thenCamX;
    if (G.thenCamX == null && window.World && G.thenMode === "void")
      G.thenCamX = (window.XP && XP.known) ? World.LAND.bridge : Marks.camUnder("bnote-void");   // first visit: land under the Void beacon
    G.active = true;
    remember();     // counted from the start: leaving mid-way doesn't replay it
    addEventListener("wheel", holdPage, { passive: false });
    addEventListener("touchmove", holdPage, { passive: false });
    G.beat = 0;
    G.local = 0;
    G.shake = 0;
    G.t = 0;
    setPause(false);
    tShift = 0;
    lastEnvT = 0;
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

  /* true when the segment started or is fading in */
  let segUrl = false;   // the running segment came from ?gscene, not a beacon click
  function playScene(id, fromUrl) {
    const s = G.SCENES[id];
    if (G.active || segBusy || !s) return false;
    segUrl = !!fromUrl;
    if (reduced && !FORCE) return false;
    if (reduced) return startScene(id, s);
    segBusy = true;
    veilTo(1, 700, () => {
      segBusy = false;
      // a failed start still signals done, so the waiting note opens
      if (!startScene(id, s))
        document.dispatchEvent(new CustomEvent("site:genesis-done", { detail: { segment: id, url: segUrl } }));
      veilTo(0, 900);
    });
    return true;
  }

  function startScene(id, s) {
    if (G.active) return false;
    seg = id;
    play({ thenMode: "void" });
    if (!G.active) { seg = null; return false; }
    const j = JUMP && G.SCENE === id ? idxOf(JUMP[1]) : -1;
    const i = j >= 0 ? j : idxOf(s.from);
    if (i > 0) seek(i, 0);
    return true;
  }

  /* build the lazy canvases and caches ahead of the first cutscene: paint the first segment's
     opening frames on a throwaway canvas, then put the state back; nothing shows. Safe twice. */
  let warmed = false;
  function warm() {
    if (warmed || G.active || reduced) return;
    warmed = true;
    const keep = { active: G.active, beat: G.beat, local: G.local, W: G.W, H: G.H, cam: G.cam, camTarget: G.camTarget, zoom: G.zoom, paused: G.paused };
    const cv = document.createElement("canvas");
    cv.width = Math.max(2, innerWidth);
    cv.height = Math.max(2, innerHeight);
    const ctx = cv.getContext("2d");
    const nSparks = G.sparks ? G.sparks.length : 0, nRings = G.rings ? G.rings.length : 0;
    warming = true;
    try {
      G.active = true;
      G.cam = 0; G.camTarget = 0; G.zoom = 1;
      G.W = cv.width; G.H = cv.height;
      for (const b of ["point", "drawn", "break", "walk"]) {
        go(idxOf(b));
        draw(ctx, { W: G.W, H: G.H });
      }
    } catch (e) {
    } finally {
      G.active = keep.active;
      G.beat = keep.beat; G.local = keep.local; G.W = keep.W; G.H = keep.H;
      G.cam = keep.cam; G.camTarget = keep.camTarget; G.zoom = keep.zoom; G.paused = keep.paused;
      if (G.sparks) G.sparks.length = Math.min(G.sparks.length, nSparks);
      if (G.rings) G.rings.length = Math.min(G.rings.length, nRings);
      if (window.GenArmies) GenArmies.reset();
      broke = false;
      resetFX();
      warming = false;
    }
  }

  function segmentSeen(id) {
    return !!(window.XP && XP.has("genesis-seg-" + id));
  }

  let tShift = 0, lastEnvT = 0;
  function setPause(on) {
    G.paused = !!on;
    if (pauseEl) {
      pauseEl.textContent = G.paused ? "Play" : "Pause";
      pauseEl.setAttribute("aria-pressed", G.paused ? "true" : "false");
    }
  }

  function skip() {
    if (!G.active) return;
    hop++;
    if (seg) { finish(); return; }
    const last = idxOf("now");
    if (G.beat >= last && G.local > 0.12) { finish(); return; }
    go(last);
  }

  function seek(i, frac) {
    if (!G.active) return;
    hop++;
    const sp = segSpan();
    i = clamp(i, sp ? sp.a : 0, sp ? sp.b : BEATS.length - 1);
    broke = i > idxOf("break");
    frac = clamp(frac, 0, 1);
    if (i === BEATS.length - 1) frac = 0;
    if (i !== G.beat) go(i);
    paintCopy(true);
    const dur = BEATS[i].dur;
    G.local = frac >= 1 ? dur - 0.001 : frac * dur;
    if (sp && i === sp.b) G.local = Math.min(G.local, Math.max(0, sp.t1 - G.BEAT_START[i] - 0.05));
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
    const sp = segSpan();
    if (dir > 0) {
      if (G.beat >= BEATS.length - 1) { finish(); return; }
      if (sp && (G.beat >= sp.b || G.BEAT_START[G.beat + 1] >= sp.t1)) { skip(); return; }
      seek(G.beat + 1, 0);
    } else {
      seek(G.local > 1.5 ? G.beat : G.beat - 1, 0);
    }
  }

  function seekFromPointer(e) {
    if (!trackEl) return;
    const r = trackEl.getBoundingClientRect();
    const u = clamp((e.clientX - r.left) / Math.max(1, r.width), 0, 1);
    const sp = segSpan();
    if (sp) {
      const t = sp.t0 + u * (sp.t1 - sp.t0 - 0.05);
      let i = sp.a;
      while (i < sp.b && G.BEAT_START[i + 1] <= t) i++;
      seek(i, (t - G.BEAT_START[i]) / Math.max(0.001, BEATS[i].dur));
      return;
    }
    const pos = u * (BEATS.length - 1);
    const i = Math.floor(pos);
    seek(i, pos - i);
  }

  /* slow push-in / pull-out per beat: [from, to] applied over the beat */
  const ZOOM = {
    point: [1.00, 1.08], drawn: [1.08, 1.00], break: [1.00, 1.05],
    elements: [1.05, 0.97], matter: [0.97, 1.00], trade: [1.00, 1.30], walk: [1.30, 1.02],
    root: [1.02, 1.06], enter: [1.06, 1.09],
    soup: [1.09, 1.09], eye: [1.09, 1.09], roles: [1.09, 1.09], circle: [1.09, 1.09], chains: [1.09, 1.09], corrupt: [1.09, 1.09], rex: [1.09, 1.09], dot: [1.09, 1.09], clash: [1.09, 1.09], death: [1.09, 1.09],
    land: [1.00, 1.05], gods: [1.00, 1.05], calm: [1.05, 0.95], deep: [0.95, 1.00],
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
      /* ride Almur west, a little ahead of him, and lead by exactly
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
      target = mix(ROOT_U - 0.50, chaseAt(0).cam + chaseCamLead(0),
        G.beat === G.idxOf("gods") ? since("gods") : since("land"));
    else {
      /* walk: the camera drifts a little to the right for the first ~3.5 s, well slower than
         every walker, then holds; after the walk beat it is back on the root value */
      target = G.beat > G.idxOf("walk") ? ROOT_U - 0.50
        : 0.10 * smooth(clamp(G.local / 3.5, 0, 1));
    }
    let camRate = 1.55;
    if (uWalk > 0.001 && uRoot < 0.02) camRate = 2.25;
    if (uFlee > 0 && uWar < 0.02) camRate = FLEE_CAM_RATE;
    if (camRateOverride != null) camRate = camRateOverride;
    const cur = BEATS[G.beat];
    const zk = (cur && ZOOM[cur.id]) || [1, 1];
    const zoom = G.reduced ? 1
      : G.beat === G.idxOf("enter") ? ENTER_ZOOM[enterStep()]
      : Math.max(1, mix(zk[0], zk[1], smooth(G.local / Math.max(0.001, cur ? cur.dur : 1))));   // never below 1: a pulled-back frame shows dark strips beside the sea and bridge
    return { target, rate: camRate, zoom };
  }

  function step(dt) {
    if (!G.active) return false;
    if (ending || seaming) return true;   // frozen under the fade-out / the seam veil
    if (G.paused) return true;            // clock held; the loop still draws the frame
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

    if (seg && G.BEAT_START[G.beat] + G.local >= segSpan().t1) { finish(); return false; }
    const b = BEATS[G.beat];
    if (b && G.local >= b.dur) {
      if (G.beat >= BEATS.length - 1) { finish(); return false; }
      if (!seg && G.sceneOf(G.beat + 1) !== G.sceneOf(G.beat)) seam(G.beat + 1);
      else go(G.beat + 1);
    }
    return true;
  }

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
    if (env.t != null) {
      if (G.paused) tShift += env.t - lastEnvT;   // the frame loop's clock runs on; ours holds
      lastEnvT = env.t;
      G.t = env.t - tShift;
    }

    /* seconds into the break (-1 elsewhere): the hit is at 0.5 s, the shake runs 0.5 to 1.0 s */
    const tb = G.beat === idxOf("break") ? G.secs("break") : -1;
    let hitShake = 0;
    if (tb >= 0.5 && tb < 1.0) { const k = 1 - (tb - 0.5) / 0.5; hitShake = 5.2 * k * k; }
    const shk = G.reduced ? 0 : G.shake + hitShake;
    const sxh = G.shakeRX * shk * 12;
    const syh = G.shakeRY * shk * 9;
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
    const pastBirth = G.beat >= G.idxOf("land") ? 1 : 0;
    const uBirth = pastBirth;
    const uFight = pastBirth;
    const uLand  = since("land");
    const uFlee  = since("flee");
    const uNow   = only("now");

    /* from enter on the placeholder below paints opaque over the whole outside scene;
       skip it while the cover is full (the fade-in at the start of enter still paints it) */
    const covered = G.beat > G.idxOf("enter") && G.beat <= G.idxOf("death")
      || (G.beat === G.idxOf("enter") && linear("enter") >= 0.8);
    let L = null;
    if (!covered) {
      fillBg(ctx);
      if (window.GenTier3) GenTier3.draw(ctx, G.W, G.H, z, sxh, syh);
      const bl = G.BEATS[G.beat].id === "break" && window.GenTier3 ? GenTier3.offset("brim") : null;
      const lurched = !!(bl && bl.dx !== 0);
      // the far-realm blobs read as one flat ellipse behind the walkers: dim them through walk and root, back to full once the womb beat begins
      const farDim = 1 - 0.75 * uWalk * (1 - since("enter"));
      const amt = clamp((uBreak * 0.4 + uWalk * 0.55) * (1 - uLand * 0.7) * farDim, 0, 1);
      if (G.sceneOf(G.beat) !== "birth") drawChaos(ctx, lurched && G.local < 2.5 ? Math.min(1, amt + 0.14) : amt);
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

      /* implode 0-0.4 s, a short dark beat to 0.5 s, then the point is gone (the hit) */
      const iPoint = idxOf("point"), iDrawn = idxOf("drawn");
      const dPt = G.BEATS[iPoint].dur, dDr = G.BEATS[iDrawn].dur;
      const tension = G.beat < iPoint ? 0
        : G.beat === iPoint ? clamp(linear("point") * dPt / (dPt + dDr), 0, 1)
        : G.beat === iDrawn ? clamp((dPt + linear("drawn") * dDr) / (dPt + dDr), 0, 1)
        : 1;
      const implode = tb >= 0 ? clamp(tb / 0.4, 0, 1) : 0;
      const pointVis = tb >= 0.5 || G.beat > idxOf("break") ? 0
        : (G.beat > iPoint ? 1 : mix(0.75, 1, linear("point")));
      drawPoint(ctx, pointVis, 0, tension, implode);

      /* the instant the point breaks: a kick; the flash, ring and shake are drawn from tb */
      const breakLin = linear("break");
      if (breakLin > 0.20 && !broke) {
        broke = true;
        G.zoomKick = Math.max(G.zoomKick, 0.05);
        G.rings.push({ x: sx(0), y: 0.46 * G.H, r: 6, a: 1 });
      }
      GenVoid.drawSpan(ctx, uDrawn);
      GenVoid.drawSpanLife(ctx, uDrawn);
      GenElem.draw(ctx);        // wave one: dust, air, wind, sound, colour, light (under the old ones, so the figures hide it)
      GenElem.drawAirDrift(ctx);   // the glass and the three stars: background, under every old one
      if (window.GenCeiling) GenCeiling.draw(ctx, G.W, G.H, GenElem.seaRise(G.W, G.H), G.reduced ? 0 : G.t);   // the ceiling mass, grown on the sea's clock
      GenOld.drawShards(ctx, clamp((breakLin - 0.22) / 0.70, 0, 1), lurched ? 0.15 : 0);
      const tTrade = G.secs("trade");
      const march = mix(0.05 * smooth(clamp((tTrade - 8.4) / 1.6, 0, 1)), 1, G.linear("walk"));   // step off early, then a steady linear pace
      // the old ones still climbing out of the mass sit behind its stones
      GenOld.drawOldOnes(ctx, { emerge: tTrade, walk: march, cling: 0, still: 0, watch: 0, flesh: null, look: sx(0), layer: "inside" });
      GenMatter.draw(ctx);      // wave two: flesh, stone, insects, storms; the stone gathers into the mass the old ones climb out of

      const pain = 0.4 + uRoot * 0.2 + uSwarm * 1.15 * (1 - uWomb) + uWomb * 0.12;
      const approaching = clamp((G.cam - (ROOT_U - 0.95)) / 0.55, 0, 1);
      const fleshVis = approaching * (1 - uLand * 0.28);
      const geom = GenFlesh.fleshGeom(uWomb);
      const sealAmt = clamp(uWomb * 1.2, 0, 1) * (G.beat < idxOf("land") ? 1 : 0);
      if (fleshVis > 0.02) GenFlesh.drawSeal(ctx, geom, sealAmt * fleshVis);   // behind the body on purpose
      const calmOn = (G.beat > G.idxOf("calm") || (G.beat === G.idxOf("calm") && (G.local >= 0.5 || G.reduced))) ? 1 : 0;
      const flesh = GenFlesh.drawFlesh(ctx, fleshVis, pain, uWomb, calmOn);
      const cryAmt = fleshVis * clamp(0.5 * uRoot + 1.0 * uSwarm * (1 - uWomb) + 0.15 * uWomb, 0, 1) * (1 - calmOn);
      GenFlesh.drawCry(ctx, flesh, cryAmt);
      GenFlesh.drawPatches(ctx, flesh, uSwarm * (1 - 0.85 * uWomb) * fleshVis * (1 - calmOn), GenOld.ROSTER);
      const soulAmt = clamp((uRoot - 0.2) / 0.5, 0, 1) * mix(0.45, 1, uWomb) * (1 - uBirth * 0.55);
      GenFlesh.drawSouls(ctx, flesh, soulAmt, uWomb);

      const cling = clamp(uRoot * 0.25 + uSwarm * 0.9, 0, 1);
      const still = uWomb;
      const watch = clamp(uBirth * 0.4 + uFight, 0, 1);
      /* the old ones climb out of the mass one by one through the trade beat, and start
         down the span before it ends, so the procession never stops */
      GenTrade.drawStream(ctx);   // everything that travels with them
      GenOld.drawOldOnes(ctx, { emerge: tTrade, walk: march, cling, still, watch, flesh, look: flesh ? flesh.cx - flesh.rx : sx(0) });

      L = lightsAt(uBirth, uFight, uLand, flesh);

      if (uFight > 0.08 && uLand < 0.2) G.shake = Math.max(G.shake, 0.22 + uFight * 0.2);
      if (uFight > 0.82 && uLand < 0.2) G.shake = Math.max(G.shake, 0.55 + (1 - L.yAmt) * 0.45);
      if (uBirth > 0.35 && uBirth < 0.95) G.shake = Math.max(G.shake, 0.32);

      const landRise = smooth(clamp(uLand / 0.9, 0, 1));
      /* inside Rex the depths paint opaque rock over everything below
         1.69 screen heights, so the land fill can stop just under that */
      const depthsOn = (G.beat === iDeep || G.beat === iSlip) && dive >= 0.001;
      drawRexLand(ctx, landRise, L.originX, L.originY, depthsOn ? G.H * 1.72 : null);
      GenElem.drawSea(ctx);   // the sea bed, over the matter, flesh and land, under the gods
      if (window.GenOld && tb < 0) {   // (in the break they are drawn over the flash, below) what the four break fragments left, for good: over the later layers, under the gods
        ctx.save();
        ctx.translate(0, diveY);   // they stay on the screen through the dive
        unzoom(ctx, z);
        GenOld.drawTraces(ctx);
        ctx.restore();
      }
      drawGodsBirth(ctx, flesh);
      if (window.GenDepths) GenDepths.drawDepths(ctx, dive, diveY);
      drawRexHole(ctx);
      drawSaga(ctx);
      ctx.restore();
    }
    if (uSwarm > 0.1 && uWomb < 0.2) G.shake = Math.max(G.shake, 0.18);

    drawInsidePlaceholder(ctx);
    if (G.beat === G.idxOf("soup") && window.GenSoup) GenSoup.draw(ctx, G.W, G.H, G.local, G.reduced);
    if (G.beat === G.idxOf("eye") && window.GenEye) GenEye.draw(ctx, G.W, G.H, G.local, G.reduced);
    if (G.beat === G.idxOf("roles") && window.GenRoles) GenRoles.draw(ctx, G.W, G.H, G.local, G.reduced);
    if (G.beat === G.idxOf("circle") && window.GenCircle) GenCircle.draw(ctx, G.W, G.H, G.local, G.reduced);
    if (G.beat === G.idxOf("chains") && window.GenChains) GenChains.draw(ctx, G.W, G.H, G.local, G.reduced);
    if (G.beat === G.idxOf("corrupt") && window.GenCorrupt) GenCorrupt.draw(ctx, G.W, G.H, G.local, G.reduced);
    if (G.beat === G.idxOf("dot") && window.GenDot) GenDot.draw(ctx, G.W, G.H, G.local, G.reduced);
    if (G.beat === G.idxOf("clash") && window.GenClash) GenClash.draw(ctx, G.W, G.H, G.local, G.reduced);
    if (G.beat === G.idxOf("death") && window.GenDeath) GenDeath.draw(ctx, G.W, G.H, G.local, G.reduced);
    if (G.beat === G.idxOf("land") && window.GenGodsBeat) GenGodsBeat.draw(ctx, G.W, G.H, G.local, G.reduced);
    if (G.beat === G.idxOf("land") && G.local < 1.2 && window.GenOld) { ctx.save(); unzoom(ctx, z); GenOld.drawTraces(ctx); ctx.restore(); }   // the death frame covers the world for 1.2 s; the traces stay over it

    if (L && L.die > 0.02 && L.die < 0.55) {
      const p = 1 - Math.abs(L.die - 0.22) / 0.22;
      if (p > 0) {
        ctx.fillStyle = `rgba(40,4,8,${0.22 * p})`;
        ctx.fillRect(-20, -20, G.W + 40, G.H + 40);
      }
    }
    const underBang = tb >= 0.5 && tb < 0.95;   // the traces sit under the bang's peak: the flash paints over their tint and rim
    if (underBang && window.GenOld) { ctx.save(); unzoom(ctx, z); GenOld.drawTraces(ctx); ctx.restore(); }
    if (G.flash > 0.02) {
      ctx.fillStyle = `rgba(200,200,205,${0.18 * G.flash})`;
      ctx.fillRect(-20, -20, G.W + 40, G.H + 40);
    }
    if (tb >= 0.5 && tb < 1.6) {
      /* the bang: a warm full-frame flash at full strength for 0.1 s (the peak, tb 0.5), then held step-downs */
      const fa = tb < 0.8 ? 1 : tb < 0.95 ? 0.7 : tb < 1.1 ? 0.34 : tb < 1.4 ? 0.18 : 0.08;
      ctx.globalAlpha = fa;
      ctx.fillStyle = hitGrad(ctx, sx(0), 0.46 * G.H);
      ctx.fillRect(-160, -160, G.W + 320, G.H + 320);
      const rx = sx(0), ry = 0.46 * G.H;
      const m = Math.min(G.W, G.H);
      /* the shock ring: a sharp flat stroke in three held sizes, past the corners by 1.7 s; over the wash, under the core */
      if (tb < 1.0) {
        const rp = G.reduced ? 0.5 : tb < 0.62 ? 0.12 : tb < 0.75 ? 0.38 : tb < 0.88 ? 0.7 : 1;
        const far = Math.hypot(Math.max(rx, G.W - rx), Math.max(ry, G.H - ry));
        const lw = m * (rp < 0.2 ? 0.05 : rp < 0.5 ? 0.04 : rp < 0.8 ? 0.028 : 0.016);
        ctx.globalAlpha = 1;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.shadowColor = "rgba(255,200,90,0.9)";
        ctx.shadowBlur = lw * 0.9;
        ctx.strokeStyle = tb < 0.9 ? "#fffbea" : "#fff2c8";
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.arc(rx, ry, Math.max(1, (far + lw) * rp), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      /* the white-hot core in the point's warm light: three held sizes */
      if (tb < 0.9) {
        const cr = m * (tb < 0.75 ? 0.13 : 0.09);
        ctx.globalAlpha = 1;
        const cg = ctx.createRadialGradient(rx, ry, 0, rx, ry, cr * 1.5);
        cg.addColorStop(0, "#ffffff"); cg.addColorStop(0.66, "#ffffff");   // the pure-white disc
        cg.addColorStop(0.75, "#fff3a0"); cg.addColorStop(1, "rgba(255,226,120,0)");   // the hot yellow-white falloff
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(rx, ry, cr * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    if (tb >= 0 && !underBang && window.GenOld) { ctx.save(); unzoom(ctx, z); GenOld.drawTraces(ctx); ctx.restore(); }   // over the flash, so they read from their first step

    ctx.restore();

    /* the cut is screen-fixed: drawn outside the camera transform */
    if (tb >= 0.9 && tb < 1.2) {   // not before 0.9: nothing dark may sit on the white core's peak
      const fa = tb < 0.8 ? 0.78 : tb < 0.95 ? 0.5 : tb < 1.08 ? 0.28 : 0.11;
      if (window.GenTier3 && GenTier3.drawCut) {
        GenTier3.drawCut(ctx, G.W, G.H, fa / 0.78, tb + 0.7);   // the cut's own clock still starts at 1.2
      }
    }
    /* the caption is DOM text: dark ink while the flash is up (tag and line set their own colour) */
    {
      /* dark while the flash is light (to 0.8), light once it has dropped to 0.34 or less */
      const inkOn = tb >= 0.5 && tb < 0.8;
      if (inkOn !== copyInk) {
        copyInk = inkOn;
        /* the overlay's dark centre vignette (bridge.css) would grey the flash heart */
        if (overlay) overlay.style.background = inkOn ? "none" : "";
        if (tagEl) { tagEl.style.color = inkOn ? "#1a1626" : ""; tagEl.style.textShadow = inkOn ? "none" : ""; }
        if (lineEl) { lineEl.style.color = inkOn ? "#1a1626" : ""; lineEl.style.textShadow = inkOn ? "none" : ""; }
      }
    }

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

  /* undo the camera zoom: the edge-sunk traces are screen-space, so they stay inside the frame */
  function unzoom(ctx, z) {
    if (z === 1) return;
    ctx.translate(G.W * 0.5, G.H * 0.5);
    ctx.scale(1 / z, 1 / z);
    ctx.translate(-G.W * 0.5, -G.H * 0.5);
  }

  function drawInsidePlaceholder(ctx) {
    const a = idxOf("enter"), b = idxOf("death");
    if (!(a < BEATS.length && G.beat >= a && G.beat <= b)) return;
    const cover = G.beat === a ? (linear("enter") >= 0.8 ? 1 : 0) : 1;
    ctx.save();
    const pr = ctx.canvas.width / G.W;
    ctx.setTransform(pr, 0, 0, pr, 0, 0);
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
      if (e.target === skipEl || e.target === pauseEl) return;
      e.stopPropagation();
    });
    overlay.addEventListener("pointerdown", e => {
      if (e.target === skipEl || e.target === pauseEl) return;
      e.stopPropagation();
    });
  }
  if (skipEl) {
    skipEl.addEventListener("click", e => {
      e.stopPropagation();
      skip();
    });
  }
  if (pauseEl) {
    pauseEl.addEventListener("click", e => {
      e.stopPropagation();
      setPause(!G.paused);
      pauseEl.blur();   // keep focus off it so Space never presses it a second time
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
    else if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      if (!e.repeat) setPause(!G.paused);
    }
  }, true);
  addEventListener("keyup", e => {
    if (G.active && (e.key === " " || e.code === "Space")) e.preventDefault();   // no click on a focused button
  }, true);

  document.addEventListener("site:enter", e => {
    const d = e.detail || {};
    if (G.active) return;
    const segId = G.SCENE;
    if (segId) {
      setTimeout(() => { if (!G.active) playScene(segId, true); }, 80);
      return;
    }
    if (FORCE) {
      setTimeout(() => { if (!G.active) play({ thenMode: "void" }); }, 80);
      return;
    }
  });

  return {
    get active() { return G.active; },
    get pending() { return pending(); },
    get seaming() { return seaming; },
    play, playScene, playSegment: playScene, warm, segmentSeen, skip, seek, step, draw,
  };
})();
