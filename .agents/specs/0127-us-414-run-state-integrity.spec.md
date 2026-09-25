---
id: 414
slug: us-414-run-state-integrity
title: "Run-state and telemetry integrity: fail-closed preset resolution, ship writeback, Step 9 round artifacts, truthful skip semantics"
source: github
specDate: 2026-09-24
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/414"
---

# Specification — Run-state and telemetry integrity

## Description

This specification closes run-state and telemetry integrity gaps observed in a standard `ws-spec-to-pr` run (auto + full mode): the run completed with silently degraded model resolution and unwritten ship bookkeeping, and no hard exception was ever raised. Implement this group **second**, after Group 1 (`us-415-416-script-ux-golden-path`): the ship-writeback and round-artifact paths must use the documented golden-path commands, and the new fail-closed errors reuse the Group 1 boundary/diagnostic conventions.

Verified live against the current tree on 2026-09-24 (all claims still reproduce; nothing outdated): `presetWarning: unknown-models-preset` originates in `ws-shared/runtime/scripts/workflow_state.cjs`; `shipStatus` is referenced across `ws-ship-pr` and `ws-spec-to-pr` skill text; `round-` artifacts are referenced in `ws-fix-pr` / `ws-goal-fix-pr` skill text; `skipReason` is written by `STEP-DISPATCH` flows and `step_coordinator.cjs` / `write_sequential_dag.cjs`. Related tracker references: #413 is CLOSED (shipped via `0125-us-412-413-liveness-checkpoints.spec.md`); #412 is consolidated in Group 3 of this batch.

## Acceptance Criteria

- AC1: A run whose configured `modelsPreset` is absent from `defaults.modelPresets` fails at run start with an error naming the unknown preset and the available presets; it never silently resolves to another preset's model.
- AC2: Telemetry records the resolved model id per step; steps never record a preset name in a `model` field.
- AC3: On ship/merge, `shipStatus`, `prNumber`, and `prUrl` are written back to state and a Step 9 handoff is recorded; a `completed` run never leaves ship fields empty after a merged PR.
- AC4: Step 9 convergence emits `{reviewsDir}/PR-<N>-round-*.md` round artifacts, or explicitly records a clean-immediate reason when no review rounds were needed.
- AC5: `skipReason: "dag"` is never recorded for a step whose DAG artifacts (`step-03-*.plan.exec.md`) were produced; skip reasons describe the step's actual fate.
- AC6: Step 4 dispatch provenance reconciles telemetry `agentType` with host subagent accounting, or documents the mapping when the host cannot report it (host-side item: fix if host-owned, document if not).
- AC7: Existing suites (`npm run test`, `ws-check-harness`) stay green; new coverage pins the fail-closed preset error (AC1), the ship writeback (AC3), and the round-artifact-or-reason rule (AC4).

## Original Issue Context

### Prior Work Sweep

- Exact open PR for the same tracker id: none (`gh pr list --state open --search 414` empty on 2026-09-24) — no stop/reuse gate; proceed.
- Related hits recorded, continue: `unknown-models-preset` in `ws-shared/runtime/scripts/workflow_state.cjs`; `shipStatus` in `ws-ship-pr/SKILL.md` and `ws-spec-to-pr` `STEP-DISPATCH.md`/`ARTIFACTS.md`/`PROTOCOLS.md`; `round-` in `ws-fix-pr` / `ws-goal-fix-pr` skill text; `skipReason` in `STEP-DISPATCH.md`, `ac_ledger.cjs`, `step_coordinator.cjs`, `write_sequential_dag.cjs`.

### Issue #414 (verbatim)

## Failure class

Run-state / telemetry integrity gaps in a standard `ws-spec-to-pr` run (auto + full mode). No hard exception was raised, but the run completed with silently degraded model resolution and unwritten ship bookkeeping.

1. **Unknown models preset degrades silently.** Every telemetry event carries `presetWarning: unknown-models-preset: <name>`; the configured `modelsPreset` is absent from `defaults.modelPresets`, and resolution falls through to a different preset's model instead of failing loudly.
2. **Ship bookkeeping never written back.** Final state is `status: completed` but `shipStatus: pending`, `prNumber`/`prUrl` empty, and no Step 9 handoff ΓÇö despite the PR being created and merged.
3. **Step 9 converged without round artifacts.** The PR was merged, but no `{reviewsDir}/PR-<N>-round-*.md` files were written.
4. **Contradictory skip semantics.** Step 3 records `skipReason: "dag"` while `execMode: dag` / `enableDag: true` and the `step-03-*.plan.exec.md` artifact exists.
5. **Dispatch provenance mismatch (host-side).** Step 4 dispatches record `agentType: generic:Task` while the host status reports 0 subagents.

## Expected contract

