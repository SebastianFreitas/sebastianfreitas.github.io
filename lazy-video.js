/* =========================================================
   Adaptive video loading.

   Two encodes of every clip live side by side:

     media/sector-zero/foo.mp4        full quality
     media/sector-zero/sd/foo.mp4     small, for slow connections

   The HTML always points at the full one. This script decides
   whether to swap in the sd version, using — in order —

     1. Save-Data, if the visitor asked for reduced data
     2. the Network Information API, where the browser has it
        (Chrome, Edge, Android; not Firefox or Safari)
     3. device memory and screen size
     4. how fast the first clip actually downloaded, measured
        with Performance Timing — this works everywhere and is
        the only signal based on reality rather than a guess

   Videos are also fetched one at a time, so a fast scroll
   doesn't start four downloads splitting the same pipe.
   ========================================================= */

(function () {
  const videos = Array.from(document.querySelectorAll("video[data-lazy]"));
  if (!videos.length) return;

  const SD_DIR       = "sd/";
  const SLOW_MBPS    = 3.0;   // measured throughput below this → switch to sd
  const LOAD_TIMEOUT = 9000;

  // ---- poster: foo.mp4 → foo.jpg, unless one is set by hand ----
  videos.forEach((v) => {
    if (!v.getAttribute("poster") && v.getAttribute("src")) {
      v.setAttribute("poster", v.getAttribute("src").replace(/\.mp4(\?.*)?$/, ".jpg"));
    }
  });

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!("IntersectionObserver" in window) || reduced) {
    videos.forEach((v) => { v.controls = true; v.preload = "metadata"; });
    return;
  }

  // ---- pick a starting tier ------------------------------------
  function guessTier() {
    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    if (c && c.saveData) return "sd";                       // explicit user request
    if (c && /^(slow-2g|2g|3g)$/.test(c.effectiveType || "")) return "sd";
    if (c && typeof c.downlink === "number" && c.downlink < 2) return "sd";
    if (navigator.deviceMemory && navigator.deviceMemory <= 2) return "sd";
    if (window.innerWidth < 700) return "sd";               // small screen, small file
    return "full";
  }

  let tier = guessTier();

  function toSd(v) {
    const src = v.getAttribute("src");
    if (!src || src.includes("/" + SD_DIR)) return;
    v.setAttribute("src", src.replace(/([^/]+\.mp4)$/, SD_DIR + "$1"));
  }

  // apply the initial guess to everything before anything loads
  if (tier === "sd") videos.forEach(toSd);

  // ---- measure the first real download, then adapt --------------
  let measured = false;
  function measure(v) {
    if (measured || tier === "sd") return;
    measured = true;
    const url = v.currentSrc || v.src;
    const entry = performance
      .getEntriesByType("resource")
      .filter((e) => e.name === url)
      .pop();
    if (!entry || !entry.transferSize || entry.duration <= 0) return;

    const mbps = (entry.transferSize * 8) / (entry.duration / 1000) / 1e6;
    if (mbps < SLOW_MBPS) {
      tier = "sd";
      // downgrade everything not already loaded
      videos.forEach((other) => {
        if (other !== v && other.preload === "none") toSd(other);
      });
    }
  }

  // ---- one download at a time ----------------------------------
  const queue = [];
  let loading = null;

  function pump() {
    if (loading || !queue.length) return;
    const v = queue.shift();
    if (!v.isConnected) return pump();

    loading = v;
    v.preload = "auto";
    v.load();

    const done = () => {
      v.removeEventListener("canplaythrough", done);
      v.removeEventListener("error", done);
      measure(v);
      loading = null;
      pump();
    };
    v.addEventListener("canplaythrough", done);
    v.addEventListener("error", done);
    setTimeout(() => { if (loading === v) done(); }, LOAD_TIMEOUT);
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const v = entry.target;
        if (entry.isIntersecting) {
          if (v.preload === "none" && !queue.includes(v) && loading !== v) {
            queue.unshift(v);            // what you're looking at goes first
            pump();
          }
          v.play().catch(() => { v.controls = true; });
        } else {
          v.pause();
        }
      }
    },
    { rootMargin: "150px 0px", threshold: 0.2 }
  );

  videos.forEach((v) => io.observe(v));
})();
