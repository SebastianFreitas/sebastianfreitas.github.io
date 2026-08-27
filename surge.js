/* ===========================================================
   SURGE — what a level looks like.

   Light leaves the level number, runs both ways along the top,
   turns the corners, comes down the sides and closes at the
   bottom. How far it gets is how far you've got: the first one
   dies before the corners, the last one goes all the way round
   and takes the screen with it.

   One animation, played to a fraction of itself.
   Listens for xp:surge. Needs nothing else.
   =========================================================== */

(function () {
  /* This page's claim language IS the motion. Honouring OS
     "reduce motion" here was blanking the surge in Firefox on
     http:// (file:// often reports no preference), so the span
     looked dead next to the same files opened as a document. */
  const RAIL = ["topL", "topR", "sideL", "sideR", "botL", "botR"];

  let root, rails = {}, flash, built = false;

  function build() {
    if (built) return;
    built = true;

    root = document.createElement("div");
    root.className = "surge";
    root.setAttribute("aria-hidden", "true");

    for (const k of RAIL) {
      const el = document.createElement("i");
      el.className = "surge-rail " + k;
      root.appendChild(el);
      rails[k] = el;
    }
    flash = document.createElement("b");
    flash.className = "surge-flash";
    root.appendChild(flash);

    document.body.appendChild(root);
  }

  const easeOut = u => 1 - Math.pow(1 - u, 3);
  const easeIn  = u => u * u * u;

  /* how much of the loop this level is worth */
  function reachFor(level, total, milestone) {
    const p = Math.min(1, Math.max(0, level / Math.max(1, total)));
    let r = 0.12 + 0.88 * p;
    if (milestone) r = Math.min(1, r + 0.14);   // a new rank pushes further
    return r;
  }

  let running = false;

  function play(detail) {
    build();
    if (running) return;
    running = true;

    const level = detail.level || 0;
    const total = detail.total || 1;
    const milestone = !!detail.milestone;
    const complete = level >= total;
    const reachMax = complete ? 1 : reachFor(level, total, milestone);
    const p = Math.min(1, level / Math.max(1, total));

    // start the light under the level number, not at the middle of nowhere
    const chip = document.querySelector(".xp-chip");
    const cx = chip ? chip.getBoundingClientRect().left + chip.getBoundingClientRect().width / 2
                    : innerWidth / 2;
    root.style.setProperty("--surge-x", Math.round(cx) + "px");
    root.classList.add("on");
    if (milestone) root.classList.add("rank");

    const W = innerWidth, H = innerHeight;
    const halfTop = W / 2, side = H, halfBot = W / 2;
    const path = halfTop + side + halfBot;

    const OUT  = 340 + 700 * p;        // travel out
    const HOLD = 70  + 220 * p;        // sit at full reach
    const BACK = 260 + 420 * p;        // and retreat
    let t0 = null;

    function frame(now) {
      if (t0 === null) t0 = now;
      const e = now - t0;
      let reach;

      if (e < OUT)              reach = reachMax * easeOut(e / OUT);
      else if (e < OUT + HOLD)  reach = reachMax;
      else {
        const u = (e - OUT - HOLD) / BACK;
        if (u >= 1) return finish();
        reach = reachMax * (1 - easeIn(u));
      }

      const d = reach * path;
      const top  = Math.min(d, halfTop);
      const down = Math.min(Math.max(0, d - halfTop), side);
      const bot  = Math.min(Math.max(0, d - halfTop - side), halfBot);

      rails.topL.style.width  = rails.topR.style.width  = top.toFixed(1) + "px";
      rails.sideL.style.height = rails.sideR.style.height = down.toFixed(1) + "px";
      rails.botL.style.width  = rails.botR.style.width  = bot.toFixed(1) + "px";

      // the closer it gets to closing the loop, the hotter it burns
      root.style.setProperty("--surge-heat", (0.35 + 0.65 * reach).toFixed(3));

      // the loop actually closing is the only thing that takes the screen
      if (complete && bot >= halfBot - 1 && !flash.dataset.spent) {
        flash.dataset.spent = "1";
        flash.classList.add("go");
        setTimeout(() => flash.classList.remove("go"), 220);
      }
      requestAnimationFrame(frame);
    }

    function finish() {
      for (const k of RAIL) { rails[k].style.width = ""; rails[k].style.height = ""; }
      root.classList.remove("on", "rank");
      delete flash.dataset.spent;
      running = false;
    }

    requestAnimationFrame(frame);
  }

  document.addEventListener("xp:surge", e => play(e.detail || {}));
  window.Surge = { play, reachFor };
})();
