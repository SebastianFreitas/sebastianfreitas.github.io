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

  /* ---- the chip ---- */
  let chip, chipLevel, chipName, chipFill;
  function buildChip() {
    if (chip) return;
    chip = document.createElement("div");
    chip.className = "xp-chip";
    chip.innerHTML =
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
    paint();
  }

  function paint() {
    if (!chip) return;
    chipName.textContent = state.name + " · " + state.ref;
    chipLevel.textContent = state.level;
    // no cap on levels, so the track just shows the last ten
    chipFill.style.width = ((state.level % 10) / 10 * 100) + "%";
  }

  /* ---- floating +N ---- */
  function float(n, label, x, y) {
    const el = document.createElement("div");
    el.className = "xp-pop";
    el.innerHTML = `<b>+${n}</b>${label ? `<span>${label}</span>` : ""}`;
    if (typeof x === "number") { el.style.left = x + "px"; el.style.top = y + "px"; }
    else { el.classList.add("corner"); }
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("go"));
    setTimeout(() => el.remove(), 2200);
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
      state.claimed[id] = true;
      state.level += n;
      save(); paint(); bump();
      float(n, label, x, y);
      document.dispatchEvent(new CustomEvent("xp:award", { detail: { id, n, label } }));
      return true;
    },

    seen() { fresh = false; save(); },
    mount: buildChip,

    reset() { try { localStorage.removeItem(KEY); } catch (e) {} location.reload(); },
  };

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", buildChip);
  else buildChip();

  return api;
})();
