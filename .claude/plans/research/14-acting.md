# 14 · Acting: research

Sources: Control's Hiss (Remedy, 2019): floaters hang in a ring, heads back,
arms loose, and chant; possessed humans jerk between poses. Dishonored's
aristocrats (Arkane, 2012): upright, slow, hands behind the back or on a
cane, bow from the waist, never hurry. Uncanny mime: a person moving like a
film with frames missing, a joint that isolates, a gesture repeated once
too often. What these share: the pose is right and the timing is wrong.

Translated to cheap 2D canvas motion (h = the figure's height, t = G.t in s):

- **Stutter (hold, then snap).** Each figure has its own clock `lt`. With
  probability 0.12 per second, freeze `lt` for 4-7 frames (0.07-0.12 s),
  then jump it forward by the held time so the pose snaps, no easing. At
  most one freeze per 1.5 s per figure; never two figures on the same frame.
- **Repeat a segment.** Every 5-8 s (per-figure seeded), replay the last
  0.2 s of the gait once: `lt -= 0.2` for one frame. A skipped-record step.
  Reads as mime; costs one subtraction.
- **Gait "too even".** A gentleman's stride with zero variance: the hip
  bob is exactly 0.012 h, the step exactly one period, no ease at the
  turning points (triangle wave, not sine). The eye reads it as mechanical.
- **Gait "a half-beat off".** Arms lag the legs by 0.5 rad instead of pi
  (not opposite, not together), or one leg's swing is 0.9 of the other's.
  Wrong enough to notice, small enough to doubt.
- **Posture.** Torso held rigid, no bob above the waist: the upper body
  glides on a level line (Dishonored), only the legs work. A 0.02 h
  forward lean, fixed.
- **Floating lift (Hiss).** Before the womb kneel, a flyer or the
  gentleman's feet rise 0.03 h over 0.8 s and hang, bobbing 0.005 h at
  0.3 Hz. Toes droop (foot tip 0.02 h lower than heel).
- **Twitch.** A single joint (head/shoulder/one arm) jumps 0.03-0.05 h
  sideways for 2 frames, then returns in 1 frame. Probability 0.05 per
  second per figure; the rest of the body never reacts to it.
- **Head-snap to the look target.** Turning toward `look` takes 1 frame,
  not an ease; hold 0.6 s; then the body follows over 0.4 s.
- **Kneel with manners, 3 held poses.** (1) stop, heels together, hold
  0.5 s; (2) bow from the waist, torso tilted 25 deg, hold 0.6 s; (3) one
  knee down, body lowered 0.18 h, head (or shoulders) tilted 10 deg further,
  held. Each change is a snap over 3 frames (0.05 s), not a smooth mix.
  Stagger figures by 0.15-0.35 s (seeded) so the line kneels like a wave.
- **Chant sway (Hiss).** Once kneeling, the upper body rocks 0.01 h at
  0.6 Hz, in unison across all kneelers (same phase): collective, eerie.
- **Hat tip (dressed hook).** 0.4 s: hand up 0.15 s, hat lifts 0.04 h and
  tilts 12 deg, hold 0.1 s, back 0.15 s. Every 6-10 s while walking, or once
  when the head-snap lands on a target.
- **Straighten the coat (dressed hook).** 0.5 s: both hands to the lapels
  (hands at 0.62 h), a 0.01 h downward tug, torso rises 0.005 h. Once after
  each kneel ends, once at `dress` end.
- **Cane (dressed hook).** Cane tip plants on every second step exactly on
  the footfall frame; handle hand stays at 0.48 h; a 0.02 h tap bounce.
- **Budget.** Everything above is a function of the figure's warped clock
  plus 2-3 seeded constants: no state, no allocations, deterministic for
  snapshots (derive from G.t and a hash of o.idx, never Math.random).
