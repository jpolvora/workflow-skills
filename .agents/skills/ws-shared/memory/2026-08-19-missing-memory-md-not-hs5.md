### [2026-08-19] Missing MEMORY.md must not HS-5 the pipeline
- **Layer**: `Infrastructure`
- **Module**: `ws-spec-to-pr / check_memory_conflict.py / STEP-DISPATCH`
- **Severity**: `High`
- **PathPattern**: `.agents/skills/ws-spec-to-pr/scripts/check_memory_conflict.py, test/test-pattern-consult.js`
- **Scenario / Context**: Wiring `check_memory_conflict.py` into Step 1/4 mapped exit 1 to HS-5 STOP. The script used exit 1 for both a missing plan and a missing MEMORY.md. Hybrid/global installs often have no project MEMORY.md, so every Step 1/4 aborted a valid plan.
- **DO NOT**: Treat a missing MEMORY.md as a fatal pipeline error (exit 1 / HS-5) when the consult is advisory.
- **INSTEAD DO**: Exit 0 with consult-skipped (empty traps) when MEMORY.md is absent. Keep exit 1 for a missing plan file only. Cover with `test-pattern-consult.js`.
