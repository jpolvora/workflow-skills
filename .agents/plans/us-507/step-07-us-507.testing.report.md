---
step: 7
slug: us-507
workflowId: uswf-us-507-20261012T235108Z
status: completed
startedAt: "2026-10-13T00:40:00Z"
endedAt: "2026-10-13T00:40:00Z"
acRefs: []
---
# Testing Report — us-507

Configured verification alias (`config.json.verification.backendTest`):
`npm run test`. Machine test-surface probe
(`ws-testing/scripts/probe_test_surface.cjs`) reported a surface with no
`skipReason`, so testing ran (not skipped).

## Commands and results

| Check | Command | Result |
|-------|---------|--------|
| Configured alias | `npm run test` | **all 164 entries passed** (local mode); hub config byte-identity verified |
| New suite | `node test/test-ws-monitor-us507.js` | ok |
| Syntax | `node --check .agents/skills/ws-monitor/scripts/monitor_snapshot.cjs` | exit 0 |
| Stack invariants | `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs` | 0 issues |
| Harness clean | `node test/test-harness-clean.js` | 0 findings |
| Integrity | `npm run verify-integrity` | OK (v0.5.42) |
| Monitor anchors | `test-ws-monitor.js`, `-us356`, `-us385`, `-us388`, `-us395`, `-us412-418`, `-liveness`, `-watch-profile`, `-us464`, `-us473`, `-us476`, `-us478`, `test-observer-us365.js`, `test-step-baton-monitor.js`, `test-terminal-close-us395.js`, `test-local-first-precedence.js` | all exit 0 |

## AC coverage

The new suite exercises every AC directly (19 blocks): detection + counts
(AC1/AC2/AC7/AC8/AC9), finding evidence + freshness (AC3/AC4/AC5/AC6), record
shape (AC12), artifact naming (AC13), bounded scan (AC14), entry skipping
(AC15), state presence (AC10), selection (AC11), contract map (AC16/AC17),
read-only (AC18), and documentation (AC19). Fresh-verify re-derived all 19 ACs
with a fault injection each (`step-05b-us-507.fresh-verify.md`, 0 defects).

## Mutation testing

`defaults.skipMutationTesting: true` — mutation/sabotage gate not run
(opt-in only; unchanged behavior).

## Result

Green. No failures, no flaky reruns, no uncovered negative scenario.
