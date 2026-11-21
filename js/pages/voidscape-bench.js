/* voidscape-bench.js — the VoidScape crafting bench as a stage toy ("vs-bench", Play.stage) in
   "The bench". Paints Forge.bench into the stage canvas. Parts never run out; four tiles
   pick the gun's base. Nothing animates at idle; only a flashing button needs frames. */
window.VoidBench = (function () {
  const P = window.Play, F = window.Forge;
  if (!P || !F) return { gun: () => (F ? F.gun() : null) };
  const B = F.bench;
  const BTN = [{ k: "add", y: 140 }, { k: "remove", y: 168 }, { k: "scrap", y: 196 }];   // bench-space button rows (forge.js)
  const BTN_W = 190, BTN_H = 24;

  let V = null, scale = 1, ox = 0, oy = 0, hover = -1, changed = false;

  function layout(v) {
    V = v;
    scale = Math.min(V.W * 0.86 / B.W, V.H * 0.8 / B.H, 2.4);
    ox = Math.round((V.W - B.W * scale) / 2);
    oy = Math.round((V.H - B.H * scale) / 2);
  }
  function setup(v) { layout(v); }

  function step(dt) { B.step(dt); }
  function atRest() { return !B.lively(); }

  function bracket(ctx) {
    const b = BTN[0], L = 8, T = 2, pad = 4;
    const l = ox + (-pad) * scale, t = oy + (b.y - pad) * scale;
    const r = ox + (BTN_W + pad) * scale, bt = oy + (b.y + BTN_H + pad) * scale;
    ctx.fillStyle = "#f1ecd8";
    for (const [x, y, dx, dy] of [[l, t, 1, 1], [r, t, -1, 1], [l, bt, 1, -1], [r, bt, -1, -1]]) {
      ctx.fillRect(dx > 0 ? x : x - L, dy > 0 ? y : y - T, L, T);
      ctx.fillRect(dx > 0 ? x : x - T, dy > 0 ? y : y - L, T, L);
    }
  }

  function draw(ctx) {
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);
    B.draw(ctx, 0, 0);
    ctx.restore();
    if (!changed) bracket(ctx);
  }

  const buttonAt = (x, y) => BTN.findIndex(b => x >= ox && x <= ox + BTN_W * scale && y >= oy + b.y * scale && y <= oy + (b.y + BTN_H) * scale);
  const pickRect = i => ({ x: B.pick.x + i * B.pick.step, y: B.pick.y, w: B.pick.w, h: B.pick.h });
  const local =(x, y) => ({ x: (x - ox) / scale, y: (y - oy) / scale });

  function press(x, y) {
    const p = local(x, y);
    return !!B.hit(p.x, p.y);
  }
  function move(x, y) {
    const p = local(x, y);
    const h = buttonAt(x, y);
    V.cursor(B.over(p.x, p.y));
    if (h === hover) return false;
    hover = h;
    return true;
  }

  // a finished bench change
  document.addEventListener("forge:gun", function () {
    changed = true;
    document.dispatchEvent(new CustomEvent("voidbench:gun"));
  });

  function report() {
    const g = F.gun();
    const r = V ? V.canvas.getBoundingClientRect() : null, k = r ? r.width / V.W : 1;
    const at = b => ({ x: r.left + (ox + BTN_W / 2 * scale) * k, y: r.top + (oy + (b.y + BTN_H / 2) * scale) * k });
    const pickAt = i => { const q = pickRect(i); return { x: r.left + (ox + (q.x + q.w / 2) * scale) * k, y: r.top + (oy + (q.y + q.h / 2) * scale) * k, w: q.w * scale * k, h: q.h * scale * k }; };
    const picker = {};
    if (r) B.bases.forEach((n, i) => { picker[n] = pickAt(i); });
    return {
      gun: { type: g.type, level: g.level, mods: g.mods.length, base: B.baseOf(g.type) },
      parts: null,
      marker: !changed,
      targets: r ? Object.assign({ add: at(BTN[0]), remove: at(BTN[1]), scrap: at(BTN[2]) }, picker) : null,
    };
  }

  P.register({ name: "vs-bench", seed: 9, tick: 250, setup, step, draw, resize: layout, atRest, press, move });
  return { gun: () => F.gun(), report };
})();
