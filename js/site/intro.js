/* ===========================================================
   SITE GATE — shown on every homepage load.

   entry.js classifies the load: only a first visit gets the boot
   log; back, reload, #work / #experience links and returning
   visitors get the panel and the loading bar at once, then enter
   in their last sector and place.
   Escape or a top bar link leaves the gate.
   path-projects: +1 on reaching #work.
   path-world: +1 on picking Setting (bridge.js also awards it
   when The Void button is used).
   =========================================================== */

(function () {
  const gate = document.getElementById("site-gate");
  if (!gate) return;

  const shellEl = document.getElementById("gate-shell");
  const logEl   = document.getElementById("gate-log");
  const panelEl = document.getElementById("gate-panel");
  const touch   = Util.coarse();
  const entry   = window.SiteEntry || { kind: "first", sector: "void", view: null };
  const reduced = Util.reduced();

  const PATH = {
    world:    { id: "path-world",    label: "Setting" },
    projects: { id: "path-projects", label: "Game Dev" },
  };

  let autoTimer = 0;
  /* only a first visit gets the boot log and the scroll to the hero; every other load keeps its place */
  const first = entry.kind === "first";

  /* the heavy first-time work, one step per real thing that loads; onStep(done, total) after each.
     Steps run one after another and a painted frame passes between them, so every percentage is seen
     before the next block of work starts (a long step cannot hide the ones before it). */
  const WARM_CAP_MS = 8000;
  function warmUp(onStep) {
    const loaded = new Promise(res => {
      if (document.readyState === "complete") res(); else addEventListener("load", res, { once: true });
    });
    const paintedFrame = () => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
    const firstView = () => Array.from(document.images).filter(im => {
      const r = im.getBoundingClientRect();
      return r.bottom > 0 && r.top < innerHeight * 2 && im.decode;
    }).map(im => im.decode().catch(() => {}));
    const steps = [
      () => document.fonts && document.fonts.ready,
      () => loaded,
      () => Promise.all(firstView()),
      () => paintedFrame().then(() => { if (window.Bridge && Bridge.paintOnce) Bridge.paintOnce(); }),
    ];
    stepNames = ["type", "page", "pictures", "bridge"];
    /* the cutscene's warm-up comes in stages of its own, all under one name */
    if (window.Genesis && Genesis.warmSteps) Genesis.warmSteps().forEach(f => { steps.push(f); stepNames.push("cutscene"); });
    const total = steps.length;
    buildSteps();
    setGateP(0);
    setLabel(0);
    if (total < 20 && barFill && barLabel) {
      shortList = true;
      nextAt = 100 / total;
      shortTimer = setInterval(shortTick, 50);
    }
    let chain = Promise.resolve();
    steps.forEach((fn, i) => {
      chain = chain.then(() => paintedFrame()).then(() => Promise.resolve().then(fn).catch(() => {})).then(() => { if (onStep) onStep(i + 1, total, stepNames[i]); });
    });
    return chain;
  }

  /* the names of the steps, in order; one li[data-step] per distinct name in #gate-steps */
  let stepNames = [], stepsDone = 0, stepsTotal = 1;
  function buildSteps() {
    const ol = document.getElementById("gate-steps");
    if (!ol) return;
    ol.textContent = "";
    stepNames.filter((nm, i) => stepNames.indexOf(nm) === i).forEach(nm => {
      const li = document.createElement("li");
      li.dataset.step = nm;
      li.textContent = nm;
      if (nm === "cutscene") li.dataset.count = stepNames.filter(x => x === nm).length;
      ol.appendChild(li);
    });
  }
  function setGateP(p) { gate.style.setProperty("--gate-p", reduced ? 1 : p); }
  /* the gauge reads the step in progress and the percent */
  function setLabel(pct) {
    if (barLabel) barLabel.textContent = "waking  " + (stepNames[stepsDone] || "") + "  " + Math.round(pct) + "%";
  }
  function stepDone(n, total) {
    stepsDone = n; stepsTotal = total;
    setGateP(n / total);
    const nm = stepNames[n - 1];
    if (stepNames[n] !== nm) {
      const li = document.querySelector('#gate-steps li[data-step="' + nm + '"]');
      if (li) li.classList.add("done");
    }
    /* the bridge's still frame shows behind the scrim only once it has been painted */
    if (nm === "bridge") gate.classList.add("still");
  }

  function finish() {
    clearTimeout(autoTimer);
    removeEventListener("keydown", onGateKey, true);
    document.body.classList.remove("site-frozen");
    /* the gate goes at once; a scrim copy fades over 0.4 s (none for reduced motion or before the still frame) */
    if (!reduced && gate.classList.contains("still")) {
      const fade = document.createElement("div");
      fade.className = "gate-fade";
      document.body.appendChild(fade);
      requestAnimationFrame(() => requestAnimationFrame(() => fade.classList.add("out")));
      setTimeout(() => fade.remove(), 500);
    }
    gate.classList.add("done");
    document.documentElement.classList.add("gate-done");
    /* every exit lands here: later loads in this tab skip the gate (inline script in index.html) */
    Util.write(sessionStorage, Util.KEYS.ENTERED, "1");
    if (window.XP && entry.kind !== "deeplink") XP.seen();
  }

  function pick(opts) {
    finish();
    document.dispatchEvent(new CustomEvent("site:enter", {
      detail: {
        bridge: opts.bridge !== false,
        auto: !!opts.auto,
        mode: opts.mode || null,
        entry: first ? "gate" : entry.kind,
        view: entry.view,
      },
    }));
    if (opts.scroll && first) {
      const target = document.querySelector(opts.scroll);
      if (target) target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    }
  }

  /* the way in waits for the warm-up: a click before 100% is held and fires on completion */
  let warmed = false, held = null;
  function go(opts) {
    if (warmed) { if (!gate.classList.contains("done")) pick(opts); return; }
    held = opts;
  }
  /* the label never runs ahead of the fill: READY waits for the fill to reach 100% */
  let filling = false;
  function warmDone() {
    if (warmed || filling) return;
    filling = true;
    clearTimeout(capTimer);
    if (!barFill) { warmReady(); return; }
    if (shortList) { real = 100; return; }
    let t = 0;
    const settle = () => { clearTimeout(t); barFill.removeEventListener("transitionend", settle); warmReady(); };
    barFill.addEventListener("transitionend", settle);
    t = setTimeout(settle, 450);
    barFill.style.transform = "scaleX(1)";
  }
  function warmReady() {
    if (warmed) return;
    warmed = true;
    if (barEl) barEl.classList.add("full");
    setGateP(1);
    if (barLabel) barLabel.textContent = "ready";
    if (btnWorld) { btnWorld.classList.remove("waiting"); btnWorld.removeAttribute("aria-disabled"); }
    if (held && !gate.classList.contains("done")) pick(held);
    held = null;
    if (barEl) setTimeout(() => barEl.classList.add("out"), 350);
  }
  let capTimer = 0, barEl = null, barFill = null, barLabel = null;
  /* a short step list (reduced motion) would sit at 25% and leap: the shown value walks to the real one
     in small increments and creeps toward, never reaching, the next step while a slow one is pending */
  let shortList = false, real = 0, shown = 0, nextAt = 100, shortTimer = 0;
  function shortTick() {
    if (warmed) { clearInterval(shortTimer); return; }
    if (shown < real) shown = Math.min(real, shown + 1.5);
    else if (!filling) {
      const cap = nextAt - 1;
      if (shown < cap) shown += Math.max(0.05, Math.min(0.3, (cap - shown) * 0.1));
    }
    barFill.style.transform = "scaleX(" + shown / 100 + ")";
    setLabel(shown);
    if (filling && shown >= 100) { clearInterval(shortTimer); warmReady(); }
  }

  const btnWorld = document.getElementById("gate-world");
  if (window.Shapes) Shapes.apply(gate);
  if (btnWorld) {
    btnWorld.addEventListener("click", () => go({
      bridge: true, scroll: "#bridge-hero", el: btnWorld, path: PATH.world,
      mode: "void",
    }));
  }

  /* the wordmark on the homepage goes to the top, never reloads */
  const mark = document.querySelector(".topbar .wordmark");
  if (mark) mark.addEventListener("click", e => {
    e.preventDefault();
    if (!gate.classList.contains("done")) return;
    scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    if (location.hash) history.replaceState(history.state, "", location.pathname + location.search);
  });

  function onGateKey(e) {
    if (e.key !== "Escape" || gate.classList.contains("done")) return;
    e.preventDefault();
    pick({ bridge: true, mode: "void" });
  }

  /* already through the gate in this tab: same end state as an exit, no boot log, steps or fade;
     the page's own hash scroll lands the target since the body is never frozen */
  if (document.documentElement.classList.contains("gate-skip")) {
    finish();
    document.dispatchEvent(new CustomEvent("site:preload"));
    document.dispatchEvent(new CustomEvent("site:enter", {
      detail: { bridge: true, auto: false, mode: "void", entry: entry.kind, view: entry.view },
    }));
    return;
  }

  addEventListener("keydown", onGateKey, true);
  /* in-page top bar links still work while the gate is up */
  document.querySelectorAll(".topbar nav a[href^='#']").forEach(a => {
    a.addEventListener("click", () => {
      if (!gate.classList.contains("done")) pick({ bridge: true, mode: "void" });
    });
  });

  document.body.classList.add("site-frozen");
  document.dispatchEvent(new CustomEvent("site:preload"));

  /* loading bar under the stage (track, fill, label), filled by finished tasks */
  barEl = document.createElement("div");
  barEl.className = "gate-bar";
  const trackEl = document.createElement("div");
  trackEl.className = "gate-bar-track";
  barFill = document.createElement("i");
  trackEl.appendChild(barFill);
  barLabel = document.createElement("span");
  barLabel.className = "gate-bar-label";
  barEl.append(trackEl, barLabel);
  const stageEl = gate.querySelector(".gate-stage");
  if (stageEl) stageEl.appendChild(barEl);
  if (btnWorld) { btnWorld.classList.add("waiting"); btnWorld.setAttribute("aria-disabled", "true"); }
  capTimer = setTimeout(warmDone, WARM_CAP_MS);
  warmUp((n, total) => {
    stepDone(n, total);
    if (shortList) { if (!filling) { real = n / total * 100; nextAt = Math.min(100, (n + 1) / total * 100); } return; }
    if (n < total && barFill && !filling && !warmed) {
      barFill.style.transform = "scaleX(" + (n / total) + ")";
      setLabel(n / total * 100);
    }
  }).then(warmDone);

  const lines = [
    "link established",
    touch ? "input: touch · hold to burn toward a point"
          : "input: pointer · hold to burn toward a point",
    "loading index · bridge · work",
    XP ? `entry: ${XP.name.toLowerCase()} · ref ${XP.ref}` : "entry: provisional",
    "ready",
  ].filter(Boolean);

  let idx = 0, char = 0, lineEl = null, hold = 0, ready = false;

  function revealPanel() {
    if (ready) return;
    ready = true;
    if (shellEl) shellEl.classList.add("out");
    if (panelEl) {
      panelEl.hidden = false;
      requestAnimationFrame(() => panelEl.classList.add("on"));
      /* nobody clicked: continue by itself after time to read (3 s + words / 4) */
      const words = panelEl.textContent.trim().split(/\s+/).length;
      autoTimer = setTimeout(() => {
        go({
          bridge: true, scroll: "#bridge-hero", el: btnWorld, path: PATH.world,
          mode: "void",
        });
      }, (3 + words / 4) * 1000);
    }
  }

  function tick(dt) {
    if (ready || !logEl) return;
    if (hold > 0) { hold -= dt; return; }

    if (!lineEl) {
      if (idx >= lines.length) { revealPanel(); return; }
      lineEl = document.createElement("div");
      lineEl.className = "bl";
      logEl.appendChild(lineEl);
      char = 0;
    }
    const full = lines[idx];
    char = Math.min(full.length, char + dt * 90);
    const n = Math.floor(char);
    lineEl.textContent = full.slice(0, n) + (n < full.length ? "_" : "");
    if (n >= full.length) { idx++; lineEl = null; hold = 0.13; }
  }

  const known = !first || !!(window.XP && XP.known);
  if (known) {
    if (shellEl) shellEl.classList.add("out");
    revealPanel();
  } else if (reduced) {
    lines.forEach(full => {
      const d = document.createElement("div");
      d.className = "bl";
      d.textContent = full;
      if (logEl) logEl.appendChild(d);
    });
    revealPanel();
  } else {
    let last = performance.now();
    function frame(now) {
      tick(Math.min((now - last) / 1000, 1 / 20));
      last = now;
      if (!ready) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

})();
