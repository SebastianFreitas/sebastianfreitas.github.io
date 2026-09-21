/* ===========================================================
   DEPTHS — nodes that only exist once their prerequisites are
   claimed.

   Pure data, no DOM/canvas/listeners. Each entry describes a
   sector node that stays hidden until every id in `after` has
   been claimed, at which point bridge.js is free to spawn it
   the same way it spawns any other beacon node. `camKey` is
   resolved by bridge.js against its own GD_LAND table — it is
   not looked up here. The shape is deliberately generic (no
   sector-zero-specific fields) so other sectors can reuse this
   module for their own gated nodes.

     Depths.nodes()  -> array of node defs (a copy, not the
                        module's own array)
   =========================================================== */

window.Depths = (function () {

  // preload="none" and no autoplay: bridge.js runs a rAF loop
  // every frame and must not pay for video decode it never asked for.

  const NODES = [
    {
      id: "bnote-sz-shell",
      after: ["bnote-planet-zero"],
      camKey: "zero",
      off: -0.20,
      oy: 0.54,
      par: 0.7,
      theme: "zeroDeep",
      size: 0.72,
      xp: 1,
      name: "The Shell",
      sub: "A parser, not a prop",
      html: `
        <p class="tag">Signal · sector zero / shell</p>
        <h3>The Shell</h3>
        <figure class="clipbox">
          <video class="clip" src="media/sector-zero/login.mp4" poster="media/sector-zero/login.jpg" muted loop playsinline preload="none" controls></video>
          <figcaption>Credentials come off a note in the room. Tab completion, command history, and a real error on a bad path — the shell is a parser, not a prop.</figcaption>
        </figure>
        <p class="sub">A real shell, not a menu in disguise</p>
        <p class="body">RealityTXT runs <code>ls</code>, <code>cd</code>, <code>cat</code>, <code>create</code>, <code>edit</code>, <code>rm</code> and <code>mail</code> over a virtual filesystem. Anyone who has used a terminal already knows how to play. And because every mechanic is a text operation, a new feature costs a command instead of a UI.</p>
        <p class="sub">The terminal talks back</p>
        <p class="body">A mail client runs inside the shell. Messages arrive, you <code>read</code> them, and <code>reply</code> gives you numbered options — never one correct answer. It's the cheapest narrative surface in the game: a coworker who might still be alive, the company that sent you, or something that shouldn't have access to the inbox. It doubles as the hint system.</p>
      `
    },
    {
      id: "bnote-sz-chair",
      after: ["bnote-planet-zero"],
      camKey: "zero",
      off: 0.08,
      oy: 0.54,
      par: 0.7,
      theme: "zeroDeep",
      size: 0.72,
      xp: 1,
      name: "The Chair",
      sub: "The whole game, completable seated",
      html: `
        <p class="tag">Signal · sector zero / movement</p>
        <h3>The Chair</h3>
        <p class="sub">Movement</p>
        <p class="body">You can walk, or you can sit in the office chair and drive. Seated, locomotion switches to tank controls: you push off the floor in short impulses and steer directly. Rotation speed is dynamic — fast when you commit, precise at low speed — and hitting a wall makes you skid and bounce instead of stopping dead. The entire game can be completed from the chair.</p>
        <figure class="clipbox">
          <video class="clip" src="media/sector-zero/chairUseFinal.mp4" poster="media/sector-zero/chairUseFinal.jpg" muted loop playsinline preload="none" controls></video>
          <figcaption>Leg impulses for thrust, tank controls, wall bounce.</figcaption>
        </figure>
      `
    },
    {
      id: "bnote-sz-storm",
      after: ["bnote-sz-shell", "bnote-sz-chair"],
      camKey: "zero",
      off: -0.30,
      oy: 0.28,
      par: 0.7,
      theme: "zeroDeep",
      size: 0.66,
      xp: 1,
      name: "The Storm",
      sub: "Gravity fails on a curve",
      html: `
        <p class="tag">Signal · sector zero / storm</p>
        <h3>The Storm</h3>
        <p class="sub">The storm</p>
        <p class="body">Every so often the room loses its grip. Gravity stops applying to a set of objects, each one takes a push, and what you were looking at a second ago is above you. Severity rolls on a curve — mild storms common, violent ones rare.</p>
        <p class="body">When it passes they drift back toward where they started, and don't quite make it. The lights cut, and in the dark everything is teleported the rest of the way home. The drift is what you see; the blackout hides the snap. Reality holds together only because you weren't looking.</p>
        <p class="body">One object is singled out each storm as a target. That's where the creature hooks in.</p>
      `
    },
    {
      id: "bnote-sz-catalogue",
      after: ["bnote-sz-shell", "bnote-sz-chair"],
      camKey: "zero",
      off: -0.16,
      oy: 0.23,
      par: 0.7,
      theme: "zeroDeep",
      size: 0.66,
      xp: 1,
      name: "The Catalogue",
      sub: "Attention is the currency",
      html: `
        <p class="tag">Signal · sector zero / catalogue</p>
        <h3>The Catalogue</h3>
        <p class="sub">Cataloguing is the counter-mechanic</p>
        <p class="body">Register an object and the storm can't touch it. The room starts unstable and goes solid one object at a time, at exactly the rate you're willing to pay attention. Nothing announces it — you notice because the corner you documented first is the corner that stopped moving.</p>
        <p class="body">Registering also makes an object <em>usable</em>. Gadgets — a bucket that shelters whatever you drop in it, scissors that work as a weapon but freeze in place after a hit — arrive with deliberately bad numbers. Fixing them, or breaking them further on purpose, is where the economy gets spent.</p>
        <p class="sub">The economy</p>
        <p class="body">Editing reality costs what you earn by looking at it.</p>
        <ul class="pts">
          <li>Registering an object earns <strong>1 point</strong>.</li>
          <li>Editing costs one point per character changed. Overspend and the file reverts.</li>
          <li>The balance lives inside the file you're editing.</li>
        </ul>
        <p class="body">Character count is what makes this a design problem instead of a cheat menu. <code>1</code> to <code>9</code> is one character. An absurd weight costs real budget.</p>
        <figure class="clipbox">
          <video class="clip" src="media/sector-zero/createEntryFinal.mp4" poster="media/sector-zero/createEntryFinal.jpg" muted loop playsinline preload="none" controls></video>
          <figcaption>Creating an object after discovering it. Everything has size and weight; rarer objects carry extra attributes you can read and rewrite.</figcaption>
        </figure>
      `
    },
    {
      id: "bnote-sz-brian",
      after: ["bnote-sz-shell", "bnote-sz-chair"],
      camKey: "zero",
      off: 0.04,
      oy: 0.23,
      par: 0.7,
      theme: "zeroDeep",
      size: 0.66,
      xp: 1,
      name: "Brian",
      sub: "The player has a file too",
      html: `
        <p class="tag">Signal · sector zero / brian</p>
        <h3>Brian</h3>
        <p class="sub">Brian is an object</p>
        <p class="body">The player has a file too. Height rescales the character capsule, so a shelf out of reach isn't any more. Weight drives speed and gravity on a curve: near zero and you move 2.5× faster in near-freefall; past 120 and you crawl under 4× gravity.</p>
        <p class="body">Set the weight <strong>negative</strong> and gravity inverts. Brian falls upward. One character in a text file, and the ceiling becomes the floor.</p>
        <figure class="clipbox">
          <video class="clip" src="media/sector-zero/editplayerFinal.mp4" poster="media/sector-zero/editplayerFinal.jpg" muted loop playsinline preload="none" controls></video>
          <figcaption>Editing the player's own record. A spatial problem becomes a text problem.</figcaption>
        </figure>
      `
    },
    {
      id: "bnote-sz-residue",
      after: ["bnote-sz-shell", "bnote-sz-chair"],
      camKey: "zero",
      off: 0.18,
      oy: 0.28,
      par: 0.7,
      theme: "zeroDeep",
      size: 0.66,
      xp: 1,
      name: "Residue",
      sub: "Found, not told",
      html: `
        <p class="tag">Signal · sector zero / residue</p>
        <h3>Residue</h3>
        <p class="sub">Found, not told</p>
        <p class="body">Objects carry an ID and, sometimes, one line from whoever used them last — a complaint about a blank disc, someone else's cold pizza. Nothing narrates who left them.</p>
        <figure class="clipbox">
          <video class="clip" src="media/sector-zero/checkItemsFinal.mp4" poster="media/sector-zero/checkItemsFinal.jpg" muted loop playsinline preload="none" controls></video>
          <figcaption>Inspecting objects. Character comes out of the details, in whatever order the player finds them.</figcaption>
        </figure>
        <p class="sub">Where it goes</p>
        <p class="body">Everything above runs. The expensive part is already paid for: once the world is a filesystem and reality reads from it, a new mechanic is a new field in a text file. More gadgets, rarer storm events, a character writing to your inbox — each one slots into what already exists.</p>
      `
    },
  ];

  return { nodes: () => NODES.slice() };
})();
