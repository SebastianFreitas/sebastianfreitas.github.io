"""Regression: the boot log must finish signing in before the gate opens.

Run: py -3 boot-gate.test.py
"""

RATE = 90  # chars / second, matches bootTick
HOLD = 0.13  # seconds between lines, matches bootTick
SIGN_IN_AT = 0.9  # finishLoading delay from bootAt
DT = 1 / 60


def run(*, wait_for_sign_in, pointer_line):
    boot_lines = ["link established", pointer_line]
    boot_idx = 0
    boot_char = 0.0
    boot_line = None
    boot_hold = 0.0
    boot_ready = False
    boot_signed = False
    typed = []
    t = 0.0
    gate_at = None
    signed_at = None

    def finish_loading():
        nonlocal boot_signed, signed_at
        boot_lines.append("provisional entry: unfiled surveyor · ref ABCD")
        boot_lines.append("level 0 · claim the beacon to enter")
        boot_signed = True
        signed_at = t

    def tick(dt):
        nonlocal boot_idx, boot_char, boot_line, boot_hold, boot_ready, gate_at
        if boot_ready:
            return
        if boot_hold > 0:
            boot_hold -= dt
            return
        if boot_line is None:
            if boot_idx >= len(boot_lines):
                if wait_for_sign_in and not boot_signed:
                    return
                boot_ready = True
                gate_at = t
                return
            boot_line = True
            boot_char = 0.0
        full = boot_lines[boot_idx]
        boot_char = min(len(full), boot_char + dt * RATE)
        if int(boot_char) >= len(full):
            typed.append(full)
            boot_idx += 1
            boot_line = None
            boot_hold = HOLD

    # Keep the clock running past the 900ms timer even if the gate
    # already opened — that's how the page actually behaves.
    while t < 4 and (not boot_ready or t < SIGN_IN_AT + DT):
        tick(DT)
        t += DT
        if not boot_signed and t >= SIGN_IN_AT:
            finish_loading()

    return {
        "boot_ready": boot_ready,
        "typed": typed,
        "gate_at": gate_at,
        "signed_at": signed_at,
    }


def assert_true(cond, msg):
    if not cond:
        raise AssertionError(msg)


POINTER = "input: pointer · drag anywhere to travel"
TOUCH = "input: touch · drag with one finger"

# The shorter touch prompt finishes well before 900ms, so the old
# "open the gate as soon as the queue is empty" rule skipped sign-in.
broken = run(wait_for_sign_in=False, pointer_line=TOUCH)
assert_true(broken["boot_ready"], "old path should still open a gate")
assert_true(
    not any(l.startswith("provisional entry") for l in broken["typed"]),
    "old path skipped identity lines — that is the bug",
)
assert_true(
    broken["gate_at"] < broken["signed_at"],
    "old path opened the gate before finishLoading ran",
)

for line in (POINTER, TOUCH):
    fixed = run(wait_for_sign_in=True, pointer_line=line)
    assert_true(fixed["boot_ready"], f"gate should open ({line})")
    assert_true(fixed["signed_at"] is not None, "finishLoading should run")
    assert_true(fixed["gate_at"] > fixed["signed_at"], "gate must open after sign-in")
    assert_true(
        any(l.startswith("provisional entry") for l in fixed["typed"]),
        "identity line must actually type out",
    )
    assert_true(
        any(l.startswith("level 0") for l in fixed["typed"]),
        "level line must actually type out",
    )
    assert_true(
        len(fixed["typed"]) == 4,
        f"expected 4 boot lines, got {len(fixed['typed'])}",
    )

print("ok — gate waits for sign-in; identity lines type out")
