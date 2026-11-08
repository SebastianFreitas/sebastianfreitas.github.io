/* BannerLab: tool page for Banner. A control per Banner.schema key, a seed, locks, a sheet of seeded variants, PNG export.
   Locked inputs (and every non-random input) hold across the sheet; unlocked random inputs come from each seed.
   URL hash #seed=..&lock=a,b&p.key=..; URL mode ?sheet=N&seed=S[&set=key:val,..] renders only the sheet onto canvas#cv. */
(function () {
  "use strict";
  const S = Banner.schema, KEYS = Object.keys(S);
  const FONT = '700 26px "Barlow Condensed"';
  const PRESETS = {
    Plate: { w: 300, h: 28, fontSize: 26, tearL: 20, tearR: 20, tilt: -1.2, mode: "plate" },
    Tab: { w: 107, h: 48, fontSize: 22, tearL: 12, tearR: 8, tilt: 1.7, padX: 8, text: "BRIDGE", mode: "tab" }
  };
  const st = { seed: 7, lock: {}, p: {}, n: 24 };
  const ui = {};

  function clamp(k, v) {
    const s = S[k];
    if (s.kind !== "num") return v;
    v = parseFloat(v);
    if (isNaN(v)) return s.def;
    return Math.min(s.max, Math.max(s.min, v));
  }
  function overrides() {
    const ov = {};
    KEYS.forEach(function (k) { if (!S[k].rand || st.lock[k]) ov[k] = k in st.p ? st.p[k] : S[k].def; });
    return ov;
  }
  function resolve(seed) { return Banner.params(seed, overrides()); }

  // ---- hash
  function writeHash() {
    const a = ["seed=" + st.seed];
    const lk = KEYS.filter(function (k) { return st.lock[k]; });
    if (lk.length) a.push("lock=" + lk.join(","));
    KEYS.forEach(function (k) {
      if (k in st.p && (st.lock[k] || (!S[k].rand && st.p[k] !== S[k].def))) a.push("p." + k + "=" + encodeURIComponent(st.p[k]));
    });
    history.replaceState(null, "", "#" + a.join("&"));
  }
  function readHash() {
    location.hash.slice(1).split("&").forEach(function (kv) {
      const i = kv.indexOf("="), k = kv.slice(0, i), v = decodeURIComponent(kv.slice(i + 1));
      if (k === "seed") st.seed = parseInt(v, 10) || 0;
      else if (k === "lock") v.split(",").forEach(function (x) { if (x in S) st.lock[x] = true; });
      else if (k.indexOf("p.") === 0 && k.slice(2) in S) st.p[k.slice(2)] = S[k.slice(2)].kind === "num" ? clamp(k.slice(2), v) : v;
    });
  }

  // ---- sheet (shared by page and ?sheet mode)
  function renderSheet(cv, seed, n, ov, true_size) {
    const cells = [];
    let cw = 0, ch = 0;
    for (let i = 0; i < n; i++) {
      const sd = seed + i, p = Banner.params(sd, ov), c = document.createElement("canvas");
      const x3 = true_size && p.w <= 120;
      Banner.draw(c, p, { dpr: x3 ? 3 : 1 });
      cells.push({ seed: sd, c: c, label: x3 ? "s" + sd + " x3" : String(sd) });
      cw = Math.max(cw, c.width); ch = Math.max(ch, c.height);
    }
    cw += 16; ch += 22;
    const cols = Math.max(1, Math.min(n, Math.floor((true_size ? 2000 : 1400) / cw))), rows = Math.ceil(n / cols);
    cv.width = cols * cw; cv.height = rows * ch;
    const g = cv.getContext("2d");
    g.fillStyle = "#040405"; g.fillRect(0, 0, cv.width, cv.height);
    g.font = "10px system-ui, sans-serif"; g.fillStyle = "#6f6d63"; g.textBaseline = "top";
    cells.forEach(function (e, i) {
      const x = (i % cols) * cw, y = Math.floor(i / cols) * ch;
      g.drawImage(e.c, x + (cw - e.c.width) / 2, y + 16 + (ch - 22 - e.c.height) / 2);
      g.fillText(e.label, x + 4, y + 3);
    });
    cv._grid = { cw: cw, ch: ch, cols: cols, n: n, seed: seed };
  }

  // ---- preview
  function download(url, name) { const a = document.createElement("a"); a.href = url; a.download = name; a.click(); }
  function exportPng() {
    const p = resolve(st.seed);
    [2, 4].forEach(function (s, i) { setTimeout(function () { download(Banner.dataURL(p, s), "banner-" + st.seed + "-" + s + "x.png"); }, i * 300); });
  }
  function setCtl(k, v) {
    const r = ui[k];
    if (r.num) r.num.value = v;
    if (r.rng) r.rng.value = v;
    if (r.chk) r.chk.checked = !!v;
    if (r.txt) r.txt.value = v;
    if (r.col) r.col.value = v;
  }
  function refresh() {
    const p = resolve(st.seed);
    KEYS.forEach(function (k) { if (!(st.lock[k] && k in st.p)) setCtl(k, p[k]); });
    ui.seed.value = st.seed;
    Banner.draw(ui.big, p, { dpr: 3 });
    ui.big.style.width = ui.big.width + "px"; ui.big.style.height = ui.big.height + "px";
    Banner.draw(ui.small, p, { dpr: 1 });
    writeHash();
  }
  function sheet() { renderSheet(ui.sheet, st.seed, st.n, overrides()); }
  function setLock(k, on, keep) {
    if (on) { if (!keep) st.p[k] = resolve(st.seed)[k]; st.lock[k] = true; } else delete st.lock[k];
    ui[k].lk.classList.toggle("on", !!on);
  }
  function edit(k, v) {
    st.p[k] = clamp(k, v);
    if (S[k].rand) setLock(k, true, true);
    refresh();
  }

  // ---- controls
  function mk(tag, attrs, par) {
    const e = document.createElement(tag);
    for (const a in attrs) e[a] = attrs[a];
    if (par) par.appendChild(e);
    return e;
  }
  function build() {
    const ctl = document.getElementById("ctl");
    const bar = mk("div", { id: "bar" }, ctl);
    const sr = mk("div", { className: "row" }, ctl);
    mk("label", { textContent: "seed" }, sr);
    ui.seed = mk("input", { type: "number", step: 1 }, sr);
    ui.seed.onchange = function () { st.seed = parseInt(ui.seed.value, 10) || 0; refresh(); };
    const sb = function (t, f) { mk("button", { textContent: t, onclick: function () { f(); refresh(); } }, sr); };
    sb("Random", function () { st.seed = Math.floor(Math.random() * 1e6); });
    sb("-", function () { st.seed--; });
    sb("+", function () { st.seed++; });
    const bt = function (t, f) { mk("button", { textContent: t, onclick: f }, bar); };
    Object.keys(PRESETS).forEach(function (n) {
      bt(n, function () {
        const q = PRESETS[n];
        for (const k in q) st.p[k] = q[k];
        ["w", "h", "tearL", "tearR", "tilt", "fontSize", "padX"].forEach(function (k) { if (k in q) setLock(k, S[k].rand ? true : false, true); });
        if (!("padX" in q)) st.p.padX = S.padX.def;
        if (!("fontSize" in q)) st.p.fontSize = S.fontSize.def;
        refresh();
      });
    });
    bt("Copy params", function () { navigator.clipboard.writeText(JSON.stringify(resolve(st.seed), null, 1)); });
    bt("Export PNG", exportPng);
    bt("Sheet", sheet);
    ui.nbox = mk("input", { type: "number", value: st.n, min: 1, max: 200, style: "width:48px", onchange: function () { st.n = Math.max(1, Math.min(200, parseInt(ui.nbox.value, 10) || 24)); } }, bar);
    KEYS.forEach(function (k) {
      const s = S[k], r = ui[k] = {}, row = mk("div", { className: "row" }, ctl);
      mk("label", { textContent: k, title: k }, row);
      const on = function (e) { return function () { edit(k, e()); }; };
      if (s.kind === "num") {
        r.rng = mk("input", { type: "range", min: s.min, max: s.max, step: s.step }, row);
        r.num = mk("input", { type: "number", min: s.min, max: s.max, step: s.step }, row);
        r.rng.oninput = on(function () { return r.rng.value; });
        r.num.onchange = on(function () { return r.num.value; });
      } else if (s.kind === "bool") {
        r.chk = mk("input", { type: "checkbox" }, row);
        r.chk.onchange = on(function () { return r.chk.checked; });
      } else if (s.kind === "color") {
        r.col = mk("input", { type: "color" }, row);
        r.col.oninput = on(function () { return r.col.value; });
      } else {
        r.txt = mk("input", { type: "text" }, row);
        r.txt.oninput = on(function () { return r.txt.value; });
      }
      r.lk = mk("button", { className: "lock", textContent: "L", title: "lock: hold this value across the sheet" }, row);
      r.lk.onclick = function () { setLock(k, !st.lock[k]); refresh(); };
      if (st.lock[k]) r.lk.classList.add("on");
    });
    ui.sheet.onclick = function (e) {
      const g = ui.sheet._grid;
      if (!g) return;
      const b = ui.sheet.getBoundingClientRect(), x = (e.clientX - b.left) * ui.sheet.width / b.width, y = (e.clientY - b.top) * ui.sheet.height / b.height;
      const i = Math.floor(y / g.ch) * g.cols + Math.floor(x / g.cw);
      if (i < 0 || i >= g.n) return;
      st.seed = g.seed + i;
      refresh();
      if (e.shiftKey) exportPng();
    };
  }

  function sheetMode(q) {
    document.getElementById("app").style.display = "none";
    const cv = document.createElement("canvas");
    cv.id = "cv"; cv.className = "only"; document.body.appendChild(cv);
    const ov = {};
    (q.get("set") || "").split(",").forEach(function (kv) {
      const i = kv.indexOf(":"), k = kv.slice(0, i), v = kv.slice(i + 1);
      if (k in S) ov[k] = S[k].kind === "num" ? clamp(k, v) : v;
    });
    renderSheet(cv, parseInt(q.get("seed"), 10) || 0, Math.max(1, Math.min(200, parseInt(q.get("sheet"), 10) || 24)), ov, true);
    document.title = "ready";
  }

  function start() {
    const q = new URLSearchParams(location.search);
    if (q.get("sheet")) return sheetMode(q);
    ui.big = document.getElementById("big"); ui.small = document.getElementById("small"); ui.sheet = document.getElementById("sheet");
    readHash();
    build();
    refresh();
    sheet();
  }
  const ready = document.fonts && document.fonts.load ? document.fonts.load(FONT).catch(function () {}) : Promise.resolve();
  ready.then(function () { return Banner.ready; }).then(start);

  window.BannerLab = { state: st, resolve: resolve };
})();
