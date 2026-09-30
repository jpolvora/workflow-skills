---
us: benchmark-publish-fixed-models
reportDate: "2026-09-30T12:15:00Z"
score: 10
sourcePlans:
  - step-01-benchmark-publish-fixed-models.plan.md
evalSource: step-00-benchmark-publish-fixed-models.spec.md
step: 5
slug: benchmark-publish-fixed-models
workflowId: benchmark-publish-fixed-models-20260930T114235Z
status: completed
startedAt: "2026-09-30T11:42:35Z"
endedAt: "2026-09-30T12:14:56.424Z"
acRefs: []
---
# Check-implementation report — benchmark-publish-fixed-models

Score: 10/10 (ledger boundary step5, 80/80 units, knownDefect false)

## Result by Feature

| AC | Status | Evidence |
|----|--------|----------|
| AC1 frozen PRD + hash | Implemented | `benchmarks/comparisons/fixed-models-001/prd.md` L1-L18; drift gate `publish_comparison.cjs` L266-L269; test `PRD hash mismatch rejects publish` observed exit 0 |
| AC2 fixed models per role | Implemented | uniformity gate L97-L102; `run-manifest.json` models; test `mixed model versions within a column rejected` observed exit 0 |
| AC3 >=3 samples + per-sample | Implemented | shortfall gate L89-L94; 3 sample JSONs + report per-sample table; test `fewer than 3 samples blocks publication` observed exit 0 |
| AC4 binary judge + ships | Implemented | binary gate L107-L112; judge-freeze gate L270-L273; `judge.json`; tests `non-binary result rejected`, `judge edit after scoring invalidates samples` observed exit 0 |
| AC5 report fields | Implemented | `renderReport` L153-L160; `comparison-fixed-models-001.md` L1-L20 + `.json` twin; test `valid run publishes md+json with all required fields` observed exit 0 |
| AC6 existing commands, no fork | Implemented | manager passthrough `benchmarks_manager.cjs` L394-L403; skill docs; test `no forked engine` (source scan) observed exit 0 |
| AC7 defaults pinned + exceptions | Implemented | deviation gate L124-L130; pending-comparator rendering; tests `unlogged settings deviation fails the column`, `pending comparators render without scores` observed exit 0 |
| AC8 committed report + evolution link | Implemented | `ensureEvolutionLink` L235-L252; preservation `benchmarks_manager.cjs` L290-L308; test `evolution link written and preserved` observed exit 0 |

Negative scenarios NS1-NS4 all linked to observed tests (exit 0). Alias `backendTest` (`npm run test`, 151 entries) exit 0.

## Additional Features

- Deterministic sample collector `collect_sample.cjs` reproduces samples; re-publish skips unchanged rewrites (md fingerprint + JSON twin comparison).
- Pending-comparator slots render unscored with rerun instructions; no external scores fabricated.

## Stack Invariant Compliance

`scan_stack_invariants.cjs` on both touched scripts: 0 issues (0 Critical, 0 Warning). No framework boundaries touched (local CLI file I/O only); containment enforced on `--run`; no secrets in outputs.

## Gaps and Next Steps

- None blocking. Fable-judge agentic audit has no CLI and was not run at Step 5 (no verdict linked; only REFUTED blocks).
- Regression sabotage not required (new-feature work, not a bugfix); sample-level inversion checks (C6/C7) observed passing.
- External comparator columns remain pending until evidence-backed samples exist; re-publish to score them.
