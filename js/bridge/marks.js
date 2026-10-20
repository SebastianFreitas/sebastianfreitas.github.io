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
  /* the reveal order: The Void alone, Rex once birth has been seen, the rest
     once Rex's segment has been seen. Anything not named here (depth nodes) shows. */
  const SEEN = { "bnote-rex": ["genesis-seg-birth", "beacon-bnote-void"] };
  ["bnote-root", "bnote-watcher", "bnote-land", "bnote-bridge", "bnote-future"]
    .forEach(id => SEEN[id] = ["genesis-seg-rex", "beacon-bnote-rex"]);
  /* the Void's depth nodes (root "bnote-void") wait for the Mainland */
  const visible = id => {
    const m = MARKS.find(n => n.id === id);
    if (m && m.root === "bnote-void") return visible("bnote-land");
    return !SEEN[id] || !!(window.XP && SEEN[id].some(k => XP.has(k)));
  };

  /* gamedev sector archived: PLANETS stays an empty shim for old readers */
  return { MARKS, PLANETS: [], visible };
})();
