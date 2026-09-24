/* js/bridge/bridge-input.js — burn the voidship toward the pointer, and the minimap readout */
(function () {
  const B = window.Bridge;
  if (!B) return;
  const {
    host, cursor, rotateEl, portraitQ, CAM,
    scale, markScreen, activeMarks, begin, resize, startLoop,
  } = B;

  /* ---- input: burn the voidship toward the pointer ----------
     Click empty space or a beacon to set course. Hold to keep
     the throttle open (speed builds). Release and the drive
     brakes onto the mark. Beacons file on hull contact.
  --------------------------------------------------------- */
  const DRAG_PAR = 0.94;
  const worldPerPx = () => 1 / (scale() * DRAG_PAR);

  function markAt(clientX, clientY) {
    const r = B.hostBox();
    const px = clientX - r.left, py = clientY - r.top;
    let best = null, bestD = B.HIT;
    for (const m of activeMarks()) {
      if (m.fly) continue;
      const p = markScreen(m);
      const d = Math.hypot(px - p.x, py - p.y);
      if (d < bestD) { best = m; bestD = d; }
    }
    return best;
  }
  B.markAt = markAt;

  function clientToCourse(clientX, clientY) {
    const r = B.hostBox();
    const px = clientX - r.left;
    const py = clientY - r.top;
    const worldX = B.camX + (px - B.W * 0.5) * worldPerPx();
    const mid = B.H * 0.42;
    const band = B.H * ((window.Voidship && Voidship.BASE.yBand) || 0.16);
    const screenY = Math.min(mid + band, Math.max(mid - band, py));
    return { worldX, screenY, px, py };
  }
  B.clientToCourse = clientToCourse;

  /* beacons are drawn at m.x (parallax), not m.cam — course must match
     the light on screen or the ship peels off toward the wrong seat. */
  function courseForMark(m) {
    const mid = B.H * 0.42;
    const band = B.H * ((window.Voidship && Voidship.BASE.yBand) || 0.24);
    // prefer the true beacon seat; clamp only if it sits outside the band
    const rawY = m.oy * B.H;
    const screenY = Math.min(mid + band, Math.max(mid - band, rawY));
    return { worldX: m.x, screenY };
  }
  B.courseForMark = courseForMark;

  function stopSteering() { if (cursor) cursor.classList.remove("on"); }
  B.stopSteering = stopSteering;

  B.thrustId = null;
  let lastPtr = { x: 0, y: 0 };
  let downPtr = { x: 0, y: 0 };   // where the hold began
  const DRAG_LOCK = 12;           // px the pointer must travel from the press before a move can lock a beacon
  const TAP_MS = 320;             // a press shorter than this on nothing is a tap, and a tap dismisses a note
  let burnAt = 0;                 // when the current hold began
  let burnLocked = false;         // the current hold locked a beacon at some point
  B.fuelWarned = false;
  B.courseArmAt = 0; // ignore contact briefly after locking a course

  function beginBurn(e, mark) {
    if (!B.ship) return;
    begin();
    B.clearMark();
    lastPtr.x = e.clientX;
    lastPtr.y = e.clientY;
    downPtr.x = e.clientX;
    downPtr.y = e.clientY;
    burnAt = performance.now();
    burnLocked = !!mark;
    const c = clientToCourse(e.clientX, e.clientY);
    if (mark) {
      const seat = courseForMark(mark);
      Voidship.setCourse(B.ship, seat.worldX, seat.screenY, mark);
      B.courseArmAt = performance.now() + 180; // ship must actually move in
      B.log.push(`course: ${mark.name.toLowerCase()}`, "loc");
      B.hintDone("beacon");
    } else {
      Voidship.setCourse(B.ship, c.worldX, c.screenY, null);
      B.courseArmAt = 0;
      B.hintDone("burn");
    }
    Voidship.setThrusting(B.ship, true);
    B.thrustId = e.pointerId;
    host.classList.add("burning");
    try { host.setPointerCapture(e.pointerId); } catch (err) {}
  }
  B.beginBurn = beginBurn;

  function endBurn(e) {
    if (B.thrustId == null) return;
    if (e && e.pointerId != null && e.pointerId !== B.thrustId) return;
    B.thrustId = null;
    host.classList.remove("burning");
    if (B.ship) {
      Voidship.setThrusting(B.ship, false);
    }
    // a tap on nothing with almost no burn dismisses a note; a hold that
    // locked a beacon, or ran long, leaves the note it may have just opened
    if (B.ship && B.ship.arrived && !burnLocked && performance.now() - burnAt < TAP_MS) B.clearMark();
  }
  B.endBurn = endBurn;

  /* while the pointer is held, re-plant the course every frame: a locked
     beacon keeps its true seat, and a free hold reads the pointer as a
     stick — the ship flies toward it, faster the further it sits from
     the hull. Release stops on the point when it can, otherwise it
     halts where it is (see Voidship.setThrusting). */
  function retargetFromPointer() {
    if (!B.ship || B.thrustId == null || !B.ship.thrusting) return;
    if (B.ship.courseMark) {
      const seat = courseForMark(B.ship.courseMark);
      Voidship.setCourse(B.ship, seat.worldX, seat.screenY, B.ship.courseMark);
      return;
    }
    const c = clientToCourse(lastPtr.x, lastPtr.y);
    Voidship.setCourse(B.ship, c.worldX, c.screenY, null);
  }
  B.retargetFromPointer = retargetFromPointer;

  host.addEventListener("pointerdown", e => {
    if (B.frozen || B.xswitch || document.body.classList.contains("site-frozen")) return;
    // note panels scroll and hold clips, so a press inside one belongs to the panel, not a burn
    if (e.target.closest && e.target.closest("a, button, #bridge-map, #bridge-term, #bridge-sys, #bridge-log, .bnote")) return;
    if (B.sceneMode === "gamedev") {
      const r = B.hostBox();
      if (Forge.hit(e.clientX - r.left, e.clientY - r.top)) return;   // a press on a panel is a button, not a burn
    }
    const m = markAt(e.clientX, e.clientY);
    beginBurn(e, m);
  });

  addEventListener("pointermove", e => {
    const r = B.hostBox();
    const inside = e.clientY >= r.top && e.clientY <= r.bottom;

    if (cursor) {
      if (inside || B.thrustId != null) {
        cursor.classList.add("on");
        cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      } else cursor.classList.remove("on");
    }

    if (B.thrustId != null && e.pointerId === B.thrustId && B.ship) {
      // a beacon only becomes the course when the pointer is dragged onto it:
      // the press must have travelled DRAG_LOCK px, and the previous pointer
      // spot must be off the beacon (the world scrolling under a still pointer
      // does not count). A beacon already locked keeps its lock.
      const m = markAt(e.clientX, e.clientY);
      const dragged = Math.hypot(e.clientX - downPtr.x, e.clientY - downPtr.y) >= DRAG_LOCK;
      const entered = m && m !== B.ship.courseMark && dragged && markAt(lastPtr.x, lastPtr.y) !== m;
      lastPtr.x = e.clientX;
      lastPtr.y = e.clientY;
      if (m && (m === B.ship.courseMark || entered)) {
        if (B.ship.courseMark !== m) B.courseArmAt = performance.now() + 180;
        burnLocked = true;
        const seat = courseForMark(m);
        Voidship.setCourse(B.ship, seat.worldX, seat.screenY, m);
      } else if (!B.ship.courseMark) {
        const c = clientToCourse(e.clientX, e.clientY);
        Voidship.setCourse(B.ship, c.worldX, c.screenY, null);
      }
      return;
    }

    if (!inside) { B.hoverMark = null; if (cursor) cursor.classList.remove("over"); return; }
    B.hoverMark = markAt(e.clientX, e.clientY);
    if (cursor) cursor.classList.toggle("over", !!B.hoverMark || (B.sceneMode === "gamedev" && Forge.over(e.clientX - r.left, e.clientY - r.top)));
  }, { passive: true });

  addEventListener("pointerup", endBurn);
  addEventListener("pointercancel", () => { endBurn(); stopSteering(); });
  document.documentElement.addEventListener("mouseleave", stopSteering);
  addEventListener("blur", () => { endBurn(); stopSteering(); });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { endBurn(); stopSteering(); }
    else startLoop();
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(es => {
      B.visible = es[0].isIntersecting;
      if (!B.visible) { endBurn(); stopSteering(); }
      else startLoop();
    }, { threshold: 0.02 }).observe(host);
  }

  /* Rotating out of portrait: the hero has a new size and a loop to restart.
     Rotating in: drop any burn or steer in progress so nothing is still held
     down behind the notice. */
  const onPortrait = e => {
    B.portrait = e.matches;
    if (rotateEl) rotateEl.setAttribute("aria-hidden", String(!B.portrait));
    if (B.portrait) { endBurn(); stopSteering(); }
    else { resize(); startLoop(); }
  };
  if (portraitQ.addEventListener) portraitQ.addEventListener("change", onPortrait);
  else portraitQ.addListener(onPortrait);

  /* ---- minimap: readout only — no jump, no scrub ---- */
  const track = document.getElementById("btrack");
  const trackLabels = document.querySelectorAll("#bridge-map .labels span");

  function rebuildTrack() {
    if (!track) return;
    track.classList.add("readonly");
    track.querySelectorAll(".mk").forEach(el => el.remove());
    for (const m of activeMarks()) {
      const d = document.createElement("div");
      d.className = "mk poi";
      d.style.left = ((m.cam - CAM.min) / (CAM.max - CAM.min) * 100) + "%";
      d.title = m.name;
      d.dataset.mark = m.id;
      const done = !!(window.XP && XP.has("beacon-" + m.id));
      if (done) d.classList.add("read");
      track.appendChild(d);
    }
    for (let i = 0; i < 30; i++) {
      const d = document.createElement("div");
      d.className = "mk"; d.style.left = (i / 29 * 100) + "%";
      track.appendChild(d);
    }
  }
  B.rebuildTrack = rebuildTrack;
  rebuildTrack();
  if (track) {
    // ghost follows the pointer for orientation, but never moves the camera
    track.addEventListener("pointermove", e => {
      const ghost = document.getElementById("bghost");
      if (!ghost) return;
      const r = track.getBoundingClientRect();
      ghost.style.left = Math.min(100, Math.max(0, (e.clientX - r.left) / r.width * 100)) + "%";
    });
  }
  document.addEventListener("xp:award", e => {
    if (!track || !/^beacon-/.test(e.detail.id)) return;
    const id = e.detail.id.replace(/^beacon-/, "");
    const d = track.querySelector(`[data-mark="${id}"]`);
    if (d) d.classList.add("read");
  });

  function syncLabels() {
    if (trackLabels.length < 2) return;
    if (B.sceneMode === "gamedev") {
      trackLabels[0].textContent = "West · Sector Zero";
      trackLabels[1].textContent = "East · Conclusus";
    } else {
      trackLabels[0].textContent = "West · the future";
      trackLabels[1].textContent = "East · the past";
    }
  }
  B.syncLabels = syncLabels;
})();
