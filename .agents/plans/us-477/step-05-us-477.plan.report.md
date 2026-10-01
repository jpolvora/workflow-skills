---
step: 5
slug: us-477
workflowId: us-477-20260930T235947Z
status: completed
acRefs: []
title: Check-implementation report — session-source stall defers to the state/telemetry clock
startedAt: "2026-10-01T00:12:00Z"
endedAt: "2026-10-01T00:20:00Z"
---
# Check-implementation — us-477

**Verification score: 10/10** (`ac_ledger.cjs score --boundary step5`: earnedUnits 70/70,
no deficiencies, no errors).

Verification aliases: `backendTest` = `npm run test` → **exit 0** (`run-tests: all 157 entries
passed (mode=local)`; log `/tmp/us477-npm-test.log`). `node --check monitor_snapshot.cjs` → exit 0.
Targeted ws-monitor suites: `test-ws-monitor-liveness.js` (M1–M9 + new us-477 M10–M12),
`test-ws-monitor-us356.js`, `test-ws-monitor-us412-418.js`, `test-ws-monitor-watch-profile.js`,
`test-ws-monitor.js`, `test-ws-monitor-us464/us473/us385/us388/us395.js`, `test-step-baton-monitor.js`
→ all exit 0.

## AC verdicts

| AC | Verdict | Evidence |
|----|---------|----------|
| AC1 | Implemented | `monitor_snapshot.cjs:1876-L1906` re-stats the correlated session file every tick (`sessionFile` → `fs.statSync`), falling back to the scanned reference only when unreadable. Test `us-477 AC3 stale session reference marked` (second tick re-reads). |
| AC2 | Implemented | `monitor_snapshot.cjs:1966-L1994` downgrades `worker-session-stall` to `info` when `stateIdleMs <= stallWindowMs` (state/telemetry written within the window). Test `us-477 AC2 advancing state clock suppresses warning stall`. |
| AC3 | Implemented | `monitor_snapshot.cjs:1908-L1916` marks `sessionStale` when the file mtime advanced past the cached reference while the file was written within the window; `sessionRef.stale` is surfaced. Test `us-477 AC3 stale session reference marked`. |
| AC4 | Implemented | `monitor_snapshot.cjs:1466-L1476` (state-recorded driver source, `driver: true`) wins in `1864-L1874` before discovery, so a supplied `--session-id` cannot override the driver. Test `us-477 AC4/AC5 driver preferred and weak correlation reported`. |
| AC5 | Implemented | `monitor_snapshot.cjs:1917-L1927` records `sessionRef { id, file, weak, stale }`; `2112-L2114` renders it in `markdownReport`; weak matches are downgraded (`source.weak`). Test `us-477 AC4/AC5 driver preferred and weak correlation reported`. |
| AC6 | Implemented | `monitor_snapshot.cjs:1952-L1963` keeps the `turnPause` → `worker-session-paused` (info) branch ahead of the stall branch. Test `M5 pause marker suppresses stall and reports pause`. |
| AC7 | Implemented | `monitor_snapshot.cjs:1995-L2000` leaves the no-session `stalled-workflow` (state-telemetry) branch unchanged. Test `P4 hung workflow raises stalled-workflow + stopwatch`. |

## Negative & failing test scenarios

| NS | Verdict | Evidence |
|----|---------|----------|
| NS1 | Implemented | A child run whose state file is rewritten seconds before a tick while the correlated root session file is idle reports no warning-severity stall (M10). |
| NS2 | Implemented | A supplied `--session-id` that is not the driver is reported as weak correlation, not a stall (M11). |
| NS3 | Implemented | A run with `state.turnPause` set still emits `worker-session-paused` and no `worker-session-stall` (M5). |

## Stack & security invariants

- Node-only `.cjs`; `node --check` clean; no `.py` added.
- Read-only observer: the change adds `fs.statSync` reads only; no new writes to state/plans/network.
- Status-literal severity: the session-stall decision keys on idle vs window; it does not feed
  `terminalShape`/`deriveTerminalStatus` into a severity (MEMORY trap honored).
- Additive report shape: `sessionRef` added; `transcriptSource`/`stopwatch` keys keep their shape.
- `stalled-workflow` and `worker-session-paused` contracts unchanged.

## Residual risk

The cross-tick stale marker is process-local (a `Map`), so it only fires in a live `--watch`
run; a single-shot snapshot relies on the AC1 per-tick re-read plus the AC2 cross-source
suppression, which is the intended contract.
