/* ===========================================================
   FOLDERS — the four case-file folders on the index (section.case-folder).
   One open at a time; opened by the Work buttons, a #<game> hash, the
   folder's own tab, or a beacon card's "Open case file" button.
   =========================================================== */

window.Folders = (function () {
  const KEYS = ["sector-zero", "voidscape", "heavylight", "conclusus"];
  const XP_FIRST = {
    "sector-zero": ["proj-sector-zero", 5, "Sector Zero"],
    "voidscape":   ["proj-voidscape", 2, "VoidScape"],
    "heavylight":  ["proj-heavylight", 1, "HeavyLight"]
  };
  let current = null;
  let io = null;

  const sectionOf = (key) => document.getElementById(key);
  const bodyOf = (section) => section.querySelector(".folder-body");
  const tabOf = (section) => section.querySelector(".folder-tab");

  function watchTaught() {
    const h = document.getElementById("cc-taught");
    if (!h || !window.XP || XP.has("proj-conclusus") || !("IntersectionObserver" in window)) return;
    io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      const r = h.getBoundingClientRect();
      const y = Math.max(40, Math.min(innerHeight - 40, r.top + r.height / 2));
      XP.award("proj-conclusus", 1, "Conclusus", r.left, y);
      stopWatch();
    }, { rootMargin: "0px 0px -50% 0px" });
    io.observe(h);
  }

  function stopWatch() {
    if (io) io.disconnect();
    io = null;
  }

  function close() {
    if (!current) return;
    const section = sectionOf(current);
    current = null;
    stopWatch();
    if (window.Play) Play.close();
    if (!section) return;
    section.querySelectorAll("video").forEach((v) => v.pause());
    if (window.Embed) Embed.reset(section);
    section.classList.remove("open");
    tabOf(section).setAttribute("aria-expanded", "false");
    bodyOf(section).hidden = true;
  }

  function open(key, { scroll = true, hash = true } = {}) {
    const section = sectionOf(key);
    if (KEYS.indexOf(key) === -1 || !section) return;
    if (current) close();
    current = key;
    bodyOf(section).hidden = false;
    section.classList.add("open");
    tabOf(section).setAttribute("aria-expanded", "true");
    if (hash) history.replaceState(null, "", "#" + key);
    if (scroll) section.scrollIntoView({ behavior: Util.reduced() ? "auto" : "smooth", block: "start" });
    window.dispatchEvent(new Event("resize"));
    if (window.Play && matchMedia("(min-width: 900px)").matches) Play.open(section, section.dataset.toy);
    const xp = XP_FIRST[key];
    if (xp && window.XP) XP.award(xp[0], xp[1], xp[2]);
    if (key === "conclusus") watchTaught();
  }

  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!t.closest) return;
    const obj = t.closest('a.obj[href^="projects/"]');
    if (obj) {
      e.preventDefault();
      open(obj.getAttribute("href").replace(/^projects\//, "").replace(/\.html.*$/, ""));
      return;
    }
    const oc = t.closest(".open-case[data-case]");
    if (oc) {
      e.preventDefault();
      open(oc.dataset.case);
      return;
    }
    const tab = t.closest(".folder-tab");
    if (tab) {
      const section = tab.closest("section.case-folder");
      if (section) open(section.id);
      return;
    }
    if (t.closest('a.back[href="#work"]')) close();
  });

  function fromHash() {
    const key = location.hash.replace(/^#/, "");
    if (KEYS.indexOf(key) !== -1 && key !== current) open(key, { scroll: true, hash: false });
  }

  window.addEventListener("hashchange", fromHash);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fromHash);
  else fromHash();

  return { open, close, KEYS, get current() { return current; } };
})();
