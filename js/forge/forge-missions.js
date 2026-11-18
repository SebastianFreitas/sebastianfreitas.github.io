/* js/forge/forge-missions.js — VoidScape floor-plan generator (pure; loads after forge-guns.js, before forge.js) */
window.ForgeMissions = (function () {
  const { rnd, rint } = ForgeGuns;

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

  return { genPlan };
})();
