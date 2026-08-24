### [2026-08-24] Pre-advance 8 must cover Step 7 testing skips
- **Layer**: `Harness`
- **Module**: `workflow_state.cjs / requiredAdvanceArtifact`
- **Severity**: `High`
- **PathPattern**: `.agents/skills/ws-shared/scripts/workflow_state.cjs, test/test-workflow-state-contract.js`
- **Scenario / Context**: PR 239 review. Skip-aware pre-advance exempts `step-07-{slug}.testing.report.md` when Step 7 is skipped with `testing-disabled` or `no-test-surface`, but the contract suite never ran `--pre-advance 8` on that branch.
- **DO NOT**: Land skip-aware `requiredAdvanceArtifact` rules whose only coverage is sister steps (interview skip → 3, DAG skip → 4, lite review → 4). A later edit can re-block legitimate skipped-testing ships with no CI signal.
- **INSTEAD DO**: Assert pre-advance 8 fails without the testing report when Step 7 is not skipped, then `finish --status skipped` with each testing skip reason and assert pre-advance 8 exits 0. Re-score the ledger at boundary `step5` before those checks.
