/* Click-to-load itch.io Unity embeds. src stays off the iframe
   until someone asks to play, so the WebGL build is not fetched
   on every visit. Delegated, so shells injected later (bridge
   depth nodes) work too; Embed.reset() puts a shell back. */
(function () {
  document.addEventListener("click", function (e) {
    const btn = e.target.closest && e.target.closest(".embed-play");
    if (!btn) return;
    const shell = btn.closest(".embed-shell[data-src]");
    if (!shell) return;
    shell._restore = shell.innerHTML;
    shell._src = shell.getAttribute("data-src");
    const iframe = document.createElement("iframe");
    iframe.src = shell._src;
    iframe.title = shell.getAttribute("data-title") || "Play in your browser";
    iframe.allowFullscreen = true;
    shell.innerHTML = "";
    shell.appendChild(iframe);
    shell.removeAttribute("data-src");
  });
  function reset(root) {
    (root || document).querySelectorAll(".embed-shell").forEach(function (shell) {
      if (shell._src == null) return;
      shell.innerHTML = shell._restore;
      shell.setAttribute("data-src", shell._src);
      shell._src = null; shell._restore = null;
    });
  }
  window.Embed = { reset: reset };
})();
