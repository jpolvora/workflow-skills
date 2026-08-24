### [2026-08-23] Dispatch must invoke existing orch helpers
- **Layer**: `Harness`
- **Module**: `ws-spec-to-pr / STEP-DISPATCH`
- **Severity**: `High`
- **PathPattern**: `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md, .agents/skills/ws-spec-to-pr/scripts/*.cjs, .agents/skills/ws-shared/scripts/workflow_state.cjs`
- **Scenario / Context**: Helpers (`ac_ledger.cjs`, `plan_index.cjs`, `write_sequential_dag.cjs`, `probe_test_surface.cjs`) and Node pre-advance rules shipped while STEP-DISPATCH still dispatched a Step 3 subagent and never ran `init`/`build`/probe. Pre-advance then failed or agents paid 90–180 s for empty DAG JSON.
- **DO NOT**: Land a `.cjs` helper plus `validate_state` requirement without a STEP-DISPATCH (or lite SKILL) recipe that actually runs it. Do not treat `measure_harness` artifact-reread 0 B as proof while plan.index is off the live path.
- **INSTEAD DO**: Wire `node {skillsRoot}/…` in the step table in the same change as the helper; add a recipe assertion in `test-artifact-economy.js`; honor `skippedSteps` reasons in `requiredAdvanceArtifact`.
