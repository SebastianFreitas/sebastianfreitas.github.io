"""Agent guard (PreToolUse on Agent, main session and subagents): no call
passes its own `model` or `effort`, and a call that sets `run_in_background`
to anything but false is refused.

A per-call model or effort beats the agent file's frontmatter (docs:
sub-agents, model resolution order), so one stray call could run a
reviewer on Fable at high while the owner picked Opus medium. Model and
effort come only from the agent files and the owner's pick in the app
(playbook "Models", owner 2026-10-12).

The Agent tool launches in the background unless told otherwise. In this
workflow nothing happens in the window while a subagent works: the run
window only manages implementers, the prepare window waits for Explore.
A background implementer ends the turn while files are still being
written, the Stop guard (and a project's verify guard) then blocks, the
session says "stopping on purpose", the hand-back arrives as a new
message, and that cycle repeated for every spec (one session took 24
Stop-guard blocks and ended at 164k; 72 of 100 implementer launches had
no run_in_background flag; review of 2026-10-01). Parallel subagents are
several Agent calls in one message, which run at the same time and
return together, so waiting for them loses nothing.

A call with no run_in_background key passes in every session: the desktop
app's Agent tool now always runs subagents in the background and has no
such field, and the headless CLI's has none either (street-setbacks phase
1, 2026-10-05). The harness reports a subagent's exit; the main session
waits for that notice and never polls.

Never fails the hook: any error allows the call (exit 0).
"""
import json
import sys

WINDOW_REFUSED = {"general-purpose", "claude"}


def main():
    d = json.load(sys.stdin)
    ti = d.get("tool_input") or {}
    who = ti.get("subagent_type") or "subagent"
    if who.split(":")[-1] in WINDOW_REFUSED and not d.get("agent_id"):
        print(json.dumps({"hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": (
                f"Agent guard: no {who} from a main window: run the "
                "command yourself, or use implementer / researcher / "
                "Explore (playbook \"Delegation\").")}}))
        return
    pinned = [k for k in ("model", "effort") if ti.get(k)]
    if pinned:
        print(json.dumps({"hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": (
                f"Agent guard: call the {who} again without "
                f"{' and '.join(pinned)} (same prompt). Model and effort come "
                "only from the agent file and the owner's pick in the app "
                "(playbook \"Models\").")}}))
        return
    if ti.get("run_in_background") is False:
        return
    # Headless autoplan sessions (AUTOPLAN=1) have no background agents, so
    # their Agent tool has no run_in_background field: a missing key is foreground.
    if "run_in_background" not in ti:
        return
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": (
            f"Agent guard: run_in_background must be false here. Call the "
            f"{who} again with run_in_background: false (same prompt). A "
            "background subagent ends the turn while it is still writing, "
            "and the Stop guard then blocks every hand-back. Parallel "
            "subagents: several Agent calls in one message, all "
            "with run_in_background: false.")}}))


try:
    main()
except Exception:
    pass
