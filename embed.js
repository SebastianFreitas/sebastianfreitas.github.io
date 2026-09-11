/* Click-to-load itch.io Unity embeds. src stays off the iframe
   until someone asks to play, so the WebGL build is not fetched
   on every case-study visit. */
(function () {
  document.querySelectorAll(".embed-shell[data-src]").forEach(function (shell) {
    const btn = shell.querySelector(".embed-play");
    if (!btn) return;
    btn.addEventListener("click", function () {
      const iframe = document.createElement("iframe");
      iframe.src = shell.getAttribute("data-src");
      iframe.title = shell.getAttribute("data-title") || "Play in your browser";
      iframe.allowFullscreen = true;
      shell.innerHTML = "";
      shell.appendChild(iframe);
      shell.removeAttribute("data-src");
    });
  });
})();
