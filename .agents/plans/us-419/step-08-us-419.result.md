---
step: 8
slug: us-419
workflowId: us-419
status: completed
startedAt: "2026-09-25T03:00:00.000Z"
endedAt: "2026-09-25T02:41:44.546Z"
acRefs: []
---
# Delivery result — us-419 (step-08)

Status: closed (implementation done). Product commits: a5993986 (verified
implementation, AC1–AC7 linked), 2ba80f95 (integrity regen), 162d71f6
(release 0.4.72). Branch `feat/us-419` re-based without history rewrite:
cherry-picked own commits onto `origin/main` so the PR diff excludes the
parent-owned `ws-spec-multi` dispatch commit.

## Delivered

Observer-log follow-ups (issue 419) in the monitor/observer/state toolchain:

1. `monitor_snapshot.cjs` correlates on the path during enumeration: a
   dedicated correlated bucket under a 64-visit bound reaches a
   path-correlated session sorting after the per-root slice; `capped` stays
   honest (AC1 + eval fixture).
2. `workflow_state.cjs` `dispatch` records `state.agentTranscripts` once
   (available paths from `--transcript-paths`, else `discovery-disabled` /
   `no-matching-session`); existing markers never overwritten; call site
   documented in STEP-DISPATCH.md and dispatch `--help` (AC2).
3. `commit_g2_code.cjs` + `refresh_baseline.cjs` refresh the plans index in
   the G2 window, so `stateSha256` matches before any later write (AC3).
4. `compactOutputs` heading escaped; second `finish` updates the section
   (AC4).
5. `test/.ws/** text eol=lf` against sandbox stat dirtiness (AC5).
6. AC6 deferred with note: no script rounding call site exists; writers use
   exact second precision (guard assertion pins that).
7. Adjudicated classes unchanged; existing suites green unmodified (AC7).

Tests: `test/test-ws-us419-followups.js` (7 blocks) + 1 `evals.json` entry.
Full suite 133/133, integrity verified, single bump to 0.4.72.

## Ship

PR against `main` follows this close; fix-pr convergence to zero threads, then merge.
