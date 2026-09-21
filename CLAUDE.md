## Main session role

The main session directs exploration, designs the change, writes the spec,
reviews the diff the implementer returns, and writes the follow-up spec if
anything needs fixing.

- The main session must not call Write or Edit on source files.
- The main session must not use Bash to modify files: no `sed -i`, no
  heredocs, no `>` or `>>` redirects, no scripts that write files.
- Only exception: a single-line change where writing the spec would take
  longer than the edit itself. Cost and convenience are not exceptions.

### Delegate exploration too

- Before designing anything, send codebase searches and file reading to the
  `Explore` subagent and work from its summary. Do not read files into the
  main context yourself.
- Why: a file read in the main session costs Opus tokens once for the file
  and again on every later turn. Explore runs on Haiku.
- Only exception: the specific file you are about to write a spec against.
  Read that one directly.
- Do not set `CLAUDE_CODE_SUBAGENT_MODEL`. It would move Explore from Haiku
  to Sonnet and cost more, not less.

## Delegation

- Delegate all code changes to the `implementer` subagent, one task per call.
- The spec must be complete enough that the implementer never has to choose a
  name, a file location or a design.
- Run implementer calls in parallel only when their tasks touch completely
  separate files.

## Spec format

Every delegation to the implementer must contain:

1. **Target files:** the exact path of every file to create or edit.
2. **Symbols:** exact names and full signatures for every function, method,
   class, variable or export to add or change.
3. **Logic steps:** the implementation as an ordered, numbered list of steps.
4. **Edge cases:** each edge case and exactly how it should be handled.
5. **Do not touch:** files, symbols or behaviour that must stay unchanged.
6. **Verification:** the exact command to run, or "none" if the change isn't
   covered by a test. Never `python serve.py` — it is a blocking server and
   will hang the implementer. Browser behaviour: `py -3 nav-flows.test.py
   <flows>`. It runs its own server and exits. Only the back/forward cache
   still needs a manual check.

## Art style

Every drawn place (Rex kingdoms, Mainland factions, anything new) uses one
style. Reference: the Bone Spire in `rexart-surface.js` and the Titans cave
in `rexart-deep.js`.

- Stylised 2D silhouettes, flat palette fills.
- Light from the left. Shadows are hard-edged flat shapes (a `litShade`
  split, roughly the right 70% of each volume), never gradients.
- No rim lines, outlines or brick lines on buildings.
- Soft glow only for things that emit light (lanterns, portals, flames).
- Places are proper buildings, not symbols or sigils.

## Commands

- **Build:** none. No framework, no bundler, no npm.
- **Run:** `python serve.py`, then open `http://127.0.0.1:8765/`
- **Test:** `py -3 nav-flows.test.py` (Playwright; pass flow names to run a subset, `--list` to see them)
