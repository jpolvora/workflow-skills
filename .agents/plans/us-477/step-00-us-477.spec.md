---
id: 477
slug: us-477
title: "ws-monitor: worker-session-stall warns while the state/telemetry clock advances (stale session-source reference)"
source: github
specDate: 2026-09-30
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/477"
labels:
  - bug
step: 0
workflowId: us-477
status: completed
startedAt: "2026-09-30T18:49:01.132Z"
endedAt: "2026-09-30T18:49:01.132Z"
acRefs: []
---
# Specification — ws-monitor: worker-session-stall warns while the state/telemetry clock advances (stale session-source reference)

**State:** open
**Labels:** bug

## Description

`ws-monitor` raises `worker-session-stall` (warning) from the session-source stopwatch while the workflow's own state/telemetry clock is actively advancing, producing a false stall on a healthy run. Two defects are visible in the signal:

1. The session-source idle counter is not re-resolved per tick. It grows monotonically from a frozen reference timestamp, so once the reference goes stale the run can only look "more stalled", never recovered.
2. There is no liveness suppression for the session source. `stalled-workflow` (source `state-telemetry`) correctly stays quiet when state/telemetry advanced, but `worker-session-stall` still warns even when the cited state file was rewritten seconds before the tick that reported it.

The fix is in the stopwatch/session-correlation logic in `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs`: re-read the correlated session file's modification time every tick, prefer the state-recorded driver session over an unrelated `--session-id` root, and suppress or downgrade the session-source signal when the workflow is demonstrably advancing. Existing `state.turnPause` suppression (`worker-session-paused`) must remain unchanged.

### Design Intent

Session correlation was added to catch workers parked at a turn boundary when only the host session (not state/telemetry) could reveal liveness. The correlation inputs (supplied `--session-id` root and cached reference timestamp) were treated as authoritative, but a paired session is not always the run's driver and the reference is not refreshed. The intended contract is that the session source feeds, not overrides, the state/telemetry clock.

## Acceptance Criteria

