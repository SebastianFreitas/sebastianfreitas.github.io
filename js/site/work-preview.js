/* ==========================================================================
   WORK PREVIEW — hover (or keyboard focus) on a Work row plays its clip where the
   picture is; it stays open until another row opens or the pointer leaves Work. The
   text block (title label, hook, button) is always shown and never changes on hover.
   A click is just the row's own link. No preview on touch.
   Also keeps .work.is-scrolling while the page scrolls (css/style.css holds
   the row hover then) and lands an old #<key> link on its row.
   ========================================================================== */
window.WorkPreview = (function () {
  const work = document.querySelector(".work");
  if (!work) return {};
  const hoverOK = window.matchMedia("(hover: hover)");
  let scrollEnd = 0;
  window.addEventListener("scroll", () => {
    work.classList.add("is-scrolling");
    clearTimeout(scrollEnd);
    scrollEnd = setTimeout(() => work.classList.remove("is-scrolling"), 150);
  }, { passive: true });

  const stops = [];
  work.querySelectorAll(":scope > a.obj[data-wornquad]").forEach((row) => {
    const v = row.querySelector(":scope > video.obj-clip");
    if (!v) return;
    /* the clip gets the picture's clip and mask offset (Shapes.workRows sets them inline on the img only) */
    const img = row.querySelector(":scope > img.obj-shot");
    if (img) {
      const sync = () => ["--wk-shot-clip", "--wk-tx"].forEach((k) => {
        const val = img.style.getPropertyValue(k);
        if (val) v.style.setProperty(k, val); else v.style.removeProperty(k);
      });
      sync();
      new MutationObserver(sync).observe(img, { attributes: true, attributeFilter: ["style"] });
    }
    let playWait = 0;
    const start = () => {
      if (!hoverOK.matches) return;
      stops.forEach((f) => { if (f !== stop) f(); });   /* one row open at a time */
      row.classList.add("is-peek");
      clearTimeout(playWait);
      playWait = setTimeout(() => {   /* the clip starts once the pointer has rested; the slide and tag answer at once */
        if (!row.classList.contains("is-peek")) return;
        if (v.preload === "none") v.preload = "auto";
        const p = v.play();
        if (p) p.catch(() => {});
      }, 400);
    };
    const stop = () => {
      clearTimeout(playWait);
      row.classList.remove("is-peek", "is-live");
      v.pause();
      v.currentTime = 0;
    };
    stops.push(stop);
    v.addEventListener("playing", () => { if (row.classList.contains("is-peek")) row.classList.add("is-live"); });
    row.addEventListener("pointerenter", (e) => { if (e.pointerType !== "touch") start(); });
    row.addEventListener("focus", () => { if (row.matches(":focus-visible")) start(); });
    row.addEventListener("blur", stop);
  });

  /* a row stays open after the pointer leaves it: until another row opens or the pointer leaves Work */
  work.addEventListener("pointerleave", (e) => { if (e.pointerType !== "touch") stops.forEach((f) => f()); });

  /* an old #sector-zero style link scrolls to its row and opens nothing */
  const land = () => {
    const row = location.hash.length > 1 && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (!row || row.parentNode !== work) return;
    const bar = document.querySelector(".topbar");
    const gap = Math.max(0, bar && getComputedStyle(bar).position === "fixed" ? bar.getBoundingClientRect().bottom : 0) + 24;
    const k = window.Stage ? window.Stage.s() : 1;   /* offsets are design px under the stage zoom, rects are screen px */
    const top = work.getBoundingClientRect().top + row.offsetTop * k;
    window.scrollTo({ top: top + window.scrollY - gap, behavior: "instant" });
  };
  /* images and fonts above the row settle later: land again until the reader moves */
  let live = true;
  const again = () => { if (live) land(); };
  ["wheel", "touchstart", "keydown"].forEach((ev) => window.addEventListener(ev, () => { live = false; }, { passive: true, once: true }));
  if (document.readyState === "complete") land(); else window.addEventListener("load", again, { once: true });
  if (document.fonts) document.fonts.ready.then(again);
  window.addEventListener("hashchange", () => { live = true; land(); });
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(again);
    ro.observe(document.body);
    setTimeout(() => ro.disconnect(), 3000);
  }
  return {};
})();
