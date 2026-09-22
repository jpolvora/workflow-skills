# Delivery result — us-386 (Step 8 close)

- Slug: `us-386` (`0117-us-386.spec.md`, issue #386). Flow: standard, preset `muse-spark`, full-auto.
- Status: implementation done; `status: completed` at close (this artifact), shipping tracked separately.
- Change: opt-in post-completion proof-of-work step — 3 `defaults.*` keys (schema + example + GUI + auto-configure + interview), resolution + gate contracts (config-wire collector id `proof-of-work`, fail-closed skips), orch hooks (standard exit/dispatch, lite close), README row, `test-proof-of-work.js` + suite entry, version 0.4.53 + integrity + site rebuild.
- Evidence: spec authoring PASS; `test-proof-of-work.js` 32/32; `test-powershell-config-editor.js` 11/11; `npm run test` 115/115; `test-harness-clean.js` 0 findings; invariant scan 0 issues; `verify-integrity` OK v0.4.53.
- Verify score 10/10 (step-05 report); review 0 Critical/Warning (step-06 review, no fix commit).
