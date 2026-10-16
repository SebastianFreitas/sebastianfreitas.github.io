/* js/bridge/bridge-panel.js — the log, the instrument scale controls, and the setting panel gear */
(function () {
  const B = window.Bridge;
  if (!B) return;
  const { host, ctx, CAM, VOID_MIN, VOID_MAX, LAND, begin } = B;
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

  /* gamedev sector archived: the bridge has one setting (the void). */
  const modesPanel = document.getElementById("bridge-modes");

  /* camera positions saved by this tab (Back / reload / same-tab return).
     Runs when the bridge opens. */
  function applyPendingView() {
    const v = B.pendingView;
    B.pendingView = null;
    if (!v) return;
    const clampTo = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
    if (Number.isFinite(v.voidCamX)) B.camX = clampTo(v.voidCamX, VOID_MIN, VOID_MAX);
  }
  B.applyPendingView = applyPendingView;

  const VIEW_KEY = Util.KEYS.VIEW;
  function saveView() {
    if (!B.entered) return;
    Util.write(sessionStorage, VIEW_KEY, JSON.stringify({ mode: "void", voidCamX: B.camX }));
  }
  B.saveView = saveView;
  addEventListener("pagehide", saveView);

  const genesisBtn = document.getElementById("mode-genesis");
  if (genesisBtn) {
    genesisBtn.addEventListener("pointerdown", e => e.stopPropagation());
    genesisBtn.addEventListener("click", () => {
      if (!window.Genesis || Genesis.active) return;
      Genesis.play({
        thenMode: "void",
        thenCamX: LAND.bridge,
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
    if (destCam != null) B.camX = destCam;
    else if (mode === "void") B.camX = LAND.bridge;
    B.vel = 0;
    if (B.ship) {
      B.ship.vel = 0; B.ship.vy = 0;
      Voidship.clearCourse(B.ship);
      B.ship.alpha = 0;
    }
  });

})();
