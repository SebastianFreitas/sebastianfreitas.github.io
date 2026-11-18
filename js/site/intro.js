/* ===========================================================
   SITE GATE — shown once per tab, before the homepage.

   One thin bar under the name fills as the real work finishes
   (fonts, load, pictures, the bridge's first frame, the cutscene's
   warm-up, each step its own unit); when it is full the gate fades
   and the site opens by itself, in the sector and place entry.js
   chose. Escape or a top bar link leaves the gate early.
   =========================================================== */

(function () {
  const gate = document.getElementById("site-gate");
  if (!gate) return;

  const barEl   = document.getElementById("gate-bar");
  const barFill = document.getElementById("gate-bar-fill");
  const entry   = window.SiteEntry || { kind: "first", sector: "void", view: null };
  const reduced = Util.reduced();

  /* only a first visit gets the scroll to the hero; every other load keeps its place */
  const first = entry.kind === "first";

  /* the fill moves only by its CSS transition on transform (compositor): JS sets each new target, and
     the two painted frames before the next step let it start before any blocking work runs */
  /* Motion (not reduced): a CSS creep (gate.css) starts at the first paint; here a Web Animations glide takes over
     from wherever it is, planned from the expected step costs and re-planned as steps end, and a last ease to full.
     All of it runs on the compositor; JS only starts an animation at a step's end (one style read, no per-frame writes). */
  const EXPECT = [550, 10, 70, 50, 35];   // ms per gate step, in chain order: fonts, load, images, css-images, paint (review-part2, measured 2026-11-16)
  const HOLD_MS = 250, LIVE_WAIT_MS = 300, MIN_MS = 1200, EASE_MS = 300, GLIDE_AT = 0.88, GLIDE_TOP = 0.985, TAIL_MS = 12000;
  /* the minimum counts from the page's real first paint: first-paint, else first-contentful-paint (Firefox), else the gate's own
     first painted frame (null until it happens; never 0) */
  const paintEntry = performance.getEntriesByName("first-paint")[0] || performance.getEntriesByName("first-contentful-paint")[0];
  let firstPaintAt = paintEntry ? paintEntry.startTime : null;
  const anchor = () => firstPaintAt === null ? performance.now() : firstPaintAt;
  let fillNow = 0;
  function setBar(p) { if (barEl) barEl.setAttribute("aria-valuenow", Math.round(p * 100)); }
  function setFill(p) {
    if (barFill) barFill.style.transform = "scaleX(" + p + ")";
    setBar(p);
  }
  /* where the fill is now (creep or glide), never above 1 */
  function fillAt() {
    const m = /matrix\(([^,]+)/.exec(getComputedStyle(barFill).transform || "");
    return m ? Math.min(1, Math.max(fillNow, parseFloat(m[1]))) : fillNow;
  }
  /* replace whatever runs with one animation from here: keyframes are [value, time offset in ms] pairs */
  function glideFrom(points) {
    const p0 = fillNow = fillAt();
    const total = points[points.length - 1][1];
    const old = barFill.getAnimations();
    const kf = [{ transform: "scaleX(" + p0 + ")", offset: 0 }];
    points.forEach(pt => kf.push({ transform: "scaleX(" + Math.max(p0, pt[0]) + ")", offset: pt[1] / total }));
    barFill.animate(kf, { duration: total, easing: "linear", fill: "forwards" });
    old.forEach(a => a.cancel());
    setBar(p0);
  }
  /* plan from "done" steps finished: reach GLIDE_AT when the remaining expected work ends (and not before
     the minimum is nearly up), then keep creeping slowly in case the work runs long */
  function plan(done) {
    if (reduced || !barFill || !barFill.animate) { if (barFill) setFill(Math.min(0.95, (done + 1) / (EXPECT.length + 1))); return; }
    let rest = 0;
    for (let i = done; i < EXPECT.length; i++) rest += EXPECT[i];
    const D = Math.max(rest, anchor() + MIN_MS - performance.now(), 200);
    const top = Math.max(GLIDE_AT, fillAt());
    glideFrom([[top, D], [Math.max(GLIDE_TOP, top), D + TAIL_MS]]);
  }
  function easeFull() {
    if (reduced || !barFill || !barFill.animate) { setFill(1); return Promise.resolve(); }
    const p0 = fillNow = fillAt();
    const a = barFill.animate([{ transform: "scaleX(" + p0 + ")" }, { transform: "scaleX(1)" }],
      { duration: EASE_MS, easing: "cubic-bezier(0.3, 0.5, 0.5, 1)", fill: "forwards" });
    const old = barFill.getAnimations().filter(x => x !== a);
    old.forEach(x => x.cancel());
    setBar(1);
    return a.finished.catch(() => {});
  }

  /* the heavy first-time work, one step per real thing that loads. Steps run one after another and a painted
     frame passes between them, so every target is seen before the next block of work starts. The cutscene's
     warm-up is no step: the idle runner below takes it, a small unit at a time. */
  const WARM_CAP_MS = 8000;
  const paintedFrame = () => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
  const anchorReady = firstPaintAt !== null ? Promise.resolve()
    : new Promise(res => {
      const take = () => { if (firstPaintAt === null) firstPaintAt = performance.now(); res(); };
      /* a hidden tab paints no frames: its first look is the first painted frame after it is shown */
      const whenSeen = () => {
        if (!document.hidden) { requestAnimationFrame(() => requestAnimationFrame(take)); return; }
        document.addEventListener("visibilitychange", function onVis() {
          if (document.hidden) return;
          document.removeEventListener("visibilitychange", onVis);
          whenSeen();
        });
      };
      whenSeen();
    });
  function makeSteps() {
    const loaded = new Promise(res => {
      if (document.readyState === "complete") res(); else addEventListener("load", res, { once: true });
    });
    const firstView = () => Array.from(document.images).filter(im => {
      const r = im.getBoundingClientRect();
      return r.bottom > 0 && r.top < innerHeight * 2 && im.decode;
    }).map(im => im.decode().catch(() => {}));
    /* every face the page requests (index.html), so canvas text, hidden blocks and JS-built text never swap on first show */
    const SAMPLE = "Aa Bb Qq 0123456789 .,:;!?/-+%()[]'\"&@#ãçéÀ";
    const FACES = [
      '400 14px "IBM Plex Mono"', '500 14px "IBM Plex Mono"', '600 14px "IBM Plex Mono"',
      '400 14px "IBM Plex Sans"', '500 14px "IBM Plex Sans"',
      '400 14px "Oranienbaum"', '500 14px "Cormorant SC"',
      '600 14px "Barlow Condensed"', '700 14px "Barlow Condensed"',
      '400 14px "Source Sans 3"', '600 14px "Source Sans 3"', 'italic 400 14px "Source Sans 3"',
      '700 14px "Libre Caslon Condensed"',
    ];
    const fonts = () => document.fonts && document.fonts.load
      ? Promise.all(FACES.map(f => document.fonts.load(f, SAMPLE))).then(() => document.fonts.ready) : null;
    /* CSS images by the exact URLs the CSS uses, so the image cache serves them: the dirt art, the banner tab
       corner masks, and the wear masks (data URIs set by Shapes) on the first screen and first scroll */
    const cssImages = () => {
      const urls = ["/css/art/dirt-a.webp", "/art/wear/tab-tl.png", "/art/wear/tab-br.png"];
      document.querySelectorAll('[style*="--wear"]').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight * 2) return;
        const m = /--wear:\s*url\("([^"]+)"\)/.exec(el.getAttribute("style") || "");
        if (m && urls.indexOf(m[1]) < 0) urls.push(m[1]);
      });
      return Promise.all(urls.map(u => { const im = new Image(); im.src = u; return im.decode ? im.decode() : null; }));
    };
    /* name, ms to wait before moving on, work; a step that throws, rejects or times out warns once and the chain goes on */
    return [
      ["fonts", 1500, fonts],
      ["load", 4000, () => loaded],
      ["images", 1500, () => Promise.all(firstView())],
      ["css-images", 1500, cssImages],
      ["paint", 1500, () => paintedFrame().then(() => { if (window.Bridge && Bridge.paintOnce) Bridge.paintOnce(); gate.classList.add("still"); })],
    ];
  }
  /* one step with its timeout and its measure ("gate:<name>" under the gate, "idle:<name>" in the runner) */
  function runStep(step, prefix) {
    const name = step[0], ms = step[1], fn = step[2];
    const t0 = performance.now();
    let timer = 0;
    const timeout = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error("timed out after " + ms + " ms")), ms); });
    return Promise.race([Promise.resolve().then(fn), timeout])
      .catch(err => console.warn("gate step " + name + ": " + (err && err.message || err)))
      .then(() => {
        clearTimeout(timer);
        try { performance.measure(prefix + ":" + name, { start: t0, end: performance.now() }); } catch (e) {}
      });
  }

  /* the gate chain: stop() ends it at once and hands back the steps not yet started */
  function warmUp(onStep) {
    const steps = makeSteps(), total = steps.length;
    let i = 0, stopped = false;
    const go = () => {
      if (stopped || i >= total) return Promise.resolve();
      return paintedFrame().then(() => {
        if (stopped) return;
        const k = i++;
        return runStep(steps[k], "gate").then(() => { if (onStep) onStep(k + 1, total); }).then(go);
      });
    };
    return { done: go(), stop() { stopped = true; return steps.slice(i); } };
  }

  /* the idle runner: every Genesis unit (and the gate steps an early exit left) one per slot, only where no
     frame is lost: requestIdleCallback with the last unit's real cost left before the next painted frame
     (the bridge pacer paints every Nth refresh, so at 165 Hz that is up to 3 refreshes away, not the idle
     period's ~6 ms), else right after a frame. On the 2 s cap it never forces a unit into a busy frame: it asks
     again after the next painted frame (play() warms what is still cold). Paused while hidden or Genesis
     plays; held under the gate until it has gone. */
  const run = { queue: [], busy: false, over: false, queued: false, n: 0, cost: 8 };
  /* ms left before the next painted frame: the idle period, or with the bridge pacer painting every Nth refresh
     the time to its next paint (last paint + N refreshes) when that is longer */
  function roomMs(dl) {
    let room = dl.timeRemaining();
    const p = window.Bridge && Bridge.pacer;
    if (p && p.running && !p.idle) {
      const r = p.report();
      if (r.n > 1) room = Math.max(room, p.lastPaint + r.n * r.refreshMs - performance.now());
    }
    return room;
  }
  function schedule() {
    if (run.queued || run.over) return;
    run.queued = true;
    if (window.requestIdleCallback) requestIdleCallback(slot, { timeout: 2000 });
    else requestAnimationFrame(() => setTimeout(() => slot(null), 0));
  }
  function slot(dl) {
    run.queued = false;
    if (run.over || gateHeld || run.busy) return;   // release() starts it again
    if (document.hidden || (window.Genesis && Genesis.active)) { setTimeout(schedule, 500); return; }
    if (dl && dl.didTimeout) { paintedFrame().then(schedule); return; }
    if (dl && roomMs(dl) < run.cost) { schedule(); return; }
    if (run.queue.length) {
      run.busy = true;
      runStep(run.queue.shift(), "idle").then(() => { run.busy = false; schedule(); });
      return;
    }
    if (!window.Genesis || !Genesis.warmStep) { run.over = true; return; }
    const t0 = performance.now();
    let more = false;
    try { more = Genesis.warmStep(); } catch (e) { console.warn("genesis warm unit: " + (e && e.message || e)); }
    run.cost = Math.max(run.cost * 0.5, performance.now() - t0);
    try { performance.measure("idle:genesis-" + (++run.n), { start: t0, end: performance.now() }); } catch (e) {}
    if (more) schedule(); else run.over = true;
  }
  /* the gate's pause: off while its steps run, back on once it is ready to close, off again when it has gone */
  let gateHeld = false, chain = null;
  function release() { gateHeld = false; schedule(); }

  /* the gate and its fade clone are gone: "gate:gone" fires once on document (window.gateGone says so to a late listener) */
  const FADE_MS = 500;
  function gone() {
    window.gateGone = true;
    document.dispatchEvent(new CustomEvent("gate:gone"));
  }

  function finish() {
    removeEventListener("keydown", onGateKey, true);
    /* the chain stops at once; its steps not yet run (the bar's paint step is pointless now) go to the runner, which resumes on gate:gone */
    if (chain) {
      gateHeld = true;
      run.queue.push(...chain.stop().filter(s => s[0] !== "paint"));
      chain = null;
      document.addEventListener("gate:gone", release, { once: true });
    }
    document.body.classList.remove("site-frozen");
    /* the gate itself goes at once; a copy of its text, bar, tick and scrim fades over 0.5 s on the compositor
       (none for reduced motion or a gate already passed; before the still frame the copy is opaque, as the gate was) */
    let fade = null;
    if (!reduced && !document.documentElement.classList.contains("gate-skip")) {
      const p = barFill ? fillAt() : 1;
      fade = document.createElement("div");
      fade.className = "gate-fade" + (gate.classList.contains("still") ? "" : " pre");
      const src = gate.querySelector(".gate-stage");
      const stage = src.cloneNode(true);
      stage.querySelectorAll("[id]").forEach(el => el.removeAttribute("id"));
      /* the copy restarts CSS animations and transitions: freeze it at the look the gate had (text opacity, bar fill) */
      const live = src.querySelectorAll(".gate-eyebrow, .gate-title");
      stage.querySelectorAll(".gate-eyebrow, .gate-title").forEach((el, i) => {
        el.style.transition = "none";
        el.style.opacity = getComputedStyle(live[i]).opacity;
      });
      const fill = stage.querySelector(".gate-bar i");
      if (fill) fill.style.transform = "scaleX(" + p + ")";
      /* the gate's ::before layer (still fading off) has no copy: carry its look at this instant, under the stage */
      if (gate.classList.contains("still")) {
        const veil = document.createElement("div");
        veil.className = "gate-fade-veil";
        veil.style.opacity = getComputedStyle(gate, "::before").opacity;
        fade.appendChild(veil);
      }
      fade.appendChild(stage);
      document.body.appendChild(fade);
      void fade.offsetWidth;
      fade.classList.add("out");
    }
    gate.classList.add("done");
    document.documentElement.classList.add("gate-done");
    /* every exit lands here: later loads in this tab skip the gate (inline script in index.html) */
    try { Util.write(sessionStorage, Util.KEYS.ENTERED, "1"); } catch (e) {}   // the bare global throws where site storage is blocked
    if (window.XP && entry.kind !== "deeplink") XP.seen();
    if (fade) setTimeout(() => { fade.remove(); gone(); }, FADE_MS + 120);
    else gone();
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

  /* the work is done (or the cap hit): fill to full, let it arrive, then the gate fades and the site opens */
  let filling = false, capTimer = 0;
  function warmDone() {
    if (filling) return;
    filling = true;
    clearTimeout(capTimer);
    /* the steps are done but the gate is not ready to close until the minimum has passed: units may still run till then;
       the cap (8 s) is always past the minimum */
    (reduced ? Promise.resolve() : anchorReady).then(() => {
      const wait = reduced ? 0 : Math.max(0, firstPaintAt + MIN_MS - performance.now());
      return new Promise(res => setTimeout(res, wait));
    }).then(() => {
      if (gate.classList.contains("done")) return;
      gateHeld = true;   // ready to close: Genesis units wait until it has gone
      return Promise.race([easeFull(), new Promise(res => setTimeout(res, 900))]);
    }).then(() => {
      if (gate.classList.contains("done") || reduced) return;
      /* full: the live loop starts under the gate, the full bar holds, then the fade waits (a little) for the bridge's second live frame */
      if (window.Bridge && Bridge.startWarm) Bridge.startWarm();
      return new Promise(res => setTimeout(res, HOLD_MS)).then(() => {
        if (gate.classList.contains("done") || (window.Bridge && Bridge.liveFrames >= 2)) return;
        return new Promise(res => {
          const t = setTimeout(res, LIVE_WAIT_MS);
          document.addEventListener("bridge:live", () => { clearTimeout(t); res(); }, { once: true });
        });
      });
    }).then(() => {
      if (gate.classList.contains("done")) return;
      pick({ bridge: true, scroll: "#bridge-hero", mode: "void" });
    });
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

  /* already through the gate in this tab: same end state as an exit, no bar or fade;
     the page's own hash scroll lands the target since the body is never frozen */
  if (document.documentElement.classList.contains("gate-skip")) {
    finish();
    /* the same steps (but the paint) run through the runner, from the bridge's second live frame (or 3 s) */
    gateHeld = true;
    run.queue.push(...makeSteps().filter(s => s[0] !== "paint"));
    document.addEventListener("bridge:live", release, { once: true });
    setTimeout(release, 3000);
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

  /* the cap is an early exit like Escape: no ease, hold or wait, straight to the fade */
  function armCap() {
    capTimer = setTimeout(() => {
      if (filling || gate.classList.contains("done")) return;
      /* a hidden tab paints no frames, so nobody has seen the gate: the cap starts again when the tab is shown */
      if (document.hidden) {
        document.addEventListener("visibilitychange", function onVis() {
          if (document.hidden) return;
          document.removeEventListener("visibilitychange", onVis);
          if (!filling && !gate.classList.contains("done")) armCap();
        });
        return;
      }
      filling = true;
      pick({ bridge: true, scroll: "#bridge-hero", mode: "void" });
    }, WARM_CAP_MS);
  }
  armCap();
  plan(0);
  chain = warmUp(n => { if (!filling) plan(n); });
  chain.done.then(warmDone);
  schedule();   // Genesis units run in idle slots while the gate's steps still run

})();
