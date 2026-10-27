/* play.js — mounts one small interactive "toy" on a case page: a full-page
   canvas that sits behind the article (see css/play.css) and reads pointer,
   scroll and resize on window. Play.register(spec) stores a toy and Play.open(folder, name)
   runs it behind the open folder (Play.close stops it; Play.mount adds its panels). It does the DOM and measurement
   plumbing so a toy only has to supply setup/step/draw/atRest; Play.sprite
   and Play.blit are a tiny pixel-art cache, and Play.glow/Play.award are
   small shared helpers. One Pacer instance drives each toy's loop. Toys with
   doc: true also get .play-tiles, a pool of 1024 px canvases in page coordinates
   painted through spec.drawDoc(ctx, V), which scroll with the text. */
(function () {
  "use strict";
  const U = window.Util;
  if (!U) return;
  const MIN_W = 900;
  const TILE = 1024;
  const TILE_PAD = 200;

  const toys = {};       // name -> { spec, handle, panels, resume }
  let current = null;    // name of the open toy, or null

  // toys register a spec; the toy runs only while its folder is open
  function register(spec) {
    if (!toys[spec.name]) toys[spec.name] = { spec, handle: null, panels: [], resume: null };
    return null;
  }

  // open the toy `name` behind folder `rootEl`; null under MIN_W or when unregistered
  function open(rootEl, name) {
    const toy = toys[name];
    if (!toy || !rootEl) return null;
    if (!matchMedia("(min-width: " + MIN_W + "px)").matches) return null;
    if (current && current !== name) close();
    current = name;
    glowDoc = !!toy.spec.doc;
    if (!toy.handle) { toy.handle = build(toy.spec, rootEl); return toy.handle; }
    toy.resume(rootEl);
    return toy.handle;
  }

  function close() {
    const toy = current && toys[current];
    current = null;
    if (!toy || !toy.handle) return;
    toy.handle.stop();
    toy.handle.V.cursor(false);
    for (const el of toy.panels) el.dataset.off = "";
  }

  // a panel/overlay owned by the toy being opened: appended to body, hidden with the toy
  function mount(el) {
    document.body.appendChild(el);
    const toy = current && toys[current];
    if (toy) toy.panels.push(el);
    return el;
  }

  function handle(name) { return toys[name] ? toys[name].handle : null; }

  // build one toy on first open (the old start body)
  function build(spec, rootEl) {
    const name = spec.name;
    let mainEl = rootEl.querySelector(".case");
    const topbar = document.querySelector(".topbar");
    if (!mainEl) return null;

    const mq = matchMedia("(min-width: " + MIN_W + "px)");
    const reduced = U.reduced();

    const canvas = document.createElement("canvas");
    canvas.className = "play";
    canvas.setAttribute("aria-hidden", "true");
    canvas.dataset.play = spec.name;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    // page tiles (spec.doc): canvases in page coordinates that scroll with the text
    let tiles = null;
    if (spec.doc) {
      const el = document.createElement("div");
      el.className = "play-tiles";
      el.setAttribute("aria-hidden", "true");
      el.dataset.play = spec.name;
      document.body.appendChild(el);
      tiles = { el, pool: [], x0: -1, right: 0, docH: 0, n: 0, dpr: 0, w: 0 };
    }

    let cursorOn = false;
    let topDirty = true;
    let syCache = window.scrollY;   // written by the passive scroll listener, never read in rAF
    const V = {
      W: 0, H: 0, L: 0, R: 0, dpr: 1, top: 0, sy: 0, docH: 0, t: 0, dt: 0,
      main: { x: 0, y: 0, w: 0, h: 0 }, gutter: 0, band: { x0: 0, x1: 0, w: 0 },
      blocks: [], vis: [], rnd: U.mulberry(spec.seed || 1),
      pointer: { x: -1, y: -1, down: false, has: false },
      scrolled: false, reduced, canvas, ctx, mainEl, topbar,
      wake() { if (pacer) pacer.wake(); },
      cursor(on) { if (on !== cursorOn) { cursorOn = on; document.body.style.cursor = on ? "pointer" : ""; } },
      // viewport-space rect: on-screen below the topbar and clear of every visible block
      free(x, y, w, h) {
        if (x < 0 || y < V.top || x + w > V.W || y + h > V.H) return false;
        for (let i = 0; i < V.vis.length; i++) {
          const b = V.vis[i];
          if (x < b.x + b.w && x + w > b.x && y < b.y + b.h && y + h > b.y) return false;
        }
        return true;
      },
      blockAt(x, y) {
        for (let i = 0; i < V.vis.length; i++) {
          const b = V.vis[i];
          if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return i;
        }
        return -1;
      },
    };

    function size() {
      V.W = innerWidth; V.H = innerHeight;
      V.dpr = Math.min(2, devicePixelRatio || 1);
      canvas.width = Math.round(V.W * V.dpr);
      canvas.height = Math.round(V.H * V.dpr);
      canvas.style.width = V.W + "px";
      canvas.style.height = V.H + "px";
      ctx.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
    }

    // document-space: main's content box, the free band to its right, and every child's rect
    function measure() {
      V.top = topbar ? Math.max(0, topbar.getBoundingClientRect().bottom) : 0;
      const sy = window.scrollY;
      syCache = sy;
      const r = mainEl.getBoundingClientRect();
      const cs = getComputedStyle(mainEl);
      V.gutter = parseFloat(cs.paddingLeft) || 0;
      V.main = {
        x: r.left + V.gutter, y: r.top + sy,
        w: r.width - V.gutter - (parseFloat(cs.paddingRight) || 0),
        h: r.height,
      };
      V.band.x0 = Math.round(V.main.x + V.main.w + 16);
      // the open folder's inner box: toys lay out between L and R, not the viewport edges
      const fr = rootEl.getBoundingClientRect();
      V.L = Math.max(0, fr.left + rootEl.clientLeft); V.R = Math.min(V.W, fr.right - rootEl.clientLeft);
      V.band.x1 = V.R - 16;
      document.documentElement.style.setProperty('--play-r', (V.W - V.R + 16) + 'px');   // panels and hints stay inside the frame
      V.band.w = V.band.x1 - V.band.x0;
      V.blocks = [];
      const els = [...mainEl.children];
      for (const el of els) {
        const b = el.getBoundingClientRect();
        if (b.width < 2 || b.height < 2) continue;
        V.blocks.push({ x: b.left, y: b.top + sy, w: b.width, h: b.height, media: el.matches("video, img, .embed"), el });
      }
      if (tiles) {
        const was = tiles.el.hidden;
        tiles.el.hidden = true;
        V.docH = document.documentElement.scrollHeight;
        tiles.right = document.documentElement.clientWidth;
        tiles.el.hidden = was;
        layoutTiles();
      } else V.docH = document.documentElement.scrollHeight;
    }

    function tileX0() {
      return Math.max(0, Math.floor(typeof spec.docX0 === "number" ? spec.docX0 : V.band.x0 - 128));
    }

    function layoutTiles() {
      const x0 = tileX0();
      const w = Math.max(0, tiles.right - x0);
      const docH = V.docH;
      tiles.x0 = x0; tiles.w = w; tiles.docH = docH;
      tiles.n = Math.ceil(docH / TILE);
      tiles.dpr = V.dpr;
      const st = tiles.el.style;
      st.left = x0 + "px"; st.top = "0px"; st.width = w + "px"; st.height = docH + "px";
      const want = V.reduced ? tiles.n : Math.min(tiles.n, Math.ceil((V.H + 2 * TILE_PAD) / TILE) + 1);
      while (tiles.pool.length < want) {
        const cv = document.createElement("canvas");
        cv.style.display = "none";
        tiles.el.appendChild(cv);
        tiles.pool.push({ cv, g: cv.getContext("2d"), slot: -1, h: 0 });
      }
      while (tiles.pool.length > want) tiles.pool.pop().cv.remove();
      for (const e of tiles.pool) { e.slot = -1; e.cv.style.display = "none"; }
    }

    function paintTiles() {
      if (tileX0() !== tiles.x0 || V.dpr !== tiles.dpr) layoutTiles();
      if (tiles.w <= 0) return;
      const pool = tiles.pool;
      let lo = 0, hi = tiles.n - 1;
      if (!V.reduced) {
        lo = Math.max(0, Math.floor((V.sy - TILE_PAD) / TILE));
        hi = Math.min(tiles.n - 1, Math.floor((V.sy + V.H + TILE_PAD - 1) / TILE));
      }
      for (const e of pool) if (e.slot < lo || e.slot > hi) e.slot = -1;
      for (let s = lo; s <= hi; s++) {
        let held = false;
        for (const e of pool) if (e.slot === s) { held = true; break; }
        if (held) continue;
        let e = null;
        for (const q of pool) if (q.slot === -1) { e = q; break; }
        if (!e) continue;
        const h = Math.min(TILE, tiles.docH - s * TILE);
        const cv = e.cv;
        if (cv.width !== Math.round(tiles.w * V.dpr) || cv.height !== Math.round(h * V.dpr)) {
          cv.width = Math.round(tiles.w * V.dpr);
          cv.height = Math.round(h * V.dpr);
          cv.style.width = tiles.w + "px";
          cv.style.height = h + "px";
        }
        e.h = h;
        cv.style.transform = "translateY(" + (s * TILE) + "px)";
        cv.style.display = "";
        e.slot = s;
      }
      for (const e of pool) {
        if (e.slot === -1) {
          if (e.cv.style.display !== "none") e.cv.style.display = "none";
          continue;
        }
        const g = e.g;
        g.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
        g.imageSmoothingEnabled = false;
        g.clearRect(0, 0, tiles.w, e.h);
        g.save();
        g.beginPath();
        g.rect(fL - tiles.x0, fT + V.sy - e.slot * TILE, fW, fH);
        g.clip();
        g.translate(-tiles.x0, -e.slot * TILE);
        spec.drawDoc(g, V);
        g.restore();
      }
    }

    let fL = 0, fT = 0, fW = 0, fH = 0, panelB = -1, frames = 0;
    function frame(dt) {
      frames++;
      dt = Math.max(0, dt);
      V.dt = dt; V.t += dt;
      V.sy = syCache;
      if (topDirty) {
        V.top = topbar ? Math.max(0, topbar.getBoundingClientRect().bottom) : 0;
        topDirty = false;
      }
      // rebuild the viewport-space visible list in place, reusing pooled objects
      let n = 0;
      for (let i = 0; i < V.blocks.length; i++) {
        const b = V.blocks[i];
        if (b.y - V.sy < V.H && b.y + b.h - V.sy > 0) {
          let o = V.vis[n];
          if (!o) { o = {}; V.vis[n] = o; }
          o.x = b.x; o.y = b.y - V.sy; o.w = b.w; o.h = b.h; o.media = b.media; o.el = b.el;
          n++;
        }
      }
      V.vis.length = n;
      spec.step(dt, V);
      // read the open folder's inner box before any style write; nothing the toy paints may leave it
      const fr = rootEl.getBoundingClientRect();
      fL = fr.left + rootEl.clientLeft; fT = fr.top + rootEl.clientTop;
      fW = fr.right - rootEl.clientLeft - fL; fH = fr.bottom - rootEl.clientTop - fT;
      // fixed panels and hints ride up with the frame's bottom edge near the folder's end
      const pb = Math.max(0, Math.round(V.H - (fr.bottom - (rootEl.offsetHeight - rootEl.clientHeight - rootEl.clientTop))));
      if (pb !== panelB) { panelB = pb; document.documentElement.style.setProperty('--play-b', pb + 'px'); }
      ctx.clearRect(0, 0, V.W, V.H);
      ctx.save(); ctx.beginPath(); ctx.rect(fL, fT, fW, fH); ctx.clip();
      spec.draw(ctx, V);
      ctx.restore();
      if (tiles && spec.drawDoc) paintTiles();
      V.scrolled = false;
    }

    let on = mq.matches && !reduced;
    let pacer;
    if (window.Pacer) pacer = Pacer.create({ paint: frame, atRest: () => !!spec.atRest(V), alive: () => on && !document.hidden, scrollWake: !!spec.doc });

    const handle = { V, canvas, pacer, measure, tiles: tiles ? tiles.el : null, painted: () => frames >= 2 || reduced,
      stop() { on = false; canvas.hidden = true; if (tiles) tiles.el.hidden = true; } };
    const toy = toys[name];
    // later opens: show again and remeasure
    toy.resume = function (root) {
      rootEl = root; panelB = -1;
      mainEl = root.querySelector(".case") || mainEl;
      V.mainEl = mainEl;
      for (const el of toy.panels) delete el.dataset.off;
      canvas.hidden = false; if (tiles) tiles.el.hidden = false;
      size(); measure();
      spec.resize && spec.resize(V);
      if (reduced) return;
      on = true;
      if (pacer) pacer.start();
    };

    size(); measure(); spec.setup(V); frame(0);
    if (reduced) return handle;   // a still frame only: no loop, no listeners

    if (mq.matches) { if (pacer) pacer.start(); }
    else { canvas.hidden = true; if (tiles) tiles.el.hidden = true; }

    window.addEventListener("pointermove", e => {
      if (!on) return;
      V.pointer.x = e.clientX; V.pointer.y = e.clientY; V.pointer.has = true;
      spec.move && spec.move(e.clientX, e.clientY, V);
    }, { passive: true });

    window.addEventListener("pointerdown", e => {
      if (e.button !== 0 || !on) return;
      const t = e.target;
      const bare = t === document.body || t === document.documentElement || t === rootEl || t === mainEl || t === rootEl.parentElement;
      if (!bare && !(t instanceof Element && rootEl.contains(t) &&
        !t.closest("a, button, input, select, textarea, summary, video, [tabindex], p, h1, h2, h3, h4, h5, h6, li, figure, img, dt, dd"))) return;
      V.pointer.x = e.clientX; V.pointer.y = e.clientY; V.pointer.down = true;
      if (spec.press && spec.press(e.clientX, e.clientY, V)) e.preventDefault();
    });

    function release() {
      if (V.pointer.down) { V.pointer.down = false; spec.release && spec.release(V); }
    }
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);

    window.addEventListener("scroll", () => {
      if (current !== name) return;
      syCache = window.scrollY;
      V.scrolled = true;
      if (pacer && !spec.doc) pacer.wake();
      spec.scroll && spec.scroll(V);
    }, { passive: true });

    window.addEventListener("resize", () => {
      if (current !== name) return;
      size(); measure();
      topDirty = true;
      spec.resize && spec.resize(V);
      const want = mq.matches;
      if (want && !on) { on = true; canvas.hidden = false; if (tiles) tiles.el.hidden = false; if (pacer) pacer.start(); }
      else if (!want && on) { on = false; canvas.hidden = true; if (tiles) tiles.el.hidden = true; V.cursor(false); }
      if (pacer) pacer.wake();
    });

    window.addEventListener("load", () => {
      if (current !== name) return;
      measure();
      if (pacer) pacer.wake();
    });

    // fonts/media settling (and any later reflow of the column) remeasure, debounced
    if ("ResizeObserver" in window) {
      let roTimer = 0;
      const roMain = new ResizeObserver(() => {
        clearTimeout(roTimer);
        roTimer = setTimeout(() => { if (current !== name) return; const l0 = V.L, r0 = V.R; measure(); if ((V.L !== l0 || V.R !== r0) && spec.resize) spec.resize(V); if (pacer) pacer.wake(); }, 150);
      });
      roMain.observe(mainEl); roMain.observe(rootEl);
    }

    // the folder grows and shrinks while it opens and closes: redraw the clip with it
    if ("ResizeObserver" in window) new ResizeObserver(() => { if (current === name && pacer) pacer.wake(); }).observe(rootEl);

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && on) { if (pacer) pacer.start(); }
    });

    return handle;
  }

  // pixel sprite at scale S (default 2x), cached per scale on the def object; def = {w, h, ox, oy, px}, px = w*h letters
  function sprite(pal, def, scale) {
    const S = scale || 2;
    const key = "_s" + S;
    if (def[key]) return def[key];
    if (def.px.length !== def.w * def.h) {
      console.warn("play sprite " + def.w + "x" + def.h + " has " + def.px.length + " px");
      return def[key] = null;
    }
    const cv = document.createElement("canvas");
    cv.width = def.w * S;
    cv.height = def.h * S;
    const g = cv.getContext("2d");
    for (let y = 0; y < def.h; y++) {
      let x = 0;
      while (x < def.w) {
        const c = def.px[y * def.w + x];
        if (c === ".") { x++; continue; }
        let run = 1;
        while (x + run < def.w && def.px[y * def.w + x + run] === c) run++;
        g.fillStyle = pal[c.charCodeAt(0) - 97];
        g.fillRect(x * S, y * S, run * S, S);
        x += run;
      }
    }
    return def[key] = { cv, w: def.w * S, h: def.h * S, ox: def.ox * S, oy: def.oy * S, scale: S };
  }

  // draw a cached sprite with its top-left at (x, y), mirrored horizontally when flip
  function blit(ctx, s, x, y, flip) {
    if (!s) return;
    if (!flip) { ctx.drawImage(s.cv, Math.round(x), Math.round(y)); return; }
    ctx.save();
    ctx.translate(Math.round(x) + s.w, Math.round(y));
    ctx.scale(-1, 1);
    ctx.drawImage(s.cv, 0, 0);
    ctx.restore();
  }

  // a soft radial glow of radius r centred on (x, y); rgb is "r,g,b"
  let glowDoc = false;   // a doc: true toy is on the page: 4 px radius buckets, 128-entry oldest-first cache
  const glowCache = new Map();
  function glow(ctx, x, y, r, rgb, a) {
    if (a <= 0.003 || r <= 0) return;
    const R = glowDoc ? Math.max(4, Math.round(r / 4) * 4) : Math.max(1, Math.round(r));
    const key = rgb + "|" + R;
    let sprite = glowCache.get(key);
    if (!sprite) {
      const cv = document.createElement("canvas");
      cv.width = R * 2; cv.height = R * 2;
      const g2 = cv.getContext("2d");
      const g = g2.createRadialGradient(R, R, 0, R, R, R);
      g.addColorStop(0, "rgba(" + rgb + ",1)");
      g.addColorStop(1, "rgba(" + rgb + ",0)");
      g2.beginPath();
      g2.arc(R, R, R, 0, Math.PI * 2);
      g2.fillStyle = g;
      g2.fill();
      sprite = cv;
      if (glowDoc) { if (glowCache.size >= 128) glowCache.delete(glowCache.keys().next().value); }
      else if (glowCache.size >= 64) glowCache.clear();
      glowCache.set(key, sprite);
    }
    const prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = Math.min(1, a);
    if (glowDoc) ctx.drawImage(sprite, x - r, y - r, r * 2, r * 2); else ctx.drawImage(sprite, x - R, y - R);
    ctx.globalAlpha = prevAlpha;
  }

  // case-page toys give no XP any more (the bridge is the only place that does); kept so callers don't break
  function award() {}

  // true once the toy `name` has painted two frames (or has no built toy to wait for)
  function painted(name) { const h = handle(name); return !h || h.painted(); }

  window.Play = { register, start: register, open, close, mount, handle, painted, get current() { return current; }, sprite, blit, glow, award, MIN_W };
})();
