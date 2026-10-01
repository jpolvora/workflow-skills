---
step: 2
slug: us-476
workflowId: us-476-20261001T010948Z
status: completed
acRefs: []
title: Refined plan — stale-parent-row propagation grace
startedAt: "2026-10-01T01:12:00Z"
endedAt: "2026-10-01T01:13:02.200Z"
supersedesBasis: step-01-us-476.plan.md
---
# Refined plan — us-476

Delta applied to `step-01-us-476.plan.md` after the Step 2 interview. All step-01 sections remain valid; the refinements below are authoritative where they differ.

## Refinement R1 — detector signature (Plan §2.1)

`detectStaleParentRows(workflow, allWorkflows, options = {})` where `options = { graceMs?, nowMs? }`:

- `graceMs` default `TRANSCRIPT_LIMITS.stallWindowMs` (600000).
- `nowMs` default `Date.now()`.
- Existing two-argument callers (including `test/test-ws-monitor-us395.js`) keep the default grace and stay warnings for children closed days earlier.

## Refinement R2 — run-advancing signal (Plan §2.2)

`snapshot()` exposes two read-only fields on the in-memory multi-spec record:

- `updatedAt: state.updatedAt || null`
- `stateMtimeMs: fs.statSync(stateFile).mtimeMs` (guarded, `null` on error)

`lastAdvanceMs = max(runUpdatedAt, stateMtimeMs, rowUpdatedAt)`; a batch state written within the grace window marks the row propagation-pending when the child is also fresh.

## Refinement R3 — single stall-window resolution

The `stallWindowMs` IIFE moves above the cross-workflow detection loop and is passed as `graceMs`; the later duplicate declaration in the liveness block is removed. `--stall-window <sec>` (AC6) governs both.

## Refinement R4 — message contract (AC1)

Both the info and warning child-terminal messages include the suffix:

`child terminal for <age>; last row transition <age> ago`

Ages render as `Ns` / `Nm` / `Nh`; unknown values render `unknown`.

## Refinement R5 — test surface

`test/test-ws-monitor-us476.js` covers AC1–AC7 and NS1–NS3 at the unit level (deterministic `nowMs`) plus a CLI end-to-end check for the info default and the `--stall-window 1` warning override. Registered in `test/test-suites.json`.

## Unchanged from step-01

Scope, out-of-scope, stack invariants verification plan, and the superseded/terminal-run warning branches (AC4/AC5).