- AC1: The stopwatch session source shall re-read the correlated session file modification time on every tick.
- AC2: When workflow state or telemetry was written within the stall window, the monitor shall not report `worker-session-stall` at warning severity.
- AC3: If the session-source idle would strictly increase while the correlated file was written within the window, then the stopwatch shall mark the session reference stale.
- AC4: The monitor shall prefer state-recorded driver session ids over an unrelated supplied `--session-id` root when correlating a worker session.
- AC5: The monitor report shall record the session id or file the stopwatch used and report the correlation as weak when it is not the driver.
- AC6: While `state.turnPause` is set, the monitor shall keep emitting `worker-session-paused` and shall not emit `worker-session-stall`.
- AC7: The monitor shall not change the `stalled-workflow` state-telemetry suppression behavior.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Masked-stall detection (#412) | Opposite direction; separate fix site |
| Runs parked at turn boundaries (#413) | Distinct signal already handled by `worker-session-paused` |
| Host-adapter transcript discovery changes | Correlation inputs already exist; only their use changes |
| Historic state or artifact rewrites | Observer is read-only |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Freshness source | Correlated session-file mtime re-read each tick | Matches the issue's per-tick `Date.now() - sessionFileMtime` direction | y |
| Suppression form | Downgrade to `info` with a "correlation stale/not-driver" reason | Preserves an observable signal without a false warning | y |
| Driver session preference | State-recorded `agentTranscripts` / `stepDispatches` ids | These name the session that actually drove the steps | y |
| Input validation, auth, concurrency, data lifecycle, idempotency | N/A because the observer is read-only with no network or stored state | Those dimensions do not apply | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Stopwatch session source + correlation preference only | Spec Out of Scope + diff review |
| Atomic criteria | AC1–AC7 each have a pass/fail observation | Authoring validator + implementation check |
| Failure modes | Missing/unreadable session file stays non-fatal; signal downgrades | AC3 and AC5 |
| Stack invariant | Read-only Node helper, launched with `node`, no writes to workflow state | `ws-check-harness` + read-only observer contract |
| Observation telemetry | Named stopwatch lines and `findings[code]` severities | Validation notes below |
| Open blockers | None | Prior-work sweep found no open PR for issue 477 |

## Validation & Observation Notes

### Telemetry & Observable Signals

- Two consecutive ticks with an advancing state file and an idle correlated session file show a non-increasing session idle (or an explicit stale marker), not a monotonic increase.
- `findings[code=worker-session-stall]` severity is absent or `info` while state/telemetry advanced within the window.
- The report names the session id/file the stopwatch used.
- `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring` on this spec exits 0 before register.

### Negative & Failing Test Scenarios

- A child run whose state file is rewritten seconds before a tick while the correlated root session file is idle must not emit a warning-severity `worker-session-stall`.
- A supplied `--session-id` that is not the driver must be reported as weak correlation, not as a stall.
- A run with `state.turnPause` set must still emit `worker-session-paused` and no `worker-session-stall`.

## Original Issue Context

## Failure class

`ws-monitor` raises `worker-session-stall` (warning) from `stopwatch.source: session` while the workflow's own state/telemetry clock is actively advancing — a false stall on a healthy run. Two independent defects are visible in the signal:

1. The session-source idle counter is **not re-resolved per tick**: it grows monotonically (~1 minute per 60-second tick, e.g. 165m → 173m across consecutive ticks) from a frozen reference timestamp, so once the reference goes stale the run can only look "more stalled", never recovered.
2. There is **no liveness suppression for the session source**: `stalled-workflow` (source `state-telemetry`) correctly stays quiet when state/telemetry advanced, but `worker-session-stall` still warns even when the cited state file was rewritten seconds before the tick that reported it.

## Observed evidence (one live watch, read-only, 60s poll, 600s threshold, `--session-id` + `--follow-transcript`)

- A child standard run progressed Step 4 → 5 → 7 → ship during the watch; its `*.state.json` was rewritten seconds before the tick that emitted `Stopwatch: 165m-173m idle / 10m threshold (session) - STALLED` with `worker-session-stall` evidence pointing at **that same state file**.
- The correlated host session directory (Muse adapter, supported host) had its root `session.jsonl` written within the current tick window while the reported session idle grew monotonically → the stopwatch's session reference is a stale/cached timestamp, not the correlated file's current mtime.
- The batch parent run (status `active`) was also flagged `worker-session-stall` while its children were shipping (delivery commits, PR open, fix-pr round mid-flight) in a different session — session correlation bound to the supplied `--session-id` root, which was not the session driving the run.
- An earlier tick showed the mirror case of #412: that issue documents a **real stall being masked** (scan-capped / zero files); this issue is a **non-stall being reported**. Both share the same root area — session correlation quality — but the fix direction differs.

## Expected contract

- `worker-session-stall` must not fire at warning severity while the workflow's state/telemetry clock advanced within the stall window (downgrade to `info` with an explicit "session correlation stale/not-driver" reason, or re-resolve before classifying).
- The session-source timestamp must be re-read from the correlated session file every tick; a monotonically frozen idle counter is a bug, not a stall.
- Session correlation must prefer the session that actually drives the run (state-recorded `agentTranscripts` / `stepDispatches` session ids) over an unrelated `--session-id` root; when the supplied session is not the driver, report the correlation as weak instead of warning on it.
- Existing suppression via `state.turnPause` (`worker-session-paused`) stays as-is; this issue is only about advancing-clock suppression and session-source freshness.

## Reproduction shape

- Install scope: project-local skills; Muse host adapter; `--session-id` supplied for a paired session that is not the workflow driver.
- Command class:
  - `node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --watch --interval 60 --until-terminal --follow-transcript --session-id <id> --stall-window 600 --json`
- Sufficient conditions: a batch whose child workers advance state every few minutes while the correlated root session file is idle, plus one tick where the session reference timestamp is captured and left unresolved.

## Suggested direction (observer did not patch anything)

- Per-tick `Date.now() - sessionFileMtime` for `source: session`; assert the reported idle does not strictly increase across ticks with no file write.
- Cross-source guard: `state-telemetry` clock advanced within threshold → suppress/downgrade `session`-source stall.
- Record which session id/file the stopwatch used in the report so a mismatch with the driver session is diagnosable.

## Scope

- [x] No product fix was applied by the observer
- [x] No workflow state or managed skill copy was modified
- [x] All private data removed (no session ids, paths, transcript content)

Related: #412 (real stall masked — opposite direction), #413 (runs parked at turn boundaries that appear stalled).

### Prior Work Sweep

No open pull request references issue 477. Keyword search (`worker-session-stall`, `session`, `correlation`) returned only merged PRs (#364 host adapters, #417 the stall-detection feature). None fix the stale session reference. Design-intent note: the session source was added to catch turn-boundary parking; it was never wired to defer to the state/telemetry clock.

## Notes

Lookup: session-source stopwatch and the `worker-session-stall` suppression block are in `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs` (correlation set and paused-state handling around the worker stall block). Stack file is the Node 22 skill package. MEMORY had no trap that changes this fix.
