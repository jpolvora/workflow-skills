---
step: 7
slug: benchmark-publish-fixed-models
workflowId: benchmark-publish-fixed-models-20260930T114235Z
status: completed
startedAt: "2026-09-30T11:42:35Z"
endedAt: "2026-09-30T12:29:04.415Z"
acRefs: []
---
# Testing report — benchmark-publish-fixed-models

Date: 2026-09-30T12:30:00Z. Surface: `backendTest` only. Mutation skipped per config.

## Results

| Case | Command | Result |
|------|---------|--------|
| Focused gates | `node test/test-benchmark-comparison-publish.js` | PASS, exit 0 (20 blocks: AC1-AC8 gates, CR-001..CR-008 regressions, hermeticity) |
| Full suite | `npm run test` | all 151 entries passed, exit 0 (post-fix) |
| Republish idempotence | manager `--publish-comparison` rerun | `unchanged; skipped rewrite`, exit 0 |
| Evidence integrity | manifest evidenceRefs resolve | all resolve to committed paths (asserted in-suite) |

## Notes

- Hermeticity verified: the test file mutates only temp dirs; `git status -- benchmarks/` clean after test runs.
- No browser surface; no live external runs (external comparator pending by design).
- Post-review-fix stragglers (3 vendored engine reports) committed as `e64b56f8`; linked file hashes unaffected (additive only).
