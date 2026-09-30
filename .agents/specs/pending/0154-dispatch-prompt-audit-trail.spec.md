---
id: null
slug: dispatch-prompt-audit-trail
title: "Dispatch prompt audit trail"
source: local
specDate: 2026-09-30
---

# Specification — Dispatch prompt audit trail

## Description

Standard orchestrator dispatches are machine-built by `build_dispatch_context.cjs` (bounded fixed preamble, AC-indexed plan slices, path-matched MEMORY slice, byte budget from `defaults.contextBudget`) and sent via `dispatch-agent`, but the exact prompt bytes sent per step are not durably auditable today: the builder output lands only in volatile `{us-dir}/.runtime/step-{N}-dispatch-prompt.md` scratch, which is outside the `ARTIFACTS.md` registry and the cleanup preserved set, carries no manifest, and is not referenced from `state.stepDispatches[]` or `telemetry.jsonl`.

This spec adds a durable per-step prompt audit pair beside the existing step artifacts: `{us-dir}/step-{NN}-{slug}.prompt.md` (exact dispatched prompt bytes) plus `{us-dir}/step-{NN}-{slug}.prompt.json` (budget/refs/hash manifest). The writer runs on every standard dispatch and every lite inline step boundary, links both files from dispatch provenance records, survives Phase A/B cleanup, and stays out of `G2-code` staging and the default Step 8 delivery set. It changes audit durability only; dispatch builder semantics, budget caps, and progressive-disclosure rules are unchanged.

## Acceptance Criteria

- AC1: Standard orch persists each dispatched step prompt to `{us-dir}/step-{NN}-{slug}.prompt.md` before the dispatch completes, where NN is the zero-padded step number.
- AC2: Each prompt markdown has a sibling `{us-dir}/step-{NN}-{slug}.prompt.json` manifest carrying step, slug, sourceSkill, acRefs, budgetBytes, fixedPreambleBytes, mandatoryBytes, totalBytes, memoryBytes, promptSha256, createdAt, dispatchMode, and revision.
- AC3: Prompt file bytes equal the exact `build_dispatch_context.cjs` output for that dispatch, manifest promptSha256 matches the file, and totalBytes plus fixedPreambleBytes respect the configured budget caps.
- AC4: The `state.stepDispatches[]` entry and the `telemetry.jsonl` dispatch event for the step record promptPath and promptSha256.
- AC5: Parallel DAG dispatches write per-node prompts as `step-04-{slug}.prompt.{node}.md` plus a matching per-node manifest without overwriting sibling nodes.
- AC6: Re-dispatch (Replay, Refine, Previous) overwrites the step prompt pair, bumps manifest revision, and appends a re-dispatch telemetry event preserving the prior sha.
- AC7: Prompt pairs are registered in `ARTIFACTS.md`, preserved by Phase A and Phase B cleanup, never staged by G2-code, and excluded from the default Step 8 delivery set.
- AC8: Lite inline steps write the same prompt pair with dispatchMode inline at each executed step boundary, or a skip marker entry when the step is skipped.
- AC9: A missing or hash-mismatched prompt pair fails the next pre-advance validation with the offending step number named in the error.
- AC10: The audit writer adds no secrets, tokens, PATs, or private hostnames beyond the already-inlined MEMORY slice and config pointers present in the dispatch output.

## Original Issue Context

Free-text request: based on prior research into dispatching subagents and bounded dispatch prompts (18 KB fixed preamble, 4 KB matched MEMORY slice, configurable 32 KB total context budget), what is the best way to audit the prompts, and can each step subagent prompt be saved near the step artifacts as `step-00-{slug}.prompt.md` and equivalents.

### Prior Work Sweep

- Keyword and git sweep on `dispatch-prompt`, `.runtime/step-`, `stepDispatches`, `build_dispatch_context`: dispatch context builder introduced under the token-reduction work (`ffae2209`), step-baton vocabulary under `e79c96dc`; no existing durable prompt audit artifact found.
- `STEP-DISPATCH.md` mandates building the prompt via `build_dispatch_context.cjs --output {us-dir}/.runtime/step-{N}-dispatch-prompt.md` before each `dispatch-agent`; `ARTIFACTS.md` plan-index read contract routes Steps 3-7 through `.runtime/plan.index.json`.
- No open PR or existing spec covers durable prompt persistence; nearest specs are the token-reduction and run-state-integrity deliveries, both closed.

### Design Intent

