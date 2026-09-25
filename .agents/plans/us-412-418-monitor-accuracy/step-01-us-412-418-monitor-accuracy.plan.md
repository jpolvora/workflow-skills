# Plan — us-412-418-monitor-accuracy (step-01)

Spec of record: `.agents/specs/0128-us-412-418-monitor-accuracy.spec.md`.
Target file: `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs` (+ tests, evals, one SKILL.md table row).
Monitor stays strictly read-only. Node-only (.cjs). No dependency on unmerged PR #422.

## History intent vs accident (git log -S)

- `expectedArtifacts` watermark gates (`Number(state.currentStep) >= N || isCompleted`):
  introduced with the monitor, never revisited for partial-pipeline shapes. Accidental gap.
- Per-root file reservation + correlated-path root ordering + shared 256 KB scan/resolve
  window: added deliberately by `ad134fce` (us-412-413 liveness). Intent, but it covers
  only the file-count budget, not the per-tick time budget, and the scan filter (wf AND
  slug) still diverges from resolve (wf OR slug OR session).
- `worker-session-stall`: deliberate liveness signal; masked downstream of the above gaps.

## Changes

### T1 — Membership-first `expectedArtifacts` (AC1, AC2, AC4, AC5)

Add helpers (next to `isCompleted`):

- `stepShowsCompleted(state, step)`: `completedSteps` membership OR `stepStatus[String(step)] === 'completed'`.
- `stepListsPresent(state)`: `completedSteps` is an array OR `stepStatus` is a non-array object.
- `expectsStep(state, step, watermark)`: membership when lists present, else watermark fallback.

Replace every `Number(state.currentStep) >= N || isCompleted(state, N)` gate in both the
`lite` and standard branches with `expectsStep`. Keep `interviewRan`, `dag-disabled`,
and testing-skip suppressions (they compose with membership and still guard the
watermark-fallback path).

Consequences: AC2 fix-PR-only shape (`completedSteps: [8,9]`) expects only the step-08
result; Shape C sparse steps expect nothing for steps never run; AC4 sequential legacy
runs no longer need the `dag-disabled` reason; AC5 live runs with `completedSteps`
including an artifact-less step (or with no step lists at all) still flag.

Amendment (post-interview, pre-verify): tolerance applies iff `status === 'completed'`
(info severity, not warning) — AC3 names `completed` explicitly, and us-385 AC4
requires a terminal-shaped-but-`active` lite run to stay critical. `failed` without
terminal shape stays critical. Recorded here; implementation matches.

### T2 — Terminal tolerance in `classifyWorkflow` (AC2, AC3)

A run is terminal-tolerant iff `status === 'completed'` (AC3 names `completed`
explicitly). Missing artifacts on such runs emit severity `info` (same
`missing-artifact` / `missing-exec-artifact` codes) with a `terminal-run tolerance`
note instead of `critical`, so no issue proposal is raised for historical drift. Any
other status — including terminal-shaped runs still reporting `active` (us-385 AC4)
and `failed` — keeps `critical` (no masking). When the missing file is the Step 2
interview registry and the companion `step-02-*.plan.refined.md` is present, the
message records it as interview evidence (AC3, incl. grandfathering: no `skippedSteps`
reason required).

Existing-test compatibility: every current `critical missing-artifact` assertion uses
`status: 'active'` or status-less fixtures — all stay critical.

### T3 — Time-budget correlate-first read order (AC6)

In `scanTranscriptRoots`, after per-root reservation builds `files`, stable-sort globally:
path-correlated first, then `mtimeMs` descending (best-effort stat, path tiebreak), so
the correlated recent session is tail-read before the 2000 ms cap is burned by ancient
history. Deterministic. Existing M1/M9 semantics preserved.

### T4 — Shared correlation predicate + persisted match flag (AC7)

Extract `transcriptCorrelates(file, tailText, { workflowId, slug, sessionId })` with the
current scan semantics (session-id alternative OR wf/slug AND-semantics) and use it in
both the scan filter and `resolveTranscriptSource`. Scan records carry
`correlated: true`; resolve trusts the flag on scan-produced records and falls back to
the shared predicate for foreign records. A file the scan counted can no longer resolve
`scan-capped` / `no-matching-session`. Export the predicate for unit tests.

### T5 — Evals + tests (AC8, AC9, AC10)

New `test/test-ws-monitor-us412-418.js` (registered in `test/test-suites.json`):
NEG1 shapes A/B/C red-before/green-after (asserted against pre-fix behavior via
`git stash`-free fixture replay: expectations on final code are zero-critical for A/B/C
plus a live-run control that stays critical = AC5/NEG3 guard); NEG2 flood + time
pressure (`maxMsPerTick` small + many stale files, discovery on + explicit root)
asserts `filesScanned >= 1`, `available`, and `worker-session-stall` with an idle
session mtime and small `--stall-window`; mismatch-shape unit + CLI assert (key outside
trailing 8 KB resolves available). Read-only assertion: snapshot writes no state files.
Append evals.json entries for the A/B/C and discovery shapes (agent-level evals).

One SKILL.md table-row update documenting terminal tolerance (en-us).

## Files touched

- `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs`
- `.agents/skills/ws-monitor/SKILL.md` (one table row + tolerance note)
- `.agents/skills/ws-monitor/evals/evals.json` (new eval entries)
- `test/test-ws-monitor-us412-418.js` (new)
- `test/test-suites.json` (register new test)
- worker artifacts under `.agents/plans/us-412-418-monitor-accuracy/` (plan-state only until Step 8)

## Verification

`node test/test-ws-monitor-us412-418.js`, then `npm run tests` (full), `npm run verify-integrity`,
`ws-check-harness` equivalent (`node .agents/skills/ws-check-harness/scripts/*.cjs` or npx gate
per repo docs). Commit only own files (us-401).
