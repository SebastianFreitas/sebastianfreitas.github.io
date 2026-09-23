/* ===========================================================
   ARCANIS — provisional entry.

   Libertech counts everything it finds. A visitor arrives
   unfiled, gets a provisional number, and rises a level for
   each thing they actually go and look at.

   Shared across every page. Include it before any script that
   calls XP.award().
   =========================================================== */

window.XP = (function () {
  const KEY = Util.KEYS.PROFILE;
  /* every level the site currently has to give — the underline under the
     top bar reads against this, so raising it is a one-line change */
  const TOTAL = 100;

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

  // every key this site writes starts "arcanis." — profile, hints, sector, view, tips
  function wipe(store) {
    const doomed = [];
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (k && k.indexOf(Util.KEYS.PREFIX) === 0) doomed.push(k);
    }
    doomed.forEach((k) => store.removeItem(k));
  }

  let state, fresh = false;
  try {
    if (/(?:[?&])reset(?:=1)?(?:&|$)/.test(location.search)) {
      wipe(localStorage);
      try { wipe(sessionStorage); } catch (e) {}
      // once: out of the URL, so reload and Back don't wipe it again
      const url = new URL(location.href);
      url.searchParams.delete("reset");
      history.replaceState(history.state, "", url.pathname + url.search + url.hash);
    }
    const raw = Util.read(localStorage, KEY);
    if (raw) state = JSON.parse(raw);
  } catch (e) { /* storage unavailable — run for this session only */ }

  if (!state || typeof state.level !== "number") {
    const n = newName();
    state = { name: n.name, ref: n.ref, level: 0, claimed: {} };
    fresh = true;
  }
  if (!state.claimed) state.claimed = {};
  /* legacy */
  if (!state.seen && (state.level > 0 || state.claimed["entry-beacon"])) {
    state.seen = true;
    save();
  }
  if (state.claimed["act-work"] && !state.claimed["path-projects"]) {
    state.claimed["path-projects"] = true;
    save();
  }

  function save() {
    Util.write(localStorage, KEY, JSON.stringify(state));
  }

  /* take whatever another page or tab saved since this page loaded.
     Every write starts from here, so an older copy in memory (a second
     tab, or a page restored from the back/forward cache) can never
     overwrite newer progress. */
  function sync() {
    try {
      const raw = Util.read(localStorage, KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (!s || typeof s.level !== "number") return;
      if (!s.claimed) s.claimed = {};
      state = s;
      fresh = false;
    } catch (e) {}
  }

  /* ---- rank: the badge changes shape as the level climbs ---- */
  const RANK_STEP = 10;   // levels per badge shape; tune once the site's final level total is known

  // all shapes live in a 24x24 viewBox centred on 12,12; angle 0 points straight up
  function ptAt(r, a) { return [12 + r * Math.sin(a), 12 - r * Math.cos(a)]; }

  function poly(n, r, rot = 0) {
    let d = "";
    for (let k = 0; k < n; k++) {
      const a = rot + k * 2 * Math.PI / n;
      const [x, y] = ptAt(r, a);
      d += (k === 0 ? "M" : "L") + x.toFixed(2) + " " + y.toFixed(2) + " ";
    }
    return d + "Z";
  }

  function star(n, ro, ri, rot = 0) {
    let d = "";
    for (let k = 0; k < 2 * n; k++) {
      const a = rot + k * Math.PI / n;
      const [x, y] = ptAt(k % 2 === 0 ? ro : ri, a);
      d += (k === 0 ? "M" : "L") + x.toFixed(2) + " " + y.toFixed(2) + " ";
    }
    return d + "Z";
  }

  function ring(r) {
    return "M12 " + (12 - r).toFixed(2) +
      "a" + r.toFixed(2) + " " + r.toFixed(2) + " 0 1 0 0 " + (2 * r).toFixed(2) +
      "a" + r.toFixed(2) + " " + r.toFixed(2) + " 0 1 0 0 " + (-2 * r).toFixed(2) + "Z";
  }

  const RANKS = [
    { key: "circle",   d: ring(8) },
    { key: "triangle", d: poly(3, 10.4) },
    { key: "square",   d: poly(4, 10.6, Math.PI / 4) },
    { key: "pentagon", d: poly(5, 10) },
    { key: "hexagon",  d: poly(6, 10) },
    { key: "star",     d: star(5, 10.8, 4.4) },
    { key: "megastar", d: star(8, 11, 5) },
    { key: "sealed",   d: ring(11) + " " + star(8, 8.6, 3.9) },
    { key: "compass",  d: ring(7.2) + " " + star(4, 11.5, 2.6) + " " + star(4, 7.4, 2.2, Math.PI / 4) },
    { key: "sun",      d: star(12, 11.4, 7.6) + " " + poly(6, 5) + " " + ring(1.6) },
    { key: "crest",    d: ring(11.2) + " " + star(16, 10, 7.2) + " " + star(5, 5.6, 2.3) + " " + ring(0.9) },
  ];
  const rankIndex = lv => Math.max(0, Math.min(RANKS.length - 1, Math.floor(lv / RANK_STEP)));
  const rankFor = lv => RANKS[rankIndex(lv)];

  /* ---- the chip ---- */
  let chip, chipLevel, chipName, chipFill, chipBadge, chipPath;
  let rankKey = "";
  let swapOut = 0, swapIn = 0;
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
    if (chipPath && chipBadge && rankKey !== rk.key) {
      const first = !rankKey;
      rankKey = rk.key;
      if (first || Util.reduced()) {
        clearTimeout(swapOut); clearTimeout(swapIn);
        chipBadge.classList.remove("swapping", "arrived");
        chip.dataset.rank = rankKey;
        chipPath.setAttribute("d", rk.d);
      } else {
        // the old shape leaves before the new one arrives
        clearTimeout(swapOut); clearTimeout(swapIn);
        chipBadge.classList.remove("arrived");
        chipBadge.classList.add("swapping");
        swapOut = setTimeout(() => {
          const target = RANKS.find(r => r.key === rankKey);
          chip.dataset.rank = rankKey;
          chipPath.setAttribute("d", target.d);
          chipBadge.classList.remove("swapping");
          void chipBadge.offsetWidth;
          chipBadge.classList.add("arrived");
          swapIn = setTimeout(() => chipBadge.classList.remove("arrived"), 560);
        }, 200);
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
  const easeOut = Util.easeOut;

  let ceremonyBusy = false;

  function ceremony(n, label, x, y, fromLevel) {
    if (!chip) { paint(); return; }
    const toLevel = fromLevel + n;
    const milestone = rankIndex(fromLevel) !== rankIndex(toLevel);

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
    setTimeout(() => chip.classList.remove("bump"), 300);   // swell, then settle back
  }

  const api = {
    get level()  { return state.level; },
    get name()   { return state.name; },
    get ref()    { return state.ref; },
    get isNew()  { return fresh; },
    get known()  { return !!state.seen; },
    has: id => !!state.claimed[id],

    /* awards once and only once per id */
    award(id, n, label, x, y) {
      sync();
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

    seen() { sync(); fresh = false; state.seen = true; save(); },
    /* claim without a level — flags like genesis, not beacons */
    flag(id) {
      sync();
      if (state.claimed[id]) return false;
      state.claimed[id] = true;
      save();
      return true;
    },
    get total() { return TOTAL; },
    mount: buildChip,

    reset() { Util.remove(localStorage, KEY); location.reload(); },
  };

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", buildChip);
  else buildChip();

  // another tab claimed something, or this page came back from the cache
  const resync = () => { sync(); if (!ceremonyBusy) paint(); };
  addEventListener("storage", e => { if (e.key === KEY) resync(); });
  addEventListener("pageshow", e => { if (e.persisted) resync(); });

  return api;
})();
