---
slug: us-395
step: 7
workflowId: us-395-20260922T080709Z
status: completed
startedAt: "2026-09-22T14:40:00Z"
endedAt: "2026-09-22T15:20:00Z"
acRefs: []
---
# Testing Report — us-395

## Surface probe

`node .agents/skills/ws-testing/scripts/probe_test_surface.cjs --json` → `hasTestSurface: true`, alias `backendTest` = `npm run test`. Testing runs.

## Battery

| Test | Command | Exit | Notes |
|------|---------|------|-------|
| New monitor fixture | `node test/test-ws-monitor-us395.js` | 0 | terminal-run-active, stale-parent-row, lineage, child-terminal, clean-run negative |
| New writer fixture | `node test/test-terminal-close-us395.js` | 0 | terminal-shape close, telemetry-absent, idempotency, suite registration |
| Monitor regression | `node test/test-ws-monitor.js` / `-us385` / `-us356` | 0 | no false positives |
| State contract | `node test/test-workflow-state-contract.js` / `test-update-state-yaml.js` | 0 | close semantics unchanged |
| Stack invariants | `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node` | 0 | 0 violations |
| Harness clean | `node test/test-harness-clean.js` | 0 | 0 findings |
| Full suite (post-fix) | `npm run test` | 0 | 117/117; hub config byte-identity verified |
| Integrity | `npm run generate-integrity` / `npm run verify-integrity` | 0 / 0 | manifest matches tree (v0.4.56) |
| Live specimens | `node .agents/skills/ws-monitor/scripts/monitor_snapshot.cjs --repo-root . --json` | 0 | Case 1/2/3 findings fire; no terminal-shaped run active |

The full-suite alias was re-run **after** the Step 6 review-fix commit (the fix touched `monitor_snapshot.cjs`), so the observed `backendTest` result is current; integrity was regenerated for the post-fix tree before the run.

## Mutation / sabotage

`verification.mutationTest` is unset and `defaults.skipMutationTesting` is `true`, so the mutation substep is skipped (logged). Ledger rows carry `sabotage: not-required`; no sabotage gate blocks advance. Negative scenarios NS1–NS9 are covered by observed fixtures in the two new tests.

## AC coverage

| AC | Test evidence |
|----|---------------|
| AC1 | `test-terminal-close-us395.js` skipped-close-step close, no telemetry before finish |
| AC2 | `test-ws-monitor-us395.js` snapshot `activeCount` 0 for terminal-shaped run |
| AC3 | `test-ws-monitor-us395.js` older superseded run flagged, newer not |
| AC4 | `test-ws-monitor-us395.js` one-row-per-item table parse |
| AC5 | `test-ws-monitor-us395.js` completed child / in_progress parent row |
| AC6 | `test-ws-monitor-us395.js` terminal run + phantom rows |
| AC7 | `test-ws-monitor-us395.js` terminal-run-active + live `us-243` |
| AC8 | `test-terminal-close-us395.js` idempotent re-apply |
| AC9 | `npm run test` 117/117, `test-harness-clean.js` 0 findings, fixture covers both codes |

## Verdict

Green. No defect; advance to Step 8.
