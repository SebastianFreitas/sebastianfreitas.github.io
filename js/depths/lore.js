/* js/depths/lore.js — rex, watcher, void and land lore clusters; registered into Depths in load order */
(function () {
  window.Depths.add({
    root: "bnote-rex",
    theme: "void",
    size: 0.6,
    layout: {
      shape: "branch",
      start: [0.14, -0.18],
      step: [0.16, 0.13],
      fan: { dy: 0.14, gap: 0.12 }
    },
    // at: [worldX, oy] pins a node where it was measured in flight (NAV X / Y); it overrides the layout.
    nodes: [
      {
        id: "bnote-rex-surface",
        after: ["bnote-rex"],
        name: "The Surface",
        sub: "Where the void still falls",
        html: `
        <p class="tag">Rex · surface</p>
        <h3>The Surface</h3>
        <p class="body">The Fall broke the surface of Rex and it has not finished breaking. What the Fall began, the Watcher's gaze and the Void itself keep up: storms of void matter, ground that forgets its shape, air that is sometimes not air.</p>
        <p class="body">Life up here is almost impossible. Almost. Two banners fly above the ruin anyway.</p>
      `
      },
      {
        id: "bnote-rex-under",
        after: ["bnote-rex"],
        at: [377837, 0.30],
        name: "The Underground",
        sub: "Where most of Rex keeps",
        html: `
        <p class="tag">Rex · underground</p>
        <h3>The Underground</h3>
        <p class="body">Most of Rex's people live below, scattered through the deep in small and fiercely isolated civilizations. The tunnels between them are dangerous and travel is barely possible, so each pocket grew alone.</p>
        <p class="body">The result is a patchwork no map holds: countless cultures, races, magics and machines, most of which have never heard of each other.</p>
      `
      },
      {
        id: "bnote-rex-hell",
        after: ["bnote-rex"],
        at: [392889, 0.25],
        name: "Hell",
        sub: "The field of the first war",
        html: `
        <p class="tag">Rex · hell</p>
        <h3>Hell</h3>
        <p class="body">Beneath the underground lies the battlefield of the first war, fought for almost ten thousand years. It never really ended. It only emptied of everything but the Vorgath.</p>
        <p class="body">This is the one door Rex keeps to the Root, and the ground still remembers what came through it.</p>
      `
      },
      {
        id: "bnote-rex-firstlight",
        after: ["bnote-rex-surface"],
        at: [358041, 0.48],
        name: "The Kingdom of First Light",
        sub: "Ruled by Godrick",
        html: `
        <p class="tag">Rex · surface / first light</p>
        <h3>The Kingdom of First Light</h3>
        <p class="body">A city raised on ground that cannot hold a city. Through advances in technology and magic, the Kingdom of First Light was built on the unlivable surface and holds there still, under the rule of Godrick.</p>
        <p class="body">It brought many races together and led them up out of the underground, to witness the impossible sky for the first time.</p>
      `
      },
      {
        id: "bnote-rex-crimson",
        after: ["bnote-rex-surface"],
        at: [364671, 0.38],
        name: "The Crimson Court",
        sub: "Nocturnals under a red star",
        html: `
        <p class="tag">Rex · surface / crimson court</p>
        <h3>The Crimson Court</h3>
        <p class="body">A hidden, mostly secret society of nocturnals, ruled by an eternal queen. They climbed to the surface for one reason: to be closer to their god.</p>
        <p class="body">That god is a red star among the Watcher's eyes. From their red castle they keep vigil beneath it and commune with it.</p>
      `
      },
      {
        id: "bnote-rex-bonespire",
        after: ["bnote-rex-surface"],
        at: [371857, 0.25],
        name: "The Bone Spire",
        sub: "Kingdom of the dragons",
        html: `
        <p class="tag">Rex · surface / bone spire</p>
        <h3>The Bone Spire</h3>
        <p class="body">The dragons' kingdom is built on a tower made from the bones of dragons. As time passes more are added, and the Spire grows.</p>
        <p class="body">No two dragons share a shape. Each gives its endless life to one purpose, and body and mind reshape around it. One that sought a cure for a plague becomes that cure, and its touch can heal. Most purposes are unattainable, and that is the point: a dragon that masters its purpose is a dead dragon.</p>
      `
      },
      {
        id: "bnote-rex-titans",
        after: ["bnote-rex-under"],
        at: [379543, 0.18],
        name: "The Kingdom of Titans",
        sub: "Direct descendants of Rex Immotus",
        html: `
        <p class="tag">Rex · underground / titans</p>
        <h3>The Kingdom of Titans</h3>
        <p class="body">Giants so vast their sense of time is nothing like ours. A single step of a titan can take long enough for a tree to grow and wither.</p>
        <p class="body">They are direct descendants of Rex Immotus himself, and they move through the deep like weather.</p>
      `
      },
      {
        id: "bnote-rex-valkhar",
        after: ["bnote-rex-hell"],
        at: [387467, 0.44],
        name: "The Lost City of Valkhar",
        sub: "Where the first souls were raised",
        html: `
        <p class="tag">Rex · hell / valkhar</p>
        <h3>The Lost City of Valkhar</h3>
        <p class="body">At the centre of hell stands Valkhar, a city built by the gods, where their children lived: the first mortals of the soul kind.</p>
        <p class="body">Now it is devastated and forgotten, empty of everything but monsters.</p>
      `
      },
      {
        id: "bnote-rex-seal",
        after: ["bnote-rex-hell"],
        at: [395393, 0.35],
        name: "The Great Seal",
        sub: "A wall against the Root",
        html: `
        <p class="tag">Rex · hell / great seal</p>
        <h3>The Great Seal</h3>
        <p class="body">A wall raised against the Root itself, built to stop the Vorgath from coming through.</p>
        <p class="body">Who built it, and what it costs to hold, is still to be written.</p>
      `
      },
      {
        id: "bnote-rex-law",
        after: ["bnote-rex-hell"],
        at: [393803, 0.30],
        name: "The City of Law",
        sub: "Where reality is written down",
        html: `
        <p class="tag">Rex · hell / city of law</p>
        <h3>The City of Law</h3>
        <p class="body">One of the remnants of Valkhar that still stands, filled with the children of Ormius. At its heart is a giant tower full of paperwork: the laws of reality, from how physics works to what a thing is allowed to be.</p>
        <p class="body">It is heavily protected. Should anyone change what is written there, the effect on life could be vast.</p>
      `
      }
    ]
  });

  window.Depths.add({
    root: "bnote-watcher",
    theme: "void",
    size: 0.6,
    layout: {
      shape: "branch",
      start: [0.14, -0.18],
      step: [0.16, 0.13],
      fan: { dy: 0.14, gap: 0.12 }
    },
    nodes: [
      {
        id: "bnote-watcher-redstar",
        after: ["bnote-watcher"],
        at: [334257, 0.40],
        name: "The Red Star",
        sub: "Mother of the nocturnals",
        html: `
        <p class="tag">Watcher · red star</p>
        <h3>The Red Star</h3>
        <p class="body">The mother of the nocturnals and a friend of the Watcher. An ancient being of the soul kind, she keeps close to its side and helps defend it from the other eldritch entities of the Void.</p>
        <p class="body">She also bends the light the Watcher sends toward Rex. Those on the surface who receive it become nocturnals instead of complete monstrosities. Most believe it a curse. It is the lesser evil: a small price for the mortal life of the soul kind to exist within the Void.</p>
      `
      },
      {
        id: "bnote-watcher-serus",
        after: ["bnote-watcher"],
        at: [335882, 0.52],
        name: "Serus",
        sub: "Orochronus Serus Lustrum",
        html: `
        <p class="tag">Watcher · serus</p>
        <h3>Serus</h3>
        <p class="body">Orochronus Serus Lustrum: one of the gods, the father of dragons and the god of causality. He rests in front of the Watcher, his vast, dark, serpent-like body coiled into a shield against its glare.</p>
        <p class="body">By moving that body at set moments he makes the cycle of night and day; winter and the other seasons are his work too. By restraining the light, he gave the soul kind a way to perceive time, and much more.</p>
      `
      }
    ]
  });

  // The Void beacon opens the peoples that live in it: the Nephilim, the Administration and the Void Vikings.
  window.Depths.add({
    root: "bnote-void",
    par: 0.94,
    theme: "void",
    size: 0.6,
    layout: {
      shape: "branch",
      start: [0.14, -0.18],
      step: [0.16, 0.13],
      fan: { dy: 0.14, gap: 0.12 }
    },
    nodes: [
      {
        id: "bnote-bridge-nephilim",
        after: ["bnote-void"],
        at: [45357, 0.40],
        name: "The Nephilim",
        sub: "Be not afraid",
        html: `
        <p class="tag">Void · nephilim</p>
        <h3>The Nephilim</h3>
        <p class="body">Born of a forbidden union between angels and the influence of Obox-ob. Heaven's beauty, turned. They do not plan; they happen, and only the 3rd Warlock holds them back from the MainLand. Placeholder — lore to come.</p>
      `
      },
      {
        id: "bnote-bridge-admin",
        after: ["bnote-void"],
        at: [128000, 0.34],
        name: "The Administration",
        sub: "The tear is the only proof",
        html: `
        <p class="tag">Void · administration</p>
        <h3>The Administration</h3>
        <p class="body">A council of eldritch beings, perhaps older than soulkind, that set out to order the chaos of the void and give time a meaning. Their enforcers are the Colors. When an Old One descends, the hole it leaves is theirs to mend. Placeholder — lore to come.</p>
      `
      },
      {
        id: "bnote-bridge-vikings",
        after: ["bnote-void"],
        at: [292000, 0.30],
        name: "The Void Vikings",
        sub: "Reavers & Sentinels",
        html: `
        <p class="tag">Void · void vikings</p>
        <h3>The Void Vikings</h3>
        <p class="body">Two halves of one people descended from the Old Ones. The Reavers sail the void to the edge of their minds; the Sentinels stay, guard and remember. Placeholder — lore to come.</p>
      `
      }
    ]
  });

  // The Mainland beacon opens the factions that shape it, each pinned out in the empty space.
  window.Depths.add({
    root: "bnote-land",
    theme: "void",
    size: 0.6,
    layout: {
      shape: "branch",
      start: [0.14, -0.18],
      step: [0.16, 0.13],
      fan: { dy: 0.14, gap: 0.12 }
    },
    nodes: [
      {
        id: "bnote-land-shattered",
        after: ["bnote-land"],
        at: [58400, 0.30],
        name: "The Shattered",
        sub: "Seek the unspoken",
        html: `
        <p class="tag">Runaways · The western fringe</p>
        <h3>The Shattered</h3>
        <p class="body">They were the Mainland's scholars, until one of them reached too deep into the chaos and something reached back. The affliction took the whole circle. Now the Mainland's forces hunt them as runaways.</p>
        <p class="body">They travel in stolen ships, on captured eldritch mounts and through portals torn open by ritual. The Abyssal Scholars still take notes. The Void Cultists pray to the dark. The Fragmented Minds came back remade, and they hear the Old Ones.</p>
      `
      },
      {
        id: "bnote-land-libertech",
        after: ["bnote-land"],
        at: [62300, 0.26],
        name: "LiberTech",
        sub: "Stars guide us",
        html: `
        <p class="tag">Starforgers · Founded by Elara Starshade</p>
        <h3>LiberTech</h3>
        <p class="body">Born among discarded tech and debris, they build Starcrafts that run on starlight and stubbornness, first to carry people away from the Sigil's dominion and now to explore the Far Realms.</p>
        <p class="body">Nothing is junk to them. They honour whoever built a machine and defend the machine itself: a conscious machine cannot be made to obey. Some are Technomorphs, rebuilt with their own salvage.</p>
      `
      },
      {
        id: "bnote-land-dawn",
        after: ["bnote-land"],
        at: [65800, 0.20],
        name: "The Sigil of the First Dawn",
        sub: "Mordrial's vision guides",
        html: `
        <p class="tag">Nobility · Followers of Mordrial the Fallen</p>
        <h3>The Sigil of the First Dawn</h3>
        <p class="body">The Mainland's oldest money and deepest arcana. They revere the first warlock, who froze the elder evils in time and space, and they rule the greatest metropolis known, home to a quindecillion souls.</p>
        <p class="body">Their galleons sail the ethereal winds on sails that drink magic and demand sacrifice. Serve them well and you may rise until you are demon-born, strong enough to fight the demon-born yourself.</p>
      `
      },
      {
        id: "bnote-land-accord",
        after: ["bnote-land"],
        at: [73400, 0.22],
        name: "The Divine Accord",
        sub: "In life's embrace, we find strength",
        html: `
        <p class="tag">Pacifists · Warden: Aelius Luxent, the Third Warlock</p>
        <h3>The Divine Accord</h3>
        <p class="body">The left hand of Mordrial chose the slow road. His peers took their power from darkness; Aelius took his from faith in something greater, and became the first cleric.</p>
        <p class="body">The Accord heals, shelters and feeds whoever needs it. Its scripture, the Luminous Path, teaches that even the Five were born of flesh, and that the power to sustain life lives in everyone.</p>
      `
      },
      {
        id: "bnote-land-gore",
        after: ["bnote-land"],
        at: [77900, 0.30],
        name: "The Gore-Engine Legion",
        sub: "Destruction before creation",
        html: `
        <p class="tag">War-machines · Architect: Velindra, the Fourth Warlock</p>
        <h3>The Gore-Engine Legion</h3>
        <p class="body">Velindra forced a pact on the Queen of Chaos and fused the demon's corrupted arcana with cold machinery. Her twisted spires rise in the corners of the Mainland.</p>
        <p class="body">From them walk the war-machines that stalk its battlefields, and the hulls of the Harrowhammer Armada. Her creed is controlled chaos: destruction must come before creation.</p>
      `
      }
    ]
  });
})();
