#!/usr/bin/env python3
"""Count LOC baseline for workflow telemetry (safe path separators)."""
import os

ROOT = "."
EXTS = {".md", ".js", ".json", ".yml", ".yaml", ".sh", ".html", ".css"}
SKIP_PARTS = {"node_modules", ".git", "test", "docs"}


def main() -> None:
    n = 0
    for dp, dirs, fs in os.walk(ROOT):
        parts = set(os.path.normpath(dp).replace(os.sep, "/").split("/"))
        if parts & SKIP_PARTS:
            dirs[:] = []
            continue
        for f in fs:
            if os.path.splitext(f)[1].lower() not in EXTS:
                continue
            path = os.path.join(dp, f)
            try:
                with open(path, encoding="utf-8", errors="ignore") as fh:
                    n += sum(1 for _ in fh)
            except OSError:
                pass
    print(f"loc_baseline {n}")


if __name__ == "__main__":
    main()
