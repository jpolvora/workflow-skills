### [2026-08-23] Ledger skipReason must be in the published schema
- **Layer**: `Harness`
- **Module**: `ac-ledger.schema.json / ac_ledger.cjs`
- **Severity**: `High`
- **PathPattern**: `.agents/skills/ws-shared/ac-ledger.schema.json, .agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs, test/test-ac-ledger.js, bin/skill-integrity.json`
- **Scenario / Context**: PR 237 persisted optional `aliasResult.skipReason`, but `ac-ledger.schema.json` used `additionalProperties: false` without that field. Schema walkers rejected real post-link ledgers.
- **DO NOT**: Add a persisted JSON field under `additionalProperties: false` without updating the shipped schema and regenerating integrity hashes.
- **INSTEAD DO**: Add optional `skipReason` with the runtime enum (`not-applicable` | `baseline-dirty` | `comment-key`) to `aliasResults` items, schema-validate a linked ledger in tests, and run `npm run generate-integrity` for the hashed schema.
