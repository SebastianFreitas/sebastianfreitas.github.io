/* voidscape-mapgen.js — the VoidScape mission console inline on the case page.
   Paints Forge.map onto the <canvas id="void-mapgen"> after the missions
   write-up. Starts with three random missions; SEARCH and EMPOWER work as on
   the old console. No rAF loop while off screen or idle: it draws on resize,
   scroll-in and pointer input, and only loops while a search is running. */
window.VoidMapgen = (function () {
  const cv = document.getElementById("void-mapgen");
  if (!cv || !window.Forge) return { generate: () => null };
  const M = Forge.map;
  const g = cv.getContext("2d");
  const MAX_SCALE = 1.4;
  let scale = 1, ox = 0, visible = false, raf = 0, prev = 0;

  function size() {
    const w = cv.clientWidth || M.W;
    scale = Math.min(w / M.W, MAX_SCALE);
    ox = (w - M.W * scale) / 2;
    const h = Math.round(M.H * scale + 16);
    const d = window.devicePixelRatio || 1;
    cv.style.height = h + "px";
    cv.width = Math.round(w * d);
    cv.height = Math.round(h * d);
    g.setTransform(d, 0, 0, d, 0, 0);
    paint();
  }

  function paint() {
    g.clearRect(0, 0, cv.width, cv.height);
    g.save();
    g.translate(ox, 8);
    g.scale(scale, scale);
    M.draw(g, 0, 0);
    g.restore();
    // the console grows as EMPOWER adds lines: resize the canvas to match
    if (cv.style.height !== Math.round(M.H * scale + 16) + "px") size();
  }

  function frame(now) {
    raf = 0;
    const dt = prev ? Math.min((now - prev) / 1000, 0.1) : 0.016;
    prev = now;
    M.step(dt);
    paint();
    if (visible && M.lively()) raf = requestAnimationFrame(frame);
    else prev = 0;
  }
  function wake() {
    if (!raf && visible) raf = requestAnimationFrame(frame);
  }

  function local(e) {
    const r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left - ox) / scale, y: (e.clientY - r.top - 8) / scale };
  }
  function generate() {
    const r = M.generate();
    paint(); wake();
    return r;
  }
  cv.addEventListener("pointerdown", function (e) {
    const p = local(e);
    if (M.hit(p.x, p.y)) { e.preventDefault(); paint(); wake(); }
  });
  cv.addEventListener("pointermove", function (e) {
    const p = local(e);
    cv.style.cursor = M.over(p.x, p.y) ? "pointer" : "";
  });

  M.generate();
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible) { paint(); wake(); }
    }).observe(cv);
  } else visible = true;
  window.addEventListener("resize", size);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(paint);
  size();

  return { generate };
})();
