/* js/forge/forge-missions.js — VoidScape floor-plan generator (pure; loads after forge-guns.js, before forge.js)
   genPlan(mission) follows the game's RoomGenerator.GenerateLevel on a grid, one cell per piece:
   start, then N = mission.len (default 10..19) rooms, each preceded by a stairs piece and a corridor piece,
   then a last stairs + corridor, then the boss. Every turn is 90 degrees, no two cells share a square, a step
   that cannot fit is retried (11 tries) and then the whole level restarts. Each spare door of a corridor or
   room gets a one-door side room, or a wall plug when the square is taken.
   Returns { cells, walls, minX, maxX, minY, maxY, minZ, maxZ, restarts }:
     cells  in placement order, main path first (start .. boss), then side rooms; each
            { x, y, type: start|stairs|corridor|room|boss|side, main: bool, mi: step index, dir: {x,y} (the way
              the path left the previous cell; for a side room, away from its parent), z: floor height in metres
              at the cell's entry (stairs climb 12, two-floor rooms +9, one-floor rooms 0; never down) }
     walls  [{ x, y, mi, dir }] wall plugs on the edge of cell (x, y) facing dir; they take no square. */
window.ForgeMissions = (function () {
  const { rnd, rint } = ForgeGuns;

  const DIRS = [{ x: 1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 1 }]; // E N W S
  const STAIRS = 12, FLOOR = 9, FAILS = 11;

  // one random piece: which headings it can leave by (0 straight, 1 left, 2 right), how many spare doors, rise
  function pieceFor(kind) {
    if (kind === "corridor") {
      const t = rint(0, 4);   // 4-way, straight, corner, 8-way
      if (t === 1) return { exits: [0], spare: 0, dz: 0 };
      if (t === 2) return { exits: [1, 2], spare: 0, dz: 0 };
      return { exits: [0, 1, 2], spare: t === 0 ? 2 : 3, dz: 0 };
    }
    const t = rint(0, 7);     // C, H (pass-through), B, E, G (3 doors), D, Donut (4 doors)
    if (t < 2) return { exits: [0], spare: 0, dz: 0 };
    if (t < 5) return { exits: [0, 1, 2], spare: 1, dz: FLOOR };
    return { exits: [0, 1, 2], spare: 2, dz: 0 };
  }

  function tryLevel(N) {
    const steps = [];
    for (let i = 0; i < N; i++) steps.push("stairs", "corridor", "room");
    steps.push("stairs", "corridor", "boss");
    const occ = new Set(["0,0"]);
    const cells = [{ x: 0, y: 0, type: "start", main: true, mi: 0, dir: DIRS[0], z: 0, n: 0 }];
    let pos = { x: 0, y: 0 }, dirIdx = 0, z = 0, mi = 0, exits = [0], dz = 0;
    for (const kind of steps) {
      mi++;
      // the previous piece's exit door sets the heading; the new piece is one cell on
      let placed = false;
      for (let f = 0; f < FAILS && !placed; f++) {
        const idx = (dirIdx + [0, 3, 1][exits[rint(0, exits.length)]]) % 4;
        const nx = pos.x + DIRS[idx].x, ny = pos.y + DIRS[idx].y;
        if (occ.has(`${nx},${ny}`)) continue;
        occ.add(`${nx},${ny}`);
        z += dz;
        const piece = kind === "stairs" ? { exits: [0], spare: 0, dz: STAIRS }
          : kind === "boss" ? { exits: [0], spare: 0, dz: 0 } : pieceFor(kind);
        cells.push({ x: nx, y: ny, type: kind, main: true, mi, dir: DIRS[idx], z, n: piece.spare });
        pos = { x: nx, y: ny }; dirIdx = idx; exits = piece.exits; dz = piece.dz;
        placed = true;
      }
      if (!placed) return null;
    }
    return { cells, occ };
  }

  function genPlan(mission) {
    const N = mission && mission.len ? mission.len : rint(10, 20);
    let lvl = null, restarts = -1;
    while (!lvl) { lvl = tryLevel(N); restarts++; }
    const { cells, occ } = lvl;

    // spare doors: a one-door side room, or a wall plug when the square is taken
    const sides = [], walls = [];
    for (let i = 0; i < cells.length - 1; i++) {
      const c = cells[i], out = DIRS.indexOf(cells[i + 1].dir), inn = (DIRS.indexOf(c.dir) + 2) % 4;
      const free = [0, 1, 2, 3].filter(d => d !== out && d !== inn).sort(() => rnd() - 0.5);
      for (const d of free.slice(0, c.n || 0)) {
        const nx = c.x + DIRS[d].x, ny = c.y + DIRS[d].y;
        if (occ.has(`${nx},${ny}`)) { walls.push({ x: c.x, y: c.y, mi: c.mi, dir: DIRS[d] }); continue; }
        occ.add(`${nx},${ny}`);
        sides.push({ x: nx, y: ny, type: "side", main: false, mi: c.mi, dir: DIRS[d], z: c.z });
      }
    }
    for (const c of cells) delete c.n;

    const all = cells.concat(sides);
    let minX = 0, maxX = 0, minY = 0, maxY = 0, minZ = 0, maxZ = 0;
    for (const c of all) {
      if (c.x < minX) minX = c.x; if (c.x > maxX) maxX = c.x;
      if (c.y < minY) minY = c.y; if (c.y > maxY) maxY = c.y;
      if (c.z < minZ) minZ = c.z; if (c.z > maxZ) maxZ = c.z;
    }
    return { cells: all, walls, minX, maxX, minY, maxY, minZ, maxZ, restarts };
  }

  return { genPlan };
})();
