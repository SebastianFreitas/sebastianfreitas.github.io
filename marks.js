/* marks.js — the landmark roster: the beacons along the void map and the
   bodies of the Game Dev sector, where each one sits and what it says.
   The arrays are shared by reference — the bridge pushes depth nodes into
   them as they are earned. */
window.Marks = (function () {
  const { SLOT, LAND } = World;
  const BOUNDS = World.BOUNDS;

  const CAM = {
    min: BOUNDS.min,                 // keep going west, into what hasn't happened
    max: LAND.root + SLOT * 1.6,   // far enough in to be surrounded by it
    maxFling: 38000,      // ceiling on a hard flick
    glideTau: 0.95,       // seconds for a fling to fall to ~37% of its speed
    carry: 0.62,          // how much of the last throw a new one inherits
    viewUnits: 2100,
    brakeZone: 9000,
  };

  const MARKS = [
    { id: "bnote-future",  cam: LAND.future,   off: -0.20, oy: 0.26, par: 0.30, xp: 1,
      name: "The Unwritten",  sub: "West of the last recorded thing" },
    { id: "bnote-land",    cam: LAND.mainland, off:  0.22, oy: 0.40, par: 0.66, xp: 1,
      name: "The Mainland",   sub: "Born of a war between souls" },
    { id: "bnote-void",    cam: LAND.voidmark, off:  0.08, oy: 0.20, par: 0.30, xp: 1,
      name: "The Void",       sub: "The uncertainty of reality itself" },
    { id: "bnote-bridge",  cam: LAND.bridge,   off:  0.16, oy: 0.46, par: 0.94, xp: 1,
      name: "The Bridge",     sub: "First law. It holds because it must" },
    { id: "bnote-watcher", cam: LAND.watcher,  off:  0.23, oy: 0.30, par: 0.24, xp: 1,
      name: "The Watcher",    sub: "It holds the void off Rex" },
    { id: "bnote-rex",     cam: LAND.rex,      off: -0.21, oy: 0.42, par: 0.62, xp: 1,
      name: "Rex",            sub: "Three masses, three layers, one war" },
    { id: "bnote-root",    cam: CAM.max,       off: -0.10, oy: 0.24, par: 0.70, xp: 1,
      name: "The Root",       sub: "Every arm of it is still climbing" },
  ];
  MARKS.forEach((m, i) => {
    m.x = m.cam + (m.off * CAM.viewUnits) / m.par;
    m.phase = i * 1.7;    // so they don't all blink together
    m.vis = 0;            // eased in as they enter the frame
    m.pop = 0;            // the burst when one is claimed
  });

  /* ---- the other setting: Game Dev sector -----------------
     Same ship, same bridge deck, a different span. Four bodies,
     left to right, one per shipped project — beacons like the
     lamps on the span, filed the same way. Some of them open out
     into further nodes once reached (see depths.js). ---- */
  const GD_SLOT = SLOT;
  const gdAt = i => i * GD_SLOT;
  const GD_LAND = {
    entry:      gdAt(2),
    zero:       gdAt(10),
    voidscape:  gdAt(21),
    heavylight: gdAt(32),
    conclusus:  gdAt(43),
    exit:       gdAt(48),
  };
  const GD_BOUNDS = { min: gdAt(0.6), max: gdAt(49) };
  const GD_SPAWN = 59226; // camera x the Game Dev sector opens at: Sector Zero sits at 0.70W

  const PLANETS = [
    { id: "bnote-planet-zero",       cam: GD_LAND.zero,       off: -0.06, oy: 0.34, par: 0.7, xp: 1,
      theme: "zero",       size: 1.25, name: "Sector Zero", sub: "Horror · one room, a terminal, a storm" },
    { id: "bnote-planet-voidscape",  cam: GD_LAND.voidscape,  off:  0.05, oy: 0.28, par: 0.7, xp: 1,
      theme: "voidscape",  size: 1.15, name: "VoidScape",   sub: "Roguelike — a skill-scaled special run" },
    { id: "bnote-planet-heavylight", cam: GD_LAND.heavylight, off: -0.04, oy: 0.42, par: 0.7, xp: 1,
      theme: "heavylight", size: 0.95, name: "HeavyLight",  sub: "Puzzle platformer. Light has weight" },
    { id: "bnote-planet-conclusus",  cam: GD_LAND.conclusus,  off:  0.06, oy: 0.30, par: 0.7, xp: 1,
      theme: "conclusus",  size: 1.05, name: "Conclusus",   sub: "Precision platformer. Plant a shadow, jump back" },
  ];
  PLANETS.forEach((m, i) => {
    m.x = m.cam + (m.off * CAM.viewUnits) / m.par;
    m.phase = i * 1.7 + 4;
    m.vis = 0;
    m.pop = 0;
  });

  return { MARKS, PLANETS, GD_LAND, GD_BOUNDS, GD_SLOT, GD_SPAWN };
})();
