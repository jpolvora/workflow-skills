---
step: 7
slug: us-509
workflowId: us-509-20261013T015209Z
status: completed
startedAt: "2026-10-13T02:02:00Z"
endedAt: "2026-10-13T02:05:00Z"
acRefs: [AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9, AC10, AC11, AC12, AC13, AC14, AC15]
---
# Testing plan — us-509

## Surface probe

`probe_test_surface.cjs --repo-root .` → `hasTestSurface: true`;
configured alias `backendTest` = `npm run test`; `test/**/*.js` surface.

## Plan

| Layer | Command | Rationale |
|-------|---------|-----------|
| Unit / regression | `node test/test-ac-ledger.js` | owns the new AC1-AC15 and NS1-NS12 assertions |
| Usage lock | `node test/test-script-ux-golden-path.js` | `link --help` both-form lock |
| Adequacy regression | `node test/test-per-task-adequacy.js` | repeated `--ac` multi-target adequacy path unchanged |
| Harness | `node test/test-harness-clean.js` | Node-only / integrity / links, 0 findings |
| Full alias | `npm run test` | `verification.backendTest`, 164 entries |

## Scope

No new test file and no new `test-suites.json` row (per spec): the assertions
belong in the existing suites.

## Mutation testing

`defaults.skipMutationTesting: true` and `verification.mutationTest` is empty →
mutation substep skipped. Regression coverage is provided by the Step 6b
fault-injection matrix instead (13 injections, all caught).
