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
  `Explore` subagent (grep `.claude/MAP.md` first) and work from its summary. Do not read files into the
  main context yourself.
- Why: a file read in the main session costs Opus tokens once for the file
  and again on every later turn. Explore runs on Haiku.
- Only exception: the specific file you are about to write a spec against.
  Read that one directly, and only the range you need (see Token budget).
- Do not set `CLAUDE_CODE_SUBAGENT_MODEL`. It would move Explore from Haiku
  to Sonnet and cost more, not less.

## Token budget

The repo was split on 2026-09-23 so that no JS file is over 620 lines and
most are under 300. Whole-file reads are still the main cost. These rules
apply to the main session, Explore and the implementer alike.

- **The map is `.claude/MAP.md`:** every file's size, purpose and exports,
  the shared-state conventions, the load order, storage keys, "where things
  live" and the rank-boon roadmap. It is not loaded automatically: `Grep -n`
  it for the file, function or concept you need and read only those lines
  (a `Read` with `offset`/`limit`; never the whole map). Do not re-survey
  the repo; re-derive something only when a grep proves the map wrong, and
  then fix the map. New files, moved functions or new exports: fix the row
  in the same commit.
- **Never read a whole file over 300 lines.** The map's top lists which are
  still over 500. Grep the map for the file and function, then `Grep -n`
  the name in the file and `Read` with `offset`/`limit` around the hit.
  Function names do not drift; line numbers do.
- **Never open** `cv.pdf`, anything under `media/`, `Temporary VoidScape
  Media/`, `snapshots/` or `__pycache__/`. They are binaries and staging
  assets. `Glob` or `ls` them if you need names; never `cat`, `Read` or `wc`
  them.
- **Explore prompts must be narrow:** name the file, the function or the
  concept, tell it to grep `.claude/MAP.md` before the code, and ask for
  `file:line` anchors and a summary, not code bodies.
- **Specs carry their own anchors.** The implementer has `omitClaudeMd: true`
  and never sees this file or the map. Put the target file paths and
  function names in the spec so it can jump straight there.
