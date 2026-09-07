# AGENTS.md — Harness Benchmark Operating Contract

**Audience: Agents (and tools that load agent instructions).**  
Humans: see [`README.md`](README.md) for overview, usage guides, and latest benchmark tables.

This document defines the **autonomous operating contract** for executing, inspecting, and managing harness benchmarks in this repository.

---

## 1. Scope & Isolation Contract (Mandatory)

| Rule | Requirement |
|------|-------------|
| **Upstream root only** | This suite runs **only** within the `workflow-skills` source package root. Never execute or invoke harness benchmarks inside downstream consumer repositories. |
| **Pipeline boundary** | Do **not** load or execute harness benchmarks during regular feature delivery workflows (`ws-spec-to-pr`, `ws-spec-to-pr-lite`, `ws-testing`, `ws-code-review`). |
| **SoT immutability** | Benchmark runs must **never** mutate `.agents/skills/ws-*` source of truth files. Static and live runs must leave the canonical skill tree untouched. |
| **Sandbox isolation** | Live benchmark runs **must** execute in an isolated sandbox created via `prepareSandbox` / `prepare`. Never run live orchestrators in the upstream repository root. |
| **Transient artifacts** | Benchmark run outputs (`benchmarks/runs/`) are git-ignored and ephemeral. Only curated snapshots in `benchmarks/baselines/` are tracked. |

---

## 2. CLI Command Specification

Entry point: `node scripts/harness-benchmark/cli.cjs <command> [options]`  
npm shortcuts: `npm run benchmark:static`, `npm run benchmark -- <command> [options]`

### Subcommands

#### `run`
Executes a benchmark run.
- `--mode <static|live>`: **(Required)** Run mode.
- `--fixture <id>`: Limit to one fixture (static) or target fixture (live).
- `--collect-only`: Live mode: skip prepare when sandbox already exists.
- `--sandbox <path>`: Sandbox path (required with `--collect-only`).
- `--install`: Use `bin/cli.js install` tarball-fidelity install instead of skills copy.

#### `prepare`
Creates an isolated sandbox for a live orchestrator run.
- `--fixture <id>`: **(Required)** Fixture identifier (e.g. `fx-node-helper`, `fx-config-merge`).
- `--sandbox-root <dir>`: Parent directory for the sandbox (defaults to OS temp directory).
- `--install`: Install via packed tarball rather than direct skill directory copy.

#### `collect`
Collects live run evidence from an executed sandbox and writes report.
- `--sandbox <path>`: **(Required)** Path to the sandbox directory.
- `--fixture <id>`: **(Required)** Target fixture identifier.

#### `snapshot`
Promotes a run report to a named baseline JSON file.
- `--run <runId>`: Run ID located under `benchmarks/runs/`.
- `--name <label>`: **(Required)** Baseline filename (saved under `benchmarks/baselines/{name}.json`).
- `--from <report.json>`: Alternative source report path.

#### `compare`
Compares two reports or baselines across all quality dimensions.
- `--from <baseline|report>`: **(Required)** Source baseline label or report JSON path.
- `--to <baseline|report>`: **(Required)** Target baseline label or report JSON path.
- `--fail-if <file.json>`: Optional extra `failIf` rules.
- `--allow-regression`: Skip index / verifyScore regression failure threshold.
- `--record-lessons`: Append regression findings to project memory.
- **Exit codes:** `0` = PASS (no regression); `1` = FAIL (regression detected or failIf rule violated).

#### `table`
Prints version-over-version score table from existing baselines.
- `--fixture <id>`: Filter by fixture ID.
- `--mode <static|live>`: Filter by mode.
- `--format <markdown|json>`: Output format (default `markdown`).

---

## 3. Autonomous Execution Flows

### Flow A: Static Verification (Zero-Token, Zero-Risk)

Agents running static verification to validate harness health:

```bash
# 1. Run static suite across all fixtures
node scripts/harness-benchmark/cli.cjs run --mode static

# 2. Verify exit code 0
# 3. Output reports are in benchmarks/runs/static-{timestamp}/report.json
```

**Guarantees:**
- No network requests or LLM API calls.
- Validates specification schema (`validate_spec.cjs`).
- Checks AC ledger integrity (`ac_ledger.cjs`).
- Computes efficiency dimension against fixture budgets.

### Flow B: Live Benchmark Execution

Agents orchestrating a live benchmark evaluation:

```bash
# Step 1: Create sandbox
node scripts/harness-benchmark/cli.cjs prepare --fixture fx-node-helper

# Step 2: Read sandbox instructions
# Inspect <sandboxPath>/RUN.md for the required workflow command.

# Step 3: Run target workflow inside <sandboxPath>
# Execute the pipeline (e.g. ws-spec-to-pr-lite) strictly within <sandboxPath>.

# Step 4: Collect evidence from sandbox
node scripts/harness-benchmark/cli.cjs collect --sandbox <sandboxPath> --fixture fx-node-helper

# Step 5: Check output report
# Report is written to benchmarks/runs/live-{timestamp}/report.json
```

### Flow C: Regression Guard in CI / Maintainer Gate

Agents validating changes against established baselines:

```bash
node scripts/harness-benchmark/cli.cjs compare \
  --from 0.3.61-fx-node-helper-live \
  --to benchmarks/runs/live-latest/report.json
```

If the command exits with code `1`, halt and inspect the regression report. Do not promote regressions to tracked baselines without explicit user instruction.

---

## 4. Quality Scoring Dimensions & Weights

Multi-dimensional Index (0–100) calculated by `report-builder.cjs`:

```text
Index = (Completeness * 20) + (VerifyScore * 20) + (Judge * 15) 
      + (Discrimination * 15) + (Efficiency * 15) + (Time * 10) + (Honesty * 5)
```

- **Completeness (20):** ACs implemented / total ACs.
- **VerifyScore (20):** Step 5 score normalized to 0–10.
- **Judge (15):** Fable-judge adversarial score (checks for fake tests, fraud, empty commits).
- **Discrimination (15):** Sensor test (evaluates if injected bugs are caught by verification).
- **Efficiency (15):** Token budget ratio and minimal diff footprint.
- **Time (10):** Wall-clock duration within expected range.
- **Honesty (5):** Strict adherence to evidence standards without hallucinated citations.

---

## 5. Agent Safety Invariants

1. **Never edit `benchmarks/baselines/*.json` manually** — use `cli.cjs snapshot` to generate schema-compliant baseline files.
2. **Never commit `benchmarks/runs/`** — these contain sandbox logs and ephemeral run data.
3. **Anonymization rule** — Benchmark fixtures, oracles, and generated reports must remain generic; never inject private consumer project names, paths, or credentials into benchmark fixtures.
