/* js/depths/heavylight.js — heavylight cluster; registered into Depths in load order */
(function () {
  window.Depths.add({
    root: "bnote-planet-heavylight",
    theme: "heavylightDeep",
    size: 0.62,
    // Ten notes in six waves. The planet sits at off -0.04 / oy 0.42,
    // lower than Sector Zero's, so rings 1, 2 and 4 sit above it and
    // 3, 5 and 6 hang below; every node stays inside off ±0.44 /
    // 0.16 ≤ oy ≤ 0.66 and at least 0.06 from its neighbours.
    layout: {
      shape: "arc",
      squash: 1.0,
      rings: [
        { r: 0.15, from: -90, to: -90 },
        { r: 0.24, from: -35, to: -145 },
        { r: 0.18, from: 50, to: 130 },
        { r: 0.32, from: -15, to: -165 },
        { r: 0.28, from: 20, to: 160 },
        { r: 0.12, from: 90, to: 90 }
      ]
    },
    nodes: [
      {
        id: "bnote-hl-play",
        after: ["bnote-planet-heavylight"],
        xp: 1,
        wide: true,
        name: "Play HeavyLight",
        sub: "Shipped for WebGL",
        html: `
        <p class="tag">Signal · heavylight / play</p>
        <h3>Play HeavyLight</h3>
        <div class="embed embed-shell" data-src="https://itch.io/embed-upload/6434502?color=002f4b" data-title="Play HeavyLight in your browser" style="background-image:url('media/heavylight/heavylightFrontPage.webp')">
          <button type="button" class="embed-play">Play HeavyLight</button>
        </div>
        <p class="body">Playable here. Also on <a href="https://sebastianfreitas.itch.io/heavylight">itch.io</a>.</p>
        <p class="body">Click the frame to hand it the keyboard. Flying off closes the game.</p>
      `
      },
      {
        id: "bnote-hl-brief",
        after: ["bnote-hl-play"],
        xp: 1,
        name: "The Brief",
        sub: "Four weeks, one rule",
        html: `
        <p class="tag">Signal · heavylight / brief</p>
        <h3>The Brief</h3>
        <p class="body">A challenge I set myself: make a game fast, under tight constraints, and keep it simple. One mechanic, some physics, and a lot of level design.</p>
        <p class="body">Nothing to a finished web build in under four weeks.</p>
      `
      },
      {
        id: "bnote-hl-rule",
        after: ["bnote-hl-play"],
        xp: 1,
        name: "The Rule",
        sub: "Light has weight",
        html: `
        <p class="tag">Signal · heavylight / rule</p>
        <h3>The Rule</h3>
        <p class="body">A lamp's beam is a physical force. Stand in a sideways beam and it carries you. Stand under a lamp aimed up and it lifts you. Step out and you stop dead.</p>
        <p class="body">Every puzzle in the game is a consequence of that one rule.</p>
      `
      },
      {
        id: "bnote-hl-lamps",
        after: ["bnote-hl-brief", "bnote-hl-rule"],
        xp: 1,
        name: "Lamps",
        sub: "Timers and blink cycles",
        html: `
        <p class="tag">Signal · heavylight / lamps</p>
        <h3>Lamps</h3>
        <p class="body">Most lamps start off. Press E and the beam comes on for a few seconds, then clicks off on its own. Some blink on a cycle and cannot be touched.</p>
        <p class="body">Timers and blink cycles are the whole difficulty curve. The same lamp is a lift in one level and a trap in the next.</p>
        <figure class="clipbox">
          <video class="clip" src="media/heavylight/lamps.mp4" poster="media/heavylight/lamps.jpg" muted loop playsinline preload="none" controls></video>
          <figcaption>Lamps at work. The upward beams lift the player to the crate's ledge, then a sideways beam carries the crate across the room and sets it down on the far ledge, right under the key.</figcaption>
        </figure>
      `
      },
      {
        id: "bnote-hl-crates",
        after: ["bnote-hl-brief", "bnote-hl-rule"],
        xp: 1,
        name: "Crates",
        sub: "The beam is their new down",
        html: `
        <p class="tag">Signal · heavylight / crates</p>
        <h3>Crates</h3>
        <p class="body">A crate treats the beam as its new down. Point a lamp sideways and the crate falls sideways. Point it up and the crate climbs. Switch it off and it drops back to the floor.</p>
        <p class="body">Restart with R and every crate goes home.</p>
      `
      },
      {
        id: "bnote-hl-levels",
        after: ["bnote-hl-lamps", "bnote-hl-crates"],
        xp: 1,
        name: "One New Thing",
        sub: "Twenty levels, no repeats",
        html: `
        <p class="tag">Signal · heavylight / levels</p>
        <h3>One New Thing</h3>
        <p class="body">Twenty levels, and every one adds something the last did not have. Walking and jumping first, then the first lamp, then timers, crates, spikes, and beams that push down.</p>
        <p class="body">Nothing is introduced twice. The level design took most of the four weeks.</p>
      `
      },
      {
        id: "bnote-hl-journal",
        after: ["bnote-hl-lamps", "bnote-hl-crates"],
        xp: 1,
        name: "The Journal",
        sub: "ESC, half or full",
        html: `
        <p class="tag">Signal · heavylight / journal</p>
        <h3>The Journal</h3>
        <p class="body">ESC opens the journal: pause menu and level select in one. Every level shows a mark, reached, passed, or fully completed. Fully completed means you found every clue in it.</p>
        <p class="body">Any level can be replayed from here.</p>
        <figure class="clipbox">
          <img class="clip" src="media/heavylight/journal.webp" alt="The journal: twenty numbered level buttons in two rows, some with a full red frame, most with a half frame, two dark" width="941" height="704" loading="lazy">
          <figcaption>The journal. A full red frame is a level with every clue found, a half frame is passed, plain is reached, dark is not yet.</figcaption>
        </figure>
      `
      },
      {
        id: "bnote-hl-clues",
        after: ["bnote-hl-levels", "bnote-hl-journal"],
        xp: 1,
        name: "The Clues",
        sub: "Optional story, secret ending",
        html: `
        <p class="tag">Signal · heavylight / clues</p>
        <h3>The Clues</h3>
        <p class="body">Glowing wisps sit around each level. Touch one and it bursts into a thought from the man in red, an investigator sent to an old town on a case everyone called normal. The red wisps speak in a different voice.</p>
        <p class="body">Find every clue in every level and the ending changes. Three secret levels open, and the thing behind the barred door makes an offer. Leave, fight, or sign.</p>
      `
      },
      {
        id: "bnote-hl-hood",
        after: ["bnote-hl-levels", "bnote-hl-journal"],
        xp: 1,
        name: "Under the Hood",
        sub: "Template rebuilt where it mattered",
        html: `
        <p class="tag">Signal · heavylight / hood</p>
        <h3>Under the Hood</h3>
        <p class="body">Unity's 2D platformer template, rebuilt where it mattered. Coyote time, a jump buffer, a variable height jump, an input curve of my own. The beam push, crate gravity, lamp timers, clues and journal are all mine.</p>
        <p class="body">The WebGL build checks which site it runs on. A copy uploaded elsewhere sends you to a gif and quits.</p>
      `
      },
      {
        id: "bnote-hl-reuse",
        after: ["bnote-hl-clues", "bnote-hl-hood"],
        xp: 1,
        name: "Built to Be Reused",
        sub: "The base Conclusus stands on",
        html: `
        <p class="tag">Signal · heavylight / reuse</p>
        <h3>Built to Be Reused</h3>
        <p class="body">I wrote it as a base rather than a one-off. <a href="projects/conclusus.html">Conclusus</a> reused it for 30 levels and four new mechanics and took less time to build than the original. That was the actual test of whether the base was any good.</p>
        <p class="sub">What it taught me</p>
        <p class="body">The camera was the one system I left to the engine's stock tools, and it fought me the whole way. Since then, anything that has to feel right I write myself.</p>
        <p class="body"><a href="projects/heavylight.html">Open the full case →</a></p>
      `
      }
    ]
  });
})();
