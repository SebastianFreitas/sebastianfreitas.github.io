/* js/pages/voidscape.js — VoidScape case-page toy: "the range". A gun mount in the
   bottom-left corner aims at the pointer and fires while the mouse is held on empty
   page; bullets are physics bodies that ricochet off the screen edges, enemies drift
   in from the right, and every six kills a boon is offered in a small card (see
   voidscape-boons.js for the pool and the build resolver). */
(function () {
  'use strict';
  const U = window.Util, P = window.Play, FG = window.ForgeGuns, RB = window.RangeBoons;
  if (!U || !P || !FG || !RB) return;

  const UNIT = 24;                        // one game unit in px
  const SPD = 0.55;                       // px/s per game speed unit (sniper 5000 → 2750)
  const R_BASE = 3;                       // bullet radius at size 1
  const COLS = {
    phys: '#e6d43a', fire: '#ff7a2e', cold: '#8fd3ff', poison: '#82cc3c', crit: '#ff4a3a',
    enemy: '#d92b2b', bone: ['#d9d2c4', '#8d8578'], red: ['#6a1a14', '#3a0609'],
    cone: ['#5a0d10', '#2c0507'], text: '#e8e6d8',
  };
  const OFFER_EVERY = 6, HEAL_EVERY = 10, QUIET_AFTER = 40;

  // current viewport state (set in setup, refreshed every step call — same object throughout)
  let V;

  // build state
  let gun, boons, pool, B;
  let hp, kills, pending, offerBoon, rerolls;

  // live objects
  let bullets, ebullets, enemies, pops, fx, delayed;

  // mount + input
  let mount, firing, shotAcc, armed, lastShot, spawnAcc, lost, hitCool;

  // DOM
  let card, ocard, hint, tip;

  function setup(v) {
    V = v;
    gun = FG.randomGun();
    boons = [];
    pool = RB.BOONS.slice();
    B = RB.build(gun, boons);
    hp = B.maxHp;
    kills = 0; pending = 0; offerBoon = null; rerolls = 0;
    bullets = []; ebullets = []; enemies = []; pops = []; fx = []; delayed = [];
    mount = { x: Math.max(22, V.gutter * 0.5 + 2), y: V.H - 48, ang: 0 };
    firing = false; shotAcc = 0; armed = false; lastShot = 0; spawnAcc = 0; lost = 0; hitCool = 0;

    card = document.createElement('aside');
    card.className = 'play-ui range';
    card.innerHTML =
      '<h3>The range</h3>' +
      '<div class="row"><span class="k">gun</span><span class="gun"></span></div>' +
      '<div class="row"><span class="k">health</span><span class="hp"></span></div>' +
      '<div class="bar"><i></i></div>' +
      '<p class="mods dim one"></p>' +
      '<p class="boons"></p>' +
      '<div class="row"><span class="k">kills</span><span class="kills"></span></div>' +
      '<p class="tip dim">hold the mouse on empty page to fire · bullets bounce off the screen edges · heads crit</p>';
    document.body.appendChild(card);
    tip = card.querySelector('.tip');

    ocard = document.createElement('aside');
    ocard.className = 'play-ui offer';
    ocard.hidden = true;
    ocard.innerHTML =
      '<h3>Boon</h3>' +
      '<p class="dim">take it, or turn it down for 10 health</p>' +
      '<button class="take" type="button"></button>' +
      '<button class="reroll minor" type="button">reroll</button>' +
      '<button class="deny minor" type="button">refuse · −10 health</button>';
    document.body.appendChild(ocard);
    ocard.querySelector('.take').addEventListener('click', takeBoon);
    ocard.querySelector('.reroll').addEventListener('click', rerollBoon);
    ocard.querySelector('.deny').addEventListener('click', denyBoon);

    hint = document.createElement('p');
    hint.className = 'play-hint';
    hint.textContent = 'the range · hold to fire';
    document.body.appendChild(hint);
    hint.style.bottom = (card.offsetHeight + 24) + 'px';

    refresh();
  }

  // redraw the build card; called whenever hp/kills/boons change, not every frame
  function refresh() {
    card.querySelector('.gun').textContent = gun.base.name + ' · lvl ' + (gun.level - 9);
    card.querySelector('.hp').textContent = hp + '/' + B.maxHp;
    card.querySelector('.bar i').style.width = (hp / B.maxHp * 100) + '%';
    card.querySelector('.mods').textContent = gun.mods.map(m => m.text).join(' · ') || 'no mods';
    card.querySelector('.boons').textContent = boons.length
      ? 'boons: ' + boons.map(b => b.name).join(' · ')
      : 'boons: none yet';
    card.querySelector('.kills').textContent = kills;
  }

  function press(x, y, v) { firing = true; return true; }
  function release(v) { firing = false; }

  // fire one trigger pull: B.bullets physical shots plus any cold projectiles
  function shoot() {
    if (!armed) tip.hidden = true;
    armed = true; lastShot = 0; hint.hidden = true;
    const sp = B.speed * SPD;
    const mx = mount.x + Math.cos(mount.ang) * 30, my = mount.y + Math.sin(mount.ang) * 30;
    for (let k = 0; k < B.bullets; k++) {
      const s = k === 0 ? 0 : (V.rnd() * 10 - 5) * Math.PI / 180;
      const a = mount.ang + s;
      bullets.push({
        x: mx, y: my, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        r: R_BASE * B.size, b: B.bounces,
        phys: B.phys, fire: B.fire, cold: B.cold, poison: B.poison,
        life: 10, home: null,
      });
    }
    const n = B.coldProj + (V.rnd() * 100 < B.coldChance ? 1 : 0);
    if (B.cold > 0) {
      for (let k = 0; k < n; k++) {
        const s = (V.rnd() * 16 - 8) * Math.PI / 180;
        const a = mount.ang + s;
        bullets.push({
          x: mx, y: my, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          r: R_BASE * B.size, b: B.bounces,
          phys: 0, fire: 0, cold: B.cold, poison: 0,
          life: 10, home: null,
        });
      }
    }
    fx.push({ kind: 'flash', x: mx, y: my, t: 0.06 });
    while (bullets.length > 90) bullets.shift();
  }

  function step(dt, v) {
    V = v;
    if (V.pointer.has) mount.ang = Math.atan2(V.pointer.y - mount.y, V.pointer.x - mount.x);

    if (lost > 0) lost -= dt;
    else if (firing) {
      shotAcc += dt * B.rate;
      while (shotAcc >= 1) { shotAcc -= 1; shoot(); }
    }
    lastShot += dt;
    if (hitCool > 0) hitCool -= dt;

    stepBullets(dt);
    stepEnemyBullets(dt);
    if (lastShot >= QUIET_AFTER) {
      for (const e of enemies) { e.vx = 120; e.x += e.vx * dt; }
      enemies = enemies.filter(e => e.x <= V.W + 40);
    } else {
      stepEnemies(dt);
      stepSpawn(dt);
    }
    stepDelayed(dt);
    stepFx(dt);
    stepPops(dt);

    if (pending > 0 && !offerBoon && lost <= 0) {
      offerBoon = RB.offer(pool, V.rnd);
      if (!offerBoon) pending = 0;
      else showOffer();
    }
  }

  // sub-stepped bullet motion: ricochets off the screen and enemies
  function stepBullets(dt) {
    for (let i = 0; i < bullets.length; i++) {
      const bl = bullets[i];
      const speed = Math.hypot(bl.vx, bl.vy);
      const steps = Math.max(1, Math.min(12, Math.ceil(speed * dt / 12)));
      const h = dt / steps;
      for (let s = 0; s < steps; s++) {
        if (B.homing && bl.poison > 0 && bl.homed) {
          const target = nearestPoisoned(bl.x, bl.y, 360);
          if (target) {
            const cur = Math.atan2(bl.vy, bl.vx);
            const want = Math.atan2(target.y - bl.y, target.x - bl.x);
            const turn = U.clamp(U.wrapPi(want - cur), -6 * h, 6 * h);
            const sp = Math.hypot(bl.vx, bl.vy), a = cur + turn;
            bl.vx = Math.cos(a) * sp; bl.vy = Math.sin(a) * sp;
          }
        }
        bl.x += bl.vx * h; bl.y += bl.vy * h;

        let hitWall = false, nx = 0, ny = 0;
        if (bl.x - bl.r < 0) { bl.x = bl.r; bl.vx = Math.abs(bl.vx); nx = 1; hitWall = true; }
        else if (bl.x + bl.r > V.W) { bl.x = V.W - bl.r; bl.vx = -Math.abs(bl.vx); nx = -1; hitWall = true; }
        if (bl.y - bl.r < V.top) { bl.y = V.top + bl.r; bl.vy = Math.abs(bl.vy); ny = 1; hitWall = true; }
        else if (bl.y + bl.r > V.H) { bl.y = V.H - bl.r; bl.vy = -Math.abs(bl.vy); ny = -1; hitWall = true; }
        if (hitWall) bounce(bl, nx, ny);
        if (bl.dead) break;

        let hitOne = false;
        for (let ei = 0; ei < enemies.length; ei++) {
          const e = enemies[ei];
          if (e.dead) continue;
          const left = e.x - e.w / 2, right = e.x + e.w / 2, top = e.y - e.h / 2, bottom = e.y + e.h / 2;
          const cx = U.clamp(bl.x, left, right), cy = U.clamp(bl.y, top, bottom);
          const dx = bl.x - cx, dy = bl.y - cy;
          if (dx * dx + dy * dy < bl.r * bl.r) {
            hitEnemy(e, bl, bl.y < e.y - e.h * 0.2);
            if (bl.fire > 0) explode(bl.x, bl.y, bl);
            bl.dead = true;
            hitOne = true;
            break;
          }
        }
        if (hitOne) break;
      }
      bl.life -= dt;
    }
    bullets = bullets.filter(b => !b.dead && b.life > 0 && b.b >= 0);
  }

  // a ricochet: dampen/empower per the build, maybe explode, maybe spawn a shard
  function bounce(bl, nx, ny) {
    bl.b -= 1;
    for (let i = 0; i < 4; i++) spawnSpark(bl.x, bl.y, nx, ny);
    if (B.stack) {
      bl.vx *= 2; bl.vy *= 2;
      const sp = Math.hypot(bl.vx, bl.vy);
      if (sp > 3500) { const k = 3500 / sp; bl.vx *= k; bl.vy *= k; }
    }
    if (bl.fire > 0) {
      explode(bl.x, bl.y, bl);
      if (!B.surviveFire) bl.dead = true;
    }
    if (B.coldRic && bl.cold > 0) {
      const a = V.rnd() * U.TAU, sp = B.speed * SPD * 0.6;
      bullets.push({
        x: bl.x, y: bl.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        r: R_BASE * B.size, b: B.bounces, phys: 0, fire: 0, cold: bl.cold, poison: 0,
        life: 10, home: null,
      });
    }
    if (B.homing && bl.poison > 0) bl.homed = true;
    if (bl.b < 0) bl.dead = true;
  }

  // an area hit: fire damage in radius R around (x, y); src carries the fire stat to use
  function explode(x, y, src) {
    const R = 36 * (UNIT / 24) * B.area;
    fx.push({ kind: 'boom', x, y, r: R, t: 0.35 });
    for (const e of enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d > R) continue;
      const dmg = Math.round((src.fire || 0) * (0.7 + V.rnd() * 0.6));
      e.hp -= dmg;
      if (dmg > 0) pushPop(e.x, e.y - e.h * 0.6, dmg, COLS.fire, false);
      if (B.poisonBoom) {
        const carry = e.poison ? e.poison.dmg : 0;
        e.poison = { left: B.poisonDur, every: 0.5 / B.poisonRate, t: 0, dmg: Math.round(B.poison / 5) + carry };
      }
      if (V.rnd() * 100 < B.ignite) {
        const carry = e.burn ? e.burn.dmg : 0;
        e.burn = { t: 2.25, tick: 0.75, dmg: Math.round((src.fire || 0) / 2) + carry };
      }
      const push = 240 * (1 - d / R) * (B.pull ? -1 : 1), ang = Math.atan2(e.y - y, e.x - x);
      e.vx = (e.vx || 0) + Math.cos(ang) * push;
      e.vy = (e.vy || 0) + Math.sin(ang) * push;
      if (e.hp <= 0) killEnemy(e);
    }
    if (B.delayedFire && !src.repeat) delayed.push({ x, y, in: 0.9, src: { fire: src.fire, repeat: true } });
  }

  function stepDelayed(dt) {
    for (let i = 0; i < delayed.length; i++) {
      delayed[i].in -= dt;
      if (delayed[i].in <= 0) explode(delayed[i].x, delayed[i].y, delayed[i].src);
    }
    delayed = delayed.filter(d => d.in > 0);
  }

  // physical/cold/fire hit on one enemy, headshots crit; rolls every status the build can apply
  function hitEnemy(e, bl, head) {
    let physPart = bl.phys, restPart = bl.cold + bl.fire, coldPart = bl.cold;
    if (head && bl.phys > 0) {
      const critPart = bl.phys * B.critMul * (1 + B.crit / 100);
      if (B.coldCrit) { physPart = 0; restPart = bl.cold + bl.fire + critPart; coldPart = bl.cold + critPart; }
      else { physPart = critPart; restPart = bl.cold + bl.fire; }
    }
    const variance = 0.7 + V.rnd() * 0.6;
    physPart *= variance; restPart *= variance;
    if (V.rnd() * 100 < B.dbl) { physPart *= 2; restPart *= 2; }
    if (e.frozen > 0) physPart *= B.frozenPhys;
    let direct = physPart + restPart;
    if (e.frozen > 0) direct *= B.frozenMul;
    const dmg = Math.round(direct);
    e.hp -= dmg;
    pushPop(e.x, e.y - e.h * 0.6, dmg, head ? COLS.crit : COLS.text, head);

    if (bl.fire > 0 && V.rnd() * 100 < B.ignite) {
      const carry = e.burn ? e.burn.dmg : 0;
      e.burn = { t: 2.25, tick: 0.75, dmg: Math.round(bl.fire / 2) + carry };
    }
    if (coldPart > 0) {
      e.chill = 3;
      if (V.rnd() * 100 < B.freeze) e.frozen = B.freezeDur;
    }
    if (bl.poison > 0) {
      if (B.instantPoison) {
        const pd = Math.round(bl.poison * 0.6 * B.poisonDur / 5);
        e.hp -= pd;
        pushPop(e.x, e.y - e.h * 0.6, pd, COLS.poison, false);
      } else {
        const carry = e.poison ? e.poison.dmg : 0;
        e.poison = { left: B.poisonDur, every: 0.5 / B.poisonRate, t: 0, dmg: Math.round(bl.poison / 5) + carry };
      }
    }
    if (bl.phys > 0 && V.rnd() * 100 < B.bleed) {
      e.bleed = { left: 16, t: 0, dmg: Math.max(1, Math.round(bl.phys / 10)) };
    }
    if (e.hp <= 0) killEnemy(e);
  }

  // hp exhausted: award kills, spray fragments, and run every on-death boon
  function killEnemy(e) {
    if (e.dead) return;
    e.dead = true;
    kills++;
    spawnFrags(e.x, e.y, 10);
    if (B.fireDeath) explode(e.x, e.y, { fire: Math.max(10, B.fire) });
    if (B.coldDeath) {
      const n = 8 * B.coldDeath, sp = B.speed * SPD * 0.5;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * U.TAU;
        bullets.push({
          x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          r: R_BASE * B.size, b: B.bounces, phys: 0, fire: 0, cold: Math.max(5, B.cold), poison: 0,
          life: 10, home: null,
        });
      }
    }
    if (kills % HEAL_EVERY === 0) { hp = Math.min(B.maxHp, hp + 15); pushPop(mount.x, mount.y - 20, '+15', COLS.poison, false); }
    if (kills % OFFER_EVERY === 0) pending++;
    if (kills === 1) P.award('play-voidscape', 'VoidScape range', e.x, e.y);
    refresh();
  }

  function nearestPoisoned(x, y, maxDist) {
    let best = null, bestD = maxDist;
    for (const e of enemies) {
      if (e.dead || !e.poison) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  function pushPop(x, y, text, col, big) {
    pops.push({ x, y, vx: (V.rnd() * 1.5 - 0.75) * 60, vy: -110, text, col, big, t: 0.9 });
    if (pops.length > 40) pops.shift();
  }
  function spawnSpark(x, y, nx, ny) {
    fx.push({ kind: 'spark', x, y, vx: nx * 90 + (V.rnd() * 2 - 1) * 70, vy: ny * 90 + (V.rnd() * 2 - 1) * 70, t: 0.25 });
  }
  function spawnFrags(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = V.rnd() * U.TAU, sp = 60 + V.rnd() * 120;
      fx.push({ kind: 'frag', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, t: 0.6 });
    }
  }

  // keep a drifted/shoved enemy from ending up somewhere nonsensical; wide on x so the
  // right-edge spawn (+20) and quiet-exit drift (to +40) both stay well inside it
  function clampEnemyToScreen(e) {
    e.x = U.clamp(e.x, -40, V.W + 60);
    e.y = U.clamp(e.y, V.top, V.H);
  }

  // least-penetration push of a centred w×h rect out of an AABB; returns the axis pushed or null
  function pushRect(e, r) {
    const left = e.x - e.w / 2, right = e.x + e.w / 2, top = e.y - e.h / 2, bottom = e.y + e.h / 2;
    if (right <= r.x || left >= r.x + r.w || bottom <= r.y || top >= r.y + r.h) return null;
    const dl = right - r.x, dr = (r.x + r.w) - left, dtop = bottom - r.y, dbot = (r.y + r.h) - top;
    const m = Math.min(dl, dr, dtop, dbot);
    if (m === dl) { e.x -= dl; return 'x-'; }
    if (m === dr) { e.x += dr; return 'x+'; }
    if (m === dtop) { e.y -= dtop; return 'y-'; }
    e.y += dbot; return 'y+';
  }

  // every enemy is shoved clear of every visible block each frame, so scrolling can't bury it
  function pushOutOfBlocks(e) {
    for (let i = 0; i < V.vis.length; i++) { if (pushRect(e, V.vis[i])) break; }
    clampEnemyToScreen(e);
  }

  // the skull's own hop can also land it inside a video/image: a soft, damped bounce
  function bounceSkullMedia(e) {
    for (let i = 0; i < V.vis.length; i++) {
      const r = V.vis[i];
      if (!r.media) continue;
      const axis = pushRect(e, r);
      if (axis === 'x-') e.vx = -Math.abs(e.vx) * 0.3;
      else if (axis === 'x+') e.vx = Math.abs(e.vx) * 0.3;
      else if (axis === 'y-') e.vy = -Math.abs(e.vy) * 0.3;
      else if (axis === 'y+') e.vy = Math.abs(e.vy) * 0.3;
      if (axis) break;
    }
  }

  function mkEnemy(kind, x, y, w, h, hp, mini, big) {
    const scale = mini ? 0.75 : (big ? 2 : 1);
    const hpMul = big ? 4 : 1;
    return {
      kind, x, y, w: w * scale, h: h * scale, vx: 0, vy: 0,
      hp: hp * hpMul, max: hp * hpMul, t: 0, big, mini, ang: 0,
      burn: null, poison: null, bleed: null, chill: 0, frozen: 0,
    };
  }

  function spawnEnemy() {
    const r = V.rnd() * 100;
    const kind = r < 55 ? 'skull' : (r < 80 ? 'cone' : 'triangle');
    const mini = V.rnd() < 0.15;
    const big = !mini && V.rnd() < 0.08;
    let e;
    if (kind === 'skull') {
      e = mkEnemy(kind, V.W + 20, V.H - 20, 34, 34, 50, mini, big);
      e.hop = 0.4 + V.rnd() * 0.5;
    } else if (kind === 'cone') {
      let x = V.W - 60, y = V.top + 80;
      for (let i = 0; i < 8; i++) {
        const tx = V.W * 0.55 + V.rnd() * (V.W * 0.45 - 40);
        const ty = V.top + 40 + V.rnd() * (V.H * 0.55 - V.top);
        if (V.free(tx - 20, ty - 20, 40, 40)) { x = tx; y = ty; break; }
      }
      e = mkEnemy(kind, x, y, 36, 44, 50, mini, big);
      e.y0 = y; e.fireT = 1.2 + V.rnd() * 0.8;
    } else {
      const y = V.top + 60 + V.rnd() * (V.H - V.top - 120);
      e = mkEnemy(kind, V.W + 20, y, 31, 31, 50, mini, big);
      e.state = 'rest'; e.stateT = 1.2;
    }
    enemies.push(e);
  }

  function stepSpawn(dt) {
    if (!armed) return;
    spawnAcc += dt;
    const every = Math.max(1.2, 2.4 - kills * 0.03);
    if (spawnAcc >= every && enemies.length < 7) { spawnEnemy(); spawnAcc = 0; }
  }

  function stepSkull(e, dt) {
    if (e.frozen > 0) return;
    e.vy += 900 * dt;
    e.x += e.vx * dt; e.y += e.vy * dt;
    if (e.y > V.H) { e.y = V.H; e.vy = 0; }
    e.hop -= dt;
    if (e.hop <= 0) {
      const speedMul = (e.chill > 0 ? 0.5 : 1) * (e.mini ? 1.25 : 1);
      e.vx = -(120 + V.rnd() * 80) * speedMul;
      e.vy = -(260 + V.rnd() * 140);
      if (V.rnd() < 0.25) e.vy = -520;
      e.hop = 0.4 + V.rnd() * 0.5;
    }
    e.ang += e.vx * dt / 40;
    bounceSkullMedia(e);
    if (e.x - e.w / 2 < 0) { e.x = e.w / 2; e.vx = Math.abs(e.vx); }
    else if (e.x + e.w / 2 > V.W) { e.x = V.W - e.w / 2; e.vx = -Math.abs(e.vx); }
    if (Math.hypot(mount.x - e.x, mount.y - e.y) < 30) { damage(10 * (e.big ? 2 : 1)); e.vx = 300; }
  }

  function stepCone(e, dt) {
    if (e.frozen > 0) return;
    e.y = e.y0 + Math.sin(e.t * U.TAU) * 8;
    e.ang += (15 * Math.PI / 180) * dt;
    e.fireT -= dt;
    if (e.fireT <= 0) {
      const a = Math.atan2(mount.y - e.y, mount.x - e.x);
      ebullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, r: 4, life: 6, big: e.big });
      e.fireT = 1.2 + V.rnd() * 0.8;
    }
  }

  function stepTriangle(e, dt) {
    if (e.frozen > 0) return;
    const d = Math.hypot(mount.x - e.x, mount.y - e.y);
    if (d < 120) {
      fx.push({ kind: 'boom', x: e.x, y: e.y, r: 60, t: 0.35 });
      if (d < 60) damage(10 * (e.big ? 2 : 1));
      e.dead = true;
      return;
    }
    e.stateT -= dt;
    if (e.state === 'rest') {
      if (e.stateT <= 0) {
        const a = Math.atan2(mount.y - e.y, mount.x - e.x);
        e.vx = Math.cos(a) * 420; e.vy = Math.sin(a) * 420;
        e.state = 'lunge'; e.stateT = 0.5;
      }
    } else {
      e.x += e.vx * dt; e.y += e.vy * dt;
      if (e.stateT <= 0) { e.state = 'rest'; e.stateT = 1.2; e.vx = 0; e.vy = 0; }
    }
  }

  // burn/poison/bleed damage-over-time ticks, and the chill/frozen countdowns
  function tickStatus(e, dt) {
    if (e.burn) {
      e.burn.t -= dt; e.burn.tick -= dt;
      if (e.burn.tick <= 0) {
        e.burn.tick += 0.75;
        e.hp -= e.burn.dmg;
        pushPop(e.x, e.y - e.h * 0.6, e.burn.dmg, COLS.fire, false);
        if (e.hp <= 0) killEnemy(e);
      }
      if (e.burn && e.burn.t <= 0) e.burn = null;
    }
    if (e.poison) {
      e.poison.t += dt;
      if (e.poison.t >= e.poison.every) {
        e.poison.t -= e.poison.every;
        e.hp -= e.poison.dmg;
        pushPop(e.x, e.y - e.h * 0.6, e.poison.dmg, COLS.poison, false);
        e.poison.left -= 1;
        if (e.hp <= 0) killEnemy(e);
        if (e.poison && e.poison.left <= 0) e.poison = null;
      }
    }
    if (e.bleed) {
      e.bleed.t += dt;
      if (e.bleed.t >= 0.1) {
        e.bleed.t -= 0.1;
        e.hp -= e.bleed.dmg;
        pushPop(e.x, e.y - e.h * 0.6, e.bleed.dmg, COLS.enemy, false);
        e.bleed.left -= 1;
        if (e.hp <= 0) killEnemy(e);
        if (e.bleed && e.bleed.left <= 0) e.bleed = null;
      }
    }
    if (e.chill > 0) e.chill -= dt;
    if (e.frozen > 0) e.frozen -= dt;
  }

  function stepEnemies(dt) {
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.dead) continue;
      e.t += dt;
      if (e.kind === 'skull') stepSkull(e, dt);
      else if (e.kind === 'cone') stepCone(e, dt);
      else stepTriangle(e, dt);
      if (e.dead) continue;
      tickStatus(e, dt);
      if (e.dead) continue;
      pushOutOfBlocks(e);
    }
    enemies = enemies.filter(e => !e.dead);
  }

  function stepEnemyBullets(dt) {
    for (let i = 0; i < ebullets.length; i++) {
      const b = ebullets[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.x < 0 || b.x > V.W || b.y < V.top || b.y > V.H) { b.dead = true; continue; }
      if (Math.hypot(b.x - mount.x, b.y - mount.y) < 14) { damage(10 * (b.big ? 2 : 1)); b.dead = true; }
    }
    ebullets = ebullets.filter(b => !b.dead && b.life > 0);
  }

  // the mount takes a hit: a short cooldown so overlapping sources can't stack in one instant
  function damage(n) {
    if (hitCool > 0) return;
    hitCool = 0.5;
    hp -= n;
    fx.push({ kind: 'hit', x: mount.x, y: mount.y, t: 0.3 });
    if (hp <= 0) lose();
    refresh();
  }

  // the run is over: clear the field, drop every boon, and roll a fresh gun
  function lose() {
    lost = 1.6;
    enemies = []; bullets = []; ebullets = [];
    boons = []; pool = RB.BOONS.slice();
    gun = FG.randomGun();
    B = RB.build(gun, boons);
    hp = B.maxHp; kills = 0; pending = 0;
    offerBoon = null;
    ocard.hidden = true;
    refresh();
  }

  function stepFx(dt) {
    for (const f of fx) {
      f.t -= dt;
      if (f.kind === 'spark' || f.kind === 'frag') {
        f.x += f.vx * dt; f.y += f.vy * dt;
        if (f.kind === 'frag') f.vy += 700 * dt;
      }
    }
    fx = fx.filter(f => f.t > 0);
    if (fx.length > 120) fx.splice(0, fx.length - 120);
  }
  function stepPops(dt) {
    for (const p of pops) { p.vy += 260 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt; }
    pops = pops.filter(p => p.t > 0);
  }

  function showOffer() {
    rerolls = 0;
    ocard.querySelector('.take').innerHTML = '<b>' + offerBoon.name + '</b>' + offerBoon.desc;
    ocard.querySelector('.reroll').disabled = false;
    ocard.hidden = false;
    ocard.style.bottom = (card.offsetHeight + 24) + 'px';
  }
  function takeBoon() {
    boons.push(offerBoon);
    pool = pool.filter(b => b !== offerBoon);
    B = RB.build(gun, boons);
    if (B.heal) { hp = B.maxHp; B.heal = false; }
    hp = Math.min(hp, B.maxHp);
    done();
  }
  function denyBoon() {
    pool = pool.filter(b => b !== offerBoon);
    hp = Math.max(1, hp - 10);
    done();
  }
  function rerollBoon() {
    if (rerolls >= 2) return;
    rerolls++;
    const next = RB.offer(pool.filter(b => b !== offerBoon), V.rnd);
    if (next) offerBoon = next;
    ocard.querySelector('.take').innerHTML = '<b>' + offerBoon.name + '</b>' + offerBoon.desc;
    if (rerolls >= 2) ocard.querySelector('.reroll').disabled = true;
  }
  function done() {
    offerBoon = null;
    pending--;
    ocard.hidden = true;
    refresh();
  }

  function draw(ctx, v) {
    drawBullets(ctx);
    drawFx(ctx);
    drawEnemies(ctx);
    drawMount(ctx);
    drawPops(ctx);
    if (lost > 0) drawLost(ctx);
  }

  // dominant-damage colour, plus a 2-segment tail derived from the current velocity
  function drawBullets(ctx) {
    for (const bl of bullets) {
      const col = bl.fire > 0 ? COLS.fire : (bl.cold > 0 && bl.phys === 0 ? COLS.cold : (bl.poison > 0 && bl.phys === 0 ? COLS.poison : COLS.phys));
      const p1x = bl.x - bl.vx * V.dt, p1y = bl.y - bl.vy * V.dt;
      const p2x = p1x - bl.vx * V.dt, p2y = p1y - bl.vy * V.dt;
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.globalAlpha = 0.4;
      ctx.beginPath(); ctx.moveTo(p2x, p2y); ctx.lineTo(p1x, p1y); ctx.lineTo(bl.x, bl.y); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(bl.x, bl.y, bl.r, 0, U.TAU); ctx.fill();
    }
    ctx.fillStyle = COLS.enemy;
    for (const b of ebullets) { ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, U.TAU); ctx.fill(); }
  }

  function drawFx(ctx) {
    for (const f of fx) {
      if (f.kind === 'flash') P.glow(ctx, f.x, f.y, 10, '255,220,150', Math.max(0, f.t / 0.06));
      else if (f.kind === 'spark') {
        ctx.globalAlpha = Math.max(0, f.t / 0.25);
        ctx.fillStyle = COLS.phys;
        ctx.fillRect(Math.round(f.x) - 1, Math.round(f.y) - 1, 2, 2);
        ctx.globalAlpha = 1;
      } else if (f.kind === 'boom') {
        const a = 0.35 * (f.t / 0.35);
        ctx.fillStyle = 'rgba(255,122,46,' + a + ')';
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, U.TAU); ctx.fill();
        ctx.strokeStyle = COLS.fire; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1 - f.t / 0.35), 0, U.TAU); ctx.stroke();
      } else if (f.kind === 'frag') {
        ctx.fillStyle = '#3a0609';
        ctx.fillRect(Math.round(f.x) - 1, Math.round(f.y) - 1, 3, 3);
      } else if (f.kind === 'hit') {
        ctx.globalAlpha = Math.max(0, f.t / 0.3);
        ctx.strokeStyle = COLS.enemy; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(f.x, f.y, 6 + 16 * (1 - f.t / 0.3), 0, U.TAU); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }

  // shade-then-clip-and-relit fill, shared by every flat-fill enemy body: pathFn draws the
  // shape into the current path (no fill), twoTone fills it shaded then lit on the left 30%
  function twoTone(ctx, w, h, pair, pathFn) {
    ctx.fillStyle = pair[1]; pathFn(); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w * 0.3, h); ctx.clip();
    ctx.fillStyle = pair[0]; pathFn(); ctx.fill();
    ctx.restore();
  }
  // a w×h box centred on 0,0 with its 4 corner cut squares skipped, for a rounded feel
  function plusPath(ctx, w, h, c) {
    ctx.beginPath();
    ctx.rect(-w / 2 + c, -h / 2, w - 2 * c, h);
    ctx.rect(-w / 2, -h / 2 + c, w, h - 2 * c);
  }
  // a triangle centred on 0,0: upright (point up) or inverted (point down)
  function triPath(ctx, w, h, up) {
    ctx.beginPath();
    if (up) { ctx.moveTo(0, -h / 2); ctx.lineTo(w / 2, h / 2); ctx.lineTo(-w / 2, h / 2); }
    else { ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, -h / 2); ctx.lineTo(0, h / 2); }
    ctx.closePath();
  }

  function drawSkull(ctx, e) {
    ctx.save();
    ctx.translate(e.x, e.y); ctx.rotate(e.ang);
    const w = e.w, h = e.h, cut = Math.max(2, Math.round(Math.min(w, h) * 0.15));
    twoTone(ctx, w, h, COLS.bone, () => plusPath(ctx, w, h, cut));
    const eyeY = -h / 2 + h * 0.18;
    ctx.fillStyle = '#2a2622';
    ctx.fillRect(-w * 0.2 - 3, eyeY, 6, 6);
    ctx.fillRect(w * 0.2 - 3, eyeY, 6, 6);
    ctx.fillStyle = COLS.enemy;
    ctx.fillRect(-w * 0.2 - 1, eyeY + 2, 2, 2);
    ctx.fillRect(w * 0.2 - 1, eyeY + 2, 2, 2);
    ctx.fillStyle = COLS.bone[1];
    ctx.fillRect(-w / 2, -h / 2 + h * 0.75, w, 2);
    ctx.restore();
  }

  function drawCone(ctx, e) {
    ctx.save();
    ctx.translate(e.x, e.y); ctx.rotate(e.ang);
    const w = e.w, h = e.h;
    twoTone(ctx, w, h, COLS.cone, () => triPath(ctx, w, h, false));
    ctx.fillStyle = COLS.phys;
    ctx.fillRect(-3, -h / 2 + 4, 6, 6);
    ctx.restore();
  }

  function drawTriangle(ctx, e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    if (e.state === 'lunge') { ctx.rotate(Math.atan2(e.vy, e.vx)); ctx.scale(1.3, 1); }
    else { const s = 1 + 0.08 * Math.sin(e.t * 8); ctx.scale(s, s); }
    twoTone(ctx, e.w, e.h, COLS.red, () => triPath(ctx, e.w, e.h, true));
    ctx.restore();
  }

  // burn/chill/frozen/poison/bleed marks plus the low-hp bar, in world space (unrotated)
  function drawStatus(ctx, e) {
    const x0 = e.x - e.w / 2, y0 = e.y - e.h / 2;
    if (e.burn) {
      ctx.fillStyle = '#ff7a2e';
      for (let i = 0; i < 3; i++) {
        const ox = e.w * (0.25 + 0.25 * i) + Math.sin(e.t * 6 + i) * 3;
        const oy = e.h * 0.3 + Math.sin(e.t * 9 + i * 2) * 3;
        ctx.fillRect(x0 + ox - 1, y0 + oy - 1, 3, 3);
      }
    }
    if (e.chill > 0) { ctx.strokeStyle = '#8fd3ff'; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, y0 + 0.5, e.w - 1, e.h - 1); }
    if (e.frozen > 0) { ctx.fillStyle = 'rgba(143,211,255,0.45)'; ctx.fillRect(x0, y0, e.w, e.h); }
    if (e.poison) {
      ctx.fillStyle = COLS.poison;
      ctx.fillRect(x0 + e.w * 0.35, y0 + e.h * 0.55, 2, 2);
      ctx.fillRect(x0 + e.w * 0.6, y0 + e.h * 0.6, 2, 2);
    }
    if (e.bleed) {
      ctx.fillStyle = COLS.enemy;
      ctx.fillRect(x0 + e.w * 0.4, y0 + e.h, 2, 4);
      ctx.fillRect(x0 + e.w * 0.6, y0 + e.h, 2, 4);
    }
    if (e.hp < e.max) {
      ctx.fillStyle = '#2b2d2b'; ctx.fillRect(x0, y0 + e.h + 2, e.w, 2);
      ctx.fillStyle = COLS.enemy; ctx.fillRect(x0, y0 + e.h + 2, e.w * U.clamp(e.hp / e.max, 0, 1), 2);
    }
  }

  function drawEnemies(ctx) {
    for (const e of enemies) {
      if (e.kind === 'skull') drawSkull(ctx, e);
      else if (e.kind === 'cone') drawCone(ctx, e);
      else drawTriangle(ctx, e);
      drawStatus(ctx, e);
    }
  }

  function drawMount(ctx) {
    ctx.fillStyle = COLS.red[1];
    ctx.fillRect(mount.x - 18, mount.y - 8, 36, 24);
    ctx.fillStyle = COLS.red[0];
    ctx.fillRect(mount.x - 18, mount.y - 8, 36 * 0.3, 24);
    ctx.save();
    ctx.translate(mount.x, mount.y - 2); ctx.rotate(mount.ang);
    ctx.fillStyle = COLS.red[1];
    ctx.fillRect(0, -4, 30, 8);
    ctx.restore();
    const bw = 48, bx = mount.x - bw / 2, by = mount.y - 26;
    ctx.fillStyle = '#2b2d2b'; ctx.fillRect(bx, by, bw, 5);
    const frac = U.clamp(hp / B.maxHp, 0, 1);
    ctx.fillStyle = frac < 0.35 ? '#d92b2b' : '#82cc3c';
    ctx.fillRect(bx, by, bw * frac, 5);
    if (V.pointer.has) {
      const mx = mount.x + Math.cos(mount.ang) * 30, my = mount.y + Math.sin(mount.ang) * 30;
      ctx.strokeStyle = 'rgba(230,212,58,0.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(mx, my);
      ctx.lineTo(mx + Math.cos(mount.ang) * 60, my + Math.sin(mount.ang) * 60);
      ctx.stroke();
    }
  }

  function drawPops(ctx) {
    ctx.textAlign = 'center';
    for (const p of pops) {
      ctx.globalAlpha = p.t < 0.3 ? Math.max(0, p.t / 0.3) : 1;
      ctx.font = (p.big ? '600 14px ' : '600 12px ') + '"IBM Plex Mono", monospace';
      ctx.fillStyle = p.col;
      ctx.fillText(String(p.text), p.x, p.y);
    }
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }

  function drawLost(ctx) {
    ctx.globalAlpha = Math.min(1, lost / 1.6);
    ctx.fillStyle = '#ff6b5a';
    ctx.font = '600 12px "IBM Plex Mono"';
    ctx.textAlign = 'center';
    ctx.fillText('run lost · boons gone', mount.x, mount.y - 40);
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }

  function atRest(v) {
    return !firing && bullets.length === 0 && ebullets.length === 0 && enemies.length === 0
      && fx.length === 0 && pops.length === 0 && delayed.length === 0 && lost <= 0;
  }

  function resize(v) {
    mount.x = Math.max(22, v.gutter * 0.5 + 2);
    mount.y = v.H - 48;
    for (const e of enemies) clampEnemyToScreen(e);
  }

  function report() {
    return { gun: gun.type, boons: boons.map(b => b.id), hp, kills, bullets: bullets.length, enemies: enemies.length };
  }

  const H = P.start({ name: 'range', seed: 41, setup, step, draw, atRest, press, release, resize });
  window.PlayRange = { report };
})();
