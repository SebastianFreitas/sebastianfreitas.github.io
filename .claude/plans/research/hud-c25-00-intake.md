# hud-c25 intake research (2026-11-04)

Narrow on purpose: the look is already approved (C25 sketch), so research only
covers how a span/compass nav and a line-art cockpit HUD behave in games.

## Sources and what we take

- Skyrim compass (gamerguides "How to Use the Skyrim Compass",
  https://gamerguides.com/skyrim/guide/introduction/guide-information/the-compass;
  UESP maps page, https://en.m.uesp.net/wiki/Skyrim:Maps): visited places
  drawn one way, undiscovered another; distance shown by marker size. Take:
  seen vs unseen as two clearly different marks (C25: faint dot vs tick), and
  only one mark (the next) carries a distance number.
- Skyrim "nearest undiscovered only" request (Nexus forum,
  https://forums.nexusmods.com/topic/13438184-semod-that-makes-the-nearest-undiscovered-location-show-on-compass):
  players want one highlighted next target, not all of them equal. Take: the
  lit next tick plus lit segment from "you" (C25) is that idea.
- Skyrim compass critique (Steam community, https://steamcommunity.com/sharedfiles/filedetails/comments/12690):
  a strip with no division marks is hard to read. Take: C25's end ticks and
  the span line's fixed scale (one line = whole map) keep it readable.
- Elite Dangerous HUD (gamepressure "Main interface elements",
  https://www.gamepressure.com/elitedangerous/main-interface-elements/z8738f;
  Frontier forum "ui serious downgrading",
  https://forums.frontier.co.uk/threads/ui-serious-downgrading.256719):
  holographic, light, consistent sizes; players complained when boxes grew and
  sizes became inconsistent. Take: keep C25's thin linework and its own
  proportions when it scales; never grow boxes to fit a small screen.
  Elite was built console-portable from the start: one layout that scales,
  not a second set of instruments.

## Gaps

No source covers canvas cost or scaling of such a HUD on the web; that comes
from our own code (`js/hud/instruments.js` `fitCanvas`, `js/bridge/bridge-panel.js`
`deskDefault`) and the bridge-loop cost memories.
