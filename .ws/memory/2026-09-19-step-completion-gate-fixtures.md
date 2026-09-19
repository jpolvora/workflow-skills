### [2026-09-19] State-machine fixtures must satisfy the full guard chain; gate changes need full-list runs

- **Layer:** tests
- **Module:** ws-shared / workflow_state finish gates
- **Severity:** Medium
- **PathPattern:** test/test-*.js
- **Scenario / Context:** After adding fail-closed finish gates, fixture seeds that looked valid still failed: skip records in markdown seeds need `evidence` keys or dispatch validation rejects them, and dispatch requires plan artifacts plus the plan index on disk. Separately, a grep sweep for step-4 finishes missed a suite that finishes via a dag-substep probe shape; only the full test list caught it.
- **DO NOT:** Seed state fixtures with bare skip records or no plan artifacts and assume finish/dispatch will accept them; rely on a grep sweep alone to find stale expectations after a state-machine gate change.
- **INSTEAD DO:** Build seeds through real skip transitions (or include evidence keys, plan file, and plan index), and re-run the full suite list (not just grep hits) before claiming the gate change is regression-free.
