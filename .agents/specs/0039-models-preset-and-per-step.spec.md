---
id: null
slug: models-preset-and-per-step
title: "Config: model presets and per-step / substep model preferences"
source: local
specDate: 2026-08-21
---

# Specification — Config: model presets and per-step / substep model preferences

## Description

Extend `{sharedDir}/config.json` so consumers can:

1. Select a named **models preset** (`modelsPreset: "cursor"` | `"deepseek"` | `"cheap"` | `"default"` | custom).
2. Define reusable **preset bundles** under a dedicated map (phase keys plus optional per-step / substep keys).
3. Override the model for **individual standard (and lite) steps and known substeps** (interview refine, DAG task workers, scoreAndRefine implement rounds, Step 6 review-fix, etc.), not only the four coarse phase buckets.

Today only four keys exist under `defaults`: `plannerModel`, `executionModel`, `reviewerModel`, `testingModel`. `resolve_phase_model` maps Steps 0–3 → planner, 4 → execution, 5–6 → reviewer, 7 → testing (else execution). That is too coarse for refine / DAG / review-fix work and forces consumers to edit four keys when switching host stacks (Cursor vs OpenCode/DeepSeek).

### Config shape (canonical)

Keep phase keys for backward compatibility. Add preset selection + preset map + optional step map.

```json
{
  "defaults": {
    "modelsPreset": "cursor",
    "modelPresets": {
      "cursor": {
        "plannerModel": "cursor-grok-4.6-xhigh",
        "executionModel": "composer-2.5",
        "testingModel": "composer-2.5",
        "reviewerModel": "cursor-grok-4.6-medium",
        "steps": {
          "2": "cursor-grok-4.6-xhigh",
          "dag": "composer-2.5",
          "scoreAndRefine": "composer-2.5",
          "reviewFix": "composer-2.5"
        }
      },
      "deepseek": {
        "plannerModel": "opencode-go/deepseek-v4-pro",
        "executionModel": "opencode-go/deepseek-v4-flash",
        "testingModel": "composer-2.5",
        "reviewerModel": "cursor-grok-4.6-medium"
      },
      "opencode": {
        "plannerModel": "opencode-go/deepseek-v4-pro",
        "executionModel": "opencode-go/deepseek-v4-flash",
        "testingModel": "opencode-go/deepseek-v4-flash",
        "reviewerModel": "opencode-go/deepseek-v4-pro"
      },
      "cheap": {
        "plannerModel": "composer-2.5",
        "executionModel": "composer-2.5",
        "testingModel": "composer-2.5",
        "reviewerModel": "composer-2.5"
      },
      "default": {
        "plannerModel": "current",
        "executionModel": "current",
        "testingModel": "current",
        "reviewerModel": "current"
      }
    },
    "stepModels": {
      "0": "",
      "1": "",
      "2": "",
      "3": "",
      "4": "",
      "5": "",
      "6": "",
      "7": "",
      "8": "",
      "9": "",
      "dag": "",
      "scoreAndRefine": "",
      "reviewFix": ""
    },
    "plannerModel": "",
    "executionModel": "",
    "reviewerModel": "",
    "testingModel": ""
  }
}
```

**Naming note:** the selector string is `defaults.modelsPreset`. The map of named bundles is `defaults.modelPresets` (plural noun as object). Do **not** use one key for both a string and an object.

Shipped `config.json.example` MUST include at least presets `default`, `cursor`, and `deepseek` (or `opencode`) as documentation samples. Consumers may add custom preset names freely (`additionalProperties` on the presets map).

### Special model token

| Value | Meaning |
|-------|---------|
| `"current"` | Use the active orchestrator session model (`currentModel`); do not request a subagent switch |
| `""` or omitted | Fall through to the next resolve layer |
| Any other non-empty string | Host-canonical model id for `dispatch-agent` (same vocabulary as today) |

### Resolve order (standard orch `dispatch-agent`)

For a dispatch at step `N` with optional **substep role** (`dag` | `scoreAndRefine` | `reviewFix` | none):

