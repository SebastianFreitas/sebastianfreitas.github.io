/* The page darkness, homepage only: one page-high gradient behind all content, placed in page coordinates. It starts at the top of #work in the
   colour of the bridge's bottom edge (TOP, measured) so the bridge runs on into the page, and darkens to the boxes' own black (BOX, rgb(4,4,5))
   so the boxes meld into the page; it never goes darker than the boxes. "reach" (0..1) is where BOX is reached, as a share of the way from the top
   of Work to the top of the footer; the rest of the page stays BOX. Still: no scroll listener, recomputed on load and resize.
   With ?bg=1 in the URL a small owner panel tunes it live and keeps it in localStorage "bgTune2"; without the flag the default is used. */
(function () {
  const root = document.querySelector(".creep");
  if (!root) return;
  const work = document.querySelector("#work"), exp = document.querySelector("#experience"), foot = document.querySelector("footer.xp-foot");
  const tune = /[?&]bg=1(&|$)/.test(location.search);
  const TOP = [15, 18, 23], BOX = [4, 4, 5];                /* bridge bottom edge (#0f1217), the boxes' black */
  const D = { reach: 1 };                                   /* owner's pick 2026-11-18: box black at the footer */
  const S = { reach: D.reach };
  if (tune) {
    try {
      const v = JSON.parse(localStorage.getItem("bgTune2") || "null");
      if (v && isFinite(v.reach)) S.reach = Math.max(0, Math.min(1, +v.reach));
    } catch (e) {}
  }
  function rgb(c) { return "rgb(" + c.join(",") + ")"; }

  function place() {
    if (!work || !exp || !foot) return;
    const y = window.scrollY, r = function (el) { const b = el.getBoundingClientRect(); return { top: b.top + y, bottom: b.bottom + y }; };
    const w = r(work), f = r(foot), end = f.bottom, at = w.top + (f.top - w.top) * S.reach;
    root.style.height = end + "px";
    /* fade in over the last 400 px of the bridge, bridge colour at the top of Work, the boxes' black from "at" down */
    root.style.background = "linear-gradient(180deg, transparent " + (w.top - 400) + "px, " + rgb(TOP) + " " + w.top + "px, " + rgb(BOX) + " " + Math.max(w.top + 1, at) + "px, " + rgb(BOX) + " " + end + "px)";
    root.style.visibility = "visible";
  }

  function panel() {
    const p = document.createElement("div");
    p.style.cssText = "position:fixed;right:14px;bottom:14px;z-index:99999;width:200px;padding:10px 12px;background:#0b0e11;border:1px solid rgba(240,230,210,.25);color:#f0e6d2;font:11px/1.4 'IBM Plex Mono',monospace;letter-spacing:.04em";
    p.innerHTML = '<label style="display:block">Box dark reached at<input data-k="reach" type="range" min="0" max="1" step="0.01" style="width:100%"></label>' +
      '<div data-o style="margin-top:6px"></div>';
    const out = p.querySelector("[data-o]");
    function show() {
      p.querySelector('[data-k="reach"]').value = S.reach;
      out.textContent = "reach " + S.reach.toFixed(2) + " (0 = top of Work, 1 = footer)";
    }
    p.addEventListener("input", function (ev) {
      S[ev.target.getAttribute("data-k")] = +ev.target.value;
      try { localStorage.setItem("bgTune2", JSON.stringify(S)); } catch (e) {}
      show(); place();
    });
    show(); document.body.appendChild(p);
  }

  let timer = 0;
  window.addEventListener("load", place);
  window.addEventListener("resize", function () { clearTimeout(timer); timer = setTimeout(place, 200); });
  if (window.ResizeObserver) {
    let h = document.body.offsetHeight;
    new ResizeObserver(function () {
      if (document.body.offsetHeight !== h) { h = document.body.offsetHeight; place(); }
    }).observe(document.body);
  }
  place();
  if (tune) panel();
  window.Creep = { place: place };
})();
