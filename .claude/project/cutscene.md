# Cutscene rounds (project-only, never synced)

For every chat that draws or moves a cutscene (`js/genesis/`, Rex,
Genesis). Read it before the first round of a window. Why (audit of
2026-11-13 to 11-27): half of the Rex verdicts were rejections, about 8
rounds per approved beat, about 0.7M tokens a round. It wins over
`sub-chat.md` and `verify.md` where they differ on a cutscene round.

## Ledger

- Each scene has a ledger, `.claude/cutscene/<scene>.md` (`rex.md`,
  `genesis.md`): a "Whole scene" section, then one section per beat,
  its heading ending in the `Gen.BEATS` id it plays in (`[burst]`, the
  id `cshot.py --beat` takes; `[?]` until someone has checked it), with
  `Status` (open, approved <date>, landed <date>, parked), `Words` (the
  owner's, verbatim and dated, newest last, at most four lines), `Keep`
  (approved, must not change) and `Never` (rejected for this beat).
- Read the scene's ledger at the start of every window; it replaces
  reading the long scene memory. No ledger yet: write it from the
  memory before the first build.
- Before a build, add the owner's new words to the beat. On an approval,
  move what he approved to `Keep` and set `Status`. Commit the ledger
  with the round.
- Every spec names the ledger under Read first and copies the beat's
  `Keep` and `Never` lines into Constraints.
- Every picture message opens with two lines, `Kept:` and `Changed:`.
  A build that would change something on `Keep` is a question first.
- The owner's words reach the chat verbatim, with no reading added by
  whoever relays them. Words that can be read two ways: one question
  before building, never a guess.

## Rough pass first

- The first picture of a new beat, a restage or a new design is a rough
  pass: the key poses as stills on one sheet, in the real scene, from
  one implementer call. No webm, no easing or effects work, no reviewer.
  Aim: 15 minutes from the owner's message. The message says `ROUGH`.
- The motion build (timing, effects, the clip) starts only on the
  owner's yes to the rough pass.
- A verdict that only tunes a look he already approved (smaller,
  slower, more of them) skips the rough pass.

## In the scene

- Every look picture is shot in the real scene frame, at the size the
  scene plays at, with a closeup beside it when the thing is small.
  Never only a sketch on a blank background.
- List every beat the thing appears in (grep its callers) and put one
  frame from each on the sheet. Approved in one beat is not approved in
  the others (2026-11-23: new insects approved, the walk still drew the
  old ones).

## Capture

- One tool shoots every round: `py -3 tools/cshot.py` (project
  playbook, Commands). Never write a per-round capture script; a shot
  the tool cannot take is a new flag on the tool, in the same commit.
- Pictures for round N go in `snapshots/cshot/<scene>/r<N>/`.

## Landing per beat

- When the owner approves a beat, set it `approved` in the ledger and
  end that message with one line: "Beat <beat id> is approved: land it
  now?", plus what a visitor would see half-done if there is anything.
  Landing still waits for his word (the mode's Commit rule): under a
  coordinator that word is "land <board name>" typed in the
  coordinator's window, never a "yes" or "land beat 3" here.
- A per-beat landing does not end the chat: after `LANDED:` skip the
  playbook's "Landed" step (do not mark the session done) and carry on
  with the next beat on the same branch. Only the last beat's landing
  is "Landed". Right after `LANDED:` set the beat `landed <date>` in
  the ledger and commit it, so the branch stays ahead of `main`:
  `tools/cleanup.py` removes a branch and its worktree once it is on
  `main`, clean and idle for 24 hours.
- Parked beats and open beats never ride along: say which the landing
  leaves out.
