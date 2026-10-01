---
step: 6
slug: us-477
workflowId: us-477-20260930T235947Z
status: completed
acRefs: []
title: Code review — session-source stall deference
startedAt: "2026-10-01T00:22:00Z"
endedAt: "2026-10-01T00:26:00Z"
---
# Code review — us-477

Scope: `git diff main...HEAD` (7 files, +223/-31) at commit `a9fcefe0`.

## Findings

| # | Severity | Location | Finding | Resolution |
|---|----------|----------|---------|------------|
| 1 | Warning | `monitor_snapshot.cjs` info-stall reason string | The ternary `sessionStale ? 'stale' : source.weak ? 'not-driver' : 'not-driver'` reported `not-driver` even when the branch was entered only because state/telemetry was advancing (strong, non-stale correlation) — a misleading diagnosis for exactly the AC2 case the issue is about. | Fixed: reason is now `stale` / `not-driver` / `state/telemetry-advancing`; re-ran the four ws-monitor suites (all green). |

No Critical findings. No open Warning/Critical findings after the fix.

## Checks

- Read-only observer: new code adds only `fs.statSync` reads; no writes, no network, no git mutation.
- Severity contract: session-stall decision keys on idle vs window; no `terminalShape`/`deriveTerminalStatus` input (MEMORY trap honored).
- Additive report shape: `sessionRef` is new; `transcriptSource`/`stopwatch` shapes unchanged.
- Contracts preserved: `worker-session-paused` (AC6) and `stalled-workflow` (AC7) branches unchanged.
- Node-only; `node --check` clean; no `.py`.
- Tests: `test-ws-monitor-liveness` (incl. new M10–M12), `-us356`, `-us412-418`, `-watch-profile` → exit 0 after the fix.

## Verdict

Clean. Advance to Step 6b (fresh verify).
