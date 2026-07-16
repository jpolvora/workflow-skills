#!/usr/bin/env python3
"""Bulk-replace promoted skill path references after shared/ promotion."""
from pathlib import Path

ROOT = Path(".")
PROMOTED = [
    "caveman",
    "gabarito",
    "karpathy-guidelines",
    "spec-format",
    "goal-loop",
    "self-learning",
    "changelog",
]
SKIP_PARTS = {".git", "node_modules", ".cursor", "docs"}
EXTS = {".md", ".js", ".json", ".py", ".yml", ".yaml", ".html", ".sh"}


def should_skip(p: Path) -> bool:
    parts = set(p.parts)
    if parts & SKIP_PARTS:
        return True
    if p.suffix.lower() not in EXTS:
        return True
    # Keep migration plan/spec history as documentation of the old layout
    if "promote-shared-skills" in str(p).replace("\\", "/"):
        if "plans" in p.parts or p.name.endswith(".spec.md"):
            return True
    return False


def main() -> None:
    changed = []
    for path in ROOT.rglob("*"):
        if not path.is_file() or should_skip(path):
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except OSError:
            continue
        orig = text
        for skill in PROMOTED:
            text = text.replace(f"../shared/{skill}/", f"../{skill}/")
            text = text.replace(
                f".agents/skills/shared/{skill}/", f".agents/skills/{skill}/"
            )
            text = text.replace(f"skills/shared/{skill}/", f"skills/{skill}/")
        text = text.replace(
            "Do **not** use a top-level `.agents/skills/karpathy-guidelines/` path — that layout is obsolete.",
            "Canonical path is `.agents/skills/karpathy-guidelines/SKILL.md` (promoted installable skill).",
        )
        if text != orig:
            path.write_text(text, encoding="utf-8")
            changed.append(path.as_posix())
    print(f"updated {len(changed)} files")
    for c in changed:
        print(c)


if __name__ == "__main__":
    main()
