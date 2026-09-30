---
id: null
slug: per-step-context-budgets
title: "Per-step context budgets in dispatch contracts"
source: local
specDate: 2026-09-30
---

# Specification — Per-step context budgets in dispatch contracts

## Description

Dispatch context is capped by a single global `defaults.contextBudget` (default 32000 bytes, floor 18000) applied identically to every step, but steps have sharply different context needs: a plan-writing dispatch carries spec plus stack slices while a verify dispatch carries ledger plus report pointers. One global cap either starves heavy steps or over-allows light ones, and external comparator practice shows per-step targets (under 40 KB per dispatch) keep prompts tight where it matters.

This spec adds per-step context budgets to the dispatch contracts. Configuration gains `defaults.stepContextBudgets`, a step-number to byte-budget map mirroring the existing `stepModels` convention; `build_dispatch_context.cjs` resolves the effective budget per dispatch as the step override when present else the global `defaults.contextBudget`, enforces the same 18000 floor on every value, and records the effective budget plus its source in the dispatch manifest. `measure_harness.cjs` and the dispatch contract prose account per-step budgets so audits reflect what each step was actually allowed.

## Acceptance Criteria

- AC1: Configuration supports `defaults.stepContextBudgets` mapping step numbers to byte budgets, following the existing per-step override convention.
- AC2: The dispatch builder resolves the effective budget per dispatch as the step override when present, else the global `defaults.contextBudget`.
- AC3: Every configured budget value enforces the 18000-byte floor and rejects non-integer or below-floor values with the offending key named.
- AC4: The dispatch manifest records the effective budget bytes plus whether the source was the step override or the global default.
- AC5: Mandatory dispatch content exceeding the effective step budget fails closed before any prompt is emitted.
- AC6: The harness measurement report accounts per-step budgets so each step is audited against its own effective cap.
- AC7: The config schema, config example, and desktop config GUI editor expose the per-step map with matching floor validation.
- AC8: Runs without any step override behave byte-identically to the current global-budget behavior.

## Original Issue Context

Free-text request: add per-step context budgets to dispatch contracts, copying the external practice of a tight per-dispatch target (under 40 KB).

### Prior Work Sweep

- Keyword and git sweep on `contextBudget`, `FIXED_LIMIT`, `stepModels`: the global budget (`defaults.contextBudget`, default 32000, floor 18000) is enforced in `build_dispatch_context.cjs` with mandatory-over-budget fail-closed; `stepModels` already establishes the per-step override map convention the new key mirrors.
- `measure_harness.cjs` audits a single fixed preamble cap plus global reduction percentages; no per-step accounting exists.
- No open PR covers per-step budgets; nearest closed work is the dispatch-context budget and token-reduction deliveries.

### Design Intent

- Gap extension, not a bug restore: the single global cap was designed when all dispatches shared one shape, and no prior version offered per-step overrides, so `git log -S "contextBudget"` shows intentional initial scope rather than a removed feature.

## Notes

- Dependencies: `ws-spec-to-pr/scripts/build_dispatch_context.cjs` (budget resolution, manifest), `ws-check-harness/scripts/measure_harness.cjs` (per-step audit), `ws-shared/runtime/config.schema.json` (schema), `ws-shared/templates/config.json.example` (example plus comment), `ws-shared/runtime/scripts/Edit-WorkflowSkillsConfig.ps1` (GUI editor), `ws-spec-to-pr/PROTOCOLS.md` (dispatch contract prose).
- Step keys cover standard steps 0 through 9; lite steps 0 through 5 reuse the same keys by number.
- The under-40 KB external target is informative only; configured values stay consumer-chosen with the 18000 floor.
- Stack rule packs under `{skillsRoot}/ws-shared/runtime/stacks/` do not apply to this Node 22 skill-package stack.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Per-role or per-model budget scaling | Budgets key on step number only in this change |
| Dynamic budget adjustment mid-run | Budgets resolve from config at dispatch time with no runtime tuning |
| Changing the global default or floor | Default 32000 and floor 18000 stay; only overrides are added |
| Lite-specific budget semantics | Lite reuses the same keys by step number with no separate map |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Override shape | `defaults.stepContextBudgets` map keyed by step number | Mirrors the established `stepModels` convention | y |
| Resolution order | Step override, else global `defaults.contextBudget` | Overrides narrow the global without replacing it | y |
| Floor | 18000 bytes on every value including overrides | Fixed preamble must always fit | y |
| Manifest provenance | Effective bytes plus override-or-global source | Audits show what each dispatch was allowed | y |
| GUI parity | Desktop editor exposes the map with floor validation | Config surface stays in sync per repo rule | y |
| Auth, rate limits, external dependencies | N/A because budget resolution is local config arithmetic | No caller identity, throttle, or remote fallback applies | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Step map, resolution, floor, manifest, audit, config surface only | AC1 through AC8 each map to one behavior |
| Atomic criteria | Each AC names a key, exit, manifest field, or byte-identical check | Review AC list against the builder and schema |
| Failure modes | Below-floor value, over-budget mandatory content named | Negative scenarios list each mode with expected signal |
| Observation telemetry | Manifest fields and measurement report named | Telemetry section lists exact fields and commands |
| Zero open blockers | Shape, order, floor, provenance, and GUI parity decided | Assumptions table shows Confirmed y on decided rows |

## Validation & Observation Notes

### Telemetry & Observable Signals

- Dispatch manifests carry effective budget bytes plus the override-or-global source for every dispatch.
- `measure_harness.cjs` output accounts each step against its own effective cap.
- `node test/test-powershell-config-editor.js` passes with the per-step map exposed in the GUI editor.
- `npm run test` plus the per-step budget regression tests covering override, fallback, floor rejection, and byte-identical default behavior.

### Negative & Failing Test Scenarios

- A step override below 18000 or non-integer fails the dispatch with the offending key named.
- Mandatory content exceeding the effective step budget fails closed before any prompt bytes are emitted.
- A run with no step overrides produces byte-identical dispatch output to the pre-change global behavior.
- A manifest missing the budget source field fails manifest validation.
