### [2026-09-22] Skill-ship verify ordering: ledger evidence, integrity, budget, pack

- **Layer**: `Tests`
- **Module**: `ship-verify-order`
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs, bin/generate-skill-integrity.js, CATALOG.md, test/run-tests.cjs`
- **Scenario / Context**: During us-402, `ac_ledger.cjs link --file` pinned blob hashes that later content edits (catalog prose trim) invalidated; `generate-integrity` went stale for the same reason; two CATALOG.md index rows overshot the 24500 B context-budget gate by 17 B; and running `node test/run-tests.cjs` directly skipped the `npm pack` pretest so the install test failed on a missing tarball.
- **DO NOT**: link ledger file evidence before the final product edit; regenerate integrity before index rows are final; raise the CATALOG byte budget to fit new rows; invoke `test/run-tests.cjs` directly.
- **INSTEAD DO**: finalize content with rows tightened to fit the standing budget, then `generate-integrity` + full `npm run test` (packs first), then link ledger evidence and score; re-verify integrity and re-link/re-score after any later product touch (review fixes included).
