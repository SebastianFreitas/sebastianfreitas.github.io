/* forge.js — VoidScape crafting bench and run console, flat 2D panels parked
   beside the VoidScape planet in the Game Dev sector: a gun-modding bench to
   the left, a mission-search / floor-plan console to the right. Both are
   canvas drawings, hit-tested from bridge.js pointer events. Modelled on
   storm.js: one seeded mulberry for every random choice, flat fills, no
   outlines. Numbers ported from the HellEscape Unity scripts this alludes
   to. The weapon tables live in forge-guns.js; the mission rolls and the
   floor-plan generator live in forge-missions.js. */
window.Forge = (function () {
  const { clamp } = Util;
  const { rnd, rint, pick } = ForgeGuns;
  const { MAX_MODS, MAX_PATH_MODS, MAX_EMPOWER, rollMod, makeGun, randomGun, stats } = ForgeGuns;
  const { rollRunMod, regood, makeMission, genPlan } = ForgeMissions;

  const PANEL_W = 500, BENCH_H = 220;
  const CONS_W = 640;     // console panel width (bench keeps PANEL_W)
  const GAP = 200;        // px between planet centre and the bench's near edge
  const CONS_GAP = 160;   // px between planet centre and the console's near edge
  const MON_W = 150, MON_GAP = 8;    // console monitor width and gap between them
  const LINE_H = 13, MIN_SCREEN_LINES = 7;   // console monitor screen text metrics
  const TOP_Y = -140;     // panel top, px from planet centre
  const MIN_W = 900;      // below this hero width nothing is drawn or hit
  const FLASH = 0.3, ERR_FLASH = 0.4, ARM = 0.9;   // seconds
  const C = {
    green: "#82cc3c", greenInk: "#1e4a10", blue: "#4633cc", blueInk: "#b8f26a",
    red: "#d92b2b", redInk: "#c8ff5a", yellow: "#e6d43a", yellowInk: "#3d3608",
    screen: "#0a1a10", bad: "#ff6b5a", good: "#8bf27a", dim: 0.28,
  };
  const FONT = 'bold 12px "IBM Plex Mono", Consolas, monospace';
  const FONT_S = 'bold 11px "IBM Plex Mono", Consolas, monospace';

  let panelAlpha = 1; // set before each panel's draw calls, multiplies tile alpha

  function tile(g, x, y, w, h, fill, ink, text, align, alpha) {
    g.save();
    g.globalAlpha = panelAlpha * (alpha == null ? 0.9 : alpha);
    g.fillStyle = fill;
    g.fillRect(x, y, w, h);
    g.globalAlpha = panelAlpha;
    g.fillStyle = ink;
    g.textBaseline = "middle";
    const str = String(text).toUpperCase();
    if (align === "right") { g.textAlign = "right"; g.fillText(str, x + w - 7, y + h / 2); }
    else if (align === "center") { g.textAlign = "center"; g.fillText(str, x + w / 2, y + h / 2); }
    else { g.textAlign = "left"; g.fillText(str, x + 7, y + h / 2); }
    g.restore();
  }

  /* ---- shared state ---- */
  let last = null;
  let t = 0;

  /* ---- panel unlocks, gated by the depth nodes beside the planet ---- */
  const unlocked = { bench: false, console: false };
  const shown = { bench: 0, console: 0 };
  let checked = false;

  function unlock(which) { unlocked[which] = true; }

  /* ---- bench state ---- */
  let gun = makeGun("basic", 1, 5);
  let flash = { add: null, remove: null, destroy: null };
  let armUntil = 0;
  let gone = 0;
  let timesUsed = 1;

  const cost = () => (gun.level - 9) * (gun.mods.length + 1) * timesUsed;

  function benchOk(key) { flash[key] = { kind: "ok", text: null, until: t + FLASH }; }
  function benchErr(key, text) { flash[key] = { kind: "err", text, until: t + FLASH }; }

  function benchAdd() {
    if (gone > 0) return;
    if (gun.mods.length >= MAX_MODS) { benchErr("add", "FULL CAPACITY"); return; }
    const m = rollMod(gun, 10);
    if (!m) { benchErr("add", "FULL CAPACITY"); return; }
    gun.mods.push(m);
    timesUsed++;
    benchOk("add");
  }
  function benchRemove() {
    if (gone > 0) return;
    if (gun.mods.length === 0) { benchErr("remove", "NO MODIFIERS"); return; }
    gun.mods.splice(rint(0, gun.mods.length), 1);
    timesUsed++;
    benchOk("remove");
  }
  function benchDestroy() {
    if (gone > 0) return;
    if (armUntil <= t) { armUntil = t + ARM; return; }
    armUntil = 0;
    gone = 0.7;
    benchOk("destroy");
  }

  function benchRows() {
    const rows = [null, null, null, null, null, null];
    const bands = { 0: [0, 1], 1: [2, 3], 2: [4, 5] };
    for (const m of gun.mods) {
      const slots = bands[m.grade];
      let placed = false;
      for (const idx of slots) {
        if (!rows[idx]) { rows[idx] = m; placed = true; break; }
      }
      if (!placed) {
        const idx = rows.findIndex(r => !r);
        if (idx >= 0) rows[idx] = m;
      }
    }
    return rows;
  }

  function drawBench(g, env, ax, ay) {
    const bx = ax - GAP - PANEL_W, by = ay + TOP_Y;
    g.font = FONT;
    tile(g, bx, by, 190, 26, C.blue, C.blueInk, gone > 0 ? "ROLLING..." : gun.type, "left");
    g.font = FONT_S;
    const st = stats(gun);
    g.save();
    g.globalAlpha = panelAlpha * 0.9;
    g.fillStyle = C.green;
    g.fillRect(bx, by + 32, 190, 104);
    g.restore();
    g.save();
    g.globalAlpha = panelAlpha;
    g.fillStyle = C.greenInk;
    g.textBaseline = "alphabetic";
    for (let i = 0; i < 8; i++) {
      const yy = by + 32 + 13 + i * 12;
      g.textAlign = "left";
      g.fillText(st[i][0], bx + 7, yy);
      g.textAlign = "right";
      g.fillText(String(st[i][1]), bx + 190 - 7, yy);
    }
    g.restore();
    const labels = ["ADD NEW MODIFIER", "REMOVE MODIFIER", "DESTROY"];
    const keys = ["add", "remove", "destroy"];
    for (let k = 0; k < 3; k++) {
      const y = by + 140 + k * 28;
      let lf = C.green, li = C.greenInk, ltext = labels[k];
      const fl = flash[keys[k]];
      if (fl && fl.until > t) {
        if (fl.kind === "ok") { lf = C.yellow; li = C.yellowInk; }
        else { lf = C.red; li = C.redInk; ltext = fl.text; }
      }
      if (k === 2 && armUntil > t) { lf = C.yellow; li = C.yellowInk; ltext = "ARE YOU SURE?"; }
      tile(g, bx, y, 130, 24, lf, li, ltext, "left");
      if (k < 2) {
        const costText = gone > 0 ? "-" : String(cost());
        tile(g, bx + 134, y, 56, 24, C.red, C.redInk, costText, "left");
      }
    }
    const rows = benchRows();
    for (let i = 0; i < 6; i++) {
      const w = i < 2 ? 220 : i < 4 ? 260 : 300;
      const y = by + 32 + i * 26;
      const set = i < 2 ? [C.green, C.greenInk] : i < 4 ? [C.blue, C.blueInk] : [C.red, C.redInk];
      const mod = gone > 0 ? null : rows[i];
      g.font = FONT_S;
      if (mod) {
        g.save();
        g.beginPath(); g.rect(bx + 200, y, w, 22); g.clip();
        tile(g, bx + 200, y, w, 22, set[0], set[1], mod.text, "left");
        g.restore();
      } else {
        tile(g, bx + 200, y, w, 22, set[0], set[1], "-", "left", C.dim);
      }
    }
  }

  function cellColor(c) {
    if (c.type === "start") return C.green;
    if (c.type === "boss") return C.red;
    if (c.type === "corridor") return "#4a524a";
    if (c.type === "room") return c.kind === "boon" ? "#5cf0d8" : "#6f7a6f";
    if (c.type === "side") {
      if (c.kind === "special") return C.yellow;
      if (c.kind === "shop") return "#4fb3e0";
      if (c.kind === "item") return "#c98cff";
      if (c.kind === "choice") return "#f0a24a";
      if (c.kind === "exit") return "#e8e8e0";
      return "#55605a"; // encounter
    }
    return "#888";
  }

  function drawPlanArea(g, plan, x, y, w, h, runT, env) {
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    const cols = plan.maxX - plan.minX + 1, rows = plan.maxY - plan.minY + 1;
    const s = Math.min(w / (cols + 1), h / (rows + 1), 14);
    const totalW = cols * s, totalH = rows * s;
    const ox = x + (w - totalW) / 2 - plan.minX * s;
    const oy = y + (h - totalH) / 2 - plan.minY * s;
    for (let k = 0; k < plan.cells.length; k++) {
      const c = plan.cells[k];
      const visT = env.reduced ? 0.3 : 0.08 * k;
      if (runT < visT) continue;
      const cx = ox + c.x * s + s / 2, cy = oy + c.y * s + s / 2;
      if (c.type === "side") {
        const px = c.x - c.dir.x, py = c.y - c.dir.y;
        const x1 = ox + px * s + s / 2, y1 = oy + py * s + s / 2;
        g.fillStyle = "#4a524a";
        const barW = c.dir.x !== 0 ? Math.abs(cx - x1) + s * 0.25 : s * 0.25;
        const barH = c.dir.y !== 0 ? Math.abs(cy - y1) + s * 0.25 : s * 0.25;
        g.fillRect((cx + x1) / 2 - barW / 2, (cy + y1) / 2 - barH / 2, barW, barH);
      }
      const age = runT - visT;
      const scale = (!env.reduced && age < 0.15) ? 1.4 - 0.4 * (age / 0.15) : 1;
      g.save();
      g.translate(cx, cy);
      g.scale(scale, scale);
      g.fillStyle = cellColor(c);
      if (c.type === "corridor") {
        const horiz = c.dir.x !== 0;
        const bw = horiz ? s : s * 0.35, bh = horiz ? s * 0.35 : s;
        g.fillRect(-bw / 2, -bh / 2, bw, bh);
      } else if (c.type === "side") {
        g.fillRect(-s * 0.3, -s * 0.3, s * 0.6, s * 0.6);
      } else {
        g.fillRect(-s * 0.39, -s * 0.39, s * 0.78, s * 0.78);
      }
      g.restore();
    }
    g.restore();
  }

  /* ---- console state ---- */
  let mon = [{ st: "empty", m: null }, { st: "empty", m: null }, { st: "empty", m: null }];
  let selected = -1;
  let searching = false, searchT = 0, searchIdx = 0;
  let searchDone = false;
  let reloadN = 1;
  let cflash = { search: null, empower: null, reload: null, portal: null, head: null };
  let run = null;
  let consH = 0; // last computed console height, cached so hit()/over() (no ctx) can use it

  function consoleOk(key) { cflash[key] = { kind: "ok", text: null, until: t + FLASH }; }
  function consoleErr(key, text) { cflash[key] = { kind: "err", text, until: t + ERR_FLASH }; }

  function searchAction() {
    if (run || searching) return;
    if (searchDone) { consoleErr("search", "USED"); return; }
    mon = [{ st: "searching", m: null }, { st: "searching", m: null }, { st: "searching", m: null }];
    selected = -1;
    searching = true;
    searchT = 0;
    searchIdx = 0;
  }
  function empowerAction() {
    if (selected < 0) { consoleErr("empower", "SELECT A PATH"); return; }
    const mission = mon[selected].m;
    if (mission.mods.length >= MAX_EMPOWER) { consoleErr("empower", "MAX"); return; }
    const names = mission.mods.map(m => m.text);
    const m = rollRunMod(names);
    mission.mods.push(m);
    if (m.text === "Mission length") mission.len += m.val;
    mission.lines = null;
    regood(mission);
    consoleOk("empower");
  }
  function reloadAction() {
    if (!searchDone || searching || run) { consoleErr("reload", "SEARCH FIRST"); return; }
    reloadN++;
    mon = [0, 1, 2].map(() => ({ st: "found", m: makeMission() }));
    selected = -1;
    consoleOk("reload");
  }
  function portalAction() {
    if (selected < 0) {
      consoleErr("portal", "SELECT A PATH");
      for (const m of mon) m.errUntil = t + ERR_FLASH;
      return;
    }
    const mission = mon[selected].m;
    const plan = genPlan(mission);
    run = { t: 0, plan, done: false, holdUntil: 0 };
  }

  // greedy word-wrap: split on spaces, pack words while they fit maxW; a
  // single word longer than maxW stays on its own line
  function wrap(ctx, text, maxW) {
    const words = text.split(" ");
    const lines = [];
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (!line || ctx.measureText(test).width <= maxW) line = test;
      else { lines.push(line); line = w; }
    }
    if (line) lines.push(line);
    return lines;
  }

  // wrapped mod lines for a found mission, cached on the mission (m.lines is
  // set to null whenever its mods change, and rebuilt here when null)
  function missionLines(g, mission) {
    if (mission.lines) return mission.lines;
    const maxW = MON_W - 14;
    let lines = [];
    for (const m of mission.mods) lines = lines.concat(wrap(g, m.line.toUpperCase(), maxW));
    mission.lines = lines;
    return lines;
  }

  function drawMonitorScreen(g, mv, x, y) {
    g.textAlign = "left"; g.textBaseline = "alphabetic";
    if (mv.st === "empty") {
      g.save(); g.globalAlpha = panelAlpha * 0.45; g.fillStyle = C.good;
      g.fillText("STANDBY", x, y);
      g.restore();
    } else if (mv.st === "searching") {
      const dots = ".".repeat(1 + Math.floor(t * 4) % 3);
      g.fillStyle = C.good;
      g.fillText(("SEARCHING" + dots), x, y);
    } else if (mv.st === "failed") {
      g.fillStyle = C.bad;
      g.fillText("NO SIGNAL", x, y);
    } else if (mv.st === "found") {
      let line = 0;
      g.fillStyle = C.bad;
      for (const l of missionLines(g, mv.m)) { g.fillText(l, x, y + line * LINE_H); line++; }
      g.fillStyle = C.good;
      for (const gtext of mv.m.good) { g.fillText(gtext, x, y + line * LINE_H); line++; }
    }
  }

  function drawConsoleButton(g, x, y, w, label, fl) {
    let f = C.green, i = C.greenInk, txt = label;
    if (fl && fl.until > t) {
      if (fl.kind === "ok") { f = C.yellow; i = C.yellowInk; }
      else { f = C.red; i = C.redInk; txt = fl.text; }
    }
    tile(g, x, y, w, 26, f, i, txt, "left");
  }

  function drawConsole(g, env, ax, ay) {
    const qx = ax + CONS_GAP, qy = ay + TOP_Y;
    g.font = FONT_S;
    // screen height: tall enough for the biggest found monitor's wrapped
    // mod lines plus the four good lines, shared by all three monitors
    let maxLines = 0;
    for (const mv of mon) {
      if (mv.st === "found") maxLines = Math.max(maxLines, missionLines(g, mv.m).length + mv.m.good.length);
    }
    const screenH = Math.max(MIN_SCREEN_LINES, maxLines) * LINE_H + 8;
    consH = 48 + screenH + 6;

    g.font = FONT;
    let hf = C.green, hi = C.greenInk, htext = "MAIN OBJECTIVE SEARCHER";
    if (run) {
      const cells = run.plan.cells.length;
      const lastReveal = env.reduced ? 0.3 : 0.08 * cells;
      if (run.t > lastReveal) { htext = "LEVEL READY"; }
      else { hf = C.yellow; hi = C.yellowInk; htext = "GENERATING LEVEL"; }
    } else if (cflash.head && cflash.head.until > t) { hf = C.yellow; hi = C.yellowInk; htext = cflash.head.text; }
    tile(g, qx, qy, CONS_W, 26, hf, hi, htext, "left");
    g.font = FONT_S;
    const monsW = 3 * MON_W + 2 * MON_GAP;
    if (run) {
      drawPlanArea(g, run.plan, qx, qy + 32, monsW, 16 + screenH, run.t, env);
    } else {
      for (let m = 0; m < 3; m++) {
        const mx = qx + m * (MON_W + MON_GAP);
        let barF = C.blue, barI = C.blueInk;
        if (selected === m) { barF = C.green; barI = C.greenInk; }
        if (mon[m].errUntil && mon[m].errUntil > t) { barF = C.red; barI = C.redInk; }
        tile(g, mx, qy + 32, MON_W, 16, barF, barI, `PATH ${m + 1}`, "left");
        g.save();
        g.globalAlpha = panelAlpha * 0.9;
        g.fillStyle = C.screen;
        g.fillRect(mx, qy + 48, MON_W, screenH);
        g.restore();
        g.save();
        g.beginPath(); g.rect(mx, qy + 48, MON_W, screenH); g.clip();
        drawMonitorScreen(g, mon[m], mx + 7, qy + 48 + 14);
        g.restore();
      }
    }
    const x0 = 484; // 3 × MON_W + 2 × MON_GAP + 10, right of the monitor row
    for (let k = 0; k < 4; k++) {
      const y = qy + 32 + k * 32;
      if (k === 0) drawConsoleButton(g, qx + x0, y, 110, "SEARCH", cflash.search);
      else if (k === 1) {
        drawConsoleButton(g, qx + x0, y, 110, "EMPOWER", cflash.empower);
        tile(g, qx + x0 + 114, y, 42, 26, C.red, C.redInk, selected >= 0 ? String(mon[selected].m.mods.length * 4) : "-", "left");
      } else if (k === 2) {
        drawConsoleButton(g, qx + x0, y, 110, "RELOAD", cflash.reload);
        tile(g, qx + x0 + 114, y, 42, 26, C.red, C.redInk, String(5 * reloadN), "left");
      } else {
        drawConsoleButton(g, qx + x0, y, 110, "OPEN PORTAL", cflash.portal);
      }
    }
  }

  /* ---- public API ---- */
  function step(dt, env) {
    last = env;
    if (!(dt > 0)) return;
    t += dt;
    for (const k of ["bench", "console"]) {
      if (unlocked[k] && shown[k] < 1) {
        shown[k] = env.reduced ? 1 : clamp(shown[k] + dt / 0.6, 0, 1);
      }
    }
    for (const k of ["add", "remove", "destroy"]) if (flash[k] && flash[k].until <= t) flash[k] = null;
    for (const k of ["search", "empower", "reload", "portal", "head"]) if (cflash[k] && cflash[k].until <= t) cflash[k] = null;
    for (const m of mon) if (m.errUntil && m.errUntil <= t) m.errUntil = 0;
    if (gone > 0) {
      gone -= dt;
      if (gone <= 0) { gone = 0; gun = randomGun(); timesUsed = 1; }
    }
    if (searching) {
      searchT += dt;
      while (searchIdx < 3 && searchT > (searchIdx + 1) * 0.6) {
        mon[searchIdx] = rnd() < 0.5 ? { st: "found", m: makeMission() } : { st: "failed", m: null };
        searchIdx++;
      }
      if (searchIdx >= 3) {
        if (!mon.some(m => m.st === "found")) mon[0] = { st: "found", m: makeMission() };
        searching = false;
        searchDone = true;
      }
    }
    if (run) {
      run.t += dt;
      const cells = run.plan.cells.length;
      const lastReveal = env.reduced ? 0.3 : 0.08 * cells;
      if (!run.done && run.t > lastReveal + 1.2) {
        run.done = true;
        run.holdUntil = t + 1.6;
      }
      if (run.done && t > run.holdUntil) {
        run = null;
        mon = [{ st: "empty", m: null }, { st: "empty", m: null }, { st: "empty", m: null }];
        selected = -1;
        searchDone = false;
        reloadN = 1;
      }
    }
  }

  function draw(ctx, env) {
    last = env;
    if (!checked) {
      checked = true;
      if (window.XP && XP.has("beacon-bnote-vs-bench")) { unlocked.bench = true; shown.bench = 1; }
      if (window.XP && XP.has("beacon-bnote-vs-map")) { unlocked.console = true; shown.console = 1; }
    }
    if (env.W < MIN_W) return;
    if (env.ax < -900 || env.ax > env.W + 900) return;
    ctx.save();
    if (shown.bench > 0) {
      ctx.save();
      panelAlpha = shown.bench;
      drawBench(ctx, env, env.ax, env.ay);
      ctx.restore();
    }
    if (shown.console > 0) {
      ctx.save();
      panelAlpha = shown.console;
      drawConsole(ctx, env, env.ax, env.ay);
      ctx.restore();
    }
    panelAlpha = 1;
    ctx.restore();
  }

  function hit(x, y) {
    if (!last || last.W < MIN_W) return false;
    const ax = last.ax, ay = last.ay;
    const bx = ax - GAP - PANEL_W, by = ay + TOP_Y;
    const qx = ax + CONS_GAP, qy = ay + TOP_Y;
    const inBench = shown.bench >= 1 && x >= bx && x <= bx + PANEL_W && y >= by && y <= by + BENCH_H;
    const inConsole = shown.console >= 1 && x >= qx && x <= qx + CONS_W && y >= qy && y <= qy + consH;
    if (!inBench && !inConsole) return false;
    if (inBench) {
      for (let k = 0; k < 3; k++) {
        const yy = by + 140 + k * 28;
        if (x >= bx && x <= bx + 190 && y >= yy && y <= yy + 24) {
          if (k === 0) benchAdd(); else if (k === 1) benchRemove(); else benchDestroy();
          return true;
        }
      }
      return true;
    }
    const x0 = 484;
    for (let k = 0; k < 4; k++) {
      const yy = qy + 32 + k * 32;
      if (y >= yy && y <= yy + 26 && x >= qx + x0 && x <= qx + x0 + 110) {
        if (k === 0) searchAction(); else if (k === 1) empowerAction(); else if (k === 2) reloadAction(); else portalAction();
        return true;
      }
    }
    if (!run && y >= qy + 32 && y <= qy + consH - 6) {
      const m = Math.floor((x - qx) / (MON_W + MON_GAP));
      if (m >= 0 && m <= 2 && mon[m].st === "found") selected = m;
      return true;
    }
    return true;
  }

  function over(x, y) {
    if (!last || last.W < MIN_W) return false;
    const ax = last.ax, ay = last.ay;
    const bx = ax - GAP - PANEL_W, by = ay + TOP_Y;
    const qx = ax + CONS_GAP, qy = ay + TOP_Y;
    if (shown.bench >= 1) {
      for (let k = 0; k < 3; k++) {
        const yy = by + 140 + k * 28;
        if (x >= bx && x <= bx + 190 && y >= yy && y <= yy + 24) return true;
      }
    }
    if (shown.console >= 1) {
      const x0 = 484;
      for (let k = 0; k < 4; k++) {
        const yy = qy + 32 + k * 32;
        if (y >= yy && y <= yy + 26 && x >= qx + x0 && x <= qx + x0 + 110) return true;
      }
      if (!run && y >= qy + 32 && y <= qy + consH - 6) {
        const m = Math.floor((x - qx) / (MON_W + MON_GAP));
        if (m >= 0 && m <= 2 && mon[m] && mon[m].st === "found") return true;
      }
    }
    return false;
  }

  function lively() {
    if (armUntil > t || gone > 0 || searching || run) return true;
    for (const k of ["add", "remove", "destroy"]) if (flash[k] && flash[k].until > t) return true;
    for (const k of ["search", "empower", "reload", "portal", "head"]) if (cflash[k] && cflash[k].until > t) return true;
    for (const k of ["bench", "console"]) if (shown[k] > 0 && shown[k] < 1) return true;
    return false;
  }

  function report() {
    return {
      gun: { type: gun.type, mods: gun.mods.map(m => m.text) },
      timesUsed,
      monitors: mon.map(m => m.st),
      selected,
      run: !!run,
      unlocked: { bench: unlocked.bench, console: unlocked.console },
      lively: lively(),
    };
  }

  return { step, draw, hit, over, lively, report, unlock };
})();
