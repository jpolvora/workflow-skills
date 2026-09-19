### [2026-09-19] Step-to-artifact maps must branch on pipeline, not just step

- **Layer:** application
- **Module:** ws-spec-to-pr / step coordinator + workflow_state
- **Severity:** High
- **PathPattern:** .agents/skills/ws-shared/runtime/scripts/workflow_state.cjs
- **Scenario / Context:** `finishArtifactNames` accepted a `pipeline` argument but only step 2 branched on it, so lite step 3 (review) expected the standard-only `step-03-plan.exec.md` that lite never emits. A correctly configured lite baton run mapping step 3 failed advancement verification after a successful review and blocked. The coordinator test masked it by seeding the standard-only file for every repo.
- **DO NOT:** Add a `pipeline` parameter to a step-keyed map and leave most steps on the standard shape; seed test repos with artifacts the exercised pipeline never emits.
- **INSTEAD DO:** Give every pipeline its own explicit step map (lite: 0 spec, 1 plan, 3 review, 4 result; else none) and seed only artifacts the pipeline under test produces; cross-check new maps against `requiredAdvanceArtifacts` and the pipeline SKILL step table.
