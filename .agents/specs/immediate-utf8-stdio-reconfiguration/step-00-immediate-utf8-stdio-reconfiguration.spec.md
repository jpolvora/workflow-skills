---
id: null
slug: immediate-utf8-stdio-reconfiguration
title: "Additional Fix: Immediate UTF-8 Stdio Reconfiguration"
source: free-text
specDate: 2026-07-22
---

# Specification — Additional Fix: Immediate UTF-8 Stdio Reconfiguration

## Description

While auditing `check_workflows.py`, ensure `ensure_utf8_stdio()` is invoked immediately at module import time (top-level), setting `os.environ["PYTHONIOENCODING"] = "utf-8"` and reconfiguring `sys.stdout` / `sys.stderr` / `sys.stdin` to UTF-8 before any output operations.

This prevents Windows console `UnicodeEncodeError: 'charmap' codec can't encode character` crashes when printing Unicode symbols and emojis (🔍, ✅, ❌, 🔴, 📝) on default cp1252 Windows terminals.

## Acceptance Criteria

- **AC1:** `ensure_utf8_stdio()` in `.agents/skills/check-workflows/scripts/check_workflows.py` sets `os.environ["PYTHONIOENCODING"] = "utf-8"` and reconfigures `sys.stdin`, `sys.stdout`, `sys.stderr` to UTF-8.
- **AC2:** `ensure_utf8_stdio()` is called immediately at the top-level of `check_workflows.py` right after imports/definitions.
- **AC3:** `python .agents/skills/check-workflows/scripts/check_workflows.py` executes cleanly without Unicode encoding exceptions.
- **AC4:** Test suite (`npm run tests -- --local`) and integrity check pass clean.
