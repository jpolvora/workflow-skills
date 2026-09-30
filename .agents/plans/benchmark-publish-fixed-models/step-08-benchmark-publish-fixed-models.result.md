---
step: 8
slug: benchmark-publish-fixed-models
workflowId: benchmark-publish-fixed-models-20260930T114235Z
status: completed
startedAt: "2026-09-30T11:42:35Z"
endedAt: "2026-09-30T12:31:01.873Z"
acRefs: []
---
# benchmark-publish-fixed-models — Delivery Result

## Expected

Spec AC1-AC8: one frozen PRD (content hash) executed unchanged on this harness and included
comparators; fixed model ids per role; >=3 samples per harness column with per-sample results;
binary-check judge (no partial credit) shipping with the report; report with PRD hash, harness
versions, model ids, per-sample binaries, aggregates, judge definition, timestamps; execution
through existing `ws-benchmarks` run/report commands (no forked engine); comparators at
documented defaults with deviations logged; report committed under `benchmarks/results/` with
an evolution-index link.

## Done

- Frozen PRD `benchmarks/comparisons/fixed-models-001/prd.md` (sha256 `c777322b…`) + 7-check
  binary judge `judge.json` (sha256 `8bec03c6…`), 1:1 from PRD ACs + negatives.
- New `publish_comparison.cjs`: PRD/judge freeze gates, >=3-sample gate, per-role model
  uniformity gate, strict-binary gate, defaults-vs-settings gate with `protocolExceptions`,
  runId traversal guard, duplicate harness/check guards, manifest-vs-file cross-check,
  markdown report + JSON twin, evolution link. Wired as manager `--publish-comparison`;
  `--update-comparison` preserves the comparison section; skill docs updated.
- This-harness column: 3 independent samples, each an engine static run
  (`cli.cjs run --mode static --fixture fx-node-helper`, PASS/index 100) plus the deterministic
  `collect_sample.cjs` procedure (exit-code-observed binaries incl. inverted NS1/NS2 runs).
  All samples 7/7; execution model-free, recorded as fixed executor id.
- Published `benchmarks/results/comparison-fixed-models-001.md` (+ `.json` twin);
  `BENCHMARK_EVOLUTION.md` links the run (pure section append, CRLF preserved).
- External comparator ships as a pending (unscored) slot with rerun instructions — no
  fabricated external scores.
- Tests: `test/test-benchmark-comparison-publish.js` (20 blocks, all gates + 8 review
  regressions, hermetic); full suite 151 entries green; integrity verified; stack scan clean.
- Verify score 10/10 (ledger step5, 80/80); review round 1 (6 warnings + 2 suggestions) all
  fixed and closed in round 2; testing report green.
- DAG tasks T1-T8 all executed (parallel levels L1-L5).

## Next steps

- Ship: PR develop->main via ws-ship-pr (shared-head rule), then Step 9 fix-pr convergence.
- NOTE for ship: foreign commit `9bb193c2` (human CI model-default change, 12:19 UTC) landed on
  develop between this run's G2 commits; it will ride the develop->main PR range. Untouched per
  git-ownership; disclosed in PR body for the master merge decision.
- Future: record an external comparator's 3 evidence-backed samples and re-publish to score it.

## References

- Spec: .agents/plans/benchmark-publish-fixed-models/step-00-benchmark-publish-fixed-models.spec.md
- Plan: step-01-benchmark-publish-fixed-models.plan.md (Step 2 bypassed: interview-not-required)
- Check: step-05-benchmark-publish-fixed-models.plan.report.md
- Review: step-06-benchmark-publish-fixed-models.review.md (+ .r1/.r2 rounds, fix report)
- Testing: step-07-benchmark-publish-fixed-models.testing.report.md

## Timing

| Metric | Value |
|--------|-------|
| Total wall-clock time | 34m 47s (2087s agent execution) |
| Steps executed | 8 (0-7; step 8 close/ship in progress) |
| Total tokens | 0 (estimated: false; host reports no token counts) |
| Lines added | +1675 |
| Lines removed | -6 |
| Net LOC delta | +1669 (product commits 142018a2+2f9a5cd9+e64b56f8; excludes delivery artifacts) |
| Baseline LOC | n/a (scope: `.agents/skills` + `test` + `bin` + `benchmarks` + `scripts`; this repo has no `src/`/`web/`/`tests/`) |
| Final LOC | n/a (same scope) |

LOC scope note: diff-stat over product dirs vs baseline `8665aab7`; foreign commit `9bb193c2`
touches only `.github/` (outside scope).

### Step breakdown

| Step | Label | Model | Elapsed | Tokens (est.) | Files changed |
|------|-------|-------|---------|---------------|---------------|
| 0 | Spec | current | 14s | 0 | 2 |
| 1 | Planning | current | 74s | 0 | 1 |
| 2 | Interview | current | 0s | 0 | 0 |
| 3 | Plan to tasks | current | 53s | 0 | 2 |
| 4 | Implement | current | 1101s | 0 | 28 |
| 5 | Verify | current | 176s | 0 | 1 |
| 6 | Code review | current | 572s | 0 | 10 |
| 7 | Testing | current | 97s | 0 | 2 |
