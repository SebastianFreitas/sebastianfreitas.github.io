/* ===========================================================
   SURGE — what a level looks like.

   A short burst at the chip on every level, its size tracking
   how full the row of pips is. Every tenth level earns a badge,
   and that gets a card of its own: it draws the new mark, holds
   the world still for a moment, then lets go.

   Listens for xp:surge and xp:rankup. Needs nothing else.
   =========================================================== */

(function () {
  /* This page's claim language IS the motion. Honouring OS
     "reduce motion" here was blanking the surge in Firefox on
     http:// (file:// often reports no preference), so the chip
     looked dead next to the same files opened as a document. */

  let layer = null;
  function ensureLayer() {
    if (layer) return layer;
    layer = document.createElement("div");
    layer.className = "surge-layer";
    layer.setAttribute("aria-hidden", "true");
    document.body.appendChild(layer);
    return layer;
  }

  function chipCentre() {
    const el = document.querySelector(".xp-chip .xp-badge") || document.querySelector(".xp-chip");
    if (!el) return { x: innerWidth / 2, y: 28 };
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function ring(parent, x, y, size, delay, dur) {
    const el = document.createElement("i");
    el.className = "surge-ring";
    el.style.left = (x - size / 2) + "px";
    el.style.top = (y - size / 2) + "px";
    el.style.width = size + "px";
    el.style.height = size + "px";
    parent.appendChild(el);
    el.animate(
      [{ transform: "scale(0.15)", opacity: 1 }, { transform: "scale(1)", opacity: 0 }],
      { duration: dur, delay, easing: "cubic-bezier(.15,.7,.3,1)", fill: "backwards" }
    ).onfinish = () => el.remove();
  }

  function sparks(parent, x, y, count, reach, seed) {
    const rnd = Util.mulberry(seed);
    for (let i = 0; i < count; i++) {
      const el = document.createElement("i");
      el.className = "surge-spark" + (rnd() < 0.35 ? " hot" : "");
      el.style.left = x + "px";
      el.style.top = y + "px";
      parent.appendChild(el);

      const a = i / count * Math.PI * 2 + (rnd() - 0.5) * 0.5;
      const d = reach * (0.45 + 0.55 * rnd());
      const dx = Math.sin(a) * d;
      const dy = -Math.cos(a) * d;
      const drop = 18 + 22 * rnd();
      const dur = 520 + 320 * rnd();

      el.animate(
        [
          { transform: "translate(0,0)", opacity: 1 },
          { transform: `translate(${dx * 0.7}px,${dy * 0.7}px)`, opacity: 1, offset: 0.45 },
          { transform: `translate(${dx}px,${dy + drop}px) scale(0.4)`, opacity: 0 },
        ],
        { duration: dur, easing: "cubic-bezier(.2,.8,.4,1)" }
      ).onfinish = () => el.remove();
    }
  }

  let labelEl = null, labelAnim = null;
  function label(x, y, text) {
    const parent = ensureLayer();
    if (!labelEl) {
      labelEl = document.createElement("div");
      labelEl.className = "surge-label";
      parent.appendChild(labelEl);
    }
    if (labelAnim) labelAnim.cancel();
    labelEl.textContent = text;
    labelEl.style.left = x + "px";
    labelEl.style.top = y + "px";
    labelAnim = labelEl.animate(
      [
        { opacity: 0, letterSpacing: "0.1em", transform: "translate(-50%, 4px)" },
        { opacity: 1, letterSpacing: "0.34em", transform: "translate(-50%, 0)", offset: 0.3 },
        { opacity: 0, letterSpacing: "0.42em", transform: "translate(-50%, -6px)" },
      ],
      { duration: 1100, easing: "ease-out" }
    );
  }

  let glowEl = null;
  function glow(strength) {
    const parent = ensureLayer();
    if (!glowEl) {
      glowEl = document.createElement("div");
      glowEl.className = "surge-glow";
      parent.appendChild(glowEl);
    }
    glowEl.style.setProperty("--g", strength.toFixed(2));
    glowEl.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: 620, easing: "ease-out" });
  }

  function play(detail) {
    ensureLayer();
    const level = detail.level || 0;
    const pip = detail.pip != null ? detail.pip : level % 10;
    const { x, y } = chipCentre();

    if (detail.rankUp) {
      ring(layer, x, y, 150, 0, 760);
      ring(layer, x, y, 200, 80, 760);
      ring(layer, x, y, 260, 170, 820);
      sparks(layer, x, y, 30, 150, level * 7919 + 1);
      glow(1);
      label(x, y + 24, "Rank up");
    } else {
      const p = Math.max(1, pip) / 10;
      ring(layer, x, y, 90 + 60 * p, 0, 600);
      if (pip >= 5) ring(layer, x, y, 120 + 80 * p, 90, 680);
      sparks(layer, x, y, Math.round(8 + 14 * p), 60 + 50 * p, level * 7919 + 1);
      glow(0.25 + 0.45 * p);
      label(x, y + 24, "Level " + level);
    }
  }

  const ROMAN = [
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  function roman(n) {
    let out = "";
    for (const [v, s] of ROMAN) {
      while (n >= v) { out += s; n -= v; }
    }
    return out;
  }

  let card = null;
  function rankUp(detail) {
    if (card) card.close(true);

    const to = detail.to || {}, from = detail.from || {};
    if (!to.name) return;

    const veil = document.createElement("div");
    veil.className = "rank-veil";
    veil.setAttribute("role", "dialog");
    veil.setAttribute("aria-modal", "true");
    veil.setAttribute("aria-label", "Rank up: you are now " + to.name);

    const cardEl = document.createElement("div");
    cardEl.className = "rank-card";
    veil.appendChild(cardEl);

    const kicker = document.createElement("p");
    kicker.className = "rank-kicker";
    kicker.textContent = "Rank up";
    cardEl.appendChild(kicker);

    const badge = document.createElement("div");
    badge.className = "rank-badge";
    cardEl.appendChild(badge);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    badge.appendChild(svg);

    if (from.d) {
      const oldPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      oldPath.setAttribute("class", "rank-old");
      oldPath.setAttribute("d", from.d);
      svg.appendChild(oldPath);
    }
    const newPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    newPath.setAttribute("class", "rank-new");
    newPath.setAttribute("d", to.d);
    newPath.setAttribute("pathLength", "1");
    svg.appendChild(newPath);

    const now = document.createElement("p");
    now.className = "rank-now";
    now.textContent = "You are now";
    cardEl.appendChild(now);

    const name = document.createElement("h2");
    name.className = "rank-name";
    // letters animate one by one, but a word never breaks in the middle
    let k = 0;
    to.name.split(" ").forEach((word, w) => {
      if (w > 0) name.appendChild(document.createTextNode(" "));
      const wordEl = document.createElement("span");
      wordEl.className = "rank-word";
      for (const ch of word) {
        const span = document.createElement("span");
        span.style.setProperty("--i", k++);
        span.textContent = ch;
        wordEl.appendChild(span);
      }
      name.appendChild(wordEl);
    });
    cardEl.appendChild(name);

    const meta = document.createElement("p");
    meta.className = "rank-meta";
    meta.appendChild(document.createTextNode("Level "));
    const b = document.createElement("b");
    b.textContent = detail.level;
    meta.appendChild(b);
    meta.appendChild(document.createTextNode(" · Rank " + roman(to.index + 1) + " of " + roman(detail.count || 11)));
    cardEl.appendChild(meta);

    const next = document.createElement("p");
    next.className = "rank-next";
    next.textContent = to.next ? "Next · " + to.nextName + " at level " + to.next : "The last rank there is";
    cardEl.appendChild(next);

    const hint = document.createElement("p");
    hint.className = "rank-hint";
    hint.textContent = Util.coarse() ? "Tap to continue" : "Click to continue";
    cardEl.appendChild(hint);

    document.body.appendChild(veil);
    requestAnimationFrame(() => veil.classList.add("open"));

    document.dispatchEvent(new CustomEvent("xp:freeze", { detail: { on: true } }));

    const r = badge.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    ring(veil, cx, cy, 170, 120, 800);
    ring(veil, cx, cy, 250, 220, 900);
    sparks(veil, cx, cy, 34, 190, (detail.level || 0) * 131 + 7);

    const openedAt = performance.now();
    let closed = false;
    let autoTimer = null;

    function close(instant) {
      if (closed) return;
      closed = true;
      clearTimeout(autoTimer);
      document.removeEventListener("keydown", onKey);
      card = null;
      document.dispatchEvent(new CustomEvent("xp:freeze", { detail: { on: false } }));
      if (instant) {
        veil.remove();
      } else {
        veil.classList.add("closing");
        setTimeout(() => veil.remove(), 200);
      }
    }

    function onKey(e) {
      if (performance.now() - openedAt <= 450) return;
      if (e.key === " " || e.key === "Spacebar" || e.key === "Enter" || e.key === "Escape") e.preventDefault();
      close(false);
    }

    veil.addEventListener("pointerdown", e => {
      e.preventDefault();
      e.stopPropagation();
      if (performance.now() - openedAt > 450) close(false);
    });
    document.addEventListener("keydown", onKey);

    autoTimer = setTimeout(() => close(false), 3800);

    try {
      veil.tabIndex = -1;
      veil.focus({ preventScroll: true });
    } catch (e) {}

    card = { close };
  }

  document.addEventListener("xp:surge", e => play(e.detail || {}));
  document.addEventListener("xp:rankup", e => {
    const d = e.detail || {};
    setTimeout(() => rankUp(d), 380);
  });

  window.Surge = { play, rankUp };
})();
