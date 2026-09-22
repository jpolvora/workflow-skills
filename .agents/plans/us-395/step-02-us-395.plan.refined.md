---
slug: us-395
step: 2
workflowId: us-395-20260922T080709Z
status: completed
supersedes: step-01-us-395.plan.md
startedAt: "2026-09-22T13:18:00Z"
endedAt: "2026-09-22T13:20:00Z"
acRefs: []
---
# Refined Implementation Plan — us-395

## 1. Goal

Enforce the observer contract that finished work is terminal and the batch queue is lineage-clean. Writer close becomes terminal-coverage based and telemetry-independent; `ws-spec-multi` docs gain supersede retirement and handoff propagation (extending #393); `ws-monitor` gains `terminal-run-active` and `stale-parent-row`.

## 2. Change set (files)

| File | Change | ACs |
|------|--------|-----|
| `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs` | `TERMINAL_RUN_STATUSES`; `isTerminalShape(state, closeStep)`; terminal-coverage close in `applyCloseAndShipStatus` (idempotent) | AC1, AC8 |
| `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs` | `terminalShape`; `terminal-run-active` finding + derived status; `stale-parent-row` in `classifyMultiSpecWorkflow`; `detectStaleParentRows` post-pass; exports | AC2, AC6, AC7 |
| `.agents/skills/ws-monitor/SKILL.md` | queue signals + signal map rows for the two codes | AC6, AC7 |
| `.agents/skills/ws-monitor/evals/evals.json` | two eval cases | AC6, AC7 |
| `.agents/skills/ws-spec-multi/STATE.md` | supersede retirement + handoff propagation + idempotency in Queue invariants/Resume Policy | AC3, AC5, AC8 |
| `.agents/skills/ws-spec-multi/SKILL.md` | invariant 7 extension (retirement, handoff) | AC3, AC5 |
| `.agents/skills/ws-spec-multi/PROTOCOL.md` | Phase 1 supersede retirement; Phase 4b/5 parent-row transition + `updatedAt` advance | AC3, AC4, AC5 |
| `.agents/skills/ws-spec-multi/evals/evals.json` | supersede-retirement eval case | AC3 |
| `test/test-ws-monitor-us395.js` | finding fixtures + live-specimen shapes + no-active-terminal assertion | AC2, AC3, AC5, AC6, AC7 |
| `test/test-terminal-close-us395.js` | writer close (telemetry absent), skipped close step, idempotency | AC1, AC8 |
| `test/test-suites.json` | register both tests in `harnessEfficiency` | AC9 |

## 3. AC → verification map

| AC | Where satisfied | How verified |
|----|-----------------|--------------|
| AC1 | `workflow_state.cjs` terminal-coverage close | `test-terminal-close-us395.js` |
| AC2 | monitor derived terminal status | `test-ws-monitor-us395.js` (no active terminal-shaped run) |
| AC3 | `ws-spec-multi` docs (retirement) + monitor lineage | eval + `test-ws-monitor-us395.js` shared-slug case |
| AC4 | `STATE.md` in-place/frozen count (from #393) | eval case |
| AC5 | `STATE.md`/`PROTOCOL.md` handoff + monitor child-terminal | `test-ws-monitor-us395.js` child-terminal case |
| AC6 | `stale-parent-row` | `test-ws-monitor-us395.js` + evals |
| AC7 | `terminal-run-active` | `test-ws-monitor-us395.js` + evals |
| AC8 | writer idempotency guard | `test-terminal-close-us395.js` |
| AC9 | suite + harness | `npm run test`, `test-harness-clean.js`, snapshot JSON |

## 4. Concrete algorithm

**Writer** (`applyCloseAndShipStatus`): after the existing close block, when `stepFinishStatus !== 'failed'` and `isTerminalShape(state, CLOSE_STEP[pipeline])` and `state.status` not in `{completed,cancelled,failed,superseded,stopped}`, set `status='completed'`, `endedAt ||= finishedAt`, `shipStatus ||= 'pending'`.

**Monitor** (`terminalShape`): collect terminal steps from `completedSteps`, `skippedSteps[].step`, and terminal `stepStatus` values; require all of `0..closeStep` (`standard`→8, `lite`→4, else 9). Emit `terminal-run-active` (warning) when active-ish + `endedAt == null`; set derived `status` to `completed`/`failed` per the terminal values and record `reportedStatus` + `statusSource: 'derived-terminal-shape'`.

**Monitor** (`classifyMultiSpecWorkflow`): terminal run status (`completed`/`cancelled`/`superseded`) with any `pending`/`in_progress` row → `stale-parent-row`.

**Monitor** (`detectStaleParentRows(workflow, allWorkflows)`): for each `in_progress` row, if another workflow with the same slug is terminal (`completed`/`endedAt`) → `stale-parent-row`; if a newer active multi run claims the same `in_progress` slug → `stale-parent-row` (supersede-never-retires).

## 5. Stack & Security Invariants Verification Plan

- No `.py`; `node --check` both touched `.cjs`.
- Monitor stays read-only/bounded (findings only; no writes, no new scans).
- Writer idempotency guarded; no schema/config/GUI change.
- Hashed skill content changed → `npm run generate-integrity` + `npm run verify-integrity`; version bump once via `npm run build-site:bump`.

## 6. Risks

| Risk | Mitigation |
|------|-----------|
| New close fires on unrelated tests finishing steps out of order | Guard requires steps `0..closeStep` terminal and a non-terminal current status; assert in `test-workflow-state-contract.js` stays green |
| `terminal-run-active` false-positives on healthy active runs | Requires all steps terminal + `endedAt` null; wf-monitor/wf-markdown fixtures are not terminal-shaped |
| Duplicate wording across skill files trips harness | Canonical statement in each file is unique; run `test-harness-clean.js` |
