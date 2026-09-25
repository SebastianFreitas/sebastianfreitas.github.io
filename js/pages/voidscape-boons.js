/* js/pages/voidscape-boons.js — VoidScape range: the boon pool and the build resolver.
   A boon is {id, w, name, desc, fx(B)}; fx mutates the effective build in place. build()
   folds a gun's base stats, its forge mods (see forge-guns.js) and every taken boon into
   one flat object the range reads every frame; offer() weight-picks one boon from a pool. */
window.RangeBoons = (function () {

  const RAW = [
    ['MorePhys10', 10, '+10 physical', 'flat, on every bullet', B => { B.phys += 10; }],
    ['MorePhys25', 5, '+25 physical', 'flat, on every bullet', B => { B.phys += 25; }],
    ['MorePhys50', 1, '+50 physical', 'flat, on every bullet', B => { B.phys += 50; }],
    ['FireGreed', 10, '+10 fire', 'costs 20 max health', B => { B.fire += 10; B.maxHp -= 20; }],
    ['RicochetExplosive', 5, 'ricochet explosive', 'fire bullets survive their own explosion', B => { B.surviveFire = true; }],
    ['IncreasedFireArea', 10, '+20% explosion area', '', B => { B.area *= 1.2; }],
    ['IncreasedFireArea2', 5, '+50% explosion area', '', B => { B.area *= 1.5; }],
    ['IncreasedFireArea3', 1, '+100% explosion area', '', B => { B.area *= 2; }],
    ['DoubleFire', 1, 'double fire', 'fire ×2, explosion area −90%', B => { B.fire *= 2; B.area *= 0.1; }],
    ['DelayedFire', 1, 'delayed fire', 'every explosion repeats 0.9 s later', B => { B.delayedFire = true; }],
    ['PullFire', 5, 'pull fire', 'explosions pull instead of push', B => { B.pull = true; }],
    ['FireDeath', 1, 'fire death', 'enemies explode when they die', B => { B.fireDeath = true; }],
    ['ExtraPoisonToFire', 2, 'poison to fire', '+25% of poison added as fire', B => { B.fire += Math.round(B.poison * 0.25); }],
    ['Speed', 5, '+20% shot speed', '', B => { B.speed *= 1.2; }],
    ['RicochectStack', 1, 'ricochets get stronger', 'bounce speed doubles on every bounce', B => { B.stack = true; }],
    ['ChanceFreeze1', 10, '+1% freeze chance', '', B => { B.freeze += 1; }],
    ['ChanceFreeze2', 2, '+2% freeze chance', '', B => { B.freeze += 2; }],
    ['LongerFreeze', 2, 'longer freeze', 'freeze lasts one second more', B => { B.freezeDur += 1; }],
    ['FrozenDamage', 2, '+50% damage to frozen', '', B => { B.frozenMul *= 1.5; }],
    ['DoublePhysCold', 1, 'physical ×2 vs frozen', '', B => { B.frozenPhys *= 2; }],
    ['AddedColdProjectile', 3, '+1 cold projectile', 'one more cold shot per trigger pull', B => { B.coldProj += 1; }],
    ['ColdShatteringRicochet', 1, 'cold shattering ricochet', 'every bounce spawns a cold shot', B => { B.coldRic = true; }],
    ['ColdShatter', 1, 'cold shatter', 'eight cold shots on every death', B => { B.coldDeath += 1; }],
    ['PoisonFollow', 1, 'poison follow', 'ricochets home onto poisoned enemies', B => { B.homing = true; }],
    ['TwiceFastPoison', 1, 'twice as fast poison', 'poison ticks twice as fast', B => { B.poisonRate *= 2; }],
    ['PoisonExplosions', 1, 'poison explosions', 'explosions also poison', B => { B.poisonBoom = true; }],
    ['InstantPoison', 1, 'instant poison', 'all poison at once, at 60%', B => { B.instantPoison = true; }],
    ['TripleCritPhys', 1, 'triple crit', 'crits ×3 instead of ×2', B => { B.critMul = 3; }],
    ['PhyisToColdCrit', 5, 'cold crits', 'crits turn physical into cold', B => { B.coldCrit = true; }],
    ['MaxHp1', 10, '+10 max health', '', B => { B.maxHp += 10; }],
    ['MaxHp2', 5, '+40 max health', '', B => { B.maxHp += 40; }],
    ['MaxHpHeal', 2, '+40 max health', 'and a full heal', B => { B.maxHp += 40; B.heal = true; }],
    ['FireToPhys100', 3, 'fire to physical', 'all fire becomes physical', B => { B.phys += B.fire; B.fire = 0; }],
    ['ReducedSpeedMorePhys', 3, 'slow heavy rounds', '−50% bullet speed, +50 physical', B => { B.speed *= 0.5; B.phys += 50; }],
  ];
  const BOONS = RAW.map(([id, w, name, desc, fx]) => ({ id, w, name, desc, fx }));

  // fold a gun's base stats + forge mods + taken boons into one flat build, from scratch every time
  function build(gun, boons) {
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
    for (const b of boons) b.fx(B);
    B.phys = Math.round(B.phys);
    B.fire = Math.round(B.fire);
    B.cold = Math.round(B.cold);
    B.poison = Math.round(B.poison);
    B.maxHp = Math.max(20, B.maxHp);
    return B;
  }

  // weighted pick from a pool of boons using rnd(); null when the pool is empty
  function offer(pool, rnd) {
    if (!pool.length) return null;
    let total = 0;
    for (const b of pool) total += b.w;
    let r = rnd() * total;
    for (const b of pool) {
      r -= b.w;
      if (r <= 0) return b;
    }
    return pool[pool.length - 1];
  }

  return { BOONS, build, offer };
})();
