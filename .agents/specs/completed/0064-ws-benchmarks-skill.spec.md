---
id: null
slug: ws-benchmarks-skill
title: "ws-benchmarks: benchmark commands and evolution report manager"
source: local
specDate: 2026-09-06
status: completed
---

# Specification — ws-benchmarks: benchmark commands and evolution report manager

## Description

Deliver the new standalone skill `ws-benchmarks` (`.agents/skills/ws-benchmarks/SKILL.md`) and companion deterministic CLI script (`.agents/skills/ws-benchmarks/scripts/benchmarks_manager.cjs`) to simplify running benchmarks, inspecting historical baseline data, and publishing version-over-version Markdown evolution reports.

The repository `workflow-skills` contains the canonical harness benchmarking engine (`scripts/harness-benchmark/cli.cjs`, `benchmarks/fixtures/`, `benchmarks/baselines/`, `benchmarks/runs/`, and `benchmarks/results/`). The external `spec-memo` repository is a memory/vault system with no internal benchmark suite. The `ws-benchmarks` skill provides:
1. An interactive structured menu (`user-gate`) with six explicit actions:
   - View Benchmark Evolution Report (Markdown rendered in conversation/artifacts).
   - Run New Benchmark (Static across fixtures or live sandbox preparation).
   - Update Comparison Markdown Results by Version (`benchmarks/results/BENCHMARK_EVOLUTION.md` and `table-<version>.md`).
   - Compare Baselines / Regressions (checks delta drops in index/verifyScore).
   - Promote / Snapshot Run to Baseline (saves runs to `benchmarks/baselines/`).
   - Export Summary to Spec-Memo Vault (optional bridge when spec-memo is configured).
2. Comprehensive multi-dimensional metrics extraction:
   - **Score**: Benchmark index value (0–100), verifyScore, and dimensions (completeness, verifyScore, judge, discrimination, efficiency, time, honesty).
   - **Time Execution**: Wall clock seconds (`wallSec`), formatted cleanly (e.g., `142s (2m 22s)`).
   - **Token Consumption**: Total tokens, prompt tokens, completion tokens (extracted from telemetry / state JSON).
   - **Model Used**: Models preset or model identifiers (e.g., `cursor`, `claude-3-7-sonnet`, `gemini-2.5-pro`).
   - **Version & Commit**: Package version (`0.3.48`, `0.3.61`, `0.3.62`, etc.) and 7-character Git commit SHA.

Per `AGENTS.md` and memory traps, `ws-benchmarks` is registered in `packages.extra.skills` (same class as `ws-run-benchmark`), is config-independent, and is invoked only on explicit user request (`/ws-benchmarks` or `ws-benchmarks`). It is never invoked automatically during pipeline deliveries (`ws-spec-to-pr`).

## Acceptance Criteria

- AC1: `.agents/skills/ws-benchmarks/SKILL.md` exists with YAML `name: ws-benchmarks`, `version:` matching `package.json`, `disable-model-invocation: true`, and `invocation_names` including `ws-benchmarks` and `benchmarks`.
- AC2: Directly under `# ws-benchmarks`, the body contains `> When this skill is loaded, output "ws-benchmarks loaded."`.
- AC3: Every numbered state machine step in `SKILL.md` has a checkable `Done when:` line.
- AC4: Deterministic helper `.agents/skills/ws-benchmarks/scripts/benchmarks_manager.cjs` exists, uses explicit Node (`node`), and supports `--check`, `--list`, `--evolution`, `--update-comparison`, `--compare`, and `--snapshot`.
- AC5: `benchmarks_manager.cjs --check` exits 0 with JSON `{ "ok": true, "repoRoot": "...", "baselineCount": N }` when run from `workflow-skills` root, and exits non-zero with descriptive stderr when run outside the package root.
- AC6: `benchmarks_manager.cjs --evolution` renders a Markdown table including columns: `version`, `sha`, `fixture`, `mode`, `score` (Index / verifyScore), `time` (wallSec formatted), `tokens` (total tokens or n/a), `model`, and `verdict`.
- AC7: `benchmarks_manager.cjs --update-comparison` creates or updates `benchmarks/results/BENCHMARK_EVOLUTION.md` containing all historical baselines and runs, plus version-specific table files if requested.
- AC8: The skill interacts with the user via `user-gate` (structured choice, recommended first), presenting: (1) View Evolution Report (Recommended), (2) Run New Benchmark, (3) Update Comparison .md by Version, (4) Compare Baselines / Regressions, (5) Promote Run to Baseline, and (6) Export to Spec-Memo Vault.
- AC9: Dismissing or cancelling the `user-gate` menu stops execution immediately without inferring confirmation or executing mutations.
- AC10: `bin/skill-dependencies.json` and `.agents/skills/ws-shared/skill-dependencies.json` both include `"ws-benchmarks"` under `packages.extra.skills`.
- AC11: `AGENTS.md`, `CATALOG.md`, and `.agents/skills/ws-shared/AGENTS.md` include `ws-benchmarks` routing entries.
- AC12: Authoring validation of this spec (`validate_spec.cjs --mode=authoring`) exits 0.
- AC13: Automated test suite `test/test-ws-benchmarks.js` passes 100% of checks verifying script CLI options, markdown rendering, table generation, and skill frontmatter.
- AC14: Integrity check (`npm run verify-integrity`) passes after regenerating integrity digests (`npm run generate-integrity`).

