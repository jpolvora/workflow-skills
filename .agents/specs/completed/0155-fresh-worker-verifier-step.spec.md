---
id: null
slug: fresh-worker-verifier-step
title: "Fresh-worker verifier step"
source: local
specDate: 2026-09-30
---

# Specification — Fresh-worker verifier step

## Description

Step 5 (`ws-plan-verify`) scores spec compliance from the `ac-ledger.json` evidence the same session linked, and Step 7 (`ws-testing`) executes the test battery the implementer wrote. No pipeline stage re-derives the outcome from the spec with fresh eyes: a worker that never saw the implementation must reproduce each acceptance criterion result from `step-00-{slug}.spec.md` plus the product tree, run fault injection on a scratch worktree to prove the tests can fail, and report evidence-or-zero per criterion. A bounded fix loop returns defects to implement without unbounded rework.

This spec adds a fresh-worker verifier stage between review and testing. The verifier dispatches with no access to prior step outputs beyond the compact handoff: it re-derives every AC verdict from the spec, injects one fault per AC on a scratch worktree (sabotage-style inversion), and records file:line evidence for each reproduced pass plus each injected-fault red. Any AC with no evidence scores zero and routes to a bounded fix loop (max 3 rounds, then Pause). Closest neighbors are `ws-plan-verify` (ledger-derived score) and `ws-testing` (sabotage and mutation).

## Acceptance Criteria

- AC1: The verifier dispatches as a fresh worker receiving only the spec, the plan of record, the compact handoff, and the product tree, with no prior full step outputs injected.
- AC2: The verifier re-derives an independent pass or fail verdict for every spec AC and records file:line evidence for each pass.
- AC3: The verifier injects one fault per AC on a scratch worktree and records the expected red signal (failing test name plus exit code) for each injection.
- AC4: Any AC without pass evidence or without a fault-injection red scores zero and is listed as a defect with the missing evidence named.
- AC5: Defects route to a bounded fix loop of at most 3 implement-plus-reverify rounds, after which the orchestrator Pauses with residual defects listed.
- AC6: The verifier writes `{us-dir}/step-05b-{slug}.fresh-verify.md` carrying the per-AC verdict table, evidence links, injection results, and round history.
- AC7: The stage runs after Step 6 review and before Step 7 testing in standard runs, with explicit skip rules when the run has no product tree changes.
- AC8: Scratch worktrees are removed after the stage and the primary branch content is byte-identical before and after fault injection.

## Original Issue Context

Free-text request: add a fresh-worker verifier step with outcome re-derivation from the spec plus fault injection on a scratch worktree, evidence-or-zero scoring, and a bounded fix loop; closest to `ws-plan-verify` and `ws-testing`.

### Prior Work Sweep

- Keyword and git sweep on `run_sabotage`, `scoreAndRefine`, `fresh`, `verify`: sabotage helper lives in `ws-testing/scripts/run_sabotage.cjs` (caller-authored invert patch, byte-identical restore); Step 5 score derives from `ac_ledger.cjs score --boundary step5`; scoreAndRefine already implements a max-3-rounds polish loop with Pause on residual.
- No existing fresh-worker re-derivation stage; `ws-plan-verify` evaluates from ledger evidence linked by the same session.
- No open PR covers this stage; nearest closed work is the sabotage and ledger-evidence linking deliveries.

### Design Intent

- Greenfield new stage: no existing file implements fresh-worker re-derivation, so no `git log -S` behavior gap applies; sabotage-on-scratch plus evidence-or-zero extends the existing sabotage and ledger contracts rather than restoring removed behavior.

## Notes

- Dependencies: `ws-plan-verify` (report shape, ledger link verbs), `ws-testing/scripts/run_sabotage.cjs` (invert plus restore contract), `ws-spec-to-pr/STEP-DISPATCH.md` (stage placement), `ws-spec-to-pr/ARTIFACTS.md` (new artifact row), `ws-shared/runtime/gates.md` (fix-loop gate), `ws-shared/runtime/git-ownership.md` (scratch worktree rules).
- Fault injection reuses the sabotage invert-patch vocabulary: every declared path must change bytes and restoration must match the pre-invert snapshot bytes.
- Freshness is enforced by dispatch construction (spec plus compact handoff only), not by worker self-discipline; the dispatch builder omits prior full outputs.
- Stack rule packs under `{skillsRoot}/ws-shared/runtime/stacks/` do not apply to this Node 22 skill-package stack.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Replacing the Step 5 ledger-derived score | Fresh verification is an additional stage; the Step 5 gate math stays authoritative |
| Full mutation testing inside this stage | Mutation stays in Step 7 under its own opt-in threshold |
| Lite orchestrator support | Lite has no verify stage; inline parity is a later decision |
| Fault-injection engines beyond invert patches | Caller-authored inversion only; no vendored mutator |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Stage placement | After Step 6 review, before Step 7 testing | Verifies reviewed code before the testing battery runs | y |
| Artifact name | `step-05b-{slug}.fresh-verify.md` | Sorts with verify outputs without renumbering steps 6 through 9 | y |
| Fix-loop bound | Max 3 rounds, then Pause | Matches the existing scoreAndRefine bound | y |
| Injection scope | One fault per AC on a scratch worktree | Proves each AC test can fail without combinatorial explosion | y |
| Empty product tree | Skip with `no-product-changes` marker | No code means nothing to re-derive or inject | y |
| Auth, rate limits, external dependencies | N/A because the stage runs local commands on the existing worktree with no network surface | No caller identity, throttle, or remote fallback applies | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Fresh dispatch, re-derivation, injection, evidence-or-zero, bounded loop only | AC1 through AC8 each map to one behavior |
| Atomic criteria | Each AC names a file, verdict table, or round bound | Review AC list against the report template |
| Failure modes | Missing evidence, unrestored injection, loop exhaustion named | Negative scenarios list each mode with expected signal |
| Observation telemetry | Report path, dispatch event, worktree cleanup named | Telemetry section lists exact paths and commands |
| Zero open blockers | Placement, naming, bound, and skip rule decided | Assumptions table shows Confirmed y on decided rows |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `{us-dir}/step-05b-{slug}.fresh-verify.md` exists with a per-AC verdict table after the stage.
- `telemetry.jsonl` carries the verifier dispatch and finish events plus per-round fix events.
- `git worktree list` shows no leftover scratch worktree and `git status` shows no injection residue after the stage.
- `npm run test` plus the fresh-verifier regression test covering re-derivation, injection red, zero-evidence defect, and loop exhaustion.

### Negative & Failing Test Scenarios

- An AC whose tests pass under the injected fault is recorded as a defect with the non-failing injection named, not as a pass.
- An AC with no pass evidence scores zero even when the ledger-derived Step 5 score already passed.
- Fault injection that fails to restore byte-identical content aborts the stage before any fix dispatch.
- Three fix rounds with residual defects Pause the workflow with the residual list instead of advancing.
