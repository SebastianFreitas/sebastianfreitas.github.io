/* js/gamedev/forge-missions.js — VoidScape mission rolls and the floor-plan generator (pure; loads after forge-guns.js, before forge.js) */
window.ForgeMissions = (function () {
  const { clamp } = Util;
  const { rnd, rint, pick, MAX_PATH_MODS } = ForgeGuns;

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

  return { RUN_MODS, rollRunMod, regood, makeMission, genPlan };
})();
