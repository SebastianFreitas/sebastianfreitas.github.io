/* ===========================================================
   FOLDERS — the four case-file folders on the index (div.case-folder under each Work row).
   Each body sits under its own Work row and grows open there; one open at a
   time; opened by the row, a #<game> hash, or a beacon card's "Open case file" button.
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

  const rowOf = (key) => document.querySelector('a.obj[href^="projects/' + key + '"]');
  const GROW_MS = 700, SHUT_MS = 350, PAN_MS = 1200;
  let pan = null;
  let relax = null;

  // one-time scaffolding in each body: three empty layers for the css, and the close line
  function dress(section, key) {
    const body = bodyOf(section);
    if (body.querySelector(".folder-scan")) return body;
    const mk = (cls, text) => { const d = document.createElement("div"); d.className = cls; if (text) d.textContent = text; return d; };
    const n = KEYS.indexOf(key) + 1;
    body.prepend(mk("folder-scan"), mk("folder-bar"), mk("folder-kicker", "OPENING CASE FILE // OBJ_000" + n));
    const x = document.createElement("button");
    x.type = "button";
    x.className = "folder-close";
    x.textContent = "CLOSE CASE FILE";
    x.addEventListener("click", () => { close(); panTo(key); });
    body.append(x);
    body.dataset.key = key;
    body.dataset.obj = "OBJ_000" + n;
    return body;
  }

  // the row's top lands 24px below whatever fixed header there is
  function topGap() {
    const bar = document.querySelector(".topbar");
    const r = bar && getComputedStyle(bar).position === "fixed" ? bar.getBoundingClientRect().bottom : 0;
    return Math.max(0, r) + 24;
  }

  const jump = (y) => window.scrollTo({ top: y, behavior: "instant" });

  function stopPan() {
    if (pan) cancelAnimationFrame(pan);
    pan = null;
    relax = null;
  }

  // eased camera to the row; target is re-read each frame since the page above it may be collapsing
  function panTo(key) {
    const row = rowOf(key);
    if (!row) return;
    const target = () => row.getBoundingClientRect().top + window.scrollY - topGap();
    stopPan();
    if (Util.reduced()) { jump(target()); return; }
    const from = window.scrollY, t0 = performance.now();
    const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const step = (now) => {
      const t = Math.min(1, (now - t0) / PAN_MS);
      jump(from + (target() - from) * ease(t));
      pan = t < 1 ? requestAnimationFrame(step) : null;
    };
    pan = requestAnimationFrame(step);
  }

  ["wheel", "touchstart", "keydown"].forEach((ev) => window.addEventListener(ev, stopPan, { passive: true }));

  // close: the layout drops at once; the body stays as a frozen overlay and a clip-path wipes it up (no per-frame layout)
  function animate(body, ms, easing, done) {
    if (body._anim) body._anim.cancel();
    const st = body.style;
    st.position = "absolute"; st.top = body.offsetTop + "px"; st.left = body.offsetLeft + "px";
    st.width = body.offsetWidth + "px"; st.height = body.offsetHeight + "px"; st.zIndex = "5";
    const a = body._anim = body.animate([{ clipPath: "inset(0 0 0 0)" }, { clipPath: "inset(0 0 100% 0)" }], { duration: ms, easing });
    a.finished.then(() => { if (body._anim !== a) return; body._anim = null; done(); }, () => {});
  }

  // open: the body is already laid out; a clip-path wipe reveals it downward (no per-frame layout)
  function reveal(body, ms, done) {
    if (body._anim) body._anim.cancel();
    const a = body._anim = body.animate([{ clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0 0)" }], { duration: ms, easing: "ease-out" });
    a.finished.then(() => { if (body._anim !== a) return; body._anim = null; done(); }, () => {});
  }

  function dropLoader(body) {
    if (body._loader) body._loader.remove();
    body._loader = null;
  }

  // opaque page-load screen inside the opening folder body: up from the first frame, fades once the open motion is done and the page is ready (400-700 ms)
  function loadScreen(key, section, body, motion, done) {
    dropLoader(body);
    const el = document.createElement("div");
    el.className = "folder-loader";
    el.setAttribute("aria-hidden", "true");
    const line = document.createElement("div");
    line.className = "folder-loader-line";
    line.textContent = "> loading " + key + "\u2026";
    const bar = document.createElement("div");
    bar.className = "folder-loader-bar";
    bar.appendChild(document.createElement("i"));
    const block = document.createElement("div");
    block.className = "folder-loader-block";
    block.append(line, bar);
    el.appendChild(block);
    body.appendChild(el);
    body._loader = el;
    const t0 = performance.now();
    let over = false;
    const hide = () => {
      if (over || body._loader !== el) return;
      over = true;
      done();
      el.classList.add("is-out");
      setTimeout(() => { el.remove(); if (body._loader === el) body._loader = null; }, 260);
    };
    const frame = new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const imgs = Array.prototype.slice.call(section.querySelectorAll(".folder-body img")).slice(0, 3)
      .map((im) => (im.decode ? im.decode() : Promise.resolve()).catch(() => {}));
    const ready = Promise.race([
      Promise.all([frame].concat(imgs)).then(() => new Promise((r) => setTimeout(r, Math.max(0, 400 - (performance.now() - t0))))),
      new Promise((r) => setTimeout(r, 700))
    ]);
    Promise.all([ready, motion]).then(hide);
  }

  function close({ instant = false } = {}) {
    if (!current) return;
    const key = current;
    const section = sectionOf(key);
    current = null;
    stopWatch();
    if (window.Play) Play.close();
    if (!section) return;
    section.querySelectorAll("video").forEach((v) => v.pause());
    if (window.Embed) Embed.reset(section);
    section.classList.remove("open");
    const row = rowOf(key);
    if (row) row.setAttribute("aria-expanded", "false");
    const body = bodyOf(section);
    const fin = () => {
      body.classList.remove("is-open", "is-closing"); body.hidden = true;
      ["position", "top", "left", "width", "height", "zIndex"].forEach((k) => { body.style[k] = ""; });
    };
    body.classList.remove("is-opening");
    dropLoader(body);
    if (instant || Util.reduced()) { if (body._anim) body._anim.cancel(); body._anim = null; fin(); return; }
    body.classList.remove("is-open");
    body.classList.add("is-closing");
    body.style.setProperty("--open-ms", SHUT_MS + "ms");
    animate(body, SHUT_MS, "ease-in", fin);
  }

  function open(key, { scroll = true, hash = true, instant = false } = {}) {
    const section = sectionOf(key);
    if (KEYS.indexOf(key) === -1 || !section) return;
    if (current === key) { if (scroll) panTo(key); return; }
    if (current) close({ instant });
    current = key;
    const body = dress(section, key);
    body.hidden = false;
    section.classList.add("open");
    const row = rowOf(key);
    if (row) { row.setAttribute("aria-expanded", "true"); row.setAttribute("aria-controls", key + "-body"); }
    if (hash) history.replaceState(null, "", "#" + key);
    body.style.setProperty("--open-ms", GROW_MS + "ms");
    const settled = () => {
      body.classList.remove("is-opening");
      body.classList.add("is-open");
      window.dispatchEvent(new Event("resize"));
    };
    window.dispatchEvent(new Event("resize"));
    if (window.Play && matchMedia("(min-width: 900px)").matches) Play.open(section, section.dataset.toy);
    if (body._anim) { body._anim.cancel(); ["position", "top", "left", "width", "height", "zIndex"].forEach((k) => { body.style[k] = ""; }); }
    body._anim = null;
    body.classList.remove("is-closing");
    const fast = instant || Util.reduced();
    let motion;
    if (fast) {
      settled();
      motion = Promise.resolve();
    } else {
      body.classList.remove("is-open");
      body.classList.add("is-opening");
      motion = new Promise((r) => reveal(body, GROW_MS, () => { settled(); r(); }));
    }
    if (scroll) {
      const land = () => jump(row.getBoundingClientRect().top + window.scrollY - topGap());
      if (fast) {
        land();
        // images and fonts above the row settle after a deep link; land again until the reader moves
        const again = () => { if (relax === again) land(); };
        relax = again;
        if (document.readyState !== "complete") window.addEventListener("load", again, { once: true });
      } else panTo(key);
    }
    loadScreen(key, section, body, motion, () => { if (scroll && relax) relax(); });
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
      const key = obj.getAttribute("href").replace(/^projects\//, "").replace(/\.html.*$/, "");
      if (current === key) close();
      else open(key);
      return;
    }
    const oc = t.closest(".open-case[data-case]");
    if (oc) {
      e.preventDefault();
      open(oc.dataset.case);
      return;
    }
    if (t.closest('a.back[href="#work"]')) close();
  });

  let firstLoad = true;

  function fromHash() {
    const key = location.hash.replace(/^#/, "");
    if (KEYS.indexOf(key) !== -1 && key !== current) open(key, { scroll: true, hash: false, instant: firstLoad });
  }

  window.addEventListener("hashchange", () => { firstLoad = false; fromHash(); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fromHash);
  else fromHash();

  return { open, close, KEYS, get current() { return current; } };
})();