- Volatile placement under `{us-dir}/.runtime/` is an intentional constraint from the token-economy work (runtime scratch for the current run, outside the preserved set), not an accidental gap; `git log -S ".runtime/step-"` traces it to the dispatch-context and step-baton deliveries.
- This spec keeps that scratch path as the builder working output and adds a durable mirror beside step artifacts, so audit durability does not disturb dispatch builder semantics or budget enforcement.

## Notes

- Dependencies: `ws-spec-to-pr/scripts/build_dispatch_context.cjs` (prompt bytes + manifest source), `ws-shared/runtime/scripts/workflow_state.cjs` (`stepDispatches`, pre-advance), `ws-spec-to-pr/ARTIFACTS.md` (registry), `ws-spec-to-pr/STEP-DISPATCH.md` (dispatch recipe), `ws-spec-to-pr/protocols/artifact-cleanup.md` (preserved set), `ws-spec-to-pr-lite/SKILL.md` (inline parity).
- Writes must be atomic (temp file plus rename) so a crashed dispatch never leaves a half-written prompt markdown without its manifest.
- Prompt markdown is UTF-8 with LF normalization, matching the dispatch builder output contract.
- Step number NN follows existing artifact zero-padding (`step-00` through `step-09`); DAG node suffix is the existing DAG node id sanitized to filename-safe characters.
- Stack rule packs under `{skillsRoot}/ws-shared/runtime/stacks/` do not apply to this Node 22 skill-package stack; no stack invariant injection beyond the generic readiness checklist.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full subagent response transcripts | Audit covers the prompt sent, not the worker session output already captured in step outputs and handoffs |
| Host transcript capture | Owned by the existing `agentTranscripts` marker and observer protocol, out of this change |
| Retroactive backfill of pre-feature runs | Historical runs keep volatile scratch only; no migration writer |
| Step 8 default commit of prompt pairs | Prompts stay local audit artifacts; any delivery opt-in is a later toggle decision |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Prompt filename pattern | `step-{NN}-{slug}.prompt.md` plus `.prompt.json` beside step artifacts | Matches existing step glob, durable, user-requested placement | y |
| DAG node filename | `step-04-{slug}.prompt.{node}.md` per node | Prevents parallel worker overwrites on one worktree | y |
| Re-dispatch behavior | Overwrite pair, bump revision, keep prior sha in telemetry | Preserves latest prompt while retaining audit chain | y |
| Cleanup retention | Preserved by Phase A and Phase B | Audit value requires survival past terminal ship | y |
| Lite parity | Inline steps write the same pair with dispatchMode inline | Keeps one audit contract across both orchestrators | y |
| Pre-advance gate | Missing or mismatched pair fails next pre-advance | Fail-closed audit completeness for standard runs | y |
| Auth, rate limits, external dependencies | N/A because the writer is a local atomic file write with no network or auth surface | No caller identity, throttle, or remote fallback applies | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Prompt pair write, provenance link, registry, cleanup, and pre-advance gate only | AC1 through AC10 each map to one behavior with no extra surface |
| Atomic criteria | Each AC has a deterministic file, field, or exit-code check | Review AC list against the manifest schema and gate contract |
| Failure modes | Atomic-write crash, hash mismatch, DAG collision, budget exceed named | Negative scenarios list each mode with expected signal |
| Observation telemetry | Prompt files, stepDispatches fields, telemetry events, and gate errors named | Telemetry section lists exact paths and event names |
| Zero open blockers | Filename, retention, lite parity, and delivery exclusion decided | Assumptions table shows Confirmed y on all decided rows |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `{us-dir}/step-{NN}-{slug}.prompt.md` and `{us-dir}/step-{NN}-{slug}.prompt.json` exist after each dispatch or inline step boundary.
- `state.stepDispatches[]` entry for the step carries `promptPath` and `promptSha256`.
- `telemetry.jsonl` dispatch event for the step carries `promptPath` and `promptSha256`; re-dispatch appends an event with prior sha.
- `node {skillsRoot}/ws-spec-to-pr/scripts/validate_state.cjs {state} --pre-advance {N}` exits non-zero naming the step when its prompt pair is missing or mismatched.
- `npm run test` plus the prompt-audit regression test covering sequential, DAG, replay, lite-inline, and cleanup-preserved cases.

### Negative & Failing Test Scenarios

- Dispatch completes but the prompt pair is absent: next pre-advance fails naming the step instead of silently continuing.
- Prompt markdown edited after dispatch: sha check fails on the next gate with a hash-mismatch error.
- Two DAG nodes dispatch concurrently: both per-node prompt pairs exist with distinct node suffixes and neither overwrites the other.
- Dispatch exceeding the configured budget still fails closed in the builder before any prompt pair is written.
- Phase B temp delete runs: prompt pairs survive while listed temp artifacts are removed.
