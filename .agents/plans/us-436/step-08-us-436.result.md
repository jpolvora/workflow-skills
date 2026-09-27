---
slug: us-436
step: 8
workflowId: us-436-20260927T190308Z
status: completed
shipStatus: pending
acRefs: [AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9, AC10, AC11]
---

# us-436 — Delivery Result

## Expected

Documentation emphasis over four already-shipped capability clusters (issue #436):
- Four visible feature surfaces on the public site `#features` grid, one per cluster, generated deterministically by `bin/build-site.js` (AC1–AC3).
- Wiki detail in `delivery/spec-to-pr-pipeline.md` (proof-of-work keys/folder/never-committed + `autoMode` checkpoint/pause + `ws-spec-multi`), `specs/spec-lifecycle.md` (translate-to-human + organizer/subfolders/`ws-spec-index sync`), `harness/diagnostics-and-benchmarks.md` (`ws-spec-archive`/`ws-cleanup`) (AC4–AC8).
- `FEATURES.md` + `README.md` name the clusters (AC9); harness/tests/wiki clean (AC10); version bump + integrity when shipping as a release (AC11).

## Done

- `bin/build-site.js`: four `role-matrix-card` surfaces added inside the `efficiency-verifiability` marker block; `node bin/build-site.js` regenerates `docs/index.html` deterministically (second rebuild is a no-op).
- `docs/index.html` + `docs/wiki/{delivery/spec-to-pr-pipeline,harness/diagnostics-and-benchmarks}.html` regenerated.
- `.agents/specs/wiki/delivery/spec-to-pr-pipeline.md`: names `defaults.enableOptionalProofOfWork`, `defaults.enableAutomaticEvidenceCollectForProofOfWork`, `defaults.projectRootFolderToSave` (default `{projectRoot}/.proofOfWork/{slug}`), the never-committed rule; `autoMode` chain retained.
- `.agents/specs/wiki/harness/diagnostics-and-benchmarks.md`: cleanup pair `ws-spec-archive` (harvests shipped plan folders into `index.PRD`) + `ws-cleanup` (lists leftovers, deletes only approved untracked paths).
- `FEATURES.md` § 1.7 names the proof-of-work cluster (other three already named; `README.md` names all four).
- Version `0.5.6 → 0.5.7` aligned across `package.json`, `bin/skill-dependencies.json`, `.agents/skills/ws-shared/runtime/skill-dependencies.json`, `.agents/skills/ws-shared/version.json`, `test/package.json`, and the site footer; `bin/skill-integrity.json` regenerated.
- Step 5 verify score 10/10; Step 6 review clean; Step 7 tests 139/139.

## Next steps

- None functional. Orchestrator owns Step 9 convergence and merge. `Closes #436` is in the PR body.

## References
- Spec: `.agents/plans/us-436/step-00-us-436.spec.md`
- Plan: `step-02-us-436.plan.refined.md`
- Check: `step-05-us-436.plan.report.md`
- Review: `step-06-us-436.review.md`
- Testing: `step-07-us-436.testing.report.md`

## Timing

| Metric | Value |
|--------|-------|
| Total wall-clock time | 16s agent execution |
| Steps executed | 8 (0–7) |
| Total tokens | 0 (not metered by host; estimated: false) |
| Lines added | +138 |
| Lines removed | -78 |
| Net LOC delta | +60 |
| Baseline LOC (bin+test) | 47018 |
| Final LOC (bin+test) | 47078 |

### Step breakdown

| Step | Label | Model | Elapsed | Tokens (est.) | Files changed |
|------|-------|-------|---------|---------------|---------------|
| 0 | Spec | current | 8s | 0 | 2 |
| 1 | Planning | current | 0s | 0 | 1 |
| 2 | Interview | current | 0s | 0 | 2 |
| 3 | Plan to tasks | current | 0s | 0 | 1 |
| 4 | Implement | current | 7s | 0 | 14 |
| 5 | Verify | current | 1s | 0 | 1 |
| 6 | Code review | current | 0s | 0 | 2 |
| 7 | Testing | current | 0s | 0 | 2 |
