### [2026-08-24] rebuild-index must not reset index.revision to 0
- **Layer**: `Harness`
- **Module**: `workflow_state.cjs rebuildIndex / validateSnapshot`
- **Severity**: `High`
- **PathPattern**: `.agents/skills/ws-shared/scripts/workflow_state.cjs, test/test-workflow-state-contract.js`
- **Scenario / Context**: PR 239 review. Documented `rebuild-index` recovery wrote `index.revision: 0`. Validate then required `index.revision === state.revision`, so any in-flight state with `revision > 0` still failed after a successful rebuild.
- **DO NOT**: Hardcode rebuilt index revision to 0, or couple a global index revision to each state's revision. Do not cover rebuild only with a `revision: 0` fixture.
- **INSTEAD DO**: Stamp rebuilt `index.revision` to max state revision. Compare only the per-workflow `stateSha256` row hash. Assert rebuild then validate with `revision: 5`.
