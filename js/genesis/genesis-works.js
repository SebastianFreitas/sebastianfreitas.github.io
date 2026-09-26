/* genesis-works.js — the worlds beat: a lens set into the flesh where the
   old ones build simulated universes by hand, card by card, world by world.
   Made, not conjured: flat shapes, stepped not smooth, one star for the
   one light source. */
window.GenWorks = (function () {
  const G = window.Gen;

  const DUR = 8.5, OPEN = 1.5, CLOSE = 1.2, STEP = 0.35;
  const FLAP = "#2e080c", HOLLOW = "#1a0608";
  const METAL = "#8a8f94", METAL_D = "#5d6166";
  const CARD = "#c9b98f", CARD_D = "#8c7d58";
  const STAR = "#f4e7c0";

  let hasBeatCache = null;
  function hasBeat() {
    if (hasBeatCache === null) hasBeatCache = G.BEATS.some((b) => b.id === "worlds");
    return hasBeatCache;
  }

  function draw(ctx, W, H) {
    if (!hasBeat()) return;
    const GenFlesh = window.GenFlesh;
    if (!GenFlesh || !GenFlesh.fleshGeom || !GenFlesh.fleshPath) return;

    const t = G.secs("worlds");
    if (t < 0 || t >= DUR) return;

    const g = GenFlesh.fleshGeom();
    const { cx, cy, rx, ry } = g;

    const lx = cx - 0.62 * rx, ly = cy;
    const lw = 0.12 * rx, lh = 0.275 * ry;

    let o;
    if (t < OPEN) {
      o = Math.min(3, Math.floor(t / (OPEN / 3)) + 1) / 3;
    } else if (t > DUR - CLOSE) {
      o = Math.max(0, 3 - Math.floor((t - (DUR - CLOSE)) / (CLOSE / 3)) - 1) / 3;
    } else {
      o = 1;
    }
    if (o <= 0) return;

    ctx.save();
    GenFlesh.fleshPath(ctx, cx, cy, rx, ry, 0.4, 0);
    ctx.clip();

    // the lens: hollow socket, two flaps folded back
    ctx.fillStyle = HOLLOW;
    ctx.beginPath();
    ctx.ellipse(lx, ly, Math.max(0.001, lw * o), lh, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = FLAP;
    ctx.beginPath();
    ctx.ellipse(lx - lw * o, ly, lw * 0.35, lh * 0.96, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(lx + lw * o, ly, lw * 0.35, lh * 0.96, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(lx, ly, Math.max(0.001, lw * o), lh, 0, 0, Math.PI * 2);
    ctx.clip();

    drawCards(ctx, lx, ly, lw, lh, o, t);
    drawWorlds(ctx, lx, ly, lw, lh, o, t);

    ctx.restore();
    ctx.restore();
  }

  function drawCards(ctx, lx, ly, lw, lh, o, t) {
    const sx = lx - lw * o * 0.7, sw = lw * 0.18;
    const ch = lh * 0.12, gap = lh * 0.03, pitch = ch + gap;
    const off = (Math.floor(t / STEP) * (lh * 0.15)) % pitch;
    const top = ly - lh - pitch, bottom = ly + lh + pitch;
    for (let i = 0; i < 9; i++) {
      const y = top + i * pitch + off;
      if (y + ch < ly - lh || y > ly + lh) continue;
      ctx.fillStyle = CARD;
      ctx.fillRect(sx - sw / 2, y, sw, ch);
      ctx.fillStyle = CARD_D;
      const hr = sw * 0.12;
      ctx.beginPath();
      ctx.ellipse(sx - sw * 0.2, y + ch * 0.5, hr, hr, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(sx + sw * 0.2, y + ch * 0.5, hr, hr, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawWorlds(ctx, lx, ly, lw, lh, o, t) {
    const r = lw * 0.2;
    for (let i = 0; i < 10; i++) {
      const col = i % 2, row = Math.floor(i / 2);
      const wx = lx - lw * 0.1 * o + col * lw * 0.55 * o;
      const wy = ly - lh * 0.78 + row * (lh * 1.56 / 4);

      const tb = OPEN + i * 0.5;
      const s = t < tb ? -1 : Math.min(3, Math.floor((t - tb) / STEP));
      if (s < 0) continue;

      const isStar = i === 6 && s === 3;

      ctx.strokeStyle = METAL_D;
      ctx.lineWidth = Math.max(1, r * 0.12);
      ctx.beginPath();
      ctx.ellipse(wx, wy, r, r, 0, 0, Math.PI * 2);
      ctx.stroke();

      if (s >= 1) {
        ctx.fillStyle = isStar ? STAR : METAL;
        ctx.beginPath();
        ctx.ellipse(wx, wy, r * 0.28, r * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      let rot = 0;
      if (s >= 2) {
        rot = (Math.floor(t / 0.5) + i) * Math.PI / 8;
        if (isStar) {
          ctx.globalAlpha = 0.18;
          ctx.fillStyle = STAR;
          ctx.beginPath();
          ctx.ellipse(wx, wy, r * 0.7, r * 0.7, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        ctx.strokeStyle = METAL;
        ctx.lineWidth = Math.max(1, r * 0.08);
        ctx.beginPath();
        ctx.ellipse(wx, wy, r * 1.35, r * 0.45, rot, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (s >= 3) {
        const ang = rot * 2;
        const sx2 = wx + Math.cos(ang) * r * 1.35, sy2 = wy + Math.sin(ang) * r * 0.45;
        ctx.fillStyle = METAL;
        ctx.beginPath();
        ctx.ellipse(sx2, sy2, r * 0.14, r * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  return { draw };
})();
