/* ==========================================================================
   WORK PREVIEW — hover (or keyboard focus) on a Work row tilts it, plays its
   clip where the picture is and shows the "game page" button; leaving puts
   everything back. A click is just the row's own link. No preview on touch.
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
    const start = () => {
      if (!hoverOK.matches) return;
      row.classList.add("is-peek");
      if (v.preload === "none") v.preload = "auto";
      const p = v.play();
      if (p) p.catch(() => {});
    };
    const stop = () => {
      row.classList.remove("is-peek", "is-live");
      v.pause();
      v.currentTime = 0;
    };
    v.addEventListener("playing", () => { if (row.classList.contains("is-peek")) row.classList.add("is-live"); });
    row.addEventListener("pointerenter", (e) => { if (e.pointerType !== "touch") start(); });
    row.addEventListener("pointerleave", stop);
    row.addEventListener("focus", () => { if (row.matches(":focus-visible")) start(); });
    row.addEventListener("blur", stop);
  });

  /* an old #sector-zero style link scrolls to its row and opens nothing */
  const land = () => {
    const row = location.hash.length > 1 && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (!row || row.parentNode !== work) return;
    const bar = document.querySelector(".topbar");
    const gap = Math.max(0, bar && getComputedStyle(bar).position === "fixed" ? bar.getBoundingClientRect().bottom : 0) + 24;
    /* a hovered row tilts (css/style.css .is-peek, eased in): land its untilted top so the tilted corner still clears the bar */
    const tilt = Math.abs(parseFloat(getComputedStyle(row).getPropertyValue("--peek")) || 2.5) * Math.PI / 180;
    const lift = (row.offsetWidth * Math.sin(tilt) + row.offsetHeight * (Math.cos(tilt) - 1)) / 2;
    const top = work.getBoundingClientRect().top + row.offsetTop;
    window.scrollTo({ top: top + window.scrollY - gap - lift, behavior: "instant" });
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
