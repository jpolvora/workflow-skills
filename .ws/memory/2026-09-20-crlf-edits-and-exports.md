### [2026-09-20] CRLF files defeat exact-match edits; shared helpers need export checks

- **Layer**: Infrastructure
- **Module**: observer-us365
- **Severity**: Medium
- **PathPattern**: .agents/skills/**/*.cjs
- **Scenario / Context**: While implementing the opt-in execution observer, exact-text edits failed on CRLF `.cjs`/`.example` files (invisible `\r` mismatch) and the new observer test crashed because `jsonStatePath` was used but never exported from `workflow_state.cjs`.
- **DO NOT**: assume LF endings when editing skill scripts, nor assume a helper is exported because it exists in the module.
- **INSTEAD DO**: check line endings first; patch CRLF files through a small Node replace script with explicit `\r\n` anchors, and verify every cross-module helper is in `module.exports` (smoke-require the consumer) before writing the test that depends on it.
