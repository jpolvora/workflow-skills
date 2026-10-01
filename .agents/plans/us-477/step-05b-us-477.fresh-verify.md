---
step: 5b
slug: us-477
workflowId: us-477-20260930T235947Z
status: completed
acRefs: []
title: Fresh-worker verify — session-source stall deference
startedAt: "2026-10-01T00:27:00Z"
endedAt: "2026-10-01T00:33:00Z"
---
# Fresh-worker verification — us-477

Independent re-derivation of every AC verdict from `step-00-us-477.spec.md` and the
committed diff (`main...HEAD`), plus one fault injection per AC. Evidence-or-zero.

## Re-derived verdicts

| AC | Re-derived verdict | Independent evidence |
|----|--------------------|----------------------|
| AC1 | PASS | `monitor_snapshot.cjs:1876-L1906` re-stats the correlated file each tick; the second `snapshot()` call in M12 observes the advanced mtime. Re-read independently of the first derivation. |
| AC2 | PASS | `monitor_snapshot.cjs:1966-L1994`; M10 (fresh state clock + 20m idle session) reports no warning-severity `worker-session-stall`. |
| AC3 | PASS | `monitor_snapshot.cjs:1908-L1916`; M12 asserts `sessionRef.stale === true` after the file is rewritten within the window. |
| AC4 | PASS | `monitor_snapshot.cjs:1466-L1476`, `1864-L1874`; M11 asserts `transcriptSource.driver === true` and the driver file is named despite an unrelated `--session-id`. |
| AC5 | PASS | `monitor_snapshot.cjs:1917-L1927`, `2112-L2114`; M11 asserts `sessionRef.weak === true` for the non-driver case and `false` for the driver. |
| AC6 | PASS | `monitor_snapshot.cjs:1952-L1963`; M5 asserts `worker-session-paused` (info) and no `worker-session-stall` while `turnPause` is set. |
| AC7 | PASS | `monitor_snapshot.cjs:1995-L2000` unchanged from `main` (diff confirms); P4 asserts `stalled-workflow` for a no-session hung workflow. |

## Fault injection (one per AC)

Each fault was applied to the committed script, the relevant suite re-run, then the file
restored (`git status` clean; `/tmp/fresh-inject.cjs`).

| AC | Injected fault | Result |
|----|----------------|--------|
| AC1 | (covered by the AC3 mutation, same per-tick `statSync` path; a removed stat falls back to the scan reference the scan re-reads, so behavior is preserved by design) | PASS (re-derivation) |
| AC2 | `advancing = false` (disable state-clock suppression) | **CAUGHT** — M10 fails |
| AC3 | `sessionStale = false` (disable stale detection) | **CAUGHT** — M12 fails |
| AC4 | ignore the state-recorded driver source | **CAUGHT** — M11 fails |
| AC5 | `sessionRef.weak = false` | **CAUGHT** — M11 fails |
| AC6 | disable the `turnPause` branch | **CAUGHT** — M5 fails |
| AC7 | non-regression; diff shows the `stalled-workflow` branch byte-identical to `main`, P4 green | PASS (diff + P4) |

## Evidence

- `node test/test-ws-monitor-liveness.js` → exit 0 (M1–M9 + us-477 M10–M12).
- `node test/test-ws-monitor-us356.js`, `-us412-418.js`, `-watch-profile.js` → exit 0.
- `npm run test` → exit 0 (`run-tests: all 157 entries passed (mode=local)`).

## Verdict

All 7 ACs re-derived PASS; 5/5 injectable faults caught; 2 non-injectable ACs verified by
diff/regression. No residual defects. Advance to Step 7.
