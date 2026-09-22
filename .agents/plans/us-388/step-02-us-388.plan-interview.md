---
slug: us-388
step: 2
workflowId: us-388-20260922T080709Z
status: completed
runInterview: true
---

# Plan Interview — us-388

## Q1 — Is this greenfield or modification?

Modification. The child pipeline already defines the state/artifact contract and
`PROTOCOL.md` already names a `child-workflow-id`. Decision: extend the existing
model, do not invent a parallel mechanism.

## Q2 — Who writes the child state?

Chosen default (spec Assumptions): the child orchestrator creates state at
dispatch; the worker honors it. Interview confirms the enforcement point is the
**child exit** (Phase 4b/5), not a new writer, so `verify_child_artifacts.cjs`
guards rather than creates.

## Q3 — How should the monitor derive expectations?

Reuse `expectedArtifacts()` shape rather than adding a standalone detector.
Multi-spec expectations are derived from the batch queue rows; this is the
design intent the spec records, so `expectedChildArtifacts` is added next to the
existing helper.

## Q4 — Overlap with `stale-parent-row` (shipped by us-395)?

Checked. `stale-parent-row` requires a child that closed (`terminalChildren`) or a
newer active run claiming the slug. `missing-child-state` requires the child state
to be **absent**. They are mutually exclusive in practice and no code path emits
both for one row. Not duplicated.

## Q5 — Does the `in_progress` row risk a false positive before flush?

Accepted as a warning-class signal. The contract says state exists at dispatch,
so an `in_progress` row without state is genuinely non-conformant. Only
`in_progress` / `shipped` / `failed` rows are considered; `pending` and `skipped`
stay silent.

## Q6 — AC5 fail-closed shape?

A deterministic read-only guard that exits non-zero naming the missing artifacts,
mirroring the `missing-artifact` class. The orchestrator runs it before recording
`shipped`; non-zero → stop, do not record `shipped`.

## Q7 — Scope leaks observed in the spec (batch `updatedAt`, deleted classify files)?

Out of scope. `updatedAt` is #393 AC6; the uncommitted classify deletions are an
unrelated writer. Neither is touched here.

## Open questions

None blocking. State-writer ownership stays with the child orchestrator, which is
the documented default and does not require a new writer.
