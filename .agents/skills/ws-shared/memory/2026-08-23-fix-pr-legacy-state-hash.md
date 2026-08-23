### [2026-08-23] Frontmatter state hash must accept legacy full-file digest
- **Layer**: `Harness`
- **Module**: `workflow_state.cjs / validateSnapshot`
- **Severity**: `High`
- **PathPattern**: `.agents/skills/ws-shared/scripts/workflow_state.cjs, test/test-workflow-state-contract.js`
- **Scenario / Context**: PR 237 switched `stateSha256` to frontmatter-only hashing. In-flight `run.json` / plans index still stored the previous full-file SHA-256, so `validate --pre-advance 6` failed on hash mismatch before ledger skips were evaluated.
- **DO NOT**: Compare persisted `stateSha256` only to `stateIdentityHash` after changing the hash identity. That breaks consumers who have not yet run `performUpdate`.
- **INSTEAD DO**: Accept the legacy full-file digest in `validateSnapshot` for `run.json` and the plans index until the next `performUpdate` rewrites those files. Keep writers on the new frontmatter-only hash. Cover with a fixture that seeds a legacy full-file `run.json` and asserts pre-advance 6 still passes.
