/* "Back to Work" on a game page: when the visitor came from the homepage, go back in
   history so the browser restores the homepage from its back/forward cache. Any other
   arrival, or a modified click, leaves the href alone. */
window.BackLink = (function () {
  "use strict";

  function fromHome() {
    if (!document.referrer) return false;
    var r;
    try { r = new URL(document.referrer); } catch (e) { return false; }
    if (r.origin !== location.origin) return false;
    // the site root is this page's folder one level up (works at / and at /repo/ on Pages)
    var root = new URL("../", location.href).pathname;
    return r.pathname === root || r.pathname === root + "index.html";
  }

  function onClick(e) {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) return;
    // after "Skip to content" the page has a hash entry: back would stay on this page
    if (history.length > 1 && !location.hash && fromHome()) {
      e.preventDefault();
      history.back();
    }
  }

  var a = document.querySelector("a.back");
  if (a) a.addEventListener("click", onClick);

  return { fromHome: fromHome };
})();
