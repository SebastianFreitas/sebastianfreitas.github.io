/* js/depths/gamedev.js — the four games the Game Dev beacon reveals; registered into Depths in load order */
(function () {
  const card = (key, title, clip, line) => `
        <p class="tag">Case file</p>
        <h3>${title}</h3>
        <video class="bclip" src="media/${key}/${clip}" muted loop autoplay playsinline preload="metadata"></video>
        <p class="body">${line}</p>
        <button class="open-case" data-case="${key}">Open case file</button>
      `;

  window.Depths.add({
    root: "bnote-gamedev",
    theme: "void",
    size: 0.6,
    // one row: the outer pair sit low, the inner pair ride higher
    layout: { shape: "rows", rows: [{ dx: 0, spread: 0.64, dy: -0.16, arch: 0.32 }] },
    nodes: [
      {
        id: "gd-sector-zero",
        art: "sector-zero",
        after: ["bnote-gamedev"],
        name: "Sector Zero",
        sub: "A login that opens a whole world",
        html: card("sector-zero", "Sector Zero", "login.mp4", "A sign-in that opens onto a living world, built and run end to end.")
      },
      {
        id: "gd-voidscape",
        art: "voidscape",
        after: ["bnote-gamedev"],
        name: "VoidScape",
        sub: "Boons earned in the dark",
        html: card("voidscape", "VoidScape", "boons.mp4", "A game of boons and consequence, where every choice changes the run.")
      },
      {
        id: "gd-conclusus",
        art: "conclusus",
        after: ["bnote-gamedev"],
        name: "Conclusus",
        sub: "Pins on a board that fights back",
        html: card("conclusus", "Conclusus", "pins.mp4", "A puzzle of pins and pieces, tuned until it plays clean.")
      },
      {
        id: "gd-heavylight",
        art: "heavylight",
        after: ["bnote-gamedev"],
        name: "HeavyLight",
        sub: "Lamps that carry the level",
        html: card("heavylight", "HeavyLight", "lamps.mp4", "Light you can carry, and a level that is built around it.")
      }
    ]
  });
})();