- An unresolved `modelsPreset` must fail at run start or resolve from the active preset ΓÇö never degrade to another preset's model silently. Telemetry should record the **resolved model id**, not the preset name.
- On ship/merge, `shipStatus` + `prNumber` + `prUrl` must be written to state and a Step 9 handoff recorded. A `completed` run must not leave empty ship fields.
- Step 9 convergence must emit round artifacts, or explicitly record a clean-immediate reason when none are needed.
- `skipReason: "dag"` must not be recorded for a step whose DAG artifacts were produced.
- Dispatch provenance should reconcile `generic:Task` telemetry with the host's subagent accounting.

## Observed evidence

- **12/12** telemetry events carry `presetWarning: unknown-models-preset: <name>`.
- Steps 1ΓÇô3 record `model: "<preset name>"` (not a model id); steps 4ΓÇô9 record a different preset's execution model.
- Final state: `status: completed`, `currentStep: 9`, `shipStatus: pending`, `prNumber`/`prUrl` empty, `handoffs["9"]` absent; `endedAt` precedes the merge timestamp by ~4.5 min, and the state file was written again after the merge with the ship fields still empty.
- No `{reviewsDir}/PR-<N>-round-*.md` artifacts for the shipped PR.
- Step 3 `finish` carries `skipReason: "dag"` with the exec artifact present.

## Reproduction shape

- Standard pipeline, `autoMode` + `fullMode: true`, `modelsPreset` set to a name absent from `defaults.modelPresets`.
- Any run that reaches Step 8 (ship) and Step 9 (fix-pr).

## Related

- #413 ΓÇö full/auto mode parks large steps at host turn boundaries with no checkpoint (same run).
- #412 ΓÇö ws-monitor transcript discovery/correlation defects (why the observer could not emit `worker-session-stall`).

## Scope

- [x] No product fix applied by the reporter
- [x] No managed consumer skill copy was patched
- [x] All private data removed

## Notes

### Design Intent

The five failure items were verified against current code and skill text (symbols present as listed in Prior Work Sweep). No intentional-constraint evidence found; treat silent fallback, missing writeback, and contradictory skip reasons as accidental gaps. The implementer must still run `git log -p -S "<symbol>"` on touched code paths (preset resolution, ship writeback, Step 9 convergence, skip-reason assignment) and record intent vs accident per finding. AC6 may resolve as documentation if the provenance gap is host-owned.

### Implementation order

Group 2 of 3 (implement second, after Group 1 golden-path commands, before Group 3 monitor accuracy).

## Out of Scope

| Feature | Reason |
|---------|--------|
| Golden-path command docs and CLI diagnostics | Group 1 (`us-415-416-script-ux-golden-path`) owns help text, boundary errors, exit codes. |
| Monitor expectation model and transcript correlation | Group 3 (`us-412-418-monitor-accuracy`) owns monitor-side fixes. |
| #413 checkpoint work | Already shipped via `0125-us-412-413-liveness-checkpoints.spec.md`. |
| Auto-merge policy changes | Ship and merge behavior are unchanged; only bookkeeping is written back. |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Unknown preset severity | Fail-closed at run start | Silent cross-preset fallback caused the degraded run; warning-only preserves the defect | y |
| Clean-immediate Step 9 | Explicit reason recorded when no rounds needed | Distinguishes "no rounds required" from "artifacts lost" | y |
| AC6 landing zone | Fix if workflow-owned, document if host-owned | Provenance spans the host boundary; either outcome is verifiable | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Preset resolution, ship writeback, Step 9 convergence, skip-reason assignment, dispatch provenance | Plan maps each AC to a file |
| Atomic criteria | Every AC is a single pass/fail statement | `validate_spec.cjs --mode=authoring` exits 0 |
| Failure modes | Negative scenarios enumerate expected red tests | Test run before fix (expected red) |
| Observation telemetry | Resolved model ids, ship fields, round artifacts asserted on state JSON | State-schema and monitor JSON assertions |
| No open blockers | Issue reproduced with code citations; no open PR owns it | Prior Work Sweep and code citations above |
| Stack invariants | Node-only skill scripts; no tokens or machine paths in errors or telemetry | `ws-check-harness` + secrets review |

## Validation & Observation Notes

- Telemetry: `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring <spec>` must PASS; `npm run test` and `ws-check-harness` green with exit codes cited.
- State assertions: unknown-preset run fails before Step 0 planning; post-merge state carries `shipStatus`, `prNumber`, `prUrl`, and `handoffs["9"]`.

### Negative & Failing Test Scenarios

- NEG1: run with `modelsPreset` absent from `defaults.modelPresets` must fail at start (red before fix: silent fallback with `presetWarning`; green after: fail-closed error).
- NEG2: merged-PR run asserting empty `shipStatus`/`prNumber`/`prUrl` must fail after the fix (red before: fields empty on completed runs).
- NEG3: Step 9 convergence with zero round artifacts and no recorded clean-immediate reason must fail (red before, green after).

## Related specs

- Group 1: `us-415-416-script-ux-golden-path` (implement first).
- Group 3: `us-412-418-monitor-accuracy` (implement third).
- Precedent: `0125-us-412-413-liveness-checkpoints.spec.md` (grouped-issue consolidation shape).
