---
step: 7
slug: restore-automode-continuous-orchestration
workflowId: restore-automode-continuous-orchestration-20260927T023632Z
status: completed
startedAt: "2026-09-27T03:03:27.086Z"
endedAt: "2026-09-27T03:03:27.086Z"
acRefs: []
---
# Testing — restore-automode-continuous-orchestration

| Command | Exit |
|---------|------|
| `node test/test-liveness-checkpoints.js` | 0 (Step 5, same tree as G2 commit) |
| `npm run test` (`verification.backendTest`) | 0 (Step 5) |
| `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs` | 0 (Step 5) |
| sabotage `run_sabotage.cjs` | helper passed, `testExitCode` 1, restored |

No product code changed after that run. Browser checks do not apply (docs and test only).
