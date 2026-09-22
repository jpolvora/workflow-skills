# Check-implementation report — us-386 (Step 5)

- Score: **10/10** (bar: `defaults.minVerifyScore` 9). No scoreAndRefine needed.
- Scope: config surface + gate contract + docs + GUI sync + tests. No product runtime code.

| AC | Evidence | Verdict |
|----|----------|---------|
| AC1 | schema `defaults.enableOptionalProofOfWork`/`enableAutomaticEvidenceCollectForProofOfWork` bool default false; `projectRootFolderToSave` string default token; example seeds + `_comment_`; `auto_configure.cjs` fallback; PS1 rows bool/bool/string | PASS |
| AC2 | gates.md post-completion section: one `user-gate` (Start evidence collection / Skip) after finished state; orch exit/dispatch/lite references | PASS |
| AC3 | both-switches auto-start, no gate (gates.md + resolution table) | PASS |
| AC4 | folder resolves `{projectRoot}`/`{slug}` tokens, default `{projectRoot}/.proofOfWork/{slug}` (schema + example + resolution) | PASS |
| AC5 | omitted/`false` → no gate, behavior identical (resolution + gates wording; `test-proof-of-work.js` asserts the contract text) | PASS |
| AC6 | autoMode zero prompts, automatic switch decides, never blocks | PASS |
| AC7 | never-commit + never-mutate-product-files invariants in gates.md | PASS |
| AC8 | `skipped:no-browser-capability` / `collector-missing` skip reasons, no synthesized evidence | PASS |
| AC9 | schema + example + PS1 + hub docs updated; `test-powershell-config-editor.js` ALL 11 PASSED; `test-proof-of-work.js` 32/32 | PASS |
| AC10 | `npm run test` 115/115 green; `test-harness-clean.js` 0 findings; `scan_stack_invariants.cjs --stack typescript-node` 0 issues; integrity verified v0.4.53 | PASS |

Negative scenarios: omitted-switch run presents no gate (contract, AC5); autoMode+switch blocks on no prompt (contract, AC6); fabricated PASS / auto-commit forbidden by invariant (AC7/AC8); schema/example/GUI omission fails `test-powershell-config-editor.js` Tests 8/9b (AC9); suite/invariant failures fail AC10 — all covered by committed tests.
