/* voidscape-bench.js — the VoidScape crafting bench inline on the case page.
   Paints Forge.bench onto the <canvas id="void-bench"> after the crafting
   write-up. No rAF loop while off screen or idle: it draws once on resize,
   scroll-in and pointer input, and only loops while a button is flashing. */
window.VoidBench = (function () {
  const cv = document.getElementById("void-bench");
  if (!cv || !window.Forge) return { gun: () => (window.Forge ? Forge.gun() : null) };
  const B = Forge.bench;
  const g = cv.getContext("2d");
  const MAX_SCALE = 1.4;
  let scale = 1, ox = 0, visible = false, raf = 0, prev = 0;

  function size() {
    const w = cv.clientWidth || B.W;
    scale = Math.min(w / B.W, MAX_SCALE);
    ox = (w - B.W * scale) / 2;
    const h = Math.round(B.H * scale + 16);
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
    B.draw(g, 0, 0);
    g.restore();
  }

  function frame(now) {
    raf = 0;
    const dt = prev ? Math.min((now - prev) / 1000, 0.1) : 0.016;
    prev = now;
    B.step(dt);
    paint();
    if (visible && B.lively()) raf = requestAnimationFrame(frame);
    else prev = 0;
  }
  function wake() {
    if (!raf && visible) raf = requestAnimationFrame(frame);
  }

  function local(e) {
    const r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left - ox) / scale, y: (e.clientY - r.top - 8) / scale };
  }
  cv.addEventListener("pointerdown", function (e) {
    const p = local(e);
    if (B.hit(p.x, p.y)) { e.preventDefault(); paint(); wake(); }
  });
  cv.addEventListener("pointermove", function (e) {
    const p = local(e);
    cv.style.cursor = B.over(p.x, p.y) ? "pointer" : "";
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible) { paint(); wake(); }
    }).observe(cv);
  } else visible = true;
  document.addEventListener("forge:gun", function () {
    document.dispatchEvent(new CustomEvent("voidbench:gun"));
  });
  window.addEventListener("resize", size);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(paint);
  size();

  return { gun: () => Forge.gun() };
})();
