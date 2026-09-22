### [2026-09-22] Post-Step-5 product edits invalidate integrity and the ledger score boundary

- **Layer**: `Infrastructure`
- **Module**: `harness-release`
- **Severity**: `Medium`
- **PathPattern**: `bin/skill-integrity.json, .agents/plans/**/ac-ledger.json, .agents/skills/ws-shared/runtime/scripts/workflow_state.cjs`
- **Scenario / Context**: During us-395, a Step 6 review-fix commit edited a hashed skill script after `npm run generate-integrity` and after the full `npm run test` alias had passed. The next `npm run test` failed at `test/test-install.js` with `skill-integrity.json is stale vs current tree`, and `validate_state.cjs --pre-advance 7` failed with `ledger scoreState must match derived step5 score` after re-linking file evidence.
- **DO NOT**: run the full suite or pre-advance validation after a post-Step-5 product edit without first regenerating integrity and refreshing the ledger score boundary; nor assume a previously recorded alias result still holds once `files_touched` changed.
- **INSTEAD DO**: after any review-fix commit that touches hashed skill content, re-run `npm run generate-integrity` + `npm run verify-integrity`, re-link the changed file evidence (`ac_ledger.cjs link --event-id <ac>-fix1 --file path:Lx-Ly`), refresh `ac_ledger.cjs score --boundary step5`, then re-run the full alias (`npm run test`) so the observed result is current before advancing.