1. If `defaults.stepModels[<role>]` or `defaults.stepModels["N"]` is a non-empty string → use it (`role` wins over numeric step when both set for the same dispatch).
2. Else if active preset (`defaults.modelPresets[defaults.modelsPreset]`) has `steps[<role>]` or `steps["N"]` non-empty → use it.
3. Else if the corresponding top-level phase key on `defaults` (`plannerModel` / `executionModel` / `reviewerModel` / `testingModel`) is non-empty → use it (legacy override of the active preset’s phase key).
4. Else if the active preset’s phase key for that step is non-empty → use it.
5. Else if the phase key resolves to `"current"` (preset or top-level) → session `currentModel`.
6. Else session `currentModel`.
7. On switch failure / unsupported host id → keep `currentModel`; do not STOP the workflow (same as today).

**Active preset name:** `defaults.modelsPreset` when it names an existing key in `modelPresets`; else `"default"` if that key exists; else treat as no preset (legacy four keys only).

**Step → phase bucket (when no step/substep override):**

| Standard step / substep | Phase key |
|-------------------------|-----------|
| 0, 1, 2, 3 | `plannerModel` |
| 4 (build implement) | `executionModel` |
| `dag` (each parallel DAG task worker under Step 4 when `enableDag: true`) | `executionModel` unless overridden |
| 5 (verify) | `reviewerModel` |
| `scoreAndRefine` (re-dispatch `ws-implement-tasks` under Step 5 refine loop) | `executionModel` unless overridden |
| 6 (code-review) | `reviewerModel` |
| `reviewFix` (Step 6 fix → re-review implement) | `executionModel` unless overridden |
| 7 | `testingModel` → else `executionModel` (unchanged fallback chain) |
| 8, 9 | no required switch; if a subagent is dispatched, use `stepModels["8"|"9"]` or `current` |

### Lite orch

| Lite step | Phase key (no step override) |
|-----------|------------------------------|
| 0–1 | `plannerModel` |
| 2 | `executionModel` |
| 3 | `reviewerModel` |
| 4–5 | `current` / step override only |

Lite does **not** read `testingModel`, `scoreAndRefine`, or `dag` roles (no Step 7 / no DAG workers). `stepModels` numeric keys `0`–`5` apply when set.

### Runtime / schema / docs touchpoints

| Area | Obligation |
|------|------------|
| `config.schema.json` | Add `modelsPreset` (string), `modelPresets` (object of phase keys + optional `steps` map), `stepModels` (object of string values). Keep existing four phase keys. |
| `config.json.example` | Document presets + empty stepModels + comments for resolve order and `"current"`. |
| `update_state.py` / `.cjs` (standard + lite) | Replace coarse-only `resolve_phase_model` with the resolve order above (accept optional `--substep` / role). MEMORY: resolve config via `shared_dir(resolve_repo_root(...))`, never `.agents/ws-shared`. |
| `STEP-DISPATCH.md`, `PROTOCOLS.md`, `tools.md`, `gates.md` session-model banner | Document presets + per-step/substep keys. |
| `ws-configure-project` interview | Offer preset pick, then optional per-step overrides; keep editing legacy phase keys as advanced overrides. |
| Orchestrator dispatch sites | Pass resolved model into `dispatch-agent` for Steps 0–7 and for `dag` / `scoreAndRefine` / `reviewFix` sub-dispatches. |

### Out of scope

- Changing the rule that the **orchestrator session** always stays on `currentModel` (Pause → host → Resume for session switch).
- Host-private model marketplaces or auto-download of models.
- Renaming skill folders (`skill-family-naming` is separate).
- Migrating consumer configs on `update` (omitted keys keep legacy behavior).

## Acceptance Criteria

