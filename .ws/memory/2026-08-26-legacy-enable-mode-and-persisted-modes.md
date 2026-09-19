### [2026-08-26] Legacy enable honors mode; persist local/disabled

- **Layer:** skills
- **Module:** ws-spec-memo / configure_spec_memo
- **Severity:** High
- **PathPattern:** **/ws-spec-memo/scripts/configure_spec_memo.cjs;**/test-configurable-memory-backends.js
- **Scenario / Context:** `--enabled true` on a seeded hub (`mode: vault`, `enableMemoryFiles: true`) became dual-mode. After disable, persisted `mode: hybrid` with vault off. Dual-mode lacked configure/check E2E coverage.
- **DO NOT:** Prefer seed `enableMemoryFiles` over `prev.mode` on legacy enable; persist hybrid/vault when vault is off; ship without State 3 dual coverage.
- **INSTEAD DO:** On enable without memory flags, set memory from `prev.mode` (default vault). Persist `local`/`disabled` when vault off. Cover all four backend states in tests.
