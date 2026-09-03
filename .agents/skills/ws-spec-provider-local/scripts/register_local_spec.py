#!/usr/bin/env python3
"""Frozen twin: exec Node register_local_spec.cjs with the same argv.

Canonical invoke:
    node {skillsRoot}/ws-spec-provider-local/scripts/register_local_spec.cjs --input <spec> ...

Do not reimplement promotion here — the CJS path stamps artifact frontmatter
required by validate_state.cjs --pre-advance.
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

CJS = Path(__file__).resolve().with_name("register_local_spec.cjs")


def resolve_node() -> str:
    explicit = os.environ.get("NODE")
    if explicit:
        return explicit
    found = shutil.which("node")
    if found:
        return found
    sys.stderr.write("ERROR: node is required to run register_local_spec.py (SoT is register_local_spec.cjs)\n")
    raise SystemExit(1)


def main() -> int:
    if not CJS.is_file():
        sys.stderr.write(f"ERROR: missing Node SoT {CJS}\n")
        return 1
    return subprocess.call([resolve_node(), str(CJS), *sys.argv[1:]])


if __name__ == "__main__":
    raise SystemExit(main())
