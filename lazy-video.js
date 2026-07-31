/* =========================================================
   Play clips only when they're on screen — and only fetch
   one at a time, so a fast scroll on mobile data doesn't
   start four downloads competing for the same bandwidth.

   Also sets a poster automatically: for foo.mp4 it looks for
   foo.jpg alongside it, so you see a frame immediately instead
   of a black rectangle while the video arrives.

   Mark a video with data-lazy and preload="none".
   ========================================================= */

(function () {
  const videos = Array.from(document.querySelectorAll("video[data-lazy]"));
  if (!videos.length) return;

  // poster from the matching .jpg, unless one was set by hand
  videos.forEach((v) => {
    if (!v.getAttribute("poster") && v.src) {
      v.setAttribute("poster", v.src.replace(/\.mp4(\?.*)?$/, ".jpg"));
    }
  });

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!("IntersectionObserver" in window) || reduced) {
    videos.forEach((v) => { v.controls = true; v.preload = "metadata"; });
    return;
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
      v.removeEventListener("canplay", done);
      v.removeEventListener("error", done);
      loading = null;
      pump();
    };
    v.addEventListener("canplay", done);
    v.addEventListener("error", done);

    // never let one stalled file block the rest
    setTimeout(() => { if (loading === v) done(); }, 8000);
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const v = entry.target;
        if (entry.isIntersecting) {
          if (v.preload === "none" && !queue.includes(v) && loading !== v) {
            queue.unshift(v);          // whatever you're looking at goes first
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
