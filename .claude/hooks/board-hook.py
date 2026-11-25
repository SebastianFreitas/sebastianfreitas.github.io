"""Board hook (UserPromptSubmit, Stop): feeds the coordinator's board with no
model tokens. A prompt marks this chat working, a turn end stores the first
line of its last message; `tools/board.py` `record(event)` does the work.
Prints nothing, never blocks: every error exits 0.
"""
import importlib.util
import json
import os
import sys


def main():
    event = json.loads(sys.stdin.buffer.read().decode("utf-8", "replace"))
    here = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    path = os.path.join(here, "tools", "board.py")
    cwd = event.get("cwd") if isinstance(event, dict) else None
    if cwd:
        mine = os.path.join(cwd, "tools", "board.py")
        if os.path.isfile(mine):
            path = mine
    spec = importlib.util.spec_from_file_location("board", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    mod.record(event)


try:
    main()
except BaseException:
    pass
sys.exit(0)
