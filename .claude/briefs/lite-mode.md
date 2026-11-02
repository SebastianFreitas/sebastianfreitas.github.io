# Brief: automatic lite mode for CPU-drawn browsers

Ready-to-use starting prompt. Status: not started, not approved for building yet.

## Prompt to paste

```
Build automatic lite mode from .claude/briefs/lite-mode.md. Read it first, then follow the workflow in CLAUDE.md.
```

## The problem
Firefox in `WebRender (Software)` mode draws the page on the CPU. The owner's machine was in that mode until 2026-11-02: bridge 165 fps, but opening a game folder 10 fps, closing 19, hard scrolling over the boxes 29, row switching 40. Turning hardware acceleration on made it smooth. A site cannot turn that on for a visitor, and has no direct way to ask whether a browser is in software mode, so it has to notice slow frames.

## What to build
- **Detect:** time frames during the first scroll through the Work section or the first folder open. Require sustained slow frames so one hitch does not trigger it. Compare against the screen's own refresh rate, since 60 and 165 Hz differ.
- **Switch:** set a lite class for that visit only.
- **Lite look:** open folders drop the wash, smoke and glow, and the sweep becomes a simple fade.
- **Everyone else:** a normal machine never triggers it and sees no change.

## Questions to settle first
- Should it remember the choice across visits?
- Does the bridge need a lite form too?
- Should a visitor be able to turn it off?

## Where to look
- `js/site/folders.js`: `caseAnim` is the sweep; `is-scrolling` sits on `.work`.
- `css/folder.css`: the wash, smoke and glow, baked to `css/art/wash.webp` and `css/art/folder-glow.webp`.
- `js/site/devpanel.js`: temporary frame timing to borrow from, if it has not been removed.

## How to test
Turn off `Use hardware acceleration when available` in Firefox, restart, and confirm `about:support` says `WebRender (Software)`. Automated Firefox here does not show the owner's numbers, so judge in the owner's real browser. Turn acceleration back on afterwards.
