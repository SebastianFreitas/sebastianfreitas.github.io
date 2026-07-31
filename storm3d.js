/* =========================================================
   Sector Zero — the storm.

   Objects float free behind the page, tumbling and bouncing off
   the edges.

   Grab one and let go and it gets CATALOGUED: it turns to face
   you, stops tumbling, brightens, and the storm can't move it
   any more. Click a catalogued object to release it again.
   ========================================================= */

// Fetched only if we're going to run — see boot() below.
let THREE, GLTFLoader, DRACOLoader;

// ---- your objects --------------------------------------------
const OBJECTS = [
  { model: "../media/models/SM_ComputerTower_A01_N1.glb",              size: 210 },
  { model: "../media/models/SM_ComputerMonitor_A02_N1.glb",                 size: 200 },
  { model: "../media/models/SM_ComputerKeyboard_A01_N1.glb", size: 190 },
  { model: "../media/models/SM_ComputerParts_A04_N1.glb",    size: 130 },
  { model: "../media/models/SM_ComputerCards_A01_N1.glb",    size: 115 },
  { model: "../media/models/SM_Record_Stack_E01_N1.glb",     size: 120 },
  { model: "../media/models/SM_BooksPamphlets_B01_N1.glb",   size: 110 },
  { model: "../media/models/SM_CleaingSolution_B01_N1.glb",  size: 100 },
  { model: "../media/models/SM_Food_Leftover_AO1_N1.glb",    size: 105 },
  { model: "../media/models/SM_Food_Leftover_EO1_N1.glb",    size:  95 },
  { model: "../media/models/SM_Food_Leftover_GO1_N1.glb",    size:  95 },
];

// ---- tuning ---------------------------------------------------
const SPEED_MIN   = 18;        // px/sec of idle drift
const SPEED_MAX   = 42;
const SPIN_MIN    = 0.08;      // radians/sec
const SPIN_MAX    = 0.28;
const DEPTH       = 300;       // spread in z, gives the field some depth

const MAX_SPEED   = 340;       // stops a flung object leaving the screen

const ALPHA_LOOSE = 0.45;      // drifting over your text — keep it readable
const ALPHA_LOCKED= 0.92;      // catalogued
const FADE_RATE   = 3;
const FACE_RATE   = 3;         // how fast a catalogued object turns to face you

const DRAG_SLOP   = 6;         // px of movement before it counts as a drag

const STORM_MIN_WIDTH = 900;   // phones skip the storm entirely

