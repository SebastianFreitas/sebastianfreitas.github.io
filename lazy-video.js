/* =========================================================
   Play clips only when they're on screen.

   Five autoplaying videos on one page means the browser
   downloads all five before the visitor has scrolled to any
   of them. This starts each one when it enters the viewport
   and pauses it when it leaves.

   Mark a video with data-lazy and preload="none".
   ========================================================= */

(function () {
  const videos = document.querySelectorAll("video[data-lazy]");
  if (!videos.length) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // No IntersectionObserver (very old browser): just show controls and stop.
  if (!("IntersectionObserver" in window)) {
    videos.forEach((v) => { v.controls = true; v.preload = "metadata"; });
    return;
  }

  // Reduced motion: don't autoplay anything, give the visitor a play button.
  if (reduced) {
    videos.forEach((v) => { v.controls = true; v.preload = "metadata"; });
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const v = entry.target;
        if (entry.isIntersecting) {
          if (v.preload === "none") v.preload = "auto";
          v.play().catch(() => { v.controls = false; });  // autoplay blocked
        } else {
          v.pause();
        }
      }
    },
    { rootMargin: "200px 0px", threshold: 0.25 }
  );

  videos.forEach((v) => io.observe(v));
})();
