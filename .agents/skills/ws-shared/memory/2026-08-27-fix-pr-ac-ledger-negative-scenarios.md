### [2026-08-27] Verify score must fail-close on uncovered negative scenarios

- **Layer**: Harness
- **Module**: ws-verify-plan / ac_ledger
- **Severity**: High
- **PathPattern**: .agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs, .agents/skills/ws-shared/ac-ledger.schema.json, .agents/skills/ws-verify-plan/SKILL.md
- **Scenario / Context**: Step 5 Advance used only `- ACn:` rows. Specs can document failing cases under Validation Notes while ac_ledger.cjs score still reaches minVerifyScore on happy-path ACs.
- **DO NOT**: Treat AC coverage as the only numeric gate, or ingest telemetry bullets from Validation Notes as negative scenarios.
- **INSTEAD DO**: Init `negativeScenarios` from `### Negative & Failing Test Scenarios`. Link observed passing tests with `ac_ledger.cjs link --negative NS{n}`. Uncovered rows set knownDefect and cap the score at 8.
