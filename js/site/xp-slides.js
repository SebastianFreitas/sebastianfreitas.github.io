/* Experience pictures: each a.xp-pic keeps its first picture as an img, the rest sit in data-slides and load the first time the entry slides.
   Desktop: slides while the row is hovered or focused; phones: while the entry is at least half on screen. Transform-only, timers, no frame loop. */
(function () {
  "use strict";
  const hoverOK = window.matchMedia("(hover: hover)");
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
  const stacked = window.matchMedia("(min-width: 1200px)");   /* 1200 px and up: the pictures are a strip of tiles (Shapes.xpShape) that slides up a tile per step, no sideways slideshow */
  const SLIDE = 450, HOLD = 2000, DELAY = 150;
  const items = [];

  function build(pic) {
    let list = [];
    try { list = JSON.parse(pic.getAttribute("data-slides") || "[]"); } catch (e) { list = []; }
    const first = pic.querySelector("img");
    if (!first || !list.length) return null;
    return { pic, first, list, imgs: null, idx: 0, cur: null, layers: [], timer: 0, want: false, on: false };
  }

  function load(it) {
    if (it.imgs) return;
    it.imgs = it.list.map(function (s) {
      const im = new Image();
      im.alt = s.a; if (s.t) im.title = s.t; im.decoding = "async"; im.src = s.s;
      im.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;transform:translateX(100%);will-change:transform";
      return im;
    });
  }

  function step(it) {
    if (!it.on) return;
    const n = it.list.length + 1;
    const next = (it.idx + 1) % n;
    const el = next === 0 ? it.first.cloneNode() : it.imgs[next - 1].cloneNode();
    el.removeAttribute("loading");
    el.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;transform:translateX(100%);will-change:transform";
    const go = function () {
      if (!it.on) return;
      it.pic.appendChild(el);
      it.layers.push(el);
      void el.offsetWidth;
      el.style.transition = "transform " + SLIDE + "ms ease-out";
      el.style.transform = "translateX(0)";
      it.idx = next;
      it.timer = setTimeout(function () {
        while (it.layers.length > 1) it.layers.shift().remove();
        it.timer = setTimeout(function () { step(it); }, HOLD);
      }, SLIDE);
    };
    it.pending = el;
    if (el.complete && el.naturalWidth) go();
    else { el.onload = go; el.onerror = function () { it.timer = setTimeout(function () { step(it); }, HOLD); }; }
  }

  /* 1200 px and up: the column is a strip of tiles (Shapes.xpShape, one more than shows); a step slides it up one tile, then the top tile is recycled to the end */
  function settle(st, gen) {
    st._sl = false;
    if (st._gen !== gen || !st._xp || !st.parentNode) return;
    const x = st._xp, first = st.firstElementChild, p = st._k + st.children.length, q = st.parentNode._xpSrc;
    st._k++;
    if (!first || !q || !q.length) return;
    first.style.top = (p * x.th).toFixed(1) + "px";
    first.style.left = (x.ul + x.s * (p * x.th + x.th / 2) - x.pad - x.l).toFixed(1) + "px";
    const r = q[p % q.length];
    first.alt = r.a || ""; if (r.t) first.title = r.t; else first.removeAttribute("title");
    if (first.getAttribute("src") !== r.s) first.src = r.s;
    st.appendChild(first);
  }

  function slide(it) {
    const st = it.st;
    if (!it.on || !st || !st.isConnected || !st._xp) return;
    const gen = st._gen;
    st._sl = true;
    st.style.willChange = "transform";
    st.style.transition = "transform " + SLIDE + "ms ease-out";
    const d = (st._k + 1) * st._xp.th;   /* the strip climbs along the column's lean, so every tile keeps its place against the leaning edges */
    st.style.transform = "translate(" + (-st._xp.s * d).toFixed(1) + "px, " + (-d).toFixed(1) + "px)";
    it.timer = setTimeout(function () {
      settle(st, gen);
      it.timer = setTimeout(function () { slide(it); }, HOLD);
    }, SLIDE);
  }

  function start(it) {
    if (it.on || calm.matches || document.hidden) return;
    if (stacked.matches) {
      const st = it.pic.querySelector(".xp-strip");
      if (!st) return;
      it.st = st;
      it.on = true;
      Array.prototype.forEach.call(st.children, function (im) { im.loading = "eager"; });
      slide(it);
      return;
    }
    it.on = true;
    load(it);
    step(it);
  }

  function stop(it) {
    it.on = false;
    clearTimeout(it.timer);
    const st = it.st;
    if (st) {
      it.st = null;
      if (st._sl) settle(st, st._gen);
      st.style.transition = "none";
      st.style.willChange = "";
      return;
    }
    if (it.pending) { it.pending.onload = it.pending.onerror = null; it.pending = null; }
    it.layers.forEach(function (l) { l.remove(); });
    it.layers = [];
    it.idx = 0;
  }

  function want(it, yes) {
    it.want = yes;
    clearTimeout(it.arm);
    if (yes) it.arm = setTimeout(function () { if (it.want) start(it); }, hoverOK.matches ? DELAY : 0);
    else stop(it);
  }

  function init() {
    document.querySelectorAll(".xp a.xp-pic").forEach(function (pic) {
      const it = build(pic);
      if (!it) return;
      items.push(it);
      const li = pic.closest("li");
      if (hoverOK.matches && li) {
        li.addEventListener("pointerenter", function () { want(it, true); });
        li.addEventListener("pointerleave", function () { want(it, false); });
        li.addEventListener("focusin", function () { want(it, true); });
        li.addEventListener("focusout", function (e) { if (!li.contains(e.relatedTarget)) want(it, false); });
      } else if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (es) {
          es.forEach(function (e) { want(it, e.isIntersecting); });
        }, { threshold: 0.5 }).observe(pic);
      }
    });
    stacked.addEventListener("change", function () {
      items.forEach(function (it) { stop(it); if (it.want) start(it); });
    });
    document.addEventListener("visibilitychange", function () {
      items.forEach(function (it) {
        if (document.hidden) stop(it);
        else if (it.want) start(it);
      });
    });
  }

  window.XpSlides = { init: init };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
