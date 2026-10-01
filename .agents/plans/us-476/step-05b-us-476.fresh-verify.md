---
step: 6b
slug: us-476
workflowId: us-476-20261001T010948Z
status: completed
acRefs: [AC1, AC2, AC3, AC4, AC5, AC6, AC7]
head: a601775e
startedAt: "2026-10-01T01:32:00Z"
endedAt: ""
---
# Fresh verification — us-476

Fresh-worker re-derivation of every AC verdict from the spec, plus fault injection on a scratch copy of the detector.

## Re-derivation (spec → code → observed)

| AC | Fresh verdict | Basis |
|----|---------------|-------|
| AC1 | PASS | Both child-terminal messages include `child terminal for <age>; last row transition <age> ago`; observed in the AC1/AC2/AC3 test failures during injection (message shown verbatim). |
| AC2 | PASS | `childTerminalAgeMs <= graceMs && runAdvanced` selects `info`; e2e snapshot reports `info` propagation-pending for a 5-minute-old child on a freshly written batch state. |
| AC3 | PASS | 20-minute-old child with a stale run reports `warning` ("beyond the grace window"). |
| AC4 | PASS | `classifyMultiSpecWorkflow` terminal-run branch emits `warning` (unchanged). |
| AC5 | PASS | Newer active run claiming the slug emits `warning` (unchanged). |
| AC6 | PASS | Default grace = `TRANSCRIPT_LIMITS.stallWindowMs` (600000); widened/narrowed `graceMs` and CLI `--stall-window 1` change severity as expected. |
| AC7 | PASS | Non-terminal child emits no `stale-parent-row`. |

## Fault injection

| # | Injected fault | Expected | Observed |
|---|----------------|----------|----------|
| F1 | Propagation-pending branch severity `info` → `warning` | AC2 test fails | FAILED: `us-476 AC2: fresh child close must be info, got {...severity:warning...}` |
| F2 | Grace gate `childTerminalAgeMs <= graceMs && runAdvanced` → `if (true)` | AC3 test fails | FAILED: `us-476 AC3: child terminal beyond grace must stay warning, got {...severity:info...}` |

Both faults were detected by the new test; the working tree was restored to the committed detector and re-ran green (`test-ws-monitor-us476: ok`).

## Verdict

Evidence-or-zero: all ACs have fresh positive evidence; both injected faults were caught. **Fresh verification passes.**
