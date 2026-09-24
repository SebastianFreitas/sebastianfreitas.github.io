/* js/bridge/bridge-panel.js — the log, the instrument scale controls, and the void/game-dev setting panel */
(function () {
  const B = window.Bridge;
  if (!B) return;
  const { host, ctx, CAM, VOID_MIN, VOID_MAX, GD_BOUNDS, LAND, XSTAGE, CLOSE_DUR, HOLD_DUR, OPEN_DUR, begin } = B;
  const { smooth } = Util;

  /* ---- the readout: a log that keeps writing, instruments under it ---- */
  const el = { log: document.getElementById("btlog") };
  B.log = BridgeLog.create(el.log);
  if (window.Instruments) {
    Instruments.mount(document.getElementById("binst"));
    Instruments.mountSys(document.getElementById("binst-sys"));
    const IK = Util.KEYS.INST_SCALE;
    const hero = document.getElementById("bridge-hero");

    /* the compact bank is one narrow column: give it a share of the height and
       a sliver of the width, and stop at 1. Half the panels means each
       survivor can afford to be read, so the shares are generous and the
       floor is above setScale's own clamp — a bank too small to read is
       worth less than a bank that crowds the log. */
    const fitScale = () => Math.max(0.55, Math.min(1,
      (innerHeight * 0.62) / Instruments.TOTAL_H,
      (innerWidth  * 0.26) / Instruments.TOTAL_W));

    /* setScale's own clamp went down to 0.45 so a compact phone bank could
       fit. The +/- buttons are desktop-only and used to bottom out at 0.7,
       so anything stored below that is the new clamp leaking, not a choice
       anyone made. The desktop keeps its old floor. */
    const DESK_MIN = 0.7;

    let stored = parseFloat(Util.read(localStorage, IK));

    /* a wide, tall desktop gets the banks a fifth bigger by default: the
       tiles are the show and there is room. Narrow or short screens keep 1. */
    const deskDefault = () => {
      if (innerHeight < 800) return 1;
      return 1 + 0.2 * Math.max(0, Math.min(1, (innerWidth - 1200) / 600));
    };
    const deskScale = () => {
      if (Number.isFinite(stored)) return Math.max(DESK_MIN, stored);
      return deskDefault();
    };

    /* the phone stylesheet floats the log clear of the banks off --inst-h,
       so both dimensions go out whenever the scale moves */
    const syncInstBox = () => {
      if (!hero) return;
      const s = Instruments.getScale();
      hero.style.setProperty("--inst-w", (Instruments.TOTAL_W * s) + "px");
      hero.style.setProperty("--inst-h", (Instruments.TOTAL_H * s) + "px");
    };

    const applyScale = () => {
      Instruments.setCompact(B.phone);
      Instruments.setScale(B.phone ? fitScale() : deskScale());
      syncInstBox();
    };
    applyScale();
    addEventListener("resize", applyScale);   // a rotate re-fits the banks
    window.__bridgeRefit = applyScale;

    const step = d => {
      const lo = B.phone ? 0.45 : DESK_MIN;
      stored = Instruments.setScale(Math.max(lo, Instruments.getScale() + d));
      syncInstBox();
      Util.write(localStorage, IK, String(stored));
    };
    const bindScale = (el, delta) => {
      if (!el) return;
      el.addEventListener("pointerdown", e => {
        e.preventDefault();
        e.stopPropagation();
        step(delta);
      });
    };
    bindScale(document.getElementById("binst-in"), 0.15);
    bindScale(document.getElementById("binst-out"), -0.15);
  }

  /* ---- setting panel: swap the map under the bridge -------
     Clicking the other setting doesn't just flip a class — the
     ship gets swallowed by a black hole (an iris closing on its
     own position), the map underneath changes while the screen
     is dark, and the iris opens back around the ship somewhere
     else entirely. ---- */
  const modesPanel = document.getElementById("bridge-modes");
  const modeBtns = modesPanel ? Array.from(modesPanel.querySelectorAll(".mode-btn")) : [];

  function syncModeButtons() {
    modeBtns.forEach(btn => btn.classList.toggle("active", btn.dataset.mode === B.sceneMode));
  }

  function applySceneMode(target, opts) {
    if (B.sceneMode === "void") B.savedVoidCamX = B.camX; else B.savedGDCamX = B.camX;
    B.sceneMode = target;
    if (target === "gamedev") {
      CAM.min = GD_BOUNDS.min; CAM.max = GD_BOUNDS.max;
      B.camX = B.savedGDCamX;
    } else {
      CAM.min = VOID_MIN; CAM.max = VOID_MAX;
      B.camX = B.savedVoidCamX;
    }
    B.vel = 0;
    if (B.ship) { B.ship.vel = 0; B.ship.vy = 0; Voidship.clearCourse(B.ship); }
    B.clearMark();
    B.lastRegion = "";
    B.rebuildTrack();
    B.syncLabels();
    syncModeButtons();
    if (!(opts && opts.quiet))
      B.log.push(target === "gamedev"
        ? "sector: game dev — four objects on approach"
        : "sector: the void — span resumes", "good");
    saveView();
  }
  B.applySceneMode = applySceneMode;

  function applyPendingMode() {
    if (!B.pendingMode || B.pendingMode === B.sceneMode) {
      B.pendingMode = null;
      return;
    }
    const mode = B.pendingMode;
    B.pendingMode = null;
    applySceneMode(mode, { quiet: B.pendingQuiet });
  }
  B.applyPendingMode = applyPendingMode;

  /* camera positions saved by this tab (Back / reload / same-tab return).
     Runs before applyPendingMode, while the void map is still loaded. */
  function applyPendingView() {
    const v = B.pendingView;
    B.pendingView = null;
    if (!v) return;
    const clampTo = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
    if (Number.isFinite(v.voidCamX)) B.camX = clampTo(v.voidCamX, VOID_MIN, VOID_MAX);
    if (Number.isFinite(v.gdCamX)) B.savedGDCamX = clampTo(v.gdCamX, GD_BOUNDS.min, GD_BOUNDS.max);
  }
  B.applyPendingView = applyPendingView;

  const VIEW_KEY = Util.KEYS.VIEW, SECTOR_KEY = Util.KEYS.SECTOR;
  function saveView() {
    if (!B.entered) return;
    const view = {
      mode: B.xswitch ? B.xswitch.to : B.sceneMode,
      voidCamX: B.sceneMode === "void" ? B.camX : B.savedVoidCamX,
      gdCamX: B.sceneMode === "gamedev" ? B.camX : B.savedGDCamX,
    };
    Util.write(sessionStorage, VIEW_KEY, JSON.stringify(view));
    Util.write(localStorage, SECTOR_KEY, view.mode);
  }
  B.saveView = saveView;
  addEventListener("pagehide", saveView);

  function beginModeSwitch(target) {
    if (B.xswitch || !target || target === B.sceneMode) return;
    begin();
    B.hintDone("beacon");
    B.clearMark();
    B.endBurn();
    B.stopSteering();
    if (B.ship) { Voidship.setThrusting(B.ship, false); Voidship.clearCourse(B.ship); B.ship.vel = 0; B.ship.vy = 0; }
    B.vel = 0;
    const p = B.ship ? Voidship.screenPos(B.ship, B.W) : { x: B.W * 0.5, y: B.H * 0.42 };
    B.xswitch = { stage: XSTAGE.CLOSE, t: 0, to: target, cx: p.x, cy: p.y };
    host.classList.add("warping");
    B.log.push("drive: emergency fold engaged", "loc");
  }
  B.beginModeSwitch = beginModeSwitch;

  modeBtns.forEach(btn => {
    btn.addEventListener("pointerdown", e => e.stopPropagation());
    btn.addEventListener("click", () => {
      if (btn.dataset.mode !== B.sceneMode && !B.xswitch && window.XP) {
        const r = btn.getBoundingClientRect();
        const world = btn.dataset.mode === "void";
        XP.award(world ? "path-world" : "path-projects", 1, world ? "Setting" : "Game Dev",
                 r.left + r.width / 2, r.top + r.height / 2);
      }
      if (window.Genesis && Genesis.pending && !Genesis.active && btn.dataset.mode === "void") {
        Genesis.play({ thenMode: "void", thenCamX: LAND.bridge });
        return;
      }
      beginModeSwitch(btn.dataset.mode);
    });
  });
  const genesisBtn = document.getElementById("mode-genesis");
  if (genesisBtn) {
    genesisBtn.addEventListener("pointerdown", e => e.stopPropagation());
    genesisBtn.addEventListener("click", () => {
      if (!window.Genesis || Genesis.active) return;
      Genesis.play({
        thenMode: B.sceneMode,
        thenCamX: B.sceneMode === "void" ? LAND.bridge : B.camX,
      });
    });
  }

  /* On a phone the setting bar is folded away behind a gear (see bridge.css).
     The buttons stay in the DOM at all times — modeBtns was queried once at
     load — so this only ever toggles a class. */
  const gearBtn = document.getElementById("modes-gear");
  if (gearBtn && modesPanel) {
    /* the gear is unlabelled furniture until someone uses it once — the tip
       beside it says so, and stops saying so for good after the first open */
    const TIPK = Util.KEYS.GEAR_SEEN;
    let tipSeen = Util.read(localStorage, TIPK) === "1";
    if (tipSeen) modesPanel.classList.add("tip-done");
    const retireTip = () => {
      if (tipSeen) return;
      tipSeen = true;
      modesPanel.classList.add("tip-done");
      Util.write(localStorage, TIPK, "1");
    };
    const setOpen = on => {
      modesPanel.classList.toggle("open", on);
      gearBtn.setAttribute("aria-expanded", on ? "true" : "false");
      if (on) retireTip();
    };
    gearBtn.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); });
    gearBtn.addEventListener("click", e => {
      e.stopPropagation();
      setOpen(!modesPanel.classList.contains("open"));
    });
    // picking anything inside closes it, and so does a tap anywhere else
    modesPanel.querySelectorAll(".modes-btn").forEach(b =>
      b.addEventListener("click", () => setOpen(false)));
    document.addEventListener("pointerdown", e => {
      if (!modesPanel.contains(e.target)) setOpen(false);
    });
    addEventListener("keydown", e => { if (e.key === "Escape") setOpen(false); });
  }

  document.addEventListener("site:genesis-start", () => {
    begin();
    host.classList.add("is-cinematic");
    B.endBurn();
    B.stopSteering();
    if (B.ship) {
      Voidship.setThrusting(B.ship, false);
      Voidship.clearCourse(B.ship);
      B.ship.vel = 0; B.ship.vy = 0;
      B.ship.alpha = 0;
    }
    B.vel = 0;
    B.clearMark();
  });

  document.addEventListener("site:genesis-done", e => {
    host.classList.remove("is-cinematic");
    const mode = (e.detail && e.detail.mode) || "void";
    const destCam = e.detail && e.detail.camX;
    if (mode !== B.sceneMode) applySceneMode(mode);
    if (destCam != null) B.camX = destCam;
    else if (mode === "void") B.camX = LAND.bridge;
    B.vel = 0;
    if (B.ship) {
      B.ship.vel = 0; B.ship.vy = 0;
      Voidship.clearCourse(B.ship);
      B.ship.alpha = 0;
    }
  });

  /* advances the switch sequence; returns true while it owns the frame
     (normal ship physics/input should stand down until it's done) */
  function stepSwitch(dt) {
    if (!B.xswitch) return false;
    B.xswitch.t += dt;
    if (B.ship) {
      B.ship.vel = 0; B.ship.vy = 0;
      B.ship.bob += dt;
      // keep the hole centred on wherever the ship actually sits on screen
      const p = Voidship.screenPos(B.ship, B.W);
      B.xswitch.cx = p.x; B.xswitch.cy = p.y;
    }
    if (B.xswitch.stage === XSTAGE.CLOSE && B.xswitch.t >= CLOSE_DUR) {
      applySceneMode(B.xswitch.to);
      B.xswitch.stage = XSTAGE.HOLD; B.xswitch.t = 0;
    } else if (B.xswitch.stage === XSTAGE.HOLD && B.xswitch.t >= HOLD_DUR) {
      B.xswitch.stage = XSTAGE.OPEN; B.xswitch.t = 0;
    } else if (B.xswitch.stage === XSTAGE.OPEN && B.xswitch.t >= OPEN_DUR) {
      host.classList.remove("warping");
      B.xswitch = null;
    }
    return true;
  }
  B.stepSwitch = stepSwitch;

  /* an iris around (cx,cy): everywhere outside radius r goes black.
     Closing (dir "in") reads as the dark swallowing the scene down
     to the ship; opening (dir "out") reads as the ship arriving and
     the new scene expanding out from it. */
  function drawIris(cx, cy, r, opts) {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#04050a";
    if (r > 0.5) {
      // one even-odd path: the full frame minus the disc, so the scene stays visible inside the iris
      ctx.beginPath();
      ctx.rect(0, 0, B.W, B.H);
      ctx.arc(cx, cy, r, 0, 6.283);
      ctx.fill("evenodd");
    } else {
      ctx.fillRect(0, 0, B.W, B.H);
    }
    const a = opts.glow || 0;
    if (r > 1 && a > 0.02) {
      ctx.strokeStyle = `rgba(245,208,107,${0.32 * a})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.stroke();
      ctx.strokeStyle = `rgba(176,104,90,${0.18 * a})`;
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, 6.283); ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(222,232,228,${0.16 * a})`;
      const inward = opts.dir === "in";
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * 6.283 + B.t * (opts.spin || 0);
        const r0 = inward ? r + 46 + (i % 3) * 18 : Math.max(4, r - 40 - (i % 3) * 16);
        const r1 = inward ? r + 12 : Math.max(2, r - 8);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0);
        ctx.lineTo(cx + Math.cos(ang + 0.35) * r1, cy + Math.sin(ang + 0.35) * r1);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawSwitchFX() {
    if (!B.xswitch) return;
    const { stage, t: xt, cx, cy } = B.xswitch;
    const rMax = Math.hypot(Math.max(cx, B.W - cx), Math.max(cy, B.H - cy)) + 40;
    if (stage === XSTAGE.CLOSE) {
      const u = smooth(Math.min(1, xt / CLOSE_DUR));
      drawIris(cx, cy, rMax * (1 - u), { glow: u, dir: "in", spin: 0.6 });
    } else if (stage === XSTAGE.HOLD) {
      drawIris(cx, cy, 0, { glow: 0 });
      const u = xt / HOLD_DUR;
      const flash = u < 0.5 ? smooth(u / 0.5) : smooth(1 - (u - 0.5) / 0.5);
      if (flash > 0.02) {
        ctx.fillStyle = `rgba(255,250,235,${flash * 0.3})`;
        ctx.fillRect(0, 0, B.W, B.H);
      }
    } else {
      const u = smooth(Math.min(1, xt / OPEN_DUR));
      drawIris(cx, cy, rMax * u, { glow: 1 - u, dir: "out", spin: -0.6 });
    }
  }
  B.drawSwitchFX = drawSwitchFX;
})();
