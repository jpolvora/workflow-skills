### [2026-08-24] Plans index missing-row must stay fail-closed
- **Layer**: `Harness`
- **Module**: `workflow_state.cjs / plans index.json`
- **Severity**: `High`
- **PathPattern**: `.agents/skills/ws-shared/scripts/workflow_state.cjs, test/test-workflow-state-contract.js`
- **Scenario / Context**: PR 239 review. Skipping the index check when `workflowId` had no row unblocked OS-temp Python fixtures, but also let in-repo states pass while untracked in `{plansDir}/index.json`.
- **DO NOT**: Change `if (!row || mismatch)` to `if (row && mismatch)` so a missing index entry is ignored. That hides archive/prune/manual index drift.
- **INSTEAD DO**: Fail with `plans index missing workflow entry` when the state file is inside `repoRoot` and the index exists. Skip the index check only for paths outside the consumer root (OS-temp fixtures). Assert the missing-row path in the contract suite.
