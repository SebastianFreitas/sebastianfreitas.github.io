/* util.js — the small maths, storage and environment helpers that every
   other file used to carry its own copy of. Loaded first, on every page,
   so any script may destructure what it needs:
     const { clamp, approach } = Util;
   Functions and constants may be destructured; nothing here is mutable. */
window.Util = (function () {
  const TAU = Math.PI * 2;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const mix = (a, b, u) => a + (b - a) * u;
  const smooth = u => { u = Math.min(1, Math.max(0, u)); return u * u * (3 - 2 * u); };
  // move `cur` toward `tgt` by a fraction of the gap per second; frame-rate independent enough for eased readouts
  const approach = (cur, tgt, rate, dt) => cur + (tgt - cur) * Math.min(1, (dt || 0) * rate);
  const easeOut = u => 1 - Math.pow(1 - u, 3);
  function wrapPi(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }
  const mulberry = a => () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let x = Math.imul(a ^ a >>> 15, 1 | a);
    x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x;
    return ((x ^ x >>> 14) >>> 0) / 4294967296;
  };
  function hash1(n) {
    n = (n ^ 61) ^ (n >>> 16);
    n = n + (n << 3); n = n ^ (n >>> 4);
    n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15);
    return (n >>> 0) / 4294967296;
  }
  function vnoise(x, seed) {
    const i = Math.floor(x), f = x - i;
    const a = hash1((i * 73856093) ^ seed);
    const b = hash1(((i + 1) * 73856093) ^ seed);
    return a + (b - a) * (f * f * (3 - 2 * f));
  }
  function ridge(x, seed) {
    return vnoise(x, seed) * 0.55 + vnoise(x * 2.3, seed + 17) * 0.3
         + vnoise(x * 5.1, seed + 91) * 0.15;
  }
  const fmt = n => Math.round(n).toLocaleString("en-US");

  /* environment: queried live, so a change while the page is open is seen */
  const reducedQ = matchMedia("(prefers-reduced-motion: reduce)");
  const coarseQ = matchMedia("(pointer: coarse)");
  const reduced = () => reducedQ.matches;
  const coarse = () => coarseQ.matches;

  /* storage: every key the site uses, and reads/writes that never throw
     (private mode, blocked storage) */
  const KEYS = {
    PREFIX: "arcanis.",
    PROFILE: "arcanis.profile.v1",
    HINTS: "arcanis.hints.v2",
    VIEW: "arcanis.view.v1",
    SECTOR: "arcanis.sector.v1",
    INST_SCALE: "arcanis.inst.scale",
    GEAR_SEEN: "arcanis.gear.seen",
    SW_CLEANUP: "arcanis.swcleanup.v1",
  };
  function read(store, key) { try { return store.getItem(key); } catch (e) { return null; } }
  function write(store, key, value) { try { store.setItem(key, value); return true; } catch (e) { return false; } }
  function remove(store, key) { try { store.removeItem(key); } catch (e) {} }

  return { TAU, clamp, mix, smooth, approach, easeOut, wrapPi, mulberry, hash1, vnoise, ridge, fmt,
           reduced, coarse, KEYS, read, write, remove };
})();
