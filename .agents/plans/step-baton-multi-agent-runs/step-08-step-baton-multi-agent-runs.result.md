---
step: 8
slug: step-baton-multi-agent-runs
workflowId: step-baton-multi-agent-runs-20260918T232508Z
status: completed
startedAt: "2026-09-18T23:25:08Z"
endedAt: "2026-09-19T00:36:20.649Z"
acRefs: []
---
# step-baton-multi-agent-runs — Delivery Result

## Expected

Step-level baton handoffs for multi-CLI workflow runs (17 ACs): `defaults.stepRunners` +
`defaults.runners` run config with fail-fast validation (AC1–AC4); baton claim/release/expiry
protocol on workflow state with revision serialization (AC5–AC8); deterministic Node coordinator
owning the run loop, polling, gates, and advancement checks (AC9–AC12); one-shot worker spawn
contract with sparse pointers + baton envelope (AC13–AC14); claim/release/expiry/spawn/exit
telemetry + read-only `ws-monitor` baton fields (AC15–AC16); optional spec-memo handoff mirror
(AC17). 7 negative scenarios. Out of scope: IPC bus, multi-machine, CLI provisioning, idle LLM
polling, lite renumbering, gate-menu changes.

## Done

- All 17 ACs + 7/7 NS implemented per refined plan P1–P9: `step_baton.cjs` (claim protocol,
  config validation, telemetry helpers), `step_coordinator.cjs` (run loop, spawn, retry policy,
  gate guard, spec-memo mirror), `finish` baton-release hook in `workflow_state.cjs`, additive
  schema keys, `ws-monitor` baton snapshot fields, 6 test suites + 10 fixtures.
- Verify: 9/10 (153/170 units, no known defect, no missing evidence) — gate met.
- Review: clean (0 Critical, 0 Warning, 2 non-blocking suggestions); snapshot `40af4ad4`.
- Testing: PASS — 6/6 suites + full `npm run test` (122 PASS, exit 0); sabotage passed with
  byte-identical restore; mutation skipped per policy.
- Product commit: `40af4ad4 feat(step-baton-multi-agent-runs): verified implementation`
  (30 files, +2676/−18, all 17 ACs linked).

## Next steps

- Ship phase (same run): push + create PR, then Step 9 goal-fix loop to convergence + merge.
- Non-blocking review suggestions (2) may be folded opportunistically during fix-pr.
- Pre-existing repo note: bare env lacks a `python` alias (python3 only); test runs used a
  PATH shim. Unrelated to this feature; no action taken.

## References

- Spec: .agents/plans/step-baton-multi-agent-runs/step-00-step-baton-multi-agent-runs.spec.md
- Plan: step-02-step-baton-multi-agent-runs.plan.refined.md
- Check: step-05-step-baton-multi-agent-runs.plan.report.md
- Review: step-06-step-baton-multi-agent-runs.review.md

## Timing

| Metric | Value |
|--------|-------|
| Total wall-clock time | 1h 36m 47s (5807s agent execution, steps 0–8) |
| Steps executed | 9 (0–8) |
| Total tokens | 0 (estimated: false) |
| Lines added | +2676 |
| Lines removed | -18 |
| Net LOC delta | +2658 |
| Baseline LOC | 84228 (tracked product-tree line count at bootstrap) |
| Final LOC | 86886 |

### Step breakdown

| Step | Label | Model | Elapsed | Tokens (est.) | Files changed |
|------|-------|-------|---------|---------------|---------------|
| 0 | Spec | muse-spark | 91s | 0 | 2 |
| 1 | Planning | muse-spark | 249s | 0 | 2 |
| 2 | Interview | muse-spark | 276s | 0 | 2 (+1 index rebuild) |
| 3 | Plan to tasks | muse-spark | 0s | 0 | 0 (skipped: dag-disabled) |
| 4 | Implement | muse-spark | 2421s | 0 | 30 |
| 5 | Verify | muse-spark | 997s | 0 | 2 |
| 6 | Review | muse-spark | 995s | 0 | 61 (1 review + 60 v0.4.38 bump) |
| 7 | Testing | muse-spark | 395s | 0 | 2 |
| 8 | Ship (close) | muse-spark | 383s | 0 | 1 |
