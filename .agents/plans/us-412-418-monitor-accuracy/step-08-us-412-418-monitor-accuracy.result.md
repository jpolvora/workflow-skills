# Delivery result — us-412-418-monitor-accuracy (step-08)

Status: closed (implementation done). Product commit: d5db8c1a.

## Delivered

Monitor accuracy fixes in `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs`:

1. `expectedArtifacts` follows step membership (`completedSteps` / `stepStatus`
   completed) with the `currentStep` watermark only as a fallback when step lists
   are absent (AC1, AC4).
2. Runs with `status: completed` tolerate historical artifact drift as `info`
   (never `critical`); a present refined plan counts as interview evidence (AC2, AC3).
3. Correlate-first transcript read order (path-correlated, then newest mtime) plus
   recency-aware candidate enumeration, so the correlated session is read within
   one tick (AC6).
4. One shared correlation predicate (`transcriptCorrelates`) for the scan filter
   and `resolveTranscriptSource` over the same stored tail (AC7).
5. `worker-session-stall` fires in the issue shape (AC8).

Tests: `test/test-ws-monitor-us412-418.js` (10 blocks) + 2 `evals.json` entries
(AC9). Full suite 131/131, harness 0 findings, integrity verified, single bump to
0.4.71 (AC10).

## Ship

PR against `main` follows this close; fix-pr convergence to zero threads, then merge.
