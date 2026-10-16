# gods-monsters: intake research (2026-10-15)

## Sources and what we take

- Alan Zucconi, kinematics series (forward/inverse kinematics, tentacles)
  https://www.alanzucconi.com/tag/ragdoll/ : a serpent or tentacle body is
  a chain of points that follows its head; IK for reaching limbs. In ours:
  coils that trail the head (follow-the-leader), a reaching limb that lands
  on `godHand`'s point.
- 2D procedural limb notes https://backup.hollywoodcamerawork.com/2d-procedural-limb.html
  and the Godot procedural-walk threads
  (https://forum.godotengine.org/t/help-making-a-2d-procedural-walk-cycle-for-a-dog/107320):
  two-bone legs with planted feet that step when the body passes a distance.
  In ours: jointed legs like Obrokxus's centihorse (genesis-obrok.js `leg`),
  which already uses a phase wave head to tail.
- Canvas sine waves https://getbutterfly.com/canvas-2d-waves : a travelling
  sine along a chain = serpent wave; a phase offset per wing bone = a wing
  stroke with lag. In ours: wing strokes with the power stroke slower than
  the recovery (Obrokxus's oar legs do this).
- Rain World (https://en.wikipedia.org/wiki/Rain_World,
  https://unity.com/de/blog/exploring-procedural-design-rain-world):
  creatures read by motion and behaviour, all procedural. In ours: idle life
  (breath, coil shift, eye track) carries as much as the outline.
- Creature silhouette rules of thumb (rmcad.edu blog on non-human
  animation; creature-design skill pages): fill solid, it must still read
  at small size; the dominant shape signals the role (dome = protect,
  wedge = speed, spikes = threat); one landmark feature per creature;
  clear anticipation before an action. In ours: each god's domain gives
  its dominant shape; a 1-colour fill test at the size the scene draws it
  (gods are 0.11 of screen height today, about 99 px at 900).

## What the earlier plan already holds

- `.claude/plans/research/06-silhouettes.md`, `25-inspired.md`: the
  eldritch figures' silhouette work (old ones, tier 3); the gods are not
  eldritch (art-style.md "Scope") but the outline-first test carries.

## Search gaps

No design breakdown of Shadow of the Colossus or Hollow Knight bosses was
found; precedents named in the Option map come from general knowledge.
