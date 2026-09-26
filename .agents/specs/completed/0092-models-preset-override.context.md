# Feature Boundary

`0092-models-preset-override` introduces an invocation parameter (`preset=<name>`, `--preset=<name>`, or `--preset <name>`) to override the active `modelsPreset` for `ws-spec-to-pr` and `ws-spec-to-pr-lite` workflows.

In scope:
- Parsing `preset=<name>`, `--preset=<name>`, and `--preset <name>` during bootstrap in `setup.md` §2.
- Precedence rule: explicit invocation parameter overrides `defaults.modelsPreset` from `{sharedDir}/config.json`.
- State persistence: recording `modelsPreset` in `{workflow-id}.state.json` and `{workflow-id}.state.md` frontmatter so resume retains the override.
- Schema update: adding optional `modelsPreset` string property to `workflow-state.schema.json`.
- Script support: allowing `--preset <name>` in `workflow_state.cjs` (and CLI `update_state.cjs`).
- Banner reporting: displaying resolved `modelsPreset` and override origin in Step 3 Init banner.
- Graceful fallback: warning and falling back to `config.json` default preset or preset `"default"` on unknown names without crashing.
- Documentation & tests: updating skill contracts, README, setup docs, and test suites.

Out of scope:
- Modifying the rule that orchestrator sessions always execute under `currentModel`.
- Passing raw JSON model bundles on the command line.
- Changing `stepModels` precedence (role and numeric step overrides still take precedence over preset values).
- Rewriting consumer `config.json` files on disk.

# Implementation Decisions

1. **Parameter syntax:** Support both `preset=<name>` (matching common workflow invocation style like `auto`, `dry-run`, `full`) and standard CLI options `--preset=<name>` / `--preset <name>`. **Rationale:** Developers invoke workflows via conversational prompts and slash commands; supporting both forms prevents syntax friction.

2. **State persistence across resume:** Persist the resolved preset in `state.modelsPreset` within `{workflow-id}.state.json` and `.state.md`. **Rationale:** In interactive mode, workflows pause across step boundaries and sessions. Without persistence in state, a resumed workflow would lose the override and revert to `config.json`'s default preset at Step 1 or Step 4.

3. **Unknown preset handling:** When a developer provides `preset=unknown-name` that does not exist in `defaults.modelPresets`, log a warning in telemetry and the Init banner and fall back to `defaults.modelsPreset` (or preset `"default"`, then legacy phase keys / session model). **Rationale:** Consistent with spec 0039 AC10 — unknown model presets must never hard-fail workflow initialization.

4. **Dual-mode parity:** `ws-spec-to-pr-lite` parses and records the preset in state and telemetry, applying it to phase buckets (0–1 planner, 2 execution, 3 reviewer), while maintaining its core invariant of inline execution under `currentModel` without subagent dispatch.

# Deferred Ideas

- Interactive preset picker in `ws-configure-project` when launching a new run.
- Dynamic temporary model aliases defined via environment variables.
