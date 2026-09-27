---
us: ws-spec-to-pr-distributed
reportDate: 2026-09-27
step: 8
slug: ws-spec-to-pr-distributed
workflowId: ws-spec-to-pr-distributed
status: completed
startedAt: "2026-09-27T13:04:18.392Z"
endedAt: "2026-09-27T16:09:35.768Z"
acRefs: []
---
# ws-spec-to-pr-distributed — Delivery Result

## Expected

Extract the multi-CLI step-baton capability out of `ws-spec-to-pr` into a dedicated, explicitly-invoked
`ws-spec-to-pr-distributed` workflow, preserving the standard 0–9 FSM, the baton contract, telemetry, and
monitor fields — a behavior-preserving ownership transfer (spec `0143`, issue #438).

## Done

- New skill `ws-spec-to-pr-distributed` (body + `references/coordinator.md` + `evals/evals.json`) with the
  coordinator at `ws-spec-to-pr-distributed/scripts/step_coordinator.cjs`; renamed out of `ws-spec-to-pr`.
- Registered in both dependency manifests under the `workflows` package with an explicit `dependencies` entry;
  `ws-shared/runtime/skill-dependencies.json` stays byte-identical to `bin/skill-dependencies.json`.
- Coordinator prose re-homed out of shared runtime (`host-dispatch.md` §7, `gates.md` gate-surfacing) into the
  distributed skill; `ws-spec-to-pr/SKILL.md` slimmed to a neutral one-line pointer (10584 B < 11234 B).
- `ws-check-workflows` extended with a fail-closed workflow registry (`--workflow <id>`) + distributed
  simulation; unknown ids exit 1.
- Baton suites and `test-suites.json` re-pointed to the new coordinator path; new
  `test/test-check-workflows-distributed.js` added (AC2/AC13/AC15, NS6).
- Docs/site/wiki/router synced: `AGENTS.md`, `README.md`, `FEATURES.md`, `CATALOG.md`, `autoload.md`,
  `git-ownership.md` §5 matrix, `docs/llms.txt`, rebuilt `docs/index.html` + wiki, `docs/wiki` pages.
- Version bumped 0.5.3 → 0.5.4 (canonical + both manifests + site footer); integrity regenerated and verified.
- Verification: `npm run test` 138/138 pass, `test-harness-clean.js` 0 findings, `verify-integrity` OK,
  `ws-check-workflows` 0 critical, stack invariants 0 issues, coverage 82.4% lines / 71.43% branches,
  regression sabotage passed. Step-5 verify score 10/10.

## Next steps

- Ship: push `feature/ws-spec-to-pr-distributed` and open the PR into `develop` with `Closes #438`.
- Step 9 convergence/merge is owned by the orchestrator (this run stops before fix-PR).

## References

- Spec: `.agents/plans/ws-spec-to-pr-distributed/step-00-ws-spec-to-pr-distributed.spec.md`
- Plan: `.agents/plans/ws-spec-to-pr-distributed/step-02-ws-spec-to-pr-distributed.plan.refined.md`
- Verify: `.agents/plans/ws-spec-to-pr-distributed/step-05-ws-spec-to-pr-distributed.plan.report.md` (10/10)
- Review: `.agents/plans/ws-spec-to-pr-distributed/step-06-ws-spec-to-pr-distributed.review.md` (0 Critical/Warning)
- Testing: `.agents/plans/ws-spec-to-pr-distributed/step-07-ws-spec-to-pr-distributed.testing.report.md`
- Product commit: `e79c96dc`

## Timing

**Total wall-clock time**: 3h 4m (start 2026-09-27T13:04:18Z → 2026-09-27T16:08:00Z)

### Step breakdown

| Step | Label | Elapsed |
|------|-------|---------|
| 0 | Spec | 7s |
| 1 | Planning | <1s |
| 2 | Interview | <1s |
| 3 | Plan to tasks | 12s |
| 4 | Task implementation | resumed in-place |
| 5 | Plan verification | score 10/10 |
| 6 | Code review | 0 Critical/Warning |
| 7 | Testing | 138/138 + coverage + sabotage |
