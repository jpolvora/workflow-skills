---
slug: models-preset-and-per-step
title: "Config: model presets and per-step / substep model preferences"
status: active
workflowId: models-preset-and-per-step-20260822T143037Z
planningBaseline: 401358e8bf5b21ef3e41015f19757fe206fd0060
interviewRound: 1
shared_understanding: confirmed
interviewMode: autoMode
step: 2
acRefs: []
startedAt: "2026-08-22T14:30:37Z"
endedAt: "2026-08-22T14:49:42.002Z"
---
## 0. Summary & Business Rules

Extend consumer `{sharedDir}/config.json` so a named **models preset** plus optional **per-step / substep** overrides select the `dispatch-agent` model. Keep the existing four phase keys (`plannerModel`, `executionModel`, `reviewerModel`, `testingModel`) as legacy overrides. Do not switch the orchestrator session; it stays on `currentModel` (Pause → session host → Resume).

This is an intentional expansion of v1 phase-model autoMode, not a bug restore. Git history:

| Commit | Design intent to preserve |
|--------|---------------------------|
| `989ef09` (#200) | Coarse step→phase buckets; preferences apply only to `dispatch-agent`; switch failure is non-blocking; session never uses `--model` / `--model-chain`. |
| `49f231c` | Standard Step 7 uses non-empty `testingModel`, else `executionModel`, else session. `reviewerModel` is Steps 5–6 only. |
| `a5ae8a3` | `resolve_phase_model` loads config via `shared_dir(resolve_repo_root(...))`. Never `state_path` parent chains, never `.agents/ws-shared`. |

Live orch recorder is Node: `update_state.cjs` → `workflow_state.cjs`. Python `update_state.py` is a frozen helper that still owns `resolve_phase_model` and must stay algorithm-true. CJS today records `--model` and does **not** consult presets.

### Binding decisions (implement these)

1. Selector key is `defaults.modelsPreset` (string). Bundle map is `defaults.modelPresets` (object). Do not use one key for both.
2. Canonical algorithm lives in `.agents/skills/ws-shared/scripts/workflow_state.cjs` as exported `resolvePhaseModel`. Python `resolve_phase_model` in standard and lite `update_state.py` ports the same order (same kwargs: `role` / pipeline). Thin `update_state.cjs` wrappers stay one-liners (`runUpdateCli` already camelCases `--substep` → `options.substep`).
3. CLI `--model` (existing) remains the highest override so an orch that already resolved a host id is not rewritten. Spec layers 1–6 run when `--model` is omitted or blank. Add optional `--substep` (`dag` \| `scoreAndRefine` \| `reviewFix`). Do **not** add a `resolve-model` positional (CLI remains `dispatch` \| `finish` \| `bypass` + state path).
4. Role-to-phase bucket (when no step/substep override): `dag` / `scoreAndRefine` / `reviewFix` → `executionModel`. Numeric standard steps stay 0–3 planner, 4 execution, 5–6 reviewer, 7 testing then execution, 8–9 session unless `stepModels["8"|"9"]` is set. Lite numeric: 0–1 planner, 2 execution, 3 reviewer, 4–5 session unless `stepModels["0"`–`"5"]`.
5. When a role is passed, `defaults.stepModels[role]` wins over `defaults.stepModels["N"]` for that dispatch. Role phase bucket is used for layers 3–4, not the parent numeric step bucket (so Step 5 `scoreAndRefine` does not inherit `reviewerModel`). If the role key is empty, numeric `"N"` still applies at layer 1 (spec-literal).
6. Token `"current"` (any selected layer, including a selected `testingModel`) → session `currentModel` with no switch attempt. Do **not** fall through from `"current"` to `executionModel`. `""` / omitted / whitespace-only → fall through. Unknown `modelsPreset` → preset `default` if that key exists, else legacy four keys / session. Never hard-fail the workflow.
7. Missing `modelsPreset` / `modelPresets` / `stepModels` → today’s four-key behavior. Installer/update must not rewrite consumer `config.json` (`bin/cli.js` already preserves it).
8. Lite: no `dispatch-agent` session switch (Invariant 2). Resolver still runs for telemetry and the gates banner. Lite ignores `testingModel`, `dag`, `scoreAndRefine`, **and** `reviewFix` even if set (`reviewFix` is a standard Step 6 sub-dispatch; lite Step 3 review-fix stays on Step `3` / `reviewerModel` / `stepModels["3"]`). Numeric `stepModels` `0`–`5` apply when non-empty.
9. Schema does not enum preset names (`additionalProperties` on the map). Shipped example samples: `default` (all `"current"`), `cursor`, `deepseek`, `opencode`, and `cheap` (match the spec canonical JSON). Custom consumer names allowed. Unknown `stepModels` / `steps` keys are ignored at resolve time (do not throw).
10. Config `defaults.stepModels` (string map) is not the state frontmatter `stepModels` list Python already writes for telemetry. Do not rename the state field. Resolver reads only `config.json` → `defaults`.
11. MEMORY: load config through `resolve_consumer_root` (`shared_dir` / `resolve_repo_root` / CJS `resolveConsumerContext`). Do not restore `state_path.parent.parent.parent / "ws-shared"`. Prove with a temp consumer cwd / `--repo-root` fixture.
12. Out of scope: host marketplaces, skill-folder renames, consumer config migration, changing Pause/Resume session switching, product-branded APIs inside skills.
13. Interview refine is numeric `stepModels["2"]` / preset `steps["2"]`. Do **not** add an `interview` or `refine` role. Known roles remain `dag` \| `scoreAndRefine` \| `reviewFix` only. Unknown `--substep` → treat as no role (do not throw).
14. Do **not** edit gitignored dogfood `{sharedDir}/config.json` in this feature (spec Notes: adopt a preset after ship is optional and not an AC).
15. Do **not** edit `ws-testing/SKILL.md`. The orch supplies the already-resolved id; the skill does not pick a model (`testing-executor-model` AC8; `test-testing-executor-model.js` greps stay green).
16. Standard Step 7 phase chain **after** layers 1–2 (step/preset `steps` overrides): nonempty top-level `testingModel`, else preset `testingModel`, else top-level `executionModel`, else preset `executionModel`, else session. This is AC6; do not skip `executionModel` when both testing keys are empty.
17. `ws-configure-project/SKILL.md` needs no change: `--section defaults` does not enumerate the four phase keys today. AC12 SoT is `INTERVIEW.md`.
18. Do not grow root `CATALOG.md` (MEMORY 24 KB budget). Site: surgical edit of the existing `docs/index.html` `testingModel` FAQ/card plus one additive line in `ws-spec-to-pr/docs/faq.md` Modes. No package version bump unless the release PR already owns it.

### Security / safety

- Model ids are opaque portable strings already used by hosts. Do not interpolate them into shell.
- Do not persist absolute machine paths. `workflow_state.cjs` `atomicWrite` must keep Windows `fsync` `EPERM`/`EINVAL` ignore (MEMORY). Do not touch that function except to keep the ignore.
- Consumer `config.json` stays gitignored; ship `config.json.example` + schema only.

## 1. Definition of Ready & Scope

### Ready evidence

- Canonical spec: `.agents/plans/models-preset-and-per-step/step-00-models-preset-and-per-step.spec.md` (mirrors `{specsDir}/models-preset-and-per-step.spec.md`)
- Classification: standard orch, complex (15 ACs, 11 files, 3 layers); interview required; `shared_understanding: confirmed` (autoMode End-refinement)
- Stack: Node 22 skill package (`config.json` → `stack.id: node-skills-package`); layers `skills-sot`, `installer-cli`, `tests`. Frontend/database: none. Tenancy/i18n: none.
- MEMORY consulted: `update_state model config: no state_path parents chain` (Medium); Windows fsync EPERM; Node port tests must migrate with runtime recipes; CATALOG.md 24 KB context budget; Upstream dogfood contract inlined in root AGENTS.md (do not add a skill SoT)
- Related completed specs: `testing-executor-model.spec.md` (Step 7 executor; lite does not apply `testingModel`; Step 3 remains `reviewerModel`); `auto-mode-model-preferences` (non-blocking switch failure; session stays `currentModel`)
- Patterns: `{sharedDir}/backend.md` and `frontend.md` absent; templates empty. No UI/API entities. No fable-domain bind (no IaC/K8s/Docker; GitHub Actions YAML is CI, not a domain adapter signal)
- Prior work: `testing-executor-model` / PR #200. No open PR for `modelsPreset`. Do not overload the testing-executor-model tests; add a sibling file and keep Step 7 assertions green
- Installer: `bin/cli.js` / `CONSUMER_OWNED_FILES` already never overwrite `config.json` (AC9)

### In scope

| Area | Files |
|------|--------|
| Schema / example | `{sharedDir}/config.schema.json`, `{sharedDir}/config.json.example` |
| Resolver | `{sharedDir}/scripts/workflow_state.cjs`; `{skillsRoot}/ws-spec-to-pr/scripts/update_state.py`; `{skillsRoot}/ws-spec-to-pr-lite/scripts/update_state.py` |
| Standard orch docs | `STEP-DISPATCH.md`, `PROTOCOLS.md`, `ws-spec-to-pr/SKILL.md`, `ws-spec-to-pr/README.md`, `protocols/state-hygiene.md` (`--substep` on dispatch/finish); one additive Modes line in `ws-spec-to-pr/docs/faq.md` |
| Shared docs | `{sharedDir}/tools.md`, `{sharedDir}/gates.md` session-model banner |
| Lite orch | `ws-spec-to-pr-lite/SKILL.md` (lite mapping + ignore list including `reviewFix`) |
| Interview | `ws-configure-project/INTERVIEW.md` only |
| Hub capability copy | Root `AGENTS.md` dual-mode session-model bullet; `FEATURES.md` per-phase paragraph; surgical `docs/index.html` existing testingModel FAQ/card (harness change protocol; not a new FEATURES section; not `CATALOG.md`) |
| Tests / ship | `test/test-models-preset-and-per-step.js`; `package.json` `tests` / `tests:remote` scripts; integrity generate at ship |

### Out of scope (spec + interview)

- Changing orchestrator-on-`currentModel` / Pause → host → Resume
- Host-private model marketplaces or auto-download
- Renaming skill folders
- Migrating consumer configs on `update`
- Editing gitignored dogfood `{sharedDir}/config.json` (optional after ship; not an AC)
- New runtime npm dependencies, host-only tool IDs, or extra dogfood `SKILL.md`
- `resolve-model` CLI positional; `ws-testing/SKILL.md`; `ws-configure-project/SKILL.md`; root `CATALOG.md`; package version bump

### Measurable ACs

AC1–AC15 as in the spec. Every AC has ≥1 §3 step and ≥1 §5 named test.

## 2. Technical Design & Architecture

### Layers (`config.json.stack.backend.layers`)

| Layer | Path | This change |
|-------|------|-------------|
| skills-sot | `.agents/skills` | Schema, example, `workflow_state.cjs`, orch/lite docs, interview, tools/gates, Python resolvers |
| installer-cli | `bin` | Integrity manifest regenerate at ship (`bin/skill-integrity.json`). No CLI flag changes. `docs/index.html` FAQ card (site, not a new CLI) |
| tests | `test/` | New focused test file + wire into `npm run test` |

Frontend layer: none. Database: none. Invariants that apply: `commitPlanFilesOnlyAtStep8: true` (this plan file is not a product commit). EF/tenancy invariants are N/A. Scenario probes (soft-deletion, concurrency, list sizing, rate limits): N/A (no entities, no API, no lists).

### Config shape (normative)

Keep phase keys. Add:

- `defaults.modelsPreset`: string (not enum)
- `defaults.modelPresets`: map of objects with optional `plannerModel` / `executionModel` / `reviewerModel` / `testingModel` and optional `steps` string map
- `defaults.stepModels`: string map (numeric `"0"`–`"9"` plus `dag`, `scoreAndRefine`, `reviewFix`)

Shipped `config.json.example` must include presets `default` (all `"current"`), `cursor`, `deepseek`, `opencode`, and `cheap`, plus an empty or commented `stepModels` block that names keys `0`–`9`, `dag`, `scoreAndRefine`, `reviewFix`. `_comment_models` must state resolve order, the `"current"` token, empty-string fallthrough, unknown-preset fallback, and the lite ignore list (`testingModel`, `dag`, `scoreAndRefine`, `reviewFix`). Keep four phase keys as `""`.

`defaults` in `config.schema.json` currently has no `additionalProperties: false` (root `additionalProperties: true`). Still **define** the new keys (AC1). Do not enum preset names. Do not require the new keys. Do not add a JSON Schema `default` that copies another property.

### Resolve order (standard `dispatch-agent`)

For step `N` and optional role (`dag` \| `scoreAndRefine` \| `reviewFix` \| none):

0. If CLI / orch `--model` is a non-empty string (after `.strip()` / JS trim), use it (existing helper behavior). Blank / omitted → continue.
1. If `defaults.stepModels[role]` or `defaults.stepModels["N"]` is a non-empty string → use it (role wins when both set). Unknown role / unknown `--substep` → skip the role lookup; still consider numeric `"N"`.
2. Else if active preset `steps[role]` or `steps["N"]` is non-empty → use it.
3. Else if the corresponding **top-level** phase key on `defaults` is non-empty → use it (legacy override of the preset phase key).
4. Else if the active preset’s phase key for that dispatch is non-empty → use it.
5. If the selected value is `"current"` → session `currentModel` (stop; no further fallthrough).
6. Else if still empty → session `currentModel`.
7. On host switch failure / unsupported id → keep session `currentModel`; do not STOP.

**Step 7 corresponding phase key** is a two-key chain, not `testingModel` alone (AC6, `49f231c`, current Python `resolve_phase_model`):

- After layers 1–2 miss: nonempty top-level `testingModel` → else preset `testingModel` → else top-level `executionModel` → else preset `executionModel` → else session.
- `"current"` on a selected testing key resolves to session and does **not** continue to `executionModel`.

**Active preset:** `defaults.modelsPreset` when it names an existing `modelPresets` key; else `"default"` if that key exists; else no preset (legacy four keys only).

Lookup keys are strings (`String(step)`). Treat whitespace-only as empty (same as today’s `.strip()`).

**Interview / Step 2:** no role. Use numeric `"2"` only.

### CJS successor vs Python

`performUpdate` in `workflow_state.cjs` today: `state.currentModel = options.model || state.currentModel`. It never reads phase keys. Implement:

- `resolvePhaseModel(defaults, { step, role, pipeline, sessionModel })` using `context.config.defaults` from `resolveConsumerContext` (already the consumer hub: `config.json` then `config.json.example`; not `.agents/ws-shared`).
- On `dispatch` / `finish`, if `--model` is blank, set the recorded model from `resolvePhaseModel`. Pass `--substep` through existing `parseArgs` (camelCase `substep`). `pipeline` comes from the wrapper (`standard` vs `lite`), not a new CLI flag.
- Export `resolvePhaseModel` on `module.exports` for unit tests (`createRequire`). Keep existing exports.
- Do not add a second Python-only config probe. Do not add a `resolve-model` operation to `runUpdateCli` (positional remains `operation, stateFile`).

Python: extend `resolve_phase_model(step, provided_model, fallback_model, role=None, pipeline=None)` (or equivalent kwargs). Load defaults only when not passed in (tests may inject a dict). Keep the three-arg call working. Add `--substep`. Keep `shared_dir(resolve_repo_root(script_file=__file__))` candidates (`config.json` then `config.json.example`). Do not reintroduce `state_path` parent chains. Lite pipeline mapping is the lite function body, not a shared standard table.

Do not teach Python to spawn Node. Duplicate the algorithm; fixture tests cover both.

### Orchestrator dispatch sites (docs, not new orch runtime)

Standard orch is agent-driven. Update STEP-DISPATCH / PROTOCOLS / SKILL.md / README.md so each `dispatch-agent` call passes the resolved host id:

| Dispatch | Role | Default bucket |
|----------|------|----------------|
| Steps 0–3 | none | `plannerModel` |
| Step 4 sequential (`enableDag: false`) | none | Step `4` / `executionModel` (no required `dag` key) |
| Step 4 DAG workers (`enableDag: true`) | `dag` | `executionModel` unless overridden |
| Step 5 verify | none | `reviewerModel` |
| Step 5 `scoreAndRefine` re-implement | `scoreAndRefine` | `executionModel` unless overridden |
| Step 6 review | none | `reviewerModel` |
| Step 6 review-fix implement | `reviewFix` | `executionModel` unless overridden |
| Step 7 | none | `testingModel` → `executionModel` → session (after step/preset `steps` overrides; see chain above) |
| Steps 8–9 | none | no required switch; if dispatched, `stepModels["8"|"9"]` or session |

`tools.md` portable parameterization stays: pass the identifier on `dispatch-agent` when the host exposes a model field; else `Model: {modelName}` in the dispatch header. Non-blocking fallback paragraph stays.

`state-hygiene.md`: document optional `--substep {role}` on dispatch/finish. `--model` remains the recorder field the orch usually fills after resolving; blank `--model` backfills from `resolvePhaseModel`.

Lite docs: resolve for telemetry / `{targetSubagentModel}` banner only; do not switch the inline session.

### Interview (`ws-configure-project`)

Under `defaults` / `--section defaults`, **before** the four phase keys (`INTERVIEW.md` only):

1. Pick `modelsPreset` from shipped sample names plus **Custom…** / **Keep current** / **Skip** (Recommended: `default` or host-detected sample, not a product-branded requirement).
2. Optional per-step / role overrides → `stepModels` (skippable; empty strings).
3. Advanced: edit legacy phase keys as overrides of the active preset (keep today’s “empty = fall through” recommendation for `testingModel`).

Detection heuristic: if the session host exposes identifiers, offer them as preset field values, not as a closed schema enum. Mention `"current"` and unknown-preset fallback.

### Patterns

No backend.md / frontend.md project rules. Follow portable skill authoring: en-us, `{sharedDir}` tokens in recipes, no host product names in skill bodies.

## 3. Step-by-Step Plan

Dependency order. Do not implement in this Step 2 session.

### Step 1 — Schema (AC1)

**Action:** Add `defaults.modelsPreset` (string), `defaults.modelPresets` (object `additionalProperties` of preset objects with optional four phase keys + optional `steps` string map), `defaults.stepModels` (object `additionalProperties: { type: string }`). Keep existing four phase keys and their descriptions (Step 7 / Steps 5–6 wording). Do not enum preset names. Do not require the new keys.

**Files:** `.agents/skills/ws-shared/config.schema.json`

**Checks:** Schema still parses; `additionalProperties` on preset map allows custom names; legacy keys remain optional strings.

### Step 2 — Example config (AC2, AC9 documentation)

**Action:** In `defaults`, add `_comment_models` describing resolve order, `"current"`, empty-string fallthrough, unknown-preset fallback, and lite ignore list (`testingModel`, `dag`, `scoreAndRefine`, `reviewFix`). Add `modelsPreset`, `modelPresets` samples `default`, `cursor`, `deepseek`, `opencode`, and `cheap` (canonical spec JSON). Empty `stepModels` with keys `0`–`9`, `dag`, `scoreAndRefine`, `reviewFix`. Keep four phase keys as `""`. Do not add installer rewrite logic.

**Files:** `.agents/skills/ws-shared/config.json.example`

**Checks:** JSON parses (comments are `_comment*` keys already allowed). Example is documentation only; omitted keys in a consumer file remain valid (AC9).

### Step 3 — Canonical resolver in `workflow_state.cjs` (AC3–AC11, AC14 algorithm)

**Action:** Implement and export `resolvePhaseModel`. Wire `performUpdate` to use it when `--model` is blank. Accept `--substep` (already parsed). Load defaults from `context.config` (`resolveConsumerContext`). Coerce step keys to strings. Implement active-preset selection and the seven-layer order plus the Step 7 testing→execution chain. `"current"` → session. Role phase buckets per §2. Unknown `--substep` → no role. Do not add a `resolve-model` positional. Do not touch `atomicWrite` fsync handling.

**Files:** `.agents/skills/ws-shared/scripts/workflow_state.cjs`

**Checks:** Module exports the function. `--repo-root` fixture with only `config.json.example`-style defaults does not look up `.agents/ws-shared`. Existing dispatch/finish contract tests still pass.

### Step 4 — Python `resolve_phase_model` standard + lite (AC6, AC11, AC13)

**Action:** Port the same order. Standard mapping as today plus roles. Lite mapping 0–1 / 2 / 3 / 4–5; ignore `testingModel`, `dag`, `scoreAndRefine`, and `reviewFix`. Add `--substep`. Keep `shared_dir(resolve_repo_root(script_file=__file__))` candidates (`config.json` then `config.json.example`). Do not reintroduce `state_path` parent chains. Optional injected `defaults` for unit tests without breaking the three-arg call.

**Files:** `.agents/skills/ws-spec-to-pr/scripts/update_state.py`, `.agents/skills/ws-spec-to-pr-lite/scripts/update_state.py`

**Checks:** `test-node-helper-ports.js` still sees both Python files. Frozen helpers remain on disk. Lite never applies `testingModel` or `reviewFix`.

### Step 5 — Standard orch dispatch docs (AC7, AC8, AC12)

**Action:** Replace the coarse-only sentence in `STEP-DISPATCH.md` (and matching `PROTOCOLS.md` Model readiness, `ws-spec-to-pr/SKILL.md` mode-flags bullet, `ws-spec-to-pr/README.md` Model selection) with: presets + `stepModels` + roles; orch passes resolved id into `dispatch-agent` and `--model` / `--substep` into `update_state.cjs`. Explicit DAG vs sequential Step 4. Explicit `scoreAndRefine` / `reviewFix` roles. Keep orchestrator-on-`currentModel` and non-blocking switch failure. `state-hygiene.md`: document `--substep` as optional on dispatch/finish. `docs/faq.md` Modes: one additive sentence that Step 7 still uses the testing→execution chain **after** preset/`stepModels` overrides (do not rewrite the FAQ).

**Files:** `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md`, `PROTOCOLS.md`, `SKILL.md`, `README.md`, `protocols/state-hygiene.md`, `docs/faq.md`

**Checks:** Existing `test-testing-executor-model.js` strings for Steps 5–6 `reviewerModel` and Step 7 `testingModel` remain true (additive wording). DAG workers mentioned only when `enableDag: true`.

### Step 6 — Shared tools + gates banner (AC5, AC12, AC14)

**Action:** `tools.md` § Subagent model preferences: document `modelsPreset` / `modelPresets` / `stepModels` / `"current"` / resolve order; lite still inline (telemetry only). `gates.md` banner copy: `{targetSubagentModel}` is the resolved subagent (or lite telemetry) model including preset/step/role; session line unchanged; no in-gate model picker.

**Files:** `.agents/skills/ws-shared/tools.md`, `.agents/skills/ws-shared/gates.md`

**Checks:** Banner still two lines (session + subagent). No Switch-model menu.

### Step 7 — Lite orch docs (AC13)

**Action:** Update `ws-spec-to-pr-lite/SKILL.md` Auto Mode Models: ignore `testingModel`, `dag`, `scoreAndRefine`, and `reviewFix`; apply `stepModels` `0`–`5` when set (telemetry/banner only); phase buckets 0–1 / 2 / 3; 4–5 session unless step override. Lite Step 3 review-fix stays on the Step 3 / `reviewerModel` bucket. Do not introduce `dispatch-agent` into lite.

**Files:** `.agents/skills/ws-spec-to-pr-lite/SKILL.md`

**Checks:** Invariant 2 (inline, no subagent dispatch) unchanged. `test-testing-executor-model.js` lite `testingModel` grep remains true.

### Step 8 — Configure-project interview (AC12)

**Action:** INTERVIEW.md detection + interview order: preset pick, then optional `stepModels`, then advanced four phase keys. Mention `"current"` and unknown-preset fallback. Do **not** change `ws-configure-project/SKILL.md` (it does not enumerate model keys today).

**Files:** `.agents/skills/ws-configure-project/INTERVIEW.md`

**Checks:** Four phase keys still offered as advanced overrides, not removed.

### Step 9 — Hub / FEATURES / site FAQ (AC12 docs sync, AC15 harness)

**Action:** Root `AGENTS.md` dual-mode **Session model** bullet: mention presets + per-step/substep keys still apply only to standard `dispatch-agent`. `FEATURES.md` § Configuration surface: extend the `defaults` row and the per-phase paragraph with preset + step map, without claiming session switching. Do not invent a new FEATURES section. Do not edit `CATALOG.md`. Surgical `docs/index.html`: extend the existing `testingModel` FAQ/card search terms + one sentence that presets/`stepModels` participate before that bucket (no new feature card required). Do not bump package version.

**Files:** `AGENTS.md`, `FEATURES.md`, `docs/index.html`

**Checks:** Hub and FEATURES stay aligned on “session = currentModel; subagent = resolved preference”. `ws-shared/AGENTS.md` has no session-model bullet today; do not add a duplicate.

### Step 10 — Focused tests (AC1–AC14)

**Action:** Add `test/test-models-preset-and-per-step.js` (schema/example surface + `resolvePhaseModel` matrix + Python spawn or injected-defaults + docs greps + lite ignore). Wire into `package.json` `tests` and `tests:remote` next to `test-testing-executor-model.js`. Update `test-testing-executor-model.js` only if a wording assertion would fail; prefer additive docs. Cover MEMORY temp-consumer path (CJS `--repo-root`).

**Files:** `test/test-models-preset-and-per-step.js`, `package.json`; maybe `test/test-testing-executor-model.js`

**Checks:** `node test/test-models-preset-and-per-step.js` green; existing testing-executor tests green.

### Step 11 — Integrity and package test (AC15)

**Action:** After hashed skill edits: `npm run generate-integrity` then `npm run verify-integrity`. Run `npm run test` (includes harness-efficiency). `ws-check-harness` on the ship commit. Do not bump version in this feature unless the release PR already owns a bump. If `docs/index.html` was hand-edited, do not run `build-site:bump`; leave the surgical FAQ edit.

**Files:** `bin/skill-integrity.json` (generated)

**Checks:** `verify-integrity` exit 0; `npm run test` exit 0.

### AC → plan step map

| AC | Plan steps |
|----|------------|
| AC1 | 1 |
| AC2 | 2 |
| AC3 | 3, 4 |
| AC4 | 3, 4 |
| AC5 | 3, 4, 6 |
| AC6 | 3, 4, 5 |
| AC7 | 3, 5 |
| AC8 | 3, 5 |
| AC9 | 2, 3, 4 |
| AC10 | 3, 4 |
| AC11 | 3, 4 |
| AC12 | 5, 6, 8, 9 |
| AC13 | 4, 7 |
| AC14 | 3, 5, 6, 10 |
| AC15 | 10, 11 |

## 4. Permissions, Tenancy & i18n

Not applicable. This package has no RBAC, no tenancy field, and frontend `i18n.framework: none`. No new user-facing strings beyond en-us skill/docs/interview copy. Interview labels stay en-us. Do not add locale files.

## 5. Test Coverage

Primary file: `test/test-models-preset-and-per-step.js` (new). Import `resolvePhaseModel` via `createRequire` from `workflow_state.cjs`. Keep `test/test-testing-executor-model.js` as the Step 7 / reviewer range regression suite.

| AC | Test (file / method or assertion name) | Proves |
|----|----------------------------------------|--------|
| AC1 | `assertSchemaDefinesModelsPresetModelPresetsStepModels` | Schema types; four phase keys still present; new keys not required |
| AC2 | `assertExampleShipsDefaultCursorAndOpencodeStylePresets`; `assertExampleDocumentsStepModelsNumericAndRoles` | `default` all `"current"`; `cursor`; `deepseek` and `opencode` and `cheap`; `stepModels` keys documented |
| AC3 | `resolvePresetPhaseKeysWhenTopLevelEmpty` | `modelsPreset: "cursor"` + empty top-level phase keys → preset `plannerModel` for step 1 |
| AC4 | `resolveStepModelsRoleWinsOverNumericAndPresetSteps` | Non-empty `stepModels.dag` wins over preset `steps.dag` and `executionModel` |
| AC5 | `resolveCurrentTokenReturnsSessionModel` | `"current"` at preset or top-level → `sessionModel`; no throw; `"current"` testingModel does not fall through to execution |
| AC6 | `resolveStep7TestingThenExecutionThenSession` | testing → execution → session after step/preset overrides, including top-level then preset layers for each key |
| AC7 | `resolveDagRoleUsesExecutionChain`; `assertEnableDagFalseDocsSkipDagKey` | Role `dag` uses dag/step4/execution chain; docs: sequential Step 4 does not require `dag` |
| AC8 | `resolveScoreAndRefineUsesExecutionBucket`; `resolveReviewFixUsesExecutionBucket` | Roles do not inherit Step 5/6 `reviewerModel` |
| AC9 | `resolveLegacyFourKeysWhenPresetKeysOmitted` | No `modelPresets` / `modelsPreset` / `stepModels` → today’s buckets |
| AC10 | `resolveUnknownPresetFallsBackToDefaultThenLegacy` | Unknown name → `default` if present else four keys / session; no throw |
| AC11 | `assertCjsResolverUsesResolveConsumerContext`; `assertPythonResolvePhaseModelUsesSharedDir`; `assertNoAgentsWsSharedCandidate` | CJS + both Python helpers; grep forbids `.agents/ws-shared` candidates; `--repo-root` / cwd fixture |
| AC12 | `assertStepDispatchToolsGatesInterviewDocumentPresetsAndCurrent` | `STEP-DISPATCH.md`, `tools.md`, `gates.md`, `INTERVIEW.md` mention presets, `"current"`, per-step/substep |
| AC13 | `resolveLiteIgnoresTestingDagScoreAndRefine`; `resolveLiteIgnoresReviewFix`; `resolveLiteStepModelsZeroToFiveApply`; `assertLiteSkillDocumentsIgnoreList` | Lite pipeline mapping; SKILL.md strings include `reviewFix` on the ignore list |
| AC14 | `assertSwitchFailureRemainsNonBlockingInDocs`; focused matrix in AC3–AC6, AC10 | Docs still say keep `currentModel` on switch failure; unit matrix for preset, step override, `"current"`, Step 7, unknown preset |
| AC15 | `assertPackageJsonTestsIncludeModelsPresetFile` plus ship commands | New test is in `package.json` `tests`; ship: `npm run generate-integrity`, `npm run verify-integrity`, `npm run test` |

Do not require `run_sabotage.py` (feature expansion, not a defect-class AC). Mutation unset in this repo (`skipMutationTesting: true`).

## 6. Invariants (Do Not Violate)

From `config.json.invariants` and harness MEMORY:

- `commitPlanFilesOnlyAtStep8: true` — do not commit `{plansDir}` in implement steps.
- `skipQualityGates: false` — do not add a skip for this feature.
- Orchestrator session always `currentModel` (Pause → host → Resume). No in-gate model picker (`gates.md`).
- Subagent preferences never STOP the workflow on switch failure.
- Config path: `{sharedDir}/config.json` via `resolve_consumer_root` / `resolveConsumerContext`. **DO NOT** derive hub from `state_path` parents or restore cwd-only-only probes without `--repo-root` / cwd hub. **DO NOT** use `.agents/ws-shared`.
- Python helpers remain on disk (`test-node-helper-ports.js`). CJS is the orch call surface.
- Lite: no `dispatch-agent`; `workflowType` isolation; do not apply `testingModel`, `dag`, `scoreAndRefine`, or `reviewFix`.
- `defaults.stepModels` (config map) ≠ state telemetry `stepModels` list. Do not conflate or rename the state field.
- `modelsPreset` (selector) ≠ `modelPresets` (map).
- Portable vocabulary only (`dispatch-agent`, `user-gate`). No host product APIs in skill bodies.
- `workflow_state.cjs` `atomicWrite`: keep best-effort `fsync` ignoring `EPERM`/`EINVAL`.
- When changing the update_state runtime recipe, migrate focused tests in the same batch (MEMORY Node port tests).
- Do not rewrite consumer `config.json` on install/update.
- Do not edit `{globalSkillsRoot}/ws-*` from this package root.
- Do not grow `CATALOG.md` over 24000 B UTF-8 LF (MEMORY).
- Do not recreate a dogfood `SKILL.md` under `.agents/skills/` (MEMORY). Refresh root `AGENTS.md` session-model bullet only.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (`skills-sot` / `bin` integrity / `test` / surgical `docs/index.html`; no unrelated refactors).
- [ ] Domain entities and mappings encapsulated (N/A — no domain entities).
- [ ] Schema migrations created (N/A — JSON Schema additive keys only; no DB).
- [ ] Authorization checks applied (N/A — no RBAC).
- [ ] i18n keys declared (N/A — en-us docs/interview only).
- [ ] Test cases cover all ACs (`test/test-models-preset-and-per-step.js` + existing testing-executor file still green).
- [ ] MEMORY path contract: resolver uses `shared_dir` / `resolveConsumerContext`.
- [ ] Lite ignore list documented and tested (`testingModel`, `dag`, `scoreAndRefine`, `reviewFix`).
- [ ] `package.json` `tests` includes the new file.
- [ ] Hashed skills changed → `npm run generate-integrity` && `npm run verify-integrity`.
- [ ] `npm run test` exit 0; `ws-check-harness` 0 critical on the ship commit.
- [ ] FEATURES.md + root AGENTS.md session-model bullet updated if shipped capability text changed.
- [ ] Dogfood `{sharedDir}/config.json` untouched. `ws-testing/SKILL.md` untouched. `CATALOG.md` untouched.

## 8. Open Questions

None remaining. Interview autoMode round 1 closed every §8 item from project evidence (see ## Interview registry). Implementers must follow §0 bindings; do not re-open these choices.

Closed (was draft §8):

1. Lite `reviewFix` → ignore (standard-only role); lite review-fix uses Step `3` / `reviewerModel` / `stepModels["3"]`.
2. Shipped samples → `default`, `cursor`, `deepseek`, `opencode`, `cheap`.
3. Orch helper CLI → export + auto-resolve when `--model` is blank; no `resolve-model` positional.
4. Dogfood `{sharedDir}/config.json` → leave as-is.
5. `ws-testing/SKILL.md` → leave (orch supplies already-resolved id).

Non-questions (already bound in §0): `--model` highest override; `"current"` token; unknown preset fallback; no consumer config migration; no session switch; CJS as algorithm SoT with Python port; config vs state `stepModels` namespaces.

## Interview registry

| id | class | section | gap | status | resolution | resolutionSource | evidence | dependsOn |
|----|-------|---------|-----|--------|------------|------------------|----------|-----------|
| G1 | blocking | §8 Q1 / §0.8 / AC13 | Lite `reviewFix` unspecified; AC13 ignore list names only `testingModel`, `dag`, `scoreAndRefine` | closed | Ignore `reviewFix` on the lite pipeline (same class as `dag` / `scoreAndRefine`). Lite Step 3 review-fix stays on Step `3` / `reviewerModel` / `stepModels["3"]`. Document it on the lite ignore list without changing AC13 MUST text. | project | AC13 + lite table omit `reviewFix` as a lite role; `ws-spec-to-pr-lite/SKILL.md` Invariant 2 (inline, no `dispatch-agent`); Auto Mode Models maps whole Step 3 to `reviewerModel`; Steps index Step 3 = `ws-code-review` (+ fix) in one inline step; `testing-executor-model` AC7 “Lite Step 3 remains `reviewerModel`” | |
| G2 | blocking | §2 resolve order / AC6 | Numbered layers 3–4 could skip `executionModel` when both testing keys are empty | closed | After layers 1–2: top-level `testingModel` else preset `testingModel` else top-level `executionModel` else preset `executionModel` else session. `"current"` on testing stops (no execution fallthrough). | project | Spec AC6; `testing-executor-model` AC3; `ws-spec-to-pr/scripts/update_state.py` `resolve_phase_model` step 7 (`testingModel` then `executionModel`); STEP-DISPATCH “Step 7 resolve”; commit `49f231c` | |
| G3 | non-blocking | §8 Q2 / AC2 | Ship AC2 minimum vs spec canonical five-name JSON | closed | Ship `default`, `cursor`, `deepseek`, `opencode`, and `cheap`. AC2 tests stay a floor (`deepseek` and/or `opencode`). | project | Spec Description canonical JSON lists all five; Original Issue names `cheap` \| `cursor` \| `opencode`; AC2 MUST is the minimum set | |
| G4 | non-blocking | §8 Q3 / CJS CLI | Extra `resolve-model` positional vs export + blank `--model` | closed | Export `resolvePhaseModel`; auto-resolve when `--model` is blank. No new positional. `parseArgs` already camelCases `--substep`. | project | `workflow_state.cjs` `runUpdateCli` positional = `operation, stateFile`; `update_state.cjs` wrappers are one-liners; orch is agent-driven (`STEP-DISPATCH.md`); AC11 successor helper, not a new CLI verb | |
| G5 | non-blocking | §8 Q4 / Notes | Whether to switch this repo’s live four keys to a preset | closed | Leave gitignored dogfood `config.json` as-is. Not an AC. | project | Spec Notes: “Dogfood upstream `config.json` may adopt a preset after ship; not required”; draft plan out of scope; `bin/cli.js` never overwrites consumer `config.json` | |
| G6 | non-blocking | §8 Q5 / AC12 | `ws-testing/SKILL.md` restates testing→execution→session | closed | Leave the file. Orch supplies the already-resolved id; skill does not pick. | project | AC12 file list omits `ws-testing`; `testing-executor-model` AC8; `test/test-testing-executor-model.js` greps `resolved test-executor` OR `testingModel` | |
| G7 | non-blocking | Spec Description vs role enum | “interview refine” listed as a substep but roles are only `dag` \| `scoreAndRefine` \| `reviewFix` | closed | No `interview` role. Step 2 uses numeric `stepModels["2"]` / preset `steps["2"]` (spec example already has `"2"`). | project | Spec resolve-order role union; canonical JSON `steps["2"]`; lite/standard interview is Step 2, not a sub-dispatch | |
| G8 | non-blocking | `--substep` / AC10 | Unknown role or extra `stepModels` keys | closed | Unknown `--substep` → no role (still use numeric `"N"`). Extra map keys ignored. Never throw. | assumed-default | Aligns with AC10 never-hard-fail and switch-failure non-blocking; schema `additionalProperties` on maps | G2 |
| G9 | non-blocking | AC12 vs INTERVIEW.md / SKILL.md | Plan allowed an optional configure-project SKILL.md one-liner | closed | INTERVIEW.md only. `ws-configure-project/SKILL.md` `--section defaults` does not enumerate the four phase keys today. | project | AC12 names the interview; `INTERVIEW.md` order item 7; SKILL.md Rules mention delivery artifacts only | |
| G10 | non-blocking | Harness protocol / MEMORY | Site FAQ + CATALOG sync if FEATURES changes | closed | Surgical `docs/index.html` existing testingModel FAQ/card + one `docs/faq.md` Modes line. Do not grow `CATALOG.md`. No `build-site:bump`. | project | Root `AGENTS.md` harness change protocol; MEMORY `CATALOG.md 24 KB context budget`; `docs/index.html` already has a testingModel FAQ item; `bin/build-site.js` reads FEATURES/CATALOG but FAQ HTML is hand-maintained | |
| G11 | non-blocking | §0.5 / AC8 | Whether empty role key inherits `stepModels["N"]` (reviewer) for `scoreAndRefine` | closed | Keep spec-literal: role wins when both set; if role key empty, numeric `"N"` still applies at layer 1; layers 3–4 still use the **role** phase bucket (`executionModel`), not reviewer. | project | Spec resolve order item 1; draft binding 5 | |
| G12 | non-blocking | §4 / scenario probes | Soft-deletion, concurrency, list sizing, rate limits | closed | N/A. No entities, API, lists, or shared mutable store. No extra controls. | project | `config.json` `database.type: none`; `domain.tenancyField: ""`; STACK.md frontend none | |
| G13 | non-blocking | Hub dual-mode | Whether to add a session-model bullet to `ws-shared/AGENTS.md` | closed | Update root `AGENTS.md` only (existing dual-mode bullet). Shared hub has no session-model paragraph today. | project | Root `AGENTS.md` Dual-mode Session model; `ws-shared/AGENTS.md` grep: no `plannerModel` / `currentModel` | |
