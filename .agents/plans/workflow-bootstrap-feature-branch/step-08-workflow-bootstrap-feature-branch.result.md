# workflow-bootstrap-feature-branch — Delivery Result

## Expected

On a new `ws-spec-to-pr` / `ws-spec-to-pr-lite` start, ask via `user-gate` whether to create `feat/{slug}` from current HEAD, create it from `{baseBranch}`, or stay on the current branch. Record `state.branch` / `branchStrategy` / `baseBranch` before baseline/checkpoint. Workflow-mode `ws-ship-pr` uses `state.branch` as PR head (AC1–AC11).

## Done

- Shared **5b Feature branch gate** in `.agents/skills/ws-shared/setup.md` (after Identity, before Baseline); resume **4b** HEAD-mismatch STOP
- `gates.md` auto-gate rows: new-start stay; resume checkout `state.branch`
- `PROTOCOLS.md` documents `branchStrategy` + `baseBranch`
- `ws-ship-pr`: `shipHead` from `state.branch` in workflow mode; skip `git pull` when no upstream (W1 fix); standalone still `workingBranch`
- Lite orch on-demand loads `setup.md` §5b
- `test/test-feature-branch-gate.js` wired into `package.json` tests (AC1–AC11 contracts; exit 0)
- Integrity regenerated (`npm run verify-integrity` OK)
- Step 5 score **9/10**; Step 6 clean after 1 autofix (W1); Step 7 testing pass (mutation skipped)
- Fable: VERIFIED WITH CAVEATS

## Next steps

- `autoMode` + `fullMode: false` → **shipAction: skip** (no delivery commit, no PR this run)
- To ship: re-run with `full` or invoke `/ship-pr` from a feature branch (`feat/workflow-bootstrap-feature-branch` recommended; this run stayed on `develop` per autoMode)
- Full `npm run test` (install Phase 0b) was blocked by a concurrent `ws-configure-project` tree; re-run when that session settles
- Do not mix this feature’s commit with `ws-configure-project/**`

## References

- Spec: `.agents/plans/workflow-bootstrap-feature-branch/step-00-workflow-bootstrap-feature-branch.spec.md`
- Plan: `.agents/plans/workflow-bootstrap-feature-branch/step-01-workflow-bootstrap-feature-branch.plan.md` (Step 2 skipped)
- Check: `.agents/plans/workflow-bootstrap-feature-branch/step-05-workflow-bootstrap-feature-branch.plan.report.md`
- Review: `.agents/plans/workflow-bootstrap-feature-branch/step-06-workflow-bootstrap-feature-branch.review.md`
- Testing: `.agents/plans/workflow-bootstrap-feature-branch/step-07-workflow-bootstrap-feature-branch.testing.report.md`

## Benchmark

| Metric | Value |
|--------|-------|
| Total wall-clock time | 35m 30s (2130s agent execution) |
| Steps executed | 0–8 (step 2 skipped; step 9 not run) |
| Total tokens | 0 (estimated: true; not metered) |
| Lines added | +105 tracked (+ new `test/test-feature-branch-gate.js`) |
| Lines removed | -30 |
| Net LOC delta | +75 tracked (plus untracked test file) |
| Baseline LOC | 4677 (`test/`) |
| Final LOC | 4677 tracked `test/` (new test file untracked at result time) |

### Step breakdown

| Step | Label | Model | Elapsed | Tokens (est.) | Files changed |
|------|-------|-------|---------|---------------|---------------|
| 0 | Spec | Cursor Grok 4.6 | 180s | 0 | 3 |
| 1 | Planning | cursor-grok-4.6-high | 120s | 0 | 1 |
| 2 | Interview | Cursor Grok 4.6 | 0s | 0 | 0 (skipped) |
| 3 | Plan to tasks | cursor-grok-4.6-high | 90s | 0 | 2 |
| 4 | Implement | composer-2.5 | 900s | 0 | 8 |
| 5 | Verify | cursor-grok-4.6-high | 180s | 0 | 1 |
| 6 | Code review | cursor-grok-4.6-high | 300s | 0 | 4 |
| 7 | Testing | cursor-grok-4.6-high | 180s | 0 | 2 |
| 8 | Ship | Cursor Grok 4.6 | 60s | 0 | 1 (result only; ship skipped) |
