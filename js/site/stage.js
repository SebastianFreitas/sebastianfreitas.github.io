/* The stage: Work + Experience are laid out at one 1600px design width and zoomed evenly by s = clamp(window / 1600, 0.75, 1.2) (css .stage).
   Below 1200px nothing is scaled and s is 1. Rects read from the page are in screen px under the zoom: divide by Stage.s() to get design px. */
(function () {
  const DW = 1600, root = document.documentElement;
  let s = 1;
  function set() {
    s = window.innerWidth >= 1200 ? Math.min(1.2, root.clientWidth / DW) : 1;   /* no 0.75 floor: from 1200 to 1215 the scrollbar leaves under 1200 and the stage must still fit */
    root.style.setProperty("--stage-s", s.toFixed(4));
  }
  set();
  window.addEventListener("resize", set);
  window.Stage = { s: function () { return s; } };
})();
