---
slug: us-310
title: Testing plan — repeated file-list flags
status: active
step: 7
workflowId: us-310-20260911T041227Z
startedAt: "2026-09-11T04:12:27.000Z"
endedAt: "2026-09-11T04:42:00.000Z"
acRefs: []
---
## Testing plan

Surface probe: `hasTestSurface: true`, alias `backendTest` → `npm run test`. No skip (`skipTesting` false).

Matrix:
1. Targeted: `node test/test-repeated-file-list-flags.js` (T1–T8, AC1–AC8 / NS1–NS6) — exit 0 required.
2. Stack scan: `scan_stack_invariants.cjs --stack typescript-node` — exit 0 required.
3. Integrity: `npm run verify-integrity` — exit 0 required.
4. Full: `npm run test` (`backendTest`) on the final tree — exit 0 required; remove `npm pack` tarball + restore benchmark timestamp side effects after.
5. Mutation substep: skipped — `verification.mutationTest` unset and `defaults.skipMutationTesting: true` (log per policy).
6. Regression sabotage: `run_sabotage.py --test "npm run test"` — already executed in Step 4 (`test-failed-as-expected`, restored true, exit 0); cited as evidence, not re-run (product tree identical — committed G2 ba9935d6, tree clean).
