/* js/depths/voidscape.js — voidscape cluster; registered into Depths in load order */
(function () {
  window.Depths.add({
    root: "bnote-planet-voidscape",
    theme: "voidscapeDeep",
    size: 0.7,
    // Ten notes in six waves. Rings 4 to 6 sit below the first fan so every
    // node stays inside off ±0.44 / oy ≤ 0.66 and at least 0.06 from its
    // neighbours (see nav-flows bounds check); the bench and map nodes go
    // under the planet so the forge panels beside it stay clear.
    layout: {
      shape: "arc",
      squash: 1.2,
      rings: [
        { r: 0.18, from: 90, to: 90 },
        { r: 0.25, from: 40, to: 140 },
        { r: 0.33, from: 20, to: 160 },
        { r: 0.30, from: 110, to: 70 },
        { r: 0.416, from: 33, to: 147 },
        { r: 0.275, from: 90, to: 90 }
      ]
    },
    nodes: [
      {
        id: "bnote-vs-godrun",
        after: ["bnote-planet-voidscape"],
        name: "The God Run",
        sub: "The problem, and two answers",
        html: `
        <p class="tag">Signal · voidscape / god run</p>
        <h3>The God Run</h3>
        <p class="sub">The problem</p>
        <p class="body">Every roguelike I played had the same failure: the god run. The drops line up, damage goes exponential, and the boss you were supposed to fear dies in one shot. The run you waited ten hours for is the least interesting one you will play, because the game stopped asking anything of you at exactly the moment it should have asked the most.</p>
        <p class="body">Stat scaling causes it. If power is a number and enemies are a number, one eventually runs away from the other. Tuning does not fix that. It only moves where the break happens.</p>
        <p class="sub">Two answers</p>
        <p class="body">The classic answer is to let the player pick a harder difficulty, and VoidScape has that. The run itself is rolled on a board of missions, each with its own modifiers, and every modifier raises the payout. It is a good answer, but it is not a new one. Numbers against numbers still break eventually.</p>
        <p class="body">The new answer is the special run. Once a run is done you can attempt to go deeper, onto a path that scales on execution rather than on numbers: longer, more broken, more elites, a boss group waiting at the end. A build that trivialises the normal run still has to be played out there, and it is the only place skill points come from.</p>
      `
      },
      {
        id: "bnote-vs-board",
        after: ["bnote-vs-godrun"],
        name: "The Board",
        sub: "You write the difficulty",
        html: `
        <p class="tag">Signal · voidscape / board</p>
        <h3>The Board</h3>
        <figure class="clipbox">
          <video class="clip" src="media/voidscape/missions.mp4" poster="media/voidscape/missions.jpg" muted loop playsinline preload="none" controls></video>
          <figcaption>Choosing a run. Every modifier on a mission raises the payout.</figcaption>
        </figure>
        <p class="sub">Rolled, not authored</p>
        <p class="body">Before entering, you stand at a bank of monitors. Each one searches for a mission and shows what it found: a rolled set of modifiers and the payout they earn. Modifiers cut both ways. Some make things worse: more monster health, damage or action speed, halved healing, grenades disabled, slower movement, a whole damage type made immune. Some make things better: a higher weapon level, extra gun parts per kill, more boon rooms, every side room special.</p>
        <p class="body">Every modifier on the list, good or bad, raises elite chance, special room frequency and drop rate, with a random component on top so two equally loaded missions are not equally worth taking. You read the board, weigh it, and choose. A mission can be pushed further or the whole board rerolled, paid in gun parts, and the price climbs each time.</p>
        <p class="sub">The four that do not explain themselves</p>
        <p class="body"><code>Danger</code>, <code>ERROR</code>, <code>UnknownX</code> and <code>UnknownY</code> carry the lowest weights in the table. The only way to find out is to take one.</p>
        <p class="sub">The cap</p>
        <p class="body">How many modifiers a mission can carry is capped by the skill tree. A fresh save gets one. Deeper special runs raise the cap, so the biggest payouts sit behind the part of the game that tests you.</p>
      `
      },
      {
        id: "bnote-vs-deeper",
        after: ["bnote-vs-godrun"],
        name: "Going Deeper",
        sub: "The special run",
        html: `
        <p class="tag">Signal · voidscape / deeper</p>
        <h3>Going Deeper</h3>
        <figure class="clipbox">
          <video class="clip" src="media/voidscape/deeper.mp4" poster="media/voidscape/deeper.jpg" muted loop playsinline preload="none" controls></video>
          <figcaption>Attempting to go deeper. Special runs are the only source of skill points. 0:41.</figcaption>
        </figure>
        <p class="sub">Not a mission</p>
        <p class="body">The special run is a path built from bridge pieces out in the void, each one shifted and tilted at random, with a chance for any piece to be missing. Monsters wait on every other piece, turning elite as you near the end, and a boss group holds the last one. Every completed run makes the next one longer and harder, and each level of depth is worth one skill point.</p>
        <p class="sub">Skill points</p>
        <p class="body">They buy the only permanent upgrades in the game: max life, weapon drop level, boon drop chance, the chance to locate missions, and the cap on modifiers a mission can carry. The tree is small on purpose. Its job is to attach long-term progression to the part of the game that a lucky build cannot cheese.</p>
      `
      },
      {
        id: "bnote-vs-progress",
        after: ["bnote-vs-board", "bnote-vs-deeper"],
        name: "Two Progressions",
        sub: "What a run keeps",
        html: `
        <p class="tag">Signal · voidscape / progress</p>
        <h3>Two Progressions</h3>
        <figure class="clipbox">
          <img class="clip" src="media/voidscape/skilltree.webp" alt="The skill tree: five rows of plus and minus buttons for max life, chance to locate paths, item drop level, boon drop chance and maximum path mods" width="1600" height="978" loading="lazy">
          <figcaption>The skill tree. Five upgrades, paid only with special runs.</figcaption>
        </figure>
        <p class="sub">One run, or forever</p>
        <p class="body">Two kinds of progression run through a save, and they last different lengths of time. Boons last one run. They are by far the strongest modifiers in the game, and they are gone when you die. Weapons and the skill tree last forever. A gun you build stays in the inventory across runs, with its layouts saved, and skill points never expire. Those two are what make it a roguelike rather than a series of unrelated attempts.</p>
        <p class="sub">Built to need each other</p>
        <p class="body">Most boons are flat numbers, not multipliers: +50 physical damage, +10 fire, +1% freeze chance. A boon is only as good as the gun that scales it, and +10 fire damage is worth nothing on a gun that never sets anything alight. So the long game is keeping a spread of guns in the inventory, so that whatever a run rolls, there is a weapon that turns those boons into something.</p>
      `
      },
      {
        id: "bnote-vs-boons",
        after: ["bnote-vs-board", "bnote-vs-deeper"],
        name: "The Boons",
        sub: "Fifty-odd, and most of them cost something",
        html: `
        <p class="tag">Signal · voidscape / boons</p>
        <h3>The Boons</h3>
        <figure class="clipbox">
          <video class="clip" src="media/voidscape/boons.mp4" poster="media/voidscape/boons.jpg" muted loop playsinline preload="none" controls></video>
          <figcaption>A boon offer after a fight. Take it, turn it down for 10 health, or pay gun parts to reroll.</figcaption>
        </figure>
        <p class="sub">Trades</p>
        <p class="body">Boons are weighted by rarity and stack for the rest of the run. One you take or refuse leaves the pool, so a run never sees the same offer twice.</p>
        <p class="body">The flat upgrades exist, but the interesting half are trades. Lose 20 max health for +10 fire damage. Shrink your explosion radius by 90% to double its damage. Deal all your poison damage instantly, at half value. Halve your bullet speed for +50 physical.</p>
        <p class="sub">The ones that change the gun</p>
        <p class="body">Ricochet force doubles on every bounce. Ricochets home onto poisoned enemies. Every bounce spawns a cold shot. Enemies killed by cold burst into eight more. Fire bullets survive their own explosion, or explode a second time a moment later, or pull instead of push. One turns being launched by your own fire blast into a speed buff, which makes shooting the floor to travel a legitimate build. Elements are not separate lanes, so builds collide in ways I never wrote down.</p>
      `
      },
      {
        id: "bnote-vs-bench",
        after: ["bnote-vs-progress", "bnote-vs-boons"],
        name: "The Bench",
        sub: "Weapons are rolled, not designed",
        html: `
        <p class="tag">Signal · voidscape / bench</p>
        <h3>The Bench</h3>
        <figure class="clipbox">
          <img class="clip" src="media/voidscape/shop.webp" alt="Shop screen for a rolled machinegun: base stats and four rolled mods" width="1482" height="988" loading="lazy">
          <figcaption>A rolled machinegun in the shop. Base stats on the left, one rolled mod per row.</figcaption>
        </figure>
        <p class="sub">Generated, not designed</p>
        <p class="body">A gun rolls a base type, a level and a set of modifiers. There are four base types, basic, shotgun, machine gun and sniper, each with an elemental variant in physical, fire, cold and poison. The sniper round leaves at twice the speed of anything else and bounces ten times.</p>
        <p class="body">Modifiers come in three grades: interior for damage, exterior for handling, and special for the build-defining effects like ignite chance, freeze chance, double damage and bleeding. Each grade has a weight that drops by half when it lands and to nothing the second time, so a gun carries at most two of any grade and comes out mixed instead of stacking five of the same thing. Specials start at a hundredth of the weight of the others, which keeps them rare without a hard cap.</p>
        <figure class="clipbox">
          <video class="clip" src="media/voidscape/crafting.mp4" poster="media/voidscape/crafting.jpg" muted loop playsinline preload="none" controls></video>
          <figcaption>Adding, removing, and scrapping mods at the bench.</figcaption>
        </figure>
        <p class="sub">Crafting</p>
        <p class="body">Gun parts drop from enemies and pay for adding mods, removing them, or scrapping a weapon outright. Adding costs the weapon's level times its mod count, and the bench raises its price every time you use it, so pushing a good gun further costs progressively more. Scrapping refunds twice the base price of a mod, so a near miss is worth real money if you break it down instead.</p>
        <p class="body">Four weapon slots and eight saved layouts persist between runs. Building a gun is a decision with consequences past the session.</p>
      `
      },
      {
        id: "bnote-vs-map",
        after: ["bnote-vs-progress", "bnote-vs-boons"],
        name: "The Map",
        sub: "It only goes up",
        html: `
        <p class="tag">Signal · voidscape / map</p>
        <h3>The Map</h3>
        <figure class="clipbox">
          <img class="clip" src="media/voidscape/room.webp" alt="A generated room with catwalks and railings over a lower floor" width="1600" height="904" loading="lazy">
          <figcaption>One generated room. Catwalks and drops give the dashes somewhere to go.</figcaption>
        </figure>
        <p class="sub">Always up</p>
        <p class="body">Every step of a run climbs: a flight of stairs, a corridor, a room, joined doorway to doorway. A mission is ten to twenty main rooms plus whatever depth the modifiers add, and the last room is always the boss.</p>
        <p class="body">Because the path only ever goes up, the space around a new room is almost always empty, and that is what gives the generator its freedom. Tiles that were never designed to sit next to each other can be chained anyway, because nothing occupies the space they need. There is an overlap check, but it rarely has to say no, and when a layout fails ten times the whole level is thrown away and rolled again.</p>
        <p class="body">Spare doorways grow side rooms: encounters, specials, and a rotating set of shops and reward rooms, with a symbol on the door saying which.</p>
        <p class="sub">Finding your way</p>
        <p class="body">Generated rooms can all look the same, and getting lost was one of the first problems players hit. Two rules fix it. Up is always forward, so the next room is wherever the stairs are. And every room is lit white until you complete it, then its lights turn red. At a glance you know where you have been and where you have not.</p>
      `
      },
      {
        id: "bnote-vs-rooms",
        after: ["bnote-vs-bench", "bnote-vs-map"],
        name: "The Rooms",
        sub: "Every room has versions",
        html: `
        <p class="tag">Signal · voidscape / rooms</p>
        <h3>The Rooms</h3>
        <figure class="clipbox">
          <img class="clip" src="media/voidscape/enemy.webp" alt="Mid-fight in a generated corridor, a red enemy taking hits" width="1600" height="986" loading="lazy">
          <figcaption>Mid-fight in a generated corridor.</figcaption>
        </figure>
        <p class="sub">Versions</p>
        <p class="body">Every room carries optional pieces that each roll their own chance to exist, so the same room comes back different. The trapped versions matter most: laser beams that sweep the floor, spikes with a short warning, blast plates, lava that rises while you fight. In a game where movement is the best defence, a trap forces you to plan your movement instead of spending it, which makes an encounter genuinely hard without making a single enemy stronger. A few of those variants roll so rarely that finding them takes many runs.</p>
        <p class="sub">Things floating about</p>
        <p class="body">Rooms are also full of floating objects, drifting and spinning at random, and some of them matter. Canisters detonate when a bullet touches them and set off their neighbours. Medkits drift past the walkway. The point is rarity: something useful can turn up anywhere, so even an empty room with nothing to fight is worth a look.</p>
      `
      },
      {
        id: "bnote-vs-feel",
        after: ["bnote-vs-bench", "bnote-vs-map"],
        name: "The Feel",
        sub: "Movement, shooting, camera",
        html: `
        <p class="tag">Signal · voidscape / feel</p>
        <h3>The Feel</h3>
        <p class="sub">Movement</p>
        <p class="body">Movement is snappy and forgiving, and most of the work is in the small things. Coyote time and jump buffering, so inputs land when the player means them. Three separate ground checks, so a landing never gets missed. Gravity that triples past the apex of a jump, which makes it feel heavier without cutting its height. A side dash that cuts gravity and makes you invulnerable while it lasts, plus one air dash per landing. Input direction locks after a jump or dash until you press the opposite key, so momentum carries instead of letting you steer mid-air. Enemy hits and explosions apply real knockback through a mass-weighted impact vector.</p>
        <p class="sub">Shooting and the camera</p>
        <p class="body">Bullets are physics bodies that bounce. A sniper round leaves at 5000 units a second and ricochets ten times, and boons can double the bounce force on every hit. Keeping that stable when stats go extreme, so nothing falls apart or feels wrong at the top end, took longer than any other system in the game. Every enemy has a floor on how fast it can act, so speed modifiers push right up to the edge and no further.</p>
        <p class="body">The camera alone took weeks. Mouse look runs through framerate-independent exponential smoothing, so it feels the same at 60 and at 240 frames a second.</p>
      `
      },
      {
        id: "bnote-vs-ledger",
        after: ["bnote-vs-rooms", "bnote-vs-feel"],
        name: "The Ledger",
        sub: "What it cost, where it stands",
        html: `
        <p class="tag">Signal · voidscape / ledger</p>
        <h3>The Ledger</h3>
        <figure class="clipbox">
          <video class="clip" src="media/voidscape/run.mp4" poster="media/voidscape/run.jpg" muted loop playsinline preload="none" controls></video>
          <figcaption>One full run on a short mission, from the hub out and back. 1:43, uncut.</figcaption>
        </figure>
        <p class="sub">What it cost</p>
        <p class="body">Fifty interacting boons on top of rolled weapons and rolled missions means the combination space is not testable by hand. Most of the work was not writing mechanics. It was making them compose without producing states I never anticipated, and accepting that some of those states are the reason the game is worth playing. A fire build inside a mission that rolled fire immunity is a problem nobody authored, and the player has to solve it with what they brought.</p>
        <p class="body">This was my first project, and I wrote it without AI tools.</p>
        <p class="sub">Where it stands</p>
        <p class="body">Playable through two bosses. The generators are all in place, missions, weapons, mods, boons, rooms, and what is missing is content volume rather than architecture. Adding a modifier means adding a row to a table. Adding a room means adding a prefab. That was the point of building it this way.</p>
        <p class="body"><a href="https://sebastianfreitas.itch.io/voidscape-prototype">Download the prototype on itch.io →</a></p>
        <p class="body"><a href="projects/voidscape.html">Open the full case →</a></p>
      `
      }
    ]
  });
})();
