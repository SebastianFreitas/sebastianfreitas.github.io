/* play.js — mounts one small interactive "toy" on a case page: a full-page
   canvas that sits behind the article (see css/play.css) and reads pointer,
   scroll and resize on window. Play.start(spec) does the DOM and measurement
   plumbing so a toy only has to supply setup/step/draw/atRest; Play.sprite
   and Play.blit are a tiny pixel-art cache, and Play.glow/Play.award are
   small shared helpers. One Pacer instance drives each toy's loop. */
(function () {
  "use strict";
  const U = window.Util;
  if (!U) return;
  const MIN_W = 900;

  // mount one toy on the current page; null on pages/widths that don't get one
  function start(spec) {
    if (!document.body.classList.contains("page-case")) return null;
    const mainEl = document.querySelector("main.case");
    const topbar = document.querySelector(".topbar");
    const footer = document.querySelector("footer");
    if (!mainEl) return null;

    const mq = matchMedia("(min-width: " + MIN_W + "px)");
    const reduced = U.reduced();

    const canvas = document.createElement("canvas");
    canvas.className = "play";
    canvas.setAttribute("aria-hidden", "true");
    canvas.dataset.play = spec.name;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    let cursorOn = false;
    const V = {
      W: 0, H: 0, dpr: 1, top: 0, sy: 0, docH: 0, t: 0, dt: 0,
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
      const r = mainEl.getBoundingClientRect();
      const cs = getComputedStyle(mainEl);
      V.gutter = parseFloat(cs.paddingLeft) || 0;
      V.main = {
        x: r.left + V.gutter, y: r.top + sy,
        w: r.width - V.gutter - (parseFloat(cs.paddingRight) || 0),
        h: r.height,
      };
      V.band.x0 = Math.round(V.main.x + V.main.w + 16);
      V.band.x1 = V.W - 16;
      V.band.w = V.band.x1 - V.band.x0;
      V.blocks = [];
      const els = [...mainEl.children];
      if (footer) els.push(footer);
      for (const el of els) {
        const b = el.getBoundingClientRect();
        if (b.width < 2 || b.height < 2) continue;
        V.blocks.push({ x: b.left, y: b.top + sy, w: b.width, h: b.height, media: el.matches("video, img, .embed"), el });
      }
      V.docH = document.documentElement.scrollHeight;
    }

    function frame(dt) {
      dt = Math.max(0, dt);
      V.dt = dt; V.t += dt;
      V.sy = window.scrollY;
      V.top = topbar ? Math.max(0, topbar.getBoundingClientRect().bottom) : 0;
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
      ctx.clearRect(0, 0, V.W, V.H);
      spec.draw(ctx, V);
      V.scrolled = false;
    }

    let on = mq.matches && !reduced;
    let pacer;
    if (window.Pacer) pacer = Pacer.create({ paint: frame, atRest: () => !!spec.atRest(V), alive: () => on && !document.hidden });

    const handle = { V, canvas, pacer, measure, stop() { on = false; canvas.hidden = true; } };

    size(); measure(); spec.setup(V); frame(0);
    if (reduced) return handle;   // a still frame only: no loop, no listeners

    if (mq.matches) { if (pacer) pacer.start(); }
    else { canvas.hidden = true; }

    window.addEventListener("pointermove", e => {
      V.pointer.x = e.clientX; V.pointer.y = e.clientY; V.pointer.has = true;
      spec.move && spec.move(e.clientX, e.clientY, V);
    }, { passive: true });

    window.addEventListener("pointerdown", e => {
      if (e.button !== 0 || !on) return;
      const t = e.target;
      if (!(t === document.body || t === document.documentElement || t === mainEl)) return;
      V.pointer.x = e.clientX; V.pointer.y = e.clientY; V.pointer.down = true;
      if (spec.press && spec.press(e.clientX, e.clientY, V)) e.preventDefault();
    });

    function release() {
      if (V.pointer.down) { V.pointer.down = false; spec.release && spec.release(V); }
    }
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);

    window.addEventListener("scroll", () => {
      V.scrolled = true;
      if (pacer) pacer.wake();
      spec.scroll && spec.scroll(V);
    }, { passive: true });

    window.addEventListener("resize", () => {
      size(); measure();
      spec.resize && spec.resize(V);
      const want = mq.matches;
      if (want && !on) { on = true; canvas.hidden = false; if (pacer) pacer.start(); }
      else if (!want && on) { on = false; canvas.hidden = true; }
      if (pacer) pacer.wake();
    });

    window.addEventListener("load", () => {
      measure();
      setTimeout(measure, 800);   // fonts/media settle after load
    });

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
  function glow(ctx, x, y, r, rgb, a) {
    if (a <= 0.003 || r <= 0) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(" + rgb + "," + a + ")");
    g.addColorStop(1, "rgba(" + rgb + ",0)");
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }

  // one XP point, once
  function award(id, label, x, y) {
    if (window.XP && !XP.has(id)) XP.award(id, 1, label, x, y);
  }

  window.Play = { start, sprite, blit, glow, award, MIN_W };
})();
