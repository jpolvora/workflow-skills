# Testing plan — benchmark-publish-fixed-models

Surface: `backendTest` (`npm run test`); new suite file `test/test-benchmark-comparison-publish.js` (20 blocks).
Mutation: skipped (`defaults.skipMutationTesting: true`); no `mutationTest` alias configured.

## Cases

1. Focused: `node test/test-benchmark-comparison-publish.js` exits 0 (protocol gates AC1-AC8 + CR-001..CR-008 regressions + hermeticity: no `benchmarks/` mutation).
2. Full: `npm run test` — all entries pass (integration: new test registered in `test-suites.json`, integrity fresh, no cross-test interference).
3. Publish round-trip: republish unchanged run → `unchanged; skipped rewrite` (determinism).
4. Evidence integrity: committed sample files match manifest; every manifest evidenceRef resolves on disk.

## Pass criteria

All four green with observed exit codes. No browser surface. No live external runs.
