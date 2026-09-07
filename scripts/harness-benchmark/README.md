# Harness Benchmark Suite

The **Harness Benchmark Suite** is an upstream evaluation framework for measuring agent workflow quality, spec adherence, verification rigor, discrimination against sabotage, and execution efficiency across versions of `workflow-skills`.

> [!IMPORTANT]
> **Maintainer Tooling (Upstream Root Only):**  
> This suite operates exclusively in the `workflow-skills` source repository root. It is not packaged for consumer projects and must not be invoked during normal feature delivery pipelines (`ws-spec-to-pr`, `ws-spec-to-pr-lite`, `ws-testing`).

---

## 1. Architecture & Components

The benchmark engine lives in [`scripts/harness-benchmark/`](file:///l:/source/workflow-skills/scripts/harness-benchmark) with modular libraries in [`lib/`](file:///l:/source/workflow-skills/scripts/harness-benchmark/lib):

```text
scripts/harness-benchmark/
├── cli.cjs                 # Main CLI entry point
├── AGENTS.md               # Operating contract and routing for agents/automations
├── README.md               # This document (maintainer & human guide)
└── lib/
    ├── paths.cjs           # Path resolution, index weights, and oracle loaders
    ├── static-run.cjs      # Zero-cost static verification against fixtures
    ├── prepare-sandbox.cjs # Creates isolated sandboxes for live workflow runs
    ├── collect-run.cjs     # Collects state, telemetry, and artifacts from sandboxes
    ├── judge-checks.cjs    # Adversarial inspection of git diffs and anti-fraud checks
    ├── sensor.cjs          # Sabotage discrimination tests (injected defects)
    ├── report-builder.cjs  # Multi-dimensional score calculation (Index 0–100)
    ├── compare.cjs         # Baseline comparison and regression testing
    ├── snapshot.cjs        # Promotes run reports into benchmarks/baselines/
    └── table.cjs           # Formats comparative version-over-version score tables
```

---

## 2. Multi-Dimensional Quality Index (0–100)

Benchmark runs evaluate workflows across 7 weighted quality dimensions defined in [`paths.cjs`](file:///l:/source/workflow-skills/scripts/harness-benchmark/lib/paths.cjs):

| Dimension | Weight | Description |
|-----------|:------:|-------------|
| **Completeness** | **20%** | Ratio of implemented acceptance criteria verified against the specification oracle. |
| **VerifyScore** | **20%** | Step 5 verification score (0–10) derived deterministically from the AC ledger. |
| **Judge** | **15%** | Adversarial verification of diffs vs claims; detects fraud or unverified AC claims. |
| **Discrimination** | **15%** | Sensor test applying deliberate mutations/bugs to confirm verification catches defects. |
| **Efficiency** | **15%** | Token consumption, step count economy, and minimal diff footprint. |
| **Time** | **10%** | Wall-clock execution duration (`wallSec`). |
| **Honesty** | **5%** | Absence of hallucinated evidence, fraudulent skips, or ungrounded AC claims. |

---

## 3. How to Run

### Quick Start via npm Scripts

```bash
# Run static benchmark across all fixtures (zero-cost static analysis)
npm run benchmark:static

# Run arbitrary CLI command
npm run benchmark -- <command> [options]
```

### Direct CLI Commands

#### A. Static Mode (Fast, Zero-Cost)

Static runs validate specifications, measure harness footprints, and score completeness and efficiency without executing live LLM sessions:

```bash
# Run all fixtures
node scripts/harness-benchmark/cli.cjs run --mode static

# Run a single fixture
node scripts/harness-benchmark/cli.cjs run --mode static --fixture fx-config-merge
node scripts/harness-benchmark/cli.cjs run --mode static --fixture fx-node-helper
```

Run reports are written to `benchmarks/runs/static-{timestamp}/`.

#### B. Live Mode (Isolated Sandbox)

Live benchmarks execute an agent workflow inside an isolated sandbox to measure real model interaction, token usage, and sabotage discrimination:

1. **Prepare the sandbox**:
   ```bash
   node scripts/harness-benchmark/cli.cjs prepare --fixture fx-node-helper
   ```
   This creates a temporary sandbox directory containing the fixture mini-app, copies installed skills, and generates a `RUN.md` guide.

2. **Execute the workflow**:
   Open the sandbox directory and follow `RUN.md` instructions (e.g. run `/ws-spec-to-pr-lite` or `/ws-spec-to-pr`).

3. **Collect and score the run**:
   ```bash
   node scripts/harness-benchmark/cli.cjs collect --sandbox <sandbox-path> --fixture fx-node-helper
   ```
   This harvests the state, telemetry, git diff, AC ledger, runs sensor discrimination checks, and writes `report.json` + `report.md` to `benchmarks/runs/live-{timestamp}/`.

#### C. Baseline Management & Regression Checking

```bash
# Promote a run report to a named baseline
node scripts/harness-benchmark/cli.cjs snapshot --run live-20260907... --name 0.4.1-fx-node-helper-live

# Compare a run against an existing baseline (exits 1 on regression)
node scripts/harness-benchmark/cli.cjs compare --from 0.3.61-fx-node-helper-live --to benchmarks/runs/live-.../report.json

# Print comparative evolution table across baselines
node scripts/harness-benchmark/cli.cjs table
node scripts/harness-benchmark/cli.cjs table --fixture fx-config-merge --format markdown
```

### Interactive Skill Menu

Maintainers can also run benchmarks interactively from chat using the `ws-benchmarks` skill:

```text
/ws-benchmarks
```

---

## 4. Benchmark Fixtures Catalog

Fixtures are located under [`benchmarks/fixtures/`](file:///l:/source/workflow-skills/benchmarks/fixtures):

| Fixture | Pipeline | Scope & Purpose |
|---------|:--------:|-----------------|
| `fx-node-helper` | Lite | Fast Node.js helper utility. Includes sensor tests for discrimination and sabotage validation. |
| `fx-config-merge` | Standard | Mid-high complexity standard orchestrator fixture with 10 Acceptance Criteria and config parsing. |
| `fx-lite-readme` | Lite | Fast single-file documentation update fixture. Verifies minimal diff footprint. |
| `fx-standard-mock` | Standard | Standard pipeline mock verification exercising full FSM lifecycle (Steps 0–9). |
| `fx-incomplete` | Lite | Negative test case fixture ensuring incomplete implementations are capped and flagged. |

---

## 5. Latest Benchmark Results

Below are the latest benchmark results from [`benchmarks/results/BENCHMARK_EVOLUTION.md`](file:///l:/source/workflow-skills/benchmarks/results/BENCHMARK_EVOLUTION.md):

**Scope:** 13 snapshots across versions: `0.3.48`, `0.3.50`, `0.3.61`  
**Status:** 13 PASS / 0 FAIL  

### 5.1 Version-over-Version Evolution Table

| Version | Commit | Fixture | Mode | Orch | Score | Verify | Exec Time | Tokens | Model | Verdict |
|---|---|---|---|---|---:|---:|---:|---:|---|:---:|
| 0.3.48 | `0336535` | fx-config-merge | static | standard | **100** | n/a | n/a | n/a | n/a | ✅ PASS |
| 0.3.48 | `0336535` | fx-incomplete | static | lite | **71** | n/a | n/a | n/a | n/a | ✅ PASS |
| 0.3.48 | `0336535` | fx-lite-readme | static | lite | **100** | n/a | n/a | n/a | n/a | ✅ PASS |
| 0.3.48 | `0336535` | fx-node-helper | static | lite | **100** | n/a | n/a | n/a | n/a | ✅ PASS |
| 0.3.48 | `0336535` | fx-standard-mock | static | standard | **100** | n/a | n/a | n/a | n/a | ✅ PASS |
| 0.3.48 | `414b5da` | fx-standard-mock | live | standard | **100** | 10 | n/a | n/a | preset:cursor | ✅ PASS |
| 0.3.50 | `7961204` | fx-lite-readme | static | lite | **100** | n/a | n/a | n/a | n/a | ✅ PASS |
| 0.3.61 | `9e6be21` | fx-node-helper | live | lite | **78** | 10 | n/a | n/a | preset:cursor | ✅ PASS |
| 0.3.61 | `9e6be21` | fx-config-merge | static | standard | **100** | n/a | n/a | n/a | n/a | ✅ PASS |
| 0.3.61 | `9e6be21` | fx-incomplete | static | lite | **71** | n/a | n/a | n/a | n/a | ✅ PASS |
| 0.3.61 | `9e6be21` | fx-lite-readme | static | lite | **100** | n/a | n/a | n/a | n/a | ✅ PASS |
| 0.3.61 | `9e6be21` | fx-node-helper | static | lite | **100** | n/a | n/a | n/a | n/a | ✅ PASS |
| 0.3.61 | `9e6be21` | fx-standard-mock | static | standard | **100** | n/a | n/a | n/a | n/a | ✅ PASS |

### 5.2 Multi-Dimensional Quality Breakdown

| Version | Fixture | Complete | Verify | Judge | Disc | Eff | Time | Honest | Index |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.3.48 | fx-config-merge | 10 | n/a | n/a | n/a | 10 | n/a | n/a | **100** |
| 0.3.48 | fx-incomplete | 5 | n/a | n/a | n/a | 10 | n/a | n/a | **71** |
| 0.3.48 | fx-lite-readme | 10 | n/a | n/a | n/a | 10 | n/a | n/a | **100** |
| 0.3.48 | fx-node-helper | 10 | n/a | n/a | n/a | 10 | n/a | n/a | **100** |
| 0.3.48 | fx-standard-mock | 10 | n/a | n/a | n/a | 10 | n/a | n/a | **100** |
| 0.3.48 | fx-standard-mock | 10 | 10 | 10 | n/a | n/a | n/a | 10 | **100** |
| 0.3.50 | fx-lite-readme | 10 | n/a | n/a | n/a | 10 | n/a | n/a | **100** |
| 0.3.61 | fx-node-helper | 10 | 10 | 0 | 10 | n/a | n/a | 7 | **78** |
| 0.3.61 | fx-config-merge | 10 | n/a | n/a | n/a | 10 | n/a | n/a | **100** |
| 0.3.61 | fx-incomplete | 5 | n/a | n/a | n/a | 10 | n/a | n/a | **71** |
| 0.3.61 | fx-lite-readme | 10 | n/a | n/a | n/a | 10 | n/a | n/a | **100** |
| 0.3.61 | fx-node-helper | 10 | n/a | n/a | n/a | 10 | n/a | n/a | **100** |
| 0.3.61 | fx-standard-mock | 10 | n/a | n/a | n/a | 10 | n/a | n/a | **100** |

---

## 6. Key Observations

1. **Perfect Static Score (100) Across Standard & Lite**:  
   Both standard (`fx-config-merge`, `fx-standard-mock`) and lite (`fx-lite-readme`, `fx-node-helper`) achieve 100/100 on static validation, confirming that harness definitions, schemas, and specs are 100% compliant.
2. **Negative Test Capping (fx-incomplete at 71)**:  
   `fx-incomplete` is capped at 71/100, verifying that partial/incomplete runs are reliably penalized and cannot pass undetected.
3. **Sabotage & Sensor Discrimination**:  
   Live runs (e.g. `0.3.61-fx-node-helper-live`) exercise sensor tests with intentional bug injections, validating that verification routines actively detect regressions rather than blindly greenlighting diffs.
