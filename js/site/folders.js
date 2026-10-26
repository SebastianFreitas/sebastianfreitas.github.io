/* ===========================================================
   FOLDERS — the four case-file folders on the index (div.case-folder under each Work row).
   Each body sits under its own Work row and grows open there; one open at a
   time; opened by the row, a #<game> hash, or a beacon card's "Open case file" button.
   =========================================================== */

window.Folders = (function () {
  const KEYS = ["sector-zero", "voidscape", "conclusus", "heavylight"];
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
  const PAN_MS = 1200;
  let pan = null;
  let relax = null;
  let pending = null;
  let seq = 0;

  // one-time scaffolding in each body: four empty layers for the css, and the close line
  function dress(section, key) {
    const body = bodyOf(section);
    if (body.querySelector(".folder-scan")) return body;
    const mk = (cls, text) => { const d = document.createElement("div"); d.className = cls; if (text) d.textContent = text; return d; };
    const n = KEYS.indexOf(key) + 1;
    body.prepend(mk("folder-glow"), mk("folder-scan"), mk("folder-bar"), mk("folder-kicker", "OPENING CASE FILE // OBJ_000" + n));
    const x = document.createElement("button");
    x.type = "button";
    x.className = "folder-close";
    x.textContent = "CLOSE CASE FILE";
    x.addEventListener("click", close.bind(null, undefined));
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
    dropVeil();
    const p = pending;
    pending = null;
    if (p) p();
  }

  // eased camera to the row; target is re-read each frame since the page above it may be collapsing
  // after: runs once the glide lands (or at once if the reader takes over the scroll)
  // fade: set for a button close; over a long glide (more than 1.5 viewports) a page-coloured veil fades in over everything,
  // the scroll jumps to the row while it is opaque, and the veil fades out while the scan out runs, and the window close follows
  let veil = null, veilRaf = null;
  function dropVeil() {
    if (veilRaf) cancelAnimationFrame(veilRaf);
    veilRaf = null;
    if (veil) veil.remove();
    veil = null;
  }
  function panTo(key, after, fade) {
    const row = rowOf(key);
    if (!row) { if (after) after(); return; }
    const target = () => row.getBoundingClientRect().top + window.scrollY - topGap();
    stopPan();
    if (Util.reduced()) { jump(target()); if (after) after(); return; }
    const from = window.scrollY, t0 = performance.now();
    const dist = Math.abs(target() - from);
    if (after && dist < 8) { after(); return; }
    const ms = fade ? Math.min(1200, Math.max(600, 300 + dist * 0.3)) : after ? Math.min(650, 250 + dist * 0.4) : PAN_MS;
    const dim = fade && dist > innerHeight * 1.5;
    if (after) pending = after;
    if (dim) {
      veil = document.createElement("div");
      veil.className = "folder-veil";
      veil.style.opacity = "0";
      document.body.appendChild(veil);
      const v = veil;
      const f0 = performance.now();
      const vease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);
      let held = 0; // frames spent at full opacity: the jump lands on the 3rd, the lift starts a frame after it
      const fstep = (now) => {
        const t = Math.min(1, (now - f0) / 300);
        v.style.opacity = vease(t);
        if (t < 1) { pan = requestAnimationFrame(fstep); return; }
        held++;
        if (held === 3) jump(target());
        if (held < 4) { pan = requestAnimationFrame(fstep); return; }
        pan = null;
        const o0 = performance.now();
        const ostep = (n) => {
          const u = Math.min(1, (n - o0) / 680);
          v.style.opacity = 1 - vease(u);
          if (u < 1) { veilRaf = requestAnimationFrame(ostep); return; }
          veilRaf = null;
          dropVeil();
        };
        veilRaf = requestAnimationFrame(ostep);
        if (pending) { const p = pending; pending = null; p(); }
      };
      pan = requestAnimationFrame(fstep);
      return;
    }
    const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms);
      jump(from + (target() - from) * ease(t));
      pan = t < 1 ? requestAnimationFrame(step) : null;
      if (t >= 1 && pending) { const p = pending; pending = null; p(); }
    };
    pan = requestAnimationFrame(step);
  }

  ["wheel", "touchstart", "keydown"].forEach((ev) => window.addEventListener(ev, stopPan, { passive: true }));

  // one timeline for every open effect: p runs 0 to 1 (dir +1) or 1 to 0 (dir -1) on rAF with one easing,
  // and every effect below is a pure function of p, so playing it backwards is exact
  const CASE_MS = 950;
  const ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const CLOSE_MS = 700;
  const HOLD_MS = 800, WAIT_MS = 2500, SCAN_MS = 600, SCAN_OUT_MS = 450; // loading beat: at least HOLD_MS, until ready or WAIT_MS; then the scan in

  // begin (opening): runs when the empty window has finished opening; starts the toy and returns a ready() check
  function caseAnim(body, dir, done, onLoad, begin, scanned) {
    if (body._anim) body._anim.cancel();
    body._anim = null;
    if (body._raf) cancelAnimationFrame(body._raf);
    const H = body.offsetHeight;
    const vis = Math.max(1, Math.min(H, innerHeight - body.getBoundingClientRect().top));
    const q = (c) => body.querySelector(c);
    const scan = q(".folder-scan"), bar = q(".folder-bar"), kick = q(".folder-kicker"), glow = q(".folder-glow");
    const load = body._loader, lline = load && load.firstChild, lbar = load && load.lastChild.firstChild;
    const txt = lline ? lline.textContent : "";
    const kids = Array.prototype.filter.call(body.children, (c) => !/folder-(scan|bar|kicker|glow|load)/.test(c.className));
    // the toy's canvas and panels sit outside the body: they come up and go down with p too
    let hud = Array.prototype.slice.call(document.querySelectorAll(".play, .play-tiles"));
    let panels = Array.prototype.slice.call(document.querySelectorAll(".play-ui"));
    // every row and the footer after the case: the layout is already H taller, so they ride the wipe edge down
    const sib = [];
    for (let n = body.parentElement; n && n !== document.body; n = n.parentElement) {
      for (let e = n.nextElementSibling; e; e = e.nextElementSibling) {
        if (/^(SCRIPT|STYLE|LINK)$/.test(e.tagName) || /^(fixed|absolute)$/.test(getComputedStyle(e).position)) continue; // only rows and the footer in the flow ride the edge (not the toy's fixed or absolute layers)
        sib.push(e);
      }
    }
    body._sib = sib;
    const set = (p) => {
      const edge = vis * p;
      const tail = p > 0.8 ? Math.max(0, (1 - p) / 0.2) : 1; // 1 until p = 0.8, then 0 at p = 1: frame, glow, bar, dim and HUD all land together
      body.style.clipPath = "inset(0 0 " + (H - edge) + "px 0)";
      scan.style.transform = "translateY(" + (edge - 26) + "px)";
      scan.style.opacity = p > 0 ? tail : 0;
      glow.style.opacity = Math.min(1, p / 0.3) * tail;
      bar.style.opacity = 1; // the header bar stays through the loading beat; the scan fades it
      bar.style.transform = "scaleX(" + Math.min(1, p / 0.4) + ")";
      kick.style.opacity = (p < 0.05 ? 0 : (p > 0.2 && p < 0.26 ? 0.6 : 1)) * tail;
      kick.style.clipPath = "inset(0 " + (100 - 100 * Math.min(1, p / 0.45)) + "% 0 0)";
      // the window is empty (content and HUD hidden) while it opens and while it closes; the scan brings the content in and takes it out
      for (let i = 0; i < kids.length; i++) kids[i].style.opacity = 0;
      for (let i = 0; i < hud.length; i++) hud[i].style.opacity = 0;
      for (let i = 0; i < panels.length; i++) panels[i].style.opacity = 0;
      const ty = p >= 1 ? "" : "translateY(" + (edge - H) + "px)";
      for (let i = 0; i < sib.length; i++) sib[i].style.transform = ty;
      if (load) load.style.opacity = 0; // no loader line while the empty window opens
    };
    const clear = () => {
      body.style.clipPath = "";
      [scan, bar, kick, glow].forEach((e) => { e.style.opacity = ""; e.style.transform = ""; e.style.clipPath = ""; });
      kids.forEach((k) => { k.style.opacity = ""; k.style.clipPath = ""; });
      hud.concat(panels).forEach((h) => { h.style.opacity = ""; h.style.clipPath = ""; });
      sib.forEach((e) => { e.style.transform = ""; });
    };
    // phases 3 and 4 (opening only): the loading beat, then the gold scan reveals the content top to bottom
    const afterWipe = () => {
      const mid = body._loadMid, mline = mid && mid.firstChild, mbar = mid && mid.lastChild.firstChild;
      const ready = begin ? begin() : null;
      // the toy's layers exist only now: hide them in the same frame
      hud = Array.prototype.slice.call(document.querySelectorAll(".play, .play-tiles"));
      panels = Array.prototype.slice.call(document.querySelectorAll(".play-ui"));
      hud.concat(panels).forEach((h) => { h.style.opacity = 0; });
      body._phase = "load";
      const t3 = performance.now();
      let waited = false;
      const loadStep = (now) => {
        const t = now - t3;
        const lp = Math.min(1, t / HOLD_MS);
        const fin = Math.min(1, t / 200);
        if (load) { load.style.opacity = fin; lline.textContent = txt.slice(0, Math.ceil(txt.length * Math.min(1, lp / 0.4))); lbar.style.transform = "scaleX(" + lp + ")"; }
        if (mid) { mid.style.opacity = fin; mline.textContent = txt.slice(0, Math.ceil(txt.length * Math.min(1, lp / 0.4))); mbar.style.transform = "scaleX(" + lp + ")"; }
        if (!waited && t >= HOLD_MS && (!ready || ready() || t >= WAIT_MS)) waited = true;
        if (!waited) { body._raf = requestAnimationFrame(loadStep); return; }
        scanIn(0, true);
      };
      body._raf = requestAnimationFrame(loadStep);
    };
    // the gold scan line over the visible part of the window: s runs 0 to 1 opening (content comes in behind the line, top to bottom)
    // and 1 to 0 closing (the same sweep backwards, bottom to top); every effect is a pure function of s
    const sweepRun = (s0, d, ms, end, useFx) => {
      const top = body.getBoundingClientRect().top;
      const mid = body._loadMid;
      // layout is read once here; the sweep below only writes
      const geo = kids.map((k) => [k.offsetTop, k.offsetHeight]);
      const fx = useFx ? [[load, 26 / vis], [mid, 0.5]] : [];
      // page-absolute HUD layers (the Conclusus tiles) are clipped by the scan line's page-y against their own box; fixed ones by the viewport
      const sy0 = window.scrollY, pageTop = top + sy0;
      const hgeo = hud.map((h) => {
        if (getComputedStyle(h).position === "fixed") return null;
        const r = h.getBoundingClientRect();
        return [r.top + window.scrollY, r.height];
      });
      kids.forEach((k) => { k.style.opacity = ""; });
      hud.concat(panels).forEach((h) => { h.style.opacity = ""; });
      let s4 = s0, last = performance.now();
      const draw = () => {
        const u = ease(s4), y = vis * u;
        body._s4 = s4;
        scan.style.transform = "translateY(" + (y - 26) + "px)";
        scan.style.opacity = Math.min(1, s4 / 0.3, (1 - s4) / 0.3);
        for (let i = 0; i < kids.length; i++) kids[i].style.clipPath = "inset(0 0 " + (geo[i][1] - Math.max(0, Math.min(geo[i][1], y - geo[i][0]))) + "px 0)";
        const hc = "inset(0 0 " + Math.max(0, innerHeight - top - y) + "px 0)";
        for (let i = 0; i < hud.length; i++) {
          const g = hgeo[i];
          // from the window top (growing to the viewport top as the scan ends, so the unclip does not pop) down to the scan line
          hud[i].style.clipPath = g ? "inset(" + Math.max(0, Math.min(g[1], pageTop + (sy0 - pageTop) * u - g[0])) + "px 0 " + (g[1] - Math.max(0, Math.min(g[1], pageTop + y - g[0]))) + "px 0)" : hc;
        }
        bar.style.opacity = 1 - u;
        for (let i = 0; i < panels.length; i++) panels[i].style.clipPath = hc;
        fx.forEach((f) => { if (f[0]) f[0].style.opacity = Math.max(0, Math.min(1, 1 - (u - f[1]) / 0.4)); });
      };
      const frame = (now) => {
        s4 = Math.max(0, Math.min(1, s4 + d * (now - last) / ms));
        last = now;
        draw();
        if (d > 0 ? s4 < 1 : s4 > 0) { body._raf = requestAnimationFrame(frame); return; }
        body._raf = null;
        end();
      };
      draw();
      body._raf = requestAnimationFrame(frame);
    };
    const scanIn = (s0, useFx) => {
      body._phase = "scan";
      sweepRun(s0, 1, SCAN_MS, () => {
        body._p = null;
        body._s4 = null;
        body._phase = null;
        clear();
        if (onLoad) onLoad();
        done();
      }, useFx);
    };
    kick.textContent = kick.textContent.replace(/^(OPENING|CLOSING)/, dir > 0 ? "OPENING" : "CLOSING");
    // the window wipe, opening or closing; starts from where a running timeline stopped, so a reversal plays back from the current p
    const windowRun = () => {
      const p0 = body._p == null ? (dir > 0 ? 0 : 1) : body._p;
      let s = 1 - Math.sqrt(Math.max(0, (1 - p0) / 2)); // inverse of ease
      if (p0 < 0.5) s = Math.sqrt(p0 / 2);
      const ms = dir > 0 ? CASE_MS : CLOSE_MS;
      let last = performance.now();
      const step = (now) => {
        s = Math.max(0, Math.min(1, s + dir * (now - last) / ms));
        last = now;
        const p = ease(s);
        body._p = p;
        set(p);
        if (dir > 0 ? s < 1 : s > 0) { body._raf = requestAnimationFrame(step); return; }
        if (dir > 0) { body._raf = null; afterWipe(); return; } // p stays 1 on the body through the beat and the scan
        body._raf = null;
        body._p = null;
        body._phase = null;
        clear();
        done();
      };
      body._phase = dir > 0 ? "wipe" : "close";
      body._p = p0;
      set(p0);
      body._raf = requestAnimationFrame(step);
    };
    // where the timeline was when this call came in: a reversal or a reopen picks up from there
    const ph = body._phase, s4 = body._s4 == null ? 1 : body._s4;
    if (dir > 0) {
      if (ph === "scanout") { // reopened during the scan out: the scan goes forward again from where it is
        if (load) load.style.opacity = 0;
        if (body._loadMid) body._loadMid.style.opacity = 0;
        scanIn(s4, false);
      } else windowRun();
      return;
    }
    // closing: scan out (content leaves), then the empty window closes
    const toWindow = () => { if (scanned) scanned(); windowRun(); };
    if (ph === "wipe" || ph === "close") toWindow(); // the window is still moving: reverse it from where it is
    else if (ph === "load") { // loading beat: the loader fades out (dropLoader), then the window closes
      body._phase = "close";
      body._p = 1;
      set(1);
      const w0 = performance.now();
      const wait = (now) => { if (now - w0 < 150) { body._raf = requestAnimationFrame(wait); return; } toWindow(); };
      body._raf = requestAnimationFrame(wait);
    } else { // settled or mid scan in: the scan runs backwards from where it is
      body._phase = "scanout";
      body._p = 1;
      set(1);
      sweepRun(s4, -1, SCAN_OUT_MS, toWindow, false);
    }
  }

  // stop a running case timeline and drop its inline styles
  function stopCase(body) {
    if (body._raf) cancelAnimationFrame(body._raf);
    body._raf = null;
    body.style.clipPath = "";
    if (body._sib) body._sib.forEach((e) => { e.style.transform = ""; });
    body._sib = null;
    document.querySelectorAll(".play, .play-tiles, .play-ui").forEach((h) => { h.style.clipPath = ""; });
    Array.prototype.forEach.call(body.children, (c) => {
      c.style.opacity = "";
      c.style.clipPath = "";
      if (/folder-(scan|bar|kicker|glow)/.test(c.className)) { c.style.transform = ""; c.style.clipPath = ""; }
    });
  }

  function dropLoader(body, fade) {
    const el = body._loader, mid = body._loadMid;
    body._loader = null;
    body._loadMid = null;
    if (!el) return;
    if (!fade) { el.remove(); if (mid) mid.remove(); return; }
    el.style.transition = "opacity 150ms linear";
    el.style.opacity = "0";
    if (mid) { mid.style.transition = "opacity 150ms linear"; mid.style.opacity = "0"; }
    setTimeout(() => { el.remove(); if (mid) mid.remove(); }, 170);
  }

  // loading line in the case's header bar; caseAnim types it in, fills its bar and fades it with the effects
  function loadLine(key, body) {
    dropLoader(body);
    const el = document.createElement("div");
    el.className = "folder-load";
    el.setAttribute("aria-hidden", "true");
    const line = document.createElement("div");
    line.className = "folder-load-line";
    line.textContent = "> loading " + key + "_";
    const bar = document.createElement("div");
    bar.className = "folder-load-bar";
    bar.appendChild(document.createElement("i"));
    el.append(line, bar);
    body.appendChild(el);
    body._loader = el;
    // centred graphic: middle of the part of the window that is on screen
    const mid = document.createElement("div");
    mid.className = "folder-load-mid";
    mid.setAttribute("aria-hidden", "true");
    const mline = document.createElement("div");
    mline.className = "folder-load-line";
    mline.textContent = line.textContent;
    const mbar = document.createElement("div");
    mbar.className = "folder-load-bar";
    mbar.appendChild(document.createElement("i"));
    mid.append(mline, mbar);
    body.appendChild(mid);
    body._loadMid = mid;
    midTop(body);
    return el;
  }

  function midTop(body) {
    if (body._loadMid) body._loadMid.style.top = Math.max(1, Math.min(body.offsetHeight, innerHeight - body.getBoundingClientRect().top)) / 2 + "px";
  }

  function close({ instant = false, now = false, then = null } = {}) {
    if (!current) { if (then) then(); return; }
    if (pending) { pending = null; stopPan(); }
    const key = current;
    const section = sectionOf(key);
    // deep in the case: glide to the row first so the wipe is seen, then close
    const r0 = rowOf(key);
    if (!now && !instant && !Util.reduced() && r0) {
      const t = r0.getBoundingClientRect().top;
      if (t < 0 || t > innerHeight - 200) { panTo(key, () => { if (current !== key) return; const rw = rowOf(key); if (rw) jump(rw.getBoundingClientRect().top + window.scrollY - topGap()); close({ now: true, then }); }, bodyOf(sectionOf(key))); return; }
    }
    current = null;
    stopWatch();
    // the toy and its panels leave with the scan out, so Play.close waits for the end of it
    const stopToy = () => { if (window.Play && section && Play.current === section.dataset.toy) Play.close(); };
    if (!section) { stopToy(); if (then) then(); return; }
    section.querySelectorAll("video").forEach((v) => v.pause());
    if (window.Embed) Embed.reset(section);
    const row = rowOf(key);
    const body = bodyOf(section);
    // row chrome and layout change together, at the end of the wipe; scroll is corrected so the row stays put
    const fin = () => {
      stopToy();
      const y0 = row ? row.getBoundingClientRect().top : 0;
      section.classList.remove("open");
      if (row) row.setAttribute("aria-expanded", "false");
      body.classList.remove("is-open", "is-closing"); body.hidden = true;
      if (!instant && !Util.reduced()) { section.classList.add("gold-out"); setTimeout(() => section.classList.remove("gold-out"), 220); }
      ["position", "top", "left", "width", "height", "zIndex"].forEach((k) => { body.style[k] = ""; });
      if (row && !current && !instant) { const d = row.getBoundingClientRect().top - y0; if (Math.abs(d) > 0.5) jump(window.scrollY + d); }
      if (then) then();
    };
    body.classList.remove("is-opening");
    const ph = body._phase;
    stopCase(body);
    dropLoader(body, !instant && !Util.reduced() && (ph === "load" || ph === "scan"));
    if (instant || Util.reduced()) { stopToy(); if (body._anim) body._anim.cancel(); body._anim = null; fin(); return; }
    body.classList.remove("is-open");
    body.classList.add("is-closing");
    caseAnim(body, -1, fin, null, null, stopToy);
  }

  function open(key, { scroll = true, hash = true, instant = false } = {}) {
    const section = sectionOf(key);
    if (KEYS.indexOf(key) === -1 || !section) return;
    if (current === key) { if (scroll) panTo(key); return; }
    const mine = ++seq;
    // another case is open: let its close finish (its height collapses) before measuring and gliding to this row
    if (current) {
      if (instant || Util.reduced()) close({ instant, now: true });
      else {
        // keep the new row where it is on screen when the old case's height collapses
        const rw = rowOf(key), y0 = rw.getBoundingClientRect().top;
        close({ now: true, then: () => { if (mine !== seq) return; jump(rw.getBoundingClientRect().top + window.scrollY - y0); go(); } });
        return;
      }
    }
    go();
    function go() {
    current = key;
    const body = dress(section, key);
    if (hash) history.replaceState(null, "", "#" + key);
    const row = rowOf(key);
    const fast = instant || Util.reduced();
    const settled = () => {
      body.classList.remove("is-opening");
      body.classList.add("is-open");
    };
    // glide to the row with the case still shut, then unhide and open it
    const start = () => {
      if (current !== key) return;
      // the case's lazy images wait for the loading beat (begin); the fast path loads them at once
      const lazy = Array.prototype.filter.call(body.querySelectorAll("img[loading=lazy]"), (i) => i.getAttribute("src") && !i.complete);
      if (!fast) lazy.forEach((i) => { i.dataset.src = i.getAttribute("src"); i.removeAttribute("src"); });
      body.hidden = false;
      section.classList.add("open");
      if (row) { row.setAttribute("aria-expanded", "true"); row.setAttribute("aria-controls", key + "-body"); }
      window.dispatchEvent(new Event("resize"));
      const startToy = () => { if (window.Play && matchMedia("(min-width: 900px)").matches) Play.open(section, section.dataset.toy); };
      if (body._anim) { body._anim.cancel(); ["position", "top", "left", "width", "height", "zIndex"].forEach((k) => { body.style[k] = ""; }); }
      body._anim = null;
      body.classList.remove("is-closing");
      const loaded = () => {
        if (scroll && relax) relax();
        const xp = XP_FIRST[key];
        if (xp && window.XP) setTimeout(() => XP.award(xp[0], xp[1], xp[2]), 260);
      };
      const restore = () => body.querySelectorAll("img[data-src]").forEach((i) => { i.setAttribute("src", i.dataset.src); delete i.dataset.src; });
      const ln = loadLine(key, body);
      if (fast) {
        restore();
        // no wipe: the loader line shows briefly, then the case is simply there
        startToy();
        settled();
        ln.querySelector("i").style.transform = "scaleX(1)";
        body._loadMid.style.opacity = 1;
        body._loadMid.lastChild.firstChild.style.transform = "scaleX(1)";
        setTimeout(() => { if (body._loader !== ln) return; dropLoader(body); loaded(); }, 400);
      } else {
        body.classList.remove("is-open");
        body.classList.add("is-opening");
        // the toy and the media start loading only once the empty window is open; ready when the visible images have landed
        const begin = () => {
          if (current !== key) return null;
          startToy();
          restore();
          const imgs = Array.prototype.filter.call(body.querySelectorAll("img"), (i) => i.getBoundingClientRect().top < innerHeight);
          return () => imgs.every((i) => i.complete);
        };
        caseAnim(body, 1, () => { settled(); dropLoader(body); }, loaded, begin);
      }
    };
    if (scroll && !fast) panTo(key, start);
    else {
      start();
      if (scroll) {
        const land = () => { jump(row.getBoundingClientRect().top + window.scrollY - topGap()); midTop(body); };
        land();
        // images and fonts above the row settle after a deep link; land again until the reader moves
        const again = () => { if (relax === again) land(); };
        relax = again;
        if (document.readyState !== "complete") window.addEventListener("load", again, { once: true });
      }
    }
    if (key === "conclusus") watchTaught();
    }
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
