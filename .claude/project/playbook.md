# Portfolio playbook: the project half of `.claude/playbook.md`

## Spec details

- **Rules:** drawing work copies the rules that apply from
  `.claude/rules/art-style.md`; readings from `.claude/rules/instruments.md`.
- **Verification:** never `serve.py` (it blocks). Browser behaviour:
  `py -3 tools/nav-flows.test.py <flows>`, which runs its own server and
  exits. There is no `node`: a passing flow is the syntax check.

## Commands

Local tools run with `py -3`; the cloud container has only `python3`.

- **Run:** `py -3 serve.py`, then `http://127.0.0.1:8765/` (the desktop
  Preview uses `.claude/launch.json`). The test tools pick free ports.
- **Cutscene frames:** `py -3 tools/gframes.py <run> [beat ...]` writes
  `snapshots/frames/<run>/<beat>.png`.
- **JS check:** `py -3 tools/jscheck.py <files> --eval "<js>" [--shot
  out.png]` loads files in a headless page.
- **Toy check:** `py -3 tools/toyshot.py <page> [--y 0.4] [--t ms]`
  (exits 1 on a blank toy or a console error; read the PNG it names).
- **Cache-bust:** `py -3 tools/bump.py` rewrites every `?v=`. Who may run
  it depends on the mode.
