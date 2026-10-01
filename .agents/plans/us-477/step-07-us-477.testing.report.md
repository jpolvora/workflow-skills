---
step: 7
slug: us-477
workflowId: us-477-20260930T235947Z
status: completed
acRefs: []
title: Testing report — session-source stall deference
startedAt: "2026-10-01T00:34:00Z"
endedAt: "2026-10-01T00:38:00Z"
---
# Testing — us-477

Test surface: `probe_test_surface.cjs` → surface present (`skipReason: null`); the repo test
entry `test/test-ws-monitor-liveness.js` carries the new us-477 assertions.

## Executed

| Command | Result |
|---------|--------|
| `npm run test` (alias `backendTest`) | exit 0 — `run-tests: all 157 entries passed (mode=local)` |
| `node test/test-ws-monitor-liveness.js` | exit 0 — M1–M9 + us-477 M10 (AC2), M11 (AC4/AC5), M12 (AC3) |
| `node test/test-ws-monitor-us356.js` | exit 0 — aged state clock keeps the AC14 stall |
| `node test/test-ws-monitor-us412-418.js` | exit 0 — AC8 stall, AC10 read-only |
| `node test/test-ws-monitor-watch-profile.js` | exit 0 — P3 window, P4 stalled-workflow |
| `node test/test-ws-monitor.js`, `-us464`, `-us473`, `-us385`, `-us388`, `-us395` | exit 0 |
| `node test/test-step-baton-monitor.js` | exit 0 |
| `node --check monitor_snapshot.cjs` | exit 0 |

## Coverage of the change

- AC1/AC3: M12 exercises two in-process ticks against a rewritten session file and asserts
  the stale marker; the AC3 fault injection (fresh-verify) is caught.
- AC2/NS1: M10 asserts the advancing state clock suppresses the warning.
- AC4/AC5/NS2: M11 asserts driver preference, the weak flag, and the named session file.
- AC6/NS3: M5 asserts pause vs stall is preserved.
- AC7: P4 asserts `stalled-workflow` is unchanged.

## Mutation testing

`defaults.skipMutationTesting: true` → mutation/sabotage battery skipped by configuration.

## Verdict

All green. Advance to Step 8.
