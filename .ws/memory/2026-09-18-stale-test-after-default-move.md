### [2026-09-18] Stale test expectations after intentional default change
- **Layer**: `tests`
- **Module**: `test/*`
- **Severity**: `High`
- **PathPattern**: `test/*.js`
- **Scenario / Context**: A PR intentionally changes a default path or behavior (example: framework-trap seeding moves from `ws-shared/` to the repo-root effective memory dir) and updates the implementation plus new-contract tests, but an older test file asserting the legacy location is left untouched. CI fails on HEAD while the same file passes on the base branch.
- **DO NOT**: Treat a failing-but-unmodified test file as baseline noise, and do not revert the intentional feature to satisfy the stale expectation.
- **INSTEAD DO**: Classify via base-vs-head: pass on base + fail on head means diff-regression by stale expectation. Update the old test to the new contract in the same fix batch, and assert the legacy location stays empty to lock the contract against silent dual-write regressions.
