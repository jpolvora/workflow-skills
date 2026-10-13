# Fresh-verify report — us-507

- **Slug**: us-507
- **Date/Time**: 2026-10-13T00:37:17.877Z
- **Round**: 1/3
- **Defects**: 0 (`loopAction`: done)

## Per-AC Verdicts

| AC | Verdict | Pass evidence | Injection red | Score |
|----|---------|---------------|---------------|-------|
| AC1 | pass | test/test-ws-monitor-us507.js:L96-L120 | test-ws-monitor-us507 AC1 state-less run reported (never discover) (exit 1) | 1 |
| AC2 | pass | test/test-ws-monitor-us507.js:L196-L210 | test-ws-monitor-us507 AC2 artifact-less dir is not a run (exit 1) | 1 |
| AC3 | pass | test/test-ws-monitor-us507.js:L122-L132 | test-ws-monitor-us507 AC3 finding evidence names newest artifact (exit 1) | 1 |
| AC4 | pass | test/test-ws-monitor-us507.js:L120-L124 | test-ws-monitor-us507 AC4 fresh finding is warning (exit 1) | 1 |
| AC5 | pass | test/test-ws-monitor-us507.js:L140-L151 | test-ws-monitor-us507 AC5 stale finding is info (exit 1) | 1 |
| AC6 | pass | test/test-ws-monitor-us507.js:L155-L175 | test-ws-monitor-us507 AC6 boundary: age == window is fresh (exit 1) | 1 |
| AC7 | pass | test/test-ws-monitor-us507.js:L126-L132 | test-ws-monitor-us507 AC7 empty-discovery line suppressed (exit 1) | 1 |
| AC8 | pass | test/test-ws-monitor-us507.js:L180-L190 | test-ws-monitor-us507 AC8 fresh run keeps --until-terminal open (exit 1) | 1 |
| AC9 | pass | test/test-ws-monitor-us507.js:L136-L151 | test-ws-monitor-us507 AC9 stale run is not counted active (exit 1) | 1 |
| AC10 | pass | test/test-ws-monitor-us507.js:L231-L259 | test-ws-monitor-us507 AC10 state file suppresses run-without-state (exit 1) | 1 |
| AC11 | pass | test/test-ws-monitor-us507.js:L265-L275 | test-ws-monitor-us507 AC11 --slug resolves by directory name (exit 1) | 1 |
| AC12 | pass | test/test-ws-monitor-us507.js:L106-L116 | test-ws-monitor-us507 AC12 statePath is null (exit 1) | 1 |
| AC13 | pass | test/test-ws-monitor-us507.js:L212-L215 | test-ws-monitor-us507 AC13 non-prefix name is not activity (exit 1) | 1 |
| AC14 | pass | test/test-ws-monitor-us507.js:L200-L226 | test-ws-monitor-us507 AC14 only the top-level artifact counts (exit 1) | 1 |
| AC15 | pass | test/test-ws-monitor-us507.js:L281-L298 | test-ws-monitor-us507 AC15 sibling state-less run still reported (exit 1) | 1 |
| AC16 | pass | test/test-ws-monitor-us507.js:L307-L307 | test-ws-monitor-us388 AC6 missing-child-state severity unchanged (exit 1) | 1 |
| AC17 | pass | test/test-ws-monitor-us507.js:L303-L317 | test-ws-monitor-us507 AC17 DEFECT_CONTRACTS gains run-without-state (exit 1) | 1 |
| AC18 | pass | test/test-ws-monitor-us507.js:L322-L329 | test-ws-monitor-us507 AC18 snapshot leaves the plans tree byte-identical (exit 1) | 1 |
| AC19 | pass | test/test-ws-monitor-us507.js:L334-L340 | test-ws-monitor-us507 AC19 actionable-signals list names run-without-state (exit 1) | 1 |

## Injection Results

| AC | Red observed | Failing test | Test exit code | Restored | Worktree removed |
|----|--------------|--------------|----------------|----------|------------------|
| AC1 | yes | test-ws-monitor-us507 AC1 state-less run reported (never discover) | 1 | yes | no |
| AC2 | yes | test-ws-monitor-us507 AC2 artifact-less dir is not a run | 1 | yes | no |
| AC3 | yes | test-ws-monitor-us507 AC3 finding evidence names newest artifact | 1 | yes | no |
| AC4 | yes | test-ws-monitor-us507 AC4 fresh finding is warning | 1 | yes | no |
| AC5 | yes | test-ws-monitor-us507 AC5 stale finding is info | 1 | yes | no |
| AC6 | yes | test-ws-monitor-us507 AC6 boundary: age == window is fresh | 1 | yes | no |
| AC7 | yes | test-ws-monitor-us507 AC7 empty-discovery line suppressed | 1 | yes | no |
| AC8 | yes | test-ws-monitor-us507 AC8 fresh run keeps --until-terminal open | 1 | yes | no |
| AC9 | yes | test-ws-monitor-us507 AC9 stale run is not counted active | 1 | yes | no |
| AC10 | yes | test-ws-monitor-us507 AC10 state file suppresses run-without-state | 1 | yes | no |
| AC11 | yes | test-ws-monitor-us507 AC11 --slug resolves by directory name | 1 | yes | no |
| AC12 | yes | test-ws-monitor-us507 AC12 statePath is null | 1 | yes | no |
| AC13 | yes | test-ws-monitor-us507 AC13 non-prefix name is not activity | 1 | yes | no |
| AC14 | yes | test-ws-monitor-us507 AC14 only the top-level artifact counts | 1 | yes | no |
| AC15 | yes | test-ws-monitor-us507 AC15 sibling state-less run still reported | 1 | yes | no |
| AC16 | yes | test-ws-monitor-us388 AC6 missing-child-state severity unchanged | 1 | yes | no |
| AC17 | yes | test-ws-monitor-us507 AC17 DEFECT_CONTRACTS gains run-without-state | 1 | yes | no |
| AC18 | yes | test-ws-monitor-us507 AC18 snapshot leaves the plans tree byte-identical | 1 | yes | no |
| AC19 | yes | test-ws-monitor-us507 AC19 actionable-signals list names run-without-state | 1 | yes | no |

## Defects

None.

## Round History

| Round | Defects in | Defects out | Action |
|-------|------------|-------------|--------|
| 1 | 0 | 0 | done |

## Method Note (honest deviation)

Injections were applied as single-line (AC14: two-line) mutations against the
committed files on `develop` and reverted to the exact HEAD bytes after each run;
no scratch worktree was created, so the `Worktree removed` column reads `no`. The
byte-exact restore was asserted by the driver (`restored: true`), by a clean
`git status`, and by `npm run verify-integrity` (OK, v0.5.42) after the sweep.
Each of the 19 ACs produced an independent red signal (suite exit 1). No product
bytes differ from the committed HEAD after the sweep.


