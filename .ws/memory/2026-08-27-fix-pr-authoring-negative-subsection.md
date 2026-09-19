### [2026-08-27] Authoring validation must require negative-scenario subsection

- **Layer**: Harness
- **Module**: ws-spec-format / validate_spec
- **Severity**: High
- **PathPattern**: .agents/skills/ws-spec-format/scripts/validate_spec.cjs, .agents/skills/ws-spec-format/FORMAT.md, test/test-validate-spec.js
- **Scenario / Context**: After ac_ledger started ingesting only ### Negative & Failing Test Scenarios, authoring mode still passed telemetry-only Validation Notes. Ledger init then produced an empty negativeScenarios array and Step 5 never fail-closed.
- **DO NOT**: Treat any non-placeholder Validation Notes body as authoring-ready, or duplicate this heading check inside ac_ledger (compat specs must still init).
- **INSTEAD DO**: In --mode=authoring, require ### Negative & Failing Test Scenarios with at least one non-placeholder bullet. Keep --mode=compat as warn-only. Keep ac_ledger ingest-only.
