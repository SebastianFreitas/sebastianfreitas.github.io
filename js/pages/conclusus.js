/* conclusus.js — the Conclusus case page becomes a vertical platformer level in
   the free space beside the text: grass platforms with planted shadow twins,
   silhouette enemies beside "The silhouettes" on a green/silver cycle, three turning keys (one over each of their sections; taking one flies it into a tray), and an
   exit arch beside "What it taught me". The player teleports between shadows; when his
   platform scrolls out of view he teleports into whichever shadow sits
   nearest the middle of the screen, following the reader down the page.
   Platforms/twins/keys/door/player/bursts draw in page coords on the play-tiles
   layer via drawDoc; the rain stays on the fixed canvas. */
(function () {
  "use strict";
  const U = window.Util, P = window.Play;
  if (!U || !P) return;

  const GREEN = "180,199,136", PALE = "247,255,197", RAIN = "175,192,132";
  const PLAT_W = 64, PLAT_H = 28;      // 32x14 art at 2x
  const SOLID_ROW = [2, 3, 3, 3, 2];   // first solid grass art row per platform sprite (the door's base sits on it)
  const MAN_W = 16, MAN_H = 52;
  const MAN_CX = 32;                    // x of the man's centre inside a platform, measured from plat.x
  const SWAP = 0.25;                   // shadow/silhouette frame swap (game)
  const CYCLE = 1.2;                   // silhouette state length (game: 0.2 s + 1 s)
  const COOL = 0.7;                    // seconds between camera-follow teleports
  const GRAV = 1400;
  const CPAL = ["#b4c788", "#62554c", "#463c3c", "#f7ffc5", "#8b6a44", "#312629", "#d6f5e4", "#8a8969"];
  const MODES = [{ spin: 60, dur: 3 }, { spin: 120, dur: 1.5 }, { spin: 240, dur: 0.5 }, { spin: 300, dur: 0.8 }];
  const KEY_HEADS = ["Key and door", "The shadow", "Thirty levels"];
  const HINT_MORE = "another key waits further down", HINT_DOOR = "three keys: open the door";

  const DEFS = {
    cc_idle1: {w:8, h:26, ox:11, oy:6, px:'...b.......bbbb...bbbd.....dfd......dd.....gff...hhhgfg..hhhheg..hhhheh.hh.hheh.hh.hhbh.hh.hhbh.hhhhhbhhgghhhehg.dhhheed..hhhee...hhhee..hhhh.e..hhhh.e..hhhh.e..hhh..e...e...e...e...e...e...e...b...b...b...b.'},
    cc_idle2: {w:8, h:25, ox:11, oy:7, px:'...b.......bbbb...bbbd.....dfd......dd.....gff...hhhgfg..hhhheg..hhhheh.hh.hheh.hh.hhbh.hh.hhbhhgghhhbhg.dhhhehd..hhhee...hhhee...hhhee..hhhh.e..hhhh.e..hhhh.e..hhh..e...e...e...e...e...b...b...b...b.'},
    cc_greenA: {w:8, h:26, ox:11, oy:6, px:'...a.......aaaa...aaaa.....aaa......aa.....aaa...aaaaaa..aaaaaa..aaaaaa.aa.aaaa.aa.aaaa.aa.aaaa.aaaaaaaaaaaaaaaa.aaaaaaa..aaaaa...aaaaa..aaaa.a..aaaa.a..aaaa.a..aaa..a...a...a...a...a...a...a...a...a...a...a.'},
    cc_greenB: {w:8, h:25, ox:11, oy:7, px:'...a.......aaaa...aaaa.....aaa......aa.....aaa...aaaaaa..aaaaaa..aaaaaa.aa.aaaa.aa.aaaa.aa.aaaaaaaaaaaaa.aaaaaaa..aaaaa...aaaaa...aaaaa..aaaa.a..aaaa.a..aaaa.a..aaa..a...a...a...a...a...a...a...a...a.'},
    cc_silverA: {w:8, h:26, ox:11, oy:6, px:'...g.......gggg...gggg.....ggg......gg.....ggg...gggggg..gggggg..gggggg.gg.gggg.gg.gggg.gg.gggg.gggggggggggggggg.ggggggg..ggggg...ggggg..gggg.g..gggg.g..gggg.g..ggg..g...g...g...g...g...g...g...g...g...g...g.'},
    cc_silverB: {w:8, h:25, ox:11, oy:7, px:'...g.......gggg...gggg.....ggg......gg.....ggg...gggggg..gggggg..gggggg.gg.gggg.gg.gggg.gg.ggggggggggggg.ggggggg..ggggg...ggggg...ggggg..gggg.g..gggg.g..gggg.g..ggg..g...g...g...g...g...g...g...g...g.'},
    cc_plat_f3g2: {w:32, h:13, ox:0, oy:13, px:'......a................a.............aa..a.......a....aaa......a.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.aaaaaabbaaabbbaabbbaaaabaabaabaaabaaaabbbabbabbabbabbabaababbbaacbbbabbbbbabbabbabbbabbbbbbbabaaccbbbbbbbbabbbbbbbbbbbbbbbbbbbbaccbcbbbbcbbbbbbbbbbbbbbbbbbbbbbaccccbbbbcbccbbbbbbbcbcbbbbbbbbbc.cccccbbbcccccbbbbccbcbbbbbbbbc.c.ccccccccccccccbccccbcccbcbcc.c....c.cc..cc...cc....cc..ccc...........c..c.....................'},
    cc_plat_f4g4: {w:32, h:14, ox:0, oy:12, px:'a....a....a.....a..a.........a..a...a...a.a.a..aa...a..a....aa...a.aa.aa..a.a.aaaaa.aa..a.a.aa.a.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.aababaaaabaabaaabbaaabbbbaabaaaaababbbbababbbaabbbaabbbbababbbbacbbbbbabbbbbbbbbbaabbbbbbbbbbbaacbbbbbbbbbbbbbabbbbbbbbbbbbbbbbaccbbcbbcbbbbbbbcbbbbbbbbbbbbbbbaccbccbbcccbbbbbbcccbbbbbbbbbbbbc.cccccbbcccbbbbbbccbbbbbbbbbbbc.c.cccccccccccccccccccbbccbcbcc.c.cccc.c..ccc...ccc..ccc..c.c.....c.c..c...c......c..c...........'},
    cc_plat_f1g5: {w:32, h:14, ox:0, oy:12, px:'.....a..............................a...a....a......a..a.....a..a..aa.a..a..a.....a.aa.aa.a.a....aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.aaaabbaabbbbaabaabbaababbbaaaaaaababbbbbabbbababbbbbabbbbabaabaacabbbbbbbbbabbbbbbbabbbbbbbabbbacbbcbbbbbbbbbbbbbbbbbbbbbbbbabbaccbcbbcbbbbbbbbbbbbbbbbbbbbbbbbaccbbcbbcbcbbbcbbbbbbbbbbbbbbbbbc.cccccbcccccbbcbbbbbbbbbbbbbbbc.c.ccccccccccccccbccccbcccbcbcc.c....c.c...cc...cc....cc..c.c.............c............c.........'},
    cc_plat_f3g5: {w:32, h:14, ox:0, oy:12, px:'.....a..............................a...a....a......a..a.....a..a..aa.a..a..a.....a.aa.aa.a.a....aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.aaaaaabbaaabbbaabbbaaaabaabaabaaabaaaabbbabbabbabbabbabaababbbaacbbbabbbbbabbabbabbbabbbbbbbabaaccbbbbbbbbabbbbbbbbbbbbbbbbbbbbaccbcbbbbcbbbbbbbbbbbbbbbbbbbbbbaccccbbbbcbccbbbbbbbcbcbbbbbbbbbc.cccccbbbcccccbbbbccbcbbbbbbbbc.c.ccccccccccccccbccccbcccbcbcc.c....c.cc..cc...cc....cc..ccc...........c..c.....................'},
    cc_plat_f2g2: {w:32, h:13, ox:0, oy:13, px:'......a................a.............aa..a.......a....aaa......a.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.aaabaaababbbbbaabaaababbbaabbaaaaababbabbbabbaabbbbaabbbabbbbabacabbabbbbabbbbbbbbbabbbbbabbbbaacbbbbbbbbbbbbbbbabbbabbbabbbbbbaccbbbccbbbbbbbbbbbbbbbbbbbbbbbbaccbbccbbcbbbcbbbbbbbbbbbbbbbbbbc.cccccbcbbcccbbbbbbbbbbbbbbbbbc.c.ccccccccccccccbccccbbccbcbcc.c....ccc..ccc..ccc.cc.cc..c.c..........c..c........c.............'},
    cc_symbol3: {w:16, h:16, ox:8, oy:8, px:'.......dd..............dd..................................................d...........................dd.......dd....dddd....dddd....dddd....dd.......dd...........................d..................................................dd..............dd.......'},
    cc_door_new: {w:28, h:31, ox:2, oy:1, px:'............dddd......................ddaaaadd..................ddaa.a..aadd..............ddaa.......aaadd............aaa.........a.aa...........ddaa........a..add...........da............ad..........ddda............addd.........aa.............aaa.........dd.a..............dd.........a...............aa..........da...............d..........aa..............aa.........dda...............dd.........a................a.........dda.............aadd.......d.da............a.ad.d........da............a.ad........d.aa..............aa.d.......dda..............add.........da..............ad........dddaa............aaddd........da.a............ad.........dda..............add.......dada..............adad....dd.ada..............ada.dd....dada......a.......adad.....aaada.....a.......aadaaa...dadddaa..a..a...a...adddad...aaada..a...aa...a.aadaaaa.aaddddaaaaaaaaaaaaaaaaddddaa'},
    cc_door_new2: {w:30, h:32, ox:1, oy:0, px:'..............dd...........................dddd........................ddaaaadd..................d.ddaa.a..aadd.d..............ddaa.......aaadd..............aaa.........a.aa............dddaa........a..addd............da............ad............ddda............addd...........aa.............aaa...........dd.a..............dd...........a...............aa...........eea...............e............ea..............aae..........dda...............dd.........e.a................aaa.......e.eea.............aaeea.a....a.ddd.............a..ddda......aaaea............a.aee........addd................dd........aeeea..............ae...........eaa..............aeaa.......aeeeaa............aaeee......a.aaaa.a............aaea........aeea..............aeeaa........aaa..............aaae........aaea..............aeaa........eaaa......a.......aaeee......aaaea.....a.......aaeaa......eaeeeaa..a..a...a...aeee.....eaaaaaa..a...aa...a.aaaaaaea.eeaeeaeaaaaaaaaaaaaaaaaeaeeaee'},
    cc_spikeball: {w:17, h:17, ox:7, oy:7, px:'........g................g...............ggg..............ggg.............ggggg.............ggg...........g..ggg..g......gggggfffggggg..gggggggfffggggggg..gggggfffggggg......g..ggg..g...........ggg.............ggggg.............ggg..............ggg...............g................g........'},
  };

  let V;                       // the shared frame-state object, captured once in setup
  let SPR = {};                 // cached sprites, built in setup
  let plats = [], sils = [], spikes = [], rain = [], rrnd = null, bursts = [];
  let keys = [], door = null, rainBoost = 0, rainSm = 0;
  let player = { plat: -1, x: 0, y: 0, face: 1, air: null, first: false, arrived: false };
  let placed = false, cool = 0, hover = null, sig = "", hintEl = null;
  let lastSnap = null;
  let idleT = 0, clicked = false;
  let revealed = false, revT = 0, rev = 0, revealY = 0;
  let playPlat = -1, playDone = false;
  let won = false, winSeq = null;       // door flow state: { ph: fly|dim, t, paid }
  let winEnd = -1;                      // seconds since the win ended (hint + arch glow settle); -1 before
  let trayEl = null, slotEls = [], flyEl = null, flyG = null, flyDpr = 1, flyDirty = false, trayN = 0;
  let sigW = -1, sigDocH = -1;
  let spec = null;
  const rainCol = [];           // "rgba(...)" cache keyed by rounded alpha bucket, filled lazily
  const burstCol = [];          // "rgba(...)" cache keyed by life-fraction bucket, filled lazily

  function inBox(px, py, bx, by, bw, bh) {
    return px >= bx && px < bx + bw && py >= by && py < by + bh;
  }

  // is a document y outside the tile drawDoc is painting (+ a margin for glows and sprite height)?
  let tileY0 = 0, tileY1 = 0;
  function offTile(y) {
    return y < tileY0 - 160 || y > tileY1 + 160;
  }

  function rectHitsBlocks(x, y, w, h, blocks) {
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (x < b.x + b.w && x + w > b.x && y < b.y + b.h && y + h > b.y) return true;
    }
    return false;
  }

  function pointHitsBlocks(x, y, blocks) {
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return true;
    }
    return false;
  }

  function silGreen(t) {
    return Math.floor((t + 0.2) / CYCLE) % 2 === 0;
  }

  // a 0/1 toggle every half-period; normalised because V.t can be a hair negative
  // on the first painted frame (the rAF timestamp can lag the pacer's start() clock)
  function frame01(t, period) {
    return ((Math.floor(t / period) % 2) + 2) % 2;
  }

  function sigOf(V) {
    // hysteresis: ignore scrollbar-sized width jitter and small doc-height drift
    if (sigW < 0 || Math.abs(V.R - sigW) >= 20) sigW = V.R;
    if (sigDocH < 0 || Math.abs(V.docH - sigDocH) >= 40) sigDocH = V.docH;
    return V.blocks.length + "/" + Math.round(sigDocH) + "/" + Math.round(V.main.w) + "/" + sigW;
  }

  // the first platform at or below y that is not held, else the last free one
  function placeBeat(y, held) {
    const s = plats.findIndex(p => p.y >= y);
    if (s >= 0) {
      for (let i = s; i < plats.length; i++) if (!held.includes(i)) return i;
    }
    for (let i = plats.length - 1; i >= 0; i--) if (!held.includes(i)) return i;
    return -1;
  }

  function lockKeys() {
    for (let k = 0; k < keys.length; k++) {
      keys[k].locked = k === 0 ? !playDone : !keys[k - 1].done;
      if (!keys[k].locked) keys[k].lit = 1;
    }
    trayN = won ? 0 : keys.filter(k => k.done).length;
    for (let k = 0; k < 3; k++) paintSlot(k, !won && !!(keys[k] && keys[k].done));
  }

  function paintSlot(k, full) {
    if (!slotEls[k]) return;
    const c = slotEls[k], g = c.getContext("2d");
    g.clearRect(0, 0, c.width, c.height);
    g.imageSmoothingEnabled = false;
    const s = full ? SPR.sym : SPR.symEmpty;
    if (s) g.drawImage(s.cv, 0, 0, c.width, c.height);
  }

  function sizeFly() {
    if (!flyEl) return;
    flyDpr = Math.min(2, window.devicePixelRatio || 1);
    flyEl.width = Math.round(V.W * flyDpr);
    flyEl.height = Math.round(V.H * flyDpr);
    flyDirty = true;
  }

  function easeIO(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  // capture progress before a relayout wipes plats/sils/keys/door
  function snapshotProgress() {
    if (!plats.length) return lastSnap;
    let keysGot = 0, keysDone = 0;
    for (let i = 0; i < keys.length; i++) { if (keys[i].got) keysGot++; if (keys[i].done) keysDone++; }
    const twins = plats.map(p => p.twin);
    return lastSnap = {
      keysGot, keysDone,
      playerOrd: player.plat,
      twins
    };
  }

  // restore progress into a freshly-built layout
  function restoreProgress(snap) {
    if (!snap || !plats.length) return;
    for (let i = 0; i < plats.length && i < snap.twins.length; i++) {
      plats[i].twin = snap.twins[i];
    }
    for (let i = 0; i < sils.length; i++) plats[sils[i].plat].twin = false;
    const gotN = Math.min(snap.keysGot, keys.length);
    for (let i = 0; i < gotN; i++) {
      keys[i].got = true; keys[i].locked = false; keys[i].lit = 1;
      if (i < snap.keysDone) keys[i].done = true; else landKey(i);
    }
    if (snap.playerOrd >= 0) {
      player.plat = Math.min(snap.playerOrd, plats.length - 1);
      player.x = plats[player.plat].x + MAN_CX;
      player.y = plats[player.plat].y + 2;
      player.air = null;
      player.arrived = true;
      plats[player.plat].twin = false;
    }
  }

  // (re)build every platform, silhouette, the symbol, the door and the spikes from
  // V.blocks; called from setup, resize, and from step whenever the page signature changes
  function layout(V) {
    if (trayEl) trayEl.style.right = (V.W - V.R + 16) + "px";   // the key tray stays inside the folder frame
    const snap = snapshotProgress();
    const rnd = U.mulberry(23);           // local: layouts are identical on every run
    const arr = [];
    for (let i = 0; i < V.blocks.length && arr.length < 60; i++) {
      const b = V.blocks[i];
      const free = V.R - 24 - (b.x + b.w);
      if (free < 100) continue;
      const ys = (b.media && b.h > 300) ? [b.y + b.h * 0.3, b.y + b.h * 0.85] : [b.y + b.h - 4];
      const xmin = b.x + b.w + (b.media ? 24 : 40), xmax = V.R - 24 - PLAT_W;
      if (xmax < xmin) continue;
      for (let j = 0; j < ys.length && arr.length < 60; j++) {
        const y = ys[j];
        if (arr.length && y - arr[arr.length - 1].y < 90) continue;
        let x = xmin + rnd() * (xmax - xmin);
        const rect = { x, y: y - MAN_H, w: PLAT_W, h: PLAT_H + MAN_H };
        const hits = V.blocks.filter(h => rect.x < h.x + h.w && rect.x + rect.w > h.x && rect.y < h.y + h.h && rect.y + rect.h > h.y);
        if (hits.length) {
          x = Math.max(...hits.map(h => h.x + h.w)) + 24;
          if (x > xmax) continue;
          rect.x = x;
          if (V.blocks.some(h => rect.x < h.x + h.w && rect.x + rect.w > h.x && rect.y < h.y + h.h && rect.y + rect.h > h.y)) continue;
        }
        arr.push({ x, y, spr: Math.floor(rnd() * 5), twin: true, tf: -1, lit: 0, left: 0 });
      }
    }
    plats = arr;

    if (!plats.length) {
      player.plat = -1;
    } else if (!placed) {
      player.plat = 0;
      player.x = plats[0].x + MAN_CX;
      player.y = plats[0].y + 2;
      player.face = 1; player.air = null; player.first = true;
      plats[0].twin = false;
      placed = true;
    } else if (player.plat >= 0 || placed) {
      const ord = Math.max(0, Math.min(player.plat, plats.length - 1));
      player.plat = ord;
      player.x = plats[player.plat].x + MAN_CX;
      player.y = plats[player.plat].y + 2;
      plats[player.plat].twin = false;
    }

    const ph = V.blocks.find(b => b.el && b.el.matches && b.el.matches(".case h2") && b.el.textContent.trim() === "The brief");
    if (!plats.length) playPlat = -1;
    else if (ph) {
      playPlat = plats.findIndex(p => p.y >= ph.y);
      if (playPlat < 0) playPlat = plats.length - 1;
    } else playPlat = plats.length > 1 ? 1 : plats.length - 1;

    keys = [];
    if (plats.length >= 4) {
      const held = [playPlat];
      for (let n = 0; n < 3; n++) {
        const h = V.blocks.find(b => b.el && b.el.matches && b.el.matches(".case h2") && b.el.textContent.trim() === KEY_HEADS[n]);
        const y = h ? h.y : plats[Math.floor(plats.length * [0.3, 0.5, 0.75][n])].y;
        const idx = placeBeat(y, held);
        if (idx < 0) break;
        held.push(idx);
        const x = plats[idx].x + 16, ky = plats[idx].y - 72;
        keys.push({ x, y: ky, hx: x, hy: ky, plat: idx, ang: 0, mode: 0, left: MODES[0].dur, got: false, done: false, lit: 0, fly: null, locked: true });
      }
    }

    door = null;
    if (plats.length) {
      const th = V.blocks.find(b => b.el && b.el.matches && b.el.matches(".case h2") && b.el.textContent.trim() === "What it taught me");
      const di = placeBeat(th ? th.y : plats[plats.length - 1].y, [playPlat, ...keys.map(k => k.plat)]);
      if (di >= 0) door = { x: plats[di].x + PLAT_W - 60, y: plats[di].y + SOLID_ROW[plats[di].spr] * 2 - SPR.door.h, plat: di, lit: 0 };
    }

    sils = [];
    const sh2 = V.blocks.find(b => b.el && b.el.matches && b.el.matches(".case h2") && b.el.textContent.trim() === "The silhouettes");
    if (sh2) {
      let nextY = Infinity;
      for (const b of V.blocks) if (b.el && b.el.matches && b.el.matches(".case h2") && b.y > sh2.y && b.y < nextY) nextY = b.y;
      const held = [playPlat, ...keys.map(k => k.plat), door ? door.plat : -1];
      for (let i = 0; i < plats.length && sils.length < 5; i++) {
        if (plats[i].y < sh2.y || plats[i].y >= nextY || held.includes(i)) continue;
        const x = plats[i].x + PLAT_W - MAN_W - 4, y = plats[i].y + 2 - MAN_H;
        if (rectHitsBlocks(x, y, MAN_W, MAN_H, V.blocks)) continue;
        plats[i].twin = false;
        sils.push({ x, y, gone: false, fade: 1, shake: 0, back: 0, plat: i });
      }
    }

    spikes = [];
    for (let i = 0; i < 2; i++) {
      const x = V.R - 60 - i * 70;
      const idx = Math.floor(plats.length * 0.5) + i;
      const y = (plats[idx] && plats[idx].y - 80) || V.main.y + 300;
      if (x < V.main.x + 200 || pointHitsBlocks(x, y, V.blocks)) continue;
      spikes.push({ x, y, amp: 5 + i * 3, ph: i * 1.7 });
    }

    restoreProgress(snap);
    lockKeys();
    if (door) { door.lit = doorOpen() ? 1 : 0; plats[door.plat].twin = false; }
    if (winSeq) finishWin();
    sizeFly();
    sig = sigOf(V);
    if (spec) {
      let minX = Infinity;
      for (let i = 0; i < plats.length; i++) minX = Math.min(minX, plats[i].x);
      for (let i = 0; i < spikes.length; i++) minX = Math.min(minX, spikes[i].x);
      spec.docX0 = plats.length ? Math.max(0, minX - 128) : undefined;
    }
    const sh = V.blocks.find(b => b.el && b.el.matches && b.el.matches(".embed-shell"));
    revealY = sh ? sh.y + sh.h : 0;
  }

  // the game's DestroyEffct: 16 short-lived particles, at most 120 live, ambient (V.rnd(), not the layout rnd)
  function burst(x, y) {
    for (let i = 0; i < 16; i++) {
      if (bursts.length >= 120) break;
      const a = V.rnd() * U.TAU, sp = 30 + V.rnd() * 120;
      bursts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 2, max: 2, size: 2 + V.rnd() });
    }
  }

  // jump into a known platform index, planting a shadow where he stood
  function teleportTo(i) {
    if (winSeq || !plats[i]) return;
    if (i === player.plat) return;
    burst(player.x, player.y - 26);
    if (player.plat >= 0 && !player.air && !(door && player.plat === door.plat)) { plats[player.plat].twin = true; plats[player.plat].tf = player.face; }
    player.plat = i;
    player.arrived = true;
    player.air = null;
    if (plats[i].twin) player.face = plats[i].tf;
    player.x = plats[i].x + MAN_CX;
    player.y = plats[i].y + 2;
    plats[i].twin = false;
    plats[i].lit = Math.max(plats[i].lit, 0.001);
    burst(player.x, player.y - 26);
    cool = COOL;
  }

  // jump to an arbitrary point (a silhouette) and fall from there
  function warp(x, y) {
    burst(player.x, player.y - 26);
    if (!player.air && player.plat >= 0 && !(door && player.plat === door.plat)) { plats[player.plat].twin = true; plats[player.plat].tf = player.face; }
    player.plat = -1;
    player.x = x;
    player.y = y;
    player.air = { vy: 0 };
    burst(x, y - 26);
    cool = COOL;
  }

  function takeKey(k, x, y) {
    const key = keys[k];
    if (!key || key.got || key.locked) return;
    clicked = true;
    if (player.plat !== key.plat) teleportTo(key.plat);
    const cx = key.x + 16, cy = key.y + 16;
    P.award("play-cc-key" + (k + 1), "Conclusus key", cx, cy - V.sy);
    key.got = true;
    hover = null; V.cursor && V.cursor(false);
    if (V.reduced || !slotEls[k]) { landKey(k); return; }
    const r = slotEls[k].getBoundingClientRect();
    key.fly = { t: 0, x0: cx, y0: cy, tx: r.left + r.width / 2, ty: r.top + r.height / 2, ang0: key.ang };
  }

  function landKey(k) {
    const key = keys[k];
    key.got = true; key.done = true; key.fly = null;
    flyDirty = true;
    paintSlot(k, true);
    trayN = keys.filter(q => q.done).length;
    const next = keys[k + 1];
    if (next && next.locked) { next.locked = false; next.lit = 0; }
    hintSet(k + 1 < keys.length ? HINT_MORE : HINT_DOOR);
  }

  function doorSlot(k) {
    return { x: door.x + 2 + k * 18, y: door.y + 8 };
  }

  function doorOpen() {
    return !!door && keys.length === 3 && keys.every(k => k.done);
  }

  function doorReady() { return !!door && !won && doorOpen() && door.lit >= 1; }
  function hideUi() { for (const el of [hintEl, trayEl]) if (el) { el.style.opacity = "0"; el.style.visibility = "hidden"; } }

  // he lands on the open door's platform: the three tray keys fly to the arch while he steps into it
  function startWin() {
    won = true; winSeq = { ph: "fly", t: 0, paid: false };
    clicked = true; hover = null; V.cursor && V.cursor(false);
    player.x = door.x + 28; player.face = 1;
    for (let k = 0; k < 3; k++) {
      if (!keys[k]) continue;
      const r = slotEls[k] ? slotEls[k].getBoundingClientRect() : null;
      const s = doorSlot(k);
      keys[k].fly = { t: 0, toDoor: true, x0: r ? r.left + r.width / 2 : V.W - 60, y0: r ? r.top + r.height / 2 : V.H - 60, tx: s.x + 8, ty: s.y + 8, ang0: 0 };
      paintSlot(k, false);
    }
    trayN = 0;
    if (hintEl) hintEl.style.opacity = "0";
    if (trayEl) trayEl.style.opacity = "0";
  }

  function enterArch() {
    if (winSeq) winSeq.paid = true;
    P.award("play-cc-win", "Conclusus door", door.x - 90, door.y + 60 - V.sy);
    rainBoost = 1.7;
    burst(door.x + 28, door.y + 30);
    burst(door.x + 28, door.y + 30);
    burst(door.x + 28, door.y + 30);
  }

  // the one end state: he is gone into the light, the arch stays empty, the hint says so for 3 s
  function endWin() {
    for (const q of keys) q.fly = null;
    flyDirty = true;
    if (door && !winSeq.paid) enterArch();
    player.plat = -1; player.air = null;
    winSeq = null;
    winEnd = 0;
    if (trayEl) { trayEl.style.opacity = "0"; trayEl.style.visibility = "hidden"; }
    if (hintEl) { hintEl.textContent = "the door is open"; hintEl.style.visibility = "visible"; hintEl.style.opacity = "1"; }
  }

  // a relayout during the win snaps it to its end
  function finishWin() { endWin(); }

  const hasXP = () => !!(window.XP && XP.has);
  // the bridge's own beacon (lamp.js), +1 until the XP is claimed; claimed ones stay
  function drawBeacon(ctx, id, x, y, V, has, a, hov) {
    if (V.reduced || !window.Beacon) return;
    if (has === undefined) has = hasXP();
    Beacon.draw(ctx, x, y, {
      t: V.t, phase: x * 0.013, alpha: a === undefined ? 1 : a, hover: !!hov,
      claimed: !!(has && XP.has(id)), xp: 1, gold: true,
    });
  }

  // beacon hit tests, shared by press() and move(): same centres draw() uses
  const beaconR = () => (window.Beacon && Beacon.HIT) || 26;
  const nearB = (px, py, x, y) => (px - x) * (px - x) + (py - y) * (py - y) <= beaconR() * beaconR();
  function keyAt(px, py) {
    for (let k = 0; k < keys.length; k++) {
      const q = keys[k];
      if (!q.got && !q.locked && q.lit >= 0.02 && nearB(px, py, q.x + 16, q.y - 18)) return k;
    }
    return -1;
  }
  // a green twin standing on the platform that holds an untaken, unlocked key takes that key
  function keyOnPlat(i) {
    for (let k = 0; k < keys.length; k++) if (!keys[k].got && !keys[k].locked && keys[k].plat === i) return k;
    return -1;
  }
  function playAt(px, py) {
    if (playDone) return -1;
    const t = playTarget();
    return t >= 0 && nearB(px, py, plats[t].x + 32, plats[t].y - 72) ? t : -1;
  }
  const doorAt = (px, py) => doorReady() && (inBox(px, py, door.x, door.y, 56, 64) || inBox(px, py, plats[door.plat].x, plats[door.plat].y, PLAT_W, PLAT_H));

  // where to land when he falls past the bottom of the page: the visible twin nearest mid-screen
  function nearestVisibleTwin() {
    const vt = V.sy + V.top, vb = V.sy + V.H;
    const mid = vt + (vb - vt) * 0.5;
    let best = -1, bd = Infinity;
    for (let i = 0; i < plats.length; i++) {
      const p = plats[i];
      if (!p.twin || p.y - MAN_H < vt + 40 || p.y > vb - 30) continue;
      const d = Math.abs(p.y - mid);
      if (d < bd) { bd = d; best = i; }
    }
    return best >= 0 ? best : 0;
  }

  // one mote of the corner light: born just outside the top-right corner, drifting down-left
  // on a straight line (110-160 deg), like the game's RainEffect cone
  function ray(r, rnd, V, age) {
    const a = (110 + rnd() * 50) * Math.PI / 180, sp = 24 + rnd() * 24;
    r.vx = Math.cos(a) * sp; r.vy = Math.sin(a) * sp;
    r.x = V.R + rnd() * 40 + r.vx * age;
    r.y = -rnd() * 40 + r.vy * age;
    r.a = 0.2 + rnd() * 0.3;
    return r;
  }

  function setup(v) {
    V = v;
    SPR = {
      idle: [P.sprite(CPAL, DEFS.cc_idle1), P.sprite(CPAL, DEFS.cc_idle2)],
      green: [P.sprite(CPAL, DEFS.cc_greenA), P.sprite(CPAL, DEFS.cc_greenB)],
      silver: [P.sprite(CPAL, DEFS.cc_silverA), P.sprite(CPAL, DEFS.cc_silverB)],
      plats: [DEFS.cc_plat_f3g2, DEFS.cc_plat_f4g4, DEFS.cc_plat_f1g5, DEFS.cc_plat_f3g5, DEFS.cc_plat_f2g2].map(d => P.sprite(CPAL, d)),
      sym: P.sprite(CPAL, DEFS.cc_symbol3),
      door: P.sprite(CPAL, DEFS.cc_door_new),
      doorLit: P.sprite(CPAL, DEFS.cc_door_new2),
      spike: P.sprite(CPAL, DEFS.cc_spikeball),
    };
    SPR.symGrey = P.sprite(["#6b6f73","#6b6f73","#6b6f73","#9a9ea2","#6b6f73","#6b6f73","#6b6f73","#6b6f73"], Object.assign({}, DEFS.cc_symbol3, { _s2: undefined }));
    SPR.symEmpty = P.sprite(Array(8).fill("#3a3f44"), Object.assign({}, DEFS.cc_symbol3, { _s2: undefined }));
    layout(v);
    rrnd = U.mulberry(5);
    rain = [];
    for (let i = 0; i < 32; i++) rain.push(ray({}, rrnd, v, rrnd() * 40));
    hintEl = document.createElement("p");
    hintEl.className = "play-hint";
    hintEl.textContent = "click a green shadow to step into it";
    hintEl.style.opacity = "0";
    hintEl.style.visibility = "hidden";
    hintEl.style.transition = "opacity 0.6s";
    Play.mount(hintEl);
    trayEl = document.createElement("div");
    trayEl.className = "play-ui cc-tray";
    trayEl.setAttribute("aria-hidden", "true");
    trayEl.style.opacity = "0";
    trayEl.style.visibility = "hidden";
    trayEl.style.transition = "opacity 0.6s";
    const d = Math.min(2, window.devicePixelRatio || 1);
    slotEls = [];
    for (let k = 0; k < 3; k++) {
      const c = document.createElement("canvas");
      c.width = c.height = Math.round(24 * d);
      trayEl.appendChild(c);
      slotEls.push(c);
    }
    Play.mount(trayEl);
    trayEl.style.right = (v.W - v.R + 16) + "px";
    for (let k = 0; k < 3; k++) paintSlot(k, !!(keys[k] && keys[k].done));
    flyEl = document.createElement("canvas");
    flyEl.className = "cc-fly";
    flyEl.setAttribute("aria-hidden", "true");
    Play.mount(flyEl);
    flyG = flyEl.getContext("2d");
    sizeFly();
    if (V.reduced) { revealed = true; rev = 1; revT = 0.6; }
  }

  function showUi() {
    if (hintEl) { hintEl.style.visibility = "visible"; hintEl.style.opacity = "1"; }
    if (trayEl) { trayEl.style.visibility = "visible"; trayEl.style.opacity = "1"; }
  }

  function step(dt, V) {
    const s = sigOf(V);
    if (s !== sig) layout(V);

    if (hover) {
      if (hover.kind === "twin" && (!plats[hover.i] || !plats[hover.i].twin || hover.i === player.plat)) { hover = null; V.cursor && V.cursor(false); }
      else if (hover.kind === "sil" && (!sils[hover.i] || sils[hover.i].gone)) { hover = null; V.cursor && V.cursor(false); }
      else if (hover.kind === "door" && !doorReady()) { hover = null; V.cursor && V.cursor(false); }
      else if (hover.kind === "key" && (!keys[hover.i] || keys[hover.i].got || keys[hover.i].locked)) { hover = null; V.cursor && V.cursor(false); }
    }

    if (!clicked) idleT += dt;
    cool -= dt;
    if (winSeq && !door) finishWin();
    if (winSeq) {
      const W = winSeq;
      W.t += dt;
      if (W.ph === "fly") {
        for (const q of keys) if (q.fly) q.fly.t = Math.min(1, W.t);
        if (W.t >= 0.6) hideUi();
        if (W.t >= 1) { for (const q of keys) q.fly = null; flyDirty = true; enterArch(); W.ph = "dim"; W.t = 0; }
      } else if (W.t >= 0.6) endWin();
    }
    if (winEnd >= 0) {
      winEnd += dt;
      if (winEnd >= 3 && hintEl && hintEl.style.opacity !== "0") { hintEl.style.opacity = "0"; hintEl.style.visibility = "hidden"; }
    }
    if (door && doorReady() && !winSeq && player.plat === door.plat && !player.air) startWin();
    if (rainBoost > 0) rainBoost = Math.max(0, rainBoost - dt);
    const vt = V.sy + V.top, vb = V.sy + V.H;

    if (!revealed && V.sy + V.H * 0.5 > revealY) { revealed = true; revT = 0; showUi(); }
    if (revealed && rev < 1) { revT += dt; rev = Math.min(1, revT / 0.6); }

    if (player.air) {
      const oldY = player.y;
      player.air.vy += GRAV * dt;
      player.y += player.air.vy * dt;
      let landed = -1;
      for (let i = 0; i < plats.length; i++) {
        const p = plats[i];
        if (player.x >= p.x && player.x <= p.x + PLAT_W && oldY <= p.y + 2 && player.y >= p.y + 2) { landed = i; break; }
      }
      if (landed >= 0) {
        player.plat = landed;
        player.arrived = true;
        player.y = plats[landed].y + 2;
        player.air = null;
        plats[landed].twin = false;
        plats[landed].lit = Math.max(plats[landed].lit, 0.001);
        burst(player.x, player.y - 26);
      } else if (player.y > V.docH + 100) {
        teleportTo(nearestVisibleTwin());
      }
    }

    // camera follow: he stays inside the band where the eye rests (30-62 % of the viewport);
    // when the page scrolls him out of it he teleports to the platform nearest the band's centre
    if (revealed && player.plat >= 0 && cool <= 0 && !winSeq) {
      const span = vb - vt;
      const bt = vt + span * 0.30, bb = vt + span * 0.62, mid = vt + span * 0.46;
      const py = plats[player.plat].y;
      if (py < bt || py > bb) {
        let best = -1, bd = Infinity;
        for (let i = 0; i < plats.length; i++) {
          const p = plats[i];
          if (i === player.plat) continue;
          if (p.y >= bt && p.y <= bb) {
            const d = Math.abs(p.y - mid);
            if (d < bd) { bd = d; best = i; }
          }
        }
        if (best < 0 && !(py - MAN_H > vt - 30 && py < vb + 30)) {
          for (let i = 0; i < plats.length; i++) {
            const p = plats[i];
            if (i === player.plat) continue;
            if (p.y - MAN_H >= vt + 40 && p.y <= vb - 30) {
              const d = Math.abs(p.y - mid);
              if (d < bd) { bd = d; best = i; }
            }
          }
          if (best < 0) {
            for (let i = 0; i < plats.length; i++) {
              const p = plats[i];
              if (i === player.plat) continue;
              if (p.y - MAN_H >= vt + 10 && p.y <= vb - 10) {
                const d = Math.abs(p.y - mid);
                if (d < bd) { bd = d; best = i; }
              }
            }
          }
        }
        if (best >= 0) teleportTo(best);
      }
    }

    for (let i = 0; i < plats.length; i++) {
      const p = plats[i];
      if (player.plat === i) p.lit = Math.min(1, p.lit + dt * 5);
      else if (p.lit > 0) p.lit = Math.max(0, p.lit - dt / 12);
    }

    if (player.arrived) {
      player.arrived = false;
    }

    for (let i = 0; i < sils.length; i++) {
      const sl = sils[i];
      if (sl.gone) { sl.fade = Math.max(0, sl.fade - dt / 0.5); sl.back -= dt; if (sl.back <= 0 && player.plat !== sl.plat) { sl.gone = false; if (plats[sl.plat]) plats[sl.plat].twin = false; } }
      else if (sl.fade < 1) sl.fade = Math.min(1, sl.fade + dt / 0.6);
      if (sl.shake > 0) sl.shake = Math.max(0, sl.shake - dt);
    }

    for (let k = 0; k < keys.length; k++) {
      const key = keys[k];
      if (!key.locked && !key.got && key.lit < 1) key.lit = Math.min(1, key.lit + dt / 0.4);
      if (!key.locked) {
        const mode = MODES[key.mode];
        key.ang += mode.spin * dt;
        key.left -= dt;
        if (key.left <= 0) {
          key.mode = (key.mode + 1) % MODES.length;
          key.left = MODES[key.mode].dur;
        }
      }
      if (key.fly && !key.fly.toDoor) {
        key.fly.t = Math.min(1, key.fly.t + dt);
        if (key.fly.t >= 1) landKey(k);
      }
    }

    rainSm += (Math.min(1, rainBoost) - rainSm) * Math.min(1, dt * 6);
    for (let i = 0; i < rain.length; i++) {
      const r = rain[i];
      const sp = 1 + rainSm;
      r.x += r.vx * dt * sp; r.y += r.vy * dt * sp;
      if (r.x < -4 || r.y > V.H + 4) ray(r, rrnd, V, 0);
    }

    if (door) door.lit = doorOpen() ? Math.min(1, door.lit + dt / 0.6) : 0;

    let i = 0;
    while (i < bursts.length) {
      const b = bursts[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0) { bursts[i] = bursts[bursts.length - 1]; bursts.pop(); }
      else i++;
    }
  }

  // pointer moved: hover the same targets step() checks against V.pointer, for the cursor
  function move(x, y, V) {
    if (rev < 1 || winSeq || V.reduced) {
      if (hover) { hover = null; V.cursor && V.cursor(false); }
      return;
    }
    const px = x, py = y + V.sy;
    hover = null;
    // beacons first, as in press(); a twin on a key's platform hovers that key
    const bk = keyAt(px, py);
    if (bk >= 0) hover = { kind: "key", i: bk };
    const bp = hover ? -1 : playAt(px, py);
    if (bp >= 0) hover = { kind: "twin", i: bp };
    for (let i = 0; i < plats.length && !hover; i++) {
      const p = plats[i];
      if (p.twin && i !== player.plat && inBox(px, py, p.x + 16, p.y - 54, 32, 56)) {
        const kk = keyOnPlat(i);
        hover = kk >= 0 ? { kind: "key", i: kk } : { kind: "twin", i };
      }
    }
    for (let i = 0; i < sils.length && !hover; i++) {
      const sl = sils[i];
      if (!sl.gone && inBox(px, py, sl.x - 8, sl.y - 4, 32, 60)) hover = { kind: "sil", i };
    }
    if (!hover && doorAt(px, py) && player.plat !== door.plat) hover = { kind: "door" };
    V.cursor && V.cursor(!!hover);
  }

  function press(x, y, V) {
    if (winSeq || V.reduced) return false;
    if (rev < 1) return false;
    const px = x, py = y + V.sy;
    const bk = keyAt(px, py);
    if (bk >= 0) { takeKey(bk, x, y); return true; }
    const bp = playAt(px, py);
    if (bp >= 0) { teleportTo(bp); playBeat(x, y); return true; }
    for (let i = 0; i < plats.length; i++) {
      const p = plats[i];
      if (p.twin && i !== player.plat && inBox(px, py, p.x + 16, p.y - 54, 32, 56)) {
        const kk = keyOnPlat(i);
        if (kk >= 0) { takeKey(kk, x, y); return true; }
        teleportTo(i);
        playBeat(x, y);
        return true;
      }
    }
    for (let i = 0; i < sils.length; i++) {
      const s = sils[i];
      if (!s.gone && inBox(px, py, s.x - 8, s.y - 4, 32, 60)) {
        if (silGreen(V.t)) { s.gone = true; s.fade = 1; s.back = 4; warp(s.x + 8, s.y + 52); }
        else s.shake = 0.3;
        clicked = true;
        return true;
      }
    }
    if (doorAt(px, py)) {
      if (player.plat !== door.plat) { teleportTo(door.plat); clicked = true; }
      return true;
    }
    return false;
  }

  function hintSet(text) {
    if (!hintEl) return;
    hintEl.textContent = text;
  }

  // the twin the play beacon points at: the play platform's, else the nearest other twin
  function playTarget() {
    if (playPlat < 0 || !plats[playPlat]) return -1;
    const p = plats[playPlat];
    if (p.twin && playPlat !== player.plat) return playPlat;
    let best = -1, bd = Infinity;
    for (let j = 0; j < plats.length; j++) {
      if (!plats[j].twin || j === player.plat) continue;
      const dx = plats[j].x - p.x, dy = plats[j].y - p.y;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = j; }
    }
    return best;
  }

  // the first twin/shadow click: award play-conclusus, swap the hint, unlock key 1
  function playBeat(x, y) {
    clicked = true;
    if (playDone) return;
    playDone = true;
    P.award("play-conclusus", "Conclusus shadow", x, y);
    hintSet("click the key to take it");
    if (keys[0]) { keys[0].locked = false; keys[0].lit = 0; }
  }

  function atRest(V) {
    if (revealed && rev < 1) return false;
    if (bursts.length !== 0 || player.air || cool > 0 || winSeq || hover || V.pointer.down || rainBoost > 0) return false;
    if (!(clicked || idleT >= 6)) return false;
    if (door && doorOpen() && door.lit < 1) return false;
    if (flyDirty) return false;
    for (let k = 0; k < keys.length; k++) if (keys[k].fly || (!keys[k].locked && !keys[k].got && keys[k].lit < 1)) return false;
    for (let i = 0; i < sils.length; i++) if (sils[i].gone || sils[i].fade < 1) return false;
    return true;
  }

  function paintFly(V) {
    if (!flyG) return;
    let any = false;
    for (const q of keys) if (q.fly) { any = true; break; }
    if (!any && !flyDirty) return;
    flyG.setTransform(flyDpr, 0, 0, flyDpr, 0, 0);
    flyG.clearRect(0, 0, V.W, V.H);
    flyDirty = any;
    if (!any) return;
    flyG.imageSmoothingEnabled = false;
    // the flight arc stays inside the open folder's gold frame
    const fr = V.mainEl && V.mainEl.closest(".case-folder");
    flyG.save();
    if (fr) {
      const r = fr.getBoundingClientRect();
      flyG.beginPath();
      flyG.rect(r.left + fr.clientLeft, Math.max(r.top, 0), fr.clientWidth, Math.min(r.bottom, V.H) - Math.max(r.top, 0));
      flyG.clip();
    }
    for (const key of keys) {
      if (!key.fly) continue;
      const f = key.fly, e = easeIO(f.t);
      const sy = f.toDoor ? f.y0 : f.y0 - V.sy;
      const ty = f.toDoor ? f.ty - V.sy : f.ty;
      const x = U.mix(f.x0, f.tx, e), y = U.mix(sy, ty, e) - 90 * Math.sin(Math.PI * e);
      const s = f.toDoor ? U.mix(0.75, 0.5, e) : U.mix(1, 0.75, e);
      P.glow(flyG, x, y, 24 * s, PALE, 0.25);
      flyG.save();
      flyG.translate(x, y);
      flyG.rotate((f.ang0 + 720 * e) * Math.PI / 180);
      flyG.scale(s, s);
      flyG.drawImage(SPR.sym.cv, -16, -16);
      flyG.restore();
    }
    flyG.restore();
  }

  function draw(ctx, V) {
    paintFly(V);
    for (let i = 0; i < rain.length; i++) {
      const k = Math.round(rain[i].a * 8);
      ctx.fillStyle = rainCol[k] || (rainCol[k] = "rgba(" + RAIN + "," + (k / 8) + ")");
      ctx.fillRect(Math.round(rain[i].x), Math.round(rain[i].y), 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  function drawDoc(ctx, V) {
    const m = ctx.getTransform();
    tileY0 = -m.f / m.d; tileY1 = tileY0 + 1024;
    const has = hasXP();
    const a = 1;

    for (let i = 0; i < plats.length; i++) {
      const p = plats[i];
      if (offTile(p.y)) continue;
      P.blit(ctx, SPR.plats[p.spr], p.x, p.y);
    }

    {
    ctx.globalAlpha = a;
    if (door && !offTile(door.y)) {
      const L = door.lit;
      if (L > 0) {
        let g = 0.35 + 0.35 * Math.sin(V.t * 1.5);
        if (winEnd >= 0) g += (0.5 - g) * Math.min(1, winEnd / 2);
        if (winSeq && winSeq.ph === "dim") g += 0.8 * (1 - winSeq.t / 0.6);
        P.glow(ctx, door.x + 28, door.y + 40, 60 + 60 * g, PALE, (0.10 + 0.25 * g) * L * a);
      }
      if (L < 1) { ctx.globalAlpha = 0.55 * (1 - L) * a; P.blit(ctx, SPR.door, door.x, door.y); }
      if (L > 0) { ctx.globalAlpha = L * a; P.blit(ctx, SPR.doorLit, door.x - 2, door.y - 2); }
      ctx.globalAlpha = a;
      if (winSeq && winSeq.ph === "dim") {
        ctx.globalAlpha = Math.max(0, 1 - winSeq.t / 0.6) * a;
        for (let k = 0; k < 3; k++) { const s = doorSlot(k); ctx.drawImage(SPR.sym.cv, s.x, s.y, 16, 16); }
        ctx.globalAlpha = a;
      }
    }

    const sf = frame01(V.t, SWAP);
    for (let i = 0; i < plats.length; i++) {
      const p = plats[i];
      if (!p.twin || offTile(p.y)) continue;
      const spr = SPR.green[sf];
      const hovered = hover && hover.kind === "twin" && hover.i === i;
      P.glow(ctx, p.x + 24 + MAN_W / 2, p.y + 2, 22, GREEN, (hovered ? 0.22 : 0.10) * a);
      P.blit(ctx, spr, p.x + 24, p.y + 2 - spr.h, p.tf < 0);
    }

    for (let i = 0; i < sils.length; i++) {
      const s = sils[i];
      if (s.fade <= 0 || offTile(s.y)) continue;
      const green = silGreen(V.t);
      const spr = green ? SPR.green[sf] : SPR.silver[sf];
      P.glow(ctx, s.x + MAN_W / 2, s.y + MAN_H / 2, 22, green ? GREEN : "214,245,228", (green ? 0.12 : 0.08) * a);
      ctx.globalAlpha = s.fade * a;
      P.blit(ctx, spr, s.x + (s.shake ? Math.sin(V.t * 80) * 2 : 0), s.y);
      ctx.globalAlpha = a;
    }

    for (let i = 0; i < spikes.length; i++) {
      const sp = spikes[i];
      if (offTile(sp.y)) continue;
      const cx = sp.x + 17, cy = sp.y + 17 + Math.sin(V.t * 1.3 + sp.ph) * sp.amp;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(V.t * 90 * Math.PI / 180);
      P.blit(ctx, SPR.spike, -17, -17);
      ctx.restore();
    }

    for (let k = 0; k < keys.length; k++) {
      const key = keys[k];
      if (key.got || offTile(key.y)) continue;
      const cx = key.x + 16, cy = key.y + 16;
      if (key.lit < 1) {
        ctx.globalAlpha = 0.4 * (1 - key.lit) * a;
        P.blit(ctx, SPR.symGrey, key.x, key.y);
        ctx.globalAlpha = a;
      }
      if (key.lit > 0) {
        if (plats[key.plat]) {
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = "rgba(" + PALE + "," + (0.25 * key.lit).toFixed(2) + ")";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx, key.y + 32);
          ctx.lineTo(cx, plats[key.plat].y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        const hovered = hover && hover.kind === "key" && hover.i === k;
        P.glow(ctx, cx, cy, 40, PALE, (hovered ? 0.35 : 0.22) * key.lit * a);
        ctx.globalAlpha = key.lit * a;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(key.ang * Math.PI / 180);
        P.blit(ctx, SPR.sym, -16, -16);
        ctx.restore();
        ctx.globalAlpha = a;
        if (!key.locked) drawBeacon(ctx, "play-cc-key" + (k + 1), cx, cy - 34, V, has, a * key.lit, hover && hover.kind === "key" && hover.i === k);
      }
    }

    if (!playDone) {
      const t = playTarget();
      if (t >= 0 && !offTile(plats[t].y)) drawBeacon(ctx, "play-conclusus", plats[t].x + 32, plats[t].y - 72, V, has, a, hover && hover.kind === "twin" && hover.i === t);
    }
    ctx.globalAlpha = 1;
    }

    if (!clicked && idleT < 6 && player.plat >= 0 && plats[player.plat] && !offTile(player.y)) {
      const r = 18 + 4 * Math.sin(V.t * 3);
      ctx.strokeStyle = "rgba(" + GREEN + "," + (0.35 + 0.25 * Math.sin(V.t * 3)).toFixed(2) + ")";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(plats[player.plat].x + MAN_CX, player.y + 2, r, r * 0.35, 0, 0, U.TAU);
      ctx.stroke();
    }

    if ((player.plat >= 0 || player.air) && !offTile(player.y)) {
      const spr = player.air ? SPR.idle[0] : SPR.idle[frame01(V.t, 0.5)];
      ctx.globalAlpha = winSeq && winSeq.ph === "dim" ? Math.max(0, 1 - winSeq.t / 0.6) : 1;
      P.blit(ctx, spr, player.x - MAN_W / 2, player.y - spr.h, player.face < 0);
      ctx.globalAlpha = 1;
    }

    for (let i = 0; i < bursts.length; i++) {
      const b = bursts[i];
      if (offTile(b.y)) continue;
      const t = 1 - b.life / b.max;
      const k = Math.min(15, (t * 16) | 0);
      if (!burstCol[k]) {
        const bt = k / 16;
        const r = U.mix(175, 26, bt), g = U.mix(192, 26, bt), bl = U.mix(132, 18, bt);
        const a = bt > 0.7 ? 1 - (bt - 0.7) / 0.3 : 1;
        burstCol[k] = "rgba(" + (r | 0) + "," + (g | 0) + "," + (bl | 0) + "," + a + ")";
      }
      ctx.fillStyle = burstCol[k];
      ctx.fillRect(Math.round(b.x), Math.round(b.y), b.size, b.size);
    }
  }

  function report() {
    const beat = (k) => ({ x: k.x + 16, y: k.y - 18, locked: !!k.locked, done: !!k.done });
    return {
      player: { x: player.x, y: player.y },
      twins: plats.filter((p, i) => p.twin && i !== player.plat).map(p => ({ x: p.x + 32, y: p.y - 26 })),
      beats: {
        play: (() => { const t = playTarget(); return t >= 0 ? { x: plats[t].x + 32, y: plats[t].y - 26, locked: false, done: playDone } : null; })(),
        key1: keys[0] ? beat(keys[0]) : null,
        key2: keys[1] ? beat(keys[1]) : null,
        key3: keys[2] ? beat(keys[2]) : null,
        door: door ? { x: door.x + 28, y: door.y + 32, locked: !doorOpen(), done: won } : null,
      },
      door: { open: doorOpen(), won },
      win: winSeq ? winSeq.ph : null,
      sils: sils.map(s => ({ x: s.x, y: s.y, plat: s.plat })),
      tray: trayN,
      revealed, rev: +rev.toFixed(2),
      plats: plats.map(p => ({ x: p.x, y: p.y })),
    };
  }

  spec = { name: "conclusus", seed: 17, doc: true, docX0: undefined, setup, step, draw, drawDoc, atRest, press, move, resize: layout };
  P.register(spec);
  window.PlayConclusus = { report };
})();
