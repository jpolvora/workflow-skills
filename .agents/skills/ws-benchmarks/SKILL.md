---
name: ws-benchmarks
description: >-
  Benchmark management suite — interactive menu to inspect version-over-version evolution results, run static/live benchmarks, and update comparison reports.
version: 0.4.18
disable-model-invocation: true
invocation_names:
  - ws-benchmarks
  - benchmarks
---

# ws-benchmarks

> When this skill is loaded, output "ws-benchmarks loaded."

Interactive suite for inspecting, executing, and reporting harness benchmarks in the `workflow-skills` source repository.

**Package root only.** Do not load this skill during pipeline deliveries (`ws-spec-to-pr`, `ws-spec-to-pr-lite`, or `ws-testing`). Trigger only on explicit `/ws-benchmarks` or `ws-benchmarks` from the workflow-skills source tree.

**Config-independent.** Operates on `benchmarks/` and `scripts/harness-benchmark/` directly.

## Invocation

```text
/ws-benchmarks
/ws-benchmarks --evolution
/ws-benchmarks --update-comparison
/ws-benchmarks --mode static
/ws-benchmarks --mode live --fixture fx-node-helper
```

## Steps

1. **Gate** — From the repository root, verify benchmark engine availability:
   ```bash
   node {skillsRoot}/ws-benchmarks/scripts/benchmarks_manager.cjs --check
   ```
   Exit 1 → STOP (this is not the workflow-skills package root).
   - Done when: stdout JSON has `ok: true`, `repoRoot`, and `baselineCount` ≥ 1.

2. **Menu** — Unless a specific flag was provided via CLI, present an interactive structured menu via `user-gate` (recommended first):
   1. **View Benchmark Evolution Report (Recommended)** — Render the full version-over-version Markdown evolution table in chat/artifacts.
   2. **Run New Benchmark** — Execute static run across all fixtures or prepare a live sandbox for an isolated fixture run.
   3. **Update Comparison .md by Version** — Refresh `benchmarks/results/BENCHMARK_EVOLUTION.md` and per-version summary tables.
   4. **Compare Baselines / Check Regressions** — Compare two baselines or evaluate an uncommitted run against a baseline.
   5. **Promote Run to Baseline (Snapshot)** — Snapshot a recent run from `benchmarks/runs/` to `benchmarks/baselines/`.
   6. **Export Summary to Spec-Memo Vault** — Log benchmark evolution summary into the external `spec-memo` memory vault (when available).

   Dismiss / Cancel → STOP immediately without executing mutations.
   - Done when: user selection is confirmed, or execution stops on cancel.

3. **Execute Action**:
   - **View Evolution**:
     ```bash
     node {skillsRoot}/ws-benchmarks/scripts/benchmarks_manager.cjs --evolution
     ```
     Render output table tracking version, commit SHA, fixture, mode, score, execution time, tokens, model, and verdict.
   - **Run Benchmark**:
     - Mode static:
       ```bash
       node scripts/harness-benchmark/cli.cjs run --mode static
       ```
     - Mode live:
       Prompt for fixture (default `fx-node-helper`), then:
       ```bash
       node scripts/harness-benchmark/cli.cjs prepare --fixture {fixtureId}
       ```
       Follow instructions in the generated sandbox `RUN.md`.
   - **Update Comparison**:
     ```bash
     node {skillsRoot}/ws-benchmarks/scripts/benchmarks_manager.cjs --update-comparison
     ```
   - **Compare Baselines**:
     ```bash
     node scripts/harness-benchmark/cli.cjs compare --from {fromBaseline} --to {toBaseline}
     ```
   - **Promote Snapshot**:
     ```bash
     node scripts/harness-benchmark/cli.cjs snapshot --run {runId} --name {packageVersion}-{fixtureId}-{mode}
     ```
   - **Export to Vault**:
     If `spec-memo` CLI `memo` or MCP tool is accessible, append the evolution report to the vault; otherwise report local fallback.
   - Done when: selected action command exits 0 and relevant output/files are generated.

4. **Report & Handoff** — Output summary of completed action, cite generated/modified markdown files under `benchmarks/results/`, and present next steps.
   - Done when: human-readable confirmation and artifact links are output.
