# Testing Report — us-348

Tester: worker inline (Step 7) · Surface probe: `hasTestSurface: true` (`backendTest: npm run test`).

## Results

- `npm run test` (full configured suite, incl. `pretests` pack): **exit 0** (2026-09-19, post-bump
  tree at v0.4.40).
- `test/test-host-capabilities.js` (new, AC1–AC5 + 4 negatives): **all green**, re-verified after
  sabotage restore.
- Targeted gates: `test-harness-clean.js` 0 findings; `test-ws-shared-layout.js`,
  `test-doc-sync.js`, `test-runtime-portability.js` ok; `verify-integrity` OK (v0.4.40).
- Mutation: skipped per config (`verification.mutationTest` unset, `skipMutationTesting: true`).
- Regression sabotage (`run_sabotage.py`, invert patch drops `dispatchAgent` variants from one
  shape, `--test "npm run test"`): **test-failed-as-expected, restored: true** — the new test
  bites when the map regresses and the tree was restored byte-identical (status clean, test
  re-green, stray pack tarball removed).

No Step 7 failures — no implement-tasks fix loop needed. Advance to Step 8.