## Original Issue Context

User prompt (2026-09-06):
"analyze how benchmarks work in this project spec-memo and produce a skill that helps us deal with commands and viewiing reports in an easy way. I want to call this skill and be presented a menu to view benchmarks evolution results in a nice .md document format, run new benchmarks and update comparison .md results by version. score/time execution/token consumption in general, and model used to run. name the skill ws-benchmarks"

### Prior Work Sweep

- Prior skill `ws-run-benchmark` automates headless static/live benchmark runs without an interactive menu, evolution comparison summaries, or token consumption tracking.
- Prior results directory `benchmarks/results/` contained static report `table-0.3.48.md`, but no automated generator for ongoing version-over-version evolution.
- Memory traps `2026-08-31-spec-to-pr-no-harness-benchmark.md` and `2026-08-28-harness-benchmark-live-collect.md` forbid running benchmarks during pipeline deliveries (`ws-spec-to-pr`).

### Design Intent

Provide a high-ergonomics, interactive front door (`ws-benchmarks`) for developers and maintainers to inspect, run, compare, and report benchmarks without memorizing low-level CLI flags or inspecting raw JSON files. Maintain strict harness neutrality and clean separation between `workflow-skills` and external memory backends like `spec-memo`.

## Notes

- For static runs, token consumption is marked as `n/a` because static mode measures spec structure and harness bytes without invoking an LLM.
- Live runs extract token metrics (`totalTokens`, `promptTokens`, `completionTokens`) and `model` from `.state.json` / telemetry logs generated inside the sandbox.
- Vault export uses `spec-memo` MCP / CLI or local memory if configured, with a graceful fallback if `spec-memo` is not installed or enabled.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Automatic invocation during `ws-spec-to-pr` | Strictly forbidden by memory trap `2026-08-31-spec-to-pr-no-harness-benchmark.md` |
| Rewriting `scripts/harness-benchmark/cli.cjs` from scratch | Reuse existing battle-tested libraries (`paths.cjs`, `table.cjs`, `compare.cjs`, `collect-run.cjs`) |
| Creating benchmark fixtures inside `spec-memo` repository | Benchmarks belong to `workflow-skills` |
| Host-specific UI bindings | Use portable `user-gate` abstraction |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Package placement | `packages.extra.skills` | Same class as `ws-run-benchmark` (upstream maintainer tool) | y |
| Model invocation | `disable-model-invocation: true` | Invoked explicitly by humans via `/ws-benchmarks` | y |
| Spec-memo export | Optional bridge menu item | Safe fallback when spec-memo vault is absent | y |
| Authentication / Network concurrency | N/A because benchmarks and scripts execute locally on the filesystem | No external network services required | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Skill `ws-benchmarks`, script `benchmarks_manager.cjs`, docs, test | File diff check |
| Atomic criteria | AC1–AC14 pass/fail verifiable | Node test & validator scripts |
| Failure modes | Non-repo root, missing baselines, cancel gate | Negative test cases in `test/test-ws-benchmarks.js` |
| Observation telemetry | Loaded banner, CLI stdout/stderr | Script execution assertion |
| Open blockers | None | Plan approved by user |

## Validation & Observation Notes

### Negative & Failing Test Scenarios

- **Outside Package Root Failure**: Running `benchmarks_manager.cjs --check` from a non-workflow-skills directory (e.g., temporary folder) must fail with non-zero exit status and print error to stderr indicating missing benchmark CLI.
- **Cancel Gate No-Op**: Triggering cancel/dismiss in `ws-benchmarks` menu must terminate cleanly without creating baseline files, running benchmarks, or modifying comparison files.
- **Corrupt Baseline Handling**: If a baseline JSON file contains invalid JSON, `benchmarks_manager.cjs --list` must warn to stderr and continue parsing remaining valid baselines rather than crashing with unhandled exception.

### Telemetry & Observable Signals

- Skill load banner: `ws-benchmarks loaded.`
- Script `--check` output JSON: `{ "ok": true, "repoRoot": "...", "baselineCount": ... }`
- Markdown comparison report header: `# Harness Benchmark Evolution Report` with timestamp and summary stats.
