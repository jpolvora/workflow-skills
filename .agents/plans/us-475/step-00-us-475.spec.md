---
id: 475
slug: us-475
title: Shared-head multi-spec runs need an executable foreign-commit guard
source: github
specDate: 2026-09-30
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/475"
step: 0
workflowId: us-475
status: completed
startedAt: "2026-09-30T18:49:01.582Z"
endedAt: "2026-09-30T18:49:01.582Z"
acRefs: []
---
# Specification — Shared-head multi-spec runs need an executable foreign-commit guard

**State:** open

## Description

On stay-on-develop shared-head runs, every worker in a `ws-spec-multi` (or standard) batch ships from the same branch, so a commit landing on `develop` from outside the batch (another session, a human push) silently joins the next item's PR range. Two incidents occurred in one 7-item batch: a commit-and-amend mid-preflight swept the master's own staging, and a mid-batch push landed between a worker's commits and rode its PR to `main`.

Detection today is manual. The master re-scans (`git status`, active child states, `develop..origin/develop` delta) before each dispatch and diffs every PR at convergence, but the batch has no executable check of its own, so a foreign commit is found only by diligence or by a worker disclosing it.

The deliverable is an executable, batch-owned guard: a per-dispatch baseline of the local and remote `develop` tips, a pause on unexpected advance, a convergence-time PR-head check, and automatic listing of foreign commits that ride a range. The quiet sequential path (no foreign commit) must be unaffected.

### Design Intent

Shared-head batching intentionally reuses one branch to avoid per-item branch churn, so isolation by construction is not available. The design assumption was that the master's manual scan would cover foreign commits; the incidents show manual diligence is not an executable guarantee. The guard must therefore be part of the batch state machine, not a documented convention.

## Acceptance Criteria

- AC1: When a worker dispatch is about to run, the batch shall record the local `develop` tip and the `origin/develop` tip as a dispatch baseline.
- AC2: When the recorded `develop` tip advances unexpectedly between dispatches, the batch shall pause and name the new commits.
- AC3: When the batch pauses on an unexpected advance, the batch shall offer Resume, Skip, and Abort.
- AC4: When delivery converges, the batch shall compare the PR head to the local `develop` tip before merge.
- AC5: If the PR head differs from the local `develop` tip at convergence, then the batch shall refuse to merge.
- AC6: The batch shall list foreign commits that ride a PR range in the PR body and in the audit notes.
- AC7: When no foreign commit exists, the batch shall not add gates to the sequential single-writer path.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Blocking, reverting, or rewriting foreign pushes | The guard pauses or refuses; it never mutates other writers' commits |
| Per-spec feature-branch runs | Isolated by construction; no shared head |
| Multi-CLI distributed runs beyond the same-branch case | Distinct baton contract; out of this guard's scope |
| Changing the `develop` base or branch policy | Base branch is a config concern |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Baseline store | Batch state file under the run's plan folder | State is the batch's existing record of truth | y |
| Advance trigger | Local or `origin/develop` tip differs from the last baseline | Matches the observed manual scan | y |
| Convergence check | PR head equals local `develop` tip | The merge target must match the reviewed head | y |
| Input validation, auth, concurrency, data lifecycle, idempotency | N/A because the guard reads git refs and writes only batch state | No user payload, network API, or credential handling | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Batch dispatch + convergence guard only | Spec Out of Scope + diff review |
| Atomic criteria | AC1–AC7 each have a pass/fail observation | Authoring validator + implementation check |
| Failure modes | Unexpected advance pauses; mismatch refuses; quiet path unchanged | AC2, AC5, AC7 |
| Stack invariant | Node-only helper, launched with `node`; git reads only, no forced push or history rewrite | `ws-check-harness` + git-ownership contract |
| Observation telemetry | Named baseline records and pause reasons | Validation notes below |
| Open blockers | None | Prior-work sweep found no open PR for issue 475 |

## Validation & Observation Notes

### Telemetry & Observable Signals

- Each dispatch writes a baseline record with the local and remote `develop` tips.
- An unexpected advance produces a pause naming the new commit shas.
- A convergence mismatch produces a refusal naming both heads.
- `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring` on this spec exits 0 before register.

### Negative & Failing Test Scenarios

- Simulate a commit landing on `develop` between two dispatches: the batch must pause and name the commit rather than proceeding silently.
- Simulate a PR head that differs from the local `develop` tip at convergence: the guard must refuse the merge.
- Run a foreign-commit-free sequential batch: no pause, refusal, or extra gate may appear on the quiet path.

## Original Issue Context

## Description

On stay-on-develop shared-head runs, every worker ships from the same branch, so any commit landing on `develop` from outside the batch (another session, a human push) silently joins the next item's PR range. Observed twice in one 7-item batch: a commit+amend mid-preflight swept the master's own staging, and a mid-batch push landed between a worker's commits and rode its PR to `main`.

Detection today is manual: the master re-scans (`git status`, active child states, `develop..origin/develop` delta) before each dispatch and diffs every PR at convergence. The batch has no executable check of its own, so a foreign commit is found only by diligence or by a worker disclosing it.

### Acceptance Criteria (as filed, verbatim)

> - AC1: Before each worker dispatch, the batch records the `develop` tip (and `origin/develop`) and compares it against the previous dispatch record; an unexpected advance pauses with Resume/Skip/Abort, naming the new commits.
> - AC2: At delivery convergence, the master verifies the PR head equals the local `develop` tip before merge and refuses on mismatch.
> - AC3: Foreign commits that do ride a range are listed in the PR body and audit notes automatically rather than by manual disclosure.
> - AC4: Sequential single-writer behavior is unchanged when no foreign commit exists (no added gates on the quiet path).

### Out of Scope (as filed, verbatim)

- Blocking, reverting, or otherwise rewriting foreign pushes.
- Per-spec feature-branch runs (isolated by construction).
- Multi-CLI distributed runs beyond the same-branch case.

### Prior Work Sweep

No open pull request references issue 475. Keyword search (`foreign-commit`, `shared-head`) and `#475` returned only merged PRs (#333, #228) unrelated to a batch-owned guard. Design-intent note: shared-head reuse is intentional; the missing piece is an executable check, not branch isolation.

## Notes

Lookup: batch dispatch and convergence live in `ws-spec-to-pr` / `ws-spec-multi` state handling; shared-head and git-ownership rules are under `{sharedDir}/runtime/git-ownership.md`. Stack file is the Node 22 skill package. MEMORY had no trap that changes this guard.
