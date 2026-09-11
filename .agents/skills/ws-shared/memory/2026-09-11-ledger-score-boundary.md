### [2026-09-11] Ledger scoreState must be re-persisted at each pre-advance boundary

- **Layer**: Harness
- **Module**: ws-spec-to-pr / ac_ledger score boundaries
- **Severity**: Medium
- **PathPattern**: `.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs`; `.agents/plans/*/ac-ledger.json`
- **Scenario / Context**: `validate_state --pre-advance N` derives the ledger score at boundary `pre-step6` (N=6), `ship` (N>=9), else `step5`, and fails when `scoreState` does not match that boundary (e.g. "ledger scoreState must match derived step5 score" when advancing to 7 with a stale `pre-step6` scoreState).
- **DO NOT**: Score the ledger once and assume it stays valid across pre-advance gates, or re-run the wrong boundary before the next gate.
- **INSTEAD DO**: Run `ac_ledger.cjs score --boundary <matching>` immediately before each pre-advance gate (`pre-step6` before 6, `step5` before 7/8, `ship` before 9) and after any link that changes ledger content.
