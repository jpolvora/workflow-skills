---
slug: us-395
step: 6
workflowId: us-395-20260922T080709Z
status: completed
startedAt: "2026-09-22T14:15:00Z"
endedAt: "2026-09-22T14:35:00Z"
acRefs: []
---
# Code Review — us-395

Scope: `git diff origin/main...HEAD` (product commit `59fe3e3c`). Two-phase adversarial review (correctness, then regression/scope).

## Phase 1 — Correctness

| # | Finding | Severity | Location |
|---|---------|----------|----------|
| R1 | `deriveTerminalStatus` computes `failed ? 'failed' : 'completed'`, but `terminalShape` only admits `completed`/`skipped` step statuses, so the `failed` branch is unreachable dead code | Suggestion | `monitor_snapshot.cjs` `deriveTerminalStatus` |
| R2 | `detectStaleParentRows` `newerRun` predicate repeats `other !== workflow` although `activeMulti` already excludes the current run | Suggestion | `monitor_snapshot.cjs` `detectStaleParentRows` |

No Critical or Warning findings. The writer close is guarded by a terminal-status set (no regression), the monitor stays read-only, and the `stale-parent-row` lineage check compares `createdAt` so only the older superseded run is flagged.

## Phase 2 — Regression & scope

| Check | Result |
|-------|--------|
| Writer close does not fire for internal substeps (`stepStatus[step]='active'`) | PASS (guard requires all `0..closeStep` terminal) |
| Existing close on step 8 `completed` unchanged | PASS (`test-workflow-state-contract.js` exit 0) |
| Monitor false-positive on healthy active runs | PASS (`test-ws-monitor.js`, `-us385`, `-us356`, new clean fixture) |
| Diff scope = spec touchpoints (writer, ws-monitor, ws-spec-multi, tests) | PASS; no unrelated refactor |
| No `.py`, no config-schema/GUI change | PASS |

## Fix round 1

Applied R1 + R2 (both Suggestion-level, resolved to keep the diff clean):
- removed the unreachable `failed` branch in `deriveTerminalStatus`;
- removed the redundant `other !== workflow` clause.

Re-ran `node test/test-ws-monitor-us395.js` and `node test/test-terminal-close-us395.js` (exit 0) after the fix; re-linked ledger file evidence; re-verified step5 score 10.

## Verdict

Clean after fix round 1 (0 Critical, 0 Warning, 0 open Suggestion). Advance to Step 7.
