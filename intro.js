/* ===========================================================
   SITE GATE — first visit.

   Terminal boot (left-aligned), then bio + two paths.
   path-world / path-projects: +1 each, once — on click or
   when that section is first visited.
   =========================================================== */

(function () {
  const gate = document.getElementById("site-gate");
  if (!gate) return;

  const shellEl = document.getElementById("gate-shell");
  const logEl   = document.getElementById("gate-log");
  const panelEl = document.getElementById("gate-panel");
  const touch   = matchMedia("(pointer: coarse)").matches;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const PATH = {
    world:    { id: "path-world",    label: "World building" },
    projects: { id: "path-projects", label: "Game Projects" },
  };
  const watchers = {};

  function finish() {
    document.body.classList.remove("site-frozen");
    gate.classList.add("done");
    document.documentElement.classList.add("gate-done");
    if (window.XP) XP.seen();
  }

  function tryAward(id, label, el) {
    if (!window.XP || XP.has(id)) return;
    const r = el
      ? el.getBoundingClientRect()
      : { left: innerWidth * 0.5, top: innerHeight * 0.5, width: 0, height: 0 };
    XP.award(id, 1, label, r.left + r.width / 2, r.top + r.height / 2);
  }

  function unwatch(id) {
    if (watchers[id]) { watchers[id].disconnect(); delete watchers[id]; }
  }

  function watchSection(sel, id, label) {
    if (!window.XP || XP.has(id)) return;
    const el = document.querySelector(sel);
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(es => {
      if (!es[0].isIntersecting) return;
      if (!document.documentElement.classList.contains("gate-done")) return;
      if (window.XP && XP.has(id)) { unwatch(id); return; }
      const r = el.getBoundingClientRect();
      XP.award(id, 1, label, r.left + r.width * 0.5, r.top + Math.min(r.height * 0.25, 100));
      unwatch(id);
    }, { threshold: 0.28 });
    io.observe(el);
    watchers[id] = io;
  }

  function watchPaths() {
    watchSection("#bridge-hero", PATH.world.id, PATH.world.label);
    watchSection("#work", PATH.projects.id, PATH.projects.label);
  }

  function pick(opts) {
    finish();
    document.dispatchEvent(new CustomEvent("site:enter", {
      detail: {
        bridge: opts.bridge !== false,
        auto: !!opts.auto,
        mode: opts.mode || null,
      },
    }));
    if (opts.path) {
      unwatch(opts.path.id);
      tryAward(opts.path.id, opts.path.label, opts.el);
    }
    if (opts.scroll) {
      const target = document.querySelector(opts.scroll);
      if (target) target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    }
    watchPaths();
  }

  const btnWorld = document.getElementById("gate-world");
  const btnProjects = document.getElementById("gate-projects");
  if (btnWorld) {
    btnWorld.addEventListener("click", () => pick({
      bridge: true, scroll: "#bridge-hero", el: btnWorld, path: PATH.world,
    }));
  }
  if (btnProjects) {
    btnProjects.addEventListener("click", () => pick({
      bridge: true, scroll: "#bridge-hero", el: btnProjects, path: PATH.projects,
      mode: "gamedev",
    }));
  }

  if (window.XP && XP.known) {
    pick({ bridge: true, auto: true });
    return;
  }

  document.body.classList.add("site-frozen");
  document.dispatchEvent(new CustomEvent("site:preload"));

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

  if (reduced) {
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

  try { scrollTo(0, 0); } catch (e) {}
})();
