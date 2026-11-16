/* voidscape-bench.js — the VoidScape crafting bench as a stage toy ("vs-bench", Play.stage) in
   "The bench". Paints Forge.bench into the stage canvas. The gun built here is the gun the range
   below fires: every finished change hands it to PlayRange.arm. Gun parts pay for the changes
   (Forge.bench.parts). Nothing animates at idle; only a flashing button needs frames. */
window.VoidBench = (function () {
  const P = window.Play, F = window.Forge;
  if (!P || !F) return { gun: () => (F ? F.gun() : null) };
  const B = F.bench;
  const START_PARTS = 30;
  const BTN = [{ k: "add", y: 140 }, { k: "remove", y: 168 }, { k: "scrap", y: 196 }];   // bench-space button rows (forge.js)
  const BTN_W = 190, BTN_H = 24;

  let V = null, scale = 1, ox = 0, oy = 0, hover = -1, changed = false;
  B.parts(START_PARTS);

  function layout(v) {
    V = v;
    scale = Math.min(V.W * 0.86 / B.W, V.H * 0.8 / B.H, 2.4);
    ox = Math.round((V.W - B.W * scale) / 2);
    oy = Math.round((V.H - B.H * scale) / 2);
  }
  function setup(v) { layout(v); status(); }
  function status() { if (V) V.status("Gun parts: " + B.parts()); }

  function step(dt) { B.step(dt); status(); }
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
  const local = (x, y) => ({ x: (x - ox) / scale, y: (y - oy) / scale });

  function press(x, y) {
    const p = local(x, y);
    return !!B.hit(p.x, p.y);
  }
  function move(x, y) {
    const h = buttonAt(x, y);
    V.cursor(h >= 0);
    if (h === hover) return false;
    hover = h;
    return true;
  }

  // a finished bench change: the gun built here is the one the range fires
  document.addEventListener("forge:gun", function () {
    changed = true;
    document.dispatchEvent(new CustomEvent("voidbench:gun"));
    if (window.PlayRange) PlayRange.arm(F.gun());
  });

  function report() {
    const g = F.gun();
    const r = V ? V.canvas.getBoundingClientRect() : null, k = r ? r.width / V.W : 1;
    const at = b => ({ x: r.left + (ox + BTN_W / 2 * scale) * k, y: r.top + (oy + (b.y + BTN_H / 2) * scale) * k });
    return {
      gun: { type: g.type, level: g.level, mods: g.mods.length },
      parts: B.parts(),
      marker: !changed,
      targets: r ? { add: at(BTN[0]), remove: at(BTN[1]), scrap: at(BTN[2]) } : null,
    };
  }

  P.register({ name: "vs-bench", seed: 9, tick: 250, setup, step, draw, resize: layout, atRest, press, move });
  return { gun: () => F.gun(), report };
})();
