### [2026-08-24] Pre-advance 1 needs a missing-ledger negative test
- **Layer**: `Harness`
- **Module**: `workflow_state.cjs / ac-ledger.json / test-workflow-state-contract`
- **Severity**: `High`
- **PathPattern**: `.agents/skills/ws-shared/scripts/workflow_state.cjs, test/test-workflow-state-contract.js`
- **Scenario / Context**: PR 239 review. The gate `ac-ledger.json is required before advance` for `next >= 1` shipped with only a passing fixture that always seeds the ledger first.
- **DO NOT**: Add a hard pre-advance file gate and only assert the happy path after writing that file. A later deletion of the check would not fail CI.
- **INSTEAD DO**: Assert `--pre-advance 1` exits non-zero and names `ac-ledger.json` before the ledger is written (standard and lite).
