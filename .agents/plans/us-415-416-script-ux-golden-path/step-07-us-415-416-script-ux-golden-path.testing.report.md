---
step: 7
slug: us-415-416-script-ux-golden-path
workflowId: us-415-416-script-ux-golden-path-20260924T190500Z
status: completed
startedAt: "2026-09-24T20:20:00.000Z"
endedAt: "2026-09-24T20:45:00.000Z"
acRefs: []
---
# Testing report — us-415-416-script-ux-golden-path

Test surface probe: `hasTestSurface: true`, alias `backendTest: npm run test`.
Mutation substep skipped per config (`verification.mutationTest` empty,
`defaults.skipMutationTesting: true`); regression sabotage ran instead.

## Results

- `npm run test` (full local mode, 130 suites): all passed, including new
  suite 56/130 `test/test-script-ux-golden-path.js`.
- `node test/test-script-ux-golden-path.js` standalone: ok (exit 0).
- `node test/test-ac-ledger.js` standalone after the ledger edits: ok.
- Regression sabotage (`run_sabotage.cjs --test "npm run test"` with the
  phantom fail-closed check neutralized via invert patch): suite failed as
  expected (`testExitCode: 1`, reason `test-failed-as-expected`), target bytes
  restored. Proves the new suite guards the AC6 contract.
- `ws-check-harness`: run at Step 8 pre-ship (see step-08 result).

No test failures, no fix loop. AC8 walkthrough driver output is recorded in
the step-08 result.
