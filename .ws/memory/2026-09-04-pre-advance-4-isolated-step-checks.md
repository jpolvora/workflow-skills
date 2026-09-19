### [2026-09-04] Isolate Step 2 and Step 3 --pre-advance 4 negatives

- **Layer**: `harness`
- **Module**: `workflow_state / contract tests`
- **Severity**: `High`
- **PathPattern**: `test/test-workflow-state-contract.js`, `.agents/skills/ws-shared/scripts/workflow_state.cjs`
- **Scenario / Context**: After adding Step 1 skip and missing-refined fixtures, review still scored 6 because Step 2 incomplete and Step 3 incomplete paths had no isolated asserts.
- **DO NOT**: Treat Step-0-only or happy skip-interview `--pre-advance 4` as covering every completion-or-skip branch.
- **INSTEAD DO**: Add one fixture per check (Step 1 completed, Step 2 incomplete, Step 3 incomplete) with artifacts on disk so the named error string is asserted.
