/* js/bridge/bridge-notes.js — the note panels and the one-time hint */
(function () {
  const B = window.Bridge;
  if (!B) return;
  const { host, MARKS, PLANETS } = B;
  const { fmt } = Util;

  /* ---- notes ---- */
  const noteEls = {};
  B.noteEls = noteEls;
  MARKS.concat(PLANETS).forEach(m => noteEls[m.id] = document.getElementById(m.id));
  const noteCat = document.getElementById("bnote-cat");
  let noteTimer = null;

  /* the hero's page box, read once per layout change instead of per frame
     or per pointer event */
  let hostRect = null;
  function hostBox() {
    return hostRect || (hostRect = host.getBoundingClientRect());
  }
  B.hostBox = hostBox;
  const dropHostRect = () => { hostRect = null; };
  addEventListener("resize", dropHostRect);
  addEventListener("scroll", dropHostRect, { passive: true, capture: true });
  addEventListener("load", dropHostRect);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(dropHostRect);
  if ("ResizeObserver" in window) new ResizeObserver(dropHostRect).observe(host);

  /* a closed panel must not keep a clip decoding or a WebGL build running */
  function stopNoteMedia(el2) {
    el2.querySelectorAll("video").forEach(v => { if (!v.paused) v.pause(); });
    if (window.Embed) Embed.reset(el2);
  }
  function showNote(mark) {
    clearTimeout(noteTimer);
    for (const k in noteEls) {
      const e = noteEls[k];
      if (e && e.classList.contains("show") && k !== (mark && mark.id)) stopNoteMedia(e);
      if (e) e.classList.remove("show");
      if (e && e._red) e._red.classList.remove("show");
    }
    if (!mark) return;
    const el2 = noteEls[mark.id];
    if (!el2) return;
    noteTimer = setTimeout(() => {
      if (BEACON_SEGMENT[mark.id]) paintReplay(mark.id);
      measureNote(el2);
      placeNote(el2, mark);
      el2.classList.add("show");
      /* the red pieces ride the plate's edge at the size it opened at; they sit beside the note (its clip and scroll would cut them) */
      if (window.RedLines && RedLines.draw(el2, { self: true, host: el2.parentNode, kind: "item" })) el2._red.classList.add("show");
      el2.querySelectorAll("video").forEach(v => { v.play().catch(() => {}); });
      if (mark.id === "bnote-land" && noteCat) noteCat.textContent = fmt(B.catalogued);
    }, 280);
  }
  B.showNote = showNote;
  /* offsetWidth/Height force layout; the panel only changes size on a
     resize or when it opens, so it's measured then */
  function measureNote(el2) {
    el2._pw = el2.offsetWidth || 380;
    el2._ph = el2.offsetHeight || 260;
  }
  B.measureNote = measureNote;
  addEventListener("resize", () => {
    for (const k in noteEls) if (noteEls[k]) measureNote(noteEls[k]);
  });
  /* put the panel next to the beacon it belongs to, on whichever side
     has room, clamped so it never leaves the hero */
  function placeNote(el2, mark) {
    if (!el2 || !mark) return;
    if (B.sheet) {
      /* CSS owns the position now; clear ours or the stale inline left/top
         would keep winning over the sheet rule. */
      if (el2._left != null) {
        el2.style.left = ""; el2.style.top = "";
        el2._left = null; el2._top = null;
      }
      el2.classList.remove("from-left");
      return;
    }
    if (el2._pw == null) measureNote(el2);
    const p = B.markScreen(mark);
    const pw = el2._pw, ph = el2._ph;
    const pad = 50, edge = 20;   // clear of the beacon's hover label
    /* the right instrument bank is painted over the hero's right edge: the plate ends left of it */
    const bankW = parseFloat(host.style.getPropertyValue("--inst-w")) || 0;
    const rMax = B.W - bankW - edge;
    let gap = pad, right = p.x + pad + pw < rMax;
    if (!right && p.x - pad - pw < edge) {
      /* neither side fits: take the one with more room and drop the pad, so the plate sits as clear of the beacon as it can */
      right = rMax - p.x >= p.x - edge;
      gap = 0;
    }
    let left = right ? p.x + gap : p.x - gap - pw;
    left = Math.min(rMax - pw, Math.max(edge, left));
    let top = p.y - ph * 0.45;
    /* torn on all four sides: stay a tear-depth clear of the top bar and the bottom edge */
    const topMin = 100, botGap = 28;
    top = Math.min(B.H - ph - botGap, Math.max(topMin, top));
    /* keep off the HUD prompt: slide above it (or below) when the two overlap */
    const hr = hintEl && !hintEl.classList.contains("retired") ? hintEl.getBoundingClientRect() : null;
    if (hr && hr.width && left < hr.right + 12 && left + pw > hr.left - 12 && top < hr.bottom + 12 && top + ph > hr.top - 12) {
      if (hr.top - 14 - ph >= topMin) top = hr.top - 14 - ph;
      else if (hr.bottom + 14 + ph <= B.H - botGap) top = hr.bottom + 14;
      else if (hr.right + 14 + pw < rMax) left = hr.right + 14;
      else left = Math.max(edge, Math.min(rMax - pw, hr.left - 14 - pw));
    }
    left = Math.round(left); top = Math.round(top);
    if (el2._left !== left) { el2.style.left = left + "px"; el2._left = left; if (el2._red) el2._red.style.left = left + "px"; }
    if (el2._top  !== top)  { el2.style.top  = top + "px";  el2._top  = top; if (el2._red) el2._red.style.top = top + "px"; }
    el2.classList.toggle("from-left", !right);
  }
  B.placeNote = placeNote;

  /* beacon id -> the Genesis segment its first claim plays; later claims add a row */
  const BEACON_SEGMENT = { "bnote-void": "birth", "bnote-root": "root", "bnote-rex": "rex", "bnote-rex-valkhar": "valkhar" };
  B.beaconSegment = BEACON_SEGMENT;   // marks.js reads the keys: these beacons get the cutscene ring
  /* depth-node notes (Valkhar) are built later, so the row is made on first paint too */
  function addReplay(id) {
    const note = noteEls[id];
    if (!note || note._replay) return;
    const a = document.createElement("a");
    a.className = "type-action";
    a.href = "#";
    a.textContent = "Watch again";
    a.addEventListener("click", e => {
      e.preventDefault();
      if (window.Genesis) Genesis.playScene(BEACON_SEGMENT[id]);
    });
    const p = document.createElement("p");
    p.className = "body";
    p.hidden = true;
    p.appendChild(a);
    note.appendChild(p);
    note._replay = p;
  }
  Object.keys(BEACON_SEGMENT).forEach(addReplay);
  /* the replay control shows once the segment has been seen */
  function paintReplay(id) {
    addReplay(id);
    const p = noteEls[id] && noteEls[id]._replay;
    if (p) p.hidden = !(window.Genesis && Genesis.segmentSeen(BEACON_SEGMENT[id]));
  }

  /* claiming fires when the voidship reaches the beacon — both sectors
     file the same way. In the game dev sector, filing one can bring
     more into range. */
  let segWaiting = false;
  function selectMark(m) {
    B.begin();
    hintDone("beacon");
    if (!(window.XP && XP.has("beacon-" + m.id))) m.pop = 1;
    if (window.XP) {
      const p = B.markScreen(m), r = hostBox();
      XP.award("beacon-" + m.id, m.xp, m.name, r.left + p.x, r.top + p.y);
    }
    B.log.push(`filed: ${m.name.toLowerCase()} +${m.xp}`, "good");
    B.revealDepths(true);
    B.activeMark = m;
    const segId = BEACON_SEGMENT[m.id];
    if (segId && window.Genesis && !Genesis.segmentSeen(segId)) {
      // the note waits for the segment to end, so it never flashes behind it
      if (!segWaiting) {
        segWaiting = true;
        const open = e => {
          if (!e.detail || e.detail.segment !== segId) return;
          document.removeEventListener("site:genesis-done", open);
          segWaiting = false;
          // the scene switch on finish clears the mark; reclaim it for the note
          B.activeMark = m;
          B.camX = m.cam;     // and the camera too: it was reset to the Bridge, and the note closes when far
          showNote(m);
        };
        const go = () => {
          document.addEventListener("site:genesis-done", open);
          if (!Genesis.playScene(segId)) { document.removeEventListener("site:genesis-done", open); segWaiting = false; showNote(m); }
        };
        // let the XP ceremony land first, then a beat, before the cutscene fades in
        const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduced || !window.XP || !XP.busy) go();
        else {
          let fired = false;
          const beat = () => {
            if (fired) return;
            fired = true;
            window.removeEventListener("xp:ceremony-done", beat);
            setTimeout(go, 500);
          };
          window.addEventListener("xp:ceremony-done", beat);
          setTimeout(beat, 4500);
        }
      }
    } else {
      showNote(m);
    }
    if (B.ship) {
      Voidship.setThrusting(B.ship, false);
      Voidship.clearCourse(B.ship);
      // a real stop, not just the mirrored HUD value — otherwise residual
      // ship.vel survives the claim and the hull keeps drifting for a beat
      B.ship.vel = 0;
      B.ship.vy = 0;
    }
    B.vel = 0;
  }
  B.selectMark = selectMark;
  function clearMark() { if (B.activeMark) { B.activeMark = null; showNote(null); } }
  B.clearMark = clearMark;

  /* ---- the hint: names one thing at a time, then goes away ---- */
  const HINT_KEY = Util.KEYS.HINTS;
  const HINT_STEPS = [
    { id: "burn",   text: "Hold anywhere to burn the voidship toward it" },
    { id: "beacon", text: "Click a beacon to set course — contact files it" },
    { id: "fuel",   text: "Fuel refills when you stop burning" },
  ];
  const hintEl = document.getElementById("bridge-hint");
  let hintsDone = {};
  try { hintsDone = JSON.parse(Util.read(localStorage, HINT_KEY) || "{}"); } catch (e) {}

  function paintHint() {
    if (!hintEl) return;
    const next = HINT_STEPS.find(h => !hintsDone[h.id]);
    if (!next) { hintEl.classList.add("retired"); return; }
    if (hintEl.textContent !== next.text) {
      hintEl.classList.add("fading");
      setTimeout(() => { hintEl.textContent = next.text; hintEl.classList.remove("fading"); }, 260);
    }
  }
  function hintDone(id) {
    if (hintsDone[id]) return;
    hintsDone[id] = true;
    Util.write(localStorage, HINT_KEY, JSON.stringify(hintsDone));
    paintHint();
  }
  B.hintDone = hintDone;
  paintHint();
})();
