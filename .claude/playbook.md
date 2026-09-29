# Playbook: read before writing the first spec of a turn

Shared by every project. The project's own part (spec style and
verification details, tool commands) is `.claude/project/playbook.md`:
read it too.

## Delegation

- Parallel implementer calls only on completely separate files. Several
  tasks each adding one line to the same file (a `<script>` tag, a
  registry entry): each edits only its own line with one `Edit`,
  re-reading and retrying if the file changed.
- Parallel tasks on the same file (worktree and cloud mode only):
  `implementer-wt`, each in its own worktree cut from your `HEAD`, so
  commit first. Merge their branches one at a time with `git merge
  --no-ff`, resolve, re-run the checks.
- A new file over about 250 lines: the spec writes a skeleton first and
  adds function groups with Edits. One big Write dies on the output cap.
- An implementer that reports "blocked" or "hit the context line": never
  resume it with SendMessage (that reloads its whole context); write a
  narrower spec for a fresh call.

## Spec format

Complete enough that the implementer never chooses a name, a location or
a design. The implementer sees only the spec and
`.claude/project/implementer.md`, never `CLAUDE.md`. Every spec has:

1. **Target files:** the exact path of every file to create or edit, and
   the function names to grep so it reads only that region.
2. **Symbols:** exact names and full signatures to add or change.
3. **Logic steps:** an ordered, numbered list.
4. **Edge cases:** each one and exactly how to handle it.
5. **Do not touch:** files, symbols and behaviour that stay unchanged,
   including foreign edits already in a target file (shared mode).
6. **Style:** the domain rules that apply (`.claude/rules/`), copied in;
   the project playbook says which.
7. **Verification:** the exact command, or "none". Never a command that
   blocks (a dev server, an editor window); the project playbook names
   the checks that run and exit.
