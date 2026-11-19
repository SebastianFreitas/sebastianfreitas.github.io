/* G.Round's game tile strip (.xp-games): the prev/next buttons scroll the snap row by one tile and disable at the ends. No timers, no loops; the scroll listener is passive and only flips two flags. */
(function () {
  'use strict';
  var box = document.querySelector('.xp-games');
  if (!box) return;
  var row = box.querySelector('.xg-row');
  var prev = box.querySelector('.xg-prev');
  var next = box.querySelector('.xg-next');
  if (!row || !prev || !next) return;

  function step() {
    var t = row.querySelector('li');
    if (!t) return row.clientWidth;
    var gap = parseFloat(getComputedStyle(row).columnGap) || 0;
    return t.offsetWidth + gap;
  }
  function sync() {
    prev.disabled = row.scrollLeft <= 1;
    next.disabled = row.scrollLeft >= row.scrollWidth - row.clientWidth - 1;
  }
  function go(dir) { row.scrollBy({ left: dir * step(), behavior: 'smooth' }); }

  prev.addEventListener('click', function () { go(-1); });
  next.addEventListener('click', function () { go(1); });
  row.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('resize', sync, { passive: true });
  sync();
  window.XpGames = { sync: sync };
})();
