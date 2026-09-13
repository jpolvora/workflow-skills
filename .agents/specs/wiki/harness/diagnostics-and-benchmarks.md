# Diagnostics & Benchmarks (`harness`)

> Provenance: `.agents/skills/ws-doctor/SKILL.md`, `.agents/skills/ws-check-harness/SKILL.md`, `.agents/skills/ws-check-workflows/SKILL.md`, `.agents/skills/ws-benchmarks/SKILL.md`, living synthesis of specs 0003, 0012, 0014, 0019, 0020, 0026, 0030, 0036, 0039, 0041, 0056, 0059, 0064.

## Feature

Harness health is observable without running a full delivery. `ws-doctor` provides a read-only diagnostic inspector with optional `--skill` scoping and a machine-parseable `--json` stdout contract. `ws-check-harness` runs Phases 0 through 5c as an integrity auditor over routing, links, portability, digests, duplication, and topology. `ws-check-workflows` simulates FSM step continuity, state isolation, and provider dispatch. `ws-benchmarks` manages frozen-fixture evolution reports on explicit invoke only. `ws-cleanup` removes disposable workflow leftovers behind a `user-gate`. An opt-in runtime audit wrapper observes deliveries and proposes upstream issues without mutating consumer trees. Host capability binding probes the active host once per workflow and caches portable tool aliases.

## How it works

`ws-doctor` edits nothing. It runs path, script, and reference checks even when project config is missing, reporting config-unavailable status and recommending `ws-configure-project`. It does not replace `ws-check-harness` phases or `ws-show-harness` inventory. The `doctor.js --json` flag emits exactly one JSON object on stdout; warnings and usage text go to stderr. A skill-local ESM marker keeps copied installs loadable without modifying root `package.json`.

Duplicated normative blocks fail `ws-check-harness`. Path recipes resolve the consumer hub from `--repo-root` or cwd probe, never from `__file__` inside a managed copy. Token expansion keeps `{skillsRoot}` local-first and `{sharedDir}` independent. Effective `defaults.autoload` is false unless explicitly true; when true, a consumer root `AGENTS.md` must exist and delegate to `autoload.md`, otherwise the harness fails closed. The installer never creates root agent index files.

Benchmarks never auto-run. `ws-benchmarks` acts only on explicit invoke behind a six-action gate where View Evolution Report is recommended. Static benchmark runs are fully scripted with no product writes; live runs stay sandboxed with `dryRun` and no push or PR. Regressions fail comparison against frozen tables. The audit wrapper adds zero overhead when `defaults.enableAuditing` is false; end-of-run findings propose an upstream issue through `user-gate` and never auto-file or block completion alone. Host binding runs one probe per workflow, caches results in gitignored `host-capabilities.json`, and keeps contracts brand-neutral with zero modal gates in `autoMode`.

## Backend

Diagnostic tooling centers on `doctor.js` with `resolveCitedPath`, explicit `python|node|bash` recipe checks, and syntax probes via `py_compile`, Node parsing, or `bash -n`. Workflow integrity uses `validate_state.cjs`. Benchmark management runs through `benchmarks_manager.cjs` with flags such as `--check`, `--list`, `--evolution`, `--update-comparison`, `--compare`, and `--snapshot`. Audit drafts emit through `audit_log.js`.

Reports land in `benchmarks/results/BENCHMARK_EVOLUTION.md` plus versioned `table-<version>.md` files with score, time, tokens, model, and verdict columns governed by `report.schema.json` dimensions. Per-run audit logs use `{us-dir}/audit-{slug}-{timestamp}.log.md`. Configuration keys include `defaults.enableAuditing`, `defaults.autoload`, model preset bundles, `defaults.hostAdapter.mode`, context budget limits, `plan.index.json`, and `run.json`.
