# Check report — us-412-418-monitor-accuracy (step-05)

Score: 10/10 (min 9). All ACs verified against the tree; no refinement round needed.

- AC1 membership-first + watermark fallback: `expectsStep` in `monitor_snapshot.cjs`;
  unit assertions pass (completedSteps, stepStatus-only, absent-lists fallback).
- AC2 fix-PR-only (`[8,9]`, empty dir): 0 critical (was 9 pre-fix; repro script).
- AC3 terminal drift + companion evidence + empty-skips grandfathering: 0 critical,
  info cites refined plan; covered with and without skip records.
- AC4 sequential legacy without `dag-disabled`: no exec expectation unless step 3
  ran; true completion still expects it.
- AC5 live run past verification without artifacts: 6 criticals preserved; fallback
  path also flags. No over-correction.
- AC6 correlate-first within one tick: global read order (path-correlated, then
  mtime desc) + recency-aware enumeration; stubbed-clock time-pressure unit gives
  filesScanned 1 + capped-honest; CLI issue shape gives filesScanned >= 1.
- AC7 shared window/predicate: `transcriptCorrelates` used by scan filter and
  resolve over the same stored tail; key-outside-8KB fixture resolves available.
- AC8 stall in the issue shape (discovery on + explicit root + nested history,
  idle session, small stall window): `worker-session-stall` warning fires.
- AC9 evals: `test/test-ws-monitor-us412-418.js` (10 blocks) + 2 evals.json entries.
- AC10 suites + read-only: full `npm run tests` 131/131 green; snapshot writes
  nothing (byte-compare assertion); Node-only, no secrets in findings.

Pre-existing suites: us-385 AC4 conflict found during verify — resolved by narrowing
tolerance to `status === 'completed'` (AC3's literal definition); us-385 green again,
new-test assertions unaffected. `test-harness-clean.js` 0 findings; integrity
regenerated + verified.

Advance to product commit: yes.
