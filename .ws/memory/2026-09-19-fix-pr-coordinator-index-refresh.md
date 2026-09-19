### [2026-09-19] Every programmatic state writer must refresh the plans index row

- **Layer:** application
- **Module:** ws-spec-to-pr / step coordinator + ws-shared workflow state
- **Severity:** High
- **PathPattern:** .agents/skills/ws-spec-to-pr/scripts/step_coordinator.cjs;.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs
- **Scenario / Context:** All three coordinator direct writers (claim, persist, releaseOwnBaton) called `syncStateDualWrite` without refreshing the plans index, so `row.stateSha256` went stale and every later `validateSnapshot` failed closed — including on the success path, where the post-advancement release bumped revision after the worker finish had already synced the row. (Extends the manual-edit index-hash trap to programmatic writers.)
- **DO NOT:** Add a `syncStateDualWrite` call site that leaves the plans index row stale; assume the worker finish path's refresh covers later coordinator writes.
- **INSTEAD DO:** Call the exported `refreshPlansIndexForState(context, state, { pipeline, maxStep, stateFile })` helper after every direct state write (claim, persist, release), and keep the index-hash e2e cases (hermetic release + blocked run) in `test/test-step-coordinator.js` green.
