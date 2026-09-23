/* forge.js — VoidScape crafting bench and run console, flat 2D panels parked
   beside the VoidScape planet in the Game Dev sector: a gun-modding bench to
   the left, a mission-search / floor-plan console to the right. Both are
   canvas drawings, hit-tested from bridge.js pointer events. Modelled on
   storm.js: one seeded mulberry for every random choice, flat fills, no
   outlines. Numbers ported from the HellEscape Unity scripts this alludes
   to. */
window.Forge = (function () {
  const { clamp } = Util;
  const rnd = Util.mulberry(Date.now() & 0x7fffffff); // not Math.random: same reason as storm.js
  const rint = (a, b) => a + Math.floor(rnd() * (b - a));   // int in [a, b)

  // weighted pick: total = sum of wOf(item), walk a random point along it
  function pick(list, wOf) {
    let total = 0;
    for (const item of list) total += wOf(item);
    let r = rnd() * total;
    for (const item of list) {
      r -= wOf(item);
      if (r <= 0) return item;
    }
    return list[list.length - 1];
  }

  const PANEL_W = 500, BENCH_H = 220;
  const CONS_W = 640;     // console panel width (bench keeps PANEL_W)
  const GAP = 200;        // px between planet centre and the bench's near edge
  const CONS_GAP = 160;   // px between planet centre and the console's near edge
  const MON_W = 150, MON_GAP = 8;    // console monitor width and gap between them
  const LINE_H = 13, MIN_SCREEN_LINES = 7;   // console monitor screen text metrics
  const TOP_Y = -140;     // panel top, px from planet centre
  const MIN_W = 900;      // below this hero width nothing is drawn or hit
  const FLASH = 0.3, ERR_FLASH = 0.4, ARM = 0.9;   // seconds
  const MAX_MODS = 6, MAX_PATH_MODS = 2, MAX_EMPOWER = 9;
  const C = {
    green: "#82cc3c", greenInk: "#1e4a10", blue: "#4633cc", blueInk: "#b8f26a",
    red: "#d92b2b", redInk: "#c8ff5a", yellow: "#e6d43a", yellowInk: "#3d3608",
    screen: "#0a1a10", bad: "#ff6b5a", good: "#8bf27a", dim: 0.28,
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

  /* ---- gun types, ported from HellEscape's weapon table ---- */
  const GUN_BASE = [
    { name: "basic", weight: 1000, rate: 2, phys: 50, bounces: 5, bullets: 1, speed: 2500 },
    { name: "shotgun", weight: 750, rate: 1, phys: 20, bounces: 5, bullets: 8, speed: 1500 },
    { name: "machinegun", weight: 750, rate: 5, phys: 20, bounces: 5, bullets: 1, speed: 1500 },
    { name: "sniper", weight: 750, rate: 0.5, phys: 200, bounces: 10, bullets: 1, speed: 5000 },
    { name: "basic_A1", weight: 20, rate: 1.25, phys: 150, bounces: 5, bullets: 1, speed: 4000 },
    { name: "shotgun_A1", weight: 20, rate: 1.2, phys: 40, bounces: 5, bullets: 10, speed: 1500 },
    { name: "machinegun_A1", weight: 20, rate: 4, phys: 40, bounces: 5, bullets: 1, speed: 2000 },
    { name: "sniper_A1", weight: 20, rate: 0.75, phys: 300, bounces: 10, bullets: 1, speed: 5000 },
  ];
  const GUN_TYPES = GUN_BASE.map(g => Object.assign({ fire: 0, cold: 0, poison: 0 }, g));

  const ELEMENTS = [["fire", "FD"], ["cold", "CD"], ["poison", "PD"]];
  for (const base of GUN_BASE) {
    if (!base.name.endsWith("_A1")) continue;
    for (const [el, suffix] of ELEMENTS) {
      const variant = {
        name: `${base.name}${suffix}`, weight: 15, rate: base.rate, bounces: base.bounces,
        bullets: base.bullets, speed: base.speed, phys: 0, fire: 0, cold: 0, poison: 0,
      };
      variant[el] = base.phys;
      if (base.name === "machinegun_A1" && (el === "cold" || el === "poison")) {
        variant.phys = 40;
        variant[el] = 40;
      }
      GUN_TYPES.push(variant);
    }
  }

  /* ---- mod pools ---- */
  const MODS = [
    { grade: 0, name: "Fire Damage", lo: 1, hi: 3, op: "plus", w: 1 },
    { grade: 0, name: "Cold Damage", lo: 1, hi: 3, op: "plus", w: 1 },
    { grade: 0, name: "Poison Damage", lo: 1, hi: 3, op: "plus", w: 1 },
    { grade: 0, name: "Physical Damage", lo: 2, hi: 5, op: "inc", w: 1 },
    { grade: 0, name: "Critical Damage", lo: 2, hi: 5, op: "inc", w: 1 },
    { grade: 1, name: "Movement Speed", lo: 1, hi: 3, op: "inc", w: 3 },
    { grade: 1, name: "Ricochets", lo: 1, hi: 6, op: "inc", w: 3 },
    { grade: 1, name: "Fire Rate", lo: 1, hi: 3, op: "inc", w: 2 },
    { grade: 1, name: "Bullet Speed", lo: 2, hi: 5, op: "inc", w: 3 },
    { grade: 1, name: "Bullet Size", lo: 1, hi: 5, op: "inc", w: 3 },
    { grade: 2, name: "Explosion Area", lo: 1, hi: 3, op: "inc", w: 30 },
    { grade: 2, name: "Ignite Chance", lo: 2, hi: 6, op: "inc", w: 15 },
    { grade: 2, name: "Poison Rate", lo: 1, hi: 2, op: "inc", w: 10 },
    { grade: 2, name: "Poison Duration", lo: 2, hi: 6, op: "inc", w: 35 },
    { grade: 2, name: "Freeze Chance", lo: 1, hi: 2, op: "inc", w: 10 },
    { grade: 2, name: "Cold Projectile Chance", lo: 2, hi: 6, op: "pct", w: 303 },
    { grade: 2, name: "Double Damage Chance", lo: 1, hi: 2, op: "pct", w: 30 },
    { grade: 2, name: "Bleeding Chance", lo: 1, hi: 2, op: "pct", w: 30 },
  ];

  function rollMod(gun, L) {
    const counts = [0, 0, 0];
    for (const m of gun.mods) counts[m.grade]++;
    const weights = [
      Math.max(0, 200 - counts[0] * 100),
      Math.max(0, 200 - counts[1] * 100),
      Math.max(0, 2 - counts[2] * 1),
    ];
    if (weights[0] + weights[1] + weights[2] === 0) return null;
    const grade = pick([0, 1, 2], i => weights[i]);
    let candidates = MODS.filter(m => m.grade === grade && !gun.mods.some(gm => gm.name === m.name));
    if (gun.mods.some(gm => gm.name === "Double Damage Chance" || gm.name === "Bleeding Chance")) {
      candidates = candidates.filter(m => m.name !== "Double Damage Chance" && m.name !== "Bleeding Chance");
    }
    if (candidates.length === 0) return null;
    const cand = pick(candidates, m => m.w);
    const tiers = [];
    for (let i = 1; i <= L; i++) tiers.push(i);
    const tier = pick(tiers, x => x);
    const d = (cand.hi - cand.lo) * tier;
    const val = cand.lo + d + rint(0, Math.max(1, cand.hi - cand.lo));
    let text;
    if (cand.op === "plus") text = `+${val} ${cand.name}`;
    else if (cand.op === "inc") text = `${val}% INCREASED ${cand.name}`;
    else text = `+${val}% ${cand.name}`;
    return { name: cand.name, grade: cand.grade, op: cand.op, val, text };
  }

  function makeGun(typeName, modCount, L) {
    const base = GUN_TYPES.find(g => g.name === typeName);
    const gun = { type: typeName, level: 10, mods: [], base };
    for (let i = 0; i < modCount; i++) {
      const m = rollMod(gun, L);
      if (!m) break;
      gun.mods.push(m);
    }
    return gun;
  }

  function randomGun() {
    const type = pick(GUN_TYPES, g => g.weight);
    const weights = [700, 900, 900, 700, 500, 100, 10, 1];
    const idx = pick(weights.map((w, i) => i), i => weights[i]);
    const modCount = clamp(idx + 1, 1, MAX_MODS);
    return makeGun(type.name, modCount, 5);
  }

  function stats(gun) {
    const b = gun.base;
    const inc = name => gun.mods.filter(m => m.name === name && m.op === "inc").reduce((s, m) => s + m.val, 0);
    const flat = name => gun.mods.filter(m => m.name === name && m.op === "plus").reduce((s, m) => s + m.val, 0);
    return [
      ["ITEM LEVEL", gun.level - 9],
      ["PHYSICAL", Math.round(b.phys * (1 + inc("Physical Damage") / 100))],
      ["FIRE", b.fire + flat("Fire Damage")],
      ["COLD", b.cold + flat("Cold Damage")],
      ["POISON", b.poison + flat("Poison Damage")],
      ["FIRE RATE", Math.round(b.rate * (1 + inc("Fire Rate") / 100))],
      ["SHOT SPEED", Math.floor(Math.floor(b.speed * (1 + inc("Bullet Speed") / 100)) / 100)],
      ["RICOCHETS", Math.round(b.bounces * (1 + inc("Ricochets") / 100))],
    ];
  }

  /* ---- shared state ---- */
  let last = null;
  let t = 0;

  /* ---- panel unlocks, gated by the depth nodes beside the planet ---- */
  const unlocked = { bench: false, console: false };
  const shown = { bench: 0, console: 0 };
  let checked = false;

  function unlock(which) { unlocked[which] = true; }

  /* ---- bench state ---- */
  let gun = makeGun("basic", 1, 5);
  let flash = { add: null, remove: null, destroy: null };
  let armUntil = 0;
  let gone = 0;
  let timesUsed = 1;

  const cost = () => (gun.level - 9) * (gun.mods.length + 1) * timesUsed;

  function benchOk(key) { flash[key] = { kind: "ok", text: null, until: t + FLASH }; }
  function benchErr(key, text) { flash[key] = { kind: "err", text, until: t + FLASH }; }

  function benchAdd() {
    if (gone > 0) return;
    if (gun.mods.length >= MAX_MODS) { benchErr("add", "FULL CAPACITY"); return; }
    const m = rollMod(gun, 10);
    if (!m) { benchErr("add", "FULL CAPACITY"); return; }
    gun.mods.push(m);
    timesUsed++;
    benchOk("add");
  }
  function benchRemove() {
    if (gone > 0) return;
    if (gun.mods.length === 0) { benchErr("remove", "NO MODIFIERS"); return; }
    gun.mods.splice(rint(0, gun.mods.length), 1);
    timesUsed++;
    benchOk("remove");
  }
  function benchDestroy() {
    if (gone > 0) return;
    if (armUntil <= t) { armUntil = t + ARM; return; }
    armUntil = 0;
    gone = 0.7;
    benchOk("destroy");
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

  /* ---- run-modifier table ---- */
  const RUN_MODS = [
    { text: "Weapon level", lo: 1, hi: 4, op: "plus", w: 100 },
    { text: "Mission length", lo: 1, hi: 9, op: "plus", w: 100 },
    { text: "Double drop chance", lo: 0, hi: 0, op: "non", w: 25 },
    { text: "Monsters potentially found per room", lo: 2, hi: 5, op: "plus", w: 100 },
    { text: "All side rooms are special", lo: 0, hi: 0, op: "non", w: 25 },
    { text: "Chance for encounters to drop health", lo: 0, hi: 0, op: "non", w: 100 },
    { text: "Danger", lo: 0, hi: 0, op: "non", w: 4 },
    { text: "Movement speed", lo: 10, hi: 49, op: "red", w: 100 },
    { text: "Located boons", lo: 2, hi: 3, op: "plus", w: 50 },
    { text: "ERROR", lo: 0, hi: 0, op: "non", w: 4 },
    { text: "Located additional rewards", lo: 0, hi: 0, op: "non", w: 10 },
    { text: "Gun parts drops", lo: 1, hi: 4, op: "plus", w: 100 },
    { text: "50% reduced healing", lo: 0, hi: 0, op: "non", w: 100 },
    { text: "Monster health", lo: 15, hi: 99, op: "plus", w: 250 },
    { text: "Monster damage", lo: 1, hi: 9, op: "plus", w: 250 },
    { text: "Monster action speed", lo: 1, hi: 24, op: "inc", w: 250 },
    { text: "Cannot use grenade", lo: 0, hi: 0, op: "non", w: 100 },
    { text: "UnknownX", lo: 0, hi: 0, op: "non", w: 8 },
    { text: "UnknownY", lo: 0, hi: 0, op: "non", w: 8 },
    { text: "Monsters are immune to fire damage", lo: 0, hi: 0, op: "non", w: 100 },
    { text: "Monsters are immune to cold damage", lo: 0, hi: 0, op: "non", w: 100 },
    { text: "Monsters are immune to poison damage", lo: 0, hi: 0, op: "non", w: 100 },
    { text: "Monsters are immune to physical damage", lo: 0, hi: 0, op: "non", w: 100 },
  ];

  function rollRunMod(exclude) {
    const candidates = RUN_MODS.filter(m => !exclude.includes(m.text));
    const cand = pick(candidates, m => m.w);
    if (cand.op === "non") return { text: cand.text, val: 0, line: cand.text };
    const val = rint(cand.lo, cand.hi);
    let line;
    if (cand.op === "plus") line = `+${val} ${cand.text}`;
    else if (cand.op === "inc") line = `${val}% INCREASED ${cand.text}`;
    else line = `${val}% REDUCED ${cand.text}`;
    return { text: cand.text, val, line };
  }

  function regood(m) {
    const n = m.mods.length;
    const has = name => m.mods.some(mm => mm.text === name);
    const depth = m.len;
    const elite = 5 + n + rint(1, Math.max(2, n));
    const special = has("All side rooms are special") ? 75 : 25 + 2 * n + rint(1, 4 * n);
    const z = (2 * n + rint(1, 2 * n)) * (has("Double drop chance") ? 2 : 1);
    const drop = (1 + z * 3 / 100).toFixed(2);
    m.good = [`${depth} DEPTH LEVEL`, `${elite}% ELITE CHANCE`, `${special}% SPECIAL ROOMS`, `${drop}% WEAPON DROP`];
  }

  function makeMission() {
    const weights = [0, 10, 20, 10, 4, 2, 1];
    const idx = pick(weights.map((w, i) => i), i => weights[i]);
    const n = clamp(idx, 1, 1 + MAX_PATH_MODS);
    const mods = [];
    const names = [];
    for (let i = 0; i < n; i++) {
      const m = rollRunMod(names);
      names.push(m.text);
      mods.push(m);
    }
    let len = rint(10, 20);
    for (const m of mods) if (m.text === "Mission length") len += m.val;
    const mission = { mods, len, lines: null };
    regood(mission);
    return mission;
  }

  /* ---- floor-plan generator ---- */
  const DIRS = [{ x: 1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 1 }]; // E N W S
  function turnDirs(dirIdx) { return [DIRS[(dirIdx + 3) % 4], DIRS[(dirIdx + 1) % 4]]; }

  function genPlan(mission) {
    const N = mission.len;
    const steps = [];
    for (let i = 0; i < N; i++) { steps.push("corridor"); steps.push("room"); }
    steps.push("corridor");
    steps.push("boss");

    let cells, occ;
    for (let attempt = 1; attempt <= 25; attempt++) {
      cells = [];
      occ = new Set(["0,0"]);
      let pos = { x: 0, y: 0 };
      let dirIdx = 0;
      cells.push({ x: 0, y: 0, type: "start", main: true, mi: 0, dir: DIRS[dirIdx] });
      let failed = false;
      let mi = 0;
      for (const kind of steps) {
        mi++;
        const [left, right] = turnDirs(dirIdx);
        const candidates = (kind === "room" && rnd() < 0.35)
          ? [left, right, DIRS[dirIdx]]
          : [DIRS[dirIdx], left, right];
        let moved = false;
        for (const cand of candidates) {
          const nx = pos.x + cand.x, ny = pos.y + cand.y;
          const key = `${nx},${ny}`;
          if (!occ.has(key)) {
            pos = { x: nx, y: ny };
            dirIdx = DIRS.indexOf(cand);
            occ.add(key);
            const cell = { x: nx, y: ny, type: kind, mi, dir: cand };
            if (kind === "room") cell.main = true;
            cells.push(cell);
            moved = true;
            break;
          }
        }
        if (!moved) { failed = true; break; }
      }
      if (!failed || attempt === 25) break;
    }

    // side rooms, off each main room's perpendicular flanks
    const sides = [];
    for (const cell of cells) {
      if (cell.type !== "room") continue;
      const dirIdx2 = DIRS.indexOf(cell.dir);
      const [left, right] = turnDirs(dirIdx2);
      for (const perp of [left, right]) {
        if (rnd() < 0.45) {
          const nx = cell.x + perp.x, ny = cell.y + perp.y;
          const key = `${nx},${ny}`;
          if (!occ.has(key)) {
            occ.add(key);
            const kind = rnd() < 0.25 ? "special" : "encounter";
            sides.push({ x: nx, y: ny, type: "side", kind, dir: perp });
          }
        }
      }
    }

    // points of interest, walked along the side list
    let kinds = ["choice", "item", "shop", "exit"];
    if (mission.mods.some(m => m.text === "Located additional rewards")) kinds = kinds.concat(["choice", "item", "shop"]);
    let idx = rint(0, 5), ki = 0;
    while (idx < sides.length) {
      sides[idx].kind = kinds[ki];
      ki++;
      if (ki >= kinds.length) { ki = 0; idx += 1 + rint(5, 10); }
      else idx += 1;
    }

    // boons, among main rooms deep enough in the path
    const b = 1 + mission.mods.filter(m => m.text === "Located boons").reduce((s, m) => s + m.val, 0);
    const pool = cells.filter(c => c.type === "room" && c.mi >= 6);
    for (let i = 0; i < b && pool.length > 0; i++) {
      const j = rint(0, pool.length);
      pool[j].kind = "boon";
      pool.splice(j, 1);
    }

    const all = cells.concat(sides);
    let minX = 0, maxX = 0, minY = 0, maxY = 0;
    for (const c of all) {
      if (c.x < minX) minX = c.x; if (c.x > maxX) maxX = c.x;
      if (c.y < minY) minY = c.y; if (c.y > maxY) maxY = c.y;
    }
    return { cells: all, minX, maxX, minY, maxY };
  }

  function cellColor(c) {
    if (c.type === "start") return C.green;
    if (c.type === "boss") return C.red;
    if (c.type === "corridor") return "#4a524a";
    if (c.type === "room") return c.kind === "boon" ? "#5cf0d8" : "#6f7a6f";
    if (c.type === "side") {
      if (c.kind === "special") return C.yellow;
      if (c.kind === "shop") return "#4fb3e0";
      if (c.kind === "item") return "#c98cff";
      if (c.kind === "choice") return "#f0a24a";
      if (c.kind === "exit") return "#e8e8e0";
      return "#55605a"; // encounter
    }
    return "#888";
  }

  function drawPlanArea(g, plan, x, y, w, h, runT, env) {
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    const cols = plan.maxX - plan.minX + 1, rows = plan.maxY - plan.minY + 1;
    const s = Math.min(w / (cols + 1), h / (rows + 1), 14);
    const totalW = cols * s, totalH = rows * s;
    const ox = x + (w - totalW) / 2 - plan.minX * s;
    const oy = y + (h - totalH) / 2 - plan.minY * s;
    for (let k = 0; k < plan.cells.length; k++) {
      const c = plan.cells[k];
      const visT = env.reduced ? 0.3 : 0.08 * k;
      if (runT < visT) continue;
      const cx = ox + c.x * s + s / 2, cy = oy + c.y * s + s / 2;
      if (c.type === "side") {
        const px = c.x - c.dir.x, py = c.y - c.dir.y;
        const x1 = ox + px * s + s / 2, y1 = oy + py * s + s / 2;
        g.fillStyle = "#4a524a";
        const barW = c.dir.x !== 0 ? Math.abs(cx - x1) + s * 0.25 : s * 0.25;
        const barH = c.dir.y !== 0 ? Math.abs(cy - y1) + s * 0.25 : s * 0.25;
        g.fillRect((cx + x1) / 2 - barW / 2, (cy + y1) / 2 - barH / 2, barW, barH);
      }
      const age = runT - visT;
      const scale = (!env.reduced && age < 0.15) ? 1.4 - 0.4 * (age / 0.15) : 1;
      g.save();
      g.translate(cx, cy);
      g.scale(scale, scale);
      g.fillStyle = cellColor(c);
      if (c.type === "corridor") {
        const horiz = c.dir.x !== 0;
        const bw = horiz ? s : s * 0.35, bh = horiz ? s * 0.35 : s;
        g.fillRect(-bw / 2, -bh / 2, bw, bh);
      } else if (c.type === "side") {
        g.fillRect(-s * 0.3, -s * 0.3, s * 0.6, s * 0.6);
      } else {
        g.fillRect(-s * 0.39, -s * 0.39, s * 0.78, s * 0.78);
      }
      g.restore();
    }
    g.restore();
  }

  /* ---- console state ---- */
  let mon = [{ st: "empty", m: null }, { st: "empty", m: null }, { st: "empty", m: null }];
  let selected = -1;
  let searching = false, searchT = 0, searchIdx = 0;
  let searchDone = false;
  let reloadN = 1;
  let cflash = { search: null, empower: null, reload: null, portal: null, head: null };
  let run = null;
  let consH = 0; // last computed console height, cached so hit()/over() (no ctx) can use it

  function consoleOk(key) { cflash[key] = { kind: "ok", text: null, until: t + FLASH }; }
  function consoleErr(key, text) { cflash[key] = { kind: "err", text, until: t + ERR_FLASH }; }

  function searchAction() {
    if (run || searching) return;
    if (searchDone) { consoleErr("search", "USED"); return; }
    mon = [{ st: "searching", m: null }, { st: "searching", m: null }, { st: "searching", m: null }];
    selected = -1;
    searching = true;
    searchT = 0;
    searchIdx = 0;
  }
  function empowerAction() {
    if (selected < 0) { consoleErr("empower", "SELECT A PATH"); return; }
    const mission = mon[selected].m;
    if (mission.mods.length >= MAX_EMPOWER) { consoleErr("empower", "MAX"); return; }
    const names = mission.mods.map(m => m.text);
    const m = rollRunMod(names);
    mission.mods.push(m);
    if (m.text === "Mission length") mission.len += m.val;
    mission.lines = null;
    regood(mission);
    consoleOk("empower");
  }
  function reloadAction() {
    if (!searchDone || searching || run) { consoleErr("reload", "SEARCH FIRST"); return; }
    reloadN++;
    mon = [0, 1, 2].map(() => ({ st: "found", m: makeMission() }));
    selected = -1;
    consoleOk("reload");
  }
  function portalAction() {
    if (selected < 0) {
      consoleErr("portal", "SELECT A PATH");
      for (const m of mon) m.errUntil = t + ERR_FLASH;
      return;
    }
    const mission = mon[selected].m;
    const plan = genPlan(mission);
    run = { t: 0, plan, done: false, holdUntil: 0 };
  }

  // greedy word-wrap: split on spaces, pack words while they fit maxW; a
  // single word longer than maxW stays on its own line
  function wrap(ctx, text, maxW) {
    const words = text.split(" ");
    const lines = [];
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (!line || ctx.measureText(test).width <= maxW) line = test;
      else { lines.push(line); line = w; }
    }
    if (line) lines.push(line);
    return lines;
  }

  // wrapped mod lines for a found mission, cached on the mission (m.lines is
  // set to null whenever its mods change, and rebuilt here when null)
  function missionLines(g, mission) {
    if (mission.lines) return mission.lines;
    const maxW = MON_W - 14;
    let lines = [];
    for (const m of mission.mods) lines = lines.concat(wrap(g, m.line.toUpperCase(), maxW));
    mission.lines = lines;
    return lines;
  }

  function drawMonitorScreen(g, mv, x, y) {
    g.textAlign = "left"; g.textBaseline = "alphabetic";
    if (mv.st === "empty") {
      g.save(); g.globalAlpha = panelAlpha * 0.45; g.fillStyle = C.good;
      g.fillText("STANDBY", x, y);
      g.restore();
    } else if (mv.st === "searching") {
      const dots = ".".repeat(1 + Math.floor(t * 4) % 3);
      g.fillStyle = C.good;
      g.fillText(("SEARCHING" + dots), x, y);
    } else if (mv.st === "failed") {
      g.fillStyle = C.bad;
      g.fillText("NO SIGNAL", x, y);
    } else if (mv.st === "found") {
      let line = 0;
      g.fillStyle = C.bad;
      for (const l of missionLines(g, mv.m)) { g.fillText(l, x, y + line * LINE_H); line++; }
      g.fillStyle = C.good;
      for (const gtext of mv.m.good) { g.fillText(gtext, x, y + line * LINE_H); line++; }
    }
  }

  function drawConsoleButton(g, x, y, w, label, fl) {
    let f = C.green, i = C.greenInk, txt = label;
    if (fl && fl.until > t) {
      if (fl.kind === "ok") { f = C.yellow; i = C.yellowInk; }
      else { f = C.red; i = C.redInk; txt = fl.text; }
    }
    tile(g, x, y, w, 26, f, i, txt, "left");
  }

  function drawConsole(g, env, ax, ay) {
    const qx = ax + CONS_GAP, qy = ay + TOP_Y;
    g.font = FONT_S;
    // screen height: tall enough for the biggest found monitor's wrapped
    // mod lines plus the four good lines, shared by all three monitors
    let maxLines = 0;
    for (const mv of mon) {
      if (mv.st === "found") maxLines = Math.max(maxLines, missionLines(g, mv.m).length + mv.m.good.length);
    }
    const screenH = Math.max(MIN_SCREEN_LINES, maxLines) * LINE_H + 8;
    consH = 48 + screenH + 6;

    g.font = FONT;
    let hf = C.green, hi = C.greenInk, htext = "MAIN OBJECTIVE SEARCHER";
    if (run) {
      const cells = run.plan.cells.length;
      const lastReveal = env.reduced ? 0.3 : 0.08 * cells;
      if (run.t > lastReveal) { htext = "LEVEL READY"; }
      else { hf = C.yellow; hi = C.yellowInk; htext = "GENERATING LEVEL"; }
    } else if (cflash.head && cflash.head.until > t) { hf = C.yellow; hi = C.yellowInk; htext = cflash.head.text; }
    tile(g, qx, qy, CONS_W, 26, hf, hi, htext, "left");
    g.font = FONT_S;
    const monsW = 3 * MON_W + 2 * MON_GAP;
    if (run) {
      drawPlanArea(g, run.plan, qx, qy + 32, monsW, 16 + screenH, run.t, env);
    } else {
      for (let m = 0; m < 3; m++) {
        const mx = qx + m * (MON_W + MON_GAP);
        let barF = C.blue, barI = C.blueInk;
        if (selected === m) { barF = C.green; barI = C.greenInk; }
        if (mon[m].errUntil && mon[m].errUntil > t) { barF = C.red; barI = C.redInk; }
        tile(g, mx, qy + 32, MON_W, 16, barF, barI, `PATH ${m + 1}`, "left");
        g.save();
        g.globalAlpha = panelAlpha * 0.9;
        g.fillStyle = C.screen;
        g.fillRect(mx, qy + 48, MON_W, screenH);
        g.restore();
        g.save();
        g.beginPath(); g.rect(mx, qy + 48, MON_W, screenH); g.clip();
        drawMonitorScreen(g, mon[m], mx + 7, qy + 48 + 14);
        g.restore();
      }
    }
    const x0 = 484; // 3 × MON_W + 2 × MON_GAP + 10, right of the monitor row
    for (let k = 0; k < 4; k++) {
      const y = qy + 32 + k * 32;
      if (k === 0) drawConsoleButton(g, qx + x0, y, 110, "SEARCH", cflash.search);
      else if (k === 1) {
        drawConsoleButton(g, qx + x0, y, 110, "EMPOWER", cflash.empower);
        tile(g, qx + x0 + 114, y, 42, 26, C.red, C.redInk, selected >= 0 ? String(mon[selected].m.mods.length * 4) : "-", "left");
      } else if (k === 2) {
        drawConsoleButton(g, qx + x0, y, 110, "RELOAD", cflash.reload);
        tile(g, qx + x0 + 114, y, 42, 26, C.red, C.redInk, String(5 * reloadN), "left");
      } else {
        drawConsoleButton(g, qx + x0, y, 110, "OPEN PORTAL", cflash.portal);
      }
    }
  }

  /* ---- public API ---- */
  function step(dt, env) {
    last = env;
    if (!(dt > 0)) return;
    t += dt;
    for (const k of ["bench", "console"]) {
      if (unlocked[k] && shown[k] < 1) {
        shown[k] = env.reduced ? 1 : clamp(shown[k] + dt / 0.6, 0, 1);
      }
    }
    for (const k of ["add", "remove", "destroy"]) if (flash[k] && flash[k].until <= t) flash[k] = null;
    for (const k of ["search", "empower", "reload", "portal", "head"]) if (cflash[k] && cflash[k].until <= t) cflash[k] = null;
    for (const m of mon) if (m.errUntil && m.errUntil <= t) m.errUntil = 0;
    if (gone > 0) {
      gone -= dt;
      if (gone <= 0) { gone = 0; gun = randomGun(); timesUsed = 1; }
    }
    if (searching) {
      searchT += dt;
      while (searchIdx < 3 && searchT > (searchIdx + 1) * 0.6) {
        mon[searchIdx] = rnd() < 0.5 ? { st: "found", m: makeMission() } : { st: "failed", m: null };
        searchIdx++;
      }
      if (searchIdx >= 3) {
        if (!mon.some(m => m.st === "found")) mon[0] = { st: "found", m: makeMission() };
        searching = false;
        searchDone = true;
      }
    }
    if (run) {
      run.t += dt;
      const cells = run.plan.cells.length;
      const lastReveal = env.reduced ? 0.3 : 0.08 * cells;
      if (!run.done && run.t > lastReveal + 1.2) {
        run.done = true;
        run.holdUntil = t + 1.6;
      }
      if (run.done && t > run.holdUntil) {
        run = null;
        mon = [{ st: "empty", m: null }, { st: "empty", m: null }, { st: "empty", m: null }];
        selected = -1;
        searchDone = false;
        reloadN = 1;
      }
    }
  }

  function draw(ctx, env) {
    last = env;
    if (!checked) {
      checked = true;
      if (window.XP && XP.has("beacon-bnote-vs-bench")) { unlocked.bench = true; shown.bench = 1; }
      if (window.XP && XP.has("beacon-bnote-vs-map")) { unlocked.console = true; shown.console = 1; }
    }
    if (env.W < MIN_W) return;
    if (env.ax < -900 || env.ax > env.W + 900) return;
    ctx.save();
    if (shown.bench > 0) {
      ctx.save();
      panelAlpha = shown.bench;
      drawBench(ctx, env, env.ax, env.ay);
      ctx.restore();
    }
    if (shown.console > 0) {
      ctx.save();
      panelAlpha = shown.console;
      drawConsole(ctx, env, env.ax, env.ay);
      ctx.restore();
    }
    panelAlpha = 1;
    ctx.restore();
  }

  function hit(x, y) {
    if (!last || last.W < MIN_W) return false;
    const ax = last.ax, ay = last.ay;
    const bx = ax - GAP - PANEL_W, by = ay + TOP_Y;
    const qx = ax + CONS_GAP, qy = ay + TOP_Y;
    const inBench = shown.bench >= 1 && x >= bx && x <= bx + PANEL_W && y >= by && y <= by + BENCH_H;
    const inConsole = shown.console >= 1 && x >= qx && x <= qx + CONS_W && y >= qy && y <= qy + consH;
    if (!inBench && !inConsole) return false;
    if (inBench) {
      for (let k = 0; k < 3; k++) {
        const yy = by + 140 + k * 28;
        if (x >= bx && x <= bx + 190 && y >= yy && y <= yy + 24) {
          if (k === 0) benchAdd(); else if (k === 1) benchRemove(); else benchDestroy();
          return true;
        }
      }
      return true;
    }
    const x0 = 484;
    for (let k = 0; k < 4; k++) {
      const yy = qy + 32 + k * 32;
      if (y >= yy && y <= yy + 26 && x >= qx + x0 && x <= qx + x0 + 110) {
        if (k === 0) searchAction(); else if (k === 1) empowerAction(); else if (k === 2) reloadAction(); else portalAction();
        return true;
      }
    }
    if (!run && y >= qy + 32 && y <= qy + consH - 6) {
      const m = Math.floor((x - qx) / (MON_W + MON_GAP));
      if (m >= 0 && m <= 2 && mon[m].st === "found") selected = m;
      return true;
    }
    return true;
  }

  function over(x, y) {
    if (!last || last.W < MIN_W) return false;
    const ax = last.ax, ay = last.ay;
    const bx = ax - GAP - PANEL_W, by = ay + TOP_Y;
    const qx = ax + CONS_GAP, qy = ay + TOP_Y;
    if (shown.bench >= 1) {
      for (let k = 0; k < 3; k++) {
        const yy = by + 140 + k * 28;
        if (x >= bx && x <= bx + 190 && y >= yy && y <= yy + 24) return true;
      }
    }
    if (shown.console >= 1) {
      const x0 = 484;
      for (let k = 0; k < 4; k++) {
        const yy = qy + 32 + k * 32;
        if (y >= yy && y <= yy + 26 && x >= qx + x0 && x <= qx + x0 + 110) return true;
      }
      if (!run && y >= qy + 32 && y <= qy + consH - 6) {
        const m = Math.floor((x - qx) / (MON_W + MON_GAP));
        if (m >= 0 && m <= 2 && mon[m] && mon[m].st === "found") return true;
      }
    }
    return false;
  }

  function lively() {
    if (armUntil > t || gone > 0 || searching || run) return true;
    for (const k of ["add", "remove", "destroy"]) if (flash[k] && flash[k].until > t) return true;
    for (const k of ["search", "empower", "reload", "portal", "head"]) if (cflash[k] && cflash[k].until > t) return true;
    for (const k of ["bench", "console"]) if (shown[k] > 0 && shown[k] < 1) return true;
    return false;
  }

  function report() {
    return {
      gun: { type: gun.type, mods: gun.mods.map(m => m.text) },
      timesUsed,
      monitors: mon.map(m => m.st),
      selected,
      run: !!run,
      unlocked: { bench: unlocked.bench, console: unlocked.console },
      lively: lively(),
    };
  }

  return { step, draw, hit, over, lively, report, unlock };
})();
