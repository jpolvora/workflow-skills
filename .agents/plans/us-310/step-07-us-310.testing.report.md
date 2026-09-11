---
slug: us-310
title: Testing report — repeated file-list flags
status: completed
step: 7
workflowId: us-310-20260911T041227Z
startedAt: "2026-09-11T04:12:27.000Z"
endedAt: "2026-09-11T04:46:00.000Z"
acRefs: []
---
## Testing report

| Check | Command | Result |
|-------|---------|--------|
| Targeted suite | `node test/test-repeated-file-list-flags.js` | exit 0 — `test-repeated-file-list-flags: ok` (T1–T8) |
| Stack invariants | `scan_stack_invariants.cjs --stack typescript-node` | exit 0 — 0 issues |
| Integrity | `npm run verify-integrity` | exit 0 — matches tree v0.4.16 |
| Full suite | `npm run test` (`backendTest`) | exit 0 on final tree (incl. `test-artifact-stamp-status: T1-T8 passed`) |
| Mutation substep | — | skipped (log): `verification.mutationTest` unset + `skipMutationTesting: true` |
| Regression sabotage | `run_sabotage.py --test "npm run test"` (Step 4) | passed — `test-failed-as-expected`, restored true, exit 0 |

Hygiene after runs: `npm pack` tarball removed; benchmark `Generated:` timestamp side effects restored (`git checkout -- benchmarks/`); product tree clean (only workflow plan dir + pre-existing foreign dirty files remain).

Coverage: T1/NS1–T8 map 1:1 to AC1–AC8; NS1–NS6 all observed exit 0. Red-before evidenced (T1 failed pre-fix with only `path/to/third-file` retained); green-after on committed G2 ba9935d6.

Advance: no failures — proceed to Step 8 close + ship.
