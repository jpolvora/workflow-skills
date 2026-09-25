### [2026-09-24] ac_ledger link --test needs space form and comma-free names

- **Layer**: `tests`
- **Module**: `ws-spec-to-pr / ac_ledger.cjs link --test evidence`
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs; .agents/plans/*/ac-ledger.json`
- **Scenario / Context**: During us-414-run-state-integrity Step 5, evidence links passed `--test=name=N,sourceFile=F,...` (equals form). The arg parser filed them under a garbage key, so link exited 0 with files attached and `tests: []` — silent evidence loss. A second pass with the space form (`--test "name=N,..."`) attached tests correctly. Separately, test names containing commas are unrepresentable (the value parser splits pairs on commas), so comma-bearing assert messages can never link.
- **DO NOT**: Pass `--test=name=...` (equals form) to `ac_ledger.cjs link`, or name linked tests with commas; both fail silently or reject while files still attach.
- **INSTEAD DO**: Use the space form `--test "name=N,sourceFile=F,phase=observed,exitCode=0"` (one argv token, quoted for spaces); keep linked assert messages comma-free; after every link, assert the ledger row's `tests[]` is non-empty (silent-drop check).
