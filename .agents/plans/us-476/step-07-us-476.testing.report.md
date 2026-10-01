---
step: 7
slug: us-476
workflowId: us-476-20261001T010948Z
status: completed
acRefs: []
startedAt: "2026-10-01T01:36:00Z"
endedAt: "2026-10-01T01:30:30.769Z"
---
# Testing report — us-476

## Battery

| Layer | Command | Result |
|-------|---------|--------|
| Unit / regression (targeted) | `node test/test-ws-monitor-us476.js`, `test-ws-monitor-us395.js`, `test-ws-monitor-us388.js`, `test-ws-monitor.js` | PASS |
| Full suite | `npm run test` (Node 22, 158 entries incl. harness-efficiency) | **exit 0 — all 158 entries passed** |
| Harness | `node test/test-harness-clean.js` | Harness OK — 0 findings |
| Integrity | `npm run verify-integrity` | OK (v0.5.30) |

## Coverage of the change

- `test/test-ws-monitor-us476.js` — AC1–AC7 and NS1–NS3:
  - AC1 age-carrying message; AC2 info propagation-pending (unit + CLI e2e); AC3 warning beyond grace; AC4 terminal run warning; AC5 superseded run warning; AC6 default/override grace (unit + `--stall-window 1` e2e); AC7 non-terminal child no finding.
- Regression: `test/test-ws-monitor-us395.js` (original stale-parent-row semantics), `test-ws-monitor-us388.js` (`missing-child-state`), and the base monitor suite all stay green.

## Notes

- No mutation-testing gate is configured (`skipMutationTesting: true`).
- Test suite byte-identity check confirms no consumer hub config mutation.

## Verdict

**Testing passes.** No failures, no skips.
