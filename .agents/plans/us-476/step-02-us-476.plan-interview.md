---
step: 2
slug: us-476
workflowId: us-476-20261001T010948Z
status: completed
acRefs: []
title: Plan interview — stale-parent-row propagation grace
startedAt: "2026-10-01T01:12:00Z"
endedAt: "2026-10-01T01:13:02.194Z"
---
# Plan interview — us-476

Adversarial audit of `step-01-us-476.plan.md` against the spec's failure class.

## Questions interrogated

| # | Question | Resolution |
|---|----------|------------|
| Q1 | Is a single grace window enough, or does the detector also need a "run advanced" signal? | Both: AC2 requires child-terminal age **and** that the run advanced within the window. A child that closed 2s ago while the batch state has not been written for an hour is a genuine stale parent, not propagation latency. Plan §2 uses `max(runUpdatedAt, stateMtimeMs, rowUpdatedAt)`. |
| Q2 | Where does "run advanced" come from without adding a persisted field? | The batch state's top-level `updatedAt` and the state-file mtime are already available in `snapshot()` at detection time. Expose them on the in-memory multi-spec record only; no disk write. The unit detector keeps a per-call `nowMs` so tests are deterministic. |
| Q3 | Does the grace break detection of the #395 persistent defect? | No. AC3 (beyond grace, no transition) and the two lineage-dead branches (AC4 terminal run, AC5 superseding run) stay `warning`. Existing `us-395` fixtures close days before the tick, so they remain warnings. |
| Q4 | Does `classifyMultiSpecWorkflow`'s terminal-run `stale-parent-row` need the grace too? | No — a terminal run is lineage death by definition (AC4), independent of age. Only the child-terminal branch of `detectStaleParentRows` becomes time-aware. |
| Q5 | Can a malformed/derived timestamp make the detector crash or silently downgrade? | `Date.parse` + `Number.isFinite` guards; a missing child terminal timestamp keeps the finding on the warning path (non-fatal). |
| Q6 | Is `--stall-window` the right knob (AC6)? | Yes: it already exists, defaults to 600s, and is operator-tunable. It is now resolved once and shared by the liveness stopwatch and the propagation grace. |

## Decisions recorded

1. Extend `detectStaleParentRows` with an optional `{ graceMs, nowMs }` argument; keep the two-arg call shape working for existing callers/tests.
2. Resolve `stallWindowMs` in `snapshot()` before cross-workflow detection and pass it as `graceMs`; reuse the same value for the stopwatch loop (deduplicated declaration).
3. Add `updatedAt` + `stateMtimeMs` to the multi-spec record as the "run advancing" evidence.
4. Carry both ages in the finding message (AC1) for field tuning.

## Residual risks

- With the default 600s window, propagation latencies above ~10 minutes (the observed 19-minute window) still warn; this is the spec's acknowledged trade-off and the message carries the ages to tune `--stall-window`.
- The 1s end-to-end narrowed-window test depends only on a child that closed minutes ago, so it is deterministic.
