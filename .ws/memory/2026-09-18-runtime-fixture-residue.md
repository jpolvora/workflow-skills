### [2026-09-18] Test fixtures must not write unknown files under us-dir .runtime

- **Layer:** tests
- **Module:** ws-spec-to-pr / workflow_state fixtures
- **Severity:** Medium
- **PathPattern:** test/fixtures/**;test/test-*.js
- **Scenario / Context:** A coordinator worker fixture wrote its receipt next to the dispatch prompt (`{us-dir}/.runtime/*.receipt.json`). `update_state finish` applies the state write, then `validateSnapshot` rejects the run on `unknown .runtime residue` — so finish exits non-zero after mutating state, which surfaces misleadingly as a worker nonzero exit with a completed handoff.
- **DO NOT:** Write fixture receipts, markers, or scratch files under `{us-dir}/.runtime/` unless the name matches `RUNTIME_NAMES` (`.cjs`/`.patch`/`.md` or the allowlisted stems).
- **INSTEAD DO:** Direct fixture-only outputs outside the workflow dir (temp root) via an explicit arg such as `--receipt <path>`; keep `{us-dir}/.runtime/` limited to dispatch prompts and harness-owned files.
