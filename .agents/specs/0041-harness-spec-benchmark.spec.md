---
id: null
slug: harness-spec-benchmark
title: "Harness spec-run benchmark with snapshot compare"
source: local
specDate: 2026-08-22
---

# Specification — Harness spec-run benchmark with snapshot compare

## Description

Add an **upstream-only** benchmark toolkit for `jpolvora/workflow-skills`. Maintainers dry-run a **frozen fictitious spec corpus** against the **current package version**, then store scored reports so a later big refactor can be compared to a named baseline.

The product under test is the **harness** (skills, orch, scripts, verify bar), not a random consumer app. Each fixture is a small sandbox task (readme, helper script, adversarial incomplete spec). A run measures how completely, honestly, quickly, and cheaply the current skills deliver that task.

This is not `evals/evals.json` (prompt-assertion unit evals), not [`ws-preview`](.agents/skills/ws-preview/SKILL.md) (external review dry-run), and not [`specify-closure-pack.spec.md`](specify-closure-pack.spec.md) (authoring-time spec closure). It **reads** existing mechanical gates and becomes the missing **cross-run reader** for harness quality over time.

### Why (product evolution)

After large refactors (Node-only scripts, context-budget cuts, score-bar changes) there is no repeatable way to say “lite delivery of the same fake spec is 20% faster and still 9/10.” One historical datapoint exists ([`harness-efficiency-and-verifiability.spec.md`](harness-efficiency-and-verifiability.spec.md) hermes run: 8,968 s wall, 962,298 B harness text). That audit is not a fixture, not comparable, and not re-runnable as a command.

### TLC ideas adapted (not copied)

