/* js/pages/voidscape-boons.js — VoidScape range: the build resolver.
   build() folds a gun's base stats and its forge mods (see forge-guns.js) into one flat
   object the range reads every frame. */
window.RangeBoons = (function () {

  // fold a gun's base stats + forge mods into one flat build, from scratch every time
  function build(gun) {
    const base = gun.base;
    const B = {
      phys: base.phys, fire: base.fire || 0, cold: base.cold || 0, poison: base.poison || 0,
      rate: base.rate, speed: base.speed, bounces: base.bounces, bullets: base.bullets,
      size: 1, area: 1, ignite: 5, freeze: 3, freezeDur: 1, crit: 0, critMul: 2, dbl: 0,
      bleed: 1, coldProj: 0, coldChance: 0, poisonRate: 1, poisonDur: 10, maxHp: 100,
      frozenMul: 1, frozenPhys: 1, coldDeath: 0,
      surviveFire: false, delayedFire: false, pull: false, fireDeath: false, stack: false,
      coldRic: false, homing: false, poisonBoom: false, instantPoison: false, coldCrit: false,
      heal: false,
    };
    for (const m of gun.mods) {
      const v = m.val;
      switch (m.name) {
        case 'Fire Damage': B.fire += v; break;
        case 'Cold Damage': B.cold += v; break;
        case 'Poison Damage': B.poison += v; break;
        case 'Physical Damage': B.phys *= (1 + v / 100); break;
        case 'Critical Damage': B.crit += v; break;
        case 'Fire Rate': B.rate *= (1 + v / 100); break;
        case 'Bullet Speed': B.speed *= (1 + v / 100); break;
        case 'Bullet Size': B.size *= (1 + v / 100); break;
        case 'Ricochets': B.bounces = Math.round(B.bounces * (1 + v / 100)); break;
        case 'Explosion Area': B.area *= (1 + v / 100); break;
        case 'Ignite Chance': B.ignite += v; break;
        case 'Freeze Chance': B.freeze += v; break;
        case 'Poison Rate': B.poisonRate += v; break;
        case 'Poison Duration': B.poisonDur = Math.round(10 * (1 + v / 100)); break;
        case 'Cold Projectile Chance': B.coldChance += v; break;
        case 'Double Damage Chance': B.dbl += v; break;
        case 'Bleeding Chance': B.bleed += v; break;
        // Movement Speed: no effect on the build
      }
    }
    B.phys = Math.round(B.phys);
    B.fire = Math.round(B.fire);
    B.cold = Math.round(B.cold);
    B.poison = Math.round(B.poison);
    B.maxHp = Math.max(20, B.maxHp);
    return B;
  }

  return { build };
})();
