# Portfolio: rules for every session

Facts (file map, sizes, load order, storage keys, roadmap) live in
`.claude/MAP.md`. How this session commits and ships depends on its mode,
and the SessionStart hook prints those rules (see Session mode). Domain
rules load on demand from `.claude/rules/` when you read the files they
cover.

## Session mode

The SessionStart hook prints `MODE: <mode>` and then the matching file
from `.claude/modes/`. That file overrides anything here about branches,
pushing and shipping.

| Mode | Where it runs | Commits land on | Lands on main via |
|---|---|---|---|
| `cloud` | claude.ai/code or the app, fresh clone (`CLAUDE_CODE_REMOTE=true`) | its `claude/<name>` branch, pushed, with a PR | `try.py <branch> --commit` (owner) |
| `worktree` | this PC, `.claude/worktrees/<name>`, its own branch | that branch, never pushed | `try.py <branch> --commit` (owner) |
| `shared` | this PC, the main checkout, other sessions editing too | `main`, never pushed by you | your commit, never pushed |

If no `MODE:` line is in context, the hook did not run. Work the mode out
yourself (`CLAUDE_CODE_REMOTE=true` means cloud; a `git rev-parse
--git-common-dir` outside the current checkout means worktree; otherwise
shared), read `.claude/modes/<mode>.md`, and say in the report that the
hook did not run. If you call `EnterWorktree` mid-session, read
`.claude/modes/worktree.md` before the next edit.

Default: a worktree session (desktop app: the worktree option when
starting). Shared mode is for quick fixes.

## One prompt, one finished result

The owner sends one prompt and comes back to a finished, verified change
plus two commands: one to look at it (Try), one that turns it into a
single commit on local `main` (Commit). The owner pushes with GitHub
Desktop; you never push to or merge into `main`. A reply that only says
"good, go" costs a whole extra turn, so never stop at "ready to commit".

1. **Explore:** send searches to the `Explore` subagent (see Main session
   role). Ask the owner only when the answer changes what you build.
2. **Spec:** one spec per implementer call (see Spec format). A step with
   more than about three deliverables is split into several specs.
3. **Implement:** the `implementer` subagent, one spec per call.
4. **Verify:** the spec's command, then the flows and snapshots you
   touched (see Token budget).
5. **Review:** for a change over about 150 lines or across more than three
   files, run a fresh subagent on `git diff` against the spec. It reports
   only gaps that break the spec or a flow, not style.
6. **Commit** by path, as your mode says.
7. **Report:** end the turn with exactly this and nothing after it:
   1. **Name:** the feature in plain words, then the branch (and PR in
      cloud).
   2. **How it looks:** one or two screenshots of what changed (a `snap.py`
      scene, `jscheck.py ... --shot`, or `gframes.py` for the cutscene),
      saved outside the repo and sent to the owner. Never commit them.
   3. **Try:** one `powershell` block, one command, from your mode file,
      plus one line saying where to look and what to do there.
   4. **Commit:** one `powershell` block, one command, from your mode file
      (shared mode: the one line it gives).
   5. **Look at:** at most three bullets, plus anything left open.

If the owner replies with changes, do another round on the same branch
and end with the same report.

## Git safety

- Never `git push` (cloud mode: only your own `claude/` branch).
- Never merge or commit onto `main` except a shared-mode commit.
- Never delete branches.
- Never `gh pr merge`.

`.claude/hooks/git-guard.py` enforces this; do not work around it. The
owner's `--commit` and GitHub Desktop are the only way to `main`/origin.

## Main session role

The main session explores through `Explore`, designs the change, writes
specs, reviews the diff the implementer returns and writes the follow-up
spec.

- The main session never calls Write or Edit on source files, and never
  modifies files through Bash (`sed -i`, heredocs, `>`/`>>`, scripts that
  write). The only exception is a single-line change where the spec would
  take longer than the edit. Cost and convenience are not exceptions.
- Docs, `.claude/handoff.md` and `.claude/MAP.md` rows are not source
  files; edit those directly.
- Explore before designing. Grep `.claude/MAP.md` first, then send code
  reading to `Explore` and work from its summary. The only file you read
  yourself is the one you are writing a spec against, and only the range
  you need. A file read here costs Opus tokens on every later turn; Explore
  runs on Haiku. Do not set `CLAUDE_CODE_SUBAGENT_MODEL`.

## Context budget

Quality drops as a context grows, long before the window is full, and the
earliest instructions go first. Fresh contexts win, so each context stays
small and has a hard line.

