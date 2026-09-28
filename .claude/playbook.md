# Playbook: read before writing the first spec of a turn

Moved out of CLAUDE.md (2026-09-28) so sessions that write no spec do
not pay for it every turn. Everything here is still a rule.

## Delegation

- Parallel implementer calls only on completely separate files. Several
  tasks each adding a `<script>` line to `index.html`: each edits only its
  own line with one `Edit`, re-reading and retrying if the file changed.
- Parallel tasks on the same file (worktree and cloud mode only):
  `implementer-wt`, each in its own worktree cut from your `HEAD`, so
  commit first. Merge their branches one at a time with `git merge
  --no-ff`, resolve, re-run the flows.
- A new file over about 250 lines: the spec writes a skeleton first and
  adds function groups with Edits. One big Write dies on the output cap.
- An implementer that reports "blocked" or "hit the context line": never
  resume it with SendMessage (that reloads its whole context); write a
  narrower spec for a fresh call.

## Spec format

Complete enough that the implementer never chooses a name, a location or
a design. Every spec has:

1. **Target files:** the exact path of every file to create or edit, and
   the function names to grep so it reads only that region.
2. **Symbols:** exact names and full signatures to add or change.
3. **Logic steps:** an ordered, numbered list.
4. **Edge cases:** each one and exactly how to handle it.
5. **Do not touch:** files, symbols and behaviour that stay unchanged,
   including foreign edits already in a target file (shared mode).
6. **Style:** drawing work copies the rules that apply from
   `.claude/rules/art-style.md`; readings from `.claude/rules/instruments.md`.
7. **Verification:** the exact command, or "none". Never `serve.py` (it
   blocks). Browser behaviour: `py -3 tools/nav-flows.test.py <flows>`,
   which runs its own server and exits. There is no `node`: a passing
   flow is the syntax check.

## Commands

Local tools run with `py -3`; the cloud container has only `python3`.

- **Run:** `py -3 serve.py`, then `http://127.0.0.1:8765/` (the desktop
  Preview uses `.claude/launch.json`). The test tools pick free ports.
- **Cutscene frames:** `py -3 tools/gframes.py <run> [beat ...]` writes
  `snapshots/frames/<run>/<beat>.png`.
- **JS check:** `py -3 tools/jscheck.py <files> --eval "<js>" [--shot
  out.png]` loads files in a headless page.
- **Cache-bust:** `py -3 tools/bump.py` rewrites every `?v=`. Who may run
  it depends on the mode.
