# Delivery result — us-504

## Expected

Fix `check_workflows.cjs` global-tree mis-resolution (issue 504):
skills-dir-first resolver, `--repo-root` parity with harness gates,
cwd fallback, regression fixture + suite. Ship PR `develop` → `main`
with `Closes #504`.

## Done

- Spec: `.agents/specs/pending/0175-us-504.spec.md` (authoring PASS) +
  workflow copy `.agents/plans/us-504/step-00-us-504.spec.md`; tracked row 186.
- Plan: `step-01-us-504.plan.md` + `.runtime/plan.index.json` (9 sections, 6 ACs).
- Classify: standard / standard / dag / no-interview.
- Implement: resolver-first fix, CLI parity, fallback hardening,
  `test-check-workflows-global-root.js` + suite registration,
  integrity regen, version bump 0.5.39 → 0.5.40.
- Verify: ledger 10/10 pre-step6; G2 commit `c9b47ecf`
  (`feat(us-504): verified implementation`, 10 files).
- Review: `step-06-us-504.review.md` CLEAN (1 suggestion, no fix loop).
- Fresh-verify: `step-05b-us-504.fresh-verify.md`, all ACs VERIFIED;
  old-code injection FAILs 19/18, fixed code PASSes 0.
- Testing: `step-07-us-504.testing.report.md`, full suite 162/162 green.

## Next steps

Ship (push `develop`, create PR to `main`), then Step 9 fix-PR
convergence, merge, `comment-issue` + `close-issue` for 504.

## Timing

- Total wall-clock time: ~4h 25m (2026-10-12T16:07Z import snapshot
  → ~20:32Z close; includes worker-stall takeover overhead).
- Agent execution concentrated in fix + verify + suite green runs.
