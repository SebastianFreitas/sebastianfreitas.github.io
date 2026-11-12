/* js/bridge/bridge-panel.js — the log, and the setting panel gear */
(function () {
  const B = window.Bridge;
  if (!B) return;
  const { host, ctx, CAM, VOID_MIN, VOID_MAX, LAND, begin } = B;
  const { smooth } = Util;

  /* ---- the readout: a log that keeps writing, instruments under it ---- */
  B.log = BridgeLog.create(null);
  HudC25.mount(document.getElementById("bhud"));
  /* the hero has no size while the gate holds it: fit whenever the box, the dpr or the bar moves */
  let hudKey = "";
  B.fitHud = () => {
    const tb = document.querySelector(".topbar");
    const bb = tb ? tb.offsetTop + tb.getBoundingClientRect().height : undefined; /* layout bottom: the bar-away slide is a transform and must not move the span line */
    const key = B.W + "x" + B.H + "@" + B.dpr + "/" + bb + "/" + HudC25.wing();
    if (key === hudKey || !B.W || !B.H) return;
    hudKey = key;
    HudC25.resize(B.W, B.H, B.dpr, bb);
  };

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

  /* The cutscene journal: "Full intro" always, then one row per scene whose
     seen flag is set (XP.has reads it without setting it). Rebuilt on open
     and when a cutscene ends; rows do nothing while one is running. */
  const SCENE_NAMES = { birth: "Birth", root: "Root", rex: "Rex", valkhar: "Valkhar", mainland: "Mainland" };
  const modesList = document.getElementById("modes-list");
  let closeJournal = () => {};
  function journalRow(label, play) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "modes-btn hud-click";
    b.textContent = label;
    b.addEventListener("pointerdown", e => e.stopPropagation());
    b.addEventListener("click", () => {
      if (!window.Genesis || Genesis.active) return;
      closeJournal();
      play();
    });
    modesList.appendChild(b);
  }
  function buildJournal() {
    if (!modesList) return;
    modesList.textContent = "";
    journalRow("Full intro", () => Genesis.play({ thenMode: "void", thenCamX: LAND.bridge }));
    const order = (window.Gen && Gen.SCENE_ORDER) || Object.keys(SCENE_NAMES);
    order.forEach(id => {
      if (window.Genesis && Genesis.segmentSeen(id))
        journalRow(SCENE_NAMES[id] || id, () => Genesis.playScene(id));
    });
  }
  buildJournal();
  document.addEventListener("site:genesis-done", buildJournal);

  const gearBtn = document.getElementById("modes-gear");
  /* The Data Archive under the folder: one notch per beacon, read ones lit
     down from the top (newest cream), the count, the three latest readings
     and a link to the journal. Redrawn on every claim. Profiles saved before
     XP.readOrder existed list their reads first, in map order. */
  const arch = document.getElementById("arch");
  function buildArchive() {
    if (!arch || !window.XP || !B.activeMarks) return;
    const marks = B.activeMarks();
    const done = marks.filter(m => XP.has("beacon-" + m.id));   // real marks only, so count === B.beaconCount().read
    const ord = XP.readOrder;
    const rank = m => ord.indexOf("beacon-" + m.id);
    done.sort((a, b) => rank(a) - rank(b));
    arch.textContent = "";
    const spine = document.createElement("div");
    spine.className = "arch-spine";
    marks.forEach((m, i) => {
      const n = document.createElement("i");
      if (i < done.length) n.className = i === done.length - 1 ? "on new" : "on";
      spine.appendChild(n);
    });
    const body = document.createElement("div");
    body.className = "arch-body";
    const label = document.createElement("span");
    label.className = "arch-label";
    label.textContent = "archive";
    const count = document.createElement("span");
    count.className = "arch-count";
    count.textContent = done.length;
    const tot = document.createElement("small");
    tot.textContent = " / " + marks.length + " readings";
    count.appendChild(tot);
    body.append(label, count);
    done.slice(-3).reverse().forEach((m, i) => {
      const r = document.createElement("span");
      r.className = "arch-row";
      r.style.opacity = [0.95, 0.7, 0.5][i];
      const km = Math.round(Math.abs(m.cam - B.camX) / (B.CAM.max - B.CAM.min) * 408);
      r.textContent = "> " + m.name.toLowerCase() + " · " + km + " km";
      body.appendChild(r);
    });
    const link = document.createElement("button");
    link.type = "button";
    link.className = "arch-link hud-click";
    link.textContent = "journal >";
    link.addEventListener("pointerdown", e => e.stopPropagation());
    link.addEventListener("click", e => { e.stopPropagation(); if (gearBtn) gearBtn.click(); });
    const order = (window.Gen && Gen.SCENE_ORDER) || Object.keys(SCENE_NAMES);
    const scenes = order.filter(id => window.Genesis && Genesis.segmentSeen(id)).length;
    const sub = document.createElement("span");
    sub.className = "arch-sub";
    sub.textContent = "intro · " + scenes + " scenes";
    body.append(link, sub);
    arch.append(spine, body);
  }
  document.addEventListener("xp:award", buildArchive);
  document.addEventListener("site:genesis-done", buildArchive);
  addEventListener("load", buildArchive);
  addEventListener("pageshow", buildArchive);
  addEventListener("storage", e => { if (!e.key || e.key === Util.KEYS.PROFILE) buildArchive(); });

  /* The journal is folded away behind a folder button on every width (see
     bridge.css); this only ever toggles a class. */
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
      if (on) { buildJournal(); retireTip(); }
    };
    closeJournal = () => setOpen(false);
    gearBtn.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); });
    gearBtn.addEventListener("click", e => {
      e.stopPropagation();
      setOpen(!modesPanel.classList.contains("open"));
    });
    // picking a row closes it (journalRow), and so does a tap anywhere else
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
