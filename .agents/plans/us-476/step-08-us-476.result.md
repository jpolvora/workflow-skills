# us-476 — Delivery Result

## Expected
- AC1: `stale-parent-row` finding carries the measured child-terminal age and last row-transition age.
- AC2: child terminal inside the grace window while the run advances → `info` (propagation pending).
- AC3: child terminal beyond the grace window with no transition → `warning`.
- AC4: terminal run with non-terminal rows → `warning`.
- AC5: newer active run claims the same slug → `warning`.
- AC6: grace defaults to the configured stall window and stays overridable.
- AC7: non-terminal child → no grace-based finding.

## Done
- `detectStaleParentRows` in `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs` now scores severity by child-terminal age and run-advancing evidence; message carries both ages (AC1–AC3, AC5, AC7).
- `snapshot()` threads the resolved `--stall-window` as the grace and exposes batch-state `updatedAt` / mtime as the run-advancing signal (AC2, AC6).
- Terminal-run (`classifyMultiSpecWorkflow`) and superseded-run branches keep `warning` (AC4, AC5).
- `ws-monitor/SKILL.md` and `FEATURES.md` document the time-bounded grace.
- `test/test-ws-monitor-us476.js` (AC1–AC7, NS1–NS3) registered in `test/test-suites.json`; two fault injections caught the grace/severity logic.
- Full suite `npm run test` → all 158 entries pass; harness `node test/test-harness-clean.js` → 0 findings; integrity verified at v0.5.30.

## Next steps
- Batch master owns code-review convergence (`ws-goal-fix-pr`) and the SCM merge (`develop -> main`).
- The default 600s grace still warns for propagation latencies above ~10 minutes; operators can widen `--stall-window`. No code follow-up planned.

## References
- Spec: `.agents/plans/us-476/step-00-us-476.spec.md`
- Plan: `.agents/plans/us-476/step-02-us-476.plan.refined.md`
- Check: `.agents/plans/us-476/step-05-us-476.plan.report.md`
- Fresh verify: `.agents/plans/us-476/step-05b-us-476.fresh-verify.md`
- Review: `.agents/plans/us-476/step-06-us-476.review.md`
- Testing: `.agents/plans/us-476/step-07-us-476.testing.report.md`
- Commits: `e39f76b5` (feat, step 5), `a601775e` (review fix, step 6)

## Timing
- Workflow start: 2026-10-01T01:12:40Z
- Workflow end: 2026-10-01T01:36:00Z
- Total wall-clock time: ~23m
- Tokens: 0 (shell/inline)
