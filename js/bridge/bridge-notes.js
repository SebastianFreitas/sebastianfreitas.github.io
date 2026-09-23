/* js/bridge/bridge-notes.js — the note panels and the one-time hint */
(function () {
  const B = window.Bridge;
  if (!B) return;
  const { host, MARKS, PLANETS, HL_MARK } = B;
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
    }
    if (!mark) return;
    const el2 = noteEls[mark.id];
    if (!el2) return;
    noteTimer = setTimeout(() => {
      measureNote(el2);
      placeNote(el2, mark);
      el2.classList.add("show");
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
    const pad = 22, edge = 20;
    const right = p.x + pad + pw < B.W - edge;
    let left = right ? p.x + pad : p.x - pad - pw;
    left = Math.min(B.W - pw - edge, Math.max(edge, left));
    let top = p.y - ph * 0.45;
    top = Math.min(B.H - ph - edge, Math.max(edge + 40, top));
    left = Math.round(left); top = Math.round(top);
    if (el2._left !== left) { el2.style.left = left + "px"; el2._left = left; }
    if (el2._top  !== top)  { el2.style.top  = top + "px";  el2._top  = top; }
    el2.classList.toggle("from-left", !right);
  }
  B.placeNote = placeNote;

  /* claiming fires when the voidship reaches the beacon — both sectors
     file the same way. In the game dev sector, filing one can bring
     more into range. */
  function selectMark(m) {
    B.begin();
    hintDone("beacon");
    if (!(window.XP && XP.has("beacon-" + m.id))) m.pop = 1;
    if (window.XP) {
      const p = B.markScreen(m), r = hostBox();
      XP.award("beacon-" + m.id, m.xp, m.name, r.left + p.x, r.top + p.y);
      if (m.id === "bnote-vs-bench") Forge.unlock("bench");
      else if (m.id === "bnote-vs-map") Forge.unlock("console");
    }
    // reaching HeavyLight or any of its depth nodes drops a crate into the lamp's beam
    if (window.Zones && HL_MARK && (m === HL_MARK || m.root === HL_MARK.id)) Zones.dropCrate();
    if (B.sceneMode === "gamedev") {
      B.log.push(`docking: ${m.name.toLowerCase()} +${m.xp}`, "good");
    } else {
      B.log.push(`filed: ${m.name.toLowerCase()} +${m.xp}`, "good");
    }
    B.revealDepths(true);
    B.activeMark = m;
    showNote(m);
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