Source: [tlc-spec-driven](https://agent-skills.techleads.club/skills/tlc-spec-driven/) (CC-BY-4.0 ideas; do not copy `.specs/features/` layout or Python validators).

| TLC practice | Mapping in this toolkit |
|--------------|-------------------------|
| Independent Verifier (author ≠ verifier, evidence-or-zero) | `collect` never trusts the agent’s Step 5 narrative. Completeness and score come from `ac-ledger.json` hashes, `git diff` file:line, and a required `ws-fable-judge` pass on the sandbox. An AC with no evidence counts as 0. |
| Discrimination sensor | Isolated scratch copy (temp worktree or file copies, never `git stash` on the SoT). Apply fixture invert patches / `run_sabotage`. Tests must fail. Restore. Porcelain of the sandbox must match the pre-sensor baseline. Survivors fail the run. |
| `validation.md` | Each run writes `report.md` + `report.json` with PASS/FAIL, per-AC evidence, sensor result, and `diffRange` (`fromSha`…`toSha`). |
| Spec-anchored outcomes | Fixture `oracle.json` asserts spec outcomes (files exist, tests named in the spec pass). It does not gold-file implementation internals. |
| Deterministic gates before humans | `static` mode is 100% scripts. `live` mode still runs those scripts after the agent. LLM memory is not a gate. |
| Completeness / closure | `validate_spec.cjs` on the fixture spec plus ledger coverage % versus oracle ACs. |
| Traceability | Require `plan.index.json` + `ac-ledger.json` on live collect (lite or standard). |
| Decision log | `meta.json`: `packageVersion`, `gitSha`, `fixtureId`, `mode`, `orch`, `models`, `dryRun`, `timestamp`. |
| Auto-size | Fixtures declare `size: small\|medium\|large` → default orch `lite` / `lite` / `standard`. |
| Lessons layer | Optional `--record-lessons` writes a MEMORY trap only when compare detects a regression against the named baseline. |
| Blast radius | Local sandbox only. No `git push`, no PR, no production credentials. |

### Architecture

```
scripts/harness-benchmark/     Node .cjs CLI (not a consumer skill; not hashed install content)
benchmarks/fixtures/<id>/      committed: spec.md, oracle.json, optional invert.patch
benchmarks/schema/             committed: report.schema.json
benchmarks/baselines/          committed named summaries (promote from a run)
benchmarks/runs/<runId>/       gitignored full reports (promote copies a slim baseline)
```

CLI (`node scripts/harness-benchmark/cli.cjs`, also `npm run benchmark`):

| Command | Role |
|---------|------|
| `run --mode static` | Fully automated. No LLM. Measures harness bytes, duplicate/check-harness criticals, fixture spec validation, oracle/spec AC alignment. |
| `prepare --fixture <id>` | Isolated sandbox (temp dir or worktree). Copies a tiny consumer app + current `{skillsRoot}` (or `file:` install of this clone). Registers the fixture spec. Writes `RUN.md` with the exact orch command (`dryRun: true`, `autoMode: true`). |
| `collect --sandbox <path>` | After the agent/human finishes the orch in that sandbox: scrape state, telemetry, ledger, tests; run judge + sensor; write `report.json`/`report.md`. |
| `run --mode live --fixture <id>` | `prepare` then print `RUN.md` and wait until `--sandbox` contains a terminal state **or** accept `--collect-only` when prepare already ran. The CLI does not spawn the session host. |
| `snapshot --run <runId> --name <label>` | Copy a schema-valid summary into `benchmarks/baselines/<label>.json`. |
| `compare --from <baseline> --to <report\|baseline>` | Emit dimension deltas and exit 1 when any oracle `failIf` threshold is breached. |

### Score vector (never a single opaque LLM integer)

`report.json` stores **dimensions** plus an optional documented **index** (0–100). Compare always prints the vector. The index is a convenience headline only.

| Dimension | Source | Scale |
|-----------|--------|-------|
| `completeness` | ACs with file:line evidence / oracle AC count; `validate_spec` exit | 0–10 |
| `verifyScore` | `ac_ledger.cjs verify` at `step5` (live) or `null` (static) | 0–10 or null |
| `judge` | fable-judge: `VERIFIED`=10, `CAVEATS`=5, `REFUTED`=0, skipped static=null | 0–10 or null |
| `discrimination` | mutants killed / mutants injected; 10 if none required and tests exist | 0–10 or null |
| `efficiency` | `measure_harness.cjs` bytes vs fixture `maxHarnessBytes`; dispatch count vs `maxDispatches` | 0–10 |
| `time` | wallSec and accounted `elapsedSec` vs `maxWallSec` (human-wait excluded when `autoMode`) | 0–10 or null |
| `honesty` | 10 minus 3 per classic fraud; floor 0 | 0–10 or null |

Index weights (fixed in schema, not configurable per run): completeness 20, verifyScore 20, judge 15, discrimination 15, efficiency 15, time 10, honesty 5. Null live-only dimensions are omitted from the denominator in `static` mode so a static index remains comparable to later static runs.

### Isolation and safety

- Sandbox cwd is never this package’s working tree for product edits. Reports may be written back to `benchmarks/runs/` in the clone.
- Live orch uses `defaults.dryRun: true` (no push, no remote PR, no MEMORY writes in the **upstream** hub). Sandbox MEMORY/changelog may mutate inside the sandbox.
- Sensor scratch is deleted after the run. Pre-sensor `git status --porcelain` in the sandbox must match post-sensor.

### Minimum fixture corpus

| Id | Size | Orch default | Purpose |
|----|------|----------------|---------|
| `fx-lite-readme` | small | lite | One markdown file; cheap completeness/time baseline |
| `fx-node-helper` | medium | lite | Add a `.cjs` helper + a test named in the spec (spec-anchored) |
| `fx-incomplete` | small | lite | Deliberately weak spec; expect low completeness (oracle `expectCompletenessMax`) |
| `fx-standard-mock` | large | standard | `enableDag: false`; exercises plan.index + ledger + more steps |

Each fixture `oracle.json` includes: `size`, `orch`, AC ids, expected output paths, expected test names, `maxHarnessBytes`, `maxWallSec`, `minVerifyScore` (live), `failIf` compare rules, optional `invert.patch`.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Packaged consumer skill `ws-harness-benchmark` | This is an upstream maintainer tool; Extra already has `ws-preview` |
| Replacing `evals/evals.json` | Prompt-level evals stay; this is full-run / static harness scoring |
| Replacing `ws-preview` | Different dry-run (external reviewer vs spec delivery) |
| Specify-time closure pack | Separate spec; benchmark consumes `validate_spec.cjs` as it exists |
| TLC `.specs/features/` tree, EARS SHALL, `AUTH-01` ids | Conflicts with `{specsDir}` + `ACn` |
| Default-CI live LLM runs | Cost and non-determinism; `static` may be wired to `npm run test` later as a follow-up AC |
| `git push` / GitHub PR from the sandbox | TLC blast radius; local only |
| Gold-filing implementation source | Oracle is spec-anchored outcomes |
| Python scripts | New helpers are Node `.cjs` (see `unique-skill-script-runtime`) |
| Rewriting `measure_harness.cjs` / `ac_ledger.cjs` / telemetry aggregate | Reuse as libraries or CLI children |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|-----------------------|----------------|-----------|------------|
| Install surface | `scripts/harness-benchmark/` + `npm run benchmark`; omit from npm `files` | Upstream clone only; `bin/` would ship to every consumer | y |
| Live runner | prepare + collect; no session-host spawn | Hosts differ; TLC also treats Execute as agent work | y |
| Sandbox | temp directory with copied mini-app + this clone’s `.agents/skills` | Repeatable; no dirty SoT | y |
| Static in default `npm run test` | no in v1 | Keep test time bounded; `npm run benchmark:static` is the command | y |
| Baseline git policy | commit `benchmarks/baselines/*.json`; gitignore `benchmarks/runs/` | Snapshots for evolution; full runs are bulky | y |
| Index weights | fixed in schema | Comparable across versions | y |
| Auth / payments / tenancy dimensions | N/A | Benchmark tool has no user accounts | y |

**Open questions:** none.

## Acceptance Criteria

- AC1: `scripts/harness-benchmark/cli.cjs` implements subcommands `run`, `prepare`, `collect`, `snapshot`, and `compare` with `--help` listing each.
- AC2: `package.json` defines `benchmark` as `node scripts/harness-benchmark/cli.cjs` and `benchmark:static` as that CLI plus `run --mode static`.
- AC3: `package.json` `files` does not include `scripts/harness-benchmark/` or `benchmarks/runs/`.
- AC4: All new benchmark helpers are Node `.cjs` with zero npm runtime dependencies.
- AC5: `benchmarks/schema/report.schema.json` requires `meta`, `dimensions`, `index`, `perAc`, `sensor`, `diffRange`, and `verdict`.
- AC6: `collect` and `run --mode static` write `report.json` that passes `validate_json_schema.cjs` against `report.schema.json`.
- AC7: `meta` records `packageVersion` from this clone’s `package.json`, `gitSha`, `fixtureId`, `mode`, `orch`, `dryRun`, and ISO `timestamp`.
- AC8: `run --mode static` exits 0 without invoking an LLM and without writing product files under `.agents/skills/`.
- AC9: `run --mode static` records `efficiency` from `measure_harness.cjs` `--scenario` matching the fixture orch class.
- AC10: `prepare --fixture <id>` creates a sandbox outside the SoT working tree and writes `RUN.md` containing `dryRun: true`.
- AC11: `prepare` copies fixture `spec.md` into the sandbox `{specsDir}` without creating `{plansDir}` artifacts in the upstream clone.
- AC12: `collect` derives `verifyScore` from `ac_ledger.cjs verify` and refuses to copy a score integer from state markdown authored by the agent.
- AC13: `collect` sets completeness for an AC to 0 when that AC lacks file:line evidence in the ledger or a cited `git diff` hunk.
- AC14: `collect` runs `ws-fable-judge` protocol checks (diff + re-run verification aliases + four frauds) and stores `judge` plus `honesty`.
- AC15: When `oracle.json` includes `invert.patch` or `sabotage: true`, `collect` injects the fault in an isolated scratch, expects the named tests to fail, restores, and fails the run if the mutant survives or sandbox porcelain drifts.
- AC16: `report.md` includes PASS/FAIL, the dimension table, per-AC evidence or EXPLICIT ZERO, sensor result, and `diffRange`.
- AC17: Four fixtures `fx-lite-readme`, `fx-node-helper`, `fx-incomplete`, and `fx-standard-mock` exist under `benchmarks/fixtures/` with `spec.md` and `oracle.json`.
- AC18: `fx-incomplete` oracle sets `expectCompletenessMax` ≤ 5 so a high completeness on that fixture fails compare.
- AC19: Fixture oracles list expected output paths and test names from the spec, not hashed implementation bodies.
- AC20: `.gitignore` ignores `benchmarks/runs/` while `benchmarks/fixtures/`, `benchmarks/schema/`, and `benchmarks/baselines/` remain trackable.
- AC21: `snapshot --name <label>` writes `benchmarks/baselines/<label>.json` containing meta, dimensions, index, and fixtureId only (no sandbox file blobs).
- AC22: `compare --from <a> --to <b>` prints a per-dimension delta table and exits 1 when any `oracle.failIf` rule on the `--to` fixture (or `--fail-if` file) matches.
- AC23: `compare` documents a regression when `index` drops by more than 5 points or `verifyScore` drops by more than 1 versus `--from` unless `--allow-regression` is set.
- AC24: Live prepare/collect never run `git push` or SCM `create-pr` (recipes and sandbox config set `dryRun: true`; tests assert the CLI contains no push spawn).
- AC25: `CATALOG.md` § Development commands documents `npm run benchmark:static` and the prepare/collect live loop as this-repo-only.
- AC26: `test/test-harness-benchmark.js` covers schema validation, static run on at least one fixture, compare exit 1 on a synthetic regression, and porcelain restoration after a sensor fixture.
- AC27: `--record-lessons` is off by default and writes a `{sharedDir}/memory/` trap only when compare reports a regression.

## Original Issue Context

Free-text (2026-08-22): create a spec for later implementation of a benchmark tool/scripts specialized for this repo for manual dry-running specs against the current version, producing a detailed report (efficiency, score, time, completeness, etc.) of a task that implements a fictitious spec. Goal: after big refactors, re-run and compare, keeping snapshots of reports and the evolution of the product. Take [tlc-spec-driven](https://agent-skills.techleads.club/skills/tlc-spec-driven/) ideas for benchmarking/scoring. Enhance the requirement.

### Prior Work Sweep

Keywords: benchmark, dry-run spec, snapshot, measure_harness, telemetry compare, discrimination sensor.

- **No open PR or issue** for a harness fixture-benchmark + snapshot compare.
- Related shipped: `measure_harness.cjs` (byte budgets), `ac_ledger.cjs` derived score, `bin/generate-telemetry-aggregate.cjs` + `workflow-skills telemetry report` (cross-run medians, **not** fixture oracles), `ws-fable-judge`, `run_sabotage.py`, skill `evals/evals.json` (schema-validated prompt evals), `ws-preview` (PR-review dry-run, PR #214).
- Related specs: `harness-efficiency-and-verifiability` (one hermes audit, “aggregate.json has no reader”), `specify-closure-pack` (Specify-time TLC, not Execute scoring), `unique-skill-script-runtime` (Node-only new scripts), `continuous-ai-verification-quality-gates` (telemetry/metrics, completed, not a fixture corpus).
- Duplicate risk: do not extend `evals.schema.json` to full-run reports; keep a separate `report.schema.json`.

### Design Intent

Greenfield toolkit. Skip `git log -L` on a missing symbol: there is no existing `harness-benchmark` CLI.

Intentional adjacent gaps this spec must **not** treat as bugs: `telemetry report` stays a plans-dir aggregator; skill evals stay prompt assertions; `ws-preview` stays external review. The freeze of Python helpers is unrelated except that **this** toolkit ships as Node `.cjs`.

## Child Tasks

### Task T1 — Schema, CLI stubs, static mode

- **Status:** pending
- **Description:** `report.schema.json`, CLI `--help`, `run --mode static` calling `measure_harness.cjs` + `validate_spec.cjs`, npm scripts, gitignore.

### Task T2 — Fixture corpus

- **Status:** pending
- **Description:** Four fixtures + oracles + one invert patch for `fx-node-helper`. Mini-app template used by prepare.

### Task T3 — prepare / collect / live loop

- **Status:** pending
- **Description:** Sandbox isolate, RUN.md, ledger-derived score, evidence-or-zero completeness, fable-judge + sensor, report.md.

### Task T4 — snapshot / compare / tests / catalog

- **Status:** pending
- **Description:** Baseline promote, compare thresholds, `test-harness-benchmark.js`, CATALOG development-command row, optional `--record-lessons`.

## Notes

- **Reuse:** spawn or `require` `measure_harness.cjs`, `ac_ledger.cjs`, `validate_spec.cjs`, `validate_json_schema.cjs`, `resolve_consumer_root.cjs`. Do not fork copies.
- **Sabotage:** until `unique-skill-script-runtime` lands, `collect` may call the existing `run_sabotage` helper with the explicit launcher currently in `tools.md`. After that spec, call the Node port only.
- **Models:** `meta.models` records `currentModel` / preset ids from sandbox `config.json` so compare can warn when the model changed (not an automatic fail).
- **First baseline:** after T3, maintainers run live once on `fx-lite-readme` + `fx-node-helper` and `snapshot --name 0.3.30-initial` (or the then-current version). That commit is the first evolution anchor.
- **Suggested later orch:** register this spec and run standard or lite; implementation is T1–T4 above.
- **Index formula:** `index = round(100 * sum(weight[d] * dimension[d] / 10) / sum(weight[d] for d where dimension[d] != null))`.
