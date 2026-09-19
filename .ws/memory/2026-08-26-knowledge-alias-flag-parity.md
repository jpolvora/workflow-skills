### [2026-08-26] Knowledge-tool aliases must assert flag parity

- **Layer:** harness
- **Module:** ws-shared / tools.md + memory-backend tests
- **Severity:** Medium
- **PathPattern:** **/ws-shared/tools.md;**/test-configurable-memory-backends.js
- **Scenario / Context:** Memory backend migration updated scripts and some `tools.md` rows, but alias-layer regressions (especially `update-ws-changelog` still mentioning `specMemo.enabled`) can ship while CI stays green if tests only cover routing helpers.
- **DO NOT:** Rely only on script unit tests for `enableMemoryFiles` / `enableSpecMemoIntegration` migrations.
- **INSTEAD DO:** Assert each knowledge alias row (`read-memory`, `update-memory`, `update-ws-changelog`) references `enableSpecMemoIntegration` and that `update-ws-changelog` is not gated on legacy `specMemo.enabled`.
