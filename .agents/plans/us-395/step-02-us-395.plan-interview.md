---
slug: us-395
step: 2
workflowId: us-395-20260922T080709Z
status: completed
startedAt: "2026-09-22T13:14:00Z"
endedAt: "2026-09-22T13:18:00Z"
acRefs: []
---
# Plan Interview — us-395

## Registry

| # | Question | Resolution | Impact |
|---|----------|------------|--------|
| 1 | Is the close path a script or agent-owned? | Script: `ws-shared/runtime/scripts/workflow_state.cjs` `applyCloseAndShipStatus`. AC1 is a real writer change. | Adds writer code + test |
| 2 | Why can a fully-terminal run stay `active`? | The current close only fires when the CLOSE step itself finishes `completed`; a close step finished `skipped` (or a pre-close-shape legacy run) never closes. No telemetry gate exists, but the contract must be explicit. | AC1 closes on terminal coverage, telemetry-independent |
| 3 | What counts as terminal-shaped? | Every step `0..CLOSE_STEP[pipeline]` has terminal `stepStatus` (`completed`/`skipped`) or is in `completedSteps`/`skippedSteps`. `failed` is not a completion. | AC1/AC2/AC7 |
| 4 | Should the monitor still report the raw `active` status? | No — AC2 requires it never be reported active. Emit `terminal-run-active` and derive the reported status to terminal; keep `reportedStatus`. | activeCount drops for Case 1 |
| 5 | How does the monitor see the completed-child/stale-parent shape? | `classifyMultiSpecWorkflow` flags a terminal run with non-terminal rows; a snapshot post-pass flags an `in_progress` row whose child workflow (same slug) is terminal. | AC6 |
| 6 | Is the supersede-never-retires Case 2 covered? | The superseding run writes the retired run's terminal `status` (AC3, docs). The monitor surfaces a stale `in_progress` row shared with a newer active run under `stale-parent-row`. | AC3 + Case 2 visibility |
| 7 | Does #393's row keying need rework? | No. Extend it: retirement + handoff propagation + idempotency wording only. | Avoids duplication |
| 8 | New finding codes? | Exactly two: `terminal-run-active`, `stale-parent-row` (matches spec assumptions table). | AC6/AC7 |
| 9 | Any config-schema change? | No. `Edit-WorkflowSkillsConfig.ps1` stays in sync untouched. | No GUI sync |

## Refinements applied

- Made the writer close a terminal-coverage guard (steps `0..closeStep`) rather than a single-step trigger, so a `skipped` close step still closes.
- Split monitor detection into a self-contained `classifyMultiSpecWorkflow` rule (terminal run + phantom rows) and a snapshot post-pass (child terminal / shared-lineage slug), keeping the two codes.
- Added an explicit negative assertion: no terminal-shaped run appears in `activeCount`.
- Added idempotency assertions for the writer (no row/endedAt regression).

No open blockers.
