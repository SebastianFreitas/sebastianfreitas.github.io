/* shared drawing kit for the four HUD mockups (mock only, not site code) */
window.K = (function () {
  const GOLD = "245,208,107", CREAM = "238,230,208", GREY = "160,168,160", RED = "110,26,26", REDT = "196,74,68";
  let c;
  const A = { hero: 1, live: 0.92, struct: 0.45, faint: 0.2, grid: 0.12, label: 0.78 };
  function init(ctx) { c = ctx; c.lineCap = "butt"; c.lineJoin = "miter"; }
  const rgba = (col, a) => `rgba(${col},${a})`;
  function line(x1, y1, x2, y2, col = GOLD, a = A.struct, w = 1) {
    c.strokeStyle = rgba(col, a); c.lineWidth = w;
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  }
  function poly(pts, col = GOLD, a = A.struct, w = 1, close = false) {
    c.strokeStyle = rgba(col, a); c.lineWidth = w;
    c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]));
    if (close) c.closePath(); c.stroke();
  }
  function arc(cx, cy, r, a0, a1, col = GOLD, a = A.struct, w = 1, dash) {
    c.strokeStyle = rgba(col, a); c.lineWidth = w; if (dash) c.setLineDash(dash);
    c.beginPath(); c.arc(cx, cy, r, a0, a1); c.stroke(); c.setLineDash([]);
  }
  function dot(x, y, r, col = GOLD, a = 1) { c.fillStyle = rgba(col, a); c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill(); }
  function pip(x, y, s, col = GOLD, a = 1) { c.fillStyle = rgba(col, a); c.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), s, s); }
  const boxes = []; let noText = false;
  function text(str, x, y, o = {}) {
    const size = o.size || 10, wt = o.weight || "500";
    c.font = `${wt} ${size}px "IBM Plex Mono", monospace`;
    c.letterSpacing = (o.ls != null ? o.ls : (size <= 11 ? 0.8 : 0.2)) + "px";
    c.textAlign = o.align || "left"; c.textBaseline = o.base || "alphabetic";
    c.fillStyle = rgba(o.col || GREY, o.a != null ? o.a : A.label);
    const m = c.measureText(str);
    boxes.push({ s: str, b: [x - m.actualBoundingBoxLeft, y - m.actualBoundingBoxAscent, x + m.actualBoundingBoxRight, y + m.actualBoundingBoxDescent] });
    if (!noText) c.fillText(str, x, y);
    c.letterSpacing = "0px"; return m.width;
  }
  const lbl = (s, x, y, o = {}) => text(s, x, y, Object.assign({ size: 10, col: GREY, a: A.label }, o));
  const val = (s, x, y, o = {}) => text(s, x, y, Object.assign({ size: 12, col: GOLD, a: A.live, weight: "500" }, o));
  const hero = (s, x, y, o = {}) => text(s, x, y, Object.assign({ size: 24, col: CREAM, a: 1, weight: "500" }, o));
  /* seeded noise so every option shows the same readings */
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  /* the same sample data everywhere (values from the owner's screenshot) */
  const D = (function () {
    const r = rng(7);
    const spectrum = Array.from({ length: 32 }, (_, i) => 0.18 + 0.5 * r() * (0.6 + 0.4 * Math.sin(i * 0.7)));
    const r2 = rng(11);
    const o2tr = Array.from({ length: 60 }, (_, i) => 0.5 + 0.25 * Math.sin(i * 0.31) + 0.12 * (r2() - 0.5));
    const r3 = rng(5);
    /* resonance: log-scale values, floor noise then a climb to 0.08 at the head */
    const res = Array.from({ length: 80 }, (_, i) => {
      const t = i / 79;
      const base = 0.0016 + 0.0012 * r3() + 0.0018 * Math.max(0, Math.sin(i * 0.45));
      return Math.min(1, base + 0.08 * Math.pow(t, 7) + (i > 52 && i < 60 ? 0.004 * Math.sin((i - 52) / 8 * 3.14) : 0));
    });
    const r4 = rng(3);
    const dose = Array.from({ length: 60 }, (_, i) => 0.25 + 0.6 * Math.exp(-Math.pow((i - 40) / 13, 2)) + 0.05 * r4());
    const r5 = rng(9);
    const speed = Array.from({ length: 90 }, (_, i) => 0.03 + 0.02 * r5());
    return {
      contacts: 2, filed: true, near: "e 1,440", zone: "the void", rings: ["7k", "14k", "22k"],
      blips: [[0.62, -0.08], [-0.35, 0.22]], ball: [0.62, -0.45],
      spectrum, chaos: 1.0, unformed: 0.0, nomic: 0.0, sig: "silent · floor only", str: 16,
      speedU: "0", x: "246k", g: "0.00", rho: "0.00", run: "0 run", speed,
      o2: "20.88", co2: "615", p: "101.0", rh: "41.2", o2v: 0.65, co2v: 0.38, pv: 0.8, rhv: 0.41, o2tr,
      dose: "1.13", day: "27.16 /d", mag: "b 37.0 µT", doseTr: dose,
      hullInt: 1.0, hullT: "-38°", wear: "×1.0", hx: "17%", strike: "none",
      volt: "28.1 V", loads: [["life", 1.5], ["drv", 0.8], ["thm", 1.5], ["gnc", 0.7]],
      imu: "p +0.0  y 0  r +0.0", pc: "0.12 MPa", flow: "0.0 kg/s", tvc: "+0.0°",
      fuel: 0.72, thrust: 0.34, pwr: "×1.0", burnLeft: "41 s", fuel10: 0.72 - 0.034, state: "burn",
      res, resNow: "0.08", burn: "0.60 %/s", left: "2:00 left",
      thr: (function () { const r6 = rng(13); return Array.from({ length: 60 }, (_, i) => i >= 56 ? 0.34 : (i >= 36 && i <= 44 ? 0.8 + 0.12 * Math.sin((i - 36) / 8 * 3.14) : 0.24 + 0.1 * r6())); })(),
    };
  })();
  /* tick-column glyph: thin slits stacked from y0 upward, lit to v */
  function slitCol(x, y0, h, w, v, o = {}) {
    const step = o.step || 3, n = Math.floor(h / step), lit = Math.round(v * n);
    for (let i = 0; i < n; i++) {
      const on = i < lit;
      c.fillStyle = rgba(o.col || GOLD, on ? (o.aOn || 0.85) * (i === lit - 1 ? 1 : 0.8) : (o.aOff || 0.1));
      c.fillRect(x, y0 - (i + 1) * step + 1, w, 1);
    }
  }
  function rail(x1, x2, y, o = {}) {
    line(x1, y + 0.5, x2, y + 0.5, o.col || GOLD, o.a || A.struct, 1);
    const st = o.step || 8;
    for (let x = x1, i = 0; x <= x2; x += st, i++) {
      const maj = i % 5 === 0;
      line(Math.round(x) + 0.5, y + 1, Math.round(x) + 0.5, y + (maj ? 7 : 3), GOLD, maj ? 0.32 : 0.16);
    }
  }
  function cross(x, y, s = 4, a = 0.35) { line(x - s, y + 0.5, x + s + 1, y + 0.5, GOLD, a); line(x + 0.5, y - s, x + 0.5, y + s + 1, GOLD, a); }
  /* resonance log mapping: 0.001 floor .. 1 top */
  const resF = v => Math.max(0, Math.min(1, (Math.log10(Math.max(v, 0.001)) + 3) / 3));
  /* allowed area (owner's red-line curve, read from hud-red-lines-ref and the built fuel/resonance curve) */
  const LEFT = [[0, 672], [200, 684], [420, 690], [462, 700], [480, 742], [495, 820], [508, 890], [530, 935], [580, 945], [640, 950], [660, 958], [785, 958], [785, 1009], [0, 1009]];
  const RIGHT = [[1215, 958], [1340, 958], [1360, 950], [1420, 945], [1470, 935], [1492, 890], [1505, 820], [1520, 742], [1538, 700], [1580, 690], [1800, 665], [2000, 640], [2000, 1009], [1215, 1009]];
  function clipAllowed() {
    c.beginPath();
    [LEFT, RIGHT].forEach(P => { P.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); });
    c.clip();
  }
  function showMask() {
    c.save(); c.setLineDash([6, 4]);
    [LEFT, RIGHT].forEach(P => poly(P, "255,0,0", 0.9, 1, true)); c.restore();
  }
  return { boxes, setMeasure: f => { noText = f; }, measuring: () => noText, init, line, poly, arc, dot, pip, text, lbl, val, hero, rng, D, slitCol, rail, cross, resF, rgba, clipAllowed, showMask, LEFT, RIGHT, A, GOLD, CREAM, GREY, RED, REDT, ctx: () => c };
})();
