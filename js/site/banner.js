/* Banner: flat cream paper text banner whose worn edges are the live top bar's own wear (the name plate / tab hover paper look).
   Banner.schema  one entry per input {def, min, max, step, rand:[lo,hi]|false, kind}
   Banner.params(seed, overrides)  every input with rand is drawn from the seed (always, so an override never shifts the others), then overrides win
   Banner.draw(canvas, p, {dpr}); Banner.dataURL(p, scale); Banner.ready  promise: the tab corner PNGs are loaded
   mode "plate": the cream is masked as main's .xp-name is: the same two PNGs as 37x28 / 32x28 end caps with a solid strip between, then cut by its clip-path polygon (no Shapes.wear).
   mode "tab": the cream is masked by art/wear/tab-tl.png (18 px wide) and tab-br.png (16 px wide) at the corners with a solid strip between, as css/style.css does, then cut by the tab's clip-path polygon.
   Other inputs: paperVar (cream drift unless paper is overridden, default 0), shadow (drop shadow, off by default). */
(function () {
  "use strict";
  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    let a = typeof seed === "number" ? (seed >>> 0) : hash(String(seed));
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const num = function (def, min, max, step, rand) { return { def: def, min: min, max: max, step: step, rand: rand || false, kind: "num" }; };
  const schema = {
    w: num(320, 20, 2000, 1), h: num(40, 10, 600, 1),
    text: { def: "UNFILED CENSUS HAND", min: 0, max: 80, step: 1, rand: false, kind: "text" },
    mode: { def: "plate", min: 0, max: 8, step: 1, rand: false, kind: "text" },
    font: { def: '"Barlow Condensed", "Arial Narrow", sans-serif', min: 0, max: 80, step: 1, rand: false, kind: "text" },
    fontSize: num(34, 6, 400, 1), letterSpacing: num(0.04, 0, 0.5, 0.005),
    textColor: { def: "#0b0b0b", min: 0, max: 0, step: 1, rand: false, kind: "color" },
    paper: { def: "#f1ecd8", min: 0, max: 0, step: 1, rand: false, kind: "color" },
    tilt: num(-1.2, -6, 6, 0.1, [-2.2, 2.2]),
    tearL: num(20, 0, 120, 0.5, [14, 26]), tearR: num(20, 0, 120, 0.5, [14, 26]),
    padX: num(14, 0, 200, 1),
    paperVar: num(0, 0, 1, 0.01), shadow: num(0, 0, 1, 0.01)
  };

  function params(seed, ov) {
    ov = ov || {};
    const r = rng("banner|" + seed), p = { seed: seed };
    const k = (ov.h != null ? ov.h : schema.h.def) / schema.h.def;
    for (const key in schema) {
      const s = schema[key];
      let v = s.def;
      if (s.rand) {
        v = s.rand[0] + r() * (s.rand[1] - s.rand[0]);
        if (key === "tearL" || key === "tearR") v *= k;
        v = Math.round(v / s.step) * s.step;
      }
      p[key] = v;
    }
    for (const key in ov) if (key in schema) p[key] = ov[key];
    return p;
  }

  // the tab corner masks, loaded once from art/wear next to this script's js/ folder
  const base = document.currentScript ? new URL("../../art/wear/", document.currentScript.src).href : "../art/wear/";
  const tabImg = {};
  const ready = Promise.all(["tab-tl", "tab-br"].map(function (n) {
    return new Promise(function (res) {
      const im = new Image();
      im.onload = im.onerror = function () { tabImg[n] = im; res(); };
      im.src = base + n + ".png";
    });
  }));

  // the tab's static clip-path polygons from css/style.css (odd tab, even tab); Bridge is the first (odd), so even seeds take the odd one
  const TAB_CLIP = [
    "0 6px, 7px 0, 30% 0, 32% 2px, 36% 0, calc(100% - 9px) 0, calc(100% - 6px) 3px, calc(100% - 1px) 4px, 100% 9px, calc(100% - 3px) 50%, calc(100% - 1px) 68%, calc(100% - 5px) 80%, calc(100% - 4px) 100%, 72% 100%, 69% calc(100% - 2px), 64% 100%, 8px 100%, 0 calc(100% - 5px), 2px 70%, 0 45%, 3px 25%",
    "0 8px, 5px 0, 55% 0, 58% 2px, 61% 0, calc(100% - 7px) 0, calc(100% - 2px) 2px, 100% 8px, calc(100% - 4px) 46%, 100% 64%, calc(100% - 2px) 82%, calc(100% - 8px) 100%, 40% 100%, 37% calc(100% - 2px), 33% 100%, 22% calc(100% - 1px), 18% 100%, 6px 100%, 0 calc(100% - 7px), 2px 66%, 0 42%, 3px 22%"
  ];
  // the four top bar tabs' own torn outlines (Bridge, Games, GitHub, Email), picked by the tab's data-seed; mirrored as the fallback in css/style.css
  const NAV_CLIP = [
    "11px 9px, 15px 4px, 20px 5px, 30% 2px, 33% 4px, 62% 0, calc(100% - 7px) 0, calc(100% - 2px) 3px, 100% 8px, calc(100% - 2px) 40%, 100% 58%, calc(100% - 1px) 80%, calc(100% - 3px) 100%, 70% 100%, 67% calc(100% - 2px), 60% 100%, 6px 100%, 1px calc(100% - 6px), 3px 66%, 0 44%, 6px 30%",
    "0 4px, 4px 0, 40% 1px, 43% 3px, 47% 0, calc(100% - 6px) 1px, calc(100% - 1px) 4px, calc(100% - 6px) 30%, calc(100% - 11px) 54%, calc(100% - 8px) 68%, calc(100% - 12px) 82%, calc(100% - 17px) calc(100% - 4px), 75% calc(100% - 6px), 72% calc(100% - 2px), 66% calc(100% - 6px), 30% calc(100% - 4px), 12px 100%, 0 calc(100% - 3px), 2px 60%, 0 40%, 3px 20%",
    "3px 12px, 9px 5px, 14px 0, 50% 0, 53% 2px, 57% 0, calc(100% - 12px) 0, calc(100% - 7px) 4px, calc(100% - 2px) 3px, 100% 12px, calc(100% - 4px) 48%, calc(100% - 1px) 70%, calc(100% - 4px) 100%, 80% 100%, 77% calc(100% - 2px), 71% 100%, 20px 100%, 8px calc(100% - 3px), 1px calc(100% - 9px), 4px 62%, 1px 40%, 5px 28%",
    "8px 6px, 12px 1px, 25% 0, 28% 2px, 33% 0, calc(100% - 14px) 2px, calc(100% - 8px) 5px, calc(100% - 4px) 3px, calc(100% - 9px) 30%, calc(100% - 5px) 52%, calc(100% - 9px) 74%, calc(100% - 7px) calc(100% - 4px), calc(100% - 12px) 100%, 50% 100%, 47% calc(100% - 2px), 42% 100%, 14px 100%, 6px calc(100% - 4px), 9px 72%, 4px 54%, 8px 34%, 5px 20%"
  ];
  // main's .xp-name clip-path polygon (css/style.css), the plate's long edges and corners
  const PLATE_CLIP = TAB_CLIP[0];
  function clipPath2D(src, w, h) {
    const len = function (t, full) {
      const m = /^calc\(100% - ([\d.]+)px\)$/.exec(t);
      return m ? full - parseFloat(m[1]) : t.slice(-1) === "%" ? parseFloat(t) / 100 * full : parseFloat(t);
    };
    const path = new Path2D();
    src.split(/,\s*(?![^(]*\))/).forEach(function (pt, i) {
      const t = pt.trim().split(/\s+(?![^(]*\))/), x = len(t[0], w), y = len(t[1], h);
      if (i) path.lineTo(x, y); else path.moveTo(x, y);
    });
    path.closePath();
    return path;
  }

  // The paper mask in banner space (w x h css px, drawn at dpr): alpha is what stays.
  function maskCanvas(p, dpr) {
    const cv = document.createElement("canvas");
    cv.width = Math.ceil(p.w * dpr); cv.height = Math.ceil(p.h * dpr);
    const g = cv.getContext("2d");
    // tab: the nav tab mask (18/16 px corners, full height); plate: main's .xp-name mask (37x28 / 32x28 end caps, same two PNGs) and clip-path
    const plate = p.mode !== "tab", ml = plate ? 37 : 18, mr = plate ? 32 : 16, mh = plate ? 28 : p.h;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = "#000"; g.fillRect(ml - 1, 0, p.w - ml - mr + 2, p.h);
    if (tabImg["tab-tl"]) g.drawImage(tabImg["tab-tl"], 0, 0, ml, mh);
    if (tabImg["tab-br"]) g.drawImage(tabImg["tab-br"], p.w - mr, p.h - mh, mr, mh);
    // the strip's CSS clip-path polygon cuts the corners and edges on top of the masks
    const k = document.createElement("canvas");
    k.width = cv.width; k.height = cv.height;
    const kg = k.getContext("2d");
    kg.setTransform(dpr, 0, 0, dpr, 0, 0); kg.fillStyle = "#000";
    kg.fill(clipPath2D(plate ? PLATE_CLIP : p.navTab != null ? NAV_CLIP[p.navTab] : TAB_CLIP[(Number(p.seed) || 0) % 2 ? 1 : 0], p.w, p.h));
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "destination-in"; g.drawImage(k, 0, 0);
    return cv;
  }

  // Paper colour: the default cream drifts per seed (hue, lightness) when paperVar > 0, unless paper is overridden
  function paperColor(p) {
    if (p.paper !== schema.paper.def || !p.paperVar) return p.paper;
    const r = rng("banner|paper|" + p.seed);
    const hue = 47 + (r() - 0.5) * 6 * p.paperVar, lig = 88 + (r() - 0.5) * 4 * p.paperVar;
    return "hsl(" + hue.toFixed(1) + "," + (42 + (r() - 0.5) * 8 * p.paperVar).toFixed(1) + "%," + lig.toFixed(1) + "%)";
  }

  function draw(canvas, p, opts) {
    const dpr = (opts && opts.dpr) || 1, rad = p.tilt * Math.PI / 180, cs = Math.cos(rad), sn = Math.sin(rad), cx = p.w / 2, cy = p.h / 2;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    [[0, 0], [p.w, 0], [p.w, p.h], [0, p.h]].forEach(function (q) {
      const x = q[0] - cx, y = q[1] - cy, rx = cx + x * cs - y * sn, ry = cy + x * sn + y * cs;
      x0 = Math.min(x0, rx); y0 = Math.min(y0, ry); x1 = Math.max(x1, rx); y1 = Math.max(y1, ry);
    });
    const sp = p.shadow > 0 ? Math.ceil(4 + 10 * p.shadow * p.h / 40) : 0;
    x0 = Math.floor(x0) - 1 - sp; y0 = Math.floor(y0) - 1 - sp; x1 = Math.ceil(x1) + 1 + sp; y1 = Math.ceil(y1) + 1 + sp;
    const cw = x1 - x0, ch = y1 - y0;
    canvas.width = Math.ceil(cw * dpr); canvas.height = Math.ceil(ch * dpr);
    canvas.style.width = cw + "px"; canvas.style.height = ch + "px";
    const c = canvas.getContext("2d");
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, canvas.width, canvas.height);
    const pc = paperColor(p), paper = document.createElement("canvas");
    paper.width = canvas.width; paper.height = canvas.height;
    const place = function (g) { g.setTransform(dpr, 0, 0, dpr, 0, 0); g.translate(-x0, -y0); g.translate(cx, cy); g.rotate(rad); g.translate(-cx, -cy); };
    // paper: the cream rectangle, kept only where the mask is solid
    let g = paper.getContext("2d");
    place(g); g.fillStyle = pc; g.fillRect(0, 0, p.w, p.h);
    const mk = maskCanvas(p, dpr);
    g.globalCompositeOperation = "destination-in";
    g.drawImage(mk, 0, 0, p.w, p.h);
    if (p.text) {
      g = paper.getContext("2d"); place(g); g.globalCompositeOperation = "source-atop";
      const txt = String(p.text).toUpperCase();
      let fs = p.fontSize;
      g.font = "800 " + fs + "px " + p.font;
      if ("letterSpacing" in g) g.letterSpacing = (p.letterSpacing * fs) + "px";
      const tw = g.measureText(txt).width, room = p.w - 2 * p.padX - p.tearL - p.tearR;
      if (tw > room && room > 0) {
        fs = Math.max(4, fs * room / tw); g.font = "800 " + fs + "px " + p.font;
        if ("letterSpacing" in g) g.letterSpacing = (p.letterSpacing * fs) + "px";
      }
      g.fillStyle = p.textColor; g.textAlign = "center"; g.textBaseline = "middle";
      g.strokeStyle = p.textColor; g.lineWidth = fs * 0.035; g.lineJoin = "round";
      g.strokeText(txt, p.w / 2 + p.letterSpacing * fs / 2, p.h / 2 + fs * 0.04);
      g.fillText(txt, p.w / 2 + p.letterSpacing * fs / 2, p.h / 2 + fs * 0.04);
    }
    if (p.shadow > 0) {
      c.shadowColor = "rgba(0,0,0," + (0.55 * p.shadow) + ")"; c.shadowBlur = sp * 0.8 * dpr; c.shadowOffsetY = sp * 0.25 * dpr;
    }
    c.drawImage(paper, 0, 0);
  }

  function dataURL(p, scale) {
    const cv = document.createElement("canvas");
    draw(cv, p, { dpr: scale || 1 });
    return cv.toDataURL("image/png");
  }

  /* apply(root): paints a seeded banner MASK (no text) as the CSS var --banner: url(png) on every [data-banner="plate|tab"] under root.
     data-banner-on="before" measures the ::before box; data-banner-seed overrides the seed (else a hash of the preset and the element's index). */
  let bnRo = null, bnTimer = 0;
  const bnPending = [];
  function bnBox(el) {
    if (el.dataset.bannerOn === "before") {
      const cs = getComputedStyle(el, "::before"), w = parseFloat(cs.width), h = parseFloat(cs.height);
      return { w: isNaN(w) ? el.offsetWidth : w, h: isNaN(h) ? el.offsetHeight : h };
    }
    return { w: el.offsetWidth, h: el.offsetHeight };
  }
  function bnPaint(el, force) {
    const b = bnBox(el);
    if (b.w <= 0 || b.h <= 0) return;
    const w = Math.round(b.w), h = Math.round(b.h), dpr = window.devicePixelRatio || 1;
    if (!force && el._bnW !== undefined && Math.abs(el._bnW - b.w) < 1 && Math.abs(el._bnH - b.h) < 1 && el._bnDpr === dpr) return;
    if (el._bnSeed === undefined) {
      const all = document.querySelectorAll("[data-banner]");
      el._bnSeed = el.dataset.bannerSeed !== undefined ? el.dataset.bannerSeed : hash(el.dataset.banner + ":" + Array.prototype.indexOf.call(all, el));
    }
    const p = params(el._bnSeed, { mode: el.dataset.banner === "tab" ? "tab" : "plate", w: w, h: h, text: "" });
    if (el.parentNode && el.parentNode.matches("header.topbar nav")) p.navTab = ((Number(el.dataset.seed) - 11) % 4 + 4) % 4;
    el.style.setProperty("--banner", "url(" + dataURL(p, dpr) + ")");
    el._bnW = b.w; el._bnH = b.h; el._bnDpr = dpr;
  }
  async function apply(root) {
    await ready;
    const r = root || document, els = Array.prototype.slice.call(r.querySelectorAll("[data-banner]"));
    if (root && root.matches && root.matches("[data-banner]")) els.unshift(root);
    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      bnPaint(el);
      if (window.ResizeObserver) {
        if (!bnRo) bnRo = new ResizeObserver(function (es) {
          es.forEach(function (e) { bnPending.push(e.target); });
          clearTimeout(bnTimer);
          bnTimer = setTimeout(function () { bnPending.splice(0).forEach(function (t) { bnPaint(t); }); }, 150);
        });
        if (!el._bnRo) { el._bnRo = true; bnRo.observe(el); }
      }
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { apply(); });
  else apply();

  window.Banner = { schema: schema, params: params, draw: draw, dataURL: dataURL, ready: ready, apply: apply };
})();
