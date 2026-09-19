### [2026-09-19] Stamp pipeline-remapped artifacts with their canonical step, not the producing step

- **Layer:** application
- **Module:** ws-shared / workflow state finish path
- **Severity:** High
- **PathPattern:** .agents/skills/ws-shared/runtime/scripts/workflow_state.cjs
- **Scenario / Context:** The finish path stamped every `finishArtifactNames` result with the finishing step number, but the lite step-3 map returns `step-06-*.review.md`; the stamp merge overwrote the correct `step: 6` with `step: 3`, and the pre-advance validator (which always expects step 6 for that artifact) threw an identity mismatch — breaking every lite run reaching step 4.
- **DO NOT:** Stamp a step number derived from the producing/finishing step onto an artifact whose filename encodes a different canonical step; assume step N always produces `step-N-*` files.
- **INSTEAD DO:** Parse the canonical step from the artifact filename (`/^step-(\d+)-/`, fallback to the finishing step) at the single finish-flow stamp call site, and keep the lite finish-3 contract case plus the T6 canonical-step guard in `test/test-artifact-stamp-status.js` green.
