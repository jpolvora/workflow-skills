---
id: null
slug: per-task-test-adequacy-review
title: Per-task Test Adequacy review in implement
source: local
specDate: 2026-09-30
step: 0
workflowId: per-task-test-adequacy-review-20260930T081414Z
status: completed
startedAt: "2026-09-30T08:14:18.000Z"
endedAt: "2026-09-30T08:14:52.471Z"
acRefs: []
---
# Specification — Per-task Test Adequacy review in implement

## Description

`ws-implement-tasks` runs a TDD cycle per task and links covering tests for negative scenarios into `ac-ledger.json`, but nothing reviews whether the written tests actually assert the task acceptance criteria: tautological assertions, tests that pass under wrong implementations, and tests with no backing requirement can all ride through to Step 5. Step 5 then scores ledger evidence it did not author, and Step 7 sabotage only samples regression assertions.

This spec adds a per-task Test Adequacy review inside `ws-implement-tasks` build mode, executed after the TDD cycle per task and before the step handoff. For every task, the review asserts a three-way binding: each task AC maps to at least one test with file:line evidence, each mapped test passes a non-shallow litmus (its key assertion is shown to fail under a wrong implementation via a targeted inversion or a documented wrong-code run), and every test the task added maps back to a requirement (no orphan tests). Tasks failing adequacy return to the TDD cycle within the existing fix bounds; adequacy results ride the step-output evidence to Step 5.

## Acceptance Criteria

- AC1: Every task completed in build mode carries an adequacy record mapping each task AC to at least one covering test with file:line evidence.
- AC2: Each mapped test passes a non-shallow litmus showing its key assertion fails under a wrong implementation, recorded as an inversion run or a documented wrong-code run with test name and exit code.
- AC3: Every test added by the task maps back to a task AC or a spec negative scenario; orphan tests with no requirement are removed or remapped before handoff.
- AC4: Tasks failing adequacy return to the TDD cycle and re-enter review until adequate or the existing implement retry bound Pause path triggers.
- AC5: Adequacy records are returned in step-output evidence and linked into `ac-ledger.json` so Step 5 scores observed adequacy instead of asserted coverage.
- AC6: The review rejects assertions that pass on unmodified code (false-positive hazard) as inadequate without requiring a full litmus run.
- AC7: Fix mode applies the same adequacy review to anti-regression tests added per fixed finding.

## Original Issue Context

Free-text request: add per-task Test Adequacy review in `ws-implement-tasks` so every AC is asserted with file:line evidence, a non-shallow litmus rejects assertions that pass under wrong implementations, and no tests exist without a requirement.

### Prior Work Sweep

- Keyword and git sweep on `false-positive`, `tautological`, `adequacy`, `litmus`: `ws-implement-tasks` SKILL already flags tests that pass on unmodified code as a false-positive hazard and forbids tautological assertions for sabotage-covered tests; `run_sabotage.cjs` proves regression assertions fail on inverted code with byte-identical restore.
- No existing per-task adequacy record or orphan-test rule; Step 5 caps uncovered negative scenarios at 8 via `knownDefect` but does not judge assertion depth.
- No open PR covers adequacy review; nearest closed work is the TDD-cycle and sabotage deliveries.

### Design Intent

- Gap extension, not a bug restore: the TDD cycle plus false-positive flag were designed as implement-time hygiene, and no prior version enforced per-task assertion-depth review, so `git log -S` shows intentional scope rather than a removed gate.

## Notes

- Dependencies: `ws-implement-tasks/SKILL.md` (build and fix mode recipes), `ws-testing/scripts/run_sabotage.cjs` (inversion vocabulary for the litmus), `ws-spec-to-pr/scripts/ac_ledger.cjs` (adequacy link verb), `ws-plan-verify` (consumes adequacy evidence at Step 5).
- The litmus is per task, not per assertion: one wrong-implementation run per mapped test is enough; reviewers must not demand combinatorial inversion.
- Documented wrong-code runs (stash the fix, run the test, restore) are acceptable litmus evidence where the sabotage helper does not apply.
- Stack rule packs under `{skillsRoot}/ws-shared/runtime/stacks/` do not apply to this Node 22 skill-package stack.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full mutation score per task | Mutation stays a Step 7 opt-in battery with its own threshold |
| Adequacy review for untouched legacy tests | Only tests the workflow adds or modifies are reviewed |
| Cross-task deduplication of tests | Overlap between tasks is tolerated when each task binding is adequate |
| Lite-specific adequacy recipe | Lite runs the same implement skill, so one recipe covers both orchestrators |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Review placement | Inside build mode per task, before step handoff | Catches shallow tests where they are written, not at Step 5 | y |
| Litmus form | Inversion run or documented wrong-code run per mapped test | Reuses sabotage vocabulary without requiring the helper everywhere | y |
| Orphan tests | Remove or remap before handoff | Every test must trace to a requirement | y |
| Retry bound | Existing implement retry bound, then Pause | No new loop budget; reuses the established escape hatch | y |
| Evidence channel | Step-output plus `ac-ledger.json` links | Step 5 scores observed adequacy from the ledger | y |
| Auth, rate limits, external dependencies | N/A because the review runs local test commands with no network surface | No caller identity, throttle, or remote fallback applies | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Per-task binding, litmus, orphan rule, retry, evidence channel only | AC1 through AC7 each map to one behavior |
| Atomic criteria | Each AC names a record, run, or link | Review AC list against the implement recipe |
| Failure modes | Inadequate task, orphan test, false-positive hazard named | Negative scenarios list each mode with expected signal |
| Observation telemetry | Step-output evidence and ledger links named | Telemetry section lists exact fields and commands |
| Zero open blockers | Placement, litmus form, orphan rule, and retry bound decided | Assumptions table shows Confirmed y on decided rows |

## Validation & Observation Notes

### Telemetry & Observable Signals

- Step-output evidence carries per-task adequacy records with AC-to-test file:line bindings after build mode.
- `ac-ledger.json` links record adequacy per AC for Step 5 scoring.
- `npm run test` plus the adequacy regression test covering binding, litmus, orphan removal, and false-positive rejection.

### Negative & Failing Test Scenarios

- A task whose test passes on unmodified code is flagged inadequate and re-enters the TDD cycle instead of marking done.
- A test with no backing task AC or negative scenario is removed or remapped before handoff, never shipped as-is.
- A mapped test whose key assertion survives the wrong-implementation run fails adequacy with the surviving assertion named.
- Adequacy evidence missing from step-output fails the implement step handoff validation.
