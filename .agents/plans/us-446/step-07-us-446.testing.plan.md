---
slug: us-446
step: 7
workflowId: us-446-20260928T021400Z
status: "testing plan complete"
---

# Testing Plan — us-446

## Surface

The change touches a Node CommonJS verification script and its JavaScript regression test. No browser, frontend application, database, migration, or service-stack test is applicable.

## Required checks

1. Run `node test/test-ship-verify-empty-aliases.js`.
2. Run `node test/test-ship-verify-line-endings.js`.
3. Run `node --check` on the changed script and regression test.
4. Run `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node --files .agents/skills/ws-ship-pr/scripts/verify.cjs,test/test-ship-verify-empty-aliases.js`.
5. Run `npm run verify-integrity`.
6. Run configured `npm run test`.
7. Confirm the regression sabotage inverts the guard, fails the suite, and restores the changed script bytes.

## Acceptance mapping

- Empty/whitespace aliases, skip notes, frontend parity, `VERIFY_OK`, and non-empty fail-closed behavior are covered by `test/test-ship-verify-empty-aliases.js`.
- Existing line-ending and no-mutation behavior remains covered by `test/test-ship-verify-line-endings.js`.
- The full suite confirms harness registration and repository-wide compatibility.

## Mutation / sabotage

The guard is regression-critical. Use the caller-authored invert patch under `.runtime/` with `run_sabotage.cjs`; success requires the test suite to fail under the inverted normalization and restore the original bytes.
