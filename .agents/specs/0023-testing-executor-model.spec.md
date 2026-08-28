---
id: null
slug: testing-executor-model
title: "Add testingModel (test executor) to LLM model config"
source: local
specDate: 2026-08-12
status: completed
---

# Specification — Add testingModel (test executor) to LLM model config

## Description

### Problem

`config.json` → `defaults` already has phase LLM preferences: `plannerModel`, `executionModel`, `reviewerModel`. In `autoMode`, standard orch maps **Steps 5–7** to `reviewerModel`, so **Step 7 (`ws-testing`)** runs on the review model.

Testing is an execution-style job (run suites, parse output, write plan/report). It should use a **test executor** model, not the reviewer, unless the consumer sets it otherwise.

### Solution

Add optional string `defaults.testingModel` next to the other LLM model keys. It is the **test executor** preference.

**Runtime resolve (Step 7 only):**

1. If `defaults.testingModel` is a non-empty string, use it.
2. Else use `defaults.executionModel` (this is the default: omitted or `""` equals execution model).
3. Else keep the active session model (same non-blocking fallback as the other model keys).

**Standard orch (`ws-spec-to-pr`) autoMode dispatch:**

| Steps | Model |
|-------|--------|
| 0–3 | `plannerModel` (unchanged) |
| 4 | `executionModel` (unchanged) |
| 5–6 | `reviewerModel` (narrowed: was 5–7) |
| 7 | resolved `testingModel` (new) |
| 8–9 | no new mapping (unchanged) |

Lite orch does **not** dispatch `ws-testing`. `testingModel` is unused there. Lite keeps `reviewerModel` on Step 3.

### Config surface

- `config.schema.json`: optional string `defaults.testingModel`. Description: test executor for standard Step 7; empty/omitted resolves to `executionModel`. No JSON Schema `default` that copies another property (resolve at read/dispatch time).
- `config.json.example`: add `testingModel: ""` under the existing `_comment_models` block. Comment: empty means use `executionModel`.
- Narrow `reviewerModel` schema/example copy from "Steps 5–7" / "review and verification" to **Steps 5–6** (check-implementation + code-review).
- `ws-configure-project` interview (`defaults` LLM models): prompt `testingModel` after `executionModel` / `reviewerModel`. Recommended: leave empty (same as execution). Offer the same host canonical strings as the other model keys.

### Orchestrator / docs

Update every place that still says Review phase = Steps 5–7:

- `ws-spec-to-pr/STEP-DISPATCH.md` autoMode model-switching note
- `ws-spec-to-pr/SKILL.md` autoMode flag blurb
- `ws-shared/tools.md` § Auto-mode subagent model preferences
- `ws-configure-project/INTERVIEW.md` model list
- `ws-testing/SKILL.md`: Step 7 dispatch uses resolved `testingModel`; the skill does not pick a different model on its own

Standalone `/testing` (no orch) does not switch models. Same as today: current session model.

Switch failure / unsupported host: keep the active session model; do not stop the workflow (same AC5 behavior as `auto-mode-model-preferences`).

### Out of scope (v1)

- Lite orch gaining a testing step or a lite mapping for `testingModel`
- Changing `plannerModel` / `executionModel` step ranges
- New host-specific switch APIs beyond the existing `tools.md` parameterization
- Rewriting consumer `config.json` values on update (omitted key already resolves to execution)

## Acceptance Criteria

- AC1: `config.schema.json` and `config.json.example` define optional string `defaults.testingModel` beside `plannerModel`, `executionModel`, and `reviewerModel`. Empty or omitted `testingModel` is valid.
- AC2: Schema and example descriptions for `reviewerModel` cover standard Steps 5–6 only, not Step 7.
- AC3: At standard Step 7 `dispatch-agent` `ws-testing` in `autoMode`, the orchestrator uses `defaults.testingModel` when it is a non-empty string; otherwise it uses `defaults.executionModel`; if that is also empty or the switch fails, it keeps the active session model and continues.
- AC4: Standard autoMode still maps Steps 0–3 → `plannerModel`, Step 4 → `executionModel`, Steps 5–6 → `reviewerModel`. Step 7 is not mapped to `reviewerModel`.
- AC5: `ws-spec-to-pr/STEP-DISPATCH.md`, `ws-spec-to-pr/SKILL.md`, and `ws-shared/tools.md` document the Step 7 `testingModel` resolve rule and the narrowed reviewer range.
- AC6: `ws-configure-project` interview for `defaults` LLM models includes `testingModel` (test executor, standard Step 7). Recommended choice is empty / same as `executionModel`. Host canonical suggestions match the other model keys.
- AC7: `ws-spec-to-pr-lite` does not read or apply `testingModel`. Lite Step 3 remains `reviewerModel`.
- AC8: `ws-testing` documents that the orchestrator supplies the resolved test-executor model on Step 7 dispatch; standalone `/testing` does not switch models.
- AC9: Existing configs with no `testingModel` key keep working: Step 7 uses `executionModel` (or active session if that is empty). No installer migration rewrite is required.

## Notes

- **Key name:** `testingModel` (same `*Model` pattern as planner/execution/reviewer). Role name in docs: **test executor**.
- **Behavior change:** today Step 7 uses `reviewerModel`. After this, default Step 7 follows `executionModel`. Consumers who want the old review model on testing set `testingModel` to the same string as `reviewerModel`.
- **Depends on:** `auto-mode-model-preferences` (existing three keys + autoMode switch + fallback).
- **Related:** `workflow-mutation-testing-gate` (mutation stays a Step 7 substep; it uses the same Step 7 model, no extra key).
- **Next:** register via `ws-local-spec-provider` when starting a workflow; classify with `ws-classify-complexity`.
