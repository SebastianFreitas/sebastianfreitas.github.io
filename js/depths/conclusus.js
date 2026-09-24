/* js/depths/conclusus.js — conclusus cluster; registered into Depths in load order */
(function () {
  window.Depths.add({
    root: "bnote-planet-conclusus",
    theme: "conclususDeep",
    size: 0.66,
    // Ten notes in six waves. The planet sits at off 0.06 / oy 0.30,
    // higher than HeavyLight's, so most rings hang below it: 1, 2, 4
    // and 5 below, 3 and 6 above. Every node stays inside off ±0.44 /
    // 0.16 ≤ oy ≤ 0.66 and at least 0.06 from its neighbours.
    layout: {
      shape: "arc",
      squash: 1.0,
      rings: [
        { r: 0.14, from: 90, to: 90 },
        { r: 0.22, from: 40, to: 140 },
        { r: 0.13, from: -30, to: -150 },
        { r: 0.32, from: 25, to: 155 },
        { r: 0.32, from: 60, to: 120 },
        { r: 0.10, from: -90, to: -90 }
      ]
    },
    nodes: [
      {
        id: "bnote-cc-play",
        after: ["bnote-planet-conclusus"],
        xp: 1,
        wide: true,
        name: "Play Conclusus",
        sub: "Thirty levels, in the browser",
        html: `
        <p class="tag">Signal · conclusus / play</p>
        <h3>Play Conclusus</h3>
        <div class="embed embed-shell" data-src="https://itch.io/embed-upload/14396412?color=141a1d" data-title="Play Conclusus in your browser" style="background-image:url('media/conclusus/conclususFrontPage.webp')">
          <button type="button" class="embed-play">Play Conclusus</button>
        </div>
        <p class="body">Playable here. Also on <a href="https://sebastianfreitas.itch.io/conlusus">itch.io</a>.</p>
        <p class="body">Click the frame to hand it the keyboard. Flying off closes the game.</p>
      `
      },
      {
        id: "bnote-cc-brief",
        after: ["bnote-cc-play"],
        xp: 1,
        name: "The Brief",
        sub: "Several mechanics, back to basics",
        html: `
        <p class="tag">Signal · conclusus / brief</p>
        <h3>The Brief</h3>
        <p class="body">HeavyLight ran on one rule, so its levels had to do all the work. For Conclusus I went the other way: a handful of familiar mechanics, so the levels could combine them instead of carrying the game alone.</p>
        <p class="body">Built on the <a href="projects/heavylight.html">HeavyLight</a> base. Thirty levels, finished in less time than the original. The saved time went into feel and colour.</p>
      `
      },
      {
        id: "bnote-cc-controls",
        after: ["bnote-cc-play"],
        xp: 1,
        name: "The Controls",
        sub: "Precision, not puzzles",
        html: `
        <p class="tag">Signal · conclusus / controls</p>
        <h3>The Controls</h3>
        <p class="body">Conclusus is a precision game. The controller has coyote time and a jump buffer, both 0.15 seconds, a fast rise to the apex, and you stop the moment you let go of the key.</p>
        <p class="body">One touch of a spike kills, and you are back at the start in about a second. Short levels, quick retries.</p>
      `
      },
      {
        id: "bnote-cc-key",
        after: ["bnote-cc-brief", "bnote-cc-controls"],
        xp: 1,
        name: "Key and Door",
        sub: "Touch the symbol, open the door",
        html: `
        <p class="tag">Signal · conclusus / key</p>
        <h3>Key and Door</h3>
        <p class="body">Every level has a door and a spinning symbol. Touch the symbol and it flies to the door. In ten levels it comes in three pieces, gathered in order, each with its own note.</p>
        <p class="body">Twenty levels add a rule: every platform must be lit at the same time. Stepping on one lights it for about five seconds, so the route is a race against the first platform going dark.</p>
        <figure class="clipbox todo"><figcaption>Clip to come: lighting every platform in a level, then the door opening on the last one.</figcaption></figure>
      `
      },
      {
        id: "bnote-cc-pins",
        after: ["bnote-cc-brief", "bnote-cc-controls"],
        xp: 1,
        name: "Pins",
        sub: "Launch, then float",
        html: `
        <p class="tag">Signal · conclusus / pins</p>
        <h3>Pins</h3>
        <p class="body">Eighty eight pins across the game. Touch one and it fires you the way it points, then holds your fall speed near zero for a second so you hang in the air long enough to steer.</p>
        <p class="body">Chains of pins make the flying sections. The float window is what makes them readable.</p>
      `
      },
      {
        id: "bnote-cc-shadow",
        after: ["bnote-cc-key", "bnote-cc-pins"],
        xp: 1,
        name: "The Shadow",
        sub: "Plant it, jump back to it",
        html: `
        <p class="tag">Signal · conclusus / shadow</p>
        <h3>The Shadow</h3>
        <p class="body">Press S on the ground and a grass green copy of you stays behind. Press S again from anywhere and you are back in it, keeping your speed and direction.</p>
        <p class="body">One shadow at a time. A gap you cannot clear becomes a gap you cross in two moves. Unlocked by a pickup in level 7.</p>
        <figure class="clipbox todo"><figcaption>Clip to come: planting the shadow, crossing a gap with a pin, then teleporting back.</figcaption></figure>
      `
      },
      {
        id: "bnote-cc-twins",
        after: ["bnote-cc-key", "bnote-cc-pins"],
        xp: 1,
        name: "The Silhouettes",
        sub: "Green is safe, silver kills",
        html: `
        <p class="tag">Signal · conclusus / twins</p>
        <h3>The Silhouettes</h3>
        <p class="body">The late levels are full of figures shaped like your shadow. Every 1.2 seconds they all switch together. Green is safe and teleports you into it. Silver kills on touch.</p>
        <p class="body">Forty of them across level 16 and levels 25 to 30. The timing is fixed, so every route can be learned.</p>
        <figure class="clipbox todo"><figcaption>Clip to come: a corridor of silhouettes switching from green to silver as the player threads through.</figcaption></figure>
      `
      },
      {
        id: "bnote-cc-levels",
        after: ["bnote-cc-shadow", "bnote-cc-twins"],
        xp: 1,
        name: "Thirty Levels",
        sub: "Three chapters, two unlocks",
        html: `
        <p class="tag">Signal · conclusus / levels</p>
        <h3>Thirty Levels</h3>
        <p class="body">Thirty levels in three chapters. Walking and jumping first, then pins, the shadow at level 7, then a double jump and the first silhouettes at level 16.</p>
        <p class="body">Progress is one saved number. A level select with thirty buttons opens them in order. No optional content: that time went into the mechanics.</p>
        <figure class="clipbox todo"><figcaption>Image to come: the level select with all thirty buttons.</figcaption></figure>
      `
      },
      {
        id: "bnote-cc-polish",
        after: ["bnote-cc-shadow", "bnote-cc-twins"],
        xp: 1,
        name: "The Polish",
        sub: "Colour, rain, bloom",
        html: `
        <p class="tag">Signal · conclusus / polish</p>
        <h3>The Polish</h3>
        <p class="body">Every platform picks one of nine sprites. The symbol wobbles on random timings. Spike balls spin and bob, each at its own height. Rain falls through every level and doubles when you finish one.</p>
        <p class="body">Touch the door and the bloom flares from 1.5 to 50 in half a second while the level fades out. One palette file for the whole game. Music by George Tantchev.</p>
      `
      },
      {
        id: "bnote-cc-reuse",
        after: ["bnote-cc-levels", "bnote-cc-polish"],
        xp: 1,
        name: "Built on HeavyLight",
        sub: "The base did its job",
        html: `
        <p class="tag">Signal · conclusus / reuse</p>
        <h3>Built on HeavyLight</h3>
        <p class="body">The character controller carried over untouched. Every mechanic has its own Reset, and all thirty levels live in one scene, switched on and off, so new mechanics never broke a level change.</p>
        <p class="sub">What it taught me</p>
        <p class="body">The shadow was found during production, not before it. Now I prototype the core mechanic first and build the levels around it.</p>
        <p class="body"><a href="projects/conclusus.html">Open the full case →</a></p>
      `
      }
    ]
  });
})();
