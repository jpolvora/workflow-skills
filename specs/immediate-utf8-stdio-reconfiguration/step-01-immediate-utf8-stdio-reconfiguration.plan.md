---
slug: immediate-utf8-stdio-reconfiguration
title: "Additional Fix: Immediate UTF-8 Stdio Reconfiguration"
status: "plan to be refined"
---

## 0. Summary & Business Rules
Ensure `ensure_utf8_stdio()` is invoked immediately at module import time (top-level) in `.agents/skills/check-workflows/scripts/check_workflows.py`, setting `os.environ["PYTHONIOENCODING"] = "utf-8"` and reconfiguring stdio streams to UTF-8 before any output or simulation operations occur.

## 1. Definition of Ready & Scope
- **AC1:** `ensure_utf8_stdio()` sets `os.environ["PYTHONIOENCODING"] = "utf-8"` and reconfigures `sys.stdin`, `sys.stdout`, `sys.stderr` to UTF-8.
- **AC2:** `ensure_utf8_stdio()` is called immediately at the top-level of `check_workflows.py`.
- **AC3:** `python .agents/skills/check-workflows/scripts/check_workflows.py` executes without Unicode encoding issues.
- **AC4:** `npm run tests -- --local` and integrity checks pass clean.

## 2. Technical Design & Architecture
- **`.agents/skills/check-workflows/scripts/check_workflows.py`**:
  - Update `ensure_utf8_stdio()` to set `os.environ["PYTHONIOENCODING"] = "utf-8"`.
  - Invoke `ensure_utf8_stdio()` immediately after definition at module level.

## 3. Step-by-Step Plan
1. Edit `check_workflows.py` to add `os.environ["PYTHONIOENCODING"] = "utf-8"` inside `ensure_utf8_stdio()` and invoke `ensure_utf8_stdio()` at top-level.
2. Run `python .agents/skills/check-workflows/scripts/check_workflows.py` to verify output.
3. Run `npm run generate-integrity` and `npm run tests -- --local` to verify harness & integrity.

## 4. Permissions, Tenancy & i18n
N/A (Python workflow script).

## 5. Test Coverage
- AC1-AC3: Execute `check_workflows.py` and verify zero Unicode encoding errors.
- AC4: Run `npm run tests -- --local` and `node bin/generate-skill-integrity.js --check`.

## 6. Invariants (Do Not Violate)
- Do not break existing cross-platform behavior.
- Maintain LF-canonical line endings.

## 7. Pre-PR Checklist
- [ ] Layer boundaries respected.
- [ ] Test cases cover all ACs.

## 8. Open Questions
None.
