### [2026-08-28] Lite steps 2-5 must stay empty in cursor seed
- **Layer**: Pipeline
- **Module**: modelPresets / resolvePhaseModel
- **Severity**: High
- **PathPattern**: **/ws-shared/config.json.example;**/test-models-preset-and-per-step.js
- **Scenario / Context**: Filling numeric steps 2–5 in default/cursor presets makes lite resolve planner/reviewer models for implement/review/ship telemetry because resolveStepOverride runs before litePhaseKey.
- **DO NOT**: Ship a full 0–9 filled steps map for the cursor/default presets when lite shares the same numeric keys with different semantics.
- **INSTEAD DO**: Omit steps maps from presets entirely (lean phase-key bundles; the default preset is all current). Numeric and role overrides belong in top-level stepModels only, so lite keeps its phase fallthrough (2 execution, 3 reviewer, 4-5 session) while standard resolves via phase keys.
