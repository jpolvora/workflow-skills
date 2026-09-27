---
id: null
slug: models-preset-override
title: "ws-spec-to-pr: parameter override for modelsPreset on workflow invocation"
source: local
specDate: 2026-09-17
status: completed
---

# Specification — ws-spec-to-pr: parameter override for modelsPreset on workflow invocation

## Description

In `ws-spec-to-pr` and `ws-spec-to-pr-lite`, subagent models and phase defaults resolve according to `defaults.modelsPreset`, `defaults.modelPresets`, and `defaults.stepModels` defined in `{sharedDir}/config.json` (spec 0039). Currently, the active preset is strictly determined by the static `defaults.modelsPreset` property in the project configuration hub.

When a developer or automated driver wants to execute a workflow run targeting a specific model bundle (for example, switching from `default` or `cursor` to `muse-spark`, `deepseek`, `cheap`, or a custom preset), they are forced to either edit `.agents/skills/ws-shared/config.json` directly or rely on static project configuration. There is no invocation-level mechanism to select an alternate preset for a single workflow execution.

This specification introduces parameter-based override support for `modelsPreset` across `ws-spec-to-pr` and `ws-spec-to-pr-lite`:

1. **Invocation parameter:** Workflow entry supports `preset=<name>`, `--preset=<name>`, or `--preset <name>` (for example, `/ws-spec-to-pr 2416 auto preset=cursor` or `/ws-spec-to-pr spec-slug preset=muse-spark no-ship`).
2. **Resolution precedence:** If provided, the invocation parameter overrides `defaults.modelsPreset` from `config.json` for that workflow run. If omitted, model resolution falls back to `defaults.modelsPreset` as configured.
3. **Graceful fallback:** If the requested preset name is not defined under `defaults.modelPresets`, the workflow logs a warning in telemetry and the Init banner, then falls back to `defaults.modelsPreset` (or preset `"default"`, then legacy phase keys / session model) without halting.
4. **State persistence & resume:** The resolved preset is persisted into `{workflow-id}.state.json` and `{workflow-id}.state.md` frontmatter as `modelsPreset`. Resumed workflows read `state.modelsPreset` so the override is retained across steps and sessions without requiring the flag to be re-passed.
5. **Observability & Init banner:** The Step 3 Init banner in `setup.md` renders `modelsPreset` in the parsed args table, indicating whether it was resolved from the parameter override or `config.json`.
6. **Tooling & schema alignment:** `workflow-state.schema.json` allows `modelsPreset` (string), and `workflow_state.cjs` supports `--preset <name>` on `dispatch` and `finish` operations.

## Acceptance Criteria

- AC1: setup.md §2 Parse flags parses preset=<name> (as well as --preset=<name> and --preset <name>) from invocation arguments.
- AC2: When preset=<name> is passed, model resolution uses the specified preset name instead of config.json defaults.modelsPreset.
- AC3: When no preset parameter is provided in invocation, model resolution falls back to config.json defaults.modelsPreset.
- AC4: When an unknown preset name is provided, the system records a warning in telemetry and gracefully falls back to defaults.modelsPreset or default.
- AC5: The active modelsPreset value is persisted in {workflow-id}.state.json and {workflow-id}.state.md frontmatter as modelsPreset.
- AC6: workflow-state.schema.json defines optional property modelsPreset with type string.
- AC7: On workflow resume, existing state.modelsPreset is retained and continues to govern model resolution without re-specifying the parameter.
- AC8: The Step 3 Init banner in setup.md displays modelsPreset alongside other parsed switches, indicating whether it was overridden or read from config.json.
- AC9: workflow_state.cjs supports --preset <name> on dispatch and finish operations, applying the override when evaluating resolvePhaseModel.
- AC10: Dual-mode orchestrator ws-spec-to-pr-lite supports preset=<name>, recording it in state and banner while preserving inline execution on currentModel.
- AC11: Harness documentation and skill contracts in ws-spec-to-pr, ws-spec-to-pr-lite, and setup.md document the parameter override and precedence rules.
- AC12: Unit tests in test/test-models-preset-and-per-step.js cover parameter parsing, override precedence, state persistence, resume retention, and unknown preset fallback.

## Original Issue Context

Maintainer free-text:

> add a spec to create a parameter on skill ws-spec-to-pr which will be an override of modelsPreset. Currently, the orch and subagents dispatched follow by default config.json of workflow skills configuration ws-shared/config.json in the section modelsPreset confg. I want to add an override that makes the orchestrator follow another modelsPreset than by the set that was configured in config.json. For example, when I call ws-spec-to-pr <slug/US/issue> full auto preset=cursor or ws-spec-to-pr spec-slug preset=muse no-ship, then the orch will read config.json as usual but the preset will be override/resolved by the parameter if exists. Else, follows default.

### Prior Work Sweep

- Spec 0039 (`0039-models-preset-and-per-step.spec.md`): Introduced `modelsPreset`, `modelPresets`, `stepModels`, and `resolvePhaseModel` resolver order.
- Spec 0090 (`0090-muse-code-harness-adaptation.spec.md`): Added `muse-spark` preset bundle and documented host adaptation.
- Git search: `git grep "modelsPreset"` shows that `defaults.modelsPreset` in `config.json` was previously the only mechanism for selecting the active preset. Invocation flags (`auto`, `dry-run`, `skip-testing`, `skip-tests`, `skip-gates`, `full`, `strict`, `score-and-refine`) did not include model bundle selection.
- Open PRs / issues: No prior PR implements an invocation parameter override for `modelsPreset`.

