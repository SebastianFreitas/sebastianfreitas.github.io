/* forge.js — VoidScape crafting bench, a flat 2D panel drawn into any canvas
   by the VoidScape page (voidscape-bench.js): a gun-modding bench, hit-tested
   from local pointer coordinates. Flat fills, no outlines. Numbers ported
   from the HellEscape Unity scripts this alludes to. The weapon tables live
   in forge-guns.js; the floor-plan generator lives in forge-missions.js. */
window.Forge = (function () {
  const { rint } = ForgeGuns;
  const { MAX_MODS, rollMod, makeGun, randomGun, stats } = ForgeGuns;

  const PANEL_W = 500, BENCH_H = 220;
  const GAP = 200;        // px between planet centre and the bench's near edge
  const TOP_Y = -140;     // panel top, px from planet centre
  const FLASH = 0.3, ARM = 0.9;   // seconds
  const C = {
    green: "#82cc3c", greenInk: "#1e4a10", blue: "#4633cc", blueInk: "#b8f26a",
    red: "#d92b2b", redInk: "#c8ff5a", yellow: "#e6d43a", yellowInk: "#3d3608",
    dim: 0.28,
  };
  const FONT = 'bold 12px "IBM Plex Mono", Consolas, monospace';
  const FONT_S = 'bold 11px "IBM Plex Mono", Consolas, monospace';

  let panelAlpha = 1; // set before each panel's draw calls, multiplies tile alpha

  function tile(g, x, y, w, h, fill, ink, text, align, alpha) {
    g.save();
    g.globalAlpha = panelAlpha * (alpha == null ? 0.9 : alpha);
    g.fillStyle = fill;
    g.fillRect(x, y, w, h);
    g.globalAlpha = panelAlpha;
    g.fillStyle = ink;
    g.textBaseline = "middle";
    const str = String(text).toUpperCase();
    if (align === "right") { g.textAlign = "right"; g.fillText(str, x + w - 7, y + h / 2); }
    else if (align === "center") { g.textAlign = "center"; g.fillText(str, x + w / 2, y + h / 2); }
    else { g.textAlign = "left"; g.fillText(str, x + 7, y + h / 2); }
    g.restore();
  }

  /* ---- shared state ---- */
  let t = 0;

  /* ---- bench state ---- */
  let gun = makeGun("basic", 1, 5);
  let flash = { add: null, remove: null, destroy: null };
  let armUntil = 0;
  let gone = 0;
  let timesUsed = 1;
  let benchParts = null;   // null: the bench is free (the sector panel); a number: the standalone bench pays from this pool
  function benchPay(key) {
    if (benchParts === null) return true;
    if (cost() > benchParts) { benchErr(key, "NEED PARTS"); return false; }
    benchParts -= cost();
    return true;
  }

  function gunChanged() { document.dispatchEvent(new CustomEvent("forge:gun")); }

  const cost = () => (gun.level - 9) * (gun.mods.length + 1) * timesUsed;

  function benchOk(key) { flash[key] = { kind: "ok", text: null, until: t + FLASH }; }
  function benchErr(key, text) { flash[key] = { kind: "err", text, until: t + FLASH }; }

  function benchAdd() {
    if (gone > 0) return;
    if (gun.mods.length >= MAX_MODS) { benchErr("add", "FULL CAPACITY"); return; }
    const m = rollMod(gun, 10);
    if (!m) { benchErr("add", "FULL CAPACITY"); return; }
    if (!benchPay("add")) return;
    gun.mods.push(m);
    timesUsed++;
    benchOk("add");
    gunChanged();
  }
  function benchRemove() {
    if (gone > 0) return;
    if (gun.mods.length === 0) { benchErr("remove", "NO MODIFIERS"); return; }
    if (!benchPay("remove")) return;
    gun.mods.splice(rint(0, gun.mods.length), 1);
    timesUsed++;
    benchOk("remove");
    gunChanged();
  }
  function benchDestroy() {
    if (gone > 0) return;
    if (armUntil <= t) { armUntil = t + ARM; return; }
    armUntil = 0;
    if (benchParts !== null) benchParts += cost();
    gone = 0.7;
    benchOk("destroy");
  }

  // the bench's base picker: four tiles under the modifier rows (bench-space), BASES in the same order
  const BASES = ["basic", "shotgun", "machinegun", "sniper"];
  const PICK = { x: 200, y: 196, w: 72, h: 24, step: 76 };
  const baseOf = type => type.split("_")[0].replace(/(FD|CD|PD)$/, "");
  function benchBase(name) {
    if (gone > 0 || baseOf(gun.type) === name) return false;
    const level = gun.level;
    gun = makeGun(name, gun.mods.length, 10);
    gun.level = level;
    timesUsed++;
    gunChanged();
    return true;
  }
  function benchPick(x, y) {
    if (y < PICK.y || y > PICK.y + PICK.h) return -1;
    for (let i = 0; i < BASES.length; i++) {
      const l = PICK.x + i * PICK.step;
      if (x >= l && x <= l + PICK.w) return i;
    }
    return -1;
  }

  function benchRows() {
    const rows = [null, null, null, null, null, null];
    const bands = { 0: [0, 1], 1: [2, 3], 2: [4, 5] };
    for (const m of gun.mods) {
      const slots = bands[m.grade];
      let placed = false;
      for (const idx of slots) {
        if (!rows[idx]) { rows[idx] = m; placed = true; break; }
      }
      if (!placed) {
        const idx = rows.findIndex(r => !r);
        if (idx >= 0) rows[idx] = m;
      }
    }
    return rows;
  }

  function drawBench(g, env, ax, ay) {
    const bx = ax - GAP - PANEL_W, by = ay + TOP_Y;
    g.font = FONT;
    tile(g, bx, by, 190, 26, C.blue, C.blueInk, gone > 0 ? "ROLLING..." : gun.type, "left");
    g.font = FONT_S;
    const st = stats(gun);
    g.save();
    g.globalAlpha = panelAlpha * 0.9;
    g.fillStyle = C.green;
    g.fillRect(bx, by + 32, 190, 104);
    g.restore();
    g.save();
    g.globalAlpha = panelAlpha;
    g.fillStyle = C.greenInk;
    g.textBaseline = "alphabetic";
    for (let i = 0; i < 8; i++) {
      const yy = by + 32 + 13 + i * 12;
      g.textAlign = "left";
      g.fillText(st[i][0], bx + 7, yy);
      g.textAlign = "right";
      g.fillText(String(st[i][1]), bx + 190 - 7, yy);
    }
    g.restore();
    const labels = ["ADD NEW MODIFIER", "REMOVE MODIFIER", "DESTROY"];
    const keys = ["add", "remove", "destroy"];
    for (let k = 0; k < 3; k++) {
      const y = by + 140 + k * 28;
      let lf = C.green, li = C.greenInk, ltext = labels[k];
      const fl = flash[keys[k]];
      if (fl && fl.until > t) {
        if (fl.kind === "ok") { lf = C.yellow; li = C.yellowInk; }
        else { lf = C.red; li = C.redInk; ltext = fl.text; }
      }
      if (k === 2 && armUntil > t) { lf = C.yellow; li = C.yellowInk; ltext = "ARE YOU SURE?"; }
      tile(g, bx, y, 130, 24, lf, li, ltext, "left");
      if (k < 2) {
        const costText = gone > 0 ? "-" : String(cost());
        tile(g, bx + 134, y, 56, 24, C.red, C.redInk, costText, "left");
      }
    }
    g.font = FONT_S;
    const cur = baseOf(gun.type);
    for (let i = 0; i < BASES.length; i++) {
      const on = gone <= 0 && BASES[i] === cur;
      tile(g, bx + PICK.x + i * PICK.step, by + PICK.y, PICK.w, PICK.h, on ? "#f1ecd8" : C.green, C.greenInk, BASES[i], "center", on ? 1 : 0.9);
    }
    const rows = benchRows();
    for (let i = 0; i < 6; i++) {
      const w = i < 2 ? 220 : i < 4 ? 260 : 300;
      const y = by + 32 + i * 26;
      const set = i < 2 ? [C.green, C.greenInk] : i < 4 ? [C.blue, C.blueInk] : [C.red, C.redInk];
      const mod = gone > 0 ? null : rows[i];
      g.font = FONT_S;
      if (mod) {
        g.save();
        g.beginPath(); g.rect(bx + 200, y, w, 22); g.clip();
        tile(g, bx + 200, y, w, 22, set[0], set[1], mod.text, "left");
        g.restore();
      } else {
        tile(g, bx + 200, y, w, 22, set[0], set[1], "-", "left", C.dim);
      }
    }
  }

  /* ---- standalone bench: any canvas, own origin, local pointer coords, no env ---- */
  const BENCH_BTN = { x: 0, w: 190, h: 24 };
  function benchButton(x, y) {
    for (let k = 0; k < 3; k++) {
      const yy = 140 + k * 28;
      if (x >= 0 && x <= BENCH_BTN.w && y >= yy && y <= yy + BENCH_BTN.h) return k;
    }
    return -1;
  }
  function benchStep(dt) {
    if (!(dt > 0)) return;
    t += dt;
    for (const k of ["add", "remove", "destroy"]) if (flash[k] && flash[k].until <= t) flash[k] = null;
    if (gone > 0) {
      gone -= dt;
      if (gone <= 0) { gone = 0; gun = randomGun(); timesUsed = 1; gunChanged(); }
    }
  }
  function benchDraw(ctx, x, y) {
    ctx.save();
    panelAlpha = 1;
    drawBench(ctx, null, x + GAP + PANEL_W, y - TOP_Y);
    ctx.restore();
  }
  function benchHit(x, y) {
    const p = benchPick(x, y);
    if (p >= 0) return benchBase(BASES[p]);
    const k = benchButton(x, y);
    if (k < 0) return false;
    if (k === 0) benchAdd(); else if (k === 1) benchRemove(); else benchDestroy();
    return true;
  }
  function benchOver(x, y) { return benchButton(x, y) >= 0 || benchPick(x, y) >= 0; }
  function benchLively() {
    if (armUntil > t || gone > 0) return true;
    for (const k of ["add", "remove", "destroy"]) if (flash[k] && flash[k].until > t) return true;
    return false;
  }

  return {
    gun: () => gun,
    bench: { bases: BASES, pick: PICK, baseOf, W: PANEL_W, H: BENCH_H, step: benchStep, draw: benchDraw, hit: benchHit, over: benchOver, lively: benchLively, parts: n => { if (n !== undefined) benchParts = n; return benchParts; } },
  };
})();
