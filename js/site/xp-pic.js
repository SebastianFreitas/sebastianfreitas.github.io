/* DF Block's photos (.xp-pic, 1200 px and up): the camera shows first, ~3 s after the box comes into view the next of the other three cross-fades in (css: opacity only, 1 s, .on on one img), then every ~5 s (4 s hold + the fade).
   The incoming photo sits on top and the outgoing one stays at full opacity until the fade ends, so the middle of the fade never dips dark. A photo that has not loaded yet is waited for, never faded in blank.
   One setTimeout chain, no frame loop. Paused while the box is off screen or the tab is hidden; reduced motion keeps the camera. Only the next photo loads ahead (data-src -> src); phones keep the camera only. */
(function () {
  'use strict';
  var pic = document.querySelector('.xp-shape .xp-pic');
  if (!pic) return;
  var imgs = pic.querySelectorAll('img');
  if (imgs.length < 2) return;
  var wide = window.matchMedia('(min-width: 1200px)');
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  var FIRST = 3000, PERIOD = 5000, FADE = 1000, cur = 0, timer = 0, seen = false, z = 1;

  function load(i) {
    var im = imgs[i];
    if (im.dataset.src) { im.src = im.dataset.src; delete im.dataset.src; }
  }
  function ready(im) { return im.complete && im.naturalWidth > 0; }
  function tick() {
    timer = 0;
    if (!seen || document.hidden || !wide.matches || calm.matches) return;
    var n = (cur + 1) % imgs.length, old = cur;
    load(n);
    if (imgs[n].complete && imgs[n].src && !imgs[n].naturalWidth) { cur = n; load((n + 1) % imgs.length); timer = setTimeout(tick, 50); return; }   /* broken photo: skip it */
    if (!ready(imgs[n])) { timer = setTimeout(tick, 250); return; }   /* still loading: try again shortly */
    for (var i = 0; i < imgs.length; i++) if (i !== old && i !== n) imgs[i].classList.remove('on');
    imgs[n].style.zIndex = ++z;
    imgs[n].classList.add('on');
    cur = n;
    setTimeout(function () { if (cur !== old) imgs[old].classList.remove('on'); }, FADE + 100);
    load((cur + 1) % imgs.length);
    arm(PERIOD);
  }
  function arm(ms) {
    if (timer || !seen || document.hidden || !wide.matches || calm.matches) return;
    timer = setTimeout(tick, ms);
  }
  function stop() { if (timer) { clearTimeout(timer); timer = 0; } }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      var now = es[es.length - 1].isIntersecting;
      if (now === seen) return;
      seen = now;
      if (seen) go(); else stop();
    }).observe(pic.closest('.xp-shape') || pic);
  }
  function go() {
    if (!wide.matches || calm.matches) return;
    load((cur + 1) % imgs.length);
    arm(FIRST);
  }
  function react() {
    stop();
    if (calm.matches && cur) {
      imgs[cur].classList.remove('on');
      imgs[0].classList.add('on');
      cur = 0;
    }
    if (seen && !document.hidden) go();
  }
  wide.addEventListener('change', react);
  calm.addEventListener('change', react);
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else arm(FIRST); });
})();
