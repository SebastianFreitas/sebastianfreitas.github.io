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
  const RANK_STEP = 10;   // levels per badge: every ten levels is a new rank

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
    { key: "circle",   name: "Drifter",         d: ring(8) },
    { key: "triangle", name: "Lamplighter",     d: poly(3, 10.4) },
    { key: "square",   name: "Wayfinder",       d: poly(4, 10.6, Math.PI / 4) },
    { key: "pentagon", name: "Voidrunner",      d: poly(5, 10) },
    { key: "hexagon",  name: "Beaconwarden",    d: poly(6, 10) },
    { key: "star",     name: "Starwright",      d: star(5, 10.8, 4.4) },
    { key: "megastar", name: "Farseer",         d: star(8, 11, 5) },
    { key: "sealed",   name: "Sealbreaker",     d: ring(11) + " " + star(8, 8.6, 3.9) },
    { key: "compass",  name: "Deep Cartographer", d: ring(7.2) + " " + star(4, 11.5, 2.6) + " " + star(4, 7.4, 2.2, Math.PI / 4) },
    { key: "sun",      name: "Sunforger",       d: star(12, 11.4, 7.6) + " " + poly(6, 5) + " " + ring(1.6) },
    { key: "crest",    name: "Arcanist",        d: ring(11.2) + " " + star(16, 10, 7.2) + " " + star(5, 5.6, 2.3) + " " + ring(0.9) },
  ];
  const rankIndex = lv => Math.max(0, Math.min(RANKS.length - 1, Math.floor(lv / RANK_STEP)));
  const rankFor = lv => RANKS[rankIndex(lv)];
  function rankOf(lv) {
    const index = rankIndex(lv), r = RANKS[index], last = index === RANKS.length - 1;
    return { index, key: r.key, name: r.name, d: r.d, at: index * RANK_STEP,
             next: last ? null : (index + 1) * RANK_STEP,
             nextName: last ? null : RANKS[index + 1].name };
  }

  /* ---- the chip ---- */
  let chip, chipLevel, chipName, chipRef, chipPips, chipBadge, chipPath;
  let rankKey = "";
  let swapOut = 0, swapIn = 0;
  function buildChip() {
    if (chip) return;
    chip = document.createElement("div");
    chip.className = "xp-chip";
    let pips = "";
    for (let k = 0; k < RANK_STEP; k++) pips += '<i style="--k:' + k + '"></i>';
    chip.innerHTML =
      '<span class="xp-lv">LEVEL <b>0</b></span>' +
      '<span class="xp-badge">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="" vector-effect="non-scaling-stroke"/></svg>' +
      '</span>' +
      '<span class="xp-name"></span>' +
      '<span class="xp-track">' + pips + '</span>' +
      '<span class="xp-ref"></span>';
    // the level belongs to the whole site, so it lives in the top bar
    const slot = document.getElementById("xp-slot");
    if (slot) slot.appendChild(chip);
    else { chip.classList.add("floating"); document.body.appendChild(chip); }
    if (window.Banner) Banner.apply(chip);

    chipName  = chip.querySelector(".xp-name");
    chipRef   = chip.querySelector(".xp-ref");
    chipLevel = chip.querySelector(".xp-lv b");
    chipPips  = Array.from(chip.querySelectorAll(".xp-track i"));
    chipBadge = chip.querySelector(".xp-badge");
    chipPath  = chip.querySelector(".xp-badge path");
    if (!chipName || !chipLevel || !chipPips.length) return;   // markup changed under us
    paint();
  }

  function paint(levelOverride, fillOverride) {
    if (!chip || !chipName || !chipLevel || !chipPips.length) return;
    const lv = levelOverride == null ? state.level : levelOverride;
    chipName.textContent = state.name;
    chipRef.textContent = state.ref;
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
    // the chip bar is the road to the next badge: one pip per level, the one
    // being earned right now charges from the left
    const lit = rankIndex(lv) === RANKS.length - 1 ? RANK_STEP : lv % RANK_STEP;
    const f = fillOverride == null ? 0 : fillOverride;
    chipPips.forEach((p, k) => {
      p.classList.toggle("on", k < lit);
      p.style.setProperty("--f", k === lit ? f.toFixed(3) : "0");
    });

    // everything earned so far rides quietly as the top bar's underline
    document.documentElement.style.setProperty("--xp-progress",
      Math.min(1, lv / TOTAL).toFixed(4));
  }

  /* =========================================================
     THE CLAIM

     Gaining a level only grows the bar: it peeks in, the gauge
     fills smoothly one pip at a time (the number turns over as
     each fills), and it leaves. Crossing into a new rank also opens
     the rank card (surge.js), which is the only thing that holds
     the world still.
     ========================================================= */

  const easeIn = u => u * u * u * u;                     // slow, then sharp
  const PER_LEVEL = 600;                                 // ms of gauge per level gained
  const PEEK_LEAD = 400;                                 // ms the bar takes to slide in before the gauge starts

  let ceremonyBusy = false;
  let shown = 0;      // the level the bar has reached so far; it catches up to state.level
  let rowTimer = 0;

  // a rank was crossed: the one place ship upgrades can attach to a level later
  function onRankUp(from, to) {
    chip.classList.add("rankup");
    setTimeout(() => chip.classList.remove("rankup"), 1400);
    try {
      document.dispatchEvent(new CustomEvent("xp:rankup", {
        detail: { level: to, count: RANKS.length, from: rankOf(from), to: rankOf(to) },
      }));
    } catch (e) { console.warn("rankup:", e); }
  }

  // awards add to state.level at once; one loop walks the bar up to it, however many land
  function ceremony(fromLevel) {
    if (!chip) { paint(); return; }
    if (window.Bridge && Bridge.barPeek) Bridge.barPeek((state.level - (ceremonyBusy ? shown : fromLevel)) * PER_LEVEL + PEEK_LEAD + 1500);
    if (ceremonyBusy) return;
    ceremonyBusy = true;
    shown = fromLevel;
    paint(shown, 0);

    let f0 = null;
    let crossed = false;
    function run(now) {
      if (f0 === null) f0 = now;
      const u = Math.min(1, (now - f0) / PER_LEVEL);
      paint(shown, easeIn(u));
      if (u < 1) return requestAnimationFrame(step);

      shown++;
      f0 = null;
      const rowDone = rankIndex(shown) !== rankIndex(shown - 1);
      paint(shown, 0);
      tick();
      if (rowDone) flashRow(); else lightPip((shown % RANK_STEP) - 1);
      try {
        document.dispatchEvent(new CustomEvent("xp:surge", {
          detail: { level: shown, total: TOTAL, milestone: rankIndex(fromLevel) !== rankIndex(state.level),
                    rank: rankIndex(shown), pip: shown % RANK_STEP, rankUp: rowDone },
        }));
      } catch (e) { console.warn("surge:", e); }
      if (rowDone) { crossed = true; onRankUp(shown - 1, shown); }
      if (shown < state.level) return requestAnimationFrame(step);

      const finish = () => {
        ceremonyBusy = false;
        paint();
        bump();
        window.dispatchEvent(new CustomEvent("xp:ceremony-done"));
      };
      // a rank crossed: the rank card is open or about to be, so the ceremony ends when it closes
      if (crossed) document.addEventListener("xp:card-closed", () => setTimeout(finish, 250), { once: true });
      else finish();
    }
    const step = now => { try { run(now); } catch (e) { console.warn("claim:", e); ceremonyBusy = false; paint(); } };
    setTimeout(() => requestAnimationFrame(step), PEEK_LEAD);
  }

  function tick() {
    chip.classList.remove("tick");
    void chip.offsetWidth;
    chip.classList.add("tick");
  }

  function lightPip(k) {
    if (k < 0 || k >= chipPips.length) return;
    const p = chipPips[k];
    p.classList.remove("fresh");
    void p.offsetWidth;
    p.classList.add("fresh");
    setTimeout(() => p.classList.remove("fresh"), 520);
  }

  function flashRow() {
    chip.classList.remove("row-done");
    void chip.offsetWidth;
    chip.classList.add("row-done");
    clearTimeout(rowTimer);
    rowTimer = setTimeout(() => chip.classList.remove("row-done"), 900);
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
    /* beacon ids in the order they were read (profiles from before it have none) */
    get readOrder() { return state.readOrder ? state.readOrder.slice() : []; },

    /* awards once and only once per id */
    award(id, n, label, x, y) {
      sync();
      if (state.claimed[id]) return false;
      const before = state.level;
      state.claimed[id] = true;
      state.level += n;
      if (/^beacon-/.test(id)) (state.readOrder || (state.readOrder = [])).push(id);
      save();
      ceremony(before);
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
    rankOf,
    get rankStep() { return RANK_STEP; },
    get ranks() { return RANKS.map(r => ({ key: r.key, name: r.name })); },
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
