/* js/depths/zero.js — sector zero cluster; registered into Depths in load order */
(function () {
  window.Depths.add({
    root: "bnote-planet-zero",
    theme: "zeroDeep",
    size: 0.72,
    // Ten notes in six waves, alternating below and above the planet so
    // every node stays inside off ±0.44 / 0.16 ≤ oy ≤ 0.66 and at least
    // 0.06 from its neighbours (see nav-flows bounds check). The planet is
    // at off -0.06 / oy 0.34; rings 1, 2, 4 hang below it, 3, 5, 6 sit
    // above. The storm debris beside the planet is painted before the
    // marks and never hit-tests, so nodes may cross it.
    layout: {
      shape: "arc",
      squash: 1.2,
      rings: [
        { r: 0.17, from: 90, to: 90 },
        { r: 0.26, from: 35, to: 145 },
        { r: 0.18, from: -50, to: -130 },
        { r: 0.34, from: 15, to: 165 },
        { r: 0.30, from: -20, to: -160 },
        { r: 0.14, from: -90, to: -90 }
      ]
    },
    nodes: [
      {
        id: "bnote-sz-room",
        after: ["bnote-planet-zero"],
        xp: 1,
        name: "One Room",
        sub: "Small on purpose",
        html: `
        <p class="tag">Signal · sector zero / room</p>
        <h3>One Room</h3>
        <p class="sub">Everything happens here</p>
        <p class="body">Sector Zero is a first-person horror game set in a single room. That limit is the design. A big map spreads the budget thin. One room lets every object get the time it needs, so nothing in it is a generic interact prompt.</p>
        <p class="sub">The chair is the proof</p>
        <p class="body">The office chair was built until it felt real, and once it did, a chair became something to play with. That is the bar for everything in the room. Even objects that will never matter carry a line of lore, so a dull object still holds weight for anyone who reads.</p>
      `
      },
      {
        id: "bnote-sz-quiet",
        after: ["bnote-sz-room"],
        xp: 1,
        name: "Say Nothing",
        sub: "A sandbox, not a script",
        html: `
        <p class="tag">Signal · sector zero / quiet</p>
        <h3>Say Nothing</h3>
        <figure class="clipbox">
          <video class="clip" src="media/sector-zero/checkItemsFinal.mp4" poster="media/sector-zero/checkItemsFinal.jpg" muted loop playsinline preload="none" controls></video>
          <figcaption>Every object has a three-character ID and a note left by whoever handled it last. Read it, or do not.</figcaption>
        </figure>
        <p class="sub">Found, not told</p>
        <p class="body">The game explains almost nothing. Objects carry IDs and notes from the people who had them before you. You read, you try things, you draw your own conclusions. Most problems have more than one answer, and the game never waits for you to find the one it wanted.</p>
        <p class="sub">Do not expect the obvious</p>
        <p class="body">Scissors are sharp, and used as a weapon they cut. But nothing here has to be what it looks like. A floppy disk could be a teleporter. Once you learn that, the most ordinary object in the room is worth a second look.</p>
      `
      },
      {
        id: "bnote-sz-storm",
        after: ["bnote-sz-room"],
        xp: 1,
        name: "The Storm",
        sub: "Register it or lose it",
        html: `
        <p class="tag">Signal · sector zero / storm</p>
        <h3>The Storm</h3>
        <p class="sub">Chaos on a timer</p>
        <p class="body">The room starts broken. Thunder rolls a strength, and every loose object rolls against it. The ones that lose drop their gravity and drift. Seconds later the screen blinks black and they snap home. One caught object comes back changed. Strong thunder means the next one comes sooner.</p>
        <p class="sub">The loop</p>
        <p class="body">Your job is to register things before the storm takes them. A registered object is stable, readable and usable. Session by session the room gets calmer and starts to make sense. That is the whole arc: chaos first, then an order you built yourself.</p>
      `
      },
      {
        id: "bnote-sz-shell",
        after: ["bnote-sz-quiet", "bnote-sz-storm"],
        xp: 1,
        name: "The Shell",
        sub: "A parser, not a prop",
        html: `
        <p class="tag">Signal · sector zero / shell</p>
        <h3>The Shell</h3>
        <figure class="clipbox">
          <video class="clip" src="media/sector-zero/login.mp4" poster="media/sector-zero/login.jpg" muted loop playsinline preload="none" controls></video>
          <figcaption>Credentials come off a note in the room. Tab completion, command history, and a real error on a bad path.</figcaption>
        </figure>
        <p class="sub">A real terminal</p>
        <p class="body">RealityTXT is a working shell over a virtual filesystem: <code>ls</code>, <code>cd</code>, <code>cat</code>, <code>create</code>, <code>edit</code>, <code>rm</code>, <code>mail</code>. Your login is a line in a file, so editing the file changes your password. <code>help</code> does not list every command. Anyone who has used a terminal already knows how to play.</p>
        <p class="sub">Friction, then less of it</p>
        <p class="body">Typing is slow, and early on that is the point. It makes the room feel like a workplace, not a menu. But typing gets tedious, so the terminal is kept for the moments that need it, and later tools will register objects for you. The friction is meant to fade.</p>
      `
      },
      {
        id: "bnote-sz-register",
        after: ["bnote-sz-quiet", "bnote-sz-storm"],
        xp: 1,
        name: "The Register",
        sub: "A file is the object",
        html: `
        <p class="tag">Signal · sector zero / register</p>
        <h3>The Register</h3>
        <figure class="clipbox">
          <video class="clip" src="media/sector-zero/createEntryFinal.mp4" poster="media/sector-zero/createEntryFinal.jpg" muted loop playsinline preload="none" controls></video>
          <figcaption>Look at an object, read its ID, type create. The object is now a text file, and the text file is now the object.</figcaption>
        </figure>
        <p class="sub">create, then edit</p>
        <p class="body">Point at anything, read its three-character ID, and <code>create</code> writes it into the filesystem as a text file. Edit that file and the object follows: rename it, rewrite its note, change what it is. Every save spends from a budget, so attention is the currency.</p>
        <p class="sub">Gadgets come broken</p>
        <p class="body">The lantern's record reads Condition: Poor, and it plays the part. It flickers, dies, and wants a smack. Half the time you switch it on it holds steady for ten seconds, then goes back to being itself. A better lantern is one whose file says so.</p>
      `
      },
      {
        id: "bnote-sz-chair",
        after: ["bnote-sz-shell", "bnote-sz-register"],
        xp: 1,
        name: "The Chair",
        sub: "The whole game, completable seated",
        html: `
        <p class="tag">Signal · sector zero / chair</p>
        <h3>The Chair</h3>
        <figure class="clipbox">
          <video class="clip" src="media/sector-zero/chairUseFinal.mp4" poster="media/sector-zero/chairUseFinal.jpg" muted loop playsinline preload="none" controls></video>
          <figcaption>Kick, slide, spin, bounce. Tank controls on an office chair.</figcaption>
        </figure>
        <p class="sub">Kicks, not wheels</p>
        <p class="body">Sit and the chair turns to meet you, then eases you in over half a second. Forward is a kick in three beats: weak, strong, weak, then a pause. It keeps sliding, spins with real inertia, and bounces off walls with a little extra speed, so you can work the whole room without standing up.</p>
        <p class="sub">Why it matters</p>
        <p class="body">None of it was required. A chair could have been a static prop. It got a sit blend, a push rhythm and a wall bounce because in one room a chair is a tenth of the furniture. Polish is the content.</p>
      `
      },
      {
        id: "bnote-sz-brian",
        after: ["bnote-sz-shell", "bnote-sz-register"],
        xp: 1,
        name: "Brian",
        sub: "The player has a file too",
        html: `
        <p class="tag">Signal · sector zero / brian</p>
        <h3>Brian</h3>
        <figure class="clipbox">
          <video class="clip" src="media/sector-zero/editplayerFinal.mp4" poster="media/sector-zero/editplayerFinal.jpg" muted loop playsinline preload="none" controls></video>
          <figcaption>Weight, height, sex, age, password. Save the file and Brian changes.</figcaption>
        </figure>
        <p class="sub">A middle-aged man in a text file</p>
        <p class="body">Brian is heavy and out of shape, so he walks slowly and crouching is slow and uncomfortable. His worker record lists his weight and height. Weight drives speed, jump and gravity. Height rescales him. Past two and a half metres the file kills him.</p>
        <p class="sub">Mass, not fat</p>
        <p class="body">Find the medical records and you can rewrite him. Type a lower weight and he moves like a healthy man and fits where he could not before. Type a negative one and he falls onto the ceiling. The number is his mass, not his shape. What the file says, he is.</p>
      `
      },
      {
        id: "bnote-sz-dark",
        after: ["bnote-sz-chair", "bnote-sz-brian"],
        xp: 1,
        name: "The Dark",
        sub: "Something shares the room",
        html: `
        <p class="tag">Signal · sector zero / dark</p>
        <h3>The Dark</h3>
        <p class="sub">You know this room</p>
        <p class="body">The horror comes from familiarity. You never leave, so you learn where everything sits, and a mug that moved reads louder than a jump scare. Something shares the room. It is hard to see and never fully shown. Maybe it is one of the others. The game will not say.</p>
        <p class="sub">It gets easier</p>
        <p class="body">It throws things. It reaches the terminal and deletes or corrupts your work. No music tells you it is there. Hit it with something thrown and it goes still for a while, the only safe minutes you get. Later, better tools and traps push it back, maybe for good. Brian starts as a victim and ends as the master of the room.</p>
      `
      },
      {
        id: "bnote-sz-crew",
        after: ["bnote-sz-chair", "bnote-sz-brian"],
        xp: 1,
        name: "Obscura",
        sub: "The company is the villain",
        html: `
        <p class="tag">Signal · sector zero / crew</p>
        <h3>Obscura</h3>
        <p class="sub">Anomium</p>
        <p class="body">Obscura Dynamics hunts anomalies. Decades in, they found a property behind them that is not matter, light or sound, and named it Anomium. Touch it and things burn, change or vanish. Their answer was RealityTXT: a terminal where typing <code>static</code> on an object makes it hold, even against chaos.</p>
        <p class="sub">Four people in debt</p>
        <p class="body">When Sector Zero went silent, Obscura sent the people it could afford to lose. Brian, a teacher who lost his job to anxiety. Amy, his partner, a manager ruined by a corruption charge. Laura, a nurse after one bad night. Jason, a mechanic with gambling debts. The game opens with the four split up and Brian alone, with no memory. The creature is the threat. The company is the antagonist.</p>
      `
      },
      {
        id: "bnote-sz-stands",
        after: ["bnote-sz-dark", "bnote-sz-crew"],
        xp: 1,
        name: "Where It Stands",
        sub: "Built, next, and the page",
        html: `
        <p class="tag">Signal · sector zero / stands</p>
        <h3>Where It Stands</h3>
        <p class="sub">Built</p>
        <p class="body">The shell and its filesystem, the login off a file, the register and edit loop with its budget, the worker record with weight, height and inverted gravity, the storm cycle with the blackout snap, the chair, a screwdriver that charges and flies back, a lantern that lies about working.</p>
        <p class="sub">Next</p>
        <p class="body">The creature, the traps, the tools that register for you, the medical records. Sector Zero is a proof of concept on purpose: prove one room can carry a game, then fill it.</p>
        <p class="body"><a href="projects/sector-zero.html">Open project →</a></p>
      `
      }
    ]
  });
})();
