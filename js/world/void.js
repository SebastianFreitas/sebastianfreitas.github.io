/* js/world/void.js — void: stars, chaos, and things older than the span */
(function () {
  const { P, F, scale, wx, onScreen, chaosAt, VIEW_UNITS, SLOT, blobs, motes, presences, tendrils } = window.World;
  const { hash1, smooth, approach } = Util;

  /* ---- fragments of record, drifting in the empty stretches ---- */
  const FRAGMENTS = [
    "no survey returned from this bearing",
    "it was counted once and never again",
    "the span predates the record of the span",
    "something below is keeping pace",
    "entry withdrawn at the request of the author",
    "the light does not reach the legs",
    "they stopped sending people out this far",
    "measured twice — the numbers disagree",
    "whatever built it did not need it",
    "the census does not extend past here",
    "a name was here. it has been removed",
    "do not look down for longer than a breath",
  ];
  const FRAG_CHUNK = 5400;

  /* ---- draw: stars ---- */
  function drawVoid() {
    const { ctx, W, H, camX, t, vel, dtNow, V } = F;
    const s = scale(), span = W * 2.4, off = camX * 0.06 * s;
    for (const b of blobs) {
      b.y += b.vy * 1.2 * dtNow;   // 0.02 per frame at 60 fps, now per second
      if (b.y > 1.3) b.y = -0.25; if (b.y < -0.3) b.y = 1.25;
      const x = ((b.u * span - off) % span + span) % span - span * 0.2;
      const rad = b.rad * Math.max(W, H);
      if (!onScreen(x, rad)) continue;
      const y = b.y * H;
      ctx.fillStyle = `rgba(${b.hue},${b.a * 0.3})`;
      ctx.beginPath(); ctx.arc(x, y, rad * 0.8, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, rad * 0.5, 0, 6.283); ctx.fill();
    }
    const off2 = camX * 0.14 * s;
    const streak = Math.min(60, Math.abs(vel) / V.maxFling * 220);
    ctx.strokeStyle = "#c6ccc6"; ctx.fillStyle = "#c6ccc6";
    for (const m of motes) {
      const x = ((m.u * span - off2) % span + span) % span - span * 0.2;
      if (!onScreen(x, 80)) continue;
      const y = m.y * H + Math.sin(t * 0.5 + m.ph) * 16;
      ctx.globalAlpha = m.a * (0.55 + 0.45 * Math.sin(t * 1.6 + m.ph));
      if (streak > 3) {
        ctx.lineWidth = m.rr;
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.lineTo(x + Math.sign(vel) * streak * (0.4 + m.rr * 0.4), y); ctx.stroke();
      } else { ctx.beginPath(); ctx.arc(x, y, m.rr, 0, 6.283); ctx.fill(); }
    }
    ctx.globalAlpha = 1; ctx.lineWidth = 1;
  }

  /* ---- chaos: warped ribbons churning through the dark ---- */
  function drawChaos() {
    const { ctx, W, H, camX, t, chaosNow } = F;
    if (chaosNow < 0.02) return;
    const s = scale();
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const par = 0.09 + i * 0.035;
      const off = camX * par * s * 0.6;
      const baseY = H * (0.10 + i * 0.155);
      const amp = 40 + i * 22;
      ctx.beginPath();
      for (let px = -60; px <= W + 60; px += 24) {
        const u = (px + off) * 0.0018;
        const y = baseY
          + Math.sin(u + t * 0.18 + i * 1.3) * amp
          + Math.sin(u * 2.9 - t * 0.11 + i) * amp * 0.45
          + Math.sin(u * 6.1 + t * 0.26) * amp * 0.16;
        if (px === -60) ctx.moveTo(px, y); else ctx.lineTo(px, y);
      }
      const a = chaosNow * (0.05 + 0.05 * Math.sin(t * 0.23 + i));
      ctx.strokeStyle = i % 2 ? `rgba(96,66,74,${a})` : `rgba(58,84,92,${a})`;
      ctx.stroke();
    }
  }

  /* ---- things reaching out of the dark ---- */
  function drawTendrils() {
    const { ctx, H, camX, t, chaosNow } = F;
    if (chaosNow < 0.05) return;
    ctx.lineWidth = 1.2;
    for (const d of tendrils) {
      const x = wx(d.x, d.par);
      if (!onScreen(x, 260)) continue;
      const near = 1 - Math.min(1, Math.abs(camX - d.x) / (SLOT * 2.4));
      const a = d.a * chaosNow * smooth(near) * (0.5 + 0.5 * Math.sin(t * 0.4 + d.ph));
      if (a < 0.012) continue;
      ctx.strokeStyle = `rgba(120,74,80,${a})`;
      ctx.beginPath();
      const y0 = d.y * H;
      ctx.moveTo(x, y0);
      for (let k = 1; k <= 7; k++) {
        const u = k / 7;
        ctx.lineTo(x + d.dir * d.len * u,
                   y0 + Math.sin(t * 0.6 + d.ph + u * 3.4) * 26 * u + u * 22);
      }
      ctx.stroke();
    }
    ctx.lineWidth = 1;
  }

  /* ---- elder things: silhouettes cut out of the starfield ---- */
  function drawPresences() {
    const { ctx, H, camX, t, chaosNow, dtNow } = F;
    for (const p of presences) {
      const x = wx(p.x, p.par);
      if (!onScreen(x, p.w * 1.4)) { p.seen = approach(p.seen, 0, 2, dtNow); continue; }

      // surfaces slowly when you're near, and only during part of its cycle
      const near = 1 - Math.min(1, Math.abs(camX - p.x) / (SLOT * 2.2));
      const tide = Math.pow(0.5 + 0.5 * Math.sin(t * p.cycle * 6.283 + p.ph), 2.6);
      p.seen = approach(p.seen, smooth(near) * tide * chaosNow, 1.1, dtNow);
      if (p.seen < 0.015) continue;

      const y = p.y * H;
      const bw = p.w, bh = p.h;

      // a shape defined by what it hides
      ctx.fillStyle = `rgba(10,13,16,${0.85 * p.seen})`;
      ctx.beginPath(); ctx.ellipse(x, y, bw * 0.44, bh * 0.44, 0, 0, 6.283); ctx.fill();

      // one dim core, fading with the body — nothing that changes shape
      ctx.fillStyle = `rgba(150,72,64,${0.12 * p.seen})`;
      ctx.beginPath(); ctx.ellipse(x, y, bw * 0.14, bh * 0.14, 0, 0, 6.283); ctx.fill();
    }
  }

  /* ---- fragments of record, only out where there's nothing ---- */
  function drawFragments() {
    const { ctx, W, H, camX, t, chaosNow } = F;
    const s = scale();
    const i0 = Math.floor((camX - VIEW_UNITS * 1.4) / FRAG_CHUNK);
    const i1 = Math.ceil((camX + VIEW_UNITS * 1.4) / FRAG_CHUNK);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (let i = i0; i <= i1; i++) {
      const pick = hash1(i * 7919 + 31);
      if (pick > 0.4) continue;
      const fx = (i + 0.5) * FRAG_CHUNK + (hash1(i * 131) - 0.5) * FRAG_CHUNK * 0.5;
      if (chaosAt(fx) < 0.35) continue;                 // not near anything built
      const par = 0.42 + hash1(i * 57) * 0.34;
      const x = wx(fx, par);
      if (!onScreen(x, 420)) continue;

      const centre = 1 - Math.min(1, Math.abs(x - W * 0.5) / (W * 0.52));
      const a = smooth(centre) * 0.55 * chaosNow;
      if (a < 0.02) continue;

      const y = H * (0.14 + hash1(i * 313) * 0.7) + Math.sin(t * 0.3 + i) * 9;
      const size = Math.max(10, 13 * s * 0.8);
      ctx.font = `${size}px "IBM Plex Mono", monospace`;
      const txt = FRAGMENTS[Math.floor(hash1(i * 977) * FRAGMENTS.length)];

      // unstable: two offset ghosts under the main line
      const j = Math.sin(t * 7 + i) * 1.4;
      ctx.fillStyle = `rgba(176,104,90,${a * 0.5})`; ctx.fillText(txt, x - j, y);
      ctx.fillStyle = `rgba(143,176,184,${a * 0.5})`; ctx.fillText(txt, x + j, y);
      ctx.fillStyle = `rgba(198,204,198,${a})`;      ctx.fillText(txt, x, y);
    }
    ctx.textAlign = "start"; ctx.textBaseline = "alphabetic";
  }

  /* ---- west: what hasn't happened yet ---- */
  function drawFuture() {
    const { ctx, W, H, camX, t, futureNow } = F;
    if (futureNow < 0.02) return;
    const a = futureNow;
    ctx.fillStyle = `rgba(170,184,190,${0.03 * a})`; ctx.fillRect(0, 0, W * 0.5, H);
    ctx.fillStyle = `rgba(196,206,210,${0.05 * a})`; ctx.fillRect(0, 0, W * 0.22, H);

    // unformed vertical light, drifting
    ctx.lineWidth = 1;
    for (let i = 0; i < 14; i++) {
      const u = hash1(i * 613);
      const x = ((u * W * 1.6 - camX * 0.08 * scale()) % (W * 1.6) + W * 1.6) % (W * 1.6) - W * 0.3;
      if (!onScreen(x, 20)) continue;
      const h = H * (0.3 + hash1(i * 71) * 0.5);
      const y = H * hash1(i * 199) * 0.5;
      ctx.strokeStyle = `rgba(210,220,224,${0.05 * a * (0.4 + 0.6 * Math.sin(t * 0.4 + i))})`;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + h); ctx.stroke();
    }
  }

  P.drawVoid = drawVoid;
  P.drawChaos = drawChaos;
  P.drawTendrils = drawTendrils;
  P.drawPresences = drawPresences;
  P.drawFragments = drawFragments;
  P.drawFuture = drawFuture;
})();