async function boot() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (window.innerWidth < STORM_MIN_WIDTH) return;

  // ~800 KB of library + decoder, never fetched on mobile
  THREE = await import("three");
  ({ GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js"));
  ({ DRACOLoader } = await import("three/addons/loaders/DRACOLoader.js"));
  init();
}
boot();

function init() {
  const field = document.getElementById("storm-field");
  if (!field) return;

  let W = field.clientWidth;
  let H = field.clientHeight;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.setClearColor(0x000000, 0);
  field.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  const FOV = 45;
  const camera = new THREE.PerspectiveCamera(FOV, W / H, 1, 8000);
  let camZ = 1000;
  function placeCamera() {
    camera.aspect = W / H;
    camZ = (H / 2) / Math.tan((FOV / 2) * Math.PI / 180);
    camera.position.z = camZ;
    camera.updateProjectionMatrix();
  }
  placeCamera();

  // ---- neutral lighting, so models keep their own colours ------
  scene.add(new THREE.AmbientLight(0xffffff, 0.65));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-0.5, 0.9, 1.1);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.55);
  fill.position.set(1, 0.2, 0.6);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0x9fb2b8, 0.4);
  rim.position.set(0.4, -0.6, -1);
  scene.add(rim);

  // ---- readout -------------------------------------------------
  const readout = document.createElement("div");
  readout.className = "storm-readout";
  field.appendChild(readout);

  // ---- items ---------------------------------------------------
  const items = [];
  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath("https://cdn.jsdelivr.net/npm/three@0.164.0/examples/jsm/libs/draco/");
  loader.setDRACOLoader(draco);

  const rand = (a, b) => a + Math.random() * (b - a);
  const spin = () => (Math.random() < 0.5 ? -1 : 1) * rand(SPIN_MIN, SPIN_MAX);

  OBJECTS.forEach((o) => {
    const group = new THREE.Group();
    scene.add(group);

    const dir = Math.random() * Math.PI * 2;
    const spd = rand(SPEED_MIN, SPEED_MAX);

    items.push({
      group, base: o.size,
      x: Math.random(), y: Math.random(), placed: false,
      z: (Math.random() - 0.5) * DEPTH,
      vx: Math.cos(dir) * spd, vy: Math.sin(dir) * spd,
      rx: rand(0, 6.28), ry: rand(0, 6.28), rz: rand(0, 6.28),
      sx: spin(), sy: spin(), sz: spin(),
      locked: false,
      opa: 0, opaTarget: 0,
      materials: [],
    });

    const it = items[items.length - 1];
    loader.load(
      o.model,
      (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const dims = box.getSize(new THREE.Vector3());
        const centre = box.getCenter(new THREE.Vector3());
        const largest = Math.max(dims.x, dims.y, dims.z) || 1;
        const s = o.size / largest;
        model.scale.setScalar(s);
        model.position.copy(centre).multiplyScalar(-s);

        model.traverse((n) => {
          if (n.isMesh && n.material) {
            const mats = Array.isArray(n.material) ? n.material : [n.material];
            mats.forEach((m) => {
              m.transparent = true;
              m.opacity = 0;
              it.materials.push(m);
            });
          }
        });

        group.add(model);
        it.opaTarget = it.locked ? ALPHA_LOCKED : ALPHA_LOOSE;
      },
      undefined,
      () => {}
    );
  });

  // ---- projection helpers --------------------------------------
  // Objects sit at various depths, so screen position isn't just x/y.
  const depthK = (it) => camZ / (camZ - it.z);

  function screenPos(it) {
    const k = depthK(it);
    return {
      x: W / 2 + (it.x - W / 2) * k,
      y: H / 2 - (H / 2 - it.y) * k,
      r: it.base * 0.42 * k,
    };
  }

  function screenToWorld(sx, sy, it) {
    const k = depthK(it);
    return { x: W / 2 + (sx - W / 2) / k, y: H / 2 - (H / 2 - sy) / k };
  }

  // ---- layout ---------------------------------------------------
  function layout() {
    const pw = W || field.clientWidth;
    const ph = H || field.clientHeight;
    W = field.clientWidth;
    H = field.clientHeight;
    renderer.setSize(W, H);
    placeCamera();

    const scale = window.innerWidth >= 1280 ? 1 : 0.6;
    items.forEach((it) => {
      if (it.group.children[0]) it.group.scale.setScalar(scale);
      if (!it.placed) { it.x *= W; it.y *= H; it.placed = true; }
      else { it.x *= W / pw; it.y *= H / ph; }
    });
  }

  // ---- pointer ---------------------------------------------------
  const mouse = { x: -9999, y: -9999, active: false };
  let held = null;
  let grabDX = 0, grabDY = 0;
  let downAt = null, wasLocked = false, moved = 0;

  function fieldCoords(e) {
    const r = field.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function pick(sx, sy) {
    let best = null, bestZ = -Infinity;
    for (const it of items) {
      const p = screenPos(it);
      const d = Math.hypot(sx - p.x, sy - p.y);
      if (d <= p.r && it.z > bestZ) { best = it; bestZ = it.z; }  // frontmost wins
    }
    return best;
  }

  window.addEventListener("pointermove", (e) => {
    const p = fieldCoords(e);
    mouse.x = p.x; mouse.y = p.y; mouse.active = true;

    if (held) {
      moved += Math.hypot(p.x - (downAt?.x ?? p.x), p.y - (downAt?.y ?? p.y));
      const w = screenToWorld(p.x - grabDX, p.y - grabDY, held);
      held.vx = (w.x - held.x) * 8;      // carry momentum so it flings on release
      held.vy = (w.y - held.y) * 8;
      held.x = w.x; held.y = w.y;
    } else {
      document.body.style.cursor = pick(p.x, p.y) ? "grab" : "";
    }
  }, { passive: true });

  window.addEventListener("pointerdown", (e) => {
    // never steal clicks from links, buttons or the video players
    if (e.target.closest && e.target.closest("a, button, video, input, textarea, select")) return;

    const p = fieldCoords(e);
    const hit = pick(p.x, p.y);
    if (!hit) return;

    held = hit;
    downAt = p;
    wasLocked = hit.locked;
    moved = 0;
    const sp = screenPos(hit);
    grabDX = p.x - sp.x;
    grabDY = p.y - sp.y;
    document.body.style.cursor = "grabbing";
    e.preventDefault();                  // stop text selection while dragging
  });

  window.addEventListener("pointerup", () => {
    if (!held) return;

    if (wasLocked && moved < DRAG_SLOP) {
      // a click on an already-catalogued object releases it back into the storm
      held.locked = false;
      held.sx = spin(); held.sy = spin(); held.sz = spin();
      const dir = Math.random() * Math.PI * 2;
      const spd = rand(SPEED_MIN, SPEED_MAX);
      held.vx = Math.cos(dir) * spd;
      held.vy = Math.sin(dir) * spd;
    } else {
      held.locked = true;
    }

    held.opaTarget = held.locked ? ALPHA_LOCKED : ALPHA_LOOSE;
    held = null;
    downAt = null;
    document.body.style.cursor = "";
    updateReadout();
  });

  window.addEventListener("pointerleave", () => { mouse.active = false; });

  // ---- motion ----------------------------------------------------
  let last = performance.now();

  function step(dt) {
    for (const it of items) {
      const isHeld = it === held;

      if (!isHeld) {
        if (it.locked) {
          // anchored: still drifts gently, but turns to face you and stops tumbling
          it.rx += (0 - it.rx) * Math.min(1, dt * FACE_RATE);
          it.ry += (0 - it.ry) * Math.min(1, dt * FACE_RATE);
          it.rz += (0 - it.rz) * Math.min(1, dt * FACE_RATE);
          it.vx *= Math.pow(0.15, dt);
          it.vy *= Math.pow(0.15, dt);
        } else {
          it.rx += it.sx * dt;
          it.ry += it.sy * dt;
          it.rz += it.sz * dt;

          const sp = Math.hypot(it.vx, it.vy);
          if (sp > MAX_SPEED) { it.vx *= MAX_SPEED / sp; it.vy *= MAX_SPEED / sp; }
        }

        it.x += it.vx * dt;
        it.y += it.vy * dt;
      }

      // bounce off every edge
      const m = it.base * 0.5;
      if (it.x < m)     { it.x = m;     it.vx = Math.abs(it.vx); }
      if (it.x > W - m) { it.x = W - m; it.vx = -Math.abs(it.vx); }
      if (it.y < m)     { it.y = m;     it.vy = Math.abs(it.vy); }
      if (it.y > H - m) { it.y = H - m; it.vy = -Math.abs(it.vy); }

      it.opa += (it.opaTarget - it.opa) * Math.min(1, dt * FADE_RATE);
      it.materials.forEach((mat) => {
        mat.opacity = it.opa;
        mat.depthWrite = it.opa > 0.85;
      });

      it.group.position.set(it.x - W / 2, H / 2 - it.y, it.z);
      it.group.rotation.set(it.rx, it.ry, it.rz);
    }
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 1 / 20);
    last = now;
    step(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  // ---- readout ----------------------------------------------------
  let everCatalogued = false;
  function updateReadout() {
    const n = items.filter((i) => i.locked).length;
    if (n > 0) everCatalogued = true;
    readout.textContent = everCatalogued
      ? `CATALOGUED ${String(n).padStart(2, "0")} / ${String(items.length).padStart(2, "0")}`
      : "DRAG AN OBJECT TO CATALOGUE IT";
    readout.classList.toggle("complete", n >= items.length);
  }
  updateReadout();

  window.addEventListener("resize", layout);
  layout();
  requestAnimationFrame(frame);
}
