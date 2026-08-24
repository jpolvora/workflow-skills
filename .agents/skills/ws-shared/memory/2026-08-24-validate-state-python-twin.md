### [2026-08-24] Python validate_state twins must exec Node SoT
- **Layer**: `Harness`
- **Module**: `validate_state.py / workflow_state.cjs`
- **Severity**: `High`
- **PathPattern**: `.agents/skills/ws-spec-to-pr/scripts/validate_state.py, .agents/skills/ws-spec-to-pr-lite/scripts/validate_state.py, .agents/skills/ws-shared/scripts/workflow_state.cjs, test/test-quality-gates.js`
- **Scenario / Context**: PR 239 review. Node `requiredAdvanceArtifact` gained plan.index.json, skip-aware artifacts, and ac-ledger gates. Python `--pre-advance` stayed on a separate implementation, so `python validate_state.py` could pass while `node validate_state.cjs` failed (and vice versa). Quality-gates still spawned Python, so CI could not catch Node-only regressions.
- **DO NOT**: Keep a second `--pre-advance` parser in Python when Node `workflow_state.cjs` is the orch SoT. Do not leave `test-quality-gates.js` pointed at the twin.
- **INSTEAD DO**: Freeze both `validate_state.py` copies to exec sibling `validate_state.cjs`. Stamp Python `update_state.py` `_STATE_VERSION` to match Node `STATE_VERSION`. Point quality-gates at the CJS CLI.