- `.claude/hooks/context-watch.py` measures every context after every tool
  call. Main session line: `LIMIT` (140k). Subagent lines: `SUB_LIMITS`
  (Explore and Plan 100k, implementer 60k). At 80% it warns; past the line
  it says to finish. A subagent that reaches `HARD` (1.5 times its line)
  has every further tool call denied and must write its report from what
  it has.
- On `SubagentStop` the hook reports each subagent's peak. "Over the line"
  means the spec or Explore prompt was too wide: next time name the file,
  function and line range, or split the task.
- Main session past its line: finish only the current atomic step (an
  implementer already running may finish; start nothing new), verify,
  commit, then follow your mode file's "Context full" rule.
- `.claude/handoff.md` (gitignored), under 80 lines, no code, headings:
  **Goal** (the owner's words), **Done** (commits with hashes), **In
  progress** (files, state, last spec sent), **Next** (numbered; the first
  step concrete enough to start cold), **Decisions** (each with its why),
  **Gotchas** (found this session, not in the map), **Verified** (flows and
  snapshot runs that passed, and which are pending), **Foreign edits**
  (uncommitted paths that were not yours).
- The SessionStart hook prints a handoff it finds (also after `/clear`).
  That session restates the plan in two lines, continues from Next, never
  redoes anything under Done, and deletes the file once absorbed.
- Also write a handoff whenever a turn must end with work half done (an
  error you cannot get past, a question only the owner can answer).

## Token budget

These rules apply to the main session, Explore and the implementer alike.

- **The map is `.claude/MAP.md`.** `Grep -n` it for the file, function or
  concept and `Read` only those lines (`offset`/`limit`). Never read it
  whole and never re-survey the repo; when a grep proves the map wrong,
  fix the row. New files, moved functions and new exports get their row
  fixed in the same commit (branches: see your mode file).
- **Never read a whole file over 300 lines.** The map's top lists those
  over 500. Grep the name in the file, then `Read` around the hit.
  Function names do not drift; line numbers do.
- **Never open** `cv.pdf`, `media/`, `Temporary VoidScape Media/`,
  `snapshots/` or `__pycache__/`. `Glob` or `ls` them for names only.
- **Keep command output out of context:** pipe long output through
  `Select-Object -Last 30` / `tail -n 30`, or grep it for errors.
- **Explore prompts are narrow:** name the file, function or concept, tell
  it to grep `.claude/MAP.md` first, ask for `file:line` anchors and a
  summary, not code bodies.
- **Specs carry their own anchors.** The implementer has `omitClaudeMd:
  true` and never sees this file, the rules or the map.
- **One file per implementer call** unless the change genuinely spans
  files.
- **Test only the flows you touched:** `py -3 tools/nav-flows.test.py
  <flow>`. The full suite (20 flows) runs only before a commit that
  touches navigation, the gate or storage. Three checks fail on `main` and
  are not a regression signal: `gate-exits` / `worklink` "lands on Work"
  (the scroll lands 72 px above the section). The case pages' toys are
  covered by `links`, `header`, `shell`, `worklink` and `twotabs`; `py -3
  tools/snap.py capture <name>` fails a `page-*` scene on any console
  error, which is the toys' error check (its clock is frozen, so only the
  first synchronous frame paints).
- **Screenshot regression is mandatory for any change that paints or
  styles:** `py -3 tools/snap.py capture <name>` (about 3.5 min, 50
  scenes) before touching code and again after, then `py -3 tools/snap.py
  compare <before> <after>`: `same` on every scene you did not mean to
  change. Runs live in `snapshots/` (gitignored), so a fresh worktree or
  clone captures its own "before".

## Delegation

- All code changes go to the `implementer` subagent, one spec per call.
  The spec is complete enough that it never chooses a name, a location or
  a design.
- Parallel implementer calls only when their files are completely
  separate. Several tasks each adding a `<script>` line to `index.html`:
  each edits only its own line with one `Edit`, re-reading and retrying if
  the file changed underneath it.
- Parallel tasks that must edit the same file (worktree and cloud mode
  only): use `implementer-wt` instead. Each runs in its own worktree cut from your `HEAD`, so commit
  first; each commits on its own branch and reports it. Merge the branches
  one at a time with `git merge --no-ff`, resolve, re-run the flows.
- An implementer report that says "blocked" or "hit the context line":
  never resume it with SendMessage (that reloads its full context). Write a
  narrower spec for a fresh call.

## Spec format

Every implementer call contains:

1. **Target files:** the exact path of every file to create or edit, and
   the function names to grep for so it reads only that region.
2. **Symbols:** exact names and full signatures for every function,
   method, class, variable or export to add or change.
