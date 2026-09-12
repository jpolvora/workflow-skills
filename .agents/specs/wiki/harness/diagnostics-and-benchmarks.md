# Diagnostics & Benchmarks (`harness` — part 2)

## Feature Overview

Harness health is observable without running a delivery: `ws-doctor` (read-only diagnostic inspector with `--skill` scoping and a machine-parseable `--json` stdout contract), `ws-check-harness` (Phases 0–5c integrity auditor over routing, links, portability, digests, duplication, and topology), and `ws-check-workflows` (FSM simulation over step continuity, state isolation, and provider dispatch) form the verification chain, with `ws-benchmarks` managing frozen-fixture evolution reports on explicit invoke only. `ws-cleanup` removes disposable leftovers behind a `user-gate`; an opt-in runtime audit wrapper observes deliveries and proposes upstream issues without mutating them. Host capability binding probes the active host once per workflow and caches portable tool aliases.

## Business Rules & Logic

- **Read-only first**: `ws-doctor` edits nothing and runs path/script/reference checks even without config (reporting config-unavailable + recommending `ws-configure-project`); it never replaces check-harness phases or `ws-show-harness`.
- **Single JSON on stdout**: `doctor.js --json` emits exactly one JSON object on stdout; warnings/usage go to stderr; skill-local ESM marker keeps copied installs loadable without touching root `package.json`.
- **Normative singles**: duplicated normative blocks fail `ws-check-harness`; path recipes resolve consumer hub from `--repo-root`/cwd probe (never `__file__`), expand `{skillsRoot}` local-first, and keep `{sharedDir}`/`{skillsRoot}` independent.
- **Autoload is explicit**: effective `autoload` is false unless explicitly true; when true the consumer root `AGENTS.md` must exist and delegate to `autoload.md`, else the harness fails closed; the installer never creates root files.
- **Benchmarks never auto-run**: `ws-benchmarks` acts only on explicit invoke with a six-action gate (View Evolution Report recommended); static runs are fully scripted with no product writes, live runs are sandboxed with `dryRun` and no push/PR; regressions fail compare.
- **Audit is observer-only**: zero overhead when `defaults.enableAuditing` is false; end-of-run findings propose an upstream issue through `user-gate` and never auto-file or block completion alone.
- **Host binding**: one probe per workflow cached in gitignored `host-capabilities.json`; `autoMode` emits zero modal/markdown gates; contracts stay brand-neutral.

## Technical Architecture

- **Tools**: `doctor.js` (`resolveCitedPath`, explicit `python|node|bash` recipes, `py_compile`/Node-syntax/`bash -n`), `validate_state.cjs`, `detect_specs_dir.py` (ported to shared resolver), `benchmarks_manager.cjs --check/--list/--evolution/--update-comparison/--compare/--snapshot`, `audit_log.js` draft-suggestions.
- **Reports**: `benchmarks/results/BENCHMARK_EVOLUTION.md` + `table-<version>.md` (score/time/tokens/model/verdict), `report.schema.json` (dimensions, index, perAc, sensor, diffRange, verdict), `{us-dir}/audit-{slug}-{timestamp}.log.md`.
- **Configuration**: `defaults.enableAuditing` / `defaults.autoload` (both default false), `defaults.modelsPreset` / `modelPresets` / `stepModels`, `defaults.hostAdapter.mode`, `contextBudget`, `plan.index.json`, `run.json`.
- **Provenance**: living synthesis of specs 0003, 0012, 0014, 0019, 0020, 0026, 0030, 0036, 0039, 0041, 0056, 0059, and 0064.
