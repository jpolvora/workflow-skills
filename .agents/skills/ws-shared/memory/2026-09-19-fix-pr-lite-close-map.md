### [2026-09-19] Pipeline step-to-artifact maps must cover the close/ship step

- **Layer:** application
- **Module:** ws-spec-to-pr / step coordinator + workflow_state
- **Severity:** High
- **PathPattern:** .agents/skills/ws-shared/runtime/scripts/workflow_state.cjs
- **Scenario / Context:** The lite branch of `finishArtifactNames` mapped steps 0/1/3 but omitted step 4 (close/ship, canonical artifact `step-08-*.result.md`). The coordinator then expected nothing for a mapped lite close step and reported `advanced` with the result missing, while the canonical `--pre-advance 5` gate rejected the same state (gate disagreement, HS-5); the finish stamp loop and `fallbackArtifacts` also skipped the result. The coordinator, telemetry, and specmemo tests masked it by seeding no close result while asserting completion.
- **DO NOT:** Extend a pipeline step map mid-pipeline fix by mid-pipeline fix and stop before the terminal close/ship step; assert close-step completion in tests without seeding the close artifact.
- **INSTEAD DO:** When touching any pipeline step map, verify the full step range 0..close against `requiredAdvanceArtifacts` (finish key N must pair with requiredAdvance next N+1) and the pipeline SKILL step table; keep the lite step-4 `verifyAdvancement` pair (present advances / absent demands) and the body-only step-08 stamp case green.
