### [2026-08-25] Lite pre-advance 5 fail assert before stamping step-08
- **Layer**: Harness
- **Module**: test / test-workflow-state-contract.js
- **Severity**: Medium
- **PathPattern**: test/test-workflow-state-contract.js, .agents/skills/ws-shared/scripts/workflow_state.cjs
- **Scenario / Context**: Lite `--pre-advance 5` requires `step-08-{slug}.result.md`. Stamping that file before the negative assert made the fail check exit 0.
- **DO NOT**: Stamp `step-08` and then assert pre-advance 5 fails.
- **INSTEAD DO**: Assert pre-advance 5 is non-zero with no ship result, then stamp `step-08`, finish lite step 4, then assert pre-advance 5 exits 0.
