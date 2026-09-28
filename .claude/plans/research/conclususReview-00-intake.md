# conclususReview · 00 intake (2026-09-28)

## Sources and what we take

- **Scroll-linked effects** (Firefox source docs, https://firefox-source-docs.mozilla.org/performance/scroll-linked_effects.html; MDN mirror). Browsers scroll on the compositor thread; the page moves before JS sees the new scrollY. Anything a script repositions from scrollY (our fixed canvas drawn at `oy = -V.sy`) lags a frame and then snaps. Take: the likeliest "can't put my finger on it" jank is the platforms swimming against the text during scroll. The cure is to let the browser scroll the things that belong to the page (document-anchored layers) and keep script drawing for things that move on their own.
- **curtains.js discussion #75** (DOM-to-WebGL scroll sync latency). WebGL-over-DOM libraries see the same lag; their fixes are either hijacking scroll (smooth-scroll libraries, which we reject: the case pages stay plain) or anchoring the canvas to the document. Take: never hijack scroll.
- **Scrollytelling practice** (scrollytelling.ai design patterns; Webflow scrollytelling guide). One scroll step should produce one visible change; the reader keeps the pace, the author sets the sequence. Take for XP: a reward belongs to a deliberate beat the reader reaches, not to the scrollbar itself; a burst of rewards from one flick reads as noise.
- **Conclusus the game** (memory `conclusus-what-the-code-actually-does`): keys are spinning Symbols collected by touching them, 3-piece keys collected in order, timed platforms must all be lit at once, silhouettes cycle green/silver. Take: the page toy should earn keys by an action the player makes, like the game.

## Findings from the code (Explore; anchors in the plan's Current state)

- 6 XP reachable on the page: 1 on open (`proj-conclusus`), up to 4 more from a plain scroll (timed, key1-3 via teleport), plus win auto-firing at the page bottom.
- Each award plays a ~1.7 s ceremony; scroll-earned ones queue back to back.
- Jank suspects, ranked: (1) fixed canvas redrawn from scrollY (compositor lag); (2) Pacer 60 fps cap and 30/10 fps idle park, dt clamp on unpark; (3) glow cache churn from pulsing radii (full clear at 64); (4) particle spikes (60 per teleport, 30 per timed platform crossed); (5) topbar getBoundingClientRect every scrolled frame; (6) ceremony DOM animations during scroll; (7) videos loading/decoding mid-scroll; (8) late relayout moving the player.
