---
step: 1
slug: us-419
workflowId: us-419
status: completed
startedAt: "2026-09-25T03:00:00.000Z"
endedAt: "2026-09-25T02:18:23.125Z"
acRefs: []
---
# Plan — us-419 (step-01)

Spec of record: `.agents/specs/0129-us-419.spec.md` (7 ACs; AC5/AC6 fix-if-cheap).
Line numbers below re-verified at HEAD `9237a8c7` (spec assumption row 1 closes:
cited L1138-L1162/L1179-L1195/L275-L280 now L1202-L1282/L275-L296 after PR #423;
observer.cjs L455-L467/L175-L181/L165-L168 confirmed; commit_g2_code.cjs L125 and
refresh_baseline.cjs L171 confirmed; workflow_state.cjs L1041-L1052 now L1055-L1066).
Node-only (.cjs). No dependency on parallel pre-ship-doc-sync work. No Open Questions.

## History intent vs accident (git log -S)

- `listTranscriptCandidates` slice-then-correlate order: introduced with bounded
  enumeration; us-418 changed the sort to mtime-first but kept enumerate-then-
  correlate. No commit documents correlation-unaware enumeration as a constraint.
  Accidental gap (AC1).
- `recordAgentTranscripts` writer with no pipeline call site: writer added for
  manual use; `update_state.cjs dispatch` (the universal dispatch hook in
  `workflow_state.cjs`) never defaults the marker. Accidental gap (AC2).
- `refreshPlansIndexForState` after `syncStateDualWrite`: present in coordinator
  (3 sites) and `persistObserverMutation`, absent in the two G2 scripts.
  Accidental omission (AC3).
- `compactOutputs` heading regex: `new RegExp("(" + heading + "\\n\\n)...")`
  treats the literal `(compact)` as a capture group, so the pattern never
  matches. No intentional-constraint commit. Accidental gap (AC4).
- `test/.ws/**` has no `.gitattributes` rule while `core.autocrlf=true`:
  accidental gap (AC5, cheap one-line fix per spec direction).
- Gate-history timestamps: all script write sites already use exact
  second-precision `nowIso()` (millis stripped only); no rounding call site
  exists (`integrity-regen` string absent from the tree). The rounded values in
  the logs were agent-authored, not script output. DEFERRED with this note (AC6).

## Changes

### T1 — Correlate-during-enumeration in `listTranscriptCandidates` (AC1)

File: `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs`.

- Extend `listTranscriptCandidates(directory, slice, keys = [])`: during the
  visit, test each candidate path with `correlationMatches(full, key)`; collect
  path-correlated files into a `correlated` bucket (hard bound
  `CORRELATED_ENUMERATION_EXTRA = 64` entries examined past a full normal
  slice) and all others into the normal bucket (existing `slice + 1` cap).
  Return `[...correlated, ...others]`.
- No-keys callers keep byte-identical behavior (empty correlate bucket, same
  walk, same order).
- `scanTranscriptRoots` passes its `keys` through; the existing
  `ordered.length > slice → capped` accounting stays honest (correlated
  overflow still counts toward the slice, correlated-first fill preserved).
- Export nothing new (keep module surface); existing `listTranscriptCandidates`
  importers (tests) keep working — third arg optional.

### T2 — Dispatch-time `agentTranscripts` marker default (AC2)

File: `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs` (`dispatch`
op) + `update_state.cjs dispatch --help` text is generated from workflow_state
(runUpdateCli), plus new `--transcript-paths` flag plumbed through.

- In the `dispatch` branch, when `state.agentTranscripts` is null/undefined,
  set it: `--transcript-paths a,b` non-empty → `{ status: 'available', paths,
  recordedAt: timestamp }`; else discovery disabled
  (`config.monitor.discoverHostTranscripts` falsy and no CLI override) →
  `{ status: 'transcript-unavailable', reason: 'discovery-disabled' }`;
  else → `reason: 'no-matching-session'` (no scan has run yet, so
  `scan-capped` cannot apply at dispatch time).
- Never overwrite an existing marker (manual `record` and earlier dispatches
  win). Shape validated by `observer.cjs assertValidMarker` (same vocabulary).
- Dispatch-contract doc: one-line note in `STEP-DISPATCH.md` § Execution
  observer dispatch naming `update_state.cjs dispatch --transcript-paths` as
  the dispatch-time call site.

### T3 — Index refresh after G2 writes (AC3)

Files: `.agents/skills/ws-spec-to-pr/scripts/commit_g2_code.cjs`,
`.agents/skills/ws-spec-to-pr/scripts/refresh_baseline.cjs`.

- After `syncStateDualWrite`, `mkdir -p dirname(plansIndexPath(context))` and
  call `refreshPlansIndexForState(context, state, { stateFile })` (same call
  shape as `persistObserverMutation`).
- `commit_g2_code.cjs`: `context` already resolved; extend the workflow_state
  import with `plansIndexPath, refreshPlansIndexForState`.
- `refresh_baseline.cjs`: add `resolveConsumerContext` import (from
  `resolve_consumer_root.cjs`, same HUB pattern) and resolve
  `context = resolveConsumerContext({ repoRoot, scriptFile: __filename })`.

### T4 — Escape the `compactOutputs` heading regex (AC4)

File: `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs`.

- Escape the heading before building the RegExp:
  `heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`. One-line fix; second
  `finish` then updates the section (replace function unchanged).

### T5 — LF rule for the test sandbox (AC5, cheap)

File: `.gitattributes` (append `test/.ws/** text eol=lf`). Verify `git status`
stays clean and a simulated LF rewrite of `test/.ws/config.json` stays clean.

### T6 — Tests + evals

- New `test/test-ws-us419-followups.js` (register in `test/test-suites.json`):
  - NEG1/AC1: merged-root fixture where the correlated target has the oldest
    mtime (sorts last) → `filesScanned >= 1` and correlated-first.
  - AC2: `dispatch` on a scratch state with no marker → marker present with a
    valid reason; `--transcript-paths` → available; existing marker untouched.
  - AC3: G2-commit + baseline-refresh on a scratch plans dir →
    `index.json stateSha256` matches the state file immediately after.
  - AC4: two consecutive `finish` calls → `## Step outputs (compact)` content
    changes on the second.
- AC1 eval fixture: append `evals.json` entry (merged root, target sorts last)
  under `.agents/skills/ws-monitor/evals/evals.json` following the us-412-418
  entry shape.

## AC7 — Adjudicated no-regression guard

No behavior change to the adjudicated classes (discovery starvation honesty,
stall-gate unavailability, checkpoint/pause behavior, shared correlation
window, `scan-capped` vocabulary). Guard: the full existing
monitor/observer/state test files (`test-ws-monitor*.js`,
`test-observer-us365.js`, `test-workflow-state-contract.js`,
`test-liveness-checkpoints.js`) all stay green unmodified.

## Files touched

- `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs`
- `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs`
- `.agents/skills/ws-spec-to-pr/scripts/commit_g2_code.cjs`
- `.agents/skills/ws-spec-to-pr/scripts/refresh_baseline.cjs`
- `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md` (one-line dispatch call-site note)
- `.agents/skills/ws-monitor/evals/evals.json`
- `.gitattributes`
- `test/test-ws-us419-followups.js` (new) + `test/test-suites.json`
- worker artifacts under `.agents/plans/us-419/` (plan-state only until Step 8)

## Verification

New test file green, then full `npm run tests`, `npm run verify-integrity`,
harness gate. G2 regression window asserted before any subsequent state write.
Commit only own files (us-401).