### Design Intent

Prior behavior was intentional for v1 of model presets: presets were configured statically per project hub. As developers increasingly run diverse workloads across different IDE hosts, cloud executors, and cost tiers, requiring manual edits to `config.json` before a run creates friction and risks accidental check-ins of temporary local overrides. Supporting an invocation-level parameter allows per-run model selection while preserving project configuration defaults.

## Child Tasks

### Task A — Schema & State Script Support

- **Status:** Open
- **Description:** Update `workflow-state.schema.json` to allow `modelsPreset` in state; update `workflow_state.cjs` to accept `--preset <name>` and consider state/option overrides in `getActivePreset` and `resolveRecordedModelDetails`.

### Task B — Orchestrator Bootstrap & Banner

- **Status:** Open
- **Description:** Update `setup.md` §2 Parse flags to parse `preset=<name>` and `--preset`, persist `modelsPreset` to state frontmatter, handle resume retention in §4, and display `modelsPreset` in §3 Init banner.

### Task C — Documentation, Dual-Mode & Tests

- **Status:** Open
- **Description:** Update `ws-spec-to-pr` and `ws-spec-to-pr-lite` docs/protocols; add test cases to `test/test-models-preset-and-per-step.js` verifying precedence, persistence, and fallback.

## Notes

- The orchestrator session itself always continues to run under `currentModel` (Pause → host switch → Resume). The preset override governs subagent dispatch and phase model resolution.
- `stepModels` overrides (both numeric steps and substep roles like `dag`, `scoreAndRefine`, `reviewFix`, `fixPrPlan`, `fixPrExec`) still take precedence over preset values.
- Unknown preset names fall back gracefully to `defaults.modelsPreset` or `"default"` without throwing fatal errors.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Modifying orchestrator session model switching | Main session always runs under `currentModel`; switching is done via Pause -> host switch -> Resume |
| Command-line JSON bundle definitions | Complex object parsing on CLI is fragile and error-prone across host shells |
| Overriding per-step `stepModels` precedence | Step and role overrides intentionally remain more specific than preset defaults |
| Modifying consumer `config.json` files on disk | Parameter override is run-scoped and non-destructive to repository configuration |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Parameter syntax forms | Support `preset=<name>`, `--preset=<name>`, and `--preset <name>` | Accommodates natural prompt phrasing and standard shell flag conventions | y |
| State persistence across resume | Persist resolved preset in `state.modelsPreset` | Preserves parameter override across interactive gate pauses and session resumes | y |
| Unknown preset handling | Warn and fall back to `defaults.modelsPreset` (or `"default"`) | Conforms to spec 0039 graceful fallback without failing workflow execution | y |
| Input validation, auth, rate limits, concurrency, data lifecycle, external dependencies | N/A because this feature adjusts in-memory flag resolution and state recording within the local agent harness without introducing external network endpoints or asynchronous mutation | The parameter operates strictly on local workflow initialization and subagent model resolution | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Specification covers parameter parsing, state persistence, schema, and model resolution without modifying orchestrator session switching rules | Review diff against AC1–AC12 |
| Atomic criteria | Each acceptance criterion specifies an isolated, verifiable behavior with explicit pass/fail conditions | Inspection of AC1–AC12 and `validate_spec.cjs` check |
| Failure modes | Unknown preset names, empty strings, missing config presets, and resume states covered | Negative & Failing Test Scenarios NS1–NS4 |
| Observation telemetry | Telemetry log output, state frontmatter, and authoring validation | `validate_spec.cjs --mode=authoring` and test suite runs |
| Open blockers | None | N/A |
| Stack invariants | Portable Node 22 scripts, no host product names in contracts, en-us prose | Code inspection and integrity verification |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `node .agents/skills/ws-spec-organizer/scripts/resolve_spec_path.cjs --slug models-preset-override` resolves this spec-of-record path.
- `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring ".agents/specs/0092-models-preset-override.spec.md"` exits 0.
- `node test/test-models-preset-and-per-step.js` passes with new assertions covering parameter override and state persistence.
- Init banner in step output logs `modelsPreset` resolution with source provenance (`override: preset=<name>` vs `config.json`).
- `npm run test` and `npm run verify-integrity` pass.

### Negative & Failing Test Scenarios

- NS1: Supplying an unknown preset name (`preset=nonexistent`) produces a warning in telemetry and falls back to `config.json` `defaults.modelsPreset` without halting workflow initialization.
- NS2: Supplying an empty or whitespace preset (`preset=""` or `--preset ""`) is treated as unset and falls back to `defaults.modelsPreset`.
- NS3: Resuming a workflow without re-passing `preset=<name>` retains the previously recorded `state.modelsPreset` instead of reverting to `config.json`.
- NS4: Validating workflow state fails if `modelsPreset` is recorded in state but `workflow-state.schema.json` does not declare it as an allowed property.
