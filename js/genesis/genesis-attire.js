/* genesis-attire.js — the attire kit (eldritch plan phase 7): flat garment
   painters for the old ones (hats, coats, trousers, boots, gloves, scarves,
   cane, monocle, watch chain), each parameterised by size, squash and fit
   (tailored vs found), lit from the left, cached to offscreen canvases.
   Nothing in the cutscene wears them yet. sheet() draws a review sheet. */
window.GenAttire = (() => {
  const { hash1 } = window.Util;
  const { poly, rect, litShade } = window.Paint;
  const P = window.GenEldPal;

  // safety net only: a missing GenEldPal token shows as flat grey, never throws
  const FALL = { lit: "#555a5e", mid: "#3c3f42", shade: "#26292b" };
  function T(name) { return (name && P && P.tone(name)) || FALL; }

  function ell(cx, cy, rx, ry, a0, a1, n) {
    n = n || 12;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * (i / n);
      pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
    }
    return pts;
  }

  function bbox(pts) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of pts) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    return [x0, y0, x1, y1];
  }

  function fill3(g, pts, t) {
    const [x0, y0, x1, y1] = bbox(pts);
    const w = x1 - x0, h = y1 - y0;
    if (h < 10 || w < 6) {
      poly(g, pts); g.fillStyle = t.lit; g.fill();
      return;
    }
    if (h < 22) {
      litShade(g, () => poly(g, pts), x0 + 0.4 * w, t.lit, t.shade);
      return;
    }
    litShade(g, () => poly(g, pts), x0 + 0.35 * w, t.lit, t.mid);
    g.save();
    poly(g, pts); g.clip();
    rect(g, x0 + 0.65 * w, y0 - 2, x1 + 2, y1 + 2, t.shade);
    g.restore();
  }

  function flat(g, pts, color) {
    poly(g, pts); g.fillStyle = color; g.fill();
  }

  function cut(g, pts) {
    g.save();
    g.globalCompositeOperation = "destination-out";
    poly(g, pts); g.fillStyle = "#000"; g.fill();
    g.restore();
  }

  function nicks(g, S, x, y0, y1, n) {
    for (let i = 0; i < n; i++) {
      const y = y0 + (i + 0.5) * (y1 - y0) / n;
      cut(g, S([[x, y - 0.04], [x - 0.05, y], [x, y + 0.04]]));
    }
  }

  function snowCap(g, S, x0, x1, y, th) {
    const cap = [
      [x0, y + 0.01], [x1, y + 0.01],
      [x1 - 0.02, y - th * 0.6],
      [x1 - 0.25 * (x1 - x0), y - th],
      [x1 - 0.5 * (x1 - x0), y - th * 0.55],
      [x1 - 0.75 * (x1 - x0), y - th],
      [x0 + 0.02, y - th * 0.6]
    ];
    fill3(g, S(cap), T("snow"));
  }

  const weather = { w: 0, g: 0, t: 0, frost: 0 };
  const FLEX = { hat: 0, coat: 0.16, scarf: 0.34, trousers: 0.04 };
  const FLUT = { coat: [0.9, 0.04], scarf: [1.6, 0.08] };
  const FLEX_KIND = { "scarf:ruff": 0.05 };

  function blit(ctx, img, sw, sh, x, y, ax, ay, piece, kindName, seed) {
    const w = weather.w || 0;
    const kf = FLEX_KIND[piece + ":" + kindName];
    let kx = w * (kf != null ? kf : (FLEX[piece] || 0));
    if (FLUT[piece]) {
      kx += FLUT[piece][1] * Math.abs(w) * Math.sin(2 * Math.PI * FLUT[piece][0] * weather.t + (seed || 1) * 1.7);
    }
    const r = piece === "hat" ? w * 0.07 : 0;
    if (kx === 0 && r === 0) {
      if (sw !== undefined) ctx.drawImage(img, 0, 0, sw, sh, x - ax, y - ay, sw, sh);
      else ctx.drawImage(img, x - ax, y - ay);
      return;
    }
    ctx.save();
    ctx.translate(x, y);
    if (r) ctx.rotate(r);
    if (kx) ctx.transform(1, 0, kx, 1, 0, 0);
    if (sw !== undefined) ctx.drawImage(img, 0, 0, sw, sh, -ax, -ay, sw, sh);
    else ctx.drawImage(img, -ax, -ay);
    ctx.restore();
  }

  const KINDS = {}; // "piece:kind" -> { piece, kind, box, tone, perch, paint }
  const DEF = {};   // piece -> first registered kind
  function reg(piece, kind, spec) {
    KINDS[piece + ":" + kind] = Object.assign({ piece, kind }, spec);
    if (!DEF[piece]) DEF[piece] = kind;
  }

  let scratch = null;
  function getScratch(cw, chh) {
    if (!scratch) scratch = document.createElement("canvas");
    if (scratch.width < cw) scratch.width = cw;
    if (scratch.height < chh) scratch.height = chh;
    const g = scratch.getContext("2d");
    g.clearRect(0, 0, scratch.width, scratch.height);
    return { cv: scratch, g };
  }

  const cache = new Map();

  function draw(ctx, piece, x, y, s, opt) {
    const o = opt || {};
    const k = KINDS[piece + ":" + (o.kind || DEF[piece])];
    if (!k || !(s >= 1)) return;

    const found = o.fit === "found";
    const j1 = hash1((o.seed || 1) * 97 + 13);
    const j2 = hash1((o.seed || 1) * 131 + 7);
    const rot = typeof o.rot === "number" ? o.rot : (found && k.perch ? (j1 - 0.5) * 0.36 : 0);
    const lift = typeof o.lift === "number" ? o.lift : (found && k.perch ? 0.06 + 0.1 * j2 : 0);

    const sq = o.sq || 1;
    const dir = o.dir === -1 ? -1 : 1;
    let bx0, bx1;
    if (dir === -1) { bx0 = -k.box[2] * sq * s; bx1 = -k.box[0] * sq * s; }
    else { bx0 = k.box[0] * sq * s; bx1 = k.box[2] * sq * s; }
    const by0 = k.box[1] * s, by1 = k.box[3] * s;
    const pad = 3 + ((rot || lift) ? 0.3 * Math.max(bx1 - bx0, by1 - by0) + lift * s : 0);
    const cw = Math.ceil(bx1 - bx0 + 2 * pad);
    const chh = Math.ceil(by1 - by0 + 2 * pad);
    const ax = -bx0 + pad, ay = -by0 + pad;

    const S = (pts) => pts.map(([u, v]) => {
      let px = u * sq * dir * s, py = (v - lift) * s;
      if (rot) {
        const c = Math.cos(rot), n = Math.sin(rot);
        const qx = px * c - py * n; py = px * n + py * c; px = qx;
      }
      return [ax + px, ay + py];
    });

    const snow = o.snow !== undefined ? o.snow : weather.frost >= 0.5;
    const kindName = o.kind || DEF[piece];

    if (o.cache === false) {
      const o2 = Object.assign({}, o, { found, j1, j2, j3: hash1((o.seed || 1) * 211 + 3), snow });
      const { cv, g } = getScratch(cw, chh);
      k.paint(g, S, o2, T(o.tone || k.tone));
      if (weather.w === 0) {
        ctx.drawImage(cv, 0, 0, cw, chh, x - ax, y - ay, cw, chh);
      } else {
        blit(ctx, cv, cw, chh, x, y, ax, ay, piece, kindName, o.seed);
      }
      return;
    }

    let ak = o._ak;
    if (!ak) { ak = JSON.stringify(o); try { o._ak = ak; } catch (e) {} }
    const key = piece + "|" + (o.kind || DEF[piece]) + "|" + Math.round(s * 2) + "|" + ak + "|" + (snow ? 1 : 0);
    const hit = cache.get(key);
    if (hit) {
      if (weather.w === 0) ctx.drawImage(hit.cv, x - hit.ax, y - hit.ay);
      else blit(ctx, hit.cv, undefined, undefined, x, y, hit.ax, hit.ay, piece, kindName, o.seed);
      return;
    }

    const o2 = Object.assign({}, o, { found, j1, j2, j3: hash1((o.seed || 1) * 211 + 3), snow });
    const cv = document.createElement("canvas");
    cv.width = cw; cv.height = chh;
    const g = cv.getContext("2d");
    k.paint(g, S, o2, T(o.tone || k.tone));
    if (cache.size > 96) cache.clear();
    cache.set(key, { cv, ax, ay });
    if (weather.w === 0) ctx.drawImage(cv, x - ax, y - ay);
    else blit(ctx, cv, undefined, undefined, x, y, ax, ay, piece, kindName, o.seed);
  }

  function clear() { cache.clear(); }

  function sheet(ctx, w, h, piece) {
    rect(ctx, 0, 0, w, h, (P && P.BG) || "#0d1114");
    const list = Object.values(KINDS).filter((v) => !piece || v.piece === piece);
    const cols = list.length > 12 ? 3 : list.length > 5 ? 2 : 1;
    const rows = Math.ceil(list.length / cols);
    const cellW = w / cols, cellH = h / rows;

    list.forEach((v, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const cx0 = col * cellW, cy0 = row * cellH;
      ctx.font = "11px monospace";
      ctx.fillStyle = "#6d7378";
      ctx.fillText(v.piece + " · " + v.kind, cx0 + 8, cy0 + 14);

      const uh = v.box[3] - v.box[1];
      const uw = v.box[2] - v.box[0];
      const fits = ["tailored", "found"];
      const fracs = [0.3, 0.6, 1.0];
      fits.forEach((fit, fitIndex) => {
        fracs.forEach((fr, sizeIndex) => {
          const s = Math.max(1, Math.min(
            fr * (cellH - 22) / uh,
            fr * (cellW / 6 - 8) / uw
          ));
          const q = fitIndex * 3 + sizeIndex;
          const slotCx = cx0 + (q + 0.5) * cellW / 6;
          const ax = slotCx - s * (v.box[0] + v.box[2]) / 2;
          const ay = cy0 + 20 - v.box[1] * s + ((cellH - 22) - uh * s) / 2;
          draw(ctx, v.piece, ax, ay, s, {
            kind: v.kind,
            fit,
            seed: i + 1,
            snow: fit === "tailored" && v.perch,
            cache: false
          });
        });
      });
    });
  }

  // ---- hats ----

  reg("hat", "topper", {
    tone: "coal", perch: true, box: [-0.85, -2.3, 0.85, 0.15],
    paint(g, S, o, t) {
      const tall = o.tall || 1.6;
      const crown = [
        [-0.45, 0],
        [-0.48, -tall * 0.25], [-0.5 + 0.03, -tall * 0.5], [-0.48, -tall * 0.75], [-0.45, -tall],
        [0.45, -tall],
        [0.48, -tall * 0.75], [0.5 - 0.03, -tall * 0.5], [0.48, -tall * 0.25], [0.45, 0]
      ];
      fill3(g, S(crown), t);

      const band = [
        [-0.48, -tall * 0.25], [-0.5 + 0.03, -tall * 0.5],
        [0.5 - 0.03, -tall * 0.5], [0.48, -tall * 0.25]
      ];
      // stretch band to span y -0.22..-0.04
      const bandPts = [
        [-0.47, -0.04], [-0.48, -0.13], [-0.47, -0.22],
        [0.47, -0.22], [0.48, -0.13], [0.47, -0.04]
      ];
      fill3(g, S(bandPts), { lit: t.mid, mid: t.shade, shade: t.shade });

      const brim = [
        [-0.75, -0.1], [-0.6, -0.065], [0, -0.03], [0.6, -0.065], [0.75, -0.1],
        [0.75, -0.04], [0, 0.07], [-0.75, -0.04]
      ];
      fill3(g, S(brim), t);

      if (o.snow) snowCap(g, S, -0.5, 0.5, -tall, 0.1);
      if (!o.found) nicks(g, S, 0.47, -tall * 0.8, -tall * 0.3, 2);
    }
  });

  reg("hat", "stovepipe", {
    tone: "mourning", perch: true, box: [-0.8, -2.9, 0.8, 0.15],
    paint(g, S, o, t) {
      const tall = o.tall || 2.2;
      const bulge = o.bulge != null ? o.bulge : 0.12;
      const left = [], right = [];
      for (let i = 0; i <= 8; i++) {
        const f = i / 8;
        const hw = 0.4 + bulge * Math.sin(Math.PI * f);
        const y = -tall * f;
        left.push([-hw, y]);
        right.push([hw, y]);
      }
      let crown = [[-0.4, 0]].concat(left.slice(1));
      if (o.found) {
        // dent the top: dip 0.08 at 60% across, three points across the top edge
        const topPts = [
          [left[left.length - 1][0], left[left.length - 1][1]],
          [left[left.length - 1][0] + 0.6 * (right[right.length - 1][0] - left[left.length - 1][0]), -tall + 0.08],
          [right[right.length - 1][0], right[right.length - 1][1]]
        ];
        crown = crown.concat(topPts.slice(1, -1));
      }
      crown = crown.concat(right.slice().reverse()).concat([[0.4, 0]]);
      fill3(g, S(crown), t);

      const brim = [
        [-0.55, -0.04], [-0.3, 0.02], [0, 0.05], [0.3, 0.02], [0.55, -0.04],
        [0.55, 0.02], [0, 0.15], [-0.55, 0.02]
      ];
      fill3(g, S(brim), t);

      if (o.snow && !o.found) snowCap(g, S, -0.4, 0.4, -tall, 0.1);
    }
  });

  reg("hat", "bowler", {
    tone: "coal", perch: true, box: [-0.8, -1.0, 0.8, 0.15],
    paint(g, S, o, t) {
      const tall = o.tall != null ? o.tall : 1;
      const dome = ell(0, -0.05, 0.47, 0.72 * tall, Math.PI, 2 * Math.PI, 16);
      dome.push([0.47, -0.05], [-0.47, -0.05]);
      fill3(g, S(dome), t);

      const ry = 0.72 * tall;
      const hwAt = (yy) => {
        const dy = (yy - -0.05) / ry;
        const clamped = Math.max(-1, Math.min(1, dy));
        return 0.47 * Math.sqrt(Math.max(0, 1 - clamped * clamped));
      };
      const yTop = -0.18, yBot = -0.05;
      const hwTop = hwAt(yTop), hwBot = 0.47;
      const bandPts = [
        [-hwBot, yBot], [-hwTop, yTop], [hwTop, yTop], [hwBot, yBot]
      ];
      fill3(g, S(bandPts), { lit: t.mid, mid: t.shade, shade: t.shade });

      const brim = [
        [-0.68, -0.02], [-0.3, -0.05], [0, -0.08], [0.3, -0.05], [0.68, -0.02],
        [0.68, 0.04], [0, 0.02], [-0.68, 0.04]
      ];
      fill3(g, S(brim), t);

      if (o.snow) snowCap(g, S, -0.25, 0.25, -0.05 - ry + 0.03, 0.08);
    }
  });

  reg("hat", "gibus", {
    tone: "coal", perch: true, box: [-0.8, -1.9, 0.8, 0.2],
    paint(g, S, o, t) {
      const open = o.open != null ? o.open : 0.5;
      const H = 0.25 + 1.3 * open;
      let topShift = 0;
      for (let i = 0; i < 4; i++) {
        const y0 = -i * H / 4, y1 = -(i + 1) * H / 4;
        let shift = i % 2 ? 0.035 : -0.035;
        if (o.found && i === 2) shift += 0.06;
        if (o.found && i === 3) shift += 0.12;
        const pleat = [
          [-0.44 + shift, y0], [0.44 + shift, y0],
          [0.40 + shift, y1], [-0.40 + shift, y1]
        ];
        const tone = (i === 1 || i === 3) ? { lit: t.mid, mid: t.shade, shade: t.shade } : t;
        fill3(g, S(pleat), tone);
        if (i === 3) topShift = shift;
      }
      const brim = [[-0.7, 0], [0.7, 0], [0.7, 0.1], [-0.7, 0.1]];
      fill3(g, S(brim), t);

      if (o.snow) snowCap(g, S, -0.40 + topShift, 0.40 + topShift, -H, 0.08);
    }
  });

  reg("hat", "deerstalker", {
    tone: "tweed", perch: true, box: [-1.0, -0.8, 1.0, 1.1],
    paint(g, S, o, t) {
      const flap = o.flap != null ? o.flap : 0.8;
      const earFlap = (cx, len, xShiftBottom) => {
        const bx = cx + (xShiftBottom || 0);
        return [[cx - 0.12, -0.05], [cx + 0.12, -0.05]]
          .concat(ell(bx, len - 0.12, 0.12, 0.12, 0, Math.PI, 8));
      };
      fill3(g, S(earFlap(-0.42, o.found ? flap + 0.25 : flap, o.found ? -0.2 : 0)), t);
      fill3(g, S(earFlap(0.42, flap, 0)), t);

      const dome = ell(0, 0, 0.5, 0.55, Math.PI, 2 * Math.PI, 14);
      fill3(g, S(dome), t);

      const frontPeak = [[0.5, -0.045], [0.9, 0.08], [0.5, 0.045]];
      const backPeak = [[-0.5, -0.045], [-0.85, 0.1], [-0.5, 0.045]];
      fill3(g, S(frontPeak), t);
      fill3(g, S(backPeak), t);

      const button = ell(0, -0.55, 0.08, 0.08, 0, 2 * Math.PI, 10);
      flat(g, S(button), t.shade);

      if (o.snow) snowCap(g, S, -0.3, 0.3, -0.45, 0.08);
    }
  });

  reg("hat", "bonnet", {
    tone: "camel", perch: true, box: [-0.8, -1.5, 1.8, 1.3],
    paint(g, S, o, t) {
      const reach = o.reach != null ? o.reach : 1;
      const crown = ell(-0.15, -0.35, 0.45, 0.4, 0, 2 * Math.PI, 16);
      fill3(g, S(crown), t);

      let brimPts = [
        [-0.2, -0.75], [0.4 * reach, -1.05], [0.95 * reach, -1.15],
        [1.15 * reach, -0.5], [1.05 * reach, 0.15], [0.05, 0.1]
      ];
      if (o.found) {
        const c = Math.cos(0.1), sn = Math.sin(0.1);
        brimPts = brimPts.map(([x, y]) => [x * c - y * sn, x * sn + y * c]);
      }
      fill3(g, S(brimPts), t);

      const crescent = [
        [0.95 * reach - 0.12, -1.15], [1.15 * reach - 0.12, -0.5], [1.05 * reach - 0.12, 0.15],
        [1.05 * reach - 0.32, 0.15], [1.15 * reach - 0.32, -0.5], [0.95 * reach - 0.32, -1.15]
      ];
      flat(g, S(crescent), t.shade);

      const rt = T(o.ribbon || "oxblood");
      const ribbon = (cx, botY, shortenBy) => {
        const b = botY - (shortenBy || 0);
        const pts = [[cx - 0.06, 0.05], [cx + 0.06, 0.05], [cx + 0.06, b], [cx - 0.06, b]];
        fill3(g, S(pts), rt);
        cut(g, S([[cx - 0.06, b], [cx, b - 0.1], [cx + 0.06, b]]));
      };
      ribbon(0.06, 1.2, 0);
      ribbon(0.16, 1.05, o.found ? 0.3 : 0);
    }
  });

  reg("hat", "veiled", {
    tone: "mourning", perch: true, box: [-0.8, -2.0, 0.8, 1.4],
    paint(g, S, o, t) {
      const plume = o.plume != null ? o.plume : 1.5;
      const base = [-0.3, -0.35], tip = [0.15, -0.4 - plume];
      const dx = tip[0] - base[0], dy = tip[1] - base[1];
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const px = -dy / len, py = dx / len;
      const pt = T(o.plumeTone || "plum");
      const left = [], right = [];
      for (let i = 0; i < 10; i++) {
        const f = i / 9;
        const cx = base[0] + dx * f, cy = base[1] + dy * f;
        const half = 0.11 * Math.sin(Math.PI * f);
        const bend = 0.12 * Math.sin(2 * Math.PI * f);
        left.push([cx + px * (half + bend), cy + py * (half + bend)]);
        right.push([cx + px * (-half + bend), cy + py * (-half + bend)]);
      }
      const plumePts = left.concat(right.slice().reverse());
      flat(g, S(plumePts), pt.lit);

      const crown = [[-0.42, 0], [0.42, 0], [0.36, -0.4], [-0.36, -0.4]];
      fill3(g, S(crown), t);

      const brim = [[-0.6, 0], [0.6, 0], [0.6, 0.08], [-0.6, 0.08]];
      fill3(g, S(brim), t);

      const veil = o.veil != null ? o.veil : 1.2;
      const extra = o.found ? 0.2 : 0;
      let veilPts = [
        [-0.6, 0.02], [0.6, 0.02], [0.7, veil + extra], [-0.7, veil]
      ];
      if (o.found) veilPts = veilPts.map(([x, y]) => [x + 0.25, y]);
      fill3(g, S(veilPts), t);

      const topY = 0.02, botY = veil + extra;
      const topHW = 0.6, botHW = 0.7;
      const shiftX = o.found ? 0.25 : 0;
      for (let row = 0; ; row++) {
        const y = topY + 0.06 + row * 0.15;
        if (y > botY - 0.06) break;
        const f = (y - topY) / (botY - topY);
        const hw = topHW + (botHW - topHW) * f - 0.06;
        const offset = row % 2 ? 0.075 : 0;
        for (let x = -hw + offset + shiftX; x <= hw + shiftX; x += 0.15) {
          cut(g, S([[x, y - 0.035], [x + 0.035, y], [x, y + 0.035], [x - 0.035, y]]));
        }
      }

      if (o.snow) snowCap(g, S, -0.36, 0.36, -0.4, 0.08);
    }
  });

  // ---- coats ----

  function scallop(x0, y0, x1, y1, n, d) {
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / len, uy = dy / len;
    const nx = uy, ny = -ux;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const t0 = i / n, tm = (i + 0.5) / n, t1 = (i + 1) / n;
      pts.push([x0 + dx * t0, y0 + dy * t0]);
      pts.push([x0 + dx * tm + nx * d, y0 + dy * tm + ny * d]);
      pts.push([x0 + dx * t1, y0 + dy * t1]);
    }
    return pts;
  }

  reg("coat", "chesterfield", {
    tone: "coal", box: [-0.8, -0.35, 0.8, 1.9],
    paint(g, S, o, t) {
      const len = o.len != null ? o.len : 1.6;
      const shR = o.found ? [0.5, 0.12] : [0.5, 0];
      let hemL = [-0.6, len], hemR = [0.6, len];
      if (o.found) {
        const c = Math.cos(0.06), s = Math.sin(0.06);
        hemL = [hemL[0] * c - hemL[1] * s, hemL[0] * s + hemL[1] * c];
        hemR = [hemR[0] * c - hemR[1] * s, hemR[0] * s + hemR[1] * c];
        const uneven = 0.1 * (o.j1 - 0.5);
        hemL[1] -= uneven; hemR[1] += uneven;
      }
      const body = [[-0.5, 0], [-0.52, 0.12], hemL, hemR, [0.52, 0.12], shR];
      fill3(g, S(body), t);

      cut(g, S([[-0.04, 0.05], [0.04, 0.05], [0, 0.55]]));

      const collar = [[-0.52, 0.1], [-0.3, -0.22]]
        .concat(scallop(-0.3, -0.22, 0.3, -0.22, 5, 0.04))
        .concat([[0.52, 0.1]]);
      fill3(g, S(collar), T(o.fur || "astrakhan"));

      const brass = T("brass").mid;
      [0.65, 0.85, 1.05].forEach((by) => {
        flat(g, S(ell(0.06, by, 0.035, 0.035, 0, Math.PI * 2, 10)), brass);
      });

      if (!o.found) nicks(g, S, 0.58, 0.5, 1.4, 2);
      if (o.snow) snowCap(g, S, -0.3, 0.3, -0.22, 0.07);
    }
  });

  reg("coat", "frock", {
    tone: "tweed", box: [-0.8, -0.2, 0.8, 1.7],
    paint(g, S, o, t) {
      const len = o.len != null ? o.len : 1.4;
      const body = [[-0.48, 0], [-0.4, 0.55], [-0.62, len], [0.62, len], [0.4, 0.55], [0.48, 0]];
      fill3(g, S(body), t);

      [-0.12, 0.12].forEach((x) => {
        cut(g, S([[x - 0.05, 0.03], [x + 0.05, 0.03], [x, 0.13]]));
      });

      cut(g, S([[-0.4, 0.54], [0.4, 0.54], [0.4, 0.56], [-0.4, 0.56]]));

      const brass = T("brass").mid;
      [0.25, 0.45].forEach((by) => {
        [-0.1, 0.1].forEach((bx) => {
          flat(g, S(ell(bx, by, 0.03, 0.03, 0, Math.PI * 2, 10)), brass);
        });
      });
    }
  });

  reg("coat", "inverness", {
    tone: "tweed", box: [-1.1, -0.2, 1.1, 1.8],
    paint(g, S, o, t) {
      const len = o.len != null ? o.len : 1.5;
      const body = [[-0.5, 0], [-0.6, len], [0.6, len], [0.5, 0]];
      fill3(g, S(body), t);

      const outerCape = [[-0.52, 0], [-0.95, 0.75], [0.95, 0.75], [0.52, 0]];
      fill3(g, S(outerCape), t);

      const innerCape = [[-0.52, 0], [-0.85, 0.5], [0.85, 0.5], [0.52, 0]];
      fill3(g, S(innerCape), { lit: t.mid, mid: t.shade, shade: t.shade });

      const collar = [[-0.3, -0.12], [0.3, -0.12], [0.35, 0], [-0.35, 0]];
      fill3(g, S(collar), t);

      cut(g, S([[-0.95, 0.75], [-0.9, 0.75], [-0.925, 0.65]]));
    }
  });

  reg("coat", "capelet", {
    tone: "tweed", box: [-0.9, -0.2, 0.9, 0.9],
    paint(g, S, o, t) {
      const xf = (pts) => {
        if (!o.found) return pts;
        const c = Math.cos(-0.08), s = Math.sin(-0.08);
        return pts.map(([x, y]) => {
          x -= 0.2;
          return [x * c - y * s, x * s + y * c];
        });
      };

      const body = [[-0.5, 0]].concat(ell(0, 0.5, 0.75, 0.15, Math.PI, 0, 12)).concat([[0.5, 0]]);
      fill3(g, S(xf(body)), t);

      const collar = [[-0.35, -0.15], [0.35, -0.15], [0.4, 0], [-0.4, 0]];
      fill3(g, S(xf(collar)), t);
    }
  });

  reg("coat", "dolman", {
    tone: "plum", box: [-1.3, -0.3, 1.3, 1.5],
    paint(g, S, o, t) {
      const len = o.len != null ? o.len : 1.1;
      const trail = o.found ? 0.25 : 0;
      const lenL = len, lenR = len + trail;
      const hemHW = 0.7 * (o.hem || 1);

      const topArc = ell(0, 0, 0.6, 0.25, Math.PI, 2 * Math.PI, 10);
      const body = topArc.concat([[0.95, 0.75], [0.7, lenR], [-0.7, lenL], [-0.95, 0.75]]);
      fill3(g, S(body), t);

      const band = [[-hemHW, lenL - 0.12], [hemHW, lenR - 0.12]]
        .concat(scallop(hemHW, lenR, -hemHW, lenL, 6, 0.04));
      fill3(g, S(band), T(o.fur || "seal"));
    }
  });

  // ---- trousers ----

  reg("trousers", "tailored", {
    tone: "slate", box: [-0.7, -0.1, 0.7, 1.6],
    paint(g, S, o, t) {
      const len = o.len != null ? o.len : 1.4;
      const waistband = [[-0.5, 0], [0.5, 0], [0.5, 0.12], [-0.5, 0.12]];
      fill3(g, S(waistband), { lit: t.mid, mid: t.shade, shade: t.shade });

      function leg(sign) {
        const ox = sign * 0.5, ixTop = sign * 0.08, ixHem = sign * 0.16;
        return [[ox, 0.12], [ixTop, 0.12], [ixHem, len], [ox, len]];
      }
      fill3(g, S(leg(-1)), t);
      fill3(g, S(leg(1)), t);

      cut(g, S([[-0.16, 0.35], [0.16, 0.35], [0.16, len], [-0.16, len]]));

      [-0.29, 0.29].forEach((cx) => {
        cut(g, S([[cx - 0.0075, 0.3], [cx + 0.0075, 0.3], [cx + 0.0075, len - 0.1], [cx - 0.0075, len - 0.1]]));
      });
    }
  });

  reg("trousers", "found", {
    tone: "slate", box: [-0.9, -0.3, 0.9, 1.9],
    paint(g, S, o, t) {
      const len = o.len != null ? o.len : 1.4;
      const longer = o.j1 < 0.5 ? -1 : 1;
      const lenL = len + (longer < 0 ? 0.12 : 0);
      const lenR = len + (longer > 0 ? 0.12 : 0);

      const topEdge = [];
      for (let i = 0; i <= 7; i++) {
        const x = -0.7 + 1.4 * (i / 7);
        topEdge.push([x, 0.03 + (i % 2 ? 0.05 : -0.05)]);
      }
      const waistband = topEdge.concat([[0.7, 0.15], [-0.7, 0.15]]);
      fill3(g, S(waistband), { lit: t.mid, mid: t.shade, shade: t.shade });

      const camel = T("camel").lit;
      flat(g, S([[-0.65, 0.05], [0.65, 0.05], [0.65, 0.08], [-0.65, 0.08]]), camel);
      flat(g, S([[0.58, 0.08], [0.62, 0.08], [0.6, 0.4]]), camel);
      flat(g, S([[0.66, 0.08], [0.7, 0.08], [0.68, 0.4]]), camel);

      function bagLeg(sign, hemY) {
        const outer = sign * 0.6, innerTop = sign * 0.05;
        const footY = hemY - 0.15;
        const innerFoot = sign * 0.17, outerFoot = sign * 0.72;
        return [
          [outer, 0.15], [innerTop, 0.15],
          [innerTop, footY], [innerFoot, hemY], [outerFoot, hemY], [outer, footY]
        ];
      }
      fill3(g, S(bagLeg(-1, lenL)), t);
      fill3(g, S(bagLeg(1, lenR)), t);
    }
  });

  // ---- boots ----

  reg("boots", "tailored", {
    tone: "boot", box: [-0.5, -1.05, 1.0, 0.05],
    paint(g, S, o, t) {
      const lenMul = o.len != null ? o.len : 1;
      const gape = o.found ? 0.12 : 0;
      const curl = o.found ? 0.1 : 0;
      const tipX = 0.22 + 0.52 * lenMul;

      const body = [
        [-0.22 - gape, -1], [0.2, -1],
        [0.22, -0.6],
        [tipX, -0.12], [tipX + 0.02, -curl],
        [-0.05, 0],
        [-0.26, -0.5]
      ];
      fill3(g, S(body), t);

      const sole = [[-0.26, 0], [tipX + 0.02, 0], [tipX + 0.02, 0.05], [-0.26, 0.05]];
      flat(g, S(sole), t.shade);

      const heel = [[-0.26, 0], [-0.05, 0], [-0.05, 0.05], [-0.26, 0.05]];
      fill3(g, S(heel), { lit: t.mid, mid: t.shade, shade: t.shade });
    }
  });

  reg("boots", "button", {
    tone: "boot", box: [-0.5, -1.35, 1.1, 0.05],
    paint(g, S, o, t) {
      const lenMul = o.len != null ? o.len : 1;
      const gape = o.found ? 0.12 : 0;
      const curl = o.found ? 0.1 : 0;
      const tipX = 0.3 + 0.5 * lenMul;

      const cloth = [[-0.24 - gape, -1.3], [0.22, -1.3], [0.22, -0.55], [-0.22, -0.55]];
      fill3(g, S(cloth), T(o.top || "slate"));

      const body = [
        [-0.22, -0.55], [0.2, -0.55],
        [0.22, -0.35],
        [tipX, -0.05 - curl],
        [tipX - 0.1, 0],
        [-0.05, 0],
        [-0.26, -0.35]
      ];
      fill3(g, S(body), t);

      const sole = [[-0.26, 0], [tipX - 0.1, 0], [tipX - 0.1, 0.05], [-0.26, 0.05]];
      flat(g, S(sole), t.shade);

      const heel = [[-0.26, 0], [-0.05, 0], [-0.05, 0.05], [-0.26, 0.05]];
      fill3(g, S(heel), { lit: t.mid, mid: t.shade, shade: t.shade });

      const brass = T("brass").mid;
      for (let i = 0; i < 5; i++) {
        const f = i / 4;
        const bx = 0.18 + (0.25 - 0.18) * f;
        const by = -1.2 + (-0.5 - -1.2) * f;
        flat(g, S(ell(bx, by, 0.035, 0.035, 0, Math.PI * 2, 10)), brass);
      }
    }
  });

  function rotAbout(p, a, cx, cy) {
    const dx = p[0] - cx, dy = p[1] - cy;
    const c = Math.cos(a), s = Math.sin(a);
    return [cx + dx * c - dy * s, cy + dx * s + dy * c];
  }

  reg("boots", "spats", {
    tone: "boot", box: [-0.5, -1.65, 1.0, 0.05],
    paint(g, S, o, t) {
      const shoe = [
        [-0.2, -0.45], [0.18, -0.45],
        [0.2, -0.25],
        [0.6, -0.1], [0.62, 0],
        [-0.05, 0], [-0.22, -0.25]
      ];
      fill3(g, S(shoe), t);

      const sole = [[-0.24, 0], [0.62, 0], [0.62, 0.05], [-0.24, 0.05]];
      flat(g, S(sole), t.shade);

      const topY = o.found ? -1.6 : -1;
      let spat = [[-0.22, topY], [0.2, topY], [0.22, -0.5], [0.15, -0.25], [-0.18, -0.25], [-0.24, -0.5]];
      const holes = [];
      for (let i = 0; i < 4; i++) {
        const f = (i + 1) / 5;
        holes.push([0.18, topY + (-0.3 - topY) * f]);
      }
      let holePts = holes;
      if (o.found) {
        spat = spat.map((p) => rotAbout(p, -0.08, 0, -0.5));
        holePts = holes.map((p) => rotAbout(p, -0.08, 0, -0.5));
      }
      fill3(g, S(spat), T(o.spat || "linen"));
      holePts.forEach(([hx, hy]) => cut(g, S(ell(hx, hy, 0.025, 0.025, 0, Math.PI * 2, 8))));

      const strap = [[0, 0], [0.15, 0], [0.15, 0.05], [0, 0.05]];
      flat(g, S(strap), t.shade);
    }
  });

  // ---- glove ----

  reg("glove", "kid", {
    tone: "coal", box: [-0.35, -0.45, 1.1, 0.45],
    paint(g, S, o, t) {
      const cuff = [[-0.3, -0.2], [0, -0.2], [0, 0.2], [-0.3, 0.2]];
      fill3(g, S(cuff), t);

      const palm = [[0, -0.18], [0.68, -0.18], [0.68, 0.18], [0, 0.18]];
      fill3(g, S(palm), t);

      const bandH = 0.36 / 4;
      for (let i = 0; i < 4; i++) {
        let y0 = -0.18 + i * bandH, y1 = y0 + bandH * 0.9;
        let rx = 0.12;
        if (o.found && i >= 2) { y0 += 0.15; y1 += 0.15; rx += 0.12; }
        const yc = (y0 + y1) / 2;
        const cap = ell(0.9, yc, rx, (y1 - y0) / 2, -Math.PI / 2, Math.PI / 2, 6);
        fill3(g, S([[0.65, y0]].concat(cap, [[0.65, y1]])), t);
      }

      const thumb = ell(0, 0, 0.18, 0.09, 0, Math.PI * 2, 10).map((p) => {
        const r = rotAbout(p, -0.6, 0, 0);
        return [r[0] + 0.35, r[1] - 0.32];
      });
      fill3(g, S(thumb), t);

      [[-0.15, -0.07], [-0.15, 0.07]].forEach(([hx, hy]) => {
        cut(g, S(ell(hx, hy, 0.02, 0.02, 0, Math.PI * 2, 8)));
      });

      if (o.fur) {
        const edge = scallop(-0.3, -0.2, -0.3, 0.2, 4, -0.05)
          .concat([[-0.26, 0.2], [-0.26, -0.2]]);
        fill3(g, S(edge), T("beaver"));
      }
    }
  });

  // ---- cane ----

  function bez2(tt, p0, ctrl, p1) {
    const u = 1 - tt;
    return [
      u * u * p0[0] + 2 * u * tt * ctrl[0] + tt * tt * p1[0],
      u * u * p0[1] + 2 * u * tt * ctrl[1] + tt * tt * p1[1]
    ];
  }

  reg("cane", "knob", {
    tone: "mourning", box: [-0.3, -1.12, 0.35, 0.02],
    paint(g, S, o, t) {
      const lean = o.lean != null ? o.lean : 0.1;
      const rot = (p) => rotAbout(p, lean, 0, 0);

      fill3(g, S([[-0.02, 0], [0.02, 0], [0.015, -0.06], [-0.015, -0.06]].map(rot)), T("gunmetal"));
      fill3(g, S([[-0.0125, -0.06], [0.0125, -0.06], [0.0125, -1], [-0.0125, -1]].map(rot)), t);

      const kc = rot([0, -1]);
      fill3(g, S(ell(kc[0], kc[1], 0.05, 0.05, 0, Math.PI * 2, 12)), T("brass"));
      cut(g, S([[-0.02, -0.95], [0.02, -0.95], [0.02, -0.93], [-0.02, -0.93]].map(rot)));
    }
  });

  reg("cane", "crook", {
    tone: "saddle", box: [-0.3, -1.12, 0.4, 0.02],
    paint(g, S, o, t) {
      const lean = o.lean != null ? o.lean : 0.1;
      const rot = (p) => rotAbout(p, lean, 0, 0);

      fill3(g, S([[-0.02, 0], [0.02, 0], [0.015, -0.06], [-0.015, -0.06]].map(rot)), T("gunmetal"));
      fill3(g, S([[-0.0125, -0.06], [0.0125, -0.06], [0.0125, -1], [-0.0125, -1]].map(rot)), t);

      const cx = 0.04, cy = -1.0;
      const a0 = 100 * Math.PI / 180;
      let a1 = a0 + 260 * Math.PI / 180;
      if (o.found) a1 -= 20 * Math.PI / 180;

      const outer = ell(cx, cy, 0.09, 0.09, a0, a1, 12);
      const inner = ell(cx, cy, 0.055, 0.055, a1, a0, 12);
      fill3(g, S(outer.concat(inner).map(rot)), t);
    }
  });

  // ---- monocle ----

  reg("monocle", "ring", {
    tone: "pewter", box: [-1.3, -1.3, 1.5, 3.2],
    paint(g, S, o, t) {
      const found = !!o.found;
      const rot = (p) => rotAbout(p, found ? 0.25 : 0, 0, 0);

      fill3(g, S(ell(0, 0, 1, 1, 0, Math.PI * 2, 24).map(rot)), t);
      cut(g, S(ell(0, 0, 0.8, 0.8, 0, Math.PI * 2, 24).map(rot)));

      const a0 = 100 * Math.PI / 180, a1 = 170 * Math.PI / 180;
      const glint = ell(0, 0, 0.8, 0.8, a0, a1, 8).concat(ell(0, 0, 0.72, 0.72, a1, a0, 8));
      flat(g, S(glint.map(rot)), T("linen").lit);

      const start = rot([0.7, 0.7]);
      const end = [o.cx != null ? o.cx : 0.9, (o.cy != null ? o.cy : 3.0) + (found ? 0.4 : 0)];
      const ctrl = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2 + 0.6];
      for (let i = 0; i < 6; i++) {
        const tt = (i + 0.5) / 6;
        const [lx, ly] = bez2(tt, start, ctrl, end);
        const rx = i % 2 === 0 ? 0.12 : 0.07, ry = i % 2 === 0 ? 0.07 : 0.12;
        flat(g, S(ell(lx, ly, rx, ry, 0, Math.PI * 2, 10)), t.mid);
      }
    }
  });

  // ---- scarf ----

  function scarfFringe(g, S, x0, x1, y1) {
    for (let i = 0; i < 3; i++) {
      const fx = x0 + (i + 0.5) * (x1 - x0) / 3;
      cut(g, S([[fx - 0.02, y1], [fx + 0.02, y1], [fx, y1 - 0.06]]));
    }
  }

  reg("scarf", "muffler", {
    tone: "oxblood", box: [-0.8, -0.3, 0.8, 1.6],
    paint(g, S, o, t) {
      const len = o.len != null ? o.len : 1.0;
      const found = !!o.found;
      const tilt = found ? 0.06 * (o.j2 - 0.5) * 2 : 0;

      const band = [
        [-0.55, -0.1],
        [-0.3, -0.22 + tilt], [0.3, -0.22 + tilt], [0.55, -0.1 + tilt],
        [0.5, 0.14 + tilt],
        [0.2, 0.2], [-0.2, 0.2], [-0.5, 0.14]
      ];
      fill3(g, S(band), t);

      if (!found) {
        const fold = [[-0.45, 0.14], [0.45, 0.14], [0.4, 0.2], [-0.4, 0.2]];
        flat(g, S(fold), t.shade);
      }

      if (found) {
        const overShoulder = [[-0.5, -0.05], [-0.3, -0.1], [-0.62, 0.42], [-0.75, 0.35]];
        fill3(g, S(overShoulder), t);

        const bLen = len * 1.5 + 0.3 * o.j1;
        const bTop0 = 0.3, bTop1 = 0.5, bY0 = 0.12;
        const kinkY = bY0 + Math.max(bLen - 0.15, 0);
        const tail = [
          [bTop0 + 0.02, bY0], [bTop1 - 0.02, bY0 + 0.02],
          [bTop1 - 0.02, kinkY],
          [bTop1 - 0.02 + 0.08, bY0 + bLen], [bTop0 + 0.02 + 0.08, bY0 + bLen],
          [bTop0 + 0.02, kinkY]
        ];
        fill3(g, S(tail), t);
        scarfFringe(g, S, bTop0 + 0.02 + 0.08, bTop1 - 0.02 + 0.08, bY0 + bLen);
      } else {
        const tailA = [[0.12, 0.1], [0.34, 0.1], [0.32, 0.1 + len], [0.14, 0.1 + len]];
        fill3(g, S(tailA), t);
        scarfFringe(g, S, 0.14, 0.32, 0.1 + len);

        const bLen = len * 0.85;
        const tailB = [[0.3, 0.12], [0.5, 0.12], [0.48, 0.12 + bLen], [0.32, 0.12 + bLen]];
        fill3(g, S(tailB), t);
        scarfFringe(g, S, 0.32, 0.48, 0.12 + bLen);
      }

      if (!found) nicks(g, S, 0.5, 0.3, 0.3 + len * 0.7, 2);
      if (o.snow) snowCap(g, S, -0.3, 0.3, -0.22, 0.06);
    }
  });

  reg("scarf", "comforter", {
    tone: "bottle", box: [-0.8, -0.3, 0.8, 1.9],
    paint(g, S, o, t) {
      const len = o.len != null ? o.len : 1.4;
      const found = !!o.found;
      const tilt = found ? 0.06 * (o.j2 - 0.5) * 2 : 0;
      const camel = T("camel").mid;

      const band = [
        [-0.55, -0.1],
        [-0.3, -0.22 + tilt], [0.3, -0.22 + tilt], [0.55, -0.1 + tilt],
        [0.5, 0.14 + tilt],
        [0.2, 0.2], [-0.2, 0.2], [-0.5, 0.14]
      ];
      fill3(g, S(band), t);

      [[-0.35, -0.2], [0.2, 0.35]].forEach(([x0, x1]) => {
        flat(g, S([[x0, -0.2], [x1, -0.2], [x1, 0.17], [x0, 0.17]]), camel);
      });

      if (!found) {
        const fold = [[-0.45, 0.14], [0.45, 0.14], [0.4, 0.2], [-0.4, 0.2]];
        flat(g, S(fold), t.shade);
      }

      function stripes(tailPts, x0, x1, y0, y1, skip) {
        g.save();
        poly(g, S(tailPts)); g.clip();
        let i = 0;
        for (let y = y0 + 0.1; y + 0.07 <= y1; y += 0.2) {
          if (i !== skip) {
            flat(g, S([[x0, y], [x1, y], [x1, y + 0.07], [x0, y + 0.07]]), camel);
          }
          i++;
        }
        g.restore();
      }

      if (found) {
        const overShoulder = [[-0.5, -0.05], [-0.3, -0.1], [-0.62, 0.42], [-0.75, 0.35]];
        fill3(g, S(overShoulder), t);

        const bLen = len * 1.5 + 0.3 * o.j1;
        const bTop0 = 0.3, bTop1 = 0.5, bY0 = 0.12;
        const kinkY = bY0 + Math.max(bLen - 0.15, 0);
        const tail = [
          [bTop0 + 0.02, bY0], [bTop1 - 0.02, bY0 + 0.02],
          [bTop1 - 0.02, kinkY],
          [bTop1 - 0.02 + 0.08, bY0 + bLen], [bTop0 + 0.02 + 0.08, bY0 + bLen],
          [bTop0 + 0.02, kinkY]
        ];
        fill3(g, S(tail), t);
        stripes(tail, bTop0, bTop1 + 0.1, bY0, bY0 + bLen, 2);
        scarfFringe(g, S, bTop0 + 0.02 + 0.08, bTop1 - 0.02 + 0.08, bY0 + bLen);
      } else {
        const tailA = [[0.12, 0.1], [0.34, 0.1], [0.32, 0.1 + len], [0.14, 0.1 + len]];
        fill3(g, S(tailA), t);
        stripes(tailA, 0.12, 0.34, 0.1, 0.1 + len);
        scarfFringe(g, S, 0.14, 0.32, 0.1 + len);

        const bLen = len * 0.85;
        const tailB = [[0.3, 0.12], [0.5, 0.12], [0.48, 0.12 + bLen], [0.32, 0.12 + bLen]];
        fill3(g, S(tailB), t);
        stripes(tailB, 0.3, 0.5, 0.12, 0.12 + bLen);
        scarfFringe(g, S, 0.32, 0.48, 0.12 + bLen);
      }

      if (!found) nicks(g, S, 0.5, 0.3, 0.3 + len * 0.7, 2);
      if (o.snow) snowCap(g, S, -0.3, 0.3, -0.22, 0.06);
    }
  });

  reg("scarf", "ruff", {
    tone: "astrakhan", box: [-0.9, -0.45, 0.9, 0.55],
    paint(g, S, o, t) {
      const found = !!o.found;
      const c = [0, 0.05];
      const rx = 0.75, ry = 0.4;
      const base = ell(c[0], c[1], rx, ry, 0, Math.PI * 2, 12);
      const ring = [];
      for (let i = 0; i < base.length - 1; i++) {
        const [ax, ay] = base[i];
        const [bx, by] = base[i + 1];
        ring.push([ax, ay]);
        const mx = (ax + bx) / 2, my = (ay + by) / 2;
        const dx = mx - c[0], dy = my - c[1];
        const dl = Math.sqrt(dx * dx + dy * dy) || 1;
        ring.push([mx + (dx / dl) * 0.06, my + (dy / dl) * 0.06]);
      }

      const xf = (pts) => pts.map(([x, y]) => {
        let px = x, py = y;
        if (found && px > c[0]) {
          px = c[0] + (px - c[0]) * 1.15;
        }
        if (found) {
          const rot = (o.j1 - 0.5) * 0.5;
          const dx = px - c[0], dy = py - c[1];
          const cr = Math.cos(rot), sr = Math.sin(rot);
          px = c[0] + dx * cr - dy * sr;
          py = c[1] + dx * sr + dy * cr;
        }
        return [px, py];
      });

      fill3(g, S(xf(ring)), t);
      cut(g, S(xf(ell(0, 0, 0.3, 0.14, 0, Math.PI * 2, 14))));

      if (!found) {
        flat(g, S(ell(-0.08, 0.36, 0.035, 0.035, 0, Math.PI * 2, 10)), T("brass").mid);
        flat(g, S(ell(0.08, 0.36, 0.035, 0.035, 0, Math.PI * 2, 10)), T("brass").mid);
      }

      if (o.snow) snowCap(g, S, -0.5, 0.5, -0.3, 0.07);
    }
  });

  // ---- watch ----

  reg("watch", "albert", {
    tone: "brass", box: [-0.25, -0.2, 1.25, 0.9],
    paint(g, S, o, t) {
      const sag = o.sag != null ? o.sag : 0.45;
      const found = !!o.found;
      const p0 = [0, 0], p1 = [1, 0], ctrl = [0.5, 2 * sag];
      const anchor = bez2((4.5) / 9, p0, ctrl, p1);

      for (let i = 0; i < 9; i++) {
        if (found && (i === 5 || i === 6)) continue;
        let lx, ly;
        if (found && i >= 7) {
          lx = anchor[0]; ly = anchor[1] + (i - 6) * 0.1;
        } else {
          const [px, py] = bez2((i + 0.5) / 9, p0, ctrl, p1);
          lx = px; ly = py;
        }
        const rx = i % 2 === 0 ? 0.04 : 0.025, ry = i % 2 === 0 ? 0.025 : 0.04;
        flat(g, S(ell(lx, ly, rx, ry, 0, Math.PI * 2, 10)), t.mid);
      }

      const fobC = [-0.02, 0.14];
      fill3(g, S(ell(fobC[0], fobC[1], 0.14, 0.14, 0, Math.PI * 2, 16)), t);
      cut(g, S(ell(fobC[0], fobC[1], 0.03, 0.03, 0, Math.PI * 2, 10)));

      const bar = [[0.92, -0.015], [1.08, -0.015], [1.08, 0.015], [0.92, 0.015]];
      flat(g, S(bar), t.mid);
    }
  });

  return { KINDS, DEF, reg, draw, sheet, clear, weather };
})();
