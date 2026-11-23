"""Poll guard (PreToolUse on Bash and PowerShell, main session and
subagents): refuses sleeping and loops that sleep.

In the 2026-10-01 to 10-12 transcripts 88 implementer subagents and several
run supervisors waited for background commands with
`until [ -s "$F" ]; do sleep 5; done` or `sleep 30; cat out`, against the
plan skill's run.md ("Do not poll or sleep: the harness notifies when it
exits") and unattended.md ("no sleeps"). A check belongs in the foreground
with the call's `timeout`.

Refused: a shell loop (until/while/for ... do ... done) whose body sleeps; a
bash `sleep N` of 10 s or more; `Start-Sleep` of 10 s or more. Shorter
sleeps outside a loop pass. A Python `time.sleep(` is not a shell sleep.

Never fails the hook: any error allows the call (exit 0).
"""
import json
import re
import sys

LOOP = re.compile(r"\b(until|while|for)\b[^\n]*?\s*\n?\s*\bdo\b[\s\S]*?\bdone\b")
ANY_SLEEP = re.compile(r"(?<![\w.\-$])sleep\b|Start-Sleep", re.I)
SLEEP = re.compile(r"(?<![\w.\-$])sleep\s+(\d+(?:\.\d+)?)([smhd]?)(?!\w)")
PS_SECONDS = re.compile(
    r"Start-Sleep\s+(?:-(?:seconds|s)\s+)?(\d+(?:\.\d+)?)(?![\w.])", re.I)
PS_MILLIS = re.compile(
    r"Start-Sleep\s+(?:-\w+\s+\S+\s+)*-(?:milliseconds|m)\s+(\d+)(?!\w)", re.I)
UNIT = {"": 1, "s": 1, "m": 60, "h": 3600, "d": 86400}


QUOTED = re.compile(r'"[^"]*"|\'[^\']*\'')
# a quote that follows these is code for another shell, not text
CODE_ARG = re.compile(
    r"(?:\b(?:ba|z|da|k)?sh\s+(?:-\w+\s+)*-\w*c|\b(?:powershell|pwsh)(?:\.exe)?\s+(?:-\w+\s+)*-(?:command|c)"
    r"|\bcmd(?:\.exe)?\s+/[ck]|\beval)\s*$", re.I)


def mask_quotes(cmd):
    """The command with quoted strings replaced by x's, so a sleep or loop
    that is only mentioned in text never matches."""
    def mask(m):
        if CODE_ARG.search(cmd[:m.start()]):
            return m.group(0)  # code handed to another shell: check it as command text
        return m.group(0)[0] + re.sub(r"[^\n]", "x", m.group(0)[1:-1]) + m.group(0)[-1]
    return QUOTED.sub(mask, cmd)


def polls(cmd):
    """What matched ("loop" or "sleep N"), or "" when the command is fine."""
    cmd = mask_quotes(cmd)
    for m in LOOP.finditer(cmd):
        if ANY_SLEEP.search(m.group(0)):
            return "a shell loop that sleeps"
    for m in SLEEP.finditer(cmd):
        if float(m.group(1)) * UNIT[m.group(2)] >= 10:
            return "sleep " + m.group(1) + m.group(2)
    for m in PS_SECONDS.finditer(cmd):
        if float(m.group(1)) >= 10:
            return "Start-Sleep " + m.group(1)
    for m in PS_MILLIS.finditer(cmd):
        if int(m.group(1)) >= 10000:
            return "Start-Sleep -Milliseconds " + m.group(1)
    return ""


def main():
    d = json.load(sys.stdin)
    cmd = (d.get("tool_input") or {}).get("command") or ""
    hit = polls(cmd)
    if not hit:
        return
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": (
            "Poll guard: no sleeping or polling loops in Bash (matched: " +
            hit + "). Run a check "
            "or tool in the foreground with the call's timeout (up to "
            "600000 ms) and read its output; a command launched with "
            "run_in_background is reported by the harness when it exits, so "
            "end the turn or do other work instead of waiting (plan skill "
            "run.md Supervising, unattended.md). A sleep under 10 s outside "
            "a loop is allowed.")}}))


try:
    main()
except Exception:
    pass
