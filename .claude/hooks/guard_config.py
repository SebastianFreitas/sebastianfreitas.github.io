"""The project's .claude/project/file-guard.json, shared by the hooks that
read it (file-guard, session-start, git-guard, review-guard). Not a hook
itself: hooks.py never runs it. Keys are documented in file-guard.py;
this file loads them and matches globs. It also reads a transcript's
first prompt.

Globs are fnmatch (case-sensitive) on the forward-slash root-relative
path, where `*` also crosses `/`.
"""
import fnmatch
import json
import os
import re

CONFIG_PATH = ".claude/project/file-guard.json"


_ECHOES = ("<command-name>", "<local-command-caveat>", "<local-command-stdout>")


def first_prompt(transcript_path: str) -> str:
    """Text of the transcript's first real user prompt ("" if none). Reads
    lines only until that one; any error gives ""."""
    try:
        with open(transcript_path, encoding="utf-8") as f:
            for line in f:
                try:
                    e = json.loads(line)
                except ValueError:
                    continue
                if not isinstance(e, dict) or e.get("type") != "user" or e.get("isMeta"):
                    continue
                c = (e.get("message") or {}).get("content")
                if isinstance(c, list):
                    c = "\n".join(b.get("text") or "" for b in c
                                  if isinstance(b, dict) and b.get("type") == "text")
                if not isinstance(c, str) or not c.strip() or c.lstrip().startswith(_ECHOES):
                    continue
                return c
    except (OSError, ValueError, AttributeError):
        pass
    return ""


def load_config(root: str) -> dict:
    # Missing or bad JSON means no config.
    try:
        with open(os.path.join(root, CONFIG_PATH), encoding="utf-8") as f:
            cfg = json.load(f)
    except (OSError, ValueError):
        return {}
    return cfg if isinstance(cfg, dict) else {}


def generated_globs(cfg: dict) -> list[str]:
    return [str(e.get("glob", "")) for e in cfg.get("generated") or []
            if isinstance(e, dict) and e.get("glob")]


def quiet_globs(cfg: dict) -> list[str]:
    return [str(g) for g in cfg.get("quiet_dirty") or [] if g]


def matches_any(rel: str, globs: list[str]) -> bool:
    rel = rel.replace("\\", "/")
    return any(fnmatch.fnmatchcase(rel, g) for g in globs)


def quiet_line(n: int, globs: list[str]) -> str:
    return f"{n} files matching {', '.join(globs)} changed (not listed)"


SOURCE_SUFFIXES = {
    ".py", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".css", ".scss",
    ".html", ".gd", ".tscn", ".tres", ".gdshader", ".gdshaderinc", ".cs",
    ".cfg", ".sh",
}


def source_rule(cfg: dict) -> tuple[set[str], list[str]]:
    """(suffixes, exact paths) that count as source: `source_suffixes`
    replaces the default set, `source_files` adds paths."""
    suffixes = SOURCE_SUFFIXES
    if "source_suffixes" in cfg:
        suffixes = {s.lower() for s in cfg["source_suffixes"] or []}
    return suffixes, list(cfg.get("source_files") or [])


def map_rule(root: str, cfg: dict) -> tuple[str, bool] | None:
    """(map path, generated) from the `map` key, default .claude/MAP.md
    hand-written; None when the map file does not exist."""
    m = cfg.get("map") if isinstance(cfg.get("map"), dict) else {}
    path = str(m.get("path") or ".claude/MAP.md")
    if not os.path.isfile(os.path.join(root, path)):
        return None
    return path, bool(m.get("generated"))