- AC1: `config.schema.json` defines `defaults.modelsPreset` (string), `defaults.modelPresets` (map of preset objects with optional `plannerModel` / `executionModel` / `reviewerModel` / `testingModel` and optional `steps` string map), and `defaults.stepModels` (string map). Legacy four phase keys remain valid.
- AC2: `config.json.example` includes sample presets named at least `default` (all `"current"`), `cursor`, and one OpenCode/DeepSeek-style preset (`deepseek` and/or `opencode`), plus an empty or commented `stepModels` block documenting numeric steps and roles `dag`, `scoreAndRefine`, `reviewFix`.
- AC3: Selecting `defaults.modelsPreset` to a named preset causes phase-bucket resolve to use that preset’s phase keys when top-level phase keys are empty.
- AC4: Non-empty `defaults.stepModels["N"]` or role key (`dag` / `scoreAndRefine` / `reviewFix`) wins over preset `steps` and phase buckets for that dispatch.
- AC5: Model string `"current"` resolves to the session `currentModel` without attempting a failing switch.
- AC6: Standard Step 7 still uses non-empty `testingModel` (after step/preset overrides) else `executionModel` else `currentModel`.
- AC7: When `enableDag: true`, each DAG task `dispatch-agent` uses the resolved `dag` role (else Step 4 / `executionModel` chain). When `enableDag: false`, sequential Step 4 workers use Step `4` / execution chain (no required `dag` key).
- AC8: Step 5 `scoreAndRefine` re-implement dispatches use the `scoreAndRefine` role resolve; Step 6 review-fix implement dispatches use the `reviewFix` role resolve.
- AC9: Missing `modelPresets` / `modelsPreset` / `stepModels` keeps today’s behavior (four phase keys only). No installer rewrite of consumer `config.json`.
- AC10: Unknown `modelsPreset` name falls back to preset `default` if present, else legacy four keys / `currentModel`; does not hard-fail the workflow.
- AC11: `resolve_phase_model` (or successor helper) in standard and lite state scripts implements the resolve order and loads config via the shared-dir resolver (not `.agents/ws-shared`).
- AC12: `STEP-DISPATCH.md`, `tools.md`, `gates.md` model banner, and `ws-configure-project` interview document presets, `"current"`, and per-step/substep overrides.
- AC13: Lite ignores `testingModel`, `dag`, and `scoreAndRefine` roles; lite `stepModels` `0`–`5` still apply when set.
- AC14: Switch failure remains non-blocking (keep `currentModel`). Focused tests cover: preset selection, step override precedence, `"current"` token, Step 7 testing fallback, unknown preset fallback.
- AC15: After hashed content changes, integrity generate/verify and `npm run test` / harness checks required for the ship commit pass.

## Original Issue Context

Maintainer free-text:

> add model per step configuration in config.json. Today we have plannerModel / executionModel / testingModel / reviewerModel. Want model for each step including refine, dag, etc. Also presets for groups of models via `modelsPreset: "cheap" | "cursor" | "opencode"` and a models/presets section with named bundles (cursor, deepseek, default with `"current"`, etc.). For each step, add configuration models (not only the four phase keys shown in the example).

### Prior Work Sweep

- Keywords: `plannerModel`, `testingModel`, `modelsPreset`, per-step model, phase model.
- Related completed specs: [`testing-executor-model.spec.md`](testing-executor-model.spec.md) (Step 7 executor); PR #172 / #200 (phase model preferences).
- Git: `resolve_phase_model` still buckets 0–3 / 4 / 5–6 / 7 only — no presets, no refine/DAG/reviewFix roles.
- Open PRs: none for `modelsPreset` / per-step map. Continue; do not overload the testing-executor-model work.
- MEMORY: `resolve_phase_model` must use `shared_dir(resolve_repo_root)` — any new resolver must keep that contract.

### Design Intent

Intentional expansion of the phase-model feature, not a bug restore. Coarse four-key mapping was deliberate for v1 autoMode; consumers now need preset switching and finer step/substep control. Preserve orchestrator-on-`currentModel` and non-blocking switch failure.

## Child Tasks

### Task A — Schema & example

- **Status:** Open
- **Description:** Add `modelsPreset`, `modelPresets`, `stepModels` to schema + example; document `"current"` and precedence.

### Task B — Resolver & dispatch

- **Status:** Open
- **Description:** Implement resolve order in state helpers; wire STEP-DISPATCH / orch for `dag`, `scoreAndRefine`, `reviewFix`; lite rules.

### Task C — Interview, docs, tests

- **Status:** Open
- **Description:** configure-project interview; tools/gates/STEP-DISPATCH docs; unit tests for precedence and fallbacks; integrity at ship.

## Notes

- Prefer host-portable model id strings already used in Cursor Task / OpenCode configs; do not invent product-branded APIs inside skills.
- Custom preset names are allowed; shipped names are samples, not a closed enum (schema may use `additionalProperties`).
- Do not conflate `modelsPreset` (selector string) with `modelPresets` (map).
- Dogfood upstream `config.json` may adopt a preset after ship; not required to change live dogfood values in this spec’s ACs.
