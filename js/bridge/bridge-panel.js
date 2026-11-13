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
     down from the top (newest cream), the count, the nearest unread signal
     with a live distance, the three latest readings (a press reopens that
     reading) and the cutscenes button. Rebuilt on every claim; the distances
     are text written from B.updateHUD (B.tickArchive), never a rebuild.
     Profiles saved before XP.readOrder existed list their reads first, in
     map order. */
  const arch = document.getElementById("arch");
  const KM_SPAN = 408, NEAR_RANGE = 120;   // the "next" bar scale (never printed); the bar is empty at NEAR_RANGE
  const kmTo = m => Math.abs(m.cam - B.camX) / (B.CAM.max - B.CAM.min) * KM_SPAN;
  const arrowTo = m => (m.cam < B.camX ? "← " : "→ ");
  /* printed text: an arrow and the span line's own distance and unit (HudModels.dist, as hud-c25 prints it) */
  const kmText = m => arrowTo(m) + window.HudModels.dist(m.id, m.cam, B.camX, B.CAM.max - B.CAM.min, B.LAND, B.SLOT).label;
  let live = null;      // what tickArchive writes: { unread, nextId, nextTxt, bar, barW, rows: [{ m, node, txt }] }
  let archAcc = 0;
  let toggleCuts = () => {};
  const cutsOpen = () => !!(modesPanel && modesPanel.classList.contains("open"));
  const nearestUnread = unread => {
    let best = null, bd = Infinity;
    unread.forEach(m => { const d = Math.abs(m.cam - B.camX); if (d < bd) { bd = d; best = m; } });
    return best;
  };
  /* reopen a read beacon's note: no XP, no cutscene, no log line; the ship stops at the beacon */
  function reopenReading(m) {
    if (!window.Genesis || Genesis.active) return;
    if (B.ship) {
      Voidship.setThrusting(B.ship, false);
      Voidship.clearCourse(B.ship);
      B.ship.vel = 0; B.ship.vy = 0;
    }
    B.vel = 0;
    B.activeMark = m;
    B.camX = m.cam;
    B.showNote(m);
  }
  B.tickArchive = dt => {
    if (!live) return;
    archAcc += dt;
    if (archAcc < 0.2) return;
    archAcc = 0;
    if (live.unread.length) {
      const n = nearestUnread(live.unread);
      if (n.id !== live.nextId) { buildArchive(); return; }
      const t = kmText(n);
      if (t !== live.nextTxt.nodeValue) live.nextTxt.nodeValue = t;
      const w = Math.round((1 - Math.min(1, kmTo(n) / NEAR_RANGE)) * 100);
      if (w !== live.barW) { live.barW = w; live.bar.style.width = w + "%"; }
    }
    live.rows.forEach(r => {
      const t = kmText(r.m);
      if (t !== r.node.nodeValue) r.node.nodeValue = t;
    });
  };
  function buildArchive() {
    if (!arch || !window.XP || !B.activeMarks) return;
    const marks = B.activeMarks();
    const done = marks.filter(m => XP.has("beacon-" + m.id));   // real marks only, so count === B.beaconCount().read
    const unread = marks.filter(m => !XP.has("beacon-" + m.id));
    const ord = XP.readOrder;
    const rank = m => ord.indexOf("beacon-" + m.id);
    done.sort((a, b) => rank(a) - rank(b));
    arch.textContent = "";
    live = { unread, nextId: null, nextTxt: null, bar: null, barW: 0, rows: [] };
    const spine = document.createElement("div");
    spine.className = "arch-spine";
    marks.forEach((m, i) => {
      const n = document.createElement("i");
      if (i < done.length) n.className = i === done.length - 1 ? "on new" : "on";
      spine.appendChild(n);
    });
    const body = document.createElement("div");
    body.className = "arch-body";
    const el = (tag, cls, text) => {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text != null) e.textContent = text;
      return e;
    };
    const count = el("span", "arch-count", done.length);
    count.appendChild(el("small", null, " / " + marks.length + " readings"));
    body.appendChild(count);
    /* next unread signal: label, arrow + distance, a bar that fills as the ship closes in */
    body.appendChild(el("span", "arch-lab", "next unread signal"));
    const nxt = nearestUnread(unread);
    if (nxt) {
      live.nextId = nxt.id;
      const line = el("span", "arch-next gold");
      live.nextTxt = document.createTextNode(kmText(nxt));
      line.appendChild(live.nextTxt);
      const track = el("span", "arch-track");
      live.bar = el("i");
      live.barW = Math.round((1 - Math.min(1, kmTo(nxt) / NEAR_RANGE)) * 100);
      live.bar.style.width = live.barW + "%";
      track.appendChild(live.bar);
      body.append(line, track);
    } else {
      body.appendChild(el("span", "arch-next", "all signals read"));
    }
    /* the three latest reads, newest first: a press reopens that note */
    if (done.length) body.appendChild(el("span", "arch-lab", "read"));
    done.slice(-3).reverse().forEach(m => {
      const b = el("button", "arch-rd hud-click");
      b.type = "button";
      b.appendChild(el("span", "arch-nm", m.name.toLowerCase()));
      const km = el("span", "arch-km gold");
      const node = document.createTextNode(kmText(m));
      km.appendChild(node);
      b.appendChild(km);
      live.rows.push({ m, node });
      b.addEventListener("pointerdown", e => e.stopPropagation());
      b.addEventListener("click", () => reopenReading(m));
      body.appendChild(b);
    });
    if (unread.length)
      body.appendChild(el("span", "arch-dim", unread.length + (unread.length === 1 ? " signal unread" : " signals unread")));
    /* the one way to the cutscene list on wide screens */
    const order = (window.Gen && Gen.SCENE_ORDER) || Object.keys(SCENE_NAMES);
    const seen = order.filter(id => window.Genesis && Genesis.segmentSeen(id)).length;
    const cut = el("button", "arch-cut hud-click");
    cut.type = "button";
    cut.setAttribute("aria-expanded", cutsOpen() ? "true" : "false");
    cut.appendChild(el("span", null, "cutscenes"));
    cut.appendChild(el("span", "arch-km", seen + " / " + order.length));
    cut.addEventListener("pointerdown", e => e.stopPropagation());
    cut.addEventListener("click", e => { e.stopPropagation(); toggleCuts(); });
    body.appendChild(cut);
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
      const cut = arch && arch.querySelector(".arch-cut");
      if (cut) cut.setAttribute("aria-expanded", on ? "true" : "false");
      if (on) { buildJournal(); retireTip(); }
    };
    closeJournal = () => setOpen(false);
    toggleCuts = () => setOpen(!modesPanel.classList.contains("open"));
    /* where the archive shows, the folder is only its title: out of the tab order */
    const narrow = matchMedia("(max-width: 900px), (max-height: 520px) and (pointer: coarse)");   /* same query as the one in bridge.css that hides .arch */
    const syncGear = () => { gearBtn.tabIndex = narrow.matches ? 0 : -1; };
    syncGear();
    narrow.addEventListener("change", syncGear);
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