- **One file per implementer call** unless the change genuinely spans files.
- **Test only the flows you touched.** `py -3 tools/nav-flows.test.py
  <flow>`; the full suite is 20 flows and only needed before a commit that
  touches navigation, the gate or storage. Three checks fail on `main`
  before this refactor and still do (`gate-exits` / `worklink` "lands on
  Work": the scroll lands 72 px above the section); they are not a
  regression signal. The case pages' toys are covered by `links`, `header`,
  `shell`, `worklink` and `twotabs`; `py -3 tools/snap.py capture <name>`
  fails a `page-*` scene on any console error, which is the toys' error check
  (its clock is frozen, so only the first synchronous frame paints).
- **Screenshot regression is mandatory for any change that paints or
  styles.** `py -3 tools/snap.py capture <name>` (about 3.5 min, 50 scenes)
  then `py -3 tools/snap.py compare <before> <after>`. Capture once before
  touching code, once after; the compare must be `same` on every scene you
  did not intend to change. Capture folders live under `snapshots/`
  (gitignored).
- Bump every `?v=` at once with `py -3 tools/bump.py` before a commit that
  changes any script or stylesheet; never edit the numbers by hand.

## Layout

No framework, no bundler, no npm. GitHub Pages user site, so the pages and
site assets stay at the root; everything else lives in a folder.

```
index.html 404.html projects/ media/ cv.pdf robots.txt sitemap.xml .nojekyll
serve.py serve.bat            local no-cache server on 8765
css/                          style, gate, beacon, bridge, play
js/lib/                       util, paint, pacer
js/site/                      xp, entry, intro, surge, embed, lazy-video
js/hud/                       instruments, tiles-nav, tiles-sys
js/bridge/                    bridge core + 8 parts, bridge-sites, bridge-voice, bridge-log, marks, lamp, planet
js/depths/                    depths core + zero, voidscape, heavylight, conclusus, lore
js/ship/                      voidship, voidship-art, voidship-prow
js/gamedev/                   storm, forge, forge-guns, forge-missions, zones
js/gdworld/                   gdworld core + gd-zero, gd-voidscape, gd-heavylight, gd-conclusus (the Game Dev sector's world)
js/world/                     world core + 8 painters; art/ = one file per place + rex-kit, land-kit
js/genesis/                   genesis-state, -paint, -void, -flesh, -elements, -matter, -trade, -oldones, -oldkin, -figures, -titans, -obrok, -hosts, -mainland, -armies, -orb, -rex, -depths, -saga-state, -ritual, -saga, genesis
js/pages/                     play (the case-page canvas layer) + one toy per case page: heavylight, conclusus, sector-zero (+ -records), voidscape (+ -boons)
tools/                        nav-flows.test.py, snap.py, bump.py, gframes.py, jscheck.py, try.py
.claude/                      MAP.md (the file map), hooks/, settings.json, agents/implementer.md, handoff.md (gitignored)
```

## Context handoff

A long chat degrades before it overflows: compaction drops detail and every
turn re-reads everything before it. So a session stops on purpose and
hands over to a fresh one.

- `.claude/hooks/context-watch.py` measures the context after every prompt
  and every subagent return (the token count of the last turn in the
  transcript) and prints a CONTEXT WATCH line once it passes `LIMIT`
  (140k tokens; tune it there). Its 80% warning means: finish, do not
  start.
- When it fires: finish only the current atomic step (an implementer
  already running may finish; never start a new one), verify, `bump.py` if
  a script or stylesheet changed, commit by path, then write
  `.claude/handoff.md` (gitignored) and end the turn with exactly this
  line and nothing after it: "Context is full. Start a new chat and say:
  continue from the handoff."
- `handoff.md` is under 80 lines, no code, these headings: **Goal** (the
  user's words), **Done** (commits with hashes), **In progress** (files,
  state, the last spec sent), **Next** (numbered; the first step concrete
  enough to start cold), **Decisions** (each with its why), **Gotchas**
  (found this session, not in the map), **Verified** (which flows and
  snapshot runs passed, which are pending), **Foreign edits** (uncommitted
  paths that were not ours).
- The next chat's SessionStart hook prints the file. That session restates
  the plan in two lines, continues from Next, and deletes the file once it
  has absorbed it. It never redoes anything under Done.
- Write a handoff unasked whenever a turn has to end with a task half done
  for any other reason (an error you cannot get past, a question only the
  user can answer).

## Parallel sessions

Other sessions edit this tree at the same time: another local chat may be
mid-task with uncommitted edits, and cloud branches land on `main` through
`tools/try.py --ship`. The user will not say so every time.

- The SessionStart hook lists every uncommitted path at start: those are
  foreign. `.claude/hooks/git-guard.py` blocks blanket git (`add -A`,
  `add .`, `commit -a`, `stash`, `checkout --`, `restore`, `reset --hard`,
  `clean`, `rebase`, force push). Do not work around it; if the user wants
  such a command, they run it themselves.
- Stage by path, only the files your specs named, and read `git status`
  before every commit: anything else modified is someone else's and stays
  out.
- A file you must change that already has foreign edits: say so in the
  spec. The implementer edits by exact string, touches only its own hunks
  and never "cleans up". Its verification runs against the mixed file; if a
  foreign edit breaks a flow, report it, do not fix it.
- Before `git push`: `git fetch`; if `origin/main` moved, `git merge
  origin/main`, resolve, re-run the flows you touched, then push.
- Docs are shared too: `.claude/MAP.md` rows for a file another session is
  building belong to that session.

## Delegation

- Delegate all code changes to the `implementer` subagent, one task per call.
- The spec must be complete enough that the implementer never has to choose a
  name, a file location or a design.
- Run implementer calls in parallel only when their tasks touch completely
  separate files. If several parallel tasks must each add `<script>` lines
  to `index.html`, tell each to edit only its own line with one `Edit` and
  to re-read and retry if the file changed underneath it; that worked for
  the split.

## Spec format

Every delegation to the implementer must contain:

1. **Target files:** the exact path of every file to create or edit, and the
   function names to grep for so it reads only that region.
2. **Symbols:** exact names and full signatures for every function, method,
   class, variable or export to add or change.
3. **Logic steps:** the implementation as an ordered, numbered list of steps.
4. **Edge cases:** each edge case and exactly how it should be handled.
5. **Do not touch:** files, symbols or behaviour that must stay unchanged.
6. **Verification:** the exact command to run, or "none" if the change isn't
   covered by a test. Never `python serve.py` — it is a blocking server and
   will hang the implementer. Browser behaviour: `py -3
   tools/nav-flows.test.py <flows>`. It runs its own server and exits. Only
   the back/forward cache still needs a manual check. There is no `node`
   on this machine; a passing flow is the syntax check.

## Art style

Every drawn place (Rex kingdoms, Mainland factions, anything new) uses one
style. Reference: the Bone Spire in `js/world/art/bonespire.js` and the
Titans cave in `js/world/art/titans.js`.

- Stylised 2D silhouettes, flat palette fills.
- Light from the left. Shadows are hard-edged flat shapes (a `litShade`
  split, roughly the right 70% of each volume), never gradients.
- No rim lines, outlines or brick lines on buildings.
- Soft glow only for things that emit light (lanterns, portals, flames).
- Places are proper buildings, not symbols or sigils.
- The primitives are in `js/lib/paint.js`; do not add a new `litShade`
  anywhere. Shared building helpers go in `rex-kit.js` / `land-kit.js`.

## Instrument readings

- Readings are visual first: a bar climbing or a tile blinking red, then a
  number, then a line in the log. Never a mechanic; nothing here costs the
  visitor anything.
- Every place that bends the instruments is one entry in
  `js/bridge/bridge-sites.js`, gated on its depth node (`gate`). The beacon
  marks nothing; the art does. Add a site, not a special case in a tile.
- Two axes: `chaos` is the incoherent one (noise, the world's `chaosAt`);
  `nomic` is the coherent one (constants displaced, in step). On the HUD
  and in the log say `incoherent` / `coherent` / `nomic`; never `magic`.
  Keep the voice's style: `value · unit · impossible clause`, lowercase,
  dry.
- Tiles read `r.env` only; they never reach into `Bridge`. Anything that
  does not change per paint goes in the tile's `paintStatic`.

## Commands

- **Build:** none. No framework, no bundler, no npm.
- **Run:** `python serve.py`, then open `http://127.0.0.1:8765/`
- **Test:** `py -3 tools/nav-flows.test.py` (Playwright; pass flow names to
  run a subset, `--list` to see them). Flows: `first`, `gate-exits`, `back`,
  `reload`, `worklink`, `deeplink`, `returning`, `wordmark`, `reset`,
  `genesis`, `twotabs`, `header`, `shell`, `phone`, `depths`, `rex`,
  `watcher`, `bridge`, `landdepths`, `links`.
- **Cutscene frames:** `py -3 tools/gframes.py <run> [beat ...]` writes
  `snapshots/frames/<run>/<beat>.png` contact sheets. **JS check:** `py -3
  tools/jscheck.py js/genesis/genesis-figures.js --eval "return typeof
  GenFig"` loads files in a headless page (no node on this machine).
- **Screenshots:** `py -3 tools/snap.py capture <name>` writes a run under
  `snapshots/`, `py -3 tools/snap.py compare <a> <b>` diffs two runs, `py -3
  tools/snap.py list` names the scenes.
- **Cache-bust:** `py -3 tools/bump.py` rewrites every `?v=` in the HTML
  pages.
- **Git:** on the local machine, commit straight to `main`, no branches.
  In a cloud session, see Cloud sessions below. A `.gitignore` covers
  `__pycache__/`, `*.pyc`, `snapshots/` and `Temporary VoidScape Media/`.
- **Every task ends with a commit, unasked.** Once the work is verified, run
  `py -3 tools/bump.py` if any script or stylesheet changed, then commit. Do
  not stop at "ready to commit" and do not hand the user a commit command.
- **Commands shown to the user run in Windows PowerShell 5.1.** Never print
  `&&`, `||`, `$(...)` or bash `if` for them; chain with `;` or give one
  command per block. The Bash tool is fine for Claude's own use.

## Cloud sessions

A cloud session (claude.ai/code, the Claude app) is a fresh Linux clone of
GitHub, one container and one `claude/<name>` branch per session, so
parallel sessions never share files. The live site deploys from `main`, so
nothing a cloud session pushes goes live until the owner merges it.

- **Branch:** work, commit and push only on the branch the session was
  assigned. Never push to `main` and never merge into it; the owner merges.
  This overrides "commit straight to `main`" above.
- **One prompt, one finished feature.** The owner ships from a command, not
  from a second prompt: a reply that only says "good, go" would cost a
  whole extra turn. So in the same turn: build, verify, commit, push, open
  a PR (title = the feature in plain words; body = what changed and what
  was verified; skip if `gh` is missing), then end with this report and
  nothing else:
  1. **Name:** the feature in plain words (the branch name is random and
     means nothing to the owner), then the branch and PR.
  2. **How it looks:** one or two screenshots of exactly what changed,
     taken with Playwright (a `python3 tools/snap.py capture` scene,
     `python3 tools/jscheck.py ... --shot out.png`, or
     `python3 tools/gframes.py` for the cutscene), saved in the scratchpad
     and sent to the owner (SendUserFile when the tool exists). Never
     commit them.
  3. **Try:** one `powershell` block, one command:
     `py -3 C:\Users\Traff\Desktop\sebas\Portfolio\tools\try.py <branch> --path "<url path>"`.
     It checks the branch out into `../Portfolio-try`, serves it on its own
     port and opens the browser; typing `ship` at its prompt ships it. Set
     `--path` to where the change is seen (`/projects/voidscape.html`,
     `/?genesis=1&gbeat=<beat>`, `/` for the bridge) and say in one line
     what to do there to see it.
  4. **Ship:** one `powershell` block:
     `py -3 C:\Users\Traff\Desktop\sebas\Portfolio\tools\try.py <branch> --ship`.
     It merges the branch into `main` inside `../Portfolio-try`, runs
     `bump.py`, pushes, deletes the branch (the PR closes as merged) and
     fast-forwards the owner's checkout when it is clean. On a conflict it
     pushes nothing and says so.
  5. **Look at:** two or three bullets at most, plus anything left open.
  If the owner replies with changes instead, do another round on the same
  branch (the PR updates itself) and end with the same report. The session
  itself never merges into `main`.
- **Branches never touch `?v=` and never re-count `.claude/MAP.md` lines.** Do not
  run `tools/bump.py` and do not change the line count of an existing
  map row; add rows for new files and update descriptions only. These
  two are where every merge conflict between parallel branches came from;
  `--ship` bumps on merge. Previews are unaffected: `serve.py` sends
  no-cache headers.
- **Commands:** `py -3` does not exist in the container; run the same tools
  with `python3` (`python3 tools/nav-flows.test.py header`). Everything
  else in this file applies unchanged.
- **Playwright:** the environment's setup script installs
  `playwright==1.56.0`, the version that matches the pre-installed Chromium
  build (`/opt/pw-browsers/chromium-1194`). Never run `playwright install`
  and never upgrade the package. If a flow prints "Looks like Playwright was
  just installed", the pin and the Chromium build disagree: say so and stop.
- If `python3 -c 'import playwright, PIL'` fails, the setup script did not
  run: `pip install playwright==1.56.0 pillow` (never `playwright install`).
- **Merging by hand (a local session, only when `--ship` hit a conflict or
  the owner says "merge the PRs"):** merge the open PRs into `main` one at
  a time with `--no-ff`, oldest first. Conflicts in `?v=` numbers: keep either side. Two branches adding
  `<script>` lines at the same spot: keep both, in load order. `.claude/MAP.md`
  rows: keep both sides' rows, then re-count the changed files. After the
  last merge run `py -3 tools/bump.py` once, run the full
  `py -3 tools/nav-flows.test.py`, commit, push, and delete the merged
  `claude/*` branches on the remote.
- **No scratch files in the repo.** GitHub Pages publishes every committed
  file; logs and notes go in the session's scratchpad, not the root.
