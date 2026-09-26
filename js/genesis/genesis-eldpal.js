/* genesis-eldpal.js — the eldritch palette (plan phase 4): named flat tones
   for the old ones' cloth, leather, fur, metal and snow, and the tier-3 sky
   steps. Data only; report() checks every token against the chaos backdrop,
   swatchSheet() draws a review sheet. */
window.GenEldPal = (() => {
  const BG = "#0d1114"; // fillBg in genesis-void.js
  const CHAOS = ["#10161b", "#14191f", "#1a1a22"]; // drawChaos layers
  const MID = 0.70, SHADE = 0.45; // shade matches the roster's 0.45 grey split; mid is the optional third band

  const LIT = {
    // Victorian winter wool: darker and duller than its wearer; linen is the one pale note (collar, spats)
    cloth: {
      coal: "#3c3d40", mourning: "#3c3a43", slate: "#4f565c", navy: "#34405a",
      bottle: "#304c3e", oxblood: "#5c2c2e", plum: "#4c3552", tweed: "#5c5446",
      camel: "#8a7453", linen: "#b8b2a4",
    },
    // worked hide, warmer than the wools it sits beside
    leather: { boot: "#3e3a38", saddle: "#6b4a30", tan: "#8c6a45" },
    // flat scalloped mass, no texture
    fur: { seal: "#433730", astrakhan: "#3e3e41", sable: "#5e4633", beaver: "#6a5a4a" },
    // dull, never glows
    metal: { brass: "#8a7240", gunmetal: "#4a4e52", pewter: "#7c7f80" },
    // flat pale caps on top edges
    snow: { snow: "#c9d0d4" },
    // the rift's cold band, the cutscene's only second light
    light: { rift: "#8fb3c6" },
  };

  // nearest to farthest-from-backdrop fog steps; caption is the index of the
  // only step allowed behind a caption; under is a step darker than the
  // backdrop for shade that falls straight down
  const TIER3 = {
    steps: ["#111519", "#14181d", "#171b21", "#1a1e25"],
    caption: 0,
    under: "#0a0d10",
  };

  function hexRgb(h) {
    return [
      parseInt(h.slice(1, 3), 16),
      parseInt(h.slice(3, 5), 16),
      parseInt(h.slice(5, 7), 16),
    ];
  }

  function rgbHex(r, g, b) {
    const c = (n) => n.toString(16).padStart(2, "0");
    return "#" + c(r) + c(g) + c(b);
  }

  function scale(hex, k) {
    const [r, g, b] = hexRgb(hex);
    return rgbHex(Math.round(r * k), Math.round(g * k), Math.round(b * k));
  }

  function lum(hex) {
    const [r, g, b] = hexRgb(hex);
    const f = (v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }

  function contrast(a, b) {
    const la = lum(a), lb = lum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  const TONES = {};
  const BY_NAME = {};
  for (const group in LIT) {
    TONES[group] = {};
    for (const name in LIT[group]) {
      const lit = LIT[group][name];
      const t = { lit, mid: scale(lit, MID), shade: scale(lit, SHADE) };
      TONES[group][name] = t;
      BY_NAME[name] = t;
    }
  }

  function tone(name) {
    return BY_NAME[name] || null;
  }

  function report() {
    const fails = [];
    const rows = [];
    for (const group in LIT) {
      for (const name in LIT[group]) {
        const t = TONES[group][name];
        const litVsChaos = Math.round(contrast(t.lit, CHAOS[2]) * 100) / 100;
        const shadeVsBg = Math.round(contrast(t.shade, BG) * 100) / 100;
        rows.push({ group, name, lit: t.lit, litVsChaos, shadeVsBg });
        if (litVsChaos < 1.5) fails.push(`${name}: lit only ${litVsChaos}:1 on the lightest chaos`);
        if (shadeVsBg < 1.05) fails.push(`${name}: shade vanishes into the backdrop`);
      }
    }

    const tier3 = TIER3.steps.map((hex, i) => ({
      step: i, hex, vsBg: Math.round(contrast(hex, BG) * 1000) / 1000,
    }));
    let prev = -Infinity;
    tier3.forEach((s, i) => {
      if (s.vsBg < 1.02 || s.vsBg > 1.15) fails.push(`tier3 step ${i}: vsBg ${s.vsBg} out of range`);
      if (s.vsBg <= prev) fails.push(`tier3 step ${i}: not strictly increasing`);
      prev = s.vsBg;
    });
    const capStep = tier3[TIER3.caption];
    if (capStep.vsBg > 1.05) fails.push(`tier3 caption step: vsBg ${capStep.vsBg} too high`);
    if (lum(TIER3.under) >= lum(BG)) fails.push("tier3 under: not darker than the backdrop");

    return { ok: fails.length === 0, fails, rows, tier3 };
  }

  function swatchSheet(ctx, w, h) {
    if (w <= 0 || h <= 0) return;

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = CHAOS[2];
    ctx.fillRect(w / 2, 0, w / 2, h);

    const groups = ["cloth", "leather", "fur", "metal", "snow"];
    const rh = h / 7;
    const halfW = w / 2;
    const cw = halfW / 10;
    const swW = cw * 0.8;
    const swH = rh * 0.55;
    const bandW = swW / 3;

    function drawSwatch(x, y, t) {
      ctx.fillStyle = t.lit;
      ctx.fillRect(x, y, bandW, swH);
      ctx.fillStyle = t.mid;
      ctx.fillRect(x + bandW, y, bandW, swH);
      ctx.fillStyle = t.shade;
      ctx.fillRect(x + bandW * 2, y, bandW, swH);
    }

    groups.forEach((group, row) => {
      const y = rh * 0.5 + row * rh;
      ctx.fillStyle = "#6b7278";
      ctx.font = "11px monospace";
      ctx.fillText(group, 4, y - 4);

      let col = 0;
      for (const name in LIT[group]) {
        const t = TONES[group][name];
        const xLeft = col * cw;
        const xRight = halfW + col * cw;
        drawSwatch(xLeft, y, t);
        drawSwatch(xRight, y, t);
        ctx.fillStyle = "#6b7278";
        ctx.fillText(name, xLeft, y + swH + 12);
        col++;
      }
    });

    const t3y = rh * 0.5 + 5 * rh;
    ctx.fillStyle = "#6b7278";
    ctx.font = "11px monospace";
    ctx.fillText("tier 3", 4, t3y - 4);
    const t3labels = ["t1", "t2", "t3", "t4", "under"];
    const t3hexes = [...TIER3.steps, TIER3.under];
    t3hexes.forEach((hex, i) => {
      const x = i * cw;
      ctx.fillStyle = hex;
      ctx.fillRect(x, t3y, swW, swH);
      ctx.fillStyle = "#6b7278";
      ctx.fillText(t3labels[i], x, t3y + swH + 12);
    });
  }

  return { BG, CHAOS, MID, SHADE, LIT, TONES, TIER3, tone, contrast, report, swatchSheet };
})();
