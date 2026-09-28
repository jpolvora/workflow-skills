---
slug: us-446
step: 2
workflowId: us-446-20260928T021400Z
status: completed
startedAt: "2026-09-28T02:14:00Z"
endedAt: "2026-09-28T02:21:51.000Z"
acRefs: []
---
# Plan Interview — us-446

## Interview registry

| ID | Class | Section | Gap | Status | Resolution | Resolution source | Evidence |
|---|---|---|---|---|---|---|---|
| G1 | blocking | 3, 5 | The regression must prove that neither `spawnSync` nor the frontend `execSync` receives an empty command. | closed | Stub both child-process runners before loading the CommonJS script, force the frontend-touched branch, and throw on empty or whitespace-only shell commands. | project | `.agents/skills/ws-ship-pr/scripts/verify.cjs`; `test/test-ship-verify-line-endings.js` |
| G2 | blocking | 3, 5 | The project test runner only executes tests registered in `test/test-suites.json`. | closed | Add the new regression test to the local and remote suites through the shared harness-efficiency list. | project | `test/run-tests.cjs`; `test/test-suites.json` |
| G3 | non-blocking | 2, 5 | The frontend test command currently has best-effort semantics while frontend build is fail-closed. | closed | Preserve that distinction for non-empty commands; only add the not-configured guard. | project | `.agents/skills/ws-ship-pr/scripts/verify.cjs` |
| G4 | non-blocking | 6, 7 | The upstream release process requires version projections and integrity verification before ship. | closed | Evaluate the patch bump and regenerate integrity at Step 8 after the feature diff is stable; do not mix release metadata into the defect implementation. | project | `AGENTS.md`; `package.json`; `bin/generate-skill-integrity.js` |
| G5 | non-blocking | 1, 8 | Existing empty/unconfigured aliases are intentional in this upstream consumer config. | closed | Treat empty strings and whitespace-only strings as skipped configuration, while preserving non-empty fallback commands when `.ws/config.json` is absent. | project | `.ws/config.json`; `.ws/STACK.md`; spec assumptions |

## Shared understanding

Confirmed in auto mode. No acceptance criterion or architectural boundary requires a user decision. The refined plan preserves the exact skip-note text, fail-closed non-empty behavior, frontend parity, and integrity/base-detection out-of-scope boundaries.
