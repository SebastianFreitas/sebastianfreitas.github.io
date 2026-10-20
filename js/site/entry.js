/* ===========================================================
   ENTRY — decides, before the body is parsed, whether this load
   shows the gate. Loaded in <head>, right after xp.js, so the gate
   is hidden before it can paint.

     restore    Back / Forward / reload, and this tab saved a view
     deeplink   the URL targets a section (#work, #experience)
     returning  the visitor has been through the gate before
     first      none of the above: boot log, then the two paths
   =========================================================== */

window.SiteEntry = (function () {
  const VIEW_KEY   = Util.KEYS.VIEW;     // sessionStorage: this tab's last view
  const SECTIONS = ["work", "experience", "sector-zero", "voidscape", "heavylight", "conclusus"];
  /* gamedev sector archived: the bridge has one sector; a stored "gamedev" is ignored */

  const read = Util.read;

  function navType() {
    try {
      const nav = performance.getEntriesByType("navigation")[0];
      if (nav && nav.type) return nav.type;
    } catch (e) {}
    return "navigate";
  }

  let view = null;
  try { view = JSON.parse(read(sessionStorage, VIEW_KEY) || "null"); } catch (e) {}
  if (!view || typeof view !== "object") view = null;

  const hash = location.hash.replace(/^#/, "");
  const type = navType();

  let kind = "first";
  if (view && (type === "back_forward" || type === "reload")) kind = "restore";
  else if (SECTIONS.indexOf(hash) !== -1) kind = "deeplink";
  else if (window.XP && XP.known) kind = "returning";

  const sector = "void";

  if (kind !== "first") document.documentElement.classList.add("gate-done");

  return { kind, sector, view };
})();
