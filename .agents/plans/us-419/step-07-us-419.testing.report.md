---
step: 7
slug: us-419
workflowId: us-419
status: completed
startedAt: "2026-09-25T03:00:00.000Z"
endedAt: "2026-09-25T02:36:39.943Z"
acRefs: []
---
# Testing report — us-419 (step-07)

Probe: `hasTestSurface: true` → full run required (no skip).

## Results (observed this run)

- `node test/test-ws-us419-followups.js` → ok (AC1–AC7, 7/7 blocks).
- `npm run tests` (mode=local, 133 entries incl. new
  `test-ws-us419-followups.js` as 103/133) → all 133 passed, exit 0.
- `npm run verify-integrity` → matches tree (after regen in this run).
- Mutation substep: skipped per config (`defaults.skipMutationTesting: true`,
  no `verification.mutationTest` set) — logged, not run.
- Regression sabotage: covered by ledger NS1–NS5 observed-passing links
  (step-5 score 10, no cap).

No failures. Advance to Step 8.
