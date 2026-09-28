---
us: ws-spec-to-pr-distributed
reportDate: 2026-09-27
step: 7
slug: ws-spec-to-pr-distributed
workflowId: ws-spec-to-pr-distributed
status: completed
startedAt: "2026-09-27T13:04:18.392Z"
endedAt: "2026-09-27T16:07:22.510Z"
acRefs: []
---
# Testing Report — ws-spec-to-pr-distributed

## Result

**PASS** — all planned areas passed; mutation skipped by policy; regression sabotage passed.

## Unit & integration

| Check | Command | Exit |
|-------|---------|------|
| Full local suite (138 entries) | `npm run test` | 0 |
| Harness self-audit | `node test/test-harness-clean.js` | 0 (0 findings) |
| Integrity | `npm run verify-integrity` | 0 (v0.5.4) |
| Workflow FSM registry | `node .agents/skills/ws-check-workflows/scripts/check_workflows.cjs` | 0 |
| Stack invariants | `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs` | 0 (0 issues) |

Baton suites (`test-step-coordinator`, `test-step-baton-config`, `test-step-baton-claim`,
`test-step-baton-telemetry`, `test-step-baton-monitor`, `test-step-baton-specmemo`) and
`test-worker-turn-guard` all exit 0; every one is re-pointed to
`.agents/skills/ws-spec-to-pr-distributed/scripts/step_coordinator.cjs`.

## Coverage

`npm run coverage` exit 0 — All files: 82.40% statements, 71.43% branches, 91.57% functions, 82.40% lines
(thresholds lines ≥ 80, branches ≥ 68). New modules: `check_workflows.cjs` 78.35% lines / 47.51% branches,
`step_coordinator.cjs` 80.08% lines / 64.42% branches (aggregate gate satisfied).

## Mutation

**skipped** — `verification.mutationTest` is empty/unset and `defaults.skipMutationTesting` defaults to true.

## Regression Sabotage

| Field | Value |
|-------|-------|
| Status | passed |
| Test | `node test/test-check-workflows-distributed.js` via `backendTest` (`npm run test`) |
| Invert patch | renamed the distributed registry key in `check_workflows.cjs` |
| Observed | `test-failed-as-expected`, `testExitCode: 1`, `restored: true` |
| Helper exit | 0 (linked to AC13) |

## Accessibility / UI

N/A — package/harness change with no rendered UI surface (site is static generated HTML).

## Final verdict

PASS. No failed area; no residual testing gaps.
