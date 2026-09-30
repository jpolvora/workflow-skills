---
id: 476
slug: us-476
title: "ws-monitor: stale-parent-row warns during the normal child-close to parent-propagate window"
source: github
specDate: 2026-09-30
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/476"
labels:
  - bug
step: 0
workflowId: us-476
status: completed
startedAt: "2026-09-30T18:49:01.389Z"
endedAt: "2026-09-30T18:49:01.389Z"
acRefs: []
---
# Specification — ws-monitor: stale-parent-row warns during the normal child-close to parent-propagate window

**State:** open
**Labels:** bug

## Description

The `stale-parent-row` detector in `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs` fires a warning for a `ws-spec-multi` queue row whose child run is terminal, even while the batch orchestrator is alive and propagates the row within minutes. The signal means "parent row never propagated child close" — the persistent lineage defect tracked by #395 — but it is also raised during the normal child-close to parent-propagate window, so it cannot distinguish a hang from routine latency.

During a healthy 7-item batch the detector warned on successive ticks for rows that later transitioned to `shipped` ~8 to ~19 minutes after the child closed, while the batch state and child plan directory showed live advancement and the run ultimately closed cleanly. The fix is a time-bounded grace keyed on child terminal age, with the finding message carrying the measured ages so an operator can tune the threshold from real runs. Persistent cases (#395) must keep firing.

### Design Intent

The detector was written to catch rows that never propagate child close and rows superseded by a newer run. It compares row status to child terminal status without a time dimension, so any propagation latency looks identical to a permanent hang. The intended contract is "terminal beyond a grace window", not "terminal at this instant".

## Acceptance Criteria

- AC1: The `stale-parent-row` finding shall include the measured child-terminal age and the last row-transition age.
- AC2: While the child has been terminal for less than the grace window and the run advanced within that window, the monitor shall report the row as `info` (propagation pending) or suppress the finding.
- AC3: If the child has been terminal beyond the grace window with no row transition, then the monitor shall keep reporting `stale-parent-row` at warning severity.
- AC4: If the run itself is terminal, then the monitor shall report `stale-parent-row` at warning severity.
- AC5: If a newer active run claims the same slug, then the monitor shall report `stale-parent-row` at warning severity.
- AC6: The grace window shall default to the configured stall window and remain overridable.
- AC7: When each row's child is not terminal, the monitor shall add no grace-based finding for that row.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Persistent stale-row lineage repair (#395) | Distinct fix site in the state writer |
| Duplicate queue rows (#393) | Separate detector concern |
| Changing the `ws-spec-multi` row schema | Grace derives from existing timestamps |
| Rewriting historic state | Observer is read-only |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Grace window | `--stall-window` (default 600s) | One knob already exists and is operator-tunable | y |
| Child terminal age source | Child state `endedAt`, falling back to `updatedAt`/mtime | Matches existing derived-terminal handling | y |
| Severity model | `info` inside grace, warning beyond | Keeps a visible propagation-pending signal | y |
| Input validation, auth, concurrency, data lifecycle, idempotency | N/A because the observer is read-only with no network or stored state | Those dimensions do not apply | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | `stale-parent-row` severity/gating and message only | Spec Out of Scope + diff review |
| Atomic criteria | AC1–AC7 each have a pass/fail observation | Authoring validator + implementation check |
| Failure modes | Missing/derived terminal timestamps stay non-fatal | AC1, AC6 |
| Stack invariant | Read-only Node helper, launched with `node`, no state writes | `ws-check-harness` + read-only contract |
| Observation telemetry | Named `findings[code=stale-parent-row]` severity + message fields | Validation notes below |
| Open blockers | None | Prior-work sweep found no open PR for issue 476 |

## Validation & Observation Notes

### Telemetry & Observable Signals

- A row whose child closed within the grace window reports `info` (or no finding), not a warning.
- A row whose child closed before the grace window with no transition reports a warning carrying both ages.
- `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring` on this spec exits 0 before register.

### Negative & Failing Test Scenarios

- A batch row that transitions to `shipped` ~10 minutes after its child closed must not produce a warning-severity `stale-parent-row` on the intervening ticks.
- A row whose child closed days ago with no transition must still produce a warning-severity `stale-parent-row`.
- A run whose status is terminal with non-terminal rows must still produce a warning-severity `stale-parent-row`.

## Original Issue Context

## Failure class

Detector timing: `stale-parent-row` (warning) fires for a batch queue row whose child run is terminal **even while the batch orchestrator is alive and propagates the row within minutes**. Observed repeatedly during one healthy `ws-spec-multi` run that ultimately closed cleanly (7/7 shipped, monitor `--until-terminal` exit 0). The warning means "parent row never propagated child close" — a persistent lineage defect (#395) — but it is also raised during the normal child-close → parent-propagate window, so it cannot distinguish a hang from routine latency.

## Observed evidence (one live watch, read-only, 60s poll, one batch run, 7 items, strictly sequential)

- **Window 1:** item 5 child run terminal (steps 0-9 completed, ship done, delivery commits on the base branch) at T; parent row still `in_progress`; monitor raised `stale-parent-row`; row transitioned to `shipped` with a PR reference **~8 minutes** later.
- **Window 2:** item 6 child run terminal at T (PR opened, fix-pr round in flight); monitor raised `stale-parent-row` on successive ticks for **~19 minutes**; row transitioned to `shipped` when the next item became `in_progress`.
- During both windows the batch state file row timestamps and the child plan directory showed live advancement (state rewritten seconds before ticks, delivery/fix commits, next queue item starting), and no `stalled-workflow`, `worker-session-paused`, or turn-pause marker existed. `stale-state` did not fire.
- After the final item the parent row propagated, run status closed, and `activeCount` dropped to 0 — i.e. every warning self-healed without intervention. The finding still dominated the issue-proposal code list at several ticks because it was the only warning-level signal present.

## Expected contract

- `stale-parent-row` (warning) = non-terminal row whose child has been terminal **beyond a grace window**, or whose lineage is dead (run terminal, superseding run claims the same slug) — the #395 cases.
- While the run is actively advancing (a row transitioned or state/telemetry was written within the grace window; child terminal for less than the grace window), the signal should be `info` (propagation pending) or suppressed, so an active healthy batch is not reported as a defect.
- Suggested grace: one stall window (`--stall-window`, default 600s) keyed on child terminal time (child state `endedAt` / mtime) — comfortably above the observed 8-19 minute propagation latency only if defaults are tuned; otherwise a dedicated propagation threshold.
- The persistent cases must keep firing: child closed long ago with no row transition, run itself terminal, or superseded lineage.

## Reproduction shape

- Install scope: project-local skills. Run a `ws-spec-multi` batch with ≥3 items and poll during item transitions:
  - `node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --watch --interval 60 --until-terminal --json`
- Inspect `findings[code=stale-parent-row]` against parent row `updatedAt` and the child state mtime on the same tick: a warning with child-terminal age well under the stall threshold and a next-row transition within minutes is the false positive.

## Suggested direction (observer did not patch anything)

- Add child-terminal-age grace to the detector; grade severity by age (info inside grace, warning beyond).
- Include the measured child-terminal age and last row-transition age in the finding message so a fixer can tune the threshold from real runs.

## Scope

- [x] No product fix was applied by the observer
- [x] No workflow state or managed skill copy was modified
- [x] All private data removed (paths tokenized, no PR numbers/session ids)

Related: #395 (persistent stale rows / superseded lineage — distinct fix site: state writer), #393 (duplicate queue rows).

### Prior Work Sweep

No open pull request references issue 476. Keyword search (`stale-parent-row`) returned only merged PRs (#399 terminal-close propagation, #400 child-state persistence) that introduced the detector. None add a grace window. Design-intent note: the detector compares status without a time dimension, so it cannot distinguish latency from a permanent hang.

## Notes

Lookup: `detectStaleParentRows` and `classifyMultiSpecWorkflow` are in `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs`. Stack file is the Node 22 skill package. MEMORY had no trap that changes this fix.
