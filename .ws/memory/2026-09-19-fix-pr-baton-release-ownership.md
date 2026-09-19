### [2026-09-19] Baton release paths need the same ownership guard as claim paths

- **Layer:** application
- **Module:** ws-spec-to-pr / step coordinator
- **Severity:** High
- **PathPattern:** .agents/skills/ws-spec-to-pr/scripts/step_coordinator.cjs
- **Scenario / Context:** The baton claim path was serialized (lockdir + expected revision + write-then-reread) but the release helper cleared whichever holder was present without checking caller identity, so a delayed coordinator could erase a lease a successor legitimately acquired after expiry and break the single-writer invariant.
- **DO NOT:** Add a baton release/clear path that nulls the holder without comparing it to the caller's runner id.
- **INSTEAD DO:** Pass the owner identity into every release helper and no-op on mismatch (`releaseOwnBaton(mdPath, jsonPath, runnerId)`); keep the ownership unit case in `test/test-step-coordinator.js` green (non-owner release asserts holder and revision unchanged).
