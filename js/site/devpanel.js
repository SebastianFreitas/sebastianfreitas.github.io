/* TEMPORARY dev panel: FPS button, frame timing, slow-frame log, debug switches. Only runs on ?dev, localhost or 127.0.0.1. Delete this file and its script tag to remove it. */
window.DevPanel = (function () {
  'use strict';
  const h = location.hostname;
  const on = /[?&]dev(=|&|$)/.test(location.search) || (!navigator.webdriver && (h === 'localhost' || h === '127.0.0.1'));
  if (!on) return { on: false };

  const CSS = `
#dev-root { position: fixed; right: 8px; bottom: 8px; z-index: 2147483647; font: 11px/1.4 ui-monospace, Consolas, monospace; color: #efe6d2; text-align: right; pointer-events: none; }
#dev-root button { font: inherit; color: #efe6d2; background: #000; border: 1px solid #efe6d2; padding: 2px 8px; cursor: pointer; pointer-events: auto; }
#dev-box { display: none; background: #000; border: 1px solid #efe6d2; padding: 8px; margin-bottom: 4px; width: 264px; text-align: left; pointer-events: auto; }
#dev-root.open #dev-box { display: block; }
#dev-box canvas { display: block; width: 240px; height: 50px; background: #111; margin: 4px 0; }
#dev-box label { display: block; cursor: pointer; }
#dev-log { margin: 4px 0; min-height: 1.4em; color: #c9bfa8; }
#dev-box .dev-h { color: #8a8272; margin-top: 4px; }
html.dev-nohover .obj, html.dev-nohover .obj * { pointer-events: none !important; }
html.dev-noclip .obj { clip-path: none !important; }
html.dev-noclip .folder-body { clip-path: none !important; }
html.dev-nomask * , html.dev-nomask *::before, html.dev-nomask *::after { -webkit-mask: none !important; mask: none !important; }
`;
  const sw = { clipsOff: false, hoverOff: false, clipPathOff: false, masksOff: false };
  const N = 120;
  const times = [];          // {t, dt}
  const slow = [];           // {at, dt, what}
  let last = 0, shown = 0, open = false, fpsNow = 0, fpsMin = 0, worst = 0, acc = 0, accN = 0, lastTick = 0;
  let root, btn, box, stats, cv, ctx, logEl, bridgeEl;

  function what() {
    const w = document.querySelector('.work');
    if (w && w.classList.contains('is-scrolling')) return 'scrolling';
    if (document.querySelector('.is-opening')) return 'folder opening';
    for (const v of document.querySelectorAll('video.clip')) if (!v.paused && !v.ended) return 'clip playing';
    return 'idle';
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (last) {
      const dt = now - last;
      if (dt < 1000) {   // a hidden tab gives huge gaps; skip them
        times.push({ t: now, dt });
        if (dt > 50) { slow.push({ at: new Date(), dt, what: what() }); if (slow.length > 8) slow.shift(); }
      }
      while (times.length && now - times[0].t > 5000) times.shift();
      acc += dt; accN++;
      if (acc >= 500) { fpsNow = Math.round(accN * 1000 / acc); acc = 0; accN = 0; }
      if (open && now - lastTick > 250) { lastTick = now; render(); }
    }
    last = now;
  }

  function summary() {
    let mx = 0, secs = {};
    for (const f of times) { if (f.dt > mx) mx = f.dt; const s = Math.floor(f.t / 1000); secs[s] = (secs[s] || 0) + 1; }
    const keys = Object.keys(secs);
    // the first and last buckets are partial: leave them out when there are others
    const full = keys.length > 2 ? keys.slice(1, -1) : keys;
    let mn = fpsNow;
    if (full.length) mn = Math.min.apply(null, full.map(k => secs[k]));
    return { fps: fpsNow, min: Math.min(mn, fpsNow || mn), worst: mx };
  }

  function bridgeState() {
    const B = window.Bridge;
    if (!B) return 'no bridge';
    return (B.visible && !B.portrait && !document.hidden && !B.held) ? 'running' : 'paused';
  }

  function slowText() {
    return slow.length ? slow.map(s => s.at.toLocaleTimeString() + '  ' + s.dt.toFixed(0) + ' ms  ' + s.what).join('\n') : 'none';
  }

  function render() {
    const s = summary();
    btn.textContent = open ? 'FPS ' + s.fps : 'FPS';
    stats.textContent = 'FPS now ' + s.fps + '\nlowest (5 s) ' + s.min + '\nworst frame (5 s) ' + s.worst.toFixed(1) + ' ms';
    logEl.textContent = slowText();
    bridgeEl.textContent = 'bridge: ' + bridgeState() + ' (read-only)';
    const W = cv.width, H = cv.height, max = 50;
    ctx.clearRect(0, 0, W, H);
    const arr = times.slice(-N), bw = W / N;
    for (let i = 0; i < arr.length; i++) {
      const dt = arr[i].dt, bh = Math.min(dt, max) / max * H;
      ctx.fillStyle = dt > 16.7 * 1.5 ? '#d33' : '#7a9';
      ctx.fillRect(i * bw, H - bh, Math.max(1, bw - 0.5), bh);
    }
    ctx.fillStyle = '#efe6d2';
    ctx.fillRect(0, H - 16.7 / max * H, W, 1);
  }

  function blockPlay(e) {
    if (sw.clipsOff && e.target && e.target.matches && e.target.matches('video.clip')) e.target.pause();
  }

  function apply() {
    const c = document.documentElement.classList;
    c.toggle('dev-nohover', sw.hoverOff);
    c.toggle('dev-noclip', sw.clipPathOff);
    c.toggle('dev-nomask', sw.masksOff);
    if (sw.clipsOff) document.querySelectorAll('video.clip').forEach(v => v.pause());
  }

  function addSwitch(label, key) {
    const l = document.createElement('label');
    const i = document.createElement('input');
    i.type = 'checkbox';
    i.addEventListener('change', () => { sw[key] = i.checked; apply(); });
    l.appendChild(i);
    l.appendChild(document.createTextNode(' ' + label));
    box.appendChild(l);
  }

  function report() {
    const s = summary();
    return [
      'FPS now: ' + s.fps, 'Lowest FPS (5 s): ' + s.min, 'Worst frame (5 s): ' + s.worst.toFixed(1) + ' ms',
      'Slow frames (>50 ms):', slowText(),
      'Switches: ' + Object.keys(sw).map(k => k + '=' + sw[k]).join(', '),
      'Bridge: ' + bridgeState(),
      'Viewport: ' + innerWidth + 'x' + innerHeight, 'DPR: ' + devicePixelRatio, 'UA: ' + navigator.userAgent
    ].join('\n');
  }

  function copy(b) {
    const t = report();
    const done = () => { b.textContent = 'Copied'; setTimeout(() => { b.textContent = 'Copy report'; }, 1200); };
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = t; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) { /* ignore */ }
      ta.remove(); done();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, fallback);
    else fallback();
  }

  function build() {
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    root = document.createElement('div'); root.id = 'dev-root';
    box = document.createElement('div'); box.id = 'dev-box';
    stats = document.createElement('div'); stats.style.whiteSpace = 'pre';
    cv = document.createElement('canvas'); cv.width = 240; cv.height = 50; ctx = cv.getContext('2d');
    box.appendChild(stats); box.appendChild(cv);
    const lh = document.createElement('div'); lh.className = 'dev-h'; lh.textContent = 'slow frames (>50 ms)';
    logEl = document.createElement('div'); logEl.id = 'dev-log'; logEl.style.whiteSpace = 'pre';
    box.appendChild(lh); box.appendChild(logEl);
    const sh = document.createElement('div'); sh.className = 'dev-h'; sh.textContent = 'switches (until reload)';
    box.appendChild(sh);
    addSwitch('clips off', 'clipsOff');
    addSwitch('hover off (rows stop taking the pointer)', 'hoverOff');
    addSwitch('folder clip-path off', 'clipPathOff');
    addSwitch('wear masks off', 'masksOff');
    bridgeEl = document.createElement('div'); box.appendChild(bridgeEl);
    const cb = document.createElement('button'); cb.type = 'button'; cb.textContent = 'Copy report'; cb.style.marginTop = '6px';
    cb.addEventListener('click', () => copy(cb));
    box.appendChild(cb);
    btn = document.createElement('button'); btn.type = 'button'; btn.textContent = 'FPS';
    btn.addEventListener('click', () => { open = !open; root.classList.toggle('open', open); render(); });
    root.appendChild(box); root.appendChild(btn);
    document.body.appendChild(root);
    document.addEventListener('play', blockPlay, true);
    requestAnimationFrame(frame);
  }

  if (document.body) build(); else document.addEventListener('DOMContentLoaded', build);
  return { on: true, report };
})();