3. **Logic steps:** the implementation as an ordered, numbered list.
4. **Edge cases:** each one and exactly how to handle it.
5. **Do not touch:** files, symbols or behaviour that must stay unchanged,
   including foreign edits already in a target file (shared mode).
6. **Style:** for drawing work, the rules from `.claude/rules/art-style.md`
   that apply; for readings, from `.claude/rules/instruments.md`.
7. **Verification:** the exact command, or "none". Never `serve.py` (it
   blocks). Browser behaviour: `py -3 tools/nav-flows.test.py <flows>`,
   which runs its own server and exits. Only the back/forward cache still
   needs a manual check. There is no `node`; a passing flow is the syntax
   check.

## Domain rules

- Drawing anything (Rex kingdoms, Mainland factions, any new place):
  `.claude/rules/art-style.md`.
- Instruments, sites, readings, HUD tiles: `.claude/rules/instruments.md`.

Both load automatically when you read a file they cover; read them
yourself before designing in those areas.

## Layout

No framework, no bundler, no npm. GitHub Pages user site, so the pages
and site assets stay at the root; everything else lives in a folder.

```
index.html 404.html projects/ media/ cv.pdf robots.txt sitemap.xml .nojekyll
serve.py serve.bat            local no-cache server (PORT env, default 8765)
css/                          style, gate, beacon, bridge, play
js/lib/                       util, paint, pacer
js/site/                      xp, entry, intro, surge, embed, lazy-video
js/hud/                       instruments, tiles-nav, tiles-sys
js/bridge/                    bridge core + 8 parts, bridge-sites, bridge-voice, bridge-log, marks, lamp, planet
js/depths/                    depths core + zero, voidscape, heavylight, conclusus, lore
js/ship/                      voidship, voidship-art, voidship-prow
js/gamedev/                   storm, forge, forge-guns, forge-missions, zones
js/gdworld/                   gdworld core + gd-zero, gd-voidscape, gd-heavylight, gd-conclusus
js/world/                     world core + 8 painters; art/ = one file per place + rex-kit, land-kit
js/genesis/                   the cutscene: genesis-state ... genesis (full list in MAP.md)
js/pages/                     play (the case-page canvas layer) + one toy per case page
tools/                        nav-flows.test.py, snap.py, bump.py, gframes.py, jscheck.py, try.py
.claude/                      MAP.md, modes/, rules/, hooks/, agents/, settings.json, launch.json, handoff.md (gitignored)
```

## Commands

Local commands use `py -3`; the cloud container has only `python3` (see
`.claude/modes/cloud.md`).

- **Build:** none.
- **Run:** `py -3 serve.py`, then `http://127.0.0.1:8765/` (the desktop
  preview runs it from `.claude/launch.json` on a free port).
- **Test:** `py -3 tools/nav-flows.test.py [flows]` (`--list` names them):
  `first`, `gate-exits`, `back`, `reload`, `worklink`, `deeplink`,
  `returning`, `wordmark`, `reset`, `genesis`, `twotabs`, `header`,
  `shell`, `phone`, `depths`, `rex`, `watcher`, `bridge`, `landdepths`,
  `links`. It, `snap.py` and `try.py` pick free ports, so worktrees can
  test at once.
- **Screenshots:** `py -3 tools/snap.py capture <name>`, `compare <a> <b>`,
  `list`.
- **Cutscene frames:** `py -3 tools/gframes.py <run> [beat ...]` writes
  `snapshots/frames/<run>/<beat>.png`.
- **JS check:** `py -3 tools/jscheck.py <files> --eval "<js>" [--shot
  out.png]` loads files in a headless page.
- **Cache-bust:** `py -3 tools/bump.py` rewrites every `?v=`. Who may run
  it depends on the mode.
- **Git:** stage by path, always. `.gitignore` covers `__pycache__/`,
  `*.pyc`, `snapshots/`, `.claude/worktrees/`, `.claude/handoff.md` and
  `Temporary VoidScape Media/`. `.claude/hooks/git-guard.py` blocks
  blanket git (`add -A`/`.`, `commit -a`, `stash`, `checkout --`,
  `restore`, `reset --hard`, `clean`, `rebase`, force push). Do not work
  around it; if the owner wants one, they run it themselves.
- **Commands shown to the owner run in Windows PowerShell 5.1:** never
  `&&`, `||`, `$(...)` or bash `if`; one command per block, or chain with
  `;`. The Bash tool is fine for your own use.
- **No scratch files in the repo.** GitHub Pages publishes every committed
  file; logs, notes and screenshots go in the session's scratchpad.
