/* js/gamedev/forge-guns.js — VoidScape weapon tables, mod rolls and stats (pure data; loads before forge.js) */
window.ForgeGuns = (function () {
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

  const MAX_MODS = 6, MAX_PATH_MODS = 2, MAX_EMPOWER = 9;

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

  return { rnd, rint, pick, MAX_MODS, MAX_PATH_MODS, MAX_EMPOWER, GUN_TYPES, ELEMENTS, MODS, rollMod, makeGun, randomGun, stats };
})();
