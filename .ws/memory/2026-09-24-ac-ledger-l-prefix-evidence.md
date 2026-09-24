### [2026-09-24] ac_ledger link --file evidence needs the L prefix on both range bounds

- **Layer**: `tests`
- **Module**: `ws-spec-to-pr / ac_ledger.cjs link --file evidence`
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs; .agents/plans/*/ac-ledger.json`
- **Scenario / Context**: During us-412-413 Step 5, a batch evidence-link driver passed explicit ranges as `path:1180-1217` (no `L` prefix). All 21 link calls exited 1 with `file evidence must use path:Lstart-Lend`; the ledger stayed unlinked. Re-running the same batch with `path:L1180-L1217` linked all 19 ACs and 6 NS in one pass.
- **DO NOT**: Pass explicit line ranges to `ac_ledger.cjs link --file` without the `L` prefix on both bounds (`path:12-40`), or run batch links without per-call exit-code assertions.
- **INSTEAD DO**: Format every file evidence value as `path:Lstart-Lend` (e.g. `workflow_state.cjs:L1180-L1217`); batch links through a Node driver with argv arrays and check each call's exit code (this also avoids host shell JSON-quoting traps).
