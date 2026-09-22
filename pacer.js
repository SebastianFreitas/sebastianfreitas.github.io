/* pacer.js — a requestAnimationFrame scheduler that paints on display
   refresh boundaries (every Nth refresh so painted frames are all the same
   length, capped at 60 fps) and, when the scene is at rest and untouched
   for a while, lets the rAF chain go and wakes on a slow timer instead.
   Any input snaps it back. One instance per animated canvas. */
window.Pacer = (function () {
  function create(opts) {
    // opts.paint(dt)  — called on painted frames, dt in seconds (already clamped)
    // opts.atRest()   — true when nothing is moving (idle parking allowed)
    // opts.alive()    — false stops the chain (hidden tab, offscreen, portrait)
    let running = false;
    let armed = false, idleTimer = 0;   // an rAF callback is pending / an idle wake is pending
    let last = performance.now();
    /* pace the scene by display refreshes, not by a ms slot: paint every Nth
       refresh, N = floor(Hz / 60), so every painted frame is the same length.
       60 Hz → 60 fps, 75 → 75, 120 → 60, 144 → 72, 165 → 82.5, 240 → 60.
       The refresh interval is measured from rAF timestamps and kept up to date,
       so moving the window to another monitor re-picks N. */
    const REFRESH_WINDOW = 15;        // intervals kept for the measurement
    const REFRESH_FIRST = 5;          // intervals needed for the first measurement
    const REFRESH_MIN_MS = 2;         // intervals outside 2..50 ms aren't refreshes
    const REFRESH_MAX_MS = 50;
    const REFRESH_BAND = 0.4;         // intervals within ±40% of the median are averaged
    const refreshSamples = [];        // recent rAF intervals, ms, oldest first
    let refreshMs = 1000 / 60;        // measured refresh interval
    let refreshN = 1;                 // paint every refreshN refreshes
    let refreshMeasured = false;
    let pendingN = 0;                 // a new N waits for a second measurement to agree
    let sinceMeasure = 0;             // intervals recorded since the last measurement
    let prevStamp = -1;               // previous rAF timestamp; -1 = none yet
    let refreshCount = 0;             // refreshes since the last paint
    /* and never paint more than 60 times a second, whatever the panel runs at:
       past that a faster screen only repaints the same picture and the fans
       hear it. N keeps painted frames on refresh boundaries; this keeps their
       rate at 60 — on a panel whose refresh divides to 60 or less both gates
       agree and nothing changes. */
    const PAINT_MS = 1000 / 60;
    const PAINT_EARLY_MS = 2;   // vsync wobble: a boundary this close still paints
    let paintDue = 0;           // next paint's due stamp; 0 = paint on the next boundary
    /* at rest and untouched for a while, the scene only drifts: let the frame
       callback go and come back on a timer instead. Holding the callback open
       costs as much as painting. Any input snaps straight back. */
    const IDLE_AFTER_MS = 5000;
    const IDLE_PARK_MS = 100;         // idle wake interval, ms — 10 fps
    let lastInput = performance.now();
    let idleNow = false;
    /* One pending callback at a time, whoever asks. Without this a wake that
       races the idle timer would leave two chains running side by side. */
    function arm() {
      if (armed) return;
      armed = true;
      requestAnimationFrame(frame);
    }
    /* Idle: let go of the frame callback entirely and come back on a timer.
       Holding an rAF chain open costs the same whether it paints or not. */
    function parkIdle() {
      if (idleTimer) return;
      idleTimer = setTimeout(() => { idleTimer = 0; arm(); }, IDLE_PARK_MS);
    }
    function unpark() {
      if (!idleTimer) return;
      clearTimeout(idleTimer);
      idleTimer = 0;
      arm();
    }
    function measureRefresh() {
      const sorted = refreshSamples.slice().sort((a, b) => a - b);
      const m = sorted[sorted.length >> 1];
      let sum = 0, count = 0;
      for (const x of refreshSamples) {
        if (Math.abs(x - m) <= m * REFRESH_BAND) { sum += x; count++; }
      }
      refreshMs = sum / count;
      const n = Math.max(1, Math.floor(1000 / refreshMs / 60 + 0.03));   // 3% margin: 59.94 and 119.88 Hz panels keep their N
      if (!refreshMeasured) {
        refreshN = n;
        refreshMeasured = true;
        pendingN = 0;
      } else if (n === refreshN) {
        pendingN = 0;
      } else if (n === pendingN) {
        refreshN = n;
        pendingN = 0;
      } else {
        pendingN = n;
      }
    }
    function frame(now) {
      armed = false;
      if (!running) return;
      if (!opts.alive()) { running = false; return; }
      let refreshes = 1;
      if (prevStamp >= 0) {
        const delta = now - prevStamp;
        if (delta >= REFRESH_MIN_MS && delta <= REFRESH_MAX_MS) {
          refreshSamples.push(delta);
          if (refreshSamples.length > REFRESH_WINDOW) refreshSamples.shift();
          sinceMeasure++;
          if (refreshMeasured ? sinceMeasure >= REFRESH_WINDOW
                              : refreshSamples.length >= REFRESH_FIRST) {
            measureRefresh();
            sinceMeasure = 0;
          }
        }
        // a janky frame that spanned several refreshes counts as all of them
        refreshes = Math.max(1, Math.round(delta / refreshMs));
      }
      prevStamp = now;
      refreshCount += refreshes;

      if (!idleNow) {
        if (now - lastInput > IDLE_AFTER_MS && opts.atRest()) idleNow = true;
      } else if (!opts.atRest()) {
        idleNow = false;
        refreshCount = 2 * refreshN;
        paintDue = 0;
      }
      const slot = idleNow ? 2 * PAINT_MS : PAINT_MS;
      if (refreshCount < (idleNow ? 2 * refreshN : refreshN)) {
        arm();
        return;
      }
      if (paintDue && now < paintDue - PAINT_EARLY_MS) {
        // on a refresh boundary but under the 60 fps ceiling: wait for the next one
        arm();
        return;
      }
      refreshCount = 0;   // drop the remainder: a late frame never earns a double paint
      paintDue = !paintDue || now - paintDue > slot ? now + slot : paintDue + slot;
      const raw = Math.min((now - last) / 1000, 1 / 20);
      last = now;
      if (idleNow) parkIdle(); else arm();
      opts.paint(raw);
    }
    function start() {
      if (running) { unpark(); return; }
      running = true;
      last = performance.now(); prevStamp = -1; refreshCount = 2 * refreshN; paintDue = 0; armed = false;
      arm();
    }
    function wake() {
      lastInput = performance.now();
      if (idleNow) { idleNow = false; refreshCount = 2 * refreshN; paintDue = 0; unpark(); }   // paint on the very next callback
    }
    ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"].forEach(type =>
      addEventListener(type, wake, { passive: true, capture: true }));
    function report() {
      const hz = 1000 / refreshMs;
      return {
        refreshHz: +hz.toFixed(2),
        refreshMs: +refreshMs.toFixed(3),
        n: refreshN,
        measured: refreshMeasured,
        idle: idleNow,
        fps: idleNow ? +(1000 / IDLE_PARK_MS).toFixed(2)
                     : +Math.min(hz / refreshN, 1000 / PAINT_MS).toFixed(2),
        cap: idleNow ? 1000 / IDLE_PARK_MS : 60,
      };
    }
    return { start, wake, report, get running() { return running; }, get idle() { return idleNow; } };
  }
  return { create };
})();
