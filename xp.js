/* ===========================================================
   ARCANIS — provisional entry.

   Libertech counts everything it finds. A visitor arrives
   unfiled, gets a provisional number, and rises a level for
   each thing they actually go and look at.

   Shared across every page. Include it before any script that
   calls XP.award().
   =========================================================== */

window.XP = (function () {
  const KEY = "arcanis.profile.v1";
  /* every level the site currently has to give — the underline under the
     top bar reads against this, so raising it is a one-line change */
  const TOTAL = 19;

  const FIRST = ["Unfiled", "Provisional", "Uncounted", "Late", "Second",
                 "Marginal", "Absent", "Recovered", "Partial", "Quiet"];
  const ROLE  = ["Surveyor", "Registrar", "Witness", "Clerk", "Auditor",
                 "Cartographer", "Reader", "Census Hand", "Tallyman", "Scribe"];

  function newName() {
    const a = FIRST[Math.floor(Math.random() * FIRST.length)];
    const b = ROLE[Math.floor(Math.random() * ROLE.length)];
    const n = Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase().padStart(4, "0");
    return { name: `${a} ${b}`, ref: n };
  }

  let state, fresh = false;
  try {
    // http:// and file:// store profiles separately — ?reset=1 clears
    // the one for this origin so claim animations can be re-tested
    if (/(?:[?&])reset(?:=1)?(?:&|$)/.test(location.search))
      localStorage.removeItem(KEY);
    const raw = localStorage.getItem(KEY);
    if (raw) state = JSON.parse(raw);
  } catch (e) { /* storage unavailable — run for this session only */ }

  if (!state || typeof state.level !== "number") {
    const n = newName();
    state = { name: n.name, ref: n.ref, level: 0, claimed: {} };
    fresh = true;
  }
  if (!state.claimed) state.claimed = {};

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  /* ---- rank: the badge changes shape as the level climbs ---- */
  const RANKS = [
    { at: 0,  key: "dot",      d: "M12 9.6a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8z" },
    { at: 1,  key: "triangle", d: "M12 3 22 20H2z" },
    { at: 10, key: "square",   d: "M4 4h16v16H4z" },
    { at: 20, key: "squircle", d: "M12 3c7 0 9 2 9 9s-2 9-9 9-9-2-9-9 2-9 9-9z" },
    { at: 30, key: "circle",   d: "M12 2.6A9.4 9.4 0 1 0 12 21.4 9.4 9.4 0 0 0 12 2.6z" },
    { at: 40, key: "star",     d: "M12 1.8l3.1 6.9 7.5.8-5.6 5 1.6 7.4-6.6-3.8-6.6 3.8 1.6-7.4-5.6-5 7.5-.8z" },
  ];
  const rankFor = lv => RANKS.slice().reverse().find(r => lv >= r.at) || RANKS[0];
  function rankProgress(lv) {
    const i = RANKS.findIndex(r => lv < r.at);
    if (i === -1) return { u: (lv % 10) / 10, next: null };
    const prev = i > 0 ? RANKS[i - 1].at : 0;
    return { u: (lv - prev) / (RANKS[i].at - prev), next: RANKS[i].at };
  }
  const MILESTONES = new Set(RANKS.map(r => r.at).filter(n => n > 0));

  /* ---- the chip ---- */
  let chip, chipLevel, chipName, chipFill, chipBadge, chipPath;
  function buildChip() {
    if (chip) return;
    chip = document.createElement("div");
    chip.className = "xp-chip";
    chip.innerHTML =
      '<span class="xp-badge">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d=""/></svg>' +
      '</span>' +
      '<span class="xp-lv">LEVEL <b>0</b></span>' +
      '<span class="xp-track"><i></i></span>' +
      '<span class="xp-ref"></span>';
    // the level belongs to the whole site, so it lives in the top bar
    const slot = document.getElementById("xp-slot");
    if (slot) slot.appendChild(chip);
    else { chip.classList.add("floating"); document.body.appendChild(chip); }

    chipName  = chip.querySelector(".xp-ref");
    chipLevel = chip.querySelector(".xp-lv b");
    chipFill  = chip.querySelector(".xp-track i");
    chipBadge = chip.querySelector(".xp-badge");
    chipPath  = chip.querySelector(".xp-badge path");
    if (!chipName || !chipLevel || !chipFill) return;   // markup changed under us
    paint();
  }

  function paint(levelOverride, fillOverride) {
    if (!chip || !chipName || !chipLevel || !chipFill) return;
    const lv = levelOverride == null ? state.level : levelOverride;
    chipName.textContent = state.name + " · " + state.ref;
    chipLevel.textContent = lv;
    const rk = rankFor(lv);
    if (chipPath && chipBadge && chip.dataset.rank !== rk.key) {
      const first = !chip.dataset.rank;
      chip.dataset.rank = rk.key;
      if (first) chipPath.setAttribute("d", rk.d);
      else {
        // the old shape leaves before the new one arrives
        chipBadge.classList.add("swapping");
        setTimeout(() => {
          chipPath.setAttribute("d", rk.d);
          chipBadge.classList.remove("swapping");
          chipBadge.classList.add("arrived");
          setTimeout(() => chipBadge.classList.remove("arrived"), 520);
        }, 220);
      }
    }
    // the chip bar is the level being earned right now, nothing more
    chipFill.style.width = ((fillOverride == null ? 0 : fillOverride) * 100) + "%";

    // everything earned so far rides quietly as the top bar's underline
    document.documentElement.style.setProperty("--xp-progress",
      (Math.min(1, lv / TOTAL) * 100).toFixed(2) + "%");
  }

  /* =========================================================
     THE CLAIM

     Everything holds still, the level flies from wherever it was
     taken up to the chip, and the track fills — slow at first,
     then snapping shut. Crossing into a new rank gets a longer
     version and the badge changes shape.
     ========================================================= */

  const freeze = on =>
    document.dispatchEvent(new CustomEvent("xp:freeze", { detail: { on } }));

  const easeIn  = u => u * u * u * u;                    // slow, then sharp
  const easeOut = u => 1 - Math.pow(1 - u, 3);

  let ceremonyBusy = false;

  function ceremony(n, label, x, y, fromLevel) {
    if (!chip) { paint(); return; }
    const toLevel = fromLevel + n;
    const milestone = MILESTONES.has(toLevel) ||
                      Math.floor(fromLevel / 10) !== Math.floor(toLevel / 10);

    ceremonyBusy = true;
    freeze(true);

    // whatever happens next, the world starts again
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      ceremonyBusy = false;
      freeze(false);
    };
    setTimeout(release, (milestone ? 1250 : 820) + (milestone ? 1150 : 780) + 1500);
    paint(fromLevel, 0);          // the run-up always starts empty

    const target = chip.getBoundingClientRect();
    const tx = target.left + target.width * 0.5;
    const ty = target.top + target.height * 0.5;
    const sx = typeof x === "number" ? x : tx;
    const sy = typeof y === "number" ? y : ty - 60;

    // the token that carries it
    const mote = document.createElement("div");
    mote.className = "xp-mote";
    mote.innerHTML = `<b>+${n}</b>`;
    document.body.appendChild(mote);

    const tag = document.createElement("div");
    tag.className = "xp-tag";
    tag.textContent = label || "";
    tag.style.left = sx + "px"; tag.style.top = sy + "px";
    if (label) document.body.appendChild(tag);
    requestAnimationFrame(() => tag.classList.add("go"));

    const FLY = milestone ? 1150 : 780;
    const FILL = milestone ? 1250 : 820;
    const arcX = (sx + tx) / 2;
    const arcY = Math.min(sy, ty) - 130;      // lifts before it lands

    let t0 = null;
    function fly(now) {
      if (t0 === null) t0 = now;
      const u = Math.min(1, (now - t0) / FLY);
      const e = easeOut(u);
      const iv = 1 - e;
      const px = iv * iv * sx + 2 * iv * e * arcX + e * e * tx;
      const py = iv * iv * sy + 2 * iv * e * arcY + e * e * ty;
      mote.style.transform =
        `translate(${px}px, ${py}px) translate(-50%,-50%) scale(${1 + (1 - e) * 0.9})`;
      mote.style.opacity = u > 0.86 ? String((1 - u) / 0.14) : "1";
      if (u < 1) return requestAnimationFrame(step2);
      mote.remove(); tag.remove(); fill();
    }
    const step2 = now2 => { try { fly(now2); } catch (e) { console.warn("claim:", e); release(); } };
    requestAnimationFrame(step2);

    function fill() {
      chip.classList.add("landing");
      if (milestone) chip.classList.add("rankup");

      /* one sweep of the bar per level gained: it fills to the top, and
         only at the moment it's full does the number turn over */
      const per = Math.max(240, FILL / n);
      let step = 0, f0 = null;

      function run(now) {
        if (f0 === null) f0 = now;
        const u = Math.min(1, (now - f0) / per);
        paint(fromLevel + step, easeIn(u));
        if (u < 1) return requestAnimationFrame(run);

        step++;
        paint(fromLevel + step, 0);
        tick();
        try {
          document.dispatchEvent(new CustomEvent("xp:surge", {
            detail: { level: fromLevel + step, total: TOTAL, milestone },
          }));
        } catch (e) { console.warn("surge:", e); }
        if (step < n) { f0 = null; return requestAnimationFrame(run); }

        chip.classList.remove("landing");
        paint();
        bump();
        setTimeout(() => chip.classList.remove("rankup"), 1400);
        release();
      }
      requestAnimationFrame(now2 => { try { run(now2); } catch (e) { console.warn("claim:", e); release(); } });
    }

    function tick() {
      chip.classList.remove("tick");
      void chip.offsetWidth;
      chip.classList.add("tick");
    }
  }

  function bump() {
    if (!chip) return;
    chip.classList.remove("bump");
    void chip.offsetWidth;
    chip.classList.add("bump");
  }

  const api = {
    get level()  { return state.level; },
    get name()   { return state.name; },
    get ref()    { return state.ref; },
    get isNew()  { return fresh; },
    has: id => !!state.claimed[id],

    /* awards once and only once per id */
    award(id, n, label, x, y) {
      if (state.claimed[id]) return false;
      const before = state.level;
      state.claimed[id] = true;
      state.level += n;
      save();
      ceremony(n, label, x, y, before);
      document.dispatchEvent(new CustomEvent("xp:award", { detail: { id, n, label } }));
      return true;
    },

    get busy() { return ceremonyBusy; },

    seen() { fresh = false; save(); },
    get total() { return TOTAL; },
    mount: buildChip,

    reset() { try { localStorage.removeItem(KEY); } catch (e) {} location.reload(); },
  };

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", buildChip);
  else buildChip();

  return api;
})();
