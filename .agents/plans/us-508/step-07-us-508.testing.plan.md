# Testing plan — us-508

Test surface: `hasTestSurface: true` (`probe_test_surface.cjs`), alias
`backendTest` = `npm run test`.

## Scope

- Targeted regression: `node test/test-check-workflows-global-root.js` (us-504
  anchors + us-508 AC1–AC13, NS1–NS10).
- Full suite: `npm run test` (164 entries) — covers integrity, harness hygiene,
  and the sibling check-workflows contracts.
- Harness hygiene: `node test/test-harness-clean.js`.
- Stack invariants: `node {skillsRoot}/ws-shared/runtime/scripts/scan_stack_invariants.cjs`.

## Mutation

Skipped (`defaults.skipMutationTesting: true`, `verification.mutationTest` empty).

## Exit criteria

- Targeted suite exit 0.
- Full suite exit 0 (all entries).
- `test-harness-clean.js` 0 findings.
- Stack invariant scan 0 findings.
