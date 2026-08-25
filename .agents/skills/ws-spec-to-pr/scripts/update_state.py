#!/usr/bin/env python3
"""Frozen twin: exec Node update_state.cjs with the same argv.

Canonical invoke:
    node {skillsRoot}/ws-spec-to-pr/scripts/update_state.cjs dispatch|finish|bypass <state> ...

Reads project hub `{sharedDir}/config.json` via the Node SoT (workflow_state.cjs).
Do not reimplement dispatch/finish here — parsers drift from workflow_state.cjs.
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

CJS = Path(__file__).resolve().with_name("update_state.cjs")


def resolve_node() -> str:
    explicit = os.environ.get("NODE")
    if explicit:
        return explicit
    found = shutil.which("node")
    if found:
        return found
    sys.stderr.write("ERROR: node is required to run update_state.py (SoT is update_state.cjs)\n")
    raise SystemExit(1)


def main() -> int:
    if not CJS.is_file():
        sys.stderr.write(f"ERROR: missing Node SoT {CJS}\n")
        return 1
    return subprocess.call([resolve_node(), str(CJS), *sys.argv[1:]])


if __name__ == "__main__":
    raise SystemExit(main())
