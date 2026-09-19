### [2026-08-26] Vault-disable restore only when vault was active

- **Layer:** skills
- **Module:** ws-spec-memo / configure_spec_memo
- **Severity:** High
- **PathPattern:** **/ws-spec-memo/scripts/configure_spec_memo.cjs;**/test-configurable-memory-backends.js
- **Scenario / Context:** Unconditional `nextMemoryFiles=true` on `--enabled false` fixed vault-only disable but also re-enabled local memory after an explicit fully-disabled state. Separate CI failure: vault-only configure tests without a stub CLI crash on JSON.parse when `memo` is absent.
- **DO NOT:** Always force `enableMemoryFiles: true` on disable; do not enable vault in tests without a stub CLI (`node <stub>` via `--cli`).
- **INSTEAD DO:** Restore local memory only when `prev.enableSpecMemoIntegration === true || prev.enabled === true`; otherwise keep prior `enableMemoryFiles`. For vault-only tests, pass a stub `--cli` and assert idempotent disable-on-disabled.
