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

  /* the heavy first-time work, four tasks; onStep(done, total) after each one */
  const WARM_CAP_MS = 8000;
  function warmUp(onStep) {
    const total = 4;
    let n = 0;
    const step = () => { n++; if (onStep) onStep(n, total); };
    const run = (fn) => Promise.resolve().then(fn).catch(() => {}).then(step);
    const loaded = new Promise(res => {
      if (document.readyState === "complete") res(); else addEventListener("load", res, { once: true });
    });
    return Promise.all([
      run(() => Promise.all([loaded, document.fonts && document.fonts.ready])),
      run(() => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(() => {
        if (window.Bridge && Bridge.paintOnce) Bridge.paintOnce();
        res();
      })))),
      run(() => loaded.then(() => new Promise(res => setTimeout(res, 0))).then(() => window.Genesis && Genesis.warm && Genesis.warm())),
    ]);
  }

  function finish() {
    clearTimeout(autoTimer);
    removeEventListener("keydown", onGateKey, true);
    document.body.classList.remove("site-frozen");
    gate.classList.add("done");
    document.documentElement.classList.add("gate-done");
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
    if (barLabel) barLabel.textContent = "ready";
    if (btnWorld) { btnWorld.classList.remove("waiting"); btnWorld.removeAttribute("aria-disabled"); }
    if (held && !gate.classList.contains("done")) pick(held);
    held = null;
    if (barEl) setTimeout(() => barEl.classList.add("out"), 350);
  }
  let capTimer = 0, barEl = null, barFill = null, barLabel = null;

  const btnWorld = document.getElementById("gate-world");
  const gateBox = gate.querySelector(".gate-stage");
  if (gateBox) { gateBox.dataset.wear = "slab"; gateBox.dataset.seed = "81"; }
  gate.querySelectorAll(".gate-btn").forEach((b) => { b.dataset.wear = "button"; b.dataset.seed = "82"; });
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
  barLabel.textContent = "loading 0%";
  barEl.append(trackEl, barLabel);
  const stageEl = gate.querySelector(".gate-stage");
  if (stageEl) stageEl.appendChild(barEl);
  if (btnWorld) { btnWorld.classList.add("waiting"); btnWorld.setAttribute("aria-disabled", "true"); }
  capTimer = setTimeout(warmDone, WARM_CAP_MS);
  warmUp((n, total) => {
    if (n < total && barFill) {
      barFill.style.transform = "scaleX(" + (n / total) + ")";
      if (barLabel) barLabel.textContent = "loading " + Math.round(n / total * 100) + "%";
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
