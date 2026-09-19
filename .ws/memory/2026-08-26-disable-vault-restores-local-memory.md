### [2026-08-26] Disable vault-only must restore local memory files

- **Layer:** skills
- **Module:** ws-spec-memo / configure_spec_memo
- **Severity:** High
- **PathPattern:** **/ws-spec-memo/scripts/configure_spec_memo.cjs
- **Scenario / Context:** Consumer was vault-only (`enableMemoryFiles: false`, `enableSpecMemoIntegration: true`) then ran `/ws-spec-memo disable` / `--enabled false` without an explicit memory-files flag. Prev `enableMemoryFiles: false` was preserved, so `resolveMemoryRouting` left both backends off and in-repo MEMORY consult/compile stayed dark.
- **DO NOT:** When disabling vault integration without an explicit `--enable-memory-files` / stdin memory flag, reuse previous `enableMemoryFiles: false` from vault-only mode.
- **INSTEAD DO:** If `nextSpecMemo` becomes false and the caller did not set memory-files explicitly, set `nextMemoryFiles = true` so disable restores local markdown memory. Cover with a vault-only → disable restoration test.
