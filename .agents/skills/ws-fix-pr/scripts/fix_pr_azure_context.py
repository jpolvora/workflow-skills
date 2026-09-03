#!/usr/bin/env python3
"""Thin shim — forwards to ws-spec-provider-azure-devops canonical script."""
from __future__ import annotations

import runpy
import sys
from pathlib import Path

_TARGET = (
    Path(__file__).resolve().parents[2]
    / "ws-spec-provider-azure-devops"
    / "scripts"
    / "fix_pr_azure_context.py"
)

if not _TARGET.is_file():
    raise SystemExit(f"Canonical script not found: {_TARGET}")

sys.argv[0] = str(_TARGET)
runpy.run_path(str(_TARGET), run_name="__main__")
